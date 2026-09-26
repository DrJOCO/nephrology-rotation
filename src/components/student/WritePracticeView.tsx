import { useState } from "react";
import { T } from "../../data/constants";
import { INPATIENT_GUIDES, INPATIENT_GUIDE_TOPICS, type InpatientGuideTopic } from "../../data/inpatientGuides";
import { INPATIENT_SKILLS } from "../../data/inpatientSkills";
import { useIsMobile } from "../../utils/helpers";
import { Button, InfoBar } from "./shared";
import { GuideBody, GuideExample, GuideHeader, GuideShell } from "./GuideShell";

// "Write It, Then Compare": students read a fictional chart snapshot, write a
// one-liner and an assessment & plan, then compare with the model answer and
// self-check against a rubric. Nothing typed here is stored or sent anywhere —
// it lives only in component state and is gone when the student leaves.

export const WRITE_PRACTICE_RUBRIC = [
  "One-liner has age, key background, the problem, and the time course",
  "Named the problem with its severity or stage",
  "Gave the most likely cause with 2–3 supporting facts",
  "Said why at least one alternative is less likely",
  "Stated urgency (e.g., dialysis indicated — yes or no)",
  "Recommendations are numbered and specific (drug, dose, route, frequency)",
  "Named what to stop or avoid",
  "Included monitoring with timing",
  "Included an if/then contingency plan",
];

interface Props {
  topic?: InpatientGuideTopic;
  onBack: () => void;
  onSelectTopic: (topic: InpatientGuideTopic) => void;
  onOpenGuide: (topic: InpatientGuideTopic) => void;
  onPickAnother?: () => void;
}

