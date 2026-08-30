import { useState } from "react";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import TranslateIcon from "@mui/icons-material/Translate";
import { LANGUAGE_LABELS } from "../../utils/constants.js";

/**
 * Header selector for the assistant language. Two renderings: a full Select
 * (desktop / sm appbar) or a compact icon that opens a language menu (xs
 * appbar). Persists via the page's update handler, which writes through to the
 * pre-chat settings and (when active) PATCHes the conversation.
 *
 * @module components/chat/MuiLanguageSelector
 */

/**
 * @param {object} props - Selector props.
 * @param {string} props.value - Current language code (`en`|`am`|`om`).
 * @param {ReadonlyArray<string>} [props.options] - Selectable language codes.
 * @param {(value: string) => void} [props.onChange] - Persists the new language.
 * @param {boolean} [props.compact] - Render as an icon button + menu (xs).
 * @param {boolean} [props.slim] - Reduce the Select's minimum width (sm appbar).
 * @param {boolean} [props.disabled] - Disables the control.
 * @returns {import('react').JSX.Element} The selector.
 */
export const MuiLanguageSelector = ({
  value,
  options = [],
  onChange,
  compact = false,
  slim = false,
  disabled = false,
}) => {
  const [anchorEl, setAnchorEl] = useState(
    /** @type {HTMLElement | null} */ (null),
  );

  /**
   * @param {string} code - The language being selected.
   * @returns {void}
   */
  const handleSelected = (code) => {
    setAnchorEl(null);
    if (onChange) onChange(code);
  };

  if (compact) {
    return (
      <>
        <IconButton
          size="small"
          aria-label="Language"
          disabled={disabled}
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{ color: "text.secondary" }}
        >
          <TranslateIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          slotProps={{ list: { dense: true } }}
        >
          {options.map((code) => (
            <MenuItem
              key={code}
              selected={code === value}
              onClick={() => handleSelected(code)}
              sx={{ minWidth: 140 }}
            >
              {LANGUAGE_LABELS[code] ?? code}
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
    <Tooltip title="Language" arrow placement="top">
      <FormControl
        size="small"
        disabled={disabled}
        sx={{ minWidth: slim ? 120 : 150 }}
      >
        <Select
          size="small"
          value={value}
          onChange={handleChange}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <TranslateIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }} noWrap>
                {LANGUAGE_LABELS[selected] ?? selected}
              </Typography>
            </Box>
          )}
          displayEmpty
          inputProps={{ "aria-label": "Language" }}
          sx={{ borderRadius: 2, "& .MuiSelect-select": { py: 0.75 } }}
        >
          {options.map((code) => (
            <MenuItem key={code} value={code}>
              {LANGUAGE_LABELS[code] ?? code}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Tooltip>
  );
};
