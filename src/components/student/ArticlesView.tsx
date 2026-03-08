import { T, WEEKLY } from "../../data/constants";
import { backBtnStyle } from "./shared";

export default function ArticlesView({ week, onBack, curriculum, articles, completedItems, bookmarks, onToggleBookmark, onToggleComplete }) {
  const arts = articles[week] || [];
  const wk = curriculum[week] || WEEKLY[week];
  const readCount = arts.filter(a => (completedItems?.articles || {})[a.url]).length;

  const typeColors = {
    "Guideline": { bg: T.greenBg, text: T.greenDk },
    "Landmark Study": { bg: T.yellowBg, text: T.goldText },
    "Landmark": { bg: T.yellowBg, text: T.goldText },
    "Review": { bg: T.ice, text: T.med },
  };

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>{"\u2190"} Back</button>
      <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: "0 0 4px", fontWeight: 700 }}>
        Week {week}: {wk?.title || "Curriculum"}
      </h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px" }}>
        Recommended readings {"\u2014"} {readCount}/{arts.length} read
      </p>

      {arts.map((a, i) => {
        const tc = typeColors[a.type] || typeColors.Review;
        const isRead = (completedItems?.articles || {})[a.url];
        return (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
            <a href={a.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", flex: 1, background: isRead ? T.greenBg : T.card, borderRadius: 12, padding: 16, border: `1px solid ${isRead ? T.greenAlpha : T.line}`, textDecoration: "none", transition: "box-shadow 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 18 }}>{a.type === "Guideline" ? "\uD83D\uDCCB" : (a.type === "Landmark Study" || a.type === "Landmark") ? "\u2B50" : "\uD83D\uDCC4"}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, lineHeight: 1.35, marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: T.sub }}>{a.journal} ({a.year})</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: tc.text, background: tc.bg, padding: "2px 8px", borderRadius: 6 }}>{a.type}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: T.muted, background: T.bg, padding: "2px 8px", borderRadius: 6 }}>{a.topic}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
                    <span style={{ fontSize: 10, color: T.muted }}>Can&#39;t access?</span>
                    <a href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(a.title)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      style={{ fontSize: 10, fontWeight: 600, color: T.med, textDecoration: "none", padding: "1px 6px", borderRadius: 4, background: T.blueBg }}>PubMed</a>
                    <a href={`https://scholar.google.com/scholar?q=${encodeURIComponent(a.title)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      style={{ fontSize: 10, fontWeight: 600, color: T.med, textDecoration: "none", padding: "1px 6px", borderRadius: 4, background: T.blueBg }}>Scholar</a>
                  </div>
                </div>
                <div style={{ color: T.muted, fontSize: 16, flexShrink: 0 }}>{"\u2197"}</div>
              </div>
            </a>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12, flexShrink: 0 }}>
              <button onClick={() => onToggleBookmark(a.url)}
                style={{ width: 28, height: 28, borderRadius: 14, border: `1.5px solid ${(bookmarks?.articles || []).includes(a.url) ? T.gold : T.line}`, background: (bookmarks?.articles || []).includes(a.url) ? T.yellowBg : T.card, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, color: (bookmarks?.articles || []).includes(a.url) ? T.gold : T.muted }}>
                {(bookmarks?.articles || []).includes(a.url) ? "\u2605" : "\u2606"}
              </button>
              <button onClick={() => onToggleComplete(a.url)}
                style={{ width: 28, height: 28, borderRadius: 14, border: `2px solid ${isRead ? T.green : T.line}`, background: isRead ? T.green : T.card, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                {isRead && <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>{"\u2713"}</span>}
              </button>
            </div>
          </div>
        );
      })}
      {arts.length > 2 && <button onClick={onBack} style={{ ...backBtnStyle, marginTop: 16, marginBottom: 0 }}>{"\u2190"} Back</button>}
    </div>
  );
}
