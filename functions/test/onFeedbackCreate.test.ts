import { describe, it, expect } from "vitest";
import {
  FEEDBACK_DAILY_LIMIT,
  isValidFeedback,
  processFeedbackCreate,
  utcDayBounds,
} from "../src/onFeedbackCreate.js";
import { FakeFirestore } from "./fakeFirestore.js";
import type { Firestore } from "firebase-admin/firestore";

function asDb(fake: FakeFirestore): Firestore {
  return fake as unknown as Firestore;
}

const NOW = new Date("2026-07-06T12:00:00.000Z");

function validEntry(overrides: Record<string, unknown> = {}) {
  return {
    studentId: "stu1",
    name: "Ana",
    page: "HomeTab",
    tag: "Confusing",
    createdAt: "2026-07-06T11:59:00.000Z",
    ...overrides,
  };
}

describe("isValidFeedback", () => {
  it("accepts a well-formed entry", () => {
    expect(isValidFeedback(validEntry())).toBe(true);
  });
  it("accepts a well-formed entry with a note", () => {
    expect(isValidFeedback(validEntry({ note: "This confused me" }))).toBe(true);
  });
  it("rejects a missing studentId", () => {
    expect(isValidFeedback(validEntry({ studentId: "" }))).toBe(false);
  });
  it("rejects an unknown tag", () => {
    expect(isValidFeedback(validEntry({ tag: "Spam" }))).toBe(false);
  });
  it("rejects an over-long note", () => {
    expect(isValidFeedback(validEntry({ note: "x".repeat(501) }))).toBe(false);
  });
  it("rejects an over-long name", () => {
    expect(isValidFeedback(validEntry({ name: "x".repeat(51) }))).toBe(false);
  });
  it("rejects a non-string createdAt", () => {
    expect(isValidFeedback(validEntry({ createdAt: 123 }))).toBe(false);
  });
});

describe("utcDayBounds", () => {
  it("returns the UTC day's [start, end) as ISO strings", () => {
    const { start, end } = utcDayBounds(NOW);
    expect(start).toBe("2026-07-06T00:00:00.000Z");
    expect(end).toBe("2026-07-07T00:00:00.000Z");
  });
});

describe("processFeedbackCreate", () => {
  it("keeps a valid entry under the daily limit", async () => {
    const fake = new FakeFirestore();
    const path = "rotations/GS/feedback/e1";
    const entry = validEntry();
    fake.store.set(path, entry);
    const outcome = await processFeedbackCreate(
      asDb(fake), "GS", fake.collection("rotations/GS/feedback").doc("e1"), entry, NOW,
    );
    expect(outcome).toBe("kept");
    expect(fake.store.has(path)).toBe(true);
  });

  it("deletes a malformed entry", async () => {
    const fake = new FakeFirestore();
    const path = "rotations/GS/feedback/bad";
    const entry = validEntry({ tag: "Nope" });
    fake.store.set(path, entry);
    const outcome = await processFeedbackCreate(
      asDb(fake), "GS", fake.collection("rotations/GS/feedback").doc("bad"), entry, NOW,
    );
    expect(outcome).toBe("deleted-malformed");
    expect(fake.store.has(path)).toBe(false);
  });

  it("keeps exactly the limit-th entry, deletes the (limit+1)-th and flags abuse", async () => {
    const fake = new FakeFirestore();
    // Seed FEEDBACK_DAILY_LIMIT existing entries today for this student.
    for (let i = 0; i < FEEDBACK_DAILY_LIMIT; i++) {
      fake.store.set(`rotations/GS/feedback/e${i}`, validEntry({ createdAt: `2026-07-06T0${i % 10}:00:00.000Z` }));
    }
    // The just-created (limit+1)-th entry.
    const excessPath = "rotations/GS/feedback/excess";
    const excess = validEntry({ createdAt: "2026-07-06T11:59:00.000Z" });
    fake.store.set(excessPath, excess);

    const outcome = await processFeedbackCreate(
      asDb(fake), "GS", fake.collection("rotations/GS/feedback").doc("excess"), excess, NOW,
    );
    expect(outcome).toBe("rate-limited");
    expect(fake.store.has(excessPath)).toBe(false);
    const marker = fake.store.get("rotations/GS/feedbackAbuse/stu1");
    expect(marker).toBeDefined();
    expect(marker?.studentId).toBe("stu1");
    expect(marker?.dailyLimit).toBe(FEEDBACK_DAILY_LIMIT);
  });

  it("does not count another student's entries toward the limit", async () => {
    const fake = new FakeFirestore();
    for (let i = 0; i < FEEDBACK_DAILY_LIMIT; i++) {
      fake.store.set(`rotations/GS/feedback/other${i}`, validEntry({ studentId: "stu2" }));
    }
    const path = "rotations/GS/feedback/mine";
    const entry = validEntry({ studentId: "stu1" });
    fake.store.set(path, entry);
    const outcome = await processFeedbackCreate(
      asDb(fake), "GS", fake.collection("rotations/GS/feedback").doc("mine"), entry, NOW,
    );
    expect(outcome).toBe("kept");
    expect(fake.store.has(path)).toBe(true);
  });

  it("does not count yesterday's entries toward today's limit", async () => {
    const fake = new FakeFirestore();
    for (let i = 0; i < FEEDBACK_DAILY_LIMIT; i++) {
      fake.store.set(`rotations/GS/feedback/y${i}`, validEntry({ createdAt: "2026-07-05T10:00:00.000Z" }));
    }
    const path = "rotations/GS/feedback/today";
    const entry = validEntry({ createdAt: "2026-07-06T10:00:00.000Z" });
    fake.store.set(path, entry);
    const outcome = await processFeedbackCreate(
      asDb(fake), "GS", fake.collection("rotations/GS/feedback").doc("today"), entry, NOW,
    );
    expect(outcome).toBe("kept");
  });
});
