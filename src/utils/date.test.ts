import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dateKey, todayKey } from "./date";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("dateKey", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    // Constructed from local components, so the expected key holds in any timezone.
    expect(dateKey(new Date(2026, 2, 8, 12, 0))).toBe("2026-03-08");
  });

  it("zero-pads single-digit months and days", () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("uses the LOCAL calendar day for late-evening times (the UTC-rollover bug)", () => {
    // 11:30pm local on Mar 8 is already Mar 9 in UTC for any timezone behind
    // UTC — the old toISOString().slice(0,10) keys filed this under the wrong day.
    const lateEvening = new Date(2026, 2, 8, 23, 30);
    expect(dateKey(lateEvening)).toBe("2026-03-08");
  });
});

describe("todayKey", () => {
  it("returns the current local day", () => {
    vi.setSystemTime(new Date(2026, 2, 8, 12, 0));
    expect(todayKey()).toBe("2026-03-08");
  });

  it("re-evaluates per call across midnight (regression: competency cached it at module load)", () => {
    vi.setSystemTime(new Date(2026, 2, 8, 23, 59));
    expect(todayKey()).toBe("2026-03-08");
    vi.setSystemTime(new Date(2026, 2, 9, 0, 1));
    expect(todayKey()).toBe("2026-03-09");
  });
});
