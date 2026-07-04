import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { T, WEEKLY, ARTICLES } from "../data/constants";
import type { ClinicGuideTemplates } from "../data/clinicGuides";
import store, { type RotationInfo } from "../utils/store";
import { createAdminInvite, getCurrentAdminUser, listAdminInvites, normalizeEmailAddress, registerInvitedAdmin, sendAdminPasswordReset, signInAdmin, signInAdminWithGoogle, signOutFirebase, type AdminInviteRecord } from "../utils/firebase";
import { ensureGoogleFonts, ensureShakeAnimation, ensureLayoutStyles, ensureThemeStyles, SHARED_KEYS } from "../utils/helpers";
import { calculatePoints } from "../utils/gamification";
import { normalizeClinicGuideTemplates } from "../utils/clinicGuideTemplates";
import { buildTeamSnapshot } from "../utils/teamSnapshots";
import { normalizeAdminStudentRecord } from "../utils/adminStudents";
import { AdminAuthScreen } from "./admin/AdminAuthScreen";
import { AdminPinGate, AdminPinSetupGate } from "./admin/AdminPinGate";
import { AdminShell } from "./admin/AdminShell";
import { AdminThemeToggle } from "./admin/AdminThemeToggle";
import { PublishStatusBar } from "./admin/PublishStatusBar";
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
import { getAdminPinValidationError } from "./admin/pinValidation";
import { adminScopedKey, getStoredAdminRotationCode, setStoredAdminRotationCode } from "./admin/storage";
import { getAdminAuthErrorMessage } from "./admin/lib/auth-errors";
import { buildPublishSnapshot, serializePublishSnapshot } from "./admin/lib/publish";
import { performStudentRecovery } from "./admin/lib/student-recovery";
import { normalizeStudySheets, type StudySheetsData } from "../utils/studySheets";
import type { WeeklyData, ArticlesData, AdminSession, AdminAuthMode } from "./admin/types";
import type { AdminSubView, AdminStudent, Announcement, SharedSettings, Patient, ClinicGuideRecord } from "../types";

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

    const merged = await performStudentRecovery(store, source, target, (m) => buildTeamSnapshot({
      studentId: target.studentId,
      name: m.name,
      patients: m.patients,
      points: calculatePoints(m as Parameters<typeof calculatePoints>[0]),
    }));

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
