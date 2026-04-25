import { T } from "../../data/constants";
import { CLINIC_GUIDES, CLINIC_GUIDE_TOPICS, type ClinicGuideTopic } from "../../data/clinicGuides";
import { backBtnStyle } from "./shared";
import type { ClinicGuideRecord } from "../../types";

interface Props {
  guides: ClinicGuideRecord[];
  onSelect: (date: string, topic: ClinicGuideTopic) => void;
  onBack: () => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

export default function ClinicGuideHistoryView({ guides, onSelect, onBack }: Props) {
  const topicOrder = new Map<ClinicGuideTopic, number>(CLINIC_GUIDE_TOPICS.map((topic, index) => [topic, index]));
  const sorted = [...guides].sort((a, b) =>
    b.date.localeCompare(a.date) ||
    (topicOrder.get(a.topic as ClinicGuideTopic) ?? 99) - (topicOrder.get(b.topic as ClinicGuideTopic) ?? 99)
  );

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>{"\u2190"} Back</button>

      <h2 style={{ color: T.navy, fontSize: 20, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Clinic Guide History</h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px", lineHeight: 1.4 }}>
        Past outpatient clinic teaching guides for CKD, hypertension, and transplant
      </p>

      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: 32, color: T.muted, fontSize: 14 }}>
          No clinic guides generated yet. Guides are created automatically each week.
        </div>
      ) : (
        sorted.map((g) => {
          const template = CLINIC_GUIDES[g.topic as ClinicGuideTopic];
          return (
            <button key={g.id} onClick={() => onSelect(g.date, g.topic as ClinicGuideTopic)}
              style={{ display: "block", width: "100%", background: T.card, borderRadius: 14, padding: 16, marginBottom: 10, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left", transition: "box-shadow 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                  {template?.icon || "📋"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>{g.topic}</div>
                  <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{formatDate(g.date)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  {g.isOverride && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.warning, background: T.warningBg, borderRadius: 6, padding: "2px 6px", textTransform: "uppercase" }}>Override</span>
                  )}
                  <span style={{ color: T.muted, fontSize: 16 }}>{"\u203A"}</span>
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
