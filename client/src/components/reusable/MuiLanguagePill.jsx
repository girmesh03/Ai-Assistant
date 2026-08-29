import { Tooltip, Chip } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';

/**
 * Read-only chip showing the conversation's assistant language (e.g. EN, አማ, OM).
 *
 * @module components/reusable/MuiLanguagePill
 */

/** Display names keyed by ISO code. */
const LANGUAGE_LABELS = Object.freeze({
  en: 'English',
  am: 'Amharic',
  om: 'Oromo',
});

/**
 * @param {object} props - Pill props.
 * @param {string} [props.language] - ISO language code.
 * @returns {import('react').JSX.Element} The pill.
 */
export const MuiLanguagePill = ({ language }) => {
  const label = LANGUAGE_LABELS[language] ?? 'English';
  return (
    <Tooltip title={`Assistant language: ${label}`} arrow>
      <Chip
        size="small"
        icon={<TranslateIcon />}
        label={label}
        variant="outlined"
        sx={{ typography: 'caption', fontWeight: 600 }}
      />
    </Tooltip>
  );
};