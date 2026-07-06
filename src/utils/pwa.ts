// Service-worker registration + update detection.
//
// The worker is emitted by vite-plugin-pwa (injectManifest) at /sw.js — same
// scope/URL as the old hand-rolled worker, so deployed devices take over cleanly.
// The new worker does NOT skipWaiting on install, so after a deploy it installs
// and waits. This module surfaces that waiting worker to the app (via onSwUpdate)
// so a toast can offer the user a one-tap refresh; accepting posts SKIP_WAITING
// and reloads once on controllerchange.

import { captureEvent } from "./telemetry";

type SwUpdateCallback = (accept: () => void) => void;

let waitingWorker: ServiceWorker | null = null;
const updateSubscribers = new Set<SwUpdateCallback>();
// Guards the one reload after the new worker takes control — without it the
// controllerchange handler could loop (each reload re-fires it on some browsers).
let reloadingAfterUpdate = false;

// Post SKIP_WAITING to the waiting worker. controllerchange (below) then reloads.
function acceptUpdate(): void {
  if (!waitingWorker) return;
  waitingWorker.postMessage({ type: "SKIP_WAITING" });
}

function notifyUpdateAvailable(worker: ServiceWorker): void {
  waitingWorker = worker;
  updateSubscribers.forEach((cb) => {
    try {
      cb(acceptUpdate);
    } catch (error) {
      console.warn("SW update subscriber failed:", error);
    }
  });
}

/**
 * Subscribe to "an update is ready" events. The callback receives an `accept`
 * function; call it (e.g. on toast tap) to activate the new worker and reload.
 * If a waiting worker is already known at subscribe time, the callback fires
 * immediately. Returns an unsubscribe function.
 */
export function onSwUpdate(callback: SwUpdateCallback): () => void {
  updateSubscribers.add(callback);
  if (waitingWorker) {
    try {
      callback(acceptUpdate);
    } catch (error) {
      console.warn("SW update subscriber failed:", error);
    }
  }
  return () => updateSubscribers.delete(callback);
}

export function registerAppServiceWorker(): void {
  if (!import.meta.env.PROD || typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  // Reload exactly once when a NEW worker takes over from an old one. On a
  // first-ever visit the page starts uncontrolled and clientsClaim() fires
  // controllerchange moments after load — reloading then would yank the page
  // out from under a student mid-join, so only an update takeover (page was
  // already controlled, or the user accepted the toast) reloads. Registered
  // up front so it also covers the "already waiting at load" path below.
  const controlledAtLoad = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!controlledAtLoad && !waitingWorker) return;
    if (reloadingAfterUpdate) return;
    reloadingAfterUpdate = true;
    window.location.reload();
  });

  const register = () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // A worker installed and waiting at registration time = an update that
        // finished installing on a previous visit but hasn't taken over yet.
        if (registration.waiting && navigator.serviceWorker.controller) {
          notifyUpdateAvailable(registration.waiting);
        }

        // A new worker started installing after this page loaded: when it reaches
        // "installed" WHILE a controller already exists, it's an update (not the
        // first-ever install), so it's now waiting behind the live worker.
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              notifyUpdateAvailable(installing);
            }
          });
        });
      })
      .catch((error) => {
        console.warn("Service worker registration failed:", error);
        captureEvent("sw.register-failed", { message: error instanceof Error ? error.message : String(error) });
      });
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}

export function requestPersistentStorage(): void {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return;
  navigator.storage.persist().catch((error) => {
    console.warn("Persistent storage request failed:", error);
  });
}
