import type { User } from "firebase/auth";

const STUDENT_EMAIL_LINK_KEY = "neph_emailForSignIn";

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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getStudentEmailLinkUrl(): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function getSavedStudentSignInEmail(): string {
  if (typeof window === "undefined") return "";
  return normalizeEmail(window.localStorage.getItem(STUDENT_EMAIL_LINK_KEY) || "");
}

export function clearSavedStudentSignInEmail(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STUDENT_EMAIL_LINK_KEY);
}

export async function getCurrentStudentUser(): Promise<User | null> {
  const user = await waitForAuthUser();
  if (!user) return null;
  if (!user.isAnonymous) {
    try {
      if (await hasAdminDoc(user.uid)) return null;
    } catch (error) {
      console.warn("Student auth check failed:", error);
    }
  }
  return user;
}

export async function ensureGuestStudentSession(): Promise<User> {
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

export async function isStudentEmailLink(url = (typeof window !== "undefined" ? window.location.href : "")): Promise<boolean> {
  if (!url) return false;
  const { auth, authMod } = await getFirebase();
  return authMod.isSignInWithEmailLink(auth, url);
}

export async function sendStudentSignInLink(email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const { auth, authMod } = await getFirebase();
  await authMod.sendSignInLinkToEmail(auth, normalizedEmail, {
    url: getStudentEmailLinkUrl(),
    handleCodeInApp: true,
  });
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STUDENT_EMAIL_LINK_KEY, normalizedEmail);
  }
}

export async function completeStudentSignInLink(
  email: string,
  url = (typeof window !== "undefined" ? window.location.href : ""),
): Promise<User> {
  const normalizedEmail = normalizeEmail(email);
  const { auth, authMod } = await getFirebase();
  if (!authMod.isSignInWithEmailLink(auth, url)) {
    throw new Error("auth/invalid-action-link");
  }

  let user: User;
  if (auth.currentUser?.isAnonymous) {
    const credential = authMod.EmailAuthProvider.credentialWithLink(normalizedEmail, url);
    const linked = await authMod.linkWithCredential(auth.currentUser, credential);
    user = linked.user;
  } else {
    const cred = await authMod.signInWithEmailLink(auth, normalizedEmail, url);
    user = cred.user;
  }

  clearSavedStudentSignInEmail();
  return user;
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
