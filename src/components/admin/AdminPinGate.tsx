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
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${T.navyBg} 0%, ${T.deepBg} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: T.sans }}>
      <div style={{ background: T.card, borderRadius: 20, padding: 36, maxWidth: 380, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>🔒</div>
        <h1 style={{ color: T.navy, fontFamily: T.serif, fontSize: 22, margin: "0 0 4px", fontWeight: 700 }}>Admin Panel</h1>
        <p style={{ color: T.sub, fontSize: 13, margin: "0 0 24px" }}>Nephrology Rotation Management</p>
        <div style={{ animation: pinError ? "shake 0.4s ease" : "none" }}>
          <input
            type="password"
            placeholder="Enter admin PIN"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") onSubmit(); }}
            style={{ width: "100%", padding: "14px 16px", fontSize: 18, border: `2px solid ${pinError ? T.danger : T.pale}`, borderRadius: 10, outline: "none", boxSizing: "border-box", marginBottom: 16, fontFamily: T.mono, textAlign: "center", letterSpacing: 6 }}
          />
        </div>
        {pinError && <p style={{ color: T.danger, fontSize: 13, margin: "8px 0 0", fontWeight: 600 }}>Incorrect PIN</p>}
        <button onClick={onSubmit} style={{ width: "100%", padding: "14px 0", background: T.brand, color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          Enter
        </button>
        <p style={{ color: T.muted, fontSize: 13, marginTop: 12 }}>Signed in as {signedInEmail || "admin user"}. Set or change your PIN in Settings.</p>
        <button onClick={() => { void onSignOut(); }} style={{ marginTop: 12, background: "none", border: `1px solid ${T.line}`, color: T.sub, padding: "10px 0", width: "100%", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Sign Out</button>
        {onExit && <button onClick={onExit} style={{ marginTop: 14, background: "none", border: `1px solid ${T.line}`, color: T.sub, padding: "10px 0", width: "100%", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>← Back to Student App</button>}
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
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${T.navyBg} 0%, ${T.deepBg} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: T.sans }}>
      <div style={{ background: T.card, borderRadius: 20, padding: 36, maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>🔐</div>
        <h1 style={{ color: T.navy, fontFamily: T.serif, fontSize: 22, margin: "0 0 4px", fontWeight: 700 }}>Create Admin PIN</h1>
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
            style={{ width: "100%", padding: "14px 16px", fontSize: 18, border: `2px solid ${setupError ? T.danger : T.pale}`, borderRadius: 10, outline: "none", boxSizing: "border-box", fontFamily: T.mono, textAlign: "center", letterSpacing: 6 }}
          />
          <input
            type="password"
            placeholder="Confirm PIN"
            value={confirmPin}
            onChange={(event) => setConfirmPin(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") onSubmit(); }}
            style={{ width: "100%", padding: "14px 16px", fontSize: 18, border: `2px solid ${setupError ? T.danger : T.pale}`, borderRadius: 10, outline: "none", boxSizing: "border-box", fontFamily: T.mono, textAlign: "center", letterSpacing: 6 }}
          />
        </div>
        {setupError && <p style={{ color: T.danger, fontSize: 13, margin: "0 0 12px", fontWeight: 600 }}>{setupError}</p>}
        <button onClick={onSubmit} style={{ width: "100%", padding: "14px 0", background: T.brand, color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          Save PIN
        </button>
        <p style={{ color: T.muted, fontSize: 13, marginTop: 12 }}>Signed in as {signedInEmail || "admin user"}.</p>
        <button onClick={() => { void onSignOut(); }} style={{ marginTop: 12, background: "none", border: `1px solid ${T.line}`, color: T.sub, padding: "10px 0", width: "100%", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Sign Out</button>
        {onExit && <button onClick={onExit} style={{ marginTop: 14, background: "none", border: `1px solid ${T.line}`, color: T.sub, padding: "10px 0", width: "100%", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Back to Student App</button>}
      </div>
    </div>
  );
}
