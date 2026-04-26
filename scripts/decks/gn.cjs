// Glomerulonephritis teaching deck
const pptxgen = require("pptxgenjs");
const path = require("path");
const {
  PALETTE, FONT, iconToBase64Png,
  addCoverSlide, newContentSlide, addCard, addPearlBox,
  addReferencesSlide, bulletBlock,
  addCaseSlide, addCaseQuestionSlide, addCaseAnswerSlide,
} = require("./deckStyle.cjs");

const TOPIC = "Glomerulonephritis";
const TOTAL = 14;

async function build() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Dr. Cheng";
  pres.title = TOPIC;

  // 1. COVER
  addCoverSlide(pres, {
    topic: "Glomerulonephritis",
    subtitle: "Active sediment, pattern recognition, urgent biopsy",
    tagline: "Hematuria + proteinuria + rising Cr is not just AKI — look at the urine.",
  });


  // 2. Why consulted + pearl
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 2, totalSlides: TOTAL,
      title: "Why we get consulted",
      subtitle: "Rapidly progressive GN can cause irreversible loss if not recognized early.",
      source: "KDIGO 2021 Clinical Practice Guideline for Glomerular Diseases.",
    });
    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "TRIGGERS FOR CONSULT", body: "",
    });
    s.addText(bulletBlock([
      "Active sediment: RBC casts, dysmorphic RBCs",
      "Hematuria + proteinuria + rising Cr",
      "Nephrotic range (UPCR > 3 or 3.5 g/day)",
      "Pulmonary-renal syndrome",
      "Rash + arthritis + kidney disease",
      "Unexplained AKI with active UA",
      "Hypocomplementemia + AKI",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
    addPearlBox(s, {
      x: 5.2, y: 1.4, w: 4.4, h: 3.6,
      label: "TEACHING PEARL",
      body: "Hematuria + proteinuria + rising Cr is never 'just AKI.' Urine findings can flip management from watchful ATN to urgent biopsy + immunosuppression.",
    });
  }

  // 3. Nephritic vs nephrotic
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 3, totalSlides: TOTAL,
      title: "Nephritic vs nephrotic — the orienting split",
      subtitle: "Two patterns, different differentials, different urgencies.",
      source: "UpToDate: Overview of the classification and causes of glomerular disease (2026).",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.accent,
      header: "NEPHRITIC  —  inflammation", body: "",
    });
    s.addText(bulletBlock([
      "Hematuria (dysmorphic RBCs, RBC casts)",
      "Modest proteinuria (usually < 3 g/day)",
      "Hypertension (salt + water retention)",
      "Rising Cr, often acute/subacute",
      "Edema — periorbital, pedal",
      { text: "Think: IgA, post-infectious, lupus, antineutrophil cytoplasmic antibody (ANCA), anti-glomerular basement membrane (anti-GBM)", bold: true, color: PALETTE.accent },
      { text: "Urgency: rising Cr = consider rapidly progressive glomerulonephritis (RPGN) workup", bold: true },
    ], { fontSize: 10.5, paraSpaceAfter: 4 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "NEPHROTIC  —  barrier loss", body: "",
    });
    s.addText(bulletBlock([
      "Proteinuria > 3.5 g/day (or UPCR > 3)",
      "Hypoalbuminemia (< 3 g/dL)",
      "Edema — often generalized, anasarca",
      "Hyperlipidemia, hypercoagulability (renal vein thrombosis, DVT)",
      "Bland sediment (± oval fat bodies, 'maltese cross')",
      { text: "Think: minimal change, focal segmental glomerulosclerosis (FSGS), membranous, DKD, amyloid", bold: true, color: PALETTE.primary },
      { text: "Urgency: usually less acute, but assess VTE risk, edema, and lipids", italic: true },
    ], { fontSize: 10.5, paraSpaceAfter: 4 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 4. Proteinuria & nephrotic syndrome
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 4, totalSlides: TOTAL,
      title: "Proteinuria and nephrotic syndrome",
      subtitle: "Quantify first — then recognize the complications.",
      source: "KDIGO 2021 Glomerular Diseases. UpToDate: Overview of nephrotic syndrome (2026).",
    });

    // Left: quantification
    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "QUANTIFY PROTEINURIA", body: "",
    });
    s.addText(bulletBlock([
      { text: "UACR — best screen (albumin specific)", bold: true },
      "  Normal < 30 mg/g",
      "  Moderate A2 = 30–300",
      "  Severe A3 = > 300",
      { text: "UPCR (g/g) ≈ g/day proteinuria", bold: true },
      { text: "Nephrotic range: UPCR > 3 or > 3.5 g/day", bold: true, color: PALETTE.accent },
      "24-h urine: gold standard but often impractical",
    ], { fontSize: 11.5, paraSpaceAfter: 5 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });

    // Right: nephrotic syndrome features + tx
    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.accent,
      header: "NEPHROTIC SYNDROME — MANAGE", body: "",
    });
    s.addText(bulletBlock([
      { text: "Tetrad: > 3.5 g/day proteinuria, albumin < 3, edema, hyperlipidemia", bold: true },
      { text: "VTE risk — consider anticoagulation when albumin is very low, especially membranous, after bleeding-risk review", bold: true, color: PALETTE.accent },
      "Infection risk (loss of Ig, complement)",
      { text: "Tx: max ACEi/ARB, SGLT2i, statin, Na restriction", bold: true, color: PALETTE.good },
      "Biopsy confirms primary cause — drives immunosuppression",
    ], { fontSize: 11, paraSpaceAfter: 5 }), {
      x: 5.4, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
  }

  // 5. UA sediment — optional visual reference
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 5, totalSlides: TOTAL,
      title: "UA sediment — reference card",
      subtitle: "Optional reference. Most labs report sediment findings automatically.",
      source: "UpToDate: Urinalysis in kidney disease (2026).",
    });

    const rows = [
      [
        { text: "Finding", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "What it means", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
      ],
      [
        { text: "RBC casts / dysmorphic RBCs", options: { bold: true, color: PALETTE.accent, fontFace: FONT.body } },
        "Glomerular bleeding → GN (IgA, ANCA, lupus, anti-GBM, post-strep)",
      ],
      [
        { text: "Muddy brown / granular casts", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Tubular injury → ATN (ischemic, septic, toxic)",
      ],
      [
        { text: "WBC casts", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Pyelonephritis, acute interstitial nephritis (AIN)",
      ],
      [
        { text: "Waxy casts", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Chronic kidney disease (advanced, low urine flow)",
      ],
      [
        { text: "Hyaline casts", options: { bold: true, color: PALETTE.muted, fontFace: FONT.body } },
        "Nonspecific — dehydration, fever; can be normal",
      ],
      [
        { text: "Oval fat bodies / Maltese cross", options: { bold: true, color: PALETTE.accent, fontFace: FONT.body } },
        "Heavy proteinuria / nephrotic syndrome",
      ],
      [
        { text: "Eosinophils", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "AIN (low sensitivity) or atheroembolic disease",
      ],
      [
        { text: "Crystals (calcium oxalate, uric acid)", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Ethylene glycol (oxalate); tumor lysis / urate; stones",
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [3.2, 6.0],
      rowH: [0.35, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 10.5, valign: "middle",
    });

    s.addShape("rect", {
      x: 0.4, y: 5.0, w: 9.2, h: 0.3,
      fill: { color: PALETTE.ice }, line: { type: "none" },
    });
    s.addText([
      { text: "Note: ", options: { bold: true, color: PALETTE.primary } },
      { text: "most outpatient labs report sediment automatically; manual microscopy is rarely done in clinic but remains the gold standard when the diagnosis is unclear." },
    ], {
      x: 0.55, y: 5.03, w: 9.0, h: 0.25,
      fontFace: FONT.body, fontSize: 9.5, italic: true, color: PALETTE.charcoal, margin: 0, valign: "middle",
    });
  }

  // 6. Serologic panel
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 6, totalSlides: TOTAL,
      title: "The GN serologic panel",
      subtitle: "Send it early — results often take days, and timing matters.",
      source: "UpToDate: Evaluation of the adult with hematuria (2026).",
    });

    const rows = [
      [
        { text: "Test", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "What it tells you", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "Disease", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
      ],
      [
        { text: "ANA, anti-dsDNA, anti-Sm", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Lupus activity; dsDNA correlates with nephritis",
        "SLE nephritis",
      ],
      [
        { text: "C3 / C4", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Low in SLE, post-strep, membranoproliferative glomerulonephritis (MPGN), cryoglobulinemia; normal in ANCA and anti-GBM",
        "Narrow ddx quickly",
      ],
      [
        { text: "ANCA  (myeloperoxidase (MPO), proteinase 3 (PR3))", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "PR3 → granulomatosis with polyangiitis (GPA); MPO → microscopic polyangiitis (MPA); either can cause renal-limited vasculitis",
        "ANCA-associated vasculitis",
      ],
      [
        { text: "Anti-GBM", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Linear IgG on biopsy; rapid and irreversible",
        "Goodpasture syndrome",
      ],
      [
        { text: "PLA2R antibody", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Positive in ~70% of primary membranous; follow to monitor therapy",
        "Membranous nephropathy",
      ],
      [
        { text: "HBV, HCV, HIV, cryoglobulins", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Secondary causes of MPGN or membranous",
        "Infection-driven GN",
      ],
      [
        { text: "Complement CH50", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Screen for C3 glomerulopathy / dense deposit disease",
        "Rare complement-mediated GN",
      ],
      [
        { text: "ASO, anti-DNase B", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Recent strep infection (2–4 weeks)",
        "Post-streptococcal GN",
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [2.3, 4.5, 2.4],
      rowH: [0.35, 0.36, 0.36, 0.36, 0.36, 0.36, 0.36, 0.36, 0.36],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 9.5, valign: "middle",
    });
  }

  // 5. Urgent: pulmonary-renal syndrome / RPGN
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 7, totalSlides: TOTAL,
      title: "Urgent: pulmonary-renal syndrome & RPGN",
      subtitle: "Minutes-to-hours decisions. Biopsy and immunosuppression don't wait.",
      source: "UpToDate: Approach to the patient with pulmonary-renal syndrome (2026).",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.danger,
      header: "RED FLAGS", headerColor: PALETTE.danger, body: "",
    });
    s.addText(bulletBlock([
      "Hemoptysis + hematuria + rising Cr",
      "New oxygen requirement, infiltrates on CXR",
      "Cr doubling over days; oliguria",
      "Active sediment (RBC casts)",
      "Mononeuritis multiplex, sinus disease, upper-airway bleeding",
      "ANCA or anti-GBM positive",
      { text: "Action: biopsy TODAY if feasible; empiric steroids + consider PLEX", bold: true, color: PALETTE.danger },
    ], { fontSize: 10.5, paraSpaceAfter: 4 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "INITIAL MANAGEMENT (before biopsy)", body: "",
    });
    s.addText(bulletBlock([
      { text: "Stabilize: O2, transfuse if bleeding, protect access", bold: true },
      "Send: ANCA, anti-GBM, ANA, dsDNA, C3/C4, urgent UA + microscopy",
      "Empiric IV methylprednisolone 500–1000 mg/day × 3 if anti-GBM suspected (can't wait)",
      "PLEX: consider for severe kidney disease, rapidly rising Cr, dialysis need, or hypoxemic pulmonary hemorrhage",
      "Biopsy as soon as platelets, BP, anticoagulation allow",
      { text: "Consult IR / nephrology for urgent native kidney biopsy", italic: true, color: PALETTE.primary },
    ], { fontSize: 10, paraSpaceAfter: 4 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 6. Common GNs at a glance
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 8, totalSlides: TOTAL,
      title: "Common glomerular diseases — recognition",
      subtitle: "Pattern + clinical context = diagnosis most of the time.",
      source: "UpToDate: various topic reviews (2026).",
    });

    const rows = [
      [
        { text: "Disease", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "Presentation", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "Clue", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
      ],
      [
        { text: "IgA nephropathy", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Recurrent synpharyngitic hematuria in young adult",
        "IgA-dominant IF on biopsy; most common GN worldwide",
      ],
      [
        { text: "Post-infectious GN", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Kids 1–3 wk after strep throat/impetigo; adults post-staph",
        "Low C3 (recovers 6–8 wk); humps on EM",
      ],
      [
        { text: "Lupus nephritis", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Young woman, rash, arthritis, serositis, cytopenias",
        "ANA+, dsDNA+, low C3/C4; class I–VI on biopsy",
      ],
      [
        { text: "ANCA vasculitis (GPA, MPA)", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Older adult, sinus/pulmonary disease, RPGN",
        "MPO/PR3+; pauci-immune crescentic GN",
      ],
      [
        { text: "Anti-GBM  (Goodpasture)", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Hemoptysis + RPGN, bimodal age",
        "Linear IgG; urgent PLEX + immunosuppression",
      ],
      [
        { text: "Membranous nephropathy", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Adult nephrotic syndrome + VTE",
        "PLA2R+ in ~70% (primary); spike & dome on EM",
      ],
      [
        { text: "FSGS", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "African ancestry/APOL1 risk, obesity, HIV, heroin, reflux — nephrotic range proteinuria",
        "Segmental sclerosis; APOL1 variants",
      ],
      [
        { text: "Minimal change", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Sudden full nephrotic syndrome; children; NSAID-associated in adults",
        "Normal LM, foot-process effacement on EM",
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [2.2, 4.3, 2.7],
      rowH: [0.35, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 9.5, valign: "middle",
    });
  }

  // 7. Biopsy + treatment scaffolding
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 9, totalSlides: TOTAL,
      title: "Kidney biopsy + treatment scaffolding",
      subtitle: "Biopsy confirms; supportive care + targeted immunosuppression treats.",
      source: "KDIGO 2021 Glomerular Diseases Guideline.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "WHEN TO BIOPSY", body: "",
    });
    s.addText(bulletBlock([
      "Rapidly rising Cr + active sediment",
      "Nephrotic syndrome in adult (most — exclude DKD)",
      "Unexplained AKI with hematuria/proteinuria",
      "Suspected lupus nephritis to classify",
      "Isolated persistent proteinuria > 1 g/day with features",
      { text: "Pre-biopsy: platelets > 50K, INR < 1.5, BP < 160/90, stop AC 5–7 d", bold: true, color: PALETTE.primary },
      "Complications: bleeding (~2%), transfusion (~1%), AV fistula, rarely nephrectomy",
    ], { fontSize: 10, paraSpaceAfter: 3 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "SUPPORTIVE THERAPY  (always)", body: "",
    });
    s.addText(bulletBlock([
      "Max-dose ACEi or ARB for proteinuria",
      "SGLT2i (added benefit in proteinuric CKD — DAPA-CKD, EMPA-KIDNEY)",
      "BP target SBP < 120 (proteinuric, non-dialysis CKD)",
      "Low-sodium diet (< 2 g/day)",
      "Statin for lipid management (nephrotic)",
      "Consider anticoagulation for high-risk nephrotic syndrome after bleeding-risk review",
      "Vaccinations before immunosuppression (PPSV, HBV, influenza, COVID, zoster)",
    ], { fontSize: 10, paraSpaceAfter: 3 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 8. Landmark trials
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 10, totalSlides: TOTAL,
      title: "Landmark trials in glomerular disease",
      subtitle: "The RCTs that shape current management.",
      source: "Full citations on references slide.",
    });

    const rows = [
      [
        { text: "Trial", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center" } },
        { text: "Year", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center" } },
        { text: "Takeaway", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary } } },
      ],
      ["RAVE",        "2010", "Rituximab non-inferior to cyclophosphamide for ANCA induction; preferred in relapse."],
      ["MAINRITSAN",  "2014", "Rituximab maintenance superior to azathioprine in ANCA vasculitis."],
      ["PEXIVAS",     "2020", "Reduced-dose steroids non-inferior; PLEX not routine, but KDIGO 2024 still considers it in highest-risk AAV."],
      ["MENTOR",      "2019", "Rituximab SUPERIOR to cyclosporine at 24 mo for membranous (durable remission)."],
      ["STOP-IgAN",   "2015", "Immunosuppression on top of supportive care did NOT slow IgAN; SC is foundation."],
      ["TESTING",     "2022", "Methylpred slowed IgAN progression (HR 0.53 full cohort; HR 0.27 reduced-dose); more infection."],
      ["NefIgArd",    "2023", "Targeted-release budesonide ↓ proteinuria & slowed eGFR decline in IgAN."],
      ["DAPA-CKD",    "2020", "Dapagliflozin ↓ kidney failure even in non-DM CKD (including IgAN, FSGS subgroups)."],
      ["EMPA-KIDNEY", "2023", "Empagliflozin benefit across eGFR/urine albumin-to-creatinine ratio (UACR), including many primary GN etiologies."],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [1.6, 0.9, 6.7],
      rowH: [0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 10, valign: "middle",
    });
  }

  // 9. Common pitfalls
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 11, totalSlides: TOTAL,
      title: "Common presentation mistakes",
      subtitle: "Avoid these when presenting a possible GN.",
      source: "Premier Nephrology teaching guide.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.danger,
      header: "AVOID", headerColor: PALETTE.danger, body: "",
    });
    s.addText(bulletBlock([
      "Calling it AKI without checking UA",
      "Relying on dipstick alone",
      "Missing day-1 serologic panel",
      "Delaying biopsy for labs",
      "Steroids without a taper plan",
      "Automatic anticoagulation for every nephrotic patient",
      "No vaccines before immunosuppression",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "DO INSTEAD", headerColor: PALETTE.good, body: "",
    });
    s.addText(bulletBlock([
      "Lead with UA + proteinuria",
      "Request formal UA + microscopy",
      "Day 1: ANA, dsDNA, ANCA, anti-GBM, C3/C4",
      "Tee up biopsy early (plts, INR, BP)",
      "Pair steroids with rituximab/CYC + taper",
      "Low albumin → weigh VTE vs bleeding risk",
      "Vaccinate before steroids",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 5.4, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
  }



  // Clinical case — question
  addCaseQuestionSlide(pres, {
    topic: TOPIC, slideNumber: 12, totalSlides: TOTAL,
    vignette: "A 48-year-old man, 3-week history of sinusitis, hemoptysis, and fatigue. Admitted with Cr 3.4 (baseline 1.0 six months ago), UA: 3+ blood, 2+ protein, RBC casts, dysmorphic RBCs; UACR 2800. BP 168/102. CXR: bilateral patchy infiltrates. C3 and C4 normal. ANCA pending. No rash.",
    question: "What's the likely diagnosis, what do you send today, and what's the urgency?",
  });

  // Clinical case — answer
  addCaseAnswerSlide(pres, {
    topic: TOPIC, slideNumber: 13, totalSlides: TOTAL,
    answer: "ANCA-associated vasculitis (likely GPA: sinus + pulmonary + renal, normal complements). Send ANCA (MPO/PR3), anti-GBM, ANA/dsDNA. Biopsy TODAY. Empiric high-dose IV methylprednisolone after samples drawn.",
    teaching: "Pulmonary-renal syndrome with rapidly rising Cr + active sediment = RPGN until proven otherwise. Classic triad for GPA: upper airway (sinus, nose) + lower airway (lung) + kidney. Normal C3/C4 argues against lupus or post-infectious. While waiting for biopsy: stabilize BP, oxygenation, no anticoagulation if biopsy planned. RAVE showed rituximab non-inferior to cyclophosphamide; PEXIVAS supports reduced-dose steroids. PLEX is not routine, but KDIGO 2024 still considers it for SCr > 3.4 mg/dL, dialysis/rapidly rising SCr, hypoxemic alveolar hemorrhage, or ANCA/anti-GBM overlap.",
  });

  // 11. References
  addReferencesSlide(pres, {
    topic: "Glomerulonephritis",
    references: {
      guidelines: [
        "KDIGO 2021 Glomerular Diseases Guideline",
        "KDIGO 2024 ANCA Vasculitis Guideline",
        "ACR 2019 Lupus Nephritis Guidelines",
        "EULAR/ERA-EDTA SLE Management Recs",
        "CHAMP — ANCA vasculitis management consensus",
        "ASN/NephJC educational resources",
      ],
      trials: [
        "RAVE — NEJM 2010",
        "MAINRITSAN — NEJM 2014",
        "PEXIVAS — NEJM 2020",
        "MENTOR — NEJM 2019",
        "STOP-IgAN — NEJM 2015",
        "TESTING — JAMA 2022",
        "NefIgArd — Lancet 2023",
        "DAPA-CKD — NEJM 2020",
        "EMPA-KIDNEY — NEJM 2023",
      ],
    },
    uptodateTopics: [
      "Overview of the classification and causes of glomerular disease",
      "Evaluation of the adult with hematuria",
      "Approach to the patient with pulmonary-renal syndrome",
      "Treatment of ANCA-associated vasculitis",
      "Treatment of lupus nephritis",
      "Primary membranous nephropathy: pathogenesis and treatment",
    ],
  });

  const outPath = path.resolve(__dirname, "../../decks/06-GN.pptx");
  await pres.writeFile({ fileName: outPath });
  console.log("Wrote:", outPath);
}

build().catch(e => { console.error(e); process.exit(1); });
