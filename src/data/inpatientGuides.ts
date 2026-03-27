// Inpatient Nephrology Consult Guides — pre-authored teaching content
//
// Question-driven and urgency-driven guides for ward-based learning.
// Content is guideline-based, educational, and not patient-specific.

export const INPATIENT_GUIDE_TOPICS = [
  "AKI",
  "Hyponatremia",
  "Hyperkalemia",
  "Dialysis",
  "GN",
] as const;
export type InpatientGuideTopic = (typeof INPATIENT_GUIDE_TOPICS)[number];

export interface InpatientGuideTemplate {
  topic: InpatientGuideTopic;
  icon: string;
  title: string;
  subtitle: string;
  whyWeGetConsulted: string;
  teachingPearl: string;
  beforeRounds: string[];
  thirtySecondSummary: string;
  howToPresent: string;
  topDifferentialBuckets: string[];
  redFlags: string[];
  commonMistakes: string[];
  assessmentFramework: string[];
  discussionQuestions: string[];
}

export const INPATIENT_GUIDES: Record<
  InpatientGuideTopic,
  InpatientGuideTemplate
> = {
  // ═══════════════════════════════════════════════════════════════════
  //  AKI CONSULT ESSENTIALS
  // ═══════════════════════════════════════════════════════════════════
  AKI: {
    topic: "AKI",
    icon: "🔬",
    title: "AKI Consult Essentials",
    subtitle: "Severity, mechanism, and what needs to happen today",

    whyWeGetConsulted:
      "AKI is one of the most common nephrology consults. The task is to define severity, establish trajectory, narrow the mechanism into prerenal, intrinsic, or postrenal categories, identify reversible factors, and determine whether urgent dialysis is needed.",

    teachingPearl:
      "The creatinine is not the consult. The consult is the trajectory, urine output, hemodynamics, exposures, and urgent complications.",

    beforeRounds: [
      "Baseline creatinine",
      "Peak creatinine",
      "Current creatinine",
      "Urine output",
      "BP / pressors / shock context",
      "Recent fluids / diuretics",
      "Nephrotoxins / contrast",
      "UA with microscopy",
      "Urine Na / FEUrea if useful",
      "Renal ultrasound if unexplained or obstruction suspected",
      "Potassium / bicarbonate / BUN",
      "Whether there is a dialysis indication",
    ],

    thirtySecondSummary:
      "\"AKI from baseline __ to __, urine output __, likely due to __, with urgent issues including __, and dialysis is/is not currently indicated.\"",

    howToPresent:
      "\"This is a __-year-old with baseline creatinine __, admitted for __, now with creatinine rising to __ and urine output __. Hemodynamics are __ and likely volume status is __. Exposures include __. UA showed __ and imaging showed __. My differential is prerenal vs ATN vs obstruction vs glomerular process, and the key issue today is __.\"",

    topDifferentialBuckets: [
      "Prerenal / perfusion",
      "Intrinsic tubular injury (ATN)",
      "Glomerular / vascular",
      "Interstitial (AIN)",
      "Obstruction",
    ],

    redFlags: [
      "Refractory hyperkalemia",
      "Severe metabolic acidosis",
      "Pulmonary edema / escalating oxygen",
      "Uremic encephalopathy",
      "Pericarditis",
      "Rapidly progressive oliguria / anuria",
      "Concern for pulmonary-renal syndrome",
    ],

    commonMistakes: [
      "Not knowing baseline creatinine",
      "Not reporting urine output",
      "Calling everything ATN",
      "Overusing FENa (unreliable with diuretics — use FEUrea)",
      "Forgetting obstruction",
      "Not reviewing meds for nephrotoxins",
      "Recommending dialysis from a number alone",
    ],

    assessmentFramework: [
      "AKI severity and trajectory",
      "Urine output and hemodynamics",
      "Likely mechanism",
      "Reversible contributors",
      "Electrolyte / acid-base / volume complications",
      "Dialysis indication yes/no",
      "What should happen today",
    ],

    discussionQuestions: [
      "A patient admitted for sepsis has creatinine rising from 1.0 to 3.5 over 48 hours with urine output 15 mL/hr and FEUrea 42%. What is your assessment, and what should happen today?",
      "An AKI patient has potassium 6.8 with peaked T waves. Walk through your immediate management and how you decide whether dialysis is needed.",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  HYPONATREMIA CONSULT ESSENTIALS
  // ═══════════════════════════════════════════════════════════════════
  Hyponatremia: {
    topic: "Hyponatremia",
    icon: "💧",
    title: "Hyponatremia Consult Essentials",
    subtitle: "Physiology, symptom severity, and safe correction",

    whyWeGetConsulted:
      "Hyponatremia consults are about identifying the physiology, assessing urgency, and preventing overcorrection.",

    teachingPearl:
      "The first question is not \"what is the sodium?\" It is \"is this true hypotonic hyponatremia, and how symptomatic is the patient?\"",

    beforeRounds: [
      "Serum sodium trend",
      "Serum osmolality",
      "Urine osmolality",
      "Urine sodium",
      "Glucose (corrected sodium if hyperglycemia)",
      "Symptom severity",
      "Chronic vs acute clue",
      "Recent IV fluids / diuretics",
      "Volume assessment",
      "Daily correction rate",
    ],

    thirtySecondSummary:
      "\"Hypotonic hyponatremia with sodium __, likely due to __, symptoms __, hypertonic saline needed yes/no, and the main risk is overcorrection.\"",

    howToPresent:
      "\"This is a patient with sodium __ and serum osmolality __, consistent with __ hyponatremia. Urine osmolality is __ and urine sodium is __. Symptoms are __ and likely physiology is __. The immediate issue is whether they need hypertonic saline and how to prevent overcorrection.\"",

    topDifferentialBuckets: [
      "Low solute / excess water intake (tea-and-toast, beer potomania)",
      "Hypovolemic hyponatremia",
      "SIADH",
      "Hypervolemic states (CHF, cirrhosis, nephrotic syndrome)",
      "Endocrine causes (hypothyroidism, adrenal insufficiency) when relevant",
    ],

    redFlags: [
      "Seizure",
      "Severe AMS",
      "Acute onset (< 48 hours)",
      "Rapid downward trend",
      "Rising sodium too fast after treatment begins (overcorrection risk)",
    ],

    commonMistakes: [
      "Skipping serum osmolality",
      "Not checking urine osmolality and urine sodium",
      "Not deciding acute vs chronic",
      "Not tracking correction rate",
      "Not anticipating auto-correction (e.g., after volume repletion or stopping desmopressin)",
    ],

    assessmentFramework: [
      "True hypotonic hyponatremia or not",
      "Symptom severity",
      "Acute vs chronic likelihood",
      "Urine osm / urine sodium interpretation",
      "Most likely physiology",
      "Initial treatment plan",
      "Overcorrection risk and monitoring plan",
    ],

    discussionQuestions: [
      "A patient with sodium 118 and urine osmolality 600 mOsm/kg has been receiving IV normal saline for 6 hours and sodium has risen to 127. What are your concerns, and what do you do next?",
      "A patient with cirrhosis has sodium 122 and is asymptomatic. How does your approach differ from SIADH?",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  HYPERKALEMIA CONSULT ESSENTIALS
  // ═══════════════════════════════════════════════════════════════════
  Hyperkalemia: {
    topic: "Hyperkalemia",
    icon: "⚡",
    title: "Hyperkalemia Consult Essentials",
    subtitle: "Stabilize, shift, remove, and find the driver",

    whyWeGetConsulted:
      "Hyperkalemia consults are urgent because of arrhythmia risk and because temporizing treatment and definitive potassium removal are different tasks.",

    teachingPearl:
      "Calcium stabilizes the myocardium. It does not remove potassium.",

    beforeRounds: [
      "Potassium trend",
      "ECG",
      "Hemolysis possibility (was the sample hemolyzed?)",
      "Renal function",
      "Urine output",
      "Current treatments given",
      "Cause: AKI, CKD, meds, tissue breakdown, missed dialysis",
      "Dialysis access status if relevant",
    ],

    thirtySecondSummary:
      "\"Hyperkalemia to __ from __, ECG __, temporized with __, definitive removal plan is __, and dialysis is/is not needed.\"",

    howToPresent:
      "\"This is a patient with potassium __, with/without ECG changes, in the setting of __. They have received __ for stabilization and intracellular shift. Definitive potassium removal is being addressed with __. The main ongoing driver appears to be __.\"",

    topDifferentialBuckets: [
      "Impaired excretion (AKI, CKD, hypoaldosteronism)",
      "Transcellular shift (acidosis, beta-blockers, insulin deficiency)",
      "Increased release / cell breakdown (rhabdomyolysis, TLS, hemolysis)",
      "Medication-related (ACEi/ARB, MRA, TMP-SMX, heparin, NSAIDs)",
      "Pseudohyperkalemia (hemolyzed sample, thrombocytosis, leukocytosis)",
    ],

    redFlags: [
      "ECG changes (peaked T waves, widened QRS, sine wave)",
      "Weakness / paralysis",
      "Refractory hyperkalemia despite treatment",
      "Ongoing rhabdomyolysis / TLS",
      "Missed dialysis in ESRD",
    ],

    commonMistakes: [
      "Forgetting the ECG",
      "Assuming calcium lowers potassium (it only stabilizes the membrane)",
      "Not separating temporizing from definitive therapy",
      "Not considering hemolysis as cause of lab artifact",
      "Not assessing whether dialysis is the definitive answer",
    ],

    assessmentFramework: [
      "Whether potassium is real (rule out pseudohyperkalemia)",
      "ECG / symptom severity",
      "Temporizing therapy given",
      "Definitive potassium removal plan",
      "Underlying cause",
      "Dialysis indication yes/no",
    ],

    discussionQuestions: [
      "A patient with CKD stage 4 on lisinopril and spironolactone presents with potassium 7.1 and peaked T waves. Walk through your management in order.",
      "After treating hyperkalemia with insulin/glucose, the potassium drops from 6.8 to 5.9. Is the patient safe? What happens next?",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  DIALYSIS / KRT DECISION GUIDE
  // ═══════════════════════════════════════════════════════════════════
  Dialysis: {
    topic: "Dialysis",
    icon: "🔄",
    title: "Dialysis / KRT Decision Guide",
    subtitle: "When to start, what problem you are solving, and which modality fits",

    whyWeGetConsulted:
      "Dialysis decisions are based on the clinical problem being solved, not on one lab value.",

    teachingPearl:
      "A patient does not need dialysis because the BUN or creatinine is high. A patient needs dialysis when kidney failure is causing a problem that conservative therapy cannot safely control.",

    beforeRounds: [
      "Current indication under consideration",
      "Urine output",
      "Potassium / bicarbonate / BUN",
      "Oxygen requirement / pulmonary edema",
      "Neurologic status",
      "Hemodynamics",
      "Access status",
      "ESRD vs AKI context",
      "Last dialysis if ESRD",
    ],

    thirtySecondSummary:
      "\"The question is whether dialysis is needed for __. Current issues are __, conservative measures have/have not worked, hemodynamics are __, and the likely modality is __.\"",

    howToPresent:
      "\"This is a patient with __ kidney failure context, now with __ complication prompting dialysis consideration. Conservative management has included __. Current urgency is __. Hemodynamics are __ and access is __. The main question is whether dialysis is needed now and which modality best fits the clinical situation.\"",

    topDifferentialBuckets: [
      "ESRD routine inpatient management",
      "ESRD missed dialysis / access issue",
      "AKI with urgent complication",
      "Toxin removal (methanol, ethylene glycol, lithium, etc.)",
      "Severe metabolic derangement",
      "Volume overload refractory to medical therapy",
    ],

    redFlags: [
      "Refractory hyperkalemia",
      "Severe metabolic acidosis",
      "Pulmonary edema unresponsive to diuretics",
      "Overt uremic complications (encephalopathy, pericarditis, bleeding)",
      "Certain toxic ingestions when applicable",
    ],

    commonMistakes: [
      "Recommending dialysis from eGFR alone",
      "Not saying what problem dialysis is solving",
      "Ignoring hemodynamics (HD vs CRRT decision)",
      "Not knowing access status",
      "Mixing ESRD routine HD with AKI-KRT decisions",
    ],

    assessmentFramework: [
      "What indication is present",
      "Whether medical therapy has failed",
      "Hemodynamic stability",
      "Best modality if needed (HD, CRRT, PD)",
      "Access plan",
      "What should happen today",
    ],

    discussionQuestions: [
      "A patient with AKI has potassium 6.2 (responding to medical therapy), bicarbonate 16, and is making 30 mL/hr of urine. Does this patient need dialysis right now? How do you frame your recommendation?",
      "An ESRD patient on thrice-weekly HD missed their last two sessions and presents with shortness of breath and potassium 7.0. What is different about this scenario compared to AKI?",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  GN / ACTIVE SEDIMENT CONSULT
  // ═══════════════════════════════════════════════════════════════════
  GN: {
    topic: "GN",
    icon: "🔍",
    title: "GN / Active Sediment Consult",
    subtitle: "Recognize nephritic patterns and identify urgency",

    whyWeGetConsulted:
      "These consults matter because rapidly progressive glomerular disease can cause irreversible kidney loss if not recognized early.",

    teachingPearl:
      "Hematuria plus proteinuria plus rising creatinine is not \"just AKI\" until a glomerular process has been considered.",

    beforeRounds: [
      "Creatinine trend",
      "UA",
      "Urine microscopy",
      "Protein quantification",
      "BP",
      "Edema",
      "Pulmonary symptoms",
      "Serology already sent",
      "Kidney imaging",
      "Platelet count / coagulation if biopsy may be discussed",
    ],

    thirtySecondSummary:
      "\"Rising creatinine with hematuria/proteinuria and active sediment concerning for glomerular disease, with urgent question of whether this is a rapidly progressive process needing expedited workup and biopsy discussion.\"",

    howToPresent:
      "\"This is a patient with creatinine rising from __ to __, UA showing __, urine sediment showing __, and proteinuria of __. Associated features include __. The major concern is a glomerular process such as __, and the immediate needs are serologic workup, monitoring for pulmonary-renal syndrome, and biopsy planning with the team.\"",

    topDifferentialBuckets: [
      "ANCA-associated vasculitis (GPA, MPA)",
      "Anti-GBM disease",
      "Lupus nephritis",
      "IgA-related processes",
      "Infection-related GN",
      "TMA or other mimics when relevant",
    ],

    redFlags: [
      "Rapidly rising creatinine",
      "Oliguria",
      "Pulmonary hemorrhage symptoms (hemoptysis, hypoxia)",
      "Severe hypertension",
      "Nephritic syndrome with systemic symptoms",
    ],

    commonMistakes: [
      "Not looking at the urine sediment",
      "Not quantifying proteinuria",
      "Treating this as routine AKI without considering glomerular disease",
      "Delaying serologies in a fast-moving case",
      "Not mentioning pulmonary-renal features",
    ],

    assessmentFramework: [
      "Why glomerular disease is suspected",
      "Severity and trajectory",
      "Supporting urine findings",
      "Most likely etiologic buckets",
      "Urgent complications / extra-renal clues",
      "What workup and escalation are needed today",
    ],

    discussionQuestions: [
      "A patient presents with creatinine rising from 1.2 to 4.0 in one week, UA with 3+ blood and 2+ protein, and RBC casts on microscopy. What is your differential and immediate plan?",
      "You send ANCA, anti-GBM, C3/C4, ANA, and hepatitis panel. What findings on each would change your management urgently?",
    ],
  },
};

export const INPATIENT_GUIDE_FOOTER =
  "Educational consult guide for student teaching. Not a substitute for individualized clinical judgment.";
