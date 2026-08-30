import { useCallback, useRef, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { ChatProvider, useChat } from "@mui/x-chat/headless";
import { chatAdapter } from "../adapters/chatAdapter.js";
import { useChatReload } from "../hooks/useChatReload.js";
import { useConversationActions } from "../hooks/useConversationActions.js";
import {
  transcribeAudio,
  selectSpeechStatus,
} from "../redux/features/speechSlice.js";
import {
  openPresetDialog,
  useListPresetsQuery,
} from "../redux/features/presetsSlice.js";
import {
  selectDefaultModelPair,
  selectModelInfo,
} from "../redux/features/metaSlice.js";
import { selectSettings, updateSettings } from "../redux/features/settingsSlice.js";
import { BRAND_NAME, languagesForModel } from "../utils/constants.js";
import { formatTime, truncate } from "../utils/format.js";
import { MuiChatConversationList } from "../components/chat/MuiChatConversationList.jsx";
import { MuiChatComposer } from "../components/chat/MuiChatComposer.jsx";
import { MuiChatSurface } from "../components/chat/MuiChatSurface.jsx";
import { MuiEmptyState } from "../components/chat/MuiEmptyState.jsx";
import { MuiLanguageSelector } from "../components/chat/MuiLanguageSelector.jsx";
import { MuiModelSelector } from "../components/chat/MuiModelSelector.jsx";
import { MuiPresetDialog } from "../components/chat/MuiPresetDialog.jsx";
import { MuiReasoningSelector } from "../components/chat/MuiReasoningSelector.jsx";

/**
 * The ሰላም chat page: runtime-wrapped workspace that composes the sidebar,
 * thread (header, virtualized message list, composer) and welcome/empty states.
 *
 * The conversation settings (language, reasoning, model, preset) are always
 * visible — on the desktop header row or the mobile AppBar — so the user can
 * pick them before the first chat. When no conversation is active the pickers
 * reflect the pre-chat `settings` slice; once a conversation exists they
 * reflect that conversation's metadata and every change writes through to it.
 *
 * @module pages/ChatPage
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
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const composerRef = useRef(
    /** @type {import('../components/chat/MuiChatComposer.jsx').MuiChatComposerHandle | null} */ (
      null
    ),
  );

  const activeConversation =
    chat.conversations.find(
      (conversation) => conversation.id === chat.activeConversationId,
    ) ?? null;
  const metadata = activeConversation?.metadata ?? null;

  const settings = useSelector(selectSettings);
  const { data: presets = [] } = useListPresetsQuery();
  const activePreset =
    presets.find((preset) => preset._id === metadata?.presetId) ?? null;
  const canCreateChat = useSelector(selectDefaultModelPair) !== null;
  const isTranscribing = useSelector(selectSpeechStatus) === "transcribing";

  const displayProviderId = activeConversation
    ? metadata?.modelProviderId
    : settings.modelProviderId;
  const displayModelId = activeConversation ? metadata?.modelId : settings.modelId;
  const modelInfo = useSelector((root) =>
    selectModelInfo(root, { providerId: displayProviderId, modelId: displayModelId }),
  );
  const supportsReasoning = modelInfo?.reasoning === true;
  const languageOptions = languagesForModel(modelInfo?.id ?? displayModelId);
  const currentLanguage = activeConversation
    ? metadata?.language ?? "en"
    : settings.language ?? "en";

  /** The Add button only appears once at least one conversation exists. */
  const showAddIcon = canCreateChat && chat.conversations.length > 0;

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
   * Persists a conversation field change (model/reasoning/language) + refreshes
   * the list.
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
   * Persists a language change: updates the pre-chat settings and, when a
   * conversation is active, PATCHes it.
   *
   * @param {string} language - The new language code.
   * @returns {void}
   */
  const handleLanguageChange = (language) => {
    dispatch(updateSettings({ language }));
    if (chat.activeConversationId) {
      void updateConversation({ language });
    }
  };

  /**
   * Persists a reasoning change: updates the pre-chat settings and, when a
   * conversation is active, PATCHes it.
   *
   * @param {string} value - The new reasoning effort.
   * @returns {void}
   */
  const handleReasoningChange = (value) => {
    dispatch(updateSettings({ reasoningEffort: value }));
    if (chat.activeConversationId) {
      void updateConversation({ reasoningEffort: value });
    }
  };

  /**
   * Parses a model-selector value into provider + model ids. Updates the
   * pre-chat settings; if the current language is not supported by the new
   * model it falls back to `en`; when a conversation is active, PATCHes it.
   *
   * @param {string} encoded - `${provider}/${model}` value from the selector.
   * @returns {void}
   */
  const handleModelChange = (encoded) => {
    const [modelProviderId, modelId] = encoded.split("/");
    if (!modelProviderId || !modelId) return;
    dispatch(updateSettings({ modelProviderId, modelId }));

    const patch = /** @type {{ modelProviderId: string, modelId: string, language?: string }} */ ({
      modelProviderId,
      modelId,
    });
    const activeLanguage = activeConversation ? metadata?.language : settings.language;
    if (activeLanguage && !languagesForModel(modelId).includes(activeLanguage)) {
      patch.language = "en";
      dispatch(updateSettings({ language: "en" }));
    }
    if (chat.activeConversationId) {
      void updateConversation(patch);
    }
  };

  /**
   * Runs after an Edit or Retry finishes regenerating: the reply is in the
   * store (or streaming finished), so re-sync the thread and conversation list
   * from the backend, which owns the authoritative truncate-below result.
   *
   * @param {string} [conversationId] - The conversation that changed.
   * @returns {void}
   */
  const handleEdited = useCallback(
    (conversationId) => {
      void reloadMessages(conversationId ?? chat.activeConversationId).then(() => reloadConversations());
    },
    [chat.activeConversationId, reloadMessages, reloadConversations],
  );

  /**
   * Transcribes recorded voice and drops the text into the composer. Uses the
   * active conversation's language, or the pre-chat settings before any
   * conversation exists.
   *
   * @param {Blob} audio - Recorded blob.
   * @returns {void}
   */
  const handleTranscribe = (audio) => {
    const language = activeConversation
      ? metadata?.language ?? "en"
      : settings.language ?? "en";
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

  const sidebar = (
    <MuiChatConversationList onNavigate={() => setDrawerOpen(false)} />
  );

  const desktopControls = (
    <>
      <MuiLanguageSelector
        value={currentLanguage}
        options={languageOptions}
        onChange={handleLanguageChange}
      />

      {supportsReasoning && (
        <MuiReasoningSelector
          value={metadata?.reasoningEffort ?? settings.reasoningEffort ?? "off"}
          onChange={handleReasoningChange}
        />
      )}

      <MuiModelSelector
        providerId={displayProviderId}
        modelId={displayModelId}
        onChange={handleModelChange}
      />

      {activeConversation && activePreset ? (
        <Tooltip title="Remove preset" placement="top">
          <Chip
            size="small"
            icon={<AutoAwesomeIcon />}
            label={activePreset.name}
            onDelete={() => void conversationActions.removePresetFromActive()}
            color="warning"
            variant="outlined"
            sx={{ typography: "caption", fontWeight: 600 }}
          />
        </Tooltip>
      ) : (
        <Tooltip title="Apply a preset" placement="top">
          <IconButton
            size="small"
            aria-label="Apply a preset"
            onClick={() => dispatch(openPresetDialog())}
          >
            <AutoAwesomeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {activeConversation && (
        <Tooltip title="Delete conversation" placement="top">
          <IconButton
            size="small"
            aria-label="Delete conversation"
            onClick={handleDeleteActive}
          >
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </>
  );

  const mobileControls = (
    <>
      <MuiLanguageSelector
        value={currentLanguage}
        options={languageOptions}
        onChange={handleLanguageChange}
        compact={isXs}
        slim={!isXs}
      />

      {supportsReasoning && (
        <MuiReasoningSelector
          value={metadata?.reasoningEffort ?? settings.reasoningEffort ?? "off"}
          onChange={handleReasoningChange}
          compact={isXs}
          slim={!isXs}
        />
      )}

      <MuiModelSelector
        providerId={displayProviderId}
        modelId={displayModelId}
        onChange={handleModelChange}
        compact={isXs}
        slim={!isXs}
      />

      <Tooltip title="Apply a preset" placement="top">
        <IconButton
          size="small"
          aria-label="Apply a preset"
          onClick={() => dispatch(openPresetDialog())}
          sx={{ color: "text.secondary" }}
        >
          <AutoAwesomeIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </>
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
          <Toolbar variant="dense" sx={{ gap: 1, px: 1.5 }}>
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
                minWidth: 0,
                userSelect: "none",
              }}
            >
              {BRAND_NAME}
              <Box component="span" sx={{ color: "warning.main" }}>
                .
              </Box>
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
              {mobileControls}
            </Box>
            {showAddIcon && (
              <Tooltip title="New chat" placement="top">
                <IconButton
                  size="small"
                  aria-label="New chat"
                  onClick={() => void conversationActions.createChat()}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
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
          {!isMobile && (
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
              {activeConversation && (
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
              )}

              <Box
                sx={{
                  ml: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                }}
              >
                {desktopControls}
              </Box>
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