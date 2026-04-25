import {
  ArrowRight,
  Mail,
} from "lucide-react";
import { T } from "../../data/constants";
import { useIsMobile } from "../../utils/helpers";
import { STUDENT_AUTH_PIN_LENGTH } from "../../utils/firebase";
import { LIMITS } from "../../utils/validation";

type StudentLoginMode = "first_time" | "returning";
type StudentAuthSessionKind = "none" | "guest" | "verified";
type StudentEmailFlowState = "idle" | "link_sent" | "needs_completion" | "pin_setup";
type StudentPinFlowMode = "create" | "reset";

export default function LoginScreen({
  studentName,
  setStudentName,
  studentPin,
  setStudentPin,
  studentPinConfirm,
  setStudentPinConfirm,
  studentEmail,
  setStudentEmail,
  loginMode,
  onLoginModeChange,
  authSessionKind,
  emailFlowState,
  pinFlowMode,
  joinCode,
  setJoinCode,
  joinError,
  setJoinError,
  joining,
  authSubmitting,
  authError,
  authNotice,
  onSendVerificationLink,
  onCompleteEmailLinkSignIn,
  onUseDifferentStudentAccount,
  onJoinRotation,
  onAdminToggle,
}: {
  studentName: string; setStudentName: (v: string) => void;
  studentPin: string; setStudentPin: (v: string) => void;
  studentPinConfirm: string; setStudentPinConfirm: (v: string) => void;
  studentEmail: string; setStudentEmail: (v: string) => void;
  loginMode: StudentLoginMode;
  onLoginModeChange: (mode: StudentLoginMode) => void;
  authSessionKind: StudentAuthSessionKind;
  emailFlowState: StudentEmailFlowState;
  pinFlowMode: StudentPinFlowMode;
  joinCode: string; setJoinCode: (v: string) => void;
  joinError: string; setJoinError: (v: string) => void;
  joining: boolean;
  authSubmitting: boolean;
  authError: string;
  authNotice: string;
  onSendVerificationLink: (mode: StudentPinFlowMode) => void;
  onCompleteEmailLinkSignIn: () => void;
  onUseDifferentStudentAccount: () => void;
  onJoinRotation: () => void;
  onAdminToggle?: () => void;
}) {
  const isMobile = useIsMobile();
  const trustedSessionReady = authSessionKind === "verified" && emailFlowState !== "pin_setup";
  const pinSetupPending = emailFlowState === "pin_setup";
  const needsEmailCompletion = emailFlowState === "needs_completion";
  const linkSent = emailFlowState === "link_sent";
  const isFirstTime = loginMode === "first_time";
  const effectivePinFlowMode = (pinSetupPending || needsEmailCompletion || linkSent)
    ? pinFlowMode
    : (isFirstTime ? "create" : "reset");
  const isResetFlow = effectivePinFlowMode === "reset";
  const showRotationCodeField = isFirstTime || pinSetupPending || !trustedSessionReady;
  const rotationCodeLocked = isFirstTime && !pinSetupPending;
  const canSendCreateLink = Boolean(studentName.trim() && studentEmail.trim() && !authSubmitting);
  const canSendResetLink = Boolean(studentEmail.trim() && !authSubmitting);
  const canJoin = Boolean(
    ((showRotationCodeField ? joinCode.length >= LIMITS.ROTATION_CODE_MIN : true)
      && (isFirstTime ? studentName.trim() : (trustedSessionReady || Boolean(studentEmail.trim()))))
    && (pinSetupPending
      ? studentPin.length === STUDENT_AUTH_PIN_LENGTH
        && studentPinConfirm.length === STUDENT_AUTH_PIN_LENGTH
        && studentPin === studentPinConfirm
      : trustedSessionReady || studentPin.length === STUDENT_AUTH_PIN_LENGTH)
  );

  const activeGuide = pinSetupPending
    ? {
        eyebrow: isResetFlow ? "PIN Reset" : "Finish Setup",
        title: isResetFlow ? "Create a new PIN" : "Create your PIN",
        body: isResetFlow
          ? `Email verified. Choose a new ${STUDENT_AUTH_PIN_LENGTH}-digit PIN.`
          : `Email verified. Choose a ${STUDENT_AUTH_PIN_LENGTH}-digit PIN.`,
      }
    : trustedSessionReady
      ? {
          eyebrow: "Trusted Device",
          title: "You’re already signed in",
          body: "Open your rotation right away, or switch to another student email.",
        }
      : isFirstTime
        ? {
            eyebrow: "First Time",
            title: "Verify email, then create a PIN",
            body: "One quick setup. After that, your PIN is the easy way back in.",
          }
        : {
            eyebrow: "Returning",
            title: "Use your PIN or reset it",
            body: "Sign in with your email, PIN, and rotation code, or send yourself a reset link.",
          };

  const guideBullets = pinSetupPending
    ? isFirstTime
      ? [
          "Your email is verified.",
          `Create a ${STUDENT_AUTH_PIN_LENGTH}-digit PIN.`,
          "Then enter your rotation code.",
        ]
      : [
          "Your email is verified.",
          `Create a ${STUDENT_AUTH_PIN_LENGTH}-digit PIN.`,
          "Then we’ll open your assigned rotation.",
        ]
    : trustedSessionReady
      ? [
          "This device already knows you.",
          "We’ll open your assigned rotation.",
        ]
      : isFirstTime
        ? [
            "Enter your name and email.",
            "Verify your email once.",
            "Then create your PIN.",
          ]
        : [
            "Enter your email and PIN.",
            "Enter your rotation code.",
            "Or send a reset link if needed.",
          ];

  const verificationActionLabel = needsEmailCompletion
    ? "Complete verification"
    : linkSent
      ? "Resend verification link"
      : isResetFlow
        ? "Email me a reset link"
        : "Send verification link";
  const returningResetLabel = needsEmailCompletion
    ? "Complete verification"
    : linkSent
      ? "Resend reset link"
      : "Need a new PIN?";

  const verificationHelperText = needsEmailCompletion
    ? "Open the link, then come back here to finish."
    : linkSent
      ? "Check your inbox for the verification link."
      : isResetFlow
        ? "Verify your email again to set a new PIN."
        : "Verify this email to continue.";

  const verificationFallbackText = (linkSent || needsEmailCompletion)
    ? "Don't see it within 2 minutes? Check spam, or try a personal email — hospital networks sometimes block these."
    : "";

  const showInlineVerifyNotice = isFirstTime && !trustedSessionReady && !pinSetupPending && Boolean(authNotice);

  const statusMessages = [
    authError ? { text: authError, bg: T.dangerBg, border: T.danger, color: T.danger } : null,
    !showInlineVerifyNotice && authNotice ? { text: authNotice, bg: T.successBg, border: T.success, color: T.success } : null,
    joinError ? { text: joinError, bg: T.dangerBg, border: T.danger, color: T.danger } : null,
  ].filter(Boolean) as Array<{ text: string; bg: string; border: string; color: string }>;

  const fieldLabelStyle = {
    display: "block",
    marginBottom: 7,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.6,
    textTransform: "uppercase" as const,
    color: T.sub,
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
    padding: "13px 14px",
    fontSize: mono ? 15 : 14,
    border: `1.5px solid ${hasError ? T.danger : T.line}`,
    borderRadius: 14,
    outline: "none",
    boxSizing: "border-box" as const,
    fontFamily: mono ? T.mono : T.sans,
    textAlign: centered ? ("center" as const) : ("left" as const),
    letterSpacing: mono ? 2.2 : 0,
    background: disabled ? T.grayBg : T.surface,
    color: disabled ? T.muted : T.text,
    opacity: disabled ? 0.72 : 1,
  });

  const tabButtonStyle = (active: boolean) => ({
    flex: 1,
    border: "none",
    borderRadius: 999,
    padding: "10px 12px",
    background: active ? T.card : "transparent",
    color: active ? T.navy : T.sub,
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: active ? "0 12px 24px rgba(16, 28, 54, 0.12)" : "none",
  });

  const primaryButtonStyle = {
    width: "100%",
    border: "none",
    borderRadius: 14,
    padding: "14px 16px",
    background: canJoin && !joining
      ? T.brand
      : T.muted,
    color: "white",
    fontSize: 14,
    fontWeight: 800,
    cursor: canJoin && !joining ? "pointer" : "default",
    opacity: canJoin && !joining ? 1 : 0.68,
    boxShadow: canJoin && !joining ? "0 18px 32px rgba(24, 52, 92, 0.26)" : "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  } satisfies React.CSSProperties;

  const secondaryButtonStyle = (enabled: boolean) => ({
    width: "100%",
    borderRadius: 12,
    border: `1px solid ${enabled ? T.brand : T.line}`,
    padding: "11px 14px",
    background: enabled ? T.brand : T.grayBg,
    color: enabled ? "white" : T.muted,
    fontSize: 13,
    fontWeight: 800,
    cursor: enabled ? "pointer" : "default",
    opacity: enabled ? 1 : 0.78,
    boxShadow: enabled ? "0 14px 28px rgba(24, 52, 92, 0.22)" : "none",
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(135deg, ${T.navyBg} 0%, ${T.deepBg} 48%, #0d1e33 100%)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: isMobile ? 16 : 24,
      fontFamily: T.sans,
    }}>
      <div style={{
        width: "100%",
        maxWidth: isMobile ? 480 : 1120,
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "0.95fr 1.05fr",
        overflow: "hidden",
        borderRadius: 28,
        border: `1px solid rgba(255,255,255,0.12)`,
        boxShadow: "0 30px 90px rgba(0,0,0,0.34)",
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(14px)",
      }}>
        {!isMobile && (
        <div style={{
          padding: "34px 30px 30px",
          color: "white",
          background: `linear-gradient(160deg, rgba(12, 26, 46, 0.94), rgba(20, 54, 91, 0.88))`,
          borderRight: `1px solid rgba(255,255,255,0.08)`,
        }}>
          <h1 style={{
            margin: "0 0 10px",
            fontFamily: T.serif,
            fontSize: 34,
            lineHeight: 1.08,
            letterSpacing: -0.9,
            fontWeight: 700,
          }}>
            Nephrology
            <br />
            Rotation
          </h1>
          <p style={{
            margin: "0 0 26px",
            color: "rgba(255,255,255,0.76)",
            fontSize: 14,
            lineHeight: 1.7,
            maxWidth: 420,
          }}>
            Student sign-in for your nephrology rotation.
          </p>

          <div style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 18,
            padding: 16,
            maxWidth: 420,
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.7, color: "rgba(255,255,255,0.70)", marginBottom: 6 }}>
              {activeGuide.eyebrow}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.24, marginBottom: 10, letterSpacing: -0.3 }}>
              {activeGuide.title}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.78)", marginBottom: 10 }}>
              {activeGuide.body}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {guideBullets.map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.78)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.72)", flexShrink: 0 }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}

        <div style={{
          background: T.card,
          padding: isMobile ? "22px 18px 18px" : "30px 30px 24px",
          display: "flex",
          flexDirection: "column",
        }}>
          {isMobile && (
            <div style={{ marginBottom: 16 }}>
              <h1 style={{
                margin: 0,
                fontFamily: T.serif,
                fontSize: 24,
                fontWeight: 700,
                color: T.navy,
                letterSpacing: -0.5,
              }}>
                Nephrology Rotation
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: T.sub, lineHeight: 1.5 }}>
                Student sign-in
              </p>
            </div>
          )}
          <div style={{
            background: T.surface2,
            borderRadius: 999,
            padding: 6,
            display: "flex",
            gap: 6,
            marginBottom: 18,
          }}>
            <button type="button" onClick={() => onLoginModeChange("first_time")} style={tabButtonStyle(isFirstTime)}>
              First time
            </button>
            <button type="button" onClick={() => onLoginModeChange("returning")} style={tabButtonStyle(!isFirstTime)}>
              Returning
            </button>
          </div>

          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: isMobile ? undefined : 520,
          }}>

          {trustedSessionReady && (
            <div style={{
              background: T.successBg,
              border: `1px solid ${T.success}`,
              borderRadius: 18,
              padding: 16,
              marginBottom: 16,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6, color: T.success, marginBottom: 4 }}>
                    Trusted device
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.navy, marginBottom: 4 }}>
                    Signed in as {studentEmail || "your student account"}
                  </div>
                  <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.6 }}>
                    You can open a rotation without re-entering your PIN on this device.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onUseDifferentStudentAccount}
                  style={{
                    border: `1px solid ${T.success}`,
                    background: "rgba(255,255,255,0.55)",
                    color: T.navy,
                    borderRadius: 12,
                    padding: "10px 12px",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Use another email
                </button>
              </div>
            </div>
          )}

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 14,
            marginBottom: 14,
          }}>
            {isFirstTime && (
              <div>
                <label style={fieldLabelStyle}>Your Name</label>
                <input
                  type="text"
                  name="student-name"
                  autoComplete="name"
                  placeholder="e.g. Nora Phron"
                  maxLength={LIMITS.NAME_MAX}
                  value={studentName}
                  onChange={e => setStudentName(e.target.value.slice(0, LIMITS.NAME_MAX))}
                  style={inputStyle({})}
                />
              </div>
            )}

            <div>
              <label style={fieldLabelStyle}>Email Address</label>
              <input
                type="email"
                name="student-email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@school.edu"
                value={studentEmail}
                onChange={e => setStudentEmail(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    if (needsEmailCompletion) onCompleteEmailLinkSignIn();
                    else if (isFirstTime) {
                      if (canSendCreateLink) onSendVerificationLink("create");
                    } else if (canJoin) {
                      onJoinRotation();
                    }
                  }
                }}
                style={inputStyle({ hasError: Boolean(authError) })}
              />
            </div>
          </div>

          {isFirstTime && !trustedSessionReady && !pinSetupPending && (
            <div style={{
              background: T.surface2,
              border: `1px solid ${needsEmailCompletion ? T.warning : T.line}`,
              borderRadius: 18,
              padding: 16,
              marginBottom: 16,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                <Mail size={16} strokeWidth={2.1} color={T.brand} aria-hidden="true" />
                <div style={{ fontSize: 13, fontWeight: 800, color: T.navy }}>
                  Verify your email
                </div>
              </div>
              <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.65, marginBottom: 12 }}>
                {verificationHelperText}
              </div>
              <button
                type="button"
                onClick={needsEmailCompletion ? onCompleteEmailLinkSignIn : () => onSendVerificationLink("create")}
                disabled={needsEmailCompletion ? !studentEmail.trim() || authSubmitting : !canSendCreateLink}
                style={secondaryButtonStyle(needsEmailCompletion ? Boolean(studentEmail.trim()) && !authSubmitting : canSendCreateLink)}
              >
                {authSubmitting ? "Working..." : verificationActionLabel}
              </button>
              {showInlineVerifyNotice && (
                <div style={{
                  marginTop: 10,
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: T.success,
                  fontWeight: 700,
                }}>
                  {authNotice}
                </div>
              )}
              {verificationFallbackText && (
                <div style={{
                  marginTop: 10,
                  fontSize: 12,
                  lineHeight: 1.55,
                  color: T.muted,
                }}>
                  {verificationFallbackText}
                </div>
              )}
            </div>
          )}

          {(pinSetupPending || (!trustedSessionReady && !isFirstTime)) && (
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : (pinSetupPending ? "1fr 1fr" : "0.9fr 1.1fr"),
              gap: 14,
              marginBottom: 14,
            }}>
              <div>
                <label style={fieldLabelStyle}>
                  {pinSetupPending ? `Create ${STUDENT_AUTH_PIN_LENGTH}-Digit PIN` : `${STUDENT_AUTH_PIN_LENGTH}-Digit PIN`}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder=""
                  maxLength={STUDENT_AUTH_PIN_LENGTH}
                  value={studentPin}
                  onChange={e => setStudentPin(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && canJoin) onJoinRotation();
                  }}
                  style={inputStyle({ mono: true, centered: true })}
                />
                {pinSetupPending && (
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 6, lineHeight: 1.5 }}>
                    Use this PIN next time if you ever get signed out.
                  </div>
                )}
              </div>

              {pinSetupPending && (
                <div>
                  <label style={fieldLabelStyle}>Confirm PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder=""
                    maxLength={STUDENT_AUTH_PIN_LENGTH}
                    value={studentPinConfirm}
                    onChange={e => setStudentPinConfirm(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && canJoin) onJoinRotation();
                    }}
                    style={inputStyle({ mono: true, centered: true, hasError: Boolean(studentPinConfirm) && studentPinConfirm !== studentPin })}
                  />
                  {studentPinConfirm && studentPinConfirm !== studentPin && (
                    <div style={{ fontSize: 12, color: T.danger, marginTop: 6, lineHeight: 1.5 }}>
                      PINs need to match.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {showRotationCodeField && (
            <div style={{ marginBottom: 16 }}>
              <label style={fieldLabelStyle}>Rotation Code</label>
              {rotationCodeLocked ? (
                <div
                  aria-hidden="true"
                  style={{
                    ...inputStyle({ mono: true, centered: true, disabled: true }),
                    minHeight: 49,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    letterSpacing: 0.4,
                  }}
                >
                  Add after we verify your email
                </div>
              ) : (
                <input
                  name="rotation-code"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder=""
                  maxLength={LIMITS.ROTATION_CODE_MAX}
                  value={joinCode}
                  onChange={e => {
                    setJoinCode(e.target.value.toUpperCase().slice(0, LIMITS.ROTATION_CODE_MAX));
                    setJoinError("");
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && canJoin) onJoinRotation();
                  }}
                  style={inputStyle({ mono: true, centered: true, hasError: Boolean(joinError) })}
                />
              )}
              <div style={{ fontSize: 12, color: T.muted, marginTop: 6, lineHeight: 1.5 }}>
                {rotationCodeLocked
                  ? "We'll unlock this after your email is verified."
                  : isFirstTime
                    ? "Use the code your attending shared with you."
                    : "Enter the rotation code for the rotation you want to open."}
              </div>
            </div>
          )}

          <div style={{ flex: 1 }} />

          {statusMessages.length > 0 && (
            <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
              {statusMessages.map((message, index) => (
                <div
                  key={index}
                  style={{
                    background: message.bg,
                    border: `1px solid ${message.border}`,
                    borderRadius: 14,
                    padding: "11px 13px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: message.color,
                    lineHeight: 1.55,
                  }}
                >
                  {message.text}
                </div>
              ))}
            </div>
          )}

          <button type="button" onClick={onJoinRotation} disabled={!canJoin || joining} style={primaryButtonStyle}>
            <span>
              {joining
                ? "Opening your rotation..."
                : pinSetupPending
                  ? isResetFlow
                    ? "Reset PIN and Open Rotation"
                    : "Create PIN and Join Rotation"
                  : trustedSessionReady
                    ? "Open Rotation"
                    : isFirstTime
                      ? "Continue"
                      : "Sign In"}
            </span>
            {!joining && <ArrowRight size={16} strokeWidth={2.1} aria-hidden="true" />}
          </button>

          {!isFirstTime && !trustedSessionReady && !pinSetupPending && (
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={needsEmailCompletion ? onCompleteEmailLinkSignIn : () => onSendVerificationLink("reset")}
                disabled={needsEmailCompletion ? !studentEmail.trim() || authSubmitting : !canSendResetLink}
                style={{
                  background: "none",
                  border: "none",
                  color: needsEmailCompletion ? T.warning : T.brand,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: (needsEmailCompletion ? studentEmail.trim() && !authSubmitting : canSendResetLink) ? "pointer" : "default",
                  padding: 0,
                  opacity: (needsEmailCompletion ? studentEmail.trim() && !authSubmitting : canSendResetLink) ? 1 : 0.55,
                }}
              >
                {authSubmitting ? "Working..." : returningResetLabel}
              </button>
            </div>
          )}
          </div>

          {onAdminToggle && (
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              marginTop: 16,
            }}>
              <button
                type="button"
                onClick={onAdminToggle}
                style={{
                  background: "none",
                  border: "none",
                  color: T.muted,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Admin Login
              </button>
            </div>
          )}

          <div style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: `1px solid ${T.line}`,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}>
            <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
              For educational use only. Not medical advice. Always use clinical judgment.
            </div>
            <div style={{ fontSize: 12, color: T.muted }}>
              &copy; {new Date().getFullYear()} JCheng
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
