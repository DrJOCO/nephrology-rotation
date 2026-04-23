import { useState } from "react";
import { T } from "../../data/constants";
import { ROTATION_GUIDES, type RotationGuideId } from "../../data/rotationGuides";
import { backBtnStyle } from "./shared";

interface Props {
  guideId: RotationGuideId;
  onBack: () => void;
}

const bulletList = (items: string[], color: string) =>
  items.map((item, i) => (
    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
      <span style={{ color, fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>{"\u2022"}</span>
      <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, wordBreak: "break-word" }}>{item}</div>
    </div>
  ));

export default function RotationGuideView({ guideId, onBack }: Props) {
  const [openSection, setOpenSection] = useState(0);
  const guide = ROTATION_GUIDES[guideId];

  if (!guide) {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={onBack} style={backBtnStyle}>{"\u2190"} Back</button>
        <div style={{ color: T.sub, textAlign: "center", padding: 32 }}>Guide not found.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>{"\u2190"} Back</button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>
          {guide.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ color: T.navy, fontSize: 20, margin: 0, fontFamily: T.serif, fontWeight: 700, lineHeight: 1.2 }}>{guide.title}</h2>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{guide.subtitle}</div>
        </div>
      </div>

      {/* Why it matters */}
      <div style={{ background: T.ice, borderRadius: 12, padding: 16, marginBottom: 14, borderLeft: `4px solid ${T.med}` }}>
        <div style={{ fontWeight: 700, color: T.navy, fontSize: 13, marginBottom: 4 }}>Why This Matters</div>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{guide.whyItMatters}</div>
      </div>

      {/* Teaching pearl */}
      <div style={{ background: T.yellowBg, borderRadius: 12, padding: 16, marginBottom: 14, borderLeft: `4px solid ${T.gold}` }}>
        <div style={{ fontWeight: 700, color: T.goldText, fontSize: 13, marginBottom: 4 }}>Teaching Pearl</div>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{guide.teachingPearl}</div>
      </div>

      {/* Main sections — accordion */}
      {guide.sections.map((section, si) => {
        const isOpen = openSection === si;
        return (
          <div key={si} style={{ marginBottom: 10, background: T.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${isOpen ? T.med + "60" : T.line}`, transition: "border 0.2s" }}>
            <button onClick={() => setOpenSection(isOpen ? -1 : si)}
              style={{ width: "100%", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{section.heading}</div>
                <div style={{ fontSize: 13, color: T.muted, marginTop: 1 }}>{section.items.length} {section.items.length === 1 ? "item" : "items"}</div>
              </div>
              <span style={{ color: T.muted, fontSize: 14, transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>{"\u203A"}</span>
            </button>

            {isOpen && (
              <div style={{ padding: "0 16px 16px" }}>
                <div style={{ height: 1, background: T.line, marginBottom: 12 }} />
                {section.items.map((item, ii) => {
                  const isTemplate = item.startsWith("\"") && item.endsWith("\"");
                  return (
                    <div key={ii} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                      {!isTemplate && (
                        <span style={{ color: T.med, fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>{"\u2022"}</span>
                      )}
                      <div style={{
                        fontSize: 13,
                        color: T.text,
                        lineHeight: 1.5,
                        wordBreak: "break-word",
                        ...(isTemplate ? { fontStyle: "italic", background: T.grayBg, borderRadius: 8, padding: "10px 12px", width: "100%" } : {}),
                      }}>
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

      {/* Common mistakes */}
      <div style={{ background: T.redBg, borderRadius: 12, padding: 16, marginTop: 6, marginBottom: 14, borderLeft: `4px solid ${T.redDeep}` }}>
        <div style={{ fontWeight: 700, color: T.redDeep, fontSize: 13, marginBottom: 8 }}>Common Mistakes</div>
        {bulletList(guide.commonMistakes, T.redDeep)}
      </div>

      {/* Teaching points */}
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Teaching Points</h3>
        {guide.teachingPoints.map((pt, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, background: T.card, borderRadius: 12, padding: "12px 14px", border: `1px solid ${T.line}` }}>
            <span style={{ color: T.med, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{i + 1}.</span>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{pt}</div>
          </div>
        ))}
      </div>

      <button onClick={onBack} style={{ ...backBtnStyle, marginTop: 8, marginBottom: 0 }}>{"\u2190"} Back</button>
    </div>
  );
}
