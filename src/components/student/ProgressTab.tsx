import { useState } from "react";
import { ArrowRight, BadgeCheck, ChevronRight, Flame } from "lucide-react";
import { T } from "../../data/constants";
import { useIsMobile } from "../../utils/helpers";
import type { Gamification, Patient, QuizScore, SubView, WeeklyScores } from "../../types";
import type { CompetencyDomainSummary, CompetencySummary } from "../../utils/competency";

function MasteryRing({ value }: { value: number }) {
  const size = 120;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(value, 100)) / 100);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={T.line} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={T.med}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>{value}%</div>
        <div style={{ fontSize: 13, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>Mastery</div>
      </div>
    </div>
  );
}

const tierStyles: Record<CompetencyDomainSummary["tier"], { bg: string; border: string; text: string }> = {
  Novice: { bg: T.grayBg, border: T.line, text: T.muted },
  Developing: { bg: T.yellowBg, border: T.gold, text: T.goldText },
  Proficient: { bg: T.greenBg, border: T.green, text: T.greenDk },
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
  const totalQuizzesTaken = Object.values(weeklyScores || {}).flat().length + (preScore ? 1 : 0) + (postScore ? 1 : 0);
  const activePatients = (patients || []).filter((patient) => patient.status === "active").length;

  return (
    <div style={{ padding: 16 }}>
      <section style={{ background: T.card, borderRadius: 18, border: `1px solid ${T.line}`, padding: "18px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 18, alignItems: isMobile ? "flex-start" : "center" }}>
          <MasteryRing value={competencySummary.masteryPercent} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 6 }}>
              {competencySummary.masteryLabel}
            </div>
            <h2 style={{ margin: 0, color: T.navy, fontFamily: T.serif, fontSize: 24, fontWeight: 700 }}>
              {competencySummary.masteryDetail}
            </h2>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: T.sub, lineHeight: 1.6, maxWidth: 520 }}>
              {currentWeek
                ? `Week ${currentWeek} is measured against concrete objectives: required reading, study sheets, cases, and a scored quiz signal.`
                : "The mastery ring rolls up the tracked objectives across your active rotation work."}
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginTop: 16 }}>
          {competencySummary.objectives.map((objective) => (
            <div
              key={objective.label}
              style={{
                background: objective.met ? T.greenBg : T.bg,
                borderRadius: 14,
                border: `1px solid ${objective.met ? T.greenAlpha : T.line}`,
                padding: "12px 12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <BadgeCheck size={15} strokeWidth={2} color={objective.met ? T.greenDk : T.muted} aria-hidden="true" />
                <div style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>{objective.label}</div>
              </div>
              <div style={{ fontSize: 13, color: T.sub }}>{objective.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
        {[
          { label: "Proficient domains", value: competencySummary.proficientCount, color: T.greenDk },
          { label: "Developing domains", value: competencySummary.developingCount, color: T.warn },
          { label: "Active patients", value: activePatients, color: T.med },
          { label: "Quizzes logged", value: totalQuizzesTaken, color: T.navy },
        ].map((item) => (
          <div key={item.label} style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.line}`, padding: "12px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: item.color, fontFamily: T.mono }}>{item.value}</div>
            <div style={{ fontSize: 13, color: T.sub }}>{item.label}</div>
          </div>
        ))}
      </div>

      <section style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: T.navy, fontFamily: T.serif, fontSize: 18, fontWeight: 700 }}>Competency map</h3>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>
            Six domain rows, each driven by spaced repetition, quiz signal, case completion, and article coverage.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {competencySummary.domains.map((domain) => {
            const tierStyle = tierStyles[domain.tier];
            const expanded = expandedDomain === domain.domain;
            return (
              <div key={domain.domain} style={{ background: T.card, borderRadius: 16, border: `1px solid ${expanded ? T.med : T.line}`, overflow: "hidden" }}>
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
                        <div style={{ width: `${domain.progress}%`, background: domain.tier === "Proficient" ? T.green : domain.tier === "Developing" ? T.gold : T.med, height: "100%", borderRadius: 999 }} />
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
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>SR interval</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>{domain.signals.srIntervalDays}d</div>
                        <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>
                          {domain.signals.dueCards > 0
                            ? `${domain.signals.dueCards} card${domain.signals.dueCards !== 1 ? "s" : ""} due now`
                            : `${domain.signals.totalCards} card${domain.signals.totalCards !== 1 ? "s" : ""} tracked`}
                        </div>
                      </div>

                      <div style={{ background: T.bg, borderRadius: 12, padding: "11px 12px", border: `1px solid ${T.line}` }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Quiz signal</div>
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
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Cases logged</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>
                          {domain.signals.casesLogged}/{domain.signals.caseTarget || 0}
                        </div>
                        <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>
                          {domain.signals.caseTarget > 0 ? "Proficient target for current content set" : "No case requirement attached"}
                        </div>
                      </div>

                      <div style={{ background: T.bg, borderRadius: 12, padding: "11px 12px", border: `1px solid ${T.line}` }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Articles read</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>
                          {domain.signals.articlesRead}/{domain.signals.articleTarget || 0}
                        </div>
                        <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>
                          Supplementary signal used to round out the domain view
                        </div>
                      </div>
                    </div>

                    <div style={{ background: T.ice, borderRadius: 14, padding: "12px 13px", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.med, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Recommended next action</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{domain.action.label}</div>
                        <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginTop: 4 }}>{domain.action.detail}</div>
                      </div>
                      <button
                        onClick={() => navigate(domain.action.tab, domain.action.subView)}
                        style={{ background: T.navy, color: "white", border: "none", borderRadius: 12, padding: "11px 13px", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}
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

      <section style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.line}`, padding: "16px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, color: T.navy, fontFamily: T.serif, fontSize: 17, fontWeight: 700 }}>Consistency</h3>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>Momentum still matters — it just sits beside competency now instead of replacing it.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: T.yellowBg, border: `1px solid ${T.gold}`, borderRadius: 999, padding: "6px 10px" }}>
            <Flame size={15} strokeWidth={2} color={T.warn} aria-hidden="true" />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.warn }}>{gamification?.streaks?.currentDays || 0} day streak</span>
          </div>
        </div>

        {preScore && postScore ? (
          <div style={{ background: T.bg, borderRadius: 14, padding: "12px 13px", border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Assessment growth</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 14, color: T.sub }}>Pre {Math.round((preScore.correct / preScore.total) * 100)}%</div>
              <ArrowRight size={15} strokeWidth={2} color={T.muted} aria-hidden="true" />
              <div style={{ fontSize: 14, color: T.greenDk, fontWeight: 700 }}>Post {Math.round((postScore.correct / postScore.total) * 100)}%</div>
              <div style={{ fontSize: 13, color: T.greenDk }}>
                +{Math.round((postScore.correct / postScore.total) * 100) - Math.round((preScore.correct / preScore.total) * 100)}%
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.6 }}>
            {preScore
              ? "Baseline assessment is logged. The post-rotation view will slot in here once you complete it."
              : "The baseline assessment is optional, but it makes the growth view much more useful later."}
          </div>
        )}
      </section>
    </div>
  );
}
