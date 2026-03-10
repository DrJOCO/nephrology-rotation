// Friday Outpatient Nephrology Clinic Guide — pre-authored teaching content
//
// Rotation cycle: CKD → Transplant → Hypertension (3-week repeating)
// Content is guideline-based, educational, and not patient-specific.
// Guideline sources are listed in each guide's guidelineBasis field.

export const CLINIC_GUIDE_TOPICS = ["CKD", "Transplant", "Hypertension"] as const;
export type ClinicGuideTopic = (typeof CLINIC_GUIDE_TOPICS)[number];

export interface ClinicGuideTemplate {
  topic: ClinicGuideTopic;
  icon: string;
  title: string;
  subtitle: string;
  whyItMatters: string;
  teachingPearl: string;
  suggestedApproach: string[];
  sections: { heading: string; items: string[] }[];
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
    subtitle: "Advanced CKD, uremia recognition, and dialysis preparation",

    whyItMatters:
      "CKD stages 4–5 represent a critical window for patient education, symptom management, and preparation for kidney replacement therapy. Outpatient nephrology visits are the opportunity to identify progression, manage complications, and plan ahead — reducing crash starts and improving outcomes.",

    teachingPearl:
      "Dialysis is not triggered by eGFR alone. The decision to initiate dialysis is driven by symptoms of uremia, refractory complications, and nutritional decline — not a single lab number. Preparing patients early through modality education, access planning, transplant referral, and vein preservation is far more impactful than waiting for an eGFR threshold.",

    suggestedApproach: [
      "Review the eGFR trend over time, not just today's value — is it stable or declining?",
      "Ask about uremic symptoms systematically (see symptom checklist below)",
      "Review current medications for renal dosing and CKD-specific therapies",
      "Assess volume status: weight trend, edema, orthopnea, dyspnea",
      "Check whether dialysis preparation milestones have been addressed",
      "Discuss goals of care and preferences for kidney replacement therapy early",
    ],

