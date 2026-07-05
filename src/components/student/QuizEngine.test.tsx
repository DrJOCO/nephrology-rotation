import "@testing-library/jest-dom/vitest";
import { render, screen, within, fireEvent, act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import QuizEngine from "./QuizEngine";
import type { QuizQuestion, QuizScore } from "../../types";

// Stateful in-memory store mock so tests can observe saved-progress being
// written, cleared on finish, and read back on a reopen. Absent keys return
// null (a fresh quiz), matching the real store's behaviour.
const storeBacking = new Map<string, unknown>();
const storeGet = vi.fn(async (key: string) => (storeBacking.has(key) ? storeBacking.get(key) : null));
const storeSet = vi.fn(async (key: string, val: unknown) => {
  if (val === null || val === undefined) storeBacking.delete(key);
  else storeBacking.set(key, val);
});
vi.mock("../../utils/store", () => ({
  default: {
    get: (key: string) => storeGet(key),
    set: (key: string, val: unknown) => storeSet(key, val),
  },
}));

beforeEach(() => {
  storeBacking.clear();
  storeGet.mockClear();
  storeSet.mockClear();
});

afterEach(() => {
  cleanup();
});

// jsdom implements no layout, so Element.scrollIntoView is undefined. QuizEngine
// calls it from a requestAnimationFrame after answering; without a stub the rAF
// throws asynchronously (and can outlive an unmount). Provide a no-op.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom has no matchMedia; useIsMobile needs a stub with the listener API.
window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia;

const QUESTIONS: QuizQuestion[] = [
  { q: "Question one?", choices: ["A1", "B1", "C1"], answer: 0, explanation: "Because A1." },
  { q: "Question two?", choices: ["A2", "B2", "C2"], answer: 1, explanation: "Because B2." },
];

async function renderQuiz() {
  render(<QuizEngine questions={QUESTIONS} title="Test Quiz" onBack={() => {}} onFinish={() => {}} />);
  const group = await screen.findByRole("group", { name: "Answer choices" });
  return within(group).getAllByRole("button");
}

const QUIZ_KEY = "quiz_Test_Quiz";

// Answer one question (any choice) then advance. On the last question the
// advance button reads "See Results" and finishes the quiz.
async function answerCurrentAndAdvance() {
  const group = await screen.findByRole("group", { name: "Answer choices" });
  const choices = within(group).getAllByRole("button");
  fireEvent.click(choices[0]);
  const advance = await screen.findByRole("button", { name: /See Results|Next Question/ });
  fireEvent.click(advance);
}

// Drive a two-question quiz all the way to its finished screen.
async function completeQuiz() {
  await answerCurrentAndAdvance(); // Q1 -> Next Question
  await answerCurrentAndAdvance(); // Q2 -> See Results (finishes)
}

describe("QuizEngine keyboard navigation (spec §12)", () => {
  it("moves focus between choices with arrow keys, wrapping at both ends", async () => {
    const choices = await renderQuiz();
    choices[0].focus();

    fireEvent.keyDown(choices[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(choices[1]);

    fireEvent.keyDown(choices[1], { key: "ArrowUp" });
    expect(document.activeElement).toBe(choices[0]);

    fireEvent.keyDown(choices[0], { key: "ArrowUp" });
    expect(document.activeElement).toBe(choices[choices.length - 1]);

    fireEvent.keyDown(choices[choices.length - 1], { key: "ArrowDown" });
    expect(document.activeElement).toBe(choices[0]);
  });

  it("exposes selection state and locks choices after answering", async () => {
    const choices = await renderQuiz();
    expect(choices[0]).toHaveAttribute("aria-pressed", "false");
    expect(choices[0]).toHaveAttribute("aria-disabled", "false");

    fireEvent.click(choices[0]);

    expect(choices[0]).toHaveAttribute("aria-pressed", "true");
    for (const choice of choices) {
      expect(choice).toHaveAttribute("aria-disabled", "true");
    }
    // Answer is locked — clicking another choice must not change the selection.
    fireEvent.click(choices[1]);
    expect(choices[1]).toHaveAttribute("aria-pressed", "false");
  });
});

describe("QuizEngine completion (BUG A results screen + BUG B duplicate guard)", () => {
  it("shows a results screen when the quiz is finished", async () => {
    render(<QuizEngine questions={QUESTIONS} title="Test Quiz" onBack={() => {}} onFinish={() => {}} />);
    await completeQuiz();

    // Built-in finished screen renders the score summary and a Done button —
    // the student sees results instead of being bounced Home (BUG A).
    expect(await screen.findByText("Test Quiz complete")).toBeInTheDocument();
    expect(screen.getByText(/\d+ \/ 2 correct/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
    // The question view is gone — we are on the results screen, not a question.
    expect(screen.queryByRole("group", { name: "Answer choices" })).not.toBeInTheDocument();
  });

  it("clears saved progress when the quiz completes", async () => {
    render(<QuizEngine questions={QUESTIONS} title="Test Quiz" onBack={() => {}} onFinish={() => {}} />);

    // Mid-quiz there is a persisted in-progress snapshot to resume from.
    await answerCurrentAndAdvance();
    expect(storeBacking.get(QUIZ_KEY)).toBeTruthy();

    // Finishing the quiz must clear that snapshot so a reopen can't resume it.
    await answerCurrentAndAdvance();
    await screen.findByText("Test Quiz complete");
    expect(storeBacking.get(QUIZ_KEY) ?? null).toBeNull();
  });

  it("reopening after finish starts a fresh attempt with no duplicate recorded", async () => {
    const onFinish = vi.fn<(score: QuizScore) => void>();

    // First pass: complete the quiz — records exactly one attempt.
    const first = render(<QuizEngine questions={QUESTIONS} title="Test Quiz" onBack={() => {}} onFinish={onFinish} />);
    await completeQuiz();
    await screen.findByText("Test Quiz complete");
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(storeBacking.get(QUIZ_KEY) ?? null).toBeNull();

    // Reopen the completed quiz (unmount + remount, as navigating away and back
    // would do). Even if a stale done-snapshot lingered, it must not resume the
    // finished screen or re-fire onFinish.
    act(() => { first.unmount(); });
    // Simulate a legacy/interrupted lingering snapshot marked done to prove the
    // reopen path discards it rather than resuming into a duplicate attempt.
    storeBacking.set(QUIZ_KEY, {
      fingerprint: `${QUESTIONS.length}:${QUESTIONS.map(q => q.q).join("|")}`,
      shuffledOrder: [0, 1],
      current: 1,
      selected: 0,
      answered: [{ qIdx: 0, chosen: 0, correct: true }, { qIdx: 1, chosen: 0, correct: false }],
      score: 1,
      done: true,
      showExplanation: true,
      choiceOrders: { 0: [0, 1, 2], 1: [0, 1, 2] },
    });

    render(<QuizEngine questions={QUESTIONS} title="Test Quiz" onBack={() => {}} onFinish={onFinish} />);

    // Fresh attempt: a question is shown from the top, not the finished screen,
    // and no extra attempt was recorded merely by reopening.
    expect(await screen.findByRole("group", { name: "Answer choices" })).toBeInTheDocument();
    expect(screen.queryByText("Test Quiz complete")).not.toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument(); // progress counter reset to question 1
    expect(onFinish).toHaveBeenCalledTimes(1); // still just the one real finish
    // The stale done-snapshot was discarded. Any snapshot now present belongs to
    // the fresh attempt (in-progress, no answers yet) — never the completed one.
    const snapshot = storeBacking.get(QUIZ_KEY) as { done?: boolean; answered?: unknown[] } | undefined;
    if (snapshot) {
      expect(snapshot.done).toBeFalsy();
      expect(snapshot.answered ?? []).toHaveLength(0);
    }
  });
});
