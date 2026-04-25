import React, { useState, useEffect, useCallback, useRef } from "react";
import { T, WEEKLY, ARTICLES } from "../data/constants";
import store from "../utils/store";
import { createAdminInvite, getCurrentAdminUser, listAdminInvites, normalizeEmailAddress, registerInvitedAdmin, sendAdminPasswordReset, signInAdmin, signInAdminWithGoogle, signOutFirebase, type AdminInviteRecord } from "../utils/firebase";
import { ensureGoogleFonts, ensureShakeAnimation, ensureLayoutStyles, ensureThemeStyles, SHARED_KEYS } from "../utils/helpers";
import { calculatePoints } from "../utils/gamification";
import { buildTeamSnapshot } from "../utils/teamSnapshots";
import { normalizeAdminStudentRecord } from "../utils/adminStudents";
import { AdminAuthScreen } from "./admin/AdminAuthScreen";
import { AdminPinGate, AdminPinSetupGate } from "./admin/AdminPinGate";
import { AdminShell } from "./admin/AdminShell";
import { SettingsTab } from "./admin/SettingsTab";
import { AdminConfirmDialog, AdminToast, type AdminConfirmOptions, type AdminToastState, type AdminToastTone } from "./admin/shared";
import { ArticleEditor } from "./admin/editors/ArticleEditor";
import { CurriculumEditor } from "./admin/editors/CurriculumEditor";
import { AnnouncementsEditor } from "./admin/editors/AnnouncementsEditor";
import { ClinicGuidesEditor } from "./admin/editors/ClinicGuidesEditor";
import { ContentTab } from "./admin/tabs/ContentTab";
import { DashboardTab } from "./admin/tabs/DashboardTab";
import { StudentsTab } from "./admin/tabs/StudentsTab";
import { AnalyticsTab } from "./admin/tabs/AnalyticsTab";
import { RotationSummaryReport } from "./admin/views/RotationSummaryReport";
import { PrintableReport } from "./admin/views/PrintableReport";
import { StudentDetailView } from "./admin/views/StudentDetailView";
import { adminScopedKey, getStoredAdminRotationCode, setStoredAdminRotationCode } from "./admin/storage";
import type { NavigateFn, WeeklyData, ArticlesData, AdminSession, AdminAuthMode } from "./admin/types";
import type { AdminSubView, AdminStudent, Announcement, SharedSettings, Patient, QuizScore, WeeklyScores, ClinicGuideRecord, CompletedItems, Bookmarks, ActivityLogEntry, ReflectionEntry } from "../types";
function getAdminAuthErrorMessage(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";
  const message = error instanceof Error ? error.message : "";
  if (message === "admin/unauthorized") {
    return "This account is not authorized for the admin panel.";
  }
  if (message === "admin/invite-required") {
    return "This email has not been invited yet. Ask an existing admin to add it first.";
  }
  if (message === "admin/already-claimed" || message === "admin/already-admin") {
    return "This email already has an admin account. Sign in instead.";
  }
  if (message === "admin/master-only") {
    return "Only the master admin (joncheng5@gmail.com) can invite new admins.";
  }
  if (code === "auth/invalid-email") return "Enter a valid admin email address.";
  if (code === "auth/email-already-in-use") return "This email already has an account. Sign in instead.";
  if (code === "auth/weak-password") return "Choose a stronger password with at least 6 characters.";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Email or password incorrect.";
  }
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return "Google sign-in was cancelled before it finished.";
  }
  if (code === "auth/popup-blocked") {
    return "Your browser blocked the Google sign-in popup. Allow popups and try again.";
  }
  if (code === "auth/too-many-requests") return "Too many sign-in attempts. Try again later.";
  if (code === "auth/operation-not-allowed") return "That admin sign-in method is not enabled in Firebase Authentication yet.";
  return "Admin sign-in failed. Check your email, password, or admin access.";
}

function pickLatestScore(a: QuizScore | null | undefined, b: QuizScore | null | undefined): QuizScore | null {
  if (!a) return b || null;
  if (!b) return a;
  return new Date(a.date).getTime() >= new Date(b.date).getTime() ? a : b;
}

