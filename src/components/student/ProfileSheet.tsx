import { useEffect, useRef, useState } from "react";
import { Bookmark, LogOut, X } from "lucide-react";
import { T } from "../../data/constants";
import { useFocusTrap } from "../../utils/helpers";
import { LIMITS } from "../../utils/validation";
import ThemeToggle from "./ThemeToggle";

export const STUDENT_YEAR_OPTIONS = ["MS3", "MS4"] as const;

// ─────────────────────────────────────────────────────────────────────────
// ProfileSheet — Phase 2 (spec §01). Right-side sheet surfacing the items
// that used to live in the cramped header: name, rotation code, competency
// signal, theme toggle, sign out. ESC to close. Click backdrop to close.
// ─────────────────────────────────────────────────────────────────────────
export default function ProfileSheet({
  studentName, studentYear, studentEmail, rotationCode, onUpdateStudentName, onUpdateStudentYear, onShowTutorial, onOpenSaved, onEndSession, onClose,
}: {
  studentName: string; studentYear: string; studentEmail: string; rotationCode: string | null;
  onUpdateStudentName: (nextName: string) => Promise<void>;
  onUpdateStudentYear: (nextYear: string) => Promise<void>;
  onShowTutorial?: () => void;
  onOpenSaved?: () => void;
  onEndSession: () => void; onClose: () => void;
}) {
  const [draftName, setDraftName] = useState(studentName);
  const [draftYear, setDraftYear] = useState(studentYear || STUDENT_YEAR_OPTIONS[0]);
  const [savingName, setSavingName] = useState(false);
  const [savingYear, setSavingYear] = useState(false);
  const [nameMessage, setNameMessage] = useState("");
  const [nameError, setNameError] = useState("");
  const [yearMessage, setYearMessage] = useState("");
  const [yearError, setYearError] = useState("");

  // Phase 2.5: ESC to close + focus trap + focus return to opener on unmount.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    setDraftName(studentName);
  }, [studentName]);

  useEffect(() => {
    setDraftYear(studentYear || STUDENT_YEAR_OPTIONS[0]);
  }, [studentYear]);

  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef);

  const trimmedDraftName = draftName.trim();
  const canSaveName = Boolean(trimmedDraftName && trimmedDraftName !== studentName.trim() && !savingName);
  const canSaveYear = Boolean(draftYear && draftYear !== studentYear && !savingYear);

  const handleSaveName = async () => {
    if (!canSaveName) return;
    setSavingName(true);
    setNameError("");
    setNameMessage("");
    try {
      await onUpdateStudentName(trimmedDraftName);
      setNameMessage("Display name updated.");
    } catch (error) {
      setNameError(error instanceof Error ? error.message : "Unable to save your name right now.");
    }
    setSavingName(false);
  };

  const handleSaveYear = async () => {
    if (!canSaveYear) return;
    setSavingYear(true);
    setYearError("");
    setYearMessage("");
    try {
      await onUpdateStudentYear(draftYear);
      setYearMessage("Training year updated.");
    } catch (error) {
      setYearError(error instanceof Error ? error.message : "Unable to save your year right now.");
    }
    setSavingYear(false);
  };

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="profile-sheet-title"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: T.overlay, zIndex: 9998, display: "flex", justifyContent: "flex-end", animation: "fadeIn 0.15s ease" }}
    >
      <div
        ref={panelRef}
        onClick={e => e.stopPropagation()}
        style={{
          background: T.surface, borderLeft: `1px solid ${T.line}`,
          width: "min(340px, 100%)", height: "100%",
          display: "flex", flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "calc(12px + env(safe-area-inset-top, 0px)) 20px 8px", borderBottom: `1px solid ${T.line}`, flexShrink: 0 }}>
          <h2 id="profile-sheet-title" style={{ margin: 0, fontFamily: T.serif, fontSize: 20, fontWeight: 600, color: T.ink, letterSpacing: -0.2 }}>Profile</h2>
          <button
            onClick={onClose} aria-label="Close profile"
            style={{ background: "transparent", border: "none", minHeight: 44, minWidth: 44, borderRadius: 8, cursor: "pointer", color: T.ink, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Name + rotation code */}
        <div style={{ paddingBottom: 12, borderBottom: `1px solid ${T.line}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>Student</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, marginBottom: 8 }}>{studentName || "—"}</div>
          <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5, marginBottom: 12 }}>
            {studentEmail
              ? "Use the same email later to reopen this account. If your display name is off, you can fix it here."
              : "This display name appears throughout the rotation. You can update it here anytime."}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Display Name
            </label>
            <input
              type="text"
              value={draftName}
              maxLength={LIMITS.NAME_MAX}
              onChange={(event) => {
                setDraftName(event.target.value.slice(0, LIMITS.NAME_MAX));
                if (nameError) setNameError("");
                if (nameMessage) setNameMessage("");
              }}
              placeholder="Your display name"
              style={{
                width: "100%",
                minHeight: 44,
                padding: "12px 14px",
                borderRadius: 12,
                border: `1px solid ${nameError ? T.danger : T.line}`,
                background: T.surface2,
                color: T.ink,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
            {studentEmail && (
              <div style={{ fontSize: 12, color: T.ink2 }}>
                Account email: {studentEmail}
              </div>
            )}
            {(nameMessage || nameError) && (
              <div
                style={{
                  fontSize: 12,
                  color: nameError ? T.danger : T.success,
                  background: nameError ? T.dangerBg : T.successBg,
                  border: `1px solid ${nameError ? T.danger : T.success}`,
                  borderRadius: 10,
                  padding: "8px 10px",
                  lineHeight: 1.45,
                }}
              >
                {nameError || nameMessage}
              </div>
            )}
            <button
              onClick={() => void handleSaveName()}
              disabled={!canSaveName}
              style={{
                minHeight: 44,
                borderRadius: 12,
                border: "none",
                background: canSaveName ? `linear-gradient(135deg, ${T.brand}, ${T.ink})` : T.surface2,
                color: canSaveName ? T.brandInk : T.muted,
                fontSize: 14,
                fontWeight: 700,
                cursor: canSaveName ? "pointer" : "default",
                boxShadow: canSaveName ? "0 10px 24px rgba(0,0,0,0.18)" : "none",
              }}
            >
              {savingName ? "Saving..." : "Save display name"}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Training Year
            </label>
            <select
              value={draftYear}
              onChange={(event) => {
                setDraftYear(event.target.value);
                if (yearError) setYearError("");
                if (yearMessage) setYearMessage("");
              }}
              style={{
                width: "100%",
                minHeight: 44,
                padding: "12px 14px",
                borderRadius: 12,
                border: `1px solid ${yearError ? T.danger : T.line}`,
                background: T.surface2,
                color: T.ink,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            >
              {STUDENT_YEAR_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {(yearMessage || yearError) && (
              <div
                style={{
                  fontSize: 12,
                  color: yearError ? T.danger : T.success,
                  background: yearError ? T.dangerBg : T.successBg,
                  border: `1px solid ${yearError ? T.danger : T.success}`,
                  borderRadius: 10,
                  padding: "8px 10px",
                  lineHeight: 1.45,
                }}
              >
                {yearError || yearMessage}
              </div>
            )}
            <button
              onClick={() => void handleSaveYear()}
              disabled={!canSaveYear}
              style={{
                minHeight: 44,
                borderRadius: 12,
                border: "none",
                background: canSaveYear ? T.brand : T.surface2,
                color: canSaveYear ? T.brandInk : T.muted,
                fontSize: 14,
                fontWeight: 700,
                cursor: canSaveYear ? "pointer" : "default",
              }}
            >
              {savingYear ? "Saving..." : "Save training year"}
            </button>
          </div>
          {rotationCode && (
            <span style={{ display: "inline-block", fontSize: 13, fontFamily: T.mono, letterSpacing: 1, color: T.ink2, background: T.surface2, border: `1px solid ${T.line}`, padding: "4px 10px", borderRadius: 999, marginTop: 12 }}>
              {rotationCode}
            </span>
          )}
        </div>

        {/* Theme */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Appearance</div>
          <ThemeToggle variant="sheet" />
        </div>

        </div>

        {/* Pinned footer — Tutorial + Sign out always visible */}
        <div style={{ flexShrink: 0, padding: "12px 20px calc(16px + env(safe-area-inset-bottom, 0px))", borderTop: `1px solid ${T.line}`, display: "flex", flexDirection: "column", gap: 8, background: T.surface }}>
          {onOpenSaved && (
            <button
              onClick={onOpenSaved}
              style={{
                width: "100%", minHeight: 40, padding: "10px 16px",
                background: "transparent", border: `1px solid ${T.line}`, borderRadius: 10,
                color: T.ink, fontSize: 14, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                cursor: "pointer",
              }}
            >
              <Bookmark size={16} strokeWidth={1.75} aria-hidden="true" />
              Saved items
            </button>
          )}
          {onShowTutorial && (
            <button
              onClick={onShowTutorial}
              style={{
                width: "100%", minHeight: 40, padding: "10px 16px",
                background: "transparent", border: `1px solid ${T.line}`, borderRadius: 10,
                color: T.ink, fontSize: 14, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                cursor: "pointer",
              }}
            >
              Show tutorial
            </button>
          )}
          <button
            onClick={() => { onClose(); onEndSession(); }}
            style={{
              width: "100%", minHeight: 40, padding: "10px 16px",
              background: "transparent", border: `1px solid ${T.line}`, borderRadius: 10,
              color: T.ink, fontSize: 14, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              cursor: "pointer",
            }}
          >
            <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
