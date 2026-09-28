// Content fingerprints for rotation-published teaching content.
//
// A rotation stores its own copy of study sheets, clinic guide templates,
// articles, and the weekly curriculum. To tell an admin's real edit apart from
// an untouched copy of an older built-in version, each item is reduced to a
// canonical form (only the fields the app renders, strings trimmed, empty
// values dropped) and hashed. Pure — no imports of the bundled data — so the
// history script (scripts/content-history) can fingerprint old versions with
// exactly the same rules.

export type ContentKind = "studySheets" | "clinicGuideTemplates" | "articles" | "curriculum";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function textList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function sections(value: unknown): Json[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isObject)
    .map((section) => ({ heading: text(section.heading), items: textList(section.items) }))
    .filter((section) => section.heading || section.items.length > 0);
}

// Generic canonical form: sorted keys, trimmed strings, undefined dropped.
function canonicalValue(value: unknown): Json {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (isObject(value)) {
    const out: { [key: string]: Json } = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] === undefined) continue;
      out[key] = canonicalValue(value[key]);
    }
    return out;
  }
  return null;
}

export function canonicalStudySheet(sheet: unknown): Json {
  const s = isObject(sheet) ? sheet : {};
  const callouts = Array.isArray(s.trialCallouts)
    ? s.trialCallouts
        .filter(isObject)
        .map((callout) => ({ trial: text(callout.trial), pearl: text(callout.pearl) }))
        .filter((callout) => callout.trial || callout.pearl)
    : [];
  return {
    id: text(s.id),
    icon: text(s.icon),
    title: text(s.title),
    subtitle: text(s.subtitle),
    topics: textList(s.topics),
    sections: sections(s.sections),
    trialCallouts: callouts,
  };
}

const CLINIC_TEXT_FIELDS = ["topic", "icon", "title", "subtitle", "whyItMatters", "teachingPearl", "howToPresent"] as const;
const CLINIC_LIST_FIELDS = ["beforePresenting", "commonMistakes", "teachingPoints", "discussionQuestions", "guidelineBasis"] as const;

export function canonicalClinicGuideTemplate(template: unknown): Json {
  const t = isObject(template) ? template : {};
  const out: { [key: string]: Json } = {};
  for (const field of CLINIC_TEXT_FIELDS) out[field] = text(t[field]);
  for (const field of CLINIC_LIST_FIELDS) out[field] = textList(t[field]);
  out.sections = sections(t.sections);
  return out;
}

// Article ids are derived keys added over time, not content — leave them out so
// an older copy without ids still matches the same list with ids.
export function canonicalArticleWeek(week: unknown): Json {
  if (!Array.isArray(week)) return [];
  return week.filter(isObject).map((article) => ({
    title: text(article.title),
    journal: text(article.journal),
    year: typeof article.year === "number" ? article.year : text(article.year),
    url: text(article.url),
    topic: text(article.topic),
    type: text(article.type),
  }));
}

export function canonicalCurriculumWeek(week: unknown): Json {
  return canonicalValue(week);
}

// cyrb53 — a small, fast, well-distributed 53-bit string hash.
export function hashString(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// `slot` pins the fingerprint to where the item lives (sheet id, clinic topic,
// or week number) so identical text in a different slot never matches.
export function contentFingerprint(kind: ContentKind, slot: string | number, value: unknown): string {
  let canonical: Json;
  if (kind === "studySheets") canonical = canonicalStudySheet(value);
  else if (kind === "clinicGuideTemplates") canonical = canonicalClinicGuideTemplate(value);
  else if (kind === "articles") canonical = canonicalArticleWeek(value);
  else canonical = canonicalCurriculumWeek(value);
  return hashString(`${kind}|${slot}|${JSON.stringify(canonical)}`);
}
