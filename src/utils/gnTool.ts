// GN (glomerulonephritis) differential reasoning helper.
// Algorithm structure follows UpToDate "Evaluation of glomerular disease in adults"
// and the KDIGO 2021 Clinical Practice Guideline for the Management of Glomerular Diseases.
// Differential framing also pulls from "Comprehensive Clinical Nephrology" (Floege/Johnson) and
// standard nephrology teaching.
// This is a teaching/reasoning aid, not a diagnostic device.

export type GnSyndrome =
  | "unclear"
  | "nephritic"
  | "nephrotic"
  | "mixed"
  | "rpgn"
  | "asymptomatic"
  | "pulmonary_renal";

export type GnComplementStatus = "not_checked" | "low" | "normal";

export type GnTempo = "unknown" | "acute" | "subacute" | "chronic";

export type GnUaGrade =
  | "not_checked"
  | "negative"
  | "trace_1"
  | "two_plus"
  | "three_plus"
  | "nephrotic";

export type GnRbcStatus = "not_checked" | "none" | "few" | "many" | "dysmorphic";

export type GnRbcCastStatus = "not_checked" | "absent" | "present";

export interface GnToolInputs {
  // Syndrome / tempo
  syndrome: GnSyndrome;
  tempo: GnTempo;
  // Quantitative
  upcr: string;          // mg/g (spot)
  protein24h: string;    // g/day
  serumAlbumin: string;  // g/dL
  baselineCr: string;    // mg/dL
  currentCr: string;     // mg/dL
  // UA findings
  protein: GnUaGrade;
  blood: GnUaGrade;
  rbc: GnRbcStatus;
  rbcCasts: GnRbcCastStatus;
  // Complement
  c3: GnComplementStatus;
  c4: GnComplementStatus;
  // Serology multi-selects
  selectedPositive: string[];
  selectedSentNegative: string[];
  // History / exam
  selectedHistory: string[];
}

export interface GnDifferentialItem {
  id: string;
  title: string;
  bucket: string;
  signal: "High" | "Moderate" | "Consider";
  score: number;
  supports: string[];
  next: string[];
}

export interface GnQuantitative {
  proteinGramsPerDay: number | null; // best estimate (24h preferred, else UPCR/1000)
  proteinSource: "24h" | "upcr" | null;
  proteinTier: "minimal" | "subnephrotic" | "nephrotic_range" | "unknown";
  albumin: number | null;
  baselineCr: number | null;
  currentCr: number | null;
  crDelta: number | null;
  crRatio: number | null;
  rpgnTrajectory: boolean; // doubling Cr in days–weeks
}

export interface GnComplementPattern {
  pattern: "low_c3_low_c4" | "low_c3_normal_c4" | "normal" | "incomplete";
  label: string;
  interpretation: string;
}

export interface GnSerologyPlan {
  needed: Array<{ id: string; label: string; reason: string }>;
  positive: string[];
  sentNegative: string[];
}

export interface GnAssessmentResult {
  derivedSyndrome: GnSyndrome;          // auto-inferred from the data when "unclear"
  derivedSyndromeLabel: string;
  tempoLabel: string;
  quantitative: GnQuantitative;
  complementPattern: GnComplementPattern;
  differentials: GnDifferentialItem[];
  serologyPlan: GnSerologyPlan;
  alerts: string[];
  nextSteps: string[];
  summary: string;
}

export const DEFAULT_GN_INPUTS: GnToolInputs = {
  syndrome: "unclear",
  tempo: "unknown",
  upcr: "",
  protein24h: "",
  serumAlbumin: "",
  baselineCr: "",
  currentCr: "",
  protein: "not_checked",
  blood: "not_checked",
  rbc: "not_checked",
  rbcCasts: "not_checked",
  c3: "not_checked",
  c4: "not_checked",
  selectedPositive: [],
  selectedSentNegative: [],
  selectedHistory: [],
};

