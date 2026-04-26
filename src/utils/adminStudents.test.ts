import { describe, expect, it } from "vitest";
import { ARTICLES, CURRICULUM_DECKS, STUDY_SHEETS } from "../data/constants";
import { WEEKLY_CASES } from "../data/cases";
import { buildStudentProgressSummary, normalizeAdminStudentRecord } from "./adminStudents";

describe("normalizeAdminStudentRecord", () => {
  it("keeps synced progress fields when importing student records", () => {
    const record = normalizeAdminStudentRecord({
      studentId: "student-1",
      name: "Ada Lovelace",
      weeklyScores: {
        1: [{ correct: 4, total: 5, date: "2026-04-20T12:00:00.000Z", answers: [] }],
      },
      gamification: {
        points: 22,
        achievements: ["first-week"],
        streaks: { currentDays: 3, longestDays: 5, lastActiveDate: "2026-04-20" },
      },
      completedItems: {
        articles: { [ARTICLES[1][0].url]: true },
        studySheets: { [STUDY_SHEETS[1][0].id]: true },
        decks: { [CURRICULUM_DECKS[0].id]: true },
        cases: { [WEEKLY_CASES[1][0].id]: { score: 4, total: 5, date: "2026-04-20T12:00:00.000Z" } },
      },
      bookmarks: {
        trials: ["trial-1"],
        articles: [ARTICLES[1][0].url],
        cases: [WEEKLY_CASES[1][0].id],
        studySheets: [STUDY_SHEETS[1][0].id],
      },
      feedbackTags: [{ tag: "excellent progress", date: "2026-04-20T12:00:00.000Z" }],
      updatedAt: "2026-04-21T12:00:00.000Z",
    });

    expect(record.completedItems?.articles[ARTICLES[1][0].url]).toBe(true);
    expect(record.completedItems?.decks?.[CURRICULUM_DECKS[0].id]).toBe(true);
    expect(record.bookmarks?.trials).toEqual(["trial-1"]);
    expect(record.gamification?.points).toBe(22);
    expect(record.feedbackTags).toHaveLength(1);
    expect(record.lastSyncedAt).toBe("2026-04-21T12:00:00.000Z");
  });

  it("fills missing nested progress buckets with safe defaults", () => {
    const record = normalizeAdminStudentRecord({
      studentId: "student-2",
      name: "Grace Hopper",
      completedItems: {
        articles: { [ARTICLES[1][0].url]: true },
      } as Partial<import("../types").CompletedItems>,
      bookmarks: {
        articles: [ARTICLES[1][0].url],
      } as Partial<import("../types").Bookmarks>,
    });

    expect(record.completedItems?.studySheets).toEqual({});
    expect(record.completedItems?.cases).toEqual({});
    expect(record.completedItems?.decks).toEqual({});
    expect(record.bookmarks?.cases).toEqual([]);
    expect(record.bookmarks?.trials).toEqual([]);
  });
});

describe("buildStudentProgressSummary", () => {
  it("counts required curriculum items separately from optional references", () => {
    const summary = buildStudentProgressSummary({
      completedItems: {
        articles: { [ARTICLES[1][0].url]: true },
        studySheets: { [STUDY_SHEETS[1][0].id]: true },
        decks: { [CURRICULUM_DECKS[0].id]: true },
        cases: { [WEEKLY_CASES[1][0].id]: { score: 3, total: 5, date: "2026-04-20T12:00:00.000Z" } },
      },
      weeklyScores: {
        1: [{ correct: 4, total: 5, date: "2026-04-20T12:00:00.000Z", answers: [] }],
        2: [{ correct: 5, total: 5, date: "2026-04-21T12:00:00.000Z", answers: [] }],
      },
      preScore: { correct: 8, total: 10, date: "2026-04-18T12:00:00.000Z", answers: [] },
      postScore: null,
    });

    expect(summary.completedArticles).toBe(1);
    expect(summary.completedStudySheets).toBe(1);
    expect(summary.completedDecks).toBe(1);
    expect(summary.completedCases).toBe(1);
    expect(summary.quizWeeksStarted).toBe(2);
    expect(summary.totalQuizWeeks).toBeGreaterThan(0);
    expect(summary.completedCoreItems).toBe(summary.completedStudySheets + summary.completedDecks + summary.completedCases + summary.quizWeeksStarted);
    expect(summary.totalCoreItems).toBe(summary.totalStudySheets + summary.totalDecks + summary.totalCases + summary.totalQuizWeeks);
    expect(summary.totalQuizAttempts).toBe(2);
    expect(summary.assessmentsDone).toBe(1);
    expect(summary.coreCompletionPercent).toBeGreaterThan(0);
  });

  it("does not let optional article review inflate core completion", () => {
    const summary = buildStudentProgressSummary({
      completedItems: {
        articles: { [ARTICLES[1][0].url]: true },
        studySheets: {},
        cases: {},
      },
      weeklyScores: {},
      preScore: null,
      postScore: null,
    });

    expect(summary.completedArticles).toBe(1);
    expect(summary.completedCoreItems).toBe(0);
    expect(summary.quizWeeksStarted).toBe(0);
    expect(summary.coreCompletionPercent).toBe(0);
  });
});
