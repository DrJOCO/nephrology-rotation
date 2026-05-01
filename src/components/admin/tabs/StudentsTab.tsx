import React, { useState } from "react";
import { T } from "../../../data/constants";
import { adminInput, adminLabel, type AdminConfirmOptions, type AdminToastTone } from "../shared";
import type { NavigateFn, ArticlesData } from "../types";
import type { AdminStudent, AdminSubView, SharedSettings } from "../../../types";
import { buildAdminCompetencySnapshot, buildAdminAssessmentSignal } from "../lib/student-analytics";
import { buildDuplicateNameGroups, buildDuplicateStudentIdSet } from "../lib/duplicates";
import { getScorePct, getMinutesSince } from "../lib/format";

export function StudentsTab({ students, setStudents, navigate, rotationCode, settings, articles, duplicateReview = false, deleteStudentRecord, writeStudentToFirestore, requestConfirm, showToast }: { students: AdminStudent[]; setStudents: React.Dispatch<React.SetStateAction<AdminStudent[]>>; navigate: NavigateFn; rotationCode: string; settings: SharedSettings; articles: ArticlesData; duplicateReview?: boolean; deleteStudentRecord: (student: AdminStudent) => Promise<void>; writeStudentToFirestore: (studentId: string, data: Record<string, unknown>) => void; requestConfirm: (options: AdminConfirmOptions) => Promise<boolean>; showToast: (message: string, tone?: AdminToastTone) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", year: "MS3", startDate: "" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [syncFilter, setSyncFilter] = useState<"all" | "fresh" | "stale" | "unsynced" | "needsAssessment">("all");
  const [sortBy, setSortBy] = useState<"name" | "newest" | "oldest" | "masteryLow" | "masteryHigh" | "syncOldest" | "syncNewest">("name");
  const isConnected = !!rotationCode;
  const duplicateNameGroups = buildDuplicateNameGroups(students.filter((student) => student.status === "active"));
  const duplicateStudentIds = buildDuplicateStudentIdSet(duplicateNameGroups);

  const addStudent = () => {
    if (!form.name.trim()) return;
    const s: AdminStudent = {
      ...form, id: Date.now(), studentId: String(Date.now()), status: "active", addedDate: new Date().toISOString(),
      patients: [], weeklyScores: {}, preScore: null, postScore: null, gamification: undefined, srQueue: {}, activityLog: [],
    };
    setStudents(prev => [...prev, s]);
    setForm({ name: "", email: "", year: "MS3", startDate: "" });
    setShowAdd(false);
    showToast(`${s.name} added to the roster.`, "success");
  };

  const removeStudent = async (student: AdminStudent) => {
    const confirmed = await requestConfirm({
      title: `Remove ${student.name}?`,
      message: "Their saved data for this rotation will be removed.",
      confirmLabel: "Remove Student",
      tone: "danger",
    });
    if (!confirmed) return;
    await deleteStudentRecord(student);
    showToast(`${student.name} was removed from the rotation.`, "success");
  };

  const toggleStatus = (id: number | string) => {
    const target = students.find(s => s.id === id);
    if (!target) return;
    const nextStatus = target.status === "active" ? "completed" : "active";
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status: nextStatus } : s));
    if (isConnected && target.studentId) {
      writeStudentToFirestore(target.studentId, { status: nextStatus });
    }
    showToast(
      nextStatus === "completed"
        ? `${target.name} marked complete. They keep app access; you stop seeing them in teaching call-outs.`
        : `${target.name} reactivated.`,
      "success",
    );
  };

  const yearOptions = Array.from(new Set(students.map((student) => student.year).filter((value): value is string => !!value))).sort((a, b) => a.localeCompare(b));
  const filteredStudents = students
    .filter((student) => {
      const searchTarget = `${student.name} ${student.email || ""}`.toLowerCase();
      if (duplicateReview && !duplicateStudentIds.has(student.id)) return false;
      if (search.trim() && !searchTarget.includes(search.trim().toLowerCase())) return false;
      if (statusFilter !== "all" && student.status !== statusFilter) return false;
      if (yearFilter !== "all" && (student.year || "") !== yearFilter) return false;
      if (syncFilter === "fresh") {
        const minutes = getMinutesSince(student.lastSyncedAt || null);
        if (minutes === null || minutes > 10) return false;
      }
      if (syncFilter === "stale") {
        const minutes = getMinutesSince(student.lastSyncedAt || null);
        if (minutes !== null && minutes <= 60) return false;
      }
      if (syncFilter === "unsynced" && student.lastSyncedAt) return false;
      if (syncFilter === "needsAssessment" && student.preScore && student.postScore) return false;
      return true;
    })
    .slice()
    .sort((a, b) => {
      if (sortBy === "newest") return (b.addedDate || "").localeCompare(a.addedDate || "");
      if (sortBy === "oldest") return (a.addedDate || "").localeCompare(b.addedDate || "");
      if (sortBy === "masteryLow") return buildAdminCompetencySnapshot(a, settings, articles).masteryPercent - buildAdminCompetencySnapshot(b, settings, articles).masteryPercent;
      if (sortBy === "masteryHigh") return buildAdminCompetencySnapshot(b, settings, articles).masteryPercent - buildAdminCompetencySnapshot(a, settings, articles).masteryPercent;
      if (sortBy === "syncNewest") return (b.lastSyncedAt || "").localeCompare(a.lastSyncedAt || "");
      if (sortBy === "syncOldest") return (a.lastSyncedAt || "").localeCompare(b.lastSyncedAt || "");
      return a.name.localeCompare(b.name);
    });

  const active = filteredStudents.filter(s => s.status === "active");
  const completed = filteredStudents.filter(s => s.status === "completed");
  const needsAssessmentCount = students.filter((student) => !student.preScore || !student.postScore).length;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ color: T.text, fontSize: 20, margin: 0, fontFamily: T.serif, fontWeight: 700 }}>{duplicateReview ? "Review Duplicates" : "Students"}</h2>
        {!isConnected && (
          <button onClick={() => setShowAdd(!showAdd)}
            style={{ padding: "8px 16px", background: showAdd ? T.sub : T.warning, color: showAdd ? "white" : T.warningInk, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {showAdd ? "Cancel" : "+ Add Student"}
          </button>
        )}
      </div>

      {isConnected && (
        <div style={{ background: T.infoBg, borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: T.navy, lineHeight: 1.5 }}>
          📡 Connected to rotation <strong>{rotationCode}</strong>. Students appear here automatically when they join with the rotation code. Use <strong>Remove</strong> for test users, duplicates, or mistaken joins.
        </div>
      )}

      {duplicateReview && (
        <div style={{ background: T.warningBg, border: `1px solid ${T.warning}55`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginBottom: duplicateNameGroups.length > 0 ? 12 : 0 }}>
            <div>
              <div style={{ color: T.warning, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4 }}>Duplicate Review</div>
              <div style={{ color: T.navy, fontSize: 15, fontWeight: 800, marginTop: 3 }}>{duplicateNameGroups.length} active duplicate-name group{duplicateNameGroups.length === 1 ? "" : "s"}</div>
              <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.5, marginTop: 3 }}>Open the real learner record, remove test joins, or mark older records complete.</div>
            </div>
            <button onClick={() => navigate("students")} style={{ padding: "8px 12px", background: T.card, color: T.navy, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
              Show Full Roster
            </button>
          </div>

          {duplicateNameGroups.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {duplicateNameGroups.map((group) => (
                <div key={group.map((student) => student.id).join("-")} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: 12 }}>
                  <div style={{ color: T.navy, fontSize: 14, fontWeight: 800, marginBottom: 8 }}>{group[0].name}</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {group.map((student) => (
                      <div key={student.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", background: T.bg, borderRadius: 10, padding: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: T.text, fontWeight: 800 }}>{student.email || "No email"} · {student.year || "Year not set"}</div>
                          <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
                            {student.status} · {(student.patients || []).length} consults · {student.lastSyncedAt ? `synced ${new Date(student.lastSyncedAt).toLocaleDateString()}` : "never synced"}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button onClick={() => navigate("students", { type: "studentDetail", id: String(student.id) })} style={{ padding: "7px 10px", background: T.card, color: T.navy, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Open</button>
                          <button onClick={() => toggleStatus(student.id)} style={{ padding: "7px 10px", background: T.bg, color: T.sub, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{student.status === "active" ? "Complete" : "Reactivate"}</button>
                          <button onClick={() => { void removeStudent(student); }} style={{ padding: "7px 10px", background: T.dangerBg, color: T.danger, border: `1px solid ${T.danger}`, borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: T.successBg, color: T.success, border: `1px solid ${T.success}`, borderRadius: 12, padding: "10px 12px", fontSize: 13, fontWeight: 800 }}>
              No active duplicate-name records right now.
            </div>
          )}
        </div>
      )}

      <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 }}>
          <div style={{ background: T.bg, borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 13, color: T.muted, textTransform: "uppercase", fontWeight: 700 }}>Roster</div>
            <div style={{ fontSize: 24, color: T.navy, fontWeight: 700, fontFamily: T.mono }}>{students.length}</div>
          </div>
          <div style={{ background: T.bg, borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 13, color: T.muted, textTransform: "uppercase", fontWeight: 700 }}>Active</div>
            <div style={{ fontSize: 24, color: T.navy, fontWeight: 700, fontFamily: T.mono }}>{students.filter((student) => student.status === "active").length}</div>
          </div>
          <div style={{ background: T.bg, borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 13, color: T.muted, textTransform: "uppercase", fontWeight: 700 }}>Need Assessment</div>
            <div style={{ fontSize: 24, color: needsAssessmentCount > 0 ? T.danger : T.navy, fontWeight: 700, fontFamily: T.mono }}>{needsAssessmentCount}</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email, or PIN" style={adminInput} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} style={adminInput}>
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="completed">Completed only</option>
            </select>
            <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} style={adminInput}>
              <option value="all">All years</option>
              {yearOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select value={syncFilter} onChange={(event) => setSyncFilter(event.target.value as typeof syncFilter)} style={adminInput}>
              <option value="all">All sync states</option>
              <option value="fresh">Synced in 10 min</option>
              <option value="stale">Stale or never synced</option>
              <option value="unsynced">Never synced</option>
              <option value="needsAssessment">Missing assessment</option>
            </select>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} style={adminInput}>
              <option value="name">Sort: Name</option>
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="masteryLow">Sort: Lowest mastery</option>
              <option value="masteryHigh">Sort: Highest mastery</option>
              <option value="syncOldest">Sort: Oldest sync</option>
              <option value="syncNewest">Sort: Newest sync</option>
            </select>
          </div>
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 10 }}>
          Showing {filteredStudents.length} of {students.length} students{duplicateReview ? " in duplicate review" : ""}.
        </div>
      </div>

      {!isConnected && showAdd && (
        <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `2px solid ${T.warning}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={adminLabel}>Student Name *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Nora Phron" style={adminInput} />
            </div>
            <div>
              <label style={adminLabel}>Year</label>
              <select value={form.year} onChange={e => setForm({...form, year: e.target.value})} style={adminInput}>
                <option value="MS3">MS3</option>
                <option value="MS4">MS4</option>
                <option value="PA Student">PA Student</option>
                <option value="NP Student">NP Student</option>
                <option value="Resident">Resident</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={adminLabel}>Email (optional)</label>
              <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@med.edu" style={adminInput} />
            </div>
            <div>
              <label style={adminLabel}>Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} style={adminInput} />
            </div>
          </div>
          <button onClick={addStudent} style={{ width: "100%", padding: "12px 0", background: T.brand, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Add Student
          </button>
        </div>
      )}

      {/* Active students */}
      {active.length === 0 && completed.length === 0 && !showAdd && (
        <div style={{ textAlign: "center", padding: 40, color: T.sub }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎓</div>
          <div style={{ fontSize: 14 }}>{students.length === 0 ? "No students yet" : "No students match these filters"}</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>{students.length === 0 ? (isConnected ? "Students will appear when they join with the rotation code" : "Add your first student above") : "Try clearing a filter or search term."}</div>
        </div>
      )}

      {active.map(s => (
        <StudentRow key={s.id} student={s} navigate={navigate} onToggle={() => toggleStatus(s.id)} onRemove={() => { void removeStudent(s); }} settings={settings} articles={articles} />
      ))}

      {completed.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, margin: "20px 0 10px", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Completed Rotations ({completed.length})
          </div>
          {completed.map(s => (
            <StudentRow key={s.id} student={s} navigate={navigate} onToggle={() => toggleStatus(s.id)} onRemove={() => { void removeStudent(s); }} dimmed settings={settings} articles={articles} />
          ))}
        </>
      )}
    </div>
  );
}

function StudentRow({ student: s, navigate, onToggle, onRemove, dimmed, settings, articles }: { student: AdminStudent; navigate: (t: string, sv?: AdminSubView) => void; onToggle: (() => void) | null; onRemove: (() => void) | null; dimmed?: boolean; settings: SharedSettings; articles: ArticlesData }) {
  const prePct = getScorePct(s.preScore);
  const postPct = getScorePct(s.postScore);
  const competency = buildAdminCompetencySnapshot(s, settings, articles);
  const assessment = buildAdminAssessmentSignal(s);
  const teachingLine = assessment?.summary
    ? `Teach next: ${assessment.summary.recommendedArea.shortLabel}${assessment.summary.recommendedArea.missedTopics[0] ? ` — ${assessment.summary.recommendedArea.missedTopics[0]}` : ""}`
    : assessment
      ? "Assessment detail appears when completed in-app"
      : "No assessment yet";

  return (
    <div style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}`, opacity: dimmed ? 0.6 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <button onClick={() => navigate("students", { type: "studentDetail", id: String(s.id) })}
          style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>{s.name}</span>
            <span style={{ fontSize: 13, color: "white", background: T.brand, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{s.year}</span>
          </div>
          <div style={{ fontSize: 13, color: T.sub }}>
            {(s.patients || []).length} consults • Started {(s as AdminStudent & { startDate?: string }).startDate || new Date(s.addedDate).toLocaleDateString()}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <span style={{ fontSize: 13, background: T.ice, color: T.navy, padding: "4px 9px", borderRadius: 999, fontWeight: 700 }}>
              {competency.masteryPercent}% mastery
            </span>
            <span style={{ fontSize: 13, background: T.bg, color: T.sub, padding: "4px 9px", borderRadius: 999, fontWeight: 600 }}>
              {competency.profileLine}
            </span>
            <span style={{ fontSize: 13, background: assessment?.summary ? T.dangerBg : T.bg, color: assessment?.summary ? T.danger : T.muted, padding: "4px 9px", borderRadius: 999, fontWeight: 700 }}>
              {teachingLine}
            </span>
          </div>
          {/* Score bars */}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            {prePct !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 13, color: T.muted }}>Pre:</span>
                <div style={{ width: 60, height: 6, background: T.grayBg, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${prePct}%`, height: "100%", background: T.warning, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.warning, fontFamily: T.mono }}>{prePct}%</span>
              </div>
            )}
            {postPct !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 13, color: T.muted }}>Post:</span>
                <div style={{ width: 60, height: 6, background: T.grayBg, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${postPct}%`, height: "100%", background: T.success, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.success, fontFamily: T.mono }}>{postPct}%</span>
              </div>
            )}
          </div>
        </button>
        {(onToggle || onRemove) && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {onToggle && (
              <button onClick={onToggle} style={{ background: "none", border: `1px solid ${dimmed ? T.success : T.muted}`, borderRadius: 6, padding: "4px 8px", fontSize: 13, cursor: "pointer", color: dimmed ? T.success : T.sub }}>
                {dimmed ? "↩ Reactivate" : "✓ Complete"}
              </button>
            )}
            {onRemove && (
              <button onClick={onRemove} style={{ background: T.dangerBg, border: `1px solid ${T.danger}`, borderRadius: 6, padding: "4px 10px", fontSize: 13, cursor: "pointer", color: T.danger, fontWeight: 700 }}>Remove</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
