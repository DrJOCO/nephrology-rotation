import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Moon, Sun } from "lucide-react";
import { T, WEEKLY, ARTICLES } from "../data/constants";
import type { ClinicGuideTemplates } from "../data/clinicGuides";
import store, { type RotationInfo } from "../utils/store";
import { createAdminInvite, getCurrentAdminUser, listAdminInvites, normalizeEmailAddress, registerInvitedAdmin, sendAdminPasswordReset, signInAdmin, signInAdminWithGoogle, signOutFirebase, type AdminInviteRecord } from "../utils/firebase";
import { applyTheme, ensureGoogleFonts, ensureShakeAnimation, ensureLayoutStyles, ensureThemeStyles, SHARED_KEYS } from "../utils/helpers";
import { calculatePoints } from "../utils/gamification";
import { normalizeClinicGuideTemplates } from "../utils/clinicGuideTemplates";
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
import { StudySheetsEditor } from "./admin/editors/StudySheetsEditor";
import { ContentTab } from "./admin/tabs/ContentTab";
import { DashboardTab } from "./admin/tabs/DashboardTab";
import { StudentsTab } from "./admin/tabs/StudentsTab";
import { AnalyticsTab } from "./admin/tabs/AnalyticsTab";
import { RotationSummaryReport } from "./admin/views/RotationSummaryReport";
import { PrintableReport } from "./admin/views/PrintableReport";
import { StudentDetailView } from "./admin/views/StudentDetailView";
import { Button } from "./admin/ui/Button";
import { Icon } from "./student/Icon";
import { getAdminPinValidationError } from "./admin/pinValidation";
import { adminScopedKey, getStoredAdminRotationCode, setStoredAdminRotationCode } from "./admin/storage";
import { normalizeStudySheets, type StudySheetsData } from "../utils/studySheets";
import type { NavigateFn, WeeklyData, ArticlesData, AdminSession, AdminAuthMode } from "./admin/types";
import type { AdminSubView, AdminStudent, Announcement, SharedSettings, Patient, QuizScore, WeeklyScores, ClinicGuideRecord, CompletedItems, Bookmarks, ActivityLogEntry, ReflectionEntry } from "../types";

type PublishableSharedState = {
  curriculum: WeeklyData;
  articles: ArticlesData;
  studySheets: StudySheetsData;
  announcements: Announcement[];
  settings: SharedSettings;
  clinicGuides: ClinicGuideRecord[];
  clinicGuideTemplates: ClinicGuideTemplates;
};

function getPublicSettings(settings: SharedSettings): SharedSettings {
  const { adminPin: _adminPin, ...publicSettings } = settings;
  return publicSettings;
}

function buildPublishSnapshot({
  curriculum,
  articles,
  studySheets,
  announcements,
  settings,
  clinicGuides,
  clinicGuideTemplates,
}: PublishableSharedState): PublishableSharedState {
  return {
    curriculum,
    articles,
    studySheets: normalizeStudySheets(studySheets),
    announcements,
    settings: getPublicSettings(settings),
    clinicGuides,
    clinicGuideTemplates: normalizeClinicGuideTemplates(clinicGuideTemplates),
  };
}

