import { useState, useEffect, useRef } from "react";
import { T, WEEKLY, ARTICLES } from "../data/constants";
import { PRE_QUIZ, POST_QUIZ, WEEKLY_QUIZZES, getQuestionByKey } from "../data/quizzes";
import { processQuizResults, processReviewResults, getDueItems } from "../utils/spacedRepetition";
import store from "../utils/store";
import { ensureGoogleFonts, ensureLayoutStyles, ensureThemeStyles, SHARED_KEYS } from "../utils/helpers";
import { calculatePoints, getLevel, checkAchievements, updateStreak, ACHIEVEMENTS } from "../utils/gamification";

// Extracted sub-components
import ThemeToggle from "./student/ThemeToggle";
import OnboardingOverlay from "./student/OnboardingOverlay";
import LoginScreen from "./student/LoginScreen";
import GlobalSearchOverlay from "./student/GlobalSearchOverlay";
import BookmarksView from "./student/BookmarksView";
import HomeTab from "./student/HomeTab";
import PreTestResultsView from "./student/PreTestResultsView";
import ArticlesView from "./student/ArticlesView";
import LandmarkTrialsView from "./student/LandmarkTrialsView";
import TrialLibraryView from "./student/TrialLibraryView";
import StudySheetsView from "./student/StudySheetsView";
import CasesView from "./student/CasesView";
import ResourcesView from "./student/ResourcesView";
import AbbreviationsView from "./student/AbbreviationsView";
import FaqView from "./student/FaqView";
import QuizEngine from "./student/QuizEngine";
import RefsTab from "./student/RefsTab";
import RefDetailView from "./student/RefDetailView";
import GuideTab from "./student/GuideTab";
import PatientTab from "./student/PatientTab";
import TeamTab from "./student/TeamTab";
import ProgressTab from "./student/ProgressTab";


