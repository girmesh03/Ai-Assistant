import { env } from '../config/env.js';
import { createAddisAdapter } from './providers/addisProvider.js';
import { createGeminiAdapter } from './providers/geminiProvider.js';
import { createOpenAiCompatAdapter } from './providers/openAiCompatProvider.js';

/** GeneratedLanguage API base URL. @type {string} */
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com';
/** NVIDIA NIM/OpenAI-compatible base URL. @type {string} */
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
/** Groq OpenAI-compatible base URL. @type {string} */
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
/** OpenRouter OpenAI-compatible base URL. @type {string} */
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Builds the Groq reasoning body fields for a given reasoning level. `off`
 * disables both display and effort; any other level asks for parsed
 * reasoning at default effort.
 *
 * @param {string} reasoningLevel - App reasoning level.
 * @returns {object} Extra body fields merged into the Groq request.
 */
const buildGroqReasoningParams = (reasoningLevel) =>
  reasoningLevel === 'off'
    ? { reasoning_format: 'hidden', reasoning_effort: 'none' }
    : { reasoning_format: 'parsed', reasoning_effort: 'default' };

/**
 * Frozen provider catalog. Each entry carries its display name, the
 * configured API key (null when absent — gating availability), its frozen
 * model list, and the adapter factory used to build its client.
 *
 * @type {ReadonlyArray<Readonly<object>>}
 */
const PROVIDER_DEFS = Object.freeze([
  Object.freeze({
    id: 'addis',
    name: 'Addis AI',
    apiKey: env.addis.apiKey,
    models: Object.freeze([Object.freeze({ id: 'addis-1-alef', name: 'Addis-1 Alef', reasoning: false })]),
    buildAdapter: () => createAddisAdapter({ apiKey: env.addis.apiKey, baseURL: env.addis.baseUrl }),
  }),
  Object.freeze({
    id: 'gemini',
    name: 'Google Gemini',
    apiKey: env.providerKeys.gemini,
    models: Object.freeze([Object.freeze({ id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', reasoning: true })]),
    buildAdapter: () => createGeminiAdapter({ apiKey: env.providerKeys.gemini, baseUrl: GEMINI_BASE_URL }),
  }),
  Object.freeze({
    id: 'nvidia',
    name: 'NVIDIA',
    apiKey: env.providerKeys.nvidia,
    models: Object.freeze([
      Object.freeze({ id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', reasoning: false }),
    ]),
    buildAdapter: () =>
      createOpenAiCompatAdapter({ providerId: 'nvidia', baseUrl: NVIDIA_BASE_URL, apiKey: env.providerKeys.nvidia }),
  }),
  Object.freeze({
    id: 'groq',
    name: 'Groq',
    apiKey: env.providerKeys.groq,
    models: Object.freeze([Object.freeze({ id: 'qwen/qwen3-32b', name: 'Qwen3 32B', reasoning: true })]),
    buildAdapter: () =>
      createOpenAiCompatAdapter({
        providerId: 'groq',
        baseUrl: GROQ_BASE_URL,
        apiKey: env.providerKeys.groq,
        buildReasoningParams: buildGroqReasoningParams,
      }),
  }),
  Object.freeze({
    id: 'openrouter',
    name: 'OpenRouter',
    apiKey: env.providerKeys.openrouter,
    models: Object.freeze([
      Object.freeze({ id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (free)', reasoning: true }),
    ]),
    buildAdapter: () =>
      createOpenAiCompatAdapter({
        providerId: 'openrouter',
        baseUrl: OPENROUTER_BASE_URL,
        apiKey: env.providerKeys.openrouter,
      }),
  }),
]);

/**
 * Live adapters keyed by provider id. Only providers with a configured key
 * get an adapter — a null lookup means "key missing / unavailable".
 *
 * @type {Map<string, Readonly<object>>}
 */
const adapters = new Map();

for (const provider of PROVIDER_DEFS) {
  if (provider.apiKey) {
    adapters.set(provider.id, provider.buildAdapter());
  }
}

/**
 * Frozen provider-catalog facade: availability gating, model lookups, and
 * adapter resolution for the chat flow.
 *
 * @type {Readonly<object>}
 */
export const providerCatalog = Object.freeze({
  /** Provider ids present in the catalog, in display order. @type {ReadonlyArray<string>} */
  get providerIds() {
    return PROVIDER_DEFS.map((provider) => provider.id);
  },

  /**
   * Lists the models of every provider whose API key is configured. Rejects
   * nothing — unknown keys simply hide their provider from the picker.
   *
   * @returns {ReadonlyArray<Readonly<object>>} Available {providerId, providerName, id, name, reasoning} entries.
   */
  getAvailableModels() {
    return PROVIDER_DEFS.flatMap((provider) =>
      provider.apiKey
        ? provider.models.map((model) => ({
            providerId: provider.id,
            providerName: provider.name,
            id: model.id,
            name: model.name,
            reasoning: model.reasoning,
          }))
        : []
    );
  },

  /**
   * Returns a catalog model matching a provider + model id, or null. This
   * lookup is key-independent so conversation validation can reject unknown
   * models even before a key is configured.
   *
   * @param {string} providerId - Catalog provider id.
   * @param {string} modelId - Catalog model id.
   * @returns {Readonly<{id: string, name: string, reasoning: boolean}>|null} The model, or null.
   */
  getModelInfo(providerId, modelId) {
    const provider = PROVIDER_DEFS.find((entry) => entry.id === providerId);
    return provider?.models.find((model) => model.id === modelId) ?? null;
  },

  /**
   * Resolves the live adapter for a provider, or null when its key is not
   * configured (the conversation is then not usable with that provider).
   *
   * @param {string} providerId - Catalog provider id.
   * @returns {Readonly<{providerId: string, generate: Function}>|null} The adapter, or null.
   */
  getAdapter(providerId) {
    return adapters.get(providerId) ?? null;
  },

  /**
   * Display name for a provider id.
   *
   * @param {string} providerId - Catalog provider id.
   * @returns {string} Human-readable provider name.
   */
  getProviderName(providerId) {
    return PROVIDER_DEFS.find((entry) => entry.id === providerId)?.name ?? providerId;
  },
});