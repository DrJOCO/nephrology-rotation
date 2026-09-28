// One-time privacy cleanup for consult entries stored before the picklist
// redesign (D1 / WS-11b). The app already hides their free text on load; this
// removes it from Firestore. Playbook migration rules apply: the admin sees
// counts first, must download a backup of exactly what will be removed, and
// only then can apply. Idempotent — re-running finds nothing left to remove.
import { legacyPatientDetails, toDeidentifiedPatient } from "../../../utils/patient";
import type { StudentWriteResult } from "../../../utils/store";
import type { Patient } from "../../../types";

export interface PatientCleanupStudentPlan {
  studentId: string;
  // Remote updatedAt the plan was built from — the write is guarded against
  // it, so consults a student logs mid-cleanup are merged, not overwritten.
  baseUpdatedAt: string | null;
  patients: Patient[];
  entryCount: number;
}

export interface PatientCleanupBackup {
  kind: "consult-log-free-text-backup";
  createdAt: string;
  rotationCode: string;
  note: string;
  students: Array<{
    studentId: string;
    name: string;
    entries: Array<{ patientId: unknown; removed: Record<string, unknown> }>;
  }>;
}

export interface PatientCleanup {
  plans: PatientCleanupStudentPlan[];
  backup: PatientCleanupBackup;
  totalEntries: number;
}

// `rawDocs` are student docs exactly as stored (store.getStudentsForRotation),
// NOT the admin's normalized roster — normalization already hid the details.
export function buildPatientCleanup(rotationCode: string, rawDocs: Array<Record<string, unknown>>, nowIso: string): PatientCleanup {
  const plans: PatientCleanupStudentPlan[] = [];
  const backup: PatientCleanupBackup = {
    kind: "consult-log-free-text-backup",
    createdAt: nowIso,
    rotationCode,
    note: "Free-text consult details removed from this rotation. Contains patient-identifying text: store securely and delete once the cleanup is confirmed.",
    students: [],
  };
  let totalEntries = 0;

  for (const doc of rawDocs) {
    const studentId = typeof doc.studentId === "string" ? doc.studentId : "";
    if (!studentId || !Array.isArray(doc.patients)) continue;

    const entries: PatientCleanupBackup["students"][number]["entries"] = [];
    const patients: Patient[] = [];
    for (const raw of doc.patients) {
      const removed = legacyPatientDetails(raw);
      const kept = toDeidentifiedPatient(raw);
      if (removed) {
        entries.push({ patientId: kept?.id ?? null, removed });
      }
      // Restamp scrubbed entries so they beat any device's older copy under
      // the per-entry newest-wins merge (a tie keeps the remote copy).
      if (kept) patients.push(removed ? { ...kept, updatedAt: nowIso } : kept);
    }
    if (entries.length === 0) continue;

    totalEntries += entries.length;
    plans.push({
      studentId,
      baseUpdatedAt: typeof doc.updatedAt === "string" ? doc.updatedAt : null,
      patients,
      entryCount: entries.length,
    });
    backup.students.push({ studentId, name: typeof doc.name === "string" ? doc.name : "", entries });
  }

  return { plans, backup, totalEntries };
}

function entryKey(studentId: string, patientId: unknown): string {
  return `${studentId}::${String(patientId)}`;
}

export function patientCleanupKeys(backup: PatientCleanupBackup): Set<string> {
  const keys = new Set<string>();
  for (const student of backup.students) {
    for (const entry of student.entries) keys.add(entryKey(student.studentId, entry.patientId));
  }
  return keys;
}

// Apply re-reads the rotation and rebuilds the plan so it writes fresh data;
// this confirms that fresh plan removes nothing the downloaded backup lacks.
export function isCoveredByBackup(cleanup: PatientCleanup, backupKeys: Set<string>): boolean {
  for (const key of patientCleanupKeys(cleanup.backup)) {
    if (!backupKeys.has(key)) return false;
  }
  return true;
}

export interface PatientCleanupResult {
  applied: number;
  queued: number;
  skipped: number;
}

export async function applyPatientCleanup(
  syncStore: { setStudentData(studentId: string, data: Record<string, unknown>, options?: { baseUpdatedAt: string | null }): Promise<StudentWriteResult> },
  plans: PatientCleanupStudentPlan[],
  nowIso: string,
): Promise<PatientCleanupResult> {
  const result: PatientCleanupResult = { applied: 0, queued: 0, skipped: 0 };
  for (const plan of plans) {
    const write = await syncStore.setStudentData(
      plan.studentId,
      { patients: plan.patients, updatedAt: nowIso },
      { baseUpdatedAt: plan.baseUpdatedAt },
    );
    result[write.status] += 1;
  }
  return result;
}

export function patientCleanupBackupFilename(rotationCode: string, nowIso: string): string {
  const safeCode = rotationCode.replace(/[^A-Za-z0-9-]/g, "_");
  return `consult-log-backup-${safeCode}-${nowIso.slice(0, 10)}.json`;
}
