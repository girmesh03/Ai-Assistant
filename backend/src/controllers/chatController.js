import expressAsyncHandler from 'express-async-handler';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { AppError } from '../utils/AppError.js';
import { httpStatus } from '../utils/httpStatus.js';
import { providerCatalog } from '../services/providerCatalog.js';
import { loadHistoryMessages, loadHistoryMessagesUpTo } from '../services/messageContextService.js';

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

/**
 * Regenerates the assistant reply for a given user turn, replacing it in
 * place. This backs both the "Retry" action (no `content`) and the "Edit"
 * action (`content` provided, which first rewrites that user message). Either
 * way the turn's old reply and everything after it is truncated, then a fresh
 * reply is generated from history up to (excluding) the user message.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {Promise<void>}
 */
export const regenerateChat = expressAsyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.body.conversationId);

  if (!conversation) {
    throw new AppError('Conversation not found', httpStatus.NOT_FOUND);
  }

  const userMessage = await Message.findOne({
    _id: req.body.userMessageId,
    conversationId: conversation._id,
    role: 'user',
  });

  if (!userMessage) {
    throw new AppError('User message not found in this conversation', httpStatus.NOT_FOUND);
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

  if (req.body.content) {
    userMessage.content = req.body.content;
    await userMessage.save();
  }

  await Message.deleteMany({ conversationId: conversation._id, _id: { $gt: userMessage._id } });

  const history = await loadHistoryMessagesUpTo(conversation._id, userMessage._id);
  const messages = [...history, { role: 'user', content: userMessage.content }];

  const result = await adapter.generate({
    messages,
    model: conversation.modelId,
    reasoningLevel,
    language: conversation.language,
    system: conversation.systemPrompt ?? undefined,
    persona: conversation.persona ?? undefined,
  });

  const assistantMessage = await Message.create({
    conversationId: conversation._id,
    role: 'assistant',
    provider: conversation.modelProviderId,
    model: result.model ?? conversation.modelId,
    content: result.content,
    reasoning: result.reasoning ?? null,
    reasoningEffort: reasoningLevel,
  });

  await Conversation.findByIdAndUpdate(conversation._id, { updatedAt: new Date() });

  res.json({
    success: true,
    message: 'Message regenerated',
    data: { conversationId: conversation._id, userMessage, assistantMessage },
  });
});