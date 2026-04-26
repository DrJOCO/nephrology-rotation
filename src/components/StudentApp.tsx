import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { BookOpen, Stethoscope, Activity, Users, Search, User as UserIcon, Flame, WifiOff, LogOut, X, Home } from "lucide-react";
import { T, WEEKLY, ARTICLES, STUDY_SHEETS, CURRICULUM_DECKS } from "../data/constants";
import { PRE_QUIZ, POST_QUIZ, TOPIC_REINFORCEMENT_BANK, WEEKLY_QUIZZES, getQuestionByKey, resolveReinforcementTopic, topicToSlug } from "../data/quizzes";
import { processQuizResults, processReviewResults, getDueItems, seedTopicReinforcementSr } from "../utils/spacedRepetition";
import store from "../utils/store";
import {
  clearSavedStudentSignInEmail,
  completeStudentSignInLink,
  getCurrentStudentUser,
  getSavedStudentSignInEmail,
  isStudentEmailLink,
  normalizeStudentPinInput,
  sendStudentSignInLink,
  setStudentPinCredential,
  signOutFirebase,
  signInStudentWithPin,
  STUDENT_AUTH_PIN_LENGTH,
} from "../utils/firebase";
import { ensureGoogleFonts, ensureLayoutStyles, ensureThemeStyles, SHARED_KEYS, useIsMobile, useOnline, useFocusTrap } from "../utils/helpers";
import { calculatePoints, checkAchievements, updateStreak } from "../utils/gamification";
import { ensureCurrentClinicGuide } from "../utils/clinicRotation";
import { buildCompetencySummary } from "../utils/competency";
import { getStudentCurrentModule, hasRotationEnded } from "../utils/moduleProgression";
import { buildTeamSnapshot } from "../utils/teamSnapshots";
import { buildBookmarkActivityDetail, describeStudentNavigation } from "../utils/activityLog";
import { addReflectionItemsToSrQueue, buildReflectionActivityDetail, buildReflectionEntry } from "../utils/reflections";
import { LIMITS } from "../utils/validation";
import type { Patient, QuizScore, WeeklyScores, SubView, Announcement, SharedSettings, Gamification, ActivityLogEntry, SrQueue, CompletedItems, Bookmarks, ClinicGuideRecord, ReflectionEntry } from "../types";
import type { User } from "firebase/auth";

// Critical-path components (eager)
import ThemeToggle from "./student/ThemeToggle";
import OnboardingOverlay from "./student/OnboardingOverlay";
import LoginScreen from "./student/LoginScreen";
import GlobalSearchOverlay from "./student/GlobalSearchOverlay";
import HomeTab from "./student/HomeTab";

// Lazy-loaded sub-views
const BookmarksView = lazy(() => import("./student/BookmarksView"));
const AssessmentResultsView = lazy(() => import("./student/AssessmentResultsView"));
const ArticlesView = lazy(() => import("./student/ArticlesView"));
const LandmarkTrialsView = lazy(() => import("./student/LandmarkTrialsView"));
const TrialLibraryView = lazy(() => import("./student/TrialLibraryView"));
const StudySheetsView = lazy(() => import("./student/StudySheetsView"));
const CasesView = lazy(() => import("./student/CasesView"));
const ResourcesView = lazy(() => import("./student/ResourcesView"));
const AbbreviationsView = lazy(() => import("./student/AbbreviationsView"));
const FaqView = lazy(() => import("./student/FaqView"));
const QuizEngine = lazy(() => import("./student/QuizEngine"));
const RefsTab = lazy(() => import("./student/RefsTab"));
const RefDetailView = lazy(() => import("./student/RefDetailView"));
const GuideTab = lazy(() => import("./student/GuideTab"));
const PatientTab = lazy(() => import("./student/PatientTab"));
const TeamTab = lazy(() => import("./student/TeamTab"));
const ProgressTab = lazy(() => import("./student/ProgressTab"));
const TopicBrowseView = lazy(() => import("./student/TopicBrowseView"));
const ClinicGuideView = lazy(() => import("./student/ClinicGuideView"));
const ClinicGuideHistoryView = lazy(() => import("./student/ClinicGuideHistoryView"));
const InpatientGuideView = lazy(() => import("./student/InpatientGuideView"));
const RotationGuideView = lazy(() => import("./student/RotationGuideView"));

const LazyFallback = () => (
  <div style={{ padding: 40, textAlign: "center" }}>
    <div style={{ color: T.sub, fontFamily: T.serif, fontSize: 14 }}>Loading...</div>
  </div>
);

const INSTALL_PROMPT_DISMISSED_KEY = "neph_installPromptDismissed";
const JOINED_AT_KEY = "neph_joinedAt";
const INSTALL_PROMPT_DELAY_MS = 18 * 60 * 60 * 1000;
const STUDENT_EMAIL_KEY = "neph_studentEmail";
const STUDENT_YEAR_KEY = "neph_studentYear";
const STUDENT_PIN_FLOW_MODE_KEY = "neph_studentPinFlowMode";
const STUDENT_PENDING_JOIN_CODE_KEY = "neph_studentPendingJoinCode";
const STUDENT_YEAR_OPTIONS = ["MS3", "MS4"] as const;
type StudentLoginMode = "first_time" | "returning";
type StudentAuthSessionKind = "none" | "guest" | "verified";
type StudentEmailFlowState = "idle" | "link_sent" | "needs_completion" | "pin_setup";
type StudentPinFlowMode = "create" | "reset";

interface DeferredInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function extractMissedTopics(
  answers: Array<{ qIdx: number; correct: boolean }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  questions: any[],
): string[] {
  const topics = new Set<string>();
  for (const a of answers) {
    if (a.correct) continue;
    const q = questions[a.qIdx];
    const topic = resolveReinforcementTopic(q);
    if (topic) topics.add(topic);
  }
  return Array.from(topics);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getStoredStudentPinFlowMode(): StudentPinFlowMode | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STUDENT_PIN_FLOW_MODE_KEY);
  return value === "create" || value === "reset" ? value : null;
}

