import { useState } from "react";
import { ArrowRight, BadgeCheck, ChevronRight, Trophy } from "lucide-react";
import { T } from "../../data/constants";
import { useIsMobile } from "../../utils/helpers";
import { ACHIEVEMENTS, getLevel } from "../../utils/gamification";
import type { Gamification, Patient, QuizScore, SubView, WeeklyScores } from "../../types";
import type { CompetencyDomainSummary, CompetencySummary } from "../../utils/competency";
import { Button, InfoBar, LabRow, Section } from "./shared";

const tierStyles: Record<CompetencyDomainSummary["tier"], { bg: string; border: string; text: string }> = {
  Novice: { bg: T.grayBg, border: T.line, text: T.muted },
  Developing: { bg: T.warningBg, border: T.warning, text: T.warning },
  Proficient: { bg: T.successBg, border: T.success, text: T.success },
};

export default function ProgressTab({
  navigate,
  patients,
  weeklyScores,
  preScore,
  postScore,
  gamification,
  currentWeek,
  competencySummary,
}: {
  navigate: (tab: string, sv?: SubView) => void;
  patients: Patient[];
  weeklyScores: WeeklyScores;
  preScore: QuizScore | null;
  postScore: QuizScore | null;
  gamification: Gamification;
  currentWeek: number | null;
  competencySummary: CompetencySummary;
}) {
  const isMobile = useIsMobile();
  const [expandedDomain, setExpandedDomain] = useState<CompetencyDomainSummary["domain"] | null>(competencySummary.topDomain.domain);
  const level = getLevel(gamification?.points || 0);
  const nextLevelProgress = level.nextAt ? Math.min(100, ((gamification.points || 0) / level.nextAt) * 100) : 100;
  const recentAchievements = (gamification?.achievements || [])
    .slice(-4)
    .map((id) => ACHIEVEMENTS.find((achievement) => achievement.id === id))
    .filter((achievement): achievement is typeof ACHIEVEMENTS[number] => Boolean(achievement));

  return (
    <div style={{ padding: 16 }}>
      <Section eyebrow={competencySummary.masteryLabel} title={competencySummary.masteryDetail} style={{ marginTop: 0, marginBottom: 18 }}>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: T.sub, lineHeight: 1.6, maxWidth: 520 }}>
          {currentWeek
            ? `Module ${currentWeek} is measured against core study sheets, cases, and a scored quiz signal. Optional references stay available for deeper reading.`
            : "Core objectives roll up across your active rotation work."}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginTop: 16 }}>
          {competencySummary.objectives.map((objective) => (
            <div
              key={objective.label}
              style={{
                background: objective.met ? T.successBg : T.bg,
                borderRadius: 14,
                border: `1px solid ${objective.met ? T.success : T.line}`,
                padding: "12px 12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <BadgeCheck size={15} strokeWidth={2} color={objective.met ? T.success : T.muted} aria-hidden="true" />
                <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{objective.label}</div>
              </div>
              <div style={{ fontSize: 13, color: T.sub }}>{objective.detail}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Competency map" title="Competency map" style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginBottom: 12 }}>
          Competency is based on spaced repetition, quiz performance, and case completion. Optional reference use is shown separately.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {competencySummary.domains.map((domain) => {
            const tierStyle = tierStyles[domain.tier];
            const expanded = expandedDomain === domain.domain;
            return (
              <div key={domain.domain} style={{ background: T.card, borderRadius: 8, border: `1px solid ${expanded ? T.brand : T.line}`, overflow: "hidden" }}>
                <button
                  onClick={() => setExpandedDomain(expanded ? null : domain.domain)}
                  style={{ width: "100%", background: "none", border: "none", padding: "14px 14px", cursor: "pointer", textAlign: "left" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{domain.label}</div>
                        <span style={{ background: tierStyle.bg, color: tierStyle.text, border: `1px solid ${tierStyle.border}`, borderRadius: 999, padding: "4px 9px", fontSize: 13, fontWeight: 700 }}>
                          {domain.tier}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginBottom: 10 }}>{domain.description}</div>
                      <div style={{ background: T.grayBg, borderRadius: 999, height: 8, overflow: "hidden" }}>
                        <div style={{ width: `${domain.progress}%`, background: domain.tier === "Proficient" ? T.success : domain.tier === "Developing" ? T.warning : T.brand, height: "100%", borderRadius: 999 }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 6, fontSize: 13, color: T.muted, flexWrap: "wrap" }}>
                        <span>{domain.progress}% to next milestone</span>
                        <span>{domain.progressLabel}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} strokeWidth={2} aria-hidden="true" style={{ color: T.muted, flexShrink: 0, transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
                  </div>
                </button>

                {expanded && (
                  <div style={{ borderTop: `1px solid ${T.line}`, padding: "14px 14px 16px" }}>
                    <div style={{ marginBottom: 12 }}>
                      <LabRow
                        label="SR interval"
                        value={domain.signals.srIntervalDays}
                        unit="d"
                        reference={domain.signals.dueCards > 0
                          ? `${domain.signals.dueCards} card${domain.signals.dueCards !== 1 ? "s" : ""} due now`
                          : `${domain.signals.totalCards} card${domain.signals.totalCards !== 1 ? "s" : ""} tracked`}
                      />
                      <LabRow
                        label="Quiz signal"
                        value={domain.signals.quizAccuracy === null ? "—" : domain.signals.quizAccuracy}
                        unit={domain.signals.quizAccuracy === null ? undefined : "%"}
                        reference={domain.signals.quizSampleSize > 0
                          ? `Last ${domain.signals.quizSampleSize} question${domain.signals.quizSampleSize !== 1 ? "s" : ""}`
                          : "No quiz signal yet"}
                      />
                      <LabRow
                        label="Cases logged"
                        value={`${domain.signals.casesLogged}/${domain.signals.caseTarget || 0}`}
                        reference={domain.signals.caseTarget > 0 ? "Proficient target" : "No case requirement"}
                      />
                      <LabRow
                        label="Consults logged"
                        value={domain.signals.consultsLogged}
                        reference={domain.signals.consultsLogged > 0 ? "From your patient list" : "No consults yet"}
                      />
                      <LabRow
                        label="Optional references"
                        value={`${domain.signals.referencesReviewed}/${domain.signals.referenceCount || 0}`}
                        reference={domain.signals.referenceCount > 0 ? "Reviewed for extra depth" : "No linked references"}
                      />
                    </div>

                    <InfoBar
                      label="Recommended next action"
                      title={domain.action.label}
                      tone="brand"
                      action={(
                        <Button
                          size="sm"
                          onClick={() => navigate(domain.action.tab, domain.action.subView)}
                        >
                          Open
                          <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
                        </Button>
                      )}
                    >
                      {domain.action.detail}
                    </InfoBar>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section eyebrow="Momentum" title="Momentum" style={{ marginBottom: 18 }}>
        <div style={{ marginBottom: 14 }}>
          <LabRow label="Points" value={gamification.points} />
          <LabRow label="Current level" value={level.name} />
          <LabRow label="Next target" value={level.next ? level.next : "Maxed"} reference={level.nextAt ? `${Math.max(0, level.nextAt - gamification.points)} points to go` : "Top tier reached"} />
          {gamification.achievements.length > 0 && (
            <LabRow label="Achievements" value={gamification.achievements.length} />
          )}
        </div>

        {level.nextAt && (
          <div style={{ marginBottom: recentAchievements.length > 0 ? 14 : 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6, fontSize: 13, color: T.sub, flexWrap: "wrap" }}>
              <span>Progress to {level.next}</span>
              <span>{gamification.points}/{level.nextAt} points</span>
            </div>
            <div style={{ background: T.grayBg, borderRadius: 999, height: 9, overflow: "hidden" }}>
              <div style={{ width: `${nextLevelProgress}%`, background: T.warning, height: "100%", borderRadius: 999 }} />
            </div>
          </div>
        )}

        {recentAchievements.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, marginBottom: 8 }}>
              Recent achievements
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {recentAchievements.map((achievement) => (
                <span key={achievement.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.warningBg, color: T.warning, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 700 }}>
                  <Trophy size={14} strokeWidth={2} aria-hidden="true" />
                  {achievement.icon} {achievement.title}
                </span>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section eyebrow="Consistency" title="Consistency" style={{ marginBottom: 0 }}>
        <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginBottom: 12 }}>Assessment growth and day-to-day rhythm still matter right alongside the points chase.</div>

        {preScore && postScore ? (
          <div style={{ borderTop: `1px dotted ${T.line}`, paddingTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, marginBottom: 6 }}>Assessment growth</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 14, color: T.sub }}>Pre {Math.round((preScore.correct / preScore.total) * 100)}%</div>
              <ArrowRight size={15} strokeWidth={2} color={T.muted} aria-hidden="true" />
              <div style={{ fontSize: 14, color: T.success, fontWeight: 700 }}>Post {Math.round((postScore.correct / postScore.total) * 100)}%</div>
              <div style={{ fontSize: 13, color: T.success }}>
                +{Math.round((postScore.correct / postScore.total) * 100) - Math.round((preScore.correct / preScore.total) * 100)}%
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.6, marginBottom: 12 }}>
              {preScore
                ? "Baseline assessment is logged. The post-rotation view will slot in here once you complete it."
                : "The baseline assessment is optional, but it makes the growth view much more useful later."}
            </div>
            {!preScore && (
              <button
                onClick={() => navigate("today", { type: "preQuiz" })}
                style={{ background: "transparent", color: T.brand, border: `1px solid ${T.brand}`, borderRadius: 12, padding: "10px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                Take baseline quiz
                <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
              </button>
            )}
            {preScore && !postScore && (
              <button
                onClick={() => navigate("today", { type: "postQuiz" })}
                style={{ background: T.brand, color: T.brandInk, border: "none", borderRadius: 12, padding: "11px 16px", cursor: "pointer", fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                Take post-rotation quiz
                <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
