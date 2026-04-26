// Clinic guide scheduling logic — pure functions, no side effects.
//
// Each outpatient clinic week includes the same three learning tracks:
// CKD -> Hypertension -> Transplant. Older app versions generated only one
// Friday topic, so the helpers below preserve compatibility while ensuring
// all three records exist going forward.

import { CLINIC_GUIDE_TOPICS, type ClinicGuideTopic } from "../data/clinicGuides";
import type { ClinicGuideRecord } from "../types";

/**
 * Return the clinic topics for a clinic week in the order students should see
 * them on the page.
 */
export function getClinicTopicsForDate(_date: Date): ClinicGuideTopic[] {
  return [...CLINIC_GUIDE_TOPICS];
}

/**
 * Backward-compatible primary topic helper for older code/tests. The clinic
 * curriculum is no longer a rotating single-topic cycle; CKD is the first
 * outpatient clinic track each week.
 */
export function getClinicTopicForDate(date: Date): ClinicGuideTopic {
  return getClinicTopicsForDate(date)[0];
}

/**
 * Return this week's Friday if today is Mon-Fri, otherwise next Friday.
 * This is the "upcoming clinic day" from the perspective of anyone
 * opening the app.
 */
export function getCurrentOrNextFriday(from: Date): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun ... 6=Sat
  if (day >= 1 && day <= 5) {
    // Mon-Fri -> this week's Friday
    d.setDate(d.getDate() + (5 - day));
  } else {
    // Sat or Sun -> next Friday
    d.setDate(d.getDate() + ((5 - day + 7) % 7));
  }
  return d;
}

/** Format a Date as YYYY-MM-DD. */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function topicRecordId(date: string, topic: ClinicGuideTopic): string {
  return `clinic-${date}-${topic}`;
}

function buildRecord(date: string, topic: ClinicGuideTopic, isOverride = false): ClinicGuideRecord {
  return {
    id: topicRecordId(date, topic),
    date,
    topic,
    generatedAt: new Date().toISOString(),
    isOverride,
  };
}

/**
 * Ensure ClinicGuideRecords exist for all three guides for the current/next
 * Friday. Returns the updated array plus the first newly created record for
 * backward compatibility with older callers.
 */
export function ensureCurrentClinicGuide(
  existingGuides: ClinicGuideRecord[],
  now: Date = new Date(),
): { guides: ClinicGuideRecord[]; newGuide: ClinicGuideRecord | null; newGuides: ClinicGuideRecord[] } {
  const friday = getCurrentOrNextFriday(now);
  const dateStr = toDateStr(friday);
  const guides = [...existingGuides];
  const newGuides: ClinicGuideRecord[] = [];

  for (const topic of getClinicTopicsForDate(friday)) {
    if (guides.some((g) => g.date === dateStr && g.topic === topic)) continue;
    const record = buildRecord(dateStr, topic);
    guides.push(record);
    newGuides.push(record);
  }

  return {
    guides,
    newGuide: newGuides[0] || null,
    newGuides,
  };
}

/**
 * Mark or create a specific clinic topic record for a date. This is retained
 * for older admin flows; it no longer removes the other clinic topics.
 */
export function overrideClinicGuide(
  existingGuides: ClinicGuideRecord[],
  date: string,
  newTopic: ClinicGuideTopic,
): ClinicGuideRecord[] {
  const record = buildRecord(date, newTopic, true);
  const idx = existingGuides.findIndex((g) => g.date === date && g.topic === newTopic);
  if (idx >= 0) {
    const copy = [...existingGuides];
    copy[idx] = record;
    return copy;
  }
  return [...existingGuides, record];
}

/**
 * Regenerate all clinic guide records for a Friday back to the standard three
 * topic set, removing any old single-topic or override-only representation for
 * that date.
 */
export function regenerateClinicGuide(
  existingGuides: ClinicGuideRecord[],
  date: string,
): ClinicGuideRecord[] {
  const otherDates = existingGuides.filter((g) => g.date !== date);
  const friday = new Date(date + "T00:00:00");
  const records = getClinicTopicsForDate(friday).map((topic) => buildRecord(date, topic));
  return [...otherDates, ...records];
}
