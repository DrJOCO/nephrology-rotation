export type AkiBpPattern = "not_recorded" | "stable" | "low_normal" | "hypotension" | "shock" | "hypertensive";
export type AkiUopStatus = "not_recorded" | "normal" | "low_6_12" | "low_12" | "very_low_24" | "anuria";
export type AkiUaGrade = "not_checked" | "negative" | "trace_1" | "two_plus" | "three_plus" | "nephrotic";
export type AkiRbcStatus = "not_checked" | "none" | "few" | "many" | "dysmorphic";
export type AkiWbcStatus = "not_checked" | "none" | "pyuria" | "wbc_casts";

export interface AkiToolInputs {
  baselineCr: string;
  currentCr: string;
  bpMinSbp: string;
  bpMinMap: string;
  bpPattern: AkiBpPattern;
  uop: AkiUopStatus;
  uop24hVolumeMl: string;
  weightKg: string;
  krtInitiated: boolean;
  selectedHistory: string[];
  selectedContext: string[];
  selectedNephrotoxins: string[];
  protein: AkiUaGrade;
  blood: AkiUaGrade;
  rbc: AkiRbcStatus;
  wbc: AkiWbcStatus;
  selectedSediment: string[];
  selectedImaging: string[];
  serumNa: string;
  urineNa: string;
  urineCr: string;
  serumCrForUrine: string;
  urineUrea: string;
  serumBun: string;
}

export interface AkiStageResult {
  creatinineStage: number | null;
  uopStage: number | null;
  overallStage: number | null;
  baseline: number | null;
  current: number | null;
  delta: number | null;
  ratio: number | null;
  label: string;
  reasons: string[];
}

export interface FractionalExcretionResult {
  value: number | null;
  label: string;
  interpretation: string;
  missing: string[];
  crSource: "current" | "override" | null;
}

export interface AkiDifferentialItem {
  id: string;
  title: string;
  bucket: string;
  signal: "High" | "Moderate" | "Consider";
  score: number;
  supports: string[];
  next: string[];
}

export interface AkiAssessmentResult {
  stage: AkiStageResult;
  fena: FractionalExcretionResult;
  feurea: FractionalExcretionResult;
  differentials: AkiDifferentialItem[];
  alerts: string[];
  nextSteps: string[];
  summary: string;
}

export const DEFAULT_AKI_INPUTS: AkiToolInputs = {
  baselineCr: "",
  currentCr: "",
  bpMinSbp: "",
  bpMinMap: "",
  bpPattern: "not_recorded",
  uop: "not_recorded",
  uop24hVolumeMl: "",
  weightKg: "",
  krtInitiated: false,
  selectedHistory: [],
  selectedContext: [],
  selectedNephrotoxins: [],
  protein: "not_checked",
  blood: "not_checked",
  rbc: "not_checked",
  wbc: "not_checked",
  selectedSediment: [],
  selectedImaging: ["not_done"],
  serumNa: "",
  urineNa: "",
  urineCr: "",
  serumCrForUrine: "",
  urineUrea: "",
  serumBun: "",
};

