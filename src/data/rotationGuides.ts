// Rotation workflow guides: new-consult workup, presentation, and daily follow-up.
// Topic-specific clinical details belong in inpatient consult guides and quick references.

export type RotationGuideId =
  | "initialConsultWorkup"
  | "initialConsultPresentation"
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
  "initialConsultWorkup",
  "initialConsultPresentation",
  "consultFollowUp",
];

export const ROTATION_GUIDES: Record<RotationGuideId, RotationGuideTemplate> = {
  initialConsultWorkup: {
    id: "initialConsultWorkup",
    icon: "\uD83D\uDD0D",
    title: "Initial Consult: Workup",
    subtitle: "What to gather before you see a new nephrology consult",
    whyItMatters:
      "The best consult presentations start before the bedside. A careful nephrology workup gives you the kidney trajectory, the likely physiology, and the urgent decisions before you start talking.",
    teachingPearl:
      "Do not anchor on today's creatinine alone. Find the baseline, the trend, the urine, the hemodynamics, and the exposures.",
    sections: [
      {
        heading: "Before You See the Patient - Kidney & Lab Data",
        items: [
          "Consult question: why was nephrology called, and what decision does the team need?",
          "Baseline creatinine/eGFR from prior records, outside labs, dialysis records, or clinic notes.",
          "Current creatinine trend: baseline -> admission -> peak -> current, with timing.",
          "Urine output: last shift, last 24 hours, Foley status, and whether oliguria is real.",
          "BP and hemodynamics: hypotension, shock, pressors, sepsis, bleeding, heart failure, or cirrhosis physiology.",
          "Electrolytes and acid-base: potassium, sodium, bicarbonate, chloride, calcium, phosphorus, magnesium, anion gap.",
          "UA and urine studies: dipstick, microscopy, urine Na/Cr/urea/osm, protein quantification if relevant.",
          "Imaging: renal ultrasound/CT, obstruction clues, kidney size, hydronephrosis, and recent iodinated contrast exposure.",
        ],
      },
      {
        heading: "Before You See the Patient - Patient History",
        items: [
          "Outpatient nephrologist, known CKD stage, prior AKI episodes, proteinuria/hematuria history, and prior biopsy if any.",
          "MAR review for nephrotoxins: NSAIDs, ACEi/ARB, diuretics, contrast, aminoglycosides, vancomycin, amphotericin, PPIs, chemotherapy, calcineurin inhibitors. Open Quick Reference -> Nephrotoxic Drugs if you need a checklist.",
          "PMH, PSH, home medications, allergies, and family history relevant to kidney disease.",
          "NSAID history: prescription, OTC ibuprofen/naproxen, combination pain products, and duration.",
          "Volume history: poor intake, vomiting/diarrhea, bleeding, diuretics, edema, dyspnea, weight change, IV fluids, or resuscitation.",
          "Recent infections, antibiotics, fevers, rashes, procedures, hospitalizations, and immune triggers.",
        ],
      },
      {
        heading: "For Dialysis Patients, Also Gather",
        items: [
          "Dialysis clinic and outpatient nephrologist.",
          "Modality and vintage: HD, PD, home HD, CRRT history, and how long they have been dialysis-dependent.",
          "Access exam prep: AVF/AVG location, tunneled catheter site, PD catheter site, and reported access problems.",
          "Estimated dry weight, usual ultrafiltration, interdialytic weight gain, and inpatient weight trend.",
          "Last dialysis session: date, duration, UF, complications, and whether the treatment was completed.",
          "Recent dialysis issues: hypotension, cramps, hyperkalemia, missed treatments, infection, access alarms, or clotting.",
          "Residual urine output and whether they still use diuretics.",
        ],
      },
      {
        heading: "The Focused Nephrology Exam",
        items: [
          "Vitals: BP trend, MAP, fever, HR, oxygen requirement, and orthostatics if relevant.",
          "JVD: flat, normal, elevated, or difficult to assess.",
          "Lungs: crackles, wheeze, work of breathing, and oxygen device.",
          "Heart: rhythm, murmurs, rubs, and perfusion.",
          "Abdomen: distension, tenderness, ascites, transplant kidney tenderness, bladder distension.",
          "Edema: location, severity, symmetry, sacral edema, and interval change.",
          "Skin/neuro: rash, livedo, purpura, asterixis, confusion, myoclonus, or uremic findings.",
          "Foley: present or absent, urine color, sediment, clots, and whether the tubing/bag supports recorded UOP.",
          "AVF/AVG: location, thrill, bruit, aneurysm, edema, erythema, bleeding, or cannulation issues.",
          "Tunneled HD catheter: site, dressing, erythema, drainage, tenderness, and line position concerns.",
          "PD catheter: exit site, tunnel tenderness, drainage, cuff extrusion, and abdominal tenderness.",
          "Volume synthesis: hypovolemic, euvolemic, overloaded, or mixed/uncertain based on the whole exam.",
        ],
      },
      {
        heading: "How to Read the UA and Urine Lytes",
        items: [
          "Specific gravity: concentrated urine supports avid water retention; very dilute urine may suggest impaired concentrating or excess water intake.",
          "pH: alkaline urine can fit distal RTA, urease-producing infection, or old specimen; acidic urine is expected in many metabolic acidoses.",
          "Dipstick blood: heme-positive with few/no RBCs suggests myoglobin or hemoglobin; heme-positive with RBCs suggests true hematuria.",
          "Dipstick protein: albumin-heavy signal; quantify with UPCR/UACR when proteinuria matters.",
          "RBC casts: nephritic/glomerular injury until proven otherwise; cross-check the Urine Cast Guide and Urine Sediment Atlas.",
          "Muddy brown granular casts: classic ATN clue, especially with ischemia, sepsis, contrast, pigment, or nephrotoxins.",
          "WBC casts: pyelonephritis, AIN, lupus nephritis, transplant rejection; match against symptoms and drug exposures.",
          "Urine eosinophils: can support AIN but are neither sensitive nor specific; do not overcall them alone.",
          "Hyaline casts: can be seen with low-flow/pre-renal states, diuretics, exercise, or concentrated urine.",
          "Crystals: think medications, tumor lysis, stones, ethylene glycol, uric acid, or acyclovir depending on shape and context.",
          "Urine sodium: low values can support sodium avidity, but interpret with diuretics, CKD, ATN evolution, and volume context.",
          "FENa: useful in selected oliguric AKI; <1% often supports pre-renal physiology and >2% supports ATN, but it is unreliable on diuretics.",
          "FEUrea: often preferred when diuretics are on board; use the FEUrea calculator and still interpret in clinical context.",
          "Urine osmolality: high suggests ADH is active; low suggests dilute urine and helps with hyponatremia/water handling.",
          "Cross-reference calculators: Quick Reference -> FENa Calculator and FEUrea Calculator.",
          "Cross-reference microscopy: Quick Reference -> Urine Cast Guide and Urine Sediment Atlas.",
        ],
      },
      {
        heading: "Use the Topic Guides for the Clinical Details",
        items: [
          "Open Inpatient Consult Guides for AKI, hyperkalemia, hyponatremia, dialysis, GN, HRS, contrast AKI, rhabdo, cardiorenal syndrome, DKD, or PD peritonitis.",
          "Use this workup guide to gather the raw material, then use Initial Consult: Presentation to turn it into a clean verbal consult.",
        ],
      },
    ],
    commonMistakes: [
      "Skipping baseline creatinine and accidentally calling chronic CKD an acute change.",
      "Missing the MAR/nephrotoxin review, especially NSAIDs, contrast, antibiotics, PPIs, ACEi/ARB, and diuretics.",
      "Calculating or quoting FENa after diuretics without saying it may be unreliable.",
      "Not reading the sediment yourself, or not asking what microscopy actually showed.",
      "Accepting I/O totals without checking Foley status, urine color, or whether the patient is making unmeasured urine.",
      "Forgetting access and last-treatment details in dialysis patients.",
    ],
    teachingPoints: [
      "Baseline, trend, urine output, and hemodynamics are the spine of the consult.",
      "The urine sediment can move the differential faster than another copied lab list.",
      "Medication exposure is part of the kidney exam.",
    ],
  },

  initialConsultPresentation: {
    id: "initialConsultPresentation",
    icon: "\uD83C\uDFA4",
    title: "Initial Consult: Presentation",
    subtitle: "How to present a new nephrology consult clearly",
    whyItMatters:
      "A strong presentation is not a data dump. It tells the team why nephrology was called, what the kidney problem is doing, what physiology explains it, and what has to happen today.",
    teachingPearl:
      "Lead with the consult question, then give the kidney trajectory and the decision point.",
    sections: [
      {
        heading: "30-Second Consult Format",
        items: [
          "\"This is a __-year-old with __ who was consulted for __. Baseline kidney function is __, creatinine has moved from __ to __, urine output is __, and the key physiology appears to be __. Urgent concerns are __, and today nephrology needs to decide __.\"",
        ],
      },
      {
        heading: "Full Consult Presentation Format",
        items: [
          "1. One-liner: age, key comorbidities, hospital context, and consult question.",
          "2. HPI: timeline of the kidney problem, symptoms, triggers, exposures, and what changed.",
          "3. PMH and meds: kidney history, dialysis/transplant status, nephrotoxins, home meds, allergies, and relevant family history.",
          "4. Physical exam: focused nephrology exam with volume, lungs, edema, neuro/uremia, Foley, and dialysis access if present.",
          "5. Objective data: baseline Cr, current Cr trend, UOP, electrolytes, UA/sediment, urine lytes, imaging, and dialysis details.",
          "6. Assessment: most likely physiology or differential buckets, with the evidence for and against each.",
          "7. Urgent issues: dialysis indications, severe K/acid-base/Na problems, pulmonary edema, obstruction, GN/RPGN, or access infection.",
          "8. Plan: what should happen today, what to monitor, what to stop/start, and what would change the plan.",
        ],
      },
      {
        heading: "How to Present the A/P",
        items: [
          "1. Name the problem and trajectory: AKI/CKD/electrolyte issue, baseline, peak, current, and urine output.",
          "2. State the leading mechanism or differential buckets, tied to evidence.",
          "3. Say whether there is an urgent complication or dialysis indication right now.",
          "4. Give the plan by action category: diagnostics, medications, volume, electrolytes/acid-base, dialysis, and monitoring.",
          "5. End with the threshold that would change management before tomorrow.",
        ],
      },
      {
        heading: "Example A/P Phrases",
        items: [
          "\"AKI with creatinine rising from __ to __ from a baseline of __, with urine output __. Leading concern is __ based on __. No current indication for dialysis / dialysis is indicated because __. Today recommend __.\"",
          "\"Hyperkalemia to __ due to __, with ECG __ and kidney function __. Temporize with __, remove potassium with __, stop contributors __, and recheck K at __.\"",
          "\"ESRD on HD via __, usually dialyzes __ at __, last HD __ with __ UF. Current issue is __. Plan inpatient HD __, access monitoring __, and medication adjustments __.\"",
        ],
      },
    ],
    commonMistakes: [
      "Starting with a long past medical history before saying why nephrology was consulted.",
      "Listing every lab instead of selecting the kidney-relevant trend.",
      "Giving an assessment without explaining the evidence behind it.",
      "Ending without a clear today-plan or contingency threshold.",
      "Reading a written note word-for-word instead of presenting a verbal synthesis.",
    ],
    teachingPoints: [
      "A good consult presentation is brief, trend-based, and decision-oriented.",
      "Use the A/P to show your reasoning, not just your recommendations.",
      "If you are unsure, name the uncertainty and say what data would resolve it.",
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
        heading: "First Time Seeing This Patient?",
        items: [
          "If this is a new consult, start with Initial Consult: Workup before seeing the patient.",
          "Use Initial Consult: Presentation when you are ready to package the story for rounds.",
          "Once nephrology is already following, use this guide for daily updates instead of repeating the full initial consult.",
        ],
      },
      {
        heading: "Pre-Rounding Daily Checklist",
        items: [
          "Overnight events",
          "Vitals and oxygen requirement",
          "I/Os and urine output",
          "Weight",
          "Creatinine / BUN trend",
          "Potassium / bicarbonate / sodium / phosphorus",
          "CBC if relevant",
          "Medication changes: nephrotoxins, renally cleared meds, diuretics, binders, bicarbonate, anticoagulation.",
          "IV fluids / diuretics / pressors and response.",
          "New imaging",
          "Microbiology / cultures if relevant",
          "Procedures planned or done",
          "Dialysis performed or planned: timing, access, UF, complications, and next session.",
          "Volume exam updates: lungs, JVD, edema, weights, and oxygen trend.",
          "New symptoms or exam changes: dyspnea, chest pain, confusion, cramps, nausea, rash, pain at access/catheter.",
          "What the primary team is worried about today",
          "Your one-sentence update: better, worse, unchanged, or new problem.",
        ],
      },
      {
        heading: "Daily Rounds Questions",
        items: [
          "What changed overnight?",
          "Is the kidney issue improving, worsening, or unchanged?",
          "Is there an urgent electrolyte, acid-base, volume, or dialysis issue?",
          "What decision does the team need from nephrology today?",
          "Which study sheet, inpatient consult guide, or tool matches this patient's active issue?",
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
