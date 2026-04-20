// ═══════════════════════════════════════════════════════════════════════
//  Topic-to-Content Mapping Layer
//
//  Builds an index from nephrology topics to all associated content
//  across weeks, enabling topic-based lookup independent of week.
// ═══════════════════════════════════════════════════════════════════════

import { ARTICLES, STUDY_SHEETS, TOPIC_RESOURCE_MAP, RESOURCES, ALL_LANDMARK_TRIALS } from "../data/constants";
import { WEEKLY_CASES } from "../data/cases";
import type { TopicContentIndex } from "../types";

const RESOURCE_GROUPS = ["podcasts", "websites", "guidelines", "tools"] as const;

const RESOURCE_TAG_TOPIC_MAP: Record<string, string[]> = {
  AKI: ["AKI", "Post-Renal AKI", "AIN", "Contrast-Associated AKI", "Rhabdomyolysis"],
  Electrolytes: ["Hyponatremia", "Hypernatremia", "Hyperkalemia", "Hypokalemia", "Calcium/Phosphorus", "CKD-MBD", "Fluid Management"],
  GN: ["Glomerulonephritis", "Nephrotic Syndrome", "Proteinuria", "Kidney Biopsy", "APOL1-Associated Kidney Disease"],
  CKD: ["CKD", "Anemia of CKD", "Hypertension", "Diabetic Kidney Disease", "SGLT2 Inhibitors", "Polycystic Kidney Disease"],
  Dialysis: ["Dialysis", "Dialysis Access", "Peritoneal Dialysis"],
  "Acid-Base": ["Acid-Base", "Hypokalemia", "Hyperkalemia"],
  Medications: ["SGLT2 Inhibitors", "Diuretics", "AIN"],
  Stones: ["Kidney Stones"],
  HTN: ["Hypertension", "CKD"],
  Pathology: ["Kidney Biopsy", "Glomerulonephritis", "Nephrotic Syndrome"],
  ICU: ["AKI", "Acid-Base", "Hyponatremia", "Hypernatremia", "Hyperkalemia", "Fluid Management"],
};

const TOPIC_KEYWORDS: Record<string, string[]> = {
  AKI: ["aki", "acute kidney injury"],
  "Post-Renal AKI": ["post-renal", "obstruction"],
  CKD: ["ckd", "chronic kidney disease"],
  "Anemia of CKD": ["anemia", "iron", "epo", "esa"],
  "CKD-MBD": ["ckd-mbd", "parathyroid", "pth", "phosphate", "phosphorus"],
  Hyponatremia: ["hyponatremia"],
  Hypernatremia: ["hypernatremia"],
  Hyperkalemia: ["hyperkalemia"],
  Hypokalemia: ["hypokalemia"],
  "Acid-Base": ["acid-base", "acidosis", "alkalosis"],
  Glomerulonephritis: ["glomerulonephritis", "glomerular"],
  "Nephrotic Syndrome": ["nephrotic"],
  "Kidney Biopsy": ["biopsy", "pathology"],
  Dialysis: ["dialysis", "hemodialysis"],
  "Dialysis Access": ["dialysis access", "fistula", "graft", "catheter"],
  Transplant: ["transplant"],
  "Kidney Stones": ["stone", "stones", "nephrolithiasis"],
  AIN: ["interstitial nephritis", "drug-induced aki", "ain"],
  Urinalysis: ["urinalysis", "urine sediment"],
  Hypertension: ["hypertension", "blood pressure", "htn"],
  Diuretics: ["diuretic", "diuretics"],
  "Fluid Management": ["fluid", "volume", "decongestion"],
  "Calcium/Phosphorus": ["calcium", "phosphorus", "phosphate"],
  Proteinuria: ["proteinuria", "albuminuria"],
  "Polycystic Kidney Disease": ["polycystic", "adpkd"],
  "APOL1-Associated Kidney Disease": ["apol1"],
  "Hepatorenal Syndrome": ["hepatorenal", "hrs"],
  "Contrast-Associated AKI": ["contrast"],
  Rhabdomyolysis: ["rhabdomyolysis", "rhabdo"],
  "Cardiorenal Syndrome": ["cardiorenal", "heart failure"],
  "Diabetic Kidney Disease": ["diabetic kidney disease", "dkd", "diabetes"],
  "SGLT2 Inhibitors": ["sglt2"],
  "Peritoneal Dialysis": ["peritoneal dialysis", "pd peritonitis"],
};

