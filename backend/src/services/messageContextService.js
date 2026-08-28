import { Message } from '../models/Message.js';
import { constants } from '../utils/constants.js';

/**
 * Loads the last {@link constants.CHAT.MAX_CONTEXT_MESSAGES} messages of a
 * conversation in chronological order, narrowed to the role/content fields
 * the providers consume. Reasoning traces are intentionally excluded —
 * reasoning-capable providers (e.g. Groq) only expect the final output.
 *
 * @param {string} conversationId - Conversation id.
 * @returns {Promise<Array<{role: string, content: string}>>} Chronological turns.
 */
export const loadHistoryMessages = async (conversationId) => {
  const docs = await Message.find({ conversationId })
    .sort({ createdAt: -1 })
    .select({ _id: 0, role: 1, content: 1 })
    .limit(constants.CHAT.MAX_CONTEXT_MESSAGES)
    .lean();

  return docs.reverse();
};