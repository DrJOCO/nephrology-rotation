// Hyponatremia diagnostic + correction reasoning helper.
// Algorithm structure follows UpToDate "Diagnostic evaluation of adults with hyponatremia"
// (Sterns, last updated Sep 8 2025) and "Overview of the treatment of hyponatremia in adults".
// This is a teaching/reasoning aid, not a diagnostic device.

export type HypoDuration = "unknown" | "acute_under_48" | "chronic_over_48";
export type HypoSymptomSeverity = "asymptomatic" | "mild_mod" | "severe" | "intracranial";
export type HypoVolumeStatus = "unknown" | "hypovolemic" | "euvolemic" | "hypervolemic";

export interface HyponatremiaInputs {
  // Sodium / tonicity
  serumNa: string;
  serumGlucose: string;
  measuredOsm: string;
  selectedTonicityFlags: string[]; // lipemic, jaundice, plasma_dyscrasia, mannitol_ivig, post_turp_hysteroscopy, severe_azotemia
  // Acuity / symptoms
  duration: HypoDuration;
  symptomSeverity: HypoSymptomSeverity;
  // Volume status
  volumeStatus: HypoVolumeStatus;
  selectedVolumeClues: string[];
  // Renal function
  serumCr: string;
  serumBun: string;
  knownCkd: boolean;
  // Urine
  urineOsm: string;
  urineNa: string;
  urineK: string;
  urineCr: string;
  urineUreaNitrogen: string;
  urineUricAcid: string;
  serumUricAcid: string;
  // History / context
  selectedHistory: string[];
  selectedDrugs: string[];
  // Acid-base / K
  serumK: string;
  serumBicarb: string;
  // ODS modifiers
  selectedOdsRisk: string[];
  // Patient
  weightKg: string;
}

export interface CorrectedSodiumResult {
  measured: number | null;
  correctedKatz: number | null; // 1.6 mEq per 100 mg/dL >100
  correctedHillier: number | null; // 2.4 mEq per 100 mg/dL >100
  glucose: number | null;
}

export interface EffectiveOsmResult {
  value: number | null;             // effective (tonic) osm = 2Na + glucose/18
  totalCalculated: number | null;   // total osm = 2Na + glucose/18 + BUN/2.8
  measured: number | null;
  osmolarGap: number | null;        // measured − totalCalculated (real osm gap; needs BUN)
  classification: "hypotonic" | "isotonic" | "hypertonic" | "indeterminate";
  note: string;
}

export interface FractionalExcretionUricAcidResult {
  value: number | null;
  label: string;
  interpretation: string;
}

export interface CorrectionTargetResult {
  perDayCap: number; // mEq/L per 24h
  symptomReliefTarget: number; // mEq/L in first 24h to relieve sx
  highOdsRisk: boolean;
  reasons: string[];
}

export interface AdrogueMadiasFluid {
  id: string;
  label: string;
  fluidNa: number; // mEq/L
  fluidK: number; // mEq/L
}

export interface AdrogueMadiasResult {
  fluidId: string;
  label: string;
  changePerLiter: number | null; // mEq/L change in serum Na per L infused
  litersForTarget: number | null; // L to reach the symptom-relief target (4 mEq)
  totalBodyWater: number | null;
}

export interface HyponatremiaDifferentialItem {
  id: string;
  title: string;
  bucket: string;
  signal: "High" | "Moderate" | "Consider";
  score: number;
  supports: string[];
  next: string[];
}

export interface HyponatremiaAssessmentResult {
  correctedNa: CorrectedSodiumResult;
  effectiveOsm: EffectiveOsmResult;
  feUricAcid: FractionalExcretionUricAcidResult;
  estimatedDailySolute: { value: number | null; note: string };
  correctionTarget: CorrectionTargetResult;
  adrogueMadias: AdrogueMadiasResult[];
  differentials: HyponatremiaDifferentialItem[];
  alerts: string[];
  nextSteps: string[];
  summary: string;
  acuityLabel: string;
  severityLabel: string;
}

export const DEFAULT_HYPO_INPUTS: HyponatremiaInputs = {
  serumNa: "",
  serumGlucose: "",
  measuredOsm: "",
  selectedTonicityFlags: [],
  duration: "unknown",
  symptomSeverity: "asymptomatic",
  volumeStatus: "unknown",
  selectedVolumeClues: [],
  serumCr: "",
  serumBun: "",
  knownCkd: false,
  urineOsm: "",
  urineNa: "",
  urineK: "",
  urineCr: "",
  urineUreaNitrogen: "",
  urineUricAcid: "",
  serumUricAcid: "",
  selectedHistory: [],
  selectedDrugs: [],
  serumK: "",
  serumBicarb: "",
  selectedOdsRisk: [],
  weightKg: "",
};

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