function matchesResourceTopic(
  resource: { name: string; desc: string; tag: string },
  topic: string,
): boolean {
  if ((RESOURCE_TAG_TOPIC_MAP[resource.tag] || []).includes(topic)) {
    return true;
  }

  const haystack = `${resource.name} ${resource.desc} ${resource.tag}`.toLowerCase();
  return (TOPIC_KEYWORDS[topic] || []).some(keyword => haystack.includes(keyword));
}

/** Build a full content index for a single topic, scanning all weeks. */
export function getTopicContent(topic: string): TopicContentIndex {
  const result: TopicContentIndex = {
    studySheets: [],
    articles: [],
    cases: [],
    quizWeeks: [],
    trials: [],
    resources: [],
  };

  for (const weekStr of Object.keys(STUDY_SHEETS)) {
    const week = Number(weekStr);
    for (const sheet of STUDY_SHEETS[week] || []) {
      if (sheet.topics?.includes(topic)) {
        result.studySheets.push({ week, id: sheet.id });
      }
    }
  }

  for (const weekStr of Object.keys(ARTICLES)) {
    const week = Number(weekStr);
    for (const article of ARTICLES[week] || []) {
      if (article.topic === topic) {
        result.articles.push({ week, url: article.url });
      }
    }
  }

  for (const weekStr of Object.keys(WEEKLY_CASES)) {
    const week = Number(weekStr);
    for (const c of WEEKLY_CASES[week] || []) {
      if (c.topics?.includes(topic)) {
        result.cases.push({ week, id: c.id });
      }
    }
  }

  // Quiz weeks from the static resource map (covers topics without explicit content tags)
  const resourceEntry = TOPIC_RESOURCE_MAP[topic];
  if (resourceEntry) {
    result.quizWeeks = [...resourceEntry.quizWeeks];
  }

  const seenTrials = new Set<string>();
  for (const weekStr of Object.keys(STUDY_SHEETS)) {
    const week = Number(weekStr);
    for (const sheet of STUDY_SHEETS[week] || []) {
      if (!sheet.topics?.includes(topic)) continue;
      for (const callout of sheet.trialCallouts || []) {
        if (seenTrials.has(callout.trial)) continue;
        seenTrials.add(callout.trial);
        result.trials.push(callout.trial);
      }
    }
  }

  for (const trial of ALL_LANDMARK_TRIALS) {
    if (!trial.topics?.includes(topic) || seenTrials.has(trial.name)) continue;
    seenTrials.add(trial.name);
    result.trials.push(trial.name);
  }

  const seenResourceUrls = new Set<string>();
  for (const group of RESOURCE_GROUPS) {
    for (const resource of RESOURCES[group]) {
      if (!matchesResourceTopic(resource, topic) || seenResourceUrls.has(resource.url)) continue;
      seenResourceUrls.add(resource.url);
      result.resources.push({
        group,
        name: resource.name,
        desc: resource.desc,
        url: resource.url,
        tag: resource.tag,
      });
    }
  }

  return result;
}

/** Build content indices for multiple topics at once. */
export function getTopicContentBatch(topics: string[]): Record<string, TopicContentIndex> {
  const result: Record<string, TopicContentIndex> = {};
  for (const topic of topics) {
    result[topic] = getTopicContent(topic);
  }
  return result;
}

/** Check whether a topic has any associated content. */
export function topicHasContent(topic: string): boolean {
  const content = getTopicContent(topic);
  return (
    content.studySheets.length > 0 ||
    content.articles.length > 0 ||
    content.cases.length > 0 ||
    content.quizWeeks.length > 0 ||
    content.trials.length > 0 ||
    content.resources.length > 0
  );
}
