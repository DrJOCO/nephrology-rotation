import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { T, COMMON_PATIENT_TOPICS, TOPICS } from "../../../data/constants";
import { isDuplicateQuickLog, clearQuickLogGuard, QUICK_LOG_DEDUPE_MS, OTHER_QUICK_LOG_SUMMARY } from "../../../utils/quickLog";
import type { SubView } from "../../../types";

// How long the Undo affordance stays offered after a log (ms).
const UNDO_WINDOW_MS = 5000;
// A just-tapped chip stays disabled for the dedup window to block a fat-finger
// double tap (visual mirror of the util-level guard).
const TAP_LOCK_MS = QUICK_LOG_DEDUPE_MS;

// Cohort feedback: consult logging lost to Cerner because it started with a tab
// switch. This card puts the one-tap topic log directly on Today; the full list
// and search stay on the Consults tab.
export default function QuickLogCard({
  navigate,
  onLogTopic,
  confirm,
  onDismissConfirm,
  onUndo,
}: {
  navigate: (tab: string, sv?: SubView) => void;
  onLogTopic: (topic: string) => void;
  confirm: { topic: string; summary: string } | null;
  onDismissConfirm: () => void;
  // Optional: when provided, the confirmation offers an "Undo" action for a few
  // seconds that removes the just-created entry (and its points).
  onUndo?: () => void;
}) {
  // Briefly locks the last-tapped chip so an accidental second tap can't double-log.
  const [lockedTopic, setLockedTopic] = useState<string | null>(null);
  const lockTimer = useRef<number | undefined>(undefined);
  // Hides the Undo button once its window elapses (the log stands).
  const [undoOffered, setUndoOffered] = useState(false);
  const undoTimer = useRef<number | undefined>(undefined);

  const handleTap = (topic: string) => {
    // Guard: swallow a repeat tap of the same topic inside the dedup window.
    if (isDuplicateQuickLog(topic)) return;
    setLockedTopic(topic);
    window.clearTimeout(lockTimer.current);
    lockTimer.current = window.setTimeout(() => setLockedTopic(null), TAP_LOCK_MS);
    onLogTopic(topic);
  };

  // Arm the Undo window whenever a fresh confirmation appears.
  useEffect(() => {
    if (!confirm || !onUndo) {
      setUndoOffered(false);
      return;
    }
    setUndoOffered(true);
    window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setUndoOffered(false), UNDO_WINDOW_MS);
    return () => window.clearTimeout(undoTimer.current);
  }, [confirm, onUndo]);

  useEffect(() => () => {
    window.clearTimeout(lockTimer.current);
    window.clearTimeout(undoTimer.current);
  }, []);

  const handleUndo = () => {
    window.clearTimeout(undoTimer.current);
    setUndoOffered(false);
    // An undo means the tap was unwanted, not a repeat — let the student
    // deliberately re-log the same topic right away.
    if (confirm) clearQuickLogGuard(confirm.topic);
    onUndo?.();
  };

  // Honesty: "Other" is filtered out of every recommendation surface, so never
  // promise it matched learning — show a straight, accurate confirmation.
  const confirmSummary = confirm
    ? (confirm.topic === "Other" ? OTHER_QUICK_LOG_SUMMARY : confirm.summary)
    : "";

  return (
    <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: T.ink, marginBottom: 8 }}>Saw a consult? One tap logs the topic:</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {COMMON_PATIENT_TOPICS.map(topic => (
          <button
            key={topic}
            onClick={() => handleTap(topic)}
            disabled={lockedTopic === topic}
            aria-disabled={lockedTopic === topic}
            style={{ padding: "8px 12px", minHeight: 36, borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: lockedTopic === topic ? "default" : "pointer", background: T.bg, color: T.ink, border: `1px solid ${T.line}`, opacity: lockedTopic === topic ? 0.55 : 1 }}>
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
            {confirm.topic} logged ✓ — {confirmSummary}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {onUndo && undoOffered && (
              <button onClick={handleUndo}
                style={{ background: "none", border: `1px solid ${T.success}`, color: T.success, cursor: "pointer", fontSize: 13, fontWeight: 700, borderRadius: 8, padding: "6px 12px", minHeight: 36 }}>
                Undo
              </button>
            )}
            <button onClick={onDismissConfirm} aria-label="Dismiss confirmation"
              style={{ background: "none", border: "none", color: T.success, cursor: "pointer", fontSize: 16, minWidth: 36, minHeight: 36 }}>
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
