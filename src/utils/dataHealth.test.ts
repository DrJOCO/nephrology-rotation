import { describe, expect, it } from "vitest";
import {
  findSuspiciousDuplicateAttempts,
  countStudentsWithDuplicates,
} from "./dataHealth";
import type { QuizAnswer, QuizScore, WeeklyScores } from "../types";

// Test helpers ────────────────────────────────────────────────────────────
function ans(pairs: Array<[number, number]>): QuizAnswer[] {
  return pairs.map(([qIdx, chosen]) => ({ qIdx, chosen, correct: false }));
}

function attempt(
  correct: number,
  total: number,
  date: string,
  answers: QuizAnswer[] = [],
): QuizScore {
  return { correct, total, date, answers };
}

// A base ISO time we shift around to build within/outside-24h scenarios.
const T0 = "2026-04-10T14:00:00.000Z";
const PLUS_2H = "2026-04-10T16:00:00.000Z";
const PLUS_20H = "2026-04-11T10:00:00.000Z";
const PLUS_25H = "2026-04-11T15:00:00.000Z"; // > 24h after T0
const PLUS_3DAY = "2026-04-13T14:00:00.000Z";

describe("findSuspiciousDuplicateAttempts — reopen duplicates flagged", () => {
  it("flags two identical-score, identical-answer attempts within 24h", () => {
    const answers = ans([[0, 1], [1, 2], [2, 0]]);
    const weeklyScores: WeeklyScores = {
      "1": [attempt(8, 10, T0, answers), attempt(8, 10, PLUS_2H, answers)],
    };
    const report = findSuspiciousDuplicateAttempts(weeklyScores);

    expect(report.hasDuplicates).toBe(true);
    expect(report.groups).toHaveLength(1);
    expect(report.groups[0]).toMatchObject({
      week: "1",
      correct: 8,
      total: 10,
      count: 2,
      surplus: 1,
    });
    expect(report.groups[0].dates).toEqual([T0, PLUS_2H]);
    expect(report.totalSurplus).toBe(1);
  });

  it("flags a same-score pair even when answers arrays are empty (admin-entered)", () => {
    // Admin-entered scores store answers: [] — treated as absent, so score+time
    // alone qualifies them as a reopen duplicate.
    const weeklyScores: WeeklyScores = {
      "2": [attempt(6, 10, T0), attempt(6, 10, PLUS_2H)],
    };
    const report = findSuspiciousDuplicateAttempts(weeklyScores);
    expect(report.hasDuplicates).toBe(true);
    expect(report.groups[0].count).toBe(2);
  });

  it("flags a triple-reopen group and reports surplus of 2", () => {
    const answers = ans([[0, 0], [1, 1]]);
    const weeklyScores: WeeklyScores = {
      "3": [
        attempt(9, 10, T0, answers),
        attempt(9, 10, PLUS_2H, answers),
        attempt(9, 10, PLUS_20H, answers),
      ],
    };
    const report = findSuspiciousDuplicateAttempts(weeklyScores);
    expect(report.groups).toHaveLength(1);
    expect(report.groups[0].count).toBe(3);
    expect(report.groups[0].surplus).toBe(2);
    expect(report.totalSurplus).toBe(2);
  });

  it("marks only the reopen copies (not the earliest) in flaggedDates", () => {
    const answers = ans([[0, 1]]);
    const weeklyScores: WeeklyScores = {
      "1": [attempt(7, 10, T0, answers), attempt(7, 10, PLUS_2H, answers)],
    };
    const report = findSuspiciousDuplicateAttempts(weeklyScores);
    // Earliest kept unmarked; only the later copy is flagged.
    expect(report.flaggedDates.has(T0)).toBe(false);
    expect(report.flaggedDates.has(PLUS_2H)).toBe(true);
    expect(report.flaggedDates.size).toBe(1);
  });

  it("detects duplicate groups independently across multiple weeks", () => {
    const a1 = ans([[0, 1]]);
    const a2 = ans([[0, 2]]);
    const weeklyScores: WeeklyScores = {
      "1": [attempt(5, 10, T0, a1), attempt(5, 10, PLUS_2H, a1)],
      "4": [attempt(10, 10, T0, a2), attempt(10, 10, PLUS_20H, a2)],
    };
    const report = findSuspiciousDuplicateAttempts(weeklyScores);
    expect(report.groups).toHaveLength(2);
    expect(report.groups.map((g) => g.week)).toEqual(["1", "4"]);
    expect(report.totalSurplus).toBe(2);
  });
});

