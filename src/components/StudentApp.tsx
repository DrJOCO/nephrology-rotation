import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { BookOpen, Stethoscope, Activity, Search, User as UserIcon, Flame, WifiOff, LogOut, X, Home, Trophy, Bookmark } from "lucide-react";
import { T, WEEKLY, ARTICLES, CURRICULUM_DECKS } from "../data/constants";
import { WEEKLY_CASES } from "../data/cases";
import type { ClinicGuideTemplates } from "../data/clinicGuides";
import { PRE_QUIZ, POST_QUIZ, TOPIC_REINFORCEMENT_BANK, WEEKLY_QUIZZES, getQuestionByKey, resolveReinforcementTopic, topicToSlug } from "../data/quizzes";
import { processQuizResults, processReviewResults, getDueItems, seedTopicReinforcementSr } from "../utils/spacedRepetition";
import store from "../utils/store";
import {
  clearSavedStudentSignInEmail,
  normalizeStudentPinInput,
  signOutFirebase,
} from "../utils/firebase";
import { scrollWindowToTop, useIsMobile, useOnline, useFocusTrap } from "../utils/helpers";
import { calculatePoints, checkAchievements, updateStreak } from "../utils/gamification";
import { normalizeClinicGuideTemplates } from "../utils/clinicGuideTemplates";
import { normalizeStudySheets, type StudySheetsData } from "../utils/studySheets";
import { buildCompetencySummary } from "../utils/competency";
import { getStudentCurrentModule, hasRotationEnded } from "../utils/moduleProgression";
import { buildBookmarkActivityDetail, describeStudentNavigation } from "../utils/activityLog";
import { addReflectionItemsToSrQueue, buildReflectionActivityDetail, buildReflectionEntry } from "../utils/reflections";
import { getConsultTopicCompletionKey } from "../utils/patientRecommendations";
import {
  useStudentAuth,
  normalizeEmail,
  setStoredStudentPinFlowMode,
  JOINED_AT_KEY,
  STUDENT_EMAIL_KEY,
  STUDENT_YEAR_KEY,
  STUDENT_PENDING_JOIN_CODE_KEY,
} from "../hooks/useStudentAuth";
import { useStudentSync } from "../hooks/useStudentSync";
import type { Patient, QuizScore, WeeklyScores, SubView, Announcement, SharedSettings, Gamification, ActivityLogEntry, SrQueue, CompletedItems, Bookmarks, ClinicGuideRecord, ReflectionEntry } from "../types";

// Critical-path components (eager)
import OnboardingOverlay from "./student/OnboardingOverlay";
import LoginScreen from "./student/LoginScreen";
import GlobalSearchOverlay from "./student/GlobalSearchOverlay";
import HomeTab from "./student/HomeTab";
import LibraryHub from "./student/LibraryHub";
import ProfileSheet from "./student/ProfileSheet";
import { ConfirmSheet } from "./student/shared";

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
const AkiToolView = lazy(() => import("./student/AkiToolView"));
const HyponatremiaToolView = lazy(() => import("./student/HyponatremiaToolView"));
const GnToolView = lazy(() => import("./student/GnToolView"));
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
const INSTALL_PROMPT_DELAY_MS = 18 * 60 * 60 * 1000;

