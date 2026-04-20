import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ensureThemeStyles } from "./utils/helpers";
import store from "./utils/store";
import { registerAppServiceWorker, requestPersistentStorage } from "./utils/pwa";

// Inject theme CSS variables before first render (FOUC prevention)
ensureThemeStyles();
const savedTheme = localStorage.getItem("neph_theme");
if (savedTheme) {
  document.documentElement.setAttribute("data-theme", savedTheme);
} else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
  document.documentElement.setAttribute("data-theme", "dark");
}

registerAppServiceWorker();
requestPersistentStorage();
void store.flushPendingSyncQueue();
window.addEventListener("online", () => {
  void store.flushPendingSyncQueue();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