describe("findSuspiciousDuplicateAttempts — genuine work NOT flagged", () => {
  it("does not flag two genuine retakes with different scores", () => {
    const weeklyScores: WeeklyScores = {
      "1": [
        attempt(6, 10, T0, ans([[0, 1]])),
        attempt(9, 10, PLUS_2H, ans([[0, 2]])),
      ],
    };
    const report = findSuspiciousDuplicateAttempts(weeklyScores);
    expect(report.hasDuplicates).toBe(false);
    expect(report.groups).toHaveLength(0);
    expect(report.flaggedDates.size).toBe(0);
  });

  it("does not flag a same-score retake with DIFFERENT answers", () => {
    // Same correct/total but the student chose different options — a real
    // second attempt, not a reopen copy.
    const weeklyScores: WeeklyScores = {
      "1": [
        attempt(8, 10, T0, ans([[0, 1], [1, 2]])),
        attempt(8, 10, PLUS_2H, ans([[0, 3], [1, 0]])),
      ],
    };
    const report = findSuspiciousDuplicateAttempts(weeklyScores);
    expect(report.hasDuplicates).toBe(false);
    expect(report.groups).toHaveLength(0);
  });

  it("does not flag a lone attempt in a week", () => {
    const weeklyScores: WeeklyScores = {
      "1": [attempt(8, 10, T0, ans([[0, 1]]))],
    };
    expect(findSuspiciousDuplicateAttempts(weeklyScores).hasDuplicates).toBe(false);
  });

  it("does not flag same-score attempts with different totals", () => {
    const weeklyScores: WeeklyScores = {
      "1": [attempt(8, 10, T0), attempt(8, 12, PLUS_2H)],
    };
    expect(findSuspiciousDuplicateAttempts(weeklyScores).hasDuplicates).toBe(false);
  });
});

describe("findSuspiciousDuplicateAttempts — cross-day duplicates NOT flagged", () => {
  it("does not flag identical attempts more than 24h apart", () => {
    const answers = ans([[0, 1]]);
    const weeklyScores: WeeklyScores = {
      "1": [attempt(8, 10, T0, answers), attempt(8, 10, PLUS_25H, answers)],
    };
    const report = findSuspiciousDuplicateAttempts(weeklyScores);
    expect(report.hasDuplicates).toBe(false);
    expect(report.groups).toHaveLength(0);
  });

  it("does not flag identical attempts several days apart", () => {
    const answers = ans([[0, 1]]);
    const weeklyScores: WeeklyScores = {
      "1": [attempt(8, 10, T0, answers), attempt(8, 10, PLUS_3DAY, answers)],
    };
    expect(findSuspiciousDuplicateAttempts(weeklyScores).hasDuplicates).toBe(false);
  });

  it("splits a same-score cluster spanning >24h into no group (each pair too far via anchor)", () => {
    // Anchor at T0. PLUS_20H is within 24h of the anchor (grouped); PLUS_25H is
    // NOT within 24h of the anchor, so it stays out. The anchor + PLUS_20H pair
    // forms one group of 2, and PLUS_25H is left alone (not flagged).
    const answers = ans([[0, 1]]);
    const weeklyScores: WeeklyScores = {
      "1": [
        attempt(8, 10, T0, answers),
        attempt(8, 10, PLUS_20H, answers),
        attempt(8, 10, PLUS_25H, answers),
      ],
    };
    const report = findSuspiciousDuplicateAttempts(weeklyScores);
    expect(report.groups).toHaveLength(1);
    expect(report.groups[0].dates).toEqual([T0, PLUS_20H]);
    expect(report.flaggedDates.has(PLUS_25H)).toBe(false);
  });
});

