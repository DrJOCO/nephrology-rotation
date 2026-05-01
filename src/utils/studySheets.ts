import { STUDY_SHEETS } from "../data/constants";
import type { StudySheet, StudySheetSection } from "../types";

export type StudySheetsData = Record<number, StudySheet[]>;

function normalizeTextArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const cleaned = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned : [...fallback];
}

function normalizeSections(value: unknown, fallback: StudySheetSection[]): StudySheetSection[] {
  if (!Array.isArray(value)) return fallback.map((section) => ({ heading: section.heading, items: [...section.items] }));
  const sections = value
    .map((section, index) => {
      if (!section || typeof section !== "object") return null;
      const source = section as Partial<StudySheetSection>;
      const fallbackSection = fallback[index] || { heading: "Section", items: [] };
      const heading = typeof source.heading === "string" && source.heading.trim()
        ? source.heading.trim()
        : fallbackSection.heading;
      return {
        heading,
        items: normalizeTextArray(source.items, fallbackSection.items),
      };
    })
    .filter((section): section is StudySheetSection => Boolean(section));
  return sections.length > 0 ? sections : fallback.map((section) => ({ heading: section.heading, items: [...section.items] }));
}

export function cloneStudySheet(sheet: StudySheet): StudySheet {
  return {
    ...sheet,
    topics: [...(sheet.topics || [])],
    sections: sheet.sections.map((section) => ({ heading: section.heading, items: [...section.items] })),
    trialCallouts: (sheet.trialCallouts || []).map((callout) => ({ ...callout })),
  };
}

export function normalizeStudySheet(value: Partial<StudySheet> | undefined, fallback: StudySheet): StudySheet {
  const trialCallouts = Array.isArray(value?.trialCallouts)
    ? value.trialCallouts
        .map((callout) => ({
          trial: typeof callout?.trial === "string" ? callout.trial.trim() : "",
          pearl: typeof callout?.pearl === "string" ? callout.pearl.trim() : "",
        }))
        .filter((callout) => callout.trial || callout.pearl)
    : (fallback.trialCallouts || []).map((callout) => ({ ...callout }));

  return {
    id: fallback.id,
    icon: typeof value?.icon === "string" && value.icon.trim() ? value.icon.trim() : fallback.icon,
    title: typeof value?.title === "string" && value.title.trim() ? value.title.trim() : fallback.title,
    subtitle: typeof value?.subtitle === "string" ? value.subtitle.trim() : fallback.subtitle,
    topics: normalizeTextArray(value?.topics, fallback.topics || []),
    sections: normalizeSections(value?.sections, fallback.sections),
    ...(trialCallouts.length > 0 ? { trialCallouts } : {}),
  };
}

export function normalizeStudySheets(value?: Partial<Record<number | string, Partial<StudySheet>[]>>): StudySheetsData {
  const result: StudySheetsData = {};
  Object.keys(STUDY_SHEETS).forEach((weekKey) => {
    const week = Number(weekKey);
    const defaults = (STUDY_SHEETS as StudySheetsData)[week] || [];
    const incoming = Array.isArray(value?.[week]) ? value?.[week] : Array.isArray(value?.[weekKey]) ? value?.[weekKey] : [];
    const incomingById = new Map((incoming || []).map((sheet) => [sheet?.id, sheet]));
    result[week] = defaults.map((sheet) => normalizeStudySheet(incomingById.get(sheet.id), sheet));
  });
  return result;
}
