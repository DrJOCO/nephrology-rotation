// CKD — Chronic Kidney Disease clinic teaching deck
const pptxgen = require("pptxgenjs");
const path = require("path");
const {
  PALETTE, FONT, iconToBase64Png,
  addCoverSlide, newContentSlide, addCard, addPearlBox,
  addReferencesSlide, bulletBlock,
  addCaseSlide, addCaseQuestionSlide, addCaseAnswerSlide,
} = require("./deckStyle.cjs");

const TOPIC = "Chronic Kidney Disease";
const TOTAL = 12;

async function build() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Dr. Cheng";
  pres.title = TOPIC;

  // 1. COVER
  addCoverSlide(pres, {
    topic: "Chronic Kidney Disease",
    subtitle: "Outpatient management — the four pillars",
    tagline: "Dialysis initiation is driven by symptoms and complications, not by eGFR alone.",
  });


  // 2. Why it matters + pearl
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 2, totalSlides: TOTAL,
      title: "Why it matters",
      subtitle: "CKD is common, silent, and modifiable — most of the work is outpatient.",
      source: "KDIGO 2024 Clinical Practice Guideline for Evaluation and Management of CKD.",
    });
    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "WHAT THE CLINIC VISIT COVERS", body: "",
    });
    s.addText(bulletBlock([
      "Stage + cause — eGFR, UACR, trend",
      "Four pillars: ACEi/ARB, SGLT2i, finerenone, GLP-1 RA",
      "BP, volume, K, bicarb",
      "Anemia + CKD-MBD screening",
      "CV risk: statin, lifestyle",
      "Vaccinate: flu, COVID, pneumo, HBV",
      "Modality education by eGFR < 30; transplant referral as eGFR approaches 20",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
    addPearlBox(s, {
      x: 5.2, y: 1.4, w: 4.4, h: 3.6,
      label: "TEACHING PEARL",
      body: "Never chart just an eGFR. CKD is CAUSE + GFR STAGE + ALBUMINURIA. eGFR 55 / UACR 800 beats eGFR 40 / UACR 10 — the risk drives the plan.",
    });
  }

  // 3. Kidney Disease: Improving Global Outcomes (KDIGO) CGA classification
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 3, totalSlides: TOTAL,
      title: "KDIGO: Cause, GFR stage, Albuminuria (CGA)",
      subtitle: "Every CKD patient gets characterized on three axes.",
      source: "KDIGO 2024 CKD Guideline. Use CKD-EPI 2021 (race-free) for eGFR.",
    });

    const rows = [
      [
        { text: "", options: { fill: { color: PALETTE.primaryDark } } },
        { text: "A1  (UACR < 30)", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, align: "center", valign: "middle" } },
        { text: "A2  (UACR 30–300)", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, align: "center", valign: "middle" } },
        { text: "A3  (UACR > 300)", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, align: "center", valign: "middle" } },
      ],
      [
        { text: "G1  (≥ 90)", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "Low", options: { fill: { color: "D8E4C4" }, color: PALETTE.good, bold: true, align: "center" } },
        { text: "Moderate", options: { fill: { color: "F5E4CD" }, color: PALETTE.warn, bold: true, align: "center" } },
        { text: "High", options: { fill: { color: "F4D1D3" }, color: PALETTE.danger, bold: true, align: "center" } },
      ],
      [
        { text: "G2  (60–89)", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "Low", options: { fill: { color: "D8E4C4" }, color: PALETTE.good, bold: true, align: "center" } },
        { text: "Moderate", options: { fill: { color: "F5E4CD" }, color: PALETTE.warn, bold: true, align: "center" } },
        { text: "High", options: { fill: { color: "F4D1D3" }, color: PALETTE.danger, bold: true, align: "center" } },
      ],
      [
        { text: "G3a  (45–59)", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "Moderate", options: { fill: { color: "F5E4CD" }, color: PALETTE.warn, bold: true, align: "center" } },
        { text: "High", options: { fill: { color: "F4D1D3" }, color: PALETTE.danger, bold: true, align: "center" } },
        { text: "Very high", options: { fill: { color: "9B2226" }, color: "FFFFFF", bold: true, align: "center" } },
      ],
      [
        { text: "G3b  (30–44)", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "High", options: { fill: { color: "F4D1D3" }, color: PALETTE.danger, bold: true, align: "center" } },
        { text: "Very high", options: { fill: { color: "9B2226" }, color: "FFFFFF", bold: true, align: "center" } },
        { text: "Very high", options: { fill: { color: "9B2226" }, color: "FFFFFF", bold: true, align: "center" } },
      ],
      [
        { text: "G4  (15–29)", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "Very high", options: { fill: { color: "9B2226" }, color: "FFFFFF", bold: true, align: "center" } },
        { text: "Very high", options: { fill: { color: "9B2226" }, color: "FFFFFF", bold: true, align: "center" } },
        { text: "Very high", options: { fill: { color: "9B2226" }, color: "FFFFFF", bold: true, align: "center" } },
      ],
      [
        { text: "G5  (< 15)", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "Very high", options: { fill: { color: "9B2226" }, color: "FFFFFF", bold: true, align: "center" } },
        { text: "Very high", options: { fill: { color: "9B2226" }, color: "FFFFFF", bold: true, align: "center" } },
        { text: "Very high", options: { fill: { color: "9B2226" }, color: "FFFFFF", bold: true, align: "center" } },
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [1.8, 2.47, 2.47, 2.46],
      rowH: [0.45, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 11, valign: "middle",
    });

    s.addText("Risk categories drive visit cadence, referral, and intensity of therapy. Very-high-risk patients need nephrology follow-up every 3–4 months minimum.", {
      x: 0.4, y: 4.3, w: 9.2, h: 0.6,
      fontFace: FONT.body, fontSize: 10.5, italic: true,
      color: PALETTE.muted, margin: 0,
    });
  }

  // 4. Four pillars of renoprotection
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 4, totalSlides: TOTAL,
      title: "The four pillars of renoprotection",
      subtitle: "For diabetic kidney disease, aim for all four when eligible; non-diabetic CKD uses selected pillars.",
      source: "KDIGO 2024 CKD + 2022 Diabetes in CKD guidelines. DAPA-CKD, EMPA-KIDNEY, FIDELIO, FLOW.",
    });

    const pillars = [
      {
        title: "ACEi / ARB",
        color: PALETTE.primary,
        items: [
          "First-line for UACR > 30",
          "Max tolerated dose",
          "Accept Cr ↑ up to 30%",
          "Hold if K > 5.5",
          "RENAAL, IDNT, Captopril, AASK",
        ],
      },
      {
        title: "SGLT2 INHIBITOR",
        color: PALETTE.good,
        items: [
          "Dapa or empa 10 mg daily",
          "Start at eGFR ≥ 20; continue to KRT",
          "Benefit independent of DM",
          "Expect eGFR dip ~4 mL/min",
          "DAPA-CKD, EMPA-KIDNEY, CREDENCE",
        ],
      },
      {
        title: "FINERENONE",
        color: PALETTE.accent,
        items: [
          "Non-steroidal MRA; T2DM + albuminuric CKD",
          "10 mg if eGFR 25–<60; 20 mg if ≥60",
          "K+ ≤ 5.0 at start",
          "Additive to ACEi/ARB + SGLT2i",
          "FIDELIO, FIGARO",
        ],
      },
      {
        title: "GLP-1 RA",
        color: PALETTE.secondary,
        items: [
          "Semaglutide 1.0 mg SQ weekly",
          "T2DM + CKD with CV/kidney risk",
          "Weight loss bonus",
          "FLOW (2024) — 24% RRR",
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

  // 5. Must-ask history + labs
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 5, totalSlides: TOTAL,
      title: "Must-ask history and must-do labs",
      subtitle: "The backbone of every CKD visit.",
      source: "KDIGO 2024 CKD guideline. KDOQI commentary.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "MUST-ASK HISTORY", body: "",
    });
    s.addText(bulletBlock([
      "Cause: DM, HTN, GN, PKD, stones, obstruction",
      "Home BP log (AM + PM readings)",
      "Weight changes / edema / dyspnea on exertion",
      "Urinary symptoms: frothy, hematuria, nocturia",
      "OTC and supplements: NSAIDs, PPIs, herbal",
      "Diet: protein load, Na+, K+ (bananas, potatoes), salt substitutes",
      "Smoking / alcohol — modifiable risk factors",
      "Prior kidney imaging or biopsy",
    ], { fontSize: 10.5, paraSpaceAfter: 4 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "LABS AT EACH VISIT (TIERED)", body: "",
    });
    s.addText(bulletBlock([
      { text: "Every visit: BMP, UACR", bold: true },
      { text: "Q3–6 mo (stage 3+): CBC, Mg, PO4, bicarb", bold: true },
      { text: "Q6–12 mo (stage 3b+): PTH, 25-OH vit D, ferritin / iron sat, albumin", bold: true },
      { text: "Annually: lipid panel, HbA1c if DM", bold: true },
      { text: "Once: hepatitis serologies (transplant prep), HIV, renal US if never done", bold: true },
      { text: "Home BP — bring log; if not, teach how to log", italic: true },
    ], { fontSize: 10.5, paraSpaceAfter: 5 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 6. BP targets
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 6, totalSlides: TOTAL,
      title: "Blood pressure in CKD",
      subtitle: "KDIGO 2021: target SBP < 120 mmHg (automated office blood pressure (AOBP)) when tolerated.",
      source: "KDIGO 2021 BP in CKD Guideline. SPRINT trial (NEJM 2015).",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "MEASUREMENT MATTERS", body: "",
    });
    s.addText(bulletBlock([
      "Use attended automated office BP (AOBP) when possible",
      "Home BP: AM + PM, 2 readings each, 1 min apart",
      "Correct cuff size; arm at heart level; quiet 5 min",
      "White-coat HTN is real — home/ambulatory BP catches it",
      "Masked HTN: normal in clinic, elevated at home",
      { text: "'120' target was derived from AOBP in SPRINT — not routine office BP", bold: true, color: PALETTE.primary },
    ], { fontSize: 11, paraSpaceAfter: 5 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.accent,
      header: "DRUG SEQUENCE", body: "",
    });
    s.addText(bulletBlock([
      "1. ACEi or ARB (never both)",
      "2. Thiazide or loop diuretic (loop if eGFR < 30)",
      "3. Amlodipine or other CCB",
      "4. Spironolactone or finerenone (resistant HTN)",
      "5. Additional: beta-blocker, hydralazine, clonidine",
      { text: "Avoid: dual RAAS blockade (ONTARGET — harmful)", bold: true, color: PALETTE.danger },
      { text: "In DKD: favor ACEi/ARB + SGLT2i + finerenone combo", bold: true, color: PALETTE.accent },
    ], { fontSize: 10.5, paraSpaceAfter: 4 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 7. Complications of CKD
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 7, totalSlides: TOTAL,
      title: "Complications — screen and treat",
      subtitle: "The reasons patients feel bad and the reasons they die.",
      source: "KDIGO 2017 CKD-MBD update. KDIGO 2012 Anemia of CKD (2026 update pending).",
    });

    const rows = [
      [
        { text: "Complication", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "Screen", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "Treat", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
      ],
      [
        { text: "Anemia", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Hgb, ferritin, TSAT (q6–12 mo stage 3+)",
        "Iron first (TSAT < 30 or ferritin < 100). erythropoiesis-stimulating agent (ESA) if Hgb < 10 after iron (target 10–11.5). Daprodustat (HIF-PHI) emerging.",
      ],
      [
        { text: "CKD-MBD", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Ca, PO4, PTH, 25-OH D (q6–12 mo stage 3b+)",
        "Treat persistent hyperphosphatemia with diet ± binders. Cholecalciferol for low 25-OH D. Reserve calcitriol/paricalcitol for severe progressive 2° HPT in G4–G5.",
      ],
      [
        { text: "Metabolic acidosis", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Serum bicarb (q visit stage 3b+)",
        "KDIGO 2024: consider oral NaHCO3 when bicarb < 18. BiCARB trial did not confirm routine benefit.",
      ],
      [
        { text: "Hyperkalemia", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "BMP q visit; symptoms; diet hx",
        "Diet first. Binder (SZC, patiromer) lets you keep RAAS (AMBER). Avoid Kayexalate.",
      ],
      [
        { text: "CVD risk", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Lipid panel, HbA1c, smoking",
        "Statin in most CKD (SHARP — not in dialysis). ASA if ASCVD. BP to target. Smoking cessation.",
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [1.8, 2.6, 4.8],
      rowH: [0.4, 0.5, 0.55, 0.5, 0.45, 0.45],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 10, valign: "middle",
    });
  }

  // 8. Dialysis prep / Transplant
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 8, totalSlides: TOTAL,
      title: "Preparing for kidney failure",
      subtitle: "Start the conversation at eGFR 30. Refer to transplant at eGFR 20.",
      source: "KDIGO 2020 Transplant Candidate Evaluation. AST/ASN modality choice guidance.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "MODALITY EDUCATION (eGFR < 30)", body: "",
    });
    s.addText(bulletBlock([
      "Discuss: in-center HD, home HD, PD, transplant, conservative care",
      "Access planning at eGFR < 20: arteriovenous fistula (AVF) cannulation minimum 6–8 weeks, but plan ≥ 6 months ahead (maturation + possible salvage)",
      "Protect non-dominant arm veins — no PICC, no IVs from now",
      "Patient preferences, caregiver support, home environment",
      "Social work + dietitian involvement",
      { text: "Dialysis is not an eGFR threshold — it's a symptom threshold", bold: true, color: PALETTE.primary },
    ], { fontSize: 10.5, paraSpaceAfter: 4 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "TRANSPLANT EVALUATION", body: "",
    });
    s.addText(bulletBlock([
      "Early referral at eGFR ≤ 20 — allows preemptive listing",
      "Pre-emptive transplant = best outcomes",
      "Living donor > deceased donor (longer graft life)",
      "Workup: cardiac, cancer screen age-appropriate, HLA typing, HBV/HCV/HIV",
      "Dental clearance, vaccines UTD pre-transplant",
      { text: "Barriers to screen: SES, adherence concerns, active cancer (usually 2–5 y wait)", italic: true },
    ], { fontSize: 10.5, paraSpaceAfter: 4 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 9. Landmark trials
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 9, totalSlides: TOTAL,
      title: "Landmark CKD trials you must know",
      subtitle: "Organized by pillar.",
      source: "Full citations on references slide.",
    });

    const rows = [
      [
        { text: "Trial", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center" } },
        { text: "Year", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center" } },
        { text: "Takeaway", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary } } },
      ],
      ["RENAAL",       "2001", "Losartan ↓ ESKD/doubling Cr 25–28% in T2DM nephropathy."],
      ["IDNT",         "2001", "Irbesartan — renoprotection independent of BP lowering."],
      ["ONTARGET",     "2008", "Dual RAAS (ACEi+ARB) → harm, more hyperK and AKI."],
      ["SPRINT",       "2015", "Intensive SBP < 120 ↓ CV events 25% (non-diabetic)."],
      ["CREDENCE",     "2019", "Canagliflozin ↓ kidney failure 30% in DKD."],
      ["DAPA-CKD",     "2020", "Dapagliflozin ↓ kidney failure 39% (incl. non-DM)."],
      ["EMPA-KIDNEY",  "2023", "Empagliflozin ↓ CKD progression 28% across broad eGFR."],
      ["FIDELIO-DKD",  "2020", "Finerenone ↓ CKD progression 18% in T2DM on max RAAS."],
      ["FLOW",         "2024", "Semaglutide ↓ kidney disease progression 24% in T2DM + CKD."],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [1.6, 0.9, 6.7],
      rowH: [0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 10, valign: "middle",
    });
  }



  // Clinical case — question
  addCaseQuestionSlide(pres, {
    topic: TOPIC, slideNumber: 10, totalSlides: TOTAL,
    vignette: "A 58-year-old Black man with T2DM × 15 yr, HTN, obesity. Labs: eGFR 38 (CKD-EPI 2021), UACR 720 mg/g, HbA1c 7.8%, K+ 4.8, HCO3 23, Hb 10.9 (ferritin 90, TSAT 18%), home BP avg 148/88. On lisinopril 40, amlodipine 10, metformin 1000 BID, atorvastatin.",
    question: "Which pillars are missing, and what's your next 3 interventions?",
  });

  // Clinical case — answer
  addCaseAnswerSlide(pres, {
    topic: TOPIC, slideNumber: 11, totalSlides: TOTAL,
    answer: "Missing: SGLT2i, finerenone, GLP-1 RA. Also anemia workup needed. (1) Add dapagliflozin 10 mg, (2) add finerenone 10 mg (K+ < 5.0 ✓), (3) IV iron then consider ESA if Hb stays < 10.",
    teaching: "CGA classification: G3b-A3 (very high risk). DKD pillars should be on-board when eligible. Stop metformin at eGFR < 30; he's still OK at 38. BP target is SBP < 120 when measured by standardized AOBP and tolerated. Also: retinal exam annually, vaccinate (flu, COVID, pneumococcal, HBV), modality education at eGFR < 30, nephrology follow-up q3-4 months for very-high-risk.",
  });

  // 11. References
  addReferencesSlide(pres, {
    topic: "Chronic Kidney Disease",
    references: {
      guidelines: [
        "KDIGO 2024 CKD Evaluation & Management",
        "KDIGO 2022 Diabetes in CKD",
        "KDIGO 2021 Blood Pressure in CKD",
        "KDIGO 2017 CKD-MBD update",
        "KDIGO 2020 Transplant Candidate Evaluation",
      ],
      trials: [
        "RENAAL — NEJM 2001",
        "IDNT — NEJM 2001",
        "ONTARGET — NEJM 2008",
        "SPRINT — NEJM 2015",
        "CREDENCE — NEJM 2019",
        "DAPA-CKD — NEJM 2020",
        "EMPA-KIDNEY — NEJM 2023",
        "FIDELIO-DKD — NEJM 2020",
        "FLOW — NEJM 2024",
        "SHARP — Lancet 2011",
      ],
    },
    uptodateTopics: [
      "Overview of the management of chronic kidney disease in adults",
      "Proteinuria and albuminuria: evaluation and causes",
      "Antihypertensive therapy and progression of CKD",
      "SGLT2 inhibitors in CKD",
      "Dialysis modality and vascular access planning",
    ],
  });

  const outPath = path.resolve(__dirname, "../../decks/04-CKD.pptx");
  await pres.writeFile({ fileName: outPath });
  console.log("Wrote:", outPath);
}

build().catch(e => { console.error(e); process.exit(1); });
