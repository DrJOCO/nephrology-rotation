// Rotation content = the latest built-in content + only what the admin changed.
//
// Rotations store a copy of study sheets, clinic guide templates, articles, and
// the weekly curriculum. Showing that copy as-is froze every rotation at the
// built-in version it was created from, so content fixes never reached
// students without a manual reset. Instead, each item is resolved on read:
//   - customized by the admin → the rotation's stored version
//   - otherwise               → the current built-in version
//
// `contentCustomizations` (written on publish/create) lists the customized
// items. Rotations saved before it existed are inferred: a stored item that
// matches the current or any past built-in version (fingerprints from git
// history) is an untouched copy; anything else is treated as the admin's edit.

import { CLINIC_GUIDES, CLINIC_GUIDE_TOPICS, type ClinicGuideTemplates, type ClinicGuideTopic } from "../data/clinicGuides";
import { ARTICLES, STUDY_SHEETS, WEEKLY } from "../data/constants";
import HISTORY from "../data/contentHistoryFingerprints.json";
import type { StudySheet } from "../types";
import { normalizeClinicGuideTemplate } from "./clinicGuideTemplates";
import { contentFingerprint, type ContentKind } from "./contentFingerprint";
import { normalizeStudySheet, type StudySheetsData } from "./studySheets";

export interface ContentCustomizations {
  version: 1;
  studySheets: string[];          // sheet ids
  clinicGuideTemplates: string[]; // clinic topics
  articles: string[];             // week keys
  curriculum: string[];           // week keys
}

type WeekMap<T> = Record<string, T>;
type ArticlesData = typeof ARTICLES;
type CurriculumData = typeof WEEKLY;

export interface RotationContentInput {
  curriculum?: unknown;
  articles?: unknown;
  studySheets?: unknown;
  clinicGuideTemplates?: unknown;
  contentCustomizations?: unknown;
}

export interface ResolvedRotationContent {
  curriculum: CurriculumData;
  articles: ArticlesData;
  studySheets: StudySheetsData;
  clinicGuideTemplates: ClinicGuideTemplates;
  customizations: ContentCustomizations;
}

const KINDS: ContentKind[] = ["studySheets", "clinicGuideTemplates", "articles", "curriculum"];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const DEFAULT_SHEETS: Array<{ week: string; sheet: StudySheet }> = Object.entries(STUDY_SHEETS as StudySheetsData)
  .flatMap(([week, sheets]) => sheets.map((sheet) => ({ week, sheet })));

// Built-in fingerprints: every past version from git history plus the current one.
let knownDefaults: Record<ContentKind, Set<string>> | null = null;
function knownDefaultFingerprints(): Record<ContentKind, Set<string>> {
  if (knownDefaults) return knownDefaults;
  const known = {} as Record<ContentKind, Set<string>>;
  for (const kind of KINDS) known[kind] = new Set((HISTORY as Record<string, unknown>)[kind] as string[] || []);
  DEFAULT_SHEETS.forEach(({ sheet }) => known.studySheets.add(contentFingerprint("studySheets", sheet.id, sheet)));
  CLINIC_GUIDE_TOPICS.forEach((topic) => known.clinicGuideTemplates.add(contentFingerprint("clinicGuideTemplates", topic, CLINIC_GUIDES[topic])));
  Object.entries(ARTICLES).forEach(([week, list]) => known.articles.add(contentFingerprint("articles", week, list)));
  Object.entries(WEEKLY).forEach(([week, module]) => known.curriculum.add(contentFingerprint("curriculum", week, module)));
  knownDefaults = known;
  return known;
}

function currentDefaultFingerprint(kind: ContentKind, slot: string): string | null {
  if (kind === "studySheets") {
    const found = DEFAULT_SHEETS.find(({ sheet }) => sheet.id === slot);
    return found ? contentFingerprint(kind, slot, found.sheet) : null;
  }
  if (kind === "clinicGuideTemplates") {
    return slot in CLINIC_GUIDES ? contentFingerprint(kind, slot, CLINIC_GUIDES[slot as ClinicGuideTopic]) : null;
  }
  const defaults = (kind === "articles" ? ARTICLES : WEEKLY) as WeekMap<unknown>;
  return slot in defaults ? contentFingerprint(kind, slot, defaults[slot]) : null;
}

// Every stored item, keyed by its slot, for one content kind.
function storedItems(kind: ContentKind, stored: unknown): Array<[string, unknown]> {
  if (kind === "studySheets") {
    if (!isObject(stored)) return [];
    return Object.values(stored).flatMap((week) => (Array.isArray(week) ? week : []))
      .filter((sheet): sheet is Record<string, unknown> => isObject(sheet) && typeof sheet.id === "string")
      .map((sheet) => [sheet.id as string, sheet]);
  }
  return isObject(stored) ? Object.entries(stored) : [];
}

