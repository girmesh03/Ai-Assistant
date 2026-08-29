import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Box, IconButton, TextField, Tooltip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import { useChatComposer } from '@mui/x-chat/headless';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder.js';

/**
 * The ሰላም message composer. Fully controlled through the runtime composer
 * store (`useChatComposer`), with an optional mic/STT entry point and a
 * stop-streaming affordance while a reply is being generated.
 *
 * A ref handle exposes `{ focusInput, replaceContent, clear }`, used by the
 * welcome screen's suggestion chips to fill and focus the box.
 *
 * @module components/reusable/MuiChatComposer
 */

/**
 * Composer imperative handle.
 *
 * @typedef {object} MuiChatComposerHandle
 * @property {() => void} focusInput - Focuses the text area.
 * @property {(text: string) => void} replaceContent - Replaces the draft and focuses.
 * @property {() => void} clear - Clears the draft.
 */

/**
 * @param {object} props - Composer props.
 * @param {() => Promise<boolean>} [props.onRequireConversation] - Invoked before the first send; must guarantee an active conversation.
 * @param {boolean} [props.isStreaming] - Whether a reply is streaming.
 * @param {() => void} [props.onStopStreaming] - Stops the current stream.
 * @param {(audio: Blob) => void} [props.onTranscribe] - Receives recorded audio for STT.
 * @param {boolean} [props.isTranscribing] - Whether voice is being transcribed server-side.
 * @param {string} [props.placeholder] - Textarea placeholder.
 * @param {import('react').Ref<MuiChatComposerHandle>} ref - Forwarded handle.
 * @returns {import('react').JSX.Element} The composer.
 */
export const MuiChatComposer = forwardRef(function MuiChatComposer(
  { onRequireConversation, isStreaming = false, onStopStreaming, onTranscribe, isTranscribing = false, placeholder = 'Send a message…' },
  ref,
) {
  const { value, setValue, submit, isSubmitting } = useChatComposer();
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null));

  const { isRecording, startRecording, stopRecording } = useVoiceRecorder({
    onResult: (audio) => {
      if (onTranscribe) onTranscribe(audio);
    },
  });

  const isBusy = isSubmitting || isRecording;

  useImperativeHandle(
    ref,
    () => ({
      focusInput: () => inputRef.current?.focus(),
      replaceContent: (text) => {
        setValue(text);
        inputRef.current?.focus();
      },
      clear: () => setValue(''),
    }),
    [setValue],
  );

  /**
   * Submits the draft. When no conversation exists yet, waits for the page to
   * create one before sending the message.
   *
   * @returns {Promise<void>}
   */
  const submitDraft = async () => {
    if (isBusy || !value.trim()) return;
    if (onRequireConversation) {
      const ready = await onRequireConversation();
      if (!ready) return;
    }
    await submit();
  };

  /**
   * Handles Enter to send and Shift+Enter for a newline.
   *
   * @param {import('react').KeyboardEvent<HTMLDivElement>} event - Key event.
   * @returns {void}
   */
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitDraft();
    }
  };

  /**
   * Toggles the mic recorder: tap to start, tap again to stop and transcribe.
   *
   * @returns {void}
   */
  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    void startRecording();
  };

  const canSend = Boolean(value.trim()) && !isBusy;

  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        void submitDraft();
      }}
      sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: 1.5, px: { xs: 2, sm: 3 } }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 0.5,
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
          bgcolor: 'background.paper',
          px: 1.5,
          py: 0.5,
          boxShadow: 1,
        }}
      >
        <TextField
          size="small"
          fullWidth
          multiline
          minRows={1}
          maxRows={6}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          variant="standard"
          inputRef={(node) => {
            inputRef.current = /** @type {HTMLInputElement | null} */ (node);
          }}
          slotProps={{
            input: { disableUnderline: true },
            htmlInput: { 'aria-label': 'Message ሰላም', sx: { py: 1 } },
          }}
          sx={{ flex: 1 }}
        />

        {isStreaming ? (
          <Tooltip title="Stop generating">
            <IconButton size="small" aria-label="Stop generating" onClick={onStopStreaming}>
              <StopCircleIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title={isRecording ? 'Stop recording' : 'Talk to ሰላም'}>
            <IconButton
              size="small"
              aria-label={isRecording ? 'Stop recording' : 'Talk to ሰላም'}
              onClick={handleMicClick}
              sx={{ color: isRecording ? 'error.main' : 'text.secondary' }}
            >
              <MicIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title="Send">
          <Box sx={{ display: 'flex' }}>
            <IconButton
              size="small"
              aria-label="Send"
              color="primary"
              disabled={!canSend}
              onClick={() => void submitDraft()}
              sx={{
                bgcolor: canSend ? 'primary.main' : 'transparent',
                color: canSend ? 'primary.contrastText' : 'text.disabled',
                '&:hover': canSend ? { bgcolor: 'primary.dark' } : {},
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Tooltip>
      </Box>

      {isTranscribing && (
        <Box sx={{ typography: 'caption', color: 'text.secondary', textAlign: 'center' }}>
          Transcribing your voice…
        </Box>
      )}
    </Box>
  );
});