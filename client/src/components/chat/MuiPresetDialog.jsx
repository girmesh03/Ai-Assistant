import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import {
  useListPresetsQuery,
  useCreatePresetMutation,
  useUpdatePresetMutation,
  useDeletePresetMutation,
  selectPresetDialogOpen,
  selectEditingPresetId,
  openPresetDialog,
  openPresetEditor,
  closePresetDialog,
} from '../../redux/features/presetsSlice.js';
import { useGetModelsQuery, deriveProviders } from '../../redux/features/metaSlice.js';
import { REASONING_LEVELS, REASONING_LABELS } from '../../utils/constants.js';
import { truncate } from '../../utils/format.js';

/**
 * MUI dialog for managing presets: apply one to the active conversation, or
 * create/edit/delete the saved presets. Uses react-hook-form (register only)
 * for the editor form.
 *
 * The dialog's view is driven by the `editingPresetId` slice value:
 * `null` → list, `__new__` → create form, otherwise → edit form.
 *
 * @module components/chat/MuiPresetDialog
 */

/** Sentinel used to open the "create new preset" form. */
const NEW_PRESET_SENTINEL = '__new__';

/**
 * @param {object} props - Dialog props.
 * @param {(preset: import('../../redux/features/presetsSlice.js').Preset) => Promise<void>} [props.onApply] - Applies a preset to the active conversation.
 * @returns {import('react').JSX.Element} The dialog.
 */
