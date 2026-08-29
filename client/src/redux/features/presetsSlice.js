import { createSlice } from '@reduxjs/toolkit';
import { baseApi } from '../baseApi.js';

/**
 * Preset CRUD via RTK Query plus UI state for the preset dialog. A preset can
 * optionally pin a provider/model/reasoning level and a persona for one-keystroke
 * conversation setup.
 *
 * @module redux/features/presetsSlice
 */

/**
 * A saved preset.
 *
 * @typedef {object} Preset
 * @property {string} _id - Preset id.
 * @property {string} name - Short preset name.
 * @property {string} prompt - System prompt applied to a conversation.
 * @property {string|null} persona - Optional persona line.
 * @property {string|null} modelProviderId - Optional pinned provider.
 * @property {string|null} modelId - Optional pinned model.
 * @property {'off'|'low'|'medium'|'high'|null} reasoningEffort - Optional pinned level.
 */

/**
 * RTK Query endpoints for presets (envelope unwrapped by the base query).
 */
const presetsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listPresets: builder.query({
      query: () => ({ url: '/presets', params: { limit: 100 } }),
      providesTags: ['Preset'],
      transformResponse: (raw) => (Array.isArray(raw) ? raw : raw?.docs ?? []),
    }),
    createPreset: builder.mutation({
      query: (body) => ({ url: '/presets', method: 'POST', body }),
      invalidatesTags: ['Preset'],
    }),
    updatePreset: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/presets/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Preset'],
    }),
    deletePreset: builder.mutation({
      query: (id) => ({ url: `/presets/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Preset'],
    }),
  }),
});

export const { useListPresetsQuery, useCreatePresetMutation, useUpdatePresetMutation, useDeletePresetMutation } =
  presetsApi;

/**
 * Dialog UI state: open/closed, which preset is being edited (null = new).
 */
export const presetsSlice = createSlice({
  name: 'presetsUi',
  initialState: {
    dialogOpen: false,
    editingPresetId: /** @type {string|null} */ (null),
  },
  reducers: {
    openPresetDialog: (state) => {
      state.dialogOpen = true;
      state.editingPresetId = null;
    },
    openPresetEditor: (state, action) => {
      state.dialogOpen = true;
      state.editingPresetId = action.payload;
    },
    closePresetDialog: (state) => {
      state.dialogOpen = false;
      state.editingPresetId = null;
    },
  },
});

export const { openPresetDialog, openPresetEditor, closePresetDialog } = presetsSlice.actions;

/**
 * Selector: the preset dialog open flag.
 *
 * @param {object} state - Root state slice.
 * @returns {boolean} Whether the dialog is open.
 */
export const selectPresetDialogOpen = (state) => state[presetsSlice.name].dialogOpen;

/**
 * Selector: id of the preset being edited (null when creating a new one).
 *
 * @param {object} state - Root state slice.
 * @returns {string|null} Editing preset id.
 */
export const selectEditingPresetId = (state) => state[presetsSlice.name].editingPresetId;

/** The raw list endpoint name, used only internally by the dialog views. */
export { presetsApi };