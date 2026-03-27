// Rotation-focused teaching guides — structured for presentation, pre-rounding, and clinical reasoning

export type RotationGuideId =
  | "howToPresentConsult"
  | "preRoundingChecklist"
  | "esrdInpatient"
  | "dialysisAccess"
  | "urineStudiesSediment"
  | "kidneyBiopsy"
  | "electrolyteEmergencies"
  | "commonNephMeds"
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
  "esrdInpatient",
  "dialysisAccess",
  "urineStudiesSediment",
  "kidneyBiopsy",
  "electrolyteEmergencies",
  "commonNephMeds",
  "assessmentPlanWriting",
  "consultFollowUp",
];

export const ROTATION_GUIDES: Record<RotationGuideId, RotationGuideTemplate> = {
  // ─── 1. How to Present a Nephrology Consult ───────────────────────
  howToPresentConsult: {
    id: "howToPresentConsult",
    icon: "\uD83C\uDFA4",
    title: "How to Present a Nephrology Consult",
    subtitle: "How to sound organized, clinically relevant, and useful on rounds",
    whyItMatters:
      "Students often know facts but do not know how to package them. A good nephrology presentation is brief, trend-based, and centered on the consult question.",
    teachingPearl:
      "Do not present isolated numbers. Present trajectory, physiology, and the decision point.",
    sections: [
      {
        heading: "Before Presenting, Gather This",
        items: [
          "Consult question",
          "Baseline creatinine if available",
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
        heading: "Mini Template \u2014 AKI",
        items: [
          "\"Consulted for AKI. Baseline creatinine is __, now __, with urine output __. Hemodynamics are __. Exposures include __. UA shows __. Differential is prerenal vs ATN vs obstruction vs glomerular process.\"",
        ],
      },
      {
        heading: "Mini Template \u2014 Hyponatremia",
        items: [
          "\"Consulted for hyponatremia. Sodium is __ with serum osmolality __, urine osmolality __, and urine sodium __. Symptoms are __. The main issue is __ physiology and whether urgent hypertonic therapy is needed.\"",
        ],
      },
      {
        heading: "Mini Template \u2014 Hyperkalemia",
        items: [
          "\"Consulted for hyperkalemia. Potassium is __ with/without ECG changes. Temporizing therapy given includes __. Ongoing driver appears to be __. Definitive removal plan is __.\"",
        ],
      },
      {
        heading: "Mini Template \u2014 ESRD Inpatient",
        items: [
          "\"Consulted for dialysis management in a chronic HD patient on a __ schedule, last dialyzed __, access __, current issue __.\"",
        ],
      },
      {
        heading: "Mini Template \u2014 GN / Active Sediment",
        items: [
          "\"Consulted for AKI with hematuria/proteinuria. Creatinine changed from __ to __, urine sediment shows __, and the main concern is a glomerular process such as __.\"",
        ],
      },
    ],
    commonMistakes: [
      "Starting with a long PMH instead of the consult question",
      "Not knowing baseline creatinine",
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

  // ─── 2. Pre-Rounding Checklist for Nephrology ────────────────────
  preRoundingChecklist: {
    id: "preRoundingChecklist",
    icon: "\u2705",
    title: "Pre-Rounding Checklist for Nephrology",
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
        heading: "AKI Patient Checklist",
        items: [
          "Baseline Cr",
          "Current trend",
          "Urine output",
          "Hemodynamics",
          "Nephrotoxins / contrast",
          "UA / sediment",
          "Renal ultrasound if unexplained",
        ],
      },
      {
        heading: "ESRD Patient Checklist",
        items: [
          "Outpatient schedule",
          "Last HD",
          "Access type",
          "Dry weight if known",
          "Missed sessions",
          "HyperK / volume status",
          "Access problems / fever / bacteremia concern",
        ],
      },
      {
        heading: "Hyponatremia Patient Checklist",
        items: [
          "Sodium trend",
          "Serum osm",
          "Urine osm",
          "Urine sodium",
          "Fluids given",
          "Correction rate last 24 hours",
        ],
      },
      {
        heading: "Transplant Patient Checklist",
        items: [
          "Baseline graft function",
          "Current creatinine",
          "Immunosuppression regimen",
          "Trough timing",
          "BK / CMV if relevant",
          "Infectious symptoms",
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
      "Your goal is to answer, \u201CWhat is different today?\u201D",
    ],
  },

  // ─── 3. ESRD Inpatient Management Guide ──────────────────────────
  esrdInpatient: {
    id: "esrdInpatient",
    icon: "\uD83C\uDFE5",
    title: "ESRD Inpatient Management Guide",
    subtitle: "How to evaluate the hospitalized chronic dialysis patient",
    whyItMatters:
      "A hospitalized ESRD patient has a different consult structure from AKI. The main questions are usually schedule, access, volume, potassium, infection, and whether inpatient dialysis needs differ from the outpatient routine.",
    teachingPearl:
      "Do not present an ESRD patient like an AKI patient. The question is usually not \u201Cwhy is creatinine high?\u201D It is \u201Cwhat problem does dialysis need to solve today?\u201D",
    sections: [
      {
        heading: "Before Rounds, Gather This",
        items: [
          "Outpatient dialysis schedule",
          "Last dialysis session",
          "Access type",
          "Dry weight if known",
          "Missed treatments",
          "Current weight",
          "Potassium / bicarbonate / BUN",
          "Volume status / oxygen requirement",
          "Access symptoms",
          "Fever / bacteremia concern",
          "Usual unit if known",
        ],
      },
      {
        heading: "How to Present This Patient",
        items: [
          "\"This is a chronic dialysis patient on a __ schedule, last dialyzed __, with access __. The main inpatient issues are __. Current labs show __ and volume status is __. The key question today is whether they need dialysis now, whether the prescription needs adjustment, and whether there is any access or infection issue.\"",
        ],
      },
      {
        heading: "Must-Ask Questions",
        items: [
          "When was last dialysis?",
          "Any missed treatments?",
          "What access is used?",
          "Any access pain, swelling, bleeding, poor flow?",
          "Any fever or chills?",
          "Usual dry weight?",
          "Shortness of breath, edema, cramps, hypotension?",
        ],
      },
      {
        heading: "Common Inpatient Issues",
        items: [
          "Missed dialysis",
          "Hyperkalemia",
          "Pulmonary edema / volume overload",
          "Access dysfunction",
          "Catheter infection / bacteremia",
          "Inpatient procedure scheduling around HD",
          "Medication reconciliation",
        ],
      },
      {
        heading: "Assessment / Plan Framework",
        items: [
          "1. ESRD on chronic dialysis, outpatient schedule and last treatment",
          "2. Access type and status",
          "3. Volume status",
          "4. Electrolytes / acid-base",
          "5. Current indication for dialysis or not",
          "6. Infection concerns",
          "7. Inpatient dialysis plan",
        ],
      },
    ],
    commonMistakes: [
      "Focusing on creatinine instead of the acute problem",
      "Not knowing last dialysis",
      "Not knowing access type",
      "Not asking about dry weight",
      "Overlooking access infection",
    ],
    teachingPoints: [
      "ESRD inpatient notes should be access- and indication-focused.",
      "Always mention the last dialysis session.",
      "In catheter patients, fever means you must think about line infection.",
    ],
  },

  // ─── 4. Dialysis Access Guide ────────────────────────────────────
  dialysisAccess: {
    id: "dialysisAccess",
    icon: "\uD83E\uDE7A",
    title: "Dialysis Access Guide",
    subtitle: "AV fistulas, grafts, catheters, and what students should recognize",
    whyItMatters:
      "Access is central to dialysis care. KDOQI 2019 emphasizes individualized access planning through an ESKD Life-Plan rather than a rigid universal rule, but native AV access is still generally preferred when feasible because tunneled catheters carry higher infection and complication risk.",
    teachingPearl:
      "Every dialysis patient should have their access identified and examined.",
    sections: [
      {
        heading: "Access Types",
        items: [
          "AV fistula (AVF): native artery-to-vein connection",
          "AV graft (AVG): synthetic conduit",
          "Tunneled dialysis catheter (TDC): central venous catheter for dialysis",
        ],
      },
      {
        heading: "How to Present Access",
        items: [
          "\"Access is a __ located at __. On exam there is/is not a thrill and bruit. There are/are not signs of infection, bleeding, swelling, or suspected dysfunction.\"",
        ],
      },
      {
        heading: "How to Examine an AVF / AVG",
        items: [
          "Inspect for erythema, swelling, ulceration, bleeding",
          "Palpate for thrill",
          "Auscultate for bruit",
          "Ask about prolonged bleeding, difficult cannulation, low flow alarms",
        ],
      },
      {
        heading: "Concerning Findings",
        items: [
          "Absent thrill",
          "New pain or swelling",
          "Erythema / drainage / fever",
          "Hand ischemia symptoms",
          "Prolonged bleeding",
          "Repeated dialysis flow problems",
        ],
      },
      {
        heading: "Catheter Red Flags",
        items: [
          "Fever / chills",
          "Tunnel tenderness",
          "Exit-site drainage",
          "Poor flows",
          "Catheter exposure or damage",
        ],
      },
      {
        heading: "Vein Preservation",
        items: [
          "KDOQI and CKD planning principles support protecting future access options",
          "Avoid unnecessary PICCs and repeated venipuncture in potential access arms when possible",
          "In advanced CKD (stage 4\u20135), proactively discuss access planning",
        ],
      },
    ],
    commonMistakes: [
      "Not knowing access type",
      "Not examining the access",
      "Not documenting thrill/bruit",
      "Ignoring catheter infection risk",
      "Forgetting vein preservation in advanced CKD",
    ],
    teachingPoints: [
      "\u201CWhat access do they have?\u201D should be routine.",
      "An absent thrill is urgent.",
      "Catheters are high-risk access.",
    ],
  },

  // ─── 5. Urine Studies and Urine Sediment Guide ───────────────────
  urineStudiesSediment: {
    id: "urineStudiesSediment",
    icon: "\uD83D\uDD2C",
    title: "Urine Studies and Urine Sediment Guide",
    subtitle: "When urine data clarify the consult and when they do not",
    whyItMatters:
      "Urine data can quickly narrow a differential, but they are often misused.",
    teachingPearl:
      "Urine studies are helpful only when interpreted in clinical context.",
    sections: [
      {
        heading: "Core Urine Tools",
        items: [
          "UA (urinalysis)",
          "Urine microscopy",
          "Urine sodium",
          "Urine creatinine",
          "FEUrea or FENa in selected cases",
          "Urine protein quantification (UPCR or UACR)",
        ],
      },
      {
        heading: "Start with the UA",
        items: [
          "Protein?",
          "Blood?",
          "Leukocytes / nitrites?",
          "Specific gravity?",
          "Glucose / ketones if relevant?",
        ],
      },
      {
        heading: "When Microscopy Matters",
        items: [
          "Suspected ATN",
          "Suspected GN",
          "Nephrotic / nephritic process",
          "Crystal disease",
          "Interstitial nephritis",
        ],
      },
      {
        heading: "Sediment Pearls",
        items: [
          "Muddy brown granular casts suggest tubular injury",
          "RBC casts strongly support glomerular bleeding",
          "WBC casts suggest interstitial or pyelonephritic processes",
          "Crystals can change the differential in the right setting",
        ],
      },
      {
        heading: "FENa / FEUrea",
        items: [
          "Use FENa cautiously \u2014 less reliable with CKD, diuretics, contrast exposure, and mixed physiology",
          "FEUrea may be more useful in some diuretic-exposed patients",
          "Neither test replaces clinical assessment",
        ],
      },
      {
        heading: "How to Present Urine Findings",
        items: [
          "\"UA shows __ and microscopy shows __. These findings support __ more than __.\"",
        ],
      },
    ],
    commonMistakes: [
      "Ordering urine studies without asking what question they answer",
      "Overcalling FENa",
      "Not looking at microscopy",
      "Reporting blood on dipstick without sediment context",
      "Not quantifying proteinuria when GN is possible",
    ],
    teachingPoints: [
      "The urine is often the shortest path to the right bucket.",
      "Microscopy can change urgency.",
      "Sediment should be presented, not just listed.",
    ],
  },

  // ─── 6. Kidney Biopsy Guide ──────────────────────────────────────
  kidneyBiopsy: {
    id: "kidneyBiopsy",
    icon: "\uD83E\uDE78",
    title: "Kidney Biopsy Guide",
    subtitle: "When biopsy is considered and how students should present it",
    whyItMatters:
      "Biopsy is often the key diagnostic step in glomerular disease, unexplained AKI, or selected transplant and proteinuric presentations. KDIGO 2024 includes kidney biopsy as an important diagnostic tool in selected CKD evaluations and reviewed biopsy safety data in its supporting materials.",
    teachingPearl:
      "Do not say, \u201CThe patient needs a biopsy.\u201D Say, \u201CBiopsy may be considered because the diagnosis remains uncertain and the result could change management.\u201D",
    sections: [
      {
        heading: "When Biopsy May Be Discussed",
        items: [
          "Unexplained AKI with concern for intrinsic disease",
          "Suspected GN",
          "Significant unexplained proteinuria",
          "Nephrotic syndrome",
          "Selected transplant dysfunction cases",
          "Unclear CKD etiology when histology would change management",
        ],
      },
      {
        heading: "Before Presenting a Possible Biopsy Candidate",
        items: [
          "Creatinine trend",
          "Protein quantification",
          "Urine sediment",
          "Serologies",
          "Blood pressure",
          "Platelet count",
          "Hemoglobin",
          "Coagulation status / anticoagulants",
          "Kidney imaging",
          "Whether the result would change management",
        ],
      },
      {
        heading: "How to Present This Issue",
        items: [
          "\"Biopsy may be considered because the patient has __ and the main unresolved question is __. The result could change management by __. Bleeding risk factors include __.\"",
        ],
      },
      {
        heading: "Common Cautions",
        items: [
          "Uncontrolled hypertension",
          "Anticoagulation / antiplatelet issues",
          "Thrombocytopenia",
          "Anatomic limitations",
          "Severe infection / instability depending on context",
        ],
      },
    ],
    commonMistakes: [
      "Suggesting biopsy without saying what question it would answer",
      "Not checking bleeding risk",
      "Not quantifying proteinuria",
      "Not reviewing imaging first",
    ],
    teachingPoints: [
      "Biopsy is a diagnostic tool, not a ritual.",
      "The best biopsy presentations explain why histology will matter.",
      "Always think risk versus expected value.",
    ],
  },

  // ─── 7. Electrolyte Emergencies Quick Guide ──────────────────────
  electrolyteEmergencies: {
    id: "electrolyteEmergencies",
    icon: "\u26A1",
    title: "Electrolyte Emergencies Quick Guide",
    subtitle: "What needs escalation now",
    whyItMatters:
      "Some electrolyte problems become dangerous because of neurologic or cardiac effects, not just because the number is abnormal.",
    teachingPearl:
      "The emergency is determined by symptoms, ECG, rate of change, and context, not the lab value alone.",
    sections: [
      {
        heading: "Hyperkalemia \u2014 Escalate Immediately If",
        items: [
          "ECG changes",
          "Weakness / paralysis",
          "Rapidly rising K",
          "ESRD with missed dialysis",
          "Refractory K despite temporizing therapy",
        ],
      },
      {
        heading: "Hyponatremia \u2014 Escalate Immediately If",
        items: [
          "Seizure",
          "Severe AMS",
          "Acute drop",
          "Concern for brain edema",
          "Fast correction after treatment starts",
        ],
      },
      {
        heading: "Hypernatremia \u2014 Escalate If",
        items: [
          "Severe neurologic symptoms",
          "Rapid rise",
          "Inability to match water losses",
          "Major free-water deficit with ongoing losses",
        ],
      },
      {
        heading: "Severe Metabolic Acidosis \u2014 Escalate If",
        items: [
          "Worsening shock",
          "Severe acidemia",
          "Refractory hyperkalemia",
          "Impending or actual dialysis indication",
        ],
      },
      {
        heading: "Dialysis-Access Emergency \u2014 Escalate If",
        items: [
          "Absent thrill",
          "Major bleeding",
          "Suspected access infection with instability",
          "Catheter malfunction in a patient needing urgent dialysis",
        ],
      },
    ],
    commonMistakes: [
      "Reacting to numbers before checking symptoms and ECG",
      "Underestimating overcorrection risk in hyponatremia",
      "Assuming dialysis access issues can wait",
    ],
    teachingPoints: [
      "Every electrolyte emergency needs a physiology explanation and a monitoring plan.",
      "Know what needs immediate attending notification.",
    ],
  },

  // ─── 8. Common Nephrology Medications Guide ──────────────────────
  commonNephMeds: {
    id: "commonNephMeds",
    icon: "\uD83D\uDC8A",
    title: "Common Nephrology Medications Guide",
    subtitle: "What students should recognize, monitor, and mention",
    whyItMatters:
      "Students are more useful when they can connect medications to physiology, labs, and common side effects.",
    teachingPearl: "Know what problem the medication is trying to solve.",
    sections: [
      {
        heading: "Loop Diuretics",
        items: [
          "Purpose: volume management",
          "Watch: urine output, volume response, potassium, creatinine",
        ],
      },
      {
        heading: "Thiazides / Chlorthalidone",
        items: [
          "Purpose: BP, sometimes synergy with loops",
          "Watch: sodium, potassium, volume depletion",
        ],
      },
      {
        heading: "ACEi / ARB",
        items: [
          "Purpose: BP and proteinuria reduction",
          "Watch: potassium, creatinine",
          "Presentation point: say whether albuminuria makes them especially relevant",
        ],
      },
      {
        heading: "SGLT2 Inhibitors",
        items: [
          "KDIGO 2024 recommends them broadly for appropriate CKD populations",
          "Generally supports initiation at eGFR \u226520 mL/min/1.73 m\u00B2 with continuation below that threshold if tolerated until KRT begins",
          "Watch: volume status, genital mycotic infections, ketoacidosis risk in select patients",
        ],
      },
      {
        heading: "Potassium Binders",
        items: [
          "Purpose: chronic or subacute K removal",
          "Presentation point: do not confuse with temporizing ED therapies (insulin/glucose, albuterol, calcium)",
        ],
      },
      {
        heading: "Sodium Bicarbonate / Citrate",
        items: [
          "Purpose: metabolic acidosis management in selected patients",
          "KDIGO 2024 advises considering treatment to prevent clinically important acidosis, with bicarbonate <18 mmol/L in adults as a practical threshold where treatment should be considered",
        ],
      },
      {
        heading: "Phosphate Binders",
        items: [
          "Purpose: phosphorus control in selected CKD/ESKD settings",
          "Teaching point: adherence is often the limiting issue",
        ],
      },
      {
        heading: "ESA / Iron",
        items: [
          "Purpose: anemia management in CKD/ESKD",
          "Student role: know Hb trend, iron status, and whether anemia is likely CKD-related",
          "Monitor: Hb, ferritin, TSAT; avoid overshooting Hb target",
        ],
      },
      {
        heading: "Tacrolimus / Cyclosporine / MMF",
        items: [
          "Purpose: transplant maintenance immunosuppression",
          "Student role: know dose timing, trough timing, infection symptoms, GI and neuro side effects",
          "Never independently adjust immunosuppression \u2014 always discuss with the transplant team",
        ],
      },
    ],
    commonMistakes: [
      "Not linking meds to the problem list",
      "Not checking labs that matter for the medication",
      "Recommending dose changes too confidently",
      "Ignoring interaction risk in transplant patients",
    ],
    teachingPoints: [
      "Meds belong inside the physiology.",
      "Present why the patient is on it and what you are monitoring.",
    ],
  },

  // ─── 9. How to Write the Assessment and Plan in Nephrology ───────
  assessmentPlanWriting: {
    id: "assessmentPlanWriting",
    icon: "\u270D\uFE0F",
    title: "How to Write the Assessment and Plan in Nephrology",
    subtitle: "Turn data into a concise, useful nephrology note",
    whyItMatters: "Students often list data but do not synthesize it.",
    teachingPearl:
      "A good nephrology A/P states: what the kidney problem is, why you think that, and what needs to happen next.",
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
        heading: "Template \u2014 AKI",
        items: [
          "\"AKI with creatinine rising from __ to __, likely due to __ based on __. Urine output is __. No current indication / current indication for dialysis because __. Recommend __.\"",
        ],
      },
      {
        heading: "Template \u2014 CKD",
        items: [
          "\"CKD stage __ likely due to __ with current renal function trend __ and albuminuria __. Main active issues are __. Recommend __.\"",
        ],
      },
      {
        heading: "Template \u2014 Hyponatremia",
        items: [
          "\"Hypotonic hyponatremia likely due to __ with sodium trend __ and symptoms __. Major immediate concern is __. Recommend __ with close monitoring to avoid overcorrection.\"",
        ],
      },
      {
        heading: "Template \u2014 Hyperkalemia",
        items: [
          "\"Hyperkalemia due to __ with/without ECG changes. Temporizing measures include __. Definitive K removal plan is __.\"",
        ],
      },
      {
        heading: "Template \u2014 ESRD Inpatient",
        items: [
          "\"ESRD on chronic HD, last dialyzed __ via __. Current issue is __. Plan for inpatient dialysis __ and monitor __.\"",
        ],
      },
      {
        heading: "Template \u2014 GN Concern",
        items: [
          "\"AKI with hematuria/proteinuria and active sediment concerning for glomerular disease. Key supporting data include __. Recommend expedited serologic workup and discussion of biopsy with the team.\"",
        ],
      },
    ],
    commonMistakes: [
      "Copying the HPI into the assessment",
      "Not stating the trend",
      "Not saying whether the issue is urgent",
      "Giving vague plans like \u201Cmonitor labs\u201D",
    ],
    teachingPoints: [
      "The assessment is your clinical argument.",
      "The plan should be specific enough to be actionable.",
    ],
  },

  // ─── 10. Nephrology Consult Follow-Up Guide ─────────────────────
  consultFollowUp: {
    id: "consultFollowUp",
    icon: "\uD83D\uDD04",
    title: "Nephrology Consult Follow-Up Guide",
    subtitle: "How to update the consult day by day without repeating the initial note",
    whyItMatters:
      "A follow-up note should show whether the consult question is improving, worsening, or changing.",
    teachingPearl: "Each follow-up note should answer: What changed since yesterday?",
    sections: [
      {
        heading: "Daily Update Checklist",
        items: [
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
        heading: "Example \u2014 AKI Follow-Up",
        items: [
          "\"Creatinine is __ from __ yesterday, urine output is __, and hemodynamics are __. Overall AKI appears __. No new dialysis indication / dialysis indication now present because __.\"",
        ],
      },
      {
        heading: "Example \u2014 Hyponatremia Follow-Up",
        items: [
          "\"Sodium has changed from __ to __ over __ hours. Symptoms are __. Current concern is appropriate correction / overcorrection risk.\"",
        ],
      },
      {
        heading: "Example \u2014 ESRD Follow-Up",
        items: [
          "\"Underwent HD on __ with __ UF. Current respiratory status / edema / potassium is __. Next dialysis plan is __.\"",
        ],
      },
    ],
    commonMistakes: [
      "Rewriting the entire initial consult every day",
      "Not showing what changed",
      "Not updating whether the consult question remains active",
      "Not documenting response to yesterday\u2019s plan",
    ],
    teachingPoints: [
      "Follow-up notes should be shorter and more trend-focused than initial consults.",
      "The best follow-up notes explain response.",
    ],
  },
};
