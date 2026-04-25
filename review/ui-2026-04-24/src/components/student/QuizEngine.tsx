import { useState, useEffect } from "react";
import { T } from "../../data/constants";
import { useIsMobile } from "../../utils/helpers";
import store from "../../utils/store";
import { backBtnStyle } from "./shared";
import type { QuizQuestion, QuizScore, QuizAnswer } from "../../types";

interface SavedQuizProgress {
  fingerprint: string;
  shuffledOrder: number[];
  current: number;
  selected: number | null;
  answered: QuizAnswer[];
  score: number;
  done: boolean;
  showExplanation: boolean;
  choiceOrders: Record<number, number[]>;
}

// Fisher-Yates shuffle — returns array of shuffled indices
function shuffleIndices(length: number) {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Generate shuffled choice orders for each question
function generateChoiceOrders(questions: QuizQuestion[]) {
  return questions.map(q => shuffleIndices(q.choices.length));
}

export default function QuizEngine({ questions, title, onBack, onFinish, questionCount }: { questions: QuizQuestion[]; title: string; onBack: () => void; onFinish: (score: QuizScore) => void; questionCount?: number }) {
  const isMobile = useIsMobile();
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [shuffledOrder, setShuffledOrder] = useState<number[] | null>(null);
  const [choiceOrders, setChoiceOrders] = useState<Record<number, number[]> | null>(null);

  // Quiz persistence
  const quizKey = "quiz_" + title.replace(/[^a-zA-Z0-9]/g, "_");
  const [restored, setRestored] = useState(false);

  // Fingerprint the question set so we detect when the *content* changes
  // (handles dynamic quizzes like Review Missed / SR Review whose length can stay the same)
  const questionsFingerprint = questions.length + ":" + questions.map(q => q.q).join("|");

  // Restore saved progress on mount, or create new shuffled order + choice orders
  useEffect(() => {
    (async () => {
      const saved = await store.get<SavedQuizProgress>(quizKey);
      // Validate saved progress: indices must be in-bounds AND the question
      // set must be the same (fingerprint match).  This guards against dynamic
      // quizzes whose content changes between sessions.
      const savedValid = saved?.shuffledOrder &&
        saved.fingerprint === questionsFingerprint &&
        saved.shuffledOrder.every(idx => idx >= 0 && idx < questions.length);
      if (savedValid) {
        setCurrent(saved.current || 0);
        setSelected(saved.selected ?? null);
        setAnswers(saved.answered || []);
        setCorrectCount(saved.score || 0);
        setFinished(saved.done || false);
        setShowExplanation(saved.showExplanation || false);
        setShowResult(saved.showExplanation || false);
        setShuffledOrder(saved.shuffledOrder);
        setChoiceOrders(saved.choiceOrders || generateChoiceOrders(questions));
      } else {
        const allShuffled = shuffleIndices(questions.length);
        const count = questionCount && questionCount < questions.length ? questionCount : questions.length;
        setShuffledOrder(allShuffled.slice(0, count));
        setChoiceOrders(generateChoiceOrders(questions));
      }
      setRestored(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizKey, questionsFingerprint]);

  // Save progress on change (only after restored)
  useEffect(() => {
    if (!restored) return;
    if (finished) { store.set(quizKey, null); return; }
    store.set(quizKey, { current, selected, answered: answers, score: correctCount, done: finished, showExplanation, shuffledOrder, choiceOrders, fingerprint: questionsFingerprint });
  }, [current, selected, answers, correctCount, finished, showExplanation, restored, quizKey, shuffledOrder, choiceOrders, questionsFingerprint]);

  const handleSelect = (displayIdx: number) => {
    if (showResult || !shuffledOrder || !choiceOrders) return;
    setSelected(displayIdx);
    setShowResult(true);
    setShowExplanation(true);
    const origQIdx = shuffledOrder[current];
    const choiceMap = choiceOrders[origQIdx];
    const originalChoiceIdx = choiceMap[displayIdx];
    const isCorrect = originalChoiceIdx === questions[origQIdx].answer;
    if (isCorrect) setCorrectCount(c => c + 1);
    setAnswers(a => [...a, { qIdx: origQIdx, chosen: originalChoiceIdx, correct: isCorrect }]);
  };

  const quizLen = shuffledOrder ? shuffledOrder.length : questions.length;

  const handleNext = () => {
    if (current + 1 >= quizLen) {
      setFinished(true);
      onFinish({ correct: correctCount, total: quizLen, date: new Date().toISOString(), answers });
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setShowResult(false);
      setShowExplanation(false);
    }
  };

  // Loading guard before restore completes
  if (!restored || !shuffledOrder || !choiceOrders) return <div style={{ padding: 40, textAlign: "center", color: T.sub }}>Loading quiz...</div>;

  // Finished screen
  if (finished) {
    const pct = Math.round((correctCount / quizLen) * 100);
    const missed = answers.filter(a => !a.correct);
    return (
      <div style={{ padding: 16 }}>
        <div style={{ background: T.card, borderRadius: 16, padding: 28, textAlign: "center", border: `1px solid ${T.line}` }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{pct >= 80 ? "\uD83C\uDF89" : pct >= 60 ? "\uD83D\uDC4D" : "\uD83D\uDCD6"}</div>
          <h2 style={{ color: T.navy, fontFamily: T.serif, margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>{title} Complete</h2>
          <div style={{ fontSize: 40, fontWeight: 700, color: pct >= 80 ? T.green : pct >= 60 ? T.gold : T.accent, fontFamily: T.mono }}>
            {correctCount}/{quizLen}
          </div>
          <div style={{ color: T.sub, fontSize: 14, marginBottom: 20 }}>{pct}% correct</div>

          {/* Missed questions review */}
          {missed.length > 0 && (
            <div style={{ textAlign: "left", marginTop: 16 }}>
              <div style={{ fontWeight: 700, color: T.text, fontSize: 14, marginBottom: 10, fontFamily: T.serif }}>
                Review Missed Questions ({missed.length}):
              </div>
              {missed.map((a, i) => (
                <div key={i} style={{ background: T.redBg, borderRadius: 10, padding: 14, marginBottom: 10, borderLeft: `3px solid ${T.accent}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8, lineHeight: 1.4 }}>{questions[a.qIdx].q}</div>
                  <div style={{ fontSize: 13, color: T.accent, marginBottom: 4 }}>
                    {"\u2717"} Your answer: {questions[a.qIdx].choices[a.chosen]}
                  </div>
                  <div style={{ fontSize: 13, color: T.green, fontWeight: 600, marginBottom: 6 }}>
                    {"\u2713"} Correct: {questions[a.qIdx].choices[questions[a.qIdx].answer]}
                  </div>
                  <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, background: T.card, borderRadius: 6, padding: 10 }}>
                    {questions[a.qIdx].explanation}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={onBack} style={{ marginTop: 20, padding: "14px 40px", background: T.med, color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            Done
          </button>
        </div>
      </div>
    );
  }

  const origQIdx = shuffledOrder[current];
  const q = questions[origQIdx];
  const choiceMap = choiceOrders[origQIdx];
  const progress = (answers.length / quizLen) * 100;

  const mob = isMobile;
  const handleExitQuiz = () => {
    if (answers.length === 0 || window.confirm("Exit quiz? Your progress is saved — you can pick up where you left off next time.")) {
      onBack();
    }
  };

  return (
    <div style={{ padding: mob ? 10 : 16 }}>
      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: mob ? 8 : 16 }}>
        <button onClick={handleExitQuiz} aria-label="Exit quiz" title="Exit (your progress is saved)" style={{ background: "none", border: "none", color: T.med, fontSize: 20, cursor: "pointer", padding: "6px 4px", minHeight: 36 }}>{"\u2190"}</button>
        <div style={{ flex: 1 }}>
          <div style={{ height: 5, background: T.line, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: T.med, borderRadius: 3, transition: "width 0.4s ease" }} />
          </div>
        </div>
        <span style={{ fontSize: 13, color: T.sub, fontWeight: 600, fontFamily: T.mono, minWidth: 36, textAlign: "right" }}>{current + 1}/{quizLen}</span>
        <button onClick={handleExitQuiz} aria-label="Exit quiz, progress saved" title="Exit (your progress is saved)" style={{ padding: "4px 10px", background: T.card, color: T.sub, border: `1px solid ${T.line}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Exit
        </button>
        <button onClick={() => { if (answers.length > 0 && !window.confirm("Restart quiz? You'll lose your current answers.")) return; store.set(quizKey, null); setCurrent(0); setSelected(null); setAnswers([]); setCorrectCount(0); setFinished(false); setShowResult(false); setShowExplanation(false); const newShuffle = shuffleIndices(questions.length); const count = questionCount && questionCount < questions.length ? questionCount : questions.length; setShuffledOrder(newShuffle.slice(0, count)); setChoiceOrders(generateChoiceOrders(questions)); }}
          style={{ padding: "4px 10px", background: T.card, color: T.sub, border: `1px solid ${T.line}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Restart
        </button>
      </div>

      {/* Quiz title */}
      <div style={{ fontSize: 13, color: T.med, fontWeight: 700, marginBottom: mob ? 4 : 8 }}>{title}</div>

      {/* Question */}
      <div style={{ background: T.card, borderRadius: 12, padding: mob ? 12 : 20, marginBottom: mob ? 8 : 16, border: `1px solid ${T.line}` }}>
        <p style={{ color: T.text, fontSize: mob ? 14 : 15, lineHeight: 1.45, margin: 0, fontWeight: 500 }}>{q.q}</p>
      </div>

      {/* Choices (shuffled per-question) */}
      <div style={{ display: "flex", flexDirection: "column", gap: mob ? 6 : 10 }}>
        {choiceMap.map((origChoiceIdx, displayIdx) => {
          const c = q.choices[origChoiceIdx];
          const isCorrectChoice = origChoiceIdx === q.answer;
          let bg = T.card, border = T.line, textColor = T.text, fontW = 400;
          if (showResult) {
            if (isCorrectChoice) { bg = T.greenBg; border = T.green; textColor = T.greenDk; fontW = 600; }
            else if (displayIdx === selected && !isCorrectChoice) { bg = T.redBg; border = T.accent; textColor = T.accent; }
          } else if (displayIdx === selected) { bg = T.ice; border = T.med; }

          return (
            <button key={displayIdx} onClick={() => handleSelect(displayIdx)}
              style={{ padding: mob ? "10px 12px" : "14px 16px", background: bg, border: `2px solid ${border}`, borderRadius: 10,
                cursor: showResult ? "default" : "pointer", textAlign: "left", fontSize: mob ? 13 : 14, color: textColor,
                fontWeight: fontW, display: "flex", alignItems: "flex-start", gap: 10, transition: "all 0.2s", fontFamily: T.sans }}>
              <span style={{
                width: 22, height: 22, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center",
                background: showResult && isCorrectChoice ? T.green : showResult && displayIdx === selected ? T.accent : T.grayBg,
                color: showResult && (isCorrectChoice || displayIdx === selected) ? "white" : T.sub,
                fontSize: 13, fontWeight: 700, flexShrink: 0
              }}>
                {showResult && isCorrectChoice ? "\u2713" : showResult && displayIdx === selected ? "\u2717" : String.fromCharCode(65 + displayIdx)}
              </span>
              <span style={{ paddingTop: 1 }}>{c}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation + Next button */}
      {showResult && (() => {
        const selectedOrigIdx = choiceMap[selected!];
        const wasCorrect = selectedOrigIdx === q.answer;
        return (
          <div style={{ background: T.ice, borderRadius: 10, padding: mob ? 10 : 16, marginTop: mob ? 8 : 16, borderLeft: `3px solid ${T.med}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: wasCorrect ? T.greenDk : T.accent, marginBottom: 4 }}>
              {wasCorrect ? "\u2713 Correct!" : "\u2717 Not quite"}
            </div>
            <div style={{ fontSize: mob ? 12 : 13, color: T.text, lineHeight: 1.45, wordBreak: "break-word" }}>{q.explanation}</div>
            <button onClick={handleNext} style={{
              width: "100%", marginTop: mob ? 8 : 12, padding: mob ? "11px 0" : "14px 0", background: T.med, color: "white",
              border: "none", borderRadius: 10, fontSize: mob ? 14 : 15, fontWeight: 600, cursor: "pointer"
            }}>
              {current + 1 >= quizLen ? "See Results" : "Next Question \u2192"}
            </button>
          </div>
        );
      })()}
    </div>
  );
}
