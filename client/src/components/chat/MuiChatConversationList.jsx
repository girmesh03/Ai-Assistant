import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { useChat } from '@mui/x-chat/headless';
import { useConversationActions } from '../../hooks/useConversationActions.js';
import { selectDefaultModelPair } from '../../redux/features/metaSlice.js';
import { openPresetDialog } from '../../redux/features/presetsSlice.js';
import { formatListTimestamp, truncate } from '../../utils/format.js';
import { BRAND_NAME } from '../../utils/constants.js';

/**
 * The conversation sidebar: brand mark, "New chat", the conversation list with
 * per-row delete (gold rule marks the active one), and the presets entry point.
 *
 * @module components/chat/MuiChatConversationList
 */

/**
 * @param {object} props - List props.
 * @param {() => void} [props.onNavigate] - Called after selecting a conversation (mobile drawer close).
 * @returns {import('react').JSX.Element} The sidebar.
 */
export const MuiChatConversationList = ({ onNavigate }) => {
  const { conversations, activeConversationId, setActiveConversation } = useChat();
  const { createChat, deleteChat } = useConversationActions();
  const dispatch = useDispatch();
  const canCreateChat = useSelector(selectDefaultModelPair) !== null;

  /**
   * Selects a conversation.
   *
   * @param {string} id - Conversation id.
   * @returns {void}
   */
  const handleSelect = (id) => {
    void setActiveConversation(id);
    onNavigate?.();
  };

  /**
   * Creates a new conversation.
   *
   * @returns {void}
   */
  const handleNewChat = () => {
    void createChat().then(() => onNavigate?.());
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.25, flex: 1 }}>
          <Typography
            sx={{ fontFamily: 'display', fontSize: '1.25rem', lineHeight: 1, userSelect: 'none' }}
          >
            {BRAND_NAME}
            <Box component="span" sx={{ color: 'warning.main' }}>
              .
            </Box>
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            AI Assistant
          </Typography>
        </Box>
        <Tooltip title="New chat">
          <IconButton size="small" aria-label="New chat" onClick={handleNewChat} disabled={!canCreateChat}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Divider sx={{ borderColor: 'divider' }} />

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1, py: 1 }}>
        {conversations.length === 0 ? (
          <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.disabled', mt: 3, px: 2 }}>
            No conversations yet. Start a new chat or apply a preset.
          </Typography>
        ) : (
          <List disablePadding>
            {conversations.map((conversation) => {
              const active = conversation.id === activeConversationId;
              return (
                <ListItemButton
                  key={conversation.id}
                  selected={active}
                  onClick={() => handleSelect(conversation.id)}
                  sx={{
                    borderRadius: 1.5,
                    mb: 0.25,
                    borderLeft: 3,
                    borderLeftColor: active ? 'warning.main' : 'transparent',
                    color: active ? 'text.primary' : 'text.secondary',
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {conversation.subtitle && <SmartToyIcon sx={{ fontSize: 14, color: 'warning.main' }} />}
                        <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {truncate(conversation.title || 'New chat', 42)}
                        </Box>
                      </Box>
                    }
                    secondary={formatListTimestamp(conversation.lastMessageAt)}
                    slotProps={{
                      primary: { variant: 'body2', component: 'div', fontWeight: active ? 700 : 500 },
                      secondary: { variant: 'caption' },
                    }}
                  />
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      aria-label="Delete conversation"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (window.confirm('Delete this conversation?')) void deleteChat(conversation.id);
                      }}
                      sx={{ ml: 0.5 }}
                    >
                      <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Box>

      <Divider sx={{ borderColor: 'divider' }} />

      <Box sx={{ p: 1 }}>
        <ListItemButton
          onClick={() => dispatch(openPresetDialog())}
          sx={{ borderRadius: 1.5 }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 18, mr: 1, color: 'warning.main' }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Presets
          </Typography>
        </ListItemButton>
      </Box>
    </Box>
  );
};