function emptyCustomizations(): ContentCustomizations {
  return { version: 1, studySheets: [], clinicGuideTemplates: [], articles: [], curriculum: [] };
}

export function parseContentCustomizations(value: unknown): ContentCustomizations | null {
  if (!isObject(value) || value.version !== 1) return null;
  const list = (field: unknown) => (Array.isArray(field) ? field.filter((item): item is string => typeof item === "string") : []);
  return {
    version: 1,
    studySheets: list(value.studySheets),
    clinicGuideTemplates: list(value.clinicGuideTemplates),
    articles: list(value.articles),
    curriculum: list(value.curriculum),
  };
}

// For rotations saved before contentCustomizations existed: anything that isn't
// a known built-in version (current or past) counts as the admin's edit.
export function inferLegacyCustomizations(content: RotationContentInput): ContentCustomizations {
  const known = knownDefaultFingerprints();
  const result = emptyCustomizations();
  for (const kind of KINDS) {
    for (const [slot, value] of storedItems(kind, content[kind])) {
      if (!known[kind].has(contentFingerprint(kind, slot, value))) result[kind].push(slot);
    }
  }
  return result;
}

// For publishing: which items in the admin's current (already resolved) content
// differ from today's built-in version.
export function computeContentCustomizations(content: RotationContentInput): ContentCustomizations {
  const result = emptyCustomizations();
  for (const kind of KINDS) {
    for (const [slot, value] of storedItems(kind, content[kind])) {
      if (contentFingerprint(kind, slot, value) !== currentDefaultFingerprint(kind, slot)) result[kind].push(slot);
    }
  }
  return result;
}

function resolveWeeks<T>(defaults: WeekMap<T>, stored: unknown, customized: Set<string>): WeekMap<T> {
  const storedWeeks = isObject(stored) ? stored : {};
  const result: WeekMap<T> = {};
  for (const [week, value] of Object.entries(defaults)) {
    result[week] = customized.has(week) && storedWeeks[week] != null ? storedWeeks[week] as T : value;
  }
  // Weeks the admin added beyond the built-in ones are always their own content.
  for (const [week, value] of Object.entries(storedWeeks)) {
    if (!(week in defaults) && value != null) result[week] = value as T;
  }
  return result;
}

export function resolveRotationContent(content: RotationContentInput | null | undefined): ResolvedRotationContent {
  const input = content || {};
  const customizations = parseContentCustomizations(input.contentCustomizations) || inferLegacyCustomizations(input);

  const customSheets = new Set(customizations.studySheets);
  const storedSheets = new Map(storedItems("studySheets", input.studySheets) as Array<[string, Partial<StudySheet>]>);
  const studySheets: StudySheetsData = {};
  for (const [week, sheets] of Object.entries(STUDY_SHEETS as StudySheetsData)) {
    studySheets[Number(week)] = sheets.map((sheet) => (
      customSheets.has(sheet.id) && storedSheets.has(sheet.id)
        ? normalizeStudySheet(storedSheets.get(sheet.id), sheet)
        : normalizeStudySheet(sheet, sheet)
    ));
  }

  const customTopics = new Set(customizations.clinicGuideTemplates);
  const storedTemplates = isObject(input.clinicGuideTemplates) ? input.clinicGuideTemplates : {};
  const clinicGuideTemplates = CLINIC_GUIDE_TOPICS.reduce((acc, topic) => {
    acc[topic] = customTopics.has(topic) && isObject(storedTemplates[topic])
      ? normalizeClinicGuideTemplate(topic, storedTemplates[topic] as Parameters<typeof normalizeClinicGuideTemplate>[1])
      : normalizeClinicGuideTemplate(topic);
    return acc;
  }, {} as ClinicGuideTemplates);

  return {
    curriculum: resolveWeeks(WEEKLY as WeekMap<unknown>, input.curriculum, new Set(customizations.curriculum)) as CurriculumData,
    articles: resolveWeeks(ARTICLES as WeekMap<unknown>, input.articles, new Set(customizations.articles)) as ArticlesData,
    studySheets,
    clinicGuideTemplates,
    customizations,
  };
}

export function countCustomizations(customizations: ContentCustomizations): number {
  return customizations.studySheets.length + customizations.clinicGuideTemplates.length
    + customizations.articles.length + customizations.curriculum.length;
}
