import { useState } from "react";
import { T } from "../../data/constants";
import { INPATIENT_GUIDES, INPATIENT_GUIDE_FOOTER, type InpatientGuideTopic } from "../../data/inpatientGuides";
import { backBtnStyle } from "./shared";

interface Props {
  topic: InpatientGuideTopic;
  onBack: () => void;
}

const bulletList = (items: string[], color: string) =>
  items.map((item, i) => (
    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
      <span style={{ color, fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>{"\u2022"}</span>
      <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, wordBreak: "break-word" }}>{item}</div>
    </div>
  ));

export default function InpatientGuideView({ topic, onBack }: Props) {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const guide = INPATIENT_GUIDES[topic];

  if (!guide) {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={onBack} style={backBtnStyle}>{"\u2190"} Back</button>
        <div style={{ color: T.sub, textAlign: "center", padding: 32 }}>Guide not found.</div>
      </div>
    );
  }

  const toggle = (key: string) => setOpenSection(openSection === key ? null : key);

  const accordion = (key: string, heading: string, items: string[], color: string) => {
    const isOpen = openSection === key;
    return (
      <div style={{ marginBottom: 10, background: T.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${isOpen ? color + "60" : T.line}`, transition: "border 0.2s" }}>
        <button onClick={() => toggle(key)}
          style={{ width: "100%", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{heading}</div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 1 }}>{items.length} items</div>
          </div>
          <span style={{ color: T.muted, fontSize: 14, transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>{"\u203A"}</span>
        </button>
        {isOpen && (
          <div style={{ padding: "0 16px 16px" }}>
            <div style={{ height: 1, background: T.line, marginBottom: 12 }} />
            {bulletList(items, color)}
          </div>
        )}
      </div>
    );
  };

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

      {/* Why we get consulted */}
      <div style={{ background: T.ice, borderRadius: 12, padding: 16, marginBottom: 14, borderLeft: `4px solid ${T.med}` }}>
        <div style={{ fontWeight: 700, color: T.navy, fontSize: 13, marginBottom: 4 }}>Why We Get Consulted</div>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{guide.whyWeGetConsulted}</div>
      </div>

      {/* Teaching pearl */}
      <div style={{ background: T.yellowBg, borderRadius: 12, padding: 16, marginBottom: 14, borderLeft: `4px solid ${T.gold}` }}>
        <div style={{ fontWeight: 700, color: T.goldText, fontSize: 13, marginBottom: 4 }}>Teaching Pearl</div>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{guide.teachingPearl}</div>
      </div>

      {/* Before rounds */}
      <div style={{ background: T.greenBg, borderRadius: 12, padding: 16, marginBottom: 14, borderLeft: `4px solid ${T.green}` }}>
        <div style={{ fontWeight: 700, color: T.greenDk, fontSize: 13, marginBottom: 8 }}>Before Rounds: Gather This</div>
        {bulletList(guide.beforeRounds, T.green)}
      </div>

      {/* 30-second summary */}
      <div style={{ background: T.card, borderRadius: 12, padding: 16, marginBottom: 10, border: `1px solid ${T.med}40` }}>
        <div style={{ fontWeight: 700, color: T.navy, fontSize: 13, marginBottom: 6 }}>The 30-Second Consult Summary</div>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.7, fontStyle: "italic" }}>{guide.thirtySecondSummary}</div>
      </div>

      {/* How to present */}
      <div style={{ background: T.card, borderRadius: 12, padding: 16, marginBottom: 14, border: `1px solid ${T.med}40` }}>
        <div style={{ fontWeight: 700, color: T.navy, fontSize: 13, marginBottom: 6 }}>How to Present This Consult</div>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.7, fontStyle: "italic" }}>{guide.howToPresent}</div>
      </div>

      {/* Accordion sections */}
      {accordion("differential", "Top Differential Buckets", guide.topDifferentialBuckets, T.med)}
      {accordion("redFlags", "Red Flags / Call Urgently", guide.redFlags, T.redDeep)}
      {accordion("mistakes", "Common Mistakes", guide.commonMistakes, T.orange)}

      {/* Assessment framework */}
      <div style={{ marginTop: 6, marginBottom: 14 }}>
        <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Assessment / Recommendations Framework</h3>
        {guide.assessmentFramework.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, background: T.card, borderRadius: 12, padding: "10px 14px", border: `1px solid ${T.line}` }}>
            <span style={{ color: T.med, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{i + 1}.</span>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}
      </div>

      {/* Discussion questions */}
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Discussion Questions</h3>
        {guide.discussionQuestions.map((q, i) => (
          <div key={i} style={{ background: T.purpleBg, borderRadius: 12, padding: "12px 14px", marginBottom: 8, borderLeft: `4px solid ${T.purple}` }}>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, fontStyle: "italic" }}>{q}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "12px 0 8px", fontSize: 13, color: T.muted, fontStyle: "italic", lineHeight: 1.4 }}>
        {INPATIENT_GUIDE_FOOTER}
      </div>

      <button onClick={onBack} style={{ ...backBtnStyle, marginTop: 8, marginBottom: 0 }}>{"\u2190"} Back</button>
    </div>
  );
}
