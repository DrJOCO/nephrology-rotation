import React, { useEffect, useState } from "react";
import { T } from "../../../data/constants";
import { CLINIC_GUIDES, CLINIC_GUIDE_TOPICS, type ClinicGuideTemplate, type ClinicGuideTemplates, type ClinicGuideTopic } from "../../../data/clinicGuides";
import { getCurrentOrNextFriday, ensureCurrentClinicGuide, regenerateClinicGuide } from "../../../utils/clinicRotation";
import { normalizeClinicGuideTemplate, normalizeClinicGuideTemplates } from "../../../utils/clinicGuideTemplates";
import { adminInput, adminLabel, type AdminToastTone } from "../shared";
import type { ClinicGuideRecord } from "../../../types";

type GuideSectionDraft = {
  heading: string;
  items: string;
};

type GuideContentDraft = {
  icon: string;
  title: string;
  subtitle: string;
  whyItMatters: string;
  teachingPearl: string;
  beforePresenting: string;
  howToPresent: string;
  sections: GuideSectionDraft[];
  commonMistakes: string;
  teachingPoints: string;
  discussionQuestions: string;
  guidelineBasis: string;
};

type ListDraftField =
  | "beforePresenting"
  | "commonMistakes"
  | "teachingPoints"
  | "discussionQuestions"
  | "guidelineBasis";

function listToText(items: string[]): string {
  return items.join("\n");
}

