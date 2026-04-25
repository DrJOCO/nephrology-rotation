import { useState } from "react";
import { T } from "../../data/constants";
import { CLINIC_GUIDES, CLINIC_GUIDE_FOOTER, type ClinicGuideTopic } from "../../data/clinicGuides";
import { backBtnStyle } from "./shared";

interface Props {
  date: string;
  topic: string;
  isOverride?: boolean;
  onBack: () => void;
}

function formatFriday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

const bulletList = (items: string[], color: string) =>
  items.map((item, i) => (
    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
      <span style={{ color, fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>{"\u2022"}</span>
      <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, wordBreak: "break-word" }}>{item}</div>
    </div>
  ));

export default function ClinicGuideView({ date, topic, isOverride, onBack }: Props) {
  const [openSection, setOpenSection] = useState(0);
  const guide = CLINIC_GUIDES[topic as ClinicGuideTopic];

  if (!guide) {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={onBack} style={backBtnStyle}>{"\u2190"} Back</button>
        <div style={{ color: T.sub, textAlign: "center", padding: 32 }}>Guide not found for topic &quot;{topic}&quot;.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>{"\u2190"} Back</button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>
          {guide.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ color: T.navy, fontSize: 20, margin: 0, fontFamily: T.serif, fontWeight: 700, lineHeight: 1.2 }}>{guide.title}</h2>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{guide.subtitle}</div>
        </div>
      </div>

      {/* Date + override badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: T.med, fontWeight: 600 }}>{formatFriday(date)}</span>
        {isOverride && (
          <span style={{ fontSize: 13, fontWeight: 700, color: T.warning, background: T.warningBg, borderRadius: 6, padding: "2px 6px", textTransform: "uppercase" }}>Override</span>
        )}
      </div>

      {/* Why it matters */}
      <div style={{ background: T.ice, borderRadius: 12, padding: 16, marginBottom: 14, borderLeft: `4px solid ${T.med}` }}>
        <div style={{ fontWeight: 700, color: T.navy, fontSize: 13, marginBottom: 4 }}>Why This Matters</div>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{guide.whyItMatters}</div>
      </div>

      {/* Teaching pearl */}
      <div style={{ background: T.warningBg, borderRadius: 12, padding: 16, marginBottom: 14, borderLeft: `4px solid ${T.warning}` }}>
        <div style={{ fontWeight: 700, color: T.warning, fontSize: 13, marginBottom: 4 }}>Teaching Pearl</div>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{guide.teachingPearl}</div>
      </div>

      {/* Before presenting */}
      <div style={{ background: T.successBg, borderRadius: 12, padding: 16, marginBottom: 14, borderLeft: `4px solid ${T.success}` }}>
        <div style={{ fontWeight: 700, color: T.success, fontSize: 13, marginBottom: 8 }}>Before Presenting, Gather This</div>
        {bulletList(guide.beforePresenting, T.success)}
      </div>

      {/* How to present */}
      <div style={{ background: T.card, borderRadius: 12, padding: 16, marginBottom: 14, border: `1px solid ${T.med}40` }}>
        <div style={{ fontWeight: 700, color: T.navy, fontSize: 13, marginBottom: 6 }}>How to Present This Patient</div>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.7, fontStyle: "italic" }}>{guide.howToPresent}</div>
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
                <div style={{ fontSize: 13, color: T.muted, marginTop: 1 }}>{section.items.length} items</div>
              </div>
              <span style={{ color: T.muted, fontSize: 14, transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>{"\u203A"}</span>
            </button>

            {isOpen && (
              <div style={{ padding: "0 16px 16px" }}>
                <div style={{ height: 1, background: T.line, marginBottom: 12 }} />
                {section.items.map((item, ii) => (
                  <div key={ii} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                    <span style={{ color: T.med, fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>{"\u2022"}</span>
                    <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, wordBreak: "break-word" }}>{item}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Common mistakes */}
      <div style={{ background: T.dangerBg, borderRadius: 12, padding: 16, marginTop: 6, marginBottom: 14, borderLeft: `4px solid ${T.danger}` }}>
        <div style={{ fontWeight: 700, color: T.danger, fontSize: 13, marginBottom: 8 }}>Common Mistakes</div>
        {bulletList(guide.commonMistakes, T.danger)}
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

      {/* Guideline basis */}
      <div style={{ background: T.grayBg, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, color: T.sub, fontSize: 13, marginBottom: 6 }}>Guideline Basis</div>
        {guide.guidelineBasis.map((ref, i) => (
          <div key={i} style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>{"\u2022"} {ref}</div>
        ))}
      </div>

      {/* Footer disclaimer */}
      <div style={{ textAlign: "center", padding: "12px 0 8px", fontSize: 13, color: T.muted, fontStyle: "italic", lineHeight: 1.4 }}>
        {CLINIC_GUIDE_FOOTER}
      </div>

      <button onClick={onBack} style={{ ...backBtnStyle, marginTop: 8, marginBottom: 0 }}>{"\u2190"} Back</button>
    </div>
  );
}
