import React, { useEffect, useMemo, useRef, useState } from "react";
import { T } from "../../data/constants";
import type { ClinicGuideTemplates } from "../../data/clinicGuides";
import { createRotationCode } from "../../utils/helpers";
import { normalizeClinicGuideTemplates } from "../../utils/clinicGuideTemplates";
import { normalizeStudySheets, type StudySheetsData } from "../../utils/studySheets";
import store, { RotationInfo } from "../../utils/store";
import { isBootstrapAdminEmail, type AdminInviteRecord } from "../../utils/firebase";
import type { AdminSubView, Announcement, ClinicGuideRecord, SharedSettings } from "../../types";
import type { ArticlesData, AdminSession, WeeklyData } from "./types";
import { adminInput, adminLabel, type AdminConfirmOptions, type AdminToastTone } from "./shared";
import { buildRotationDeleteConfirm, canManageRotation } from "./lib/rotation-access";
import { setStoredAdminRotationCode } from "./storage";
import { getAdminPinValidationError } from "./pinValidation";
import { Button } from "./ui/Button";

function useActiveSectionId(ids: string[]): string {
  const [activeId, setActiveId] = useState<string>(ids[0] || "");
  useEffect(() => {
    if (typeof window === "undefined" || ids.length === 0) return undefined;
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return undefined;
    const visibility = new Map<string, number>(elements.map((el) => [el.id, 0]));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visibility.set(entry.target.id, entry.intersectionRatio);
        });
        let bestId = ids[0];
        let bestRatio = -1;
        ids.forEach((id) => {
          const ratio = visibility.get(id) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });
        setActiveId(bestId);
      },
      { rootMargin: "-120px 0px -55% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids.join("|")]);
  return activeId;
}

