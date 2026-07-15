// Telemetry module (WS-2) — dormancy when no DSN is configured, event
// buffering before the lazy Sentry import resolves, and the beforeSend PHI
// scrub. Mirrors the vi.stubEnv/vi.resetModules mocking style of pwa.test.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentryMocks = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  setTag: vi.fn(),
}));

// Tracks whether the dynamic import() of @sentry/react was ever triggered —
// the no-op assertion below depends on this staying false when no DSN is set.
let sentryModuleLoaded = false;

vi.mock("@sentry/react", () => {
  sentryModuleLoaded = true;
  return sentryMocks;
});

vi.mock("web-vitals", () => ({
  onCLS: vi.fn(),
  onLCP: vi.fn(),
  onINP: vi.fn(),
}));

// Waits for the module's pending dynamic import() of the (mocked) SDK to
// settle. A fixed setTimeout is load-dependent — it passed in a 37-file run
// and flaked in a 39-file run — so use vitest's purpose-built API plus a
// microtask flush for the .then() chain that follows the import.
async function flushAsync(): Promise<void> {
  await vi.dynamicImportSettled();
  await Promise.resolve();
  await Promise.resolve();
}

describe("telemetry", () => {
  beforeEach(() => {
    vi.resetModules();
    sentryModuleLoaded = false;
    sentryMocks.init.mockClear();
    sentryMocks.captureException.mockClear();
    sentryMocks.captureMessage.mockClear();
    sentryMocks.addBreadcrumb.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("no DSN configured (default, dormant)", () => {
    it("initTelemetry does not import the Sentry SDK", async () => {
      vi.stubEnv("PROD", true);
      vi.stubEnv("VITE_SENTRY_DSN", "");
      const telemetry = await import("./telemetry");

      telemetry.initTelemetry();
      await Promise.resolve();
      await Promise.resolve();

      expect(sentryModuleLoaded).toBe(false);
      expect(sentryMocks.init).not.toHaveBeenCalled();
    });

    it("captureError/captureEvent/addBreadcrumb are silent no-ops", async () => {
      vi.stubEnv("PROD", true);
      vi.stubEnv("VITE_SENTRY_DSN", "");
      const telemetry = await import("./telemetry");

      telemetry.initTelemetry();
      telemetry.captureError(new Error("boom"));
      telemetry.captureEvent("sync.flush-failed", { kind: "setStudentData" });
      telemetry.addBreadcrumb("did a thing");
      await Promise.resolve();
      await Promise.resolve();

      expect(sentryModuleLoaded).toBe(false);
      expect(sentryMocks.captureException).not.toHaveBeenCalled();
      expect(sentryMocks.captureMessage).not.toHaveBeenCalled();
    });

    it("stays dormant in a non-PROD build even with a DSN set (dev safety)", async () => {
      vi.stubEnv("PROD", false);
      vi.stubEnv("VITE_SENTRY_DSN", "https://example.ingest.sentry.io/1");
      const telemetry = await import("./telemetry");

      telemetry.initTelemetry();
      telemetry.captureEvent("sync.flush-failed");
      await Promise.resolve();
      await Promise.resolve();

      expect(sentryModuleLoaded).toBe(false);
    });

    it("startWebVitalsReporting does not import web-vitals", async () => {
      vi.stubEnv("PROD", true);
      vi.stubEnv("VITE_SENTRY_DSN", "");
      const telemetry = await import("./telemetry");
      const webVitals = await import("web-vitals");

      telemetry.startWebVitalsReporting();
      await Promise.resolve();
      await Promise.resolve();

      expect(webVitals.onCLS).not.toHaveBeenCalled();
    });
  });

  describe("DSN configured + PROD (enabled)", () => {
    it("lazily imports and initializes Sentry with a release tag and beforeSend", async () => {
      vi.stubEnv("PROD", true);
      vi.stubEnv("VITE_SENTRY_DSN", "https://example.ingest.sentry.io/1");
      const telemetry = await import("./telemetry");

      telemetry.initTelemetry();
      await flushAsync();

      expect(sentryModuleLoaded).toBe(true);
      expect(sentryMocks.init).toHaveBeenCalledTimes(1);
      const options = sentryMocks.init.mock.calls[0][0];
      expect(options.dsn).toBe("https://example.ingest.sentry.io/1");
      expect(options.release).toContain(telemetry.APP_VERSION);
      expect(typeof options.beforeSend).toBe("function");
    });

    it("buffers calls made before init resolves and replays them in order once ready", async () => {
      vi.stubEnv("PROD", true);
      vi.stubEnv("VITE_SENTRY_DSN", "https://example.ingest.sentry.io/1");
      const telemetry = await import("./telemetry");

      // Fire calls synchronously right after initTelemetry(), before the
      // dynamic import's promise has had a chance to resolve.
      telemetry.initTelemetry();
      const error = new Error("early boom");
      telemetry.captureError(error, { where: "boot" });
      telemetry.captureEvent("sync.tombstone-hit", { kind: "setTeamSnapshot" });
      telemetry.addBreadcrumb("early breadcrumb", "boot");

      // Nothing should have reached the (still-loading) SDK yet.
      expect(sentryMocks.captureException).not.toHaveBeenCalled();
      expect(sentryMocks.captureMessage).not.toHaveBeenCalled();
      expect(sentryMocks.addBreadcrumb).not.toHaveBeenCalled();

      // Let the dynamic import resolve and the buffer replay.
      await flushAsync();

      expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
      expect(sentryMocks.captureException.mock.calls[0][0]).toBe(error);
      expect(sentryMocks.captureMessage).toHaveBeenCalledWith(
        "sync.tombstone-hit",
        expect.objectContaining({ extra: { kind: "setTeamSnapshot" } }),
      );
      expect(sentryMocks.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({ message: "early breadcrumb", category: "boot" }),
      );

      // Calls made AFTER init resolves go straight through (no buffering needed).
      telemetry.captureEvent("sw.register-failed", { message: "offline" });
      await flushAsync();
      expect(sentryMocks.captureMessage).toHaveBeenCalledWith(
        "sw.register-failed",
        expect.objectContaining({ extra: { message: "offline" } }),
      );
    });

    it("lazily imports web-vitals and reports CLS/LCP/INP as captureEvent calls", async () => {
      vi.stubEnv("PROD", true);
      vi.stubEnv("VITE_SENTRY_DSN", "https://example.ingest.sentry.io/1");
      const telemetry = await import("./telemetry");
      const webVitals = await import("web-vitals");

      // main.tsx calls both at boot; initTelemetry must run first so the
      // captureEvent calls the web-vitals callback makes below have a live
      // Sentry instance to report through instead of buffering forever.
      telemetry.initTelemetry();
      telemetry.startWebVitalsReporting();
      await flushAsync();

      expect(webVitals.onCLS).toHaveBeenCalledTimes(1);
      expect(webVitals.onLCP).toHaveBeenCalledTimes(1);
      expect(webVitals.onINP).toHaveBeenCalledTimes(1);

      // Simulate web-vitals invoking the callback with a metric.
      const onLCPCallback = (webVitals.onLCP as ReturnType<typeof vi.fn>).mock.calls[0][0];
      onLCPCallback({ name: "LCP", value: 1234.5678, rating: "good" });
      await flushAsync();

      expect(sentryMocks.captureMessage).toHaveBeenCalledWith(
        "web-vitals.LCP",
        expect.objectContaining({ extra: expect.objectContaining({ rating: "good" }) }),
      );
    });
  });

  describe("scrubSentryEvent (beforeSend PHI scrub)", () => {
    it("drops patient-shaped keys from extra and contexts, recursively", async () => {
      vi.stubEnv("PROD", true);
      vi.stubEnv("VITE_SENTRY_DSN", "");
      const { scrubSentryEvent } = await import("./telemetry");

      const event = {
        message: "sync.flush-failed",
        extra: {
          kind: "setStudentData",
          name: "Jane Doe",
          patient: { initials: "JD", room: "402", diagnosis: "AKI" },
          nested: { note: "should be dropped", fieldCount: 3 },
        },
        contexts: {
          custom: { mrn: "123456", dob: "2000-01-01", safe: "kept" },
        },
      };

      const scrubbed = scrubSentryEvent(event);

      expect(scrubbed.extra).toEqual({
        kind: "setStudentData",
        nested: { fieldCount: 3 },
      });
      expect(scrubbed.contexts).toEqual({
        custom: { safe: "kept" },
      });
      // Non-PHI fields on the event itself are left untouched.
      expect(scrubbed.message).toBe("sync.flush-failed");
    });

    it("is a no-op passthrough when extra/contexts are absent", async () => {
      vi.stubEnv("PROD", true);
      vi.stubEnv("VITE_SENTRY_DSN", "");
      const { scrubSentryEvent } = await import("./telemetry");

      const event = { message: "hello" };
      expect(scrubSentryEvent(event)).toEqual({ message: "hello" });
    });
  });
});
