// Student feedback ("this page confused me") — queue behavior (offline →
// queued → flushed on retry), entry shape, and admin fetch/delete. Mirrors the
// Firestore + localStorage mocking style of storeQueue.test.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface FakeAddDocCall {
  path: string;
  data: Record<string, unknown>;
}

const mocks = vi.hoisted(() => {
  const addDocCalls: FakeAddDocCall[] = [];
  const deleteDocCalls: string[] = [];
  const remoteDocs = new Map<string, Record<string, unknown>>();
  let nextId = 0;
  const fs = {
    collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
    doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
    addDoc: async (ref: { path: string }, data: Record<string, unknown>) => {
      addDocCalls.push({ path: ref.path, data });
      const id = `doc-${++nextId}`;
      remoteDocs.set(`${ref.path}/${id}`, data);
      return { id };
    },
    deleteDoc: async (ref: { path: string }) => {
      deleteDocCalls.push(ref.path);
      remoteDocs.delete(ref.path);
    },
    getDocs: async (ref: { path: string }) => {
      const docs = Array.from(remoteDocs.entries())
        .filter(([path]) => path.startsWith(`${ref.path}/`))
        .map(([path, data]) => ({ id: path.slice(ref.path.length + 1), data: () => data }));
      return { docs };
    },
  };
  return { addDocCalls, deleteDocCalls, remoteDocs, fs };
});

vi.mock("./firebase", () => ({
  getFirebase: async () => ({ db: {}, fs: mocks.fs, auth: {}, authMod: {} }),
}));

import {
  deleteRotationFeedback,
  flushPendingFeedback,
  getPendingFeedbackCount,
  listRotationFeedback,
  submitStudentFeedback,
  FEEDBACK_NOTE_MAX,
  type StudentFeedbackEntry,
} from "./feedback";

const PENDING_FEEDBACK_KEY = "neph_pendingFeedback";

function readQueue(): Array<{ rotationCode: string; entry: StudentFeedbackEntry }> {
  return JSON.parse(localStorage.getItem(PENDING_FEEDBACK_KEY) || "[]");
}

function makeEntry(overrides: Partial<StudentFeedbackEntry> = {}): StudentFeedbackEntry {
  return {
    studentId: "stu-1",
    name: "Ana",
    page: "today",
    tag: "Confusing",
    createdAt: "2026-07-05T12:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  mocks.addDocCalls.length = 0;
  mocks.deleteDocCalls.length = 0;
  mocks.remoteDocs.clear();
  Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
  localStorage.clear();
});

describe("submitStudentFeedback", () => {
  it("sends immediately when online and a rotation is connected", async () => {
    const result = await submitStudentFeedback("GS-26", makeEntry());
    expect(result).toEqual({ status: "sent" });
    expect(mocks.addDocCalls).toHaveLength(1);
    expect(mocks.addDocCalls[0].path).toBe("rotations/GS-26/feedback");
    expect(readQueue()).toHaveLength(0);
  });

  it("omits note entirely when not provided (never writes undefined)", async () => {
    await submitStudentFeedback("GS-26", makeEntry());
    const written = mocks.addDocCalls[0].data;
    expect("note" in written).toBe(false);
  });

  it("omits note when it is an empty/whitespace-only string", async () => {
    await submitStudentFeedback("GS-26", makeEntry({ note: "   " }));
    const written = mocks.addDocCalls[0].data;
    expect("note" in written).toBe(false);
  });

  it("includes a trimmed note when provided", async () => {
    await submitStudentFeedback("GS-26", makeEntry({ note: "  the calculator is off  " }));
    const written = mocks.addDocCalls[0].data;
    expect(written.note).toBe("the calculator is off");
  });

  it("truncates an overlong note to the max length", async () => {
    const longNote = "x".repeat(FEEDBACK_NOTE_MAX + 50);
    await submitStudentFeedback("GS-26", makeEntry({ note: longNote }));
    const written = mocks.addDocCalls[0].data;
    expect((written.note as string).length).toBe(FEEDBACK_NOTE_MAX);
  });

  it("writes the full entry shape (studentId, name, page, tag, createdAt)", async () => {
    await submitStudentFeedback("GS-26", makeEntry({ tag: "Broken" }));
    const written = mocks.addDocCalls[0].data;
    expect(written).toEqual({
      studentId: "stu-1",
      name: "Ana",
      page: "today",
      tag: "Broken",
      createdAt: "2026-07-05T12:00:00.000Z",
    });
  });

  it("queues instead of sending while offline", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    const result = await submitStudentFeedback("GS-26", makeEntry());
    expect(result).toEqual({ status: "queued" });
    expect(mocks.addDocCalls).toHaveLength(0);
    const queue = readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].rotationCode).toBe("GS-26");
    expect(queue[0].entry.studentId).toBe("stu-1");
  });

  it("queues when the online write throws", async () => {
    const failing = vi.spyOn(mocks.fs, "addDoc").mockRejectedValueOnce(new Error("wifi dropped"));
    const result = await submitStudentFeedback("GS-26", makeEntry());
    failing.mockRestore();
    expect(result).toEqual({ status: "queued" });
    expect(readQueue()).toHaveLength(1);
  });

  it("caps the pending queue at 20 entries, dropping the oldest", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    for (let i = 0; i < 25; i++) {
      await submitStudentFeedback("GS-26", makeEntry({ page: `page-${i}` }));
    }
    const queue = readQueue();
    expect(queue).toHaveLength(20);
    // Oldest (page-0..page-4) evicted; newest (page-24) survives.
    expect(queue.some((item) => item.entry.page === "page-0")).toBe(false);
    expect(queue.some((item) => item.entry.page === "page-24")).toBe(true);
  });
});

