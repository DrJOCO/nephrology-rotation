// "View as student" preview mode invariants. The whole point of preview is a
// zero-side-effect sandbox: no Firestore writes, no pending-sync enqueue, and
// no touching the admin device's real localStorage (which may hold a real
// student's session on a shared hospital workstation). These tests prove each
// write/mutation method is inert and that store.set/get are isolated from real
// localStorage, then that exitPreview restores normal behavior.
//
// Firebase is mocked the same way as storeQueue.test.ts so any Firestore call
// while preview is on is a visible, assertable failure.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const remoteDocs = new Map<string, Record<string, unknown>>();
  const setDocCalls: Array<{ path: string; data: Record<string, unknown> }> = [];
  const updateDocCalls: Array<{ path: string; data: Record<string, unknown> }> = [];
  const deleteDocCalls: Array<{ path: string }> = [];
  const fs = {
    doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
    collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
    getDoc: async (ref: { path: string }) => {
      const data = remoteDocs.get(ref.path);
      return { exists: () => data !== undefined, data: () => data };
    },
    getDocs: async () => ({ docs: [], size: 0 }),
    setDoc: async (ref: { path: string }, data: Record<string, unknown>) => {
      setDocCalls.push({ path: ref.path, data });
    },
    updateDoc: async (ref: { path: string }, data: Record<string, unknown>) => {
      updateDocCalls.push({ path: ref.path, data });
    },
    deleteDoc: async (ref: { path: string }) => {
      deleteDocCalls.push({ path: ref.path });
    },
    onSnapshot: () => () => {},
    deleteField: () => ({ __deleteField: true }),
  };
  return { remoteDocs, setDocCalls, updateDocCalls, deleteDocCalls, fs };
});

vi.mock("./firebase", () => ({
  getFirebase: async () => ({ db: {}, fs: mocks.fs, auth: {}, authMod: {} }),
  getBootstrapAdminLegacyUids: () => [],
  getCurrentAdminUser: async () => null,
  isBootstrapAdminEmail: () => false,
  waitForAuthUser: async () => null,
}));

import store from "./store";

const ROTATION = "GS-26";

function firestoreCallCount(): number {
  return mocks.setDocCalls.length + mocks.updateDocCalls.length + mocks.deleteDocCalls.length;
}

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
  mocks.remoteDocs.clear();
  mocks.setDocCalls.length = 0;
  mocks.updateDocCalls.length = 0;
  mocks.deleteDocCalls.length = 0;
  store.setRotationCode(ROTATION);
});

afterEach(() => {
  store.exitPreview();
  store.setRotationCode(null);
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("preview mode write invariants", () => {
  it("makes zero Firestore calls and zero real localStorage writes for every mutation", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const removeItem = vi.spyOn(Storage.prototype, "removeItem");
    store.enterPreview({ neph_studentId: "preview-student", neph_rotationCode: ROTATION });

    const studentWrite = await store.setStudentData("preview-student", { name: "Preview Student", patients: [] });
    const sharedWrite = await store.setShared("neph_shared_announcements", [{ id: 1 }]);
    await store.setTeamSnapshot("preview-student", { studentId: "preview-student", points: 5 });
    await store.updateRotation(ROTATION, { name: "Renamed" });
    await store.setStudentAssignment("preview-student", { activeRotationCode: ROTATION });
    await store.deleteStudentData("preview-student");
    await store.deleteRotation(ROTATION);
    const flushed = await store.flushPendingSyncQueue();

    // Honest "nothing written" shapes.
    expect(studentWrite).toEqual({ status: "skipped", updatedAt: null });
    expect(sharedWrite).toEqual({ applied: false, queued: false });
    expect(flushed).toBe(0);

    // No Firestore traffic of any kind.
    expect(firestoreCallCount()).toBe(0);

    // No real localStorage mutation — not even the pending-sync queue.
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(localStorage.getItem("neph_pendingSyncQueue")).toBeNull();
  });

  it("never enqueues to the real pending-sync queue while previewing (even offline)", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    store.enterPreview({ neph_studentId: "preview-student", neph_rotationCode: ROTATION });

    await store.setStudentData("preview-student", { name: "Preview" });
    await store.setShared("neph_shared_curriculum", { title: "AKI" });

    expect(store.getPendingSyncCount()).toBe(0);
    expect(localStorage.getItem("neph_pendingSyncQueue")).toBeNull();
  });

  it("does not drain a real queued backlog on flush", async () => {
    // A real queued item parked before preview opened must be left untouched.
    localStorage.setItem(
      "neph_pendingSyncQueue",
      JSON.stringify([{ kind: "setStudentData", rotationCode: ROTATION, studentId: "real-stu", data: { name: "Real" }, updatedAt: "2026-06-01T00:00:00.000Z" }]),
    );
    store.enterPreview({ neph_studentId: "preview-student" });

    const flushed = await store.flushPendingSyncQueue();

    expect(flushed).toBe(0);
    expect(firestoreCallCount()).toBe(0);
    // The real backlog is still intact for after preview exits.
    expect(JSON.parse(localStorage.getItem("neph_pendingSyncQueue")!)).toHaveLength(1);
    // getPendingSyncCount reports 0 in preview so the student banner can't
    // surface the admin's real backlog.
    expect(store.getPendingSyncCount()).toBe(0);
  });

  it("no-ops the student-doc listener with an unsubscribe stub", () => {
    store.enterPreview({ neph_studentId: "preview-student" });
    const callback = vi.fn();
    const unsub = store.onStudentDataChanged("preview-student", callback);
    expect(callback).not.toHaveBeenCalled();
    expect(typeof unsub).toBe("function");
    expect(() => unsub()).not.toThrow();
  });
});

