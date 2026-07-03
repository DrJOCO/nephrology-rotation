import type { Patient } from "../types";
import type { PatientSuggestedTopicGroup } from "./patientRecommendations";

// One-tap consult logging (cohort feedback): a quick-log entry is a consult
// record with only a topic — no initials, no form. Shared by the Consults tab
// and the Today quick-log card so both log identically.
export function createQuickLogEntry(topic: string): Patient {
  return { id: Date.now(), initials: "", room: "", dx: "", topics: [topic], notes: "", date: new Date().toISOString(), status: "active", followUps: [] };
}

export function summarizeSuggestedGroup(group: PatientSuggestedTopicGroup): string {
  const parts: string[] = [];
  if (group.guides.length > 0) parts.push(`${group.guides.length} guide${group.guides.length !== 1 ? "s" : ""}`);
  if (group.sheets.length > 0) parts.push(`${group.sheets.length} sheet${group.sheets.length !== 1 ? "s" : ""}`);
  if (group.trials.length > 0) parts.push(`${group.trials.length} trial${group.trials.length !== 1 ? "s" : ""}`);
  if (group.tools.length > 0) parts.push(`${group.tools.length} tool${group.tools.length !== 1 ? "s" : ""}`);
  return parts.join(" · ") || group.reason;
}
