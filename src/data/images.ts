// ═══════════════════════════════════════════════════════════════════════
//  Image Registry — maps content IDs to static image assets
//
//  Images are stored in /public/images/ and served at build time.
//  To add an image:
//    1. Place the file in /public/images/study-sheets/ or /public/images/cases/
//    2. Add an entry below with the content ID and image path
//    3. Optionally add a caption and alt text
//
//  Supported in: StudySheetsView, CasesView
//  Image paths are relative to /public (Vite serves them from root)
// ═══════════════════════════════════════════════════════════════════════

export interface ImageEntry {
  src: string;
  alt: string;
  caption?: string;
}

export interface StudySheetImageConfig {
  hero: string | null;
  sections: Record<string, ImageEntry>;
}

export interface CaseImageConfig {
  scenario: string | ImageEntry | null;
  questions: Record<number, ImageEntry>;
}

/**
 * Study Sheet Images — keyed by study sheet ID
 * Each sheet can have a hero image and per-section images
 */
export const STUDY_SHEET_IMAGES: Record<string, StudySheetImageConfig> = {
  "aki-cheatsheet": {
    hero: null, // e.g. "/images/study-sheets/aki-overview.png"
    sections: {
      // "KDIGO AKI Staging": { src: "/images/study-sheets/kdigo-staging.png", alt: "KDIGO AKI staging criteria table", caption: "KDIGO AKI staging — serum creatinine and urine output criteria" },
      // "Pre-Renal vs. Intrinsic vs. Post-Renal": { src: "/images/study-sheets/aki-differential.png", alt: "AKI differential diagnosis flowchart" },
    },
  },
  "gfr-urinalysis-cheatsheet": {
    hero: null,
    sections: {
      // "Urine Sediment Findings": { src: "/images/study-sheets/urine-sediment.png", alt: "Urine sediment microscopy findings", caption: "Key urine sediment findings: RBC casts, WBC casts, muddy brown casts, oval fat bodies" },
    },
  },
  "sodium-cheatsheet": {
    hero: null,
    sections: {},
  },
  "potassium-acidbase-cheatsheet": {
    hero: null,
    sections: {},
  },
  "glomerular-cheatsheet": {
    hero: null,
    sections: {},
  },
  "ckd-sglt2-cheatsheet": {
    hero: null,
    sections: {},
  },
  "dialysis-cheatsheet": {
    hero: null,
    sections: {},
  },
  "transplant-stones-cheatsheet": {
    hero: null,
    sections: {},
  },
};

/**
 * Case Images — keyed by case ID
 * Each case can have a scenario image and per-question images
 */
export const CASE_IMAGES: Record<string, CaseImageConfig> = {
  // Week 1
  "w1c1": {
    scenario: null, // e.g. "/images/cases/aki-sepsis-labs.png"
    questions: {
      // 0: { src: "/images/cases/kdigo-staging-table.png", alt: "KDIGO staging reference", caption: "KDIGO AKI staging criteria" },
    },
  },
  "w1c2": { scenario: null, questions: {} },
  "w1c3": { scenario: null, questions: {} },
  // Week 2
  "w2c1": { scenario: null, questions: {} },
  "w2c2": { scenario: null, questions: {} },
  "w2c3": { scenario: null, questions: {} },
  // Week 3
  "w3c1": { scenario: null, questions: {} },
  "w3c2": { scenario: null, questions: {} },
  "w3c3": { scenario: null, questions: {} },
  // Week 4
  "w4c1": { scenario: null, questions: {} },
  "w4c2": { scenario: null, questions: {} },
  "w4c3": { scenario: null, questions: {} },
};

/**
 * Helper: Get images for a study sheet section
 * @param {string} sheetId
 * @param {string} sectionHeading
 * @returns {{ src: string, alt: string, caption?: string } | null}
 */
export function getStudySheetSectionImage(sheetId: string, sectionHeading: string): ImageEntry | null {
  const sheet = STUDY_SHEET_IMAGES[sheetId];
  if (!sheet) return null;
  return sheet.sections?.[sectionHeading] || null;
}

/**
 * Helper: Get hero image for a study sheet
 * @param {string} sheetId
 * @returns {string | null} image path
 */
export function getStudySheetHero(sheetId: string): string | null {
  return STUDY_SHEET_IMAGES[sheetId]?.hero || null;
}

/**
 * Helper: Get scenario image for a case
 * @param {string} caseId
 * @returns {{ src: string, alt: string, caption?: string } | null}
 */
export function getCaseScenarioImage(caseId: string): ImageEntry | null {
  const c = CASE_IMAGES[caseId];
  if (!c?.scenario) return null;
  return typeof c.scenario === "string"
    ? { src: c.scenario, alt: `${caseId} scenario image` }
    : c.scenario;
}

/**
 * Helper: Get question image for a case
 * @param {string} caseId
 * @param {number} questionIndex
 * @returns {{ src: string, alt: string, caption?: string } | null}
 */
export function getCaseQuestionImage(caseId: string, questionIndex: number): ImageEntry | null {
  return CASE_IMAGES[caseId]?.questions?.[questionIndex] || null;
}
