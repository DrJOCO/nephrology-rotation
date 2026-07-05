import React, { useEffect, useMemo, useState } from "react";
import { T, WEEKLY, STUDY_SHEETS } from "../../../data/constants";
import type { StudySheet } from "../../../types";
import { cloneStudySheet, normalizeStudySheet, normalizeStudySheets, type StudySheetsData } from "../../../utils/studySheets";
import { adminInput, adminLabel, type AdminConfirmOptions, type AdminToastTone } from "../shared";

const textAreaStyle: React.CSSProperties = {
  ...adminInput,
  minHeight: 74,
  resize: "vertical",
  lineHeight: 1.5,
};

function buttonStyle(tone: "primary" | "subtle" | "danger" = "subtle"): React.CSSProperties {
  const palette = tone === "primary"
    ? { bg: T.brand, color: T.brandInk, border: T.brand }
    : tone === "danger"
      ? { bg: T.dangerBg, color: T.danger, border: T.danger }
      : { bg: T.card, color: T.ink, border: T.line };
  return {
    padding: "9px 12px",
    background: palette.bg,
    color: palette.color,
    border: `1px solid ${palette.border}`,
    borderRadius: 9,
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  };
}

export function StudySheetsEditor({
  studySheets,
  setStudySheets,
  onBack,
  showToast,
  requestConfirm,
}: {
  studySheets: StudySheetsData;
  setStudySheets: React.Dispatch<React.SetStateAction<StudySheetsData>>;
  onBack: () => void;
  showToast?: (message: string, tone?: AdminToastTone) => void;
  requestConfirm: (options: AdminConfirmOptions) => Promise<boolean>;
}) {
  const weeks = useMemo(() => Object.keys(studySheets).map(Number).sort((a, b) => a - b), [studySheets]);
  const [selectedWeek, setSelectedWeek] = useState(weeks[0] || 1);
  const [selectedSheetId, setSelectedSheetId] = useState((studySheets[selectedWeek] || [])[0]?.id || "");
  const sheets = studySheets[selectedWeek] || [];
  const selectedSheet = sheets.find((sheet) => sheet.id === selectedSheetId) || sheets[0];
  const [draft, setDraft] = useState<StudySheet>(() => cloneStudySheet(selectedSheet || (STUDY_SHEETS as StudySheetsData)[1][0]));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!weeks.includes(selectedWeek)) setSelectedWeek(weeks[0] || 1);
  }, [selectedWeek, weeks]);

  useEffect(() => {
    const weekSheets = studySheets[selectedWeek] || [];
    if (!weekSheets.some((sheet) => sheet.id === selectedSheetId)) {
      setSelectedSheetId(weekSheets[0]?.id || "");
    }
  }, [selectedSheetId, selectedWeek, studySheets]);

  useEffect(() => {
    if (!selectedSheet) return;
    setDraft(cloneStudySheet(selectedSheet));
    setDirty(false);
  }, [selectedSheet?.id, selectedWeek]);

  const updateDraft = (updater: (current: StudySheet) => StudySheet) => {
    setDraft((current) => updater(current));
    setDirty(true);
  };

  const saveDraft = () => {
    if (!selectedSheet) return;
    const normalized = normalizeStudySheet(draft, selectedSheet);
    setStudySheets((previous) => normalizeStudySheets({
      ...previous,
      [selectedWeek]: (previous[selectedWeek] || []).map((sheet) => sheet.id === normalized.id ? normalized : sheet),
    }));
    setDraft(cloneStudySheet(normalized));
    setDirty(false);
    showToast?.("Study sheet saved as a draft. Publish to students when ready.", "success");
  };

  const discardDraft = () => {
    if (!selectedSheet) return;
    setDraft(cloneStudySheet(selectedSheet));
    setDirty(false);
  };

  const resetSheetToDefault = () => {
    if (!selectedSheet) return;
    const defaultSheet = ((STUDY_SHEETS as StudySheetsData)[selectedWeek] || []).find((sheet) => sheet.id === selectedSheet.id);
    if (!defaultSheet) return;
    setDraft(cloneStudySheet(defaultSheet));
    setDirty(true);
  };

  const resetAllToDefault = async () => {
    const confirmed = await requestConfirm({
      title: "Reset all study sheets?",
      message: "This replaces ALL study sheets across all modules with the built-in defaults. This cannot be undone.",
      confirmLabel: "Reset All",
      tone: "danger",
    });
    if (!confirmed) return;
    setStudySheets(normalizeStudySheets());
    showToast?.("All study sheets reset to the source defaults. Publish to students when ready.", "info");
  };

  const selectSheet = (sheetId: string) => {
    if (dirty) {
      showToast?.("Save or discard the current sheet before switching.", "error");
      return;
    }
    setSelectedSheetId(sheetId);
  };

  const selectWeek = (week: number) => {
    if (dirty) {
      showToast?.("Save or discard the current sheet before switching modules.", "error");
      return;
    }
    setSelectedWeek(week);
  };

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.brand, fontSize: 14, fontWeight: 800, cursor: "pointer", marginBottom: 16 }}>{"<"} Back to Content</button>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h2 style={{ color: T.ink, fontSize: 22, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Study Sheets</h2>
          <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.5 }}>
            Edit the actual student-facing sheet text. IDs stay fixed so bookmarks and completion history still work.
          </div>
        </div>
        <button onClick={() => { void resetAllToDefault(); }} style={buttonStyle("danger")}>Reset All Defaults</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        <div style={{ display: "grid", gap: 12, alignSelf: "start" }}>
          <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 12 }}>
            <div style={{ ...adminLabel, marginBottom: 8 }}>Module</div>
            <div style={{ display: "grid", gap: 6 }}>
              {weeks.map((week) => (
                <button key={week} onClick={() => selectWeek(week)} style={{ ...buttonStyle(selectedWeek === week ? "primary" : "subtle"), textAlign: "left" }}>
                  Module {week}: {(WEEKLY[week] || {}).title || "Untitled"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 12 }}>
            <div style={{ ...adminLabel, marginBottom: 8 }}>Sheets</div>
            <div style={{ display: "grid", gap: 6 }}>
              {sheets.map((sheet) => (
                <button key={sheet.id} onClick={() => selectSheet(sheet.id)} style={{ ...buttonStyle(selectedSheet?.id === sheet.id ? "primary" : "subtle"), textAlign: "left" }}>
                  {sheet.icon} {sheet.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedSheet && (
          <div style={{ background: T.card, border: `1px solid ${dirty ? T.warning : T.line}`, borderRadius: 16, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
              <div>
                <div style={{ color: dirty ? T.warning : T.success, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  {dirty ? "Unsaved editor changes" : "Draft saved"}
                </div>
                <div style={{ color: T.muted, fontFamily: T.mono, fontSize: 12, marginTop: 2 }}>ID {selectedSheet.id}</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={discardDraft} disabled={!dirty} style={{ ...buttonStyle("subtle"), opacity: dirty ? 1 : 0.55, cursor: dirty ? "pointer" : "not-allowed" }}>Discard</button>
                <button onClick={resetSheetToDefault} style={buttonStyle("subtle")}>Use Default Text</button>
                <button onClick={saveDraft} disabled={!dirty} style={{ ...buttonStyle("primary"), opacity: dirty ? 1 : 0.65, cursor: dirty ? "pointer" : "not-allowed" }}>Save Draft</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "80px minmax(0, 1fr)", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={adminLabel}>Icon</label>
                <input value={draft.icon} onChange={(event) => updateDraft((current) => ({ ...current, icon: event.target.value }))} style={adminInput} />
              </div>
              <div>
                <label style={adminLabel}>Title</label>
                <input value={draft.title} onChange={(event) => updateDraft((current) => ({ ...current, title: event.target.value }))} style={adminInput} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={adminLabel}>Subtitle</label>
              <input value={draft.subtitle} onChange={(event) => updateDraft((current) => ({ ...current, subtitle: event.target.value }))} style={adminInput} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={adminLabel}>Topic chips</label>
              <input
                value={(draft.topics || []).join(", ")}
                onChange={(event) => updateDraft((current) => ({ ...current, topics: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))}
                placeholder="AKI, CKD, Hypertension"
                style={adminInput}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", margin: "18px 0 10px" }}>
              <h3 style={{ color: T.ink, fontSize: 16, fontFamily: T.serif, margin: 0 }}>Sections</h3>
              <button onClick={() => updateDraft((current) => ({ ...current, sections: [...current.sections, { heading: "New Section", items: ["Add teaching point"] }] }))} style={buttonStyle("subtle")}>
                Add Section
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {draft.sections.map((section, sectionIndex) => (
                <div key={`${section.heading}-${sectionIndex}`} style={{ background: T.bg, border: `1px solid ${T.line}`, borderRadius: 12, padding: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "start", marginBottom: 10 }}>
                    <div>
                      <label style={adminLabel}>Section Heading</label>
                      <input
                        value={section.heading}
                        onChange={(event) => updateDraft((current) => ({
                          ...current,
                          sections: current.sections.map((item, index) => index === sectionIndex ? { ...item, heading: event.target.value } : item),
                        }))}
                        style={adminInput}
                      />
                    </div>
                    <button
                      onClick={() => updateDraft((current) => ({ ...current, sections: current.sections.filter((_, index) => index !== sectionIndex) }))}
                      style={{ ...buttonStyle("danger"), marginTop: 23 }}
                    >
                      Remove
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {section.items.map((item, itemIndex) => (
                      <div key={`${sectionIndex}-${itemIndex}`} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "start" }}>
                        <textarea
                          value={item}
                          onChange={(event) => updateDraft((current) => ({
                            ...current,
                            sections: current.sections.map((sectionItem, index) => index === sectionIndex
                              ? { ...sectionItem, items: sectionItem.items.map((point, pointIndex) => pointIndex === itemIndex ? event.target.value : point) }
                              : sectionItem),
                          }))}
                          style={textAreaStyle}
                        />
                        <button
                          onClick={() => updateDraft((current) => ({
                            ...current,
                            sections: current.sections.map((sectionItem, index) => index === sectionIndex
                              ? { ...sectionItem, items: sectionItem.items.filter((_, pointIndex) => pointIndex !== itemIndex) }
                              : sectionItem),
                          }))}
                          style={buttonStyle("danger")}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => updateDraft((current) => ({
                        ...current,
                        sections: current.sections.map((sectionItem, index) => index === sectionIndex
                          ? { ...sectionItem, items: [...sectionItem.items, "Add teaching point"] }
                          : sectionItem),
                      }))}
                      style={buttonStyle("subtle")}
                    >
                      Add Teaching Point
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", margin: "20px 0 10px" }}>
              <h3 style={{ color: T.ink, fontSize: 16, fontFamily: T.serif, margin: 0 }}>Trial Connections</h3>
              <button onClick={() => updateDraft((current) => ({ ...current, trialCallouts: [...(current.trialCallouts || []), { trial: "", pearl: "" }] }))} style={buttonStyle("subtle")}>
                Add Trial
              </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {(draft.trialCallouts || []).map((callout, calloutIndex) => (
                <div key={calloutIndex} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, alignItems: "start" }}>
                  <input
                    value={callout.trial}
                    onChange={(event) => updateDraft((current) => ({
                      ...current,
                      trialCallouts: (current.trialCallouts || []).map((item, index) => index === calloutIndex ? { ...item, trial: event.target.value } : item),
                    }))}
                    placeholder="Trial name"
                    style={adminInput}
                  />
                  <textarea
                    value={callout.pearl}
                    onChange={(event) => updateDraft((current) => ({
                      ...current,
                      trialCallouts: (current.trialCallouts || []).map((item, index) => index === calloutIndex ? { ...item, pearl: event.target.value } : item),
                    }))}
                    placeholder="Teaching pearl"
                    style={textAreaStyle}
                  />
                  <button onClick={() => updateDraft((current) => ({ ...current, trialCallouts: (current.trialCallouts || []).filter((_, index) => index !== calloutIndex) }))} style={buttonStyle("danger")}>
                    Remove
                  </button>
                </div>
              ))}
              {(draft.trialCallouts || []).length === 0 && (
                <div style={{ color: T.muted, fontSize: 13, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 10, padding: 12 }}>
                  No trial callouts on this sheet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
