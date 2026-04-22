import { describe, expect, it } from "vitest";
import { PRE_QUIZ_BY_WEEK, WEEKLY_QUIZZES, resolveReinforcementTopic } from "./quizzes";

describe("resolveReinforcementTopic", () => {
  it("infers a reinforcement topic for pre-test questions without explicit topic metadata", () => {
    expect(resolveReinforcementTopic(PRE_QUIZ_BY_WEEK[2][0])).toBe("Hyponatremia");
    expect(resolveReinforcementTopic(PRE_QUIZ_BY_WEEK[3][4])).toBe("CKD");
  });

  it("maps explicit weekly topic aliases into canonical reinforcement buckets", () => {
    const hrsQuestion = WEEKLY_QUIZZES[1].find((question) => question.topic === "Hepatorenal Syndrome");
    const pdQuestion = WEEKLY_QUIZZES[4].find((question) => question.topic === "Peritoneal Dialysis");

    expect(resolveReinforcementTopic(hrsQuestion)).toBe("AKI");
    expect(resolveReinforcementTopic(pdQuestion)).toBe("Dialysis");
  });

  it("falls back from broad board-style labels to semantic topic matching", () => {
    const finerenoneQuestion = WEEKLY_QUIZZES[3].find((question) => question.explanation?.includes("FIDELIO-DKD"));
    const type4RtaQuestion = WEEKLY_QUIZZES[2].find((question) => question.explanation?.includes("Type 4 RTA"));

    expect(resolveReinforcementTopic(finerenoneQuestion)).toBe("Diabetic Kidney Disease");
    expect(resolveReinforcementTopic(type4RtaQuestion)).toBe("Hyperkalemia");
  });
});
