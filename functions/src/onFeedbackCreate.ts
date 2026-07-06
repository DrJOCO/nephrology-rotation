// Server-side re-validation + per-student rate limiting for student feedback.
//
// Security rules already validate feedback shape on the client write, but rules
// cannot count prior documents, so an abusive client could spam the collection.
// This trigger:
//   1. Re-validates length/shape server-side (defence in depth) and deletes an
//      entry that is malformed or oversized.
//   2. Counts today's entries for the same studentId; past the daily cap it
//      deletes the excess entry and writes a feedbackAbuse/{studentId} marker
//      under the rotation so an admin can see who tripped the limit.
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import type { DocumentData, Firestore } from "firebase-admin/firestore";
import { db } from "./admin.js";

// Kept in lockstep with the client (src/utils/feedback.ts) and firestore.rules.
const VALID_TAGS = ["Confusing", "Broken", "Idea", "Love it"];
const NOTE_MAX = 500;
const NAME_MAX = 50;
const PAGE_MAX = 100;
const CREATED_AT_MAX = 40;

// Per-student per-day ceiling. The spec says ">20/day" trips abuse handling, so
// the 21st entry in a UTC day is the first deleted one.
export const FEEDBACK_DAILY_LIMIT = 20;

// Shape check mirroring hasValidStudentFeedback() in firestore.rules. Returns
// true when the doc is well-formed and within limits.
export function isValidFeedback(data: DocumentData): boolean {
  if (typeof data.studentId !== "string" || data.studentId.length === 0) return false;
  if (typeof data.name !== "string" || data.name.length === 0 || data.name.length > NAME_MAX) return false;
  if (typeof data.page !== "string" || data.page.length === 0 || data.page.length > PAGE_MAX) return false;
  if (typeof data.tag !== "string" || !VALID_TAGS.includes(data.tag)) return false;
  if (typeof data.createdAt !== "string" || data.createdAt.length === 0 || data.createdAt.length > CREATED_AT_MAX) return false;
  if (data.note !== undefined && (typeof data.note !== "string" || data.note.length > NOTE_MAX)) return false;
  return true;
}

// UTC day bounds as ISO strings, so we can range-query the string createdAt
// field lexicographically (ISO-8601 sorts chronologically as text).
export function utcDayBounds(now: Date): { start: string; end: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

// Outcome of processing one created feedback doc — surfaced for tests.
export type FeedbackOutcome = "kept" | "deleted-malformed" | "rate-limited";

// Core handler decoupled from the trigger wrapper. Takes the entry data plus a
// live ref-getter so it can run against a fake Firestore in unit tests.
export async function processFeedbackCreate(
  firestore: Firestore,
  code: string,
  entryRef: { delete(): Promise<unknown> },
  data: DocumentData,
  now: Date,
): Promise<FeedbackOutcome> {
  // 1. Shape/length re-validation. A malformed doc gets removed outright.
  if (!isValidFeedback(data)) {
    await entryRef.delete();
    return "deleted-malformed";
  }

  // 2. Per-student daily rate limit. Count today's entries for this student; if
  //    this one pushes the total over the cap, delete it and flag abuse.
  const studentId = data.studentId as string;
  const { start, end } = utcDayBounds(now);
  const todaySnap = await firestore
    .collection("rotations").doc(code).collection("feedback")
    .where("studentId", "==", studentId)
    .where("createdAt", ">=", start)
    .where("createdAt", "<", end)
    .get();

  // todaySnap includes this just-created entry. Over the cap => it's excess.
  if (todaySnap.size > FEEDBACK_DAILY_LIMIT) {
    await entryRef.delete();
    await firestore
      .collection("rotations").doc(code).collection("feedbackAbuse").doc(studentId)
      .set(
        {
          studentId,
          name: typeof data.name === "string" ? data.name : "",
          lastBlockedAt: now.toISOString(),
          dailyLimit: FEEDBACK_DAILY_LIMIT,
        },
        { merge: true },
      );
    return "rate-limited";
  }
  return "kept";
}

export const onFeedbackCreate = onDocumentCreated(
  "rotations/{code}/feedback/{entryId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const code = event.params.code;
    const entryId = event.params.entryId;
    try {
      const outcome = await processFeedbackCreate(db, code, snap.ref, snap.data(), new Date());
      if (outcome === "deleted-malformed") {
        logger.warn("onFeedbackCreate deleted malformed feedback", { code, entryId });
      } else if (outcome === "rate-limited") {
        logger.warn("onFeedbackCreate rate-limited student", { code, studentId: snap.data().studentId });
      }
    } catch (err) {
      // A missing composite index (studentId + createdAt) surfaces here; log so
      // it's diagnosable, but never resurrect a valid entry on failure.
      logger.error("onFeedbackCreate processing failed", { code, entryId, err });
    }
  },
);
