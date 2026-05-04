import { describe, expect, it } from "vitest";
import { buildAkiAssessment, calculateAkiStage, calculateFena, calculateFeurea, DEFAULT_AKI_INPUTS, deriveUopFrom24h } from "./akiTool";

describe("AKI tool calculations", () => {
  it("stages creatinine rise using KDIGO-style thresholds", () => {
    expect(calculateAkiStage({ baselineCr: "1.0", currentCr: "1.4", uop: "not_recorded", uop24hVolumeMl: "", weightKg: "", krtInitiated: false }).overallStage).toBe(1);
    expect(calculateAkiStage({ baselineCr: "1.0", currentCr: "2.1", uop: "not_recorded", uop24hVolumeMl: "", weightKg: "", krtInitiated: false }).overallStage).toBe(2);
    expect(calculateAkiStage({ baselineCr: "1.0", currentCr: "3.2", uop: "not_recorded", uop24hVolumeMl: "", weightKg: "", krtInitiated: false }).overallStage).toBe(3);
  });

  it("uses urine output stage when it is more severe than creatinine stage", () => {
    const stage = calculateAkiStage({ baselineCr: "1.0", currentCr: "1.2", uop: "anuria", uop24hVolumeMl: "", weightKg: "", krtInitiated: false });
    expect(stage.creatinineStage).toBe(0);
    expect(stage.uopStage).toBe(3);
    expect(stage.overallStage).toBe(3);
  });

  it("forces overall stage 3 when KRT has been initiated, regardless of Cr/UOP", () => {
    const stage = calculateAkiStage({ baselineCr: "1.0", currentCr: "1.2", uop: "normal", uop24hVolumeMl: "", weightKg: "", krtInitiated: true });
    expect(stage.overallStage).toBe(3);
    expect(stage.reasons.some((r) => /Kidney replacement therapy/i.test(r))).toBe(true);
  });

  it("recognizes stage 3 by absolute SCr ≥4 when AKI definition is met by either delta or ratio", () => {
    const stage = calculateAkiStage({ baselineCr: "2.5", currentCr: "4.0", uop: "not_recorded", uop24hVolumeMl: "", weightKg: "", krtInitiated: false });
    expect(stage.overallStage).toBe(3);
  });

  it("derives mL/kg/hr from 24-h UOP volume + weight and stages it accordingly", () => {
    // 700 mL / 70 kg / 24 h = 0.417 mL/kg/hr → stage 2 (<0.5 but ≥0.3 over a full 24 h window)
    const oliguric = deriveUopFrom24h("700", "70");
    expect(oliguric.ratePerKgPerHr).toBeCloseTo(700 / 70 / 24, 3);
    expect(oliguric.stage).toBe(2);
    const veryLow = deriveUopFrom24h("400", "80");
    expect(veryLow.stage).toBe(3);
    const anuric = deriveUopFrom24h("0", "70");
    expect(anuric.stage).toBe(3);
    const normal = deriveUopFrom24h("1500", "70");
    expect(normal.stage).toBe(0);
  });

  it("uses derived UOP rate to drive the overall AKI stage when categorical is not recorded", () => {
    const stage = calculateAkiStage({ baselineCr: "1.0", currentCr: "1.2", uop: "not_recorded", uop24hVolumeMl: "400", weightKg: "80", krtInitiated: false });
    expect(stage.uopStage).toBe(3);
    expect(stage.overallStage).toBe(3);
  });

  it("calculates FENa from serum and urine sodium/creatinine", () => {
    const fena = calculateFena({
      serumNa: "140",
      urineNa: "20",
      urineCr: "100",
      serumCrForUrine: "",
      currentCr: "2",
    });
    expect(fena.value).toBeCloseTo(0.286, 3);
  });

  it("returns pending FENa for invalid inputs", () => {
    const fena = calculateFena({
      serumNa: "0",
      urineNa: "20",
      urineCr: "100",
      serumCrForUrine: "",
      currentCr: "2",
    });
    expect(fena.value).toBeNull();
    expect(fena.missing).toContain("serum Na");
  });

  it("calculates FEUrea from urine urea, BUN, urine creatinine, and serum creatinine", () => {
    const feurea = calculateFeurea({
      urineUrea: "400",
      serumBun: "40",
      urineCr: "100",
      serumCrForUrine: "",
      currentCr: "2",
    });
    expect(feurea.value).toBeCloseTo(20, 2);
  });

  it("ranks obstruction highly when hydronephrosis is selected", () => {
    const assessment = buildAkiAssessment({
      ...DEFAULT_AKI_INPUTS,
      baselineCr: "1",
      currentCr: "2.4",
      selectedImaging: ["hydro"],
      uop: "anuria",
    });
    expect(assessment.differentials[0].id).toBe("postrenal");
  });

  it("lets contrast and prerenal signals compete with heart failure history", () => {
    const assessment = buildAkiAssessment({
      ...DEFAULT_AKI_INPUTS,
      baselineCr: "1",
      currentCr: "2.1",
      selectedContext: ["heart_failure", "low_po"],
      selectedNephrotoxins: ["contrast", "ace_arb"],
      protein: "negative",
      blood: "negative",
      rbc: "none",
      wbc: "none",
    });
    expect(assessment.differentials[0].id).not.toBe("cardiorenal");
  });

  it("raises GN with active sediment even if postrenal risk is present", () => {
    const assessment = buildAkiAssessment({
      ...DEFAULT_AKI_INPUTS,
      baselineCr: "1",
      currentCr: "2",
      selectedContext: ["obstruction_risk"],
      selectedImaging: ["no_hydro"],
      protein: "three_plus",
      blood: "three_plus",
      rbc: "dysmorphic",
      selectedSediment: ["rbc_casts"],
    });
    expect(assessment.differentials[0].id).toBe("gn");
  });

  it("flags atheroembolic disease after vascular manipulation with systemic clues", () => {
    const assessment = buildAkiAssessment({
      ...DEFAULT_AKI_INPUTS,
      selectedHistory: ["vascular_disease", "htn"],
      selectedContext: ["recent_cath_vascular", "athero_clues"],
    });
    expect(assessment.differentials[0].id).toBe("atheroembolic");
  });

  it("flags cast nephropathy clues even with low dipstick protein", () => {
    const assessment = buildAkiAssessment({
      ...DEFAULT_AKI_INPUTS,
      selectedHistory: ["mgus_myeloma"],
      selectedContext: ["myeloma_clues"],
      protein: "negative",
    });
    expect(assessment.differentials[0].id).toBe("cast_nephropathy");
    expect(assessment.differentials[0].supports.join(" ")).toContain("dipstick");
  });

  it("flags CKD-on-AKI when cortical thinning and elevated baseline are present", () => {
    const assessment = buildAkiAssessment({
      ...DEFAULT_AKI_INPUTS,
      baselineCr: "1.8",
      currentCr: "3.0",
      selectedHistory: ["known_ckd", "albuminuria"],
      selectedImaging: ["cortical_thinning"],
    });
    const ckd = assessment.differentials.find((item) => item.id === "ckd_chronicity");
    expect(ckd).toBeDefined();
    expect(ckd!.signal).toBe("High");
  });

  it("keeps multiple competing etiologies in the top three with mixed context", () => {
    const assessment = buildAkiAssessment({
      ...DEFAULT_AKI_INPUTS,
      baselineCr: "1",
      currentCr: "2.2",
      selectedContext: ["heart_failure", "low_po"],
      selectedNephrotoxins: ["contrast", "ace_arb", "nsaid"],
    });
    const topIds = assessment.differentials.slice(0, 3).map((item) => item.id);
    expect(topIds).toContain("contrast");
    expect(new Set(topIds).size).toBe(topIds.length);
  });

  it("returns null FENa when urine creatinine is zero", () => {
    const fena = calculateFena({
      serumNa: "140",
      urineNa: "20",
      urineCr: "0",
      serumCrForUrine: "",
      currentCr: "2",
    });
    expect(fena.value).toBeNull();
    expect(fena.missing).toContain("urine Cr");
  });

  it("returns null FEUrea when BUN is missing or zero", () => {
    const feurea = calculateFeurea({
      urineUrea: "400",
      serumBun: "",
      urineCr: "100",
      serumCrForUrine: "",
      currentCr: "2",
    });
    expect(feurea.value).toBeNull();
    expect(feurea.missing).toContain("BUN");
  });

  it("ignores negative numeric inputs in stage calculations", () => {
    const stage = calculateAkiStage({ baselineCr: "-1", currentCr: "2", uop: "not_recorded", uop24hVolumeMl: "", weightKg: "", krtInitiated: false });
    expect(stage.baseline).toBeNull();
    expect(stage.creatinineStage).toBeNull();
  });
});
