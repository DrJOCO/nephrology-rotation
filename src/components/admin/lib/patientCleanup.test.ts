import { describe, expect, it } from "vitest";
import { applyPatientCleanup, buildPatientCleanup, isCoveredByBackup, patientCleanupBackupFilename, patientCleanupKeys } from "./patientCleanup";
import type { StudentWriteResult } from "../../../utils/store";

const NOW = "2026-09-26T12:00:00.000Z";

const legacy = (id: number, initials: string) => ({
  id,
  initials,
  room: "4B",
  dx: "AKI",
  topics: ["AKI"],
  notes: "",
  date: "2026-07-01T10:00:00.000Z",
  status: "active",
  followUps: [],
  updatedAt: "2026-07-01T10:00:00.000Z",
});

const docs = () => [
  {
    studentId: "s1",
    name: "Student One",
    updatedAt: "2026-07-10T00:00:00.000Z",
    patients: [legacy(1, "J.S."), { id: 2, topics: ["CKD"], date: "2026-07-02", status: "active", followUps: [], updatedAt: "2026-07-02T00:00:00.000Z" }],
  },
  { studentId: "s2", name: "Student Two", patients: [{ id: 3, initials: "", topics: ["AKI"], date: "", status: "active", followUps: [] }] },
  { studentId: "s3", name: "No patients" },
];

describe("buildPatientCleanup", () => {
  it("plans writes only for students whose stored entries hold free text", () => {
    const cleanup = buildPatientCleanup("GS-26", docs(), NOW);
    expect(cleanup.totalEntries).toBe(1);
    expect(cleanup.plans.map(plan => plan.studentId)).toEqual(["s1"]);
    expect(cleanup.plans[0].baseUpdatedAt).toBe("2026-07-10T00:00:00.000Z");
  });

  it("scrubs and restamps changed entries, leaving clean entries' stamps alone", () => {
    const [plan] = buildPatientCleanup("GS-26", docs(), NOW).plans;
    expect(plan.patients).toEqual([
      { id: 1, topics: ["AKI"], date: "2026-07-01T10:00:00.000Z", status: "active", followUps: [], updatedAt: NOW },
      { id: 2, topics: ["CKD"], date: "2026-07-02", status: "active", followUps: [], updatedAt: "2026-07-02T00:00:00.000Z" },
    ]);
  });

  it("backs up exactly the removed text, keyed by student and entry", () => {
    const { backup } = buildPatientCleanup("GS-26", docs(), NOW);
    expect(backup.rotationCode).toBe("GS-26");
    expect(backup.students).toEqual([
      { studentId: "s1", name: "Student One", entries: [{ patientId: 1, removed: { initials: "J.S.", room: "4B", dx: "AKI" } }] },
    ]);
  });

  it("finds nothing on a second run over its own output (idempotent)", () => {
    const first = buildPatientCleanup("GS-26", docs(), NOW);
    const cleanedDocs = docs().map(doc => {
      const plan = first.plans.find(p => p.studentId === doc.studentId);
      return plan ? { ...doc, patients: plan.patients } : doc;
    });
    expect(buildPatientCleanup("GS-26", cleanedDocs, NOW).totalEntries).toBe(0);
  });
});

describe("isCoveredByBackup", () => {
  it("accepts a fresh plan that removes only backed-up entries", () => {
    const keys = patientCleanupKeys(buildPatientCleanup("GS-26", docs(), NOW).backup);
    expect(isCoveredByBackup(buildPatientCleanup("GS-26", docs(), NOW), keys)).toBe(true);
  });

  it("rejects a fresh plan that would remove text the backup lacks", () => {
    const keys = patientCleanupKeys(buildPatientCleanup("GS-26", docs(), NOW).backup);
    const newer = docs();
    newer[1].patients = [legacy(9, "A.B.")];
    expect(isCoveredByBackup(buildPatientCleanup("GS-26", newer, NOW), keys)).toBe(false);
  });
});

describe("applyPatientCleanup", () => {
  it("writes each plan guarded by its base stamp and tallies results", async () => {
    const calls: Array<{ studentId: string; data: Record<string, unknown>; options?: { baseUpdatedAt: string | null } }> = [];
    const statuses: StudentWriteResult["status"][] = ["applied", "queued"];
    const fakeStore = {
      async setStudentData(studentId: string, data: Record<string, unknown>, options?: { baseUpdatedAt: string | null }): Promise<StudentWriteResult> {
        calls.push({ studentId, data, options });
        return { status: statuses[calls.length - 1] ?? "applied", updatedAt: null };
      },
    };
    const extra = docs();
    extra[1].patients = [legacy(9, "A.B.")];
    const cleanup = buildPatientCleanup("GS-26", extra, NOW);

    const result = await applyPatientCleanup(fakeStore, cleanup.plans, NOW);

    expect(result).toEqual({ applied: 1, queued: 1, skipped: 0 });
    expect(calls.map(call => call.studentId)).toEqual(["s1", "s2"]);
    expect(calls[0].options).toEqual({ baseUpdatedAt: "2026-07-10T00:00:00.000Z" });
    expect(calls[1].options).toEqual({ baseUpdatedAt: null });
    expect(Object.keys(calls[0].data).sort()).toEqual(["patients", "updatedAt"]);
    expect(JSON.stringify(calls.map(call => call.data))).not.toMatch(/initials|room|"dx"|notes/);
  });
});

describe("patientCleanupBackupFilename", () => {
  it("makes a safe, dated filename", () => {
    expect(patientCleanupBackupFilename("GS 26/x", NOW)).toBe("consult-log-backup-GS_26_x-2026-09-26.json");
  });
});
