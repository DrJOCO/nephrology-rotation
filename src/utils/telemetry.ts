// Observability integration point (WS-2). The ONLY module in the app that
// imports Sentry — every caller (App.tsx, store.ts, pwa.ts, feedback.ts) goes
// through the four functions exported here, never `@sentry/react` directly.
//
// Dormant by default: when `VITE_SENTRY_DSN` is unset (true for every fork,
// every emulator dev session, and production until Dr. Cheng mints a DSN),
// every export below is an inert no-op — no network call, no console noise,
// and the Sentry SDK is never imported, so it costs nothing in the eager boot
// chunk. Reporting only turns on when BOTH `import.meta.env.PROD` and
// `VITE_SENTRY_DSN` are true.
//
// The SDK is loaded via a dynamic `import()` (see `loadSentry` below) so it
// rides its own lazy chunk instead of inflating the always-loaded graph.
// Events fired before that import resolves are buffered (see `buffer`) and
// replayed in order once init completes.
//
// HARD CONSTRAINT — no PHI: callers must only pass field NAMES, counts, and
// status strings as event data, never patient-shaped payload contents. The
// `scrubSentryEvent` beforeSend hook below is a defensive second line, not a
// substitute for callers being careful — see docs/observability.md.

/** Keys that look patient-shaped; dropped defensively from any event payload. */
const PATIENT_SHAPED_KEYS = new Set([
  "name",
  "patient",
  "patients",
  "initials",
  "room",
  "mrn",
  "dob",
  "note",
  "notes",
  "diagnosis",
  "hpi",
  "assessment",
  "plan",
]);

type Primitive = string | number | boolean | null | undefined;
export type TelemetryData = Record<string, Primitive>;

interface SentryLike {
  init: (options: Record<string, unknown>) => void;
  captureException: (error: unknown, captureContext?: Record<string, unknown>) => void;
  captureMessage: (message: string, captureContext?: Record<string, unknown>) => void;
  addBreadcrumb: (breadcrumb: Record<string, unknown>) => void;
  setTag: (key: string, value: string) => void;
}

/** Git short SHA of the build, or "dev" outside a build (e.g. plain `vite`). */
export const APP_VERSION: string = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";

function isTelemetryEnabled(): boolean {
  return Boolean(import.meta.env.PROD) && Boolean(import.meta.env.VITE_SENTRY_DSN);
}

// Drops any key that looks patient-shaped, at any nesting depth, from event
// `extra` data. Defensive second line — callers must never pass payload
// contents to begin with (see module comment + docs/observability.md).
function scrubPatientShapedKeys<T>(value: T, depth = 0): T {
  if (depth > 5 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item) => scrubPatientShapedKeys(item, depth + 1)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (PATIENT_SHAPED_KEYS.has(key.toLowerCase())) continue;
    out[key] = scrubPatientShapedKeys(val, depth + 1);
  }
  return out as unknown as T;
}

// beforeSend scrub applied to every outgoing Sentry event, independent of
// what callers pass to captureEvent/captureError — a defensive net in case a
// future caller (or a third-party breadcrumb, e.g. a DOM click target's text)
// carries something patient-shaped. Exported (only) so tests can exercise the
// scrub directly without booting the Sentry SDK.
export function scrubSentryEvent(event: Record<string, unknown>): Record<string, unknown> {
  const scrubbed = { ...event };
  if (isPlainObject(scrubbed.extra)) scrubbed.extra = scrubPatientShapedKeys(scrubbed.extra);
  if (isPlainObject(scrubbed.contexts)) scrubbed.contexts = scrubPatientShapedKeys(scrubbed.contexts);
  return scrubbed;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ─── Buffering + lazy init ───────────────────────────────────────────
// Calls made before the async Sentry import resolves (e.g. an error thrown
// during the very first render) are queued here and replayed in order once
// `sentry` is set. Bounded so a pathological pre-init burst can't grow this
// without limit.
type BufferedCall =
  | { kind: "error"; error: unknown; context?: TelemetryData }
  | { kind: "event"; name: string; data?: TelemetryData }
  | { kind: "breadcrumb"; message: string; category?: string; data?: TelemetryData };

const BUFFER_MAX = 50;
const buffer: BufferedCall[] = [];
let sentry: SentryLike | null = null;
let initPromise: Promise<void> | null = null;

function pushBuffered(call: BufferedCall): void {
  buffer.push(call);
  if (buffer.length > BUFFER_MAX) buffer.shift();
}

function replayBuffered(): void {
  const pending = buffer.splice(0, buffer.length);
  for (const call of pending) {
    if (call.kind === "error") sendError(call.error, call.context);
    else if (call.kind === "event") sendEvent(call.name, call.data);
    else sendBreadcrumb(call.message, call.category, call.data);
  }
}

async function loadSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string;
  // Dynamic import: keeps @sentry/react out of the eager boot chunk. This
  // line is only ever reached when isTelemetryEnabled() is true.
  const Sentry = await import("@sentry/react");
  // scrubSentryEvent is typed as a plain Record<string, unknown> transform so
  // it stays easily unit-testable without depending on Sentry's ErrorEvent
  // type; `beforeSend`'s real signature is structurally compatible (an event
  // object in, the same shape or null/undefined out), so the cast is safe.
  const beforeSend = scrubSentryEvent as unknown as NonNullable<Parameters<typeof Sentry.init>[0]>["beforeSend"];
  Sentry.init({
    dsn,
    release: `nephrology-rotation@${APP_VERSION}`,
    environment: "production",
    beforeSend,
  });
  sentry = Sentry as unknown as SentryLike;
  replayBuffered();
}

