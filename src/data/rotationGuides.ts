// Rotation workflow guides: service logistics, presentations, notes, and follow-up.
// Topic-specific clinical prep belongs in inpatient consult guides and weekly study sheets.

export type RotationGuideId =
  | "howToPresentConsult"
  | "preRoundingChecklist"
  | "assessmentPlanWriting"
  | "consultFollowUp";

export interface RotationGuideTemplate {
  id: RotationGuideId;
  icon: string;
  title: string;
  subtitle: string;
  whyItMatters: string;
  teachingPearl: string;
  sections: { heading: string; items: string[] }[];
  commonMistakes: string[];
  teachingPoints: string[];
}

export const ROTATION_GUIDE_IDS: RotationGuideId[] = [
  "howToPresentConsult",
  "preRoundingChecklist",
  "assessmentPlanWriting",
  "consultFollowUp",
];

export const ROTATION_GUIDES: Record<RotationGuideId, RotationGuideTemplate> = {
  howToPresentConsult: {
    id: "howToPresentConsult",
    icon: "\uD83C\uDFA4",
    title: "How to Present a Nephrology Consult",
    subtitle: "A simple format for sounding organized on rounds",
    whyItMatters:
      "Students often know facts but do not know how to package them. A good nephrology presentation is brief, trend-based, and centered on the consult question.",
    teachingPearl:
      "Do not present isolated numbers. Present trajectory, physiology, and the decision point.",
    sections: [
      {
        heading: "Before Presenting, Gather This",
        items: [
          "Consult question",
          "Baseline kidney function if available",
          "Current creatinine and trend",
          "Urine output",
          "BP / hemodynamics",
          "Current IV fluids / diuretics / pressors",
          "UA and urine microscopy if relevant",
          "Major electrolytes",
          "Imaging if relevant",
          "Whether dialysis is being considered",
          "What changed overnight",
        ],
      },
      {
        heading: "30-Second Consult Format",
        items: [
          "\"This is a __-year-old with __ who was consulted for __. Baseline kidney function is __, current creatinine is __, urine output is __, and the main issue appears to be __. Urgent concerns are __, and the main question today is __.\"",
        ],
      },
      {
        heading: "Full Consult Presentation Format",
        items: [
          "1. Why we were consulted",
          "2. Baseline kidney status",
          "3. Current trajectory",
          "4. Urine output and hemodynamics",
          "5. Relevant urine / lab / imaging data",
          "6. Differential buckets",
          "7. Urgent problems",
          "8. What you think needs to happen today",
        ],
      },
      {
        heading: "Use the Topic Guides for the Clinical Details",
        items: [
          "Open Inpatient Consult Guides for AKI, hyperkalemia, hyponatremia, dialysis, GN, HRS, contrast AKI, rhabdo, cardiorenal syndrome, DKD, or PD peritonitis.",
          "Use this rotation guide for the structure; use the consult guide for the disease-specific content.",
        ],
      },
    ],
    commonMistakes: [
      "Starting with a long PMH instead of the consult question",
      "Not knowing baseline kidney function",
      "Not mentioning urine output",
      "Not saying what changed",
      "Listing labs without interpretation",
      "Giving a diagnosis without discussing urgency",
    ],
    teachingPoints: [
      "Start with the consult question.",
      "Say the trend early.",
      "End with the decision point.",
    ],
  },

  preRoundingChecklist: {
    id: "preRoundingChecklist",
    icon: "\u2705",
    title: "Pre-Rounding Checklist",
    subtitle: "What to look up before rounds so your presentation is useful",
    whyItMatters:
      "Nephrology pre-rounding is data-heavy. Missing one key piece like urine output, dialysis timing, or sodium trend can weaken the whole assessment.",
    teachingPearl: "Before rounds, know what changed overnight.",
    sections: [
      {
        heading: "Universal Pre-Rounding Checklist",
        items: [
          "Overnight events",
          "Vitals and oxygen requirement",
          "I/Os and urine output",
          "Weight",
          "Creatinine / BUN",
          "Potassium / bicarbonate / sodium / phosphorus",
          "CBC if relevant",
          "IV fluids / diuretics / pressors",
          "New imaging",
          "Microbiology / cultures if relevant",
          "Procedures planned or done",
          "What the primary team is worried about",
        ],
      },
      {
        heading: "Daily Rounds Questions",
        items: [
          "What changed overnight?",
          "Is the kidney issue improving, worsening, or unchanged?",
          "Is there an urgent electrolyte, acid-base, volume, or dialysis issue?",
          "What decision does the team need from nephrology today?",
          "Which study sheet or inpatient consult guide matches this patient's issue?",
        ],
      },
      {
        heading: "When to Open an Inpatient Consult Guide",
        items: [
          "Use AKI for creatinine rise, oliguria, ATN/prerenal/obstruction framing, or dialysis-indication questions.",
          "Use Hyperkalemia or Hyponatremia for electrolyte emergencies and monitoring.",
          "Use Dialysis for chronic HD patients, missed treatments, access status, or urgent dialysis planning.",
          "Use GN when urine sediment, hematuria/proteinuria, or biopsy discussion is central.",
        ],
      },
    ],
    commonMistakes: [
      "Not checking I/Os",
      "Not checking trends",
      "Not knowing whether the consult question has changed",
      "Not knowing whether the patient got dialysis overnight",
    ],
    teachingPoints: [
      "Trends matter more than single values.",
      "Overnight interventions change interpretation.",
      "Your goal is to answer: what is different today?",
    ],
  },

  assessmentPlanWriting: {
    id: "assessmentPlanWriting",
    icon: "\u270D\uFE0F",
    title: "How to Write the Assessment and Plan",
    subtitle: "Turn data into a concise, useful nephrology note",
    whyItMatters:
      "Students often list data but do not synthesize it. The assessment should explain what the kidney problem is, why you think that, and what needs to happen next.",
    teachingPearl:
      "A good nephrology A/P states the problem, the trajectory, the leading mechanism, urgent complications, and the plan for today.",
    sections: [
      {
        heading: "General Formula",
        items: [
          "1. Name the problem",
          "2. Give the trajectory",
          "3. Give the leading mechanism / differential",
          "4. State urgent complications",
          "5. State what you recommend next",
        ],
      },
      {
        heading: "Actionable Plan Checklist",
        items: [
          "Monitoring: which labs, how often, and what threshold matters",
          "Medications: hold, start, continue, or dose-adjust with a reason",
          "Volume: fluids, diuretics, ultrafiltration, or observation",
          "Electrolytes / acid-base: treatment and reassessment plan",
          "Dialysis: indication present or absent, and what would change that",
          "Follow-up: what you need before tomorrow's rounds",
        ],
      },
      {
        heading: "Good A/P Language",
        items: [
          "\"AKI with creatinine rising from __ to __, likely due to __ based on __. Urine output is __. No current indication / current indication for dialysis because __. Recommend __.\"",
          "\"Hyperkalemia due to __ with/without ECG changes. Temporizing measures include __. Definitive K removal plan is __.\"",
          "\"ESRD on chronic HD, last dialyzed __ via __. Current issue is __. Plan for inpatient dialysis __ and monitor __.\"",
        ],
      },
    ],
    commonMistakes: [
      "Copying the HPI into the assessment",
      "Not stating the trend",
      "Not saying whether the issue is urgent",
      "Giving vague plans like monitor labs",
    ],
    teachingPoints: [
      "The assessment is your clinical argument.",
      "The plan should be specific enough to be actionable.",
    ],
  },

  consultFollowUp: {
    id: "consultFollowUp",
    icon: "\uD83D\uDD04",
    title: "Consult Follow-Up Guide",
    subtitle: "How to update the consult day by day without repeating the initial note",
    whyItMatters:
      "A follow-up note should show whether the consult question is improving, worsening, or changing.",
    teachingPearl: "Each follow-up note should answer: what changed since yesterday?",
    sections: [
      {
        heading: "Daily Update Checklist",
        items: [
          "Overnight events",
          "Creatinine trend",
          "Urine output trend",
          "Sodium / potassium / bicarbonate trend",
          "Volume response",
          "Dialysis performed or not",
          "Whether the differential changed",
          "Whether the main question has been answered",
          "Whether new urgent issues appeared",
        ],
      },
      {
        heading: "How to Structure a Follow-Up Note",
        items: [
          "1. Overnight events",
          "2. Kidney-relevant trend",
          "3. Response to interventions",
          "4. Current assessment",
          "5. Updated recommendations",
        ],
      },
      {
        heading: "Follow-Up Examples",
        items: [
          "\"Creatinine is __ from __ yesterday, urine output is __, and hemodynamics are __. Overall AKI appears __. No new dialysis indication / dialysis indication now present because __.\"",
          "\"Sodium has changed from __ to __ over __ hours. Symptoms are __. Current concern is appropriate correction / overcorrection risk.\"",
          "\"Underwent HD on __ with __ UF. Current respiratory status / edema / potassium is __. Next dialysis plan is __.\"",
        ],
      },
    ],
    commonMistakes: [
      "Rewriting the entire initial consult every day",
      "Not showing what changed",
      "Not updating whether the consult question remains active",
      "Not documenting response to yesterday's plan",
    ],
    teachingPoints: [
      "Follow-up notes should be shorter and more trend-focused than initial consults.",
      "The best follow-up notes explain response.",
    ],
  },
};