function serializePublishSnapshot(snapshot: PublishableSharedState): string {
  return JSON.stringify(snapshot);
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const sec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function PublishStatusBar({
  rotationCode,
  dirty,
  publishing,
  lastPublishedAt,
  onPublish,
}: {
  rotationCode: string;
  dirty: boolean;
  publishing: boolean;
  lastPublishedAt: string | null;
  onPublish: () => void;
}) {
  const canPublish = Boolean(rotationCode) && dirty && !publishing;
  const hasRotation = Boolean(rotationCode);
  const lastShipped = lastPublishedAt ? formatRelativeTime(lastPublishedAt) : null;

  let dotColor: string;
  let statusText: string;
  let centerText: string;
  let ctaLabel: string;

  if (!hasRotation) {
    dotColor = T.muted;
    statusText = "NO ROTATION";
    centerText = "Connect a rotation to publish to students";
    ctaLabel = "No Rotation";
  } else if (publishing) {
    dotColor = T.warning;
    statusText = "PUBLISHING";
    centerText = "Sending changes to students…";
    ctaLabel = "Publishing…";
  } else if (dirty) {
    dotColor = T.brand;
    statusText = "UNPUBLISHED EDITS";
    centerText = lastShipped
      ? `Edits since last publish · last shipped ${lastShipped}`
      : "Edits since last publish";
    ctaLabel = "Publish to Students";
  } else {
    dotColor = T.success;
    statusText = "PUBLISHED";
    centerText = lastShipped
      ? `Up to date · last shipped ${lastShipped}`
      : "Up to date";
    ctaLabel = "No Changes";
  }

  return (
    <div style={{ background: T.bg, border: `1px solid ${T.brand}`, borderRadius: 0, padding: "8px 10px", marginBottom: 14, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: "1 1 auto" }}>
        <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
        <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: T.ink, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>
          {statusText}
        </span>
        <span style={{ fontSize: 13, color: T.sub, lineHeight: 1.4, minWidth: 0 }}>
          {centerText}
        </span>
      </div>
      <Button variant={canPublish ? "primary" : "default"} onClick={onPublish} disabled={!canPublish}>
        {ctaLabel}
      </Button>
    </div>
  );
}

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
    consultTopics: { ...(source?.consultTopics || {}), ...(target?.consultTopics || {}) },
  };
  if (
    Object.keys(merged.articles).length === 0 &&
    Object.keys(merged.studySheets).length === 0 &&
    Object.keys(merged.cases).length === 0 &&
    Object.keys(merged.decks || {}).length === 0 &&
    Object.keys(merged.consultTopics || {}).length === 0
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
    applyTheme(next);
  };
  return (
    <button onClick={toggle} style={{
      background: "transparent", border: `1px solid ${T.line}`, borderRadius: 0,
      padding: "5px 8px", cursor: "pointer", fontSize: 14, lineHeight: 1,
      color: T.ink, display: "flex", alignItems: "center",
    }} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
      <Icon as={theme === "dark" ? Sun : Moon} size={16} color={T.ink} />
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
  const [studySheets, setStudySheets] = useState<StudySheetsData>(() => normalizeStudySheets());
  const [curriculum, setCurriculum] = useState(WEEKLY);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [settings, setSettings] = useState<SharedSettings>({ attendingName: "", rotationStart: "", email: "", phone: "", adminPin: "" });
  const [clinicGuides, setClinicGuides] = useState<ClinicGuideRecord[]>([]);
  const [clinicGuideTemplates, setClinicGuideTemplates] = useState<ClinicGuideTemplates>(() => normalizeClinicGuideTemplates());
  const [rotationCode, setRotationCodeState] = useState("");
  const [lastPublishedSnapshotJson, setLastPublishedSnapshotJson] = useState("");
  const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(null);
  const [publishingSharedData, setPublishingSharedData] = useState(false);
  const [publishBaselineResetToken, setPublishBaselineResetToken] = useState(0);
  const publishBaselineHandledRef = useRef(0);

  const publishSnapshot = useMemo(() => buildPublishSnapshot({
    curriculum,
    articles,
    studySheets,
    announcements,
    settings,
    clinicGuides,
    clinicGuideTemplates,
  }), [curriculum, articles, studySheets, announcements, settings, clinicGuides, clinicGuideTemplates]);
  const publishSnapshotJson = useMemo(() => serializePublishSnapshot(publishSnapshot), [publishSnapshot]);
  const sharedDataDirty = Boolean(rotationCode && lastPublishedSnapshotJson && publishSnapshotJson !== lastPublishedSnapshotJson);

  const markSharedSnapshotClean = useCallback(() => {
    setPublishBaselineResetToken((token) => token + 1);
  }, []);

  const resetAdminWorkspace = useCallback(() => {
    setStudents([]);
    setArticles(ARTICLES);
    setStudySheets(normalizeStudySheets());
    setCurriculum(WEEKLY);
    setAnnouncements([]);
    setSettings({ attendingName: "", rotationStart: "", email: "", phone: "", adminPin: "" });
    setClinicGuides([]);
    setClinicGuideTemplates(normalizeClinicGuideTemplates());
    setRotationCodeState("");
    markSharedSnapshotClean();
    setTab("dashboard");
    setSubView(null);
  }, [markSharedSnapshotClean]);

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

  useEffect(() => {
    if (loading || publishBaselineResetToken === 0 || publishBaselineHandledRef.current === publishBaselineResetToken) return;
    publishBaselineHandledRef.current = publishBaselineResetToken;
    setLastPublishedSnapshotJson(publishSnapshotJson);
    setLastPublishedAt(null);
  }, [loading, publishBaselineResetToken, publishSnapshotJson]);

  const loadLocalAdminData = useCallback(async (uid: string) => {
    const settingsState = await store.get<SharedSettings>(adminScopedKey(uid, "settings"));
    const s = await store.get<AdminStudent[]>(adminScopedKey(uid, "students"));
    const a = await store.get<ArticlesData>(adminScopedKey(uid, "articles"));
    const ss = await store.get<Partial<StudySheetsData>>(adminScopedKey(uid, "studySheets"));
    const c = await store.get<WeeklyData>(adminScopedKey(uid, "curriculum"));
    const an = await store.get<Announcement[]>(adminScopedKey(uid, "announcements"));
    const cg = await store.get<ClinicGuideRecord[]>(adminScopedKey(uid, "clinicGuides"));
    const cgt = await store.get<Partial<ClinicGuideTemplates>>(adminScopedKey(uid, "clinicGuideTemplates"));
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
    if (ss) setStudySheets(normalizeStudySheets(ss));
    if (c) setCurriculum(c);
    if (an) setAnnouncements(an);
    if (cg) setClinicGuides(cg);
    if (cgt) setClinicGuideTemplates(normalizeClinicGuideTemplates(cgt));
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
    setStudySheets(normalizeStudySheets(remote.studySheets as Partial<StudySheetsData> | undefined));
    if (remote.announcements) setAnnouncements(remote.announcements);
    if (remote.settings) setSettings(prev => ({ ...prev, ...remote.settings }));
    setClinicGuides(Array.isArray(remote.clinicGuides) ? remote.clinicGuides as ClinicGuideRecord[] : []);
    setClinicGuideTemplates(normalizeClinicGuideTemplates(remote.clinicGuideTemplates as Partial<ClinicGuideTemplates> | undefined));
    markSharedSnapshotClean();
    return true;
  }, [markSharedSnapshotClean]);

  // Single connect path shared by the no-rotation picker banner and both
  // Settings flows (rotation list + code entry). Hydrates remote data first so
  // stale local defaults never overwrite the live rotation.
  const connectRotation = useCallback(async (code: string): Promise<boolean> => {
    if (!firebaseAdmin) return false;
    const normalized = code.trim().toUpperCase();
    if (!normalized) return false;
    const hydrated = await hydrateRotationData(normalized, firebaseAdmin);
    if (!hydrated) {
      showToast("Could not open that rotation. Check the code and your access.", "error");
      return false;
    }
    store.setRotationCode(normalized);
    setStoredAdminRotationCode(firebaseAdmin.uid, normalized);
    setRotationCodeState(normalized);
    showToast(`Connected to rotation ${normalized}.`, "success");
    return true;
  }, [firebaseAdmin, hydrateRotationData, showToast]);

  // No-rotation picker: when signed in without a connected rotation, list the
  // admin's rotations up front (master admin sees all) instead of making them
  // hunt for a code. Re-runs whenever the admin disconnects.
  const [availableRotations, setAvailableRotations] = useState<RotationInfo[]>([]);
  const [availableRotationsLoading, setAvailableRotationsLoading] = useState(false);
  const [pickerSelection, setPickerSelection] = useState("");
  const [pickerConnecting, setPickerConnecting] = useState(false);
  useEffect(() => {
    if (!firebaseAdmin || rotationCode) return;
    let cancelled = false;
    setAvailableRotationsLoading(true);
    void store.listRotations().then((list) => {
      if (cancelled) return;
      setAvailableRotations(list);
      setPickerSelection((prev) => (prev && list.some((r) => r.code === prev) ? prev : (list[0]?.code || "")));
      setAvailableRotationsLoading(false);
    });
    return () => { cancelled = true; };
  }, [firebaseAdmin, rotationCode]);

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
      store.set(adminScopedKey(firebaseAdmin.uid, "studySheets"), studySheets);
      store.set(adminScopedKey(firebaseAdmin.uid, "curriculum"), curriculum);
      store.set(adminScopedKey(firebaseAdmin.uid, "announcements"), announcements);
      store.set(adminScopedKey(firebaseAdmin.uid, "clinicGuides"), clinicGuides);
      store.set(adminScopedKey(firebaseAdmin.uid, "clinicGuideTemplates"), clinicGuideTemplates);
      store.set(adminScopedKey(firebaseAdmin.uid, "settings"), settings);
    }
  }, [articles, studySheets, curriculum, announcements, clinicGuides, clinicGuideTemplates, settings, loading, firebaseAdmin]);

  const publishSharedChanges = useCallback(async () => {
    if (!firebaseAdmin || !rotationCode) {
      showToast("Connect or create a rotation before publishing to students.", "error");
      return;
    }

    const snapshot = publishSnapshot;
    const serialized = serializePublishSnapshot(snapshot);
    setPublishingSharedData(true);
    try {
      await Promise.all([
        store.setShared(SHARED_KEYS.curriculum, snapshot.curriculum),
        store.setShared(SHARED_KEYS.articles, snapshot.articles),
        store.setShared(SHARED_KEYS.studySheets, snapshot.studySheets),
        store.setShared(SHARED_KEYS.announcements, snapshot.announcements),
        store.setShared(SHARED_KEYS.clinicGuides, snapshot.clinicGuides),
        store.setShared(SHARED_KEYS.clinicGuideTemplates, snapshot.clinicGuideTemplates),
        store.setShared(SHARED_KEYS.settings, snapshot.settings),
      ]);
      setLastPublishedSnapshotJson(serialized);
      setLastPublishedAt(new Date().toISOString());
      showToast("Published settings and content to students.", "success");
    } catch (error) {
      console.error("Publish shared changes failed:", error);
      showToast("Publish failed. Check your connection and try again.", "error");
    } finally {
      setPublishingSharedData(false);
    }
  }, [firebaseAdmin, publishSnapshot, rotationCode, showToast]);

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
    const validationError = getAdminPinValidationError(nextPin);
    if (validationError) {
      setPinSetupError(validationError);
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
      <div style={{ color: T.surface2, fontFamily: T.serif, fontSize: 18 }}>Loading...</div>
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
    { id: "dashboard", label: "Dashboard" },
    { id: "students", label: "Students" },
    { id: "analytics", label: "Analytics" },
    { id: "rotation", label: "Rotation" },
    { id: "settings", label: "Settings" },
  ];
  const showPublishBar = tab === "content" || tab === "settings";

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
        {!rotationCode && (
          <div style={{ background: T.warningBg, border: `1px solid ${T.warning}`, borderRadius: 12, padding: "12px 14px", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.warning, flexShrink: 0 }}>No rotation connected</div>
            {availableRotationsLoading ? (
              <div style={{ fontSize: 13, color: T.sub }}>Loading your rotations…</div>
            ) : availableRotations.length === 0 ? (
              <div style={{ fontSize: 13, color: T.sub }}>
                No rotations found yet — create one in <button onClick={() => navigate("settings")} style={{ background: "none", border: "none", color: T.brand, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 13, textDecoration: "underline" }}>Settings</button>.
              </div>
            ) : (
              <>
                <select
                  value={pickerSelection}
                  onChange={(event) => setPickerSelection(event.target.value)}
                  aria-label="Choose a rotation to connect"
                  style={{ flex: 1, minWidth: 180, padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.line}`, background: T.card, color: T.ink, fontSize: 13, fontFamily: T.mono, letterSpacing: 0.5 }}
                >
                  {availableRotations.map((rotation) => (
                    <option key={rotation.code} value={rotation.code}>
                      {rotation.code}{rotation.name ? ` — ${rotation.name}` : ""}{rotation.dates ? ` (${rotation.dates})` : ""}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => { setPickerConnecting(true); void connectRotation(pickerSelection).finally(() => setPickerConnecting(false)); }}
                  disabled={!pickerSelection || pickerConnecting}
                  style={{ padding: "8px 16px", minHeight: 36, background: T.brand, color: T.brandInk, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: pickerConnecting ? "wait" : "pointer", opacity: pickerConnecting ? 0.7 : 1 }}
                >
                  {pickerConnecting ? "Connecting…" : "Connect"}
                </button>
              </>
            )}
          </div>
        )}
        {showPublishBar && (
          <PublishStatusBar
            rotationCode={rotationCode}
            dirty={sharedDataDirty}
            publishing={publishingSharedData}
            lastPublishedAt={lastPublishedAt}
            onPublish={() => { void publishSharedChanges(); }}
          />
        )}
        {tab === "dashboard" && !subView && <DashboardTab students={students} setStudents={setStudents} navigate={navigate} rotationCode={rotationCode} settings={settings} articles={articles} writeStudentToFirestore={writeStudentToFirestore} requestConfirm={requestConfirm} showToast={showToast} />}
        {tab === "dashboard" && subView?.type === "printCohort" && <PrintableReport mode="cohort" students={students} settings={settings} articles={articles} onBack={() => navigate("dashboard")} />}
        {tab === "students" && (!subView || subView.type === "reviewDuplicates") && <StudentsTab students={students} setStudents={setStudents} navigate={navigate} rotationCode={rotationCode} settings={settings} articles={articles} duplicateReview={subView?.type === "reviewDuplicates"} deleteStudentRecord={deleteStudentRecord} writeStudentToFirestore={writeStudentToFirestore} requestConfirm={requestConfirm} showToast={showToast} />}
        {tab === "students" && subView?.type === "studentDetail" && <StudentDetailView student={students.find(s => String(s.id) === subView.id)} students={students} onBack={() => navigate("students")} setStudents={setStudents} writeStudentToFirestore={writeStudentToFirestore} recoverStudentToRecord={recoverStudentToRecord} deleteStudentRecord={deleteStudentRecord} navigate={navigate} settings={settings} articles={articles} requestConfirm={requestConfirm} showToast={showToast} />}
        {tab === "students" && subView?.type === "printStudent" && <PrintableReport mode="individual" student={students.find(s => String(s.id) === subView.id)} students={students} settings={settings} articles={articles} onBack={() => navigate("students", { type: "studentDetail", id: subView.id })} />}
        {tab === "students" && subView?.type === "exportPdf" && <RotationSummaryReport student={students.find(s => String(s.id) === subView.id)} settings={settings} articles={articles} onBack={() => navigate("students", { type: "studentDetail", id: subView.id })} />}
        {tab === "analytics" && <AnalyticsTab students={students} rotationCode={rotationCode} settings={settings} articles={articles} />}
        {tab === "content" && !subView && <ContentTab navigate={navigate} articles={articles} curriculum={curriculum} clinicGuides={clinicGuides} studySheets={studySheets} />}
        {tab === "content" && subView?.type === "editArticles" && <ArticleEditor week={subView.week} articles={articles} setArticles={setArticles} onBack={() => navigate("content")} requestConfirm={requestConfirm} />}
        {tab === "content" && subView?.type === "editCurriculum" && <CurriculumEditor curriculum={curriculum} setCurriculum={setCurriculum} onBack={() => navigate("content")} />}
        {tab === "content" && subView?.type === "editStudySheets" && <StudySheetsEditor studySheets={studySheets} setStudySheets={setStudySheets} onBack={() => navigate("content")} showToast={showToast} />}
        {tab === "content" && subView?.type === "announcements" && <AnnouncementsEditor announcements={announcements} setAnnouncements={setAnnouncements} onBack={() => navigate("content")} requestConfirm={requestConfirm} />}
        {tab === "content" && subView?.type === "clinicGuides" && <ClinicGuidesEditor clinicGuides={clinicGuides} setClinicGuides={setClinicGuides} clinicGuideTemplates={clinicGuideTemplates} setClinicGuideTemplates={setClinicGuideTemplates} onBack={() => navigate("content")} showToast={showToast} requestConfirm={requestConfirm} />}
        {tab === "rotation" && firebaseAdmin && (
          <SettingsTab
            settings={settings}
            setSettings={setSettings}
            rotationCode={rotationCode}
            setRotationCodeState={setRotationCodeState}
            curriculum={curriculum}
            articles={articles}
            studySheets={studySheets}
            announcements={announcements}
            clinicGuideTemplates={clinicGuideTemplates}
            setClinicGuideTemplates={setClinicGuideTemplates}
            setClinicGuides={setClinicGuides}
            setCurriculum={setCurriculum}
            setArticles={setArticles}
            setStudySheets={setStudySheets}
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
            onSharedDataLoaded={markSharedSnapshotClean}
            connectRotation={connectRotation}
            focusSection="rotation"
          />
        )}
        {tab === "settings" && firebaseAdmin && (
          <SettingsTab
            settings={settings}
            setSettings={setSettings}
            rotationCode={rotationCode}
            setRotationCodeState={setRotationCodeState}
            curriculum={curriculum}
            articles={articles}
            studySheets={studySheets}
            announcements={announcements}
            clinicGuideTemplates={clinicGuideTemplates}
            setClinicGuideTemplates={setClinicGuideTemplates}
            setClinicGuides={setClinicGuides}
            setCurriculum={setCurriculum}
            setArticles={setArticles}
            setStudySheets={setStudySheets}
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
            onSharedDataLoaded={markSharedSnapshotClean}
            connectRotation={connectRotation}
          />
        )}
      </AdminShell>
      <AdminToast toast={toast} onClose={() => setToast(null)} />
      <AdminConfirmDialog options={confirmOptions} onCancel={() => resolveConfirm(false)} onConfirm={() => resolveConfirm(true)} />
    </>
  );
}

export default AdminPanel;
