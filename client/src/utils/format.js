import dayjs from 'dayjs';

/**
 * Small presentation helpers for the ሰላም client.
 *
 * @module utils/format
 */

/**
 * Formats an ISO timestamp as a short, locale-aware time (e.g. `9:41 AM`).
 *
 * @param {string|undefined} iso - ISO date string from the backend.
 * @returns {string} Formatted time, or an em-dash when the input is missing.
 */
export const formatTime = (iso) => (iso ? dayjs(iso).format('h:mm A') : '—');

/**
 * Formats an ISO timestamp as a calendar-style label (e.g. `Aug 29`).
 *
 * @param {string|undefined} iso - ISO date string from the backend.
 * @returns {string} Formatted date, or an em-dash when the input is missing.
 */
export const formatDayLabel = (iso) => (iso ? dayjs(iso).format('MMM D') : '—');

/**
 * Formats the conversation list timestamp: today → time, otherwise → date.
 *
 * @param {string|undefined} iso - ISO date string from the backend.
 * @returns {string} Compact relative label.
 */
export const formatListTimestamp = (iso) => {
  if (!iso) return '—';
  const value = dayjs(iso);
  return value.isSame(dayjs(), 'day') ? value.format('h:mm A') : value.format('MMM D');
};

/**
 * Converts a `_id` from the backend (Mongoose ObjectId) to a plain string id.
 *
 * @param {unknown} id - ObjectId, string, or nullish.
 * @returns {string} The string form of the id.
 */
export const toId = (id) => String(id);

/**
 * Clamps a string to `maxLength` characters, appending an ellipsis.
 *
 * @param {string} text - Input text.
 * @param {number} maxLength - Maximum length before truncation.
 * @returns {string} Truncated string.
 */
export const truncate = (text, maxLength) =>
  text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;

/**
 * Joins the text parts of a chat message part array.
 *
 * @param {ReadonlyArray<{ readonly type: string, readonly text?: string }>} parts - Message parts.
 * @returns {string} Concatenated text content.
 */
export const partsToText = (parts) => parts.map((part) => (part.type === 'text' ? part.text ?? '' : '')).join('').trim();