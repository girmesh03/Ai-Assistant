import axios from 'axios';
import { constants } from '../../utils/constants.js';
import { mapProviderError } from './providerErrors.js';

/**
 * Extracts the optional reasoning trace from an OpenAI-compatible response
 * message. Providers expose it under different keys: OpenRouter/DeepSeek use
 * `reasoning` (or `reasoning_content`), and OpenRouter may return the richer
 * `reasoning_details` array.
 *
 * @param {object} message - The assistant message payload.
 * @returns {string|null} The reasoning text, or null when absent.
 */
export const extractOpenAiReasoning = (message) => {
  if (typeof message?.reasoning === 'string' && message.reasoning !== '') {
    return message.reasoning;
  }

  if (typeof message?.reasoning_content === 'string' && message.reasoning_content !== '') {
    return message.reasoning_content;
  }

  if (Array.isArray(message?.reasoning_details)) {
    const joined = message.reasoning_details
      .map((detail) => detail?.text ?? detail?.summary ?? '')
      .join('\n')
      .trim();
    return joined === '' ? null : joined;
  }

  return null;
};

/**
 * Creates an OpenAI-compatible chat provider adapter (NVIDIA, Groq,
 * OpenRouter). Provider-specific reasoning controls are produced by the
 * injected `buildReasoningParams` callback.
 *
 * @param {object} options - Adapter configuration.
 * @param {string} options.providerId - Catalog provider id (e.g. `groq`).
 * @param {string} options.baseUrl - Compatibility API base URL.
 * @param {string} options.apiKey - Provider API key.
 * @param {(reasoningLevel: string) => object} [options.buildReasoningParams] - Extra body fields per reasoning level.
 * @returns {Readonly<{providerId: string, generate: Function}>} The adapter.
 */
export const createOpenAiCompatAdapter = ({ providerId, baseUrl, apiKey, buildReasoningParams = () => ({}) }) => {
  const endpoint = `${baseUrl}/chat/completions`;

  return Object.freeze({
    providerId,

    /**
     * Sends the chat messages to the compatibility endpoint and returns the
     * finalized reply plus any reasoning the provider exposed.
     *
     * @param {object} call - Generated-turn inputs.
     * @param {Array<{role: string, content: string}>} call.messages - Prior turns plus the new user turn.
     * @param {string} call.model - Provider model id.
     * @param {string} call.reasoningLevel - App reasoning level (`off`|`low`|`medium`|`high`).
     * @param {string} [call.system] - Per-conversation system prompt (prepended as a system message).
     * @param {string} [call.persona] - Per-conversation identity persona (folded into the system message).
     * @returns {Promise<{content: string, reasoning: string|null, model: string}>} The reply.
     */
    generate: async ({ messages, model, reasoningLevel, system, persona }) => {
      try {
        const systemText = [persona, system].filter(Boolean).join('\n\n');
        const payloadMessages = systemText ? [{ role: 'system', content: systemText }, ...messages] : messages;

        const response = await axios.post(
          endpoint,
          {
            model,
            messages: payloadMessages,
            temperature: constants.GENERATION.DEFAULT_TEMPERATURE,
            max_tokens: constants.GENERATION.COMPAT_MAX_TOKENS,
            ...buildReasoningParams(reasoningLevel),
          },
          { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 90000 }
        );

        const message = response?.data?.choices?.[0]?.message;
        const content = message?.content ?? '';
        return {
          content,
          reasoning: extractOpenAiReasoning(message),
          model: response?.data?.model ?? model,
        };
      } catch (err) {
        throw mapProviderError(err, providerId);
      }
    },
  });
};