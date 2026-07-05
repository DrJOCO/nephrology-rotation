import { getBootstrapAdminLegacyUids, getCurrentAdminUser, getFirebase, isBootstrapAdminEmail, waitForAuthUser } from "./firebase";
import { mergeCompletedItems, mergeWeeklyScores } from "./progressMerge";

 
type FirestoreData = Record<string, any>;
type PendingSyncData = Record<string, unknown> | unknown[];
type PendingSyncItem =
  | { kind: "setShared"; rotationCode: string; key: string; data: PendingSyncData; updatedAt: string }
  | { kind: "setStudentData"; rotationCode: string; studentId: string; data: Record<string, unknown>; updatedAt: string }
  | { kind: "setTeamSnapshot"; rotationCode: string; studentId: string; data: Record<string, unknown>; updatedAt: string }
  | { kind: "updateRotation"; rotationCode: string; data: Record<string, unknown>; updatedAt: string };

export interface RotationInfo {
  code: string;
  name: string;
  createdAt: string | null;
  location: string;
  dates: string;
  studentCount: number;
  ownerEmail: string;
  ownerUid: string;
}

// Outcome of a student-doc write: "applied" = Firestore confirmed it,
// "queued" = offline or failed and parked in the pending-sync queue,
// "skipped" = nothing was written (no rotation code, or the clobber guard
// found every field superseded by newer remote data).
export type StudentWriteStatus = "applied" | "queued" | "skipped";
export interface StudentWriteResult {
  status: StudentWriteStatus;
  // The updatedAt actually persisted — the merge's fresh stamp when the
  // clobber guard folded in newer remote data; null when nothing was written.
  updatedAt: string | null;
}

export interface StudentAssignmentRecord {
  studentId: string;
  activeRotationCode: string;
  rotationCodes: string[];
  updatedAt: string;
  email?: string;
}

interface RotationOwnerSession {
  uid: string;
  email?: string;
}

// Key mapping: SHARED_KEYS string → Firestore field name
const KEY_TO_FIELD: Record<string, string> = {
  neph_shared_curriculum: "curriculum",
  neph_shared_articles: "articles",
  neph_shared_studySheets: "studySheets",
  neph_shared_announcements: "announcements",
  neph_shared_settings: "settings",
  neph_shared_clinicGuides: "clinicGuides",
  neph_shared_clinicGuideTemplates: "clinicGuideTemplates",
};

const PENDING_SYNC_KEY = "neph_pendingSyncQueue";
// Where a corrupted queue blob is stashed instead of being silently wiped by
// the next queue write — recoverable by hand from localStorage if a student
// reports lost offline work.
const PENDING_SYNC_CORRUPT_KEY = "neph_pendingSyncQueue_corrupt";
const PENDING_SYNC_EVENT = "neph:pending-sync-changed";
const rotationDocCacheKey = (code: string) => `neph_rotation_doc_${code}`;
const studentDocCacheKey = (code: string, studentId: string) => `neph_rotation_${code}_student_${studentId}`;
const teamDocCacheKey = (code: string, studentId: string) => `neph_rotation_${code}_team_${studentId}`;
const studentAssignmentCacheKey = (studentId: string) => `neph_student_assignment_${studentId}`;

let rotationCode: string | null = localStorage.getItem("neph_rotationCode") || null;

function readJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch (error) {
    console.warn(`Failed to read ${key}:`, error);
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to write ${key}:`, error);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergePayload<T extends PendingSyncData | Record<string, unknown>>(existing: T | null | undefined, next: T): T {
  if (isPlainObject(existing) && isPlainObject(next)) {
    return { ...existing, ...next } as T;
  }
  return next;
}

function withoutLegacyLoginPin(data: Record<string, unknown>): Record<string, unknown> {
  const safe = { ...data };
  delete safe.loginPin;
  return safe;
}

// Firestore rejects undefined anywhere in a payload, so one stray optional
// field (e.g. a feedback tag without a note) would fail the whole write and
// strand it in the retry queue.
function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => (entry === undefined ? null : stripUndefinedDeep(entry))) as unknown as T;
  }
  if (isPlainObject(value)) {
    const cleaned: Record<string, unknown> = {};
    Object.entries(value).forEach(([key, entry]) => {
      if (entry !== undefined) cleaned[key] = stripUndefinedDeep(entry);
    });
    return cleaned as T;
  }
  return value;
}

function emitPendingSyncChanged(queue: PendingSyncItem[]): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PENDING_SYNC_EVENT, { detail: { count: queue.length } }));
}

function isPendingSyncItemShaped(value: unknown): value is PendingSyncItem {
  return isPlainObject(value) && typeof value.kind === "string" && typeof value.rotationCode === "string";
}

function readPendingSyncQueue(): PendingSyncItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PENDING_SYNC_KEY);
  } catch (error) {
    console.warn(`Failed to read ${PENDING_SYNC_KEY}:`, error);
    return [];
  }
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("pending sync queue is not an array");
    const valid = parsed.filter(isPendingSyncItemShaped);
    if (valid.length !== parsed.length) {
      // Some entries are unreadable; keep the raw blob so nothing is lost when
      // the next queue write persists only the valid entries.
      stashCorruptPendingSyncQueue(raw, "entries with unexpected shape");
    }
    return valid;
  } catch (error) {
    // A corrupted queue used to silently discard ALL queued offline work (the
    // parse failure read as an empty queue, and the next write made that
    // permanent). Stash the blob for recovery instead.
    console.warn("Pending sync queue is corrupted; stashing raw payload for recovery:", error);
    stashCorruptPendingSyncQueue(raw, "unparseable JSON");
    try {
      localStorage.removeItem(PENDING_SYNC_KEY);
    } catch { /* leave the corrupt blob in place rather than throw */ }
    return [];
  }
}

function stashCorruptPendingSyncQueue(raw: string, reason: string): void {
  try {
    if (localStorage.getItem(PENDING_SYNC_CORRUPT_KEY) === raw) return;
    localStorage.setItem(PENDING_SYNC_CORRUPT_KEY, raw);
    console.warn(`Pending sync queue preserved at ${PENDING_SYNC_CORRUPT_KEY} (${reason}).`);
  } catch (error) {
    console.warn("Failed to stash corrupted pending sync queue:", error);
  }
}

function writePendingSyncQueue(queue: PendingSyncItem[]): void {
  writeJson(PENDING_SYNC_KEY, queue);
  emitPendingSyncChanged(queue);
}

function sameQueueScope(a: PendingSyncItem, b: PendingSyncItem): boolean {
  if (a.kind !== b.kind || a.rotationCode !== b.rotationCode) return false;
  if (a.kind === "setShared" && b.kind === "setShared") return a.key === b.key;
  if (a.kind === "updateRotation" && b.kind === "updateRotation") return true;
  if ((a.kind === "setStudentData" || a.kind === "setTeamSnapshot") && (b.kind === "setStudentData" || b.kind === "setTeamSnapshot")) {
    return a.kind === b.kind && a.studentId === b.studentId;
  }
  return false;
}

function queuePendingSync(item: PendingSyncItem): void {
  const queue = readPendingSyncQueue();
  const existingIndex = queue.findIndex((queued) => sameQueueScope(queued, item));
  if (existingIndex === -1) {
    writePendingSyncQueue([...queue, item]);
    return;
  }

  const existing = queue[existingIndex];
  const merged = { ...existing, updatedAt: item.updatedAt } as PendingSyncItem;

  if (existing.kind === "setShared" && item.kind === "setShared") {
    merged.data = mergePayload(existing.data, item.data);
  } else if (existing.kind === "setStudentData" && item.kind === "setStudentData") {
    merged.data = mergePayload(existing.data, item.data);
  } else if (existing.kind === "setTeamSnapshot" && item.kind === "setTeamSnapshot") {
    merged.data = mergePayload(existing.data, item.data);
  } else if (existing.kind === "updateRotation" && item.kind === "updateRotation") {
    merged.data = mergePayload(existing.data, item.data);
  }

  const nextQueue = queue.slice();
  nextQueue[existingIndex] = merged;
  writePendingSyncQueue(nextQueue);
}

// Serialized snapshot of the queue entry for `item`'s scope, captured BEFORE
// a network write so settleQueuedSync can tell "leftover we just superseded"
// from "new work queued while the write was in flight".
function readQueuedSyncSnapshot(item: PendingSyncItem): string | null {
  const match = readPendingSyncQueue().find((queued) => sameQueueScope(queued, item));
  return match ? JSON.stringify(match) : null;
}

// Settle the pending queue after a SUCCESSFUL direct write. The old
// clearQueuedSync deleted the whole scope, which silently discarded (a) writes
// queued during the in-flight network call and (b) residual fields from an
// earlier failed write that the fresh payload never carried (e.g. a queued
// { year } profile edit vs. the auto-save payload, which has no `year`).
// Rules: an entry that changed since `priorSnapshot` is kept whole (it holds
// newer work; the flush clobber guard makes re-writing it safe); an unchanged
// entry only loses the fields the successful payload covered.
function settleQueuedSync(written: PendingSyncItem, priorSnapshot: string | null): void {
  const queue = readPendingSyncQueue();
  const next: PendingSyncItem[] = [];
  let changed = false;
  for (const queued of queue) {
    if (!sameQueueScope(queued, written)) {
      next.push(queued);
      continue;
    }
    if (JSON.stringify(queued) !== priorSnapshot) {
      // Queued (or re-queued with more data) while the write was in flight.
      next.push(queued);
      continue;
    }
    if (isPlainObject(queued.data) && isPlainObject(written.data)) {
      const residual = Object.fromEntries(
        Object.entries(queued.data).filter(([key]) => !Object.prototype.hasOwnProperty.call(written.data, key)),
      );
      if (Object.keys(residual).length > 0) {
        next.push({ ...queued, data: residual } as PendingSyncItem);
        changed = true;
        continue;
      }
    }
    changed = true; // fully superseded → dropped
  }
  if (changed || next.length !== queue.length) writePendingSyncQueue(next);
}

function cacheRotationDoc(code: string, data: Record<string, unknown>): void {
  const existing = readJson<Record<string, unknown>>(rotationDocCacheKey(code));
  const merged = mergePayload(existing, data);
  writeJson(rotationDocCacheKey(code), merged);
  if (rotationCode === code) {
    Object.entries(KEY_TO_FIELD).forEach(([sharedKey, field]) => {
      if (Object.prototype.hasOwnProperty.call(merged, field)) {
        writeJson(sharedKey, merged[field]);
      }
    });
  }
}

function cacheSharedValue(key: string, value: unknown): void {
  writeJson(key, value);
  if (!rotationCode) return;
  const field = KEY_TO_FIELD[key];
  if (field) cacheRotationDoc(rotationCode, { [field]: value });
}

function cacheStudentDoc(code: string, studentId: string, data: Record<string, unknown>): void {
  const existing = readJson<Record<string, unknown>>(studentDocCacheKey(code, studentId));
  writeJson(
    studentDocCacheKey(code, studentId),
    mergePayload(existing ? withoutLegacyLoginPin(existing) : null, withoutLegacyLoginPin(data)),
  );
}

function cacheTeamDoc(code: string, studentId: string, data: Record<string, unknown>): void {
  const existing = readJson<Record<string, unknown>>(teamDocCacheKey(code, studentId));
  writeJson(teamDocCacheKey(code, studentId), mergePayload(existing, data));
}

function normalizeRotationCodeValue(code: string | undefined | null): string {
  return typeof code === "string" ? code.trim().toUpperCase() : "";
}

function normalizeStudentAssignmentRecord(studentId: string, data: Record<string, unknown>): StudentAssignmentRecord | null {
  const activeRotationCode = normalizeRotationCodeValue(typeof data.activeRotationCode === "string" ? data.activeRotationCode : "");
  if (!activeRotationCode) return null;

  const rotationCodes = Array.isArray(data.rotationCodes)
    ? Array.from(new Set(data.rotationCodes
        .filter((value): value is string => typeof value === "string")
        .map((value) => normalizeRotationCodeValue(value))
        .filter(Boolean)))
    : [activeRotationCode];

  return {
    studentId,
    activeRotationCode,
    rotationCodes: rotationCodes.length > 0 ? rotationCodes : [activeRotationCode],
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
    ...(typeof data.email === "string" && data.email.trim() ? { email: data.email.trim().toLowerCase() } : {}),
  };
}

function cacheStudentAssignment(studentId: string, record: StudentAssignmentRecord): void {
  writeJson(studentAssignmentCacheKey(studentId), record);
}

function normalizeRotationOwnerEmail(email?: string): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function getRotationAccessPatch(existing: Record<string, unknown> | null | undefined, owner: RotationOwnerSession): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const ownerEmail = normalizeRotationOwnerEmail(owner.email);
  const legacyOwnerUids = getBootstrapAdminLegacyUids(ownerEmail);
  const existingAdminUids = Array.isArray(existing?.adminUids)
    ? existing.adminUids.filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];
  const existingOwnerUid = typeof existing?.ownerUid === "string" ? existing.ownerUid : "";

  if (!existing || !existingOwnerUid) {
    patch.ownerUid = owner.uid;
  }

  if (
    ownerEmail
    && typeof existing?.ownerEmail === "string"
    && normalizeRotationOwnerEmail(existing.ownerEmail) === ownerEmail
    && existing.ownerUid !== owner.uid
  ) {
    patch.ownerUid = owner.uid;
  }

  if (existingOwnerUid && existingOwnerUid !== owner.uid && legacyOwnerUids.includes(existingOwnerUid)) {
    patch.ownerUid = owner.uid;
  }

  if (ownerEmail && (!existing || typeof existing.ownerEmail !== "string" || !existing.ownerEmail)) {
    patch.ownerEmail = ownerEmail;
  }

  if (!existingAdminUids.includes(owner.uid)) {
    patch.adminUids = [...new Set([...existingAdminUids, owner.uid])];
  }

  return patch;
}

async function ensureRotationCodeDoc(code: string, owner: RotationOwnerSession): Promise<void> {
  const { db, fs } = await getFirebase();
  const rotationCodeRef = fs.doc(db, "rotationCodes", code);
  const rotationCodeSnap = await fs.getDoc(rotationCodeRef);
  const now = new Date().toISOString();

  await fs.setDoc(rotationCodeRef, {
    rotationCode: code,
    ownerUid: owner.uid,
    ...(normalizeRotationOwnerEmail(owner.email) ? { ownerEmail: normalizeRotationOwnerEmail(owner.email) } : {}),
    ...(rotationCodeSnap.exists() ? { updatedAt: now } : { createdAt: now }),
  }, { merge: true });
}

// ─── Flush guard: never let stale queued data clobber newer remote data ───
// A device that queued writes while offline may flush long after another
// device has synced newer progress. When the remote doc's updatedAt is newer
// than the queued item's, we merge field-wise instead of overwriting:
// progress-shaped collections get monotonic unions (completed work never
// un-completes), and where a winner is ambiguous the newest updatedAt wins.
// The direct setStudentData path opts into the same guard via baseUpdatedAt,
// so a stale device's post-hydration auto-save or logout flush can't clobber
// newer cloud progress either.

type FirebaseModules = Awaited<ReturnType<typeof getFirebase>>;

function isNewerTimestamp(a: unknown, b: unknown): boolean {
  // ISO-8601 strings compare correctly lexicographically (same convention as
  // the student listener's staleness check in StudentApp).
  return typeof a === "string" && typeof b === "string" && a > b;
}

// Read the remote doc a guarded write must be compared against. Returns null
// only when the doc genuinely does not exist; a READ FAILURE is rethrown so
// the guard fails CLOSED — the caller queues the payload for the 30s retry
// loop instead of writing blind over remote progress it couldn't inspect.
async function readFlushRemoteDoc(
  fs: FirebaseModules["fs"],
  ref: ReturnType<FirebaseModules["fs"]["doc"]>,
): Promise<Record<string, unknown> | null> {
  const snap = await fs.getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return isPlainObject(data) ? data : null;
}

function mergeSrQueues(remote: unknown, queued: unknown): unknown {
  if (!isPlainObject(remote)) return queued;
  if (!isPlainObject(queued)) return remote;
  const merged: Record<string, unknown> = { ...queued };
  for (const [key, remoteItem] of Object.entries(remote)) {
    const queuedItem = merged[key];
    if (!isPlainObject(queuedItem) || !isPlainObject(remoteItem)) {
      merged[key] = remoteItem;
      continue;
    }
    // Per-card conflict: the more recently reviewed copy carries the later
    // spaced-repetition state; tie or missing dates → newest doc (remote) wins.
    merged[key] = isNewerTimestamp(queuedItem.lastReviewed, remoteItem.lastReviewed) ? queuedItem : remoteItem;
  }
  return merged;
}

function mergeActivityLogs(remote: unknown, queued: unknown): unknown {
  if (!Array.isArray(remote)) return queued;
  if (!Array.isArray(queued)) return remote;
  // Logs are append-only: union with de-dupe (entries from the same code path
  // serialize identically), kept in chronological order.
  const seen = new Set<string>();
  const merged: unknown[] = [];
  for (const entry of [...remote, ...queued]) {
    const key = JSON.stringify(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(entry);
  }
  merged.sort((a, b) => {
    const ta = isPlainObject(a) && typeof a.timestamp === "string" ? a.timestamp : "";
    const tb = isPlainObject(b) && typeof b.timestamp === "string" ? b.timestamp : "";
    return ta.localeCompare(tb);
  });
  return merged;
}

function unionRecordsById(remote: unknown, queued: unknown): unknown {
  if (!Array.isArray(remote)) return queued;
  if (!Array.isArray(queued)) return remote;
  // Union by id so entries added on either device survive. There is no
  // per-entry timestamp to compare, so on an id conflict the newest doc's
  // (remote's) copy wins. Note this conservatively resurrects entries the
  // offline device deleted — losing a deletion beats losing newer edits.
  const merged: unknown[] = [];
  const seen = new Set<unknown>();
  for (const remoteEntry of remote) {
    merged.push(remoteEntry);
    if (isPlainObject(remoteEntry) && remoteEntry.id !== undefined) seen.add(remoteEntry.id);
  }
  for (const queuedEntry of queued) {
    if (isPlainObject(queuedEntry) && queuedEntry.id !== undefined && seen.has(queuedEntry.id)) continue;
    merged.push(queuedEntry);
  }
  return merged;
}

// Quiz scores carry their own `date` stamp, so unlike other scalar fields the
// real winner IS knowable: an offline pre/post-test must survive another
// device merely opening the app (which re-stamps the doc's updatedAt without
// representing new quiz work).
function mergeQuizScores(remote: unknown, queued: unknown): unknown {
  if (!isPlainObject(queued)) return remote; // ambiguous queued null → keep the score that exists
  if (!isPlainObject(remote)) return queued; // remote has no score → queued is the only real attempt
  return isNewerTimestamp(queued.date, remote.date) ? queued : remote;
}

// Bookmark curation is real offline work: union each category so ids added on
// either device survive. Losing a removal beats losing a saved reference —
// the same tradeoff unionRecordsById documents. Returns the remote reference
// unchanged when the queued copy adds nothing, so the caller can skip the
// field entirely.
function mergeBookmarks(remote: unknown, queued: unknown): unknown {
  if (!isPlainObject(remote)) return queued;
  if (!isPlainObject(queued)) return remote;
  let changed = false;
  const merged: Record<string, unknown> = { ...remote };
  for (const [category, queuedList] of Object.entries(queued)) {
    if (!Array.isArray(queuedList)) continue;
    const remoteList = merged[category];
    if (!Array.isArray(remoteList)) {
      if (!Object.prototype.hasOwnProperty.call(merged, category)) {
        merged[category] = queuedList;
        changed = true;
      }
      continue;
    }
    const additions = queuedList.filter((id) => !remoteList.includes(id));
    if (additions.length > 0) {
      merged[category] = [...remoteList, ...additions];
      changed = true;
    }
  }
  return changed ? merged : remote;
}

function mergeGamification(remote: unknown, queued: unknown): unknown {
  if (!isPlainObject(remote)) return queued;
  if (!isPlainObject(queued)) return remote;
  const remoteAchievements = Array.isArray(remote.achievements) ? remote.achievements : [];
  const queuedAchievements = Array.isArray(queued.achievements) ? queued.achievements : [];
  return {
    ...queued,
    // Points and streaks are derived and ambiguous to merge → newest updatedAt
    // (remote) wins; the app recomputes points from the unioned state anyway.
    ...remote,
    // Achievements are monotonic — earned on either device stays earned.
    achievements: Array.from(new Set([...remoteAchievements, ...queuedAchievements])),
  };
}

function mergeStudentFlushPayload(remote: Record<string, unknown>, payload: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const [field, queuedValue] of Object.entries(payload)) {
    if (!Object.prototype.hasOwnProperty.call(remote, field)) {
      // Remote never saw this field; the queued value is the only copy.
      merged[field] = queuedValue;
      continue;
    }
    const remoteValue = remote[field];
    switch (field) {
      case "completedItems": merged[field] = mergeCompletedItems(remoteValue, queuedValue); break;
      case "srQueue": merged[field] = mergeSrQueues(remoteValue, queuedValue); break;
      case "activityLog": merged[field] = mergeActivityLogs(remoteValue, queuedValue); break;
      case "weeklyScores": merged[field] = mergeWeeklyScores(remoteValue, queuedValue); break;
      case "gamification": merged[field] = mergeGamification(remoteValue, queuedValue); break;
      case "patients":
      case "reflections":
        merged[field] = unionRecordsById(remoteValue, queuedValue);
        break;
      case "preScore":
      case "postScore": {
        // Per-score `date` comparison — the doc-level updatedAt is inflated by
        // routine app-open saves and must not decide whether a student's
        // offline quiz survives. Omit the field when the remote copy wins so
        // the merge write leaves it untouched.
        const winner = mergeQuizScores(remoteValue, queuedValue);
        if (winner !== remoteValue) merged[field] = winner;
        break;
      }
      case "bookmarks": {
        const union = mergeBookmarks(remoteValue, queuedValue);
        if (union !== remoteValue) merged[field] = union;
        break;
      }
      default:
        // Scalar field with no per-item timestamp or safe union (name, year,
        // authType, …): newest doc updatedAt wins, so the newer remote copy is
        // kept by omitting the stale queued value from the merge write.
        break;
    }
  }
  if (Object.keys(merged).length > 0) {
    // The unioned doc is a genuinely new state — stamp a fresh updatedAt so
    // other devices' staleness checks pick the merge up.
    merged.updatedAt = new Date().toISOString();
  }
  return merged;
}

async function flushPendingSyncQueue(): Promise<number> {
  const queue = readPendingSyncQueue();
  if (queue.length === 0) return 0;

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    emitPendingSyncChanged(queue);
    return queue.length;
  }

  const failed = new Set<PendingSyncItem>();

  for (const item of queue) {
    try {
      const { db, fs } = await getFirebase();
      if (item.kind === "setShared") {
        const field = KEY_TO_FIELD[item.key];
        if (!field) {
          // Unmapped keys can never flush (no Firestore field to write). Say
          // so instead of silently discarding the payload.
          console.warn(`Dropping queued setShared for unmapped key "${item.key}" — no Firestore field mapping:`, item.data);
          continue;
        }
        await fs.updateDoc(fs.doc(db, "rotations", item.rotationCode), { [field]: item.data });
      } else if (item.kind === "setStudentData") {
        let payload = withoutLegacyLoginPin(item.data);
        const studentRef = fs.doc(db, "rotations", item.rotationCode, "students", item.studentId);
        const remote = await readFlushRemoteDoc(fs, studentRef);
        // Legacy queue items may lack updatedAt ("" here) — treat them as
        // stale so the merge guard protects whatever remote already has.
        if (remote && isNewerTimestamp(remote.updatedAt, typeof item.updatedAt === "string" ? item.updatedAt : "")) {
          payload = mergeStudentFlushPayload(remote, payload);
        }
        if (Object.keys(payload).length > 0) {
          await fs.setDoc(studentRef, { ...payload, loginPin: fs.deleteField() }, { merge: true });
        }
      } else if (item.kind === "setTeamSnapshot") {
        const teamRef = fs.doc(db, "rotations", item.rotationCode, "team", item.studentId);
        const remote = await readFlushRemoteDoc(fs, teamRef);
        if (remote && isNewerTimestamp(remote.updatedAt, typeof item.updatedAt === "string" ? item.updatedAt : "")) {
          // Team snapshots are derived wholesale from student data; a newer
          // remote snapshot supersedes this stale queued one, so drop it.
          continue;
        }
        await fs.setDoc(teamRef, item.data, { merge: true });
      } else if (item.kind === "updateRotation") {
        await fs.updateDoc(fs.doc(db, "rotations", item.rotationCode), item.data);
      }
    } catch (error) {
      console.warn("Queued sync flush failed:", error);
      failed.add(item);
    }
  }

  // Reconcile against the LIVE queue instead of overwriting it wholesale:
  // writes queued while the flush's awaits were in flight used to be silently
  // deleted by the final overwrite. A flushed entry is dropped only if it is
  // byte-identical to the snapshot we actually wrote; anything newer (a new
  // scope, or a scope entry that absorbed more data mid-flush) survives for
  // the next flush, where the clobber guard makes re-writing it safe.
  const live = readPendingSyncQueue();
  const remaining: PendingSyncItem[] = [];
  for (const current of live) {
    const processed = queue.find((item) => sameQueueScope(item, current));
    if (!processed) {
      remaining.push(current); // queued during the flush
      continue;
    }
    if (failed.has(processed)) {
      remaining.push(current); // keep for retry (current is a superset of the failed snapshot)
      continue;
    }
    if (JSON.stringify(current) !== JSON.stringify(processed)) remaining.push(current);
  }
  // Failed items another tab removed from the live queue still need a retry.
  for (const item of failed) {
    if (!live.some((current) => sameQueueScope(current, item))) remaining.push(item);
  }

  writePendingSyncQueue(remaining);
  return remaining.length;
}

const store = {
  // ─── Private storage (always localStorage) ───────────────────────
  async get<T = unknown>(key: string): Promise<T | null> {
    return readJson<T>(key);
  },
  async set(key: string, val: unknown): Promise<void> {
    writeJson(key, val);
  },

  // ─── Shared storage (Firestore when connected, localStorage fallback) ───
  async getShared<T = unknown>(key: string): Promise<T | null> {
    if (!rotationCode) {
      return readJson<T>(key);
    }
    try {
      const { db, fs } = await getFirebase();
      // Student data lives in subcollection
      if (key.startsWith("neph_shared_student_")) {
        const studentId = key.replace("neph_shared_student_", "");
        const snap = await fs.getDoc(fs.doc(db, "rotations", rotationCode, "students", studentId));
        if (!snap.exists()) return null;
        const data = snap.data() as T;
        writeJson(key, data);
        cacheStudentDoc(rotationCode, studentId, snap.data());
        return data;
      }
      // Rotation-level data
      const field = KEY_TO_FIELD[key];
      if (!field) return null;
      const snap = await fs.getDoc(fs.doc(db, "rotations", rotationCode));
      if (!snap.exists()) return null;
      const value = (snap.data()[field] as T) ?? null;
      if (value !== null) cacheSharedValue(key, value);
      cacheRotationDoc(rotationCode, snap.data());
      return value;
    } catch (e) {
      console.warn("Firestore getShared failed, falling back to localStorage:", e);
      return readJson<T>(key);
    }
  },

  async setShared(key: string, val: FirestoreData | unknown[]): Promise<void> {
    const safeValue = key.startsWith("neph_shared_student_") && isPlainObject(val)
      ? withoutLegacyLoginPin(val)
      : val;
    cacheSharedValue(key, safeValue);
    if (!rotationCode) {
      return;
    }
    const queued: PendingSyncItem = { kind: "setShared", rotationCode, key, data: safeValue, updatedAt: new Date().toISOString() };
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queuePendingSync(queued);
      return;
    }
    try {
      const priorQueued = readQueuedSyncSnapshot(queued);
      const { db, fs } = await getFirebase();
      // Student data goes to subcollection
      if (key.startsWith("neph_shared_student_")) {
        const studentId = key.replace("neph_shared_student_", "");
        const payload = withoutLegacyLoginPin(safeValue as Record<string, unknown>);
        await fs.setDoc(
          fs.doc(db, "rotations", rotationCode, "students", studentId),
          { ...payload, loginPin: fs.deleteField() },
          { merge: true },
        );
        cacheStudentDoc(rotationCode, studentId, payload);
        settleQueuedSync(queued, priorQueued);
        return;
      }
      // Rotation-level data. Write safeValue (not raw val) so the online path
      // can never diverge from the sanitized cache/offline-queue payloads.
      const field = KEY_TO_FIELD[key];
      if (field) {
        await fs.updateDoc(fs.doc(db, "rotations", rotationCode), { [field]: safeValue });
        settleQueuedSync(queued, priorQueued);
      }
    } catch (e) {
      console.warn("Firestore setShared failed, queueing for retry:", e);
      queuePendingSync(queued);
    }
  },

  async listShared(prefix: string): Promise<string[]> {
    if (!rotationCode) {
      try { return Object.keys(localStorage).filter(k => k.startsWith(prefix)); }
      catch { return []; }
    }
    try {
      const { db, fs } = await getFirebase();
      if (prefix === "neph_shared_student_") {
        const snap = await fs.getDocs(fs.collection(db, "rotations", rotationCode, "students"));
        return snap.docs.map(d => prefix + d.id);
      }
      return [];
    } catch (e) {
      console.warn("Firestore listShared failed:", e);
      try { return Object.keys(localStorage).filter(k => k.startsWith(prefix)); }
      catch { return []; }
    }
  },

  // ─── Rotation code management ────────────────────────────────────
  setRotationCode(code: string | null) {
    rotationCode = code;
    if (code) localStorage.setItem("neph_rotationCode", code);
    else localStorage.removeItem("neph_rotationCode");
  },
  getRotationCode(): string | null {
    return rotationCode;
  },
  getPendingSyncCount(): number {
    return readPendingSyncQueue().length;
  },
  onPendingSyncChanged(callback: (count: number) => void): () => void {
    if (typeof window === "undefined") return () => {};
    const handler = (event: Event) => {
      const nextCount = event instanceof CustomEvent && typeof event.detail?.count === "number"
        ? event.detail.count
        : readPendingSyncQueue().length;
      callback(nextCount);
    };
    callback(readPendingSyncQueue().length);
    window.addEventListener(PENDING_SYNC_EVENT, handler);
    return () => window.removeEventListener(PENDING_SYNC_EVENT, handler);
  },
  async flushPendingSyncQueue(): Promise<number> {
    return flushPendingSyncQueue();
  },

  // ─── Create a new rotation document ──────────────────────────────
  async createRotation(code: string, data: Record<string, unknown>, owner: RotationOwnerSession): Promise<void> {
    const { db, fs } = await getFirebase();
    const payload = {
      ...data,
      createdAt: new Date().toISOString(),
      ownerUid: owner.uid,
      ownerEmail: normalizeRotationOwnerEmail(owner.email),
      adminUids: [owner.uid],
    };
    await fs.setDoc(fs.doc(db, "rotations", code), payload);
    await ensureRotationCodeDoc(code, owner);
    rotationCode = code;
    localStorage.setItem("neph_rotationCode", code);
    cacheRotationDoc(code, payload);
  },

  async ensureRotationOwnership(code: string, owner: RotationOwnerSession): Promise<void> {
    const { db, fs } = await getFirebase();
    const rotationRef = fs.doc(db, "rotations", code);
    const snap = await fs.getDoc(rotationRef);
    if (!snap.exists()) return;

    const patch = getRotationAccessPatch(snap.data() as Record<string, unknown>, owner);
    if (Object.keys(patch).length > 0) {
      await fs.updateDoc(rotationRef, patch);
      cacheRotationDoc(code, patch);
    }

    await ensureRotationCodeDoc(code, owner);
  },

  // ─── Read full rotation document (for hydrating admin state) ─────
  async getRotationData(code?: string | null): Promise<FirestoreData | null> {
    try {
      const docId = code || rotationCode;
      if (!docId) return null;
      const { db, fs } = await getFirebase();
      const snap = await fs.getDoc(fs.doc(db, "rotations", docId));
      if (!snap.exists()) return null;
      const data = snap.data();
      cacheRotationDoc(docId, data);
      return data;
    } catch (e) {
      console.warn("getRotationData failed:", e);
      const docId = code || rotationCode;
      return docId ? readJson<FirestoreData>(rotationDocCacheKey(docId)) : null;
    }
  },

  // ─── Validate a rotation code exists ─────────────────────────────
  async validateRotationCode(code: string): Promise<boolean> {
    try {
      const { db, fs, auth, authMod } = await getFirebase();
      const existingUser = await waitForAuthUser();
      const createdAnonymousSession = !existingUser;
      if (!existingUser) {
        await authMod.signInAnonymously(auth);
      }
      try {
        const snap = await fs.getDoc(fs.doc(db, "rotationCodes", code));
        return snap.exists();
      } finally {
        if (createdAnonymousSession && auth.currentUser?.isAnonymous) {
          try {
            await authMod.signOut(auth);
          } catch (error) {
            console.warn("Failed to clear temporary anonymous session:", error);
          }
        }
      }
    } catch { return false; }
  },

  // ─── Real-time listener: all students in a rotation ──────────────
  onStudentsChanged(callback: (students: FirestoreData[]) => void): () => void {
    if (!rotationCode) return () => {};
    let unsub: (() => void) | null = null;
    const code = rotationCode;
    getFirebase().then(({ db, fs }) => {
      unsub = fs.onSnapshot(fs.collection(db, "rotations", code, "students"), (snap) => {
        const students = snap.docs.map(d => {
          const data = { studentId: d.id, ...d.data() };
          cacheStudentDoc(code, d.id, data);
          return data;
        });
        callback(students);
      }, (err) => {
        console.warn("Students listener error:", err);
      });
    });
    return () => { unsub?.(); };
  },

  // ─── Real-time listener: sanitized team snapshots ────────────────
  onTeamSnapshotsChanged(callback: (snapshots: FirestoreData[]) => void): () => void {
    if (!rotationCode) return () => {};
    let unsub: (() => void) | null = null;
    const code = rotationCode;
    getFirebase().then(({ db, fs }) => {
      unsub = fs.onSnapshot(fs.collection(db, "rotations", code, "team"), (snap) => {
        const snapshots = snap.docs.map(d => {
          const data = { studentId: d.id, ...d.data() };
          cacheTeamDoc(code, d.id, data);
          return data;
        });
        callback(snapshots);
      }, (err) => {
        console.warn("Team listener error:", err);
      });
    });
    return () => { unsub?.(); };
  },

  // ─── Real-time listener: rotation-level data ─────────────────────
  onRotationChanged(callback: (data: FirestoreData) => void): () => void {
    if (!rotationCode) return () => {};
    let unsub: (() => void) | null = null;
    const code = rotationCode;
    getFirebase().then(({ db, fs }) => {
      unsub = fs.onSnapshot(fs.doc(db, "rotations", code), (snap) => {
        if (snap.exists()) {
          cacheRotationDoc(code, snap.data());
          callback(snap.data());
        }
      }, (err) => {
        console.warn("Rotation listener error:", err);
      });
    });
    return () => { unsub?.(); };
  },

  // ─── Real-time listener: single student document ─────────────────
  // `onRemoved` fires when the doc disappears AFTER this listener has seen it
  // exist — i.e. an in-session admin delete (Remove / recovery-away), never a
  // brand-new student whose doc hasn't been created yet. Callers use it to
  // stop auto-saves from silently resurrecting the deleted record.
  onStudentDataChanged(studentId: string, callback: (data: FirestoreData) => void, onRemoved?: () => void): () => void {
    if (!rotationCode || !studentId) return () => {};
    let unsub: (() => void) | null = null;
    let sawDoc = false;
    const code = rotationCode;
    getFirebase().then(({ db, fs }) => {
      unsub = fs.onSnapshot(fs.doc(db, "rotations", code, "students", studentId), (snap) => {
        if (snap.exists()) {
          sawDoc = true;
          cacheStudentDoc(code, studentId, snap.data());
          callback(snap.data());
        } else if (sawDoc) {
          sawDoc = false;
          onRemoved?.();
        }
      }, (err) => {
        console.warn("Student data listener error:", err);
      });
    });
    return () => { unsub?.(); };
  },

  // ─── Write student data to Firestore directly ────────────────────
  // `options.baseUpdatedAt` opts into the clobber guard: it is the remote
  // updatedAt the caller's local state is known to incorporate (null = none
  // known). When the remote doc has advanced past that base, the payload is
  // merged field-wise under the flush-guard rules instead of overwriting, so
  // a stale device's full-doc save can't erase newer cloud progress.
  async setStudentData(studentId: string, data: Record<string, unknown>, options?: { baseUpdatedAt: string | null }): Promise<StudentWriteResult> {
    if (!rotationCode) return { status: "skipped", updatedAt: null };
    let payload = stripUndefinedDeep(withoutLegacyLoginPin(data));
    cacheStudentDoc(rotationCode, studentId, payload);
    const queued: PendingSyncItem = {
      kind: "setStudentData",
      rotationCode,
      studentId,
      data: payload,
      // Guarded writes queue under their base stamp (not "now") so a later
      // flush still merges against any remote progress this device never saw.
      updatedAt: options ? options.baseUpdatedAt ?? "" : new Date().toISOString(),
    };
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queuePendingSync(queued);
      return { status: "queued", updatedAt: null };
    }
    try {
      const priorQueued = readQueuedSyncSnapshot(queued);
      const { db, fs } = await getFirebase();
      const studentRef = fs.doc(db, "rotations", rotationCode, "students", studentId);
      if (options) {
        const remote = await readFlushRemoteDoc(fs, studentRef);
        if (remote && isNewerTimestamp(remote.updatedAt, options.baseUpdatedAt ?? "")) {
          payload = mergeStudentFlushPayload(remote, payload);
          if (Object.keys(payload).length === 0) {
            // Every queued field was superseded by newer remote data — the
            // original payload's fields are settled even though nothing was
            // written.
            settleQueuedSync(queued, priorQueued);
            return { status: "skipped", updatedAt: null };
          }
          cacheStudentDoc(rotationCode, studentId, payload);
        }
      }
      await fs.setDoc(studentRef, { ...payload, loginPin: fs.deleteField() }, { merge: true });
      settleQueuedSync(queued, priorQueued);
      return { status: "applied", updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : null };
    } catch (e) {
      console.warn("setStudentData failed, queueing for retry:", e);
      queuePendingSync(queued);
      return { status: "queued", updatedAt: null };
    }
  },

  // Last updatedAt persisted in the local student-doc cache — the sync hook's
  // guard base on a cold start, before any listener snapshot has arrived.
  getCachedStudentUpdatedAt(studentId: string): string | null {
    if (!rotationCode || !studentId) return null;
    const cached = readJson<Record<string, unknown>>(studentDocCacheKey(rotationCode, studentId));
    return cached && typeof cached.updatedAt === "string" ? cached.updatedAt : null;
  },

  // The full cached copy of the student's synced doc — what this device last
  // believed the cloud held. The sync hook compares boot-loaded local patients
  // against it to spot never-synced offline work.
  getCachedStudentDoc(studentId: string): Record<string, unknown> | null {
    if (!rotationCode || !studentId) return null;
    return readJson<Record<string, unknown>>(studentDocCacheKey(rotationCode, studentId));
  },

  // Drop queued writes for a student whose cloud record an admin deleted
  // while this device was live — re-flushing them would silently resurrect
  // the deleted doc.
  discardQueuedStudentSync(studentId: string): void {
    if (!rotationCode || !studentId) return;
    const queue = readPendingSyncQueue();
    const next = queue.filter((item) =>
      !((item.kind === "setStudentData" || item.kind === "setTeamSnapshot")
        && item.rotationCode === rotationCode
        && item.studentId === studentId));
    if (next.length !== queue.length) writePendingSyncQueue(next);
  },

  // ─── Write sanitized team snapshot to Firestore ──────────────────
  async setTeamSnapshot(studentId: string, data: object): Promise<void> {
    if (!rotationCode || !studentId) return;
    const payload = data as Record<string, unknown>;
    cacheTeamDoc(rotationCode, studentId, payload);
    const queued: PendingSyncItem = { kind: "setTeamSnapshot", rotationCode, studentId, data: payload, updatedAt: new Date().toISOString() };
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queuePendingSync(queued);
      return;
    }
    try {
      const priorQueued = readQueuedSyncSnapshot(queued);
      const { db, fs } = await getFirebase();
      const teamRef = fs.doc(db, "rotations", rotationCode, "team", studentId);
      await fs.setDoc(teamRef, payload, { merge: true });
      settleQueuedSync(queued, priorQueued);
    } catch (e) {
      console.warn("setTeamSnapshot failed, queueing for retry:", e);
      queuePendingSync(queued);
    }
  },

  // ─── Read student data from Firestore (for login/restore) ────────
  async getStudentData(studentId: string): Promise<FirestoreData | null> {
    if (!rotationCode) return null;
    try {
      const { db, fs } = await getFirebase();
      const snap = await fs.getDoc(fs.doc(db, "rotations", rotationCode, "students", studentId));
      if (!snap.exists()) return null;
      const data = snap.data();
      cacheStudentDoc(rotationCode, studentId, data);
      return data;
    } catch (e) {
      console.warn("getStudentData failed:", e);
      return readJson<FirestoreData>(studentDocCacheKey(rotationCode, studentId));
    }
  },

  async getStudentAssignment(studentId: string): Promise<StudentAssignmentRecord | null> {
    if (!studentId) return null;
    try {
      const { db, fs } = await getFirebase();
      const snap = await fs.getDoc(fs.doc(db, "studentAssignments", studentId));
      if (!snap.exists()) return null;
      const record = normalizeStudentAssignmentRecord(studentId, snap.data() as Record<string, unknown>);
      if (!record) return null;
      cacheStudentAssignment(studentId, record);
      return record;
    } catch (error) {
      console.warn("getStudentAssignment failed:", error);
      return readJson<StudentAssignmentRecord>(studentAssignmentCacheKey(studentId));
    }
  },

  async setStudentAssignment(studentId: string, data: { activeRotationCode: string; email?: string }): Promise<void> {
    const activeRotationCode = normalizeRotationCodeValue(data.activeRotationCode);
    if (!studentId || !activeRotationCode) return;

    const existing = await this.getStudentAssignment(studentId);
    const record: StudentAssignmentRecord = {
      studentId,
      activeRotationCode,
      rotationCodes: Array.from(new Set([...(existing?.rotationCodes || []), activeRotationCode])).slice(-10),
      updatedAt: new Date().toISOString(),
      ...(typeof data.email === "string" && data.email.trim() ? { email: data.email.trim().toLowerCase() } : existing?.email ? { email: existing.email } : {}),
    };
    cacheStudentAssignment(studentId, record);

    try {
      const { db, fs } = await getFirebase();
      await fs.setDoc(fs.doc(db, "studentAssignments", studentId), record, { merge: true });
    } catch (error) {
      console.warn("setStudentAssignment failed:", error);
    }
  },

  // ─── Read all students for any rotation (historical analytics) ──
  async getStudentsForRotation(code: string): Promise<FirestoreData[]> {
    try {
      const { db, fs } = await getFirebase();
      const snap = await fs.getDocs(fs.collection(db, "rotations", code, "students"));
      return snap.docs.map((doc) => ({ studentId: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn("getStudentsForRotation failed:", e);
      return [];
    }
  },

  // ─── List all rotations ─────────────────────────────────────────
  async listRotations(): Promise<RotationInfo[]> {
    try {
      const adminUser = await getCurrentAdminUser();
      if (!adminUser) return [];
      const { db, fs } = await getFirebase();
      const rotationCollection = fs.collection(db, "rotations");
      const masterAdmin = isBootstrapAdminEmail(adminUser.email || "");

      // Master admin sees every rotation; ordinary admins only see rotations
      // they own or are listed on.
      type RotationDoc = Awaited<ReturnType<typeof fs.getDocs>>["docs"][number];
      const docs = new Map<string, RotationDoc>();

      if (masterAdmin) {
        const allSnap = await fs.getDocs(rotationCollection);
        allSnap.docs.forEach((doc) => docs.set(doc.id, doc));
      } else {
        // Only query shapes the Firestore list rule can PROVE are allowed:
        // array-contains on adminUids and equality on ownerUid. (An ownerEmail
        // query is unprovable — the rule would need .lower() on resource data —
        // and one denied query used to reject the whole Promise.all, so admins
        // saw an empty list. allSettled keeps one failure from hiding the rest.)
        const results = await Promise.allSettled([
          fs.getDocs(fs.query(rotationCollection, fs.where("adminUids", "array-contains", adminUser.uid))),
          fs.getDocs(fs.query(rotationCollection, fs.where("ownerUid", "==", adminUser.uid))),
        ]);
        results.forEach((result) => {
          if (result.status === "fulfilled") {
            result.value.docs.forEach((doc) => docs.set(doc.id, doc));
          } else {
            console.warn("listRotations query failed:", result.reason);
          }
        });
      }

      const rotations = await Promise.all(Array.from(docs.values()).map(async d => {
        const data = d.data() as FirestoreData;
        let studentCount = 0;
        try {
          const studentsSnap = await fs.getDocs(fs.collection(db, "rotations", d.id, "students"));
          studentCount = studentsSnap.size;
        } catch (e) {
          console.warn("listRotations student count failed:", e);
        }
        return {
          code: d.id,
          name: data.name || "Untitled",
          createdAt: data.createdAt || null,
          location: data.location || "",
          dates: data.dates || "",
          studentCount,
          ownerEmail: typeof data.ownerEmail === "string" ? data.ownerEmail : "",
          ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : "",
        };
      }));
      rotations.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      return rotations;
    } catch (e) {
      console.warn("listRotations failed:", e);
      return [];
    }
  },

  // ─── Update rotation metadata ───────────────────────────────────
  async updateRotation(code: string, data: Record<string, unknown>): Promise<void> {
    cacheRotationDoc(code, data);
    const queued: PendingSyncItem = { kind: "updateRotation", rotationCode: code, data, updatedAt: new Date().toISOString() };
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queuePendingSync(queued);
      return;
    }
    try {
      const priorQueued = readQueuedSyncSnapshot(queued);
      const { db, fs } = await getFirebase();
      await fs.updateDoc(fs.doc(db, "rotations", code), data);
      settleQueuedSync(queued, priorQueued);
    } catch (e) {
      console.warn("updateRotation failed, queueing for retry:", e);
      queuePendingSync(queued);
    }
  },

  // ─── Delete a single student document ───────────────────────────
  async deleteStudentData(studentId: string): Promise<void> {
    if (!rotationCode || !studentId) return;
    try {
      const { db, fs } = await getFirebase();
      await fs.deleteDoc(fs.doc(db, "rotations", rotationCode, "students", studentId));
      await fs.deleteDoc(fs.doc(db, "rotations", rotationCode, "team", studentId));
    } catch (e) {
      console.warn("deleteStudentData failed:", e);
      throw e;
    }
  },

  // ─── Delete rotation and its students ───────────────────────────
  async deleteRotation(code: string): Promise<void> {
    try {
      const { db, fs } = await getFirebase();
      // Delete all students in subcollection first
      const studentsSnap = await fs.getDocs(fs.collection(db, "rotations", code, "students"));
      for (const s of studentsSnap.docs) {
        await fs.deleteDoc(fs.doc(db, "rotations", code, "students", s.id));
      }
      const teamSnap = await fs.getDocs(fs.collection(db, "rotations", code, "team"));
      for (const s of teamSnap.docs) {
        await fs.deleteDoc(fs.doc(db, "rotations", code, "team", s.id));
      }
      // Delete rotation doc
      await fs.deleteDoc(fs.doc(db, "rotations", code));
      await fs.deleteDoc(fs.doc(db, "rotationCodes", code));
      // If this was the active rotation, disconnect
      if (rotationCode === code) {
        rotationCode = null;
        localStorage.removeItem("neph_rotationCode");
      }
      localStorage.removeItem(rotationDocCacheKey(code));
    } catch (e) {
      console.warn("deleteRotation failed:", e);
      throw e;
    }
  },
};

export default store;
