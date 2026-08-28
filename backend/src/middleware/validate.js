import { validationResult } from 'express-validator';
import { httpStatus } from '../utils/httpStatus.js';

/**
 * Express middleware placed at the end of an express-validator chain. When
 * any preceding rule failed, it answers with a 400 envelope carrying the
 * first plain error message; otherwise it continues to the handler.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @param {import('express').NextFunction} next - Next middleware.
 * @returns {void}
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    next();
    return;
  }

  const firstError = errors.array({ onlyFirstError: true })[0];

  res.status(httpStatus.BAD_REQUEST).json({
    success: false,
    message: firstError.msg,
    data: null,
  });
};