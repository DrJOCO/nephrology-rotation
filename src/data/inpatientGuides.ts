// Inpatient Nephrology Consult Guides — pre-authored teaching content
//
// Question-driven and urgency-driven guides for ward-based learning.
// Content is guideline-based, educational, and not patient-specific.

export const INPATIENT_GUIDE_TOPICS = [
  "AKI",
  "Obstruction",
  "AIN",
  "Hyponatremia",
  "Hypernatremia",
  "Hyperkalemia",
  "Acid-Base",
  "Hypercalcemia",
  "Dialysis",
  "ESRD Inpatient",
  "GN",
  "HRS",
  "Contrast AKI",
  "Rhabdo",
  "Cardiorenal",
  "DKD",
  "Transplant AKI",
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
  // Quick Reference calculators to link from the guide (QUICK_REFS ids).
  relatedTools?: { refId: string; label: string }[];
  // Short teaching lessons; format "example" renders as a worked-example block.
  lessons?: { heading: string; items: string[]; format?: "example" }[];
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
    title: "AKI Consult",
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
    title: "Hyponatremia Consult",
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
    title: "Hyperkalemia Consult",
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
      "When should you reach for a K⁺ binder (patiromer or SZC) instead of stopping a RAAS blocker or MRA? AMBER showed patiromer kept 86% of CKD patients on spironolactone vs 66% on placebo — what does that mean for your discharge plan?",
      "POTCAST (NEJM 2025) targeted plasma K⁺ 4.5–5.0 in ICD patients and reduced arrhythmia/death by 24%. How should that change your reflex to hold MRA at K⁺ 5.0 in cardiomyopathy patients?",
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
      "CONVINCE (NEJM 2023) showed 23% lower mortality with high-dose online hemodiafiltration vs high-flux HD in select prevalent HD patients. Where does HDF fit in current US dialysis practice, and what are the limitations?",
      "ACHIEVE (Lancet 2025) was stopped for futility — spironolactone in maintenance dialysis didn't reduce CV death/HF hospitalization and increased severe hyperkalemia. How does this change a request to start an MRA on a HD patient with HFrEF?",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  ESRD / DIALYSIS PATIENT INPATIENT ROUNDING
  // ═══════════════════════════════════════════════════════════════════
  "ESRD Inpatient": {
    topic: "ESRD Inpatient",
    icon: "🏥",
    title: "ESRD Inpatient Rounding",
    subtitle:
      "The admitted dialysis patient — access, volume, potassium, and the chronic care their unit usually handles",

    whyWeGetConsulted:
      "Every hospitalized dialysis patient — HD or PD — needs nephrology to run their dialysis while admitted, whatever brought them in. The job is to learn their outpatient prescription, protect the access, sort volume and potassium, decide when they dialyze next (or whether PD can continue in-house), and keep the chronic ESRD care (anemia, CKD-MBD, nutrition) from falling apart during the admission.",

    teachingPearl:
      "The dialysis unit knows this patient better than the hospital does. Your first task is to recover their outpatient reality — schedule, dry weight, access, intradialytic tolerance — because almost every inpatient decision is measured against it.",

    beforeRounds: [
      "Dialysis unit, schedule (MWF vs TThSa), and when they last dialyzed",
      "Missed sessions or shortened treatments before admission",
      "Dry weight (estimated dry weight) and current weight vs it",
      "Access: fistula, graft, or catheter — site, and any recent problems (prolonged bleeding, poor flows, clotting)",
      "Access exam: thrill and bruit, or catheter exit site",
      "Residual urine output (anuric vs still making urine)",
      "Intradialytic tolerance: hypotension, cramping, how much fluid they typically remove",
      "Potassium, and whether the draw was pre- or post-dialysis",
      "Volume exam: edema, crackles, oxygen requirement, BP",
      "Home meds: phosphate binders (with meals?), calcimimetic, vitamin D analog, antihypertensives (which are held on HD days?)",
      "Most recent Hgb, iron indices (TSAT/ferritin), phosphorus, calcium, PTH from the outpatient unit if available",
      "Transplant status: listed, workup in progress, or not a candidate",
      "Any meds ordered this admission that need renal dosing or are contraindicated (NSAIDs, magnesium/phosphate preps, maintenance IV fluids)",
      "PD: modality (CAPD manual exchanges vs cycler/CCPD) and the full prescription — number of exchanges, fill volume, dextrose strengths, icodextrin, dwell times",
      "PD: who does the exchanges at home (patient vs family), and can they do them in the hospital? Does this hospital stock PD supplies and have PD-trained nurses?",
      "PD: exit site and tunnel exam, and effluent clarity — ask when the effluent was last clear",
      "PD: recent problems — drain pain, poor drainage, fibrin, leaks, hernias",
    ],

    thirtySecondSummary:
      "\"ESRD on __ schedule via __ access, last dialyzed __, admitted for __. Volume is __ relative to dry weight of __, potassium is __, access is __. Plan is to dialyze __ and the main issue today is __.\"",

    howToPresent:
      "\"This is a __-year-old with ESRD from __, on hemodialysis __ per week via __ at __ unit, last dialyzed __, admitted for __. They are __ kg against a dry weight of __ kg, potassium is __, and the access has a good thrill/bruit (or catheter site is clean). They do/do not make residual urine. Overnight events were __. My plan is dialysis __ with __ fluid removal, and the chronic issues to keep on track are __.\"",

    topDifferentialBuckets: [
      "Volume: above or below dry weight, and how much to remove",
      "Access: working, threatened, or infected",
      "Electrolytes: potassium trajectory between sessions",
      "Dialysis logistics: when is the next run, and can the admission diagnosis wait for it",
      "Chronic ESRD care: anemia, CKD-MBD, nutrition, transplant status",
    ],

    redFlags: [
      "Hyperkalemia with ECG changes — medical stabilization while arranging urgent dialysis",
      "Pulmonary edema in an anuric patient — diuretics will not work; dialysis is the treatment",
      "Fever with a dialysis catheter — catheter-related bloodstream infection until proven otherwise; blood cultures before antibiotics",
      "Lost thrill/bruit in a fistula or graft — clotted access; call access surgery/interventional early, do not wait",
      "Prolonged bleeding from access sites — may signal outflow stenosis (or uremic platelet dysfunction)",
      "Missed multiple sessions — assume potassium and volume are both dangerous until measured",
      "Pericardial rub or large effusion — uremic pericarditis changes the dialysis prescription (intensive, often heparin-free HD)",
      "PD: cloudy effluent or abdominal pain — peritonitis until proven otherwise; send effluent cell count and culture BEFORE antibiotics (see the PD Peritonitis guide)",
      "PD: purulent exit-site drainage or tunnel tenderness — exit-site/tunnel infection, and a peritonitis risk",
      "PD: catheter not draining — check for constipation, kinking, or migration before assuming the catheter has failed",
    ],

    commonMistakes: [
      "Placing a PICC line — vein preservation matters even in ESRD (future access sites); push for alternatives",
      "BP measurements, blood draws, or IVs in the fistula/graft arm",
      "Maintenance IV fluids running in an anuric patient",
      "Reacting to a post-dialysis potassium or a hemodilated post-fluid Hgb — timing of the draw matters",
      "Treating a chronically 'high' BUN and creatinine as an acute problem — trends against their own baseline, not the reference range",
      "Holding phosphate binders because the patient is NPO, then continuing to hold them when meals resume — binders only work with food",
      "Giving fluids for oliguria in a patient who has been anuric for years",
      "Forgetting to renally dose (or avoid) meds: gabapentin, baclofen, morphine, enoxaparin, NSAIDs, magnesium- or phosphate-containing bowel preps",
      "Transfusing liberally in a transplant candidate — sensitization risk; transfuse for symptoms/ischemia, not a number",
      "Not telling the dialysis unit what happened — the discharge handoff (new dry weight, med changes, access events) is part of the consult",
      "PD: reflexively converting to HD because 'the hospital doesn't do PD' — many admissions can continue PD if supplies and trained nurses are arranged; ask before switching",
      "PD: forgetting the abdomen must be drained before abdominal surgery, paracentesis, or imaging that a full belly would confound",
      "PD: missing hidden glucose load — dextrose dialysate is absorbed and matters for glycemic control; icodextrin falsely elevates some point-of-care glucose readings (GDH-PQQ meters)",
      "PD: sampling effluent after a dry abdomen or too-short dwell — instill dialysate and allow a dwell ≥2 h before sending the cell count",
    ],

    assessmentFramework: [
      "1. Recover the outpatient prescription: unit, schedule, dry weight, access, last session",
      "2. Volume: current weight vs dry weight, exam, oxygen — how much to remove and over how many sessions",
      "3. Potassium and acid-base: pre-dialysis values, trajectory, whether the next scheduled run is soon enough",
      "4. Access: examine it every day — thrill/bruit or exit site; protect the arm (sign above the bed)",
      "5. Dialysis plan: dialyze today vs next scheduled day; adjust for contrast studies, procedures, and OR timing",
      "6. Anemia: Hgb, TSAT, ferritin — ESA and IV iron usually continue per the outpatient protocol. KDIGO 2026: keep Hgb below 11.5 g/dL on ESA (start ESA around Hgb 9–10); on HD, iron is indicated when ferritin ≤500 and TSAT ≤30%, and routine iron is held once ferritin >700 or TSAT ≥40% (PIVOTAL supports proactive IV iron)",
      "7. CKD-MBD: phosphorus, calcium, PTH — binders with every meal once eating; continue calcimimetic/vitamin D analog; PTH target roughly 2–9× upper normal (KDIGO)",
      "8. Nutrition: dialysis patients need protein (~1.2 g/kg/day) — do not reflexively order a low-protein 'renal' diet; K/phos restriction, yes",
      "9. Disposition: confirm the unit has a chair on the right day, and hand off dry weight and med changes",
      "10. PD patients: decide early whether PD continues in-house (supplies, trained nurses, who runs the cycler) or temporary HD is needed; examine the exit site and effluent daily; drain the abdomen before abdominal procedures; count the dextrose absorbed toward glycemic control; if effluent turns cloudy, culture first and move to the PD Peritonitis pathway",
    ],

    discussionQuestions: [
      "A 58-year-old on MWF dialysis via left forearm fistula is admitted Saturday with cellulitis. He last dialyzed Friday, weighs 84 kg against a dry weight of 82 kg, and potassium is 5.1. The admitting team asks if he needs dialysis tonight. How do you decide, and what do you tell them?",
      "A 47-year-old ESRD patient with a right IJ tunneled catheter spikes a fever to 38.9°C during dialysis. Blood pressure is stable. Walk through your evaluation and management — what do you culture, what antibiotics do you start, and when does the catheter come out?",
      "You are consulted on a 63-year-old dialysis patient admitted with pneumonia. The intern placed a PICC order for a 10-day antibiotic course and wrote for maintenance fluids at 75 mL/hr. She is anuric. What do you change and why?",
      "A 39-year-old transplant-listed patient on HD has Hgb 7.8, asymptomatic, TSAT 15%, ferritin 180. The team wants to transfuse. What do you recommend instead, and why does the transfusion decision matter more in this patient?",
      "A 55-year-old on HD is admitted for 5 days. His phosphorus on admission was 7.2. The team continued his sevelamer 'TID' but he was NPO for 3 of those days, and now he is eating again. His nurse asks when to give the binder doses. What do you teach the team about how binders work?",
      "A 61-year-old on nightly cycler PD is admitted with a COPD exacerbation, expected stay 3–4 days. The hospitalist writes 'hold PD, nephrology to arrange HD.' Her effluent is clear, she is euvolemic, and potassium is 4.9. What do you recommend instead, and what logistics do you need to sort out for her to continue PD in the hospital?",
      "A 52-year-old PD patient is admitted for an elective colonoscopy with possible polypectomy. The GI team asks if there is anything special to do around the procedure. What do you tell them about the abdomen, antibiotic prophylaxis, and restarting exchanges?",
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
      "How would you frame the role of obinutuzumab (REGENCY, NEJM 2025; FDA-approved Oct 2025) in active proliferative lupus nephritis on top of MMF + steroids? When would you reach for it vs belimumab or voclosporin?",
      "ORIGIN-3 (NEJM 2025) showed atacicept reduced UPCR 42% vs placebo at 36 weeks in IgAN. Together with sibeprenlimab (VISIONARY) and iptacopan (APPLAUSE-IgAN), how do you sequence the new IgAN therapies on top of supportive care?",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  HRS-AKI CONSULT ESSENTIALS
  // ═══════════════════════════════════════════════════════════════════
  HRS: {
    topic: "HRS",
    icon: "🫀",
    title: "HRS-AKI Consult",
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
      "Whether adequate IV albumin volume resuscitation has been given (ICA/ADQI 2024 no longer mandates a fixed 48h 1 g/kg/day albumin protocol — use clinical judgment)",
      "Renal ultrasound to rule out obstruction",
      "Whether patient is listed for liver transplant",
    ],
    thirtySecondSummary:
      "\"AKI in a cirrhotic with ascites, Cr from __ to __, urine Na __, no evidence of shock/nephrotoxins/obstruction. No improvement after adequate volume resuscitation with albumin and withdrawal of diuretics. This is consistent with HRS-AKI by ICA/ADQI 2024 criteria. MELD is __.\"",
    howToPresent:
      "\"This is a __-year-old with decompensated cirrhosis (etiology __), MELD __, admitted for __, now with AKI (Cr __ from baseline __). We have ruled out prerenal (no improvement after adequate albumin resuscitation), obstruction (normal US), nephrotoxins (none), and GN (bland sediment, no significant proteinuria). Diagnostic paracentesis showed __. This meets the ICA/ADQI 2024 criteria for HRS-AKI.\"",
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
      "Diagnosing HRS without first giving adequate volume resuscitation (the 2024 ADQI/ICA update focuses on clinically adequate resuscitation rather than a rigid 2-day 1 g/kg/day protocol)",
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
      "4. Give adequate volume resuscitation with IV albumin + hold diuretics (ICA/ADQI 2024 no longer requires a rigid 1 g/kg/day × 2-day protocol — judge adequacy clinically)",
      "5. If Cr does not improve with adequate volume + no other cause → diagnose HRS-AKI → start terlipressin + albumin (check for volume overload first)",
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
    title: "Contrast-Associated AKI",
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
      "Automatically hydrating every stable eGFR 30-59 patient receiving IV contrast instead of risk-stratifying prophylaxis",
    ],
    assessmentFramework: [
      "1. Confirm AKI timeline matches CI-AKI (onset 24-48h, peak 3-5 days, recovery 7 days)",
      "2. Exclude other AKI causes (UA, sediment, check for new meds, hemodynamic events)",
      "3. If post-angiography, consider atheroemboli (different entity, worse prognosis)",
      "4. Supportive care: Avoid additional nephrotoxins, maintain euvolemia, adjust meds for GFR",
      "5. For future contrast: risk-stratify by AKI/eGFR, route (IV vs intra-arterial), hemodynamics, and volume; use isotonic saline prophylaxis when indicated and minimize contrast volume",
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
    title: "Rhabdomyolysis Consult",
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
    title: "Cardiorenal Syndrome",
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
      "DAPA-HF (NEJM 2019) showed dapagliflozin reduced HF/CV death 26% in HFrEF and slowed eGFR decline. How does the initial 'eGFR dip' from SGLT2i fit into your conversation with the cardiology team about Cr changes during decongestion?",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  DIABETIC KIDNEY DISEASE ESSENTIALS
  // ═══════════════════════════════════════════════════════════════════
  DKD: {
    topic: "DKD",
    icon: "🩸",
    title: "Diabetic Kidney Disease",
    subtitle: "The #1 cause of ESRD — optimize every pillar",
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
      "4. BP optimization: standardized office SBP <120 if tolerated; routine clinic/home targets are often closer to <130/80",
      "5. Glycemic control: HbA1c <7% (individualize in elderly/CKD)",
      "6. Cardiovascular risk: statin per KDIGO lipid guidance (non-dialysis CKD adults ≥50 y; age 18–49 by standard ASCVD risk) — do NOT start de novo once on dialysis; aspirin per usual ASCVD indications",
    ],
    discussionQuestions: [
      "What are the 4 pillars of DKD therapy and the key trial supporting each?",
      "When should you biopsy a diabetic patient with kidney disease?",
      "Why does the initial eGFR dip from SGLT2i and ACEi/ARB represent protection, not injury?",
      "How does finerenone differ from spironolactone?",
      "What is the role of the KFRE (Kidney Failure Risk Equation) in managing DKD?",
      "CONFIDENCE (NEJM 2025) showed simultaneous initiation of finerenone + empagliflozin reduced UACR more than either alone (-29% vs finerenone, -32% vs empagliflozin). Should you start both pillars at once instead of stepwise — and what are the safety considerations?",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  PD PERITONITIS CONSULT ESSENTIALS
  // ═══════════════════════════════════════════════════════════════════
  "PD Peritonitis": {
    topic: "PD Peritonitis",
    icon: "🫧",
    title: "PD Peritonitis Consult",
    subtitle: "Cloudy bag = peritonitis until proven otherwise",
    whyWeGetConsulted:
      "PD patient admitted with cloudy effluent ± abdominal pain. Team wants guidance on diagnosis confirmation, empiric antibiotics, and whether the catheter needs to come out.",
    teachingPearl:
      "Cloudy effluent is peritonitis until proven otherwise. The single most important step is sending the effluent for cell count and culture (in blood culture bottles!) before starting antibiotics. IP antibiotics are the standard — not IV.",
    beforeRounds: [
      "Effluent appearance (cloudy = #1 sign)",
      "Effluent cell count (ISPD 2022: >100 WBC/μL with >50% PMNs, after a dwell ≥2 h — in APD/short dwells, lean on the PMN percentage)",
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
      "Refractory peritonitis — no clinical improvement after ~5 days of appropriate IP antibiotics. ISPD 2022 allows expectant management beyond day 5 if effluent WBC is clearly trending down; otherwise remove catheter",
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
      "Sampling after too short a dwell — aim for effluent after a dwell ≥2 h; if the abdomen is dry, instill dialysate and allow a dwell before sampling",
    ],
    assessmentFramework: [
      "1. Confirm peritonitis: Cloudy effluent + WBC >100/μL with >50% PMNs",
      "2. SEND CULTURES (in blood culture bottles) before antibiotics",
      "3. Start empiric IP antibiotics per ISPD 2022 — regimen should be center-specific and cover gram-positive plus gram-negative. Common choices: IP vancomycin (or first-gen cephalosporin) + IP ceftazidime (or IP aminoglycoside such as gentamicin). IP cefepime monotherapy is also acceptable.",
      "4. Examine exit site and tunnel for concurrent infection",
      "5. Tailor antibiotics to culture results at 48-72h",
      "6. Duration: 14-21 days. If not clinically improving by day 5 → consider catheter removal, but ISPD 2022 allows expectant management beyond day 5 if effluent WBC is clearly trending toward normal",
      "7. Catheter removal: Fungal, refractory (no improvement by day 5 with rising/plateaued effluent WBC), relapsing, peritonitis with tunnel/exit-site infection",
    ],
    discussionQuestions: [
      "Why are IP antibiotics preferred over IV for PD peritonitis?",
      "Why should effluent be sent in blood culture bottles rather than standard tubes?",
      "What organisms suggest a surgical abdomen rather than typical PD peritonitis?",
      "When is catheter removal indicated, and can PD be resumed after?",
      "How do you distinguish chemical peritonitis from infectious peritonitis?",
    ],
  },
  // ═══════════════════════════════════════════════════════════════════
  //  ACID-BASE CONSULT
  // ═══════════════════════════════════════════════════════════════════
  "Acid-Base": {
    topic: "Acid-Base",
    icon: "⚗️",
    title: "Acid-Base Consult",
    subtitle: "Name every disorder, find the hidden second one, and treat the cause",

    whyWeGetConsulted:
      "Nephrology is called for severe or unexplained metabolic acidosis or alkalosis, suspected toxic alcohol ingestion, renal tubular acidosis, and acidosis that may need dialysis. The job is to name every disorder present (there is often more than one), find the cause, and decide whether bicarbonate or dialysis is needed.",

    teachingPearl:
      "Always calculate the anion gap — even when the bicarbonate looks normal. A high gap can hide behind a coexisting metabolic alkalosis.",

    beforeRounds: [
      "pH and pCO2 (a VBG is fine for pH and HCO3 trends)",
      "BMP: Na, Cl, HCO3, K, BUN, Cr, glucose",
      "Albumin (to correct the anion gap)",
      "Lactate and beta-hydroxybutyrate",
      "Serum osmolality if a toxic alcohol is possible (calculate the osmolar gap)",
      "Ethanol, salicylate, and acetaminophen levels; methanol/ethylene glycol if available",
      "Urine pH and urine Na/K/Cl if the gap is normal (urine anion gap) or for metabolic alkalosis (urine Cl)",
      "Medications: metformin, SGLT2 inhibitors (euglycemic DKA), topiramate/acetazolamide, laxatives, diuretics",
      "GI losses: diarrhea, ostomy output, vomiting, NG suction",
      "How much normal saline has been given (hyperchloremic acidosis)",
    ],

    thirtySecondSummary:
      "\"Primary __ (pH __, pCO2 __, HCO3 __) with appropriate/inappropriate compensation. Anion gap __ (albumin-corrected __). Adding back the delta gap gives a HCO3 of __, so there is/isn't a second metabolic disorder. Most likely cause is __; the urgent issue is __.\"",

    howToPresent:
      "\"This is a __-year-old with __ admitted for __. The blood gas shows pH __, pCO2 __, HCO3 __ — a primary __ with __ compensation by Winter's formula. The anion gap is __, or __ corrected for an albumin of __. Adding back the delta gap gives a corrected HCO3 of __, which means __. The osmolar gap is __, lactate __, and beta-hydroxybutyrate __. My leading cause is __ because __; I also considered __. I recommend __.\"",

    topDifferentialBuckets: [
      "Anion-gap acidosis: lactate, ketones (DKA, alcoholic, starvation), toxic alcohols (methanol, ethylene glycol), salicylate, kidney failure, D-lactate, pyroglutamic acid (chronic acetaminophen)",
      "Non-gap acidosis: diarrhea or ostomy losses, saline resuscitation, renal tubular acidosis (types 1, 2, 4), early CKD, acetazolamide/topiramate",
      "Metabolic alkalosis: vomiting or NG suction, diuretics, volume contraction, mineralocorticoid excess, milk-alkali syndrome, after correcting chronic hypercapnia",
      "Respiratory acidosis or alkalosis — alone or mixed with the above",
    ],

    redFlags: [
      "pH <7.1 or a rapidly falling HCO3",
      "Osmolar gap >10 with an anion-gap acidosis → toxic alcohol until proven otherwise",
      "Salicylate toxicity: tinnitus, respiratory alkalosis plus anion-gap acidosis",
      "Rising lactate despite resuscitation → look for ischemia (bowel)",
      "Euglycemic DKA on an SGLT2 inhibitor",
      "pCO2 higher than Winter's formula predicts → the patient is tiring; impending respiratory failure",
    ],

    commonMistakes: [
      "Not correcting the anion gap for low albumin",
      "Stopping after one disorder — missing the second (add back the delta gap)",
      "Skipping the compensation check (Winter's formula)",
      "Treating a number without finding the cause",
      "Missing an osmolar gap in an unexplained anion-gap acidosis",
      "Giving large volumes of normal saline, then being surprised by a non-gap acidosis",
    ],

    assessmentFramework: [
      "Primary disorder: acidemia or alkalemia; metabolic or respiratory",
      "Compensation — appropriate, or a second respiratory disorder?",
      "Anion gap, corrected for albumin",
      "Add back the delta gap — hidden metabolic alkalosis or non-gap acidosis?",
      "Osmolar gap if the anion-gap acidosis is unexplained",
      "Urine anion gap / urine pH (non-gap) or urine Cl (alkalosis)",
      "Cause, severity, and treatment: fluids, bicarbonate, insulin, fomepizole, or dialysis",
    ],

    discussionQuestions: [
      "A patient with DKA has Na 138, Cl 94, HCO3 10, and albumin 4.0. What is the corrected HCO3 after adding back the delta gap, and what second disorder is present?",
      "When does a metabolic acidosis need dialysis rather than bicarbonate?",
    ],

    relatedTools: [{ refId: "acidbase", label: "ABG Interpreter — does the add-back math for you" }],

    lessons: [
      {
        heading: "Quick Lesson: The Add-Back Method (Delta Gap)",
        items: [
          "Why: an anion-gap acidosis can hide a second metabolic disorder. The add-back method asks, \"What would the HCO3 be if the extra gap acid weren't there?\"",
          "1. Anion gap: AG = Na − (Cl + HCO3). Normal is about 12 (know your lab's normal).",
          "2. Correct for albumin: add 2.5 for every 1 g/dL the albumin is below 4.",
          "3. Delta gap: ΔAG = corrected AG − 12. Roughly, each extra unit of gap used up one unit of HCO3.",
          "4. Add it back: corrected HCO3 = measured HCO3 + ΔAG.",
          "5. Interpret: corrected HCO3 >26 → a metabolic alkalosis is also present. 22–26 → a pure anion-gap acidosis. <22 → a non-gap acidosis is also present.",
          "Same idea as the delta-delta ratio (ΔAG ÷ [24 − HCO3]): >2 → alkalosis too; 1–2 → pure; <1 → non-gap acidosis too.",
          "Caveat: it's an estimate. Lactic acidosis often runs a ratio near 1.6; ketoacidosis runs closer to 1 because ketones are lost in the urine. Use a borderline result as a prompt to look for a second cause, not as proof.",
        ],
      },
      {
        heading: "Worked Example 1 — DKA With 2 Days of Vomiting",
        format: "example",
        items: [
          "Labs: pH 7.18, pCO2 24, Na 138, Cl 94, HCO3 10, albumin 4.0, glucose 540.",
          "Compensation: Winter's expected pCO2 = 1.5 × 10 + 8 = 23 ± 2 → 24 fits (appropriate).",
          "AG = 138 − (94 + 10) = 34. Albumin is normal, so no correction.",
          "ΔAG = 34 − 12 = 22. Corrected HCO3 = 10 + 22 = 32 → above 26.",
          "Answer: anion-gap acidosis from DKA PLUS a metabolic alkalosis from vomiting. Without the add-back, you'd miss the vomiting-related volume and K losses.",
        ],
      },
      {
        heading: "Worked Example 2 — DKA After 6 L of Normal Saline",
        format: "example",
        items: [
          "Labs on day 2: Na 140, Cl 115, HCO3 13, albumin 3.0.",
          "AG = 140 − (115 + 13) = 12. Corrected for albumin: 12 + 2.5 × (4 − 3) = 14.5.",
          "ΔAG = 14.5 − 12 = 2.5. Corrected HCO3 = 13 + 2.5 = 15.5 → below 22.",
          "Answer: the ketoacidosis has essentially cleared (the gap is closed); what's left is a non-gap (hyperchloremic) acidosis from saline and urinary ketone losses. Move to subcutaneous insulin per the DKA protocol and use a balanced fluid if more is needed.",
        ],
      },
      {
        heading: "Step-by-Step ABG Approach",
        items: [
          "1. Acidemia (pH <7.35) or alkalemia (pH >7.45)?",
          "2. Primary process: does the HCO3 or the pCO2 explain the pH?",
          "3. Compensation — metabolic acidosis: Winter's formula, expected pCO2 = 1.5 × HCO3 + 8 ± 2. Metabolic alkalosis: pCO2 rises ~0.7 per 1 mEq/L rise in HCO3. Respiratory acidosis: HCO3 rises 1 (acute) or 3.5 (chronic) per 10 mmHg pCO2. Respiratory alkalosis: HCO3 falls 2 (acute) or 5 (chronic) per 10 mmHg.",
          "4. Anion gap, corrected for albumin — every time.",
          "5. High gap: add back the delta gap, and check the osmolar gap if the cause is unclear (measured osm − [2 × Na + glucose/18 + BUN/2.8]; >10 is abnormal).",
          "6. Non-gap acidosis: urine anion gap (Na + K − Cl). Negative → GI losses (kidneys excreting acid normally); positive → a kidney cause (RTA).",
          "7. Metabolic alkalosis: urine Cl <20 → vomiting, NG suction, or prior diuretics (saline-responsive); >20 → current diuretics or mineralocorticoid excess (check BP, renin, aldosterone).",
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  HYPERNATREMIA CONSULT
  // ═══════════════════════════════════════════════════════════════════
  Hypernatremia: {
    topic: "Hypernatremia",
    icon: "🧂",
    title: "Hypernatremia Consult",
    subtitle: "A water problem — find the loss, calculate the deficit, and correct safely",

    whyWeGetConsulted:
      "Hypernatremia almost always means the patient lost water and couldn't drink enough to replace it — usually because they are sick, sedated, intubated, or elderly. Nephrology helps find where the water is going (kidneys or elsewhere), rule out diabetes insipidus, and plan how much free water to give and how fast.",

    teachingPearl:
      "Hypernatremia is a water problem, not a sodium problem. Someone with intact thirst and access to water almost never stays hypernatremic — so always ask why this patient couldn't drink.",

    beforeRounds: [
      "Na trend and how fast it rose (acute <48 h vs chronic)",
      "Access to water: intubated, confused, NPO, elderly with dementia?",
      "Urine output (polyuria >3 L/day?)",
      "Urine osmolality and urine Na/K",
      "Glucose (osmotic diuresis) and BUN (urea diuresis from high-protein tube feeds or recovering AKI)",
      "IV fluids and tube feeds: type, rate, free water flushes",
      "GI losses, fever, burns, other insensible losses",
      "Medications: lithium (nephrogenic DI), loop diuretics, mannitol, lactulose, hypertonic saline, sodium bicarbonate",
      "Weight (for the free water deficit)",
      "Mental status",
    ],

    thirtySecondSummary:
      "\"Hypernatremia to __ over __ from __ water loss (urine osm __) in a patient who can't drink because __. Free water deficit is about __ L plus ongoing losses of __; plan __, aiming to lower Na by no more than 10 mEq/L in 24 h.\"",

    howToPresent:
      "\"This is a __-year-old with __, now with Na rising from __ to __ over __. They can't drink because __. Urine output is __ with a urine osm of __, which points to __ (water loss outside the kidneys / osmotic diuresis / diabetes insipidus). Volume status is __. The free water deficit is about __ L using a TBW factor of __, plus ongoing losses of __. I recommend __ (route and rate), with Na checks every __ hours, lowering Na by no more than 10 mEq/L in 24 h.\"",

    topDifferentialBuckets: [
      "Water loss outside the kidneys (urine osm >600 — kidneys are conserving water): fever, sweating, burns, osmotic diarrhea, NG suction, poor intake",
      "Osmotic diuresis (urine osm ~300–600 with high urine output): hyperglycemia, urea (high-protein tube feeds, recovering AKI), mannitol",
      "Central diabetes insipidus (dilute urine that concentrates with desmopressin): head injury, neurosurgery, tumors",
      "Nephrogenic diabetes insipidus (dilute urine, no desmopressin response): lithium, hypercalcemia, hypokalemia, after relief of obstruction",
      "Sodium gain (less common): hypertonic saline, sodium bicarbonate, salt ingestion",
    ],

    redFlags: [
      "Na >160, or rising quickly",
      "Confusion, seizures, or coma",
      "Polyuria >3 L/day with dilute urine (diabetes insipidus) — Na can climb fast",
      "Shock — restore circulation with isotonic fluid before free water",
      "Correcting chronic hypernatremia too fast (cerebral edema)",
    ],

    commonMistakes: [
      "Giving normal saline when the patient isn't in shock (it keeps the Na high)",
      "Calculating the deficit but forgetting ongoing losses (urine, stool, insensible)",
      "Not checking urine osm — it separates water loss from diabetes insipidus",
      "Using a TBW factor of 0.6 for everyone (older women are ~0.45)",
      "Lowering chronic hypernatremia faster than ~10 mEq/L in 24 h",
      "Forgetting free water flushes in tube-fed patients",
    ],

    assessmentFramework: [
      "Severity and acuity (acute vs chronic)",
      "Why the patient couldn't drink",
      "Source of water loss (urine osm: outside the kidneys, osmotic diuresis, or DI)",
      "Volume status (shock needs isotonic fluid first)",
      "Free water deficit plus ongoing losses",
      "Route (water by mouth/tube vs D5W IV) and rate",
      "Na monitoring schedule and target",
    ],

    discussionQuestions: [
      "An 84-year-old woman (50 kg) from a nursing home has Na 160 and a urine osm of 720. What is her free water deficit, and how would you replace it?",
      "How do you tell central from nephrogenic diabetes insipidus?",
    ],

    relatedTools: [{ refId: "fwd", label: "Free Water Deficit calculator" }],

    lessons: [
      {
        heading: "Quick Lesson: Planning Free Water Replacement",
        items: [
          "1. Free water deficit = TBW × (Na ÷ 140 − 1). TBW = weight × 0.6 (young men), 0.5 (young women and older men), 0.45 (older women).",
          "2. Add ongoing losses: urine free water, stool, and about 0.8–1 L/day of insensible loss (more with fever or tachypnea).",
          "3. Rate: for chronic hypernatremia, lower Na by no more than 10 mEq/L in 24 h and replace the deficit over about 48–72 h. Acute hypernatremia (<48 h, e.g., a salt load) can be corrected faster.",
          "4. Route: water by mouth or free water flushes when the gut works; D5W IV otherwise (watch the glucose). If the patient is in shock, restore circulation with isotonic fluid first.",
          "5. Check the effect of one liter: change in Na = (fluid Na − serum Na) ÷ (TBW + 1). D5W in a 50-kg older woman with Na 160: (0 − 160) ÷ (22.5 + 1) ≈ −6.8 mEq/L per liter.",
          "6. Recheck Na every 4–6 h and adjust — formulas are only estimates.",
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  HYPERCALCEMIA CONSULT
  // ═══════════════════════════════════════════════════════════════════
  Hypercalcemia: {
    topic: "Hypercalcemia",
    icon: "🦴",
    title: "Hypercalcemia Consult",
    subtitle: "PTH splits the differential; fluids come first; protect the kidneys",

    whyWeGetConsulted:
      "Nephrology is consulted when high calcium causes AKI, when it won't come down with fluids, or when dialysis might be needed. The job is to confirm true hypercalcemia, split PTH-dependent from PTH-independent causes, and lower the calcium safely.",

    teachingPearl:
      "Check the PTH first — it splits the whole differential in two. A high or normal PTH means parathyroid; a suppressed PTH means look for cancer, vitamin D, or other causes.",

    beforeRounds: [
      "Calcium trend with albumin (corrected Ca) or an ionized calcium",
      "PTH",
      "If PTH is suppressed: PTHrP, 25-OH vitamin D, 1,25-(OH)2 vitamin D, SPEP, and serum free light chains",
      "Cr/BUN, phosphorus, magnesium, K",
      "Symptoms: confusion, weakness, constipation, polyuria, nausea",
      "Medications: thiazides, lithium, calcium and vitamin D supplements, calcium carbonate antacids, vitamin A",
      "Known cancer, granulomatous disease (sarcoidosis, TB), immobilization",
      "ECG (short QT)",
      "Volume status (polyuria causes dehydration)",
    ],

    thirtySecondSummary:
      "\"Hypercalcemia (corrected Ca __, ionized __) with PTH __, so this is PTH-dependent/independent, most likely from __. It is causing __. Plan: IV fluids __, calcitonin __, an antiresorptive __, and dialysis only if __.\"",

    howToPresent:
      "\"This is a __-year-old with __, found to have a calcium of __ (albumin __, ionized __) with __ symptoms. PTH is __, PTHrP __, vitamin D levels __, and SPEP __. Cr is __ from a baseline of __, likely from __. The most likely cause is __. I recommend __.\"",

    topDifferentialBuckets: [
      "PTH high or normal: primary hyperparathyroidism, tertiary hyperparathyroidism (long CKD or after transplant), lithium, familial hypocalciuric hypercalcemia (FHH)",
      "Malignancy (PTH suppressed): PTHrP (squamous cancers, breast, kidney), bone metastases, myeloma, lymphoma (1,25-vitamin D)",
      "Vitamin D: supplement excess (high 25-OH D); granulomatous disease or lymphoma (high 1,25-(OH)2 D)",
      "Milk-alkali syndrome (calcium carbonate + metabolic alkalosis + AKI)",
      "Other: thiazides, immobilization, hyperthyroidism, vitamin A, adrenal insufficiency",
    ],

    redFlags: [
      "Ca >14 mg/dL or neurologic symptoms",
      "AKI or oliguria limiting how much fluid you can give",
      "Arrhythmia or short QT",
      "New hypercalcemia with a suppressed PTH → work up cancer and myeloma",
      "Heart failure or dialysis dependence (can't give large fluid volumes)",
    ],

    commonMistakes: [
      "Not checking an ionized calcium when the albumin is abnormal",
      "Starting furosemide before volume is restored (it is not first-line)",
      "Forgetting to stop calcium, vitamin D, thiazides, and lithium",
      "Choosing an antiresorptive without thinking about kidney function (zoledronic acid can worsen AKI; denosumab can cause severe low calcium in advanced CKD)",
      "Forgetting myeloma (SPEP + serum free light chains)",
      "Missing milk-alkali syndrome from calcium carbonate antacids",
    ],

    assessmentFramework: [
      "Confirm true hypercalcemia (corrected or ionized Ca)",
      "Severity and symptoms",
      "PTH-dependent vs PTH-independent",
      "Kidney effects: AKI, polyuria (nephrogenic DI), volume depletion",
      "Acute treatment: fluids, calcitonin, antiresorptive; dialysis if refractory",
      "Stop contributing drugs",
      "Workup and treatment of the cause",
    ],

    discussionQuestions: [
      "A 70-year-old smoker has Ca 14.2, PTH 8 pg/mL, and Cr 2.1 (baseline 1.0). What is your leading diagnosis, and what do you do in the next 24 hours?",
      "Why do patients with hypercalcemia become volume depleted?",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  OBSTRUCTIVE (POST-RENAL) AKI
  // ═══════════════════════════════════════════════════════════════════
  Obstruction: {
    topic: "Obstruction",
    icon: "🚰",
    title: "Obstructive (Post-Renal) AKI",
    subtitle: "Find it fast, relieve it, and manage the post-obstructive diuresis",

    whyWeGetConsulted:
      "Obstruction is one of the most reversible causes of AKI, so it has to be found early. Nephrology helps confirm it, supports the decision on decompression (Foley, stent, nephrostomy), and manages fluids and electrolytes after the blockage is relieved.",

    teachingPearl:
      "Every unexplained AKI deserves a bladder scan and a renal ultrasound. The sooner an obstruction is relieved, the more kidney function comes back.",

    beforeRounds: [
      "Urine output pattern: anuria, or alternating low and high output",
      "Bladder scan / post-void residual",
      "Foley: present? flushed? draining?",
      "Renal ultrasound: hydronephrosis (one side or both), bladder distension, stones",
      "Prostate history, pelvic or retroperitoneal cancer, stones, prior pelvic surgery or radiation",
      "Medications that cause retention: anticholinergics, opioids, decongestants, antihistamines",
      "Single functioning kidney or transplant?",
      "K, HCO3, Na, Cr trend",
      "Fever or sepsis with hydronephrosis (an infected obstructed kidney is an emergency)",
    ],

    thirtySecondSummary:
      "\"AKI from obstruction at the level of __ (bladder outlet / both ureters / single kidney), found on __ and relieved with __. Now the issues are __ (post-obstructive diuresis, K, acidosis), and Cr is __.\"",

    howToPresent:
      "\"This is a __-year-old with __, admitted with __, with Cr rising from __ to __ and urine output of __. Bladder scan showed __ mL and ultrasound shows __ hydronephrosis, so the likely level of obstruction is __. A Foley/nephrostomy drained __. Since then urine output is __ mL/h. Electrolytes show __. I recommend __.\"",

    topDifferentialBuckets: [
      "Bladder outlet: BPH, prostate cancer, urethral stricture, blood clots, neurogenic bladder, medications (anticholinergics, opioids)",
      "Both ureters (or one ureter with a single kidney): stones, pelvic or retroperitoneal tumor, retroperitoneal fibrosis, surgical injury",
      "Blocked or kinked Foley",
      "Not true obstruction (no hydronephrosis): crystals or myeloma casts inside the tubules",
    ],

    redFlags: [
      "Fever with hydronephrosis → infected obstructed kidney; urgent decompression (urology/IR)",
      "Anuria",
      "Hyperkalemia or severe acidosis",
      "Post-obstructive diuresis >200 mL/h — risk of dehydration and electrolyte loss",
      "Clots obstructing the Foley",
    ],

    commonMistakes: [
      "Skipping the bladder scan in a patient with little or no urine output",
      "Assuming a Foley works without flushing it",
      "Replacing urine output 1:1 after decompression (it keeps the diuresis going)",
      "Forgetting that one-sided obstruction raises Cr only with a single working kidney or CKD",
      "Not checking K, Na, Mg, and phosphorus every 6–12 h during a post-obstructive diuresis",
      "Missing obstruction without hydronephrosis (very early, severe volume depletion, retroperitoneal encasement)",
    ],

    assessmentFramework: [
      "Is there obstruction, and at what level?",
      "Infection above the blockage? (emergency)",
      "Relief: Foley vs ureteral stent vs nephrostomy",
      "Electrolytes and acid-base (hyperkalemic acidosis is common)",
      "Post-obstructive diuresis plan",
      "Cause and prevention (alpha-blocker, stone workup, oncology)",
      "Expected recovery — depends on how long it was blocked",
    ],

    discussionQuestions: [
      "An 80-year-old man with Cr 4.5 has 1,100 mL in his bladder. After a Foley, he makes 400 mL/h. What do you monitor, and how do you manage his fluids?",
      "Why can partial obstruction cause normal or even high urine output?",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  KIDNEY TRANSPLANT WITH AKI
  // ═══════════════════════════════════════════════════════════════════
  "Transplant AKI": {
    topic: "Transplant AKI",
    icon: "🫘",
    title: "Kidney Transplant with AKI",
    subtitle: "Drug levels, volume, infection, obstruction, rejection — and when to biopsy",

    whyWeGetConsulted:
      "A rising creatinine in a kidney transplant recipient threatens the graft. The job is to sort out common reversible causes (volume, drug levels, obstruction, infection) from rejection, which needs a biopsy — and to involve the transplant team early.",

    teachingPearl:
      "Never change immunosuppression on your own, and always call the transplant team. A small creatinine rise in a transplanted kidney matters more than the same rise in native kidneys.",

    beforeRounds: [
      "Transplant date, donor type (living or deceased), original kidney disease, transplant center",
      "Baseline (best) post-transplant Cr",
      "Immunosuppression regimen, recent changes, and the last doses actually taken",
      "Tacrolimus (or cyclosporine) trough level and whether it was a true trough",
      "New drugs that interact with tacrolimus: azole antifungals, clarithromycin/erythromycin, diltiazem/verapamil (raise levels); rifampin, phenytoin, carbamazepine (lower levels)",
      "Adherence, missed doses, cost or pharmacy problems",
      "History of donor-specific antibodies (DSA) or prior rejection",
      "BK virus PCR (blood) and CMV PCR",
      "UA, UPCR, urine culture",
      "Transplant kidney ultrasound with Doppler",
      "Volume status (diarrhea is common on mycophenolate)",
    ],

    thirtySecondSummary:
      "\"Kidney transplant recipient __ years out (__ donor) with Cr up from a baseline of __ to __. Tacrolimus level __, BK/CMV __, ultrasound __. Most likely __; rejection is/isn't a concern, and the transplant team has been notified.\"",

    howToPresent:
      "\"This is a __-year-old __ years after a __-donor kidney transplant for __, on __, with Cr rising from a baseline of __ to __ over __. Adherence is __. Tacrolimus trough is __ (goal __). BK and CMV PCR are __. UA shows __ and UPCR is __. Transplant ultrasound shows __. The differential is prerenal vs calcineurin inhibitor toxicity vs rejection vs BK nephropathy vs obstruction. I think __ is most likely because __. I recommend __, and we discussed it with the transplant team.\"",

    topDifferentialBuckets: [
      "Prerenal/hemodynamic: volume depletion (diarrhea), NSAIDs, ACEi/ARB, high calcineurin inhibitor levels (vasoconstriction)",
      "Calcineurin inhibitor toxicity (high trough, drug interactions)",
      "Rejection: T-cell-mediated or antibody-mediated (low levels, missed doses, new DSA)",
      "Infection: BK nephropathy, graft pyelonephritis, CMV",
      "Obstruction: ureteral stricture, lymphocele, stones, urinary retention",
      "Vascular: transplant renal artery stenosis; renal artery or vein thrombosis (early)",
      "Recurrent or new kidney disease (FSGS, IgA, others); TMA",
    ],

    redFlags: [
      "Sudden anuria, or a painful swollen graft → vascular thrombosis or severe rejection",
      "Fever with a tender graft → graft pyelonephritis",
      "Very low tacrolimus level or missed doses → rejection risk",
      "New DSA or rising proteinuria",
      "Cr up >20–25% from baseline without a clear reversible cause → biopsy discussion",
    ],

    commonMistakes: [
      "Changing immunosuppression without the transplant team",
      "Interpreting a tacrolimus level that wasn't a true trough (drawn right before the dose)",
      "Missing a drug interaction (azoles, macrolides, diltiazem)",
      "Forgetting the transplant ultrasound with Doppler",
      "Using native-kidney thresholds — small Cr rises matter",
      "Giving NSAIDs for pain",
    ],

    assessmentFramework: [
      "Size and speed of the Cr rise from the post-transplant baseline",
      "Volume and hemodynamics",
      "Drug levels and interactions",
      "Infection screen (BK, CMV, urine)",
      "Imaging: transplant ultrasound with Doppler",
      "Rejection risk → biopsy decision with the transplant team",
      "Immunosuppression plan (transplant team) and supportive care",
    ],

    discussionQuestions: [
      "A patient 8 months after transplant has Cr 2.1 (baseline 1.2) and a tacrolimus trough of 3.2 after missing doses. What is your main concern, and what is the next step?",
      "Name three drugs that raise tacrolimus levels and two that lower them.",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  ACUTE INTERSTITIAL NEPHRITIS
  // ═══════════════════════════════════════════════════════════════════
  AIN: {
    topic: "AIN",
    icon: "💊",
    title: "Acute Interstitial Nephritis",
    subtitle: "Find the drug, stop it, and decide on biopsy and steroids",

    whyWeGetConsulted:
      "AIN is a common cause of AKI in the hospital that is often missed. The key steps are recognizing the pattern, stopping the culprit (usually a drug), and deciding with the team whether a biopsy or steroids are needed.",

    teachingPearl:
      "The classic triad of fever, rash, and eosinophilia appears in only about 10% of patients. Think AIN whenever the creatinine rises days to weeks after a new drug.",

    beforeRounds: [
      "Every drug started in the past days to months, with start dates (MAR and home list)",
      "Top culprits: beta-lactams, PPIs, NSAIDs, sulfa drugs (TMP-SMX), rifampin, fluoroquinolones, allopurinol, immune checkpoint inhibitors",
      "Timing of the Cr rise relative to each new drug",
      "UA with microscopy: sterile pyuria, WBC casts, low-grade proteinuria",
      "Rash, fever, joint pain",
      "CBC with eosinophils; LFTs",
      "Systemic disease: sarcoidosis, Sjögren's, IgG4-related disease, lupus; uveitis (TINU)",
      "Renal ultrasound (to exclude obstruction)",
    ],

    thirtySecondSummary:
      "\"AKI with Cr __ → __ starting about __ days after __ was started, with __ on the UA. Leading diagnosis is drug-induced AIN; the drug was stopped on __. Biopsy/steroid decision: __.\"",

    howToPresent:
      "\"This is a __-year-old admitted for __, with Cr rising from __ to __ starting __ days after __ was started. Exam shows __. UA shows __ WBCs with __ casts and __ protein. Ultrasound shows __. Other causes are less likely because __. I think this is drug-induced AIN from __. I recommend stopping __, listing it as an allergy, and __ (observe 3–5 days / biopsy / steroids).\"",

    topDifferentialBuckets: [
      "Drug-induced (most cases): antibiotics, PPIs, NSAIDs, immune checkpoint inhibitors, allopurinol",
      "Infection-associated",
      "Systemic or autoimmune: sarcoidosis, Sjögren's, IgG4-related disease, TINU",
      "Look-alikes: ATN, pyelonephritis, GN (red cells and RBC casts), atheroemboli (eosinophilia after a catheterization)",
    ],

    redFlags: [
      "Rapidly rising Cr or a need for dialysis",
      "No improvement 3–5 days after stopping the drug → biopsy and steroid discussion",
      "AKI on an immune checkpoint inhibitor → involve oncology early",
      "Severe drug reaction: facial swelling, mucosal lesions, liver injury (DRESS, SJS)",
    ],

    commonMistakes: [
      "Waiting for fever, rash, and eosinophilia — usually they're absent",
      "Relying on urine eosinophils (poor sensitivity and specificity)",
      "Not reviewing the full medication list with start dates",
      "Continuing the PPI because it seems harmless",
      "Starting steroids without a clear diagnosis when the picture is unclear — consider a biopsy",
      "Forgetting to list the drug as an allergy",
    ],

    assessmentFramework: [
      "Timeline: drug start → Cr rise",
      "Urine pattern: sterile pyuria, WBC casts",
      "Exclude other causes (prerenal, ATN, obstruction, GN)",
      "Stop the culprit and list it as an allergy",
      "Biopsy if unclear or not improving",
      "Steroids: consider if not improving within 3–5 days of stopping the drug, or earlier for severe AKI (with the attending)",
      "Follow Cr for recovery — some patients are left with CKD",
    ],

    discussionQuestions: [
      "A patient on day 10 of nafcillin has Cr 1.0 → 2.8, a rash, and WBC casts. What do you do?",
      "When would you biopsy a patient with suspected AIN?",
    ],
  },
};

export const INPATIENT_GUIDE_FOOTER =
  "Educational consult guide for student teaching. Not a substitute for individualized clinical judgment.";
