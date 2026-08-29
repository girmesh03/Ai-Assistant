import { Box, Paper, Divider, Typography, Chip } from "@mui/material";
import { BRAND_NAME, SUGGESTED_PROMPTS } from "../../utils/constants.js";

/**
 * Welcome hero shown when there is no active conversation. Presents the ሰላም
 * brand mark and a set of suggested opening prompts that create a
 * conversation and send the prompt immediately.
 *
 * @module components/reusable/MuiEmptyState
 */

/**
 * @param {object} props - Hero props.
 * @param {(prompt: string) => void} [props.onPickPrompt] - Sends a suggested prompt.
 * @returns {import('react').JSX.Element} The hero.
 */
export const MuiEmptyState = ({ onPickPrompt }) => (
  <Box
    sx={{
      flex: 1,
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 1.5,
      px: { xs: 2, sm: 4 },
      pb: 2,
      textAlign: "center",
    }}
  >
    <Paper
      elevation={0}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1.25,
        px: 3,
        py: 3,
        maxWidth: 560,
        bgcolor: "transparent",
      }}
    >
      <Typography
        sx={{
          fontFamily: "display",
          fontSize: { xs: "2.6rem", md: "3.4rem" },
          lineHeight: 1.1,
          color: "text.primary",
          letterSpacing: "0.02em",
          userSelect: "none",
        }}
      >
        {BRAND_NAME}
        <Box component="span" sx={{ color: "warning.main" }}>
          .
        </Box>
      </Typography>

      <Divider sx={{ width: 72, borderColor: "warning.main", opacity: 0.7 }} />

      <Typography
        variant="body2"
        sx={{ color: "text.secondary", maxWidth: 380 }}
      >
        Your bilingual AI companion. Chat, draft, translate and learn — in
        English, አማርኛ, or Afaan Oromoo.
      </Typography>
    </Paper>

    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
        gap: 1,
        width: "100%",
        maxWidth: 560,
      }}
    >
      {SUGGESTED_PROMPTS.map((prompt) => (
        <Chip
          key={prompt.text}
          label={prompt.text}
          onClick={() => onPickPrompt?.(prompt.text)}
          sx={{
            height: "auto",
            py: 1,
            justifyContent: "flex-start",
            textAlign: "left",
            whiteSpace: "normal",
            borderRadius: 2,
            borderColor: "divider",
            "& .MuiChip-label": { display: "block", lineHeight: 1.4, py: 0 },
            overflow: "hidden",
          }}
          variant="outlined"
        />
      ))}
    </Box>

    <Typography variant="caption" sx={{ color: "text.disabled" }}>
      Try the mic, or retype one of the ideas above.
    </Typography>
  </Box>
);
