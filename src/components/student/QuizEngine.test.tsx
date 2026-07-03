import "@testing-library/jest-dom/vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import QuizEngine from "./QuizEngine";
import type { QuizQuestion } from "../../types";

vi.mock("../../utils/store", () => ({
  default: {
    get: vi.fn(async () => null),
    set: vi.fn(),
  },
}));

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
