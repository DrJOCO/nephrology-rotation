// Offline pending-sync queue behavior — the merge/dedup logic that protects
// student work on hospital wifi. The offline suites short-circuit on
// navigator.onLine === false, so Firebase is never touched there; the flush
// clobber-guard suite goes online against the mocked Firestore below.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface FakeSetDocCall {
  path: string;
  data: Record<string, unknown>;
  options?: { merge?: boolean };
}

const mocks = vi.hoisted(() => {
  const DELETE_FIELD = { __deleteField: true };
  const remoteDocs = new Map<string, Record<string, unknown>>();
  const setDocCalls: Array<{ path: string; data: Record<string, unknown>; options?: { merge?: boolean } }> = [];
  const updateDocCalls: Array<{ path: string; data: Record<string, unknown> }> = [];
  const fs = {
    doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
    getDoc: async (ref: { path: string }) => {
      const data = remoteDocs.get(ref.path);
      return { exists: () => data !== undefined, data: () => data };
    },
    setDoc: async (ref: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => {
      setDocCalls.push({ path: ref.path, data, options });
    },
    updateDoc: async (ref: { path: string }, data: Record<string, unknown>) => {
      updateDocCalls.push({ path: ref.path, data });
    },
    deleteField: () => DELETE_FIELD,
  };
  return { remoteDocs, setDocCalls, updateDocCalls, fs };
});

vi.mock("./firebase", () => ({
  getFirebase: async () => ({ db: {}, fs: mocks.fs, auth: {}, authMod: {} }),
  getBootstrapAdminLegacyUids: () => [],
  getCurrentAdminUser: async () => null,
  isBootstrapAdminEmail: () => false,
  waitForAuthUser: async () => null,
}));

import store from "./store";

const PENDING_SYNC_KEY = "neph_pendingSyncQueue";

type QueueItem = {
  kind: string;
  rotationCode: string;
  key?: string;
  studentId?: string;
  data: Record<string, unknown> | unknown[];
  updatedAt: string;
};

function readQueue(): QueueItem[] {
  return JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || "[]");
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-08T12:00:00Z"));
  Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
  store.setRotationCode("TEST-ROT");
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
  store.setRotationCode(null);
  localStorage.clear();
});

describe("offline queueing", () => {
  it("queues a setShared write while offline", async () => {
    await store.setShared("neph_shared_announcements", [{ id: 1, title: "Hi" }]);
    const queue = readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].kind).toBe("setShared");
    expect(queue[0].rotationCode).toBe("TEST-ROT");
    expect(store.getPendingSyncCount()).toBe(1);
  });

  it("does not queue when no rotation code is set", async () => {
    store.setRotationCode(null);
    await store.setShared("neph_shared_announcements", []);
    expect(readQueue()).toHaveLength(0);
  });

  it("dedupes repeat writes to the same scope instead of growing the queue", async () => {
    await store.setStudentData("stu_1", { name: "A" });
    await store.setStudentData("stu_1", { name: "B" });
    await store.setStudentData("stu_1", { name: "C" });
    expect(readQueue()).toHaveLength(1);
    expect(store.getPendingSyncCount()).toBe(1);
  });

  it("merges object payloads key-wise so later partial writes don't drop earlier fields", async () => {
    await store.setStudentData("stu_1", { name: "Ana", points: 10 });
    await store.setStudentData("stu_1", { points: 25 });
    const [item] = readQueue();
    expect(item.data).toEqual({ name: "Ana", points: 25 });
  });

  it("replaces (not concatenates) array payloads for the same shared key", async () => {
    await store.setShared("neph_shared_announcements", [{ id: 1 }, { id: 2 }]);
    await store.setShared("neph_shared_announcements", [{ id: 3 }]);
    const [item] = readQueue();
    expect(item.data).toEqual([{ id: 3 }]);
  });

  it("keeps separate queue entries for different scopes", async () => {
    await store.setShared("neph_shared_announcements", []);
    await store.setShared("neph_shared_curriculum", {});
    await store.setStudentData("stu_1", { name: "A" });
    await store.setStudentData("stu_2", { name: "B" });
    await store.setTeamSnapshot("stu_1", { studentId: "stu_1", points: 5 });
    // 2 shared keys + 2 students + 1 team snapshot (kind differs from student data)
    expect(readQueue()).toHaveLength(5);
  });

  it("advances updatedAt to the latest write when merging", async () => {
    await store.setStudentData("stu_1", { name: "A" });
    vi.setSystemTime(new Date("2026-03-08T13:30:00Z"));
    await store.setStudentData("stu_1", { name: "B" });
    const [item] = readQueue();
    expect(item.updatedAt).toBe("2026-03-08T13:30:00.000Z");
  });

  it("strips the legacy loginPin field before queueing student docs", async () => {
    await store.setShared("neph_shared_student_stu_1", { name: "Ana", loginPin: "1234" });
    const [item] = readQueue();
    expect(item.data).toEqual({ name: "Ana" });
  });
});

