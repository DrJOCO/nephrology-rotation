import { describe, expect, it } from "vitest";
import {
  buildHyponatremiaAssessment,
  calculateAdrogueMadias,
  calculateCorrectedSodium,
  calculateCorrectionTarget,
  calculateEffectiveOsmolality,
  calculateFractionalExcretionUricAcid,
  DEFAULT_HYPO_INPUTS,
  type HyponatremiaInputs,
} from "./hyponatremiaTool";

const baseInputs = (overrides: Partial<HyponatremiaInputs> = {}): HyponatremiaInputs => ({
  ...DEFAULT_HYPO_INPUTS,
  ...overrides,
});

describe("Hyponatremia tool calculators", () => {
  it("returns null when glucose is not high enough to need correction", () => {
    const result = calculateCorrectedSodium("128", "95");
    expect(result.measured).toBe(128);
    expect(result.correctedKatz).toBeNull();
    expect(result.correctedHillier).toBeNull();
  });

  it("applies Katz 1.6 and Hillier 2.4 per 100 mg/dL above 100 for hyperglycemia", () => {
    const result = calculateCorrectedSodium("125", "600");
    expect(result.correctedKatz).toBeCloseTo(125 + 1.6 * 5, 4);
    expect(result.correctedHillier).toBeCloseTo(125 + 2.4 * 5, 4);
  });

  it("classifies effective osm as hypotonic with normal glucose and missing measured osm", () => {
    const result = calculateEffectiveOsmolality(baseInputs({ serumNa: "120", serumGlucose: "90" }));
    expect(result.classification).toBe("hypotonic");
    expect(result.value).toBeCloseTo(2 * 120 + 90 / 18, 2);
  });

  it("classifies measured osm in the 275-295 window as isotonic (think pseudo)", () => {
    const result = calculateEffectiveOsmolality(baseInputs({ serumNa: "120", measuredOsm: "285" }));
    expect(result.classification).toBe("isotonic");
  });

  it("classifies measured osm > 295 as hypertonic (translational)", () => {
    const result = calculateEffectiveOsmolality(baseInputs({ serumNa: "125", serumGlucose: "650", measuredOsm: "320" }));
    expect(result.classification).toBe("hypertonic");
  });

  it("returns FEUA pending when uric acid inputs are missing", () => {
    const result = calculateFractionalExcretionUricAcid(baseInputs());
    expect(result.value).toBeNull();
  });

  it("flags FEUA > 12% as supporting SIAD", () => {
    const result = calculateFractionalExcretionUricAcid(
      baseInputs({ serumUricAcid: "3", urineUricAcid: "70", serumCr: "1", urineCr: "100" }),
    );
    expect(result.value).toBeCloseTo(23.33, 1);
    expect(result.interpretation).toMatch(/SIAD/i);
  });

  it("flags FEUA < 8% as essentially excluding SIAD", () => {
    const result = calculateFractionalExcretionUricAcid(
      baseInputs({ serumUricAcid: "8", urineUricAcid: "30", serumCr: "1", urineCr: "100" }),
    );
    expect(result.value).toBeCloseTo(3.75, 2);
    expect(result.interpretation).toMatch(/exclude/i);
  });

  it("caps correction at 8 mEq/L per 24h when serum Na is below 120", () => {
    const target = calculateCorrectionTarget(baseInputs({ serumNa: "115" }));
    expect(target.perDayCap).toBe(8);
    expect(target.highOdsRisk).toBe(true);
  });

  it("caps correction at 8 mEq/L per 24h when an ODS risk modifier is selected", () => {
    const target = calculateCorrectionTarget(baseInputs({ serumNa: "126", selectedOdsRisk: ["alcohol"] }));
    expect(target.perDayCap).toBe(8);
    expect(target.highOdsRisk).toBe(true);
  });

  it("uses the standard 10 mEq/L per 24h cap with no ODS modifiers and Na ≥120", () => {
    const target = calculateCorrectionTarget(baseInputs({ serumNa: "127" }));
    expect(target.perDayCap).toBe(10);
    expect(target.highOdsRisk).toBe(false);
  });

  it("computes Adrogue–Madias ΔNa per liter for 3% saline at 70 kg", () => {
    const rows = calculateAdrogueMadias(baseInputs({ serumNa: "115", weightKg: "70" }));
    const hyper = rows.find((r) => r.fluidId === "hypertonic_3");
    expect(hyper?.changePerLiter).toBeCloseTo((513 - 115) / (70 * 0.6 + 1), 3);
    expect(hyper?.litersForTarget).toBeGreaterThan(0);
    const ns = rows.find((r) => r.fluidId === "ns");
    // 0.9% NS in true SIAD with low Na: gives a small positive bump
    expect(ns?.changePerLiter).toBeCloseTo((154 - 115) / (70 * 0.6 + 1), 3);
  });

  it("returns null Adrogue–Madias rows when weight or Na is missing", () => {
    const rows = calculateAdrogueMadias(baseInputs({ serumNa: "" }));
    expect(rows.every((r) => r.changePerLiter === null)).toBe(true);
  });
});