describe("getPendingFeedbackCount", () => {
  it("reflects the current queue length", async () => {
    expect(getPendingFeedbackCount()).toBe(0);
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    await submitStudentFeedback("GS-26", makeEntry());
    expect(getPendingFeedbackCount()).toBe(1);
  });

  it("returns 0 for a corrupted queue blob instead of throwing", () => {
    localStorage.setItem(PENDING_FEEDBACK_KEY, "{not-json");
    expect(getPendingFeedbackCount()).toBe(0);
  });
});

describe("flushPendingFeedback", () => {
  it("is a no-op on an empty queue", async () => {
    const remaining = await flushPendingFeedback();
    expect(remaining).toBe(0);
  });

  it("flushes a queued entry once back online", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    await submitStudentFeedback("GS-26", makeEntry());
    expect(readQueue()).toHaveLength(1);

    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    const remaining = await flushPendingFeedback();

    expect(remaining).toBe(0);
    expect(readQueue()).toHaveLength(0);
    expect(mocks.addDocCalls).toHaveLength(1);
    expect(mocks.addDocCalls[0].path).toBe("rotations/GS-26/feedback");
  });

  it("keeps a still-failing entry queued for the next retry", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    await submitStudentFeedback("GS-26", makeEntry());
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });

    const failing = vi.spyOn(mocks.fs, "addDoc").mockRejectedValueOnce(new Error("still offline"));
    const remainingAfterFailure = await flushPendingFeedback();
    failing.mockRestore();

    expect(remainingAfterFailure).toBe(1);
    expect(readQueue()).toHaveLength(1);

    const remainingAfterRetry = await flushPendingFeedback();
    expect(remainingAfterRetry).toBe(0);
    expect(readQueue()).toHaveLength(0);
  });

  it("flushes multiple queued entries independently, keeping only the failing ones", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    await submitStudentFeedback("GS-26", makeEntry({ page: "today" }));
    await submitStudentFeedback("GS-26", makeEntry({ page: "library" }));
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });

    const failing = vi.spyOn(mocks.fs, "addDoc").mockImplementationOnce(async () => {
      throw new Error("transient");
    });
    const remaining = await flushPendingFeedback();
    failing.mockRestore();

    expect(remaining).toBe(1);
    const queue = readQueue();
    expect(queue).toHaveLength(1);
  });
});

describe("listRotationFeedback (admin)", () => {
  it("returns entries sorted newest first", async () => {
    await submitStudentFeedback("GS-26", makeEntry({ page: "today", createdAt: "2026-07-01T00:00:00.000Z" }));
    await submitStudentFeedback("GS-26", makeEntry({ page: "library", createdAt: "2026-07-03T00:00:00.000Z" }));

    const entries = await listRotationFeedback("GS-26");

    expect(entries).toHaveLength(2);
    expect(entries[0].page).toBe("library");
    expect(entries[1].page).toBe("today");
  });

  it("returns an empty list for an empty rotation code", async () => {
    const entries = await listRotationFeedback("");
    expect(entries).toEqual([]);
  });

  it("omits note on the returned entry when it wasn't set", async () => {
    await submitStudentFeedback("GS-26", makeEntry());
    const [entry] = await listRotationFeedback("GS-26");
    expect("note" in entry).toBe(false);
  });

  it("includes note on the returned entry when it was set", async () => {
    await submitStudentFeedback("GS-26", makeEntry({ note: "confusing calculator" }));
    const [entry] = await listRotationFeedback("GS-26");
    expect(entry.note).toBe("confusing calculator");
  });
});

describe("deleteRotationFeedback (admin)", () => {
  it("deletes the entry by id", async () => {
    await submitStudentFeedback("GS-26", makeEntry());
    const [entry] = await listRotationFeedback("GS-26");

    await deleteRotationFeedback("GS-26", entry.id);

    expect(mocks.deleteDocCalls).toContain(`rotations/GS-26/feedback/${entry.id}`);
    const remaining = await listRotationFeedback("GS-26");
    expect(remaining).toHaveLength(0);
  });
});
