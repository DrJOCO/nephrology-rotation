import { Sparkles } from "lucide-react";
import { T } from "../../../data/constants";
import { PRO_TIPS } from "../shared";

export const PEARL_STORAGE_KEY = "neph_todayPearlDismissed";

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getPearlIndex(date: Date): number {
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return dayNumber % PRO_TIPS.length;
}

export default function PearlToast({ tip, onDismiss }: { tip: string; onDismiss: () => void }) {
  return (
    <section style={{ background: T.surface2, borderRadius: 8, border: `1px solid ${T.surface2}`, padding: "14px 16px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={16} strokeWidth={1.75} color={T.brand} aria-hidden="true" />
          <div style={{ fontSize: 13, fontWeight: 700, color: T.brand, textTransform: "uppercase", letterSpacing: 0.9 }}>
            Pearl of the day
          </div>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss pearl"
          style={{ background: "none", border: "none", color: T.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0 }}
        >
          Dismiss
        </button>
      </div>
      <div style={{ fontSize: 14, color: T.ink, lineHeight: 1.65 }}>
        {tip}
      </div>
    </section>
  );
}
