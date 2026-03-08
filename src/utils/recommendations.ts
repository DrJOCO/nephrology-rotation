// ═══════════════════════════════════════════════════════════════════════
//  Recommendation Engine — rule-based weak area detection
//
//  Analyzes: quiz scores, SR queue, completion data, patient topics
//  Returns: focus areas, suggested resources, coverage gaps
// ═══════════════════════════════════════════════════════════════════════

import { WEEKLY_QUIZZES, PRE_QUIZ_BY_WEEK, POST_QUIZ_BY_WEEK } from "../data/quizzes";
import { WEEKLY_CASES } from "../data/cases";
import { STUDY_SHEETS } from "../data/constants";
import { WEEK_TOPIC_MAP } from "../components/student/shared";

interface QuizAttempt {
  correct: number;
  total: number;
  date?: string;
}

interface SrQueueItem {
  questionKey?: string;
  easeFactor: number;
  interval: number;
  nextReviewDate: string;
  repetitions: number;
}

interface FocusArea {
  week: number;
  label: string;
  score: number | null;
  srItems: number;
  reason: string;
  isWeak: boolean;
}

interface SuggestedAction {
  type: string;
  priority: number;
  icon: string;
  label: string;
  detail: string;
  nav: [string, Record<string, unknown>];
}

interface RecommendationStats {
  totalQuizAttempts: number;
  weeksAttempted: number;
  avgScore: number | null;
  srItemsTotal: number;
  srLowEase: number;
  coverageGaps: number;
  topicsCovered: number;
  hasEnoughData: boolean;
}

export interface Recommendations {
  focusAreas: FocusArea[];
  suggestedActions: SuggestedAction[];
  stats: RecommendationStats;
}

interface RecommendationState {
  weeklyScores?: Record<string, QuizAttempt[]>;
  preScore?: QuizAttempt | null;
  postScore?: QuizAttempt | null;
  srQueue?: Record<string, SrQueueItem>;
  completedItems?: {
    articles?: Record<string, boolean>;
    studySheets?: Record<string, boolean>;
    cases?: Record<string, unknown>;
  };
  patients?: Array<{ topics?: string[] }>;
}

// ── Score each week/topic area ─────────────────────────────────────────

/**
 * Calculate performance score per week (0-100), weighting recent attempts more
 * @param {Object} weeklyScores - { "1": [{ correct, total, date }], ... }
 * @returns {Object} { 1: number|null, 2: number|null, 3: number|null, 4: number|null }
 */
function scoreByWeek(weeklyScores: Record<string, QuizAttempt[]>): Record<number, number | null> {
  const scores: Record<number, number | null> = {};
  for (const week of [1, 2, 3, 4]) {
    const attempts = weeklyScores[week] || [];
    if (attempts.length === 0) {
      scores[week] = null; // no data
      continue;
    }
    // Weight recent attempts more: latest = 1.0, second-latest = 0.6, older = 0.3
    const weights = [1.0, 0.6, 0.3];
    let weightedSum = 0;
    let weightTotal = 0;
    const sorted = [...attempts].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    sorted.forEach((a, i) => {
      const w = weights[Math.min(i, weights.length - 1)];
      if (a.total > 0) {
        weightedSum += (a.correct / a.total) * 100 * w;
        weightTotal += w;
      }
    });
    scores[week] = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : null;
  }
  return scores;
}

/**
 * Analyze spaced repetition queue for weak spots
 * @param {Object} srQueue - { questionKey: { easeFactor, interval, repetitions, ... } }
 * @returns {Object} { weekCounts: { 1: n, 2: n, ... }, lowEaseCount: n, totalInQueue: n }
 */
function analyzeSrQueue(srQueue: Record<string, SrQueueItem>): { weekCounts: Record<number, number>; lowEaseCount: number; totalInQueue: number } {
  const weekCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let lowEaseCount = 0;
  const entries = Object.values(srQueue || {});

  for (const item of entries) {
    // Parse week from questionKey: "weekly_1_3" or "pre_2_5"
    const parts = item.questionKey?.split("_") || [];
    const week = parseInt(parts[1]);
    if (week >= 1 && week <= 4) {
      weekCounts[week]++;
    }
    // Low ease factor = struggling with this question
    if (item.easeFactor < 2.0) {
      lowEaseCount++;
    }
  }

  return { weekCounts, lowEaseCount, totalInQueue: entries.length };
}

/**
 * Identify content coverage gaps
 * @param {Object} completedItems - { articles: {}, studySheets: {}, cases: {} }
 * @returns {Object[]} Array of { week, type, label, count, total }
 */
