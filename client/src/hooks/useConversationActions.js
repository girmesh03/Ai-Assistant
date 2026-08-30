import { useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useChat } from '@mui/x-chat/headless';
import { chatAdapter } from '../adapters/chatAdapter.js';
import { useChatReload } from './useChatReload.js';
import { useGetModelsQuery } from '../redux/features/metaSlice.js';
import { selectSettings } from '../redux/features/settingsSlice.js';
import { useSelector } from 'react-redux';

/**
 * Conversation lifecycle actions shared by the sidebar, header, and preset
 * dialog. Everything routes through the MUI X Chat runtime so the store stays
 * the single source of truth for conversations.
 *
 * MUST be used inside a `ChatProvider`.
 *
 * @module hooks/useConversationActions
 */

/**
 * Resolves the provider/model to use for a new conversation: the preset pins it
 * when present, otherwise the pre-chat settings pick, otherwise the catalog
 * default. Returns null when nothing is resolvable yet.
 *
 * @param {object|null} preset - Optional preset with `modelProviderId`/`modelId`.
 * @param {{ providerId: string|null, modelId: string|null }} settings - Pre-chat settings pair.
 * @param {{ providerId: string, modelId: string } | null} defaults - Catalog defaults.
 * @returns {{ providerId: string, modelId: string } | null} The pair to use.
 */
const resolveModelPair = (preset, settings, defaults) => {
  if (preset?.modelProviderId && preset?.modelId) {
    return { providerId: preset.modelProviderId, modelId: preset.modelId };
  }
  if (settings.modelProviderId && settings.modelId) {
    return { providerId: settings.modelProviderId, modelId: settings.modelId };
  }
  if (!defaults) {
    return null;
  }
  return { providerId: defaults.providerId, modelId: defaults.modelId };
};

/**
 * Describes why no model pair is available yet, based on the catalog query
 * state. The user only ever sees this while creating/applying a conversation
 * before the catalog finishes loading (or fails to).
 *
 * @param {boolean} isLoading - Catalog query in flight.
 * @param {boolean} isError - Catalog query failed.
 * @returns {string} The toast message to show.
 */
const modelsUnavailableMessage = (isLoading, isError) => {
  if (isLoading) return 'Models are still loading. Try again in a moment.';
  if (isError) return 'Could not load the available models.';
  return 'No AI models are available.';
};

/**
 * @returns {{ createChat: () => Promise<object|null>, deleteChat: (id: string) => Promise<void>, applyPreset: (preset: object) => Promise<void>, removePresetFromActive: () => Promise<void> }} Conversation actions.
 */
export const useConversationActions = () => {
  const { activeConversationId, setActiveConversation } = useChat();
  const { reloadConversations } = useChatReload();
  const { data: models = [], isLoading, isError } = useGetModelsQuery();
  const settings = useSelector(selectSettings);
  const defaults = useMemo(
    () => (models.length > 0 ? { providerId: models[0].providerId, modelId: models[0].id } : null),
    [models],
  );

  /**
   * Creates a fresh conversation seeded with the pre-chat settings (language,
   * reasoning effort, model) and navigates to it.
   *
   * @returns {Promise<object|null>} The created conversation, or null on failure.
   */
  const createChat = useCallback(async () => {
    const pair = resolveModelPair(null, settings, defaults);
    if (!pair) {
      toast.error(modelsUnavailableMessage(isLoading, isError));
      return null;
    }
    try {
      const conversation = await chatAdapter.createConversation({
        modelProviderId: pair.providerId,
        modelId: pair.modelId,
        reasoningEffort: settings.reasoningEffort ?? 'off',
        language: settings.language ?? 'en',
      });
      await setActiveConversation(conversation.id);
      await reloadConversations();
      return conversation;
    } catch (error) {
      toast.error(error?.message ?? 'Could not start a new chat.');
      return null;
    }
  }, [settings, defaults, isLoading, isError, reloadConversations, setActiveConversation]);

  /**
   * Deletes a conversation and returns to the empty state when it was active.
   *
   * @param {string} id - Conversation id.
   * @returns {Promise<void>}
   */
  const deleteChat = useCallback(
    async (id) => {
      try {
        if (activeConversationId === id) {
          await setActiveConversation(undefined);
        }
        await chatAdapter.deleteConversation(id);
        await reloadConversations();
        toast.success('Conversation deleted');
      } catch (error) {
        toast.error(error?.message ?? 'Could not delete the conversation.');
      }
    },
    [activeConversationId, reloadConversations, setActiveConversation],
  );

  /**
   * Applies a preset to the active conversation (PATCH) or, when none is
   * active, creates a new conversation seeded with the preset and navigates to
   * it. Provider/model/reasoning are only copied when the preset pins them.
   *
   * @param {object} preset - The preset to apply.
   * @returns {Promise<void>}
   */
  const applyPreset = useCallback(
    async (preset) => {
      const pair = resolveModelPair(preset, settings, defaults);
      if (!pair) {
        toast.error(modelsUnavailableMessage(isLoading, isError));
        return;
      }

      const fields = {
        systemPrompt: preset.prompt,
        persona: preset.persona ?? '',
        presetId: preset._id,
      };
      if (preset.modelProviderId) fields.modelProviderId = preset.modelProviderId;
      if (preset.modelId) fields.modelId = preset.modelId;
      if (preset.reasoningEffort) fields.reasoningEffort = preset.reasoningEffort;

      try {
        if (activeConversationId) {
          await chatAdapter.updateConversation(activeConversationId, fields);
          await reloadConversations();
        } else {
          const conversation = await chatAdapter.createConversation({
            ...fields,
            modelProviderId: pair.providerId,
            modelId: pair.modelId,
            reasoningEffort: preset.reasoningEffort ?? settings.reasoningEffort ?? 'off',
            language: settings.language ?? 'en',
          });
          await setActiveConversation(conversation.id);
          await reloadConversations();
        }
        toast.success(`Applied "${preset.name}"`);
      } catch (error) {
        toast.error(error?.message ?? 'Could not apply the preset.');
      }
    },
    [activeConversationId, settings, defaults, isLoading, isError, reloadConversations, setActiveConversation],
  );

  /**
   * Detaches the active conversation's preset (clears prompt + persona).
   *
   * @returns {Promise<void>}
   */
  const removePresetFromActive = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      await chatAdapter.updateConversation(activeConversationId, {
        systemPrompt: '',
        persona: '',
        presetId: null,
      });
      await reloadConversations();
      toast.success('Preset removed');
    } catch (error) {
      toast.error(error?.message ?? 'Could not remove the preset.');
    }
  }, [activeConversationId, reloadConversations]);

  return {
    createChat,
    deleteChat,
    applyPreset,
    removePresetFromActive,
  };
};