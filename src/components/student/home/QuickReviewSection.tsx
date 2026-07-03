import { RefreshCw } from "lucide-react";
import { T } from "../../../data/constants";
import type { SubView } from "../../../types";
import type { NavAction } from "./types";

export default function QuickReviewSection({ srDueCount, navigate }: {
  srDueCount: number;
  navigate: (tab: string, sv?: SubView) => void;
}) {
  const srAction: NavAction = srDueCount > 0
    ? {
      label: "Review spaced repetition",
      meta: `${srDueCount} question${srDueCount !== 1 ? "s" : ""} due now`,
      tab: "today",
      subView: { type: "srReview" },
    }
    : {
      label: "Open extra practice",
      meta: "No SR due right now — use a fresh practice set instead",
      tab: "today",
      subView: { type: "extraPractice" },
    };

  return (
    <section style={{ marginBottom: 16 }}>
      <h2 style={{ margin: "0 0 10px", color: T.ink, fontFamily: T.serif, fontSize: 18, fontWeight: 700 }}>Quick review</h2>
      <button
        onClick={() => navigate(srAction.tab, srAction.subView)}
        style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.line}`, padding: "14px 14px", cursor: "pointer", textAlign: "left", display: "flex", gap: 12, alignItems: "flex-start", width: "100%" }}
      >
        <div style={{ width: 38, height: 38, borderRadius: 12, background: T.warningBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <RefreshCw size={18} strokeWidth={1.75} color={T.warning} aria-hidden="true" />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{srAction.label}</div>
          <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginTop: 3 }}>{srAction.meta}</div>
        </div>
      </button>
    </section>
  );
}
