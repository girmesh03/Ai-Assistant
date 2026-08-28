import { httpStatus } from '../utils/httpStatus.js';
import { logger } from '../config/logger.js';
import multer from 'multer';

/**
 * Express error-handling middleware (4-arity). Logs 5xx failures with a
 * stack trace, and always answers with a plain end-user message inside the
 * standard envelope — internal details are never leaked. Multer upload
 * failures are answered with a friendly 413/400 message instead of a raw
 * error pass-through.
 *
 * @param {Error} err - The thrown error.
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @param {import('express').NextFunction} next - Next middleware (unused, kept for arity).
 * @returns {void}
 */
export const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Audio file exceeds the 25 MB limit.'
        : 'Upload failed. Please try again.';
    res.status(httpStatus.PAYLOAD_TOO_LARGE).json({ success: false, message, data: null });
    return;
  }

  const status = err.status ?? err.statusCode ?? httpStatus.INTERNAL_SERVER_ERROR;

  if (status >= httpStatus.INTERNAL_SERVER_ERROR) {
    logger.error(`[${req.method} ${req.originalUrl}] ${err.message}`, { stack: err.stack });
  }

  const message =
    status >= httpStatus.INTERNAL_SERVER_ERROR
      ? 'Something went wrong on the server. Please try again later.'
      : err.message;

  res.status(status).json({ success: false, message, data: null });
};