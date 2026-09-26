// ═══════════════════════════════════════════════════════════════════════
//  Input Validation — centralized validation for all forms
// ═══════════════════════════════════════════════════════════════════════

import { CONSULT_SERVICES, CONSULT_SETTINGS, HOSPITAL_DAYS } from "../data/consultFields";
import type { ConsultService, ConsultSetting, HospitalDay } from "../types";

// Picklists only — the consult log has no free-text fields (D1).
export interface PatientFormData {
  topics: string[];
  setting?: ConsultSetting;
  service?: ConsultService;
  hospitalDay?: HospitalDay;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

// ── Field constraints ──────────────────────────────────────────────────
export const LIMITS = {
  NAME_MAX: 50,
  ROTATION_CODE_MIN: 4,
  ROTATION_CODE_MAX: 20,
  PIN_LENGTH: 4,
  ANNOUNCEMENT_TITLE_MAX: 100,
  ANNOUNCEMENT_BODY_MAX: 500,
  ARTICLE_TITLE_MAX: 200,
  ARTICLE_URL_MAX: 500,
  PATIENT_TOPICS_MIN: 1,
};

export const PHI_WARNING =
  "The consult log has no free-text fields by design — just topics and picklists. Keep patient details in the EHR.";

// ── Sanitization helpers ───────────────────────────────────────────────

/** Trim whitespace and enforce max length */
export function sanitize(text: string | undefined | null, maxLength: number): string {
  if (typeof text !== "string") return "";
  return text.trim().slice(0, maxLength);
}

/** Enforce max length on input change (for controlled inputs) */
export function clampLength(text: string | undefined | null, maxLength: number): string {
  if (typeof text !== "string") return "";
  return text.slice(0, maxLength);
}

/** Check if a string looks like a valid URL */
export function isValidUrl(str: string | undefined | null): boolean {
  if (!str || typeof str !== "string") return false;
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// ── Patient form validation ────────────────────────────────────────────

function isOption<V extends string>(options: { value: V }[], value: unknown): boolean {
  return options.some(option => option.value === value);
}

export function validatePatientForm(form: PatientFormData): ValidationResult {
  const errors: Record<string, string> = {};

  // Topics: at least one — the single signal the consult-linked learning loop
  // needs. (Was 2; reverted per cohort feedback that logging felt heavyweight.)
  if (!form.topics || form.topics.length < LIMITS.PATIENT_TOPICS_MIN) {
    errors.topics = `Select at least ${LIMITS.PATIENT_TOPICS_MIN} topic${LIMITS.PATIENT_TOPICS_MIN !== 1 ? "s" : ""}`;
  }

  // Details are optional picklists; anything else is a bug, not user input.
  if (form.setting !== undefined && !isOption(CONSULT_SETTINGS, form.setting)) errors.setting = "Pick a setting from the list";
  if (form.service !== undefined && !isOption(CONSULT_SERVICES, form.service)) errors.service = "Pick a service from the list";
  if (form.hospitalDay !== undefined && !isOption(HOSPITAL_DAYS, form.hospitalDay)) errors.hospitalDay = "Pick a hospital day from the list";

  return { valid: Object.keys(errors).length === 0, errors };
}

// ── Quiz score entry validation (admin manual pre/post/module scores) ──

/**
 * Validate a manually entered quiz score. Both fields arrive as strings from
 * the form. Rules: both must be whole numbers, total >= 1, 0 <= correct <= total.
 * Returns an error message for inline display, or null when valid.
 */
export function validateQuizScoreEntry(correctRaw: string, totalRaw: string): string | null {
  const correctText = (correctRaw || "").trim();
  const totalText = (totalRaw || "").trim();
  if (!correctText || !totalText) return "Enter both correct and total";
  if (!/^\d+$/.test(correctText) || !/^\d+$/.test(totalText)) {
    return "Scores must be whole numbers (no negatives or decimals)";
  }
  const correct = Number(correctText);
  const total = Number(totalText);
  if (!Number.isSafeInteger(correct) || !Number.isSafeInteger(total)) return "Score is too large";
  if (total < 1) return "Total questions must be at least 1";
  if (correct > total) return `Correct (${correct}) can't exceed total (${total})`;
  return null;
}
