import { useState } from "react";
import { T, ALL_LANDMARK_TRIALS } from "../../data/constants";
import { GUIDE_SECTIONS, GUIDE_DATA } from "../../data/guides";
import { CLINIC_GUIDES, type ClinicGuideTopic } from "../../data/clinicGuides";
import { INPATIENT_GUIDES, INPATIENT_GUIDE_TOPICS } from "../../data/inpatientGuides";
import { ROTATION_GUIDES, ROTATION_GUIDE_IDS } from "../../data/rotationGuides";
import { getCurrentOrNextFriday, getClinicTopicForDate } from "../../utils/clinicRotation";
import { backBtnStyle } from "./shared";
import type { ClinicGuideRecord } from "../../types";

function GuideDetailView({ sectionId, onBack }: { sectionId: string; onBack: () => void }) {
  const [openCat, setOpenCat] = useState(0);
  const section = GUIDE_SECTIONS.find(s => s.id === sectionId);
  const data = GUIDE_DATA[sectionId];

  if (!section || !data) return <div style={{ padding: 16 }}>Section not found.</div>;

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>← Back</button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
          {section.icon}
        </div>
        <div>
          <h2 style={{ color: T.navy, fontSize: 20, margin: 0, fontFamily: T.serif, fontWeight: 700, lineHeight: 1.2 }}>{section.title}</h2>
          <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{section.sub}</div>
        </div>
      </div>

      {/* Intro */}
      <div style={{ background: T.ice, borderRadius: 12, padding: 16, marginBottom: 16, borderLeft: `4px solid ${T.med}` }}>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, wordBreak: "break-word" }}>{data.intro}</div>
      </div>

      {/* Categories - accordion */}
      {data.categories.map((cat, ci) => {
        const isOpen = openCat === ci;
        return (
          <div key={ci} style={{ marginBottom: 10, background: T.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${isOpen ? cat.color + "60" : T.line}`, transition: "border 0.2s" }}>
            <button onClick={() => setOpenCat(isOpen ? -1 : ci)}
              style={{ width: "100%", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: cat.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                {cat.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{cat.title}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{cat.items.length} items</div>
              </div>
              <span style={{ color: T.muted, fontSize: 14, transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>›</span>
            </button>

            {isOpen && (
              <div style={{ padding: "0 16px 16px" }}>
                <div style={{ height: 1, background: T.line, marginBottom: 12 }} />
                {cat.items.map((item, ii) => {
                  const isWarning = item.startsWith("⚠");
                  const isNever = item.startsWith("NEVER") || item.startsWith("🚫");

                  return (
                    <div key={ii} style={{
                      display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8,
                      ...(isWarning ? { background: T.yellowBg, borderRadius: 8, padding: "8px 10px", marginLeft: -4, marginRight: -4 } : {}),
                      ...(isNever ? { background: T.redBg, borderRadius: 8, padding: "8px 10px", marginLeft: -4, marginRight: -4 } : {}),
                    }}>
                      {!isWarning && !isNever && (
                        <span style={{ color: cat.color, fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>•</span>
                      )}
                      <div style={{ fontSize: 13, color: isWarning ? T.goldText : isNever ? T.redDeep : T.text, lineHeight: 1.5, fontWeight: isWarning || isNever ? 600 : 400, wordBreak: "break-word" }}>
                        {item}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <button onClick={onBack} style={{ ...backBtnStyle, marginTop: 16, marginBottom: 0 }}>{"\u2190"} Back</button>
    </div>
  );
}

export default function GuideTab({ navigate, subView, clinicGuides }: { navigate: (tab: string, sv?: Record<string, unknown> | null) => void; subView: Record<string, unknown> | null; clinicGuides?: ClinicGuideRecord[] }) {
  const [guideSearch, setGuideSearch] = useState("");

  if (subView?.type === "guideDetail") {
    return <GuideDetailView sectionId={subView.id as string} onBack={() => navigate("guide")} />;
  }

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>{text.slice(0, idx)}<span style={{ background: T.goldAlphaMd, fontWeight: 600 }}>{text.slice(idx, idx + query.length)}</span>{text.slice(idx + query.length)}</>
    );
  };

  const searchResults = guideSearch.trim() ? (() => {
    const q = guideSearch.trim().toLowerCase();
    interface SearchMatch { category: string; emoji: string; item: string; color: string }
    const results: { section: typeof GUIDE_SECTIONS[0]; matchingItems: SearchMatch[] }[] = [];
    GUIDE_SECTIONS.forEach(sec => {
      const data = GUIDE_DATA[sec.id];
      if (!data) return;
      const sectionMatch = sec.title.toLowerCase().includes(q) || sec.sub.toLowerCase().includes(q);
      const introMatch = data.intro?.toLowerCase().includes(q);
      const matchingItems: SearchMatch[] = [];
      (data.categories || []).forEach(cat => {
        const catTitleMatch = cat.title.toLowerCase().includes(q);
        (cat.items || []).forEach(item => {
          if (item.toLowerCase().includes(q) || catTitleMatch) {
            matchingItems.push({ category: cat.title, emoji: cat.emoji, item, color: cat.color });
          }
        });
      });
      if (sectionMatch || introMatch || matchingItems.length > 0) {
        results.push({ section: sec, matchingItems: matchingItems.slice(0, 5) });
      }
    });
    return results;
  })() : null;

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 18, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Clinical Guide</h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 12px", lineHeight: 1.4 }}>
        Practical tips for consults, rounding, notes, and presentations
      </p>

      {/* Friday Clinic Guide */}
      {(() => {
        const friday = getCurrentOrNextFriday(new Date());
        const dateStr = friday.toISOString().split("T")[0];
        const record = (clinicGuides || []).find(g => g.date === dateStr);
        const topic = (record?.topic || getClinicTopicForDate(friday)) as ClinicGuideTopic;
        const template = CLINIC_GUIDES[topic];
        const dayLabel = new Date().getDay() === 5 ? "Today" : friday.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
        return template ? (
          <div style={{ marginBottom: 14 }}>
            <button onClick={() => navigate("guide", { type: "clinicGuide", date: dateStr })}
              style={{ display: "flex", width: "100%", alignItems: "center", gap: 14, padding: 14,
                background: `linear-gradient(135deg, ${T.greenBg} 0%, ${T.blueBg} 100%)`, borderRadius: 14,
                border: `1.5px solid ${T.green}`, cursor: "pointer", textAlign: "left",
                boxShadow: "0 2px 8px rgba(26,188,156,0.15)" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: T.greenBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, border: `1px solid ${T.greenAlpha}` }}>
                {template.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Friday Clinic Guide</div>
                <div style={{ fontSize: 12, color: T.greenDk, marginTop: 2 }}>{dayLabel}: {topic} Clinic</div>
              </div>
              <span style={{ color: T.greenDk, fontSize: 16, flexShrink: 0 }}>{"\u203A"}</span>
            </button>
            <button onClick={() => navigate("guide", { type: "clinicGuideHistory" })}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 0 0", fontSize: 12, color: T.med, fontWeight: 600 }}>
              View past clinic guides
            </button>
          </div>
        ) : null;
      })()}

      {/* Inpatient Consult Guides */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, marginBottom: 8, fontFamily: T.serif }}>Inpatient Consult Guides</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {INPATIENT_GUIDE_TOPICS.map(t => {
            const g = INPATIENT_GUIDES[t];
            return (
              <button key={t} onClick={() => navigate("guide", { type: "inpatientGuide", topic: t })}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px",
                  background: T.card, borderRadius: 12, border: `1px solid ${T.line}`,
                  cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{g.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: T.navy, fontSize: 13, lineHeight: 1.2 }}>{t}</div>
                  <div style={{ fontSize: 10, color: T.sub, marginTop: 2, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rotation Guides */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, marginBottom: 8, fontFamily: T.serif }}>Rotation Guides</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {ROTATION_GUIDE_IDS.map(id => {
            const g = ROTATION_GUIDES[id];
            return (
              <button key={id} onClick={() => navigate("guide", { type: "rotationGuide", guideId: id })}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px",
                  background: T.card, borderRadius: 12, border: `1px solid ${T.line}`,
                  cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{g.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: T.navy, fontSize: 13, lineHeight: 1.2 }}>{g.title}</div>
                  <div style={{ fontSize: 10, color: T.sub, marginTop: 2, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trial Library Button */}
      <button onClick={() => navigate("guide", { type: "trialLibrary" })}
        style={{ display: "flex", width: "100%", alignItems: "center", gap: 14, padding: 14,
          background: `linear-gradient(135deg, ${T.warmBg} 0%, ${T.yellowBg} 100%)`, borderRadius: 14,
          border: `1.5px solid ${T.gold}`, cursor: "pointer", textAlign: "left", marginBottom: 14,
          boxShadow: "0 2px 8px rgba(241,196,15,0.15)" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: T.yellowBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, border: `1px solid ${T.goldAlphaMd}` }}>
          📚
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Landmark Trial Library</div>
          <div style={{ fontSize: 12, color: T.goldText, marginTop: 2 }}>Browse all {ALL_LANDMARK_TRIALS.length} landmark nephrology trials by category</div>
        </div>
        <span style={{ color: T.goldText, fontSize: 16, flexShrink: 0 }}>›</span>
      </button>

      <input type="text" placeholder="Search guides... (e.g. creatinine, consult, biopsy)"
        value={guideSearch} onChange={e => setGuideSearch(e.target.value)}
        style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${T.line}`, borderRadius: 10, fontSize: 14, boxSizing: "border-box", marginBottom: 14, fontFamily: T.sans, outline: "none" }} />

      {searchResults ? (
        searchResults.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 13 }}>No matches found for "{guideSearch}"</div>
        ) : searchResults.map(r => (
          <div key={r.section.id} style={{ marginBottom: 12 }}>
            <button onClick={() => { setGuideSearch(""); navigate("guide", { type: "guideDetail", id: r.section.id }); }}
              style={{ display: "block", width: "100%", background: T.card, borderRadius: 12, padding: 14, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: r.matchingItems.length > 0 ? 8 : 0 }}>
                <span style={{ fontSize: 20 }}>{r.section.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{highlightMatch(r.section.title, guideSearch)}</div>
                  <div style={{ fontSize: 11, color: T.sub }}>{r.section.sub}</div>
                </div>
              </div>
              {r.matchingItems.map((mi, i) => (
                <div key={i} style={{ fontSize: 12, color: T.text, lineHeight: 1.5, padding: "4px 0 4px 30px", borderTop: i === 0 ? `1px solid ${T.line}` : "none" }}>
                  <span style={{ color: mi.color, marginRight: 6 }}>{mi.emoji}</span>
                  {highlightMatch(mi.item, guideSearch)}
                </div>
              ))}
            </button>
          </div>
        ))
      ) : (
        GUIDE_SECTIONS.map(sec => (
          <button key={sec.id} onClick={() => navigate("guide", { type: "guideDetail", id: sec.id })}
            style={{ display: "block", width: "100%", background: T.card, borderRadius: 14, padding: 16, marginBottom: 10,
              border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left", transition: "box-shadow 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                {sec.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>{sec.title}</div>
                <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{sec.sub}</div>
              </div>
              <span style={{ color: T.muted, fontSize: 16, flexShrink: 0 }}>›</span>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