function textToList(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function templateToDraft(template: ClinicGuideTemplate): GuideContentDraft {
  return {
    icon: template.icon,
    title: template.title,
    subtitle: template.subtitle,
    whyItMatters: template.whyItMatters,
    teachingPearl: template.teachingPearl,
    beforePresenting: listToText(template.beforePresenting),
    howToPresent: template.howToPresent,
    sections: template.sections.map((section) => ({ heading: section.heading, items: listToText(section.items) })),
    commonMistakes: listToText(template.commonMistakes),
    teachingPoints: listToText(template.teachingPoints),
    discussionQuestions: listToText(template.discussionQuestions),
    guidelineBasis: listToText(template.guidelineBasis),
  };
}

function draftToTemplate(topic: ClinicGuideTopic, draft: GuideContentDraft): ClinicGuideTemplate {
  return normalizeClinicGuideTemplate(topic, {
    icon: draft.icon,
    title: draft.title,
    subtitle: draft.subtitle,
    whyItMatters: draft.whyItMatters,
    teachingPearl: draft.teachingPearl,
    beforePresenting: textToList(draft.beforePresenting),
    howToPresent: draft.howToPresent,
    sections: draft.sections.map((section) => ({ heading: section.heading, items: textToList(section.items) })),
    commonMistakes: textToList(draft.commonMistakes),
    teachingPoints: textToList(draft.teachingPoints),
    discussionQuestions: textToList(draft.discussionQuestions),
    guidelineBasis: textToList(draft.guidelineBasis),
  });
}

function DraftTextArea({ label, value, rows = 4, hint, onChange }: { label: string; value: string; rows?: number; hint?: string; onChange: (value: string) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={adminLabel}>{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} style={{ ...adminInput, resize: "vertical", lineHeight: 1.45 }} />
      {hint && <div style={{ color: T.muted, fontSize: 12, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

export function ClinicGuidesEditor({
  clinicGuides,
  setClinicGuides,
  clinicGuideTemplates,
  setClinicGuideTemplates,
  onBack,
  showToast,
}: {
  clinicGuides: ClinicGuideRecord[];
  setClinicGuides: React.Dispatch<React.SetStateAction<ClinicGuideRecord[]>>;
  clinicGuideTemplates: ClinicGuideTemplates;
  setClinicGuideTemplates: React.Dispatch<React.SetStateAction<ClinicGuideTemplates>>;
  onBack: () => void;
  showToast?: (message: string, tone?: AdminToastTone) => void;
}) {
  const friday = getCurrentOrNextFriday(new Date());
  const dateStr = friday.toISOString().split("T")[0];
  const fridayLabel = friday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const [selectedTopic, setSelectedTopic] = useState<ClinicGuideTopic>("CKD");
  const selectedTemplate = clinicGuideTemplates[selectedTopic] || CLINIC_GUIDES[selectedTopic];
  const savedDraft = templateToDraft(selectedTemplate);
  const [draft, setDraft] = useState<GuideContentDraft>(() => savedDraft);
  const hasUnsavedChanges = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  const topicOrder = new Map<ClinicGuideTopic, number>(CLINIC_GUIDE_TOPICS.map((topic, index) => [topic, index]));
  const currentRecords = CLINIC_GUIDE_TOPICS.map((topic) => ({
    topic,
    template: clinicGuideTemplates[topic] || CLINIC_GUIDES[topic],
    record: clinicGuides.find(g => g.date === dateStr && g.topic === topic),
  }));
  const missingTopics = currentRecords.filter((item) => !item.record).map((item) => item.topic);
  const currentComplete = missingTopics.length === 0;
  const sorted = [...clinicGuides].sort((a, b) =>
    b.date.localeCompare(a.date) ||
    (topicOrder.get(a.topic as ClinicGuideTopic) ?? 99) - (topicOrder.get(b.topic as ClinicGuideTopic) ?? 99)
  );

  useEffect(() => {
    setDraft(templateToDraft(selectedTemplate));
  }, [selectedTemplate, selectedTopic]);

  const updateDraft = (patch: Partial<GuideContentDraft>) => {
    setDraft(prev => ({ ...prev, ...patch }));
  };

  const updateListDraft = (field: ListDraftField, value: string) => {
    updateDraft({ [field]: value });
  };

  const updateSection = (index: number, patch: Partial<GuideSectionDraft>) => {
    setDraft(prev => ({
      ...prev,
      sections: prev.sections.map((section, sectionIndex) => sectionIndex === index ? { ...section, ...patch } : section),
    }));
  };

  const addSection = () => {
    setDraft(prev => ({
      ...prev,
      sections: [...prev.sections, { heading: "New Section", items: "" }],
    }));
  };

  const removeSection = (index: number) => {
    setDraft(prev => ({
      ...prev,
      sections: prev.sections.filter((_, sectionIndex) => sectionIndex !== index),
    }));
  };

  const saveTemplate = () => {
    const template = draftToTemplate(selectedTopic, draft);
    const nextTemplates = normalizeClinicGuideTemplates({ ...clinicGuideTemplates, [selectedTopic]: template });
    setClinicGuideTemplates(nextTemplates);
    setDraft(templateToDraft(template));
    showToast?.(`${selectedTopic} guide saved as a draft. Publish to students when ready.`, "success");
  };

  const loadDefaultTemplate = () => {
    setDraft(templateToDraft(CLINIC_GUIDES[selectedTopic]));
  };

  const discardChanges = () => {
    setDraft(templateToDraft(selectedTemplate));
  };

  const handleEnsure = () => {
    const { guides, newGuides } = ensureCurrentClinicGuide(clinicGuides);
    if (newGuides.length === 0) return;
    setClinicGuides(guides);
    showToast?.("Friday records saved as a draft. Publish to students when ready.", "success");
  };

  const handleRegenerate = () => {
    const updated = regenerateClinicGuide(clinicGuides, dateStr);
    setClinicGuides(updated);
    showToast?.("Friday records reset as a draft. Publish to students when ready.", "success");
  };

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.brand, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>{"\u2190"} Back</button>

      <h2 style={{ color: T.navy, fontSize: 20, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Clinic Guides</h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px", lineHeight: 1.4 }}>
        Edit the CKD, Hypertension, and Transplant guide content students read, then manage dated records for the current guide set.
      </p>

      {/* Guide content editor */}
      <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <h3 style={{ color: T.navy, fontSize: 16, margin: 0, fontFamily: T.serif, fontWeight: 700 }}>Edit Guide Content</h3>
            <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.5, marginTop: 3 }}>Changes here update the student-facing guide body, not just the Friday schedule.</div>
          </div>
          {hasUnsavedChanges && <span style={{ color: T.warning, background: T.warningBg, borderRadius: 8, padding: "3px 8px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>Unsaved</span>}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {CLINIC_GUIDE_TOPICS.map((topic) => {
            const active = selectedTopic === topic;
            const disabled = hasUnsavedChanges && !active;
            return (
              <button
                key={topic}
                onClick={() => setSelectedTopic(topic)}
                disabled={disabled}
                style={{
                  padding: "8px 12px",
                  background: active ? T.brand : T.bg,
                  color: active ? "white" : T.text,
                  border: `1px solid ${active ? T.brand : T.line}`,
                  borderRadius: 9,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.55 : 1,
                }}
              >
                {clinicGuideTemplates[topic]?.icon || CLINIC_GUIDES[topic].icon} {topic}
              </button>
            );
          })}
        </div>
        {hasUnsavedChanges && <div style={{ color: T.warning, fontSize: 12, fontWeight: 600, marginTop: -8, marginBottom: 12 }}>Save or discard this guide before switching topics.</div>}

        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={adminLabel}>Icon</label>
            <input value={draft.icon} onChange={(event) => updateDraft({ icon: event.target.value })} style={{ ...adminInput, textAlign: "center", fontSize: 20 }} />
          </div>
          <div>
            <label style={adminLabel}>Guide Title</label>
            <input value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} style={adminInput} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={adminLabel}>Subtitle</label>
          <input value={draft.subtitle} onChange={(event) => updateDraft({ subtitle: event.target.value })} style={adminInput} />
        </div>

        <DraftTextArea label="Why This Matters" value={draft.whyItMatters} rows={4} onChange={(value) => updateDraft({ whyItMatters: value })} />
        <DraftTextArea label="Teaching Pearl" value={draft.teachingPearl} rows={3} onChange={(value) => updateDraft({ teachingPearl: value })} />
        <DraftTextArea label="Before Presenting, Gather This" value={draft.beforePresenting} rows={7} hint="One item per line." onChange={(value) => updateListDraft("beforePresenting", value)} />
        <DraftTextArea label="How to Present This Patient" value={draft.howToPresent} rows={4} onChange={(value) => updateDraft({ howToPresent: value })} />

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <label style={{ ...adminLabel, marginBottom: 0 }}>Main Sections</label>
            <button onClick={addSection} style={{ padding: "6px 10px", background: T.bg, color: T.brand, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Section</button>
          </div>
          {draft.sections.map((section, index) => (
            <div key={index} style={{ border: `1px solid ${T.line}`, borderRadius: 12, padding: 12, marginBottom: 8, background: T.bg }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <input value={section.heading} onChange={(event) => updateSection(index, { heading: event.target.value })} placeholder="Section heading" style={{ ...adminInput, flex: 1 }} />
                <button onClick={() => removeSection(index)} style={{ padding: "8px 10px", background: T.dangerBg, color: T.danger, border: `1px solid ${T.danger}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Remove</button>
              </div>
              <textarea value={section.items} onChange={(event) => updateSection(index, { items: event.target.value })} rows={5} placeholder="One item per line" style={{ ...adminInput, resize: "vertical", lineHeight: 1.45 }} />
            </div>
          ))}
          {draft.sections.length === 0 && <div style={{ color: T.muted, fontSize: 13, padding: "8px 0" }}>No main sections yet.</div>}
        </div>

        <DraftTextArea label="Common Mistakes" value={draft.commonMistakes} rows={5} hint="One item per line." onChange={(value) => updateListDraft("commonMistakes", value)} />
        <DraftTextArea label="Teaching Points" value={draft.teachingPoints} rows={5} hint="One item per line." onChange={(value) => updateListDraft("teachingPoints", value)} />
        <DraftTextArea label="Discussion Questions" value={draft.discussionQuestions} rows={5} hint="One question per line." onChange={(value) => updateListDraft("discussionQuestions", value)} />
        <DraftTextArea label="Guideline Basis" value={draft.guidelineBasis} rows={5} hint="One reference per line." onChange={(value) => updateListDraft("guidelineBasis", value)} />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={saveTemplate} style={{ padding: "10px 14px", background: T.brand, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Save Guide Content</button>
          <button onClick={discardChanges} disabled={!hasUnsavedChanges} style={{ padding: "10px 14px", background: T.bg, color: hasUnsavedChanges ? T.sub : T.muted, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: hasUnsavedChanges ? "pointer" : "not-allowed" }}>Discard Changes</button>
          <button onClick={loadDefaultTemplate} style={{ padding: "10px 14px", background: T.warningBg, color: T.warning, border: `1px solid ${T.warning}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Load Default Text</button>
        </div>
      </div>

      {/* Current / next Friday status */}
      <div style={{ background: T.successBg, borderRadius: 14, padding: 16, marginBottom: 16, border: `1px solid ${T.success}40` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.success, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 8 }}>This Friday's Guide Set</div>
        <div style={{ fontWeight: 700, color: T.navy, fontSize: 15, marginBottom: 4 }}>{fridayLabel}</div>
        <div style={{ color: currentComplete ? T.success : T.sub, fontSize: 13, marginBottom: 10 }}>
          {currentComplete ? "All three guide records are ready." : `Missing records: ${missingTopics.join(", ")}`}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          {currentRecords.map(({ topic, template, record }) => (
            <div key={topic} style={{ display: "flex", alignItems: "center", gap: 10, background: T.card, borderRadius: 12, border: `1px solid ${record ? T.success : T.line}`, padding: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: T.successBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                {template.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{topic}</div>
                <div style={{ fontSize: 13, color: record ? T.success : T.sub, marginTop: 2 }}>
                  {record ? "Ready for this Friday" : "Missing for this Friday"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {!currentComplete && (
          <button onClick={handleEnsure} style={{ padding: "8px 16px", background: T.brand, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Add Missing Records
          </button>
        )}
        {currentComplete && (
          <button onClick={handleRegenerate} style={{ padding: "8px 16px", background: T.card, color: T.brand, border: `1.5px solid ${T.brand}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Reset This Friday's Records
          </button>
        )}
      </div>

      {/* History */}
      <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Clinic Guide Records ({sorted.length})</h3>
      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: 20, color: T.muted, fontSize: 13 }}>No clinic guide records have been added yet.</div>
      ) : (
        sorted.map(g => {
          const t = clinicGuideTemplates[g.topic as ClinicGuideTopic] || CLINIC_GUIDES[g.topic as ClinicGuideTopic];
          return (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: T.card, borderRadius: 12, marginBottom: 8, border: `1px solid ${T.line}` }}>
              <span style={{ fontSize: 20 }}>{t?.icon || "📋"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: T.text, fontSize: 14 }}>{g.topic}</div>
                <div style={{ fontSize: 13, color: T.sub }}>{new Date(g.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div>
              </div>
              {g.isOverride && <span style={{ fontSize: 13, fontWeight: 700, color: T.warning, background: T.warningBg, borderRadius: 6, padding: "2px 6px" }}>Override</span>}
            </div>
          );
        })
      )}
    </div>
  );
}
