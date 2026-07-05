import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HomeTab from "./HomeTab";
import { WEEKLY, ARTICLES } from "../../data/constants";
import { normalizeStudySheets } from "../../utils/studySheets";
import type { CompetencySummary } from "../../utils/competency";
import type { Gamification, Patient } from "../../types";

// jsdom has no matchMedia; useIsMobile needs a stub with the listener API
// (same shape used by QuizEngine.test.tsx).
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

const GAMIFICATION: Gamification = { points: 0, achievements: [], streaks: { currentDays: 0, longestDays: 0, lastActiveDate: null } };
const COMPETENCY_SUMMARY = {} as CompetencySummary;

function makePatient(overrides: Partial<Patient>): Patient {
  return {
    id: overrides.id ?? Math.random(),
    initials: "AB",
    room: "101",
    dx: "",
    topics: [],
    notes: "",
    date: "2026-07-01",
    status: "active",
    followUps: [],
    ...overrides,
  };
}

function renderHomeTab(patients: Patient[]) {
  return render(
    <HomeTab
      navigate={() => {}}
      preScore={null}
      postScore={null}
      curriculum={WEEKLY}
      articles={ARTICLES}
      studySheets={normalizeStudySheets()}
      announcements={[]}
      currentWeek={1}
      totalWeeks={4}
      rotationEnded={false}
      weeklyScores={{}}
      completedItems={{ articles: {}, studySheets: {}, cases: {}, decks: {}, consultTopics: {} }}
      bookmarks={{ trials: [], articles: [], cases: [], studySheets: [] }}
      srDueCount={0}
      patients={patients}
      setPatients={() => {}}
      onMarkPatientDirty={() => {}}
      onLogActivity={() => {}}
      online
      competencySummary={COMPETENCY_SUMMARY}
      gamification={GAMIFICATION}
      reflections={[]}
      onSubmitReflection={async () => null}
      installPromptVariant={null}
      onInstallApp={async () => {}}
      onDismissInstallPrompt={() => {}}
      onCompleteConsultTopic={() => {}}
    />,
  );
}

describe("HomeTab consult-linked learning (active-only filter)", () => {
  it("excludes discharged-only consult topics from the suggested learning section", () => {
    renderHomeTab([
      makePatient({ id: 1, status: "discharged", topics: ["AKI"] }),
    ]);

    // No active patients at all — the whole Consult-linked learning section
    // (gated on activePatientList.length > 0 in HomeTab) must not render.
    expect(screen.queryByText("Consult-linked learning")).not.toBeInTheDocument();
  });

  it("shows suggested learning for active consults but not for discharged ones in the same list", () => {
    renderHomeTab([
      makePatient({ id: 1, status: "active", topics: ["AKI"] }),
      makePatient({ id: 2, status: "discharged", topics: ["CKD"] }),
    ]);

    const heading = screen.getByText("Consult-linked learning");
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    const withinSection = within(section as HTMLElement);

    // Active-consult topic surfaces (as a topic chip and/or a suggested card).
    expect(withinSection.getAllByText("AKI").length).toBeGreaterThan(0);
    // Discharged-only topic must not surface as a topic chip or a suggested card
    // *within this section* — matches the Consults tab's own active-only predicate
    // (PatientTab.tsx). ("CKD" may still appear elsewhere, e.g. the static Quick Log
    // topic picker, which is unrelated to consult-derived suggestions.)
    expect(withinSection.queryByText("CKD")).not.toBeInTheDocument();
  });
});
