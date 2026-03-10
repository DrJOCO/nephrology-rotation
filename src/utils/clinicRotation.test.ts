import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getClinicTopicForDate,
  getCurrentOrNextFriday,
  ensureCurrentClinicGuide,
  overrideClinicGuide,
  regenerateClinicGuide,
} from "./clinicRotation";
import type { ClinicGuideRecord } from "../types";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

// ── getClinicTopicForDate ────────────────────────────────────────────

describe("getClinicTopicForDate", () => {
  it("returns CKD for the reference week (2026-01-05)", () => {
    expect(getClinicTopicForDate(new Date("2026-01-05T00:00:00"))).toBe("CKD");
    expect(getClinicTopicForDate(new Date("2026-01-09T00:00:00"))).toBe("CKD"); // Friday same week
  });

  it("returns Transplant for the next week", () => {
    expect(getClinicTopicForDate(new Date("2026-01-12T00:00:00"))).toBe("Transplant");
    expect(getClinicTopicForDate(new Date("2026-01-16T00:00:00"))).toBe("Transplant"); // Friday
  });

  it("returns Hypertension for the third week", () => {
    expect(getClinicTopicForDate(new Date("2026-01-19T00:00:00"))).toBe("Hypertension");
  });

  it("cycles back to CKD after three weeks", () => {
    expect(getClinicTopicForDate(new Date("2026-01-26T00:00:00"))).toBe("CKD");
  });

  it("returns same topic for any day within the same week", () => {
    const mon = getClinicTopicForDate(new Date("2026-01-12T00:00:00")); // Mon
    const wed = getClinicTopicForDate(new Date("2026-01-14T00:00:00")); // Wed
    const fri = getClinicTopicForDate(new Date("2026-01-16T00:00:00")); // Fri
    const sun = getClinicTopicForDate(new Date("2026-01-18T00:00:00")); // Sun
    expect(mon).toBe(wed);
    expect(wed).toBe(fri);
    expect(fri).toBe(sun);
  });

  it("handles dates far in the future", () => {
    const topic = getClinicTopicForDate(new Date("2030-06-15T00:00:00"));
    expect(["CKD", "Transplant", "Hypertension"]).toContain(topic);
  });

  it("handles dates before the reference date", () => {
    const topic = getClinicTopicForDate(new Date("2025-12-29T00:00:00")); // week before ref
    expect(topic).toBe("Hypertension"); // index -1 mod 3 = 2
  });

  it("maintains 3-week cycle over 9 consecutive weeks", () => {
    const results: string[] = [];
    for (let w = 0; w < 9; w++) {
      const d = new Date("2026-01-05T00:00:00");
      d.setDate(d.getDate() + w * 7);
      results.push(getClinicTopicForDate(d));
    }
    expect(results).toEqual([
      "CKD", "Transplant", "Hypertension",
      "CKD", "Transplant", "Hypertension",
      "CKD", "Transplant", "Hypertension",
    ]);
  });
});

// ── getCurrentOrNextFriday ───────────────────────────────────────────

describe("getCurrentOrNextFriday", () => {
  it("returns this Friday when today is Monday", () => {
    const monday = new Date("2026-03-09T00:00:00"); // Monday
    const friday = getCurrentOrNextFriday(monday);
    expect(friday.getDay()).toBe(5);
    expect(friday.toISOString().startsWith("2026-03-13")).toBe(true);
  });

  it("returns this Friday when today is Friday", () => {
    const fri = new Date("2026-03-13T00:00:00"); // Friday
    const result = getCurrentOrNextFriday(fri);
    expect(result.toISOString().startsWith("2026-03-13")).toBe(true);
  });

  it("returns next Friday when today is Saturday", () => {
    const sat = new Date("2026-03-14T00:00:00"); // Saturday
    const result = getCurrentOrNextFriday(sat);
    expect(result.toISOString().startsWith("2026-03-20")).toBe(true);
  });

  it("returns next Friday when today is Sunday", () => {
    const sun = new Date("2026-03-15T00:00:00"); // Sunday
    const result = getCurrentOrNextFriday(sun);
    expect(result.toISOString().startsWith("2026-03-20")).toBe(true);
  });

  it("returns a date with time set to midnight", () => {
    const result = getCurrentOrNextFriday(new Date("2026-03-11T15:30:00"));
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });
});

// ── ensureCurrentClinicGuide ─────────────────────────────────────────

