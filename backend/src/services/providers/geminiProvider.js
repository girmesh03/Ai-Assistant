import axios from 'axios';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../config/logger.js';
import { httpStatus } from '../../utils/httpStatus.js';
import { constants } from '../../utils/constants.js';
import { mapProviderError } from './providerErrors.js';

/**
 * Gemini 3 thinking levels keyed by the app's reasoning levels. `off`
 * (mapped to `minimal`) minimizes reasoning; the rest scale the effort.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const GEMINI_THINKING_LEVELS = Object.freeze({
  off: 'minimal',
  low: 'low',
  medium: 'medium',
  high: 'high',
});

/**
 * Converts an internal {role, content} turn into a Gemini `contents` part.
 *
 * @param {{role: string, content: string}} message - A conversation turn.
 * @returns {{role: string, parts: Array<{text: string}>}} A Gemini content entry.
 */
const toGeminiContent = (message) => ({
  role: message.role === 'assistant' ? 'model' : 'user',
  parts: [{ text: message.content }],
});

/**
 * Splits Gemini response parts into the final answer and the thought
 * summary. Thought parts are only surfaced when the API returns them
 * (includeThoughts is unreliable over REST); otherwise reasoning is null.
 *
 * @param {Array<{text?: string, thought?: boolean}>} parts - Candidate response parts.
 * @returns {{content: string, reasoning: string|null}} Extracted reply.
 */
const extractParts = (parts) => {
  const content = parts
    .filter((part) => part.thought !== true)
    .map((part) => part.text ?? '')
    .join('');

  const reasoning = parts
    .filter((part) => part.thought === true)
    .map((part) => part.text ?? '')
    .join('')
    .trim();

  return { content, reasoning: reasoning === '' ? null : reasoning };
};

/**
 * Creates the Google Gemini provider adapter (REST `generateContent`, no
 * SDK). Thinking is controlled via `thinkingConfig.thinkingLevel`.
 *
 * @param {object} options - Adapter configuration.
 * @param {string} options.apiKey - Gemini API key.
 * @param {string} options.baseUrl - GeneratedLanguage API base URL.
 * @returns {Readonly<{providerId: string, generate: Function}>} The adapter.
 */
export const createGeminiAdapter = ({ apiKey, baseUrl }) => {
  const endpoint = `${baseUrl}/v1beta/models`;

  return Object.freeze({
    providerId: 'gemini',

    /**
     * Sends the chat messages to Gemini 3 and returns the finalized reply.
     *
     * @param {object} call - Generated-turn inputs.
     * @param {Array<{role: string, content: string}>} call.messages - Prior turns plus the new user turn.
     * @param {string} call.model - Gemini model id (e.g. `gemini-3.6-flash`).
     * @param {string} call.reasoningLevel - App reasoning level (`off`|`low`|`medium`|`high`).
     * @param {string} [call.system] - Per-conversation system prompt (maps to `systemInstruction`).
     * @param {string} [call.persona] - Per-conversation identity persona (folded into `systemInstruction`).
     * @returns {Promise<{content: string, reasoning: string|null, model: string}>} The reply.
     */
    generate: async ({ messages, model, reasoningLevel, system, persona }) => {
      try {
        const systemText = [persona, system].filter(Boolean).join('\n\n');
        const body = {
          contents: messages.map(toGeminiContent),
          generationConfig: {
            temperature: constants.GENERATION.DEFAULT_TEMPERATURE,
            maxOutputTokens: constants.GENERATION.GEMINI_MAX_OUTPUT_TOKENS,
            thinkingConfig: {
              thinkingLevel: GEMINI_THINKING_LEVELS[reasoningLevel] ?? GEMINI_THINKING_LEVELS.off,
            },
          },
        };
        if (systemText) {
          body.systemInstruction = { parts: [{ text: systemText }] };
        }

        const response = await axios.post(
          `${endpoint}/${encodeURIComponent(model)}:generateContent`,
          body,
          { headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' }, timeout: 90000 }
        );

        const candidate = response?.data?.candidates?.[0];
        if (!candidate?.content?.parts?.length) {
          logger.error(`[provider:gemini] empty response: ${JSON.stringify(response?.data ?? {})}`);
          throw new AppError('The AI provider returned an empty response.', httpStatus.BAD_GATEWAY);
        }

        return {
          ...extractParts(candidate.content.parts),
          model: response?.data?.modelVersion ?? model,
        };
      } catch (err) {
        throw mapProviderError(err, 'gemini');
      }
    },
  });
};