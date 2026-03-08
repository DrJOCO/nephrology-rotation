import { useState } from "react";
import { T, RESOURCES } from "../../data/constants";
import { backBtnStyle } from "./shared";

export default function FaqView({ onBack }) {
  const [openFaq, setOpenFaq] = useState(null);
  const faqs = RESOURCES.faq || [];

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>{"\u2190"} Back</button>
      <h2 style={{ color: T.navy, fontSize: 20, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Rotation FAQ</h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px" }}>Common questions for your nephrology rotation</p>

      {faqs.map((faq, i) => {
        const isOpen = openFaq === i;
        return (
          <div key={i} style={{ background: T.card, borderRadius: 12, marginBottom: 8, border: `1px solid ${isOpen ? T.med : T.line}`, overflow: "hidden", transition: "border 0.2s" }}>
            <button onClick={() => setOpenFaq(isOpen ? null : i)}
              style={{ width: "100%", padding: "14px 16px", background: isOpen ? T.ice : T.card, border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ color: T.med, fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>Q</span>
              <div style={{ flex: 1, minWidth: 0, fontWeight: 600, color: T.navy, fontSize: 14, lineHeight: 1.4 }}>{faq.q}</div>
              <span style={{ color: T.muted, fontSize: 16, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>{"\u25BE"}</span>
            </button>
            {isOpen && (
              <div style={{ padding: "0 16px 16px 40px" }}>
                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.65, wordBreak: "break-word" }}>{faq.a}</div>
              </div>
            )}
          </div>
        );
      })}

      {faqs.length > 3 && <button onClick={onBack} style={{ ...backBtnStyle, marginTop: 20, marginBottom: 0 }}>{"\u2190"} Back</button>}
    </div>
  );
}
