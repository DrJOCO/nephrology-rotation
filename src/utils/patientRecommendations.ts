// ═══════════════════════════════════════════════════════════════════════
//  Patient-Driven Recommendations
//
//  Uses logged patient topics to generate "consult-driven" suggestions.
//  Prioritizes recently seen and active patient topics, then maps them
//  to study sheets, articles, cases, and quizzes via topicMapping.
// ═══════════════════════════════════════════════════════════════════════

import { getTopicContent } from "./topicMapping";
import { isArticleCompleted } from "./articleKeys";
import { getConsultTopicCompletionKey } from "./consultTopicKey";
import { ARTICLES, CURRICULUM_DECKS, STUDY_SHEETS } from "../data/constants";
import { WEEKLY_CASES } from "../data/cases";
import { ALL_LANDMARK_TRIALS } from "../data/trials";
import { INPATIENT_GUIDES, type InpatientGuideTopic } from "../data/inpatientGuides";
import type { TopicRecommendation } from "../types";

// Re-exported for backward compatibility with existing importers.
export { getConsultTopicCompletionKey };

interface PatientInput {
  topics?: string[];
  topic?: string;
  date: string;
  status: "active" | "discharged";
}

interface CompletedItemsInput {
  articles?: Record<string, boolean>;
  studySheets?: Record<string, boolean>;
  decks?: Record<string, boolean>;
  cases?: Record<string, unknown>;
  consultTopics?: Record<string, unknown>;
}

interface ConsultTopicCompletionInput {
  completedAt?: string;
}

function getPatientTopics(patient: PatientInput): string[] {
  return patient.topics?.length ? patient.topics : patient.topic ? [patient.topic] : [];
}

function getLatestConsultDatesByTopic(patients: PatientInput[]): Map<string, string> {
  const latest = new Map<string, string>();
  for (const patient of patients || []) {
    for (const topic of getPatientTopics(patient)) {
      if (topic === "Other") continue;
      const existing = latest.get(topic);
      if (!existing || new Date(patient.date).getTime() > new Date(existing).getTime()) {
        latest.set(topic, patient.date);
      }
    }
  }
  return latest;
}

function getReviewedAt(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const completedAt = (value as ConsultTopicCompletionInput).completedAt;
  return typeof completedAt === "string" ? completedAt : null;
}

