import { T } from "../../data/constants";
import { useIsMobile } from "../../utils/helpers";
import { LIMITS } from "../../utils/validation";

export default function LoginScreen({
  studentName,
  setStudentName,
  studentPin,
  setStudentPin,
  studentEmail,
  setStudentEmail,
  authMode,
  onAuthModeChange,
  joinCode,
  setJoinCode,
  joinError,
  setJoinError,
  joining,
  authSubmitting,
  authError,
  authNotice,
  emailLinkReady,
  needsEmailLinkCompletion,
  onSendSignInLink,
  onCompleteEmailLinkSignIn,
  onJoinRotation,
  onAdminToggle,
}: {
  studentName: string; setStudentName: (v: string) => void;
  studentPin: string; setStudentPin: (v: string) => void;
  studentEmail: string; setStudentEmail: (v: string) => void;
  authMode: "guest" | "email_link";
  onAuthModeChange: (mode: "guest" | "email_link") => void;
  joinCode: string; setJoinCode: (v: string) => void;
  joinError: string; setJoinError: (v: string) => void;
  joining: boolean;
  authSubmitting: boolean;
  authError: string;
  authNotice: string;
  emailLinkReady: boolean;
  needsEmailLinkCompletion: boolean;
  onSendSignInLink: () => void;
  onCompleteEmailLinkSignIn: () => void;
  onJoinRotation: () => void;
  onAdminToggle?: () => void;
}) {
  const isMobile = useIsMobile();
  const usingGuest = authMode === "guest";
  const rotationCodeLocked = authMode === "email_link" && !emailLinkReady;
  const canSendEmailLink = Boolean(studentName.trim() && studentEmail.trim() && !authSubmitting);
  const canJoin = Boolean(
    studentName.trim()
    && joinCode.length >= 4
    && (usingGuest ? studentPin.length === 4 : emailLinkReady),
  );
  const modeSummary = usingGuest
    ? {
        eyebrow: "Quick start",
        title: "Use this device today",
        body: "Set a 4-digit recovery PIN and get into the rotation fast. Best if you plan to stay on one device.",
      }
    : emailLinkReady
      ? {
          eyebrow: "Email ready",
          title: "Secure sign-in is active",
          body: "This device has your email-link session. Enter the rotation code below to continue.",
        }
      : needsEmailLinkCompletion
        ? {
            eyebrow: "Finish setup",
            title: "Complete the email link on this device",
            body: "Open the email we sent, then come back here and confirm the same address to finish secure sign-in.",
          }
        : {
            eyebrow: "Cross-device access",
            title: "Keep the same student account everywhere",
            body: "We’ll send a secure sign-in link so desktop and mobile stay in sync without a separate password.",
          };
  const statusMessages = [
    authError ? { text: authError, bg: T.redBg, border: T.redAlpha, color: T.accent } : null,
    authNotice ? { text: authNotice, bg: T.greenBg, border: T.greenAlpha, color: T.greenDk } : null,
    joinError ? { text: joinError, bg: T.redBg, border: T.redAlpha, color: T.accent } : null,
  ].filter(Boolean) as Array<{ text: string; bg: string; border: string; color: string }>;

  const fieldLabelStyle = {
    fontSize: 12,
    fontWeight: 700,
    color: T.sub,
    display: "block",
    marginBottom: 6,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  };

  const inputStyle = ({
    hasError = false,
    mono = false,
    centered = false,
    disabled = false,
  }: {
    hasError?: boolean;
    mono?: boolean;
    centered?: boolean;
    disabled?: boolean;
  }) => ({
    width: "100%",
    padding: "12px 14px",
    fontSize: mono ? 15 : 14,
    border: `1.5px solid ${hasError ? T.accent : T.line}`,
    borderRadius: 12,
    outline: "none",
    boxSizing: "border-box" as const,
    fontFamily: mono ? T.mono : T.sans,
    textAlign: centered ? ("center" as const) : ("left" as const),
    letterSpacing: mono && centered ? 3 : 0,
    textTransform: mono && centered ? ("uppercase" as const) : ("none" as const),
    background: disabled ? T.grayBg : T.surface,
    color: disabled ? T.muted : T.text,
    opacity: disabled ? 0.7 : 1,
  });

  const modeButtonStyle = (active: boolean) => ({
    flex: 1,
    padding: "10px 12px",
    borderRadius: 999,
    border: "none",
    background: active ? T.card : "transparent",
    color: active ? T.navy : T.sub,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: active ? "0 6px 18px rgba(0,0,0,0.10)" : "none",
  });
  const primaryButtonStyle = {
    width: "100%",
    padding: "13px 0",
    background: canJoin && !joining ? `linear-gradient(135deg, ${T.med}, ${T.navy})` : T.muted,
    color: "white",
    border: "none",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 700,
    cursor: canJoin && !joining ? "pointer" : "default",
    opacity: canJoin && !joining ? 1 : 0.6,
    boxShadow: canJoin && !joining ? "0 12px 24px rgba(0,0,0,0.16)" : "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(circle at top left, ${T.redAlpha} 0%, transparent 28%), linear-gradient(135deg, ${T.navyBg} 0%, ${T.deepBg} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: T.sans }}>
      <div style={{ background: T.card, borderRadius: 24, maxWidth: 500, width: "100%", overflow: "hidden", boxShadow: "0 26px 70px rgba(0,0,0,0.28)", border: `1px solid ${T.line}` }}>
        <div style={{ background: `linear-gradient(135deg, ${T.navyBg}, ${T.deepBg})`, padding: isMobile ? "24px 22px 20px" : "28px 28px 24px", color: "white" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.10)", fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 14 }}>
            Student Access
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 54, height: 54, borderRadius: 16, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
              {"\uD83E\uDED8"}
            </div>
            <div>
              <h1 style={{ color: "white", fontFamily: T.serif, fontSize: 28, lineHeight: 1.1, margin: "0 0 6px", fontWeight: 700 }}>Join your rotation</h1>
              <p style={{ color: "rgba(255,255,255,0.76)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                Start quickly on this device or use a secure email link to keep the same student account on desktop and mobile.
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: isMobile ? 20 : 24 }}>
          <div style={{ background: T.surface2, borderRadius: 16, padding: 6, display: "flex", gap: 6, marginBottom: 14 }}>
            <button type="button" onClick={() => onAuthModeChange("guest")} style={modeButtonStyle(authMode === "guest")}>
              Quick start
            </button>
            <button type="button" onClick={() => onAuthModeChange("email_link")} style={modeButtonStyle(authMode === "email_link")}>
              Sync across devices
            </button>
          </div>

          <div style={{ background: usingGuest ? T.blueBg : T.ice, borderRadius: 16, padding: "14px 16px", marginBottom: 18, border: `1px solid ${usingGuest ? T.line : T.redAlpha}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.med, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
              {modeSummary.eyebrow}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.navy, marginBottom: 4 }}>
              {modeSummary.title}
            </div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.55 }}>
              {modeSummary.body}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelStyle}>Your Name</label>
            <input
              type="text"
              placeholder="e.g. Nora Phron"
              maxLength={LIMITS.NAME_MAX}
              value={studentName}
              onChange={e => setStudentName(e.target.value.slice(0, LIMITS.NAME_MAX))}
              style={inputStyle({})}
              onFocus={e => e.target.style.borderColor = T.med}
              onBlur={e => e.target.style.borderColor = T.line}
            />
          </div>

          {usingGuest ? (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "0.95fr 1.05fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={fieldLabelStyle}>4-Digit Recovery PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="••••"
                  maxLength={4}
                  value={studentPin}
                  onChange={e => setStudentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  style={inputStyle({ mono: true, centered: true })}
                  onFocus={e => e.target.style.borderColor = T.med}
                  onBlur={e => e.target.style.borderColor = T.line}
                />
              </div>
              <div>
                <label style={fieldLabelStyle}>Rotation Code</label>
                <input
                  placeholder="e.g. CMC-MAR26"
                  maxLength={LIMITS.ROTATION_CODE_MAX}
                  value={joinCode}
                  onChange={e => { setJoinCode(e.target.value.toUpperCase().slice(0, LIMITS.ROTATION_CODE_MAX)); setJoinError(""); }}
                  onKeyDown={e => { if (e.key === "Enter" && canJoin) onJoinRotation(); }}
                  style={inputStyle({ hasError: Boolean(joinError), mono: true, centered: true })}
                  onFocus={e => e.target.style.borderColor = T.med}
                  onBlur={e => e.target.style.borderColor = joinError ? T.accent : T.line}
                />
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={fieldLabelStyle}>Email Address</label>
                <input
                  type="email"
                  inputMode="email"
                  placeholder="you@school.edu"
                  value={studentEmail}
                  onChange={e => setStudentEmail(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      if (needsEmailLinkCompletion) onCompleteEmailLinkSignIn();
                      else if (!emailLinkReady && canSendEmailLink) onSendSignInLink();
                      else if (canJoin) onJoinRotation();
                    }
                  }}
                  style={inputStyle({ hasError: Boolean(authError) })}
                  onFocus={e => e.target.style.borderColor = T.med}
                  onBlur={e => e.target.style.borderColor = authError ? T.accent : T.line}
                />
              </div>

              {!emailLinkReady && (
                <div style={{ background: T.surface2, borderRadius: 16, padding: 14, marginBottom: 12, border: `1px solid ${needsEmailLinkCompletion ? T.goldAlpha : canSendEmailLink ? T.redAlpha : T.line}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: needsEmailLinkCompletion ? T.goldText : T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                    {needsEmailLinkCompletion ? "Step 2 of 2" : "Step 1 of 2"}
                  </div>
                  <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.55, marginBottom: 12 }}>
                    {needsEmailLinkCompletion
                      ? "Open the secure email link, then come back here and confirm the same address to finish sign-in."
                      : "Send yourself a secure email link before entering the rotation code."}
                  </div>
                  {!needsEmailLinkCompletion && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                      <span style={{
                        background: canSendEmailLink ? T.greenBg : T.grayBg,
                        color: canSendEmailLink ? T.greenDk : T.muted,
                        border: `1px solid ${canSendEmailLink ? T.greenAlpha : T.line}`,
                        borderRadius: 999,
                        padding: "4px 9px",
                        fontSize: 12,
                        fontWeight: 700,
                      }}>
                        {canSendEmailLink ? "Ready to send" : "Add name + email"}
                      </span>
                      <span style={{ fontSize: 12, color: T.muted }}>
                        The button activates once both fields are filled.
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={needsEmailLinkCompletion ? onCompleteEmailLinkSignIn : onSendSignInLink}
                    disabled={needsEmailLinkCompletion ? !studentEmail.trim() || authSubmitting : !canSendEmailLink}
                    style={{
                      width: "100%",
                      padding: "11px 0",
                      background: needsEmailLinkCompletion
                        ? (studentEmail.trim() && !authSubmitting ? `linear-gradient(135deg, ${T.gold}, ${T.orange})` : T.grayBg)
                        : (canSendEmailLink ? `linear-gradient(135deg, ${T.med}, ${T.deepBg})` : T.grayBg),
                      color: needsEmailLinkCompletion
                        ? (studentEmail.trim() && !authSubmitting ? "white" : T.muted)
                        : (canSendEmailLink ? "white" : T.muted),
                      border: "none",
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: (needsEmailLinkCompletion ? studentEmail.trim() && !authSubmitting : canSendEmailLink) ? "pointer" : "default",
                      opacity: (needsEmailLinkCompletion ? studentEmail.trim() && !authSubmitting : canSendEmailLink) ? 1 : 0.9,
                      boxShadow: (needsEmailLinkCompletion ? studentEmail.trim() && !authSubmitting : canSendEmailLink) ? "0 12px 24px rgba(0,0,0,0.18)" : "none",
                      transform: (needsEmailLinkCompletion ? studentEmail.trim() && !authSubmitting : canSendEmailLink) ? "translateY(0)" : "none",
                      transition: "background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease, color 0.18s ease",
                    }}
                  >
                    {authSubmitting ? "Working..." : needsEmailLinkCompletion ? "Complete secure sign-in" : "Send secure sign-in link"}
                  </button>
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={fieldLabelStyle}>Rotation Code</label>
                <input
                  placeholder={rotationCodeLocked ? "Finish email step first" : "e.g. CMC-MAR26"}
                  maxLength={LIMITS.ROTATION_CODE_MAX}
                  value={joinCode}
                  onChange={e => { setJoinCode(e.target.value.toUpperCase().slice(0, LIMITS.ROTATION_CODE_MAX)); setJoinError(""); }}
                  onKeyDown={e => { if (e.key === "Enter" && canJoin) onJoinRotation(); }}
                  disabled={rotationCodeLocked}
                  style={inputStyle({ hasError: Boolean(joinError), mono: true, centered: true, disabled: rotationCodeLocked })}
                  onFocus={e => e.target.style.borderColor = T.med}
                  onBlur={e => e.target.style.borderColor = joinError ? T.accent : T.line}
                />
              </div>
            </>
          )}

          {statusMessages.length > 0 && (
            <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
              {statusMessages.map((message, index) => (
                <div key={index} style={{ background: message.bg, border: `1px solid ${message.border}`, borderRadius: 12, padding: "10px 12px", fontSize: 13, color: message.color, fontWeight: 600, lineHeight: 1.5 }}>
                  {message.text}
                </div>
              ))}
            </div>
          )}

          <button onClick={onJoinRotation} disabled={!canJoin || joining} style={primaryButtonStyle}>
            {joining ? "Joining..." : "Join Rotation"}
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, flex: 1, minWidth: 220 }}>
              For educational use only. Not medical advice. Always use clinical judgment.
            </div>
            {onAdminToggle && (
              <button onClick={onAdminToggle} style={{ background: "none", border: "none", color: T.muted, fontSize: 12, cursor: "pointer", padding: 0, fontWeight: 600 }}>
                Admin Login
              </button>
            )}
          </div>

          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.line}`, textAlign: "center", fontSize: 12, color: T.muted }}>
            &copy; {new Date().getFullYear()} JCheng
          </div>
        </div>
      </div>
    </div>
  );
}