function setStoredStudentPinFlowMode(mode: StudentPinFlowMode | null): void {
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


function StudentApp({ onAdminToggle }: { onAdminToggle?: () => void }) {
  const isMobile = useIsMobile();
  const adminTapRef = useRef<number[]>([]);
  const handleTitleTap = () => {
    const now = Date.now();
    adminTapRef.current = [...adminTapRef.current.filter(t => now - t < 800), now];
    if (adminTapRef.current.length >= 5 && onAdminToggle) { adminTapRef.current = []; onAdminToggle(); }
  };
  const [tab, setTab] = useState("today");
  const [subView, setSubView] = useState<SubView>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [weeklyScores, setWeeklyScores] = useState<WeeklyScores>({});
  const [preScore, setPreScore] = useState<QuizScore | null>(null);
  const [postScore, setPostScore] = useState<QuizScore | null>(null);
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [curriculum, setCurriculum] = useState(WEEKLY);
  const [articles, setArticles] = useState(ARTICLES);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [rotationCode, setRotationCodeState] = useState(store.getRotationCode() || "");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [gamification, setGamification] = useState<Gamification>({ points: 0, achievements: [], streaks: { currentDays: 0, longestDays: 0, lastActiveDate: null } });
  const [sharedSettings, setSharedSettings] = useState<SharedSettings | null>(null);
  const [completedItems, setCompletedItems] = useState<CompletedItems>({ articles: {}, studySheets: {}, cases: {}, decks: {} });
  const [searchOpen, setSearchOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmarks>({ trials: [], articles: [], cases: [], studySheets: [] });
  const [srQueue, setSrQueue] = useState<SrQueue>({});
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [clinicGuides, setClinicGuides] = useState<ClinicGuideRecord[]>([]);
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<DeferredInstallPromptEvent | null>(null);
  const [installPromptDismissed, setInstallPromptDismissed] = useState(() => localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === "1");
  // Phase 1 (spec §12): accessible logout confirmation — replaces window.confirm.
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [joinConfirmOpen, setJoinConfirmOpen] = useState(false);
  // Phase 2 (spec §01): profile sheet holds name, code, theme toggle, end-session.
  const [profileOpen, setProfileOpen] = useState(false);
  const online = useOnline();
  const [pendingSyncCount, setPendingSyncCount] = useState(() => store.getPendingSyncCount());
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStudentUpdateRef = useRef<string | null>(null);
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

  const applyStudentUser = async (user: User | null) => {
    if (!user) {
      setStudentId("");
      setAuthSessionKind("none");
      return;
    }

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as DeferredInstallPromptEvent;
      if (typeof promptEvent.prompt !== "function") return;
      event.preventDefault?.();
      setInstallPromptEvent(promptEvent);
    };

    const handleInstalled = () => {
      setInstallPromptEvent(null);
      setInstallPromptDismissed(true);
      localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, "1");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => store.onPendingSyncChanged(setPendingSyncCount), []);

  useEffect(() => {
    if (!online) return;
    void store.flushPendingSyncQueue();
  }, [online, studentId, nameSet]);

  const logActivity = (type: string, label: string, detail = "") => {
    setActivityLog(prev => [...prev, { type, label, detail, timestamp: new Date().toISOString() }].slice(-50));
  };

  const noteStudentUpdatedAt = (updatedAt: string) => {
    latestStudentUpdateRef.current = updatedAt;
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

  // Load from storage on mount
  useEffect(() => {
    ensureGoogleFonts();
    ensureLayoutStyles();
    ensureThemeStyles();
    (async () => {
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

      const name = await store.get<string>("neph_name");
      const year = await store.get<string>(STUDENT_YEAR_KEY);
      const pin = await store.get<string>("neph_pin");
      const pendingJoinCode = await store.get<string>(STUDENT_PENDING_JOIN_CODE_KEY);
      const sidFromStore = await store.get<string>("neph_studentId");
      const storedJoinedAt = await store.get<string>(JOINED_AT_KEY);
      const pts = await store.get<Patient[]>("neph_patients");
      const ws = await store.get<WeeklyScores>("neph_weeklyScores");
      const pre = await store.get<QuizScore>("neph_preScore");
      const post = await store.get<QuizScore>("neph_postScore");

      const sharedCurriculum = await store.getShared<typeof WEEKLY>(SHARED_KEYS.curriculum);
      const sharedArticles = await store.getShared<typeof ARTICLES>(SHARED_KEYS.articles);
      const sharedAnnouncements = await store.getShared<Announcement[]>(SHARED_KEYS.announcements);
      const sharedSettingsData = await store.getShared<SharedSettings>(SHARED_KEYS.settings);

      if (!sessionStudentId && sidFromStore) setStudentId(sidFromStore);
      if (name) { setStudentName(name); setNameSet(true); }
      if (year) setStudentYear(year);
      if (pin) setStudentPin(normalizeStudentPinInput(pin));
      if (pendingJoinCode) setJoinCode(pendingJoinCode.trim().toUpperCase());
      if (storedJoinedAt) setJoinedAt(storedJoinedAt);
      if (pts) setPatients(pts);
      if (ws) setWeeklyScores(ws);
      if (pre) setPreScore(pre);
      if (post) setPostScore(post);
      if (sharedCurriculum) setCurriculum(sharedCurriculum);
      if (sharedArticles) setArticles(sharedArticles);
      if (sharedAnnouncements) setAnnouncements(sharedAnnouncements);
      if (sharedSettingsData) setSharedSettings(sharedSettingsData);
      const sharedClinicGuides = await store.getShared<ClinicGuideRecord[]>(SHARED_KEYS.clinicGuides);
      const loadedGuides = sharedClinicGuides || [];
      const { guides: updatedGuides } = ensureCurrentClinicGuide(loadedGuides);
      setClinicGuides(updatedGuides);
      const completed = await store.get<CompletedItems>("neph_completedItems");
      if (completed) setCompletedItems(completed);
      const savedBookmarks = await store.get<Bookmarks>("neph_bookmarks");
      if (savedBookmarks) setBookmarks(savedBookmarks);
      const savedSrQueue = await store.get<SrQueue>("neph_srQueue");
      if (savedSrQueue) setSrQueue(savedSrQueue);
      const savedLog = await store.get<ActivityLogEntry[]>("neph_activityLog");
      if (savedLog) setActivityLog(savedLog);
      const savedReflections = await store.get<ReflectionEntry[]>("neph_reflections");
      if (savedReflections) setReflections(savedReflections);
      const savedGamification = await store.get<Gamification>("neph_gamification");
      if (savedGamification) setGamification(savedGamification);
      setLoading(false);
    })();
  // `applyStudentUser` depends on `studentEmail`, but we only want bootstrap once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save on changes (consolidated)
  useEffect(() => {
    if (loading) return;
    store.set("neph_patients", patients);
    store.set("neph_weeklyScores", weeklyScores);
    store.set("neph_preScore", preScore);
    store.set("neph_postScore", postScore);
    if (nameSet) store.set("neph_name", studentName);
    if (studentYear) store.set(STUDENT_YEAR_KEY, studentYear);
    if (studentEmail) store.set(STUDENT_EMAIL_KEY, normalizeEmail(studentEmail));
    store.set("neph_completedItems", completedItems);
    store.set("neph_bookmarks", bookmarks);
    store.set("neph_srQueue", srQueue);
    store.set("neph_activityLog", activityLog);
    store.set("neph_reflections", reflections);
    store.set("neph_gamification", gamification);

    // Auto-sync to Firestore (debounced)
    if (store.getRotationCode() && studentId && nameSet && studentName.trim()) {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        const updatedAt = new Date().toISOString();
        const points = calculatePoints({ patients, weeklyScores, preScore, postScore, gamification, completedItems, srQueue });
        noteStudentUpdatedAt(updatedAt);
        store.setStudentData(studentId, {
          name: studentName,
          ...studentSyncIdentity,
          patients,
          weeklyScores,
          preScore,
          postScore,
          gamification,
          completedItems,
          bookmarks,
          srQueue,
          activityLog,
          reflections,
          updatedAt,
        });
        store.setTeamSnapshot(studentId, buildTeamSnapshot({
          studentId,
          name: studentName,
          patients,
          points,
          updatedAt,
        }));
      }, 2000);
    }
  }, [patients, weeklyScores, preScore, postScore, studentName, nameSet, loading, completedItems, bookmarks, srQueue, activityLog, reflections, gamification, studentId, studentEmail, studentSyncIdentity]);

  // Gamification recompute — intentionally excludes `gamification` from deps to prevent infinite loop
  useEffect(() => {
    if (loading || !nameSet) return;
    const state = { patients, weeklyScores, preScore, postScore, gamification, completedItems, srQueue };
    const newPoints = calculatePoints(state);
    const newStreaks = updateStreak(gamification);
    const newlyEarned = checkAchievements(state);

    if (newPoints !== gamification.points || newlyEarned.length > 0 || newStreaks.lastActiveDate !== gamification.streaks?.lastActiveDate) {
      const updated = {
        points: newPoints,
        achievements: [...(gamification.achievements || []), ...newlyEarned],
        streaks: newStreaks,
      };
      setGamification(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients, weeklyScores, preScore, postScore, nameSet, loading, completedItems, srQueue]);

  // Real-time rotation data listener
  useEffect(() => {
    if (!store.getRotationCode()) return;
    const unsub = store.onRotationChanged((data) => {
      if (data.curriculum) setCurriculum(data.curriculum);
      if (data.articles) setArticles(data.articles);
      if (data.announcements) setAnnouncements(data.announcements);
      if (data.settings) setSharedSettings(data.settings);
      if (data.clinicGuides) setClinicGuides(data.clinicGuides);
    });
    return () => unsub();
  }, [rotationCode]);

  // Real-time listener: admin changes to this student's data (including resets)
  useEffect(() => {
    if (!store.getRotationCode() || !studentId || !nameSet) return;
    const unsub = store.onStudentDataChanged(studentId, (data) => {
      const incomingUpdatedAt = typeof data.updatedAt === "string" ? data.updatedAt : null;
      if (incomingUpdatedAt) {
        const latestKnownUpdatedAt = latestStudentUpdateRef.current;
        if (latestKnownUpdatedAt && incomingUpdatedAt <= latestKnownUpdatedAt) return;
        latestStudentUpdateRef.current = incomingUpdatedAt;
      }
      if (data.patients) setPatients(data.patients);
      if (data.weeklyScores) setWeeklyScores(data.weeklyScores);
      // Use hasOwnProperty so admin resets that null-out scores still apply
      if (Object.prototype.hasOwnProperty.call(data, "preScore")) setPreScore(data.preScore);
      if (Object.prototype.hasOwnProperty.call(data, "postScore")) setPostScore(data.postScore);
      if (data.gamification) setGamification(data.gamification);
      if (data.completedItems) setCompletedItems(data.completedItems);
      if (data.bookmarks) setBookmarks(data.bookmarks);
      if (data.srQueue) setSrQueue(data.srQueue);
      if (data.activityLog) setActivityLog(data.activityLog);
      if (data.reflections) setReflections(data.reflections);
      if (typeof data.name === "string" && data.name.trim()) {
        setStudentName(data.name);
        store.set("neph_name", data.name);
      }
      if (typeof data.year === "string" && data.year.trim()) {
        setStudentYear(data.year);
        store.set(STUDENT_YEAR_KEY, data.year);
      }
    });
    return () => unsub();
  }, [studentId, nameSet, rotationCode]);

  // Phase 3 (spec §01/§03): 5-tab IA — today · library · inpatients · team · me.
  // Old tab ids were aliased during 3a; Phase 3b removed the alias shim after all
  // call sites were canonicalized (commit 4da55c6).
  const navigate = (t: string, sv: SubView = null) => {
    const activity = describeStudentNavigation(sv, { articlesByWeek: articles, clinicGuides });
    if (activity) {
      logActivity(activity.type, activity.label, activity.detail);
    }
    setTab(t);
    setSubView(sv);
    window.scrollTo(0, 0);
  };

  const toggleBookmark = (type: keyof Bookmarks, itemId: string) => {
    const arr = bookmarks[type] || [];
    const exists = arr.includes(itemId);
    setBookmarks(prev => ({
      ...prev,
      [type]: exists ? prev[type].filter(id => id !== itemId) : [...prev[type], itemId],
    }));
    logActivity(
      "bookmark",
      exists ? "Bookmark removed" : "Bookmark saved",
      buildBookmarkActivityDetail(type, itemId, articles),
    );
  };

  const flushStudentSync = async () => {
    if (!store.getRotationCode() || !studentId || !nameSet || !studentName.trim()) return;

    const updatedAt = new Date().toISOString();
    const points = calculatePoints({ patients, weeklyScores, preScore, postScore, gamification, completedItems, srQueue });
    noteStudentUpdatedAt(updatedAt);

    await Promise.all([
      store.setStudentData(studentId, {
        name: studentName,
        ...studentSyncIdentity,
        patients,
        weeklyScores,
        preScore,
        postScore,
        gamification,
        completedItems,
        bookmarks,
        srQueue,
        activityLog,
        reflections,
        updatedAt,
      }),
      store.setTeamSnapshot(studentId, buildTeamSnapshot({
        studentId,
        name: studentName,
        patients,
        points,
        updatedAt,
      })),
    ]);
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
      const exists = await store.validateRotationCode(effectiveJoinCode);
      if (!exists) {
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

  const handleSubmitReflection = async ({ saw, unclear }: { saw: string; unclear: string }) => {
    const entry = buildReflectionEntry({
      saw,
      unclear,
      fallbackWeek: currentWeek || 1,
      srQueue,
    });
    const nextReflections = [...reflections.filter((item) => item.dayKey !== entry.dayKey), entry].slice(-30);
    setReflections(nextReflections);
    setSrQueue((prev) => addReflectionItemsToSrQueue(prev, entry.seededQuestionKeys));
    logActivity("reflection", "End-of-day reflection", buildReflectionActivityDetail(entry));
    return entry;
  };

  const dismissInstallPrompt = () => {
    setInstallPromptDismissed(true);
    localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, "1");
  };

  const handleInstallApp = async () => {
    if (!installPromptEvent) return;
    try {
      await installPromptEvent.prompt();
      await installPromptEvent.userChoice;
    } catch (error) {
      console.warn("Install prompt failed:", error);
    } finally {
      setInstallPromptEvent(null);
      dismissInstallPrompt();
    }
  };


  const requestLogout = () => setLogoutConfirmOpen(true);

  const handleLogout = async () => {
    setLogoutConfirmOpen(false);
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    await flushStudentSync();
    try {
      await signOutFirebase();
    } catch (e) {
      console.warn("Student sign-out failed:", e);
    }

    clearSavedStudentSignInEmail();
    setStoredStudentPinFlowMode(null);
    ["neph_name", STUDENT_YEAR_KEY, "neph_pin", "neph_studentId", STUDENT_EMAIL_KEY, STUDENT_PENDING_JOIN_CODE_KEY, "neph_patients", "neph_weeklyScores", "neph_preScore", "neph_postScore", "neph_rotationCode", "neph_completedItems", "neph_gamification", "neph_bookmarks", "neph_srQueue", "neph_activityLog", "neph_reflections", JOINED_AT_KEY].forEach(k => localStorage.removeItem(k));
    store.setRotationCode(null);
    // Reset all state
    setStudentName("");
    setStudentYear("");
    setStudentPin("");
    setStudentPinConfirm("");
    setStudentEmail("");
    setStudentId("");
    setLoginMode("first_time");
    setAuthSessionKind("none");
    setEmailFlowState("idle");
    setPinFlowMode("create");
    setAuthSubmitting(false);
    setAuthError("");
    setAuthNotice("");
    setNameSet(false);
    setRotationCodeState("");
    setJoinCode("");
    setJoinError("");
    setPatients([]);
    setWeeklyScores({});
    setPreScore(null);
    setPostScore(null);
    setGamification({ points: 0, achievements: [], streaks: { currentDays: 0, longestDays: 0, lastActiveDate: null } });
    setCompletedItems({ articles: {}, studySheets: {}, cases: {}, decks: {} });
    setBookmarks({ trials: [], articles: [], cases: [], studySheets: [] });
    setSrQueue({});
    setActivityLog([]);
    setReflections([]);
    setJoinedAt(null);
    setTab("today");
    setSubView(null);
  };

  const totalWeeks = parseInt(sharedSettings?.duration || "4", 10);
  const currentWeek = useMemo(() => getStudentCurrentModule({
    rotationStart: sharedSettings?.rotationStart,
    totalWeeks,
    completedItems,
    weeklyScores,
  }), [completedItems, sharedSettings?.rotationStart, totalWeeks, weeklyScores]);
  const rotationEnded = useMemo(
    () => hasRotationEnded(sharedSettings?.rotationStart, totalWeeks),
    [sharedSettings?.rotationStart, totalWeeks],
  );
  const competencySummary = useMemo(() => buildCompetencySummary({
    weeklyScores,
    preScore,
    postScore,
    completedItems,
    srQueue,
    currentWeek,
    totalWeeks,
    articlesByWeek: articles,
  }), [weeklyScores, preScore, postScore, completedItems, srQueue, currentWeek, totalWeeks, articles]);
  const installPromptVariant = useMemo(() => {
    if (typeof window === "undefined" || !nameSet || installPromptDismissed || !joinedAt) return null;
    const joinedMs = new Date(joinedAt).getTime();
    if (Number.isNaN(joinedMs) || Date.now() - joinedMs < INSTALL_PROMPT_DELAY_MS) return null;

    const inStandaloneMode = window.matchMedia("(display-mode: standalone)").matches
      || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    if (inStandaloneMode) return null;

    if (installPromptEvent) return "native";

    const userAgent = navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios/.test(userAgent);
    return isIos && isSafari ? "ios" : null;
  }, [installPromptDismissed, installPromptEvent, joinedAt, nameSet]);

  const activeRotationCode = rotationCode || store.getRotationCode() || "";
  const studentReadyForApp = Boolean(
    nameSet
    && studentId
    && activeRotationCode
    && authSessionKind !== "none"
    && emailFlowState === "idle",
  );

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.navyBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: T.pale, fontFamily: T.serif, fontSize: 18 }}>Loading...</div>
    </div>
  );

  // Combined onboarding screen (name + auth choice + rotation code)
  if (!studentReadyForApp) {
    return (
      <LoginScreen
        studentName={studentName} setStudentName={setStudentName}
        studentPin={studentPin} setStudentPin={(value) => setStudentPin(normalizeStudentPinInput(value))}
        studentPinConfirm={studentPinConfirm} setStudentPinConfirm={(value) => setStudentPinConfirm(normalizeStudentPinInput(value))}
        studentEmail={studentEmail} setStudentEmail={setStudentEmail}
        loginMode={loginMode}
        onLoginModeChange={handleLoginModeChange}
        authSessionKind={authSessionKind}
        emailFlowState={emailFlowState}
        pinFlowMode={pinFlowMode}
        joinCode={joinCode} setJoinCode={setJoinCode}
        joinError={joinError} setJoinError={setJoinError}
        joining={joining}
        authSubmitting={authSubmitting}
        authError={authError}
        authNotice={authNotice}
        onSendVerificationLink={handleSendStudentSignInLink}
        onCompleteEmailLinkSignIn={handleCompleteStudentEmailLink}
        onUseDifferentStudentAccount={handleUseDifferentStudentAccount}
        onJoinRotation={handleJoinRotation}
        onAdminToggle={onAdminToggle}
      />
    );
  }

  // Tab data — Phase 3a (spec §01/§03): 5-tab IA (Today · Library · Inpatients · Team · Me).
  // Lucide monoline icons per §02.
  const tabs: Array<{ id: string; Icon: typeof BookOpen; label: string }> = [
    { id: "today", Icon: Home, label: "Today" },
    { id: "library", Icon: BookOpen, label: "Library" },
    { id: "patients", Icon: Stethoscope, label: "Consults" },
    { id: "team", Icon: Users, label: "Cohort" },
    { id: "me", Icon: UserIcon, label: "Me" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.sans }}>
      {/* Skip to main content — Phase 2.5 (§12). Visually hidden until focused. */}
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      {showOnboarding && <OnboardingOverlay onDismiss={() => setShowOnboarding(false)} onViewFirstDay={() => { setShowOnboarding(false); navigate("library", { type: "guideDetail", id: "firstday" }); }} />}
      {searchOpen && (
        <GlobalSearchOverlay
          onClose={() => setSearchOpen(false)}
          onNavigate={(t, sv) => { navigate(t, sv as SubView | undefined); setSearchOpen(false); }}
          articles={articles}
          patients={patients}
          currentStudentId={studentId}
        />
      )}
      {logoutConfirmOpen && (
        <ConfirmSheet
          title="Sign out on this device?"
          message={authSessionKind === "verified"
            ? "Your progress stays tied to your student account. You can sign back in here or on another device."
            : "Guest progress stays saved, but it remains tied to this device session unless an attending recovers it."}
          confirmLabel="Sign out"
          cancelLabel="Cancel"
          onConfirm={() => void handleLogout()}
          onCancel={() => setLogoutConfirmOpen(false)}
        />
      )}
      {joinConfirmOpen && (
        <ConfirmSheet
          title="Confirm your student account"
          message={`You're about to create this rotation account as ${studentName.trim()} with ${normalizeEmail(studentEmail)} and join ${joinCode.trim().toUpperCase()}. If the name needs a tweak later, you can update it from Profile.`}
          confirmLabel="Looks right"
          cancelLabel="Edit details"
          onConfirm={() => {
            setJoinConfirmOpen(false);
            void handleJoinRotation(true);
          }}
          onCancel={() => setJoinConfirmOpen(false)}
        />
      )}
      {/* Header — Phase 2 (spec §01): collapsed 48px light title bar.
          Name, rotation code, theme, end-session moved to ProfileSheet.
          Kept inline: title, streak chip (or offline chip), search, profile button. */}
      <div style={{
        background: T.surface,
        borderBottom: `1px solid ${T.line}`,
        padding: `env(safe-area-inset-top, 0px) 16px 0`,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 48 }}>
          <span
            onClick={handleTitleTap}
            style={{
              color: T.ink, fontFamily: T.serif,
              fontSize: isMobile ? 16 : 18, fontWeight: 600, letterSpacing: -0.3,
              cursor: "default", WebkitUserSelect: "none", userSelect: "none",
              minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            Nephrology Rotation
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            {online && (gamification.streaks?.currentDays ?? 0) > 0 && (
              <span
                title={`${gamification.streaks?.currentDays}-day streak`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 13, fontWeight: 600, color: T.sub,
                  background: "transparent",
                  border: `1px solid ${T.line}`,
                  padding: "4px 10px", borderRadius: 999, minHeight: 28,
                  fontFamily: T.mono,
                }}
              >
                <Flame size={14} strokeWidth={2} aria-hidden="true" />
                {gamification.streaks?.currentDays}
              </span>
            )}
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              title="Search"
              style={{
                background: "transparent", border: "none", padding: 8,
                minHeight: 44, minWidth: 44,
                borderRadius: 8, cursor: "pointer",
                color: T.ink, display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Search size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
            <button
              onClick={() => setProfileOpen(true)}
              aria-label="Open profile"
              title="Profile"
              style={{
                background: T.surface2, border: `1px solid ${T.line}`, padding: 0,
                minHeight: 44, minWidth: 44, borderRadius: 999, cursor: "pointer",
                color: T.ink, display: "flex", alignItems: "center", justifyContent: "center",
                marginLeft: 4,
              }}
            >
              <UserIcon size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      {/* Offline banner — spec §11. Sits between header and content, soft warm tone. */}
      {(!online || pendingSyncCount > 0) && (
        <div
          role="status" aria-live="polite"
          style={{
            background: online ? T.ice : T.warning,
            color: online ? T.med : T.warning,
            borderBottom: `1px solid ${T.line}`,
            padding: "8px 16px", fontSize: 13, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 8,
            fontFamily: T.sans,
          }}
        >
          {online ? <Activity size={14} strokeWidth={2} aria-hidden="true" /> : <WifiOff size={14} strokeWidth={2} aria-hidden="true" />}
          <span>
            {!online
              ? pendingSyncCount > 0
                ? `Offline · ${pendingSyncCount} queued update${pendingSyncCount !== 1 ? "s" : ""}. Changes sync when reconnected.`
                : "Offline · Changes sync when reconnected."
              : `Reconnected · Syncing ${pendingSyncCount} queued update${pendingSyncCount !== 1 ? "s" : ""}.`}
          </span>
        </div>
      )}
      {profileOpen && (
        <ProfileSheet
          studentName={studentName}
          studentYear={studentYear}
          studentEmail={studentEmail}
          rotationCode={rotationCode}
          competencyLine={competencySummary.profileLine}
          streakDays={gamification.streaks?.currentDays ?? 0}
          onUpdateStudentName={handleUpdateStudentName}
          onUpdateStudentYear={handleUpdateStudentYear}
          onShowTutorial={() => { setProfileOpen(false); setShowOnboarding(true); }}
          onEndSession={requestLogout}
          onClose={() => setProfileOpen(false)}
        />
      )}

      {/* Content Area — Phase 2.5 (§12): <main> landmark + id for skip-to-content. */}
      <main id="main-content" tabIndex={-1} className="tab-content-enter" key={tab + (subView ? JSON.stringify(subView) : "")} style={{ padding: `0 0 calc(${T.navH + T.navPad}px + env(safe-area-inset-bottom, 0px))` }}>
        {tab === "today" && !subView && <HomeTab navigate={navigate} preScore={preScore} postScore={postScore} curriculum={curriculum} articles={articles} announcements={announcements} currentWeek={currentWeek} totalWeeks={totalWeeks} rotationEnded={rotationEnded} weeklyScores={weeklyScores} completedItems={completedItems} bookmarks={bookmarks} srDueCount={getDueItems(srQueue).length} patients={patients} online={online} competencySummary={competencySummary} gamification={gamification} reflections={reflections} onSubmitReflection={handleSubmitReflection} installPromptVariant={installPromptVariant} onInstallApp={handleInstallApp} onDismissInstallPrompt={dismissInstallPrompt} />}
        <Suspense fallback={<LazyFallback />}>
        {tab === "today" && subView?.type === "weeklyQuiz" && (
          <QuizEngine questions={WEEKLY_QUIZZES[subView.week]} title={`Week ${subView.week} Quiz`}
            onBack={() => navigate("today")}
            onFinish={(score) => {
              setWeeklyScores(prev => ({...prev, [subView.week]: [...(prev[subView.week]||[]), score]}));
              setSrQueue(prev => {
                const afterQuiz = processQuizResults(score.answers || [], "weekly", subView.week, prev);
                const weakTopics = extractMissedTopics(score.answers || [], WEEKLY_QUIZZES[subView.week] || []);
                return weakTopics.length
                  ? seedTopicReinforcementSr(weakTopics, TOPIC_REINFORCEMENT_BANK, topicToSlug, afterQuiz)
                  : afterQuiz;
              });
              logActivity("quiz", `Week ${subView.week} Quiz`, `${score.correct}/${score.total}`);
              navigate("today");
            }} />
        )}
        {tab === "today" && subView?.type === "reviewMissed" && (() => {
          const ws = weeklyScores[subView.week] || [];
          const latest = ws[ws.length - 1];
          const missed = (latest?.answers || []).filter(a => !a.correct);
          const missedQuestions = missed.map(a => WEEKLY_QUIZZES[subView.week][a.qIdx]);
          return missedQuestions.length > 0 ? (
            <QuizEngine questions={missedQuestions} title={`Week ${subView.week} — Review Missed`}
              onBack={() => navigate("today")}
              onFinish={(score) => {
                logActivity("review_missed", `Week ${subView.week} Review`, `${score.correct}/${score.total}`);
                navigate("today");
              }} />
          ) : null;
        })()}
        {tab === "today" && subView?.type === "preQuiz" && (
          <QuizEngine questions={PRE_QUIZ} title="Pre-Rotation Assessment"
            onBack={() => navigate("today")}
            onFinish={(score) => {
              setPreScore(score);
              setSrQueue(prev => {
                const afterQuiz = processQuizResults(score.answers || [], "pre", 0, prev);
                const weakTopics = extractMissedTopics(score.answers || [], PRE_QUIZ);
                return weakTopics.length
                  ? seedTopicReinforcementSr(weakTopics, TOPIC_REINFORCEMENT_BANK, topicToSlug, afterQuiz)
                  : afterQuiz;
              });
              logActivity("assessment", "Pre-Rotation Assessment", `${score.correct}/${score.total}`);
              navigate("today", { type: "preResults" });
            }} />
        )}
        {tab === "today" && subView?.type === "preResults" && (
          <AssessmentResultsView mode="pre" score={preScore} navigate={navigate} comparisonScore={null} srDueCount={getDueItems(srQueue).length} />
        )}
        {tab === "today" && subView?.type === "postQuiz" && (
          <QuizEngine questions={POST_QUIZ} title="Post-Rotation Assessment"
            onBack={() => navigate("today")}
            onFinish={(score) => {
              setPostScore(score);
              setSrQueue(prev => {
                const afterQuiz = processQuizResults(score.answers || [], "post", 0, prev);
                const weakTopics = extractMissedTopics(score.answers || [], POST_QUIZ);
                return weakTopics.length
                  ? seedTopicReinforcementSr(weakTopics, TOPIC_REINFORCEMENT_BANK, topicToSlug, afterQuiz)
                  : afterQuiz;
              });
              logActivity("assessment", "Post-Rotation Assessment", `${score.correct}/${score.total}`);
              navigate("today", { type: "postResults" });
            }} />
        )}
        {tab === "today" && subView?.type === "postResults" && (
          <AssessmentResultsView mode="post" score={postScore} comparisonScore={preScore} navigate={navigate} srDueCount={getDueItems(srQueue).length} />
        )}
        {tab === "today" && subView?.type === "articles" && (
          <ArticlesView week={subView.week} onBack={() => navigate("today")} navigate={navigate} curriculum={curriculum} articles={articles} completedItems={completedItems} bookmarks={bookmarks} onToggleBookmark={(url) => toggleBookmark("articles", url)} onToggleComplete={(url) => {
            const article = (articles[subView.week] || []).find((item) => item.url === url);
            const wasCompleted = Boolean(completedItems.articles[url]);
            setCompletedItems(prev => {
              const next = { ...prev, articles: { ...prev.articles } };
              if (next.articles[url]) delete next.articles[url];
              else next.articles[url] = true;
              return next;
            });
            if (!wasCompleted) {
              logActivity("article", `Week ${subView.week} Article`, article?.topic || article?.title || "Article completed");
            }
          }} />
        )}
        {tab === "today" && subView?.type === "trials" && (
          <LandmarkTrialsView week={subView.week} onBack={() => navigate("today")} bookmarks={bookmarks} onToggleBookmark={(name) => toggleBookmark("trials", name)} />
        )}
        {tab === "today" && subView?.type === "studySheets" && (
          <StudySheetsView week={subView.week} onBack={() => navigate("today")} navigate={navigate} completedItems={completedItems} bookmarks={bookmarks} onToggleBookmark={(id) => toggleBookmark("studySheets", id)} onToggleComplete={(sheetId) => {
            const sheet = (STUDY_SHEETS[subView.week] || []).find((item) => item.id === sheetId);
            const wasCompleted = Boolean(completedItems.studySheets[sheetId]);
            setCompletedItems(prev => {
              const next = { ...prev, studySheets: { ...prev.studySheets } };
              if (next.studySheets[sheetId]) delete next.studySheets[sheetId];
              else next.studySheets[sheetId] = true;
              return next;
            });
            if (!wasCompleted) {
              logActivity("study_sheet", `Week ${subView.week} Study Sheet`, sheet?.title || "Study sheet completed");
            }
          }} />
        )}
        {tab === "today" && subView?.type === "cases" && (
          <CasesView week={subView.week} onBack={() => navigate("today")} completedItems={completedItems} bookmarks={bookmarks} onToggleBookmark={(id) => toggleBookmark("cases", id)} onCaseComplete={(caseId, result) => {
            setCompletedItems(prev => ({
              ...prev,
              cases: { ...prev.cases, [caseId]: { score: result.score, total: result.total, date: new Date().toISOString() } }
            }));
            logActivity("case", `Clinical Case: ${caseId}`, `${result.score}/${result.total}`);
          }} />
        )}
        {tab === "today" && subView?.type === "resources" && (
          <ResourcesView
            onBack={() => navigate("today")}
            initialTab={subView.tab}
            focusWeek={subView.week}
            completedItems={completedItems}
            onToggleDeckComplete={(deckId) => {
              const deck = CURRICULUM_DECKS.find((item) => item.id === deckId);
              const wasCompleted = Boolean(completedItems.decks?.[deckId]);
              setCompletedItems(prev => {
                const next = { ...prev, decks: { ...(prev.decks || {}) } };
                if (next.decks?.[deckId]) delete next.decks[deckId];
                else next.decks![deckId] = true;
                return next;
              });
              if (!wasCompleted) {
                logActivity("deck", deck ? `Week ${deck.week} Teaching Deck` : "Teaching Deck", deck?.name || "Teaching deck reviewed");
              }
            }}
          />
        )}
        {tab === "today" && subView?.type === "abbreviations" && (
          <AbbreviationsView onBack={() => navigate("today")} />
        )}
        {tab === "today" && subView?.type === "faq" && (
          <FaqView onBack={() => navigate("today")} />
        )}
        {tab === "today" && subView?.type === "bookmarks" && (
          <BookmarksView bookmarks={bookmarks} onBack={() => navigate("today")} onNavigate={navigate} onToggleBookmark={toggleBookmark} articles={articles} />
        )}
        {tab === "today" && subView?.type === "browseByTopic" && (
          <TopicBrowseView onBack={() => navigate("today")} navigate={navigate as (tab: string, sv?: Record<string, unknown> | null) => void} completedItems={completedItems} />
        )}
        {tab === "today" && subView?.type === "topicDetail" && (
          <TopicBrowseView
            onBack={() => {
              if (subView.source === "studySheets" && typeof subView.week === "number") {
                navigate("today", { type: "studySheets", week: subView.week });
                return;
              }
              if (subView.source === "articles" && typeof subView.week === "number") {
                navigate("today", { type: "articles", week: subView.week });
                return;
              }
              navigate("today", { type: "browseByTopic" });
            }}
            navigate={navigate as (tab: string, sv?: Record<string, unknown> | null) => void}
            completedItems={completedItems}
            initialTopic={subView.topic}
          />
        )}
        {tab === "today" && subView?.type === "extraPractice" && (() => {
          const dueKeys = getDueItems(srQueue);
          const allWeeklyQs = [1,2,3,4].flatMap(w => (WEEKLY_QUIZZES[w] || []).map((q, i) => ({ ...q, _key: `weekly_${w}_${i}` })));
          return (
            <div style={{ padding: 16 }}>
              <button onClick={() => navigate("today")} style={{ background: "none", border: "none", color: T.med, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>{"\u2190"} Back</button>
              <h2 style={{ color: T.navy, fontFamily: T.serif, fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>Extra Practice</h2>
              <p style={{ color: T.sub, fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>Review missed questions or practice from the full question bank.</p>
              {dueKeys.length > 0 && (
                <button onClick={() => navigate("today", { type: "srReview" })}
                  style={{ width: "100%", background: `linear-gradient(135deg, ${T.warning}, ${T.warning})`, borderRadius: 12, padding: 16, border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                  <span style={{ fontSize: 26, flexShrink: 0 }}>{"\uD83D\uDD04"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "white", fontSize: 15 }}>Spaced Repetition Review</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>{dueKeys.length} question{dueKeys.length !== 1 ? "s" : ""} due — missed questions resurface at increasing intervals</div>
                  </div>
                  <span style={{ background: "white", color: T.brand, fontSize: 13, fontWeight: 700, padding: "4px 10px", borderRadius: 12, flexShrink: 0 }}>{dueKeys.length}</span>
                </button>
              )}
              <button onClick={() => navigate("today", { type: "practiceQuiz" })}
                style={{ width: "100%", background: T.card, borderRadius: 12, padding: 16, border: `1.5px solid ${T.med}`, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <span style={{ fontSize: 26, flexShrink: 0 }}>{"\uD83D\uDCDD"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Practice Questions</div>
                  <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>15 random questions from the full bank of {allWeeklyQs.length}</div>
                </div>
              </button>
              {Object.keys(srQueue).length > 0 && (
                <div style={{ background: T.ice, borderRadius: 10, padding: 14, marginTop: 8, borderLeft: `3px solid ${T.med}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, marginBottom: 6 }}>SR Queue Stats</div>
                  <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.6 }}>
                    <div>Total in queue: {Object.keys(srQueue).length}</div>
                    <div>Due now: {dueKeys.length}</div>
                    <div>Mastered (interval &gt; 21 days): {Object.values(srQueue).filter(i => i.interval > 21).length}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        {tab === "today" && subView?.type === "srReview" && (() => {
          const dueKeys = getDueItems(srQueue);
          const dueQuestions = dueKeys.map(key => {
            const q = getQuestionByKey(key);
            return q ? { ...q, _srKey: key } : null;
          }).filter(Boolean);
          return dueQuestions.length > 0 ? (
            <QuizEngine questions={dueQuestions} title="Spaced Repetition Review"
              onBack={() => navigate("today", { type: "extraPractice" })}
              onFinish={(score) => {
                const reviewAnswers = (score.answers || []).map(a => ({
                  questionKey: dueQuestions[a.qIdx]?._srKey,
                  correct: a.correct,
                })).filter(a => a.questionKey);
                setSrQueue(prev => processReviewResults(reviewAnswers, prev));
                logActivity("sr_review", "Spaced Repetition Review", `${score.correct}/${score.total}`);
                navigate("today", { type: "extraPractice" });
              }} />
          ) : (
            <div style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{"\u2705"}</div>
              <div style={{ color: T.navy, fontFamily: T.serif, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>All caught up!</div>
              <div style={{ color: T.sub, fontSize: 13, marginBottom: 20 }}>No questions due for review right now.</div>
              <button onClick={() => navigate("today", { type: "extraPractice" })} style={{ padding: "10px 24px", background: T.med, color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Back</button>
            </div>
          );
        })()}
        {tab === "today" && subView?.type === "practiceQuiz" && (() => {
          const allWeeklyQs = [1,2,3,4].flatMap(w => WEEKLY_QUIZZES[w] || []);
          return (
            <QuizEngine questions={allWeeklyQs} title="Practice Questions" questionCount={15}
              onBack={() => navigate("today", { type: "extraPractice" })}
              onFinish={(score) => {
                logActivity("practice_quiz", "Practice Questions", `${score.correct}/${score.total}`);
                navigate("today", { type: "extraPractice" });
              }} />
          );
        })()}
        {/* Library hub (Phase 3a shell): lands on a simple stacked view of Guide + Refs sections.
            Phase 3b+ will restructure to the spec §03 Library (filterable by week). */}
        {tab === "library" && !subView && <LibraryHub navigate={navigate} clinicGuides={clinicGuides} />}
        {tab === "library" && subView?.type === "refDetail" && (
          <RefDetailView refId={subView.id} onBack={() => navigate("library")} />
        )}
        {tab === "library" && subView?.type === "abbreviations" && (
          <AbbreviationsView onBack={() => navigate("library")} />
        )}
        {tab === "library" && subView?.type === "trialLibrary" && (
          <TrialLibraryView onBack={() => navigate("library")} bookmarks={bookmarks} onToggleBookmark={(name) => toggleBookmark("trials", name)} initialSearch={subView?.searchTrial as string | undefined} />
        )}
        {tab === "library" && subView?.type === "clinicGuide" && (
          <ClinicGuideView
            date={subView.date}
            topic={subView.topic || clinicGuides.find(g => g.date === subView.date)?.topic || "CKD"}
            isOverride={clinicGuides.find(g => g.date === subView.date && g.topic === (subView.topic || "CKD"))?.isOverride}
            onBack={() => navigate("library")}
          />
        )}
        {tab === "library" && subView?.type === "clinicGuideHistory" && (
          <ClinicGuideHistoryView guides={clinicGuides} onSelect={(date, topic) => navigate("library", { type: "clinicGuide", date, topic })} onBack={() => navigate("library")} />
        )}
        {tab === "library" && subView?.type === "inpatientGuide" && (
          <InpatientGuideView topic={subView.topic as import("../data/inpatientGuides").InpatientGuideTopic} onBack={() => navigate("library")} />
        )}
        {tab === "library" && subView?.type === "rotationGuide" && (
          <RotationGuideView guideId={subView.guideId as import("../data/rotationGuides").RotationGuideId} onBack={() => navigate("library")} />
        )}
        {tab === "library" && subView?.type === "faq" && (
          <FaqView onBack={() => navigate("library")} />
        )}
        {tab === "library" && subView && !subView?.type?.toString().startsWith("clinic") && subView?.type !== "trialLibrary" && subView?.type !== "inpatientGuide" && subView?.type !== "rotationGuide" && subView?.type !== "faq" && subView?.type !== "refDetail" && subView?.type !== "abbreviations" && <GuideTab navigate={navigate as (tab: string, sv?: Record<string, unknown> | null) => void} subView={subView as Record<string, unknown> | null} clinicGuides={clinicGuides} />}
        {tab === "patients" && <PatientTab patients={patients} setPatients={setPatients} navigate={navigate} onLogActivity={logActivity} />}
        {tab === "team" && <TeamTab currentStudentId={studentId} />}
        {tab === "me" && <ProgressTab navigate={navigate} patients={patients} weeklyScores={weeklyScores} preScore={preScore} postScore={postScore} gamification={gamification} currentWeek={currentWeek} competencySummary={competencySummary} />}
        </Suspense>
      </main>

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: T.card, borderTop: `1px solid ${T.line}`, display: "flex", zIndex: 100, boxShadow: "0 -2px 12px rgba(0,0,0,0.06)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => navigate(t.id)}
              style={{ flex: 1, padding: "8px 0 6px", background: active ? T.ice : "none", border: "none", borderRadius: active ? 12 : 0, margin: "4px 2px", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                color: active ? T.med : T.sub,
                transition: "background 0.15s ease, color 0.15s ease",
              }}>
              <t.Icon size={20} strokeWidth={active ? 2 : 1.75} aria-hidden="true" />
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default StudentApp;

// ─────────────────────────────────────────────────────────────────────────
// LibraryHub — Phase 3a shell (spec §03). Landing page for the Library tab.
// For now it simply stacks the existing Guide and Refs sections behind a common
// heading. Phase 3b+ restructures to the spec's week-filterable Library layout.
// ─────────────────────────────────────────────────────────────────────────
function LibraryHub({
  navigate, clinicGuides,
}: {
  navigate: (tab: string, sv?: SubView) => void;
  clinicGuides: ClinicGuideRecord[];
}) {
  return (
    <div>
      <div style={{ padding: "20px 16px 8px", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>Library</div>
        <h1 style={{ margin: 0, fontFamily: T.serif, fontSize: 28, fontWeight: 600, color: T.ink, letterSpacing: -0.4 }}>Guides &amp; references</h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: T.ink2, lineHeight: 1.5 }}>
          Clinical guides, rotation playbooks, landmark trials, and quick-reference material.
        </p>
      </div>
      <GuideTab
        navigate={navigate as (tab: string, sv?: Record<string, unknown> | null) => void}
        subView={null}
        clinicGuides={clinicGuides}
      />
      <div style={{ padding: "8px 16px", borderTop: `1px solid ${T.line}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: 1.2, margin: "8px 0 4px" }}>Quick references</div>
      </div>
      <RefsTab navigate={navigate} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ProfileSheet — Phase 2 (spec §01). Right-side sheet surfacing the items
// that used to live in the cramped header: name, rotation code, competency
// signal, theme toggle, sign out. ESC to close. Click backdrop to close.
// ─────────────────────────────────────────────────────────────────────────
function ProfileSheet({
  studentName, studentYear, studentEmail, rotationCode, competencyLine, streakDays, onUpdateStudentName, onUpdateStudentYear, onShowTutorial, onEndSession, onClose,
}: {
  studentName: string; studentYear: string; studentEmail: string; rotationCode: string | null; competencyLine: string;
  streakDays: number;
  onUpdateStudentName: (nextName: string) => Promise<void>;
  onUpdateStudentYear: (nextYear: string) => Promise<void>;
  onShowTutorial?: () => void;
  onEndSession: () => void; onClose: () => void;
}) {
  const [draftName, setDraftName] = useState(studentName);
  const [draftYear, setDraftYear] = useState(studentYear || STUDENT_YEAR_OPTIONS[0]);
  const [savingName, setSavingName] = useState(false);
  const [savingYear, setSavingYear] = useState(false);
  const [nameMessage, setNameMessage] = useState("");
  const [nameError, setNameError] = useState("");
  const [yearMessage, setYearMessage] = useState("");
  const [yearError, setYearError] = useState("");

  // Phase 2.5: ESC to close + focus trap + focus return to opener on unmount.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    setDraftName(studentName);
  }, [studentName]);

  useEffect(() => {
    setDraftYear(studentYear || STUDENT_YEAR_OPTIONS[0]);
  }, [studentYear]);

  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef);

  const trimmedDraftName = draftName.trim();
  const canSaveName = Boolean(trimmedDraftName && trimmedDraftName !== studentName.trim() && !savingName);
  const canSaveYear = Boolean(draftYear && draftYear !== studentYear && !savingYear);

  const handleSaveName = async () => {
    if (!canSaveName) return;
    setSavingName(true);
    setNameError("");
    setNameMessage("");
    try {
      await onUpdateStudentName(trimmedDraftName);
      setNameMessage("Display name updated.");
    } catch (error) {
      setNameError(error instanceof Error ? error.message : "Unable to save your name right now.");
    }
    setSavingName(false);
  };

  const handleSaveYear = async () => {
    if (!canSaveYear) return;
    setSavingYear(true);
    setYearError("");
    setYearMessage("");
    try {
      await onUpdateStudentYear(draftYear);
      setYearMessage("Training year updated.");
    } catch (error) {
      setYearError(error instanceof Error ? error.message : "Unable to save your year right now.");
    }
    setSavingYear(false);
  };

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="profile-sheet-title"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: T.overlay, zIndex: 9998, display: "flex", justifyContent: "flex-end", animation: "fadeIn 0.15s ease" }}
    >
      <div
        ref={panelRef}
        onClick={e => e.stopPropagation()}
        style={{
          background: T.surface, borderLeft: `1px solid ${T.line}`,
          width: "min(340px, 100%)", height: "100%",
          padding: "calc(12px + env(safe-area-inset-top, 0px)) 20px calc(20px + env(safe-area-inset-bottom, 0px))",
          display: "flex", flexDirection: "column", gap: 14,
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 id="profile-sheet-title" style={{ margin: 0, fontFamily: T.serif, fontSize: 20, fontWeight: 600, color: T.ink, letterSpacing: -0.2 }}>Profile</h2>
          <button
            onClick={onClose} aria-label="Close profile"
            style={{ background: "transparent", border: "none", minHeight: 44, minWidth: 44, borderRadius: 8, cursor: "pointer", color: T.ink, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {/* Name + rotation code */}
        <div style={{ paddingBottom: 14, borderBottom: `1px solid ${T.line}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>Student</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, marginBottom: 8 }}>{studentName || "—"}</div>
          <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5, marginBottom: 12 }}>
            {studentEmail
              ? "Use the same email later to reopen this account. If your display name is off, you can fix it here."
              : "This display name appears throughout the rotation. You can update it here anytime."}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Display Name
            </label>
            <input
              type="text"
              value={draftName}
              maxLength={LIMITS.NAME_MAX}
              onChange={(event) => {
                setDraftName(event.target.value.slice(0, LIMITS.NAME_MAX));
                if (nameError) setNameError("");
                if (nameMessage) setNameMessage("");
              }}
              placeholder="Your display name"
              style={{
                width: "100%",
                minHeight: 44,
                padding: "12px 14px",
                borderRadius: 12,
                border: `1px solid ${nameError ? T.danger : T.line}`,
                background: T.surface2,
                color: T.ink,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
            {studentEmail && (
              <div style={{ fontSize: 12, color: T.ink2 }}>
                Account email: {studentEmail}
              </div>
            )}
            {(nameMessage || nameError) && (
              <div
                style={{
                  fontSize: 12,
                  color: nameError ? T.danger : T.success,
                  background: nameError ? T.dangerBg : T.successBg,
                  border: `1px solid ${nameError ? T.danger : T.success}`,
                  borderRadius: 10,
                  padding: "8px 10px",
                  lineHeight: 1.45,
                }}
              >
                {nameError || nameMessage}
              </div>
            )}
            <button
              onClick={() => void handleSaveName()}
              disabled={!canSaveName}
              style={{
                minHeight: 44,
                borderRadius: 12,
                border: "none",
                background: canSaveName ? `linear-gradient(135deg, ${T.med}, ${T.navy})` : T.surface2,
                color: canSaveName ? "white" : T.muted,
                fontSize: 14,
                fontWeight: 700,
                cursor: canSaveName ? "pointer" : "default",
                boxShadow: canSaveName ? "0 10px 24px rgba(0,0,0,0.18)" : "none",
              }}
            >
              {savingName ? "Saving..." : "Save display name"}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Training Year
            </label>
            <select
              value={draftYear}
              onChange={(event) => {
                setDraftYear(event.target.value);
                if (yearError) setYearError("");
                if (yearMessage) setYearMessage("");
              }}
              style={{
                width: "100%",
                minHeight: 44,
                padding: "12px 14px",
                borderRadius: 12,
                border: `1px solid ${yearError ? T.danger : T.line}`,
                background: T.surface2,
                color: T.ink,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            >
              {STUDENT_YEAR_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {(yearMessage || yearError) && (
              <div
                style={{
                  fontSize: 12,
                  color: yearError ? T.danger : T.success,
                  background: yearError ? T.dangerBg : T.successBg,
                  border: `1px solid ${yearError ? T.danger : T.success}`,
                  borderRadius: 10,
                  padding: "8px 10px",
                  lineHeight: 1.45,
                }}
              >
                {yearError || yearMessage}
              </div>
            )}
            <button
              onClick={() => void handleSaveYear()}
              disabled={!canSaveYear}
              style={{
                minHeight: 44,
                borderRadius: 12,
                border: "none",
                background: canSaveYear ? T.med : T.surface2,
                color: canSaveYear ? "white" : T.muted,
                fontSize: 14,
                fontWeight: 700,
                cursor: canSaveYear ? "pointer" : "default",
              }}
            >
              {savingYear ? "Saving..." : "Save training year"}
            </button>
          </div>
          {rotationCode && (
            <span style={{ display: "inline-block", fontSize: 13, fontFamily: T.mono, letterSpacing: 1, color: T.ink2, background: T.surface2, border: `1px solid ${T.line}`, padding: "4px 10px", borderRadius: 999, marginTop: 12 }}>
              {rotationCode}
            </span>
          )}
        </div>

        {/* Competency + streak */}
        {(competencyLine || streakDays > 0) && (
          <div style={{ paddingBottom: 14, borderBottom: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Learning Signal</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {competencyLine && (
                <div>
                  <div style={{ fontSize: 13, color: T.ink2, marginBottom: 2 }}>Top competency</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, letterSpacing: 0.1 }}>{competencyLine}</div>
                </div>
              )}
              {streakDays > 0 && (
                <div>
                  <div style={{ fontSize: 13, color: T.ink2, marginBottom: 2 }}>Streak</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 16, fontWeight: 700, color: T.ink, fontFamily: T.mono }}>
                    <Flame size={16} strokeWidth={2} aria-hidden="true" /> {streakDays}d
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Theme */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Appearance</div>
          <ThemeToggle variant="sheet" />
        </div>

        {/* Show tutorial */}
        {onShowTutorial && (
          <div style={{ paddingTop: 12, borderTop: `1px solid ${T.line}` }}>
            <button
              onClick={onShowTutorial}
              style={{
                width: "100%", minHeight: 44, padding: "12px 16px",
                background: "transparent", border: `1px solid ${T.line}`, borderRadius: 12,
                color: T.ink, fontSize: 14, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                cursor: "pointer",
              }}
            >
              Show tutorial
            </button>
          </div>
        )}

        {/* Sign out — sits right below Tutorial */}
        <div style={{ paddingTop: 12 }}>
          <button
            onClick={() => { onClose(); onEndSession(); }}
            style={{
              width: "100%", minHeight: 44, padding: "12px 16px",
              background: "transparent", border: `1px solid ${T.line}`, borderRadius: 12,
              color: T.ink, fontSize: 14, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              cursor: "pointer",
            }}
          >
            <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ConfirmSheet — accessible replacement for window.confirm (spec §12)
// role=dialog + aria-modal + ESC to cancel + focus the confirm button on open.
// Kept intentionally small; generalize if we need it in more sites.
// ─────────────────────────────────────────────────────────────────────────
function ConfirmSheet({
  title, message, confirmLabel, cancelLabel, onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel: string; cancelLabel: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  // Phase 2.5: ESC to close + focus trap + focus return; initial focus on confirm.
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  useFocusTrap(panelRef, confirmRef);
  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="confirmsheet-title" aria-describedby="confirmsheet-msg"
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, background: T.overlay, zIndex: 9998, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16, paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))", animation: "fadeIn 0.15s ease" }}
    >
      <div
        ref={panelRef}
        onClick={e => e.stopPropagation()}
        style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 20, width: "100%", maxWidth: 420, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
      >
        <h2 id="confirmsheet-title" style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 600, color: T.ink, margin: "0 0 8px", letterSpacing: -0.2 }}>{title}</h2>
        <p id="confirmsheet-msg" style={{ fontSize: 14, color: T.ink2, margin: "0 0 20px", lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel}
            style={{ minHeight: 44, padding: "10px 18px", fontSize: 14, fontWeight: 600, color: T.ink, background: "transparent", border: `1px solid ${T.line}`, borderRadius: 12, cursor: "pointer" }}>
            {cancelLabel}
          </button>
          <button ref={confirmRef} onClick={onConfirm}
            style={{ minHeight: 44, padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "white", background: T.brand, border: "none", borderRadius: 12, cursor: "pointer" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
