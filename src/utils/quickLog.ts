import type { Patient } from "../types";
import type { PatientSuggestedTopicGroup } from "./patientRecommendations";

// One-tap consult logging (cohort feedback): a quick-log entry is a consult
// record with only a topic — no initials, no form. Shared by the Consults tab
// and the Today quick-log card so both log identically.
export function createQuickLogEntry(topic: string): Patient {
  return { id: Date.now(), initials: "", room: "", dx: "", topics: [topic], notes: "", date: new Date().toISOString(), status: "active", followUps: [] };
}

// Double-tap guard: a one-tap control is easy to hit twice by accident, which
// silently created a duplicate consult and inflated points. Track the last log
// per topic and swallow a second tap of the same topic inside a short window.
// Kept at the util level so every quick-log surface (Today card + Consults tab)
// shares one dedup policy.
export const QUICK_LOG_DEDUPE_MS = 1500;

const lastQuickLogAt = new Map<string, number>();

// Returns true if this tap should be ignored as an accidental repeat. When it
// returns false the caller may proceed to log, and the topic's window is armed.
export function isDuplicateQuickLog(topic: string, now: number = Date.now()): boolean {
  const previous = lastQuickLogAt.get(topic);
  if (previous !== undefined && now - previous < QUICK_LOG_DEDUPE_MS) {
    return true;
  }
  lastQuickLogAt.set(topic, now);
  return false;
}

// Undo clears the guard so the student can immediately, deliberately re-log the
// same topic (an undo is a signal the first tap was unwanted, not a repeat).
export function clearQuickLogGuard(topic: string): void {
  lastQuickLogAt.delete(topic);
}

// Test-only: reset the module-level guard between cases.
export function resetQuickLogGuard(): void {
  lastQuickLogAt.clear();
}

// "Other" is deliberately excluded from every recommendation surface
// (see patientRecommendations.ts — topic === "Other" is skipped), so the
// generic "matched learning appears…" promise can never be kept for it. Give
// "Other" an honest confirmation instead of a broken promise.
export const OTHER_QUICK_LOG_SUMMARY = "no linked learning for this one";

export function summarizeSuggestedGroup(group: PatientSuggestedTopicGroup): string {
  const parts: string[] = [];
  if (group.guides.length > 0) parts.push(`${group.guides.length} guide${group.guides.length !== 1 ? "s" : ""}`);
  if (group.sheets.length > 0) parts.push(`${group.sheets.length} sheet${group.sheets.length !== 1 ? "s" : ""}`);
  if (group.trials.length > 0) parts.push(`${group.trials.length} trial${group.trials.length !== 1 ? "s" : ""}`);
  if (group.tools.length > 0) parts.push(`${group.tools.length} tool${group.tools.length !== 1 ? "s" : ""}`);
  return parts.join(" · ") || group.reason;
}
