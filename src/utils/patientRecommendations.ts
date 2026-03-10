// ═══════════════════════════════════════════════════════════════════════
//  Patient-Driven Recommendations
//
//  Uses logged patient topics to generate "consult-driven" suggestions.
//  Prioritizes recently seen and active patient topics, then maps them
//  to study sheets, articles, cases, and quizzes via topicMapping.
// ═══════════════════════════════════════════════════════════════════════

import { getTopicContent } from "./topicMapping";
import { ARTICLES, STUDY_SHEETS } from "../data/constants";
import { WEEKLY_CASES } from "../data/cases";
import type { TopicRecommendation } from "../types";

interface PatientInput {
  topics?: string[];
  topic?: string;
  date: string;
  status: "active" | "discharged";
}

interface CompletedItemsInput {
  articles?: Record<string, boolean>;
  studySheets?: Record<string, boolean>;
  cases?: Record<string, unknown>;
}

/**
 * Build consult-driven recommendations from patient logs.
 *
 * Prioritization:
 *  1. Topics from active patients (higher weight)
 *  2. Topics from recently seen patients (recency decay)
 *  3. Topics with incomplete content (unread study sheets, untried cases)
 */
export function getPatientRecommendations(
  patients: PatientInput[],
  completedItems?: CompletedItemsInput,
): TopicRecommendation[] {
  if (!patients || patients.length === 0) return [];

  const completed = completedItems || {};
  const today = new Date();

  // Score each topic by frequency and recency
  const topicScores = new Map<string, { score: number; lastSeen: string }>();

  for (const patient of patients) {
    const topics = patient.topics?.length ? patient.topics : patient.topic ? [patient.topic] : [];
    const patientDate = new Date(patient.date);
    const daysAgo = Math.max(0, (today.getTime() - patientDate.getTime()) / (1000 * 60 * 60 * 24));

    // Recency weight: 1.0 for today, decays to 0.3 over 14 days
    const recencyWeight = Math.max(0.3, 1.0 - daysAgo / 20);
    // Active patients get a boost
    const statusWeight = patient.status === "active" ? 1.5 : 1.0;

    for (const topic of topics) {
      if (topic === "Other") continue;
      const existing = topicScores.get(topic);
      const newScore = recencyWeight * statusWeight;
      if (existing) {
        existing.score += newScore;
        if (patient.date > existing.lastSeen) existing.lastSeen = patient.date;
      } else {
        topicScores.set(topic, { score: newScore, lastSeen: patient.date });
      }
    }
  }

  if (topicScores.size === 0) return [];

  // Convert to recommendations with content lookup
  const recommendations: TopicRecommendation[] = [];

  for (const [topic, { score, lastSeen }] of topicScores) {
    const content = getTopicContent(topic);

    // Find specific uncompleted items
    const unreadSheets = content.studySheets.filter(
      s => !completed.studySheets?.[s.id]
    );
    const unreadArticles = content.articles.filter(
      a => !completed.articles?.[a.url]
    );
    const untriedCases = content.cases.filter(
      c => !completed.cases?.[c.id]
    );

    // Build article title list for display
    const articleTitles: string[] = [];
    for (const a of unreadArticles) {
      const weekArticles = ARTICLES[a.week] || [];
      const match = weekArticles.find((art: { url: string }) => art.url === a.url);
      if (match) articleTitles.push(match.title);
    }

    // Build study sheet title list
    const sheetIds: string[] = unreadSheets.map(s => s.id);

    // Build case IDs
    const caseIds: string[] = untriedCases.map(c => c.id);

    // Determine reason string
    const daysAgo = Math.round((today.getTime() - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24));
    const recencyLabel = daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo}d ago`;
    const reason = `Seen on consult (${recencyLabel})`;

    recommendations.push({
      topic,
      studySheets: sheetIds,
      articles: articleTitles,
      cases: caseIds,
      quizWeeks: content.quizWeeks,
      reason,
      priority: score,
    });
  }

  // Sort by priority (highest first), limit to top topics
  recommendations.sort((a, b) => b.priority - a.priority);

  return recommendations.slice(0, 5);
}

/**
 * Get a flat list of suggested actions from patient-driven recommendations.
 * Returns at most 3 actionable items for the home screen.
 */
export function getPatientSuggestedActions(
  patients: PatientInput[],
  completedItems?: CompletedItemsInput,
): Array<{ icon: string; label: string; detail: string; topic: string; contentType: string; nav: [string, Record<string, unknown>] }> {
  const recs = getPatientRecommendations(patients, completedItems);
  const actions: Array<{ icon: string; label: string; detail: string; topic: string; contentType: string; nav: [string, Record<string, unknown>] }> = [];

  for (const rec of recs) {
    if (actions.length >= 3) break;

    // Suggest the most relevant uncompleted content for each topic
    if (rec.studySheets.length > 0) {
      // Find the week containing this study sheet
      const sheetId = rec.studySheets[0];
      let sheetWeek = 1;
      for (const weekStr of Object.keys(STUDY_SHEETS)) {
        const week = Number(weekStr);
        if ((STUDY_SHEETS[week] || []).some(s => s.id === sheetId)) {
          sheetWeek = week;
          break;
        }
      }
      actions.push({
        icon: "\uD83D\uDCCB",
        label: `Review: ${rec.topic}`,
        detail: `${rec.reason} — study sheet available`,
        topic: rec.topic,
        contentType: "studySheet",
        nav: ["home", { type: "studySheets", week: sheetWeek }],
      });
    } else if (rec.cases.length > 0) {
      const caseId = rec.cases[0];
      let caseWeek = 1;
      for (const weekStr of Object.keys(WEEKLY_CASES)) {
        const week = Number(weekStr);
        if ((WEEKLY_CASES[week] || []).some(c => c.id === caseId)) {
          caseWeek = week;
          break;
        }
      }
      actions.push({
        icon: "\uD83C\uDFE5",
        label: `Practice: ${rec.topic} Case`,
        detail: `${rec.reason} — clinical case available`,
        topic: rec.topic,
        contentType: "case",
        nav: ["home", { type: "cases", week: caseWeek }],
      });
    } else if (rec.quizWeeks.length > 0) {
      actions.push({
        icon: "\uD83D\uDCDD",
        label: `Quiz: ${rec.topic}`,
        detail: `${rec.reason} — test your knowledge`,
        topic: rec.topic,
        contentType: "quiz",
        nav: ["home", { type: "weeklyQuiz", week: rec.quizWeeks[0] }],
      });
    }
  }

  return actions;
}
