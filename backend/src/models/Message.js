import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { constants } from '../utils/constants.js';

/**
 * Mongoose model for chat messages. Stores both user and assistant turns;
 * assistant turns carry the provider/model used and the optional reasoning
 * trace emitted by reasoning-capable models.
 *
 * @module models/Message
 */
const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    provider: { type: String, default: null, maxlength: 100 },
    model: { type: String, default: null, maxlength: 200 },
    content: { type: String, required: true, trim: true },
    reasoning: { type: String, default: null },
    reasoningEffort: { type: String, enum: constants.REASONING_LEVELS, default: null },
  },
  { collection: 'assistantMessages', timestamps: true }
);

messageSchema.plugin(mongoosePaginate);

/**
 * The Message model.
 *
 * @type {import('mongoose').Model}
 */
export const Message = mongoose.model('Message', messageSchema);