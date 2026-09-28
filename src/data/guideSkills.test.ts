import { describe, expect, it } from "vitest";
import { QUICK_REFS } from "./guides";
import { INPATIENT_GUIDES, INPATIENT_GUIDE_TOPICS } from "./inpatientGuides";
import { INPATIENT_SKILLS } from "./inpatientSkills";
import { ROTATION_GUIDES, ROTATION_GUIDE_IDS } from "./rotationGuides";

describe("inpatient consult guides", () => {
  it("has a guide and bedside skills for every topic", () => {
    for (const topic of INPATIENT_GUIDE_TOPICS) {
      const guide = INPATIENT_GUIDES[topic];
      const skills = INPATIENT_SKILLS[topic];
      expect(guide?.topic, topic).toBe(topic);
      expect(guide.beforeRounds.length, topic).toBeGreaterThan(0);
      expect(skills.historyQuestions.length, topic).toBeGreaterThan(0);
      expect(skills.examFindings.length, topic).toBeGreaterThan(0);
      expect(skills.imaging.length, topic).toBeGreaterThan(0);
      expect(skills.practiceSnapshot.length, topic).toBeGreaterThan(0);
    }
  });

  it("writes every sample A&P as a one-liner, a problem heading, and numbered recommendations", () => {
    for (const topic of INPATIENT_GUIDE_TOPICS) {
      const lines = INPATIENT_SKILLS[topic].sampleAssessmentPlan;
      expect(lines[0], topic).toMatch(/^Assessment: /);
      expect(lines.some(line => line.startsWith("# ")), topic).toBe(true);
      expect(lines, topic).toContain("Recommendations:");
      expect(lines.some(line => /^1\. /.test(line)), topic).toBe(true);
    }
  });

  it("starts every practice case with the consult question", () => {
    for (const topic of INPATIENT_GUIDE_TOPICS) {
      expect(INPATIENT_SKILLS[topic].practiceSnapshot[0], topic).toMatch(/^Consult question: /);
    }
  });

  it("links only to calculators that exist", () => {
    const refIds = new Set(QUICK_REFS.map(ref => ref.id));
    for (const topic of INPATIENT_GUIDE_TOPICS) {
      for (const tool of INPATIENT_GUIDES[topic].relatedTools || []) {
        expect(refIds.has(tool.refId), `${topic} → ${tool.refId}`).toBe(true);
      }
    }
    expect(INPATIENT_GUIDES.Hypernatremia.relatedTools?.map(tool => tool.refId)).toContain("fwd");
    expect(INPATIENT_GUIDES["Acid-Base"].relatedTools?.map(tool => tool.refId)).toContain("acidbase");
  });
});

describe("rotation guides", () => {
  it("lists every rotation guide exactly once", () => {
    expect([...ROTATION_GUIDE_IDS].sort()).toEqual(Object.keys(ROTATION_GUIDES).sort());
    for (const id of ROTATION_GUIDE_IDS) {
      expect(ROTATION_GUIDES[id].id).toBe(id);
      expect(ROTATION_GUIDES[id].sections.every(section => section.items.length > 0), id).toBe(true);
    }
  });

  it("teaches SOAP follow-ups and a full new-consult HPI with worked examples", () => {
    const followUp = ROTATION_GUIDES.consultFollowUp.sections;
    const written = followUp.find(section => section.heading.startsWith("Worked Example — Written SOAP"));
    expect(written?.format).toBe("example");
    expect(written?.items.map(item => item.slice(0, 2))).toEqual(["S:", "O:", "A:", "P:"]);

    const presentation = ROTATION_GUIDES.initialConsultPresentation.sections;
    expect(presentation.some(section => section.heading === "Writing the Full HPI (New Consults)")).toBe(true);
    expect(presentation.find(section => section.heading.startsWith("Worked Example — New Consult HPI"))?.format).toBe("example");
  });
});

describe("ABG interpreter add-back", () => {
  const abg = QUICK_REFS.find(ref => ref.id === "acidbase");
  if (!abg || abg.type !== "calculator") throw new Error("ABG interpreter not found");

  it("adds back the delta gap to find a hidden metabolic alkalosis", () => {
    const result = abg.calculate({ ph: 7.18, pco2: 24, hco3: 10, na: 138, cl: 94, alb: 4 });
    expect(result?.interpretation).toMatch(/corrected HCO₃⁻ = 10 \+ 22\.0 = 32\.0/);
    expect(result?.interpretation).toMatch(/Concurrent METABOLIC ALKALOSIS/);
  });

  it("corrects the anion gap for low albumin before adding back", () => {
    const result = abg.calculate({ ph: 7.25, pco2: 30, hco3: 13, na: 140, cl: 115, alb: 3 });
    expect(result?.interpretation).toMatch(/Albumin-corrected AG = 12 \+ 2\.5 × \(4 − 3\) = 14\.5/);
    expect(result?.interpretation).toMatch(/Concurrent NON-AG METABOLIC ACIDOSIS/);
  });
});
