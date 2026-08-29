import { API_BASE_URL, DEFAULT_CONVERSATION_TITLE, MESSAGES_PAGE_LIMIT, TITLE_FROM_MESSAGE_MAX_LENGTH } from '../utils/constants.js';
import { toId, truncate } from '../utils/format.js';

/**
 * The ሰላም REST → MUI X Chat adapter.
 *
 * Bridges the backend's non-streaming `/api/chat/send` and
 * `/api/chat/regenerate` endpoints into the `ChatMessageChunk` streams the
 * headless runtime consumes, and maps Mongo documents into the
 * `ChatConversation`/`ChatMessage` shapes the store expects. It also exposes
 * app-level conversation helpers (`create/update/delete`) used by the page
 * orchestration code — these are plain additions on the adapter object, not
 * part of the `ChatAdapter` interface.
 *
 * @module adapters/chatAdapter
 */

/**
 * Local user message id → backend `_id` map, so a just-sent (client-minted)
 * user message can still anchor a later regenerate call against the backend,
 * which only knows the persisted id.
 *
 * @type {Map<string, string>}
 */
const backendIdByLocalId = new Map();

/**
 * User message id → staged edited content. Set by the edit flow right before
 * calling the runtime `regenerate`, read (and cleared) inside `regenerate`.
 *
 * @type {Map<string, string>}
 */
const stagedEditedTextById = new Map();

/**
 * Posts JSON to the backend and unwraps the `{ success, message, data }` envelope.
 *
 * @param {string} path - API path (mounted under `/api`).
 * @param {{ method?: string, body?: object, params?: Record<string, string>, signal?: AbortSignal }} [options] - Fetch options.
 * @returns {Promise<object>} The envelope `data` payload.
 */