function isConsultTopicReviewedAfterLatestConsult(reviewedAt: string | null, latestConsultAt?: string): boolean {
  if (!reviewedAt || !latestConsultAt) return false;
  const reviewedTime = new Date(reviewedAt).getTime();
  const latestConsultTime = new Date(latestConsultAt).getTime();
  if (!Number.isFinite(reviewedTime) || !Number.isFinite(latestConsultTime)) return false;
  return reviewedTime >= latestConsultTime;
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
    const topics = getPatientTopics(patient);
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
    const unreviewedDecks = content.decks.filter(
      d => !completed.decks?.[d.id]
    );
    const unreadArticles = content.articles.filter(
      a => !isArticleCompleted(completed.articles, a)
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

    // Build deck ID list
    const deckIds: string[] = unreviewedDecks.map(d => d.id);

    // Build case IDs
    const caseIds: string[] = untriedCases.map(c => c.id);

    // Determine reason string
    const daysAgo = Math.round((today.getTime() - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24));
    const recencyLabel = daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo}d ago`;
    const reason = `Seen on consult (${recencyLabel})`;

    recommendations.push({
      topic,
      studySheets: sheetIds,
      decks: deckIds,
      articles: articleTitles,
      cases: caseIds,
      quizWeeks: content.quizWeeks,
      reason,
      priority: score,
    });
  }

  // Sort by priority (highest first); callers decide how many to show
  recommendations.sort((a, b) => b.priority - a.priority);

  return recommendations;
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
        nav: ["today", { type: "studySheets", week: sheetWeek }],
      });
    } else if (rec.decks.length > 0) {
      const deckId = rec.decks[0];
      const deck = CURRICULUM_DECKS.find(item => item.id === deckId);
      actions.push({
        icon: "\uD83D\uDCCA",
        label: `Deck: ${rec.topic}`,
        detail: `${rec.reason} — teaching slides available`,
        topic: rec.topic,
        contentType: "deck",
        nav: ["today", { type: "resources", tab: "decks", week: deck?.week || 1 }],
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
        nav: ["today", { type: "cases", week: caseWeek }],
      });
    }
    // Quizzes intentionally excluded from "Suggested from consults" — this surface
    // is for informational/reading content (sheets, decks, cases). Quizzes live
    // in Core path and Due today.
  }

  return actions;
}

/**
 * Per-topic groupings for the "Suggested from your consults" surface.
 * Each group lists the relevant study sheets and landmark trials for a topic
 * the student has seen on consults. Quizzes/decks/cases excluded by design —
 * this surface is for *informational* content.
 */
export interface PatientSuggestedTopicGroup {
  topic: string;
  reason: string;
  sheets: Array<{ id: string; title: string; week: number }>;
  trials: Array<{ name: string; week: number; takeaway: string }>;
  tools: Array<{ id: string; label: string; description: string; nav: [string, Record<string, unknown>] }>;
  guides: Array<{ id: InpatientGuideTopic; label: string; subtitle: string; nav: [string, Record<string, unknown>] }>;
}

// Patient/consult topic strings → inpatient consult guide topic IDs.
// Multiple consult topics can map to the same guide (e.g. all AKI flavors → AKI guide).
const TOPIC_TO_INPATIENT_GUIDE: Record<string, InpatientGuideTopic[]> = {
  "AKI": ["AKI"],
  "Post-Renal AKI": ["AKI"],
  "Contrast-Associated AKI": ["Contrast AKI", "AKI"],
  "Rhabdomyolysis": ["Rhabdo", "AKI"],
  "AIN": ["AKI"],
  "Hepatorenal Syndrome": ["HRS"],
  "Cardiorenal Syndrome": ["Cardiorenal"],
  "Hyponatremia": ["Hyponatremia"],
  "Hyperkalemia": ["Hyperkalemia"],
  "Dialysis": ["ESRD Inpatient", "Dialysis"],
  "ESRD": ["ESRD Inpatient", "Dialysis"],
  "ESKD": ["ESRD Inpatient", "Dialysis"],
  "GN": ["GN"],
  "Glomerulonephritis": ["GN"],
  "DKD": ["DKD"],
  "Diabetic Kidney Disease": ["DKD"],
  "PD Peritonitis": ["PD Peritonitis"],
};

function getGuidesForTopic(topic: string): PatientSuggestedTopicGroup["guides"] {
  const guideIds = TOPIC_TO_INPATIENT_GUIDE[topic];
  if (!guideIds) return [];
  const seen = new Set<InpatientGuideTopic>();
  const guides: PatientSuggestedTopicGroup["guides"] = [];
  for (const id of guideIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const template = INPATIENT_GUIDES[id];
    if (!template) continue;
    guides.push({
      id,
      label: template.title,
      subtitle: template.subtitle,
      nav: ["library", { type: "inpatientGuide", topic: id }],
    });
  }
  return guides;
}

const AKI_TOOL_TOPICS = new Set([
  "AKI",
  "Post-Renal AKI",
  "Contrast-Associated AKI",
  "Rhabdomyolysis",
  "AIN",
  "Hepatorenal Syndrome",
  "Cardiorenal Syndrome",
]);

const HYPONATREMIA_TOOL_TOPICS = new Set([
  "Hyponatremia",
]);

const GN_TOOL_TOPICS = new Set([
  "GN",
  "Glomerulonephritis",
  "Nephrotic Syndrome",
  "Lupus Nephritis",
  "IgA Nephropathy",
  "ANCA Vasculitis",
  "Membranous Nephropathy",
  "FSGS",
  "Minimal Change Disease",
  "Anti-GBM Disease",
  "Post-Infectious GN",
  "Cryoglobulinemic GN",
  "C3 Glomerulopathy",
  "MPGN",
  "HIVAN",
  "Proteinuria",
  "Kidney Biopsy",
]);

function getToolsForTopic(topic: string): PatientSuggestedTopicGroup["tools"] {
  const tools: PatientSuggestedTopicGroup["tools"] = [];
  if (AKI_TOOL_TOPICS.has(topic)) {
    tools.push({
      id: "akiTool",
      label: "AKI Differential Tool",
      description: "Stage AKI, build a ranked differential from exposures + UA + imaging, with FENa/FEUrea.",
      nav: ["library", { type: "akiTool" }],
    });
  }
  if (HYPONATREMIA_TOOL_TOPICS.has(topic)) {
    tools.push({
      id: "hyponatremiaTool",
      label: "Hyponatremia Tool",
      description: "Tonicity → impaired water excretion → volume status, with correction caps and ODS risk.",
      nav: ["library", { type: "hyponatremiaTool" }],
    });
  }
  if (GN_TOOL_TOPICS.has(topic)) {
    tools.push({
      id: "gnTool",
      label: "Glomerular Disease Tool",
      description: "Syndrome × complement → ranked GN differential with what positive serologies mean and which to send next.",
      nav: ["library", { type: "gnTool" }],
    });
  }
  return tools;
}

export function getPatientSuggestedTopicGroups(
  patients: PatientInput[],
  completedItems?: CompletedItemsInput,
): PatientSuggestedTopicGroup[] {
  const recs = getPatientRecommendations(patients, completedItems);
  const completedConsultTopics = completedItems?.consultTopics || {};
  const latestConsultDates = getLatestConsultDatesByTopic(patients);
  const groups: PatientSuggestedTopicGroup[] = [];

  for (const rec of recs) {
    const completion = completedConsultTopics[getConsultTopicCompletionKey(rec.topic)];
    if (isConsultTopicReviewedAfterLatestConsult(getReviewedAt(completion), latestConsultDates.get(rec.topic))) continue;

    const content = getTopicContent(rec.topic);
    const sheetRefsById = new Map(content.studySheets.map(ref => [ref.id, ref]));

    const sheets: PatientSuggestedTopicGroup["sheets"] = [];
    for (const sheetId of rec.studySheets) {
      const ref = sheetRefsById.get(sheetId);
      if (!ref) continue;
      const sheet = (STUDY_SHEETS[ref.week] || []).find(s => s.id === ref.id);
      if (sheet) sheets.push({ id: sheet.id, title: sheet.title, week: ref.week });
    }

    const trials: PatientSuggestedTopicGroup["trials"] = [];
    for (const trialName of content.trials) {
      const trial = ALL_LANDMARK_TRIALS.find(t => t.name === trialName);
      if (trial) trials.push({ name: trial.name, week: trial.week, takeaway: trial.takeaway });
    }

    const tools = getToolsForTopic(rec.topic);
    const guides = getGuidesForTopic(rec.topic);

    if (sheets.length === 0 && trials.length === 0 && tools.length === 0 && guides.length === 0) continue;
    groups.push({ topic: rec.topic, reason: rec.reason, sheets, trials, tools, guides });
  }

  return groups;
}
