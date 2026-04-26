import React, { useEffect } from "react";
import { STUDY_SHEETS, CURRICULUM_DECKS } from "../../../data/constants";
import { WEEKLY_CASES } from "../../../data/cases";
import { ACHIEVEMENTS } from "../../../utils/gamification";
import type { AdminStudent, SharedSettings, QuizScore } from "../../../types";
import type { ArticlesData } from "../types";
import {
  buildAdminCompetencySnapshot,
  buildAdminAssessmentSignal,
} from "../lib/student-analytics";
import { backBtn } from "../lib/styles";
import { PRINT_THEME, printableReportStyle } from "./print-theme";

export function getPrintBestScoreColor(value: number | null) {
  if (value === null) return PRINT_THEME.muted;
  if (value >= 80) return PRINT_THEME.post;
  if (value >= 60) return PRINT_THEME.pre;
  return PRINT_THEME.danger;
}

export function RotationSummaryReport({ student: s, settings, articles, onBack }: { student?: AdminStudent; settings: SharedSettings & { hospitalName?: string }; articles: ArticlesData; onBack: () => void }) {
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
  const competency = buildAdminCompetencySnapshot(s, settings, articles);
  const assessment = buildAdminAssessmentSignal(s);
  const earned = s.gamification?.achievements || [];
  const earnedBadges = ACHIEVEMENTS.filter(a => earned.includes(a.id));
  const completed = s.completedItems || { articles: {}, studySheets: {}, cases: {}, decks: {} };

  // Topic distribution
  const topicCounts: Record<string, number> = {};
  patients.forEach(p => {
    const ts = p.topics || (p.topic ? [p.topic] : []);
    ts.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
  });

  // Completed items per week
  const weeklyCompletion = [1, 2, 3, 4].map(w => {
    const refs = (articles[w] || []).length;
    const refsDone = (articles[w] || []).filter(a => completed.articles[a.url]).length;
    const sheets = (STUDY_SHEETS[w] || []).length;
    const sheetsDone = (STUDY_SHEETS[w] || []).filter(sh => completed.studySheets[sh.id]).length;
    const decks = CURRICULUM_DECKS.filter(deck => deck.week === w).length;
    const decksDone = CURRICULUM_DECKS.filter(deck => deck.week === w && completed.decks?.[deck.id]).length;
    const cases = (WEEKLY_CASES[w] || []).length;
    const casesDone = (WEEKLY_CASES[w] || []).filter(item => completed.cases[item.id]).length;
    const quizTaken = (wkScores[w] || []).length > 0;
    return {
      week: w,
      references: { done: refsDone, total: refs },
      sheets: { done: sheetsDone, total: sheets },
      decks: { done: decksDone, total: decks },
      cases: { done: casesDone, total: cases },
      quizTaken,
    };
  });

  // SR stats
  const srQueue = s.srQueue || {};
  const srTotal = Object.keys(srQueue).length;
  const srMastered = Object.values(srQueue).filter(i => i.interval > 21).length;

  const hdr: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: PRINT_THEME.ink, marginBottom: 8, fontFamily: "'Crimson Pro', Georgia, serif" };
  const tblTh: React.CSSProperties = { padding: "8px 10px", textAlign: "left", fontSize: 13, fontWeight: 700, color: PRINT_THEME.sub, textTransform: "uppercase", letterSpacing: 0.3 };
  const tblTd: React.CSSProperties = { padding: "8px 10px" };

  return (
    <div>
      <button onClick={onBack} style={{ ...backBtn, marginBottom: 12 }}>← Back to Student</button>
      <div className="printable-report" style={printableReportStyle}>
        {/* Header */}
        <div style={{ borderBottom: `2px solid ${PRINT_THEME.ink}`, paddingBottom: 12, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: PRINT_THEME.ink, fontFamily: "'Crimson Pro', Georgia, serif" }}>Rotation Summary Report</div>
              <div style={{ fontSize: 13, color: PRINT_THEME.sub, marginTop: 2 }}>{rotationName}{settings?.dates ? ` — ${settings.dates}` : ""}</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 13, color: PRINT_THEME.sub }}>
              <div>Generated {reportDate}</div>
              <div style={{ marginTop: 2, fontSize: 13, color: PRINT_THEME.muted }}>&copy; Jonathan Cheng, MD MPH</div>
            </div>
          </div>
        </div>

        {/* Student Info */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: PRINT_THEME.ink, fontFamily: "'Crimson Pro', Georgia, serif" }}>{s.name}</div>
          <div style={{ fontSize: 13, color: PRINT_THEME.sub }}>
            {s.year || "MS3/MS4"} {s.email ? `• ${s.email}` : ""} • {competency.masteryPercent}% mastery • Top domain {competency.topDomain.label}
          </div>
        </div>

        {/* Score Summary */}
        <div className="print-no-break" style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1, textAlign: "center", padding: 14, border: `1px solid ${PRINT_THEME.line}`, borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: PRINT_THEME.muted, textTransform: "uppercase" }}>Pre-Test</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: PRINT_THEME.pre, fontFamily: "'JetBrains Mono', monospace" }}>{pre !== null ? pre + "%" : "—"}</div>
          </div>
          <div style={{ flex: 1, textAlign: "center", padding: 14, border: `1px solid ${PRINT_THEME.line}`, borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: PRINT_THEME.post, textTransform: "uppercase" }}>Post-Test</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: PRINT_THEME.post, fontFamily: "'JetBrains Mono', monospace" }}>{post !== null ? post + "%" : "—"}</div>
          </div>
          {growth !== null && (
            <div style={{ flex: 1, textAlign: "center", padding: 14, border: `1px solid ${PRINT_THEME.line}`, borderRadius: 8, background: PRINT_THEME.surface }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: PRINT_THEME.post, textTransform: "uppercase" }}>Growth</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: PRINT_THEME.post, fontFamily: "'JetBrains Mono', monospace" }}>+{growth}%</div>
            </div>
          )}
        </div>

        <div className="print-no-break" style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1, padding: 14, border: `1px solid ${PRINT_THEME.line}`, borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: PRINT_THEME.sub, textTransform: "uppercase", marginBottom: 6 }}>Competency Overview</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: PRINT_THEME.ink, fontFamily: "'JetBrains Mono', monospace" }}>{competency.masteryPercent}%</div>
            <div style={{ fontSize: 13, color: PRINT_THEME.sub, marginTop: 6 }}>{competency.masteryDetail}</div>
            <div style={{ fontSize: 13, color: PRINT_THEME.sub, marginTop: 6 }}>
              {competency.developingCount} developing domain{competency.developingCount !== 1 ? "s" : ""} • {competency.profileLine}
            </div>
          </div>
          <div style={{ flex: 1, padding: 14, border: `1px solid ${PRINT_THEME.line}`, borderRadius: 8, background: assessment?.summary ? PRINT_THEME.alertBg : PRINT_THEME.surfaceAlt }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: PRINT_THEME.sub, textTransform: "uppercase", marginBottom: 6 }}>Teaching Signal</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: PRINT_THEME.ink }}>
              {assessment?.summary ? `Teach next: ${assessment.summary.recommendedArea.label}` : assessment ? `Assessment logged: ${assessment.overallPct}%` : "Awaiting assessment"}
            </div>
            <div style={{ fontSize: 13, color: PRINT_THEME.sub, marginTop: 6 }}>
              {assessment?.summary
                ? assessment.summary.detailLine
                : assessment?.note || "Once a pre/post assessment is completed in-app, this section highlights weak and strong topic bands."}
            </div>
            {assessment?.summary?.strongestAreas[0] && (
              <div style={{ fontSize: 13, color: PRINT_THEME.sub, marginTop: 6 }}>
                Strongest area: {assessment.summary.strongestAreas[0].label}
              </div>
            )}
          </div>
        </div>

        {/* Weekly Quiz Breakdown */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={hdr}>Module Quiz Scores</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ borderBottom: `2px solid ${PRINT_THEME.ink}` }}>
              <th style={tblTh}>Module</th>
              <th style={{ ...tblTh, textAlign: "center" }}>Attempts</th>
              <th style={{ ...tblTh, textAlign: "center" }}>Best Score</th>
              <th style={{ ...tblTh, textAlign: "center" }}>Last Score</th>
            </tr></thead>
            <tbody>{[1, 2, 3, 4].map(w => {
              const ws = wkScores[w] || [];
              const best = ws.length > 0 ? Math.max(...ws.map(x => Math.round((x.correct / x.total) * 100))) : null;
              const last = ws.length > 0 ? Math.round((ws[ws.length - 1].correct / ws[ws.length - 1].total) * 100) : null;
              return (
                <tr key={w} style={{ borderBottom: `1px solid ${PRINT_THEME.line}` }}>
                  <td style={tblTd}>Module {w}</td>
                  <td style={{ ...tblTd, textAlign: "center" }}>{ws.length}</td>
                  <td style={{ ...tblTd, textAlign: "center", fontWeight: 600, color: getPrintBestScoreColor(best) }}>{best !== null ? best + "%" : "—"}</td>
                  <td style={{ ...tblTd, textAlign: "center" }}>{last !== null ? last + "%" : "—"}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>

        {/* Weekly Completion */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={hdr}>Module Completion</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ borderBottom: `2px solid ${PRINT_THEME.ink}` }}>
              <th style={tblTh}>Module</th>
              <th style={{ ...tblTh, textAlign: "center" }}>Study Sheets</th>
              <th style={{ ...tblTh, textAlign: "center" }}>Decks</th>
              <th style={{ ...tblTh, textAlign: "center" }}>Cases</th>
              <th style={{ ...tblTh, textAlign: "center" }}>Quiz Taken</th>
              <th style={{ ...tblTh, textAlign: "center" }}>Optional Refs</th>
            </tr></thead>
            <tbody>{weeklyCompletion.map(wc => (
              <tr key={wc.week} style={{ borderBottom: `1px solid ${PRINT_THEME.line}` }}>
                <td style={tblTd}>Module {wc.week}</td>
                <td style={{ ...tblTd, textAlign: "center" }}>{wc.sheets.done}/{wc.sheets.total}</td>
                <td style={{ ...tblTd, textAlign: "center" }}>{wc.decks.done}/{wc.decks.total}</td>
                <td style={{ ...tblTd, textAlign: "center" }}>{wc.cases.done}/{wc.cases.total}</td>
                <td style={{ ...tblTd, textAlign: "center" }}>{wc.quizTaken ? "Yes" : "—"}</td>
                <td style={{ ...tblTd, textAlign: "center" }}>{wc.references.done}/{wc.references.total}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={hdr}>Consult Log ({patients.length} consult{patients.length !== 1 ? "s" : ""})</div>
          {patients.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ borderBottom: `2px solid ${PRINT_THEME.ink}` }}>
                <th style={tblTh}>Patient</th><th style={tblTh}>Diagnosis</th><th style={tblTh}>Topics</th><th style={tblTh}>Date</th><th style={tblTh}>Status</th>
              </tr></thead>
              <tbody>{patients.map((p, i) => {
                const ts = p.topics || (p.topic ? [p.topic] : []);
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${PRINT_THEME.line}` }}>
                    <td style={tblTd}>{p.initials}</td>
                    <td style={tblTd}>{p.dx || "—"}</td>
                    <td style={tblTd}>{ts.join(", ")}</td>
                    <td style={tblTd}>{new Date(p.date).toLocaleDateString()}</td>
                    <td style={tblTd}>{p.status}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          ) : <div style={{ fontSize: 13, color: PRINT_THEME.muted, fontStyle: "italic" }}>No consults logged</div>}
        </div>

        {/* Topic Distribution */}
        {Object.keys(topicCounts).length > 0 && (
          <div className="print-no-break" style={{ marginBottom: 20 }}>
            <div style={hdr}>Topic Distribution</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).map(([topic, count]) => (
                <span key={topic} style={{ fontSize: 13, padding: "3px 10px", borderRadius: 12, border: `1px solid ${PRINT_THEME.line}`, color: PRINT_THEME.ink }}>{topic} ({count})</span>
              ))}
            </div>
          </div>
        )}

        {/* SR Progress */}
        {srTotal > 0 && (
          <div className="print-no-break" style={{ marginBottom: 20 }}>
            <div style={hdr}>Spaced Repetition Progress</div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ textAlign: "center", padding: 10, border: `1px solid ${PRINT_THEME.line}`, borderRadius: 8, flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: PRINT_THEME.ink }}>{srTotal}</div>
                <div style={{ fontSize: 13, color: PRINT_THEME.sub }}>Total in Queue</div>
              </div>
              <div style={{ textAlign: "center", padding: 10, border: `1px solid ${PRINT_THEME.line}`, borderRadius: 8, flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: PRINT_THEME.post }}>{srMastered}</div>
                <div style={{ fontSize: 13, color: PRINT_THEME.sub }}>Mastered (&gt;21d)</div>
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
                <span key={a.id} style={{ fontSize: 13, padding: "4px 10px", borderRadius: 8, border: `1px solid ${PRINT_THEME.line}`, background: PRINT_THEME.surfaceAlt }}>{a.icon} {a.title}</span>
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
                <span key={i} style={{ fontSize: 13, padding: "4px 10px", borderRadius: 8, border: `1px solid ${PRINT_THEME.line}`, background: PRINT_THEME.surfaceAlt }}>
                  {ft.tag}{ft.note ? ` — ${ft.note}` : ""} <span style={{ color: PRINT_THEME.muted, fontSize: 13 }}>({new Date(ft.date).toLocaleDateString()})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Milestones */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={hdr}>Milestones</div>
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
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
