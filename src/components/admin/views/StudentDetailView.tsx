import React, { useState, useEffect, useRef } from "react";
import { T, TOPICS, FEEDBACK_TAGS, COMMON_PATIENT_TOPICS, ADDITIONAL_PATIENT_TOPICS } from "../../../data/constants";
import { validatePatientForm, clampLength, LIMITS, PHI_WARNING } from "../../../utils/validation";
import { buildStudentProgressSummary } from "../../../utils/adminStudents";
import type { AdminStudent, Patient, QuizScore, SharedSettings, FeedbackTag } from "../../../types";
import type { NavigateFn, ArticlesData } from "../types";
import { adminInput, adminLabel, type AdminConfirmOptions, type AdminToastTone } from "../shared";
import {
  buildAdminCompetencySnapshot,
  buildAdminAssessmentSignal,
} from "../lib/student-analytics";
import { backBtn } from "../lib/styles";
import { getScorePct } from "../lib/format";

const ADMIN_YEAR_OPTIONS = ["MS3/MS4", "MS3", "MS4", "PA Student", "NP Student", "Resident"] as const;

export function StudentDetailView({ student: s, students, onBack, setStudents, writeStudentToFirestore, recoverStudentToRecord, deleteStudentRecord, navigate, settings, articles, requestConfirm, showToast }: { student: AdminStudent | undefined; students: AdminStudent[]; onBack: () => void; setStudents: React.Dispatch<React.SetStateAction<AdminStudent[]>>; writeStudentToFirestore: (studentId: string, data: Record<string, unknown>) => void; recoverStudentToRecord: (sourceStudentId: string, targetStudentId: string) => Promise<string>; deleteStudentRecord: (student: AdminStudent) => Promise<void>; navigate: NavigateFn; settings: SharedSettings; articles: ArticlesData; requestConfirm: (options: AdminConfirmOptions) => Promise<boolean>; showToast: (message: string, tone?: AdminToastTone) => void }) {
  const [showScoreEntry, setShowScoreEntry] = useState(false);
  const [scoreType, setScoreType] = useState("pre"); // pre, post, weekly
  const [scoreWeek, setScoreWeek] = useState(1);
  const [scoreForm, setScoreForm] = useState({ correct: "", total: "" });
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [patientStudentIds, setPatientStudentIds] = useState<string[]>(() => s?.studentId ? [s.studentId] : []);
  const [patForm, setPatForm] = useState({ initials: "", room: "", dx: "", topics: [] as string[], notes: "" });
  const [patErrors, setPatErrors] = useState<Record<string, string | undefined>>({});
  const [showAllPatTopics, setShowAllPatTopics] = useState(false);
  const [showAddFeedback, setShowAddFeedback] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [recoveryTargetId, setRecoveryTargetId] = useState("");
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const patientEntryRef = useRef<HTMLDivElement>(null);
  const togglePatTopic = (t: string) => {
    setPatForm(prev => ({ ...prev, topics: prev.topics.includes(t) ? prev.topics.filter((x: string) => x !== t) : [...prev.topics, t] }));
    setPatErrors(prev => ({ ...prev, topics: undefined }));
  };

  const normalizedName = s?.name.trim().toLowerCase() || "";
  const preferredRecoveryCandidates = s ? students.filter(other =>
    other.studentId !== s.studentId &&
    other.name.trim().toLowerCase() === normalizedName
  ) : [];
  const recoveryCandidates = (preferredRecoveryCandidates.length > 0 ? preferredRecoveryCandidates : students.filter(other => other.studentId !== s?.studentId))
    .slice()
    .sort((a, b) => (b.lastSyncedAt || "").localeCompare(a.lastSyncedAt || ""));

  useEffect(() => {
    if (!recoveryCandidates.some(candidate => candidate.studentId === recoveryTargetId)) {
      setRecoveryTargetId(recoveryCandidates[0]?.studentId || "");
    }
  }, [recoveryCandidates, recoveryTargetId]);

  useEffect(() => {
    if (!s?.studentId) {
      setPatientStudentIds([]);
      return;
    }
    setPatientStudentIds(current => {
      const availableIds = new Set(students.map(student => student.studentId));
      const filtered = current.filter(studentId => availableIds.has(studentId));
      return showAddPatient ? (filtered.length > 0 ? filtered : [s.studentId]) : [s.studentId];
    });
  }, [showAddPatient, s?.studentId, students]);

  useEffect(() => {
    if (!showAddPatient) return;
    const timeoutId = window.setTimeout(() => {
      patientEntryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
    return () => window.clearTimeout(timeoutId);
  }, [showAddPatient]);

  if (!s) return <div style={{ padding: 16 }}>Student not found.</div>;

  const prePct = getScorePct(s.preScore);
  const postPct = getScorePct(s.postScore);
  const wkScores = s.weeklyScores || {};
  const patients = s.patients || [];
  const competency = buildAdminCompetencySnapshot(s, settings, articles);
  const assessment = buildAdminAssessmentSignal(s);
  const progress = buildStudentProgressSummary(s, articles);
  const streakDays = s.gamification?.streaks?.currentDays || 0;
  const totalQuizAttempts = Object.values(wkScores).flat().length + (s.preScore ? 1 : 0) + (s.postScore ? 1 : 0);
  const patientAssignmentCandidates = [...students].sort((a, b) => {
    if (a.studentId === s.studentId) return -1;
    if (b.studentId === s.studentId) return 1;
    return a.name.localeCompare(b.name);
  });

  const updateStudent = (updates: Partial<AdminStudent>) => {
    setStudents(prev => prev.map(st => st.id === s.id ? { ...st, ...updates } : st));
    // Write back to Firestore so student sees admin edits
    if (writeStudentToFirestore && s.studentId) {
      const merged = { ...s, ...updates };
      writeStudentToFirestore(s.studentId, {
        name: merged.name,
        patients: merged.patients,
        weeklyScores: merged.weeklyScores,
        preScore: merged.preScore,
        postScore: merged.postScore,
        srQueue: merged.srQueue || {},
        status: merged.status,
        feedbackTags: merged.feedbackTags || [],
      });
    }
  };

  const saveScore = () => {
    const correct = parseInt(scoreForm.correct);
    const total = parseInt(scoreForm.total);
    if (isNaN(correct) || isNaN(total) || total === 0) return;
    const entry: QuizScore = { correct, total, date: new Date().toISOString(), answers: [] };

    if (scoreType === "pre") {
      updateStudent({ preScore: entry });
    } else if (scoreType === "post") {
      updateStudent({ postScore: entry });
    } else {
      const newWeekly = { ...wkScores };
      newWeekly[scoreWeek] = [...(newWeekly[scoreWeek] || []), entry];
      updateStudent({ weeklyScores: newWeekly });
    }
    setShowScoreEntry(false);
    setScoreForm({ correct: "", total: "" });
  };

  const addPatient = () => {
    const { valid, errors } = validatePatientForm(patForm);
    if (!valid) {
      setPatErrors(errors);
      return;
    }
    const selectedStudentIds = Array.from(new Set(patientStudentIds));
    if (selectedStudentIds.length === 0) {
      setPatErrors(prev => ({ ...prev, assignment: "Select at least one student" }));
      return;
    }

    const assignedAt = new Date().toISOString();
    const assignmentMap = new Map(
      students
        .filter(student => selectedStudentIds.includes(student.studentId))
        .map((student, index) => {
          const nextPatient = {
            ...patForm,
            id: `${Date.now()}-${index}-${student.studentId}`,
            date: assignedAt,
            status: "active" as const,
            followUps: [],
          } as Patient;
          return [student.studentId, {
            patients: [...(student.patients || []), nextPatient],
            lastSyncedAt: assignedAt,
          }];
        })
    );

    setStudents(prev => prev.map(student => {
      const assignment = assignmentMap.get(student.studentId);
      return assignment ? { ...student, patients: assignment.patients, lastSyncedAt: assignment.lastSyncedAt } : student;
    }));
    assignmentMap.forEach((assignment, studentId) => {
      writeStudentToFirestore(studentId, { patients: assignment.patients });
    });

    setPatForm({ initials: "", room: "", dx: "", topics: [], notes: "" });
    setPatErrors({});
    setShowAllPatTopics(false);
    setShowAddPatient(false);
  };

  const togglePatientAssignment = (studentId: string) => {
    setPatientStudentIds(prev => (
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    ));
    setPatErrors(prev => ({ ...prev, assignment: undefined }));
  };

  const topicCounts: Record<string, number> = {};
  patients.forEach(p => {
    const ts = p.topics || (p.topic ? [p.topic] : []);
    ts.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
  });
  const visibleAdminTopics = showAllPatTopics
    ? TOPICS
    : [...COMMON_PATIENT_TOPICS, ...ADDITIONAL_PATIENT_TOPICS.filter(topic => patForm.topics.includes(topic))];
  const hiddenAdminTopicCount = showAllPatTopics
    ? 0
    : ADDITIONAL_PATIENT_TOPICS.length - ADDITIONAL_PATIENT_TOPICS.filter(topic => patForm.topics.includes(topic)).length;

  const handleRecovery = async () => {
    if (!recoveryTargetId) {
      setRecoveryError("Select the new device record first.");
      return;
    }
    const target = recoveryCandidates.find(candidate => candidate.studentId === recoveryTargetId);
    if (!target) {
      setRecoveryError("Selected recovery record no longer exists.");
      return;
    }
    const confirmed = await requestConfirm({
      title: `Recover ${s.name}'s progress?`,
      message: `This moves the saved progress into ${target.name} (${target.studentId.slice(0, 8)}...) and deletes the older device record.`,
      confirmLabel: "Recover Progress",
    });
    if (!confirmed) return;

    setRecoveryBusy(true);
    setRecoveryError("");
    try {
      const nextStudentId = await recoverStudentToRecord(s.studentId, target.studentId);
      navigate("students", { type: "studentDetail", id: nextStudentId });
      showToast("Recovery complete. The new device record now owns the student's progress.", "success");
    } catch (error) {
      console.error("Student recovery failed:", error);
      setRecoveryError(error instanceof Error ? error.message : "Recovery failed.");
    }
    setRecoveryBusy(false);
  };

  const handleRemoveStudent = async () => {
    const confirmed = await requestConfirm({
      title: `Remove ${s.name}?`,
      message: "This deletes their saved progress and cohort activity for this rotation.",
      confirmLabel: "Remove Student",
      tone: "danger",
    });
    if (!confirmed) return;

    setRemoveBusy(true);
    setRemoveError("");
    try {
      await deleteStudentRecord(s);
      showToast(`${s.name} was removed from the rotation.`, "success");
      navigate("students");
    } catch (error) {
      console.error("Student removal failed:", error);
      setRemoveError(error instanceof Error ? error.message : "Student removal failed.");
    }
    setRemoveBusy(false);
  };

  const detailSectionHeadingStyle: React.CSSProperties = {
    color: T.navy,
    fontSize: 15,
    margin: "0 0 10px",
    fontFamily: T.serif,
    fontWeight: 700,
  };

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtn}>← Back</button>

      {/* Header */}
      <div style={{ background: T.card, borderRadius: 16, padding: 20, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 22, margin: "0 0 4px", fontWeight: 700 }}>{s.name}</h2>
            <div style={{ fontSize: 13, color: T.sub }}>{s.year || "MS3/MS4"} • {s.email || "No email"}</div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 4, fontFamily: T.mono }}>Record ID: {s.studentId}</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: s.status === "active" ? T.success : T.muted, background: s.status === "active" ? T.successBg : T.bg, border: `1px solid ${s.status === "active" ? T.success : T.line}`, padding: "4px 10px", borderRadius: 8, textTransform: "uppercase" }}>
            {s.status}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginTop: 12 }}>
          <div style={{ background: T.bg, borderRadius: 12, padding: 14, border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Training Year</div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginBottom: 10 }}>
              Update this if the learner should be grouped as MS3 vs MS4 in future reporting.
            </div>
            <select
              value={s.year || "MS3/MS4"}
              onChange={(event) => updateStudent({ year: event.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.line}`, fontSize: 14, color: T.text, background: T.card, outline: "none" }}
            >
              {ADMIN_YEAR_OPTIONS.map((option) => (
                <option key={option} value={option}>{option === "MS3/MS4" ? "Not set" : option}</option>
              ))}
            </select>
          </div>

          <div style={{ background: T.bg, borderRadius: 12, padding: 14, border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Competency Overview</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>{competency.masteryPercent}%</span>
              <span style={{ fontSize: 13, color: T.sub }}>{competency.masteryDetail}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ background: T.ice, color: T.navy, borderRadius: 999, padding: "4px 9px", fontSize: 13, fontWeight: 700 }}>
                Top domain: {competency.topDomain.label}
              </span>
              <span style={{ background: competency.developingCount > 0 ? T.warningBg : T.successBg, color: competency.developingCount > 0 ? T.warning : T.success, borderRadius: 999, padding: "4px 9px", fontSize: 13, fontWeight: 700 }}>
                {competency.developingCount} developing
              </span>
            </div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>{competency.profileLine}</div>
          </div>

          <div style={{ background: T.bg, borderRadius: 12, padding: 14, border: `1px solid ${assessment?.summary ? T.danger : T.line}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Teaching Signal</div>
            {assessment?.summary ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.navy, marginBottom: 8 }}>
                  Teach next: {assessment.summary.recommendedArea.label}{assessment.summary.recommendedArea.missedTopics[0] ? ` — ${assessment.summary.recommendedArea.missedTopics[0]}` : ""}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  <span style={{ background: T.dangerBg, color: T.danger, borderRadius: 999, padding: "4px 9px", fontSize: 13, fontWeight: 700 }}>
                    Focus {assessment.summary.recommendedArea.pct}%
                  </span>
                  {assessment.summary.strongestAreas[0] && (
                    <span style={{ background: T.successBg, color: T.success, borderRadius: 999, padding: "4px 9px", fontSize: 13, fontWeight: 700 }}>
                      Strongest: {assessment.summary.strongestAreas[0].shortLabel}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>
                  {assessment.summary.detailLine}
                </div>
              </>
            ) : assessment ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.navy, marginBottom: 8 }}>
                  Assessment logged at {assessment.overallPct}%
                </div>
                <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>
                  {assessment.note}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.navy, marginBottom: 8 }}>
                  Awaiting assessment signal
                </div>
                <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>
                  Once the student completes a pre- or post-assessment, this card will call out what to teach next.
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <span style={{ background: T.ice, color: T.navy, borderRadius: 999, padding: "4px 9px", fontSize: 13, fontWeight: 700 }}>
            {patients.length} consult{patients.length !== 1 ? "s" : ""}
          </span>
          <span style={{ background: T.bg, color: T.sub, borderRadius: 999, padding: "4px 9px", fontSize: 13, fontWeight: 600 }}>
            {totalQuizAttempts} quiz signal{totalQuizAttempts !== 1 ? "s" : ""}
          </span>
          {streakDays > 0 && (
            <span style={{ background: T.dangerBg, color: T.danger, borderRadius: 999, padding: "4px 9px", fontSize: 13, fontWeight: 700 }}>
              🔥 {streakDays} day streak
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <button onClick={() => { setShowScoreEntry(true); setScoreType("pre"); setScoreForm({ correct: "", total: "25" }); }}
            style={{ fontSize: 13, color: T.warning, background: T.warningBg, border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            + Enter Score
          </button>
          <button onClick={() => setShowAddPatient(!showAddPatient)}
            onClickCapture={() => { if (showAddPatient) setShowAllPatTopics(false); }}
            style={{ fontSize: 13, color: T.success, background: T.successBg, border: `1px solid ${T.success}`, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            {showAddPatient ? "Close consult form" : "+ Add Consult"}
          </button>
          <button onClick={() => navigate("students", { type: "printStudent", id: String(s.id) })}
            style={{ fontSize: 13, color: T.info, background: T.infoBg, border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            Print Report
          </button>
          <button onClick={() => navigate("students", { type: "exportPdf", id: String(s.id) })}
            style={{ fontSize: 13, color: T.info, background: T.infoBg, border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            Export PDF
          </button>
          <button onClick={handleRemoveStudent} disabled={removeBusy}
            style={{ fontSize: 13, color: removeBusy ? "white" : T.dangerInk, background: removeBusy ? T.muted : T.danger, border: "none", padding: "6px 12px", borderRadius: 6, cursor: removeBusy ? "wait" : "pointer", fontWeight: 600 }}>
            {removeBusy ? "Removing..." : "Remove from Rotation"}
          </button>
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>
          Use remove for test users, duplicates, or mistaken joins. For finished learners, prefer marking the rotation complete instead.
        </div>
        {removeError && (
          <div style={{ marginTop: 8, fontSize: 13, color: T.danger, background: T.dangerBg, borderRadius: 8, padding: "8px 10px" }}>
            {removeError}
          </div>
        )}
      </div>

      {/* Quick Entry */}
      {(showScoreEntry || showAddPatient) && (
        <h3 style={detailSectionHeadingStyle}>Quick Entry</h3>
      )}

      {/* Score Entry */}
      {showScoreEntry && (
        <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 16, border: `2px solid ${T.warning}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.warning, marginBottom: 10 }}>ENTER SCORE</div>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Quiz Type</label>
            <div style={{ display: "flex", gap: 6 }}>
              {["pre", "post", "weekly"].map(t => (
                <button key={t} onClick={() => { setScoreType(t); setScoreForm({ correct: "", total: t === "weekly" ? "10" : "25" }); }}
                  style={{ flex: 1, padding: "8px 0", background: scoreType === t ? `linear-gradient(135deg, ${T.brand}, ${T.deepBg})` : T.bg, color: scoreType === t ? "white" : T.sub,
                    border: scoreType === t ? `1px solid ${T.danger}` : `1px solid ${T.line}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
                  {t === "weekly" ? "Weekly" : t + "-Test"}
                </button>
              ))}
            </div>
          </div>
          {scoreType === "weekly" && (
            <div style={{ marginBottom: 10 }}>
              <label style={adminLabel}>Week #</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[1,2,3,4].map(w => (
                  <button key={w} onClick={() => setScoreWeek(w)}
                    style={{ flex: 1, padding: "8px 0", background: scoreWeek === w ? T.brand : T.bg, color: scoreWeek === w ? "white" : T.sub,
                      border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Wk {w}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={adminLabel}>Correct</label>
              <input type="number" value={scoreForm.correct} onChange={e => setScoreForm({...scoreForm, correct: e.target.value})} placeholder="e.g. 18" style={{...adminInput, fontFamily: T.mono}} />
            </div>
            <div>
              <label style={adminLabel}>Total Questions</label>
              <input type="number" value={scoreForm.total} onChange={e => setScoreForm({...scoreForm, total: e.target.value})} placeholder="e.g. 25" style={{...adminInput, fontFamily: T.mono}} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveScore} style={{ flex: 1, padding: "10px 0", background: T.brand, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save Score</button>
            <button onClick={() => setShowScoreEntry(false)} style={{ flex: 1, padding: "10px 0", background: T.bg, color: T.sub, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Patient Entry */}
      {showAddPatient && (
        <div ref={patientEntryRef} style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 16, border: `2px solid ${T.success}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.success, marginBottom: 10 }}>LOG CONSULT</div>
          <div style={{ background: T.infoBg, borderRadius: 10, padding: 10, marginBottom: 12, border: `1px solid ${T.info}`, fontSize: 13, color: T.sub, lineHeight: 1.5 }}>
            <strong style={{ color: T.info }}>No PHI:</strong> {PHI_WARNING}
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={adminLabel}>Assign To</label>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginBottom: 8 }}>
              Select one or more students when they shared the same consult.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {patientAssignmentCandidates.map(student => {
                const selected = patientStudentIds.includes(student.studentId);
                return (
                  <button
                    key={student.studentId}
                    type="button"
                    onClick={() => togglePatientAssignment(student.studentId)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 16,
                      fontSize: 13,
                      fontWeight: selected ? 700 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      background: selected ? T.brand : T.bg,
                      color: selected ? "white" : T.sub,
                      border: selected ? `1.5px solid ${T.brand}` : `1.5px solid ${T.line}`,
                    }}
                  >
                    {selected ? "✓ " : ""}{student.name}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 8 }}>
              {patientStudentIds.length === 1
                ? "1 student selected"
                : `${patientStudentIds.length} students selected`}
            </div>
            {patErrors.assignment && <div style={{ fontSize: 13, color: T.warning, marginTop: 4 }}>{patErrors.assignment}</div>}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Initials</label>
            <input value={patForm.initials} maxLength={LIMITS.INITIALS_MAX} onChange={e => { setPatForm({...patForm, initials: clampLength(e.target.value, LIMITS.INITIALS_MAX)}); setPatErrors(prev => ({ ...prev, initials: undefined })); }} placeholder="J.S." style={adminInput} />
            {patErrors.initials && <div style={{ fontSize: 13, color: T.warning, marginTop: 4 }}>{patErrors.initials}</div>}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Learning Tags</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {visibleAdminTopics.map(t => {
                const sel = patForm.topics.includes(t);
                return (
                  <button key={t} type="button" onClick={() => togglePatTopic(t)}
                    style={{ padding: "5px 10px", borderRadius: 16, fontSize: 13, fontWeight: sel ? 600 : 400, cursor: "pointer", transition: "all 0.15s",
                      background: sel ? T.warning : T.card, color: sel ? T.warningInk : T.sub,
                      border: sel ? `1.5px solid ${T.warning}` : `1.5px solid ${T.line}` }}>
                    {sel ? "✓ " : ""}{t}
                  </button>
                );
              })}
            </div>
            {(hiddenAdminTopicCount > 0 || showAllPatTopics) && (
              <button
                type="button"
                onClick={() => setShowAllPatTopics(prev => !prev)}
                style={{ background: "none", border: "none", padding: "6px 0 0", color: T.warning, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                {showAllPatTopics ? "Show fewer topics" : `More topics (${hiddenAdminTopicCount})`}
              </button>
            )}
            {(patForm.topics.length === 0 || patErrors.topics) && <div style={{ fontSize: 13, color: T.warning, marginTop: 4 }}>{patErrors.topics || "Select at least one"}</div>}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Diagnosis</label>
            <input value={patForm.dx} maxLength={LIMITS.DIAGNOSIS_MAX} onChange={e => { setPatForm({...patForm, dx: clampLength(e.target.value, LIMITS.DIAGNOSIS_MAX)}); setPatErrors(prev => ({ ...prev, dx: undefined })); }} placeholder="e.g. AKI from sepsis" style={adminInput} />
            {patErrors.dx && <div style={{ fontSize: 13, color: T.warning, marginTop: 4 }}>{patErrors.dx}</div>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addPatient} style={{ flex: 1, padding: "10px 0", background: T.brand, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {patientStudentIds.length > 1 ? `Add to ${patientStudentIds.length} Students` : "Add Consult"}
            </button>
            <button onClick={() => { setShowAllPatTopics(false); setShowAddPatient(false); }} style={{ flex: 1, padding: "10px 0", background: T.bg, color: T.sub, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      <h3 style={detailSectionHeadingStyle}>Assessment &amp; Progress</h3>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
        <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>Core Curriculum</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>{progress.coreCompletionPercent}%</div>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>{progress.completedCoreItems}/{progress.totalCoreItems} required items done</div>
        </div>
        <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>Optional References</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>{progress.completedArticles}/{progress.totalArticles}</div>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>Guidelines and long-form readings reviewed</div>
        </div>
        <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>Study Sheets</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>{progress.completedStudySheets}/{progress.totalStudySheets}</div>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>Core summaries marked complete</div>
        </div>
        <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>Teaching Decks</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>{progress.completedDecks}/{progress.totalDecks}</div>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>Core slide decks reviewed</div>
        </div>
        <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>Cases</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>{progress.completedCases}/{progress.totalCases}</div>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>Worked by the student in the app</div>
        </div>
        <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>Quiz Weeks</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>{progress.quizWeeksStarted}/{progress.totalQuizWeeks}</div>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>Required question sets started</div>
        </div>
      </div>

      {/* Score cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}`, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>Pre-Test</div>
          {prePct !== null ? <div style={{ fontSize: 30, fontWeight: 700, color: T.warning, fontFamily: T.mono }}>{prePct}%</div> : <div style={{ fontSize: 14, color: T.muted }}>—</div>}
        </div>
        <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}`, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.success, textTransform: "uppercase" }}>Post-Test</div>
          {postPct !== null ? <div style={{ fontSize: 30, fontWeight: 700, color: T.success, fontFamily: T.mono }}>{postPct}%</div> : <div style={{ fontSize: 14, color: T.muted }}>—</div>}
        </div>
      </div>

      {prePct !== null && postPct !== null && (
        <div style={{ background: T.ice, borderRadius: 12, padding: 14, marginBottom: 16, textAlign: "center", borderLeft: `4px solid ${T.success}` }}>
          <span style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>Growth: </span>
          <span style={{ fontSize: 20, fontWeight: 700, color: T.success, fontFamily: T.mono }}>+{postPct - prePct}%</span>
        </div>
      )}

      {/* Weekly Scores */}
      <h3 style={detailSectionHeadingStyle}>Weekly Quizzes</h3>
      {[1,2,3,4].map(w => {
        const ws = wkScores[w] || [];
        const best = ws.length > 0 ? Math.max(...ws.map(x => Math.round((x.correct/x.total)*100))) : null;
        return (
          <div key={w} style={{ background: T.card, borderRadius: 10, padding: 12, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${T.line}` }}>
            <div>
              <div style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>Module {w}</div>
              <div style={{ fontSize: 13, color: T.muted }}>{ws.length} attempt{ws.length !== 1 ? "s" : ""}</div>
            </div>
            {best !== null ? (
              <div style={{ fontSize: 18, fontWeight: 700, color: best >= 80 ? T.success : best >= 60 ? T.warning : T.danger, fontFamily: T.mono }}>{best}%</div>
            ) : <div style={{ fontSize: 13, color: T.muted }}>—</div>}
          </div>
        );
      })}

      {/* Patients */}
      <h3 style={detailSectionHeadingStyle}>Consult Log ({patients.length})</h3>
      {patients.length === 0 ? (
        <div style={{ background: T.card, borderRadius: 10, padding: 20, textAlign: "center", color: T.muted, border: `1px solid ${T.line}` }}>No consults logged</div>
      ) : (
        <div style={{ background: T.card, borderRadius: 12, padding: 14, border: `1px solid ${T.line}` }}>
          {patients.map((p, i) => {
            const ts = p.topics || (p.topic ? [p.topic] : []);
            return (
            <div key={i} style={{ padding: "8px 0", borderBottom: i < patients.length - 1 ? `1px solid ${T.line}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600, color: T.navy, fontSize: 13 }}>{p.initials}</span>
                {ts.map(t => <span key={t} style={{ fontSize: 13, color: "white", background: T.brand, padding: "1px 6px", borderRadius: 6, fontWeight: 600 }}>{t}</span>)}
                <span style={{ fontSize: 13, color: T.muted, marginLeft: "auto" }}>{new Date(p.date).toLocaleDateString()}</span>
              </div>
              {p.dx && <div style={{ fontSize: 13, color: T.sub, marginTop: 2, wordBreak: "break-word" }}>{p.dx}</div>}
            </div>
            );
          })}
        </div>
      )}

      {/* Feedback Tags */}
      <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, fontFamily: T.serif }}>Attending Feedback</div>
          <button onClick={() => setShowAddFeedback(!showAddFeedback)}
            style={{ fontSize: 13, color: T.info, background: T.infoBg, border: "none", padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            {showAddFeedback ? "Cancel" : "+ Add"}
          </button>
        </div>
        {(s.feedbackTags || []).length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: showAddFeedback ? 12 : 0 }}>
            {(s.feedbackTags || []).map((ft, i) => (
              <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: T.infoBg, padding: "4px 10px", borderRadius: 8, border: `1px solid ${T.muted}` }}>
                <span style={{ fontSize: 13, color: T.info, fontWeight: 600 }}>{ft.tag}</span>
                {ft.note && <span style={{ fontSize: 13, color: T.muted }}>— {ft.note}</span>}
                <span style={{ fontSize: 13, color: T.muted }}>{new Date(ft.date).toLocaleDateString()}</span>
                <button onClick={() => {
                  const updated = (s.feedbackTags || []).filter((_, idx) => idx !== i);
                  updateStudent({ feedbackTags: updated });
                }} style={{ background: "none", border: "none", color: T.muted, fontSize: 13, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>x</button>
              </div>
            ))}
          </div>
        ) : !showAddFeedback && (
          <div style={{ fontSize: 13, color: T.muted, fontStyle: "italic" }}>No feedback yet</div>
        )}
        {showAddFeedback && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Quick Tags</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {FEEDBACK_TAGS.map(tag => (
                <button key={tag} onClick={() => {
                  const newTag: FeedbackTag = { tag, date: new Date().toISOString(), note: feedbackNote.trim() || undefined };
                  updateStudent({ feedbackTags: [...(s.feedbackTags || []), newTag] });
                  setFeedbackNote("");
                  setShowAddFeedback(false);
                }}
                  style={{ padding: "6px 12px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", background: T.card, color: T.text, border: `1px solid ${T.line}` }}>
                  {tag}
                </button>
              ))}
            </div>
            <input value={feedbackNote} onChange={e => setFeedbackNote(e.target.value)} placeholder="Optional note (e.g. specific topic)"
              style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: `1px solid ${T.line}`, borderRadius: 8, outline: "none", fontFamily: T.sans, boxSizing: "border-box", marginBottom: 8 }} />
            <input
              placeholder="Or type a custom tag and press Enter"
              onKeyDown={e => {
                if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                  const newTag: FeedbackTag = { tag: (e.target as HTMLInputElement).value.trim(), date: new Date().toISOString(), note: feedbackNote.trim() || undefined };
                  updateStudent({ feedbackTags: [...(s.feedbackTags || []), newTag] });
                  (e.target as HTMLInputElement).value = "";
                  setFeedbackNote("");
                  setShowAddFeedback(false);
                }
              }}
              style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: `1px solid ${T.line}`, borderRadius: 8, outline: "none", fontFamily: T.sans, boxSizing: "border-box" }} />
          </div>
        )}
      </div>

      {/* Device Recovery */}
      <div style={{ background: T.bg, borderRadius: 14, padding: 16, marginTop: 16, border: `1px dashed ${T.line}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
          Advanced
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.navy, fontFamily: T.serif, marginBottom: 6 }}>Device Recovery</div>
        <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginBottom: 12 }}>
          Only use this if the student had to join on a new phone or browser and a second blank record was created.
        </div>
        {recoveryCandidates.length === 0 ? (
          <div style={{ fontSize: 13, color: T.muted, fontStyle: "italic" }}>
            No other student records available yet. Once the new device joins, refresh this page and select the new record here.
          </div>
        ) : (
          <>
            <label style={adminLabel}>New Device Record</label>
            <select value={recoveryTargetId} onChange={e => setRecoveryTargetId(e.target.value)}
              style={{ ...adminInput, marginBottom: 10 }}>
              {recoveryCandidates.map(candidate => {
                const candidateQuizCount = Object.values(candidate.weeklyScores || {}).flat().length;
                const lastSeen = candidate.lastSyncedAt ? new Date(candidate.lastSyncedAt).toLocaleString() : "not synced yet";
                return (
                  <option key={candidate.studentId} value={candidate.studentId}>
                    {candidate.name} • {candidate.studentId.slice(0, 8)}... • {candidate.patients.length} consults • {candidateQuizCount} quizzes • {lastSeen}
                  </option>
                );
              })}
            </select>
            <button onClick={handleRecovery} disabled={recoveryBusy}
              style={{ padding: "10px 14px", background: recoveryBusy ? T.muted : T.brand, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: recoveryBusy ? "not-allowed" : "pointer" }}>
              {recoveryBusy ? "Moving Progress..." : "Move Progress To New Device Record"}
            </button>
            {recoveryError && <div style={{ fontSize: 13, color: T.danger, marginTop: 8 }}>{recoveryError}</div>}
          </>
        )}
      </div>
    </div>
  );
}
