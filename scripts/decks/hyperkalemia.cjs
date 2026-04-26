// Hyperkalemia teaching deck
const pptxgen = require("pptxgenjs");
const path = require("path");
const {
  PALETTE, FONT, iconToBase64Png,
  addCoverSlide, newContentSlide, addCard, addPearlBox,
  addReferencesSlide, bulletBlock,
  addCaseSlide, addCaseQuestionSlide, addCaseAnswerSlide,
} = require("./deckStyle.cjs");

const { FaBolt, FaShieldAlt, FaArrowDown, FaTrash,
        FaExclamationTriangle, FaHeartbeat } = require("react-icons/fa");

const TOPIC = "Hyperkalemia";
const TOTAL = 12;

async function build() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Dr. Cheng";
  pres.title = TOPIC;

  const icons = {
    shield: await iconToBase64Png(FaShieldAlt, "#" + PALETTE.primary),
    arrow:  await iconToBase64Png(FaArrowDown, "#" + PALETTE.warn),
    trash:  await iconToBase64Png(FaTrash, "#" + PALETTE.good),
    bolt:   await iconToBase64Png(FaBolt, "#" + PALETTE.accent),
    alert:  await iconToBase64Png(FaExclamationTriangle, "#" + PALETTE.danger),
    heart:  await iconToBase64Png(FaHeartbeat, "#" + PALETTE.accent),
  };

  // SLIDE 1: COVER
  addCoverSlide(pres, {
    topic: "Hyperkalemia",
    subtitle: "The three-phase approach: stabilize, shift, remove",
    tagline: "Calcium stabilizes the myocardium — it does NOT lower the potassium.",
  });


  // SLIDE 2: Why we get consulted + pearl
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 2, totalSlides: TOTAL,
      title: "Why we get consulted",
      subtitle: "The urgency comes from the arrhythmia risk, not the number.",
      source: "UpToDate: Treatment and prevention of hyperkalemia in adults (2026).",
    });
    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "TRIGGERS FOR CONSULT", body: "",
    });
    s.addText(bulletBlock([
      "K ≥ 6.0 or any ECG changes",
      "Refractory despite medical therapy",
      "ESRD / CKD-5 needing KRT",
      "Hyperkalemia in AKI",
      "Recurrent on RAAS / MRA",
      "Binder selection (patiromer / SZC)",
    ], { fontSize: 13, paraSpaceAfter: 8 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
    addPearlBox(s, {
      x: 5.2, y: 1.4, w: 4.4, h: 3.6,
      label: "TEACHING PEARL",
      body: "Three questions in order: is it real? Is the myocardium at risk (ECG)? What's the mechanism? Then treat. Skipping the ECG is the classic error.",
    });
  }

  // SLIDE 3: Pseudohyperkalemia vs real
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 3, totalSlides: TOTAL,
      title: "First question: is this real?",
      subtitle: "Rule out pseudohyperkalemia before you commit to aggressive therapy.",
      source: "UpToDate: Causes and evaluation of hyperkalemia in adults (2026).",
    });

    // Two big cards side by side
    addCard(s, {
      x: 0.4, y: 1.4, w: 4.55, h: 3.5, accent: PALETTE.warn,
      header: "PSEUDOHYPERKALEMIA  —  consider if", body: "",
    });
    s.addText(bulletBlock([
      "Hemolyzed sample (difficult draw, tourniquet)",
      "Fist clenching during phlebotomy",
      "Platelets > 400K or WBC > 50K (cells release K⁺ in tube)",
      "Delayed transport (cold → K⁺ leak)",
      "No ECG changes despite reported K⁺ 7+",
      { text: "Action: redraw (plasma, not serum if thrombocytosis); repeat ECG", bold: true, color: PALETTE.warn },
    ], { fontSize: 11, paraSpaceAfter: 4 }), {
      x: 0.7, y: 1.85, w: 4.15, h: 2.95, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.15, y: 1.4, w: 4.45, h: 3.5, accent: PALETTE.accent,
      header: "TRUE HYPERKALEMIA  —  drivers", body: "",
    });
    s.addText(bulletBlock([
      "↓ Excretion: AKI, CKD 4–5, RAAS, MRA, K-sparing diuretics, heparin, calcineurin inhibitors, trimethoprim-sulfamethoxazole (TMP-SMX)",
      "Cellular shift: acidosis, insulin deficiency (DKA), β-blockade, succinylcholine, digoxin toxicity",
      "↑ Load: tumor lysis, rhabdo, massive transfusion, K+ supplements, salt substitutes",
      "Hypoaldo: type 4 RTA (DM), adrenal insufficiency",
      { text: "Action: treat the mechanism, not just the number", bold: true, color: PALETTE.accent },
    ], { fontSize: 11, paraSpaceAfter: 4 }), {
      x: 5.45, y: 1.85, w: 4.05, h: 2.95, margin: 0, valign: "top",
    });
  }

  // SLIDE 4: ECG progression
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 4, totalSlides: TOTAL,
      title: "ECG: the driver of urgency",
      subtitle: "ECG changes correlate poorly with K⁺ level — but any change means membrane stabilization now.",
      source: "UpToDate: Clinical manifestations of hyperkalemia in adults (2026).",
    });

    const rows = [
      [
        { text: "K⁺ range", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center", valign: "middle", fontFace: FONT.body } },
        { text: "Typical ECG", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "Action", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
      ],
      [
        { text: "5.5 – 6.0", options: { align: "center", bold: true, color: PALETTE.primary, fontFace: FONT.title, fontSize: 16, valign: "middle" } },
        "Often none; occasional peaked T",
        "Hold RAAS/MRA; diet; consider binder"
      ],
      [
        { text: "6.0 – 6.5", options: { align: "center", bold: true, color: PALETTE.warn, fontFace: FONT.title, fontSize: 16, valign: "middle" } },
        "Peaked T waves (narrow-based, tall)",
        "Shift therapy; binder; reassess every 2 h"
      ],
      [
        { text: "6.5 – 7.5", options: { align: "center", bold: true, color: PALETTE.accent, fontFace: FONT.title, fontSize: 16, valign: "middle" } },
        "PR prolongation, QRS widening, loss of P",
        "Calcium NOW; shift; strongly consider KRT"
      ],
      [
        { text: "> 7.5", options: { align: "center", bold: true, color: PALETTE.danger, fontFace: FONT.title, fontSize: 16, valign: "middle" } },
        "Sine wave, VT/VF, asystole",
        "Calcium, shift, emergent KRT"
      ],
    ];
    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [1.3, 4.2, 3.7],
      rowH: [0.4, 0.55, 0.55, 0.55, 0.55],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 11, valign: "middle",
    });

    s.addShape("rect", {
      x: 0.4, y: 4.15, w: 9.2, h: 0.85,
      fill: { color: PALETTE.ice }, line: { color: PALETTE.secondary, width: 0.5 },
    });
    s.addText([
      { text: "Classic teaching error: ", options: { bold: true, color: PALETTE.accent } },
      { text: "waiting to treat until ECG changes appear. Some patients with K⁺ 6.0 have widened QRS; others with K⁺ 7 look normal. Treat based on rate of rise, AKI context, and ECG together — not K⁺ value alone." },
    ], {
      x: 0.6, y: 4.22, w: 8.9, h: 0.7,
      fontFace: FONT.body, fontSize: 11, color: PALETTE.charcoal, margin: 0, valign: "middle",
    });
  }

  // SLIDE 5: Three-phase framework
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 5, totalSlides: TOTAL,
      title: "Three phases — don't mix them up",
      subtitle: "Phase 1 protects the heart. Phase 2 buys time. Phase 3 removes the potassium.",
      source: "UpToDate: Treatment and prevention of hyperkalemia in adults (2026).",
    });

    const phases = [
      { n: "1", title: "STABILIZE", icon: icons.shield, color: PALETTE.primary,
        body: "Protect the myocardium. Buys 30–60 minutes. Does NOT lower K⁺.",
      },
      { n: "2", title: "SHIFT", icon: icons.arrow, color: PALETTE.warn,
        body: "Move K⁺ intracellularly. Drops K⁺ 0.5–1.0 mEq/L for 2–6 h. Does NOT remove K⁺.",
      },
      { n: "3", title: "REMOVE", icon: icons.trash, color: PALETTE.good,
        body: "Excrete K⁺ from the body. The only definitive step.",
      },
    ];

    phases.forEach((p, i) => {
      const x = 0.4 + i * 3.15;
      const y = 1.35;
      // card
      addCard(s, { x, y, w: 3.0, h: 3.65, accent: p.color, header: "", body: "" });
      // phase number in circle
      s.addShape("ellipse", {
        x: x + 1.1, y: y + 0.3, w: 0.8, h: 0.8,
        fill: { color: p.color }, line: { type: "none" },
      });
      s.addText(p.n, {
        x: x + 1.1, y: y + 0.3, w: 0.8, h: 0.8,
        fontFace: FONT.title, fontSize: 32, bold: true, color: "FFFFFF",
        align: "center", valign: "middle", margin: 0,
      });
      s.addText(p.title, {
        x: x + 0.2, y: y + 1.2, w: 2.6, h: 0.4,
        fontFace: FONT.title, fontSize: 18, bold: true,
        color: p.color, align: "center", margin: 0,
      });
      s.addText(p.body, {
        x: x + 0.25, y: y + 1.7, w: 2.5, h: 1.9,
        fontFace: FONT.body, fontSize: 11, color: PALETTE.charcoal,
        align: "center", margin: 0, valign: "top",
      });
    });

    s.addText("Mixing phases is the classic trainee error: giving calcium and stopping, or giving insulin without a definitive removal plan.", {
      x: 0.4, y: 5.08, w: 9.2, h: 0.25,
      fontFace: FONT.body, fontSize: 10, italic: true,
      color: PALETTE.muted, align: "center", margin: 0,
    });
  }

  // SLIDE 6: Drug table
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 6, totalSlides: TOTAL,
      title: "Drugs, doses, and kinetics",
      subtitle: "Know onset and duration — it tells you when to re-check and re-dose.",
      source: "UpToDate: Treatment and prevention of hyperkalemia in adults (2026).",
    });

    const rows = [
      [
        { text: "Drug", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "Dose", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "Onset / Duration", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
        { text: "Notes", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body, valign: "middle" } },
      ],
      [
        { text: "Ca gluconate 10%", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "10 mL IV over 2–5 min (can repeat ×1)", "1–3 min / 30–60 min",
        { text: "STABILIZE only. Avoid peripheral Ca chloride (tissue necrosis). Caution on digoxin.", options: { italic: true } },
      ],
      [
        { text: "Insulin + dextrose", options: { bold: true, color: PALETTE.warn, fontFace: FONT.body } },
        "10 U reg IV (or 5 U if eGFR < 30) + 25 g D50", "10–20 min / 4–6 h",
        { text: "Hypoglycemia in ~20–30% at 10 U in renal failure; glucose q1h × 6 h.", options: { italic: true } },
      ],
      [
        { text: "Albuterol", options: { bold: true, color: PALETTE.warn, fontFace: FONT.body } },
        "10–20 mg nebulized (4–8× the asthma dose)", "30 min / 2–4 h",
        { text: "Additive with insulin. Avoid in active ischemia.", options: { italic: true } },
      ],
      [
        { text: "NaHCO₃", options: { bold: true, color: PALETTE.warn, fontFace: FONT.body } },
        "150 mEq in D5W over hours (if acidosis)", "Hours",
        { text: "ONLY if metabolic acidosis — not a primary K⁺ lowerer.", options: { italic: true } },
      ],
      [
        { text: "Furosemide", options: { bold: true, color: PALETTE.good, fontFace: FONT.body } },
        "40–80 mg IV if UOP present", "30–60 min / 4–6 h",
        { text: "Removes K⁺ via urine; useless if anuric.", options: { italic: true } },
      ],
      [
        { text: "Patiromer / SZC", options: { bold: true, color: PALETTE.good, fontFace: FONT.body } },
        "Patiromer 8.4 g PO daily • SZC 10 g TID × 48 h", "Patiromer ~7 h • SZC ~1 h",
        { text: "GI binders. Outpatient control on RAAS. Not for life-threatening hyperK.", options: { italic: true } },
      ],
      [
        { text: "Hemodialysis", options: { bold: true, color: PALETTE.good, fontFace: FONT.body } },
        "K 2.0 or 1.0 bath × 3–4 h", "Minutes / hours",
        { text: "Definitive. Removes 25–50 mEq/session. Expect rebound in 2–4 h.", options: { italic: true } },
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [1.6, 2.4, 1.5, 3.7],
      rowH: [0.35, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 9.5, valign: "middle",
    });
  }

  // SLIDE 7: Algorithm
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 7, totalSlides: TOTAL,
      title: "Urgent hyperkalemia algorithm",
      subtitle: "From the moment you're paged: this is what happens in order.",
      source: "UpToDate: Treatment and prevention of hyperkalemia in adults (2026).",
    });

    const steps = [
      { step: "1", title: "Get the ECG immediately", desc: "Peaked T, wide QRS, or any change → emergency tier." },
      { step: "2", title: "Stabilize if ECG changes OR K ≥ 6.5", desc: "Calcium gluconate 1 g IV. Re-dose if ECG not improved in 5 min." },
      { step: "3", title: "Shift", desc: "Insulin 10 U + D50 25 g IV. Albuterol 10–20 mg neb. Bicarb if pH < 7.20." },
      { step: "4", title: "Remove", desc: "Loop diuretic if UOP present. Binder (SZC/patiromer). Call dialysis if refractory or anuric." },
      { step: "5", title: "Fix mechanism, monitor", desc: "Hold RAAS/MRA/K⁺ supplements. Repeat K⁺ + ECG q1–2 h. Expect rebound in 2–4 h." },
    ];

    steps.forEach((s2, i) => {
      const y = 1.35 + i * 0.68;
      s.addShape("ellipse", {
        x: 0.45, y: y + 0.05, w: 0.5, h: 0.5,
        fill: { color: PALETTE.accent }, line: { type: "none" },
      });
      s.addText(s2.step, {
        x: 0.45, y: y + 0.05, w: 0.5, h: 0.5,
        fontFace: FONT.title, fontSize: 20, bold: true, color: "FFFFFF",
        align: "center", valign: "middle", margin: 0,
      });
      s.addShape("rect", {
        x: 1.1, y: y, w: 8.5, h: 0.58,
        fill: { color: PALETTE.card }, line: { color: PALETTE.border, width: 0.5 },
      });
      s.addText([
        { text: s2.title, options: { bold: true, color: PALETTE.primary, fontSize: 12, fontFace: FONT.body } },
        { text: "   " + s2.desc, options: { color: PALETTE.charcoal, fontSize: 10.5, fontFace: FONT.body } },
      ], {
        x: 1.25, y: y + 0.03, w: 8.25, h: 0.52,
        margin: 0, valign: "middle",
      });
    });
  }

  // SLIDE 8: Outpatient control
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 8, totalSlides: TOTAL,
      title: "Outpatient: keep the RAAS on",
      subtitle: "Modern binders let us continue ACEi / ARB / finerenone / spironolactone in CKD.",
      source: "UpToDate: Treatment and prevention of hyperkalemia in adults (2026). patiromer + spironolactone in resistant HTN trial (AMBER), patiromer + MRA in HFrEF trial (DIAMOND).",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.55, accent: PALETTE.primary,
      header: "BEFORE STOPPING RAAS", body: "",
    });
    s.addText(bulletBlock([
      "Re-check K⁺ — fasting, non-hemolyzed sample",
      "Low-K⁺ diet counseling (not salt substitutes!)",
      "Diuretic if volume-tolerant (loop ± thiazide)",
      "Treat metabolic acidosis: HCO₃⁻ if < 18–20",
      "Stop K-sparing supplements, NSAIDs, bactrim",
      { text: "Only after this — try a binder", bold: true, color: PALETTE.primary },
    ], { fontSize: 11.5, paraSpaceAfter: 5 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.55, accent: PALETTE.good,
      header: "BINDERS — PATIROMER vs SZC", body: "",
    });
    s.addText(bulletBlock([
      { text: "Patiromer (Veltassa): 8.4–25.2 g PO daily. Takes 7 h for onset. Separate from other meds by 3 h. Constipation, ↓Mg²⁺.", },
      { text: "Sodium zirconium (Lokelma): 10 g TID × 48 h, then 10 g daily. Faster (1 h). High sodium load (caution HF).", },
      { text: "Both permit continuation of RAAS / MRA in CKD (AMBER trial — patiromer; DIAMOND — patiromer in HFrEF).", bold: true, color: PALETTE.good },
      { text: "Kayexalate (sodium polystyrene sulfonate (SPS)): avoid — risk of bowel necrosis; use SZC instead.", italic: true, color: PALETTE.danger },
    ], { fontSize: 11, paraSpaceAfter: 6 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
  }

  // SLIDE 9: Pitfalls
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 9, totalSlides: TOTAL,
      title: "Common pitfalls",
      subtitle: "If you avoid these, you'll stay out of trouble.",
      source: "Premier Nephrology teaching guide.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.danger,
      header: "AVOID", headerColor: PALETTE.danger, body: "",
    });
    s.addText(bulletBlock([
      "Forgetting the ECG",
      "Assuming calcium lowered K",
      "Bicarb without acidosis",
      "Loop in anuria",
      "Kayexalate when SZC available",
      "Stopping RAAS permanently",
      "Missing insulin hypoglycemia",
    ], { fontSize: 12, paraSpaceAfter: 8 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "DO INSTEAD", headerColor: PALETTE.good, body: "",
    });
    s.addText(bulletBlock([
      "Always present the ECG",
      "State: 'calcium stabilized; K still X'",
      "Check bicarb before NaHCO3",
      "Anuria → dialysis for removal",
      "SZC / patiromer, not Kayexalate",
      "Diet + binder before stopping RAAS",
      "Glucose q1h × 6 h after insulin",
    ], { fontSize: 12, paraSpaceAfter: 8 }), {
      x: 5.4, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
  }


  // Clinical case — question
  addCaseQuestionSlide(pres, {
    topic: TOPIC, slideNumber: 10, totalSlides: TOTAL,
    vignette: "A 68-year-old woman with T2DM, CKD 3b (eGFR 35), HFrEF 30%, on lisinopril 40 mg, spironolactone 25 mg, metoprolol, and furosemide 40 mg. ER check-in K+ 6.8 after missing a week of follow-up. BP 138/80, HR 62. ECG: peaked T waves, PR 220, QRS 105 ms. Pt is asymptomatic.",
    question: "What's the immediate sequence of interventions, and what's your outpatient plan?",
  });

  // Clinical case — answer
  addCaseAnswerSlide(pres, {
    topic: TOPIC, slideNumber: 11, totalSlides: TOTAL,
    answer: "Calcium gluconate 1 g IV now, then shift (insulin 10 U + D50 25 g; albuterol 10 mg neb), then remove (loop diuretic if UOP, SZC 10 g TID).",
    teaching: "Three phases in order: STABILIZE → SHIFT → REMOVE. Calcium protects the heart but does NOT lower K+. After shift, the K+ rebounds in 4-6 h. Outpatient: her RAAS + MRA + CKD + diabetes are all driving hyperK, but these drugs are prognostically essential. Rather than stopping them permanently, add SZC or patiromer (AMBER, DIAMOND) and continue RAAS/MRA at adjusted doses. Diet counseling (avoid salt substitutes, bananas, potatoes) and adherence check are equally important.",
  });

  addReferencesSlide(pres, {
    topic: "Hyperkalemia",
    references: {
      guidelines: [
        "KDIGO 2024 CKD Guideline (potassium management)",
        "ESC/AHA: hyperkalemia in HFrEF on MRA",
        "ERA-EDTA position statement on hyperkalemia management",
        "KDOQI commentary on dietary K⁺ in CKD",
      ],
      trials: [
        "PEARL-HF — patiromer in HFrEF on MRA",
        "OPAL-HK — patiromer for RAAS continuation",
        "AMBER — patiromer in resistant HTN + CKD on spiro",
        "DIAMOND — patiromer enables MRA in HFrEF",
        "HARMONIZE — SZC maintenance of normokalemia",
      ],
    },
    uptodateTopics: [
      "Causes and evaluation of hyperkalemia in adults",
      "Clinical manifestations of hyperkalemia in adults",
      "Treatment and prevention of hyperkalemia in adults",
    ],
  });

  const outPath = path.resolve(__dirname, "../../decks/02-Hyperkalemia.pptx");
  await pres.writeFile({ fileName: outPath });
  console.log("Wrote:", outPath);
}

build().catch(e => { console.error(e); process.exit(1); });
