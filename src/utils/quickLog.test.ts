import { beforeEach, describe, expect, it } from "vitest";
import {
  createQuickLogEntry,
  isDuplicateQuickLog,
  clearQuickLogGuard,
  resetQuickLogGuard,
  QUICK_LOG_DEDUPE_MS,
  OTHER_QUICK_LOG_SUMMARY,
  summarizeSuggestedGroup,
} from "./quickLog";
import type { PatientSuggestedTopicGroup } from "./patientRecommendations";

describe("createQuickLogEntry", () => {
  it("creates an active consult entry with only a topic", () => {
    const entry = createQuickLogEntry("AKI");
    expect(entry.topics).toEqual(["AKI"]);
    expect(entry.status).toBe("active");
    expect(entry.initials).toBe("");
    expect(entry.followUps).toEqual([]);
  });
});

describe("quick-log double-tap guard", () => {
  beforeEach(() => {
    resetQuickLogGuard();
  });

  it("allows the first tap of a topic", () => {
    expect(isDuplicateQuickLog("AKI", 1_000)).toBe(false);
  });

  it("swallows a second tap of the same topic inside the window", () => {
    expect(isDuplicateQuickLog("AKI", 1_000)).toBe(false);
    expect(isDuplicateQuickLog("AKI", 1_000 + QUICK_LOG_DEDUPE_MS - 1)).toBe(true);
  });

  it("allows the same topic again once the window has elapsed", () => {
    expect(isDuplicateQuickLog("AKI", 1_000)).toBe(false);
    expect(isDuplicateQuickLog("AKI", 1_000 + QUICK_LOG_DEDUPE_MS)).toBe(false);
  });

  it("does not block a different topic tapped immediately after", () => {
    expect(isDuplicateQuickLog("AKI", 1_000)).toBe(false);
    expect(isDuplicateQuickLog("Hyponatremia", 1_050)).toBe(false);
  });

  it("keeps swallowing rapid repeat taps so a triple tap logs once", () => {
    expect(isDuplicateQuickLog("AKI", 1_000)).toBe(false);
    expect(isDuplicateQuickLog("AKI", 1_400)).toBe(true);
    expect(isDuplicateQuickLog("AKI", 1_800)).toBe(true);
  });

  it("clearQuickLogGuard lets a topic be re-logged immediately after undo", () => {
    expect(isDuplicateQuickLog("AKI", 1_000)).toBe(false);
    clearQuickLogGuard("AKI");
    expect(isDuplicateQuickLog("AKI", 1_100)).toBe(false);
  });
});

describe("quick-log confirmation copy", () => {
  it("has an honest summary for 'Other' that promises no linked learning", () => {
    expect(OTHER_QUICK_LOG_SUMMARY.toLowerCase()).toContain("no linked learning");
  });

  it("summarizes a suggested group by its content counts", () => {
    const group: PatientSuggestedTopicGroup = {
      topic: "AKI",
      reason: "Seen on consult (today)",
      sheets: [{ id: "aki-cheatsheet", title: "AKI Survival Guide", week: 1 }],
      trials: [],
      tools: [{ id: "akiTool", label: "AKI Differential Tool", description: "", nav: ["library", { type: "akiTool" }] }],
      guides: [],
    };
    expect(summarizeSuggestedGroup(group)).toBe("1 sheet · 1 tool");
  });
});
