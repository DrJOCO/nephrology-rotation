import React, { useEffect, useState } from "react";
import { T } from "../../data/constants";

type AdminShellTab = { id: string; icon: string; label: string };

export function AdminShell({
  tabs,
  activeTab,
  onNavigate,
  heading,
  subheading,
  rotationCode,
  onLock,
  onSignOut,
  onExit,
  themeToggle,
  contentKey,
  children,
}: {
  tabs: AdminShellTab[];
  activeTab: string;
  onNavigate: (tab: string) => void;
  heading: string;
  subheading: string;
  rotationCode: string;
  onLock: () => void;
  onSignOut: () => void;
  onExit?: () => void;
  themeToggle: React.ReactNode;
  contentKey: string;
  children: React.ReactNode;
}) {
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== "undefined" ? window.innerWidth >= 1100 : false));

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setIsDesktop(window.innerWidth >= 1100);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!isDesktop) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.sans }}>
        <div style={{ background: `linear-gradient(135deg, ${T.navyBg} 0%, ${T.deepBg} 100%)`, padding: `calc(14px + env(safe-area-inset-top, 0px)) 20px 14px`, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: "white", fontFamily: T.serif, fontSize: 19, fontWeight: 700 }}>
                Admin Panel <span style={{ fontSize: 13, background: T.warning, color: T.warningInk, padding: "2px 8px", borderRadius: 6, marginLeft: 8, fontFamily: T.sans, fontWeight: 600, verticalAlign: "middle" }}>ATTENDING</span>
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {heading}
                {rotationCode && <span style={{ marginLeft: 8, fontSize: 13, background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 6, fontFamily: T.mono, letterSpacing: 1 }}>Code: {rotationCode}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {themeToggle}
              {onExit && <button onClick={onExit} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>← Student</button>}
              <button onClick={onLock} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>Lock 🔒</button>
              <button onClick={onSignOut} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>Sign Out</button>
            </div>
          </div>
        </div>
        <div className="tab-content-enter" key={contentKey} style={{ padding: `0 0 ${T.navH + T.navPad}px` }}>
          {children}
        </div>
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: T.dark, borderTop: `1px solid rgba(255,255,255,0.1)`, display: "flex", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => onNavigate(tab.id)} style={{ flex: 1, padding: "8px 0 10px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: active ? T.warning : T.muted, borderTop: active ? `2.5px solid ${T.warning}` : "2.5px solid transparent" }}>
                <span style={{ fontSize: 20 }}>{tab.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${T.bg} 0%, ${T.card} 100%)`, fontFamily: T.sans }}>
      <div style={{ display: "grid", gridTemplateColumns: "260px minmax(0, 1fr)", minHeight: "100vh" }}>
        <aside style={{ background: `linear-gradient(180deg, ${T.navyBg} 0%, ${T.deepBg} 100%)`, color: "white", padding: "28px 18px 18px", position: "sticky", top: 0, height: "100vh", boxSizing: "border-box", borderRight: `1px solid rgba(255,255,255,0.08)` }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Admin Panel</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.68)", lineHeight: 1.6 }}>{subheading}</div>
            {rotationCode && (
              <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.1)", borderRadius: 999, padding: "6px 10px", fontFamily: T.mono, fontSize: 13, letterSpacing: 1 }}>
                Code {rotationCode}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onNavigate(tab.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: `1px solid ${active ? "rgba(255,255,255,0.24)" : "transparent"}`,
                    background: active ? "rgba(255,255,255,0.12)" : "transparent",
                    color: active ? "white" : "rgba(255,255,255,0.7)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{tab.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: "auto", display: "grid", gap: 8, paddingTop: 24 }}>
            {themeToggle}
            {onExit && <button onClick={onExit} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)", borderRadius: 12, fontSize: 13, cursor: "pointer" }}>← Student App</button>}
            <button onClick={onLock} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)", borderRadius: 12, fontSize: 13, cursor: "pointer" }}>Lock Panel</button>
            <button onClick={onSignOut} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)", borderRadius: 12, fontSize: 13, cursor: "pointer" }}>Sign Out</button>
          </div>
        </aside>

        <main style={{ minWidth: 0 }}>
          <div style={{ position: "sticky", top: 0, zIndex: 90, background: T.card, backdropFilter: "blur(14px)", borderBottom: `1px solid ${T.line}`, padding: "20px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 700, color: T.navy }}>{heading}</div>
                <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>{subheading}</div>
              </div>
            </div>
          </div>
          <div className="tab-content-enter" key={contentKey} style={{ padding: "24px 28px 32px" }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
