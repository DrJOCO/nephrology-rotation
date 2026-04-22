import { ARTICLES, STUDY_SHEETS } from "../data/constants";
import { WEEKLY_CASES } from "../data/cases";
import { PRE_QUIZ, POST_QUIZ, getQuestionByKey } from "../data/quizzes";
import type { CompletedItems, QuizQuestion, QuizScore, SrQueue, SubView, WeeklyScores } from "../types";

export type CompetencyDomain = "AKI" | "CKD" | "Dialysis" | "Electrolytes" | "Transplant" | "Glomerular";
export type CompetencyTier = "Novice" | "Developing" | "Proficient";

export interface CompetencyAction {
  label: string;
  detail: string;
  tab: string;
  subView?: SubView;
}

export interface CompetencyDomainSummary {
  domain: CompetencyDomain;
  label: string;
  description: string;
  tier: CompetencyTier;
  progress: number;
  progressLabel: string;
  weeks: number[];
  signals: {
    srIntervalDays: number;
    dueCards: number;
    totalCards: number;
    casesLogged: number;
    caseTarget: number;
    quizAccuracy: number | null;
    quizSampleSize: number;
    referencesReviewed: number;
    referenceCount: number;
  };
  action: CompetencyAction;
}

export interface CompetencyObjective {
  label: string;
  met: boolean;
  detail: string;
}

export interface CompetencySummary {
  masteryPercent: number;
  masteryLabel: string;
  masteryDetail: string;
  objectivesMet: number;
  objectivesTotal: number;
  objectives: CompetencyObjective[];
  domains: CompetencyDomainSummary[];
  topDomain: CompetencyDomainSummary;
  proficientCount: number;
  developingCount: number;
  profileLine: string;
}

interface CompetencyInput {
  weeklyScores: WeeklyScores;
  preScore: QuizScore | null;
  postScore: QuizScore | null;
  completedItems?: CompletedItems;
  srQueue?: SrQueue;
  currentWeek?: number | null;
  totalWeeks?: number;
  articlesByWeek?: typeof ARTICLES;
}

interface DomainDefinition {
  label: string;
  description: string;
  weeks: number[];
  topics: string[];
}

interface IndexedArticle {
  week: number;
  url: string;
  title: string;
  domain: CompetencyDomain;
}

interface IndexedCase {
  week: number;
  id: string;
  title: string;
  domains: CompetencyDomain[];
}

const DOMAIN_DEFINITIONS: Record<CompetencyDomain, DomainDefinition> = {
  AKI: {
    label: "AKI",
    description: "Evaluation, urine studies, consult triage, and acute injury management.",
    weeks: [1],
    topics: [
      "AKI",
      "Post-Renal AKI",
      "Urinalysis",
      "Hepatorenal Syndrome",
      "Contrast-Associated AKI",
      "Rhabdomyolysis",
      "Nephron Physiology",
      "GFR Assessment",
    ],
  },
  CKD: {
    label: "CKD",
    description: "Longitudinal CKD care, renoprotection, BP, and disease progression.",
    weeks: [3],
    topics: [
      "CKD",
      "Anemia of CKD",
      "CKD-MBD",
      "Hypertension",
      "Polycystic Kidney Disease",
      "Diabetic Kidney Disease",
      "SGLT2 Inhibitors",
      "Cardiorenal Syndrome",
    ],
  },
  Dialysis: {
    label: "Dialysis",
    description: "RRT indications, access, diuretics, toxic exposures, and modality decisions.",
    weeks: [4],
    topics: [
      "Dialysis",
      "Dialysis Access",
      "Peritoneal Dialysis",
      "Diuretics",
      "Kidney Stones",
      "AIN",
      "Nephrotoxins",
    ],
  },
  Electrolytes: {
    label: "Electrolytes",
    description: "Sodium, potassium, acid-base, calcium-phosphorus, and fluid balance.",
    weeks: [2],
    topics: [
      "Hyponatremia",
      "Hypernatremia",
      "Hyperkalemia",
      "Hypokalemia",
      "Acid-Base",
      "Calcium/Phosphorus",
      "Fluid Management",
      "CKD-MBD",
    ],
  },
  Transplant: {
    label: "Transplant",
    description: "Allograft care, immunosuppression, rejection, and transplant complications.",
    weeks: [4],
    topics: ["Transplant"],
  },
  Glomerular: {
    label: "Glomerular",
    description: "Proteinuria, GN, nephrotic disease, biopsy, and immune kidney disease.",
    weeks: [3],
    topics: [
      "Glomerulonephritis",
      "Nephrotic Syndrome",
      "Kidney Biopsy",
      "Proteinuria",
      "APOL1-Associated Kidney Disease",
    ],
  },
};

