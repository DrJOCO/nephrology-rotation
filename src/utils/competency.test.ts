import { describe, expect, it } from "vitest";
import { STUDY_SHEETS } from "../data/constants";
import { WEEKLY_CASES } from "../data/cases";
import { buildCompetencySummary } from "./competency";

describe("buildCompetencySummary", () => {
  it("treats study sheets, cases, and quiz performance as the required week objectives", () => {
    const completedItems = {
      articles: {},
      studySheets: Object.fromEntries((STUDY_SHEETS[1] || []).map((sheet) => [sheet.id, true])),
      cases: Object.fromEntries((WEEKLY_CASES[1] || []).map((item) => [item.id, { score: 5, total: 5, date: "2026-04-21T12:00:00.000Z" }])),
    };

    const summary = buildCompetencySummary({
      weeklyScores: {
        1: [{ correct: 5, total: 5, date: "2026-04-21T12:00:00.000Z", answers: [] }],
      },
      preScore: null,
      postScore: null,
      completedItems,
      srQueue: {},
      currentWeek: 1,
      totalWeeks: 4,
    });

    expect(summary.objectives.map((objective) => objective.label)).toEqual(["Study sheets", "Cases", "Quiz"]);
    expect(summary.masteryPercent).toBe(100);
    expect(summary.objectives.every((objective) => objective.met)).toBe(true);
  });
});
