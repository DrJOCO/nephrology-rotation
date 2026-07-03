import type { ReactNode } from "react";
import { T } from "../../data/constants";
import { BackButton, EduDisclaimer } from "./shared";

type GuideTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

function toneColor(tone: GuideTone) {
  return {
    neutral: T.muted,
    brand: T.brand,
    success: T.success,
    warning: T.warning,
    danger: T.danger,
    info: T.info,
  }[tone];
}

function toneBg(tone: GuideTone) {
  return {
    neutral: T.surface2,
    brand: T.brandBg,
    success: T.successBg,
    warning: T.warningBg,
    danger: T.dangerBg,
    info: T.infoBg,
  }[tone];
}

export function GuideShell({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  return (
    <div style={{ padding: 16 }}>
      <BackButton onClick={onBack} placement="floating" />
      {children}
      <div style={{ marginTop: 16 }}>
        <BackButton onClick={onBack} placement="inline" />
      </div>
      <EduDisclaimer />
    </div>
  );
}

export function GuideHeader({
  eyebrow,
  title,
  description,
  icon,
  meta,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
      {icon && (
        <div style={{ width: 52, height: 52, borderRadius: 8, background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {eyebrow && (
          <div style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: 0, marginBottom: 6 }}>
            {eyebrow}
          </div>
        )}
        <h2 style={{ color: T.ink, fontSize: 20, margin: 0, fontFamily: T.serif, fontWeight: 700, lineHeight: 1.2 }}>{title}</h2>
        {description && <div style={{ fontSize: 13, color: T.ink2, marginTop: 2, lineHeight: 1.45 }}>{description}</div>}
        {meta && <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>{meta}</div>}
      </div>
    </header>
  );
}

export function GuideBody({ children }: { children: ReactNode }) {
  return <main style={{ display: "grid", gap: 14 }}>{children}</main>;
}

export function GuideMeta({ children, tone = "brand", emphasis = "normal" }: { children: ReactNode; tone?: GuideTone; emphasis?: "normal" | "loud" }) {
  const color = toneColor(tone);
  return (
    <span style={{ fontSize: 13, fontWeight: 700, color, background: toneBg(tone), borderRadius: 6, padding: "3px 7px", textTransform: emphasis === "loud" ? "uppercase" : undefined }}>
      {children}
    </span>
  );
}

export function GuideAccordion({
  title,
  count,
  open,
  onToggle,
  tone = "brand",
  children,
}: {
  title: ReactNode;
  count?: ReactNode;
  open: boolean;
  onToggle: () => void;
  tone?: GuideTone;
  children: ReactNode;
}) {
  const color = toneColor(tone);
  return (
    <section style={{ background: T.card, borderRadius: 8, overflow: "hidden", border: `1px solid ${open ? color : T.line}`, transition: "border 0.2s" }}>
      <button type="button" onClick={onToggle} aria-expanded={open} style={{ width: "100%", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: T.ink, fontSize: 14 }}>{title}</div>
          {count && <div style={{ fontSize: 13, color: T.muted, marginTop: 1 }}>{count}</div>}
        </div>
        <span style={{ color: T.muted, fontSize: 14, transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>{"\u203A"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ height: 1, background: T.line, marginBottom: 12 }} />
          {children}
        </div>
      )}
    </section>
  );
}

export function GuideList({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", gap: 8 }}>{children}</div>;
}

export function GuideItem({ children, tone = "brand", template = false }: { children: ReactNode; tone?: GuideTone; template?: boolean }) {
  if (template) {
    return <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.5, wordBreak: "break-word", fontStyle: "italic", background: T.grayBg, borderRadius: 8, padding: "10px 12px" }}>{children}</div>;
  }
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <span style={{ color: toneColor(tone), fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>{"\u2022"}</span>
      <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.5, wordBreak: "break-word" }}>{children}</div>
    </div>
  );
}

export function GuideNumberedList({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section>
      <h3 style={{ color: T.ink, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>{title}</h3>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </section>
  );
}

export function GuideNumberedItem({ index, children }: { index: number; children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10, background: T.card, borderRadius: 8, padding: "12px 14px", border: `1px solid ${T.line}` }}>
      <span style={{ color: T.brand, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{index}.</span>
      <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

export function GuideFooter({ children }: { children: ReactNode }) {
  return (
    <footer style={{ textAlign: "center", padding: "2px 0 0", fontSize: 13, color: T.muted, fontStyle: "italic", lineHeight: 1.4 }}>
      {children}
    </footer>
  );
}
