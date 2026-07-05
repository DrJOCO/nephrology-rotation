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

  it("reports setShared as queued (not applied) while offline", async () => {
    const result = await store.setShared("neph_shared_announcements", [{ id: 1 }]);
    expect(result).toEqual({ applied: false, queued: true });
  });

  it("reports setShared as neither applied nor queued when no rotation is connected", async () => {
    store.setRotationCode(null);
    const result = await store.setShared("neph_shared_announcements", []);
    expect(result).toEqual({ applied: false, queued: false });
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
    // Ambiguous scalar: newest updatedAt wins → the stale value is omitted so
    // the merge write leaves the newer remote copy untouched.
    expect(write.data).not.toHaveProperty("name");
    // Queued preScore is null (no offline quiz work) → remote's real score
    // wins and the field is omitted from the write.
    expect(write.data).not.toHaveProperty("preScore");
    // Bookmarks are real curation work: union instead of dropping the queued
    // adds (finding: offline scalar work must survive a mere app-open echo).
    expect(write.data.bookmarks).toEqual({ trials: ["t-remote", "t-stale"], articles: [], cases: [], studySheets: [] });
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

  it("reports setShared as applied when the online write reaches Firestore", async () => {
    const result = await store.setShared("neph_shared_announcements", [{ id: 1 }]);
    expect(result).toEqual({ applied: true, queued: false });
    expect(mocks.updateDocCalls.some((call) => "announcements" in call.data)).toBe(true);
    expect(readQueue()).toHaveLength(0);
  });

  it("reports setShared as queued when the online write throws", async () => {
    const failing = vi.spyOn(mocks.fs, "updateDoc").mockRejectedValueOnce(new Error("wifi dropped"));
    const result = await store.setShared("neph_shared_curriculum", { title: "AKI" });
    failing.mockRestore();
    expect(result).toEqual({ applied: false, queued: true });
    // The failed write is parked in the retry queue, not silently lost.
    expect(readQueue().some((item) => item.key === "neph_shared_curriculum")).toBe(true);
  });

  it("keeps a stale direct write out of the loop too: guarded setStudentData queued offline flushes merged", async () => {
    // A guarded auto-save that went to the offline queue carries its base
    // stamp, so the flush guard later merges against anything the device
    // never incorporated instead of trusting the fresh-looking payload.
    store.setRotationCode(ROTATION);
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    const result = await store.setStudentData("stu-1", {
      name: "Stale Name",
      completedItems: { articles: { B: true } },
      updatedAt: "2026-06-03T12:00:00.000Z",
    }, { baseUpdatedAt: OLDER });
    expect(result).toEqual({ status: "queued", updatedAt: null });
    const [queuedItem] = readQueue();
    expect(queuedItem.updatedAt).toBe(OLDER);

    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    mocks.remoteDocs.set(STUDENT_PATH, {
      updatedAt: NEWER,
      name: "Remote Name",
      completedItems: { articles: { A: true } },
    });
    const remaining = await store.flushPendingSyncQueue();

    expect(remaining).toBe(0);
    const write = lastStudentWrite();
    expect(write.data).not.toHaveProperty("name");
    expect(write.data.completedItems).toEqual({ articles: { A: true, B: true } });
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

// ─── Direct-write clobber guard ────────────────────────────────────
// The debounced auto-save and logout flush call setStudentData directly (no
// offline queue involved). A stale device stamps that payload with a fresh
// updatedAt, so staleness is judged against baseUpdatedAt — the remote stamp
// the device last incorporated — not against the payload's own stamp.
describe("setStudentData clobber guard (direct auto-save/flush path)", () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    vi.setSystemTime(new Date("2026-06-03T12:00:00Z"));
    store.setRotationCode(ROTATION);
    mocks.remoteDocs.clear();
    mocks.setDocCalls.length = 0;
    mocks.updateDocCalls.length = 0;
  });

  it("merges instead of overwriting when a stale device opens after another device advanced the cloud", async () => {
    mocks.remoteDocs.set(STUDENT_PATH, {
      updatedAt: NEWER,
      name: "Newer Name",
      preScore: { correct: 9, total: 10, date: NEWER, answers: [] },
      patients: [{ id: "p1", initials: "AB", notes: "remote edit" }, { id: "p2", initials: "CD" }],
      weeklyScores: { "1": [{ correct: 5, total: 5, date: NEWER, answers: [] }] },
      activityLog: [{ type: "quiz", label: "Week 1", detail: "", timestamp: NEWER }],
      completedItems: { articles: { a1: true, a2: true } },
      gamification: { points: 40, achievements: ["first-week"], streaks: { currentDays: 2, longestDays: 2, lastActiveDate: "2026-06-02" } },
      reflections: [{ id: "r2", dayKey: "2026-06-02" }],
      bookmarks: { trials: ["t-remote"], articles: [], cases: [], studySheets: [] },
    });

    // The stale device's post-hydration auto-save: localStorage snapshot from
    // OLDER, but stamped with a fresh updatedAt (this is what defeated the
    // listener's staleness gate before the guard).
    const written = await store.setStudentData("stu-1", {
      name: "Stale Name",
      preScore: null,
      patients: [{ id: "p1", initials: "AB", notes: "stale edit" }, { id: "p3", initials: "EF" }],
      weeklyScores: { "1": [{ correct: 3, total: 5, date: OLDER, answers: [] }] },
      activityLog: [{ type: "module", label: "AKI", detail: "", timestamp: OLDER }],
      completedItems: { articles: { a1: true, a3: true } },
      gamification: { points: 25, achievements: ["first-patient"], streaks: { currentDays: 1, longestDays: 1, lastActiveDate: "2026-06-01" } },
      reflections: [{ id: "r1", dayKey: "2026-06-01" }],
      bookmarks: { trials: ["t-stale"], articles: [], cases: [], studySheets: [] },
      updatedAt: "2026-06-03T12:00:00.000Z",
    }, { baseUpdatedAt: OLDER });

    const write = lastStudentWrite();
    expect(write.options).toEqual({ merge: true });
    // Ambiguous scalar: newest updatedAt wins → the stale copy is omitted
    // so the merge write leaves the newer remote value untouched.
    expect(write.data).not.toHaveProperty("name");
    // Local preScore is null (no local quiz work) → remote's real score wins
    // and the field is omitted.
    expect(write.data).not.toHaveProperty("preScore");
    // Bookmark adds from the stale device are unioned in, not dropped.
    expect(write.data.bookmarks).toEqual({ trials: ["t-remote", "t-stale"], articles: [], cases: [], studySheets: [] });
    // Progress collections union: nothing from either device is lost.
    const patients = write.data.patients as Array<{ id: string; notes?: string }>;
    expect(patients.map((p) => p.id).sort()).toEqual(["p1", "p2", "p3"]);
    expect(patients.find((p) => p.id === "p1")?.notes).toBe("remote edit");
    expect(write.data.completedItems).toEqual({ articles: { a1: true, a2: true, a3: true } });
    expect((write.data.weeklyScores as Record<string, unknown[]>)["1"]).toHaveLength(2);
    expect((write.data.activityLog as Array<{ label: string }>).map((e) => e.label)).toEqual(["AKI", "Week 1"]);
    expect((write.data.reflections as Array<{ id: string }>).map((r) => r.id).sort()).toEqual(["r1", "r2"]);
    const gamification = write.data.gamification as { points: number; achievements: string[] };
    expect(gamification.achievements.sort()).toEqual(["first-patient", "first-week"]);
    expect(gamification.points).toBe(40);
    // The merged doc gets a fresh stamp (returned so the hook can advance its
    // base) that other devices' staleness gates will accept.
    expect(typeof write.data.updatedAt).toBe("string");
    expect(write.data.updatedAt as string > NEWER).toBe(true);
    expect(written).toEqual({ status: "applied", updatedAt: write.data.updatedAt });
  });

  it("merges a logout flush from a device that never received a snapshot (base null)", async () => {
    mocks.remoteDocs.set(STUDENT_PATH, {
      updatedAt: NEWER,
      name: "Newer Name",
      completedItems: { articles: { a1: true, a2: true } },
    });

    await store.setStudentData("stu-1", {
      name: "Stale Name",
      completedItems: { articles: { a3: true } },
      updatedAt: "2026-06-03T12:00:00.000Z",
    }, { baseUpdatedAt: null });

    const write = lastStudentWrite();
    expect(write.data).not.toHaveProperty("name");
    expect(write.data.completedItems).toEqual({ articles: { a1: true, a2: true, a3: true } });
  });

  it("writes as-is when the device already incorporates the remote doc (base == remote stamp)", async () => {
    mocks.remoteDocs.set(STUDENT_PATH, { updatedAt: NEWER, name: "Old Name" });

    const written = await store.setStudentData("stu-1", {
      name: "New Name",
      updatedAt: "2026-06-03T12:00:00.000Z",
    }, { baseUpdatedAt: NEWER });

    const write = lastStudentWrite();
    expect(write.data.name).toBe("New Name");
    expect(written).toEqual({ status: "applied", updatedAt: "2026-06-03T12:00:00.000Z" });
  });

  it("writes as-is on the first ever sync (no remote doc)", async () => {
    const written = await store.setStudentData("stu-1", {
      name: "Only Copy",
      updatedAt: "2026-06-03T12:00:00.000Z",
    }, { baseUpdatedAt: null });

    const write = lastStudentWrite();
    expect(write.data.name).toBe("Only Copy");
    expect(written).toEqual({ status: "applied", updatedAt: "2026-06-03T12:00:00.000Z" });
  });

  it("leaves unguarded callers (profile/admin writes) at last-write-wins without a remote read", async () => {
    mocks.remoteDocs.set(STUDENT_PATH, { updatedAt: NEWER, name: "Remote Name" });
    const getDocSpy = vi.spyOn(mocks.fs, "getDoc");

    await store.setStudentData("stu-1", { name: "Admin Override", updatedAt: OLDER });

    expect(getDocSpy).not.toHaveBeenCalled();
    const write = lastStudentWrite();
    expect(write.data.name).toBe("Admin Override");
    getDocSpy.mockRestore();
  });

  it("exposes the cached student doc stamp as the cold-start guard base", () => {
    expect(store.getCachedStudentUpdatedAt("stu-1")).toBeNull();
    localStorage.setItem(`neph_rotation_${ROTATION}_student_stu-1`, JSON.stringify({ updatedAt: NEWER, name: "Cached" }));
    expect(store.getCachedStudentUpdatedAt("stu-1")).toBe(NEWER);
  });
});

// ─── Offline scalar work preservation ──────────────────────────────
// The doc-level updatedAt is inflated by routine app-open auto-saves, so it
// must not decide whether a student's offline quiz or bookmark work survives.
// Quiz scores are compared by their own `date`; bookmarks are unioned.
describe("flush guard preserves real offline scalar work", () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    vi.setSystemTime(new Date("2026-06-03T12:00:00Z"));
    store.setRotationCode(ROTATION);
    mocks.remoteDocs.clear();
    mocks.setDocCalls.length = 0;
    mocks.updateDocCalls.length = 0;
  });

  it("keeps an offline pre-test when the remote doc is fresher only from an app-open echo", async () => {
    // Another device opened the app (fresh updatedAt, no quiz work, preScore
    // still null); this device took the pre-test offline.
    mocks.remoteDocs.set(STUDENT_PATH, { updatedAt: NEWER, preScore: null, name: "Same Name" });
    const offlineScore = { correct: 8, total: 10, date: OLDER, answers: [] };
    seedQueue([studentItem({ preScore: offlineScore, updatedAt: OLDER }, OLDER)]);

    const remaining = await store.flushPendingSyncQueue();

    expect(remaining).toBe(0);
    const write = lastStudentWrite();
    expect(write.data.preScore).toEqual(offlineScore);
  });

  it("keeps an offline post-test the remote doc has never seen", async () => {
    mocks.remoteDocs.set(STUDENT_PATH, { updatedAt: NEWER, name: "Same Name" });
    const offlineScore = { correct: 7, total: 10, date: OLDER, answers: [] };
    seedQueue([studentItem({ postScore: offlineScore, updatedAt: OLDER }, OLDER)]);

    await store.flushPendingSyncQueue();

    const write = lastStudentWrite();
    expect(write.data.postScore).toEqual(offlineScore);
  });

  it("resolves conflicting quiz scores by the score's own date, not the doc stamp", async () => {
    const remoteScore = { correct: 5, total: 10, date: "2026-06-01T09:00:00.000Z", answers: [] };
    const queuedScore = { correct: 9, total: 10, date: "2026-06-01T15:00:00.000Z", answers: [] };
    // Remote doc stamp is fresher, but the queued attempt was taken later.
    mocks.remoteDocs.set(STUDENT_PATH, { updatedAt: NEWER, preScore: remoteScore });
    seedQueue([studentItem({ preScore: queuedScore, updatedAt: OLDER }, OLDER)]);

    await store.flushPendingSyncQueue();

    const write = lastStudentWrite();
    expect(write.data.preScore).toEqual(queuedScore);
  });

  it("drops the queued score when the remote attempt is genuinely newer", async () => {
    const remoteScore = { correct: 9, total: 10, date: "2026-06-02T09:00:00.000Z", answers: [] };
    const queuedScore = { correct: 5, total: 10, date: "2026-06-01T09:00:00.000Z", answers: [] };
    mocks.remoteDocs.set(STUDENT_PATH, { updatedAt: NEWER, preScore: remoteScore });
    seedQueue([studentItem({ preScore: queuedScore, updatedAt: OLDER }, OLDER)]);

    const remaining = await store.flushPendingSyncQueue();

    // Everything superseded → no write at all.
    expect(remaining).toBe(0);
    expect(mocks.setDocCalls.filter((call) => call.path === STUDENT_PATH)).toHaveLength(0);
  });

  it("unions bookmarks so offline curation survives", async () => {
    mocks.remoteDocs.set(STUDENT_PATH, {
      updatedAt: NEWER,
      bookmarks: { trials: ["t-remote"], articles: ["a-remote"], cases: [], studySheets: [] },
    });
    seedQueue([studentItem({
      bookmarks: { trials: ["t-offline"], articles: ["a-remote"], cases: [], studySheets: [] },
      updatedAt: OLDER,
    }, OLDER)]);

    await store.flushPendingSyncQueue();

    const write = lastStudentWrite();
    expect(write.data.bookmarks).toEqual({
      trials: ["t-remote", "t-offline"],
      articles: ["a-remote"],
      cases: [],
      studySheets: [],
    });
  });
});

