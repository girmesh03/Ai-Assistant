import { useState } from "react";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import PsychologyIcon from "@mui/icons-material/Psychology";
import { REASONING_LEVELS, REASONING_LABELS } from "../../utils/constants.js";

/**
 * Header selector for the reasoning-effort level of the active conversation.
 * Two renderings: a full Select (desktop / sm appbar) or a compact icon that
 * opens a level menu (xs appbar). Persists via the provided change handler.
 * Only rendered for models whose catalog entry has `reasoning: true`.
 *
 * @module components/chat/MuiReasoningSelector
 */

/**
 * @param {object} props - Selector props.
 * @param {string} [props.value] - Current reasoning effort.
 * @param {(value: string) => void} [props.onChange] - Persists the new effort.
 * @param {boolean} [props.compact] - Render as an icon button + menu (xs).
 * @param {boolean} [props.slim] - Reduce the Select's minimum width (sm appbar).
 * @param {boolean} [props.disabled] - Disables the control.
 * @returns {import('react').JSX.Element} The selector.
 */
export const MuiReasoningSelector = ({
  value = "off",
  onChange,
  compact = false,
  slim = false,
  disabled = false,
}) => {
  const [anchorEl, setAnchorEl] = useState(
    /** @type {HTMLElement | null} */ (null),
  );

  /**
   * @param {string} level - The level being selected.
   * @returns {void}
   */
  const handleSelected = (level) => {
    setAnchorEl(null);
    if (onChange) onChange(level);
  };

  if (compact) {
    return (
      <>
        <IconButton
          size="small"
          aria-label="Reasoning effort"
          disabled={disabled}
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{ color: "text.secondary" }}
        >
          <PsychologyIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          slotProps={{ list: { dense: true } }}
        >
          {REASONING_LEVELS.map((level) => (
            <MenuItem
              key={level}
              selected={level === value}
              onClick={() => handleSelected(level)}
              sx={{ minWidth: 140 }}
            >
              {REASONING_LABELS[level]}
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
    if (onChange) onChange(String(event.target.value));
  };

  return (
    <Tooltip title="Reasoning effort" arrow placement="top">
      <FormControl
        size="small"
        disabled={disabled}
        sx={{ minWidth: slim ? 96 : 110 }}
      >
        <Select
          size="small"
          value={value}
          onChange={handleChange}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <PsychologyIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }} noWrap>
                {REASONING_LABELS[selected] ?? "Off"}
              </Typography>
            </Box>
          )}
          inputProps={{ "aria-label": "Reasoning effort" }}
          sx={{ borderRadius: 2, "& .MuiSelect-select": { py: 0.75 } }}
        >
          {REASONING_LEVELS.map((level) => (
            <MenuItem key={level} value={level}>
              {REASONING_LABELS[level]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Tooltip>
  );
};
