// Shared-device account hygiene in useStudentAuth: signing in under a
// DIFFERENT account must purge the previous user's local progress (otherwise a
// first-time join seeds the new student's cloud doc with the previous user's
// patients/scores), and a deferred sign-out (logout that left its final flush
// queued) must keep the UI signed out on the next boot while the queue drains.
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRef } from "react";
import type { User } from "firebase/auth";
import type {
  ActivityLogEntry,
  Bookmarks,
  CompletedItems,
  Gamification,
  Patient,
  QuizScore,
  ReflectionEntry,
  SrQueue,
  WeeklyScores,
} from "../types";
import {
  useStudentAuth,
  STUDENT_DEFERRED_SIGNOUT_KEY,
  JOINED_AT_KEY,
} from "./useStudentAuth";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => {
  const getCurrentStudentUser = vi.fn(async (): Promise<Partial<User> | null> => null);
  const isStudentEmailLink = vi.fn(async () => false);
  const signOutFirebase = vi.fn(async () => {});
  const completeStudentSignInLink = vi.fn(async (): Promise<{ user: Partial<User>; isNewUser: boolean }> => {
    throw new Error("not configured");
  });
  // The mocked store reads/writes REAL jsdom localStorage (same JSON encoding
  // as the real store) so the purge's localStorage.removeItem calls are
  // observable.
  const storeMock = {
    get: vi.fn(async (key: string) => {
      const value = localStorage.getItem(key);
      try {
        return value ? JSON.parse(value) : null;
      } catch {
        return null;
      }
    }),
    set: vi.fn(async (key: string, value: unknown) => {
      localStorage.setItem(key, JSON.stringify(value));
    }),
    getRotationCode: vi.fn(() => null),
    getStudentData: vi.fn(async () => null),
    getStudentAssignment: vi.fn(async () => null),
    setStudentAssignment: vi.fn(async () => {}),
    setStudentData: vi.fn(async () => ({ status: "applied" as const, updatedAt: null })),
    setTeamSnapshot: vi.fn(async () => {}),
    setRotationCode: vi.fn(),
    validateRotationCode: vi.fn(async () => true),
  };
  return { getCurrentStudentUser, isStudentEmailLink, signOutFirebase, completeStudentSignInLink, storeMock };
});

vi.mock("../utils/store", () => ({ default: h.storeMock }));
vi.mock("../utils/firebase", () => ({
  clearSavedStudentSignInEmail: () => {},
  completeStudentSignInLink: h.completeStudentSignInLink,
  getCurrentStudentUser: h.getCurrentStudentUser,
  getSavedStudentSignInEmail: () => "",
  isStudentEmailLink: h.isStudentEmailLink,
  sendStudentSignInLink: async () => {},
  setStudentPinCredential: async () => {},
  signOutFirebase: h.signOutFirebase,
  signInStudentWithPin: async () => null,
  STUDENT_AUTH_PIN_LENGTH: 6,
}));

const setPatients = vi.fn();
const setWeeklyScores = vi.fn();
const setPreScore = vi.fn();
const setPostScore = vi.fn();
const setGamification = vi.fn();
const setCompletedItems = vi.fn();
const setBookmarks = vi.fn();
const setSrQueue = vi.fn();
const setActivityLog = vi.fn();
const setReflections = vi.fn();
const setShowOnboarding = vi.fn();

const GAMIFICATION: Gamification = { points: 0, achievements: [], streaks: { currentDays: 0, longestDays: 0, lastActiveDate: null } };
const COMPLETED: CompletedItems = { articles: {}, studySheets: {}, cases: {}, decks: {}, consultTopics: {} };

function useHarness() {
  const latestStudentUpdateRef = useRef<string | null>(null);
  return useStudentAuth(
    latestStudentUpdateRef,
    [] as Patient[],
    {} as WeeklyScores,
    null as QuizScore | null,
    null as QuizScore | null,
    GAMIFICATION,
    COMPLETED,
    {} as SrQueue,
    setPatients,
    setWeeklyScores,
    setPreScore,
    setPostScore,
    setGamification,
    setCompletedItems,
    setBookmarks,
    setSrQueue,
    setActivityLog,
    setReflections,
    setShowOnboarding,
  );
}

const RESIDUAL_KEYS = [
  "neph_patients",
  "neph_weeklyScores",
  "neph_preScore",
  "neph_postScore",
  "neph_completedItems",
  "neph_bookmarks",
  "neph_srQueue",
  "neph_activityLog",
  "neph_reflections",
  "neph_gamification",
  JOINED_AT_KEY,
];

