import { describe, it, expect } from "vitest";
import { getTopicContent, getTopicContentBatch, topicHasContent } from "./topicMapping";

describe("topicMapping", () => {
  describe("getTopicContent", () => {
    it("returns study sheets, articles, and cases for AKI", () => {
      const content = getTopicContent("AKI");
      expect(content.studySheets.length).toBeGreaterThan(0);
      expect(content.studySheets[0]).toHaveProperty("week");
      expect(content.studySheets[0]).toHaveProperty("id");
      expect(content.quizWeeks).toContain(1);
    });

    it("returns articles for Hyponatremia", () => {
      const content = getTopicContent("Hyponatremia");
      expect(content.articles.length).toBeGreaterThan(0);
      expect(content.studySheets.length).toBeGreaterThan(0);
    });

    it("returns content for Polycystic Kidney Disease", () => {
      const content = getTopicContent("Polycystic Kidney Disease");
      // Should have at least the CKD study sheet and the TEMPO article
      expect(content.studySheets.length).toBeGreaterThan(0);
      expect(content.articles.length).toBeGreaterThan(0);
      expect(content.quizWeeks).toContain(3);
    });

    it("returns content for APOL1-Associated Kidney Disease", () => {
      const content = getTopicContent("APOL1-Associated Kidney Disease");
      expect(content.studySheets.length).toBeGreaterThan(0);
      expect(content.articles.length).toBeGreaterThan(0);
      expect(content.quizWeeks).toContain(3);
    });

    it("returns cases tagged with the topic", () => {
      const content = getTopicContent("Dialysis");
      expect(content.cases.length).toBeGreaterThan(0);
      expect(content.cases[0]).toHaveProperty("id");
    });

    it("returns empty results for non-existent topic", () => {
      const content = getTopicContent("Nonexistent Topic");
      expect(content.studySheets).toEqual([]);
      expect(content.articles).toEqual([]);
      expect(content.cases).toEqual([]);
      expect(content.quizWeeks).toEqual([]);
    });

    it("returns empty arrays for Other topic", () => {
      const content = getTopicContent("Other");
      expect(content.studySheets).toEqual([]);
      expect(content.quizWeeks).toEqual([]);
    });
  });

  describe("getTopicContentBatch", () => {
    it("returns content for multiple topics", () => {
      const batch = getTopicContentBatch(["AKI", "Dialysis"]);
      expect(batch).toHaveProperty("AKI");
      expect(batch).toHaveProperty("Dialysis");
      expect(batch.AKI.studySheets.length).toBeGreaterThan(0);
      expect(batch.Dialysis.studySheets.length).toBeGreaterThan(0);
    });
  });

  describe("topicHasContent", () => {
    it("returns true for topics with content", () => {
      expect(topicHasContent("AKI")).toBe(true);
      expect(topicHasContent("CKD")).toBe(true);
      expect(topicHasContent("Polycystic Kidney Disease")).toBe(true);
      expect(topicHasContent("APOL1-Associated Kidney Disease")).toBe(true);
    });

    it("returns false for Other", () => {
      expect(topicHasContent("Other")).toBe(false);
    });
  });
});
