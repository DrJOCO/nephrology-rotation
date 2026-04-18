import { useState } from "react";
import { T } from "../../data/constants";
import { PRE_QUIZ } from "../../data/quizzes";
import WeakAreasCard from "./WeakAreasCard";
import { backBtnStyle } from "./shared";

export default function PreTestResultsView({ preScore, navigate }) {
  const [showMissed, setShowMissed] = useState(false);

  if (!preScore) return null;

  const missed = preScore.answers ? preScore.answers.filter(a => !a.correct) : [];
  const overallPct = Math.round((preScore.correct / preScore.total) * 100);

  return (
    <div style={{ padding: 16 }}>
      {/* Back button */}
      <button onClick={() => navigate("today")} style={backBtnStyle}>{"\u2190"} Back to Home</button>

      {/* Score header */}
      <div style={{ background: T.card, borderRadius: 16, padding: 28, textAlign: "center", border: `1px solid ${T.line}`, marginBottom: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{overallPct >= 80 ? "\uD83C\uDF89" : overallPct >= 60 ? "\uD83D\uDC4D" : "\uD83D\uDCD6"}</div>
        <h2 style={{ color: T.navy, fontFamily: T.serif, margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>Pre-Rotation Assessment</h2>
        <div style={{ fontSize: 40, fontWeight: 700, color: overallPct >= 80 ? T.green : overallPct >= 60 ? T.gold : T.accent, fontFamily: T.mono }}>
          {preScore.correct}/{preScore.total}
        </div>
        <div style={{ color: T.sub, fontSize: 14, marginBottom: 4 }}>{overallPct}% correct</div>
        {preScore.date && <div style={{ color: T.muted, fontSize: 11 }}>Taken {new Date(preScore.date).toLocaleDateString()}</div>}
      </div>

      {/* Weak Areas Breakdown */}
      {preScore.answers && preScore.answers.length > 0 && (
        <WeakAreasCard preScore={preScore} navigate={navigate} />
      )}

      {/* Missed Questions */}
      {missed.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <button onClick={() => setShowMissed(!showMissed)}
            style={{ width: "100%", background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, fontFamily: T.serif }}>
              Review Missed Questions ({missed.length})
            </div>
            <span style={{ color: T.med, fontSize: 16, transition: "transform 0.2s", transform: showMissed ? "rotate(180deg)" : "rotate(0)" }}>{"\u25BE"}</span>
          </button>
          {showMissed && (
            <div style={{ marginTop: 10 }}>
              {missed.map((a, i) => (
                <div key={i} style={{ background: T.redBg, borderRadius: 10, padding: 14, marginBottom: 10, borderLeft: `3px solid ${T.accent}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8, lineHeight: 1.4 }}>{PRE_QUIZ[a.qIdx]?.q}</div>
                  <div style={{ fontSize: 12, color: T.accent, marginBottom: 4 }}>
                    {"\u2717"} Your answer: {PRE_QUIZ[a.qIdx]?.choices[a.chosen]}
                  </div>
                  <div style={{ fontSize: 12, color: T.green, fontWeight: 600, marginBottom: 6 }}>
                    {"\u2713"} Correct: {PRE_QUIZ[a.qIdx]?.choices[PRE_QUIZ[a.qIdx]?.answer]}
                  </div>
                  <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.5, background: T.card, borderRadius: 6, padding: 10 }}>
                    {PRE_QUIZ[a.qIdx]?.explanation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => navigate("today")}
          style={{ flex: 1, padding: "14px 20px", background: T.card, color: T.navy, border: `1px solid ${T.line}`, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Done
        </button>
        <button onClick={() => navigate("today", { type: "preQuiz" })}
          style={{ flex: 1, padding: "14px 20px", background: T.med, color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          {"\u21BB"} Retake
        </button>
      </div>
    </div>
  );
}
