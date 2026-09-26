import { describe, expect, it } from "vitest";
import { validatePatientForm, validateQuizScoreEntry } from "./validation";

describe("validatePatientForm", () => {
  it("accepts topics with picklist details", () => {
    const result = validatePatientForm({
      topics: ["AKI", "Hyperkalemia"],
      setting: "icu",
      service: "critical-care",
      hospitalDay: "2-3",
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("accepts a quick log with a single topic and no details", () => {
    const result = validatePatientForm({ topics: ["AKI"] });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("requires at least one patient topic", () => {
    const result = validatePatientForm({ topics: [] });

    expect(result.valid).toBe(false);
    expect(result.errors.topics).toContain("at least 1");
  });

  it("rejects detail values that are not picklist options", () => {
    const result = validatePatientForm({
      topics: ["AKI"],
      setting: "room 4B" as never,
      service: "Dr. Smith's team" as never,
      hospitalDay: "admitted 3/14" as never,
    });

    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual(["hospitalDay", "service", "setting"]);
  });
});

describe("validateQuizScoreEntry", () => {
  it("accepts a normal score", () => {
    expect(validateQuizScoreEntry("18", "25")).toBeNull();
  });

  it("accepts boundary scores (0 correct, all correct, total of 1)", () => {
    expect(validateQuizScoreEntry("0", "25")).toBeNull();
    expect(validateQuizScoreEntry("25", "25")).toBeNull();
    expect(validateQuizScoreEntry("1", "1")).toBeNull();
  });

  it("rejects correct greater than total", () => {
    expect(validateQuizScoreEntry("26", "25")).toMatch(/exceed/i);
  });

  it("rejects negative values", () => {
    expect(validateQuizScoreEntry("-3", "25")).toBeTruthy();
    expect(validateQuizScoreEntry("3", "-25")).toBeTruthy();
  });

  it("rejects a zero or missing total", () => {
    expect(validateQuizScoreEntry("0", "0")).toMatch(/at least 1/i);
    expect(validateQuizScoreEntry("18", "")).toBeTruthy();
    expect(validateQuizScoreEntry("", "25")).toBeTruthy();
  });

  it("rejects non-integer input", () => {
    expect(validateQuizScoreEntry("18.5", "25")).toBeTruthy();
    expect(validateQuizScoreEntry("18", "25.5")).toBeTruthy();
    expect(validateQuizScoreEntry("abc", "25")).toBeTruthy();
    expect(validateQuizScoreEntry("1e3", "25")).toBeTruthy();
  });
});
