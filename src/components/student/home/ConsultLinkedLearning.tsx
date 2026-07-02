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
  activePatients: Patient[];
  activeConsultTopics: string[];
  patientSuggestedGroups: PatientSuggestedTopicGroup[];
  isMobile: boolean;
  navigate: (tab: string, sv?: SubView) => void;
}

export default function ConsultLinkedLearning({
  activePatientList,
  activePatients,
  activeConsultTopics,
  patientSuggestedGroups,
  isMobile,
  navigate,
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
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 10 }}>
          {patientSuggestedGroups.slice(0, 3).map(group => (
            <button
              key={group.topic}
              onClick={() => openSuggestedGroup(group)}
              style={{ background: T.bg, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 11px", textAlign: "left", cursor: "pointer", minHeight: 70 }}
            >
              <div style={{ fontSize: 13, color: T.ink, fontWeight: 800, lineHeight: 1.25 }}>{group.topic}</div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 4, lineHeight: 1.35 }}>{getSuggestedGroupMeta(group)}</div>
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        {activePatients.map(patient => {
          const topics = patient.topics || (patient.topic ? [patient.topic] : []);
          return (
            <button
              key={patient.id}
              onClick={() => navigate("patients")}
              style={{ background: T.grayBg, border: `1px solid ${T.line}`, borderRadius: 10, padding: "9px 10px", cursor: "pointer", textAlign: "left", minHeight: 58 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 13, color: T.ink, fontWeight: 800 }}>{patient.initials}</span>
                {patient.room && <span style={{ fontSize: 12, color: T.muted }}>Rm {patient.room}</span>}
              </div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 3, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {topics.length > 0 ? topics.slice(0, 2).join(", ") : patient.dx || "Learning tags pending"}
                {topics.length > 2 ? ` +${topics.length - 2}` : ""}
              </div>
            </button>
          );
        })}
        {activePatientList.length > activePatients.length && (
          <button
            onClick={() => navigate("patients")}
            style={{ background: T.bg, border: `1px dashed ${T.line}`, borderRadius: 10, padding: "9px 10px", cursor: "pointer", textAlign: "center", color: T.brand, fontSize: 13, fontWeight: 800 }}
          >
            +{activePatientList.length - activePatients.length} more consult{activePatientList.length - activePatients.length !== 1 ? "s" : ""}
          </button>
        )}
      </div>
    </section>
  );
}
