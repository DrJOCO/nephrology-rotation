// Device Recovery safety — the merged record must never contain undefined
// fields (Firestore rejects the whole write), and the source record must only
// be deleted after the target write is confirmed applied. A queued/failed
// write followed by deletion would destroy the student's only progress copy.
import { describe, expect, it, vi } from "vitest";
import type { AdminStudent } from "../../../types";
import { buildRecoveredStudent, performStudentRecovery, type RecoverySyncStore, type StudentWriteStatus } from "./student-recovery";

function makeStudent(overrides: Partial<AdminStudent> = {}): AdminStudent {
  return {
    id: "1",
    studentId: "stu-old-device",
    name: "Ana",
    status: "active",
    addedDate: "2026-06-01T00:00:00.000Z",
    patients: [],
    weeklyScores: {},
    preScore: null,
    postScore: null,
    srQueue: {},
    activityLog: [],
    ...overrides,
  };
}

function makeFakeStore(status: StudentWriteStatus) {
  const calls: string[] = [];
  const fake = {
    calls,
    setStudentData: vi.fn(async (studentId: string) => {
      calls.push(`set:${studentId}`);
      return {
        status,
        updatedAt: status === "applied" ? "2026-06-06T00:00:00.000Z" : null,
      };
    }),
    setTeamSnapshot: vi.fn(async () => {}),
    deleteStudentData: vi.fn(async (studentId: string) => {
      calls.push(`delete:${studentId}`);
    }),
    clearStudentTombstone: vi.fn(async (studentId: string) => {
      calls.push(`clearTombstone:${studentId}`);
    }),
  };
  return fake as RecoverySyncStore & typeof fake;
}

describe("buildRecoveredStudent", () => {
  it("defaults completedItems and bookmarks to empty structures, never undefined", () => {
    // Common case: student never bookmarked or completed anything on either device.
    const merged = buildRecoveredStudent(makeStudent(), makeStudent({ id: "2", studentId: "stu-new-device" }));

    expect(merged.completedItems).toEqual({
      articles: {},
      studySheets: {},
      cases: {},
      decks: {},
      consultTopics: {},
    });
    expect(merged.bookmarks).toEqual({ trials: [], articles: [], cases: [], studySheets: [] });
  });

  it("still unions real progress from both records", () => {
    const source = makeStudent({
      completedItems: { articles: { a1: true }, studySheets: {}, cases: {} },
      bookmarks: { trials: ["t1"], articles: [], cases: [], studySheets: [] },
    });
    const target = makeStudent({
      id: "2",
      studentId: "stu-new-device",
      completedItems: { articles: { a2: true }, studySheets: {}, cases: {} },
      bookmarks: { trials: ["t2"], articles: [], cases: [], studySheets: [] },
    });

    const merged = buildRecoveredStudent(source, target);

    expect(merged.completedItems?.articles).toEqual({ a1: true, a2: true });
    expect(merged.bookmarks?.trials.sort()).toEqual(["t1", "t2"]);
  });
});

describe("performStudentRecovery", () => {
  const source = makeStudent({ preScore: { correct: 7, total: 10, date: "2026-06-05T00:00:00.000Z", answers: [] } });
  const target = makeStudent({ id: "2", studentId: "stu-new-device" });

  it("writes merged data, then snapshot, then deletes the source on a confirmed write", async () => {
    const fake = makeFakeStore("applied");

    const merged = await performStudentRecovery(fake, source, target, () => ({ studentId: target.studentId }));

    expect(fake.setStudentData).toHaveBeenCalledWith("stu-new-device", expect.objectContaining({
      preScore: source.preScore,
      completedItems: { articles: {}, studySheets: {}, cases: {}, decks: {}, consultTopics: {} },
      bookmarks: { trials: [], articles: [], cases: [], studySheets: [] },
    }));
    expect(fake.setTeamSnapshot).toHaveBeenCalledWith("stu-new-device", { studentId: "stu-new-device" });
    expect(fake.deleteStudentData).toHaveBeenCalledWith("stu-old-device");
    expect(merged.preScore).toEqual(source.preScore);
  });

  it("clears the target's tombstone before writing, and only tombstones the source via delete", async () => {
    const fake = makeFakeStore("applied");

    await performStudentRecovery(fake, source, target, () => ({}));

    // Order matters: a leftover tombstone on the target would make the rules
    // reject the merged write, and the source delete (which tombstones it)
    // must come only after the confirmed write.
    expect(fake.calls).toEqual(["clearTombstone:stu-new-device", "set:stu-new-device", "delete:stu-old-device"]);
    expect(fake.clearStudentTombstone).not.toHaveBeenCalledWith("stu-old-device");
  });

  it("does NOT delete the source when the target write only got queued (regression)", async () => {
    const fake = makeFakeStore("queued");

    await expect(performStudentRecovery(fake, source, target, () => ({}))).rejects.toThrow(/could not be confirmed/i);

    expect(fake.deleteStudentData).not.toHaveBeenCalled();
    expect(fake.setTeamSnapshot).not.toHaveBeenCalled();
  });

  it("does NOT delete the source when the write was skipped entirely", async () => {
    const fake = makeFakeStore("skipped");

    await expect(performStudentRecovery(fake, source, target, () => ({}))).rejects.toThrow();

    expect(fake.deleteStudentData).not.toHaveBeenCalled();
  });
});
