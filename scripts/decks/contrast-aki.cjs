// Contrast-Associated AKI teaching deck
const pptxgen = require("pptxgenjs");
const path = require("path");
const {
  PALETTE, FONT, addCoverSlide, newContentSlide, addCard, addPearlBox,
  addReferencesSlide, bulletBlock,
  addCaseSlide, addCaseQuestionSlide, addCaseAnswerSlide,
} = require("./deckStyle.cjs");

const TOPIC = "Contrast-Associated AKI";
const TOTAL = 12;

async function build() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Dr. Cheng";
  pres.title = TOPIC;

  addCoverSlide(pres, {
    topic: "Contrast-Associated AKI",
    subtitle: "Modern risk, modern prevention",
    tagline: "Don't let fear of contrast delay a life-saving scan. Real risk is lower than you were taught.",
  });


  // 2. Why matters + pearl
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 2, totalSlides: TOTAL,
      title: "Why we get consulted",
      subtitle: "Post-contrast Cr rise — is this contrast-induced acute kidney injury (CI-AKI), or coincidence?",
      source: "ACR Manual on Contrast Media (2025). UpToDate: Prevention of CI-AKI in adults (2026).",
    });
    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "CONSULT TRIGGERS", body: "",
    });
    s.addText(bulletBlock([
      "Cr rise 24–48 h post-contrast",
      "Intra-arterial contrast (angio, PCI)",
      "eGFR < 30 needing CT or MRI",
      "Dialysis around contrast study",
      "Future contrast safety counseling",
      "Post-angio atheroemboli",
      "Gadolinium NSF concern",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
    addPearlBox(s, {
      x: 5.2, y: 1.4, w: 4.4, h: 3.6,
      label: "TEACHING PEARL",
      body: "Most 'contrast-induced AKI' is coincidental. Don't skip a scan that changes management. Optimize volume when you can.",
    });
  }

  // 3. PC-AKI vs CI-AKI
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 3, totalSlides: TOTAL,
      title: "Definitions: post-contrast acute kidney injury (PC-AKI) vs CI-AKI",
      subtitle: "The ACR distinguishes correlation from causation.",
      source: "American College of Radiology (ACR) 2021 Manual on Contrast Media.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.warn,
      header: "POST-CONTRAST AKI  (PC-AKI)", body: "",
    });
    s.addText(bulletBlock([
      "General term: AKI developing within 48 h of contrast",
      "Descriptive — makes no claim about causation",
      "Includes CI-AKI and coincidental AKI",
      "Most clinical 'CI-AKI' is actually PC-AKI",
      "Common alternative causes: sepsis, hemodynamics, nephrotoxins, obstruction",
    ], { fontSize: 11, paraSpaceAfter: 5 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.accent,
      header: "CONTRAST-INDUCED AKI  (CI-AKI)", body: "",
    });
    s.addText(bulletBlock([
      "Causation attributed to contrast",
      "Typical pattern: Cr rise starts 24–48 h, peaks 3–5 d, recovers by day 7",
      "Definition: Cr ↑ ≥ 25% or ≥ 0.3 mg/dL within 48 h (KDIGO)",
      "Bland sediment usually (no casts, no cells)",
      "Non-oliguric in most cases",
      { text: "True CI-AKI rate in modern series: 1–6% (much lower than historical 10–30%)", bold: true, color: PALETTE.accent },
    ], { fontSize: 11, paraSpaceAfter: 5 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 4. Risk factors
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 4, totalSlides: TOTAL,
      title: "Risk factors",
      subtitle: "eGFR + intra-arterial + volume status drive risk.",
      source: "UpToDate: Prevention of contrast-associated AKI (2026). ACR Manual on Contrast Media (2025).",
    });

    const rows = [
      [
        { text: "Category", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Highest risk", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Lower risk", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
      ],
      [
        { text: "Kidney function", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "eGFR < 30 (highest); AKI currently",
        "eGFR ≥ 45 (minimal risk for IV contrast)",
      ],
      [
        { text: "Route", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Intra-arterial  (angio, PCI, transcatheter aortic valve replacement (TAVR))",
        "Intravenous",
      ],
      [
        { text: "Volume", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Hypovolemia, hypotension, sepsis",
        "Euvolemic, pre-hydrated",
      ],
      [
        { text: "Comorbidity", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Diabetes + CKD, CHF, multiple myeloma (debated)",
        "Non-diabetic without CKD",
      ],
      [
        { text: "Contrast agent", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "High-osmolar (obsolete)",
        "Low-osmolar, iso-osmolar",
      ],
      [
        { text: "Dose", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Large volumes (>100 mL), serial studies within 24–72 h",
        "Minimal necessary volume",
      ],
      [
        { text: "Drugs", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "NSAIDs, aminoglycosides, amphotericin, diuretics (volume depletion)",
        "Held for procedure",
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [1.8, 4.0, 3.4],
      rowH: [0.38, 0.4, 0.4, 0.4, 0.45, 0.4, 0.4, 0.4],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 10, valign: "middle",
    });
  }

  // 5. Prevention
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 5, totalSlides: TOTAL,
      title: "Prevention that works — and what doesn't",
      subtitle: "Volume status is everything. NAC and bicarb are not.",
      source: "PRESERVE (NEJM 2018). AMACING (Lancet 2017). POSEIDON.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "WORKS", headerColor: PALETTE.good, body: "",
    });
    s.addText(bulletBlock([
      "Isotonic IV hydration — NS or LR, 1–1.5 mL/kg/h for 6–12 h pre- & post-contrast",
      "Low-osmolar or iso-osmolar contrast (standard now)",
      "Minimize contrast volume",
      "Hold nephrotoxins around the procedure (NSAIDs, diuretics if volume allows)",
      "Optimize hemodynamics before the study",
      "Avoid repeat contrast within 24–72 h when possible",
      { text: "Intra-arterial: POSEIDON — left ventricular end-diastolic pressure (LVEDP)-guided hydration", bold: true, color: PALETTE.good },
    ], { fontSize: 10.5, paraSpaceAfter: 4 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.danger,
      header: "DOESN'T WORK (don't use)", headerColor: PALETTE.danger, body: "",
    });
    s.addText(bulletBlock([
      { text: "N-acetylcysteine (NAC)", bold: true },
      "PRESERVE showed no benefit vs placebo — stop using.",
      { text: "Sodium bicarbonate", bold: true },
      "PRESERVE: no superiority over isotonic saline.",
      { text: "Prophylactic HD / hemofiltration", bold: true },
      "Removes contrast but has not shown kidney protection; do not use prophylactically.",
      { text: "Routine hydration for IV contrast + eGFR 30–59", bold: true, color: PALETTE.danger },
      "AMACING: no benefit; consider omitting.",
    ], { fontSize: 10, paraSpaceAfter: 3 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 6. Atheroemboli
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 6, totalSlides: TOTAL,
      title: "Atheroembolic disease — the real post-angio AKI",
      subtitle: "Different timeline, different clue set, worse prognosis.",
      source: "UpToDate: Atheroembolic disease of the kidneys (2026).",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.accent,
      header: "CLUES", body: "",
    });
    s.addText(bulletBlock([
      "AKI 1–4 weeks post-angiography (delayed onset, not 48 h)",
      "Livedo reticularis, blue toes, digital gangrene",
      "Eosinophilia (~80%), hypocomplementemia",
      "New visual changes (Hollenhorst plaques on fundus)",
      "GI ischemia, pancreatitis",
      "Often stepwise decline, not monophasic",
      "Biopsy: cholesterol clefts in arterioles",
    ], { fontSize: 10.5, paraSpaceAfter: 4 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "MANAGEMENT", body: "",
    });
    s.addText(bulletBlock([
      "Supportive only — no proven disease-modifying therapy",
      "Statin (may stabilize plaque)",
      "Control BP, diabetes, lipids aggressively",
      "Wound care for skin lesions",
      { text: "Avoid further anticoagulation / angiography if possible", bold: true, color: PALETTE.primary },
      "Prognosis: ~30% need dialysis; partial renal recovery possible",
      "Steroids: controversial, limited evidence",
    ], { fontSize: 10.5, paraSpaceAfter: 4 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 7. Gadolinium & NSF
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 7, totalSlides: TOTAL,
      title: "Gadolinium — a quick aside",
      subtitle: "NSF risk is minimal with modern agents. Don't refuse all MRI for low eGFR.",
      source: "ACR Manual on Contrast Media (2025). ACR/NKF 2020 Consensus.",
    });

    const rows = [
      [
        { text: "Agent group", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Stability", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "NSF risk", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Use in low eGFR", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
      ],
      [
        { text: "Group I  (linear, non-ionic)", options: { bold: true, color: PALETTE.danger, fontFace: FONT.body } },
        "Unstable",
        "Highest — classic NSF agents (gadodiamide, gadoversetamide)",
        { text: "Avoid", options: { bold: true, color: PALETTE.danger } },
      ],
      [
        { text: "Group II  (macrocyclic + stable linear)", options: { bold: true, color: PALETTE.good, fontFace: FONT.body } },
        "Stable",
        "Extremely low (few case reports)",
        { text: "Use if needed even at eGFR < 30", options: { color: PALETTE.good } },
      ],
      [
        { text: "Group III  (linear, ionic)", options: { bold: true, color: PALETTE.warn, fontFace: FONT.body } },
        "Intermediate",
        "Low",
        "Usually OK if eGFR ≥ 30; consider Group II first",
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [2.5, 1.6, 2.7, 2.4],
      rowH: [0.38, 0.55, 0.55, 0.5],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 9.5, valign: "middle",
    });

    s.addShape("rect", {
      x: 0.4, y: 3.7, w: 9.2, h: 1.3,
      fill: { color: PALETTE.ice }, line: { color: PALETTE.secondary, width: 0.5 },
    });
    s.addText([
      { text: "Key points:  ", options: { bold: true, color: PALETTE.primary } },
      { text: "• Group II gadolinium is considered safe at eGFR < 30 — risk of missed MRI diagnosis usually outweighs NSF risk.  • Do not start or intensify dialysis solely for gadolinium; if already on HD, coordinate with the next practical session.  • Retention in brain (basal ganglia, dentate) is mostly linked to linear agents — clinical significance remains unclear.  • Avoid gadolinium in pregnancy when possible." },
    ], {
      x: 0.6, y: 3.8, w: 8.8, h: 1.1,
      fontFace: FONT.body, fontSize: 10.5, color: PALETTE.charcoal, margin: 0, valign: "top",
    });
  }

  // 8. Landmark trials
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 8, totalSlides: TOTAL,
      title: "Landmark trials in contrast",
      subtitle: "These trials changed what we teach.",
      source: "Full citations on references slide.",
    });

    const rows = [
      [
        { text: "Trial", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center" } },
        { text: "Year", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center" } },
        { text: "Takeaway", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary } } },
      ],
      ["PRESERVE",   "2018", "NAC and bicarb both ineffective for CI-AKI prevention in high-risk (eGFR < 45) — definitive."],
      ["AMACING",    "2017", "No pre-hydration vs NS hydration in eGFR 30–59 with IV contrast — NO difference."],
      ["POSEIDON",   "2014", "LVEDP-guided hydration in cath lab reduced CI-AKI vs standard (intra-arterial context)."],
      ["ACT",        "2011", "NAC in angiography — no benefit. Confirmed in PRESERVE."],
      ["REMEDIAL II", "2011", "Ranolazine or RenalGuard — limited use in practice."],
      ["Davenport et al.", "2013", "Propensity-matched cohorts — IV contrast does NOT materially increase AKI at eGFR ≥ 30."],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [2.0, 0.8, 6.4],
      rowH: [0.35, 0.5, 0.4, 0.45, 0.4, 0.4, 0.5],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 10, valign: "middle",
    });
  }

  // 9. Pitfalls
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 9, totalSlides: TOTAL,
      title: "Common pitfalls",
      subtitle: "The errors that lead to refusing life-saving imaging or giving useless prophylaxis.",
      source: "Premier Nephrology teaching guide.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.danger,
      header: "AVOID", headerColor: PALETTE.danger, body: "",
    });
    s.addText(bulletBlock([
      "Refusing contrast at eGFR ≥ 30",
      "Ordering NAC or bicarb",
      "Calling every post-contrast Cr rise CI-AKI",
      "Missing atheroemboli",
      "Avoiding Group II gado at low eGFR",
      "Large NS boluses in volume overload",
      "Skipping the urine check",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "DO INSTEAD", headerColor: PALETTE.good, body: "",
    });
    s.addText(bulletBlock([
      "Weigh risk of NOT scanning",
      "Isotonic IV, minimal volume",
      "Check Cr 48 h; seek alternatives",
      "Post-angio: think atheroemboli",
      "Group II gado safe at low eGFR",
      "Euvolemic + eGFR > 45: often no prophylaxis",
      "Always UA + UACR",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 5.4, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
  }



  // Clinical case — question
  addCaseQuestionSlide(pres, {
    topic: TOPIC, slideNumber: 10, totalSlides: TOTAL,
    vignette: "A 70-year-old man with CKD (eGFR 28), DM, HTN is admitted with chest pain. Troponin positive; cardiology recommends urgent catheterization. Team calls nephrology to 'clear' him — worried about CI-AKI. BP 138/82, euvolemic by exam, UA bland.",
    question: "What do you recommend regarding the cath? And what prophylaxis, if any?",
  });

  // Clinical case — answer
  addCaseAnswerSlide(pres, {
    topic: TOPIC, slideNumber: 11, totalSlides: TOTAL,
    answer: "Proceed with catheterization — the risk of NOT treating the ACS far outweighs CI-AKI risk. Pre-hydrate with isotonic IV (1 mL/kg/h × 6-12 h pre and post). Use low-osmolar contrast, minimize volume. Skip NAC and bicarbonate.",
    teaching: "Modern CI-AKI rates are much lower than taught historically, especially for IV contrast. Here the indication is intra-arterial (higher-risk route) in eGFR < 30 (highest-risk kidney function) — so prophylaxis is warranted. POSEIDON supports LVEDP-guided hydration in the cath lab if available. PRESERVE definitively debunked NAC and bicarbonate — neither helps vs isotonic NS. If he develops a Cr rise post-procedure: 24-48 h onset, peak 3-5 d, recovery ~7 d supports CI-AKI vs alternatives. If Cr rises 1-4 weeks after cath, think atheroemboli (livedo, eosinophilia, cholesterol clefts on biopsy).",
  });

  // 11. References
  addReferencesSlide(pres, {
    topic: "Contrast-Associated AKI",
    references: {
      guidelines: [
        "ACR Manual on Contrast Media (2025)",
        "ACR/NKF 2020 Consensus — Gadolinium in CKD/ESRD",
        "KDIGO 2012 AKI Guideline (contrast section)",
        "ESUR 2018 Guidelines on Contrast Media",
      ],
      trials: [
        "PRESERVE — NEJM 2018",
        "AMACING — Lancet 2017",
        "POSEIDON — Lancet 2014",
        "ACT — Circulation 2011",
        "REMEDIAL II — Circulation 2011",
        "Davenport et al. — Radiology 2013",
      ],
    },
    uptodateTopics: [
      "Prevention of contrast-associated acute kidney injury",
      "Pathogenesis, clinical features, and diagnosis of contrast-associated AKI",
      "Gadolinium-based contrast agents and nephrogenic systemic fibrosis",
      "Atheroembolic disease of the kidneys",
    ],
  });

  const outPath = path.resolve(__dirname, "../../decks/10-ContrastAKI.pptx");
  await pres.writeFile({ fileName: outPath });
  console.log("Wrote:", outPath);
}

build().catch(e => { console.error(e); process.exit(1); });
