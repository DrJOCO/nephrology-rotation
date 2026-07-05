import { useState, useEffect, useRef, useMemo } from "react";
import { BackLevelProvider, type BackLevelContextValue } from "../hooks/backLevelContext";
import { T, WEEKLY, ARTICLES } from "../data/constants";
import type { ClinicGuideTemplates } from "../data/clinicGuides";
import store from "../utils/store";
import {
  clearSavedStudentSignInEmail,
  normalizeStudentPinInput,
  signOutFirebase,
} from "../utils/firebase";
import { scrollWindowToTop, useIsMobile, useOnline } from "../utils/helpers";
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
  STUDENT_DEFERRED_SIGNOUT_KEY,
  STUDENT_EMAIL_KEY,
  STUDENT_YEAR_KEY,
  STUDENT_PENDING_JOIN_CODE_KEY,
} from "../hooks/useStudentAuth";
import { useStudentSync } from "../hooks/useStudentSync";
import { useGlobalSearchShortcut } from "../hooks/useGlobalSearchShortcut";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import type { Patient, QuizScore, WeeklyScores, SubView, Announcement, SharedSettings, Gamification, ActivityLogEntry, SrQueue, CompletedItems, Bookmarks, ClinicGuideRecord, ReflectionEntry } from "../types";

// Critical-path components (eager)
import OnboardingOverlay from "./student/OnboardingOverlay";
import LoginScreen from "./student/LoginScreen";
import GlobalSearchOverlay from "./student/GlobalSearchOverlay";
import ProfileSheet from "./student/ProfileSheet";
import StudentHeader from "./student/StudentHeader";
import OfflineSyncBanner from "./student/OfflineSyncBanner";
import StudentBottomNav from "./student/StudentBottomNav";
import StudentViewRouter from "./student/StudentViewRouter";
import { ConfirmSheet } from "./student/shared";

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
  const [bookmarks, setBookmarks] = useState<Bookmarks>({ trials: [], articles: [], cases: [], studySheets: [] });
  const [srQueue, setSrQueue] = useState<SrQueue>({});
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [clinicGuides, setClinicGuides] = useState<ClinicGuideRecord[]>([]);
  const [clinicGuideTemplates, setClinicGuideTemplates] = useState<ClinicGuideTemplates>(() => normalizeClinicGuideTemplates());
  const [studySheets, setStudySheets] = useState<StudySheetsData>(() => normalizeStudySheets());
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

  const { searchOpen, setSearchOpen } = useGlobalSearchShortcut();
  const { installPromptVariant, handleInstallApp, dismissInstallPrompt } = useInstallPrompt({ nameSet, joinedAt });

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
  //
  // Full-screen overlays (e.g. global search) don't push a navView of their own —
  // they float on top of whatever tab/subView is current. Without special handling,
  // hardware/browser Back would silently navigate the view underneath while the
  // overlay stayed open. So a ref tracks whether an overlay is currently open; the
  // effect below pushes a history entry when it opens, and popstate closes the
  // overlay (instead of changing the view) whenever one is open.
  const overlayCloseRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    window.history.replaceState({ navView: { tab: "today", subView: null } }, "");
    const onPop = (e: PopStateEvent) => {
      if (overlayCloseRef.current) {
        const close = overlayCloseRef.current;
        overlayCloseRef.current = null;
        close();
        return;
      }
      const view = (e.state && (e.state as { navView?: { tab: string; subView: SubView } }).navView) || null;
      setTab(view?.tab ?? "today");
      setSubView(view?.subView ?? null);
      scrollWindowToTop();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Imperative core of the Back-closes-a-layer mechanism: push a history entry
  // so Back has something to pop, install `close` on overlayCloseRef so the
  // shared popstate handler runs it (instead of navigating), and return a
  // cleanup that clears the ref if Back hasn't already consumed it. Shared by
  // full-screen overlays (via useBackClosesOverlay) and deep leaf views' local
  // detail levels (via the BackLevel context below), so there is exactly one
  // history/popstate mechanism.
  const registerBackHandler = (close: () => void) => {
    window.history.pushState({ overlay: true }, "");
    overlayCloseRef.current = close;
    return () => {
      if (overlayCloseRef.current === close) {
        overlayCloseRef.current = null;
      }
    };
  };

  // Registers `close` to run on the next hardware/browser Back while `isOpen` is
  // true, pushing a history entry so Back has something to pop instead of falling
  // through to the view underneath. Shared by every full-screen overlay layer.
  const useBackClosesOverlay = (isOpen: boolean, close: () => void) => {
    useEffect(() => {
      if (!isOpen) return;
      return registerBackHandler(close);

    }, [isOpen]);
  };

  // Context value threading the same mechanism down to deep leaf views
  // (TopicBrowseView, CasesView) whose local detail level would otherwise be
  // skipped by hardware Back. `hasLiveLevelRef` tracks whether a registered
  // level's pushed entry is still on the stack, so a leaf view's on-screen Back
  // can pop it (rather than leaving a dead entry) — mirroring closeSearchOverlay.
  const backLevelValue = useMemo<BackLevelContextValue>(() => {
    const hasLiveLevelRef = { current: false };
    return {
      hasLiveLevelRef,
      registerLevel: (close: () => void) => {
        hasLiveLevelRef.current = true;
        const cleanup = registerBackHandler(() => {
          hasLiveLevelRef.current = false;
          close();
        });
        return () => {
          hasLiveLevelRef.current = false;
          cleanup();
        };
      },
    };

  }, []);

  // Search is a full-screen overlay (GlobalSearchOverlay, position: fixed / inset: 0)
  // that floats above the current tab/subView — see useBackClosesOverlay above for why
  // hardware/browser Back needs special handling for it.
  useBackClosesOverlay(searchOpen, () => setSearchOpen(false));
  // Closing from in-app UI (X button, selecting a result, Escape): if the overlay's
  // history entry is still on top, pop it so hardware Back doesn't later land on a
  // dead entry; otherwise (already popped via hardware Back) just clear the state.
  const closeSearchOverlay = () => {
    if (overlayCloseRef.current) {
      window.history.back();
    } else {
      setSearchOpen(false);
    }
  };
  // NOTE on the other full-screen layers (OnboardingOverlay, ProfileSheet, the
  // two ConfirmSheets): registering them here would NOT be a safe one-liner.
  // Unlike search — whose in-app close routes through closeSearchOverlay and
  // pops the pushed history entry — those layers dismiss by flipping their
  // boolean directly (X / Cancel / Confirm / ESC). That fires the effect
  // cleanup but leaves the pushed entry on the stack, so a later hardware Back
  // would pop a dead entry and navigate the tab underneath. Wiring them safely
  // means threading a history.back()-aware close into each dismiss path, which
  // is more than one line and out of scope for this conservative nav fix.

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

  const requestLogout = () => setLogoutConfirmOpen(true);

  const handleLogout = async () => {
    setLogoutConfirmOpen(false);
    // In "View as student" preview, "End session" must not mutate real state
    // (no signOutFirebase — that would kill the admin's session — and no real
    // localStorage teardown). Just leave the sandbox, same as Exit preview.
    if (store.isPreview()) {
      onAdminToggle?.();
      return;
    }
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    await flushStudentSync();
    if (store.getPendingSyncCount() > 0) {
      // The final flush (or earlier offline work) is parked in the pending
      // queue. Security rules only let THIS student's session write those
      // docs, so signing out of Firebase now would strand the queued progress
      // forever. Keep the session alive behind a signed-out UI; useStudentSync
      // completes the sign-out once the queue drains.
      localStorage.setItem(STUDENT_DEFERRED_SIGNOUT_KEY, "1");
    } else {
      try {
        await signOutFirebase();
      } catch (e) {
        console.warn("Student sign-out failed:", e);
      }
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

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.sans }}>
      {/* Skip to main content — Phase 2.5 (§12). Visually hidden until focused. */}
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      {showOnboarding && <OnboardingOverlay onDismiss={() => setShowOnboarding(false)} onViewFirstDay={() => { setShowOnboarding(false); navigate("library", { type: "guideDetail", id: "firstday" }); }} />}
      {searchOpen && (
        <GlobalSearchOverlay
          onClose={closeSearchOverlay}
          onNavigate={(t, sv) => { navigate(t, sv as SubView | undefined); closeSearchOverlay(); }}
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
      <StudentHeader
        isMobile={isMobile}
        online={online}
        gamification={gamification}
        onTitleActivate={() => { handleTitleTap(); navigate("today"); }}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenProfile={() => setProfileOpen(true)}
      />
      <OfflineSyncBanner online={online} pendingSyncCount={pendingSyncCount} />
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
        <BackLevelProvider value={backLevelValue}>
        <StudentViewRouter
          tab={tab}
          subView={subView}
          navigate={navigate}
          goBack={goBack}
          patients={patients}
          setPatients={setPatients}
          weeklyScores={weeklyScores}
          setWeeklyScores={setWeeklyScores}
          preScore={preScore}
          setPreScore={setPreScore}
          postScore={postScore}
          setPostScore={setPostScore}
          gamification={gamification}
          completedItems={completedItems}
          setCompletedItems={setCompletedItems}
          bookmarks={bookmarks}
          srQueue={srQueue}
          setSrQueue={setSrQueue}
          reflections={reflections}
          curriculum={curriculum}
          articles={articles}
          studySheets={studySheets}
          announcements={announcements}
          clinicGuides={clinicGuides}
          clinicGuideTemplates={clinicGuideTemplates}
          currentWeek={currentWeek}
          totalWeeks={totalWeeks}
          rotationEnded={rotationEnded}
          competencySummary={competencySummary}
          online={online}
          studentId={studentId}
          installPromptVariant={installPromptVariant}
          onInstallApp={handleInstallApp}
          onDismissInstallPrompt={dismissInstallPrompt}
          onSubmitReflection={handleSubmitReflection}
          onCompleteConsultTopic={handleCompleteConsultTopic}
          logActivity={logActivity}
          toggleBookmark={toggleBookmark}
          markPatientDirty={markPatientDirty}
          markPatientRemoved={markPatientRemoved}
        />
        </BackLevelProvider>
      </main>

      {/* Bottom Nav — hidden during quiz sessions so feedback isn't covered. */}
      <StudentBottomNav tab={tab} subView={subView} navigate={navigate} />
    </div>
  );
}

export default StudentApp;
