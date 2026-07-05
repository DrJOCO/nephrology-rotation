// One-tap student feedback ("this page confused me") — a standalone module so
// it stays out of store.ts's pending-sync queue (which another agent is
// refactoring in parallel). Writes go to rotations/{code}/feedback/{autoId}.
// Offline/failed sends are parked in their own localStorage queue and retried
// on `online` events / app load, mirroring the read/write-with-try/catch idiom
// used throughout the codebase (see store.ts's pending-sync queue).
import { getFirebase } from "./firebase";

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
