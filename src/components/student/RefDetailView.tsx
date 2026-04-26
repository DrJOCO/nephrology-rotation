import { useState } from "react";
import { T } from "../../data/constants";
import { QUICK_REFS } from "../../data/guides";
import { useIsMobile } from "../../utils/helpers";
import { backBtnStyle } from "./shared";
import type { QuickRefCalculator, QuickRefReference, QuickRefAtlas, CalcResult } from "../../types";

// ─── Calculator Component ──────────────────────────────────────
function CalculatorView({ refData }: { refData: QuickRefCalculator }) {
  const isMobile = useIsMobile();
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CalcResult | null>(null);

  const updateVal = (key: string, val: string) => {
    const newVals = { ...values, [key]: val };
    setValues(newVals);
    // Auto-calculate when all required fields filled
    const allFilled = refData.inputs.every(inp => {
      const v = newVals[inp.key];
      return v !== "" && v !== undefined && !isNaN(Number(v));
    });
    if (allFilled) {
      const numVals: Record<string, number> = {};
      refData.inputs.forEach(inp => { numVals[inp.key] = parseFloat(newVals[inp.key]); });
      setResult(refData.calculate(numVals));
    } else {
      setResult(null);
    }
  };

  return (
    <div>
      <div style={{ background: T.card, borderRadius: 14, padding: 20, border: `1px solid ${T.line}`, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile || refData.inputs.length > 4 ? "1fr" : "1fr 1fr", gap: 12 }}>
          {refData.inputs.map(inp => (
            <div key={inp.key}>
              <label style={{ fontSize: 13, fontWeight: 700, color: T.sub, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>{inp.label}</label>
              <input
                type="number" step="any"
                placeholder={inp.placeholder}
                value={values[inp.key] ?? ""}
                onChange={e => updateVal(inp.key, e.target.value)}
                style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${T.line}`, borderRadius: 8, fontSize: 15, boxSizing: "border-box", fontFamily: T.mono, outline: "none", transition: "border 0.2s" }}
                onFocus={e => e.target.style.borderColor = T.brand}
                onBlur={e => e.target.style.borderColor = T.line}
              />
            </div>
          ))}
        </div>

        <button onClick={() => {
          const numVals: Record<string, number> = {};
          refData.inputs.forEach(inp => { numVals[inp.key] = parseFloat(values[inp.key]) || 0; });
          setResult(refData.calculate(numVals));
        }} style={{ width: "100%", marginTop: 16, padding: "12px 0", background: T.brand, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Calculate
        </button>
      </div>

      {/* Result */}
      {result && (
        <div style={{ background: T.ice, borderRadius: 14, padding: 20, border: `1px solid ${T.pale}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.brand, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Result</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.navy, fontFamily: T.mono, marginBottom: 10 }}>{result.value}</div>
          <div style={{ fontSize: 14, color: T.text, lineHeight: 1.6, whiteSpace: "pre-line", wordBreak: "break-word", marginBottom: result.caveat ? 10 : 0 }}>{result.interpretation}</div>
          {result.caveat && (
            <div style={{ fontSize: 13, color: T.warning, background: T.warningBg, borderRadius: 8, padding: 10, lineHeight: 1.5 }}>{result.caveat}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Reference Card Component ──────────────────────────────────
function ReferenceCardView({ refData }: { refData: QuickRefReference }) {
  const { sections } = refData.content;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {sections.map((sec, i) => (
        <div key={i} style={{ background: T.card, borderRadius: 14, padding: 18, border: `1px solid ${T.line}` }}>
          <div style={{ fontFamily: T.serif, fontWeight: 700, color: T.navy, fontSize: 15, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${T.line}` }}>
            {sec.heading}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sec.items.map((item, j) => {
              // Check if item has a → which indicates a key finding
              const hasArrow = item.includes("→");
              if (hasArrow) {
                const [before, after] = item.split("→");
                return (
                  <div key={j} style={{ fontSize: 13, color: T.text, lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ color: T.brand, fontWeight: 700, flexShrink: 0 }}>•</span>
                    <span><strong style={{ color: T.navy }}>{before.trim()}</strong> <span style={{ color: T.brand }}>→</span> {after.trim()}</span>
                  </div>
                );
              }
              // Check if item starts with emoji
              const startsWithEmoji = /^[^\w\s]/.test(item) || item.startsWith("⚠");
              return (
                <div key={j} style={{ fontSize: 13, color: T.text, lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 8 }}>
                  {!startsWithEmoji && <span style={{ color: T.brand, fontWeight: 700, flexShrink: 0 }}>•</span>}
                  <span>{item}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Atlas View (Urine Sediment) ────────────────────────────────
function AtlasView({ refData }: { refData: QuickRefAtlas }) {
  const { sections } = refData.content;
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  return (
    <div>
      <div style={{ background: T.ice, borderRadius: 12, padding: 14, marginBottom: 16, border: `1px solid ${T.pale}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.brand, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Optional reference</div>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>
          Use this UA microscopy atlas when it helps with a patient or a teaching question. It does not count toward required weekly progress; core progress comes from study sheets, cases, and quizzes.
        </div>
      </div>

      {/* External Image Links banner */}
      <div style={{ background: T.infoBg, borderRadius: 12, padding: 14, marginBottom: 16, borderLeft: `4px solid ${T.info}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.info, marginBottom: 6 }}>📷 OPTIONAL UA IMAGE RESOURCES</div>
        <div style={{ fontSize: 13, color: T.text, marginBottom: 8, lineHeight: 1.5 }}>Tap below for real microscopy images when you want extra visual practice. Pair them with the descriptions here.</div>
        {refData.imageLinks.map((link, i) => (
          <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
            style={{ display: "block", fontSize: 13, color: T.brand, fontWeight: 600, textDecoration: "none", padding: "4px 0" }}>
            {link.name} ↗
          </a>
        ))}
      </div>

      {/* Sections with expandable finding cards */}
      {sections.map((sec, si) => (
        <div key={si} style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: T.serif, fontWeight: 700, color: T.navy, fontSize: 16, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${T.line}` }}>{sec.heading}</div>
          {sec.items.map((item, ii) => {
            const key = `${si}-${ii}`;
            const isOpen = expandedItem === key;
            return (
              <div key={ii} style={{ background: T.card, borderRadius: 12, marginBottom: 8, border: `1px solid ${isOpen ? T.info : T.line}`, overflow: "hidden", transition: "border 0.2s" }}>
                <button onClick={() => setExpandedItem(isOpen ? null : key)}
                  style={{ width: "100%", padding: "12px 14px", background: isOpen ? T.infoBg : "none", border: "none", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{item.finding}</div>
                    <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{item.significance}</div>
                  </div>
                  <span style={{ color: T.muted, fontSize: 18, transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0, marginLeft: 8 }}>›</span>
                </button>
                {isOpen && (
                  <div style={{ padding: "0 14px 14px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.3 }}>Appearance</div>
                    <div style={{ fontSize: 13, color: T.text, marginBottom: 10, lineHeight: 1.5 }}>{item.appearance}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.3 }}>Associations</div>
                    <div style={{ fontSize: 13, color: T.text, marginBottom: 10, lineHeight: 1.5 }}>{item.associations}</div>
                    <div style={{ background: T.ice, borderRadius: 8, padding: 10, borderLeft: `3px solid ${T.brand}` }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.brand, marginBottom: 3 }}>CLINICAL PEARL</div>
                      <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{item.clinicalPearl}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Detail View (dispatches to Calculator, Reference, or Atlas) ───
export default function RefDetailView({ refId, onBack }: { refId: string; onBack: () => void }) {
  const ref = QUICK_REFS.find(r => r.id === refId);
  if (!ref) return <div style={{ padding: 16 }}>Reference not found.</div>;

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>← Back</button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 36 }}>{ref.icon}</div>
        <div>
          <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 22, margin: 0, fontWeight: 700 }}>{ref.title}</h2>
          <div style={{ color: T.sub, fontSize: 13 }}>{ref.desc}</div>
          {ref.type === "atlas" && (
            <div style={{ display: "inline-block", marginTop: 6, background: T.infoBg, color: T.info, borderRadius: 999, padding: "4px 9px", fontSize: 13, fontWeight: 700 }}>
              Optional reference
            </div>
          )}
        </div>
      </div>

      {ref.type === "calculator" ? <CalculatorView refData={ref} /> : ref.type === "atlas" ? <AtlasView refData={ref} /> : <ReferenceCardView refData={ref} />}
      <button onClick={onBack} style={{ ...backBtnStyle, marginTop: 20, marginBottom: 0 }}>{"\u2190"} Back</button>
    </div>
  );
}
