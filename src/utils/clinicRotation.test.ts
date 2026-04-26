import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getClinicTopicForDate,
  getClinicTopicsForDate,
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

describe("clinic topic set", () => {
  it("returns all three outpatient clinic tracks every week", () => {
    expect(getClinicTopicsForDate(new Date("2026-01-09T00:00:00"))).toEqual(["CKD", "Hypertension", "Transplant"]);
    expect(getClinicTopicsForDate(new Date("2030-06-15T00:00:00"))).toEqual(["CKD", "Hypertension", "Transplant"]);
  });

  it("keeps CKD as the backward-compatible primary clinic topic", () => {
    expect(getClinicTopicForDate(new Date("2026-01-09T00:00:00"))).toBe("CKD");
    expect(getClinicTopicForDate(new Date("2026-01-16T00:00:00"))).toBe("CKD");
  });
});

describe("getCurrentOrNextFriday", () => {
  it("returns this Friday when today is Monday", () => {
    const monday = new Date("2026-03-09T00:00:00");
    const friday = getCurrentOrNextFriday(monday);
    expect(friday.getDay()).toBe(5);
    expect(friday.toISOString().startsWith("2026-03-13")).toBe(true);
  });

  it("returns this Friday when today is Friday", () => {
    const fri = new Date("2026-03-13T00:00:00");
    const result = getCurrentOrNextFriday(fri);
    expect(result.toISOString().startsWith("2026-03-13")).toBe(true);
  });

  it("returns next Friday when today is Saturday or Sunday", () => {
    expect(getCurrentOrNextFriday(new Date("2026-03-14T00:00:00")).toISOString().startsWith("2026-03-20")).toBe(true);
    expect(getCurrentOrNextFriday(new Date("2026-03-15T00:00:00")).toISOString().startsWith("2026-03-20")).toBe(true);
  });

  it("returns a date with time set to midnight", () => {
    const result = getCurrentOrNextFriday(new Date("2026-03-11T15:30:00"));
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });
});

describe("ensureCurrentClinicGuide", () => {
  it("creates all three clinic guides when none exist for this Friday", () => {
    vi.setSystemTime(new Date("2026-03-12T10:00:00"));
    const { guides, newGuide, newGuides } = ensureCurrentClinicGuide([]);
    expect(newGuide).not.toBeNull();
    expect(newGuide!.date).toBe("2026-03-13");
    expect(newGuides.map((guide) => guide.topic)).toEqual(["CKD", "Hypertension", "Transplant"]);
    expect(guides).toHaveLength(3);
    expect(guides.every((guide) => guide.isOverride === false)).toBe(true);
  });

  it("backfills missing topics when an older single guide already exists", () => {
    vi.setSystemTime(new Date("2026-03-12T10:00:00"));
    const existing: ClinicGuideRecord[] = [
      { id: "clinic-2026-03-13-CKD", date: "2026-03-13", topic: "CKD", generatedAt: "2026-03-10", isOverride: false },
    ];
    const { guides, newGuides } = ensureCurrentClinicGuide(existing);
    expect(newGuides.map((guide) => guide.topic)).toEqual(["Hypertension", "Transplant"]);
    expect(guides.map((guide) => guide.topic)).toEqual(["CKD", "Hypertension", "Transplant"]);
  });

  it("skips creation when all three guides already exist", () => {
    vi.setSystemTime(new Date("2026-03-12T10:00:00"));
    const existing: ClinicGuideRecord[] = ["CKD", "Hypertension", "Transplant"].map((topic) => ({
      id: `clinic-2026-03-13-${topic}`,
      date: "2026-03-13",
      topic: topic as ClinicGuideRecord["topic"],
      generatedAt: "2026-03-10",
      isOverride: false,
    }));
    const { guides, newGuide, newGuides } = ensureCurrentClinicGuide(existing);
    expect(newGuide).toBeNull();
    expect(newGuides).toEqual([]);
    expect(guides).toHaveLength(3);
  });

  it("preserves existing guides from other dates", () => {
    vi.setSystemTime(new Date("2026-03-12T10:00:00"));
    const existing: ClinicGuideRecord[] = [
      { id: "clinic-2026-03-06-Transplant", date: "2026-03-06", topic: "Transplant", generatedAt: "2026-03-05", isOverride: false },
    ];
    const { guides } = ensureCurrentClinicGuide(existing);
    expect(guides).toHaveLength(4);
    expect(guides[0].date).toBe("2026-03-06");
  });
});

describe("overrideClinicGuide", () => {
  it("marks one topic record as overridden without removing sibling clinic topics", () => {
    const existing: ClinicGuideRecord[] = [
      { id: "clinic-2026-03-13-CKD", date: "2026-03-13", topic: "CKD", generatedAt: "2026-03-10", isOverride: false },
      { id: "clinic-2026-03-13-Hypertension", date: "2026-03-13", topic: "Hypertension", generatedAt: "2026-03-10", isOverride: false },
      { id: "clinic-2026-03-13-Transplant", date: "2026-03-13", topic: "Transplant", generatedAt: "2026-03-10", isOverride: false },
    ];
    const result = overrideClinicGuide(existing, "2026-03-13", "Hypertension");
    expect(result).toHaveLength(3);
    expect(result.find((guide) => guide.topic === "Hypertension")?.isOverride).toBe(true);
    expect(result.find((guide) => guide.topic === "CKD")?.isOverride).toBe(false);
  });

  it("creates a topic record when no record exists for that date/topic", () => {
    const result = overrideClinicGuide([], "2026-03-20", "Transplant");
    expect(result).toHaveLength(1);
    expect(result[0].topic).toBe("Transplant");
    expect(result[0].isOverride).toBe(true);
  });
});

describe("regenerateClinicGuide", () => {
  it("resets a Friday to the standard three clinic topic records", () => {
    const existing: ClinicGuideRecord[] = [
      { id: "clinic-2026-01-09-Hypertension", date: "2026-01-09", topic: "Hypertension", generatedAt: "2026-01-08", isOverride: true },
    ];
    const result = regenerateClinicGuide(existing, "2026-01-09");
    expect(result.map((guide) => guide.topic)).toEqual(["CKD", "Hypertension", "Transplant"]);
    expect(result.every((guide) => guide.isOverride === false)).toBe(true);
  });

  it("does not affect records from other dates", () => {
    const existing: ClinicGuideRecord[] = [
      { id: "clinic-2026-01-09-CKD", date: "2026-01-09", topic: "CKD", generatedAt: "2026-01-07", isOverride: false },
      { id: "clinic-2026-01-16-CKD", date: "2026-01-16", topic: "CKD", generatedAt: "2026-01-14", isOverride: true },
    ];
    const result = regenerateClinicGuide(existing, "2026-01-16");
    expect(result.filter((guide) => guide.date === "2026-01-09")).toHaveLength(1);
    expect(result.filter((guide) => guide.date === "2026-01-16")).toHaveLength(3);
  });
});
