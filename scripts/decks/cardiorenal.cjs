// Cardiorenal Syndrome teaching deck
const pptxgen = require("pptxgenjs");
const path = require("path");
const {
  PALETTE, FONT, addCoverSlide, newContentSlide, addCard, addPearlBox,
  addReferencesSlide, bulletBlock,
  addCaseSlide, addCaseQuestionSlide, addCaseAnswerSlide,
} = require("./deckStyle.cjs");

const TOPIC = "Cardiorenal Syndrome";
const TOTAL = 12;

async function build() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Dr. Cheng";
  pres.title = TOPIC;

  addCoverSlide(pres, {
    topic: "Cardiorenal Syndrome",
    subtitle: "Decongestion, not cosmetic creatinine watching",
    tagline: "Cr rise during decongestion is usually hemodynamic — under-diuresing is the bigger danger.",
  });


  // 2. Why consulted + pearl
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 2, totalSlides: TOTAL,
      title: "Why we get consulted",
      subtitle: "Rising Cr during diuresis — 'should we back off?'",
      source: "ACC/AHA 2022 HF guideline. UpToDate: Cardiorenal syndrome (2026).",
    });
    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "CONSULT TRIGGERS", body: "",
    });
    s.addText(bulletBlock([
      "Rising Cr during HF decongestion",
      "Diuretic resistance",
      "Hypotension limiting GDMT",
      "Refractory volume overload",
      "KRT for volume (rare)",
      "Ultrafiltration request",
      "Balancing RAAS / SGLT2i in CKD+HF",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
    addPearlBox(s, {
      x: 5.2, y: 1.4, w: 4.4, h: 3.6,
      label: "TEACHING PEARL",
      body: "Cr bump during active decongestion (weight down, BNP down, hct up) is benign hemodynamic. Under-diuresis is worse than a 20–30% Cr rise.",
    });
  }

  // 3. Ronco classification
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 3, totalSlides: TOTAL,
      title: "Ronco classification (Types 1–5)",
      subtitle: "Useful framework but don't get hung up — Type 1 and 2 are where the action is.",
      source: "Ronco et al. JACC 2008.",
    });

    const rows = [
      [
        { text: "Type", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, align: "center" } },
        { text: "Name", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Scenario", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
      ],
      [
        { text: "1", options: { bold: true, color: PALETTE.accent, align: "center", fontFace: FONT.title, fontSize: 20 } },
        "Acute cardiorenal",
        "Acute decompensated HF → AKI.  The inpatient consult.",
      ],
      [
        { text: "2", options: { bold: true, color: PALETTE.primary, align: "center", fontFace: FONT.title, fontSize: 20 } },
        "Chronic cardiorenal",
        "Chronic HF → CKD.  The outpatient problem.",
      ],
      [
        { text: "3", options: { bold: true, color: PALETTE.secondary, align: "center", fontFace: FONT.title, fontSize: 20 } },
        "Acute renocardiac",
        "AKI → cardiac dysfunction (volume overload, K+, acidosis → arrhythmia).",
      ],
      [
        { text: "4", options: { bold: true, color: PALETTE.secondary, align: "center", fontFace: FONT.title, fontSize: 20 } },
        "Chronic renocardiac",
        "CKD → CV disease (accelerated atherosclerosis, LVH, CKD-MBD).",
      ],
      [
        { text: "5", options: { bold: true, color: PALETTE.warn, align: "center", fontFace: FONT.title, fontSize: 20 } },
        "Secondary",
        "Systemic process hits both (sepsis, amyloid, SLE, DM, sarcoid).",
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [0.9, 2.2, 6.1],
      rowH: [0.38, 0.5, 0.5, 0.55, 0.55, 0.55],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 10.5, valign: "middle",
    });
  }

  // 4. Hemodynamic mechanisms
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 4, totalSlides: TOTAL,
      title: "Why the kidney fails in HF",
      subtitle: "It's not just low forward flow — venous congestion is the bigger driver.",
      source: "Mullens et al. JACC 2009. UpToDate: Cardiorenal syndrome.",
    });

    const cards = [
      { color: PALETTE.accent, title: "VENOUS CONGESTION  (main driver)",
        body: "Elevated CVP → ↑ renal venous pressure → ↓ net filtration pressure. Strong correlation with AKI in acute decompensated heart failure (ADHF). Decongestion restores GFR even if cardiac output unchanged." },
      { color: PALETTE.primary, title: "LOW CARDIAC OUTPUT",
        body: "Falls primary role. Most HF patients presenting with AKI have normal or near-normal CO. Relevant in cardiogenic shock." },
      { color: PALETTE.good, title: "NEUROHORMONAL ACTIVATION",
        body: "RAAS, sympathetic, vasopressin → Na/water retention + efferent vasoconstriction. ACEi/ARB/ARNi improve outcomes; a small hemodynamic Cr rise can be acceptable." },
      { color: PALETTE.secondary, title: "INFLAMMATION + DRUGS",
        body: "Pro-inflammatory cytokines; NSAIDs, diuretic over-dose, contrast, sepsis overlay the primary problem." },
    ];
    cards.forEach((c, i) => {
      const row = Math.floor(i / 2), col = i % 2;
      const x = 0.4 + col * 4.65, y = 1.4 + row * 1.85;
      addCard(s, { x, y, w: 4.5, h: 1.7, accent: c.color, header: c.title, body: c.body });
    });
  }

  // 5. Decongestion strategy
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 5, totalSlides: TOTAL,
      title: "Decongestion — the strategy that works",
      subtitle: "Loop first, sequential nephron blockade if stuck. Watch markers, not just Cr.",
      source: "DOSE (NEJM 2011). CLOROTIC (JAMA Intern Med 2023). ACC/AHA 2022 HF.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "STEP-UP DIURETICS", body: "",
    });
    s.addText(bulletBlock([
      { text: "IV loop at 2.5× home oral dose (DOSE)", bold: true, color: PALETTE.primary },
      "Furosemide 40–80 mg IV q12h or continuous infusion",
      "Target: ≥ 3 L/24 h UOP; weight down 1–2 kg/day",
      "If UOP < 100 mL in 2 h → double dose",
      { text: "Stuck? Add thiazide (metolazone 2.5–10 mg or HCTZ / chlorothiazide) — CLOROTIC: faster decongestion", bold: true },
      "Add acetazolamide 500 mg IV daily (ADVOR) — augments natriuresis, corrects bicarb rise",
      "Last: ultrafiltration (NOT first-line; CARRESS-HF)",
    ], { fontSize: 10, paraSpaceAfter: 3 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "MARKERS OF EFFECTIVE DECONGESTION", body: "",
    });
    s.addText(bulletBlock([
      "Daily weight ↓ 0.5–1.5 kg",
      "Rising hematocrit (hemoconcentration = good)",
      "BNP / NT-proBNP trending down",
      "Improving pulmonary exam, saturations, orthopnea",
      "JVP lower; reducing edema",
      "Urine Na > 50 mEq/L within 2 h of loop (good natriuretic response)",
      { text: "Modest Cr rise OK if all above trending right", bold: true, color: PALETTE.good },
    ], { fontSize: 10.5, paraSpaceAfter: 4 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 6. When Cr rises
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 6, totalSlides: TOTAL,
      title: "Creatinine up — what does it mean?",
      subtitle: "Context decides whether it's good, neutral, or a problem.",
      source: "Mullens et al. JACC 2009. Damman et al. JACC 2013.",
    });

    const rows = [
      [
        { text: "Scenario", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Interpretation", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Action", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
      ],
      [
        { text: "Cr ↑ 10–30% during active decongestion with weight loss + BNP down", options: { fontFace: FONT.body } },
        { text: "Hemodynamic; often protective", options: { italic: true, color: PALETTE.good } },
        "CONTINUE diuresis; do NOT hold ACEi/ARB",
      ],
      [
        { text: "Cr ↑ with weight UP, worsening exam, rising BNP", options: { fontFace: FONT.body } },
        { text: "Inadequate decongestion → worse perfusion", options: { italic: true, color: PALETTE.accent } },
        "ESCALATE diuretics (sequential blockade)",
      ],
      [
        { text: "Cr ↑ with hypotension, oliguria, lactate up", options: { fontFace: FONT.body } },
        { text: "Low output / shock", options: { italic: true, color: PALETTE.danger } },
        "Reduce diuresis; consider inotropes, cath lab",
      ],
      [
        { text: "Cr ↑ > 30%, abrupt, bland UA", options: { fontFace: FONT.body } },
        { text: "Over-diuresis / prerenal", options: { italic: true, color: PALETTE.warn } },
        "Pause loop, gentle albumin or NS, reassess volume",
      ],
      [
        { text: "Cr ↑ + active sediment / proteinuria", options: { fontFace: FONT.body } },
        { text: "Intrinsic AKI — search", options: { italic: true, color: PALETTE.accent } },
        "Workup: ATN, GN, nephrotoxins, contrast",
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [3.5, 2.7, 3.0],
      rowH: [0.38, 0.5, 0.5, 0.5, 0.5, 0.5],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 9.5, valign: "middle",
    });
  }

  // 7. GDMT in CKD
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 7, totalSlides: TOTAL,
      title: "GDMT in CKD — keep it on",
      subtitle: "Patients with HF and CKD benefit MORE from GDMT than those without CKD.",
      source: "DAPA-HF, EMPEROR-Reduced/Preserved, FIDELIO-DKD, FIGARO-DKD, PARADIGM-HF.",
    });

    const rows = [
      [
        { text: "Agent", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "When to continue / start", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Stop / hold", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
      ],
      [
        { text: "ACEi / ARB / angiotensin-neprilysin inhibitor (ARNi)", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Continue through 20–30% Cr rise; essential in HFrEF + CKD",
        "K+ > 5.5 after binder, symptomatic hypotension, pregnancy",
      ],
      [
        { text: "Beta-blocker (HFrEF)", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Continue through decongestion; down-titrate if shock",
        "Severe bradycardia; cardiogenic shock",
      ],
      [
        { text: "MRA (spiro / epler) — HFrEF / heart failure with preserved ejection fraction (HFpEF)", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "eGFR ≥ 30, K+ ≤ 5.0. Monitor q1–2 wk after start",
        "K+ > 5.5; severe CKD without binder",
      ],
      [
        { text: "SGLT2i", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Start at eGFR ≥ 20 (DAPA-HF, EMPEROR); continue to KRT",
        "Acute illness, DKA risk in T1DM",
      ],
      [
        { text: "Finerenone (DKD)", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "T2DM + CKD; additive to ACEi/ARB + SGLT2i",
        "K+ > 5.0 at start; adjust per eGFR",
      ],
      [
        { text: "Loop diuretic", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Titrate to euvolemia; pre-discharge regimen PO equivalent",
        "Over-diuresed / volume-depleted",
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [2.0, 3.6, 3.6],
      rowH: [0.35, 0.45, 0.45, 0.45, 0.45, 0.45, 0.45],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 9.5, valign: "middle",
    });
  }

  // 8. Landmark trials
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 8, totalSlides: TOTAL,
      title: "Landmark trials shaping cardiorenal practice",
      subtitle: "What to do when Cr rises during HF treatment.",
      source: "Full citations on references slide.",
    });

    const rows = [
      [
        { text: "Trial", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center" } },
        { text: "Year", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center" } },
        { text: "Takeaway", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary } } },
      ],
      ["DOSE",           "2011", "Low-dose vs high-dose loops, bolus vs continuous — high-dose = better decongestion, similar AKI."],
      ["CARRESS-HF",     "2012", "Ultrafiltration NOT superior to stepped diuretics; more AEs. Diuretics first-line."],
      ["CLOROTIC",       "2023", "Add HCTZ to IV loop → faster decongestion and weight loss in ADHF."],
      ["ADVOR",          "2022", "Add IV acetazolamide to loop → greater natriuresis and decongestion."],
      ["DAPA-HF",        "2019", "Dapagliflozin ↓ CV death/HF hosp 26% in HFrEF regardless of DM."],
      ["EMPEROR-Reduced", "2020", "Empagliflozin ↓ CV death/HF hosp 25% in HFrEF."],
      ["EMPEROR-Preserved", "2021", "SGLT2i benefit extends to HFpEF."],
      ["FIDELIO / FIGARO", "2020–21", "Finerenone ↓ CV and kidney events in DKD."],
      ["PARADIGM-HF",    "2014", "Sacubitril/valsartan > enalapril in HFrEF; benefit in CKD subgroups."],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [2.0, 0.8, 6.4],
      rowH: [0.35, 0.4, 0.45, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 9.5, valign: "middle",
    });
  }

  // 9. Pitfalls
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 9, totalSlides: TOTAL,
      title: "Common pitfalls",
      subtitle: "The biggest errors lead to under-decongestion and re-admission.",
      source: "Premier Nephrology teaching guide.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.danger,
      header: "AVOID", headerColor: PALETTE.danger, body: "",
    });
    s.addText(bulletBlock([
      "Stopping diuretics for 20% Cr rise",
      "Reflexively holding ACEi/ARB",
      "NS boluses in congestion",
      "UF before sequential blockade",
      "No K+ monitoring on MRA",
      "Skipping SGLT2i in HFrEF + CKD",
      "Missing prerenal / hypotension",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "DO INSTEAD", headerColor: PALETTE.good, body: "",
    });
    s.addText(bulletBlock([
      "Decongest if weight / BNP improving",
      "Accept Cr ↑ up to 30% on RAAS",
      "Assess JVP + POCUS IVC",
      "Escalate: loop → thiazide → acetazolamide",
      "K+ weekly on MRA; binder if > 5",
      "SGLT2i when eGFR ≥ 20 and stable",
      "POCUS / CVP to distinguish shock",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 5.4, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
  }



  // Clinical case — question
  addCaseQuestionSlide(pres, {
    topic: TOPIC, slideNumber: 10, totalSlides: TOTAL,
    vignette: "A 66-year-old man with HFrEF (EF 25%) and CKD 3a admitted with ADHF. On furosemide 40 mg PO daily at home, now on 80 mg IV q12h. Day 3: weight down 4 kg, BNP down from 2800 → 1400, crackles improving, hematocrit up from 36 → 40. Cr rose 1.5 → 1.9 (27% increase). Team wants to hold lisinopril, stop furosemide, give albumin.",
    question: "Is this acute kidney injury that needs volume? What do you recommend?",
  });

  // Clinical case — answer
  addCaseAnswerSlide(pres, {
    topic: TOPIC, slideNumber: 11, totalSlides: TOTAL,
    answer: "No — this is hemodynamic Cr rise during effective decongestion. Continue loop diuretic, continue lisinopril. Add acetazolamide or metolazone only if diuresis stalls.",
    teaching: "Rising Cr during active decongestion (weight down, BNP down, rising hct, improving exam) is usually benign and often PROTECTIVE. Stopping diuretics and 'protecting the kidneys' with saline causes reaccumulation of congestion and worse outcomes. Accept Cr rise of 20-30% on ACEi/ARB — it reflects hemodynamic adaptation, not injury. When truly stuck: sequential nephron blockade — add thiazide (CLOROTIC) or acetazolamide (ADVOR). UF is NOT first-line (CARRESS-HF). Start SGLT2i in HFrEF + CKD: dapagliflozin 10 mg (DAPA-HF) or empagliflozin (EMPEROR-Reduced) — down to eGFR 20.",
  });

  // 11. References
  addReferencesSlide(pres, {
    topic: "Cardiorenal Syndrome",
    references: {
      guidelines: [
        "ACC/AHA/HFSA 2022 HF Guideline",
        "KDIGO 2024 CKD Guideline",
        "KDIGO 2022 Diabetes in CKD",
        "ESC 2021/2023 HF Guidelines",
      ],
      trials: [
        "DOSE — NEJM 2011",
        "CARRESS-HF — NEJM 2012",
        "CLOROTIC — JAMA IM 2023",
        "ADVOR — NEJM 2022",
        "DAPA-HF — NEJM 2019",
        "EMPEROR-Reduced — NEJM 2020",
        "EMPEROR-Preserved — NEJM 2021",
        "PARADIGM-HF — NEJM 2014",
        "FIDELIO / FIGARO — NEJM 2020–21",
      ],
    },
    uptodateTopics: [
      "Cardiorenal syndrome: definition, prevalence, diagnosis",
      "Treatment of heart failure with reduced ejection fraction",
      "Diuretic resistance in heart failure",
      "Use of loop diuretics in adults",
    ],
  });

  const outPath = path.resolve(__dirname, "../../decks/11-Cardiorenal.pptx");
  await pres.writeFile({ fileName: outPath });
  console.log("Wrote:", outPath);
}

build().catch(e => { console.error(e); process.exit(1); });
