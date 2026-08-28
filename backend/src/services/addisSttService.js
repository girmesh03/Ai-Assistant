import { AddisAI, AuthenticationError, BadRequestError, InsufficientCreditsError, RateLimitError, APIError } from 'addisai';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { constants } from '../utils/constants.js';
import { AppError } from '../utils/AppError.js';
import { httpStatus } from '../utils/httpStatus.js';
import { splitIntoWavSegments } from './ffmpegSplitter.js';

/**
 * Shared Addis AI client, built only when an API key is configured. Uses the
 * configured base URL so a custom `ADDIS_AI_BASE_URL` is honored by STT and
 * chat alike.
 *
 * @type {import('addisai').AddisAI|null}
 */
const client = env.addis.apiKey ? new AddisAI({ apiKey: env.addis.apiKey, baseURL: env.addis.baseUrl }) : null;

/**
 * Maps an Addis AI STT error to a safe {@link AppError}. Rate limits and
 * credit balances keep their actionable status; everything else degrades to
 * a generic 502 that the errorHandler genericizes further.
 *
 * @param {unknown} err - The thrown Addis AI error.
 * @returns {AppError} A mapped error.
 */
const mapSttError = (err) => {
  if (err instanceof AppError) {
    return err;
  }

  if (err instanceof RateLimitError) {
    return new AppError('The speech service is busy. Please try again shortly.', httpStatus.TOO_MANY_REQUESTS);
  }

  if (err instanceof InsufficientCreditsError) {
    return new AppError('Insufficient Addis AI credits. Please top up your account.', httpStatus.PAYMENT_REQUIRED);
  }

  if (err instanceof AuthenticationError || err instanceof BadRequestError || err instanceof APIError) {
    logger.error(`[stt] addis service error: ${err.message}`);
    return new AppError('The speech service could not be reached. Please try again.', httpStatus.BAD_GATEWAY);
  }

  logger.error(`[stt] unexpected error: ${err.message ?? err}`);
  return new AppError('The speech service could not be reached. Please try again.', httpStatus.BAD_GATEWAY);
};

/**
 * Transcribes an in-memory audio buffer via the Addis AI STT pipeline:
 * normalize/split to ≤60s WAV segments with ffmpeg, transcribe each segment
 * sequentially, then join. A temporary directory is cleaned up in all cases.
 *
 * @param {Buffer} audio - Uploaded audio bytes.
 * @param {string} language - STT language (`en`|`am`|`om`).
 * @returns {Promise<string>} The joined transcript.
 */
export const transcribeAudio = async (audio, language) => {
  if (!client) {
    throw new AppError('Speech transcription is not configured.', httpStatus.SERVICE_UNAVAILABLE);
  }

  const workDir = await mkdtemp(path.join(tmpdir(), 'assistant-stt-'));
  const inputPath = path.join(workDir, 'input.bin');

  try {
    await writeFile(inputPath, audio);
    const segments = await splitIntoWavSegments(inputPath, workDir);
    const transcripts = [];

    for (const segmentPath of segments) {
      const segment = await readFile(segmentPath);
      const result = await client.speech.transcribe({
        audio: { data: segment, filename: path.basename(segmentPath), contentType: 'audio/wav' },
        language,
      });
      transcripts.push((result?.text ?? '').trim());
    }

    return transcripts.filter((text) => text !== '').join(' ');
  } catch (err) {
    throw mapSttError(err);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
};