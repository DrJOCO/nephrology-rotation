import React, { useState, useEffect, useCallback } from "react";
import { T, TOPICS, WEEKLY, ARTICLES, STUDY_SHEETS, FEEDBACK_TAGS } from "../data/constants";
import { PRE_QUIZ, POST_QUIZ, WEEKLY_QUIZZES } from "../data/quizzes";
import { QUICK_REFS } from "../data/guides";
import store, { RotationInfo } from "../utils/store";
import { ensureGoogleFonts, ensureShakeAnimation, ensureLayoutStyles, ensureThemeStyles, SHARED_KEYS, createRotationCode } from "../utils/helpers";
import { calculatePoints, getLevel, ACHIEVEMENTS } from "../utils/gamification";
import { HistogramChart, FunnelChart, HeatmapChart } from "./student/charts";
import { CLINIC_GUIDES, CLINIC_GUIDE_TOPICS, type ClinicGuideTopic } from "../data/clinicGuides";
import { getCurrentOrNextFriday, getClinicTopicForDate, ensureCurrentClinicGuide, overrideClinicGuide, regenerateClinicGuide } from "../utils/clinicRotation";
import type { AdminSubView, AdminStudent, Announcement, SharedSettings, SrItem, Patient, QuizScore, WeeklyScores, Gamification, FeedbackTag, ClinicGuideRecord } from "../types";

