import { useState, useEffect, useCallback, useRef } from "react";
import { T, TOPICS, WEEKLY, ARTICLES, RESOURCES, ABBREVIATIONS, LANDMARK_TRIALS, STUDY_SHEETS } from "../data/constants";
import { PRE_QUIZ, POST_QUIZ, WEEKLY_QUIZZES } from "../data/quizzes";
import { QUICK_REFS, GUIDE_SECTIONS, GUIDE_DATA } from "../data/guides";
import store from "../utils/store";
import { ensureGoogleFonts, ensureLayoutStyles, SHARED_KEYS } from "../utils/helpers";
import { calculatePoints, getLevel, checkAchievements, updateStreak, ACHIEVEMENTS } from "../utils/gamification";


// ═══════════════════════════════════════════════════════════════════════
//  Onboarding Overlay — First-time user walkthrough
// ═══════════════════════════════════════════════════════════════════════

const ONBOARDING_STEPS = [
  {
    icon: "📝",
    title: "Take the Pre-Rotation Quiz",
    body: "Start with a 25-question assessment to identify your strengths and areas to focus on during the rotation.",
    hint: "Your results will guide your study plan",
  },
  {
    icon: "📚",
    title: "Explore Your Weekly Curriculum",
    body: "Each week covers key nephrology topics with quizzes, journal articles, landmark trials, and study sheets.",
    hint: "Tap any week to see its content",
  },
  {
    icon: "🏥",
    title: "Log Patients on Rounds",
    body: "Track the patients you see, tag diagnoses, and add follow-up notes to build your clinical experience log.",
    hint: "Use the Rounds tab during ward time",
  },
];

