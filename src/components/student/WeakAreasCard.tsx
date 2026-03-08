import { T } from "../../data/constants";
import { PRE_QUIZ_WEEK_MAP } from "./shared";

export default function WeakAreasCard({ preScore, navigate }) {
  if (!preScore?.answers || preScore.answers.length === 0) return null;

  // Tally correct/total per week
  const weekStats = { 1: { correct: 0, total: 0 }, 2: { correct: 0, total: 0 }, 3: { correct: 0, total: 0 }, 4: { correct: 0, total: 0 } };
  preScore.answers.forEach(a => {
    const wk = PRE_QUIZ_WEEK_MAP[a.qIdx];
    if (!wk) return;
    weekStats[wk].total++;
    if (a.correct) weekStats[wk].correct++;
  });

  // Calculate pct per week and sort weakest first
  const weekResults = [1, 2, 3, 4].map(w => ({
    week: w,
    correct: weekStats[w].correct,
    total: weekStats[w].total,
    pct: weekStats[w].total > 0 ? Math.round((weekStats[w].correct / weekStats[w].total) * 100) : 100,
  })).sort((a, b) => a.pct - b.pct);

  const weekTitles = { 1: "Foundations", 2: "Electrolytes & Acid-Base", 3: "Glomerular Disease & CKD", 4: "Therapeutics & Integration" };
  const weekIcons = { 1: "\uD83D\uDD2C", 2: "\u2697\uFE0F", 3: "\uD83E\uDDEB", 4: "\uD83D\uDC8A" };

  // Identify weak weeks (below 60%) and moderate (60-79%)
  const weak = weekResults.filter(w => w.pct < 60);
  const moderate = weekResults.filter(w => w.pct >= 60 && w.pct < 80);

  // Overall score
  const overallPct = Math.round((preScore.correct / preScore.total) * 100);

  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ color: T.text, fontSize: 16, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>
        {"\uD83D\uDCCA"} Your Focus Areas
      </h2>
      <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.line}`, overflow: "hidden" }}>
        {/* Overall score banner */}
        <div style={{ background: overallPct >= 80 ? T.greenBg : overallPct >= 60 ? T.ice : T.redBg, padding: "14px 16px", borderBottom: `1px solid ${T.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5 }}>Pre-Test Score</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: overallPct >= 80 ? T.green : overallPct >= 60 ? T.med : T.accent, fontFamily: T.mono }}>{overallPct}%</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: T.sub }}>{preScore.correct}/{preScore.total} correct</div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>
              {weak.length > 0 ? `${weak.length} area${weak.length > 1 ? "s" : ""} to focus on` : moderate.length > 0 ? "Looking good \u2014 polish a few spots" : "Strong foundation! \uD83C\uDF89"}
            </div>
          </div>
        </div>

        {/* Per-week breakdown */}
        <div style={{ padding: "12px 16px" }}>
          {weekResults.map(w => {
            const barColor = w.pct >= 80 ? T.green : w.pct >= 60 ? T.gold : T.accent;
            const bgTint = w.pct >= 80 ? T.greenBg : w.pct >= 60 ? T.yellowBg : T.redBg;
            const statusLabel = w.pct >= 80 ? "Strong" : w.pct >= 60 ? "Review" : "Focus";
            return (
              <button key={w.week} onClick={() => navigate("home", { type: "weeklyQuiz", week: w.week })}
                style={{ width: "100%", background: bgTint, border: "none", borderRadius: 10, padding: "10px 12px", marginBottom: 8, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{weekIcons[w.week]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.navy }}>Wk {w.week}: {weekTitles[w.week]}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: barColor, flexShrink: 0 }}>{statusLabel} {"\u00B7"} {w.pct}%</div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 5, background: "rgba(0,0,0,0.06)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${w.pct}%`, background: barColor, borderRadius: 3, transition: "width 0.4s ease" }} />
                  </div>
                  <div style={{ fontSize: 10, color: T.sub, marginTop: 3 }}>{w.correct}/{w.total} correct {"\u00B7"} Tap to practice</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Recommendation */}
        {weak.length > 0 && (
          <div style={{ padding: "0 16px 14px" }}>
            <div style={{ background: T.redAlpha, borderRadius: 10, padding: "10px 14px", borderLeft: `3px solid ${T.accent}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, marginBottom: 3 }}>{"\uD83D\uDCA1"} Recommendation</div>
              <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5 }}>
                Start with <span style={{ fontWeight: 700 }}>Week {weak[0].week}: {weekTitles[weak[0].week]}</span> {"\u2014"} review the study sheets and articles, then retake the weekly quiz to solidify your understanding.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
