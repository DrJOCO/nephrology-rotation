import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Clock3, Search } from "lucide-react";
import { T, ARTICLES as DEFAULT_ARTICLES, ABBREVIATIONS, ALL_LANDMARK_TRIALS, STUDY_SHEETS } from "../../data/constants";
import { WEEKLY_CASES } from "../../data/cases";
import { QUICK_REFS } from "../../data/guides";
import type { Patient, TeamSnapshot } from "../../types";
import { useFocusTrap, useIsMobile } from "../../utils/helpers";
import { searchAll, type SearchResultItem, type SearchScope } from "../../utils/search";
import store from "../../utils/store";

interface RecentQuery {
  query: string;
  scope: SearchScope;
}

interface SearchGroup {
  key: string;
  title: string;
  scope: SearchScope | "all";
  items: SearchResultItem[];
}

const SEARCH_HISTORY_KEY = "neph_searchRecentQueries";
const MAX_RECENT_QUERIES = 10;

const SCOPES: Array<{ id: SearchScope; label: string; placeholder: string }> = [
  { id: "all", label: "All", placeholder: "Search the whole rotation companion..." },
  { id: "articles", label: "Articles", placeholder: "Search articles by title, journal, or topic..." },
  { id: "trials", label: "Trials", placeholder: "Search landmark trials..." },
  { id: "pearls", label: "Pearls", placeholder: "Search teaching pearls and guide callouts..." },
  { id: "patients", label: "My inpatients", placeholder: "Search your inpatient list..." },
  { id: "team", label: "Cohort", placeholder: "Search cohort names or topics..." },
];

function loadRecentQueries(): RecentQuery[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is RecentQuery => Boolean(entry?.query) && typeof entry.query === "string" && typeof entry.scope === "string")
      .slice(0, MAX_RECENT_QUERIES);
  } catch {
    return [];
  }
}

function saveRecentQueries(entries: RecentQuery[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_RECENT_QUERIES)));
}

