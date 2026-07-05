/// <reference lib="webworker" />
// Workbox service worker (vite-plugin-pwa injectManifest). Emitted to /sw.js —
// the SAME scope/URL the hand-rolled worker used, so returning devices take over
// cleanly. Deliberately NO skipWaiting() on install: a new build waits until the
// user accepts the update toast (or all tabs close), instead of silently swapping
// assets under a live cohort mid-session.

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { clientsClaim } from "workbox-core";

// __WB_MANIFEST is a placeholder the injectManifest build replaces with the
// concrete precache entry array. Type it explicitly (rather than relying on the
// ambient any) so precacheAndRoute's argument is checked.
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// __WB_MANIFEST is injected at build time with the precache list (hashed JS/CSS/
// HTML + icons + manifest, per the plugin's globPatterns). This covers everything
// needed to load the app offline; decks/** are intentionally excluded (2.3 MB of
// PDFs that were never precached by the old worker either).
precacheAndRoute(self.__WB_MANIFEST);

// Drop precaches from previous Workbox revisions.
cleanupOutdatedCaches();

// SPA navigation fallback: serve the precached index.html for navigations so the
// installed PWA opens offline. Deny-list Firebase auth handler + any asset-like
// path so real files still resolve normally.
const navHandler = createHandlerBoundToURL("/index.html");
registerRoute(
  new NavigationRoute(navHandler, {
    denylist: [/^\/__\/auth\//, /\/[^/?]+\.[^/]+$/],
  }),
);

// Google Fonts stylesheet + font files: cache-first with a ~1 year expiration and
// a small cap. Mirrors the old worker's font caching, now with bounded storage.
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "neph-google-fonts",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365, purgeOnQuotaError: true }),
    ],
  }),
);

// Legacy cache names written by the hand-rolled worker. Purge them on activate so
// old-worker storage doesn't leak forever once this worker takes over.
const LEGACY_CACHE_PREFIXES = ["neph-shell-", "neph-runtime-", "neph-fonts-"];

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => LEGACY_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)))
          .map((key) => caches.delete(key)),
      );
    })(),
  );
});

// Take control of open clients as soon as this worker activates (after the user
// accepts the update, or on first install with no prior controller).
clientsClaim();

// The page posts this once the user taps the update toast; only then do we
// skip waiting and let activate → controllerchange → reload swap in the new build.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
