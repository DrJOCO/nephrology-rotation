import { useState } from "react";
import { ArrowRight, BookOpen, ClipboardList, Lightbulb, Stethoscope, Sunrise, type LucideIcon } from "lucide-react";
import { T } from "../../data/constants";
import { Icon } from "./Icon";

const ONBOARDING_STEPS: Array<{
  icon: LucideIcon;
  title: string;
  body: string;
  hint: string;
}> = [
  {
    icon: ClipboardList,
    title: "Optional Baseline Check-In",
    body: "You can start with a short assessment to see which nephrology topics are already strong and which ones need more teaching during the rotation.",
    hint: "Results can tailor Today, review, and spaced repetition",
  },
  {
    icon: BookOpen,
    title: "Explore Your Module Curriculum",
    body: "Each module is built around core study sheets, quizzes, and cases, with journal articles, landmark trials, and guidelines available as optional reference.",
    hint: "Tap any module to see its content",
  },
  {
    icon: Stethoscope,
    title: "Log Inpatients on Rounds",
    body: "Track the hospital patients you see, tag diagnoses, and add follow-up notes to build your inpatient experience log.",
    hint: "Use the Inpatients tab during ward time",
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
            <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: i === step ? T.brand : T.pale, transition: "background 0.3s" }} />
          ))}
        </div>

        {/* Icon */}
        <div style={{ marginBottom: 16 }}>
          <Icon as={s.icon} size={48} color={T.brand} />
        </div>

        {/* Title */}
        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.navy, marginBottom: 8, fontFamily: T.serif }}>{s.title}</h2>

        {/* Body */}
        <p style={{ fontSize: 14, color: T.sub, lineHeight: 1.5, marginBottom: 12 }}>{s.body}</p>

        {/* Hint */}
        <div style={{ fontSize: 13, color: T.brand, fontWeight: 600, background: T.ice, borderRadius: 8, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
          <Icon as={Lightbulb} size={14} color={T.brand} />
          <span>{s.hint}</span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={handleDismiss}
            style={{ padding: "10px 20px", background: "none", border: "none", color: T.sub, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
            Skip
          </button>
          <button onClick={() => isLast ? handleDismiss() : setStep(step + 1)}
            style={{ padding: "10px 24px", background: T.brand, color: T.brandInk, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", minWidth: 120 }}>
            {isLast ? "Get Started" : "Next →"}
          </button>
        </div>

        {/* First Day Guide link on last step */}
        {isLast && onViewFirstDay && (
          <button onClick={() => { localStorage.setItem("neph_hasSeenOnboarding", "true"); onViewFirstDay(); }}
            style={{ marginTop: 16, background: "none", border: "none", color: T.brand, fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon as={Sunrise} size={14} color={T.brand} />
            <span>View First Day Orientation Guide</span>
            <Icon as={ArrowRight} size={14} color={T.brand} />
          </button>
        )}
      </div>
    </div>
  );
}
