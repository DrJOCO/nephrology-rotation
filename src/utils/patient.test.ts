import { describe, expect, it } from "vitest";
import { countLegacyPatientDetails, legacyPatientDetails, normalizePatients, toDeidentifiedPatient } from "./patient";

const LEGACY_ENTRY = {
  id: 1719800000000,
  initials: "J.S.",
  room: "4B-12",
  dx: "AKI in setting of sepsis",
  topics: ["AKI", "Hyperkalemia"],
  notes: "Teaching point about casts",
  date: "2026-07-01T10:00:00.000Z",
  status: "active",
  followUps: [{ id: 1719900000000, date: "2026-07-02T10:00:00.000Z", note: "Cr improving" }],
  updatedAt: "2026-07-02T10:00:00.000Z",
};

describe("toDeidentifiedPatient", () => {
  it("drops every free-text field from a pre-redesign entry", () => {
    expect(toDeidentifiedPatient(LEGACY_ENTRY)).toEqual({
      id: 1719800000000,
      topics: ["AKI", "Hyperkalemia"],
      date: "2026-07-01T10:00:00.000Z",
      status: "active",
      followUps: [{ id: 1719900000000, date: "2026-07-02T10:00:00.000Z" }],
      updatedAt: "2026-07-02T10:00:00.000Z",
    });
  });

  it("keeps valid picklist details and drops invalid ones", () => {
    const kept = toDeidentifiedPatient({ id: "p1", topics: ["AKI"], setting: "icu", service: "cardiology", hospitalDay: "4-7", date: "", status: "active", followUps: [] });
    expect(kept).toMatchObject({ setting: "icu", service: "cardiology", hospitalDay: "4-7" });

    const junk = toDeidentifiedPatient({ id: "p2", topics: ["AKI"], setting: "Bed 12", service: "Dr. Jones", hospitalDay: "admitted 3/14" });
    expect(junk).not.toHaveProperty("setting");
    expect(junk).not.toHaveProperty("service");
    expect(junk).not.toHaveProperty("hospitalDay");
  });

  it("drops unknown keys (allow-list, not deny-list)", () => {
    const kept = toDeidentifiedPatient({ id: "p3", topics: ["CKD"], mrn: "12345678", patientName: "Jane Doe" });
    expect(Object.keys(kept || {}).sort()).toEqual(["date", "followUps", "id", "status", "topics"]);
  });

  it("folds a legacy single topic into topics", () => {
    expect(toDeidentifiedPatient({ id: "p4", topic: "Hyponatremia" })?.topics).toEqual(["Hyponatremia"]);
    expect(toDeidentifiedPatient({ id: "p5", topic: "Old", topics: ["New"] })?.topics).toEqual(["New"]);
  });

  it("defaults missing status/date/followUps and rejects entries without an id", () => {
    expect(toDeidentifiedPatient({ id: 7, topics: ["AKI"], status: "weird" })).toEqual({ id: 7, topics: ["AKI"], date: "", status: "active", followUps: [] });
    expect(toDeidentifiedPatient({ topics: ["AKI"] })).toBeNull();
    expect(toDeidentifiedPatient({ id: "", topics: ["AKI"] })).toBeNull();
    expect(toDeidentifiedPatient("J.S. room 4")).toBeNull();
  });

  it("is idempotent", () => {
    const once = toDeidentifiedPatient(LEGACY_ENTRY);
    expect(toDeidentifiedPatient(once)).toEqual(once);
  });
});

describe("normalizePatients", () => {
  it("normalizes each entry and drops malformed ones", () => {
    const result = normalizePatients([LEGACY_ENTRY, null, "free text", { id: "ok", topics: ["CKD"] }]);
    expect(result.map(p => p.id)).toEqual([1719800000000, "ok"]);
    expect(result[0]).not.toHaveProperty("initials");
  });

  it("returns an empty list for non-arrays", () => {
    expect(normalizePatients(undefined)).toEqual([]);
    expect(normalizePatients({ id: 1 })).toEqual([]);
  });
});

describe("legacyPatientDetails", () => {
  it("reports exactly the free text that normalization removes", () => {
    expect(legacyPatientDetails(LEGACY_ENTRY)).toEqual({
      initials: "J.S.",
      room: "4B-12",
      dx: "AKI in setting of sepsis",
      notes: "Teaching point about casts",
      followUpNotes: [{ id: 1719900000000, note: "Cr improving" }],
    });
  });

  it("ignores empty legacy fields left by quick logs", () => {
    expect(legacyPatientDetails({ id: 1, initials: "", room: "", dx: "", notes: "  ", topics: ["AKI"], date: "", status: "active", followUps: [] })).toBeNull();
  });

  it("returns null for already de-identified entries", () => {
    expect(legacyPatientDetails({ id: 1, topics: ["AKI"], setting: "floor", date: "", status: "active", followUps: [] })).toBeNull();
  });

  it("captures whole entries that normalization would drop", () => {
    expect(legacyPatientDetails("J.S. room 4")).toEqual({ droppedEntry: "J.S. room 4" });
  });
});

describe("countLegacyPatientDetails", () => {
  it("counts only entries that still hold free text", () => {
    const quickLog = { id: 2, initials: "", topics: ["AKI"] };
    const clean = { id: 3, topics: ["CKD"], service: "medicine" };
    expect(countLegacyPatientDetails([LEGACY_ENTRY, quickLog, clean])).toBe(1);
    expect(countLegacyPatientDetails(undefined)).toBe(0);
  });
});
