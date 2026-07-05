// Multi-device sync guards in useStudentSync: the debounced auto-save must
// pass its clobber-guard base (baseUpdatedAt) to store.setStudentData, and
// listener-applied remote state must never be echoed back to Firestore —
// otherwise two open devices ping-pong full-doc writes at each other forever.
// The store side of the guard (merge vs overwrite) is covered in
// src/utils/storeQueue.test.ts; here we verify the hook's wiring.
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRef, useState } from "react";
import { WEEKLY, ARTICLES } from "../data/constants";
import { normalizeStudySheets, type StudySheetsData } from "../utils/studySheets";
import { normalizeClinicGuideTemplates } from "../utils/clinicGuideTemplates";
import type {
  ActivityLogEntry,
  Announcement,
  Bookmarks,
  ClinicGuideRecord,
  CompletedItems,
  Gamification,
  Patient,
  QuizScore,
  ReflectionEntry,
  SharedSettings,
  SrQueue,
  WeeklyScores,
} from "../types";
import { useStudentSync } from "./useStudentSync";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => {
  const listeners: {
    student: ((data: Record<string, unknown>) => void) | null;
    studentRemoved: (() => void) | null;
  } = { student: null, studentRemoved: null };
  // Values served by the mocked store.get, configurable per test.
  const storedValues: Record<string, unknown> = {};
  // Mirrors the real contract: resolves with the status and the updatedAt
  // actually written.
  const setStudentData = vi.fn(async (_studentId: string, data: Record<string, unknown>) => ({
    status: "applied" as const,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
  }));
  const getCachedStudentUpdatedAt = vi.fn((): string | null => null);
  const getCachedStudentDoc = vi.fn((): Record<string, unknown> | null => null);
  const discardQueuedStudentSync = vi.fn();
  const getCurrentStudentUser = vi.fn(async (): Promise<{ uid: string } | null> => null);
  const signOutFirebase = vi.fn(async () => {});
  const storeMock = {
    get: vi.fn(async (key: string) => storedValues[key] ?? null),
    set: vi.fn(async () => {}),
    getShared: vi.fn(async () => null),
    getRotationCode: vi.fn(() => "GS-26"),
    getPendingSyncCount: vi.fn(() => 0),
    onPendingSyncChanged: vi.fn(() => () => {}),
    flushPendingSyncQueue: vi.fn(async () => 0),
    onRotationChanged: vi.fn(() => () => {}),
    onStudentDataChanged: vi.fn((_studentId: string, cb: (data: Record<string, unknown>) => void, onRemoved?: () => void) => {
      listeners.student = cb;
      listeners.studentRemoved = onRemoved ?? null;
      return () => {};
    }),
    setStudentData,
    setTeamSnapshot: vi.fn(async () => {}),
    getCachedStudentUpdatedAt,
    getCachedStudentDoc,
    discardQueuedStudentSync,
  };
  return {
    listeners,
    storedValues,
    storeMock,
    setStudentData,
    getCachedStudentUpdatedAt,
    getCachedStudentDoc,
    discardQueuedStudentSync,
    getCurrentStudentUser,
    signOutFirebase,
  };
});

vi.mock("../utils/store", () => ({ default: h.storeMock }));
vi.mock("../utils/firebase", () => ({
  normalizeStudentPinInput: (value: string) => value,
  clearSavedStudentSignInEmail: () => {},
  completeStudentSignInLink: async () => null,
  getCurrentStudentUser: h.getCurrentStudentUser,
  getSavedStudentSignInEmail: () => "",
  isStudentEmailLink: () => false,
  sendStudentSignInLink: async () => {},
  setStudentPinCredential: async () => {},
  signOutFirebase: h.signOutFirebase,
  signInStudentWithPin: async () => null,
  STUDENT_AUTH_PIN_LENGTH: 6,
}));

