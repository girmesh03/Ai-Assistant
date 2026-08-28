import { httpStatus } from './httpStatus.js';

/**
 * Error subclass carrying an HTTP status so controllers and middleware can
 * signal the intended response code without relying on Express defaults.
 *
 * @class
 * @extends Error
 */
export class AppError extends Error {
  /**
   * Creates an application error.
   *
   * @param {string} message - Plain end-user error message.
   * @param {number} [status] - HTTP status code (defaults to 500).
   */
  constructor(message, status = httpStatus.INTERNAL_SERVER_ERROR) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}