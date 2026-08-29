import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_RECORDING_MS } from '../utils/constants.js';

/**
 * Browser mic recorder for the ሰላም composer mic button. Uses the MediaRecorder
 * API, auto-stops at {@link MAX_RECORDING_MS}, and hands the finished audio blob
 * to `onResult` (which the page wires to the speech slice / STT endpoint).
 *
 * @module hooks/useVoiceRecorder
 */

/**
 * Recorder lifecycle status.
 *
 * @typedef {'idle'|'recording'|'denied'|'unavailable'|'error'} VoiceStatus
 */

/**
 * Resolves the first recorded blob's MIME type, or falls back to `audio/webm`.
 *
 * @returns {string} A MediaRecorder-safe MIME type.
 */
const resolveMimeType = () => {
  if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')) {
    return 'audio/webm';
  }
  return 'audio/mp4';
};

/**
 * @param {{ onResult: (audio: Blob) => void }} options - Result callback.
 * @returns {{ status: VoiceStatus, isRecording: boolean, startRecording: () => Promise<void>, stopRecording: () => void }} Recorder API.
 */
export const useVoiceRecorder = ({ onResult }) => {
  const [status, setStatus] = useState(/** @type {VoiceStatus} */ ('idle'));
  const recorderRef = useRef(/** @type {MediaRecorder|null} */ (null));
  const streamRef = useRef(/** @type {MediaStream|null} */ (null));
  const chunksRef = useRef(/** @type {Blob[]} */ ([]));
  const timerRef = useRef(/** @type {number|null} */ (null));

  const cleanupTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.requestData?.();
      recorder.stop();
    }
  }, []);

  const cancelTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelTimer();
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      recorderRef.current = null;
      cleanupTracks();
    };
  }, [cancelTimer]);

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setStatus('unavailable');
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      const name = error?.name;
      setStatus(name === 'NotAllowedError' ? 'denied' : name === 'NotFoundError' ? 'unavailable' : 'error');
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: resolveMimeType() });
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      cleanupTracks();
      const blob = new Blob(chunksRef.current, { type: resolveMimeType() });
      chunksRef.current = [];
      setStatus('idle');
      if (blob.size > 0) {
        onResult(blob);
      } else {
        setStatus('error');
      }
    };

    recorder.onerror = () => {
      cleanupTracks();
      setStatus('error');
    };

    try {
      recorder.start();
      setStatus('recording');
      timerRef.current = window.setTimeout(() => stopRecording(), MAX_RECORDING_MS);
    } catch {
      cleanupTracks();
      setStatus('error');
    }
  }, [onResult, stopRecording]);

  return {
    status,
    isRecording: status === 'recording',
    startRecording,
    stopRecording,
  };
};