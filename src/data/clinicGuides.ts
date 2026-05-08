// Friday Outpatient Nephrology Clinic Guides — pre-authored teaching content
//
// Each clinic week includes five outpatient learning tracks:
// CKD → DKD → Lupus Nephritis → Hypertension → Transplant.
// Content is guideline-based, educational, and not patient-specific.
// Guideline sources are listed in each guide's guidelineBasis field.

export const CLINIC_GUIDE_TOPICS = ["CKD", "DKD", "Lupus Nephritis", "Hypertension", "Transplant"] as const;
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

export type ClinicGuideTemplates = Record<ClinicGuideTopic, ClinicGuideTemplate>;

export const CLINIC_GUIDES: ClinicGuideTemplates = {
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

    beforePresenting: [],

    howToPresent: "",

    sections: [
      {
        heading: "Clinic Prep & Patient Questions",
        items: [
          "Kidney trajectory: baseline and current creatinine/eGFR with timing.",
          "Albuminuria/proteinuria category and whether it is changing.",
          "BP and weight pattern since the last visit.",
          "CKD complication labs: potassium, bicarbonate, calcium/phosphorus/PTH/vitamin D, hemoglobin/iron when relevant.",
          "Disease-modifying therapy status: ACEi/ARB, SGLT2 inhibitor, finerenone when appropriate, and dose limits.",
          "Advanced CKD planning status: modality education, access preservation/planning, and transplant referral.",
          "Uremic symptoms: fatigue, appetite change, nausea/vomiting, weight loss, sleep disturbance, pruritus, cognitive change, restless legs, cramps.",
          "Volume symptoms: edema, dyspnea, orthopnea, reduced exercise tolerance.",
          "Home BP pattern and medication adherence.",
          "NSAIDs, contrast exposure, supplements, or other nephrotoxins since the last visit.",
          "For advanced CKD: what the patient understands about dialysis, transplant, and access planning.",
        ],
      },
      {
        heading: "Exam Focus",
        items: [
          "BP measurement quality and whether repeat BP is needed.",
          "Volume exam: JVD, lung findings, edema, weight change.",
          "Pallor, excoriations, asterixis, or mental status change in advanced disease.",
          "AVF/AVG exam if present.",
        ],
      },
      {
        heading: "Synthesis for the Visit",
        items: [
          "Is kidney function stable, slowly progressive, or changing faster than expected?",
          "Which active problem drives today's plan: BP, volume, proteinuria, potassium, acidosis, anemia, CKD-MBD, symptoms, or KRT planning?",
          "Is kidney-protective therapy optimized and tolerated?",
          "If eGFR is low, are symptoms or refractory complications pushing planning forward?",
        ],
      },
    ],

    commonMistakes: [
      "Not asking about symptoms of uremia",
      "Waiting until a crisis to start modality, transplant, or access conversations",
      "Missing access-preservation problems, especially recent PICC or midline placement",
      "Listing CKD complications without saying which one changes today's plan",
    ],

    teachingPoints: [
      "Classify CKD by cause, GFR category, and albuminuria category.",
      "KDIGO 2024 supports SGLT2 inhibitor initiation at eGFR >=20 mL/min/1.73 m2 in appropriate patients, with continuation below that if tolerated until kidney replacement therapy begins.",
      "Persistent metabolic acidosis in CKD is generally treated with oral alkali to maintain serum bicarbonate around >=22 mmol/L.",
    ],

    discussionQuestions: [],

    guidelineBasis: [
      "KDIGO 2024 Clinical Practice Guideline for CKD Evaluation and Management",
      "KDIGO 2021 Clinical Practice Guideline for Blood Pressure Management in CKD",
      "IDEAL Trial (NEJM 2010) — timing of dialysis initiation",
      "CONFIDENCE (NEJM 2025) — simultaneous finerenone + empagliflozin in DKD",
      "CKD-FIX (NEJM 2020) — allopurinol does NOT slow CKD progression",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  DIABETIC KIDNEY DISEASE CLINIC GUIDE
  // ═══════════════════════════════════════════════════════════════════
  DKD: {
    topic: "DKD",
    icon: "🩸",
    title: "Diabetic Kidney Disease Clinic",
    subtitle: "Diagnosis confidence, albuminuria risk, and layered kidney-protective therapy",

    whyItMatters:
      "Diabetic kidney disease visits are not just diabetes follow-up. The clinic task is to confirm the DKD pattern, recognize features that suggest another kidney disease, quantify kidney and cardiovascular risk, and layer therapies that slow progression while monitoring safety.",

    teachingPearl:
      "Do not call every kidney problem in a diabetic patient DKD. Long diabetes duration, albuminuria progression, bland sediment, and retinopathy support DKD; active sediment, abrupt nephrotic syndrome, or rapid eGFR loss should make you pause.",

    beforePresenting: [],

    howToPresent: "",

    sections: [
      {
        heading: "Clinic Prep & Patient Questions",
        items: [
          "Diabetes context: type, duration, A1c pattern, hypoglycemia history, and current diabetes medications.",
          "Kidney risk data: eGFR/creatinine trend, UACR trend, urine sediment, and prior kidney imaging if available.",
          "Microvascular clues: retinopathy status, neuropathy, foot ulcers, and prior amputations or infections.",
          "Cardiovascular context: ASCVD, heart failure, stroke, PAD, smoking, and lipid therapy.",
          "BP evidence: home BP, office BP quality, orthostatic symptoms, and current antihypertensive doses.",
          "Current kidney-protective therapy: ACEi/ARB dose, SGLT2 inhibitor status, finerenone status, GLP-1 RA or incretin therapy, and reason any pillar is missing.",
          "Safety labs and limits: potassium, bicarbonate, volume status, eGFR thresholds, and recent AKI/dehydration/contrast exposure.",
          "SGLT2 inhibitor counseling: genital infections, volume symptoms, peri-procedure or sick-day holds, and euglycemic DKA warning symptoms.",
          "Finerenone/MRA counseling: hyperkalemia risk, potassium diet/supplements, NSAIDs, TMP-SMX, and planned lab follow-up.",
          "Diet and behavior: sodium intake, protein pattern, weight goals, activity, tobacco, and barriers to medication access.",
        ],
      },
      {
        heading: "DKD vs Something Else",
        items: [
          "Typical DKD pattern: long-standing diabetes, progressive albuminuria, bland sediment, diabetic retinopathy, and gradual eGFR decline.",
          "Atypical features: active urine sediment, RBC casts, abrupt creatinine rise, rapidly progressive eGFR loss, sudden nephrotic syndrome, systemic symptoms, low complement, monoclonal-protein clues, or no retinopathy when the story otherwise seems diabetic.",
          "Type 1 diabetes clue: proteinuria within the first 5 years or absent retinopathy should raise suspicion for non-diabetic kidney disease.",
          "If the pattern is atypical, define what result would change management before recommending biopsy or serologic workup.",
        ],
      },
      {
        heading: "The 4 Pillars of DKD Therapy",
        items: [
          "Pillar 1 - ACEi or ARB: use the maximally tolerated single-agent RAAS blocker when albuminuria and hypertension are present; avoid dual ACEi/ARB therapy.",
          "Pillar 2 - SGLT2 inhibitor: for most T2D + CKD patients with eGFR >=20 mL/min/1.73 m2, use for kidney and heart protection rather than glucose lowering alone; expect a small early eGFR dip.",
          "Pillar 3 - Finerenone: consider for T2D with persistent albuminuria despite ACEi/ARB when eGFR and potassium allow; check potassium at baseline, about 1 month after initiation or dose change, and periodically thereafter.",
          "Pillar 4 - GLP-1 RA or incretin-based therapy: consider when additional glycemic, weight, cardiovascular, or kidney-risk reduction is needed, especially if obesity or ASCVD risk is prominent.",
          "BP and volume: align target with measurement technique and tolerance; treat edema and sodium excess before simply adding more BP agents.",
          "Medication safety: dose-adjust metformin and other diabetes drugs for eGFR, avoid NSAIDs, and revisit sick-day holds for ACEi/ARB, SGLT2i, diuretics, and metformin.",
        ],
      },
      {
        heading: "Exam Focus",
        items: [
          "BP measurement quality, repeat BP, and orthostatics when symptoms or autonomic neuropathy are possible.",
          "Volume exam: JVD, lung findings, edema, and weight trend.",
          "Peripheral vascular and foot check when wounds, PAD, neuropathy, or infection risk is part of the story.",
          "Skin and injection sites when relevant to diabetes medication use or infection.",
        ],
      },
      {
        heading: "Synthesis for the Visit",
        items: [
          "Is this classic DKD, DKD plus superimposed AKI, or a diabetic patient with another kidney disease?",
          "What are the GFR and albuminuria categories, and is the trajectory stable or worsening?",
          "Which kidney-protective pillar is missing, contraindicated, unaffordable, or limited by side effects?",
          "What safety monitoring is required after today's medication change?",
        ],
      },
    ],

    commonMistakes: [
      "Assuming diabetes explains the kidney disease without checking sediment, tempo, and retinopathy status",
      "Presenting creatinine without UACR or albuminuria category",
      "Treating SGLT2 inhibitors as glucose drugs instead of kidney and heart protection",
      "Adding finerenone without a potassium plan",
      "Using dual RAAS blockade because albuminuria is severe",
    ],

    teachingPoints: [
      "DKD risk is staged by both eGFR and albuminuria; UACR is not optional data.",
      "Students should know the 4 pillars of DKD therapy: RAAS blockade, SGLT2 inhibitor, finerenone when eligible, and GLP-1 RA or incretin therapy when clinically appropriate.",
      "An early SGLT2 inhibitor eGFR dip is expected; volume depletion, AKI symptoms, or a large decline need reassessment.",
      "Atypical features should trigger a diagnostic pause, not automatic escalation of DKD therapy.",
    ],

    discussionQuestions: [],

    guidelineBasis: [
      "ADA Standards of Care in Diabetes 2026, Section 11: Chronic Kidney Disease and Risk Management",
      "KDIGO 2022 Clinical Practice Guideline for Diabetes Management in CKD",
      "KDIGO 2024 Clinical Practice Guideline for CKD Evaluation and Management",
      "CREDENCE, DAPA-CKD, and EMPA-KIDNEY — SGLT2 inhibitor kidney outcome evidence",
      "FIDELIO-DKD, FIGARO-DKD, and FIDELITY — finerenone kidney and cardiovascular outcomes",
      "FLOW — semaglutide kidney outcomes in T2D with CKD",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  LUPUS NEPHRITIS CLINIC GUIDE
  // ═══════════════════════════════════════════════════════════════════
  "Lupus Nephritis": {
    topic: "Lupus Nephritis",
    icon: "🦋",
    title: "Lupus Nephritis Clinic",
    subtitle: "Flare detection, biopsy context, response tracking, and immunosuppression safety",

    whyItMatters:
      "Lupus nephritis clinic visits protect kidney function by detecting relapse early, tracking proteinuria response, coordinating nephrology-rheumatology treatment, and reducing infection, steroid, reproductive, and medication-toxicity harms.",

    teachingPearl:
      "Proteinuria is the vital sign of lupus nephritis follow-up. Always pair it with creatinine/eGFR, urine sediment, complements, anti-dsDNA, medication adherence, and the biopsy class or suspected flare context.",

    beforePresenting: [],

    howToPresent: "",

    sections: [
      {
        heading: "Clinic Prep & Patient Questions",
        items: [
          "LN context: SLE history, prior kidney biopsy class/activity/chronicity, baseline creatinine/eGFR, baseline proteinuria, and prior flares.",
          "Current kidney activity: UPCR or UACR trend, creatinine/eGFR trend, urinalysis with sediment, hematuria/casts, serum albumin, edema, and BP.",
          "Serologic activity: complement C3/C4 and anti-dsDNA trend; check at clinic visits but avoid over-ordering more often than monthly.",
          "Current regimen and adherence: hydroxychloroquine, glucocorticoid dose/taper, MPAA/MMF dose, cyclophosphamide history, belimumab, voclosporin/tacrolimus/cyclosporine, rituximab/other biologics, and missed doses.",
          "Treatment phase: new diagnosis, induction/active flare, partial response, complete response, maintenance, taper, refractory disease, pregnancy planning, or ESKD/transplant planning.",
          "Toxicity screen: infections, leukopenia, GI intolerance, tremor, hypertension, hyperkalemia, AKI, alopecia, mood/sleep changes, hyperglycemia, weight gain, bone risk, eye screening for HCQ, and malignancy/vaccine status.",
          "Reproductive safety: pregnancy intention, contraception, teratogenic medications such as mycophenolate or cyclophosphamide, fertility preservation when cyclophosphamide is being considered, and antiphospholipid syndrome history.",
          "Thrombosis risk: severe proteinuria, low serum albumin, antiphospholipid antibodies or prior clot, estrogen exposure, smoking, and immobility.",
          "Supportive kidney care: RAAS inhibitor use when proteinuria is present, BP control, sodium intake, statin/ASCVD risk, bone protection, PJP or other prophylaxis when indicated, and infection-risk counseling.",
        ],
      },
      {
        heading: "When to Think Biopsy",
        items: [
          "Suspected new LN: SLE with proteinuria greater than 0.5 g/g and/or otherwise unexplained impaired kidney function should prompt kidney-biopsy discussion unless contraindicated.",
          "Suspected flare after treated LN: rising proteinuria, hematuria, active sediment, or worsening kidney function may need repeat biopsy because flare, chronic scarring, TMA, drug toxicity, and another kidney disease can look similar.",
          "Poor response: ongoing or worsening proteinuria, hematuria, or kidney dysfunction after at least 6 months of appropriate therapy is a reason to revisit biopsy and adherence before labeling refractory disease.",
          "Do not manage class III/IV, class V, and chronic inactive scarring as if they are the same disease; the biopsy class and activity/chronicity drive treatment intensity.",
        ],
      },
      {
        heading: "Treatment Reference",
        items: [
          "All LN: use hydroxychloroquine unless contraindicated, adjust doses for kidney function, and coordinate nephrology-rheumatology care.",
          "Glucocorticoids: modern guidance favors IV methylprednisolone pulses for active disease followed by lower-dose oral prednisone with taper toward <=5 mg/day by about 6 months when clinically feasible.",
          "Active class III/IV +/- V: current ACR guidance favors triple immunosuppression: glucocorticoids plus either MPAA + belimumab, MPAA + CNI, or low-dose Euro-Lupus cyclophosphamide + belimumab.",
          "Pure class V with proteinuria >=1 g/g: ACR favors glucocorticoids + MPAA + CNI; lower proteinuria may be treated less aggressively depending on risk and systemic disease.",
          "KDIGO initial options for active class III/IV include glucocorticoids plus MPAA, low-dose IV cyclophosphamide, belimumab add-on regimens, or MPAA + CNI when kidney function is not severely impaired.",
          "Response goal: complete renal response generally means proteinuria around <=0.5 g/day or UPCR <=0.5 g/g with stable or improved kidney function by roughly 6-12 months; partial response trajectory matters before changing therapy.",
          "Duration: after complete response, total immunosuppressive therapy is usually continued for at least 3-5 years before cautious tapering.",
        ],
      },
      {
        heading: "Monitoring Checklist",
        items: [
          "If complete response has not been achieved: quantify proteinuria at least every 3 months.",
          "If sustained complete response: quantify proteinuria every 3-6 months.",
          "At clinic visits: creatinine/eGFR, potassium, CBC, liver tests when relevant, complements, anti-dsDNA, urine microscopy, BP, weight, and medication-specific levels or safety labs.",
          "For MPAA/MMF: watch leukopenia, infection, GI intolerance, and pregnancy risk.",
          "For CNI/voclosporin/tacrolimus/cyclosporine: watch BP, creatinine rise, hyperkalemia, tremor/neurotoxicity, drug interactions, and nephrotoxicity.",
          "For cyclophosphamide: watch cytopenias, infection, infertility risk, hemorrhagic cystitis, malignancy risk, and need for fertility/pregnancy counseling.",
          "For belimumab or anti-CD20 therapy: watch infection risk, vaccine timing, infusion/injection reactions, mood symptoms when relevant, and immunoglobulin/B-cell monitoring per local practice.",
        ],
      },
      {
        heading: "Exam Focus",
        items: [
          "BP measurement quality and repeat BP if elevated.",
          "Volume exam: JVD, lungs, edema, weight change, ascites if severe nephrotic syndrome.",
          "SLE activity clues: rash, oral ulcers, synovitis, serositis symptoms, neurologic symptoms, and fever or infection signs.",
          "Medication toxicity clues: bruising/cytopenia signs, steroid features, tremor, wounds, and infection.",
        ],
      },
      {
        heading: "Synthesis for the Visit",
        items: [
          "Is this active inflammatory LN, chronic damage, medication toxicity, infection, TMA/APS, or another kidney disease?",
          "Is the patient improving, partially responding, relapsing, or refractory based on proteinuria, eGFR, sediment, and serologies?",
          "What is the current treatment phase, and what is the next safety lab or response milestone?",
          "What counseling is needed today: adherence, infection prevention, vaccines, bone protection, reproductive safety, thrombosis risk, or biopsy planning?",
        ],
      },
    ],

    commonMistakes: [
      "Calling a creatinine rise LN flare without checking sediment, proteinuria, adherence, infection, CNI toxicity, and chronicity",
      "Following complements and anti-dsDNA without quantifying proteinuria",
      "Forgetting the biopsy class and activity/chronicity score when discussing treatment intensity",
      "Letting patients remain on high-dose steroids without a taper and toxicity-prevention plan",
      "Missing pregnancy and contraception counseling for mycophenolate or cyclophosphamide",
    ],

    teachingPoints: [
      "A proteinuria threshold above 0.5 g/g in SLE is a biopsy trigger, not just a lab abnormality to watch indefinitely.",
      "LN response is judged over months, but worsening kidney function or active sediment should accelerate reassessment.",
      "Modern LN therapy often uses combination therapy to improve response while reducing cumulative steroid exposure.",
      "Hydroxychloroquine, supportive kidney care, vaccine planning, and reproductive counseling are core parts of LN management, not extras.",
    ],

    discussionQuestions: [],

    guidelineBasis: [
      "American College of Rheumatology 2024 Guideline Summary for the Screening, Treatment, and Management of Lupus Nephritis",
      "KDIGO 2024 Clinical Practice Guideline for the Management of Lupus Nephritis",
      "BLISS-LN (NEJM 2020) — belimumab add-on therapy in active lupus nephritis",
      "AURORA 1 (Lancet 2021) — voclosporin add-on therapy in active lupus nephritis",
      "Euro-Lupus Nephritis Trial — low-dose cyclophosphamide regimen",
      "ALMS — mycophenolate vs cyclophosphamide induction and maintenance evidence",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  TRANSPLANT CLINIC GUIDE
  // ═══════════════════════════════════════════════════════════════════
  Transplant: {
    topic: "Transplant",
    icon: "💊",
    title: "Kidney Transplant Clinic",
    subtitle: "Graft surveillance, immunosuppression review, and complication monitoring",

    whyItMatters:
      "Post-transplant visits are about detecting graft dysfunction, reviewing immunosuppression adherence and toxicity, and screening for infection and malignancy.",

    teachingPearl:
      "A drug level is useful only in context. The regimen, time from transplant, baseline graft function, adherence, interacting drugs, and whether the level was a true trough matter as much as the number itself.",

    beforePresenting: [],

    howToPresent: "",

    sections: [
      {
        heading: "Clinic Prep & Patient Questions",
        items: [
          "Transplant context: date, donor type if known, and baseline graft function.",
          "Current graft status: creatinine pattern, proteinuria, and BP.",
          "Immunosuppression regimen, doses, and most recent drug level with draw timing.",
          "Surveillance data: BK/CMV and other center-specific monitoring.",
          "Interval events: infections, admissions, procedures, and new medications.",
          "Missed or late immunosuppression doses since the last visit.",
          "Exact timing of the last CNI dose relative to the lab draw.",
          "Infectious, urinary, GI, or graft-pain symptoms.",
          "New prescription meds, OTCs, supplements, or interacting drugs.",
          "Tremor, headache, or other neurotoxicity symptoms.",
          "New skin lesions or nonhealing wounds.",
        ],
      },
      {
        heading: "Immunosuppression Reference",
        items: [
          "Use these as reference ranges only: trough goals are transplant-center and regimen specific, and dose changes should be confirmed with the transplant team.",
          "Tacrolimus adult kidney/kidney-pancreas trough reference: less than 1 month 9-12 ng/mL, 1-3 months 8-10, 3-12 months 6-8, and greater than 12 months 5-7.",
          "Cyclosporine adult kidney/kidney-pancreas C0 trough reference: less than 1 month 300-350 ng/mL, 1-2 months 250-300, 3-6 months 150-250, 7-12 months 125-200, and greater than 12 months 75-125.",
          "Cyclosporine C2 targets may be used by some centers instead: less than 1 month 1300 ng/mL, 1-2 months 1100, 3-6 months 800-900, 7-12 months 700, and greater than 12 months 450-600.",
          "Tacrolimus side effects to ask/check: tremor, headache, insomnia, diarrhea/nausea, hypertension, hyperglycemia, nephrotoxicity, cytopenias, infection/CMV, and rash or alopecia.",
          "Cyclosporine side effects to ask/check: nephrotoxicity, hypertension, tremor/headache, hirsutism, gingival hyperplasia, hyperlipidemia, edema, hepatotoxicity, GI upset, cytopenias, infection, and skin/wound infections.",
          "Mycophenolate/mycophenolic acid: diarrhea, nausea/vomiting, abdominal pain, edema, leukopenia/anemia, infection/CMV or UTI, and pregnancy or teratogenicity counseling.",
          "Prednisone: hyperglycemia, weight gain or increased appetite, hypertension/edema, mood or sleep changes, acne/skin thinning, impaired wound healing, peptic ulcer symptoms, osteoporosis/fracture risk, cataracts/glaucoma, and infection risk.",
          "mTOR inhibitors such as sirolimus or everolimus: edema, hypertension, hyperlipidemia, mouth ulcers, diarrhea/GI upset, rash, cytopenias, proteinuria, impaired wound healing, pneumonitis symptoms, and infection risk.",
          "Azathioprine: leukopenia/pancytopenia, infection, nausea/vomiting, diarrhea, oral ulcers, hepatotoxicity, pancreatitis symptoms, and TPMT/NUDT15 or local-protocol safety review before escalation.",
          "Belatacept: anemia, diarrhea/constipation, UTI, edema, hypertension, fever, cough, nausea/vomiting, headache, hyperkalemia or hypokalemia, leukopenia, and PTLD/PML or serious infection warning symptoms.",
          "Common prophylaxis meds: valganciclovir can cause leukopenia/neutropenia, anemia, thrombocytopenia, and GI upset and needs renal dosing; TMP-SMX can cause rash, GI upset, hyperkalemia, creatinine rise, cytopenias, and severe sulfa reactions.",
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
        heading: "Synthesis for the Visit",
        items: [
          "Is graft function stable, and if not, what are the likely buckets: rejection, CNI toxicity, volume/hemodynamics, obstruction, infection, or recurrent disease?",
          "Can the drug level be interpreted as a true trough?",
          "Are infections, malignancy risk, metabolic complications, or adherence issues changing management today?",
          "Which next data point would change the plan: repeat labs, urine studies, ultrasound, viral PCR, DSA, or biopsy discussion?",
        ],
      },
    ],

    commonMistakes: [
      "Adjusting immunosuppression without knowing the target range for that regimen and time from transplant",
      "Reacting to a drug level before confirming whether it was a true trough and what goal the transplant center is using",
      "Avoiding adherence questions because they feel uncomfortable",
      "Missing interacting medications",
      "Treating center-specific protocols as universal rules",
    ],

    teachingPoints: [
      "Immunosuppression targets are center-specific and depend on time from transplant and regimen.",
      "Diarrhea can raise tacrolimus levels and can also reflect infection or medication toxicity.",
      "A new creatinine rise after transplant is a problem representation, not a diagnosis.",
    ],

    discussionQuestions: [],

    guidelineBasis: [
      "BC Transplant Medication Guidelines for Solid Organ Transplants (AMB.03.007, revised February 2026)",
      "KDIGO 2009 Clinical Practice Guideline for the Care of the Kidney Transplant Recipient",
      "SYMPHONY Trial (NEJM 2007) — low-dose tacrolimus-based regimens",
      "BENEFIT Trial (AJT 2016) — belatacept vs cyclosporine long-term outcomes",
      "DailyMed prescribing information for belatacept, everolimus, and sulfamethoxazole/trimethoprim",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  HYPERTENSION CLINIC GUIDE
  // ═══════════════════════════════════════════════════════════════════
  Hypertension: {
    topic: "Hypertension",
    icon: "🩺",
    title: "Outpatient Hypertension Clinic",
    subtitle: "Home BP patterns, medication strategy, and secondary cause recognition",

    whyItMatters:
      "Hypertension is a major driver of CKD progression and cardiovascular risk. KDIGO 2021 emphasizes standardized office measurement and supports a target SBP under 120 mmHg for many non-dialysis CKD patients, while broader hypertension care often uses a practical goal under 130/80 mmHg.",

    teachingPearl:
      "Do not escalate therapy from one office reading if you do not know the home BP pattern.",

    beforePresenting: [],

    howToPresent: "",

    sections: [
      {
        heading: "Clinic Prep & Patient Questions",
        items: [
          "BP evidence: home log, office BP, and whether measurements are standardized.",
          "Medication regimen with doses, fill/adherence clues, and side effects.",
          "Safety labs: potassium, creatinine/eGFR, sodium, bicarbonate when relevant.",
          "CKD/proteinuria status because it changes medication priorities.",
          "Contributors to apparent resistance: NSAIDs, stimulants, alcohol, high sodium intake, and OSA clues.",
          "How the patient measures BP at home: cuff size, rest period, position, timing, and whether values are written down.",
          "Missed doses, cost barriers, side effects, and orthostasis/falls.",
          "Dietary sodium, alcohol, NSAIDs/OTCs/stimulants, and sleep apnea symptoms.",
          "Secondary-cause clues when the story fits: young onset, abrupt worsening, hypokalemia, episodic symptoms, kidney bruits, or resistant HTN.",
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
        heading: "Synthesis for the Visit",
        items: [
          "Is BP truly uncontrolled, or is this white-coat effect, poor technique, nonadherence, or undertreatment?",
          "Is the regimen at effective doses and built around the patient's CKD/proteinuria status?",
          "Is this resistant hypertension, and if so, is spironolactone or another add-on safe with the current kidney function and potassium?",
          "Does the history justify targeted secondary workup?",
        ],
      },
    ],

    commonMistakes: [
      "Treating medication side effects as nonadherence without asking what happened",
      "Treating apparent resistance before confirming measurement quality and adherence",
      "Ordering shotgun secondary HTN workups",
      "Ignoring orthostatic symptoms in older or frail patients",
    ],

    teachingPoints: [
      "For most adults, a practical treatment goal is under 130/80 mmHg; in CKD, KDIGO supports standardized office SBP under 120 mmHg for many non-dialysis patients when tolerated.",
      "Resistant HTN requires three appropriately dosed agents, usually including a diuretic, before adding more complexity.",
      "Primary aldosteronism is common enough to consider when hypertension is resistant or paired with hypokalemia.",
    ],

    discussionQuestions: [],

    guidelineBasis: [
      "ACC/AHA 2025 Guideline for High Blood Pressure in Adults",
      "KDIGO 2021 Clinical Practice Guideline for Blood Pressure Management in CKD",
      "Endocrine Society 2025 Guideline for Primary Aldosteronism",
      "PATHWAY-2 Trial (Lancet 2015) — spironolactone for resistant hypertension",
      "CORAL (NEJM 2014) — renal-artery stenting no benefit over medical therapy",
      "PRECISION (Lancet 2022) — aprocitentan for resistant HTN; FDA-approved 2024",
      "AMBER (Lancet 2019) — patiromer enables MRA continuation in advanced-CKD resistant HTN",
    ],
  },
};

export const CLINIC_GUIDE_FOOTER =
  "Educational clinic guide for student teaching. Not a substitute for individualized clinical judgment.";
