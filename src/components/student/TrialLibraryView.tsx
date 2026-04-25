import { useState } from "react";
import { T, ALL_LANDMARK_TRIALS } from "../../data/constants";
import { CategoryGroupedTrials } from "./TrialCard";
import { backBtnStyle } from "./shared";

export default function TrialLibraryView({ onBack, bookmarks, onToggleBookmark, initialSearch }: { onBack: () => void; bookmarks: any; onToggleBookmark: (name: string) => void; initialSearch?: string }) {
  const [searchQ, setSearchQ] = useState(initialSearch || "");

  const filtered = searchQ.trim()
    ? ALL_LANDMARK_TRIALS.filter(t => {
        const q = searchQ.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) ||
          t.full_title.toLowerCase().includes(q) || t.takeaway.toLowerCase().includes(q) ||
          (t.significance || "").toLowerCase().includes(q);
      })
    : ALL_LANDMARK_TRIALS;

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>{"\u2190"} Back</button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: T.warningBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{"\uD83D\uDCDA"}</div>
        <div>
          <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: 0, fontWeight: 700 }}>Landmark Trial Library</h2>
          <p style={{ color: T.sub, fontSize: 13, margin: "2px 0 0" }}>{ALL_LANDMARK_TRIALS.length} trials across all weeks</p>
        </div>
      </div>
      <input type="text" placeholder="Search trials... (e.g. rituximab, SGLT2, IgA)"
        value={searchQ} onChange={e => setSearchQ(e.target.value)}
        style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.line}`, borderRadius: 10, fontSize: 14, boxSizing: "border-box", margin: "12px 0 16px", fontFamily: T.sans, outline: "none" }} />
      {searchQ.trim() && filtered.length === 0 && (
        <div style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 13 }}>No trials match "{searchQ}"</div>
      )}
      {searchQ.trim() && filtered.length > 0 && (
        <div style={{ fontSize: 13, color: T.sub, marginBottom: 12 }}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</div>
      )}
      <CategoryGroupedTrials trials={filtered} bookmarks={bookmarks} onToggleBookmark={onToggleBookmark} />
      <button onClick={onBack} style={{ ...backBtnStyle, marginTop: 16, marginBottom: 0 }}>{"\u2190"} Back</button>
    </div>
  );
}
