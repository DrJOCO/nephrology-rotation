import { describe, expect, it } from "vitest";
import { CLINIC_GUIDES } from "../data/clinicGuides";
import { ARTICLES, STUDY_SHEETS, WEEKLY } from "../data/constants";
import HISTORY from "../data/contentHistoryFingerprints.json";
import LEGACY from "./__fixtures__/legacyRotationContent.json";
import { contentFingerprint } from "./contentFingerprint";
import {
  computeContentCustomizations,
  countCustomizations,
  inferLegacyCustomizations,
  parseContentCustomizations,
  resolveRotationContent,
} from "./contentCustomizations";
import { normalizeStudySheets } from "./studySheets";
import { normalizeClinicGuideTemplates } from "./clinicGuideTemplates";

// LEGACY = what a rotation saved before this change holds: full copies of the
// built-in content as it was at commit 016280d (before the September content review).
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const week1 = (STUDY_SHEETS as Record<number, Array<{ id: string }>>)[1];

describe("legacy rotations (saved before contentCustomizations)", () => {
  it("the fixture really is outdated — at least one item differs from today's built-in version", () => {
    const aki = LEGACY.studySheets[1].find(sheet => sheet.id === "aki-cheatsheet");
    const current = week1.find(sheet => sheet.id === "aki-cheatsheet");
    expect(contentFingerprint("studySheets", "aki-cheatsheet", aki)).not.toBe(contentFingerprint("studySheets", "aki-cheatsheet", current));
    expect(contentFingerprint("clinicGuideTemplates", "Lupus Nephritis", LEGACY.clinicGuideTemplates["Lupus Nephritis"]))
      .not.toBe(contentFingerprint("clinicGuideTemplates", "Lupus Nephritis", CLINIC_GUIDES["Lupus Nephritis"]));
  });

  it("recognizes untouched old built-in copies as not customized", () => {
    expect(countCustomizations(inferLegacyCustomizations(LEGACY))).toBe(0);
  });

  it("shows students the latest built-in content instead of the stale copy", () => {
    const resolved = resolveRotationContent(LEGACY);
    expect(resolved.studySheets).toEqual(normalizeStudySheets());
    expect(resolved.clinicGuideTemplates).toEqual(normalizeClinicGuideTemplates());
    expect(resolved.articles).toEqual(ARTICLES);
    expect(resolved.curriculum).toEqual(WEEKLY);
  });

  it("keeps an admin's real edit and updates everything else", () => {
    const edited = clone(LEGACY);
    edited.studySheets[1][0].title = "Our AKI sheet";
    edited.articles[1] = edited.articles[1].slice(0, 2);
    const inferred = inferLegacyCustomizations(edited);
    expect(inferred.studySheets).toEqual([edited.studySheets[1][0].id]);
    expect(inferred.articles).toEqual(["1"]);

    const resolved = resolveRotationContent(edited);
    const sheet = resolved.studySheets[1].find(s => s.id === edited.studySheets[1][0].id);
    expect(sheet?.title).toBe("Our AKI sheet");
    expect(resolved.articles[1]).toHaveLength(2);
    expect(resolved.clinicGuideTemplates).toEqual(normalizeClinicGuideTemplates());
  });

  it("matches old article lists that predate article ids", () => {
    const withoutIds: Record<string, unknown> = clone(LEGACY);
    withoutIds.articles = { 1: LEGACY.articles[1].map(({ id: _id, ...article }) => article) };
    expect(inferLegacyCustomizations(withoutIds).articles).toEqual([]);
  });

  it("covers today's built-in content in the generated history file", () => {
    const history = HISTORY as unknown as Record<string, string[]>;
    for (const sheet of week1) expect(history.studySheets).toContain(contentFingerprint("studySheets", sheet.id, sheet));
    expect(history.clinicGuideTemplates).toContain(contentFingerprint("clinicGuideTemplates", "CKD", CLINIC_GUIDES.CKD));
    expect(history.curriculum).toContain(contentFingerprint("curriculum", "1", WEEKLY[1]));
  });
});

describe("rotations with recorded customizations", () => {
  it("uses the stored version only for listed items, even when others differ", () => {
    const doc = {
      ...clone(LEGACY),
      contentCustomizations: { version: 1, studySheets: [], clinicGuideTemplates: ["Lupus Nephritis"], articles: [], curriculum: [] },
    };
    const resolved = resolveRotationContent(doc);
    expect(resolved.clinicGuideTemplates["Lupus Nephritis"].guidelineBasis).toEqual(LEGACY.clinicGuideTemplates["Lupus Nephritis"].guidelineBasis);
    expect(resolved.clinicGuideTemplates.CKD).toEqual(normalizeClinicGuideTemplates().CKD);
    expect(resolved.studySheets).toEqual(normalizeStudySheets());
  });

  it("ignores malformed customization records and falls back to inference", () => {
    expect(parseContentCustomizations({ version: 2 })).toBeNull();
    expect(parseContentCustomizations("nope")).toBeNull();
    expect(resolveRotationContent({ ...clone(LEGACY), contentCustomizations: { version: 99 } }).studySheets).toEqual(normalizeStudySheets());
  });
});

describe("publishing", () => {
  it("records nothing when the admin hasn't edited anything", () => {
    const resolved = resolveRotationContent(null);
    expect(countCustomizations(computeContentCustomizations(resolved))).toBe(0);
  });

  it("records exactly the items the admin edited, and round-trips", () => {
    const content = resolveRotationContent(null);
    content.studySheets[1][0] = { ...content.studySheets[1][0], subtitle: "Custom subtitle" };
    content.clinicGuideTemplates.CKD = { ...content.clinicGuideTemplates.CKD, teachingPearl: "Our pearl" };
    content.curriculum = { ...content.curriculum, 2: { ...content.curriculum[2], title: "Lytes" } };
    const customizations = computeContentCustomizations(content);
    expect(customizations).toEqual({
      version: 1,
      studySheets: [content.studySheets[1][0].id],
      clinicGuideTemplates: ["CKD"],
      articles: [],
      curriculum: ["2"],
    });

    const reloaded = resolveRotationContent({ ...content, contentCustomizations: customizations });
    expect(reloaded.studySheets[1][0].subtitle).toBe("Custom subtitle");
    expect(reloaded.clinicGuideTemplates.CKD.teachingPearl).toBe("Our pearl");
    expect(reloaded.curriculum[2].title).toBe("Lytes");
    expect(reloaded.articles).toEqual(ARTICLES);
  });
});
