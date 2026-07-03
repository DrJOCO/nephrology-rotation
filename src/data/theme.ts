import type { CSSProperties } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  Color rules (PR 3 — state-color discipline)
//
//  T.brand    → primary actions, focus ring, brand wordmark. Nothing else.
//  T.danger   → destructive confirms, lab values out of range. Nothing else.
//  T.success  → "completed" / "passing" state ONLY when also showing a checkmark.
//  T.warning  → pending / attention (admin badges, sync warnings).
//  T.info     → neutral metadata (counts, score chips, "in progress").
//  T.ink2     → most icons, most secondary text. Default for chrome.
//
//  Rationale: brand red was being used for primary CTAs *and* passing scores
//  *and* section accents — by the time a real "danger" appeared, red had lost
//  its meaning. Reserve each state color for one job.
// ─────────────────────────────────────────────────────────────────────────────

export const T = {
  // Deprecated aliases (navy/deep/med/ice/pale) were removed once the PR 3
  // migration replaced every call site with the semantic names below —
  // reintroducing them is a typecheck error, which is the point.
  dark: "var(--c-dark)",
  sub: "var(--c-sub)", muted: "var(--c-muted)", line: "var(--c-line)",
  bg: "var(--c-bg)", card: "var(--c-card)",
  // Dark header backgrounds — always dark regardless of theme
  navyBg: "var(--c-navy-bg)", deepBg: "var(--c-deep-bg)",
  // Semantic tint backgrounds
  grayBg: "var(--c-gray-bg)",
  warmBg: "var(--c-warm-bg)",
  // Overlay
  overlay: "var(--c-overlay)",
  // Fonts and layout — Phase 1 (Clinical Paper spec v1)
  serif: "'Newsreader', 'Source Serif 4', 'Crimson Pro', Georgia, serif",
  sans: "'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
  navH: 56, navPad: 8,

  // Semantic aliases (Phase 1). Old keys above still work. New code should
  // prefer these names — they mirror the spec's token vocabulary.
  ink: "var(--c-text)",        // primary text
  ink2: "var(--c-sub)",         // secondary text
  surface: "var(--c-card)",     // card / elevated surface
  surface2: "var(--c-ice)",     // sunken / tint surface

  // Phase 2 semantic palette — 4 roles + bgs.
  // Path A: brand keeps the deep-red identity (#8B2E2E light, #d97a7a dark).
  // Components should migrate to these. Old tokens above stay until PR 3.
  brand: "var(--c-brand)",        // primary action / focus / brand identity
  brandBg: "var(--c-brand-bg)",   // brand-tinted surface
  success: "var(--c-success)",    // done / passing / positive
  successBg: "var(--c-success-bg)",
  warning: "var(--c-warning)",    // caution / pending / attention
  warningBg: "var(--c-warning-bg)",
  danger: "var(--c-danger)",      // error / destructive / critical
  dangerBg: "var(--c-danger-bg)",

  // PR 5 — *Ink: foreground for text/icons on a SOLID state background
  //   (e.g. T.brandInk on background: T.brand). NOT for use on T.brandBg /
  //   T.successBg / etc. Tinted-bg foregrounds use the state color itself
  //   (color: T.brand on background: T.brandBg).
  brandInk: "var(--c-brand-ink)",
  successInk: "var(--c-success-ink)",
  warningInk: "var(--c-warning-ink)",
  dangerInk: "var(--c-danger-ink)",

  // Phase 3 (PR 3.1) — info channel + dedicated focus ring.
  // info = non-alarming slate blue (FYI / lab values / secondary links / patient-count chips).
  // focusRing = a single value, no variants — kept distinct from brand and danger.
  info: "var(--c-info)",
  infoDk: "var(--c-info-dk)",
  infoBg: "var(--c-info-bg)",
  infoAlpha: "var(--c-info-alpha)",
  infoInk: "var(--c-info-ink)",
  focusRing: "var(--c-focus-ring)",
};

// If you find yourself wanting a colored variant for a topic, stop. Topics are
// labels, not states. Use a state color (T.brand/danger/warning/success/info)
// only when the meaning is genuinely semantic.
export const labelChip: CSSProperties = {
  display: "inline-block",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  color: T.sub,
  background: T.bg,
  border: `1px solid ${T.line}`,
  padding: "3px 8px",
  borderRadius: 6,
  whiteSpace: "nowrap",
};
