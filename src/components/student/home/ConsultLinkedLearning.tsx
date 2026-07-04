import { Check } from "lucide-react";
import { T } from "../../../data/constants";
import type { Patient, SubView } from "../../../types";
import type { PatientSuggestedTopicGroup } from "../../../utils/patientRecommendations";

function getSuggestedGroupMeta(group: PatientSuggestedTopicGroup) {
  const parts: string[] = [];
  if (group.guides.length > 0) parts.push(`${group.guides.length} guide${group.guides.length !== 1 ? "s" : ""}`);
  if (group.sheets.length > 0) parts.push(`${group.sheets.length} sheet${group.sheets.length !== 1 ? "s" : ""}`);
  if (group.trials.length > 0) parts.push(`${group.trials.length} trial${group.trials.length !== 1 ? "s" : ""}`);
  if (group.tools.length > 0) parts.push(`${group.tools.length} tool${group.tools.length !== 1 ? "s" : ""}`);
  return parts.join(" · ") || group.reason;
}

interface ConsultLinkedLearningProps {
  activePatientList: Patient[];
  activeConsultTopics: string[];
  patientSuggestedGroups: PatientSuggestedTopicGroup[];
  isMobile: boolean;
  navigate: (tab: string, sv?: SubView) => void;
  onCompleteTopic: (group: PatientSuggestedTopicGroup) => void;
}

export default function ConsultLinkedLearning({
  activePatientList,
  activeConsultTopics,
  patientSuggestedGroups,
  isMobile,
  navigate,
  onCompleteTopic,
}: ConsultLinkedLearningProps) {
  const openSuggestedGroup = (group: PatientSuggestedTopicGroup) => {
    if (group.guides[0]) {
      navigate(group.guides[0].nav[0], group.guides[0].nav[1] as SubView);
      return;
    }
    if (group.sheets[0]) {
      navigate("today", { type: "studySheets", week: group.sheets[0].week, sheetId: group.sheets[0].id });
      return;
    }
    if (group.tools[0]) {
      navigate(group.tools[0].nav[0], group.tools[0].nav[1] as SubView);
      return;
    }
    if (group.trials[0]) {
      navigate("today", { type: "trials", week: group.trials[0].week });
    }
  };

  return (
    <section style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.line}`, padding: "14px 14px", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, color: T.ink, fontFamily: T.serif, fontSize: 19, fontWeight: 700 }}>
            Consult-linked learning
          </h2>
          <p style={{ margin: "5px 0 0", color: T.sub, fontSize: 13, lineHeight: 1.5 }}>
            {patientSuggestedGroups.length > 0
              ? "Matched resources from your active consult topics."
              : "Active consults are ready for teaching tags and follow-up pearls."}
          </p>
        </div>
        <button
          onClick={() => navigate("patients")}
          style={{ background: T.surface2, color: T.brand, border: `1px solid ${T.line}`, borderRadius: 999, padding: "7px 11px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
        >
          {activePatientList.length} active
        </button>
      </div>

      {activeConsultTopics.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {activeConsultTopics.slice(0, 6).map(topic => (
            <span key={topic} style={{ background: T.infoBg, color: T.info, border: `1px solid ${T.line}`, borderRadius: 999, padding: "5px 9px", fontSize: 12, fontWeight: 700 }}>
              {topic}
            </span>
          ))}
          {activeConsultTopics.length > 6 && (
            <span style={{ color: T.muted, fontSize: 12, fontWeight: 700, padding: "5px 2px" }}>+{activeConsultTopics.length - 6} more</span>
          )}
        </div>
      )}

      {patientSuggestedGroups.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 8,
            // No card cap (attending removed the 3-card limit) — but keep the
            // section scannable when a student has many active consults by
            // scrolling internally after ~4 rows instead of growing unbounded.
            maxHeight: isMobile ? 4 * 78 : 4 * 70,
            overflowY: "auto",
          }}
        >
          {patientSuggestedGroups.map(group => (
            <div
              key={group.topic}
              style={{ background: T.bg, border: `1px solid ${T.line}`, borderRadius: 10, minHeight: 70, display: "flex", alignItems: "stretch" }}
            >
              <button
                onClick={() => openSuggestedGroup(group)}
                style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: "10px 4px 10px 11px", textAlign: "left", cursor: "pointer" }}
              >
                <div style={{ fontSize: 13, color: T.ink, fontWeight: 800, lineHeight: 1.25 }}>{group.topic}</div>
                <div style={{ fontSize: 12, color: T.sub, marginTop: 4, lineHeight: 1.35 }}>{getSuggestedGroupMeta(group)}</div>
              </button>
              <button
                onClick={() => onCompleteTopic(group)}
                aria-label={`Mark ${group.topic} reviewed`}
                title="Got it — hides until your next consult with this topic"
                style={{ background: "none", border: "none", borderLeft: `1px solid ${T.line}`, color: T.success, cursor: "pointer", padding: "0 10px", display: "flex", alignItems: "center", borderRadius: "0 10px 10px 0" }}
              >
                <Check size={15} strokeWidth={2.4} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

    </section>
  );
}
