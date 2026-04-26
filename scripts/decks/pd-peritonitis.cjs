// PD Peritonitis teaching deck
const pptxgen = require("pptxgenjs");
const path = require("path");
const {
  PALETTE, FONT, addCoverSlide, newContentSlide, addCard, addPearlBox,
  addReferencesSlide, bulletBlock,
  addCaseSlide, addCaseQuestionSlide, addCaseAnswerSlide,
} = require("./deckStyle.cjs");

const TOPIC = "PD Peritonitis";
const TOTAL = 12;

async function build() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Dr. Cheng";
  pres.title = TOPIC;

  addCoverSlide(pres, {
    topic: "PD Peritonitis",
    subtitle: "Diagnosis, empiric therapy, catheter decisions",
    tagline: "Cloudy effluent = peritonitis until proven otherwise. Culture FIRST, then IP antibiotics.",
  });


  // 2. Why consulted + pearl
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 2, totalSlides: TOTAL,
      title: "Why we get consulted",
      subtitle: "PD patient with cloudy effluent, pain, or fever.",
      source: "ISPD 2022 Peritonitis Guidelines.",
    });
    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.primary,
      header: "CONSULT TRIGGERS", body: "",
    });
    s.addText(bulletBlock([
      "Cloudy effluent",
      "Abdominal pain in PD patient",
      "Fever / leukocytosis",
      "Exit-site or tunnel infection",
      "Refractory at 48–72 h",
      "Relapsing / recurrent peritonitis",
      "Fungal — urgent catheter decision",
    ], { fontSize: 12, paraSpaceAfter: 8 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
    addPearlBox(s, {
      x: 5.2, y: 1.4, w: 4.4, h: 3.6,
      label: "TEACHING PEARL",
      body: "Send effluent in blood culture bottles BEFORE antibiotics (much higher yield). Then start empiric IP therapy. Treat on clinical suspicion + cloudy.",
    });
  }

  // 3. Diagnosis
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 3, totalSlides: TOTAL,
      title: "Diagnosis: the 2-of-3 rule",
      subtitle: "Make the diagnosis when any 2 of 3 criteria are met.",
      source: "International Society for Peritoneal Dialysis (ISPD) 2022 Peritonitis Guidelines.",
    });

    const criteria = [
      { n: "1", label: "CLINICAL FEATURES",
        body: "Abdominal pain and/or cloudy PD effluent. Pain is usually diffuse; rebound + rigidity = surgical abdomen until proven otherwise." },
      { n: "2", label: "EFFLUENT WBC",
        body: "> 100 cells/µL (with at least 2-h dwell time) AND > 50% polymorphonuclear leukocytes (PMNs). In short dwell (automated peritoneal dialysis (APD)), weight the PMN % heavily." },
      { n: "3", label: "POSITIVE CULTURE",
        body: "Organism isolated from PD effluent. Yield is higher if sent in blood-culture bottles (ISPD recommended). Culture-negative peritonitis ~15% (often pre-antibiotic draw)." },
    ];

    criteria.forEach((row, i) => {
      const y = 1.4 + i * 1.25;
      s.addShape("ellipse", {
        x: 0.5, y: y, w: 0.6, h: 0.6,
        fill: { color: PALETTE.primary }, line: { type: "none" },
      });
      s.addText(row.n, {
        x: 0.5, y: y, w: 0.6, h: 0.6,
        fontFace: FONT.title, fontSize: 26, bold: true, color: "FFFFFF",
        align: "center", valign: "middle", margin: 0,
      });
      s.addShape("rect", {
        x: 1.25, y: y - 0.05, w: 8.35, h: 1.1,
        fill: { color: PALETTE.card }, line: { color: PALETTE.border, width: 0.5 },
      });
      s.addText(row.label, {
        x: 1.4, y: y, w: 8.0, h: 0.35,
        fontFace: FONT.body, fontSize: 13, bold: true, color: PALETTE.primary, margin: 0,
      });
      s.addText(row.body, {
        x: 1.4, y: y + 0.35, w: 8.0, h: 0.65,
        fontFace: FONT.body, fontSize: 10.5, color: PALETTE.charcoal, margin: 0,
      });
    });
  }

  // 4. Workup
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 4, totalSlides: TOTAL,
      title: "What to send — in order",
      subtitle: "Effluent BEFORE antibiotics. Then start IP therapy empirically.",
      source: "ISPD 2022 Peritonitis Guidelines.",
    });

    const steps = [
      { n: "1", body: "Drain-in-drain-out: send first drained bag effluent (minimum 50 mL), centrifuge 3000×g × 15 min." },
      { n: "2", body: "Inoculate sediment into blood-culture bottles (aerobic + anaerobic). Also send Gram stain, cell count with diff." },
      { n: "3", body: "Exam: exit site (erythema, pus, crust), tunnel palpation, abdomen (diffuse vs localized, rebound, rigidity)." },
      { n: "4", body: "Blood cultures if febrile; CBC, BMP, lactate, bowel imaging (CT) if surgical abdomen." },
      { n: "5", body: "Start empiric IP antibiotics AFTER cultures sent (see next slide). Do not delay for lab results." },
    ];

    steps.forEach((row, i) => {
      const y = 1.35 + i * 0.72;
      s.addShape("ellipse", {
        x: 0.45, y: y + 0.08, w: 0.45, h: 0.45,
        fill: { color: PALETTE.accent }, line: { type: "none" },
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

  // 5. Empiric antibiotics
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 5, totalSlides: TOTAL,
      title: "Empiric IP antibiotic regimens",
      subtitle: "Cover gram-positive + gram-negative; intraperitoneal, not IV.",
      source: "ISPD 2022 Peritonitis Guidelines.",
    });

    const rows = [
      [
        { text: "Regimen", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Dose (intraperitoneal)", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Notes", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
      ],
      [
        { text: "Vancomycin  +  3rd-gen cephalosporin", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Vanc: 15–30 mg/kg IP load q5–7 d (redose per level)\nCeftazidime: 1 g IP daily",
        "Most common regimen; watch vanc level; covers MRSA + enteric gram-negative rod (GNR)",
      ],
      [
        { text: "Cefazolin  +  ceftazidime", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Cefazolin: 15–20 mg/kg IP daily\nCeftazidime: 1 g IP daily",
        "Alternative if low MRSA prevalence; cheaper",
      ],
      [
        { text: "Vancomycin  +  aminoglycoside", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Vanc as above\nGentamicin 0.6 mg/kg IP daily",
        "Avoid prolonged courses (ototoxicity, nephrotoxicity in residual function)",
      ],
      [
        { text: "Cefepime monotherapy", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "1 g IP daily",
        "ISPD 2022 acceptable alternative; broad coverage",
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [2.6, 3.4, 3.2],
      rowH: [0.38, 0.7, 0.55, 0.6, 0.45],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 9.5, valign: "middle",
    });

    s.addShape("rect", {
      x: 0.4, y: 4.2, w: 9.2, h: 0.8,
      fill: { color: PALETTE.ice }, line: { color: PALETTE.secondary, width: 0.5 },
    });
    s.addText([
      { text: "Why IP not IV: ", options: { bold: true, color: PALETTE.primary } },
      { text: "much higher peritoneal concentration; avoids systemic exposure. Continuous dosing in every dwell OR intermittent once-daily dosing; fill volume at normal dwell time. Add heparin 500 U/L to prevent fibrin clots." },
    ], {
      x: 0.6, y: 4.28, w: 8.8, h: 0.65,
      fontFace: FONT.body, fontSize: 10.5, color: PALETTE.charcoal, margin: 0, valign: "middle",
    });
  }

  // 6. Tailoring
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 6, totalSlides: TOTAL,
      title: "Tailoring therapy",
      subtitle: "Narrow at 48–72 h based on culture + sensitivities. Total course 14–21 days.",
      source: "ISPD 2022 Peritonitis Guidelines.",
    });

    const rows = [
      [
        { text: "Organism", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Preferred therapy", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
        { text: "Duration", options: { bold: true, color: "FFFFFF", fill: { color: PALETTE.primary }, fontFace: FONT.body } },
      ],
      [
        { text: "CoNS (coag-neg staph)", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Cefazolin or vanc IP (per susceptibility)",
        "14 days",
      ],
      [
        { text: "S. aureus (MSSA / MRSA)", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Cefazolin (MSSA) / vanc (MRSA); + rifampin if exit-site source",
        "21 days",
      ],
      [
        { text: "Streptococcus / Enterococcus", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Ampicillin ± gent (enterococcus); vanc if resistant",
        "14 days (strep) / 21 days (enteroc.)",
      ],
      [
        { text: "Single GNR  (E. coli, Klebsiella)", options: { bold: true, color: PALETTE.primary, fontFace: FONT.body } },
        "Ceftazidime or cefepime per sensitivities",
        "21 days",
      ],
      [
        { text: "Pseudomonas", options: { bold: true, color: PALETTE.accent, fontFace: FONT.body } },
        "Dual coverage (ceftaz + gent or cipro); often removes catheter",
        "21 days",
      ],
      [
        { text: "Polymicrobial / enteric", options: { bold: true, color: PALETTE.danger, fontFace: FONT.body } },
        "Think surgical abdomen — CT, surgery consult; broad-spectrum IV + IP",
        "Variable; often catheter removal",
      ],
      [
        { text: "Fungal", options: { bold: true, color: PALETTE.danger, fontFace: FONT.body } },
        "Remove catheter IMMEDIATELY; IV fluconazole or echinocandin",
        "≥ 2 wk after catheter removal",
      ],
      [
        { text: "Mycobacteria", options: { bold: true, color: PALETTE.danger, fontFace: FONT.body } },
        "Rare; often remove; 4-drug ID-directed regimen",
        "ID-guided",
      ],
    ];

    s.addTable(rows, {
      x: 0.4, y: 1.35, w: 9.2, colW: [2.4, 4.0, 2.8],
      rowH: [0.35, 0.38, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4],
      border: { type: "solid", pt: 0.5, color: PALETTE.border },
      fill: { color: PALETTE.card }, fontFace: FONT.body, fontSize: 9.5, valign: "middle",
    });
  }

  // 7. Catheter removal
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 7, totalSlides: TOTAL,
      title: "When to remove the catheter",
      subtitle: "Removal is common; learn the triggers early.",
      source: "ISPD 2022 Peritonitis Guidelines.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.danger,
      header: "REMOVE CATHETER", headerColor: PALETTE.danger, body: "",
    });
    s.addText(bulletBlock([
      { text: "Fungal peritonitis — immediately", bold: true, color: PALETTE.danger },
      { text: "Refractory peritonitis (no improvement by day 5 of appropriate IP abx)", bold: true },
      { text: "Relapsing peritonitis (same organism within 4 wk of course end)", bold: true },
      { text: "Mycobacterial peritonitis — usually", bold: true },
      "Concurrent tunnel infection with same organism",
      "Polymicrobial with enteric flora (think surgical perforation)",
      "Refractory exit-site / tunnel infection",
    ], { fontSize: 10.5, paraSpaceAfter: 4 }), {
      x: 0.7, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "KEEP CATHETER", body: "",
    });
    s.addText(bulletBlock([
      "Clinical improvement + effluent clearing by 48–72 h",
      "Single organism susceptible to narrow therapy",
      "No tunnel / exit-site involvement",
      "Effluent WBC trending down even if still > 100",
      { text: "ISPD 2022: if effluent WBC clearly improving, continuing abx beyond day 5 is reasonable before removal", bold: true, color: PALETTE.good },
      "After removal: minimum 2-week antibiotic course + a few weeks on HD before new PD catheter",
    ], { fontSize: 10.5, paraSpaceAfter: 4 }), {
      x: 5.4, y: 1.85, w: 4.1, h: 3.05, margin: 0, valign: "top",
    });
  }

  // 8. Prevention
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 8, totalSlides: TOTAL,
      title: "Prevention",
      subtitle: "Training, exit-site care, prophylaxis for specific situations.",
      source: "ISPD 2022 Peritonitis Prevention Recommendations.",
    });

    const cards = [
      { color: PALETTE.primary, title: "EXIT-SITE CARE",
        body: "Daily cleansing with chlorhexidine or antibacterial soap. Topical mupirocin or gentamicin cream at exit site daily (proven to reduce peritonitis). Avoid immersion in swimming pools / hot tubs during catheter placement." },
      { color: PALETTE.good, title: "TRAINING + RETRAINING",
        body: "Initial training > 15 hours; home visits after 2 weeks. Retrain after every peritonitis episode — poor technique is the #1 reversible risk factor. Assess hand hygiene, bag exchange technique, exit-site care." },
      { color: PALETTE.accent, title: "PROCEDURE PROPHYLAXIS",
        body: "Colonoscopy or invasive GYN procedures: antibiotic prophylaxis + empty abdomen per center protocol. Review any planned invasive procedure with the PD team." },
      { color: PALETTE.secondary, title: "CONSTIPATION + HYPOKALEMIA",
        body: "Constipation → gram-negative peritonitis; aggressive stool management. Hypokalemia → gut bacterial translocation, higher peritonitis risk — replete." },
    ];
    cards.forEach((c, i) => {
      const row = Math.floor(i / 2), col = i % 2;
      const x = 0.4 + col * 4.65, y = 1.4 + row * 1.85;
      addCard(s, { x, y, w: 4.5, h: 1.7, accent: c.color, header: c.title, body: c.body });
    });
  }

  // 9. Pitfalls
  {
    const s = newContentSlide(pres, {
      topic: TOPIC, slideNumber: 9, totalSlides: TOTAL,
      title: "Common pitfalls",
      subtitle: "The errors that cause treatment failure or catheter loss.",
      source: "Premier Nephrology teaching guide.",
    });

    addCard(s, {
      x: 0.4, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.danger,
      header: "AVOID", headerColor: PALETTE.danger, body: "",
    });
    s.addText(bulletBlock([
      "Waiting on culture to start abx",
      "IV antibiotics instead of IP",
      "Effluent in plain tubes",
      "Skipping exit-site exam",
      "Keeping catheter for fungal",
      "Refusing to remove refractory catheter",
      "No mupirocin prophylaxis",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 0.7, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });

    addCard(s, {
      x: 5.1, y: 1.4, w: 4.5, h: 3.6, accent: PALETTE.good,
      header: "DO INSTEAD", headerColor: PALETTE.good, body: "",
    });
    s.addText(bulletBlock([
      "Send effluent + start IP abx together",
      "IP dosing (continuous or daily)",
      "Always blood-culture bottles",
      "Exam exit site + tunnel every visit",
      "Remove for fungal, refractory, relapsing",
      "Day 5 no improvement → remove",
      "Daily exit-site mupirocin",
    ], { fontSize: 12, paraSpaceAfter: 7 }), {
      x: 5.4, y: 1.9, w: 4.1, h: 3.0, margin: 0, valign: "top",
    });
  }



  // Clinical case — question
  addCaseQuestionSlide(pres, {
    topic: TOPIC, slideNumber: 10, totalSlides: TOTAL,
    vignette: "A 52-year-old man on CAPD × 3 yr for ESRD from DKD, presents with 1 day of cloudy effluent and abdominal pain. Last episode 8 months ago (staph epi). T 37.9, BP 128/78. Abdomen: diffuse tenderness, no rigidity. Exit site: clean, no erythema. Effluent sent: WBC 1400/µL, 82% PMN. Gram stain: gram-positive cocci in clusters. Cultures pending.",
    question: "What's the empiric regimen, and what would trigger catheter removal?",
  });

  // Clinical case — answer
  addCaseAnswerSlide(pres, {
    topic: TOPIC, slideNumber: 11, totalSlides: TOTAL,
    answer: "IP vancomycin (15-30 mg/kg load) + IP ceftazidime (1 g daily); empiric coverage until cultures final. Remove catheter for fungal, refractory (no improvement by day 5), or relapsing peritonitis.",
    teaching: "Classic PD peritonitis — cloudy effluent + pain + effluent WBC > 100 with > 50% PMN meets 2-of-3 ISPD criteria. Always send effluent in blood-culture bottles BEFORE antibiotics. Gram-positive on Gram stain suggests staph — continue vanc until sensitivities back. Dual coverage (add ceftaz) for gram-negative until final cultures. Duration 14-21 days (21 for staph aureus). Keep the catheter unless: fungal (remove immediately), refractory at day 5, relapsing (same org within 4 wk), mycobacterial, concurrent tunnel infection. After the episode: review exit-site technique, re-training (poor technique is #1 reversible risk), continue mupirocin at exit site daily.",
  });

  // 11. References
  addReferencesSlide(pres, {
    topic: "PD Peritonitis",
    references: {
      guidelines: [
        "ISPD 2022 Peritonitis Guidelines",
        "ISPD 2016 Peritoneal Dialysis-Related Infections",
        "ISPD 2017 Catheter-related infections",
        "KDOQI / ISPD PD Adequacy Guidelines",
      ],
      trials: [
        "Perez Fontan et al. — mupirocin exit-site prophylaxis",
        "Bernardini et al. — gentamicin cream vs mupirocin",
        "PD Outcomes Registry data (USRDS, BRAZPD, etc.)",
        "Ballinger et al. — rapid cycler peritonitis outcomes",
      ],
    },
    uptodateTopics: [
      "Clinical manifestations and diagnosis of peritonitis in peritoneal dialysis",
      "Treatment of peritonitis in peritoneal dialysis",
      "Exit-site and tunnel infections in peritoneal dialysis",
      "Peritoneal dialysis catheter-related infections: Prevention",
    ],
  });

  const outPath = path.resolve(__dirname, "../../decks/13-PDPeritonitis.pptx");
  await pres.writeFile({ fileName: outPath });
  console.log("Wrote:", outPath);
}

build().catch(e => { console.error(e); process.exit(1); });
