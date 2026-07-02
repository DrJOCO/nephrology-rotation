import { T } from "../../../data/constants";

export default function HomeHeader({ headerKicker, headerSub, online }: {
  headerKicker: string;
  headerSub: string;
  online: boolean;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 6 }}>
        {headerKicker}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, color: T.ink, fontFamily: T.serif, fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>Today</h1>
          <p style={{ margin: "6px 0 0", color: T.sub, fontSize: 13, lineHeight: 1.5, maxWidth: 520 }}>
            {headerSub}
          </p>
        </div>
        {!online && (
          <div style={{ background: T.warningBg, color: T.warning, border: `1px solid ${T.warning}`, borderRadius: 999, padding: "7px 12px", fontSize: 13, fontWeight: 700 }}>
            Offline
          </div>
        )}
      </div>
    </div>
  );
}
