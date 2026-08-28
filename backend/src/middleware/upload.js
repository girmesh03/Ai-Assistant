import multer from 'multer';
import { constants } from '../utils/constants.js';

/**
 * Multer middleware accepting a single `audio` field into memory, capped at
 * the STT upload limit. Oversized files surface as a `LIMIT_FILE_SIZE`
 * MulterError handled by the errorHandler (413).
 *
 * @type {import('express').RequestHandler}
 */
export const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: constants.STT.MAX_UPLOAD_BYTES },
}).single('audio');