function SettingsSection({
  sectionRef,
  sectionId,
  title,
  description,
  children,
}: {
  sectionRef?: React.RefObject<HTMLDivElement | null>;
  sectionId?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div ref={sectionRef} id={sectionId} style={{ background: T.card, borderRadius: 16, padding: 18, border: `1px solid ${T.line}`, scrollMarginTop: 96 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <h3 style={{ fontFamily: T.serif, color: T.ink, fontSize: 18, margin: 0, fontWeight: 700 }}>{title}</h3>
          {description && <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.6, marginTop: 4 }}>{description}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

function RotationRecordCard({
  rotation,
  active,
  note,
  canManage = true,
  onConnect,
  onDelete,
  onDraftFieldChange,
  onCommitField,
}: {
  rotation: RotationInfo;
  active?: boolean;
  note?: string;
  // When false, this rotation belongs to another attending: destructive field
  // edits and Delete are hidden so a master admin can view but not mutate it.
  canManage?: boolean;
  onConnect?: () => void;
  onDelete?: () => void;
  onDraftFieldChange: (field: "dates" | "location", value: string) => void;
  onCommitField: (field: "dates" | "location", value: string) => void;
}) {
  const readOnly = !canManage;
  const fieldStyle: React.CSSProperties = {
    flex: 1,
    padding: "6px 10px",
    borderRadius: 6,
    border: `1px solid ${T.line}`,
    fontSize: 13,
    color: readOnly ? T.muted : T.ink,
    background: readOnly ? T.bg : T.card,
  };
  const showDelete = Boolean(onDelete) && canManage;
  return (
    <div style={{ background: active ? T.surface2 : T.bg, borderRadius: 14, padding: 14, border: active ? `2px solid ${T.brand}` : `1px solid ${T.line}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 16, color: T.ink, letterSpacing: 2 }}>{rotation.code}</div>
        {active ? (
          <span style={{ fontSize: 13, fontWeight: 700, color: T.success, background: T.successBg, border: `1px solid ${T.success}`, padding: "3px 8px", borderRadius: 6, textTransform: "uppercase" }}>Active</span>
        ) : readOnly ? (
          <span style={{ fontSize: 13, fontWeight: 700, color: T.muted, background: T.bg, border: `1px solid ${T.line}`, padding: "3px 8px", borderRadius: 6, textTransform: "uppercase" }}>Read-only</span>
        ) : null}
      </div>
      {note && <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginBottom: 10 }}>{note}</div>}
      <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, color: T.muted, minWidth: 62 }}>Owner:</span>
          <span style={{ fontSize: 13, color: T.ink }}>{rotation.ownerEmail || <span style={{ color: T.muted, fontStyle: "italic" }}>Legacy rotation (no owner recorded)</span>}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, color: T.muted, minWidth: 62 }}>Dates:</span>
          <input
            value={rotation.dates || ""}
            onChange={(event) => onDraftFieldChange("dates", event.target.value)}
            onBlur={(event) => onCommitField("dates", event.target.value)}
            placeholder="e.g. Mar 1-28, 2026"
            readOnly={readOnly}
            style={fieldStyle}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, color: T.muted, minWidth: 62 }}>Location:</span>
          <input
            value={rotation.location || ""}
            onChange={(event) => onDraftFieldChange("location", event.target.value)}
            onBlur={(event) => onCommitField("location", event.target.value)}
            placeholder="e.g. City Medical Center"
            readOnly={readOnly}
            style={fieldStyle}
          />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.muted, marginBottom: onConnect || showDelete ? 10 : 0, flexWrap: "wrap" }}>
        <span>{rotation.studentCount} student{rotation.studentCount !== 1 ? "s" : ""}</span>
        {rotation.createdAt && <span>Created {new Date(rotation.createdAt).toLocaleDateString()}</span>}
      </div>
      {(onConnect || showDelete) && (
        <div style={{ display: "flex", gap: 8 }}>
          {onConnect && (
            <button onClick={onConnect} style={{ flex: 1, padding: "8px 0", background: T.brand, color: T.brandInk, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Connect
            </button>
          )}
          {showDelete && (
            <button onClick={onDelete} style={{ minWidth: 88, padding: "8px 12px", background: T.dangerBg, color: T.danger, border: `1px solid ${T.danger}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Delete
            </button>
          )}
        </div>
      )}
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
  studySheets,
  announcements,
  clinicGuideTemplates,
  setClinicGuideTemplates,
  setClinicGuides,
  setCurriculum,
  setArticles,
  setStudySheets,
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
  onSharedDataLoaded,
  connectRotation,
  focusSection,
}: {
  settings: SharedSettings;
  setSettings: React.Dispatch<React.SetStateAction<SharedSettings>>;
  rotationCode: string;
  setRotationCodeState: React.Dispatch<React.SetStateAction<string>>;
  curriculum: WeeklyData;
  articles: ArticlesData;
  studySheets: StudySheetsData;
  announcements: Announcement[];
  clinicGuideTemplates: ClinicGuideTemplates;
  setClinicGuideTemplates: React.Dispatch<React.SetStateAction<ClinicGuideTemplates>>;
  setClinicGuides: React.Dispatch<React.SetStateAction<ClinicGuideRecord[]>>;
  setCurriculum: React.Dispatch<React.SetStateAction<WeeklyData>>;
  setArticles: React.Dispatch<React.SetStateAction<ArticlesData>>;
  setStudySheets: React.Dispatch<React.SetStateAction<StudySheetsData>>;
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
  onSharedDataLoaded: () => void;
  connectRotation: (code: string) => Promise<boolean>;
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
  const [pinChangeOpen, setPinChangeOpen] = useState(false);
  const [pinCurrent, setPinCurrent] = useState("");
  const [pinNext, setPinNext] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinChangeError, setPinChangeError] = useState("");
  const [pinChangeSuccess, setPinChangeSuccess] = useState("");

  const activeRotation = rotationCode ? rotationHistory.find((r) => r.code === rotationCode) || null : null;
  const selectableRotations = rotationCode ? rotationHistory.filter((r) => r.code !== rotationCode) : rotationHistory;
  const selectedRotation = selectableRotations.find((r) => r.code === selectedRotationCode) || null;
  const activeAdminPin = (settings.adminPin || "").trim();
  const hasAdminPin = activeAdminPin.length > 0;

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
    // Keep the selector focused on rotations that are not already active.
    setSelectedRotationCode((prev) => {
      const selectable = rotationCode ? list.filter((r) => r.code !== rotationCode) : list;
      if (prev && selectable.some((r) => r.code === prev)) return prev;
      return selectable[0]?.code || "";
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
        studySheets: normalizeStudySheets(studySheets),
        announcements,
        clinicGuideTemplates,
        dates: newDates,
        location: newLocation,
      }, firebaseAdmin);
      setStoredAdminRotationCode(firebaseAdmin.uid, code);
      setRotationCodeState(code);
      setClinicGuides([]);
      setNewDates("");
      setNewLocation("");
      setNewCustomCode("");
      onSharedDataLoaded();
      await refreshRotationHistory();
      showToast(`Rotation ${code} created. Students can join with this code.`, "success");
    } catch (error) {
      console.error("Create rotation error:", error);
      showToast("Could not create the rotation. Check admin access and try again.", "error");
    }
    setCreating(false);
  };

  const handleDeleteRotation = async (code: string) => {
    const target = rotationHistory.find((rotation) => rotation.code === code);
    // Guard against deleting another attending's rotation even if a Delete
    // control somehow reached this handler.
    if (target && !canManageRotation(target, { uid: firebaseAdmin.uid, email: firebaseAdmin.email || "" })) {
      showToast("This rotation belongs to another attending and is read-only.", "error");
      return;
    }
    const confirmed = await requestConfirm(
      target
        ? buildRotationDeleteConfirm(target)
        : {
            title: `Delete ${code}?`,
            message: "This permanently deletes the rotation and all student data inside it. This cannot be undone.",
            confirmLabel: "Delete Rotation",
            tone: "danger",
          },
    );
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

  // Connect logic lives in AdminPanel (shared with the no-rotation banner);
  // this and handleRejoin are thin wrappers around it.
  const handleConnectRotation = async (code: string) => {
    await connectRotation(code);
  };

  const handleUpdateRotationField = async (code: string, field: string, value: string) => {
    const target = rotationHistory.find((rotation) => rotation.code === code);
    // Read-only cards already block edits in the UI; this stops a stray commit
    // from writing to another attending's rotation.
    if (target && !canManageRotation(target, { uid: firebaseAdmin.uid, email: firebaseAdmin.email || "" })) {
      return;
    }
    await store.updateRotation(code, { [field]: value });
    setRotationHistory((prev) => prev.map((rotation) => rotation.code === code ? { ...rotation, [field]: value } : rotation));
  };

  const updateRotationHistoryDraft = (code: string, field: "dates" | "location", value: string) => {
    setRotationHistory((prev) => prev.map((rotation) => rotation.code === code ? { ...rotation, [field]: value } : rotation));
  };

  const handleDisconnect = () => {
    store.setRotationCode(null);
    setStoredAdminRotationCode(firebaseAdmin.uid, null);
    setRotationCodeState("");
    onSharedDataLoaded();
    showToast("Disconnected from the current rotation.", "info");
  };

  const resetPinChangeForm = () => {
    setPinCurrent("");
    setPinNext("");
    setPinConfirm("");
    setPinChangeError("");
  };

  const handleCancelPinChange = () => {
    resetPinChangeForm();
    setPinChangeOpen(false);
  };

  const handleSavePinChange = () => {
    const current = pinCurrent.trim();
    const next = pinNext.trim();
    const confirmation = pinConfirm.trim();

    if (hasAdminPin && current !== activeAdminPin) {
      setPinChangeError("Current PIN is incorrect.");
      return;
    }

    const validationError = getAdminPinValidationError(next, activeAdminPin);
    if (validationError) {
      setPinChangeError(validationError);
      return;
    }

    if (next !== confirmation) {
      setPinChangeError("New PINs need to match.");
      return;
    }

    setSettings((prev) => ({ ...prev, adminPin: next }));
    resetPinChangeForm();
    setPinChangeOpen(false);
    setPinChangeSuccess("Admin PIN changed on this browser.");
    showToast("Admin PIN changed.", "success");
  };

  const handleRejoin = async () => {
    if (rejoinCode.length < 4) return;
    setRejoining(true);
    setRejoinError("");
    const connected = await connectRotation(rejoinCode);
    if (connected) {
      setRejoinCode("");
    } else {
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

  const masterAdmin = isBootstrapAdminEmail(firebaseAdmin.email || "");
  const sectionEntries = useMemo(() => focusSection === "rotation"
    ? []
    : [
        { id: "settings-profile", label: "Profile" },
        { id: "settings-content", label: "Content" },
        { id: "settings-security", label: "Security" },
        ...(masterAdmin ? [{ id: "settings-admin-access", label: "Admin Access" }] : []),
      ], [focusSection, masterAdmin]);
  const sectionIds = sectionEntries.map((entry) => entry.id);
  const activeSectionId = useActiveSectionId(sectionIds);

  const jumpToId = (id: string) => {
    if (typeof document === "undefined") return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {sectionEntries.length > 0 && (
        <div style={{ background: T.bg, borderBottom: `1.5px solid ${T.ink}`, position: "sticky", top: 0, zIndex: 20, marginInline: -28, paddingInline: 28 }}>
          <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
            {sectionEntries.map((entry) => {
              const active = entry.id === activeSectionId;
              return (
                <button
                  key={entry.id}
                  onClick={() => jumpToId(entry.id)}
                  style={{
                    padding: "12px 18px",
                    background: "transparent",
                    border: "none",
                    borderBottom: active ? `2px solid ${T.brand}` : "2px solid transparent",
                    color: active ? T.ink : T.sub,
                    fontFamily: T.mono,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showRotation && (
      <SettingsSection sectionRef={rotationRef} title="Rotation Workspace" description="Create a new rotation, reconnect to an existing one, and manage the learner roster tied to each code.">
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 0, padding: 20, color: T.ink }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              <h4 style={{ fontFamily: T.serif, color: T.ink, fontSize: 20, margin: 0, fontWeight: 700, lineHeight: 1.15 }}>Rotation Code</h4>
              {rotationCode && (
                <button
                  onClick={handleDisconnect}
                  style={{ background: "transparent", border: "none", padding: 0, color: T.brand, fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
                >
                  Disconnect from rotation
                </button>
              )}
            </div>
            {rotationCode ? (
              <div>
                <div style={{ fontSize: 13, color: T.sub, marginBottom: 6 }}>Share this code with students to join:</div>
                <div style={{ fontSize: 32, fontFamily: T.mono, fontWeight: 700, letterSpacing: 4, textAlign: "center", background: T.bg, border: `1px solid ${T.line}`, borderRadius: 0, padding: "14px 0", marginBottom: 12, color: T.ink }}>
                  {rotationCode}
                </div>
                <div style={{ fontSize: 13, color: T.sub, textAlign: "center", lineHeight: 1.5 }}>Students enter this code after setting their name to sync data in real time.</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 13, color: T.sub, marginBottom: 12, lineHeight: 1.5 }}>
                  Create a rotation to sync student data in real time. Students will enter the generated code to join.
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 13, color: T.sub, fontWeight: 600, display: "block", marginBottom: 4 }}>Rotation Dates (optional)</label>
                  <input value={newDates} onChange={(event) => setNewDates(event.target.value)} placeholder="e.g. Mar 1–28, 2026" style={{ width: "100%", padding: "10px 12px", borderRadius: 0, border: `1px solid ${T.line}`, background: T.bg, color: T.ink, fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 13, color: T.sub, fontWeight: 600, display: "block", marginBottom: 4 }}>Location (optional)</label>
                    <input value={newLocation} onChange={(event) => setNewLocation(event.target.value)} placeholder="e.g. Good Samaritan" style={{ width: "100%", padding: "10px 12px", borderRadius: 0, border: `1px solid ${T.line}`, background: T.bg, color: T.ink, fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: T.sub, fontWeight: 600, display: "block", marginBottom: 4 }}>Duration</label>
                    <select value={settings.duration || "4"} onChange={(event) => update("duration", event.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 0, border: `1px solid ${T.line}`, background: T.bg, color: T.ink, fontSize: 13, boxSizing: "border-box", appearance: "none" }}>
                      <option value="1">1 week</option>
                      <option value="2">2 weeks</option>
                      <option value="3">3 weeks</option>
                      <option value="4">4 weeks</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, color: T.sub, fontWeight: 600, display: "block", marginBottom: 4 }}>Custom Code (optional)</label>
                  <input value={newCustomCode} onChange={(event) => setNewCustomCode(event.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, ""))} placeholder="e.g. TEST or GS-APR26" style={{ width: "100%", padding: "10px 12px", borderRadius: 0, border: `1px solid ${T.line}`, background: T.bg, color: T.ink, fontSize: 13, boxSizing: "border-box", fontFamily: T.mono, letterSpacing: 2 }} />
                  <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>If blank, the code is auto-generated from location and dates.</div>
                </div>
                <button onClick={handleCreateRotation} disabled={creating} style={{ width: "100%", padding: "14px 0", background: T.brand, color: T.brandInk, border: "none", borderRadius: 0, fontSize: 15, fontWeight: 700, cursor: creating ? "wait" : "pointer", opacity: creating ? 0.7 : 1, marginBottom: 16 }}>
                  {creating ? "Creating..." : "Create New Rotation"}
                </button>
                <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
                  <div style={{ fontSize: 13, color: T.sub, marginBottom: 8, fontWeight: 600 }}>Or reconnect to an existing rotation:</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={rejoinCode}
                      onChange={(event) => { setRejoinCode(event.target.value.toUpperCase()); setRejoinError(""); }}
                      onKeyDown={(event) => { if (event.key === "Enter") void handleRejoin(); }}
                      placeholder="e.g. CMC-MAR26"
                      style={{ flex: 1, padding: "10px 12px", borderRadius: 0, border: `1px solid ${rejoinError ? T.danger : T.line}`, background: T.bg, color: T.ink, fontSize: 14, fontFamily: T.mono, letterSpacing: 2, textAlign: "center", boxSizing: "border-box" }}
                    />
                    <button onClick={() => { void handleRejoin(); }} disabled={rejoining || rejoinCode.length < 4} style={{ padding: "10px 18px", background: rejoinCode.length >= 4 ? T.ink : T.bg, color: rejoinCode.length >= 4 ? "white" : T.muted, border: `1px solid ${rejoinCode.length >= 4 ? T.ink : T.line}`, borderRadius: 0, fontSize: 13, fontWeight: 600, cursor: rejoinCode.length >= 4 ? "pointer" : "default" }}>
                      {rejoining ? "..." : "Join"}
                    </button>
                  </div>
                  {rejoinError && <div style={{ color: T.danger, fontSize: 13, marginTop: 6 }}>{rejoinError}</div>}
                </div>
              </div>
            )}
          </div>

          {rotationCode && activeRotation && (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Active Rotation
              </div>
              <RotationRecordCard
                rotation={activeRotation}
                active
                canManage={canManageRotation(activeRotation, { uid: firebaseAdmin.uid, email: firebaseAdmin.email || "" })}
                note="This is the live workspace students are currently joining. To switch blocks, choose a different rotation below."
                onDraftFieldChange={(field, value) => updateRotationHistoryDraft(activeRotation.code, field, value)}
                onCommitField={(field, value) => { void handleUpdateRotationField(activeRotation.code, field, value); }}
              />
            </div>
          )}

          <div style={{ display: "grid", gap: 12 }}>
            {masterAdmin && (
              <div style={{ background: T.bg, border: `1px solid ${T.brand}`, borderRadius: 0, padding: "8px 10px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: T.brand, flexShrink: 0 }} />
                <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: T.ink, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  MASTER ADMIN VIEW
                </span>
                <span style={{ fontSize: 13, color: T.sub, lineHeight: 1.4 }}>
                  these rotations belong to other attendings. Read-only.
                </span>
              </div>
            )}
            <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {rotationCode ? "Other Rotations" : (masterAdmin ? "All Rotations" : "Your Rotations")}
            </div>
            {historyLoading ? (
              <div style={{ textAlign: "center", color: T.muted, fontSize: 13, padding: 16 }}>Loading rotations...</div>
            ) : rotationHistory.length === 0 ? (
              <div style={{ textAlign: "center", color: T.muted, fontSize: 13, padding: 16, background: T.bg, borderRadius: 12, border: `1px solid ${T.line}` }}>No rotations created yet.</div>
            ) : selectableRotations.length === 0 ? (
              <div style={{ textAlign: "center", color: T.muted, fontSize: 13, padding: 16, background: T.bg, borderRadius: 12, border: `1px solid ${T.line}` }}>
                No other rotations available. The active rotation is shown above.
              </div>
            ) : (
              <>
                <select
                  value={selectedRotationCode}
                  onChange={(event) => setSelectedRotationCode(event.target.value)}
                  style={{ ...adminInput, fontFamily: T.mono, letterSpacing: 1, fontWeight: 600 }}
                >
                  {selectableRotations.map((rotation) => {
                    const ownerTag = rotation.ownerEmail ? ` — ${rotation.ownerEmail}` : "";
                    return (
                      <option key={rotation.code} value={rotation.code}>
                        {rotation.code}{ownerTag}
                      </option>
                    );
                  })}
                </select>

                {selectedRotation && (
                  <RotationRecordCard
                    rotation={selectedRotation}
                    canManage={canManageRotation(selectedRotation, { uid: firebaseAdmin.uid, email: firebaseAdmin.email || "" })}
                    note="Review this saved block before connecting. Connecting will switch the live admin workspace."
                    onConnect={() => { void handleConnectRotation(selectedRotation.code); }}
                    onDelete={() => { void handleDeleteRotation(selectedRotation.code); }}
                    onDraftFieldChange={(field, value) => updateRotationHistoryDraft(selectedRotation.code, field, value)}
                    onCommitField={(field, value) => { void handleUpdateRotationField(selectedRotation.code, field, value); }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </SettingsSection>
      )}

      {showOtherSections && (
      <SettingsSection sectionRef={profileRef} sectionId="settings-profile" title="Profile" description="Update the identity and schedule details students see across this rotation.">
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <h4 style={{ color: T.ink, fontSize: 15, margin: "0 0 12px", fontFamily: T.serif, fontWeight: 700 }}>Rotation Schedule</h4>
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
            <div style={{ fontSize: 13, color: T.muted, marginTop: 8 }}>Sets module pacing for students. All four modules stay browsable in their Library regardless of duration — modules beyond the rotation window are labeled "Stretch · optional."</div>
          </div>

          <div>
            <h4 style={{ color: T.ink, fontSize: 15, margin: "0 0 12px", fontFamily: T.serif, fontWeight: 700 }}>Attending Information</h4>
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
      <SettingsSection sectionRef={contentRef} sectionId="settings-content" title="Curriculum & Content" description="Edit the module curriculum, articles, announcements, and clinic guides students see. You only need this between rotations.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <button
            type="button"
            onClick={() => onOpenContent()}
            style={{ padding: "14px 16px", background: T.brand, color: T.brandInk, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "left" }}
          >
            📝 Open content editor
            <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.82, marginTop: 3 }}>Curriculum, articles, announcements, guides</div>
          </button>
          <button
            type="button"
            onClick={() => onOpenContent({ type: "editCurriculum" })}
            style={{ padding: "14px 16px", background: T.bg, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "left" }}
          >
            📚 Edit curriculum
            <div style={{ fontSize: 12, fontWeight: 500, color: T.muted, marginTop: 3 }}>Module topics and lesson plans</div>
          </button>
          <button
            type="button"
            onClick={() => onOpenContent({ type: "announcements" })}
            style={{ padding: "14px 16px", background: T.bg, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "left" }}
          >
            📣 Announcements
            <div style={{ fontSize: 12, fontWeight: 500, color: T.muted, marginTop: 3 }}>Post banners to the student app</div>
          </button>
          <button
            type="button"
            onClick={() => onOpenContent({ type: "clinicGuides" })}
            style={{ padding: "14px 16px", background: T.bg, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "left" }}
          >
            🩺 Clinic guides
            <div style={{ fontSize: 12, fontWeight: 500, color: T.muted, marginTop: 3 }}>Custom per-rotation guidance</div>
          </button>
        </div>
      </SettingsSection>
      )}

      {showOtherSections && (
      <SettingsSection sectionRef={securityRef} sectionId="settings-security" title="Security" description="Keep the shared panel protected on any device used during rounds or teaching.">
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ background: T.bg, borderRadius: 12, padding: 12, border: `1px solid ${T.line}`, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5 }}>Admin PIN</div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5, marginTop: 4 }}>
                {hasAdminPin ? "PIN is set and hidden. Change it with current PIN verification." : "No local admin PIN is set for this browser."}
              </div>
            </div>
            <span style={{ background: hasAdminPin ? T.successBg : T.warningBg, color: hasAdminPin ? T.success : T.warning, border: `1px solid ${hasAdminPin ? T.success : T.warning}`, borderRadius: 999, padding: "4px 10px", fontSize: 13, fontWeight: 700 }}>
              {hasAdminPin ? "Set" : "Needs setup"}
            </span>
          </div>

          {!pinChangeOpen ? (
            <div>
              <button
                type="button"
                onClick={() => {
                  setPinChangeSuccess("");
                  setPinChangeOpen(true);
                }}
                style={{ padding: "10px 14px", background: T.brand, color: T.brandInk, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                {hasAdminPin ? "Change PIN" : "Set PIN"}
              </button>
              {pinChangeSuccess && <div style={{ fontSize: 13, color: T.success, marginTop: 8, fontWeight: 700 }}>{pinChangeSuccess}</div>}
            </div>
          ) : (
            <div style={{ background: T.card, borderRadius: 12, padding: 14, border: `1px solid ${T.line}`, display: "grid", gap: 12 }}>
              {hasAdminPin && (
                <div>
                  <label style={adminLabel}>Current PIN</label>
                  <input
                    type="password"
                    value={pinCurrent}
                    onChange={(event) => { setPinCurrent(event.target.value); setPinChangeError(""); }}
                    placeholder="Enter current PIN"
                    style={{ ...adminInput, fontFamily: T.mono, letterSpacing: 4 }}
                  />
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <div>
                  <label style={adminLabel}>New PIN</label>
                  <input
                    type="password"
                    value={pinNext}
                    onChange={(event) => { setPinNext(event.target.value); setPinChangeError(""); }}
                    placeholder="Choose a new PIN"
                    style={{ ...adminInput, fontFamily: T.mono, letterSpacing: 4 }}
                  />
                </div>
                <div>
                  <label style={adminLabel}>Confirm New PIN</label>
                  <input
                    type="password"
                    value={pinConfirm}
                    onChange={(event) => { setPinConfirm(event.target.value); setPinChangeError(""); }}
                    placeholder="Repeat new PIN"
                    style={{ ...adminInput, fontFamily: T.mono, letterSpacing: 4 }}
                  />
                </div>
              </div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
                Use at least 4 characters. Avoid defaults, repeated digits, or simple sequences like 1234.
              </div>
              {pinChangeError && <div style={{ fontSize: 13, color: T.danger, background: T.dangerBg, borderRadius: 10, padding: "9px 11px", fontWeight: 700 }}>{pinChangeError}</div>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleSavePinChange}
                  style={{ padding: "10px 14px", background: T.brand, color: T.brandInk, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  Save New PIN
                </button>
                <button
                  type="button"
                  onClick={handleCancelPinChange}
                  style={{ padding: "10px 14px", background: T.bg, color: T.sub, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </SettingsSection>
      )}

      {showOtherSections && isBootstrapAdminEmail(firebaseAdmin.email || "") && (
      <SettingsSection sectionRef={adminAccessRef} sectionId="settings-admin-access" title="Admin Access" description="Invite another attending or educator to create their own admin sign-in and manage their own rotations.">
        <div style={{ background: T.bg, borderRadius: 12, padding: 12, border: `1px solid ${T.line}`, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Signed In Account</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{firebaseAdmin.email || "Admin account"}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 8 }}>
          <input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && inviteEmail.trim()) void onInviteAdmin(); }} placeholder="colleague@hospital.edu" style={adminInput} />
          <button onClick={() => { void onInviteAdmin(); }} disabled={!inviteEmail.trim() || inviteSubmitting} style={{ padding: "0 16px", background: !inviteEmail.trim() || inviteSubmitting ? T.muted : T.brand, color: T.brandInk, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: !inviteEmail.trim() || inviteSubmitting ? "default" : "pointer", opacity: !inviteEmail.trim() || inviteSubmitting ? 0.7 : 1 }}>
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
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{invite.email}</div>
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
                    style={{ marginTop: 10, padding: "8px 14px", background: T.brand, color: T.brandInk, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
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