    sections: [
      {
        heading: "Key History Questions",
        items: [
          "How is your energy level? Any new or worsening fatigue?",
          "How is your appetite? Any nausea, vomiting, or unintentional weight loss?",
          "Any itching (pruritus), especially at night?",
          "Any trouble sleeping or restless legs?",
          "Any difficulty concentrating, confusion, or mental fog?",
          "Any muscle cramps, twitching, or weakness?",
          "Any swelling in your legs, feet, or around your eyes?",
          "Any shortness of breath, especially when lying flat (orthopnea)?",
          "Any changes in urination — less volume, foamy urine, or new nocturia?",
          "Have you been following up with a dietitian? Any recent dietary changes?",
          "Have you discussed dialysis options or transplant referral with your nephrologist?",
          "Any recent IV sticks, PICCs, or blood draws from the non-dominant arm? (vein preservation)",
        ],
      },
      {
        heading: "CKD 4–5 Symptom Review (Screen for Uremia)",
        items: [
          "Fatigue and malaise — often the earliest symptom, may be multifactorial",
          "Anorexia, nausea, vomiting — consider uremic gastropathy",
          "Pruritus — may reflect phosphorus/calcium imbalance or uremic toxins",
          "Sleep disturbance — insomnia, restless legs, sleep apnea",
          "Confusion, poor concentration — consider uremic encephalopathy if severe",
          "Muscle cramps — may relate to electrolyte abnormalities or volume shifts",
          "Peripheral edema — assess volume status and diuretic response",
          "Dyspnea and orthopnea — volume overload, anemia, or both",
          "Urinary changes — decreasing urine output, foamy urine",
          "Weakness and deconditioning — nutritional decline and sarcopenia",
        ],
      },
      {
        heading: "Urgent/Red-Flag Concepts",
        items: [
          "Refractory hyperkalemia — persistent K+ elevation despite dietary counseling, dose adjustment, and/or potassium binders",
          "Refractory metabolic acidosis — bicarbonate persistently low despite oral alkali therapy",
          "Uncontrolled volume overload — diuretic resistance, worsening edema, pulmonary congestion",
          "Uremic symptoms/signs — encephalopathy, asterixis, pericardial rub, serositis",
          "Nutritional decline — involuntary weight loss, worsening albumin, failure to thrive",
          "Pericarditis or serositis — consider urgent dialysis indication; discuss with attending",
        ],
      },
      {
        heading: "Important Exam Findings",
        items: [
          "Blood pressure — trend and current reading; assess for volume-dependent hypertension",
          "Volume status — JVD, peripheral edema, pulmonary crackles, weight trend",
          "Skin — pallor (anemia), excoriations (pruritus), uremic frost (rare, late finding)",
          "Neurologic — asterixis, mental status changes, peripheral neuropathy",
          "Vascular access assessment — if AVF/AVG present, check thrill and bruit",
          "Assess both arms for vein preservation — note any prior PICC or central line sites",
        ],
      },
      {
        heading: "Labs and Data to Review",
        items: [
          "Creatinine and eGFR trend (use CKD-EPI 2021 race-free equation)",
          "BUN — consider in context of dietary protein intake and volume status",
          "Potassium — watch trend; consider dietary intake, medications (ACEi/ARB, MRA), and GFR",
          "Bicarbonate (CO2) — target generally ≥22 mEq/L per KDIGO; consider oral alkali if low",
          "Sodium — hyponatremia may suggest volume overload or medication effect",
          "Calcium and phosphorus — assess for CKD-MBD; review phosphate binder use",
          "Albumin — nutritional marker; decline may signal need for dietary intervention or dialysis planning",
          "CBC and hemoglobin — assess for anemia of CKD; review iron studies and ESA use when relevant",
          "Iron studies (ferritin, TSAT) — when evaluating or treating anemia of CKD",
          "PTH and vitamin D — when assessing CKD-MBD; frequency depends on CKD stage",
          "Urine protein/albumin trend (UACR or UPCR) — assess progression",
          "BP trend — review home BP log if available",
          "Weight trend — watch for fluid retention or nutritional decline",
        ],
      },
      {
        heading: "Dialysis Preparation and Planning",
        items: [
          "Modality education — discuss hemodialysis (in-center and home HD), peritoneal dialysis, and conservative management; involve patient and family",
          "Transplant referral — consider early referral for transplant evaluation (preemptive transplant is preferred when feasible)",
          "Access planning — refer for AVF creation well in advance (consider at eGFR 15–20 or when trajectory suggests need within 6–12 months; center-dependent)",
          "Vein preservation — avoid blood draws and IVs in the non-dominant arm; no PICCs if possible",
          "Avoid crash starts — unplanned dialysis initiation via temporary catheter is associated with worse outcomes",
          "Advance care planning — discuss goals of care, especially for patients who may choose conservative management",
          "Review immunizations — hepatitis B series if not immune; keep vaccinations up to date",
        ],
      },
      {
        heading: "Assessment and Plan Framework",
        items: [
          "CKD stage and trajectory — state the current stage, eGFR trend, and rate of decline",
          "Blood pressure control — current regimen, home BP trends, target per guidelines",
          "Volume status — euvolemic vs overloaded; diuretic adjustments if needed",
          "Electrolytes — potassium management, bicarbonate supplementation if indicated",
          "CKD-MBD — calcium, phosphorus, PTH; consider phosphate binders and vitamin D",
          "Anemia — hemoglobin trend, iron status, ESA use when appropriate",
          "Proteinuria management — ACEi/ARB optimization, SGLT2 inhibitor when indicated (per KDIGO)",
          "Dialysis readiness — modality selection status, access planning, transplant referral status",
          "Medications — review for renal dosing, nephrotoxin avoidance, and pill burden",
          "Follow-up — interval based on CKD stage and stability (closer follow-up for CKD 4–5)",
        ],
      },
      {
        heading: "Medication Categories (Educational, Not Prescriptive)",
        items: [
          "Potassium binders — for chronic/non-emergent hyperkalemia (e.g., sodium zirconium cyclosilicate, patiromer); discuss indications and limitations",
          "Oral alkali therapy — for metabolic acidosis with bicarb <22 mEq/L; options include sodium bicarbonate tablets, Bicitra (sodium citrate solution), or baking soda when appropriate; titrate to target",
          "Diuretics — loop diuretics for volume management in advanced CKD; thiazides less effective at low GFR (consider combination when needed)",
          "Phosphate binders — calcium-based vs non-calcium-based; take with meals; discuss adherence challenges",
          "Anemia-related therapies — IV iron and ESAs when indicated per KDIGO guidelines; review target hemoglobin range",
          "SGLT2 inhibitors — consider for CKD with proteinuria per KDIGO (dapagliflozin, empagliflozin); review eGFR thresholds for initiation vs continuation",
          "ACEi/ARB — cornerstone for proteinuric CKD; monitor potassium and creatinine after initiation or dose change",
        ],
      },
    ],

