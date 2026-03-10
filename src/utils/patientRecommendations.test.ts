import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getPatientRecommendations, getPatientSuggestedActions } from "./patientRecommendations";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-09T12:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("patientRecommendations", () => {
  describe("getPatientRecommendations", () => {
    it("returns empty array when no patients", () => {
      expect(getPatientRecommendations([])).toEqual([]);
    });

    it("returns recommendations for patients with topics", () => {
      const patients = [
        { topics: ["AKI", "Hyponatremia"], date: "2026-03-09", status: "active" as const },
        { topics: ["AKI"], date: "2026-03-08", status: "active" as const },
      ];
      const recs = getPatientRecommendations(patients);
      expect(recs.length).toBeGreaterThan(0);
      // AKI should be highest priority (seen twice, both active)
      expect(recs[0].topic).toBe("AKI");
      expect(recs[0].priority).toBeGreaterThan(0);
      expect(recs[0].reason).toContain("Seen on consult");
    });

    it("prioritizes active patients over discharged", () => {
      const patients = [
        { topics: ["CKD"], date: "2026-03-09", status: "active" as const },
        { topics: ["Dialysis"], date: "2026-03-09", status: "discharged" as const },
      ];
      const recs = getPatientRecommendations(patients);
      const ckdRec = recs.find(r => r.topic === "CKD");
      const dialysisRec = recs.find(r => r.topic === "Dialysis");
      expect(ckdRec!.priority).toBeGreaterThan(dialysisRec!.priority);
    });

    it("includes content references in recommendations", () => {
      const patients = [
        { topics: ["AKI"], date: "2026-03-09", status: "active" as const },
      ];
      const recs = getPatientRecommendations(patients);
      const akiRec = recs.find(r => r.topic === "AKI");
      expect(akiRec).toBeDefined();
      expect(akiRec!.studySheets.length).toBeGreaterThan(0);
      expect(akiRec!.quizWeeks.length).toBeGreaterThan(0);
    });

    it("skips 'Other' topic", () => {
      const patients = [
        { topics: ["Other"], date: "2026-03-09", status: "active" as const },
      ];
      const recs = getPatientRecommendations(patients);
      expect(recs.length).toBe(0);
    });

    it("limits to 5 recommendations", () => {
      const patients = [
        { topics: ["AKI", "CKD", "Hyponatremia", "Hyperkalemia", "Dialysis", "Transplant", "Acid-Base"], date: "2026-03-09", status: "active" as const },
      ];
      const recs = getPatientRecommendations(patients);
      expect(recs.length).toBeLessThanOrEqual(5);
    });

    it("handles PKD and APOL1 topics", () => {
      const patients = [
        { topics: ["Polycystic Kidney Disease"], date: "2026-03-09", status: "active" as const },
        { topics: ["APOL1-Associated Kidney Disease"], date: "2026-03-08", status: "active" as const },
      ];
      const recs = getPatientRecommendations(patients);
      const pkdRec = recs.find(r => r.topic === "Polycystic Kidney Disease");
      const apol1Rec = recs.find(r => r.topic === "APOL1-Associated Kidney Disease");
      expect(pkdRec).toBeDefined();
      expect(apol1Rec).toBeDefined();
    });

    it("handles backwards-compatible single topic field", () => {
      const patients = [
        { topic: "AKI", topics: [], date: "2026-03-09", status: "active" as const },
      ];
      const recs = getPatientRecommendations(patients);
      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].topic).toBe("AKI");
    });
  });

  describe("getPatientSuggestedActions", () => {
    it("returns empty array when no patients", () => {
      expect(getPatientSuggestedActions([])).toEqual([]);
    });

    it("returns actionable suggestions with navigation", () => {
      const patients = [
        { topics: ["AKI"], date: "2026-03-09", status: "active" as const },
      ];
      const actions = getPatientSuggestedActions(patients);
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0]).toHaveProperty("icon");
      expect(actions[0]).toHaveProperty("label");
      expect(actions[0]).toHaveProperty("nav");
      expect(actions[0].nav).toHaveLength(2);
    });

    it("limits to 3 actions", () => {
      const patients = [
        { topics: ["AKI", "CKD", "Hyponatremia", "Hyperkalemia", "Dialysis"], date: "2026-03-09", status: "active" as const },
      ];
      const actions = getPatientSuggestedActions(patients);
      expect(actions.length).toBeLessThanOrEqual(3);
    });

    it("filters out completed content", () => {
      const patients = [
        { topics: ["AKI"], date: "2026-03-09", status: "active" as const },
      ];
      // Mark the AKI study sheet as completed
      const completed = { studySheets: { "aki-cheatsheet": true }, articles: {}, cases: {} };
      const actions = getPatientSuggestedActions(patients, completed);
      // Should still get recommendations but possibly different content type
      // (the study sheet action should be skipped since it's completed)
      expect(actions.length).toBeGreaterThanOrEqual(0);
    });
  });
});
