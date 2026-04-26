import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculatePoints,
  getLevel,
  checkAchievements,
  updateStreak,
  ACHIEVEMENTS,
  type StudentState,
} from "./gamification";

// Pin "today" for deterministic streak tests
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-08T12:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

function makeState(overrides: Partial<StudentState> = {}): StudentState {
  return { ...overrides };
}

// ─── calculatePoints ────────────────────────────────────────────────

describe("calculatePoints", () => {
  it("returns 0 for empty state", () => {
    expect(calculatePoints(makeState())).toBe(0);
  });

  it("awards 5 pts per patient", () => {
    const state = makeState({ patients: [{ topics: [] }, { topics: [] }] });
    expect(calculatePoints(state)).toBe(10);
  });

  it("awards +3 multi-topic bonus (>=2 topics)", () => {
    const state = makeState({
      patients: [{ topics: ["AKI", "CKD"] }],
    });
    // 5 base + 3 multi-topic = 8
    expect(calculatePoints(state)).toBe(8);
  });

  it("awards +3 clinical notes bonus", () => {
    const state = makeState({
      patients: [{ topics: [], notes: "Some notes" }],
    });
    // 5 base + 3 notes = 8
    expect(calculatePoints(state)).toBe(8);
  });

  it("awards 10 pts per quiz attempt", () => {
    const state = makeState({
      weeklyScores: { "1": [{ correct: 3, total: 5 }] },
    });
    expect(calculatePoints(state)).toBe(10);
  });

  it("awards +5 for >=80% quiz score", () => {
    const state = makeState({
      weeklyScores: { "1": [{ correct: 4, total: 5 }] },
    });
    // 10 base + 5 >=80% = 15
    expect(calculatePoints(state)).toBe(15);
  });

  it("awards +10 for perfect quiz (100%)", () => {
    const state = makeState({
      weeklyScores: { "1": [{ correct: 5, total: 5 }] },
    });
    // 10 base + 5 >=80% + 10 perfect = 25
    expect(calculatePoints(state)).toBe(25);
  });

  it("awards 15 pts each for pre/post assessments", () => {
    const state = makeState({
      preScore: { correct: 3, total: 5 },
      postScore: { correct: 4, total: 5 },
    });
    // 15 + 15 + 20 improvement = 50
    expect(calculatePoints(state)).toBe(50);
  });

  it("awards 20 improvement bonus only when post > pre", () => {
    const state = makeState({
      preScore: { correct: 4, total: 5 },
      postScore: { correct: 3, total: 5 }, // worse
    });
    // 15 + 15 = 30, no improvement bonus
    expect(calculatePoints(state)).toBe(30);
  });

  it("awards 3 pts per streak day", () => {
    const state = makeState({
      gamification: { streaks: { currentDays: 5, longestDays: 5, lastActiveDate: "2026-03-08" } },
    });
    expect(calculatePoints(state)).toBe(15);
  });

  it("awards 1 pt per completed optional reference article", () => {
    const state = makeState({
      completedItems: { articles: { a1: true, a2: true }, studySheets: {}, cases: {} },
    });
    expect(calculatePoints(state)).toBe(2);
  });

  it("awards 3 pts per completed study sheet", () => {
    const state = makeState({
      completedItems: { articles: {}, studySheets: { s1: true }, cases: {} },
    });
    expect(calculatePoints(state)).toBe(3);
  });

  it("awards 4 pts per reviewed teaching deck", () => {
    const state = makeState({
      completedItems: { articles: {}, studySheets: {}, decks: { d1: true }, cases: {} },
    });
    expect(calculatePoints(state)).toBe(4);
  });

  it("awards 15 pts per case + 5 bonus for >=80%", () => {
    const state = makeState({
      completedItems: {
        articles: {},
        studySheets: {},
        cases: { c1: { score: 4, total: 5 } },
      },
    });
    // 15 base + 5 bonus = 20
    expect(calculatePoints(state)).toBe(20);
  });

  it("awards 2 pts per SR review (sum of repetitions)", () => {
    const state = makeState({
      srQueue: {
        q1: { questionKey: "q1", easeFactor: 2.5, interval: 1, nextReviewDate: "2026-03-09", repetitions: 3, lastReviewed: "2026-03-08", addedDate: "2026-03-01" },
      },
    });
    expect(calculatePoints(state)).toBe(6);
  });

  it("accumulates points from all sources", () => {
    const state = makeState({
      patients: [{ topics: ["AKI", "CKD"], notes: "detailed" }],
      weeklyScores: { "1": [{ correct: 5, total: 5 }] },
      preScore: { correct: 3, total: 5 },
      postScore: { correct: 4, total: 5 },
      gamification: { streaks: { currentDays: 2, longestDays: 2, lastActiveDate: "2026-03-08" } },
      completedItems: { articles: { a1: true }, studySheets: { s1: true }, cases: { c1: { score: 5, total: 5 } } },
      srQueue: {
        q1: { questionKey: "q1", easeFactor: 2.5, interval: 1, nextReviewDate: "2026-03-09", repetitions: 1, lastReviewed: "2026-03-08", addedDate: "2026-03-01" },
      },
    });
    // Patient: 5 + 3(multi-topic) + 3(notes) = 11
    // Quiz: 10 + 5(>=80%) + 10(perfect) = 25
    // Assessments: 15 + 15 + 20(improvement) = 50
    // Streak: 2*3 = 6
    // Articles: 1*1 = 1
    // Study sheets: 1*3 = 3
    // Cases: 15 + 5(>=80%) = 20
    // SR: 1*2 = 2
    // Total = 118
    expect(calculatePoints(state)).toBe(118);
  });
});

