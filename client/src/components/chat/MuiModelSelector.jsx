import { useState } from "react";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import { useSelector } from "react-redux";
import {
  useGetModelsQuery,
  selectProviders,
  selectModelInfo,
} from "../../redux/features/metaSlice.js";
import { MODEL_LOADING_LABEL } from "../../utils/constants.js";

/**
 * Header selector for the active conversation's model. Two renderings: a full
 * Select grouped by provider (desktop / sm appbar) or a compact icon that opens
 * a provider-grouped menu (xs appbar). Groups the catalog by provider and
 * persists changes through the page's update handler.
 *
 * @module components/chat/MuiModelSelector
 */

/** Encodes a provider/model pair as a Select option value. */
const encode = (providerId, modelId) =>
  providerId && modelId ? `${providerId}/${modelId}` : "";

/**
 * @param {object} props - Selector props.
 * @param {string} [props.providerId] - Active conversation provider id.
 * @param {string} [props.modelId] - Active conversation model id.
 * @param {(value: string) => void} [props.onChange] - Receives the encoded `${provider}/${model}` value.
 * @param {boolean} [props.compact] - Render as an icon button + menu (xs).
 * @param {boolean} [props.slim] - Reduce the Select's minimum width (sm appbar).
 * @param {boolean} [props.disabled] - Disables the control.
 * @returns {import('react').JSX.Element} The selector.
 */
export const MuiModelSelector = ({
  providerId,
  modelId,
  onChange,
  compact = false,
  slim = false,
  disabled = false,
}) => {
  const { data: models, isLoading } = useGetModelsQuery();
  const providers = useSelector(selectProviders);
  const current = useSelector((root) =>
    selectModelInfo(root, { providerId, modelId }),
  );
  const [anchorEl, setAnchorEl] = useState(
    /** @type {HTMLElement | null} */ (null),
  );

  const selectedValue = encode(providerId, modelId);
  const displayLabel = current?.name ?? MODEL_LOADING_LABEL;

  /**
   * @param {string} value - The encoded `${provider}/${model}` value.
   * @returns {void}
   */
  const handleSelected = (value) => {
    setAnchorEl(null);
    if (onChange) onChange(value);
  };

  /**
   * Builds the provider-grouped option fragments for a given item renderer.
   *
   * @param {(model: object, value: string) => import('react').JSX.Element} renderItem - How to render one model option.
   * @returns {import('react').JSX.Element[]} Provider subheaders + options.
   */
  const buildOptions = (renderItem) =>
    providers.flatMap((provider) => [
      <ListSubheader
        key={`h-${provider.providerId}`}
        disableSticky
        sx={{ lineHeight: "28px", fontWeight: 700 }}
      >
        {provider.providerName}
      </ListSubheader>,
      ...(models ?? [])
        .filter((model) => model.providerId === provider.providerId)
        .map((model) => renderItem(model, encode(model.providerId, model.id))),
    ]);

  if (compact) {
    return (
      <>
        <IconButton
          size="small"
          aria-label="Model"
          disabled={disabled || isLoading}
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{ color: "text.secondary" }}
        >
          <SmartToyIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          slotProps={{ list: { dense: true } }}
        >
          {buildOptions((model, value) => (
            <MenuItem
              key={value}
              selected={value === selectedValue}
              onClick={() => handleSelected(value)}
              sx={{ minWidth: 190 }}
            >
              {model.name}
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  }

  /**
   * @param {import('react').ChangeEvent} event - Select event.
   * @returns {void}
   */
  const handleChange = (event) => {
    handleSelected(String(event.target.value));
  };

  return (
    <Tooltip title="Model" arrow placement="top">
      <FormControl
        size="small"
        disabled={disabled || isLoading}
        sx={{ minWidth: slim ? 130 : 170 }}
      >
        <Select
          size="small"
          value={selectedValue}
          onChange={handleChange}
          renderValue={() => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <SmartToyIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }} noWrap>
                {displayLabel}
              </Typography>
            </Box>
          )}
          displayEmpty
          inputProps={{ "aria-label": "Model" }}
          sx={{ borderRadius: 2, "& .MuiSelect-select": { py: 0.75 } }}
        >
          {buildOptions((model, value) => (
            <MenuItem key={value} value={value}>
              {model.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Tooltip>
  );
};
