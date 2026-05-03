import { WEEKLY } from "../../../data/constants";
import { buildCompetencySummary } from "../../../utils/competency";
import { buildAssessmentSummary } from "../../../utils/assessmentInsights";
import type { AdminStudent, Patient, SharedSettings } from "../../../types";
import type { ArticlesData } from "../types";
import type { StatTileState } from "../ui/StatTile";
import { getScorePct, getRotationTiming, isWithinHours } from "./format";
import { CASE_META_BY_ID } from "./exposure";

// ── Named tile-state rules ─────────────────────────────────────────────
// One predicate per "is this a flag" decision. Each returns the state
// the tile should render in (default / attention / strength). Keep these
// small and named so callers can read the policy at the call site.

export function missingTrainingYear(student: AdminStudent): StatTileState {
  const year = (student.year || "").trim();
  if (!year || year === "MS3/MS4") return "attention";
  return "default";
}

export function missingPreScore(student: AdminStudent): StatTileState {
  return student.preScore ? "default" : "attention";
}

export function missingPostScore(student: AdminStudent): StatTileState {
  return student.postScore ? "default" : "attention";
}

export function postTestStale(student: AdminStudent): StatTileState {
  // Pre exists but post is missing or older than 14 days after the rotation start.
  if (!student.preScore) return "default";
  if (!student.postScore) return "attention";
  const postAge = (Date.now() - new Date(student.postScore.date).getTime()) / (1000 * 60 * 60 * 24);
  if (postAge > 14) return "attention";
  return "default";
}

export function preToPostGrowthState(student: AdminStudent): StatTileState {
  const pre = getScorePct(student.preScore);
  const post = getScorePct(student.postScore);
  if (pre === null || post === null) return "default";
  if (post - pre >= 15) return "strength";
  if (post - pre <= 0) return "attention";
  return "default";
}

export function progressFractionState(completed: number, total: number): StatTileState {
  if (total === 0) return "default";
  const ratio = completed / total;
  if (ratio >= 1) return "strength";
  if (ratio < 0.25) return "attention";
  return "default";
}

export function progressPercentState(percent: number | null | undefined): StatTileState {
  if (percent === null || percent === undefined) return "default";
  if (percent >= 90) return "strength";
  if (percent < 25) return "attention";
  return "default";
}

export type AdminAssessmentSignal = {
  mode: "pre" | "post";
  overallPct: number;
  comparisonPct: number | null;
  summary: ReturnType<typeof buildAssessmentSummary> | null;
  hasDetailedAnswers: boolean;
  note: string | null;
};

export function buildAdminCompetencySnapshot(student: AdminStudent, settings: SharedSettings | undefined, articlesByWeek: ArticlesData) {
  const { currentWeek, totalWeeks } = getRotationTiming(settings);
  return buildCompetencySummary({
    weeklyScores: student.weeklyScores || {},
    preScore: student.preScore || null,
    postScore: student.postScore || null,
    completedItems: student.completedItems,
    srQueue: student.srQueue || {},
    currentWeek,
    totalWeeks,
    articlesByWeek,
  });
}

export function buildAdminAssessmentSignal(student: AdminStudent): AdminAssessmentSignal | null {
  const score = student.postScore || student.preScore;
  if (!score) return null;

  const mode = student.postScore ? "post" : "pre";
  const comparisonScore = student.postScore ? student.preScore : null;
  const overallPct = getScorePct(score) || 0;
  const comparisonPct = getScorePct(comparisonScore);
  const hasDetailedAnswers = Boolean(score.answers?.length);

  if (!hasDetailedAnswers) {
    return {
      mode,
      overallPct,
      comparisonPct,
      summary: null,
      hasDetailedAnswers: false,
      note: "Detailed topic insight appears when the assessment is completed in-app.",
    };
  }

  return {
    mode,
    overallPct,
    comparisonPct,
    summary: buildAssessmentSummary({ mode, score, comparisonScore }),
    hasDetailedAnswers: true,
    note: null,
  };
}

export function countTopicsFromPatients(patients: Patient[]): Array<{ label: string; count: number }> {
  const counts: Record<string, number> = {};
  patients.forEach((patient) => {
    const topics = patient.topics?.length ? patient.topics : patient.topic ? [patient.topic] : [];
    topics.forEach((topic) => {
      counts[topic] = (counts[topic] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count }));
}

export function buildStudentStudySignals(student: AdminStudent): string[] {
  const signals: string[] = [];

  [1, 2, 3, 4].forEach((week) => {
    const attempts = (student.weeklyScores || {})[week] || [];
    if (attempts.some((attempt) => isWithinHours(attempt.date, 36))) {
      signals.push(`${WEEKLY[week].title} quiz`);
    }
  });

  if (isWithinHours(student.preScore?.date, 36)) signals.push("Pre-assessment");
  if (isWithinHours(student.postScore?.date, 36)) signals.push("Post-assessment");

  Object.entries(student.completedItems?.cases || {}).forEach(([caseId, result]) => {
    if (!isWithinHours(result.date, 36)) return;
    const meta = CASE_META_BY_ID.get(caseId);
    signals.push(meta ? `${meta.title} case` : "Clinical case");
  });

  const recentActivity = (student.activityLog || []).filter((entry) => isWithinHours(entry.timestamp, 36));
  const articleDetails = recentActivity
    .filter((entry) => entry.type === "article")
    .map((entry) => entry.detail || entry.label)
    .filter(Boolean);
  const studySheetDetails = recentActivity
    .filter((entry) => entry.type === "study_sheet")
    .map((entry) => entry.detail || entry.label)
    .filter(Boolean);
  const deckDetails = recentActivity
    .filter((entry) => entry.type === "deck")
    .map((entry) => entry.detail || entry.label)
    .filter(Boolean);
  const srReviews = recentActivity.filter((entry) => entry.type === "sr_review").length;

  articleDetails.slice(0, 2).forEach((detail) => signals.push(`Article: ${detail}`));
  studySheetDetails.slice(0, 2).forEach((detail) => signals.push(`Sheet: ${detail}`));
  deckDetails.slice(0, 2).forEach((detail) => signals.push(`Deck: ${detail}`));
  if (srReviews > 0) signals.push(`${srReviews} SR review${srReviews !== 1 ? "s" : ""}`);

  return Array.from(new Set(signals)).slice(0, 4);
}

export function getStudentServiceTopics(student: AdminStudent): string[] {
  const activePatients = (student.patients || []).filter((patient) => patient.status === "active");
  const candidatePatients = activePatients.length > 0
    ? activePatients
    : (student.patients || []).filter((patient) => isWithinHours(patient.date, 96));
  return countTopicsFromPatients(candidatePatients).slice(0, 3).map((item) => item.label);
}

export function getStudentLastTouched(student: AdminStudent): string | null {
  const timestamps = [
    student.lastSyncedAt || null,
    student.preScore?.date || null,
    student.postScore?.date || null,
    ...(student.activityLog || []).map((entry) => entry.timestamp),
    ...(student.patients || []).map((patient) => patient.date),
    ...Object.values(student.weeklyScores || {}).flat().map((score) => score.date),
    ...Object.values(student.completedItems?.cases || {}).map((result) => result.date),
  ].filter(Boolean) as string[];

  if (timestamps.length === 0) return null;
  return timestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}