// ── helpers ────────────────────────────────────────────────────────────
function parsePositive(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseNonNegative(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function has(items: string[], id: string): boolean {
  return items.includes(id);
}

function hasAny(items: string[], ids: string[]): boolean {
  return ids.some((id) => has(items, id));
}

function addUnique<T>(arr: T[], item: T): void {
  if (!arr.includes(item)) arr.push(item);
}

function fmt(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return "";
  return value.toFixed(digits).replace(/\.?0+$/, "");
}

function signalFromScore(score: number): GnDifferentialItem["signal"] {
  if (score >= 8) return "High";
  if (score >= 4) return "Moderate";
  return "Consider";
}

// ── quantitative interpretation ────────────────────────────────────────
export function calculateQuantitative(inputs: GnToolInputs): GnQuantitative {
  const albumin = parsePositive(inputs.serumAlbumin);
  const baselineCr = parsePositive(inputs.baselineCr);
  const currentCr = parsePositive(inputs.currentCr);
  const protein24 = parsePositive(inputs.protein24h);
  const upcr = parsePositive(inputs.upcr);

  let proteinGramsPerDay: number | null = null;
  let proteinSource: "24h" | "upcr" | null = null;
  if (protein24 !== null) {
    proteinGramsPerDay = protein24;
    proteinSource = "24h";
  } else if (upcr !== null) {
    // UPCR mg/g approximates g/day of proteinuria (1000 mg/g ≈ 1 g/day at ~1 g/day Cr excretion).
    proteinGramsPerDay = upcr / 1000;
    proteinSource = "upcr";
  }

  let proteinTier: GnQuantitative["proteinTier"] = "unknown";
  if (proteinGramsPerDay !== null) {
    // UpToDate threshold for nephrotic syndrome: >3.5 g/24h or UPCR >3000 mg/g.
    if (proteinGramsPerDay > 3.5) proteinTier = "nephrotic_range";
    else if (proteinGramsPerDay >= 0.5) proteinTier = "subnephrotic";
    else proteinTier = "minimal";
  } else if (inputs.protein === "nephrotic") {
    proteinTier = "nephrotic_range";
  } else if (inputs.protein === "three_plus") {
    proteinTier = "subnephrotic";
  }

  const crDelta = baselineCr !== null && currentCr !== null ? currentCr - baselineCr : null;
  const crRatio = baselineCr !== null && currentCr !== null && baselineCr > 0 ? currentCr / baselineCr : null;
  // Tempo "acute" or "subacute" with Cr ratio ≥2 over weeks fits an RPGN trajectory.
  const rpgnTrajectory =
    crRatio !== null &&
    crRatio >= 2 &&
    (inputs.tempo === "acute" || inputs.tempo === "subacute");

  return {
    proteinGramsPerDay,
    proteinSource,
    proteinTier,
    albumin,
    baselineCr,
    currentCr,
    crDelta,
    crRatio,
    rpgnTrajectory,
  };
}

// ── complement pattern interpretation ──────────────────────────────────
export function interpretComplement(c3: GnComplementStatus, c4: GnComplementStatus): GnComplementPattern {
  if (c3 === "not_checked" || c4 === "not_checked") {
    return {
      pattern: "incomplete",
      label: "Complement incomplete",
      interpretation: "Send C3 and C4 — complement pattern is one of the highest-yield branchpoints in the GN differential.",
    };
  }
  if (c3 === "low" && c4 === "low") {
    return {
      pattern: "low_c3_low_c4",
      label: "Low C3 + Low C4",
      interpretation:
        "Low C3 and low C4 → classical-pathway activation. Think lupus nephritis, cryoglobulinemic GN (often HCV-associated), MPGN-immune-complex type, and endocarditis-related GN.",
    };
  }
  if (c3 === "low" && c4 === "normal") {
    return {
      pattern: "low_c3_normal_c4",
      label: "Low C3, Normal C4",
      interpretation:
        "Isolated low C3 → alternative-pathway activation. Think post-infectious GN (transient, normalizes by 8 weeks) and C3 glomerulopathy (C3GN, dense deposit disease — persistently low C3).",
    };
  }
  return {
    pattern: "normal",
    label: "Normal complement",
    interpretation:
      "Normal complement pushes pauci-immune (ANCA), anti-GBM, and IgA-based diagnoses up the list. In nephrotic syndrome it favors MN, MCD, FSGS, amyloid, and diabetic kidney disease.",
  };
}

// ── derive syndrome when user marks "unclear" ──────────────────────────
function deriveSyndrome(inputs: GnToolInputs, q: GnQuantitative): { syndrome: GnSyndrome; label: string } {
  if (inputs.syndrome !== "unclear") {
    return { syndrome: inputs.syndrome, label: syndromeLabel(inputs.syndrome) };
  }
  // RPGN trajectory + active sediment dominates
  const activeSediment =
    inputs.rbcCasts === "present" || inputs.rbc === "dysmorphic" || inputs.rbc === "many";
  if (q.rpgnTrajectory && activeSediment) return { syndrome: "rpgn", label: "RPGN (derived)" };
  if (hasAny(inputs.selectedHistory, ["hemoptysis"])) return { syndrome: "pulmonary_renal", label: "Pulmonary–renal (derived)" };
  if (q.proteinTier === "nephrotic_range" && activeSediment) return { syndrome: "mixed", label: "Mixed nephritic/nephrotic (derived)" };
  if (q.proteinTier === "nephrotic_range") return { syndrome: "nephrotic", label: "Nephrotic (derived)" };
  if (activeSediment) return { syndrome: "nephritic", label: "Nephritic (derived)" };
  if (q.proteinTier === "subnephrotic" || q.proteinTier === "minimal") return { syndrome: "asymptomatic", label: "Asymptomatic urinary findings (derived)" };
  return { syndrome: "unclear", label: "Syndrome unclear — add UA, UPCR/24h protein, and Cr trend." };
}

export function syndromeLabel(s: GnSyndrome): string {
  if (s === "nephritic") return "Nephritic syndrome";
  if (s === "nephrotic") return "Nephrotic syndrome";
  if (s === "mixed") return "Mixed nephritic/nephrotic";
  if (s === "rpgn") return "RPGN";
  if (s === "asymptomatic") return "Asymptomatic hematuria/proteinuria";
  if (s === "pulmonary_renal") return "Pulmonary–renal syndrome";
  return "Syndrome unclear";
}

export function tempoLabel(t: GnTempo): string {
  if (t === "acute") return "Acute (days)";
  if (t === "subacute") return "Subacute (weeks)";
  if (t === "chronic") return "Chronic (months–years)";
  return "Tempo unknown";
}

// ── serology planning ──────────────────────────────────────────────────
const SEROLOGY_LABELS: Record<string, string> = {
  ana: "ANA",
  anti_dsdna: "anti-dsDNA",
  anti_smith: "anti-Smith",
  anca_pr3: "ANCA (PR3)",
  anca_mpo: "ANCA (MPO)",
  anti_gbm: "anti-GBM",
  anti_pla2r: "anti-PLA2R",
  anti_thsd7a: "anti-THSD7A",
  aso_dnaseB: "ASO / anti-DNase B",
  cryoglobulin: "cryoglobulins",
  hbv: "HBsAg / HBV serology",
  hcv: "HCV antibody (with reflex RNA)",
  hiv: "HIV",
  spep_sfle_abnl: "SPEP + UPEP + serum free light chains",
  syphilis_rpr: "RPR / syphilis",
  blood_cx: "blood cultures (≥3 sets)",
};

function batteryForSyndrome(syndrome: GnSyndrome): string[] {
  // UpToDate "Glomerular disease: Evaluation and differential diagnosis in adults" (Feb 2026).
  // Cryos are NOT in the routine GN battery — UpToDate sends them only with cryoglobulinemic
  // features or known HCV, so they're excluded here and re-suggested in `reasonForTest` clues.
  if (syndrome === "nephrotic") {
    // Per UpToDate nephrotic eval: HbA1c, ANA + anti-dsDNA, anti-PLA2R, HBV/HCV/HIV, C3/C4,
    // and (in patients >50) SPEP + UPEP + SFLC. Anti-THSD7A and RPR are second-line.
    return ["ana", "anti_dsdna", "anti_pla2r", "anti_thsd7a", "hbv", "hcv", "hiv", "spep_sfle_abnl", "syphilis_rpr"];
  }
  if (syndrome === "asymptomatic") {
    // Mostly mild IgA, MPGN-pattern, or Alport — UpToDate triages with a focused panel.
    return ["ana", "anca_pr3", "anca_mpo", "anti_gbm", "hbv", "hcv", "hiv", "spep_sfle_abnl"];
  }
  if (syndrome === "pulmonary_renal") {
    return ["ana", "anti_dsdna", "anca_pr3", "anca_mpo", "anti_gbm", "blood_cx", "hbv", "hcv", "hiv"];
  }
  if (syndrome === "rpgn") {
    return ["ana", "anti_dsdna", "anca_pr3", "anca_mpo", "anti_gbm", "blood_cx", "hbv", "hcv", "hiv", "spep_sfle_abnl"];
  }
  if (syndrome === "mixed") {
    return ["ana", "anti_dsdna", "anca_pr3", "anca_mpo", "anti_gbm", "anti_pla2r", "hbv", "hcv", "hiv", "spep_sfle_abnl"];
  }
  if (syndrome === "nephritic") {
    // UpToDate GN battery: C3/C4, ANCA (PR3/MPO ELISA), anti-GBM, ANA, anti-dsDNA, HBV/HCV/HIV, SFLC + SIFE.
    return ["ana", "anti_dsdna", "anca_pr3", "anca_mpo", "anti_gbm", "aso_dnaseB", "hbv", "hcv", "hiv", "spep_sfle_abnl"];
  }
  // unclear / fallback
  return ["ana", "anca_pr3", "anca_mpo", "anti_gbm", "anti_pla2r", "hbv", "hcv", "hiv", "spep_sfle_abnl"];
}

function reasonForTest(testId: string, syndrome: GnSyndrome): string {
  if (testId === "ana") return "Screen for SLE; positivity reflexes anti-dsDNA, anti-Smith, complement.";
  if (testId === "anti_dsdna") return "Specific for lupus nephritis; titer trends with disease activity.";
  if (testId === "anca_pr3") return "PR3-ANCA leans GPA; pauci-immune crescentic GN if positive.";
  if (testId === "anca_mpo") return "MPO-ANCA leans MPA / EGPA / renal-limited vasculitis.";
  if (testId === "anti_gbm") return "Anti-GBM disease — must not miss; biopsy + plasmapheresis if positive.";
  if (testId === "anti_pla2r") return "Primary membranous (~70–80% of cases positive). UpToDate allows deferring biopsy in nephrotic-range patients with a positive anti-PLA2R titer.";
  if (testId === "anti_thsd7a") return "Membranous variant when anti-PLA2R is negative; raises suspicion for paraneoplastic MN.";
  if (testId === "aso_dnaseB") return "Post-infectious GN — UpToDate: synpharyngitic gross hematuria (concurrent with URI) suggests IgA, while a 7–10 day latency after pharyngitis suggests PSGN. Anti-DNase B is more sensitive after skin infection.";
  if (testId === "cryoglobulin") return "Cryoglobulinemic GN (typically HCV-associated); send fresh, kept warm.";
  if (testId === "hbv") return "HBV-related GN: classically MN (paraneoplastic-like) and PAN; sometimes MPGN.";
  if (testId === "hcv") return "HCV-related GN: cryoglobulinemic MPGN; reflex to RNA if Ab positive.";
  if (testId === "hiv") return "HIVAN (collapsing FSGS) and HIV immune-complex disease (HIVICK).";
  if (testId === "spep_sfle_abnl") return "Monoclonal-gammopathy GN umbrella (AL amyloid, MIDD, fibrillary, immunotactoid, PGNMID). UpToDate routinely screens adult nephrotics >50 years old.";
  if (testId === "syphilis_rpr") return "Secondary syphilis can cause membranous nephropathy.";
  if (testId === "blood_cx") return `Endocarditis-related GN — ${syndrome === "pulmonary_renal" ? "and" : "especially with"} fever, embolic phenomena, IVDU.`;
  return "Adds information for the differential.";
}

export function buildSerologyPlan(inputs: GnToolInputs, syndrome: GnSyndrome): GnSerologyPlan {
  const battery = batteryForSyndrome(syndrome);
  const positive = inputs.selectedPositive;
  const sentNegative = inputs.selectedSentNegative;
  const seenIds = new Set([...positive, ...sentNegative]);
  const needed: GnSerologyPlan["needed"] = [];
  for (const testId of battery) {
    if (seenIds.has(testId)) continue;
    needed.push({
      id: testId,
      label: SEROLOGY_LABELS[testId] ?? testId,
      reason: reasonForTest(testId, syndrome),
    });
  }
  return { needed, positive: [...positive], sentNegative: [...sentNegative] };
}

// ── differential builder ───────────────────────────────────────────────
export function buildGnAssessment(inputs: GnToolInputs): GnAssessmentResult {
  const quantitative = calculateQuantitative(inputs);
  const complementPattern = interpretComplement(inputs.c3, inputs.c4);
  const derived = deriveSyndrome(inputs, quantitative);
  const syndrome = derived.syndrome;

  const positive = inputs.selectedPositive;
  const sentNegative = inputs.selectedSentNegative;
  const history = inputs.selectedHistory;

  const cLowLow = complementPattern.pattern === "low_c3_low_c4";
  const cLowNormal = complementPattern.pattern === "low_c3_normal_c4";
  const cNormal = complementPattern.pattern === "normal";
  const isNephritic = syndrome === "nephritic" || syndrome === "rpgn" || syndrome === "mixed" || syndrome === "pulmonary_renal";
  const isNephrotic = syndrome === "nephrotic" || syndrome === "mixed";
  const isPulmRenal = syndrome === "pulmonary_renal" || hasAny(history, ["hemoptysis"]);
  const activeSediment =
    inputs.rbcCasts === "present" || inputs.rbc === "dysmorphic" ||
    (inputs.rbc === "many" && (inputs.protein === "two_plus" || inputs.protein === "three_plus" || inputs.protein === "nephrotic"));

  const builders: Record<string, GnDifferentialItem> = {};
  const ensure = (id: string, title: string, bucket: string, next: string[]) => {
    builders[id] ??= { id, title, bucket, score: 0, signal: "Consider", supports: [], next };
    return builders[id];
  };
  const add = (id: string, title: string, bucket: string, points: number, support: string, next: string[]) => {
    const item = ensure(id, title, bucket, next);
    item.score += points;
    addUnique(item.supports, support);
  };

  // ── Lupus nephritis ────────────────────────────────────────────────
  const lupusNext = [
    "Reflex anti-dsDNA, anti-Smith, anti-Ro/La, complement trend; document SLE classification criteria.",
    "Biopsy with light, IF, and EM is the gold standard — class drives therapy (steroids ± MMF or cyclophosphamide; voclosporin or belimumab as add-on per KDIGO 2024 update).",
  ];
  if (cLowLow && (isNephritic || syndrome === "asymptomatic")) {
    add("lupus", "Lupus nephritis", "Low C3 + Low C4 (immune complex)", 5, "Low C3 + low C4 with a nephritic-flavored picture is the classic lupus pattern.", lupusNext);
  }
  if (has(positive, "ana")) add("lupus", "Lupus nephritis", "Low C3 + Low C4 (immune complex)", 3, "ANA positive.", lupusNext);
  if (has(positive, "anti_dsdna")) add("lupus", "Lupus nephritis", "Low C3 + Low C4 (immune complex)", 5, "Anti-dsDNA positive — specific for lupus.", lupusNext);
  if (has(positive, "anti_smith")) add("lupus", "Lupus nephritis", "Low C3 + Low C4 (immune complex)", 4, "Anti-Smith positive — specific for lupus.", lupusNext);
  if (has(history, "lupus_features")) add("lupus", "Lupus nephritis", "Low C3 + Low C4 (immune complex)", 3, "Extrarenal lupus features (arthritis, oral ulcers, photosensitivity, serositis, cytopenias).", lupusNext);
  if (has(sentNegative, "ana")) {
    const item = ensure("lupus", "Lupus nephritis", "Low C3 + Low C4 (immune complex)", lupusNext);
    item.score -= 3;
    addUnique(item.supports, "ANA negative — lupus nephritis is far less likely (rare ANA-negative cases exist).");
  }

  // ── ANCA-associated vasculitis ─────────────────────────────────────
  const ancaNext = [
    "Confirm ANCA subtype (PR3 vs MPO) and immunofluorescence pattern; document organ involvement.",
    "Biopsy shows pauci-immune crescentic GN. Induction: steroids + rituximab or cyclophosphamide; PLEX in selected severe cases (KDIGO + PEXIVAS framework).",
  ];
  if (has(positive, "anca_pr3")) {
    add("anca_aav", "ANCA-associated vasculitis (PR3 — likely GPA)", "Pauci-immune", 8, "PR3-ANCA positive — pauci-immune crescentic GN, classically GPA phenotype.", ancaNext);
  }
  if (has(positive, "anca_mpo")) {
    add("anca_aav", "ANCA-associated vasculitis (MPO — likely MPA / renal-limited)", "Pauci-immune", 8, "MPO-ANCA positive — MPA, EGPA, or renal-limited vasculitis phenotype.", ancaNext);
  }
  if ((syndrome === "rpgn" || isPulmRenal) && cNormal) {
    add("anca_aav", "ANCA-associated vasculitis", "Pauci-immune", 4, "RPGN or pulmonary–renal with normal complement is the dominant ANCA picture.", ancaNext);
  }
  if (has(history, "sinus_ent_chronic")) add("anca_aav", "ANCA-associated vasculitis (GPA flavor)", "Pauci-immune", 3, "Chronic sinus/ENT disease, saddle nose, or septal perforation fits GPA.", ancaNext);
  if (has(history, "asthma_eos")) add("anca_aav", "ANCA-associated vasculitis (EGPA flavor)", "Pauci-immune", 3, "Asthma + peripheral eosinophilia fits EGPA.", ancaNext);
  if (has(history, "vasculitis_systemic")) add("anca_aav", "ANCA-associated vasculitis", "Pauci-immune", 2, "Mononeuritis multiplex / livedo / palpable purpura fits systemic vasculitis.", ancaNext);
  if (has(history, "hemoptysis")) add("anca_aav", "ANCA-associated vasculitis", "Pauci-immune", 3, "Hemoptysis raises pulmonary–renal concern; ANCA is the most common cause.", ancaNext);
  if (has(sentNegative, "anca_pr3") && has(sentNegative, "anca_mpo")) {
    const item = ensure("anca_aav", "ANCA-associated vasculitis", "Pauci-immune", ancaNext);
    item.score -= 4;
    addUnique(item.supports, "Both PR3 and MPO ANCA negative — ANCA-AAV is far less likely (rare seronegative cases exist).");
  }

  // ── Anti-GBM disease ───────────────────────────────────────────────
  const gbmNext = [
    "Anti-GBM titer + biopsy (linear IgG along GBM). Do not delay — outcomes hinge on early dialysis-independent Cr.",
    "Treatment is plasmapheresis + steroids + cyclophosphamide; consider concurrent rituximab. Watch for double-positive (anti-GBM + ANCA) overlap.",
  ];
  if (has(positive, "anti_gbm")) {
    add("anti_gbm", "Anti-GBM disease (Goodpasture's)", "Anti-GBM", 10, "Anti-GBM antibody positive — must-not-miss diagnosis.", gbmNext);
  }
  if (isPulmRenal && cNormal) {
    add("anti_gbm", "Anti-GBM disease (Goodpasture's)", "Anti-GBM", 4, "Pulmonary–renal with normal complement is also classic anti-GBM territory.", gbmNext);
  }
  if (syndrome === "rpgn" && cNormal) {
    add("anti_gbm", "Anti-GBM disease (Goodpasture's)", "Anti-GBM", 2, "RPGN with normal complement — anti-GBM is in the must-rule-out triad with ANCA and IgA.", gbmNext);
  }
  if (has(sentNegative, "anti_gbm")) {
    const item = ensure("anti_gbm", "Anti-GBM disease (Goodpasture's)", "Anti-GBM", gbmNext);
    item.score -= 5;
    addUnique(item.supports, "Anti-GBM negative — disease is essentially excluded (rare seronegative cases exist).");
  }

  // ── IgA nephropathy ─────────────────────────────────────────────────
  const igaNext = [
    "Diagnosis is biopsy-based: mesangial IgA-dominant deposits.",
    "Risk-stratify with MEST-C score and proteinuria trajectory; KDIGO 2021 emphasizes optimized supportive care (RAS blockade + SGLT2i) before adding immunosuppression.",
  ];
  if (cNormal && (syndrome === "nephritic" || syndrome === "asymptomatic")) {
    add("iga", "IgA nephropathy", "Normal complement / mesangial", 4, "Most common primary GN worldwide; nephritic or asymptomatic hematuria with normal complement is the typical pattern.", igaNext);
  }
  if (has(history, "synpharyngitic")) {
    add("iga", "IgA nephropathy", "Normal complement / mesangial", 5, "Synpharyngitic gross hematuria (concurrent with URI) is the IgA fingerprint — distinguishes from PSGN's 7–10 day latency. UpToDate notes it can also occur in C3 glomerulopathy and Alport.", igaNext);
  }
  if (inputs.rbc === "dysmorphic" && cNormal) {
    add("iga", "IgA nephropathy", "Normal complement / mesangial", 1, "Dysmorphic RBCs with normal complement supports a glomerular hematuria of mesangial type.", igaNext);
  }

  // ── IgA vasculitis (HSP) ────────────────────────────────────────────
  const igavNext = [
    "Skin biopsy of palpable purpura shows IgA-dominant leukocytoclastic vasculitis; renal biopsy mirrors IgA nephropathy.",
    "Most adult cases need only supportive care; immunosuppression for crescentic or nephrotic-range disease.",
  ];
  if (has(history, "palpable_purpura") || has(history, "abdominal_pain_purpura")) {
    add("iga_vasculitis", "IgA vasculitis (Henoch–Schönlein purpura)", "Normal complement / mesangial + small-vessel", 6, "Palpable purpura ± abdominal pain or arthralgia is the systemic IgA vasculitis tetrad.", igavNext);
  }

  // ── Post-infectious GN ──────────────────────────────────────────────
  const psgnNext = [
    "Streptococcal antibodies (ASO after pharyngitis, anti-DNase B after skin); blood cultures if endocarditis is plausible.",
    "Course is usually self-limited in children; adults can have prolonged proteinuria or progressive disease — biopsy if atypical or persistent.",
  ];
  if (cLowNormal && (syndrome === "nephritic" || syndrome === "asymptomatic")) {
    add("post_infectious", "Post-infectious GN (PSGN / IRGN)", "Low C3, normal C4 (alternative pathway)", 5, "Isolated low C3 with a nephritic syndrome is the textbook post-infectious pattern (C3 normalizes by ~8 weeks).", psgnNext);
  }
  if (has(history, "recent_strep_skin")) {
    add("post_infectious", "Post-infectious GN (PSGN / IRGN)", "Low C3, normal C4 (alternative pathway)", 5, "Recent streptococcal infection: UpToDate cites a 7–10 day latency after pharyngitis (vs synpharyngitic for IgA), longer (3–6 weeks) after skin infection.", psgnNext);
  }
  if (has(history, "synpharyngitic")) {
    add("c3g", "C3 glomerulopathy (C3GN / dense deposit disease)", "Low C3, normal C4 (alternative pathway)", 1, "UpToDate notes synpharyngitic gross hematuria can also occur in C3 glomerulopathy.", [
      "Send complement-pathway autoantibodies (C3 nephritic factor, factor H/I/MCP) and biopsy.",
    ]);
  }
  if (has(positive, "aso_dnaseB")) {
    add("post_infectious", "Post-infectious GN (PSGN / IRGN)", "Low C3, normal C4 (alternative pathway)", 4, "ASO or anti-DNase B positive.", psgnNext);
  }

  // ── Endocarditis-related GN / shunt nephritis ──────────────────────
  const endocarditisNext = [
    "Blood cultures (≥3 sets), echo (TTE → TEE), CT/MRI for embolic foci.",
    "Treat the underlying infection and consult ID/CT surgery; immune complex GN improves with source control.",
  ];
  if (has(positive, "blood_cx")) {
    add("endocarditis", "Endocarditis-related immune-complex GN", "Low C3 ± Low C4 (infection-driven)", 6, "Positive blood cultures.", endocarditisNext);
  }
  if (has(history, "endocarditis_features") || has(history, "iv_drug_use")) {
    add("endocarditis", "Endocarditis-related immune-complex GN", "Low C3 ± Low C4 (infection-driven)", 4, "Endocarditis features (fever, new murmur, embolic phenomena) or IVDU history.", endocarditisNext);
  }
  if (has(history, "shunt_device")) {
    add("endocarditis", "Shunt nephritis (indwelling-device-related GN)", "Low C3 ± Low C4 (infection-driven)", 4, "VP shunt or other indwelling device — staphylococcal shunt nephritis is the analog of endocarditis-related GN.", endocarditisNext);
  }
  if (cLowLow && hasAny(history, ["endocarditis_features", "iv_drug_use", "shunt_device"])) {
    add("endocarditis", "Endocarditis-related immune-complex GN", "Low C3 ± Low C4 (infection-driven)", 2, "Low C3 + low C4 with infectious clues fits chronic immune-complex deposition.", endocarditisNext);
  }

  // ── Cryoglobulinemic GN ────────────────────────────────────────────
  const cryoNext = [
    "Send cryoglobulins on warmed blood; reflex HCV RNA if positive HCV serology.",
    "Treat HCV with DAAs first if HCV-associated; rituximab for severe/persistent disease (MERIT/CryoVas-style approach).",
  ];
  if (has(positive, "cryoglobulin")) {
    add("cryo", "Cryoglobulinemic GN (often HCV-associated)", "Low C3 + Low C4 (immune complex)", 7, "Cryoglobulins positive — typically Type II/III mixed cryos with MPGN pattern on biopsy.", cryoNext);
  }
  if (cLowLow && (has(positive, "hcv") || has(history, "known_hcv"))) {
    add("cryo", "Cryoglobulinemic GN (HCV-associated)", "Low C3 + Low C4 (immune complex)", 5, "HCV positive with low C3 + low C4 is the classic cryoglobulinemic profile — UpToDate sends cryoglobulins specifically when HCV or cryoglobulinemic features are present.", cryoNext);
  }
  if (has(history, "palpable_purpura") && cLowLow) {
    add("cryo", "Cryoglobulinemic GN", "Low C3 + Low C4 (immune complex)", 2, "Palpable purpura + low C3/C4 fits the cryoglobulinemic vasculitis triad (skin/joint/kidney) — UpToDate triggers a cryoglobulin send in this setting.", cryoNext);
  }

  // ── MPGN immune-complex / C3 glomerulopathy ────────────────────────
  const mpgnNext = [
    "Workup for monoclonal gammopathy (SPEP/UPEP/SFLC), HCV/HBV, autoimmune disease.",
    "C3GN/DDD: send complement function studies (C3 nephritic factor, factor H/I autoantibodies). Treatment depends on the driver — eculizumab in selected DDD.",
  ];
  if (cLowLow && !has(positive, "cryoglobulin") && !has(positive, "anti_dsdna")) {
    add("mpgn_ic", "MPGN — immune-complex type", "Low C3 + Low C4 (immune complex)", 3, "Low C3 + low C4 with no clear lupus/cryo/endocarditis driver leaves idiopathic immune-complex MPGN on the differential.", mpgnNext);
  }
  if (cLowNormal && syndrome !== "asymptomatic" && !has(history, "recent_strep_skin")) {
    add("c3g", "C3 glomerulopathy (C3GN / dense deposit disease)", "Low C3, normal C4 (alternative pathway)", 4, "Persistently low C3 with normal C4 and no recent infection points to alternative-pathway dysregulation.", mpgnNext);
  }

  // ── TMA / aHUS ────────────────────────────────────────────────────
  if (has(history, "tma_features")) {
    add("tma", "Thrombotic microangiopathy (HUS / aHUS / drug-induced)", "Endothelial injury", 6, "MAHA + thrombocytopenia + AKI selected — TMA is in the differential of acute renal injury with mild proteinuria/hematuria.", [
      "ADAMTS13, complement factor H/I/MCP, Shiga toxin testing; review drug list (calcineurins, anti-VEGF, gemcitabine, quinine).",
      "Plasma exchange for TTP; eculizumab for confirmed aHUS.",
    ]);
  }

  // ── Membranous nephropathy ────────────────────────────────────────
  const mnNext = [
    "UpToDate allows deferring biopsy in nephrotic-syndrome patients with a positive anti-PLA2R; otherwise biopsy is the gold standard.",
    "Always rule out secondary causes (cancer, HBV/HCV, lupus, drugs); paraneoplastic MN tends to skew older with more anti-THSD7A positivity.",
  ];
  if (isNephrotic) {
    add("mn", "Membranous nephropathy", "Nephrotic / subepithelial deposits", 4, "Membranous is one of the top three causes of adult primary nephrotic syndrome.", mnNext);
  }
  if (has(positive, "anti_pla2r")) {
    add("mn", "Membranous nephropathy (primary, anti-PLA2R+)", "Nephrotic / subepithelial deposits", 6, "Anti-PLA2R positive — supports primary MN; titer can guide therapy and remission.", mnNext);
  }
  if (has(positive, "anti_thsd7a")) {
    add("mn", "Membranous nephropathy (THSD7A — consider paraneoplastic)", "Nephrotic / subepithelial deposits", 5, "Anti-THSD7A positive — uncommon variant with a stronger paraneoplastic signal; pursue age-appropriate cancer screen.", mnNext);
  }
  if (isNephrotic && has(history, "solid_tumor")) {
    add("mn", "Membranous nephropathy (paraneoplastic concern)", "Nephrotic / subepithelial deposits", 3, "Solid tumor history — MN can be paraneoplastic (lung, GI, prostate especially in older patients).", mnNext);
  }
  if (isNephrotic && (has(positive, "hbv") || has(history, "known_hbv"))) {
    add("mn", "Membranous nephropathy (HBV-associated)", "Nephrotic / subepithelial deposits", 3, "HBV is a classic secondary cause of MN.", mnNext);
  }
  if (isNephrotic && has(positive, "syphilis_rpr")) {
    add("mn", "Membranous nephropathy (secondary syphilis)", "Nephrotic / subepithelial deposits", 3, "Secondary syphilis is a treatable cause of MN.", mnNext);
  }

  // ── Minimal change disease ─────────────────────────────────────────
  const mcdNext = [
    "Biopsy shows normal LM with diffuse foot-process effacement on EM.",
    "First-line steroids; relapses common — escalate to calcineurin inhibitor or rituximab per KDIGO 2021.",
  ];
  if (isNephrotic) {
    add("mcd", "Minimal change disease", "Nephrotic / podocyte", 3, "MCD is the most common nephrotic syndrome in children and the third most common in adults.", mcdNext);
  }
  if (isNephrotic && has(history, "lymphoma_heme_malignancy")) {
    add("mcd", "Minimal change disease (paraneoplastic — Hodgkin's)", "Nephrotic / podocyte", 4, "Hodgkin lymphoma is the classic paraneoplastic MCD association.", mcdNext);
  }
  if (isNephrotic && has(history, "chronic_nsaid")) {
    add("mcd", "Minimal change disease (NSAID-associated)", "Nephrotic / podocyte", 3, "NSAIDs can trigger MCD ± AIN (a unique MCD–AIN overlap).", mcdNext);
  }

  // ── FSGS ───────────────────────────────────────────────────────────
  const fsgsNext = [
    "Distinguish primary (diffuse foot-process effacement, abrupt nephrotic syndrome) from secondary (segmental effacement, slow course).",
    "APOL1 high-risk variants accelerate progression; HIV, heroin, obesity, reflux nephropathy, sickle cell are common secondary triggers.",
  ];
  if (isNephrotic) {
    add("fsgs", "Focal segmental glomerulosclerosis", "Nephrotic / podocyte", 3, "FSGS is among the top three causes of adult nephrotic syndrome and the leading cause of nephrotic syndrome in Black adults.", fsgsNext);
  }
  if (has(positive, "hiv") || has(history, "known_hiv")) {
    add("fsgs", "FSGS — HIVAN (collapsing variant)", "Nephrotic / podocyte", 5, "HIV positive — classically presents as collapsing FSGS with massive proteinuria; APOL1 high-risk genotype amplifies risk.", fsgsNext);
  }

  // ── Diabetic nephropathy / DKD ────────────────────────────────────
  if (isNephrotic && has(history, "long_dm_retinopathy")) {
    add("dkd", "Diabetic nephropathy", "Nephrotic / glomerular thickening", 4, "Long-standing diabetes with progressive proteinuria — UpToDate calls diabetic kidney disease the most common cause of nephrotic syndrome overall, and allows deferring biopsy when the etiology is obvious. Retinopathy is supportive; its absence raises suspicion for a superimposed primary GN.", [
      "Maximize RAS blockade + SGLT2i; finerenone if persistent albuminuria on RAS blockade.",
      "Biopsy if atypical features (rapid Cr decline, nephritic features, no retinopathy) suggest superimposed primary GN.",
    ]);
  }

  // ── Monoclonal-gammopathy GN umbrella ─────────────────────────────
  if (has(positive, "spep_sfle_abnl")) {
    add("mgrs", "Monoclonal gammopathy of renal significance (AL amyloid / MIDD / fibrillary / immunotactoid / PGNMID)", "Monoclonal protein", 6, "Monoclonal protein on SPEP/UPEP/SFLC.", [
      "Hematology consult; bone marrow biopsy ± renal biopsy with Congo red, IF, EM.",
      "Treatment is clone-directed (e.g., bortezomib-based for AL amyloid; daratumumab-based regimens).",
    ]);
  }
  if (isNephrotic && has(history, "lymphoma_heme_malignancy")) {
    add("mgrs", "Monoclonal-related GN / amyloid", "Monoclonal protein", 2, "Heme malignancy history — keep MGRS and AL amyloid on the list even if classic syndrome is nephrotic.", []);
  }

  // ── Familial / Alport / thin BM ──────────────────────────────────
  if (has(history, "family_kidney_alport")) {
    add("alport", "Alport syndrome / thin basement membrane disease", "Type IV collagen", 5, "Family history of kidney disease, hearing loss, or eye anomalies points to an inherited collagen IV disorder.", [
      "Send hematuria-focused gene panel (COL4A3/4/5); audiology and ophthalmology.",
      "RAS blockade slows progression; transplant outcomes are good but recipients can develop anti-GBM antibodies.",
    ]);
  }

  // ── HBV-associated PAN / MPGN flavor adjustments ─────────────────
  if (has(positive, "hbv") && (syndrome === "nephritic" || syndrome === "mixed")) {
    add("hbv_assoc", "HBV-associated GN / polyarteritis nodosa", "Infection-driven", 3, "HBV positive with a nephritic-flavored picture — PAN (medium-vessel vasculitis) and MPGN are on the list alongside MN.", [
      "Treat HBV (entecavir/tenofovir) — antiviral therapy is the cornerstone.",
      "Avoid immunosuppression alone without antiviral cover.",
    ]);
  }

  const differentials = Object.values(builders)
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => ({ ...item, signal: signalFromScore(item.score) }))
    .slice(0, 7);

  // ── Alerts ────────────────────────────────────────────────────────
  const alerts: string[] = [];
  if (syndrome === "rpgn" || quantitative.rpgnTrajectory) {
    alerts.push("RPGN signal: Cr is doubling over days–weeks. Get C3/C4, ANA, ANCA, anti-GBM, hepatitis serologies, cryos NOW; biopsy on the same hospitalization.");
  }
  if (isPulmRenal) {
    alerts.push("Pulmonary–renal syndrome: anti-GBM and ANCA must come back the same day. Prepare for plasmapheresis if anti-GBM positive or diffuse alveolar hemorrhage with hypoxia.");
  }
  if (has(positive, "anti_gbm")) {
    alerts.push("Anti-GBM positive: treat as emergency — plasmapheresis + steroids + cyclophosphamide. Outcomes track tightly with dialysis-independent Cr at presentation.");
  }
  if (has(positive, "anca_pr3") || has(positive, "anca_mpo")) {
    alerts.push("ANCA positive: organ-threatening AAV needs prompt induction (steroids + rituximab or cyclophosphamide). Consider PLEX in the PEXIVAS-defined high-risk subgroups.");
  }
  if (quantitative.proteinTier === "nephrotic_range") {
    alerts.push("Nephrotic-range proteinuria: counsel on VTE risk (especially MN with albumin <2.5), infection risk, and dyslipidemia; consider prophylactic anticoagulation per nephrotic-VTE risk score.");
  }
  if (cLowLow && !has(positive, "ana") && !has(sentNegative, "ana")) {
    alerts.push("Low C3 + low C4 with ANA not yet sent — send ANA, anti-dsDNA, anti-Smith, complement (C1q if available) before assuming non-lupus.");
  }
  if (syndrome === "nephritic" && complementPattern.pattern === "incomplete") {
    alerts.push("Nephritic syndrome without C3/C4 — get them today; complement is the highest-yield branchpoint.");
  }

  // ── Next steps ────────────────────────────────────────────────────
  const serologyPlan = buildSerologyPlan(inputs, syndrome);
  const nextSteps: string[] = [];
  if (quantitative.proteinGramsPerDay === null) nextSteps.push("Quantify proteinuria with a spot UPCR (or 24-hour collection) — dipstick alone misses light chains and underestimates burden.");
  if (inputs.protein === "not_checked" || inputs.blood === "not_checked") nextSteps.push("Get a fresh UA with microscopy — dysmorphic RBCs and RBC casts are the highest-yield bedside clues.");
  if (complementPattern.pattern === "incomplete") nextSteps.push("Send C3 and C4 — they branch the differential immediately.");
  if (serologyPlan.needed.length > 0) nextSteps.push(`Outstanding serologies to send: ${serologyPlan.needed.slice(0, 5).map((n) => n.label).join(", ")}${serologyPlan.needed.length > 5 ? ` (+${serologyPlan.needed.length - 5} more in the panel)` : ""}.`);
  if (syndrome === "rpgn" || quantitative.rpgnTrajectory) nextSteps.push("Schedule kidney biopsy on this admission — RPGN outcomes are time-sensitive.");
  if (isNephrotic && !has(positive, "anti_pla2r") && !has(sentNegative, "anti_pla2r")) nextSteps.push("Send anti-PLA2R (and reflex anti-THSD7A if negative) before biopsy when MN is on the list.");
  if (isNephrotic && quantitative.albumin !== null && quantitative.albumin < 2.5) nextSteps.push("Discuss VTE prophylaxis — nephrotic syndrome with albumin <2.5 g/dL is a high-VTE-risk threshold, especially in MN.");
  if (isNephrotic && !has(positive, "spep_sfle_abnl") && !has(sentNegative, "spep_sfle_abnl")) nextSteps.push("Send SPEP + UPEP + SFLC — adult nephrotic syndrome ≥50 years old should screen for amyloid and other MGRS lesions.");
  if (has(history, "long_dm_retinopathy") && isNephrotic) nextSteps.push("Document retinopathy presence/absence — its absence in apparent diabetic nephrotic syndrome is the strongest argument to biopsy.");

  // ── Summary ───────────────────────────────────────────────────────
  const proteinLine = quantitative.proteinGramsPerDay !== null
    ? `${fmt(quantitative.proteinGramsPerDay, 1)} g/day proteinuria`
    : "proteinuria not quantified";
  const complementLine = complementPattern.label;
  const leading = differentials.slice(0, 3).map((item) => item.title).join("; ") || "insufficient data yet";
  const summary = `${derived.label}; ${proteinLine}; ${complementLine}. Leading: ${leading}.`;

  return {
    derivedSyndrome: syndrome,
    derivedSyndromeLabel: derived.label,
    tempoLabel: tempoLabel(inputs.tempo),
    quantitative,
    complementPattern,
    differentials,
    serologyPlan,
    alerts,
    nextSteps: nextSteps.slice(0, 8),
    summary,
  };
}
