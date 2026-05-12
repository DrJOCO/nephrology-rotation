import { useState } from "react";
import { CLINIC_GUIDES, CLINIC_GUIDE_FOOTER, type ClinicGuideTemplates, type ClinicGuideTopic } from "../../data/clinicGuides";
import { InfoBar } from "./shared";
import { GuideAccordion, GuideBody, GuideFooter, GuideHeader, GuideItem, GuideList, GuideMeta, GuideNumberedItem, GuideNumberedList, GuideShell } from "./GuideShell";

interface Props {
  date: string;
  topic: string;
  isOverride?: boolean;
  clinicGuideTemplates: ClinicGuideTemplates;
  onBack: () => void;
}

function formatFriday(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function displaySections(guide: ClinicGuideTemplates[ClinicGuideTopic]) {
  if (guide.beforePresenting.length === 0) return guide.sections;
  const [firstSection, ...rest] = guide.sections;
  if (!firstSection) return [{ heading: "Clinic Prep & Patient Questions", items: guide.beforePresenting }];

  return [
    {
      heading: "Clinic Prep & Patient Questions",
      items: [...guide.beforePresenting, ...firstSection.items],
    },
    ...rest,
  ];
}

export default function ClinicGuideView({ date, topic, isOverride, clinicGuideTemplates, onBack }: Props) {
  const [openSection, setOpenSection] = useState(0);
  const guide = clinicGuideTemplates[topic as ClinicGuideTopic] || CLINIC_GUIDES[topic as ClinicGuideTopic];

  if (!guide) {
    return (
      <GuideShell onBack={onBack}>
        <GuideBody><InfoBar tone="neutral">Guide not found for topic &quot;{topic}&quot;.</InfoBar></GuideBody>
      </GuideShell>
    );
  }

  return (
    <GuideShell onBack={onBack}>
      <GuideHeader eyebrow="Clinic" icon={guide.icon} title={guide.title} description={guide.subtitle} meta={<><GuideMeta>{formatFriday(date)}</GuideMeta>{isOverride && <GuideMeta tone="warning" emphasis="loud">Override</GuideMeta>}</>} />
      <GuideBody>
        <InfoBar label="Why This Matters" tone="brand">{guide.whyItMatters}</InfoBar>
        <InfoBar label="Teaching Pearl" tone="warning">{guide.teachingPearl}</InfoBar>
        {displaySections(guide).map((section, si) => (
          <GuideAccordion key={section.heading} title={section.heading} count={`${section.items.length} ${section.items.length === 1 ? "item" : "items"}`} open={openSection === si} onToggle={() => setOpenSection(openSection === si ? -1 : si)}>
            <GuideList>{section.items.map((item, i) => <GuideItem key={`${i}-${item}`}>{item}</GuideItem>)}</GuideList>
          </GuideAccordion>
        ))}
        <InfoBar label="Common Mistakes" tone="danger">
          <GuideList>{guide.commonMistakes.map((item, i) => <GuideItem key={`${i}-${item}`} tone="danger">{item}</GuideItem>)}</GuideList>
        </InfoBar>
        <GuideNumberedList title="Teaching Points">{guide.teachingPoints.map((item, i) => <GuideNumberedItem key={`${i}-${item}`} index={i + 1}>{item}</GuideNumberedItem>)}</GuideNumberedList>
        <InfoBar label="Guideline Basis" tone="neutral">
          <GuideList>{guide.guidelineBasis.map((item, i) => <GuideItem key={`${i}-${item}`} tone="neutral">{item}</GuideItem>)}</GuideList>
        </InfoBar>
        <GuideFooter>{CLINIC_GUIDE_FOOTER}</GuideFooter>
      </GuideBody>
    </GuideShell>
  );
}
