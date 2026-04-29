import { useState, useEffect, CSSProperties } from "react";
import { Pencil, RotateCcw, Check, X, Plus, ChevronRight, Lightbulb } from "lucide-react";
import { T, TOPICS, TOPIC_RESOURCE_MAP, STUDY_SHEETS, COMMON_PATIENT_TOPICS, ADDITIONAL_PATIENT_TOPICS, TOPIC_KEYWORDS, labelChip } from "../../data/constants";
import { inputLabel, inputStyle, EduDisclaimer } from "./shared";
import { useIsMobile } from "../../utils/helpers";
import { getFollowUpState } from "../../utils/patient";
import { validatePatientForm, validateFollowUp, clampLength, LIMITS, PHI_WARNING } from "../../utils/validation";
import type { Patient, SubView } from "../../types";

const errorStyle: CSSProperties = { fontSize: 13, color: T.danger, marginTop: 3, fontWeight: 500 };
const charCountStyle = (current: number, max: number): CSSProperties => ({ fontSize: 13, color: current > max * 0.9 ? T.danger : T.muted, textAlign: "right", marginTop: 2 });
const inputErrorBorder = { borderColor: T.danger };

interface PatientForm {
  initials: string;
  room: string;
  dx: string;
  topics: string[];
  notes: string;
}

type ActivityLogger = (type: string, label: string, detail?: string) => void;

function getVisibleTopicOptions(selectedTopics: string[], expanded: boolean): string[] {
  if (expanded) return TOPICS;
  const selectedExtraTopics = ADDITIONAL_PATIENT_TOPICS.filter(topic => selectedTopics.includes(topic));
  return [...COMMON_PATIENT_TOPICS, ...selectedExtraTopics];
}

function getHiddenTopicCount(selectedTopics: string[], expanded: boolean): number {
  if (expanded) return 0;
  const selectedExtraTopics = ADDITIONAL_PATIENT_TOPICS.filter(topic => selectedTopics.includes(topic));
  return ADDITIONAL_PATIENT_TOPICS.length - selectedExtraTopics.length;
}

function suggestTopicsFromText(text: string, alreadySelected: string[]): string[] {
  const q = text.toLowerCase();
  if (q.trim().length < 2) return [];
  const matches: string[] = [];
  for (const { topic, keywords } of TOPIC_KEYWORDS) {
    if (alreadySelected.includes(topic)) continue;
    if (keywords.some(k => q.includes(k))) matches.push(topic);
  }
  return matches.slice(0, 5);
}

function summarizeTopics(topics: string[]): string {
  const cleanTopics = topics.filter(Boolean);
  if (cleanTopics.length === 0) return "No topics";
  if (cleanTopics.length <= 2) return cleanTopics.join(", ");
  return `${cleanTopics.slice(0, 2).join(", ")} +${cleanTopics.length - 2}`;
}

function buildPatientUpdateDetail(previous: Patient | undefined, next: PatientForm): string {
  if (!previous) return summarizeTopics(next.topics);

  const previousTopics = previous.topics || (previous.topic ? [previous.topic] : []);
  const topicsChanged = previousTopics.join("|") !== next.topics.join("|");
  const notesChanged = (previous.notes || "").trim() !== next.notes.trim();
  const diagnosisChanged = (previous.dx || "").trim() !== next.dx.trim();

  if (notesChanged && next.notes.trim() && !(previous.notes || "").trim()) return "Teaching note added";
  if (topicsChanged) return summarizeTopics(next.topics);
  if (diagnosisChanged) return "Diagnosis updated";
  if (notesChanged) return "Teaching note updated";
  return "Details updated";
}

