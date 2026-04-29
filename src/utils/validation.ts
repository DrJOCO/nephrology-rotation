// ═══════════════════════════════════════════════════════════════════════
//  Input Validation — centralized validation for all forms
// ═══════════════════════════════════════════════════════════════════════

export interface PatientFormData {
  initials: string;
  room: string;
  dx: string;
  topics: string[];
  notes: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export interface FollowUpValidation {
  valid: boolean;
  error: string | null;
}

interface PhiCheck {
  pattern: RegExp;
  message: string;
}

// ── Field constraints ──────────────────────────────────────────────────
export const LIMITS = {
  INITIALS_MAX: 5,
  ROOM_MAX: 10,
  DIAGNOSIS_MAX: 200,
  NOTES_MAX: 1000,
  FOLLOWUP_MAX: 500,
  NAME_MAX: 50,
  ROTATION_CODE_MIN: 4,
  ROTATION_CODE_MAX: 20,
  PIN_LENGTH: 4,
  ANNOUNCEMENT_TITLE_MAX: 100,
  ANNOUNCEMENT_BODY_MAX: 500,
  ARTICLE_TITLE_MAX: 200,
  ARTICLE_URL_MAX: 500,
  PATIENT_TOPICS_MIN: 2,
};

export const PHI_WARNING =
  "Use initials and learning points only. Do not enter names, DOBs, MRNs, phone numbers, email addresses, or home addresses.";

const PHI_CHECKS: PhiCheck[] = [
  { pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, message: "Remove email addresses." },
  { pattern: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/, message: "Remove phone numbers." },
  { pattern: /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:19|20)\d{2}-\d{2}-\d{2}\b/, message: "Remove full dates." },
  { pattern: /\b\d{7,}\b/, message: "Remove MRNs or other long numeric identifiers." },
  { pattern: /\b(?:dob|date of birth|mrn|ssn|social security|address)\b/i, message: "Remove explicit identifying details." },
];

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

export function detectPotentialPhi(text: string | undefined | null): string | null {
  const value = (text || "").trim();
  if (!value) return null;

  for (const check of PHI_CHECKS) {
    if (check.pattern.test(value)) return check.message;
  }

  return null;
}

// ── Patient form validation ────────────────────────────────────────────

/**
 * Validate the patient form and return errors.
 * @param {{ initials: string, room: string, dx: string, topics: string[], notes: string }} form
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validatePatientForm(form: PatientFormData): ValidationResult {
  const errors: Record<string, string> = {};

  // Initials: required, max 5 chars, letters/periods/hyphens only
  const initials = (form.initials || "").trim();
  if (!initials) {
    errors.initials = "Patient initials are required";
  } else if (initials.length > LIMITS.INITIALS_MAX) {
    errors.initials = `Max ${LIMITS.INITIALS_MAX} characters`;
  } else if (!/^[A-Za-z.\-\s]+$/.test(initials)) {
    errors.initials = "Letters, periods, and hyphens only";
  }

  // Room: optional, max 10, alphanumeric + dash
  const room = (form.room || "").trim();
  if (room && room.length > LIMITS.ROOM_MAX) {
    errors.room = `Max ${LIMITS.ROOM_MAX} characters`;
  } else if (room && !/^[A-Za-z0-9\-\s]+$/.test(room)) {
    errors.room = "Letters, numbers, and hyphens only";
  }

  // Diagnosis: optional, max 200
  const dx = (form.dx || "").trim();
  if (dx.length > LIMITS.DIAGNOSIS_MAX) {
    errors.dx = `Max ${LIMITS.DIAGNOSIS_MAX} characters`;
  } else {
    const dxPhi = detectPotentialPhi(dx);
    if (dxPhi) errors.dx = dxPhi;
  }

  // Topics: at least two required so consult-driven recommendations have useful context.
  if (!form.topics || form.topics.length < LIMITS.PATIENT_TOPICS_MIN) {
    errors.topics = `Select at least ${LIMITS.PATIENT_TOPICS_MIN} topics`;
  }

  // Notes: optional, max 1000
  const notes = (form.notes || "").trim();
  if (notes.length > LIMITS.NOTES_MAX) {
    errors.notes = `Max ${LIMITS.NOTES_MAX} characters`;
  } else {
    const notesPhi = detectPotentialPhi(notes);
    if (notesPhi) errors.notes = notesPhi;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validate a follow-up note
 * @param {string} text
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateFollowUp(text: string | undefined | null): FollowUpValidation {
  const trimmed = (text || "").trim();
  if (!trimmed) return { valid: false, error: "Follow-up note cannot be empty" };
  if (trimmed.length > LIMITS.FOLLOWUP_MAX) return { valid: false, error: `Max ${LIMITS.FOLLOWUP_MAX} characters` };
  const phiError = detectPotentialPhi(trimmed);
  if (phiError) return { valid: false, error: phiError };
  return { valid: true, error: null };
}

// ── Login form validation ──────────────────────────────────────────────

/**
 * Validate login form fields
 * @param {{ name: string, pin: string, code: string }} fields
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateLoginForm({ name, pin, code }: { name: string; pin: string; code: string }): ValidationResult {
  const errors: Record<string, string> = {};

  const trimmedName = (name || "").trim();
  if (!trimmedName) {
    errors.name = "Name is required";
  } else if (trimmedName.length > LIMITS.NAME_MAX) {
    errors.name = `Max ${LIMITS.NAME_MAX} characters`;
  }

  if (pin && pin.length !== LIMITS.PIN_LENGTH) {
    errors.pin = "PIN must be exactly 4 digits";
  } else if (pin && !/^\d{4}$/.test(pin)) {
    errors.pin = "PIN must be 4 digits";
  }

  if (code) {
    if (code.length < LIMITS.ROTATION_CODE_MIN) {
      errors.code = `At least ${LIMITS.ROTATION_CODE_MIN} characters`;
    } else if (code.length > LIMITS.ROTATION_CODE_MAX) {
      errors.code = `Max ${LIMITS.ROTATION_CODE_MAX} characters`;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
