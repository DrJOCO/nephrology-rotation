import { useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() =>
    document.documentElement.getAttribute("data-theme") || "light"
  );
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("neph_theme", next);
  };
  return (
    <button onClick={toggle} style={{
      background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8,
      padding: "5px 8px", cursor: "pointer", fontSize: 14, lineHeight: 1,
      color: "white", display: "flex", alignItems: "center",
    }} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
      {theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}
    </button>
  );
}