function mergeWeeklyScores(source: WeeklyScores = {}, target: WeeklyScores = {}): WeeklyScores {
  const merged: WeeklyScores = {};
  const weeks = new Set([...Object.keys(source), ...Object.keys(target)]);
  weeks.forEach(week => {
    const seen = new Map<string, QuizScore>();
    [...(source[week] || []), ...(target[week] || [])].forEach(score => {
      seen.set(`${score.date}|${score.correct}|${score.total}`, score);
    });
    merged[week] = Array.from(seen.values()).sort((a, b) => a.date.localeCompare(b.date));
  });
  return merged;
}

function mergeCompletedItems(source?: CompletedItems, target?: CompletedItems): CompletedItems | undefined {
  const merged: CompletedItems = {
    articles: { ...(source?.articles || {}), ...(target?.articles || {}) },
    studySheets: { ...(source?.studySheets || {}), ...(target?.studySheets || {}) },
    cases: { ...(source?.cases || {}), ...(target?.cases || {}) },
    decks: { ...(source?.decks || {}), ...(target?.decks || {}) },
  };
  if (
    Object.keys(merged.articles).length === 0 &&
    Object.keys(merged.studySheets).length === 0 &&
    Object.keys(merged.cases).length === 0 &&
    Object.keys(merged.decks || {}).length === 0
  ) {
    return undefined;
  }
  return merged;
}

function mergeBookmarks(source?: Bookmarks, target?: Bookmarks): Bookmarks | undefined {
  const merged: Bookmarks = {
    trials: Array.from(new Set([...(source?.trials || []), ...(target?.trials || [])])),
    articles: Array.from(new Set([...(source?.articles || []), ...(target?.articles || [])])),
    cases: Array.from(new Set([...(source?.cases || []), ...(target?.cases || [])])),
    studySheets: Array.from(new Set([...(source?.studySheets || []), ...(target?.studySheets || [])])),
  };
  if (
    merged.trials.length === 0 &&
    merged.articles.length === 0 &&
    merged.cases.length === 0 &&
    merged.studySheets.length === 0
  ) {
    return undefined;
  }
  return merged;
}

function mergeActivityLog(source: ActivityLogEntry[] = [], target: ActivityLogEntry[] = []): ActivityLogEntry[] {
  const deduped = new Map<string, ActivityLogEntry>();
  [...source, ...target].forEach(entry => {
    deduped.set(`${entry.timestamp}|${entry.type}|${entry.label}|${entry.detail}`, entry);
  });
  return Array.from(deduped.values())
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-50);
}

function mergeReflections(source: ReflectionEntry[] = [], target: ReflectionEntry[] = []): ReflectionEntry[] {
  const deduped = new Map<string, ReflectionEntry>();
  [...source, ...target].forEach((entry) => {
    deduped.set(entry.id || `${entry.dayKey}|${entry.submittedAt}`, entry);
  });
  return Array.from(deduped.values())
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
    .slice(-30);
}

