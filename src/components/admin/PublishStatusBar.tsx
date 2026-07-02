import { T } from "../../data/constants";
import { Button } from "./ui/Button";

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const sec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function PublishStatusBar({
  rotationCode,
  dirty,
  publishing,
  lastPublishedAt,
  onPublish,
}: {
  rotationCode: string;
  dirty: boolean;
  publishing: boolean;
  lastPublishedAt: string | null;
  onPublish: () => void;
}) {
  const canPublish = Boolean(rotationCode) && dirty && !publishing;
  const hasRotation = Boolean(rotationCode);
  const lastShipped = lastPublishedAt ? formatRelativeTime(lastPublishedAt) : null;

  let dotColor: string;
  let statusText: string;
  let centerText: string;
  let ctaLabel: string;

  if (!hasRotation) {
    dotColor = T.muted;
    statusText = "NO ROTATION";
    centerText = "Connect a rotation to publish to students";
    ctaLabel = "No Rotation";
  } else if (publishing) {
    dotColor = T.warning;
    statusText = "PUBLISHING";
    centerText = "Sending changes to students…";
    ctaLabel = "Publishing…";
  } else if (dirty) {
    dotColor = T.brand;
    statusText = "UNPUBLISHED EDITS";
    centerText = lastShipped
      ? `Edits since last publish · last shipped ${lastShipped}`
      : "Edits since last publish";
    ctaLabel = "Publish to Students";
  } else {
    dotColor = T.success;
    statusText = "PUBLISHED";
    centerText = lastShipped
      ? `Up to date · last shipped ${lastShipped}`
      : "Up to date";
    ctaLabel = "No Changes";
  }

  return (
    <div style={{ background: T.bg, border: `1px solid ${T.brand}`, borderRadius: 0, padding: "8px 10px", marginBottom: 14, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: "1 1 auto" }}>
        <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
        <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: T.ink, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>
          {statusText}
        </span>
        <span style={{ fontSize: 13, color: T.sub, lineHeight: 1.4, minWidth: 0 }}>
          {centerText}
        </span>
      </div>
      <Button variant={canPublish ? "primary" : "default"} onClick={onPublish} disabled={!canPublish}>
        {ctaLabel}
      </Button>
    </div>
  );
}
