import { AddisAI, AuthenticationError, BadRequestError, InsufficientCreditsError, RateLimitError, APIError } from 'addisai';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../config/logger.js';
import { httpStatus } from '../../utils/httpStatus.js';
import { constants } from '../../utils/constants.js';
import { mapProviderError } from './providerErrors.js';

/**
 * Maps an Addis AI API error to a safe {@link AppError}. Rate limits and
 * credit balances are actionable by the end user and keep their status;
 * every other failure degrades to a generic 502.
 *
 * @param {unknown} err - The thrown Addis AI error.
 * @returns {AppError} A mapped error.
 */
const mapAddisError = (err) => {
  if (err instanceof AppError) {
    return err;
  }

  if (err instanceof RateLimitError) {
    return new AppError('The AI service is busy. Please try again shortly.', httpStatus.TOO_MANY_REQUESTS);
  }

  if (err instanceof InsufficientCreditsError) {
    return new AppError('Insufficient Addis AI credits. Please top up your account.', httpStatus.PAYMENT_REQUIRED);
  }

  if (err instanceof AuthenticationError) {
    logger.error(`[provider:addis] authentication failed: ${err.message}`);
    return new AppError('The AI provider could not be reached. Please try again.', httpStatus.BAD_GATEWAY);
  }

  if (err instanceof BadRequestError) {
    logger.error(`[provider:addis] bad request: ${err.message}`);
    return new AppError('The AI provider could not be reached. Please try again.', httpStatus.BAD_GATEWAY);
  }

  if (err instanceof APIError) {
    logger.error(`[provider:addis] API error: ${err.message}`);
    return new AppError('The AI provider could not be reached. Please try again.', httpStatus.BAD_GATEWAY);
  }

  return mapProviderError(err, 'addis');
};

/**
 * Creates the Addis AI provider adapter. Addis selects the model server-side
 * and exposes no reasoning content; chat language is only passed for the
 * Amharic (`am`) and Afan Oromo (`om`) locales the backend supports.
 *
 * @param {object} options - Adapter configuration.
 * @param {string} options.apiKey - Addis AI API key.
 * @param {string} options.baseURL - Addis AI API base URL.
 * @returns {Readonly<{providerId: string, generate: Function}>} The adapter.
 */
export const createAddisAdapter = ({ apiKey, baseURL }) => {
  const client = new AddisAI({ apiKey, baseURL, timeout: 60000, maxRetries: 2 });

  return Object.freeze({
    providerId: 'addis',

    /**
     * Sends the chat messages to Addis AI and returns the finalized reply.
     *
     * @param {object} call - Generated-turn inputs.
     * @param {Array<{role: string, content: string}>} call.messages - Prior turns plus the new user turn.
     * @param {string} call.model - Catalog model id passed through for compatibility.
     * @param {string} call.language - Conversation language (`en`|`am`|`om`).
     * @param {string} [call.system] - Per-conversation system prompt (Addis-native).
     * @param {string} [call.persona] - Per-conversation identity persona (Addis-native).
     * @returns {Promise<{content: string, reasoning: string|null, model: string}>} The reply.
     */
    generate: async ({ messages, model, language, system, persona }) => {
      try {
        const response = await client.chat.completions.create({
          messages,
          model,
          ...(system ? { system } : {}),
          ...(persona ? { persona } : {}),
          ...(language === 'am' || language === 'om' ? { language } : {}),
          temperature: constants.GENERATION.DEFAULT_TEMPERATURE,
          max_tokens: constants.GENERATION.ADDIS_MAX_TOKENS,
        });

        const content = response?.choices?.[0]?.message?.content ?? '';
        return { content, reasoning: null, model: response?.model ?? model };
      } catch (err) {
        throw mapAddisError(err);
      }
    },
  });
};