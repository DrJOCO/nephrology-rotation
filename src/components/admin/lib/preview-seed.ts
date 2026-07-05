// Seed for the "View as student" preview session. These are the localStorage
// keys StudentApp's load path reads to boot straight into the app (bypassing
// the login screen): name/year/id/joinedAt make studentReadyForApp true, and
// neph_rotationCode points shared-content reads at the previewed rotation so
// Home/Library/Consults show the real published content. Everything here lands
// only in store's in-memory preview map — never real localStorage.
import { JOINED_AT_KEY, STUDENT_YEAR_KEY } from "../../../hooks/useStudentAuth";
import type { Patient } from "../../../types";

// A single, obviously-fake inpatient so the Consults/Home surfaces are
// meaningfully previewable instead of an empty state.
function buildDemoPatient(now: string): Patient {
  return {
    id: "preview-demo-patient",
    initials: "Demo Patient",
    room: "000",
    dx: "AKI — demo case",
    topics: ["AKI"],
    notes: "Example inpatient shown in preview only. Nothing here is saved.",
    date: now,
    status: "active",
    followUps: [],
  };
}

// Build the seed map for store.enterPreview. `rotationCode` should be the
// admin's connected rotation so the preview reads that rotation's real shared
// content; omit it and shared reads fall back to whatever store already holds.
export function buildStudentPreviewSeed(rotationCode: string | null): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    neph_studentId: "preview-student",
    neph_name: "Preview Student",
    [STUDENT_YEAR_KEY]: "MS3",
    [JOINED_AT_KEY]: now,
    neph_patients: [buildDemoPatient(now)],
    ...(rotationCode ? { neph_rotationCode: rotationCode } : {}),
  };
}