function makePatient(id: string): Patient {
  return { id, initials: "AB", room: "1", dx: "AKI", topics: [], notes: "", date: "2026-07-01", status: "active", followUps: [] };
}

const SYNC_IDENTITY = { authType: "guest" };

interface HarnessApi {
  setPatients: (updater: (prev: Patient[]) => Patient[]) => void;
  patients: Patient[];
  setCompletedItems: (updater: (prev: CompletedItems) => CompletedItems) => void;
  completedItems: CompletedItems;
  setWeeklyScores: (updater: (prev: WeeklyScores) => WeeklyScores) => void;
  weeklyScores: WeeklyScores;
  setStudentName: (name: string) => void;
  studentName: string;
  sync: ReturnType<typeof useStudentSync>;
}

const api = {} as HarnessApi;

// Overridable per test (the deferred sign-out scenario mounts with no session).
let initialStudentId = "stu-1";

function useHarness() {
  const latestStudentUpdateRef = useRef<string | null>(null);
  const [studentId, setStudentId] = useState(initialStudentId);
  const [nameSet, setNameSet] = useState(true);
  const [studentName, setStudentName] = useState("Ana");
  const [studentYear, setStudentYear] = useState("MS3");
  const [, setStudentPin] = useState("");
  const [, setJoinCode] = useState("");
  const [, setJoinedAt] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [weeklyScores, setWeeklyScores] = useState<WeeklyScores>({});
  const [preScore, setPreScore] = useState<QuizScore | null>(null);
  const [postScore, setPostScore] = useState<QuizScore | null>(null);
  const [gamification, setGamification] = useState<Gamification>({ points: 0, achievements: [], streaks: { currentDays: 0, longestDays: 0, lastActiveDate: null } });
  const [completedItems, setCompletedItems] = useState<CompletedItems>({ articles: {}, studySheets: {}, cases: {}, decks: {}, consultTopics: {} });
  const [bookmarks, setBookmarks] = useState<Bookmarks>({ trials: [], articles: [], cases: [], studySheets: [] });
  const [srQueue, setSrQueue] = useState<SrQueue>({});
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [, setCurriculum] = useState(WEEKLY);
  const [, setArticles] = useState(ARTICLES);
  const [, setStudySheets] = useState<StudySheetsData>(() => normalizeStudySheets({}));
  const [, setAnnouncements] = useState<Announcement[]>([]);
  const [, setSharedSettings] = useState<SharedSettings | null>(null);
  const [, setClinicGuides] = useState<ClinicGuideRecord[]>([]);
  const [, setClinicGuideTemplates] = useState(() => normalizeClinicGuideTemplates({}));

  const sync = useStudentSync(
    true,
    latestStudentUpdateRef,
    async () => initialStudentId,
    studentId,
    setStudentId,
    nameSet,
    setNameSet,
    studentName,
    setStudentName,
    studentYear,
    setStudentYear,
    "ana@example.com",
    SYNC_IDENTITY,
    "GS-26",
    setStudentPin,
    setJoinCode,
    setJoinedAt,
    patients,
    setPatients,
    weeklyScores,
    setWeeklyScores,
    preScore,
    setPreScore,
    postScore,
    setPostScore,
    gamification,
    setGamification,
    completedItems,
    setCompletedItems,
    bookmarks,
    setBookmarks,
    srQueue,
    setSrQueue,
    activityLog,
    setActivityLog,
    reflections,
    setReflections,
    setCurriculum,
    setArticles,
    setStudySheets,
    setAnnouncements,
    setSharedSettings,
    setClinicGuides,
    setClinicGuideTemplates,
  );
  api.setPatients = setPatients;
  api.patients = patients;
  api.setCompletedItems = setCompletedItems;
  api.completedItems = completedItems;
  api.setWeeklyScores = setWeeklyScores;
  api.weeklyScores = weeklyScores;
  api.setStudentName = setStudentName;
  api.studentName = studentName;
  api.sync = sync;
  return sync;
}

