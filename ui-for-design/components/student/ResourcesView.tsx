import { useState } from "react";
import { T, RESOURCES } from "../../data/constants";
import { backBtnStyle } from "./shared";

function isCurbsidersResource(url: string) {
  return url.includes("thecurbsiders.com");
}

function getCurbsidersAppleSearchUrl(name: string) {
  return `https://podcasts.apple.com/us/search?term=${encodeURIComponent(`${name} The Curbsiders`)}`;
}

export default function ResourcesView({ onBack }) {
  const [activeTab, setActiveTab] = useState("podcasts");
  const tabList = [
    { id: "podcasts", label: "\uD83C\uDFA7 Podcasts", data: RESOURCES.podcasts },
    { id: "websites", label: "\uD83C\uDF10 Websites", data: RESOURCES.websites },
    { id: "guidelines", label: "\uD83D\uDCCB Guidelines", data: RESOURCES.guidelines },
    { id: "tools", label: "\uD83D\uDEE0 Tools", data: RESOURCES.tools },
  ];

  const tagColors = {
    "Must Listen": { bg: T.redBg, text: T.redDeep },
    "Essential": { bg: T.redBg, text: T.redDeep },
    "AKI": { bg: T.redBg, text: T.redDeep },
    "Electrolytes": { bg: T.greenBg, text: T.greenDk },
    "GN": { bg: T.purpleBg, text: T.purpleAccent },
    "CKD": { bg: T.blueBg, text: T.med },
    "Dialysis": { bg: T.yellowBg, text: T.goldText },
    "Acid-Base": { bg: T.greenBg, text: T.greenDk },
    "Medications": { bg: T.blueBg, text: T.med },
    "Stones": { bg: T.yellowBg, text: T.goldText },
    "Physiology": { bg: T.greenBg, text: T.greenDk },
    "Guidelines": { bg: T.blueBg, text: T.med },
    "Cases": { bg: T.yellowBg, text: T.goldText },
    "Quick Hits": { bg: T.purpleBg, text: T.purpleAccent },
    "Teaching": { bg: T.greenBg, text: T.greenDk },
    "Practice Cases": { bg: T.yellowBg, text: T.goldText },
    "Video Lectures": { bg: T.purpleBg, text: T.purpleAccent },
    "Visuals": { bg: T.yellowBg, text: T.goldText },
    "Review": { bg: T.blueBg, text: T.med },
    "Pathology": { bg: T.redBg, text: T.redDeep },
    "Pediatrics": { bg: T.purpleBg, text: T.purpleAccent },
    "Career": { bg: T.blueBg, text: T.med },
    "Community": { bg: T.greenBg, text: T.greenDk },
    "Boards": { bg: T.yellowBg, text: T.goldText },
    "Fun Learning": { bg: T.greenBg, text: T.greenDk },
    "App": { bg: T.purpleBg, text: T.purpleAccent },
    "Calculators": { bg: T.blueBg, text: T.med },
    "ICU": { bg: T.redBg, text: T.redDeep },
    "HTN": { bg: T.redBg, text: T.redDeep },
  };

  const activeData = tabList.find(t => t.id === activeTab)?.data || [];
  const activeTabStyle = {
    border: `1px solid ${T.med}`,
    background: T.redAlpha,
    color: T.med,
    boxShadow: "none",
  };
  const inactiveTabStyle = {
    border: `1px solid ${T.line}`,
    background: T.grayBg,
    color: T.text,
    boxShadow: "none",
  };
  const primaryActionStyle = {
    fontSize: 13,
    fontWeight: 700,
    color: "white",
    background: T.deepBg,
    padding: "8px 12px",
    borderRadius: 8,
    textDecoration: "none",
    border: `1px solid ${T.deepBg}`,
  };
  const secondaryActionStyle = {
    fontSize: 13,
    fontWeight: 700,
    color: T.sub,
    background: T.grayBg,
    padding: "8px 12px",
    borderRadius: 8,
    textDecoration: "none",
    border: `1px solid ${T.line}`,
  };

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>{"\u2190"} Back</button>
      <h2 style={{ color: T.navy, fontSize: 20, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Resources</h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px" }}>Curated links for your nephrology rotation</p>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto" }}>
        {tabList.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: "8px 14px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
              ...(activeTab === t.id ? activeTabStyle : inactiveTabStyle) }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Resource cards */}
      {activeData.map((r, i) => {
        const tc = tagColors[r.tag] || { bg: T.ice, text: T.med };
        const hasCurbsidersFallback = isCurbsidersResource(r.url);
        const appleSearchUrl = hasCurbsidersFallback ? getCurbsidersAppleSearchUrl(r.name) : null;
        const primaryUrl = appleSearchUrl || r.url;
        const primaryLabel = hasCurbsidersFallback ? "Open Episode" : "Open Resource";
        return (
          <div key={i}
            style={{ display: "block", background: T.card, borderRadius: 12, padding: 16, marginBottom: 10, border: `1px solid ${T.line}`, transition: "box-shadow 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{r.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: tc.text, background: tc.bg, padding: "2px 8px", borderRadius: 6 }}>{r.tag}</span>
                </div>
                <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.45, wordBreak: "break-word" }}>{r.desc}</div>
                {hasCurbsidersFallback && (
                  <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.45, marginTop: 8 }}>
                    Curbsiders pages can be flaky sometimes. If the episode page does not open, use the Apple Podcasts fallback.
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  <a href={primaryUrl} target="_blank" rel="noopener noreferrer"
                    style={primaryActionStyle}>
                    {primaryLabel}
                  </a>
                  {appleSearchUrl && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      style={secondaryActionStyle}>
                      Curbsiders Notes
                    </a>
                  )}
                </div>
              </div>
              <span style={{ color: T.muted, fontSize: 14, flexShrink: 0, marginTop: 2 }}>{"\u2197"}</span>
            </div>
          </div>
        );
      })}

      {/* Bottom tip (podcasts tab only) */}
      {activeTab === "podcasts" && (
        <div style={{ background: T.ice, borderRadius: 12, padding: 14, marginTop: 6, borderLeft: `4px solid ${T.med}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.med, marginBottom: 4 }}>LISTENING TIP</div>
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>
            Start with Curbsiders #226 (AKI) and REBOOT #48 (Hyponatremia) {"\u2014"} these cover the two most common consults you'll see. All Curbsiders nephrology episodes feature Joel Topf (@kidney_boy) and are outstanding. Listen during your commute {"\u2014"} 15 min/day adds up fast over 4 weeks.
          </div>
        </div>
      )}

      {/* Bottom back button */}
      <button onClick={onBack} style={{ ...backBtnStyle, marginTop: 20, marginBottom: 0 }}>{"\u2190"} Back</button>
    </div>
  );
}
