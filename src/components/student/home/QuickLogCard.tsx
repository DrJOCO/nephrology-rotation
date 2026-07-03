import { ArrowRight } from "lucide-react";
import { T, COMMON_PATIENT_TOPICS, TOPICS } from "../../../data/constants";
import type { SubView } from "../../../types";

// Cohort feedback: consult logging lost to Cerner because it started with a tab
// switch. This card puts the one-tap topic log directly on Today; the full list
// and search stay on the Consults tab.
export default function QuickLogCard({
  navigate,
  onLogTopic,
  confirm,
  onDismissConfirm,
}: {
  navigate: (tab: string, sv?: SubView) => void;
  onLogTopic: (topic: string) => void;
  confirm: { topic: string; summary: string } | null;
  onDismissConfirm: () => void;
}) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: T.ink, marginBottom: 8 }}>Saw a consult? One tap logs the topic:</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {COMMON_PATIENT_TOPICS.map(topic => (
          <button
            key={topic}
            onClick={() => onLogTopic(topic)}
            style={{ padding: "8px 12px", minHeight: 36, borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}>
            {topic}
          </button>
        ))}
        <button
          onClick={() => navigate("patients")}
          style={{ padding: "8px 12px", minHeight: 36, borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "none", color: T.brand, border: `1px dashed ${T.brand}`, display: "inline-flex", alignItems: "center", gap: 5 }}>
          All topics ({TOPICS.length}) <ArrowRight size={13} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      {confirm && (
        <div role="status" aria-live="polite" style={{ marginTop: 10, background: T.successBg, border: `1px solid ${T.success}`, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: T.success, fontWeight: 600, lineHeight: 1.4 }}>
            {confirm.topic} logged ✓ — {confirm.summary}
          </div>
          <button onClick={onDismissConfirm} aria-label="Dismiss confirmation"
            style={{ background: "none", border: "none", color: T.success, cursor: "pointer", fontSize: 16, minWidth: 36, minHeight: 36 }}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