describe("Hyponatremia differential vignettes", () => {
  it("ranks SIAD highly with concentrated urine, UNa ≥30, and apparent euvolemia", () => {
    const assessment = buildHyponatremiaAssessment(
      baseInputs({
        serumNa: "118",
        urineOsm: "480",
        urineNa: "60",
        volumeStatus: "euvolemic",
        selectedHistory: ["malignancy_lung"],
      }),
    );
    expect(assessment.differentials[0]?.id).toBe("siad");
    expect(assessment.differentials[0]?.signal).not.toBe("Consider");
  });

  it("ranks hypovolemic extrarenal causes when GI losses + UNa <20 are present", () => {
    const assessment = buildHyponatremiaAssessment(
      baseInputs({
        serumNa: "125",
        urineOsm: "550",
        urineNa: "10",
        selectedHistory: ["gi_losses"],
        selectedVolumeClues: ["orthostasis", "dry_mucosa"],
      }),
    );
    expect(assessment.differentials[0]?.id).toBe("hypovol_extrarenal");
  });

  it("ranks heart failure highly with edema and avid sodium retention", () => {
    const assessment = buildHyponatremiaAssessment(
      baseInputs({
        serumNa: "126",
        urineOsm: "600",
        urineNa: "10",
        selectedHistory: ["heart_failure"],
        selectedVolumeClues: ["edema", "jvd"],
      }),
    );
    expect(assessment.differentials[0]?.id).toBe("hf");
  });

  it("flags thiazide-induced hyponatremia as a top differential when the drug is selected", () => {
    const assessment = buildHyponatremiaAssessment(
      baseInputs({
        serumNa: "120",
        selectedDrugs: ["thiazide"],
        serumK: "3.1",
        serumBicarb: "30",
      }),
    );
    expect(assessment.differentials[0]?.id).toBe("thiazide");
    expect(assessment.alerts.some((a) => /Thiazide/i.test(a))).toBe(true);
  });

  it("flags hypertonic (translational) hyponatremia when glucose is markedly elevated", () => {
    const assessment = buildHyponatremiaAssessment(
      baseInputs({
        serumNa: "126",
        serumGlucose: "650",
        measuredOsm: "320",
      }),
    );
    expect(assessment.differentials[0]?.id).toBe("hypertonic");
    expect(assessment.correctedNa.correctedHillier).toBeGreaterThan(126);
  });

  it("flags low-solute hyponatremia (beer potomania pattern) with dilute urine and low solute intake", () => {
    const assessment = buildHyponatremiaAssessment(
      baseInputs({
        serumNa: "122",
        urineOsm: "60",
        urineNa: "5",
        selectedHistory: ["low_solute_intake"],
      }),
    );
    const ids = assessment.differentials.map((d) => d.id);
    expect(ids).toContain("low_solute");
  });

  it("emits a severe-symptom alert with 3% saline 100 mL bolus guidance", () => {
    const assessment = buildHyponatremiaAssessment(
      baseInputs({
        serumNa: "112",
        symptomSeverity: "severe",
      }),
    );
    expect(assessment.alerts.some((a) => /3% saline/.test(a))).toBe(true);
  });

  it("treats unknown duration as chronic for ODS risk in the summary line", () => {
    const assessment = buildHyponatremiaAssessment(baseInputs({ serumNa: "120", duration: "unknown" }));
    expect(assessment.summary).toMatch(/chronic/i);
  });

  // ── Blank-as-zero regression guards (clinical-safety bug class) ──────────
  it("keeps the 'get urine sodium' prompt and fabricates no 'UNa <20' line when urine Na is blank", () => {
    const assessment = buildHyponatremiaAssessment(
      baseInputs({
        serumNa: "126",
        urineOsm: "600",
        urineNa: "", // not entered — must NOT be read as 0
        selectedHistory: ["heart_failure"],
        selectedVolumeClues: ["edema", "jvd"],
      }),
    );
    // The missing-data prompt must still surface (previously suppressed because "" → 0).
    expect(assessment.nextSteps.some((s) => /Get urine sodium/i.test(s))).toBe(true);
    // No support line may claim a UNa value when none was entered.
    const allSupports = assessment.differentials.flatMap((d) => d.supports);
    expect(allSupports.some((s) => /UNa\b.*<20/i.test(s))).toBe(false);
    expect(allSupports.some((s) => /UNa 0\b/.test(s))).toBe(false);
  });

  it("uses an explicit urine Na of 0 as a real value (suppresses the prompt, allows the UNa <20 support line)", () => {
    const assessment = buildHyponatremiaAssessment(
      baseInputs({
        serumNa: "126",
        urineOsm: "600",
        urineNa: "0", // explicitly measured, sodium-avid kidneys
        selectedHistory: ["heart_failure"],
        selectedVolumeClues: ["edema", "jvd"],
      }),
    );
    // A real value was entered, so the "get urine sodium" prompt should NOT fire.
    expect(assessment.nextSteps.some((s) => /Get urine sodium/i.test(s))).toBe(false);
    // With a genuine UNa 0 (<20) in an HF picture, the sodium-avidity support line is legitimate.
    const hf = assessment.differentials.find((d) => d.id === "hf");
    expect(hf).toBeDefined();
    expect(hf?.supports.some((s) => /UNa\b.*<20/i.test(s))).toBe(true);
  });
});
