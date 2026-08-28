import { httpStatus } from '../utils/httpStatus.js';

/**
 * Express middleware that answers any unmatched route with a 404 envelope.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {void}
 */
export const notFound = (req, res) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    data: null,
  });
};