describe("findSuspiciousDuplicateAttempts — empty / missing / malformed data is safe", () => {
  it("returns a safe empty report for undefined", () => {
    const report = findSuspiciousDuplicateAttempts(undefined);
    expect(report.hasDuplicates).toBe(false);
    expect(report.groups).toEqual([]);
    expect(report.totalSurplus).toBe(0);
    expect(report.flaggedDates.size).toBe(0);
  });

  it("returns a safe empty report for null", () => {
    expect(findSuspiciousDuplicateAttempts(null).hasDuplicates).toBe(false);
  });

  it("returns a safe empty report for an empty weeklyScores object", () => {
    expect(findSuspiciousDuplicateAttempts({}).hasDuplicates).toBe(false);
  });

  it("ignores weeks whose value is not an array", () => {
    const weeklyScores = { "1": "oops" } as unknown as WeeklyScores;
    expect(findSuspiciousDuplicateAttempts(weeklyScores).hasDuplicates).toBe(false);
  });

  it("skips malformed attempt entries without throwing", () => {
    const weeklyScores = {
      "1": [
        { correct: 8, total: 10 }, // missing date
        null,
        { correct: "8", total: 10, date: T0 }, // wrong type
        attempt(8, 10, PLUS_2H),
      ],
    } as unknown as WeeklyScores;
    // Only one usable attempt survives filtering, so nothing is flagged.
    const report = findSuspiciousDuplicateAttempts(weeklyScores);
    expect(report.hasDuplicates).toBe(false);
  });

  it("skips attempts with unparseable dates", () => {
    const weeklyScores = {
      "1": [
        { correct: 8, total: 10, date: "not-a-date", answers: [] },
        attempt(8, 10, T0),
      ],
    } as unknown as WeeklyScores;
    expect(findSuspiciousDuplicateAttempts(weeklyScores).hasDuplicates).toBe(false);
  });

  it("treats a malformed answers array as absent and falls back to score+time", () => {
    // One attempt has garbage answers; the other has none. Since the garbage
    // answers can't produce a signature, both are treated as answers-absent,
    // so they qualify on score + time.
    const weeklyScores = {
      "1": [
        { correct: 8, total: 10, date: T0, answers: [{ nope: true }] },
        attempt(8, 10, PLUS_2H),
      ],
    } as unknown as WeeklyScores;
    expect(findSuspiciousDuplicateAttempts(weeklyScores).hasDuplicates).toBe(true);
  });

  it("does not mutate the input weeklyScores", () => {
    const answers = ans([[0, 1]]);
    const weeklyScores: WeeklyScores = {
      "1": [attempt(8, 10, PLUS_2H, answers), attempt(8, 10, T0, answers)],
    };
    const snapshot = JSON.stringify(weeklyScores);
    findSuspiciousDuplicateAttempts(weeklyScores);
    expect(JSON.stringify(weeklyScores)).toBe(snapshot);
  });
});

describe("countStudentsWithDuplicates", () => {
  it("counts only students that have at least one duplicate group", () => {
    const dupAnswers = ans([[0, 1]]);
    const students: { weeklyScores?: WeeklyScores | null }[] = [
      { weeklyScores: { "1": [attempt(8, 10, T0, dupAnswers), attempt(8, 10, PLUS_2H, dupAnswers)] } },
      { weeklyScores: { "1": [attempt(8, 10, T0, ans([[0, 1]])), attempt(9, 10, PLUS_2H, ans([[0, 2]]))] } },
      { weeklyScores: {} },
      { weeklyScores: null },
      {},
    ];
    expect(countStudentsWithDuplicates(students)).toBe(1);
  });

  it("returns 0 for an empty roster", () => {
    expect(countStudentsWithDuplicates([])).toBe(0);
  });
});
