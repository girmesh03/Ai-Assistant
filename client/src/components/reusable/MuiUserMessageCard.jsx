import { useState } from 'react';
import { Box, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useMessage, useChatActions } from '@mui/x-chat/headless';
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
  const [collapsed, setCollapsed] = useState(true);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, setValue } = useForm({
    defaultValues: { text: '' },
  });

  if (!message) return null;

  const text = partsToText(message.parts.filter((part) => part.type === 'text'));

  /** @type {import('react-hook-form').UseFormRegisterReturn<'text'>} */
  const textFieldProps = register('text');

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
    if (!editedText.trim() || editedText.trim() === text) {
      setEditing(false);
      return;
    }
    chatAdapter.stageEditedText(message.id, editedText);
    void actions.regenerate(message.id).then(() => {
      if (onSaved && message.conversationId) onSaved(message.conversationId);
    });
    setEditing(false);
  };

  const isLong = text.length > 90;

  return (
    <Box
      className="selam-user-msg"
      sx={{
        alignSelf: 'flex-end',
        maxWidth: { xs: '96%', md: '78%' },
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
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          width: '100%',
        }}
      >
        {editing ? (
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmitEdit)}
            noValidate
            sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start' }}
          >
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={1}
              maxRows={4}
              autoFocus
              {...textFieldProps}
              variant="standard"
              slotProps={{
                input: {
                  disableUnderline: true,
                  sx: {
                    color: 'inherit',
                    '& textarea': { color: 'inherit', fontSize: '0.875rem' },
                  },
                },
                htmlInput: { 'aria-label': 'Edit message' },
              }}
            />
            <Tooltip title="Update">
              <Box sx={{ display: 'flex' }}>
                <IconButton size="small" type="submit" aria-label="Update" sx={{ color: 'inherit' }}>
                  <CheckIcon fontSize="small" />
                </IconButton>
              </Box>
            </Tooltip>
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
        {!editing && (
          <Tooltip title="Edit">
            <IconButton size="small" aria-label="Edit" onClick={openEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {isLong && (
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