import { Activity, WifiOff } from "lucide-react";
import { T } from "../../data/constants";

// ─────────────────────────────────────────────────────────────────────────
// OfflineSyncBanner — spec §11. Sits between header and content, soft warm
// tone. Shows offline status and/or queued-update count while syncing.
// Pure move of the banner block that previously lived inline in StudentApp.
// ─────────────────────────────────────────────────────────────────────────
function OfflineSyncBanner({ online, pendingSyncCount }: { online: boolean; pendingSyncCount: number }) {
  if (!(!online || pendingSyncCount > 0)) return null;
  return (
    <div
      role="status" aria-live="polite"
      style={{
        background: online ? T.surface2 : T.warning,
        color: online ? T.brand : T.warningInk,
        borderBottom: `1px solid ${T.line}`,
        padding: "8px 16px", fontSize: 13, fontWeight: 600,
        display: "flex", alignItems: "center", gap: 8,
        fontFamily: T.sans,
      }}
    >
      {online ? <Activity size={14} strokeWidth={2} aria-hidden="true" /> : <WifiOff size={14} strokeWidth={2} aria-hidden="true" />}
      <span>
        {!online
          ? pendingSyncCount > 0
            ? `Offline · ${pendingSyncCount} queued update${pendingSyncCount !== 1 ? "s" : ""}. Changes sync when reconnected.`
            : "Offline · Changes sync when reconnected."
          : `${pendingSyncCount} update${pendingSyncCount !== 1 ? "s" : ""} waiting to sync — retrying automatically. Your work is saved on this device.`}
      </span>
    </div>
  );
}

export default OfflineSyncBanner;
