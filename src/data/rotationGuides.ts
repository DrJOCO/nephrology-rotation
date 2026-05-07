// Rotation workflow guides: workup, presentation, and daily follow-up.
// Topic-specific clinical prep belongs in inpatient consult guides and weekly study sheets.

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
    icon: "🔍",
    title: "Initial Consult: Workup",
    subtitle: "Chart review, interview, exam, and how to read the urine before you present",
    whyItMatters:
      "A clean nephrology presentation depends on what you gather first. Pull baseline kidney function, scrub the MAR for nephrotoxins, take a focused history, examine the patient with nephrology eyes, and read the UA and urine lytes yourself before you say a word on rounds.",
    teachingPearl:
      "Every shaky presentation traces back to skipped data. Workup before format.",
    sections: [
      {
        heading: "Before You See the Patient — Kidney & Lab Data",
        items: [
          "Consult question (what is the primary team actually asking?)",
          "Baseline creatinine — pull from prior hospitalizations or outpatient records; document \"no known baseline\" if none is available",
          "Current creatinine and trend over the last 24–72 hours",
          "Urine output (24-hour total and overnight)",
          "BP and hemodynamics; current IV fluids, diuretics, and pressors",
          "Major electrolytes (K, Na, HCO3, Ca, Phos, Mg)",
          "UA with microscopy if relevant; FENa or FEUrea, urine Na, UPCR/UACR if AKI or proteinuria workup",
          "Imaging — renal ultrasound, recent CT, and any recent IV or arterial contrast exposure",
        ],
      },
      {
        heading: "Before You See the Patient — Patient History",
        items: [
          "Outpatient nephrologist (if any) and known kidney history — CKD stage, prior biopsy, transplant, GN, ADPKD",
          "Medication list and MAR review for nephrotoxins — open the Nephrotoxic Drugs tool in this app for the full list (NSAIDs, IV contrast, aminoglycosides, vancomycin, ACEi/ARB, PPI, etc.)",
          "PMH — especially HTN, DM, HF, cirrhosis, autoimmune disease, malignancy",
          "PSH — especially recent surgeries or procedures with hemodynamic stress, blood loss, or contrast",
          "Home meds — prescription, OTC, herbal/supplements (be specific; ask the patient or family if unclear)",
          "Allergies",
          "Family history of kidney disease (ADPKD, Alport, hereditary FSGS, etc.)",
          "NSAID history — recent or chronic use, OTC ibuprofen/naproxen, topicals",
          "Volume history — vomiting, diarrhea, poor PO intake, aggressive recent diuresis",
          "Recent infections or sepsis (relevant for ATN)",
        ],
      },
      {
        heading: "For Dialysis Patients, Also Gather",
        items: [
          "Outpatient dialysis clinic name and nephrologist (call or page for prior records if needed)",
          "Modality (HD vs PD) and how long the patient has been on dialysis",
          "Access — type (AVF, AVG, tunneled catheter, PD catheter), location, and any current issues (clotting, infection, malfunction)",
          "Usual dry weight and typical UF goal",
          "Last dialysis session — when, how tolerated, any hypotension or complications",
          "Recent dialysis issues — missed sessions, frequent intradialytic hypotension, access infections, recent hospitalizations",
          "Residual urine output, if any",
        ],
      },
      {
        heading: "The Focused Nephrology Exam",
        items: [
          "Vitals: BP (consider orthostatics for volume assessment), HR, RR, SpO2, current weight (compare to admit and dry weight)",
          "Volume status: synthesize from JVD, mucous membranes, skin turgor, lungs, and edema — no single sign is enough",
          "JVD: examine with head of bed at 30°; elevated JVP suggests volume overload or RHF",
          "Lungs: rales (pulmonary edema), dullness or decreased breath sounds (pleural effusion)",
          "Heart: S3 (volume overload, cardiomyopathy), S4, pericardial rub (uremic pericarditis)",
          "Abdomen: ascites (shifting dullness, fluid wave), palpable kidneys (ADPKD), CVA tenderness, bladder distension",
          "Edema: pretibial (1+/2+/3+), sacral (in bed-bound patients), anasarca, periorbital",
          "Skin and neuro: skin turgor, asterixis or encephalopathy (uremia), bruising (uremic platelet dysfunction)",
          "Foley: present? urine appearance (clear, bloody, sediment-rich)? volume in bag?",
          "AVF / AVG: palpate for thrill, auscultate for bruit; check site for erythema, swelling, or pseudoaneurysm",
          "Tunneled HD catheter: inspect site and dressing; look for erythema or purulent drainage; cuff should be buried, not exposed",
          "PD catheter: exit site clean? Check effluent appearance if peritonitis is suspected (cloudy = peritonitis until proven otherwise)",
        ],
      },
      {
        heading: "How to Read the UA and Urine Lytes",
        items: [
          "UA specific gravity: >1.020 (concentrated) → volume depletion or prerenal; isosthenuric (~1.010) → ATN or impaired concentrating ability",
          "UA pH: normally 5–6; persistently >5.5 in the setting of metabolic acidosis → consider RTA",
          "Dipstick blood positive without RBCs on microscopy → myoglobinuria (rhabdo) or hemoglobinuria (hemolysis)",
          "Dipstick protein is crude — always quantify with a spot UPCR or UACR (UACR preferred for diabetic and CKD workups)",
          "Microscopy: dysmorphic RBCs or RBC casts → glomerulonephritis (glomerular bleeding)",
          "Microscopy: muddy brown or coarse granular casts → ATN",
          "Microscopy: WBC casts → pyelonephritis or AIN",
          "Microscopy: eosinophils (Hansel stain) → suggestive of AIN, but absence does not rule it out",
          "Microscopy: hyaline casts → nonspecific (concentrated urine, exercise, fever)",
          "Microscopy: crystals → consider stones or drug crystals (acyclovir, sulfa, methotrexate, oxalate)",
          "Urine Na <20 mEq/L → prerenal physiology; >40 mEq/L → ATN. Confounded by diuretics within 24 hours, CKD, or salt-wasting states",
          "FENa <1% → prerenal; >2% → ATN. Not reliable on loop diuretics or in advanced CKD — use FEUrea instead",
          "FEUrea <35% → prerenal; >50% → ATN. Preferred when the patient is on diuretics",
          "Urine osmolality >500 → concentrated (prerenal); ~300 (isosthenuric) → ATN or impaired concentrating ability",
          "Always interpret in context — timing of last diuretic, IV fluids, contrast, sepsis. No single value is reliable in isolation",
          "Open the Urine Cast Guide, Urine Sediment Atlas, FENa Calculator, and FEUrea Calculator tools in this app for quick reference and the math",
        ],
      },
      {
        heading: "Use the Topic Guides for the Clinical Details",
        items: [
          "For disease-specific workup detail, open the Inpatient Consult Guides for AKI, hyperkalemia, hyponatremia, dialysis, GN, HRS, contrast AKI, rhabdo, cardiorenal syndrome, DKD, or PD peritonitis.",
          "Once you have the workup in hand, move on to \"Initial Consult: Presentation\" for the format.",
        ],
      },
    ],
    commonMistakes: [
      "Not pulling baseline creatinine from prior records (or not documenting \"no known baseline\")",
      "Skipping the MAR review for nephrotoxins — NSAIDs, contrast, vanc/aminoglycosides, ACEi/ARB",
      "Not asking about NSAIDs, recent contrast, or the patient's outpatient nephrologist and dialysis clinic",
      "Skipping the physical exam — especially volume status, edema, and dialysis access",
      "Not looking at the urine sediment yourself — trusting the dipstick protein/blood without quantifying or microscopy",
      "Using FENa on a patient who is on loop diuretics (use FEUrea instead)",
      "Treating one urine value (Na, FENa, osm) as definitive instead of interpreting in context",
    ],
    teachingPoints: [
      "Workup before format — every weak presentation traces back to skipped data.",
      "Volume status is a synthesis: JVD + mucous membranes + lungs + edema together.",
      "For dialysis patients, the access exam is non-negotiable.",
      "Always look at the UA and microscopy yourself; the dipstick lies.",
    ],
  },

  initialConsultPresentation: {
    id: "initialConsultPresentation",
    icon: "🎤",
    title: "Initial Consult: Presentation",
    subtitle: "How to deliver a brief, trend-based, decision-focused presentation",
    whyItMatters:
      "Once you have the workup in hand (see \"Initial Consult: Workup\"), the presentation is how you turn data into a clinical argument. The best nephrology presentations are short, name the trajectory early, and end with a specific decision.",
    teachingPearl:
      "Do not present isolated numbers. Present trajectory, physiology, and the decision point.",
    sections: [
      {
        heading: "30-Second Consult Format",
        items: [
          "\"This is a __-year-old with __ who was consulted for __. Baseline kidney function is __, current creatinine is __, urine output is __, and the main issue appears to be __. Urgent concerns are __, and the main question today is __.\"",
        ],
      },
      {
        heading: "Full Consult Presentation Format",
        items: [
          "1. One-liner + consult question — \"This is a __-year-old with __, admitted for __, consulted for __.\"",
          "2. HPI — present the story like a normal H&P: hospital course, what triggered the consult, what the primary team has already tried (fluids, diuretics, holding meds)",
          "3. Pertinent PMH/PSH, home meds (call out nephrotoxins, ACEi/ARB, diuretics), allergies, FHx of kidney disease, social/NSAID history",
          "4. Physical exam — always include the nephrology-relevant items: BP and orthostatics if relevant, JVD, lungs (rales, effusions), heart (S3, rubs), abdomen, edema (pretibial, sacral, anasarca), mucous membranes / skin turgor for volume status, Foley (present? urine in bag and how much?), and dialysis access (thrill + bruit for AVF/AVG, site appearance for tunneled or PD catheters)",
          "5. Objective data — current creatinine and trend, baseline Cr, urine output, electrolytes, acid-base, UA with sediment, urine studies (FENa/FEUrea, urine Na, UPCR/UACR), imaging",
          "6. Assessment — name the problem, give the trajectory, give the leading mechanism and differential buckets",
          "7. Urgent issues (electrolyte emergencies, volume crisis, AEIOU dialysis indications)",
          "8. Plan — what needs to happen today, monitoring, and whether dialysis is on the table",
        ],
      },
      {
        heading: "How to Present the A/P",
        items: [
          "Name the problem in one sentence — e.g. \"AKI stage __ likely due to __\"",
          "State the trajectory — \"Cr is rising / stable / improving from __ to __ over __ hours\"",
          "Give the leading mechanism plus a brief differential (top 1–2 alternatives and why they are less likely)",
          "Call out urgent complications — hyperkalemia, severe acidosis, volume overload, AEIOU dialysis indications",
          "End with what you recommend today — be specific about labs to repeat, meds to hold/start/dose-adjust, fluids/diuretics, and whether dialysis is on the table",
        ],
      },
      {
        heading: "Example A/P Phrases",
        items: [
          "\"AKI with creatinine rising from __ to __, likely due to __ based on __. Urine output is __. No current indication / current indication for dialysis because __. Recommend __.\"",
          "\"Hyperkalemia due to __ with/without ECG changes. Temporizing measures include __. Definitive K removal plan is __.\"",
          "\"ESRD on chronic HD, last dialyzed __ via __. Current issue is __. Plan for inpatient dialysis __ and monitor __.\"",
        ],
      },
    ],
    commonMistakes: [
      "Starting with a long PMH instead of the consult question",
      "Not saying what changed",
      "Listing labs without interpretation",
      "Giving a diagnosis without discussing urgency",
      "Vague plans like \"monitor labs\" without specifics",
      "Reading numbers off the chart instead of stating the trajectory",
    ],
    teachingPoints: [
      "Start with the consult question.",
      "Say the trend early.",
      "End with the decision point.",
      "The presentation is your clinical argument — make it persuasive, not encyclopedic.",
    ],
  },

  consultFollowUp: {
    id: "consultFollowUp",
    icon: "🔄",
    title: "Consult Follow-Up Guide",
    subtitle: "Daily pre-rounding and how to update the consult without repeating the initial note",
    whyItMatters:
      "Pre-rounding and follow-up are the same workflow: you gather what changed overnight, then write a note that shows whether the consult question is improving, worsening, or changing. Missing one piece — urine output, dialysis timing, sodium trend — weakens the whole assessment.",
    teachingPearl: "Each morning, answer one question: what is different today?",
    sections: [
      {
        heading: "First Time Seeing This Patient?",
        items: [
          "If this is your first encounter with the patient, use the \"Initial Consult: Workup\" and \"Initial Consult: Presentation\" guides instead.",
          "Use this guide on day 2 onward, when you are tracking response and writing follow-up notes.",
        ],
      },
      {
        heading: "Pre-Rounding Daily Checklist",
        items: [
          "Overnight events",
          "Vitals and oxygen requirement",
          "Weight (vs. yesterday and vs. admit/dry weight)",
          "I/Os and urine output trend",
          "Creatinine / BUN trend",
          "Electrolytes — Na, K, HCO3, Phos, Mg trends",
          "CBC if relevant",
          "Volume response to fluids, diuretics, or UF",
          "Dialysis performed or not (when, UF, tolerance)",
          "Current IV fluids, diuretics, pressors",
          "New imaging",
          "Microbiology / cultures if relevant",
          "Procedures planned or done",
          "What the primary team is worried about today",
          "Whether the differential changed",
          "Whether the main consult question has been answered",
          "Whether new urgent issues appeared",
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
      "Not checking I/Os or weight trend before rounds",
      "Not knowing whether the patient got dialysis overnight",
      "Not updating whether the consult question remains active",
      "Not documenting response to yesterday's plan",
    ],
    teachingPoints: [
      "Trends matter more than single values.",
      "Overnight interventions change interpretation.",
      "Follow-up notes should be shorter and more trend-focused than initial consults.",
      "The best follow-up notes explain response.",
    ],
  },
};
