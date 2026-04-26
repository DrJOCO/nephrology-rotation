import React from "react";
import { T } from "../../../data/constants";

// ─── Mini Bar Chart (SVG) ────────────────────────────────────────────
export function MiniBarChart({ data, width = 280, height = 130 }: { data: { label: string; value: number; color?: string }[]; width?: number; height?: number }) {
  if (!data || !data.length) return null;
  const pad = { top: 16, right: 10, bottom: 22, left: 10 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW = Math.min(36, (w / data.length) * 0.6);
  const gap = (w - barW * data.length) / (data.length + 1);
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {data.map((d, i) => {
        const x = pad.left + gap + i * (barW + gap);
        const barH = Math.max((d.value / maxVal) * h, 2);
        return <g key={i}>
          <rect x={x} y={pad.top + h - barH} width={barW} height={barH} rx={4} fill={d.color || T.brand} />
          <text x={x + barW / 2} y={pad.top + h - barH - 4} fontSize={10} fill={T.text} textAnchor="middle" fontWeight={600}>{d.value}%</text>
          <text x={x + barW / 2} y={height - 4} fontSize={9} fill={T.muted} textAnchor="middle">{d.label}</text>
        </g>;
      })}
    </svg>
  );
}
