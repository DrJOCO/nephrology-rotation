import { T } from "../../data/constants";

export function MiniLineChart({ data, width = 280, height = 120, color }) {
  const lineColor = color || T.med;
  if (!data || data.length < 2) return null;
  const pad = { top: 12, right: 10, bottom: 22, left: 32 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const points = data.map((d, i) => ({
    x: pad.left + (i / (data.length - 1)) * w,
    y: pad.top + h - (d.value / 100) * h,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {[0, 50, 100].map(v => {
        const y = pad.top + h - (v / 100) * h;
        return <g key={v}><line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke={T.line} strokeWidth={0.5} strokeDasharray="4,4" /><text x={pad.left - 4} y={y + 3} fontSize={9} fill={T.muted} textAnchor="end">{v}</text></g>;
      })}
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill={lineColor} stroke={T.card} strokeWidth={1.5} />)}
      {data.map((d, i) => <text key={i} x={points[i].x} y={height - 4} fontSize={8} fill={T.muted} textAnchor="middle">{d.label}</text>)}
    </svg>
  );
}

export function HistogramChart({ bins, width = 300, height = 160, label }) {
  // bins: [{ label, values: [{ value, color }] }]
  if (!bins || !bins.length) return null;
  const pad = { top: 20, right: 10, bottom: 28, left: 36 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const maxVal = Math.max(...bins.flatMap(b => b.values.map(v => v.value)), 1);
  const groupW = w / bins.length;
  const barCount = bins[0]?.values?.length || 1;
  const barW = Math.min(20, (groupW * 0.7) / barCount);
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {label && <text x={width / 2} y={12} fontSize={10} fill={T.muted} textAnchor="middle" fontWeight={600}>{label}</text>}
      {[0, Math.round(maxVal / 2), maxVal].map(v => {
        const y = pad.top + h - (v / maxVal) * h;
        return <g key={v}><line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke={T.line} strokeWidth={0.5} strokeDasharray="3,3" /><text x={pad.left - 4} y={y + 3} fontSize={8} fill={T.muted} textAnchor="end">{v}</text></g>;
      })}
      {bins.map((bin, i) => {
        const gx = pad.left + i * groupW + groupW / 2;
        return <g key={i}>
          {bin.values.map((v, j) => {
            const bx = gx - (barCount * barW) / 2 + j * barW;
            const bh = Math.max((v.value / maxVal) * h, 1);
            return <rect key={j} x={bx} y={pad.top + h - bh} width={barW - 1} height={bh} rx={2} fill={v.color} opacity={0.85} />;
          })}
          <text x={gx} y={height - 6} fontSize={8} fill={T.muted} textAnchor="middle">{bin.label}</text>
        </g>;
      })}
    </svg>
  );
}

export function FunnelChart({ stages, width = 300, height }) {
  // stages: [{ label, value, total, color }]
  if (!stages || !stages.length) return null;
  const h = height || stages.length * 36 + 20;
  const pad = { left: 10, right: 10, top: 10 };
  const barMaxW = width - pad.left - pad.right - 100;
  const maxVal = Math.max(...stages.map(s => s.value), 1);
  const rowH = (h - pad.top) / stages.length;
  return (
    <svg width={width} height={h} style={{ display: "block" }}>
      {stages.map((s, i) => {
        const y = pad.top + i * rowH;
        const barW = Math.max((s.value / maxVal) * barMaxW, 4);
        const pct = s.total > 0 ? Math.round((s.value / s.total) * 100) : 0;
        return <g key={i}>
          <rect x={pad.left} y={y + 4} width={barW} height={rowH - 10} rx={4} fill={s.color || T.med} opacity={0.8} />
          <text x={pad.left + barW + 6} y={y + rowH / 2 + 1} fontSize={10} fill={T.text} dominantBaseline="middle" fontWeight={600}>{s.value}</text>
          <text x={width - pad.right} y={y + rowH / 2 + 1} fontSize={9} fill={T.muted} textAnchor="end" dominantBaseline="middle">{s.label} ({pct}%)</text>
        </g>;
      })}
    </svg>
  );
}

export function HeatmapChart({ rows, columns, data, width = 300, height }) {
  // rows: string[], columns: string[], data: number[][] (rows x cols, 0-100 scale)
  if (!rows?.length || !columns?.length) return null;
  const pad = { top: 24, left: 80, right: 10, bottom: 10 };
  const cellW = Math.min(50, (width - pad.left - pad.right) / columns.length);
  const cellH = 28;
  const h = height || pad.top + rows.length * cellH + pad.bottom;
  const colorScale = (v) => {
    if (v === null || v === undefined) return T.grayBg;
    if (v >= 80) return "#27ae60";
    if (v >= 60) return "#f1c40f";
    if (v >= 40) return "#e67e22";
    return "#e74c3c";
  };
  return (
    <svg width={width} height={h} style={{ display: "block" }}>
      {columns.map((col, j) => (
        <text key={j} x={pad.left + j * cellW + cellW / 2} y={pad.top - 6} fontSize={9} fill={T.muted} textAnchor="middle" fontWeight={600}>{col}</text>
      ))}
      {rows.map((row, i) => (
        <g key={i}>
          <text x={pad.left - 6} y={pad.top + i * cellH + cellH / 2 + 1} fontSize={9} fill={T.text} textAnchor="end" dominantBaseline="middle">{row.length > 10 ? row.slice(0, 10) + "..." : row}</text>
          {columns.map((_, j) => {
            const val = data[i]?.[j];
            return <g key={j}>
              <rect x={pad.left + j * cellW + 1} y={pad.top + i * cellH + 1} width={cellW - 2} height={cellH - 2} rx={4} fill={colorScale(val)} opacity={0.75} />
              {val !== null && val !== undefined && <text x={pad.left + j * cellW + cellW / 2} y={pad.top + i * cellH + cellH / 2 + 1} fontSize={9} fill="white" textAnchor="middle" dominantBaseline="middle" fontWeight={600}>{val}%</text>}
            </g>;
          })}
        </g>
      ))}
    </svg>
  );
}

export function MiniBarChart({ data, width = 280, height = 130 }) {
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
          <rect x={x} y={pad.top + h - barH} width={barW} height={barH} rx={4} fill={d.color || T.med} />
          <text x={x + barW / 2} y={pad.top + h - barH - 4} fontSize={10} fill={T.text} textAnchor="middle" fontWeight={600}>{d.value}%</text>
          <text x={x + barW / 2} y={height - 4} fontSize={9} fill={T.muted} textAnchor="middle">{d.label}</text>
        </g>;
      })}
    </svg>
  );
}