// ─── Queue bookkeeping races ───────────────────────────────────────
// Writes queued while a flush or direct write is in flight must never be
// silently deleted by the flush's final queue write or by the post-success
// scope clearing.
describe("pending queue race safety", () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    vi.setSystemTime(new Date("2026-06-03T12:00:00Z"));
    store.setRotationCode(ROTATION);
    mocks.remoteDocs.clear();
    mocks.setDocCalls.length = 0;
    mocks.updateDocCalls.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function queueWhileOffline(fn: () => Promise<unknown>): Promise<unknown> {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    return fn().finally(() => {
      Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    });
  }

  it("keeps a write queued for another scope while a flush is in flight", async () => {
    seedQueue([studentItem({ name: "Flushing" }, OLDER)]);
    vi.spyOn(mocks.fs, "setDoc").mockImplementationOnce(async (ref: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => {
      mocks.setDocCalls.push({ path: ref.path, data, options });
      // A different student's write lands mid-flush (e.g. another hook).
      await queueWhileOffline(() => store.setStudentData("stu-2", { name: "Mid-flight" }));
    });

    const remaining = await store.flushPendingSyncQueue();

    // The old wholesale overwrite deleted the mid-flight item.
    expect(remaining).toBe(1);
    const queue = readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].studentId).toBe("stu-2");
  });

  it("keeps same-scope data queued while its own flush is in flight", async () => {
    seedQueue([studentItem({ name: "Flushing" }, OLDER)]);
    vi.spyOn(mocks.fs, "setDoc").mockImplementationOnce(async (ref: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => {
      mocks.setDocCalls.push({ path: ref.path, data, options });
      await queueWhileOffline(() => store.setStudentData("stu-1", { year: "MS4" }));
    });

    const remaining = await store.flushPendingSyncQueue();

    expect(remaining).toBe(1);
    const queue = readQueue();
    expect(queue).toHaveLength(1);
    expect((queue[0].data as Record<string, unknown>).year).toBe("MS4");
  });

  it("keeps residual queued fields a successful write did not cover", async () => {
    // Leftover from an earlier failed profile save — the auto-save payload
    // never carries `year`, so the old scope-wide clear silently lost it.
    seedQueue([studentItem({ year: "MS4" }, OLDER)]);

    const result = await store.setStudentData("stu-1", { name: "Ana" });

    expect(result.status).toBe("applied");
    const queue = readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].data).toEqual({ year: "MS4" });
  });

  it("clears the queued entry once every field has been covered by successful writes", async () => {
    seedQueue([studentItem({ year: "MS4", name: "Old" }, OLDER)]);

    await store.setStudentData("stu-1", { name: "Ana", year: "MS4" });

    expect(readQueue()).toHaveLength(0);
  });

  it("keeps a same-scope write queued during an in-flight direct write", async () => {
    vi.spyOn(mocks.fs, "setDoc").mockImplementationOnce(async (ref: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => {
      mocks.setDocCalls.push({ path: ref.path, data, options });
      await queueWhileOffline(() => store.setStudentData("stu-1", { postScore: { correct: 9, total: 10, date: NEWER, answers: [] } }));
    });

    const result = await store.setStudentData("stu-1", { name: "Ana" });

    expect(result.status).toBe("applied");
    const queue = readQueue();
    expect(queue).toHaveLength(1);
    expect((queue[0].data as Record<string, unknown>).postScore).toBeTruthy();
  });
});

