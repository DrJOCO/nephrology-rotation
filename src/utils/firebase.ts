import type { User } from "firebase/auth";

const STUDENT_EMAIL_LINK_KEY = "neph_emailForSignIn";
export const STUDENT_AUTH_PIN_LENGTH = 4;

export interface AdminInviteRecord {
  email: string;
  createdAt: string;
  createdByUid: string;
  createdByEmail?: string;
  status?: "pending" | "claimed";
  claimedAt?: string;
  claimedByUid?: string;
  claimedByEmail?: string;
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const BOOTSTRAP_ADMIN_EMAILS = new Set(["joncheng5@gmail.com"]);
const BOOTSTRAP_ADMIN_LEGACY_UIDS: Record<string, string[]> = {
  "joncheng5@gmail.com": ["aXjhgOzT0mPQt97bGMqR4CHI1jp1"],
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

export function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase();
}

export function isBootstrapAdminEmail(email: string): boolean {
  return BOOTSTRAP_ADMIN_EMAILS.has(normalizeEmailAddress(email));
}

export function getBootstrapAdminLegacyUids(email: string): string[] {
  return BOOTSTRAP_ADMIN_LEGACY_UIDS[normalizeEmailAddress(email)] || [];
}

export function normalizeStudentPinInput(pin: string): string {
  return pin.replace(/\D/g, "").slice(0, STUDENT_AUTH_PIN_LENGTH);
}

function buildStudentPinPassword(pin: string): string {
  const normalizedPin = normalizeStudentPinInput(pin);
  if (normalizedPin.length !== STUDENT_AUTH_PIN_LENGTH) {
    throw new Error("auth/invalid-pin");
  }
  return `student-pin:${normalizedPin}:neph`;
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
  return normalizeEmailAddress(window.localStorage.getItem(STUDENT_EMAIL_LINK_KEY) || "");
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

async function ensureBootstrapAdminDoc(user: User): Promise<boolean> {
  const normalizedEmail = normalizeEmailAddress(user.email || "");
  if (!normalizedEmail || !isBootstrapAdminEmail(normalizedEmail)) return false;
  if (await hasAdminDoc(user.uid)) return true;

  try {
    const { db, fs } = await getFirebase();
    await fs.setDoc(fs.doc(db, "admins", user.uid), {
      email: normalizedEmail,
      createdAt: new Date().toISOString(),
      legacyOwner: true,
    });
    return true;
  } catch (error) {
    console.warn("Bootstrap admin doc write failed; continuing:", error);
    // If the write was blocked by rules but an admin doc already exists, treat as authorized.
    return await hasAdminDoc(user.uid).catch(() => false);
  }
}

async function claimAdminInviteForUser(user: User): Promise<boolean> {
  const normalizedEmail = normalizeEmailAddress(user.email || "");
  if (!normalizedEmail) return false;

  let inviteData: Partial<AdminInviteRecord> | null = null;
  try {
    const { db, fs } = await getFirebase();
    const inviteRef = fs.doc(db, "adminInvites", normalizedEmail);
    const inviteSnap = await fs.getDoc(inviteRef);
    if (!inviteSnap.exists()) return false;
    inviteData = inviteSnap.data() as Partial<AdminInviteRecord>;

    const now = new Date().toISOString();
    await fs.setDoc(fs.doc(db, "admins", user.uid), {
      email: normalizedEmail,
      createdAt: now,
      ...(typeof inviteData.createdByUid === "string" ? { invitedByUid: inviteData.createdByUid } : {}),
      ...(typeof inviteData.createdByEmail === "string" ? { invitedByEmail: inviteData.createdByEmail } : {}),
    }, { merge: true });

    await fs.setDoc(inviteRef, {
      claimedAt: now,
      claimedByUid: user.uid,
      claimedByEmail: normalizedEmail,
      status: "claimed",
    } satisfies Partial<AdminInviteRecord>, { merge: true });

    return true;
  } catch (error) {
    console.warn("Admin invite claim failed; continuing:", error);
    // Even if we couldn't update the invite, the user may already have an admin doc.
    return await hasAdminDoc(user.uid).catch(() => false);
  }
}

async function authorizeAdminUser(user: User): Promise<boolean> {
  try {
    if (await hasAdminDoc(user.uid)) return true;
  } catch (error) {
    console.warn("Admin doc lookup failed:", error);
  }
  try {
    if (await ensureBootstrapAdminDoc(user)) return true;
  } catch (error) {
    console.warn("Bootstrap admin path failed:", error);
  }
  try {
    if (await claimAdminInviteForUser(user)) return true;
  } catch (error) {
    console.warn("Invite admin path failed:", error);
  }
  // Final fallback: if any path wrote the doc before erroring, accept it.
  return await hasAdminDoc(user.uid).catch(() => false);
}

export async function isStudentEmailLink(url = (typeof window !== "undefined" ? window.location.href : "")): Promise<boolean> {
  if (!url) return false;
  const { auth, authMod } = await getFirebase();
  return authMod.isSignInWithEmailLink(auth, url);
}

export async function sendStudentSignInLink(email: string): Promise<void> {
  const normalizedEmail = normalizeEmailAddress(email);
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
): Promise<{ user: User; isNewUser: boolean }> {
  const normalizedEmail = normalizeEmailAddress(email);
  const { auth, authMod } = await getFirebase();
  if (!authMod.isSignInWithEmailLink(auth, url)) {
    throw new Error("auth/invalid-action-link");
  }

  let user: User;
  let isNewUser = false;
  if (auth.currentUser?.isAnonymous) {
    const credential = authMod.EmailAuthProvider.credentialWithLink(normalizedEmail, url);
    // linkWithCredential throws auth/credential-already-in-use if the email is already
    // owned by a different Firebase Auth user — Firebase enforces email uniqueness for us.
    const linked = await authMod.linkWithCredential(auth.currentUser, credential);
    user = linked.user;
    isNewUser = authMod.getAdditionalUserInfo(linked)?.isNewUser ?? true;
  } else {
    const cred = await authMod.signInWithEmailLink(auth, normalizedEmail, url);
    user = cred.user;
    isNewUser = authMod.getAdditionalUserInfo(cred)?.isNewUser ?? false;
  }

  // Block cross-role takeover: an admin's email must not get hijacked into a student.
  let isAdmin = false;
  try {
    isAdmin = await hasAdminDoc(user.uid);
  } catch (error) {
    console.warn("Admin role check during email-link sign-in failed:", error);
  }
  if (isAdmin) {
    await authMod.signOut(auth);
    throw new Error("student/unauthorized");
  }

  clearSavedStudentSignInEmail();
  return { user, isNewUser };
}

export async function signInStudentWithPin(email: string, pin: string): Promise<User> {
  const normalizedEmail = normalizeEmailAddress(email);
  const password = buildStudentPinPassword(pin);
  const { auth, authMod } = await getFirebase();
  await waitForAuthUser();

  if (auth.currentUser?.isAnonymous) {
    await authMod.signOut(auth);
  }

  const cred = await authMod.signInWithEmailAndPassword(auth, normalizedEmail, password);
  if (await hasAdminDoc(cred.user.uid)) {
    await authMod.signOut(auth);
    throw new Error("student/unauthorized");
  }
  return cred.user;
}

export async function setStudentPinCredential(pin: string): Promise<User> {
  const { auth, authMod } = await getFirebase();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    throw new Error("auth/requires-recent-login");
  }

  await authMod.updatePassword(user, buildStudentPinPassword(pin));
  return user;
}

export async function getCurrentAdminUser(): Promise<User | null> {
  const user = await waitForAuthUser();
  if (!user || user.isAnonymous) return null;
  return (await authorizeAdminUser(user)) ? user : null;
}

export async function signInAdmin(email: string, password: string): Promise<User> {
  const { auth, authMod } = await getFirebase();
  const normalizedEmail = normalizeEmailAddress(email);
  const cred = await authMod.signInWithEmailAndPassword(auth, normalizedEmail, password);
  const authorized = await authorizeAdminUser(cred.user);
  if (!authorized) {
    await authMod.signOut(auth);
    throw new Error("admin/unauthorized");
  }
  return cred.user;
}

export async function signInAdminWithGoogle(): Promise<User> {
  const { auth, authMod } = await getFirebase();
  const provider = new authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await authMod.signInWithPopup(auth, provider);
  const authorized = await authorizeAdminUser(cred.user);
  if (!authorized) {
    await authMod.signOut(auth);
    throw new Error("admin/unauthorized");
  }
  return cred.user;
}

export async function createAdminInvite(email: string): Promise<void> {
  const adminUser = await getCurrentAdminUser();
  if (!adminUser) {
    throw new Error("admin/unauthorized");
  }

  // Only the master (bootstrap) admin may invite new admins.
  if (!isBootstrapAdminEmail(adminUser.email || "")) {
    throw new Error("admin/master-only");
  }

  const normalizedEmail = normalizeEmailAddress(email);
  if (!normalizedEmail) {
    throw new Error("auth/invalid-email");
  }

  // Don't invite the bootstrap (master) admin — they're already an admin via bootstrap path.
  if (isBootstrapAdminEmail(normalizedEmail)) {
    throw new Error("admin/already-admin");
  }

  // Don't invite the currently-signed-in admin themselves.
  if (normalizeEmailAddress(adminUser.email || "") === normalizedEmail) {
    throw new Error("admin/already-admin");
  }

  const { db, fs } = await getFirebase();
  const inviteRef = fs.doc(db, "adminInvites", normalizedEmail);
  const existingInvite = await fs.getDoc(inviteRef);
  const existingData = existingInvite.exists()
    ? existingInvite.data() as AdminInviteRecord
    : null;

  if (existingData?.status === "claimed") {
    throw new Error("admin/already-claimed");
  }

  if (existingData?.email === normalizedEmail) {
    return;
  }

  const createdByEmail = normalizeEmailAddress(adminUser.email || "");
  await fs.setDoc(inviteRef, {
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
    createdByUid: adminUser.uid,
    ...(createdByEmail ? { createdByEmail } : {}),
    status: "pending",
  } satisfies AdminInviteRecord);
}

export async function listAdminInvites(createdByUid?: string): Promise<AdminInviteRecord[]> {
  const adminUser = await getCurrentAdminUser();
  if (!adminUser) return [];

  const { db, fs } = await getFirebase();
  const baseRef = fs.collection(db, "adminInvites");
  const inviteQuery = createdByUid
    ? fs.query(baseRef, fs.where("createdByUid", "==", createdByUid))
    : baseRef;
  const snap = await fs.getDocs(inviteQuery);

  return snap.docs
    .map((doc) => {
      const data = doc.data() as Partial<AdminInviteRecord>;
      return {
        email: typeof data.email === "string" ? data.email : doc.id,
        createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
        createdByUid: typeof data.createdByUid === "string" ? data.createdByUid : "",
        ...(typeof data.createdByEmail === "string" ? { createdByEmail: data.createdByEmail } : {}),
        ...(data.status === "pending" || data.status === "claimed" ? { status: data.status } : {}),
        ...(typeof data.claimedAt === "string" ? { claimedAt: data.claimedAt } : {}),
        ...(typeof data.claimedByUid === "string" ? { claimedByUid: data.claimedByUid } : {}),
        ...(typeof data.claimedByEmail === "string" ? { claimedByEmail: data.claimedByEmail } : {}),
      } satisfies AdminInviteRecord;
    })
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function registerInvitedAdmin(email: string, password: string): Promise<User> {
  const normalizedEmail = normalizeEmailAddress(email);
  const { auth, authMod, db, fs } = await getFirebase();
  const inviteRef = fs.doc(db, "adminInvites", normalizedEmail);
  const bootstrapOwner = isBootstrapAdminEmail(normalizedEmail);

  // Intentionally skip the pre-signup invite lookup: Firestore rules block
  // unauthenticated reads on adminInvites. We verify the invite after the
  // account is created (the user can then read their own invite row via
  // inviteMatchesSignedInEmail) and roll back the auth user if it's missing.
  const cred = await authMod.createUserWithEmailAndPassword(auth, normalizedEmail, password);

  try {
    const inviteSnap = bootstrapOwner ? null : await fs.getDoc(inviteRef);
    if (!bootstrapOwner && !inviteSnap?.exists()) {
      throw new Error("admin/invite-required");
    }

    const inviteData = inviteSnap?.data() as Partial<AdminInviteRecord> | undefined;
    const now = new Date().toISOString();

    await fs.setDoc(fs.doc(db, "admins", cred.user.uid), {
      email: normalizedEmail,
      createdAt: now,
      ...(bootstrapOwner ? { legacyOwner: true } : {}),
      ...(typeof inviteData?.createdByUid === "string" ? { invitedByUid: inviteData.createdByUid } : {}),
      ...(typeof inviteData?.createdByEmail === "string" ? { invitedByEmail: inviteData.createdByEmail } : {}),
    });

    if (!bootstrapOwner) {
      await fs.setDoc(inviteRef, {
        claimedAt: now,
        claimedByUid: cred.user.uid,
        claimedByEmail: normalizedEmail,
        status: "claimed",
      } satisfies Partial<AdminInviteRecord>, { merge: true });
    }

    return cred.user;
  } catch (error) {
    try {
      await cred.user.delete();
    } catch (deleteError) {
      console.warn("Failed to clean up invited admin account after signup error:", deleteError);
    }
    try {
      await authMod.signOut(auth);
    } catch (signOutError) {
      console.warn("Failed to sign out after invited admin signup error:", signOutError);
    }
    throw error;
  }
}

export async function sendAdminPasswordReset(email: string): Promise<void> {
  const normalizedEmail = normalizeEmailAddress(email);
  if (!normalizedEmail) throw new Error("auth/invalid-email");
  const { auth, authMod } = await getFirebase();
  await authMod.sendPasswordResetEmail(auth, normalizedEmail);
}

export async function signOutFirebase(): Promise<void> {
  const { auth, authMod } = await getFirebase();
  await authMod.signOut(auth);
}
