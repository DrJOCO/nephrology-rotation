import type React from "react";

export const PRINT_THEME = {
  ink: "#1E1B16",
  sub: "#6E6458",
  muted: "#9A907F",
  line: "#D9D1BF",
  paper: "#FFFFFF",
  surface: "#FBF8F0",
  surfaceAlt: "#F3EEE3",
  alertBg: "#F4E4DD",
  pre: "#B8732C",
  post: "#6F7753",
  danger: "#7A2828",
};

export const printableReportStyle: React.CSSProperties = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  color: PRINT_THEME.ink,
  lineHeight: 1.5,
  padding: 20,
  background: PRINT_THEME.paper,
};
