import { describe, expect, it } from "vitest";
import {
  buildGnAssessment,
  buildSerologyPlan,
  calculateQuantitative,
  DEFAULT_GN_INPUTS,
  interpretComplement,
  type GnToolInputs,
} from "./gnTool";

const baseInputs = (overrides: Partial<GnToolInputs> = {}): GnToolInputs => ({
  ...DEFAULT_GN_INPUTS,
  ...overrides,
});

describe("GN tool calculators", () => {
  it("converts UPCR to g/day and tiers proteinuria", () => {
    const minimal = calculateQuantitative(baseInputs({ upcr: "200" }));
    expect(minimal.proteinGramsPerDay).toBeCloseTo(0.2, 2);
    expect(minimal.proteinTier).toBe("minimal");

    const sub = calculateQuantitative(baseInputs({ upcr: "1500" }));
    expect(sub.proteinTier).toBe("subnephrotic");

    const nephrotic = calculateQuantitative(baseInputs({ upcr: "5000" }));
    expect(nephrotic.proteinTier).toBe("nephrotic_range");
  });

  it("prefers 24h protein over UPCR when both present", () => {
    const q = calculateQuantitative(baseInputs({ upcr: "1000", protein24h: "6" }));
    expect(q.proteinSource).toBe("24h");
    expect(q.proteinGramsPerDay).toBe(6);
    expect(q.proteinTier).toBe("nephrotic_range");
  });

  it("flags an RPGN trajectory when Cr ratio ≥ 2 over an acute or subacute window", () => {
    const acute = calculateQuantitative(baseInputs({ baselineCr: "1", currentCr: "2.5", tempo: "acute" }));
    expect(acute.rpgnTrajectory).toBe(true);
    const chronic = calculateQuantitative(baseInputs({ baselineCr: "1", currentCr: "2.5", tempo: "chronic" }));
    expect(chronic.rpgnTrajectory).toBe(false);
  });

  it("interprets the three classic complement patterns", () => {
    expect(interpretComplement("low", "low").pattern).toBe("low_c3_low_c4");
    expect(interpretComplement("low", "normal").pattern).toBe("low_c3_normal_c4");
    expect(interpretComplement("normal", "normal").pattern).toBe("normal");
    expect(interpretComplement("not_checked", "normal").pattern).toBe("incomplete");
  });

  it("builds a serology plan that excludes already-resolved tests", () => {
    const plan = buildSerologyPlan(
      baseInputs({
        selectedPositive: ["anca_mpo"],
        selectedSentNegative: ["anti_gbm", "ana"],
      }),
      "rpgn",
    );
    const ids = plan.needed.map((n) => n.id);
    expect(ids).not.toContain("anca_mpo");
    expect(ids).not.toContain("anti_gbm");
    expect(ids).not.toContain("ana");
    // RPGN battery still includes hepatitis serologies, etc.
    expect(ids).toContain("hbv");
    expect(ids).toContain("hcv");
  });
});

