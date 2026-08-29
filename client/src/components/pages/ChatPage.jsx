import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppBar,
  Box,
  Chip,
  Drawer,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { ChatProvider, useChat } from "@mui/x-chat/headless";
import { chatAdapter } from "../../adapters/chatAdapter.js";
import { useChatReload } from "../../hooks/useChatReload.js";
import { useConversationActions } from "../../hooks/useConversationActions.js";
import {
  transcribeAudio,
  selectSpeechStatus,
} from "../../redux/features/speechSlice.js";
import {
  openPresetDialog,
  useListPresetsQuery,
} from "../../redux/features/presetsSlice.js";
import { selectDefaultModelPair } from "../../redux/features/metaSlice.js";
import { BRAND_NAME } from "../../utils/constants.js";
import { formatTime, truncate } from "../../utils/format.js";
import { MuiChatConversationList } from "../reusable/MuiChatConversationList.jsx";
import { MuiChatComposer } from "../reusable/MuiChatComposer.jsx";
import { MuiChatSurface } from "../reusable/MuiChatSurface.jsx";
import { MuiEmptyState } from "../reusable/MuiEmptyState.jsx";
import { MuiLanguagePill } from "../reusable/MuiLanguagePill.jsx";
import { MuiModelSelector } from "../reusable/MuiModelSelector.jsx";
import { MuiPresetDialog } from "../reusable/MuiPresetDialog.jsx";
import { MuiReasoningSelector } from "../reusable/MuiReasoningSelector.jsx";

/**
 * The ሰላም chat page: runtime-wrapped workspace that composes the sidebar,
 * thread (header, virtualized message list, composer) and welcome/empty states.
 *
 * @module components/pages/ChatPage
 */

/**
 * The runtime provider wrapper for the page, starting the chat store.
 *
 * @returns {import('react').JSX.Element} The wrapped page.
 */
export const ChatPage = () => (
  <ChatProvider
    adapter={chatAdapter}
    currentUser={{ id: "local", displayName: "You", role: "user" }}
    members={[{ id: "assistant", displayName: "ሰላም", role: "assistant" }]}
  >
    <ChatPageInner />
  </ChatProvider>
);

