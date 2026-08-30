import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from './baseApi.js';
import { metaSlice, metaListener, metaApi } from './features/metaSlice.js';
import { presetsSlice } from './features/presetsSlice.js';
import { settingsSlice } from './features/settingsSlice.js';
import { speechSlice } from './features/speechSlice.js';

/**
 * The Redux store. Chat runtime/conversation state lives in the MUI X Chat
 * store; Redux only owns the model catalog (meta), presets, and speech.
 *
 * @module redux/store
 */
export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    [metaSlice.name]: metaSlice.reducer,
    [presetsSlice.name]: presetsSlice.reducer,
    [settingsSlice.name]: settingsSlice.reducer,
    [speechSlice.name]: speechSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware, metaListener.middleware),
});

setupListeners(store.dispatch);

// The catalog is app-level data: fetch it once up front so the model pickers
// are populated regardless of which components mount later. Components that
// call `useGetModelsQuery` reuse this same cached entry.
if (typeof window !== 'undefined') {
  store.dispatch(metaApi.endpoints.getModels.initiate());
}