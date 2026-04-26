// Hyponatremia teaching deck
const pptxgen = require("pptxgenjs");
const path = require("path");
const {
  PALETTE, FONT, iconToBase64Png,
  addCoverSlide, newContentSlide, addCard, addPearlBox,
  addReferencesSlide, bulletBlock,
  addCaseSlide, addCaseQuestionSlide, addCaseAnswerSlide,
} = require("./deckStyle.cjs");

const TOPIC = "Hyponatremia";
const TOTAL = 12;

async function build() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Dr. Cheng";
  pres.title = TOPIC;

  // 1. COVER
  addCoverSlide(pres, {
    topic: "Hyponatremia",
    subtitle: "Tonicity, volume status, and the art of slow correction",
    tagline: "Chronic hyponatremia is a water problem. Fix it slowly, or you'll break the brain.",
  });


  // 2. Why consulted + pearl
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 2, totalSlides: TOTAL,
      title: "Why we get consulted",
      subtitle: "Diagnosis looks simple; overcorrection isn't.",
      source: "UpToDate: Overview of the treatment of hyponatremia in adults (2026).",
    });
    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "TRIGGERS FOR CONSULT", body: "",
    });
    s.addText(bulletBlock([
      "Na < 125 or drop ≥ 10 in 24 h",
      "Symptomatic (seizure, AMS)",
      "Unclear etiology",
      "SIADH refractory to fluid restriction",
      "Cirrhosis / HF with progressive Na drop",
      "Overcorrection / DDAVP clamp for ODS",
    ], { fontSize: 13, paraSpaceAfter: 8 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
    addPearlBox(s, {
      x: 5.2, y: 1.4, w: 4.4, h: 3.6,
      label: "TEACHING PEARL",
      body: "Three questions answer 90%: is it truly hypotonic? How concentrated is the urine? What's the volume status? Everything flows from these.",
    });
  }

  // 3. First 3 labs
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 3, totalSlides: TOTAL,
      title: "Three labs decide the diagnosis",
      subtitle: "Order all three on the same draw. Don't skip serum osmolality.",
      source: "UpToDate: Diagnostic evaluation of hyponatremia in adults (2026).",
    });

    const cards = [
      { color: PALETTE.primary, title: "SERUM OSMOLALITY",
        items: [
          "Normal: 275–295 mOsm/kg",
          "< 275 → TRUE hypotonic hyponatremia — proceed",
          "275–295 → isotonic (pseudohyponatremia from lipids/protein)",
          "> 295 → hypertonic (hyperglycemia, mannitol)",
        ] },
      { color: PALETTE.secondary, title: "URINE OSMOLALITY",
        items: [
          "< 100 → water excess: primary polydipsia, beer potomania, tea & toast",
          "100–300 → mixed / resetting",
          "> 300 → ADH active: SIADH, hypovolemia, HF, cirrhosis, hypothyroid, adrenal insufficiency",
        ] },
      { color: PALETTE.accent, title: "URINE SODIUM",
        items: [
          "< 20 → low effective circulating volume (true hypovolemia or HF/cirrhosis)",
          "> 30 → SIADH or renal salt loss (diuretics, CSW, adrenal insufficiency)",
          "Helpful only after urine osm shows ADH is on",
        ] },
    ];

    cards.forEach((c, i) => {
      const x = 0.4 + i * 3.15;
      addCard(s, { x, y: 1.4, w: 3.0, h: 3.6, accent: c.color, header: c.title, body: "" });
      s.addText(bulletBlock(c.items, { fontSize: 10.5, paraSpaceAfter: 6 }), {
        x: x + 0.2, y: 1.9, w: 2.65, h: 3.05, margin: 0, valign: "top",
      });
    });
  }

  // 4. Causes by volume status
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 4, totalSlides: TOTAL,
      title: "Etiology by volume status",
      subtitle: "Once true hypotonic, volume status sorts the differential.",
      source: "UpToDate: Causes of hyponatremia in adults (2026).",
    });

    const buckets = [
      { color: PALETTE.accent, title: "HYPOVOLEMIC  (true Na⁺ loss > water loss)",
        items: [
          "GI losses, diuretics (thiazides top offender), bleeding",
          "Cerebral salt wasting (neuro patients)",
          "Adrenal insufficiency / mineralocorticoid deficiency",
          "Urine Na < 20 (extrarenal); > 30 (renal)",
          "Treat with isotonic saline → stop the ADH drive",
        ] },
      { color: PALETTE.primary, title: "EUVOLEMIC  (water excess, Na⁺ normal)",
        items: [
          "SIADH (CNS, pulmonary, meds, malignancy)",
          "Hypothyroidism",
          "Glucocorticoid deficiency",
          "Low solute intake (tea & toast, beer potomania)",
          "Primary polydipsia",
          "Management differs: fluid restriction ± salt tabs ± vaptan",
        ] },
      { color: PALETTE.secondary, title: "HYPERVOLEMIC  (impaired free water excretion)",
        items: [
          "Heart failure, cirrhosis, nephrotic syndrome, advanced CKD",
          "All share low effective arterial blood volume → ADH on despite expansion",
          "Fluid + Na⁺ restriction; treat underlying disease",
          "Tolvaptan in hospitalized HF / cirrhosis with caution",
        ] },
    ];

    buckets.forEach((b, i) => {
      const y = 1.35 + i * 1.2;
      addCard(s, { x: 0.4, y, w: 9.2, h: 1.1, accent: b.color, header: b.title, body: "" });
      s.addText(b.items.join("  •  "), {
        x: 0.7, y: y + 0.4, w: 8.8, h: 0.65,
        fontFace: FONT.body, fontSize: 10.5, color: PALETTE.charcoal, margin: 0, valign: "top",
      });
    });
  }

  // 5. SIADH
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 5, totalSlides: TOTAL,
      title: "SIADH — the diagnosis of pattern recognition",
      subtitle: "A clinical diagnosis that requires every exclusion before you commit.",
      source: "UpToDate: Pathophysiology and etiology of SIADH (2026).",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "DIAGNOSTIC CRITERIA (Bartter & Schwartz)", body: "",
    });
    s.addText(bulletBlock([
      "Hypotonic (serum osm < 275)",
      "Urine osm > 100",
      "Clinically euvolemic",
      "Urine Na > 30",
      "Normal TSH + cortisol",
      "No recent diuretic",
      "Responds to fluid restriction",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.accent,
      header: "CAUSES — 4 BUCKETS", body: "",
    });
    s.addText(bulletBlock([
      { text: "CNS: stroke, SAH, trauma, meningitis", bold: true },
      { text: "Pulmonary: pneumonia, TB, small-cell lung", bold: true },
      { text: "Meds: SSRIs, carbamazepine, MDMA, thiazides", bold: true },
      { text: "Malignancy (ectopic ADH)", bold: true },
      { text: "Transient: post-op, pain, nausea", italic: true },
    ], { fontSize: 12, paraSpaceAfter: 8 }), {
      x: 5.4, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
  }

  // 6. Correction rate
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 6, totalSlides: TOTAL,
      title: "Correction rate — the central safety question",
      subtitle: "Goal: rise the Na by the right amount in the right time frame — no more.",
      source: "UpToDate: Overview of the treatment of hyponatremia in adults (2026). Hoorn & Zietse, JASN 2017.",
    });

    // Two columns: Acute vs Chronic
    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.accent,
      header: "ACUTE  ( < 48 h or severe symptoms )", body: "",
    });
    s.addText(bulletBlock([
      "Seizure, coma, respiratory arrest = brain swelling",
      { text: "3% saline 100 mL bolus IV over 10 min (may repeat ×2 until symptoms resolve)", bold: true, color: PALETTE.accent },
      "Goal: raise Na⁺ by 4–6 mEq/L quickly",
      "Max 10–12 mEq/L in 24 h, 18 mEq/L in 48 h",
      "Use 3% infusion 0.5–2 mL/kg/h after bolus",
    ], { fontSize: 11, paraSpaceAfter: 5 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "CHRONIC  ( > 48 h or unknown duration )", body: "",
    });
    s.addText(bulletBlock([
      "Brain has adapted — correcting fast causes ODS",
      { text: "Target: ≤ 8 mEq/L per 24 h  (6 if high risk: alcoholism, malnutrition, hypoK)", bold: true, color: PALETTE.primary },
      "Check Na⁺ every 2 h initially",
      "If overshooting: DDAVP 2–4 µg IV q6h + D5W",
      "'DDAVP clamp' — pre-empt overcorrection in high-risk patients",
    ], { fontSize: 11, paraSpaceAfter: 5 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
  }

  // 7. Treatment modalities
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 7, totalSlides: TOTAL,
      title: "Treatment — match the tool to the phenotype",
      subtitle: "Volume status drives the choice as much as the Na⁺ value.",
      source: "UpToDate: Treatment of hyponatremia: syndrome of inappropriate antidiuretic hormone secretion (2026).",
    });

    const rows = [
      [
        { text: "Phenotype", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "First-line", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "Second-line", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "Avoid", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
      ],
      [
        { text: "Severe symptomatic (acute)", options: { bold: true, color: PALETTE.accent, fontFace: FONT.body } },
        "3% saline 100 mL bolus × up to 3", "Continuous 3% at 0.5–2 mL/kg/h; re-check q2h",
        { text: "Isotonic saline (may worsen if SIADH)", options: { italic: true, color: PALETTE.danger } },
      ],
      [
        { text: "SIADH (euvolemic)", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Fluid restriction 800–1000 mL/day",
        "Salt tabs 1–2 g TID ± loop diuretic; selected inpatient tolvaptan if refractory",
        { text: "Isotonic saline (desalination can worsen Na⁺)", options: { italic: true, color: PALETTE.danger } },
      ],
      [
        { text: "Hypovolemic", options: { bold: true, color: PALETTE.warn, fontFace: FONT.body } },
        "Isotonic saline cautiously",
        "Monitor for brisk overcorrection once volume restored",
        { text: "Fluid restriction (worsens ADH drive)", options: { italic: true, color: PALETTE.danger } },
      ],
      [
        { text: "Hypervolemic (HF/cirrhosis)", options: { bold: true, color: PALETTE.secondary, fontFace: FONT.body } },
        "Fluid + Na⁺ restriction; loop diuretic",
        "HF: selected inpatient tolvaptan. Cirrhosis/liver disease: generally avoid or use only with hepatology input",
        { text: "Large volumes of saline; vaptans in liver failure", options: { italic: true, color: PALETTE.danger } },
      ],
      [
        { text: "Drug-induced (thiazide, SSRI)", options: { bold: true, color: PALETTE.good, fontFace: FONT.body } },
        "Stop the drug",
        "Fluid restriction until Na normalizes; expect brisk rise → DDAVP if overcorrecting",
        { text: "Resuming thiazide without reassessment", options: { italic: true, color: PALETTE.danger } },
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [2.2, 2.5, 2.5, 2.0],
      rowH: [0.4, 0.55, 0.55, 0.55, 0.55, 0.55],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 10, valign: "middle",
    });
  }

  // 8. ODS
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 8, totalSlides: TOTAL,
      title: "Osmotic demyelination syndrome (ODS)",
      subtitle: "The preventable complication that defines the field.",
      source: "UpToDate: Osmotic demyelination syndrome and overly rapid correction of hyponatremia (2026).",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.danger,
      header: "HIGH-RISK PATIENTS", body: "",
    });
    s.addText(bulletBlock([
      "Baseline Na⁺ < 120",
      "Chronic hyponatremia (unknown duration = assume chronic)",
      "Alcohol use disorder",
      "Malnutrition / cachexia",
      "Hypokalemia (K⁺ repletion will drive Na⁺ up further)",
      "Liver disease / advanced cirrhosis",
      "Hypoxia",
    ], { fontSize: 11, paraSpaceAfter: 5 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "PREVENTION / RESCUE", body: "",
    });
    s.addText(bulletBlock([
      { text: "Prevention: limit Na⁺ rise to ≤ 8 mEq/L/24 h (6 in high risk)", bold: true },
      "Check Na⁺ q2h during active correction",
      "Replete K⁺ into the Na budget (K rises raise Na too)",
      { text: "Rescue: if overshooting, DDAVP 2–4 µg IV + D5W 3 mL/kg over 1 h", bold: true, color: PALETTE.primary },
      "Goal: re-lower Na⁺ to stay under threshold",
      "Clinical ODS may not appear for 2–6 days — act on labs, not symptoms",
    ], { fontSize: 11, paraSpaceAfter: 5 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 9. Pitfalls
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 9, totalSlides: TOTAL,
      title: "Common pitfalls",
      subtitle: "These are the ones that lead to ODS or to missed diagnoses.",
      source: "Premier Nephrology teaching guide.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.danger,
      header: "AVOID", headerColor: PALETTE.danger, body: "",
    });
    s.addText(bulletBlock([
      "Skipping serum osmolality",
      "Calling SIADH without TSH / cortisol",
      "Isotonic saline in true SIADH",
      "Fluid restriction in hypovolemia",
      "Not checking K (K raises Na)",
      "Correcting without Na q2h",
    ], { fontSize: 12, paraSpaceAfter: 8 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "DO INSTEAD", headerColor: PALETTE.good, body: "",
    });
    s.addText(bulletBlock([
      "Always order: serum osm, urine osm, urine Na",
      "Rule out thyroid / adrenal first",
      "SIADH → fluid restriction, not saline",
      "Hypovolemia → saline, watch rebound",
      "Budget K repletion into 24-h ΔNa",
      "q2h labs until stable",
    ], { fontSize: 12, paraSpaceAfter: 8 }), {
      x: 5.4, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
  }



  // Clinical case — question
  addCaseQuestionSlide(pres, {
    topic: TOPIC, slideNumber: 10, totalSlides: TOTAL,
    vignette: "A 74-year-old woman with small-cell lung cancer presents with 3 days of progressive confusion. Na+ 114 (baseline 138 one month ago), no seizures. Exam: alert but disoriented × 2. Euvolemic. Serum osm 244, urine osm 560, urine Na 48. TSH and AM cortisol normal. On home sertraline; no diuretic. On admission she's given 500 mL NS.",
    question: "What's the diagnosis, is this acute or chronic, and what's the correction target?",
  });

  // Clinical case — answer
  addCaseAnswerSlide(pres, {
    topic: TOPIC, slideNumber: 11, totalSlides: TOTAL,
    answer: "SIADH secondary to small-cell lung cancer; chronic hyponatremia (> 48 h); target Na+ rise ≤ 6–8 mEq/L per 24 h to avoid ODS.",
    teaching: "Classic SIADH: hypotonic hyponatremia, inappropriately concentrated urine, urine Na > 30, euvolemic, normal TSH/cortisol. Isotonic saline can worsen SIADH via desalination. Treatment: fluid restriction (800-1000 mL/day) ± salt tabs; consider inpatient tolvaptan only if refractory and closely monitored. Na+ q2h during correction. If overcorrecting, rescue with DDAVP 2-4 µg IV + D5W 3 mL/kg. High-risk for ODS: alcoholism, malnutrition, hypokalemia, Na+ < 120.",
  });

  // 11. References
  addReferencesSlide(pres, {
    topic: "Hyponatremia",
    references: {
      guidelines: [
        "Expert panel consensus (Am J Med 2013) on hyponatremia",
        "European clinical practice guideline — ERA-EDTA / ESE 2014",
        "Endocrine Society — SIADH guidance",
        "Hoorn & Zietse. JASN 2017 — practical correction approach",
      ],
      trials: [
        "SALT-1 / SALT-2 — tolvaptan in SIADH, HF, cirrhosis",
        "SALTWATER — long-term tolvaptan safety",
        "Sterns et al. — ODS risk and correction pacing",
        "Garrahy et al. — empiric fluid restriction success rates",
      ],
    },
    uptodateTopics: [
      "Causes of hyponatremia in adults",
      "Overview of the treatment of hyponatremia in adults",
      "Treatment of hyponatremia: SIADH and reset osmostat",
      "Osmotic demyelination syndrome and overly rapid correction",
    ],
  });

  const outPath = path.resolve(__dirname, "../../decks/03-Hyponatremia.pptx");
  await pres.writeFile({ fileName: outPath });
  console.log("Wrote:", outPath);
}

build().catch(e => { console.error(e); process.exit(1); });
