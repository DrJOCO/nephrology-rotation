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
  "HRS",
  "Contrast AKI",
  "Rhabdo",
  "Cardiorenal",
  "DKD",
  "PD Peritonitis",
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

  // ═══════════════════════════════════════════════════════════════════
  //  HRS-AKI CONSULT ESSENTIALS
  // ═══════════════════════════════════════════════════════════════════
  HRS: {
    topic: "HRS",
    icon: "🫀",
    title: "HRS-AKI Consult Essentials",
    subtitle: "Cirrhosis + AKI = exclude everything, then diagnose HRS",
    whyWeGetConsulted:
      "AKI in a cirrhotic patient with ascites. The primary team wants to know: Is this HRS? Should we start terlipressin? Does this patient need dialysis?",
    teachingPearl:
      "HRS-AKI is a diagnosis of exclusion. Your job is to systematically rule out prerenal, ATN, obstruction, and GN before making this diagnosis. Always do a diagnostic paracentesis — SBP is the most common precipitant.",
    beforeRounds: [
      "Baseline and current creatinine",
      "Liver disease severity (MELD score, Child-Pugh)",
      "Ascites volume and recent paracentesis history",
      "Recent medications (NSAIDs, diuretics, lactulose dose)",
      "Signs of infection (SBP, UTI, pneumonia)",
      "Volume status and hemodynamics",
      "Urine Na, urine output, UA with microscopy",
      "Whether IV albumin challenge has been started",
      "Renal ultrasound to rule out obstruction",
      "Whether patient is listed for liver transplant",
    ],
    thirtySecondSummary:
      "\"AKI in a cirrhotic with ascites, Cr from __ to __, urine Na __, no evidence of shock/nephrotoxins/obstruction. Albumin challenge x2 days with no improvement. This is consistent with HRS-AKI. MELD is __.\"",
    howToPresent:
      "\"This is a __-year-old with decompensated cirrhosis (etiology __), MELD __, admitted for __, now with AKI (Cr __ from baseline __). We have ruled out prerenal (albumin challenge x2 days without improvement), obstruction (normal US), nephrotoxins (none), and GN (bland sediment, no significant proteinuria). Diagnostic paracentesis showed __. This meets ICA criteria for HRS-AKI.\"",
    topDifferentialBuckets: [
      "Prerenal / volume-responsive AKI (most common in cirrhotics — 44%)",
      "ATN (from sepsis, hemorrhage, nephrotoxins — 30%)",
      "HRS-AKI (only ~12% of AKI in cirrhotics)",
      "Obstruction (uncommon but must exclude)",
      "Glomerular disease (IgA nephropathy, hepatitis-associated GN)",
    ],
    redFlags: [
      "SBP on paracentesis (PMN >250/μL) — treat immediately, this may have precipitated HRS",
      "Active GI bleeding — correct hemodynamics before diagnosing HRS",
      "Shock / pressors — this is septic/hemorrhagic AKI, not HRS",
      "Severe hyponatremia (<125) — marker of advanced portal hypertension",
      "ACLF (acute-on-chronic liver failure) — multiorgan failure with extremely high mortality",
    ],
    commonMistakes: [
      "Diagnosing HRS without completing the 2-day albumin challenge",
      "Missing SBP as the precipitant (always paracentese!)",
      "Stopping diuretics too late — hold them early when AKI develops",
      "Using FENa to differentiate HRS from ATN (unreliable in cirrhotics)",
      "Forgetting that HRS-AKI requires BOTH cirrhosis AND ascites",
      "Starting terlipressin in a volume-overloaded patient (respiratory failure risk)",
    ],
    assessmentFramework: [
      "1. Confirm AKI by KDIGO criteria (Cr rise ≥0.3 or ≥1.5× baseline)",
      "2. Rule out nephrotoxins, shock, obstruction (US), and GN (UA/sediment)",
      "3. Diagnostic paracentesis to rule out SBP",
      "4. Start IV albumin 1 g/kg/day (max 100g) × 2 days + hold diuretics",
      "5. If no improvement → diagnose HRS-AKI → start terlipressin + albumin",
      "6. Assess transplant candidacy — definitive treatment is liver transplant",
    ],
    discussionQuestions: [
      "Why is HRS a diagnosis of exclusion rather than a specific test?",
      "How does splanchnic vasodilation lead to renal vasoconstriction?",
      "Why do we use albumin rather than normal saline for the volume challenge?",
      "What are the risks of terlipressin, and when should you avoid it?",
      "How does the MELD score incorporate renal function, and why does that matter for HRS?",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  CONTRAST-ASSOCIATED AKI CONSULT ESSENTIALS
  // ═══════════════════════════════════════════════════════════════════
  "Contrast AKI": {
    topic: "Contrast AKI",
    icon: "💧",
    title: "Contrast-Associated AKI Essentials",
    subtitle: "Is it really the contrast, or just a coincidence?",
    whyWeGetConsulted:
      "Team wants to know if a post-contrast Cr rise is CI-AKI, whether it will recover, and whether the patient can get future contrast studies safely.",
    teachingPearl:
      "The risk of true contrast-induced AKI is much lower than historically believed. Large propensity-matched studies show most post-contrast AKI is coincidental. Don't let fear of contrast delay a life-saving scan.",
    beforeRounds: [
      "Baseline creatinine (pre-contrast)",
      "Current creatinine trajectory (when did it peak?)",
      "Timing and type of contrast exposure (IV vs IA, volume)",
      "Other concurrent nephrotoxic exposures",
      "Volume status and hemodynamics at time of contrast",
      "UA with microscopy",
      "Urine output trend",
      "Whether the patient was hydrated pre/post procedure",
      "Underlying CKD stage (eGFR)",
      "Other potential AKI causes (sepsis, hypotension, new meds)",
    ],
    thirtySecondSummary:
      "\"Post-contrast AKI with Cr rising from __ to __ within __h of contrast exposure. Other potential contributors include __. This is most consistent with CA-AKI / alternative diagnosis. Cr is expected to trend down within 3-7 days.\"",
    howToPresent:
      "\"This is a __-year-old with baseline Cr __ who received __ mL of IV/IA contrast for __ procedure. Cr rose from __ to __ starting __h after exposure. UA is __. Volume status is __. Other potential contributors: __. Given the timing and clinical picture, this is most consistent with CA-AKI / ATN / other.\"",
    topDifferentialBuckets: [
      "True contrast-induced AKI (CI-AKI)",
      "Coincidental AKI (hemodynamic, sepsis, medication-related)",
      "Atheroemboli (post-angiography — delayed onset, livedo reticularis, eosinophilia)",
      "Post-procedural volume depletion or hemorrhage",
      "Medication-related (ACEi/ARB changes, new diuretics post-procedure)",
    ],
    redFlags: [
      "Atheroemboli signs: blue/purple toes, livedo reticularis, delayed Cr rise (days-weeks), eosinophilia",
      "Oliguric AKI — unusual for CI-AKI, search harder for other causes",
      "Cr still rising after 5-7 days — not typical CI-AKI pattern, investigate further",
      "Active urine sediment (RBC casts, WBC casts) — suggests GN or AIN, not contrast injury",
    ],
    commonMistakes: [
      "Attributing all post-contrast AKI to contrast without considering other causes",
      "Withholding necessary contrast studies in patients with mild-moderate CKD based on outdated fears",
      "Using NAC or IV bicarb for prevention (PRESERVE proved these don't work)",
      "Not checking for atheroemboli after angiography (different timeline and prognosis than CI-AKI)",
      "Forgetting to hydrate before AND after contrast exposure",
    ],
    assessmentFramework: [
      "1. Confirm AKI timeline matches CI-AKI (onset 24-48h, peak 3-5 days, recovery 7 days)",
      "2. Exclude other AKI causes (UA, sediment, check for new meds, hemodynamic events)",
      "3. If post-angiography, consider atheroemboli (different entity, worse prognosis)",
      "4. Supportive care: Avoid additional nephrotoxins, maintain euvolemia, adjust meds for GFR",
      "5. For future contrast: Risk-stratify using eGFR, pre-hydrate, minimize volume",
    ],
    discussionQuestions: [
      "What is the difference between CA-AKI and CI-AKI, and why does the distinction matter?",
      "Why do propensity-matched studies suggest the risk of true CI-AKI is lower than older studies showed?",
      "How do you distinguish atheroemboli from CI-AKI after an angiogram?",
      "When should you NOT withhold contrast despite CKD?",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  RHABDOMYOLYSIS CONSULT ESSENTIALS
  // ═══════════════════════════════════════════════════════════════════
  Rhabdo: {
    topic: "Rhabdo",
    icon: "💪",
    title: "Rhabdomyolysis Consult Essentials",
    subtitle: "CK through the roof — now prevent the AKI",
    whyWeGetConsulted:
      "Elevated CK with or without AKI. Team wants guidance on fluid management to prevent AKI, electrolyte management (especially hyperkalemia), and when to dialyze.",
    teachingPearl:
      "The CK number matters less than the volume status. Aggressive IV fluids to maintain UOP 200-300 mL/h is the single most important intervention. Everything else is secondary.",
    beforeRounds: [
      "Peak CK and current CK trend",
      "Urine color and urine dipstick (heme+ with <3 RBCs = myoglobinuria)",
      "Creatinine trajectory (baseline vs current)",
      "Potassium (can be dangerously high and rise rapidly)",
      "Calcium and phosphorus (early hypoCa, late hyperCa)",
      "Urine output (target 200-300 mL/h)",
      "Current IV fluid rate and type",
      "Cause of rhabdomyolysis (trauma, immobilization, drugs, exertion)",
      "Compartment pressures if limb swelling present",
      "ECG if K+ elevated",
    ],
    thirtySecondSummary:
      "\"Rhabdomyolysis with CK __, Cr __ (baseline __), K+ __, urine output __. Cause: __. Currently receiving __ mL/h IV fluids. Dialysis is/is not currently indicated.\"",
    howToPresent:
      "\"This is a __-year-old found __/admitted for __, with CK peaking at __ (currently __). Cr has risen from __ to __. UOP is __ mL/h on __ mL/h isotonic fluids. K+ is __. UA shows heme-positive urine with __ RBCs (consistent with myoglobinuria). The cause is most likely __. Key issues today: __.\"",
    topDifferentialBuckets: [
      "Traumatic: Crush injury, compartment syndrome, burns, electrocution",
      "Exertional: Extreme exercise, seizures, heat stroke",
      "Drugs/toxins: Statins, alcohol, cocaine, neuroleptic malignant syndrome",
      "Metabolic: Hypokalemia, hypophosphatemia, hypothyroidism",
      "Immobilization: Found down, prolonged surgery",
      "Inherited: Metabolic myopathies (consider if recurrent or exertional)",
    ],
    redFlags: [
      "K+ >6.0 with ECG changes — treat emergently before anything else",
      "Compartment syndrome: Tense limb swelling, pain out of proportion, pain with passive stretch — this is a surgical emergency",
      "Oliguric despite adequate fluids — may need dialysis",
      "CK not declining as expected (~40-50%/day) — ongoing muscle injury or compartment syndrome",
      "DIC (rare): Check coags, fibrinogen, D-dimer if bleeding",
    ],
    commonMistakes: [
      "Not fluid resuscitating aggressively enough — UOP target is 200-300 mL/h, not just 'adequate'",
      "Giving IV calcium for hypocalcemia (early hypoCa is from deposition in muscle — correcting it can worsen muscle injury). Only treat if symptomatic or ECG changes",
      "Anchoring on CK cutoff — there is no magic number. Context and trajectory matter more",
      "Missing compartment syndrome because you didn't examine the limbs",
      "Forgetting to check for the underlying CAUSE (especially in recurrent episodes — metabolic myopathy?)",
      "Using bicarb or mannitol without evidence (no proven benefit over isotonic crystalloid)",
    ],
    assessmentFramework: [
      "1. Confirm diagnosis: CK >5× ULN + cause identified + ± myoglobinuria",
      "2. Identify and treat the CAUSE (stop offending drug, treat infection, relieve compression)",
      "3. AGGRESSIVE IV fluids — isotonic crystalloid at rates to maintain UOP 200-300 mL/h",
      "4. Monitor and treat electrolytes: K+ (treat aggressively), PO4, Ca (only if symptomatic), uric acid",
      "5. Monitor for compartment syndrome — check limbs every exam",
      "6. Dialysis if: Refractory hyperkalemia, severe acidosis, volume overload, or oliguric AKI despite fluids",
    ],
    discussionQuestions: [
      "Why do we target UOP 200-300 mL/h, and what is the rationale for aggressive hydration?",
      "Why should you NOT routinely correct hypocalcemia in rhabdomyolysis?",
      "How does myoglobin cause AKI (three mechanisms)?",
      "When should you suspect an inherited metabolic myopathy?",
      "Is there a CK threshold above which AKI is guaranteed?",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  CARDIORENAL SYNDROME ESSENTIALS
  // ═══════════════════════════════════════════════════════════════════
  Cardiorenal: {
    topic: "Cardiorenal",
    icon: "❤️",
    title: "Cardiorenal Syndrome Essentials",
    subtitle: "The Cr is rising during diuresis — is this bad?",
    whyWeGetConsulted:
      "Rising creatinine in a heart failure patient being diuresed. The team is worried about 'kidney injury' and wants to know if they should back off diuretics.",
    teachingPearl:
      "Rising Cr during decongestion is NOT the same as acute kidney injury. If the patient is decongesting (weight down, BNP improving, hemoconcentrating), a Cr bump is hemodynamic and often acceptable. The bigger danger is UNDER-diuresing.",
    beforeRounds: [
      "Baseline creatinine and current Cr trend",
      "Daily weights and net fluid balance (I&Os)",
      "BNP/NT-proBNP trend (improving = good sign)",
      "Hematocrit trend (rising = hemoconcentration = effective decongestion)",
      "Current diuretic regimen and response (urine output, urine Na)",
      "Volume status: JVP, edema, lung exam, weight from admission",
      "Echocardiogram (EF, RV function, TR severity)",
      "Blood pressure trend",
      "BUN/Cr ratio",
      "Medications (ACEi/ARB doses, recent changes)",
    ],
    thirtySecondSummary:
      "\"CRS with Cr rising from __ to __ in setting of diuresis for decompensated HF. Patient is/is not decongesting (weight down __ kg, BNP __→__). Volume status: still overloaded/at dry weight. The Cr rise is likely hemodynamic/concerning for __.\"",
    howToPresent:
      "\"This is a __-year-old with HFrEF/HFpEF (EF __%) admitted for decompensated HF, now with Cr rising from __ to __ on hospital day __. They are on __ mg IV furosemide with __ mL/day UOP. Weight is down __ kg from admission. BNP has gone from __ to __. Volume exam shows __. The Cr rise is in the context of decongestion/is concerning because __.\"",
    topDifferentialBuckets: [
      "Hemodynamic Cr rise from effective decongestion (most common — often benign)",
      "True AKI from over-diuresis / hypovolemia",
      "Cardiogenic shock with poor renal perfusion",
      "Medication-related (ACEi/ARB initiation or dose change, NSAID use)",
      "Venous congestion-mediated (elevated CVP → elevated renal venous pressure)",
      "Underlying intrinsic kidney disease (CKD, diabetic nephropathy)",
    ],
    redFlags: [
      "Hypotension (SBP <90) — reduced renal perfusion, may need to decrease diuretics or add inotropes",
      "Rising Cr WITHOUT any evidence of decongestion — this is real kidney injury",
      "New oliguria (<0.5 mL/kg/h) — more concerning than Cr alone",
      "Metabolic alkalosis + hypochloremia — marker of chloride depletion, may worsen diuretic resistance",
      "RV failure with severe TR — venous congestion is the main driver, not low output",
    ],
    commonMistakes: [
      "Stopping diuretics because of a Cr rise when the patient is still volume overloaded — this is the #1 mistake",
      "Attributing all Cr rises to 'prerenal' when venous congestion is often the real problem",
      "Not checking BNP trend and hematocrit to contextualize the Cr rise",
      "Reflexively holding ACEi/ARB — small Cr rises (up to 30%) are acceptable and expected",
      "Calling for ultrafiltration too early (CARRESS-HF showed diuretics are better)",
      "Ignoring chloride levels — hypochloremia drives diuretic resistance and alkalosis",
    ],
    assessmentFramework: [
      "1. Is the patient DECONGESTING? (Weight trend, BNP trend, hemoconcentration, exam)",
      "2. If decongesting + Cr rising: Likely hemodynamic — continue diuresis with monitoring",
      "3. If NOT decongesting + Cr rising: True WRF — escalate diuretics, add metolazone, check hemodynamics",
      "4. If hypotensive + Cr rising: May need to reduce diuretics, consider inotropes",
      "5. Check chloride — if hypochloremic, may need acetazolamide or IV chloride replacement",
      "6. Ultrafiltration/CRRT reserved for diuretic-refractory volume overload",
    ],
    discussionQuestions: [
      "Why is venous congestion often more important than low cardiac output in causing kidney dysfunction?",
      "How do you use BNP and hematocrit trends to decide if a Cr rise is 'good' or 'bad'?",
      "What is the role of chloride in diuretic resistance?",
      "Why did CARRESS-HF show that ultrafiltration was NOT better than diuretics?",
      "How does RV dysfunction impair LV filling (ventricular interdependence)?",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  DIABETIC KIDNEY DISEASE ESSENTIALS
  // ═══════════════════════════════════════════════════════════════════
  DKD: {
    topic: "DKD",
    icon: "🩸",
    title: "Diabetic Kidney Disease Essentials",
    subtitle: "The #1 cause of ESKD — optimize every pillar",
    whyWeGetConsulted:
      "Progressive CKD in a diabetic patient, rising proteinuria, or medication optimization for DKD. The team wants to know: Is this DKD or something else? Are we maximizing therapy?",
    teachingPearl:
      "DKD is not just 'CKD in a diabetic.' It has a specific pathophysiology (hyperfiltration → proteinuria → GFR decline) and a specific 4-pillar treatment strategy. Your job is to confirm the diagnosis and ensure every pillar is in place.",
    beforeRounds: [
      "eGFR trajectory (at least 3 data points if available)",
      "UACR trend (screening test for DKD)",
      "HbA1c and diabetes duration",
      "Blood pressure (target <120 systolic)",
      "Current medications: ACEi/ARB (max dose?), SGLT2i, finerenone, GLP-1 RA",
      "Retinopathy status (presence supports DKD diagnosis)",
      "Urinalysis with microscopy (bland in DKD — active sediment suggests alternative)",
      "Potassium (important when combining RAAS blockers + finerenone)",
      "Whether biopsy is needed (active sediment, rapid decline, no retinopathy)",
    ],
    thirtySecondSummary:
      "\"DKD with eGFR __, UACR __, on __ of the 4 pillars. Key gap: __. Retinopathy is present/absent. Sediment is bland/active. Next steps: __.\"",
    howToPresent:
      "\"This is a __-year-old with __-year history of type __ diabetes, baseline eGFR __ trending to __, UACR __. They have/do not have diabetic retinopathy. UA shows __. Currently on __. They are missing the following pillars of DKD therapy: __. I recommend starting __.\"",
    topDifferentialBuckets: [
      "Diabetic kidney disease (classic: proteinuria + retinopathy + bland sediment)",
      "Non-diabetic CKD in a diabetic (IgA, membranous, FSGS, hypertensive nephrosclerosis)",
      "Superimposed AKI on DKD (nephrotoxins, dehydration, contrast)",
      "Medication-related GFR change (ACEi/ARB initiation, SGLT2i dip — both hemodynamic, not injury)",
    ],
    redFlags: [
      "Active urine sediment (hematuria, RBC casts) in a diabetic — this is NOT DKD, consider biopsy",
      "Rapid GFR decline (>5 mL/min/year) — atypical for DKD, investigate other causes",
      "No retinopathy in type 1 diabetic with proteinuria — DKD diagnosis less certain, consider biopsy",
      "Onset of proteinuria <5 years after T1DM diagnosis — too early for typical DKD",
      "K+ >5.5 on ACEi/ARB + finerenone — adjust medications before adding another RAAS agent",
    ],
    commonMistakes: [
      "Not maximizing ACEi/ARB dose before adding other agents",
      "Stopping ACEi/ARB for a 20-30% Cr rise (this is expected and nephroprotective)",
      "Not starting SGLT2i because 'eGFR is too low' — can start down to eGFR 20",
      "Forgetting to screen for DKD annually (UACR + eGFR in every diabetic)",
      "Assuming all kidney disease in a diabetic is DKD without checking UA/sediment",
      "Not discussing finerenone (3rd pillar) or GLP-1 RA (4th pillar) as add-ons",
    ],
    assessmentFramework: [
      "1. Confirm DKD: Proteinuria + bland sediment + retinopathy + longstanding diabetes",
      "2. If atypical → consider biopsy to rule out non-diabetic kidney disease",
      "3. Audit the 4 pillars: ACEi/ARB (max dose?), SGLT2i (started?), Finerenone (eligible?), GLP-1 RA (started?)",
      "4. BP optimization: Target SBP <120 (SPRINT)",
      "5. Glycemic control: HbA1c <7% (individualize in elderly/CKD)",
      "6. Cardiovascular risk: Statin for all CKD patients. Aspirin if indicated",
    ],
    discussionQuestions: [
      "What are the 4 pillars of DKD therapy and the key trial supporting each?",
      "When should you biopsy a diabetic patient with kidney disease?",
      "Why does the initial eGFR dip from SGLT2i and ACEi/ARB represent protection, not injury?",
      "How does finerenone differ from spironolactone?",
      "What is the role of the KFRE (Kidney Failure Risk Equation) in managing DKD?",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  PD PERITONITIS CONSULT ESSENTIALS
  // ═══════════════════════════════════════════════════════════════════
  "PD Peritonitis": {
    topic: "PD Peritonitis",
    icon: "🫧",
    title: "PD Peritonitis Consult Essentials",
    subtitle: "Cloudy bag = peritonitis until proven otherwise",
    whyWeGetConsulted:
      "PD patient admitted with cloudy effluent ± abdominal pain. Team wants guidance on diagnosis confirmation, empiric antibiotics, and whether the catheter needs to come out.",
    teachingPearl:
      "Cloudy effluent is peritonitis until proven otherwise. The single most important step is sending the effluent for cell count and culture (in blood culture bottles!) before starting antibiotics. IP antibiotics are the standard — not IV.",
    beforeRounds: [
      "Effluent appearance (cloudy = #1 sign)",
      "Effluent cell count (>100 WBC/μL with >50% PMNs = peritonitis)",
      "Effluent gram stain and culture results",
      "Abdominal symptoms (pain, tenderness, rebound)",
      "Fever and vital signs",
      "PD catheter: Exit site appearance, tunnel tenderness",
      "Recent technique issues (contamination events, recent procedure)",
      "Prior peritonitis episodes and organisms",
      "Current PD prescription (CAPD vs APD, dwell volumes)",
      "Whether IP antibiotics have been started and regimen",
    ],
    thirtySecondSummary:
      "\"PD peritonitis with cloudy effluent, WBC __ with __% PMNs. Gram stain shows __. Culture pending/growing __. Currently on __. Exit site is __. This is episode #__ in __ months. Plan: __.\"",
    howToPresent:
      "\"This is a __-year-old on PD for __ (CAPD/APD) presenting with cloudy effluent and abdominal pain for __ days. Effluent WBC is __ with __% PMNs. Gram stain shows __. Cultures are pending/growing __. They have had __ prior episodes in __ months. Exit site exam shows __. We started empiric IP vancomycin + IP gentamicin. Key issues: __.\"",
    topDifferentialBuckets: [
      "Bacterial peritonitis (most common: gram-positive cocci ~60%)",
      "Gram-negative peritonitis (~25% — often enteric organisms)",
      "Fungal peritonitis (rare but requires catheter removal)",
      "Culture-negative peritonitis (~15% — may be due to pre-antibiotic treatment)",
      "Chemical peritonitis (from icodextrin or acidic dialysate — sterile, self-limited)",
      "Non-PD abdominal pathology (appendicitis, cholecystitis, diverticulitis — surgical abdomen)",
    ],
    redFlags: [
      "Fungal peritonitis (yeast on gram stain or culture) — REMOVE catheter immediately",
      "Fecal flora or polymicrobial culture — consider surgical abdomen (perforation, ischemic bowel)",
      "Effluent not clearing by day 5 of appropriate antibiotics — refractory peritonitis, remove catheter",
      "Relapsing peritonitis (same organism within 4 weeks) — catheter removal usually needed",
      "Tunnel infection (tenderness/erythema along catheter track) — catheter may need removal",
      "Peritoneal membrane failure after repeated episodes — may need to transition to HD permanently",
    ],
    commonMistakes: [
      "Using only IV antibiotics — IP dosing is essential for adequate peritoneal concentrations",
      "Not sending effluent in blood culture bottles (higher culture yield than standard tubes)",
      "Starting antibiotics BEFORE collecting the effluent sample — always culture first",
      "Missing exit site or tunnel infection as the source",
      "Delaying catheter removal in fungal or refractory peritonitis",
      "Forgetting to flush the catheter before sending cultures (residual volume can be dilute)",
    ],
    assessmentFramework: [
      "1. Confirm peritonitis: Cloudy effluent + WBC >100/μL with >50% PMNs",
      "2. SEND CULTURES (in blood culture bottles) before antibiotics",
      "3. Start empiric IP vancomycin + IP gentamicin (or IP ceftazidime) per ISPD guidelines",
      "4. Examine exit site and tunnel for concurrent infection",
      "5. Tailor antibiotics to culture results at 48-72h",
      "6. Duration: 14-21 days. If not improving by day 5 → consider catheter removal",
      "7. Catheter removal: Fungal, refractory (day 5), relapsing, tunnel infection",
    ],
    discussionQuestions: [
      "Why are IP antibiotics preferred over IV for PD peritonitis?",
      "Why should effluent be sent in blood culture bottles rather than standard tubes?",
      "What organisms suggest a surgical abdomen rather than typical PD peritonitis?",
      "When is catheter removal indicated, and can PD be resumed after?",
      "How do you distinguish chemical peritonitis from infectious peritonitis?",
    ],
  },
};

export const INPATIENT_GUIDE_FOOTER =
  "Educational consult guide for student teaching. Not a substitute for individualized clinical judgment.";
