import { WEEKLY, STUDY_SHEETS, CURRICULUM_DECKS } from "../../../data/constants";
import { WEEKLY_CASES } from "../../../data/cases";
import type { AdminStudent } from "../../../types";
import type { ArticlesData } from "../types";
import { isWithinHours } from "./format";

export type ExposureCurriculumGapTopic = {
  label: string;
  serviceCount: number;
  studyCount: number;
  serviceLearners: string[];
  studyLearners: string[];
  overlapLearners: string[];
};

export type ExposureCurriculumGap = {
  seeingButNotStudying: ExposureCurriculumGapTopic[];
  studyingButNotSeeing: ExposureCurriculumGapTopic[];
  aligned: ExposureCurriculumGapTopic[];
};

export const CASE_META_BY_ID = new Map<string, { title: string; week: number; topics: string[] }>(
  Object.entries(WEEKLY_CASES).flatMap(([week, cases]) =>
    (cases || []).map((item) => [item.id, { title: item.title, week: Number(week), topics: item.topics || [] }] as const)
  )
);
export const STUDY_SHEET_META_BY_ID = new Map<string, { title: string; week: number; topics: string[] }>(
  Object.entries(STUDY_SHEETS).flatMap(([week, sheets]) =>
    (sheets || []).map((sheet) => [sheet.id, { title: sheet.title, week: Number(week), topics: sheet.topics || [] }] as const)
  )
);
export const DECK_META_BY_ID = new Map<string, { title: string; week: number; topics: string[] }>(
  CURRICULUM_DECKS.map((deck) => [deck.id, { title: deck.name, week: deck.week, topics: deck.topics || [] }] as const)
);

export function normalizeTopicLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export const TEACHING_TOPIC_META = [
  {
    label: "Foundations",
    aliases: ["foundations", "aki foundations", "aki & foundations", ...WEEKLY[1].topics],
    weeks: [1],
    steps: [
      "Start with the classification frame: what syndrome is this and what is the first fork in the road?",
      "Walk through the first diagnostic move you expect on rounds and what finding would change management.",
      "Finish with one escalation trigger or common pitfall students should remember tomorrow morning.",
    ],
  },
  {
    label: "Electrolytes",
    aliases: ["electrolytes", "electrolytes acid base", "electrolytes & acid-base", ...WEEKLY[2].topics],
    weeks: [2],
    steps: [
      "Open with volume and osmolality: what bucket is this patient in before anyone reaches for treatment?",
      "Teach the first-line correction strategy and the one number students must keep rechecking.",
      "Close with a safety pearl on rate limits, telemetry, or when to call for urgent dialysis support.",
    ],
  },
  {
    label: "Glomerular / CKD",
    aliases: ["glomerular ckd", "glomerular / ckd", "glomerular", "ckd", ...WEEKLY[3].topics],
    weeks: [3],
    steps: [
      "Differentiate the core syndrome first: nephritic, nephrotic, progressive CKD, or proteinuria-first disease.",
      "Name the next highest-yield diagnostic test, serology, or biopsy question that clarifies the case.",
      "End with the disease-modifying treatment or follow-up plan you expect the student to propose.",
    ],
  },
  {
    label: "Therapeutics",
    aliases: ["therapeutics", "therapeutics integration", "therapeutics & integration", ...WEEKLY[4].topics],
    weeks: [4],
    steps: [
      "Start with the decision point: what therapy, modality, or access choice is being made here?",
      "Teach the key indication, contraindication, or complication that changes the plan.",
      "Finish with one practical management pearl students can use on consults or discharge planning.",
    ],
  },
  {
    label: "AKI",
    aliases: ["aki", "post renal aki", "contrast associated aki", "hepatorenal syndrome", "rhabdomyolysis"],
    weeks: [1],
    steps: [
      "Define the AKI phenotype and what history or urine data splits the differential fastest.",
      "State the immediate management move before the full workup comes back.",
      "Name the AEIOU-style or consult-level trigger that should change the urgency.",
    ],
  },
  {
    label: "CKD",
    aliases: ["ckd", "diabetic kidney disease", "sglt2 inhibitors", "anemia of ckd", "hypertension"],
    weeks: [3],
    steps: [
      "Frame the patient by CKD stage, albuminuria, and progression risk rather than just the creatinine.",
      "Teach the next disease-modifying medication or lab target you want them to remember.",
      "Close with what follow-up or complication surveillance should happen next.",
    ],
  },
  {
    label: "Dialysis",
    aliases: ["dialysis", "dialysis access", "peritoneal dialysis", "diuretics"],
    weeks: [4],
    steps: [
      "Clarify whether the issue is an indication for dialysis, a modality choice, or access troubleshooting.",
      "Teach the first operational decision you want students to make confidently.",
      "End with one complication or counseling pearl they should carry onto rounds.",
    ],
  },
  {
    label: "Glomerular",
    aliases: ["glomerulonephritis", "nephrotic syndrome", "kidney biopsy", "proteinuria", "apol1 associated kidney disease"],
    weeks: [3],
    steps: [
      "Open by separating inflammatory GN from proteinuric or chronic glomerular disease.",
      "Teach the one serology or biopsy clue that changes the whole differential.",
      "Finish with the urgent treatment or referral threshold students should not miss.",
    ],
  },
  {
    label: "Transplant",
    aliases: ["transplant"],
    weeks: [4],
    steps: [
      "Frame the issue as infection, rejection, drug toxicity, or chronic allograft management.",
      "Teach the highest-yield monitoring or medication principle for the inpatient team.",
      "Close with one transplant-specific pitfall worth checking the next day.",
    ],
  },
];