function parsePositiveNumber(value: string): number | null {
  // A blank / whitespace-only field means "not entered", NOT 0 (Number("") === 0).
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseNonNegativeNumber(value: string): number | null {
  // A blank / whitespace-only field means "not entered", NOT 0 (Number("") === 0).
  // An explicit "0" is a legitimate clinical value (e.g. true anuria) and still parses to 0.
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function has(items: string[], id: string): boolean {
  return items.includes(id);
}

function hasAny(items: string[], ids: string[]): boolean {
  return ids.some((id) => has(items, id));
}

function addUnique(items: string[], item: string): void {
  if (!items.includes(item)) items.push(item);
}

function gradeValue(grade: AkiUaGrade): number | null {
  if (grade === "not_checked") return null;
  if (grade === "negative") return 0;
  if (grade === "trace_1") return 1;
  if (grade === "two_plus") return 2;
  return 3;
}

function rbcValue(status: AkiRbcStatus): number | null {
  if (status === "not_checked") return null;
  if (status === "none") return 0;
  if (status === "few") return 1;
  if (status === "many") return 2;
  return 3;
}

function wbcValue(status: AkiWbcStatus): number | null {
  if (status === "not_checked") return null;
  if (status === "none") return 0;
  if (status === "pyuria") return 2;
  return 3;
}

function uopStage(status: AkiUopStatus): number | null {
  if (status === "low_6_12") return 1;
  if (status === "low_12") return 2;
  if (status === "very_low_24" || status === "anuria") return 3;
  if (status === "normal") return 0;
  return null;
}

function uopLabel(status: AkiUopStatus): string {
  const labels: Record<AkiUopStatus, string> = {
    not_recorded: "UOP not recorded",
    normal: "UOP >0.5 mL/kg/hr",
    low_6_12: "UOP <0.5 mL/kg/hr for 6-12 hr",
    low_12: "UOP <0.5 mL/kg/hr for >=12 hr",
    very_low_24: "UOP <0.3 mL/kg/hr for >=24 hr",
    anuria: "Anuria or near-anuria",
  };
  return labels[status];
}

export interface DerivedUopResult {
  ratePerKgPerHr: number | null;
  totalMl: number | null;
  weightKg: number | null;
  stage: number | null;
  label: string;
}

// When the user enters a 24-hour UOP volume + weight, derive mL/kg/hr and KDIGO stage.
// 24-hour collection is already at-or-above the ≥12 h sustained-low threshold (Stage 2)
// and the ≥24 h sustained-very-low threshold (Stage 3), so categorical mapping simplifies.
export function deriveUopFrom24h(uop24hMl: string, weightKgStr: string): DerivedUopResult {
  const total = parseNonNegativeNumber(uop24hMl);
  const weight = parsePositiveNumber(weightKgStr);
  if (total === null || weight === null) {
    return { ratePerKgPerHr: null, totalMl: total, weightKg: weight, stage: null, label: "Enter 24-hour UOP volume and weight to derive rate." };
  }
  const rate = total / weight / 24;
  let stage = 0;
  if (total === 0) stage = 3;
  else if (rate < 0.3) stage = 3;
  else if (rate < 0.5) stage = 2;
  const rateStr = rate.toFixed(2).replace(/\.?0+$/, "");
  let label = `UOP ${total.toFixed(0)} mL / 24 h ≈ ${rateStr} mL/kg/hr`;
  if (stage === 3) label += total === 0 ? " (anuria)" : " — meets KDIGO stage 3 UOP";
  else if (stage === 2) label += " — meets KDIGO stage 2 UOP";
  else label += " — at or above KDIGO threshold";
  return { ratePerKgPerHr: rate, totalMl: total, weightKg: weight, stage, label };
}

function signalFromScore(score: number): AkiDifferentialItem["signal"] {
  if (score >= 7) return "High";
  if (score >= 4) return "Moderate";
  return "Consider";
}

function formatNumber(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return "";
  return value.toFixed(digits).replace(/\.?0+$/, "");
}

export function calculateFenaPercent({
  urineNa,
  serumNa,
  urineCr,
  serumCr,
}: {
  urineNa: number;
  serumNa: number;
  urineCr: number;
  serumCr: number;
}): number | null {
  if (serumNa <= 0 || urineCr <= 0 || serumCr <= 0 || urineNa < 0) return null;
  return (urineNa * serumCr) / (serumNa * urineCr) * 100;
}

export function interpretFenaPercent(value: number): string {
  if (value < 1) return "Low FENa supports sodium avid physiology, often prerenal, but can also occur in HRS, contrast AKI, GN, pigment injury, or early obstruction.";
  if (value > 2) return "High FENa supports tubular injury/ATN in the right context; diuretics and CKD can confound it.";
  return "Borderline FENa is nondiagnostic.";
}

export function calculateFeureaPercent({
  urineUrea,
  serumBun,
  urineCr,
  serumCr,
}: {
  urineUrea: number;
  serumBun: number;
  urineCr: number;
  serumCr: number;
}): number | null {
  if (urineUrea <= 0 || serumBun <= 0 || urineCr <= 0 || serumCr <= 0) return null;
  return (urineUrea * serumCr) / (serumBun * urineCr) * 100;
}

export function interpretFeureaPercent(value: number): string {
  if (value < 35) return "Low FEUrea supports prerenal/effective volume depletion physiology, especially when FENa is confounded.";
  if (value > 50) return "High FEUrea supports tubular injury/ATN in the right context.";
  return "Borderline FEUrea is nondiagnostic.";
}

export function calculateAkiStage(inputs: Pick<AkiToolInputs, "baselineCr" | "currentCr" | "uop" | "uop24hVolumeMl" | "weightKg" | "krtInitiated">): AkiStageResult {
  const baseline = parsePositiveNumber(inputs.baselineCr);
  const current = parsePositiveNumber(inputs.currentCr);
  const reasons: string[] = [];
  let creatinineStage: number | null = null;
  let delta: number | null = null;
  let ratio: number | null = null;

  if (baseline !== null && current !== null) {
    delta = current - baseline;
    ratio = current / baseline;
    const meetsAkiDefinition = delta >= 0.3 || ratio >= 1.5;
    creatinineStage = 0;
    if (meetsAkiDefinition) {
      creatinineStage = 1;
      reasons.push("Creatinine rise meets at least KDIGO stage 1 if timing criteria fit.");
    }
    if (ratio >= 2) {
      creatinineStage = 2;
      reasons.push("Creatinine is at least 2x baseline.");
    }
    if (ratio >= 3 || (current >= 4 && meetsAkiDefinition)) {
      creatinineStage = 3;
      reasons.push("Creatinine meets a stage 3 creatinine signal.");
    }
  }

  const categoricalUopStage = uopStage(inputs.uop);
  const derivedUop = deriveUopFrom24h(inputs.uop24hVolumeMl, inputs.weightKg);
  // When a 24-h volume + weight are entered, the derived rate is the higher-resolution signal.
  const urineStage = derivedUop.stage !== null ? derivedUop.stage : categoricalUopStage;
  if (derivedUop.stage !== null) {
    reasons.push(`${derivedUop.label}.`);
  } else if (categoricalUopStage !== null && categoricalUopStage > 0) {
    reasons.push(`${uopLabel(inputs.uop)}.`);
  }

  const krtStage = inputs.krtInitiated ? 3 : null;
  if (krtStage !== null) {
    reasons.push("Kidney replacement therapy initiated — KDIGO classifies AKI as stage 3.");
  }

  const availableStages = [creatinineStage, urineStage, krtStage].filter((stage): stage is number => stage !== null);
  const overallStage = availableStages.length ? Math.max(...availableStages) : null;
  let label = "Enter baseline/current Cr and UOP to stage.";
  if (overallStage === 0) label = "No KDIGO AKI signal from entered Cr/UOP.";
  if (overallStage && overallStage > 0) label = `KDIGO stage ${overallStage} signal`;

  return { creatinineStage, uopStage: urineStage, overallStage, baseline, current, delta, ratio, label, reasons };
}

export function calculateFena(inputs: Pick<AkiToolInputs, "serumNa" | "urineNa" | "urineCr" | "serumCrForUrine" | "currentCr">): FractionalExcretionResult {
  const serumNa = parsePositiveNumber(inputs.serumNa);
  const urineNa = parseNonNegativeNumber(inputs.urineNa);
  const urineCr = parsePositiveNumber(inputs.urineCr);
  const overrideCr = parsePositiveNumber(inputs.serumCrForUrine);
  const currentCr = parsePositiveNumber(inputs.currentCr);
  const serumCr = overrideCr ?? currentCr;
  const missing: string[] = [];
  if (serumNa === null) missing.push("serum Na");
  if (urineNa === null) missing.push("urine Na");
  if (urineCr === null) missing.push("urine Cr");
  if (serumCr === null) missing.push("serum Cr");

  if (missing.length || serumNa === null || urineNa === null || urineCr === null || serumCr === null) {
    return { value: null, label: "FENa pending", interpretation: "Enter serum Na, urine Na, urine Cr, and serum Cr.", missing, crSource: null };
  }

  const value = calculateFenaPercent({ urineNa, serumNa, urineCr, serumCr });
  if (value === null) {
    return { value: null, label: "FENa pending", interpretation: "Enter valid positive serum/urine creatinine and serum sodium values.", missing: [], crSource: null };
  }
  const interpretation = interpretFenaPercent(value);

  return {
    value,
    label: `FENa ${formatNumber(value)}%`,
    interpretation,
    missing: [],
    crSource: overrideCr !== null ? "override" : "current",
  };
}

export function calculateFeurea(inputs: Pick<AkiToolInputs, "urineUrea" | "serumBun" | "urineCr" | "serumCrForUrine" | "currentCr">): FractionalExcretionResult {
  const urineUrea = parsePositiveNumber(inputs.urineUrea);
  const serumBun = parsePositiveNumber(inputs.serumBun);
  const urineCr = parsePositiveNumber(inputs.urineCr);
  const overrideCr = parsePositiveNumber(inputs.serumCrForUrine);
  const currentCr = parsePositiveNumber(inputs.currentCr);
  const serumCr = overrideCr ?? currentCr;
  const missing: string[] = [];
  if (urineUrea === null) missing.push("urine urea");
  if (serumBun === null) missing.push("BUN");
  if (urineCr === null) missing.push("urine Cr");
  if (serumCr === null) missing.push("serum Cr");

  if (missing.length || urineUrea === null || serumBun === null || urineCr === null || serumCr === null) {
    return { value: null, label: "FEUrea pending", interpretation: "Enter urine urea, BUN, urine Cr, and serum Cr.", missing, crSource: null };
  }

  const value = calculateFeureaPercent({ urineUrea, serumBun, urineCr, serumCr });
  if (value === null) {
    return { value: null, label: "FEUrea pending", interpretation: "Enter valid positive urine urea, BUN, and creatinine values.", missing: [], crSource: null };
  }
  const interpretation = interpretFeureaPercent(value);

  return {
    value,
    label: `FEUrea ${formatNumber(value)}%`,
    interpretation,
    missing: [],
    crSource: overrideCr !== null ? "override" : "current",
  };
}

export function buildAkiAssessment(inputs: AkiToolInputs): AkiAssessmentResult {
  const stage = calculateAkiStage(inputs);
  const fena = calculateFena(inputs);
  const feurea = calculateFeurea(inputs);
  const protein = gradeValue(inputs.protein);
  const blood = gradeValue(inputs.blood);
  const rbc = rbcValue(inputs.rbc);
  const wbc = wbcValue(inputs.wbc);
  const minSbp = parsePositiveNumber(inputs.bpMinSbp);
  const minMap = parsePositiveNumber(inputs.bpMinMap);
  const hypotensionSignal = inputs.bpPattern === "hypotension" || inputs.bpPattern === "shock" || (minSbp !== null && minSbp < 90) || (minMap !== null && minMap < 65);
  const shockSignal = inputs.bpPattern === "shock" || has(inputs.selectedContext, "sepsis_shock");
  const activeSediment = has(inputs.selectedSediment, "rbc_casts") || inputs.rbc === "dysmorphic" || ((protein ?? 0) >= 2 && ((blood ?? 0) >= 2 || (rbc ?? 0) >= 2));
  const blandSediment = has(inputs.selectedSediment, "bland") || ((protein === 0 || protein === 1) && (blood === 0 || blood === 1) && (rbc === 0 || rbc === 1) && (wbc === 0 || wbc === 1));
  const pyuriaSignal = (wbc ?? 0) >= 2 || has(inputs.selectedSediment, "wbc_casts") || has(inputs.selectedSediment, "eosinophils");
  const muddyCasts = has(inputs.selectedSediment, "muddy_casts");
  const hemeNoRbc = has(inputs.selectedSediment, "heme_no_rbc");
  const hasHydro = has(inputs.selectedImaging, "hydro");
  const hasRetention = has(inputs.selectedImaging, "retention");
  const hasStones = has(inputs.selectedImaging, "stones");
  const noHydro = has(inputs.selectedImaging, "no_hydro");
  const chronicImaging = hasAny(inputs.selectedImaging, ["cortical_thinning", "small_echogenic"]);
  const fenaLow = fena.value !== null && fena.value < 1;
  const fenaHigh = fena.value !== null && fena.value > 2;
  const feureaLow = feurea.value !== null && feurea.value < 35;
  const feureaHigh = feurea.value !== null && feurea.value > 50;
  const derivedUop = deriveUopFrom24h(inputs.uop24hVolumeMl, inputs.weightKg);
  const uopDescription = derivedUop.stage !== null ? derivedUop.label : uopLabel(inputs.uop);
  const anyOliguria = ["low_6_12", "low_12", "very_low_24", "anuria"].includes(inputs.uop) || (derivedUop.stage !== null && derivedUop.stage > 0);
  const knownCkd = has(inputs.selectedHistory, "known_ckd");
  const transplantHistory = has(inputs.selectedHistory, "transplant");
  const diabeticHypertensiveRisk = hasAny(inputs.selectedHistory, ["dm2", "htn"]);
  const albuminuriaHistory = has(inputs.selectedHistory, "albuminuria");
  const vascularRisk = hasAny(inputs.selectedHistory, ["vascular_disease", "dm2", "htn", "known_ckd"]);
  const myelomaRisk = has(inputs.selectedHistory, "mgus_myeloma") || has(inputs.selectedContext, "myeloma_clues");

  const builders: Record<string, AkiDifferentialItem & { _titleScore: number }> = {};
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

  const prerenalNext = ["Check volume exam, orthostatics if relevant, intake/output trend, and response to resuscitation when hypovolemia is plausible.", "Hold or adjust renal hemodynamic medications when clinically appropriate."];
  if (hasAny(inputs.selectedContext, ["low_po", "gi_losses", "bleeding"])) add("prerenal", "Prerenal azotemia / volume depletion", "Perfusion", 3, "Low intake, GI losses, or bleeding reduces kidney perfusion.", prerenalNext);
  if (hypotensionSignal) add("prerenal", "Prerenal azotemia / volume depletion", "Perfusion", 3, "Hypotension or low MAP is present.", prerenalNext);
  if (hasAny(inputs.selectedContext, ["heart_failure", "cirrhosis"])) add("prerenal", "Prerenal azotemia / volume depletion", "Perfusion", 2, "Low effective arterial volume physiology is possible.", prerenalNext);
  if (hasAny(inputs.selectedNephrotoxins, ["nsaid", "ace_arb", "diuretics", "sglt2i"])) add("prerenal", "Prerenal azotemia / volume depletion", "Perfusion", 1, "Renal hemodynamic medications can amplify perfusion-sensitive AKI.", prerenalNext);
  if (fenaLow) add("prerenal", "Prerenal azotemia / volume depletion", "Perfusion", 2, fena.label, prerenalNext);
  if (feureaLow) add("prerenal", "Prerenal azotemia / volume depletion", "Perfusion", 2, feurea.label, prerenalNext);
  if (blandSediment) add("prerenal", "Prerenal azotemia / volume depletion", "Perfusion", 1, "Bland urine sediment supports a functional/perfusion process.", prerenalNext);

  const atnNext = ["Trend creatinine and urine output closely; review dose-adjustment needs.", "Look for muddy brown casts and ongoing ischemic or toxic exposure."];
  if (shockSignal || hypotensionSignal) add("atn", "Ischemic acute tubular injury / ATN", "Intrinsic tubular", 3, "Shock or hypotension can progress from prerenal physiology to tubular injury.", atnNext);
  if (has(inputs.selectedContext, "sepsis_infection")) add("atn", "Ischemic acute tubular injury / ATN", "Intrinsic tubular", 3, "Sepsis/infection is a common ATN driver.", atnNext);
  if (has(inputs.selectedContext, "surgery_icu")) add("atn", "Ischemic acute tubular injury / ATN", "Intrinsic tubular", 2, "Recent surgery/ICU course raises ischemic tubular injury risk.", atnNext);
  if (hasAny(inputs.selectedNephrotoxins, ["vancomycin", "aminoglycoside", "amphotericin", "chemo", "calcineurin", "acyclovir_tenofovir"])) add("atn", "Ischemic or nephrotoxic tubular injury / ATN", "Intrinsic tubular", 3, "Tubular nephrotoxin exposure is present.", atnNext);
  if (muddyCasts) add("atn", "Ischemic or nephrotoxic tubular injury / ATN", "Intrinsic tubular", 4, "Muddy brown/granular casts strongly support tubular injury.", atnNext);
  if (fenaHigh) add("atn", "Ischemic or nephrotoxic tubular injury / ATN", "Intrinsic tubular", 2, fena.label, atnNext);
  if (feureaHigh) add("atn", "Ischemic or nephrotoxic tubular injury / ATN", "Intrinsic tubular", 2, feurea.label, atnNext);
  if (anyOliguria) add("atn", "Ischemic or nephrotoxic tubular injury / ATN", "Intrinsic tubular", 1, uopDescription, atnNext);

  const medNext = ["Reconcile home and inpatient medications by start date.", "Hold, substitute, or renally dose nephrotoxins when the clinical plan allows."];
  if (has(inputs.selectedNephrotoxins, "nsaid")) add("med_hemodynamic", "Medication-related hemodynamic AKI", "Exposure", 3, "NSAID exposure can reduce afferent arteriolar tone.", medNext);
  if (has(inputs.selectedNephrotoxins, "ace_arb")) add("med_hemodynamic", "Medication-related hemodynamic AKI", "Exposure", 3, "ACEi/ARB can reduce intraglomerular pressure, especially with hypovolemia or renal artery disease.", medNext);
  if (has(inputs.selectedNephrotoxins, "diuretics")) add("med_hemodynamic", "Medication-related hemodynamic AKI", "Exposure", 2, "Recent diuresis can contribute to volume-sensitive AKI.", medNext);
  if (has(inputs.selectedNephrotoxins, "sglt2i")) add("med_hemodynamic", "Medication-related hemodynamic AKI", "Exposure", 1, "SGLT2 inhibitor use can matter during acute illness or low intake.", medNext);
  if (has(inputs.selectedNephrotoxins, "calcineurin")) add("med_hemodynamic", "Medication-related hemodynamic AKI", "Exposure", 2, "Calcineurin inhibitors can cause afferent vasoconstriction and tubular toxicity.", medNext);
  if (hasAny(inputs.selectedContext, ["low_po", "gi_losses"]) && hasAny(inputs.selectedNephrotoxins, ["nsaid", "ace_arb", "diuretics", "sglt2i"])) add("med_hemodynamic", "Medication-related hemodynamic AKI", "Exposure", 2, "Low intake/losses plus renal hemodynamic medications is a high-yield combination.", medNext);

  if (has(inputs.selectedNephrotoxins, "contrast")) {
    add("contrast", "Contrast-associated AKI", "Exposure", 5, "Recent iodinated contrast exposure selected.", ["Check timing of creatinine rise, baseline CKD/diabetes risk, concurrent hypotension, and other nephrotoxins.", "Avoid additional contrast when possible and optimize volume status."]);
    if (fenaLow) add("contrast", "Contrast-associated AKI", "Exposure", 1, "FENa can be low in contrast-associated AKI.", ["Check timing of creatinine rise, baseline CKD/diabetes risk, concurrent hypotension, and other nephrotoxins.", "Avoid additional contrast when possible and optimize volume status."]);
  }

  const ainNext = ["Review drug start dates over the last days to weeks.", "Look for rash, fever, eosinophilia, sterile pyuria, WBC casts, and consider biopsy if diagnosis would change management."];
  const ainDrugSignal = hasAny(inputs.selectedNephrotoxins, ["ppi", "beta_lactam", "tmp_smx", "checkpoint", "nsaid", "vancomycin"]);
  if (ainDrugSignal) add("ain", "Acute interstitial nephritis", "Intrinsic interstitial", 3, "AIN-associated medication exposure is present.", ainNext);
  if (pyuriaSignal) add("ain", "Acute interstitial nephritis", "Intrinsic interstitial", 3, "Pyuria, WBC casts, or eosinophil clue selected.", ainNext);
  if (ainDrugSignal && pyuriaSignal) add("ain", "Acute interstitial nephritis", "Intrinsic interstitial", 2, "Drug exposure plus pyuria/WBC casts is a stronger AIN pattern than either alone.", ainNext);
  if (has(inputs.selectedContext, "rash_fever_eos")) add("ain", "Acute interstitial nephritis", "Intrinsic interstitial", 1, "Rash/fever/eosinophilia is classic but insensitive; absence does not rule out AIN.", ainNext);

  const gnNext = ["If active sediment is real, consider C3/C4, ANA, ANCA, anti-GBM, hepatitis/HIV testing, SPEP/free light chains as appropriate.", "Escalate urgently for pulmonary-renal syndrome or rapidly progressive creatinine rise."];
  if (activeSediment) add("gn", "Glomerular or vascular AKI", "Intrinsic glomerular/vascular", 5, "Proteinuria plus hematuria/RBCs or dysmorphic RBCs suggests active sediment.", gnNext);
  if (has(inputs.selectedSediment, "rbc_casts")) add("gn", "Glomerular or vascular AKI", "Intrinsic glomerular/vascular", 4, "RBC casts are a high-risk glomerular clue.", gnNext);
  if (inputs.bpPattern === "hypertensive") add("gn", "Glomerular or vascular AKI", "Intrinsic glomerular/vascular", 2, "Severe hypertension can accompany nephritic or vascular processes.", gnNext);
  if (has(inputs.selectedContext, "pulmonary_renal")) add("gn", "Glomerular or vascular AKI", "Intrinsic glomerular/vascular", 4, "Pulmonary-renal syndrome concern selected.", gnNext);
  if (has(inputs.selectedContext, "tma_hemolysis")) add("gn", "Glomerular or vascular AKI", "Intrinsic glomerular/vascular", 3, "TMA/hemolysis concern selected.", gnNext);

  const transplantNext = ["Check tacrolimus/cyclosporine trough if relevant, medication interactions, BK/CMV context, DSA/rejection risk, and transplant ultrasound.", "In transplant AKI, obstruction, vascular complications, infection, rejection, and calcineurin toxicity all stay on the table."];
  if (transplantHistory) add("transplant_allograft", "Kidney allograft dysfunction", "Transplant", 4, "Kidney transplant history selected.", transplantNext);
  if (transplantHistory && has(inputs.selectedNephrotoxins, "calcineurin")) add("transplant_allograft", "Kidney allograft dysfunction", "Transplant", 2, "Calcineurin inhibitor exposure raises concern for CNI toxicity or drug interaction.", transplantNext);

  const postrenalNext = ["Bladder scan, Foley troubleshooting, and renal ultrasound are key when obstruction is possible.", "Hydronephrosis, retention, stones, solitary kidney, or anuria should move obstruction high on the list."];
  if (hasHydro) add("postrenal", "Postrenal obstruction", "Obstruction", 6, "Hydronephrosis is present.", postrenalNext);
  if (hasRetention) add("postrenal", "Postrenal obstruction", "Obstruction", 5, "Bladder retention or Foley obstruction selected.", postrenalNext);
  if (hasStones) add("postrenal", "Postrenal obstruction", "Obstruction", 3, "Stone disease can obstruct, especially with solitary kidney or bilateral disease.", postrenalNext);
  if (has(inputs.selectedContext, "obstruction_risk")) add("postrenal", "Postrenal obstruction", "Obstruction", 3, "BPH/retention/obstruction risk selected.", postrenalNext);
  if (inputs.uop === "anuria") add("postrenal", "Postrenal obstruction", "Obstruction", 2, "Anuria should trigger obstruction review.", postrenalNext);
  if (has(inputs.selectedImaging, "single_kidney") && (hasStones || hasHydro)) add("postrenal", "Postrenal obstruction", "Obstruction", 2, "Solitary kidney raises the stakes of obstruction.", postrenalNext);
  if (noHydro) {
    const item = ensure("postrenal", "Postrenal obstruction", "Obstruction", postrenalNext);
    item.score -= 2;
    addUnique(item.supports, "No hydronephrosis lowers obstruction likelihood; rare bilateral non-dilated obstruction still exists.");
  }

  if (has(inputs.selectedContext, "heart_failure")) {
    add("cardiorenal", "Cardiorenal syndrome / venous congestion", "Perfusion/congestion", 4, "Heart failure or congestion selected.", ["Assess volume exam, JVP, weights, BNP if useful, oxygen requirement, and diuretic response.", "A creatinine rise during decongestion may not mean the kidney needs fluid."]);
    if (has(inputs.selectedNephrotoxins, "diuretics")) add("cardiorenal", "Cardiorenal syndrome / venous congestion", "Perfusion/congestion", 1, "Diuretic/decongestion context selected.", ["Assess volume exam, JVP, weights, BNP if useful, oxygen requirement, and diuretic response.", "A creatinine rise during decongestion may not mean the kidney needs fluid."]);
    if (feureaLow || fenaLow) add("cardiorenal", "Cardiorenal syndrome / venous congestion", "Perfusion/congestion", 1, "Low urine indices can be seen in low effective arterial volume states.", ["Assess volume exam, JVP, weights, BNP if useful, oxygen requirement, and diuretic response.", "A creatinine rise during decongestion may not mean the kidney needs fluid."]);
  }

  if (has(inputs.selectedContext, "cirrhosis")) {
    add("hrs", "HRS-AKI physiology", "Perfusion/cirrhosis", 4, "Cirrhosis/ascites selected.", ["Exclude shock, nephrotoxins, obstruction, and active urinary sediment before labeling HRS.", "Check albumin challenge context, infection/SBP status, and vasoconstrictor candidacy."]);
    if (has(inputs.selectedContext, "sepsis_infection")) add("hrs", "HRS-AKI physiology", "Perfusion/cirrhosis", 1, "Infection in cirrhosis can precipitate HRS physiology but also raises ATN risk.", ["Exclude shock, nephrotoxins, obstruction, and active urinary sediment before labeling HRS.", "Check albumin challenge context, infection/SBP status, and vasoconstrictor candidacy."]);
    if (blandSediment || fenaLow || feureaLow) add("hrs", "HRS-AKI physiology", "Perfusion/cirrhosis", 1, "Bland/low-index pattern can fit HRS physiology.", ["Exclude shock, nephrotoxins, obstruction, and active urinary sediment before labeling HRS.", "Check albumin challenge context, infection/SBP status, and vasoconstrictor candidacy."]);
  }

  const pigmentNext = ["Check CK, uric acid, phosphorus, calcium, potassium, LDH/haptoglobin when clinically relevant.", "Treat the underlying pigment or crystal driver and protect kidney perfusion."];
  if (has(inputs.selectedContext, "rhabdo_ck")) add("pigment_crystal", "Pigment nephropathy / rhabdomyolysis", "Tubular obstruction/toxin", 5, "Rhabdomyolysis or high CK selected.", pigmentNext);
  if (hemeNoRbc) add("pigment_crystal", "Pigment nephropathy / rhabdomyolysis", "Tubular obstruction/toxin", 3, "Heme-positive urine with few/no RBCs supports pigment injury.", pigmentNext);
  if (has(inputs.selectedContext, "tls_crystal")) add("pigment_crystal", "Crystal nephropathy / tumor lysis", "Tubular obstruction/toxin", 5, "Tumor lysis or crystal risk selected.", pigmentNext);
  if (has(inputs.selectedSediment, "crystals")) add("pigment_crystal", "Crystal nephropathy", "Tubular obstruction/toxin", 3, "Crystals noted on urine microscopy.", pigmentNext);

  const atheroNext = ["Ask about timing after cath, vascular surgery, anticoagulation, or thrombolysis; kidney injury can be subacute over days to weeks.", "Look for livedo reticularis, blue toes, retinal plaques, eosinophilia, low complement, and systemic embolic clues."];
  if (has(inputs.selectedContext, "recent_cath_vascular")) add("atheroembolic", "Atheroembolic kidney disease", "Vascular", 4, "Recent cath, angiography, or vascular procedure selected.", atheroNext);
  if (has(inputs.selectedContext, "athero_clues")) add("atheroembolic", "Atheroembolic kidney disease", "Vascular", 4, "Livedo/blue toes/eosinophilia clue selected.", atheroNext);
  if (vascularRisk && hasAny(inputs.selectedContext, ["recent_cath_vascular", "athero_clues"])) add("atheroembolic", "Atheroembolic kidney disease", "Vascular", 1, "Atherosclerotic risk history raises pretest probability.", atheroNext);

  const castNext = ["Check serum free light chains, SPEP/SIFE, UPEP/UIFE, calcium, CBC, and total protein/albumin gap when suspected.", "Dipstick can under-detect light chains, so little albumin on UA does not exclude cast nephropathy."];
  if (myelomaRisk) add("cast_nephropathy", "Myeloma cast nephropathy / paraprotein AKI", "Tubular protein cast", 4, "MGUS/myeloma history or anemia/hypercalcemia/protein-gap clue selected.", castNext);
  if (myelomaRisk && protein !== null && protein <= 1) add("cast_nephropathy", "Myeloma cast nephropathy / paraprotein AKI", "Tubular protein cast", 2, "Low dipstick protein can be a trap because dipstick mainly detects albumin, not light chains.", castNext);
  if (has(inputs.selectedNephrotoxins, "nsaid") && myelomaRisk) add("cast_nephropathy", "Myeloma cast nephropathy / paraprotein AKI", "Tubular protein cast", 1, "Volume depletion/NSAIDs can worsen cast nephropathy risk.", castNext);

  if (chronicImaging) {
    add("ckd_chronicity", "CKD progression or AKI on CKD", "Chronicity", 5, "Cortical thinning or small echogenic kidneys suggests chronic parenchymal disease.", ["Clarify true baseline, prior labs, albuminuria history, kidney size, and CKD complications.", "Still look for superimposed reversible AKI triggers."]);
  }
  if (knownCkd) add("ckd_chronicity", "AKI on CKD / reduced renal reserve", "Chronicity", 3, "Known CKD increases AKI susceptibility and changes baseline risk.", ["Clarify true baseline, prior labs, albuminuria history, kidney size, and CKD complications.", "Still look for superimposed reversible AKI triggers."]);
  if (diabeticHypertensiveRisk) add("ckd_chronicity", "AKI on CKD / reduced renal reserve", "Chronicity", 1, "Diabetes/HTN suggest CKD risk, but usually are not the acute AKI cause by themselves.", ["Clarify true baseline, prior labs, albuminuria history, kidney size, and CKD complications.", "Still look for superimposed reversible AKI triggers."]);
  if (albuminuriaHistory) add("ckd_chronicity", "AKI on CKD / reduced renal reserve", "Chronicity", 2, "Baseline albuminuria/proteinuria supports chronic kidney disease risk.", ["Clarify true baseline, prior labs, albuminuria history, kidney size, and CKD complications.", "Still look for superimposed reversible AKI triggers."]);
  if ((stage.baseline ?? 0) >= 1.5 && chronicImaging) add("ckd_chronicity", "CKD progression or AKI on CKD", "Chronicity", 1, "Baseline creatinine appears elevated.", ["Clarify true baseline, prior labs, albuminuria history, kidney size, and CKD complications.", "Still look for superimposed reversible AKI triggers."]);
  if (inputs.protein === "nephrotic") add("ckd_chronicity", "CKD progression or AKI on CKD", "Chronicity", 2, "Heavy proteinuria can indicate chronic glomerular disease with superimposed AKI.", ["Clarify true baseline, prior labs, albuminuria history, kidney size, and CKD complications.", "Still look for superimposed reversible AKI triggers."]);

  const differentials = Object.values(builders)
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => {
      const { _titleScore: _ignored, ...rest } = item;
      return { ...rest, signal: signalFromScore(item.score) };
    })
    .slice(0, 7);

  const alerts: string[] = [];
  if (stage.overallStage === 3) alerts.push("Stage 3 AKI signal: check urgent complications and whether dialysis indications are present.");
  if (inputs.uop === "anuria" || inputs.uop === "very_low_24") alerts.push("Severe oliguria/anuria: verify Foley/bladder scan and trend electrolytes closely.");
  if (hasHydro || hasRetention) alerts.push("Obstruction signal: prioritize bladder scan/Foley troubleshooting and decompression planning.");
  if (activeSediment || has(inputs.selectedSediment, "rbc_casts")) alerts.push("Active sediment signal: consider urgent glomerular/vascular workup.");
  if (has(inputs.selectedContext, "athero_clues")) alerts.push("Systemic embolic clues: consider atheroembolic kidney disease, especially after vascular manipulation.");
  if (myelomaRisk) alerts.push("Paraprotein clue: cast nephropathy can be missed if you rely on dipstick protein alone.");
  if (shockSignal) alerts.push("Shock/pressor context: kidney perfusion and ischemic tubular injury risk are high.");

  const nextSteps: string[] = [];
  if (stage.baseline === null || stage.current === null) nextSteps.push("Confirm baseline and current creatinine with timing of rise.");
  if (inputs.uop === "not_recorded") nextSteps.push("Get strict I/O or at least a reliable UOP range.");
  if (inputs.protein === "not_checked" || inputs.blood === "not_checked" || inputs.rbc === "not_checked") nextSteps.push("Get UA with microscopy, not just dipstick.");
  if (has(inputs.selectedImaging, "not_done")) nextSteps.push("Renal ultrasound or bladder scan if AKI is unexplained, severe, anuric, or obstruction risk is present.");
  if (fena.value === null && feurea.value === null) nextSteps.push("Send urine Na/Cr and urea/BUN when indices would change the differential.");
  if (inputs.selectedHistory.length > 0) nextSteps.push("Use CKD/DM2/HTN history as renal reserve and chronicity context; still identify the acute trigger.");
  if (transplantHistory) nextSteps.push("For transplant AKI, check immunosuppression levels, BK/CMV context, rejection risk, and transplant ultrasound.");
  if (inputs.selectedNephrotoxins.length > 0) nextSteps.push("Medication timeline: last doses, levels if relevant, and renal dose adjustments.");
  if (myelomaRisk) nextSteps.push("If paraprotein AKI is possible, send serum free light chains plus SPEP/UPEP with immunofixation.");
  if ((stage.overallStage ?? 0) >= 2 || anyOliguria) nextSteps.push("Check AEIOU complications: K, bicarbonate/pH, oxygen/volume status, uremic symptoms, and toxins.");

  const leading = differentials.slice(0, 3).map((item) => item.title).join("; ") || "insufficient data yet";
  const crLine = stage.baseline !== null && stage.current !== null
    ? `Cr ${formatNumber(stage.baseline)} -> ${formatNumber(stage.current)}`
    : "Cr trend incomplete";
  const summary = `${crLine}; ${stage.label}; ${uopDescription}. Leading differential: ${leading}.`;

  return { stage, fena, feurea, differentials, alerts, nextSteps: nextSteps.slice(0, 7), summary };
}
