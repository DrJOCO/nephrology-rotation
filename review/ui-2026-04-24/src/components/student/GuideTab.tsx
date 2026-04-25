import { useState } from "react";
import { HelpCircle, BookOpen } from "lucide-react";
import { T, ALL_LANDMARK_TRIALS, RESOURCES } from "../../data/constants";
import { GUIDE_SECTIONS, GUIDE_DATA } from "../../data/guides";
import { CLINIC_GUIDES, CLINIC_GUIDE_TOPICS, type ClinicGuideTopic } from "../../data/clinicGuides";
import { INPATIENT_GUIDES, INPATIENT_GUIDE_TOPICS } from "../../data/inpatientGuides";
import { ROTATION_GUIDES, ROTATION_GUIDE_IDS } from "../../data/rotationGuides";
import { getCurrentOrNextFriday } from "../../utils/clinicRotation";
import { useIsMobile } from "../../utils/helpers";
import { backBtnStyle } from "./shared";
import type { ClinicGuideRecord } from "../../types";

const GUIDE_THEME_COLOR_MAP: Record<string, string> = {
  "#2980b9": "#8B2E2E",
  "#16a085": "#6F7753",
  "#e67e22": "#B8732C",
  "#8e44ad": "#8A6A73",
  "#7d3c98": "#755A63",
  "#e74c3c": "#7A2828",
  "#c0392b": "#7A2828",
  "#d4ac0d": "#8F5A23",
  "#2c3e50": "#3D372E",
  "#163b50": "#3D372E",
  "#1c2833": "#3D372E",
};

function getGuideThemeColor(color: string) {
  return GUIDE_THEME_COLOR_MAP[color.toLowerCase()] || color;
}

