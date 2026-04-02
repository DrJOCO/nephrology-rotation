import { getFirebase } from "./firebase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FirestoreData = Record<string, any>;

export interface RotationInfo {
  code: string;
  name: string;
  createdAt: string | null;
  location: string;
  dates: string;
  studentCount: number;
}

// Key mapping: SHARED_KEYS string → Firestore field name
const KEY_TO_FIELD: Record<string, string> = {
  neph_shared_curriculum: "curriculum",
  neph_shared_articles: "articles",
  neph_shared_announcements: "announcements",
  neph_shared_settings: "settings",
  neph_shared_clinicGuides: "clinicGuides",
};

let rotationCode: string | null = localStorage.getItem("neph_rotationCode") || null;

const store = {
  // ─── Private storage (always localStorage) ───────────────────────
  async get<T = unknown>(key: string): Promise<T | null> {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
    catch (e) { console.warn("store.get parse error:", e); return null; }
  },
  async set(key: string, val: unknown): Promise<void> {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.warn("store.set failed:", e); }
  },

  // ─── Shared storage (Firestore when connected, localStorage fallback) ───
  async getShared<T = unknown>(key: string): Promise<T | null> {
    if (!rotationCode) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
      catch { return null; }
    }
    try {
      const { db, fs } = await getFirebase();
      // Student data lives in subcollection
      if (key.startsWith("neph_shared_student_")) {
        const studentId = key.replace("neph_shared_student_", "");
        const snap = await fs.getDoc(fs.doc(db, "rotations", rotationCode, "students", studentId));
        return snap.exists() ? (snap.data() as T) : null;
      }
      // Rotation-level data
      const field = KEY_TO_FIELD[key];
      if (!field) return null;
      const snap = await fs.getDoc(fs.doc(db, "rotations", rotationCode));
      return snap.exists() ? ((snap.data()[field] as T) ?? null) : null;
    } catch (e) {
      console.warn("Firestore getShared failed, falling back to localStorage:", e);
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
      catch { return null; }
    }
  },

  async setShared(key: string, val: FirestoreData): Promise<void> {
    if (!rotationCode) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.warn("setShared localStorage fallback failed:", e); }
      return;
    }
    try {
      const { db, fs } = await getFirebase();
      // Student data goes to subcollection
      if (key.startsWith("neph_shared_student_")) {
        const studentId = key.replace("neph_shared_student_", "");
        await fs.setDoc(fs.doc(db, "rotations", rotationCode, "students", studentId), val, { merge: true });
        return;
      }
      // Rotation-level data
      const field = KEY_TO_FIELD[key];
      if (field) {
        await fs.updateDoc(fs.doc(db, "rotations", rotationCode), { [field]: val });
      }
    } catch (e) {
      console.warn("Firestore setShared failed, saving to localStorage:", e);
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.warn("setShared fallback failed:", e); }
    }
  },

  async listShared(prefix: string): Promise<string[]> {
    if (!rotationCode) {
      try { return Object.keys(localStorage).filter(k => k.startsWith(prefix)); }
      catch { return []; }
    }
    try {
      const { db, fs } = await getFirebase();
      if (prefix === "neph_shared_student_") {
        const snap = await fs.getDocs(fs.collection(db, "rotations", rotationCode, "students"));
        return snap.docs.map(d => prefix + d.id);
      }
      return [];
    } catch (e) {
      console.warn("Firestore listShared failed:", e);
      try { return Object.keys(localStorage).filter(k => k.startsWith(prefix)); }
      catch { return []; }
    }
  },

  // ─── Rotation code management ────────────────────────────────────
  setRotationCode(code: string | null) {
    rotationCode = code;
    if (code) localStorage.setItem("neph_rotationCode", code);
    else localStorage.removeItem("neph_rotationCode");
  },
  getRotationCode(): string | null {
    return rotationCode;
  },

  // ─── Create a new rotation document ──────────────────────────────
  async createRotation(code: string, data: Record<string, unknown>): Promise<void> {
    const { db, fs } = await getFirebase();
    await fs.setDoc(fs.doc(db, "rotations", code), {
      ...data,
      createdAt: new Date().toISOString(),
    });
    rotationCode = code;
    localStorage.setItem("neph_rotationCode", code);
  },

  // ─── Read full rotation document (for hydrating admin state) ─────
  async getRotationData(code?: string | null): Promise<FirestoreData | null> {
    try {
      const docId = code || rotationCode;
      if (!docId) return null;
      const { db, fs } = await getFirebase();
      const snap = await fs.getDoc(fs.doc(db, "rotations", docId));
      return snap.exists() ? snap.data() : null;
    } catch (e) {
      console.warn("getRotationData failed:", e);
      return null;
    }
  },

  // ─── Validate a rotation code exists ─────────────────────────────
  async validateRotationCode(code: string): Promise<boolean> {
    try {
      const { db, fs } = await getFirebase();
      const snap = await fs.getDoc(fs.doc(db, "rotations", code));
      return snap.exists();
    } catch { return false; }
  },

  // ─── Real-time listener: all students in a rotation ──────────────
  onStudentsChanged(callback: (students: FirestoreData[]) => void): () => void {
    if (!rotationCode) return () => {};
    let unsub: (() => void) | null = null;
    const code = rotationCode;
    getFirebase().then(({ db, fs }) => {
      unsub = fs.onSnapshot(fs.collection(db, "rotations", code, "students"), (snap) => {
        const students = snap.docs.map(d => ({ studentId: d.id, ...d.data() }));
        callback(students);
      }, (err) => {
        console.warn("Students listener error:", err);
      });
    });
    return () => { unsub?.(); };
  },

  // ─── Real-time listener: sanitized team snapshots ────────────────
  onTeamSnapshotsChanged(callback: (snapshots: FirestoreData[]) => void): () => void {
    if (!rotationCode) return () => {};
    let unsub: (() => void) | null = null;
    const code = rotationCode;
    getFirebase().then(({ db, fs }) => {
      unsub = fs.onSnapshot(fs.collection(db, "rotations", code, "team"), (snap) => {
        const snapshots = snap.docs.map(d => ({ studentId: d.id, ...d.data() }));
        callback(snapshots);
      }, (err) => {
        console.warn("Team listener error:", err);
      });
    });
    return () => { unsub?.(); };
  },

  // ─── Real-time listener: rotation-level data ─────────────────────
  onRotationChanged(callback: (data: FirestoreData) => void): () => void {
    if (!rotationCode) return () => {};
    let unsub: (() => void) | null = null;
    const code = rotationCode;
    getFirebase().then(({ db, fs }) => {
      unsub = fs.onSnapshot(fs.doc(db, "rotations", code), (snap) => {
        if (snap.exists()) callback(snap.data());
      }, (err) => {
        console.warn("Rotation listener error:", err);
      });
    });
    return () => { unsub?.(); };
  },

  // ─── Real-time listener: single student document ─────────────────
  onStudentDataChanged(studentId: string, callback: (data: FirestoreData) => void): () => void {
    if (!rotationCode || !studentId) return () => {};
    let unsub: (() => void) | null = null;
    const code = rotationCode;
    getFirebase().then(({ db, fs }) => {
      unsub = fs.onSnapshot(fs.doc(db, "rotations", code, "students", studentId), (snap) => {
        if (snap.exists()) callback(snap.data());
      }, (err) => {
        console.warn("Student data listener error:", err);
      });
    });
    return () => { unsub?.(); };
  },

  // ─── Write student data to Firestore directly ────────────────────
  async setStudentData(studentId: string, data: Record<string, unknown>): Promise<void> {
    if (!rotationCode) return;
    try {
      const { db, fs } = await getFirebase();
      const studentRef = fs.doc(db, "rotations", rotationCode, "students", studentId);
      await fs.setDoc(studentRef, data, { merge: true });
    } catch (e) {
      console.warn("setStudentData failed:", e);
    }
  },

  // ─── Write sanitized team snapshot to Firestore ──────────────────
  async setTeamSnapshot(studentId: string, data: object): Promise<void> {
    if (!rotationCode || !studentId) return;
    try {
      const { db, fs } = await getFirebase();
      const teamRef = fs.doc(db, "rotations", rotationCode, "team", studentId);
      await fs.setDoc(teamRef, data, { merge: true });
    } catch (e) {
      console.warn("setTeamSnapshot failed:", e);
    }
  },

  // ─── Read student data from Firestore (for login/restore) ────────
  async getStudentData(studentId: string): Promise<FirestoreData | null> {
    if (!rotationCode) return null;
    try {
      const { db, fs } = await getFirebase();
      const snap = await fs.getDoc(fs.doc(db, "rotations", rotationCode, "students", studentId));
      return snap.exists() ? snap.data() : null;
    } catch (e) {
      console.warn("getStudentData failed:", e);
      return null;
    }
  },

  // ─── List all rotations ─────────────────────────────────────────
  async listRotations(): Promise<RotationInfo[]> {
    try {
      const { db, fs } = await getFirebase();
      const snap = await fs.getDocs(fs.collection(db, "rotations"));
      const rotations = await Promise.all(snap.docs.map(async d => {
        const data = d.data();
        let studentCount = 0;
        try {
          const studentsSnap = await fs.getDocs(fs.collection(db, "rotations", d.id, "students"));
          studentCount = studentsSnap.size;
        } catch (e) {
          console.warn("listRotations student count failed:", e);
        }
        return {
          code: d.id,
          name: data.name || "Untitled",
          createdAt: data.createdAt || null,
          location: data.location || "",
          dates: data.dates || "",
          studentCount,
        };
      }));
      rotations.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      return rotations;
    } catch (e) {
      console.warn("listRotations failed:", e);
      return [];
    }
  },

  // ─── Update rotation metadata ───────────────────────────────────
  async updateRotation(code: string, data: Record<string, unknown>): Promise<void> {
    try {
      const { db, fs } = await getFirebase();
      await fs.updateDoc(fs.doc(db, "rotations", code), data);
    } catch (e) {
      console.warn("updateRotation failed:", e);
    }
  },

  // ─── Delete a single student document ───────────────────────────
  async deleteStudentData(studentId: string): Promise<void> {
    if (!rotationCode || !studentId) return;
    try {
      const { db, fs } = await getFirebase();
      await fs.deleteDoc(fs.doc(db, "rotations", rotationCode, "students", studentId));
      await fs.deleteDoc(fs.doc(db, "rotations", rotationCode, "team", studentId));
    } catch (e) {
      console.warn("deleteStudentData failed:", e);
      throw e;
    }
  },

  // ─── Delete rotation and its students ───────────────────────────
  async deleteRotation(code: string): Promise<void> {
    try {
      const { db, fs } = await getFirebase();
      // Delete all students in subcollection first
      const studentsSnap = await fs.getDocs(fs.collection(db, "rotations", code, "students"));
      for (const s of studentsSnap.docs) {
        await fs.deleteDoc(fs.doc(db, "rotations", code, "students", s.id));
      }
      const teamSnap = await fs.getDocs(fs.collection(db, "rotations", code, "team"));
      for (const s of teamSnap.docs) {
        await fs.deleteDoc(fs.doc(db, "rotations", code, "team", s.id));
      }
      // Delete rotation doc
      await fs.deleteDoc(fs.doc(db, "rotations", code));
      // If this was the active rotation, disconnect
      if (rotationCode === code) {
        rotationCode = null;
        localStorage.removeItem("neph_rotationCode");
      }
    } catch (e) {
      console.warn("deleteRotation failed:", e);
      throw e;
    }
  },
};

export default store;
