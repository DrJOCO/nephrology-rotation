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
  const cached = await cache.match(request);
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
    const cached = await cache.match(request);
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
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'data': [
            './src/data/constants.ts',
            './src/data/guides.ts',
            './src/data/quizzes.ts',
            './src/data/cases.ts',
            './src/data/trials.ts',
            './src/data/images.ts',
          ],
        },
      },
    },
  },
})
