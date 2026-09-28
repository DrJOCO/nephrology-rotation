import { useState, useEffect, CSSProperties } from "react";
import { Pencil, RotateCcw, Check, X, Plus, ChevronRight } from "lucide-react";
import { T, TOPICS, TOPIC_RESOURCE_MAP, STUDY_SHEETS, COMMON_PATIENT_TOPICS, ADDITIONAL_PATIENT_TOPICS, TOPIC_KEYWORDS, labelChip } from "../../data/constants";
import { consultDetailLabels } from "../../data/consultFields";
import { inputLabel, inputStyle, EduDisclaimer, ConfirmSheet } from "./shared";
import { ConsultDetailPickers, compactConsultDetails, type ConsultDetails } from "./ConsultDetailPickers";
import { useIsMobile } from "../../utils/helpers";
import { dateKey } from "../../utils/date";
import { getFollowUpState } from "../../utils/patient";
import { getPatientSuggestedTopicGroups, type PatientSuggestedTopicGroup } from "../../utils/patientRecommendations";
import { createQuickLogEntry, summarizeSuggestedGroup, isDuplicateQuickLog, clearQuickLogGuard, OTHER_QUICK_LOG_SUMMARY } from "../../utils/quickLog";
import { validatePatientForm, LIMITS, PHI_WARNING } from "../../utils/validation";
import type { CompletedItems, Patient, SubView } from "../../types";

const errorStyle: CSSProperties = { fontSize: 13, color: T.danger, marginTop: 3, fontWeight: 500 };

// Topics plus optional picklist details — no free-text fields (D1).
interface PatientForm extends ConsultDetails {
  topics: string[];
}

const EMPTY_FORM: PatientForm = { topics: [] };

function patientTopics(p: Patient): string[] {
  return p.topics?.length ? p.topics : (p.topic ? [p.topic] : []);
}