const textareaStyle = {
  width: "100%",
  minHeight: 90,
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${T.line}`,
  background: T.card,
  color: T.ink,
  fontSize: 14,
  lineHeight: 1.5,
  fontFamily: T.sans,
  boxSizing: "border-box" as const,
  resize: "vertical" as const,
};

function TopicPicker({ onSelectTopic }: { onSelectTopic: (topic: InpatientGuideTopic) => void }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
      {INPATIENT_GUIDE_TOPICS.filter(t => INPATIENT_SKILLS[t]).map(t => {
        const guide = INPATIENT_GUIDES[t];
        return (
          <button key={t} type="button" onClick={() => onSelectTopic(t)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: T.card, borderRadius: 12, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{guide.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: T.ink, fontSize: 13, lineHeight: 1.3 }}>{guide.title}</div>
              <div style={{ fontSize: 13, color: T.sub, marginTop: 2, lineHeight: 1.4 }}>{INPATIENT_SKILLS[t].practiceSnapshot[0]?.replace(/^Consult question:\s*/, "")}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function PracticeCase({ topic, onOpenGuide, onPickAnother }: { topic: InpatientGuideTopic; onOpenGuide: (topic: InpatientGuideTopic) => void; onPickAnother: () => void }) {
  const isMobile = useIsMobile();
  const guide = INPATIENT_GUIDES[topic];
  const skills = INPATIENT_SKILLS[topic];
  const [oneLiner, setOneLiner] = useState("");
  const [plan, setPlan] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(() => new Set());

  const toggleCheck = (i: number) => setChecked(prev => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    return next;
  });

  return (
    <>
      <GuideHeader eyebrow="Write It, Then Compare" icon={guide.icon} title={guide.title} description="Read the case, write your own one-liner and assessment & plan, then compare." />
      <GuideBody>
        <InfoBar label="Private practice" tone="neutral">Use the fictional case only. Nothing you type here is saved or sent anywhere — it disappears when you leave this page.</InfoBar>
        <section>
          <h3 style={{ color: T.ink, fontSize: 15, margin: "0 0 8px", fontFamily: T.serif, fontWeight: 700 }}>1. The chart</h3>
          <GuideExample lines={skills.practiceSnapshot} label="Practice case" />
        </section>
        <section>
          <label htmlFor="practice-one-liner" style={{ display: "block", color: T.ink, fontSize: 15, margin: "0 0 8px", fontFamily: T.serif, fontWeight: 700 }}>2. Your one-liner</label>
          <textarea id="practice-one-liner" value={oneLiner} onChange={e => setOneLiner(e.target.value)} autoComplete="off"
            placeholder="Age + key background + the problem + the time course" style={{ ...textareaStyle, minHeight: 70 }} />
        </section>
        <section>
          <label htmlFor="practice-plan" style={{ display: "block", color: T.ink, fontSize: 15, margin: "0 0 8px", fontFamily: T.serif, fontWeight: 700 }}>3. Your assessment & plan</label>
          <textarea id="practice-plan" value={plan} onChange={e => setPlan(e.target.value)} autoComplete="off"
            placeholder={"Problem — most likely cause because __; less likely __ because __; severity/urgency.\n1. ...\n2. ..."} style={{ ...textareaStyle, minHeight: 180 }} />
        </section>
        {!revealed ? (
          <div><Button onClick={() => setRevealed(true)}>Compare with the model answer</Button></div>
        ) : (
          <>
            <section>
              <h3 style={{ color: T.ink, fontSize: 15, margin: "0 0 8px", fontFamily: T.serif, fontWeight: 700 }}>4. Compare</h3>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, alignItems: "start" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, fontFamily: T.mono, textTransform: "uppercase", marginBottom: 6 }}>Yours</div>
                  <div role="region" aria-label="Your answer" style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 8, padding: "12px 14px", fontSize: 13, color: T.ink, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {[oneLiner.trim(), plan.trim()].filter(Boolean).join("\n\n") || "You didn't write anything — try it before you look next time."}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, fontFamily: T.mono, textTransform: "uppercase", marginBottom: 6 }}>Model answer</div>
                  <GuideExample lines={skills.sampleAssessmentPlan} label="Model assessment and plan" />
                </div>
              </div>
            </section>
            <section aria-label="Self-check">
              <h3 style={{ color: T.ink, fontSize: 15, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>5. Self-check</h3>
              <div style={{ fontSize: 13, color: T.sub, marginBottom: 8 }}>Tick what your version did. {checked.size} of {WRITE_PRACTICE_RUBRIC.length}.</div>
              <div style={{ display: "grid", gap: 6 }}>
                {WRITE_PRACTICE_RUBRIC.map((item, i) => (
                  <label key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: T.ink, lineHeight: 1.45, cursor: "pointer" }}>
                    <input type="checkbox" checked={checked.has(i)} onChange={() => toggleCheck(i)} style={{ marginTop: 2 }} />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </section>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button variant="outline" onClick={() => onOpenGuide(topic)}>Review the {guide.title} guide</Button>
              <Button variant="outline" onClick={onPickAnother}>Try another case</Button>
            </div>
          </>
        )}
      </GuideBody>
    </>
  );
}

export default function WritePracticeView({ topic, onBack, onSelectTopic, onOpenGuide, onPickAnother }: Props) {
  const valid = topic && INPATIENT_SKILLS[topic] ? topic : undefined;
  return (
    <GuideShell onBack={onBack}>
      {valid ? (
        // key resets the student's text when switching cases
        <PracticeCase key={valid} topic={valid} onOpenGuide={onOpenGuide} onPickAnother={onPickAnother || onBack} />
      ) : (
        <>
          <GuideHeader eyebrow="Practice" icon="📝" title="Write It, Then Compare" description="Pick a consult. Read the chart, write your one-liner and assessment & plan, then compare with a model answer." />
          <GuideBody>
            <InfoBar label="How it works" tone="info">These are fictional cases. Writing it yourself first — even roughly — is what builds the skill. Nothing you type is saved.</InfoBar>
            <TopicPicker onSelectTopic={onSelectTopic} />
          </GuideBody>
        </>
      )}
    </GuideShell>
  );
}
