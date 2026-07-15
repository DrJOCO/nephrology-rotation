// Batched delete of a collection's documents. Cloud Functions have no
// server-side "delete a whole subcollection" primitive, so we page through the
// docs and commit deletes in batches (Firestore caps a batch at 500 writes).
//
// This is used by onRotationDeleted for best-effort cleanup of a deleted
// rotation's subcollections. It is deliberately shallow — the rotation
// subcollections here (students/team/studentTombstones/feedback) hold no
// nested subcollections of their own, so there is nothing deeper to recurse
// into. If that ever changes, recurse per-doc before deleting the doc.
import type {
  CollectionReference,
  DocumentData,
  Firestore,
} from "firebase-admin/firestore";

const DELETE_BATCH_SIZE = 300;

export async function deleteCollection(
  db: Firestore,
  collection: CollectionReference<DocumentData>,
): Promise<number> {
  let deleted = 0;
  // Loop until a page comes back smaller than the batch size, i.e. we drained
  // the collection. Re-querying each pass (rather than one giant read) keeps
  // memory bounded even for a rotation with many hundreds of students.
  for (;;) {
    const snap = await collection.limit(DELETE_BATCH_SIZE).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snap.size;
    if (snap.size < DELETE_BATCH_SIZE) break;
  }
  return deleted;
}
