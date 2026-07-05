// Article completion/bookmark keys: stable id going forward, url for legacy
// entries. The migration must be idempotent, must never drop a true
// completion, and must leave unmatched url keys untouched (invisible to the
// UI but preserved for a later remap).
import { describe, expect, it } from "vitest";
import {
  generateUniqueArticleId,
  getArticleKey,
  isArticleCompleted,
  migrateArticleBookmarkList,
  migrateArticleCompletionMap,
} from "./articleKeys";
import { mergeCompletedItems } from "./progressMerge";

const ARTICLES_BY_WEEK = {
  1: [
    { id: "ckd-epi-2021", url: "https://example.org/ckd-epi", title: "CKD-EPI 2021" },
    // Rotation-published entry that predates ids (GS-26 until republish).
    { url: "https://example.org/no-id-yet", title: "Legacy Entry" },
  ],
  2: [
    { id: "smart-crystalloids", url: "https://example.org/smart", title: "SMART" },
  ],
};

describe("getArticleKey / isArticleCompleted", () => {
  it("keys by id when present, url otherwise", () => {
    expect(getArticleKey(ARTICLES_BY_WEEK[1][0])).toBe("ckd-epi-2021");
    expect(getArticleKey(ARTICLES_BY_WEEK[1][1])).toBe("https://example.org/no-id-yet");
  });

  it("recognizes completions under either key generation", () => {
    const article = ARTICLES_BY_WEEK[1][0];
    expect(isArticleCompleted({ "ckd-epi-2021": true }, article)).toBe(true);
    expect(isArticleCompleted({ "https://example.org/ckd-epi": true }, article)).toBe(true);
    expect(isArticleCompleted({}, article)).toBe(false);
    expect(isArticleCompleted(undefined, article)).toBe(false);
  });
});

describe("migrateArticleCompletionMap", () => {
  it("remaps url keys to id keys and removes the url key", () => {
    const migrated = migrateArticleCompletionMap(
      { "https://example.org/ckd-epi": true, "https://example.org/smart": true },
      ARTICLES_BY_WEEK,
    );
    expect(migrated).toEqual({ "ckd-epi-2021": true, "smart-crystalloids": true });
  });

  it("is a no-op (same reference) on already-migrated data", () => {
    const input = { "ckd-epi-2021": true };
    expect(migrateArticleCompletionMap(input, ARTICLES_BY_WEEK)).toBe(input);
  });

  it("leaves unmatched url keys in place untouched", () => {
    const migrated = migrateArticleCompletionMap(
      { "https://example.org/gone-from-list": true, "https://example.org/ckd-epi": true },
      ARTICLES_BY_WEEK,
    );
    expect(migrated).toEqual({ "https://example.org/gone-from-list": true, "ckd-epi-2021": true });
  });

  it("does not remap entries whose article has no id (url stays the key)", () => {
    const input = { "https://example.org/no-id-yet": true };
    expect(migrateArticleCompletionMap(input, ARTICLES_BY_WEEK)).toBe(input);
  });

  it("never drops a true completion when both key generations exist", () => {
    const migrated = migrateArticleCompletionMap(
      { "ckd-epi-2021": true, "https://example.org/ckd-epi": true },
      ARTICLES_BY_WEEK,
    );
    expect(migrated).toEqual({ "ckd-epi-2021": true });
  });

  it("converts an old client's url keys after mergeCompletedItems unions them in (rollout sequence)", () => {
    // New client already migrated; old client's write carries a url key for a
    // different article. The listener unions, then re-migrates.
    const localMigrated = { articles: { "ckd-epi-2021": true } };
    const oldClientRemote = { articles: { "https://example.org/smart": true } };
    const merged = mergeCompletedItems(oldClientRemote, localMigrated) as { articles: Record<string, boolean> };
    const migrated = migrateArticleCompletionMap(merged.articles, ARTICLES_BY_WEEK);
    expect(migrated).toEqual({ "ckd-epi-2021": true, "smart-crystalloids": true });
  });
});

describe("migrateArticleBookmarkList", () => {
  it("remaps and dedupes, preserving order and unmatched keys", () => {
    const migrated = migrateArticleBookmarkList(
      ["https://example.org/ckd-epi", "ckd-epi-2021", "https://example.org/unknown"],
      ARTICLES_BY_WEEK,
    );
    expect(migrated).toEqual(["ckd-epi-2021", "https://example.org/unknown"]);
  });

  it("is a no-op (same reference) when nothing needs remapping", () => {
    const input = ["ckd-epi-2021", "https://example.org/unknown"];
    expect(migrateArticleBookmarkList(input, ARTICLES_BY_WEEK)).toBe(input);
  });
});

describe("generateUniqueArticleId", () => {
  it("slugs the title and truncates to a short kebab id", () => {
    expect(generateUniqueArticleId("SPRINT Trial: Intensive vs Standard BP Targets", [])).toBe("sprint-trial-intensive-vs-standard-bp");
  });

  it("de-dupes with a numeric suffix", () => {
    expect(generateUniqueArticleId("SMART", ["smart"])).toBe("smart-2");
    expect(generateUniqueArticleId("SMART", ["smart", "smart-2"])).toBe("smart-3");
  });

  it("never returns an empty id", () => {
    expect(generateUniqueArticleId("!!!", [])).toBe("article");
  });
});
