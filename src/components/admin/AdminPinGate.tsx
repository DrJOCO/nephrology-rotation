import React from "react";
import { T } from "../../data/constants";

export function AdminPinGate({
  pin,
  setPin,
  pinError,
  onSubmit,
  signedInEmail,
  onSignOut,
  onExit,
}: {
  pin: string;
  setPin: React.Dispatch<React.SetStateAction<string>>;
  pinError: boolean;
  onSubmit: () => void;
  signedInEmail: string;
  onSignOut: () => Promise<void>;
  onExit?: () => void;
}) {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: T.sans }}>
      <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 0, padding: 36, maxWidth: 380, width: "100%" }}>
        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>
          — Admin
        </div>
        <h1 style={{ color: T.ink, fontFamily: T.serif, fontSize: 24, margin: "0 0 4px", fontWeight: 700, lineHeight: 1.15 }}>Admin Panel</h1>
        <p style={{ color: T.sub, fontSize: 13, margin: "0 0 24px", lineHeight: 1.5 }}>Nephrology Rotation Management</p>
        <div style={{ animation: pinError ? "shake 0.4s ease" : "none" }}>
          <input
            type="password"
            placeholder="Enter admin PIN"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") onSubmit(); }}
            style={{ width: "100%", padding: "14px 16px", fontSize: 18, border: `1px solid ${pinError ? T.danger : T.line}`, borderRadius: 0, boxSizing: "border-box", marginBottom: 16, fontFamily: T.mono, textAlign: "center", letterSpacing: 6, background: T.bg, color: T.ink }}
          />
        </div>
        {pinError && <p style={{ color: T.danger, fontSize: 13, margin: "8px 0 0", fontWeight: 600 }}>Incorrect PIN</p>}
        <button onClick={onSubmit} style={{ width: "100%", padding: "14px 0", background: T.brand, color: T.brandInk, border: "none", borderRadius: 0, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          Enter
        </button>
        <p style={{ color: T.muted, fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>Signed in as {signedInEmail || "admin user"}. Set or change your PIN in Settings.</p>
        <button onClick={() => { void onSignOut(); }} style={{ marginTop: 12, background: "none", border: `1px solid ${T.line}`, color: T.sub, padding: "10px 0", width: "100%", borderRadius: 0, fontSize: 13, cursor: "pointer" }}>Sign Out</button>
        {onExit && <button onClick={onExit} style={{ marginTop: 14, background: "none", border: `1px solid ${T.line}`, color: T.sub, padding: "10px 0", width: "100%", borderRadius: 0, fontSize: 13, cursor: "pointer" }}>← Back to Student App</button>}
      </div>
    </div>
  );
}

export function AdminPinSetupGate({
  pin,
  setPin,
  confirmPin,
  setConfirmPin,
  setupError,
  onSubmit,
  signedInEmail,
  onSignOut,
  onExit,
}: {
  pin: string;
  setPin: React.Dispatch<React.SetStateAction<string>>;
  confirmPin: string;
  setConfirmPin: React.Dispatch<React.SetStateAction<string>>;
  setupError: string;
  onSubmit: () => void;
  signedInEmail: string;
  onSignOut: () => Promise<void>;
  onExit?: () => void;
}) {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: T.sans }}>
      <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 0, padding: 36, maxWidth: 420, width: "100%" }}>
        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>
          — Admin
        </div>
        <h1 style={{ color: T.ink, fontFamily: T.serif, fontSize: 24, margin: "0 0 4px", fontWeight: 700, lineHeight: 1.15 }}>Create Admin PIN</h1>
        <p style={{ color: T.sub, fontSize: 13, margin: "0 0 24px", lineHeight: 1.5 }}>
          Set a private local PIN before opening this admin workspace on this device.
        </p>
        <div style={{ display: "grid", gap: 12, marginBottom: 14 }}>
          <input
            type="password"
            placeholder="New PIN"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") onSubmit(); }}
            style={{ width: "100%", padding: "14px 16px", fontSize: 18, border: `1px solid ${setupError ? T.danger : T.line}`, borderRadius: 0, boxSizing: "border-box", fontFamily: T.mono, textAlign: "center", letterSpacing: 6, background: T.bg, color: T.ink }}
          />
          <input
            type="password"
            placeholder="Confirm PIN"
            value={confirmPin}
            onChange={(event) => setConfirmPin(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") onSubmit(); }}
            style={{ width: "100%", padding: "14px 16px", fontSize: 18, border: `1px solid ${setupError ? T.danger : T.line}`, borderRadius: 0, boxSizing: "border-box", fontFamily: T.mono, textAlign: "center", letterSpacing: 6, background: T.bg, color: T.ink }}
          />
        </div>
        {setupError && <p style={{ color: T.danger, fontSize: 13, margin: "0 0 12px", fontWeight: 600 }}>{setupError}</p>}
        <button onClick={onSubmit} style={{ width: "100%", padding: "14px 0", background: T.brand, color: T.brandInk, border: "none", borderRadius: 0, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          Save PIN
        </button>
        <p style={{ color: T.muted, fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>Signed in as {signedInEmail || "admin user"}.</p>
        <button onClick={() => { void onSignOut(); }} style={{ marginTop: 12, background: "none", border: `1px solid ${T.line}`, color: T.sub, padding: "10px 0", width: "100%", borderRadius: 0, fontSize: 13, cursor: "pointer" }}>Sign Out</button>
        {onExit && <button onClick={onExit} style={{ marginTop: 14, background: "none", border: `1px solid ${T.line}`, color: T.sub, padding: "10px 0", width: "100%", borderRadius: 0, fontSize: 13, cursor: "pointer" }}>Back to Student App</button>}
      </div>
    </div>
  );
}