/** The actual page content, rendered inside the ChatProvider. */
const ChatPageInner = () => {
  const chat = useChat();
  const conversationActions = useConversationActions();
  const { reloadConversations, reloadMessages } = useChatReload();
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const composerRef = useRef(
    /** @type {import('../reusable/MuiChatComposer.jsx').MuiChatComposerHandle | null} */ (
      null
    ),
  );
  const pendingReloadRef = useRef(false);

  const activeConversation =
    chat.conversations.find(
      (conversation) => conversation.id === chat.activeConversationId,
    ) ?? null;
  const metadata = activeConversation?.metadata ?? null;

  const { data: presets = [] } = useListPresetsQuery();
  const activePreset =
    presets.find((preset) => preset._id === metadata?.presetId) ?? null;
  const canCreateChat = useSelector(selectDefaultModelPair) !== null;
  const isTranscribing = useSelector(selectSpeechStatus) === "transcribing";

  /**
   * Guarantees an active conversation exists before a send.
   *
   * @returns {Promise<boolean>} True when ready to send.
   */
  const requireConversation = useCallback(async () => {
    if (chat.activeConversationId) return true;
    const created = await conversationActions.createChat();
    return Boolean(created);
  }, [chat.activeConversationId, conversationActions]);

  /**
   * Sends a suggested welcome prompt (creating a conversation when needed).
   *
   * @param {string} text - The prompt text.
   * @returns {Promise<void>}
   */
  const handlePickPrompt = async (text) => {
    if (!(await requireConversation())) return;
    await chat.sendMessage({ parts: [{ type: "text", text }] });
  };

  /**
   * Persists a conversation field change (model/reasoning) + refreshes the list.
   *
   * @param {object} patch - Conversation fields to patch.
   * @returns {Promise<void>}
   */
  const updateConversation = async (patch) => {
    if (!chat.activeConversationId) return;
    try {
      await chatAdapter.updateConversation(chat.activeConversationId, patch);
      await reloadConversations();
    } catch (error) {
      toast.error(error?.message ?? "Could not save the change.");
    }
  };

  /**
   * Applies a preset (dialog flow).
   *
   * @param {import('../../redux/features/presetsSlice.js').Preset} preset - The preset to apply.
   * @returns {Promise<void>}
   */
  const handleApplyPreset = async (preset) => {
    await conversationActions.applyPreset(preset);
  };

  /**
   * Marks that an edited message was regenerated, so the store re-syncs from
   * the backend once the new reply finishes streaming.
   *
   * @returns {void}
   */
  const handleEdited = useCallback(() => {
    pendingReloadRef.current = true;
  }, []);

  const messages = chat.messages;
  const activeConversationId = chat.activeConversationId;

  useEffect(() => {
    if (!pendingReloadRef.current || messages.length === 0) return;
    const last = messages[messages.length - 1];
    const busy = last.parts.some((part) => part.state === "streaming");
    if (busy) return;
    pendingReloadRef.current = false;
    const conversationId = last.conversationId ?? activeConversationId;
    if (!conversationId) return;
    void reloadMessages(conversationId).then(() => reloadConversations());
  }, [messages, activeConversationId, reloadMessages, reloadConversations]);

  /**
   * Transcribes recorded voice and drops the text into the composer.
   *
   * @param {Blob} audio - Recorded blob.
   * @returns {void}
   */
  const handleTranscribe = (audio) => {
    const language = metadata?.language ?? "en";
    void dispatch(transcribeAudio({ audio, language }))
      .unwrap()
      .then((text) => {
        console.info("[stt] transcript:", text);
        if (!text) {
          toast.error("No speech detected. Please try again.");
          return;
        }
        composerRef.current?.replaceContent(text);
      })
      .catch((message) => {
        toast.error(
          typeof message === "string"
            ? message
            : "Could not transcribe the audio.",
        );
      });
  };

  /**
   * Deletes the active conversation (with confirmation).
   *
   * @returns {void}
   */
  const handleDeleteActive = () => {
    if (!chat.activeConversationId) return;
    if (!window.confirm("Delete this conversation?")) return;
    void conversationActions.deleteChat(chat.activeConversationId);
  };

  /**
   * Parses a model-selector value into provider + model ids.
   *
   * @param {string} encoded - `${provider}/${model}` value from the selector.
   * @returns {void}
   */
  const handleModelChange = (encoded) => {
    const [modelProviderId, modelId] = encoded.split("/");
    if (modelProviderId && modelId)
      void updateConversation({ modelProviderId, modelId });
  };

  const sidebar = (
    <MuiChatConversationList onNavigate={() => setDrawerOpen(false)} />
  );

  return (
    <Box
      sx={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      {isMobile && (
        <AppBar
          position="static"
          color="transparent"
          elevation={0}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Toolbar variant="dense" sx={{ gap: 1 }}>
            <IconButton
              size="small"
              edge="start"
              aria-label="Open navigation"
              onClick={() => setDrawerOpen(true)}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
            <Typography
              sx={{
                fontFamily: "display",
                fontSize: "1.15rem",
                flex: 1,
                userSelect: "none",
              }}
            >
              {BRAND_NAME}
              <Box component="span" sx={{ color: "warning.main" }}>
                .
              </Box>
            </Typography>
            <Tooltip title="New chat">
              <IconButton
                size="small"
                aria-label="New chat"
                onClick={() => void conversationActions.createChat()}
                disabled={!canCreateChat}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
      )}

      <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
        {!isMobile && (
          <Box
            sx={{
              width: 280,
              flexShrink: 0,
              bgcolor: "background.paper",
              borderRight: 1,
              borderColor: "divider",
            }}
          >
            {sidebar}
          </Box>
        )}

        {isMobile && (
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            sx={{ "& .MuiDrawer-paper": { width: 300 } }}
          >
            {sidebar}
          </Drawer>
        )}

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {activeConversation && (
            <Box
              sx={{
                px: 2.5,
                py: 1,
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                flexWrap: "wrap",
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="subtitle1"
                  noWrap
                  sx={{ fontWeight: 700, lineHeight: 1.25 }}
                >
                  {truncate(activeConversation.title || "New chat", 48)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {formatTime(activeConversation.lastMessageAt)}
                </Typography>
              </Box>

              <MuiLanguagePill language={metadata?.language} />

              <MuiReasoningSelector
                value={metadata?.reasoningEffort ?? "off"}
                onChange={(value) =>
                  void updateConversation({ reasoningEffort: value })
                }
              />

              <MuiModelSelector
                providerId={metadata?.modelProviderId}
                modelId={metadata?.modelId}
                onChange={handleModelChange}
              />

              {activePreset ? (
                <Tooltip title="Remove preset">
                  <Chip
                    size="small"
                    icon={<AutoAwesomeIcon />}
                    label={activePreset.name}
                    onDelete={() =>
                      void conversationActions.removePresetFromActive()
                    }
                    color="warning"
                    variant="outlined"
                    sx={{ typography: "caption", fontWeight: 600 }}
                  />
                </Tooltip>
              ) : (
                <Tooltip title="Apply a preset">
                  <IconButton
                    size="small"
                    aria-label="Apply a preset"
                    onClick={() => dispatch(openPresetDialog())}
                  >
                    <AutoAwesomeIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title="Delete conversation">
                <IconButton
                  size="small"
                  aria-label="Delete conversation"
                  onClick={handleDeleteActive}
                >
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {chat.activeConversationId ? (
              <MuiChatSurface onEdited={handleEdited} />
            ) : (
              <MuiEmptyState
                onPickPrompt={(text) => void handlePickPrompt(text)}
              />
            )}
          </Box>

          <MuiChatComposer
            ref={composerRef}
            onRequireConversation={requireConversation}
            isStreaming={chat.isStreaming}
            onStopStreaming={chat.stopStreaming}
            onTranscribe={handleTranscribe}
            isTranscribing={isTranscribing}
          />
        </Box>
      </Box>

      <MuiPresetDialog onApply={handleApplyPreset} />
    </Box>
  );
};
