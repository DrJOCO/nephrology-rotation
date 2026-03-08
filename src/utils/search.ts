// ═══════════════════════════════════════════════════════════════════════
//  Search Engine — relevance-scored, multi-word, fuzzy search
//
//  Scoring:
//    Exact match (full query)     → +100
//    Word-boundary match          → +40 per word
//    Substring match              → +15 per word
//    Fuzzy match (1-edit typo)    → +8 per word
//    Field weight multiplier      → title=3x, name=3x, category=2x, other=1x
// ═══════════════════════════════════════════════════════════════════════

export interface SearchField {
  value: string;
  weight: number;
}

export interface SearchResultItem {
  label: string;
  sub: string;
  icon: string;
  score: number;
  nav: [string, Record<string, unknown>];
}

export interface SearchResults {
  trials: SearchResultItem[];
  articles: SearchResultItem[];
  cases: SearchResultItem[];
  studySheets: SearchResultItem[];
  abbreviations: SearchResultItem[];
  quickRefs: SearchResultItem[];
}

/**
 * Compute Levenshtein edit distance between two strings (for typo tolerance)
 * Limited to short strings for performance
 */
function editDistance(a: string, b: string): number {
  if (a.length > 20 || b.length > 20) return Infinity;
  const m = a.length, n = b.length;
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

  // Exact full-field match (query = field)
  if (field === word) return 120;

  // Starts with the word (strong signal)
  if (field.startsWith(word)) return 60;

  // Word-boundary match (word appears after space, hyphen, etc.)
  const wordBoundary = new RegExp(`(?:^|[\\s\\-/,.(])${escapeRegex(word)}`);
  if (wordBoundary.test(field)) return 40;

  // Substring match anywhere
  if (field.includes(word)) return 15;

  // Fuzzy match — only for words 4+ chars (avoids noisy short matches)
  if (word.length >= 4) {
    // Check each word in the field for edit distance ≤ 1
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

  // Bonus for matching ALL words (multi-word queries)
  if (words.length > 1 && matchedWords === words.length) {
    totalScore *= 1.5;
  }

  // Penalty if not all words matched
  if (matchedWords < words.length) {
    totalScore *= (matchedWords / words.length) * 0.5;
  }

  // Check for exact full-query match in any field (huge bonus)
  for (const { value, weight } of fields) {
    const fieldLower = (value || "").toLowerCase();
    if (fieldLower.includes(query)) {
      totalScore += 100 * weight;
    }
  }

  return Math.round(totalScore);
}

/**
 * Search and rank all content items
 * @param {string} query - raw search input
 * @param {Object} dataSources - { trials, articles, cases, studySheets, abbreviations, quickRefs }
 * @returns {{ trials: [], articles: [], cases: [], studySheets: [], abbreviations: [], quickRefs: [] }}
 */
export function searchAll(query: string, { trials, articlesByWeek, cases, studySheets, abbreviations, quickRefs }: Record<string, any>): SearchResults | null {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return null;

  const results: SearchResults = {
    trials: [],
    articles: [],
    cases: [],
    studySheets: [],
    abbreviations: [],
    quickRefs: [],
  };

  // Trials
  (trials || []).forEach(t => {
    const score = scoreItem(q, [
      { value: t.name, weight: 3 },
      { value: t.full_title, weight: 2 },
      { value: t.category, weight: 2 },
      { value: t.takeaway, weight: 1 },
      { value: t.significance, weight: 0.5 },
    ]);
    if (score > 0) {
      results.trials.push({ label: t.name, sub: t.category, icon: "\uD83D\uDCCB", score, nav: ["guide", { type: "trialLibrary" }] });
    }
  });

  // Articles
  [1, 2, 3, 4].forEach(w => {
    ((articlesByWeek || {})[w] || []).forEach(a => {
      const score = scoreItem(q, [
        { value: a.title, weight: 3 },
        { value: a.journal, weight: 1.5 },
        { value: a.topic, weight: 2 },
        { value: a.type, weight: 1 },
      ]);
      if (score > 0) {
        results.articles.push({ label: a.title, sub: `Week ${w} \u2022 ${a.type || "Article"}`, icon: "\uD83D\uDCF0", score, nav: ["home", { type: "articles", week: w }] });
      }
    });
  });

  // Cases
  [1, 2, 3, 4].forEach(w => {
    ((cases || {})[w] || []).forEach(c => {
      const score = scoreItem(q, [
        { value: c.title, weight: 3 },
        { value: c.category, weight: 2 },
        { value: c.difficulty, weight: 0.5 },
        { value: c.scenario, weight: 0.5 },
      ]);
      if (score > 0) {
        results.cases.push({ label: c.title, sub: `Week ${w} \u2022 ${c.difficulty}`, icon: "\uD83C\uDFE5", score, nav: ["home", { type: "cases", week: w }] });
      }
    });
  });

  // Study Sheets
  [1, 2, 3, 4].forEach(w => {
    ((studySheets || {})[w] || []).forEach(s => {
      const sectionText = (s.sections || []).map(sec => sec.heading).join(" ");
      const itemText = (s.sections || []).flatMap(sec => sec.items || []).join(" ");
      const score = scoreItem(q, [
        { value: s.title, weight: 3 },
        { value: s.subtitle, weight: 2 },
        { value: sectionText, weight: 1.5 },
        { value: itemText, weight: 0.3 },
      ]);
      if (score > 0) {
        results.studySheets.push({ label: s.title, sub: `Week ${w}`, icon: "\uD83D\uDCDD", score, nav: ["home", { type: "studySheets", week: w }] });
      }
    });
  });

  // Abbreviations
  (abbreviations || []).forEach(a => {
    const score = scoreItem(q, [
      { value: a.abbr, weight: 3 },
      { value: a.full, weight: 2 },
    ]);
    if (score > 0) {
      results.abbreviations.push({ label: a.abbr, sub: a.full, icon: "\uD83D\uDD24", score, nav: ["home", { type: "abbreviations" }] });
    }
  });

  // Quick References
  (quickRefs || []).forEach(r => {
    const score = scoreItem(q, [
      { value: r.title, weight: 3 },
      { value: r.desc, weight: 1.5 },
    ]);
    if (score > 0) {
      results.quickRefs.push({ label: r.title, sub: r.desc, icon: r.icon || "\u26A1", score, nav: ["refs", { type: "refDetail", id: r.id }] });
    }
  });

  // Sort each category by score (highest first)
  for (const key of Object.keys(results)) {
    results[key].sort((a, b) => b.score - a.score);
  }

  return results;
}
