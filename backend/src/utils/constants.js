/**
 * Frozen application-wide constants. Centralizes every "magic value" so
 * models, routes, and services never hardcode literals.
 *
 * @module utils/constants
 */
export const constants = Object.freeze({
  /** Allowed reasoning-effort levels, in increasing strength order. */
  REASONING_LEVELS: Object.freeze(['off', 'low', 'medium', 'high']),
  /** Default reasoning effort applied to new conversations. */
  DEFAULT_REASONING_LEVEL: 'off',

  /** Supported assistant languages (Addis AI: am/om/en). */
  LANGUAGES: Object.freeze(['en', 'am', 'om']),
  /** Default conversation language. */
  DEFAULT_LANGUAGE: 'en',

  /** Pagination defaults used by every paginated list endpoint. */
  PAGINATION: Object.freeze({
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  }),

  /** Voice-input pipeline limits and ffmpeg split behavior. */
  STT: Object.freeze({
    MAX_UPLOAD_BYTES: 25 * 1024 * 1024,
    MIN_DURATION_SECONDS: 1,
    MAX_SEGMENT_SECONDS: 60,
    OVERLAP_SECONDS: 1,
    MAX_RECORDING_SECONDS: 300,
  }),

  /** Exponential backoff config for the MongoDB connection retry loop. */
  MONGO_RETRY: Object.freeze({
    INITIAL_DELAY_MS: 1000,
    MAX_DELAY_MS: 30000,
    FACTOR: 2,
    SERVER_SELECTION_TIMEOUT_MS: 5000,
  }),
});