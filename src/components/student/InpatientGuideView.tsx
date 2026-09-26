import { useState } from "react";
import { T } from "../../data/constants";
import { INPATIENT_GUIDES, INPATIENT_GUIDE_FOOTER, type InpatientGuideTopic } from "../../data/inpatientGuides";
import { INPATIENT_SKILLS } from "../../data/inpatientSkills";
import { Button, InfoBar } from "./shared";
import { GuideAccordion, GuideBody, GuideExample, GuideFooter, GuideHeader, GuideItem, GuideList, GuideNumberedItem, GuideNumberedList, GuideShell } from "./GuideShell";

interface Props {
  topic: InpatientGuideTopic;
  onBack: () => void;
  onOpenCalculator?: (refId: string) => void;
  onPractice?: (topic: InpatientGuideTopic) => void;
}

const itemCount = (items: string[]) => `${items.length} ${items.length === 1 ? "item" : "items"}`;

export default function InpatientGuideView({ topic, onBack, onOpenCalculator, onPractice }: Props) {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const guide = INPATIENT_GUIDES[topic];
  const skills = INPATIENT_SKILLS[topic];
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
        {onOpenCalculator && guide.relatedTools && guide.relatedTools.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {guide.relatedTools.map(tool => (
              <Button key={tool.refId} variant="outline" size="sm" onClick={() => onOpenCalculator(tool.refId)}>Open {tool.label} →</Button>
            ))}
          </div>
        )}
        <InfoBar label="Before Rounds: Gather From the Chart" tone="success">
          <GuideList>{guide.beforeRounds.map((item, i) => <GuideItem key={`${i}-${item}`} tone="success">{item}</GuideItem>)}</GuideList>
        </InfoBar>
        {skills && (
          <>
            <GuideAccordion title="Questions to Ask the Patient" count={itemCount(skills.historyQuestions)} tone="info" open={openSection === "history"} onToggle={() => toggle("history")}>
              <GuideList>{skills.historyQuestions.map((item, i) => <GuideItem key={`${i}-${item}`} tone="info">{item}</GuideItem>)}</GuideList>
            </GuideAccordion>
            <GuideAccordion title="Exam: What to Look For" count={itemCount(skills.examFindings)} tone="info" open={openSection === "exam"} onToggle={() => toggle("exam")}>
              <GuideList>{skills.examFindings.map((item, i) => <GuideItem key={`${i}-${item}`} tone="info">{item}</GuideItem>)}</GuideList>
            </GuideAccordion>
            <GuideAccordion title="Imaging & Key Tests" count={itemCount(skills.imaging)} tone="info" open={openSection === "imaging"} onToggle={() => toggle("imaging")}>
              <GuideList>{skills.imaging.map((item, i) => <GuideItem key={`${i}-${item}`} tone="info">{item}</GuideItem>)}</GuideList>
            </GuideAccordion>
          </>
        )}
        <GuideAccordion title="Top Differential Buckets" count={itemCount(guide.topDifferentialBuckets)} tone="brand" open={openSection === "differential"} onToggle={() => toggle("differential")}>
          <GuideList>{guide.topDifferentialBuckets.map((item, i) => <GuideItem key={`${i}-${item}`}>{item}</GuideItem>)}</GuideList>
        </GuideAccordion>
        <GuideAccordion title="Red Flags / Call Urgently" count={itemCount(guide.redFlags)} tone="danger" open={openSection === "redFlags"} onToggle={() => toggle("redFlags")}>
          <GuideList>{guide.redFlags.map((item, i) => <GuideItem key={`${i}-${item}`} tone="danger">{item}</GuideItem>)}</GuideList>
        </GuideAccordion>
        <GuideAccordion title="Common Mistakes" count={itemCount(guide.commonMistakes)} tone="warning" open={openSection === "mistakes"} onToggle={() => toggle("mistakes")}>
          <GuideList>{guide.commonMistakes.map((item, i) => <GuideItem key={`${i}-${item}`} tone="warning">{item}</GuideItem>)}</GuideList>
        </GuideAccordion>
        {guide.lessons?.map((lesson) => {
          const id = `lesson:${lesson.heading}`;
          return (
            <GuideAccordion key={id} title={lesson.heading} count={lesson.format === "example" ? "Worked example" : itemCount(lesson.items)} tone="brand" open={openSection === id} onToggle={() => toggle(id)}>
              {lesson.format === "example"
                ? <GuideExample lines={lesson.items} label={lesson.heading} />
                : <GuideList>{lesson.items.map((item, i) => <GuideItem key={`${i}-${item}`}>{item}</GuideItem>)}</GuideList>}
            </GuideAccordion>
          );
        })}
        <GuideAccordion title="Presenting This Consult" count="30-second and full versions" tone="brand" open={openSection === "presenting"} onToggle={() => toggle("presenting")}>
          <GuideList>
            <GuideItem template>{guide.thirtySecondSummary}</GuideItem>
            <GuideItem template>{guide.howToPresent}</GuideItem>
          </GuideList>
        </GuideAccordion>
        <GuideNumberedList title="Assessment / Recommendations Framework">
          {guide.assessmentFramework.map((item, i) => <GuideNumberedItem key={`${i}-${item}`} index={i + 1}>{item}</GuideNumberedItem>)}
        </GuideNumberedList>
        {skills && (
          <GuideAccordion title="Sample Written Assessment & Plan" count="Worked example (fictional patient)" tone="success" open={openSection === "sampleAP"} onToggle={() => toggle("sampleAP")}>
            <GuideExample lines={skills.sampleAssessmentPlan} label="Sample written assessment and plan" />
          </GuideAccordion>
        )}
        {skills && onPractice && (
          <InfoBar label="Practice" tone="info">
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.5 }}>Read a short case, write your own one-liner and assessment & plan, then compare it with the model answer.</div>
              <div><Button onClick={() => onPractice(topic)}>Practice this consult →</Button></div>
            </div>
          </InfoBar>
        )}
        <GuideFooter>{INPATIENT_GUIDE_FOOTER}</GuideFooter>
      </GuideBody>
    </GuideShell>
  );
}
