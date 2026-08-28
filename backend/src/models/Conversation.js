import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { constants } from '../utils/constants.js';

/**
 * Mongoose model for chat conversations. Backed by the explicit collection
 * `assistantConversations` (the shared database hosts other apps, so no
 * implicit naming is used).
 *
 * @module models/Conversation
 */
const conversationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    modelProviderId: { type: String, required: true },
    modelId: { type: String, required: true },
    reasoningEffort: { type: String, enum: constants.REASONING_LEVELS, default: constants.DEFAULT_REASONING_LEVEL },
    language: { type: String, enum: constants.LANGUAGES, default: constants.DEFAULT_LANGUAGE },
    systemPrompt: { type: String, trim: true, maxlength: constants.CHAT.SYSTEM_PROMPT_MAX_LENGTH, default: null },
    persona: { type: String, trim: true, maxlength: constants.CHAT.PERSONA_MAX_LENGTH, default: null },
    presetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Preset', default: null },
  },
  { collection: 'assistantConversations', timestamps: true }
);

conversationSchema.plugin(mongoosePaginate);

/**
 * The Conversation model.
 *
 * @type {import('mongoose').Model}
 */
export const Conversation = mongoose.model('Conversation', conversationSchema);