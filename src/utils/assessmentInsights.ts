import { POST_QUIZ, POST_QUIZ_BY_WEEK, PRE_QUIZ, PRE_QUIZ_BY_WEEK } from "../data/quizzes";
import type { QuizQuestion, QuizScore, SubView } from "../types";

export type AssessmentMode = "pre" | "post";

export interface AssessmentAction {
  label: string;
  meta: string;
  tab: string;
  subView?: SubView;
}

export interface AssessmentAreaSummary {
  week: number;
  label: string;
  shortLabel: string;
  correct: number;
  total: number;
  pct: number;
  status: "strong" | "steady" | "focus";
  missedTopics: string[];
  action: AssessmentAction;
  practiceAction: AssessmentAction;
}

export interface AssessmentSummary {
  mode: AssessmentMode;
  title: string;
  overallPct: number;
  growthPct: number | null;
  areas: AssessmentAreaSummary[];
  strongestAreas: AssessmentAreaSummary[];
  focusAreas: AssessmentAreaSummary[];
  recommendedArea: AssessmentAreaSummary;
  summaryLine: string;
  detailLine: string;
  reviewAction: AssessmentAction;
}

const AREA_META: Record<number, { label: string; shortLabel: string }> = {
  1: { label: "AKI & Foundations", shortLabel: "Foundations" },
  2: { label: "Electrolytes & Acid-Base", shortLabel: "Electrolytes" },
  3: { label: "Glomerular Disease & CKD", shortLabel: "Glomerular / CKD" },
  4: { label: "Therapeutics & Integration", shortLabel: "Therapeutics" },
};

function buildWeekMap(questionsByWeek: Record<number, QuizQuestion[]>): number[] {
  const map: number[] = [];
  [1, 2, 3, 4].forEach((week) => {
    (questionsByWeek[week] || []).forEach(() => {
      map.push(week);
    });
  });
  return map;
}

const PRE_QUIZ_WEEK_MAP = buildWeekMap(PRE_QUIZ_BY_WEEK);
const POST_QUIZ_WEEK_MAP = buildWeekMap(POST_QUIZ_BY_WEEK);

function pickQuestions(mode: AssessmentMode): { title: string; questions: QuizQuestion[]; weekMap: number[] } {
  return mode === "pre"
    ? { title: "Pre-Rotation Assessment", questions: PRE_QUIZ, weekMap: PRE_QUIZ_WEEK_MAP }
    : { title: "Post-Rotation Assessment", questions: POST_QUIZ, weekMap: POST_QUIZ_WEEK_MAP };
}

function uniqueTopics(topics: string[]): string[] {
  return Array.from(new Set(topics.filter(Boolean))).slice(0, 3);
}

export function buildAssessmentSummary({
  mode,
  score,
  comparisonScore,
}: {
  mode: AssessmentMode;
  score: QuizScore;
  comparisonScore?: QuizScore | null;
}): AssessmentSummary {
  const { title, questions, weekMap } = pickQuestions(mode);
  const overallPct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
  const comparisonPct = comparisonScore && comparisonScore.total > 0
    ? Math.round((comparisonScore.correct / comparisonScore.total) * 100)
    : null;
  const growthPct = comparisonPct === null ? null : overallPct - comparisonPct;

  const stats: Record<number, { correct: number; total: number; missedTopics: string[] }> = {
    1: { correct: 0, total: 0, missedTopics: [] },
    2: { correct: 0, total: 0, missedTopics: [] },
    3: { correct: 0, total: 0, missedTopics: [] },
    4: { correct: 0, total: 0, missedTopics: [] },
  };

  (score.answers || []).forEach((answer) => {
    const week = weekMap[answer.qIdx] || 1;
    const question = questions[answer.qIdx];
    stats[week].total += 1;
    if (answer.correct) {
      stats[week].correct += 1;
    } else if (question?.topic) {
      stats[week].missedTopics.push(question.topic);
    }
  });

  const areas: AssessmentAreaSummary[] = [1, 2, 3, 4].map((week) => {
    const total = stats[week].total;
    const correct = stats[week].correct;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const status = pct >= 80 ? "strong" : pct >= 60 ? "steady" : "focus";
    const meta = AREA_META[week];

    return {
      week,
      label: meta.label,
      shortLabel: meta.shortLabel,
      correct,
      total,
      pct,
      status,
      missedTopics: uniqueTopics(stats[week].missedTopics),
      action: {
        label: `Open Week ${week} teaching`,
        meta: `Study sheets, cases, and quiz review for ${meta.shortLabel.toLowerCase()}`,
        tab: "today",
        subView: { type: "studySheets", week },
      },
      practiceAction: {
        label: `Practice Week ${week}`,
        meta: `Retake the Week ${week} quiz`,
        tab: "today",
        subView: { type: "weeklyQuiz", week },
      },
    };
  });

  const focusPool = [...areas]
    .filter((area) => area.total > 0 && area.pct < 80)
    .sort((a, b) => a.pct - b.pct || a.week - b.week);
  const strongestPool = [...areas]
    .filter((area) => area.total > 0 && area.pct >= 80)
    .sort((a, b) => b.pct - a.pct || a.week - b.week);

  const focusAreas = (focusPool.length > 0 ? focusPool : [...areas].sort((a, b) => a.pct - b.pct || a.week - b.week)).slice(0, 2);
  const strongestAreas = (strongestPool.length > 0 ? strongestPool : [...areas].sort((a, b) => b.pct - a.pct || a.week - b.week)).slice(0, 2);
  const recommendedArea = focusAreas[0] || strongestAreas[0] || areas[0];

  const summaryLine = strongestAreas.length > 0 && focusAreas.length > 0
    ? `Strongest in ${strongestAreas[0].shortLabel} · review ${focusAreas[0].shortLabel}`
    : strongestAreas.length > 0
      ? `Strongest in ${strongestAreas[0].shortLabel}`
      : `Start with ${recommendedArea.shortLabel}`;
  const detailLine = recommendedArea.missedTopics.length > 0
    ? `Missed concepts: ${recommendedArea.missedTopics.join(", ")}`
    : `Use Week ${recommendedArea.week} teaching and practice to sharpen this area.`;

  return {
    mode,
    title,
    overallPct,
    growthPct,
    areas,
    strongestAreas,
    focusAreas,
    recommendedArea,
    summaryLine,
    detailLine,
    reviewAction: {
      label: mode === "pre" ? "Review baseline results" : "Review post-rotation results",
      meta: mode === "pre" ? "See strengths, gaps, and next steps" : "See strengths, gaps, and growth",
      tab: "today",
      subView: mode === "pre" ? { type: "preResults" } : { type: "postResults" },
    },
  };
}
