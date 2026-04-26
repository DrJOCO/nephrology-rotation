import { STALE_FOLLOWUP_DAYS } from "../data/constants";
import type { Patient } from "../types";

export type FollowUpState = "stale" | "active" | "discharged";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function getFollowUpState(patient: Patient): FollowUpState {
  if (patient.status === "discharged") return "discharged";

  const followUpTimes = (patient.followUps ?? [])
    .map(f => +new Date(f.date))
    .filter(Number.isFinite);
  const createdAt = +new Date(patient.date);
  const lastActivity = Math.max(
    Number.isFinite(createdAt) ? createdAt : 0,
    ...followUpTimes,
  );
  const daysSince = (Date.now() - lastActivity) / MS_PER_DAY;
  const isStale = Number.isFinite(daysSince) && daysSince > STALE_FOLLOWUP_DAYS;

  return isStale ? "stale" : "active";
}
