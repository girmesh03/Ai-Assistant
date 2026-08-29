import { useCallback } from 'react';
import { useChatStore } from '@mui/x-chat/headless';
import { chatAdapter } from '../adapters/chatAdapter.js';

/**
 * Real conversation/message reload helpers backed by the chat store.
 *
 * The `useChat()` API in MUI X Chat's headless runtime currently ships
 * `reloadConversations`/`reloadMessages` as throwing stubs, so this hook
 * drives the store directly through the adapter instead: re-list from the
 * backend and push the fresh page into the store (`setConversations` /
 * `setMessages` + `setHistoryState`), keeping the runtime the single source
 * of truth.
 *
 * MUST be used inside a `ChatProvider`.
 *
 * @module hooks/useChatReload
 */

/**
 * @returns {{ reloadConversations: () => Promise<void>, reloadMessages: (conversationId: string) => Promise<void> }} Reload helpers.
 */
export const useChatReload = () => {
  const store = useChatStore();

  /**
   * Re-fetches the first page of conversations (newest first) into the store.
   *
   * @returns {Promise<void>}
   */
  const reloadConversations = useCallback(async () => {
    const { conversations } = await chatAdapter.listConversations();
    store.setConversations(conversations);
  }, [store]);

  /**
   * Re-fetches the first page of messages for a conversation into the store.
   *
   * @param {string} conversationId - Conversation id.
   * @returns {Promise<void>}
   */
  const reloadMessages = useCallback(
    async (conversationId) => {
      if (!conversationId) return;
      const { messages, cursor, hasMore } = await chatAdapter.listMessages({ conversationId });
      store.setMessages(messages);
      store.setHistoryState({ cursor, hasMore });
    },
    [store],
  );

  return { reloadConversations, reloadMessages };
};