function signalFromScore(score: number): HyponatremiaDifferentialItem["signal"] {
  if (score >= 7) return "High";
  if (score >= 4) return "Moderate";
  return "Consider";
}

export function calculateCorrectedSodium(serumNaStr: string, serumGlucoseStr: string): CorrectedSodiumResult {
  const measured = parsePositive(serumNaStr);
  const glucose = parsePositive(serumGlucoseStr);
  if (measured === null || glucose === null || glucose <= 100) {
    return { measured, correctedKatz: null, correctedHillier: null, glucose };
  }
  const delta = (glucose - 100) / 100;
  return {
    measured,
    correctedKatz: measured + 1.6 * delta,
    correctedHillier: measured + 2.4 * delta,
    glucose,
  };
}

export function calculateEffectiveOsmolality(inputs: HyponatremiaInputs): EffectiveOsmResult {
  const na = parsePositive(inputs.serumNa);
  const glucose = parsePositive(inputs.serumGlucose);
  const measured = parsePositive(inputs.measuredOsm);
  const bun = parsePositive(inputs.serumBun);
  if (na === null) {
    return { value: null, totalCalculated: null, measured, osmolarGap: null, classification: "indeterminate", note: "Enter serum Na to estimate effective osmolality." };
  }
  // Effective (tonic) osmolality excludes urea — drives water movement across membranes.
  const calculated = 2 * na + (glucose ?? 100) / 18;
  // Total calculated osm includes urea — used for the standard osmolar gap (toxic alcohols, mannitol, paraprotein).
  // Without BUN entered we can't compute a meaningful osm gap; leave it null rather than overstating it.
  const totalCalculated = bun !== null ? calculated + bun / 2.8 : null;
  const osmolarGap = measured !== null && totalCalculated !== null ? measured - totalCalculated : null;
  let classification: EffectiveOsmResult["classification"] = "indeterminate";
  let note = "";
  if (measured !== null) {
    if (measured < 275) {
      classification = "hypotonic";
      note = "Hypotonic hyponatremia — proceed with the standard differential.";
    } else if (measured >= 275 && measured <= 295) {
      classification = "isotonic";
      note = "Isotonic measured osm — think pseudohyponatremia (lipemic serum, paraprotein, severe hyperprotein) or non-hypotonic states (TURP/hysteroscopic irrigation, IVIG/mannitol).";
    } else {
      classification = "hypertonic";
      note = "Hypertonic measured osm — think hyperglycemia/mannitol/glycerol; the low Na may reflect water shift, not water excess.";
    }
  } else if (glucose !== null && glucose > 250) {
    classification = "hypertonic";
    note = "Glucose >250 — likely translational (hypertonic) hyponatremia; correct Na for glucose first.";
  } else {
    classification = "hypotonic";
    note = "No measured osm; without hyperglycemia or other ineffective osmoles, hypotonic is most likely.";
  }
  return { value: calculated, totalCalculated, measured, osmolarGap, classification, note };
}

export function calculateFractionalExcretionUricAcid(inputs: HyponatremiaInputs): FractionalExcretionUricAcidResult {
  const sUA = parsePositive(inputs.serumUricAcid);
  const uUA = parsePositive(inputs.urineUricAcid);
  const sCr = parsePositive(inputs.serumCr);
  const uCr = parsePositive(inputs.urineCr);
  if (sUA === null || uUA === null || sCr === null || uCr === null) {
    return { value: null, label: "FEUA pending", interpretation: "Enter serum and urine uric acid plus serum and urine creatinine." };
  }
  const value = (uUA * sCr) / (sUA * uCr) * 100;
  let interpretation = "Borderline FEUA — nondiagnostic.";
  if (value > 12) interpretation = "FEUA >12% supports SIAD physiology in untreated patients (water retention/V1a-mediated uricosuria).";
  else if (value < 8) interpretation = "FEUA <8% essentially excludes SIAD (UpToDate cites 100% specificity in small studies).";
  return { value, label: `FEUA ${fmt(value)}%`, interpretation };
}

