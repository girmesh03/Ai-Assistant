import 'dotenv/config';

/**
 * Frozen validation of required environment variables. Loads `dotenv`,
 * then throws immediately when a hard-required variable is missing so the
 * server never boots half-configured.
 *
 * @module config/env
 */

const required = ['NODE_ENV', 'PORT', 'CLIENT_ORIGIN', 'MONGO_URI', 'FFMPEG_PATH', 'FFPROBE_PATH'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

/**
 * Frozen, validated environment accessor. Every value is read once at
 * import time; provider keys may be null (presence is checked later).
 *
 * @type {Readonly<object>}
 */
export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV,
  port: Number(process.env.PORT),
  clientOrigin: process.env.CLIENT_ORIGIN,
  mongoUri: process.env.MONGO_URI,

  addis: Object.freeze({
    baseUrl: process.env.ADDIS_AI_BASE_URL ?? 'https://api.addisassistant.com',
    apiKey: process.env.ADDIS_API_KEY ?? null,
  }),

  ffmpegPath: process.env.FFMPEG_PATH,
  ffprobePath: process.env.FFPROBE_PATH,

  providerKeys: Object.freeze({
    nvidia: process.env.NVIDIA_API_KEY ?? null,
    gemini: process.env.GEMINI_API_KEY ?? null,
    groq: process.env.GROQ_API_KEY ?? null,
    openrouter: process.env.OPENROUTER_API_KEY ?? null,
  }),
});