// ═══════════════════════════════════════════════════════════════════════
// Search Engine — relevance-scored, multi-word, fuzzy search
//
// Scoring:
//   Exact match (full query)     → +100
//   Word-boundary match          → +40 per word
//   Substring match              → +15 per word
//   Fuzzy match (1-edit typo)    → +8 per word
//   Field weight multiplier      → title=3x, name=3x, category=2x, other=1x
// ═══════════════════════════════════════════════════════════════════════

import { CLINIC_GUIDES } from "../data/clinicGuides";
import { INPATIENT_GUIDES } from "../data/inpatientGuides";
import { ROTATION_GUIDES } from "../data/rotationGuides";
import type { SearchDataSources } from "../types";

export type SearchScope = "all" | "articles" | "trials" | "pearls" | "patients" | "team";

export interface SearchField {
  value: string;
  weight: number;
}

export interface SearchResultItem {
  label: string;
  kind: string;
  tag: string;
  score: number;
  nav: [string, Record<string, unknown> | undefined];
}

export interface SearchResults {
  articles: SearchResultItem[];
  trials: SearchResultItem[];
  pearls: SearchResultItem[];
  patients: SearchResultItem[];
  team: SearchResultItem[];
  cases: SearchResultItem[];
  studySheets: SearchResultItem[];
  abbreviations: SearchResultItem[];
  quickRefs: SearchResultItem[];
}

const ROTATION_GUIDE_LIST = Object.values(ROTATION_GUIDES);
const INPATIENT_GUIDE_LIST = Object.values(INPATIENT_GUIDES);
const CLINIC_GUIDE_LIST = Object.values(CLINIC_GUIDES);

/**
 * Compute Levenshtein edit distance between two strings (for typo tolerance)
 * Limited to short strings for performance
 */