export function calculateEstimatedDailySolute(inputs: HyponatremiaInputs): { value: number | null; note: string } {
  const uun = parsePositive(inputs.urineUreaNitrogen); // mg/dL
  const uCr = parsePositive(inputs.urineCr); // mg/dL
  if (uun === null || uCr === null) {
    return { value: null, note: "Enter urine urea nitrogen and urine Cr to estimate daily solute load (proxy for diet)." };
  }
  // Estimate UOP (L/day) ≈ 100/UCr (mg/dL); daily urea (mmol) = UUN(mg/dL) × 10 / 2.8 × UOP(L) per UpToDate
  const estUop = 100 / uCr;
  const dailyUreaMmol = (uun * 10 / 2.8) * estUop;
  let note = "";
  if (dailyUreaMmol < 150) note = "Daily urea <150 mmol/d suggests very low protein intake — predisposes to low-solute hyponatremia (beer potomania, tea-and-toast).";
  else if (dailyUreaMmol < 300) note = "Borderline solute intake.";
  else note = "Solute intake likely adequate.";
  return { value: dailyUreaMmol, note };
}

export function calculateCorrectionTarget(inputs: HyponatremiaInputs): CorrectionTargetResult {
  const na = parsePositive(inputs.serumNa);
  const reasons: string[] = [];
  // Default per UpToDate: 10–12 mEq/L per 24h cap; tighten to 8 mEq/L if Na<120 or other ODS risk factors
  let perDayCap = 10;
  let highOdsRisk = false;
  if (na !== null && na < 120) {
    perDayCap = 8;
    reasons.push("Serum Na <120 mEq/L — UpToDate caps correction at 8 mEq/L in any 24-hour period.");
    highOdsRisk = true;
  }
  if (na !== null && na <= 105) {
    reasons.push("Serum Na ≤105 — among the highest-risk groups for ODS.");
    highOdsRisk = true;
  }
  if (hasAny(inputs.selectedOdsRisk, ["alcohol", "malnutrition", "liver_disease", "hypoK", "hypoP"])) {
    perDayCap = Math.min(perDayCap, 8);
    reasons.push("ODS risk modifier selected (alcohol use disorder, malnutrition, liver disease, hypokalemia, or hypophosphatemia).");
    highOdsRisk = true;
  }
  if (inputs.duration === "acute_under_48" && hasAny(inputs.selectedHistory, ["self_induced_water"])) {
    reasons.push("Acute self-induced water intoxication — risk of ODS is low; faster correction may be appropriate when symptomatic.");
  }
  return {
    perDayCap,
    symptomReliefTarget: 4,
    highOdsRisk,
    reasons,
  };
}

const ADROGUE_FLUIDS: AdrogueMadiasFluid[] = [
  { id: "ns", label: "0.9% saline (154/0)", fluidNa: 154, fluidK: 0 },
  { id: "hypertonic_3", label: "3% saline (513/0)", fluidNa: 513, fluidK: 0 },
  { id: "lr", label: "Lactated Ringer's (130/4)", fluidNa: 130, fluidK: 4 },
  { id: "half_ns", label: "0.45% saline (77/0)", fluidNa: 77, fluidK: 0 },
  { id: "d5w", label: "D5W (0/0)", fluidNa: 0, fluidK: 0 },
];

export function calculateAdrogueMadias(inputs: HyponatremiaInputs): AdrogueMadiasResult[] {
  const na = parsePositive(inputs.serumNa);
  const weight = parsePositive(inputs.weightKg);
  if (na === null || weight === null) {
    return ADROGUE_FLUIDS.map((f) => ({ fluidId: f.id, label: f.label, changePerLiter: null, litersForTarget: null, totalBodyWater: null }));
  }
  const tbw = weight * 0.6;
  return ADROGUE_FLUIDS.map((f) => {
    const change = (f.fluidNa + f.fluidK - na) / (tbw + 1);
    const litersForTarget = Math.abs(change) > 0.001 ? 4 / change : null;
    return {
      fluidId: f.id,
      label: f.label,
      changePerLiter: change,
      litersForTarget: litersForTarget !== null && litersForTarget > 0 ? litersForTarget : null,
      totalBodyWater: tbw,
    };
  });
}

function severityLabel(severity: HypoSymptomSeverity): string {
  if (severity === "severe") return "Severe symptoms (seizure, obtundation, coma, respiratory arrest)";
  if (severity === "intracranial") return "Known intracranial pathology";
  if (severity === "mild_mod") return "Mild-to-moderate symptoms";
  return "Asymptomatic";
}

function acuityLabel(duration: HypoDuration): string {
  if (duration === "acute_under_48") return "Acute (<48 h)";
  if (duration === "chronic_over_48") return "Chronic (≥48 h or unknown duration)";
  return "Duration unknown — treat as chronic for ODS risk";
}

