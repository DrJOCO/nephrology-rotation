// Diabetic Kidney Disease teaching deck
const pptxgen = require("pptxgenjs");
const path = require("path");
const {
  PALETTE, FONT, addCoverSlide, newContentSlide, addCard, addPearlBox,
  addReferencesSlide, bulletBlock,
  addCaseSlide, addCaseQuestionSlide, addCaseAnswerSlide,
} = require("./deckStyle.cjs");

const TOPIC = "Diabetic Kidney Disease";
const TOTAL = 12;

async function build() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Dr. Cheng";
  pres.title = TOPIC;

  addCoverSlide(pres, {
    topic: "Diabetic Kidney Disease",
    subtitle: "The four-pillar therapy",
    tagline: "DKD is the #1 cause of end-stage kidney disease (ESKD). Every pillar in place at every visit.",
  });


  // 2. Why matters + pearl
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 2, totalSlides: TOTAL,
      title: "Why it matters",
      subtitle: "Most common cause of ESKD in the US — and highly modifiable if caught early.",
      source: "KDIGO 2022 Diabetes in CKD. KDIGO 2024 CKD Guideline.",
    });
    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "WHAT THE VISIT COVERS", body: "",
    });
    s.addText(bulletBlock([
      "Confirm DKD (not another CKD cause)",
      "Annual UACR + eGFR in all diabetics",
      "4 pillars: ACEi/ARB, SGLT2i, finerenone, GLP-1 RA",
      "A1c 7–8% individualized",
      "SBP < 120 (AOBP)",
      "Statin + lifestyle",
      "Transplant planning by eGFR trend",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
    addPearlBox(s, {
      x: 5.2, y: 1.4, w: 4.4, h: 3.6,
      label: "TEACHING PEARL",
      body: "Not all CKD in DM is DKD. Red flags: active sediment, rapid decline > 5 mL/min/yr, no retinopathy, short DM, abrupt nephrotic proteinuria. Biopsy when atypical.",
    });
  }

  // 3. Diagnosis
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 3, totalSlides: TOTAL,
      title: "Diagnosing DKD — pattern recognition",
      subtitle: "Triad: proteinuria + bland sediment + retinopathy + longstanding DM.",
      source: "KDIGO 2022 Diabetes in CKD. American Diabetes Association (ADA) 2026 Standards of Care.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "SUPPORTS DKD", headerColor: PALETTE.good, body: "",
    });
    s.addText(bulletBlock([
      "Long-standing diabetes (T1DM ≥ 10 yr; T2DM any duration)",
      "Gradual albuminuria (A2 → A3) followed by eGFR decline",
      "Bland UA (no RBC casts, minimal hematuria)",
      "Retinopathy present (esp. in T1DM)",
      "Other microvascular complications (neuropathy)",
      "Slow eGFR decline (2–5 mL/min/yr)",
    ], { fontSize: 11, paraSpaceAfter: 5 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.danger,
      header: "RED FLAGS FOR ALTERNATIVE DX", headerColor: PALETTE.danger, body: "",
    });
    s.addText(bulletBlock([
      "Active sediment: RBC casts, dysmorphic RBCs",
      "Rapid decline > 5 mL/min/yr",
      "No retinopathy in T1DM with proteinuria",
      "Proteinuria appears < 5 yr after T1DM diagnosis",
      "Abrupt nephrotic-range proteinuria",
      "Systemic features: rash, arthritis, hemoptysis",
      { text: "Consider biopsy when these are present", bold: true, color: PALETTE.danger },
    ], { fontSize: 11, paraSpaceAfter: 5 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 4. Four pillars
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 4, totalSlides: TOTAL,
      title: "The four pillars",
      subtitle: "Sequential, but aim to have all four in place when appropriate.",
      source: "KDIGO 2022 Diabetes in CKD. CREDENCE, DAPA-CKD, EMPA-KIDNEY, FIDELIO, FLOW.",
    });

    const pillars = [
      {
        title: "1.  ACEi / ARB",
        color: PALETTE.primary,
        items: [
          "First-line for albuminuria",
          "Titrate to max dose",
          "Accept Cr ↑ up to 30%",
          "Hold if K > 5.5",
        ],
      },
      {
        title: "2.  SGLT2 INHIBITOR",
        color: PALETTE.good,
        items: [
          "Dapa or empa 10 mg daily",
          "Start at eGFR ≥ 20",
          "Expect early eGFR dip — don't stop",
          "DKA watch (T1DM, sick days)",
        ],
      },
      {
        title: "3.  FINERENONE",
        color: PALETTE.accent,
        items: [
          "T2DM + CKD; K ≤ 5.0 at start",
          "10 mg if eGFR 25 to < 60",
          "20 mg if eGFR ≥ 60",
          "Additive to ACEi/ARB + SGLT2i",
        ],
      },
      {
        title: "4.  GLP-1 RA",
        color: PALETTE.secondary,
        items: [
          "Semaglutide 1.0 mg SQ weekly",
          "Kidney + CV benefit (FLOW 2024)",
          "Weight loss + glycemic bonus",
          "GI AEs — titrate slowly",
        ],
      },
    ];

    pillars.forEach((p, i) => {
      const row = Math.floor(i / 2), col = i % 2;
      const x = 0.4 + col * 4.65, y = 1.4 + row * 1.85;
      addCard(s, { x, y, w: 4.5, h: 1.7, accent: p.color, header: p.title, headerColor: p.color, body: "" });
      s.addText(bulletBlock(p.items, { fontSize: 9.5, paraSpaceAfter: 2 }), {
        x: x + 0.2, y: y + 0.4, w: 4.25, h: 1.25, margin: 0, valign: "top",
      });
    });
  }

  // 5. Glycemic control
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 5, totalSlides: TOTAL,
      title: "Glycemic control in CKD",
      subtitle: "Individualized targets. Hypoglycemia risk rises as eGFR falls.",
      source: "ADA 2026 Standards of Care. KDIGO 2022 Diabetes in CKD.",
    });

    const rows = [
      [
        { text: "Scenario", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "A1c target", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Notes", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
      ],
      [
        { text: "Young, short DM, low hypoglycemia risk", options: { fontFace: FONT.body } },
        "< 7%",
        "Tight control — early preserves nephrons",
      ],
      [
        { text: "Established DKD, moderate comorbid", options: { fontFace: FONT.body } },
        "7.0–7.5%",
        "Balance benefit vs hypoglycemia risk",
      ],
      [
        { text: "Advanced CKD (eGFR < 30), elderly, hx hypoglycemia", options: { fontFace: FONT.body } },
        "7.5–8%",
        "Watch insulin accumulation; prefer short-acting",
      ],
      [
        { text: "Dialysis, high hypoglycemia risk", options: { fontFace: FONT.body } },
        "8–8.5%",
        "A1c unreliable (anemia, transfusion); use continuous glucose monitor (CGM)",
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [3.8, 1.6, 3.8],
      rowH: [0.38, 0.4, 0.45, 0.5, 0.45],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 10.5, valign: "middle",
    });

    s.addShape("rect", {
      x: 0.4, y: 3.7, w: 9.2, h: 1.3,
      fill: { color: PALETTE.ice }, line: { color: PALETTE.secondary, width: 0.5 },
    });
    s.addText([
      { text: "Drugs that need adjustment as eGFR falls: ", options: { bold: true, color: PALETTE.primary } },
      { text: "  • Metformin: stop at eGFR < 30; dose-reduce 30–45  • Sulfonylureas: glipizide preferred (no renal clearance); avoid glyburide  • Insulin: doses often need reduction by 25–50% as eGFR < 30  • dipeptidyl peptidase-4 (DPP-4): OK but dose adjust (except linagliptin)  • SGLT2i: start at ≥ 20, continue to KRT  • GLP-1 RA: OK across eGFR range  • Pioglitazone: avoid if HF risk." },
    ], {
      x: 0.6, y: 3.8, w: 8.8, h: 1.15,
      fontFace: FONT.body, fontSize: 10, color: PALETTE.charcoal, margin: 0, valign: "top",
    });
  }

  // 6. Blood pressure
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 6, totalSlides: TOTAL,
      title: "BP, lipids, and CV risk",
      subtitle: "DKD patients die from CV disease more often than ESKD.",
      source: "KDIGO 2021 BP in CKD. KDIGO lipid recommendations.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "BLOOD PRESSURE", body: "",
    });
    s.addText(bulletBlock([
      "Target SBP < 120 by AOBP (KDIGO 2021)",
      "Home BP < 125/75 average (lower than office)",
      "First-line: ACEi/ARB (dual purpose)",
      "Add: thiazide-like if eGFR ≥ 30; loop if < 30; DHP CCB as needed",
      "Resistant: add spironolactone or finerenone",
      { text: "Avoid dual renin-angiotensin-aldosterone system (RAAS) (ONTARGET — harm)", bold: true, color: PALETTE.danger },
      "Salt restriction < 2 g Na/day",
    ], { fontSize: 10.5, paraSpaceAfter: 4 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "LIPIDS + CV", body: "",
    });
    s.addText(bulletBlock([
      "Diabetes age 40–75: at least moderate-intensity statin",
      "CKD and high ASCVD risk → high-intensity or add-on therapy when indicated",
      { text: "SHARP: statin + ezetimibe ↓ atherosclerotic events in CKD (not dialysis-specific benefit)", bold: true },
      "Lipid panel annually; LDL < 70 aggressive in ASCVD",
      "Smoking cessation > any drug for CV reduction",
      "Aspirin only if established ASCVD (not primary prevention in CKD)",
      "Vaccinate: flu, COVID, pneumococcal (PCV20 alone, OR PCV15 → PPSV23 — ACIP 2024), HBV",
    ], { fontSize: 10, paraSpaceAfter: 3 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 7. Monitoring
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 7, totalSlides: TOTAL,
      title: "Monitoring and escalation",
      subtitle: "Visit cadence, labs, and when to refer.",
      source: "KDIGO 2024 CKD Guideline. NKF KFRE (Kidney Failure Risk Equation).",
    });

    const rows = [
      [
        { text: "Stage / risk", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Visit cadence", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Labs", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
      ],
      [
        { text: "Low risk  (G1–2, A1)", options: { bold: true, color: PALETTE.good, fontFace: FONT.body } },
        "Annual",
        "BMP, UACR, A1c, lipid",
      ],
      [
        { text: "Moderate  (G1–2, A2 or G3a, A1)", options: { bold: true, color: PALETTE.warn, fontFace: FONT.body } },
        "Every 6 mo",
        "+ CBC, bicarb, PO4, PTH if stage 3",
      ],
      [
        { text: "High  (G3a/A2, G3b/A1)", options: { bold: true, color: PALETTE.accent, fontFace: FONT.body } },
        "Every 3–4 mo",
        "+ Hgb, ferritin / TSAT, vit D, Ca",
      ],
      [
        { text: "Very high  (G3b+/A2+ or G4)", options: { bold: true, color: PALETTE.danger, fontFace: FONT.body } },
        "Every 3 mo or less",
        "All of above; kidney failure risk (KFRE)",
      ],
      [
        { text: "G4–5", options: { bold: true, color: PALETTE.danger, fontFace: FONT.body } },
        "Monthly if accelerating",
        "Modality education, transplant referral, access planning",
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [2.8, 2.2, 4.2],
      rowH: [0.38, 0.4, 0.45, 0.45, 0.5, 0.5],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 10, valign: "middle",
    });
  }

  // 8. Landmark trials
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 8, totalSlides: TOTAL,
      title: "Landmark DKD trials",
      subtitle: "The four-pillar story in chronological order.",
      source: "Full citations on references slide.",
    });

    const rows = [
      [
        { text: "Trial", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center" } },
        { text: "Year", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center" } },
        { text: "Takeaway", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary } } },
      ],
      ["Captopril Trial",   "1993", "T1DM: captopril ↓ doubling Cr 48%. Foundation of RAAS in DKD."],
      ["RENAAL",            "2001", "T2DM: losartan ↓ ESKD/doubling Cr 25%."],
      ["IDNT",              "2001", "T2DM: irbesartan ↓ progression 20–23%."],
      ["ONTARGET",          "2008", "Dual RAAS harmful — never combine ACEi + ARB."],
      ["CREDENCE",          "2019", "Canagliflozin ↓ ESKD/doubling Cr/renal-CV death 30% in T2DM + CKD."],
      ["DAPA-CKD",          "2020", "Dapagliflozin ↓ kidney failure 39% across DM + non-DM CKD."],
      ["EMPA-KIDNEY",       "2023", "Empagliflozin ↓ CKD progression 28% across eGFR 20–90."],
      ["FIDELIO-DKD",       "2020", "Finerenone ↓ CKD progression 18% on max RAAS."],
      ["FIGARO-DKD",        "2021", "Finerenone ↓ CV events 13%, HF hosp 29%."],
      ["FLOW",              "2024", "Semaglutide ↓ kidney disease progression 24% in T2DM + CKD."],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [1.8, 0.8, 6.6],
      rowH: [0.35, 0.36, 0.36, 0.36, 0.36, 0.36, 0.36, 0.36, 0.36, 0.36, 0.36],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 9.5, valign: "middle",
    });
  }

  // 9. Pitfalls
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 9, totalSlides: TOTAL,
      title: "Common DKD clinic mistakes",
      subtitle: "The pillars left out, the drugs given wrong.",
      source: "Premier Nephrology teaching guide.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.danger,
      header: "AVOID", headerColor: PALETTE.danger, body: "",
    });
    s.addText(bulletBlock([
      "Skipping annual UACR",
      "Stopping RAAS for 20% Cr rise",
      "Withholding SGLT2i at low eGFR",
      "Metformin at eGFR < 30",
      "Dual RAAS blockade",
      "No retinopathy screen",
      "Late nephrology referral",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "DO INSTEAD", headerColor: PALETTE.good, body: "",
    });
    s.addText(bulletBlock([
      "Annual UACR + eGFR together",
      "Accept Cr ↑ up to 30% on RAAS",
      "SGLT2i at eGFR ≥ 20; continue to KRT",
      "Stop metformin < 30; halve 30–45",
      "Max-titrate one RAAS",
      "Retina referral yearly",
      "Refer neph at G3b–A3 or G4",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 5.4, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
  }



  // Clinical case — question
  addCaseQuestionSlide(pres, {
    topic: TOPIC, slideNumber: 10, totalSlides: TOTAL,
    vignette: "A 45-year-old woman with T2DM × 12 yr, proliferative retinopathy (post-laser), A1c 8.4%, BP 142/88 home avg. Meds: metformin 1 g BID, glipizide 10 mg, lisinopril 20 mg, HCTZ 12.5 mg. Labs: eGFR 42, UACR 580, K+ 4.5, Hb 11.2, LDL 118 (on no statin).",
    question: "Audit her DKD care — what are the top 4 things missing?",
  });

  // Clinical case — answer
  addCaseAnswerSlide(pres, {
    topic: TOPIC, slideNumber: 11, totalSlides: TOTAL,
    answer: "(1) Lisinopril at SUB-maximal dose (should be 40), (2) No SGLT2i (start dapagliflozin 10 mg — eGFR qualifies), (3) No finerenone (eligible: K+ 4.5, eGFR 25-60 → start 10 mg), (4) No statin (start moderate-to-high intensity).",
    teaching: "Classic DKD presentation with retinopathy — diagnosis secure. All 4 pillars should be ON when eligible: ACEi/ARB max dose, SGLT2i, finerenone, GLP-1 RA. The retinopathy supports microvascular disease, but keep an eye out for atypical features. Titrate lisinopril to 40 (accept Cr rise to 30%). Start SGLT2i at eGFR ≥ 20. Finerenone 10 mg with K+ recheck in 1 month. GLP-1 RA (semaglutide 1 mg weekly per FLOW) adds kidney and CV benefit, also helps A1c and weight. Statin: diabetes age 40-75 is already an indication; CKD pushes intensity higher. BP target SBP < 120 when measured by standardized AOBP and tolerated. A1c 7-8% range given CKD.",
  });

  // 11. References
  addReferencesSlide(pres, {
    topic: "Diabetic Kidney Disease",
    references: {
      guidelines: [
        "KDIGO 2022 Diabetes in CKD",
        "KDIGO 2024 CKD Guideline",
        "KDIGO 2021 BP in CKD",
        "ADA 2026 Standards of Care",
        "ACC/AHA guidelines for CV in CKD",
      ],
      trials: [
        "Captopril Trial — NEJM 1993",
        "RENAAL — NEJM 2001",
        "IDNT — NEJM 2001",
        "ONTARGET — NEJM 2008",
        "CREDENCE — NEJM 2019",
        "DAPA-CKD — NEJM 2020",
        "EMPA-KIDNEY — NEJM 2023",
        "FIDELIO-DKD — NEJM 2020",
        "FIGARO-DKD — NEJM 2021",
        "FLOW — NEJM 2024",
      ],
    },
    uptodateTopics: [
      "Diabetic kidney disease: Manifestations, evaluation, and diagnosis",
      "Treatment of diabetic kidney disease",
      "SGLT2 inhibitors in CKD",
      "Mineralocorticoid receptor antagonists in CKD",
      "GLP-1 receptor agonists in CKD",
    ],
  });

  const outPath = path.resolve(__dirname, "../../decks/12-DKD.pptx");
  await pres.writeFile({ fileName: outPath });
  console.log("Wrote:", outPath);
}

build().catch(e => { console.error(e); process.exit(1); });
