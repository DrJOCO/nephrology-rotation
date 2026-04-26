import React, { useEffect } from "react";
import { ACHIEVEMENTS } from "../../../utils/gamification";
import type { AdminStudent, SharedSettings, QuizScore } from "../../../types";
import type { ArticlesData } from "../types";
import {
  buildAdminCompetencySnapshot,
  buildAdminAssessmentSignal,
} from "../lib/student-analytics";
import { backBtn } from "../lib/styles";
import { PRINT_THEME, printableReportStyle } from "./print-theme";
import { getPrintBestScoreColor } from "./RotationSummaryReport";

const thStyle: React.CSSProperties = { padding: "8px 10px", textAlign: "left", fontSize: 13, fontWeight: 700, color: PRINT_THEME.sub, textTransform: "uppercase", letterSpacing: 0.3 };
const tdStyle = { padding: "8px 10px" };

export function PrintableReport({ mode, students, student, settings, articles, onBack }: { mode: string; students: AdminStudent[]; student?: AdminStudent; settings: SharedSettings & { hospitalName?: string }; articles: ArticlesData; onBack: () => void }) {
  const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const rotationName = settings?.attendingName || "Nephrology Rotation";
  const hospitalName = settings?.hospitalName || "";

  useEffect(() => {
    // Auto-trigger print dialog after a brief delay to allow render
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, []);

  const reportHeader = (
    <div style={{ borderBottom: `2px solid ${PRINT_THEME.ink}`, paddingBottom: 12, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: PRINT_THEME.ink, fontFamily: "'Crimson Pro', Georgia, serif" }}>
            {mode === "cohort" ? "Cohort Progress Report" : "Student Progress Report"}
          </div>
          <div style={{ fontSize: 13, color: PRINT_THEME.sub, marginTop: 2 }}>
            {rotationName}{hospitalName ? ` — ${hospitalName}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 13, color: PRINT_THEME.sub }}>
          <div>Generated {reportDate}</div>
          <div style={{ marginTop: 2, fontSize: 13, color: PRINT_THEME.muted }}>&copy; Jonathan Cheng, MD MPH</div>
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
        <div className="printable-report" style={printableReportStyle}>
          {reportHeader}

          {/* Summary Stats */}
          <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
            <div style={{ flex: 1, textAlign: "center", padding: 12, border: `1px solid ${PRINT_THEME.line}`, borderRadius: 8 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: PRINT_THEME.ink }}>{activeStudents.length}</div>
              <div style={{ fontSize: 13, color: PRINT_THEME.sub }}>Active Students</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", padding: 12, border: `1px solid ${PRINT_THEME.line}`, borderRadius: 8 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: PRINT_THEME.post }}>{students.reduce((sum, s) => sum + (s.patients || []).length, 0)}</div>
              <div style={{ fontSize: 13, color: PRINT_THEME.sub }}>Total Patients</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", padding: 12, border: `1px solid ${PRINT_THEME.line}`, borderRadius: 8 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: PRINT_THEME.pre }}>{avgPre !== null ? avgPre + "%" : "—"}</div>
              <div style={{ fontSize: 13, color: PRINT_THEME.sub }}>Avg Pre-Test</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", padding: 12, border: `1px solid ${PRINT_THEME.line}`, borderRadius: 8 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: PRINT_THEME.post }}>{avgPost !== null ? avgPost + "%" : "—"}</div>
              <div style={{ fontSize: 13, color: PRINT_THEME.sub }}>Avg Post-Test</div>
            </div>
            {avgPre !== null && avgPost !== null && (
              <div style={{ flex: 1, textAlign: "center", padding: 12, border: `1px solid ${PRINT_THEME.line}`, borderRadius: 8, background: PRINT_THEME.surface }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: PRINT_THEME.post }}>+{avgPost - avgPre}%</div>
                <div style={{ fontSize: 13, color: PRINT_THEME.sub }}>Avg Growth</div>
              </div>
            )}
          </div>

          {/* Student Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${PRINT_THEME.ink}` }}>
                <th style={thStyle}>Student</th>
                <th style={thStyle}>Year</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Patients</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Quizzes</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Pre-Test</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Post-Test</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Growth</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Mastery</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Teach Next</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const pre = pct(s.preScore);
                const post = pct(s.postScore);
                const growth = pre !== null && post !== null ? post - pre : null;
                const wkScores = s.weeklyScores || {};
                const quizCount = Object.values(wkScores).flat().length;
                const competency = buildAdminCompetencySnapshot(s, settings, articles);
                const assessment = buildAdminAssessmentSignal(s);
                return (
                  <tr key={s.id || i} style={{ borderBottom: `1px solid ${PRINT_THEME.line}`, background: i % 2 === 0 ? PRINT_THEME.paper : PRINT_THEME.surfaceAlt }}>
                    <td style={tdStyle}><strong>{s.name}</strong></td>
                    <td style={tdStyle}>{s.year || "—"}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{(s.patients || []).length}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{quizCount}</td>
                    <td style={{ ...tdStyle, textAlign: "center", color: PRINT_THEME.pre }}>{pre !== null ? pre + "%" : "—"}</td>
                    <td style={{ ...tdStyle, textAlign: "center", color: PRINT_THEME.post }}>{post !== null ? post + "%" : "—"}</td>
                    <td style={{ ...tdStyle, textAlign: "center", color: growth !== null && growth > 0 ? PRINT_THEME.post : PRINT_THEME.sub, fontWeight: 600 }}>
                      {growth !== null ? (growth > 0 ? "+" : "") + growth + "%" : "—"}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{competency.masteryPercent}% · {competency.topDomain.label}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{assessment?.summary?.recommendedArea.shortLabel || (assessment ? "Needs detail" : "—")}</td>
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
  const competency = buildAdminCompetencySnapshot(s, settings, articles);
  const assessment = buildAdminAssessmentSignal(s);
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
      <div className="printable-report" style={printableReportStyle}>
        {reportHeader}

        {/* Student Header */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: PRINT_THEME.ink, fontFamily: "'Crimson Pro', Georgia, serif" }}>{s.name}</div>
          <div style={{ fontSize: 13, color: PRINT_THEME.sub }}>{s.year || "MS3/MS4"} {s.email ? `• ${s.email}` : ""} • {competency.masteryPercent}% mastery • Top domain {competency.topDomain.label}</div>
        </div>

        {/* Scores Summary */}
        <div className="print-no-break" style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1, textAlign: "center", padding: 14, border: `1px solid ${PRINT_THEME.line}`, borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: PRINT_THEME.muted, textTransform: "uppercase" }}>Pre-Test</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: PRINT_THEME.pre, fontFamily: "'JetBrains Mono', monospace" }}>{pre !== null ? pre + "%" : "—"}</div>
            {s.preScore && <div style={{ fontSize: 13, color: PRINT_THEME.muted }}>{s.preScore.correct}/{s.preScore.total}</div>}
          </div>
          <div style={{ flex: 1, textAlign: "center", padding: 14, border: `1px solid ${PRINT_THEME.line}`, borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: PRINT_THEME.post, textTransform: "uppercase" }}>Post-Test</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: PRINT_THEME.post, fontFamily: "'JetBrains Mono', monospace" }}>{post !== null ? post + "%" : "—"}</div>
            {s.postScore && <div style={{ fontSize: 13, color: PRINT_THEME.muted }}>{s.postScore.correct}/{s.postScore.total}</div>}
          </div>
          {growth !== null && (
            <div style={{ flex: 1, textAlign: "center", padding: 14, border: `1px solid ${PRINT_THEME.line}`, borderRadius: 8, background: PRINT_THEME.surface }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: PRINT_THEME.post, textTransform: "uppercase" }}>Growth</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: PRINT_THEME.post, fontFamily: "'JetBrains Mono', monospace" }}>+{growth}%</div>
            </div>
          )}
        </div>

        <div className="print-no-break" style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1, padding: 14, border: `1px solid ${PRINT_THEME.line}`, borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: PRINT_THEME.sub, textTransform: "uppercase", marginBottom: 6 }}>Competency Overview</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: PRINT_THEME.ink, fontFamily: "'JetBrains Mono', monospace" }}>{competency.masteryPercent}%</div>
            <div style={{ fontSize: 13, color: PRINT_THEME.sub, marginTop: 6 }}>{competency.masteryDetail}</div>
            <div style={{ fontSize: 13, color: PRINT_THEME.sub, marginTop: 6 }}>
              {competency.profileLine} • {competency.developingCount} developing domain{competency.developingCount !== 1 ? "s" : ""}
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
                : assessment?.note || "Detailed topic-band insight appears after an in-app assessment run."}
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
          <div style={{ fontSize: 14, fontWeight: 700, color: PRINT_THEME.ink, marginBottom: 8, fontFamily: "'Crimson Pro', Georgia, serif" }}>Weekly Quiz Scores</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${PRINT_THEME.ink}` }}>
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
                  <tr key={w} style={{ borderBottom: `1px solid ${PRINT_THEME.line}` }}>
                    <td style={tdStyle}>Week {w}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{ws.length}</td>
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 600, color: getPrintBestScoreColor(best) }}>
                      {best !== null ? best + "%" : "—"}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{last !== null ? last + "%" : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: PRINT_THEME.ink, marginBottom: 8, fontFamily: "'Crimson Pro', Georgia, serif" }}>
            Consult Log ({patients.length} consult{patients.length !== 1 ? "s" : ""})
          </div>
          {patients.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${PRINT_THEME.ink}` }}>
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
                    <tr key={i} style={{ borderBottom: `1px solid ${PRINT_THEME.line}` }}>
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
            <div style={{ fontSize: 13, color: PRINT_THEME.muted, fontStyle: "italic" }}>No consults logged</div>
          )}
        </div>

        {/* Topic Distribution */}
        {Object.keys(topicCounts).length > 0 && (
          <div className="print-no-break" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: PRINT_THEME.ink, marginBottom: 8, fontFamily: "'Crimson Pro', Georgia, serif" }}>Topic Distribution</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).map(([topic, count]) => (
                <span key={topic} style={{ fontSize: 13, padding: "3px 10px", borderRadius: 12, border: `1px solid ${PRINT_THEME.line}`, color: PRINT_THEME.ink }}>
                  {topic} ({count})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <div className="print-no-break" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: PRINT_THEME.ink, marginBottom: 8, fontFamily: "'Crimson Pro', Georgia, serif" }}>Achievements Earned ({earnedBadges.length}/{ACHIEVEMENTS.length})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {earnedBadges.map(a => (
                <span key={a.id} style={{ fontSize: 13, padding: "4px 10px", borderRadius: 8, border: `1px solid ${PRINT_THEME.line}`, background: PRINT_THEME.surfaceAlt }}>
                  {a.icon} {a.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Attending Feedback */}
        {(s.feedbackTags || []).length > 0 && (
          <div className="print-no-break" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: PRINT_THEME.ink, marginBottom: 8, fontFamily: "'Crimson Pro', Georgia, serif" }}>Attending Feedback ({s.feedbackTags!.length})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {s.feedbackTags!.map((ft, i) => (
                <span key={i} style={{ fontSize: 13, padding: "4px 10px", borderRadius: 8, border: `1px solid ${PRINT_THEME.line}`, background: PRINT_THEME.surfaceAlt }}>
                  {ft.tag}{ft.note ? ` — ${ft.note}` : ""} <span style={{ color: PRINT_THEME.muted, fontSize: 13 }}>({new Date(ft.date).toLocaleDateString()})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