export function buildHyponatremiaAssessment(inputs: HyponatremiaInputs): HyponatremiaAssessmentResult {
  const correctedNa = calculateCorrectedSodium(inputs.serumNa, inputs.serumGlucose);
  const effectiveOsm = calculateEffectiveOsmolality(inputs);
  const feUricAcid = calculateFractionalExcretionUricAcid(inputs);
  const estimatedDailySolute = calculateEstimatedDailySolute(inputs);
  const correctionTarget = calculateCorrectionTarget(inputs);
  const adrogueMadias = calculateAdrogueMadias(inputs);

  const na = parsePositive(inputs.serumNa);
  const uOsm = parsePositive(inputs.urineOsm);
  const uNa = parseNonNegative(inputs.urineNa);
  const sCr = parsePositive(inputs.serumCr);
  const sK = parsePositive(inputs.serumK);
  const sHCO3 = parsePositive(inputs.serumBicarb);

  // Tonicity gating
  const isLikelyHypotonic = effectiveOsm.classification === "hypotonic" || effectiveOsm.classification === "indeterminate";
  const isHypertonic = effectiveOsm.classification === "hypertonic";
  const isLikelyPseudo = hasAny(inputs.selectedTonicityFlags, ["lipemic", "plasma_dyscrasia", "jaundice"]);

  const builders: Record<string, HyponatremiaDifferentialItem & { _titleScore: number }> = {};
  // Most-specific-title-wins so a clinician-picked "Hypervolemic hyponatremia" doesn't
  // shadow a stronger "Hyponatremia of heart failure" entry, and vice-versa.
  const ensure = (id: string, title: string, bucket: string, next: string[]) => {
    builders[id] ??= { id, title, bucket, score: 0, signal: "Consider", supports: [], next, _titleScore: 0 };
    return builders[id];
  };
  const add = (id: string, title: string, bucket: string, points: number, support: string, next: string[]) => {
    const item = ensure(id, title, bucket, next);
    item.score += points;
    if (points > item._titleScore) {
      item.title = title;
      item.bucket = bucket;
      item._titleScore = points;
    }
    if (next.length > 0 && item.next.length === 0) item.next = next;
    addUnique(item.supports, support);
  };

  // ── Non-hypotonic states ────────────────────────────────────────────────
  const pseudoNext = [
    "Confirm with direct ion-selective electrode (whole-blood gas analyzer) sodium; lab Na on diluted plasma can read falsely low when plasma water is reduced.",
    "Look for lipemic serum, severe hypertriglyceridemia, or paraprotein/myeloma.",
  ];
  if (isLikelyPseudo) add("pseudo", "Pseudohyponatremia", "Non-hypotonic", 6, "Lipemic serum, obstructive jaundice (lipoprotein-X), or plasma cell dyscrasia selected.", pseudoNext);

  const hypertonicNext = [
    "Correct Na for glucose (Katz 1.6 or Hillier 2.4 per 100 mg/dL >100); the apparent hyponatremia may resolve with glycemic control.",
    "Mannitol, glycerol, IVIG (sucrose/maltose vehicle), and contrast can mimic hyperglycemia translationally.",
  ];
  if (isHypertonic) add("hypertonic", "Hypertonic (translational) hyponatremia", "Non-hypotonic", 5, `Effective/measured osm pattern fits a high-tonicity state${correctedNa.glucose ? ` (glucose ${fmt(correctedNa.glucose, 0)} mg/dL)` : ""}.`, hypertonicNext);
  if (has(inputs.selectedTonicityFlags, "mannitol_ivig")) add("hypertonic", "Hypertonic (translational) hyponatremia", "Non-hypotonic", 3, "Mannitol/glycerol/IVIG exposure selected.", hypertonicNext);

  if (has(inputs.selectedTonicityFlags, "post_turp_hysteroscopy")) {
    add("isotonic_irrigation", "Isotonic hyponatremia from electrolyte-free irrigation", "Non-hypotonic", 6, "Recent TURP / hysteroscopy / endoscopic procedure with non-conducting irrigant selected.", [
      "Glycine, sorbitol, or mannitol absorption can cause acute hyponatremia even with normal measured osmolality.",
      "Look for visual symptoms (glycine), neurologic signs, and rapid Na change.",
    ]);
  }
  if (has(inputs.selectedTonicityFlags, "severe_azotemia")) {
    add("azotemia_pseudohypertonic", "Apparent isotonic/hypertonic osm from severe azotemia", "Non-hypotonic", 2, "Severe uremia raises measured osm via urea (an ineffective osmole); the patient may still be effectively hypotonic.", [
      "Use effective osm (2·Na + glucose/18) not the measured osm to gate the algorithm.",
      "Most azotemia-related hyponatremia is in fact hypotonic and should be evaluated as such.",
    ]);
  }

  // ── Hypotonic differential ──────────────────────────────────────────────
  if (isLikelyHypotonic) {
    // Severely reduced GFR
    if (sCr !== null && (sCr >= 4 || inputs.knownCkd)) {
      add("severe_gfr", "Hyponatremia from severely reduced GFR", "Impaired water excretion", 4, "Severely reduced GFR limits free-water excretion regardless of ADH.", [
        "Restrict free water; address underlying CKD/AKI; loop diuretic with normal saline can help when needed.",
        "Tolvaptan/vaptans are NOT first-line in advanced CKD or hypovolemia.",
      ]);
    }

    // Thiazide
    if (has(inputs.selectedDrugs, "thiazide")) {
      add("thiazide", "Thiazide-induced hyponatremia", "Drug-induced", 6, "Thiazide/thiazide-type diuretic selected.", [
        "Stop the thiazide; expect rapid water diuresis once it's gone — guard against overly rapid correction (consider proactive dDAVP if Na <120 and reversible).",
        "Often coexists with hypokalemia and metabolic alkalosis — replete K first, which itself raises Na.",
      ]);
      if (sK !== null && sK < 3.5) add("thiazide", "Thiazide-induced hyponatremia", "Drug-induced", 1, "Concomitant hypokalemia is a classic thiazide pattern.", []);
    }

    // Hypervolemic states
    if (has(inputs.selectedHistory, "heart_failure") || has(inputs.selectedVolumeClues, "edema") || has(inputs.selectedVolumeClues, "jvd")) {
      add("hf", "Hyponatremia of heart failure", "Hypervolemic / low EAV", 5, "Heart failure / peripheral edema / elevated JVP selected.", [
        "Free water restriction; loop diuresis; consider tolvaptan if persistent and symptomatic, watching liver/correction rate.",
        "UNa is typically <20 from sodium avidity — supports low effective arterial volume despite total-body volume excess.",
      ]);
      if (uNa !== null && uNa < 20) add("hf", "Hyponatremia of heart failure", "Hypervolemic / low EAV", 1, "UNa <20 fits the avid sodium retention of HF.", []);
    }
    if (has(inputs.selectedHistory, "cirrhosis") || has(inputs.selectedVolumeClues, "ascites")) {
      add("cirrhosis", "Hyponatremia of cirrhosis", "Hypervolemic / low EAV", 5, "Cirrhosis / ascites selected.", [
        "Free water restriction; albumin in the right setting; midodrine/octreotide for HRS physiology; tolvaptan only if you can monitor closely.",
        "Avoid hypotonic IVF; large-volume paracentesis with albumin can paradoxically improve Na.",
      ]);
    }
    if (has(inputs.selectedHistory, "nephrotic")) {
      add("nephrotic", "Hyponatremia of nephrotic syndrome", "Hypervolemic / low EAV", 3, "Nephrotic syndrome selected — peripheral edema with reduced effective arterial volume.", [
        "Treat the underlying glomerular disease; use loop diuretics for edema; restrict free water.",
      ]);
    }

    // Hypovolemic — extrarenal
    if (hasAny(inputs.selectedHistory, ["gi_losses", "bleeding"]) || has(inputs.selectedVolumeClues, "orthostasis") || has(inputs.selectedVolumeClues, "dry_mucosa")) {
      add("hypovol_extrarenal", "Hypovolemic hyponatremia (extrarenal losses)", "Hypovolemic", 5, "Vomiting/diarrhea/bleeding or volume-depletion exam clues selected.", [
        "Isotonic saline is both diagnostic and therapeutic — but watch for autocorrection once volume is restored (UpToDate flag for proactive dDAVP if Na <120).",
        "Expect UNa <20 with intact kidneys.",
      ]);
      if (uNa !== null && uNa < 20) add("hypovol_extrarenal", "Hypovolemic hyponatremia (extrarenal losses)", "Hypovolemic", 1, `UNa ${fmt(uNa, 0)} <20 fits sodium-avid kidneys responding to volume depletion.`, []);
    }
    // Hypovolemic — renal salt loss
    if (has(inputs.selectedDrugs, "thiazide")) {
      // already counted above; add salt-wasting flavor only with high UNa
      if (uNa !== null && uNa > 30) add("hypovol_renal_diuretic", "Renal salt loss from thiazide", "Hypovolemic", 3, `UNa ${fmt(uNa, 0)} >30 in a thiazide patient supports renal salt wasting.`, [
        "Stop the thiazide and watch for rapid autocorrection.",
      ]);
    }
    if (has(inputs.selectedHistory, "adrenal_insufficiency")) {
      const ai = sK !== null && sK > 5 && sHCO3 !== null && sHCO3 < 22;
      add("adrenal_insufficiency", "Adrenal insufficiency", "Hypovolemic / euvolemic", ai ? 7 : 4, ai ? "Hyperkalemia + non-anion-gap acidosis is the primary AI fingerprint." : "Adrenal insufficiency selected.", [
        "Cosyntropin stim test, AM cortisol/ACTH; do not delay glucocorticoid replacement when clinically suspected.",
        "Primary AI = hypovolemic with hyperK; secondary AI (pituitary) = euvolemic without hyperK.",
      ]);
    }
    if (has(inputs.selectedHistory, "sah_tbi") || has(inputs.selectedHistory, "cns_event")) {
      add("csw", "Cerebral salt wasting", "Hypovolemic (CNS)", 4, "Recent SAH / TBI / CNS event with apparent renal salt loss.", [
        "Hypovolemic vs. SIAD — fluid response distinguishes them: CSW improves with saline, SIAD worsens.",
        "Hypouricemia + high FEUA can be seen in BOTH; volume status is the divider.",
      ]);
    }

    // Euvolemic — SIAD core
    const siadFromDrug = hasAny(inputs.selectedDrugs, ["ssri_snri", "carbamazepine", "mdma", "ddavp", "antipsychotic", "antiepileptic", "cyclophosphamide"]);
    const siadFromContext = hasAny(inputs.selectedHistory, ["malignancy_lung", "malignancy_other", "pulmonary_disease", "cns_event", "post_op", "pain_nausea", "hiv"]);
    // Canonical SIAD next-steps. Pass on every SIAD `add()` so a drug-only / context-only / FEUA-only
    // first-write doesn't leave the differential card without actionable guidance.
    const siadNext = [
      "Diagnosis of exclusion — also rule out hypothyroidism and cortisol deficiency; consider FEUA (>10–12% supports SIAD).",
      "Treat with fluid restriction first; salt tablets ± loop, vaptans, or urea if persistent. AVOID isotonic saline alone in true SIAD with concentrated urine.",
    ];
    if (uOsm !== null && uOsm > 100 && uNa !== null && uNa >= 30 && (inputs.volumeStatus === "euvolemic" || inputs.volumeStatus === "unknown")) {
      add("siad", "SIAD (syndrome of inappropriate antidiuresis)", "Euvolemic", 5, `UOsm ${fmt(uOsm, 0)} >100 + UNa ${fmt(uNa, 0)} ≥30 with apparent euvolemia is the classic SIAD pattern.`, siadNext);
    }
    if (siadFromDrug) add("siad", "SIAD (syndrome of inappropriate antidiuresis)", "Euvolemic", 3, "SIAD-associated medication exposure (SSRI/SNRI, carbamazepine, MDMA, dDAVP, antiepileptic, antipsychotic, cyclophosphamide).", siadNext);
    if (siadFromContext) add("siad", "SIAD (syndrome of inappropriate antidiuresis)", "Euvolemic", 3, "SIAD context selected (lung/other malignancy, pulmonary disease, CNS event, post-op, pain/nausea, HIV).", siadNext);
    if (feUricAcid.value !== null && feUricAcid.value > 12) add("siad", "SIAD (syndrome of inappropriate antidiuresis)", "Euvolemic", 1, `${feUricAcid.label} >12% supports SIAD.`, siadNext);

    // Hypothyroidism
    if (has(inputs.selectedHistory, "hypothyroid")) {
      add("hypothyroid", "Severe hypothyroidism / myxedema", "Euvolemic", 3, "Hypothyroidism selected — usually requires SEVERE hypothyroidism / myxedema to cause hyponatremia.", [
        "Check TSH/free T4; treat the underlying disease.",
        "Coexistence is common in hospitalized patients — keep looking for another cause unless myxedema is overt.",
      ]);
    }
    // Glucocorticoid deficiency (secondary AI / euvolemic flavor)
    if (has(inputs.selectedHistory, "glucocorticoid_deficiency")) {
      add("cortisol_def", "Cortisol/glucocorticoid deficiency (secondary AI)", "Euvolemic", 4, "Glucocorticoid deficiency selected — euvolemic, with biochemistry indistinguishable from SIAD.", [
        "AM cortisol/ACTH; cosyntropin stim; brain imaging if pituitary cause suspected.",
        "Glucocorticoid replacement reverses hyponatremia rapidly — also a setup for overcorrection.",
      ]);
    }

    // Primary polydipsia / low-solute
    if (has(inputs.selectedHistory, "primary_polydipsia") || has(inputs.selectedHistory, "self_induced_water")) {
      add("polydipsia", "Primary polydipsia / water intoxication", "Euvolemic", 5, "High water intake selected (psychiatric polydipsia, marathon, MDMA, water-loading).", [
        "Urine osm should be appropriately dilute (<100); restrict water intake.",
        "Once intake stops, brisk water diuresis follows — major overcorrection risk.",
      ]);
      if (uOsm !== null && uOsm < 100) add("polydipsia", "Primary polydipsia / water intoxication", "Euvolemic", 2, `UOsm ${fmt(uOsm, 0)} <100 confirms a water diuresis pattern.`, []);
    }
    if (has(inputs.selectedHistory, "low_solute_intake") || (estimatedDailySolute.value !== null && estimatedDailySolute.value < 150)) {
      add("low_solute", "Low-solute hyponatremia (beer potomania, tea-and-toast)", "Euvolemic", 4, "Low protein/solute intake limits free-water excretion regardless of ADH.", [
        "Refeed slowly; expect water diuresis as solute returns — guard against rapid correction.",
        "Daily urea <150 mmol/d is a useful objective clue.",
      ]);
    }

    // Reset osmostat
    if (has(inputs.selectedHistory, "reset_osmostat")) {
      add("reset_osmostat", "Reset osmostat", "Euvolemic", 2, "Reset osmostat selected — chronic, stable mild hyponatremia that responds appropriately to water loading and restriction.", [
        "No specific therapy; recognize to avoid unnecessary 3% saline or fluid restriction.",
      ]);
    }

    // Exercise-associated
    if (has(inputs.selectedHistory, "exercise_associated")) {
      add("exercise", "Exercise-associated hyponatremia", "Acute / euvolemic", 4, "Endurance exercise context selected.", [
        "Acute by definition — low ODS risk, treat symptoms aggressively (3% saline boluses for sx).",
      ]);
    }

    // Volume status alone — give weight when explicitly chosen.
    // Pass real next-step guidance: when these fire as the *first* write for the entry
    // (e.g., the student picked hypovolemic with no GI/bleeding clues), `ensure`'s
    // first-write-wins would otherwise leave the differential card with no actions.
    if (inputs.volumeStatus === "hypovolemic") add("hypovol_extrarenal", "Hypovolemic hyponatremia", "Hypovolemic", 1, "Clinician-assessed hypovolemia.", [
      "Isotonic saline is both diagnostic and therapeutic — watch for autocorrection once volume is restored; consider proactive dDAVP if Na <120.",
      "Expect UNa <20 with intact kidneys; UNa ≥30 in a hypovolemic patient points to renal salt loss (diuretic, salt-wasting, AI).",
    ]);
    if (inputs.volumeStatus === "hypervolemic") add("hf", "Hypervolemic hyponatremia", "Hypervolemic / low EAV", 1, "Clinician-assessed hypervolemia.", [
      "Free water restriction first; loop diuresis; treat the underlying low-EAV state (HF, cirrhosis, nephrotic).",
      "UNa is typically <20 from sodium avidity despite total-body volume excess.",
    ]);

    // K/HCO3 patterns. Pass populated `next` so a K-pattern hit that creates the entry cold
    // (no thiazide selected, no GI losses ticked, no AI in history) still surfaces guidance.
    if (sK !== null && sHCO3 !== null) {
      if (sK < 3.5 && sHCO3 > 26) add("thiazide", "Diuretic/vomiting pattern", "Drug or GI", 1, "Hypokalemia + metabolic alkalosis fits diuretic use or vomiting.", [
        "Replete K first — raising K alone raises Na and helps the alkalosis resolve.",
        "Identify driver: thiazide (stop it; watch for water diuresis), vomiting (treat emesis, replete volume); guard against overcorrection once water excretion returns.",
      ]);
      if (sK < 3.5 && sHCO3 < 22) add("hypovol_extrarenal", "Diarrhea / laxative pattern", "Hypovolemic", 1, "Hypokalemia + non-anion-gap acidosis fits diarrhea or laxatives.", [
        "Replete K and volume; isotonic saline is diagnostic + therapeutic — watch for autocorrection once volume is restored.",
        "Look for laxative misuse if no overt GI losses; check stool studies if persistent.",
      ]);
      if (sK > 5 && sHCO3 < 22) add("adrenal_insufficiency", "Primary adrenal insufficiency pattern", "Hypovolemic / euvolemic", 2, "Hyperkalemia + non-anion-gap acidosis fits primary AI.", [
        "Cosyntropin stim test, AM cortisol/ACTH; do not delay empiric glucocorticoid replacement when clinically suspected.",
        "Primary AI = hypovolemic with hyperK; secondary AI (pituitary) = euvolemic without hyperK.",
      ]);
    }
  }

  const differentials = Object.values(builders)
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => {
      const { _titleScore: _ignored, ...rest } = item;
      return { ...rest, signal: signalFromScore(item.score) };
    })
    .slice(0, 7);

  // ── Alerts ──────────────────────────────────────────────────────────────
  const alerts: string[] = [];
  if (inputs.symptomSeverity === "severe" || inputs.symptomSeverity === "intracranial") {
    alerts.push("Severe symptoms / intracranial pathology: give 100 mL bolus of 3% saline; may repeat ×2 (300 mL total) over 30 min until symptoms abate. Recheck Na q1h initially.");
  }
  if (na !== null && na < 120 && inputs.symptomSeverity === "asymptomatic") {
    alerts.push("Severe hyponatremia (Na <120) without severe sx: start 3% saline ~0.25 mL/kg/h; consider proactive dDAVP if cause is reversible or ODS risk is high.");
  }
  if (correctionTarget.highOdsRisk) {
    alerts.push("High ODS risk profile — cap correction at 8 mEq/L per 24 h; consider DDAVP clamp + relowering with D5W if you exceed the cap.");
  }
  if (na !== null && na <= 105) {
    alerts.push("Na ≤105: among the highest-risk groups for ODS — preplan a correction-rate strategy and frequent (q1–2 h) Na monitoring.");
  }
  if (inputs.duration === "acute_under_48" && hasAny(inputs.selectedHistory, ["self_induced_water", "exercise_associated", "primary_polydipsia"])) {
    alerts.push("Acute self-induced water excess: ODS risk is low; treat symptoms aggressively but still monitor.");
  }
  if (has(inputs.selectedDrugs, "thiazide") && na !== null && na < 125) {
    alerts.push("Thiazide hyponatremia: stopping the drug triggers a brisk water diuresis — consider proactive dDAVP to prevent overshoot.");
  }
  if (has(inputs.selectedHistory, "adrenal_insufficiency") || has(inputs.selectedHistory, "glucocorticoid_deficiency")) {
    alerts.push("Glucocorticoid deficiency: steroid replacement causes rapid water diuresis and Na rise — anticipate overshoot.");
  }

  // ── Next steps ──────────────────────────────────────────────────────────
  const nextSteps: string[] = [];
  if (parsePositive(inputs.urineOsm) === null) nextSteps.push("Get urine osmolality — single most useful initial urine test (>100 = ADH active; <100 = water diuresis pattern).");
  if (parseNonNegative(inputs.urineNa) === null) nextSteps.push("Get urine sodium — <30 favors hypovolemia or low-EAV states; ≥30 favors SIAD, salt-wasting, or diuretics.");
  if (correctedNa.glucose === null) nextSteps.push("Confirm glucose to exclude translational/hypertonic hyponatremia and to compute corrected Na.");
  if (parsePositive(inputs.measuredOsm) === null && (correctedNa.glucose ?? 0) > 200) nextSteps.push("Send measured serum osmolality when hyperglycemia, mannitol/glycerol, IVIG, or paraproteins are possible.");
  if (parsePositive(inputs.serumK) === null || parsePositive(inputs.serumBicarb) === null) nextSteps.push("Pull K and HCO3 — pattern recognition (vomit/diuretic vs diarrhea vs primary AI) helps narrow the differential.");
  if (inputs.symptomSeverity === "severe" || inputs.symptomSeverity === "intracranial") nextSteps.push("Push the 100 mL × up-to-3 doses of 3% saline now — do not wait for the full workup.");
  if (correctionTarget.highOdsRisk) nextSteps.push("Plan ODS-safe correction: target ~4–6 mEq/L in the first 24 h, cap at 8 mEq/L; monitor Na q1–2 h while on hypertonic saline.");
  if (parsePositive(inputs.urineCr) === null && parsePositive(inputs.urineUreaNitrogen) === null) nextSteps.push("Add urine Cr ± urea nitrogen if low solute intake or primary polydipsia is on the differential.");

  // ── Summary ─────────────────────────────────────────────────────────────
  const leading = differentials.slice(0, 3).map((item) => item.title).join("; ") || "insufficient data yet";
  const naLine = na !== null ? `Na ${fmt(na, 0)} mEq/L` : "Na not entered";
  const acuity = acuityLabel(inputs.duration);
  const sev = severityLabel(inputs.symptomSeverity);
  const summary = `${naLine} | ${acuity} | ${sev} | tonicity: ${effectiveOsm.classification}. Leading: ${leading}.`;

  return {
    correctedNa,
    effectiveOsm,
    feUricAcid,
    estimatedDailySolute,
    correctionTarget,
    adrogueMadias,
    differentials,
    alerts,
    nextSteps: nextSteps.slice(0, 8),
    summary,
    acuityLabel: acuity,
    severityLabel: sev,
  };
}