export function findTeachingTopicMeta(topic: string) {
  const normalized = normalizeTopicLabel(topic);
  return TEACHING_TOPIC_META.find((entry) =>
    entry.aliases.some((alias) => normalizeTopicLabel(alias) === normalized)
  ) || TEACHING_TOPIC_META.find((entry) =>
    entry.aliases.some((alias) => {
      const normalizedAlias = normalizeTopicLabel(alias);
      return normalized === normalizedAlias || normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized);
    })
  );
}

export function topicMatchesAny(topic: string, candidates: string[]): boolean {
  const normalized = normalizeTopicLabel(topic);
  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeTopicLabel(candidate);
    return normalized === normalizedCandidate || normalized.includes(normalizedCandidate) || normalizedCandidate.includes(normalized);
  });
}

export function canonicalizeTopicLabel(topic: string): string {
  const normalized = topic.trim();
  if (!normalized) return "";
  return findTeachingTopicMeta(normalized)?.label || normalized;
}

export function getStudentExposureTopics(student: AdminStudent): string[] {
  const activePatients = (student.patients || []).filter((patient) => patient.status === "active");
  const candidatePatients = activePatients.length > 0
    ? activePatients
    : (student.patients || []).filter((patient) => isWithinHours(patient.date, 96));
  const topics = new Set<string>();
  candidatePatients.forEach((patient) => {
    const patientTopics = patient.topics?.length ? patient.topics : patient.topic ? [patient.topic] : [];
    patientTopics.forEach((topic) => {
      const canonical = canonicalizeTopicLabel(topic);
      if (canonical) topics.add(canonical);
    });
  });
  return Array.from(topics);
}

