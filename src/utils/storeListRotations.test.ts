// listRotations aggregate-consumption behavior (WS-4). The rotation doc may
// carry a server-maintained `studentCount` (written by the onStudentWrite Cloud
// Function). When present it must be used directly; when missing — every doc
// written before the function deploys — it must fall back to counting the
// `students` subcollection. The fallback is permanent, so both paths are tested.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  // path -> doc data for top-level "rotations" docs and their subcollections.
  const remoteDocs = new Map<string, Record<string, unknown>>();
  // Counts getDocs calls per collection path so a test can assert the
  // subcollection count fallback did (or did NOT) fire.
  const getDocsCalls: string[] = [];
  const fs = {
    doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
    collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
    query: (ref: { path: string }) => ref,
    where: () => ({}),
    getDocs: async (ref: { path: string }) => {
      getDocsCalls.push(ref.path);
      const prefix = `${ref.path}/`;
      const docs = [...remoteDocs.keys()]
        .filter((p) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/"))
        .map((p) => ({ id: p.slice(prefix.length), data: () => remoteDocs.get(p) }));
      return { docs, size: docs.length };
    },
  };
  return { remoteDocs, getDocsCalls, fs };
});

vi.mock("./firebase", () => ({
  getFirebase: async () => ({ db: {}, fs: mocks.fs, auth: {}, authMod: {} }),
  getBootstrapAdminLegacyUids: () => [],
  // Master admin: listRotations reads every rotation via getDocs(collection).
  getCurrentAdminUser: async () => ({ uid: "admin-1", email: "boss@dr.org" }),
  isBootstrapAdminEmail: () => true,
  waitForAuthUser: async () => null,
}));

import store from "./store";

beforeEach(() => {
  mocks.remoteDocs.clear();
  mocks.getDocsCalls.length = 0;
});

afterEach(() => {
  mocks.remoteDocs.clear();
});

describe("listRotations studentCount aggregate consumption", () => {
  it("uses the rotation doc's studentCount when it is a number", async () => {
    mocks.remoteDocs.set("rotations/GS-26", { name: "GS", createdAt: "2026-07-01", studentCount: 4 });
    const list = await store.listRotations();
    expect(list).toHaveLength(1);
    expect(list[0].studentCount).toBe(4);
    // The aggregate short-circuit means NO per-rotation students getDocs.
    expect(mocks.getDocsCalls).not.toContain("rotations/GS-26/students");
  });

  it("falls back to counting the students subcollection when studentCount is absent", async () => {
    mocks.remoteDocs.set("rotations/OLD-25", { name: "Old", createdAt: "2026-06-01" });
    mocks.remoteDocs.set("rotations/OLD-25/students/s1", { name: "A" });
    mocks.remoteDocs.set("rotations/OLD-25/students/s2", { name: "B" });
    const list = await store.listRotations();
    expect(list[0].studentCount).toBe(2);
    expect(mocks.getDocsCalls).toContain("rotations/OLD-25/students");
  });

  it("falls back when studentCount is present but not a number (defensive)", async () => {
    mocks.remoteDocs.set("rotations/BAD-1", { name: "Bad", createdAt: "2026-06-15", studentCount: "3" });
    mocks.remoteDocs.set("rotations/BAD-1/students/s1", { name: "A" });
    const list = await store.listRotations();
    expect(list[0].studentCount).toBe(1);
    expect(mocks.getDocsCalls).toContain("rotations/BAD-1/students");
  });

  it("falls back when studentCount is negative (defensive)", async () => {
    mocks.remoteDocs.set("rotations/NEG-1", { name: "Neg", createdAt: "2026-06-15", studentCount: -1 });
    const list = await store.listRotations();
    // No students seeded → fallback count is 0, not the bogus -1.
    expect(list[0].studentCount).toBe(0);
    expect(mocks.getDocsCalls).toContain("rotations/NEG-1/students");
  });

  it("uses studentCount: 0 directly (a real zero is not treated as missing)", async () => {
    mocks.remoteDocs.set("rotations/EMPTY-1", { name: "Empty", createdAt: "2026-07-02", studentCount: 0 });
    mocks.remoteDocs.set("rotations/EMPTY-1/students/ghost", { name: "should-not-be-counted" });
    const list = await store.listRotations();
    expect(list[0].studentCount).toBe(0);
    // Aggregate present (0) → no fallback getDocs on the students subcollection.
    expect(mocks.getDocsCalls).not.toContain("rotations/EMPTY-1/students");
  });

  it("mixes aggregate and fallback rotations in one call", async () => {
    mocks.remoteDocs.set("rotations/NEW-1", { name: "New", createdAt: "2026-07-03", studentCount: 5 });
    mocks.remoteDocs.set("rotations/LEG-1", { name: "Legacy", createdAt: "2026-07-04" });
    mocks.remoteDocs.set("rotations/LEG-1/students/s1", { name: "A" });
    const list = await store.listRotations();
    const byCode = Object.fromEntries(list.map((r) => [r.code, r.studentCount]));
    expect(byCode["NEW-1"]).toBe(5);
    expect(byCode["LEG-1"]).toBe(1);
    expect(mocks.getDocsCalls).not.toContain("rotations/NEW-1/students");
    expect(mocks.getDocsCalls).toContain("rotations/LEG-1/students");
  });
});
