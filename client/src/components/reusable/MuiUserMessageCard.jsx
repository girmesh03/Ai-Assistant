import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useMessage, useChatActions, useChatStore } from '@mui/x-chat/headless';
import { partsToText, formatTime } from '../../utils/format.js';
import { chatAdapter } from '../../adapters/chatAdapter.js';

/**
 * A collapsible user request card. Shows the prompt with Copy + Edit actions;
 * the Edit icon swaps to Update, opening an inline textarea driven by
 * react-hook-form so the user can rewrite the request before it is resent
 * (truncate-at-turn + regenerate in place).
 *
 * @module components/reusable/MuiUserMessageCard
 */

/**
 * @param {object} props - Card props.
 * @param {string} props.messageId - Message id from the chat store.
 * @param {(conversationId: string) => void} [props.onSaved] - Invoked after an edited request is regenerated.
 * @returns {import('react').JSX.Element} The user card.
 */
export const MuiUserMessageCard = ({ messageId, onSaved }) => {
  const message = useMessage(messageId);
  const actions = useChatActions();
  const store = useChatStore();
  const [collapsed, setCollapsed] = useState(true);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { register, handleSubmit, setValue } = useForm({
    defaultValues: { text: '' },
  });

  /** Ref to the inline edit textarea, so edit mode can focus it without relying on `autoFocus` (which fights the virtualized list's scroll on mount). */
  const editInputRef = useRef(null);

  useEffect(() => {
    if (!editing) return undefined;
    const frame = window.requestAnimationFrame(() => editInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [editing]);

  if (!message) return null;

  const text = partsToText(message.parts.filter((part) => part.type === 'text'));

  /** @type {import('react-hook-form').UseFormRegisterReturn<'text'>} */
  const textFieldProps = register('text', {
    onChange: () => setDirty(true),
  });

  /**
   * Routes the mouse wheel to the edit textarea so it scrolls on its own while
   * it has overflow. At its top/bottom boundary the event is left untouched so
   * the message list scrolls instead.
   *
   * @param {import('react').WheelEvent<HTMLTextAreaElement>} event - Wheel event.
   * @returns {void}
   */
  const handleEditWheel = (event) => {
    const el = event.currentTarget;
    if (el.scrollHeight <= el.clientHeight) return;
    const atTop = el.scrollTop <= 0;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    if ((atTop && event.deltaY < 0) || (atBottom && event.deltaY > 0)) return;
    event.preventDefault();
    el.scrollTop += event.deltaY;
  };

  /**
   * Copies the request text to the clipboard.
   *
   * @returns {void}
   */
  const handleCopy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.info('Copied to clipboard');
    });
  };

  /**
   * Opens inline editing, prefilling the textarea with the current request.
   *
   * @returns {void}
   */
  const openEdit = () => {
    setValue('text', text);
    setCollapsed(false);
    setEditing(true);
    setDirty(false);
  };

  /**
   * Sends the edited request. The adapter carries the staged text into the
   * regenerate call (`/api/chat/regenerate` with `content`), and the runtime
   * rebuilds the assistant reply from this user turn.
   *
   * @param {{ text: string }} values - RHF form values.
   * @returns {void}
   */
  const onSubmitEdit = ({ text: editedText }) => {
    const trimmed = editedText.trim();
    if (!trimmed || trimmed === text) {
      setEditing(false);
      return;
    }
    if (store.state.isStreaming) return;
    chatAdapter.stageEditedText(message.id, trimmed);

    const ids = store.state.messageIds;
    const anchorIndex = ids.indexOf(message.id);
    if (anchorIndex !== -1) {
      const updated = ids.slice(0, anchorIndex + 1).map((id) => store.state.messagesById[id]);
      updated[updated.length - 1] = { ...updated[updated.length - 1], parts: [{ type: 'text', text: trimmed }] };
      store.setMessages(updated);
    }
    const truncatedLength = store.state.messageIds.length;

    void actions.regenerate(message.id).then(() => {
      const streamed = store.state.messageIds.length > truncatedLength;
      if (streamed && onSaved && message.conversationId) onSaved(message.conversationId);
    });
    setEditing(false);
  };

  const isLong = text.length > 90;

  return (
    <Box
      className="selam-user-msg"
      sx={{
        maxWidth: { xs: '96%', md: '78%' },
        width: editing ? '100%' : undefined,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 0.25,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          borderRadius: 2,
          borderTopRightRadius: 2,
          p: 1.25,
          bgcolor: 'background.paper',
          color: 'text.primary',
          border: 1,
          borderColor: 'divider',
          width: '100%',
        }}
      >
        {editing ? (
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmitEdit)}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}
          >
            <TextField
              size="small"
              fullWidth
              multiline
              inputRef={editInputRef}
              {...textFieldProps}
              variant="standard"
              slotProps={{
                input: {
                  disableUnderline: true,
                  sx: {
                    color: 'inherit',
                    '& textarea': {
                      color: 'inherit',
                      fontSize: '0.875rem',
                      maxHeight: 400,
                      overflowY: 'auto',
                      scrollbarWidth: 'none',
                      '&::-webkit-scrollbar': { display: 'none' },
                    },
                  },
                },
                htmlInput: { 'aria-label': 'Edit message', onWheel: handleEditWheel },
              }}
            />
          </Box>
        ) : (
          <Typography
            component="div"
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: collapsed && isLong ? 2 : 'unset',
              WebkitBoxOrient: 'vertical',
            }}
          >
            {text}
          </Typography>
        )}
      </Box>

      <Box className="selam-user-msg-actions" sx={{ display: 'flex', gap: 0.25, alignItems: 'center', opacity: 0, transition: 'opacity 0.15s ease' }}>
        <Tooltip title="Copy">
          <IconButton size="small" aria-label="Copy" onClick={handleCopy}>
            {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        {editing ? (
          <Tooltip title="Update">
            <IconButton size="small" aria-label="Update" onClick={handleSubmit(onSubmitEdit)} disabled={!dirty}>
              <CheckIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Edit">
            <IconButton size="small" aria-label="Edit" onClick={openEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {isLong && !editing && (
          <Tooltip title={collapsed ? 'Expand' : 'Collapse'}>
            <IconButton size="small" aria-label={collapsed ? 'Expand' : 'Collapse'} onClick={() => setCollapsed((v) => !v)}>
              {collapsed ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowUpIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
        {message.createdAt && (
          <Typography component="span" variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', ml: 0.5 }}>
            {formatTime(message.createdAt)}
          </Typography>
        )}
      </Box>
    </Box>
  );
};