function buildRecoveredStudent(source: AdminStudent, target: AdminStudent): AdminStudent {
  const sourcePatients = source.patients || [];
  const targetPatients = target.patients || [];
  const mergedPatients = [
    ...sourcePatients,
    ...targetPatients.filter(tp => !sourcePatients.some(sp => String(sp.id) === String(tp.id))),
  ];
  const mergedAchievements = Array.from(new Set([
    ...(source.gamification?.achievements || []),
    ...(target.gamification?.achievements || []),
  ]));
  const mergedActivityLog = mergeActivityLog(source.activityLog || [], target.activityLog || []);

  return {
    ...target,
    name: target.name || source.name,
    year: target.year || source.year,
    email: target.email || source.email,
    status: target.status === "active" || source.status === "active" ? "active" : "completed",
    addedDate: [source.addedDate, target.addedDate].filter(Boolean).sort()[0] || new Date().toISOString(),
    patients: mergedPatients,
    weeklyScores: mergeWeeklyScores(source.weeklyScores || {}, target.weeklyScores || {}),
    preScore: pickLatestScore(source.preScore, target.preScore),
    postScore: pickLatestScore(source.postScore, target.postScore),
    gamification: {
      points: Math.max(source.gamification?.points || 0, target.gamification?.points || 0),
      achievements: mergedAchievements,
      streaks:
        (target.gamification?.streaks?.lastActiveDate || "") >= (source.gamification?.streaks?.lastActiveDate || "")
          ? (target.gamification?.streaks || source.gamification?.streaks || { currentDays: 0, longestDays: 0, lastActiveDate: null })
          : (source.gamification?.streaks || target.gamification?.streaks || { currentDays: 0, longestDays: 0, lastActiveDate: null }),
    },
    srQueue: { ...(source.srQueue || {}), ...(target.srQueue || {}) },
    activityLog: mergedActivityLog,
    reflections: mergeReflections(source.reflections, target.reflections),
    completedItems: mergeCompletedItems(source.completedItems, target.completedItems),
    bookmarks: mergeBookmarks(source.bookmarks, target.bookmarks),
    feedbackTags: [
      ...(source.feedbackTags || []),
      ...(target.feedbackTags || []).filter(tag =>
        !(source.feedbackTags || []).some(existing =>
          existing.tag === tag.tag && existing.date === tag.date && existing.note === tag.note
        )
      ),
    ],
    lastSyncedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════
//  Theme Toggle (Dark Mode)
// ═══════════════════════════════════════════════════════════════════════
function AdminThemeToggle() {
  const [theme, setTheme] = useState(() =>
    document.documentElement.getAttribute("data-theme") || "light"
  );
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("neph_theme", next);
  };
  return (
    <button onClick={toggle} style={{
      background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8,
      padding: "5px 8px", cursor: "pointer", fontSize: 14, lineHeight: 1,
      color: "white", display: "flex", alignItems: "center",
    }} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Admin Panel (main component)
// ═══════════════════════════════════════════════════════════════════════

function AdminPanel({ onExit }: { onExit?: () => void }) {
  const [tab, setTab] = useState("dashboard");
  const [subView, setSubView] = useState<AdminSubView>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseAdmin, setFirebaseAdmin] = useState<AdminSession | null>(null);
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinSetupValue, setPinSetupValue] = useState("");
  const [pinSetupConfirm, setPinSetupConfirm] = useState("");
  const [pinSetupError, setPinSetupError] = useState("");
  const [authEmail, setAuthEmail] = useState(() => localStorage.getItem("neph_adminEmail") || "");
  const [authPassword, setAuthPassword] = useState("");
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState("");
  const [authMode, setAuthMode] = useState<AdminAuthMode>("signin");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [adminInvites, setAdminInvites] = useState<AdminInviteRecord[]>([]);
  const [adminInvitesLoading, setAdminInvitesLoading] = useState(false);
  const [toast, setToast] = useState<AdminToastState | null>(null);
  const [confirmOptions, setConfirmOptions] = useState<AdminConfirmOptions | null>(null);
  const confirmResolverRef = useRef<((accepted: boolean) => void) | null>(null);

  // Admin data
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [articles, setArticles] = useState(ARTICLES);
  const [curriculum, setCurriculum] = useState(WEEKLY);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [settings, setSettings] = useState<SharedSettings>({ attendingName: "", rotationStart: "", email: "", phone: "", adminPin: "" });
  const [clinicGuides, setClinicGuides] = useState<ClinicGuideRecord[]>([]);
  const [rotationCode, setRotationCodeState] = useState("");

  const resetAdminWorkspace = useCallback(() => {
    setStudents([]);
    setArticles(ARTICLES);
    setCurriculum(WEEKLY);
    setAnnouncements([]);
    setSettings({ attendingName: "", rotationStart: "", email: "", phone: "", adminPin: "" });
    setClinicGuides([]);
    setRotationCodeState("");
    setTab("dashboard");
    setSubView(null);
  }, []);

  const showToast = useCallback((message: string, tone: AdminToastTone = "info") => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  const requestConfirm = useCallback((options: AdminConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmOptions(options);
    });
  }, []);

  const resolveConfirm = useCallback((accepted: boolean) => {
    const resolver = confirmResolverRef.current;
    confirmResolverRef.current = null;
    setConfirmOptions(null);
    resolver?.(accepted);
  }, []);

  useEffect(() => {
    if (!firebaseAdmin) return;
    void store.flushPendingSyncQueue();
  }, [firebaseAdmin]);

  const loadLocalAdminData = useCallback(async (uid: string) => {
    const settingsState = await store.get<SharedSettings>(adminScopedKey(uid, "settings"));
    const s = await store.get<AdminStudent[]>(adminScopedKey(uid, "students"));
    const a = await store.get<ArticlesData>(adminScopedKey(uid, "articles"));
    const c = await store.get<WeeklyData>(adminScopedKey(uid, "curriculum"));
    const an = await store.get<Announcement[]>(adminScopedKey(uid, "announcements"));
    if (settingsState) {
      setSettings(prev => ({ ...prev, ...settingsState }));
    }
    if (s) {
      setStudents(s.map((student) => normalizeAdminStudentRecord(
        { ...student, studentId: student.studentId },
        undefined,
        {
          fallbackId: student.id,
          fallbackName: student.name || "Unknown",
          fallbackAddedDate: student.addedDate,
        },
      )));
    }
    if (a) setArticles(a);
    if (c) setCurriculum(c);
    if (an) setAnnouncements(an);
  }, []);

  const hydrateRotationData = useCallback(async (code: string, session: AdminSession) => {
    try {
      await store.ensureRotationOwnership(code, session);
    } catch (error) {
      console.warn("Could not update rotation ownership for", code, error);
    }
    const remote = await store.getRotationData(code);
    if (!remote) return false;
    if (remote.curriculum) setCurriculum(remote.curriculum);
    if (remote.articles) setArticles(remote.articles);
    if (remote.announcements) setAnnouncements(remote.announcements);
    if (remote.settings) setSettings(prev => ({ ...prev, ...remote.settings }));
    if (remote.clinicGuides) setClinicGuides(remote.clinicGuides);
    return true;
  }, []);

  // Load — when connected to a rotation, hydrate from Firestore first to avoid
  // overwriting shared state with stale local defaults
  useEffect(() => {
    ensureGoogleFonts();
    ensureShakeAnimation();
    ensureLayoutStyles();
    ensureThemeStyles();
    (async () => {
      const adminUser = await getCurrentAdminUser();
      if (adminUser) {
        const session = { uid: adminUser.uid, email: adminUser.email || "" };
        const code = getStoredAdminRotationCode(adminUser.uid);
        resetAdminWorkspace();
        await loadLocalAdminData(adminUser.uid);
        store.setRotationCode(code || null);
        if (code) {
          const hydrated = await hydrateRotationData(code, session);
          if (!hydrated) {
            console.warn("Could not read rotation data for", code, "— disconnecting to prevent stale overwrite");
            store.setRotationCode(null);
            setStoredAdminRotationCode(adminUser.uid, null);
            setRotationCodeState("");
          } else {
            setRotationCodeState(code);
          }
        }
        setFirebaseAdmin(session);
        setLoading(false);
        return;
      }
      setLoading(false);
    })();
  }, [hydrateRotationData, loadLocalAdminData]);

  const refreshAdminInvites = useCallback(async (session?: AdminSession | null) => {
    if (!session) {
      setAdminInvites([]);
      return;
    }
    setAdminInvitesLoading(true);
    try {
      const invites = await listAdminInvites(session.uid);
      setAdminInvites(invites);
    } catch (error) {
      console.error("Failed to load admin invites:", error);
    }
    setAdminInvitesLoading(false);
  }, []);

  useEffect(() => {
    void refreshAdminInvites(firebaseAdmin);
  }, [firebaseAdmin, refreshAdminInvites]);

  // Save local state
  useEffect(() => {
    if (!loading && firebaseAdmin) {
      store.set(adminScopedKey(firebaseAdmin.uid, "students"), students);
    }
  }, [students, loading, firebaseAdmin]);

  useEffect(() => {
    if (!loading && firebaseAdmin) {
      store.set(adminScopedKey(firebaseAdmin.uid, "articles"), articles);
      store.set(adminScopedKey(firebaseAdmin.uid, "curriculum"), curriculum);
      store.set(adminScopedKey(firebaseAdmin.uid, "announcements"), announcements);
      store.set(adminScopedKey(firebaseAdmin.uid, "settings"), settings);
    }
  }, [articles, curriculum, announcements, settings, loading, firebaseAdmin]);

  // Save shared state (consolidated) — strip adminPin before publishing
  useEffect(() => {
    if (!loading && firebaseAdmin) {
      store.setShared(SHARED_KEYS.curriculum, curriculum);
      store.setShared(SHARED_KEYS.articles, articles);
      store.setShared(SHARED_KEYS.announcements, announcements);
      const { adminPin: _pin, ...publicSettings } = settings;
      store.setShared(SHARED_KEYS.settings, publicSettings);
    }
  }, [curriculum, articles, announcements, settings, loading, firebaseAdmin]);

  // Real-time listener: students auto-appear when connected to a rotation
  useEffect(() => {
    if (!firebaseAdmin || !rotationCode) return;
    const unsub = store.onStudentsChanged((firestoreStudents) => {
      setStudents((prev) => firestoreStudents.map((student) => {
        const studentId = typeof student.studentId === "string" ? student.studentId : "";
        const existing = prev.find((item) => item.studentId === studentId);
        return normalizeAdminStudentRecord(
          student as Partial<AdminStudent> & { studentId: string; updatedAt?: string; joinedAt?: string },
          existing,
          {
            fallbackId: existing?.id ?? studentId,
            fallbackName: existing?.name || "Unknown",
            fallbackAddedDate: existing?.addedDate,
          },
        );
      }));
    });
    return () => unsub();
  }, [rotationCode, firebaseAdmin]);

  // Write student edits back to Firestore
  const writeStudentToFirestore = useCallback((studentId: string, data: Record<string, unknown>) => {
    if (!firebaseAdmin || !rotationCode || !studentId) return;
    const existing = students.find(student => student.studentId === studentId);
    const merged = { ...existing, ...data };
    const updatedAt = new Date().toISOString();
    store.setStudentData(studentId, {
      ...data,
      ...(typeof merged.year === "string" && merged.year.trim() ? { year: merged.year } : {}),
      updatedAt,
    });
    void store.setTeamSnapshot(studentId, buildTeamSnapshot({
      studentId,
      name: typeof merged.name === "string" ? merged.name : "Unknown",
      patients: Array.isArray(merged.patients) ? merged.patients as Patient[] : [],
      points: calculatePoints(merged as Parameters<typeof calculatePoints>[0]),
      updatedAt,
    }));
  }, [rotationCode, firebaseAdmin, students]);

  const recoverStudentToRecord = useCallback(async (sourceStudentId: string, targetStudentId: string) => {
    if (!firebaseAdmin || !rotationCode) throw new Error("Connect to the live rotation before running recovery.");
    if (!sourceStudentId || !targetStudentId || sourceStudentId === targetStudentId) {
      throw new Error("Select a different destination record.");
    }

    const source = students.find(s => s.studentId === sourceStudentId);
    const target = students.find(s => s.studentId === targetStudentId);
    if (!source || !target) throw new Error("Student record not found.");

    const merged = buildRecoveredStudent(source, target);
    await store.setStudentData(target.studentId, {
      name: merged.name,
      year: merged.year,
      email: merged.email,
      status: merged.status,
      joinedAt: merged.addedDate,
      patients: merged.patients,
      weeklyScores: merged.weeklyScores,
      preScore: merged.preScore,
      postScore: merged.postScore,
      gamification: merged.gamification,
      srQueue: merged.srQueue,
      activityLog: merged.activityLog,
      reflections: merged.reflections,
      completedItems: merged.completedItems,
      bookmarks: merged.bookmarks,
      feedbackTags: merged.feedbackTags,
      updatedAt: new Date().toISOString(),
    });
    await store.setTeamSnapshot(target.studentId, buildTeamSnapshot({
      studentId: target.studentId,
      name: merged.name,
      patients: merged.patients,
      points: calculatePoints(merged as Parameters<typeof calculatePoints>[0]),
    }));
    await store.deleteStudentData(source.studentId);

    setStudents(prev =>
      prev
        .filter(s => s.studentId !== source.studentId)
        .map(s => (s.studentId === target.studentId ? merged : s))
    );

    return target.studentId;
  }, [firebaseAdmin, rotationCode, students]);

  const deleteStudentRecord = useCallback(async (student: AdminStudent) => {
    if (firebaseAdmin && rotationCode && student.studentId) {
      await store.deleteStudentData(student.studentId);
    }

    setStudents(prev => prev.filter(existing => existing.studentId !== student.studentId && existing.id !== student.id));
  }, [firebaseAdmin, rotationCode]);

  const navigate = (t: string, sv: AdminSubView = null) => { setTab(t); setSubView(sv); };
  const activePin = (settings?.adminPin || "").trim();

  const handleAdminSignIn = async () => {
    if (!authEmail.trim() || !authPassword) return;
    setAuthSubmitting(true);
    setAuthError("");
    try {
      const user = await signInAdmin(authEmail.trim(), authPassword);
      const session = { uid: user.uid, email: user.email || authEmail.trim() };
      const code = getStoredAdminRotationCode(user.uid);
      resetAdminWorkspace();
      await loadLocalAdminData(user.uid);
      store.setRotationCode(code || null);
      if (code) {
        const hydrated = await hydrateRotationData(code, session);
        if (!hydrated) {
          store.setRotationCode(null);
          setStoredAdminRotationCode(user.uid, null);
          setRotationCodeState("");
        } else {
          setRotationCodeState(code);
        }
      }
      localStorage.setItem("neph_adminEmail", authEmail.trim());
      setFirebaseAdmin(session);
      setAuthPassword("");
      setAuthPasswordConfirm("");
      setAuthed(false);
      setPin("");
    } catch (e) {
      console.error("Admin sign-in failed:", e);
      setAuthError(getAdminAuthErrorMessage(e));
    }
    setAuthSubmitting(false);
  };

  const handleAdminGoogleSignIn = async () => {
    setAuthSubmitting(true);
    setAuthError("");
    try {
      const user = await signInAdminWithGoogle();
      const session = { uid: user.uid, email: user.email || "" };
      const code = getStoredAdminRotationCode(user.uid);
      resetAdminWorkspace();
      await loadLocalAdminData(user.uid);
      store.setRotationCode(code || null);
      if (code) {
        const hydrated = await hydrateRotationData(code, session);
        if (!hydrated) {
          store.setRotationCode(null);
          setStoredAdminRotationCode(user.uid, null);
          setRotationCodeState("");
        } else {
          setRotationCodeState(code);
        }
      }
      if (user.email) {
        localStorage.setItem("neph_adminEmail", user.email);
        setAuthEmail(user.email);
      }
      setFirebaseAdmin(session);
      setAuthPassword("");
      setAuthPasswordConfirm("");
      setAuthed(false);
      setPin("");
      setAuthMode("signin");
    } catch (e) {
      console.error("Admin Google sign-in failed:", e);
      setAuthError(getAdminAuthErrorMessage(e));
    }
    setAuthSubmitting(false);
  };

  const handleAdminCreateAccount = async () => {
    if (!authEmail.trim() || !authPassword || !authPasswordConfirm) return;
    if (authPassword !== authPasswordConfirm) {
      setAuthError("Passwords do not match.");
      return;
    }

    setAuthSubmitting(true);
    setAuthError("");
    try {
      const user = await registerInvitedAdmin(authEmail.trim(), authPassword);
      const session = { uid: user.uid, email: user.email || normalizeEmailAddress(authEmail) };
      resetAdminWorkspace();
      await loadLocalAdminData(user.uid);
      store.setRotationCode(null);
      setStoredAdminRotationCode(user.uid, null);
      localStorage.setItem("neph_adminEmail", normalizeEmailAddress(authEmail));
      setFirebaseAdmin(session);
      setAuthPassword("");
      setAuthPasswordConfirm("");
      setAuthed(false);
      setPin("");
      setAuthMode("signin");
    } catch (e) {
      console.error("Invited admin signup failed:", e);
      setAuthError(getAdminAuthErrorMessage(e));
    }
    setAuthSubmitting(false);
  };

  const handleAdminForgotPassword = async () => {
    const trimmed = authEmail.trim();
    if (!trimmed) {
      setAuthError("Enter your admin email first, then tap Forgot password.");
      return;
    }
    setAuthSubmitting(true);
    setAuthError("");
    try {
      await sendAdminPasswordReset(trimmed);
      setAuthError(`Reset link sent to ${trimmed}. Check your inbox, set a new password, then sign in.`);
    } catch (e) {
      console.error("Admin password reset failed:", e);
      setAuthError(getAdminAuthErrorMessage(e));
    }
    setAuthSubmitting(false);
  };

  const handleAdminSignOut = useCallback(async () => {
    await signOutFirebase();
    resetAdminWorkspace();
    setFirebaseAdmin(null);
    setAuthMode("signin");
    setAuthed(false);
    setPin("");
    setAuthPassword("");
    setAuthPasswordConfirm("");
    setAuthError("");
    setInviteEmail("");
    setInviteError("");
    setInviteSuccess("");
    setAdminInvites([]);
  }, [resetAdminWorkspace]);

  const handleInviteAdmin = async () => {
    if (!inviteEmail.trim()) return;
    setInviteSubmitting(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      const normalizedEmail = normalizeEmailAddress(inviteEmail);
      await createAdminInvite(normalizedEmail);
      setInviteSuccess(`${normalizedEmail} can now create an admin account from the sign-in screen.`);
      setInviteEmail("");
      await refreshAdminInvites(firebaseAdmin);
    } catch (error) {
      console.error("Admin invite failed:", error);
      setInviteError(getAdminAuthErrorMessage(error));
    }
    setInviteSubmitting(false);
  };

  const handlePinSubmit = () => {
    if (pin === activePin) {
      setAuthed(true);
      setPinError(false);
    } else if (pin.length > 0) {
      setPinError(true);
      setTimeout(() => setPinError(false), 1500);
    }
  };

  const handlePinSetupSubmit = () => {
    const nextPin = pinSetupValue.trim();
    if (nextPin.length < 4) {
      setPinSetupError("Use at least 4 characters.");
      return;
    }
    if (nextPin !== pinSetupConfirm.trim()) {
      setPinSetupError("PINs need to match.");
      return;
    }
    setSettings(prev => ({ ...prev, adminPin: nextPin }));
    setPin("");
    setPinSetupValue("");
    setPinSetupConfirm("");
    setPinSetupError("");
    setAuthed(true);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.dark, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: T.pale, fontFamily: T.serif, fontSize: 18 }}>Loading...</div>
    </div>
  );

  if (!firebaseAdmin) {
    return (
      <AdminAuthScreen
        authMode={authMode}
        setAuthMode={(mode) => {
          setAuthError("");
          setAuthMode(mode);
        }}
        authEmail={authEmail}
        setAuthEmail={(value) => { setAuthError(""); setAuthEmail(value); }}
        authPassword={authPassword}
        setAuthPassword={(value) => { setAuthError(""); setAuthPassword(value); }}
        authPasswordConfirm={authPasswordConfirm}
        setAuthPasswordConfirm={(value) => { setAuthError(""); setAuthPasswordConfirm(value); }}
        authSubmitting={authSubmitting}
        authError={authError}
        onSignIn={handleAdminSignIn}
        onSignInWithGoogle={handleAdminGoogleSignIn}
        onCreateAccount={handleAdminCreateAccount}
        onForgotPassword={handleAdminForgotPassword}
        onExit={onExit}
      />
    );
  }

  if (!authed) {
    if (!activePin) {
      return (
        <AdminPinSetupGate
          pin={pinSetupValue}
          setPin={setPinSetupValue}
          confirmPin={pinSetupConfirm}
          setConfirmPin={setPinSetupConfirm}
          setupError={pinSetupError}
          onSubmit={handlePinSetupSubmit}
          signedInEmail={firebaseAdmin.email || "admin user"}
          onSignOut={handleAdminSignOut}
          onExit={onExit}
        />
      );
    }

    return (
      <AdminPinGate
        pin={pin}
        setPin={setPin}
        pinError={pinError}
        onSubmit={handlePinSubmit}
        signedInEmail={firebaseAdmin.email || "admin user"}
        onSignOut={handleAdminSignOut}
        onExit={onExit}
      />
    );
  }

  const tabs = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "students", icon: "🎓", label: "Students" },
    { id: "analytics", icon: "📈", label: "Analytics" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <>
      <AdminShell
        tabs={tabs}
        activeTab={tab}
        onNavigate={(nextTab) => navigate(nextTab)}
        heading={settings.attendingName || "Nephrology Rotation"}
        subheading={firebaseAdmin.email || "Attending workspace"}
        rotationCode={rotationCode}
        onLock={() => setAuthed(false)}
        onSignOut={() => { void handleAdminSignOut(); }}
        onExit={onExit}
        themeToggle={<AdminThemeToggle />}
        contentKey={tab + (subView ? JSON.stringify(subView) : "")}
      >
        {tab === "dashboard" && !subView && <DashboardTab students={students} setStudents={setStudents} navigate={navigate} rotationCode={rotationCode} settings={settings} articles={articles} writeStudentToFirestore={writeStudentToFirestore} requestConfirm={requestConfirm} showToast={showToast} />}
        {tab === "dashboard" && subView?.type === "printCohort" && <PrintableReport mode="cohort" students={students} settings={settings} articles={articles} onBack={() => navigate("dashboard")} />}
        {tab === "students" && !subView && <StudentsTab students={students} setStudents={setStudents} navigate={navigate} rotationCode={rotationCode} settings={settings} articles={articles} deleteStudentRecord={deleteStudentRecord} requestConfirm={requestConfirm} showToast={showToast} />}
        {tab === "students" && subView?.type === "studentDetail" && <StudentDetailView student={students.find(s => String(s.id) === subView.id)} students={students} onBack={() => navigate("students")} setStudents={setStudents} writeStudentToFirestore={writeStudentToFirestore} recoverStudentToRecord={recoverStudentToRecord} deleteStudentRecord={deleteStudentRecord} navigate={navigate} settings={settings} articles={articles} requestConfirm={requestConfirm} showToast={showToast} />}
        {tab === "students" && subView?.type === "printStudent" && <PrintableReport mode="individual" student={students.find(s => String(s.id) === subView.id)} students={students} settings={settings} articles={articles} onBack={() => navigate("students", { type: "studentDetail", id: subView.id })} />}
        {tab === "students" && subView?.type === "exportPdf" && <RotationSummaryReport student={students.find(s => String(s.id) === subView.id)} settings={settings} articles={articles} onBack={() => navigate("students", { type: "studentDetail", id: subView.id })} />}
        {tab === "analytics" && <AnalyticsTab students={students} rotationCode={rotationCode} settings={settings} articles={articles} />}
        {tab === "content" && !subView && <ContentTab navigate={navigate} articles={articles} curriculum={curriculum} clinicGuides={clinicGuides} />}
        {tab === "content" && subView?.type === "editArticles" && <ArticleEditor week={subView.week} articles={articles} setArticles={setArticles} onBack={() => navigate("content")} />}
        {tab === "content" && subView?.type === "editCurriculum" && <CurriculumEditor curriculum={curriculum} setCurriculum={setCurriculum} onBack={() => navigate("content")} />}
        {tab === "content" && subView?.type === "announcements" && <AnnouncementsEditor announcements={announcements} setAnnouncements={setAnnouncements} onBack={() => navigate("content")} />}
        {tab === "content" && subView?.type === "clinicGuides" && <ClinicGuidesEditor clinicGuides={clinicGuides} setClinicGuides={setClinicGuides} onBack={() => navigate("content")} />}
        {tab === "settings" && firebaseAdmin && (
          <SettingsTab
            settings={settings}
            setSettings={setSettings}
            rotationCode={rotationCode}
            setRotationCodeState={setRotationCodeState}
            curriculum={curriculum}
            articles={articles}
            announcements={announcements}
            setCurriculum={setCurriculum}
            setArticles={setArticles}
            setAnnouncements={setAnnouncements}
            firebaseAdmin={firebaseAdmin}
            adminInvites={adminInvites}
            adminInvitesLoading={adminInvitesLoading}
            inviteEmail={inviteEmail}
            setInviteEmail={setInviteEmail}
            inviteSubmitting={inviteSubmitting}
            inviteError={inviteError}
            inviteSuccess={inviteSuccess}
            onInviteAdmin={handleInviteAdmin}
            showToast={showToast}
            requestConfirm={requestConfirm}
            onOpenContent={(subView) => navigate("content", subView ?? null)}
          />
        )}
      </AdminShell>
      <AdminToast toast={toast} onClose={() => setToast(null)} />
      <AdminConfirmDialog options={confirmOptions} onCancel={() => resolveConfirm(false)} onConfirm={() => resolveConfirm(true)} />
    </>
  );
}

export default AdminPanel;