type SetStudentDataCall = [string, Record<string, unknown>, { baseUpdatedAt: string | null } | undefined];

function setStudentDataCall(index: number): SetStudentDataCall {
  return h.setStudentData.mock.calls[index] as unknown as SetStudentDataCall;
}

async function mountHarness() {
  renderHook(() => useHarness());
  // Flush the async load effect (mocked store resolves immediately).
  await act(async () => {});
}

const CACHED = "2026-06-30T08:00:00.000Z";
const INCOMING = "2026-07-02T10:00:00.000Z";

beforeEach(() => {
  vi.clearAllMocks();
  h.listeners.student = null;
  h.listeners.studentRemoved = null;
  Object.keys(h.storedValues).forEach((key) => delete h.storedValues[key]);
  h.getCachedStudentUpdatedAt.mockReturnValue(null);
  h.getCachedStudentDoc.mockReturnValue(null);
  h.getCurrentStudentUser.mockResolvedValue(null);
  initialStudentId = "stu-1";
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-01T09:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useStudentSync multi-device guards", () => {
  it("guards the post-hydration auto-save with the cached base and never echoes listener state back", async () => {
    h.getCachedStudentUpdatedAt.mockReturnValue(CACHED);
    await mountHarness();

    // Debounced: nothing written before the 2s timer fires.
    expect(h.setStudentData).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });

    // The app-open auto-save still happens, but is now clobber-guarded with
    // the last remote stamp this device incorporated (from the doc cache).
    expect(h.setStudentData).toHaveBeenCalledTimes(1);
    const [, , openOptions] = setStudentDataCall(0);
    expect(openOptions).toEqual({ baseUpdatedAt: CACHED });

    // Another device advances the cloud; the listener applies the snapshot.
    h.setStudentData.mockClear();
    expect(h.listeners.student).not.toBeNull();
    act(() => {
      h.listeners.student!({ updatedAt: INCOMING, patients: [makePatient("p-remote")] });
    });
    expect(api.patients.map((p) => p.id)).toEqual(["p-remote"]);

    // The applied snapshot re-renders with new state, but must not schedule a
    // write-back (blocker: two-device write ping-pong).
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(h.setStudentData).not.toHaveBeenCalled();

    // A real local mutation still syncs, now based on the applied snapshot.
    act(() => {
      api.setPatients((prev) => [...prev, makePatient("p-local")]);
    });
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(h.setStudentData).toHaveBeenCalledTimes(1);
    const [, payload, mutationOptions] = setStudentDataCall(0);
    expect(mutationOptions).toEqual({ baseUpdatedAt: INCOMING });
    expect((payload.patients as Patient[]).map((p) => p.id)).toEqual(["p-remote", "p-local"]);
  });

  it("advances the guard base with each completed write", async () => {
    await mountHarness();
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    const [, firstPayload, firstOptions] = setStudentDataCall(0);
    // Nothing cached and no snapshot yet → conservative null base (merge).
    expect(firstOptions).toEqual({ baseUpdatedAt: null });
    const firstWrittenStamp = firstPayload.updatedAt as string;

    act(() => {
      api.setPatients((prev) => [...prev, makePatient("p-new")]);
    });
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(h.setStudentData).toHaveBeenCalledTimes(2);
    const [, , secondOptions] = setStudentDataCall(1);
    // The first write resolved with its stamp; the next save builds on it
    // instead of re-merging from scratch.
    expect(secondOptions).toEqual({ baseUpdatedAt: firstWrittenStamp });
  });

  it("passes the guard base through the logout flush from a stale device", async () => {
    await mountHarness();

    // Logout before the debounce ever fires (StudentApp clears the timer).
    act(() => {
      if (api.sync.syncTimerRef.current) clearTimeout(api.sync.syncTimerRef.current);
    });
    await act(async () => {
      await api.sync.flushStudentSync();
    });

    expect(h.setStudentData).toHaveBeenCalledTimes(1);
    const [, payload, flushOptions] = setStudentDataCall(0);
    // Never saw the cloud → null base, so the store merges rather than
    // clobbering newer remote progress with this device's stale snapshot.
    expect(flushOptions).toEqual({ baseUpdatedAt: null });
    expect(typeof payload.updatedAt).toBe("string");
  });
});

