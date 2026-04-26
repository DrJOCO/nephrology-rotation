import { describe, expect, it } from "vitest";
import { CURRICULUM_DECKS, STUDY_SHEETS } from "../data/constants";
import { WEEKLY_CASES } from "../data/cases";
import type { CompletedItems, WeeklyScores } from "../types";
import {
  getCalendarWeek,
  getCompletionDrivenModule,
  getStudentCurrentModule,
  hasRotationEnded,
  isCoreModuleComplete,
} from "./moduleProgression";

function buildCompletedItemsForWeek(week: number): CompletedItems {
  return {
    articles: {},
    studySheets: Object.fromEntries((STUDY_SHEETS[week] || []).map((sheet) => [sheet.id, true])),
    decks: Object.fromEntries(CURRICULUM_DECKS.filter((deck) => deck.week === week).map((deck) => [deck.id, true])),
    cases: Object.fromEntries((WEEKLY_CASES[week] || []).map((item) => [item.id, { score: 5, total: 5, date: "2026-04-23T12:00:00.000Z" }])),
  };
}

function buildWeeklyScoresForWeek(week: number): WeeklyScores {
  return {
    [week]: [{ correct: 8, total: 10, date: "2026-04-23T12:00:00.000Z", answers: [] }],
  };
}

describe("moduleProgression", () => {
  it("marks a module complete only when study sheets, decks, cases, and the quiz are done", () => {
    const completedItems = buildCompletedItemsForWeek(1);
    expect(isCoreModuleComplete(1, completedItems, {})).toBe(false);
    expect(isCoreModuleComplete(1, completedItems, buildWeeklyScoresForWeek(1))).toBe(true);
  });

  it("returns the first incomplete module from core completion data", () => {
    const completedItems: CompletedItems = {
      articles: {},
      studySheets: {
        ...buildCompletedItemsForWeek(1).studySheets,
        ...buildCompletedItemsForWeek(2).studySheets,
      },
      decks: {
        ...buildCompletedItemsForWeek(1).decks,
        ...buildCompletedItemsForWeek(2).decks,
      },
      cases: {
        ...buildCompletedItemsForWeek(1).cases,
        ...buildCompletedItemsForWeek(2).cases,
      },
    };
    const weeklyScores: WeeklyScores = {
      ...buildWeeklyScoresForWeek(1),
      ...buildWeeklyScoresForWeek(2),
    };

    expect(getCompletionDrivenModule(4, completedItems, weeklyScores)).toBe(3);
  });

  it("advances students early when they finish the current module before the calendar changes", () => {
    const completedItems = buildCompletedItemsForWeek(1);
    const weeklyScores = buildWeeklyScoresForWeek(1);

    expect(getStudentCurrentModule({
      rotationStart: "2026-04-20",
      totalWeeks: 4,
      completedItems,
      weeklyScores,
      today: new Date("2026-04-23T12:00:00.000Z"),
    })).toBe(2);
  });

  it("does not pull students backward when the calendar is already further along", () => {
    expect(getStudentCurrentModule({
      rotationStart: "2026-04-06",
      totalWeeks: 4,
      completedItems: { articles: {}, studySheets: {}, cases: {}, decks: {} },
      weeklyScores: {},
      today: new Date("2026-04-23T12:00:00.000Z"),
    })).toBe(3);
  });

  it("honors rotation start and end boundaries", () => {
    expect(getCalendarWeek("2026-04-27", 4, new Date("2026-04-23T12:00:00.000Z"))).toBeNull();
    expect(getStudentCurrentModule({
      rotationStart: "2026-04-27",
      totalWeeks: 4,
      completedItems: { articles: {}, studySheets: {}, cases: {}, decks: {} },
      weeklyScores: {},
      today: new Date("2026-04-23T12:00:00.000Z"),
    })).toBeNull();
    expect(hasRotationEnded("2026-03-01", 4, new Date("2026-04-23T12:00:00.000Z"))).toBe(true);
  });

  it("keeps longer rotations active while capping the visible module at four", () => {
    expect(getCalendarWeek("2026-04-01", 6, new Date("2026-05-05T12:00:00.000Z"))).toBe(4);
    expect(hasRotationEnded("2026-04-01", 6, new Date("2026-05-05T12:00:00.000Z"))).toBe(false);
  });
});
