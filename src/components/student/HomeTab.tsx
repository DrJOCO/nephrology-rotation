import { useState, useMemo, useEffect, useRef } from "react";
import { T, WEEKLY, ARTICLES, LANDMARK_TRIALS, STUDY_SHEETS } from "../../data/constants";
import { WEEKLY_QUIZZES } from "../../data/quizzes";
import { WEEKLY_CASES } from "../../data/cases";
import { PRO_TIPS } from "./shared";
import { getRecommendations } from "../../utils/recommendations";
import { getPatientSuggestedActions } from "../../utils/patientRecommendations";
import { useIsMobile } from "../../utils/helpers";

export default function HomeTab({ navigate, preScore, postScore, curriculum, articles, announcements, currentWeek, totalWeeks = 4, rotationEnded = false, weeklyScores, completedItems, bookmarks, srDueCount, patients, srQueue }) {
  const isMobile = useIsMobile();
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
        <div style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 16, border: `1px solid ${T.line}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, fontFamily: T.serif, marginBottom: 10 }}>Today's Priorities</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
            {srDueCount > 0 && (
              <button onClick={() => navigate("home", { type: "srReview" })}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: isMobile ? "12px 12px" : "8px 10px", background: T.yellowBg, border: `1px solid ${T.goldAlpha}`, borderRadius: 8, cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 16 }}>🔄</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.orange }}>{srDueCount}</div>
                  <div style={{ fontSize: 10, color: T.sub }}>SR due</div>
                </div>
              </button>
            )}
            {unreadAnnouncementCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: isMobile ? "12px 12px" : "8px 10px", background: T.redBg, border: `1px solid ${T.redAlpha}`, borderRadius: 8 }}>
                <span style={{ fontSize: 16 }}>📢</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>{unreadAnnouncementCount}</div>
                  <div style={{ fontSize: 10, color: T.sub }}>New announcements</div>
                </div>
              </div>
            )}
            {incompleteWeekTasks > 0 && currentWeek && (
              <button onClick={() => navigate("home")}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: isMobile ? "12px 12px" : "8px 10px", background: T.blueBg, border: `1px solid ${T.med}`, borderRadius: 8, cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 16 }}>📋</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.med }}>{incompleteWeekTasks}</div>
                  <div style={{ fontSize: 10, color: T.sub }}>Week {currentWeek} tasks</div>
                </div>
              </button>
            )}
            {activePatientCount > 0 && (
              <button onClick={() => navigate("patients")}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: isMobile ? "12px 12px" : "8px 10px", background: T.greenBg, border: `1px solid ${T.greenAlpha}`, borderRadius: 8, cursor: "pointer", textAlign: "left" }}>
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
      {!preScore ? (
        // Pre-quiz not taken — show full CTA
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <button onClick={() => navigate("home", { type: "preQuiz" })}
            style={{ background: T.blueBg, borderRadius: 12, padding: 16, border: `1.5px solid ${T.med}`, cursor: "pointer", textAlign: "left" }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: T.med, marginBottom: 4 }}>Pre-Rotation</div>
            <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 2 }}>Take Quiz</div>
            <div style={{ fontSize: 10, color: T.sub }}>25 questions · Baseline</div>
          </button>
          <button onClick={() => navigate("home", { type: "postQuiz" })}
            style={{ background: T.card, borderRadius: 12, padding: 16, border: `1.5px dashed ${T.line}`, cursor: "pointer", textAlign: "left", opacity: 0.5 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: T.muted, marginBottom: 4 }}>Post-Rotation</div>
            <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: T.sub, marginBottom: 2 }}>Take Quiz</div>
            <div style={{ fontSize: 10, color: T.muted }}>Available at rotation end</div>
          </button>
        </div>
      ) : rotationEnded && !postScore ? (
        // Rotation over — prompt post-quiz prominently
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button onClick={() => navigate("home", { type: "preResults" })}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", background: T.ice, borderRadius: 10, padding: "8px 12px", border: `1px solid ${T.pale}`, cursor: "pointer", textAlign: "left" }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: T.med }}>Pre-Rotation</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>{Math.round((preScore.correct / preScore.total) * 100)}%</div>
              </div>
              <div style={{ fontSize: 10, color: T.sub }}>{preScore.correct}/{preScore.total} ›</div>
            </button>
          </div>
          <button onClick={() => navigate("home", { type: "postQuiz" })}
            style={{ width: "100%", background: `linear-gradient(135deg, ${T.greenBg}, rgba(26,188,156,0.08))`, borderRadius: 12, padding: 16, border: `1.5px solid ${T.green}`, cursor: "pointer", textAlign: "left", boxSizing: "border-box" }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: T.greenDk, marginBottom: 4 }}>🎉 Rotation Complete</div>
            <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 2 }}>Take Post-Rotation Quiz</div>
            <div style={{ fontSize: 10, color: T.sub }}>See how much you've learned · 25 questions</div>
          </button>
        </div>
      ) : (
        // Both scores exist OR rotation still ongoing with pre done — compact row
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={() => navigate("home", { type: "preResults" })}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", background: T.ice, borderRadius: 10, padding: "8px 12px", border: `1px solid ${T.pale}`, cursor: "pointer", textAlign: "left" }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: T.med }}>Pre-Rotation</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>{Math.round((preScore.correct / preScore.total) * 100)}%</div>
            </div>
            <div style={{ fontSize: 10, color: T.sub }}>{preScore.correct}/{preScore.total} ›</div>
          </button>
          <button onClick={() => navigate("home", { type: "postQuiz" })}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", background: postScore ? T.greenBg : T.card, borderRadius: 10, padding: "8px 12px", border: postScore ? `1px solid ${T.greenAlpha}` : `1px dashed ${T.line}`, cursor: "pointer", textAlign: "left" }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: postScore ? T.greenDk : T.muted }}>Post-Rotation</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: postScore ? T.greenDk : T.sub }}>
                {postScore ? `${Math.round((postScore.correct / postScore.total) * 100)}%` : "At end of rotation"}
              </div>
            </div>
            {postScore ? (
              <div style={{ fontSize: 10, fontWeight: 700, color: T.greenDk }}>
                {Math.round((postScore.correct/postScore.total)*100) - Math.round((preScore.correct/preScore.total)*100) >= 0 ? "+" : ""}
                {Math.round((postScore.correct/postScore.total)*100) - Math.round((preScore.correct/preScore.total)*100)}%
              </div>
            ) : (
              <div style={{ fontSize: 10, color: T.muted }}>—</div>
            )}
          </button>
        </div>
      )}

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2 style={{ color: T.text, fontSize: 16, margin: 0, fontFamily: T.serif, fontWeight: 700 }}>This Week's Focus</h2>
        <button onClick={() => navigate("home", { type: "browseByTopic" })}
          style={{ background: T.purpleBg, color: T.purpleAccent, border: `1px solid ${T.purpleSoft}`, borderRadius: 8, padding: isMobile ? "8px 12px" : "4px 10px", fontSize: isMobile ? 12 : 11, fontWeight: 600, cursor: "pointer" }}>
          Browse by Topic
        </button>
      </div>
      {[1,2,3,4].map(w => {
        const wk = curriculum[w] || WEEKLY[w];
        const isOpen = expanded === w;
        const isCurrent = w === currentWeek;
        return (
          <div key={w} style={{ marginBottom: 8, background: T.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${isOpen ? T.med + "60" : T.line}`, transition: "border 0.2s" }}>
            {/* Week header row */}
            <button onClick={() => setExpanded(isOpen ? null : w)}
              style={{ width: "100%", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: isCurrent ? T.med : T.ice, color: isCurrent ? "white" : T.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {w}
              </div>
              <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: T.navy, fontSize: 14, fontFamily: T.serif }}>{wk.title}</span>
                  {isCurrent && <span style={{ fontSize: 9, fontWeight: 700, background: T.med, color: "white", padding: "2px 6px", borderRadius: 6, letterSpacing: 0.5 }}>CURRENT</span>}
                </div>
                <div style={{ fontSize: 11, color: T.sub, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wk.sub}</div>
              </div>
              <span style={{ color: T.muted, fontSize: 14, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)", flexShrink: 0 }}>▾</span>
            </button>

            {isOpen && (
              <div style={{ padding: "0 14px 14px" }}>
                <div style={{ height: 1, background: T.line, marginBottom: 12 }} />
                {/* Topic pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
                  {wk.topics.map(t => (
                    <span key={t} style={{ background: T.ice, color: T.navy, fontSize: 10, padding: "3px 8px", borderRadius: 8, fontWeight: 500 }}>{t}</span>
                  ))}
                </div>
                {/* 2-column content tile grid */}
                {(() => {
                  const sheets = STUDY_SHEETS[w] || [];
                  const sheetDone = sheets.filter(s => (completedItems?.studySheets || {})[s.id]).length;
                  const wkCases = WEEKLY_CASES[w] || [];
                  const caseDone = wkCases.filter(c => (completedItems?.cases || {})[c.id]).length;
                  const arts = articles[w] || [];
                  const artDone = arts.filter(a => (completedItems?.articles || {})[a.url]).length;
                  const trials = LANDMARK_TRIALS[w] || [];
                  const ws = (weeklyScores || {})[w] || [];
                  const best = ws.length > 0 ? Math.max(...ws.map(s => Math.round((s.correct / s.total) * 100))) : null;

                  const tileStyle = (accent: string) => ({
                    display: "flex" as const, alignItems: "center" as const,
                    padding: "9px 11px", background: T.bg, borderRadius: 10,
                    border: `1px solid ${T.line}`, borderLeft: `3px solid ${accent}`,
                    cursor: "pointer", textAlign: "left" as const, gap: 8,
                  });

                  return (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                        <button onClick={() => navigate("home", { type: "studySheets", week: w })} style={tileStyle(T.purple)}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>📋</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: T.navy, lineHeight: 1.2 }}>Study Sheets</div>
                            <div style={{ fontSize: 10, color: sheetDone === sheets.length && sheets.length > 0 ? T.greenDk : T.sub }}>
                              {sheetDone}/{sheets.length} done{sheetDone === sheets.length && sheets.length > 0 ? " ✓" : ""}
                            </div>
                          </div>
                        </button>

                        {wkCases.length > 0 ? (
                          <button onClick={() => navigate("home", { type: "cases", week: w })} style={tileStyle(T.green)}>
                            <span style={{ fontSize: 16, flexShrink: 0 }}>🏥</span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: T.navy, lineHeight: 1.2 }}>Clinical Cases</div>
                              <div style={{ fontSize: 10, color: caseDone === wkCases.length ? T.greenDk : T.sub }}>
                                {caseDone}/{wkCases.length} done{caseDone === wkCases.length ? " ✓" : ""}
                              </div>
                            </div>
                          </button>
                        ) : <div />}

                        <button onClick={() => navigate("home", { type: "articles", week: w })} style={tileStyle(T.sky)}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>📄</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: T.navy, lineHeight: 1.2 }}>Journal Articles</div>
                            <div style={{ fontSize: 10, color: artDone === arts.length && arts.length > 0 ? T.greenDk : T.sub }}>
                              {artDone}/{arts.length} read{artDone === arts.length && arts.length > 0 ? " ✓" : ""}
                            </div>
                          </div>
                        </button>

                        <button onClick={() => navigate("home", { type: "trials", week: w })} style={tileStyle(T.gold)}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>⭐</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: T.navy, lineHeight: 1.2 }}>Landmark Trials</div>
                            <div style={{ fontSize: 10, color: T.sub }}>{trials.length} trial{trials.length !== 1 ? "s" : ""}</div>
                          </div>
                        </button>
                      </div>

                      {/* Quiz — full width, bottom */}
                      <button onClick={() => navigate("home", { type: "weeklyQuiz", week: w })}
                        style={{ width: "100%", padding: "11px 14px", background: best !== null ? T.ice : T.med, color: best !== null ? T.navy : "white", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" as const }}>
                        <span>📝 Week {w} Quiz · {(WEEKLY_QUIZZES[w]||[]).length} questions</span>
                        {best !== null ? (
                          <span style={{ background: best >= 80 ? T.green : best >= 60 ? T.gold : T.accent, color: "white", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8 }}>
                            Best: {best}%
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>Take quiz →</span>
                        )}
                      </button>
                    </>
                  );
                })()}
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
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, marginBottom: 12 }}>
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

      {/* External Resources */}
      <h2 style={{ color: T.text, fontSize: 16, margin: "20px 0 12px", fontFamily: T.serif, fontWeight: 700 }}>External Resources</h2>
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
      {/* Disclaimer & Copyright Footer */}
      <div style={{ textAlign: "center", padding: "24px 16px 8px", marginTop: 12, borderTop: `1px solid ${T.line}` }}>
        <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.6, marginBottom: 8, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
          This app is for medical education purposes only and does not constitute medical advice. Clinical content may not reflect the most current evidence or guidelines. Always verify information independently and use clinical judgment when caring for patients.
        </div>
        <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.6 }}>
          &copy; {new Date().getFullYear()} Jonathan Cheng, MD MPH
        </div>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
          Premier Nephrology Medical Group {"\u00B7"} For educational use only
        </div>
      </div>
    </div>
  );
}
