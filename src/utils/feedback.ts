// One-tap student feedback ("this page confused me") — a standalone module
// that deliberately stays out of store.ts's pending-sync queue. Writes go to
// rotations/{code}/feedback/{autoId}. Offline/failed sends are parked in their
// own localStorage queue and retried on `online` events / app load, mirroring
// the read/write-with-try/catch idiom used throughout the codebase.
import { getFirebase } from "./firebase";
import store from "./store";

// Named distinctly from data/feedbackTags.ts's FEEDBACK_TAGS, which is an
// unrelated feature (attending-authored feedback tags about a student).
export const STUDENT_FEEDBACK_TAGS = ["Confusing", "Broken", "Idea", "Love it"] as const;
export type FeedbackTagValue = typeof STUDENT_FEEDBACK_TAGS[number];

export const FEEDBACK_NOTE_MAX = 500;

export interface StudentFeedbackEntry {
  studentId: string;
  name: string;
  page: string;
  tag: FeedbackTagValue;
  note?: string;
  createdAt: string;
}

export interface StoredFeedbackEntry extends StudentFeedbackEntry {
  id: string;
}

const PENDING_FEEDBACK_KEY = "neph_pendingFeedback";
const PENDING_FEEDBACK_MAX = 20;

interface QueuedFeedback {
  rotationCode: string;
  entry: StudentFeedbackEntry;
}

function readPendingQueue(): QueuedFeedback[] {
  try {
    const raw = localStorage.getItem(PENDING_FEEDBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePendingQueue(queue: QueuedFeedback[]): void {
  try {
    // Cap at 20 — drop the oldest so a long stretch offline doesn't grow this
    // without bound. Oldest-first eviction matches "most recent signal wins."
    const capped = queue.slice(-PENDING_FEEDBACK_MAX);
    localStorage.setItem(PENDING_FEEDBACK_KEY, JSON.stringify(capped));
  } catch {
    // Storage full/unavailable — nothing more we can do here.
  }
}

function queueFeedback(rotationCode: string, entry: StudentFeedbackEntry): void {
  const queue = readPendingQueue();
  queue.push({ rotationCode, entry });
  writePendingQueue(queue);
}

/** Removes `undefined`/empty-string `note` — Firestore rejects undefined fields. */
function buildEntryPayload(entry: StudentFeedbackEntry): Record<string, unknown> {
  const { studentId, name, page, tag, note, createdAt } = entry;
  return {
    studentId,
    name,
    page,
    tag,
    createdAt,
    ...(note && note.trim() ? { note: note.trim().slice(0, FEEDBACK_NOTE_MAX) } : {}),
  };
}

async function writeFeedbackDoc(rotationCode: string, entry: StudentFeedbackEntry): Promise<void> {
  const { db, fs } = await getFirebase();
  await fs.addDoc(fs.collection(db, "rotations", rotationCode, "feedback"), buildEntryPayload(entry));
}

/**
 * Submits one feedback entry. Writes immediately when online; on failure (or
 * while offline) parks it in the retry queue instead of losing it. Returns
 * whether the entry reached Firestore or was queued for later.
 */
export async function submitStudentFeedback(
  rotationCode: string,
  entry: StudentFeedbackEntry,
): Promise<{ status: "sent" | "queued" }> {
  // "View as student" preview: this module bypasses store.ts, so the store's
  // preview write guards don't cover it. An admin tapping Send in the sandbox
  // must neither write real feedback nor pollute the device's retry queue —
  // the preview banner already promises "nothing is saved".
  if (store.isPreview()) return { status: "sent" };
  if (!rotationCode) {
    // No rotation connected — there's no destination collection to retry
    // against later, so there's nothing useful to queue. This shouldn't
    // happen in practice (the feedback button only shows once a student is
    // signed into a rotation).
    return { status: "queued" };
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    queueFeedback(rotationCode, entry);
    return { status: "queued" };
  }

  try {
    await writeFeedbackDoc(rotationCode, entry);
    return { status: "sent" };
  } catch (error) {
    console.warn("Student feedback send failed; queued for retry:", error);
    queueFeedback(rotationCode, entry);
    return { status: "queued" };
  }
}

/** Number of feedback entries currently queued for retry (badge/banner use). */
export function getPendingFeedbackCount(): number {
  return readPendingQueue().length;
}

/**
 * Retries queued feedback sends. Called on `online` events and on app load.
 * Leaves still-failing entries in the queue for the next retry.
 */
export async function flushPendingFeedback(): Promise<number> {
  if (store.isPreview()) return 0;
  // The mount-time flush and an `online`-event flush can overlap; without this
  // guard both would read the same queue and double-send every entry (addDoc
  // has no idempotency key, so duplicates would reach the admin surface).
  if (flushInFlight) return readPendingQueue().length;
  flushInFlight = true;
  try {
    return await flushPendingFeedbackInner();
  } finally {
    flushInFlight = false;
  }
}

let flushInFlight = false;

async function flushPendingFeedbackInner(): Promise<number> {
  const queue = readPendingQueue();
  if (queue.length === 0) return 0;

  const remaining: QueuedFeedback[] = [];
  for (const item of queue) {
    // Defensive: a malformed/legacy queue entry with no rotation code has no
    // destination to retry against — drop it rather than retrying forever.
    if (!item.rotationCode) continue;
    try {
      await writeFeedbackDoc(item.rotationCode, item.entry);
    } catch (error) {
      console.warn("Retry of queued student feedback failed:", error);
      remaining.push(item);
    }
  }
  writePendingQueue(remaining);
  return remaining.length;
}

// ─── Admin: one-shot fetch + delete ─────────────────────────────────
// No realtime listener — the admin surface fetches on section open and via an
// explicit refresh button (spec'd behavior), keeping this cheap on reads.

export async function listRotationFeedback(rotationCode: string): Promise<StoredFeedbackEntry[]> {
  if (!rotationCode) return [];
  const { db, fs } = await getFirebase();
  const snap = await fs.getDocs(fs.collection(db, "rotations", rotationCode, "feedback"));
  return snap.docs
    .map((docSnap) => {
      const data = docSnap.data() as Partial<StudentFeedbackEntry>;
      return {
        id: docSnap.id,
        studentId: typeof data.studentId === "string" ? data.studentId : "",
        name: typeof data.name === "string" ? data.name : "Unknown",
        page: typeof data.page === "string" ? data.page : "",
        tag: (STUDENT_FEEDBACK_TAGS as readonly string[]).includes(data.tag as string) ? (data.tag as FeedbackTagValue) : "Idea",
        ...(typeof data.note === "string" && data.note ? { note: data.note } : {}),
        createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
      } satisfies StoredFeedbackEntry;
    })
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function deleteRotationFeedback(rotationCode: string, entryId: string): Promise<void> {
  const { db, fs } = await getFirebase();
  await fs.deleteDoc(fs.doc(db, "rotations", rotationCode, "feedback", entryId));
}
