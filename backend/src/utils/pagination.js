import { query } from 'express-validator';
import { constants } from './constants.js';

/**
 * Shared pagination helpers: query validators plus payload/param resolving.
 *
 * @module utils/pagination
 */

/**
 * express-validator chain for `page` and `limit` query params. Present
 * values must be integers (page ≥ 1, limit within 1..MAX_LIMIT) and are
 * coerced to numbers; absent values are skipped (handlers default them).
 *
 * @type {ReadonlyArray<import('express-validator').ValidationChain>}
 */
export const paginationValidators = [
  query('page').optional().isInt({ min: 1 }).withMessage('Invalid page').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: constants.PAGINATION.MAX_LIMIT })
    .withMessage(`Invalid limit (max ${constants.PAGINATION.MAX_LIMIT})`)
    .toInt(),
];

/**
 * Builds the spec-mandated pagination payload from a paginate() result,
 * stripping mongoose-paginate-v2 extras.
 *
 * @param {object} result - Raw `Model.paginate()` result.
 * @returns {{ docs: Array<object>, page: number, limit: number, totalDocs: number, totalPages: number }} Spec payload.
 */
export const buildPaginationPayload = (result) => ({
  docs: result.docs,
  page: result.page,
  limit: result.limit,
  totalDocs: result.totalDocs,
  totalPages: result.totalPages,
});

/**
 * Resolves a raw page query value to a validated integer or the default.
 *
 * @param {unknown} value - Raw query value (validated integer when present).
 * @returns {number} The page number to use.
 */
export const resolvePage = (value) =>
  Number.isInteger(value) ? value : constants.PAGINATION.DEFAULT_PAGE;

/**
 * Resolves a raw limit query value to a validated integer or the default.
 *
 * @param {unknown} value - Raw query value (validated integer when present).
 * @returns {number} The page size to use.
 */
export const resolveLimit = (value) =>
  Number.isInteger(value) ? value : constants.PAGINATION.DEFAULT_LIMIT;