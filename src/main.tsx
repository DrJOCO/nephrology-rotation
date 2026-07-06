import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { applyTheme, ensureThemeStyles } from "./utils/helpers";
import store from "./utils/store";
import { registerAppServiceWorker, requestPersistentStorage } from "./utils/pwa";
import { refreshFlags } from "./utils/flags";

// Inject theme CSS variables before first render (FOUC prevention)
ensureThemeStyles();
const savedTheme = localStorage.getItem("neph_theme");
if (savedTheme === "dark" || savedTheme === "light") {
  applyTheme(savedTheme, false);
} else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
  applyTheme("dark", false);
}

registerAppServiceWorker();
requestPersistentStorage();
void store.flushPendingSyncQueue();
// Stale-while-revalidate: components already render off defaults/cache
// synchronously (src/utils/flags.ts); this just kicks off the background
// refresh so a fresh doc value is available for the rest of the session.
void refreshFlags();
window.addEventListener("online", () => {
  void store.flushPendingSyncQueue();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