function seedResidualProgress(): void {
  localStorage.setItem("neph_patients", JSON.stringify([{ id: "p-old", initials: "ZZ" }]));
  localStorage.setItem("neph_weeklyScores", JSON.stringify({ 1: [{ correct: 5, total: 5, date: "2026-06-01", answers: [] }] }));
  localStorage.setItem("neph_preScore", JSON.stringify({ correct: 5, total: 10, date: "2026-06-01", answers: [] }));
  localStorage.setItem("neph_gamification", JSON.stringify({ points: 120, achievements: ["first-week"] }));
  localStorage.setItem(JOINED_AT_KEY, JSON.stringify("2026-06-01T08:00:00.000Z"));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  h.getCurrentStudentUser.mockResolvedValue(null);
  h.isStudentEmailLink.mockResolvedValue(false);
});

describe("residual progress purge on account change (shared device)", () => {
  it("wipes the previous user's local progress when a different account signs in", async () => {
    localStorage.setItem("neph_studentId", JSON.stringify("old-uid"));
    seedResidualProgress();
    h.getCurrentStudentUser.mockResolvedValue({ uid: "new-uid", isAnonymous: true });

    const { result } = renderHook(() => useHarness());
    let sessionStudentId = "";
    await act(async () => {
      sessionStudentId = await result.current.bootstrapAuthSession();
    });

    expect(sessionStudentId).toBe("new-uid");
    // The previous user's progress is gone from localStorage…
    RESIDUAL_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBeNull());
    // …and from React state, so the join payload can't seed the new student's
    // cloud doc with it.
    expect(setPatients).toHaveBeenCalledWith([]);
    expect(setWeeklyScores).toHaveBeenCalledWith({});
    expect(setPreScore).toHaveBeenCalledWith(null);
    // The device now belongs to the new account.
    expect(JSON.parse(localStorage.getItem("neph_studentId") || "null")).toBe("new-uid");
  });

  it("keeps local progress when the SAME account restores its session", async () => {
    localStorage.setItem("neph_studentId", JSON.stringify("same-uid"));
    seedResidualProgress();
    h.getCurrentStudentUser.mockResolvedValue({ uid: "same-uid", isAnonymous: true });

    const { result } = renderHook(() => useHarness());
    await act(async () => {
      await result.current.bootstrapAuthSession();
    });

    expect(localStorage.getItem("neph_patients")).not.toBeNull();
    expect(setPatients).not.toHaveBeenCalled();
  });

  it("keeps progress on a first-ever session (nothing to purge)", async () => {
    seedResidualProgress(); // no neph_studentId — legacy/local-only state
    h.getCurrentStudentUser.mockResolvedValue({ uid: "new-uid", isAnonymous: true });

    const { result } = renderHook(() => useHarness());
    await act(async () => {
      await result.current.bootstrapAuthSession();
    });

    expect(localStorage.getItem("neph_patients")).not.toBeNull();
    expect(setPatients).not.toHaveBeenCalled();
  });
});

describe("deferred sign-out at boot", () => {
  it("keeps the UI signed out while the queued final flush is still pending", async () => {
    // Logout happened offline: the session was kept alive only so the pending
    // queue can flush. The next boot must NOT restore the session UI.
    localStorage.setItem(STUDENT_DEFERRED_SIGNOUT_KEY, "1");
    localStorage.setItem("neph_studentId", JSON.stringify("uid-1"));
    h.getCurrentStudentUser.mockResolvedValue({ uid: "uid-1", isAnonymous: false });

    const { result } = renderHook(() => useHarness());
    let sessionStudentId = "not-set";
    await act(async () => {
      sessionStudentId = await result.current.bootstrapAuthSession();
    });

    expect(sessionStudentId).toBe("");
    expect(result.current.studentId).toBe("");
    expect(result.current.authSessionKind).toBe("none");
    // The flag stays until useStudentSync drains the queue and completes the
    // sign-out.
    expect(localStorage.getItem(STUDENT_DEFERRED_SIGNOUT_KEY)).toBe("1");
  });

  it("is cleared by a genuine email-link sign-in", async () => {
    localStorage.setItem(STUDENT_DEFERRED_SIGNOUT_KEY, "1");
    localStorage.setItem("neph_studentEmail", JSON.stringify("ana@example.com"));
    h.isStudentEmailLink.mockResolvedValue(true);
    h.completeStudentSignInLink.mockResolvedValue({
      user: { uid: "uid-2", isAnonymous: false, email: "ana@example.com" },
      isNewUser: true,
    });

    const { result } = renderHook(() => useHarness());
    await act(async () => {
      await result.current.bootstrapAuthSession();
    });

    expect(result.current.studentId).toBe("uid-2");
    expect(localStorage.getItem(STUDENT_DEFERRED_SIGNOUT_KEY)).toBeNull();
    // The lingering deferred-sign-out session was ended BEFORE completing the
    // link, so the email can't be linked onto the previous (possibly
    // anonymous) account.
    expect(h.signOutFirebase.mock.invocationCallOrder[0]).toBeLessThan(
      h.completeStudentSignInLink.mock.invocationCallOrder[0],
    );
  });
});
