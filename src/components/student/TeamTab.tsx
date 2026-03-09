import { useState, useEffect } from "react";
import { T, TOPICS } from "../../data/constants";
import store from "../../utils/store";
import { calculatePoints, getLevel } from "../../utils/gamification";
import type { AdminStudent } from "../../types";

export default function TeamTab({ currentStudentId }: { currentStudentId: string }) {
  const [teammates, setTeammates] = useState<AdminStudent[]>([]);
  const [teamLoading, setTeamLoading] = useState(() => !!store.getRotationCode());
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  useEffect(() => {
    if (!store.getRotationCode()) return;
    const unsub = store.onStudentsChanged((students) => {
      setTeammates(students as AdminStudent[]);
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
          Join a rotation to see your team's progress and patient board.
        </p>
      </div>
    );
  }

  if (teamLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: T.muted, fontSize: 14 }}>Loading team data...</div>;
  }

  // Sort by points descending for leaderboard
  const sorted = [...teammates].sort((a, b) => {
    const ptsA = a.gamification?.points || calculatePoints(a);
    const ptsB = b.gamification?.points || calculatePoints(b);
    return ptsB - ptsA;
  });

  const totalPatients = teammates.reduce((sum, s) => sum + (s.patients?.length || 0), 0);
  const totalPoints = teammates.reduce((sum, s) => sum + (s.gamification?.points || calculatePoints(s)), 0);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 18, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Team Board</h2>
      <div style={{ color: T.muted, fontSize: 11, marginBottom: 16 }}>
        {teammates.length} student{teammates.length !== 1 ? "s" : ""} • {totalPatients} patient{totalPatients !== 1 ? "s" : ""} • {totalPoints} total pts
      </div>

      {/* Leaderboard */}
      <div style={{ background: `linear-gradient(135deg, ${T.navyBg}, ${T.deepBg})`, borderRadius: 14, padding: 16, marginBottom: 16, color: "white" }}>
        <h3 style={{ fontFamily: T.serif, color: "white", fontSize: 14, margin: "0 0 14px", fontWeight: 700 }}>🏆 Leaderboard</h3>
        {sorted.length === 0 ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 13, padding: 12 }}>No students yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sorted.map((s, i) => {
              const pts = s.gamification?.points || calculatePoints(s);
              const level = getLevel(pts);
              const isMe = s.studentId === currentStudentId;
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <div key={s.studentId} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: isMe ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                  borderRadius: 8, padding: "8px 10px",
                  border: isMe ? "1px solid rgba(255,255,255,0.3)" : "1px solid transparent",
                }}>
                  <div style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>
                    {i < 3 ? medals[i] : <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: 700 }}>{i + 1}</span>}
                  </div>
                  <div style={{ fontSize: 20, flexShrink: 0 }}>{level.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.name || "Unknown"}{isMe ? " (You)" : ""}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>{level.name} • {s.patients?.length || 0} patient{(s.patients?.length || 0) !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, fontFamily: T.mono, color: "#F0C866" }}>{pts}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>pts</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Patient Board */}
      <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 15, margin: "0 0 12px", fontWeight: 700 }}>🏥 Patient Board</h3>
      {sorted.map(s => {
        const pts = s.patients || [];
        const isMe = s.studentId === currentStudentId;
        const isExpanded = expandedStudent === s.studentId;
        const active = pts.filter(p => p.status === "active");
        const discharged = pts.filter(p => p.status === "discharged");

        return (
          <div key={s.studentId} style={{
            background: T.card, borderRadius: 12, padding: 12, marginBottom: 10,
            border: isMe ? `2px solid ${T.med}` : `1px solid ${T.line}`,
          }}>
            <button onClick={() => setExpandedStudent(isExpanded ? null : s.studentId)}
              style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>
                  {s.name || "Unknown"}{isMe ? " (You)" : ""}
                </div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                  {active.length} active • {discharged.length} discharged
                </div>
              </div>
              <span style={{ fontSize: 16, color: T.muted, transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
            </button>

            {isExpanded && (
              <div style={{ marginTop: 12 }}>
                {pts.length === 0 ? (
                  <div style={{ textAlign: "center", color: T.muted, fontSize: 13, padding: 10 }}>No patients logged yet</div>
                ) : (
                  <div>
                    {active.length > 0 && (
                      <div style={{ marginBottom: discharged.length > 0 ? 10 : 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.green, textTransform: "uppercase", marginBottom: 6, letterSpacing: 0.5 }}>Active</div>
                        {active.map((p, i) => {
                          const topics = p.topics || (p.topic ? [p.topic] : []);
                          return (
                            <div key={i} style={{ padding: "8px 0", borderBottom: i < active.length - 1 ? `1px solid ${T.line}` : "none" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 700, color: T.navy, fontSize: 13 }}>{p.initials}</span>
                                {topics.map(t => (
                                  <span key={t} style={{ fontSize: 10, color: "white", background: T.med, padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>{t}</span>
                                ))}
                              </div>
                              {p.dx && <div style={{ fontSize: 12, color: T.sub, marginTop: 3 }}>{p.dx}</div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {discharged.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", marginBottom: 6, letterSpacing: 0.5 }}>Discharged</div>
                        {discharged.map((p, i) => {
                          const topics = p.topics || (p.topic ? [p.topic] : []);
                          return (
                            <div key={i} style={{ padding: "6px 0", borderBottom: i < discharged.length - 1 ? `1px solid ${T.line}` : "none", opacity: 0.6 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 600, color: T.sub, fontSize: 12 }}>{p.initials}</span>
                                {topics.map(t => (
                                  <span key={t} style={{ fontSize: 10, color: T.muted, background: T.bg, padding: "2px 7px", borderRadius: 6, fontWeight: 500 }}>{t}</span>
                                ))}
                              </div>
                              {p.dx && <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{p.dx}</div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {sorted.length === 0 && (
        <div style={{ background: T.card, borderRadius: 14, padding: 24, textAlign: "center", color: T.muted, border: `1px solid ${T.line}` }}>
          No students have joined this rotation yet.
        </div>
      )}
    </div>
  );
}
