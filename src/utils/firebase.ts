import type { User } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

async function loadFirebase() {
  const [{ initializeApp, getApps }, fs, authMod] = await Promise.all([
    import("firebase/app"),
    import("firebase/firestore"),
    import("firebase/auth"),
  ]);
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  return { db: fs.getFirestore(app), fs, auth: authMod.getAuth(app), authMod };
}

let _promise: ReturnType<typeof loadFirebase> | null = null;

/** Lazily loads Firebase SDK on first use — keeps it out of the initial bundle */
export function getFirebase() {
  if (!_promise) {
    _promise = loadFirebase();
  }
  return _promise;
}

export async function waitForAuthUser(): Promise<User | null> {
  const { auth, authMod } = await getFirebase();
  if (auth.currentUser) return auth.currentUser;
  return await new Promise(resolve => {
    const unsub = authMod.onAuthStateChanged(auth, user => {
      unsub();
      resolve(user);
    });
  });
}

export async function ensureStudentSession(): Promise<User> {
  const { auth, authMod } = await getFirebase();
  await waitForAuthUser();
  if (auth.currentUser?.isAnonymous) return auth.currentUser;
  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    await authMod.signOut(auth);
  }
  const cred = await authMod.signInAnonymously(auth);
  return cred.user;
}

async function hasAdminDoc(uid: string): Promise<boolean> {
  const { db, fs } = await getFirebase();
  const snap = await fs.getDoc(fs.doc(db, "admins", uid));
  return snap.exists();
}

export async function getCurrentAdminUser(): Promise<User | null> {
  const user = await waitForAuthUser();
  if (!user || user.isAnonymous) return null;
  return (await hasAdminDoc(user.uid)) ? user : null;
}

export async function signInAdmin(email: string, password: string): Promise<User> {
  const { auth, authMod } = await getFirebase();
  const cred = await authMod.signInWithEmailAndPassword(auth, email, password);
  const authorized = await hasAdminDoc(cred.user.uid);
  if (!authorized) {
    await authMod.signOut(auth);
    throw new Error("admin/unauthorized");
  }
  return cred.user;
}

export async function signOutFirebase(): Promise<void> {
  const { auth, authMod } = await getFirebase();
  await authMod.signOut(auth);
}
