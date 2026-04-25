import React from "react";
import { T } from "../../../data/constants";

export function StatCard({ value, label, color, icon }: { value: string | number; label: string; color: string; icon: string }) {
  return (
    <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 10, right: 12, fontSize: 24, opacity: 0.15 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: T.mono }}>{value}</div>
      <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{label}</div>
    </div>
  );
}