describe("preview private storage isolation", () => {
  it("routes store.get/set through an in-memory map, not real localStorage", async () => {
    const preExisting = "should-not-be-read-as-own";
    localStorage.setItem("neph_name", JSON.stringify(preExisting));
    store.enterPreview({ neph_name: "Preview Student" });

    // Reads see the seed, never the admin device's real value.
    expect(await store.get<string>("neph_name")).toBe("Preview Student");

    // Writes land in the map, never overwriting the real key.
    await store.set("neph_name", "Edited In Preview");
    expect(await store.get<string>("neph_name")).toBe("Edited In Preview");
    expect(JSON.parse(localStorage.getItem("neph_name")!)).toBe(preExisting);
  });

  it("seeds student-session keys so the getter reflects the demo student", async () => {
    store.enterPreview({ neph_studentId: "preview-student", neph_studentYear: "MS3" });
    expect(await store.get<string>("neph_studentId")).toBe("preview-student");
    expect(await store.get<string>("neph_studentYear")).toBe("MS3");
    // Unseeded keys read as null (fresh progress), not the admin's real value.
    expect(await store.get<string>("neph_patients")).toBeNull();
  });

  it("keeps preview writes from persisting across sessions", async () => {
    store.enterPreview({});
    await store.set("neph_completedItems", { articles: { a1: true } });
    store.exitPreview();

    store.enterPreview({});
    expect(await store.get("neph_completedItems")).toBeNull();
    store.exitPreview();
  });
});

describe("preview shared-content reads pass through", () => {
  it("reads the previewed rotation's real published content", async () => {
    mocks.remoteDocs.set(`rotations/${ROTATION}`, { articles: [{ week: 1, title: "AKI basics" }] });
    store.enterPreview({ neph_rotationCode: ROTATION });

    const articles = await store.getShared<Array<{ title: string }>>("neph_shared_articles");
    expect(articles).toEqual([{ week: 1, title: "AKI basics" }]);
  });

  it("reads full rotation data for the previewed rotation", async () => {
    mocks.remoteDocs.set(`rotations/${ROTATION}`, { name: "Nephrology GS-26", settings: { duration: "2" } });
    store.enterPreview({ neph_rotationCode: ROTATION });

    const data = await store.getRotationData();
    expect(data).toMatchObject({ name: "Nephrology GS-26" });
  });
});

describe("exitPreview restores normal behavior", () => {
  it("restores real Firestore writes and the admin's rotation pointer", async () => {
    store.enterPreview({ neph_rotationCode: "OTHER-ROT" });
    expect(store.isPreview()).toBe(true);
    // Preview borrowed the pointer to read OTHER-ROT's shared content.
    expect(store.getRotationCode()).toBe("OTHER-ROT");

    store.exitPreview();

    expect(store.isPreview()).toBe(false);
    // The admin's own connected rotation is restored untouched.
    expect(store.getRotationCode()).toBe(ROTATION);

    // A normal write now reaches Firestore again.
    const result = await store.setStudentData("real-stu", { name: "Real Student" });
    expect(result.status).toBe("applied");
    expect(mocks.setDocCalls.some((call) => call.path === `rotations/${ROTATION}/students/real-stu`)).toBe(true);
  });

  it("restores real localStorage for private get/set after exit", async () => {
    localStorage.setItem("neph_name", JSON.stringify("Real Name"));
    store.enterPreview({ neph_name: "Preview Student" });
    store.exitPreview();

    expect(await store.get<string>("neph_name")).toBe("Real Name");
    await store.set("neph_name", "Updated Real Name");
    expect(JSON.parse(localStorage.getItem("neph_name")!)).toBe("Updated Real Name");
  });
});
