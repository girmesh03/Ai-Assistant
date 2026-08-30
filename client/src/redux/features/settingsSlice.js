import { createSlice } from '@reduxjs/toolkit';

/**
 * Pre-chat preferences (the "draft" settings the user can pick before any
 * conversation exists): model, reasoning effort and assistant language.
 *
 * Fields are null until chosen — null means "resolve from defaults at creation
 * time" (catalog default model, `off` reasoning, `en` language). Every control
 * change writes through here and, when a conversation is active, also PATCHes
 * that conversation — so the last pick carries into the next New chat too.
 *
 * @module redux/features/settingsSlice
 */

/**
 * @typedef {object} ChatSettings
 * @property {string|null} modelProviderId - Selected provider id, or null for catalog default.
 * @property {string|null} modelId - Selected model id, or null for catalog default.
 * @property {string|null} reasoningEffort - Chosen reasoning level, or null for `off`.
 * @property {string} language - Chosen assistant language (`en` default).
 */

/**
 * Plain-token slice holding the pre-chat preferences.
 */
export const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    modelProviderId: null,
    modelId: null,
    reasoningEffort: null,
    language: 'en',
  },
  reducers: {
    /**
     * Merges a partial patch into the current prefs.
     *
     * @param {ChatSettings} state - Current prefs.
     * @param {{ payload: Partial<ChatSettings> }} action - Patch to merge.
     * @returns {void}
     */
    updateSettings: (state, action) => {
      const patch = action.payload ?? {};
      if (patch.modelProviderId !== undefined) state.modelProviderId = patch.modelProviderId;
      if (patch.modelId !== undefined) state.modelId = patch.modelId;
      if (patch.reasoningEffort !== undefined) state.reasoningEffort = patch.reasoningEffort;
      if (patch.language !== undefined) state.language = patch.language;
    },
  },
});

export const { updateSettings } = settingsSlice.actions;

/**
 * Selector: the full pre-chat preferences state.
 *
 * @param {object} state - Root state slice.
 * @returns {ChatSettings} The current prefs.
 */
export const selectSettings = (state) => state[settingsSlice.name];