interface DeferredInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function extractMissedTopics(
  answers: Array<{ qIdx: number; correct: boolean }>,
   
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [curriculum, setCurriculum] = useState(WEEKLY);
  const [articles, setArticles] = useState(ARTICLES);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [gamification, setGamification] = useState<Gamification>({ points: 0, achievements: [], streaks: { currentDays: 0, longestDays: 0, lastActiveDate: null } });
  const [sharedSettings, setSharedSettings] = useState<SharedSettings | null>(null);
  const [completedItems, setCompletedItems] = useState<CompletedItems>({ articles: {}, studySheets: {}, cases: {}, decks: {}, consultTopics: {} });
  const [searchOpen, setSearchOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmarks>({ trials: [], articles: [], cases: [], studySheets: [] });
  const [srQueue, setSrQueue] = useState<SrQueue>({});
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [clinicGuides, setClinicGuides] = useState<ClinicGuideRecord[]>([]);
  const [clinicGuideTemplates, setClinicGuideTemplates] = useState<ClinicGuideTemplates>(() => normalizeClinicGuideTemplates());
  const [studySheets, setStudySheets] = useState<StudySheetsData>(() => normalizeStudySheets());
  const [installPromptEvent, setInstallPromptEvent] = useState<DeferredInstallPromptEvent | null>(null);
  const [installPromptDismissed, setInstallPromptDismissed] = useState(() => localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === "1");
  // Phase 1 (spec §12): accessible logout confirmation — replaces window.confirm.
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  // Phase 2 (spec §01): profile sheet holds name, code, theme toggle, end-session.
  const [profileOpen, setProfileOpen] = useState(false);
  const online = useOnline();
  // Latest student-doc updatedAt we know about — multi-device bookkeeping shared by
  // both hooks: useStudentAuth stamps it on join/profile writes, useStudentSync stamps
  // it on save/flush and gates the student-data listener on it to skip stale echoes.
  const latestStudentUpdateRef = useRef<string | null>(null);

  const {
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
  } = useStudentAuth(
    latestStudentUpdateRef,
    patients,
    weeklyScores,
    preScore,
    postScore,
    gamification,
    completedItems,
    srQueue,
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

  const {
    loading,
    pendingSyncCount,
    syncTimerRef,
    markPatientDirty,
    markPatientRemoved,
    flushStudentSync,
  } = useStudentSync(
    online,
    latestStudentUpdateRef,
    bootstrapAuthSession,
    studentId,
    setStudentId,
    nameSet,
    setNameSet,
    studentName,
    setStudentName,
    studentYear,
    setStudentYear,
    studentEmail,
    studentSyncIdentity,
    rotationCode,
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

  const logActivity = (type: string, label: string, detail = "") => {
    setActivityLog(prev => [...prev, { type, label, detail, timestamp: new Date().toISOString() }].slice(-50));
  };

  const handleCompleteConsultTopic = (payload: { topic: string; sheetIds: string[]; trialNames: string[] }) => {
    const key = getConsultTopicCompletionKey(payload.topic);
    const wasCompleted = Boolean(completedItems.consultTopics?.[key]);
    const completedAt = new Date().toISOString();
    setCompletedItems(prev => ({
      ...prev,
      consultTopics: {
        ...(prev.consultTopics || {}),
        [key]: {
          topic: payload.topic,
          completedAt,
          sheetIds: payload.sheetIds,
          trialNames: payload.trialNames,
        },
      },
    }));

    if (!wasCompleted) {
      const linkedCount = payload.sheetIds.length + payload.trialNames.length;
      logActivity(
        "consult_topic",
        `Consult Topic Reviewed: ${payload.topic}`,
        linkedCount > 0 ? `${linkedCount} linked item${linkedCount !== 1 ? "s" : ""}` : "Topic reviewed",
      );
    }
  };

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
   
  }, [patients, weeklyScores, preScore, postScore, nameSet, loading, completedItems, srQueue]);

  // Phase 3 (spec §01/§03): 5-tab IA — today · library · inpatients · team · me.
  // Old tab ids were aliased during 3a; Phase 3b removed the alias shim after all
  // call sites were canonicalized (commit 4da55c6).
  const applyView = (t: string, sv: SubView) => {
    setTab(t);
    setSubView(sv);
    scrollWindowToTop();
  };

  const navigate = (t: string, sv: SubView = null) => {
    // No-op when re-selecting the current root tab — avoids stacking dead
    // history entries that make Back appear to do nothing.
    if (t === tab && sv === null && subView === null) return;
    const activity = describeStudentNavigation(sv, { articlesByWeek: articles, clinicGuides });
    if (activity) {
      logActivity(activity.type, activity.label, activity.detail);
    }
    // Push a browser-history entry carrying the destination view so the hardware
    // / browser Back gesture (and in-app Back, via goBack) retraces navigation.
    window.history.pushState({ navView: { tab: t, subView: sv } }, "");
    applyView(t, sv);
  };

  // Back = browser history back; the popstate handler restores the previous view.
  // Routing every in-app Back through this keeps the in-app and hardware Back
  // gestures in sync and returns the student to wherever they actually came from
  // (e.g. a case opened from the Library returns to the Library, not Today).
  const goBack = () => {
    window.history.back();
  };

  // Hardware / browser Back integration (§ nav). Seed the root entry, then map
  // popstate to the stored view so Back closes sub-views and retraces navigation
  // instead of exiting the installed PWA from any depth.
  useEffect(() => {
    window.history.replaceState({ navView: { tab: "today", subView: null } }, "");
    const onPop = (e: PopStateEvent) => {
      const view = (e.state && (e.state as { navView?: { tab: string; subView: SubView } }).navView) || null;
      setTab(view?.tab ?? "today");
      setSubView(view?.subView ?? null);
      scrollWindowToTop();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

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
    setCompletedItems({ articles: {}, studySheets: {}, cases: {}, decks: {}, consultTopics: {} });
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
    patients,
  }), [weeklyScores, preScore, postScore, completedItems, srQueue, currentWeek, totalWeeks, articles, patients]);
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
  const studentViewKey = useMemo(() => tab + (subView ? JSON.stringify(subView) : ""), [tab, subView]);

  useEffect(() => {
    if (!studentReadyForApp) return;
    scrollWindowToTop();
  }, [studentReadyForApp, studentViewKey]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.navyBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: T.surface2, fontFamily: T.serif, fontSize: 18 }}>Loading...</div>
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
    { id: "team", Icon: Trophy, label: "Cohort" },
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
          studySheets={studySheets}
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
          <button
            type="button"
            onClick={() => { handleTitleTap(); navigate("today"); }}
            aria-label="Nephrology Rotation — go to Today"
            title="Go to Today"
            style={{
              color: T.ink, fontFamily: T.serif, background: "none", border: "none",
              fontSize: isMobile ? 16 : 18, fontWeight: 600, letterSpacing: -0.3,
              cursor: "pointer", WebkitUserSelect: "none", userSelect: "none",
              minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              padding: 0, display: "inline-flex", alignItems: "center",
            }}
          >
            {/* Logomark on narrow widths so the wordmark doesn't truncate as "Nephrolog…". */}
            {isMobile ? <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden="true">🫘</span> : "Nephrology Rotation"}
          </button>
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
            background: online ? T.surface2 : T.warning,
            color: online ? T.brand : T.warningInk,
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
              : `${pendingSyncCount} update${pendingSyncCount !== 1 ? "s" : ""} waiting to sync — retrying automatically. Your work is saved on this device.`}
          </span>
        </div>
      )}
      {profileOpen && (
        <ProfileSheet
          studentName={studentName}
          studentYear={studentYear}
          studentEmail={studentEmail}
          rotationCode={rotationCode}
          onUpdateStudentName={handleUpdateStudentName}
          onUpdateStudentYear={handleUpdateStudentYear}
          onShowTutorial={() => { setProfileOpen(false); setShowOnboarding(true); }}
          onOpenSaved={() => { setProfileOpen(false); navigate("today", { type: "bookmarks" }); }}
          onEndSession={requestLogout}
          onClose={() => setProfileOpen(false)}
        />
      )}

      {/* Content Area — Phase 2.5 (§12): <main> landmark + id for skip-to-content. */}
      <main id="main-content" tabIndex={-1} className="tab-content-enter" key={studentViewKey} style={{ padding: `0 0 calc(${T.navH + T.navPad}px + ${subView ? "80px + " : ""}env(safe-area-inset-bottom, 0px))` }}>
        {tab === "today" && !subView && <HomeTab navigate={navigate} preScore={preScore} postScore={postScore} curriculum={curriculum} articles={articles} studySheets={studySheets} announcements={announcements} currentWeek={currentWeek} totalWeeks={totalWeeks} rotationEnded={rotationEnded} weeklyScores={weeklyScores} completedItems={completedItems} bookmarks={bookmarks} srDueCount={getDueItems(srQueue).length} patients={patients} online={online} competencySummary={competencySummary} gamification={gamification} reflections={reflections} onSubmitReflection={handleSubmitReflection} installPromptVariant={installPromptVariant} onInstallApp={handleInstallApp} onDismissInstallPrompt={dismissInstallPrompt} onCompleteConsultTopic={handleCompleteConsultTopic} />}
        <Suspense fallback={<LazyFallback />}>
        {tab === "today" && subView?.type === "weeklyQuiz" && (
          <QuizEngine questions={WEEKLY_QUIZZES[subView.week]} title={`Module ${subView.week} Quiz`}
            onBack={goBack}
            onFinish={(score) => {
              setWeeklyScores(prev => ({...prev, [subView.week]: [...(prev[subView.week]||[]), score]}));
              setSrQueue(prev => {
                const afterQuiz = processQuizResults(score.answers || [], "weekly", subView.week, prev);
                const weakTopics = extractMissedTopics(score.answers || [], WEEKLY_QUIZZES[subView.week] || []);
                return weakTopics.length
                  ? seedTopicReinforcementSr(weakTopics, TOPIC_REINFORCEMENT_BANK, topicToSlug, afterQuiz)
                  : afterQuiz;
              });
              logActivity("quiz", `Module ${subView.week} Quiz`, `${score.correct}/${score.total}`);
              navigate("today");
            }} />
        )}
        {tab === "today" && subView?.type === "reviewMissed" && (() => {
          const ws = weeklyScores[subView.week] || [];
          const latest = ws[ws.length - 1];
          const missed = (latest?.answers || []).filter(a => !a.correct);
          const missedQuestions = missed.map(a => WEEKLY_QUIZZES[subView.week][a.qIdx]);
          return missedQuestions.length > 0 ? (
            <QuizEngine questions={missedQuestions} title={`Module ${subView.week} — Review Missed`}
              onBack={goBack}
              onFinish={(score) => {
                logActivity("review_missed", `Module ${subView.week} Review`, `${score.correct}/${score.total}`);
                navigate("today");
              }} />
          ) : null;
        })()}
        {tab === "today" && subView?.type === "preQuiz" && (
          <QuizEngine questions={PRE_QUIZ} title="Pre-Rotation Assessment"
            onBack={goBack}
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
            onBack={goBack}
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
          <ArticlesView week={subView.week} onBack={goBack} navigate={navigate} curriculum={curriculum} articles={articles} completedItems={completedItems} bookmarks={bookmarks} onToggleBookmark={(url) => toggleBookmark("articles", url)} onToggleComplete={(url) => {
            const article = (articles[subView.week] || []).find((item) => item.url === url);
            const wasCompleted = Boolean(completedItems.articles[url]);
            setCompletedItems(prev => {
              const next = { ...prev, articles: { ...prev.articles } };
              if (next.articles[url]) delete next.articles[url];
              else next.articles[url] = true;
              return next;
            });
            if (!wasCompleted) {
              logActivity("article", `Module ${subView.week} Article`, article?.topic || article?.title || "Article completed");
            }
          }} />
        )}
        {tab === "today" && subView?.type === "trials" && (
          <LandmarkTrialsView week={subView.week} onBack={goBack} bookmarks={bookmarks} onToggleBookmark={(name) => toggleBookmark("trials", name)} />
        )}
        {tab === "today" && subView?.type === "studySheets" && (
          <StudySheetsView week={subView.week} initialSheetId={subView.sheetId} studySheets={studySheets} onBack={goBack} navigate={navigate} completedItems={completedItems} bookmarks={bookmarks} onToggleBookmark={(id) => toggleBookmark("studySheets", id)} onToggleComplete={(sheetId) => {
            const sheet = (studySheets[subView.week] || []).find((item) => item.id === sheetId);
            const wasCompleted = Boolean(completedItems.studySheets[sheetId]);
            setCompletedItems(prev => {
              const next = { ...prev, studySheets: { ...prev.studySheets } };
              if (next.studySheets[sheetId]) delete next.studySheets[sheetId];
              else next.studySheets[sheetId] = true;
              return next;
            });
            if (!wasCompleted) {
              logActivity("study_sheet", `Module ${subView.week} Study Sheet`, sheet?.title || "Study sheet completed");
            }
          }} />
        )}
        {tab === "today" && subView?.type === "cases" && (
          <CasesView week={subView.week} onBack={goBack} completedItems={completedItems} bookmarks={bookmarks} onToggleBookmark={(id) => toggleBookmark("cases", id)} onCaseComplete={(caseId, result) => {
            setCompletedItems(prev => ({
              ...prev,
              cases: { ...prev.cases, [caseId]: { score: result.score, total: result.total, date: new Date().toISOString() } }
            }));
            logActivity("case", `Clinical Case: ${caseId}`, `${result.score}/${result.total}`);
          }} />
        )}
        {tab === "today" && subView?.type === "resources" && (
          <ResourcesView
            onBack={goBack}
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
                logActivity("deck", deck ? `Module ${deck.week} Teaching Deck` : "Teaching Deck", deck?.name || "Teaching deck reviewed");
              }
            }}
          />
        )}
        {tab === "today" && subView?.type === "abbreviations" && (
          <AbbreviationsView onBack={goBack} />
        )}
        {tab === "today" && subView?.type === "faq" && (
          <FaqView onBack={goBack} />
        )}
        {tab === "today" && subView?.type === "bookmarks" && (
          <BookmarksView bookmarks={bookmarks} onBack={goBack} onNavigate={navigate} onToggleBookmark={toggleBookmark} articles={articles} studySheets={studySheets} />
        )}
        {tab === "today" && subView?.type === "browseByTopic" && (
          <TopicBrowseView onBack={goBack} navigate={navigate as (tab: string, sv?: Record<string, unknown> | null) => void} completedItems={completedItems} studySheets={studySheets} />
        )}
        {tab === "today" && subView?.type === "topicDetail" && (
          <TopicBrowseView
            onBack={goBack}
            navigate={navigate as (tab: string, sv?: Record<string, unknown> | null) => void}
            completedItems={completedItems}
            studySheets={studySheets}
            initialTopic={subView.topic}
          />
        )}
        {tab === "today" && subView?.type === "extraPractice" && (() => {
          const dueKeys = getDueItems(srQueue);
          const allWeeklyQs = [1,2,3,4].flatMap(w => (WEEKLY_QUIZZES[w] || []).map((q, i) => ({ ...q, _key: `weekly_${w}_${i}` })));
          return (
            <div style={{ padding: 16 }}>
              <button onClick={goBack} style={{ background: "none", border: "none", color: T.brand, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>{"\u2190"} Back</button>
              <h2 style={{ color: T.ink, fontFamily: T.serif, fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>Extra Practice</h2>
              <p style={{ color: T.sub, fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>Review missed questions or practice from the full question bank.</p>
              {dueKeys.length > 0 && (
                <button onClick={() => navigate("today", { type: "srReview" })}
                  style={{ width: "100%", background: `linear-gradient(135deg, ${T.warning}, ${T.warning})`, borderRadius: 12, padding: 16, border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                  <span style={{ fontSize: 26, flexShrink: 0 }}>{"\uD83D\uDD04"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: T.warningInk, fontSize: 15 }}>Spaced Repetition Review</div>
                    <div style={{ fontSize: 13, color: T.warningInk, opacity: 0.85, marginTop: 2 }}>{dueKeys.length} question{dueKeys.length !== 1 ? "s" : ""} due — missed questions resurface at increasing intervals</div>
                  </div>
                  <span style={{ background: T.surface, color: T.brand, fontSize: 13, fontWeight: 700, padding: "4px 10px", borderRadius: 12, flexShrink: 0 }}>{dueKeys.length}</span>
                </button>
              )}
              <button onClick={() => navigate("today", { type: "practiceQuiz" })}
                style={{ width: "100%", background: T.card, borderRadius: 12, padding: 16, border: `1.5px solid ${T.brand}`, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <span style={{ fontSize: 26, flexShrink: 0 }}>{"\uD83D\uDCDD"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: T.ink, fontSize: 15 }}>Practice Questions</div>
                  <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>15 random questions from the full bank of {allWeeklyQs.length}</div>
                </div>
              </button>
              {Object.keys(srQueue).length > 0 && (
                <div style={{ background: T.surface2, borderRadius: 10, padding: 14, marginTop: 8, borderLeft: `3px solid ${T.brand}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 6 }}>SR Queue Stats</div>
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
              onBack={goBack}
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
              <div style={{ color: T.ink, fontFamily: T.serif, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>All caught up!</div>
              <div style={{ color: T.sub, fontSize: 13, marginBottom: 20 }}>No questions due for review right now.</div>
              <button onClick={goBack} style={{ padding: "10px 24px", background: T.brand, color: T.brandInk, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Back</button>
            </div>
          );
        })()}
        {tab === "today" && subView?.type === "practiceQuiz" && (() => {
          const allWeeklyQs = [1,2,3,4].flatMap(w => WEEKLY_QUIZZES[w] || []);
          return (
            <QuizEngine questions={allWeeklyQs} title="Practice Questions" questionCount={15}
              onBack={goBack}
              onFinish={(score) => {
                logActivity("practice_quiz", "Practice Questions", `${score.correct}/${score.total}`);
                navigate("today", { type: "extraPractice" });
              }} />
          );
        })()}
        {/* Library hub (Phase 3a shell): lands on a simple stacked view of Guide + Refs sections.
            Phase 3b+ will restructure to the spec §03 Library (filterable by week). */}
        {tab === "library" && !subView && (
          <LibraryHub
            navigate={navigate}
            clinicGuides={clinicGuides}
            clinicGuideTemplates={clinicGuideTemplates}
            currentWeek={currentWeek}
            totalWeeks={totalWeeks}
            studySheets={studySheets}
            completedItems={completedItems}
            weeklyScores={weeklyScores}
            bookmarks={bookmarks}
          />
        )}
        {tab === "library" && subView?.type === "refDetail" && (
          <RefDetailView refId={subView.id} onBack={goBack} />
        )}
        {tab === "library" && subView?.type === "abbreviations" && (
          <AbbreviationsView onBack={goBack} />
        )}
        {tab === "library" && subView?.type === "trialLibrary" && (
          <TrialLibraryView onBack={goBack} bookmarks={bookmarks} onToggleBookmark={(name) => toggleBookmark("trials", name)} initialSearch={subView?.searchTrial as string | undefined} />
        )}
        {tab === "library" && subView?.type === "clinicGuide" && (
          <ClinicGuideView
            date={subView.date}
            topic={subView.topic || clinicGuides.find(g => g.date === subView.date)?.topic || "CKD"}
            isOverride={clinicGuides.find(g => g.date === subView.date && g.topic === (subView.topic || "CKD"))?.isOverride}
            clinicGuideTemplates={clinicGuideTemplates}
            onBack={goBack}
          />
        )}
        {tab === "library" && subView?.type === "clinicGuideHistory" && (
          <ClinicGuideHistoryView guides={clinicGuides} clinicGuideTemplates={clinicGuideTemplates} onSelect={(date, topic) => navigate("library", { type: "clinicGuide", date, topic })} onBack={goBack} />
        )}
        {tab === "library" && subView?.type === "inpatientGuide" && (
          <InpatientGuideView topic={subView.topic as import("../data/inpatientGuides").InpatientGuideTopic} onBack={goBack} />
        )}
        {tab === "library" && subView?.type === "akiTool" && (
          <AkiToolView onBack={goBack} onOpenCalculator={(id) => navigate("library", { type: "refDetail", id })} />
        )}
        {tab === "library" && subView?.type === "hyponatremiaTool" && (
          <HyponatremiaToolView onBack={goBack} />
        )}
        {tab === "library" && subView?.type === "gnTool" && (
          <GnToolView onBack={goBack} />
        )}
        {tab === "library" && subView?.type === "rotationGuide" && (
          <RotationGuideView guideId={subView.guideId as import("../data/rotationGuides").RotationGuideId} onBack={goBack} />
        )}
        {tab === "library" && subView?.type === "faq" && (
          <FaqView onBack={goBack} />
        )}
        {tab === "library" && subView && !subView?.type?.toString().startsWith("clinic") && subView?.type !== "trialLibrary" && subView?.type !== "inpatientGuide" && subView?.type !== "akiTool" && subView?.type !== "hyponatremiaTool" && subView?.type !== "gnTool" && subView?.type !== "rotationGuide" && subView?.type !== "faq" && subView?.type !== "refDetail" && subView?.type !== "abbreviations" && <GuideTab navigate={navigate as (tab: string, sv?: Record<string, unknown> | null) => void} subView={subView as Record<string, unknown> | null} clinicGuides={clinicGuides} clinicGuideTemplates={clinicGuideTemplates} />}
        {tab === "patients" && <PatientTab patients={patients} setPatients={setPatients} navigate={navigate} completedItems={completedItems} onLogActivity={logActivity} onMarkPatientDirty={markPatientDirty} onMarkPatientRemoved={markPatientRemoved} />}
        {tab === "team" && <TeamTab currentStudentId={studentId} />}
        {tab === "me" && <ProgressTab navigate={navigate} patients={patients} weeklyScores={weeklyScores} preScore={preScore} postScore={postScore} gamification={gamification} currentWeek={currentWeek} competencySummary={competencySummary} />}
        </Suspense>
      </main>

      {/* Bottom Nav — hidden during quiz sessions so feedback isn't covered. */}
      {!(subView && (subView.type === "weeklyQuiz" || subView.type === "reviewMissed" || subView.type === "preQuiz" || subView.type === "postQuiz")) && (
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: T.card, borderTop: `1px solid ${T.line}`, display: "flex", zIndex: 100, boxShadow: "0 -2px 12px rgba(0,0,0,0.06)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => navigate(t.id)}
              style={{ flex: 1, padding: "8px 0 6px", background: active ? T.surface2 : "none", border: "none", borderRadius: active ? 12 : 0, margin: "4px 2px", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                color: active ? T.brand : T.sub,
                transition: "background 0.15s ease, color 0.15s ease",
              }}>
              <t.Icon size={20} strokeWidth={active ? 2 : 1.75} aria-hidden="true" />
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
}

export default StudentApp;
