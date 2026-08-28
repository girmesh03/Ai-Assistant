import expressAsyncHandler from 'express-async-handler';
import { transcribeAudio } from '../services/addisSttService.js';
import { AppError } from '../utils/AppError.js';
import { httpStatus } from '../utils/httpStatus.js';
import { constants } from '../utils/constants.js';
import { logger } from '../config/logger.js';

/**
 * Transcribes an uploaded voice recording (≤25 MB, 1–300 s) via the Addis
 * STT pipeline. Long recordings are split into ≤60 s segments internally.
 *
 * @param {import('express').Request} req - Incoming request (multer-populated).
 * @param {import('express').Response} res - Outgoing response.
 * @returns {Promise<void>}
 */
export const transcribe = expressAsyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Audio file is required', httpStatus.BAD_REQUEST);
  }

  const language = req.body.language ?? constants.DEFAULT_LANGUAGE;

  logger.info(`[stt] transcribing ${req.file.size} bytes (language=${language})`);
  const text = await transcribeAudio(req.file.buffer, language);

  res.json({ success: true, message: 'Transcription complete', data: { text } });
});