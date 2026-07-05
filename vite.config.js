import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'

function offlineSupportPlugin() {
  return {
    name: 'offline-support',
    apply: 'build',
    generateBundle(_, bundle) {
      const buildAssets = Object.keys(bundle)
        .filter((fileName) => !fileName.endsWith('.map'))
        .map((fileName) => `/${fileName}`);

      const precacheUrls = Array.from(new Set([
        '/',
        '/index.html',
        '/manifest.webmanifest',
        '/icon.svg',
        '/icon-maskable.svg',
        '/icon-192.png',
        '/icon-512.png',
        '/icon-maskable-192.png',
        '/icon-maskable-512.png',
        '/apple-touch-icon.png',
        ...buildAssets,
      ]));

      // Cache version derived from the build output — every deploy busts old caches
      // so returning users with a stale service worker can't load now-deleted chunks.
      const buildId = createHash('sha256').update(precacheUrls.join('|')).digest('hex').slice(0, 10);

      const source = `
const BUILD_ID = '${buildId}';
const SHELL_CACHE = 'neph-shell-' + BUILD_ID;
const RUNTIME_CACHE = 'neph-runtime-' + BUILD_ID;
const FONT_CACHE = 'neph-fonts-' + BUILD_ID;
const PRECACHE_URLS = ${JSON.stringify(precacheUrls)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => ![SHELL_CACHE, RUNTIME_CACHE, FONT_CACHE].includes(key))
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  // Precached hashed chunks live in SHELL_CACHE (populated by the install
  // handler), but the runtime cache is separate. Fall back to a global
  // caches.match across ALL caches so offline students are served the shell's
  // precached assets instead of erroring on a runtime-cache miss.
  const cached = (await cache.match(request)) || (await caches.match(request));
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
}

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone());
    return response;
  } catch (error) {
    // Try the runtime cache, then any other cache (e.g. the precached shell),
    // then the navigation fallback before giving up.
    const cached = (await cache.match(request)) || (await caches.match(request));
    if (cached) return cached;
    const fallback = await caches.match(fallbackUrl);
    if (fallback) return fallback;
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, RUNTIME_CACHE, '/index.html'));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
  }
});
      `.trim();

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), offlineSupportPlugin()],
  build: {
    rollupOptions: {
      output: {
        // vendor-react stays a dedicated chunk for long-term caching. The old
        // monolithic `data` chunk is gone: the heavy content datasets
        // (guides/quizzes/cases/trials/studySheets/inpatientGuides/…) are now
        // reached only through lazy views (StudentViewRouter, GlobalSearchOverlay,
        // AdminPanel), so Rollup splits each dataset into its consuming view's
        // chunk instead of forcing all of it into the always-loaded boot graph.
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
        },
      },
    },
  },
})
