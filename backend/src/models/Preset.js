import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { constants } from '../utils/constants.js';

/**
 * Mongoose model for reusable prompt presets. A preset can optionally pin
 * a provider/model/reasoning level for one-keystroke conversation setup.
 *
 * @module models/Preset
 */
const presetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    prompt: { type: String, required: true, trim: true },
    persona: { type: String, trim: true, maxlength: constants.CHAT.PERSONA_MAX_LENGTH, default: null },
    modelProviderId: { type: String, default: null, maxlength: 100 },
    modelId: { type: String, default: null, maxlength: 200 },
    reasoningEffort: { type: String, enum: constants.REASONING_LEVELS, default: null },
  },
  { collection: 'assistantPresets', timestamps: true }
);

presetSchema.plugin(mongoosePaginate);

/**
 * The Preset model.
 *
 * @type {import('mongoose').Model}
 */
export const Preset = mongoose.model('Preset', presetSchema);