// ─── Fail-closed clobber guard ─────────────────────────────────────
// When the pre-write remote read errors, the guard cannot prove the write is
// safe — queue and retry later instead of writing blind (failing open).
describe("clobber guard fails closed on remote read errors", () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    vi.setSystemTime(new Date("2026-06-03T12:00:00Z"));
    store.setRotationCode(ROTATION);
    mocks.remoteDocs.clear();
    mocks.setDocCalls.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("queues a guarded direct write instead of writing blind", async () => {
    mocks.remoteDocs.set(STUDENT_PATH, { updatedAt: NEWER, name: "Remote Name" });
    vi.spyOn(mocks.fs, "getDoc").mockRejectedValueOnce(new Error("transient read failure"));

    const result = await store.setStudentData("stu-1", {
      name: "Local Name",
      updatedAt: "2026-06-03T12:00:00.000Z",
    }, { baseUpdatedAt: OLDER });

    expect(result.status).toBe("queued");
    expect(mocks.setDocCalls.filter((call) => call.path === STUDENT_PATH)).toHaveLength(0);
    expect(readQueue()).toHaveLength(1);
  });

  it("keeps a queued item for retry when the flush's remote read errors", async () => {
    mocks.remoteDocs.set(STUDENT_PATH, { updatedAt: NEWER, name: "Remote Name" });
    seedQueue([studentItem({ name: "Queued Name", updatedAt: OLDER }, OLDER)]);
    vi.spyOn(mocks.fs, "getDoc").mockRejectedValueOnce(new Error("transient read failure"));

    const remaining = await store.flushPendingSyncQueue();

    expect(remaining).toBe(1);
    expect(mocks.setDocCalls.filter((call) => call.path === STUDENT_PATH)).toHaveLength(0);

    // Next poll: the read works, the guard merges as usual.
    const remainingAfterRetry = await store.flushPendingSyncQueue();
    expect(remainingAfterRetry).toBe(0);
  });
});

