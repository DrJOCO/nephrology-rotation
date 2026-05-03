import React, { type ReactNode } from "react";
import { T } from "../../../data/constants";

export type StatTileState = "default" | "attention" | "strength";

const stateAccent: Record<StatTileState, string> = {
  default: T.line,
  attention: T.brand,
  strength: T.success,
};

const stateValueColor: Record<StatTileState, string> = {
  default: T.ink,
  attention: T.brand,
  strength: T.success,
};

export function StatTile({
  label,
  value,
  caption,
  state = "default",
}: {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  state?: StatTileState;
}) {
  const empty = value === null || value === undefined || value === "" || value === "—";
  return (
    <div
      style={{
        background: T.bg,
        borderTop: `1.5px solid ${empty ? T.line : stateAccent[state]}`,
        padding: "12px 14px 14px",
      }}
    >
      <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: T.serif,
          fontSize: 26,
          fontWeight: 700,
          color: empty ? T.muted : stateValueColor[state],
          lineHeight: 1,
          marginBottom: caption ? 6 : 0,
        }}
      >
        {empty ? "—" : value}
      </div>
      {caption && (
        <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.4 }}>{caption}</div>
      )}
    </div>
  );
}
