import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { useChat, useMessage, useMessageIds, useStreamingIndicatorVisibility, MessageList } from '@mui/x-chat/headless';
import { ChatStreamingIndicator, ChatScrollToBottomAffordance } from '@mui/x-chat/ChatIndicators';
import { MuiAssistantMessageCard } from './MuiAssistantMessageCard.jsx';
import { MuiUserMessageCard } from './MuiUserMessageCard.jsx';

/**
 * The thread scroll region: a virtualized message list (auto-scroll + history
 * pagination handled by `MessageList.Root`), topped by a dismissible error
 * banner and a history-loading spinner while older messages are fetched.
 *
 * @module components/chat/MuiChatSurface
 */

/**
 * @param {object} props - Surface props.
 * @param {(conversationId: string) => void} [props.onEdited] - Fired after a user message is edited and regenerated.
 * @returns {import('react').JSX.Element} The thread surface.
 */
export const MuiChatSurface = ({ onEdited }) => {
  const { messages, error, isLoadingHistory, setError } = useChat();
  const messageIds = useMessageIds();
  const { waiting } = useStreamingIndicatorVisibility('auto');

  /**
   * Renders a single message row, branching on role.
   *
   * @param {{ id: string, index: number }} params - MessageList render params.
   * @returns {import('react').JSX.Element} The row.
   */
  const renderItem = ({ id }) => <MessageRow key={id} id={id} onEdited={onEdited} />;

  const isEmpty = messages.length === 0;

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {error && (
        <Box sx={{ px: 2, pt: 1 }}>
          <Alert
            severity="error"
            action={
              <Tooltip title="Dismiss">
                <IconButton size="small" aria-label="Dismiss error" onClick={() => setError(null)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            {error?.message ?? 'Something went wrong.'}
          </Alert>
        </Box>
      )}

      {isLoadingHistory && (
        <Box
          sx={{
            position: 'absolute',
            top: error ? 56 : 8,
            left: 0,
            right: 0,
            zIndex: 1,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={20} thickness={5} />
        </Box>
      )}

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {isEmpty ? (
          <Box sx={{ flex: 1, minHeight: 0, display: 'grid', placeItems: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', px: 3, textAlign: 'center' }}>
              This conversation has no messages yet. Send a message, or pick a suggestion above.
            </Typography>
          </Box>
        ) : (
          <>
            <MessageList.Root
              items={messageIds}
              renderItem={renderItem}
              autoScroll
              enableRovingFocus={false}
              overlay={<ChatScrollToBottomAffordance />}
              slotProps={{
                messageList: { className: 'selam-thread', style: { flex: 1, minHeight: 0 } },
                messageListContent: { style: { padding: '12px 16px 8px' } },
              }}
            />
            {waiting && <StreamingWaitingRow />}
          </>
        )}
      </Box>
    </Box>
  );
};

/**
 * A single message row: hover reveals the row's action bar for both roles.
 *
 * @param {object} props - Row props.
 * @param {string} props.id - Message id.
 * @param {(conversationId: string) => void} [props.onEdited] - Edit-regenerate callback.
 * @returns {import('react').JSX.Element} The row.
 */
const MessageRow = ({ id, onEdited }) => {
  const message = useMessage(id);
  if (!message) return null;

  const isUser = message.role === 'user';

  return (
    <Box
      sx={{
        mb: 1.5,
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        '&:hover .selam-msg-actions, &:hover .selam-user-msg-actions, &:focus-within .selam-msg-actions, &:focus-within .selam-user-msg-actions':
          { opacity: 1 },
      }}
    >
      {isUser ? <MuiUserMessageCard messageId={id} onSaved={onEdited} /> : <MuiAssistantMessageCard messageId={id} onSaved={onEdited} />}
    </Box>
  );
};

/**
 * The trailing "waiting" row shown by MUI X Chat while a response is in flight
 * and no assistant message is streaming yet. Rendered below the message list,
 * left-aligned like an assistant bubble.
 *
 * @returns {import('react').JSX.Element} The waiting bubble.
 */
const StreamingWaitingRow = () => (
  <Box className="selam-waiting" sx={{ px: 2, pb: 1.5, display: 'flex', justifyContent: 'flex-start' }}>
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        borderRadius: 2,
        borderTopLeftRadius: 2,
        px: 1.5,
        py: 1,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
        ሰላም
      </Typography>
      <ChatStreamingIndicator />
    </Box>
  </Box>
);