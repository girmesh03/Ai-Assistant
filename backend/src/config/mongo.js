import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';
import { constants } from '../utils/constants.js';

/**
 * Waits for the given number of milliseconds.
 *
 * @param {number} ms - Duration to sleep.
 * @returns {Promise<void>} Resolves after the delay.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Connects to MongoDB with an infinite exponential-backoff retry loop.
 *
 * Each attempt uses a short server-side selection timeout so a dead
 * database surfaces quickly and the backoff governs the retry cadence.
 * Failures are logged with the attempt number and the next delay; the
 * function only resolves once the connection is established.
 *
 * @param {object} [options] - Optional overrides for the retry parameters.
 * @param {number} [options.initialDelayMs] - First backoff delay in ms.
 * @param {number} [options.maxDelayMs] - Upper bound for the backoff delay.
 * @param {number} [options.factor] - Multiplier applied after each failure.
 * @param {number} [options.serverSelectionTimeoutMs] - Per-attempt connect timeout.
 * @returns {Promise<void>} Resolves when MongoDB is connected.
 */
export const connectWithRetry = async (options = {}) => {
  const retry = constants.MONGO_RETRY;
  const initialDelayMs = options.initialDelayMs ?? retry.INITIAL_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? retry.MAX_DELAY_MS;
  const factor = options.factor ?? retry.FACTOR;
  const serverSelectionTimeoutMs = options.serverSelectionTimeoutMs ?? retry.SERVER_SELECTION_TIMEOUT_MS;

  let delayMs = initialDelayMs;
  let attempt = 0;

  for (;;) {
    attempt += 1;
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMs });
      logger.info('MongoDB connected');
      return;
    } catch (err) {
      logger.error(
        `MongoDB connection attempt ${attempt} failed: ${err.message}. Retrying in ${delayMs}ms...`
      );
      await sleep(delayMs);
      delayMs = Math.min(delayMs * factor, maxDelayMs);
    }
  }
};