const DOMAIN_ORDER: CompetencyDomain[] = ["AKI", "CKD", "Dialysis", "Electrolytes", "Transplant", "Glomerular"];
const TIER_RANK: Record<CompetencyTier, number> = { Novice: 0, Developing: 1, Proficient: 2 };
const FALLBACK_WEEK_DOMAIN: Record<number, CompetencyDomain> = { 1: "AKI", 2: "Electrolytes", 3: "Glomerular", 4: "Dialysis" };
const TODAY_KEY = new Date().toISOString().slice(0, 10);

const DOMAIN_BY_TOPIC = DOMAIN_ORDER.reduce<Record<string, CompetencyDomain>>((acc, domain) => {
  DOMAIN_DEFINITIONS[domain].topics.forEach((topic) => {
    acc[topic] = domain;
  });
  return acc;
}, {});

function uniqueDomains(domains: Array<CompetencyDomain | null | undefined>): CompetencyDomain[] {
  return Array.from(new Set(domains.filter(Boolean))) as CompetencyDomain[];
}

function mapTopicToDomain(topic?: string | null): CompetencyDomain | null {
  if (!topic) return null;
  return DOMAIN_BY_TOPIC[topic] || null;
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function inferQuestionDomain(question: QuizQuestion | null, fallbackWeek: number): CompetencyDomain {
  const explicit = mapTopicToDomain(question?.topic);
  if (explicit) return explicit;

  const text = `${question?.q || ""} ${question?.explanation || ""}`.toLowerCase();

  if (includesAny(text, ["transplant", "allograft", "tacrolimus", "cyclosporine", "calcineurin", "bk viremia", "bk virus", "rejection", "immunosuppression"])) {
    return "Transplant";
  }
  if (includesAny(text, ["dialysis", "hemodialysis", "peritoneal", "pd ", "aeiou", "ultrafiltration", "av fistula", "access", "metolazone", "loop diuretic", "thiazide", "stone", "acyclovir", "interstitial nephritis", "ain", "nephrotoxic"])) {
    return "Dialysis";
  }
  if (includesAny(text, ["glomer", "iga", "nephrot", "proteinuria", "biopsy", "pla2r", "fsgs", "minimal change", "membran", "lupus", "post-infectious", "wire loop"])) {
    return "Glomerular";
  }
  if (includesAny(text, ["ckd", "egfr", "albuminuria", "sglt2", "diabetic kidney", "dkd", "retinopathy", "acei", "arb", "hypertension", "anemia of ckd", "polycystic", "apol1"])) {
    return "CKD";
  }
  if (includesAny(text, ["hyponat", "hypernat", "hyperkal", "hypokal", "potassium", "sodium", "acid-base", "anion gap", "siadh", "osm", "bicarbonate", "calcium", "phosph", "saline", "ringer", "cardiorenal", "fluid"])) {
    return "Electrolytes";
  }
  if (includesAny(text, ["aki", "atn", "pre-renal", "fena", "feurea", "muddy brown", "rbc cast", "urinalysis", "cystatin", "contrast", "hepatorenal", "rhabdo", "nephron", "gfr"])) {
    return "AKI";
  }

  return FALLBACK_WEEK_DOMAIN[fallbackWeek] || "AKI";
}

function caseDomains(topics: string[] | undefined, week: number): CompetencyDomain[] {
  if (!topics || topics.length === 0) return [FALLBACK_WEEK_DOMAIN[week] || "AKI"];
  const mapped = uniqueDomains(topics.map((topic) => mapTopicToDomain(topic)));
  return mapped.length > 0 ? mapped : [FALLBACK_WEEK_DOMAIN[week] || "AKI"];
}

const INDEXED_CASES: IndexedCase[] = [];
const CASES_BY_DOMAIN: Record<CompetencyDomain, IndexedCase[]> = {
  AKI: [],
  CKD: [],
  Dialysis: [],
  Electrolytes: [],
  Transplant: [],
  Glomerular: [],
};

for (const week of [1, 2, 3, 4]) {
  for (const item of WEEKLY_CASES[week] || []) {
    const domains = caseDomains(item.topics, week);
    const indexed = { week, id: item.id, title: item.title, domains };
    INDEXED_CASES.push(indexed);
    domains.forEach((domain) => CASES_BY_DOMAIN[domain].push(indexed));
  }
}

function buildQuestionEvents(
  weeklyScores: WeeklyScores,
  preScore: QuizScore | null,
  postScore: QuizScore | null,
): Record<CompetencyDomain, Array<{ correct: boolean; date: string }>> {
  const events: Record<CompetencyDomain, Array<{ correct: boolean; date: string }>> = {
    AKI: [],
    CKD: [],
    Dialysis: [],
    Electrolytes: [],
    Transplant: [],
    Glomerular: [],
  };

  Object.entries(weeklyScores || {}).forEach(([weekStr, attempts]) => {
    const week = Number(weekStr);
    (attempts || []).forEach((attempt) => {
      (attempt.answers || []).forEach((answer) => {
        const question = getQuestionByKey(`weekly_${week}_${answer.qIdx}`);
        const domain = inferQuestionDomain(question, week);
        events[domain].push({ correct: answer.correct, date: attempt.date || "" });
      });
    });
  });

  if (preScore) {
    (preScore.answers || []).forEach((answer) => {
      const question = PRE_QUIZ[answer.qIdx] || null;
      const domain = inferQuestionDomain(question, 0);
      events[domain].push({ correct: answer.correct, date: preScore.date || "" });
    });
  }

  if (postScore) {
    (postScore.answers || []).forEach((answer) => {
      const question = POST_QUIZ[answer.qIdx] || null;
      const domain = inferQuestionDomain(question, 0);
      events[domain].push({ correct: answer.correct, date: postScore.date || "" });
    });
  }

  DOMAIN_ORDER.forEach((domain) => {
    events[domain].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  });

  return events;
}

function masteryObjectives(
  currentWeek: number | null | undefined,
  totalWeeks: number,
  weeklyScores: WeeklyScores,
  completedItems: CompletedItems,
): {
  masteryPercent: number;
  masteryLabel: string;
  masteryDetail: string;
  objectives: CompetencyObjective[];
} {
  const weeks = currentWeek
    ? [currentWeek]
    : Array.from({ length: Math.min(totalWeeks || 4, 4) }, (_, index) => index + 1);
  const label = currentWeek ? `Week ${currentWeek} objectives` : "Rotation objectives";

  const sheetTotal = weeks.reduce((sum, week) => sum + (STUDY_SHEETS[week] || []).length, 0);
  const sheetDone = weeks.reduce((sum, week) => {
    return sum + (STUDY_SHEETS[week] || []).filter((sheet) => completedItems.studySheets?.[sheet.id]).length;
  }, 0);

  const caseTotal = weeks.reduce((sum, week) => sum + (WEEKLY_CASES[week] || []).length, 0);
  const caseDone = weeks.reduce((sum, week) => {
    return sum + (WEEKLY_CASES[week] || []).filter((item) => completedItems.cases?.[item.id]).length;
  }, 0);

  const quizScores = weeks.flatMap((week) => (weeklyScores[week] || []).map((score) => Math.round((score.correct / score.total) * 100)));
  const bestQuiz = quizScores.length > 0 ? Math.max(...quizScores) : null;

  const objectives: CompetencyObjective[] = [
    { label: "Study sheets", met: sheetTotal === 0 || sheetDone === sheetTotal, detail: `${sheetDone}/${sheetTotal} complete` },
    { label: "Cases", met: caseTotal === 0 || caseDone === caseTotal, detail: `${caseDone}/${caseTotal} finished` },
    { label: "Quiz", met: bestQuiz !== null && bestQuiz >= 60, detail: bestQuiz === null ? "Not taken yet" : `Best score ${bestQuiz}%` },
  ];

  const met = objectives.filter((objective) => objective.met).length;
  return {
    masteryPercent: Math.round((met / objectives.length) * 100),
    masteryLabel: label,
    masteryDetail: `${met}/${objectives.length} objectives met`,
    objectives,
  };
}

function rankTopDomain(domains: CompetencyDomainSummary[]): CompetencyDomainSummary {
  return [...domains].sort((a, b) => {
    if (TIER_RANK[b.tier] !== TIER_RANK[a.tier]) return TIER_RANK[b.tier] - TIER_RANK[a.tier];
    if (b.progress !== a.progress) return b.progress - a.progress;
    return a.label.localeCompare(b.label);
  })[0];
}

export function buildCompetencySummary({
  weeklyScores,
  preScore,
  postScore,
  completedItems = { articles: {}, studySheets: {}, cases: {} },
  srQueue = {},
  currentWeek = null,
  totalWeeks = 4,
  articlesByWeek = ARTICLES,
}: CompetencyInput): CompetencySummary {
  const articlesByDomain: Record<CompetencyDomain, IndexedArticle[]> = {
    AKI: [],
    CKD: [],
    Dialysis: [],
    Electrolytes: [],
    Transplant: [],
    Glomerular: [],
  };
  for (const week of [1, 2, 3, 4]) {
    for (const article of articlesByWeek[week] || []) {
      const domain = mapTopicToDomain(article.topic) || FALLBACK_WEEK_DOMAIN[week];
      articlesByDomain[domain].push({ week, url: article.url, title: article.title, domain });
    }
  }

  const questionEvents = buildQuestionEvents(weeklyScores, preScore, postScore);
  const dueItems = new Set(Object.entries(srQueue)
    .filter(([, item]) => item.nextReviewDate <= TODAY_KEY)
    .map(([key]) => key));

  const domains = DOMAIN_ORDER.map<CompetencyDomainSummary>((domain) => {
    const definition = DOMAIN_DEFINITIONS[domain];
    const srItems = Object.entries(srQueue).filter(([key]) => {
      const question = getQuestionByKey(key);
      const parts = key.split("_");
      const fallbackWeek = Number(parts[1]) || definition.weeks[0];
      return inferQuestionDomain(question, fallbackWeek) === domain;
    });
    const srIntervalDays = srItems.length > 0 ? Math.max(...srItems.map(([, item]) => item.interval)) : 0;
    const dueCards = srItems.filter(([key]) => dueItems.has(key)).length;

    const readArticles = articlesByDomain[domain].filter((article) => completedItems.articles?.[article.url]);
    const solvedCases = CASES_BY_DOMAIN[domain].filter((item) => completedItems.cases?.[item.id]);
    const recentQuizWindow = questionEvents[domain].slice(0, 10);
    const quizAccuracy = recentQuizWindow.length > 0
      ? Math.round((recentQuizWindow.filter((event) => event.correct).length / recentQuizWindow.length) * 100)
      : null;

    const availableCases = CASES_BY_DOMAIN[domain].length;
    const availableArticles = articlesByDomain[domain].length;
    const developingCaseTarget = availableCases > 0 ? 1 : 0;
    const proficientCaseTarget = availableCases > 0 ? Math.min(3, availableCases) : 0;

    const developingMet = srIntervalDays >= 7
      && quizAccuracy !== null
      && quizAccuracy >= 60
      && solvedCases.length >= developingCaseTarget;
    const proficientMet = srIntervalDays >= 21
      && quizAccuracy !== null
      && quizAccuracy >= 80
      && solvedCases.length >= proficientCaseTarget;

    const tier: CompetencyTier = proficientMet ? "Proficient" : developingMet ? "Developing" : "Novice";
    const target = tier === "Novice"
      ? { sr: 7, quiz: 60, cases: developingCaseTarget }
      : tier === "Developing"
        ? { sr: 21, quiz: 80, cases: proficientCaseTarget }
        : null;

    const progress = target
      ? Math.round(([
        Math.min(srIntervalDays / target.sr, 1),
        Math.min((quizAccuracy || 0) / target.quiz, 1),
        target.cases === 0 ? 1 : Math.min(solvedCases.length / target.cases, 1),
      ].reduce((sum, value) => sum + value, 0) / 3) * 100)
      : 100;

    const progressLabel = tier === "Proficient"
      ? "All core signals are on track."
      : tier === "Developing"
        ? "One more push to reach proficient."
        : "Build the first layer of exposure and recall.";

    const nextUnreadArticle = articlesByDomain[domain].find((article) => !completedItems.articles?.[article.url]);
    const nextCase = CASES_BY_DOMAIN[domain].find((item) => !completedItems.cases?.[item.id]);
    const primaryWeek = definition.weeks[0];
    let action: CompetencyAction;

    if (dueCards > 0) {
      action = {
        label: `Review ${dueCards} ${definition.label} card${dueCards !== 1 ? "s" : ""}`,
        detail: "Spaced repetition is the fastest way to strengthen this domain right now.",
        tab: "today",
        subView: { type: "srReview" },
      };
    } else if (srItems.length > 0 && srIntervalDays < (tier === "Developing" ? 21 : 7)) {
      action = {
        label: `Keep ${definition.label} cards alive`,
        detail: `Your longest interval is ${srIntervalDays}d. Keep reviewing until it clears ${tier === "Developing" ? 21 : 7}d.`,
        tab: "today",
        subView: { type: "extraPractice" },
      };
    } else if (quizAccuracy === null || quizAccuracy < (tier === "Developing" ? 80 : 60)) {
      const attempts = weeklyScores[primaryWeek] || [];
      action = {
        label: `${attempts.length > 0 ? "Retake" : "Take"} the Week ${primaryWeek} quiz`,
        detail: quizAccuracy === null ? "You do not have a scored quiz signal here yet." : `Current quiz signal is ${quizAccuracy}%.`,
        tab: "today",
        subView: { type: "weeklyQuiz", week: primaryWeek },
      };
    } else if (nextCase) {
      action = {
        label: `Work another ${definition.label} case`,
        detail: `${nextCase.title} is still waiting in Week ${nextCase.week}.`,
        tab: "today",
        subView: { type: "cases", week: nextCase.week },
      };
    } else if (nextUnreadArticle) {
      action = {
        label: `Browse an optional ${definition.label} reference`,
        detail: `${nextUnreadArticle.title} is available in Week ${nextUnreadArticle.week} for deeper reading.`,
        tab: "today",
        subView: { type: "articles", week: nextUnreadArticle.week },
      };
    } else {
      action = {
        label: `Browse ${definition.label} material`,
        detail: "Everything currently tracked is done. Use Library to go deeper.",
        tab: "library",
      };
    }

    return {
      domain,
      label: definition.label,
      description: definition.description,
      tier,
      progress,
      progressLabel,
      weeks: definition.weeks,
      signals: {
        srIntervalDays,
        dueCards,
        totalCards: srItems.length,
        casesLogged: solvedCases.length,
        caseTarget: proficientCaseTarget,
        quizAccuracy,
        quizSampleSize: recentQuizWindow.length,
        referencesReviewed: readArticles.length,
        referenceCount: availableArticles,
      },
      action,
    };
  });

  const topDomain = rankTopDomain(domains);
  const proficientCount = domains.filter((domain) => domain.tier === "Proficient").length;
  const developingCount = domains.filter((domain) => domain.tier === "Developing").length;
  const mastery = masteryObjectives(currentWeek, totalWeeks, weeklyScores, completedItems);

  return {
    masteryPercent: mastery.masteryPercent,
    masteryLabel: mastery.masteryLabel,
    masteryDetail: mastery.masteryDetail,
    objectivesMet: mastery.objectives.filter((objective) => objective.met).length,
    objectivesTotal: mastery.objectives.length,
    objectives: mastery.objectives,
    domains,
    topDomain,
    proficientCount,
    developingCount,
    profileLine: `${topDomain.tier === "Novice" ? "Building" : topDomain.tier} · ${topDomain.label}`,
  };
}
