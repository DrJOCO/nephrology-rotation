import { useState, CSSProperties } from "react";
import { T } from "../../data/constants";
import { WEEKLY_CASES } from "../../data/cases";
import { getCaseScenarioImage, getCaseQuestionImage } from "../../data/images";
import type { CompletedItems, Bookmarks } from "../../types";

const caseImgStyle: CSSProperties = { width: "100%", borderRadius: 10, marginTop: 12, border: `1px solid ${T.line}` };
const caseCaptionStyle: CSSProperties = { fontSize: 13, color: T.sub, textAlign: "center", fontStyle: "italic", margin: "4px 0 0", lineHeight: 1.4 };

interface CaseAnswer {
  questionIdx: number;
  selected: number;
  correct: boolean;
}

type CaseData = typeof WEEKLY_CASES[1][0];

function CaseDetail({ caseData, onBack, completedItems, onCaseComplete }: { caseData: CaseData; onBack: () => void; completedItems: CompletedItems; onCaseComplete: (caseId: string, result: { score: number; total: number }) => void }) {
  const [phase, setPhase] = useState("read"); // read | quiz | results
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<CaseAnswer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showScenario, setShowScenario] = useState(true);

  const questions = caseData.questions;
  const done = (completedItems?.cases || {})[caseData.id];

  const handleSelect = (choiceIdx: number) => {
    if (showExplanation) return; // already answered
    setSelected(choiceIdx);
    setShowExplanation(true);
    setAnswers(prev => [...prev, { questionIdx: currentQ, selected: choiceIdx, correct: choiceIdx === questions[currentQ].answer }]);
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelected(null);
      setShowExplanation(false);
    } else {
      // Quiz complete
      const score = answers.filter(a => a.correct).length;
      onCaseComplete(caseData.id, { score, total: questions.length });
      setPhase("results");
    }
  };

  const handleRestart = () => {
    setPhase("read");
    setCurrentQ(0);
    setAnswers([]);
    setSelected(null);
    setShowExplanation(false);
    setShowScenario(false);
  };

  // Read Phase
  if (phase === "read") {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.med, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 12, padding: 0, fontWeight: 600 }}>
          ← Back to Cases
        </button>

        <div style={{ background: T.card, borderRadius: 16, padding: 20, border: `1px solid ${T.line}`, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 28 }}>🏥</span>
            <div>
              <h2 style={{ color: T.navy, fontSize: 20, margin: 0, fontFamily: T.serif, fontWeight: 700 }}>{caseData.title}</h2>
              <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{caseData.category} • {caseData.difficulty}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.med, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Clinical Scenario</div>
          <div style={{ fontSize: 14, color: T.text, lineHeight: 1.7, whiteSpace: "pre-line" }}>
            {caseData.scenario}
          </div>
          {/* Scenario image */}
          {(() => { const img = getCaseScenarioImage(caseData.id); return img ? (<div><img src={img.src} alt={img.alt || "Clinical scenario image"} style={caseImgStyle} />{img.caption && <p style={caseCaptionStyle}>{img.caption}</p>}</div>) : null; })()}
        </div>

        {done && (
          <div style={{ background: T.greenBg, borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 13, color: T.greenDk, display: "flex", alignItems: "center", gap: 8, border: `1px solid ${T.green}` }}>
            <span style={{ fontSize: 16 }}>✓</span>
            <span>Previously completed: {done.score}/{done.total} correct ({Math.round((done.score / done.total) * 100)}%)</span>
          </div>
        )}

        <button onClick={() => setPhase("quiz")}
          style={{ width: "100%", padding: "14px 0", background: T.med, color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          {done ? "Retake Questions" : "Begin Questions"} ({questions.length})
        </button>
      </div>
    );
  }

  // Results Phase
  if (phase === "results") {
    const score = answers.filter(a => a.correct).length;
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div style={{ padding: 16 }}>
        <div style={{ background: T.card, borderRadius: 16, padding: 24, border: `1px solid ${T.line}`, textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{pct >= 80 ? "🎉" : pct >= 60 ? "👍" : "📚"}</div>
          <h2 style={{ color: T.navy, fontSize: 22, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Case Complete</h2>
          <div style={{ fontSize: 14, color: T.sub, marginBottom: 16 }}>{caseData.title}</div>
          <div style={{ fontSize: 48, fontWeight: 700, color: pct >= 80 ? T.green : pct >= 60 ? T.gold : T.accent, fontFamily: T.mono }}>
            {pct}%
          </div>
          <div style={{ fontSize: 14, color: T.sub, marginTop: 4 }}>{score}/{questions.length} correct</div>
          {pct >= 80 && <div style={{ marginTop: 10, fontSize: 13, color: T.green, fontWeight: 600 }}>Strong signal for this domain.</div>}
        </div>

        {/* Review answers */}
        <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 12px", fontFamily: T.serif, fontWeight: 700 }}>Review</h3>
        {questions.map((q, i) => {
          const ans = answers[i];
          const isCorrect = ans?.correct;
          return (
            <div key={i} style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}`, borderLeft: `4px solid ${isCorrect ? T.green : T.accent}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6, lineHeight: 1.4 }}>
                {i + 1}. {q.q}
              </div>
              <div style={{ fontSize: 13, color: isCorrect ? T.green : T.accent, fontWeight: 600, marginBottom: 6 }}>
                {isCorrect ? "✓ Correct" : `✗ Your answer: ${q.choices[ans.selected]}`}
              </div>
              {!isCorrect && (
                <div style={{ fontSize: 13, color: T.green, fontWeight: 600, marginBottom: 6 }}>
                  Correct answer: {q.choices[q.answer]}
                </div>
              )}
              <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, background: T.bg, borderRadius: 8, padding: 10 }}>
                {q.explanation}
              </div>
            </div>
          );
        })}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={handleRestart}
            style={{ flex: 1, padding: "12px 0", background: T.card, color: T.med, border: `1.5px solid ${T.med}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Retry Case
          </button>
          <button onClick={onBack}
            style={{ flex: 1, padding: "12px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Back to Cases
          </button>
        </div>
      </div>
    );
  }

  // Quiz Phase
  const q = questions[currentQ];
  return (
    <div style={{ padding: 16 }}>
      {/* Progress */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => { if (currentQ === 0 && answers.length === 0) { setPhase("read"); } }}
          style={{ background: "none", border: "none", color: currentQ === 0 && answers.length === 0 ? T.med : "transparent", fontSize: 14, cursor: currentQ === 0 ? "pointer" : "default", padding: 0, fontWeight: 600, pointerEvents: currentQ === 0 && answers.length === 0 ? "auto" : "none" }}>
          ← Back
        </button>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.sub }}>
          Question {currentQ + 1} of {questions.length}
        </div>
      </div>
      <div style={{ height: 4, background: T.bg, borderRadius: 2, marginBottom: 16 }}>
        <div style={{ height: "100%", width: `${((currentQ + (showExplanation ? 1 : 0)) / questions.length) * 100}%`, background: T.med, borderRadius: 2, transition: "width 0.3s ease" }} />
      </div>

      {/* Scenario reference toggle */}
      <button onClick={() => setShowScenario(!showScenario)}
        style={{ width: "100%", padding: "8px 12px", background: T.ice, color: T.med, border: `1px solid ${T.pale}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        {showScenario ? "▾ Hide Scenario" : "▸ Show Clinical Scenario"}
      </button>
      {showScenario && (
        <div style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 14, border: `1px solid ${T.line}`, fontSize: 13, color: T.text, lineHeight: 1.6, whiteSpace: "pre-line", maxHeight: 200, overflowY: "auto" }}>
          {caseData.scenario}
        </div>
      )}

      {/* Question */}
      <div style={{ background: T.card, borderRadius: 14, padding: 18, border: `1px solid ${T.line}`, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, lineHeight: 1.5, marginBottom: 16 }}>
          {q.q}
        </div>
        {/* Question image */}
        {(() => { const img = getCaseQuestionImage(caseData.id, currentQ); return img ? (<div style={{ marginBottom: 14 }}><img src={img.src} alt={img.alt || "Question reference image"} style={caseImgStyle} />{img.caption && <p style={caseCaptionStyle}>{img.caption}</p>}</div>) : null; })()}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.choices.map((choice, i) => {
            const isSelected = selected === i;
            const isCorrect = i === q.answer;
            let bg = T.card;
            let border = `1.5px solid ${T.line}`;
            let textColor = T.text;
            if (showExplanation) {
              if (isCorrect) { bg = T.greenBg; border = `1.5px solid ${T.green}`; textColor = T.greenDk; }
              else if (isSelected && !isCorrect) { bg = T.redBg; border = `1.5px solid ${T.accent}`; textColor = T.redDeep; }
            } else if (isSelected) {
              bg = T.blueBg; border = `1.5px solid ${T.med}`;
            }
            return (
              <button key={i} onClick={() => handleSelect(i)}
                style={{ width: "100%", padding: "12px 14px", background: bg, border, borderRadius: 10, fontSize: 13, color: textColor, cursor: showExplanation ? "default" : "pointer", textAlign: "left", lineHeight: 1.4, fontWeight: isSelected || (showExplanation && isCorrect) ? 600 : 400, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontWeight: 700, color: T.sub, flexShrink: 0, minWidth: 18 }}>
                  {String.fromCharCode(65 + i)}.
                </span>
                <span>{choice}</span>
                {showExplanation && isCorrect && <span style={{ marginLeft: "auto", flexShrink: 0 }}>✓</span>}
                {showExplanation && isSelected && !isCorrect && <span style={{ marginLeft: "auto", flexShrink: 0 }}>✗</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Explanation */}
      {showExplanation && (
        <div style={{ background: T.ice, borderRadius: 12, padding: 14, marginBottom: 16, borderLeft: `4px solid ${selected === q.answer ? T.green : T.accent}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: selected === q.answer ? T.green : T.accent, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
            {selected === q.answer ? "Correct!" : "Incorrect"}
          </div>
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>
            {q.explanation}
          </div>
        </div>
      )}

      {/* Next button */}
      {showExplanation && (
        <button onClick={handleNext}
          style={{ width: "100%", padding: "14px 0", background: T.med, color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          {currentQ < questions.length - 1 ? "Next Question" : "See Results"}
        </button>
      )}
    </div>
  );
}

export default function CasesView({ week, onBack, completedItems, bookmarks, onToggleBookmark, onCaseComplete }: { week: number; onBack: () => void; completedItems: CompletedItems; bookmarks: Bookmarks; onToggleBookmark: (id: string) => void; onCaseComplete: (caseId: string, result: { score: number; total: number }) => void }) {
  const [activeCase, setActiveCase] = useState<CaseData | null>(null);
  const cases = WEEKLY_CASES[week] || [];

  if (activeCase) {
    return <CaseDetail
      caseData={activeCase}
      onBack={() => setActiveCase(null)}
      completedItems={completedItems}
      onCaseComplete={onCaseComplete}
    />;
  }

  const diffColors = {
    Beginner: { bg: T.greenBg, text: T.greenDk, border: T.green },
    Intermediate: { bg: T.yellowBg, text: T.goldText, border: T.gold },
    Advanced: { bg: T.redBg, text: T.redDeep, border: T.accent },
  };

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.med, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 12, padding: 0, fontWeight: 600 }}>
        ← Back
      </button>
      <h2 style={{ color: T.text, fontSize: 20, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Week {week} Clinical Cases</h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>
        Work through real-world clinical scenarios. Read the case, then answer diagnostic and management questions.
      </p>

      {cases.map(c => {
        const done = (completedItems?.cases || {})[c.id];
        const diff = diffColors[c.difficulty] || diffColors.Beginner;
        return (
          <div key={c.id} style={{ position: "relative", marginBottom: 10 }}>
            <button onClick={() => setActiveCase(c)}
              style={{ display: "block", width: "100%", background: T.card, borderRadius: 14, padding: 16, border: done ? `2px solid ${T.green}` : `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
              <div style={{ position: "absolute", top: 10, right: 12, display: "flex", alignItems: "center", gap: 6, paddingLeft: 40 }}>
                {done && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.green, background: T.greenBg, padding: "3px 10px", borderRadius: 6, textTransform: "uppercase" }}>
                    ✓ {done.score}/{done.total}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, paddingRight: 40 }}>
                <span style={{ fontSize: 22 }}>🏥</span>
                <div>
                  <div style={{ fontWeight: 700, color: T.navy, fontSize: 15, lineHeight: 1.3 }}>{c.title}</div>
                  <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{c.category} • {c.questions.length} questions</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: diff.text, background: diff.bg, padding: "2px 8px", borderRadius: 6, border: `1px solid ${diff.border}` }}>
                  {c.difficulty}
                </span>
              </div>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleBookmark(c.id); }}
              aria-label={(bookmarks?.cases || []).includes(c.id) ? `Unbookmark ${c.title}` : `Bookmark ${c.title}`}
              style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", fontSize: 16, color: (bookmarks?.cases || []).includes(c.id) ? T.gold : T.muted, cursor: "pointer", padding: 8, lineHeight: 1, zIndex: 1 }}>
              {(bookmarks?.cases || []).includes(c.id) ? "★" : "☆"}
            </button>
          </div>
        );
      })}
      {cases.length > 2 && <button onClick={onBack} style={{ background: "none", border: "none", color: T.med, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginTop: 16, padding: 0, fontWeight: 600 }}>
        {"\u2190"} Back
      </button>}
    </div>
  );
}
