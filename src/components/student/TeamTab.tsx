import { useState, useEffect } from "react";
import { Users, ClipboardList } from "lucide-react";
import { T } from "../../data/constants";
import store from "../../utils/store";
import { sortTopicCounts } from "../../utils/teamSnapshots";
import type { TeamSnapshot } from "../../types";

export default function TeamTab({ currentStudentId }: { currentStudentId: string }) {
  const [teammates, setTeammates] = useState<TeamSnapshot[]>([]);
  const [teamLoading, setTeamLoading] = useState(() => !!store.getRotationCode());
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  useEffect(() => {
    if (!store.getRotationCode()) return;
    const unsub = store.onTeamSnapshotsChanged((snapshots) => {
      setTeammates((snapshots as TeamSnapshot[]).filter(snapshot => snapshot.studentId));
      setTeamLoading(false);
    });
    return () => unsub();
  }, []);

  if (!store.getRotationCode()) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <Users size={48} strokeWidth={1.5} color={T.muted} aria-hidden="true" style={{ marginBottom: 12 }} />
        <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: "0 0 8px" }}>Cohort Snapshot</h2>
        <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.6 }}>
          Join a rotation to see your cohort&apos;s shared learning snapshot.
        </p>
      </div>
    );
  }

  if (teamLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: T.muted, fontSize: 14 }}>Loading team data...</div>;
  }

  const snapshotStudents = [...teammates].sort((a, b) => {
    const aIsMe = a.studentId === currentStudentId ? 0 : 1;
    const bIsMe = b.studentId === currentStudentId ? 0 : 1;
    return aIsMe - bIsMe || b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name);
  });
  const totalPatients = teammates.reduce((sum, s) => sum + s.patientCount, 0);
  const totalActivePatients = teammates.reduce((sum, s) => sum + s.activePatientCount, 0);
  const cohortTopicCounts = teammates.reduce<Record<string, number>>((acc, student) => {
    Object.entries(student.topicCounts || {}).forEach(([topic, count]) => {
      acc[topic] = (acc[topic] || 0) + count;
    });
    return acc;
  }, {});
  const topCohortTopics = sortTopicCounts(cohortTopicCounts, 5);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 18, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Cohort Snapshot</h2>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: 16 }}>
        {teammates.length} student{teammates.length !== 1 ? "s" : ""} sharing this code • {totalPatients} logged patient{totalPatients !== 1 ? "s" : ""} • built for shared visibility, not ranking
      </div>

      <div style={{ background: T.ice, borderRadius: 14, padding: 16, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 14, margin: "0 0 8px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <Users size={16} strokeWidth={1.75} aria-hidden="true" /> Shared progress view
        </h3>
        <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.6, marginBottom: 12 }}>
          This view is intentionally non-ranked. It keeps the cohort visible to each other without turning the rotation into a competition.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: T.med, background: T.blueBg, padding: "4px 10px", borderRadius: 999, fontWeight: 600 }}>
            {totalActivePatients} active patients
          </span>
          <span style={{ fontSize: 13, color: T.greenDk, background: T.greenBg, padding: "4px 10px", borderRadius: 999, fontWeight: 600 }}>
            {Object.keys(cohortTopicCounts).length} topics seen
          </span>
          <span style={{ fontSize: 13, color: T.navy, background: T.card, padding: "4px 10px", borderRadius: 999, fontWeight: 600, border: `1px solid ${T.line}` }}>
            Shared rotation code
          </span>
        </div>
      </div>

      <div style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, marginBottom: 8, fontFamily: T.serif }}>Shared Snapshot</div>
        <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginBottom: topCohortTopics.length > 0 ? 10 : 0 }}>
          Team view shows sanitized counts and topic exposure only. Patient names, diagnoses, rooms, and notes stay out of peer-facing views.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: topCohortTopics.length > 0 ? 10 : 0 }}>
          <span style={{ fontSize: 13, color: T.med, background: T.blueBg, padding: "4px 10px", borderRadius: 999, fontWeight: 600 }}>
            {totalActivePatients} active patients
          </span>
          <span style={{ fontSize: 13, color: T.greenDk, background: T.greenBg, padding: "4px 10px", borderRadius: 999, fontWeight: 600 }}>
            {Object.keys(cohortTopicCounts).length} topics seen
          </span>
        </div>
        {topCohortTopics.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {topCohortTopics.map(({ topic, count }) => (
              <span key={topic} style={{ fontSize: 13, color: T.navy, background: T.ice, padding: "4px 10px", borderRadius: 999, fontWeight: 600 }}>
                {topic} x{count}
              </span>
            ))}
          </div>
        )}
      </div>

      <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 15, margin: "0 0 12px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
        <ClipboardList size={16} strokeWidth={1.75} aria-hidden="true" /> Rotation Snapshots
      </h3>
      {snapshotStudents.map((student) => {
        const isMe = student.studentId === currentStudentId;
        const isExpanded = expandedStudent === student.studentId;
        const topTopics = sortTopicCounts(student.topicCounts || {}, 4);

        return (
          <div key={student.studentId} style={{
            background: T.card, borderRadius: 12, padding: 12, marginBottom: 10,
            border: isMe ? `2px solid ${T.med}` : `1px solid ${T.line}`,
          }}>
            <button onClick={() => setExpandedStudent(isExpanded ? null : student.studentId)}
              style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>
                  {student.name || "Unknown"}{isMe ? " (You)" : ""}
                </div>
                <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>
                  {student.activePatientCount} active • {student.dischargedPatientCount} discharged • {student.patientCount} total patients
                </div>
              </div>
              <span style={{ fontSize: 16, color: T.muted, transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
            </button>

            {isExpanded && (
              <div style={{ marginTop: 12 }}>
                {topTopics.length === 0 ? (
                  <div style={{ textAlign: "center", color: T.muted, fontSize: 13, padding: 10 }}>No topic snapshots yet</div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {topTopics.map(({ topic, count }) => (
                      <span key={topic} style={{ fontSize: 13, color: T.navy, background: T.ice, padding: "5px 10px", borderRadius: 999, fontWeight: 600 }}>
                        {topic} x{count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {snapshotStudents.length === 0 && (
        <div style={{ background: T.card, borderRadius: 14, padding: 24, textAlign: "center", color: T.muted, border: `1px solid ${T.line}` }}>
          No students have published snapshots yet.
        </div>
      )}
    </div>
  );
}
