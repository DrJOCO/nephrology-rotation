import { T, ARTICLES as DEFAULT_ARTICLES, ALL_LANDMARK_TRIALS, STUDY_SHEETS } from "../../data/constants";
import { WEEKLY_CASES } from "../../data/cases";
import { backBtnStyle } from "./shared";
import type { Bookmarks, SubView } from "../../types";

export default function BookmarksView({ bookmarks, onBack, onNavigate, onToggleBookmark, articles: liveArticles }: { bookmarks: Bookmarks; onBack: () => void; onNavigate: (tab: string, sv?: SubView) => void; onToggleBookmark: (type: keyof Bookmarks, id: string) => void; articles: typeof DEFAULT_ARTICLES }) {
  const bk = bookmarks || {};
  const articleData = liveArticles || DEFAULT_ARTICLES;
  const bookmarkedTrials = ALL_LANDMARK_TRIALS.filter(t => (bk.trials || []).includes(t.name));
  const bookmarkedArticles: (typeof DEFAULT_ARTICLES[1][0] & { _week: number })[] = [];
  [1,2,3,4].forEach(w => (articleData[w] || []).forEach(a => { if ((bk.articles || []).includes(a.url)) bookmarkedArticles.push({ ...a, _week: w }); }));
  const bookmarkedCases: (typeof WEEKLY_CASES[1][0] & { _week: number })[] = [];
  [1,2,3,4].forEach(w => (WEEKLY_CASES[w] || []).forEach(c => { if ((bk.cases || []).includes(c.id)) bookmarkedCases.push({ ...c, _week: w }); }));
  const bookmarkedSheets: (typeof STUDY_SHEETS[1][0] & { _week: number })[] = [];
  [1,2,3,4].forEach(w => (STUDY_SHEETS[w] || []).forEach(s => { if ((bk.studySheets || []).includes(s.id)) bookmarkedSheets.push({ ...s, _week: w }); }));

  const total = bookmarkedTrials.length + bookmarkedArticles.length + bookmarkedCases.length + bookmarkedSheets.length;

  const renderSection = <I,>(title: string, items: I[], renderItem: (item: I, index: number) => React.ReactNode) => items.length > 0 && (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{title} ({items.length})</div>
      {items.map(renderItem)}
    </div>
  );

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>{"\u2190"} Back</button>
      <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: "0 0 4px", fontWeight: 700 }}>{"\u2B50"} Saved Items</h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px" }}>{total} bookmarked</p>
      {total === 0 && <div style={{ textAlign: "center", padding: 40, color: T.muted, fontSize: 13 }}>Tap the {"\u2606"} on any trial, article, case, or study sheet to save it here.</div>}
      {renderSection("Landmark Trials", bookmarkedTrials, (t, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: T.card, borderRadius: 10, padding: 12, marginBottom: 6, border: `1px solid ${T.line}` }}>
          <button onClick={() => onToggleBookmark("trials", t.name)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: T.gold, padding: 0, flexShrink: 0 }}>{"\u2605"}</button>
          <button onClick={() => onNavigate("guide", { type: "trialLibrary" })} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{t.name}</div>
            <div style={{ fontSize: 11, color: T.muted }}>{t.category}</div>
          </button>
        </div>
      ))}
      {renderSection("Articles", bookmarkedArticles, (a, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: T.card, borderRadius: 10, padding: 12, marginBottom: 6, border: `1px solid ${T.line}` }}>
          <button onClick={() => onToggleBookmark("articles", a.url)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: T.gold, padding: 0, flexShrink: 0 }}>{"\u2605"}</button>
          <button onClick={() => onNavigate("home", { type: "articles", week: a._week })} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{a.title}</div>
            <div style={{ fontSize: 11, color: T.muted }}>Week {a._week} {"\u2022"} {a.type || "Article"}</div>
          </button>
        </div>
      ))}
      {renderSection("Clinical Cases", bookmarkedCases, (c, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: T.card, borderRadius: 10, padding: 12, marginBottom: 6, border: `1px solid ${T.line}` }}>
          <button onClick={() => onToggleBookmark("cases", c.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: T.gold, padding: 0, flexShrink: 0 }}>{"\u2605"}</button>
          <button onClick={() => onNavigate("home", { type: "cases", week: c._week })} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{c.title}</div>
            <div style={{ fontSize: 11, color: T.muted }}>Week {c._week} {"\u2022"} {c.difficulty}</div>
          </button>
        </div>
      ))}
      {renderSection("Study Sheets", bookmarkedSheets, (s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: T.card, borderRadius: 10, padding: 12, marginBottom: 6, border: `1px solid ${T.line}` }}>
          <button onClick={() => onToggleBookmark("studySheets", s.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: T.gold, padding: 0, flexShrink: 0 }}>{"\u2605"}</button>
          <button onClick={() => onNavigate("home", { type: "studySheets", week: s._week })} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{s.icon} {s.title}</div>
            <div style={{ fontSize: 11, color: T.muted }}>Week {s._week}</div>
          </button>
        </div>
      ))}
      {total > 3 && <button onClick={onBack} style={{ ...backBtnStyle, marginTop: 20, marginBottom: 0 }}>{"\u2190"} Back</button>}
    </div>
  );
}
