import React, { useEffect, useRef } from "react";
import { T } from "../../data/constants";
import { useFocusTrap } from "../../utils/helpers";

export type AdminToastTone = "success" | "error" | "info";

export type AdminToastState = {
  id: number;
  message: string;
  tone: AdminToastTone;
};

export type AdminConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

export const adminLabel: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: T.sub,
  display: "block",
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: 0.3,
};

export const adminInput: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: `1.5px solid ${T.line}`,
  borderRadius: 8,
  fontSize: 14,
  boxSizing: "border-box",
  fontFamily: T.sans,
  outline: "none",
  background: T.card,
  color: T.text,
};

export function AdminToast({ toast, onClose }: { toast: AdminToastState | null; onClose: () => void }) {
  const [isMobile, setIsMobile] = React.useState(() => (typeof window !== "undefined" ? window.innerWidth < 700 : false));

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setIsMobile(window.innerWidth < 700);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onClose, 2600);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const tone = toast.tone === "success"
    ? { bg: T.successBg, border: T.success, text: T.success, icon: "✓" }
    : toast.tone === "error"
      ? { bg: T.dangerBg, border: T.danger, text: T.danger, icon: "!" }
      : { bg: T.infoBg, border: T.info, text: T.info, icon: "i" };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        ...(isMobile
          ? { left: 12, right: 12, bottom: `calc(${T.navH + T.navPad + 12}px + env(safe-area-inset-bottom, 0px))` }
          : { top: 18, right: 18, maxWidth: 360, width: "calc(100vw - 32px)" }),
        zIndex: 12000,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: tone.bg, border: `1px solid ${tone.border}`, color: tone.text, borderRadius: 14, padding: "12px 14px", boxShadow: "0 16px 36px rgba(0,0,0,0.18)" }}>
        <div style={{ width: 22, height: 22, borderRadius: 999, background: T.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
          {tone.icon}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, fontWeight: 600, flex: 1 }}>{toast.message}</div>
        <button onClick={onClose} aria-label="Dismiss notification" style={{ background: "none", border: "none", color: tone.text, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 8, margin: -8, minWidth: 32, minHeight: 32 }}>
          ×
        </button>
      </div>
    </div>
  );
}

export function AdminConfirmDialog({
  options,
  onCancel,
  onConfirm,
}: {
  options: AdminConfirmOptions | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!options) return null;
  return <AdminConfirmDialogBody options={options} onCancel={onCancel} onConfirm={onConfirm} />;
}

// Split so the hooks (focus trap, ESC) mount only while the dialog is open —
// mirrors the student ConfirmSheet's dialog semantics for this destructive gate.
function AdminConfirmDialogBody({
  options,
  onCancel,
  onConfirm,
}: {
  options: AdminConfirmOptions;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isDanger = options.tone === "danger";
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Initial focus lands on Cancel so Enter can't instantly confirm a delete.
  useFocusTrap(dialogRef, cancelRef);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 11000, background: T.overlay, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-message"
        style={{ background: T.card, borderRadius: 18, width: "100%", maxWidth: 420, padding: 22, boxShadow: "0 24px 64px rgba(0,0,0,0.28)" }}
      >
        <div id="admin-confirm-title" style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 8 }}>{options.title}</div>
        <div id="admin-confirm-message" style={{ fontSize: 13, color: T.sub, lineHeight: 1.6, marginBottom: 18 }}>{options.message}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button ref={cancelRef} onClick={onCancel} style={{ padding: "10px 14px", background: T.bg, border: `1px solid ${T.line}`, borderRadius: 10, color: T.sub, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {options.cancelLabel || "Cancel"}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "10px 14px",
              background: isDanger ? T.danger : T.brand,
              border: "none",
              borderRadius: 10,
              color: isDanger ? T.dangerInk : T.brandInk,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {options.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
