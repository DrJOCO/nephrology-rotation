import { T } from "../../data/constants";
import { LIMITS } from "../../utils/validation";

export default function LoginScreen({ studentName, setStudentName, studentPin, setStudentPin, joinCode, setJoinCode, joinError, setJoinError, joining, onJoinRotation, onSkipRotation }) {
  const canJoin = studentName.trim() && studentPin.length === 4 && joinCode.length >= 4;
  const canSkip = studentName.trim();
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${T.navy} 0%, ${T.deep} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: T.sans }}>
      <div style={{ background: T.card, borderRadius: 16, padding: 28, maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 13, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 26 }}>{"\uD83E\uDED8"}</div>
          <h1 style={{ color: T.navy, fontFamily: T.serif, fontSize: 21, margin: "0 0 4px", fontWeight: 700 }}>Nephrology Rotation</h1>
          <p style={{ color: T.sub, fontSize: 13, margin: "0 0 6px" }}>Teaching App for MS3 / MS4 Students</p>
          <p style={{ color: T.muted, fontSize: 11, margin: "0 0 20px" }}>4-Week Curriculum &bull; Quizzes &bull; Quick References &bull; Journal Articles</p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: T.sub, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>Your Name</label>
          <input
            type="text" placeholder="e.g. Glen Merulus" maxLength={LIMITS.NAME_MAX}
            value={studentName} onChange={e => setStudentName(e.target.value.slice(0, LIMITS.NAME_MAX))}
            style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: `2px solid ${T.pale}`, borderRadius: 8, outline: "none", boxSizing: "border-box", fontFamily: T.sans }}
            onFocus={e => e.target.style.borderColor = T.med}
            onBlur={e => e.target.style.borderColor = T.pale}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: T.sub, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>4-Digit PIN</label>
            <input
              type="password" inputMode="numeric" placeholder="&&bull;&&bull;&&bull;&&bull;" maxLength={4}
              value={studentPin} onChange={e => setStudentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              style={{ width: "100%", padding: "10px 12px", fontSize: 16, border: `2px solid ${T.pale}`, borderRadius: 8, outline: "none", boxSizing: "border-box", fontFamily: T.mono, textAlign: "center", letterSpacing: 6 }}
              onFocus={e => e.target.style.borderColor = T.med}
              onBlur={e => e.target.style.borderColor = T.pale}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: T.sub, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>Rotation Code</label>
            <input
              placeholder="e.g. CMC-MAR26" maxLength={LIMITS.ROTATION_CODE_MAX}
              value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase().slice(0, LIMITS.ROTATION_CODE_MAX)); setJoinError(""); }}
              onKeyDown={e => { if (e.key === "Enter" && canJoin) onJoinRotation(); }}
              style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: `2px solid ${joinError ? T.accent : T.pale}`, borderRadius: 8, outline: "none", boxSizing: "border-box", fontFamily: T.mono, textAlign: "center", letterSpacing: 3, textTransform: "uppercase" }}
              onFocus={e => e.target.style.borderColor = T.med}
              onBlur={e => e.target.style.borderColor = joinError ? T.accent : T.pale}
            />
          </div>
        </div>

        <p style={{ fontSize: 11, color: T.muted, margin: "0 0 12px", lineHeight: 1.5 }}>
          Choose a PIN if new. Use your existing PIN to resume your progress on any device.
        </p>

        {joinError && <p style={{ color: T.accent, fontSize: 12, margin: "0 0 12px", fontWeight: 600, textAlign: "center" }}>{joinError}</p>}

        <button
          onClick={onJoinRotation}
          disabled={!canJoin || joining}
          style={{ width: "100%", padding: "12px 0", background: canJoin && !joining ? T.med : T.muted, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: canJoin && !joining ? "pointer" : "default", marginBottom: 10, opacity: canJoin && !joining ? 1 : 0.6 }}>
          {joining ? "Joining..." : "Join Rotation"}
        </button>
        <button
          onClick={onSkipRotation}
          disabled={!canSkip}
          style={{ width: "100%", background: "none", border: "none", color: T.sub, fontSize: 12, cursor: canSkip ? "pointer" : "default", textDecoration: "underline", padding: "8px 0" }}>
          Use without rotation (offline only)
        </button>
      </div>
    </div>
  );
}
