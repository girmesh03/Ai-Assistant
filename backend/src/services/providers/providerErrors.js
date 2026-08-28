import { AppError } from '../../utils/AppError.js';
import { logger } from '../../config/logger.js';
import { httpStatus } from '../../utils/httpStatus.js';

/**
 * Maps HTTP/axios failures from a chat provider into a safe {@link AppError}.
 * The provider name and full error are logged server-side; the caller only
 * ever sees a generic message (the errorHandler genericizes every 5xx).
 *
 * @param {unknown} err - The thrown axios/provider error.
 * @param {string} providerName - Display name used in the server log.
 * @returns {AppError} A 502 error with a plain end-user message.
 */
export const mapProviderError = (err, providerName) => {
  const detail = err?.response?.data ?? err?.message ?? String(err);
  logger.error(`[provider:${providerName}] request failed: ${JSON.stringify(detail)}`);

  if (err?.response?.status === httpStatus.TOO_MANY_REQUESTS) {
    return new AppError('The AI provider is busy. Please try again shortly.', httpStatus.TOO_MANY_REQUESTS);
  }

  return new AppError('The AI provider could not be reached. Please try again.', httpStatus.BAD_GATEWAY);
};