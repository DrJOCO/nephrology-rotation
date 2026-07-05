// Stable article identity for completion/bookmark keys. Articles used to be
// keyed by URL, so an admin fixing a broken link orphaned every student's
// completion history for that article. Bundled articles now carry a stable
// `id`; rotation-published article lists may predate ids (GS-26 does until
// republished), so every consumer falls back to the URL for exactly those
// entries via getArticleKey.

export interface ArticleKeySource {
  id?: string;
  url: string;
}

export function getArticleKey(article: ArticleKeySource): string {
  return article.id || article.url;
}

// Completion check tolerant of both key generations: the article's stable key
// (id when present) and its legacy URL key — old clients keep writing URL
// keys mid-rollout, and admin views read student docs that may not have been
// migrated yet.
export function isArticleCompleted(articles: Record<string, boolean> | undefined, article: ArticleKeySource): boolean {
  if (!articles) return false;
  return articles[getArticleKey(article)] === true || articles[article.url] === true;
}

export function slugifyArticleTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 6)
    .join("-") || "article";
}

// Unique id for a newly added (or legacy id-less) article in the admin
// editor: title slug, de-duped with a numeric suffix.
export function generateUniqueArticleId(title: string, existingIds: Iterable<string>): string {
  const taken = new Set(existingIds);
  const base = slugifyArticleTitle(title);
  if (!taken.has(base)) return base;
  let counter = 2;
  while (taken.has(`${base}-${counter}`)) counter += 1;
  return `${base}-${counter}`;
}

type ArticlesByWeek = Record<string | number, ArticleKeySource[] | undefined>;

// url → id for every article in the CURRENT list that has an id. Entries
// without ids (pre-republish rotation data) are deliberately absent — their
// completions stay keyed by url until the list carries ids.
function buildUrlToIdMap(articlesByWeek: ArticlesByWeek): Map<string, string> {
  const map = new Map<string, string>();
  for (const weekArticles of Object.values(articlesByWeek)) {
    for (const article of weekArticles || []) {
      if (article.id && article.url) map.set(article.url, article.id);
    }
  }
  return map;
}

// Remap url-keyed completion entries to id keys. Idempotent (returns the SAME
// map reference when nothing needs remapping), never downgrades a `true`
// completion, and leaves url keys that match no current article untouched —
// they are invisible to the UI but preserved for a later remap (e.g. when a
// stale device later loads the article list containing that url).
export function migrateArticleCompletionMap(
  completions: Record<string, boolean> | undefined,
  articlesByWeek: ArticlesByWeek,
): Record<string, boolean> | undefined {
  if (!completions) return completions;
  const urlToId = buildUrlToIdMap(articlesByWeek);
  let changed = false;
  const migrated: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(completions)) {
    const id = urlToId.get(key);
    if (!id || id === key) {
      if (!(key in migrated)) migrated[key] = value;
      else migrated[key] = migrated[key] === true ? true : value;
      continue;
    }
    changed = true;
    migrated[id] = migrated[id] === true || value === true ? true : value;
  }
  return changed ? migrated : completions;
}

// Same remap for the bookmarks.articles id list (deduped, order preserved).
export function migrateArticleBookmarkList(
  bookmarkedArticles: string[] | undefined,
  articlesByWeek: ArticlesByWeek,
): string[] | undefined {
  if (!bookmarkedArticles) return bookmarkedArticles;
  const urlToId = buildUrlToIdMap(articlesByWeek);
  if (!bookmarkedArticles.some((key) => urlToId.has(key))) return bookmarkedArticles;
  const migrated: string[] = [];
  const seen = new Set<string>();
  for (const key of bookmarkedArticles) {
    const next = urlToId.get(key) || key;
    if (seen.has(next)) continue;
    seen.add(next);
    migrated.push(next);
  }
  return migrated;
}
