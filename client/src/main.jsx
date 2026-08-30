import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/noto-serif-ethiopic/400.css";
import "@fontsource/noto-serif-ethiopic/700.css";
import "@fontsource/noto-serif-ethiopic/900.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { store } from "./redux/store.js";
import { theme } from "./theme/index.js";
import { ChatPage } from "./pages/ChatPage.jsx";

// Fonts above are imported next to the theme that names them so the stack
// resolves without any runtime font loading.
//
// The ሰላም chat client boots with Redux for global data (model catalog,
// presets, speech) and a system-default color scheme, with the inline
// InitColorSchemeScript preventing a dark-mode flash before first paint.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <InitColorSchemeScript defaultMode="system" />
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Provider store={store}>
        <ChatPage />
        <ToastContainer
          position="bottom-center"
          autoClose={2800}
          closeOnClick
          pauseOnHover={false}
          newestOnTop
          hideProgressBar
          theme="colored"
        />
      </Provider>
    </ThemeProvider>
  </StrictMode>,
);
