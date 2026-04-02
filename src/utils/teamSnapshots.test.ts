import { describe, expect, it } from "vitest";
import { buildTeamSnapshot, sortTopicCounts } from "./teamSnapshots";

describe("teamSnapshots", () => {
  it("builds a sanitized team snapshot from patient counts and topic mix", () => {
    const snapshot = buildTeamSnapshot({
      studentId: "stu_123",
      name: "A Student",
      points: 88,
      patients: [
        { id: 1, initials: "J.S.", room: "4B", dx: "AKI", topics: ["AKI", "Hyponatremia"], notes: "", date: "2026-03-01", status: "active", followUps: [] },
        { id: 2, initials: "L.M.", room: "", dx: "CKD", topics: ["CKD", "Other"], notes: "", date: "2026-03-02", status: "discharged", followUps: [] },
      ],
    });

    expect(snapshot.studentId).toBe("stu_123");
    expect(snapshot.name).toBe("A Student");
    expect(snapshot.points).toBe(88);
    expect(snapshot.patientCount).toBe(2);
    expect(snapshot.activePatientCount).toBe(1);
    expect(snapshot.dischargedPatientCount).toBe(1);
    expect(snapshot.topicCounts).toEqual({
      AKI: 1,
      Hyponatremia: 1,
      CKD: 1,
    });
  });

  it("falls back to Unknown when name is blank", () => {
    const snapshot = buildTeamSnapshot({
      studentId: "stu_456",
      name: "   ",
      points: 0,
    });

    expect(snapshot.name).toBe("Unknown");
    expect(snapshot.patientCount).toBe(0);
  });

  it("sorts topic counts by frequency then alphabetically", () => {
    const sorted = sortTopicCounts({
      CKD: 1,
      AKI: 2,
      Dialysis: 2,
    });

    expect(sorted).toEqual([
      { topic: "AKI", count: 2 },
      { topic: "Dialysis", count: 2 },
      { topic: "CKD", count: 1 },
    ]);
  });
});
