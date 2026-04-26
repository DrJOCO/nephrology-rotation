import React from "react";
import { T } from "../../data/constants";
import type { AdminAuthMode } from "./types";

export function AdminAuthScreen({
  authMode,
  setAuthMode,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authPasswordConfirm,
  setAuthPasswordConfirm,
  authSubmitting,
  authError,
  onSignIn,
  onSignInWithGoogle,
  onCreateAccount,
  onForgotPassword,
  onExit,
}: {
  authMode: AdminAuthMode;
  setAuthMode: React.Dispatch<React.SetStateAction<AdminAuthMode>>;
  authEmail: string;
  setAuthEmail: React.Dispatch<React.SetStateAction<string>>;
  authPassword: string;
  setAuthPassword: React.Dispatch<React.SetStateAction<string>>;
  authPasswordConfirm: string;
  setAuthPasswordConfirm: React.Dispatch<React.SetStateAction<string>>;
  authSubmitting: boolean;
  authError: string;
  onSignIn: () => Promise<void>;
  onSignInWithGoogle: () => Promise<void>;
  onCreateAccount: () => Promise<void>;
  onForgotPassword: () => Promise<void>;
  onExit?: () => void;
}) {
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${T.navyBg} 0%, ${T.deepBg} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: T.sans }}>
      <div style={{ background: T.card, borderRadius: 20, padding: 36, maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>🔐</div>
        <h1 style={{ color: T.navy, fontFamily: T.serif, fontSize: 22, margin: "0 0 4px", fontWeight: 700 }}>
          {authMode === "signup" ? "Create Admin Account" : "Admin Sign-In"}
        </h1>
        <p style={{ color: T.sub, fontSize: 13, margin: "0 0 20px" }}>
          {authMode === "signup"
            ? "Use an email that has already been invited by an existing admin."
            : "Sign in with your admin email before unlocking the panel PIN."}
        </p>
        <div style={{ display: "flex", gap: 8, background: T.bg, borderRadius: 999, padding: 4, marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => setAuthMode("signin")}
            style={{ flex: 1, padding: "9px 12px", borderRadius: 999, border: "none", background: authMode === "signin" ? T.card : "transparent", color: authMode === "signin" ? T.navy : T.sub, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("signup")}
            style={{ flex: 1, padding: "9px 12px", borderRadius: 999, border: "none", background: authMode === "signup" ? T.card : "transparent", color: authMode === "signup" ? T.navy : T.sub, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            Create Account
          </button>
        </div>
        <div style={{ textAlign: "left", marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: T.sub, display: "block", marginBottom: 4 }}>Admin Email</label>
          <input
            type="email"
            value={authEmail}
            onChange={(event) => setAuthEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || !authPassword) return;
              if (authMode === "signup") void onCreateAccount();
              else void onSignIn();
            }}
            placeholder="you@example.com"
            style={{ width: "100%", padding: "12px 14px", border: `2px solid ${T.pale}`, borderRadius: 10, outline: "none", boxSizing: "border-box", fontSize: 14 }}
          />
        </div>
        <div style={{ textAlign: "left", marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: T.sub, display: "block", marginBottom: 4 }}>Password</label>
          <input
            type="password"
            value={authPassword}
            onChange={(event) => setAuthPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || !authEmail.trim()) return;
              if (authMode === "signup") {
                if (authPasswordConfirm) void onCreateAccount();
                return;
              }
              void onSignIn();
            }}
            placeholder={authMode === "signup" ? "Create a password" : "Admin password"}
            style={{ width: "100%", padding: "12px 14px", border: `2px solid ${T.pale}`, borderRadius: 10, outline: "none", boxSizing: "border-box", fontSize: 14 }}
          />
        </div>
        {authMode === "signup" && (
          <div style={{ textAlign: "left", marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: T.sub, display: "block", marginBottom: 4 }}>Confirm Password</label>
            <input
              type="password"
              value={authPasswordConfirm}
              onChange={(event) => setAuthPasswordConfirm(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && authEmail.trim() && authPassword) void onCreateAccount(); }}
              placeholder="Repeat your password"
              style={{ width: "100%", padding: "12px 14px", border: `2px solid ${T.pale}`, borderRadius: 10, outline: "none", boxSizing: "border-box", fontSize: 14 }}
            />
          </div>
        )}
        {authError && <p style={{ color: T.danger, fontSize: 13, margin: "0 0 14px", fontWeight: 600 }}>{authError}</p>}
        <button
          onClick={() => { if (authMode === "signup") void onCreateAccount(); else void onSignIn(); }}
          disabled={!authEmail.trim() || !authPassword || (authMode === "signup" && !authPasswordConfirm) || authSubmitting}
          style={{ width: "100%", padding: "14px 0", background: authEmail.trim() && authPassword && (authMode === "signin" || authPasswordConfirm) && !authSubmitting ? T.brand : T.muted, color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: authEmail.trim() && authPassword && (authMode === "signin" || authPasswordConfirm) && !authSubmitting ? "pointer" : "default", opacity: authEmail.trim() && authPassword && (authMode === "signin" || authPasswordConfirm) && !authSubmitting ? 1 : 0.7 }}
        >
          {authSubmitting ? (authMode === "signup" ? "Creating Account..." : "Signing In...") : (authMode === "signup" ? "Create Admin Account" : "Sign In")}
        </button>
        {authMode === "signin" && (
          <button
            type="button"
            onClick={() => void onSignInWithGoogle()}
            disabled={authSubmitting}
            style={{
              width: "100%",
              padding: "12px 0",
              marginTop: 10,
              background: T.surface2,
              color: T.text,
              border: `1px solid ${T.line}`,
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: authSubmitting ? "default" : "pointer",
              opacity: authSubmitting ? 0.7 : 1,
            }}
          >
            Continue With Google
          </button>
        )}
        {authMode === "signin" && (
          <button
            type="button"
            onClick={() => void onForgotPassword()}
            disabled={authSubmitting}
            style={{
              marginTop: 10,
              background: "none",
              border: "none",
              color: T.brand,
              fontSize: 13,
              fontWeight: 700,
              cursor: authSubmitting ? "default" : "pointer",
              opacity: authSubmitting ? 0.6 : 1,
              padding: 0,
            }}
          >
            Forgot password?
          </button>
        )}
        <p style={{ color: T.muted, fontSize: 13, marginTop: 12 }}>
          {authMode === "signup"
            ? "Existing admins can add your email from Settings → Admin Access."
            : "If your original owner access used your Google Firebase account, try Google sign-in."}
        </p>
        {onExit && <button onClick={onExit} style={{ marginTop: 14, background: "none", border: `1px solid ${T.line}`, color: T.sub, padding: "10px 0", width: "100%", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>← Back to Student App</button>}
      </div>
    </div>
  );
}
