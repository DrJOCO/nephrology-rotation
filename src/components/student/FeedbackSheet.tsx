import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { T } from "../../data/constants";
import { useFocusTrap } from "../../utils/helpers";
import { FEEDBACK_NOTE_MAX, STUDENT_FEEDBACK_TAGS, submitStudentFeedback, type FeedbackTagValue } from "../../utils/feedback";

// ─────────────────────────────────────────────────────────────────────────
// FeedbackSheet — zero-discovery "this page confused me" reporting. Bottom
// sheet (mirrors ConfirmSheet's flex-end backdrop positioning) with a
// scrollable body / pinned header, mirroring ProfileSheet's dialog machinery
// (ESC to close, focus trap, backdrop click to dismiss). One tap on a tag +
// Send is enough — the note is optional.
// ─────────────────────────────────────────────────────────────────────────
export default function FeedbackSheet({
  page, studentId, studentName, rotationCode, onClose,
}: {
  page: string;
  studentId: string;
  studentName: string;
  rotationCode: string;
  onClose: () => void;
}) {
  const [selectedTag, setSelectedTag] = useState<FeedbackTagValue | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<"sent" | "queued" | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef);

  // Auto-close shortly after a successful/queued send so the confirmation is
  // seen but doesn't require a second tap to dismiss.
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(onClose, 1400);
    return () => clearTimeout(timer);
  }, [result, onClose]);

  const handleSend = async () => {
    if (!selectedTag || sending) return;
    setSending(true);
    const outcome = await submitStudentFeedback(rotationCode, {
      studentId,
      name: studentName,
      page,
      tag: selectedTag,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setSending(false);
    setResult(outcome.status);
  };

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="feedback-sheet-title"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: T.overlay, zIndex: 9998, display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "fadeIn 0.15s ease" }}
    >
      <div
        ref={panelRef}
        onClick={e => e.stopPropagation()}
        style={{
          background: T.surface, borderTop: `1px solid ${T.line}`, borderTopLeftRadius: 16, borderTopRightRadius: 16,
          width: "100%", maxWidth: 480, maxHeight: "85vh",
          display: "flex", flexDirection: "column",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 8px", flexShrink: 0 }}>
          <h2 id="feedback-sheet-title" style={{ margin: 0, fontFamily: T.serif, fontSize: 19, fontWeight: 600, color: T.ink, letterSpacing: -0.2 }}>
            What&rsquo;s going on on this page?
          </h2>
          <button
            onClick={onClose} aria-label="Close feedback"
            style={{ background: "transparent", border: "none", minHeight: 44, minWidth: 44, borderRadius: 8, cursor: "pointer", color: T.ink, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {result ? (
            <div style={{ padding: "24px 4px", textAlign: "center", fontSize: 15, fontWeight: 600, color: result === "sent" ? T.success : T.warning }}>
              {result === "sent" ? "Sent — thank you!" : "Queued — will send when you're back online."}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {STUDENT_FEEDBACK_TAGS.map((tagOption) => {
                  const selected = selectedTag === tagOption;
                  return (
                    <button
                      key={tagOption}
                      type="button"
                      onClick={() => setSelectedTag(tagOption)}
                      aria-pressed={selected}
                      style={{
                        padding: "10px 16px", borderRadius: 20, fontSize: 14, fontWeight: selected ? 700 : 500,
                        cursor: "pointer", minHeight: 44, transition: "all 0.15s",
                        background: selected ? T.brand : T.card, color: selected ? T.brandInk : T.ink,
                        border: selected ? `1.5px solid ${T.brand}` : `1.5px solid ${T.line}`,
                      }}
                    >
                      {tagOption}
                    </button>
                  );
                })}
              </div>

              <div>
                <textarea
                  value={note}
                  maxLength={FEEDBACK_NOTE_MAX}
                  onChange={(event) => setNote(event.target.value.slice(0, FEEDBACK_NOTE_MAX))}
                  placeholder="Anything else? No patient details, please. (optional)"
                  rows={3}
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${T.line}`,
                    background: T.surface2, color: T.ink, fontSize: 14, fontFamily: T.sans,
                    boxSizing: "border-box", resize: "vertical", minHeight: 72,
                  }}
                />
                <div style={{ textAlign: "right", fontSize: 11, color: T.muted, marginTop: 2 }}>
                  {note.length}/{FEEDBACK_NOTE_MAX}
                </div>
              </div>

              <button
                onClick={() => void handleSend()}
                disabled={!selectedTag || sending}
                style={{
                  minHeight: 48, borderRadius: 12, border: "none",
                  background: selectedTag && !sending ? `linear-gradient(135deg, ${T.brand}, ${T.ink})` : T.surface2,
                  color: selectedTag && !sending ? T.brandInk : T.muted,
                  fontSize: 15, fontWeight: 700, cursor: selectedTag && !sending ? "pointer" : "default",
                  boxShadow: selectedTag && !sending ? "0 10px 24px rgba(0,0,0,0.18)" : "none",
                }}
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
