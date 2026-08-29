import { Box, FormControl, MenuItem, Select, Typography, Tooltip } from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { REASONING_LEVELS, REASONING_LABELS } from '../../utils/constants.js';

/**
 * Header selector for the reasoning-effort level of the active conversation.
 * Persists the choice via the conversation update handler supplied by the page.
 *
 * @module components/reusable/MuiReasoningSelector
 */

/**
 * @param {object} props - Selector props.
 * @param {string} [props.value] - Current reasoning effort.
 * @param {(value: string) => void} [props.onChange] - Persists the new effort.
 * @param {boolean} [props.disabled] - Disables the control.
 * @returns {import('react').JSX.Element} The selector.
 */
export const MuiReasoningSelector = ({ value = 'off', onChange, disabled = false }) => {
  /**
   * @param {import('react').ChangeEvent} event - Select event.
   * @returns {void}
   */
  const handleChange = (event) => {
    if (onChange) onChange(String(event.target.value));
  };

  return (
    <Tooltip title="Reasoning effort" arrow>
      <FormControl size="small" disabled={disabled} sx={{ minWidth: 110 }}>
        <Select
          size="small"
          value={value}
          onChange={handleChange}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PsychologyIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {REASONING_LABELS[selected] ?? 'Off'}
              </Typography>
            </Box>
          )}
          inputProps={{ 'aria-label': 'Reasoning effort' }}
          sx={{ borderRadius: 2, '& .MuiSelect-select': { py: 0.75 } }}
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