// ─── Corrupted queue recovery ──────────────────────────────────────
describe("corrupted pending queue", () => {
  it("stashes an unparseable queue blob instead of silently wiping it", async () => {
    localStorage.setItem(PENDING_SYNC_KEY, "{definitely-not-json");

    expect(store.getPendingSyncCount()).toBe(0);
    // The raw blob is preserved for recovery, and the corrupt key is cleared
    // so queueing works again.
    expect(localStorage.getItem("neph_pendingSyncQueue_corrupt")).toBe("{definitely-not-json");
    expect(localStorage.getItem(PENDING_SYNC_KEY)).toBeNull();

    await store.setStudentData("stu_1", { name: "Ana" }); // offline (suite default)
    expect(readQueue()).toHaveLength(1);
    expect(localStorage.getItem("neph_pendingSyncQueue_corrupt")).toBe("{definitely-not-json");
  });

  it("keeps readable entries and stashes the blob when some entries are malformed", () => {
    const good = { kind: "setStudentData", rotationCode: "TEST-ROT", studentId: "stu_1", data: { name: "A" }, updatedAt: "2026-03-08T12:00:00.000Z" };
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify([good, 42, "junk"]));

    expect(store.getPendingSyncCount()).toBe(1);
    expect(localStorage.getItem("neph_pendingSyncQueue_corrupt")).toContain("junk");
  });
});

