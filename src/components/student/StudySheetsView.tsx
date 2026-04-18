import { useState, CSSProperties } from "react";
import { T, WEEKLY, STUDY_SHEETS, ALL_LANDMARK_TRIALS } from "../../data/constants";
import { backBtnStyle } from "./shared";
import { getStudySheetHero, getStudySheetSectionImage } from "../../data/images";

const imgStyle: CSSProperties = { width: "100%", borderRadius: 10, marginTop: 10, marginBottom: 6, border: `1px solid ${T.line}` };
const captionStyle: CSSProperties = { fontSize: 11, color: T.sub, textAlign: "center", fontStyle: "italic", margin: "0 0 8px", lineHeight: 1.4 };

export default function StudySheetsView({ week, onBack, navigate, completedItems, bookmarks, onToggleBookmark, onToggleComplete }) {
  const sheets = STUDY_SHEETS[week] || [];
  const wk = WEEKLY[week];
  const [expanded, setExpanded] = useState<number | null>(null);
  const doneCount = sheets.filter(s => (completedItems?.studySheets || {})[s.id]).length;

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>{"\u2190"} Back</button>
      <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: "0 0 4px", fontWeight: 700 }}>
        Week {week}: Study Sheets
      </h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px" }}>
        {wk?.title} {"\u2014"} {doneCount}/{sheets.length} completed
      </p>

      {sheets.map((sheet, si) => {
        const isOpen = expanded === si;
        const isDone = (completedItems?.studySheets || {})[sheet.id];
        return (
          <div key={sheet.id} style={{ background: T.card, borderRadius: 12, marginBottom: 12, border: `1px solid ${isOpen ? T.purpleSoft : isDone ? T.greenAlpha : T.line}`, overflow: "hidden", transition: "border 0.2s" }}>
            {/* Sheet Header */}
            <button onClick={() => setExpanded(isOpen ? null : si)}
              style={{ width: "100%", padding: 16, background: isOpen ? T.purpleBg : isDone ? T.greenBg : T.card, border: "none", cursor: "pointer", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: isDone ? T.greenBg : T.purpleBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{isDone ? "\u2705" : sheet.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>{sheet.title}</div>
                  <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{sheet.subtitle}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onToggleBookmark(sheet.id); }} style={{ background: "none", border: "none", fontSize: 16, color: (bookmarks?.studySheets || []).includes(sheet.id) ? T.gold : T.muted, cursor: "pointer", flexShrink: 0, padding: "8px", margin: "-8px", lineHeight: 1 }}>{(bookmarks?.studySheets || []).includes(sheet.id) ? "\u2605" : "\u2606"}</button>
                <span style={{ color: T.muted, fontSize: 18, transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>{"\u203A"}</span>
              </div>
            </button>

            {/* Sheet Content */}
            {isOpen && (
              <div style={{ padding: "4px 16px 20px" }}>
                {/* Hero image */}
                {(() => { const hero = getStudySheetHero(sheet.id); return hero ? <img src={hero} alt={`${sheet.title} overview`} style={{ ...imgStyle, marginTop: 12 }} /> : null; })()}

                {sheet.sections.map((section, secIdx) => (
                  <div key={secIdx} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.purpleAccent, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 3, height: 12, background: T.purpleSoft, borderRadius: 2 }} />
                      {section.heading}
                    </div>
                    {/* Section image */}
                    {(() => { const img = getStudySheetSectionImage(sheet.id, section.heading); return img ? (<div><img src={img.src} alt={img.alt || section.heading} style={imgStyle} />{img.caption && <p style={captionStyle}>{img.caption}</p>}</div>) : null; })()}

                    <div style={{ background: T.grayBg, borderRadius: 10, padding: "12px 14px" }}>
                      {section.items.map((item, itemIdx) => (
                        <div key={itemIdx} style={{ fontSize: 13, color: T.text, lineHeight: 1.6, marginBottom: itemIdx < section.items.length - 1 ? 12 : 0, paddingLeft: 14, position: "relative" }}>
                          <span style={{ position: "absolute", left: 0, color: T.purpleSoft, fontWeight: 700 }}>{"\u2022"}</span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Trial Callouts */}
                {sheet.trialCallouts && sheet.trialCallouts.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 16, borderTop: `1px solid ${T.line}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.goldText, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>{"\u2B50"}</span> Trial Connections
                    </div>
                    {sheet.trialCallouts.map((callout, ci) => {
                      const trialExists = ALL_LANDMARK_TRIALS.some(t => t.name === callout.trial);
                      return (
                        <div key={ci}
                          onClick={trialExists && navigate ? () => navigate("library", { type: "trialLibrary", searchTrial: callout.trial }) : undefined}
                          role={trialExists ? "button" : undefined} tabIndex={trialExists ? 0 : undefined}
                          style={{ background: T.yellowBg, borderRadius: 10, padding: "10px 14px", marginBottom: 10, borderLeft: `3px solid ${T.gold}`, cursor: trialExists ? "pointer" : "default", transition: "box-shadow 0.2s" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: T.goldText, marginBottom: 4 }}>{callout.trial}</div>
                            {trialExists && <span style={{ fontSize: 11, color: T.goldText, fontWeight: 600 }}>View trial ›</span>}
                          </div>
                          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.55 }}>{callout.pearl}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Mark Complete Button */}
                <button onClick={() => onToggleComplete(sheet.id)}
                  style={{ width: "100%", padding: "10px 0", background: isDone ? T.green : T.ice, color: isDone ? "white" : T.med, border: `1.5px solid ${isDone ? T.green : T.med}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 }}>
                  {isDone ? "\u2713 Completed" : "Mark as Complete"}
                </button>
              </div>
            )}
          </div>
        );
      })}
      <button onClick={onBack} style={{ ...backBtnStyle, marginTop: 16, marginBottom: 0 }}>{"\u2190"} Back</button>
    </div>
  );
}
