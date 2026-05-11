import { useState } from "react";
import { INPATIENT_GUIDES, INPATIENT_GUIDE_FOOTER, type InpatientGuideTopic } from "../../data/inpatientGuides";
import { InfoBar } from "./shared";
import { GuideAccordion, GuideBody, GuideFooter, GuideHeader, GuideItem, GuideList, GuideNumberedItem, GuideNumberedList, GuideShell } from "./GuideShell";

interface Props {
  topic: InpatientGuideTopic;
  onBack: () => void;
}

export default function InpatientGuideView({ topic, onBack }: Props) {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const guide = INPATIENT_GUIDES[topic];
  const toggle = (id: string) => setOpenSection(openSection === id ? null : id);

  if (!guide) {
    return (
      <GuideShell onBack={onBack}>
        <GuideBody><InfoBar tone="neutral">Guide not found.</InfoBar></GuideBody>
      </GuideShell>
    );
  }

  return (
    <GuideShell onBack={onBack}>
      <GuideHeader eyebrow="Inpatient" icon={guide.icon} title={guide.title} description={guide.subtitle} />
      <GuideBody>
        <InfoBar label="Why We Get Consulted" tone="brand">{guide.whyWeGetConsulted}</InfoBar>
        <InfoBar label="Teaching Pearl" tone="warning">{guide.teachingPearl}</InfoBar>
        <InfoBar label="Before Rounds: Gather This" tone="success">
          <GuideList>{guide.beforeRounds.map((item, i) => <GuideItem key={`${i}-${item}`} tone="success">{item}</GuideItem>)}</GuideList>
        </InfoBar>
        <GuideAccordion title="Top Differential Buckets" count={`${guide.topDifferentialBuckets.length} items`} tone="brand" open={openSection === "differential"} onToggle={() => toggle("differential")}>
          <GuideList>{guide.topDifferentialBuckets.map((item, i) => <GuideItem key={`${i}-${item}`}>{item}</GuideItem>)}</GuideList>
        </GuideAccordion>
        <GuideAccordion title="Red Flags / Call Urgently" count={`${guide.redFlags.length} items`} tone="danger" open={openSection === "redFlags"} onToggle={() => toggle("redFlags")}>
          <GuideList>{guide.redFlags.map((item, i) => <GuideItem key={`${i}-${item}`} tone="danger">{item}</GuideItem>)}</GuideList>
        </GuideAccordion>
        <GuideAccordion title="Common Mistakes" count={`${guide.commonMistakes.length} items`} tone="warning" open={openSection === "mistakes"} onToggle={() => toggle("mistakes")}>
          <GuideList>{guide.commonMistakes.map((item, i) => <GuideItem key={`${i}-${item}`} tone="warning">{item}</GuideItem>)}</GuideList>
        </GuideAccordion>
        <GuideNumberedList title="Assessment / Recommendations Framework">
          {guide.assessmentFramework.map((item, i) => <GuideNumberedItem key={`${i}-${item}`} index={i + 1}>{item}</GuideNumberedItem>)}
        </GuideNumberedList>
        <GuideFooter>{INPATIENT_GUIDE_FOOTER}</GuideFooter>
      </GuideBody>
    </GuideShell>
  );
}