describe("listener merge guards (Done marks and quiz attempts)", () => {
  it("keeps a consult-topic Done mark made in the debounce window when a remote echo lacks it", async () => {
    await mountHarness();
    // Let the app-open auto-save fire so only the scenario writes remain.
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    h.setStudentData.mockClear();

    // Student taps Done on a consult topic.
    act(() => {
      api.setCompletedItems((prev) => ({
        ...prev,
        consultTopics: { ...(prev.consultTopics || {}), aki: { topic: "AKI", completedAt: "2026-07-01T09:00:01.000Z", sheetIds: [], trialNames: [] } },
      }));
    });

    // Before the 2s debounce flushes, another device's write echoes back with
    // a newer stamp but WITHOUT the Done mark. Wholesale replacement used to
    // erase it (and any follow-up mutation made the loss permanent).
    act(() => {
      h.listeners.student!({
        updatedAt: INCOMING,
        completedItems: { articles: { a1: true }, consultTopics: {} },
      });
    });

    expect(api.completedItems.consultTopics?.aki).toBeTruthy();
    expect(api.completedItems.articles?.a1).toBe(true);

    // The next real mutation syncs a payload that still carries the Done mark.
    act(() => {
      api.setPatients((prev) => [...prev, makePatient("p-1")]);
    });
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    const lastCall = h.setStudentData.mock.calls[h.setStudentData.mock.calls.length - 1] as unknown as SetStudentDataCall;
    const written = lastCall[1].completedItems as CompletedItems;
    expect(written.consultTopics?.aki).toBeTruthy();
  });

  it("keeps a just-finished quiz attempt when a remote echo lacks it", async () => {
    await mountHarness();
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    h.setStudentData.mockClear();

    const localAttempt = { correct: 9, total: 10, date: "2026-07-01T09:00:05.000Z", answers: [] };
    act(() => {
      api.setWeeklyScores((prev) => ({ ...prev, 1: [...(prev[1] || []), localAttempt] }));
    });

    const remoteAttempt = { correct: 5, total: 10, date: "2026-06-30T10:00:00.000Z", answers: [] };
    act(() => {
      h.listeners.student!({
        updatedAt: INCOMING,
        weeklyScores: { 1: [remoteAttempt] },
      });
    });

    // Union by attempt date: both survive.
    expect(api.weeklyScores[1]).toEqual([remoteAttempt, localAttempt]);
  });
});

// Cached synced doc matching the harness's initial state exactly, so the
// boot diff finds nothing dirty (an in-sync device reopening the app).
function makeInSyncCachedDoc(): Record<string, unknown> {
  return {
    updatedAt: CACHED,
    name: "Ana",
    authType: "guest",
    patients: [],
    weeklyScores: {},
    preScore: null,
    postScore: null,
    gamification: { points: 0, achievements: [], streaks: { currentDays: 0, longestDays: 0, lastActiveDate: null } },
    completedItems: { articles: {}, studySheets: {}, cases: {}, decks: {}, consultTopics: {} },
    bookmarks: { trials: [], articles: [], cases: [], studySheets: [] },
    srQueue: {},
    activityLog: [],
    reflections: [],
    removedPatients: {},
  };
}

