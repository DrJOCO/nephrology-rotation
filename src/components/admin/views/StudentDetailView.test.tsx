// Admin single-field edits must write ONLY the changed fields. The old
// updateStudent sent the admin's entire snapshot of the student (patients,
// weeklyScores, pre/postScore, srQueue, …), so an edit made from a stale
// roster copy could erase a quiz the student had just synced.
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminStudent, SharedSettings } from "../../../types";
import type { ArticlesData } from "../types";
import { StudentDetailView } from "./StudentDetailView";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeStudent(): AdminStudent {
  return {
    id: "s-1",
    studentId: "stu-1",
    name: "Ana Learner",
    year: "MS3",
    status: "active",
    addedDate: "2026-07-01T08:00:00.000Z",
    patients: [
      { id: "p1", initials: "AB", room: "1", dx: "AKI", topics: [], notes: "", date: "2026-07-01", status: "active", followUps: [] },
    ],
    // Progress the STUDENT owns — a fresh quiz the admin's copy might not
    // even have yet. None of it may ride along on an unrelated admin edit.
    weeklyScores: { 1: [{ correct: 9, total: 10, date: "2026-07-01T12:00:00.000Z", answers: [] }] },
    preScore: { correct: 6, total: 10, date: "2026-07-01T09:00:00.000Z", answers: [] },
    postScore: null,
    srQueue: { q1: { interval: 1, ease: 2.5, due: "2026-07-02", lastReviewed: "2026-07-01" } } as unknown as AdminStudent["srQueue"],
    activityLog: [],
    feedbackTags: [{ tag: "Strong pathophys reasoning", date: "2026-07-01T10:00:00.000Z" }],
    lastSyncedAt: "2026-07-01T12:00:05.000Z",
  };
}

const writeStudentToFirestore = vi.fn();
const setStudents = vi.fn();
const showToast = vi.fn();

function renderView(student: AdminStudent) {
  return render(
    <StudentDetailView
      student={student}
      students={[student]}
      onBack={() => {}}
      setStudents={setStudents}
      writeStudentToFirestore={writeStudentToFirestore}
      recoverStudentToRecord={async () => "stu-1"}
      deleteStudentRecord={async () => {}}
      navigate={() => {}}
      settings={{ duration: "4", rotationStart: "2026-07-01" } as SharedSettings}
      articles={{ 1: [], 2: [], 3: [], 4: [] } as ArticlesData}
      requestConfirm={async () => false}
      showToast={showToast}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("StudentDetailView updateStudent write scope", () => {
  it("writes only the changed field for a training-year edit (no progress snapshot ride-along)", () => {
    renderView(makeStudent());

    // The Training Year select currently shows "MS3".
    const yearSelect = screen.getByDisplayValue("MS3");
    fireEvent.change(yearSelect, { target: { value: "MS4" } });

    expect(writeStudentToFirestore).toHaveBeenCalledTimes(1);
    const [studentId, payload] = writeStudentToFirestore.mock.calls[0] as [string, Record<string, unknown>];
    expect(studentId).toBe("stu-1");
    expect(payload).toEqual({ year: "MS4" });
    // Explicitly: nothing the student owns is overwritten by this edit.
    expect(payload).not.toHaveProperty("weeklyScores");
    expect(payload).not.toHaveProperty("preScore");
    expect(payload).not.toHaveProperty("postScore");
    expect(payload).not.toHaveProperty("patients");
    expect(payload).not.toHaveProperty("srQueue");
  });
});
