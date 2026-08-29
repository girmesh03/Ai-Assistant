import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_BASE_URL } from '../../utils/constants.js';

/**
 * Speech-to-text state: whether a recording/transcription is in flight and any
 * resulting error. The blob upload itself is done via fetch (the backend takes
 * a multipart `audio` file).
 *
 * @module redux/features/speechSlice
 */

/**
 * Transcribes an audio blob via `POST /api/speech/transcribe`.
 *
 * @param {Blob} audio - Recorded audio blob (webm/ogg).
 * @param {'en'|'am'|'om'} [language] - Hint passed to the recognizer.
 * @param {AbortSignal} [signal] - Optional abort signal.
 * @returns {Promise<string>} The transcribed text.
 */
export const transcribeAudio = createAsyncThunk(
  'speech/transcribe',
  async ({ audio, language = 'en' }, { rejectWithValue }) => {
    const formData = new FormData();
    formData.append('audio', audio, 'recording.webm');
    formData.append('language', language);

    const response = await fetch(`${API_BASE_URL}/speech/transcribe`, {
      method: 'POST',
      body: formData,
    });

    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success) {
      const message = typeof body?.message === 'string' ? body.message : 'Voice transcription failed';
      return rejectWithValue(message);
    }
    return /** @type {string} */ (body.data.text);
  },
);

export const speechSlice = createSlice({
  name: 'speech',
  initialState: {
    /** @type {'idle'|'transcribing'} */
    status: 'idle',
    /** @type {string} */
    error: '',
  },
  reducers: {
    resetSpeech: (state) => {
      state.status = 'idle';
      state.error = '';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(transcribeAudio.pending, (state) => {
        state.status = 'transcribing';
        state.error = '';
      })
      .addCase(transcribeAudio.fulfilled, (state) => {
        state.status = 'idle';
      })
      .addCase(transcribeAudio.rejected, (state, action) => {
        state.status = 'idle';
        state.error = typeof action.payload === 'string' ? action.payload : 'Voice transcription failed';
      });
  },
});

export const { resetSpeech } = speechSlice.actions;

/**
 * Selector: the speech status.
 *
 * @param {object} state - Root state slice.
 * @returns {'idle'|'transcribing'} Current status.
 */
export const selectSpeechStatus = (state) => state[speechSlice.name].status;

/**
 * Selector: the last transcription error message.
 *
 * @param {object} state - Root state slice.
 * @returns {string} Error message ('' when clear).
 */
export const selectSpeechError = (state) => state[speechSlice.name].error;