describe("GN differential vignettes", () => {
  it("ranks anti-GBM disease at the top when anti-GBM antibody is positive", () => {
    const assessment = buildGnAssessment(
      baseInputs({
        syndrome: "rpgn",
        tempo: "acute",
        baselineCr: "1.0",
        currentCr: "4.5",
        c3: "normal",
        c4: "normal",
        selectedPositive: ["anti_gbm"],
        rbcCasts: "present",
        rbc: "dysmorphic",
        protein: "two_plus",
        blood: "three_plus",
      }),
    );
    expect(assessment.differentials[0]?.id).toBe("anti_gbm");
    expect(assessment.differentials[0]?.signal).toBe("High");
    expect(assessment.alerts.some((a) => /Anti-GBM positive/.test(a))).toBe(true);
  });

  it("ranks ANCA-associated vasculitis at the top with PR3 positivity and pulmonary clues", () => {
    const assessment = buildGnAssessment(
      baseInputs({
        syndrome: "pulmonary_renal",
        tempo: "subacute",
        c3: "normal",
        c4: "normal",
        selectedPositive: ["anca_pr3"],
        selectedHistory: ["sinus_ent_chronic", "hemoptysis"],
      }),
    );
    expect(assessment.differentials[0]?.id).toBe("anca_aav");
    expect(assessment.differentials[0]?.title).toMatch(/PR3/);
    expect(assessment.alerts.some((a) => /Pulmonary-renal|Pulmonary–renal/.test(a))).toBe(true);
  });

  it("puts lupus nephritis on top with low C3 + low C4 + ANA + anti-dsDNA + lupus features", () => {
    const assessment = buildGnAssessment(
      baseInputs({
        syndrome: "nephritic",
        c3: "low",
        c4: "low",
        selectedPositive: ["ana", "anti_dsdna"],
        selectedHistory: ["lupus_features"],
      }),
    );
    expect(assessment.differentials[0]?.id).toBe("lupus");
    expect(assessment.differentials[0]?.signal).toBe("High");
  });

  it("flags post-infectious GN with low C3 only after recent strep", () => {
    const assessment = buildGnAssessment(
      baseInputs({
        syndrome: "nephritic",
        c3: "low",
        c4: "normal",
        selectedHistory: ["recent_strep_skin"],
        rbcCasts: "present",
      }),
    );
    expect(assessment.differentials[0]?.id).toBe("post_infectious");
  });

  it("ranks IgA nephropathy with synpharyngitic hematuria and normal complement", () => {
    const assessment = buildGnAssessment(
      baseInputs({
        syndrome: "nephritic",
        c3: "normal",
        c4: "normal",
        rbc: "dysmorphic",
        selectedHistory: ["synpharyngitic"],
      }),
    );
    expect(assessment.differentials[0]?.id).toBe("iga");
  });

  it("ranks IgA vasculitis when palpable purpura is the dominant clue", () => {
    const assessment = buildGnAssessment(
      baseInputs({
        syndrome: "nephritic",
        c3: "normal",
        c4: "normal",
        rbc: "many",
        selectedHistory: ["palpable_purpura", "abdominal_pain_purpura"],
      }),
    );
    expect(assessment.differentials[0]?.id).toBe("iga_vasculitis");
  });

  it("ranks cryoglobulinemic GN with HCV positivity and low C3/C4", () => {
    const assessment = buildGnAssessment(
      baseInputs({
        syndrome: "mixed",
        c3: "low",
        c4: "low",
        selectedPositive: ["cryoglobulin", "hcv"],
        selectedHistory: ["palpable_purpura"],
      }),
    );
    expect(assessment.differentials[0]?.id).toBe("cryo");
  });

  it("ranks primary MN with anti-PLA2R positivity and a nephrotic picture", () => {
    const assessment = buildGnAssessment(
      baseInputs({
        syndrome: "nephrotic",
        c3: "normal",
        c4: "normal",
        upcr: "8000",
        serumAlbumin: "2.1",
        selectedPositive: ["anti_pla2r"],
      }),
    );
    expect(assessment.differentials[0]?.id).toBe("mn");
    expect(assessment.alerts.some((a) => /Nephrotic-range/i.test(a))).toBe(true);
  });

  it("flags HIVAN-pattern FSGS with HIV positivity in nephrotic syndrome", () => {
    const assessment = buildGnAssessment(
      baseInputs({
        syndrome: "nephrotic",
        c3: "normal",
        c4: "normal",
        upcr: "9000",
        selectedPositive: ["hiv"],
      }),
    );
    const ids = assessment.differentials.map((d) => d.id);
    expect(ids[0]).toBe("fsgs");
  });

  it("derives RPGN syndrome when the user leaves it unclear but provides Cr trajectory + active sediment", () => {
    const assessment = buildGnAssessment(
      baseInputs({
        syndrome: "unclear",
        tempo: "acute",
        baselineCr: "1.0",
        currentCr: "3.0",
        rbcCasts: "present",
        rbc: "dysmorphic",
      }),
    );
    expect(assessment.derivedSyndrome).toBe("rpgn");
    expect(assessment.alerts.some((a) => /RPGN signal/.test(a))).toBe(true);
  });

  it("downweights lupus when ANA has been sent and is negative", () => {
    const assessment = buildGnAssessment(
      baseInputs({
        syndrome: "nephritic",
        c3: "low",
        c4: "low",
        selectedSentNegative: ["ana"],
      }),
    );
    const lupus = assessment.differentials.find((d) => d.id === "lupus");
    // Either gone from top 7 or strictly downweighted — both are acceptable behaviors.
    if (lupus) expect(lupus.signal).not.toBe("High");
  });

  it("reminds the user to send anti-PLA2R for new-onset adult nephrotic syndrome", () => {
    const assessment = buildGnAssessment(
      baseInputs({
        syndrome: "nephrotic",
        c3: "normal",
        c4: "normal",
        upcr: "5500",
      }),
    );
    expect(assessment.nextSteps.some((s) => /anti-PLA2R/i.test(s))).toBe(true);
  });

  it("flags MGRS umbrella when SPEP / SFLC monoclonal protein is selected", () => {
    const assessment = buildGnAssessment(
      baseInputs({
        syndrome: "nephrotic",
        c3: "normal",
        c4: "normal",
        upcr: "6000",
        selectedPositive: ["spep_sfle_abnl"],
      }),
    );
    const ids = assessment.differentials.map((d) => d.id);
    expect(ids).toContain("mgrs");
  });

  it("emits an RPGN biopsy alert when Cr ratio ≥2 acutely with active sediment", () => {
    const assessment = buildGnAssessment(
      baseInputs({
        syndrome: "rpgn",
        tempo: "subacute",
        baselineCr: "1.2",
        currentCr: "3.0",
        rbcCasts: "present",
      }),
    );
    expect(assessment.alerts.some((a) => /RPGN signal/.test(a))).toBe(true);
    expect(assessment.nextSteps.some((s) => /biopsy/i.test(s))).toBe(true);
  });
});
