// Friday Outpatient Nephrology Clinic Guides — pre-authored teaching content
//
// Each clinic week includes three outpatient learning tracks:
// CKD → Hypertension → Transplant.
// Content is guideline-based, educational, and not patient-specific.
// Guideline sources are listed in each guide's guidelineBasis field.

export const CLINIC_GUIDE_TOPICS = ["CKD", "Hypertension", "Transplant"] as const;
export type ClinicGuideTopic = (typeof CLINIC_GUIDE_TOPICS)[number];

export interface ClinicGuideTemplate {
  topic: ClinicGuideTopic;
  icon: string;
  title: string;
  subtitle: string;
  whyItMatters: string;
  teachingPearl: string;
  beforePresenting: string[];
  howToPresent: string;
  sections: { heading: string; items: string[] }[];
  commonMistakes: string[];
  teachingPoints: string[];
  discussionQuestions: string[];
  guidelineBasis: string[];
}

export const CLINIC_GUIDES: Record<ClinicGuideTopic, ClinicGuideTemplate> = {
  // ═══════════════════════════════════════════════════════════════════
  //  CKD CLINIC GUIDE
  // ═══════════════════════════════════════════════════════════════════
  CKD: {
    topic: "CKD",
    icon: "🫘",
    title: "CKD Outpatient Clinic Guide",
    subtitle: "Progression, complications, and kidney replacement therapy planning",

    whyItMatters:
      "CKD clinic visits focus on progression, symptom burden, renoprotection, complications, and preparation for dialysis or transplant. KDIGO 2024 emphasizes CKD classification by cause, GFR, and albuminuria, and recommends therapies that delay progression and reduce complications.",

    teachingPearl:
      "Dialysis is not started because of eGFR alone. Dialysis initiation is driven by symptoms, refractory complications, and inability to maintain volume, electrolyte, acid-base, or nutritional stability — not a single threshold number.",

    beforePresenting: [
      "Baseline creatinine / eGFR",
      "Current creatinine / eGFR",
      "Trend over time",
      "Albuminuria or proteinuria trend",
      "Blood pressure trend",
      "Weight trend",
      "Potassium and bicarbonate trend",
      "Calcium, phosphorus, PTH, vitamin D if relevant",
      "Hemoglobin and iron studies if relevant",
      "Current renoprotective meds",
      "Whether modality education, access planning, and transplant referral have happened",
    ],

    howToPresent:
      "\"This is a patient with CKD stage __, likely due to __, with creatinine/eGFR trend from __ to __ over __ and albuminuria of __. Main issues today are progression risk, BP control, volume status, electrolytes/acidosis, anemia and CKD-MBD, and dialysis or transplant planning. They do/do not have symptoms concerning for uremia. Current kidney-protective therapies include __.\"",

    sections: [
      {
        heading: "Must-Ask History",
        items: [
          "Energy / fatigue",
          "Appetite, nausea, vomiting, weight loss",
          "Edema, dyspnea, orthopnea",
          "Urinary changes",
          "Home BP if available",
          "Medication adherence",
          "NSAID exposure / nephrotoxins",
          "Whether dialysis education or transplant discussion has happened",
        ],
      },
      {
        heading: "Ask If Relevant",
        items: [
          "Pruritus",
          "Sleep disturbance / restless legs",
          "Cognitive change",
          "Muscle cramps",
          "Recent PICC / IV use in potential access arm",
        ],
      },
      {
        heading: "Exam Focus",
        items: [
          "BP",
          "Volume exam",
          "Edema",
          "Pulmonary findings",
          "Pallor / excoriations",
          "Asterixis or mental status changes if advanced disease",
          "AVF/AVG exam if present",
        ],
      },
      {
        heading: "Labs / Data to Review",
        items: [
          "eGFR and creatinine trend",
          "Albuminuria / proteinuria trend",
          "Potassium",
          "Bicarbonate — review the trend; KDIGO 2024 advises considering treatment to prevent clinically important acidosis, with serum bicarbonate <18 mmol/L in adults as a practical threshold where treatment should be considered",
          "Sodium",
          "Hemoglobin / iron studies when relevant",
          "Calcium / phosphorus / PTH / vitamin D when relevant",
          "Medication list and dose appropriateness",
          "SGLT2 inhibitor status — KDIGO 2024 recommends initiating at eGFR ≥20 mL/min/1.73 m² in appropriate patients and continuing below that if tolerated until kidney replacement therapy begins",
        ],
      },
    ],

    commonMistakes: [
      "Presenting only today's creatinine without the trend",
      "Not mentioning albuminuria",
      "Not asking about symptoms of uremia",
      "Not reviewing kidney-protective meds",
      "Treating eGFR as the dialysis trigger",
      "Forgetting access / transplant planning in advanced CKD",
    ],

    teachingPoints: [
      "Always present the trend, not the isolated value.",
      "Advanced CKD visits should include complication review and preparation, not just lab review.",
      "SGLT2 and RAAS-based therapy are part of disease-modifying treatment in appropriate patients.",
    ],

    discussionQuestions: [
      "A patient with CKD stage 4 (eGFR 18, stable) has no uremic symptoms but is losing weight and has declining albumin. How would you approach dialysis planning for this patient?",
      "A patient is referred with CKD stage 5 (eGFR 10) and has a PICC line in the left arm from a recent hospitalization. What concerns does this raise, and how would you counsel the patient going forward?",
    ],

    guidelineBasis: [
      "KDIGO 2024 Clinical Practice Guideline for CKD Evaluation and Management",
      "KDIGO 2021 Clinical Practice Guideline for Blood Pressure Management in CKD",
      "IDEAL Trial (NEJM 2010) — timing of dialysis initiation",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  TRANSPLANT CLINIC GUIDE
  // ═══════════════════════════════════════════════════════════════════
  Transplant: {
    topic: "Transplant",
    icon: "💊",
    title: "Kidney Transplant Clinic Essentials",
    subtitle: "Graft surveillance, immunosuppression review, and complication monitoring",

    whyItMatters:
      "Post-transplant visits are about detecting graft dysfunction, reviewing immunosuppression adherence and toxicity, and screening for infection and malignancy.",

    teachingPearl:
      "A drug level is useful only in context. The regimen, time from transplant, baseline graft function, adherence, interacting drugs, and whether the level was a true trough matter as much as the number itself.",

    beforePresenting: [
      "Transplant date",
      "Donor type if known",
      "Baseline creatinine",
      "Current creatinine trend",
      "Immunosuppression regimen and doses",
      "Timing of last tacrolimus/cyclosporine dose",
      "Whether the level was a true trough",
      "Proteinuria",
      "BK / CMV data if available",
      "Recent infections or admissions",
      "New medications",
      "BP trend",
    ],

    howToPresent:
      "\"This is a kidney transplant recipient __ months/years post-transplant, on __ immunosuppression. Baseline creatinine is __ and current trend is __. Tacrolimus/cyclosporine level was __ and was/was not drawn as a true trough. Main issues today are graft stability, adherence, infection surveillance, medication toxicity, BP/proteinuria, and malignancy screening.\"",

    sections: [
      {
        heading: "Must-Ask History",
        items: [
          "Missed doses",
          "Exact timing of last CNI dose",
          "Infectious symptoms",
          "GI symptoms",
          "New medications or supplements",
          "Tremor / headache / neuro symptoms",
          "Urinary symptoms",
          "Graft pain",
          "New skin lesions",
        ],
      },
      {
        heading: "Exam Focus",
        items: [
          "BP",
          "Edema",
          "Graft tenderness if relevant",
          "Tremor",
          "Skin lesions / nonhealing lesions",
        ],
      },
      {
        heading: "Labs / Data to Review",
        items: [
          "Creatinine trend",
          "Proteinuria",
          "Drug level and timing validity",
          "CBC / metabolic profile",
          "BK / CMV per center practice",
          "Glucose / lipids as relevant",
        ],
      },
    ],

    commonMistakes: [
      "Reacting to one tacrolimus level without checking timing",
      "Not asking about adherence",
      "Ignoring interacting medications",
      "Not presenting baseline graft function",
      "Not mentioning proteinuria",
      "Treating center-specific protocols as universal rules",
    ],

    teachingPoints: [
      "Always state whether the trough was real.",
      "Immunosuppression targets are center-specific.",
      "New creatinine rise can reflect rejection, drug toxicity, volume issues, obstruction, or infection.",
    ],

    discussionQuestions: [
      "A patient 8 months post-transplant has a rising creatinine (1.4 → 1.8 over 2 months) with a tacrolimus trough of 11 ng/mL. What is your differential diagnosis, and how would you approach this?",
      "A transplant recipient reports persistent diarrhea for 3 weeks. Their mycophenolate dose is at the standard level. How would you evaluate and manage this — and when would you consider a dose change vs further workup?",
    ],

    guidelineBasis: [
      "KDIGO 2009 Clinical Practice Guideline for the Care of the Kidney Transplant Recipient",
      "SYMPHONY Trial (NEJM 2007) — low-dose tacrolimus-based regimens",
      "BENEFIT Trial (AJT 2016) — belatacept vs cyclosporine long-term outcomes",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  HYPERTENSION CLINIC GUIDE
  // ═══════════════════════════════════════════════════════════════════
  Hypertension: {
    topic: "Hypertension",
    icon: "🩺",
    title: "Outpatient Hypertension Clinic Essentials",
    subtitle: "Home BP patterns, medication strategy, and secondary cause recognition",

    whyItMatters:
      "Hypertension is a major driver of CKD progression and cardiovascular risk. KDIGO 2021 emphasizes standardized office measurement and supports a target SBP under 120 mmHg for many non-dialysis CKD patients, while broader hypertension care often uses a practical goal under 130/80 mmHg.",

    teachingPearl:
      "Do not escalate therapy from one office reading if you do not know the home BP pattern.",

    beforePresenting: [
      "Home BP log",
      "Office BP today",
      "BP technique quality",
      "Current meds and doses",
      "Adherence",
      "Side effects",
      "Orthostatic symptoms",
      "Potassium / creatinine",
      "Albuminuria / CKD status",
      "Contributors: NSAIDs, stimulants, alcohol, OSA clues",
    ],

    howToPresent:
      "\"This is a patient with hypertension on __ medications. Home BPs average __ and office BP today is __. Technique and adherence are __. They do/do not have orthostatic symptoms. Main questions are whether BP is truly uncontrolled, whether pseudoresistance is present, whether CKD or proteinuria affects medication choice, and whether secondary causes need workup.\"",

    sections: [
      {
        heading: "Must-Ask History",
        items: [
          "Home BPs",
          "How BP is measured (technique)",
          "Adherence",
          "Side effects",
          "Orthostasis / falls",
          "NSAIDs / OTCs / stimulants",
          "Alcohol",
          "Snoring / apnea symptoms if resistant",
        ],
      },
      {
        heading: "Exam Focus",
        items: [
          "Repeat BP if needed",
          "Orthostatics when relevant",
          "Edema",
          "Bilateral arm BP if indicated",
          "Bruits only if clinically relevant",
        ],
      },
      {
        heading: "Labs / Data to Review",
        items: [
          "Creatinine / eGFR",
          "Potassium",
          "Sodium",
          "Bicarbonate",
          "Albuminuria",
          "Secondary workup only if clinically indicated",
        ],
      },
    ],

    commonMistakes: [
      "Escalating based on office BP alone",
      "Not checking home technique",
      "Not checking adherence",
      "Not checking orthostatic symptoms",
      "Ordering shotgun secondary HTN workups",
      "Forgetting CKD/proteinuria affects drug choice",
    ],

    teachingPoints: [
      "Home BP data matter more than office readings.",
      "For most adults, a practical treatment goal is under 130/80 mmHg; in CKD, KDIGO supports standardized office SBP under 120 mmHg for many non-dialysis patients when tolerated.",
      "Resistant HTN starts with confirming adherence, dose adequacy, and measurement validity.",
    ],

    discussionQuestions: [
      "A patient is on lisinopril 40 mg, amlodipine 10 mg, and chlorthalidone 25 mg, but home BPs average 155/95. What is your systematic approach to evaluating and managing this patient's resistant hypertension?",
      "A 28-year-old woman is referred for new-onset hypertension with BPs around 160/100 and a potassium of 3.2 mEq/L. What secondary causes would you consider, and how would you prioritize your workup?",
    ],

    guidelineBasis: [
      "ACC/AHA 2025 Guideline for High Blood Pressure in Adults",
      "KDIGO 2021 Clinical Practice Guideline for Blood Pressure Management in CKD",
      "Endocrine Society 2025 Guideline for Primary Aldosteronism",
      "PATHWAY-2 Trial (Lancet 2015) — spironolactone for resistant hypertension",
    ],
  },
};

export const CLINIC_GUIDE_FOOTER =
  "Educational clinic guide for student teaching. Not a substitute for individualized clinical judgment.";
