import { useState, useEffect, useRef } from "react";
import { T } from "../../data/constants";
import { useIsMobile } from "../../utils/helpers";
import store from "../../utils/store";
import { ConfirmSheet, HeadlineMetric, Section } from "./shared";
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
  const explanationRef = useRef<HTMLDivElement | null>(null);
  const choicesRef = useRef<HTMLDivElement | null>(null);

  // A11y (spec §12): arrow keys move focus between choices; Enter/Space selects
  // via native button behavior. Selecting submits the answer, so focus movement
  // must never auto-select — plain buttons, not a radiogroup.
  const handleChoicesKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const buttons = Array.from(choicesRef.current?.querySelectorAll<HTMLButtonElement>("button") || []);
    if (buttons.length === 0) return;
    e.preventDefault();
    const idx = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown"
      ? (idx + 1) % buttons.length
      : (idx <= 0 ? buttons.length - 1 : idx - 1);
    buttons[next].focus();
  };

  // Quiz persistence
  const quizKey = "quiz_" + title.replace(/[^a-zA-Z0-9]/g, "_");
  const [restored, setRestored] = useState(false);
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false);

  const doRestart = () => {
    store.set(quizKey, null);
    setCurrent(0);
    setSelected(null);
    setAnswers([]);
    setCorrectCount(0);
    setFinished(false);
    setShowResult(false);
    setShowExplanation(false);
    const newShuffle = shuffleIndices(questions.length);
    const count = questionCount && questionCount < questions.length ? questionCount : questions.length;
    setShuffledOrder(newShuffle.slice(0, count));
    setChoiceOrders(generateChoiceOrders(questions));
    setRestartConfirmOpen(false);
  };

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
      // A snapshot marked done is a COMPLETED quiz — never resume it. Restoring
      // into a finished state would drop the student back on the answered final
      // question and record a duplicate attempt on finish. Reopening a completed
      // quiz must start a fresh attempt, so we discard the stale snapshot and
      // fall through to a new shuffle. (Belt-and-braces: handleNext already
      // clears on completion; this also cleans up snapshots persisted by app
      // versions that predate that fix.)
      const savedValid = saved?.shuffledOrder &&
        !saved.done &&
        saved.fingerprint === questionsFingerprint &&
        saved.shuffledOrder.every(idx => idx >= 0 && idx < questions.length);
      if (saved?.done) store.set(quizKey, null);
      if (savedValid) {
        setCurrent(saved.current || 0);
        setSelected(saved.selected ?? null);
        setAnswers(saved.answered || []);
        setCorrectCount(saved.score || 0);
        // savedValid guarantees !saved.done, so a restored quiz is always
        // in-progress — never resume into the finished screen.
        setFinished(false);
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
    requestAnimationFrame(() => {
      explanationRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const quizLen = shuffledOrder ? shuffledOrder.length : questions.length;

  const handleNext = () => {
    if (current + 1 >= quizLen) {
      // Clear saved progress synchronously as the quiz completes — do NOT rely
      // solely on the save effect, whose clear can be skipped if onFinish's
      // parent state update unmounts us before the effect commits. A lingering
      // snapshot would restore a completed quiz to its answered final question
      // in a "finished" state and record a DUPLICATE attempt on every reopen.
      // Duplicate weeklyScores can never be merged away (progressMerge unions
      // by attempt date), so leaving one behind is permanently harmful.
      store.set(quizKey, null);
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
    const tone: "success" | "warning" | "danger" = pct >= 80 ? "success" : pct >= 60 ? "warning" : "danger";
    return (
      <div style={{ padding: 16 }}>
        <Section eyebrow={`${title} complete`} style={{ marginBottom: 18 }}>
          <HeadlineMetric value={pct} unit="%" caption={`${correctCount} / ${quizLen} correct`} tone={tone} />
        </Section>

        {/* Missed questions review */}
        {missed.length > 0 && (
          <div style={{ textAlign: "left", marginTop: 16 }}>
            <div style={{ fontWeight: 700, color: T.ink, fontSize: 14, marginBottom: 10, fontFamily: T.serif }}>
              Review Missed Questions ({missed.length}):
            </div>
            {missed.map((a, i) => (
              <div key={i} style={{ background: T.dangerBg, borderRadius: 10, padding: 14, marginBottom: 10, borderLeft: `3px solid ${T.danger}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 8, lineHeight: 1.4 }}>{questions[a.qIdx].q}</div>
                <div style={{ fontSize: 13, color: T.danger, marginBottom: 4 }}>
                  {"\u2717"} Your answer: {questions[a.qIdx].choices[a.chosen]}
                </div>
                <div style={{ fontSize: 13, color: T.success, fontWeight: 600, marginBottom: 6 }}>
                  {"\u2713"} Correct: {questions[a.qIdx].choices[questions[a.qIdx].answer]}
                </div>
                <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, background: T.card, borderRadius: 6, padding: 10 }}>
                  {questions[a.qIdx].explanation}
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={onBack} style={{ marginTop: 20, padding: "14px 40px", background: T.brand, color: T.brandInk, border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          Done
        </button>
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
        <button onClick={handleExitQuiz} aria-label="Exit quiz" title="Exit (your progress is saved)" style={{ background: "none", border: "none", color: T.brand, fontSize: 20, cursor: "pointer", padding: "6px 4px", minHeight: 36 }}>{"\u2190"}</button>
        <div style={{ flex: 1 }}>
          <div style={{ height: 5, background: T.line, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: T.brand, borderRadius: 3, transition: "width 0.4s ease" }} />
          </div>
        </div>
        <span style={{ fontSize: 13, color: T.sub, fontWeight: 600, fontFamily: T.mono, minWidth: 36, textAlign: "right" }}>{current + 1}/{quizLen}</span>
        <button onClick={handleExitQuiz} aria-label="Exit quiz, progress saved" title="Exit (your progress is saved)" style={{ padding: "6px 12px", minHeight: 36, background: T.card, color: T.sub, border: `1px solid ${T.line}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Exit
        </button>
        <button onClick={() => { if (answers.length > 0) { setRestartConfirmOpen(true); return; } doRestart(); }}
          style={{ padding: "6px 12px", minHeight: 36, background: T.card, color: T.sub, border: `1px solid ${T.line}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Restart
        </button>
      </div>

      {/* Quiz title */}
      <div style={{ fontSize: 13, color: T.brand, fontWeight: 700, marginBottom: mob ? 4 : 8 }}>{title}</div>

      {/* Question */}
      <div style={{ background: T.card, borderRadius: 12, padding: mob ? 12 : 20, marginBottom: mob ? 8 : 16, border: `1px solid ${T.line}` }}>
        <p style={{ color: T.ink, fontSize: mob ? 14 : 15, lineHeight: 1.45, margin: 0, fontWeight: 500 }}>{q.q}</p>
      </div>

      {/* Choices (shuffled per-question) */}
      <div ref={choicesRef} role="group" aria-label="Answer choices" onKeyDown={handleChoicesKeyDown} style={{ display: "flex", flexDirection: "column", gap: mob ? 6 : 10 }}>
        {choiceMap.map((origChoiceIdx, displayIdx) => {
          const c = q.choices[origChoiceIdx];
          const isCorrectChoice = origChoiceIdx === q.answer;
          let bg = T.card, border = T.line, textColor = T.ink, fontW = 400;
          if (showResult) {
            if (isCorrectChoice) { bg = T.successBg; border = T.success; textColor = T.success; fontW = 600; }
            else if (displayIdx === selected && !isCorrectChoice) { bg = T.dangerBg; border = T.danger; textColor = T.danger; }
          } else if (displayIdx === selected) { bg = T.brandBg; border = T.brand; }

          return (
            <button key={displayIdx} onClick={() => handleSelect(displayIdx)}
              aria-pressed={displayIdx === selected}
              aria-disabled={showResult}
              aria-label={showResult
                ? `${c} — ${isCorrectChoice ? "correct answer" : displayIdx === selected ? "your answer, incorrect" : "not selected"}`
                : undefined}
              style={{ padding: mob ? "10px 12px" : "14px 16px", background: bg, border: `2px solid ${border}`, borderRadius: 10,
                cursor: showResult ? "default" : "pointer", textAlign: "left", fontSize: mob ? 13 : 14, color: textColor,
                fontWeight: fontW, display: "flex", alignItems: "flex-start", gap: 10, transition: "all 0.2s", fontFamily: T.sans }}>
              <span style={{
                width: 22, height: 22, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center",
                background: showResult && isCorrectChoice ? T.success : showResult && displayIdx === selected ? T.danger : T.grayBg,
                color: showResult && isCorrectChoice ? T.successInk : showResult && displayIdx === selected ? T.dangerInk : T.sub,
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
          <div ref={explanationRef} role="status" aria-live="polite" style={{ background: T.brandBg, borderRadius: 10, padding: mob ? 10 : 16, marginTop: mob ? 8 : 16, borderLeft: `3px solid ${T.brand}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: wasCorrect ? T.success : T.danger, marginBottom: 4 }}>
              {wasCorrect ? "\u2713 Correct!" : "\u2717 Not quite"}
            </div>
            <div style={{ fontSize: mob ? 12 : 13, color: T.ink, lineHeight: 1.45, wordBreak: "break-word" }}>{q.explanation}</div>
            <button onClick={handleNext} style={{
              width: "100%", marginTop: mob ? 8 : 12, padding: mob ? "11px 0" : "14px 0", background: T.brand, color: T.brandInk,
              border: "none", borderRadius: 10, fontSize: mob ? 14 : 15, fontWeight: 600, cursor: "pointer"
            }}>
              {current + 1 >= quizLen ? "See Results" : "Next Question \u2192"}
            </button>
          </div>
        );
      })()}

      {restartConfirmOpen && (
        <ConfirmSheet
          title="Restart quiz?"
          message="You'll lose your current answers and start over with a fresh shuffle."
          confirmLabel="Restart"
          cancelLabel="Keep going"
          tone="danger"
          onConfirm={doRestart}
          onCancel={() => setRestartConfirmOpen(false)}
        />
      )}
    </div>
  );
}
