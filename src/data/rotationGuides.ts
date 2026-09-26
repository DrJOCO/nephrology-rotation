// Rotation workflow guides: workup, presentation, and daily follow-up.
// Topic-specific clinical prep belongs in inpatient consult guides and weekly study sheets.

export type RotationGuideId =
  | "chartReview"
  | "initialConsultWorkup"
  | "initialConsultPresentation"
  | "writingAssessmentPlan"
  | "consultFollowUp"
  | "imagingPrimer";

export interface RotationGuideTemplate {
  id: RotationGuideId;
  icon: string;
  title: string;
  subtitle: string;
  whyItMatters: string;
  teachingPearl: string;
  // format "example" renders the items as one worked-example block (a note excerpt).
  sections: { heading: string; items: string[]; format?: "example" }[];
  commonMistakes: string[];
  teachingPoints: string[];
}

export const ROTATION_GUIDE_IDS: RotationGuideId[] = [
  "chartReview",
  "initialConsultWorkup",
  "initialConsultPresentation",
  "writingAssessmentPlan",
  "consultFollowUp",
  "imagingPrimer",
];

export const ROTATION_GUIDES: Record<RotationGuideId, RotationGuideTemplate> = {
  chartReview: {
    id: "chartReview",
    icon: "🗂️",
    title: "Chart Review: Finding What Matters",
    subtitle: "A step-by-step order for the chart, where each piece lives, and how to build the creatinine timeline",
    whyItMatters:
      "Much of a nephrology consult is solved in the chart before you meet the patient: the true baseline, what changed, and what the patient was exposed to right before the change. Going through the chart in the same order every time keeps you from missing the one detail that explains everything.",
    teachingPearl:
      "Line up the creatinine against everything that happened to the patient. The cause is usually sitting in the 24–72 hours before the rise.",
    sections: [
      {
        heading: "Step 1 — The Consult Question (1 min)",
        items: [
          "Read the consult order and the primary team's latest note: what exactly are they asking?",
          "If the question is vague (\"AKI\" or \"renal recs\"), call the team and ask what they need: a diagnosis, a dialysis decision, fluid/diuretic help, or medication dosing.",
          "Write the question at the top of your notes — your presentation ends by answering it.",
        ],
      },
      {
        heading: "Step 2 — The Story So Far (5 min)",
        items: [
          "Admission H&P and ED note: why they came in, first vitals, and admission labs.",
          "The primary team's most recent progress note: active problems and current plan.",
          "Other consultants' notes (cardiology, ID, hepatology, surgery) — they often explain the hemodynamics or exposures.",
          "Outpatient notes: primary care and any prior nephrology notes — known CKD, its cause, prior biopsy, prior AKI.",
          "Prior discharge summaries — earlier AKI, dialysis, or a documented baseline creatinine.",
        ],
      },
      {
        heading: "Step 3 — Build the Creatinine Timeline (5–10 min)",
        items: [
          "Open the lab trend (results review/flowsheet) and go back months to years. Check outside records if the patient was seen elsewhere.",
          "Baseline = the most recent stable outpatient value before this illness (ideally within the past year). If there is none, write \"no known baseline\" — don't assume it was normal.",
          "Mark three points: the last baseline value, the day the Cr started to rise, and today (plus the peak if it's improving).",
          "Then list what happened in the 24–72 hours before the rise: hypotension (vitals flowsheet), surgery or procedures, IV contrast, new drugs, vomiting/diarrhea, new or bigger diuretic doses.",
          "Also trend K, HCO3, Na, BUN, phosphorus, Hgb, and platelets (falling platelets + AKI → think TMA).",
        ],
      },
      {
        heading: "Example — A Creatinine Timeline",
        format: "example",
        items: [
          "Baseline: Cr 1.1 (clinic, 4 months ago).",
          "Hospital day 1: Cr 1.2 on admission for pneumonia; vancomycin and piperacillin-tazobactam started.",
          "Day 2: MAP 55–60 for ~8 h on the vitals flowsheet; CT chest with IV contrast.",
          "Day 3: Cr 1.9. Day 4: Cr 2.6; urine output down to 25 mL/h.",
          "What it suggests: hypotension, contrast, and a vancomycin + piperacillin-tazobactam combination all came right before the rise — ischemic/toxic ATN is the lead, and the vancomycin level needs checking.",
        ],
      },
      {
        heading: "Step 4 — Medications: Home List vs MAR (5 min)",
        items: [
          "Home list: ACEi/ARB, diuretics, NSAIDs, metformin, SGLT2 inhibitors, lithium, PPIs, supplements.",
          "MAR (what was actually given, and when): IV contrast, vancomycin (and levels), aminoglycosides, piperacillin-tazobactam, acyclovir, ketorolac, pressors, diuretic doses.",
          "Look for doses given after the Cr rose — those need renal dosing now.",
          "A new drug started 1–3 weeks before a rise, with pyuria or a rash → think AIN.",
        ],
      },
      {
        heading: "Step 5 — Volume and Hemodynamics (3 min)",
        items: [
          "Vitals flowsheet: lowest MAP/SBP, heart rate, pressors, and for how long.",
          "Intake and output (nursing flowsheet): IV fluids, oral intake, urine output per shift, drains, stool or ostomy output.",
          "Daily weights — compare with admission and, for dialysis patients, dry weight.",
          "Oxygen requirement trend (rising oxygen needs can mean volume overload).",
        ],
      },
      {
        heading: "Step 6 — Urine, Imaging, and Micro (3 min)",
        items: [
          "Every UA this admission and prior ones — was there blood or protein before this illness?",
          "Urine studies (urine Na, Cr, urea, osm, UPCR/UACR) — note when they were sent relative to diuretic doses.",
          "Imaging reports: renal ultrasound or CT (kidney size, hydronephrosis, stones), and whether and when contrast was given.",
          "Cultures and the infection workup.",
        ],
      },
      {
        heading: "Step 7 — Summarize Before You See the Patient",
        items: [
          "Consult question → baseline → Cr timeline with events → meds/exposures → volume and hemodynamics → urine and imaging → your working differential.",
          "List what you still need from the patient (NSAIDs, urinary symptoms, intake) and from the exam (volume, rash, bladder, access).",
          "Keep this on paper or in your head — never put patient identifiers into this app.",
          "Aim for about 20–25 minutes in the chart, then go see the patient.",
        ],
      },
    ],
    commonMistakes: [
      "Stopping at the admission labs and missing the true outpatient baseline",
      "Trusting the home medication list instead of the MAR (what was actually given)",
      "Not lining up the Cr rise with hypotension, contrast, or new drugs",
      "Missing the nursing I/O flowsheet — urine output often isn't in the primary team's note",
      "Reading the imaging impression without checking when contrast was given",
      "Spending 45 minutes in the chart before seeing the patient",
    ],
    teachingPoints: [
      "Consult question first, then the creatinine timeline.",
      "The MAR shows what really happened; the home list shows what was supposed to happen.",
      "The cause is usually in the 24–72 hours before the creatinine rose.",
      "Walk into the room with a differential and a list of what you still need.",
    ],
  },
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
          "2. HPI — the full story in time order, with pertinent positives and negatives, ending with the kidney-relevant hospital course (see \"Writing the Full HPI\" below)",
          "3. Pertinent PMH/PSH, home meds (call out nephrotoxins, ACEi/ARB, diuretics), allergies, FHx of kidney disease, social/NSAID history",
          "4. Physical exam — always include the nephrology-relevant items: BP and orthostatics if relevant, JVD, lungs (rales, effusions), heart (S3, rubs), abdomen, edema (pretibial, sacral, anasarca), mucous membranes / skin turgor for volume status, Foley (present? urine in bag and how much?), and dialysis access (thrill + bruit for AVF/AVG, site appearance for tunneled or PD catheters)",
          "5. Objective data — current creatinine and trend, baseline Cr, urine output, electrolytes, acid-base, UA with sediment, urine studies (FENa/FEUrea, urine Na, UPCR/UACR), imaging",
          "6. Assessment — name the problem, give the trajectory, give the leading mechanism and differential buckets",
          "7. Urgent issues (electrolyte emergencies, volume crisis, AEIOU dialysis indications)",
          "8. Plan — what needs to happen today, monitoring, and whether dialysis is on the table",
        ],
      },
      {
        heading: "Writing the Full HPI (New Consults)",
        items: [
          "New consults get a full HPI. Follow-ups do not — they get a SOAP update (see \"Consult Follow-Up Guide\").",
          "Open with the one-liner and the consult question.",
          "Tell the story in time order: when the patient was last at their baseline, what changed, and what happened before admission.",
          "Include the kidney-relevant history you got from the patient: urine output and color, intake and losses, NSAIDs and new medicines, contrast, urinary symptoms, rash/joint/sinus symptoms, edema, dyspnea.",
          "Add pertinent positives AND pertinent negatives. The negatives show what you already ruled out (\"no NSAID use, no trouble urinating, no rash\").",
          "Finish with the hospital course that matters to the kidneys: fluids, pressors, diuretics, drugs held or started, contrast, and the creatinine trend.",
          "The written HPI is complete. The spoken version is the same story in 1–2 minutes — say the pertinent negatives briefly.",
        ],
      },
      {
        heading: "Worked Example — New Consult HPI (AKI)",
        format: "example",
        items: [
          "One-liner: 68-year-old man with diabetes, hypertension, and CKD G3a (baseline Cr 1.3 three months ago), admitted 2 days ago with E. coli urosepsis, consulted for rising creatinine.",
          "HPI: He was in his usual health until 4 days before admission, when he developed fever, dysuria, and right flank pain, then 2 days of vomiting with little to eat or drink. He took ibuprofen 600 mg three times a day for 3 days for the pain. In the ED he was 39.2°C with BP 82/50; he received 3 L of lactated Ringer's and needed norepinephrine for about 6 hours. A CT abdomen with IV contrast showed right pyelonephritis without obstruction or abscess. His home lisinopril and metformin were held. Cr was 1.9 on admission, 2.6 yesterday, and 3.1 today; urine output is about 40 mL/h.",
          "Pertinent negatives: no trouble urinating before this illness, no blood or foam in the urine, no rash, joint pain, sinus symptoms, or hemoptysis, no new medicines other than ceftriaxone, and no leg swelling or orthopnea. He has never seen a nephrologist.",
        ],
      },
      {
        heading: "Pertinent Positives & Negatives by Consult Type",
        items: [
          "AKI: urine output, intake/losses, NSAIDs, contrast, new drugs, hypotension, urinary retention symptoms, rash/fever (AIN), hematuria/foamy urine, hemoptysis/sinus/rash (GN).",
          "Hyponatremia: symptom severity (headache, confusion, falls, seizure), fluid and alcohol intake, diet, thiazides/SSRIs, vomiting/diarrhea, edema, cancer risk.",
          "Hyperkalemia: weakness, palpitations, ACEi/ARB/MRA/trimethoprim, salt substitutes, diet, missed dialysis, urine output.",
          "Volume overload: weight gain, orthopnea, diuretic adherence and dose, salt/fluid intake, NSAIDs.",
          "GN: hematuria timing vs infection, foamy urine, edema, hemoptysis, sinus disease, rash, joint pain, neuropathy, hepatitis/HIV, family history.",
          "ESRD: dialysis unit, schedule, last full session, missed sessions, dry weight, access problems, residual urine.",
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

  writingAssessmentPlan: {
    id: "writingAssessmentPlan",
    icon: "✍️",
    title: "Writing the Assessment & Plan",
    subtitle: "How to put it all together: a one-line summary, reasoning for each problem, and specific recommendations",
    whyItMatters:
      "The assessment and plan is the part of your note the team actually reads. A good one tells them what you think is going on, why, how serious it is, and exactly what to do next — in a few lines they can act on.",
    teachingPearl:
      "Every assessment answers four questions: What is it? Why do you think so? How bad is it? What should we do today?",
    sections: [
      {
        heading: "Step 1 — Start With a One-Line Summary",
        items: [
          "Age + key background + the problem in medical terms + the time course.",
          "\"68-year-old man with CKD G3a (baseline Cr 1.3) and diabetes, admitted with urosepsis, now with non-oliguric AKI (Cr 3.1) after 6 hours of septic shock.\"",
          "Use summarizing words (acute vs chronic, oliguric, hypotonic, euvolemic, nephritic) instead of listing raw numbers.",
          "Include only the background that changes your thinking: CKD, diabetes, heart failure, cirrhosis, transplant.",
        ],
      },
      {
        heading: "Step 2 — Name Each Problem and Rank Them",
        items: [
          "One problem per heading, most urgent first — e.g., 1) Hyperkalemia with ECG changes, 2) AKI, 3) Metabolic acidosis.",
          "Use a diagnosis when you have one (\"ischemic ATN\"); use a syndrome when you don't (\"AKI with active urine sediment\").",
          "Group linked problems when one explains the others (acidosis and hyperkalemia can sit under AKI).",
          "Include the chronic kidney issues the team must keep running: dialysis schedule, anemia, transplant immunosuppression.",
        ],
      },
      {
        heading: "Step 3 — For Each Problem, Show Your Reasoning",
        items: [
          "The leading cause plus the 2–3 facts that support it (timeline, urine findings, exam, imaging).",
          "The main alternatives and why each is less likely — this is what shows clinical reasoning.",
          "Severity and trajectory: KDIGO stage, rising/plateau/improving, oliguric or not.",
          "Urgency: is there an emergency or a dialysis indication right now? Say yes or no.",
        ],
      },
      {
        heading: "Step 4 — Write Recommendations Someone Can Act On",
        items: [
          "Numbered, one action per line.",
          "Specific: drug, dose, route, frequency — \"furosemide 80 mg IV twice daily\", not \"diurese\".",
          "Name what to stop or avoid: \"Hold lisinopril and ibuprofen; no IV contrast.\"",
          "Monitoring with timing: \"BMP every 12 h, strict I/O, daily weight.\"",
          "If/then contingencies: \"If K >6 despite the binder, or urine output <0.3 mL/kg/h for 12 h, call us to discuss dialysis.\"",
          "Say who does what: \"We will follow daily\"; \"IR to place a tunneled catheter.\"",
          "As the consultant, write \"recommend\" — the primary team writes the orders.",
        ],
      },
      {
        heading: "Weak vs Strong — The Assessment",
        format: "example",
        items: [
          "Weak: AKI. Likely prerenal vs ATN. Will monitor.",
          "Strong: AKI, KDIGO stage 2 (Cr 1.3 → 3.1 over 48 h), non-oliguric, most consistent with ischemic ATN after 6 h of septic shock — muddy brown casts, FEUrea 48%, no improvement after 3 L of fluid. Obstruction unlikely (no hydronephrosis on ultrasound); AIN less likely (no rash or pyuria, no new culprit drug). No emergent dialysis indication: K 4.9, HCO3 19, not volume overloaded.",
        ],
      },
      {
        heading: "Weak vs Strong — The Plan",
        format: "example",
        items: [
          "Weak: Avoid nephrotoxins. Renally dose meds. Monitor labs. Consider dialysis if needed.",
          "Strong: 1. Stop maintenance IV fluids — euvolemic now. 2. Hold lisinopril and metformin; no NSAIDs or contrast. 3. Switch vancomycin to level-based dosing; pharmacy to renally dose cefepime. 4. BMP every 12 h, strict I/O, daily weight. 5. Dialysis not indicated now; call us if K >6 despite treatment, pH <7.15, rising oxygen needs, or confusion.",
        ],
      },
      {
        heading: "Final Check Before You Sign",
        items: [
          "Does the first line state the consult question and your answer?",
          "Could the overnight intern follow the plan at 2 a.m. without calling you?",
          "Did you include doses, timing, monitoring, and when to call?",
          "Is every recommendation tied to a problem?",
          "Did you cut data that doesn't support a decision? (The chart already has it.)",
          "Did you say whether dialysis is indicated — yes or no?",
          "For a full example by topic, open any Inpatient Consult Guide → \"Sample Written Assessment & Plan\". To practice, use \"Write It, Then Compare\".",
        ],
      },
    ],
    commonMistakes: [
      "Restating data without interpretation (\"Cr 2.6, K 5.1, HCO3 19\")",
      "Listing a differential without saying which is most likely and why",
      "Vague plans: \"monitor\", \"consider\", \"as needed\", \"renally dose meds\"",
      "Forgetting what to stop — nephrotoxins, potassium supplements, contrast",
      "No contingency plan for overnight",
      "Copying forward yesterday's A&P without updating it",
    ],
    teachingPoints: [
      "Problem → reasoning → severity → specific actions.",
      "Say what is most likely, what you ruled out, and why.",
      "Write for the person reading it at 2 a.m.",
      "Short is good; vague is not.",
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
        heading: "SOAP Follow-Up Format (Written and Spoken)",
        items: [
          "S — Subjective: overnight events and what the patient tells you today (dyspnea, nausea, appetite, cramps, urine output, confusion). One to three lines.",
          "O — Objective: vitals (BP range, oxygen), weight vs yesterday and admission/dry weight, I/O and urine output, focused exam (volume, access), labs as trends (Cr today vs yesterday vs baseline), new urine studies or imaging, and dialysis done (when, UF, tolerance).",
          "A — Assessment: one line per problem — better, worse, or the same, and why. Update the cause if new data changed it.",
          "P — Plan: numbered, specific changes for today, what continues, monitoring, and if/then contingencies. Say when nephrology expects to sign off.",
          "Don't rewrite the admission story. The follow-up is about what changed and what you'll do about it.",
        ],
      },
      {
        heading: "Worked Example — Written SOAP Note (AKI, Day 3)",
        format: "example",
        items: [
          "S: No events overnight. Less nauseated and ate breakfast. No dyspnea.",
          "O: T 37.1, BP 128/74, HR 84, room air. Weight 81.2 kg (81.6 yesterday; 80.0 on admission). I/O last 24 h: 1.8 L in, 2.4 L out; urine output ~100 mL/h overnight. Exam: JVP not elevated, lungs clear, trace ankle edema. Cr 2.8 (3.1 yesterday; baseline 1.3), K 4.6, HCO3 21, BUN 58. Vancomycin level 14.",
          "A: #1 AKI from ischemic ATN after septic shock — improving: first decrease in Cr and urine output recovering. No dialysis indication.",
          "P: 1. Watch for a post-ATN diuresis; replace fluid only if he becomes volume depleted — encourage oral intake. 2. Keep holding lisinopril and metformin until Cr is near baseline. 3. Continue level-based vancomycin dosing and re-dose other drugs as Cr improves. 4. BMP daily, strict I/O, daily weight. 5. We will follow; expect to sign off once Cr is steadily improving and clinic follow-up is set.",
        ],
      },
      {
        heading: "Worked Example — Spoken SOAP Follow-Up (60 Seconds)",
        format: "example",
        items: [
          "Opening: \"This is our AKI consult, hospital day 4.\"",
          "S: \"No events overnight; he feels better and is eating.\"",
          "O: \"Vitals are stable on room air. Weight is down 0.4 kg, net negative 600 mL, urine output about 100 mL an hour, and he looks euvolemic. Creatinine is 2.8 from 3.1 — the first decrease — with potassium 4.6 and bicarb 21.\"",
          "A: \"The ATN is in early recovery, and there's no dialysis indication.\"",
          "P: \"Keep holding lisinopril and metformin, daily labs, and we'll watch for a post-ATN diuresis.\"",
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
      "Skipping the S — new dyspnea, nausea, or cramps often change the plan",
    ],
    teachingPoints: [
      "Trends matter more than single values.",
      "Overnight interventions change interpretation.",
      "Follow-up notes should be shorter and more trend-focused than initial consults.",
      "The best follow-up notes explain response.",
    ],
  },

  imagingPrimer: {
    id: "imagingPrimer",
    icon: "🩻",
    title: "Kidney Imaging: What to Order and How to Read It",
    subtitle: "Renal ultrasound report basics, when CT or MRI is better, and contrast safety",
    whyItMatters:
      "You will order or read imaging on almost every consult. You don't need to read the images yourself as a student, but you do need to know which test answers which question and what the words in the report mean.",
    teachingPearl:
      "Renal ultrasound answers three questions quickly and safely: Is there obstruction? Are the kidneys chronically damaged? Are there two kidneys (before a biopsy)?",
    sections: [
      {
        heading: "Which Test Answers Which Question",
        items: [
          "Unexplained AKI or possible obstruction → renal and bladder ultrasound (bladder scan at the bedside for retention).",
          "Suspected kidney stone → non-contrast CT abdomen/pelvis (low-dose stone protocol); ultrasound first in pregnancy and reasonable first in young patients.",
          "Kidney mass or complex cyst → CT or MRI with contrast (renal mass protocol).",
          "Renal artery stenosis → duplex Doppler ultrasound first; CT or MR angiography to confirm.",
          "Renal artery or vein thrombosis → Doppler ultrasound or CT angiography.",
          "Pyelonephritis not improving after 48–72 h → CT with contrast to look for abscess or obstruction.",
          "Before a kidney biopsy → ultrasound for size, number of kidneys, and cysts or masses.",
          "Polycystic kidney disease → ultrasound for diagnosis; MRI for total kidney volume (Mayo class).",
          "Kidney transplant → \"transplant kidney ultrasound with Doppler\" (the kidney sits in the pelvis).",
        ],
      },
      {
        heading: "Reading the Renal Ultrasound Report",
        items: [
          "Kidney length: normal adult ~10–12 cm. Small (<9–10 cm) suggests chronic disease. CKD with normal or large kidneys: diabetes, HIV nephropathy, amyloidosis, polycystic kidney disease.",
          "A size difference >1.5 cm between kidneys → think renovascular disease or a scarred kidney.",
          "Increased cortical echogenicity (brighter than the liver) → medical kidney disease, acute or chronic — it's nonspecific.",
          "Cortical thinning or loss of corticomedullary differentiation → chronic damage; less reversibility and lower biopsy yield.",
          "Hydronephrosis (mild/moderate/severe) → obstruction until proven otherwise. Bilateral hydronephrosis with a full bladder → bladder outlet obstruction (place a Foley).",
          "Unilateral obstruction raises Cr only if the other kidney is absent or already damaged.",
          "Simple cysts are common and benign; \"complex\" cysts need follow-up imaging (Bosniak classification).",
          "Post-void residual or bladder volume: a large residual means retention.",
          "Resistive index (Doppler) is nonspecific — don't over-read it.",
        ],
      },
      {
        heading: "Pitfalls",
        items: [
          "No hydronephrosis doesn't fully exclude obstruction: very early obstruction, severe volume depletion, or retroperitoneal fibrosis or tumor encasement.",
          "Hydronephrosis doesn't always mean obstruction: pregnancy, prior obstruction, reflux, or a very full bladder.",
          "Normal kidney size doesn't rule out CKD.",
        ],
      },
      {
        heading: "Iodinated Contrast (CT, Angiography)",
        items: [
          "Ask first: will the result change management, and can a non-contrast study answer the question?",
          "ACR/NKF 2020: risk from IV contrast is low with eGFR ≥30. Consider IV isotonic fluids for eGFR <30 (not on dialysis) or AKI.",
          "Don't withhold contrast for an important diagnosis (PE, stroke, sepsis source) because of kidney function alone.",
          "No N-acetylcysteine or sodium bicarbonate — PRESERVE showed no benefit.",
          "Hold metformin with AKI or eGFR <30 at the time of contrast; restart after 48 h if kidney function is stable.",
          "Dialysis patients: no extra dialysis session is needed after contrast.",
        ],
      },
      {
        heading: "Gadolinium (MRI)",
        items: [
          "Nephrogenic systemic fibrosis risk is very low with group II agents (e.g., gadobutrol, gadoterate).",
          "With eGFR <30, AKI, or dialysis, use a group II agent at the lowest dose that answers the question; don't withhold an essential study.",
          "Dialysis patients: time the MRI shortly before a scheduled dialysis session when practical; don't start dialysis just to clear gadolinium.",
        ],
      },
      {
        heading: "How to Present Imaging",
        items: [
          "Give the answer, not the whole report: \"Renal ultrasound: 11 cm kidneys, normal echogenicity, no hydronephrosis.\"",
          "Say what it rules in or out: \"...so obstruction is unlikely and there's no sign of chronic damage.\"",
          "Mention contrast exposure and timing: \"CT with IV contrast on hospital day 2, about 36 hours before the Cr rise.\"",
        ],
      },
    ],
    commonMistakes: [
      "Ordering a contrast CT when a renal ultrasound answers the question",
      "Calling \"increased echogenicity\" chronic disease — it is nonspecific",
      "Forgetting a bladder scan in a patient with little or no urine output",
      "Missing a contrast exposure because it happened in the ED or another hospital",
      "Withholding needed contrast imaging because of the creatinine alone",
    ],
    teachingPoints: [
      "Ultrasound: obstruction, chronic damage, and two kidneys.",
      "Stones: non-contrast CT (ultrasound in pregnancy).",
      "Contrast decisions weigh the diagnostic benefit against a small, often overstated risk.",
      "Present the conclusion of the study, not the whole report.",
    ],
  },
};