/**
 * Initializes telemetry. Safe to call multiple times (idempotent) and safe
 * to call unconditionally at app boot — it is a no-op unless PROD and
 * VITE_SENTRY_DSN are both set, in which case it kicks off the lazy Sentry
 * import in the background and returns immediately (does not block boot).
 */
export function initTelemetry(): void {
  if (!isTelemetryEnabled()) return;
  if (!initPromise) initPromise = loadSentry();
}

function sendError(error: unknown, context?: TelemetryData): void {
  if (!sentry) return;
  sentry.captureException(error, context ? { extra: context } : undefined);
}

function sendEvent(name: string, data?: TelemetryData): void {
  if (!sentry) return;
  sentry.captureMessage(name, { level: "info", extra: data });
}

function sendBreadcrumb(message: string, category?: string, data?: TelemetryData): void {
  if (!sentry) return;
  sentry.addBreadcrumb({ message, category: category || "app", data, level: "info" });
}

/**
 * Reports a caught error/exception. No-op (buffered until init resolves, or
 * dropped entirely if telemetry is disabled) — never throws, never blocks.
 */
export function captureError(error: unknown, context?: TelemetryData): void {
  if (!isTelemetryEnabled()) return;
  if (!sentry) {
    pushBuffered({ kind: "error", error, context });
    return;
  }
  sendError(error, context);
}

/**
 * Reports a named event with optional structured data (field names/counts/
 * status strings only — see module comment). Surfaces in Sentry as a message
 * event so it's searchable/alertable like an error.
 */
export function captureEvent(name: string, data?: TelemetryData): void {
  if (!isTelemetryEnabled()) return;
  if (!sentry) {
    pushBuffered({ kind: "event", name, data });
    return;
  }
  sendEvent(name, data);
}

/**
 * Adds a breadcrumb (contextual trail leading up to a later error/event).
 * Does not itself send anything to Sentry.
 */
export function addBreadcrumb(message: string, category?: string, data?: TelemetryData): void {
  if (!isTelemetryEnabled()) return;
  if (!sentry) {
    pushBuffered({ kind: "breadcrumb", message, category, data });
    return;
  }
  sendBreadcrumb(message, category, data);
}

// ─── web-vitals ──────────────────────────────────────────────────────
// Reports CLS/LCP/INP as breadcrumb + event pairs (Sentry's JS SDK measurement
// API varies by version; breadcrumbs + a searchable event are format-stable).
// Lazy-loaded alongside Sentry — never imported when telemetry is disabled.
let vitalsStarted = false;

/**
 * Starts web-vitals (CLS/LCP/INP) reporting. No-op when telemetry is
 * disabled. Safe to call once at boot; idempotent.
 */
export function startWebVitalsReporting(): void {
  if (!isTelemetryEnabled() || vitalsStarted) return;
  vitalsStarted = true;
  void reportWebVitals();
}

async function reportWebVitals(): Promise<void> {
  const { onCLS, onLCP, onINP } = await import("web-vitals");
  const report = (metric: { name: string; value: number; rating: string }) => {
    captureEvent(`web-vitals.${metric.name}`, {
      value: Math.round(metric.value * 1000) / 1000,
      rating: metric.rating,
    });
  };
  onCLS(report);
  onLCP(report);
  onINP(report);
}
