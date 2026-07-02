import { Download } from "lucide-react";
import { T } from "../../../data/constants";

export default function InstallPromptCard({ variant, onInstallApp, onDismiss }: {
  variant: "native" | "ios";
  onInstallApp: () => Promise<void>;
  onDismiss: () => void;
}) {
  return (
    <section style={{ marginBottom: 14 }}>
      <div style={{ background: T.card, borderRadius: 18, padding: 16, border: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: T.card, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Download size={18} strokeWidth={1.75} color={T.brand} aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.ink, fontFamily: T.serif, marginBottom: 6 }}>
                Keep this on the home screen
              </div>
              <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.55, maxWidth: 560 }}>
                {variant === "native"
                  ? "It loads faster, feels more like an app, and students are much more likely to keep opening it between rounds."
                  : "On iPhone or iPad, open Safari's Share menu and choose Add to Home Screen so this stays one tap away."}
              </div>
            </div>
          </div>
          <button
            onClick={onDismiss}
            style={{ background: "none", border: "none", color: T.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0 }}
          >
            Dismiss
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {variant === "native" ? (
            <button
              onClick={() => { void onInstallApp(); }}
              style={{ background: T.brand, color: T.brandInk, border: "none", borderRadius: 12, padding: "10px 14px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}
            >
              Install app
            </button>
          ) : (
            <div style={{ background: T.card, color: T.ink, borderRadius: 12, padding: "10px 12px", fontSize: 13, fontWeight: 600, border: `1px solid ${T.line}` }}>
              Safari → Share → Add to Home Screen
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
