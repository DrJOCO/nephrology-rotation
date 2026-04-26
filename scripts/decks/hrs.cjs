// Hepatorenal Syndrome teaching deck
const pptxgen = require("pptxgenjs");
const path = require("path");
const {
  PALETTE, FONT, addCoverSlide, newContentSlide, addCard, addPearlBox,
  addReferencesSlide, bulletBlock,
  addCaseSlide, addCaseQuestionSlide, addCaseAnswerSlide,
} = require("./deckStyle.cjs");

const TOPIC = "Hepatorenal Syndrome";
const TOTAL = 12;

async function build() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Dr. Cheng";
  pres.title = TOPIC;

  addCoverSlide(pres, {
    topic: "Hepatorenal Syndrome",
    subtitle: "AKI in the cirrhotic — a diagnosis of exclusion",
    tagline: "Most AKI in cirrhosis is NOT HRS. Exclude prerenal, ATN, GN, obstruction first.",
  });


  // 2. Why consulted + pearl
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 2, totalSlides: TOTAL,
      title: "Why we get consulted",
      subtitle: "Rising Cr in a cirrhotic with ascites — primary team wants the HRS call.",
      source: "ICA-Acute Disease Quality Initiative (ADQI) 2024 hepatorenal syndrome with acute kidney injury (HRS-AKI) Consensus. American Association for the Study of Liver Diseases (AASLD) 2021 ascites guideline.",
    });
    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "CONSULT TRIGGERS", body: "",
    });
    s.addText(bulletBlock([
      "AKI in cirrhotic with ascites",
      "Refractory ascites + rising Cr",
      "Diuretic hold + albumin — responded?",
      "Terlipressin vs midodrine/octreotide",
      "KRT: bridge or futile?",
      "Transplant / MELD trajectory",
      "SBP screen + treatment",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
    addPearlBox(s, {
      x: 5.2, y: 1.4, w: 4.4, h: 3.6,
      label: "TEACHING PEARL",
      body: "HRS is never the first answer. Most AKI in cirrhosis is prerenal or ATN — HRS ~12%. Rule out everything else first. Paracentesis to exclude SBP is mandatory.",
    });
  }

  // 3. AKI differential in cirrhosis
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 3, totalSlides: TOTAL,
      title: "AKI in cirrhosis — the differential",
      subtitle: "Always walk through every cause before calling HRS.",
      source: "ICA-ADQI 2024 Consensus. UpToDate: Hepatorenal syndrome in adults (2026).",
    });

    const buckets = [
      { color: PALETTE.primary, title: "PRE-RENAL (~44%)",
        body: "GI bleed, over-diuresis, large-volume paracentesis without albumin, lactulose diarrhea, poor PO. Responds to volume/albumin." },
      { color: PALETTE.accent, title: "ATN (~30%)",
        body: "Sepsis (SBP, cellulitis, UTI), contrast, nephrotoxins. Does NOT respond to volume alone; muddy brown casts." },
      { color: PALETTE.danger, title: "HRS (~12%)",
        body: "Physiologic: splanchnic vasodilation → systemic hypotension → renal vasoconstriction. DIAGNOSIS OF EXCLUSION." },
      { color: PALETTE.warn, title: "POST-RENAL",
        body: "Uncommon. Tense ascites can rarely obstruct. Always get an ultrasound." },
      { color: PALETTE.good, title: "GN / INTRINSIC",
        body: "IgA (alcoholic cirrhosis), HCV → cryo/MPGN, HBV → membranous. Check UA + serologies." },
      { color: PALETTE.secondary, title: "DRUG / TOXIC",
        body: "NSAIDs (especially toxic in cirrhosis), aminoglycosides, vancomycin, ACE inhibitors in borderline." },
    ];

    buckets.forEach((b, i) => {
      const row = Math.floor(i / 2), col = i % 2;
      const x = 0.4 + col * 4.65, y = 1.4 + row * 1.2;
      addCard(s, { x, y, w: 4.5, h: 1.1, accent: b.color, header: b.title, body: "" });
      s.addText(b.body, {
        x: x + 0.2, y: y + 0.4, w: 4.25, h: 0.65,
        fontFace: FONT.body, fontSize: 10, color: PALETTE.charcoal, margin: 0, valign: "top",
      });
    });
  }

  // 4. Diagnostic criteria
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 4, totalSlides: TOTAL,
      title: "HRS-AKI diagnostic criteria (ICA-ADQI 2024)",
      subtitle: "All criteria must be met — and alternatives excluded.",
      source: "International Club of Ascites / ADQI 2024 Consensus.",
    });

    const steps = [
      { n: "1", body: "Cirrhosis with ascites (both required; HRS does not occur without ascites)." },
      { n: "2", body: "AKI by KDIGO: serum Cr ↑ ≥ 0.3 mg/dL within 48 h OR ≥ 50% baseline rise within 7 days." },
      { n: "3", body: "No improvement after adequate volume resuscitation when clinically indicated. ICA-ADQI 2024 recommends against mandatory 48-h albumin for everyone." },
      { n: "4", body: "Absence of strong evidence for another primary cause: shock, nephrotoxin injury, obstruction, ATN, GN, or uncontrolled sepsis/SBP." },
      { n: "5", body: "HRS-AKI can coexist with CKD, mild proteinuria, hematuria, or tubular injury — the key is whether another cause better explains the AKI." },
    ];

    steps.forEach((row, i) => {
      const y = 1.35 + i * 0.72;
      s.addShape("ellipse", {
        x: 0.45, y: y + 0.08, w: 0.45, h: 0.45,
        fill: { color: PALETTE.primary }, line: { type: "none" },
      });
      s.addText(row.n, {
        x: 0.45, y: y + 0.08, w: 0.45, h: 0.45,
        fontFace: FONT.title, fontSize: 18, bold: true, color: "FFFFFF",
        align: "center", valign: "middle", margin: 0,
      });
      s.addShape("rect", {
        x: 1.05, y: y, w: 8.55, h: 0.62,
        fill: { color: PALETTE.card }, line: { color: PALETTE.border, width: 0.5 },
      });
      s.addText(row.body, {
        x: 1.2, y: y + 0.05, w: 8.3, h: 0.55,
        fontFace: FONT.body, fontSize: 10.5, color: PALETTE.charcoal, margin: 0, valign: "middle",
      });
    });
  }

  // 5. SBP screening
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 5, totalSlides: TOTAL,
      title: "SBP — the precipitant you must rule out",
      subtitle: "Diagnostic paracentesis on every cirrhotic with AKI. Treat before you search for HRS.",
      source: "AASLD 2021 ascites guideline. UpToDate: SBP diagnosis & treatment (2026).",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.danger,
      header: "WHO NEEDS PARACENTESIS", headerColor: PALETTE.danger, body: "",
    });
    s.addText(bulletBlock([
      "Any cirrhotic with ascites AND any of:",
      "  – Admission with AKI or fever or abdominal pain",
      "  – Encephalopathy, GI bleed, or new leukocytosis",
      "  – Unexplained clinical deterioration",
      { text: "Diagnostic threshold: PMN > 250/µL in ascites", bold: true, color: PALETTE.danger },
      "Send: cell count + diff, albumin (serum-ascites albumin gradient (SAAG)), culture in blood culture bottles",
      "Do NOT wait for labs before empiric therapy if high suspicion",
    ], { fontSize: 10.5, paraSpaceAfter: 4 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "TREATMENT", body: "",
    });
    s.addText(bulletBlock([
      "Empiric: ceftriaxone 2 g IV daily × 5–7 days",
      "Ceftazidime or carbapenem if nosocomial / recent hospitalization",
      { text: "Albumin: 1.5 g/kg on day 1, 1 g/kg on day 3 — ↓ HRS and mortality (Sort et al, NEJM 1999)", bold: true, color: PALETTE.primary },
      "Hold non-selective BBs during episode (hypotension risk)",
      "Stop diuretics if AKI present",
      "Secondary prophylaxis: norfloxacin or SMX-TMP daily",
    ], { fontSize: 10.5, paraSpaceAfter: 4 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 6. Treatment
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 6, totalSlides: TOTAL,
      title: "HRS-AKI treatment",
      subtitle: "Vasoconstrictors + albumin bridge to transplant. KRT is supportive, not curative.",
      source: "CONFIRM (NEJM 2021). AASLD / ICA 2024 guidelines.",
    });

    const rows = [
      [
        { text: "Option", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Regimen", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Setting", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
      ],
      [
        { text: "Terlipressin  (Terlivaz)", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "0.85 mg IV q6h (CONFIRM dose); escalate to 1.7 mg q6h if Cr not ↓ ≥ 30% by day 4; up to 14 d",
        { text: "ICU/ward with monitoring; avoid if volume overloaded (respiratory failure ~11% vs ~2% in CONFIRM)", options: { italic: true } },
      ],
      [
        { text: "Norepinephrine  (ICU)", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "0.5–3 mg/h IV to target MAP rise by 10 mmHg",
        "ICU-only; alternative where terlipressin unavailable",
      ],
      [
        { text: "Midodrine + octreotide + albumin", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Midodrine 7.5 mg PO TID (titrate to 12.5) + octreotide 100 µg SC TID + albumin 20–40 g/day",
        "Floor/outpatient bridge — less effective than terlipressin",
      ],
      [
        { text: "Albumin (adjunct)", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "1 g/kg on day 1 (max 100 g), then 20–40 g/day",
        "Required along with any vasoconstrictor",
      ],
      [
        { text: "KRT", options: { bold: true, color: PALETTE.accent, fontFace: FONT.body } },
        "Standard AEIOU indications",
        "Bridge to transplant only; not restorative for HRS",
      ],
      [
        { text: "TIPS", options: { bold: true, color: PALETTE.accent, fontFace: FONT.body } },
        "Selected refractory ascites / HRS candidates",
        "Worsens encephalopathy; MELD must be favorable",
      ],
      [
        { text: "Liver transplant", options: { bold: true, color: PALETTE.good, fontFace: FONT.body } },
        "Definitive",
        "Kidney often recovers; occasionally combined simultaneous liver-kidney transplant (SLK)",
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [2.2, 3.8, 3.2],
      rowH: [0.35, 0.5, 0.4, 0.55, 0.4, 0.4, 0.4, 0.4],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 9, valign: "middle",
    });
  }

  // 7. Prognosis & transplant
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 7, totalSlides: TOTAL,
      title: "Prognosis and transplant candidacy",
      subtitle: "HRS is a sign of end-stage liver disease. MELD captures it; transplant is the answer.",
      source: "UpToDate: Liver transplant in cirrhosis with AKI (2026).",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.accent,
      header: "PROGNOSIS", body: "",
    });
    s.addText(bulletBlock([
      "Without transplant: median survival weeks to months",
      "Acute HRS (AKI): worse than non-acute HRS (CKD-like)",
      "Need for KRT predicts high mortality without transplant",
      { text: "Terlipressin verified HRS reversal rate ~32% (CONFIRM primary endpoint); complete reversal improves survival", bold: true, color: PALETTE.accent },
      "Early listing + MELD progression = priority allocation",
      "Non-reversal after 14 days of terlipressin = treatment failure",
    ], { fontSize: 10.5, paraSpaceAfter: 4 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "SIMULTANEOUS LIVER-KIDNEY (SLK)", body: "",
    });
    s.addText(bulletBlock([
      "Considered when HRS prolonged — unlikely to recover kidney post-LT alone",
      { text: "UNOS SLK criteria (2017): any of—", bold: true },
      "  – CKD: GFR ≤ 60 for > 90 d PLUS dialysis or GFR ≤ 30 at listing",
      "  – AKI on KRT for ≥ 6 weeks",
      "  – AKI with GFR/CrCl ≤ 25 for ≥ 6 weeks",
      "  – Combination of KRT + GFR criteria totaling 6 weeks",
      "  – Metabolic disease (primary hyperoxaluria, atypical HUS)",
      "Multidisciplinary review + transplant center decision",
    ], { fontSize: 10, paraSpaceAfter: 3 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 8. Landmark trials
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 8, totalSlides: TOTAL,
      title: "Landmark trials in HRS",
      subtitle: "What changed practice — and what's still unknown.",
      source: "Full citations on references slide.",
    });

    const rows = [
      [
        { text: "Trial", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center" } },
        { text: "Year", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, align: "center" } },
        { text: "Takeaway", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary } } },
      ],
      ["Sort et al.",      "1999", "Albumin + ceftriaxone vs ceftriaxone alone in SBP — ↓ HRS, ↓ mortality."],
      ["OT-0401",          "2008", "Terlipressin + albumin vs albumin — first positive US trial."],
      ["REVERSE",          "2016", "Terlipressin reduced HRS reversal vs placebo (~19% vs ~12%, did not meet FDA)."],
      ["CONFIRM",          "2021", "Terlipressin + albumin vs placebo + albumin — verified HRS reversal 32% vs 17%. FDA approval 2022."],
      ["Cavallin et al.",  "2015", "Terlipressin continuous infusion vs boluses — similar efficacy, fewer AEs."],
      ["MARS / Prometheus", "2012", "Artificial liver support — no survival benefit in HRS."],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [1.8, 0.8, 6.6],
      rowH: [0.35, 0.4, 0.45, 0.45, 0.55, 0.45, 0.4],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 10, valign: "middle",
    });
  }

  // 9. Common pitfalls
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 9, totalSlides: TOTAL,
      title: "Common pitfalls",
      subtitle: "The errors that lead to missed SBP, missed alternative diagnoses, or terlipressin harm.",
      source: "Premier Nephrology teaching guide.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.danger,
      header: "AVOID", headerColor: PALETTE.danger, body: "",
    });
    s.addText(bulletBlock([
      "Calling HRS without paracentesis",
      "Stopping volume at 24 h",
      "Skipping renal US",
      "Terlipressin in volume overload",
      "Ignoring UA (RBC casts = GN)",
      "Trusting FeNa in cirrhosis",
      "Delay in transplant referral",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "DO INSTEAD", headerColor: PALETTE.good, body: "",
    });
    s.addText(bulletBlock([
      "Paracentesis on every cirrhotic AKI",
      "Albumin 1 g/kg + hold diuretics",
      "Renal US, UA, proteinuria",
      "Check volume before terlipressin",
      "Bland UA supports HRS",
      "Prerenal + ATN first; HRS third",
      "Notify transplant team day 1",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 5.4, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
  }



  // Clinical case — question
  addCaseQuestionSlide(pres, {
    topic: TOPIC, slideNumber: 10, totalSlides: TOTAL,
    vignette: "A 58-year-old woman with alcohol-related cirrhosis (MELD 22), ascites on furosemide/spironolactone, admitted with decreasing UOP. BP 92/58, HR 98. Cr 2.4 (baseline 1.1). Ascites tap: PMN 80/µL, culture pending. UA: bland, < 200 mg/day protein. US: normal kidneys. Diuretics held; albumin given for suspected low effective arterial volume; Cr remains 2.3 after reassessment.",
    question: "Does she meet HRS-AKI criteria, and what's the next step?",
  });

  // Clinical case — answer
  addCaseAnswerSlide(pres, {
    topic: TOPIC, slideNumber: 11, totalSlides: TOTAL,
    answer: "Yes — likely HRS-AKI after exclusion workup (cirrhosis + ascites, KDIGO AKI, no response after indicated resuscitation/diuretic hold, bland UA, no obstruction, no shock, no clear alternative cause). Start terlipressin + albumin with volume monitoring, and notify transplant hepatology now.",
    teaching: "HRS-AKI is a diagnosis of exclusion, but the 2024 ICA-ADQI criteria no longer require a fixed 48-h albumin challenge or strict proteinuria/hematuria cutoffs. Paracentesis is still mandatory because SBP can precipitate AKI; PMN <250 makes SBP less likely while cultures are pending. Terlipressin 0.85 mg IV q6h (CONFIRM dose) + albumin; assess volume status carefully because respiratory failure risk rises if overloaded. Alternatives: norepinephrine in ICU or midodrine/octreotide when stronger options are unavailable. SLK is for prolonged kidney failure: sustained KRT ≥6 weeks or GFR/CrCl ≤25 for ≥6 weeks, or CKD criteria.",
  });

  // 11. References
  addReferencesSlide(pres, {
    topic: "Hepatorenal Syndrome",
    references: {
      guidelines: [
        "ICA-ADQI 2024 HRS-AKI Consensus",
        "AASLD 2021 Ascites in Cirrhosis",
        "EASL 2018 Clinical Practice Guidelines",
        "United Network for Organ Sharing (UNOS) SLK Allocation Policy (2017)",
      ],
      trials: [
        "Sort et al. — NEJM 1999 (SBP albumin)",
        "OT-0401 — Gastroenterology 2008",
        "REVERSE — Hepatology 2016",
        "CONFIRM — NEJM 2021",
        "Cavallin et al. — Hepatology 2015",
        "MARS / Prometheus — Hepatology 2012",
      ],
    },
    uptodateTopics: [
      "Hepatorenal syndrome in adults: Pathogenesis and diagnosis",
      "Hepatorenal syndrome in adults: Treatment",
      "Spontaneous bacterial peritonitis in adults",
      "Liver transplantation in cirrhosis with AKI",
    ],
  });

  const outPath = path.resolve(__dirname, "../../decks/09-HRS.pptx");
  await pres.writeFile({ fileName: outPath });
  console.log("Wrote:", outPath);
}

build().catch(e => { console.error(e); process.exit(1); });
