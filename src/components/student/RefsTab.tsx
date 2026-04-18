import { Type } from "lucide-react";
import { T, ABBREVIATIONS } from "../../data/constants";
import { QUICK_REFS } from "../../data/guides";
import { useIsMobile } from "../../utils/helpers";

export default function RefsTab({ navigate }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 18, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Quick Reference</h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px" }}>Calculators, protocols & clinical guides</p>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
        {QUICK_REFS.map(ref => (
          <button key={ref.id} onClick={() => navigate("refs", { type: "refDetail", id: ref.id })}
            style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left", transition: "box-shadow 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{ref.icon}</div>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, fontFamily: T.serif }}>{ref.title}</div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{ref.desc}</div>
            {ref.type === "calculator" && (
              <div style={{ fontSize: 10, color: T.med, fontWeight: 600, marginTop: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Calculator →</div>
            )}
            {ref.type === "reference" && (
              <div style={{ fontSize: 10, color: T.orange, fontWeight: 600, marginTop: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Reference →</div>
            )}
            {ref.type === "atlas" && (
              <div style={{ fontSize: 10, color: T.purple, fontWeight: 600, marginTop: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Atlas →</div>
            )}
          </button>
        ))}
        <button onClick={() => navigate("refs", { type: "abbreviations" })}
          style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left", transition: "box-shadow 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
          onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
          <Type size={28} strokeWidth={1.5} color={T.med} aria-hidden="true" style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, fontFamily: T.serif }}>Nephrology Abbreviations</div>
          <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{ABBREVIATIONS.length} terms you will see in notes and on rounds</div>
          <div style={{ fontSize: 10, color: T.med, fontWeight: 600, marginTop: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Reference →</div>
        </button>
      </div>
    </div>
  );
}