describe("dirty-field-only writes (fieldStamps)", () => {
  it("writes nothing on a routine reopen when local state matches the synced doc cache", async () => {
    h.getCachedStudentUpdatedAt.mockReturnValue(CACHED);
    h.getCachedStudentDoc.mockReturnValue(makeInSyncCachedDoc());
    await mountHarness();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(h.setStudentData).not.toHaveBeenCalled();
    expect(h.storeMock.setTeamSnapshot).not.toHaveBeenCalled();

    // A real mutation still schedules a write.
    act(() => {
      api.setPatients((prev) => [...prev, makePatient("p-1")]);
    });
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(h.setStudentData).toHaveBeenCalledTimes(1);
  });

  it("writes only the dirty fields plus name/identity, with per-field stamps", async () => {
    h.getCachedStudentUpdatedAt.mockReturnValue(CACHED);
    h.getCachedStudentDoc.mockReturnValue(makeInSyncCachedDoc());
    await mountHarness();

    act(() => {
      api.setPatients((prev) => [...prev, makePatient("p-1")]);
    });
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });

    expect(h.setStudentData).toHaveBeenCalledTimes(1);
    const [, payload] = setStudentDataCall(0);
    // Only the changed field (patients) plus the always-riding name/identity
    // and bookkeeping — no weeklyScores/bookmarks/etc. dragged along.
    expect(Object.keys(payload).sort()).toEqual(["authType", "fieldStamps", "name", "patients", "updatedAt"]);
    const written = payload.patients as Patient[];
    expect(written).toHaveLength(1);
    // Per-entry stamp applied centrally by the save effect's diff.
    expect(typeof written[0].updatedAt).toBe("string");
    // fieldStamps carries only the changed key, matching the entry stamp.
    expect(payload.fieldStamps).toEqual({ patients: written[0].updatedAt });
  });

  it("records a removal in removedPatients and blocks echo resurrection after the refs clear", async () => {
    await mountHarness();
    act(() => {
      api.setPatients((prev) => [...prev, makePatient("p-1")]);
    });
    await act(async () => {
      vi.advanceTimersByTime(2100); // first sync carries p-1
    });
    h.setStudentData.mockClear();

    // Student deletes the patient (same sequence as PatientTab/HomeTab).
    act(() => {
      api.sync.markPatientRemoved("p-1");
      api.setPatients((prev) => prev.filter((p) => p.id !== "p-1"));
    });
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(h.setStudentData).toHaveBeenCalledTimes(1);
    const [, payload] = setStudentDataCall(0);
    expect(payload.patients).toEqual([]);
    expect(typeof (payload.removedPatients as Record<string, string>)["p-1"]).toBe("string");

    // The debounce cleared the pendingRemoved ref; an older echo still
    // carrying p-1 must not resurrect it — the removal record persists.
    act(() => {
      h.listeners.student!({
        updatedAt: INCOMING,
        patients: [{ ...makePatient("p-1"), updatedAt: "2026-07-01T08:00:00.000Z" }],
      });
    });
    expect(api.patients).toEqual([]);
  });

  it("keeps a locally-newer name when a snapshot carries an older name stamp", async () => {
    await mountHarness();
    await act(async () => {
      vi.advanceTimersByTime(2100); // app-open save out of the way
    });

    // Local rename inside the debounce window (stamped "now" by the diff).
    act(() => {
      api.setStudentName("Ana Updated");
    });
    // Another device's snapshot: newer doc updatedAt, but its name was
    // authored before the local rename.
    act(() => {
      h.listeners.student!({
        updatedAt: INCOMING,
        name: "Stale Name",
        fieldStamps: { name: "2026-06-30T10:00:00.000Z" },
      });
    });
    expect(api.studentName).toBe("Ana Updated");

    // Old-client snapshot without stamps still applies as before.
    act(() => {
      h.listeners.student!({ updatedAt: "2026-07-03T10:00:00.000Z", name: "Old Client Name" });
    });
    expect(api.studentName).toBe("Old Client Name");
  });
});

