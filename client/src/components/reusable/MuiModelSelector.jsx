import { Box, FormControl, ListSubheader, MenuItem, Select, Tooltip, Typography } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useSelector } from 'react-redux';
import { useGetModelsQuery, selectProviders, selectModelInfo } from '../../redux/features/metaSlice.js';
import { MODEL_LOADING_LABEL } from '../../utils/constants.js';

/**
 * Header selector for the active conversation's model. Groups the catalog by
 * provider and persists changes through the page's update handler.
 *
 * @module components/reusable/MuiModelSelector
 */

/** Encodes a provider/model pair as a Select option value. */
const encode = (providerId, modelId) => (providerId && modelId ? `${providerId}/${modelId}` : '');

/**
 * @param {object} props - Selector props.
 * @param {string} [props.providerId] - Active conversation provider id.
 * @param {string} [props.modelId] - Active conversation model id.
 * @param {(value: string) => void} [props.onChange] - Receives the encoded `${provider}/${model}` value.
 * @param {boolean} [props.disabled] - Disables the control.
 * @returns {import('react').JSX.Element} The selector.
 */
export const MuiModelSelector = ({ providerId, modelId, onChange, disabled = false }) => {
  const { data: models, isLoading } = useGetModelsQuery();
  const providers = useSelector(selectProviders);
  const current = useSelector((root) => selectModelInfo(root, { providerId, modelId }));

  /**
   * @param {import('react').ChangeEvent} event - Select event.
   * @returns {void}
   */
  const handleChange = (event) => {
    if (onChange) onChange(String(event.target.value));
  };

  const displayLabel = current?.name ?? MODEL_LOADING_LABEL;

  return (
    <Tooltip title="Model" arrow>
      <FormControl size="small" disabled={disabled || isLoading} sx={{ minWidth: 170 }}>
        <Select
          size="small"
          value={encode(providerId, modelId)}
          onChange={handleChange}
          renderValue={() => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SmartToyIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }} noWrap>
                {displayLabel}
              </Typography>
            </Box>
          )}
          displayEmpty
          inputProps={{ 'aria-label': 'Model' }}
          sx={{ borderRadius: 2, '& .MuiSelect-select': { py: 0.75 } }}
        >
          {providers.map((provider) => [
            <ListSubheader key={`h-${provider.providerId}`} disableSticky sx={{ lineHeight: '28px', fontWeight: 700 }}>
              {provider.providerName}
            </ListSubheader>,
            ...(models ?? [])
              .filter((model) => model.providerId === provider.providerId)
              .map((model) => (
                <MenuItem key={`${model.providerId}/${model.id}`} value={encode(model.providerId, model.id)}>
                  {model.name}
                </MenuItem>
              )),
          ])}
        </Select>
      </FormControl>
    </Tooltip>
  );
};