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
