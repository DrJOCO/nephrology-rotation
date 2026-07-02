import { ArrowRight } from "lucide-react";
import { T } from "../../../data/constants";
import type { SubView } from "../../../types";
import type { StartChecklistItem } from "./types";

interface CorePathChecklistProps {
  startChecklist: StartChecklistItem[];
  currentWeek: number | null;
  isMobile: boolean;
  navigate: (tab: string, sv?: SubView) => void;
}

export default function CorePathChecklist({ startChecklist, currentWeek, isMobile, navigate }: CorePathChecklistProps) {
  const startChecklistDone = startChecklist.filter((item) => item.done).length;

  const handleStartChecklistClick = (item: StartChecklistItem) => {
    if (item.scrollTargetId) {
      document.getElementById(item.scrollTargetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (item.action) {
      navigate(item.action.tab, item.action.subView);
    }
  };

  const remaining = startChecklist.length - startChecklistDone;
  const allDone = remaining === 0;
  // Slim mode kicks in when "mostly done" — at most 1 item left. Renders a
  // single line + Continue CTA instead of the full 4-card grid, which gets
  // visually heavy once most boxes are checked.
  const slim = startChecklist.length > 0 && remaining <= 1;
  const nextItem = startChecklist.find(item => !item.done);
  const moduleLabel = currentWeek ? `Module ${currentWeek}` : "Core path";

  if (slim) {
    return (
      <section style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.line}`, padding: "14px 14px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: allDone ? T.success : T.infoBg, color: allDone ? T.successInk : T.info, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
            {allDone ? "✓" : remaining}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, lineHeight: 1.3 }}>
              {allDone ? `${moduleLabel} · all done` : `${moduleLabel} · 1 left`}
            </div>
            {nextItem && (
              <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.4, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nextItem.label}</div>
            )}
          </div>
        </div>
        {nextItem && (
          <button
            onClick={() => handleStartChecklistClick(nextItem)}
            style={{ marginTop: 10, width: "100%", background: T.brand, color: T.brandInk, border: "none", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            Continue <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </section>
    );
  }

  return (
    <section style={{ background: T.card, borderRadius: 18, border: `1px solid ${T.line}`, padding: "16px 16px", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, color: T.ink, fontFamily: T.serif, fontSize: 20, fontWeight: 700 }}>
            Core path for this module
          </h2>
          <p style={{ margin: "6px 0 0", color: T.sub, fontSize: 13, lineHeight: 1.55, maxWidth: 600 }}>
            Study sheets, decks, cases, and quiz. Follow your consults first if they point you elsewhere today.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <div style={{ background: T.infoBg, color: T.info, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 700 }}>
            {startChecklistDone}/{startChecklist.length} done
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        {startChecklist.map((item, index) => (
          <button
            key={item.label}
            onClick={() => handleStartChecklistClick(item)}
            style={{
              background: item.done ? T.successBg : T.warmBg,
              border: `1px solid ${item.done ? T.success : T.line}`,
              borderRadius: 14,
              padding: "12px 12px",
              cursor: "pointer",
              textAlign: "left",
              minHeight: 118,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, background: item.done ? T.success : T.card, color: item.done ? T.successInk : T.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, border: `1px solid ${item.done ? T.success : T.line}` }}>
                {item.done ? "✓" : index + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: item.done ? T.success : T.brand, textTransform: "uppercase", letterSpacing: 0.6 }}>
                {item.done ? "Done" : "Start"}
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.ink, lineHeight: 1.25, marginBottom: 6 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.45 }}>
              {item.meta}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
