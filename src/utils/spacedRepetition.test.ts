import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  updateSrItem,
  getDueItems,
  processQuizResults,
  processReviewResults,
  totalSrReviews,
  type SrItem,
} from "./spacedRepetition";

function makeItem(overrides: Partial<SrItem> = {}): SrItem {
  return {
    questionKey: "weekly_1_0",
    easeFactor: 2.5,
    interval: 1,
    nextReviewDate: "2026-03-08",
    repetitions: 0,
    lastReviewed: "2026-03-07",
    addedDate: "2026-03-07",
    ...overrides,
  };
}

// Pin "today" so tests are deterministic
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-08T12:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

// ─── updateSrItem ───────────────────────────────────────────────────

describe("updateSrItem", () => {
  it("correct answer on first rep sets interval=1, reps=1, bumps ease", () => {
    const item = makeItem({ repetitions: 0, interval: 1, easeFactor: 2.5 });
    const updated = updateSrItem(item, true);

    expect(updated.repetitions).toBe(1);
    expect(updated.interval).toBe(1);
    expect(updated.easeFactor).toBeCloseTo(2.6);
    expect(updated.lastReviewed).toBe("2026-03-08");
    expect(updated.nextReviewDate).toBe("2026-03-09"); // +1 day
  });

  it("correct answer on second rep sets interval=6", () => {
    const item = makeItem({ repetitions: 1, interval: 1, easeFactor: 2.6 });
    const updated = updateSrItem(item, true);

    expect(updated.repetitions).toBe(2);
    expect(updated.interval).toBe(6);
    expect(updated.easeFactor).toBeCloseTo(2.7);
    expect(updated.nextReviewDate).toBe("2026-03-14"); // +6 days
  });

  it("correct answer on third+ rep multiplies interval by ease", () => {
    const item = makeItem({ repetitions: 2, interval: 6, easeFactor: 2.5 });
    const updated = updateSrItem(item, true);

    expect(updated.repetitions).toBe(3);
    expect(updated.interval).toBe(15); // round(6 * 2.5)
    expect(updated.easeFactor).toBeCloseTo(2.6);
  });

  it("incorrect answer resets reps/interval, decreases ease", () => {
    const item = makeItem({ repetitions: 3, interval: 15, easeFactor: 2.5 });
    const updated = updateSrItem(item, false);

    expect(updated.repetitions).toBe(0);
    expect(updated.interval).toBe(1);
    expect(updated.easeFactor).toBeCloseTo(2.3);
    expect(updated.nextReviewDate).toBe("2026-03-09"); // +1 day
  });

  it("ease factor never goes below 1.3", () => {
    const item = makeItem({ easeFactor: 1.3 });
    const updated = updateSrItem(item, false);

    expect(updated.easeFactor).toBe(1.3); // clamped at 1.3, not 1.1
  });

  it("preserves questionKey and addedDate", () => {
    const item = makeItem({ questionKey: "weekly_2_5", addedDate: "2026-01-01" });
    const updated = updateSrItem(item, true);

    expect(updated.questionKey).toBe("weekly_2_5");
    expect(updated.addedDate).toBe("2026-01-01");
  });
});

// ─── getDueItems ────────────────────────────────────────────────────

describe("getDueItems", () => {
  it("returns keys with nextReviewDate <= today", () => {
    const queue: Record<string, SrItem> = {
      past: makeItem({ nextReviewDate: "2026-03-07" }),
      today: makeItem({ nextReviewDate: "2026-03-08" }),
      future: makeItem({ nextReviewDate: "2026-03-09" }),
    };
    const due = getDueItems(queue);

    expect(due).toContain("past");
    expect(due).toContain("today");
    expect(due).not.toContain("future");
  });

  it("returns empty array for undefined queue", () => {
    expect(getDueItems(undefined)).toEqual([]);
  });

  it("returns empty array for empty queue", () => {
    expect(getDueItems({})).toEqual([]);
  });
});

// ─── processQuizResults ─────────────────────────────────────────────

