import { T, TOPICS, WEEKLY } from "../../data/constants";
import { getLevel, ACHIEVEMENTS } from "../../utils/gamification";
import { MiniLineChart, MiniBarChart } from "./charts";
import type { Patient, WeeklyScores, QuizScore, Gamification, LineChartPoint, BarChartItem } from "../../types";

export default function ProgressTab({ patients, weeklyScores, preScore, postScore, curriculum, gamification }: { patients: Patient[]; weeklyScores: WeeklyScores; preScore: QuizScore | null; postScore: QuizScore | null; curriculum: typeof WEEKLY; gamification: Gamification }) {
  const topicCounts: Record<string, number> = {};
  patients.forEach(p => {
    const topics = p.topics || (p.topic ? [p.topic] : []);
    topics.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
  });
  const totalPts = patients.length;
  const topicsCovered = Object.keys(topicCounts).length;

  const totalQuizzesTaken = Object.values(weeklyScores).flat().length + (preScore ? 1 : 0) + (postScore ? 1 : 0);

  return (
    <div style={{ padding: 16 }}>
      {/* Gamification Section */}
      <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: 22 }}>{getLevel(gamification?.points || 0).icon}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: T.navy, marginLeft: 8, fontFamily: T.serif }}>{getLevel(gamification?.points || 0).name}</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.orange }}>{gamification?.points || 0} pts</div>
        </div>
        {getLevel(gamification?.points || 0).nextAt && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.sub, marginBottom: 4 }}>
              <span>{getLevel(gamification?.points || 0).name}</span>
              <span>{getLevel(gamification?.points || 0).next} ({getLevel(gamification?.points || 0).nextAt} pts)</span>
            </div>
            <div style={{ background: T.pale, borderRadius: 6, height: 8, overflow: "hidden" }}>
              <div style={{ background: T.med, height: "100%", borderRadius: 6, width: `${Math.min(100, ((gamification?.points || 0) / (getLevel(gamification?.points || 0).nextAt || 1)) * 100)}%`, transition: "width 0.5s ease" }} />
            </div>
          </div>
        )}
        <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, marginBottom: 8 }}>
          Achievements ({(gamification?.achievements || []).length}/{ACHIEVEMENTS.length})
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          {ACHIEVEMENTS.map(a => {
            const earned = (gamification?.achievements || []).includes(a.id);
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 10, background: earned ? T.ice : T.bg, border: `1px solid ${earned ? T.pale : T.line}`, opacity: earned ? 1 : 0.5 }}>
                <span style={{ fontSize: 18 }}>{earned ? a.icon : "\u{1F512}"}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: earned ? T.navy : T.muted }}>{a.title}</div>
                  <div style={{ fontSize: 9, color: T.sub }}>{a.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Study Streak Calendar */}
      <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, color: T.navy, fontSize: 15, fontFamily: T.serif }}>Study Streak</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16 }}>🔥</span>
            <span style={{ fontWeight: 700, color: T.orange, fontSize: 18, fontFamily: T.mono }}>{gamification?.streaks?.currentDays || 0}</span>
            <span style={{ fontSize: 11, color: T.sub }}>day{(gamification?.streaks?.currentDays || 0) !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: T.sub, marginBottom: 12 }}>
          Longest streak: {gamification?.streaks?.longestDays || 0} days
        </div>
        {(() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayStr = today.toISOString().slice(0, 10);

          // Build activity log set (with backfill for users without log)
          let logSet = new Set<string>(gamification?.streaks?.activityLog || []);
          if (logSet.size === 0 && gamification?.streaks?.lastActiveDate && gamification?.streaks?.currentDays > 0) {
            const last = new Date(gamification.streaks.lastActiveDate + "T00:00:00");
            for (let i = 0; i < gamification.streaks.currentDays; i++) {
              const d = new Date(last.getTime() - i * 86400000);
              logSet.add(d.toISOString().slice(0, 10));
            }
          }

          // Generate 28 days ending today
          const days: string[] = [];
          for (let i = 27; i >= 0; i--) {
            const d = new Date(today.getTime() - i * 86400000);
            days.push(d.toISOString().slice(0, 10));
          }

          const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
          const firstDay = new Date(days[0] + "T00:00:00");
          const padCount = (firstDay.getDay() + 6) % 7; // Mon=0

          return (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
                {dayLabels.map((d, i) => (
                  <div key={i} style={{ textAlign: "center", fontSize: 10, color: T.muted, fontWeight: 600 }}>{d}</div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                {Array.from({ length: padCount }, (_, i) => (
                  <div key={`pad-${i}`} style={{ aspectRatio: "1", borderRadius: 6 }} />
                ))}
                {days.map(d => {
                  const isActive = logSet.has(d);
                  const isToday = d === todayStr;
                  return (
                    <div key={d} style={{
                      aspectRatio: "1", borderRadius: 6,
                      background: isActive ? T.green : T.bg,
                      border: isToday ? `2px solid ${T.med}` : "1px solid transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, color: isActive ? "white" : T.muted, fontWeight: 600,
                    }}>
                      {new Date(d + "T00:00:00").getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      <h2 style={{ color: T.text, fontSize: 16, margin: "0 0 14px", fontFamily: T.serif, fontWeight: 700 }}>Rotation Progress</h2>

      {/* Pre/Post growth card */}
      {preScore && postScore && (
        <div style={{ background: `linear-gradient(135deg, ${T.navy}, ${T.deep})`, borderRadius: 14, padding: 18, marginBottom: 16, color: "white" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: T.pale, marginBottom: 10 }}>Knowledge Growth</div>
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: T.muted }}>Pre-Test</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: T.mono }}>{Math.round((preScore.correct/preScore.total)*100)}%</div>
            </div>
            <div style={{ fontSize: 24, color: T.green }}>→</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: T.green }}>Post-Test</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: T.mono, color: T.green }}>{Math.round((postScore.correct/postScore.total)*100)}%</div>
            </div>
            <div style={{ textAlign: "center", background: "rgba(26,188,156,0.2)", borderRadius: 10, padding: "8px 14px" }}>
              <div style={{ fontSize: 11, color: T.green }}>Growth</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: T.green, fontFamily: T.mono }}>
                +{Math.round((postScore.correct/postScore.total)*100) - Math.round((preScore.correct/preScore.total)*100)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { val: totalPts, label: "Patients Seen", color: T.navy },
          { val: topicsCovered, label: "Topics Covered", color: T.med },
          { val: totalQuizzesTaken, label: "Quizzes Taken", color: T.green },
        ].map((s, i) => (
          <div key={i} style={{ background: T.card, borderRadius: 10, padding: 12, textAlign: "center", border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: T.mono }}>{s.val}</div>
            <div style={{ fontSize: 11, color: T.sub }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Weekly Quiz Scores */}
      <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Weekly Quiz Scores</h3>
      {[1,2,3,4].map(w => {
        const ws = weeklyScores[w] || [];
        const best = ws.length > 0 ? Math.max(...ws.map(s => Math.round((s.correct/s.total)*100))) : null;
        return (
          <div key={w} style={{ background: T.card, borderRadius: 10, padding: 12, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${T.line}` }}>
            <div>
              <div style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>Week {w}: {(curriculum[w] || WEEKLY[w]).title}</div>
              <div style={{ fontSize: 11, color: T.muted }}>{ws.length} attempt{ws.length !== 1 ? "s" : ""}</div>
            </div>
            {best !== null ? (
              <div style={{ fontSize: 20, fontWeight: 700, color: best >= 80 ? T.green : best >= 60 ? T.gold : T.accent, fontFamily: T.mono }}>{best}%</div>
            ) : (
              <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>Not taken</div>
            )}
          </div>
        );
      })}

      {/* Topic Exposure */}
      <h3 style={{ color: T.navy, fontSize: 15, margin: "16px 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Topic Exposure</h3>
      <div style={{ background: T.card, borderRadius: 12, padding: 14, border: `1px solid ${T.line}` }}>
        {TOPICS.slice(0, 16).map(t => {
          const count = topicCounts[t] || 0;
          const maxCount = Math.max(...Object.values(topicCounts), 1);
          return (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 120, fontSize: 11, color: T.text, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t}</div>
              <div style={{ flex: 1, height: 14, background: T.grayBg, borderRadius: 7, overflow: "hidden" }}>
                <div style={{ width: count > 0 ? `${Math.max((count / maxCount) * 100, 8)}%` : 0, height: "100%", background: count > 0 ? T.med : "transparent", borderRadius: 7, transition: "width 0.3s" }} />
              </div>
              <div style={{ width: 20, fontSize: 12, fontWeight: 600, color: count > 0 ? T.navy : T.muted, textAlign: "right", fontFamily: T.mono }}>{count}</div>
            </div>
          );
        })}
        {topicsCovered === 0 && (
          <div style={{ textAlign: "center", padding: 16, color: T.muted, fontSize: 13 }}>Start adding patients to see topic coverage</div>
        )}
      </div>

      {/* Gaps */}
      {topicsCovered > 0 && topicsCovered < 10 && (
        <div style={{ background: T.yellowBg, borderRadius: 12, padding: 14, marginTop: 12, borderLeft: `3px solid ${T.gold}` }}>
          <div style={{ fontWeight: 700, color: T.text, fontSize: 13, marginBottom: 4 }}>Topics Not Yet Seen:</div>
          <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.6 }}>
            {TOPICS.filter(t => !topicCounts[t]).slice(0, 10).join(", ")}
          </div>
        </div>
      )}

      {/* Analytics — Quiz Score Trend */}
      {(() => {
        const allAttempts: (LineChartPoint & { date: string })[] = [];
        Object.entries(weeklyScores).forEach(([week, attempts]) => {
          (attempts || []).forEach(a => {
            if (a.total > 0) allAttempts.push({ label: a.date ? new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : `W${week}`, value: Math.round((a.correct / a.total) * 100), date: a.date || "" });
          });
        });
        allAttempts.sort((a, b) => a.date.localeCompare(b.date));

        const weeklyBest = [1,2,3,4].map(w => {
          const ws = weeklyScores[w] || [];
          const best = ws.length > 0 ? Math.max(...ws.map(s => Math.round((s.correct / s.total) * 100))) : 0;
          return { label: `W${w}`, value: best, color: best >= 80 ? T.green : best >= 60 ? T.gold : best > 0 ? T.accent : T.line };
        });
        const hasWeeklyData = weeklyBest.some(w => w.value > 0);

        return (allAttempts.length >= 2 || hasWeeklyData) && (
          <>
            <h3 style={{ color: T.navy, fontSize: 15, margin: "20px 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Analytics</h3>
            {allAttempts.length >= 2 && (
              <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 12, border: `1px solid ${T.line}` }}>
                <div style={{ fontWeight: 700, color: T.navy, fontSize: 13, marginBottom: 10 }}>Quiz Score Trend</div>
                <div style={{ overflowX: "auto" }}>
                  <MiniLineChart data={allAttempts} width={Math.max(280, allAttempts.length * 60)} color={T.med} />
                </div>
              </div>
            )}
            {hasWeeklyData && (
              <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 12, border: `1px solid ${T.line}` }}>
                <div style={{ fontWeight: 700, color: T.navy, fontSize: 13, marginBottom: 10 }}>Weekly Best Scores</div>
                <MiniBarChart data={weeklyBest} />
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