function OnboardingOverlay({ onDismiss }) {
  const [step, setStep] = useState(0);
  const s = ONBOARDING_STEPS[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;

  const handleDismiss = () => {
    localStorage.setItem("neph_hasSeenOnboarding", "true");
    onDismiss();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "white", borderRadius: 20, maxWidth: 360, width: "100%", padding: "32px 24px 24px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", animation: "fadeIn 0.3s ease" }}>
        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
          {ONBOARDING_STEPS.map((_, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: i === step ? T.med : T.pale, transition: "background 0.3s" }} />
          ))}
        </div>

        {/* Icon */}
        <div style={{ fontSize: 48, marginBottom: 16 }}>{s.icon}</div>

        {/* Title */}
        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.navy, marginBottom: 8, fontFamily: T.serif }}>{s.title}</h2>

        {/* Body */}
        <p style={{ fontSize: 14, color: T.sub, lineHeight: 1.5, marginBottom: 12 }}>{s.body}</p>

        {/* Hint */}
        <div style={{ fontSize: 11, color: T.med, fontWeight: 600, background: T.ice, borderRadius: 8, padding: "6px 12px", display: "inline-block", marginBottom: 24 }}>
          💡 {s.hint}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={handleDismiss}
            style={{ padding: "10px 20px", background: "none", border: "none", color: T.sub, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
            Skip
          </button>
          <button onClick={() => isLast ? handleDismiss() : setStep(step + 1)}
            style={{ padding: "10px 24px", background: T.med, color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", minWidth: 120 }}>
            {isLast ? "Get Started" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Student App — Main Entry
// ═══════════════════════════════════════════════════════════════════════

function StudentApp({ onAdminToggle }) {
  const [tab, setTab] = useState("home");
  const [subView, setSubView] = useState(null); // for quiz week, quick ref id, article week, etc.
  const [patients, setPatients] = useState([]);
  const [weeklyScores, setWeeklyScores] = useState({});
  const [preScore, setPreScore] = useState(null);
  const [postScore, setPostScore] = useState(null);
  const [studentName, setStudentName] = useState("");
  const [studentPin, setStudentPin] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [curriculum, setCurriculum] = useState(WEEKLY);
  const [articles, setArticles] = useState(ARTICLES);
  const [announcements, setAnnouncements] = useState([]);
  const [lastSharedAt, setLastSharedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rotationCode, setRotationCodeState] = useState(store.getRotationCode() || "");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [gamification, setGamification] = useState({ points: 0, achievements: [], streaks: { currentDays: 0, longestDays: 0, lastActiveDate: null } });
  const [toast, setToast] = useState(null);
  const [sharedSettings, setSharedSettings] = useState(null);
  const [completedItems, setCompletedItems] = useState({ articles: {}, studySheets: {} });
  const syncTimerRef = useRef(null);
  const lastLocalWriteRef = useRef(0);

  // Deterministic student ID from name + PIN
  const makeStudentId = (name, pin) => {
    const normalized = name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    return `stu_${normalized}_${pin}`;
  };

  // Load from storage on mount
  useEffect(() => {
    ensureGoogleFonts();
    ensureLayoutStyles();
    (async () => {
      const name = await store.get("neph_name");
      const pin = await store.get("neph_pin");
      const sidFromStore = await store.get("neph_studentId");
      const pts = await store.get("neph_patients");
      const ws = await store.get("neph_weeklyScores");
      const pre = await store.get("neph_preScore");
      const post = await store.get("neph_postScore");

      const sharedCurriculum = await store.getShared(SHARED_KEYS.curriculum);
      const sharedArticles = await store.getShared(SHARED_KEYS.articles);
      const sharedAnnouncements = await store.getShared(SHARED_KEYS.announcements);
      const sharedSettingsData = await store.getShared(SHARED_KEYS.settings);

      if (sidFromStore) setStudentId(sidFromStore);
      if (name) { setStudentName(name); setNameSet(true); }
      if (pin) setStudentPin(pin);
      if (pts) setPatients(pts);
      if (ws) setWeeklyScores(ws);
      if (pre) setPreScore(pre);
      if (post) setPostScore(post);
      if (sharedCurriculum) setCurriculum(sharedCurriculum);
      if (sharedArticles) setArticles(sharedArticles);
      if (sharedAnnouncements) setAnnouncements(sharedAnnouncements);
      if (sharedSettingsData) setSharedSettings(sharedSettingsData);
      const completed = await store.get("neph_completedItems");
      if (completed) setCompletedItems(completed);
      const savedGamification = await store.get("neph_gamification");
      if (savedGamification) setGamification(savedGamification);
      setLoading(false);
    })();
  }, []);

  // Save on changes (consolidated)
  useEffect(() => {
    if (loading) return;
    store.set("neph_patients", patients);
    store.set("neph_weeklyScores", weeklyScores);
    if (preScore) store.set("neph_preScore", preScore);
    if (postScore) store.set("neph_postScore", postScore);
    if (nameSet) store.set("neph_name", studentName);
    store.set("neph_completedItems", completedItems);
    store.set("neph_gamification", gamification);

    // Auto-sync to Firestore (debounced)
    if (store.getRotationCode()) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        lastLocalWriteRef.current = Date.now();
        store.setStudentData(studentId, {
          name: studentName,
          patients,
          weeklyScores,
          preScore,
          postScore,
          gamification,
          completedItems,
          updatedAt: new Date().toISOString(),
        });
      }, 2000);
    }
  }, [patients, weeklyScores, preScore, postScore, studentName, nameSet, loading, completedItems, gamification]);

  // Gamification recompute
  useEffect(() => {
    if (loading || !nameSet) return;
    const state = { patients, weeklyScores, preScore, postScore, gamification, completedItems };
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
      // Show toast for newly earned achievements
      if (newlyEarned.length > 0) {
        const achieved = ACHIEVEMENTS.find(a => a.id === newlyEarned[0]);
        if (achieved) {
          setToast(`${achieved.icon} ${achieved.title} earned!`);
          setTimeout(() => setToast(null), 3000);
        }
      }
    }
  }, [patients, weeklyScores, preScore, postScore, nameSet, loading, completedItems]);

  // Real-time rotation data listener
  useEffect(() => {
    if (!store.getRotationCode()) return;
    const unsub = store.onRotationChanged((data) => {
      if (data.curriculum) setCurriculum(data.curriculum);
      if (data.articles) setArticles(data.articles);
      if (data.announcements) setAnnouncements(data.announcements);
      if (data.settings) setSharedSettings(data.settings);
    });
    return () => unsub();
  }, [rotationCode]);

  // Real-time listener: admin changes to this student's data
  useEffect(() => {
    if (!store.getRotationCode() || !studentId || !nameSet) return;
    const unsub = store.onStudentDataChanged(studentId, (data) => {
      // Skip snapshots triggered by our own writes (within 3s)
      if (Date.now() - lastLocalWriteRef.current < 3000) return;
      if (data.patients) setPatients(data.patients);
      if (data.weeklyScores) setWeeklyScores(data.weeklyScores);
      if (data.preScore) setPreScore(data.preScore);
      if (data.postScore) setPostScore(data.postScore);
      if (data.notes !== undefined) {
        // Store admin notes locally so student can see them
        store.set("neph_adminNotes", data.notes);
      }
    });
    return () => unsub();
  }, [studentId, nameSet, rotationCode]);

  const navigate = (t, sv = null) => { setTab(t); setSubView(sv); };

  const refreshSharedContent = async () => {
    const sharedCurriculum = await store.getShared(SHARED_KEYS.curriculum);
    const sharedArticles = await store.getShared(SHARED_KEYS.articles);
    const sharedAnnouncements = await store.getShared(SHARED_KEYS.announcements);
    if (sharedCurriculum) setCurriculum(sharedCurriculum);
    if (sharedArticles) setArticles(sharedArticles);
    if (sharedAnnouncements) setAnnouncements(sharedAnnouncements);
    setLastSharedAt(new Date().toISOString());
  };

  const shareProgressUpdate = async () => {
    if (!studentId) {
      alert("Student ID not ready yet. Please try again in a moment.");
      return;
    }

    const snapshot = {
      version: 1,
      studentId,
      name: studentName,
      patients,
      weeklyScores,
      preScore,
      postScore,
      updatedAt: new Date().toISOString(),
    };

    await store.setShared(`${SHARED_KEYS.studentPrefix}${studentId}`, snapshot);
    setLastSharedAt(snapshot.updatedAt);
    alert("Progress shared with attending.");
  };

  const handleJoinRotation = async () => {
    if (!studentName.trim() || studentPin.length !== 4 || joinCode.length < 4) return;
    setJoining(true);
    setJoinError("");
    try {
      const exists = await store.validateRotationCode(joinCode);
      if (!exists) {
        setJoinError("Rotation not found. Check the code and try again.");
        setJoining(false);
        return;
      }
      // Set rotation code first so store methods work
      store.setRotationCode(joinCode);
      setRotationCodeState(joinCode);

      // Compute deterministic student ID
      const sid = makeStudentId(studentName, studentPin);
      setStudentId(sid);

      // Check if this student already exists (returning student)
      const existingData = await store.getStudentData(sid);
      if (existingData) {
        // Restore their data
        if (existingData.patients) setPatients(existingData.patients);
        if (existingData.weeklyScores) setWeeklyScores(existingData.weeklyScores);
        if (existingData.preScore) setPreScore(existingData.preScore);
        if (existingData.postScore) setPostScore(existingData.postScore);
        if (existingData.gamification) setGamification(existingData.gamification);
        if (existingData.completedItems) setCompletedItems(existingData.completedItems);
      } else {
        // New student — create their Firestore doc
        await store.setStudentData(sid, {
          name: studentName,
          patients,
          weeklyScores,
          preScore,
          postScore,
          gamification,
          joinedAt: new Date().toISOString(),
          status: "active",
        });
      }

      // Persist locally
      setNameSet(true);
      if (!localStorage.getItem("neph_hasSeenOnboarding")) setShowOnboarding(true);
      await store.set("neph_name", studentName);
      await store.set("neph_pin", studentPin);
      await store.set("neph_studentId", sid);
    } catch {
      setJoinError("Connection error. Check your internet and try again.");
    }
    setJoining(false);
  };

  const handleSkipRotation = () => {
    if (!studentName.trim()) return;
    // Offline mode: generate a simple ID, no PIN needed
    const sid = `stu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setStudentId(sid);
    setRotationCodeState("_skip");
    setNameSet(true);
    if (!localStorage.getItem("neph_hasSeenOnboarding")) setShowOnboarding(true);
    store.set("neph_name", studentName);
    store.set("neph_studentId", sid);
  };

  const handleLogout = () => {
    // Clear all local data
    clearTimeout(syncTimerRef.current);
    ["neph_name", "neph_pin", "neph_studentId", "neph_patients", "neph_weeklyScores", "neph_preScore", "neph_postScore", "neph_rotationCode", "neph_completedItems", "neph_gamification"].forEach(k => localStorage.removeItem(k));
    store.setRotationCode(null);
    // Reset all state
    setStudentName("");
    setStudentPin("");
    setStudentId("");
    setNameSet(false);
    setRotationCodeState("");
    setJoinCode("");
    setJoinError("");
    setPatients([]);
    setWeeklyScores({});
    setPreScore(null);
    setPostScore(null);
    setGamification({ points: 0, achievements: [], streaks: { currentDays: 0, longestDays: 0, lastActiveDate: null } });
    setCompletedItems({ articles: {}, studySheets: {} });
    setToast(null);
    setTab("home");
    setSubView(null);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: T.pale, fontFamily: T.serif, fontSize: 18 }}>Loading...</div>
    </div>
  );

  // Combined onboarding screen (name + PIN + rotation code)
  if (!nameSet) {
    const canJoin = studentName.trim() && studentPin.length === 4 && joinCode.length >= 4;
    const canSkip = studentName.trim();
    return (
      <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${T.navy} 0%, ${T.deep} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: T.sans }}>
        <div style={{ background: T.card, borderRadius: 16, padding: 28, maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 13, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 26 }}>🫘</div>
            <h1 style={{ color: T.navy, fontFamily: T.serif, fontSize: 21, margin: "0 0 4px", fontWeight: 700 }}>Nephrology Rotation</h1>
            <p style={{ color: T.sub, fontSize: 13, margin: "0 0 6px" }}>Teaching App for MS3 / MS4 Students</p>
            <p style={{ color: T.muted, fontSize: 11, margin: "0 0 20px" }}>4-Week Curriculum • Quizzes • Quick References • Journal Articles</p>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: T.sub, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>Your Name</label>
            <input
              type="text" placeholder="e.g. Glen Merulus"
              value={studentName} onChange={e => setStudentName(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: `2px solid ${T.pale}`, borderRadius: 8, outline: "none", boxSizing: "border-box", fontFamily: T.sans }}
              onFocus={e => e.target.style.borderColor = T.med}
              onBlur={e => e.target.style.borderColor = T.pale}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: T.sub, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>4-Digit PIN</label>
              <input
                type="password" inputMode="numeric" placeholder="••••" maxLength={4}
                value={studentPin} onChange={e => setStudentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                style={{ width: "100%", padding: "10px 12px", fontSize: 16, border: `2px solid ${T.pale}`, borderRadius: 8, outline: "none", boxSizing: "border-box", fontFamily: T.mono, textAlign: "center", letterSpacing: 6 }}
                onFocus={e => e.target.style.borderColor = T.med}
                onBlur={e => e.target.style.borderColor = T.pale}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: T.sub, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>Rotation Code</label>
              <input
                placeholder="e.g. NEPH3K"
                value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase().slice(0, 6)); setJoinError(""); }}
                onKeyDown={e => { if (e.key === "Enter" && canJoin) handleJoinRotation(); }}
                maxLength={6}
                style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: `2px solid ${joinError ? T.accent : T.pale}`, borderRadius: 8, outline: "none", boxSizing: "border-box", fontFamily: T.mono, textAlign: "center", letterSpacing: 3, textTransform: "uppercase" }}
                onFocus={e => e.target.style.borderColor = T.med}
                onBlur={e => e.target.style.borderColor = joinError ? T.accent : T.pale}
              />
            </div>
          </div>

          <p style={{ fontSize: 11, color: T.muted, margin: "0 0 12px", lineHeight: 1.5 }}>
            Choose a PIN if new. Use your existing PIN to resume your progress on any device.
          </p>

          {joinError && <p style={{ color: T.accent, fontSize: 12, margin: "0 0 12px", fontWeight: 600, textAlign: "center" }}>{joinError}</p>}

          <button
            onClick={handleJoinRotation}
            disabled={!canJoin || joining}
            style={{ width: "100%", padding: "12px 0", background: canJoin && !joining ? T.med : T.muted, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: canJoin && !joining ? "pointer" : "default", marginBottom: 10, opacity: canJoin && !joining ? 1 : 0.6 }}>
            {joining ? "Joining..." : "Join Rotation"}
          </button>
          <button
            onClick={handleSkipRotation}
            disabled={!canSkip}
            style={{ width: "100%", background: "none", border: "none", color: T.sub, fontSize: 12, cursor: canSkip ? "pointer" : "default", textDecoration: "underline", padding: "8px 0" }}>
            Use without rotation (offline only)
          </button>
        </div>
      </div>
    );
  }

  // Tab data
  const tabs = [
    { id: "home", icon: "📚", label: "Learn" },
    { id: "guide", icon: "🩺", label: "Guide" },
    { id: "refs", icon: "⚡", label: "Refs" },
    { id: "patients", icon: "🏥", label: "Rounds" },
    { id: "team", icon: "👥", label: "Team" },
    { id: "progress", icon: "📊", label: "Progress" },
  ];

  // Compute current rotation week from admin settings
  const currentWeek = (() => {
    if (!sharedSettings?.rotationStart) return null;
    const start = new Date(sharedSettings.rotationStart + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null;
    const week = Math.floor(diffDays / 7) + 1;
    const totalWeeks = parseInt(sharedSettings.duration || "4", 10);
    if (week > totalWeeks) return null;
    return Math.min(week, 4);
  })();

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.sans }}>
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: T.green, color: "white", padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", animation: "fadeIn 0.3s ease" }}>
          {toast}
        </div>
      )}
      {showOnboarding && <OnboardingOverlay onDismiss={() => setShowOnboarding(false)} />}
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${T.navy} 0%, ${T.deep} 100%)`, padding: `calc(10px + env(safe-area-inset-top, 0px)) 16px 10px`, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "white", fontFamily: T.serif, fontSize: 17, fontWeight: 700 }}>Nephrology Rotation</span>
              {gamification.points > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: T.orange, background: T.gold + "22", padding: "2px 8px", borderRadius: 12 }}>
                  {getLevel(gamification.points).icon} {gamification.points}
                </span>
              )}
            </div>
            <div style={{ color: T.pale, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{studentName}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {onAdminToggle && (
              <button onClick={onAdminToggle} style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "white", fontSize: 11, padding: "5px 10px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }} title="Admin">⚙</button>
            )}
            <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: T.muted, fontSize: 10, padding: "5px 8px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="tab-content-enter" key={tab + (subView ? JSON.stringify(subView) : "")} style={{ padding: `0 0 ${T.navH + T.navPad}px` }}>
        {tab === "home" && !subView && <HomeTab navigate={navigate} preScore={preScore} postScore={postScore} curriculum={curriculum} articles={articles} announcements={announcements} currentWeek={currentWeek} weeklyScores={weeklyScores} completedItems={completedItems} />}
        {tab === "home" && subView?.type === "weeklyQuiz" && (
          <QuizEngine questions={WEEKLY_QUIZZES[subView.week]} title={`Week ${subView.week} Quiz`}
            onBack={() => navigate("home")}
            onFinish={(score) => { setWeeklyScores(prev => ({...prev, [subView.week]: [...(prev[subView.week]||[]), score]})); navigate("home"); }} />
        )}
        {tab === "home" && subView?.type === "reviewMissed" && (() => {
          const ws = weeklyScores[subView.week] || [];
          const latest = ws[ws.length - 1];
          const missed = (latest?.answers || []).filter(a => !a.correct);
          const missedQuestions = missed.map(a => WEEKLY_QUIZZES[subView.week][a.qIdx]);
          return missedQuestions.length > 0 ? (
            <QuizEngine questions={missedQuestions} title={`Week ${subView.week} — Review Missed`}
              onBack={() => navigate("home")}
              onFinish={() => navigate("home")} />
          ) : null;
        })()}
        {tab === "home" && subView?.type === "preQuiz" && (
          <QuizEngine questions={PRE_QUIZ} title="Pre-Rotation Assessment"
            onBack={() => navigate("home")}
            onFinish={(score) => { setPreScore(score); navigate("home", { type: "preResults" }); }} />
        )}
        {tab === "home" && subView?.type === "preResults" && (
          <PreTestResultsView preScore={preScore} navigate={navigate} />
        )}
        {tab === "home" && subView?.type === "postQuiz" && (
          <QuizEngine questions={POST_QUIZ} title="Post-Rotation Assessment"
            onBack={() => navigate("home")}
            onFinish={(score) => { setPostScore(score); navigate("home"); }} />
        )}
        {tab === "home" && subView?.type === "articles" && (
          <ArticlesView week={subView.week} onBack={() => navigate("home")} curriculum={curriculum} articles={articles} completedItems={completedItems} onToggleComplete={(url) => {
            setCompletedItems(prev => {
              const next = { ...prev, articles: { ...prev.articles } };
              if (next.articles[url]) delete next.articles[url];
              else next.articles[url] = true;
              return next;
            });
          }} />
        )}
        {tab === "home" && subView?.type === "trials" && (
          <LandmarkTrialsView week={subView.week} onBack={() => navigate("home")} />
        )}
        {tab === "home" && subView?.type === "studySheets" && (
          <StudySheetsView week={subView.week} onBack={() => navigate("home")} completedItems={completedItems} onToggleComplete={(sheetId) => {
            setCompletedItems(prev => {
              const next = { ...prev, studySheets: { ...prev.studySheets } };
              if (next.studySheets[sheetId]) delete next.studySheets[sheetId];
              else next.studySheets[sheetId] = true;
              return next;
            });
          }} />
        )}
        {tab === "home" && subView?.type === "resources" && (
          <ResourcesView onBack={() => navigate("home")} />
        )}
        {tab === "home" && subView?.type === "abbreviations" && (
          <AbbreviationsView onBack={() => navigate("home")} />
        )}
        {tab === "refs" && !subView && <RefsTab navigate={navigate} />}
        {tab === "refs" && subView?.type === "refDetail" && (
          <RefDetailView refId={subView.id} onBack={() => navigate("refs")} />
        )}
        {tab === "guide" && <GuideTab navigate={navigate} subView={subView} />}
        {tab === "patients" && <PatientTab patients={patients} setPatients={setPatients} studentName={studentName} />}
        {tab === "team" && <TeamTab currentStudentId={studentId} />}
        {tab === "progress" && <ProgressTab patients={patients} weeklyScores={weeklyScores} preScore={preScore} postScore={postScore} curriculum={curriculum} gamification={gamification} />}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "white", borderTop: `1px solid ${T.line}`, display: "flex", zIndex: 100, boxShadow: "0 -2px 12px rgba(0,0,0,0.06)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => navigate(t.id)}
              style={{ flex: 1, padding: "8px 0 6px", background: active ? T.ice : "none", border: "none", borderRadius: active ? 12 : 0, margin: "4px 2px", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                color: active ? T.med : T.sub,
                transition: "background 0.15s ease, color 0.15s ease",
              }}>
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
//  Home Tab & Articles View
// ═══════════════════════════════════════════════════════════════════════

const backBtnStyle = { background: "none", border: "none", color: T.med, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 12, padding: 0, fontWeight: 600 };

const PRO_TIPS = [
  // Secrets 1-17: Patient Assessment & AKI
  "A spot urine protein-to-creatinine ratio correlates well with a 24-hour collection — use it as a quick quantitative screen.",
  "Bleeding is the most common kidney biopsy complication, but it's usually self-limited and rarely life-threatening.",
  "AKI differential: prerenal (perfusion problem), intrinsic (kidney damage), or postrenal (obstruction). Always think in three buckets.",
  "Hepatorenal syndrome is functional kidney failure in decompensated liver disease — the kidneys themselves are structurally normal.",
  "HRS treatment: albumin + vasoconstrictors (midodrine/octreotide or terlipressin), but liver transplant is the definitive cure.",
  "Drug-induced AKI is extremely common. Always do a thorough med review — NSAIDs, ACEi/ARBs, aminoglycosides, and contrast are frequent culprits.",
  "Sepsis is one of the leading causes of AKI in the ICU and carries a high mortality rate.",
  "In sepsis, rapid administration of appropriate antibiotics (< 3 hours) is associated with improved kidney and overall outcomes.",
  "In rhabdomyolysis/crush injury, early aggressive IV fluids — even before extrication — are critical for preventing AKI.",
  "Rhabdomyolysis-induced AKI typically occurs when CK exceeds 10,000 U/L. Volume resuscitation is the cornerstone of prevention.",
  "Acute GN presents with the classic nephritic syndrome: edema, new or worsening HTN, and active urine sediment with RBC casts.",
  "RPGN (rapidly progressive GN) causes kidney function loss over days to weeks — without urgent treatment it often leads to ESKD.",
  "Primary nephrotic syndrome: minimal change disease, FSGS, membranous nephropathy, or MPGN. Diagnosis requires biopsy, clinical features, labs, and genetic testing.",
  "After relieving urinary obstruction, watch for post-obstructive diuresis — check electrolytes frequently and replace fluids appropriately.",
  "Struvite stones are caused by urease-producing bacteria, especially Proteus mirabilis. E. coli almost never produces urease.",
  "Uric acid stones are radiolucent on plain X-ray but readily visible on CT scan — always use CT for stone evaluation.",
  "Uric acid stones form in acidic urine — the primary treatment is urinary alkalinization with potassium citrate, not allopurinol.",
  // Secrets 18-26: CKD & Management
  "Enteric hyperoxaluria requires an intact colon — it results from increased oxalate absorption in the setting of fat malabsorption.",
  "Low-calcium diets are NOT recommended for calcium stone formers — they can worsen bone health without reducing stone formation.",
  "Leading causes of CKD: diabetes (~40%), hypertension, glomerulonephritis, and polycystic kidney disease.",
  "ESA therapy: target hemoglobin should be individualized and should not exceed 12 g/dL. Higher targets increase cardiovascular risk.",
  "Most patients on ESAs need iron supplementation. Oral iron often fails due to poor absorption — IV iron is frequently necessary.",
  "CKD-MBD involves abnormal calcium, phosphorus, PTH, and vitamin D metabolism, leading to bone disease and vascular calcification.",
  "Cardiovascular disease is the #1 cause of death in CKD. Traditional CV risk factors behave differently in this population — study the evidence carefully.",
  "Dyslipidemia is nearly universal in CKD. KDIGO recommends statins for all CKD patients over 50 and all kidney transplant recipients.",
  "Plan vascular access early in progressive CKD — an AV fistula needs several months to mature before it can be used for hemodialysis.",
  // Secrets 27-34: Glomerular Disease
  "Minimal change disease is the #1 cause of nephrotic syndrome in children. In adults it's the third most common, after membranous and FSGS.",
  "Categorizing FSGS as genetic, secondary, or primary guides treatment decisions and helps predict posttransplant recurrence risk.",
  "High-risk APOL1 genotypes are associated with a greater risk of FSGS progression to ESKD.",
  "Membranous nephropathy: ~80% of primary cases have anti-PLA₂R antibodies. Always rule out secondary causes like malignancy, hepatitis B, and lupus.",
  "IgA nephropathy is the most common primary GN worldwide — a nephritic syndrome with outcomes ranging from benign hematuria to RPGN.",
  "MPGN results from immune complex deposition or complement dysregulation. It can progress to ESKD over 10-15 years.",
  "There is no proven therapy for MPGN, and it recurs in up to 30% of kidney transplant recipients.",
  "Diabetic retinopathy is present in almost all type 1 diabetics with nephropathy. If absent, consider an alternative diagnosis.",
  // Secrets 35-42: Lupus, Vasculitis, Infections
  "In lupus nephritis, early diagnosis is key — kidney function at biopsy correlates strongly with remission rates.",
  "ANCAs are present in ~90% of pauci-immune GN and are directly pathogenic. c-ANCA → GPA, p-ANCA → MPA.",
  "ANCA vasculitis induction: steroids + cyclophosphamide or rituximab. Consider plasma exchange for severe pulmonary hemorrhage or advanced kidney failure.",
  "Post-infectious GN occurs 1-3 weeks after streptococcal pharyngitis (longer for skin infections). It's usually self-limiting and doesn't require immunosuppression.",
  "In GN workup, always check hepatitis B status — HBeAg positivity predicts the type of glomerular disease and carries a higher kidney disease risk.",
  "Hepatitis C-related GN: think type 2 cryoglobulinemia with low C3/C4 (classical complement activation) and MPGN pattern on biopsy.",
  "HIVAN occurs almost exclusively in Black patients with high-risk APOL1 genotypes — collapsing FSGS on biopsy is the classic finding.",
  "HAART is the primary treatment for HIVAN and can produce histologic reversal, but it's less effective for HIV immune complex disease (HIVICK).",
  // Secrets 43-53: Oncology, TMA, Genetic
  "Both rhabdomyolysis and tumor lysis syndrome cause the same electrolyte storm: hyperK, hyperPhos, hypoCa, and hyperuricemia.",
  "Rasburicase rapidly lowers uric acid and is the key agent for preventing AKI in tumor lysis syndrome.",
  "Myeloma cast nephropathy is a medical emergency — delay in diagnosis and treatment leads to irreversible kidney failure.",
  "In myeloma, light chains (not heavy chains) cause kidney damage. They're freely filtered at the glomerulus and are toxic to the proximal tubule.",
  "Bortezomib-based chemotherapy is the preferred regimen for AKI secondary to myeloma cast nephropathy.",
  "Serum-free light chains are the preferred initial study when suspecting myeloma kidney — more sensitive than SPEP alone.",
  "Amyloidosis typically presents with nephrotic syndrome and edema — always consider it in unexplained nephrotic-range proteinuria.",
  "Renal cell carcinoma treatments can be nephrotoxic: VEGF inhibitors → proteinuria, PD-1 inhibitors → autoimmune nephritis, nephrectomy → reduced nephron mass.",
  "TMAs present with microangiopathic hemolytic anemia, thrombocytopenia, and kidney dysfunction. Major causes: Shiga toxin-HUS, aHUS, and TTP.",
  "Fabry disease is an underrecognized X-linked lysosomal storage disease in ~0.2% of ESKD patients. Suspect it in males with low alpha-galactosidase A.",
  "Alport syndrome: X-linked collagen IV mutation causing microscopic hematuria, proteinuria, sensorineural hearing loss, and progressive kidney failure.",
  // Secrets 54-60: AIN, Pregnancy, Sickle Cell
  "Thin basement membrane nephropathy (TBMN) is benign — microscopic hematuria without proteinuria, hearing loss, or progressive kidney failure.",
  "The classic AIN triad (fever, rash, eosinophilia) is present in < 10% of cases. Don't rely on its absence to rule out AIN.",
  "Drug-induced ATN is NOT dose-dependent. Re-exposure to the same offending drug can trigger recurrence.",
  "Asymptomatic bacteriuria only needs treatment in two situations: pregnancy and before urologic procedures.",
  "During pregnancy, GFR increases by ~50%. A 'normal' creatinine in a pregnant patient may actually indicate kidney dysfunction.",
  "Prepregnancy kidney function is the single best predictor of maternal and fetal outcomes in women with preexisting kidney disease.",
  "Sickle cell patients are particularly vulnerable to AKI from hemodynamic insults, pyelonephritis, toxins, and urinary tract obstruction.",
  // Secrets 61-71: Dialysis & Transplant
  "Uremic toxin removal in dialysis depends on three factors: time on dialysis, dialysate flow rate, and dialyzer membrane efficiency.",
  "For thrice-weekly HD, minimum single-pool Kt/V is 1.2 with a minimum session time of 3 hours (if residual kidney function < 2 mL/min).",
  "Home hemodialysis offers real benefits over in-center: better volume/BP control, improved phosphorus levels, less LV hypertrophy, and better quality of life.",
  "'PD First' — starting with peritoneal dialysis offers survival benefits, especially when hemodialysis access isn't ready.",
  "A high serum creatinine in an ESKD patient meeting dialysis adequacy targets may reflect greater muscle mass — and is actually associated with better outcomes.",
  "Reducing PD peritonitis requires a team approach: regular audits, quality improvement initiatives, and ongoing training for both patients and staff.",
  "For ANCA vasculitis with severe pulmonary hemorrhage or advanced kidney failure, add plasma exchange to steroids + cyclophosphamide.",
  "The kidney transplant allocation system uses estimated posttransplant survival score and kidney donor profile index (KDPI) to match donors and recipients.",
  "Median wait time for a kidney transplant in the US is approximately 3.6 years.",
  "Living donor kidney transplant offers the best long-term outcomes for ESKD patients — always discuss it early.",
  "Calcineurin inhibitors (tacrolimus > cyclosporine) are the backbone of transplant immunosuppression. They block T-cell activation via the calcineurin/signal 3 pathway.",
  // Secrets 72-75: Transplant Complications
  "Chronic antibody-mediated rejection is the main cause of late allograft loss. It presents histologically as transplant glomerulopathy.",
  "EBV is found in ~2/3 of patients with posttransplant lymphoproliferative disorder (PTLD). Reducing immunosuppression is the initial treatment.",
  "BK virus nephropathy: plasma BK DNA PCR has 100% sensitivity and 88% specificity, but biopsy may still be needed to confirm the diagnosis.",
  "Proteinuria after kidney transplant is associated with cardiovascular events and increased mortality — monitor it regularly.",
  // Secrets 76-84: Hypertension
  "BP target < 140/90 for most adults, but < 130/80 for those with < 10% 10-year CV risk.",
  "No randomized trial has clearly shown that revascularization beats medical management for atherosclerotic renal artery stenosis.",
  "About 20% of patients with resistant hypertension have an identifiable secondary cause that may be treatable or even curable.",
  "Obstructive sleep apnea is one of the most common causes of secondary HTN (~20%). Treating it improves both BP and quality of life.",
  "Hypertensive emergencies cause acute target-organ damage. Reduce BP gradually over minutes to hours — don't slam it to normal.",
  "First-line antihypertensives: thiazide-like diuretic, ACE inhibitor, ARB, or calcium channel blocker.",
  "Spironolactone is highly effective for treatment-resistant HTN but requires careful monitoring of potassium and kidney function.",
  "Sodium restriction to ~1000 mg/day reduces CV events by ~25%. Every additional 1000 mg/day raises stroke, MI, and heart failure risk by 10%.",
  "The DASH diet combined with sodium restriction (1.5 g/day) can lower systolic BP by approximately 9 mmHg.",
  // Secrets 85-92: Acid-Base & Sodium
  "Diuretics in COPD/cor pulmonale can cause contraction alkalosis. Acetazolamide helps correct the alkalosis and may improve ventilation.",
  "In metabolic alkalosis with volume contraction, urine sodium may be misleadingly normal — urine chloride < 15 mEq/L is the more reliable marker.",
  "Unexplained hypokalemia or bicarb abnormalities with difficult-to-treat HTN → workup for secondary causes like primary aldosteronism.",
  "Hypotonic hyponatremia: inadequate solute intake, excess free water intake, or impaired free water excretion. Urine osmolality helps distinguish them.",
  "Acute hyponatremia can be corrected faster, but chronic hyponatremia must be corrected slowly (≤ 8 mEq/L per 24h) to prevent osmotic demyelination.",
  "In severely symptomatic hyponatremia, raising Na⁺ by just 3-4 mEq/L with 100 mL boluses of 3% saline can stop seizures and herniation.",
  "Prediction formulas for sodium correction don't account for ongoing water losses — always measure serum sodium frequently to avoid overcorrection.",
  "When in doubt, assume hyponatremia is chronic — especially for patients presenting from outside the hospital with no clear time of onset.",
  // Secrets 93-100: Potassium, Phosphorus, Acid-Base, Palliative
  "The definitive ways to remove potassium from the body: hemodialysis or increasing fecal excretion with potassium binders.",
  "IV calcium in hyperkalemia stabilizes the myocardium but does NOT lower K⁺ — it buys time while you give definitive K⁺-lowering therapies.",
  "Hyperphosphatemia with normal kidney function? Think: excessive intake, cellular breakdown (rhabdo/TLS), or hypoparathyroidism.",
  "Always check and correct magnesium in refractory hypokalemia — low Mg makes K⁺ correction nearly impossible.",
  "Surviving Sepsis guidelines recommend against routine bicarb for pH ≥ 7.15 and express uncertainty about benefit at lower pH values.",
  "Measuring urine chloride is an excellent first step in evaluating metabolic alkalosis — it helps classify as chloride-responsive vs. resistant.",
  "Hypokalemia plays a key role in maintaining metabolic alkalosis — you must correct the K⁺ deficit to successfully fix the alkalosis.",
  "Palliative care is appropriate at any stage of serious illness, not just at end of life. It's distinct from hospice, which requires a prognosis < 6 months.",
];

// Map PRE_QUIZ question indices → week numbers
// W1: 0-6 (7 Qs), W2: 7-13 (7 Qs), W3: 14-19 (6 Qs), W4: 20-24 (5 Qs)
const PRE_QUIZ_WEEK_MAP = [
  ...Array(7).fill(1),  // indices 0-6
  ...Array(7).fill(2),  // indices 7-13
  ...Array(6).fill(3),  // indices 14-19
  ...Array(5).fill(4),  // indices 20-24
];

function WeakAreasCard({ preScore, navigate }) {
  if (!preScore?.answers || preScore.answers.length === 0) return null;

  // Tally correct/total per week
  const weekStats = { 1: { correct: 0, total: 0 }, 2: { correct: 0, total: 0 }, 3: { correct: 0, total: 0 }, 4: { correct: 0, total: 0 } };
  preScore.answers.forEach(a => {
    const wk = PRE_QUIZ_WEEK_MAP[a.qIdx];
    if (!wk) return;
    weekStats[wk].total++;
    if (a.correct) weekStats[wk].correct++;
  });

  // Calculate pct per week and sort weakest first
  const weekResults = [1, 2, 3, 4].map(w => ({
    week: w,
    correct: weekStats[w].correct,
    total: weekStats[w].total,
    pct: weekStats[w].total > 0 ? Math.round((weekStats[w].correct / weekStats[w].total) * 100) : 100,
  })).sort((a, b) => a.pct - b.pct);

  const weekTitles = { 1: "Foundations", 2: "Electrolytes & Acid-Base", 3: "Glomerular Disease & CKD", 4: "Therapeutics & Integration" };
  const weekIcons = { 1: "🔬", 2: "⚗️", 3: "🧫", 4: "💊" };

  // Identify weak weeks (below 60%) and moderate (60-79%)
  const weak = weekResults.filter(w => w.pct < 60);
  const moderate = weekResults.filter(w => w.pct >= 60 && w.pct < 80);
  const strong = weekResults.filter(w => w.pct >= 80);

  // Overall score
  const overallPct = Math.round((preScore.correct / preScore.total) * 100);

  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ color: T.text, fontSize: 16, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>
        📊 Your Focus Areas
      </h2>
      <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.line}`, overflow: "hidden" }}>
        {/* Overall score banner */}
        <div style={{ background: overallPct >= 80 ? "linear-gradient(135deg, rgba(26,188,156,0.08), rgba(26,188,156,0.02))" : overallPct >= 60 ? T.ice : "linear-gradient(135deg, rgba(231,76,60,0.06), rgba(231,76,60,0.02))", padding: "14px 16px", borderBottom: `1px solid ${T.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5 }}>Pre-Test Score</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: overallPct >= 80 ? T.green : overallPct >= 60 ? T.med : T.accent, fontFamily: T.mono }}>{overallPct}%</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: T.sub }}>{preScore.correct}/{preScore.total} correct</div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>
              {weak.length > 0 ? `${weak.length} area${weak.length > 1 ? "s" : ""} to focus on` : moderate.length > 0 ? "Looking good — polish a few spots" : "Strong foundation! 🎉"}
            </div>
          </div>
        </div>

        {/* Per-week breakdown */}
        <div style={{ padding: "12px 16px" }}>
          {weekResults.map(w => {
            const barColor = w.pct >= 80 ? T.green : w.pct >= 60 ? T.gold : T.accent;
            const bgTint = w.pct >= 80 ? "rgba(26,188,156,0.06)" : w.pct >= 60 ? "rgba(243,156,18,0.06)" : "rgba(231,76,60,0.06)";
            const statusLabel = w.pct >= 80 ? "Strong" : w.pct >= 60 ? "Review" : "Focus";
            return (
              <button key={w.week} onClick={() => navigate("home", { type: "weeklyQuiz", week: w.week })}
                style={{ width: "100%", background: bgTint, border: "none", borderRadius: 10, padding: "10px 12px", marginBottom: 8, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{weekIcons[w.week]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.navy }}>Wk {w.week}: {weekTitles[w.week]}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: barColor, flexShrink: 0 }}>{statusLabel} · {w.pct}%</div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 5, background: "rgba(0,0,0,0.06)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${w.pct}%`, background: barColor, borderRadius: 3, transition: "width 0.4s ease" }} />
                  </div>
                  <div style={{ fontSize: 10, color: T.sub, marginTop: 3 }}>{w.correct}/{w.total} correct · Tap to practice</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Recommendation */}
        {weak.length > 0 && (
          <div style={{ padding: "0 16px 14px" }}>
            <div style={{ background: "rgba(231,76,60,0.06)", borderRadius: 10, padding: "10px 14px", borderLeft: `3px solid ${T.accent}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, marginBottom: 3 }}>💡 Recommendation</div>
              <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5 }}>
                Start with <span style={{ fontWeight: 700 }}>Week {weak[0].week}: {weekTitles[weak[0].week]}</span> — review the study sheets and articles, then retake the weekly quiz to solidify your understanding.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PreTestResultsView({ preScore, navigate }) {
  const [showMissed, setShowMissed] = useState(false);

  if (!preScore) return null;

  const missed = preScore.answers ? preScore.answers.filter(a => !a.correct) : [];
  const overallPct = Math.round((preScore.correct / preScore.total) * 100);

  return (
    <div style={{ padding: 16 }}>
      {/* Back button */}
      <button onClick={() => navigate("home")} style={backBtnStyle}>← Back to Home</button>

      {/* Score header */}
      <div style={{ background: T.card, borderRadius: 16, padding: 28, textAlign: "center", border: `1px solid ${T.line}`, marginBottom: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{overallPct >= 80 ? "🎉" : overallPct >= 60 ? "👍" : "📖"}</div>
        <h2 style={{ color: T.navy, fontFamily: T.serif, margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>Pre-Rotation Assessment</h2>
        <div style={{ fontSize: 40, fontWeight: 700, color: overallPct >= 80 ? T.green : overallPct >= 60 ? T.gold : T.accent, fontFamily: T.mono }}>
          {preScore.correct}/{preScore.total}
        </div>
        <div style={{ color: T.sub, fontSize: 14, marginBottom: 4 }}>{overallPct}% correct</div>
        {preScore.date && <div style={{ color: T.muted, fontSize: 11 }}>Taken {new Date(preScore.date).toLocaleDateString()}</div>}
      </div>

      {/* Weak Areas Breakdown */}
      {preScore.answers && preScore.answers.length > 0 && (
        <WeakAreasCard preScore={preScore} navigate={navigate} />
      )}

      {/* Missed Questions */}
      {missed.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <button onClick={() => setShowMissed(!showMissed)}
            style={{ width: "100%", background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, fontFamily: T.serif }}>
              Review Missed Questions ({missed.length})
            </div>
            <span style={{ color: T.med, fontSize: 16, transition: "transform 0.2s", transform: showMissed ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
          </button>
          {showMissed && (
            <div style={{ marginTop: 10 }}>
              {missed.map((a, i) => (
                <div key={i} style={{ background: "#FDF2F2", borderRadius: 10, padding: 14, marginBottom: 10, borderLeft: `3px solid ${T.accent}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8, lineHeight: 1.4 }}>{PRE_QUIZ[a.qIdx]?.q}</div>
                  <div style={{ fontSize: 12, color: T.accent, marginBottom: 4 }}>
                    ✗ Your answer: {PRE_QUIZ[a.qIdx]?.choices[a.chosen]}
                  </div>
                  <div style={{ fontSize: 12, color: T.green, fontWeight: 600, marginBottom: 6 }}>
                    ✓ Correct: {PRE_QUIZ[a.qIdx]?.choices[PRE_QUIZ[a.qIdx]?.answer]}
                  </div>
                  <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.5, background: "white", borderRadius: 6, padding: 10 }}>
                    {PRE_QUIZ[a.qIdx]?.explanation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => navigate("home")}
          style={{ flex: 1, padding: "14px 20px", background: T.card, color: T.navy, border: `1px solid ${T.line}`, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Done
        </button>
        <button onClick={() => navigate("home", { type: "preQuiz" })}
          style={{ flex: 1, padding: "14px 20px", background: T.med, color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          ↻ Retake
        </button>
      </div>
    </div>
  );
}

function HomeTab({ navigate, preScore, postScore, curriculum, articles, announcements, currentWeek, weeklyScores, completedItems }) {
  const [expanded, setExpanded] = useState(currentWeek || null);
  // Rotate tip daily based on day-of-year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const tipIndex = dayOfYear % PRO_TIPS.length;

  // Filter announcements to only those < 7 days old
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const activeAnnouncements = announcements.filter(a => {
    if (!a.date) return true; // legacy announcements without dates still show
    return (now - new Date(a.date).getTime()) < SEVEN_DAYS;
  });

  // Relative time helper
  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = now - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "yesterday";
    return `${days}d ago`;
  };

  return (
    <div style={{ padding: 16 }}>
      {/* Pre/Post Rotation Assessment Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <button onClick={() => navigate("home", { type: preScore ? "preResults" : "preQuiz" })}
          style={{ background: preScore ? T.ice : `linear-gradient(135deg, ${T.med}, ${T.sky})`, borderRadius: 12, padding: 14, border: "none", cursor: "pointer", textAlign: "left", position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: preScore ? T.med : "rgba(255,255,255,0.8)", marginBottom: 4 }}>Pre-Rotation</div>
          <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: preScore ? T.navy : "white", marginBottom: 2 }}>
            {preScore ? `${Math.round((preScore.correct/preScore.total)*100)}%` : "Take Quiz"}
          </div>
          <div style={{ fontSize: 10, color: preScore ? T.sub : "rgba(255,255,255,0.7)" }}>
            {preScore ? `${preScore.correct}/${preScore.total} correct` : "25 questions • Baseline"}
          </div>
          {preScore && <div style={{ fontSize: 10, color: T.med, marginTop: 4, cursor: "pointer" }}>View Results</div>}
        </button>

        <button onClick={() => navigate("home", { type: "postQuiz" })}
          style={{ background: postScore ? "linear-gradient(135deg, rgba(26,188,156,0.1), rgba(26,188,156,0.05))" : T.card, borderRadius: 12, padding: 14, border: postScore ? `2px solid ${T.green}` : `2px dashed ${T.line}`, cursor: "pointer", textAlign: "left" }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: postScore ? T.greenDk : T.muted, marginBottom: 4 }}>Post-Rotation</div>
          <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: postScore ? T.greenDk : T.sub, marginBottom: 2 }}>
            {postScore ? `${Math.round((postScore.correct/postScore.total)*100)}%` : "Take Quiz"}
          </div>
          <div style={{ fontSize: 10, color: postScore ? T.sub : T.muted }}>
            {postScore ? `${postScore.correct}/${postScore.total} correct` : "25 questions • Final"}
          </div>
          {postScore && preScore && (
            <div style={{ fontSize: 11, fontWeight: 700, color: T.green, marginTop: 4 }}>
              {Math.round((postScore.correct/postScore.total)*100) - Math.round((preScore.correct/preScore.total)*100) > 0 ? "+" : ""}
              {Math.round((postScore.correct/postScore.total)*100) - Math.round((preScore.correct/preScore.total)*100)}% growth
            </div>
          )}
        </button>
      </div>

      {activeAnnouncements.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ color: T.text, fontSize: 16, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Announcements</h2>
          {activeAnnouncements.slice(0, 3).map(a => {
            const prioColor = a.priority === "urgent" ? T.accent : a.priority === "important" ? T.orange : T.med;
            return (
              <div key={a.id || `${a.title}-${a.date}`} style={{ background: T.card, borderRadius: 10, padding: 10, marginBottom: 8, borderLeft: `4px solid ${prioColor}`, border: `1px solid ${T.line}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.navy }}>{a.title}</div>
                  {a.date && <div style={{ fontSize: 10, color: T.muted, flexShrink: 0 }}>{timeAgo(a.date)}</div>}
                </div>
                {a.body && <div style={{ fontSize: 11, color: T.sub, marginTop: 4, lineHeight: 1.4 }}>{a.body}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Weekly Curriculum */}
      {currentWeek && (
        <div style={{ background: T.ice, borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8, border: `1.5px solid ${T.pale}` }}>
          <span style={{ fontSize: 16 }}>📍</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>You are in Week {currentWeek}</div>
            <div style={{ fontSize: 11, color: T.sub }}>{(curriculum[currentWeek] || WEEKLY[currentWeek])?.title}</div>
          </div>
        </div>
      )}
      <h2 style={{ color: T.text, fontSize: 16, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Weekly Curriculum</h2>
      {[1,2,3,4].map(w => {
        const wk = curriculum[w] || WEEKLY[w];
        const isOpen = expanded === w;
        return (
          <div key={w} style={{ marginBottom: 10, background: T.card, borderRadius: 12, overflow: "hidden", border: `1px solid ${isOpen ? T.med : T.line}`, borderLeft: w === currentWeek ? `3px solid ${T.med}` : undefined, transition: "border 0.2s" }}>
            <button onClick={() => setExpanded(isOpen ? null : w)}
              style={{ width: "100%", padding: "12px 14px", background: isOpen ? T.ice : T.card, border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 700, color: T.navy, fontSize: 14, fontFamily: T.serif }}>Week {w}: {wk.title}</span>
                  {w === currentWeek && <span style={{ fontSize: 9, fontWeight: 700, background: T.med, color: "white", padding: "2px 6px", borderRadius: 6, letterSpacing: 0.5 }}>CURRENT</span>}
                </div>
                <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{wk.sub}</div>
              </div>
              <span style={{ color: T.med, fontSize: 16, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
            </button>
            {isOpen && (
              <div style={{ padding: "0 16px 16px" }}>
                {/* Topic pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {wk.topics.map(t => (
                    <span key={t} style={{ background: T.pale, color: T.navy, fontSize: 10, padding: "3px 8px", borderRadius: 10, fontWeight: 500 }}>{t}</span>
                  ))}
                </div>
                {/* Action buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(() => {
                    const ws = (weeklyScores || {})[w] || [];
                    const best = ws.length > 0 ? Math.max(...ws.map(s => Math.round((s.correct / s.total) * 100))) : null;
                    const latest = ws.length > 0 ? ws[ws.length - 1] : null;
                    const missed = latest ? (latest.answers || []).filter(a => !a.correct) : [];
                    return (
                      <>
                        <button onClick={() => navigate("home", { type: "weeklyQuiz", week: w })}
                          style={{ width: "100%", padding: "10px 0", background: best !== null ? T.ice : T.med, color: best !== null ? T.navy : "white", border: best !== null ? `1.5px solid ${T.med}` : "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          📝 Week {w} Quiz ({(WEEKLY_QUIZZES[w]||[]).length} questions)
                          {best !== null && (
                            <span style={{ background: best >= 80 ? T.green : best >= 60 ? T.gold : T.accent, color: "white", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>
                              Best: {best}%
                            </span>
                          )}
                        </button>
                        {missed.length > 0 && (
                          <button onClick={() => navigate("home", { type: "reviewMissed", week: w })}
                            style={{ width: "100%", padding: "10px 0", background: "#FDF2F2", color: T.accent, border: `1.5px solid ${T.accent}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            🔄 Review {missed.length} Missed Question{missed.length !== 1 ? "s" : ""}
                          </button>
                        )}
                      </>
                    );
                  })()}
                  {(() => {
                    const arts = articles[w] || [];
                    const readCount = arts.filter(a => (completedItems?.articles || {})[a.url]).length;
                    return (
                      <button onClick={() => navigate("home", { type: "articles", week: w })}
                        style={{ width: "100%", padding: "10px 0", background: "white", color: T.med, border: `1.5px solid ${T.med}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        📄 Journal Articles ({readCount}/{arts.length} read)
                      </button>
                    );
                  })()}
                  <button onClick={() => navigate("home", { type: "trials", week: w })}
                    style={{ width: "100%", padding: "10px 0", background: "#FEF9E7", color: "#B7950B", border: "1.5px solid #F1C40F", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    ⭐ Landmark Trials ({(LANDMARK_TRIALS[w]||[]).length})
                  </button>
                  {(() => {
                    const sheets = STUDY_SHEETS[w] || [];
                    const doneCount = sheets.filter(s => (completedItems?.studySheets || {})[s.id]).length;
                    return (
                      <button onClick={() => navigate("home", { type: "studySheets", week: w })}
                        style={{ width: "100%", padding: "10px 0", background: "#F5EEF8", color: "#7D3C98", border: "1.5px solid #BB8FCE", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        📋 Study Sheets ({doneCount}/{sheets.length} done)
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Daily Pro Tip — Nephrology Secrets */}
      <div style={{ background: T.ice, borderRadius: 10, padding: "10px 14px", marginTop: 10, marginBottom: 16, borderLeft: `3px solid ${T.med}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>💡</span>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.med, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Nephrology Secret of the Day</div>
          <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5 }}>{PRO_TIPS[tipIndex]}</div>
        </div>
      </div>

      {/* Resources & Abbreviations */}
      <h2 style={{ color: T.text, fontSize: 16, margin: "20px 0 12px", fontFamily: T.serif, fontWeight: 700 }}>Resources</h2>
      <button onClick={() => navigate("home", { type: "resources" })}
        style={{ display: "block", width: "100%", background: T.card, borderRadius: 12, padding: 14, marginBottom: 10, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #E8F8F5, #D5F5E3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🎧</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>Podcasts, Websites & Guidelines</div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>Curbsiders, Freely Filtered, NephJC, KDIGO & more</div>
          </div>
          <span style={{ color: T.muted, fontSize: 16, flexShrink: 0 }}>›</span>
        </div>
      </button>
      <button onClick={() => navigate("home", { type: "abbreviations" })}
        style={{ display: "block", width: "100%", background: T.card, borderRadius: 12, padding: 14, marginBottom: 10, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #EBF5FB, #D4E6F1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📖</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>Nephrology Abbreviations</div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{ABBREVIATIONS.length} terms — searchable quick reference</div>
          </div>
          <span style={{ color: T.muted, fontSize: 16, flexShrink: 0 }}>›</span>
        </div>
      </button>
    </div>
  );
}

// ─── Articles View ──────────────────────────────────────────────────
function ArticlesView({ week, onBack, curriculum, articles, completedItems, onToggleComplete }) {
  const arts = articles[week] || [];
  const wk = curriculum[week] || WEEKLY[week];
  const readCount = arts.filter(a => (completedItems?.articles || {})[a.url]).length;

  const typeColors = {
    "Guideline": { bg: "#E8F6F3", text: T.greenDk },
    "Landmark Study": { bg: "#FEF9E7", text: "#B7950B" },
    "Landmark": { bg: "#FEF9E7", text: "#B7950B" },
    "Review": { bg: T.ice, text: T.med },
  };

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>← Back</button>
      <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: "0 0 4px", fontWeight: 700 }}>
        Week {week}: {wk?.title || "Curriculum"}
      </h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px" }}>
        Recommended readings — {readCount}/{arts.length} read
      </p>

      {arts.map((a, i) => {
        const tc = typeColors[a.type] || typeColors.Review;
        const isRead = (completedItems?.articles || {})[a.url];
        return (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
            <a href={a.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", flex: 1, background: isRead ? "#F0FFF4" : T.card, borderRadius: 12, padding: 16, border: `1px solid ${isRead ? T.green + "40" : T.line}`, textDecoration: "none", transition: "box-shadow 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 18 }}>{a.type === "Guideline" ? "📋" : (a.type === "Landmark Study" || a.type === "Landmark") ? "⭐" : "📄"}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, lineHeight: 1.35, marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: T.sub }}>{a.journal} ({a.year})</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: tc.text, background: tc.bg, padding: "2px 8px", borderRadius: 6 }}>{a.type}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: T.muted, background: T.bg, padding: "2px 8px", borderRadius: 6 }}>{a.topic}</span>
                  </div>
                </div>
                <div style={{ color: T.muted, fontSize: 16, flexShrink: 0 }}>↗</div>
              </div>
            </a>
            <button onClick={() => onToggleComplete(a.url)}
              style={{ width: 32, height: 32, borderRadius: 16, border: `2px solid ${isRead ? T.green : T.line}`, background: isRead ? T.green : "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginTop: 12 }}>
              {isRead && <span style={{ color: "white", fontSize: 16, fontWeight: 700 }}>✓</span>}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Landmark Trials View ───────────────────────────────────────────
function LandmarkTrialsView({ week, onBack }) {
  const trials = LANDMARK_TRIALS[week] || [];
  const [expanded, setExpanded] = useState(null);
  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>← Back</button>
      <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: "0 0 4px", fontWeight: 700 }}>Week {week}: Landmark Trials</h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px" }}>Key trials that shaped nephrology practice</p>
      {trials.map((trial, i) => {
        const isOpen = expanded === i;
        return (
          <div key={i} style={{ background: T.card, borderRadius: 12, marginBottom: 10, border: `1px solid ${isOpen ? "#F1C40F" : T.line}`, overflow: "hidden", transition: "border 0.2s" }}>
            <button onClick={() => setExpanded(isOpen ? null : i)}
              style={{ width: "100%", padding: 16, background: isOpen ? "#FEF9E7" : T.card, border: "none", cursor: "pointer", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FEF9E7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>⭐</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: T.navy, fontSize: 15, marginBottom: 2 }}>{trial.name}</div>
                  <div style={{ fontSize: 12, color: T.sub }}>{trial.journal} ({trial.year})</div>
                  <div style={{ fontSize: 12, color: T.text, marginTop: 6, lineHeight: 1.45, fontStyle: "italic" }}>{trial.takeaway}</div>
                </div>
                <span style={{ color: T.muted, fontSize: 18, transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>›</span>
              </div>
            </button>
            {isOpen && (
              <div style={{ padding: "0 16px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>Full Title</div>
                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, marginBottom: 12 }}>{trial.full_title}</div>
                {trial.details && (<>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>Study Details</div>
                  <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, marginBottom: 12, background: "#FEF9E7", borderRadius: 8, padding: 12, borderLeft: "3px solid #F1C40F" }}>{trial.details}</div>
                </>)}
                <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>How It Changed Practice</div>
                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, marginBottom: 12, background: T.ice, borderRadius: 8, padding: 12 }}>{trial.significance}</div>
                <a href={trial.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: T.med, textDecoration: "none" }}>
                  Read Full Paper ↗
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Study Sheets View ──────────────────────────────────────────────
function StudySheetsView({ week, onBack, completedItems, onToggleComplete }) {
  const sheets = STUDY_SHEETS[week] || [];
  const wk = WEEKLY[week];
  const [expanded, setExpanded] = useState(null);
  const doneCount = sheets.filter(s => (completedItems?.studySheets || {})[s.id]).length;

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>← Back</button>
      <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: "0 0 4px", fontWeight: 700 }}>
        Week {week}: Study Sheets
      </h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px" }}>
        {wk?.title} — {doneCount}/{sheets.length} completed
      </p>

      {sheets.map((sheet, si) => {
        const isOpen = expanded === si;
        const isDone = (completedItems?.studySheets || {})[sheet.id];
        return (
          <div key={sheet.id} style={{ background: T.card, borderRadius: 12, marginBottom: 12, border: `1px solid ${isOpen ? "#BB8FCE" : isDone ? T.green + "40" : T.line}`, overflow: "hidden", transition: "border 0.2s" }}>
            {/* Sheet Header */}
            <button onClick={() => setExpanded(isOpen ? null : si)}
              style={{ width: "100%", padding: 16, background: isOpen ? "#F5EEF8" : isDone ? "#F0FFF4" : T.card, border: "none", cursor: "pointer", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: isDone ? "#E8F8E8" : "#F5EEF8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{isDone ? "✅" : sheet.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>{sheet.title}</div>
                  <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{sheet.subtitle}</div>
                </div>
                <span style={{ color: T.muted, fontSize: 18, transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>›</span>
              </div>
            </button>

            {/* Sheet Content */}
            {isOpen && (
              <div style={{ padding: "4px 16px 20px" }}>
                {sheet.sections.map((section, secIdx) => (
                  <div key={secIdx} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#7D3C98", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 3, height: 12, background: "#BB8FCE", borderRadius: 2 }} />
                      {section.heading}
                    </div>
                    <div style={{ background: "#FAFAFA", borderRadius: 10, padding: "12px 14px" }}>
                      {section.items.map((item, itemIdx) => (
                        <div key={itemIdx} style={{ fontSize: 13, color: T.text, lineHeight: 1.6, marginBottom: itemIdx < section.items.length - 1 ? 12 : 0, paddingLeft: 14, position: "relative" }}>
                          <span style={{ position: "absolute", left: 0, color: "#BB8FCE", fontWeight: 700 }}>•</span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Trial Callouts */}
                {sheet.trialCallouts && sheet.trialCallouts.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 16, borderTop: `1px solid ${T.line}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#B7950B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>⭐</span> Trial Connections
                    </div>
                    {sheet.trialCallouts.map((callout, ci) => (
                      <div key={ci} style={{ background: "#FEF9E7", borderRadius: 10, padding: "10px 14px", marginBottom: 10, borderLeft: "3px solid #F1C40F" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#B7950B", marginBottom: 4 }}>{callout.trial}</div>
                        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.55 }}>{callout.pearl}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mark Complete Button */}
                <button onClick={() => onToggleComplete(sheet.id)}
                  style={{ width: "100%", padding: "10px 0", background: isDone ? T.green : T.ice, color: isDone ? "white" : T.med, border: `1.5px solid ${isDone ? T.green : T.med}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 }}>
                  {isDone ? "✓ Completed" : "Mark as Complete"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Resources View ─────────────────────────────────────────────────
function ResourcesView({ onBack }) {
  const [activeTab, setActiveTab] = useState("podcasts");
  const tabList = [
    { id: "podcasts", label: "🎧 Podcasts", data: RESOURCES.podcasts },
    { id: "websites", label: "🌐 Websites", data: RESOURCES.websites },
    { id: "guidelines", label: "📋 Guidelines", data: RESOURCES.guidelines },
    { id: "tools", label: "🛠 Tools", data: RESOURCES.tools },
  ];

  const tagColors = {
    "Must Listen": { bg: "#FDEDEC", text: "#C0392B" },
    "Essential": { bg: "#FDEDEC", text: "#C0392B" },
    "AKI": { bg: "#FDEDEC", text: "#C0392B" },
    "Electrolytes": { bg: "#E8F8F5", text: "#16A085" },
    "GN": { bg: "#F5EEF8", text: "#7D3C98" },
    "CKD": { bg: "#EBF5FB", text: "#2980B9" },
    "Dialysis": { bg: "#FEF9E7", text: "#7D6608" },
    "Acid-Base": { bg: "#E8F8F5", text: "#16A085" },
    "Medications": { bg: "#EBF5FB", text: "#2980B9" },
    "Stones": { bg: "#FEF9E7", text: "#7D6608" },
    "Physiology": { bg: "#E8F8F5", text: "#16A085" },
    "Guidelines": { bg: "#EBF5FB", text: "#2980B9" },
    "Cases": { bg: "#FEF9E7", text: "#7D6608" },
    "Quick Hits": { bg: "#F5EEF8", text: "#7D3C98" },
    "Teaching": { bg: "#E8F8F5", text: "#16A085" },
    "Practice Cases": { bg: "#FEF9E7", text: "#7D6608" },
    "Video Lectures": { bg: "#F5EEF8", text: "#7D3C98" },
    "Visuals": { bg: "#FEF9E7", text: "#7D6608" },
    "Review": { bg: "#EBF5FB", text: "#2980B9" },
    "Fun Learning": { bg: "#E8F8F5", text: "#16A085" },
    "App": { bg: "#F5EEF8", text: "#7D3C98" },
    "Calculators": { bg: "#EBF5FB", text: "#2980B9" },
    "ICU": { bg: "#FDEDEC", text: "#C0392B" },
    "HTN": { bg: "#FDEDEC", text: "#C0392B" },
  };

  const activeData = tabList.find(t => t.id === activeTab)?.data || [];

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>← Back</button>
      <h2 style={{ color: T.navy, fontSize: 20, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Resources</h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px" }}>Curated links for your nephrology rotation</p>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto" }}>
        {tabList.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: "8px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
              background: activeTab === t.id ? T.navy : T.ice,
              color: activeTab === t.id ? "white" : T.text }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Resource cards */}
      {activeData.map((r, i) => {
        const tc = tagColors[r.tag] || { bg: T.ice, text: T.med };
        return (
          <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
            style={{ display: "block", background: T.card, borderRadius: 12, padding: 16, marginBottom: 10, border: `1px solid ${T.line}`, textDecoration: "none", transition: "box-shadow 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{r.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: tc.text, background: tc.bg, padding: "2px 8px", borderRadius: 6 }}>{r.tag}</span>
                </div>
                <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.45, wordBreak: "break-word" }}>{r.desc}</div>
              </div>
              <span style={{ color: T.muted, fontSize: 14, flexShrink: 0, marginTop: 2 }}>↗</span>
            </div>
          </a>
        );
      })}

      {/* Bottom tip */}
      <div style={{ background: T.ice, borderRadius: 12, padding: 14, marginTop: 6, borderLeft: `4px solid ${T.med}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.med, marginBottom: 4 }}>LISTENING TIP</div>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>
          Start with Curbsiders #226 (AKI) and REBOOT #48 (Hyponatremia) — these cover the two most common consults you'll see. All Curbsiders nephrology episodes feature Joel Topf (@kidney_boy) and are outstanding. Listen during your commute — 15 min/day adds up fast over 4 weeks.
        </div>
      </div>
    </div>
  );
}

// ─── Abbreviations View ─────────────────────────────────────────────
function AbbreviationsView({ onBack }) {
  const [search, setSearch] = useState("");
  const filtered = ABBREVIATIONS.filter(a =>
    a.abbr.toLowerCase().includes(search.toLowerCase()) ||
    a.full.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>← Back</button>
      <h2 style={{ color: T.navy, fontSize: 20, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Nephrology Abbreviations</h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 12px" }}>{ABBREVIATIONS.length} terms you'll encounter on rotation</p>

      {/* Search */}
      <input
        type="text" placeholder="Search abbreviations..."
        value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${T.line}`, borderRadius: 10, fontSize: 14, boxSizing: "border-box", marginBottom: 14, fontFamily: T.sans, outline: "none" }}
        onFocus={e => e.target.style.borderColor = T.med}
        onBlur={e => e.target.style.borderColor = T.line}
      />

      <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.line}`, overflow: "hidden" }}>
        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 13 }}>No matches found</div>
        )}
        {filtered.map((a, i) => (
          <div key={i} style={{ padding: "10px 16px", borderBottom: i < filtered.length - 1 ? `1px solid ${T.bg}` : "none", display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ fontWeight: 700, color: T.med, fontSize: 13, fontFamily: T.mono, minWidth: 90, flexShrink: 0, paddingTop: 1 }}>{a.abbr}</div>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.4, wordBreak: "break-word" }}>{a.full}</div>
          </div>
        ))}
      </div>

      {!search && (
        <div style={{ background: T.ice, borderRadius: 12, padding: 14, marginTop: 14, borderLeft: `4px solid ${T.med}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.med, marginBottom: 4 }}>PRO TIP</div>
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>
            If you see an abbreviation in a note you don't recognize, search here first. The most common ones you'll encounter daily: Cr, GFR, FENa, UA, UOP, I&Os, HD, PD, AVF, BMP, AG.
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
//  Quiz Engine Component (with persistence — Fix D)
// ═══════════════════════════════════════════════════════════════════════

// Fisher-Yates shuffle — returns array of shuffled indices
function shuffleIndices(length) {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function QuizEngine({ questions, title, onBack, onFinish }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [shuffledOrder, setShuffledOrder] = useState(null);

  // Fix D: Quiz persistence
  const quizKey = "quiz_" + title.replace(/[^a-zA-Z0-9]/g, "_");
  const [restored, setRestored] = useState(false);

  // Restore saved progress on mount, or create new shuffled order
  useEffect(() => {
    (async () => {
      const saved = await store.get(quizKey);
      if (saved && saved.shuffledOrder) {
        setCurrent(saved.current || 0);
        setSelected(saved.selected ?? null);
        setAnswers(saved.answered || []);
        setCorrectCount(saved.score || 0);
        setFinished(saved.done || false);
        setShowExplanation(saved.showExplanation || false);
        setShowResult(saved.showExplanation || false);
        setShuffledOrder(saved.shuffledOrder);
      } else {
        setShuffledOrder(shuffleIndices(questions.length));
      }
      setRestored(true);
    })();
  }, [quizKey]);

  // Save progress on change (only after restored)
  useEffect(() => {
    if (!restored) return;
    if (finished) { store.set(quizKey, null); return; }
    store.set(quizKey, { current, selected, answered: answers, score: correctCount, done: finished, showExplanation, shuffledOrder });
  }, [current, selected, answers, correctCount, finished, showExplanation, restored, quizKey, shuffledOrder]);

  const handleSelect = (idx) => {
    if (showResult || !shuffledOrder) return;
    setSelected(idx);
    setShowResult(true);
    setShowExplanation(true);
    const origIdx = shuffledOrder[current];
    const isCorrect = idx === questions[origIdx].answer;
    if (isCorrect) setCorrectCount(c => c + 1);
    setAnswers(a => [...a, { qIdx: origIdx, chosen: idx, correct: isCorrect }]);
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setFinished(true);
      onFinish({ correct: correctCount, total: questions.length, date: new Date().toISOString(), answers });
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setShowResult(false);
      setShowExplanation(false);
    }
  };

  // Loading guard before restore completes
  if (!restored || !shuffledOrder) return <div style={{ padding: 40, textAlign: "center", color: T.sub }}>Loading quiz...</div>;

  // Finished screen
  if (finished) {
    const pct = Math.round((correctCount / questions.length) * 100);
    const missed = answers.filter(a => !a.correct);
    return (
      <div style={{ padding: 16 }}>
        <div style={{ background: T.card, borderRadius: 16, padding: 28, textAlign: "center", border: `1px solid ${T.line}` }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{pct >= 80 ? "🎉" : pct >= 60 ? "👍" : "📖"}</div>
          <h2 style={{ color: T.navy, fontFamily: T.serif, margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>{title} Complete</h2>
          <div style={{ fontSize: 40, fontWeight: 700, color: pct >= 80 ? T.green : pct >= 60 ? T.gold : T.accent, fontFamily: T.mono }}>
            {correctCount}/{questions.length}
          </div>
          <div style={{ color: T.sub, fontSize: 14, marginBottom: 20 }}>{pct}% correct</div>

          {/* Missed questions review */}
          {missed.length > 0 && (
            <div style={{ textAlign: "left", marginTop: 16 }}>
              <div style={{ fontWeight: 700, color: T.text, fontSize: 14, marginBottom: 10, fontFamily: T.serif }}>
                Review Missed Questions ({missed.length}):
              </div>
              {missed.map((a, i) => (
                <div key={i} style={{ background: "#FDF2F2", borderRadius: 10, padding: 14, marginBottom: 10, borderLeft: `3px solid ${T.accent}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8, lineHeight: 1.4 }}>{questions[a.qIdx].q}</div>
                  <div style={{ fontSize: 12, color: T.accent, marginBottom: 4 }}>
                    ✗ Your answer: {questions[a.qIdx].choices[a.chosen]}
                  </div>
                  <div style={{ fontSize: 12, color: T.green, fontWeight: 600, marginBottom: 6 }}>
                    ✓ Correct: {questions[a.qIdx].choices[questions[a.qIdx].answer]}
                  </div>
                  <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.5, background: "white", borderRadius: 6, padding: 10 }}>
                    {questions[a.qIdx].explanation}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={onBack} style={{ marginTop: 20, padding: "14px 40px", background: T.med, color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            Done
          </button>
        </div>
      </div>
    );
  }

  const q = questions[shuffledOrder[current]];
  const progress = ((current + (showResult ? 1 : 0)) / questions.length) * 100;

  return (
    <div style={{ padding: 16 }}>
      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{ ...backBtnStyle, marginBottom: 0, fontSize: 20, gap: 0 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ height: 6, background: T.line, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: T.med, borderRadius: 3, transition: "width 0.4s ease" }} />
          </div>
        </div>
        <span style={{ fontSize: 12, color: T.sub, fontWeight: 600, fontFamily: T.mono, minWidth: 42, textAlign: "right" }}>{current + 1}/{questions.length}</span>
        {/* Restart button (Fix D) */}
        <button onClick={() => { store.set(quizKey, null); setCurrent(0); setSelected(null); setAnswers([]); setCorrectCount(0); setFinished(false); setShowResult(false); setShowExplanation(false); setShuffledOrder(shuffleIndices(questions.length)); }}
          style={{ padding: "6px 14px", background: T.accent, color: "white", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
          Restart
        </button>
      </div>

      {/* Quiz title */}
      <div style={{ fontSize: 11, color: T.med, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</div>

      {/* Question */}
      <div style={{ background: T.card, borderRadius: 14, padding: 20, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <p style={{ color: T.text, fontSize: 15, lineHeight: 1.55, margin: 0, fontWeight: 500 }}>{q.q}</p>
      </div>

      {/* Choices */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {q.choices.map((c, i) => {
          let bg = T.card, border = T.line, textColor = T.text, fontW = 400;
          if (showResult) {
            if (i === q.answer) { bg = "#E8F8F0"; border = T.green; textColor = T.greenDk; fontW = 600; }
            else if (i === selected && i !== q.answer) { bg = "#FDF2F2"; border = T.accent; textColor = T.accent; }
          } else if (i === selected) { bg = T.ice; border = T.med; }

          return (
            <button key={i} onClick={() => handleSelect(i)}
              style={{ padding: "14px 16px", background: bg, border: `2px solid ${border}`, borderRadius: 12,
                cursor: showResult ? "default" : "pointer", textAlign: "left", fontSize: 14, color: textColor,
                fontWeight: fontW, display: "flex", alignItems: "flex-start", gap: 12, transition: "all 0.2s", fontFamily: T.sans }}>
              <span style={{
                width: 26, height: 26, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center",
                background: showResult && i === q.answer ? T.green : showResult && i === selected ? T.accent : "#ECF0F1",
                color: showResult && (i === q.answer || i === selected) ? "white" : T.sub,
                fontSize: 12, fontWeight: 700, flexShrink: 0
              }}>
                {showResult && i === q.answer ? "✓" : showResult && i === selected ? "✗" : String.fromCharCode(65 + i)}
              </span>
              <span style={{ paddingTop: 2 }}>{c}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {showResult && (
        <div style={{ background: T.ice, borderRadius: 12, padding: 16, marginTop: 16, borderLeft: `3px solid ${T.med}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: selected === q.answer ? T.greenDk : T.accent, marginBottom: 6 }}>
            {selected === q.answer ? "✓ Correct!" : "✗ Not quite"}
          </div>
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.55, wordBreak: "break-word" }}>{q.explanation}</div>
        </div>
      )}

      {/* Next button */}
      {showResult && (
        <button onClick={handleNext} style={{
          width: "100%", marginTop: 16, padding: "14px 0", background: T.navy, color: "white",
          border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer"
        }}>
          {current + 1 >= questions.length ? "See Results" : "Next Question →"}
        </button>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
//  Reference Tools: Calculators & Protocol Cards
// ═══════════════════════════════════════════════════════════════════════

function RefsTab({ navigate }) {
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 18, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Quick Reference</h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px" }}>Calculators, protocols & clinical guides</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {QUICK_REFS.map(ref => (
          <button key={ref.id} onClick={() => navigate("refs", { type: "refDetail", id: ref.id })}
            style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left", transition: "box-shadow 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{ref.icon}</div>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, fontFamily: T.serif }}>{ref.title}</div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{ref.desc}</div>
            {ref.type === "calculator" && (
              <div style={{ fontSize: 10, color: T.med, fontWeight: 600, marginTop: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Calculator →</div>
            )}
            {ref.type === "reference" && (
              <div style={{ fontSize: 10, color: T.orange, fontWeight: 600, marginTop: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Reference →</div>
            )}
            {ref.type === "atlas" && (
              <div style={{ fontSize: 10, color: "#8E44AD", fontWeight: 600, marginTop: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Atlas →</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Detail View (Fix B: ref_ → refData) ───────────────────────────
function RefDetailView({ refId, onBack }) {
  const ref = QUICK_REFS.find(r => r.id === refId);
  if (!ref) return <div style={{ padding: 16 }}>Reference not found.</div>;

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>← Back</button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 36 }}>{ref.icon}</div>
        <div>
          <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 22, margin: 0, fontWeight: 700 }}>{ref.title}</h2>
          <div style={{ color: T.sub, fontSize: 13 }}>{ref.desc}</div>
        </div>
      </div>

      {ref.type === "calculator" ? <CalculatorView refData={ref} /> : ref.type === "atlas" ? <AtlasView refData={ref} /> : <ReferenceCardView refData={ref} />}
    </div>
  );
}

// ─── Calculator Component (Fix B: ref_ → refData) ──────────────────
function CalculatorView({ refData }) {
  const [values, setValues] = useState({});
  const [result, setResult] = useState(null);

  const updateVal = (key, val) => {
    const newVals = { ...values, [key]: val === "" ? "" : parseFloat(val) || "" };
    setValues(newVals);
    // Auto-calculate when all required fields filled
    const allFilled = refData.inputs.every(inp => {
      const v = newVals[inp.key];
      return v !== "" && v !== undefined && !isNaN(v);
    });
    if (allFilled) {
      const numVals = {};
      refData.inputs.forEach(inp => { numVals[inp.key] = parseFloat(newVals[inp.key]); });
      setResult(refData.calculate(numVals));
    } else {
      setResult(null);
    }
  };

  return (
    <div>
      <div style={{ background: T.card, borderRadius: 14, padding: 20, border: `1px solid ${T.line}`, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: refData.inputs.length > 4 ? "1fr" : "1fr 1fr", gap: 12 }}>
          {refData.inputs.map(inp => (
            <div key={inp.key}>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.sub, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>{inp.label}</label>
              <input
                type="number" step="any"
                placeholder={inp.placeholder}
                value={values[inp.key] ?? ""}
                onChange={e => updateVal(inp.key, e.target.value)}
                style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${T.line}`, borderRadius: 8, fontSize: 15, boxSizing: "border-box", fontFamily: T.mono, outline: "none", transition: "border 0.2s" }}
                onFocus={e => e.target.style.borderColor = T.med}
                onBlur={e => e.target.style.borderColor = T.line}
              />
            </div>
          ))}
        </div>

        <button onClick={() => {
          const numVals = {};
          refData.inputs.forEach(inp => { numVals[inp.key] = parseFloat(values[inp.key]) || 0; });
          setResult(refData.calculate(numVals));
        }} style={{ width: "100%", marginTop: 16, padding: "12px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Calculate
        </button>
      </div>

      {/* Result */}
      {result && (
        <div style={{ background: T.ice, borderRadius: 14, padding: 20, border: `1px solid ${T.pale}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.med, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Result</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.navy, fontFamily: T.mono, marginBottom: 10 }}>{result.value}</div>
          <div style={{ fontSize: 14, color: T.text, lineHeight: 1.6, whiteSpace: "pre-line", wordBreak: "break-word", marginBottom: result.caveat ? 10 : 0 }}>{result.interpretation}</div>
          {result.caveat && (
            <div style={{ fontSize: 12, color: T.orange, background: "#FEF9E7", borderRadius: 8, padding: 10, lineHeight: 1.5 }}>{result.caveat}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Reference Card Component (Fix B: ref_ → refData) ──────────────
function ReferenceCardView({ refData }) {
  const { sections } = refData.content;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {sections.map((sec, i) => (
        <div key={i} style={{ background: T.card, borderRadius: 14, padding: 18, border: `1px solid ${T.line}` }}>
          <div style={{ fontFamily: T.serif, fontWeight: 700, color: T.navy, fontSize: 15, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${T.line}` }}>
            {sec.heading}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sec.items.map((item, j) => {
              // Check if item has a → which indicates a key finding
              const hasArrow = item.includes("→");
              if (hasArrow) {
                const [before, after] = item.split("→");
                return (
                  <div key={j} style={{ fontSize: 13, color: T.text, lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ color: T.med, fontWeight: 700, flexShrink: 0 }}>•</span>
                    <span><strong style={{ color: T.navy }}>{before.trim()}</strong> <span style={{ color: T.med }}>→</span> {after.trim()}</span>
                  </div>
                );
              }
              // Check if item starts with emoji
              const startsWithEmoji = /^[^\w\s]/.test(item) || item.startsWith("⚠");
              return (
                <div key={j} style={{ fontSize: 13, color: T.text, lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 8 }}>
                  {!startsWithEmoji && <span style={{ color: T.med, fontWeight: 700, flexShrink: 0 }}>•</span>}
                  <span>{item}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}


// ─── Atlas View (Urine Sediment) ────────────────────────────────────
function AtlasView({ refData }) {
  const { sections } = refData.content;
  const [expandedItem, setExpandedItem] = useState(null);

  return (
    <div>
      {/* External Image Links banner */}
      <div style={{ background: "#F5EEF8", borderRadius: 12, padding: 14, marginBottom: 16, borderLeft: "4px solid #8E44AD" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8E44AD", marginBottom: 6 }}>📷 IMAGE RESOURCES</div>
        <div style={{ fontSize: 12, color: T.text, marginBottom: 8, lineHeight: 1.5 }}>Tap below for real microscopy images. Pair with descriptions here for best learning.</div>
        {refData.imageLinks.map((link, i) => (
          <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
            style={{ display: "block", fontSize: 13, color: T.med, fontWeight: 600, textDecoration: "none", padding: "4px 0" }}>
            {link.name} ↗
          </a>
        ))}
      </div>

      {/* Sections with expandable finding cards */}
      {sections.map((sec, si) => (
        <div key={si} style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: T.serif, fontWeight: 700, color: T.navy, fontSize: 16, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${T.line}` }}>{sec.heading}</div>
          {sec.items.map((item, ii) => {
            const key = `${si}-${ii}`;
            const isOpen = expandedItem === key;
            return (
              <div key={ii} style={{ background: T.card, borderRadius: 12, marginBottom: 8, border: `1px solid ${isOpen ? "#8E44AD" : T.line}`, overflow: "hidden", transition: "border 0.2s" }}>
                <button onClick={() => setExpandedItem(isOpen ? null : key)}
                  style={{ width: "100%", padding: "12px 14px", background: isOpen ? "#F5EEF8" : "none", border: "none", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{item.finding}</div>
                    <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{item.significance}</div>
                  </div>
                  <span style={{ color: T.muted, fontSize: 18, transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0, marginLeft: 8 }}>›</span>
                </button>
                {isOpen && (
                  <div style={{ padding: "0 14px 14px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.3 }}>Appearance</div>
                    <div style={{ fontSize: 13, color: T.text, marginBottom: 10, lineHeight: 1.5 }}>{item.appearance}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.3 }}>Associations</div>
                    <div style={{ fontSize: 13, color: T.text, marginBottom: 10, lineHeight: 1.5 }}>{item.associations}</div>
                    <div style={{ background: T.ice, borderRadius: 8, padding: 10, borderLeft: `3px solid ${T.med}` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.med, marginBottom: 3 }}>CLINICAL PEARL</div>
                      <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{item.clinicalPearl}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Clinical Guide Tab
// ═══════════════════════════════════════════════════════════════════════

function GuideTab({ navigate, subView }) {
  const [guideSearch, setGuideSearch] = useState("");

  if (subView?.type === "guideDetail") {
    return <GuideDetailView sectionId={subView.id} onBack={() => navigate("guide")} />;
  }

  const highlightMatch = (text, query) => {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>{text.slice(0, idx)}<span style={{ background: T.gold + "40", fontWeight: 600 }}>{text.slice(idx, idx + query.length)}</span>{text.slice(idx + query.length)}</>
    );
  };

  const searchResults = guideSearch.trim() ? (() => {
    const q = guideSearch.trim().toLowerCase();
    const results = [];
    GUIDE_SECTIONS.forEach(sec => {
      const data = GUIDE_DATA[sec.id];
      if (!data) return;
      const sectionMatch = sec.title.toLowerCase().includes(q) || sec.sub.toLowerCase().includes(q);
      const introMatch = data.intro?.toLowerCase().includes(q);
      const matchingItems = [];
      (data.categories || []).forEach(cat => {
        const catTitleMatch = cat.title.toLowerCase().includes(q);
        (cat.items || []).forEach(item => {
          if (item.toLowerCase().includes(q) || catTitleMatch) {
            matchingItems.push({ category: cat.title, emoji: cat.emoji, item, color: cat.color });
          }
        });
      });
      if (sectionMatch || introMatch || matchingItems.length > 0) {
        results.push({ section: sec, matchingItems: matchingItems.slice(0, 5) });
      }
    });
    return results;
  })() : null;

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 18, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Clinical Guide</h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 12px", lineHeight: 1.4 }}>
        Practical tips for consults, rounding, notes, and presentations
      </p>

      <input type="text" placeholder="Search guides... (e.g. creatinine, consult, biopsy)"
        value={guideSearch} onChange={e => setGuideSearch(e.target.value)}
        style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${T.line}`, borderRadius: 10, fontSize: 14, boxSizing: "border-box", marginBottom: 14, fontFamily: T.sans, outline: "none" }} />

      {searchResults ? (
        searchResults.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 13 }}>No matches found for "{guideSearch}"</div>
        ) : searchResults.map(r => (
          <div key={r.section.id} style={{ marginBottom: 12 }}>
            <button onClick={() => { setGuideSearch(""); navigate("guide", { type: "guideDetail", id: r.section.id }); }}
              style={{ display: "block", width: "100%", background: T.card, borderRadius: 12, padding: 14, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: r.matchingItems.length > 0 ? 8 : 0 }}>
                <span style={{ fontSize: 20 }}>{r.section.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{highlightMatch(r.section.title, guideSearch)}</div>
                  <div style={{ fontSize: 11, color: T.sub }}>{r.section.sub}</div>
                </div>
              </div>
              {r.matchingItems.map((mi, i) => (
                <div key={i} style={{ fontSize: 12, color: T.text, lineHeight: 1.5, padding: "4px 0 4px 30px", borderTop: i === 0 ? `1px solid ${T.line}` : "none" }}>
                  <span style={{ color: mi.color, marginRight: 6 }}>{mi.emoji}</span>
                  {highlightMatch(mi.item, guideSearch)}
                </div>
              ))}
            </button>
          </div>
        ))
      ) : (
        GUIDE_SECTIONS.map(sec => (
          <button key={sec.id} onClick={() => navigate("guide", { type: "guideDetail", id: sec.id })}
            style={{ display: "block", width: "100%", background: T.card, borderRadius: 14, padding: 16, marginBottom: 10,
              border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left", transition: "box-shadow 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                {sec.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>{sec.title}</div>
                <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{sec.sub}</div>
              </div>
              <span style={{ color: T.muted, fontSize: 16, flexShrink: 0 }}>›</span>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

function GuideDetailView({ sectionId, onBack }) {
  const [openCat, setOpenCat] = useState(0);
  const section = GUIDE_SECTIONS.find(s => s.id === sectionId);
  const data = GUIDE_DATA[sectionId];

  if (!section || !data) return <div style={{ padding: 16 }}>Section not found.</div>;

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>← Back</button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
          {section.icon}
        </div>
        <div>
          <h2 style={{ color: T.navy, fontSize: 20, margin: 0, fontFamily: T.serif, fontWeight: 700, lineHeight: 1.2 }}>{section.title}</h2>
          <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{section.sub}</div>
        </div>
      </div>

      {/* Intro */}
      <div style={{ background: T.ice, borderRadius: 12, padding: 16, marginBottom: 16, borderLeft: `4px solid ${T.med}` }}>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, wordBreak: "break-word" }}>{data.intro}</div>
      </div>

      {/* Categories - accordion */}
      {data.categories.map((cat, ci) => {
        const isOpen = openCat === ci;
        return (
          <div key={ci} style={{ marginBottom: 10, background: T.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${isOpen ? cat.color + "60" : T.line}`, transition: "border 0.2s" }}>
            <button onClick={() => setOpenCat(isOpen ? -1 : ci)}
              style={{ width: "100%", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: cat.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                {cat.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{cat.title}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{cat.items.length} items</div>
              </div>
              <span style={{ color: T.muted, fontSize: 14, transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>›</span>
            </button>

            {isOpen && (
              <div style={{ padding: "0 16px 16px" }}>
                <div style={{ height: 1, background: T.line, marginBottom: 12 }} />
                {cat.items.map((item, ii) => {
                  const isWarning = item.startsWith("⚠");
                  const isNever = item.startsWith("NEVER") || item.startsWith("🚫");

                  return (
                    <div key={ii} style={{
                      display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8,
                      ...(isWarning ? { background: "#FEF9E7", borderRadius: 8, padding: "8px 10px", marginLeft: -4, marginRight: -4 } : {}),
                      ...(isNever ? { background: "#FDEDEC", borderRadius: 8, padding: "8px 10px", marginLeft: -4, marginRight: -4 } : {}),
                    }}>
                      {!isWarning && !isNever && (
                        <span style={{ color: cat.color, fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>•</span>
                      )}
                      <div style={{ fontSize: 13, color: isWarning ? "#7D6608" : isNever ? "#922B21" : T.text, lineHeight: 1.5, fontWeight: isWarning || isNever ? 600 : 400, wordBreak: "break-word" }}>
                        {item}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
//  Patient Rounding List & Progress Tracking
// ═══════════════════════════════════════════════════════════════════════

const inputLabel = { fontSize: 11, fontWeight: 700, color: T.sub, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 };
const inputStyle = { width: "100%", padding: "10px 12px", border: `1.5px solid ${T.line}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box", fontFamily: "-apple-system, sans-serif", outline: "none" };

// ═══════════════════════════════════════════════════════════════════════
//  Team Tab — Rotation leaderboard + shared patient board
// ═══════════════════════════════════════════════════════════════════════

function TeamTab({ currentStudentId }) {
  const [teammates, setTeammates] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [expandedStudent, setExpandedStudent] = useState(null);

  useEffect(() => {
    if (!store.getRotationCode()) {
      setTeamLoading(false);
      return;
    }
    const unsub = store.onStudentsChanged((students) => {
      setTeammates(students);
      setTeamLoading(false);
    });
    return () => unsub();
  }, []);

  if (!store.getRotationCode()) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
        <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: "0 0 8px" }}>Team Board</h2>
        <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.6 }}>
          Join a rotation to see your team's progress and patient board.
        </p>
      </div>
    );
  }

  if (teamLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: T.muted, fontSize: 14 }}>Loading team data...</div>;
  }

  // Sort by points descending for leaderboard
  const sorted = [...teammates].sort((a, b) => {
    const ptsA = a.gamification?.points || calculatePoints(a);
    const ptsB = b.gamification?.points || calculatePoints(b);
    return ptsB - ptsA;
  });

  const totalPatients = teammates.reduce((sum, s) => sum + (s.patients?.length || 0), 0);
  const totalPoints = teammates.reduce((sum, s) => sum + (s.gamification?.points || calculatePoints(s)), 0);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 18, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Team Board</h2>
      <div style={{ color: T.muted, fontSize: 11, marginBottom: 16 }}>
        {teammates.length} student{teammates.length !== 1 ? "s" : ""} • {totalPatients} patient{totalPatients !== 1 ? "s" : ""} • {totalPoints} total pts
      </div>

      {/* Leaderboard */}
      <div style={{ background: `linear-gradient(135deg, ${T.navy}, ${T.deep})`, borderRadius: 14, padding: 16, marginBottom: 16, color: "white" }}>
        <h3 style={{ fontFamily: T.serif, color: "white", fontSize: 14, margin: "0 0 14px", fontWeight: 700 }}>🏆 Leaderboard</h3>
        {sorted.length === 0 ? (
          <div style={{ textAlign: "center", color: T.pale, fontSize: 13, padding: 12 }}>No students yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sorted.map((s, i) => {
              const pts = s.gamification?.points || calculatePoints(s);
              const level = getLevel(pts);
              const isMe = s.studentId === currentStudentId;
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <div key={s.studentId} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: isMe ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                  borderRadius: 8, padding: "8px 10px",
                  border: isMe ? "1px solid rgba(255,255,255,0.3)" : "1px solid transparent",
                }}>
                  <div style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>
                    {i < 3 ? medals[i] : <span style={{ fontSize: 13, color: T.muted, fontWeight: 700 }}>{i + 1}</span>}
                  </div>
                  <div style={{ fontSize: 20, flexShrink: 0 }}>{level.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.name || "Unknown"}{isMe ? " (You)" : ""}
                    </div>
                    <div style={{ fontSize: 10, color: T.pale }}>{level.name} • {s.patients?.length || 0} patient{(s.patients?.length || 0) !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, fontFamily: T.mono, color: T.orange }}>{pts}</div>
                    <div style={{ fontSize: 10, color: T.pale }}>pts</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Patient Board */}
      <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 15, margin: "0 0 12px", fontWeight: 700 }}>🏥 Patient Board</h3>
      {sorted.map(s => {
        const pts = s.patients || [];
        const isMe = s.studentId === currentStudentId;
        const isExpanded = expandedStudent === s.studentId;
        const active = pts.filter(p => p.status === "active");
        const discharged = pts.filter(p => p.status === "discharged");

        return (
          <div key={s.studentId} style={{
            background: T.card, borderRadius: 12, padding: 12, marginBottom: 10,
            border: isMe ? `2px solid ${T.med}` : `1px solid ${T.line}`,
          }}>
            <button onClick={() => setExpandedStudent(isExpanded ? null : s.studentId)}
              style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>
                  {s.name || "Unknown"}{isMe ? " (You)" : ""}
                </div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                  {active.length} active • {discharged.length} discharged
                </div>
              </div>
              <span style={{ fontSize: 16, color: T.muted, transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
            </button>

            {isExpanded && (
              <div style={{ marginTop: 12 }}>
                {pts.length === 0 ? (
                  <div style={{ textAlign: "center", color: T.muted, fontSize: 13, padding: 10 }}>No patients logged yet</div>
                ) : (
                  <div>
                    {active.length > 0 && (
                      <div style={{ marginBottom: discharged.length > 0 ? 10 : 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.green, textTransform: "uppercase", marginBottom: 6, letterSpacing: 0.5 }}>Active</div>
                        {active.map((p, i) => {
                          const topics = p.topics || (p.topic ? [p.topic] : []);
                          return (
                            <div key={i} style={{ padding: "8px 0", borderBottom: i < active.length - 1 ? `1px solid ${T.line}` : "none" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 700, color: T.navy, fontSize: 13 }}>{p.initials}</span>
                                {topics.map(t => (
                                  <span key={t} style={{ fontSize: 10, color: "white", background: T.med, padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>{t}</span>
                                ))}
                              </div>
                              {p.dx && <div style={{ fontSize: 12, color: T.sub, marginTop: 3 }}>{p.dx}</div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {discharged.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", marginBottom: 6, letterSpacing: 0.5 }}>Discharged</div>
                        {discharged.map((p, i) => {
                          const topics = p.topics || (p.topic ? [p.topic] : []);
                          return (
                            <div key={i} style={{ padding: "6px 0", borderBottom: i < discharged.length - 1 ? `1px solid ${T.line}` : "none", opacity: 0.6 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 600, color: T.sub, fontSize: 12 }}>{p.initials}</span>
                                {topics.map(t => (
                                  <span key={t} style={{ fontSize: 10, color: T.muted, background: T.bg, padding: "2px 7px", borderRadius: 6, fontWeight: 500 }}>{t}</span>
                                ))}
                              </div>
                              {p.dx && <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{p.dx}</div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {sorted.length === 0 && (
        <div style={{ background: T.card, borderRadius: 14, padding: 24, textAlign: "center", color: T.muted, border: `1px solid ${T.line}` }}>
          No students have joined this rotation yet.
        </div>
      )}
    </div>
  );
}

function PatientTab({ patients, setPatients, studentName }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ initials: "", room: "", dx: "", topics: [], notes: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ initials: "", room: "", dx: "", topics: [], notes: "" });

  const toggleTopic = (t) => {
    setForm(prev => ({
      ...prev,
      topics: prev.topics.includes(t) ? prev.topics.filter(x => x !== t) : [...prev.topics, t],
    }));
  };

  const editToggleTopic = (t) => {
    setEditForm(prev => ({
      ...prev,
      topics: prev.topics.includes(t) ? prev.topics.filter(x => x !== t) : [...prev.topics, t],
    }));
  };

  const addPatient = () => {
    if (!form.initials.trim() || form.topics.length === 0) return;
    setPatients(prev => [{ ...form, id: Date.now(), date: new Date().toISOString(), status: "active", followUps: [] }, ...prev]);
    setForm({ initials: "", room: "", dx: "", topics: [], notes: "" });
    setShowAdd(false);
  };

  const toggle = (id) => setPatients(prev => prev.map(p => p.id === id ? { ...p, status: p.status === "active" ? "discharged" : "active" } : p));
  const remove = (id) => setPatients(prev => prev.filter(p => p.id !== id));

  const startEdit = (patient) => {
    setEditingId(patient.id);
    setEditForm({
      initials: patient.initials || "",
      room: patient.room || "",
      dx: patient.dx || "",
      topics: patient.topics || (patient.topic ? [patient.topic] : []),
      notes: patient.notes || "",
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({ initials: "", room: "", dx: "", topics: [], notes: "" }); };

  const saveEdit = () => {
    if (!editForm.initials.trim() || editForm.topics.length === 0) return;
    setPatients(prev => prev.map(p => p.id === editingId ? { ...p, ...editForm } : p));
    cancelEdit();
  };

  const addFollowUp = (patientId, noteText) => {
    if (!noteText.trim()) return;
    setPatients(prev => prev.map(p => p.id === patientId ? {
      ...p,
      followUps: [...(p.followUps || []), { id: Date.now(), date: new Date().toISOString(), note: noteText.trim() }]
    } : p));
  };

  const removeFollowUp = (patientId, followUpId) => {
    setPatients(prev => prev.map(p => p.id === patientId ? {
      ...p,
      followUps: (p.followUps || []).filter(f => f.id !== followUpId)
    } : p));
  };

  const active = patients.filter(p => p.status === "active");
  const discharged = patients.filter(p => p.status === "discharged");

  const topicColor = (topic) => {
    const map = { AKI: T.accent, CKD: "#8E44AD", Hyponatremia: T.med, Hyperkalemia: T.orange,
      "Acid-Base": T.greenDk, Glomerulonephritis: "#C0392B", "Nephrotic Syndrome": "#D35400",
      Dialysis: T.dark, Transplant: T.green, Hypertension: "#7D3C98" };
    return map[topic] || T.med;
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ color: T.text, fontSize: 16, margin: 0, fontFamily: T.serif, fontWeight: 700 }}>Rounding List</h2>
        <button onClick={() => setShowAdd(!showAdd)}
          style={{ padding: "8px 16px", background: showAdd ? T.sub : T.med, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {showAdd ? "Cancel" : "+ Add Patient"}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 16, border: `2px solid ${T.med}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={inputLabel}>Patient Initials</label>
              <input value={form.initials} onChange={e => setForm({...form, initials: e.target.value})} placeholder="e.g. J.S." style={inputStyle} />
            </div>
            <div>
              <label style={inputLabel}>Room #</label>
              <input value={form.room} onChange={e => setForm({...form, room: e.target.value})} placeholder="e.g. 4B-12" style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={inputLabel}>Consult Reason / Diagnosis</label>
            <input value={form.dx} onChange={e => setForm({...form, dx: e.target.value})} placeholder="e.g. AKI in setting of sepsis" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={inputLabel}>Nephrology Topics (select all that apply)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {TOPICS.map(t => {
                const sel = form.topics.includes(t);
                return (
                  <button key={t} type="button" onClick={() => toggleTopic(t)}
                    style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: sel ? 600 : 400, cursor: "pointer", transition: "all 0.15s",
                      background: sel ? T.med : "white", color: sel ? "white" : T.sub,
                      border: sel ? `1.5px solid ${T.med}` : `1.5px solid ${T.line}` }}>
                    {sel ? "✓ " : ""}{t}
                  </button>
                );
              })}
            </div>
            {form.topics.length === 0 && <div style={{ fontSize: 11, color: T.orange, marginTop: 4 }}>Select at least one topic</div>}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={inputLabel}>Teaching Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Key learning point..."
              rows={2} style={{...inputStyle, resize: "vertical"}} />
          </div>
          <button onClick={addPatient} style={{ width: "100%", padding: "12px 0", background: T.navy, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Add to List
          </button>
        </div>
      )}

      {active.length === 0 && !showAdd && (
        <div style={{ textAlign: "center", padding: 40, color: T.sub }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏥</div>
          <div style={{ fontSize: 14 }}>No active patients</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>Tap "+ Add Patient" to track consults</div>
        </div>
      )}

      {active.map(p => <PatientCard key={p.id} p={p} topicColor={topicColor} onToggle={() => toggle(p.id)} onRemove={() => remove(p.id)}
        isEditing={editingId === p.id} editForm={editForm} onStartEdit={() => startEdit(p)} onCancelEdit={cancelEdit} onSaveEdit={saveEdit}
        onEditChange={setEditForm} onEditToggleTopic={editToggleTopic} onAddFollowUp={addFollowUp} onRemoveFollowUp={removeFollowUp} />)}

      {discharged.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, margin: "20px 0 10px", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Completed / Discharged ({discharged.length})
          </div>
          {discharged.map(p => <PatientCard key={p.id} p={p} topicColor={topicColor} onToggle={() => toggle(p.id)} onRemove={() => remove(p.id)} dimmed
            isEditing={editingId === p.id} editForm={editForm} onStartEdit={() => startEdit(p)} onCancelEdit={cancelEdit} onSaveEdit={saveEdit}
            onEditChange={setEditForm} onEditToggleTopic={editToggleTopic} onAddFollowUp={addFollowUp} onRemoveFollowUp={removeFollowUp} />)}
        </>
      )}
    </div>
  );
}

function PatientCard({ p, topicColor, onToggle, onRemove, dimmed, isEditing, editForm, onStartEdit, onCancelEdit, onSaveEdit, onEditChange, onEditToggleTopic, onAddFollowUp, onRemoveFollowUp }) {
  const [followUpText, setFollowUpText] = useState("");
  const [showFollowUps, setShowFollowUps] = useState(false);

  // Backwards compat: old patients have p.topic (string), new have p.topics (array)
  const topics = p.topics || (p.topic ? [p.topic] : []);
  const followUps = p.followUps || [];
  const primaryColor = topicColor(topics[0] || "Other");

  const handleAddFollowUp = () => {
    if (!followUpText.trim()) return;
    onAddFollowUp(p.id, followUpText);
    setFollowUpText("");
  };

  if (isEditing) {
    return (
      <div style={{ background: T.card, borderRadius: 10, padding: 12, marginBottom: 10, border: `2px solid ${T.med}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.med, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Editing Patient</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={inputLabel}>Initials</label>
            <input value={editForm.initials} onChange={e => onEditChange({...editForm, initials: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label style={inputLabel}>Room #</label>
            <input value={editForm.room} onChange={e => onEditChange({...editForm, room: e.target.value})} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={inputLabel}>Diagnosis</label>
          <input value={editForm.dx} onChange={e => onEditChange({...editForm, dx: e.target.value})} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={inputLabel}>Topics</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {TOPICS.map(t => {
              const sel = editForm.topics.includes(t);
              return (
                <button key={t} type="button" onClick={() => onEditToggleTopic(t)}
                  style={{ padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: sel ? 600 : 400, cursor: "pointer",
                    background: sel ? T.med : "white", color: sel ? "white" : T.sub,
                    border: sel ? `1.5px solid ${T.med}` : `1.5px solid ${T.line}` }}>
                  {sel ? "✓ " : ""}{t}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={inputLabel}>Notes</label>
          <textarea value={editForm.notes} onChange={e => onEditChange({...editForm, notes: e.target.value})} rows={2} style={{...inputStyle, resize: "vertical"}} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onSaveEdit} style={{ flex: 1, padding: "10px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save</button>
          <button onClick={onCancelEdit} style={{ flex: 1, padding: "10px 0", background: T.bg, color: T.sub, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: T.card, borderRadius: 10, marginBottom: 10, overflow: "hidden",
      opacity: dimmed ? 0.55 : 1, border: `1px solid ${T.line}`, borderLeftWidth: 4, borderLeftColor: primaryColor }}>
      <div style={{ padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{p.initials}</span>
              {p.room && <span style={{ fontSize: 11, color: T.sub, background: T.bg, padding: "2px 8px", borderRadius: 4 }}>Rm {p.room}</span>}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
              {topics.map(t => (
                <span key={t} style={{ fontSize: 10, color: "white", background: topicColor(t), padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{t}</span>
              ))}
            </div>
            {p.dx && <div style={{ fontSize: 13, color: T.text, marginBottom: 2, wordBreak: "break-word" }}>{p.dx}</div>}
            {p.notes && <div style={{ fontSize: 11, color: T.sub, fontStyle: "italic", marginTop: 4, wordBreak: "break-word" }}>💡 {p.notes}</div>}
            <div style={{ fontSize: 10, color: T.muted, marginTop: 6 }}>Added {new Date(p.date).toLocaleDateString()}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {!dimmed && (
              <button onClick={onStartEdit} style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 6, padding: "4px 8px", fontSize: 10, cursor: "pointer", color: T.med, fontWeight: 600 }}>✎ Edit</button>
            )}
            <button onClick={onToggle} style={{ background: "none", border: `1px solid ${dimmed ? T.green : T.muted}`, borderRadius: 6, padding: "4px 8px", fontSize: 10, cursor: "pointer", color: dimmed ? T.green : T.sub }}>
              {dimmed ? "↩ Reactivate" : "✓ D/C"}
            </button>
            <button onClick={onRemove} style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 6, padding: "4px 8px", fontSize: 10, cursor: "pointer", color: T.muted }}>✕</button>
          </div>
        </div>
      </div>

      {/* Follow-ups section */}
      <div style={{ borderTop: `1px solid ${T.line}`, padding: "8px 12px" }}>
        {followUps.length > 0 && (
          <button onClick={() => setShowFollowUps(!showFollowUps)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: T.med, fontWeight: 600, padding: "2px 0", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ transform: showFollowUps ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s", display: "inline-block" }}>▸</span>
            Follow-ups ({followUps.length})
          </button>
        )}
        {showFollowUps && followUps.map(f => (
          <div key={f.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "4px 0", marginLeft: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: T.muted }}>{new Date(f.date).toLocaleDateString()} {new Date(f.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              <div style={{ fontSize: 12, color: T.text, wordBreak: "break-word" }}>{f.note}</div>
            </div>
            <button onClick={() => onRemoveFollowUp(p.id, f.id)} style={{ background: "none", border: "none", color: T.muted, fontSize: 12, cursor: "pointer", padding: "0 4px", flexShrink: 0 }}>✕</button>
          </div>
        ))}
        {!dimmed && (
          <div style={{ display: "flex", gap: 6, marginTop: followUps.length > 0 ? 6 : 0 }}>
            <input value={followUpText} onChange={e => setFollowUpText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddFollowUp(); }}
              placeholder="Add follow-up note..."
              style={{ flex: 1, padding: "6px 10px", fontSize: 12, border: `1px solid ${T.line}`, borderRadius: 6, outline: "none", fontFamily: T.sans }} />
            <button onClick={handleAddFollowUp}
              style={{ padding: "6px 12px", background: followUpText.trim() ? T.med : T.pale, color: followUpText.trim() ? "white" : T.muted, border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: followUpText.trim() ? "pointer" : "default" }}>+</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Progress Tab ───────────────────────────────────────────────────
function ProgressTab({ patients, weeklyScores, preScore, postScore, curriculum, gamification }) {
  const topicCounts = {};
  patients.forEach(p => {
    const topics = p.topics || (p.topic ? [p.topic] : []);
    topics.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
  });
  const totalPts = patients.length;
  const topicsCovered = Object.keys(topicCounts).length;

  const totalQuizzesTaken = Object.values(weeklyScores).flat().length + (preScore ? 1 : 0) + (postScore ? 1 : 0);

  return (
    <div style={{ padding: 16 }}>
      {/* Gamification Section */}
      <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: 22 }}>{getLevel(gamification?.points || 0).icon}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: T.navy, marginLeft: 8, fontFamily: T.serif }}>{getLevel(gamification?.points || 0).name}</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.orange }}>{gamification?.points || 0} pts</div>
        </div>
        {getLevel(gamification?.points || 0).nextAt && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.sub, marginBottom: 4 }}>
              <span>{getLevel(gamification?.points || 0).name}</span>
              <span>{getLevel(gamification?.points || 0).next} ({getLevel(gamification?.points || 0).nextAt} pts)</span>
            </div>
            <div style={{ background: T.pale, borderRadius: 6, height: 8, overflow: "hidden" }}>
              <div style={{ background: T.med, height: "100%", borderRadius: 6, width: `${Math.min(100, ((gamification?.points || 0) / getLevel(gamification?.points || 0).nextAt) * 100)}%`, transition: "width 0.5s ease" }} />
            </div>
          </div>
        )}
        <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, marginBottom: 8 }}>
          Achievements ({(gamification?.achievements || []).length}/{ACHIEVEMENTS.length})
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          {ACHIEVEMENTS.map(a => {
            const earned = (gamification?.achievements || []).includes(a.id);
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 10, background: earned ? T.ice : T.bg, border: `1px solid ${earned ? T.pale : T.line}`, opacity: earned ? 1 : 0.5 }}>
                <span style={{ fontSize: 18 }}>{earned ? a.icon : "\u{1F512}"}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: earned ? T.navy : T.muted }}>{a.title}</div>
                  <div style={{ fontSize: 9, color: T.sub }}>{a.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Study Streak Calendar */}
      <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, color: T.navy, fontSize: 15, fontFamily: T.serif }}>Study Streak</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16 }}>🔥</span>
            <span style={{ fontWeight: 700, color: T.orange, fontSize: 18, fontFamily: T.mono }}>{gamification?.streaks?.currentDays || 0}</span>
            <span style={{ fontSize: 11, color: T.sub }}>day{(gamification?.streaks?.currentDays || 0) !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: T.sub, marginBottom: 12 }}>
          Longest streak: {gamification?.streaks?.longestDays || 0} days
        </div>
        {(() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayStr = today.toISOString().slice(0, 10);

          // Build activity log set (with backfill for users without log)
          let logSet = new Set(gamification?.streaks?.activityLog || []);
          if (logSet.size === 0 && gamification?.streaks?.lastActiveDate && gamification?.streaks?.currentDays > 0) {
            const last = new Date(gamification.streaks.lastActiveDate + "T00:00:00");
            for (let i = 0; i < gamification.streaks.currentDays; i++) {
              const d = new Date(last.getTime() - i * 86400000);
              logSet.add(d.toISOString().slice(0, 10));
            }
          }

          // Generate 28 days ending today
          const days = [];
          for (let i = 27; i >= 0; i--) {
            const d = new Date(today.getTime() - i * 86400000);
            days.push(d.toISOString().slice(0, 10));
          }

          const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
          const firstDay = new Date(days[0] + "T00:00:00");
          const padCount = (firstDay.getDay() + 6) % 7; // Mon=0

          return (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
                {dayLabels.map((d, i) => (
                  <div key={i} style={{ textAlign: "center", fontSize: 10, color: T.muted, fontWeight: 600 }}>{d}</div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                {Array.from({ length: padCount }, (_, i) => (
                  <div key={`pad-${i}`} style={{ aspectRatio: "1", borderRadius: 6 }} />
                ))}
                {days.map(d => {
                  const isActive = logSet.has(d);
                  const isToday = d === todayStr;
                  return (
                    <div key={d} style={{
                      aspectRatio: "1", borderRadius: 6,
                      background: isActive ? T.green : T.bg,
                      border: isToday ? `2px solid ${T.med}` : "1px solid transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, color: isActive ? "white" : T.muted, fontWeight: 600,
                    }}>
                      {new Date(d + "T00:00:00").getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      <h2 style={{ color: T.text, fontSize: 16, margin: "0 0 14px", fontFamily: T.serif, fontWeight: 700 }}>Rotation Progress</h2>

      {/* Pre/Post growth card */}
      {preScore && postScore && (
        <div style={{ background: `linear-gradient(135deg, ${T.navy}, ${T.deep})`, borderRadius: 14, padding: 18, marginBottom: 16, color: "white" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: T.pale, marginBottom: 10 }}>Knowledge Growth</div>
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: T.muted }}>Pre-Test</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: T.mono }}>{Math.round((preScore.correct/preScore.total)*100)}%</div>
            </div>
            <div style={{ fontSize: 24, color: T.green }}>→</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: T.green }}>Post-Test</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: T.mono, color: T.green }}>{Math.round((postScore.correct/postScore.total)*100)}%</div>
            </div>
            <div style={{ textAlign: "center", background: "rgba(26,188,156,0.2)", borderRadius: 10, padding: "8px 14px" }}>
              <div style={{ fontSize: 11, color: T.green }}>Growth</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: T.green, fontFamily: T.mono }}>
                +{Math.round((postScore.correct/postScore.total)*100) - Math.round((preScore.correct/preScore.total)*100)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { val: totalPts, label: "Patients Seen", color: T.navy },
          { val: topicsCovered, label: "Topics Covered", color: T.med },
          { val: totalQuizzesTaken, label: "Quizzes Taken", color: T.green },
        ].map((s, i) => (
          <div key={i} style={{ background: T.card, borderRadius: 10, padding: 12, textAlign: "center", border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: T.mono }}>{s.val}</div>
            <div style={{ fontSize: 11, color: T.sub }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Weekly Quiz Scores */}
      <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Weekly Quiz Scores</h3>
      {[1,2,3,4].map(w => {
        const ws = weeklyScores[w] || [];
        const best = ws.length > 0 ? Math.max(...ws.map(s => Math.round((s.correct/s.total)*100))) : null;
        return (
          <div key={w} style={{ background: T.card, borderRadius: 10, padding: 12, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${T.line}` }}>
            <div>
              <div style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>Week {w}: {(curriculum[w] || WEEKLY[w]).title}</div>
              <div style={{ fontSize: 11, color: T.muted }}>{ws.length} attempt{ws.length !== 1 ? "s" : ""}</div>
            </div>
            {best !== null ? (
              <div style={{ fontSize: 20, fontWeight: 700, color: best >= 80 ? T.green : best >= 60 ? T.gold : T.accent, fontFamily: T.mono }}>{best}%</div>
            ) : (
              <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>Not taken</div>
            )}
          </div>
        );
      })}

      {/* Topic Exposure */}
      <h3 style={{ color: T.navy, fontSize: 15, margin: "16px 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Topic Exposure</h3>
      <div style={{ background: T.card, borderRadius: 12, padding: 14, border: `1px solid ${T.line}` }}>
        {TOPICS.slice(0, 16).map(t => {
          const count = topicCounts[t] || 0;
          const maxCount = Math.max(...Object.values(topicCounts), 1);
          return (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 120, fontSize: 11, color: T.text, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t}</div>
              <div style={{ flex: 1, height: 14, background: "#F0F0F0", borderRadius: 7, overflow: "hidden" }}>
                <div style={{ width: count > 0 ? `${Math.max((count / maxCount) * 100, 8)}%` : 0, height: "100%", background: count > 0 ? T.med : "transparent", borderRadius: 7, transition: "width 0.3s" }} />
              </div>
              <div style={{ width: 20, fontSize: 12, fontWeight: 600, color: count > 0 ? T.navy : T.muted, textAlign: "right", fontFamily: T.mono }}>{count}</div>
            </div>
          );
        })}
        {topicsCovered === 0 && (
          <div style={{ textAlign: "center", padding: 16, color: T.muted, fontSize: 13 }}>Start adding patients to see topic coverage</div>
        )}
      </div>

      {/* Gaps */}
      {topicsCovered > 0 && topicsCovered < 10 && (
        <div style={{ background: "#FEF9E7", borderRadius: 12, padding: 14, marginTop: 12, borderLeft: `3px solid ${T.gold}` }}>
          <div style={{ fontWeight: 700, color: T.text, fontSize: 13, marginBottom: 4 }}>Topics Not Yet Seen:</div>
          <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.6 }}>
            {TOPICS.filter(t => !topicCounts[t]).slice(0, 10).join(", ")}
          </div>
        </div>
      )}
    </div>
  );
}


export default StudentApp;