describe("processQuizResults", () => {
  it("adds missed questions to queue as new items", () => {
    const answers = [
      { qIdx: 0, correct: false },
      { qIdx: 1, correct: true },
    ];
    const queue = processQuizResults(answers, "weekly", 1, {});

    expect(queue["weekly_1_0"]).toBeDefined();
    expect(queue["weekly_1_0"].repetitions).toBe(0);
    expect(queue["weekly_1_0"].easeFactor).toBe(2.5);
    expect(queue["weekly_1_0"].interval).toBe(1);
    expect(queue["weekly_1_1"]).toBeUndefined(); // correct, not in queue
  });

  it("makes missed assessment questions due immediately", () => {
    const queue = processQuizResults([{ qIdx: 0, correct: false }], "pre", 0, {});

    expect(queue["pre_0_0"]).toBeDefined();
    expect(queue["pre_0_0"].nextReviewDate).toBe("2026-03-08");
  });

  it("resets existing items on wrong answer", () => {
    const existing: Record<string, SrItem> = {
      weekly_1_0: makeItem({ questionKey: "weekly_1_0", repetitions: 3, interval: 15, easeFactor: 2.6 }),
    };
    const answers = [{ qIdx: 0, correct: false }];
    const queue = processQuizResults(answers, "weekly", 1, existing);

    expect(queue["weekly_1_0"].repetitions).toBe(0);
    expect(queue["weekly_1_0"].interval).toBe(1);
    expect(queue["weekly_1_0"].easeFactor).toBeCloseTo(2.4);
  });

  it("advances existing items on correct answer", () => {
    const existing: Record<string, SrItem> = {
      weekly_1_2: makeItem({ questionKey: "weekly_1_2", repetitions: 0, interval: 1, easeFactor: 2.5 }),
    };
    const answers = [{ qIdx: 2, correct: true }];
    const queue = processQuizResults(answers, "weekly", 1, existing);

    expect(queue["weekly_1_2"].repetitions).toBe(1);
  });

  it("does not mutate the original queue", () => {
    const existing: Record<string, SrItem> = {};
    const answers = [{ qIdx: 0, correct: false }];
    processQuizResults(answers, "weekly", 1, existing);

    expect(Object.keys(existing)).toHaveLength(0);
  });
});

// ─── processReviewResults ───────────────────────────────────────────

describe("processReviewResults", () => {
  it("updates items that exist in queue", () => {
    const queue: Record<string, SrItem> = {
      weekly_1_0: makeItem({ questionKey: "weekly_1_0", repetitions: 0 }),
    };
    const result = processReviewResults(
      [{ questionKey: "weekly_1_0", correct: true }],
      queue,
    );

    expect(result["weekly_1_0"].repetitions).toBe(1);
  });

  it("ignores review answers for keys not in queue", () => {
    const result = processReviewResults(
      [{ questionKey: "nonexistent", correct: true }],
      {},
    );

    expect(result["nonexistent"]).toBeUndefined();
  });

  it("does not mutate the original queue", () => {
    const queue: Record<string, SrItem> = {
      k: makeItem({ questionKey: "k" }),
    };
    const original = { ...queue.k };
    processReviewResults([{ questionKey: "k", correct: true }], queue);

    expect(queue.k.repetitions).toBe(original.repetitions); // unchanged
  });
});

// ─── totalSrReviews ─────────────────────────────────────────────────

describe("totalSrReviews", () => {
  it("sums repetitions across all items", () => {
    const queue: Record<string, SrItem> = {
      a: makeItem({ repetitions: 3 }),
      b: makeItem({ repetitions: 5 }),
      c: makeItem({ repetitions: 0 }),
    };
    expect(totalSrReviews(queue)).toBe(8);
  });

  it("returns 0 for undefined queue", () => {
    expect(totalSrReviews(undefined)).toBe(0);
  });

  it("returns 0 for empty queue", () => {
    expect(totalSrReviews({})).toBe(0);
  });
});
