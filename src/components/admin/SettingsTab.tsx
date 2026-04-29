import React, { useEffect, useRef, useState } from "react";
import { T } from "../../data/constants";
import { createRotationCode } from "../../utils/helpers";
import store, { RotationInfo } from "../../utils/store";
import { isBootstrapAdminEmail, type AdminInviteRecord } from "../../utils/firebase";
import type { AdminSubView, Announcement, SharedSettings } from "../../types";
import type { ArticlesData, AdminSession, WeeklyData } from "./types";
import { adminInput, adminLabel, type AdminConfirmOptions, type AdminToastTone } from "./shared";
import { setStoredAdminRotationCode } from "./storage";

function SettingsSection({
  sectionRef,
  title,
  description,
  children,
}: {
  sectionRef?: React.RefObject<HTMLDivElement | null>;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div ref={sectionRef} style={{ background: T.card, borderRadius: 16, padding: 18, border: `1px solid ${T.line}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 18, margin: 0, fontWeight: 700 }}>{title}</h3>
          {description && <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.6, marginTop: 4 }}>{description}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

export function SettingsTab({
  settings,
  setSettings,
  rotationCode,
  setRotationCodeState,
  curriculum,
  articles,
  announcements,
  setCurriculum,
  setArticles,
  setAnnouncements,
  firebaseAdmin,
  adminInvites,
  adminInvitesLoading,
  inviteEmail,
  setInviteEmail,
  inviteSubmitting,
  inviteError,
  inviteSuccess,
  onInviteAdmin,
  showToast,
  requestConfirm,
  onOpenContent,
  focusSection,
}: {
  settings: SharedSettings;
  setSettings: React.Dispatch<React.SetStateAction<SharedSettings>>;
  rotationCode: string;
  setRotationCodeState: React.Dispatch<React.SetStateAction<string>>;
  curriculum: WeeklyData;
  articles: ArticlesData;
  announcements: Announcement[];
  setCurriculum: React.Dispatch<React.SetStateAction<WeeklyData>>;
  setArticles: React.Dispatch<React.SetStateAction<ArticlesData>>;
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
  firebaseAdmin: AdminSession;
  adminInvites: AdminInviteRecord[];
  adminInvitesLoading: boolean;
  inviteEmail: string;
  setInviteEmail: React.Dispatch<React.SetStateAction<string>>;
  inviteSubmitting: boolean;
  inviteError: string;
  inviteSuccess: string;
  onInviteAdmin: () => Promise<void>;
  showToast: (message: string, tone?: AdminToastTone) => void;
  requestConfirm: (options: AdminConfirmOptions) => Promise<boolean>;
  onOpenContent: (subView?: AdminSubView) => void;
  focusSection?: "rotation";
}) {
  const showRotation = focusSection === "rotation";
  const showOtherSections = !focusSection;
  const [creating, setCreating] = useState(false);
  const [rejoinCode, setRejoinCode] = useState("");
  const [rejoinError, setRejoinError] = useState("");
  const [rejoining, setRejoining] = useState(false);
  const [rotationHistory, setRotationHistory] = useState<RotationInfo[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [newDates, setNewDates] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newCustomCode, setNewCustomCode] = useState("");
  const [selectedRotationCode, setSelectedRotationCode] = useState<string>("");

  const selectedRotation = rotationHistory.find((r) => r.code === selectedRotationCode) || null;

  const rotationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const securityRef = useRef<HTMLDivElement>(null);
  const adminAccessRef = useRef<HTMLDivElement>(null);

  const update = (key: string, val: string) => setSettings((prev) => ({ ...prev, [key]: val }));

  const refreshRotationHistory = async () => {
    setHistoryLoading(true);
    const list = await store.listRotations();
    setRotationHistory(list);
    setHistoryLoading(false);
    // Default the dropdown to the active rotation, falling back to the newest.
    setSelectedRotationCode((prev) => {
      if (prev && list.some((r) => r.code === prev)) return prev;
      if (rotationCode && list.some((r) => r.code === rotationCode)) return rotationCode;
      return list[0]?.code || "";
    });
  };

  useEffect(() => {
    void refreshRotationHistory();
  }, [rotationCode]);

  const handleCreateRotation = async () => {
    setCreating(true);
    try {
      let code = newCustomCode.trim().toUpperCase() || createRotationCode(newLocation, newDates);
      const exists = await store.validateRotationCode(code);
      if (exists) {
        const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
        code = `${code}-${suffix}`;
      }
      const updatedSettings = { ...settings, duration: settings.duration || "4" };
      const { adminPin: _pin, ...sharedSettings } = updatedSettings;
      await store.createRotation(code, {
        name: updatedSettings.attendingName || "Nephrology Rotation",
        settings: sharedSettings,
        curriculum,
        articles,
        announcements,
        dates: newDates,
        location: newLocation,
      }, firebaseAdmin);
      setStoredAdminRotationCode(firebaseAdmin.uid, code);
      setRotationCodeState(code);
      setNewDates("");
      setNewLocation("");
      setNewCustomCode("");
      await refreshRotationHistory();
      showToast(`Rotation ${code} created. Students can join with this code.`, "success");
    } catch (error) {
      console.error("Create rotation error:", error);
      showToast("Could not create the rotation. Check admin access and try again.", "error");
    }
    setCreating(false);
  };

  const handleDeleteRotation = async (code: string) => {
    const confirmed = await requestConfirm({
      title: `Delete ${code}?`,
      message: "This permanently deletes the rotation and all student data inside it.",
      confirmLabel: "Delete Rotation",
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      await store.deleteRotation(code);
      setRotationHistory((prev) => prev.filter((rotation) => rotation.code !== code));
      if (rotationCode === code) {
        setStoredAdminRotationCode(firebaseAdmin.uid, null);
        setRotationCodeState("");
      }
      showToast(`Rotation ${code} deleted.`, "success");
    } catch (error) {
      console.error("Delete rotation failed:", error);
      showToast("Failed to delete the rotation. Please try again.", "error");
    }
  };

  const handleConnectRotation = async (code: string) => {
    try {
      await store.ensureRotationOwnership(code, firebaseAdmin);
      const remote = await store.getRotationData(code);
      if (!remote) {
        showToast("Could not read the rotation. Check your connection and try again.", "error");
        return;
      }
      if (remote.curriculum) setCurriculum(remote.curriculum);
      if (remote.articles) setArticles(remote.articles);
      if (remote.announcements) setAnnouncements(remote.announcements);
      if (remote.settings) setSettings((prev) => ({ ...prev, ...remote.settings }));
      store.setRotationCode(code);
      setStoredAdminRotationCode(firebaseAdmin.uid, code);
      setRotationCodeState(code);
      showToast(`Connected to rotation ${code}.`, "success");
    } catch (error) {
      console.error("Connect rotation failed:", error);
      showToast("You do not have access to that rotation, or it could not be opened.", "error");
    }
  };

  const handleUpdateRotationField = async (code: string, field: string, value: string) => {
    await store.updateRotation(code, { [field]: value });
    setRotationHistory((prev) => prev.map((rotation) => rotation.code === code ? { ...rotation, [field]: value } : rotation));
  };

  const handleDisconnect = () => {
    store.setRotationCode(null);
    setStoredAdminRotationCode(firebaseAdmin.uid, null);
    setRotationCodeState("");
    showToast("Disconnected from the current rotation.", "info");
  };

  const handleRejoin = async () => {
    if (rejoinCode.length < 4) return;
    setRejoining(true);
    setRejoinError("");
    try {
      await store.ensureRotationOwnership(rejoinCode, firebaseAdmin);
      const remote = await store.getRotationData(rejoinCode);
      if (!remote) {
        setRejoinError("Rotation not found. Check the code.");
        setRejoining(false);
        return;
      }
      if (remote.curriculum) setCurriculum(remote.curriculum);
      if (remote.articles) setArticles(remote.articles);
      if (remote.announcements) setAnnouncements(remote.announcements);
      if (remote.settings) setSettings((prev) => ({ ...prev, ...remote.settings }));
      store.setRotationCode(rejoinCode);
      setStoredAdminRotationCode(firebaseAdmin.uid, rejoinCode);
      setRotationCodeState(rejoinCode);
      setRejoinCode("");
      showToast(`Connected to rotation ${rejoinCode}.`, "success");
    } catch (error) {
      console.error("Rejoin rotation failed:", error);
      setRejoinError("You do not have access to that rotation, or the code is invalid.");
    }
    setRejoining(false);
  };

  const openInviteMailto = (inviteeEmail: string) => {
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
    const fromName = settings.attendingName?.trim() || firebaseAdmin.email || "the nephrology rotation team";
    const subject = "You've been added as a nephrology rotation admin";
    const body = [
      `Hi,`,
      ``,
      `${fromName} has invited you to be an admin on the Nephrology Rotation Helper.`,
      ``,
      `To claim your account:`,
      `  1. Open ${siteUrl || "the rotation site"}`,
      `  2. On the student login screen, click "Admin Login" at the bottom right`,
      `  3. Choose "Create Account"`,
      `  4. Sign in with this email (${inviteeEmail}) and pick your own password`,
      ``,
      `Once you're in, Settings → Rotation Workspace lets you create your own rotation codes.`,
      ``,
      `— ${fromName}`,
    ].join("\n");
    const href = `mailto:${encodeURIComponent(inviteeEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (typeof window !== "undefined") window.location.href = href;
  };

  const jumpTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const masterAdmin = isBootstrapAdminEmail(firebaseAdmin.email || "");
  const sectionButtons = focusSection === "rotation"
    ? []
    : [
        { label: "Profile", ref: profileRef },
        { label: "Content", ref: contentRef },
        { label: "Security", ref: securityRef },
        ...(masterAdmin ? [{ label: "Admin Access", ref: adminAccessRef }] : []),
      ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {sectionButtons.length > 0 && (
        <div style={{ background: T.card, borderRadius: 16, padding: 16, border: `1px solid ${T.line}`, position: "sticky", top: 84, zIndex: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Jump To</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {sectionButtons.map((section) => (
              <button key={section.label} onClick={() => jumpTo(section.ref)} style={{ padding: "8px 12px", borderRadius: 999, border: `1px solid ${T.line}`, background: T.bg, color: T.navy, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {section.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showRotation && (
      <SettingsSection sectionRef={rotationRef} title="Rotation Workspace" description="Create a new rotation, reconnect to an existing one, and manage the learner roster tied to each code.">
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: `linear-gradient(135deg, ${T.navyBg}, ${T.deepBg})`, borderRadius: 16, padding: 20, color: "white" }}>
            <h4 style={{ fontFamily: T.serif, color: "white", fontSize: 18, margin: "0 0 12px", fontWeight: 700 }}>Rotation Code</h4>
            {rotationCode ? (
              <div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Share this code with students to join:</div>
                <div style={{ fontSize: 32, fontFamily: T.mono, fontWeight: 700, letterSpacing: 4, textAlign: "center", background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "14px 0", marginBottom: 12 }}>
                  {rotationCode}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: 12 }}>Students enter this code after setting their name to sync data in real time.</div>
                <button onClick={handleDisconnect} style={{ width: "100%", padding: "10px 0", background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 700 }}>
                  Disconnect from Rotation
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.68)", marginBottom: 12, lineHeight: 1.5 }}>
                  Create a rotation to sync student data in real time. Students will enter the generated code to join.
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600, display: "block", marginBottom: 4 }}>Rotation Dates (optional)</label>
                  <input value={newDates} onChange={(event) => setNewDates(event.target.value)} placeholder="e.g. Mar 1–28, 2026" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "white", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600, display: "block", marginBottom: 4 }}>Location (optional)</label>
                    <input value={newLocation} onChange={(event) => setNewLocation(event.target.value)} placeholder="e.g. Good Samaritan" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "white", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600, display: "block", marginBottom: 4 }}>Duration</label>
                    <select value={settings.duration || "4"} onChange={(event) => update("duration", event.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "white", fontSize: 13, outline: "none", boxSizing: "border-box", appearance: "none" }}>
                      <option value="1" style={{ color: "#000" }}>1 week</option>
                      <option value="2" style={{ color: "#000" }}>2 weeks</option>
                      <option value="3" style={{ color: "#000" }}>3 weeks</option>
                      <option value="4" style={{ color: "#000" }}>4 weeks</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600, display: "block", marginBottom: 4 }}>Custom Code (optional)</label>
                  <input value={newCustomCode} onChange={(event) => setNewCustomCode(event.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, ""))} placeholder="e.g. TEST or GS-APR26" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "white", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: T.mono, letterSpacing: 2 }} />
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>If blank, the code is auto-generated from location and dates.</div>
                </div>
                <button onClick={handleCreateRotation} disabled={creating} style={{ width: "100%", padding: "14px 0", background: T.warning, color: T.warningInk, border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: creating ? "wait" : "pointer", opacity: creating ? 0.7 : 1, marginBottom: 16 }}>
                  {creating ? "Creating..." : "Create New Rotation"}
                </button>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 14 }}>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 8, fontWeight: 600 }}>Or reconnect to an existing rotation:</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={rejoinCode}
                      onChange={(event) => { setRejoinCode(event.target.value.toUpperCase()); setRejoinError(""); }}
                      onKeyDown={(event) => { if (event.key === "Enter") void handleRejoin(); }}
                      placeholder="e.g. CMC-MAR26"
                      style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: `1px solid ${rejoinError ? T.danger : "rgba(255,255,255,0.2)"}`, background: "rgba(255,255,255,0.1)", color: "white", fontSize: 14, fontFamily: T.mono, letterSpacing: 2, textAlign: "center", outline: "none", boxSizing: "border-box" }}
                    />
                    <button onClick={() => { void handleRejoin(); }} disabled={rejoining || rejoinCode.length < 4} style={{ padding: "10px 18px", background: rejoinCode.length >= 4 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)", color: rejoinCode.length >= 4 ? "white" : "rgba(255,255,255,0.35)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: rejoinCode.length >= 4 ? "pointer" : "default" }}>
                      {rejoining ? "..." : "Join"}
                    </button>
                  </div>
                  {rejoinError && <div style={{ color: T.danger, fontSize: 13, marginTop: 6 }}>{rejoinError}</div>}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {isBootstrapAdminEmail(firebaseAdmin.email || "") ? "All Rotations" : "Your Rotations"}
              </div>
              {isBootstrapAdminEmail(firebaseAdmin.email || "") && (
                <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>Master admin — viewing every admin's rotations</div>
              )}
            </div>
            {historyLoading ? (
              <div style={{ textAlign: "center", color: T.muted, fontSize: 13, padding: 16 }}>Loading rotations...</div>
            ) : rotationHistory.length === 0 ? (
              <div style={{ textAlign: "center", color: T.muted, fontSize: 13, padding: 16, background: T.bg, borderRadius: 12, border: `1px solid ${T.line}` }}>No rotations created yet.</div>
            ) : (
              <>
                <select
                  value={selectedRotationCode}
                  onChange={(event) => setSelectedRotationCode(event.target.value)}
                  style={{ ...adminInput, fontFamily: T.mono, letterSpacing: 1, fontWeight: 600 }}
                >
                  {rotationHistory.map((rotation) => {
                    const isActive = rotation.code === rotationCode;
                    const ownerTag = rotation.ownerEmail ? ` — ${rotation.ownerEmail}` : "";
                    return (
                      <option key={rotation.code} value={rotation.code}>
                        {rotation.code}{isActive ? " (active)" : ""}{ownerTag}
                      </option>
                    );
                  })}
                </select>

                {selectedRotation && (
                  <div style={{ background: rotationCode === selectedRotation.code ? T.ice : T.bg, borderRadius: 14, padding: 14, border: rotationCode === selectedRotation.code ? `2px solid ${T.brand}` : `1px solid ${T.line}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                      <div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 16, color: T.navy, letterSpacing: 2 }}>{selectedRotation.code}</div>
                      {rotationCode === selectedRotation.code && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.success, background: T.successBg, border: `1px solid ${T.success}`, padding: "3px 8px", borderRadius: 6, textTransform: "uppercase" }}>Active</span>
                      )}
                    </div>
                    <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, color: T.muted, minWidth: 62 }}>Owner:</span>
                        <span style={{ fontSize: 13, color: T.text }}>{selectedRotation.ownerEmail || <span style={{ color: T.muted, fontStyle: "italic" }}>Legacy rotation (no owner recorded)</span>}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, color: T.muted, minWidth: 62 }}>Dates:</span>
                        <input value={selectedRotation.dates || ""} onChange={(event) => { const value = event.target.value; setRotationHistory((prev) => prev.map((item) => item.code === selectedRotation.code ? { ...item, dates: value } : item)); }} onBlur={(event) => { void handleUpdateRotationField(selectedRotation.code, "dates", event.target.value); }} placeholder="e.g. Mar 1–28, 2026" style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.line}`, fontSize: 13, color: T.text, background: T.card, outline: "none" }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, color: T.muted, minWidth: 62 }}>Location:</span>
                        <input value={selectedRotation.location || ""} onChange={(event) => { const value = event.target.value; setRotationHistory((prev) => prev.map((item) => item.code === selectedRotation.code ? { ...item, location: value } : item)); }} onBlur={(event) => { void handleUpdateRotationField(selectedRotation.code, "location", event.target.value); }} placeholder="e.g. City Medical Center" style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.line}`, fontSize: 13, color: T.text, background: T.card, outline: "none" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.muted, marginBottom: 10, flexWrap: "wrap" }}>
                      <span>👥 {selectedRotation.studentCount} student{selectedRotation.studentCount !== 1 ? "s" : ""}</span>
                      {selectedRotation.createdAt && <span>• Created {new Date(selectedRotation.createdAt).toLocaleDateString()}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {rotationCode !== selectedRotation.code && (
                        <button onClick={() => { void handleConnectRotation(selectedRotation.code); }} style={{ flex: 1, padding: "8px 0", background: T.brand, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                          Connect
                        </button>
                      )}
                      <button onClick={() => { void handleDeleteRotation(selectedRotation.code); }} style={{ flex: rotationCode === selectedRotation.code ? 1 : 0, minWidth: rotationCode === selectedRotation.code ? 0 : 88, padding: "8px 12px", background: T.dangerBg, color: T.danger, border: `1px solid ${T.danger}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </SettingsSection>
      )}

      {showOtherSections && (
      <SettingsSection sectionRef={profileRef} title="Profile" description="Update the identity and schedule details students see across this rotation.">
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <h4 style={{ color: T.navy, fontSize: 15, margin: "0 0 12px", fontFamily: T.serif, fontWeight: 700 }}>Rotation Schedule</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={adminLabel}>Start Date</label>
                <input type="date" value={settings.rotationStart || ""} onChange={(event) => update("rotationStart", event.target.value)} style={adminInput} />
              </div>
              <div>
                <label style={adminLabel}>Duration</label>
                <select value={settings.duration || "4"} onChange={(event) => update("duration", event.target.value)} style={{ ...adminInput, appearance: "none" }}>
                  <option value="1">1 week</option>
                  <option value="2">2 weeks</option>
                  <option value="3">3 weeks</option>
                  <option value="4">4 weeks</option>
                </select>
              </div>
            </div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 8 }}>Sets the current week indicator for students. All content remains accessible regardless of duration.</div>
          </div>

          <div>
            <h4 style={{ color: T.navy, fontSize: 15, margin: "0 0 12px", fontFamily: T.serif, fontWeight: 700 }}>Attending Information</h4>
            <div style={{ marginBottom: 12 }}>
              <label style={adminLabel}>Your Name</label>
              <input value={settings.attendingName || ""} onChange={(event) => update("attendingName", event.target.value)} placeholder="Dr. Smith" style={adminInput} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={adminLabel}>Email</label>
                <input value={settings.email || ""} onChange={(event) => update("email", event.target.value)} placeholder="you@hospital.edu" style={adminInput} />
              </div>
              <div>
                <label style={adminLabel}>Phone</label>
                <input value={settings.phone || ""} onChange={(event) => update("phone", event.target.value)} placeholder="(555) 123-4567" style={adminInput} />
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>
      )}

      {showOtherSections && (
      <SettingsSection sectionRef={contentRef} title="Curriculum & Content" description="Edit the weekly curriculum, articles, announcements, and clinic guides students see. You only need this between rotations.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <button
            type="button"
            onClick={() => onOpenContent()}
            style={{ padding: "14px 16px", background: T.brand, color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "left" }}
          >
            📝 Open content editor
            <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.82, marginTop: 3 }}>Curriculum, articles, announcements, guides</div>
          </button>
          <button
            type="button"
            onClick={() => onOpenContent({ type: "editCurriculum" })}
            style={{ padding: "14px 16px", background: T.bg, color: T.text, border: `1px solid ${T.line}`, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "left" }}
          >
            📚 Edit curriculum
            <div style={{ fontSize: 12, fontWeight: 500, color: T.muted, marginTop: 3 }}>Module topics and lesson plans</div>
          </button>
          <button
            type="button"
            onClick={() => onOpenContent({ type: "announcements" })}
            style={{ padding: "14px 16px", background: T.bg, color: T.text, border: `1px solid ${T.line}`, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "left" }}
          >
            📣 Announcements
            <div style={{ fontSize: 12, fontWeight: 500, color: T.muted, marginTop: 3 }}>Post banners to the student app</div>
          </button>
          <button
            type="button"
            onClick={() => onOpenContent({ type: "clinicGuides" })}
            style={{ padding: "14px 16px", background: T.bg, color: T.text, border: `1px solid ${T.line}`, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "left" }}
          >
            🩺 Clinic guides
            <div style={{ fontSize: 12, fontWeight: 500, color: T.muted, marginTop: 3 }}>Custom per-rotation guidance</div>
          </button>
        </div>
      </SettingsSection>
      )}

      {showOtherSections && (
      <SettingsSection sectionRef={securityRef} title="Security" description="Keep the shared panel protected on any device used during rounds or teaching.">
        <div>
          <label style={adminLabel}>Admin PIN</label>
          <input type="password" value={settings.adminPin || ""} onChange={(event) => update("adminPin", event.target.value)} placeholder="Choose a private PIN" style={adminInput} />
          <div style={{ fontSize: 13, color: T.muted, marginTop: 6 }}>Choose a private PIN and avoid sharing it with students. Right now the PIN is still local to this browser.</div>
        </div>
      </SettingsSection>
      )}

      {showOtherSections && isBootstrapAdminEmail(firebaseAdmin.email || "") && (
      <SettingsSection sectionRef={adminAccessRef} title="Admin Access" description="Invite another attending or educator to create their own admin sign-in and manage their own rotations.">
        <div style={{ background: T.bg, borderRadius: 12, padding: 12, border: `1px solid ${T.line}`, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Signed In Account</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{firebaseAdmin.email || "Admin account"}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 8 }}>
          <input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && inviteEmail.trim()) void onInviteAdmin(); }} placeholder="colleague@hospital.edu" style={adminInput} />
          <button onClick={() => { void onInviteAdmin(); }} disabled={!inviteEmail.trim() || inviteSubmitting} style={{ padding: "0 16px", background: !inviteEmail.trim() || inviteSubmitting ? T.muted : T.brand, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: !inviteEmail.trim() || inviteSubmitting ? "default" : "pointer", opacity: !inviteEmail.trim() || inviteSubmitting ? 0.7 : 1 }}>
            {inviteSubmitting ? "Adding..." : "Add Admin"}
          </button>
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: inviteError || inviteSuccess ? 8 : 14 }}>They will use this email on the admin sign-in screen and choose <strong>Create Account</strong>.</div>
        {inviteError && <div style={{ fontSize: 13, color: T.danger, background: T.dangerBg, borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>{inviteError}</div>}
        {inviteSuccess && <div style={{ fontSize: 13, color: T.success, background: T.successBg, borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>{inviteSuccess}</div>}

        <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Invite History</div>
        {adminInvitesLoading ? (
          <div style={{ fontSize: 13, color: T.muted }}>Loading invites…</div>
        ) : adminInvites.length === 0 ? (
          <div style={{ fontSize: 13, color: T.muted, fontStyle: "italic" }}>No invited admins yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {adminInvites.map((invite) => (
              <div key={invite.email} style={{ background: T.bg, borderRadius: 12, padding: 12, border: `1px solid ${T.line}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{invite.email}</div>
                    <div style={{ fontSize: 13, color: T.muted, marginTop: 3 }}>Added {invite.createdAt ? new Date(invite.createdAt).toLocaleString() : "recently"}</div>
                  </div>
                  <span style={{ background: invite.status === "claimed" ? T.successBg : T.warningBg, color: invite.status === "claimed" ? T.success : T.warning, borderRadius: 999, padding: "4px 10px", fontSize: 13, fontWeight: 700 }}>
                    {invite.status === "claimed" ? "Account created" : "Pending"}
                  </span>
                </div>
                {invite.claimedAt && (
                  <div style={{ fontSize: 13, color: T.sub, marginTop: 8 }}>Claimed {new Date(invite.claimedAt).toLocaleString()}</div>
                )}
                {invite.status !== "claimed" && (
                  <button
                    type="button"
                    onClick={() => openInviteMailto(invite.email)}
                    style={{ marginTop: 10, padding: "8px 14px", background: T.brand, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >
                    ✉ Send invite email
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </SettingsSection>
      )}

    </div>
  );
}
