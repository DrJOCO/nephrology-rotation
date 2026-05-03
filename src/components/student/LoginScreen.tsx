import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";
import { T } from "../../data/constants";
import { STUDENT_AUTH_PIN_LENGTH } from "../../utils/firebase";
import { LIMITS } from "../../utils/validation";

type StudentLoginMode = "first_time" | "returning";
type StudentAuthSessionKind = "none" | "guest" | "verified";
type StudentEmailFlowState = "idle" | "link_sent" | "needs_completion" | "pin_setup";
type StudentPinFlowMode = "create" | "reset";

const LOGIN_INPUT_CSS = `
.login-input { transition: border-bottom-color 0.18s ease; }
.login-input:focus { border-bottom-color: var(--c-brand) !important; }
.login-input::placeholder { color: var(--c-muted); opacity: 0.7; }
`;

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
        title: isResetFlow ? "Create a new PIN" : "Create your PIN",
      }
    : trustedSessionReady
      ? {
          title: "You're already signed in",
        }
      : isFirstTime
        ? {
            title: "Verify email, then create a PIN",
          }
        : {
            title: "Use your PIN or reset it",
          };

  const showStepper = !trustedSessionReady;
  const stepIndex = pinSetupPending
    ? 2
    : (linkSent || needsEmailCompletion)
      ? 1
      : 0;

  const statusMessages = [
    authError ? { text: authError, bg: T.dangerBg, border: T.danger, color: T.danger } : null,
    authNotice ? { text: authNotice, bg: T.successBg, border: T.success, color: T.success } : null,
    joinError ? { text: joinError, bg: T.dangerBg, border: T.danger, color: T.danger } : null,
  ].filter(Boolean) as Array<{ text: string; bg: string; border: string; color: string }>;

  const fieldLabelStyle: CSSProperties = {
    display: "block",
    marginBottom: 6,
    fontSize: 12,
    fontWeight: 500,
    color: T.sub,
  };

  const inputStyle = ({
    hasError = false,
    centered = false,
    disabled = false,
  }: {
    hasError?: boolean;
    centered?: boolean;
    disabled?: boolean;
  }): CSSProperties => ({
    width: "100%",
    padding: "8px 0",
    fontSize: 14,
    border: 0,
    borderBottom: `1.5px solid ${hasError ? T.danger : T.line}`,
    borderRadius: 0,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: T.sans,
    textAlign: centered ? "center" : "left",
    letterSpacing: 0,
    background: "transparent",
    color: disabled ? T.muted : T.text,
    opacity: disabled ? 0.6 : 1,
  });

  const monoInputStyle = (opts: { hasError?: boolean; centered?: boolean; disabled?: boolean } = {}): CSSProperties => ({
    ...inputStyle(opts),
    fontFamily: T.mono,
    fontSize: 16,
    letterSpacing: 2.2,
  });

  const ctaDisabled = !canJoin || joining;
  const primaryButtonStyle: CSSProperties = {
    width: "100%",
    border: "none",
    borderRadius: 2,
    padding: "14px 16px",
    background: T.ink,
    color: T.bg,
    fontSize: 14,
    fontWeight: 600,
    cursor: ctaDisabled ? "not-allowed" : "pointer",
    opacity: ctaDisabled ? 0.6 : 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "opacity 0.18s ease",
  };

  const siblingAnchorStyle = (enabled: boolean): CSSProperties => ({
    background: "none",
    border: "none",
    color: T.muted,
    fontSize: 11,
    fontWeight: 500,
    fontFamily: T.mono,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    cursor: enabled ? "pointer" : "default",
    padding: 0,
    opacity: enabled ? 1 : 0.45,
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: T.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      fontFamily: T.sans,
    }}>
      <style>{LOGIN_INPUT_CSS}</style>
      <div style={{
        width: "100%",
        maxWidth: 480,
        background: T.card,
        border: `1px solid ${T.line}`,
        borderRadius: 4,
        padding: "28px 24px 18px",
        display: "flex",
        flexDirection: "column",
      }}>

        {showStepper && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14, justifyContent: "center" }} aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: i <= stepIndex ? T.brand : T.line,
                transition: "background 0.2s ease",
              }} />
            ))}
          </div>
        )}

        <h1 style={{
          margin: "0 0 22px",
          fontFamily: T.serif,
          fontStyle: "italic",
          fontSize: 24,
          lineHeight: 1.25,
          fontWeight: 500,
          color: T.navy,
          textAlign: "center",
          letterSpacing: -0.2,
        }}>
          {activeGuide.title}
        </h1>

        {trustedSessionReady && (
          <div style={{
            background: T.successBg,
            border: `1px solid ${T.success}`,
            borderRadius: 4,
            padding: 14,
            marginBottom: 16,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.success, marginBottom: 4 }}>
                  Trusted device
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.navy, marginBottom: 4 }}>
                  Signed in as {studentEmail || "your student account"}
                </div>
                <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.55 }}>
                  Open a rotation without re-entering your PIN on this device.
                </div>
              </div>
              <button
                type="button"
                onClick={onUseDifferentStudentAccount}
                style={{
                  border: `1px solid ${T.success}`,
                  background: "transparent",
                  color: T.navy,
                  borderRadius: 2,
                  padding: "8px 10px",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Use another email
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gap: 16, marginBottom: 16 }}>
          {isFirstTime && (
            <div>
              <label style={fieldLabelStyle}>Your name</label>
              <input
                type="text"
                name="student-name"
                autoComplete="name"
                placeholder="e.g. Nora Phron"
                maxLength={LIMITS.NAME_MAX}
                value={studentName}
                onChange={e => setStudentName(e.target.value.slice(0, LIMITS.NAME_MAX))}
                className="login-input"
                style={inputStyle({})}
              />
            </div>
          )}

          <div>
            <label style={fieldLabelStyle}>Email address</label>
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
              className="login-input"
              style={inputStyle({ hasError: Boolean(authError) })}
            />
          </div>
        </div>

        {isFirstTime && !trustedSessionReady && !pinSetupPending && (() => {
          const verifyEnabled = needsEmailCompletion
            ? Boolean(studentEmail.trim()) && !authSubmitting
            : canSendCreateLink;
          return (
            <p style={{ margin: "0 0 16px", fontSize: 13, lineHeight: 1.55, color: T.sub }}>
              <span aria-hidden="true" style={{ color: T.brand, marginRight: 6 }}>●</span>
              Step 1 of 3 — verify this email to continue.{" "}
              <button
                type="button"
                onClick={needsEmailCompletion ? onCompleteEmailLinkSignIn : () => onSendVerificationLink("create")}
                disabled={!verifyEnabled}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: T.brand,
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: "inherit",
                  cursor: verifyEnabled ? "pointer" : "not-allowed",
                  opacity: verifyEnabled ? 1 : 0.55,
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                {authSubmitting
                  ? "Working..."
                  : needsEmailCompletion
                    ? "Complete verification →"
                    : linkSent
                      ? "Resend verification link →"
                      : "Send verification link →"}
              </button>
            </p>
          );
        })()}

        {(pinSetupPending || (!trustedSessionReady && !isFirstTime)) && (
          <div style={{
            display: "grid",
            gridTemplateColumns: pinSetupPending ? "1fr 1fr" : "1fr",
            gap: 16,
            marginBottom: 16,
          }}>
            <div>
              <label style={fieldLabelStyle}>
                {pinSetupPending ? `Create ${STUDENT_AUTH_PIN_LENGTH}-digit PIN` : `${STUDENT_AUTH_PIN_LENGTH}-digit PIN`}
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="····"
                maxLength={STUDENT_AUTH_PIN_LENGTH}
                name="rotation-pin"
                autoComplete="one-time-code"
                value={studentPin}
                onChange={e => setStudentPin(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && canJoin) onJoinRotation();
                }}
                className="login-input"
                style={monoInputStyle({ centered: true })}
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
                  placeholder="····"
                  maxLength={STUDENT_AUTH_PIN_LENGTH}
                  name="rotation-pin-confirm"
                  autoComplete="one-time-code"
                  value={studentPinConfirm}
                  onChange={e => setStudentPinConfirm(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && canJoin) onJoinRotation();
                  }}
                  className="login-input"
                  style={monoInputStyle({ centered: true, hasError: Boolean(studentPinConfirm) && studentPinConfirm !== studentPin })}
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
            <label style={fieldLabelStyle}>Rotation code</label>
            {rotationCodeLocked ? (
              <div
                aria-hidden="true"
                style={{
                  ...monoInputStyle({ centered: true, disabled: true }),
                  minHeight: 36,
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
                className="login-input"
                style={monoInputStyle({ centered: true, hasError: Boolean(joinError) })}
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

        {statusMessages.length > 0 && (
          <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
            {statusMessages.map((message, index) => (
              <div
                key={index}
                style={{
                  background: message.bg,
                  border: `1px solid ${message.border}`,
                  borderRadius: 4,
                  padding: "10px 12px",
                  fontSize: 13,
                  fontWeight: 500,
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

        {!trustedSessionReady && !pinSetupPending && (() => {
          const resetEnabled = needsEmailCompletion
            ? Boolean(studentEmail.trim()) && !authSubmitting
            : canSendResetLink;
          const resetLabel = authSubmitting
            ? "Working..."
            : needsEmailCompletion && isResetFlow
              ? "Complete verification"
              : linkSent && isResetFlow
                ? "Resend reset link"
                : "Reset PIN";
          return (
            <div style={{
              marginTop: 18,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}>
              <button
                type="button"
                onClick={() => onLoginModeChange(isFirstTime ? "returning" : "first_time")}
                style={siblingAnchorStyle(true)}
              >
                {isFirstTime ? "Already have a PIN?" : "First time?"}
              </button>
              <button
                type="button"
                onClick={needsEmailCompletion ? onCompleteEmailLinkSignIn : () => onSendVerificationLink("reset")}
                disabled={!resetEnabled}
                style={siblingAnchorStyle(resetEnabled)}
              >
                {resetLabel}
              </button>
            </div>
          );
        })()}

        <div style={{
          marginTop: 24,
          paddingTop: 14,
          borderTop: `1px solid ${T.line}`,
          fontSize: 11,
          color: T.muted,
          textAlign: "center",
          lineHeight: 1.6,
        }}>
          <div>For educational use only. Not medical advice. Always use clinical judgment.</div>
          <div style={{ marginTop: 6, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span>&copy; {new Date().getFullYear()} JCheng</span>
            {onAdminToggle && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={onAdminToggle}
                  style={{
                    background: "none",
                    border: "none",
                    color: T.muted,
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Admin Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
