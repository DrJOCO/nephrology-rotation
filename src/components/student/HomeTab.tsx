import { useState, useMemo, useEffect, useRef } from "react";
import { T, WEEKLY, ARTICLES, ABBREVIATIONS, LANDMARK_TRIALS, STUDY_SHEETS } from "../../data/constants";
import { WEEKLY_QUIZZES } from "../../data/quizzes";
import { WEEKLY_CASES } from "../../data/cases";
import { PRO_TIPS } from "./shared";
import { getRecommendations } from "../../utils/recommendations";
import { getPatientSuggestedActions } from "../../utils/patientRecommendations";

export default function HomeTab({ navigate, preScore, postScore, curriculum, articles, announcements, currentWeek, totalWeeks = 4, weeklyScores, completedItems, bookmarks, srDueCount, patients, srQueue }) {
  const [expanded, setExpanded] = useState(currentWeek || null);
  // Pick a random tip on each mount (changes on every screen change)
  const [mountTime] = useState(() => Date.now());
  const [tipIndex] = useState(() => Math.floor(Math.random() * PRO_TIPS.length));

  // Filter announcements to only those < 7 days old
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const activeAnnouncements = useMemo(() => announcements.filter(a => {
    if (!a.date) return true; // legacy announcements without dates still show
    return (mountTime - new Date(a.date).getTime()) < SEVEN_DAYS;
  }), [announcements, mountTime, SEVEN_DAYS]);

  // Relative time helper
  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = mountTime - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "yesterday";
    return `${days}d ago`;
  };

  // Today's Priorities computation
  const activePatientCount = (patients || []).filter(p => p.status === "active").length;

  const unreadAnnouncementCount = useMemo(() => {
    const lastSeen = localStorage.getItem("neph_lastAnnouncementSeen");
    const lastSeenTime = lastSeen ? new Date(lastSeen).getTime() : 0;
    return announcements.filter(a => a.date && new Date(a.date).getTime() > lastSeenTime).length;
  }, [announcements]);

  // Keep a ref to the latest announcements so the unmount cleanup can read it
  // without adding announcements to the effect's dependency array.
  const announcementsRef = useRef(announcements);
  announcementsRef.current = announcements;

  // Mark announcements as seen only on true unmount (empty deps),
  // so the badge stays visible even if new announcements arrive while on this tab.
  useEffect(() => {
    return () => {
      if (announcementsRef.current.length > 0) {
        localStorage.setItem("neph_lastAnnouncementSeen", new Date().toISOString());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const incompleteWeekTasks = useMemo(() => {
    if (!currentWeek) return 0;
    const wkArticles = (articles[currentWeek] || []).length;
    const readArticles = (articles[currentWeek] || []).filter(a => (completedItems?.articles || {})[a.url]).length;
    const wkSheets = (STUDY_SHEETS[currentWeek] || []).length;
    const doneSheets = (STUDY_SHEETS[currentWeek] || []).filter(s => (completedItems?.studySheets || {})[s.id]).length;
    const wkCases = (WEEKLY_CASES[currentWeek] || []).length;
    const doneCases = (WEEKLY_CASES[currentWeek] || []).filter(c => (completedItems?.cases || {})[c.id]).length;
    return (wkArticles - readArticles) + (wkSheets - doneSheets) + (wkCases - doneCases);
  }, [currentWeek, articles, completedItems]);

  const hasPriorities = srDueCount > 0 || unreadAnnouncementCount > 0 || incompleteWeekTasks > 0 || activePatientCount > 0;

  return (
    <div style={{ padding: 16 }}>
      {/* Today's Priorities */}
      {hasPriorities && (
        <div style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 16, border: `1.5px solid ${T.med}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, fontFamily: T.serif, marginBottom: 10 }}>Today's Priorities</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {srDueCount > 0 && (
              <button onClick={() => navigate("home", { type: "srReview" })}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: T.yellowBg, border: `1px solid ${T.goldAlpha}`, borderRadius: 8, cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 16 }}>🔄</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.orange }}>{srDueCount}</div>
                  <div style={{ fontSize: 10, color: T.sub }}>SR due</div>
                </div>
              </button>
            )}
            {unreadAnnouncementCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: T.redBg, border: `1px solid ${T.redAlpha}`, borderRadius: 8 }}>
                <span style={{ fontSize: 16 }}>📢</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>{unreadAnnouncementCount}</div>
                  <div style={{ fontSize: 10, color: T.sub }}>New announcements</div>
                </div>
              </div>
            )}
            {incompleteWeekTasks > 0 && currentWeek && (
              <button onClick={() => navigate("home")}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: T.blueBg, border: `1px solid ${T.med}`, borderRadius: 8, cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 16 }}>📋</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.med }}>{incompleteWeekTasks}</div>
                  <div style={{ fontSize: 10, color: T.sub }}>Week {currentWeek} tasks</div>
                </div>
              </button>
            )}
            {activePatientCount > 0 && (
              <button onClick={() => navigate("patients")}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: T.greenBg, border: `1px solid ${T.greenAlpha}`, borderRadius: 8, cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 16 }}>🏥</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.greenDk }}>{activePatientCount}</div>
                  <div style={{ fontSize: 10, color: T.sub }}>Active patients</div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pre/Post Rotation Assessment Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <button onClick={() => navigate("home", { type: preScore ? "preResults" : "preQuiz" })}
          style={{ background: preScore ? T.ice : `linear-gradient(135deg, ${T.med}, ${T.sky})`, borderRadius: 12, padding: 14, border: "none", cursor: "pointer", textAlign: "left", position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: preScore ? T.med : "rgba(255,255,255,0.8)", marginBottom: 4 }}>Pre-Rotation</div>
          <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: preScore ? T.navy : "white", marginBottom: 2 }}>
            {preScore ? `${Math.round((preScore.correct/preScore.total)*100)}%` : "Take Quiz"}
          </div>
          <div style={{ fontSize: 10, color: preScore ? T.sub : "rgba(255,255,255,0.7)" }}>
            {preScore ? `${preScore.correct}/${preScore.total} correct` : "25 questions \u2022 Baseline"}
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
            {postScore ? `${postScore.correct}/${postScore.total} correct` : "25 questions \u2022 Final"}
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
          <span style={{ fontSize: 16 }}>{"\uD83D\uDCCD"}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>You are in Week {currentWeek}{totalWeeks < 4 ? ` of ${totalWeeks}` : ""}</div>
            <div style={{ fontSize: 11, color: T.sub }}>{(curriculum[currentWeek] || WEEKLY[currentWeek])?.title}</div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2 style={{ color: T.text, fontSize: 16, margin: 0, fontFamily: T.serif, fontWeight: 700 }}>This Week's Focus</h2>
        <button onClick={() => navigate("home", { type: "browseByTopic" })}
          style={{ background: T.purpleBg, color: T.purpleAccent, border: `1px solid ${T.purpleSoft}`, borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          Browse by Topic
        </button>
      </div>
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
              <span style={{ color: T.med, fontSize: 16, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>{"\u25BE"}</span>
            </button>
            {isOpen && (
              <div style={{ padding: "0 16px 16px" }}>
                {/* Topic pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {wk.topics.map(t => (
                    <span key={t} style={{ background: T.pale, color: T.navy, fontSize: 10, padding: "3px 8px", borderRadius: 10, fontWeight: 500 }}>{t}</span>
                  ))}
                </div>
                {/* Action buttons — Study Sheets, Cases, Quiz, Articles, Trials */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(() => {
                    const sheets = STUDY_SHEETS[w] || [];
                    const doneCount = sheets.filter(s => (completedItems?.studySheets || {})[s.id]).length;
                    return (
                      <button onClick={() => navigate("home", { type: "studySheets", week: w })}
                        style={{ width: "100%", padding: "10px 0", background: T.purpleBg, color: T.purpleAccent, border: `1.5px solid ${T.purpleSoft}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        {"\uD83D\uDCCB"} Study Sheets ({doneCount}/{sheets.length} done)
                      </button>
                    );
                  })()}
                  {(() => {
                    const wkCases = WEEKLY_CASES[w] || [];
                    const caseDone = wkCases.filter(c => (completedItems?.cases || {})[c.id]).length;
                    return wkCases.length > 0 ? (
                      <button onClick={() => navigate("home", { type: "cases", week: w })}
                        style={{ width: "100%", padding: "10px 0", background: T.greenBg, color: T.greenDk, border: `1.5px solid ${T.green}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        {"\uD83C\uDFE5"} Clinical Cases ({caseDone}/{wkCases.length} done)
                      </button>
                    ) : null;
                  })()}
                  {(() => {
                    const ws = (weeklyScores || {})[w] || [];
                    const best = ws.length > 0 ? Math.max(...ws.map(s => Math.round((s.correct / s.total) * 100))) : null;
                    return (
                      <button onClick={() => navigate("home", { type: "weeklyQuiz", week: w })}
                        style={{ width: "100%", padding: "10px 0", background: best !== null ? T.ice : T.med, color: best !== null ? T.navy : "white", border: best !== null ? `1.5px solid ${T.med}` : "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        {"\uD83D\uDCDD"} Week {w} Quiz ({(WEEKLY_QUIZZES[w]||[]).length} questions)
                        {best !== null && (
                          <span style={{ background: best >= 80 ? T.green : best >= 60 ? T.gold : T.accent, color: "white", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>
                            Best: {best}%
                          </span>
                        )}
                      </button>
                    );
                  })()}
                  {(() => {
                    const arts = articles[w] || [];
                    const readCount = arts.filter(a => (completedItems?.articles || {})[a.url]).length;
                    return (
                      <button onClick={() => navigate("home", { type: "articles", week: w })}
                        style={{ width: "100%", padding: "10px 0", background: T.card, color: T.med, border: `1.5px solid ${T.med}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        {"\uD83D\uDCC4"} Journal Articles ({readCount}/{arts.length} read)
                      </button>
                    );
                  })()}
                  <button onClick={() => navigate("home", { type: "trials", week: w })}
                    style={{ width: "100%", padding: "10px 0", background: T.yellowBg, color: T.goldText, border: `1.5px solid ${T.gold}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {"\u2B50"} Landmark Trials ({(LANDMARK_TRIALS[w]||[]).length})
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ── From Your Current Patients ─────────────────────────────── */}
      {(() => {
        const patientActions = getPatientSuggestedActions(patients || [], completedItems);
        const activeCount = (patients || []).filter(p => p.status === "active").length;
        return (
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <h2 style={{ color: T.text, fontSize: 16, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>From Your Current Patients</h2>
            {patientActions.length > 0 ? (
              <div style={{ background: T.card, borderRadius: 12, padding: 14, border: `1.5px solid ${T.green}` }}>
                <div style={{ fontSize: 11, color: T.sub, marginBottom: 10 }}>
                  Based on your {activeCount} active consult{activeCount !== 1 ? "s" : ""}
                </div>
                {patientActions.map((action, i) => (
                  <button key={i} onClick={() => navigate(...action.nav)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: T.bg, border: `1px solid ${T.line}`, borderRadius: 8, marginBottom: 6, cursor: "pointer", textAlign: "left" }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{action.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{action.label}</div>
                      <div style={{ fontSize: 10, color: T.muted }}>{action.detail}</div>
                    </div>
                    <span style={{ color: T.muted, fontSize: 14, flexShrink: 0 }}>{"\u203A"}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ background: T.card, borderRadius: 12, padding: 14, border: `1px dashed ${T.line}`, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: T.muted }}>Log patients in the Rounds tab to get consult-driven suggestions</div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Due for Review ─────────────────────────────────────────── */}
      <h2 style={{ color: T.text, fontSize: 16, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Due for Review</h2>

      {/* Extra Practice */}
      <button onClick={() => navigate("home", { type: "extraPractice" })}
        style={{ width: "100%", background: T.card, borderRadius: 12, padding: 16, border: `1.5px solid ${T.med}`, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14, marginTop: 6, marginBottom: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: T.blueBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{"\uD83E\uDDE0"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: T.navy, fontSize: 15, fontFamily: T.serif }}>Extra Practice</div>
          <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>
            {srDueCount > 0 ? `${srDueCount} question${srDueCount !== 1 ? "s" : ""} due for review` : "Practice more questions"}
          </div>
        </div>
        {srDueCount > 0 && (
          <span style={{ background: T.med, color: "white", fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 10, flexShrink: 0 }}>{srDueCount}</span>
        )}
        <span style={{ color: T.muted, fontSize: 16, flexShrink: 0 }}>{"\u203A"}</span>
      </button>

      {/* AI Recommendations — rule-based weak area detection */}
      {(() => {
        const recs = getRecommendations({ weeklyScores, preScore, postScore, srQueue: srQueue || {}, completedItems, patients: patients || [] });
        if (!recs.stats.hasEnoughData) return null;
        return (
          <div style={{ background: T.card, borderRadius: 12, padding: 16, marginBottom: 12, border: `1.5px solid ${T.purple}`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, right: 0, background: T.purpleBg, padding: "4px 12px 4px 16px", borderBottomLeftRadius: 10, fontSize: 9, fontWeight: 700, color: T.purpleAccent, textTransform: "uppercase", letterSpacing: 0.5 }}>Smart Insights</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>{"\uD83C\uDFAF"}</span>
              <div>
                <div style={{ fontWeight: 700, color: T.navy, fontSize: 15, fontFamily: T.serif }}>Focus Areas</div>
                {recs.stats.avgScore !== null && <div style={{ fontSize: 11, color: T.sub }}>Average quiz score: {recs.stats.avgScore}%</div>}
              </div>
            </div>
            {/* Focus area cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              {recs.focusAreas.map(area => (
                <div key={area.week} style={{ background: area.isWeak ? T.redBg : T.greenBg, borderRadius: 8, padding: 10, border: `1px solid ${area.isWeak ? T.redAlpha : T.greenAlpha}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.3 }}>Week {area.week}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.navy, marginTop: 2 }}>{area.label}</div>
                  <div style={{ fontSize: 10, color: area.isWeak ? T.accent : T.greenDk, marginTop: 3, fontWeight: 600 }}>
                    {area.score !== null ? `${area.score}%` : "—"} {area.isWeak ? "⚠" : "✓"}
                  </div>
                  <div style={{ fontSize: 10, color: T.sub, marginTop: 1 }}>{area.reason}</div>
                </div>
              ))}
            </div>
            {/* Suggested actions */}
            {recs.suggestedActions.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Suggested Next Steps</div>
                {recs.suggestedActions.slice(0, 3).map((action, i) => (
                  <button key={i} onClick={() => navigate(...action.nav)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: T.bg, border: `1px solid ${T.line}`, borderRadius: 8, marginBottom: 6, cursor: "pointer", textAlign: "left" }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{action.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{action.label}</div>
                      <div style={{ fontSize: 10, color: T.muted }}>{action.detail}</div>
                    </div>
                    <span style={{ color: T.muted, fontSize: 14, flexShrink: 0 }}>{"\u203A"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Pro Tip — rotates on each screen change */}
      <div style={{ background: T.ice, borderRadius: 10, padding: "10px 14px", marginTop: 10, marginBottom: 16, borderLeft: `3px solid ${T.med}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{"\uD83D\uDCA1"}</span>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.med, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Nephrology Pro Tip</div>
          <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5 }}>{PRO_TIPS[tipIndex]}</div>
          <div style={{ fontSize: 10, color: T.muted, marginTop: 6, fontStyle: "italic" }}>
            Adapted from <em>Nephrology Secrets</em>, 4th Edition (Elsevier)
          </div>
        </div>
      </div>

      {/* Bookmarks Quick Access */}
      {(() => { const totalBk = Object.values(bookmarks || {}).flat().length; return totalBk > 0 && (
        <button onClick={() => navigate("home", { type: "bookmarks" })}
          style={{ width: "100%", background: T.yellowBg, borderRadius: 12, padding: 14, border: `1px solid ${T.goldAlpha}`, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 22 }}>{"\u2B50"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>Saved Items</div>
            <div style={{ fontSize: 11, color: T.sub }}>{totalBk} bookmarked</div>
          </div>
          <span style={{ color: T.muted, fontSize: 14 }}>{"\u203A"}</span>
        </button>
      ); })()}

      {/* Resources & Abbreviations */}
      <h2 style={{ color: T.text, fontSize: 16, margin: "20px 0 12px", fontFamily: T.serif, fontWeight: 700 }}>Resources</h2>
      <button onClick={() => navigate("home", { type: "resources" })}
        style={{ display: "block", width: "100%", background: T.card, borderRadius: 12, padding: 14, marginBottom: 10, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: T.greenBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{"\uD83C\uDFA7"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>Podcasts, Websites & Guidelines</div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>Curbsiders, Freely Filtered, NephJC, KDIGO & more</div>
          </div>
          <span style={{ color: T.muted, fontSize: 16, flexShrink: 0 }}>{"\u203A"}</span>
        </div>
      </button>
      <button onClick={() => navigate("home", { type: "abbreviations" })}
        style={{ display: "block", width: "100%", background: T.card, borderRadius: 12, padding: 14, marginBottom: 10, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: T.blueBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{"\uD83D\uDCD6"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>Nephrology Abbreviations</div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{ABBREVIATIONS.length} terms {"\u2014"} searchable quick reference</div>
          </div>
          <span style={{ color: T.muted, fontSize: 16, flexShrink: 0 }}>{"\u203A"}</span>
        </div>
      </button>
      <button onClick={() => navigate("home", { type: "faq" })}
        style={{ display: "block", width: "100%", background: T.card, borderRadius: 12, padding: 14, marginBottom: 10, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: T.yellowBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{"\u2753"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>Rotation FAQ</div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>Common questions answered</div>
          </div>
          <span style={{ color: T.muted, fontSize: 16, flexShrink: 0 }}>{"\u203A"}</span>
        </div>
      </button>

      {/* Copyright Footer */}
      <div style={{ textAlign: "center", padding: "24px 16px 8px", marginTop: 12, borderTop: `1px solid ${T.line}` }}>
        <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.6 }}>
          &copy; {new Date().getFullYear()} Jonathan Cheng, MD MPH
        </div>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
          Premier Nephrology {"\u00B7"} For educational use only
        </div>
      </div>
    </div>
  );
}
