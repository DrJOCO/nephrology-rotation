import { TOPICS } from "../data/constants";
import { WEEKLY_QUIZZES } from "../data/quizzes";
import type { ReflectionEntry, SrItem, SrQueue } from "../types";
import { getTopicContent } from "./topicMapping";

const REFLECTION_TOPIC_ALIASES: Record<string, string[]> = {
  "AKI": ["aki", "acute kidney injury"],
  "Post-Renal AKI": ["post renal", "post-renal", "obstruction", "obstructive uropathy"],
  "CKD": ["ckd", "chronic kidney disease"],
  "Anemia of CKD": ["anemia of ckd", "ckd anemia", "esa", "epo"],
  "CKD-MBD": ["ckd-mbd", "renal bone disease", "secondary hyperparathyroidism"],
  "Hyponatremia": ["hyponatremia", "low sodium"],
  "Hypernatremia": ["hypernatremia", "high sodium"],
  "Hyperkalemia": ["hyperkalemia", "high potassium"],
  "Hypokalemia": ["hypokalemia", "low potassium"],
  "Acid-Base": ["acid base", "acid-base", "acidosis", "alkalosis", "anion gap"],
  "Glomerulonephritis": ["glomerulonephritis", "gn", "crescentic"],
  "Nephrotic Syndrome": ["nephrotic", "nephrotic syndrome"],
  "Kidney Biopsy": ["kidney biopsy", "renal biopsy"],
  "Dialysis": ["dialysis", "hemodialysis", "hd", "crrt"],
  "Dialysis Access": ["dialysis access", "fistula", "graft", "tunneled catheter"],
  "Transplant": ["transplant", "kidney transplant", "allograft"],
  "Kidney Stones": ["kidney stones", "stone", "stones", "nephrolithiasis"],
  "AIN": ["ain", "acute interstitial nephritis", "interstitial nephritis"],
  "Urinalysis": ["urinalysis", "urine sediment", "ua"],
  "Hypertension": ["hypertension", "htn", "blood pressure"],
  "Diuretics": ["diuretics", "lasix", "furosemide", "bumetanide", "torsemide"],
  "Fluid Management": ["fluid management", "volume status", "iv fluids", "resuscitation"],
  "Calcium/Phosphorus": ["calcium", "phosphorus", "phosphate", "hyperphosphatemia"],
  "Proteinuria": ["proteinuria", "albuminuria"],
  "Polycystic Kidney Disease": ["polycystic kidney disease", "pkd", "adpkd"],
  "APOL1-Associated Kidney Disease": ["apol1"],
  "Hepatorenal Syndrome": ["hepatorenal", "hrs"],
  "Contrast-Associated AKI": ["contrast aki", "contrast-associated aki", "contrast nephropathy"],
  "Rhabdomyolysis": ["rhabdo", "rhabdomyolysis"],
  "Cardiorenal Syndrome": ["cardiorenal", "cardiorenal syndrome"],
  "Diabetic Kidney Disease": ["diabetic kidney disease", "dkd", "diabetic nephropathy"],
  "SGLT2 Inhibitors": ["sglt2", "sglt2i", "dapagliflozin", "empagliflozin", "canagliflozin"],
  "Peritoneal Dialysis": ["peritoneal dialysis", "pd", "pd peritonitis", "capd", "apd"],
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toAliasPatterns(topic: string): RegExp[] {
  const aliases = REFLECTION_TOPIC_ALIASES[topic] || [];
  return Array.from(new Set([topic.toLowerCase(), ...aliases.map((alias) => alias.toLowerCase())])).map((alias) => (
    new RegExp(`\\b${escapeRegExp(alias).replace(/\\ /g, "\\s+")}\\b`, "i")
  ));
}

const TOPIC_PATTERNS = TOPICS.map((topic) => ({
  topic,
  patterns: toAliasPatterns(topic),
}));

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function extractReflectionTopics(...parts: string[]): string[] {
  const text = parts.join(" ").trim();
  if (!text) return [];
  return TOPIC_PATTERNS
    .filter(({ patterns }) => patterns.some((pattern) => pattern.test(text)))
    .map(({ topic }) => topic);
}

function findQuestionKeyForTopic(topic: string, used: Set<string>): string | null {
  const quizWeeks = getTopicContent(topic).quizWeeks;

  for (const week of quizWeeks) {
    const questions = WEEKLY_QUIZZES[week] || [];
    const exactIndex = questions.findIndex((question) => question.topic === topic);
    if (exactIndex >= 0) {
      const key = `weekly_${week}_${exactIndex}`;
      if (!used.has(key)) return key;
    }

    const partialIndex = questions.findIndex((question) => {
      if (!question.topic) return false;
      return question.topic.includes(topic) || topic.includes(question.topic);
    });
    if (partialIndex >= 0) {
      const key = `weekly_${week}_${partialIndex}`;
      if (!used.has(key)) return key;
    }

    if (questions.length > 0) {
      const fallbackKey = `weekly_${week}_0`;
      if (!used.has(fallbackKey)) return fallbackKey;
    }
  }

  return null;
}

function buildSeededQuestionKeys(topics: string[], fallbackWeek: number, srQueue: SrQueue): string[] {
  const used = new Set(Object.keys(srQueue || {}));
  const selected: string[] = [];

  for (const topic of topics) {
    const questionKey = findQuestionKeyForTopic(topic, used);
    if (!questionKey) continue;
    selected.push(questionKey);
    used.add(questionKey);
    if (selected.length >= 2) return selected;
  }

  const fallbackQuestions = WEEKLY_QUIZZES[fallbackWeek] || [];
  for (let index = 0; index < fallbackQuestions.length && selected.length < 2; index += 1) {
    const questionKey = `weekly_${fallbackWeek}_${index}`;
    if (used.has(questionKey)) continue;
    selected.push(questionKey);
    used.add(questionKey);
  }

  return selected;
}

export function buildReflectionEntry({
  saw,
  unclear,
  fallbackWeek,
  srQueue,
  submittedAt = new Date(),
}: {
  saw: string;
  unclear: string;
  fallbackWeek: number;
  srQueue: SrQueue;
  submittedAt?: Date;
}): ReflectionEntry {
  const normalizedSaw = saw.trim();
  const normalizedUnclear = unclear.trim();
  const topics = extractReflectionTopics(normalizedUnclear, normalizedSaw).slice(0, 3);
  const seededQuestionKeys = buildSeededQuestionKeys(topics, fallbackWeek, srQueue);

  return {
    id: `reflection_${submittedAt.getTime()}_${Math.floor(Math.random() * 1000)}`,
    dayKey: toLocalDateKey(submittedAt),
    submittedAt: submittedAt.toISOString(),
    saw: normalizedSaw,
    unclear: normalizedUnclear,
    topics,
    seededQuestionKeys,
  };
}

export function addReflectionItemsToSrQueue(srQueue: SrQueue, questionKeys: string[], submittedAt = new Date()): SrQueue {
  if (!questionKeys.length) return srQueue;

  const next = { ...srQueue };
  const nextReviewDate = new Date(submittedAt);
  nextReviewDate.setDate(nextReviewDate.getDate() + 1);
  const reviewDate = toDateOnly(nextReviewDate);
  const addedDate = toDateOnly(submittedAt);

  questionKeys.forEach((questionKey) => {
    if (next[questionKey]) return;
    const item: SrItem = {
      questionKey,
      easeFactor: 2.5,
      interval: 1,
      nextReviewDate: reviewDate,
      repetitions: 0,
      lastReviewed: addedDate,
      addedDate,
    };
    next[questionKey] = item;
  });

  return next;
}

export function buildReflectionActivityDetail(entry: ReflectionEntry): string {
  if (entry.topics.length > 0) {
    return `Focus: ${entry.topics.join(", ")}`;
  }

  const source = entry.unclear || entry.saw;
  if (!source) return "Submitted a daily learning reflection";
  return source.length > 80 ? `${source.slice(0, 77)}...` : source;
}
