import { ArrowRight, Check } from "lucide-react";
import { T } from "../../../data/constants";
import type { SubView } from "../../../types";
import type { PatientSuggestedTopicGroup } from "../../../utils/patientRecommendations";
import type { HeroCard } from "./types";

interface HeroSectionProps {
  heroCard: HeroCard;
  isMobile: boolean;
  navigate: (tab: string, sv?: SubView) => void;
  suggestedExpanded: boolean;
  patientSuggestedGroups: PatientSuggestedTopicGroup[];
  selectedTopicIdx: number;
  onSelectTopic: (idx: number) => void;
  onCompleteTopic: (group: PatientSuggestedTopicGroup) => void;
}

export default function HeroSection({
  heroCard,
  isMobile,
  navigate,
  suggestedExpanded,
  patientSuggestedGroups,
  selectedTopicIdx,
  onSelectTopic,
  onCompleteTopic,
}: HeroSectionProps) {
  // Hero tones reduced from 4 to 2 (PR 2, option B): rounds-day vs clinic-day.
  // didactic/wrap fold into the rounds-day style; clinic gets the only distinct tone.
  const heroToneStyles: Record<HeroCard["tone"], { background: string; border: string; badge: string }> = {
    rounds:   { background: T.card, border: T.brand,   badge: T.brand },
    didactic: { background: T.card, border: T.brand,   badge: T.brand },
    clinic:   { background: T.card, border: T.success, badge: T.success },
    wrap:     { background: T.card, border: T.brand,   badge: T.brand },
  };
  const heroStyle = heroToneStyles[heroCard.tone];

  return (
    <div style={{ background: heroStyle.background, borderRadius: 20, padding: 18, border: `1.5px solid ${heroStyle.border}`, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, color: T.ink, fontFamily: T.serif, fontSize: 24, fontWeight: 700, lineHeight: 1.15 }}>
            {heroCard.title}
          </h2>
          <p style={{ margin: "8px 0 0", color: T.ink, fontSize: 14, lineHeight: 1.55, maxWidth: 560 }}>
            {heroCard.body}
          </p>
        </div>
        <div style={{ background: T.card, color: heroStyle.badge, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 700, border: `1px solid ${T.line}`, whiteSpace: "nowrap" }}>
          {heroCard.badge}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile || heroCard.actions.length === 1 ? "1fr" : "1fr 1fr", gap: 10 }}>
        {heroCard.actions.map((action, index) => (
          <button
            key={`${action.label}-${index}`}
            onClick={() => action.onClick ? action.onClick() : navigate(action.tab, action.subView)}
            style={{
              width: "100%",
              background: index === 0 ? T.brand : T.card,
              color: index === 0 ? T.brandInk : T.ink,
              border: index === 0 ? "none" : `1px solid ${T.line}`,
              borderRadius: 14,
              padding: "14px 14px",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{action.label}</div>
              <div style={{ fontSize: 13, color: index === 0 ? T.brandInk : T.sub, opacity: index === 0 ? 0.85 : 1, marginTop: 3 }}>
                {action.meta}
              </div>
            </div>
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0 }} />
          </button>
        ))}
      </div>

      {/* Cohort feedback: students couldn't find non-current modules — give the
          hero card a direct path so discovery doesn't depend on the Library tab. */}
      <button
        onClick={() => navigate("library")}
        style={{ marginTop: 10, background: "none", border: "none", color: T.brand, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "6px 0", minHeight: 36, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        Browse all modules <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
      </button>

      {suggestedExpanded && patientSuggestedGroups.length > 0 && (() => {
        const safeIdx = Math.min(selectedTopicIdx, patientSuggestedGroups.length - 1);
        const active = patientSuggestedGroups[safeIdx];
        return (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
            {/* Topic tabs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }} aria-label="Consult topics">
              {patientSuggestedGroups.map((group, idx) => {
                const sel = idx === safeIdx;
                return (
                  <button
                    key={group.topic}
                    aria-pressed={sel}
                    onClick={() => onSelectTopic(idx)}
                    style={{
                      background: sel ? T.brand : "transparent",
                      color: sel ? T.brandInk : T.ink,
                      border: `1px solid ${sel ? T.brand : T.line}`,
                      borderRadius: 999,
                      padding: "6px 12px",
                      fontSize: 13,
                      fontWeight: sel ? 700 : 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {group.topic}
                  </button>
                );
              })}
            </div>

            {/* Active topic content */}
            <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, color: T.muted }}>{active.reason}</div>
                <button
                  onClick={() => onCompleteTopic(active)}
                  title="Dismiss this consult topic"
                  style={{
                    background: T.successBg,
                    color: T.success,
                    border: `1px solid ${T.success}`,
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Check size={13} strokeWidth={2.4} aria-hidden="true" /> Done
                </button>
              </div>
              {active.guides.length > 0 && (
                <div style={{ marginBottom: (active.sheets.length > 0 || active.trials.length > 0 || active.tools.length > 0) ? 12 : 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Consult guides</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {active.guides.map(guide => (
                      <button
                        key={guide.id}
                        onClick={() => navigate(guide.nav[0], guide.nav[1] as SubView)}
                        style={{ background: "none", border: "none", padding: "6px 0", cursor: "pointer", textAlign: "left", color: T.brand, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "flex-start", gap: 6 }}
                      >
                        <ArrowRight size={13} strokeWidth={2} aria-hidden="true" style={{ marginTop: 4, flexShrink: 0 }} />
                        <span><span style={{ fontWeight: 700 }}>{guide.label}</span> <span style={{ color: T.sub, fontWeight: 400 }}>— {guide.subtitle}</span></span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {active.sheets.length > 0 && (
                <div style={{ marginBottom: active.trials.length > 0 ? 12 : 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Study sheets</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {active.sheets.map(s => (
                      <button
                        key={s.id}
                        onClick={() => navigate("today", { type: "studySheets", week: s.week, sheetId: s.id })}
                        style={{ background: "none", border: "none", padding: "6px 0", cursor: "pointer", textAlign: "left", color: T.brand, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <ArrowRight size={13} strokeWidth={2} aria-hidden="true" /> {s.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {active.trials.length > 0 && (
                <div style={{ marginBottom: active.tools.length > 0 ? 12 : 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Landmark trials</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {active.trials.map(t => (
                      <button
                        key={t.name}
                        onClick={() => navigate("today", { type: "trials", week: t.week })}
                        style={{ background: "none", border: "none", padding: "6px 0", cursor: "pointer", textAlign: "left", color: T.brand, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "flex-start", gap: 6 }}
                      >
                        <ArrowRight size={13} strokeWidth={2} aria-hidden="true" style={{ marginTop: 4, flexShrink: 0 }} />
                        <span><span style={{ fontWeight: 700 }}>{t.name}</span> <span style={{ color: T.sub, fontWeight: 400 }}>— {t.takeaway}</span></span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {active.tools.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Clinical tools</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {active.tools.map(tool => (
                      <button
                        key={tool.id}
                        onClick={() => navigate(tool.nav[0], tool.nav[1] as SubView)}
                        style={{ background: "none", border: "none", padding: "6px 0", cursor: "pointer", textAlign: "left", color: T.brand, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "flex-start", gap: 6 }}
                      >
                        <ArrowRight size={13} strokeWidth={2} aria-hidden="true" style={{ marginTop: 4, flexShrink: 0 }} />
                        <span><span style={{ fontWeight: 700 }}>{tool.label}</span> <span style={{ color: T.sub, fontWeight: 400 }}>— {tool.description}</span></span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
