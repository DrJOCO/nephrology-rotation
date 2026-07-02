import { Megaphone } from "lucide-react";
import { T } from "../../../data/constants";
import type { Announcement } from "../../../types";

function formatRelativeTime(dateStr?: string, now: Date = new Date()): string {
  if (!dateStr) return "";
  const diff = now.getTime() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export default function AnnouncementBanner({ announcement, totalCount, now }: {
  announcement: Announcement;
  totalCount: number;
  now: Date;
}) {
  return (
    <div style={{ background: T.card, borderRadius: 16, padding: "12px 14px", border: `1px solid ${T.line}`, display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
      <div style={{ width: 36, height: 36, borderRadius: 12, background: T.brandBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Megaphone size={18} strokeWidth={1.75} color={T.brand} aria-hidden="true" />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>
            {announcement.title}
            {totalCount > 1 ? ` · +${totalCount - 1} more` : ""}
          </div>
          <div style={{ fontSize: 13, color: T.muted }}>
            {formatRelativeTime(announcement.date, now)}
          </div>
        </div>
        {announcement.body && (
          <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginTop: 4 }}>
            {announcement.body}
          </div>
        )}
      </div>
    </div>
  );
}