// ─── Unmapped shared keys ──────────────────────────────────────────
describe("setShared flush with unmapped key", () => {
  it("drops the item with a warning instead of failing silently", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    seedQueue([{ kind: "setShared", rotationCode: ROTATION, key: "neph_shared_notAThing", data: { x: 1 }, updatedAt: OLDER }]);

    const remaining = await store.flushPendingSyncQueue();

    expect(remaining).toBe(0);
    expect(mocks.updateDocCalls).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("unmapped key"),
      expect.anything(),
    );
    warnSpy.mockRestore();
  });
});

// ─── Deleted-student queue discard ─────────────────────────────────
describe("discardQueuedStudentSync", () => {
  it("drops only the deleted student's queued writes", async () => {
    store.setRotationCode(ROTATION);
    seedQueue([
      studentItem({ name: "Gone" }, OLDER),
      { kind: "setTeamSnapshot", rotationCode: ROTATION, studentId: "stu-1", data: { points: 5 }, updatedAt: OLDER },
      { kind: "setStudentData", rotationCode: ROTATION, studentId: "stu-2", data: { name: "Stays" }, updatedAt: OLDER },
      { kind: "setShared", rotationCode: ROTATION, key: "neph_shared_announcements", data: [], updatedAt: OLDER },
    ]);

    store.discardQueuedStudentSync("stu-1");

    const queue = readQueue();
    expect(queue).toHaveLength(2);
    expect(queue.map((item) => item.kind).sort()).toEqual(["setShared", "setStudentData"]);
    expect(queue.find((item) => item.kind === "setStudentData")?.studentId).toBe("stu-2");
  });
});