function findCoverageGaps(completedItems: RecommendationState["completedItems"]): Array<{ week: number; type: string; label: string; done: number; total: number }> {
  const gaps: Array<{ week: number; type: string; label: string; done: number; total: number }> = [];
  const completed = completedItems || { articles: {}, studySheets: {}, cases: {} };

  for (const week of [1, 2, 3, 4]) {
    // Study sheets
    const sheets = STUDY_SHEETS[week] || [];
    const sheetsRead = sheets.filter(s => completed.studySheets?.[s.id]).length;
    if (sheets.length > 0 && sheetsRead < sheets.length) {
      gaps.push({ week, type: "studySheets", label: "Study Sheets", done: sheetsRead, total: sheets.length });
    }

    // Cases
    const cases = WEEKLY_CASES[week] || [];
    const casesDone = cases.filter(c => completed.cases?.[c.id]).length;
    if (cases.length > 0 && casesDone < cases.length) {
      gaps.push({ week, type: "cases", label: "Clinical Cases", done: casesDone, total: cases.length });
    }
  }

  return gaps;
}

/**
 * Analyze patient topic coverage
 * @param {Array} patients
 * @returns {Set<string>} set of unique topics covered
 */
function getPatientTopics(patients: Array<{ topics?: string[] }>): Set<string> {
  const topics = new Set<string>();
  (patients || []).forEach(p => (p.topics || []).forEach(t => topics.add(t)));
  return topics;
}

// ── Main recommendation engine ─────────────────────────────────────────

/**
 * Generate personalized recommendations based on student data
 * @param {Object} state - { weeklyScores, preScore, postScore, srQueue, completedItems, patients, gamification }
 * @returns {Object} { focusAreas, suggestedActions, stats }
 */
