import { STALE_FOLLOWUP_DAYS } from "../data/constants";
import { CONSULT_SERVICES, CONSULT_SETTINGS, HOSPITAL_DAYS } from "../data/consultFields";
import type { ConsultService, ConsultSetting, FollowUp, HospitalDay, Patient } from "../types";

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

// ── De-identification (D1) ──────────────────────────────────────────────
// Stored consult entries from before the picklist redesign carry free text
// (initials, room, dx, notes, follow-up notes). Every path that brings stored
// entries into app state runs them through toDeidentifiedPatient, which keeps
// an allow-list of fields and drops everything else — so old data is never
// shown, and the next write of that list stores the scrubbed copy.

const SETTING_VALUES = new Set<unknown>(CONSULT_SETTINGS.map(option => option.value));
const SERVICE_VALUES = new Set<unknown>(CONSULT_SERVICES.map(option => option.value));
const HOSPITAL_DAY_VALUES = new Set<unknown>(HOSPITAL_DAYS.map(option => option.value));

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidId(id: unknown): id is string | number {
  return (typeof id === "number" && Number.isFinite(id)) || (typeof id === "string" && id !== "");
}

function hasContent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.keys(value).length > 0;
  return true;
}

function toFollowUp(raw: unknown): FollowUp | null {
  if (!isPlainObject(raw)) return null;
  if (typeof raw.id !== "number" || !Number.isFinite(raw.id) || typeof raw.date !== "string") return null;
  return { id: raw.id, date: raw.date };
}

// Returns null for entries too malformed to show (no usable id).
export function toDeidentifiedPatient(raw: unknown): Patient | null {
  if (!isPlainObject(raw) || !isValidId(raw.id)) return null;
  const topics = Array.isArray(raw.topics)
    ? raw.topics.filter((topic): topic is string => typeof topic === "string" && topic !== "")
    : [];
  // Legacy single-topic entries fold into `topics`; every reader already
  // prefers `topics` when it is non-empty.
  if (topics.length === 0 && typeof raw.topic === "string" && raw.topic) topics.push(raw.topic);

  const patient: Patient = {
    id: raw.id,
    topics,
    date: typeof raw.date === "string" ? raw.date : "",
    status: raw.status === "discharged" ? "discharged" : "active",
    followUps: Array.isArray(raw.followUps)
      ? raw.followUps.map(toFollowUp).filter((followUp): followUp is FollowUp => followUp !== null)
      : [],
  };
  if (SETTING_VALUES.has(raw.setting)) patient.setting = raw.setting as ConsultSetting;
  if (SERVICE_VALUES.has(raw.service)) patient.service = raw.service as ConsultService;
  if (HOSPITAL_DAY_VALUES.has(raw.hospitalDay)) patient.hospitalDay = raw.hospitalDay as HospitalDay;
  if (typeof raw.updatedAt === "string") patient.updatedAt = raw.updatedAt;
  return patient;
}

export function normalizePatients(raw: unknown): Patient[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(toDeidentifiedPatient).filter((patient): patient is Patient => patient !== null);
}

// What toDeidentifiedPatient discards from one stored entry, or null when it
// discards nothing with content (empty legacy fields from quick logs don't
// count). Feeds the admin privacy cleanup's counts and backup file.
export function legacyPatientDetails(raw: unknown): Record<string, unknown> | null {
  if (raw === undefined || raw === null) return null;
  const kept = toDeidentifiedPatient(raw);
  if (!kept || !isPlainObject(raw)) return { droppedEntry: raw };

  const removed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    // topic/topics survive (folded or filtered); follow-ups are handled below.
    if (key === "topic" || key === "topics" || key === "followUps") continue;
    if (!(key in kept) && hasContent(value)) removed[key] = value;
  }
  const followUpNotes = Array.isArray(raw.followUps)
    ? raw.followUps
      .filter((followUp): followUp is Record<string, unknown> => isPlainObject(followUp) && hasContent(followUp.note))
      .map(followUp => ({ id: followUp.id, note: followUp.note }))
    : [];
  if (followUpNotes.length > 0) removed.followUpNotes = followUpNotes;

  return Object.keys(removed).length > 0 ? removed : null;
}

export function countLegacyPatientDetails(raw: unknown): number {
  if (!Array.isArray(raw)) return 0;
  return raw.filter(entry => legacyPatientDetails(entry) !== null).length;
}
