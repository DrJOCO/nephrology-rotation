import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PatientTab from "./PatientTab";
import type { Patient } from "../../types";

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

const latest: { patients: Patient[] } = { patients: [] };

function Harness({ initial = [] }: { initial?: Patient[] }) {
  const [patients, setPatients] = useState<Patient[]>(initial);
  latest.patients = patients;
  return <PatientTab patients={patients} setPatients={setPatients} />;
}

afterEach(cleanup);

describe("PatientTab (picklist-only consult log)", () => {
  it("offers no free-text fields in the add form — only the topic search box", () => {
    const { container } = render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add with details" }));

    expect(container.querySelectorAll("textarea")).toHaveLength(0);
    const inputs = Array.from(container.querySelectorAll("input"));
    expect(inputs.map(input => input.type)).toEqual(["search"]);
  });

  it("saves topics plus picked details and nothing else", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add with details" }));

    fireEvent.click(screen.getByRole("button", { name: "AKI" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Setting" })).getByRole("button", { name: "ICU" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Requesting service" })).getByRole("button", { name: "Cardiology" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to Consult Log" }));

    expect(latest.patients).toHaveLength(1);
    const [entry] = latest.patients;
    expect(Object.keys(entry).sort()).toEqual(["date", "followUps", "id", "service", "setting", "status", "topics"]);
    expect(entry).toMatchObject({ topics: ["AKI"], setting: "icu", service: "cardiology", status: "active", followUps: [] });
  });

  it("clears a detail when the selected chip is tapped again during edit", () => {
    render(<Harness initial={[{ id: 1, topics: ["CKD"], setting: "floor", date: new Date().toISOString(), status: "active", followUps: [] }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit consult: CKD" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Setting" })).getByRole("button", { name: "✓ Floor" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(latest.patients[0]).not.toHaveProperty("setting");
  });

  it("records a follow-up as a date only, once per day", () => {
    render(<Harness initial={[{ id: 1, topics: ["Hyponatremia"], date: new Date().toISOString(), status: "active", followUps: [] }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Mark Hyponatremia seen again today" }));

    const [followUp] = latest.patients[0].followUps;
    expect(Object.keys(followUp).sort()).toEqual(["date", "id"]);
    expect(screen.getByRole("button", { name: "Already marked seen today" })).toBeDisabled();
  });
});
