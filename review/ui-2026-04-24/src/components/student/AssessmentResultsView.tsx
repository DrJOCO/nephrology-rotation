import { useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, Brain, ChevronDown, RefreshCw, Target } from "lucide-react";
import { T } from "../../data/constants";
import { POST_QUIZ, PRE_QUIZ } from "../../data/quizzes";
import type { QuizScore, SubView } from "../../types";
import { buildAssessmentSummary, type AssessmentMode } from "../../utils/assessmentInsights";
import { backBtnStyle } from "./shared";

interface AssessmentResultsViewProps {
  mode: AssessmentMode;
  score: QuizScore | null;
  comparisonScore?: QuizScore | null;
  srDueCount: number;
  navigate: (tab: string, sv?: SubView) => void;
}

function getTone(pct: number) {
  if (pct >= 80) {
    return {
      border: T.green,
      accent: T.greenDk,
      background: T.greenBg,
      pill: T.greenAlpha,
    };
  }
  if (pct >= 60) {
    return {
      border: T.gold,
      accent: T.warn,
      background: T.yellowBg,
      pill: T.goldAlpha,
    };
  }
  return {
    border: T.accent,
    accent: T.accent,
    background: T.redBg,
    pill: T.redAlpha,
  };
}

function GrowthPill({ growthPct }: { growthPct: number | null }) {
  if (growthPct === null) return null;
  const positive = growthPct >= 0;
  return (
    <span
      style={{
        background: positive ? T.greenBg : T.redBg,
        color: positive ? T.greenDk : T.accent,
        borderRadius: 999,
        padding: "6px 10px",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {positive ? "+" : ""}
      {growthPct} percentage points vs baseline
    </span>
  );
}

export default function AssessmentResultsView({
  mode,
  score,
  comparisonScore = null,
  srDueCount,
  navigate,
}: AssessmentResultsViewProps) {
  const [showMissed, setShowMissed] = useState(false);

  const summary = useMemo(
    () => (score ? buildAssessmentSummary({ mode, score, comparisonScore }) : null),
    [comparisonScore, mode, score],
  );

  const questions = mode === "pre" ? PRE_QUIZ : POST_QUIZ;

  const missed = useMemo(() => {
    if (!score?.answers) return [];
    return score.answers
      .filter((answer) => !answer.correct)
      .flatMap((answer) => {
        const question = questions[answer.qIdx];
        return question ? [{ ...answer, question }] : [];
      });
  }, [questions, score]);

  if (!score || !summary) return null;

  const tone = getTone(summary.overallPct);
  const recommendedAction = summary.recommendedArea.action;
  const followUpAction = srDueCount > 0
    ? {
        label: "Start spaced repetition",
        meta: `${srDueCount} review card${srDueCount !== 1 ? "s" : ""} due now`,
        tab: "today",
        subView: { type: "srReview" } as SubView,
      }
    : summary.recommendedArea.practiceAction;
  const bridgeAction: { label: string; meta: string; tab: string; subView?: SubView } = mode === "post"
    ? {
        label: "Open Me",
        meta: "Review the broader competency overview after the assessment",
        tab: "me",
      }
    : {
        label: "Back to Today",
        meta: "Keep this summary pinned on the dashboard while you study",
        tab: "today",
      };

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => navigate("today")} style={backBtnStyle}>Back to Today</button>

      <div
        style={{
          background: `linear-gradient(135deg, ${tone.background} 0%, ${T.card} 100%)`,
          borderRadius: 18,
          padding: 24,
          border: `1.5px solid ${tone.border}`,
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ color: T.navy, fontFamily: T.serif, margin: "0 0 8px", fontSize: 26, fontWeight: 700 }}>
              {summary.title}
            </h2>
            <div style={{ color: T.sub, fontSize: 14, lineHeight: 1.6, maxWidth: 560 }}>
              {summary.summaryLine}. {summary.detailLine}
            </div>
          </div>
          <div
            style={{
              background: T.card,
              border: `1px solid ${T.line}`,
              borderRadius: 16,
              padding: "12px 14px",
              minWidth: 124,
              textAlign: "right",
            }}
          >
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>
              Score
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: tone.accent, fontFamily: T.mono, lineHeight: 1 }}>
              {summary.overallPct}%
            </div>
            <div style={{ color: T.sub, fontSize: 13, marginTop: 6 }}>
              {score.correct}/{score.total} correct
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          <span style={{ background: tone.pill, color: tone.accent, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 700 }}>
            Focus: {summary.recommendedArea.shortLabel}
          </span>
          {summary.strongestAreas[0] && (
            <span style={{ background: T.ice, color: T.med, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 700 }}>
              Strongest: {summary.strongestAreas[0].shortLabel}
            </span>
          )}
          <GrowthPill growthPct={summary.growthPct} />
          {score.date && (
            <span style={{ background: T.grayBg, color: T.sub, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 700 }}>
              Taken {new Date(score.date).toLocaleDateString()}
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {[recommendedAction, followUpAction, bridgeAction].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.tab, action.subView)}
              style={{
                background: action.label === recommendedAction.label ? T.accent : T.card,
                color: action.label === recommendedAction.label ? "white" : T.navy,
                border: action.label === recommendedAction.label ? "none" : `1px solid ${T.line}`,
                borderRadius: 14,
                padding: "14px 14px",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{action.label}</div>
                <div style={{ fontSize: 13, color: action.label === recommendedAction.label ? "rgba(255,255,255,0.82)" : T.sub, marginTop: 4 }}>
                  {action.meta}
                </div>
              </div>
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>

      <section style={{ background: T.card, borderRadius: 18, border: `1px solid ${T.line}`, padding: "16px 16px", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0, color: T.text, fontFamily: T.serif, fontSize: 18, fontWeight: 700 }}>Topic breakdown</h3>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 3 }}>
              Use the low bands to drive teaching, review, and the next quiz set.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.med, fontSize: 13, fontWeight: 700 }}>
            <Brain size={14} strokeWidth={2} aria-hidden="true" />
            Results now shape Today
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {summary.areas.map((area) => {
            const areaTone = area.status === "strong"
              ? { tint: T.greenBg, text: T.greenDk }
              : area.status === "steady"
                ? { tint: T.yellowBg, text: T.warn }
                : { tint: T.redBg, text: T.accent };
            return (
              <div key={area.week} style={{ background: areaTone.tint, borderRadius: 14, padding: "12px 14px", border: `1px solid ${T.line}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", marginBottom: 8, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>
                      Week {area.week}: {area.label}
                    </div>
                    <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>
                      {area.correct}/{area.total} correct
                      {area.missedTopics.length > 0 ? ` · Missed ${area.missedTopics.join(", ")}` : " · Solid coverage in this band"}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: areaTone.text }}>
                    {area.status === "strong" ? "Strong" : area.status === "steady" ? "Steady" : "Focus"} · {area.pct}%
                  </div>
                </div>
                <div style={{ height: 6, background: "rgba(0,0,0,0.08)", borderRadius: 999, overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ width: `${area.pct}%`, height: "100%", background: areaTone.text, borderRadius: 999 }} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    onClick={() => navigate(area.action.tab, area.action.subView)}
                    style={{ background: T.card, color: T.navy, border: `1px solid ${T.line}`, borderRadius: 999, padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Target size={14} strokeWidth={2} aria-hidden="true" />
                    {area.action.label}
                  </button>
                  <button
                    onClick={() => navigate(area.practiceAction.tab, area.practiceAction.subView)}
                    style={{ background: T.card, color: T.navy, border: `1px solid ${T.line}`, borderRadius: 999, padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <RefreshCw size={14} strokeWidth={2} aria-hidden="true" />
                    {area.practiceAction.label}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {missed.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <button
            onClick={() => setShowMissed((value) => !value)}
            style={{
              width: "100%",
              background: T.card,
              border: `1px solid ${T.line}`,
              borderRadius: 14,
              padding: "14px 16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>Review missed questions</div>
              <div style={{ fontSize: 13, color: T.sub, marginTop: 3 }}>
                {missed.length} missed item{missed.length !== 1 ? "s" : ""} with explanations
              </div>
            </div>
            <ChevronDown
              size={18}
              strokeWidth={2}
              aria-hidden="true"
              style={{ color: T.muted, transform: showMissed ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
            />
          </button>

          {showMissed && (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {missed.map((item, index) => (
                <div key={`${item.qIdx}-${index}`} style={{ background: T.redBg, borderRadius: 14, padding: 14, borderLeft: `3px solid ${T.accent}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1.5, marginBottom: 8 }}>
                    {item.question.q}
                  </div>
                  <div style={{ fontSize: 13, color: T.accent, marginBottom: 4 }}>
                    Your answer: {item.question.choices[item.chosen]}
                  </div>
                  <div style={{ fontSize: 13, color: T.greenDk, fontWeight: 700, marginBottom: 8 }}>
                    Correct answer: {item.question.choices[item.question.answer]}
                  </div>
                  <div style={{ background: T.card, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: T.sub, lineHeight: 1.55 }}>
                    {item.question.explanation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, paddingBottom: 72 }}>
        <button
          onClick={() => navigate("today")}
          style={{ background: T.card, color: T.navy, border: `1px solid ${T.line}`, borderRadius: 14, padding: "14px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          Done
        </button>
        <button
          onClick={() => navigate("today", mode === "pre" ? { type: "preQuiz" } : { type: "postQuiz" })}
          style={{ background: T.med, color: "white", border: "none", borderRadius: 14, padding: "14px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          Retake assessment
        </button>
        <button
          onClick={() => navigate(recommendedAction.tab, recommendedAction.subView)}
          style={{ background: T.ice, color: T.navy, border: `1px solid ${T.pale}`, borderRadius: 14, padding: "14px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <BadgeCheck size={16} strokeWidth={2} aria-hidden="true" />
          Start targeted teaching
        </button>
      </section>
    </div>
  );
}