describe("ensureCurrentClinicGuide", () => {
  it("creates a new guide when none exists for this Friday", () => {
    vi.setSystemTime(new Date("2026-03-12T10:00:00")); // Thursday
    const { guides, newGuide } = ensureCurrentClinicGuide([]);
    expect(newGuide).not.toBeNull();
    expect(newGuide!.date).toBe("2026-03-13"); // this Friday
    expect(guides).toHaveLength(1);
    expect(newGuide!.isOverride).toBe(false);
  });

  it("skips creation when guide already exists for this Friday", () => {
    vi.setSystemTime(new Date("2026-03-12T10:00:00"));
    const existing: ClinicGuideRecord[] = [
      { id: "clinic-2026-03-13-CKD", date: "2026-03-13", topic: "CKD", generatedAt: "2026-03-10", isOverride: false },
    ];
    const { guides, newGuide } = ensureCurrentClinicGuide(existing);
    expect(newGuide).toBeNull();
    expect(guides).toHaveLength(1);
  });

  it("preserves existing guides when adding a new one", () => {
    vi.setSystemTime(new Date("2026-03-12T10:00:00"));
    const existing: ClinicGuideRecord[] = [
      { id: "clinic-2026-03-06-Transplant", date: "2026-03-06", topic: "Transplant", generatedAt: "2026-03-05", isOverride: false },
    ];
    const { guides } = ensureCurrentClinicGuide(existing);
    expect(guides).toHaveLength(2);
    expect(guides[0].date).toBe("2026-03-06");
  });

  it("handles empty guide array", () => {
    vi.setSystemTime(new Date("2026-01-07T08:00:00")); // Wednesday in ref week
    const { guides, newGuide } = ensureCurrentClinicGuide([]);
    expect(guides).toHaveLength(1);
    expect(newGuide!.topic).toBe("CKD"); // ref week = CKD
    expect(newGuide!.date).toBe("2026-01-09"); // Friday of ref week
  });

  it("does not depend on patient-specific data", () => {
    vi.setSystemTime(new Date("2026-03-12T10:00:00"));
    // Just call with empty array — no patient info needed
    const { newGuide } = ensureCurrentClinicGuide([]);
    expect(newGuide).toBeTruthy();
    expect(newGuide!.topic).toBeDefined();
  });
});

// ── overrideClinicGuide ──────────────────────────────────────────────

describe("overrideClinicGuide", () => {
  it("replaces topic for a date that has an existing record", () => {
    const existing: ClinicGuideRecord[] = [
      { id: "clinic-2026-03-13-CKD", date: "2026-03-13", topic: "CKD", generatedAt: "2026-03-10", isOverride: false },
    ];
    const result = overrideClinicGuide(existing, "2026-03-13", "Hypertension");
    expect(result).toHaveLength(1);
    expect(result[0].topic).toBe("Hypertension");
    expect(result[0].isOverride).toBe(true);
  });

  it("creates a new entry when no record exists for that date", () => {
    const result = overrideClinicGuide([], "2026-03-20", "Transplant");
    expect(result).toHaveLength(1);
    expect(result[0].topic).toBe("Transplant");
    expect(result[0].isOverride).toBe(true);
  });

  it("does not corrupt other records", () => {
    const existing: ClinicGuideRecord[] = [
      { id: "clinic-2026-03-06-CKD", date: "2026-03-06", topic: "CKD", generatedAt: "2026-03-05", isOverride: false },
      { id: "clinic-2026-03-13-Transplant", date: "2026-03-13", topic: "Transplant", generatedAt: "2026-03-10", isOverride: false },
    ];
    const result = overrideClinicGuide(existing, "2026-03-13", "Hypertension");
    expect(result).toHaveLength(2);
    expect(result[0].topic).toBe("CKD"); // untouched
    expect(result[0].isOverride).toBe(false);
    expect(result[1].topic).toBe("Hypertension"); // overridden
  });
});

// ── regenerateClinicGuide ────────────────────────────────────────────

describe("regenerateClinicGuide", () => {
  it("resets an overridden guide to the rotation topic", () => {
    const existing: ClinicGuideRecord[] = [
      { id: "clinic-2026-01-09-Hypertension", date: "2026-01-09", topic: "Hypertension", generatedAt: "2026-01-08", isOverride: true },
    ];
    const result = regenerateClinicGuide(existing, "2026-01-09");
    expect(result).toHaveLength(1);
    expect(result[0].topic).toBe("CKD"); // ref week = CKD
    expect(result[0].isOverride).toBe(false);
  });

  it("creates a new record if none exists for that date", () => {
    const result = regenerateClinicGuide([], "2026-01-16");
    expect(result).toHaveLength(1);
    expect(result[0].topic).toBe("Transplant"); // ref week + 1
    expect(result[0].isOverride).toBe(false);
  });

  it("does not affect other records", () => {
    const existing: ClinicGuideRecord[] = [
      { id: "clinic-2026-01-09-CKD", date: "2026-01-09", topic: "CKD", generatedAt: "2026-01-07", isOverride: false },
      { id: "clinic-2026-01-16-CKD", date: "2026-01-16", topic: "CKD", generatedAt: "2026-01-14", isOverride: true },
    ];
    const result = regenerateClinicGuide(existing, "2026-01-16");
    expect(result[0].topic).toBe("CKD"); // first record untouched
    expect(result[1].topic).toBe("Transplant"); // reset to correct rotation
  });
});

// ── Thursday scheduling alignment ────────────────────────────────────

describe("Thursday scheduling alignment", () => {
  it("Thursday afternoon generates a guide for the next day (Friday)", () => {
    vi.setSystemTime(new Date("2026-03-12T16:00:00")); // Thursday 4 PM
    const { newGuide } = ensureCurrentClinicGuide([]);
    expect(newGuide).not.toBeNull();
    // Thursday is day 4, so getCurrentOrNextFriday returns this Friday
    expect(newGuide!.date).toBe("2026-03-13");
  });

  it("guide topic on Thursday matches Friday of the same week", () => {
    vi.setSystemTime(new Date("2026-03-12T16:00:00")); // Thursday
    const { newGuide } = ensureCurrentClinicGuide([]);
    const fridayTopic = getClinicTopicForDate(new Date("2026-03-13T00:00:00"));
    expect(newGuide!.topic).toBe(fridayTopic);
  });
});
