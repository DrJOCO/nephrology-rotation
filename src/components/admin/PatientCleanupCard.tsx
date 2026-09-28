import { useState } from "react";
import { T } from "../../data/constants";
import store from "../../utils/store";
import type { AdminStudent } from "../../types";
import type { AdminConfirmOptions, AdminToastTone } from "./shared";
import { Button } from "./ui/Button";
import {
  applyPatientCleanup,
  buildPatientCleanup,
  isCoveredByBackup,
  patientCleanupBackupFilename,
  patientCleanupKeys,
} from "./lib/patientCleanup";

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Data-health card for the D1 privacy cleanup. Two deliberate steps: download
// a backup of exactly what will be removed, then remove it. Shown only while
// the connected rotation still stores pre-redesign free text.
export function PatientCleanupCard({ rotationCode, students, requestConfirm, showToast }: {
  rotationCode: string;
  students: AdminStudent[];
  requestConfirm: (options: AdminConfirmOptions) => Promise<boolean>;
  showToast: (message: string, tone?: AdminToastTone) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [backupKeys, setBackupKeys] = useState<Set<string> | null>(null);

  const affected = students.filter(student => (student.legacyPatientDetailCount || 0) > 0);
  const entryTotal = affected.reduce((sum, student) => sum + (student.legacyPatientDetailCount || 0), 0);
  if (!rotationCode || affected.length === 0) return null;

  const readCleanup = async () => {
    const rawDocs = await store.getStudentsForRotation(rotationCode);
    return buildPatientCleanup(rotationCode, rawDocs, new Date().toISOString());
  };

  const downloadBackup = async () => {
    setBusy(true);
    try {
      const cleanup = await readCleanup();
      if (cleanup.totalEntries === 0) {
        showToast("Couldn't read the stored consult entries. Check your connection and try again.", "error");
        return;
      }
      downloadJson(patientCleanupBackupFilename(rotationCode, cleanup.backup.createdAt), cleanup.backup);
      setBackupKeys(patientCleanupKeys(cleanup.backup));
      showToast(`Backup downloaded (${cleanup.totalEntries} entr${cleanup.totalEntries === 1 ? "y" : "ies"}). Step 2 is now available.`, "success");
    } catch (error) {
      console.warn("Consult cleanup backup failed:", error);
      showToast("The backup could not be created. Nothing was changed.", "error");
    } finally {
      setBusy(false);
    }
  };

  const removeDetails = async () => {
    if (!backupKeys) return;
    const confirmed = await requestConfirm({
      title: "Remove old consult details?",
      message: `This permanently deletes initials, room numbers, diagnoses, and notes from ${entryTotal} stored consult entr${entryTotal === 1 ? "y" : "ies"} in ${rotationCode}. Topics, dates, and status are kept. Your downloaded backup is the only copy of the removed text.`,
      confirmLabel: "Remove details",
      tone: "danger",
      requireText: rotationCode,
      requireTextLabel: "Type the rotation code to confirm",
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      // Re-read so the write starts from current data, and refuse to remove
      // anything the downloaded backup doesn't hold.
      const cleanup = await readCleanup();
      if (cleanup.totalEntries === 0) {
        showToast("Nothing left to remove — the stored entries are already clean.", "success");
        setBackupKeys(null);
        return;
      }
      if (!isCoveredByBackup(cleanup, backupKeys)) {
        setBackupKeys(null);
        showToast("New entries with details appeared since your backup. Download a fresh backup, then try again.", "error");
        return;
      }
      const result = await applyPatientCleanup(store, cleanup.plans, cleanup.backup.createdAt);
      setBackupKeys(null);
      if (result.queued > 0) {
        showToast(`Cleaned ${result.applied} student record${result.applied === 1 ? "" : "s"}; ${result.queued} will finish when the connection recovers. Keep this tab open.`, "info");
      } else {
        showToast(`Removed old details from ${cleanup.totalEntries} consult entr${cleanup.totalEntries === 1 ? "y" : "ies"}.`, "success");
      }
    } catch (error) {
      console.warn("Consult cleanup failed:", error);
      showToast("The cleanup stopped partway. Reload the Students tab to see what is left, then run it again.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: T.warningBg, border: `1px solid ${T.warning}55`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
      <div style={{ color: T.warning, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4 }}>Privacy cleanup</div>
      <div style={{ color: T.ink, fontSize: 15, fontWeight: 800, marginTop: 3 }}>
        {entryTotal} consult entr{entryTotal === 1 ? "y" : "ies"} from {affected.length} student{affected.length === 1 ? "" : "s"} still store old free-text details
      </div>
      <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.5, marginTop: 3 }}>
        The consult log is picklist-only now, and the app already hides initials, room numbers, diagnoses, and notes. They are still saved in the database until you remove them here.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <Button onClick={downloadBackup} disabled={busy}>1. Download backup</Button>
        <Button variant="primary" onClick={removeDetails} disabled={busy || !backupKeys}>2. Remove old details</Button>
      </div>
      <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.5, marginTop: 8 }}>
        The backup file contains the removed text. Keep it somewhere private and delete it once you have checked the cleanup.
      </div>
    </div>
  );
}
