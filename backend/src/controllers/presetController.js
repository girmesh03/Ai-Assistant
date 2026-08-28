import expressAsyncHandler from 'express-async-handler';
import { Conversation } from '../models/Conversation.js';
import { Preset } from '../models/Preset.js';
import { AppError } from '../utils/AppError.js';
import { httpStatus } from '../utils/httpStatus.js';
import { buildPaginationPayload, resolveLimit, resolvePage } from '../utils/pagination.js';
import { pickFields } from '../utils/pickFields.js';

/**
 * Fields a preset request may carry. Shared by create and update.
 *
 * @type {ReadonlyArray<string>}
 */
const PRESET_FIELDS = Object.freeze(['name', 'prompt', 'modelProviderId', 'modelId', 'reasoningEffort']);

/**
 * Lists presets, newest first, paginated.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {Promise<void>}
 */
export const listPresets = expressAsyncHandler(async (req, res) => {
  const page = resolvePage(req.query.page);
  const limit = resolveLimit(req.query.limit);

  const result = await Preset.paginate({}, { page, limit, sort: { updatedAt: -1 } });

  res.json({ success: true, message: 'Presets fetched', data: buildPaginationPayload(result) });
});

/**
 * Creates a preset from the validated request body.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {Promise<void>}
 */
export const createPreset = expressAsyncHandler(async (req, res) => {
  const preset = await Preset.create(pickFields(req.body, PRESET_FIELDS));

  res.status(httpStatus.CREATED).json({ success: true, message: 'Preset created', data: preset });
});

/**
 * Updates a preset with the provided subset of allowed fields.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {Promise<void>}
 */
export const updatePreset = expressAsyncHandler(async (req, res) => {
  const updates = pickFields(req.body, PRESET_FIELDS);

  if (Object.keys(updates).length === 0) {
    throw new AppError('No valid fields provided', httpStatus.BAD_REQUEST);
  }

  const preset = await Preset.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!preset) {
    throw new AppError('Preset not found', httpStatus.NOT_FOUND);
  }

  res.json({ success: true, message: 'Preset updated', data: preset });
});

/**
 * Deletes a preset and detaches it from any conversations that referenced it.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {Promise<void>}
 */
export const deletePreset = expressAsyncHandler(async (req, res) => {
  const preset = await Preset.findByIdAndDelete(req.params.id);

  if (!preset) {
    throw new AppError('Preset not found', httpStatus.NOT_FOUND);
  }

  await Conversation.updateMany({ presetId: preset._id }, { $unset: { presetId: '' } });

  res.json({ success: true, message: 'Preset deleted', data: null });
});