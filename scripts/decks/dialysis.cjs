// Dialysis / KRT basics teaching deck
const pptxgen = require("pptxgenjs");
const path = require("path");
const {
  PALETTE, FONT, iconToBase64Png,
  addCoverSlide, newContentSlide, addCard, addPearlBox,
  addReferencesSlide, bulletBlock,
  addCaseSlide, addCaseQuestionSlide, addCaseAnswerSlide,
} = require("./deckStyle.cjs");

const TOPIC = "Dialysis / KRT";
const TOTAL = 12;

async function build() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Dr. Cheng";
  pres.title = TOPIC;

  // 1. COVER
  addCoverSlide(pres, {
    topic: "Dialysis & KRT",
    subtitle: "Indications, modalities, and access",
    tagline: "Dialysis is started because of a problem the kidneys cannot solve — not because of a number.",
  });


  // 2. Why consulted + pearl
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 2, totalSlides: TOTAL,
      title: "Why we get consulted",
      subtitle: "The consult is about a decision, not a diagnosis.",
      source: "UpToDate: Kidney replacement therapy in acute kidney injury (2026).",
    });
    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "REASONS FOR KRT CONSULT", body: "",
    });
    s.addText(bulletBlock([
      "Approaching AEIOU (acidosis, electrolytes, ingestion, overload, uremia)",
      "ESRD admitted, off-schedule, or missed",
      "Refractory hyperK or pulmonary edema",
      "Dialyzable toxin",
      "CKD-5 — access + modality planning",
      "PD peritonitis or catheter issue",
      "CRRT vs IHD in the ICU",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
    addPearlBox(s, {
      x: 5.2, y: 1.4, w: 4.4, h: 3.6,
      label: "TEACHING PEARL",
      body: "State the problem, not the modality. 'Refractory hyperK despite therapy' is a reason. 'BUN 100' is not. Name the question, what failed, and the ask.",
    });
  }

  // 3. AEIOU indications
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 3, totalSlides: TOTAL,
      title: "AEIOU: the urgent indications",
      subtitle: "Any one of these → dialysis is not elective.",
      source: "UpToDate: KRT in AKI — indications and timing (2026).",
    });

    const aeiou = [
      { letter: "A", label: "Acidosis", body: "pH < 7.1–7.15 refractory to bicarbonate and ventilation." },
      { letter: "E", label: "Electrolytes", body: "K+ > 6.5 or K+ with ECG changes refractory to medical therapy." },
      { letter: "I", label: "Ingestion", body: "Dialyzable toxin: methanol, ethylene glycol, salicylates, lithium, metformin (metformin-associated lactic acidosis (MALA)), valproate." },
      { letter: "O", label: "Overload", body: "Refractory pulmonary edema; anuric CHF; need for space for blood products or TPN." },
      { letter: "U", label: "Uremia", body: "Pericarditis, encephalopathy, bleeding diathesis, intractable nausea or pruritus." },
    ];

    aeiou.forEach((row, i) => {
      const y = 1.35 + i * 0.7;
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
      { text: "STARRT-AKI / AKIKI: ", options: { bold: true, color: PALETTE.primary } },
      { text: "without AEIOU, watchful waiting is safe — ~40% avoid KRT entirely. Don't start for BUN/Cr alone." },
    ], {
      x: 0.55, y: 4.93, w: 9.0, h: 0.3,
      fontFace: FONT.body, fontSize: 10, color: PALETTE.charcoal, margin: 0, valign: "middle", italic: true,
    });
  }

  // 4. Modalities
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 4, totalSlides: TOTAL,
      title: "Modalities at a glance",
      subtitle: "Hemodynamics and clinical context drive the choice.",
      source: "UpToDate: Selection of modality for acute renal replacement therapy (RRT) (2026).",
    });

    const rows = [
      [
        { text: "", options: { fill: { color: PALETTE.primaryDark } } },
        { text: "IHD", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, align: "center", valign: "middle" } },
        { text: "continuous renal replacement therapy (CRRT)", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, align: "center", valign: "middle" } },
        { text: "SLED", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, align: "center", valign: "middle" } },
        { text: "PD", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, align: "center", valign: "middle" } },
      ],
      [
        { text: "Duration", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "3–5 h, 3×/wk", "24 h continuous", "8–12 h nightly", "CAPD 4 exchanges/d or automated peritoneal dialysis (APD) nightly",
      ],
      [
        { text: "Hemodynamics", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Demanding — requires stable MAP",
        { text: "Gentle — ideal for shock", options: { color: PALETTE.good } },
        "Intermediate",
        { text: "Very gentle — preserves residual function", options: { color: PALETTE.good } },
      ],
      [
        { text: "Solute clearance", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        { text: "Highest — best for toxins / severe hyperK", options: { color: PALETTE.good } },
        "Moderate (20–25 mL/kg/h effluent)",
        "Intermediate",
        "Lowest — not for acute toxicity",
      ],
      [
        { text: "Volume removal", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Rapid (up to 4 L per session)",
        { text: "Continuous, titrated to hemodynamics", options: { color: PALETTE.good } },
        "Intermediate",
        "Slow; limited in peritoneal scarring",
      ],
      [
        { text: "Access", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "AVF > arteriovenous graft (AVG) > central venous catheter (CVC)",
        "Large-bore CVC (usually IJ)",
        "CVC",
        "PD catheter (Tenckhoff) — 2 weeks to mature",
      ],
      [
        { text: "Best for", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        { text: "Stable patient, toxin, severe hyperK, fast removal", options: { italic: true, color: PALETTE.primary } },
        { text: "Shock, high fluid requirements, brain injury (↓ ICP shifts)", options: { italic: true, color: PALETTE.primary } },
        { text: "Intermediate — ICU without full CRRT", options: { italic: true, color: PALETTE.primary } },
        { text: "Home modality, preserved residual function, pediatric", options: { italic: true, color: PALETTE.primary } },
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [1.5, 2.1, 2.1, 1.6, 1.9],
      rowH: [0.35, 0.4, 0.55, 0.55, 0.55, 0.55, 0.55],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 9, valign: "middle",
    });
  }

  // 5. Vascular access
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 5, totalSlides: TOTAL,
      title: "Vascular access — life-plan first",
      subtitle: "Right access, right patient, right time. Plan months in advance.",
      source: "KDOQI Vascular Access Guidelines 2019 Update.",
    });

    const rows = [
      [
        { text: "Access", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "Pros", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "Cons", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "Maturation / prep", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
      ],
      [
        { text: "arteriovenous fistula (AVF)  (native)", options: { bold: true, color: PALETTE.good, fontFace: FONT.body } },
        "Longest life, lowest infection, best flow",
        "Not all patients are candidates; may fail to mature",
        "Often needs months; refer around eGFR 15–20 or earlier if rapid decline",
      ],
      [
        { text: "AVG  (graft)", options: { bold: true, color: PALETTE.warn, fontFace: FONT.body } },
        "Faster maturation, salvageable for obese/vasculopath",
        "Higher thrombosis, infection, shorter life",
        "2–4 weeks",
      ],
      [
        { text: "Tunneled CVC", options: { bold: true, color: PALETTE.danger, fontFace: FONT.body } },
        "Immediate use",
        "Infection (central line-associated bloodstream infection (CLABSI)), thrombosis, central stenosis → ruins future AVF",
        "Temporary bridge only",
      ],
      [
        { text: "PD catheter", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Home modality; no needles; gentler",
        "Peritonitis risk; abdominal surgery / hernias contraindicate",
        "2 weeks to mature; embedded or buried option",
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [1.8, 2.4, 2.7, 2.3],
      rowH: [0.4, 0.55, 0.55, 0.55, 0.55],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 10, valign: "middle",
    });

    s.addShape("rect", {
      x: 0.4, y: 4.5, w: 9.2, h: 0.5,
      fill: { color: PALETTE.warnLight }, line: { color: PALETTE.warn, width: 0.5 },
    });
    s.addText([
      { text: "Vein preservation matters: ", options: { bold: true, color: PALETTE.warn } },
      { text: "NO PICCs, NO IVs in non-dominant arm once eGFR < 30. Central lines ruin future AVF sites." },
    ], {
      x: 0.55, y: 4.55, w: 9.0, h: 0.4,
      fontFace: FONT.body, fontSize: 11, color: PALETTE.charcoal, margin: 0, valign: "middle",
    });
  }

  // 6. Intradialytic complications
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 6, totalSlides: TOTAL,
      title: "Complications during & between treatments",
      subtitle: "Anticipate them — they're common and often preventable.",
      source: "UpToDate: Intradialytic hypotension; Dialysis-related complications (2026).",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.accent,
      header: "DURING DIALYSIS", body: "",
    });
    s.addText(bulletBlock([
      "Hypotension — most common. Causes: excessive UF, short session, cardiac dysfunction. Management: lower UF rate, cool dialysate, midodrine, reassess dry weight.",
      "Muscle cramps — high UF rate; reduce goal.",
      "Arrhythmias — sudden cardiac death risk elevated on MWF schedule (long interval).",
      "Access dysfunction — low flow, recirculation; urgent US / declotting.",
      "Dialyzer reaction — eosinophilia, bronchospasm (Type A); pre-rinse and alternate dialyzer.",
    ], { fontSize: 10, paraSpaceAfter: 5 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "BETWEEN TREATMENTS", body: "",
    });
    s.addText(bulletBlock([
      "Volume gain > 3–5% dry weight → review intake, Na+ diet",
      "Missed dialysis → hyperkalemia, volume overload, uremia",
      "Access infection → fever, redness; blood cultures + vanco",
      "Calciphylaxis — painful skin ulcers; low-Ca dialysate, sodium thiosulfate, wound care",
      "Amyloidosis, RLS, pruritus — chronic complications of long-term HD",
    ], { fontSize: 10, paraSpaceAfter: 5 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 7. Home modalities / PD
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 7, totalSlides: TOTAL,
      title: "Home dialysis — PD and home HD",
      subtitle: "Independence, preserved residual function, comparable outcomes.",
      source: "ISPD Peritonitis Guidelines 2022. UpToDate: Overview of PD (2026).",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "PERITONEAL DIALYSIS", body: "",
    });
    s.addText(bulletBlock([
      "Modes: CAPD (4 manual exchanges/day) or APD (cycler at night)",
      "Prescription: dwell volume, # exchanges, dextrose concentration (1.5/2.5/4.25%)",
      "Icodextrin for long dwell (fewer failures to UF)",
      "Adequacy: dialysis adequacy (clearance × time / distribution volume) (Kt/V) ≥ 1.7/week (weekly urea clearance)",
      "Peritonitis: cloudy effluent, fever, abdominal pain; WBC > 100 with > 50% PMN; IP antibiotics",
      "Contraindications: large hernias, recent abdominal surgery, scarring",
    ], { fontSize: 10, paraSpaceAfter: 4 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "HOME HEMODIALYSIS", body: "",
    });
    s.addText(bulletBlock([
      "Daily short (2–3 h × 5–6×/wk) or nocturnal (6–8 h × 3–6×/wk)",
      "Better BP, LVH regression, phosphorus control (FHN trial signal)",
      "Requires care partner, home space, training (4–6 weeks)",
      "Vascular access often AVF with buttonhole cannulation",
      "Lower QoL burden for many compared to in-center",
      "Best for motivated patients with support at home",
    ], { fontSize: 10, paraSpaceAfter: 4 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 8. Landmark trials
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 8, totalSlides: TOTAL,
      title: "Landmark trials in dialysis",
      subtitle: "What changed, what didn't.",
      source: "Full citations on references slide.",
    });

    const rows = [
      [
        { text: "Trial", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center" } },
        { text: "Year", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center" } },
        { text: "Takeaway", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary } } },
      ],
      ["HEMO",         "2002", "Higher Kt/V or high-flux dialyzer did NOT improve mortality in maintenance HD."],
      ["ATN Trial",    "2008", "Intensive CRRT (35 mL/kg/h) = standard (20–25) in AKI. Standard is sufficient."],
      ["IDEAL",        "2010", "Early vs late RRT start in ESRD — no mortality difference; early = more complications."],
      ["AKIKI",        "2016", "Delayed KRT safe in stage 3 AKI; 49% never needed dialysis."],
      ["STARRT-AKI",   "2020", "Accelerated KRT did not reduce 90-d mortality; 38% of standard arm avoided KRT."],
      ["ELAIN",        "2016", "Single-center signal favoring early KRT — not replicated in STARRT-AKI."],
      ["FHN Daily",    "2010", "6× weekly HD improved LVH, BP — no mortality signal."],
      ["PIVOTAL",      "2019", "Proactive IV iron (high-dose) in HD ↓ CV events, ↓ ESA need."],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [1.6, 0.9, 6.7],
      rowH: [0.35, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 10, valign: "middle",
    });
  }

  // 9. Common pitfalls
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 9, totalSlides: TOTAL,
      title: "Common presentation mistakes",
      subtitle: "Avoid these when presenting a KRT consult.",
      source: "Premier Nephrology teaching guide.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.danger,
      header: "AVOID", headerColor: PALETTE.danger, body: "",
    });
    s.addText(bulletBlock([
      "Starting dialysis on BUN alone",
      "Not knowing ESRD schedule / dry weight",
      "Skipping medical optimization",
      "CRRT without checking hemodynamics",
      "PICCs / peripheral IVs in CKD",
      "No backup access plan",
    ], { fontSize: 12, paraSpaceAfter: 8 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "DO INSTEAD", headerColor: PALETTE.good, body: "",
    });
    s.addText(bulletBlock([
      "State the clinical problem, not BUN",
      "Pull schedule, access, dry weight, transplant",
      "Name what medical therapy failed",
      "IHD if stable; CRRT if on pressors",
      "Vein preservation — no BP/IV ordered in arm",
      "Every CVC needs a next-step plan",
    ], { fontSize: 12, paraSpaceAfter: 8 }), {
      x: 5.4, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
  }



  // Clinical case — question
  addCaseQuestionSlide(pres, {
    topic: TOPIC, slideNumber: 10, totalSlides: TOTAL,
    vignette: "A 62-year-old man admitted to MICU with septic shock from pneumonia, on norepinephrine 0.4 µg/kg/min and vasopressin. Oliguric × 24 h, Cr rose from 1.2 to 4.6 over 72 h. K+ 6.8 (persistent despite med therapy), HCO3 14, pH 7.18, volume-overloaded with worsening oxygenation. No urgent toxin.",
    question: "Does he meet criteria for KRT, and what modality?",
  });

  // Clinical case — answer
  addCaseAnswerSlide(pres, {
    topic: TOPIC, slideNumber: 11, totalSlides: TOTAL,
    answer: "Yes — multiple AEIOU indications (Acidosis, Electrolytes, Overload). Start CRRT given hemodynamic instability.",
    teaching: "AEIOU triggers: A (pH < 7.15), E (K+ > 6.5 refractory), O (pulmonary edema limiting oxygenation). CRRT preferred over IHD because he's on high-dose pressors; CRRT's gentler solute/fluid removal avoids further hemodynamic collapse. Standard dose 20-25 mL/kg/h effluent (ATN trial — more is not better). Large-bore CVC (usually IJ) for access. Goal is to bridge to renal recovery; ~60% of AKI-KRT patients recover kidney function, so this does NOT mean lifelong dialysis.",
  });

  // 11. References
  addReferencesSlide(pres, {
    topic: "Dialysis / KRT",
    references: {
      guidelines: [
        "KDIGO 2012 AKI Guideline (RRT section)",
        "KDOQI 2019 Vascular Access Update",
        "KDOQI 2015 Hemodialysis Adequacy",
        "ISPD 2022 Peritonitis Guidelines",
        "ASDIN and ASN Access & Modality statements",
      ],
      trials: [
        "HEMO — NEJM 2002",
        "ATN Trial — NEJM 2008",
        "IDEAL — NEJM 2010",
        "AKIKI — NEJM 2016",
        "ELAIN — JAMA 2016",
        "STARRT-AKI — NEJM 2020",
        "FHN Daily — NEJM 2010",
        "PIVOTAL — NEJM 2019",
      ],
    },
    uptodateTopics: [
      "Kidney replacement therapy in AKI: indications and timing",
      "Selection of modality for acute RRT",
      "Overview of peritoneal dialysis",
      "Intradialytic hypotension",
      "Vascular access for hemodialysis",
    ],
  });

  const outPath = path.resolve(__dirname, "../../decks/05-Dialysis.pptx");
  await pres.writeFile({ fileName: outPath });
  console.log("Wrote:", outPath);
}

build().catch(e => { console.error(e); process.exit(1); });