function mergeRecentQuery(entries: RecentQuery[], query: string, scope: SearchScope): RecentQuery[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return entries;
  const next = [
    { query: trimmed, scope },
    ...entries.filter((entry) => !(entry.query.toLowerCase() === trimmed.toLowerCase() && entry.scope === scope)),
  ].slice(0, MAX_RECENT_QUERIES);
  saveRecentQueries(next);
  return next;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, query: string) {
  const words = Array.from(new Set(query.trim().toLowerCase().split(/\s+/).filter((word) => word.length >= 2)));
  if (words.length === 0) return text;
  const pattern = new RegExp(`(${words.map(escapeRegex).sort((a, b) => b.length - a.length).join("|")})`, "ig");
  return text.split(pattern).map((part, index) => (
    words.includes(part.toLowerCase()) ? (
      <mark
        key={`${part}-${index}`}
        style={{ background: T.redBg, color: T.accent, padding: "0 2px", borderRadius: 4 }}
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  ));
}

export default function GlobalSearchOverlay({
  onClose,
  onNavigate,
  articles: liveArticles,
  patients = [],
  currentStudentId,
}: {
  onClose: () => void;
  onNavigate: (tab: string, sv?: Record<string, unknown>) => void;
  articles?: typeof DEFAULT_ARTICLES;
  patients?: Patient[];
  currentStudentId: string;
}) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>(() => loadRecentQueries());
  const [teamSnapshots, setTeamSnapshots] = useState<TeamSnapshot[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useFocusTrap(panelRef);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (!store.getRotationCode()) {
      setTeamSnapshots([]);
      return;
    }
    const unsub = store.onTeamSnapshotsChanged((snapshots) => {
      setTeamSnapshots(
        (snapshots as TeamSnapshot[]).filter((snapshot) => snapshot.studentId && snapshot.studentId !== currentStudentId),
      );
    });
    return () => unsub();
  }, [currentStudentId]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const timer = window.setTimeout(() => {
      setRecentQueries((previous) => mergeRecentQuery(previous, trimmed, scope));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [query, scope]);

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return null;
    const articleData = liveArticles || DEFAULT_ARTICLES;
    return searchAll(trimmed, {
      trials: ALL_LANDMARK_TRIALS,
      articlesByWeek: articleData,
      cases: WEEKLY_CASES,
      studySheets: STUDY_SHEETS,
      abbreviations: ABBREVIATIONS,
      quickRefs: QUICK_REFS,
      patients,
      teamSnapshots,
    });
  }, [query, liveArticles, patients, teamSnapshots]);

  const groups = useMemo<SearchGroup[]>(() => {
    if (!results) return [];
    const allGroups: SearchGroup[] = [
      { key: "patients", title: "My inpatients", scope: "patients", items: results.patients },
      { key: "articles", title: "Articles", scope: "articles", items: results.articles },
      { key: "decks", title: "Teaching decks", scope: "all", items: results.decks },
      { key: "pearls", title: "Pearls", scope: "pearls", items: results.pearls },
      { key: "cases", title: "Clinical cases", scope: "all", items: results.cases },
      { key: "studySheets", title: "Study sheets", scope: "all", items: results.studySheets },
      { key: "trials", title: "Landmark trials", scope: "trials", items: results.trials },
      { key: "quickRefs", title: "Quick references", scope: "all", items: results.quickRefs },
      { key: "abbreviations", title: "Abbreviations", scope: "all", items: results.abbreviations },
      { key: "team", title: "Cohort", scope: "team", items: results.team },
    ];

    return allGroups.filter((group) => {
      if (group.items.length === 0) return false;
      return scope === "all" ? true : group.scope === scope;
    });
  }, [results, scope]);

  const totalResults = groups.reduce((sum, group) => sum + group.items.length, 0);
  const activeScope = SCOPES.find((item) => item.id === scope) || SCOPES[0];

  const handleNavigate = (item: SearchResultItem) => {
    const trimmed = query.trim();
    if (trimmed.length >= 2) {
      setRecentQueries((previous) => mergeRecentQuery(previous, trimmed, scope));
    }
    onNavigate(...item.nav);
  };

  const handleRecentSelect = (entry: RecentQuery) => {
    setScope(entry.scope);
    setQuery(entry.query);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const emptyState = (() => {
    if (scope === "patients" && patients.length === 0) return "Add inpatients in Inpatients to search your own list.";
    if (scope === "team" && !store.getRotationCode()) return "Join a rotation to search your cohort.";
    if (scope === "team" && teamSnapshots.length === 0) return "No cohort matches yet.";
    return `No results for “${query}”.`;
  })();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      style={{ position: "fixed", inset: 0, zIndex: 10000, background: T.bg, display: "flex", flexDirection: "column" }}
    >
      <div
        ref={panelRef}
        style={{ display: "flex", minHeight: 0, flexDirection: "column", flex: 1 }}
      >
        <div style={{ padding: "calc(10px + env(safe-area-inset-top, 0px)) 16px 12px", background: T.card, borderBottom: `1px solid ${T.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={16} strokeWidth={1.75} color={T.muted} aria-hidden="true" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={activeScope.placeholder}
                aria-label="Search rotation content"
                type="search"
                style={{ width: "100%", padding: "10px 12px 10px 36px", fontSize: 15, border: `1.5px solid ${T.line}`, borderRadius: 10, background: T.bg, color: T.text, outline: "none", boxSizing: "border-box", fontFamily: T.sans }}
              />
            </div>
            <button
              onClick={onClose}
              aria-label="Close search"
              style={{ background: "none", border: "none", color: T.med, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "10px 8px", minHeight: 44, flexShrink: 0 }}
            >
              Cancel
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingTop: 10, margin: "0 -2px" }}>
            {SCOPES.map((item) => {
              const active = item.id === scope;
              return (
                <button
                  key={item.id}
                  onClick={() => setScope(item.id)}
                  style={{
                    flexShrink: 0,
                    minHeight: 36,
                    padding: "7px 12px",
                    borderRadius: 999,
                    border: `1px solid ${active ? T.accent : T.line}`,
                    background: active ? T.redBg : T.surface,
                    color: active ? T.accent : T.ink2,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div aria-live="polite" style={{ fontSize: 13, color: T.muted, marginTop: 8, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <span>
              {results
                ? `${totalResults} result${totalResults !== 1 ? "s" : ""}${scope === "all" ? "" : ` in ${activeScope.label}`}`
                : isMobile
                  ? "Tap a chip to narrow your search"
                  : "Cmd/Ctrl+K opens search from anywhere"}
            </span>
            <span>{scope === "all" ? "All content" : activeScope.label}</span>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {query.trim().length === 0 && recentQueries.length > 0 && (
            <section style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Clock3 size={14} strokeWidth={1.75} color={T.muted} aria-hidden="true" />
                <div style={{ fontSize: 13, fontWeight: 700, color: T.sub,  }}>Recent queries</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {recentQueries.map((entry) => (
                  <button
                    key={`${entry.scope}-${entry.query}`}
                    onClick={() => handleRecentSelect(entry)}
                    style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 999, padding: "8px 12px", cursor: "pointer", textAlign: "left" }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{entry.query}</div>
                    <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>{SCOPES.find((item) => item.id === entry.scope)?.label || "All"}</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {query.trim().length === 0 && (
            <div style={{ background: T.surface, borderRadius: 16, border: `1px solid ${T.line}`, padding: "16px 16px", color: T.sub }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Scoped search is ready</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                Search across the whole app or narrow to articles, trials, pearls, your inpatients, or cohort activity.
              </div>
            </div>
          )}

          {query.trim().length > 0 && query.trim().length < 2 && (
            <div style={{ textAlign: "center", color: T.muted, fontSize: 13, paddingTop: 40 }}>Type at least 2 characters to search</div>
          )}

          {results && totalResults === 0 && (
            <div style={{ textAlign: "center", color: T.muted, fontSize: 13, paddingTop: 40 }}>{emptyState}</div>
          )}

          {groups.map((group) => (
            <section key={group.key} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 8 }}>{group.title}</div>
              {group.items.slice(0, scope === "all" ? 5 : 8).map((item, index) => (
                <button
                  key={`${group.key}-${index}-${item.label}`}
                  onClick={() => handleNavigate(item)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 13px", background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, marginBottom: 8, cursor: "pointer", textAlign: "left" }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, lineHeight: 1.45 }}>
                      {highlightText(item.label, query)}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 7 }}>
                      <span style={{ background: T.ice, color: T.med, borderRadius: 999, padding: "4px 8px", fontSize: 13, fontWeight: 700 }}>
                        {item.kind}
                      </span>
                      <span style={{ fontSize: 13, color: T.sub, lineHeight: 1.45 }}>
                        {highlightText(item.tag, query)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} strokeWidth={1.9} color={T.muted} aria-hidden="true" style={{ flexShrink: 0 }} />
                </button>
              ))}
              {group.items.length > (scope === "all" ? 5 : 8) && (
                <div style={{ fontSize: 13, color: T.med, textAlign: "center", paddingTop: 2 }}>
                  +{group.items.length - (scope === "all" ? 5 : 8)} more
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