describe("flushPendingSyncQueue while offline", () => {
  it("returns the pending count and leaves the queue untouched", async () => {
    await store.setStudentData("stu_1", { name: "A" });
    await store.setShared("neph_shared_announcements", []);
    const remaining = await store.flushPendingSyncQueue();
    expect(remaining).toBe(2);
    expect(readQueue()).toHaveLength(2);
  });

  it("is a no-op on an empty queue", async () => {
    const remaining = await store.flushPendingSyncQueue();
    expect(remaining).toBe(0);
  });
});

// ─── Flush clobber guard ───────────────────────────────────────────
// A device flushing a stale offline queue must not overwrite newer remote
// progress synced by another device (two-device last-write-wins data loss).
const ROTATION = "GS-APR26";
const STUDENT_PATH = `rotations/${ROTATION}/students/stu-1`;
const TEAM_PATH = `rotations/${ROTATION}/team/stu-1`;
const OLDER = "2026-06-01T10:00:00.000Z";
const NEWER = "2026-06-02T10:00:00.000Z";

function seedQueue(items: Array<Record<string, unknown>>): void {
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(items));
}

function studentItem(data: Record<string, unknown>, updatedAt?: string): Record<string, unknown> {
  return { kind: "setStudentData", rotationCode: ROTATION, studentId: "stu-1", data, ...(updatedAt ? { updatedAt } : {}) };
}

function lastStudentWrite(): FakeSetDocCall {
  const writes = mocks.setDocCalls.filter((call) => call.path === STUDENT_PATH);
  expect(writes.length).toBeGreaterThan(0);
  return writes[writes.length - 1];
}

