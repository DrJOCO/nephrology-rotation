// Single Admin SDK app + Firestore handle shared by every function. Initializing
// once (guarded against re-init) avoids "app already exists" errors when several
// triggers load in the same runtime instance.
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) {
  initializeApp();
}

export const db = getFirestore();