function StudentApp({ onAdminToggle }) {
  const [tab, setTab] = useState("home");
  const [subView, setSubView] = useState<any>(null); // for quiz week, quick ref id, article week, etc.
  const [patients, setPatients] = useState<any[]>([]);
  const [weeklyScores, setWeeklyScores] = useState<Record<string, any[]>>({});
  const [preScore, setPreScore] = useState<any>(null);
  const [postScore, setPostScore] = useState<any>(null);
  const [studentName, setStudentName] = useState("");
  const [studentPin, setStudentPin] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [curriculum, setCurriculum] = useState(WEEKLY);
  const [articles, setArticles] = useState(ARTICLES);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rotationCode, setRotationCodeState] = useState(store.getRotationCode() || "");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [gamification, setGamification] = useState({ points: 0, achievements: [], streaks: { currentDays: 0, longestDays: 0, lastActiveDate: null } });
  const [toast, setToast] = useState<any>(null);
  const [sharedSettings, setSharedSettings] = useState<any>(null);
  const [completedItems, setCompletedItems] = useState({ articles: {}, studySheets: {}, cases: {} });
  const [searchOpen, setSearchOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState({ trials: [], articles: [], cases: [], studySheets: [] });
  const [srQueue, setSrQueue] = useState({});
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLocalWriteRef = useRef<number>(0);

  const logActivity = (type, label, detail = "") => {
    setActivityLog(prev => [...prev, { type, label, detail, timestamp: new Date().toISOString() }].slice(-50));
  };

  // Deterministic student ID from name + PIN
  const makeStudentId = (name, pin) => {
    const normalized = name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    return `stu_${normalized}_${pin}`;
  };

  // Load from storage on mount
  useEffect(() => {
    ensureGoogleFonts();
    ensureLayoutStyles();
    ensureThemeStyles();
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
      const savedBookmarks = await store.get("neph_bookmarks");
      if (savedBookmarks) setBookmarks(savedBookmarks);
      const savedSrQueue = await store.get("neph_srQueue");
      if (savedSrQueue) setSrQueue(savedSrQueue);
      const savedLog = await store.get("neph_activityLog");
      if (savedLog) setActivityLog(savedLog);
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
    store.set("neph_preScore", preScore);
    store.set("neph_postScore", postScore);
    if (nameSet) store.set("neph_name", studentName);
    store.set("neph_completedItems", completedItems);
    store.set("neph_bookmarks", bookmarks);
    store.set("neph_srQueue", srQueue);
    store.set("neph_activityLog", activityLog);
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
          bookmarks,
          srQueue,
          activityLog,
          updatedAt: new Date().toISOString(),
        });
      }, 2000);
    }
  }, [patients, weeklyScores, preScore, postScore, studentName, nameSet, loading, completedItems, bookmarks, srQueue, activityLog, gamification, studentId]);

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
      // Show toast for newly earned achievements
      if (newlyEarned.length > 0) {
        const achieved = ACHIEVEMENTS.find(a => a.id === newlyEarned[0]);
        if (achieved) {
          setToast(`${achieved.icon} ${achieved.title} earned!`);
          setTimeout(() => setToast(null), 3000);
        }
      }
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
    });
    return () => unsub();
  }, [rotationCode]);

  // Real-time listener: admin changes to this student's data (including resets)
  useEffect(() => {
    if (!store.getRotationCode() || !studentId || !nameSet) return;
    const unsub = store.onStudentDataChanged(studentId, (data) => {
      // Skip snapshots triggered by our own writes (within 3s)
      if (Date.now() - lastLocalWriteRef.current < 3000) return;
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
    });
    return () => unsub();
  }, [studentId, nameSet, rotationCode]);

  const navigate = (t, sv = null) => { setTab(t); setSubView(sv); };

  const toggleBookmark = (type, itemId) => {
    setBookmarks(prev => {
      const arr = prev[type] || [];
      const exists = arr.includes(itemId);
      return { ...prev, [type]: exists ? arr.filter(id => id !== itemId) : [...arr, itemId] };
    });
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
        if (existingData.bookmarks) setBookmarks(existingData.bookmarks);
        if (existingData.srQueue) setSrQueue(existingData.srQueue);
        if (existingData.activityLog) setActivityLog(existingData.activityLog);
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
    ["neph_name", "neph_pin", "neph_studentId", "neph_patients", "neph_weeklyScores", "neph_preScore", "neph_postScore", "neph_rotationCode", "neph_completedItems", "neph_gamification", "neph_bookmarks", "neph_srQueue", "neph_activityLog"].forEach(k => localStorage.removeItem(k));
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
    setCompletedItems({ articles: {}, studySheets: {}, cases: {} });
    setBookmarks({ trials: [], articles: [], cases: [], studySheets: [] });
    setSrQueue({});
    setActivityLog([]);
    setToast(null);
    setTab("home");
    setSubView(null);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.navyBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: T.pale, fontFamily: T.serif, fontSize: 18 }}>Loading...</div>
    </div>
  );

  // Combined onboarding screen (name + PIN + rotation code)
  if (!nameSet) {
    return (
      <LoginScreen
        studentName={studentName} setStudentName={setStudentName}
        studentPin={studentPin} setStudentPin={setStudentPin}
        joinCode={joinCode} setJoinCode={setJoinCode}
        joinError={joinError} setJoinError={setJoinError}
        joining={joining}
        onJoinRotation={handleJoinRotation}
        onSkipRotation={handleSkipRotation}
      />
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
      {searchOpen && <GlobalSearchOverlay onClose={() => setSearchOpen(false)} onNavigate={(t, sv) => { navigate(t, sv); setSearchOpen(false); }} articles={articles} />}
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${T.navyBg} 0%, ${T.deepBg} 100%)`, padding: `calc(10px + env(safe-area-inset-top, 0px)) 16px 10px`, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "white", fontFamily: T.serif, fontSize: 17, fontWeight: 700 }}>Nephrology Rotation</span>
              {gamification.points > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: T.orange, background: T.goldAlpha, padding: "2px 8px", borderRadius: 12 }}>
                  {getLevel(gamification.points).icon} {gamification.points}
                </span>
              )}
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {studentName}
              {rotationCode && <span style={{ marginLeft: 8, fontSize: 10, background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 6, fontFamily: T.mono, letterSpacing: 1 }}>{rotationCode}</span>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <button onClick={() => setSearchOpen(true)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: 14, lineHeight: 1, color: "white", display: "flex", alignItems: "center" }} title="Search">🔍</button>
            <ThemeToggle />
            {onAdminToggle && (
              <button onClick={onAdminToggle} style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "white", fontSize: 11, padding: "5px 10px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }} title="Admin">⚙</button>
            )}
            <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 10, padding: "5px 8px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="tab-content-enter" key={tab + (subView ? JSON.stringify(subView) : "")} style={{ padding: `0 0 ${T.navH + T.navPad}px` }}>
        {tab === "home" && !subView && <HomeTab navigate={navigate} preScore={preScore} postScore={postScore} curriculum={curriculum} articles={articles} announcements={announcements} currentWeek={currentWeek} weeklyScores={weeklyScores} completedItems={completedItems} bookmarks={bookmarks} srDueCount={getDueItems(srQueue).length} patients={patients} srQueue={srQueue} />}
        {tab === "home" && subView?.type === "weeklyQuiz" && (
          <QuizEngine questions={WEEKLY_QUIZZES[subView.week]} title={`Week ${subView.week} Quiz`}
            onBack={() => navigate("home")}
            onFinish={(score) => { setWeeklyScores(prev => ({...prev, [subView.week]: [...(prev[subView.week]||[]), score]})); setSrQueue(prev => processQuizResults(score.answers || [], "weekly", subView.week, prev)); logActivity("quiz", `Week ${subView.week} Quiz`, `${score.correct}/${score.total}`); navigate("home"); }} />
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
            onFinish={(score) => { setPreScore(score); setSrQueue(prev => processQuizResults(score.answers || [], "pre", 0, prev)); logActivity("assessment", "Pre-Rotation Assessment", `${score.correct}/${score.total}`); navigate("home", { type: "preResults" }); }} />
        )}
        {tab === "home" && subView?.type === "preResults" && (
          <PreTestResultsView preScore={preScore} navigate={navigate} />
        )}
        {tab === "home" && subView?.type === "postQuiz" && (
          <QuizEngine questions={POST_QUIZ} title="Post-Rotation Assessment"
            onBack={() => navigate("home")}
            onFinish={(score) => { setPostScore(score); setSrQueue(prev => processQuizResults(score.answers || [], "post", 0, prev)); logActivity("assessment", "Post-Rotation Assessment", `${score.correct}/${score.total}`); navigate("home"); }} />
        )}
        {tab === "home" && subView?.type === "articles" && (
          <ArticlesView week={subView.week} onBack={() => navigate("home")} curriculum={curriculum} articles={articles} completedItems={completedItems} bookmarks={bookmarks} onToggleBookmark={(url) => toggleBookmark("articles", url)} onToggleComplete={(url) => {
            setCompletedItems(prev => {
              const next = { ...prev, articles: { ...prev.articles } };
              if (next.articles[url]) delete next.articles[url];
              else next.articles[url] = true;
              return next;
            });
          }} />
        )}
        {tab === "home" && subView?.type === "trials" && (
          <LandmarkTrialsView week={subView.week} onBack={() => navigate("home")} bookmarks={bookmarks} onToggleBookmark={(name) => toggleBookmark("trials", name)} />
        )}
        {tab === "home" && subView?.type === "studySheets" && (
          <StudySheetsView week={subView.week} onBack={() => navigate("home")} completedItems={completedItems} bookmarks={bookmarks} onToggleBookmark={(id) => toggleBookmark("studySheets", id)} onToggleComplete={(sheetId) => {
            setCompletedItems(prev => {
              const next = { ...prev, studySheets: { ...prev.studySheets } };
              if (next.studySheets[sheetId]) delete next.studySheets[sheetId];
              else next.studySheets[sheetId] = true;
              return next;
            });
          }} />
        )}
        {tab === "home" && subView?.type === "cases" && (
          <CasesView week={subView.week} onBack={() => navigate("home")} completedItems={completedItems} bookmarks={bookmarks} onToggleBookmark={(id) => toggleBookmark("cases", id)} onCaseComplete={(caseId, result) => {
            setCompletedItems(prev => ({
              ...prev,
              cases: { ...prev.cases, [caseId]: { score: result.score, total: result.total, date: new Date().toISOString() } }
            }));
            logActivity("case", `Clinical Case: ${caseId}`, `${result.score}/${result.total}`);
          }} />
        )}
        {tab === "home" && subView?.type === "resources" && (
          <ResourcesView onBack={() => navigate("home")} />
        )}
        {tab === "home" && subView?.type === "abbreviations" && (
          <AbbreviationsView onBack={() => navigate("home")} />
        )}
        {tab === "home" && subView?.type === "faq" && (
          <FaqView onBack={() => navigate("home")} />
        )}
        {tab === "home" && subView?.type === "bookmarks" && (
          <BookmarksView bookmarks={bookmarks} onBack={() => navigate("home")} onNavigate={navigate} onToggleBookmark={toggleBookmark} articles={articles} />
        )}
        {tab === "home" && subView?.type === "extraPractice" && (() => {
          const dueKeys = getDueItems(srQueue);
          const allWeeklyQs = [1,2,3,4].flatMap(w => (WEEKLY_QUIZZES[w] || []).map((q, i) => ({ ...q, _key: `weekly_${w}_${i}` })));
          return (
            <div style={{ padding: 16 }}>
              <button onClick={() => navigate("home")} style={{ background: "none", border: "none", color: T.med, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>{"\u2190"} Back</button>
              <h2 style={{ color: T.navy, fontFamily: T.serif, fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>Extra Practice</h2>
              <p style={{ color: T.sub, fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>Review missed questions or practice from the full question bank.</p>
              {dueKeys.length > 0 && (
                <button onClick={() => navigate("home", { type: "srReview" })}
                  style={{ width: "100%", background: `linear-gradient(135deg, ${T.orange}, ${T.gold})`, borderRadius: 12, padding: 16, border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                  <span style={{ fontSize: 26, flexShrink: 0 }}>{"\uD83D\uDD04"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "white", fontSize: 15 }}>Spaced Repetition Review</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>{dueKeys.length} question{dueKeys.length !== 1 ? "s" : ""} due — missed questions resurface at increasing intervals</div>
                  </div>
                  <span style={{ background: "white", color: T.accent, fontSize: 13, fontWeight: 700, padding: "4px 10px", borderRadius: 12, flexShrink: 0 }}>{dueKeys.length}</span>
                </button>
              )}
              <button onClick={() => navigate("home", { type: "practiceQuiz" })}
                style={{ width: "100%", background: T.card, borderRadius: 12, padding: 16, border: `1.5px solid ${T.med}`, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <span style={{ fontSize: 26, flexShrink: 0 }}>{"\uD83D\uDCDD"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Practice Questions</div>
                  <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>15 random questions from the full bank of {allWeeklyQs.length}</div>
                </div>
              </button>
              {Object.keys(srQueue).length > 0 && (
                <div style={{ background: T.ice, borderRadius: 10, padding: 14, marginTop: 8, borderLeft: `3px solid ${T.med}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.navy, marginBottom: 6 }}>SR Queue Stats</div>
                  <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.6 }}>
                    <div>Total in queue: {Object.keys(srQueue).length}</div>
                    <div>Due now: {dueKeys.length}</div>
                    <div>Mastered (interval &gt; 21 days): {Object.values(srQueue).filter(i => i.interval > 21).length}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        {tab === "home" && subView?.type === "srReview" && (() => {
          const dueKeys = getDueItems(srQueue);
          const dueQuestions = dueKeys.map(key => {
            const q = getQuestionByKey(key);
            return q ? { ...q, _srKey: key } : null;
          }).filter(Boolean);
          return dueQuestions.length > 0 ? (
            <QuizEngine questions={dueQuestions} title="Spaced Repetition Review"
              onBack={() => navigate("home", { type: "extraPractice" })}
              onFinish={(score) => {
                const reviewAnswers = (score.answers || []).map(a => ({
                  questionKey: dueQuestions[a.qIdx]?._srKey,
                  correct: a.correct,
                })).filter(a => a.questionKey);
                setSrQueue(prev => processReviewResults(reviewAnswers, prev));
                logActivity("sr_review", "Spaced Repetition Review", `${score.correct}/${score.total}`);
                navigate("home", { type: "extraPractice" });
              }} />
          ) : (
            <div style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{"\u2705"}</div>
              <div style={{ color: T.navy, fontFamily: T.serif, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>All caught up!</div>
              <div style={{ color: T.sub, fontSize: 13, marginBottom: 20 }}>No questions due for review right now.</div>
              <button onClick={() => navigate("home", { type: "extraPractice" })} style={{ padding: "10px 24px", background: T.med, color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Back</button>
            </div>
          );
        })()}
        {tab === "home" && subView?.type === "practiceQuiz" && (() => {
          const allWeeklyQs = [1,2,3,4].flatMap(w => WEEKLY_QUIZZES[w] || []);
          return (
            <QuizEngine questions={allWeeklyQs} title="Practice Questions" questionCount={15}
              onBack={() => navigate("home", { type: "extraPractice" })}
              onFinish={() => navigate("home", { type: "extraPractice" })} />
          );
        })()}
        {tab === "refs" && !subView && <RefsTab navigate={navigate} />}
        {tab === "refs" && subView?.type === "refDetail" && (
          <RefDetailView refId={subView.id} onBack={() => navigate("refs")} />
        )}
        {tab === "guide" && subView?.type === "trialLibrary" && (
          <TrialLibraryView onBack={() => navigate("guide")} bookmarks={bookmarks} onToggleBookmark={(name) => toggleBookmark("trials", name)} />
        )}
        {tab === "guide" && subView?.type !== "trialLibrary" && <GuideTab navigate={navigate} subView={subView} />}
        {tab === "patients" && <PatientTab patients={patients} setPatients={setPatients} />}
        {tab === "team" && <TeamTab currentStudentId={studentId} />}
        {tab === "progress" && <ProgressTab patients={patients} weeklyScores={weeklyScores} preScore={preScore} postScore={postScore} curriculum={curriculum} gamification={gamification} />}
      </div>

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
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default StudentApp;
