import { describe, expect, it } from "vitest";
import { detectPotentialPhi, validateFollowUp, validatePatientForm } from "./validation";

describe("validation", () => {
  it("allows normal educational patient entries", () => {
    const result = validatePatientForm({
      initials: "J.S.",
      room: "4B-12",
      dx: "AKI in the setting of sepsis",
      topics: ["AKI"],
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
      topics: ["AKI"],
      notes: "MRN 12345678",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.dx).toBeTruthy();
    expect(result.errors.notes).toBeTruthy();
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