export function getStudentStudiedTopics(student: AdminStudent, articlesByWeek: ArticlesData): string[] {
  const articleTopicByUrl = new Map<string, string>(
    Object.values(articlesByWeek).flatMap((items) =>
      (items || []).map((article) => [article.url, article.topic] as const)
    )
  );
  const articleTopicByTitle = new Map<string, string>(
    Object.values(articlesByWeek).flatMap((items) =>
      (items || []).map((article) => [article.title, article.topic] as const)
    )
  );
  const studySheetTopicsByTitle = new Map<string, string[]>(
    Array.from(STUDY_SHEET_META_BY_ID.values()).map((sheet) => [sheet.title, sheet.topics] as const)
  );
  const topics = new Set<string>();
  const addTopic = (topic: string | null | undefined) => {
    if (!topic) return;
    const canonical = canonicalizeTopicLabel(topic);
    if (canonical) topics.add(canonical);
  };

  Object.entries(student.weeklyScores || {}).forEach(([weekKey, attempts]) => {
    if ((attempts || []).length === 0) return;
    const week = Number(weekKey);
    (WEEKLY[week as keyof typeof WEEKLY]?.topics || []).forEach((topic) => addTopic(topic));
  });

  Object.keys(student.completedItems?.articles || {}).forEach((url) => {
    addTopic(articleTopicByUrl.get(url));
  });

  Object.keys(student.completedItems?.studySheets || {}).forEach((id) => {
    (STUDY_SHEET_META_BY_ID.get(id)?.topics || []).forEach((topic) => addTopic(topic));
  });

  Object.keys(student.completedItems?.decks || {}).forEach((id) => {
    (DECK_META_BY_ID.get(id)?.topics || []).forEach((topic) => addTopic(topic));
  });

  Object.keys(student.completedItems?.cases || {}).forEach((caseId) => {
    (CASE_META_BY_ID.get(caseId)?.topics || []).forEach((topic) => addTopic(topic));
  });

  (student.activityLog || [])
    .filter((entry) => entry.type === "article" || entry.type === "study_sheet" || entry.type === "deck")
    .forEach((entry) => {
      if (entry.type === "article") {
        addTopic(articleTopicByTitle.get(entry.detail || entry.label) || entry.detail || entry.label);
        return;
      }
      if (entry.type === "deck") {
        const deck = Array.from(DECK_META_BY_ID.values()).find((item) => item.title === (entry.detail || entry.label));
        (deck?.topics || []).forEach((topic) => addTopic(topic));
        return;
      }
      (studySheetTopicsByTitle.get(entry.detail || entry.label) || []).forEach((topic) => addTopic(topic));
    });

  return Array.from(topics);
}

export function buildExposureCurriculumGap(students: AdminStudent[], articlesByWeek: ArticlesData): ExposureCurriculumGap {
  const topicMap = new Map<string, {
    label: string;
    serviceLearners: Set<string>;
    studyLearners: Set<string>;
  }>();

  const ensureTopic = (label: string) => {
    if (!topicMap.has(label)) {
      topicMap.set(label, {
        label,
        serviceLearners: new Set<string>(),
        studyLearners: new Set<string>(),
      });
    }
    return topicMap.get(label)!;
  };

  students.forEach((student) => {
    const name = student.name;
    getStudentExposureTopics(student).forEach((topic) => {
      ensureTopic(topic).serviceLearners.add(name);
    });
    getStudentStudiedTopics(student, articlesByWeek).forEach((topic) => {
      ensureTopic(topic).studyLearners.add(name);
    });
  });

  const topics = Array.from(topicMap.values()).map((entry) => {
    const serviceLearners = Array.from(entry.serviceLearners).sort((a, b) => a.localeCompare(b));
    const studyLearners = Array.from(entry.studyLearners).sort((a, b) => a.localeCompare(b));
    const overlapLearners = serviceLearners.filter((name) => entry.studyLearners.has(name));
    return {
      label: entry.label,
      serviceCount: serviceLearners.length,
      studyCount: studyLearners.length,
      serviceLearners,
      studyLearners,
      overlapLearners,
    };
  });

  return {
    seeingButNotStudying: topics
      .filter((topic) => topic.serviceCount > topic.studyCount)
      .sort((a, b) => (b.serviceCount - b.studyCount) - (a.serviceCount - a.studyCount) || b.serviceCount - a.serviceCount || a.label.localeCompare(b.label))
      .slice(0, 4),
    studyingButNotSeeing: topics
      .filter((topic) => topic.studyCount > topic.serviceCount)
      .sort((a, b) => (b.studyCount - b.serviceCount) - (a.studyCount - a.serviceCount) || b.studyCount - a.studyCount || a.label.localeCompare(b.label))
      .slice(0, 4),
    aligned: topics
      .filter((topic) => topic.serviceCount > 0 && topic.studyCount > 0 && topic.serviceCount === topic.studyCount)
      .sort((a, b) => Math.min(b.serviceCount, b.studyCount) - Math.min(a.serviceCount, a.studyCount) || b.serviceCount - a.serviceCount || a.label.localeCompare(b.label))
      .slice(0, 4),
  };
}
