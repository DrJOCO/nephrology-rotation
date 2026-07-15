// Cloud Functions entrypoint (WS-4). Each trigger lives in its own module and is
// re-exported here — the Firebase runtime discovers functions by the names
// exported from this file.
//
// Default region for all functions. us-central1 is Firestore's default GCP
// region for this project; keeping functions co-located minimizes trigger
// latency. Set once here so every function inherits it.
import { setGlobalOptions } from "firebase-functions/v2";

setGlobalOptions({ region: "us-central1", maxInstances: 10 });

export { onRotationDeleted } from "./onRotationDeleted.js";
export { onStudentWrite } from "./onStudentWrite.js";
export { onFeedbackCreate } from "./onFeedbackCreate.js";
export { onAdminInviteCreated } from "./onAdminInviteCreated.js";