describe("boot-time protection for never-synced local work", () => {
  it("marks local-only patients dirty at boot so the first snapshot can't drop them", async () => {
    // The tab closed before the debounce could write p-offline; it lives only
    // in localStorage. The synced-doc cache has never seen it.
    h.storedValues["neph_patients"] = [makePatient("p-offline")];
    h.getCachedStudentUpdatedAt.mockReturnValue(CACHED);
    h.getCachedStudentDoc.mockReturnValue({ updatedAt: CACHED, patients: [] });
    await mountHarness();

    expect(api.patients.map((p) => p.id)).toEqual(["p-offline"]);

    // First snapshot: the cloud advanced on another device and knows nothing
    // about p-offline. It used to be silently dropped here.
    act(() => {
      h.listeners.student!({ updatedAt: INCOMING, patients: [makePatient("p-remote")] });
    });

    expect(api.patients.map((p) => p.id).sort()).toEqual(["p-offline", "p-remote"]);
  });
});

describe("pagehide/visibilitychange flush", () => {
  it("flushes the pending debounce immediately when the tab hides", async () => {
    await mountHarness();
    await act(async () => {
      vi.advanceTimersByTime(2100); // app-open save out of the way
    });
    h.setStudentData.mockClear();

    act(() => {
      api.setPatients((prev) => [...prev, makePatient("p-lastminute")]);
    });
    // Student closes the tab 1s into the 2s debounce window.
    await act(async () => {
      vi.advanceTimersByTime(1000);
      window.dispatchEvent(new Event("pagehide"));
    });

    expect(h.setStudentData).toHaveBeenCalledTimes(1);
    const [, payload] = setStudentDataCall(0);
    expect((payload.patients as Patient[]).map((p) => p.id)).toContain("p-lastminute");

    // The debounce timer was consumed — no duplicate write later.
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(h.setStudentData).toHaveBeenCalledTimes(1);

    // Nothing pending → another hide is a no-op.
    await act(async () => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(h.setStudentData).toHaveBeenCalledTimes(1);
  });
});

describe("deferred sign-out completion", () => {
  it("signs out once the queue is drained and no session is active", async () => {
    initialStudentId = "";
    window.localStorage.setItem("neph_studentDeferredSignOut", "1");
    h.getCurrentStudentUser.mockResolvedValue({ uid: "stu-1" });

    await mountHarness();

    expect(window.localStorage.getItem("neph_studentDeferredSignOut")).toBeNull();
    expect(h.signOutFirebase).toHaveBeenCalledTimes(1);
  });

  it("does not sign out while a session is active (flag cleared by sign-in elsewhere)", async () => {
    window.localStorage.setItem("neph_studentDeferredSignOut", "1");
    h.getCurrentStudentUser.mockResolvedValue({ uid: "stu-1" });

    await mountHarness(); // studentId "stu-1" → active session

    expect(h.signOutFirebase).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("neph_studentDeferredSignOut")).toBe("1");
  });
});

describe("deleted student record guard", () => {
  it("stops auto-saving and discards queued writes when the cloud record is removed", async () => {
    await mountHarness();
    await act(async () => {
      vi.advanceTimersByTime(2100); // app-open save out of the way
    });
    h.setStudentData.mockClear();

    // A mutation schedules the debounce…
    act(() => {
      api.setPatients((prev) => [...prev, makePatient("p-1")]);
    });
    // …then the admin removes the student before it fires.
    act(() => {
      h.listeners.studentRemoved!();
    });
    expect(h.discardQueuedStudentSync).toHaveBeenCalledWith("stu-1");

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(h.setStudentData).not.toHaveBeenCalled();

    // The logout flush must not resurrect the doc either.
    await act(async () => {
      await api.sync.flushStudentSync();
    });
    expect(h.setStudentData).not.toHaveBeenCalled();

    // If the doc reappears (admin re-adds / recovery), syncing resumes.
    act(() => {
      h.listeners.student!({ updatedAt: INCOMING, patients: [] });
    });
    act(() => {
      api.setPatients((prev) => [...prev, makePatient("p-2")]);
    });
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(h.setStudentData).toHaveBeenCalledTimes(1);
  });
});
