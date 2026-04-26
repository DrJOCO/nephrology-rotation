// AKI — Acute Kidney Injury teaching deck
const pptxgen = require("pptxgenjs");
const path = require("path");
const {
  PALETTE, FONT, iconToBase64Png,
  addCoverSlide, newContentSlide, addCard, addPearlBox,
  addReferencesSlide, bulletBlock,
  addCaseSlide, addCaseQuestionSlide, addCaseAnswerSlide,
} = require("./deckStyle.cjs");

const { FaHeartbeat, FaBolt, FaTint, FaFilter, FaExclamationTriangle,
        FaCheckCircle, FaTimesCircle, FaFlask } = require("react-icons/fa");

const TOPIC = "Acute Kidney Injury (AKI)";
const TOTAL = 13;

async function build() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Dr. Cheng";
  pres.title = TOPIC;

  // Pre-render icons we'll reuse
  const icons = {
    alert: await iconToBase64Png(FaExclamationTriangle, "#" + PALETTE.accent),
    check: await iconToBase64Png(FaCheckCircle, "#" + PALETTE.good),
    x:     await iconToBase64Png(FaTimesCircle, "#" + PALETTE.danger),
    drop:  await iconToBase64Png(FaTint, "#" + PALETTE.primary),
    flask: await iconToBase64Png(FaFlask, "#" + PALETTE.primary),
    bolt:  await iconToBase64Png(FaBolt, "#" + PALETTE.accent),
    heart: await iconToBase64Png(FaHeartbeat, "#" + PALETTE.primary),
    filter: await iconToBase64Png(FaFilter, "#" + PALETTE.primary),
  };

  // ============ SLIDE 1: COVER ============
  addCoverSlide(pres, {
    topic: "Acute Kidney Injury",
    subtitle: "A structured approach to the AKI consult",
    tagline: "Creatinine is not the consult — trajectory, urine output, and reversible factors are.",
  });


  // ============ SLIDE 2: Why we get consulted + pearl ============
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 2, totalSlides: TOTAL,
      title: "Why we get consulted",
      subtitle: "The consult is a question about trajectory and reversibility, not a creatinine number.",
      source: "KDIGO 2012 Clinical Practice Guideline for Acute Kidney Injury.",
    });
    // Left: consult triggers
    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "TRIGGERS FOR NEPHROLOGY CONSULT",
      body: "",
    });
    s.addText(bulletBlock([
      "Rising Cr without clear cause",
      "Stage 2–3 by KDIGO",
      "Active sediment (RBC / muddy brown casts)",
      "Approaching KRT — acidosis, electrolytes, ingestion, overload, uremia (AEIOU)",
      "Cirrhosis, HF, or sepsis complicating AKI",
    ], { fontSize: 13, paraSpaceAfter: 8 }), {
      x: 0.7, y: 1.95, w: 4.1, h: 2.95, margin: 0, valign: "top",
    });

    // Right: pearl
    addPearlBox(s, {
      x: 5.2, y: 1.4, w: 4.4, h: 3.6,
      label: "TEACHING PEARL",
      body: "Creatinine is a symptom. Spend your first 5 minutes on trajectory, hemodynamics, and reversible contributors — not the number itself.",
    });
  }

  // ============ SLIDE 3: KDIGO staging ============
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 3, totalSlides: TOTAL,
      title: "KDIGO staging: creatinine or urine output",
      subtitle: "Stage by WHICHEVER is worse — the UOP criterion is often the first to trip.",
      source: "Kidney Disease: Improving Global Outcomes (KDIGO) AKI Work Group. Kidney Int Suppl. 2012;2:1–138.",
    });

    const rows = [
      [
        { text: "Stage", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center", valign: "middle", fontFace: FONT.body } },
        { text: "Serum Creatinine", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "left", valign: "middle", fontFace: FONT.body } },
        { text: "Urine Output", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "left", valign: "middle", fontFace: FONT.body } },
      ],
      [
        { text: "1", options: { bold: true, color: PALETTE.primary, align: "center", valign: "middle", fontFace: FONT.title, fontSize: 20 } },
        { text: "1.5–1.9× baseline  OR  ↑ ≥ 0.3 mg/dL within 48 h", options: { fontFace: FONT.body, fontSize: 11 } },
        { text: "< 0.5 mL/kg/h for 6–12 h", options: { fontFace: FONT.body, fontSize: 11 } },
      ],
      [
        { text: "2", options: { bold: true, color: PALETTE.primary, align: "center", valign: "middle", fontFace: FONT.title, fontSize: 20 } },
        { text: "2.0–2.9× baseline", options: { fontFace: FONT.body, fontSize: 11 } },
        { text: "< 0.5 mL/kg/h for ≥ 12 h", options: { fontFace: FONT.body, fontSize: 11 } },
      ],
      [
        { text: "3", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.accent }, align: "center", valign: "middle", fontFace: FONT.title, fontSize: 20 } },
        { text: "≥ 3× baseline  OR  Cr ≥ 4.0 mg/dL  OR  initiation of KRT", options: { fontFace: FONT.body, fontSize: 11, bold: true } },
        { text: "< 0.3 mL/kg/h for ≥ 24 h  OR  anuria ≥ 12 h", options: { fontFace: FONT.body, fontSize: 11, bold: true } },
      ],
    ];

    s.addTable(rows, {
      x: 0.5, y: 1.35, w: 9.0, colW: [0.9, 4.3, 3.8],
      rowH: [0.45, 0.7, 0.7, 0.9],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card },
      valign: "middle",
    });

    // Key callout below
    s.addShape("rect", {
      x: 0.5, y: 4.35, w: 9.0, h: 0.65,
      fill: { color: PALETTE.ice }, line: { color: PALETTE.secondary, width: 0.5 },
    });
    s.addText([
      { text: "Why UOP matters: ", options: { bold: true, color: PALETTE.primary } },
      { text: "oliguria often precedes the creatinine rise by 24–48 h. Review bladder scan / Foley output hour-by-hour, not just the 24-hr total." },
    ], {
      x: 0.7, y: 4.45, w: 8.7, h: 0.5,
      fontFace: FONT.body, fontSize: 11, color: PALETTE.charcoal, margin: 0, valign: "middle",
    });
  }

  // ============ SLIDE 4: Differential (Pre / Intrinsic / Post) ============
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 4, totalSlides: TOTAL,
      title: "Anatomic differential: the three buckets",
      subtitle: "Every AKI gets triaged into these three buckets on the first pass.",
      source: "UpToDate: Evaluation of acute kidney injury among hospitalized adult patients (2026).",
    });

    const col = (x, accent, icon, header, items) => {
      addCard(s, { x, y: 1.4, w: 2.95, h: 3.7, accent, header, body: "" });
      s.addImage({ data: icon, x: x + 0.2, y: 1.75, w: 0.35, h: 0.35 });
      s.addText(bulletBlock(items, { fontSize: 10.5, paraSpaceAfter: 4 }), {
        x: x + 0.2, y: 2.2, w: 2.65, h: 2.8, margin: 0, valign: "top",
      });
    };

    col(0.4, PALETTE.primary, icons.drop,
      "PRE-RENAL  (perfusion)",
      [
        "Hypovolemia: GI, diuretic, bleed",
        "Sepsis, HF, cirrhosis",
        "ACEi/ARB + NSAID + dehydration",
        "BUN/Cr > 20, FeNa < 1%, FeUrea < 35%",
        { text: "Reverses with perfusion", bold: true, color: PALETTE.primary },
      ]);

    col(3.5, PALETTE.accent, icons.bolt,
      "INTRINSIC  (parenchymal)",
      [
        "ATN: ischemia, sepsis, contrast, pigment",
        "AIN: PPI, abx, NSAID",
        "GN: RBC casts, proteinuria",
        "Vascular: TMA, emboli, infarct",
        { text: "Does NOT respond to volume", bold: true, color: PALETTE.accent },
      ]);

    col(6.6, PALETTE.good, icons.filter,
      "POST-RENAL  (obstruction)",
      [
        "BPH, pelvic mass, neurogenic bladder",
        "Bilateral ureteral: stones, retroperitoneal",
        "Crystal: acyclovir, MTX, tumor lysis",
        { text: "Ultrasound is the screening test", bold: true, color: PALETTE.good },
        "Post-relief: watch K, Mg, PO4",
      ]);
  }

  // ============ SLIDE 5: Workup — labs + urine ============
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 5, totalSlides: TOTAL,
      title: "Workup: the first-pass labs",
      subtitle: "If you skip the microscopy, you'll miss the diagnosis that changes management.",
      source: "UpToDate: Diagnostic approach to adult patients with subacute kidney injury (2026).",
    });

    // Left card: required labs
    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "MINIMUM DATASET",
      body: "",
    });
    s.addText(bulletBlock([
      "BMP + Cr trend (all prior values)",
      "UA + microscopy",
      "UPCR or UACR",
      "Urine Na, Cr, urea → FeNa, FeUrea",
      "Renal US (obstruction)",
      "CBC, LFTs, CK, lactate",
      "Med review: NSAIDs, RAAS, contrast",
    ], { fontSize: 12, paraSpaceAfter: 6 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });

    // Right: FeNa vs FeUrea table
    s.addText("Fractional excretion interpretation", {
      x: 5.2, y: 1.4, w: 4.4, h: 0.3,
      fontFace: FONT.body, fontSize: 12, bold: true, color: PALETTE.primary, margin: 0,
    });

    const feRows = [
      [
        { text: "Test", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, align: "center", valign: "middle" } },
        { text: "Pre-renal", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, align: "center", valign: "middle" } },
        { text: "ATN", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, align: "center", valign: "middle" } },
      ],
      ["FeNa", "< 1%", "> 2%"],
      ["FeUrea", "< 35%", "> 50%"],
      ["BUN/Cr", "> 20", "10–15"],
      ["Urine osm", "> 500", "≈ 300 (iso-)"],
      ["UA", "bland", "muddy brown casts"],
    ];
    s.addTable(feRows, {
      x: 5.2, y: 1.75, w: 4.4, colW: [1.3, 1.55, 1.55],
      rowH: 0.38,
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card },
      fontSize: 10.5, fontFace: FONT.body, valign: "middle", align: "center",
    });

    s.addShape("rect", {
      x: 5.2, y: 4.15, w: 4.4, h: 0.9,
      fill: { color: PALETTE.warnLight }, line: { color: PALETTE.warn, width: 0.5 },
    });
    s.addText([
      { text: "FeNa is unreliable on diuretics. ", options: { bold: true, color: PALETTE.warn } },
      { text: "Use FeUrea instead (urea reabsorption is not blocked by loop/thiazide)." },
    ], {
      x: 5.35, y: 4.22, w: 4.1, h: 0.75,
      fontFace: FONT.body, fontSize: 10.5, color: PALETTE.charcoal, margin: 0, valign: "middle",
    });
  }

  // ============ SLIDE 6: What the UA tells you ============
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 6, totalSlides: TOTAL,
      title: "What the lab UA tells you",
      subtitle: "No spun microscopy needed — the dipstick + automated report answers most questions.",
      source: "UpToDate: Urinalysis in the diagnosis of kidney disease (2026).",
    });

    // Left card: what to read on the dipstick
    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "READ THE DIPSTICK", body: "",
    });
    s.addText(bulletBlock([
      { text: "Color — tea/coke = myoglobin or hemoglobin", bold: true },
      { text: "Specific gravity — > 1.020 concentrated (prerenal); ≈ 1.010 fixed (ATN)", bold: true },
      { text: "Protein — trace to 3+ (quantify with UPCR / UACR)", bold: true },
      { text: "Blood — hematuria; confirm with RBC count", bold: true },
      { text: "Leukocyte esterase / nitrite — UTI vs AIN", bold: true },
      { text: "Glucose / ketones — DKA, SGLT2i euglycemic DKA", bold: true },
    ], { fontSize: 11, paraSpaceAfter: 5 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });

    // Right card: discrepancies
    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.accent,
      header: "DISCREPANCIES THAT MEAN SOMETHING", body: "",
    });
    s.addText(bulletBlock([
      { text: "Blood+ on dipstick, no RBCs → myoglobin (rhabdo) or hemoglobin", bold: true, color: PALETTE.accent },
      { text: "Protein+ with bland UA → glomerular — get UPCR", bold: true, color: PALETTE.accent },
      { text: "LE+ but nitrite neg → AIN or fastidious organism", bold: true, color: PALETTE.accent },
      { text: "Nitrite+ → gram-negative UTI (usually E. coli)", bold: true, color: PALETTE.accent },
      { text: "Negative dipstick in AKI does NOT rule out GN", bold: true, color: PALETTE.accent },
    ], { fontSize: 11, paraSpaceAfter: 5 }), {
      x: 5.4, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });

    // Bottom note
    s.addShape("rect", {
      x: 0.4, y: 5.02, w: 9.2, h: 0.28,
      fill: { color: PALETTE.ice }, line: { type: "none" },
    });
    s.addText([
      { text: "Always pair the UA with:  ", options: { bold: true, color: PALETTE.primary } },
      { text: "spot UPCR / UACR (quantify), BMP (Cr trend, HCO3, K), urine Na/Cr/urea (FeNa / FeUrea)." },
    ], {
      x: 0.55, y: 5.05, w: 9.0, h: 0.24,
      fontFace: FONT.body, fontSize: 10, color: PALETTE.charcoal, margin: 0, valign: "middle", italic: true,
    });
  }

  // ============ SLIDE 7: AEIOU + red flags ============
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 7, totalSlides: TOTAL,
      title: "When to start KRT: the AEIOU mnemonic",
      subtitle: "Indications are clinical, not a single lab threshold.",
      source: "UpToDate: Kidney replacement therapy (dialysis) in acute kidney injury in adults: Indications, timing, and dialysis dose (2026). STARRT-AKI, AKIKI.",
    });

    const aeiou = [
      { letter: "A", label: "Acidosis", body: "pH < 7.1–7.15 refractory to bicarbonate/ventilation." },
      { letter: "E", label: "Electrolytes", body: "K⁺ > 6.5 or with ECG changes refractory to medical therapy." },
      { letter: "I", label: "Ingestion", body: "Dialyzable toxin: methanol, ethylene glycol, salicylates, lithium, metformin (MALA)." },
      { letter: "O", label: "Overload", body: "Refractory pulmonary edema; need for aggressive nutrition or blood products." },
      { letter: "U", label: "Uremia", body: "Pericarditis, encephalopathy, bleeding, intractable nausea/pruritus." },
    ];

    aeiou.forEach((row, i) => {
      const y = 1.35 + i * 0.7;
      // Letter circle
      s.addShape("ellipse", {
        x: 0.5, y: y, w: 0.55, h: 0.55,
        fill: { color: PALETTE.primary }, line: { type: "none" },
      });
      s.addText(row.letter, {
        x: 0.5, y: y, w: 0.55, h: 0.55,
        fontFace: FONT.title, fontSize: 24, bold: true, color: "FFFFFF",
        align: "center", valign: "middle", margin: 0,
      });
      s.addText(row.label, {
        x: 1.2, y: y + 0.02, w: 2.3, h: 0.3,
        fontFace: FONT.body, fontSize: 13, bold: true, color: PALETTE.primaryDark, margin: 0,
      });
      s.addText(row.body, {
        x: 1.2, y: y + 0.28, w: 8.3, h: 0.45,
        fontFace: FONT.body, fontSize: 10.5, color: PALETTE.charcoal, margin: 0,
      });
    });

    s.addShape("rect", {
      x: 0.4, y: 4.9, w: 9.2, h: 0.35,
      fill: { color: PALETTE.ice }, line: { type: "none" },
    });
    s.addText([
      { text: "STARRT-AKI & AKIKI: ", options: { bold: true, color: PALETTE.primary } },
      { text: "without a clear AEIOU indication, watchful waiting is safe — ~40% of delayed-strategy patients recovered without ever needing KRT." },
    ], {
      x: 0.55, y: 4.93, w: 9.0, h: 0.3,
      fontFace: FONT.body, fontSize: 10, color: PALETTE.charcoal, margin: 0, valign: "middle", italic: true,
    });
  }

  // ============ SLIDE 7: Management ============
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 8, totalSlides: TOTAL,
      title: "Management principles",
      subtitle: "Remove the insult. Restore perfusion. Avoid the second hit.",
      source: "UpToDate: Overview of the management of acute kidney injury (AKI) in adults (2026). SMART (NEJM 2018).",
    });

    // 4 column card grid
    const cards = [
      { header: "STOP NEPHROTOXINS", body: "Hold ACEi/ARB, NSAIDs, aminoglycosides. Renal-dose the rest. Defer contrast if possible.", accent: PALETTE.accent },
      { header: "RESTORE PERFUSION", body: "Volume only if depleted. Balanced crystalloids > NS (SMART). Sepsis: MAP ≥ 65.", accent: PALETTE.primary },
      { header: "TREAT THE CAUSE", body: "Abx for sepsis. Relieve obstruction. Stop AIN trigger. Immunosuppression for GN/vasculitis.", accent: PALETTE.good },
      { header: "SUPPORT, DON'T OVERCORRECT", body: "Watch K, HCO3, PO4. Diurese only if overloaded — not to chase Cr.", accent: PALETTE.secondary },
    ];

    cards.forEach((c, i) => {
      const row = Math.floor(i / 2), col = i % 2;
      const x = 0.4 + col * 4.65, y = 1.4 + row * 1.85;
      addCard(s, { x, y, w: 4.5, h: 1.65, accent: c.accent, header: c.header, body: c.body });
    });
  }

  // ============ SLIDE 8: Landmark trials ============
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 9, totalSlides: TOTAL,
      title: "Landmark trials that shape practice",
      subtitle: "What changed, and what you're expected to know on rounds.",
      source: "Full citations on references slide.",
    });

    const rows = [
      [
        { text: "Trial", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center" } },
        { text: "Year", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center" } },
        { text: "Takeaway", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "left" } },
      ],
      ["ATN Trial",   "2008", "Intensive CRRT (35 mL/kg/h) = standard (20–25). Ended 'more is better.'"],
      ["AKIKI",       "2016", "Delayed KRT safe in stage 3 AKI; 49% never needed dialysis."],
      ["STARRT-AKI",  "2020", "Accelerated KRT did not reduce 90-d mortality; 38% of standard arm avoided KRT entirely."],
      ["SMART",       "2018", "Balanced crystalloids reduced major adverse kidney events at 30 days (MAKE30) vs NS in ICU (NNT 91; NNT 29 in sepsis)."],
      ["BICAR-ICU",   "2018", "IV HCO₃⁻ for pH ≤ 7.20 reduced mortality in the AKI subgroup (NNT ~6)."],
      ["PRESERVE",    "2018", "NAC does NOT prevent contrast AKI; isotonic saline = bicarbonate. Debunked two dogmas."],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.4, w: 9.2, colW: [1.6, 0.9, 6.7],
      rowH: [0.4, 0.45, 0.45, 0.55, 0.5, 0.5, 0.5],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card },
      fontSize: 10.5, fontFace: FONT.body, valign: "middle",
    });
  }

  // ============ SLIDE 9: Common mistakes ============
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 10, totalSlides: TOTAL,
      title: "Common presentation mistakes",
      subtitle: "Avoid these and you'll sound like a senior.",
      source: "Premier Nephrology teaching guide.",
    });

    // Mistakes column
    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.danger,
      header: "AVOID",
      headerColor: PALETTE.danger,
      body: "",
    });
    const mistakes = [
      "Leading with Cr value, not trajectory",
      "Reporting 24-hr UOP, not hourly",
      "Calling every AKI 'ATN' without UA",
      "Missing RAAS + NSAID + contrast combo",
      "Recommending KRT by labs alone",
      "Skipping US in anuria",
    ];
    s.addText(mistakes.map((m, i) => ({
      text: m,
      options: { bullet: { type: "bullet" }, fontSize: 10.5, color: PALETTE.charcoal,
                 paraSpaceAfter: 6, breakLine: i < mistakes.length - 1, fontFace: FONT.body },
    })), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    // Pearls column
    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "DO INSTEAD",
      headerColor: PALETTE.good,
      body: "",
    });
    const pearls = [
      "Open: stage, trajectory, UOP, top 2 ddx",
      "Pull ≥ 3 prior Cr values",
      "Always state urine microscopy result",
      "Name one reversible factor you're removing",
      "Frame KRT by AEIOU, not BUN/Cr",
      "Anuria → US reflexively",
    ];
    s.addText(pearls.map((p, i) => ({
      text: p,
      options: { bullet: { type: "bullet" }, fontSize: 10.5, color: PALETTE.charcoal,
                 paraSpaceAfter: 6, breakLine: i < pearls.length - 1, fontFace: FONT.body },
    })), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }


  // Clinical case — question
  addCaseQuestionSlide(pres, {
    topic: TOPIC, slideNumber: 11, totalSlides: TOTAL,
    vignette: "A 72-year-old man with HTN, CHF (EF 30%), and baseline Cr 1.4 is admitted for pneumonia. Started on IV piperacillin-tazobactam and NS boluses. On hospital day 3, Cr is 2.8, UOP 0.3 mL/kg/h over 12 h. BP 108/65, on room air. UA: 2+ protein, granular/muddy-brown casts. Meds held: lisinopril, furosemide. Ultrasound: no hydronephrosis.",
    question: "What stage of AKI is this, and what's your top differential?",
  });

  // Clinical case — answer
  addCaseAnswerSlide(pres, {
    topic: TOPIC, slideNumber: 12, totalSlides: TOTAL,
    answer: "KDIGO stage 2 AKI (Cr 2× baseline); most likely ATN from sepsis ± piperacillin-tazobactam synergistic nephrotoxicity.",
    teaching: "Muddy-brown casts and a non-response to volume point to intrinsic ATN rather than pre-renal. Stage is driven by both Cr (2× baseline = stage 2) and UOP (< 0.5 for ≥ 12 h = stage 2). Plan: continue holding RAAS + nephrotoxins, optimize MAP ≥ 65, watch K+/HCO3 closely, daily UA, consider biopsy only if sediment unusual or failure to recover by day 7.",
  });

  addReferencesSlide(pres, {
    topic: "Acute Kidney Injury",
    references: {
      guidelines: [
        "KDIGO 2012 Clinical Practice Guideline for AKI",
        "Surviving Sepsis Campaign 2021 sepsis guidelines",
        "ACR Manual on Contrast Media (contrast-associated AKI)",
        "ASN educational resources",
      ],
      trials: [
        "ATN Trial — NEJM 2008",
        "AKIKI — NEJM 2016",
        "STARRT-AKI — NEJM 2020",
        "SMART — NEJM 2018",
        "SALT-ED — NEJM 2018",
        "BICAR-ICU — Lancet 2018",
        "PRESERVE — NEJM 2018",
        "AMACING — Lancet 2017",
      ],
    },
    uptodateTopics: [
      "Definition and staging criteria of AKI in adults",
      "Evaluation of AKI among hospitalized adult patients",
      "Overview of management of AKI in adults",
      "KRT in AKI: indications, timing, and dose",
    ],
  });

  const outPath = path.resolve(__dirname, "../../decks/01-AKI.pptx");
  await pres.writeFile({ fileName: outPath });
  console.log("Wrote:", outPath);
}

build().catch(e => { console.error(e); process.exit(1); });
