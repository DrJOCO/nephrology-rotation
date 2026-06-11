// Offline pending-sync queue behavior — the merge/dedup logic that protects
// student work on hospital wifi. All paths exercised here short-circuit on
// navigator.onLine === false, so Firebase is never touched.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
