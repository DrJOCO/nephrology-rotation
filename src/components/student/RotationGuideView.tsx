import { useState } from "react";
import { ROTATION_GUIDES, type RotationGuideId } from "../../data/rotationGuides";
import { InfoBar } from "./shared";
import { GuideAccordion, GuideBody, GuideHeader, GuideItem, GuideList, GuideNumberedItem, GuideNumberedList, GuideShell } from "./GuideShell";

interface Props {
  guideId: RotationGuideId;
  onBack: () => void;
}

const isTemplate = (item: string) => item.startsWith("\"") && item.endsWith("\"");

export default function RotationGuideView({ guideId, onBack }: Props) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => new Set());
  const guide = ROTATION_GUIDES[guideId];

  if (!guide) {
    return (
      <GuideShell onBack={onBack}>
        <GuideBody><InfoBar tone="neutral">Guide not found.</InfoBar></GuideBody>
      </GuideShell>
    );
  }

  return (
    <GuideShell onBack={onBack}>
      <GuideHeader eyebrow="Rotation" icon={guide.icon} title={guide.title} description={guide.subtitle} />
      <GuideBody>
        <InfoBar label="Why This Matters" tone="brand">{guide.whyItMatters}</InfoBar>
        <InfoBar label="Teaching Pearl" tone="warning">{guide.teachingPearl}</InfoBar>
        {guide.sections.map((section) => {
          const isOpen = !collapsedSections.has(section.heading);
          return (
            <GuideAccordion
              key={section.heading}
              title={section.heading}
              count={`${section.items.length} ${section.items.length === 1 ? "item" : "items"}`}
              open={isOpen}
              onToggle={() => setCollapsedSections((prev) => {
                const next = new Set(prev);
                if (next.has(section.heading)) next.delete(section.heading);
                else next.add(section.heading);
                return next;
              })}
            >
              <GuideList>
                {section.items.map((item, ii) => <GuideItem key={`${ii}-${item}`} template={isTemplate(item)}>{item}</GuideItem>)}
              </GuideList>
            </GuideAccordion>
          );
        })}
        <InfoBar label="Common Mistakes" tone="danger">
          <GuideList>{guide.commonMistakes.map((item, i) => <GuideItem key={`${i}-${item}`} tone="danger">{item}</GuideItem>)}</GuideList>
        </InfoBar>
        <GuideNumberedList title="Teaching Points">
          {guide.teachingPoints.map((item, i) => <GuideNumberedItem key={`${i}-${item}`} index={i + 1}>{item}</GuideNumberedItem>)}
        </GuideNumberedList>
      </GuideBody>
    </GuideShell>
  );
}
