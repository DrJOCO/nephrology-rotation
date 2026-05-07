import { useState } from "react";
import { T } from "../../data/constants";
import { CLINIC_GUIDES, CLINIC_GUIDE_FOOTER, type ClinicGuideTemplates, type ClinicGuideTopic } from "../../data/clinicGuides";
import { BackButton, GuideShell, InfoBar } from "./shared";

interface Props {
  date: string;
  topic: string;
  isOverride?: boolean;
  clinicGuideTemplates: ClinicGuideTemplates;
  onBack: () => void;
}

function formatFriday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function BulletList({ items, color }: { items: string[]; color: string }) {
  return items.map((item, i) => (
    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
      <span style={{ color, fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>{"\u2022"}</span>
      <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, wordBreak: "break-word" }}>{item}</div>
    </div>
  ));
}

export default function ClinicGuideView({ date, topic, isOverride, clinicGuideTemplates, onBack }: Props) {
  const [openSection, setOpenSection] = useState(0);
  const guide = clinicGuideTemplates[topic as ClinicGuideTopic] || CLINIC_GUIDES[topic as ClinicGuideTopic];

  if (!guide) {
    return (
      <div style={{ padding: 16 }}>
        <BackButton onClick={onBack} />
        <div style={{ color: T.sub, textAlign: "center", padding: 32 }}>Guide not found for topic &quot;{topic}&quot;.</div>
      </div>
    );
  }

  return (
    <GuideShell
      title={guide.title}
      subtitle={guide.subtitle}
      icon={guide.icon}
      onBack={onBack}
      meta={(
        <>
          <span style={{ fontSize: 13, color: T.brand, fontWeight: 600 }}>{formatFriday(date)}</span>
          {isOverride && (
            <span style={{ fontSize: 13, fontWeight: 700, color: T.warning, background: T.warningBg, borderRadius: 6, padding: "2px 6px", textTransform: "uppercase" }}>Override</span>
          )}
        </>
      )}
      sections={guide.sections.map((section, si) => ({
        id: si,
        heading: section.heading,
        items: section.items,
      }))}
      openSection={openSection}
      onToggleSection={(sectionId) => setOpenSection(openSection === sectionId ? -1 : Number(sectionId))}
      afterSections={(
        <InfoBar label="Common Mistakes" tone="danger" style={{ marginTop: 6, marginBottom: 14 }}>
          <BulletList items={guide.commonMistakes} color={T.danger} />
        </InfoBar>
      )}
      teachingPoints={guide.teachingPoints}
      discussionQuestions={guide.discussionQuestions}
      footer={(
        <>
          <InfoBar label="Guideline Basis" tone="neutral" style={{ marginBottom: 14 }}>
            <BulletList items={guide.guidelineBasis} color={T.muted} />
          </InfoBar>
          <div style={{ textAlign: "center", padding: "12px 0 8px", fontSize: 13, color: T.muted, fontStyle: "italic", lineHeight: 1.4 }}>
            {CLINIC_GUIDE_FOOTER}
          </div>
          <BackButton onClick={onBack} style={{ marginTop: 8, marginBottom: 0 }} />
        </>
      )}
    >
      <InfoBar label="Why This Matters" tone="brand" style={{ marginBottom: 14 }}>
        {guide.whyItMatters}
      </InfoBar>
      <InfoBar label="Teaching Pearl" tone="warning" style={{ marginBottom: 14 }}>
        {guide.teachingPearl}
      </InfoBar>
      <InfoBar label="Before Presenting, Gather This" tone="success" style={{ marginBottom: 14 }}>
        <BulletList items={guide.beforePresenting} color={T.success} />
      </InfoBar>
      <InfoBar label="How to Present This Patient" tone="neutral" style={{ marginBottom: 14 }}>
        <div style={{ color: T.text, lineHeight: 1.7, fontStyle: "italic" }}>{guide.howToPresent}</div>
      </InfoBar>
    </GuideShell>
  );
}
