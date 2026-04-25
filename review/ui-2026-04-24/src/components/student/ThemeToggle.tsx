import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import { T } from "../../data/constants";

// Phase 2 (spec §01 + §02): light/dark toggle using Lucide monoline icons.
// Styled for the new light header — transparent background, ink foreground.
export default function ThemeToggle({ variant = "header" }: { variant?: "header" | "sheet" }) {
  const [theme, setTheme] = useState(() =>
    document.documentElement.getAttribute("data-theme") || "light"
  );
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("neph_theme", next);
  };
  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  const Icon = theme === "dark" ? Sun : Moon;
  const sheetStyle = variant === "sheet";
  return (
    <button
      onClick={toggle}
      aria-label={label}
      title={label}
      style={{
        background: sheetStyle ? "transparent" : "transparent",
        border: sheetStyle ? `1px solid ${T.line}` : "none",
        borderRadius: sheetStyle ? 12 : 8,
        padding: sheetStyle ? "10px 14px" : "8px",
        minHeight: 44, minWidth: 44,
        cursor: "pointer",
        color: T.ink,
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: sheetStyle ? 8 : 0,
        fontSize: 14, fontWeight: 500,
      }}
    >
      <Icon size={sheetStyle ? 16 : 18} strokeWidth={1.75} aria-hidden="true" />
      {sheetStyle && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}
