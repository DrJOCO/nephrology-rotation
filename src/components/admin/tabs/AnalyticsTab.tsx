import React, { useState, useEffect } from "react";
import { T } from "../../../data/constants";
import store, { RotationInfo } from "../../../utils/store";
import { normalizeAdminStudentRecord, buildStudentProgressSummary } from "../../../utils/adminStudents";
import { HistogramChart, FunnelChart, HeatmapChart } from "../../student/charts";
import type { ArticlesData } from "../types";
import type { AdminStudent, SharedSettings, SrItem } from "../../../types";
import {
  buildCohortTeachingSignals,
  buildCohortCompetencyNeeds,
} from "../lib/cohort";
import {
  averageMetric,
  getBestWeeklyQuizPct,
  formatMetric,
  getScorePct,
} from "../lib/format";
import { MiniBarChart } from "../ui/MiniBarChart";

type HistoricalRotationAnalytics = {
  rotation: RotationInfo;
  students: AdminStudent[];
};

export function AnalyticsTab({ students, rotationCode, settings, articles }: { students: AdminStudent[]; rotationCode: string; settings: SharedSettings; articles: ArticlesData }) {
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historicalRotationMeta, setHistoricalRotationMeta] = useState<RotationInfo[]>([]);
  const [historicalStudentMap, setHistoricalStudentMap] = useState<Record<string, AdminStudent[]>>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setHistoryLoading(true);
      const rotations = await store.listRotations();
      const historical = await Promise.all(rotations.filter((rotation) => rotation.code !== rotationCode).map(async (rotation) => {
        const rawStudents = await store.getStudentsForRotation(rotation.code);
        const normalizedStudents = rawStudents.map((rawStudent) => normalizeAdminStudentRecord(
          rawStudent as Partial<AdminStudent> & { studentId: string; updatedAt?: string; joinedAt?: string },
          undefined,
          {
            fallbackId: typeof rawStudent.studentId === "string" ? rawStudent.studentId : rotation.code,
            fallbackName: typeof rawStudent.name === "string" ? rawStudent.name : "Unknown",
          },
        ));

        return [rotation.code, normalizedStudents] as const;
      }));

      if (!cancelled) {
        setHistoricalRotationMeta(rotations);
        setHistoricalStudentMap(Object.fromEntries(historical));
        setHistoryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rotationCode]);

  const fallbackCurrentRotation: RotationInfo = {
    code: rotationCode,
    name: rotationCode || "Current rotation",
    createdAt: null,
    location: "",
    dates: "",
    studentCount: students.length,
    ownerEmail: "",
    ownerUid: "",
  };
  const allRotationMeta = historicalRotationMeta.some((rotation) => rotation.code === rotationCode)
    ? historicalRotationMeta
    : [fallbackCurrentRotation, ...historicalRotationMeta];
  const historicalRotations: HistoricalRotationAnalytics[] = allRotationMeta.map((rotation) => ({
    rotation,
    students: rotation.code === rotationCode ? students : (historicalStudentMap[rotation.code] || []),
  }));

  const active = students.filter(s => s.status === "active" || s.status === "completed");
  const withPre = active.filter(s => s.preScore);
  const withPost = active.filter(s => s.postScore);
  const teachingSignals = buildCohortTeachingSignals(active);
  const domainNeeds = buildCohortCompetencyNeeds(active, settings, articles);
  const allHistoricalStudents = historicalRotations.flatMap((item) => item.students);
  const ms3Students = allHistoricalStudents.filter((student) => student.year === "MS3");
  const ms4Students = allHistoricalStudents.filter((student) => student.year === "MS4");
  const otherYearStudents = allHistoricalStudents.filter((student) => student.year !== "MS3" && student.year !== "MS4");
  const historicalProgress = allHistoricalStudents.map((student) => ({
    student,
    progress: buildStudentProgressSummary(student),
  }));
  const historicalAssessmentsComplete = allHistoricalStudents.filter((student) => student.preScore && student.postScore).length;
  const overallCoreCompletion = averageMetric(historicalProgress.map((item) => item.progress.coreCompletionPercent));
  const overallQuizBest = averageMetric(allHistoricalStudents.map(getBestWeeklyQuizPct));
  const overallQuizAttempts = averageMetric(historicalProgress.map((item) => item.progress.totalQuizAttempts));
  const overallOptionalRefs = averageMetric(historicalProgress.map((item) => item.progress.completedArticles));
  const overallReflections = averageMetric(allHistoricalStudents.map((student) => (student.reflections || []).length));
  const overallPatientsLogged = averageMetric(allHistoricalStudents.map((student) => (student.patients || []).length));

  const buildYearSummary = (label: string, cohort: AdminStudent[]) => {
    const progress = cohort.map((student) => buildStudentProgressSummary(student));
    return {
      label,
      count: cohort.length,
      avgPre: averageMetric(cohort.map((student) => getScorePct(student.preScore))),
      avgPost: averageMetric(cohort.map((student) => getScorePct(student.postScore))),
      avgGrowth: averageMetric(cohort.map((student) => {
        const pre = getScorePct(student.preScore);
        const post = getScorePct(student.postScore);
        return pre !== null && post !== null ? post - pre : null;
      })),
      avgBestWeekly: averageMetric(cohort.map(getBestWeeklyQuizPct)),
      avgCoreCompletion: averageMetric(progress.map((item) => item.coreCompletionPercent)),
      avgQuizAttempts: averageMetric(progress.map((item) => item.totalQuizAttempts)),
      avgOptionalRefs: averageMetric(progress.map((item) => item.completedArticles)),
      avgReflections: averageMetric(cohort.map((student) => (student.reflections || []).length)),
      avgPatients: averageMetric(cohort.map((student) => (student.patients || []).length)),
    };
  };

  const yearSummaries = [
    buildYearSummary("MS3", ms3Students),
    buildYearSummary("MS4", ms4Students),
  ];

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
      { value: preBins[i], color: T.warning },
      { value: postBins[i], color: T.success },
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
    { label: "Enrolled", value: active.length, total: active.length, color: T.brand },
    { label: "Pre-Test", value: withPre.length, total: active.length, color: T.info },
    { label: "1+ Module Quiz", value: withAnyWeekly.length, total: active.length, color: T.warning },
    { label: "All 4 Modules", value: withAllWeekly.length, total: active.length, color: T.warning },
    { label: "Post-Test", value: withPost.length, total: active.length, color: T.success },
    { label: "Improved", value: improved.length, total: active.length, color: T.success },
  ];

  // Topic Mastery Heatmap — students × weeks
  const heatRows = active.slice(0, 12).map(s => s.name?.split(" ")[0] || "Student");
  const heatCols = ["M1", "M2", "M3", "M4"];
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
    return { label: s.name?.split(" ")[0] || "?", value: totalQ, color: totalQ >= 6 ? T.success : totalQ >= 3 ? T.warning : T.danger };
  });

  // SR aggregate
  const srTotal = active.reduce((sum, s) => sum + Object.keys(s.srQueue || {}).length, 0);
  const srMastered = active.reduce((sum, s) => sum + Object.values(s.srQueue || {}).filter((i: SrItem) => i.interval > 21).length, 0);

  const cardStyle = { background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `1px solid ${T.line}` };
  const titleStyle = { fontSize: 14, fontWeight: 700, color: T.navy, fontFamily: T.serif, marginBottom: 4 };
  const subStyle = { fontSize: 13, color: T.sub, marginBottom: 14 };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 20, margin: "0 0 16px", fontFamily: T.serif, fontWeight: 700 }}>Analytics</h2>

      <div style={cardStyle}>
        <div style={titleStyle}>Historical Program View</div>
        <div style={subStyle}>All saved rotation codes rolled into one program-level view so you can compare blocks over time.</div>
        {historyLoading ? (
          <div style={{ color: T.muted, fontSize: 13, textAlign: "center", padding: 20 }}>Loading historical rotation data...</div>
        ) : historicalRotations.length === 0 ? (
          <div style={{ color: T.muted, fontSize: 13, textAlign: "center", padding: 20 }}>No rotations have been saved yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            {[
              { label: "Rotation blocks", value: historicalRotations.length, tone: T.navy, bg: T.ice },
              { label: "Learners tracked", value: allHistoricalStudents.length, tone: T.info, bg: T.infoBg },
              { label: "MS3", value: ms3Students.length, tone: T.warning, bg: T.warningBg },
              { label: "MS4", value: ms4Students.length, tone: T.success, bg: T.successBg },
              { label: "Both assessments", value: historicalAssessmentsComplete, tone: T.danger, bg: T.dangerBg },
              { label: "Avg core completion", value: formatMetric(overallCoreCompletion), tone: T.navy, bg: T.bg },
              { label: "Avg best weekly quiz", value: formatMetric(overallQuizBest), tone: T.navy, bg: T.bg },
              { label: "Avg quiz attempts", value: overallQuizAttempts === null ? "—" : `${overallQuizAttempts}`, tone: T.navy, bg: T.bg },
              { label: "Avg optional refs", value: overallOptionalRefs === null ? "—" : `${overallOptionalRefs}`, tone: T.navy, bg: T.bg },
              { label: "Avg reflections", value: overallReflections === null ? "—" : `${overallReflections}`, tone: T.navy, bg: T.bg },
              { label: "Avg consults logged", value: overallPatientsLogged === null ? "—" : `${overallPatientsLogged}`, tone: T.navy, bg: T.bg },
              { label: "Year not set", value: otherYearStudents.length, tone: T.muted, bg: T.grayBg },
            ].map((item) => (
              <div key={item.label} style={{ background: item.bg, borderRadius: 12, padding: 12, border: `1px solid ${T.line}` }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: item.tone, fontFamily: T.mono }}>{item.value}</div>
                <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <div style={titleStyle}>MS3 vs MS4</div>
        <div style={subStyle}>Comparison across all saved rotations for the fields you’ll probably care about later.</div>
        {historyLoading ? (
          <div style={{ color: T.muted, fontSize: 13, textAlign: "center", padding: 20 }}>Building year-level summaries...</div>
        ) : yearSummaries.every((summary) => summary.count === 0) ? (
          <div style={{ color: T.muted, fontSize: 13, textAlign: "center", padding: 20 }}>No MS3 or MS4 learners have been tagged yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {yearSummaries.map((summary) => (
              <div key={summary.label} style={{ background: T.bg, borderRadius: 12, padding: 14, border: `1px solid ${T.line}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.navy }}>{summary.label}</div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.brand, background: T.ice, padding: "4px 9px", borderRadius: 999 }}>
                    {summary.count} learner{summary.count !== 1 ? "s" : ""}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Avg pre-test", value: formatMetric(summary.avgPre) },
                    { label: "Avg post-test", value: formatMetric(summary.avgPost) },
                    { label: "Avg growth", value: formatMetric(summary.avgGrowth) },
                    { label: "Best module quiz", value: formatMetric(summary.avgBestWeekly) },
                    { label: "Core completion", value: formatMetric(summary.avgCoreCompletion) },
                    { label: "Quiz attempts", value: summary.avgQuizAttempts === null ? "—" : `${summary.avgQuizAttempts}` },
                    { label: "Optional refs", value: summary.avgOptionalRefs === null ? "—" : `${summary.avgOptionalRefs}` },
                    { label: "Reflections", value: summary.avgReflections === null ? "—" : `${summary.avgReflections}` },
                    { label: "Consults", value: summary.avgPatients === null ? "—" : `${summary.avgPatients}` },
                  ].map((metric) => (
                    <div key={metric.label} style={{ background: T.card, borderRadius: 10, padding: "10px 11px", border: `1px solid ${T.line}` }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>{metric.value}</div>
                      <div style={{ fontSize: 12, color: T.sub, marginTop: 3 }}>{metric.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <div style={titleStyle}>Rotation Blocks</div>
        <div style={subStyle}>One row per saved rotation code so you can compare blocks month over month.</div>
        {historyLoading ? (
          <div style={{ color: T.muted, fontSize: 13, textAlign: "center", padding: 20 }}>Loading rotation blocks...</div>
        ) : historicalRotations.length === 0 ? (
          <div style={{ color: T.muted, fontSize: 13, textAlign: "center", padding: 20 }}>No saved blocks yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
              <thead>
                <tr>
                  {["Block", "Dates / site", "Learners", "Year mix", "Avg pre", "Avg post", "Growth", "Best weekly", "Core completion"].map((label) => (
                    <th key={label} style={{ textAlign: "left", fontSize: 12, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "0 0 10px" }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historicalRotations.map((item) => {
                  const rotationStudents = item.students;
                  const progress = rotationStudents.map((student) => buildStudentProgressSummary(student));
                  const ms3Count = rotationStudents.filter((student) => student.year === "MS3").length;
                  const ms4Count = rotationStudents.filter((student) => student.year === "MS4").length;
                  const avgPre = averageMetric(rotationStudents.map((student) => getScorePct(student.preScore)));
                  const avgPost = averageMetric(rotationStudents.map((student) => getScorePct(student.postScore)));
                  const avgGrowth = averageMetric(rotationStudents.map((student) => {
                    const pre = getScorePct(student.preScore);
                    const post = getScorePct(student.postScore);
                    return pre !== null && post !== null ? post - pre : null;
                  }));
                  const avgBestWeekly = averageMetric(rotationStudents.map(getBestWeeklyQuizPct));
                  const avgCore = averageMetric(progress.map((entry) => entry.coreCompletionPercent));

                  return (
                    <tr key={item.rotation.code} style={{ borderTop: `1px solid ${T.line}` }}>
                      <td style={{ padding: "12px 0", fontSize: 13, fontFamily: T.mono, fontWeight: 700, color: rotationCode === item.rotation.code ? T.brand : T.navy }}>
                        {item.rotation.code}
                      </td>
                      <td style={{ padding: "12px 8px 12px 0", fontSize: 13, color: T.sub }}>
                        {[item.rotation.dates, item.rotation.location].filter(Boolean).join(" • ") || "—"}
                      </td>
                      <td style={{ padding: "12px 8px 12px 0", fontSize: 13, color: T.navy, fontWeight: 600 }}>
                        {rotationStudents.length}
                      </td>
                      <td style={{ padding: "12px 8px 12px 0", fontSize: 13, color: T.sub }}>
                        MS3 {ms3Count} • MS4 {ms4Count}
                      </td>
                      <td style={{ padding: "12px 8px 12px 0", fontSize: 13, color: T.sub }}>{formatMetric(avgPre)}</td>
                      <td style={{ padding: "12px 8px 12px 0", fontSize: 13, color: T.sub }}>{formatMetric(avgPost)}</td>
                      <td style={{ padding: "12px 8px 12px 0", fontSize: 13, color: T.sub }}>{formatMetric(avgGrowth)}</td>
                      <td style={{ padding: "12px 8px 12px 0", fontSize: 13, color: T.sub }}>{formatMetric(avgBestWeekly)}</td>
                      <td style={{ padding: "12px 8px 12px 0", fontSize: 13, color: T.sub }}>{formatMetric(avgCore)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ margin: "18px 0 12px" }}>
        <h3 style={{ color: T.navy, fontSize: 18, margin: 0, fontFamily: T.serif, fontWeight: 700 }}>Current Rotation Deep Dive</h3>
        <div style={{ color: T.sub, fontSize: 13, marginTop: 4 }}>
          {rotationCode ? `Detailed analytics for the currently connected block (${rotationCode}).` : "Connect to a rotation to see the live block-level analytics below."}
        </div>
      </div>

      {active.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📈</div>
          <div style={{ color: T.sub, fontSize: 14 }}>No student data is loaded for the current rotation yet.</div>
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
              <div style={{ color: T.muted, fontSize: 13, textAlign: "center", padding: 20 }}>No quiz scores yet</div>
            )}
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
              <span style={{ fontSize: 13, color: T.warning }}>● Pre-Test ({withPre.length})</span>
              <span style={{ fontSize: 13, color: T.success }}>● Post-Test ({withPost.length})</span>
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

          <div style={cardStyle}>
            <div style={titleStyle}>Assessment Focus Areas</div>
            <div style={subStyle}>
              {teachingSignals.detailedAssessments > 0
                ? `Detailed topic-band insight from ${teachingSignals.detailedAssessments} in-app assessments`
                : "Students need to complete assessments in-app for topic-band teaching guidance"}
            </div>
            {teachingSignals.focusAreas.length > 0 ? (
              <div style={{ display: "grid", gap: 10 }}>
                {teachingSignals.focusAreas.slice(0, 4).map((item) => (
                  <div key={item.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>{item.label}</span>
                      <span style={{ fontSize: 13, color: T.sub }}>{item.count} student{item.count !== 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ height: 8, background: T.grayBg, borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${(item.count / Math.max(teachingSignals.detailedAssessments, 1)) * 100}%`, height: "100%", background: T.danger, borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
                {teachingSignals.strongestAreas[0] && (
                  <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>
                    Cohort strength: {teachingSignals.strongestAreas[0].label}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: T.muted, fontSize: 13, textAlign: "center", padding: 20 }}>No detailed focus-area breakdown yet</div>
            )}
          </div>

          <div style={cardStyle}>
            <div style={titleStyle}>Competency Domains Needing Teaching</div>
            <div style={subStyle}>Counts reflect students who are not yet proficient in each domain</div>
            {domainNeeds.length > 0 ? (
              <div style={{ display: "grid", gap: 10 }}>
                {domainNeeds.slice(0, 4).map((item) => (
                  <div key={item.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>{item.label}</span>
                      <span style={{ fontSize: 13, color: T.sub }}>{item.count}/{active.length}</span>
                    </div>
                    <div style={{ height: 8, background: T.grayBg, borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${(item.count / Math.max(active.length, 1)) * 100}%`, height: "100%", background: T.warning, borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: T.muted, fontSize: 13, textAlign: "center", padding: 20 }}>No competency data yet</div>
            )}
          </div>

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
            <div style={subStyle}>Aggregate across all students in the current rotation</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div style={{ textAlign: "center", background: T.ice, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>{srTotal}</div>
                <div style={{ fontSize: 13, color: T.sub }}>Items in Queue</div>
              </div>
              <div style={{ textAlign: "center", background: T.successBg, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.success, fontFamily: T.mono }}>{srMastered}</div>
                <div style={{ fontSize: 13, color: T.sub }}>Mastered</div>
              </div>
              <div style={{ textAlign: "center", background: T.warningBg, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.warning, fontFamily: T.mono }}>{srTotal > 0 ? Math.round((srMastered / srTotal) * 100) : 0}%</div>
                <div style={{ fontSize: 13, color: T.sub }}>Mastery Rate</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
