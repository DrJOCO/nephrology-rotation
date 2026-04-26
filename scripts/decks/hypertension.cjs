// Hypertension outpatient teaching deck
const pptxgen = require("pptxgenjs");
const path = require("path");
const {
  PALETTE, FONT, addCoverSlide, newContentSlide, addCard, addPearlBox,
  addReferencesSlide, bulletBlock,
  addCaseSlide, addCaseQuestionSlide, addCaseAnswerSlide,
} = require("./deckStyle.cjs");

const TOPIC = "Hypertension";
const TOTAL = 12;

async function build() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Dr. Cheng";
  pres.title = TOPIC;

  addCoverSlide(pres, {
    topic: "Hypertension",
    subtitle: "Outpatient approach and resistant HTN",
    tagline: "Home BP data outweighs office readings. Never escalate from one office measurement.",
  });


  // 2. Why matters + pearl
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 2, totalSlides: TOTAL,
      title: "Why it matters",
      subtitle: "Common, silent, modifiable — and still the leading modifiable CV risk factor.",
      source: "ACC/AHA 2017 (plus 2025 update). KDIGO 2021 BP in CKD.",
    });
    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "WHAT THE CLINIC VISIT COVERS", body: "",
    });
    s.addText(bulletBlock([
      "Confirm with home / ambulatory BP",
      "Target: < 130/80; < 120 in CKD / high CV risk",
      "Lifestyle, then staged 3-drug ladder",
      "Adherence + side effects first",
      "Secondary causes in resistant HTN",
      "CV risk: lipid, DM, smoking",
      "End-organ: UACR, ECG (LVH), fundus",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
    addPearlBox(s, {
      x: 5.2, y: 1.4, w: 4.4, h: 3.6,
      label: "TEACHING PEARL",
      body: "Office BP is a hypothesis, not a diagnosis. Check adherence, cuff size, home log before adding drugs. Most 'resistant' HTN is pseudo-resistant.",
    });
  }

  // 3. Diagnosis & targets
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 3, totalSlides: TOTAL,
      title: "Diagnosis and targets",
      subtitle: "Measurement technique drives both.",
      source: "ACC/AHA 2017/2025; KDIGO 2021 BP in CKD; SPRINT (NEJM 2015).",
    });

    const rows = [
      [
        { text: "Category", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "SBP / DBP (office)", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Home average", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Action", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
      ],
      [
        { text: "Normal", options: { bold: true, color: PALETTE.good, fontFace: FONT.body } },
        "< 120 / < 80", "< 120 / < 80", "Lifestyle; recheck annually",
      ],
      [
        { text: "Elevated", options: { bold: true, color: PALETTE.warn, fontFace: FONT.body } },
        "120–129 / < 80", "120–129 / < 80", "Lifestyle; recheck 3–6 mo",
      ],
      [
        { text: "Stage 1", options: { bold: true, color: PALETTE.accent, fontFace: FONT.body } },
        "130–139 / 80–89", "≥ 130 / ≥ 80", "Lifestyle ± drug if CV risk ≥ 10%",
      ],
      [
        { text: "Stage 2", options: { bold: true, color: PALETTE.danger, fontFace: FONT.body } },
        "≥ 140 / ≥ 90", "≥ 135 / ≥ 85", "Drug + lifestyle; 2-drug combo if ≥ 160/100",
      ],
      [
        { text: "Hypertensive crisis", options: { bold: true, color: PALETTE.danger, fontFace: FONT.body } },
        "≥ 180 / ≥ 120", "—",
        "Urgent evaluation — end-organ damage? IV if yes",
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [1.9, 2.1, 2.1, 3.1],
      rowH: [0.38, 0.4, 0.4, 0.4, 0.45, 0.5],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 10, valign: "middle",
    });

    s.addShape("rect", {
      x: 0.4, y: 4.5, w: 9.2, h: 0.5,
      fill: { color: PALETTE.ice }, line: { color: PALETTE.secondary, width: 0.5 },
    });
    s.addText([
      { text: "Targets by population: ", options: { bold: true, color: PALETTE.primary } },
      { text: "General < 130/80 (ACC/AHA) • CKD SBP < 120 (KDIGO 2021, automated office blood pressure (AOBP)-measured) • Elderly consider tolerability • Orthostasis → aim at standing SBP too." },
    ], {
      x: 0.55, y: 4.55, w: 9.0, h: 0.4,
      fontFace: FONT.body, fontSize: 10.5, color: PALETTE.charcoal, margin: 0, valign: "middle",
    });
  }

  // 4. Proper BP measurement
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 4, totalSlides: TOTAL,
      title: "Measurement — the most common error",
      subtitle: "Technique changes SBP by 10–20 mmHg. Do it right before escalating.",
      source: "AHA 2019 Measurement of BP in Humans; SPRINT protocol.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "OFFICE BP", body: "",
    });
    s.addText(bulletBlock([
      "5 minutes quiet seating; feet flat on floor; no caffeine / nicotine / exercise 30 min prior",
      "Correct cuff size: bladder width 40%, length 80% of arm circumference",
      "Back supported, arm at heart level, uncovered",
      "No talking during measurement",
      "Average 2 readings at least 1 min apart",
      { text: "Automated office BP (AOBP) = unattended, automated; most aligned with SPRINT", bold: true, color: PALETTE.primary },
    ], { fontSize: 10.5, paraSpaceAfter: 5 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.accent,
      header: "HOME / AMBULATORY BP", body: "",
    });
    s.addText(bulletBlock([
      "Gold standard for diagnosis & titration",
      "7 days of morning + evening readings, duplicates, discard day 1",
      "Validated upper-arm cuff (not wrist)",
      "Home BP averages are 5 mmHg LOWER than office — use HBP thresholds",
      { text: "White-coat HTN: elevated office, normal home → monitor only", bold: true },
      { text: "Masked HTN: normal office, elevated home → treat", bold: true, color: PALETTE.accent },
    ], { fontSize: 10.5, paraSpaceAfter: 5 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 5. Drug ladder
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 5, totalSlides: TOTAL,
      title: "The drug ladder",
      subtitle: "Three classes, titrated to target. Add spironolactone if resistant.",
      source: "ACC/AHA 2017/2025; PATHWAY-2 (Lancet 2015) for resistant HTN.",
    });

    const rows = [
      [
        { text: "Step", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, align: "center" } },
        { text: "Agent", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Preferred when", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Avoid when", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
      ],
      [
        { text: "1", options: { bold: true, color: PALETTE.primary, align: "center", fontFace: FONT.title, fontSize: 18 } },
        "ACEi or ARB (not both)",
        "CKD (UACR > 30), DM, HFrEF, post-MI",
        "Pregnancy; bilateral renal artery stenosis (RAS); hyperK",
      ],
      [
        { text: "2", options: { bold: true, color: PALETTE.primary, align: "center", fontFace: FONT.title, fontSize: 18 } },
        "Thiazide  (chlorthalidone 12.5–25 mg preferred)",
        "Older patient, Black patients, low-renin HTN",
        "eGFR < 30 (use loop instead), gout",
      ],
      [
        { text: "3", options: { bold: true, color: PALETTE.primary, align: "center", fontFace: FONT.title, fontSize: 18 } },
        "DHP calcium channel blocker (CCB)  (amlodipine 5–10 mg)",
        "Elderly isolated systolic HTN, Black patients",
        "HFrEF (non-DHP), bradyarrhythmia (non-DHP)",
      ],
      [
        { text: "4", options: { bold: true, color: PALETTE.accent, align: "center", fontFace: FONT.title, fontSize: 18 } },
        "Spironolactone 25–50 mg  (or finerenone in DKD)",
        "Resistant HTN on max 3-drug combo (PATHWAY-2)",
        "K > 5.0, severe CKD; watch gynecomastia",
      ],
      [
        { text: "+", options: { bold: true, color: PALETTE.muted, align: "center", fontFace: FONT.title, fontSize: 16 } },
        "Beta-blocker, clonidine, hydralazine",
        "Add after 4th drug if still not controlled",
        "Assess for secondary HTN at this point",
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [0.7, 3.1, 3.2, 2.2],
      rowH: [0.35, 0.5, 0.5, 0.5, 0.55, 0.5],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 9.5, valign: "middle",
    });
  }

  // 6. Secondary HTN
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 6, totalSlides: TOTAL,
      title: "Secondary hypertension — who to work up",
      subtitle: "Not a shotgun panel. Pick the test based on the clue.",
      source: "Endocrine Society 2016/2025 Primary Aldosteronism. JNC/ACC-AHA secondary screening.",
    });

    const rows = [
      [
        { text: "Clue", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Suspect", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Test", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
      ],
      [
        { text: "Hypokalemia (spontaneous or diuretic-exaggerated)", options: { fontFace: FONT.body } },
        "Primary aldosteronism",
        "Aldosterone/renin ratio (morning, off mineralocorticoid receptor antagonist (MRA) 4 wk)",
      ],
      [
        { text: "HTN in young adult or resistant, with renal asymmetry", options: { fontFace: FONT.body } },
        "Fibromuscular dysplasia / atherosclerotic RAS",
        "Duplex renal US → CTA/MRA",
      ],
      [
        { text: "Flash pulmonary edema, acute Cr bump on ACEi", options: { fontFace: FONT.body } },
        "Bilateral RAS",
        "Renal duplex / MRA",
      ],
      [
        { text: "Paroxysmal HTN + headache, sweating, palpitations", options: { fontFace: FONT.body } },
        "Pheochromocytoma",
        "Plasma metanephrines (free, fractionated)",
      ],
      [
        { text: "Moon facies, central obesity, striae, DM, hypoK", options: { fontFace: FONT.body } },
        "Cushing syndrome",
        "24-h urinary free cortisol; low-dose dexamethasone suppression test (LDDST); 11 pm salivary",
      ],
      [
        { text: "Snoring, daytime sleepiness, BMI > 30", options: { fontFace: FONT.body } },
        "Obstructive sleep apnea",
        "Home sleep study → PSG",
      ],
      [
        { text: "HTN in pregnancy", options: { fontFace: FONT.body } },
        "Preeclampsia, chronic HTN",
        "Urgent OB; ACEi/ARB contraindicated",
      ],
      [
        { text: "Young HTN + weak femoral pulses / rib notching", options: { fontFace: FONT.body } },
        "Coarctation",
        "CXR, echo, CTA/MRA",
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [3.8, 2.6, 2.8],
      rowH: [0.35, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 9.5, valign: "middle",
    });
  }

  // 7. Resistant HTN
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 7, totalSlides: TOTAL,
      title: "Resistant hypertension workup",
      subtitle: "True resistant HTN ≠ pseudo-resistant. Rule out the latter first.",
      source: "AHA 2018 Resistant HTN scientific statement. PATHWAY-2.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.warn,
      header: "PSEUDO-RESISTANT (check first)", body: "",
    });
    s.addText(bulletBlock([
      "Non-adherence (the #1 cause)",
      "White-coat effect — confirm with home/ambulatory BP",
      "Sub-optimal drug dosing (not titrated to max)",
      "Wrong cuff size; improper technique",
      "Volume overload (high Na diet, inadequate diuretic)",
      "Interfering substances: NSAIDs, OCPs, pseudoephedrine, alcohol, stimulants, herbal",
      { text: "If ruled out → true resistant; now pursue secondary workup", bold: true, color: PALETTE.warn },
    ], { fontSize: 10.5, paraSpaceAfter: 4 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "TRUE RESISTANT HTN  —  STEPS", body: "",
    });
    s.addText(bulletBlock([
      "Definition: BP > 130/80 on 3 maximized meds (incl. diuretic); OR controlled on 4 meds",
      { text: "Step 1: add spironolactone 25 mg (PATHWAY-2: best in resistant HTN)", bold: true, color: PALETTE.primary },
      "Check K+ at 2 weeks; titrate to 50 mg if tolerated",
      { text: "Step 2: work up secondary HTN comprehensively", bold: true, color: PALETTE.primary },
      "Step 3: add β-blocker, central α agonist, hydralazine",
      "Renal denervation (investigational, limited) — SPYRAL/RADIANCE trials",
      "Consider direct-acting vasodilators, nitroprusside only in crisis",
    ], { fontSize: 10, paraSpaceAfter: 3 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 8. Landmark trials
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 8, totalSlides: TOTAL,
      title: "Landmark HTN trials",
      subtitle: "The RCTs that set modern targets and drug choices.",
      source: "Full citations on references slide.",
    });

    const rows = [
      [
        { text: "Trial", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center" } },
        { text: "Year", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center" } },
        { text: "Takeaway", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary } } },
      ],
      ["ALLHAT",       "2002", "Chlorthalidone as good as ACEi or CCB for HTN — cheaper first-line option."],
      ["HOPE",         "2000", "Ramipril ↓ CV events in high-risk non-HTN patients — BP-independent benefit."],
      ["ACCORD-BP",    "2010", "Intensive BP (< 120) in T2DM — no CV benefit, more AE. Called SPRINT into question."],
      ["SPRINT",       "2015", "SBP < 120 (by AOBP) ↓ CV 25% and mortality 27% vs < 140 in non-DM high-risk."],
      ["PATHWAY-2",    "2015", "Spironolactone > bisoprolol, doxazosin for resistant HTN. NNT = 4."],
      ["HOT",          "1998", "DBP target: < 80 = < 85 = < 90 in most, but DM benefited from < 80."],
      ["SYST-EUR",     "1997", "CCB reduced stroke in elderly isolated systolic HTN."],
      ["STEP",         "2021", "Intensive (< 130) vs standard (< 150) in elderly Chinese — 26% ↓ CV events."],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [1.5, 0.8, 6.9],
      rowH: [0.35, 0.4, 0.4, 0.4, 0.45, 0.4, 0.4, 0.4, 0.4],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 10, valign: "middle",
    });
  }

  // 9. Common pitfalls
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 9, totalSlides: TOTAL,
      title: "Common clinic mistakes",
      subtitle: "The errors that lead to under-control or over-treatment.",
      source: "Premier Nephrology teaching guide.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.danger,
      header: "AVOID", headerColor: PALETTE.danger, body: "",
    });
    s.addText(bulletBlock([
      "Escalating from one office reading",
      "Prescribing without home BP log",
      "Ignoring adherence",
      "ACEi + ARB (ONTARGET)",
      "Thiazide at eGFR < 30",
      "Blaming ACEi for 10% Cr rise",
      "Missing OSA, NSAIDs, decongestants",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "DO INSTEAD", headerColor: PALETTE.good, body: "",
    });
    s.addText(bulletBlock([
      "7-day home log first",
      "Pill count + open adherence Qs",
      "Check cuff size + technique",
      "One RAAS blocker, max dose",
      "Loop if eGFR < 30",
      "Accept Cr ↑ up to 30% on ACEi",
      "Always ask about OSA + OTCs",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 5.4, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
  }



  // Clinical case — question
  addCaseQuestionSlide(pres, {
    topic: TOPIC, slideNumber: 10, totalSlides: TOTAL,
    vignette: "A 52-year-old woman with T2DM, BMI 33, snoring. On lisinopril 40, HCTZ 25, amlodipine 10, metoprolol 50 BID. Office BP today 152/92 (Korotkoff, repeat 150/90). Home BP log: 148/88 to 155/94 am, 140/85 pm. Adherent by pill-count. K+ 3.4, spontaneously.",
    question: "Is this resistant HTN? What's the most likely secondary cause and next step?",
  });

  // Clinical case — answer
  addCaseAnswerSlide(pres, {
    topic: TOPIC, slideNumber: 11, totalSlides: TOTAL,
    answer: "Yes (uncontrolled on 3 appropriate agents incl. diuretic). Primary aldosteronism — spontaneous hypokalemia + resistant HTN. Check aldosterone/renin ratio (morning, off MRA 4 wk).",
    teaching: "True resistant HTN requires 3 appropriately-dosed agents including a diuretic. Before adding a 4th drug, always work up secondary causes. Primary aldosteronism is the #1 secondary cause in resistant HTN, especially if spontaneous or diuretic-exaggerated hypokalemia. Testing: aldosterone/renin ratio AM, ideally off MRA × 4 weeks when safe. Other secondary causes: OSA (she snores!), RAS (younger women → FMD), pheo, Cushing, CKD, CoA. Next step after workup: add spironolactone 25 mg (PATHWAY-2 NNT 4 for resistant HTN). Also: weight loss, sleep study.",
  });

  // 11. References
  addReferencesSlide(pres, {
    topic: "Hypertension",
    references: {
      guidelines: [
        "ACC/AHA 2017 Hypertension Guideline (+ 2025 update)",
        "KDIGO 2021 Blood Pressure in CKD",
        "Endocrine Society 2016/2025 Primary Aldosteronism",
        "AHA 2018 Resistant Hypertension Scientific Statement",
        "AHA 2019 BP Measurement in Humans",
      ],
      trials: [
        "ALLHAT — JAMA 2002",
        "HOPE — NEJM 2000",
        "ACCORD-BP — NEJM 2010",
        "SPRINT — NEJM 2015",
        "PATHWAY-2 — Lancet 2015",
        "HOT — Lancet 1998",
        "SYST-EUR — Lancet 1997",
        "STEP — NEJM 2021",
      ],
    },
    uptodateTopics: [
      "Overview of hypertension in adults",
      "Choice of drug therapy in primary (essential) hypertension",
      "Evaluation of resistant hypertension",
      "Primary aldosteronism: screening and diagnosis",
      "Ambulatory and home blood pressure monitoring",
    ],
  });

  const outPath = path.resolve(__dirname, "../../decks/08-Hypertension.pptx");
  await pres.writeFile({ fileName: outPath });
  console.log("Wrote:", outPath);
}

build().catch(e => { console.error(e); process.exit(1); });
