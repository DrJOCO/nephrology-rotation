import { describe, expect, it } from "vitest";
import { getConsultTopicCompletionKey } from "./consultTopicKey";
import { getConsultTopicCompletionKey as reExported } from "./patientRecommendations";

describe("getConsultTopicCompletionKey", () => {
  it("slugifies a topic to a stable lowercase key", () => {
    expect(getConsultTopicCompletionKey("AKI")).toBe("aki");
    expect(getConsultTopicCompletionKey("Diabetic Kidney Disease")).toBe("diabetic-kidney-disease");
  });

  it("collapses punctuation/whitespace and trims dashes", () => {
    expect(getConsultTopicCompletionKey("  Calcium/Phosphorus  ")).toBe("calcium-phosphorus");
    expect(getConsultTopicCompletionKey("APOL1-Associated")).toBe("apol1-associated");
  });

  it("falls back to 'topic' when nothing slug-worthy remains", () => {
    expect(getConsultTopicCompletionKey("   ")).toBe("topic");
    expect(getConsultTopicCompletionKey("!!!")).toBe("topic");
  });

  it("is the same function re-exported from patientRecommendations (back-compat)", () => {
    expect(reExported).toBe(getConsultTopicCompletionKey);
  });
});
