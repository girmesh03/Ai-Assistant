import { createSlice, createSelector, createListenerMiddleware } from '@reduxjs/toolkit';
import { baseApi } from '../baseApi.js';

/**
 * Catalog of available AI models plus the derived default provider/model used
 * when creating a fresh conversation. Loaded once at app start.
 *
 * @module redux/features/metaSlice
 */

/**
 * Normalizes a model entry from the backend.
 *
 * @typedef {object} AvailableModel
 * @property {string} providerId - Catalog provider id (e.g. `gemini`).
 * @property {string} providerName - Human-readable provider name.
 * @property {string} id - Model id within its provider.
 * @property {string} name - Human-readable model name.
 * @property {boolean} reasoning - Whether the model supports reasoning traces.
 */

/**
 * RTK Query endpoint for the model catalog.
 */
const metaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getModels: builder.query({
      query: () => ({ url: '/meta/models' }),
      providesTags: ['Meta'],
      transformResponse: (data) => data,
    }),
  }),
});

/** Hook for the model catalog query. */
export const { useGetModelsQuery } = metaApi;

/**
 * Listener middleware that mirrors the fetched catalog into the plain `meta`
 * slice (the source of truth for the pickers' selectors). The app starts the
 * query at boot in `store.js`, so the catalog always loads whether or not a
 * component has mounted to subscribe.
 */
export const metaListener = createListenerMiddleware();
metaListener.startListening({
  matcher: metaApi.endpoints.getModels.matchFulfilled,
  effect: (action, listenerApi) => {
    if (Array.isArray(action.payload)) listenerApi.dispatch(setModels(action.payload));
  },
});

/** The raw catalog endpoint, used to start the fetch at app boot. */
export { metaApi };

/**
 * Plain-token slice that caches meta-derived values the pickers need.
 */
export const metaSlice = createSlice({
  name: 'meta',
  initialState: {
    models: /** @type {AvailableModel[]} */ ([]),
    loaded: false,
  },
  reducers: {
    setModels: (state, action) => {
      state.models = action.payload;
      state.loaded = true;
    },
  },
});

export const { setModels } = metaSlice.actions;

/**
 * Derives the grouped provider list (unique providers in catalog order).
 *
 * @param {ReadonlyArray<AvailableModel>} models - Flat model catalog.
 * @returns {ReadonlyArray<{ readonly providerId: string, readonly providerName: string }>} Providers.
 */
export const deriveProviders = (models) => {
  const seen = new Set();
  const providers = [];
  for (const model of models) {
    if (!seen.has(model.providerId)) {
      seen.add(model.providerId);
      providers.push({ providerId: model.providerId, providerName: model.providerName });
    }
  }
  return providers;
};

/**
 * Memoized selector: the grouped provider list.
 *
 * @param {object} state - Root state slice.
 * @returns {ReadonlyArray<{ readonly providerId: string, readonly providerName: string }>} Providers.
 */
export const selectProviders = createSelector(
  [(state) => state[metaSlice.name].models],
  (models) => deriveProviders(models),
);

/**
 * Memoized selector: the default provider/model (the catalog's first entry),
 * used to seed new conversations.
 *
 * @param {object} state - Root state slice.
 * @returns {{ readonly providerId: string, readonly modelId: string } | null} Default pair.
 */
export const selectDefaultModelPair = createSelector(
  [(state) => state[metaSlice.name].models],
  (models) => (models.length > 0 ? { providerId: models[0].providerId, modelId: models[0].id } : null),
);

/**
 * Resolves a model entry by provider + model ids (or the default pair when the
 * ids are omitted).
 *
 * @param {object} state - Root state slice.
 * @param {{ providerId?: string, modelId?: string }} ids - The ids to look up.
 * @returns {AvailableModel | null} The matching catalog model, or null.
 */
export const selectModelInfo = createSelector(
  [(state) => state[metaSlice.name].models, (_state, ids) => ids],
  (models, { providerId, modelId }) => {
    const found = models.find((model) => model.providerId === providerId && model.id === modelId);
    if (found) return found;
    const defaults = models[0];
    if (!defaults) return null;
    return { ...defaults, providerId: providerId ?? defaults.providerId, modelId: modelId ?? defaults.id };
  },
);