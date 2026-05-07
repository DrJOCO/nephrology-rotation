import { useState } from "react";
import { T } from "../../data/constants";
import { Button, InfoBar } from "./shared";

const ONBOARDING_STEPS = [
  {
    title: "Start with the baseline",
    body: "You can start with a short assessment to see which nephrology topics are already strong and which ones need more teaching during the rotation.",
    hint: "Results help tune Today, review, and spaced repetition.",
  },
  {
    title: "Use Today as the worklist",
    body: "Today collects the core work for the current module and keeps optional references separate from required learning.",
    hint: "Start here when you are deciding what to do next.",
  },
  {
    title: "Open the module curriculum",
    body: "Each module is built around study sheets, quizzes, and cases, with journal articles, landmark trials, and guidelines available as optional reference.",
    hint: "Use the module view when you want the full content map.",
  },
  {
    title: "Track inpatients on rounds",
    body: "Track the hospital patients you see, tag diagnoses, and add follow-up notes to build your inpatient experience log.",
    hint: "Use the Inpatients tab during ward time.",
  },
  {
    title: "Review progress deliberately",
    body: "Progress combines quiz signal, cases, spaced repetition, and patient exposure so you can see where to spend the next block of attention.",
    hint: "Saved items and recommendations stay available when you need a fast return path.",
  },
];

export default function OnboardingOverlay({ onDismiss, onViewFirstDay }: { onDismiss: () => void; onViewFirstDay?: () => void }) {
  const [step, setStep] = useState(0);
  const s = ONBOARDING_STEPS[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;

  const handleDismiss = () => {
    localStorage.setItem("neph_hasSeenOnboarding", "true");
    onDismiss();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: T.overlay, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
      <div style={{ background: T.card, borderRadius: 8, maxWidth: 392, width: "100%", padding: "24px 22px 22px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", animation: "fadeIn 0.3s ease", border: `1px solid ${T.line}` }}>
        <div style={{ fontFamily: T.mono, color: T.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0, marginBottom: 12 }}>
          Step {step + 1} of {ONBOARDING_STEPS.length}
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          {ONBOARDING_STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 0, background: i <= step ? T.ink : T.line, transition: "background 0.3s" }} />
          ))}
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: "0 0 8px", fontFamily: T.serif, lineHeight: 1.15 }}>{s.title}</h2>
        <p style={{ fontSize: 14, color: T.ink2, lineHeight: 1.55, margin: "0 0 14px" }}>{s.body}</p>

        <InfoBar tone="neutral" style={{ marginBottom: 20 }}>{s.hint}</InfoBar>

        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={handleDismiss}
            style={{ padding: "10px 0", background: "none", border: "none", color: T.ink2, fontSize: 13, cursor: "pointer", fontWeight: 600 }}
          >
            Skip
          </button>
          <Button tone="ink" onClick={() => isLast ? handleDismiss() : setStep(step + 1)} style={{ minWidth: 124 }}>
            {isLast ? "Get started" : "Next"}
          </Button>
        </div>

        {isLast && onViewFirstDay && (
          <button onClick={() => { localStorage.setItem("neph_hasSeenOnboarding", "true"); onViewFirstDay(); }}
            style={{ marginTop: 16, background: "none", border: "none", color: T.ink, fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
            View First Day Orientation Guide
          </button>
        )}
      </div>
    </div>
  );
}
