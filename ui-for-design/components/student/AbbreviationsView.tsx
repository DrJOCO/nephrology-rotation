import { useState } from "react";
import { T, ABBREVIATIONS } from "../../data/constants";
import { backBtnStyle } from "./shared";

export default function AbbreviationsView({ onBack }) {
  const [search, setSearch] = useState("");
  const filtered = ABBREVIATIONS.filter(a =>
    a.abbr.toLowerCase().includes(search.toLowerCase()) ||
    a.full.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>{"\u2190"} Back</button>
      <h2 style={{ color: T.navy, fontSize: 20, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Nephrology Abbreviations</h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 12px" }}>{ABBREVIATIONS.length} terms you'll encounter on rotation</p>

      {/* Search */}
      <input
        type="text" placeholder="Search abbreviations..."
        value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${T.line}`, borderRadius: 10, fontSize: 14, boxSizing: "border-box", marginBottom: 14, fontFamily: T.sans, outline: "none" }}
        onFocus={e => e.target.style.borderColor = T.med}
        onBlur={e => e.target.style.borderColor = T.line}
      />

      <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.line}`, overflow: "hidden" }}>
        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 13 }}>No matches found</div>
        )}
        {filtered.map((a, i) => (
          <div key={i} style={{ padding: "10px 16px", borderBottom: i < filtered.length - 1 ? `1px solid ${T.bg}` : "none", display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ fontWeight: 700, color: T.med, fontSize: 13, fontFamily: T.mono, minWidth: 90, flexShrink: 0, paddingTop: 1 }}>{a.abbr}</div>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.4, wordBreak: "break-word" }}>{a.full}</div>
          </div>
        ))}
      </div>

      {!search && (
        <div style={{ background: T.ice, borderRadius: 12, padding: 14, marginTop: 14, borderLeft: `4px solid ${T.med}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.med, marginBottom: 4 }}>PRO TIP</div>
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>
            If you see an abbreviation in a note you don't recognize, search here first. The most common ones you'll encounter daily: Cr, GFR, FENa, UA, UOP, I&Os, HD, PD, AVF, BMP, AG.
          </div>
        </div>
      )}
      <button onClick={onBack} style={{ ...backBtnStyle, marginTop: 20, marginBottom: 0 }}>{"\u2190"} Back</button>
    </div>
  );
}
