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
  const listeners: { student: ((data: Record<string, unknown>) => void) | null } = { student: null };
  // Mirrors the real contract: resolves with the updatedAt actually written.
  const setStudentData = vi.fn(async (_studentId: string, data: Record<string, unknown>) =>
    typeof data.updatedAt === "string" ? data.updatedAt : null);
  const getCachedStudentUpdatedAt = vi.fn((): string | null => null);
  const storeMock = {
    get: vi.fn(async () => null),
    set: vi.fn(async () => {}),
    getShared: vi.fn(async () => null),
    getRotationCode: vi.fn(() => "GS-26"),
    getPendingSyncCount: vi.fn(() => 0),
    onPendingSyncChanged: vi.fn(() => () => {}),
    flushPendingSyncQueue: vi.fn(async () => 0),
    onRotationChanged: vi.fn(() => () => {}),
    onStudentDataChanged: vi.fn((_studentId: string, cb: (data: Record<string, unknown>) => void) => {
      listeners.student = cb;
      return () => {};
    }),
    setStudentData,
    setTeamSnapshot: vi.fn(async () => {}),
    getCachedStudentUpdatedAt,
  };
  return { listeners, storeMock, setStudentData, getCachedStudentUpdatedAt };
});

vi.mock("../utils/store", () => ({ default: h.storeMock }));
vi.mock("../utils/firebase", () => ({
  normalizeStudentPinInput: (value: string) => value,
  clearSavedStudentSignInEmail: () => {},
  completeStudentSignInLink: async () => null,
  getCurrentStudentUser: async () => null,
  getSavedStudentSignInEmail: () => "",
  isStudentEmailLink: () => false,
  sendStudentSignInLink: async () => {},
  setStudentPinCredential: async () => {},
  signOutFirebase: async () => {},
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
  sync: ReturnType<typeof useStudentSync>;
}

const api = {} as HarnessApi;

function useHarness() {
  const latestStudentUpdateRef = useRef<string | null>(null);
  const [studentId, setStudentId] = useState("stu-1");
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
    async () => "stu-1",
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
  h.getCachedStudentUpdatedAt.mockReturnValue(null);
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
