// Feature flags (WS-3): precedence (default < cached < fetched), fetch-failure
// fallback, cache round-trip, hook re-render on change, and the preview guard
// (fetched values apply in-memory but must not touch the real device's
// localStorage cache). Mirrors the Firestore mocking style of feedback.test.ts
// and the real-store-singleton style of storePreview.test.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const mocks = vi.hoisted(() => {
  let remoteDoc: Record<string, unknown> | undefined;
  const setDocCalls: Array<{ path: string; data: Record<string, unknown> }> = [];
  const fs = {
    doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
    getDoc: async (_ref: { path: string }) => ({
      exists: () => remoteDoc !== undefined,
      data: () => remoteDoc,
    }),
    setDoc: async (ref: { path: string }, data: Record<string, unknown>) => {
      setDocCalls.push({ path: ref.path, data });
      remoteDoc = { ...(remoteDoc || {}), ...data };
    },
  };
  return {
    setDocCalls,
    fs,
    setRemoteDoc: (doc: Record<string, unknown> | undefined) => { remoteDoc = doc; },
  };
});

vi.mock("./firebase", () => ({
  getFirebase: async () => ({ db: {}, fs: mocks.fs, auth: {}, authMod: {} }),
}));

import store from "./store";
import {
  FLAG_DEFAULTS,
  getFlag,
  refreshFlags,
  setRemoteFlags,
  useFlag,
  __resetFlagsForTest,
  type FlagName,
} from "./flags";

const FLAGS_CACHE_KEY = "neph_flags";

beforeEach(() => {
  localStorage.clear();
  mocks.setDocCalls.length = 0;
  mocks.setRemoteDoc(undefined);
  __resetFlagsForTest();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  mocks.setRemoteDoc(undefined);
  if (store.isPreview()) store.exitPreview();
  __resetFlagsForTest();
});

describe("getFlag precedence", () => {
  it("falls back to hardcoded defaults with no cache and no fetch", () => {
    (Object.keys(FLAG_DEFAULTS) as FlagName[]).forEach((name) => {
      expect(getFlag(name)).toBe(FLAG_DEFAULTS[name]);
    });
  });

  it("a localStorage cache overrides the hardcoded default", () => {
    localStorage.setItem(FLAGS_CACHE_KEY, JSON.stringify({ feedbackEnabled: false }));
    __resetFlagsForTest();
    expect(getFlag("feedbackEnabled")).toBe(false);
    // Untouched flags still fall back to default.
    expect(getFlag("previewEnabled")).toBe(FLAG_DEFAULTS.previewEnabled);
  });

  it("a fetched value overrides both the default and the cache", async () => {
    localStorage.setItem(FLAGS_CACHE_KEY, JSON.stringify({ feedbackEnabled: false }));
    __resetFlagsForTest();
    mocks.setRemoteDoc({ feedbackEnabled: true });

    await refreshFlags();

    expect(getFlag("feedbackEnabled")).toBe(true);
  });
});

describe("refreshFlags fetch-failure fallback", () => {
  it("keeps defaults when the doc does not exist", async () => {
    mocks.setRemoteDoc(undefined);
    await refreshFlags();
    (Object.keys(FLAG_DEFAULTS) as FlagName[]).forEach((name) => {
      expect(getFlag(name)).toBe(FLAG_DEFAULTS[name]);
    });
  });

  it("keeps cached values when the fetch throws (offline/rules-denied)", async () => {
    localStorage.setItem(FLAGS_CACHE_KEY, JSON.stringify({ previewEnabled: false }));
    __resetFlagsForTest();
    vi.spyOn(mocks.fs, "getDoc").mockRejectedValueOnce(new Error("offline"));

    await expect(refreshFlags()).resolves.toBeUndefined();

    expect(getFlag("previewEnabled")).toBe(false);
  });

  it("ignores unknown keys in the fetched doc rather than adopting them", async () => {
    mocks.setRemoteDoc({ notARealFlag: true } as unknown as Record<string, unknown>);
    await refreshFlags();
    (Object.keys(FLAG_DEFAULTS) as FlagName[]).forEach((name) => {
      expect(getFlag(name)).toBe(FLAG_DEFAULTS[name]);
    });
  });

  it("ignores non-boolean values for known keys", async () => {
    mocks.setRemoteDoc({ feedbackEnabled: "yes" } as unknown as Record<string, unknown>);
    await refreshFlags();
    expect(getFlag("feedbackEnabled")).toBe(FLAG_DEFAULTS.feedbackEnabled);
  });
});

