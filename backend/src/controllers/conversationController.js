import expressAsyncHandler from 'express-async-handler';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { AppError } from '../utils/AppError.js';
import { httpStatus } from '../utils/httpStatus.js';
import { buildPaginationPayload, resolveLimit, resolvePage } from '../utils/pagination.js';
import { pickFields } from '../utils/pickFields.js';
import { providerCatalog } from '../services/providerCatalog.js';

/**
 * Fields a conversation request may carry. Shared by create and update.
 *
 * @type {ReadonlyArray<string>}
 */
const CONVERSATION_FIELDS = Object.freeze([
  'title',
  'modelProviderId',
  'modelId',
  'reasoningEffort',
  'language',
  'systemPrompt',
  'persona',
  'presetId',
]);

/**
 * Rejects conversations that reference a provider/model pair that is not in
 * the catalog (typo-proofing; key presence is deliberately not required here,
 * the models just have to exist).
 *
 * @param {string} providerId - Catalog provider id.
 * @param {string} modelId - Catalog model id.
 * @returns {void}
 */
const assertValidModel = (providerId, modelId) => {
  if (!providerCatalog.getModelInfo(providerId, modelId)) {
    throw new AppError('Unknown model for the selected provider', httpStatus.BAD_REQUEST);
  }
};

/**
 * Lists conversations, newest first, paginated.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {Promise<void>}
 */
export const listConversations = expressAsyncHandler(async (req, res) => {
  const page = resolvePage(req.query.page);
  const limit = resolveLimit(req.query.limit);

  const result = await Conversation.paginate({}, { page, limit, sort: { updatedAt: -1 } });

  res.json({
    success: true,
    message: 'Conversations fetched',
    data: buildPaginationPayload(result),
  });
});

/**
 * Creates a conversation from the validated request body.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {Promise<void>}
 */
export const createConversation = expressAsyncHandler(async (req, res) => {
  assertValidModel(req.body.modelProviderId, req.body.modelId);

  const fields = pickFields(req.body, CONVERSATION_FIELDS);
  if (fields.systemPrompt === '') fields.systemPrompt = null;
  if (fields.persona === '') fields.persona = null;

  const conversation = await Conversation.create(fields);

  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Conversation created',
    data: conversation,
  });
});

/**
 * Updates a conversation with the provided subset of allowed fields.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {Promise<void>}
 */
export const updateConversation = expressAsyncHandler(async (req, res) => {
  const updates = pickFields(req.body, CONVERSATION_FIELDS);

  if (updates.systemPrompt === '') updates.systemPrompt = null;
  if (updates.persona === '') updates.persona = null;

  if (Object.keys(updates).length === 0) {
    throw new AppError('No valid fields provided', httpStatus.BAD_REQUEST);
  }

  if (updates.modelProviderId || updates.modelId) {
    assertValidModel(updates.modelProviderId ?? req.body.modelProviderId, updates.modelId ?? req.body.modelId);
  }

  const conversation = await Conversation.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!conversation) {
    throw new AppError('Conversation not found', httpStatus.NOT_FOUND);
  }

  res.json({ success: true, message: 'Conversation updated', data: conversation });
});

/**
 * Deletes a conversation and cascades to all of its messages.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {Promise<void>}
 */
export const deleteConversation = expressAsyncHandler(async (req, res) => {
  const conversation = await Conversation.findByIdAndDelete(req.params.id);

  if (!conversation) {
    throw new AppError('Conversation not found', httpStatus.NOT_FOUND);
  }

  await Message.deleteMany({ conversationId: conversation._id });

  res.json({ success: true, message: 'Conversation deleted', data: null });
});