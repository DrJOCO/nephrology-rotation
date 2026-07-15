// Maintains two aggregate fields ON the rotation doc:
//   studentCount            — number of docs in rotations/{code}/students
//   lastStudentActivityAt   — ISO timestamp of the most recent student write
//
// Client reads (store.listRotations) use studentCount to avoid an N+1
// getDocs-per-rotation fan-out. The field is written ONLY by this trigger.
//
// Security rules note: the client update rule for the rotation doc restricts
// admins to a fixed key allowlist that does NOT include studentCount /
// lastStudentActivityAt. That is fine and intentional — the Admin SDK bypasses
// security rules entirely, so no rules change is needed for this to write.
// (A client CANNOT forge these fields, which is the point.)
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import type { Firestore } from "firebase-admin/firestore";
import { db } from "./admin.js";

// The +1 / -1 / 0 delta from an existence transition. Exported for direct test.
export function studentCountDelta(existedBefore: boolean, existsAfter: boolean): number {
  if (!existedBefore && existsAfter) return 1;
  if (existedBefore && !existsAfter) return -1;
  return 0;
}

// Core aggregate update, decoupled from the trigger wrapper so it can be tested
// against a fake Firestore without booting an emulator. Clamps the count at 0
// (a stored count can drift, e.g. a delete processed before its create) and
// no-ops when the rotation doc is gone.
//
// Seeding: a rotation that predates this function's deploy (e.g. a live
// cohort with students already enrolled) has no studentCount field. Applying
// the ±1 delta to a base of 0 would persist a WRONG count — and once the
// field exists, the client's missing-field fallback can no longer correct it.
// So the first write for such a rotation counts the students collection
// inside the transaction instead; the trigger fires after the student doc
// write, so the collection size already reflects it and the delta must NOT
// be applied on top.
export async function applyStudentAggregate(
  firestore: Firestore,
  code: string,
  delta: number,
  nowIso: string,
): Promise<void> {
  const rotationRef = firestore.collection("rotations").doc(code);
  await firestore.runTransaction(async (tx) => {
    const rotationSnap = await tx.get(rotationRef);
    // Rotation doc gone (e.g. a student delete racing the rotation delete):
    // nothing to aggregate onto, and onRotationDeleted sweeps the rest.
    if (!rotationSnap.exists) return;

    const prev = rotationSnap.get("studentCount");
    const next = typeof prev === "number" && prev >= 0
      ? Math.max(0, prev + delta)
      : (await tx.get(rotationRef.collection("students"))).size;

    tx.update(rotationRef, {
      studentCount: next,
      lastStudentActivityAt: nowIso,
    });
  });
}

export const onStudentWrite = onDocumentWritten(
  "rotations/{code}/students/{id}",
  async (event) => {
    const code = event.params.code;
    const delta = studentCountDelta(
      event.data?.before.exists ?? false,
      event.data?.after.exists ?? false,
    );
    try {
      // Transaction (inside applyStudentAggregate) so two concurrent student
      // writes can't lose an increment.
      await applyStudentAggregate(db, code, delta, new Date().toISOString());
    } catch (err) {
      logger.error("onStudentWrite aggregate update failed", { code, err });
    }
  },
);