function editDistance(a: string, b: string): number {
  if (a.length > 20 || b.length > 20) return Infinity;
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Score how well a single query word matches a single field value
 * @param {string} word - single search term (lowercase)
 * @param {string} field - field value (lowercase)
 * @returns {number} relevance score (0 if no match)
 */
function scoreWordInField(word: string, field: string): number {
  if (!field || !word) return 0;

  if (field === word) return 120;
  if (field.startsWith(word)) return 60;

  const wordBoundary = new RegExp(`(?:^|[\\s\\-/,.(])${escapeRegex(word)}`);
  if (wordBoundary.test(field)) return 40;
  if (field.includes(word)) return 15;

  if (word.length >= 4) {
    const fieldWords = field.split(/[\s\-/,.()]+/).filter(Boolean);
    for (const fw of fieldWords) {
      if (fw.length >= 3 && editDistance(word, fw) <= 1) return 8;
    }
  }

  return 0;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Score how well a query matches a set of weighted fields
 * @param {string} query - full search query (lowercase, trimmed)
 * @param {{ value: string, weight: number }[]} fields - fields to search with weights
 * @returns {number} total relevance score (0 = no match)
 */
export function scoreItem(query: string, fields: SearchField[]): number {
  const words = query.split(/\s+/).filter(w => w.length >= 2);
  if (words.length === 0) return 0;

  let totalScore = 0;
  let matchedWords = 0;

  for (const word of words) {
    let bestWordScore = 0;
    for (const { value, weight } of fields) {
      const fieldLower = (value || "").toLowerCase();
      const wordScore = scoreWordInField(word, fieldLower) * weight;
      bestWordScore = Math.max(bestWordScore, wordScore);
    }
    if (bestWordScore > 0) matchedWords++;
    totalScore += bestWordScore;
  }

  if (words.length > 1 && matchedWords === words.length) {
    totalScore *= 1.5;
  }

  if (matchedWords < words.length) {
    totalScore *= (matchedWords / words.length) * 0.5;
  }

  for (const { value, weight } of fields) {
    const fieldLower = (value || "").toLowerCase();
    if (fieldLower.includes(query)) {
      totalScore += 100 * weight;
    }
  }

  return Math.round(totalScore);
}

function sortResults(results: SearchResults): SearchResults {
  for (const key of Object.keys(results) as (keyof SearchResults)[]) {
    results[key].sort((a, b) => b.score - a.score);
  }
  return results;
}

/**
 * Search and rank all content items
 * @param {string} query - raw search input
 * @param {Object} dataSources - content available to search
 * @returns {{ trials: [], articles: [], pearls: [], patients: [], team: [], ... }}
 */
export function searchAll(
  query: string,
  { trials, articlesByWeek, cases, studySheets, abbreviations, quickRefs, patients = [], teamSnapshots = [] }: SearchDataSources,
): SearchResults | null {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return null;

  const results: SearchResults = {
    articles: [],
    trials: [],
    pearls: [],
    patients: [],
    team: [],
    cases: [],
    studySheets: [],
    abbreviations: [],
    quickRefs: [],
  };

  (trials || []).forEach((trial) => {
    const score = scoreItem(q, [
      { value: trial.name, weight: 3 },
      { value: trial.full_title, weight: 2 },
      { value: trial.category, weight: 2 },
      { value: trial.takeaway, weight: 1 },
      { value: trial.significance, weight: 0.5 },
    ]);
    if (score > 0) {
      results.trials.push({
        label: trial.name,
        kind: "Trial",
        tag: trial.category,
        score,
        nav: ["library", { type: "trialLibrary", searchTrial: trial.name }],
      });
    }
  });

  [1, 2, 3, 4].forEach((week) => {
    ((articlesByWeek || {})[week] || []).forEach((article) => {
      const score = scoreItem(q, [
        { value: article.title, weight: 3 },
        { value: article.journal, weight: 1.5 },
        { value: article.topic, weight: 2 },
        { value: article.type, weight: 1 },
      ]);
      if (score > 0) {
        results.articles.push({
          label: article.title,
          kind: "Article",
          tag: `${article.topic} · Week ${week}`,
          score,
          nav: ["today", { type: "articles", week }],
        });
      }
    });
  });

  [1, 2, 3, 4].forEach((week) => {
    ((cases || {})[week] || []).forEach((item) => {
      const score = scoreItem(q, [
        { value: item.title, weight: 3 },
        { value: item.category, weight: 2 },
        { value: item.difficulty, weight: 0.5 },
        { value: item.scenario, weight: 0.5 },
      ]);
      if (score > 0) {
        results.cases.push({
          label: item.title,
          kind: "Case",
          tag: `${item.category} · Week ${week}`,
          score,
          nav: ["today", { type: "cases", week }],
        });
      }
    });
  });

  [1, 2, 3, 4].forEach((week) => {
    ((studySheets || {})[week] || []).forEach((sheet) => {
      const sectionText = (sheet.sections || []).map(section => section.heading).join(" ");
      const itemText = (sheet.sections || []).flatMap(section => section.items || []).join(" ");
      const score = scoreItem(q, [
        { value: sheet.title, weight: 3 },
        { value: sheet.subtitle, weight: 2 },
        { value: sectionText, weight: 1.5 },
        { value: itemText, weight: 0.3 },
      ]);
      if (score > 0) {
        results.studySheets.push({
          label: sheet.title,
          kind: "Study sheet",
          tag: `Week ${week}`,
          score,
          nav: ["today", { type: "studySheets", week }],
        });
      }

      (sheet.trialCallouts || []).forEach((callout) => {
        const pearlScore = scoreItem(q, [
          { value: callout.pearl, weight: 3 },
          { value: callout.trial, weight: 2 },
          { value: sheet.title, weight: 1.5 },
        ]);
        if (pearlScore > 0) {
          results.pearls.push({
            label: callout.pearl,
            kind: "Pearl",
            tag: `${sheet.title} · Week ${week}`,
            score: pearlScore,
            nav: ["today", { type: "studySheets", week }],
          });
        }
      });
    });
  });

  ROTATION_GUIDE_LIST.forEach((guide) => {
    const score = scoreItem(q, [
      { value: guide.teachingPearl, weight: 3 },
      { value: guide.title, weight: 2 },
      { value: guide.subtitle, weight: 1.5 },
      { value: guide.teachingPoints.join(" "), weight: 1 },
    ]);
    if (score > 0) {
      results.pearls.push({
        label: guide.teachingPearl,
        kind: "Pearl",
        tag: guide.title,
        score,
        nav: ["library", { type: "rotationGuide", guideId: guide.id }],
      });
    }
  });

  INPATIENT_GUIDE_LIST.forEach((guide) => {
    const score = scoreItem(q, [
      { value: guide.teachingPearl, weight: 3 },
      { value: guide.title, weight: 2 },
      { value: guide.topic, weight: 2 },
      { value: guide.subtitle, weight: 1.5 },
      { value: guide.discussionQuestions.join(" "), weight: 0.5 },
    ]);
    if (score > 0) {
      results.pearls.push({
        label: guide.teachingPearl,
        kind: "Pearl",
        tag: guide.title,
        score,
        nav: ["library", { type: "inpatientGuide", topic: guide.topic }],
      });
    }
  });

  CLINIC_GUIDE_LIST.forEach((guide) => {
    const score = scoreItem(q, [
      { value: guide.teachingPearl, weight: 3 },
      { value: guide.title, weight: 2 },
      { value: guide.topic, weight: 2 },
      { value: guide.subtitle, weight: 1.5 },
      { value: guide.teachingPoints.join(" "), weight: 1 },
    ]);
    if (score > 0) {
      results.pearls.push({
        label: guide.teachingPearl,
        kind: "Pearl",
        tag: guide.title,
        score,
        nav: ["library", { type: "clinicGuideHistory" }],
      });
    }
  });

  (patients || []).forEach((patient) => {
    const topics = patient.topics || (patient.topic ? [patient.topic] : []);
    const score = scoreItem(q, [
      { value: patient.initials, weight: 2.5 },
      { value: patient.dx, weight: 3 },
      { value: topics.join(" "), weight: 2 },
      { value: patient.notes, weight: 1 },
      { value: patient.room, weight: 0.5 },
    ]);
    if (score > 0) {
      const tagParts = [patient.status === "active" ? "Active patient" : "Discharged patient"];
      if (topics.length > 0) tagParts.push(topics.slice(0, 2).join(", "));
      else if (patient.room) tagParts.push(`Rm ${patient.room}`);
      results.patients.push({
        label: patient.dx ? `${patient.initials} · ${patient.dx}` : patient.initials || "Patient",
        kind: "My patient",
        tag: tagParts.join(" · "),
        score,
        nav: ["patients", undefined],
      });
    }
  });

  (teamSnapshots || []).forEach((snapshot) => {
    const topics = Object.keys(snapshot.topicCounts || {});
    const score = scoreItem(q, [
      { value: snapshot.name, weight: 3 },
      { value: snapshot.levelName, weight: 1 },
      { value: topics.join(" "), weight: 2 },
    ]);
    if (score > 0) {
      const topicSummary = topics.length > 0 ? topics.slice(0, 2).join(", ") : "Shared learning snapshot";
      results.team.push({
        label: snapshot.name || "Team member",
        kind: "Ask the team",
        tag: topicSummary,
        score,
        nav: ["team", undefined],
      });
    }
  });

  (abbreviations || []).forEach((item) => {
    const score = scoreItem(q, [
      { value: item.abbr, weight: 3 },
      { value: item.full, weight: 2 },
    ]);
    if (score > 0) {
      results.abbreviations.push({
        label: item.abbr,
        kind: "Abbreviation",
        tag: item.full,
        score,
        nav: ["library", { type: "abbreviations" }],
      });
    }
  });

  (quickRefs || []).forEach((ref) => {
    const score = scoreItem(q, [
      { value: ref.title, weight: 3 },
      { value: ref.desc, weight: 1.5 },
      { value: ref.type, weight: 1 },
    ]);
    if (score > 0) {
      results.quickRefs.push({
        label: ref.title,
        kind: "Quick ref",
        tag: ref.type === "atlas" ? "Atlas" : ref.type === "calculator" ? "Calculator" : "Reference",
        score,
        nav: ["library", { type: "refDetail", id: ref.id }],
      });
    }
  });

  return sortResults(results);
}