const requestJson = async (path, { method = 'GET', body, params, signal } = {}) => {
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  const response = await fetch(`${API_BASE_URL}${path}${query}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    const message = typeof payload?.message === 'string' ? payload.message : `Backend error ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return payload.data;
};

/**
 * Maps a conversation document into the store's `ChatConversation` shape.
 *
 * @param {object} doc - Backend conversation document.
 * @returns {object} A `ChatConversation`.
 */
const mapConversation = (doc) => ({
  id: toId(doc._id),
  title: doc.title,
  subtitle: doc.persona ? `Persona: ${doc.persona}` : undefined,
  lastMessageAt: doc.updatedAt ?? undefined,
  metadata: {
    systemPrompt: doc.systemPrompt ?? '',
    persona: doc.persona ?? '',
    presetId: doc.presetId ? toId(doc.presetId) : null,
    modelProviderId: doc.modelProviderId,
    modelId: doc.modelId,
    reasoningEffort: doc.reasoningEffort,
    language: doc.language,
  },
});

/**
 * Maps a message document into the store's `ChatMessage` shape. Assistant
 * messages that carry a reasoning trace get a synthetic `reasoning` part
 * ahead of the `text` part so the default part renderer can show it.
 *
 * @param {object} doc - Backend message document.
 * @returns {object} A `ChatMessage`.
 */
const mapMessage = (doc) => {
  const isAssistant = doc.role === 'assistant';
  const parts = [];
  if (isAssistant && doc.reasoning) {
    parts.push({ type: 'reasoning', text: doc.reasoning, state: 'done' });
  }
  if (isAssistant) {
    parts.push({ type: 'text', text: doc.content, state: 'done' });
  } else {
    parts.push({ type: 'text', text: doc.content });
  }

  return {
    id: toId(doc._id),
    conversationId: toId(doc.conversationId),
    role: doc.role,
    parts,
    createdAt: doc.createdAt,
    status: 'sent',
    metadata: isAssistant ? { provider: doc.provider ?? '', model: doc.model ?? '' } : undefined,
  };
};

/**
 * Emits a complete assistant reply as the canonical chunk stream `processStream`
 * consumes (start → [reasoning] → text → finish), as single whole deltas.
 *
 * @param {string} replyId - The assistant message id (backend `_id`).
 * @param {string} content - The final reply text.
 * @param {string|null} reasoning - Optional reasoning trace.
 * @param {AbortSignal} signal - Abort signal honored before emitting.
 * @returns {ReadableStream<object>} The chunk stream.
 */
const emitWholeReplyStream = (replyId, content, reasoning, signal) => {
  const textPartId = `${replyId}-text`;
  const reasoningPartId = `${replyId}-reasoning`;
  return new ReadableStream({
    start(controller) {
      if (signal?.aborted) {
        controller.error(new DOMException('Aborted', 'AbortError'));
        return;
      }
      controller.enqueue({
        type: 'start',
        messageId: replyId,
        author: { id: 'assistant', displayName: 'ሰላም', role: 'assistant' },
      });
      if (reasoning) {
        controller.enqueue({ type: 'reasoning-start', id: reasoningPartId });
        controller.enqueue({ type: 'reasoning-delta', id: reasoningPartId, delta: reasoning });
        controller.enqueue({ type: 'reasoning-end', id: reasoningPartId });
      }
      controller.enqueue({ type: 'text-start', id: textPartId });
      controller.enqueue({ type: 'text-delta', id: textPartId, delta: content });
      controller.enqueue({ type: 'text-end', id: textPartId });
      controller.enqueue({ type: 'finish', messageId: replyId, finishReason: 'stop' });
      controller.close();
    },
  });
};

/**
 * Computes the user-message text from a store `ChatMessage`.
 *
 * @param {import('@mui/x-chat-headless').ChatMessage} message - The user message.
 * @returns {string} Trimmed text content.
 */
const getMessageText = (message) => message.parts.map((part) => (part.type === 'text' ? part.text ?? '' : '')).join('').trim();

/**
 * The chat adapter instance consumed by `ChatProvider` and the page helpers.
 */
export const chatAdapter = {
  /**
   * Loads the first page of conversations (newest first) as `ChatConversation`s.
   *
   * @param {{ cursor?: string, query?: string }} [input] - Adapter input (query ignored).
   * @returns {Promise<{ conversations: object[], cursor?: string, hasMore?: boolean }>} Loaded page.
   */
  async listConversations(input = {}) {
    const page = Number(input.cursor ?? 1);
    const data = await requestJson('/conversations', { params: { page: String(page), limit: '100' } });
    return {
      conversations: data.docs.map(mapConversation),
      cursor: String(data.page),
      hasMore: data.page < data.totalPages,
    };
  },

  /**
   * Loads one page of messages for a conversation. Newest page first when no
   * cursor is given; older pages as `cursor` advances. Results are returned in
   * ascending order (oldest → newest) and reversed from the backend's `desc`
   * ordering, matching the store's message-ids array.
   *
   * @param {import('@mui/x-chat-headless').ChatListMessagesInput} input - Adapter input.
   * @returns {Promise<{ messages: object[], cursor?: string, hasMore?: boolean }>} Loaded page.
   */
  async listMessages({ conversationId, cursor } = {}) {
    const page = Math.max(1, Number(cursor ?? '1'));
    const data = await requestJson(`/conversations/${conversationId}/messages`, {
      params: {
        page: String(page),
        limit: String(MESSAGES_PAGE_LIMIT),
        sort: 'desc',
      },
    });

    const docs = [...data.docs].reverse();
    return {
      messages: docs.map(mapMessage),
      cursor: String(data.page),
      hasMore: data.page < data.totalPages,
    };
  },

  /**
   * Sends one user turn. When the conversation is brand new (just created,
   * titled "New chat") and this is the very first user message, the title is
   * derived from the message text after the backend persists the turn.
   *
   * @param {import('@mui/x-chat-headless').ChatSendMessageInput} input - Adapter input.
   * @returns {Promise<ReadableStream<object>>} The reply chunk stream.
   */
  async sendMessage({ conversationId, message, messages, signal }) {
    const text = getMessageText(message);
    const isFirstMessage = messages.length === 1;

    const data = await requestJson('/chat', {
      method: 'POST',
      body: { conversationId, content: text },
      signal,
    });

    backendIdByLocalId.set(toId(message.id), toId(data.userMessage._id));

    if (isFirstMessage && conversationId) {
      const title = truncate(text, TITLE_FROM_MESSAGE_MAX_LENGTH) || DEFAULT_CONVERSATION_TITLE;
      void requestJson(`/conversations/${conversationId}`, {
        method: 'PATCH',
        body: { title },
      }).catch(() => {});
    }

    return emitWholeReplyStream(toId(data.assistantMessage._id), data.assistantMessage.content ?? '', data.assistantMessage.reasoning ?? null, signal);
  },

  /**
   * Regenerates the assistant reply for a user turn, replacing it in place on
   * the backend (truncating anything below). When a staged edit is present for
   * the anchoring user message, its new content is sent along so the backend
   * rewrites that turn first.
   *
   * @param {import('@mui/x-chat-headless').ChatRegenerateInput} input - Adapter input.
   * @returns {Promise<ReadableStream<object>>} The regenerated reply chunk stream.
   */
  async regenerate({ conversationId, message, signal }) {
    const backendId = backendIdByLocalId.get(toId(message.id)) ?? toId(message.id);
    const editedContent = stagedEditedTextById.get(toId(message.id));
    stagedEditedTextById.delete(toId(message.id));

    const data = await requestJson('/chat/regenerate', {
      method: 'POST',
      body: {
        conversationId,
        userMessageId: backendId,
        ...(editedContent ? { content: editedContent } : {}),
      },
      signal,
    });

    return emitWholeReplyStream(toId(data.assistantMessage._id), data.assistantMessage.content ?? '', data.assistantMessage.reasoning ?? null, signal);
  },

  /**
   * Creates a conversation on the backend and returns its mapped store shape.
   *
   * @param {{ title?: string, modelProviderId: string, modelId: string, reasoningEffort?: string, language?: string, systemPrompt?: string|null, persona?: string|null, presetId?: string|null }} fields - Creation fields.
   * @returns {Promise<object>} The created `ChatConversation`.
   */
  async createConversation(fields) {
    const data = await requestJson('/conversations', {
      method: 'POST',
      body: {
        title: DEFAULT_CONVERSATION_TITLE,
        reasoningEffort: 'off',
        language: 'en',
        systemPrompt: null,
        persona: null,
        presetId: null,
        ...fields,
      },
    });
    return mapConversation(data);
  },

  /**
   * Updates a subset of conversation fields (title, model, reasoning, preset…).
   *
   * @param {string} id - Conversation id.
   * @param {object} patch - Partial field set.
   * @returns {Promise<object>} The updated conversation document data.
   */
  async updateConversation(id, patch) {
    return requestJson(`/conversations/${id}`, { method: 'PATCH', body: patch });
  },

  /**
   * Deletes a conversation (cascading its messages on the backend).
   *
   * @param {string} id - Conversation id.
   * @returns {Promise<object>} The deletion result (`data` is null).
   */
  async deleteConversation(id) {
    return requestJson(`/conversations/${id}`, { method: 'DELETE' });
  },

  /**
   * Stages edited text for a user message before a runtime `regenerate` call.
   * The adapter reads (and clears) it inside `regenerate`.
   *
   * @param {string} localMessageId - The store (client) user message id.
   * @param {string} text - The new message content.
   * @returns {void}
   */
  stageEditedText(localMessageId, text) {
    stagedEditedTextById.set(toId(localMessageId), text);
  },
};