import React from "react";
import { T } from "../../../data/constants";
import store from "../../../utils/store";
import { SHARED_KEYS } from "../../../utils/helpers";
import { CLINIC_GUIDES, CLINIC_GUIDE_TOPICS, type ClinicGuideTopic } from "../../../data/clinicGuides";
import { getCurrentOrNextFriday, ensureCurrentClinicGuide, regenerateClinicGuide } from "../../../utils/clinicRotation";
import type { ClinicGuideRecord } from "../../../types";

export function ClinicGuidesEditor({ clinicGuides, setClinicGuides, onBack }: { clinicGuides: ClinicGuideRecord[]; setClinicGuides: React.Dispatch<React.SetStateAction<ClinicGuideRecord[]>>; onBack: () => void }) {
  const friday = getCurrentOrNextFriday(new Date());
  const dateStr = friday.toISOString().split("T")[0];
  const fridayLabel = friday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const topicOrder = new Map<ClinicGuideTopic, number>(CLINIC_GUIDE_TOPICS.map((topic, index) => [topic, index]));
  const currentRecords = CLINIC_GUIDE_TOPICS.map((topic) => ({
    topic,
    template: CLINIC_GUIDES[topic],
    record: clinicGuides.find(g => g.date === dateStr && g.topic === topic),
  }));
  const currentComplete = currentRecords.every((item) => Boolean(item.record));
  const sorted = [...clinicGuides].sort((a, b) =>
    b.date.localeCompare(a.date) ||
    (topicOrder.get(a.topic as ClinicGuideTopic) ?? 99) - (topicOrder.get(b.topic as ClinicGuideTopic) ?? 99)
  );

  const handleEnsure = () => {
    const { guides, newGuide } = ensureCurrentClinicGuide(clinicGuides);
    if (!newGuide) return;
    setClinicGuides(guides);
    store.setShared(SHARED_KEYS.clinicGuides, guides);
  };

  const handleRegenerate = () => {
    const updated = regenerateClinicGuide(clinicGuides, dateStr);
    setClinicGuides(updated);
    store.setShared(SHARED_KEYS.clinicGuides, updated);
  };

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.med, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>{"\u2190"} Back</button>

      <h2 style={{ color: T.navy, fontSize: 20, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Friday Clinic Guides</h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px", lineHeight: 1.4 }}>
        Manage the three outpatient nephrology clinic teaching tracks students should see every week: CKD → Hypertension → Transplant.
      </p>

      {/* Current / next Friday status */}
      <div style={{ background: T.successBg, borderRadius: 14, padding: 16, marginBottom: 16, border: `1px solid ${T.success}40` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.success, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 8 }}>This Friday</div>
        <div style={{ fontWeight: 700, color: T.navy, fontSize: 15, marginBottom: 10 }}>{fridayLabel}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          {currentRecords.map(({ topic, template, record }) => (
            <div key={topic} style={{ display: "flex", alignItems: "center", gap: 10, background: T.card, borderRadius: 12, border: `1px solid ${record ? T.success : T.line}`, padding: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: T.successBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                {template.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{topic}</div>
                <div style={{ fontSize: 13, color: record ? T.success : T.sub, marginTop: 2 }}>
                  {record ? "Generated" : "Not generated yet"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {!currentComplete && (
          <button onClick={handleEnsure} style={{ padding: "8px 16px", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Generate Missing Guides
          </button>
        )}
        {currentComplete && (
          <button onClick={handleRegenerate} style={{ padding: "8px 16px", background: T.card, color: T.med, border: `1.5px solid ${T.med}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Regenerate Three Guides
          </button>
        )}
      </div>

      {/* History */}
      <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Generated Guides ({sorted.length})</h3>
      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: 20, color: T.muted, fontSize: 13 }}>No guides generated yet.</div>
      ) : (
        sorted.map(g => {
          const t = CLINIC_GUIDES[g.topic as ClinicGuideTopic];
          return (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: T.card, borderRadius: 12, marginBottom: 8, border: `1px solid ${T.line}` }}>
              <span style={{ fontSize: 20 }}>{t?.icon || "📋"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: T.text, fontSize: 14 }}>{g.topic}</div>
                <div style={{ fontSize: 13, color: T.sub }}>{new Date(g.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div>
              </div>
              {g.isOverride && <span style={{ fontSize: 13, fontWeight: 700, color: T.warning, background: T.warningBg, borderRadius: 6, padding: "2px 6px" }}>Override</span>}
            </div>
          );
        })
      )}
    </div>
  );
}
