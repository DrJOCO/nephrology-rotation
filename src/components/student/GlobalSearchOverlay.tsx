import { useState, useEffect, useRef, useMemo } from "react";
import { T, ARTICLES as DEFAULT_ARTICLES, ABBREVIATIONS, ALL_LANDMARK_TRIALS, STUDY_SHEETS } from "../../data/constants";
import { WEEKLY_CASES } from "../../data/cases";
import { QUICK_REFS } from "../../data/guides";
import { searchAll } from "../../utils/search";

export default function GlobalSearchOverlay({ onClose, onNavigate, articles: liveArticles }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const results = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return null;
    const articleData = liveArticles || DEFAULT_ARTICLES;
    return searchAll(q, {
      trials: ALL_LANDMARK_TRIALS,
      articlesByWeek: articleData,
      cases: WEEKLY_CASES,
      studySheets: STUDY_SHEETS,
      abbreviations: ABBREVIATIONS,
      quickRefs: QUICK_REFS,
    });
  }, [query, liveArticles]);

  const groups = results ? [
    { key: "trials", title: "Landmark Trials", items: results.trials },
    { key: "articles", title: "Articles", items: results.articles },
    { key: "cases", title: "Clinical Cases", items: results.cases },
    { key: "studySheets", title: "Study Sheets", items: results.studySheets },
    { key: "abbreviations", title: "Abbreviations", items: results.abbreviations },
    { key: "quickRefs", title: "Quick References", items: results.quickRefs },
  ].filter(g => g.items.length > 0) : [];
  const totalResults = groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: T.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "calc(10px + env(safe-area-inset-top, 0px)) 16px 10px", background: T.card, borderBottom: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, pointerEvents: "none" }}>{"\uD83D\uDD0D"}</span>
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search trials, articles, cases..."
              style={{ width: "100%", padding: "10px 12px 10px 36px", fontSize: 15, border: `1.5px solid ${T.line}`, borderRadius: 10, background: T.bg, color: T.text, outline: "none", boxSizing: "border-box", fontFamily: T.sans }} />
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.med, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "8px 4px", flexShrink: 0 }}>Cancel</button>
        </div>
        {results && <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>{totalResults} result{totalResults !== 1 ? "s" : ""}</div>}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {!results && <div style={{ textAlign: "center", color: T.muted, fontSize: 13, paddingTop: 40 }}>Type at least 2 characters to search</div>}
        {results && totalResults === 0 && <div style={{ textAlign: "center", color: T.muted, fontSize: 13, paddingTop: 40 }}>No results for &ldquo;{query}&rdquo;</div>}
        {groups.map(g => (
          <div key={g.key} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{g.title}</div>
            {g.items.slice(0, 5).map((item, i) => (
              <button key={i} onClick={() => onNavigate(...item.nav)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, marginBottom: 6, cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.sub}</div>
                </div>
                <span style={{ color: T.muted, fontSize: 14, flexShrink: 0 }}>{"\u203A"}</span>
              </button>
            ))}
            {g.items.length > 5 && <div style={{ fontSize: 11, color: T.med, textAlign: "center", padding: 4 }}>+{g.items.length - 5} more</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
