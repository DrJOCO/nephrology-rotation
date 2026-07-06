// Backstop cleanup of a deleted rotation's subcollections.
//
// The client (store.deleteRotation) still enumerates and deletes students,
// team, and studentTombstones itself so OLD clients keep working after this
// deploys. But the client loop is best-effort: it can be interrupted, it never
// touched `feedback` at all, and a partial network failure leaves orphans.
// This trigger fires when the rotation doc is deleted and sweeps every known
// subcollection so nothing is left behind. Deleting the rotation doc does NOT
// cascade to subcollections in Firestore — that is exactly why this exists.
import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db } from "./admin.js";
import { deleteCollection } from "./lib/deleteCollection.js";

// Every subcollection a rotation can own. Keep in sync with the paths written
// under rotations/{code}/ elsewhere in the app.
const ROTATION_SUBCOLLECTIONS = [
  "students",
  "team",
  "studentTombstones",
  "feedback",
  "feedbackAbuse",
] as const;

export const onRotationDeleted = onDocumentDeleted(
  "rotations/{code}",
  async (event) => {
    const code = event.params.code;
    for (const name of ROTATION_SUBCOLLECTIONS) {
      try {
        const removed = await deleteCollection(
          db,
          db.collection("rotations").doc(code).collection(name),
        );
        if (removed > 0) {
          logger.info("onRotationDeleted swept subcollection", {
            code,
            subcollection: name,
            removed,
          });
        }
      } catch (err) {
        // Best-effort: one failing subcollection must not abort the rest.
        logger.error("onRotationDeleted subcollection cleanup failed", {
          code,
          subcollection: name,
          err,
        });
      }
    }
  },
);