// ─── Undefined-field safety ────────────────────────────────────────
// The default Firestore instance rejects undefined anywhere in a payload. A
// single optional field (quick feedback tag with no note) used to fail the
// whole write, silently strand it in the retry queue, and a later clean write
// for the same student cleared the queue — permanent data loss. setStudentData
// now deep-strips undefined and reports whether the write applied or queued.
function containsUndefinedDeep(value: unknown): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.some(containsUndefinedDeep);
  if (typeof value === "object" && value !== null) return Object.values(value).some(containsUndefinedDeep);
  return false;
}

describe("setStudentData undefined-field safety", () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    mocks.setDocCalls.length = 0;
    // Mimic real default-instance Firestore validation: reject undefined anywhere.
    vi.spyOn(mocks.fs, "setDoc").mockImplementation(async (ref: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => {
      if (containsUndefinedDeep(data)) throw new Error("Unsupported field value: undefined");
      mocks.setDocCalls.push({ path: ref.path, data, options });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("persists a quick feedback tag with no note instead of throw-and-queue (regression)", async () => {
    const result = await store.setStudentData("stu_1", {
      feedbackTags: [{ tag: "Strong pathophys reasoning", date: "2026-03-08T12:00:00.000Z", note: undefined }],
    });

    expect(result.status).toBe("applied");
    expect(readQueue()).toHaveLength(0);
    expect(mocks.setDocCalls).toHaveLength(1);
    const tags = mocks.setDocCalls[0].data.feedbackTags as Array<Record<string, unknown>>;
    expect(tags).toHaveLength(1);
    expect("note" in tags[0]).toBe(false);
    expect(tags[0].tag).toBe("Strong pathophys reasoning");
  });

  it("strips undefined at the top level and deep inside nested objects", async () => {
    const result = await store.setStudentData("stu_1", {
      year: undefined,
      gamification: { points: 10, streaks: { lastActiveDate: undefined } },
    });

    expect(result.status).toBe("applied");
    const write = mocks.setDocCalls[mocks.setDocCalls.length - 1];
    expect("year" in write.data).toBe(false);
    expect(write.data.gamification).toEqual({ points: 10, streaks: {} });
  });

  it("returns 'queued' and keeps the payload when the write fails", async () => {
    vi.spyOn(mocks.fs, "setDoc").mockRejectedValueOnce(new Error("transient"));

    const result = await store.setStudentData("stu_1", { name: "Ana" });

    expect(result.status).toBe("queued");
    expect(readQueue()).toHaveLength(1);
  });

  it("returns 'queued' while offline without touching Firestore", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    const result = await store.setStudentData("stu_1", { name: "Ana" });

    expect(result.status).toBe("queued");
    expect(mocks.setDocCalls).toHaveLength(0);
  });

  it("returns 'skipped' when no rotation code is set", async () => {
    store.setRotationCode(null);

    const result = await store.setStudentData("stu_1", { name: "Ana" });

    expect(result.status).toBe("skipped");
    expect(mocks.setDocCalls).toHaveLength(0);
  });
});