export const MuiPresetDialog = ({ onApply }) => {
  const dispatch = useDispatch();
  const open = useSelector(selectPresetDialogOpen);
  const editingId = useSelector(selectEditingPresetId);
  const { data: presets = [], isLoading } = useListPresetsQuery();
  const [createPreset, { isLoading: isCreating }] = useCreatePresetMutation();
  const [updatePreset, { isLoading: isUpdating }] = useUpdatePresetMutation();
  const [deletePreset] = useDeletePresetMutation();
  const { data: models = [] } = useGetModelsQuery();

  const { register, handleSubmit, control, setValue, reset } = useForm({
    defaultValues: {
      name: '',
      prompt: '',
      persona: '',
      modelId: '',
      modelProviderId: '',
      reasoningEffort: '',
    },
  });

  /** The provider chosen in the form, mirrored for reactive model filtering. */
  const [providerId, setProviderId] = useState('');

  /** The currently pinned catalog model (provider+model), or null. */
  const [pinnedModel, setPinnedModel] = useState(null);

  /**
   * Looks up a catalog model by provider + model ids.
   *
   * @param {string} providerIdValue - Provider id, or ''.
   * @param {string} modelIdValue - Model id, or ''.
   * @returns {import('../../redux/features/metaSlice.js').AvailableModel | null} The model, or null.
   */
  const findModel = (providerIdValue, modelIdValue) =>
    models.find((model) => model.providerId === providerIdValue && model.id === modelIdValue) ?? null;

  /**
   * Enters create or edit mode for a preset, pre-filling the form.
   *
   * @param {import('../../redux/features/presetsSlice.js').Preset | null} preset - Preset to edit, or null to create.
   * @returns {void}
   */
  const startEditing = (preset) => {
    reset({
      name: preset?.name ?? '',
      prompt: preset?.prompt ?? '',
      persona: preset?.persona ?? '',
      modelId: preset?.modelId ?? '',
      modelProviderId: preset?.modelProviderId ?? '',
      reasoningEffort: preset?.reasoningEffort ?? '',
    });
    setProviderId(preset?.modelProviderId ?? '');
    const pinned = findModel(preset?.modelProviderId ?? '', preset?.modelId ?? '');
    setPinnedModel(pinned);
    if (pinned && pinned.reasoning !== true) setValue('reasoningEffort', '');
    dispatch(openPresetEditor(preset ? preset._id : NEW_PRESET_SENTINEL));
  };

  const handleClose = () => dispatch(closePresetDialog());

  /**
   * Persists the preset (create or update) then returns to the list view.
   *
   * @param {object} values - RHF form values.
   * @returns {void}
   */
  const handleSave = ({ name, prompt, persona, modelId, modelProviderId, reasoningEffort }) => {
    const pinned = findModel(modelProviderId ?? '', modelId ?? '');
    const payload = {
      name: name.trim(),
      prompt: prompt.trim(),
      persona: persona.trim() || null,
      modelProviderId: modelProviderId || null,
      modelId: modelId || null,
      reasoningEffort: pinned && pinned.reasoning !== true ? null : reasoningEffort || null,
    };
    const saving =
      editingId === NEW_PRESET_SENTINEL ? createPreset(payload) : updatePreset({ id: editingId, ...payload });
    void saving
      .then(() => {
        toast.success(editingId === NEW_PRESET_SENTINEL ? 'Preset created' : 'Preset updated');
        dispatch(openPresetDialog());
      })
      .catch(() => toast.error('Could not save the preset'));
  };

  /**
   * Deletes a preset after confirmation.
   *
   * @param {import('../../redux/features/presetsSlice.js').Preset} preset - The preset to delete.
   * @returns {void}
   */
  const handleDelete = (preset) => {
    if (!window.confirm(`Delete “${preset.name}”?`)) return;
    void deletePreset(preset._id)
      .unwrap()
      .then(() => toast.info('Preset deleted'))
      .catch(() => toast.error('Could not delete the preset'));
  };

  /**
   * Applies a preset to the active conversation.
   *
   * @param {import('../../redux/features/presetsSlice.js').Preset} preset - The preset.
   * @returns {void}
   */
  const handleApply = (preset) => {
    if (!onApply) return;
    void onApply(preset)
      .then(() => {
        toast.success(`Applied “${preset.name}”`);
        dispatch(closePresetDialog());
      })
      .catch(() => toast.error('Could not apply the preset'));
  };

  const isSaving = isCreating || isUpdating;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" aria-labelledby="preset-dialog-title">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 2, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {editingId !== null && (
            <Tooltip title="Back to presets">
              <IconButton size="small" aria-label="Back to presets" onClick={() => dispatch(openPresetDialog())}>
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Typography variant="h6" id="preset-dialog-title">
            Presets
          </Typography>
        </Box>
        <IconButton size="small" aria-label="Close" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {editingId === null ? (
          <List disablePadding>
            {isLoading ? (
              <ListItem>
                <ListItemText primary="Loading presets…" />
              </ListItem>
            ) : presets.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary="No presets yet"
                  secondary="Save a prompt, persona and model as a one-tap conversation starter."
                />
              </ListItem>
            ) : (
              presets.map((preset) => (
                <ListItem
                  key={preset._id}
                  disableGutters
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.25 }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" aria-label="Edit preset" onClick={() => startEditing(preset)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" aria-label="Delete preset" onClick={() => handleDelete(preset)}>
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemButton onClick={() => handleApply(preset)} sx={{ borderRadius: 1 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AutoAwesomeIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                          <span>{preset.name}</span>
                        </Box>
                      }
                      secondary={truncate(preset.prompt, 96)}
                      slotProps={{
                        primary: { variant: 'subtitle2', component: 'div' },
                        secondary: { variant: 'caption' },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))
            )}
            <ListItem sx={{ justifyContent: 'center', py: 1 }}>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => startEditing(null)}>
                New preset
              </Button>
            </ListItem>
          </List>
        ) : (
          <Box component="form" onSubmit={handleSubmit(handleSave)} noValidate sx={{ p: 2.5 }}>
            <Stack spacing={2}>
              <TextField size="small" required label="Name" fullWidth {...register('name')} />
              <TextField size="small" required multiline minRows={3} label="System prompt" fullWidth {...register('prompt')} />
              <TextField size="small" multiline minRows={2} label="Persona (optional)" fullWidth {...register('persona')} />
              <Stack direction="row" spacing={1.5}>
                <Controller
                  name="modelProviderId"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      size="small"
                      select
                      label="Provider (optional)"
                      fullWidth
                      value={field.value ?? ''}
                      onChange={(event) => {
                        const provider = event.target.value;
                        field.onChange(provider);
                        const first = models.find((model) => model.providerId === provider) ?? null;
                        setProviderId(provider);
                        setPinnedModel(first);
                        setValue('modelId', first?.id ?? '');
                        if (first && first.reasoning !== true) setValue('reasoningEffort', '');
                      }}
                    >
                      <MenuItem value="">
                        <em>Not set</em>
                      </MenuItem>
                      {deriveProviders(models).map((provider) => (
                        <MenuItem key={provider.providerId} value={provider.providerId}>
                          {provider.providerName}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <Controller
                  name="modelId"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      size="small"
                      select
                      label="Model (optional)"
                      fullWidth
                      value={field.value ?? ''}
                      onChange={(event) => {
                        const modelId = event.target.value;
                        field.onChange(modelId);
                        const pinned = findModel(providerId, modelId);
                        setPinnedModel(pinned);
                        if (pinned && pinned.reasoning !== true) setValue('reasoningEffort', '');
                      }}
                    >
                      <MenuItem value="">
                        <em>Not set</em>
                      </MenuItem>
                      {models
                        .filter((model) => !providerId || model.providerId === providerId)
                        .map((model) => (
                          <MenuItem key={`${model.providerId}/${model.id}`} value={model.id}>
                            {model.name}
                          </MenuItem>
                        ))}
                    </TextField>
                  )}
                />
              </Stack>
              <Controller
                name="reasoningEffort"
                control={control}
                render={({ field }) => {
                  const reasoningUnavailable = pinnedModel != null && pinnedModel.reasoning !== true;
                  return (
                    <TextField
                      size="small"
                      select
                      label="Reasoning (optional)"
                      fullWidth
                      value={field.value ?? ''}
                      disabled={reasoningUnavailable}
                      onChange={field.onChange}
                      helperText={reasoningUnavailable ? 'This model does not support reasoning.' : undefined}
                    >
                      <MenuItem value="">
                        <em>Not set</em>
                      </MenuItem>
                      {REASONING_LEVELS.map((level) => (
                        <MenuItem key={level} value={level}>
                          {REASONING_LABELS[level]}
                        </MenuItem>
                      ))}
                    </TextField>
                  );
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button size="small" onClick={() => dispatch(openPresetDialog())}>
                  Cancel
                </Button>
                <Button size="small" variant="contained" type="submit" startIcon={<SaveIcon />} disabled={isSaving}>
                  Save preset
                </Button>
              </Box>
            </Stack>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};