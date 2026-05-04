import React from "react";
import { ArrowRight, Check, GraduationCap } from "lucide-react";
import { T, TOPICS } from "../../../data/constants";
import type { NavigateFn, ArticlesData } from "../types";
import type { AdminStudent, SharedSettings } from "../../../types";
import type { AdminConfirmOptions, AdminToastTone } from "../shared";
import { buildCohortTeachingSignals, buildCohortCompetencyNeeds } from "../lib/cohort";
import { buildAdminAssessmentSignal } from "../lib/student-analytics";
import { buildExposureCurriculumGap } from "../lib/exposure";
import { buildDuplicateNameGroups } from "../lib/duplicates";
import { Icon } from "../../student/Icon";
import { HeadlineMetric, Section } from "../../student/shared";

function TypeBlock({ eyebrow, leadWord, italicWord, helper }: { eyebrow: string; leadWord: string; italicWord: string; helper: string }) {
  return (
    <div>
      <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>
        {eyebrow}
      </div>
      <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, color: T.ink, lineHeight: 1.2, marginBottom: 6 }}>
        {leadWord}
        {italicWord && (
          <>
            {leadWord ? " " : ""}
            <span style={{ fontStyle: "italic", fontWeight: 600 }}>{italicWord}</span>
          </>
        )}
      </div>
      <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>{helper}</div>
    </div>
  );
}

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
  const duplicateNameGroups = buildDuplicateNameGroups(activeStudents);
  const attentionItems = [
    ...duplicateNameGroups.slice(0, 1).map((group) => ({
      key: `duplicate-${group[0].name}`,
      tag: "ROSTER",
      sentence: `${duplicateNameGroups.length} duplicate-name group${duplicateNameGroups.length === 1 ? "" : "s"} need review — first: ${group.map((s) => s.name).join(", ")}.`,
      action: () => navigate("students", { type: "reviewDuplicates" }),
    })),
    ...missingPre.slice(0, 2).map((student) => ({
      key: `pre-${student.studentId}`,
      tag: "PRE",
      sentence: `${student.name} has no pre-assessment recorded yet.`,
      action: () => navigate("students", { type: "studentDetail", id: String(student.id) }),
    })),
    ...teachingFollowUps.slice(0, 2).map(({ student, assessment }) => ({
      key: `teach-${student.studentId}`,
      tag: "TEACH",
      sentence: assessment?.summary
        ? `${student.name} — teach next: ${assessment.summary.recommendedArea.label}${assessment.summary.recommendedArea.missedTopics[0] ? ` (${assessment.summary.recommendedArea.missedTopics[0]})` : ""}.`
        : `${student.name} — targeted follow-up.`,
      action: () => navigate("students", { type: "studentDetail", id: String(student.id) }),
    })),
  ].slice(0, 8);

  const teachingFocus = teachingSignals.focusAreas[0];
  const competencyFocus = domainNeeds[0];

  return (
    <div style={{ padding: 16 }}>
      {activeStudents.length > 0 && (
        <Section eyebrow="Attention queue" title="What needs you first.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, padding: "16px 0", borderTop: `1.5px solid ${T.ink}`, borderBottom: `1px solid ${T.line}`, marginBottom: 14 }}>
            <HeadlineMetric value={missingPre.length} caption="Missing pre" tone={missingPre.length > 0 ? "danger" : "success"} variant="compact" />
            <HeadlineMetric value={missingPost.length} caption="Missing post" tone={missingPost.length > 0 ? "warning" : "success"} variant="compact" />
            <HeadlineMetric value={duplicateNameGroups.length} caption="Duplicate roster" tone={duplicateNameGroups.length > 0 ? "warning" : "success"} variant="compact" />
            <HeadlineMetric value={activeStudents.length} caption="Active" tone="info" variant="compact" />
          </div>

          {attentionItems.length > 0 ? (
            <div style={{ display: "grid", gap: 0 }}>
              {attentionItems.map((item, i) => (
                <button
                  key={item.key}
                  onClick={item.action}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr auto",
                    alignItems: "center",
                    gap: 16,
                    padding: "14px 4px",
                    borderTop: i === 0 ? "none" : `1px solid ${T.line}`,
                    background: "transparent",
                    border: "none",
                    borderBottom: "none",
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: T.sans,
                  }}
                >
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, letterSpacing: 1, textTransform: "uppercase" }}>{item.tag}</span>
                  <span style={{ fontSize: 14, color: T.ink, lineHeight: 1.5 }}>{item.sentence}</span>
                  <Icon as={ArrowRight} size={18} color={T.brand} />
                </button>
              ))}
            </div>
          ) : (
            <div style={{ padding: "14px 4px", fontSize: 13, color: T.sub, fontStyle: "italic" }}>
              No urgent admin issues right now. The cohort looks up to date.
            </div>
          )}
        </Section>
      )}

      {activeStudents.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32, padding: "20px 0", borderTop: `1px solid ${T.line}`, marginBottom: 18 }}>
          <TypeBlock
            eyebrow="Teaching signals"
            leadWord={teachingFocus ? "Teach next:" : "Assessment detail still"}
            italicWord={teachingFocus ? teachingFocus.label : "building"}
            helper={teachingSignals.detailedAssessments > 0
              ? `${teachingSignals.detailedAssessments}/${activeStudents.length} active students have topic-band assessment detail.`
              : "Detailed insight appears once students complete pre/post assessments in-app."}
          />
          <TypeBlock
            eyebrow="Competency needs"
            leadWord={competencyFocus ? "Reinforce" : "Waiting on student"}
            italicWord={competencyFocus ? competencyFocus.label : "activity"}
            helper={competencyFocus
              ? `${competencyFocus.label} surfaces most often as the domain where students are not yet proficient.`
              : "Domains where students are not yet proficient appear here once activity accrues."}
          />
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
          <Section eyebrow="Topic coverage" title="What the cohort has seen.">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, padding: "16px 0", borderTop: `1px solid ${T.line}` }}>
              <div>
                <div style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: T.success, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon as={Check} size={13} color={T.success} />
                  <span>Covered ({coveredTopics.length})</span>
                </div>
                {coveredTopics.length === 0 ? (
                  <div style={{ fontSize: 13, color: T.muted, fontStyle: "italic" }}>Nothing yet — students haven't logged study or patients.</div>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    {coveredTopics.map(t => (
                      <div key={t.label} style={{ fontSize: 13, lineHeight: 1.5 }}>
                        <span style={{ fontWeight: 700, color: T.ink }}>{t.label}</span>
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
                <div style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: T.danger, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  ○ Not yet covered ({uncoveredTopics.length})
                </div>
                {uncoveredTopics.length === 0 ? (
                  <div style={{ fontSize: 13, color: T.muted, fontStyle: "italic" }}>Everything is covered — nice.</div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {uncoveredTopics.map(topic => (
                      <span key={topic} style={{ fontSize: 12, fontFamily: T.mono, color: T.sub, letterSpacing: 0.4, padding: "2px 0" }}>
                        {topic.toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>
        );
      })()}

      {(() => {
        const allActivity = activeStudents.flatMap(s => (s.activityLog || []).map(a => ({ ...a, studentName: s.name })));
        allActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const recent = allActivity.slice(0, 15);
        if (recent.length === 0) return null;

        const formatTime = (ts: string) => {
          const d = new Date(ts);
          return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
        };
        return (
          <Section eyebrow="Recent activity" title="What students did.">
            <div style={{ borderTop: `1px solid ${T.line}` }}>
              {recent.map((a, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 1fr auto", alignItems: "baseline", gap: 16, padding: "10px 4px", borderBottom: i < recent.length - 1 ? `1px solid ${T.line}` : "none" }}>
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, letterSpacing: 0.6, textTransform: "uppercase" }}>
                    {a.type.toUpperCase().replace(/_/g, " ")}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 14, color: T.ink, fontWeight: 600 }}>{a.studentName}</span>
                    <span style={{ fontSize: 14, color: T.sub }}> — {a.label}{a.detail ? ` — ${a.detail}` : ""}</span>
                  </div>
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, whiteSpace: "nowrap" }}>{formatTime(a.timestamp)}</span>
                </div>
              ))}
            </div>
          </Section>
        );
      })()}

      {activeStudents.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: T.sub }}>
          <div style={{ marginBottom: 8 }}>
            <Icon as={GraduationCap} size={40} color={T.muted} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>No students yet</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Go to the Students tab to add your first student</div>
        </div>
      )}
    </div>
  );
}
