import { BookOpen, Stethoscope, User as UserIcon, Home, Trophy } from "lucide-react";
import { T } from "../../data/constants";
import type { SubView } from "../../types";

// Tab data — Phase 3a (spec §01/§03): 5-tab IA (Today · Library · Inpatients · Team · Me).
// Lucide monoline icons per §02.
const tabs: Array<{ id: string; Icon: typeof BookOpen; label: string }> = [
  { id: "today", Icon: Home, label: "Today" },
  { id: "library", Icon: BookOpen, label: "Library" },
  { id: "patients", Icon: Stethoscope, label: "Consults" },
  { id: "team", Icon: Trophy, label: "Cohort" },
  { id: "me", Icon: UserIcon, label: "Me" },
];

// ─────────────────────────────────────────────────────────────────────────
// StudentBottomNav — fixed 5-tab bottom navigation. Hidden during quiz
// sessions so feedback isn't covered.
// Pure move of the nav block that previously lived inline in StudentApp.
// ─────────────────────────────────────────────────────────────────────────
function StudentBottomNav({
  tab, subView, navigate,
}: {
  tab: string;
  subView: SubView;
  navigate: (t: string, sv?: SubView) => void;
}) {
  if (subView && (subView.type === "weeklyQuiz" || subView.type === "reviewMissed" || subView.type === "preQuiz" || subView.type === "postQuiz")) {
    return null;
  }
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: T.card, borderTop: `1px solid ${T.line}`, display: "flex", zIndex: 100, boxShadow: "0 -2px 12px rgba(0,0,0,0.06)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {tabs.map(t => {
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={() => navigate(t.id)}
            style={{ flex: 1, padding: "8px 0 6px", background: active ? T.surface2 : "none", border: "none", borderRadius: active ? 12 : 0, margin: "4px 2px", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              color: active ? T.brand : T.sub,
              transition: "background 0.15s ease, color 0.15s ease",
            }}>
            <t.Icon size={20} strokeWidth={active ? 2 : 1.75} aria-hidden="true" />
            <span style={{ fontSize: 13, fontWeight: active ? 700 : 500 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default StudentBottomNav;
