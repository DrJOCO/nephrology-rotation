import { useState } from "react";
import { HelpCircle, BookOpen } from "lucide-react";
import { T, ALL_LANDMARK_TRIALS, RESOURCES } from "../../data/constants";
import { GUIDE_SECTIONS, GUIDE_DATA } from "../../data/guides";
import { CLINIC_GUIDES, type ClinicGuideTopic } from "../../data/clinicGuides";
import { INPATIENT_GUIDES, INPATIENT_GUIDE_TOPICS } from "../../data/inpatientGuides";
import { ROTATION_GUIDES, ROTATION_GUIDE_IDS } from "../../data/rotationGuides";
import { getCurrentOrNextFriday, getClinicTopicForDate } from "../../utils/clinicRotation";
import { useIsMobile } from "../../utils/helpers";
import { backBtnStyle } from "./shared";
import type { ClinicGuideRecord } from "../../types";

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
          <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{section.sub}</div>
        </div>
      </div>

      {/* Intro */}
      <div style={{ background: T.ice, borderRadius: 12, padding: 16, marginBottom: 16, borderLeft: `4px solid ${T.med}` }}>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, wordBreak: "break-word" }}>{data.intro}</div>
      </div>

      {/* Categories - accordion */}
      {data.categories.map((cat, ci) => {
        const isOpen = openCat === ci;
        return (
          <div key={ci} style={{ marginBottom: 10, background: T.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${isOpen ? cat.color + "60" : T.line}`, transition: "border 0.2s" }}>
            <button onClick={() => setOpenCat(isOpen ? -1 : ci)}
              style={{ width: "100%", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: cat.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                {cat.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{cat.title}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{cat.items.length} items</div>
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
                        <span style={{ color: cat.color, fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>•</span>
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

      {/* Friday Clinic Guide */}
      {(() => {
        const friday = getCurrentOrNextFriday(new Date());
        const dateStr = friday.toISOString().split("T")[0];
        const record = (clinicGuides || []).find(g => g.date === dateStr);
        const topic = (record?.topic || getClinicTopicForDate(friday)) as ClinicGuideTopic;
        const template = CLINIC_GUIDES[topic];
        const dayLabel = new Date().getDay() === 5 ? "Today" : friday.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
        return template ? (
          <div style={{ marginBottom: 14 }}>
            <button onClick={() => navigate("library", { type: "clinicGuide", date: dateStr })}
              style={{ display: "flex", width: "100%", alignItems: "center", gap: 14, padding: 14,
                background: `linear-gradient(135deg, ${T.greenBg} 0%, ${T.blueBg} 100%)`, borderRadius: 14,
                border: `1.5px solid ${T.green}`, cursor: "pointer", textAlign: "left",
                boxShadow: "0 2px 8px rgba(26,188,156,0.15)" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: T.greenBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, border: `1px solid ${T.greenAlpha}` }}>
                {template.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Friday Clinic Guide</div>
                <div style={{ fontSize: 12, color: T.greenDk, marginTop: 2 }}>{dayLabel}: {topic} Clinic</div>
              </div>
              <span style={{ color: T.greenDk, fontSize: 16, flexShrink: 0 }}>{"\u203A"}</span>
            </button>
            <button onClick={() => navigate("library", { type: "clinicGuideHistory" })}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 4px 0", fontSize: 11, color: T.sub, fontWeight: 500 }}>
              View past clinic guides →
            </button>
          </div>
        ) : null;
      })()}

      {/* Inpatient Consult Guides */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, marginBottom: 8, fontFamily: T.serif }}>Inpatient Consult Guides</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
          {INPATIENT_GUIDE_TOPICS.map(t => {
            const g = INPATIENT_GUIDES[t];
            return (
              <button key={t} onClick={() => navigate("library", { type: "inpatientGuide", topic: t })}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px",
                  background: T.card, borderRadius: 12, border: `1px solid ${T.line}`,
                  cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{g.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: T.navy, fontSize: 13, lineHeight: 1.2 }}>{t}</div>
                  <div style={{ fontSize: 10, color: T.sub, marginTop: 2, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rotation Guides */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, marginBottom: 8, fontFamily: T.serif }}>Rotation Guides</div>
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
                  <div style={{ fontWeight: 600, color: T.navy, fontSize: 13, lineHeight: 1.2 }}>{g.title}</div>
                  <div style={{ fontSize: 10, color: T.sub, marginTop: 2, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <button onClick={() => navigate("library", { type: "faq" })}
        style={{ display: "flex", width: "100%", alignItems: "center", gap: 14, padding: 14,
          background: T.card, borderRadius: 14, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left", marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: T.yellowBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${T.goldAlphaMd}` }}>
          <HelpCircle size={22} strokeWidth={1.75} color={T.warn} aria-hidden="true" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Rotation FAQ</div>
          <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{RESOURCES.faq.length} common rotation questions answered</div>
        </div>
        <span style={{ color: T.muted, fontSize: 16, flexShrink: 0 }}>›</span>
      </button>

      {/* Trial Library Button */}
      <button onClick={() => navigate("library", { type: "trialLibrary" })}
        style={{ display: "flex", width: "100%", alignItems: "center", gap: 14, padding: 14,
          background: `linear-gradient(135deg, ${T.warmBg} 0%, ${T.yellowBg} 100%)`, borderRadius: 14,
          border: `1.5px solid ${T.gold}`, cursor: "pointer", textAlign: "left", marginBottom: 14,
          boxShadow: "0 2px 8px rgba(241,196,15,0.15)" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: T.yellowBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${T.goldAlphaMd}` }}>
          <BookOpen size={22} strokeWidth={1.75} color={T.warn} aria-hidden="true" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Landmark Trial Library</div>
          <div style={{ fontSize: 12, color: T.goldText, marginTop: 2 }}>Browse all {ALL_LANDMARK_TRIALS.length} landmark nephrology trials by category</div>
        </div>
        <span style={{ color: T.goldText, fontSize: 16, flexShrink: 0 }}>›</span>
      </button>

      {/* Additional unique guides */}
      {(() => {
        const KEEP_IDS = ["firstday", "office", "notes", "career"];
        const sections = GUIDE_SECTIONS.filter(s => KEEP_IDS.includes(s.id));
        return (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, marginBottom: 8, fontFamily: T.serif }}>More Guides</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
              {sections.map(sec => (
                <button key={sec.id} onClick={() => navigate("library", { type: "guideDetail", id: sec.id })}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px",
                    background: T.card, borderRadius: 12, border: `1px solid ${T.line}`,
                    cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{sec.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: T.navy, fontSize: 13, lineHeight: 1.2 }}>{sec.title}</div>
                    <div style={{ fontSize: 10, color: T.sub, marginTop: 2, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sec.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
