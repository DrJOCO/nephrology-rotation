const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

async function loadFirebase() {
  const [{ initializeApp, getApps }, fs] = await Promise.all([
    import("firebase/app"),
    import("firebase/firestore"),
  ]);
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  return { db: fs.getFirestore(app), fs };
}

let _promise: ReturnType<typeof loadFirebase> | null = null;

/** Lazily loads Firebase SDK on first use — keeps it out of the initial bundle */
export function getFirebase() {
  if (!_promise) {
    _promise = loadFirebase();
  }
  return _promise;
}