describe("flushPendingSyncQueue clobber guard", () => {
  beforeEach(() => {
    // These suites flush online against the mocked Firestore. Advance the fake
    // clock past NEWER so a merge's fresh updatedAt stamp sorts after it.
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    vi.setSystemTime(new Date("2026-06-03T12:00:00Z"));
    mocks.remoteDocs.clear();
    mocks.setDocCalls.length = 0;
    mocks.updateDocCalls.length = 0;
  });

  it("preserves newer remote fields when flushing a stale queued item", async () => {
    mocks.remoteDocs.set(STUDENT_PATH, {
      updatedAt: NEWER,
      name: "Newer Name",
      preScore: { correct: 9, total: 10, date: NEWER, answers: [] },
      completedItems: { articles: { a1: true, a2: true } },
      bookmarks: { trials: ["t-remote"], articles: [], cases: [], studySheets: [] },
    });
    seedQueue([studentItem({
      name: "Stale Name",
      preScore: null,
      completedItems: { articles: { a1: true } },
      bookmarks: { trials: ["t-stale"], articles: [], cases: [], studySheets: [] },
      updatedAt: OLDER,
    }, OLDER)]);

    const remaining = await store.flushPendingSyncQueue();

    expect(remaining).toBe(0);
    expect(store.getPendingSyncCount()).toBe(0);
    const write = lastStudentWrite();
    expect(write.options).toEqual({ merge: true });
    // Ambiguous fields: newest updatedAt wins → stale values are omitted so
    // the merge write leaves the newer remote copies untouched.
    expect(write.data).not.toHaveProperty("name");
    expect(write.data).not.toHaveProperty("preScore");
    expect(write.data).not.toHaveProperty("bookmarks");
    // Monotonic union still flows through.
    expect(write.data.completedItems).toEqual({ articles: { a1: true, a2: true } });
    // Merge produces a fresh updatedAt newer than the remote's.
    expect(typeof write.data.updatedAt).toBe("string");
    expect(write.data.updatedAt as string > NEWER).toBe(true);
  });

  it("merges completed items monotonically: remote A,B + queued A,C → A,B,C", async () => {
    mocks.remoteDocs.set(STUDENT_PATH, {
      updatedAt: NEWER,
      completedItems: { articles: { A: true, B: true }, studySheets: {} },
    });
    seedQueue([studentItem({
      completedItems: { articles: { A: true, C: true }, studySheets: { s1: true } },
      updatedAt: OLDER,
    }, OLDER)]);

    await store.flushPendingSyncQueue();

    const write = lastStudentWrite();
    expect(write.data.completedItems).toEqual({
      articles: { A: true, B: true, C: true },
      studySheets: { s1: true },
    });
  });

  it("unions progress collections without losing either device's work", async () => {
    mocks.remoteDocs.set(STUDENT_PATH, {
      updatedAt: NEWER,
      patients: [{ id: "p1", initials: "AB", notes: "remote edit" }, { id: "p2", initials: "CD" }],
      weeklyScores: { "1": [{ correct: 5, total: 5, date: NEWER, answers: [] }] },
      activityLog: [{ type: "quiz", label: "Week 1", detail: "", timestamp: NEWER }],
      gamification: { points: 40, achievements: ["first-week"], streaks: { currentDays: 2, longestDays: 2, lastActiveDate: "2026-06-02" } },
    });
    seedQueue([studentItem({
      patients: [{ id: "p1", initials: "AB", notes: "stale edit" }, { id: "p3", initials: "EF" }],
      weeklyScores: { "1": [{ correct: 3, total: 5, date: OLDER, answers: [] }] },
      activityLog: [{ type: "module", label: "AKI", detail: "", timestamp: OLDER }],
      gamification: { points: 25, achievements: ["first-patient"], streaks: { currentDays: 1, longestDays: 1, lastActiveDate: "2026-06-01" } },
      updatedAt: OLDER,
    }, OLDER)]);

    await store.flushPendingSyncQueue();

    const write = lastStudentWrite();
    const patients = write.data.patients as Array<{ id: string; notes?: string }>;
    expect(patients.map((p) => p.id).sort()).toEqual(["p1", "p2", "p3"]);
    // Conflicting patient id: newest updatedAt (remote) wins.
    expect(patients.find((p) => p.id === "p1")?.notes).toBe("remote edit");
    expect(write.data.weeklyScores).toEqual({
      "1": [
        { correct: 5, total: 5, date: NEWER, answers: [] },
        { correct: 3, total: 5, date: OLDER, answers: [] },
      ],
    });
    expect((write.data.activityLog as Array<{ label: string }>).map((entry) => entry.label)).toEqual(["AKI", "Week 1"]);
    const gamification = write.data.gamification as { points: number; achievements: string[] };
    expect(gamification.achievements.sort()).toEqual(["first-patient", "first-week"]);
    // Points are derived → newest updatedAt (remote) wins.
    expect(gamification.points).toBe(40);
  });

  it("writes queued data as-is when the remote doc is older", async () => {
    mocks.remoteDocs.set(STUDENT_PATH, { updatedAt: OLDER, name: "Older Name" });
    seedQueue([studentItem({ name: "Newest Name", updatedAt: NEWER }, NEWER)]);

    await store.flushPendingSyncQueue();

    const write = lastStudentWrite();
    expect(write.data.name).toBe("Newest Name");
    expect(write.data.updatedAt).toBe(NEWER);
  });

  it("writes queued data as-is when there is no remote doc", async () => {
    seedQueue([studentItem({ name: "Only Copy", completedItems: { articles: { A: true } }, updatedAt: OLDER }, OLDER)]);

    const remaining = await store.flushPendingSyncQueue();

    expect(remaining).toBe(0);
    const write = lastStudentWrite();
    expect(write.data.name).toBe("Only Copy");
    expect(write.data.completedItems).toEqual({ articles: { A: true } });
  });

  it("flushes a legacy queue item without updatedAt and protects newer remote fields", async () => {
    mocks.remoteDocs.set(STUDENT_PATH, {
      updatedAt: NEWER,
      name: "Remote Name",
      completedItems: { articles: { A: true } },
    });
    // Legacy items persisted before updatedAt existed on the queue format.
    seedQueue([studentItem({ name: "Legacy Name", completedItems: { articles: { B: true } } })]);

    const remaining = await store.flushPendingSyncQueue();

    expect(remaining).toBe(0);
    expect(store.getPendingSyncCount()).toBe(0);
    const write = lastStudentWrite();
    expect(write.data).not.toHaveProperty("name");
    expect(write.data.completedItems).toEqual({ articles: { A: true, B: true } });
  });

  it("skips the write entirely when every stale queued field is superseded", async () => {
    mocks.remoteDocs.set(STUDENT_PATH, { updatedAt: NEWER, name: "Remote Name" });
    seedQueue([studentItem({ name: "Stale Name", updatedAt: OLDER }, OLDER)]);

    const remaining = await store.flushPendingSyncQueue();

    expect(remaining).toBe(0);
    expect(mocks.setDocCalls.filter((call) => call.path === STUDENT_PATH)).toHaveLength(0);
  });

  it("drops a stale queued team snapshot when the remote snapshot is newer", async () => {
    mocks.remoteDocs.set(TEAM_PATH, { updatedAt: NEWER, points: 40 });
    seedQueue([{
      kind: "setTeamSnapshot",
      rotationCode: ROTATION,
      studentId: "stu-1",
      data: { points: 25, updatedAt: OLDER },
      updatedAt: OLDER,
    }]);

    const remaining = await store.flushPendingSyncQueue();

    expect(remaining).toBe(0);
    expect(mocks.setDocCalls.filter((call) => call.path === TEAM_PATH)).toHaveLength(0);
  });

  it("writes a queued team snapshot when it is newer than the remote", async () => {
    mocks.remoteDocs.set(TEAM_PATH, { updatedAt: OLDER, points: 25 });
    seedQueue([{
      kind: "setTeamSnapshot",
      rotationCode: ROTATION,
      studentId: "stu-1",
      data: { points: 40, updatedAt: NEWER },
      updatedAt: NEWER,
    }]);

    await store.flushPendingSyncQueue();

    const writes = mocks.setDocCalls.filter((call) => call.path === TEAM_PATH);
    expect(writes).toHaveLength(1);
    expect(writes[0].data.points).toBe(40);
  });

  it("keeps a failed merge-then-write in the queue so the 30s retry loop can re-flush it", async () => {
    // useStudentSync polls flushPendingSyncQueue every 30s while anything is
    // queued — a transient write failure after a merge must stay queued.
    mocks.remoteDocs.set(STUDENT_PATH, {
      updatedAt: NEWER,
      completedItems: { articles: { A: true } },
    });
    seedQueue([studentItem({ completedItems: { articles: { B: true } }, updatedAt: OLDER }, OLDER)]);

    const failingSetDoc = vi.spyOn(mocks.fs, "setDoc").mockRejectedValueOnce(new Error("transient"));
    const remainingAfterFailure = await store.flushPendingSyncQueue();
    expect(remainingAfterFailure).toBe(1);
    expect(readQueue()).toHaveLength(1);
    failingSetDoc.mockRestore();

    // Next poll retries the same queued item; the guard re-reads remote and
    // re-merges before writing.
    const remainingAfterRetry = await store.flushPendingSyncQueue();
    expect(remainingAfterRetry).toBe(0);
    const write = lastStudentWrite();
    expect(write.data.completedItems).toEqual({ articles: { A: true, B: true } });
  });
});
