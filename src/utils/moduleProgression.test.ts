// Pin the timezone before any date-sensitive module is imported so the DST
// spring-forward regression below is reproducible regardless of the host's
// local timezone.
process.env.TZ = "America/New_York";

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

  // Regression: week/end-date boundaries must be computed from calendar-day
  // counts, not millisecond division, so a DST spring-forward (which shortens
  // one local day to 23 hours) can't push a boundary a day late.
  describe("DST spring-forward boundaries (America/New_York)", () => {
    it("does not push the calendar week a day late across the March 2026 spring-forward", () => {
      // DST spring-forward in 2026 is Sunday 2026-03-08. A rotation starting
      // Monday 2026-03-02 should be in week 2 by Monday 2026-03-09 (7 full
      // calendar days later), even though that week crossed the DST jump.
      expect(getCalendarWeek("2026-03-02", 4, new Date("2026-03-09T12:00:00"))).toBe(2);
    });

    it("does not push the calendar week a day late across the March 2027 spring-forward", () => {
      // DST spring-forward in 2027 is Sunday 2027-03-14.
      expect(getCalendarWeek("2027-03-08", 4, new Date("2027-03-15T12:00:00"))).toBe(2);
    });

    it("ends the rotation on the correct calendar day across the March 2027 spring-forward", () => {
      // A 1-week rotation starting 2027-03-08 should have ended by 2027-03-15
      // (7 calendar days later), regardless of the DST transition on 03-14.
      expect(hasRotationEnded("2027-03-08", 1, new Date("2027-03-15T12:00:00"))).toBe(true);
      // The day before should still be within week 1 (not yet ended).
      expect(hasRotationEnded("2027-03-08", 1, new Date("2027-03-14T12:00:00"))).toBe(false);
    });
  });
});