// ─── getLevel ───────────────────────────────────────────────────────

describe("getLevel", () => {
  it("returns Medical Student for 0 pts", () => {
    const level = getLevel(0);
    expect(level.name).toBe("Medical Student");
    expect(level.next).toBe("Resident");
    expect(level.nextAt).toBe(75);
  });

  it("returns Medical Student at 74 pts", () => {
    expect(getLevel(74).name).toBe("Medical Student");
  });

  it("returns Resident at 75 pts", () => {
    const level = getLevel(75);
    expect(level.name).toBe("Resident");
    expect(level.next).toBe("Nephrology Fellow");
    expect(level.nextAt).toBe(200);
  });

  it("returns Nephrology Fellow at 200 pts", () => {
    const level = getLevel(200);
    expect(level.name).toBe("Nephrology Fellow");
    expect(level.next).toBe("Attending");
    expect(level.nextAt).toBe(350);
  });

  it("returns Attending at 350 pts", () => {
    const level = getLevel(350);
    expect(level.name).toBe("Attending");
    expect(level.next).toBeNull();
    expect(level.nextAt).toBeNull();
  });

  it("returns Attending at very high pts", () => {
    expect(getLevel(9999).name).toBe("Attending");
  });
});

// ─── checkAchievements ──────────────────────────────────────────────

