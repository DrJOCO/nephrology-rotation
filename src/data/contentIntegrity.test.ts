import { describe, expect, it } from "vitest";
import { ALL_LANDMARK_TRIALS, ARTICLES, CURRICULUM_DECKS, RESOURCES, STUDY_SHEETS, TOPICS } from "./constants";
import { GUIDE_DATA, GUIDE_SECTIONS, QUICK_REFS } from "./guides";

const RESOURCE_GROUPS = [
  RESOURCES.podcasts,
  RESOURCES.websites,
  RESOURCES.guidelines,
  RESOURCES.tools,
];

describe("content integrity", () => {
  it("uses https for all externally linked resources and articles", () => {
    for (const group of RESOURCE_GROUPS) {
      for (const resource of group) {
        expect(resource.url.startsWith("https://")).toBe(true);
      }
    }

    for (const week of Object.values(ARTICLES)) {
      for (const article of week) {
        expect(article.url.startsWith("https://")).toBe(true);
      }
    }

    for (const trial of ALL_LANDMARK_TRIALS) {
      expect(trial.url.startsWith("https://")).toBe(true);
    }
  });

  it("keeps study-sheet topics aligned with the app topic list", () => {
    const topicSet = new Set(TOPICS);

    for (const week of Object.values(STUDY_SHEETS)) {
      for (const sheet of week) {
        for (const topic of sheet.topics || []) {
          expect(topicSet.has(topic)).toBe(true);
        }
      }
    }

    for (const deck of CURRICULUM_DECKS) {
      for (const topic of deck.topics || []) {
        expect(topicSet.has(topic)).toBe(true);
      }
    }
  });

  it("keeps every study-sheet evidence callout linked to a known article or trial", () => {
    const evidenceNames = ALL_LANDMARK_TRIALS.map(trial => trial.name);
    for (const week of Object.values(ARTICLES)) {
      for (const article of week) {
        evidenceNames.push(article.title);
      }
    }

    for (const week of Object.values(STUDY_SHEETS)) {
      for (const sheet of week) {
        for (const callout of sheet.trialCallouts || []) {
          const hasMatch = evidenceNames.some(name =>
            name === callout.trial ||
            name.startsWith(callout.trial) ||
            callout.trial.startsWith(name),
          );
          expect(hasMatch).toBe(true);
        }
      }
    }
  });

  it("has guide metadata for every guide section", () => {
    for (const section of GUIDE_SECTIONS) {
      expect(GUIDE_DATA[section.id]).toBeDefined();
      expect(GUIDE_DATA[section.id].categories.length).toBeGreaterThan(0);
    }
  });

  it("uses a standard free-water deficit formula", () => {
    const freeWaterDeficit = QUICK_REFS.find(ref => ref.id === "fwd");
    expect(freeWaterDeficit?.type).toBe("calculator");

    if (!freeWaterDeficit || freeWaterDeficit.type !== "calculator") {
      throw new Error("Free water deficit calculator not found");
    }

    const result = freeWaterDeficit.calculate({ weight: 70, na: 155, tbwFactor: 0.6 });
    expect(result?.value).toBe("4.5 L");
  });
});
