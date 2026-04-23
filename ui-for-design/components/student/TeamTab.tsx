import { useEffect, useState } from "react";
import { Trophy, Users } from "lucide-react";
import { T } from "../../data/constants";
import store from "../../utils/store";
import { sortTopicCounts } from "../../utils/teamSnapshots";
import type { TeamSnapshot } from "../../types";

function getRankLabel(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default function TeamTab({ currentStudentId }: { currentStudentId: string }) {
  const [teammates, setTeammates] = useState<TeamSnapshot[]>([]);
  const [teamLoading, setTeamLoading] = useState(() => !!store.getRotationCode());
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  useEffect(() => {
    if (!store.getRotationCode()) return;
    const unsub = store.onTeamSnapshotsChanged((snapshots) => {
      setTeammates((snapshots as TeamSnapshot[]).filter((snapshot) => snapshot.studentId));
      setTeamLoading(false);
    });
    return () => unsub();
  }, []);

  if (!store.getRotationCode()) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <Users size={48} strokeWidth={1.5} color={T.muted} aria-hidden="true" style={{ marginBottom: 12 }} />
        <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: "0 0 8px" }}>Leaderboard</h2>
        <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.6 }}>
          Join a rotation to see your cohort&apos;s points, levels, and shared learning snapshot.
        </p>
      </div>
    );
  }

  if (teamLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: T.muted, fontSize: 14 }}>Loading team data...</div>;
  }

  const leaderboard = [...teammates].sort((a, b) => b.points - a.points || b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name));
  const myRank = leaderboard.findIndex((student) => student.studentId === currentStudentId) + 1;
  const totalPatients = teammates.reduce((sum, student) => sum + student.patientCount, 0);
  const totalActivePatients = teammates.reduce((sum, student) => sum + student.activePatientCount, 0);
  const totalPoints = teammates.reduce((sum, student) => sum + (student.points || 0), 0);
  const cohortTopicCounts = teammates.reduce<Record<string, number>>((acc, student) => {
    Object.entries(student.topicCounts || {}).forEach(([topic, count]) => {
      acc[topic] = (acc[topic] || 0) + count;
    });
    return acc;
  }, {});
  const topCohortTopics = sortTopicCounts(cohortTopicCounts, 5);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 18, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Leaderboard</h2>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: 16 }}>
        {teammates.length} student{teammates.length !== 1 ? "s" : ""} sharing this code • {totalPatients} logged patient{totalPatients !== 1 ? "s" : ""} • points reward quizzes, study sheets, cases, patient logs, and spaced repetition
      </div>

      <div style={{ background: T.ice, borderRadius: 14, padding: 16, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 14, margin: "0 0 8px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <Trophy size={16} strokeWidth={1.75} aria-hidden="true" /> Friendly competition
        </h3>
        <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.6, marginBottom: 12 }}>
          The motivating layer is back. Students can see rank and points, while the broader clinical exposure snapshot stays visible below.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: T.goldText, background: T.yellowBg, padding: "4px 10px", borderRadius: 999, fontWeight: 600 }}>
            {totalPoints} cohort pts
          </span>
          <span style={{ fontSize: 13, color: T.med, background: T.blueBg, padding: "4px 10px", borderRadius: 999, fontWeight: 600 }}>
            {totalActivePatients} active patients
          </span>
          <span style={{ fontSize: 13, color: T.greenDk, background: T.greenBg, padding: "4px 10px", borderRadius: 999, fontWeight: 600 }}>
            {Object.keys(cohortTopicCounts).length} topics seen
          </span>
          {myRank > 0 && (
            <span style={{ fontSize: 13, color: T.navy, background: T.card, padding: "4px 10px", borderRadius: 999, fontWeight: 600, border: `1px solid ${T.line}` }}>
              Your rank #{myRank}
            </span>
          )}
        </div>
      </div>

      <div style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, marginBottom: 8, fontFamily: T.serif }}>How this stays safe</div>
        <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>
          Students only see names, point totals, levels, patient counts, and broad topic exposure here. Patient identifiers, diagnoses tied to names, rooms, and notes stay out of the leaderboard.
        </div>
      </div>

      <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 15, margin: "0 0 12px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
        <Trophy size={16} strokeWidth={1.75} aria-hidden="true" /> Cohort leaderboard
      </h3>
      {leaderboard.map((student, index) => {
        const isMe = student.studentId === currentStudentId;
        const isExpanded = expandedStudent === student.studentId;
        const topTopics = sortTopicCounts(student.topicCounts || {}, 4);
        const rank = index + 1;

        return (
          <div
            key={student.studentId}
            style={{
              background: T.card,
              borderRadius: 12,
              padding: 12,
              marginBottom: 10,
              border: isMe ? `2px solid ${T.med}` : rank <= 3 ? `1px solid ${T.gold}` : `1px solid ${T.line}`,
            }}
          >
            <button
              onClick={() => setExpandedStudent(isExpanded ? null : student.studentId)}
              style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ minWidth: 44, textAlign: "center", fontSize: 16, fontWeight: 700, color: T.navy }}>
                  {getRankLabel(rank)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>
                    {student.name || "Unknown"}{isMe ? " (You)" : ""}
                  </div>
                  <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>
                    {student.levelIcon} {student.levelName} • {student.activePatientCount} active • {student.patientCount} total patients
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: T.goldText, fontFamily: T.mono }}>{student.points}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>pts</div>
                </div>
                <span style={{ fontSize: 16, color: T.muted, transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
              </div>
            </button>

            {isExpanded && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: topTopics.length > 0 ? 10 : 0 }}>
                  <span style={{ fontSize: 13, color: T.med, background: T.blueBg, padding: "4px 10px", borderRadius: 999, fontWeight: 600 }}>
                    {student.activePatientCount} active patients
                  </span>
                  <span style={{ fontSize: 13, color: T.greenDk, background: T.greenBg, padding: "4px 10px", borderRadius: 999, fontWeight: 600 }}>
                    {student.dischargedPatientCount} discharged
                  </span>
                  <span style={{ fontSize: 13, color: T.navy, background: T.ice, padding: "4px 10px", borderRadius: 999, fontWeight: 600 }}>
                    Updated {new Date(student.updatedAt).toLocaleDateString()}
                  </span>
                </div>
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

      <div style={{ background: T.card, borderRadius: 12, padding: 14, marginTop: 16, border: `1px solid ${T.line}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, marginBottom: 8, fontFamily: T.serif }}>Shared clinical exposure</div>
        <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginBottom: topCohortTopics.length > 0 ? 10 : 0 }}>
          The cohort view still shows the broad topic mix across the rotation code so students can see what the service is exposing everyone to.
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

      {leaderboard.length === 0 && (
        <div style={{ background: T.card, borderRadius: 14, padding: 24, textAlign: "center", color: T.muted, border: `1px solid ${T.line}` }}>
          No students have published snapshots yet.
        </div>
      )}
    </div>
  );
}