type NavigateFn = (t: string, sv?: AdminSubView) => void;
type WeeklyData = typeof WEEKLY;
type ArticlesData = typeof ARTICLES;

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
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  // Admin data
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [articles, setArticles] = useState(ARTICLES);
  const [curriculum, setCurriculum] = useState(WEEKLY);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [settings, setSettings] = useState<SharedSettings>({ attendingName: "", rotationStart: "", email: "", phone: "", adminPin: "" });
  const [clinicGuides, setClinicGuides] = useState<ClinicGuideRecord[]>([]);
  const [rotationCode, setRotationCodeState] = useState(store.getRotationCode() || "");

  // Load — when connected to a rotation, hydrate from Firestore first to avoid
  // overwriting shared state with stale local defaults
  useEffect(() => {
    ensureGoogleFonts();
    ensureShakeAnimation();
    ensureLayoutStyles();
    ensureThemeStyles();
    (async () => {
      // Always load local settings (PIN, name, etc. are local-only)
      const st = await store.get<SharedSettings>("admin_settings");
      if (st) setSettings(st);

      // If connected to a rotation, read shared data from Firestore first
      const code = store.getRotationCode();
      if (code) {
        const remote = await store.getRotationData(code);
        if (remote) {
          if (remote.curriculum) setCurriculum(remote.curriculum);
          if (remote.articles) setArticles(remote.articles);
          if (remote.announcements) setAnnouncements(remote.announcements);
          if (remote.settings) setSettings(prev => ({ ...prev, ...remote.settings }));
          if (remote.clinicGuides) setClinicGuides(remote.clinicGuides);
          setLoading(false);
          return;
        }
        // Hydrate failed — disconnect so save effect can't write stale data
        console.warn("Could not read rotation data for", code, "— disconnecting to prevent stale overwrite");
        store.setRotationCode(null);
        setRotationCodeState("");
      }

      // No rotation or hydrate failed — use localStorage (safe: no rotation connected)
      const s = await store.get<AdminStudent[]>("admin_students");
      const a = await store.get<ArticlesData>("admin_articles");
      const c = await store.get<WeeklyData>("admin_curriculum");
      const an = await store.get<Announcement[]>("admin_announcements");
      if (s) setStudents(s);
      if (a) setArticles(a);
      if (c) setCurriculum(c);
      if (an) setAnnouncements(an);
      setLoading(false);
    })();
  }, []);

  // Save local state
  useEffect(() => {
    if (!loading) {
      store.set("admin_students", students);
    }
  }, [students, loading]);

  useEffect(() => {
    if (!loading) {
      store.set("admin_articles", articles);
      store.set("admin_curriculum", curriculum);
      store.set("admin_announcements", announcements);
      store.set("admin_settings", settings);
    }
  }, [articles, curriculum, announcements, settings, loading]);

  // Save shared state (consolidated)
  useEffect(() => {
    if (!loading) {
      store.setShared(SHARED_KEYS.curriculum, curriculum);
      store.setShared(SHARED_KEYS.articles, articles);
      store.setShared(SHARED_KEYS.announcements, announcements);
      store.setShared(SHARED_KEYS.settings, settings);
    }
  }, [curriculum, articles, announcements, settings, loading]);

  // Real-time listener: students auto-appear when connected to a rotation
  useEffect(() => {
    if (!rotationCode) return;
    const unsub = store.onStudentsChanged((firestoreStudents) => {
      setStudents(firestoreStudents.map(s => ({
        id: s.studentId,
        studentId: s.studentId,
        name: s.name || "Unknown",
        loginPin: s.loginPin,
        year: s.year || "MS3/MS4",
        email: s.email || "",
        status: s.status || "active",
        addedDate: s.joinedAt || new Date().toISOString(),
        patients: s.patients || [],
        weeklyScores: s.weeklyScores || {},
        preScore: s.preScore || null,
        postScore: s.postScore || null,
        gamification: s.gamification || null,
        srQueue: s.srQueue || {},
        activityLog: s.activityLog || [],
        feedbackTags: s.feedbackTags || [],
        completedItems: s.completedItems || undefined,
        bookmarks: s.bookmarks || undefined,
        lastSyncedAt: s.updatedAt || null,
      })));
    });
    return () => unsub();
  }, [rotationCode]);

  // Write student edits back to Firestore
  const writeStudentToFirestore = useCallback((studentId: string, data: Record<string, unknown>) => {
    if (!rotationCode || !studentId) return;
    store.setStudentData(studentId, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }, [rotationCode]);

  const navigate = (t: string, sv: AdminSubView = null) => { setTab(t); setSubView(sv); };
  const activePin = (settings?.adminPin || "1234").trim();

  const handlePinSubmit = () => {
    if (pin === activePin) {
      setAuthed(true);
      setPinError(false);
    } else if (pin.length > 0) {
      setPinError(true);
      setTimeout(() => setPinError(false), 1500);
    }
  };

  const importStudentUpdates = async () => {
    const keys = await store.listShared(SHARED_KEYS.studentPrefix);
    if (!keys.length) {
      alert("No shared student updates found yet.");
      return;
    }

    const snapshots: (Partial<AdminStudent> & { studentId: string; updatedAt?: string })[] = [];
    for (const key of keys) {
      const snap = await store.getShared<Partial<AdminStudent> & { studentId?: string; updatedAt?: string }>(key);
      if (snap?.studentId) snapshots.push(snap as Partial<AdminStudent> & { studentId: string; updatedAt?: string });
    }

    if (!snapshots.length) {
      alert("No valid student snapshots were found.");
      return;
    }

    let created = 0;
    let updated = 0;

    setStudents(prev => {
      const byStudentId = new Map(prev.map(s => [s.studentId, s]));
      const result = [...prev];

      snapshots.forEach((snap, idx) => {
        const existing = byStudentId.get(snap.studentId);
        if (existing) {
          const merged: AdminStudent = {
            ...existing,
            name: snap.name || existing.name,
            patients: Array.isArray(snap.patients) ? snap.patients as Patient[] : (existing.patients || []),
            weeklyScores: (snap.weeklyScores || existing.weeklyScores || {}) as WeeklyScores,
            preScore: (snap.preScore || existing.preScore || null) as QuizScore | null,
            postScore: (snap.postScore || existing.postScore || null) as QuizScore | null,
            srQueue: (snap.srQueue || existing.srQueue || {}) as AdminStudent["srQueue"],
            activityLog: (snap.activityLog || existing.activityLog || []) as AdminStudent["activityLog"],
            lastSyncedAt: snap.updatedAt || new Date().toISOString(),
          };
          const pos = result.findIndex(s => s.id === existing.id);
          if (pos >= 0) result[pos] = merged;
          updated += 1;
          return;
        }

        result.unshift({
          id: Date.now() + idx,
          studentId: snap.studentId,
          name: snap.name || `Student ${idx + 1}`,
          year: "MS3/MS4",
          email: "",
          status: "active",
          addedDate: new Date().toISOString(),
          patients: Array.isArray(snap.patients) ? snap.patients : [],
          weeklyScores: snap.weeklyScores || {},
          preScore: snap.preScore || null,
          postScore: snap.postScore || null,
          gamification: undefined,
          srQueue: snap.srQueue || {},
          activityLog: snap.activityLog || [],
          lastSyncedAt: snap.updatedAt || new Date().toISOString(),
        } as AdminStudent);
        created += 1;
      });
      return result;
    });

    alert(`Imported ${snapshots.length} update(s): ${updated} updated, ${created} new.`);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.dark, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: T.pale, fontFamily: T.serif, fontSize: 18 }}>Loading...</div>
    </div>
  );

  // Simple PIN gate
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${T.dark} 0%, ${T.navy} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: T.sans }}>
        <div style={{ background: T.card, borderRadius: 20, padding: 36, maxWidth: 380, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>🔒</div>
          <h1 style={{ color: T.navy, fontFamily: T.serif, fontSize: 22, margin: "0 0 4px", fontWeight: 700 }}>Admin Panel</h1>
          <p style={{ color: T.sub, fontSize: 13, margin: "0 0 24px" }}>Nephrology Rotation Management</p>
          <div style={{ animation: pinError ? "shake 0.4s ease" : "none" }}>
            <input type="password" placeholder="Enter admin PIN" value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handlePinSubmit(); }}
              style={{ width: "100%", padding: "14px 16px", fontSize: 18, border: `2px solid ${pinError ? T.accent : T.pale}`, borderRadius: 10, outline: "none", boxSizing: "border-box", marginBottom: 16, fontFamily: T.mono, textAlign: "center", letterSpacing: 6 }}
            />
          </div>
          {pinError && <p style={{ color: T.accent, fontSize: 12, margin: "8px 0 0", fontWeight: 600 }}>Incorrect PIN</p>}
          <button onClick={handlePinSubmit}
            style={{ width: "100%", padding: "14px 0", background: T.med, color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            Enter
          </button>
          <p style={{ color: T.muted, fontSize: 11, marginTop: 12 }}>Set or change your PIN in Settings.</p>
          {onExit && <button onClick={onExit} style={{ marginTop: 14, background: "none", border: `1px solid ${T.line}`, color: T.sub, padding: "10px 0", width: "100%", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>← Back to Student App</button>}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "students", icon: "🎓", label: "Students" },
    { id: "analytics", icon: "📈", label: "Analytics" },
    { id: "content", icon: "📝", label: "Content" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.sans }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${T.navyBg} 0%, ${T.deepBg} 100%)`, padding: `calc(14px + env(safe-area-inset-top, 0px)) 20px 14px`, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: "white", fontFamily: T.serif, fontSize: 19, fontWeight: 700 }}>
              Admin Panel <span style={{ fontSize: 10, background: T.orange, color: "white", padding: "2px 8px", borderRadius: 6, marginLeft: 8, fontFamily: T.sans, fontWeight: 600, verticalAlign: "middle" }}>ATTENDING</span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {settings.attendingName || "Nephrology Rotation"}
              {rotationCode && <span style={{ marginLeft: 8, fontSize: 10, background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 6, fontFamily: T.mono, letterSpacing: 1 }}>Code: {rotationCode}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <AdminThemeToggle />
            {onExit && <button onClick={onExit} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 11, padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>← Student</button>}
            <button onClick={() => { setAuthed(false); }}
              style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 11, padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>
              Lock 🔒
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="tab-content-enter" key={tab + (subView ? JSON.stringify(subView) : "")} style={{ padding: `0 0 ${T.navH + T.navPad}px` }}>
        {tab === "dashboard" && !subView && <DashboardTab students={students} setStudents={setStudents} navigate={navigate} rotationCode={rotationCode} />}
        {tab === "dashboard" && subView?.type === "printCohort" && <PrintableReport mode="cohort" students={students} settings={settings} onBack={() => navigate("dashboard")} />}
        {tab === "students" && !subView && <StudentsTab students={students} setStudents={setStudents} navigate={navigate} rotationCode={rotationCode} />}
        {tab === "students" && subView?.type === "studentDetail" && <StudentDetailView student={students.find(s => String(s.id) === subView.id)} onBack={() => navigate("students")} setStudents={setStudents} writeStudentToFirestore={writeStudentToFirestore} navigate={navigate} />}
        {tab === "students" && subView?.type === "printStudent" && <PrintableReport mode="individual" student={students.find(s => String(s.id) === subView.id)} students={students} settings={settings} onBack={() => navigate("students", { type: "studentDetail", id: subView.id })} />}
        {tab === "students" && subView?.type === "exportPdf" && <RotationSummaryReport student={students.find(s => String(s.id) === subView.id)} settings={settings} onBack={() => navigate("students", { type: "studentDetail", id: subView.id })} />}
        {tab === "analytics" && <AnalyticsTab students={students} />}
        {tab === "content" && !subView && <ContentTab navigate={navigate} articles={articles} curriculum={curriculum} clinicGuides={clinicGuides} />}
        {tab === "content" && subView?.type === "editArticles" && <ArticleEditor week={subView.week} articles={articles} setArticles={setArticles} onBack={() => navigate("content")} />}
        {tab === "content" && subView?.type === "editCurriculum" && <CurriculumEditor curriculum={curriculum} setCurriculum={setCurriculum} onBack={() => navigate("content")} />}
        {tab === "content" && subView?.type === "announcements" && <AnnouncementsEditor announcements={announcements} setAnnouncements={setAnnouncements} onBack={() => navigate("content")} />}
        {tab === "content" && subView?.type === "clinicGuides" && <ClinicGuidesEditor clinicGuides={clinicGuides} setClinicGuides={setClinicGuides} onBack={() => navigate("content")} />}
        {tab === "settings" && <SettingsTab settings={settings} setSettings={setSettings} onImportStudentUpdates={importStudentUpdates} rotationCode={rotationCode} setRotationCodeState={setRotationCodeState} curriculum={curriculum} articles={articles} announcements={announcements} setCurriculum={setCurriculum} setArticles={setArticles} setAnnouncements={setAnnouncements} />}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: T.dark, borderTop: `1px solid rgba(255,255,255,0.1)`, display: "flex", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => navigate(t.id)}
              style={{ flex: 1, padding: "8px 0 10px", background: "none", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                color: active ? T.orange : T.muted,
                borderTop: active ? `2.5px solid ${T.orange}` : "2.5px solid transparent",
              }}>
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Dashboard Tab
// ═══════════════════════════════════════════════════════════════════════

function DashboardTab({ students, setStudents, navigate, rotationCode }: { students: AdminStudent[]; setStudents: React.Dispatch<React.SetStateAction<AdminStudent[]>>; navigate: NavigateFn; rotationCode: string }) {
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const activeStudents = students.filter(s => s.status === "active");
  const totalPatients = students.reduce((sum, s) => sum + (s.patients || []).length, 0);
  const avgPre = activeStudents.filter(s => s.preScore).length > 0
    ? Math.round(activeStudents.filter(s => s.preScore).reduce((sum, s) => sum + (s.preScore!.correct / s.preScore!.total) * 100, 0) / activeStudents.filter(s => s.preScore).length)
    : null;
  const avgPost = activeStudents.filter(s => s.postScore).length > 0
    ? Math.round(activeStudents.filter(s => s.postScore).reduce((sum, s) => sum + (s.postScore!.correct / s.postScore!.total) * 100, 0) / activeStudents.filter(s => s.postScore).length)
    : null;

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 20, margin: "0 0 16px", fontFamily: T.serif, fontWeight: 700 }}>Dashboard</h2>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <StatCard value={activeStudents.length} label="Active Students" color={T.med} icon="🎓" />
        <StatCard value={totalPatients} label="Total Patients Logged" color={T.green} icon="🏥" />
        <StatCard value={avgPre !== null ? avgPre + "%" : "—"} label="Avg Pre-Test" color={T.orange} icon="📋" />
        <StatCard value={avgPost !== null ? avgPost + "%" : "—"} label="Avg Post-Test" color={T.greenDk} icon="📊" />
      </div>

      {/* Pre/Post Comparison */}
      {avgPre !== null && avgPost !== null && (
        <div style={{ background: `linear-gradient(135deg, ${T.navyBg}, ${T.deepBg})`, borderRadius: 16, padding: 20, marginBottom: 20, color: "white" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(255,255,255,0.6)", marginBottom: 12 }}>Cohort Knowledge Growth</div>
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Pre-Test Avg</div>
              <div style={{ fontSize: 30, fontWeight: 700, fontFamily: T.mono }}>{avgPre}%</div>
            </div>
            <div style={{ fontSize: 28, color: T.green }}>→</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: T.green }}>Post-Test Avg</div>
              <div style={{ fontSize: 30, fontWeight: 700, fontFamily: T.mono, color: T.green }}>{avgPost}%</div>
            </div>
            <div style={{ textAlign: "center", background: "rgba(26,188,156,0.2)", borderRadius: 10, padding: "10px 16px" }}>
              <div style={{ fontSize: 10, color: T.green }}>Avg Growth</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: T.green, fontFamily: T.mono }}>+{avgPost - avgPre}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Quick Actions</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Add Student", icon: "➕", action: () => navigate("students") },
          { label: "Edit Content", icon: "📝", action: () => navigate("content") },
          { label: "Announcements", icon: "📢", action: () => navigate("content", { type: "announcements" }) },
          { label: "Export Report", icon: "🖨️", action: () => navigate("dashboard", { type: "printCohort" }) },
        ].map((a, i) => (
          <button key={i} onClick={a.action}
            style={{ background: T.card, borderRadius: 12, padding: 16, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>{a.icon}</span>
            <span style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Bulk Actions</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Export CSV", icon: "📥", desc: "Download all student data", action: () => {
            const headers = ["Name","Year","Status","Patients","Pre-Test %","Post-Test %","Growth %","W1 Best","W2 Best","W3 Best","W4 Best","Quizzes","Points","Level","SR Items","SR Mastered","Activities"];
            const rows = students.map(s => {
              const pre = s.preScore ? Math.round((s.preScore.correct / s.preScore.total) * 100) : "";
              const post = s.postScore ? Math.round((s.postScore.correct / s.postScore.total) * 100) : "";
              const ws = s.weeklyScores || {};
              const wb = (w: number) => { const a = ws[w] || []; return a.length > 0 ? Math.max(...a.map((x: QuizScore) => Math.round((x.correct / x.total) * 100))) : ""; };
              const pts = s.gamification ? s.gamification.points : calculatePoints(s as Parameters<typeof calculatePoints>[0]);
              const sr = s.srQueue || {};
              const srItems = Object.keys(sr).length;
              const srMastered = Object.values(sr).filter((i: SrItem) => i.interval > 21).length;
              return [s.name, s.year||"", s.status||"active", (s.patients||[]).length, pre, post, pre && post ? post-pre : "", wb(1), wb(2), wb(3), wb(4), Object.values(ws).flat().length, pts, getLevel(pts).name, srItems, srMastered, (s.activityLog||[]).length];
            });
            const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = `nephrology-rotation-${new Date().toISOString().slice(0,10)}.csv`; a.click();
            URL.revokeObjectURL(url);
          }},
          { label: "Mark All Completed", icon: "✅", desc: "Set all students to completed", action: () => setConfirmAction("complete") },
          { label: "Reset Options", icon: "🔄", desc: "Granular reset tools", action: () => setConfirmAction("resetOptions") },
          { label: "Archive Rotation", icon: "📦", desc: "Mark rotation as archived", action: () => setConfirmAction("archive"), disabled: !rotationCode },
        ].map((a, i) => (
          <button key={i} onClick={a.action} disabled={a.disabled}
            style={{ background: T.card, borderRadius: 12, padding: 14, border: `1px solid ${T.line}`, cursor: a.disabled ? "not-allowed" : "pointer", textAlign: "left", opacity: a.disabled ? 0.5 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              <div>
                <div style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>{a.label}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{a.desc}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Confirmation Modals */}
      {confirmAction === "complete" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: T.overlay, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.card, borderRadius: 16, maxWidth: 360, width: "100%", padding: "24px 20px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <h3 style={{ color: T.navy, fontFamily: T.serif, fontSize: 18, margin: "0 0 8px", fontWeight: 700 }}>Mark All Completed</h3>
            <p style={{ color: T.sub, fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>This will set all {students.length} students to &ldquo;completed&rdquo; status. They can still access the app.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setConfirmAction(null)} style={{ padding: "10px 20px", background: "none", border: `1px solid ${T.line}`, borderRadius: 10, color: T.sub, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={() => {
                setStudents(prev => prev.map(s => ({ ...s, status: "completed" })));
                students.forEach(s => { if (s.studentId) store.setStudentData(s.studentId, { status: "completed" }); });
                setConfirmAction(null);
              }} style={{ padding: "10px 24px", background: T.med, color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Mark All</button>
            </div>
          </div>
        </div>
      )}
      {confirmAction === "resetOptions" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: T.overlay, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.card, borderRadius: 16, maxWidth: 420, width: "100%", padding: "24px 20px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔄</div>
              <h3 style={{ color: T.navy, fontFamily: T.serif, fontSize: 18, margin: "0 0 4px", fontWeight: 700 }}>Reset Options</h3>
              <p style={{ color: T.sub, fontSize: 12, margin: 0 }}>Choose what to reset for all {students.length} students</p>
            </div>
            {[
              { key: "resetQuizzes", label: "Reset Quizzes Only", desc: "Clears pre/post tests and weekly quiz scores. Keeps patients, SR, and achievements.", icon: "📝", color: T.orange,
                action: () => {
                  const reset = { weeklyScores: {}, preScore: null, postScore: null };
                  setStudents(prev => prev.map(s => ({ ...s, ...reset })));
                  students.forEach(s => { if (s.studentId) store.setStudentData(s.studentId, reset); });
                }},
              { key: "resetSR", label: "Reset Spaced Repetition Only", desc: "Clears the SR queue. Keeps quizzes, patients, and achievements.", icon: "🔁", color: T.purple,
                action: () => {
                  const reset = { srQueue: {} };
                  setStudents(prev => prev.map(s => ({ ...s, ...reset })));
                  students.forEach(s => { if (s.studentId) store.setStudentData(s.studentId, reset); });
                }},
              { key: "resetPatients", label: "Reset Patients Only", desc: "Clears the patient log. Keeps quizzes, SR, and achievements.", icon: "🏥", color: T.med,
                action: () => {
                  const reset = { patients: [] };
                  setStudents(prev => prev.map(s => ({ ...s, ...reset })));
                  students.forEach(s => { if (s.studentId) store.setStudentData(s.studentId, reset); });
                }},
              { key: "resetAll", label: "Reset Everything", desc: "Clears ALL progress: quizzes, patients, SR, achievements, and activity.", icon: "⚠️", color: T.accent,
                action: () => {
                  const reset = { patients: [], weeklyScores: {}, preScore: null, postScore: null, gamification: { points: 0, achievements: [], streaks: { currentDays: 0, longestDays: 0, lastActiveDate: null } }, completedItems: { articles: {}, studySheets: {}, cases: {} }, srQueue: {}, activityLog: [] };
                  setStudents(prev => prev.map(s => ({ ...s, ...reset })));
                  students.forEach(s => { if (s.studentId) store.setStudentData(s.studentId, reset); });
                }},
            ].map(opt => (
              <button key={opt.key} onClick={() => {
                if (confirm(`Are you sure? This will ${opt.desc.toLowerCase()} This cannot be undone.`)) {
                  opt.action();
                  setConfirmAction(null);
                }
              }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: T.bg, border: `1px solid ${T.line}`, borderRadius: 10, cursor: "pointer", textAlign: "left", marginBottom: 8 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{opt.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>{opt.desc}</div>
                </div>
              </button>
            ))}
            <button onClick={() => setConfirmAction(null)} style={{ width: "100%", padding: "10px 0", background: "none", border: `1px solid ${T.line}`, borderRadius: 10, color: T.sub, fontSize: 13, cursor: "pointer", fontWeight: 600, marginTop: 4 }}>Cancel</button>
          </div>
        </div>
      )}
      {confirmAction === "archive" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: T.overlay, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.card, borderRadius: 16, maxWidth: 360, width: "100%", padding: "24px 20px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
            <h3 style={{ color: T.navy, fontFamily: T.serif, fontSize: 18, margin: "0 0 8px", fontWeight: 700 }}>Archive Rotation</h3>
            <p style={{ color: T.sub, fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>This marks the current rotation as archived. Student data will be preserved but the rotation will be flagged as complete.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setConfirmAction(null)} style={{ padding: "10px 20px", background: "none", border: `1px solid ${T.line}`, borderRadius: 10, color: T.sub, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={async () => {
                if (rotationCode) await store.updateRotation(rotationCode, { archived: true, archivedAt: new Date().toISOString() });
                setConfirmAction(null);
              }} style={{ padding: "10px 24px", background: T.med, color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Archive</button>
            </div>
          </div>
        </div>
      )}

      {/* Cohort Analytics */}
      {(() => {
        const weeklyBest = [1,2,3,4].map(w => {
          const scores = activeStudents.map(s => {
            const ws = (s.weeklyScores || {})[w] || [];
            return ws.length > 0 ? Math.max(...ws.map(a => Math.round((a.correct / a.total) * 100))) : null;
          }).filter(v => v !== null);
          const avg = scores.length > 0 ? Math.round(scores.reduce((s2, v) => s2 + v, 0) / scores.length) : 0;
          return { label: `W${w}`, value: avg, color: avg >= 80 ? T.green : avg >= 60 ? T.gold : avg > 0 ? T.accent : T.line };
        });
        const hasData = weeklyBest.some(w => w.value > 0);
        if (!hasData) return null;
        return (
          <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 20, border: `1px solid ${T.line}` }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, marginBottom: 10, fontFamily: T.serif }}>Cohort Weekly Performance</div>
            <MiniBarChart data={weeklyBest} />
          </div>
        );
      })()}

      {/* Student Summary */}
      {activeStudents.length > 0 && (
        <>
          <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Student Overview</h3>
          {activeStudents.map(s => {
            const prePct = s.preScore ? Math.round((s.preScore.correct / s.preScore.total) * 100) : null;
            const postPct = s.postScore ? Math.round((s.postScore.correct / s.postScore.total) * 100) : null;
            const wkScores = s.weeklyScores || {};
            const quizzesDone = Object.values(wkScores).flat().length;
            const pts = s.gamification ? s.gamification.points : calculatePoints(s as Parameters<typeof calculatePoints>[0]);
            const lvl = getLevel(pts);
            return (
              <button key={s.id} onClick={() => navigate("students", { type: "studentDetail", id: String(s.id) })}
                style={{ display: "block", width: "100%", background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>{s.name}</span>
                      {s.loginPin && <span style={{ fontSize: 10, background: T.yellowBg, color: T.orange, padding: "1px 6px", borderRadius: 6, fontWeight: 700, fontFamily: T.mono, letterSpacing: 1 }}>PIN {s.loginPin}</span>}
                      <span style={{ fontSize: 11, background: T.ice, padding: "1px 8px", borderRadius: 8, fontWeight: 600, color: T.navy }}>{lvl.icon} {pts}pts</span>
                    </div>
                    <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
                      {(s.patients || []).length} patients • {quizzesDone} quizzes • {s.year || "MS3/MS4"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {prePct !== null && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase" }}>Pre</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: T.orange, fontFamily: T.mono }}>{prePct}%</div>
                      </div>
                    )}
                    {postPct !== null && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: T.green, textTransform: "uppercase" }}>Post</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: T.green, fontFamily: T.mono }}>{postPct}%</div>
                      </div>
                    )}
                    <span style={{ color: T.muted, fontSize: 14 }}>›</span>
                  </div>
                </div>
              </button>
            );
          })}
        </>
      )}

      {/* Topic Insights for Attending */}
      {activeStudents.length > 0 && (() => {
        // Aggregate topics across all students' patients
        const topicCounts: Record<string, number> = {};
        activeStudents.forEach(s => {
          (s.patients || []).forEach(p => {
            const topics = p.topics?.length ? p.topics : p.topic ? [p.topic] : [];
            topics.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
          });
        });
        const seenTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]);
        const allTopicsExceptOther = TOPICS.filter(t => t !== "Other");
        const neverSeen = allTopicsExceptOther.filter(t => !topicCounts[t]);

        // Check PKD and APOL1 specifically
        const pkdSeen = topicCounts["Polycystic Kidney Disease"] || 0;
        const apol1Seen = topicCounts["APOL1-Associated Kidney Disease"] || 0;

        return (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Clinical Topic Insights</h3>
            <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}` }}>
              {/* Most seen topics */}
              {seenTopics.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Most Seen on Service</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {seenTopics.slice(0, 8).map(([topic, count]) => (
                      <span key={topic} style={{ background: T.ice, color: T.navy, fontSize: 11, padding: "4px 10px", borderRadius: 10, fontWeight: 500 }}>
                        {topic} <span style={{ fontWeight: 700, color: T.med, fontFamily: T.mono }}>({count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Never seen */}
              {neverSeen.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Not Yet Encountered</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {neverSeen.slice(0, 10).map(topic => (
                      <span key={topic} style={{ background: T.yellowBg, color: T.goldText, fontSize: 11, padding: "4px 10px", borderRadius: 10, fontWeight: 500 }}>
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* PKD / APOL1 status */}
              <div style={{ background: T.bg, borderRadius: 10, padding: 10, marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Key Topic Coverage</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, background: pkdSeen > 0 ? T.greenBg : T.yellowBg, borderRadius: 8, padding: "8px 10px", border: `1px solid ${pkdSeen > 0 ? T.greenAlpha : T.goldAlpha}` }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.text }}>PKD</div>
                    <div style={{ fontSize: 10, color: pkdSeen > 0 ? T.greenDk : T.muted }}>{pkdSeen > 0 ? `${pkdSeen} patient${pkdSeen !== 1 ? "s" : ""}` : "Not yet seen"}</div>
                  </div>
                  <div style={{ flex: 1, background: apol1Seen > 0 ? T.greenBg : T.yellowBg, borderRadius: 8, padding: "8px 10px", border: `1px solid ${apol1Seen > 0 ? T.greenAlpha : T.goldAlpha}` }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.text }}>APOL1</div>
                    <div style={{ fontSize: 10, color: apol1Seen > 0 ? T.greenDk : T.muted }}>{apol1Seen > 0 ? `${apol1Seen} patient${apol1Seen !== 1 ? "s" : ""}` : "Not yet seen"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Recent Activity Feed */}
      {(() => {
        const allActivity = students.flatMap(s => (s.activityLog || []).map(a => ({ ...a, studentName: s.name })));
        allActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const recent = allActivity.slice(0, 15);
        if (recent.length === 0) return null;

        const typeIcons = { quiz: "📝", assessment: "📋", case: "🏥", sr_review: "🔄" };
        const formatTime = (ts: string) => {
          const d = new Date(ts);
          const month = d.getMonth() + 1;
          const day = d.getDate();
          const h = d.getHours();
          const m = d.getMinutes();
          return `${month}/${day} ${h}:${String(m).padStart(2, "0")}`;
        };

        return (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Recent Activity</h3>
            <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.line}`, overflow: "hidden" }}>
              {recent.map((a, i) => (
                <div key={i} style={{ padding: "10px 14px", borderBottom: i < recent.length - 1 ? `1px solid ${T.line}` : "none", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{typeIcons[a.type] || "📌"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{a.studentName}</div>
                    <div style={{ fontSize: 11, color: T.sub }}>{a.label}{a.detail ? ` — ${a.detail}` : ""}</div>
                  </div>
                  <div style={{ fontSize: 10, color: T.muted, flexShrink: 0, whiteSpace: "nowrap" }}>{formatTime(a.timestamp)}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {activeStudents.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: T.sub }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎓</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>No students yet</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Go to the Students tab to add your first student</div>
        </div>
      )}
    </div>
  );
}

function StatCard({ value, label, color, icon }: { value: string | number; label: string; color: string; icon: string }) {
  return (
    <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 10, right: 12, fontSize: 24, opacity: 0.15 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: T.mono }}>{value}</div>
      <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Mini Bar Chart (SVG) ────────────────────────────────────────────
function MiniBarChart({ data, width = 280, height = 130 }: { data: { label: string; value: number; color?: string }[]; width?: number; height?: number }) {
  if (!data || !data.length) return null;
  const pad = { top: 16, right: 10, bottom: 22, left: 10 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW = Math.min(36, (w / data.length) * 0.6);
  const gap = (w - barW * data.length) / (data.length + 1);
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {data.map((d, i) => {
        const x = pad.left + gap + i * (barW + gap);
        const barH = Math.max((d.value / maxVal) * h, 2);
        return <g key={i}>
          <rect x={x} y={pad.top + h - barH} width={barW} height={barH} rx={4} fill={d.color || T.med} />
          <text x={x + barW / 2} y={pad.top + h - barH - 4} fontSize={10} fill={T.text} textAnchor="middle" fontWeight={600}>{d.value}%</text>
          <text x={x + barW / 2} y={height - 4} fontSize={9} fill={T.muted} textAnchor="middle">{d.label}</text>
        </g>;
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Analytics Tab
// ═══════════════════════════════════════════════════════════════════════

function AnalyticsTab({ students }: { students: AdminStudent[] }) {
  const active = students.filter(s => s.status === "active" || s.status === "completed");
  const withPre = active.filter(s => s.preScore);
  const withPost = active.filter(s => s.postScore);

  // Score Distribution — group pre and post scores into 5 bins
  const binLabels = ["0-20%", "21-40%", "41-60%", "61-80%", "81-100%"];
  const toBin = (pct: number) => pct <= 20 ? 0 : pct <= 40 ? 1 : pct <= 60 ? 2 : pct <= 80 ? 3 : 4;
  const preBins = [0,0,0,0,0];
  const postBins = [0,0,0,0,0];
  withPre.forEach(s => { preBins[toBin(Math.round((s.preScore!.correct / s.preScore!.total) * 100))]++; });
  withPost.forEach(s => { postBins[toBin(Math.round((s.postScore!.correct / s.postScore!.total) * 100))]++; });
  const histData = binLabels.map((label, i) => ({
    label,
    values: [
      { value: preBins[i], color: T.orange },
      { value: postBins[i], color: T.green },
    ],
  }));

  // Completion Funnel
  const withAnyWeekly = active.filter(s => Object.values(s.weeklyScores || {}).flat().length > 0);
  const withAllWeekly = active.filter(s => {
    const ws = s.weeklyScores || {};
    return [1,2,3,4].every(w => (ws[w] || []).length > 0);
  });
  const improved = active.filter(s => s.preScore && s.postScore && s.preScore.total > 0 && s.postScore.total > 0 &&
    (s.postScore.correct / s.postScore.total) > (s.preScore.correct / s.preScore.total));
  const funnelStages = [
    { label: "Enrolled", value: active.length, total: active.length, color: T.med },
    { label: "Pre-Test", value: withPre.length, total: active.length, color: T.sky },
    { label: "1+ Weekly Quiz", value: withAnyWeekly.length, total: active.length, color: T.gold },
    { label: "All 4 Weekly", value: withAllWeekly.length, total: active.length, color: T.orange },
    { label: "Post-Test", value: withPost.length, total: active.length, color: T.green },
    { label: "Improved", value: improved.length, total: active.length, color: T.greenDk },
  ];

  // Topic Mastery Heatmap — students × weeks
  const heatRows = active.slice(0, 12).map(s => s.name?.split(" ")[0] || "Student");
  const heatCols = ["W1", "W2", "W3", "W4"];
  const heatData = active.slice(0, 12).map(s => {
    return [1,2,3,4].map(w => {
      const attempts = (s.weeklyScores || {})[w] || [];
      if (!attempts.length) return null;
      return Math.max(...attempts.map(a => a.total > 0 ? Math.round((a.correct / a.total) * 100) : 0));
    });
  });

  // Engagement: count quizzes taken per student
  const engagementData = active.slice(0, 8).map(s => {
    const totalQ = Object.values(s.weeklyScores || {}).flat().length + (s.preScore ? 1 : 0) + (s.postScore ? 1 : 0);
    return { label: s.name?.split(" ")[0] || "?", value: totalQ, color: totalQ >= 6 ? T.green : totalQ >= 3 ? T.gold : T.accent };
  });

  // SR aggregate
  const srTotal = active.reduce((sum, s) => sum + Object.keys(s.srQueue || {}).length, 0);
  const srMastered = active.reduce((sum, s) => sum + Object.values(s.srQueue || {}).filter((i: SrItem) => i.interval > 21).length, 0);

  const cardStyle = { background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `1px solid ${T.line}` };
  const titleStyle = { fontSize: 14, fontWeight: 700, color: T.navy, fontFamily: T.serif, marginBottom: 4 };
  const subStyle = { fontSize: 11, color: T.sub, marginBottom: 14 };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 20, margin: "0 0 16px", fontFamily: T.serif, fontWeight: 700 }}>Analytics</h2>

      {active.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📈</div>
          <div style={{ color: T.sub, fontSize: 14 }}>No student data yet. Analytics will appear once students join and take quizzes.</div>
        </div>
      ) : (
        <>
          {/* 1. Score Distribution */}
          <div style={cardStyle}>
            <div style={titleStyle}>Quiz Score Distribution</div>
            <div style={subStyle}>Pre-test (orange) vs Post-test (green) across {active.length} students</div>
            {(withPre.length > 0 || withPost.length > 0) ? (
              <HistogramChart bins={histData} width={320} height={160} />
            ) : (
              <div style={{ color: T.muted, fontSize: 12, textAlign: "center", padding: 20 }}>No quiz scores yet</div>
            )}
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
              <span style={{ fontSize: 10, color: T.orange }}>● Pre-Test ({withPre.length})</span>
              <span style={{ fontSize: 10, color: T.green }}>● Post-Test ({withPost.length})</span>
            </div>
          </div>

          {/* 2. Completion Funnel */}
          <div style={cardStyle}>
            <div style={titleStyle}>Completion Funnel</div>
            <div style={subStyle}>Student progression through the rotation</div>
            <FunnelChart stages={funnelStages} width={320} />
          </div>

          {/* 3. Topic Mastery Heatmap */}
          {heatRows.length > 0 && heatData.some(row => row.some(v => v !== null)) && (
            <div style={cardStyle}>
              <div style={titleStyle}>Topic Mastery by Week</div>
              <div style={subStyle}>Best quiz score per week (red → yellow → green)</div>
              <div style={{ overflowX: "auto" }}>
                <HeatmapChart rows={heatRows} columns={heatCols} data={heatData} width={320} />
              </div>
            </div>
          )}

          {/* 4. Student Engagement */}
          {engagementData.length > 0 && (
            <div style={cardStyle}>
              <div style={titleStyle}>Student Engagement</div>
              <div style={subStyle}>Total quizzes completed per student</div>
              <MiniBarChart data={engagementData} width={320} height={140} />
            </div>
          )}

          {/* 5. SR Aggregate */}
          <div style={cardStyle}>
            <div style={titleStyle}>Spaced Repetition</div>
            <div style={subStyle}>Aggregate across all students</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div style={{ textAlign: "center", background: T.ice, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>{srTotal}</div>
                <div style={{ fontSize: 10, color: T.sub }}>Items in Queue</div>
              </div>
              <div style={{ textAlign: "center", background: T.greenBg, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.greenDk, fontFamily: T.mono }}>{srMastered}</div>
                <div style={{ fontSize: 10, color: T.sub }}>Mastered</div>
              </div>
              <div style={{ textAlign: "center", background: T.yellowBg, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.goldText, fontFamily: T.mono }}>{srTotal > 0 ? Math.round((srMastered / srTotal) * 100) : 0}%</div>
                <div style={{ fontSize: 10, color: T.sub }}>Mastery Rate</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Students Tab & Student Roster
// ═══════════════════════════════════════════════════════════════════════

function StudentsTab({ students, setStudents, navigate, rotationCode }: { students: AdminStudent[]; setStudents: React.Dispatch<React.SetStateAction<AdminStudent[]>>; navigate: NavigateFn; rotationCode: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", year: "MS3", startDate: "" });
  const isConnected = !!rotationCode;

  const addStudent = () => {
    if (!form.name.trim()) return;
    const s: AdminStudent = {
      ...form, id: Date.now(), studentId: String(Date.now()), status: "active", addedDate: new Date().toISOString(),
      patients: [], weeklyScores: {}, preScore: null, postScore: null, gamification: undefined, srQueue: {}, activityLog: [],
    };
    setStudents(prev => [...prev, s]);
    setForm({ name: "", email: "", year: "MS3", startDate: "" });
    setShowAdd(false);
  };

  const removeStudent = (id: number | string) => {
    if (!confirm("Remove this student? Their data will be lost.")) return;
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const toggleStatus = (id: number | string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status: s.status === "active" ? "completed" : "active" } : s));
  };

  const active = students.filter(s => s.status === "active");
  const completed = students.filter(s => s.status === "completed");

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ color: T.text, fontSize: 20, margin: 0, fontFamily: T.serif, fontWeight: 700 }}>Students</h2>
        {!isConnected && (
          <button onClick={() => setShowAdd(!showAdd)}
            style={{ padding: "8px 16px", background: showAdd ? T.sub : T.orange, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {showAdd ? "Cancel" : "+ Add Student"}
          </button>
        )}
      </div>

      {isConnected && (
        <div style={{ background: T.blueBg, borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12, color: T.navy, lineHeight: 1.5 }}>
          📡 Connected to rotation <strong>{rotationCode}</strong>. Students appear here automatically when they join with the rotation code.
        </div>
      )}

      {!isConnected && showAdd && (
        <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `2px solid ${T.orange}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={adminLabel}>Student Name *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Glen Merulus" style={adminInput} />
            </div>
            <div>
              <label style={adminLabel}>Year</label>
              <select value={form.year} onChange={e => setForm({...form, year: e.target.value})} style={adminInput}>
                <option value="MS3">MS3</option>
                <option value="MS4">MS4</option>
                <option value="PA Student">PA Student</option>
                <option value="NP Student">NP Student</option>
                <option value="Resident">Resident</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={adminLabel}>Email (optional)</label>
              <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@med.edu" style={adminInput} />
            </div>
            <div>
              <label style={adminLabel}>Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} style={adminInput} />
            </div>
          </div>
          <button onClick={addStudent} style={{ width: "100%", padding: "12px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Add Student
          </button>
        </div>
      )}

      {/* Active students */}
      {active.length === 0 && !showAdd && (
        <div style={{ textAlign: "center", padding: 40, color: T.sub }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎓</div>
          <div style={{ fontSize: 14 }}>No active students</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{isConnected ? "Students will appear when they join with the rotation code" : "Add your first student above"}</div>
        </div>
      )}

      {active.map(s => (
        <StudentRow key={s.id} student={s} navigate={navigate} onToggle={isConnected ? null : () => toggleStatus(s.id)} onRemove={isConnected ? null : () => removeStudent(s.id)} />
      ))}

      {completed.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, margin: "20px 0 10px", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Completed Rotations ({completed.length})
          </div>
          {completed.map(s => (
            <StudentRow key={s.id} student={s} navigate={navigate} onToggle={isConnected ? null : () => toggleStatus(s.id)} onRemove={isConnected ? null : () => removeStudent(s.id)} dimmed />
          ))}
        </>
      )}
    </div>
  );
}

function StudentRow({ student: s, navigate, onToggle, onRemove, dimmed }: { student: AdminStudent; navigate: (t: string, sv?: AdminSubView) => void; onToggle: (() => void) | null; onRemove: (() => void) | null; dimmed?: boolean }) {
  const prePct = s.preScore ? Math.round((s.preScore.correct / s.preScore.total) * 100) : null;
  const postPct = s.postScore ? Math.round((s.postScore.correct / s.postScore.total) * 100) : null;

  return (
    <div style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}`, opacity: dimmed ? 0.6 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <button onClick={() => navigate("students", { type: "studentDetail", id: String(s.id) })}
          style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>{s.name}</span>
            <span style={{ fontSize: 10, color: "white", background: T.med, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{s.year}</span>
            {s.loginPin && <span style={{ fontSize: 10, background: T.yellowBg, color: T.orange, padding: "2px 8px", borderRadius: 10, fontWeight: 700, fontFamily: T.mono, letterSpacing: 1 }}>PIN {s.loginPin}</span>}
          </div>
          <div style={{ fontSize: 12, color: T.sub }}>
            {(s.patients || []).length} patients • Started {(s as AdminStudent & { startDate?: string }).startDate || new Date(s.addedDate).toLocaleDateString()}
          </div>
          {/* Score bars */}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            {prePct !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, color: T.muted }}>Pre:</span>
                <div style={{ width: 60, height: 6, background: T.grayBg, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${prePct}%`, height: "100%", background: T.orange, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.orange, fontFamily: T.mono }}>{prePct}%</span>
              </div>
            )}
            {postPct !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, color: T.muted }}>Post:</span>
                <div style={{ width: 60, height: 6, background: T.grayBg, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${postPct}%`, height: "100%", background: T.green, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.green, fontFamily: T.mono }}>{postPct}%</span>
              </div>
            )}
          </div>
        </button>
        {(onToggle || onRemove) && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {onToggle && (
              <button onClick={onToggle} style={{ background: "none", border: `1px solid ${dimmed ? T.green : T.muted}`, borderRadius: 6, padding: "4px 8px", fontSize: 10, cursor: "pointer", color: dimmed ? T.green : T.sub }}>
                {dimmed ? "↩ Reactivate" : "✓ Complete"}
              </button>
            )}
            {onRemove && (
              <button onClick={onRemove} style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 6, padding: "4px 8px", fontSize: 10, cursor: "pointer", color: T.muted }}>✕</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const adminLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: T.sub, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 };
const adminInput: React.CSSProperties = { width: "100%", padding: "10px 12px", border: `1.5px solid ${T.line}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box", fontFamily: T.sans, outline: "none", background: T.card, color: T.text };

// ═══════════════════════════════════════════════════════════════════════
//  Content Management: Articles, Curriculum, Announcements
// ═══════════════════════════════════════════════════════════════════════

function ContentTab({ navigate, articles, curriculum, clinicGuides }: { navigate: NavigateFn; articles: ArticlesData; curriculum: WeeklyData; clinicGuides: ClinicGuideRecord[] }) {
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 20, margin: "0 0 16px", fontFamily: T.serif, fontWeight: 700 }}>Manage Content</h2>

      {/* Curriculum */}
      <button onClick={() => navigate("content", { type: "editCurriculum" })}
        style={{ display: "block", width: "100%", background: T.card, borderRadius: 14, padding: 18, marginBottom: 12, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📚</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Weekly Curriculum</div>
            <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>Edit week titles, subtitles, and topics</div>
          </div>
          <span style={{ color: T.muted, fontSize: 16 }}>›</span>
        </div>
      </button>

      {/* Articles by week */}
      <h3 style={{ color: T.navy, fontSize: 15, margin: "16px 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Journal Articles</h3>
      {[1,2,3,4].map(w => (
        <button key={w} onClick={() => navigate("content", { type: "editArticles", week: w })}
          style={{ display: "block", width: "100%", background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, color: T.text, fontSize: 14 }}>Week {w}: {(curriculum[w] || WEEKLY[w]).title}</div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{(articles[w] || []).length} articles</div>
            </div>
            <span style={{ color: T.muted, fontSize: 14 }}>›</span>
          </div>
        </button>
      ))}

      {/* Announcements */}
      <button onClick={() => navigate("content", { type: "announcements" })}
        style={{ display: "block", width: "100%", background: T.card, borderRadius: 14, padding: 18, marginTop: 16, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: T.yellowBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📢</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Announcements</div>
            <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>Post notes or reminders for students</div>
          </div>
          <span style={{ color: T.muted, fontSize: 16 }}>›</span>
        </div>
      </button>

      {/* Friday Clinic Guides */}
      <button onClick={() => navigate("content", { type: "clinicGuides" })}
        style={{ display: "block", width: "100%", background: T.card, borderRadius: 14, padding: 18, marginTop: 12, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: T.greenBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🩺</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Friday Clinic Guides</div>
            <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>Manage weekly outpatient clinic teaching guides ({clinicGuides.length} generated)</div>
          </div>
          <span style={{ color: T.muted, fontSize: 16 }}>›</span>
        </div>
      </button>
    </div>
  );
}

// ─── Article Editor ─────────────────────────────────────────────────
function ArticleEditor({ week, articles, setArticles, onBack }: { week: number; articles: ArticlesData; setArticles: React.Dispatch<React.SetStateAction<ArticlesData>>; onBack: () => void }) {
  const weekArticles = articles[week] || [];
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", journal: "", year: "", url: "", topic: "", type: "Review" });
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const save = () => {
    if (!form.title.trim() || !form.url.trim()) return;
    const entry = { ...form, year: parseInt(form.year) || 2024 };
    setArticles(prev => {
      const copy = { ...prev };
      const arr = [...(copy[week] || [])];
      if (editIdx !== null) { arr[editIdx] = entry; }
      else { arr.push(entry); }
      copy[week] = arr;
      return copy;
    });
    setForm({ title: "", journal: "", year: "", url: "", topic: "", type: "Review" });
    setShowAdd(false);
    setEditIdx(null);
  };

  const remove = (idx: number) => {
    setArticles(prev => {
      const copy = { ...prev };
      copy[week] = (copy[week] || []).filter((_: unknown, i: number) => i !== idx);
      return copy;
    });
  };

  const startEdit = (idx: number) => {
    const a = weekArticles[idx];
    setForm({ title: a.title, journal: a.journal, year: a.year.toString(), url: a.url, topic: a.topic, type: a.type });
    setEditIdx(idx);
    setShowAdd(true);
  };

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtn}>← Back</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: 0, fontWeight: 700 }}>Week {week} Articles</h2>
        <button onClick={() => { setShowAdd(!showAdd); setEditIdx(null); setForm({ title: "", journal: "", year: "", url: "", topic: "", type: "Review" }); }}
          style={{ padding: "8px 14px", background: showAdd ? T.sub : T.orange, color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          {showAdd ? "Cancel" : "+ Add Article"}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `2px solid ${T.orange}` }}>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Article Title *</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Full article title" style={adminInput} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={adminLabel}>Journal</label>
              <input value={form.journal} onChange={e => setForm({...form, journal: e.target.value})} placeholder="e.g. NEJM" style={adminInput} />
            </div>
            <div>
              <label style={adminLabel}>Year</label>
              <input type="number" value={form.year} onChange={e => setForm({...form, year: e.target.value})} placeholder="2024" style={adminInput} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>URL *</label>
            <input value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://..." style={adminInput} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={adminLabel}>Topic Tag</label>
              <input value={form.topic} onChange={e => setForm({...form, topic: e.target.value})} placeholder="e.g. AKI" style={adminInput} />
            </div>
            <div>
              <label style={adminLabel}>Type</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={adminInput}>
                <option value="Review">Review</option>
                <option value="Guideline">Guideline</option>
                <option value="Landmark">Landmark Study</option>
                <option value="Case Report">Case Report</option>
              </select>
            </div>
          </div>
          <button onClick={save} style={{ width: "100%", padding: "12px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {editIdx !== null ? "Update Article" : "Add Article"}
          </button>
        </div>
      )}

      {weekArticles.length === 0 && !showAdd && (
        <div style={{ textAlign: "center", padding: 30, color: T.muted }}>No articles for this week yet</div>
      )}

      {weekArticles.map((a, i) => (
        <div key={i} style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, lineHeight: 1.3, wordBreak: "break-word" }}>{a.title}</div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{a.journal} ({a.year})</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: T.med, background: T.ice, padding: "2px 8px", borderRadius: 6 }}>{a.type}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: T.muted, background: T.bg, padding: "2px 8px", borderRadius: 6 }}>{a.topic}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button onClick={() => startEdit(i)} style={tinyBtn}>✏️</button>
              <button onClick={() => remove(i)} style={tinyBtn}>🗑</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Curriculum Editor ──────────────────────────────────────────────
function CurriculumEditor({ curriculum, setCurriculum, onBack }: { curriculum: WeeklyData; setCurriculum: React.Dispatch<React.SetStateAction<WeeklyData>>; onBack: () => void }) {
  const [editWeek, setEditWeek] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", sub: "", topicsStr: "" });

  const startEdit = (w: number) => {
    const wk = curriculum[w] || WEEKLY[w];
    setForm({ title: wk.title, sub: wk.sub, topicsStr: wk.topics.join(", ") });
    setEditWeek(w);
  };

  const saveEdit = () => {
    if (!form.title.trim() || editWeek === null) return;
    setCurriculum(prev => ({
      ...prev,
      [editWeek]: { title: form.title, sub: form.sub, topics: form.topicsStr.split(",").map(t => t.trim()).filter(Boolean) }
    }));
    setEditWeek(null);
  };

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtn}>← Back</button>
      <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: "0 0 16px", fontWeight: 700 }}>Edit Curriculum</h2>

      {[1,2,3,4].map(w => {
        const wk = curriculum[w] || WEEKLY[w];
        const isEditing = editWeek === w;

        if (isEditing) {
          return (
            <div key={w} style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 12, border: `2px solid ${T.orange}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.orange, marginBottom: 10 }}>EDITING WEEK {w}</div>
              <div style={{ marginBottom: 10 }}>
                <label style={adminLabel}>Title</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={adminInput} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={adminLabel}>Subtitle</label>
                <input value={form.sub} onChange={e => setForm({...form, sub: e.target.value})} style={adminInput} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={adminLabel}>Topics (comma-separated)</label>
                <textarea value={form.topicsStr} onChange={e => setForm({...form, topicsStr: e.target.value})} rows={2} style={{...adminInput, resize: "vertical"}} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveEdit} style={{ flex: 1, padding: "10px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save</button>
                <button onClick={() => setEditWeek(null)} style={{ flex: 1, padding: "10px 0", background: T.bg, color: T.sub, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          );
        }

        return (
          <div key={w} style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Week {w}: {wk.title}</div>
                <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{wk.sub}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                  {wk.topics.map(t => (
                    <span key={t} style={{ fontSize: 10, background: T.ice, color: T.navy, padding: "2px 8px", borderRadius: 8, fontWeight: 500 }}>{t}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => startEdit(w)} style={{ ...tinyBtn, fontSize: 12 }}>✏️</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Announcements ──────────────────────────────────────────────────
function AnnouncementsEditor({ announcements, setAnnouncements, onBack }: { announcements: Announcement[]; setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>; onBack: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<{ title: string; body: string; priority: Announcement["priority"] }>({ title: "", body: "", priority: "normal" });

  const add = () => {
    if (!form.title.trim()) return;
    setAnnouncements(prev => [{ ...form, id: Date.now(), date: new Date().toISOString() }, ...prev]);
    setForm({ title: "", body: "", priority: "normal" });
    setShowAdd(false);
  };

  const remove = (id: number) => setAnnouncements(prev => prev.filter(a => a.id !== id));

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtn}>← Back</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: 0, fontWeight: 700 }}>Announcements</h2>
        <button onClick={() => setShowAdd(!showAdd)}
          style={{ padding: "8px 14px", background: showAdd ? T.sub : T.orange, color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          {showAdd ? "Cancel" : "+ New"}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `2px solid ${T.orange}` }}>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Title</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Week 2 quiz due Friday" style={adminInput} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Body</label>
            <textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})} rows={3} placeholder="Details..." style={{...adminInput, resize: "vertical"}} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={adminLabel}>Priority</label>
            <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as Announcement["priority"]})} style={adminInput}>
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <button onClick={add} style={{ width: "100%", padding: "12px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Post Announcement
          </button>
        </div>
      )}

      {announcements.length === 0 && !showAdd && (
        <div style={{ textAlign: "center", padding: 30, color: T.muted }}>No announcements yet</div>
      )}

      {announcements.map(a => {
        const prioColor = a.priority === "urgent" ? T.accent : a.priority === "important" ? T.orange : T.med;
        return (
          <div key={a.id} style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}`, borderLeft: `4px solid ${prioColor}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{a.title}</span>
                  {a.priority !== "normal" && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: prioColor, textTransform: "uppercase", background: prioColor + "15", padding: "1px 6px", borderRadius: 4 }}>{a.priority}</span>
                  )}
                </div>
                {a.body && <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.4, wordBreak: "break-word" }}>{a.body}</div>}
                <div style={{ fontSize: 10, color: T.muted, marginTop: 6 }}>{new Date(a.date).toLocaleString()}</div>
              </div>
              <button onClick={() => remove(a.id)} style={tinyBtn}>🗑</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const backBtn = { background: "none", border: "none", color: T.med, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 12, padding: 0, fontWeight: 600 };
const tinyBtn = { background: "none", border: `1px solid ${T.line}`, borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: "pointer" };

// ═══════════════════════════════════════════════════════════════════════
//  Clinic Guides Editor
// ═══════════════════════════════════════════════════════════════════════

function ClinicGuidesEditor({ clinicGuides, setClinicGuides, onBack }: { clinicGuides: ClinicGuideRecord[]; setClinicGuides: React.Dispatch<React.SetStateAction<ClinicGuideRecord[]>>; onBack: () => void }) {
  const [overrideTopic, setOverrideTopic] = useState<ClinicGuideTopic>("CKD");

  const friday = getCurrentOrNextFriday(new Date());
  const dateStr = friday.toISOString().split("T")[0];
  const fridayLabel = friday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const rotationTopic = getClinicTopicForDate(friday);
  const currentRecord = clinicGuides.find(g => g.date === dateStr);
  const activeTopic = currentRecord?.topic || rotationTopic;
  const template = CLINIC_GUIDES[activeTopic as ClinicGuideTopic];
  const sorted = [...clinicGuides].sort((a, b) => b.date.localeCompare(a.date));

  const handleEnsure = () => {
    const { guides, newGuide } = ensureCurrentClinicGuide(clinicGuides);
    if (newGuide) {
      setClinicGuides(guides);
      store.setShared(SHARED_KEYS.clinicGuides, guides);
    }
  };

  const handleRegenerate = () => {
    const updated = regenerateClinicGuide(clinicGuides, dateStr);
    setClinicGuides(updated);
    store.setShared(SHARED_KEYS.clinicGuides, updated);
  };

  const handleOverride = () => {
    const updated = overrideClinicGuide(clinicGuides, dateStr, overrideTopic);
    setClinicGuides(updated);
    store.setShared(SHARED_KEYS.clinicGuides, updated);
  };

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.med, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>{"\u2190"} Back</button>

      <h2 style={{ color: T.navy, fontSize: 20, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Friday Clinic Guides</h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px", lineHeight: 1.4 }}>
        Manage weekly outpatient nephrology clinic teaching guides. Rotation: CKD → Transplant → Hypertension.
      </p>

      {/* Current / next Friday status */}
      <div style={{ background: T.greenBg, borderRadius: 14, padding: 16, marginBottom: 16, border: `1px solid ${T.green}40` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.greenDk, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 8 }}>This Friday</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: T.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            {template?.icon || "📋"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>{activeTopic}</div>
            <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{fridayLabel}</div>
            {currentRecord?.isOverride && <span style={{ fontSize: 10, fontWeight: 700, color: T.orange, background: T.yellowBg, borderRadius: 6, padding: "2px 6px", marginTop: 4, display: "inline-block" }}>Override</span>}
          </div>
        </div>
        <div style={{ fontSize: 11, color: T.sub, marginTop: 8 }}>Rotation default: {rotationTopic}</div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {!currentRecord && (
          <button onClick={handleEnsure} style={{ padding: "8px 16px", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Generate Guide
          </button>
        )}
        {currentRecord && (
          <button onClick={handleRegenerate} style={{ padding: "8px 16px", background: T.card, color: T.med, border: `1.5px solid ${T.med}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Regenerate (Reset to Rotation)
          </button>
        )}
      </div>

      {/* Override controls */}
      <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, marginBottom: 8 }}>Override Topic</div>
        <div style={{ fontSize: 12, color: T.sub, marginBottom: 10, lineHeight: 1.4 }}>
          Change this Friday's topic without affecting the rotation sequence for future weeks.
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={overrideTopic} onChange={(e) => setOverrideTopic(e.target.value as ClinicGuideTopic)}
            style={{ flex: 1, padding: "8px 12px", border: `1.5px solid ${T.line}`, borderRadius: 8, fontSize: 14, background: T.card, color: T.text }}>
            {CLINIC_GUIDE_TOPICS.map(t => (
              <option key={t} value={t}>{CLINIC_GUIDES[t].icon} {t}</option>
            ))}
          </select>
          <button onClick={handleOverride} style={{ padding: "8px 16px", background: T.orange, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            Apply Override
          </button>
        </div>
      </div>

      {/* History */}
      <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Generated Guides ({sorted.length})</h3>
      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: 20, color: T.muted, fontSize: 13 }}>No guides generated yet.</div>
      ) : (
        sorted.map(g => {
          const t = CLINIC_GUIDES[g.topic as ClinicGuideTopic];
          return (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: T.card, borderRadius: 12, marginBottom: 8, border: `1px solid ${T.line}` }}>
              <span style={{ fontSize: 20 }}>{t?.icon || "📋"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: T.text, fontSize: 14 }}>{g.topic}</div>
                <div style={{ fontSize: 11, color: T.sub }}>{new Date(g.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div>
              </div>
              {g.isOverride && <span style={{ fontSize: 10, fontWeight: 700, color: T.orange, background: T.yellowBg, borderRadius: 6, padding: "2px 6px" }}>Override</span>}
            </div>
          );
        })
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Settings Tab
// ═══════════════════════════════════════════════════════════════════════

function SettingsTab({ settings, setSettings, onImportStudentUpdates, rotationCode, setRotationCodeState, curriculum, articles, announcements, setCurriculum, setArticles, setAnnouncements }: { settings: SharedSettings; setSettings: React.Dispatch<React.SetStateAction<SharedSettings>>; onImportStudentUpdates: () => Promise<void>; rotationCode: string; setRotationCodeState: React.Dispatch<React.SetStateAction<string>>; curriculum: WeeklyData; articles: ArticlesData; announcements: Announcement[]; setCurriculum: React.Dispatch<React.SetStateAction<WeeklyData>>; setArticles: React.Dispatch<React.SetStateAction<ArticlesData>>; setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>> }) {
  const [creating, setCreating] = useState(false);
  const [rejoinCode, setRejoinCode] = useState("");
  const [rejoinError, setRejoinError] = useState("");
  const [rejoining, setRejoining] = useState(false);
  const [rotationHistory, setRotationHistory] = useState<RotationInfo[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [newDates, setNewDates] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const update = (key: string, val: string) => setSettings(prev => ({ ...prev, [key]: val }));

  // Load rotation history on mount
  useEffect(() => {
    (async () => {
      const list = await store.listRotations();
      setRotationHistory(list);
      setHistoryLoading(false);
    })();
  }, [rotationCode]);

  const handleCreateRotation = async () => {
    setCreating(true);
    try {
      let code = createRotationCode(newLocation, newDates);
      // Check for collision — append random suffix if code already exists
      const exists = await store.validateRotationCode(code);
      if (exists) {
        const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
        code = `${code}-${suffix}`;
      }
      await store.createRotation(code, {
        name: settings.attendingName || "Nephrology Rotation",
        adminPin: settings.adminPin || "1234",
        settings,
        curriculum,
        articles,
        announcements,
        dates: newDates,
        location: newLocation,
      });
      setRotationCodeState(code);
      setNewDates("");
      setNewLocation("");
      // Refresh history
      const list = await store.listRotations();
      setRotationHistory(list);
    } catch (e) {
      alert("Failed to create rotation. Check your Firebase config and internet connection.");
      console.error("Create rotation error:", e);
    }
    setCreating(false);
  };

  const handleDeleteRotation = async (code: string) => {
    if (!confirm(`Delete rotation ${code}? All student data in this rotation will be permanently lost.`)) return;
    try {
      await store.deleteRotation(code);
      setRotationHistory(prev => prev.filter(r => r.code !== code));
      if (rotationCode === code) setRotationCodeState("");
    } catch {
      alert("Failed to delete rotation.");
    }
  };

  const handleConnectRotation = async (code: string) => {
    // Hydrate from Firestore before setting rotation code, so the save
    // effect doesn't overwrite shared state with stale local data
    const remote = await store.getRotationData(code);
    if (!remote) {
      alert("Could not read rotation data. Check your internet connection and try again.");
      return;
    }
    if (remote.curriculum) setCurriculum(remote.curriculum);
    if (remote.articles) setArticles(remote.articles);
    if (remote.announcements) setAnnouncements(remote.announcements);
    if (remote.settings) setSettings(prev => ({ ...prev, ...remote.settings }));
    store.setRotationCode(code);
    setRotationCodeState(code);
  };

  const handleUpdateRotationField = async (code: string, field: string, value: string) => {
    await store.updateRotation(code, { [field]: value });
    setRotationHistory(prev => prev.map(r => r.code === code ? { ...r, [field]: value } : r));
  };

  const handleDisconnect = () => {
    store.setRotationCode(null);
    setRotationCodeState("");
  };

  const handleRejoin = async () => {
    if (rejoinCode.length < 4) return;
    setRejoining(true);
    setRejoinError("");
    try {
      const remote = await store.getRotationData(rejoinCode);
      if (remote) {
        // Hydrate from Firestore before setting code to prevent stale overwrite
        if (remote.curriculum) setCurriculum(remote.curriculum);
        if (remote.articles) setArticles(remote.articles);
        if (remote.announcements) setAnnouncements(remote.announcements);
        if (remote.settings) setSettings(prev => ({ ...prev, ...remote.settings }));
        store.setRotationCode(rejoinCode);
        setRotationCodeState(rejoinCode);
        setRejoinCode("");
      } else {
        setRejoinError("Rotation not found. Check the code.");
      }
    } catch {
      setRejoinError("Connection error. Try again.");
    }
    setRejoining(false);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 20, margin: "0 0 16px", fontFamily: T.serif, fontWeight: 700 }}>Settings</h2>

      {/* Rotation Code */}
      <div style={{ background: `linear-gradient(135deg, ${T.navyBg}, ${T.deepBg})`, borderRadius: 16, padding: 20, marginBottom: 16, color: "white" }}>
        <h3 style={{ fontFamily: T.serif, color: "white", fontSize: 16, margin: "0 0 12px", fontWeight: 700 }}>Rotation Code</h3>
        {rotationCode ? (
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Share this code with students to join:</div>
            <div style={{ fontSize: 32, fontFamily: T.mono, fontWeight: 700, letterSpacing: 4, textAlign: "center", background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "14px 0", marginBottom: 12 }}>
              {rotationCode}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: 12 }}>Students enter this code after setting their name to sync data in real-time.</div>
            <button onClick={handleDisconnect} style={{ width: "100%", padding: "10px 0", background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
              Disconnect from Rotation
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 12, lineHeight: 1.5 }}>
              Create a rotation to sync student data in real-time via Firebase. Students will enter the generated code to join.
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600, display: "block", marginBottom: 4 }}>Rotation Dates (optional)</label>
              <input value={newDates} onChange={e => setNewDates(e.target.value)} placeholder="e.g. Mar 1–28, 2026"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "white", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600, display: "block", marginBottom: 4 }}>Location (optional)</label>
              <input value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="e.g. City Medical Center"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "white", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <button onClick={handleCreateRotation} disabled={creating}
              style={{ width: "100%", padding: "14px 0", background: T.orange, color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: creating ? "wait" : "pointer", opacity: creating ? 0.7 : 1, marginBottom: 16 }}>
              {creating ? "Creating..." : "Create New Rotation"}
            </button>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 14 }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 8, fontWeight: 600 }}>Or rejoin an existing rotation:</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={rejoinCode}
                  onChange={e => { setRejoinCode(e.target.value.toUpperCase()); setRejoinError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") handleRejoin(); }}
                  placeholder="e.g. CMC-MAR26"
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: `1px solid ${rejoinError ? T.accent : "rgba(255,255,255,0.2)"}`, background: "rgba(255,255,255,0.1)", color: "white", fontSize: 14, fontFamily: T.mono, letterSpacing: 2, textAlign: "center", outline: "none", boxSizing: "border-box" }}
                />
                <button onClick={handleRejoin} disabled={rejoining || rejoinCode.length < 4}
                  style={{ padding: "10px 18px", background: rejoinCode.length >= 4 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)", color: rejoinCode.length >= 4 ? "white" : "rgba(255,255,255,0.35)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: rejoinCode.length >= 4 ? "pointer" : "default" }}>
                  {rejoining ? "..." : "Join"}
                </button>
              </div>
              {rejoinError && <div style={{ color: T.accent, fontSize: 11, marginTop: 6 }}>{rejoinError}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Rotation History */}
      <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 16, margin: "0 0 14px", fontWeight: 700 }}>Rotation History</h3>
        {historyLoading ? (
          <div style={{ textAlign: "center", color: T.muted, fontSize: 13, padding: 16 }}>Loading rotations...</div>
        ) : rotationHistory.length === 0 ? (
          <div style={{ textAlign: "center", color: T.muted, fontSize: 13, padding: 16 }}>No rotations created yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rotationHistory.map(r => (
              <div key={r.code} style={{
                background: rotationCode === r.code ? T.ice : T.bg,
                borderRadius: 12, padding: 14,
                border: rotationCode === r.code ? `2px solid ${T.med}` : `1px solid ${T.line}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 16, color: T.navy, letterSpacing: 2 }}>{r.code}</div>
                  {rotationCode === r.code && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.green, background: "rgba(26,188,156,0.15)", padding: "3px 8px", borderRadius: 6, textTransform: "uppercase" }}>Active</span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: T.muted, minWidth: 50 }}>Dates:</span>
                    <input
                      value={r.dates || ""}
                      onChange={e => {
                        const val = e.target.value;
                        setRotationHistory(prev => prev.map(x => x.code === r.code ? { ...x, dates: val } : x));
                      }}
                      onBlur={e => handleUpdateRotationField(r.code, "dates", e.target.value)}
                      placeholder="e.g. Mar 1–28, 2026"
                      style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.line}`, fontSize: 12, color: T.text, background: T.card, outline: "none" }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: T.muted, minWidth: 50 }}>Location:</span>
                    <input
                      value={r.location || ""}
                      onChange={e => {
                        const val = e.target.value;
                        setRotationHistory(prev => prev.map(x => x.code === r.code ? { ...x, location: val } : x));
                      }}
                      onBlur={e => handleUpdateRotationField(r.code, "location", e.target.value)}
                      placeholder="e.g. City Medical Center"
                      style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.line}`, fontSize: 12, color: T.text, background: T.card, outline: "none" }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: T.muted, marginBottom: 10 }}>
                  <span>👥 {r.studentCount} student{r.studentCount !== 1 ? "s" : ""}</span>
                  {r.createdAt && <span>• Created {new Date(r.createdAt).toLocaleDateString()}</span>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {rotationCode !== r.code && (
                    <button onClick={() => handleConnectRotation(r.code)}
                      style={{ flex: 1, padding: "8px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Connect
                    </button>
                  )}
                  <button onClick={() => handleDeleteRotation(r.code)}
                    style={{ flex: rotationCode === r.code ? 1 : 0, minWidth: rotationCode === r.code ? 0 : 80, padding: "8px 12px", background: T.redBg, color: T.accent, border: `1px solid ${T.accent}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attending Info */}
      <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 16, margin: "0 0 14px", fontWeight: 700 }}>Attending Information</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={adminLabel}>Your Name</label>
          <input value={settings.attendingName || ""} onChange={e => update("attendingName", e.target.value)} placeholder="Dr. Smith" style={adminInput} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={adminLabel}>Email</label>
            <input value={settings.email || ""} onChange={e => update("email", e.target.value)} placeholder="you@hospital.edu" style={adminInput} />
          </div>
          <div>
            <label style={adminLabel}>Phone</label>
            <input value={settings.phone || ""} onChange={e => update("phone", e.target.value)} placeholder="(555) 123-4567" style={adminInput} />
          </div>
        </div>
      </div>

      {/* Security */}
      <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 16, margin: "0 0 14px", fontWeight: 700 }}>Security</h3>
        <div>
          <label style={adminLabel}>Admin PIN</label>
          <input type="password" value={settings.adminPin || ""} onChange={e => update("adminPin", e.target.value)}
            placeholder="Leave blank to keep fallback PIN" style={adminInput} />
          <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
            Choose a private PIN and avoid sharing it with students.
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div style={{ background: T.ice, borderRadius: 14, padding: 18, marginBottom: 16, borderLeft: `4px solid ${T.med}` }}>
        <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 15, margin: "0 0 10px", fontWeight: 700 }}>How to Use This Admin Panel</h3>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.7 }}>
          <div style={{ marginBottom: 8 }}><strong style={{ color: T.navy }}>Dashboard:</strong> At-a-glance view of all students, cohort pre/post quiz averages, and quick actions.</div>
          <div style={{ marginBottom: 8 }}><strong style={{ color: T.navy }}>Students:</strong> Add students to your roster. For each student you can manually enter their pre-test score, post-test score, weekly quiz results, and patient logs. Tap any student to see their full progress report.</div>
          <div style={{ marginBottom: 8 }}><strong style={{ color: T.navy }}>Content:</strong> Edit the weekly curriculum titles and topics. Add, edit, or remove journal articles for each week. Post announcements.</div>
          <div><strong style={{ color: T.navy }}>Tip:</strong> Students use the student-facing app (separate artifact) to take quizzes and log patients. You can enter their scores here to track progress centrally, or review their app directly.</div>
        </div>
      </div>

      {/* Data Management */}
      <div style={{ background: T.card, borderRadius: 14, padding: 18, border: `1px solid ${T.line}` }}>
        <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 16, margin: "0 0 14px", fontWeight: 700 }}>Data</h3>
        <button onClick={onImportStudentUpdates}
          style={{ width: "100%", padding: "12px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>
          Import Shared Student Updates
        </button>
        <button onClick={() => {
          const data = { settings, timestamp: new Date().toISOString() };
          const blob = JSON.stringify(data, null, 2);
          const el = document.createElement("textarea");
          el.value = blob;
          document.body.appendChild(el);
          el.select();
          try { document.execCommand("copy"); } catch (e) { console.warn("Copy failed:", e); }
          document.body.removeChild(el);
          alert("Settings copied to clipboard");
        }} style={{ width: "100%", padding: "12px 0", background: T.bg, color: T.text, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>
          Export Settings to Clipboard
        </button>
        <div style={{ fontSize: 11, color: T.muted, textAlign: "center" }}>
          All data is saved automatically via persistent storage
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Student Detail View (with score entry & patient logging)
// ═══════════════════════════════════════════════════════════════════════

function StudentDetailView({ student: s, onBack, setStudents, writeStudentToFirestore, navigate }: { student: AdminStudent | undefined; onBack: () => void; setStudents: React.Dispatch<React.SetStateAction<AdminStudent[]>>; writeStudentToFirestore: (studentId: string, data: Record<string, unknown>) => void; navigate: NavigateFn }) {
  const [showScoreEntry, setShowScoreEntry] = useState(false);
  const [scoreType, setScoreType] = useState("pre"); // pre, post, weekly
  const [scoreWeek, setScoreWeek] = useState(1);
  const [scoreForm, setScoreForm] = useState({ correct: "", total: "" });
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [patForm, setPatForm] = useState({ initials: "", room: "", dx: "", topics: [] as string[], notes: "" });
  const [showAddFeedback, setShowAddFeedback] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState("");
  const togglePatTopic = (t: string) => setPatForm(prev => ({ ...prev, topics: prev.topics.includes(t) ? prev.topics.filter((x: string) => x !== t) : [...prev.topics, t] }));
  if (!s) return <div style={{ padding: 16 }}>Student not found.</div>;

  const prePct = s.preScore ? Math.round((s.preScore.correct / s.preScore.total) * 100) : null;
  const postPct = s.postScore ? Math.round((s.postScore.correct / s.postScore.total) * 100) : null;
  const wkScores = s.weeklyScores || {};
  const patients = s.patients || [];

  const updateStudent = (updates: Partial<AdminStudent>) => {
    setStudents(prev => prev.map(st => st.id === s.id ? { ...st, ...updates } : st));
    // Write back to Firestore so student sees admin edits
    if (writeStudentToFirestore && s.studentId) {
      const merged = { ...s, ...updates };
      writeStudentToFirestore(s.studentId, {
        name: merged.name,
        patients: merged.patients,
        weeklyScores: merged.weeklyScores,
        preScore: merged.preScore,
        postScore: merged.postScore,
        srQueue: merged.srQueue || {},
        status: merged.status,
        feedbackTags: merged.feedbackTags || [],
      });
    }
  };

  const saveScore = () => {
    const correct = parseInt(scoreForm.correct);
    const total = parseInt(scoreForm.total);
    if (isNaN(correct) || isNaN(total) || total === 0) return;
    const entry: QuizScore = { correct, total, date: new Date().toISOString(), answers: [] };

    if (scoreType === "pre") {
      updateStudent({ preScore: entry });
    } else if (scoreType === "post") {
      updateStudent({ postScore: entry });
    } else {
      const newWeekly = { ...wkScores };
      newWeekly[scoreWeek] = [...(newWeekly[scoreWeek] || []), entry];
      updateStudent({ weeklyScores: newWeekly });
    }
    setShowScoreEntry(false);
    setScoreForm({ correct: "", total: "" });
  };

  const addPatient = () => {
    if (!patForm.initials.trim() || patForm.topics.length === 0) return;
    const p = { ...patForm, id: crypto.randomUUID(), date: new Date().toISOString(), status: "active" as const, followUps: [] } as unknown as Patient;
    updateStudent({ patients: [...patients, p] });
    setPatForm({ initials: "", room: "", dx: "", topics: [], notes: "" });
    setShowAddPatient(false);
  };

  const topicCounts: Record<string, number> = {};
  patients.forEach(p => {
    const ts = p.topics || (p.topic ? [p.topic] : []);
    ts.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
  });

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtn}>← Back</button>

      {/* Header */}
      <div style={{ background: T.card, borderRadius: 16, padding: 20, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 22, margin: "0 0 4px", fontWeight: 700 }}>{s.name}</h2>
            <div style={{ fontSize: 13, color: T.sub }}>{s.year} • {s.email || "No email"}</div>
            {s.loginPin && (
              <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, background: T.yellowBg, padding: "4px 10px", borderRadius: 8 }}>
                <span style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>Login PIN:</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.orange, fontFamily: T.mono, letterSpacing: 2 }}>{s.loginPin}</span>
              </div>
            )}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: s.status === "active" ? T.green : T.muted, background: s.status === "active" ? "rgba(26,188,156,0.1)" : T.bg, padding: "4px 10px", borderRadius: 8, textTransform: "uppercase" }}>
            {s.status}
          </div>
        </div>
        {/* Gamification Summary */}
        {(() => {
          const gam = s.gamification;
          const pts = gam ? gam.points : calculatePoints(s as Parameters<typeof calculatePoints>[0]);
          const level = getLevel(pts);
          const earnedCount = gam?.achievements?.length || 0;
          return (
            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ background: T.ice, borderRadius: 10, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 18 }}>{level.icon}</span>
                <span style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{level.name}</span>
              </div>
              <div style={{ background: T.yellowBg, borderRadius: 10, padding: "6px 14px" }}>
                <span style={{ fontWeight: 700, color: T.orange, fontSize: 14, fontFamily: T.mono }}>{pts}</span>
                <span style={{ fontSize: 11, color: T.sub, marginLeft: 4 }}>pts</span>
              </div>
              <div style={{ background: "rgba(26,188,156,0.1)", borderRadius: 10, padding: "6px 14px" }}>
                <span style={{ fontWeight: 700, color: T.green, fontSize: 14 }}>{earnedCount}</span>
                <span style={{ fontSize: 11, color: T.sub, marginLeft: 4 }}>/{ACHIEVEMENTS.length} badges</span>
              </div>
              {gam && gam.streaks && gam.streaks.currentDays > 0 && (
                <div style={{ background: T.redBg, borderRadius: 10, padding: "6px 14px" }}>
                  <span style={{ fontSize: 14 }}>🔥</span>
                  <span style={{ fontWeight: 700, color: T.accent, fontSize: 14, marginLeft: 4 }}>{gam.streaks.currentDays}d</span>
                </div>
              )}
            </div>
          );
        })()}

        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <button onClick={() => { setShowScoreEntry(true); setScoreType("pre"); setScoreForm({ correct: "", total: "25" }); }}
            style={{ fontSize: 11, color: T.orange, background: T.yellowBg, border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            + Enter Score
          </button>
          <button onClick={() => setShowAddPatient(!showAddPatient)}
            style={{ fontSize: 11, color: T.green, background: "rgba(26,188,156,0.1)", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            + Log Patient
          </button>
          <button onClick={() => navigate("students", { type: "printStudent", id: String(s.id) })}
            style={{ fontSize: 11, color: T.med, background: T.blueBg, border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            Print Report
          </button>
          <button onClick={() => navigate("students", { type: "exportPdf", id: String(s.id) })}
            style={{ fontSize: 11, color: T.purpleAccent, background: T.purpleBg, border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            Export PDF
          </button>
        </div>
      </div>

      {/* Feedback Tags */}
      <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, fontFamily: T.serif }}>Attending Feedback</div>
          <button onClick={() => setShowAddFeedback(!showAddFeedback)}
            style={{ fontSize: 11, color: T.purpleAccent, background: T.purpleBg, border: "none", padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            {showAddFeedback ? "Cancel" : "+ Add"}
          </button>
        </div>
        {(s.feedbackTags || []).length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: showAddFeedback ? 12 : 0 }}>
            {(s.feedbackTags || []).map((ft, i) => (
              <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: T.purpleBg, padding: "4px 10px", borderRadius: 8, border: `1px solid ${T.purpleSoft}` }}>
                <span style={{ fontSize: 11, color: T.purpleAccent, fontWeight: 600 }}>{ft.tag}</span>
                {ft.note && <span style={{ fontSize: 10, color: T.muted }}>— {ft.note}</span>}
                <span style={{ fontSize: 9, color: T.muted }}>{new Date(ft.date).toLocaleDateString()}</span>
                <button onClick={() => {
                  const updated = (s.feedbackTags || []).filter((_, idx) => idx !== i);
                  updateStudent({ feedbackTags: updated });
                }} style={{ background: "none", border: "none", color: T.muted, fontSize: 12, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>x</button>
              </div>
            ))}
          </div>
        ) : !showAddFeedback && (
          <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>No feedback yet</div>
        )}
        {showAddFeedback && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Quick Tags</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {FEEDBACK_TAGS.map(tag => (
                <button key={tag} onClick={() => {
                  const newTag: FeedbackTag = { tag, date: new Date().toISOString(), note: feedbackNote.trim() || undefined };
                  updateStudent({ feedbackTags: [...(s.feedbackTags || []), newTag] });
                  setFeedbackNote("");
                  setShowAddFeedback(false);
                }}
                  style={{ padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: "pointer", background: T.card, color: T.text, border: `1px solid ${T.line}` }}>
                  {tag}
                </button>
              ))}
            </div>
            <input value={feedbackNote} onChange={e => setFeedbackNote(e.target.value)} placeholder="Optional note (e.g. specific topic)"
              style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: `1px solid ${T.line}`, borderRadius: 8, outline: "none", fontFamily: T.sans, boxSizing: "border-box", marginBottom: 8 }} />
            <input
              placeholder="Or type a custom tag and press Enter"
              onKeyDown={e => {
                if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                  const newTag: FeedbackTag = { tag: (e.target as HTMLInputElement).value.trim(), date: new Date().toISOString(), note: feedbackNote.trim() || undefined };
                  updateStudent({ feedbackTags: [...(s.feedbackTags || []), newTag] });
                  (e.target as HTMLInputElement).value = "";
                  setFeedbackNote("");
                  setShowAddFeedback(false);
                }
              }}
              style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: `1px solid ${T.line}`, borderRadius: 8, outline: "none", fontFamily: T.sans, boxSizing: "border-box" }} />
          </div>
        )}
      </div>

      {/* Score Entry */}
      {showScoreEntry && (
        <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 16, border: `2px solid ${T.orange}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.orange, marginBottom: 10 }}>ENTER SCORE</div>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Quiz Type</label>
            <div style={{ display: "flex", gap: 6 }}>
              {["pre", "post", "weekly"].map(t => (
                <button key={t} onClick={() => { setScoreType(t); setScoreForm({ correct: "", total: t === "weekly" ? "10" : "25" }); }}
                  style={{ flex: 1, padding: "8px 0", background: scoreType === t ? T.navy : T.bg, color: scoreType === t ? "white" : T.sub,
                    border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
                  {t === "weekly" ? "Weekly" : t + "-Test"}
                </button>
              ))}
            </div>
          </div>
          {scoreType === "weekly" && (
            <div style={{ marginBottom: 10 }}>
              <label style={adminLabel}>Week #</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[1,2,3,4].map(w => (
                  <button key={w} onClick={() => setScoreWeek(w)}
                    style={{ flex: 1, padding: "8px 0", background: scoreWeek === w ? T.med : T.bg, color: scoreWeek === w ? "white" : T.sub,
                      border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Wk {w}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={adminLabel}>Correct</label>
              <input type="number" value={scoreForm.correct} onChange={e => setScoreForm({...scoreForm, correct: e.target.value})} placeholder="e.g. 18" style={{...adminInput, fontFamily: T.mono}} />
            </div>
            <div>
              <label style={adminLabel}>Total Questions</label>
              <input type="number" value={scoreForm.total} onChange={e => setScoreForm({...scoreForm, total: e.target.value})} placeholder="e.g. 25" style={{...adminInput, fontFamily: T.mono}} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveScore} style={{ flex: 1, padding: "10px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save Score</button>
            <button onClick={() => setShowScoreEntry(false)} style={{ flex: 1, padding: "10px 0", background: T.bg, color: T.sub, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Patient Entry */}
      {showAddPatient && (
        <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 16, border: `2px solid ${T.green}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.green, marginBottom: 10 }}>LOG PATIENT</div>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Initials</label>
            <input value={patForm.initials} onChange={e => setPatForm({...patForm, initials: e.target.value})} placeholder="J.S." style={adminInput} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Topics (select all that apply)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {["AKI","CKD","Hyponatremia","Hyperkalemia","Acid-Base","Glomerulonephritis","Nephrotic Syndrome","Dialysis","Transplant","Hypertension","Kidney Stones","Diuretics","Other"].map(t => {
                const sel = patForm.topics.includes(t);
                return (
                  <button key={t} type="button" onClick={() => togglePatTopic(t)}
                    style={{ padding: "5px 10px", borderRadius: 16, fontSize: 11, fontWeight: sel ? 600 : 400, cursor: "pointer", transition: "all 0.15s",
                      background: sel ? T.orange : T.card, color: sel ? "white" : T.sub,
                      border: sel ? `1.5px solid ${T.orange}` : `1.5px solid ${T.line}` }}>
                    {sel ? "✓ " : ""}{t}
                  </button>
                );
              })}
            </div>
            {patForm.topics.length === 0 && <div style={{ fontSize: 11, color: T.orange, marginTop: 4 }}>Select at least one</div>}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Diagnosis</label>
            <input value={patForm.dx} onChange={e => setPatForm({...patForm, dx: e.target.value})} placeholder="e.g. AKI from sepsis" style={adminInput} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addPatient} style={{ flex: 1, padding: "10px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add Patient</button>
            <button onClick={() => setShowAddPatient(false)} style={{ flex: 1, padding: "10px 0", background: T.bg, color: T.sub, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Score cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}`, textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>Pre-Test</div>
          {prePct !== null ? <div style={{ fontSize: 30, fontWeight: 700, color: T.orange, fontFamily: T.mono }}>{prePct}%</div> : <div style={{ fontSize: 14, color: T.muted }}>—</div>}
        </div>
        <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}`, textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.green, textTransform: "uppercase" }}>Post-Test</div>
          {postPct !== null ? <div style={{ fontSize: 30, fontWeight: 700, color: T.green, fontFamily: T.mono }}>{postPct}%</div> : <div style={{ fontSize: 14, color: T.muted }}>—</div>}
        </div>
      </div>

      {prePct !== null && postPct !== null && (
        <div style={{ background: T.ice, borderRadius: 12, padding: 14, marginBottom: 16, textAlign: "center", borderLeft: `4px solid ${T.green}` }}>
          <span style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>Growth: </span>
          <span style={{ fontSize: 20, fontWeight: 700, color: T.green, fontFamily: T.mono }}>+{postPct - prePct}%</span>
        </div>
      )}

      {/* Weekly Scores */}
      <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Weekly Quizzes</h3>
      {[1,2,3,4].map(w => {
        const ws = wkScores[w] || [];
        const best = ws.length > 0 ? Math.max(...ws.map(x => Math.round((x.correct/x.total)*100))) : null;
        return (
          <div key={w} style={{ background: T.card, borderRadius: 10, padding: 12, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${T.line}` }}>
            <div>
              <div style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>Week {w}</div>
              <div style={{ fontSize: 11, color: T.muted }}>{ws.length} attempt{ws.length !== 1 ? "s" : ""}</div>
            </div>
            {best !== null ? (
              <div style={{ fontSize: 18, fontWeight: 700, color: best >= 80 ? T.green : best >= 60 ? T.gold : T.accent, fontFamily: T.mono }}>{best}%</div>
            ) : <div style={{ fontSize: 12, color: T.muted }}>—</div>}
          </div>
        );
      })}

      {/* Patients */}
      <h3 style={{ color: T.navy, fontSize: 15, margin: "16px 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Patient Log ({patients.length})</h3>
      {patients.length === 0 ? (
        <div style={{ background: T.card, borderRadius: 10, padding: 20, textAlign: "center", color: T.muted, border: `1px solid ${T.line}` }}>No patients logged</div>
      ) : (
        <div style={{ background: T.card, borderRadius: 12, padding: 14, border: `1px solid ${T.line}` }}>
          {patients.map((p, i) => {
            const ts = p.topics || (p.topic ? [p.topic] : []);
            return (
            <div key={i} style={{ padding: "8px 0", borderBottom: i < patients.length - 1 ? `1px solid ${T.line}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600, color: T.navy, fontSize: 13 }}>{p.initials}</span>
                {ts.map(t => <span key={t} style={{ fontSize: 10, color: "white", background: T.med, padding: "1px 6px", borderRadius: 6, fontWeight: 600 }}>{t}</span>)}
                <span style={{ fontSize: 10, color: T.muted, marginLeft: "auto" }}>{new Date(p.date).toLocaleDateString()}</span>
              </div>
              {p.dx && <div style={{ fontSize: 12, color: T.sub, marginTop: 2, wordBreak: "break-word" }}>{p.dx}</div>}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Rotation-End Summary (Enhanced PDF Export)
// ═══════════════════════════════════════════════════════════════════════

function RotationSummaryReport({ student: s, settings, onBack }: { student?: AdminStudent; settings: SharedSettings & { hospitalName?: string }; onBack: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!s) return <div style={{ padding: 16 }}>Student not found.</div>;

  const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const rotationName = settings?.attendingName || "Nephrology Rotation";
  const pct = (score: QuizScore | null) => score && score.total > 0 ? Math.round((score.correct / score.total) * 100) : null;
  const pre = pct(s.preScore);
  const post = pct(s.postScore);
  const growth = pre !== null && post !== null ? post - pre : null;
  const wkScores = s.weeklyScores || {};
  const patients = s.patients || [];
  const pts = s.gamification ? s.gamification.points : calculatePoints(s as Parameters<typeof calculatePoints>[0]);
  const lvl = getLevel(pts);
  const earned = s.gamification?.achievements || [];
  const earnedBadges = ACHIEVEMENTS.filter(a => earned.includes(a.id));
  const completed = s.completedItems || { articles: {}, studySheets: {}, cases: {} };

  // Topic distribution
  const topicCounts: Record<string, number> = {};
  patients.forEach(p => {
    const ts = p.topics || (p.topic ? [p.topic] : []);
    ts.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
  });

  // Completed items per week
  const weeklyCompletion = [1, 2, 3, 4].map(w => {
    const arts = (ARTICLES[w] || []).length;
    const artsDone = (ARTICLES[w] || []).filter(a => completed.articles[a.url]).length;
    const sheets = (STUDY_SHEETS[w] || []).length;
    const sheetsDone = (STUDY_SHEETS[w] || []).filter(sh => completed.studySheets[sh.id]).length;
    return { week: w, articles: { done: artsDone, total: arts }, sheets: { done: sheetsDone, total: sheets } };
  });

  // SR stats
  const srQueue = s.srQueue || {};
  const srTotal = Object.keys(srQueue).length;
  const srMastered = Object.values(srQueue).filter(i => i.interval > 21).length;

  const hdr: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: "#0F2B3C", marginBottom: 8, fontFamily: "'Crimson Pro', Georgia, serif" };
  const tblTh: React.CSSProperties = { padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#5D6D7E", textTransform: "uppercase", letterSpacing: 0.3 };
  const tblTd: React.CSSProperties = { padding: "8px 10px" };

  return (
    <div>
      <button onClick={onBack} style={{ ...backBtn, marginBottom: 12 }}>← Back to Student</button>
      <div className="printable-report" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", color: "#2C3E50", lineHeight: 1.5, padding: 20, background: "white" }}>
        {/* Header */}
        <div style={{ borderBottom: "2px solid #0F2B3C", paddingBottom: 12, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#0F2B3C", fontFamily: "'Crimson Pro', Georgia, serif" }}>Rotation Summary Report</div>
              <div style={{ fontSize: 13, color: "#5D6D7E", marginTop: 2 }}>{rotationName}{settings?.dates ? ` — ${settings.dates}` : ""}</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11, color: "#5D6D7E" }}>
              <div>Generated {reportDate}</div>
              <div style={{ marginTop: 2, fontSize: 10, color: "#ABB2B9" }}>&copy; Jonathan Cheng, MD MPH</div>
            </div>
          </div>
        </div>

        {/* Student Info */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0F2B3C", fontFamily: "'Crimson Pro', Georgia, serif" }}>{s.name}</div>
          <div style={{ fontSize: 13, color: "#5D6D7E" }}>{s.year || "MS3/MS4"} {s.email ? `• ${s.email}` : ""} • {lvl.icon} {lvl.name} ({pts} pts)</div>
        </div>

        {/* Score Summary */}
        <div className="print-no-break" style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1, textAlign: "center", padding: 14, border: "1px solid #D5DBDB", borderRadius: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#ABB2B9", textTransform: "uppercase" }}>Pre-Test</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#E67E22", fontFamily: "'JetBrains Mono', monospace" }}>{pre !== null ? pre + "%" : "—"}</div>
          </div>
          <div style={{ flex: 1, textAlign: "center", padding: 14, border: "1px solid #D5DBDB", borderRadius: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#1ABC9C", textTransform: "uppercase" }}>Post-Test</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1ABC9C", fontFamily: "'JetBrains Mono', monospace" }}>{post !== null ? post + "%" : "—"}</div>
          </div>
          {growth !== null && (
            <div style={{ flex: 1, textAlign: "center", padding: 14, border: "1px solid #D5DBDB", borderRadius: 8, background: "#E8F8F5" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#1ABC9C", textTransform: "uppercase" }}>Growth</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#1ABC9C", fontFamily: "'JetBrains Mono', monospace" }}>+{growth}%</div>
            </div>
          )}
        </div>

        {/* Weekly Quiz Breakdown */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={hdr}>Weekly Quiz Scores</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ borderBottom: "2px solid #0F2B3C" }}>
              <th style={tblTh}>Week</th>
              <th style={{ ...tblTh, textAlign: "center" }}>Attempts</th>
              <th style={{ ...tblTh, textAlign: "center" }}>Best Score</th>
              <th style={{ ...tblTh, textAlign: "center" }}>Last Score</th>
            </tr></thead>
            <tbody>{[1, 2, 3, 4].map(w => {
              const ws = wkScores[w] || [];
              const best = ws.length > 0 ? Math.max(...ws.map(x => Math.round((x.correct / x.total) * 100))) : null;
              const last = ws.length > 0 ? Math.round((ws[ws.length - 1].correct / ws[ws.length - 1].total) * 100) : null;
              return (
                <tr key={w} style={{ borderBottom: "1px solid #D5DBDB" }}>
                  <td style={tblTd}>Week {w}</td>
                  <td style={{ ...tblTd, textAlign: "center" }}>{ws.length}</td>
                  <td style={{ ...tblTd, textAlign: "center", fontWeight: 600, color: best !== null && best >= 80 ? "#1ABC9C" : best !== null ? "#E67E22" : "#ABB2B9" }}>{best !== null ? best + "%" : "—"}</td>
                  <td style={{ ...tblTd, textAlign: "center" }}>{last !== null ? last + "%" : "—"}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>

        {/* Curriculum Completion */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={hdr}>Curriculum Completion</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ borderBottom: "2px solid #0F2B3C" }}>
              <th style={tblTh}>Week</th>
              <th style={{ ...tblTh, textAlign: "center" }}>Articles</th>
              <th style={{ ...tblTh, textAlign: "center" }}>Study Sheets</th>
              <th style={{ ...tblTh, textAlign: "center" }}>Quiz Taken</th>
            </tr></thead>
            <tbody>{weeklyCompletion.map(wc => (
              <tr key={wc.week} style={{ borderBottom: "1px solid #D5DBDB" }}>
                <td style={tblTd}>Week {wc.week}</td>
                <td style={{ ...tblTd, textAlign: "center" }}>{wc.articles.done}/{wc.articles.total}</td>
                <td style={{ ...tblTd, textAlign: "center" }}>{wc.sheets.done}/{wc.sheets.total}</td>
                <td style={{ ...tblTd, textAlign: "center" }}>{(wkScores[wc.week] || []).length > 0 ? "Yes" : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        {/* Patient Log */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={hdr}>Patient Log ({patients.length} patient{patients.length !== 1 ? "s" : ""})</div>
          {patients.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead><tr style={{ borderBottom: "2px solid #0F2B3C" }}>
                <th style={tblTh}>Patient</th><th style={tblTh}>Diagnosis</th><th style={tblTh}>Topics</th><th style={tblTh}>Date</th><th style={tblTh}>Status</th>
              </tr></thead>
              <tbody>{patients.map((p, i) => {
                const ts = p.topics || (p.topic ? [p.topic] : []);
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #D5DBDB" }}>
                    <td style={tblTd}>{p.initials}</td>
                    <td style={tblTd}>{p.dx || "—"}</td>
                    <td style={tblTd}>{ts.join(", ")}</td>
                    <td style={tblTd}>{new Date(p.date).toLocaleDateString()}</td>
                    <td style={tblTd}>{p.status}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          ) : <div style={{ fontSize: 12, color: "#ABB2B9", fontStyle: "italic" }}>No patients logged</div>}
        </div>

        {/* Topic Distribution */}
        {Object.keys(topicCounts).length > 0 && (
          <div className="print-no-break" style={{ marginBottom: 20 }}>
            <div style={hdr}>Topic Distribution</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).map(([topic, count]) => (
                <span key={topic} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, border: "1px solid #D5DBDB", color: "#2C3E50" }}>{topic} ({count})</span>
              ))}
            </div>
          </div>
        )}

        {/* SR Progress */}
        {srTotal > 0 && (
          <div className="print-no-break" style={{ marginBottom: 20 }}>
            <div style={hdr}>Spaced Repetition Progress</div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ textAlign: "center", padding: 10, border: "1px solid #D5DBDB", borderRadius: 8, flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#2980B9" }}>{srTotal}</div>
                <div style={{ fontSize: 10, color: "#5D6D7E" }}>Total in Queue</div>
              </div>
              <div style={{ textAlign: "center", padding: 10, border: "1px solid #D5DBDB", borderRadius: 8, flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#1ABC9C" }}>{srMastered}</div>
                <div style={{ fontSize: 10, color: "#5D6D7E" }}>Mastered (&gt;21d)</div>
              </div>
            </div>
          </div>
        )}

        {/* Achievements */}
        {earnedBadges.length > 0 && (
          <div className="print-no-break" style={{ marginBottom: 20 }}>
            <div style={hdr}>Achievements ({earnedBadges.length}/{ACHIEVEMENTS.length})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {earnedBadges.map(a => (
                <span key={a.id} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, border: "1px solid #D5DBDB", background: "#F8F9FA" }}>{a.icon} {a.title}</span>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Tags */}
        {(s.feedbackTags || []).length > 0 && (
          <div className="print-no-break" style={{ marginBottom: 20 }}>
            <div style={hdr}>Attending Feedback</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {s.feedbackTags!.map((ft, i) => (
                <span key={i} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, border: "1px solid #D5DBDB", background: "#F8F9FA" }}>
                  {ft.tag}{ft.note ? ` — ${ft.note}` : ""} <span style={{ color: "#ABB2B9", fontSize: 10 }}>({new Date(ft.date).toLocaleDateString()})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Milestones */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={hdr}>Milestones</div>
          <div style={{ fontSize: 12, lineHeight: 1.8 }}>
            {s.addedDate && <div>Joined rotation: {new Date(s.addedDate).toLocaleDateString()}</div>}
            {s.preScore?.date && <div>Pre-test completed: {new Date(s.preScore.date).toLocaleDateString()} ({pre}%)</div>}
            {patients.length > 0 && <div>First patient logged: {new Date(patients[patients.length - 1].date).toLocaleDateString()}</div>}
            {Object.keys(wkScores).length > 0 && <div>Quizzes taken: {Object.values(wkScores).flat().length} across {Object.keys(wkScores).length} week(s)</div>}
            {s.postScore?.date && <div>Post-test completed: {new Date(s.postScore.date).toLocaleDateString()} ({post}%){growth !== null && growth > 0 ? ` — +${growth}% improvement` : ""}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Printable Report (Cohort & Individual)
// ═══════════════════════════════════════════════════════════════════════

function PrintableReport({ mode, students, student, settings, onBack }: { mode: string; students: AdminStudent[]; student?: AdminStudent; settings: SharedSettings & { hospitalName?: string }; onBack: () => void }) {
  const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const rotationName = settings?.attendingName || "Nephrology Rotation";
  const hospitalName = settings?.hospitalName || "";

  useEffect(() => {
    // Auto-trigger print dialog after a brief delay to allow render
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, []);

  const reportHeader = (
    <div style={{ borderBottom: "2px solid #0F2B3C", paddingBottom: 12, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#0F2B3C", fontFamily: "'Crimson Pro', Georgia, serif" }}>
            {mode === "cohort" ? "Cohort Progress Report" : "Student Progress Report"}
          </div>
          <div style={{ fontSize: 13, color: "#5D6D7E", marginTop: 2 }}>
            {rotationName}{hospitalName ? ` — ${hospitalName}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, color: "#5D6D7E" }}>
          <div>Generated {reportDate}</div>
          <div style={{ marginTop: 2, fontSize: 10, color: "#ABB2B9" }}>&copy; Jonathan Cheng, MD MPH</div>
        </div>
      </div>
    </div>
  );

  const pct = (score: QuizScore | null) => score && score.total > 0 ? Math.round((score.correct / score.total) * 100) : null;

  if (mode === "cohort") {
    const activeStudents = students.filter(s => s.status === "active");
    const avgPre = activeStudents.filter(s => s.preScore).length > 0
      ? Math.round(activeStudents.filter(s => s.preScore).reduce((sum, s) => sum + pct(s.preScore)!, 0) / activeStudents.filter(s => s.preScore).length)
      : null;
    const avgPost = activeStudents.filter(s => s.postScore).length > 0
      ? Math.round(activeStudents.filter(s => s.postScore).reduce((sum, s) => sum + pct(s.postScore)!, 0) / activeStudents.filter(s => s.postScore).length)
      : null;

    return (
      <div>
        <button onClick={onBack} style={{ ...backBtn, marginBottom: 12 }}>← Back to Dashboard</button>
        <div className="printable-report" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", color: "#2C3E50", lineHeight: 1.5, padding: 20, background: "white" }}>
          {reportHeader}

          {/* Summary Stats */}
          <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
            <div style={{ flex: 1, textAlign: "center", padding: 12, border: "1px solid #D5DBDB", borderRadius: 8 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#2980B9" }}>{activeStudents.length}</div>
              <div style={{ fontSize: 11, color: "#5D6D7E" }}>Active Students</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", padding: 12, border: "1px solid #D5DBDB", borderRadius: 8 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#1ABC9C" }}>{students.reduce((sum, s) => sum + (s.patients || []).length, 0)}</div>
              <div style={{ fontSize: 11, color: "#5D6D7E" }}>Total Patients</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", padding: 12, border: "1px solid #D5DBDB", borderRadius: 8 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#E67E22" }}>{avgPre !== null ? avgPre + "%" : "—"}</div>
              <div style={{ fontSize: 11, color: "#5D6D7E" }}>Avg Pre-Test</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", padding: 12, border: "1px solid #D5DBDB", borderRadius: 8 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#16A085" }}>{avgPost !== null ? avgPost + "%" : "—"}</div>
              <div style={{ fontSize: 11, color: "#5D6D7E" }}>Avg Post-Test</div>
            </div>
            {avgPre !== null && avgPost !== null && (
              <div style={{ flex: 1, textAlign: "center", padding: 12, border: "1px solid #D5DBDB", borderRadius: 8, background: "#E8F8F5" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#1ABC9C" }}>+{avgPost - avgPre}%</div>
                <div style={{ fontSize: 11, color: "#5D6D7E" }}>Avg Growth</div>
              </div>
            )}
          </div>

          {/* Student Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #0F2B3C" }}>
                <th style={thStyle}>Student</th>
                <th style={thStyle}>Year</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Patients</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Quizzes</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Pre-Test</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Post-Test</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Growth</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Level</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const pre = pct(s.preScore);
                const post = pct(s.postScore);
                const growth = pre !== null && post !== null ? post - pre : null;
                const wkScores = s.weeklyScores || {};
                const quizCount = Object.values(wkScores).flat().length;
                const pts = s.gamification ? s.gamification.points : calculatePoints(s as Parameters<typeof calculatePoints>[0]);
                const lvl = getLevel(pts);
                return (
                  <tr key={s.id || i} style={{ borderBottom: "1px solid #D5DBDB", background: i % 2 === 0 ? "white" : "#F8F9FA" }}>
                    <td style={tdStyle}><strong>{s.name}</strong></td>
                    <td style={tdStyle}>{s.year || "—"}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{(s.patients || []).length}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{quizCount}</td>
                    <td style={{ ...tdStyle, textAlign: "center", color: "#E67E22" }}>{pre !== null ? pre + "%" : "—"}</td>
                    <td style={{ ...tdStyle, textAlign: "center", color: "#16A085" }}>{post !== null ? post + "%" : "—"}</td>
                    <td style={{ ...tdStyle, textAlign: "center", color: growth !== null && growth > 0 ? "#1ABC9C" : "#5D6D7E", fontWeight: 600 }}>
                      {growth !== null ? (growth > 0 ? "+" : "") + growth + "%" : "—"}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{lvl.icon} {lvl.name} ({pts}pts)</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Individual Student Report
  const s = student;
  if (!s) return <div style={{ padding: 16 }}>Student not found.</div>;

  const pre = pct(s.preScore);
  const post = pct(s.postScore);
  const growth = pre !== null && post !== null ? post - pre : null;
  const wkScores = s.weeklyScores || {};
  const patients = s.patients || [];
  const pts = s.gamification ? s.gamification.points : calculatePoints(s as Parameters<typeof calculatePoints>[0]);
  const lvl = getLevel(pts);
  const earned = s.gamification?.achievements || [];
  const earnedBadges = ACHIEVEMENTS.filter(a => earned.includes(a.id));

  // Topic distribution
  const topicCounts: Record<string, number> = {};
  patients.forEach(p => {
    const ts = p.topics || (p.topic ? [p.topic] : []);
    ts.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
  });

  return (
    <div>
      <button onClick={onBack} style={{ ...backBtn, marginBottom: 12 }}>← Back to Student</button>
      <div className="printable-report" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", color: "#2C3E50", lineHeight: 1.5, padding: 20, background: "white" }}>
        {reportHeader}

        {/* Student Header */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0F2B3C", fontFamily: "'Crimson Pro', Georgia, serif" }}>{s.name}</div>
          <div style={{ fontSize: 13, color: "#5D6D7E" }}>{s.year || "MS3/MS4"} {s.email ? `• ${s.email}` : ""} • {lvl.icon} {lvl.name} ({pts} pts)</div>
        </div>

        {/* Scores Summary */}
        <div className="print-no-break" style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1, textAlign: "center", padding: 14, border: "1px solid #D5DBDB", borderRadius: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#ABB2B9", textTransform: "uppercase" }}>Pre-Test</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#E67E22", fontFamily: "'JetBrains Mono', monospace" }}>{pre !== null ? pre + "%" : "—"}</div>
            {s.preScore && <div style={{ fontSize: 10, color: "#ABB2B9" }}>{s.preScore.correct}/{s.preScore.total}</div>}
          </div>
          <div style={{ flex: 1, textAlign: "center", padding: 14, border: "1px solid #D5DBDB", borderRadius: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#1ABC9C", textTransform: "uppercase" }}>Post-Test</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#1ABC9C", fontFamily: "'JetBrains Mono', monospace" }}>{post !== null ? post + "%" : "—"}</div>
            {s.postScore && <div style={{ fontSize: 10, color: "#ABB2B9" }}>{s.postScore.correct}/{s.postScore.total}</div>}
          </div>
          {growth !== null && (
            <div style={{ flex: 1, textAlign: "center", padding: 14, border: "1px solid #D5DBDB", borderRadius: 8, background: "#E8F8F5" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#1ABC9C", textTransform: "uppercase" }}>Growth</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: "#1ABC9C", fontFamily: "'JetBrains Mono', monospace" }}>+{growth}%</div>
            </div>
          )}
        </div>

        {/* Weekly Quiz Breakdown */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0F2B3C", marginBottom: 8, fontFamily: "'Crimson Pro', Georgia, serif" }}>Weekly Quiz Scores</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #0F2B3C" }}>
                <th style={thStyle}>Week</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Attempts</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Best Score</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Last Score</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map(w => {
                const ws = wkScores[w] || [];
                const best = ws.length > 0 ? Math.max(...ws.map(x => Math.round((x.correct / x.total) * 100))) : null;
                const last = ws.length > 0 ? Math.round((ws[ws.length - 1].correct / ws[ws.length - 1].total) * 100) : null;
                return (
                  <tr key={w} style={{ borderBottom: "1px solid #D5DBDB" }}>
                    <td style={tdStyle}>Week {w}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{ws.length}</td>
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 600, color: best !== null && best >= 80 ? "#1ABC9C" : best !== null && best >= 60 ? "#F1C40F" : best !== null ? "#E74C3C" : "#ABB2B9" }}>
                      {best !== null ? best + "%" : "—"}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{last !== null ? last + "%" : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Patient Log */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0F2B3C", marginBottom: 8, fontFamily: "'Crimson Pro', Georgia, serif" }}>
            Patient Log ({patients.length} patient{patients.length !== 1 ? "s" : ""})
          </div>
          {patients.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #0F2B3C" }}>
                  <th style={thStyle}>Patient</th>
                  <th style={thStyle}>Diagnosis</th>
                  <th style={thStyle}>Topics</th>
                  <th style={thStyle}>Date</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p, i) => {
                  const ts = p.topics || (p.topic ? [p.topic] : []);
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #D5DBDB" }}>
                      <td style={tdStyle}>{p.initials}</td>
                      <td style={tdStyle}>{p.dx || "—"}</td>
                      <td style={tdStyle}>{ts.join(", ")}</td>
                      <td style={tdStyle}>{new Date(p.date).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ fontSize: 12, color: "#ABB2B9", fontStyle: "italic" }}>No patients logged</div>
          )}
        </div>

        {/* Topic Distribution */}
        {Object.keys(topicCounts).length > 0 && (
          <div className="print-no-break" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F2B3C", marginBottom: 8, fontFamily: "'Crimson Pro', Georgia, serif" }}>Topic Distribution</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).map(([topic, count]) => (
                <span key={topic} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, border: "1px solid #D5DBDB", color: "#2C3E50" }}>
                  {topic} ({count})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <div className="print-no-break" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F2B3C", marginBottom: 8, fontFamily: "'Crimson Pro', Georgia, serif" }}>Achievements Earned ({earnedBadges.length}/{ACHIEVEMENTS.length})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {earnedBadges.map(a => (
                <span key={a.id} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, border: "1px solid #D5DBDB", background: "#F8F9FA" }}>
                  {a.icon} {a.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Attending Feedback */}
        {(s.feedbackTags || []).length > 0 && (
          <div className="print-no-break" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F2B3C", marginBottom: 8, fontFamily: "'Crimson Pro', Georgia, serif" }}>Attending Feedback ({s.feedbackTags!.length})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {s.feedbackTags!.map((ft, i) => (
                <span key={i} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, border: "1px solid #D5DBDB", background: "#F8F9FA" }}>
                  {ft.tag}{ft.note ? ` — ${ft.note}` : ""} <span style={{ color: "#ABB2B9", fontSize: 10 }}>({new Date(ft.date).toLocaleDateString()})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#5D6D7E", textTransform: "uppercase", letterSpacing: 0.3 };
const tdStyle = { padding: "8px 10px" };

export default AdminPanel;
