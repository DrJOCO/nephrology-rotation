import React from "react";
import { T, TOPICS } from "../../../data/constants";
import type { NavigateFn, ArticlesData } from "../types";
import type { AdminStudent, SharedSettings } from "../../../types";
import type { AdminConfirmOptions, AdminToastTone } from "../shared";
import { buildCohortTeachingSignals, buildCohortCompetencyNeeds } from "../lib/cohort";
import { buildAdminAssessmentSignal } from "../lib/student-analytics";
import { buildExposureCurriculumGap } from "../lib/exposure";

export function DashboardTab({ students, navigate, settings, articles }: { students: AdminStudent[]; setStudents: React.Dispatch<React.SetStateAction<AdminStudent[]>>; navigate: NavigateFn; rotationCode: string; settings: SharedSettings; articles: ArticlesData; writeStudentToFirestore: (studentId: string, data: Record<string, unknown>) => void; requestConfirm: (options: AdminConfirmOptions) => Promise<boolean>; showToast: (message: string, tone?: AdminToastTone) => void }) {
  const activeStudents = students.filter(s => s.status === "active");
  const teachingSignals = buildCohortTeachingSignals(activeStudents);
  const domainNeeds = buildCohortCompetencyNeeds(activeStudents, settings, articles);
  const exposureGap = activeStudents.length > 0 ? buildExposureCurriculumGap(activeStudents, articles) : null;
  const missingPre = activeStudents.filter((student) => !student.preScore);
  const missingPost = activeStudents.filter((student) => !student.postScore);
  const teachingFollowUps = activeStudents
    .map((student) => ({ student, assessment: buildAdminAssessmentSignal(student) }))
    .filter((entry) => entry.assessment?.summary);
  const duplicateNameGroups = Array.from(
    activeStudents.reduce((map, student) => {
      const key = student.name.trim().toLowerCase();
      if (!key) return map;
      const current = map.get(key) || [];
      current.push(student);
      map.set(key, current);
      return map;
    }, new Map<string, AdminStudent[]>()),
  ).filter(([, group]) => group.length > 1);
  const attentionItems = [
    ...missingPre.slice(0, 2).map((student) => ({
      key: `pre-${student.studentId}`,
      title: student.name,
      detail: "No pre-assessment recorded yet",
      badge: "Assessment",
      tone: "info" as const,
      action: () => navigate("students", { type: "studentDetail", id: String(student.id) }),
      actionLabel: "Enter score",
    })),
    ...teachingFollowUps.slice(0, 2).map(({ student, assessment }) => ({
      key: `teach-${student.studentId}`,
      title: student.name,
      detail: `Teach next: ${assessment?.summary?.recommendedArea.label || "Targeted follow-up"}`,
      badge: "Teaching",
      tone: "success" as const,
      action: () => navigate("students", { type: "studentDetail", id: String(student.id) }),
      actionLabel: "Open plan",
    })),
  ].slice(0, 8);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 20, margin: "0 0 16px", fontFamily: T.serif, fontWeight: 700 }}>Dashboard</h2>

      {activeStudents.length > 0 && (
        <div style={{ background: T.card, borderRadius: 16, padding: 18, border: `1px solid ${T.line}`, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Needs Attention</div>
              <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, color: T.navy }}>What needs you first</div>
              <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.6, marginTop: 4 }}>Missing assessments and teaching follow-up signals for the cohort.</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ background: missingPre.length > 0 ? T.dangerBg : T.bg, color: missingPre.length > 0 ? T.danger : T.sub, borderRadius: 999, padding: "5px 10px", fontSize: 13, fontWeight: 700 }}>{missingPre.length} missing pre</span>
              <span style={{ background: missingPost.length > 0 ? T.infoBg : T.bg, color: missingPost.length > 0 ? T.navy : T.sub, borderRadius: 999, padding: "5px 10px", fontSize: 13, fontWeight: 700 }}>{missingPost.length} missing post</span>
              <span style={{ background: duplicateNameGroups.length > 0 ? T.warningBg : T.bg, color: duplicateNameGroups.length > 0 ? T.warning : T.sub, borderRadius: 999, padding: "5px 10px", fontSize: 13, fontWeight: 700 }}>{duplicateNameGroups.length} duplicate-name groups</span>
            </div>
          </div>

          {attentionItems.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {attentionItems.map((item) => {
                const tone = item.tone === "success"
                  ? { bg: T.successBg, text: T.success, border: T.success }
                  : { bg: T.infoBg, text: T.info, border: T.info };
                return (
                  <div key={item.key} style={{ background: T.bg, border: `1px solid ${T.line}`, borderRadius: 12, padding: 12, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{item.title}</div>
                        <span style={{ background: tone.bg, color: tone.text, border: `1px solid ${tone.border}`, borderRadius: 999, padding: "3px 8px", fontSize: 13, fontWeight: 700 }}>{item.badge}</span>
                      </div>
                      <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>{item.detail}</div>
                    </div>
                    <button onClick={item.action} style={{ padding: "8px 12px", background: T.card, color: T.navy, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      {item.actionLabel}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ background: T.successBg, color: T.success, border: `1px solid ${T.success}`, borderRadius: 12, padding: "12px 14px", fontSize: 13, fontWeight: 700 }}>
              No urgent admin issues right now. The cohort looks up to date.
            </div>
          )}
        </div>
      )}

      {activeStudents.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 18 }}>
          <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Teaching Signals</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.navy, fontFamily: T.serif, marginBottom: 6 }}>
              {teachingSignals.focusAreas[0] ? `Teach next: ${teachingSignals.focusAreas[0].label}` : "Assessment detail still building"}
            </div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginBottom: 10 }}>
              {teachingSignals.detailedAssessments > 0
                ? `${teachingSignals.detailedAssessments}/${activeStudents.length} active students have topic-band assessment detail.`
                : "Detailed insight appears once students complete pre/post assessments in-app."}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {teachingSignals.focusAreas.slice(0, 3).map((item) => (
                <span key={item.label} style={{ background: T.dangerBg, color: T.danger, borderRadius: 999, padding: "5px 10px", fontSize: 13, fontWeight: 700 }}>
                  {item.label} ({item.count})
                </span>
              ))}
              {teachingSignals.focusAreas.length === 0 && (
                <span style={{ background: T.bg, color: T.muted, borderRadius: 999, padding: "5px 10px", fontSize: 13, fontWeight: 600 }}>
                  No topic bands yet
                </span>
              )}
            </div>
          </div>

          <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Competency Needs</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.navy, fontFamily: T.serif, marginBottom: 6 }}>
              {domainNeeds[0] ? `${domainNeeds[0].label} needs the most reinforcement` : "Waiting on student activity"}
            </div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginBottom: 10 }}>
              Domains where students are not yet proficient — read this as a teaching backlog.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {domainNeeds.slice(0, 3).map((item) => (
                <span key={item.label} style={{ background: T.warningBg, color: T.warning, borderRadius: 999, padding: "5px 10px", fontSize: 13, fontWeight: 700 }}>
                  {item.label} ({item.count})
                </span>
              ))}
              {domainNeeds.length === 0 && (
                <span style={{ background: T.bg, color: T.muted, borderRadius: 999, padding: "5px 10px", fontSize: 13, fontWeight: 600 }}>
                  No competency signal yet
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {exposureGap && activeStudents.length > 0 && (() => {
        const coveredTopics = [
          ...exposureGap.seeingButNotStudying,
          ...exposureGap.studyingButNotSeeing,
          ...exposureGap.aligned,
        ].sort((a, b) => a.label.localeCompare(b.label));
        const coveredLower = new Set(coveredTopics.map(t => t.label.toLowerCase()));
        const uncoveredTopics = TOPICS.filter(t => !coveredLower.has(t.toLowerCase()));

        return (
          <div style={{ background: T.card, borderRadius: 14, padding: 14, border: `1px solid ${T.line}`, marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5 }}>Topic Coverage</div>
              <div style={{ fontSize: 12, color: T.muted }}>Study = curriculum · Service = patient cases</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.success, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  ✓ Covered ({coveredTopics.length})
                </div>
                {coveredTopics.length === 0 ? (
                  <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>Nothing yet — students haven't logged study or patients.</div>
                ) : (
                  <div style={{ display: "grid", gap: 4 }}>
                    {coveredTopics.map(t => (
                      <div key={t.label} style={{ fontSize: 12, lineHeight: 1.4 }}>
                        <span style={{ fontWeight: 700, color: T.navy }}>{t.label}</span>
                        {t.studyLearners.length > 0 && (
                          <span style={{ color: T.sub }}> · <span style={{ color: T.warning, fontWeight: 600 }}>studied:</span> {t.studyLearners.join(", ")}</span>
                        )}
                        {t.serviceLearners.length > 0 && (
                          <span style={{ color: T.sub }}> · <span style={{ color: T.danger, fontWeight: 600 }}>service:</span> {t.serviceLearners.join(", ")}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.danger, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  ○ Not yet covered ({uncoveredTopics.length})
                </div>
                {uncoveredTopics.length === 0 ? (
                  <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>Everything is covered — nice.</div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {uncoveredTopics.map(topic => (
                      <span key={topic} style={{ fontSize: 11, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 999, padding: "2px 8px", color: T.sub, fontWeight: 600 }}>{topic}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {(() => {
        const allActivity = students.flatMap(s => (s.activityLog || []).map(a => ({ ...a, studentName: s.name })));
        allActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const recent = allActivity.slice(0, 15);
        if (recent.length === 0) return null;

        const typeIcons: Record<string, string> = {
          quiz: "📝",
          quiz_start: "✍️",
          review_missed: "🧠",
          assessment: "📋",
          case: "🏥",
          practice_quiz: "🎯",
          sr_review: "🔄",
          article: "📄",
          study_sheet: "🗂️",
          bookmark: "⭐",
          guide_open: "📚",
          resource_open: "🧭",
          patient: "🩺",
          follow_up: "📌",
        };
        const formatTime = (ts: string) => {
          const d = new Date(ts);
          return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
        };
        return (
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Recent Activity</h3>
            <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.line}`, overflow: "hidden" }}>
              {recent.map((a, i) => (
                <div key={i} style={{ padding: "10px 14px", borderBottom: i < recent.length - 1 ? `1px solid ${T.line}` : "none", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{typeIcons[a.type] || "📌"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{a.studentName}</div>
                    <div style={{ fontSize: 13, color: T.sub }}>{a.label}{a.detail ? ` — ${a.detail}` : ""}</div>
                  </div>
                  <div style={{ fontSize: 13, color: T.muted, flexShrink: 0, whiteSpace: "nowrap" }}>{formatTime(a.timestamp)}</div>
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
