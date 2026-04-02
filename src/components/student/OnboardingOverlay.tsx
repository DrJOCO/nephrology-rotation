import { useState } from "react";
import { T } from "../../data/constants";

const ONBOARDING_STEPS = [
  {
    icon: "\uD83D\uDCDD",
    title: "Take the Pre-Rotation Quiz",
    body: "Start with a 25-question assessment to identify your strengths and areas to focus on during the rotation.",
    hint: "Your results will guide your study plan",
  },
  {
    icon: "\uD83D\uDCDA",
    title: "Explore Your Weekly Curriculum",
    body: "Each week covers key nephrology topics with quizzes, journal articles, landmark trials, and study sheets.",
    hint: "Tap any week to see its content",
  },
  {
    icon: "\uD83C\uDFE5",
    title: "Log Patients on Rounds",
    body: "Track the patients you see, tag diagnoses, and add follow-up notes to build your clinical experience log.",
    hint: "Use the Rounds tab during ward time",
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
      <div style={{ background: T.card, borderRadius: 20, maxWidth: 360, width: "100%", padding: "32px 24px 24px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", animation: "fadeIn 0.3s ease" }}>
        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
          {ONBOARDING_STEPS.map((_, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: i === step ? T.med : T.pale, transition: "background 0.3s" }} />
          ))}
        </div>

        {/* Icon */}
        <div style={{ fontSize: 48, marginBottom: 16 }}>{s.icon}</div>

        {/* Title */}
        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.navy, marginBottom: 8, fontFamily: T.serif }}>{s.title}</h2>

        {/* Body */}
        <p style={{ fontSize: 14, color: T.sub, lineHeight: 1.5, marginBottom: 12 }}>{s.body}</p>

        {/* Hint */}
        <div style={{ fontSize: 11, color: T.med, fontWeight: 600, background: T.ice, borderRadius: 8, padding: "6px 12px", display: "inline-block", marginBottom: 24 }}>
          💡 {s.hint}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={handleDismiss}
            style={{ padding: "10px 20px", background: "none", border: "none", color: T.sub, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
            Skip
          </button>
          <button onClick={() => isLast ? handleDismiss() : setStep(step + 1)}
            style={{ padding: "10px 24px", background: T.med, color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", minWidth: 120 }}>
            {isLast ? "Get Started" : "Next →"}
          </button>
        </div>

        {/* First Day Guide link on last step */}
        {isLast && onViewFirstDay && (
          <button onClick={() => { localStorage.setItem("neph_hasSeenOnboarding", "true"); onViewFirstDay(); }}
            style={{ marginTop: 16, background: "none", border: "none", color: T.med, fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
            🌅 View First Day Orientation Guide →
          </button>
        )}
      </div>
    </div>
  );
}
