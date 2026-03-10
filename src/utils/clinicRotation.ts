// Clinic guide rotation logic — pure functions, no side effects.
//
// Cycle: CKD → Transplant → Hypertension (3-week repeating)
// Deterministic from a fixed reference Monday via modular arithmetic.
//
// Scheduling: the guide for a given Friday is determined by which ISO week
// that Friday falls in.  The app auto-generates a ClinicGuideRecord on
// load if one doesn't already exist for the current/next Friday.

import { CLINIC_GUIDE_TOPICS, type ClinicGuideTopic } from "../data/clinicGuides";
import type { ClinicGuideRecord } from "../types";

// Anchor: Monday 2026-01-05 maps to index 0 (CKD).
const REFERENCE_MONDAY = new Date("2026-01-05T00:00:00");

/**
 * Return the Monday 00:00 of the ISO week containing `date`.
 * ISO weeks start on Monday.
 */
function toMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = (day + 6) % 7; // Mon=0, Tue=1 … Sun=6
  d.setDate(d.getDate() - diff);
  return d;
}

/** Which clinic guide topic is active for the week containing `date`? */
export function getClinicTopicForDate(date: Date): ClinicGuideTopic {
  const monday = toMonday(date);
  const diffMs = monday.getTime() - REFERENCE_MONDAY.getTime();
  const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
  const index = ((diffWeeks % 3) + 3) % 3; // safe modulo for negatives
  return CLINIC_GUIDE_TOPICS[index];
}

/**
 * Return this week's Friday if today is Mon–Fri, otherwise next Friday.
 * This is the "upcoming clinic day" from the perspective of anyone
 * opening the app.
 */
export function getCurrentOrNextFriday(from: Date): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun … 6=Sat
  if (day >= 1 && day <= 5) {
    // Mon–Fri → this week's Friday
    d.setDate(d.getDate() + (5 - day));
  } else {
    // Sat or Sun → next Friday
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

/**
 * Ensure a ClinicGuideRecord exists for the current/next Friday.
 * Returns the updated array and the newly created record (or null if
 * one already existed).  Pure function — caller persists the result.
 */
export function ensureCurrentClinicGuide(
  existingGuides: ClinicGuideRecord[],
  now: Date = new Date(),
): { guides: ClinicGuideRecord[]; newGuide: ClinicGuideRecord | null } {
  const friday = getCurrentOrNextFriday(now);
  const dateStr = toDateStr(friday);

  if (existingGuides.some((g) => g.date === dateStr)) {
    return { guides: existingGuides, newGuide: null };
  }

  const topic = getClinicTopicForDate(friday);
  const newGuide: ClinicGuideRecord = {
    id: `clinic-${dateStr}-${topic}`,
    date: dateStr,
    topic,
    generatedAt: new Date().toISOString(),
    isOverride: false,
  };

  return {
    guides: [...existingGuides, newGuide],
    newGuide,
  };
}

/**
 * Override the topic for a specific Friday.  If a record already exists
 * for that date it is replaced; otherwise a new one is appended.
 * Does NOT corrupt other records in the array.
 */
export function overrideClinicGuide(
  existingGuides: ClinicGuideRecord[],
  date: string,
  newTopic: ClinicGuideTopic,
): ClinicGuideRecord[] {
  const record: ClinicGuideRecord = {
    id: `clinic-${date}-${newTopic}`,
    date,
    topic: newTopic,
    generatedAt: new Date().toISOString(),
    isOverride: true,
  };

  const idx = existingGuides.findIndex((g) => g.date === date);
  if (idx >= 0) {
    const copy = [...existingGuides];
    copy[idx] = record;
    return copy;
  }
  return [...existingGuides, record];
}

/**
 * Regenerate (reset) the guide for a specific Friday back to whatever
 * the deterministic rotation dictates, removing any prior override.
 */
export function regenerateClinicGuide(
  existingGuides: ClinicGuideRecord[],
  date: string,
): ClinicGuideRecord[] {
  const friday = new Date(date + "T00:00:00");
  const topic = getClinicTopicForDate(friday);
  const record: ClinicGuideRecord = {
    id: `clinic-${date}-${topic}`,
    date,
    topic,
    generatedAt: new Date().toISOString(),
    isOverride: false,
  };

  const idx = existingGuides.findIndex((g) => g.date === date);
  if (idx >= 0) {
    const copy = [...existingGuides];
    copy[idx] = record;
    return copy;
  }
  return [...existingGuides, record];
}