export function getRecommendations(state: RecommendationState): Recommendations {
  const {
    weeklyScores = {},
    preScore,
    postScore,
    srQueue = {},
    completedItems = { articles: {}, studySheets: {}, cases: {} },
    patients = [],
  } = state;

  const weekScores = scoreByWeek(weeklyScores);
  const srAnalysis = analyzeSrQueue(srQueue);
  const coverageGaps = findCoverageGaps(completedItems);
  const patientTopics = getPatientTopics(patients);

  // ── Focus Areas: weakest weeks ─────────────────────────────────────
  const focusAreas: FocusArea[] = [];

  // Rank weeks by weakness: combine quiz score + SR item count
  const weekRankings = [1, 2, 3, 4].map(week => {
    const quizScore = weekScores[week]; // null if no attempts
    const srItems = srAnalysis.weekCounts[week] || 0;

    // Composite weakness score (higher = weaker)
    let weakness = 0;
    if (quizScore === null) {
      weakness = 60; // no data = moderate priority (encourage them to try)
    } else {
      weakness = (100 - quizScore); // lower quiz score = higher weakness
    }
    weakness += srItems * 5; // more SR items in this week = weaker

    return { week, quizScore, srItems, weakness };
  }).sort((a, b) => b.weakness - a.weakness);

  // Top 2 weakest areas become focus areas
  for (const ranking of weekRankings.slice(0, 2)) {
    const topicInfo = WEEK_TOPIC_MAP[ranking.week];
    if (!topicInfo) continue;

    let reason;
    if (ranking.quizScore === null) {
      reason = "Not yet attempted";
    } else if (ranking.quizScore < 60) {
      reason = `Quiz score: ${ranking.quizScore}%`;
    } else if (ranking.quizScore < 80) {
      reason = `Quiz score: ${ranking.quizScore}% — room to improve`;
    } else if (ranking.srItems > 2) {
      reason = `${ranking.srItems} questions still in review`;
    } else {
      reason = `Score: ${ranking.quizScore}% — looking solid`;
    }

    focusAreas.push({
      week: ranking.week,
      label: topicInfo.label,
      score: ranking.quizScore,
      srItems: ranking.srItems,
      reason,
      isWeak: ranking.quizScore === null || ranking.quizScore < 70,
    });
  }

  // ── Suggested Actions ──────────────────────────────────────────────
  const suggestedActions: SuggestedAction[] = [];

  // 1. Review SR items if due
  const dueCount = Object.values(srQueue).filter(item => {
    const today = new Date().toISOString().slice(0, 10);
    return item.nextReviewDate <= today;
  }).length;

  if (dueCount > 0) {
    suggestedActions.push({
      type: "sr_review",
      priority: 1,
      icon: "🔄",
      label: `Review ${dueCount} spaced repetition question${dueCount !== 1 ? "s" : ""}`,
      detail: "Strengthen weak areas with targeted review",
      nav: ["home", { type: "extraPractice" }],
    });
  }

  // 2. Take untried quizzes (highest priority if nothing attempted)
  const untriedWeeks = [1, 2, 3, 4].filter(w => !weeklyScores[w] || weeklyScores[w].length === 0);
  if (untriedWeeks.length > 0) {
    const w = untriedWeeks[0];
    suggestedActions.push({
      type: "take_quiz",
      priority: 2,
      icon: "📝",
      label: `Take Week ${w} Quiz: ${WEEK_TOPIC_MAP[w]?.label}`,
      detail: `${(WEEKLY_QUIZZES[w] || []).length} questions — establish your baseline`,
      nav: ["home", { type: "weeklyQuiz", week: w }],
    });
  }

  // 3. Complete study sheets for weak areas
  const weakWeek = weekRankings[0];
  const weekSheetGap = coverageGaps.find(g => g.week === weakWeek.week && g.type === "studySheets");
  if (weekSheetGap && weekSheetGap.done < weekSheetGap.total) {
    suggestedActions.push({
      type: "study_sheet",
      priority: 3,
      icon: "📋",
      label: `Review Week ${weakWeek.week} Study Sheets`,
      detail: `${weekSheetGap.done}/${weekSheetGap.total} completed — covers ${WEEK_TOPIC_MAP[weakWeek.week]?.label}`,
      nav: ["home", { type: "studySheets", week: weakWeek.week }],
    });
  }

  // 4. Complete clinical cases for weak areas
  const weekCaseGap = coverageGaps.find(g => g.week === weakWeek.week && g.type === "cases");
  if (weekCaseGap && weekCaseGap.done < weekCaseGap.total) {
    suggestedActions.push({
      type: "clinical_case",
      priority: 4,
      icon: "🏥",
      label: `Try Week ${weakWeek.week} Clinical Cases`,
      detail: `${weekCaseGap.done}/${weekCaseGap.total} completed — apply knowledge to real scenarios`,
      nav: ["home", { type: "cases", week: weakWeek.week }],
    });
  }

  // 5. Retake low-scoring quizzes
  const lowScoreWeeks = [1, 2, 3, 4].filter(w => weekScores[w] !== null && weekScores[w] < 70);
  for (const w of lowScoreWeeks.slice(0, 1)) {
    suggestedActions.push({
      type: "retake_quiz",
      priority: 5,
      icon: "🔁",
      label: `Retake Week ${w} Quiz (${weekScores[w]}%)`,
      detail: `Target: 80%+ — review study sheet first for best results`,
      nav: ["home", { type: "weeklyQuiz", week: w }],
    });
  }

  // 6. Take pre/post assessment
  if (!preScore) {
    suggestedActions.push({
      type: "pre_assessment",
      priority: 6,
      icon: "📊",
      label: "Take Pre-Rotation Assessment",
      detail: "Establish your baseline — helps track growth",
      nav: ["home", { type: "preQuiz" }],
    });
  } else if (!postScore) {
    const totalQuizAttempts = Object.values(weeklyScores).flat().length;
    if (totalQuizAttempts >= 3) {
      suggestedActions.push({
        type: "post_assessment",
        priority: 6,
        icon: "🎓",
        label: "Take Post-Rotation Assessment",
        detail: "Measure your growth since the pre-test",
        nav: ["home", { type: "postQuiz" }],
      });
    }
  }

  // Sort by priority
  suggestedActions.sort((a, b) => a.priority - b.priority);

  // ── Summary stats ──────────────────────────────────────────────────
  const totalQuizAttempts = Object.values(weeklyScores).flat().length;
  const avgScore = (() => {
    const scored = Object.values(weekScores).filter(s => s !== null);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
  })();

  const stats = {
    totalQuizAttempts,
    weeksAttempted: [1, 2, 3, 4].filter(w => weekScores[w] !== null).length,
    avgScore,
    srItemsTotal: srAnalysis.totalInQueue,
    srLowEase: srAnalysis.lowEaseCount,
    coverageGaps: coverageGaps.length,
    topicsCovered: patientTopics.size,
    hasEnoughData: totalQuizAttempts > 0 || patients.length > 0,
  };

  return { focusAreas, suggestedActions: suggestedActions.slice(0, 4), stats };
}