// Applies a saved form to an entry, clearing any detail the student unset.
function applyPatientForm(p: Patient, form: PatientForm): Patient {
  const next: Patient = { ...p, topics: form.topics };
  delete next.setting;
  delete next.service;
  delete next.hospitalDay;
  return { ...next, ...compactConsultDetails(form) };
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

// Matches topic names and TOPIC_KEYWORDS synonyms, so "siadh" or "low sodium"
// surfaces Hyponatremia even though the topic name doesn't contain the query.
function searchQuickLogTopics(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return TOPICS.filter(topic => {
    if (topic.toLowerCase().includes(q)) return true;
    const entry = TOPIC_KEYWORDS.find(k => k.topic === topic);
    return entry ? entry.keywords.some(keyword => keyword.trim().includes(q)) : false;
  });
}

function summarizeTopics(topics: string[]): string {
  const cleanTopics = topics.filter(Boolean);
  if (cleanTopics.length === 0) return "No topics";
  if (cleanTopics.length <= 2) return cleanTopics.join(", ");
  return `${cleanTopics.slice(0, 2).join(", ")} +${cleanTopics.length - 2}`;
}

function getSuggestedGroupTarget(group: PatientSuggestedTopicGroup): [string, SubView] | null {
  if (group.guides[0]) return [group.guides[0].nav[0], group.guides[0].nav[1] as SubView];
  if (group.sheets[0]) return ["today", { type: "studySheets", week: group.sheets[0].week, sheetId: group.sheets[0].id }];
  if (group.tools[0]) return [group.tools[0].nav[0], group.tools[0].nav[1] as SubView];
  if (group.trials[0]) return ["today", { type: "trials", week: group.trials[0].week }];
  return null;
}

function buildPatientUpdateDetail(previous: Patient | undefined, next: PatientForm): string {
  if (!previous) return summarizeTopics(next.topics);
  const topicsChanged = patientTopics(previous).join("|") !== next.topics.join("|");
  return topicsChanged ? summarizeTopics(next.topics) : "Details updated";
}

function PatientCard({ p, onToggle, onRemove, dimmed, isEditing, editForm, editErrors, onStartEdit, onCancelEdit, onSaveEdit, onEditChange, onEditToggleTopic, onAddFollowUp, onRemoveFollowUp }: { p: Patient; onToggle: () => void; onRemove: () => void; dimmed?: boolean; isEditing: boolean; editForm: PatientForm; editErrors: Record<string, string | undefined>; onStartEdit: () => void; onCancelEdit: () => void; onSaveEdit: () => void; onEditChange: (form: PatientForm) => void; onEditToggleTopic: (topic: string) => void; onAddFollowUp: (patientId: string | number) => void; onRemoveFollowUp: (patientId: string | number, followUpId: number) => void }) {
  const isMobile = useIsMobile();
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [showAllEditTopics, setShowAllEditTopics] = useState(false);

  const topics = patientTopics(p);
  const title = topics.join(", ") || "Consult";
  const details = consultDetailLabels(p);
  const followUps = p.followUps || [];
  const followUpState = getFollowUpState(p);
  const today = dateKey();
  const seenToday = followUps.some(f => dateKey(new Date(f.date)) === today);
  const visibleEditTopics = getVisibleTopicOptions(editForm.topics, showAllEditTopics);
  const hiddenEditTopicCount = getHiddenTopicCount(editForm.topics, showAllEditTopics);

  useEffect(() => {
    if (!isEditing) setShowAllEditTopics(false);
  }, [isEditing]);

  if (isEditing) {
    return (
      <div style={{ background: T.card, borderRadius: 10, padding: 12, marginBottom: 10, border: `2px solid ${T.brand}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.brand, marginBottom: 8 }}>Editing Consult</div>
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
          {editErrors.topics ? (
            <div style={errorStyle}>{editErrors.topics}</div>
          ) : (
            <div style={{ fontSize: 13, color: T.muted, marginTop: 6 }}>
              {editForm.topics.length < LIMITS.PATIENT_TOPICS_MIN
                ? `${editForm.topics.length}/${LIMITS.PATIENT_TOPICS_MIN} selected`
                : "Add more if clinically relevant."}
            </div>
          )}
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
        <ConsultDetailPickers value={editForm} onChange={details => onEditChange({ ...editForm, ...details })} />
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
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
            <div style={{ fontWeight: 700, color: dimmed ? T.muted : T.ink, fontSize: 14, lineHeight: 1.35, marginBottom: 4, wordBreak: "break-word" }}>{title}</div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
              {details.map(label => (
                <span key={label} style={{ ...labelChip, fontSize: 10.5, padding: "2px 6px", borderRadius: 5 }}>{label}</span>
              ))}
              <span style={{ fontSize: 12, color: T.muted }}>Added {new Date(p.date).toLocaleDateString()}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: isMobile ? "flex-start" : "flex-end", flexShrink: 0 }}>
            {!dimmed && (
              <button
                onClick={onStartEdit}
                aria-label={`Edit consult: ${title}`}
                style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 6, padding: "5px 8px", minHeight: 36, fontSize: 11, cursor: "pointer", color: T.brand, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <Pencil size={12} strokeWidth={1.75} aria-hidden="true" /> Edit
              </button>
            )}
            <button
              onClick={onToggle}
              aria-label={dimmed ? `Reactivate consult: ${title}` : `Discharge consult: ${title}`}
              style={{ background: "none", border: `1px solid ${dimmed ? T.success : T.muted}`, borderRadius: 6, padding: "5px 8px", minHeight: 36, fontSize: 11, cursor: "pointer", color: dimmed ? T.success : T.sub, display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              {dimmed ? <><RotateCcw size={12} strokeWidth={1.75} aria-hidden="true" /> Reactivate</> : <><Check size={12} strokeWidth={2} aria-hidden="true" /> Discharge</>}
            </button>
            <button
              onClick={onRemove}
              aria-label={`Remove consult: ${title} — added in error`}
              title="Remove (added in error)"
              style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 6, minHeight: 36, padding: "5px 8px", fontSize: 11, cursor: "pointer", color: T.muted, display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <X size={12} strokeWidth={1.75} aria-hidden="true" /> Remove
            </button>
          </div>
        </div>
      </div>

      {/* Follow-ups: date-only "seen again" marks — no notes, so nothing typed can identify the patient */}
      <div style={{ borderTop: `1px solid ${T.line}`, padding: "6px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          {followUps.length > 0 ? (
            <button
              onClick={() => setShowFollowUps(!showFollowUps)}
              aria-expanded={showFollowUps}
              aria-label={`${showFollowUps ? "Collapse" : "Expand"} follow-up dates`}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: T.brand, fontWeight: 600, padding: "4px 0", display: "flex", alignItems: "center", gap: 4, minHeight: 36 }}
            >
              <ChevronRight size={14} strokeWidth={2} aria-hidden="true" style={{ transform: showFollowUps ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s" }} />
              Seen again ({followUps.length})
            </button>
          ) : (
            <span style={{ fontSize: 12, color: T.muted }}>Not seen again yet</span>
          )}
          {!dimmed && (
            <button
              onClick={() => onAddFollowUp(p.id)}
              disabled={seenToday}
              aria-label={seenToday ? "Already marked seen today" : `Mark ${title} seen again today`}
              style={{
                padding: "5px 10px",
                minHeight: 36,
                background: seenToday ? T.surface2 : T.card,
                color: seenToday ? T.muted : T.brand,
                border: `1px solid ${seenToday ? T.line : T.brand}`,
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: seenToday ? "default" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {seenToday ? <><Check size={13} strokeWidth={2} aria-hidden="true" /> Seen today</> : <><Plus size={13} strokeWidth={2.25} aria-hidden="true" /> Seen again today</>}
            </button>
          )}
        </div>
        {showFollowUps && followUps.map(f => (
          <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0", marginLeft: 18 }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: T.ink }}>{new Date(f.date).toLocaleDateString()}</div>
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
      </div>
    </div>
  );
}

interface TopicSuggestion {
  label: string;
  type: "studySheet" | "quiz" | "tool";
  nav: [string, SubView];
}

const AKI_WORKFLOW_SUGGESTION_TOPICS = new Set([
  "AKI",
  "Post-Renal AKI",
  "Contrast-Associated AKI",
  "Rhabdomyolysis",
  "AIN",
  "Hepatorenal Syndrome",
  "Cardiorenal Syndrome",
]);

const HYPONATREMIA_WORKFLOW_SUGGESTION_TOPICS = new Set([
  "Hyponatremia",
]);

const GN_WORKFLOW_SUGGESTION_TOPICS = new Set([
  "GN",
  "Glomerulonephritis",
  "Nephrotic Syndrome",
  "Lupus Nephritis",
  "IgA Nephropathy",
  "ANCA Vasculitis",
  "Membranous Nephropathy",
  "FSGS",
  "Minimal Change Disease",
  "Anti-GBM Disease",
  "Post-Infectious GN",
  "Cryoglobulinemic GN",
  "C3 Glomerulopathy",
  "MPGN",
  "HIVAN",
  "Proteinuria",
  "Kidney Biopsy",
]);

export default function PatientTab({ patients, setPatients, navigate, completedItems, onLogActivity, onMarkPatientDirty, onMarkPatientRemoved, onCompleteConsultTopic }: { patients: Patient[]; setPatients: React.Dispatch<React.SetStateAction<Patient[]>>; navigate?: (tab: string, sv?: SubView) => void; completedItems?: CompletedItems; onLogActivity?: ActivityLogger; onMarkPatientDirty?: (id: string | number) => void; onMarkPatientRemoved?: (id: string | number) => void; onCompleteConsultTopic?: (payload: { topic: string; sheetIds: string[]; trialNames: string[] }) => void }) {
  const isMobile = useIsMobile();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<PatientForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string | undefined>>({});
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState<PatientForm>(EMPTY_FORM);
  const [editErrors, setEditErrors] = useState<Record<string, string | undefined>>({});
  const [pendingRemoveId, setPendingRemoveId] = useState<string | number | null>(null);
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [addTopicQuery, setAddTopicQuery] = useState("");
  // Quick log (cohort feedback): one tap on a topic chip logs a consult with no
  // form — the payoff (matched learning) is shown immediately so the loop is
  // visible at the moment of effort instead of hiding on another tab.
  const [quickLogExpanded, setQuickLogExpanded] = useState(false);
  const [quickLogQuery, setQuickLogQuery] = useState("");
  const [quickLogConfirm, setQuickLogConfirm] = useState<{ topic: string; summary: string; entryId: string | number } | null>(null);
  // Undo stays offered for a few seconds after a log, then the entry stands.
  const [undoOffered, setUndoOffered] = useState(false);
  useEffect(() => {
    if (!quickLogConfirm) {
      setUndoOffered(false);
      return;
    }
    setUndoOffered(true);
    const timer = window.setTimeout(() => setUndoOffered(false), 5000);
    return () => window.clearTimeout(timer);
  }, [quickLogConfirm]);

  const quickLogTopic = (topic: string) => {
    // Double-tap guard: swallow an accidental repeat tap of the same topic.
    if (isDuplicateQuickLog(topic)) return;
    const entry = createQuickLogEntry(topic);
    onMarkPatientDirty?.(entry.id);
    setPatients(prev => [entry, ...prev]);
    onLogActivity?.("patient", "Consult topic logged", topic);
    const [group] = getPatientSuggestedTopicGroups([entry], completedItems);
    // Honesty: "Other" is filtered out of every recommendation surface, so it
    // never earns linked learning — don't promise it.
    const summary = topic === "Other"
      ? OTHER_QUICK_LOG_SUMMARY
      : (group ? summarizeSuggestedGroup(group) : "matched learning appears on Today");
    setQuickLogConfirm({ topic, summary, entryId: entry.id });
    setQuickLogExpanded(false);
    setQuickLogQuery("");
  };

  const undoQuickLog = () => {
    if (!quickLogConfirm) return;
    const { topic, entryId } = quickLogConfirm;
    onMarkPatientRemoved?.(entryId);
    setPatients(prev => prev.filter(p => p.id !== entryId));
    onLogActivity?.("patient", "Consult topic undone", topic);
    clearQuickLogGuard(topic);
    setQuickLogConfirm(null);
  };

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
    setEditErrors(prev => ({ ...prev, topics: undefined }));
  };

  const addPatient = () => {
    const { valid, errors } = validatePatientForm(form);
    if (!valid) { setFormErrors(errors); return; }
    const newId = Date.now();
    onMarkPatientDirty?.(newId);
    setPatients(prev => [{ id: newId, topics: form.topics, ...compactConsultDetails(form), date: new Date().toISOString(), status: "active", followUps: [] }, ...prev]);
    onLogActivity?.("patient", "Inpatient added", summarizeTopics(form.topics));

    // Compute topic suggestions
    if (navigate) {
      const newSuggestions: TopicSuggestion[] = [];
      const seenSheets = new Set<string>();
      const seenWeeks = new Set<number>();
      let akiWorkflowSuggested = false;
      let hyponatremiaWorkflowSuggested = false;
      let gnWorkflowSuggested = false;
      for (const topic of form.topics) {
        if (!akiWorkflowSuggested && AKI_WORKFLOW_SUGGESTION_TOPICS.has(topic)) {
          newSuggestions.push({ label: "AKI Differential Tool", type: "tool", nav: ["library", { type: "akiTool" }] });
          akiWorkflowSuggested = true;
        }
        if (!hyponatremiaWorkflowSuggested && HYPONATREMIA_WORKFLOW_SUGGESTION_TOPICS.has(topic)) {
          newSuggestions.push({ label: "Hyponatremia Tool", type: "tool", nav: ["library", { type: "hyponatremiaTool" }] });
          hyponatremiaWorkflowSuggested = true;
        }
        if (!gnWorkflowSuggested && GN_WORKFLOW_SUGGESTION_TOPICS.has(topic)) {
          newSuggestions.push({ label: "Glomerular Disease Tool", type: "tool", nav: ["library", { type: "gnTool" }] });
          gnWorkflowSuggested = true;
        }
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

    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowAllTopics(false);
    setAddTopicQuery("");
    setShowAdd(false);
  };

  const toggle = (id: string | number) => {
    const patient = patients.find(p => p.id === id);
    if (!patient) return;
    const nextStatus = patient.status === "active" ? "discharged" : "active";
    onMarkPatientDirty?.(id);
    setPatients(prev => prev.map(p => p.id === id ? { ...p, status: nextStatus } : p));
    onLogActivity?.("patient", nextStatus === "discharged" ? "Inpatient discharged" : "Inpatient reactivated", summarizeTopics(patientTopics(patient)));
  };
  const remove = (id: string | number) => {
    const patient = patients.find(p => p.id === id);
    onMarkPatientRemoved?.(id);
    setPatients(prev => prev.filter(p => p.id !== id));
    if (patient) {
      onLogActivity?.("patient", "Inpatient removed", summarizeTopics(patientTopics(patient)));
    }
  };

  const startEdit = (patient: Patient) => {
    setEditingId(patient.id);
    setEditForm({ topics: patientTopics(patient), ...compactConsultDetails(patient) });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm(EMPTY_FORM); setEditErrors({}); };

  const saveEdit = () => {
    const { valid, errors } = validatePatientForm(editForm);
    if (!valid) {
      setEditErrors(errors);
      return;
    }
    setEditErrors({});
    const existing = patients.find(p => p.id === editingId);
    if (editingId != null) onMarkPatientDirty?.(editingId);
    setPatients(prev => prev.map(p => p.id === editingId ? applyPatientForm(p, editForm) : p));
    onLogActivity?.("patient", "Inpatient updated", buildPatientUpdateDetail(existing, editForm));
    cancelEdit();
  };

  const addFollowUp = (patientId: string | number) => {
    const patient = patients.find(p => p.id === patientId);
    onMarkPatientDirty?.(patientId);
    setPatients(prev => prev.map(p => p.id === patientId ? {
      ...p,
      followUps: [...(p.followUps || []), { id: Date.now(), date: new Date().toISOString() }]
    } : p));
    onLogActivity?.("follow_up", "Follow-up added", summarizeTopics(patient ? patientTopics(patient) : []));
  };

  const removeFollowUp = (patientId: string | number, followUpId: number) => {
    const patient = patients.find(p => p.id === patientId);
    onMarkPatientDirty?.(patientId);
    setPatients(prev => prev.map(p => p.id === patientId ? {
      ...p,
      followUps: (p.followUps || []).filter(f => f.id !== followUpId)
    } : p));
    onLogActivity?.("follow_up", "Follow-up removed", summarizeTopics(patient ? patientTopics(patient) : []));
  };

  const active = patients.filter(p => p.status === "active");
  const discharged = patients.filter(p => p.status === "discharged");
  const suggestedGroups = navigate ? getPatientSuggestedTopicGroups(active, completedItems) : [];
  const visibleAddTopics = getVisibleTopicOptions(form.topics, showAllTopics);
  const hiddenAddTopicCount = getHiddenTopicCount(form.topics, showAllTopics);
  const quickLogMatches = searchQuickLogTopics(quickLogQuery);
  const addTopicMatches = searchQuickLogTopics(addTopicQuery);
  const showCompactPhiWarning = patients.length > 0 && !showAdd;

  const openSuggestedGroup = (group: PatientSuggestedTopicGroup) => {
    const target = getSuggestedGroupTarget(group);
    if (!target || !navigate) return;
    navigate(target[0], target[1]);
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h2 style={{ color: T.ink, fontSize: 16, margin: 0, fontFamily: T.serif, fontWeight: 700 }}>Consult Log</h2>
        <button onClick={() => {
          if (showAdd) { setShowAllTopics(false); setAddTopicQuery(""); }
          setShowAdd(!showAdd);
        }}
          style={{ padding: "8px 16px", background: showAdd ? T.sub : T.card, color: showAdd ? T.card : T.ink, border: `1px solid ${showAdd ? T.sub : T.line}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {showAdd ? "Cancel" : "+ Add with details"}
        </button>
      </div>
      <p style={{ fontSize: 13, color: T.sub, margin: "0 0 12px", lineHeight: 1.5 }}>
        Not a patient tracker — keep that in Cerner. Tap the topics you see on consults (~5 seconds) and matched teaching appears here and on Today.
      </p>

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
          {showCompactPhiWarning ? "Topics and picklists only — no patient details." : PHI_WARNING}
        </div>
      </div>

      {/* Quick log — the primary action. One tap per consult topic. */}
      {!showAdd && (
        <div style={{ background: T.card, border: `2px solid ${T.brand}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.ink, marginBottom: 8 }}>Saw a consult? Log the topic:</div>
          <input
            type="search"
            value={quickLogQuery}
            onChange={e => setQuickLogQuery(e.target.value)}
            placeholder={`Search all ${TOPICS.length} topics — e.g. "low sodium", "stones"…`}
            aria-label="Search consult topics"
            style={{ ...inputStyle, marginBottom: 8 }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(quickLogQuery.trim() ? quickLogMatches : (quickLogExpanded ? TOPICS : COMMON_PATIENT_TOPICS)).map(topic => (
              <button
                key={topic}
                onClick={() => quickLogTopic(topic)}
                style={{ padding: "8px 12px", minHeight: 36, borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}>
                {topic}
              </button>
            ))}
            {!quickLogQuery.trim() && (
              <button
                onClick={() => setQuickLogExpanded(!quickLogExpanded)}
                style={{ padding: "8px 12px", minHeight: 36, borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "none", color: T.brand, border: `1px dashed ${T.brand}` }}>
                {quickLogExpanded ? "Fewer topics" : `All topics (${TOPICS.length})`}
              </button>
            )}
            {quickLogQuery.trim() && quickLogMatches.length === 0 && (
              <>
                <div style={{ fontSize: 13, color: T.sub, padding: "8px 2px", lineHeight: 1.4 }}>
                  No topics match &ldquo;{quickLogQuery.trim()}&rdquo; — try a different term, or:
                </div>
                <button
                  onClick={() => quickLogTopic("Other")}
                  style={{ padding: "8px 12px", minHeight: 36, borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}>
                  Log as Other
                </button>
              </>
            )}
          </div>
          {quickLogConfirm && (
            <div role="status" aria-live="polite" style={{ marginTop: 10, background: T.successBg, border: `1px solid ${T.success}`, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, color: T.success, fontWeight: 600, lineHeight: 1.4 }}>
                {quickLogConfirm.topic} logged ✓ — {quickLogConfirm.summary}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {undoOffered && (
                  <button onClick={undoQuickLog}
                    style={{ padding: "6px 12px", minHeight: 36, background: "none", color: T.success, border: `1px solid ${T.success}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    Undo
                  </button>
                )}
                {navigate && (
                  <button onClick={() => navigate("today")}
                    style={{ padding: "6px 12px", minHeight: 36, background: T.success, color: T.successInk, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    See on Today →
                  </button>
                )}
                <button onClick={() => setQuickLogConfirm(null)} aria-label="Dismiss confirmation"
                  style={{ background: "none", border: "none", color: T.success, cursor: "pointer", fontSize: 16, minWidth: 36, minHeight: 36 }}>
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {active.length > 0 && navigate && (
        <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: suggestedGroups.length > 0 ? 10 : 0 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.ink, marginBottom: 3 }}>Consult-linked learning</div>
              <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.45 }}>
                {suggestedGroups.length > 0
                  ? "Matched study sheets, trials, tools, and guides from active consult tags."
                  : "Current tags are complete or have no matched items left."}
              </div>
            </div>
            <div style={{ background: T.infoBg, color: T.info, border: `1px solid ${T.line}`, borderRadius: 999, padding: "5px 9px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
              {active.length} active
            </div>
          </div>
          {suggestedGroups.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {suggestedGroups.map(group => (
                <div
                  key={group.topic}
                  style={{ background: T.bg, border: `1px solid ${T.line}`, borderRadius: 10, minHeight: 68, display: "flex", alignItems: "stretch" }}
                >
                  <button
                    onClick={() => openSuggestedGroup(group)}
                    style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: "10px 4px 10px 11px", cursor: "pointer", textAlign: "left" }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800, color: T.ink, lineHeight: 1.25 }}>{group.topic}</div>
                    <div style={{ fontSize: 12, color: T.sub, marginTop: 4, lineHeight: 1.35 }}>{summarizeSuggestedGroup(group)}</div>
                  </button>
                  {onCompleteConsultTopic && (
                    <button
                      onClick={() => onCompleteConsultTopic({ topic: group.topic, sheetIds: group.sheets.map(s => s.id), trialNames: group.trials.map(t => t.name) })}
                      aria-label={`Mark ${group.topic} reviewed`}
                      title="Got it — hides until your next consult with this topic"
                      style={{ background: "none", border: "none", borderLeft: `1px solid ${T.line}`, color: T.success, cursor: "pointer", padding: "0 10px", display: "flex", alignItems: "center", borderRadius: "0 10px 10px 0" }}
                    >
                      <Check size={15} strokeWidth={2.4} aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <div style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 16, border: `2px solid ${T.brand}` }}>
          <div style={{ marginBottom: 10 }}>
            <label style={inputLabel}>Learning Tags (2+ if relevant)</label>
            <input
              type="search"
              value={addTopicQuery}
              onChange={e => setAddTopicQuery(e.target.value)}
              placeholder={`Search all ${TOPICS.length} topics…`}
              aria-label="Search learning tags"
              style={{ ...inputStyle, marginTop: 4 }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {(addTopicQuery.trim() ? addTopicMatches : visibleAddTopics).map(t => {
                const sel = form.topics.includes(t);
                return (
                <button key={t} type="button" onClick={() => { toggleTopic(t); if (!sel) setAddTopicQuery(""); }}
                    style={{ padding: isMobile ? "8px 14px" : "6px 12px", borderRadius: 20, fontSize: 13, fontWeight: sel ? 600 : 400, cursor: "pointer", transition: "all 0.15s",
                      background: sel ? T.brand : T.card, color: sel ? T.brandInk : T.sub,
                      border: sel ? `1.5px solid ${T.brand}` : `1.5px solid ${T.line}` }}>
                    {sel ? "✓ " : ""}{t}
                  </button>
                );
              })}
              {addTopicQuery.trim() && addTopicMatches.length === 0 && (
                <div style={{ fontSize: 13, color: T.sub, padding: "6px 2px", lineHeight: 1.4 }}>
                  No topics match &ldquo;{addTopicQuery.trim()}&rdquo; — try a different term, or tag it as Other.
                </div>
              )}
            </div>
            {!addTopicQuery.trim() && (hiddenAddTopicCount > 0 || showAllTopics) && (
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
          <ConsultDetailPickers value={form} onChange={details => setForm(prev => ({ ...prev, ...details }))} />
          <button onClick={addPatient} style={{ width: "100%", marginTop: 4, padding: "12px 0", background: T.brand, color: T.brandInk, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Add to Consult Log
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
                  background: s.type === "studySheet" ? T.card : s.type === "tool" ? T.infoBg : T.surface2,
                  color: s.type === "studySheet" || s.type === "tool" ? T.info : T.brand,
                  border: `1px solid ${s.type === "studySheet" ? T.muted : s.type === "tool" ? T.info : T.brand}` }}>
                {s.type === "studySheet" ? "📋" : s.type === "tool" ? "🛠" : "📝"} {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && !showAdd && (
        <div style={{ textAlign: "center", padding: 40, color: T.sub }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏥</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>No consults logged yet</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4, lineHeight: 1.5, maxWidth: 420, margin: "4px auto 0" }}>
            Tap a topic above the first time you see it on rounds — the matching study sheet, trials, and tools appear right here and on Today. Your attending may seed a few consults to get you started.
          </div>
        </div>
      )}

      {active.map(p => <PatientCard key={p.id} p={p} onToggle={() => toggle(p.id)} onRemove={() => setPendingRemoveId(p.id)}
        isEditing={editingId === p.id} editForm={editForm} editErrors={editErrors} onStartEdit={() => startEdit(p)} onCancelEdit={cancelEdit} onSaveEdit={saveEdit}
        onEditChange={(form) => { setEditForm(form); setEditErrors({}); }} onEditToggleTopic={editToggleTopic} onAddFollowUp={addFollowUp} onRemoveFollowUp={removeFollowUp} />)}

      {discharged.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, margin: "20px 0 10px" }}>
            Completed / Discharged ({discharged.length})
          </div>
          {discharged.map(p => <PatientCard key={p.id} p={p} onToggle={() => toggle(p.id)} onRemove={() => setPendingRemoveId(p.id)} dimmed
            isEditing={editingId === p.id} editForm={editForm} editErrors={editErrors} onStartEdit={() => startEdit(p)} onCancelEdit={cancelEdit} onSaveEdit={saveEdit}
            onEditChange={(form) => { setEditForm(form); setEditErrors({}); }} onEditToggleTopic={editToggleTopic} onAddFollowUp={addFollowUp} onRemoveFollowUp={removeFollowUp} />)}
        </>
      )}
      <EduDisclaimer />

      {pendingRemoveId != null && (() => {
        const pendingPatient = patients.find(p => p.id === pendingRemoveId);
        const topicLabel = pendingPatient ? summarizeTopics(patientTopics(pendingPatient)) : "";
        const label = topicLabel && topicLabel !== "No topics" ? `the ${topicLabel} consult` : "this consult";
        return (
          <ConfirmSheet
            title="Remove this consult?"
            message={`This permanently deletes ${label} and its follow-up dates — it can't be undone. If you've finished the consult, use "Discharge" instead to keep it in your log.`}
            confirmLabel="Remove"
            cancelLabel="Keep"
            tone="danger"
            onConfirm={() => { remove(pendingRemoveId); setPendingRemoveId(null); }}
            onCancel={() => setPendingRemoveId(null)}
          />
        );
      })()}
    </div>
  );
}