describe("cache round-trip", () => {
  it("persists a fetched value to localStorage for the next boot", async () => {
    mocks.setRemoteDoc({ feedbackEnabled: false });
    await refreshFlags();

    const cached = JSON.parse(localStorage.getItem(FLAGS_CACHE_KEY) || "{}");
    expect(cached.feedbackEnabled).toBe(false);

    // Simulate a fresh page load re-reading the cache with no fetch yet.
    __resetFlagsForTest();
    expect(getFlag("feedbackEnabled")).toBe(false);
  });

  it("survives a corrupted cache blob by falling back to defaults", () => {
    localStorage.setItem(FLAGS_CACHE_KEY, "{not-json");
    __resetFlagsForTest();
    (Object.keys(FLAG_DEFAULTS) as FlagName[]).forEach((name) => {
      expect(getFlag(name)).toBe(FLAG_DEFAULTS[name]);
    });
  });
});

describe("setRemoteFlags (admin write)", () => {
  it("writes the full map and updates local state immediately", async () => {
    const next = { ...FLAG_DEFAULTS, feedbackEnabled: false };
    await setRemoteFlags(next);

    expect(mocks.setDocCalls).toHaveLength(1);
    expect(mocks.setDocCalls[0].path).toBe("appConfig/flags");
    expect(mocks.setDocCalls[0].data).toEqual(next);
    expect(getFlag("feedbackEnabled")).toBe(false);

    const cached = JSON.parse(localStorage.getItem(FLAGS_CACHE_KEY) || "{}");
    expect(cached.feedbackEnabled).toBe(false);
  });
});

describe("useFlag hook", () => {
  it("returns the current in-memory value on initial render", () => {
    const { result } = renderHook(() => useFlag("feedbackEnabled"));
    expect(result.current).toBe(FLAG_DEFAULTS.feedbackEnabled);
  });

  it("re-renders when a background refreshFlags() changes the value", async () => {
    const { result } = renderHook(() => useFlag("previewEnabled"));
    expect(result.current).toBe(true);

    mocks.setRemoteDoc({ previewEnabled: false });
    await act(async () => {
      await refreshFlags();
    });

    expect(result.current).toBe(false);
  });

  it("does not re-render spuriously when the fetched value matches the current one", async () => {
    mocks.setRemoteDoc({ previewEnabled: true });
    const { result } = renderHook(() => useFlag("previewEnabled"));
    expect(result.current).toBe(true);

    await act(async () => {
      await refreshFlags();
    });

    expect(result.current).toBe(true);
  });
});

describe("preview-mode guard", () => {
  it("refreshFlags applies fetched values in-memory but does not write the real localStorage cache", async () => {
    store.enterPreview();
    mocks.setRemoteDoc({ feedbackEnabled: false });

    await refreshFlags();

    // In-memory read reflects the fetch (so the preview sandbox shows what a
    // real student would see)...
    expect(getFlag("feedbackEnabled")).toBe(false);
    // ...but the device's real cache — what a NON-preview session would load
    // on next boot — must be untouched.
    expect(localStorage.getItem(FLAGS_CACHE_KEY)).toBeNull();

    store.exitPreview();
  });

  it("setRemoteFlags updates in-memory state but does not write the real cache while previewing", async () => {
    store.enterPreview();
    const next = { ...FLAG_DEFAULTS, previewEnabled: false };

    await setRemoteFlags(next);

    expect(getFlag("previewEnabled")).toBe(false);
    expect(localStorage.getItem(FLAGS_CACHE_KEY)).toBeNull();

    store.exitPreview();
  });
});
