import { useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import store from "../utils/store";
import {
  clearSavedStudentSignInEmail,
  completeStudentSignInLink,
  getCurrentStudentUser,
  getSavedStudentSignInEmail,
  isStudentEmailLink,
  sendStudentSignInLink,
  setStudentPinCredential,
  signOutFirebase,
  signInStudentWithPin,
  STUDENT_AUTH_PIN_LENGTH,
} from "../utils/firebase";
import { calculatePoints } from "../utils/gamification";
import { buildTeamSnapshot } from "../utils/teamSnapshots";
import { LIMITS } from "../utils/validation";
import type { Patient, QuizScore, WeeklyScores, Gamification, ActivityLogEntry, SrQueue, CompletedItems, Bookmarks, ReflectionEntry } from "../types";
import type { User } from "firebase/auth";

export const JOINED_AT_KEY = "neph_joinedAt";
export const STUDENT_EMAIL_KEY = "neph_studentEmail";
export const STUDENT_YEAR_KEY = "neph_studentYear";
const STUDENT_PIN_FLOW_MODE_KEY = "neph_studentPinFlowMode";
export const STUDENT_PENDING_JOIN_CODE_KEY = "neph_studentPendingJoinCode";
// Set when a logout happened while the final progress flush was still queued
// (offline / transient failure): the Firebase session is kept alive so the
// queue can still be written (security rules only allow this student's own
// account to write its doc), and useStudentSync completes the sign-out once
// the queue drains. Cleared by any genuine sign-in.
export const STUDENT_DEFERRED_SIGNOUT_KEY = "neph_studentDeferredSignOut";

// Local progress state that must never leak from one student account into
// another on a shared device (localStorage is not namespaced per student).
const RESIDUAL_PROGRESS_KEYS = [
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
] as const;
export type StudentLoginMode = "first_time" | "returning";
export type StudentAuthSessionKind = "none" | "guest" | "verified";
export type StudentEmailFlowState = "idle" | "link_sent" | "needs_completion" | "pin_setup";
export type StudentPinFlowMode = "create" | "reset";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getStoredStudentPinFlowMode(): StudentPinFlowMode | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STUDENT_PIN_FLOW_MODE_KEY);
  return value === "create" || value === "reset" ? value : null;
}

export function setStoredStudentPinFlowMode(mode: StudentPinFlowMode | null): void {
  if (typeof window === "undefined") return;
  if (mode) {
    window.localStorage.setItem(STUDENT_PIN_FLOW_MODE_KEY, mode);
  } else {
    window.localStorage.removeItem(STUDENT_PIN_FLOW_MODE_KEY);
  }
}

function clearEmailLinkParamsFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.search && !url.hash) return;
  url.search = "";
  url.hash = "";
  window.history.replaceState({}, document.title, url.toString());
}

function formatStudentAuthError(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error && typeof error.code === "string"
    ? error.code
    : "";
  const message = error instanceof Error ? error.message : "";

  if (code === "auth/invalid-login-credentials" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
    return "That email and PIN did not match. Try again or verify your email to set a new PIN.";
  }
  if (code === "auth/user-not-found") {
    return "We couldn't find a student account for that email yet. Use First time to verify your email and create your PIN.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many attempts. Wait a bit, then try again or verify your email again.";
  }
  if (code === "auth/quota-exceeded") {
    return "We’ve hit Firebase’s daily email sign-in limit for now. Try again after the quota resets, or ask the site owner to enable billing for higher email-link limits.";
  }
  if (code === "auth/invalid-email") return "Enter a valid email address.";
  if (code === "auth/invalid-pin" || message === "auth/invalid-pin") {
    return `Use a ${STUDENT_AUTH_PIN_LENGTH}-digit PIN.`;
  }
  if (code === "auth/invalid-action-code" || code === "auth/expired-action-code") {
    return "That verification link is no longer valid. Send a fresh link and try again.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Student email sign-in is not available yet. Ask your attending for help.";
  }
  if (code === "auth/unauthorized-continue-uri" || code === "auth/invalid-continue-uri") {
    return "This verification link is not available from this site. Ask your attending for a fresh link.";
  }
  if (code === "auth/requires-recent-login") {
    return "Verify your email again, then create a new PIN.";
  }
  if (code === "auth/weak-password") {
    return `Use a ${STUDENT_AUTH_PIN_LENGTH}-digit PIN.`;
  }
  if (message === "student/unauthorized") {
    return "That account is reserved for admin access. Use the admin login instead.";
  }
  if (message === "auth/invalid-action-link") {
    return "Open the email verification link again to finish signing in.";
  }
  return message || "Unable to finish student sign-in right now.";
}

