import { useEffect, useState } from "react";
import { T } from "../data/constants";
import { onSwUpdate } from "../utils/pwa";

// Non-blocking "an update is ready" toast, mounted at the App level so it shows
// in both the student and admin shells. When the SW reports a waiting worker,
// tapping "Refresh" activates it (SKIP_WAITING) and the page reloads once.
// Dismissible — dismissing just hides the toast; the update still applies on the
// next natural reload or when all tabs close.
export default function UpdateToast() {
  const [accept, setAccept] = useState<(() => void) | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Store the accept fn behind a wrapper so React doesn't call it as a state
    // updater (setState(fn) would invoke fn); we want to hold the function itself.
    return onSwUpdate((acceptUpdate) => {
      setAccept(() => acceptUpdate);
      setDismissed(false);
    });
  }, []);

  if (!accept || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        zIndex: 12000,
        maxWidth: "min(92vw, 440px)",
        width: "max-content",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: T.card,
        color: T.ink,
        border: `1px solid ${T.line}`,
        borderRadius: 14,
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        fontFamily: T.sans,
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }} aria-hidden="true">🔄</span>
      <button
        onClick={() => accept()}
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: "left",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: T.ink,
          fontFamily: T.sans,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>Update available</div>
        <div style={{ fontSize: 12, color: T.sub, marginTop: 1 }}>Tap to refresh to the latest version</div>
      </button>
      <button
        onClick={() => accept()}
        style={{
          flexShrink: 0,
          padding: "8px 14px",
          minHeight: 40,
          background: T.brand,
          color: T.brandInk,
          border: "none",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: T.sans,
        }}
      >
        Refresh
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss update notification"
        style={{
          flexShrink: 0,
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "none",
          border: "none",
          borderRadius: 8,
          color: T.muted,
          fontSize: 18,
          lineHeight: 1,
          cursor: "pointer",
        }}
      >
        ×
      </button>
    </div>
  );
}