describe("checkAchievements", () => {
  it("returns empty array when nothing earned", () => {
    expect(checkAchievements(makeState())).toEqual([]);
  });

  it("detects first_patient achievement", () => {
    const state = makeState({ patients: [{ topics: [] }] });
    const earned = checkAchievements(state);
    expect(earned).toContain("first_patient");
  });

  it("detects five_patients achievement", () => {
    const state = makeState({
      patients: Array.from({ length: 5 }, () => ({ topics: [] })),
    });
    const earned = checkAchievements(state);
    expect(earned).toContain("five_patients");
    expect(earned).toContain("first_patient"); // also earned
  });

  it("detects quiz_ace for perfect quiz", () => {
    const state = makeState({
      weeklyScores: { "1": [{ correct: 10, total: 10 }] },
    });
    const earned = checkAchievements(state);
    expect(earned).toContain("quiz_ace");
    expect(earned).toContain("quiz_starter");
  });

  it("detects pre_post achievement", () => {
    const state = makeState({
      preScore: { correct: 3, total: 5 },
      postScore: { correct: 4, total: 5 },
    });
    const earned = checkAchievements(state);
    expect(earned).toContain("pre_post");
    expect(earned).toContain("growth"); // post > pre
  });

  it("excludes already-earned achievements", () => {
    const state = makeState({
      patients: [{ topics: [] }],
      gamification: { achievements: ["first_patient"] },
    });
    const earned = checkAchievements(state);
    expect(earned).not.toContain("first_patient");
  });

  it("detects streak_3 achievement", () => {
    const state = makeState({
      gamification: { streaks: { currentDays: 3, longestDays: 3, lastActiveDate: "2026-03-08" } },
    });
    expect(checkAchievements(state)).toContain("streak_3");
  });

  it("detects case_cracker achievement", () => {
    const state = makeState({
      completedItems: { cases: { c1: { score: 3, total: 5 } } },
    });
    expect(checkAchievements(state)).toContain("case_cracker");
  });

  it("detects sr_starter achievement (5 reviews)", () => {
    const state = makeState({
      srQueue: {
        q1: { questionKey: "q1", easeFactor: 2.5, interval: 6, nextReviewDate: "2026-03-14", repetitions: 5, lastReviewed: "2026-03-08", addedDate: "2026-03-01" },
      },
    });
    expect(checkAchievements(state)).toContain("sr_starter");
  });

  it("detects note_taker achievement (5 patients with notes)", () => {
    const state = makeState({
      patients: Array.from({ length: 5 }, () => ({ topics: [], notes: "pearl" })),
    });
    expect(checkAchievements(state)).toContain("note_taker");
  });

  it("all ACHIEVEMENTS have required fields", () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.id).toBeTruthy();
      expect(a.icon).toBeTruthy();
      expect(a.title).toBeTruthy();
      expect(a.desc).toBeTruthy();
      expect(typeof a.check).toBe("function");
    }
  });
});

// ─── updateStreak ───────────────────────────────────────────────────

describe("updateStreak", () => {
  it("starts a new streak from undefined gamification", () => {
    const result = updateStreak(undefined);

    expect(result.currentDays).toBe(1);
    expect(result.longestDays).toBe(1);
    expect(result.lastActiveDate).toBe("2026-03-08");
    expect(result.activityLog).toContain("2026-03-08");
  });

  it("continues streak when last active was yesterday", () => {
    const result = updateStreak({
      streaks: { currentDays: 3, longestDays: 5, lastActiveDate: "2026-03-07", activityLog: ["2026-03-07"] },
    });

    expect(result.currentDays).toBe(4);
    expect(result.longestDays).toBe(5); // previous longest still higher
    expect(result.lastActiveDate).toBe("2026-03-08");
    expect(result.activityLog).toContain("2026-03-08");
  });

  it("updates longestDays when current exceeds it", () => {
    const result = updateStreak({
      streaks: { currentDays: 5, longestDays: 5, lastActiveDate: "2026-03-07" },
    });

    expect(result.currentDays).toBe(6);
    expect(result.longestDays).toBe(6);
  });

  it("resets streak when gap is more than 1 day", () => {
    const result = updateStreak({
      streaks: { currentDays: 10, longestDays: 10, lastActiveDate: "2026-03-05" },
    });

    expect(result.currentDays).toBe(1); // reset
    expect(result.longestDays).toBe(10); // preserved
  });

  it("returns same data if already active today", () => {
    const existing = {
      streaks: { currentDays: 3, longestDays: 5, lastActiveDate: "2026-03-08", activityLog: ["2026-03-08"] },
    };
    const result = updateStreak(existing);

    expect(result.currentDays).toBe(3); // unchanged
    expect(result.longestDays).toBe(5);
    expect(result.activityLog).toEqual(["2026-03-08"]);
  });

  it("does not duplicate today in activity log", () => {
    const result = updateStreak({
      streaks: { currentDays: 1, longestDays: 1, lastActiveDate: "2026-03-07", activityLog: ["2026-03-07"] },
    });

    const todayCount = result.activityLog!.filter(d => d === "2026-03-08").length;
    expect(todayCount).toBe(1);
  });
});
