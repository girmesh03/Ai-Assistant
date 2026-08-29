/**
 * Frozen client-side constants shared across the ሰላም UI.
 *
 * @module utils/constants
 */

/** The API base path; Vite proxies `/api` to the backend in dev. */
export const API_BASE_URL = '/api';

/** Default conversation title used until the first user message is sent. */
export const DEFAULT_CONVERSATION_TITLE = 'New chat';

/** How many messages the adapter requests per history page. */
export const MESSAGES_PAGE_LIMIT = 30;

/** Title update length cap when deriving a title from the first user turn. */
export const TITLE_FROM_MESSAGE_MAX_LENGTH = 60;

/** Supported assistant languages (must match backend `constants.LANGUAGES`). */
export const SUPPORTED_LANGUAGES = Object.freeze(['en', 'am', 'om']);

/** Reasoning-effort levels (must match backend `constants.REASONING_LEVELS`). */
export const REASONING_LEVELS = Object.freeze(['off', 'low', 'medium', 'high']);

/**
 * Labels for the reasoning-effort levels shown in the header selector.
 *
 * @type {Readonly<Record<(typeof REASONING_LEVELS)[number], string>>}
 */
export const REASONING_LABELS = Object.freeze({
  off: 'Off',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
});

/** Filler copy shown while the model catalog is still loading. */
export const MODEL_LOADING_LABEL = 'Loading models…';

/** The ሰላም brand mark (Amharic for "peace"). */
export const BRAND_NAME = 'ሰላም';

/**
 * Suggested opening prompts surfaced on the welcome screen. Amharic prompts are
 * flagged so the UI can note which language they will invoke.
 *
 * @type {ReadonlyArray<{ readonly text: string, readonly hint: string }>}
 */
export const SUGGESTED_PROMPTS = Object.freeze([
  { text: 'Help me draft a friendly invitation to a harvest festival.', hint: 'Drafting' },
  { text: 'ቃል እገዳዎችን በቀላሉ ይግለጽልኝ።', hint: 'Amharic' },
  { text: 'Summarize the key ideas of Adam Smith in plain language.', hint: 'Explain' },
  { text: 'Give me a 5-step plan to start a small coffee farm.', hint: 'Plan' },
]);

/**
 * Maximum voice recording duration in milliseconds (backend cap is 300 s).
 *
 * @type {number}
 */
export const MAX_RECORDING_MS = 300_000;