    teachingPoints: [
      "eGFR is a trend, not a trigger — dialysis initiation is a clinical decision based on symptoms, complications, and nutritional status, not a single lab threshold.",
      "Vein preservation saves lives — every unnecessary IV or PICC in the non-dominant arm is a potential lost dialysis access site.",
      "Metabolic acidosis in CKD accelerates progression — oral alkali therapy is simple, inexpensive, and often underutilized.",
      "Preemptive transplant is the best 'dialysis modality' — early referral for transplant evaluation should be discussed with all eligible patients.",
      "Crash starts are preventable — structured outpatient preparation (modality education, access creation, transplant referral) reduces unplanned dialysis initiation and associated morbidity.",
    ],

    discussionQuestions: [
      "A patient with CKD stage 4 (eGFR 18, stable) has no uremic symptoms but is losing weight and has declining albumin. How would you approach dialysis planning for this patient?",
      "A patient is referred with CKD stage 5 (eGFR 10) and has a PICC line in the left arm from a recent hospitalization. What concerns does this raise, and how would you counsel the patient going forward?",
    ],

    guidelineBasis: [
      "KDIGO 2024 Clinical Practice Guideline for CKD Evaluation and Management",
      "KDOQI Commentary on KDIGO CKD Guidelines (NKF)",
      "KDIGO 2017 CKD-MBD Guideline Update",
      "KDIGO 2012 Anemia in CKD Guideline",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  TRANSPLANT CLINIC GUIDE
  // ═══════════════════════════════════════════════════════════════════
  Transplant: {
    topic: "Transplant",
    icon: "💊",
    title: "Kidney Transplant Clinic Essentials",
    subtitle: "Immunosuppression management, monitoring, and post-transplant care",

    whyItMatters:
      "Kidney transplant recipients require lifelong immunosuppression monitoring and vigilant screening for rejection, infection, and malignancy. The outpatient transplant clinic visit is where medication titration, adherence counseling, and surveillance converge — and where early recognition of problems prevents graft loss.",

    teachingPearl:
      "Immunosuppression is a balancing act — too much increases infection and malignancy risk, too little risks rejection. CNI trough levels are one piece of the puzzle, but clinical context (time from transplant, rejection history, infection history, renal function trend) determines the target. Always review transplant center protocol for exact CNI goals.",

    suggestedApproach: [
      "Review time from transplant and current immunosuppression regimen",
      "Check the most recent CNI trough level — was it drawn correctly (trough, before morning dose)?",
      "Review creatinine/eGFR trend — is graft function stable, improving, or declining?",
      "Ask about adherence, missed doses, and timing of medications",
      "Screen for infection symptoms, GI symptoms, and neurologic side effects",
      "Review BK and CMV surveillance status based on transplant center protocol",
      "Inspect skin for new or changing lesions — immunosuppressed patients have elevated skin cancer risk",
    ],

    sections: [
      {
        heading: "Key History Questions — Transplant Visit",
        items: [
          "When did you receive your transplant? Living or deceased donor?",
          "Any history of rejection episodes? If so, when and what type (cellular vs antibody-mediated)?",
          "Any missed doses of immunosuppression in the past week? How many?",
          "What time did you take your last tacrolimus/cyclosporine dose? (verify trough timing)",
          "Was your trough level drawn correctly — before your morning dose, at the right time?",
          "Any fever, chills, or symptoms suggesting infection?",
          "Any urinary symptoms — pain, frequency, urgency, decreased output, hematuria?",
          "Any graft site pain or tenderness?",
          "Any new medications, supplements, or herbal products started? (drug interaction risk)",
          "Any GI symptoms — nausea, diarrhea, abdominal pain? (consider mycophenolate side effects)",
          "Any tremor, headache, or neurologic symptoms? (consider CNI neurotoxicity)",
          "Any new or changing skin lesions? Any nonhealing wounds?",
          "Are you up to date on dermatology follow-up and sun protection?",
        ],
      },
      {
        heading: "Common Maintenance Immunosuppression Regimens",
        items: [
          "Standard triple therapy: tacrolimus + mycophenolate (MMF or MPA) + low-dose prednisone — most common maintenance regimen",
          "Steroid-sparing: tacrolimus + mycophenolate without prednisone — some centers use this for selected low-risk patients",
          "Cyclosporine-based: cyclosporine + mycophenolate ± prednisone — less common now but still used",
          "Belatacept-based: belatacept (IV monthly) + mycophenolate ± prednisone — for patients who cannot tolerate CNIs",
          "mTOR inhibitor-based: sirolimus or everolimus + mycophenolate or reduced-dose CNI — used in specific situations (CNI toxicity, certain malignancies)",
          "Regimen choice depends on transplant center protocol, donor/recipient factors, and individual risk profile",
        ],
      },
      {
        heading: "Immunosuppression Titration Logic (Conceptual)",
        items: [
          "Time from transplant — higher levels early (first 3–6 months), lower later if stable",
          "Rejection risk — history of rejection, high PRA, donor-specific antibodies increase target levels",
          "Infection risk — active or recent infection may warrant temporary reduction; discuss with transplant team",
          "Kidney function — declining eGFR may reflect rejection, CNI toxicity, or other causes; do not adjust alone",
          "Drug levels — CNI trough is one input; clinical context determines the target range",
          "Adverse effects — dose-limiting side effects may require switching agents or reducing doses",
          "Donor/recipient factors — HLA mismatch, deceased vs living donor, sensitization history",
          "Center protocol — always review transplant center-specific guidelines for target ranges and adjustments",
        ],
      },
      {
        heading: "Common Side Effects by Drug Class",
        items: [
          "CNI (tacrolimus, cyclosporine): nephrotoxicity, tremor, neurotoxicity, hypertension, hyperkalemia, hypomagnesemia, new-onset diabetes after transplant (NODAT)",
          "Mycophenolate (MMF/MPA): GI upset, diarrhea, leukopenia, increased infection risk — dose reduction often helps GI symptoms",
          "Corticosteroids: hyperglycemia, weight gain, mood effects, osteoporosis, cushingoid features, increased infection risk",
          "mTOR inhibitors (sirolimus, everolimus): mouth ulcers (aphthous), peripheral edema, dyslipidemia, delayed wound healing, proteinuria",
          "Belatacept: infusion reactions (rare), higher risk of PTLD especially in EBV-seronegative recipients",
        ],
      },
      {
        heading: "What to Monitor at Each Transplant Visit",
        items: [
          "Creatinine and eGFR trend — the most important graft function marker; look at the trajectory",
          "Proteinuria — new or worsening proteinuria may indicate rejection, recurrent disease, or CNI toxicity",
          "Blood pressure — target per guidelines; hypertension is very common post-transplant",
          "Edema — may reflect graft dysfunction, medication effect, or other causes",
          "Adherence — ask directly about missed doses and timing; non-adherence is a leading cause of late graft loss",
          "Trough timing — verify that CNI levels were drawn correctly (pre-dose, at trough)",
          "Drug interactions — check for new medications that interact with CNIs (azole antifungals, macrolides, grapefruit, etc.)",
          "Infection symptoms — fever, cough, dysuria, diarrhea, skin lesions",
          "GI symptoms — diarrhea is common and may reflect mycophenolate toxicity, infection, or other causes",
          "Tremor and neurologic symptoms — common with tacrolimus; dose-related",
        ],
      },
      {
        heading: "CNI Trough Goals (Educational Examples)",
        items: [
          "Tacrolimus trough targets vary by time from transplant, rejection history, and center protocol",
          "General educational ranges (NOT universal targets): early post-transplant (0–3 months) ~8–12 ng/mL; maintenance (>6 months) ~5–8 ng/mL — exact targets are center-specific",
          "Review transplant center protocol for exact CNI goals — do not use these ranges for clinical decision-making without center guidance",
          "Goals are generally higher early after transplant and lower later if graft function is stable and no rejection",
          "Cyclosporine trough ranges differ from tacrolimus — consult center protocol",
        ],
      },
      {
        heading: "BK Virus and CMV Monitoring",
        items: [
          "BK virus — monitor BK viremia per transplant center protocol (typically in the first 1–2 years post-transplant)",
          "Persistent BK viremia may require immunosuppression reduction — discuss with transplant team",
          "Review BK viral load trend if available; rising titers warrant closer monitoring",
          "CMV — monitor CMV viremia per center protocol, especially in high-risk donor/recipient combinations (D+/R−)",
          "CMV prophylaxis duration and monitoring intervals are center-dependent",
          "Management of BK and CMV often depends on transplant center protocol and transplant team input — present findings and discuss",
        ],
      },
      {
        heading: "Skin Surveillance and Cancer Screening",
        items: [
          "Transplant recipients have significantly elevated skin cancer risk, especially squamous cell carcinoma",
          "Risk is highest with long-term CNI-based immunosuppression",
          "Ask about new or changing skin lesions at every visit",
          "Ask about nonhealing lesions — these may represent malignancy",
          "Ensure regular dermatology follow-up (at least annually, more frequently if history of skin cancer)",
          "Counsel on daily sunscreen use, sun-protective clothing, and avoidance of excessive sun exposure",
          "Consider mTOR inhibitor switch in patients with recurrent skin cancers — discuss with transplant team",
        ],
      },
      {
        heading: "Assessment and Plan Framework — Transplant",
        items: [
          "Graft function — current creatinine/eGFR, trend, and proteinuria status",
          "Immunosuppression — current regimen, CNI trough level, adherence, dose adjustments",
          "Rejection screening — any concerning trends in creatinine, proteinuria, or DSA levels",
          "Infection surveillance — BK, CMV status; any active infection concerns",
          "Medication side effects — GI, neurologic, metabolic (glucose, lipids)",
          "Blood pressure — current control and medication adjustments",
          "Skin — any new/changing lesions; dermatology referral status",
          "Preventive care — vaccinations, cancer screening, bone health",
          "Follow-up interval — based on time from transplant and clinical stability",
        ],
      },
    ],

    teachingPoints: [
      "Adherence is the single most important modifiable factor in long-term graft survival — ask about it at every visit without judgment.",
      "CNI trough goals are not universal constants — they depend on time from transplant, rejection history, and center protocol. Always verify the specific targets.",
      "Tacrolimus has a narrow therapeutic index — small changes in dose, timing, or interacting medications can cause significant level fluctuations.",
      "Post-transplant skin cancer screening is not optional — squamous cell carcinoma risk is 65–250× higher than the general population on chronic immunosuppression.",
      "BK nephropathy is managed primarily by immunosuppression reduction, not antiviral therapy — early detection through surveillance viremia monitoring is key.",
    ],

    discussionQuestions: [
      "A patient 8 months post-transplant has a rising creatinine (1.4 → 1.8 over 2 months) with a tacrolimus trough of 11 ng/mL. What is your differential diagnosis, and how would you approach this?",
      "A transplant recipient reports persistent diarrhea for 3 weeks. Their mycophenolate dose is at the standard level. How would you evaluate and manage this — and when would you consider a dose change vs further workup?",
    ],

    guidelineBasis: [
      "KDIGO 2009 Clinical Practice Guideline for the Care of Kidney Transplant Recipients",
      "AST Infectious Diseases Guidelines for Kidney Transplant Recipients",
      "KDIGO 2024 CKD Guideline (post-transplant CKD management)",
      "ACS/AST Skin Cancer Prevention Guidelines for Organ Transplant Recipients",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  HYPERTENSION CLINIC GUIDE
  // ═══════════════════════════════════════════════════════════════════
  Hypertension: {
    topic: "Hypertension",
    icon: "🩺",
    title: "Outpatient Hypertension Clinic Essentials",
    subtitle: "Home BP monitoring, medication management, and secondary causes",

    whyItMatters:
      "Hypertension is the most common reason for nephrology referral and a major driver of CKD progression, cardiovascular disease, and end-organ damage. Accurate BP measurement, systematic medication titration, and recognition of secondary causes are core nephrology competencies in the outpatient setting.",

    teachingPearl:
      "Before adding or changing antihypertensives, always confirm the BP pattern with home readings. Office BP is often higher (white coat effect) or sometimes lower (masked hypertension) than the patient's true average. A properly kept home BP log is more valuable than any single office reading.",

    suggestedApproach: [
      "Start with the home BP log — review recent readings and trends before making changes",
      "Verify that the patient is using correct home BP technique (see checklist below)",
      "Assess for orthostatic symptoms and check orthostatic vitals when appropriate",
      "Review current medications, adherence, and any side effects",
      "Evaluate for secondary causes if BP is resistant or there are clinical clues",
      "Titrate systematically — one change at a time when possible, with follow-up readings",
    ],

    sections: [
      {
        heading: "Key History Questions — Hypertension Visit",
        items: [
          "Do you check your BP at home? How often? Can I see your BP log?",
          "What time of day are your readings highest? Any readings over 180/120?",
          "Walk me through how you take your BP at home (assess technique — see checklist below)",
          "Are you taking all your BP medications? Any missed doses this week?",
          "Any side effects from your medications — cough, swelling, dizziness, fatigue, frequent urination?",
          "Any dizziness or lightheadedness, especially when standing up or after taking your medications?",
          "Any falls or near-falls recently?",
          "Any episodes of presyncope or syncope?",
          "Any headaches, visual changes, or chest pain? (assess for hypertensive urgency/emergency symptoms)",
          "Are you using any NSAIDs (ibuprofen, naproxen), decongestants, stimulants, or herbal supplements?",
          "How much alcohol do you drink per week? Any caffeine intake?",
          "Any snoring, witnessed apneas, or daytime sleepiness? (screen for OSA)",
          "For patients with possible secondary HTN: any muscle cramps, weakness, or palpitations? (aldosteronism) Any flushing, sweating, or episodic headaches? (pheochromocytoma)",
        ],
      },
      {
        heading: "Correct Home BP Technique (Patient Education Checklist)",
        items: [
          "Use a validated upper-arm cuff (not wrist) — check that the cuff size is appropriate for the patient's arm circumference",
          "Avoid caffeine, smoking, and exercise for at least 30 minutes before measuring",
          "Empty the bladder before sitting down",
          "Sit quietly for 5 minutes before taking the first reading",
          "Sit with back supported, feet flat on the floor, legs uncrossed",
          "Support the arm at heart (mid-chest) level on a table or armrest",
          "No talking during the measurement",
          "Take at least 2 readings, about 1 minute apart — record both readings",
          "Measure at the same times each day (morning before medications and evening are ideal)",
          "Bring the BP log to every clinic visit — or use a phone app that stores readings",
        ],
      },
      {
        heading: "Orthostatic Symptom Review",
        items: [
          "Dizziness or lightheadedness — especially on standing, after meals, or after taking medications",
          "Falls or near-falls — ask explicitly, as patients may not volunteer this",
          "Presyncope or syncope — any episodes of feeling faint or losing consciousness",
          "Low-BP symptoms after medication doses — timing suggests medication-related hypotension",
          "Check orthostatic vitals when symptoms are present: BP and HR supine, then at 1 and 3 minutes standing",
          "Orthostatic hypotension: systolic drop ≥20 mmHg or diastolic drop ≥10 mmHg on standing",
        ],
      },
      {
        heading: "Important Exam Findings and Labs",
        items: [
          "Bilateral arm BPs — >10 mmHg difference may suggest subclavian stenosis or aortic disease",
          "Fundoscopic exam — hypertensive retinopathy grading when relevant",
          "Cardiovascular exam — S4 gallop, murmurs, carotid bruits",
          "Abdominal exam — renal artery bruits (renovascular disease)",
          "Peripheral edema — may relate to CCB use, volume overload, or CKD",
          "Labs to review: BMP (potassium, creatinine, sodium, bicarbonate), urine albumin-to-creatinine ratio, CBC",
          "Additional labs when evaluating secondary causes: aldosterone/renin ratio, TSH, metanephrines, renal artery imaging (as clinically indicated)",
        ],
      },
      {
        heading: "Medication Framework — Stepped Approach",
        items: [
          "First-line agents (per ACC/AHA and KDIGO): ACE inhibitor, ARB, thiazide-like diuretic (chlorthalidone, indapamide), DHP calcium channel blocker (amlodipine, nifedipine)",
          "For CKD with proteinuria: ACEi or ARB is preferred first-line (per KDIGO); consider adding SGLT2 inhibitor",
          "For Black patients without CKD/proteinuria: thiazide-like diuretic or CCB often preferred as initial therapy (per ACC/AHA)",
          "Second-line / add-on agents: MRA (spironolactone — particularly effective in resistant HTN), beta-blocker (when indicated for HR control or compelling indication), alpha-blocker",
          "Later agents: loop diuretic (when eGFR is low), central agents (clonidine), direct vasodilators (hydralazine, minoxidil) — typically for refractory cases",
          "Combination pills — simplify regimens when possible to improve adherence (e.g., ACEi + CCB, ARB + thiazide)",
        ],
      },
      {
        heading: "Practical Outpatient Titration",
        items: [
          "Confirm the home BP pattern before changing medications — do not titrate based on a single office reading",
          "Assess symptoms and orthostatic vitals — ensure the patient tolerates current doses before uptitrating",
          "Review adherence — ask nonjudgmentally about missed doses; non-adherence is common and often underrecognized",
          "Review side effects — cough (ACEi), edema (CCB), hyperkalemia (ACEi/ARB/MRA), fatigue (beta-blocker)",
          "Review relevant labs — potassium, creatinine, eGFR — especially after starting or adjusting ACEi/ARB/MRA",
          "Uptitrate before adding — maximize dose of current agent before adding a new class when possible",
          "Combine thoughtfully — choose agents with complementary mechanisms",
          "Simplify with combination pills — improves adherence, reduces pill burden",
          "Set follow-up — recheck BP (home log) and labs in 2–4 weeks after a change",
        ],
      },
      {
        heading: "Resistant and Secondary Hypertension",
        items: [
          "Definition: BP above goal despite 3 antihypertensives at adequate doses (including a diuretic), or requiring ≥4 agents",
          "Always assess for pseudoresistance first: poor adherence, inadequate doses, incorrect home BP technique, white coat effect",
          "Review contributors: NSAIDs, decongestants, stimulants (ADHD medications, caffeine), oral contraceptives, corticosteroids, alcohol, licorice (glycyrrhizin)",
          "Common secondary causes: CKD (most common), primary aldosteronism (consider if hypokalemia, resistant HTN, or adrenal incidentaloma), obstructive sleep apnea",
          "Less common secondary causes: renovascular disease (consider in young women with FMD or elderly with atherosclerotic risk factors), thyroid disease (hyper or hypo), pheochromocytoma/paraganglioma (consider if episodic symptoms), Cushing syndrome (consider if cushingoid features)",
          "Medication-induced hypertension — always review the medication list and OTC/supplement use",
          "Focused workup should be guided by clinical suspicion — not shotgun screening of all causes",
          "Screening tests by cause: aldosterone/renin ratio (primary aldosteronism), TSH (thyroid), sleep study (OSA), renal artery duplex or CTA/MRA (renovascular), plasma or urine metanephrines (pheochromocytoma), dexamethasone suppression test or 24h urine cortisol (Cushing)",
          "Treatment is cause-specific — discuss with attending before initiating workup for secondary causes",
        ],
      },
      {
        heading: "Assessment and Plan Framework — Hypertension",
        items: [
          "BP status — current reading, home BP trend, and whether at goal",
          "Current regimen — list all antihypertensives with doses",
          "Adherence — patient-reported adherence, any missed doses",
          "Side effects — any dose-limiting adverse effects",
          "Orthostatic symptoms — present or absent; orthostatic vitals if relevant",
          "Contributing factors — medications, substances, lifestyle factors",
          "End-organ assessment — CKD status, proteinuria, cardiac history, retinopathy",
          "Secondary cause evaluation — if resistant HTN, document workup status and findings",
          "Plan — medication adjustment (uptitrate, add, switch), lab follow-up, BP log instructions",
          "Follow-up — interval based on BP control and recent changes (2–4 weeks if actively titrating)",
        ],
      },
    ],

    teachingPoints: [
      "Home BP readings are more predictive of cardiovascular outcomes than office readings — always ask for the log before making changes.",
      "Chlorthalidone and indapamide (thiazide-like diuretics) are preferred over HCTZ for BP lowering per most guidelines — longer duration of action and better outcome data.",
      "Spironolactone is the most effective add-on agent for resistant hypertension (per PATHWAY-2 trial) — check potassium and renal function before starting.",
      "Primary aldosteronism is far more common than historically appreciated (estimated 5–10% of hypertensive patients) — screen when there are clinical clues.",
      "Every BP medication change should be followed up in 2–4 weeks with home BP data — titrating without follow-up data leads to stacking medications and increases hypotension risk.",
    ],

    discussionQuestions: [
      "A patient is on lisinopril 40 mg, amlodipine 10 mg, and chlorthalidone 25 mg, but home BPs average 155/95. What is your systematic approach to evaluating and managing this patient's resistant hypertension?",
      "A 28-year-old woman is referred for new-onset hypertension with BPs around 160/100 and a potassium of 3.2 mEq/L. What secondary causes would you consider, and how would you prioritize your workup?",
    ],

    guidelineBasis: [
      "ACC/AHA 2017 Guideline for High Blood Pressure in Adults",
      "KDIGO 2021 Clinical Practice Guideline for Blood Pressure Management in CKD",
      "Endocrine Society 2016 Guideline for Primary Aldosteronism",
      "PATHWAY-2 Trial (Lancet 2015) — spironolactone for resistant hypertension",
    ],
  },
};

export const CLINIC_GUIDE_FOOTER =
  "Educational clinic guide for student teaching. Not a substitute for individualized clinical judgment.";
