/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  // Empty/unset in every fork and in production until Dr. Cheng mints a
  // Sentry DSN — see docs/observability.md. Absence keeps src/utils/telemetry.ts
  // fully dormant (no Sentry import, no network calls).
  readonly VITE_SENTRY_DSN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Injected by vite.config.js's `define` from `git rev-parse --short HEAD`.
// Used as the Sentry release tag and the admin panel footer build stamp.
declare const __APP_VERSION__: string;
