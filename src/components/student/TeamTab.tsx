import { useState, useEffect } from "react";
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
        <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
        <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: "0 0 8px" }}>Team Board</h2>
        <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.6 }}>
          Join a rotation to see your team&apos;s shared learning snapshot.
        </p>
      </div>
    );
  }

  if (teamLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: T.muted, fontSize: 14 }}>Loading team data...</div>;
  }

  const sorted = [...teammates].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  const totalPatients = teammates.reduce((sum, s) => sum + s.patientCount, 0);
  const totalPoints = teammates.reduce((sum, s) => sum + s.points, 0);
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
      <h2 style={{ color: T.text, fontSize: 18, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Team Board</h2>
      <div style={{ color: T.muted, fontSize: 11, marginBottom: 16 }}>
        {teammates.length} student{teammates.length !== 1 ? "s" : ""} • {totalPatients} logged patient{totalPatients !== 1 ? "s" : ""} • {totalPoints} total pts
      </div>

      <div style={{ background: `linear-gradient(135deg, ${T.navyBg}, ${T.deepBg})`, borderRadius: 14, padding: 16, marginBottom: 16, color: "white" }}>
        <h3 style={{ fontFamily: T.serif, color: "white", fontSize: 14, margin: "0 0 14px", fontWeight: 700 }}>🏆 Leaderboard</h3>
        {sorted.length === 0 ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 13, padding: 12 }}>No students yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sorted.map((student, idx) => {
              const isMe = student.studentId === currentStudentId;
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <div key={student.studentId} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: isMe ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                  borderRadius: 8, padding: "8px 10px",
                  border: isMe ? "1px solid rgba(255,255,255,0.3)" : "1px solid transparent",
                }}>
                  <div style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>
                    {idx < 3 ? medals[idx] : <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: 700 }}>{idx + 1}</span>}
                  </div>
                  <div style={{ fontSize: 20, flexShrink: 0 }}>{student.levelIcon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {student.name || "Unknown"}{isMe ? " (You)" : ""}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>
                      {student.levelName} • {student.patientCount} patient{student.patientCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, fontFamily: T.mono, color: "#F0C866" }}>{student.points}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>pts</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, marginBottom: 8, fontFamily: T.serif }}>Shared Snapshot</div>
        <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.5, marginBottom: topCohortTopics.length > 0 ? 10 : 0 }}>
          Team view shows sanitized counts and topic exposure only. Patient names, diagnoses, rooms, and notes stay out of peer-facing views.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: topCohortTopics.length > 0 ? 10 : 0 }}>
          <span style={{ fontSize: 11, color: T.med, background: T.blueBg, padding: "4px 10px", borderRadius: 999, fontWeight: 600 }}>
            {totalActivePatients} active patients
          </span>
          <span style={{ fontSize: 11, color: T.greenDk, background: T.greenBg, padding: "4px 10px", borderRadius: 999, fontWeight: 600 }}>
            {Object.keys(cohortTopicCounts).length} topics seen
          </span>
        </div>
        {topCohortTopics.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {topCohortTopics.map(({ topic, count }) => (
              <span key={topic} style={{ fontSize: 11, color: T.navy, background: T.ice, padding: "4px 10px", borderRadius: 999, fontWeight: 600 }}>
                {topic} x{count}
              </span>
            ))}
          </div>
        )}
      </div>

      <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 15, margin: "0 0 12px", fontWeight: 700 }}>📋 Student Snapshots</h3>
      {sorted.map((student) => {
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
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                  {student.activePatientCount} active • {student.dischargedPatientCount} discharged • {student.patientCount} total
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
                      <span key={topic} style={{ fontSize: 11, color: T.navy, background: T.ice, padding: "5px 10px", borderRadius: 999, fontWeight: 600 }}>
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

      {sorted.length === 0 && (
        <div style={{ background: T.card, borderRadius: 14, padding: 24, textAlign: "center", color: T.muted, border: `1px solid ${T.line}` }}>
          No students have published snapshots yet.
        </div>
      )}
    </div>
  );
}