function GuideDetailView({ sectionId, onBack }: { sectionId: string; onBack: () => void }) {
  const [openCat, setOpenCat] = useState(0);
  const section = GUIDE_SECTIONS.find(s => s.id === sectionId);
  const data = GUIDE_DATA[sectionId];

  if (!section || !data) return <div style={{ padding: 16 }}>Section not found.</div>;

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>← Back</button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
          {section.icon}
        </div>
        <div>
          <h2 style={{ color: T.navy, fontSize: 20, margin: 0, fontFamily: T.serif, fontWeight: 700, lineHeight: 1.2 }}>{section.title}</h2>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{section.sub}</div>
        </div>
      </div>

      {/* Intro */}
      <div style={{ background: T.ice, borderRadius: 12, padding: 16, marginBottom: 16, borderLeft: `4px solid ${T.med}` }}>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, wordBreak: "break-word" }}>{data.intro}</div>
      </div>

      {/* Categories - accordion */}
      {data.categories.map((cat, ci) => {
        const isOpen = openCat === ci;
        const accent = getGuideThemeColor(cat.color);
        return (
          <div key={ci} style={{ marginBottom: 10, background: T.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${isOpen ? accent + "60" : T.line}`, transition: "border 0.2s" }}>
            <button onClick={() => setOpenCat(isOpen ? -1 : ci)}
              style={{ width: "100%", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                {cat.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{cat.title}</div>
                <div style={{ fontSize: 13, color: T.muted, marginTop: 1 }}>{cat.items.length} items</div>
              </div>
              <span style={{ color: T.muted, fontSize: 14, transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>›</span>
            </button>

            {isOpen && (
              <div style={{ padding: "0 16px 16px" }}>
                <div style={{ height: 1, background: T.line, marginBottom: 12 }} />
                {cat.items.map((item, ii) => {
                  const isWarning = item.startsWith("⚠");
                  const isNever = item.startsWith("NEVER") || item.startsWith("🚫");

                  return (
                    <div key={ii} style={{
                      display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8,
                      ...(isWarning ? { background: T.yellowBg, borderRadius: 8, padding: "8px 10px", marginLeft: -4, marginRight: -4 } : {}),
                      ...(isNever ? { background: T.redBg, borderRadius: 8, padding: "8px 10px", marginLeft: -4, marginRight: -4 } : {}),
                    }}>
                      {!isWarning && !isNever && (
                        <span style={{ color: accent, fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>•</span>
                      )}
                      <div style={{ fontSize: 13, color: isWarning ? T.goldText : isNever ? T.redDeep : T.text, lineHeight: 1.5, fontWeight: isWarning || isNever ? 600 : 400, wordBreak: "break-word" }}>
                        {item}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <button onClick={onBack} style={{ ...backBtnStyle, marginTop: 16, marginBottom: 0 }}>{"\u2190"} Back</button>
    </div>
  );
}

export default function GuideTab({ navigate, subView, clinicGuides }: { navigate: (tab: string, sv?: Record<string, unknown> | null) => void; subView: Record<string, unknown> | null; clinicGuides?: ClinicGuideRecord[] }) {
  const isMobile = useIsMobile();

  if (subView?.type === "guideDetail") {
    return <GuideDetailView sectionId={subView.id as string} onBack={() => navigate("library")} />;
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 18, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Clinical Guide</h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 12px", lineHeight: 1.4 }}>
        Practical tips for consults, rounding, notes, and presentations
      </p>

      {/* Inpatient Consult Guides — HERO */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ background: `linear-gradient(135deg, ${T.greenBg} 0%, ${T.blueBg} 100%)`, borderRadius: 14, border: `1.5px solid ${T.green}`, padding: 14, boxShadow: `0 2px 8px ${T.greenAlpha}` }}>
          <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Inpatient Consult Guides</div>
          <div style={{ fontSize: 13, color: T.greenDk, marginTop: 2, marginBottom: 12, lineHeight: 1.45 }}>
            What to gather, how to present, red flags, and the assessment framework — by topic.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
            {INPATIENT_GUIDE_TOPICS.map(t => {
              const g = INPATIENT_GUIDES[t];
              return (
                <button key={t} onClick={() => navigate("library", { type: "inpatientGuide", topic: t })}
                  style={{ display: "flex", width: "100%", alignItems: "center", gap: 10, padding: 12,
                    background: T.card, borderRadius: 12, border: `1px solid ${T.greenAlpha}`,
                    cursor: "pointer", textAlign: "left" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: T.greenBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>
                    {g.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: T.navy, fontSize: 13, lineHeight: 1.3 }}>{g.title}</div>
                    <div style={{ fontSize: 13, color: T.sub, marginTop: 2, lineHeight: 1.4 }}>{g.subtitle}</div>
                  </div>
                  <span style={{ color: T.greenDk, fontSize: 16, flexShrink: 0 }}>{"\u203A"}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Clinic Guides */}
      {(() => {
        const friday = getCurrentOrNextFriday(new Date());
        const dateStr = friday.toISOString().split("T")[0];
        return (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, marginBottom: 4, fontFamily: T.serif }}>Clinic Guides</div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.4, marginBottom: 8 }}>
              CKD, Hypertension, and Transplant outpatient prep.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {CLINIC_GUIDE_TOPICS.map((topic) => {
                const template = CLINIC_GUIDES[topic as ClinicGuideTopic];
                const record = (clinicGuides || []).find(g => g.date === dateStr && g.topic === topic);
                return (
                  <button
                    key={topic}
                    onClick={() => navigate("library", { type: "clinicGuide", date: dateStr, topic })}
                    style={{ display: "flex", width: "100%", alignItems: "center", gap: 10, padding: "12px 12px",
                      background: T.card, borderRadius: 12, border: `1px solid ${record?.isOverride ? T.orange : T.line}`,
                      cursor: "pointer", textAlign: "left" }}
                  >
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{template.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: T.navy, fontSize: 13, lineHeight: 1.3 }}>{topic}</div>
                      <div style={{ fontSize: 13, color: T.sub, marginTop: 2, lineHeight: 1.4 }}>{template.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <button onClick={() => navigate("library", { type: "clinicGuideHistory" })}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 4px 0", fontSize: 13, color: T.sub, fontWeight: 500 }}>
              View past clinic guides →
            </button>
          </div>
        );
      })()}

      {/* Rotation workflow */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, marginBottom: 4, fontFamily: T.serif }}>Rotation Workflow</div>
        <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.4, marginBottom: 8 }}>
          Use these for service logistics: pre-rounding, presenting, writing notes, and daily follow-up.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
          {ROTATION_GUIDE_IDS.map(id => {
            const g = ROTATION_GUIDES[id];
            return (
              <button key={id} onClick={() => navigate("library", { type: "rotationGuide", guideId: id })}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px",
                  background: T.card, borderRadius: 12, border: `1px solid ${T.line}`,
                  cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{g.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: T.navy, fontSize: 13, lineHeight: 1.3 }}>{g.title}</div>
                  <div style={{ fontSize: 13, color: T.sub, marginTop: 2, lineHeight: 1.4 }}>{g.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rotation playbook (formerly "More Guides") */}
      {(() => {
        const KEEP_IDS = ["firstday", "office", "notes", "career"];
        const sections = GUIDE_SECTIONS.filter(s => KEEP_IDS.includes(s.id));
        return (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, marginBottom: 4, fontFamily: T.serif }}>Rotation Playbook</div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.4, marginBottom: 8 }}>
              Practical guides for orientation, clinic visits, note-writing, and what nephrology looks like long-term.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
              {sections.map(sec => (
                <button key={sec.id} onClick={() => navigate("library", { type: "guideDetail", id: sec.id })}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px",
                    background: T.card, borderRadius: 12, border: `1px solid ${T.line}`,
                    cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{sec.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: T.navy, fontSize: 13, lineHeight: 1.3 }}>{sec.title}</div>
                    <div style={{ fontSize: 13, color: T.sub, marginTop: 2, lineHeight: 1.4 }}>{sec.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Rotation FAQ */}
      <button onClick={() => navigate("library", { type: "faq" })}
        style={{ display: "flex", width: "100%", alignItems: "center", gap: 14, padding: 14,
          background: T.card, borderRadius: 14, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left", marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <HelpCircle size={18} strokeWidth={1.75} color={T.med} aria-hidden="true" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: T.navy, fontSize: 14 }}>Rotation FAQ</div>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{RESOURCES.faq.length} common rotation questions answered</div>
        </div>
        <span style={{ color: T.muted, fontSize: 16, flexShrink: 0 }}>›</span>
      </button>

      {/* Trial Library */}
      <button onClick={() => navigate("library", { type: "trialLibrary" })}
        style={{ display: "flex", width: "100%", alignItems: "center", gap: 14, padding: 14,
          background: T.card, borderRadius: 14, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left", marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <BookOpen size={18} strokeWidth={1.75} color={T.med} aria-hidden="true" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: T.navy, fontSize: 14 }}>Landmark Trial Library</div>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>Browse all {ALL_LANDMARK_TRIALS.length} landmark nephrology trials by category</div>
        </div>
        <span style={{ color: T.muted, fontSize: 16, flexShrink: 0 }}>›</span>
      </button>
    </div>
  );
}
