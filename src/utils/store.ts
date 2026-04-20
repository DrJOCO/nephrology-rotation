import { getFirebase } from "./firebase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FirestoreData = Record<string, any>;
type PendingSyncData = Record<string, unknown> | unknown[];
type PendingSyncItem =
  | { kind: "setShared"; rotationCode: string; key: string; data: PendingSyncData; updatedAt: string }
  | { kind: "setStudentData"; rotationCode: string; studentId: string; data: Record<string, unknown>; updatedAt: string }
  | { kind: "setTeamSnapshot"; rotationCode: string; studentId: string; data: Record<string, unknown>; updatedAt: string }
  | { kind: "updateRotation"; rotationCode: string; data: Record<string, unknown>; updatedAt: string };

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

const PENDING_SYNC_KEY = "neph_pendingSyncQueue";
const PENDING_SYNC_EVENT = "neph:pending-sync-changed";
const rotationDocCacheKey = (code: string) => `neph_rotation_doc_${code}`;
const studentDocCacheKey = (code: string, studentId: string) => `neph_rotation_${code}_student_${studentId}`;
const teamDocCacheKey = (code: string, studentId: string) => `neph_rotation_${code}_team_${studentId}`;

let rotationCode: string | null = localStorage.getItem("neph_rotationCode") || null;

function readJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch (error) {
    console.warn(`Failed to read ${key}:`, error);
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to write ${key}:`, error);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergePayload<T extends PendingSyncData | Record<string, unknown>>(existing: T | null | undefined, next: T): T {
  if (isPlainObject(existing) && isPlainObject(next)) {
    return { ...existing, ...next } as T;
  }
  return next;
}

function emitPendingSyncChanged(queue: PendingSyncItem[]): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PENDING_SYNC_EVENT, { detail: { count: queue.length } }));
}

function readPendingSyncQueue(): PendingSyncItem[] {
  return readJson<PendingSyncItem[]>(PENDING_SYNC_KEY) || [];
}

function writePendingSyncQueue(queue: PendingSyncItem[]): void {
  writeJson(PENDING_SYNC_KEY, queue);
  emitPendingSyncChanged(queue);
}

function sameQueueScope(a: PendingSyncItem, b: PendingSyncItem): boolean {
  if (a.kind !== b.kind || a.rotationCode !== b.rotationCode) return false;
  if (a.kind === "setShared" && b.kind === "setShared") return a.key === b.key;
  if (a.kind === "updateRotation" && b.kind === "updateRotation") return true;
  if ((a.kind === "setStudentData" || a.kind === "setTeamSnapshot") && (b.kind === "setStudentData" || b.kind === "setTeamSnapshot")) {
    return a.kind === b.kind && a.studentId === b.studentId;
  }
  return false;
}

function queuePendingSync(item: PendingSyncItem): void {
  const queue = readPendingSyncQueue();
  const existingIndex = queue.findIndex((queued) => sameQueueScope(queued, item));
  if (existingIndex === -1) {
    writePendingSyncQueue([...queue, item]);
    return;
  }

  const existing = queue[existingIndex];
  const merged = { ...existing, updatedAt: item.updatedAt } as PendingSyncItem;

  if (existing.kind === "setShared" && item.kind === "setShared") {
    merged.data = mergePayload(existing.data, item.data);
  } else if (existing.kind === "setStudentData" && item.kind === "setStudentData") {
    merged.data = mergePayload(existing.data, item.data);
  } else if (existing.kind === "setTeamSnapshot" && item.kind === "setTeamSnapshot") {
    merged.data = mergePayload(existing.data, item.data);
  } else if (existing.kind === "updateRotation" && item.kind === "updateRotation") {
    merged.data = mergePayload(existing.data, item.data);
  }

  const nextQueue = queue.slice();
  nextQueue[existingIndex] = merged;
  writePendingSyncQueue(nextQueue);
}

function clearQueuedSync(item: PendingSyncItem): void {
  const queue = readPendingSyncQueue();
  const nextQueue = queue.filter((queued) => !sameQueueScope(queued, item));
  if (nextQueue.length !== queue.length) writePendingSyncQueue(nextQueue);
}

function cacheRotationDoc(code: string, data: Record<string, unknown>): void {
  const existing = readJson<Record<string, unknown>>(rotationDocCacheKey(code));
  const merged = mergePayload(existing, data);
  writeJson(rotationDocCacheKey(code), merged);
  if (rotationCode === code) {
    Object.entries(KEY_TO_FIELD).forEach(([sharedKey, field]) => {
      if (Object.prototype.hasOwnProperty.call(merged, field)) {
        writeJson(sharedKey, merged[field]);
      }
    });
  }
}

function cacheSharedValue(key: string, value: unknown): void {
  writeJson(key, value);
  if (!rotationCode) return;
  const field = KEY_TO_FIELD[key];
  if (field) cacheRotationDoc(rotationCode, { [field]: value });
}

function cacheStudentDoc(code: string, studentId: string, data: Record<string, unknown>): void {
  const existing = readJson<Record<string, unknown>>(studentDocCacheKey(code, studentId));
  writeJson(studentDocCacheKey(code, studentId), mergePayload(existing, data));
}

function cacheTeamDoc(code: string, studentId: string, data: Record<string, unknown>): void {
  const existing = readJson<Record<string, unknown>>(teamDocCacheKey(code, studentId));
  writeJson(teamDocCacheKey(code, studentId), mergePayload(existing, data));
}

async function flushPendingSyncQueue(): Promise<number> {
  const queue = readPendingSyncQueue();
  if (queue.length === 0) return 0;

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    emitPendingSyncChanged(queue);
    return queue.length;
  }

  const remaining: PendingSyncItem[] = [];

  for (const item of queue) {
    try {
      const { db, fs } = await getFirebase();
      if (item.kind === "setShared") {
        const field = KEY_TO_FIELD[item.key];
        if (!field) continue;
        await fs.updateDoc(fs.doc(db, "rotations", item.rotationCode), { [field]: item.data });
      } else if (item.kind === "setStudentData") {
        await fs.setDoc(fs.doc(db, "rotations", item.rotationCode, "students", item.studentId), item.data, { merge: true });
      } else if (item.kind === "setTeamSnapshot") {
        await fs.setDoc(fs.doc(db, "rotations", item.rotationCode, "team", item.studentId), item.data, { merge: true });
      } else if (item.kind === "updateRotation") {
        await fs.updateDoc(fs.doc(db, "rotations", item.rotationCode), item.data);
      }
    } catch (error) {
      console.warn("Queued sync flush failed:", error);
      remaining.push(item);
    }
  }

  writePendingSyncQueue(remaining);
  return remaining.length;
}

const store = {
  // ─── Private storage (always localStorage) ───────────────────────
  async get<T = unknown>(key: string): Promise<T | null> {
    return readJson<T>(key);
  },
  async set(key: string, val: unknown): Promise<void> {
    writeJson(key, val);
  },

  // ─── Shared storage (Firestore when connected, localStorage fallback) ───
  async getShared<T = unknown>(key: string): Promise<T | null> {
    if (!rotationCode) {
      return readJson<T>(key);
    }
    try {
      const { db, fs } = await getFirebase();
      // Student data lives in subcollection
      if (key.startsWith("neph_shared_student_")) {
        const studentId = key.replace("neph_shared_student_", "");
        const snap = await fs.getDoc(fs.doc(db, "rotations", rotationCode, "students", studentId));
        if (!snap.exists()) return null;
        const data = snap.data() as T;
        writeJson(key, data);
        cacheStudentDoc(rotationCode, studentId, snap.data());
        return data;
      }
      // Rotation-level data
      const field = KEY_TO_FIELD[key];
      if (!field) return null;
      const snap = await fs.getDoc(fs.doc(db, "rotations", rotationCode));
      if (!snap.exists()) return null;
      const value = (snap.data()[field] as T) ?? null;
      if (value !== null) cacheSharedValue(key, value);
      cacheRotationDoc(rotationCode, snap.data());
      return value;
    } catch (e) {
      console.warn("Firestore getShared failed, falling back to localStorage:", e);
      return readJson<T>(key);
    }
  },

  async setShared(key: string, val: FirestoreData | unknown[]): Promise<void> {
    cacheSharedValue(key, val);
    if (!rotationCode) {
      return;
    }
    const queued: PendingSyncItem = { kind: "setShared", rotationCode, key, data: val, updatedAt: new Date().toISOString() };
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queuePendingSync(queued);
      return;
    }
    try {
      const { db, fs } = await getFirebase();
      // Student data goes to subcollection
      if (key.startsWith("neph_shared_student_")) {
        const studentId = key.replace("neph_shared_student_", "");
        await fs.setDoc(fs.doc(db, "rotations", rotationCode, "students", studentId), val, { merge: true });
        cacheStudentDoc(rotationCode, studentId, val as Record<string, unknown>);
        clearQueuedSync(queued);
        return;
      }
      // Rotation-level data
      const field = KEY_TO_FIELD[key];
      if (field) {
        await fs.updateDoc(fs.doc(db, "rotations", rotationCode), { [field]: val });
        clearQueuedSync(queued);
      }
    } catch (e) {
      console.warn("Firestore setShared failed, queueing for retry:", e);
      queuePendingSync(queued);
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
  getPendingSyncCount(): number {
    return readPendingSyncQueue().length;
  },
  onPendingSyncChanged(callback: (count: number) => void): () => void {
    if (typeof window === "undefined") return () => {};
    const handler = (event: Event) => {
      const nextCount = event instanceof CustomEvent && typeof event.detail?.count === "number"
        ? event.detail.count
        : readPendingSyncQueue().length;
      callback(nextCount);
    };
    callback(readPendingSyncQueue().length);
    window.addEventListener(PENDING_SYNC_EVENT, handler);
    return () => window.removeEventListener(PENDING_SYNC_EVENT, handler);
  },
  async flushPendingSyncQueue(): Promise<number> {
    return flushPendingSyncQueue();
  },

  // ─── Create a new rotation document ──────────────────────────────
  async createRotation(code: string, data: Record<string, unknown>): Promise<void> {
    const { db, fs } = await getFirebase();
    const payload = {
      ...data,
      createdAt: new Date().toISOString(),
    };
    await fs.setDoc(fs.doc(db, "rotations", code), payload);
    rotationCode = code;
    localStorage.setItem("neph_rotationCode", code);
    cacheRotationDoc(code, payload);
  },

  // ─── Read full rotation document (for hydrating admin state) ─────
  async getRotationData(code?: string | null): Promise<FirestoreData | null> {
    try {
      const docId = code || rotationCode;
      if (!docId) return null;
      const { db, fs } = await getFirebase();
      const snap = await fs.getDoc(fs.doc(db, "rotations", docId));
      if (!snap.exists()) return null;
      const data = snap.data();
      cacheRotationDoc(docId, data);
      return data;
    } catch (e) {
      console.warn("getRotationData failed:", e);
      const docId = code || rotationCode;
      return docId ? readJson<FirestoreData>(rotationDocCacheKey(docId)) : null;
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
        const students = snap.docs.map(d => {
          const data = { studentId: d.id, ...d.data() };
          cacheStudentDoc(code, d.id, data);
          return data;
        });
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
        const snapshots = snap.docs.map(d => {
          const data = { studentId: d.id, ...d.data() };
          cacheTeamDoc(code, d.id, data);
          return data;
        });
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
        if (snap.exists()) {
          cacheRotationDoc(code, snap.data());
          callback(snap.data());
        }
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
        if (snap.exists()) {
          cacheStudentDoc(code, studentId, snap.data());
          callback(snap.data());
        }
      }, (err) => {
        console.warn("Student data listener error:", err);
      });
    });
    return () => { unsub?.(); };
  },

  // ─── Write student data to Firestore directly ────────────────────
  async setStudentData(studentId: string, data: Record<string, unknown>): Promise<void> {
    if (!rotationCode) return;
    cacheStudentDoc(rotationCode, studentId, data);
    const queued: PendingSyncItem = { kind: "setStudentData", rotationCode, studentId, data, updatedAt: new Date().toISOString() };
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queuePendingSync(queued);
      return;
    }
    try {
      const { db, fs } = await getFirebase();
      const studentRef = fs.doc(db, "rotations", rotationCode, "students", studentId);
      await fs.setDoc(studentRef, data, { merge: true });
      clearQueuedSync(queued);
    } catch (e) {
      console.warn("setStudentData failed, queueing for retry:", e);
      queuePendingSync(queued);
    }
  },

  // ─── Write sanitized team snapshot to Firestore ──────────────────
  async setTeamSnapshot(studentId: string, data: object): Promise<void> {
    if (!rotationCode || !studentId) return;
    const payload = data as Record<string, unknown>;
    cacheTeamDoc(rotationCode, studentId, payload);
    const queued: PendingSyncItem = { kind: "setTeamSnapshot", rotationCode, studentId, data: payload, updatedAt: new Date().toISOString() };
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queuePendingSync(queued);
      return;
    }
    try {
      const { db, fs } = await getFirebase();
      const teamRef = fs.doc(db, "rotations", rotationCode, "team", studentId);
      await fs.setDoc(teamRef, payload, { merge: true });
      clearQueuedSync(queued);
    } catch (e) {
      console.warn("setTeamSnapshot failed, queueing for retry:", e);
      queuePendingSync(queued);
    }
  },

  // ─── Read student data from Firestore (for login/restore) ────────
  async getStudentData(studentId: string): Promise<FirestoreData | null> {
    if (!rotationCode) return null;
    try {
      const { db, fs } = await getFirebase();
      const snap = await fs.getDoc(fs.doc(db, "rotations", rotationCode, "students", studentId));
      if (!snap.exists()) return null;
      const data = snap.data();
      cacheStudentDoc(rotationCode, studentId, data);
      return data;
    } catch (e) {
      console.warn("getStudentData failed:", e);
      return readJson<FirestoreData>(studentDocCacheKey(rotationCode, studentId));
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
    cacheRotationDoc(code, data);
    const queued: PendingSyncItem = { kind: "updateRotation", rotationCode: code, data, updatedAt: new Date().toISOString() };
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queuePendingSync(queued);
      return;
    }
    try {
      const { db, fs } = await getFirebase();
      await fs.updateDoc(fs.doc(db, "rotations", code), data);
      clearQueuedSync(queued);
    } catch (e) {
      console.warn("updateRotation failed, queueing for retry:", e);
      queuePendingSync(queued);
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
      localStorage.removeItem(rotationDocCacheKey(code));
    } catch (e) {
      console.warn("deleteRotation failed:", e);
      throw e;
    }
  },
};

export default store;
