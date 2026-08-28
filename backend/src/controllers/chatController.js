import expressAsyncHandler from 'express-async-handler';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { AppError } from '../utils/AppError.js';
import { httpStatus } from '../utils/httpStatus.js';
import { providerCatalog } from '../services/providerCatalog.js';
import { loadHistoryMessages } from '../services/messageContextService.js';

/**
 * Sends one user turn through the conversation's configured provider and
 * persists both the user message and the assistant reply. The effective
 * reasoning level is the request's override, else the conversation default.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {Promise<void>}
 */
export const sendChat = expressAsyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.body.conversationId);

  if (!conversation) {
    throw new AppError('Conversation not found', httpStatus.NOT_FOUND);
  }

  if (!providerCatalog.getModelInfo(conversation.modelProviderId, conversation.modelId)) {
    throw new AppError('Unknown model for the selected provider', httpStatus.BAD_REQUEST);
  }

  const adapter = providerCatalog.getAdapter(conversation.modelProviderId);
  if (!adapter) {
    throw new AppError(
      `No API key configured for ${providerCatalog.getProviderName(conversation.modelProviderId)}`,
      httpStatus.SERVICE_UNAVAILABLE
    );
  }

  const reasoningLevel = req.body.reasoningEffort ?? conversation.reasoningEffort;
  const history = await loadHistoryMessages(conversation._id);
  const messages = [...history, { role: 'user', content: req.body.content }];

  const result = await adapter.generate({
    messages,
    model: conversation.modelId,
    reasoningLevel,
    language: conversation.language,
    system: conversation.systemPrompt ?? undefined,
    persona: conversation.persona ?? undefined,
  });

  const [userMessage, assistantMessage] = await Message.insertMany([
    { conversationId: conversation._id, role: 'user', content: req.body.content },
    {
      conversationId: conversation._id,
      role: 'assistant',
      provider: conversation.modelProviderId,
      model: result.model ?? conversation.modelId,
      content: result.content,
      reasoning: result.reasoning ?? null,
      reasoningEffort: reasoningLevel,
    },
  ]);

  res.json({
    success: true,
    message: 'Message sent',
    data: { conversationId: conversation._id, userMessage, assistantMessage },
  });
});