// Auth/login/PIN/join-rotation state machine for StudentApp. Owns the email-link
// sign-in flow, PIN create/reset, rotation-code join, and profile name/year updates.
// `latestStudentUpdateRef` is the multi-device updatedAt bookkeeping shared with
// useStudentSync — join/profile writes stamp it so the student-data listener can
// ignore stale echoes. Data state/setters are passed individually from StudentApp
// (join restores into them; calculatePoints reads them for team snapshots).
export function useStudentAuth(
  latestStudentUpdateRef: { current: string | null },
  patients: Patient[],
  weeklyScores: WeeklyScores,
  preScore: QuizScore | null,
  postScore: QuizScore | null,
  gamification: Gamification,
  completedItems: CompletedItems,
  srQueue: SrQueue,
  setPatients: Dispatch<SetStateAction<Patient[]>>,
  setWeeklyScores: Dispatch<SetStateAction<WeeklyScores>>,
  setPreScore: Dispatch<SetStateAction<QuizScore | null>>,
  setPostScore: Dispatch<SetStateAction<QuizScore | null>>,
  setGamification: Dispatch<SetStateAction<Gamification>>,
  setCompletedItems: Dispatch<SetStateAction<CompletedItems>>,
  setBookmarks: Dispatch<SetStateAction<Bookmarks>>,
  setSrQueue: Dispatch<SetStateAction<SrQueue>>,
  setActivityLog: Dispatch<SetStateAction<ActivityLogEntry[]>>,
  setReflections: Dispatch<SetStateAction<ReflectionEntry[]>>,
  setShowOnboarding: Dispatch<SetStateAction<boolean>>,
) {
  const [studentName, setStudentName] = useState("");
  const [studentYear, setStudentYear] = useState("");
  const [studentPin, setStudentPin] = useState("");
  const [studentPinConfirm, setStudentPinConfirm] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [loginMode, setLoginMode] = useState<StudentLoginMode>("first_time");
  const [authSessionKind, setAuthSessionKind] = useState<StudentAuthSessionKind>("none");
  const [emailFlowState, setEmailFlowState] = useState<StudentEmailFlowState>("idle");
  const [pinFlowMode, setPinFlowMode] = useState<StudentPinFlowMode>("create");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [rotationCode, setRotationCodeState] = useState(store.getRotationCode() || "");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [joinConfirmOpen, setJoinConfirmOpen] = useState(false);
  const loginAttemptsRef = useRef<{ count: number; lockedUntil: number }>({ count: 0, lockedUntil: 0 });
  const studentSyncIdentity = useMemo(() => {
    const normalizedEmail = normalizeEmail(studentEmail);
    if (authSessionKind === "verified") {
      return {
        authType: "email_link",
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
      };
    }
    return {
      authType: "guest",
    };
  }, [authSessionKind, studentEmail]);

  const noteStudentUpdatedAt = (updatedAt: string) => {
    latestStudentUpdateRef.current = updatedAt;
  };

  // Wipe the previous account's progress from localStorage AND React state.
  // Without this, a first-time join on a shared device seeded the new
  // student's cloud doc with the previous user's patients/scores (the join
  // payload reads the residual state), and a same-rotation restore auto-saved
  // the residue into the new account two seconds after sign-in.
  const clearResidualStudentProgress = () => {
    RESIDUAL_PROGRESS_KEYS.forEach((key) => localStorage.removeItem(key));
    setPatients([]);
    setWeeklyScores({});
    setPreScore(null);
    setPostScore(null);
    setGamification({ points: 0, achievements: [], streaks: { currentDays: 0, longestDays: 0, lastActiveDate: null } });
    setCompletedItems({ articles: {}, studySheets: {}, cases: {}, decks: {}, consultTopics: {} });
    setBookmarks({ trials: [], articles: [], cases: [], studySheets: [] });
    setSrQueue({});
    setActivityLog([]);
    setReflections([]);
    setJoinedAt(null);
  };

  const applyStudentUser = async (user: User | null) => {
    if (!user) {
      setStudentId("");
      setAuthSessionKind("none");
      return;
    }

    // A different account than the one this device last held: the local
    // progress belongs to the previous user, not this one.
    const previousStudentId = await store.get<string>("neph_studentId");
    if (previousStudentId && previousStudentId !== user.uid) {
      clearResidualStudentProgress();
    }
    // A genuine sign-in supersedes any deferred sign-out still waiting on a
    // drained queue.
    localStorage.removeItem(STUDENT_DEFERRED_SIGNOUT_KEY);

    setStudentId(user.uid);
    await store.set("neph_studentId", user.uid);

    if (user.isAnonymous) {
      setAuthSessionKind("guest");
      return;
    }

    const normalizedEmail = normalizeEmail(user.email || studentEmail || getSavedStudentSignInEmail());
    setAuthSessionKind("verified");
    if (normalizedEmail) {
      setStudentEmail(normalizedEmail);
      await store.set(STUDENT_EMAIL_KEY, normalizedEmail);
    }
  };

  const resolveAssignedRotationCode = async (user: User, explicitCode: string): Promise<string> => {
    const normalizedExplicitCode = explicitCode.trim().toUpperCase();
    if (normalizedExplicitCode.length >= LIMITS.ROTATION_CODE_MIN) {
      return normalizedExplicitCode;
    }

    const assignment = await store.getStudentAssignment(user.uid);
    const assignedCode = assignment?.activeRotationCode?.trim().toUpperCase() || "";
    if (assignedCode.length >= LIMITS.ROTATION_CODE_MIN) {
      setJoinCode(assignedCode);
      return assignedCode;
    }

    throw new Error("student/no-assigned-rotation");
  };

  const loadStudentDataForRotation = async (code: string, studentIdToLoad: string) => {
    const previousRotationCode = store.getRotationCode();
    store.setRotationCode(code);
    try {
      return await store.getStudentData(studentIdToLoad);
    } finally {
      store.setRotationCode(previousRotationCode);
    }
  };

  // Mount-time auth bootstrap, called once from useStudentSync's load effect so the
  // overall load sequence (auth session first, then stored data) stays unchanged.
  // Completes a pending email sign-in link or restores the current Firebase user,
  // and returns the session's student id ("" when no session was established).
  const bootstrapAuthSession = async (): Promise<string> => {
    // "View as student" preview: seed a self-contained guest session WITHOUT
    // any Firebase Auth call (no isStudentEmailLink, getCurrentStudentUser,
    // signInAnonymously, or signOut). getSavedStudentSignInEmail also reads real
    // localStorage, so it must not run either. The seeded neph_studentId is the
    // synthetic preview id; authSessionKind "guest" + idle email flow are what
    // StudentApp's studentReadyForApp gate needs to boot straight into the app.
    if (store.isPreview()) {
      const previewStudentId = (await store.get<string>("neph_studentId")) || "";
      setStudentId(previewStudentId);
      setAuthSessionKind("guest");
      setEmailFlowState("idle");
      return previewStudentId;
    }

    let sessionStudentId = "";
    const savedEmail = normalizeEmail((await store.get<string>(STUDENT_EMAIL_KEY)) || getSavedStudentSignInEmail());
    const savedPinFlowMode = getStoredStudentPinFlowMode();
    if (savedEmail) {
      setStudentEmail(savedEmail);
    }
    if (savedPinFlowMode) {
      setPinFlowMode(savedPinFlowMode);
      setLoginMode(savedPinFlowMode === "create" ? "first_time" : "returning");
    }

    try {
      const pendingEmailLink = await isStudentEmailLink();
      if (pendingEmailLink) {
        if (localStorage.getItem(STUDENT_DEFERRED_SIGNOUT_KEY) === "1") {
          // A deferred sign-out kept the previous student's session alive only
          // so their queue could flush. A new email-link sign-in supersedes it:
          // end the old session NOW, or completeStudentSignInLink would link
          // this email onto the previous (possibly anonymous) account and the
          // new student would inherit the old identity and cloud doc.
          localStorage.removeItem(STUDENT_DEFERRED_SIGNOUT_KEY);
          try {
            await signOutFirebase();
          } catch (error) {
            console.warn("Failed to end deferred-sign-out session before email link:", error);
          }
        }
        const activePinFlowMode = savedPinFlowMode || "create";
        setPinFlowMode(activePinFlowMode);
        setLoginMode(activePinFlowMode === "create" ? "first_time" : "returning");
        if (savedEmail) {
          const { user: completedUser, isNewUser } = await completeStudentSignInLink(savedEmail);
          if (activePinFlowMode === "create" && !isNewUser) {
            // Block re-using an existing email via First Time. Force them to Returning.
            await signOutFirebase();
            setStoredStudentPinFlowMode(null);
            clearEmailLinkParamsFromUrl();
            setEmailFlowState("idle");
            setLoginMode("returning");
            setPinFlowMode("reset");
            setAuthError(`${savedEmail} is already registered. Switch to Returning and use your PIN, or send a reset link.`);
          } else {
            sessionStudentId = completedUser.uid;
            await applyStudentUser(completedUser);
            clearEmailLinkParamsFromUrl();
            setStudentPin("");
            setStudentPinConfirm("");
            setEmailFlowState("pin_setup");
            setAuthNotice(
              activePinFlowMode === "reset"
                ? `Email verified for ${savedEmail}. Create a new ${STUDENT_AUTH_PIN_LENGTH}-digit PIN to continue.`
                : `Email verified for ${savedEmail}. Create your ${STUDENT_AUTH_PIN_LENGTH}-digit PIN to finish setup.`,
            );
          }
        } else {
          setEmailFlowState("needs_completion");
          setAuthNotice("Enter the same email address to finish verification on this device.");
        }
      } else {
        const user = await getCurrentStudentUser();
        if (user && localStorage.getItem(STUDENT_DEFERRED_SIGNOUT_KEY) === "1") {
          // The previous logout is still waiting on its queued final flush;
          // this Firebase session exists only so the pending queue can be
          // written. Keep the UI signed out — useStudentSync flushes the queue
          // and then completes the sign-out.
          return "";
        }
        sessionStudentId = user?.uid || "";
        await applyStudentUser(user);
        if (user && !user.isAnonymous) {
          if (savedPinFlowMode) {
            setEmailFlowState("pin_setup");
            setAuthNotice(
              savedPinFlowMode === "reset"
                ? `Create a new ${STUDENT_AUTH_PIN_LENGTH}-digit PIN to finish signing back in.`
                : `Create your ${STUDENT_AUTH_PIN_LENGTH}-digit PIN to finish setup.`,
            );
          } else {
            setLoginMode("returning");
          }
        } else if (!user && savedPinFlowMode) {
          setStoredStudentPinFlowMode(null);
        }
      }
    } catch (e) {
      console.warn("Student session init failed:", e);
      setEmailFlowState("idle");
      setAuthError(formatStudentAuthError(e));
    }
    return sessionStudentId;
  };

  const handleLoginModeChange = (nextMode: StudentLoginMode) => {
    setLoginMode(nextMode);
    if (emailFlowState === "idle") {
      setPinFlowMode(nextMode === "first_time" ? "create" : "reset");
    }
    setAuthError("");
    setAuthNotice("");
  };

  const handleSendStudentSignInLink = async (mode: StudentPinFlowMode) => {
    const normalizedEmail = normalizeEmail(studentEmail);
    if (mode === "create" && !studentName.trim()) {
      setAuthError("Enter your name before sending the email verification link.");
      return;
    }
    if (!normalizedEmail) {
      setAuthError("Enter your email address first.");
      return;
    }

    setAuthSubmitting(true);
    setAuthError("");
    setAuthNotice("");
    try {
      if (mode === "create") {
        const normalizedName = studentName.trim().slice(0, LIMITS.NAME_MAX);
        if (normalizedName) {
          await store.set("neph_name", normalizedName);
        }
        await store.set(STUDENT_PENDING_JOIN_CODE_KEY, joinCode.trim().toUpperCase());
      }
      await sendStudentSignInLink(normalizedEmail);
      await store.set(STUDENT_EMAIL_KEY, normalizedEmail);
      setPinFlowMode(mode);
      setStoredStudentPinFlowMode(mode);
      setEmailFlowState("link_sent");
      setAuthNotice(
        mode === "reset"
          ? `Check ${normalizedEmail} for a verification link to reset your PIN.`
          : `Check ${normalizedEmail} for your email verification link.`,
      );
    } catch (error) {
      console.error("Student sign-in link failed:", error);
      setAuthError(formatStudentAuthError(error));
    }
    setAuthSubmitting(false);
  };

  const handleCompleteStudentEmailLink = async () => {
    const normalizedEmail = normalizeEmail(studentEmail);
    if (!normalizedEmail) {
      setAuthError("Enter the same email address that received the sign-in link.");
      return;
    }

    setAuthSubmitting(true);
    setAuthError("");
    setAuthNotice("");
    try {
      const { user, isNewUser } = await completeStudentSignInLink(normalizedEmail);
      if (pinFlowMode === "create" && !isNewUser) {
        await signOutFirebase();
        setStoredStudentPinFlowMode(null);
        clearEmailLinkParamsFromUrl();
        setEmailFlowState("idle");
        setLoginMode("returning");
        setPinFlowMode("reset");
        setAuthError(`${normalizedEmail} is already registered. Switch to Returning and use your PIN, or send a reset link.`);
        setAuthSubmitting(false);
        return;
      }
      await applyStudentUser(user);
      clearEmailLinkParamsFromUrl();
      await store.set(STUDENT_EMAIL_KEY, normalizedEmail);
      setStudentPin("");
      setStudentPinConfirm("");
      setEmailFlowState("pin_setup");
      setAuthNotice(
        pinFlowMode === "reset"
          ? `Email verified. Create a new ${STUDENT_AUTH_PIN_LENGTH}-digit PIN to continue.`
          : `Email verified. Create your ${STUDENT_AUTH_PIN_LENGTH}-digit PIN to finish setup.`,
      );
    } catch (error) {
      console.error("Student email sign-in completion failed:", error);
      setAuthError(formatStudentAuthError(error));
    }
    setAuthSubmitting(false);
  };

  const handleUseDifferentStudentAccount = async () => {
    setAuthSubmitting(true);
    setAuthError("");
    setAuthNotice("");
    try {
      await signOutFirebase();
    } catch (error) {
      console.warn("Failed to clear trusted student session:", error);
    }

    clearSavedStudentSignInEmail();
    setStoredStudentPinFlowMode(null);
    localStorage.removeItem(STUDENT_EMAIL_KEY);
    localStorage.removeItem("neph_studentId");
    localStorage.removeItem("neph_pin");
    localStorage.removeItem("neph_name");
    localStorage.removeItem(STUDENT_PENDING_JOIN_CODE_KEY);
    // The explicit sign-out above ends any session a deferred sign-out was
    // keeping alive; the flag must not linger and sign out a future session.
    localStorage.removeItem(STUDENT_DEFERRED_SIGNOUT_KEY);
    // The next person on this device is a different student: don't let the
    // previous user's local progress seed their account.
    clearResidualStudentProgress();
    setStudentName("");
    setStudentId("");
    setStudentEmail("");
    setStudentPin("");
    setStudentPinConfirm("");
    setNameSet(false);
    setJoinCode("");
    setJoinError("");
    setAuthSessionKind("none");
    setEmailFlowState("idle");
    setPinFlowMode("create");
    setLoginMode("first_time");
    setAuthNotice("This device is signed out. Start with First time, or switch to Returning if you already have a PIN.");
    setAuthSubmitting(false);
  };

  const handleUpdateStudentName = async (nextName: string) => {
    const trimmedName = nextName.trim().slice(0, LIMITS.NAME_MAX);
    if (!trimmedName) {
      throw new Error("Enter your name before saving.");
    }

    setStudentName(trimmedName);
    setNameSet(true);
    await store.set("neph_name", trimmedName);

    if (!store.getRotationCode() || !studentId) return;

    const updatedAt = new Date().toISOString();
    const points = calculatePoints({ patients, weeklyScores, preScore, postScore, gamification, completedItems, srQueue });
    noteStudentUpdatedAt(updatedAt);

    await Promise.all([
      store.setStudentData(studentId, {
        name: trimmedName,
        ...studentSyncIdentity,
        updatedAt,
      }),
      store.setTeamSnapshot(studentId, buildTeamSnapshot({
        studentId,
        name: trimmedName,
        patients,
        points,
        updatedAt,
      })),
    ]);
  };

  const handleUpdateStudentYear = async (nextYear: string) => {
    const trimmedYear = nextYear.trim();
    if (!trimmedYear) {
      throw new Error("Choose your year before saving.");
    }

    setStudentYear(trimmedYear);
    await store.set(STUDENT_YEAR_KEY, trimmedYear);

    if (!store.getRotationCode() || !studentId) return;

    const updatedAt = new Date().toISOString();
    noteStudentUpdatedAt(updatedAt);

    await store.setStudentData(studentId, {
      year: trimmedYear,
      ...studentSyncIdentity,
      updatedAt,
    });
  };

  const handleJoinRotation = async (skipEmailProfileConfirm = false) => {
    const normalizedName = studentName.trim();
    const normalizedJoinCode = joinCode.trim().toUpperCase();
    const normalizedEmail = normalizeEmail(studentEmail);
    const trustedSessionReady = authSessionKind === "verified";
    const pinSetupPending = emailFlowState === "pin_setup";
    const needsEmailCompletion = emailFlowState === "needs_completion";
    const requiresManualRotationCode = loginMode === "first_time" || pinSetupPending || !trustedSessionReady;

    if (loginMode === "first_time" && !normalizedName) {
      setJoinError("Enter your name so we can create your student profile.");
      return;
    }
    if (requiresManualRotationCode && normalizedJoinCode.length < LIMITS.ROTATION_CODE_MIN) {
      setJoinError("Enter the rotation code from your attending.");
      return;
    }
    if (pinSetupPending) {
      if (!normalizedEmail) {
        setAuthError("Enter the same email address you just verified.");
        return;
      }
      if (studentPin.length !== STUDENT_AUTH_PIN_LENGTH) {
        setAuthError(`Create a ${STUDENT_AUTH_PIN_LENGTH}-digit PIN to continue.`);
        return;
      }
      if (studentPin !== studentPinConfirm) {
        setAuthError("Enter the same PIN twice.");
        return;
      }
      if (!trustedSessionReady) {
        setAuthError("Finish email verification before creating your PIN.");
        return;
      }
    } else if (needsEmailCompletion) {
      setAuthError("Complete email verification before joining this rotation.");
      return;
    } else if (!trustedSessionReady) {
      if (!normalizedEmail) {
        setAuthError("Enter your email address first.");
        return;
      }
      if (studentPin.length !== STUDENT_AUTH_PIN_LENGTH) {
        setAuthError(`Enter your ${STUDENT_AUTH_PIN_LENGTH}-digit PIN to continue.`);
        return;
      }
    }

    if (!normalizedName && loginMode === "first_time") {
      setJoinError("Enter your name so we can create your student profile.");
      return;
    }

    // Rate limiting: block after 5 failed attempts for 30 seconds
    const now = Date.now();
    const attempts = loginAttemptsRef.current;
    if (attempts.lockedUntil > now) {
      const secsLeft = Math.ceil((attempts.lockedUntil - now) / 1000);
      setJoinError(`Too many attempts. Try again in ${secsLeft}s.`);
      return;
    }

    setJoining(true);
    setJoinError("");
    setAuthError("");
    try {
      let user: User;
      if (pinSetupPending) {
        const signedInUser = await getCurrentStudentUser();
        if (!signedInUser || signedInUser.isAnonymous) {
          setAuthError("Finish email verification before creating your PIN.");
          setJoining(false);
          return;
        }
        user = signedInUser;
      } else if (trustedSessionReady) {
        const signedInUser = await getCurrentStudentUser();
        if (!signedInUser || signedInUser.isAnonymous) {
          setAuthError("Sign in again to continue.");
          setJoining(false);
          return;
        }
        user = signedInUser;
      } else {
        try {
          user = await signInStudentWithPin(normalizedEmail, studentPin);
        } catch (error) {
          attempts.count++;
          if (attempts.count >= 5) {
            attempts.lockedUntil = Date.now() + 30_000;
            attempts.count = 0;
            setAuthError("Too many failed PIN attempts. Locked for 30 seconds.");
          } else {
            setAuthError(formatStudentAuthError(error));
          }
          setJoining(false);
          return;
        }
        await applyStudentUser(user);
        setStudentPin("");
        setStudentPinConfirm("");
        setStoredStudentPinFlowMode(null);
        setEmailFlowState("idle");
        setAuthNotice(`Signed in as ${normalizedEmail}. This device will stay signed in unless you sign out.`);
      }

      const effectiveJoinCode = await resolveAssignedRotationCode(user, normalizedJoinCode);
      const codeCheck = await store.validateRotationCode(effectiveJoinCode);
      if (!codeCheck.ok) {
        // We couldn't reach auth/Firestore (offline, or hospital wifi blocking
        // googleapis.com) — don't claim the code is wrong when we never checked it.
        setJoinError("Can't reach the server. Check your connection — hospital Wi-Fi may block the app — and try again.");
        setJoining(false);
        return;
      }
      if (!codeCheck.exists) {
        // Don't increment the PIN rate-limit counter: an unknown rotation code
        // is a typo or a rotation the attending hasn't published yet, not a credential attack.
        setJoinError("Rotation not found. Check the code with your attending and try again.");
        setJoining(false);
        return;
      }

      // Reset attempts on successful validation
      attempts.count = 0;
      attempts.lockedUntil = 0;

      if (pinSetupPending) {
        await setStudentPinCredential(studentPin);
        await applyStudentUser(user);
        setStudentPin("");
        setStudentPinConfirm("");
        setEmailFlowState("idle");
        setStoredStudentPinFlowMode(null);
        setAuthNotice(
          pinFlowMode === "reset"
            ? `PIN updated for ${normalizedEmail}. Use it next time you sign in.`
            : `PIN created for ${normalizedEmail}. This device will stay signed in unless you sign out.`,
        );
      }

      const sid = user.uid;
      const existingData = await loadStudentDataForRotation(effectiveJoinCode, sid);
      if (!existingData && !normalizedName) {
        setJoinError("We couldn’t find your assigned rotation. Use First time if this is a new rotation for you.");
        setJoining(false);
        return;
      }
      if (!existingData && !skipEmailProfileConfirm) {
        setJoinConfirmOpen(true);
        setJoining(false);
        return;
      }

      // Set rotation code first so store methods work
      store.setRotationCode(effectiveJoinCode);
      setRotationCodeState(effectiveJoinCode);
      setJoinCode(effectiveJoinCode);
      setStudentId(sid);

      const localJoinedAt = joinedAt || await store.get<string>(JOINED_AT_KEY);
      const studentIdentity = user.isAnonymous
        ? { authType: "guest" as const }
        : {
            authType: "email_link" as const,
            ...(normalizedEmail || user.email ? { email: normalizeEmail(user.email || normalizedEmail) } : {}),
          };
      if (existingData) {
        // Returning student on the same account — restore their data
        if (existingData.patients) setPatients(existingData.patients);
        if (existingData.weeklyScores) setWeeklyScores(existingData.weeklyScores);
        if (existingData.preScore) setPreScore(existingData.preScore);
        if (existingData.postScore) setPostScore(existingData.postScore);
        if (existingData.gamification) setGamification(existingData.gamification);
        if (existingData.completedItems) setCompletedItems(existingData.completedItems);
        if (existingData.bookmarks) setBookmarks(existingData.bookmarks);
        if (existingData.srQueue) setSrQueue(existingData.srQueue);
        if (existingData.activityLog) setActivityLog(existingData.activityLog);
        if (existingData.reflections) setReflections(existingData.reflections);
        if (typeof existingData.name === "string" && existingData.name.trim()) {
          setStudentName(existingData.name);
        }
        if (typeof existingData.year === "string" && existingData.year.trim()) {
          setStudentYear(existingData.year);
          await store.set(STUDENT_YEAR_KEY, existingData.year);
        }
        const restoredJoinedAt = typeof existingData.joinedAt === "string" ? existingData.joinedAt : localJoinedAt;
        if (restoredJoinedAt) {
          setJoinedAt(restoredJoinedAt);
          await store.set(JOINED_AT_KEY, restoredJoinedAt);
        }
        const updatedAt = new Date().toISOString();
        noteStudentUpdatedAt(updatedAt);
        await store.setStudentData(sid, {
          name: typeof existingData.name === "string" && existingData.name.trim() ? existingData.name : normalizedName,
          ...studentIdentity,
          updatedAt,
        });
      } else {
        // First join on this account for this rotation
        const newJoinedAt = new Date().toISOString();
        await store.setStudentData(sid, {
          name: normalizedName,
          ...(studentYear ? { year: studentYear } : {}),
          ...studentIdentity,
          patients,
          weeklyScores,
          preScore,
          postScore,
          gamification,
          joinedAt: newJoinedAt,
          status: "active",
        });
        setJoinedAt(newJoinedAt);
        await store.set(JOINED_AT_KEY, newJoinedAt);
      }

      // Persist locally
      setNameSet(true);
      if (!localStorage.getItem("neph_hasSeenOnboarding")) setShowOnboarding(true);
      await store.set("neph_name", (typeof existingData?.name === "string" && existingData.name.trim()) ? existingData.name : normalizedName);
      localStorage.removeItem("neph_pin");
      await store.set("neph_studentId", sid);
      if (!user.isAnonymous) {
        const resolvedEmail = normalizeEmail(user.email || normalizedEmail);
        await store.set(STUDENT_EMAIL_KEY, resolvedEmail);
        await store.setStudentAssignment(sid, {
          activeRotationCode: effectiveJoinCode,
          ...(resolvedEmail ? { email: resolvedEmail } : {}),
        });
      }
      localStorage.removeItem(STUDENT_PENDING_JOIN_CODE_KEY);
      if (existingData && !localJoinedAt && typeof existingData.joinedAt !== "string") {
        const fallbackJoinedAt = new Date().toISOString();
        setJoinedAt(fallbackJoinedAt);
        await store.set(JOINED_AT_KEY, fallbackJoinedAt);
      }
    } catch (e) {
      console.error("Join rotation error:", e);
      if (e instanceof Error && e.message === "student/no-assigned-rotation") {
        setJoinError("We couldn’t find your assigned rotation yet. Use First time with your rotation code if this is a new rotation.");
      } else {
        setJoinError("Unable to start your student session. Check your internet connection and try again. If it keeps happening, ask your attending for help.");
      }
    }
    setJoining(false);
  };

  return {
    studentName, setStudentName,
    studentYear, setStudentYear,
    studentPin, setStudentPin,
    studentPinConfirm, setStudentPinConfirm,
    studentEmail, setStudentEmail,
    loginMode, setLoginMode,
    authSessionKind, setAuthSessionKind,
    emailFlowState, setEmailFlowState,
    pinFlowMode, setPinFlowMode,
    authSubmitting, setAuthSubmitting,
    authError, setAuthError,
    authNotice, setAuthNotice,
    nameSet, setNameSet,
    studentId, setStudentId,
    rotationCode, setRotationCodeState,
    joinCode, setJoinCode,
    joinError, setJoinError,
    joining,
    joinedAt, setJoinedAt,
    joinConfirmOpen, setJoinConfirmOpen,
    studentSyncIdentity,
    bootstrapAuthSession,
    handleLoginModeChange,
    handleSendStudentSignInLink,
    handleCompleteStudentEmailLink,
    handleUseDifferentStudentAccount,
    handleUpdateStudentName,
    handleUpdateStudentYear,
    handleJoinRotation,
  };
}
