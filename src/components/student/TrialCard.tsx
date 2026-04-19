import { useState } from "react";
import { T, TRIAL_CATEGORY_ORDER } from "../../data/constants";
import type { Trial, Bookmarks } from "../../types";

export function TrialCard({ trial, isOpen, onToggle, isBookmarked, onToggleBookmark }: { trial: Trial; isOpen: boolean; onToggle: () => void; isBookmarked: boolean; onToggleBookmark?: (name: string) => void }) {
  return (
    <div style={{ background: T.card, borderRadius: 12, marginBottom: 8, border: `1px solid ${isOpen ? T.gold : T.line}`, overflow: "hidden", transition: "border 0.2s" }}>
      <button onClick={onToggle}
        style={{ width: "100%", padding: "12px 14px", background: isOpen ? T.yellowBg : T.card, border: "none", cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: T.yellowBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{"\u2B50"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, marginBottom: 2, flex: 1 }}>{trial.name}</div>
              {onToggleBookmark && <button onClick={(e) => { e.stopPropagation(); onToggleBookmark(trial.name); }} style={{ background: "none", border: "none", fontSize: 16, color: isBookmarked ? T.gold : T.muted, cursor: "pointer", flexShrink: 0, padding: "8px", margin: "-8px", lineHeight: 1 }}>{isBookmarked ? "\u2605" : "\u2606"}</button>}
            </div>
            <div style={{ fontSize: 13, color: T.sub }}>{trial.journal} ({trial.year})</div>
            <div style={{ fontSize: 13, color: T.text, marginTop: 5, lineHeight: 1.45, fontStyle: "italic" }}>{trial.takeaway}</div>
          </div>
          <span style={{ color: T.muted, fontSize: 18, transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>{"\u203A"}</span>
        </div>
      </button>
      {isOpen && (
        <div style={{ padding: "0 14px 14px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>Full Title</div>
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, marginBottom: 12 }}>{trial.full_title}</div>
          {trial.details && (<>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>Study Details</div>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, marginBottom: 12, background: T.yellowBg, borderRadius: 8, padding: 12, borderLeft: `3px solid ${T.gold}` }}>{trial.details}</div>
          </>)}
          <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>How It Changed Practice</div>
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, marginBottom: 12, background: T.ice, borderRadius: 8, padding: 12 }}>{trial.significance}</div>
          <a href={trial.url} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: T.med, textDecoration: "none" }}>
            Read Full Paper {"\u2197"}
          </a>
        </div>
      )}
    </div>
  );
}

export function CategoryGroupedTrials({ trials, categoryOrder = TRIAL_CATEGORY_ORDER, bookmarks, onToggleBookmark }: { trials: Trial[]; categoryOrder?: string[]; bookmarks: Bookmarks; onToggleBookmark: (name: string) => void }) {
  const [expandedTrial, setExpandedTrial] = useState<string | null>(null);
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});

  // Group trials by category, preserving order from TRIAL_CATEGORY_ORDER
  const grouped: Record<string, Trial[]> = {};
  trials.forEach(t => {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  });
  const orderedCategories = (categoryOrder || TRIAL_CATEGORY_ORDER).filter(c => grouped[c]);
  // Include categories not in the order list
  Object.keys(grouped).forEach(c => { if (!orderedCategories.includes(c)) orderedCategories.push(c); });

  const toggleCat = (cat: string) => setCollapsedCats(prev => ({ ...prev, [cat]: !prev[cat] }));

  return orderedCategories.map(cat => {
    const catTrials = grouped[cat];
    const isCollapsed = collapsedCats[cat];
    return (
      <div key={cat} style={{ marginBottom: 16 }}>
        <button onClick={() => toggleCat(cat)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
            background: T.warmBg, borderRadius: 10, border: "none", borderLeft: `3px solid ${T.gold}`,
            cursor: "pointer", textAlign: "left", marginBottom: isCollapsed ? 0 : 8 }}>
          <span style={{ fontSize: 14, color: T.goldText, fontWeight: 700, transition: "transform 0.2s",
            transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)", display: "inline-block" }}>{"\u25B8"}</span>
          <span style={{ fontWeight: 700, color: T.navy, fontSize: 14, flex: 1 }}>{cat}</span>
          <span style={{ fontSize: 13, color: T.sub, fontWeight: 600, background: T.yellowBg, borderRadius: 8, padding: "2px 8px" }}>
            {catTrials.length}
          </span>
        </button>
        {!isCollapsed && catTrials.map((trial, ti) => {
          const trialKey = `${cat}-${ti}`;
          return (
            <TrialCard key={trialKey} trial={trial}
              isOpen={expandedTrial === trialKey}
              onToggle={() => setExpandedTrial(expandedTrial === trialKey ? null : trialKey)}
              isBookmarked={(bookmarks?.trials || []).includes(trial.name)}
              onToggleBookmark={onToggleBookmark} />
          );
        })}
      </div>
    );
  });
}

export default TrialCard;
