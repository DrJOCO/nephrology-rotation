import { useState } from "react";
import { ArrowRight, BadgeCheck, ChevronRight, Trophy } from "lucide-react";
import { T } from "../../data/constants";
import { useIsMobile } from "../../utils/helpers";
import { ACHIEVEMENTS, getLevel } from "../../utils/gamification";
import type { Gamification, Patient, QuizScore, SubView, WeeklyScores } from "../../types";
import type { CompetencyDomainSummary, CompetencySummary } from "../../utils/competency";

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
      <section style={{ background: T.card, borderRadius: 18, border: `1px solid ${T.line}`, padding: "18px 16px", marginBottom: 16 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, marginBottom: 6 }}>
            {competencySummary.masteryLabel}
          </div>
          <h2 style={{ margin: 0, color: T.navy, fontFamily: T.serif, fontSize: 24, fontWeight: 700 }}>
            {competencySummary.masteryDetail}
          </h2>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: T.sub, lineHeight: 1.6, maxWidth: 520 }}>
            {currentWeek
              ? `Module ${currentWeek} is measured against core study sheets, cases, and a scored quiz signal. Optional references stay available for deeper reading.`
              : "Core objectives roll up across your active rotation work."}
          </p>
        </div>

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
                <div style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>{objective.label}</div>
              </div>
              <div style={{ fontSize: 13, color: T.sub }}>{objective.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: T.navy, fontFamily: T.serif, fontSize: 18, fontWeight: 700 }}>Competency map</h3>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>
            Competency is based on spaced repetition, quiz performance, and case completion. Optional reference use is shown separately.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {competencySummary.domains.map((domain) => {
            const tierStyle = tierStyles[domain.tier];
            const expanded = expandedDomain === domain.domain;
            return (
              <div key={domain.domain} style={{ background: T.card, borderRadius: 16, border: `1px solid ${expanded ? T.brand : T.line}`, overflow: "hidden" }}>
                <button
                  onClick={() => setExpandedDomain(expanded ? null : domain.domain)}
                  style={{ width: "100%", background: "none", border: "none", padding: "14px 14px", cursor: "pointer", textAlign: "left" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>{domain.label}</div>
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
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 12 }}>
                      <div style={{ background: T.bg, borderRadius: 12, padding: "11px 12px", border: `1px solid ${T.line}` }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, marginBottom: 4 }}>SR interval</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>{domain.signals.srIntervalDays}d</div>
                        <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>
                          {domain.signals.dueCards > 0
                            ? `${domain.signals.dueCards} card${domain.signals.dueCards !== 1 ? "s" : ""} due now`
                            : `${domain.signals.totalCards} card${domain.signals.totalCards !== 1 ? "s" : ""} tracked`}
                        </div>
                      </div>

                      <div style={{ background: T.bg, borderRadius: 12, padding: "11px 12px", border: `1px solid ${T.line}` }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, marginBottom: 4 }}>Quiz signal</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>
                          {domain.signals.quizAccuracy === null ? "—" : `${domain.signals.quizAccuracy}%`}
                        </div>
                        <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>
                          {domain.signals.quizSampleSize > 0
                            ? `Last ${domain.signals.quizSampleSize} question${domain.signals.quizSampleSize !== 1 ? "s" : ""}`
                            : "No quiz signal yet"}
                        </div>
                      </div>

                      <div style={{ background: T.bg, borderRadius: 12, padding: "11px 12px", border: `1px solid ${T.line}` }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, marginBottom: 4 }}>Cases logged</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>
                          {domain.signals.casesLogged}/{domain.signals.caseTarget || 0}
                        </div>
                        <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>
                          {domain.signals.caseTarget > 0 ? "Proficient target for current content set" : "No case requirement attached"}
                        </div>
                      </div>

                      <div style={{ background: T.bg, borderRadius: 12, padding: "11px 12px", border: `1px solid ${T.line}` }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, marginBottom: 4 }}>Optional references used</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>
                          {domain.signals.referencesReviewed}/{domain.signals.referenceCount || 0}
                        </div>
                        <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>
                          {domain.signals.referenceCount > 0
                            ? "Reviewed for extra depth and point-of-care reference"
                            : "No optional references linked for this domain"}
                        </div>
                      </div>
                    </div>

                    <div style={{ background: T.ice, borderRadius: 14, padding: "12px 13px", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.brand, marginBottom: 4 }}>Recommended next action</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{domain.action.label}</div>
                        <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginTop: 4 }}>{domain.action.detail}</div>
                      </div>
                      <button
                        onClick={() => navigate(domain.action.tab, domain.action.subView)}
                        style={{ background: T.brand, color: T.brandInk, border: "none", borderRadius: 12, padding: "11px 13px", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}
                      >
                        Open
                        <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.line}`, padding: "16px 16px", marginBottom: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: T.navy, fontFamily: T.serif, fontSize: 17, fontWeight: 700 }}>Momentum</h3>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>
            Competency tracks learning depth. Points make steady progress feel tangible.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(0, 1fr))", gap: 10, marginBottom: 14 }}>
          <div style={{ background: T.bg, borderRadius: 12, padding: "12px 12px", border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, marginBottom: 4 }}>Points</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>{gamification.points}</div>
          </div>
          <div style={{ background: T.bg, borderRadius: 12, padding: "12px 12px", border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, marginBottom: 4 }}>Current level</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.navy }}>{level.icon} {level.name}</div>
          </div>
          <div style={{ background: T.bg, borderRadius: 12, padding: "12px 12px", border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, marginBottom: 4 }}>Next target</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.navy }}>{level.next ? level.next : "Maxed"}</div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>
              {level.nextAt ? `${Math.max(0, level.nextAt - gamification.points)} points to go` : "Top tier reached"}
            </div>
          </div>
          {gamification.achievements.length > 0 && (
            <div style={{ background: T.bg, borderRadius: 12, padding: "12px 12px", border: `1px solid ${T.line}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, marginBottom: 4 }}>Achievements</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>{gamification.achievements.length}</div>
            </div>
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
      </section>

      <section style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.line}`, padding: "16px 16px" }}>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: T.navy, fontFamily: T.serif, fontSize: 17, fontWeight: 700 }}>Consistency</h3>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>Assessment growth and day-to-day rhythm still matter right alongside the points chase.</div>
        </div>

        {preScore && postScore ? (
          <div style={{ background: T.bg, borderRadius: 14, padding: "12px 13px", border: `1px solid ${T.line}` }}>
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
      </section>
    </div>
  );
}
