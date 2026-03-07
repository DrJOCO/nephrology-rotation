import { useState, useEffect, useCallback } from "react";
import { T, TOPICS, WEEKLY, ARTICLES } from "../data/constants";
import { PRE_QUIZ, POST_QUIZ, WEEKLY_QUIZZES } from "../data/quizzes";
import { QUICK_REFS } from "../data/guides";
import store from "../utils/store";
import { ensureGoogleFonts, ensureShakeAnimation, ensureLayoutStyles, SHARED_KEYS, createRotationCode } from "../utils/helpers";
import { calculatePoints, getLevel, ACHIEVEMENTS } from "../utils/gamification";

// ═══════════════════════════════════════════════════════════════════════
//  Admin Panel (main component)
// ═══════════════════════════════════════════════════════════════════════

function AdminPanel({ onExit }) {
  const [tab, setTab] = useState("dashboard");
  const [subView, setSubView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  // Admin data
  const [students, setStudents] = useState([]);
  const [articles, setArticles] = useState(ARTICLES);
  const [curriculum, setCurriculum] = useState(WEEKLY);
  const [announcements, setAnnouncements] = useState([]);
  const [settings, setSettings] = useState({ attendingName: "", rotationStart: "", email: "", phone: "", adminPin: "" });
  const [rotationCode, setRotationCodeState] = useState(store.getRotationCode() || "");

  // Load
  useEffect(() => {
    ensureGoogleFonts();
    ensureShakeAnimation();
    ensureLayoutStyles();
    (async () => {
      const s = await store.get("admin_students");
      const a = await store.get("admin_articles");
      const c = await store.get("admin_curriculum");
      const an = await store.get("admin_announcements");
      const st = await store.get("admin_settings");
      if (s) setStudents(s);
      if (a) setArticles(a);
      if (c) setCurriculum(c);
      if (an) setAnnouncements(an);
      if (st) setSettings(st);
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
        year: s.year || "MS3/MS4",
        email: s.email || "",
        status: s.status || "active",
        addedDate: s.joinedAt || new Date().toISOString(),
        patients: s.patients || [],
        weeklyScores: s.weeklyScores || {},
        preScore: s.preScore || null,
        postScore: s.postScore || null,
        gamification: s.gamification || null,
        notes: s.notes || "",
        lastSyncedAt: s.updatedAt || null,
      })));
    });
    return () => unsub();
  }, [rotationCode]);

  // Write student edits back to Firestore
  const writeStudentToFirestore = useCallback((studentId, data) => {
    if (!rotationCode || !studentId) return;
    store.setStudentData(studentId, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }, [rotationCode]);

  const navigate = (t, sv = null) => { setTab(t); setSubView(sv); };
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

    const snapshots = [];
    for (const key of keys) {
      const snap = await store.getShared(key);
      if (snap?.studentId) snapshots.push(snap);
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
          const merged = {
            ...existing,
            name: snap.name || existing.name,
            patients: Array.isArray(snap.patients) ? snap.patients : (existing.patients || []),
            weeklyScores: snap.weeklyScores || existing.weeklyScores || {},
            preScore: snap.preScore || existing.preScore || null,
            postScore: snap.postScore || existing.postScore || null,
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
          notes: "",
          lastSyncedAt: snap.updatedAt || new Date().toISOString(),
        });
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
            style={{ width: "100%", padding: "14px 0", background: T.navy, color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            Enter
          </button>
          <p style={{ color: T.muted, fontSize: 11, marginTop: 12 }}>Set or change your PIN in Settings.</p>
          {onExit && <button onClick={onExit} style={{ marginTop: 14, background: "none", border: "1px solid #D5DBDB", color: "#5D6D7E", padding: "10px 0", width: "100%", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>← Back to Student App</button>}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "students", icon: "🎓", label: "Students" },
    { id: "content", icon: "📝", label: "Content" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.sans }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${T.dark} 0%, ${T.navy} 100%)`, padding: `calc(14px + env(safe-area-inset-top, 0px)) 20px 14px`, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: "white", fontFamily: T.serif, fontSize: 19, fontWeight: 700 }}>
              Admin Panel <span style={{ fontSize: 10, background: T.orange, color: "white", padding: "2px 8px", borderRadius: 6, marginLeft: 8, fontFamily: T.sans, fontWeight: 600, verticalAlign: "middle" }}>ATTENDING</span>
            </div>
            <div style={{ color: T.muted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {settings.attendingName || "Nephrology Rotation"}
              {rotationCode && <span style={{ marginLeft: 8, fontSize: 10, background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 6, fontFamily: T.mono, letterSpacing: 1 }}>Code: {rotationCode}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {onExit && <button onClick={onExit} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: T.muted, fontSize: 11, padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>← Student</button>}
            <button onClick={() => { setAuthed(false); }}
              style={{ background: "rgba(255,255,255,0.1)", border: "none", color: T.muted, fontSize: 11, padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>
              Lock 🔒
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="tab-content-enter" key={tab + (subView ? JSON.stringify(subView) : "")} style={{ padding: `0 0 ${T.navH + T.navPad}px` }}>
        {tab === "dashboard" && <DashboardTab students={students} navigate={navigate} />}
        {tab === "students" && !subView && <StudentsTab students={students} setStudents={setStudents} navigate={navigate} />}
        {tab === "students" && subView?.type === "studentDetail" && <StudentDetailView student={students.find(s => s.id === subView.id)} onBack={() => navigate("students")} students={students} setStudents={setStudents} writeStudentToFirestore={writeStudentToFirestore} />}
        {tab === "content" && !subView && <ContentTab navigate={navigate} articles={articles} curriculum={curriculum} />}
        {tab === "content" && subView?.type === "editArticles" && <ArticleEditor week={subView.week} articles={articles} setArticles={setArticles} onBack={() => navigate("content")} />}
        {tab === "content" && subView?.type === "editCurriculum" && <CurriculumEditor curriculum={curriculum} setCurriculum={setCurriculum} onBack={() => navigate("content")} />}
        {tab === "content" && subView?.type === "announcements" && <AnnouncementsEditor announcements={announcements} setAnnouncements={setAnnouncements} onBack={() => navigate("content")} />}
        {tab === "settings" && <SettingsTab settings={settings} setSettings={setSettings} onImportStudentUpdates={importStudentUpdates} rotationCode={rotationCode} setRotationCodeState={setRotationCodeState} curriculum={curriculum} articles={articles} announcements={announcements} />}
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

function DashboardTab({ students, navigate }) {
  const activeStudents = students.filter(s => s.status === "active");
  const totalPatients = students.reduce((sum, s) => sum + (s.patients || []).length, 0);
  const avgPre = activeStudents.filter(s => s.preScore).length > 0
    ? Math.round(activeStudents.filter(s => s.preScore).reduce((sum, s) => sum + (s.preScore.correct / s.preScore.total) * 100, 0) / activeStudents.filter(s => s.preScore).length)
    : null;
  const avgPost = activeStudents.filter(s => s.postScore).length > 0
    ? Math.round(activeStudents.filter(s => s.postScore).reduce((sum, s) => sum + (s.postScore.correct / s.postScore.total) * 100, 0) / activeStudents.filter(s => s.postScore).length)
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
        <div style={{ background: `linear-gradient(135deg, ${T.navy}, ${T.deep})`, borderRadius: 16, padding: 20, marginBottom: 20, color: "white" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: T.pale, marginBottom: 12 }}>Cohort Knowledge Growth</div>
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: T.muted }}>Pre-Test Avg</div>
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
          { label: "Settings", icon: "⚙️", action: () => navigate("settings") },
        ].map((a, i) => (
          <button key={i} onClick={a.action}
            style={{ background: T.card, borderRadius: 12, padding: 16, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>{a.icon}</span>
            <span style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Student Summary */}
      {activeStudents.length > 0 && (
        <>
          <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Student Overview</h3>
          {activeStudents.map(s => {
            const prePct = s.preScore ? Math.round((s.preScore.correct / s.preScore.total) * 100) : null;
            const postPct = s.postScore ? Math.round((s.postScore.correct / s.postScore.total) * 100) : null;
            const wkScores = s.weeklyScores || {};
            const quizzesDone = Object.values(wkScores).flat().length;
            const pts = s.gamification ? s.gamification.points : calculatePoints(s);
            const lvl = getLevel(pts);
            return (
              <button key={s.id} onClick={() => navigate("students", { type: "studentDetail", id: s.id })}
                style={{ display: "block", width: "100%", background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>{s.name}</span>
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

function StatCard({ value, label, color, icon }) {
  return (
    <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 10, right: 12, fontSize: 24, opacity: 0.15 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: T.mono }}>{value}</div>
      <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Students Tab & Student Roster
// ═══════════════════════════════════════════════════════════════════════

function StudentsTab({ students, setStudents, navigate }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", year: "MS3", startDate: "" });

  const addStudent = () => {
    if (!form.name.trim()) return;
    const s = {
      ...form, id: Date.now(), status: "active", addedDate: new Date().toISOString(),
      patients: [], weeklyScores: {}, preScore: null, postScore: null, notes: "",
    };
    setStudents(prev => [...prev, s]);
    setForm({ name: "", email: "", year: "MS3", startDate: "" });
    setShowAdd(false);
  };

  const removeStudent = (id) => {
    if (!confirm("Remove this student? Their data will be lost.")) return;
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const toggleStatus = (id) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status: s.status === "active" ? "completed" : "active" } : s));
  };

  const active = students.filter(s => s.status === "active");
  const completed = students.filter(s => s.status === "completed");

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ color: T.text, fontSize: 20, margin: 0, fontFamily: T.serif, fontWeight: 700 }}>Students</h2>
        <button onClick={() => setShowAdd(!showAdd)}
          style={{ padding: "8px 16px", background: showAdd ? T.sub : T.orange, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {showAdd ? "Cancel" : "+ Add Student"}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `2px solid ${T.orange}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={adminLabel}>Student Name *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Glen Merulus" style={adminInput} />
            </div>
            <div>
              <label style={adminLabel}>Year</label>
              <select value={form.year} onChange={e => setForm({...form, year: e.target.value})} style={{...adminInput, background: "white"}}>
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
          <button onClick={addStudent} style={{ width: "100%", padding: "12px 0", background: T.navy, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Add Student
          </button>
        </div>
      )}

      {/* Active students */}
      {active.length === 0 && !showAdd && (
        <div style={{ textAlign: "center", padding: 40, color: T.sub }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎓</div>
          <div style={{ fontSize: 14 }}>No active students</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>Add your first student above</div>
        </div>
      )}

      {active.map(s => (
        <StudentRow key={s.id} student={s} navigate={navigate} onToggle={() => toggleStatus(s.id)} onRemove={() => removeStudent(s.id)} />
      ))}

      {completed.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, margin: "20px 0 10px", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Completed Rotations ({completed.length})
          </div>
          {completed.map(s => (
            <StudentRow key={s.id} student={s} navigate={navigate} onToggle={() => toggleStatus(s.id)} onRemove={() => removeStudent(s.id)} dimmed />
          ))}
        </>
      )}
    </div>
  );
}

function StudentRow({ student: s, navigate, onToggle, onRemove, dimmed }) {
  const prePct = s.preScore ? Math.round((s.preScore.correct / s.preScore.total) * 100) : null;
  const postPct = s.postScore ? Math.round((s.postScore.correct / s.postScore.total) * 100) : null;

  return (
    <div style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}`, opacity: dimmed ? 0.6 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <button onClick={() => navigate("students", { type: "studentDetail", id: s.id })}
          style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>{s.name}</span>
            <span style={{ fontSize: 10, color: "white", background: T.med, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{s.year}</span>
          </div>
          <div style={{ fontSize: 12, color: T.sub }}>
            {(s.patients || []).length} patients • Started {s.startDate || new Date(s.addedDate).toLocaleDateString()}
          </div>
          {/* Score bars */}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            {prePct !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, color: T.muted }}>Pre:</span>
                <div style={{ width: 60, height: 6, background: "#ECF0F1", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${prePct}%`, height: "100%", background: T.orange, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.orange, fontFamily: T.mono }}>{prePct}%</span>
              </div>
            )}
            {postPct !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, color: T.muted }}>Post:</span>
                <div style={{ width: 60, height: 6, background: "#ECF0F1", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${postPct}%`, height: "100%", background: T.green, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.green, fontFamily: T.mono }}>{postPct}%</span>
              </div>
            )}
          </div>
        </button>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button onClick={onToggle} style={{ background: "none", border: `1px solid ${dimmed ? T.green : T.muted}`, borderRadius: 6, padding: "4px 8px", fontSize: 10, cursor: "pointer", color: dimmed ? T.green : T.sub }}>
            {dimmed ? "↩ Reactivate" : "✓ Complete"}
          </button>
          <button onClick={onRemove} style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 6, padding: "4px 8px", fontSize: 10, cursor: "pointer", color: T.muted }}>✕</button>
        </div>
      </div>
    </div>
  );
}

const adminLabel = { fontSize: 11, fontWeight: 700, color: T.sub, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 };
const adminInput = { width: "100%", padding: "10px 12px", border: `1.5px solid ${T.line}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box", fontFamily: T.sans, outline: "none" };

// ═══════════════════════════════════════════════════════════════════════
//  Content Management: Articles, Curriculum, Announcements
// ═══════════════════════════════════════════════════════════════════════

function ContentTab({ navigate, articles, curriculum }) {
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
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#FEF9E7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📢</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Announcements</div>
            <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>Post notes or reminders for students</div>
          </div>
          <span style={{ color: T.muted, fontSize: 16 }}>›</span>
        </div>
      </button>
    </div>
  );
}

// ─── Article Editor ─────────────────────────────────────────────────
function ArticleEditor({ week, articles, setArticles, onBack }) {
  const weekArticles = articles[week] || [];
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", journal: "", year: "", url: "", topic: "", type: "Review" });
  const [editIdx, setEditIdx] = useState(null);

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

  const remove = (idx) => {
    setArticles(prev => {
      const copy = { ...prev };
      copy[week] = (copy[week] || []).filter((_, i) => i !== idx);
      return copy;
    });
  };

  const startEdit = (idx) => {
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
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={{...adminInput, background: "white"}}>
                <option value="Review">Review</option>
                <option value="Guideline">Guideline</option>
                <option value="Landmark">Landmark Study</option>
                <option value="Case Report">Case Report</option>
              </select>
            </div>
          </div>
          <button onClick={save} style={{ width: "100%", padding: "12px 0", background: T.navy, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
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
function CurriculumEditor({ curriculum, setCurriculum, onBack }) {
  const [editWeek, setEditWeek] = useState(null);
  const [form, setForm] = useState({ title: "", sub: "", topicsStr: "" });

  const startEdit = (w) => {
    const wk = curriculum[w] || WEEKLY[w];
    setForm({ title: wk.title, sub: wk.sub, topicsStr: wk.topics.join(", ") });
    setEditWeek(w);
  };

  const saveEdit = () => {
    if (!form.title.trim()) return;
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
                <button onClick={saveEdit} style={{ flex: 1, padding: "10px 0", background: T.navy, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save</button>
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
function AnnouncementsEditor({ announcements, setAnnouncements, onBack }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", priority: "normal" });

  const add = () => {
    if (!form.title.trim()) return;
    setAnnouncements(prev => [{ ...form, id: Date.now(), date: new Date().toISOString() }, ...prev]);
    setForm({ title: "", body: "", priority: "normal" });
    setShowAdd(false);
  };

  const remove = (id) => setAnnouncements(prev => prev.filter(a => a.id !== id));

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
            <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} style={{...adminInput, background: "white"}}>
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <button onClick={add} style={{ width: "100%", padding: "12px 0", background: T.navy, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
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
//  Settings Tab
// ═══════════════════════════════════════════════════════════════════════

function SettingsTab({ settings, setSettings, onImportStudentUpdates, rotationCode, setRotationCodeState, curriculum, articles, announcements }) {
  const [creating, setCreating] = useState(false);
  const [rejoinCode, setRejoinCode] = useState("");
  const [rejoinError, setRejoinError] = useState("");
  const [rejoining, setRejoining] = useState(false);
  const [rotationHistory, setRotationHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [newDates, setNewDates] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const update = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

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
      const code = createRotationCode(newLocation, newDates);
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

  const handleDeleteRotation = async (code) => {
    if (!confirm(`Delete rotation ${code}? All student data in this rotation will be permanently lost.`)) return;
    try {
      await store.deleteRotation(code);
      setRotationHistory(prev => prev.filter(r => r.code !== code));
      if (rotationCode === code) setRotationCodeState("");
    } catch {
      alert("Failed to delete rotation.");
    }
  };

  const handleConnectRotation = (code) => {
    store.setRotationCode(code);
    setRotationCodeState(code);
  };

  const handleUpdateRotationField = async (code, field, value) => {
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
      const exists = await store.validateRotationCode(rejoinCode);
      if (exists) {
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
      <div style={{ background: `linear-gradient(135deg, ${T.navy}, ${T.deep})`, borderRadius: 16, padding: 20, marginBottom: 16, color: "white" }}>
        <h3 style={{ fontFamily: T.serif, color: "white", fontSize: 16, margin: "0 0 12px", fontWeight: 700 }}>Rotation Code</h3>
        {rotationCode ? (
          <div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Share this code with students to join:</div>
            <div style={{ fontSize: 32, fontFamily: T.mono, fontWeight: 700, letterSpacing: 4, textAlign: "center", background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "14px 0", marginBottom: 12 }}>
              {rotationCode}
            </div>
            <div style={{ fontSize: 11, color: T.muted, textAlign: "center", marginBottom: 12 }}>Students enter this code after setting their name to sync data in real-time.</div>
            <button onClick={handleDisconnect} style={{ width: "100%", padding: "10px 0", background: "rgba(255,255,255,0.1)", color: T.muted, border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
              Disconnect from Rotation
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: T.pale, marginBottom: 12, lineHeight: 1.5 }}>
              Create a rotation to sync student data in real-time via Firebase. Students will enter the generated code to join.
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: T.pale, fontWeight: 600, display: "block", marginBottom: 4 }}>Rotation Dates (optional)</label>
              <input value={newDates} onChange={e => setNewDates(e.target.value)} placeholder="e.g. Mar 1–28, 2026"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "white", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: T.pale, fontWeight: 600, display: "block", marginBottom: 4 }}>Location (optional)</label>
              <input value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="e.g. City Medical Center"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "white", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <button onClick={handleCreateRotation} disabled={creating}
              style={{ width: "100%", padding: "14px 0", background: T.orange, color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: creating ? "wait" : "pointer", opacity: creating ? 0.7 : 1, marginBottom: 16 }}>
              {creating ? "Creating..." : "Create New Rotation"}
            </button>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 14 }}>
              <div style={{ fontSize: 12, color: T.pale, marginBottom: 8, fontWeight: 600 }}>Or rejoin an existing rotation:</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={rejoinCode}
                  onChange={e => { setRejoinCode(e.target.value.toUpperCase().slice(0, 6)); setRejoinError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") handleRejoin(); }}
                  placeholder="Enter code"
                  maxLength={6}
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: `1px solid ${rejoinError ? T.accent : "rgba(255,255,255,0.2)"}`, background: "rgba(255,255,255,0.1)", color: "white", fontSize: 14, fontFamily: T.mono, letterSpacing: 2, textAlign: "center", outline: "none", boxSizing: "border-box" }}
                />
                <button onClick={handleRejoin} disabled={rejoining || rejoinCode.length < 4}
                  style={{ padding: "10px 18px", background: rejoinCode.length >= 4 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)", color: rejoinCode.length >= 4 ? "white" : T.muted, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: rejoinCode.length >= 4 ? "pointer" : "default" }}>
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
                      style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.line}`, fontSize: 12, color: T.text, background: "white", outline: "none" }}
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
                      style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.line}`, fontSize: 12, color: T.text, background: "white", outline: "none" }}
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
                      style={{ flex: 1, padding: "8px 0", background: T.navy, color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Connect
                    </button>
                  )}
                  <button onClick={() => handleDeleteRotation(r.code)}
                    style={{ flex: rotationCode === r.code ? 1 : 0, minWidth: rotationCode === r.code ? 0 : 80, padding: "8px 12px", background: "rgba(231,76,60,0.08)", color: T.accent, border: `1px solid rgba(231,76,60,0.2)`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
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

      {/* Rotation Config */}
      <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 16, margin: "0 0 14px", fontWeight: 700 }}>Rotation Configuration</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={adminLabel}>Rotation Start Date</label>
            <input type="date" value={settings.rotationStart || ""} onChange={e => update("rotationStart", e.target.value)} style={adminInput} />
          </div>
          <div>
            <label style={adminLabel}>Duration</label>
            <select value={settings.duration || "4"} onChange={e => update("duration", e.target.value)} style={{...adminInput, background: "white"}}>
              <option value="2">2 Weeks</option>
              <option value="4">4 Weeks</option>
              <option value="6">6 Weeks</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={adminLabel}>Hospital / Practice Name</label>
          <input value={settings.hospitalName || ""} onChange={e => update("hospitalName", e.target.value)} placeholder="e.g. City Medical Center" style={adminInput} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={adminLabel}>Clinic Location</label>
          <input value={settings.clinicLocation || ""} onChange={e => update("clinicLocation", e.target.value)} placeholder="e.g. Suite 300, Medical Office Building" style={adminInput} />
        </div>
      </div>

      {/* Student Expectations */}
      <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 16, margin: "0 0 14px", fontWeight: 700 }}>Student Expectations</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={adminLabel}>Daily Schedule</label>
          <textarea value={settings.schedule || ""} onChange={e => update("schedule", e.target.value)} rows={3}
            placeholder="e.g. 7am Arrive, 7:30 Pre-round, 8am Round, 12pm Clinic..."
            style={{...adminInput, resize: "vertical"}} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={adminLabel}>What to Bring / Prep</label>
          <textarea value={settings.whatToBring || ""} onChange={e => update("whatToBring", e.target.value)} rows={2}
            placeholder="e.g. White coat, stethoscope, Nephrology rotation outline..."
            style={{...adminInput, resize: "vertical"}} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={adminLabel}>Minimum Expectations</label>
          <textarea value={settings.expectations || ""} onChange={e => update("expectations", e.target.value)} rows={3}
            placeholder="e.g. Pre/post quiz, ≥10 patients, all weekly quizzes, active rounding participation..."
            style={{...adminInput, resize: "vertical"}} />
        </div>
        <div>
          <label style={adminLabel}>Grading Notes</label>
          <textarea value={settings.grading || ""} onChange={e => update("grading", e.target.value)} rows={2}
            placeholder="e.g. Pass/Fail based on attendance, quiz completion, and clinical participation"
            style={{...adminInput, resize: "vertical"}} />
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
          style={{ width: "100%", padding: "12px 0", background: T.navy, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>
          Import Shared Student Updates
        </button>
        <button onClick={() => {
          const data = { settings, timestamp: new Date().toISOString() };
          const blob = JSON.stringify(data, null, 2);
          const el = document.createElement("textarea");
          el.value = blob;
          document.body.appendChild(el);
          el.select();
          try { document.execCommand("copy"); } catch {}
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

function StudentDetailView({ student: s, onBack, students, setStudents, writeStudentToFirestore }) {
  const [showScoreEntry, setShowScoreEntry] = useState(false);
  const [scoreType, setScoreType] = useState("pre"); // pre, post, weekly
  const [scoreWeek, setScoreWeek] = useState(1);
  const [scoreForm, setScoreForm] = useState({ correct: "", total: "" });
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [patForm, setPatForm] = useState({ initials: "", room: "", dx: "", topics: [], notes: "" });
  const togglePatTopic = (t) => setPatForm(prev => ({ ...prev, topics: prev.topics.includes(t) ? prev.topics.filter(x => x !== t) : [...prev.topics, t] }));
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState(s?.notes || "");

  if (!s) return <div style={{ padding: 16 }}>Student not found.</div>;

  const prePct = s.preScore ? Math.round((s.preScore.correct / s.preScore.total) * 100) : null;
  const postPct = s.postScore ? Math.round((s.postScore.correct / s.postScore.total) * 100) : null;
  const wkScores = s.weeklyScores || {};
  const patients = s.patients || [];

  const updateStudent = (updates) => {
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
        notes: merged.notes,
        status: merged.status,
      });
    }
  };

  const saveScore = () => {
    const correct = parseInt(scoreForm.correct);
    const total = parseInt(scoreForm.total);
    if (isNaN(correct) || isNaN(total) || total === 0) return;
    const entry = { correct, total, date: new Date().toISOString() };

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
    const p = { ...patForm, id: Date.now(), date: new Date().toISOString(), status: "active" };
    updateStudent({ patients: [...patients, p] });
    setPatForm({ initials: "", room: "", dx: "", topics: [], notes: "" });
    setShowAddPatient(false);
  };

  const saveNotes = () => {
    updateStudent({ notes: noteText });
    setShowNotes(false);
  };

  const topicCounts = {};
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
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: s.status === "active" ? T.green : T.muted, background: s.status === "active" ? "rgba(26,188,156,0.1)" : T.bg, padding: "4px 10px", borderRadius: 8, textTransform: "uppercase" }}>
            {s.status}
          </div>
        </div>
        {/* Gamification Summary */}
        {(() => {
          const gam = s.gamification;
          const pts = gam ? gam.points : calculatePoints(s);
          const level = getLevel(pts);
          const earnedCount = gam?.achievements?.length || 0;
          return (
            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ background: T.ice, borderRadius: 10, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 18 }}>{level.icon}</span>
                <span style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{level.name}</span>
              </div>
              <div style={{ background: "#FEF9E7", borderRadius: 10, padding: "6px 14px" }}>
                <span style={{ fontWeight: 700, color: T.orange, fontSize: 14, fontFamily: T.mono }}>{pts}</span>
                <span style={{ fontSize: 11, color: T.sub, marginLeft: 4 }}>pts</span>
              </div>
              <div style={{ background: "rgba(26,188,156,0.1)", borderRadius: 10, padding: "6px 14px" }}>
                <span style={{ fontWeight: 700, color: T.green, fontSize: 14 }}>{earnedCount}</span>
                <span style={{ fontSize: 11, color: T.sub, marginLeft: 4 }}>/{ACHIEVEMENTS.length} badges</span>
              </div>
              {gam?.streaks?.currentDays > 0 && (
                <div style={{ background: "#FDEDEC", borderRadius: 10, padding: "6px 14px" }}>
                  <span style={{ fontSize: 14 }}>🔥</span>
                  <span style={{ fontWeight: 700, color: T.accent, fontSize: 14, marginLeft: 4 }}>{gam.streaks.currentDays}d</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Notes */}
        {s.notes && !showNotes && (
          <div style={{ marginTop: 10, background: "#FEF9E7", borderRadius: 8, padding: 10, fontSize: 13, color: T.text, lineHeight: 1.4, wordBreak: "break-word" }}>
            📝 {s.notes}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button onClick={() => setShowNotes(!showNotes)} style={{ fontSize: 11, color: T.med, background: T.ice, border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            {showNotes ? "Cancel" : "📝 Notes"}
          </button>
          <button onClick={() => { setShowScoreEntry(true); setScoreType("pre"); setScoreForm({ correct: "", total: "25" }); }}
            style={{ fontSize: 11, color: T.orange, background: "#FEF9E7", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            + Enter Score
          </button>
          <button onClick={() => setShowAddPatient(!showAddPatient)}
            style={{ fontSize: 11, color: T.green, background: "rgba(26,188,156,0.1)", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            + Log Patient
          </button>
        </div>
      </div>

      {/* Notes editor */}
      {showNotes && (
        <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 16, border: `2px solid ${T.med}` }}>
          <label style={adminLabel}>Attending Notes on {s.name}</label>
          <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3}
            placeholder="Clinical impressions, areas for improvement, strengths..."
            style={{...adminInput, resize: "vertical", marginBottom: 10}} />
          <button onClick={saveNotes} style={{ width: "100%", padding: "10px 0", background: T.navy, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save Notes</button>
        </div>
      )}

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
            <button onClick={saveScore} style={{ flex: 1, padding: "10px 0", background: T.navy, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save Score</button>
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
                      background: sel ? T.orange : "white", color: sel ? "white" : T.sub,
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
            <button onClick={addPatient} style={{ flex: 1, padding: "10px 0", background: T.navy, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add Patient</button>
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

export default AdminPanel;
