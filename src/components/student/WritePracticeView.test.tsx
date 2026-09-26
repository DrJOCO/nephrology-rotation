import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import WritePracticeView, { WRITE_PRACTICE_RUBRIC } from "./WritePracticeView";
import InpatientGuideView from "./InpatientGuideView";
import { INPATIENT_GUIDE_TOPICS } from "../../data/inpatientGuides";

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

afterEach(cleanup);

describe("WritePracticeView", () => {
  it("lists a practice case for every consult guide", () => {
    const onSelectTopic = vi.fn();
    render(<WritePracticeView onBack={() => {}} onSelectTopic={onSelectTopic} onOpenGuide={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Hypernatremia Consult/ }));
    expect(onSelectTopic).toHaveBeenCalledWith("Hypernatremia");
    for (const title of ["Acid-Base Consult", "Hypercalcemia Consult", "Kidney Transplant with AKI", "Acute Interstitial Nephritis", "Obstructive (Post-Renal) AKI"]) {
      expect(screen.getByRole("button", { name: new RegExp(title.replace(/[()]/g, "\\$&")) })).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button", { name: /Consult|AKI|Nephritis|Dialysis|Rounding|Syndrome|Peritonitis|Kidney/ }).length).toBeGreaterThanOrEqual(INPATIENT_GUIDE_TOPICS.length);
  });

  it("hides the model answer until the student asks to compare, and saves nothing", () => {
    const storageBefore = window.localStorage.length;
    render(<WritePracticeView topic="AKI" onBack={() => {}} onSelectTopic={() => {}} onOpenGuide={() => {}} />);
    expect(screen.queryByText(/Model answer/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("2. Your one-liner"), { target: { value: "68M with CKD3a and urosepsis, now AKI" } });
    fireEvent.change(screen.getByLabelText("3. Your assessment & plan"), { target: { value: "ATN. 1. Hold lisinopril." } });
    fireEvent.click(screen.getByRole("button", { name: "Compare with the model answer" }));

    expect(screen.getByText("Model answer")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Your answer" })).getByText(/68M with CKD3a and urosepsis, now AKI/)).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(WRITE_PRACTICE_RUBRIC.length);
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText(/1 of 9/)).toBeInTheDocument();
    expect(window.localStorage.length).toBe(storageBefore);
  });
});

describe("InpatientGuideView", () => {
  it("shows the bedside sections and links to the free water deficit calculator", () => {
    const onOpenCalculator = vi.fn();
    const onPractice = vi.fn();
    render(<InpatientGuideView topic="Hypernatremia" onBack={() => {}} onOpenCalculator={onOpenCalculator} onPractice={onPractice} />);

    for (const title of ["Questions to Ask the Patient", "Exam: What to Look For", "Imaging & Key Tests", "Sample Written Assessment & Plan", "Presenting This Consult"]) {
      expect(screen.getByRole("button", { name: new RegExp(title) })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: /Open Free Water Deficit calculator/ }));
    expect(onOpenCalculator).toHaveBeenCalledWith("fwd");
    fireEvent.click(screen.getByRole("button", { name: /Practice this consult/ }));
    expect(onPractice).toHaveBeenCalledWith("Hypernatremia");
  });

  it("teaches the add-back method in the acid-base guide", () => {
    render(<InpatientGuideView topic="Acid-Base" onBack={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Quick Lesson: The Add-Back Method/ }));
    expect(screen.getByText(/corrected HCO3 = measured HCO3 \+ ΔAG/)).toBeInTheDocument();
  });
});
