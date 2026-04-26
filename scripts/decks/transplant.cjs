// Kidney Transplant teaching deck
const pptxgen = require("pptxgenjs");
const path = require("path");
const {
  PALETTE, FONT, addCoverSlide, newContentSlide, addCard, addPearlBox,
  addReferencesSlide, bulletBlock,
  addCaseSlide, addCaseQuestionSlide, addCaseAnswerSlide,
} = require("./deckStyle.cjs");

const TOPIC = "Kidney Transplant";
const TOTAL = 12;

async function build() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Dr. Cheng";
  pres.title = TOPIC;

  addCoverSlide(pres, {
    topic: "Kidney Transplant",
    subtitle: "Outpatient management of the transplant recipient",
    tagline: "Every visit: graft function, immunosuppression, infection, malignancy, CV risk.",
  });


  // 2. Why consulted + pearl
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 2, totalSlides: TOTAL,
      title: "Why we get consulted",
      subtitle: "Transplant patients are more fragile than they look. Small changes matter.",
      source: "KDIGO 2009 Care of the Kidney Transplant Recipient. AST/ASN resources.",
    });
    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "CLINIC VISIT PRIORITIES", body: "",
    });
    s.addText(bulletBlock([
      "Graft function (Cr, UACR, BP, weight)",
      "Tacrolimus trough",
      "Infection screen: BK, CMV, EBV; PJP prophylaxis",
      "Cancer: skin, PTLD, cervix, colon",
      "CV risk, DM, HTN, lipids",
      "CNI + steroid bone effects",
      "NO live vaccines on immunosuppression",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
    addPearlBox(s, {
      x: 5.2, y: 1.4, w: 4.4, h: 3.6,
      label: "TEACHING PEARL",
      body: "A rising Cr in transplant is never 'mild.' Ddx: dehydration, drug interaction, BK, rejection, CNI toxicity, recurrence, obstruction. Get tac level, UACR, UA.",
    });
  }

  // 3. Immunosuppression regimen
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 3, totalSlides: TOTAL,
      title: "Standard immunosuppression",
      subtitle: "Induction → maintenance triple therapy → lifelong monitoring.",
      source: "KDIGO 2009/2020 transplant guidelines. ELITE-Symphony trial (NEJM 2007).",
    });

    const rows = [
      [
        { text: "Phase", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Agent", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Dose / target", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Key toxicity", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
      ],
      [
        { text: "Induction", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Basiliximab (low-risk) or anti-thymocyte globulin (high-risk)",
        "IV, peri-op",
        "ATG: cytokine release, cytopenias, infection",
      ],
      [
        { text: "Maintenance", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Tacrolimus (CNI)",
        "Trough 5–10 ng/mL (yr 1), 4–8 long-term",
        "Nephrotoxicity, DM, tremor, HTN, hypoMg",
      ],
      [
        { text: "", options: { fill: { color: "FFFFFF" } } },
        "Mycophenolate (mycophenolate mofetil (MMF))",
        "1 g PO BID",
        "GI (diarrhea), cytopenias, teratogen",
      ],
      [
        { text: "", options: { fill: { color: "FFFFFF" } } },
        "Prednisone (if not steroid-free)",
        "5 mg/day maintenance",
        "DM, osteoporosis, cataracts, weight gain",
      ],
      [
        { text: "Alternative", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Belatacept (CD80/86 blockade)",
        "IV infusion monthly",
        "Only in EBV-seropositive; PTLD risk in naive",
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [1.5, 3.0, 2.3, 2.4],
      rowH: [0.38, 0.5, 0.55, 0.5, 0.5, 0.5],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 10, valign: "middle",
    });
  }

  // 4. Rising Cr in transplant — ddx
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 4, totalSlides: TOTAL,
      title: "Rising creatinine — the differential",
      subtitle: "Biopsy is the definitive answer when pre-renal and drug causes are excluded.",
      source: "UpToDate: Evaluation of acute kidney allograft dysfunction (2026).",
    });

    const buckets = [
      { color: PALETTE.primary, title: "PRE-RENAL / HEMODYNAMIC",
        items: "Dehydration (GI illness, poor PO), diuretics, NSAIDs, ACEi/ARB addition, sepsis" },
      { color: PALETTE.accent, title: "DRUG / TOXIC",
        items: "High tac level (check trough); cytochrome P450 3A4 (CYP3A4) interactions (azoles, macrolides, diltiazem, grapefruit); contrast; aminoglycosides" },
      { color: PALETTE.danger, title: "REJECTION  (need biopsy)",
        items: "Cellular rejection: T-cell mediated (T-cell infiltrate). Antibody-mediated: donor-specific antibody (DSA)+, C4d+ on biopsy. Both cause rapid Cr rise, often subclinical" },
      { color: PALETTE.good, title: "INFECTION / VIRAL",
        items: "BK nephropathy (check BK PCR; decoy cells); CMV; pyelonephritis (allograft tender)" },
      { color: PALETTE.secondary, title: "STRUCTURAL",
        items: "Ureteral obstruction (stricture, lymphocele, stone); renal artery stenosis (refractory HTN + Cr rise); DVT/RVT" },
      { color: PALETTE.warn, title: "RECURRENT DISEASE",
        items: "FSGS (most common), IgA, MPGN, diabetic nephropathy — usually ≥ 1 yr post-transplant" },
    ];

    buckets.forEach((b, i) => {
      const row = Math.floor(i / 2), col = i % 2;
      const x = 0.4 + col * 4.65, y = 1.4 + row * 1.2;
      addCard(s, { x, y, w: 4.5, h: 1.1, accent: b.color, header: b.title, body: "" });
      s.addText(b.items, {
        x: x + 0.2, y: y + 0.4, w: 4.25, h: 0.65,
        fontFace: FONT.body, fontSize: 10, color: PALETTE.charcoal, margin: 0, valign: "top",
      });
    });
  }

  // 5. Infection prophylaxis
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 5, totalSlides: TOTAL,
      title: "Infection prophylaxis and screening",
      subtitle: "Highest risk first 6 months. Keep surveillance lifelong.",
      source: "AST Infectious Diseases Community of Practice guidelines.",
    });

    const rows = [
      [
        { text: "Pathogen", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Risk window", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Prophylaxis / screening", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
      ],
      [
        { text: "Pneumocystis (PJP)", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "First 6–12 mo",
        "TMP-SMX single-strength daily or 3×/wk",
      ],
      [
        { text: "CMV", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "First 3–6 mo (D+/R− highest risk)",
        "Valganciclovir 900 mg daily × 6 mo (D+/R−); or preemptive with PCR monitoring",
      ],
      [
        { text: "BK virus", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "First 2 yr; lifelong surveillance",
        "Screen PCR monthly × 6 mo, then q3 mo × 2 yr; reduce IS if viremia",
      ],
      [
        { text: "EBV / PTLD", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Lifelong (high in D+/R−)",
        "PCR if new lymphadenopathy, cytopenia, weight loss",
      ],
      [
        { text: "Fungal (Candida, Aspergillus)", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Early post-op; lung tx higher risk",
        "Oral nystatin × 3 mo; consider azole if prior col.",
      ],
      [
        { text: "HBV reactivation", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Lifelong if HBsAg+ or anti-HBc+",
        "Entecavir / tenofovir + serology monitoring",
      ],
      [
        { text: "Flu / COVID / S. pneumo", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Annual / per schedule",
        "Inactivated vaccines only; NO live (MMR, varicella, yellow fever)",
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [2.2, 2.8, 4.2],
      rowH: [0.38, 0.4, 0.45, 0.45, 0.4, 0.45, 0.4, 0.4],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 9.5, valign: "middle",
    });
  }

  // 6. Tacrolimus interactions
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 6, totalSlides: TOTAL,
      title: "Tacrolimus — levels, interactions, side effects",
      subtitle: "The single most common source of transplant chaos.",
      source: "UpToDate: Pharmacology of cyclosporine and tacrolimus (2026).",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.accent,
      header: "RAISE THE LEVEL (CYP3A4 inhibitors)", body: "",
    });
    s.addText(bulletBlock([
      "Azole antifungals (fluconazole, voriconazole, posaconazole)",
      "Macrolides (erythromycin, clarithromycin — NOT azithromycin)",
      "Diltiazem, verapamil",
      "Protease inhibitors (HIV, HCV)",
      "Grapefruit juice",
      { text: "Expect tac level to rise within 48–72 h; recheck & adjust", bold: true, color: PALETTE.accent },
    ], { fontSize: 10.5, paraSpaceAfter: 5 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "LOWER THE LEVEL (CYP3A4 inducers)", body: "",
    });
    s.addText(bulletBlock([
      "Rifampin, rifabutin",
      "Phenytoin, carbamazepine, phenobarbital",
      "St. John's wort",
      { text: "Classic side effects:", bold: true },
      "Nephrotoxicity (afferent vasoconstriction), hyperK, hypoMg, tremor, HA, new-onset DM, HTN, hair changes, alopecia (in women)",
      { text: "Always draw trough 12 h post-dose", bold: true, color: PALETTE.primary },
    ], { fontSize: 10.5, paraSpaceAfter: 5 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 7. Malignancy surveillance
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 7, totalSlides: TOTAL,
      title: "Malignancy — the long-tail risk",
      subtitle: "Transplant recipients have 2–4× baseline cancer risk. Most cancers are preventable or detectable.",
      source: "AST Kidney Transplant Recipient cancer screening consensus.",
    });

    const cards = [
      { color: PALETTE.accent, title: "SKIN CANCER",
        body: "Most common (squamous cell carcinoma (SCC) > basal cell carcinoma (BCC)); 65× baseline for SCC. Annual dermatology. Daily SPF 30+. Self-exam. Avoid tanning beds." },
      { color: PALETTE.primary, title: "PTLD",
        body: "EBV-driven B-cell lymphoma; first year risk highest. Symptoms: weight loss, adenopathy, cytopenia. Rx: reduce IS + rituximab ± chemo." },
      { color: PALETTE.good, title: "NATIVE KIDNEY RCC",
        body: "Acquired cystic disease and long dialysis vintage raise RCC risk. Screen high-risk patients by center protocol; routine annual CT is not universal." },
      { color: PALETTE.secondary, title: "GI / CERVICAL / BREAST",
        body: "Colonoscopy per guidelines; cervical cytology annually (not 3-yearly); mammo per guidelines. HPV vaccination where applicable." },
    ];
    cards.forEach((c, i) => {
      const row = Math.floor(i / 2), col = i % 2;
      const x = 0.4 + col * 4.65, y = 1.4 + row * 1.85;
      addCard(s, { x, y, w: 4.5, h: 1.7, accent: c.color, header: c.title, body: c.body });
    });
  }

  // 8. Landmark trials
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 8, totalSlides: TOTAL,
      title: "Landmark trials in transplant",
      subtitle: "What shapes current induction / maintenance / rejection.",
      source: "Full citations on references slide.",
    });

    const rows = [
      [
        { text: "Trial", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center" } },
        { text: "Year", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center" } },
        { text: "Takeaway", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary } } },
      ],
      ["ELITE-Symphony",   "2007", "Low-dose tac + MMF + steroids + daclizumab best — now standard."],
      ["BENEFIT",          "2010", "Belatacept vs cyclosporine — better renal function, similar graft survival long-term."],
      ["BENEFIT-EXT",      "2010", "Belatacept in extended-criteria donors — non-inferior; avoid in EBV-naive."],
      ["3C Study",         "2014", "Alemtuzumab vs basiliximab induction — equivalent outcomes."],
      ["CAESAR",           "2007", "Cyclosporine withdrawal → more rejection; ongoing low-dose CNI is safer."],
      ["STAR",             "2019", "Living donor kidney paired exchange — durable benefit, safe."],
      ["DeKAF",            "2012", "Antibody-mediated rejection classification and outcomes."],
      ["ADVANCE / PIVOT",  "2012+", "Once-daily tacrolimus (Envarsus / Advagraf) — improved adherence, non-inferior."],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [1.8, 0.8, 6.6],
      rowH: [0.35, 0.38, 0.4, 0.4, 0.38, 0.38, 0.38, 0.38, 0.4],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 10, valign: "middle",
    });
  }

  // 9. Common pitfalls
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 9, totalSlides: TOTAL,
      title: "Common clinic mistakes",
      subtitle: "The errors that lead to rejection or hospitalization.",
      source: "Premier Nephrology teaching guide.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.danger,
      header: "AVOID", headerColor: PALETTE.danger, body: "",
    });
    s.addText(bulletBlock([
      "Missing drug interactions on tac",
      "Stopping PJP prophylaxis early",
      "LIVE vaccines on immunosuppression",
      "Ignoring small Cr rises",
      "No routine BK PCR",
      "Diagnosing rejection without biopsy",
      "Acting on one tac level",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "DO INSTEAD", headerColor: PALETTE.good, body: "",
    });
    s.addText(bulletBlock([
      "Review meds at every visit (incl OTC / grapefruit)",
      "Coordinate prophylaxis with transplant center",
      "Inactivated vaccines only (recombinant zoster OK)",
      "Cr ↑ → tac level, BK PCR, UA",
      "BK + CMV PCR per center schedule",
      "Biopsy if Cr ↑ > 20% without reversible cause",
      "Recheck tac 3–5 d after dose change",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 5.4, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
  }



  // Clinical case — question
  addCaseQuestionSlide(pres, {
    topic: TOPIC, slideNumber: 10, totalSlides: TOTAL,
    vignette: "A 55-year-old woman 14 months s/p deceased donor kidney transplant, on tacrolimus 3 mg BID (last trough 6.5), MMF 1 g BID, prednisone 5 mg. Baseline Cr 1.3. Clinic visit today: Cr 1.9. She reports 'taking drugs as prescribed.' New prescription 1 month ago from PCP: clarithromycin for bronchitis, completed. No fever, no urinary symptoms.",
    question: "What's the most likely cause of the Cr rise, and what should you check?",
  });

  // Clinical case — answer
  addCaseAnswerSlide(pres, {
    topic: TOPIC, slideNumber: 11, totalSlides: TOTAL,
    answer: "Tacrolimus toxicity from clarithromycin (CYP3A4 inhibition). Check tac trough NOW; expect elevated; also BK PCR, UA, UACR, volume status to exclude other causes.",
    teaching: "Drug interactions are the #1 reversible cause of Cr rise in transplant clinic. Classic CYP3A4 inhibitors that RAISE tac: azole antifungals (fluc, vori, posa), macrolides (erythro, clarithro — NOT azithro), diltiazem, verapamil, grapefruit, HIV protease inhibitors. Always review the med list at every visit. If tac level is elevated, reduce dose and re-check in 3-5 days. If Cr doesn't return to baseline, the differential broadens: dehydration, rejection, BK nephropathy, obstruction, recurrent disease. Always get UA, UACR, BK PCR, and consider biopsy if Cr > 20% above baseline without clear reversible cause.",
  });

  // 11. References
  addReferencesSlide(pres, {
    topic: "Kidney Transplant",
    references: {
      guidelines: [
        "KDIGO 2009 Care of the Kidney Transplant Recipient",
        "KDIGO 2020 Transplant Candidate Evaluation",
        "AST Infectious Diseases Community of Practice",
        "AST Cancer Screening Consensus",
        "ISHLT vaccines in solid organ transplant (2019)",
      ],
      trials: [
        "ELITE-Symphony — NEJM 2007",
        "BENEFIT — AJT 2010",
        "BENEFIT-EXT — AJT 2010",
        "3C Study — Lancet 2014",
        "CAESAR — AJT 2007",
        "DeKAF — AJT 2012",
        "STAR (paired exchange) — JAMA 2019",
      ],
    },
    uptodateTopics: [
      "Evaluation of acute kidney allograft dysfunction",
      "Pharmacology and side effects of calcineurin inhibitors",
      "BK polyomavirus-associated nephropathy",
      "Infection after kidney transplantation",
      "Kidney transplantation in adults: Immunosuppression maintenance",
    ],
  });

  const outPath = path.resolve(__dirname, "../../decks/07-Transplant.pptx");
  await pres.writeFile({ fileName: outPath });
  console.log("Wrote:", outPath);
}

build().catch(e => { console.error(e); process.exit(1); });
