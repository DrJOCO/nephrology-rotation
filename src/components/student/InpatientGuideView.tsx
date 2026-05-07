import { useState } from "react";
import { T } from "../../data/constants";
import { INPATIENT_GUIDES, INPATIENT_GUIDE_FOOTER, type InpatientGuideTopic } from "../../data/inpatientGuides";
import { backBtnStyle, GuideShell, InfoBar } from "./shared";

interface Props {
  topic: InpatientGuideTopic;
  onBack: () => void;
}

function BulletList({ items, color }: { items: string[]; color: string }) {
  return items.map((item, i) => (
    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
      <span style={{ color, fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>{"\u2022"}</span>
      <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, wordBreak: "break-word" }}>{item}</div>
    </div>
  ));
}

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

  return (
    <GuideShell
      title={guide.title}
      subtitle={guide.subtitle}
      icon={guide.icon}
      onBack={onBack}
      sections={[
        { id: "differential", heading: "Top Differential Buckets", items: guide.topDifferentialBuckets, tone: "brand" },
        { id: "redFlags", heading: "Red Flags / Call Urgently", items: guide.redFlags, tone: "danger" },
        { id: "mistakes", heading: "Common Mistakes", items: guide.commonMistakes, tone: "warning" },
      ]}
      openSection={openSection}
      onToggleSection={(sectionId) => setOpenSection(openSection === sectionId ? null : String(sectionId))}
      teachingTitle="Assessment / Recommendations Framework"
      teachingPoints={guide.assessmentFramework}
      footer={(
        <>
          <div style={{ textAlign: "center", padding: "12px 0 8px", fontSize: 13, color: T.muted, fontStyle: "italic", lineHeight: 1.4 }}>
            {INPATIENT_GUIDE_FOOTER}
          </div>
          <button onClick={onBack} style={{ ...backBtnStyle, marginTop: 8, marginBottom: 0 }}>{"\u2190"} Back</button>
        </>
      )}
    >
      <InfoBar label="Why We Get Consulted" tone="brand" style={{ marginBottom: 14 }}>
        {guide.whyWeGetConsulted}
      </InfoBar>
      <InfoBar label="Teaching Pearl" tone="warning" style={{ marginBottom: 14 }}>
        {guide.teachingPearl}
      </InfoBar>
      <InfoBar label="Before Rounds: Gather This" tone="success" style={{ marginBottom: 14 }}>
        <BulletList items={guide.beforeRounds} color={T.success} />
      </InfoBar>
    </GuideShell>
  );
}
