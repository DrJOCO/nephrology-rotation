import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { T } from "../../data/constants";
import { applyTheme } from "../../utils/helpers";
import { Icon } from "../student/Icon";

export function AdminThemeToggle() {
  const [theme, setTheme] = useState(() =>
    document.documentElement.getAttribute("data-theme") || "light"
  );
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };
  return (
    <button onClick={toggle} style={{
      background: "transparent", border: `1px solid ${T.line}`, borderRadius: 0,
      padding: "5px 8px", cursor: "pointer", fontSize: 14, lineHeight: 1,
      color: T.ink, display: "flex", alignItems: "center",
    }} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
      <Icon as={theme === "dark" ? Sun : Moon} size={16} color={T.ink} />
    </button>
  );
}
