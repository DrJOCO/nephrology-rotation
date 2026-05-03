import React, { useEffect, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { T } from "../../data/constants";
import { Icon } from "../student/Icon";

type AdminShellTab = { id: string; label: string };

function splitLastWord(str: string): { rest: string; last: string } {
  const words = (str || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { rest: "", last: "" };
  if (words.length === 1) return { rest: "", last: words[0] };
  return { rest: words.slice(0, -1).join(" "), last: words[words.length - 1] };
}

function SerifHeading({ text, size }: { text: string; size: number }) {
  const { rest, last } = splitLastWord(text);
  return (
    <span style={{ fontFamily: T.serif, fontSize: size, fontWeight: 700, color: T.ink, lineHeight: 1.1 }}>
      {rest && <span>{rest} </span>}
      <span style={{ fontStyle: "italic", fontWeight: 600 }}>{last}</span>
    </span>
  );
}

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setIsDesktop(window.innerWidth >= 1100);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (isDesktop) setMobileMenuOpen(false);
  }, [isDesktop]);

  if (!isDesktop) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.sans }}>
        <div style={{ background: T.bg, borderBottom: `1.5px solid ${T.ink}`, padding: `calc(12px + env(safe-area-inset-top, 0px)) 16px 12px`, position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, position: "relative" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 }}>
                — Attending
              </div>
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <SerifHeading text={heading} size={20} />
              </div>
              <div style={{ color: T.sub, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 4 }}>
                {subheading}
                {rotationCode && (
                  <span style={{ marginLeft: 8, fontFamily: T.mono, fontSize: 11, color: T.muted, letterSpacing: 0.8, textTransform: "uppercase" }}>
                    CODE · {rotationCode}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-expanded={mobileMenuOpen}
              aria-label="Admin actions"
              style={{ width: 38, height: 38, borderRadius: 0, border: `1px solid ${T.line}`, background: T.bg, color: T.ink, fontSize: 20, lineHeight: 1, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Icon as={MoreHorizontal} size={20} color={T.ink} />
            </button>
            {mobileMenuOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, width: 220, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 0, padding: 10, boxShadow: "0 18px 42px rgba(0,0,0,0.18)", zIndex: 120 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 6px", color: T.ink, fontSize: 13, fontWeight: 700 }}>
                  <span>Theme</span>
                  {themeToggle}
                </div>
                {onExit && (
                  <button onClick={() => { setMobileMenuOpen(false); onExit(); }} style={{ width: "100%", padding: "10px 10px", background: "none", border: "none", color: T.ink, borderRadius: 0, textAlign: "left", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    Student App
                  </button>
                )}
                <button onClick={() => { setMobileMenuOpen(false); onLock(); }} style={{ width: "100%", padding: "10px 10px", background: "none", border: "none", color: T.ink, borderRadius: 0, textAlign: "left", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Lock Panel
                </button>
                <button onClick={() => { setMobileMenuOpen(false); onSignOut(); }} style={{ width: "100%", padding: "10px 10px", background: "none", border: "none", color: T.brand, borderRadius: 0, textAlign: "left", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="tab-content-enter" key={contentKey} style={{ padding: `0 0 ${T.navH + T.navPad}px` }}>
          {children}
        </div>
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: T.bg, borderTop: `1.5px solid ${T.ink}`, display: "flex", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {tabs.map((tab, i) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.id)}
                style={{
                  flex: 1,
                  padding: "10px 0 12px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  color: active ? T.brand : T.ink,
                  borderTop: active ? `1.5px solid ${T.brand}` : "1.5px solid transparent",
                }}
              >
                <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: 0.8, color: active ? T.brand : T.muted }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.sans }}>
      <div style={{ display: "grid", gridTemplateColumns: "260px minmax(0, 1fr)", minHeight: "100vh" }}>
        <aside style={{ background: T.bg, color: T.ink, padding: "28px 18px 18px", position: "sticky", top: 0, height: "100vh", boxSizing: "border-box", borderRight: `1px solid ${T.line}`, display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>
              — Attending
            </div>
            <div style={{ marginBottom: 10 }}>
              <SerifHeading text={heading} size={24} />
            </div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>{subheading}</div>
            {rotationCode && (
              <div style={{ marginTop: 14, fontFamily: T.mono, fontSize: 12, color: T.muted, letterSpacing: 1, textTransform: "uppercase" }}>
                CODE · {rotationCode}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 2 }}>
            {tabs.map((tab, i) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onNavigate(tab.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    alignItems: "baseline",
                    gap: 12,
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 0,
                    border: "none",
                    borderLeft: active ? `1.5px solid ${T.brand}` : "1.5px solid transparent",
                    background: "transparent",
                    color: active ? T.ink : T.sub,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: active ? T.brand : T.muted, letterSpacing: 0.8 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: active ? 700 : 600 }}>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: "auto", display: "grid", gap: 6, paddingTop: 24, borderTop: `1px solid ${T.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 4px", color: T.sub, fontSize: 12, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: 0.8 }}>
              <span>Theme</span>
              {themeToggle}
            </div>
            {onExit && (
              <button onClick={onExit} style={{ width: "100%", padding: "8px 4px", background: "none", border: "none", color: T.sub, borderRadius: 0, fontSize: 13, cursor: "pointer", textAlign: "left" }}>
                ← Student App
              </button>
            )}
            <button onClick={onLock} style={{ width: "100%", padding: "8px 4px", background: "none", border: "none", color: T.sub, borderRadius: 0, fontSize: 13, cursor: "pointer", textAlign: "left" }}>
              Lock Panel
            </button>
            <button onClick={onSignOut} style={{ width: "100%", padding: "8px 4px", background: "none", border: "none", color: T.brand, borderRadius: 0, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
              Sign Out
            </button>
          </div>
        </aside>

        <main style={{ minWidth: 0 }}>
          <div style={{ position: "sticky", top: 0, zIndex: 90, background: T.bg, borderBottom: `1.5px solid ${T.ink}`, padding: "20px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>
                  — Workspace
                </div>
                <SerifHeading text={heading} size={28} />
                <div style={{ fontSize: 13, color: T.sub, marginTop: 6 }}>{subheading}</div>
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
