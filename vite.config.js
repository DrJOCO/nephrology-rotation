import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

// Git short SHA at build time, used as the Sentry release tag (src/utils/telemetry.ts)
// and displayed in the admin panel footer. Falls back to "dev" outside a git
// checkout (e.g. a source tarball) so the build never fails on this.
function readGitShortSha() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(readGitShortSha()),
  },
  plugins: [
    react(),
    // Workbox service worker via injectManifest (custom activate + message
    // handling live in src/sw.ts). Replaces the old hand-rolled offlineSupportPlugin.
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // Emit the worker at /sw.js — the SAME scope/URL the old worker used, so
      // deployed devices take over cleanly. injectManifest compiles sw.ts and
      // outputs dist/sw.js.
      injectRegister: false,     // we register manually in src/utils/pwa.ts
      manifest: false,           // app already ships public/manifest.webmanifest
      inlineWorkboxRuntime: true, // no extra workbox-*.js runtime file in hosting
      injectManifest: {
        // Precache what the old worker precached: app JS/CSS/HTML + icons + the
        // web manifest. EXCLUDE decks/** (2.3 MB of PDFs, never precached).
        globPatterns: ['**/*.{js,css,html}', 'icon*.{svg,png}', 'apple-touch-icon.png', 'manifest.webmanifest'],
        globIgnores: ['**/decks/**'],
      },
      devOptions: { enabled: false },
    }),
  ],
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
        // @sentry/react's package entry file is itself named index.js, so
        // Rollup's default chunk naming gives its lazy dynamic-import chunk
        // the same "index" name as the real entry chunk — two different
        // index-*.js files in dist/assets. (Tried fixing this via a
        // manualChunks entry instead: that made Rollup emit a <link
        // rel="modulepreload"> for it from index.html, eagerly fetching the
        // "lazy" chunk on every load and defeating the point — worse than the
        // cosmetic collision.) chunkFileNames renames just this one chunk
        // without changing its laziness or preload behavior.
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.name === "index" && !chunkInfo.isEntry) {
            return "assets/telemetry-vendor-[hash].js";
          }
          return "assets/[name]-[hash].js";
        },
      },
    },
  },
})
