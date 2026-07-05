import { describe, expect, it } from "vitest";
import { detectPotentialPhi, validateFollowUp, validatePatientForm, validateQuizScoreEntry } from "./validation";

describe("validation", () => {
  it("allows normal educational patient entries", () => {
    const result = validatePatientForm({
      initials: "J.S.",
      room: "4B-12",
      dx: "AKI in the setting of sepsis",
      topics: ["AKI", "Hyperkalemia"],
      notes: "Teaching point about urine sediment",
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("flags likely PHI in diagnosis and notes", () => {
    const result = validatePatientForm({
      initials: "J.S.",
      room: "4B-12",
      dx: "DOB 03/14/1990 with AKI",
      topics: ["AKI", "Hyperkalemia"],
      notes: "MRN 12345678",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.dx).toBeTruthy();
    expect(result.errors.notes).toBeTruthy();
  });

  it("requires at least one patient topic", () => {
    const result = validatePatientForm({
      initials: "J.S.",
      room: "4B-12",
      dx: "AKI in the setting of sepsis",
      topics: [],
      notes: "",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.topics).toContain("at least 1");
  });

  it("accepts a quick log with a single topic and no initials", () => {
    const result = validatePatientForm({
      initials: "",
      room: "",
      dx: "",
      topics: ["AKI"],
      notes: "",
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("still validates initials format when initials are provided", () => {
    const result = validatePatientForm({
      initials: "J5!",
      room: "",
      dx: "",
      topics: ["AKI"],
      notes: "",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.initials).toBeTruthy();
  });

  it("detects contact details as likely PHI", () => {
    expect(detectPotentialPhi("Call 555-123-4567")).toBeTruthy();
    expect(detectPotentialPhi("email me at test@example.com")).toBeTruthy();
  });

  it("applies PHI validation to follow-up notes", () => {
    const result = validateFollowUp("DOB 03/14/1990");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
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
