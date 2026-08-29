import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../utils/constants.js';

/**
 * RTK Query base API for the ሰላም client. Every endpoint unwraps the backend's
 * `{ success, message, data }` envelope so slices and callers receive `data`
 * directly (an ApiError when the request is malformed).
 *
 * @module redux/baseApi
 */

/** Error shape thrown when the backend replies with a non-2xx status. */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * RTK Query base query that unwraps the backend `{ success, message, data }`
 * envelope and normalizes failures into {@link ApiError} instances carrying
 * the server message. Always resolves the RTK baseQuery contract
 * (`{ data, meta }`); the unwrapped payload lives under `data`.
 *
 * @param {object} fetchArgs - The endpoint's fetch args (`url`, `method`, `body`, ...).
 * @param {object} baseQueryApi - RTK's `api` argument (signal, dispatch, getState).
 * @returns {Promise<{ data: object, meta: object }>} The `{ data, meta }` result.
 */
const envelopeBaseQuery = async (fetchArgs, baseQueryApi) => {
  const result = await fetchBaseQuery({ baseUrl: API_BASE_URL })(fetchArgs, baseQueryApi, {
    signal: baseQueryApi?.signal,
  });

  if (result.error) {
    const { data, status } = result.error;
    const message =
      typeof data?.message === 'string' && data.message ? data.message : `Backend error ${status ?? 'unknown'}`;
    throw new ApiError(message, status, data);
  }

  const body = result.data;
  if (body && typeof body === 'object' && 'success' in body) {
    return { data: body.data, meta: result.meta };
  }
  return { data: body, meta: result.meta };
};

/**
 * The root API definition. Features inject their endpoints via `.injectEndpoints`.
 *
 * @type {import('@reduxjs/toolkit/query').Api}
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: envelopeBaseQuery,
  tagTypes: ['Preset', 'Meta'],
  endpoints: () => ({}),
});