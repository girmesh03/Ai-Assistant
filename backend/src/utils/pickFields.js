/**
 * Builds a plain object containing exactly the allow-listed fields that are
 * present on the source. Keeps Mongoose strict-mode creation/update safe by
 * never forwarding unknown body keys.
 *
 * @module utils/pickFields
 */

/**
 * Picks allowed fields from a source object.
 *
 * @param {object} source - The object to pick from (e.g. `req.body`).
 * @param {ReadonlyArray<string>} allowed - Allow-listed field names.
 * @returns {object} Object with only the present allowed fields.
 */
export const pickFields = (source, allowed) => {
  const picked = {};

  for (const key of allowed) {
    if (key in source) {
      picked[key] = source[key];
    }
  }

  return picked;
};