function PatientCard({ p, onToggle, onRemove, dimmed, isEditing, editForm, onStartEdit, onCancelEdit, onSaveEdit, onEditChange, onEditToggleTopic, onAddFollowUp, onRemoveFollowUp }: { p: Patient; onToggle: () => void; onRemove: () => void; dimmed?: boolean; isEditing: boolean; editForm: PatientForm; onStartEdit: () => void; onCancelEdit: () => void; onSaveEdit: () => void; onEditChange: (form: PatientForm) => void; onEditToggleTopic: (topic: string) => void; onAddFollowUp: (patientId: string | number, note: string) => void; onRemoveFollowUp: (patientId: string | number, followUpId: number) => void }) {
  const isMobile = useIsMobile();
  const [followUpText, setFollowUpText] = useState("");
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [showAllEditTopics, setShowAllEditTopics] = useState(false);

  // Backwards compat: old patients have p.topic (string), new have p.topics (array)
  const topics = p.topics || (p.topic ? [p.topic] : []);
  const followUps = p.followUps || [];
  const followUpState = getFollowUpState(p);
  const visibleEditTopics = getVisibleTopicOptions(editForm.topics, showAllEditTopics);
  const hiddenEditTopicCount = getHiddenTopicCount(editForm.topics, showAllEditTopics);

  useEffect(() => {
    if (!isEditing) setShowAllEditTopics(false);
  }, [isEditing]);

  const handleAddFollowUp = () => {
    const { valid, error } = validateFollowUp(followUpText);
    if (!valid) { setFollowUpError(error); return; }
    onAddFollowUp(p.id, followUpText.trim());
    setFollowUpText("");
    setFollowUpError(null);
  };

  if (isEditing) {
    return (
      <div style={{ background: T.card, borderRadius: 10, padding: 12, marginBottom: 10, border: `2px solid ${T.brand}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.brand, marginBottom: 8 }}>Editing Inpatient</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={inputLabel}>Initials</label>
            <input value={editForm.initials} maxLength={LIMITS.INITIALS_MAX} onChange={e => onEditChange({...editForm, initials: clampLength(e.target.value, LIMITS.INITIALS_MAX)})} style={inputStyle} />
          </div>
          <div>
            <label style={inputLabel}>Room #</label>
            <input value={editForm.room} maxLength={LIMITS.ROOM_MAX} onChange={e => onEditChange({...editForm, room: clampLength(e.target.value, LIMITS.ROOM_MAX)})} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={inputLabel}>Diagnosis</label>
          <input value={editForm.dx} maxLength={LIMITS.DIAGNOSIS_MAX} onChange={e => onEditChange({...editForm, dx: clampLength(e.target.value, LIMITS.DIAGNOSIS_MAX)})} style={inputStyle} />
          {(() => {
            const suggested = suggestTopicsFromText(editForm.dx, editForm.topics);
            if (suggested.length === 0) return null;
            return (
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>Suggested:</span>
                {suggested.map(t => (
                  <button key={t} type="button" onClick={() => onEditToggleTopic(t)}
                    style={{ padding: "4px 10px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", background: T.brandBg, color: T.brand, border: `1px dashed ${T.brand}` }}>
                    + {t}
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={inputLabel}>Learning Tags (2+ if relevant)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {visibleEditTopics.map(t => {
              const sel = editForm.topics.includes(t);
              return (
                <button key={t} type="button" onClick={() => onEditToggleTopic(t)}
                  style={{ padding: isMobile ? "8px 14px" : "5px 10px", borderRadius: 20, fontSize: isMobile ? 12 : 11, fontWeight: sel ? 600 : 400, cursor: "pointer",
                    background: sel ? T.brand : T.card, color: sel ? T.brandInk : T.sub,
                    border: sel ? `1.5px solid ${T.brand}` : `1.5px solid ${T.line}` }}>
                  {sel ? "✓ " : ""}{t}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 6 }}>
            {editForm.topics.length < LIMITS.PATIENT_TOPICS_MIN
              ? `${editForm.topics.length}/${LIMITS.PATIENT_TOPICS_MIN} selected`
              : "Add more if clinically relevant."}
          </div>
          {(hiddenEditTopicCount > 0 || showAllEditTopics) && (
            <button
              type="button"
              onClick={() => setShowAllEditTopics(prev => !prev)}
              style={{ background: "none", border: "none", padding: "6px 0 0", color: T.brand, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              {showAllEditTopics ? "Show fewer topics" : `More topics (${hiddenEditTopicCount})`}
            </button>
          )}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={inputLabel}>Notes</label>
          <textarea value={editForm.notes} maxLength={LIMITS.NOTES_MAX} onChange={e => onEditChange({...editForm, notes: clampLength(e.target.value, LIMITS.NOTES_MAX)})} rows={2} style={{...inputStyle, resize: "vertical"}} />
          <div style={charCountStyle(editForm.notes.length, LIMITS.NOTES_MAX)}>{editForm.notes.length}/{LIMITS.NOTES_MAX}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onSaveEdit} style={{ flex: 1, padding: "10px 0", background: T.brand, color: T.brandInk, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save</button>
          <button onClick={onCancelEdit} style={{ flex: 1, padding: "10px 0", background: T.bg, color: T.sub, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  const accentBorder = followUpState === "stale" ? T.warning : followUpState === "active" ? T.line : null;

  return (
    <div style={{ background: T.card, borderRadius: 9, marginBottom: 8, overflow: "hidden",
      border: `1px solid ${T.line}`, ...(accentBorder ? { borderLeft: `3px solid ${accentBorder}` } : {}) }}>
      <div style={{ padding: isMobile ? "9px 10px 8px" : "10px 12px 8px" }}>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "flex-start", gap: isMobile ? 7 : 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, color: dimmed ? T.muted : T.navy, fontSize: 14 }}>{p.initials}</span>
              {p.room && <span style={{ fontSize: 12, color: T.sub, background: T.bg, padding: "1px 7px", borderRadius: 4 }}>Rm {p.room}</span>}
              <span style={{ fontSize: 12, color: T.muted }}>Added {new Date(p.date).toLocaleDateString()}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 3 }}>
              {topics.map(t => (
                <span key={t} style={{ ...labelChip, fontSize: 10.5, padding: "2px 6px", borderRadius: 5 }}>{t}</span>
              ))}
            </div>
            {p.dx && <div style={{ fontSize: 13, color: dimmed ? T.muted : T.text, marginBottom: 0, lineHeight: 1.35, wordBreak: "break-word" }}>{p.dx}</div>}
            {p.notes && (
              <div style={{ fontSize: 12, color: T.sub, fontStyle: "italic", marginTop: 3, wordBreak: "break-word", display: "flex", alignItems: "flex-start", gap: 4, lineHeight: 1.35 }}>
                <Lightbulb size={12} strokeWidth={1.75} color={T.warning} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{p.notes}</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: isMobile ? "flex-start" : "flex-end", flexShrink: 0 }}>
            {!dimmed && (
              <button
                onClick={onStartEdit}
                aria-label={`Edit inpatient ${p.initials || ""}`.trim()}
                style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 6, padding: "5px 8px", minHeight: 28, fontSize: 11, cursor: "pointer", color: T.brand, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <Pencil size={12} strokeWidth={1.75} aria-hidden="true" /> Edit
              </button>
            )}
            <button
              onClick={onToggle}
              aria-label={dimmed ? `Reactivate inpatient ${p.initials || ""}`.trim() : `Discharge inpatient ${p.initials || ""}`.trim()}
              style={{ background: "none", border: `1px solid ${dimmed ? T.success : T.muted}`, borderRadius: 6, padding: "5px 8px", minHeight: 28, fontSize: 11, cursor: "pointer", color: dimmed ? T.success : T.sub, display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              {dimmed ? <><RotateCcw size={12} strokeWidth={1.75} aria-hidden="true" /> Reactivate</> : <><Check size={12} strokeWidth={2} aria-hidden="true" /> Discharge</>}
            </button>
            <button
              onClick={onRemove}
              aria-label={`Remove inpatient ${p.initials || ""} — added in error`.trim()}
              title="Remove (added in error)"
              style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 6, minHeight: 28, padding: "5px 8px", fontSize: 11, cursor: "pointer", color: T.muted, display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <X size={12} strokeWidth={1.75} aria-hidden="true" /> Remove
            </button>
          </div>
        </div>
      </div>

      {/* Follow-ups section */}
      <div style={{ borderTop: `1px solid ${T.line}`, padding: "6px 10px" }}>
        {followUps.length > 0 && (
          <button
            onClick={() => setShowFollowUps(!showFollowUps)}
            aria-expanded={showFollowUps}
            aria-label={`${showFollowUps ? "Collapse" : "Expand"} follow-ups`}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: T.brand, fontWeight: 600, padding: "4px 0", marginBottom: 4, display: "flex", alignItems: "center", gap: 4, minHeight: 28 }}
          >
            <ChevronRight size={14} strokeWidth={2} aria-hidden="true" style={{ transform: showFollowUps ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s" }} />
            Follow-ups ({followUps.length})
          </button>
        )}
        {showFollowUps && followUps.map(f => (
          <div key={f.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "4px 0", marginLeft: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: T.muted }}>{new Date(f.date).toLocaleDateString()} {new Date(f.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              <div style={{ fontSize: 13, color: T.text, wordBreak: "break-word" }}>{f.note}</div>
            </div>
            <button
              onClick={() => onRemoveFollowUp(p.id, f.id)}
              aria-label="Remove follow-up"
              title="Remove follow-up"
              style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 6, minHeight: 32, minWidth: 32, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}
            >
              <X size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        ))}
        {!dimmed && (
          <div style={{ marginTop: followUps.length > 0 ? 6 : 0 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={followUpText} maxLength={LIMITS.FOLLOWUP_MAX}
                onChange={e => { setFollowUpText(clampLength(e.target.value, LIMITS.FOLLOWUP_MAX)); setFollowUpError(null); }}
                onKeyDown={e => { if (e.key === "Enter") handleAddFollowUp(); }}
                placeholder="Add follow-up note..."
                style={{
                  flex: 1,
                  padding: "6px 9px",
                  fontSize: 12,
                  border: `1px solid ${followUpError ? T.danger : T.line}`,
                  borderRadius: 6,
                  outline: "none",
                  fontFamily: T.sans,
                  background: T.surface2,
                  color: T.text,
                  boxSizing: "border-box",
                }} />
              <button
                onClick={handleAddFollowUp}
                aria-label="Add follow-up note"
                title="Add follow-up"
                disabled={!followUpText.trim()}
                style={{
                  padding: "6px 9px",
                  minHeight: 30,
                  minWidth: 34,
                  background: followUpText.trim() ? T.brand : T.surface2,
                  color: followUpText.trim() ? T.brandInk : T.muted,
                  border: `1px solid ${followUpText.trim() ? T.brand : T.line}`,
                  borderRadius: 6,
                  cursor: followUpText.trim() ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
              </button>
            </div>
            {followUpError && <div style={errorStyle}>{followUpError}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

interface TopicSuggestion {
  label: string;
  type: "studySheet" | "quiz";
  nav: [string, SubView];
}

export default function PatientTab({ patients, setPatients, navigate, onLogActivity, onRegisterLocalPatient }: { patients: Patient[]; setPatients: React.Dispatch<React.SetStateAction<Patient[]>>; navigate?: (tab: string, sv?: SubView) => void; onLogActivity?: ActivityLogger; onRegisterLocalPatient?: (id: string | number) => void }) {
  const isMobile = useIsMobile();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<PatientForm>({ initials: "", room: "", dx: "", topics: [], notes: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string | undefined>>({});
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState<PatientForm>({ initials: "", room: "", dx: "", topics: [], notes: "" });
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAllTopics, setShowAllTopics] = useState(false);

  const toggleTopic = (t: string) => {
    setForm(prev => {
      const isSelected = prev.topics.includes(t);
      return { ...prev, topics: isSelected ? prev.topics.filter(x => x !== t) : [...prev.topics, t] };
    });
    setFormErrors(prev => ({ ...prev, topics: undefined }));
  };

  const editToggleTopic = (t: string) => {
    setEditForm(prev => {
      const isSelected = prev.topics.includes(t);
      return { ...prev, topics: isSelected ? prev.topics.filter(x => x !== t) : [...prev.topics, t] };
    });
  };

  const addPatient = () => {
    const { valid, errors } = validatePatientForm(form);
    if (!valid) { setFormErrors(errors); return; }
    const sanitized = {
      initials: form.initials.trim(),
      room: form.room.trim(),
      dx: form.dx.trim(),
      topics: form.topics,
      notes: form.notes.trim(),
    };
    const newId = Date.now();
    onRegisterLocalPatient?.(newId);
    setPatients(prev => [{ ...sanitized, id: newId, date: new Date().toISOString(), status: "active", followUps: [] }, ...prev]);
    onLogActivity?.("patient", "Inpatient added", summarizeTopics(sanitized.topics));

    // Compute topic suggestions
    if (navigate) {
      const newSuggestions: TopicSuggestion[] = [];
      const seenSheets = new Set<string>();
      const seenWeeks = new Set<number>();
      for (const topic of form.topics) {
        const mapping = TOPIC_RESOURCE_MAP[topic];
        if (!mapping) continue;
        for (const sheetId of mapping.studySheets) {
          if (seenSheets.has(sheetId)) continue;
          seenSheets.add(sheetId);
          // Find the week and title for this sheet
          for (const [wk, sheets] of Object.entries(STUDY_SHEETS)) {
            const sheet = (sheets as { id: string; title: string }[]).find(s => s.id === sheetId);
            if (sheet) {
              newSuggestions.push({ label: sheet.title, type: "studySheet", nav: ["today", { type: "studySheets", week: Number(wk) }] });
              break;
            }
          }
        }
        for (const week of mapping.quizWeeks) {
          if (seenWeeks.has(week)) continue;
          seenWeeks.add(week);
          newSuggestions.push({ label: `Module ${week} Quiz`, type: "quiz", nav: ["today", { type: "weeklyQuiz", week }] });
        }
      }
      if (newSuggestions.length > 0) {
        setSuggestions(newSuggestions);
        setShowSuggestions(true);
      }
    }

    setForm({ initials: "", room: "", dx: "", topics: [], notes: "" });
    setFormErrors({});
    setShowAllTopics(false);
    setShowAdd(false);
  };

  const toggle = (id: string | number) => {
    const patient = patients.find(p => p.id === id);
    if (!patient) return;
    const nextStatus = patient.status === "active" ? "discharged" : "active";
    setPatients(prev => prev.map(p => p.id === id ? { ...p, status: nextStatus } : p));
    onLogActivity?.("patient", nextStatus === "discharged" ? "Inpatient discharged" : "Inpatient reactivated", summarizeTopics(patient.topics || (patient.topic ? [patient.topic] : [])));
  };
  const remove = (id: string | number) => {
    const patient = patients.find(p => p.id === id);
    setPatients(prev => prev.filter(p => p.id !== id));
    if (patient) {
      onLogActivity?.("patient", "Inpatient removed", summarizeTopics(patient.topics || (patient.topic ? [patient.topic] : [])));
    }
  };

  const startEdit = (patient: Patient) => {
    setEditingId(patient.id);
    setEditForm({
      initials: patient.initials || "",
      room: patient.room || "",
      dx: patient.dx || "",
      topics: patient.topics || (patient.topic ? [patient.topic] : []),
      notes: patient.notes || "",
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({ initials: "", room: "", dx: "", topics: [], notes: "" }); };

  const saveEdit = () => {
    const { valid, errors } = validatePatientForm(editForm);
    if (!valid) {
      alert(Object.values(errors)[0] || "Please fix the inpatient entry.");
      return;
    }
    const sanitized = {
      initials: editForm.initials.trim(),
      room: editForm.room.trim(),
      dx: editForm.dx.trim(),
      topics: editForm.topics,
      notes: editForm.notes.trim(),
    };
    const existing = patients.find(p => p.id === editingId);
    setPatients(prev => prev.map(p => p.id === editingId ? { ...p, ...sanitized } : p));
    onLogActivity?.("patient", "Inpatient updated", buildPatientUpdateDetail(existing, sanitized));
    cancelEdit();
  };

  const addFollowUp = (patientId: string | number, noteText: string) => {
    if (!noteText.trim()) return;
    const patient = patients.find(p => p.id === patientId);
    setPatients(prev => prev.map(p => p.id === patientId ? {
      ...p,
      followUps: [...(p.followUps || []), { id: Date.now(), date: new Date().toISOString(), note: noteText.trim() }]
    } : p));
    onLogActivity?.("follow_up", "Follow-up added", summarizeTopics(patient?.topics || (patient?.topic ? [patient.topic] : [])));
  };

  const removeFollowUp = (patientId: string | number, followUpId: number) => {
    const patient = patients.find(p => p.id === patientId);
    setPatients(prev => prev.map(p => p.id === patientId ? {
      ...p,
      followUps: (p.followUps || []).filter(f => f.id !== followUpId)
    } : p));
    onLogActivity?.("follow_up", "Follow-up removed", summarizeTopics(patient?.topics || (patient?.topic ? [patient.topic] : [])));
  };

  const active = patients.filter(p => p.status === "active");
  const discharged = patients.filter(p => p.status === "discharged");
  const visibleAddTopics = getVisibleTopicOptions(form.topics, showAllTopics);
  const hiddenAddTopicCount = getHiddenTopicCount(form.topics, showAllTopics);
  const showCompactPhiWarning = patients.length > 0 && !showAdd;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ color: T.text, fontSize: 16, margin: 0, fontFamily: T.serif, fontWeight: 700 }}>Inpatient Rounding List</h2>
        <button onClick={() => {
          if (showAdd) setShowAllTopics(false);
          setShowAdd(!showAdd);
        }}
          style={{ padding: "8px 16px", background: showAdd ? T.sub : T.brand, color: showAdd ? "white" : T.brandInk, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {showAdd ? "Cancel" : "+ Add Patient"}
        </button>
      </div>

      <div
        style={{
          background: T.warningBg,
          borderRadius: showCompactPhiWarning ? 999 : 12,
          padding: showCompactPhiWarning ? "7px 10px" : 12,
          marginBottom: showCompactPhiWarning ? 10 : 16,
          border: `1px solid ${T.warning}`,
          display: showCompactPhiWarning ? "flex" : "block",
          alignItems: showCompactPhiWarning ? "center" : undefined,
          gap: showCompactPhiWarning ? 8 : undefined,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: T.warning, marginBottom: showCompactPhiWarning ? 0 : 4, flexShrink: 0 }}>No PHI</div>
        <div style={{ fontSize: 13, color: T.sub, lineHeight: showCompactPhiWarning ? 1.35 : 1.5 }}>
          {showCompactPhiWarning ? "Initials and learning points only." : PHI_WARNING}
        </div>
      </div>

      {showAdd && (
        <div style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 16, border: `2px solid ${T.brand}` }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={inputLabel}>Inpatient Initials</label>
              <input value={form.initials} maxLength={LIMITS.INITIALS_MAX}
                onChange={e => { setForm({...form, initials: clampLength(e.target.value, LIMITS.INITIALS_MAX)}); setFormErrors(prev => ({...prev, initials: undefined})); }}
                placeholder="e.g. J.S." style={{...inputStyle, ...(formErrors.initials ? inputErrorBorder : {})}} />
              {formErrors.initials && <div style={errorStyle}>{formErrors.initials}</div>}
            </div>
            <div>
              <label style={inputLabel}>Room #</label>
              <input value={form.room} maxLength={LIMITS.ROOM_MAX}
                onChange={e => { setForm({...form, room: clampLength(e.target.value, LIMITS.ROOM_MAX)}); setFormErrors(prev => ({...prev, room: undefined})); }}
                placeholder="e.g. 4B-12" style={{...inputStyle, ...(formErrors.room ? inputErrorBorder : {})}} />
              {formErrors.room && <div style={errorStyle}>{formErrors.room}</div>}
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={inputLabel}>Consult Reason / Diagnosis</label>
            <input value={form.dx} maxLength={LIMITS.DIAGNOSIS_MAX}
              onChange={e => { setForm({...form, dx: clampLength(e.target.value, LIMITS.DIAGNOSIS_MAX)}); setFormErrors(prev => ({...prev, dx: undefined})); }}
              placeholder="e.g. AKI in setting of sepsis" style={{...inputStyle, ...(formErrors.dx ? inputErrorBorder : {})}} />
            {formErrors.dx && <div style={errorStyle}>{formErrors.dx}</div>}
            {(() => {
              const suggested = suggestTopicsFromText(form.dx, form.topics);
              if (suggested.length === 0) return null;
              return (
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>Suggested:</span>
                  {suggested.map(t => (
                    <button key={t} type="button" onClick={() => toggleTopic(t)}
                      style={{ padding: "4px 10px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", background: T.brandBg, color: T.brand, border: `1px dashed ${T.brand}` }}>
                      + {t}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={inputLabel}>Learning Tags (2+ if relevant)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {visibleAddTopics.map(t => {
                const sel = form.topics.includes(t);
                return (
                <button key={t} type="button" onClick={() => toggleTopic(t)}
                    style={{ padding: isMobile ? "8px 14px" : "6px 12px", borderRadius: 20, fontSize: 13, fontWeight: sel ? 600 : 400, cursor: "pointer", transition: "all 0.15s",
                      background: sel ? T.brand : T.card, color: sel ? T.brandInk : T.sub,
                      border: sel ? `1.5px solid ${T.brand}` : `1.5px solid ${T.line}` }}>
                    {sel ? "✓ " : ""}{t}
                  </button>
                );
              })}
            </div>
            {(hiddenAddTopicCount > 0 || showAllTopics) && (
              <button
                type="button"
                onClick={() => setShowAllTopics(prev => !prev)}
                style={{ background: "none", border: "none", padding: "6px 0 0", color: T.brand, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                {showAllTopics ? "Show fewer topics" : `More topics (${hiddenAddTopicCount})`}
              </button>
            )}
            {formErrors.topics ? (
              <div style={errorStyle}>{formErrors.topics}</div>
            ) : (
              <div style={{ fontSize: 13, color: T.muted, marginTop: 6 }}>
                {form.topics.length < LIMITS.PATIENT_TOPICS_MIN
                  ? `${form.topics.length}/${LIMITS.PATIENT_TOPICS_MIN} selected`
                  : "Add more if clinically relevant."}
              </div>
            )}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={inputLabel}>Teaching Notes (optional)</label>
            <textarea value={form.notes} maxLength={LIMITS.NOTES_MAX}
              onChange={e => { setForm({...form, notes: clampLength(e.target.value, LIMITS.NOTES_MAX)}); setFormErrors(prev => ({...prev, notes: undefined})); }}
              placeholder="Key learning point..."
              rows={2} style={{...inputStyle, resize: "vertical", ...(formErrors.notes ? inputErrorBorder : {})}} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {formErrors.notes ? <div style={errorStyle}>{formErrors.notes}</div> : <div />}
              <div style={charCountStyle(form.notes.length, LIMITS.NOTES_MAX)}>{form.notes.length}/{LIMITS.NOTES_MAX}</div>
            </div>
          </div>
          <button onClick={addPatient} style={{ width: "100%", padding: "12px 0", background: T.brand, color: T.brandInk, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Add to Inpatient List
          </button>
        </div>
      )}

      {/* Topic Auto-Link Suggestions */}
      {showSuggestions && suggestions.length > 0 && navigate && (
        <div style={{ background: T.infoBg, borderRadius: 12, padding: 14, marginBottom: 14, border: `1.5px solid ${T.muted}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.info }}>Based on this inpatient, check out:</div>
            <button onClick={() => setShowSuggestions(false)} style={{ background: "none", border: "none", color: T.muted, fontSize: 14, cursor: "pointer", padding: 0, lineHeight: 1 }}>x</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => { navigate(...s.nav); setShowSuggestions(false); }}
                style={{ padding: isMobile ? "8px 12px" : "6px 12px", borderRadius: 8, fontSize: isMobile ? 12 : 11, fontWeight: 600, cursor: "pointer",
                  background: s.type === "studySheet" ? T.card : T.ice,
                  color: s.type === "studySheet" ? T.info : T.brand,
                  border: `1px solid ${s.type === "studySheet" ? T.muted : T.brand}` }}>
                {s.type === "studySheet" ? "📋" : "📝"} {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && !showAdd && (
        <div style={{ textAlign: "center", padding: 40, color: T.sub }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏥</div>
          <div style={{ fontSize: 14 }}>No active inpatients</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Tap "+ Add Patient" to track hospital consults</div>
        </div>
      )}

      {active.map(p => <PatientCard key={p.id} p={p} onToggle={() => toggle(p.id)} onRemove={() => remove(p.id)}
        isEditing={editingId === p.id} editForm={editForm} onStartEdit={() => startEdit(p)} onCancelEdit={cancelEdit} onSaveEdit={saveEdit}
        onEditChange={setEditForm} onEditToggleTopic={editToggleTopic} onAddFollowUp={addFollowUp} onRemoveFollowUp={removeFollowUp} />)}

      {discharged.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, margin: "20px 0 10px" }}>
            Completed / Discharged ({discharged.length})
          </div>
          {discharged.map(p => <PatientCard key={p.id} p={p} onToggle={() => toggle(p.id)} onRemove={() => remove(p.id)} dimmed
            isEditing={editingId === p.id} editForm={editForm} onStartEdit={() => startEdit(p)} onCancelEdit={cancelEdit} onSaveEdit={saveEdit}
            onEditChange={setEditForm} onEditToggleTopic={editToggleTopic} onAddFollowUp={addFollowUp} onRemoveFollowUp={removeFollowUp} />)}
        </>
      )}
      <EduDisclaimer />
    </div>
  );
}
