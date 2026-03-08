import { useState, useEffect, useRef, useMemo } from "react";
import { T, ARTICLES as DEFAULT_ARTICLES, ABBREVIATIONS, ALL_LANDMARK_TRIALS, STUDY_SHEETS } from "../../data/constants";
import { WEEKLY_CASES } from "../../data/cases";
import { QUICK_REFS } from "../../data/guides";

export default function GlobalSearchOverlay({ onClose, onNavigate, articles: liveArticles }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return null;
    const articleData = liveArticles || DEFAULT_ARTICLES;
    const m = { trials: [], articles: [], cases: [], studySheets: [], abbreviations: [], quickRefs: [] };

    ALL_LANDMARK_TRIALS.forEach(t => {
      if ([t.name, t.category, t.full_title || "", t.takeaway].some(f => f.toLowerCase().includes(q)))
        m.trials.push({ label: t.name, sub: t.category, icon: "\uD83D\uDCCB", nav: ["guide", { type: "trialLibrary" }] });
    });
    [1,2,3,4].forEach(w => {
      (articleData[w] || []).forEach(a => {
        if ([a.title, a.journal || "", a.topic || ""].some(f => f.toLowerCase().includes(q)))
          m.articles.push({ label: a.title, sub: `Week ${w} \u2022 ${a.type || "Article"}`, icon: "\uD83D\uDCF0", nav: ["home", { type: "articles", week: w }] });
      });
    });
    [1,2,3,4].forEach(w => {
      (WEEKLY_CASES[w] || []).forEach(c => {
        if ([c.title, c.category].some(f => f.toLowerCase().includes(q)))
          m.cases.push({ label: c.title, sub: `Week ${w} \u2022 ${c.difficulty}`, icon: "\uD83C\uDFE5", nav: ["home", { type: "cases", week: w }] });
      });
    });
    [1,2,3,4].forEach(w => {
      (STUDY_SHEETS[w] || []).forEach(s => {
        const sectionText = (s.sections || []).map(sec => sec.heading).join(" ");
        if ([s.title, s.subtitle || "", sectionText].some(f => f.toLowerCase().includes(q)))
          m.studySheets.push({ label: s.title, sub: `Week ${w}`, icon: "\uD83D\uDCDD", nav: ["home", { type: "studySheets", week: w }] });
      });
    });
    ABBREVIATIONS.forEach(a => {
      if (a.abbr.toLowerCase().includes(q) || a.full.toLowerCase().includes(q))
        m.abbreviations.push({ label: a.abbr, sub: a.full, icon: "\uD83D\uDD24", nav: ["home", { type: "abbreviations" }] });
    });
    QUICK_REFS.forEach(r => {
      if ([r.title, r.desc].some(f => f.toLowerCase().includes(q)))
        m.quickRefs.push({ label: r.title, sub: r.desc, icon: r.icon || "\u26A1", nav: ["refs", { type: "refDetail", id: r.id }] });
    });
    return m;
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
