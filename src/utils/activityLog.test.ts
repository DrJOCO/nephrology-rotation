import { describe, expect, it } from "vitest";
import { ARTICLES } from "../data/constants";
import { buildBookmarkActivityDetail, describeStudentNavigation } from "./activityLog";

describe("buildBookmarkActivityDetail", () => {
  it("resolves human-readable bookmark labels", () => {
    expect(buildBookmarkActivityDetail("articles", ARTICLES[1][0].url)).toBe(`Article: ${ARTICLES[1][0].title}`);
    expect(buildBookmarkActivityDetail("trials", "ATN Trial")).toBe("Trial: ATN Trial");
  });
});

describe("describeStudentNavigation", () => {
  it("describes quiz starts and content opens", () => {
    expect(describeStudentNavigation({ type: "weeklyQuiz", week: 1 })).toMatchObject({
      type: "quiz_start",
      label: "Started Week 1 Quiz",
    });

    expect(describeStudentNavigation({ type: "guideDetail", id: "firstday" })).toMatchObject({
      type: "guide_open",
      detail: "First Day Orientation",
    });
  });

  it("uses live clinic guide metadata when available", () => {
    expect(describeStudentNavigation(
      { type: "clinicGuide", date: "2026-04-24" },
      { clinicGuides: [{ id: "guide-1", date: "2026-04-24", topic: "CKD", generatedAt: "2026-04-21T12:00:00.000Z", isOverride: false }] },
    )).toMatchObject({
      type: "guide_open",
      label: "Opened Clinic Guide",
      detail: "CKD",
    });
  });
});
