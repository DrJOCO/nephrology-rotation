import { useState } from "react";
import { T, RESOURCES } from "../../data/constants";
import { backBtnStyle } from "./shared";
import type { CompletedItems } from "../../types";

type ResourceTabId = "podcasts" | "websites" | "guidelines" | "decks" | "tools";
type ResourceItem = (typeof RESOURCES)[ResourceTabId][number];
type DeckResource = (typeof RESOURCES)["decks"][number];

interface ResourcesViewProps {
  onBack: () => void;
  initialTab?: ResourceTabId;
  focusWeek?: number;
  completedItems?: CompletedItems;
  onToggleDeckComplete?: (deckId: string) => void;
}

function isDeckResource(resource: ResourceItem): resource is DeckResource {
  return "id" in resource && typeof resource.id === "string";
}

function isCurbsidersResource(url: string) {
  return url.includes("thecurbsiders.com");
}

function getCurbsidersAppleSearchUrl(name: string) {
  return `https://podcasts.apple.com/us/search?term=${encodeURIComponent(`${name} The Curbsiders`)}`;
}

export default function ResourcesView({ onBack, initialTab = "podcasts", focusWeek, completedItems, onToggleDeckComplete }: ResourcesViewProps) {
  const [activeTab, setActiveTab] = useState<ResourceTabId>(initialTab);
  const tabList: Array<{ id: ResourceTabId; label: string; data: typeof RESOURCES[ResourceTabId] }> = [
    { id: "podcasts", label: "\uD83C\uDFA7 Podcasts", data: RESOURCES.podcasts },
    { id: "websites", label: "\uD83C\uDF10 Websites", data: RESOURCES.websites },
    { id: "guidelines", label: "\uD83D\uDCCB Guidelines", data: RESOURCES.guidelines },
    { id: "decks", label: "\uD83D\uDCCA Decks", data: RESOURCES.decks },
    { id: "tools", label: "\uD83D\uDEE0 Tools", data: RESOURCES.tools },
  ];

  const tagColors = {
    "Must Listen": { bg: T.dangerBg, text: T.danger },
    "Essential": { bg: T.dangerBg, text: T.danger },
    "AKI": { bg: T.dangerBg, text: T.danger },
    "Electrolytes": { bg: T.successBg, text: T.success },
    "GN": { bg: T.infoBg, text: T.info },
    "CKD": { bg: T.infoBg, text: T.info },
    "Dialysis": { bg: T.warningBg, text: T.warning },
    "Acid-Base": { bg: T.successBg, text: T.success },
    "Medications": { bg: T.infoBg, text: T.info },
    "Stones": { bg: T.warningBg, text: T.warning },
    "Physiology": { bg: T.successBg, text: T.success },
    "Guidelines": { bg: T.infoBg, text: T.info },
    "Cases": { bg: T.warningBg, text: T.warning },
    "Quick Hits": { bg: T.infoBg, text: T.info },
    "Teaching": { bg: T.successBg, text: T.success },
    "Practice Cases": { bg: T.warningBg, text: T.warning },
    "Video Lectures": { bg: T.infoBg, text: T.info },
    "Visuals": { bg: T.warningBg, text: T.warning },
    "Review": { bg: T.infoBg, text: T.info },
    "Pathology": { bg: T.dangerBg, text: T.danger },
    "Pediatrics": { bg: T.infoBg, text: T.info },
    "Career": { bg: T.infoBg, text: T.info },
    "Community": { bg: T.successBg, text: T.success },
    "Boards": { bg: T.warningBg, text: T.warning },
    "Fun Learning": { bg: T.successBg, text: T.success },
    "App": { bg: T.infoBg, text: T.info },
    "Calculators": { bg: T.infoBg, text: T.info },
    "ICU": { bg: T.dangerBg, text: T.danger },
    "HTN": { bg: T.dangerBg, text: T.danger },
    "Transplant": { bg: T.successBg, text: T.success },
    "HRS": { bg: T.warningBg, text: T.warning },
    "Cardiorenal": { bg: T.infoBg, text: T.info },
    "DKD": { bg: T.successBg, text: T.success },
    "PD": { bg: T.warningBg, text: T.warning },
  };

  const rawActiveData = tabList.find(t => t.id === activeTab)?.data || [];
  const activeData = activeTab === "decks" && focusWeek
    ? rawActiveData.filter(resource => "week" in resource && resource.week === focusWeek)
    : rawActiveData;
  const activeTabStyle = {
    border: `1px solid ${T.brand}`,
    background: T.brandBg,
    color: T.brand,
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
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px" }}>Curated links and teaching decks for your nephrology rotation</p>

      {/* Tab bar — wraps to second row instead of clipping at narrow widths. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {tabList.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: "8px 14px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
              ...(activeTab === t.id ? activeTabStyle : inactiveTabStyle) }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "decks" && (
        <div style={{ background: T.successBg, border: `1px solid ${T.success}`, borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.success, marginBottom: 4 }}>
            Core curriculum
          </div>
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>
            Review the module teaching decks, then tap Mark reviewed to count them toward progress and points.
          </div>
          {focusWeek && (
            <div style={{ display: "inline-flex", marginTop: 10, background: T.card, color: T.success, border: `1px solid ${T.success}`, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 700 }}>
              Showing Module {focusWeek} decks
            </div>
          )}
        </div>
      )}

      {/* Resource cards */}
      {activeData.map((r, i) => {
        const tc = tagColors[r.tag] || { bg: T.ice, text: T.brand };
        const hasCurbsidersFallback = isCurbsidersResource(r.url);
        const appleSearchUrl = hasCurbsidersFallback ? getCurbsidersAppleSearchUrl(r.name) : null;
        const primaryUrl = appleSearchUrl || r.url;
        const primaryLabel = activeTab === "decks" ? "Open Deck" : hasCurbsidersFallback ? "Open Episode" : "Open Resource";
        const isDeck = activeTab === "decks" && isDeckResource(r);
        const deckId = isDeck ? r.id : r.url;
        const deckReviewed = isDeck && Boolean(completedItems?.decks?.[deckId]);
        return (
          <div key={r.url || i}
            style={{ display: "block", background: T.card, borderRadius: 12, padding: 16, marginBottom: 10, border: `1px solid ${T.line}`, transition: "box-shadow 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{r.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: tc.text, background: tc.bg, padding: "2px 8px", borderRadius: 6 }}>{r.tag}</span>
                  {isDeck && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.brand, background: T.ice, padding: "2px 8px", borderRadius: 6 }}>
                      Module {r.week}
                    </span>
                  )}
                  {deckReviewed && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.success, background: T.successBg, padding: "2px 8px", borderRadius: 6 }}>
                      Reviewed
                    </span>
                  )}
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
                  {activeTab === "decks" && (
                    <a href={r.url} download
                      style={secondaryActionStyle}>
                      Download PPTX
                    </a>
                  )}
                  {activeTab === "decks" && onToggleDeckComplete && (
                    <button
                      onClick={() => onToggleDeckComplete(deckId)}
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: deckReviewed ? T.success : T.brand,
                        background: deckReviewed ? T.successBg : T.ice,
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: `1px solid ${deckReviewed ? T.success : T.line}`,
                        cursor: "pointer",
                      }}
                    >
                      {deckReviewed ? "Reviewed" : "Mark reviewed"}
                    </button>
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
        <div style={{ background: T.ice, borderRadius: 12, padding: 14, marginTop: 6, borderLeft: `4px solid ${T.brand}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.brand, marginBottom: 4 }}>LISTENING TIP</div>
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
