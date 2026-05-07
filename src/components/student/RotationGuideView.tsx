import { useState } from "react";
import { T } from "../../data/constants";
import { ROTATION_GUIDES, type RotationGuideId } from "../../data/rotationGuides";
import { backBtnStyle, EduDisclaimer, GuideShell, InfoBar } from "./shared";

interface Props {
  guideId: RotationGuideId;
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
    <GuideShell
      title={guide.title}
      subtitle={guide.subtitle}
      icon={guide.icon}
      onBack={onBack}
      sections={guide.sections.map((section, si) => ({
        id: si,
        heading: section.heading,
        items: section.items,
        renderItem: (item) => {
          const text = String(item);
          const isTemplate = text.startsWith("\"") && text.endsWith("\"");
          if (isTemplate) {
            return <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, wordBreak: "break-word", fontStyle: "italic", background: T.grayBg, borderRadius: 8, padding: "10px 12px", width: "100%" }}>{text}</div>;
          }
          return (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <span style={{ color: T.brand, fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>{"\u2022"}</span>
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, wordBreak: "break-word" }}>{text}</div>
            </div>
          );
        },
      }))}
      openSection={openSection}
      onToggleSection={(sectionId) => setOpenSection(openSection === sectionId ? -1 : Number(sectionId))}
      afterSections={(
        <InfoBar label="Common Mistakes" tone="danger" style={{ marginTop: 6, marginBottom: 14 }}>
          <BulletList items={guide.commonMistakes} color={T.danger} />
        </InfoBar>
      )}
      teachingPoints={guide.teachingPoints}
      footer={(
        <>
          <button onClick={onBack} style={{ ...backBtnStyle, marginTop: 8, marginBottom: 0 }}>{"\u2190"} Back</button>
          <EduDisclaimer />
        </>
      )}
    >
      <InfoBar label="Why This Matters" tone="brand" style={{ marginBottom: 14 }}>
        {guide.whyItMatters}
      </InfoBar>
      <InfoBar label="Teaching Pearl" tone="warning" style={{ marginBottom: 14 }}>
        {guide.teachingPearl}
      </InfoBar>
    </GuideShell>
  );
}
