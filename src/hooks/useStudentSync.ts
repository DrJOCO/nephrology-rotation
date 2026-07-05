import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { WEEKLY, ARTICLES } from "../data/constants";
import type { ClinicGuideTemplates } from "../data/clinicGuides";
import store, { STUDENT_REMOVED_EVENT } from "../utils/store";
import { getCurrentStudentUser, normalizeStudentPinInput, signOutFirebase } from "../utils/firebase";
import { ensureGoogleFonts, ensureLayoutStyles, ensureThemeStyles, SHARED_KEYS } from "../utils/helpers";
import { calculatePoints } from "../utils/gamification";
import { ensureCurrentClinicGuide } from "../utils/clinicRotation";
import { normalizeClinicGuideTemplates } from "../utils/clinicGuideTemplates";
import { normalizeStudySheets, type StudySheetsData } from "../utils/studySheets";
import { buildTeamSnapshot } from "../utils/teamSnapshots";
import {
  mergeCompletedItems,
  mergeRemovedPatientMaps,
  mergeWeeklyScores,
  patientEntryStamp,
  patientRemovalWins,
  pruneRemovedPatients,
} from "../utils/progressMerge";
import {
  JOINED_AT_KEY,
  STUDENT_DEFERRED_SIGNOUT_KEY,
  STUDENT_EMAIL_KEY,
  STUDENT_PENDING_JOIN_CODE_KEY,
  STUDENT_YEAR_KEY,
  normalizeEmail,
} from "./useStudentAuth";
import type { Patient, QuizScore, WeeklyScores, Announcement, SharedSettings, Gamification, ActivityLogEntry, SrQueue, CompletedItems, Bookmarks, ClinicGuideRecord, ReflectionEntry } from "../types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Content key for a patient entry — the entry minus its own stamp, so
// re-stamping never reads as another content change (which would re-stamp on
// every run).
function patientContentKey(patient: Patient): string {
  const content: Partial<Patient> = { ...patient };
  delete content.updatedAt;
  return JSON.stringify(content);
}

export const REMOVED_PATIENTS_KEY = "neph_removedPatients";

// Data load/save/listener cluster for StudentApp. Owns the mount-time load effect
// (auth bootstrap via useStudentAuth's bootstrapAuthSession, then stored/shared data),
// the debounced Firestore auto-save, the rotation/student-data/pending-sync listeners,
// flushStudentSync, and the dirty-patient merge bookkeeping. `latestStudentUpdateRef`
// is shared with useStudentAuth, which stamps it on join/profile writes.
export function useStudentSync(
  online: boolean,
  latestStudentUpdateRef: { current: string | null },
  bootstrapAuthSession: () => Promise<string>,
  studentId: string,
  setStudentId: Dispatch<SetStateAction<string>>,
  nameSet: boolean,
  setNameSet: Dispatch<SetStateAction<boolean>>,
  studentName: string,
  setStudentName: Dispatch<SetStateAction<string>>,
  studentYear: string,
  setStudentYear: Dispatch<SetStateAction<string>>,
  studentEmail: string,
  studentSyncIdentity: { authType: string; email?: string },
  rotationCode: string,
  setStudentPin: Dispatch<SetStateAction<string>>,
  setJoinCode: Dispatch<SetStateAction<string>>,
  setJoinedAt: Dispatch<SetStateAction<string | null>>,
  patients: Patient[],
  setPatients: Dispatch<SetStateAction<Patient[]>>,
  weeklyScores: WeeklyScores,
  setWeeklyScores: Dispatch<SetStateAction<WeeklyScores>>,
  preScore: QuizScore | null,
  setPreScore: Dispatch<SetStateAction<QuizScore | null>>,
  postScore: QuizScore | null,
  setPostScore: Dispatch<SetStateAction<QuizScore | null>>,
  gamification: Gamification,
  setGamification: Dispatch<SetStateAction<Gamification>>,
  completedItems: CompletedItems,
  setCompletedItems: Dispatch<SetStateAction<CompletedItems>>,
  bookmarks: Bookmarks,
  setBookmarks: Dispatch<SetStateAction<Bookmarks>>,
  srQueue: SrQueue,
  setSrQueue: Dispatch<SetStateAction<SrQueue>>,
  activityLog: ActivityLogEntry[],
  setActivityLog: Dispatch<SetStateAction<ActivityLogEntry[]>>,
  reflections: ReflectionEntry[],
  setReflections: Dispatch<SetStateAction<ReflectionEntry[]>>,
  setCurriculum: Dispatch<SetStateAction<typeof WEEKLY>>,
  setArticles: Dispatch<SetStateAction<typeof ARTICLES>>,
  setStudySheets: Dispatch<SetStateAction<StudySheetsData>>,
  setAnnouncements: Dispatch<SetStateAction<Announcement[]>>,
  setSharedSettings: Dispatch<SetStateAction<SharedSettings | null>>,
  setClinicGuides: Dispatch<SetStateAction<ClinicGuideRecord[]>>,
  setClinicGuideTemplates: Dispatch<SetStateAction<ClinicGuideTemplates>>,
) {
  const [loading, setLoading] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(() => store.getPendingSyncCount());
  // True once we learn this student's cloud record was deleted by an admin —
  // via the live listener, a tombstone found by a write, or the cold-start
  // check. StudentApp renders the honest removed-from-rotation state on it.
  const [studentRemoved, setStudentRemoved] = useState(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks locally-mutated patients that haven't been flushed to Firestore yet.
  // Protects against multi-device "last writer wins": when another device's
  // stale auto-save echoes back via the listener, we keep the local version
  // for any ID still in `dirty` (adds/edits/discharges/follow-ups) and drop
  // any ID still in `removed`. Both sets are cleared once our 2s debounce
  // flushes — at that point our state is canonical until the next mutation.
  const pendingDirtyPatientIdsRef = useRef<Set<string | number>>(new Set());
  const pendingRemovedPatientIdsRef = useRef<Set<string | number>>(new Set());
  // ── Per-field write bookkeeping (fieldStamps / dirty-field-only writes) ──
  // Serialized last-known value per synced field, diffed inside the save
  // effect so every mutation is caught centrally without call-site marking.
  // null until the first post-load run, which baselines against the last
  // synced doc cache instead — never-synced offline work starts dirty at
  // boot, while a routine reopen of an in-sync device writes nothing.
  const lastFieldValuesRef = useRef<Record<string, string> | null>(null);
  // Fields changed locally since the last write Firestore confirmed — the
  // only fields the auto-save and flush write.
  const dirtyFieldsRef = useRef<Set<string>>(new Set());
  // Per-field authorship stamps: local mutations stamp "now"; listener
  // snapshots contribute the remote's newer stamps. Synced as the doc's
  // fieldStamps map so the store's flush merge can decide scalar conflicts
  // by authorship time instead of the app-open-inflated doc updatedAt.
  const fieldStampsRef = useRef<Record<string, string>>({});
  // patientId → removedAt for student-deleted patients; synced as the doc's
  // removedPatients map so a deletion sticks on every device instead of
  // being resurrected by the id union.
  const removedPatientsRef = useRef<Record<string, string>>({});
  // Content snapshot per patient id (stamp excluded) — entries whose content
  // changed since the last run get a fresh per-entry updatedAt.
  const lastPatientContentsRef = useRef<Map<string, string> | null>(null);
  // Latest synced-field values, so the debounce timer and flush write what
  // state holds NOW (e.g. after a mid-window listener merge) rather than the
  // values captured when the timer was scheduled.
  const syncedFieldsRef = useRef<Record<string, unknown>>({});
  const markPatientDirty = (id: string | number) => {
    pendingRemovedPatientIdsRef.current.delete(id);
    delete removedPatientsRef.current[String(id)];
    pendingDirtyPatientIdsRef.current.add(id);
  };
  const markPatientRemoved = (id: string | number) => {
    pendingDirtyPatientIdsRef.current.delete(id);
    pendingRemovedPatientIdsRef.current.add(id);
    removedPatientsRef.current[String(id)] = new Date().toISOString();
  };
  // The remote updatedAt our local state is known to incorporate — hydrated
  // from the doc cache on load, advanced by applied listener snapshots and by
  // our own completed writes. Passed to store.setStudentData as baseUpdatedAt
  // so the store merges (instead of overwrites) whenever the cloud holds
  // progress this device never saw — e.g. a stale device whose post-hydration
  // auto-save or logout flush beats the first onSnapshot on slow hospital wifi.
  const syncBaseRef = useRef<string | null>(null);
  const advanceSyncBase = (stamp: string | null) => {
    if (stamp && (!syncBaseRef.current || stamp > syncBaseRef.current)) syncBaseRef.current = stamp;
  };
  // Set when a listener snapshot is applied to React state: that state change
  // must not re-trigger the Firestore auto-save, or two open devices ping-pong
  // full-doc writes (each echo re-stamped with a fresh updatedAt) forever.
  // Consumed by the next auto-save effect run, which persists to localStorage
  // only and skips the write-back.
  const suppressNextAutoSyncRef = useRef(false);
  // Set when the listener sees this student's cloud record deleted mid-session
  // (admin Remove / recovery-away). While set, auto-saves and flushes are
  // blocked so this device doesn't silently resurrect the deleted doc; a
  // reappearing doc (e.g. admin re-adds the student) clears it.
  const studentDocRemovedRef = useRef(false);

  const noteStudentUpdatedAt = (updatedAt: string) => {
    latestStudentUpdateRef.current = updatedAt;
  };

  useEffect(() => store.onPendingSyncChanged(setPendingSyncCount), []);

  useEffect(() => {
    if (!online) return;
    void store.flushPendingSyncQueue();
  }, [online, studentId, nameSet]);

  // Retry loop for writes that failed while ONLINE (e.g. a flaky hospital
  // network blip): they land in the pending queue, but the flush above only
  // re-fires on reconnect/identity changes. Poll while anything is queued so
  // the banner's "will retry" is actually true without a reload.
  useEffect(() => {
    if (!online || pendingSyncCount === 0) return;
    const timer = setInterval(() => {
      void store.flushPendingSyncQueue();
    }, 30_000);
    return () => clearInterval(timer);
  }, [online, pendingSyncCount]);

  // Complete a deferred sign-out. A logout while the final flush was still
  // queued (offline / transient failure) keeps the Firebase session alive,
  // because security rules only let THIS student's own account write its doc —
  // signing out immediately would strand the queued progress forever. Once the
  // queue drains (and no user has signed back in meanwhile, which clears the
  // flag), finish the sign-out the student asked for.
  useEffect(() => {
    if (pendingSyncCount > 0 || studentId) return;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STUDENT_DEFERRED_SIGNOUT_KEY) !== "1") return;
    window.localStorage.removeItem(STUDENT_DEFERRED_SIGNOUT_KEY);
    void getCurrentStudentUser()
      // A null user means the session is already gone or belongs to an admin —
      // nothing student-scoped left to sign out.
      .then((user) => (user ? signOutFirebase() : undefined))
      .catch((error) => console.warn("Deferred student sign-out failed:", error));
  }, [pendingSyncCount, studentId]);

  // Load from storage on mount
  useEffect(() => {
    ensureGoogleFonts();
    ensureLayoutStyles();
    ensureThemeStyles();
    (async () => {
      const sessionStudentId = await bootstrapAuthSession();

      const name = await store.get<string>("neph_name");
      const year = await store.get<string>(STUDENT_YEAR_KEY);
      const pin = await store.get<string>("neph_pin");
      const pendingJoinCode = await store.get<string>(STUDENT_PENDING_JOIN_CODE_KEY);
      const sidFromStore = await store.get<string>("neph_studentId");
      // Seed the clobber-guard base from the cached student doc so a routine
      // reopen on an up-to-date device writes plainly; only a genuinely stale
      // device (cloud advanced past what this device last saw) merges.
      const guardStudentId = sessionStudentId || sidFromStore || "";
      if (guardStudentId) advanceSyncBase(store.getCachedStudentUpdatedAt(guardStudentId));
      const cachedDoc = guardStudentId ? store.getCachedStudentDoc(guardStudentId) : null;
      if (cachedDoc && isPlainObject(cachedDoc.fieldStamps)) {
        for (const [field, stamp] of Object.entries(cachedDoc.fieldStamps)) {
          if (typeof stamp === "string") fieldStampsRef.current[field] = stamp;
        }
      }
      // Removals survive a tab close even when the deleting write never left
      // this device (still queued or inside the debounce window).
      const storedRemovals = await store.get<Record<string, string>>(REMOVED_PATIENTS_KEY);
      removedPatientsRef.current = mergeRemovedPatientMaps(cachedDoc?.removedPatients, storedRemovals);
      // Per-entry stamp baseline: entries matching the last synced copy keep
      // their stamps; entries that differ are offline edits and get restamped
      // by the save effect's first run.
      const cachedPatients = Array.isArray(cachedDoc?.patients) ? cachedDoc.patients as Patient[] : [];
      lastPatientContentsRef.current = new Map(cachedPatients.map((patient) => [String(patient?.id), patientContentKey(patient)]));
      const storedJoinedAt = await store.get<string>(JOINED_AT_KEY);
      const pts = await store.get<Patient[]>("neph_patients");
      const ws = await store.get<WeeklyScores>("neph_weeklyScores");
      const pre = await store.get<QuizScore>("neph_preScore");
      const post = await store.get<QuizScore>("neph_postScore");

      const sharedCurriculum = await store.getShared<typeof WEEKLY>(SHARED_KEYS.curriculum);
      const sharedArticles = await store.getShared<typeof ARTICLES>(SHARED_KEYS.articles);
      const sharedStudySheets = await store.getShared<Partial<StudySheetsData>>(SHARED_KEYS.studySheets);
      const sharedAnnouncements = await store.getShared<Announcement[]>(SHARED_KEYS.announcements);
      const sharedSettingsData = await store.getShared<SharedSettings>(SHARED_KEYS.settings);
      const sharedClinicGuideTemplates = await store.getShared<Partial<ClinicGuideTemplates>>(SHARED_KEYS.clinicGuideTemplates);

      if (!sessionStudentId && sidFromStore) setStudentId(sidFromStore);
      if (name) { setStudentName(name); setNameSet(true); }
      if (year) setStudentYear(year);
      if (pin) setStudentPin(normalizeStudentPinInput(pin));
      if (pendingJoinCode) setJoinCode(pendingJoinCode.trim().toUpperCase());
      if (storedJoinedAt) setJoinedAt(storedJoinedAt);
      if (pts) {
        // Local patients the synced-doc cache has never seen are never-synced
        // offline work (the tab closed before the debounce or write could
        // run). Mark them dirty so the first listener snapshot — which
        // reflects a cloud doc that predates them — can't silently drop them;
        // the next flush unions them into the cloud copy.
        if (guardStudentId) {
          const cachedIds = new Set(cachedPatients.map((patient) => patient?.id));
          pts.forEach((patient) => {
            if (!cachedIds.has(patient.id)) markPatientDirty(patient.id);
          });
        }
        setPatients(pts);
      }
      if (ws) setWeeklyScores(ws);
      if (pre) setPreScore(pre);
      if (post) setPostScore(post);
      if (sharedCurriculum) setCurriculum(sharedCurriculum);
      if (sharedArticles) setArticles(sharedArticles);
      if (sharedStudySheets) setStudySheets(normalizeStudySheets(sharedStudySheets));
      if (sharedAnnouncements) setAnnouncements(sharedAnnouncements);
      if (sharedSettingsData) setSharedSettings(sharedSettingsData);
      if (sharedClinicGuideTemplates) setClinicGuideTemplates(normalizeClinicGuideTemplates(sharedClinicGuideTemplates));
      const sharedClinicGuides = await store.getShared<ClinicGuideRecord[]>(SHARED_KEYS.clinicGuides);
      const loadedGuides = sharedClinicGuides || [];
      const { guides: updatedGuides } = ensureCurrentClinicGuide(loadedGuides);
      setClinicGuides(updatedGuides);
      const completed = await store.get<CompletedItems>("neph_completedItems");
      if (completed) setCompletedItems(completed);
      const savedBookmarks = await store.get<Bookmarks>("neph_bookmarks");
      if (savedBookmarks) setBookmarks(savedBookmarks);
      const savedSrQueue = await store.get<SrQueue>("neph_srQueue");
      if (savedSrQueue) setSrQueue(savedSrQueue);
      const savedLog = await store.get<ActivityLogEntry[]>("neph_activityLog");
      if (savedLog) setActivityLog(savedLog);
      const savedReflections = await store.get<ReflectionEntry[]>("neph_reflections");
      if (savedReflections) setReflections(savedReflections);
      const savedGamification = await store.get<Gamification>("neph_gamification");
      if (savedGamification) setGamification(savedGamification);
      setLoading(false);
    })();
  // `bootstrapAuthSession` (and the auth state it closes over) changes per render,
  // but we only want bootstrap once.
  }, []);

  // Shared write path for the debounced auto-save and flushStudentSync: sends
  // ONLY the fields dirtied since the last confirmed write, their fieldStamps
  // as a partial map (setDoc merge:true merges those keys into the remote map
  // without clobbering unrelated stamps), and a fresh updatedAt. `name` and
  // the auth identity ride on every write so a merge write that has to CREATE
  // the doc can never fail the security rules' name requirement.
  const writeStudentSnapshot = async () => {
    if (dirtyFieldsRef.current.size === 0) return;
    const fields = syncedFieldsRef.current;
    const serializedAtBuild = lastFieldValuesRef.current || {};
    const baseUpdatedAt = syncBaseRef.current;
    const updatedAt = new Date().toISOString();
    const payload: Record<string, unknown> = {};
    const stamps: Record<string, string> = {};
    const writtenSnapshots = new Map<string, string>();
    for (const field of dirtyFieldsRef.current) {
      if (!(field in fields)) continue;
      payload[field] = fields[field];
      writtenSnapshots.set(field, serializedAtBuild[field] ?? "");
      const stamp = fieldStampsRef.current[field];
      // removedPatients carries its own per-id stamps.
      if (field !== "removedPatients" && typeof stamp === "string") stamps[field] = stamp;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "removedPatients")) {
      removedPatientsRef.current = pruneRemovedPatients(removedPatientsRef.current, updatedAt);
      payload.removedPatients = removedPatientsRef.current;
    }
    payload.name = fields.name;
    payload.authType = fields.authType;
    if (typeof fields.email === "string") payload.email = fields.email;
    if (Object.keys(stamps).length > 0) payload.fieldStamps = stamps;
    payload.updatedAt = updatedAt;

    const points = calculatePoints({
      patients: fields.patients,
      weeklyScores: fields.weeklyScores,
      preScore: fields.preScore,
      postScore: fields.postScore,
      gamification: fields.gamification,
      completedItems: fields.completedItems,
      srQueue: fields.srQueue,
    } as Parameters<typeof calculatePoints>[0]);
    noteStudentUpdatedAt(updatedAt);

    await Promise.all([
      store.setStudentData(studentId, payload, { baseUpdatedAt }).then((result) => {
        advanceSyncBase(result.updatedAt);
        // A queued payload keeps its fields dirty: it is parked in the pending
        // queue, and later payloads must keep carrying the fields (the queue
        // dedup merges same-scope payloads key-wise).
        if (result.status === "queued") return;
        // Clear only fields unchanged since this payload was built — anything
        // re-dirtied mid-flight stays dirty for the next write.
        const current = lastFieldValuesRef.current || {};
        for (const [field, snapshot] of writtenSnapshots) {
          if ((current[field] ?? "") === snapshot) dirtyFieldsRef.current.delete(field);
        }
      }),
      store.setTeamSnapshot(studentId, buildTeamSnapshot({
        studentId,
        name: typeof fields.name === "string" ? fields.name : studentName,
        patients: Array.isArray(fields.patients) ? fields.patients as Patient[] : [],
        points,
        updatedAt,
      })),
    ]);
  };

  // Save on changes (consolidated)
  useEffect(() => {
    if (loading) return;

    const nowIso = new Date().toISOString();
    const suppressed = suppressNextAutoSyncRef.current;
    suppressNextAutoSyncRef.current = false;

    // Central per-entry patient stamping: any entry whose content changed
    // since the last run (its own stamp excluded) gets a fresh updatedAt.
    // Stamping here rather than at the mutation call sites guarantees no
    // path is missed; listener-applied entries keep the stamps they arrived
    // with (suppressed runs skip this).
    let syncPatients = patients;
    const patientContents = new Map<string, string>();
    for (const patient of patients) patientContents.set(String(patient.id), patientContentKey(patient));
    if (!suppressed) {
      const prevContents = lastPatientContentsRef.current;
      let restamped = false;
      const stamped = patients.map((patient) => {
        if (prevContents?.get(String(patient.id)) === patientContents.get(String(patient.id))) return patient;
        restamped = true;
        return { ...patient, updatedAt: nowIso };
      });
      if (restamped) {
        syncPatients = stamped;
        // Re-renders once with the stamped entries; the follow-up run sees
        // identical content keys, so this can't loop.
        setPatients(stamped);
      }
    }
    lastPatientContentsRef.current = patientContents;

    store.set("neph_patients", syncPatients);
    store.set("neph_weeklyScores", weeklyScores);
    store.set("neph_preScore", preScore);
    store.set("neph_postScore", postScore);
    if (nameSet) store.set("neph_name", studentName);
    if (studentYear) store.set(STUDENT_YEAR_KEY, studentYear);
    if (studentEmail) store.set(STUDENT_EMAIL_KEY, normalizeEmail(studentEmail));
    store.set("neph_completedItems", completedItems);
    store.set("neph_bookmarks", bookmarks);
    store.set("neph_srQueue", srQueue);
    store.set("neph_activityLog", activityLog);
    store.set("neph_reflections", reflections);
    store.set("neph_gamification", gamification);
    store.set(REMOVED_PATIENTS_KEY, removedPatientsRef.current);

    const syncedFields: Record<string, unknown> = {
      name: studentName,
      ...studentSyncIdentity,
      patients: syncPatients,
      weeklyScores,
      preScore,
      postScore,
      gamification,
      completedItems,
      bookmarks,
      srQueue,
      activityLog,
      reflections,
      removedPatients: removedPatientsRef.current,
    };
    syncedFieldsRef.current = syncedFields;

    // Diff every synced field against its last-known serialization. The first
    // post-load run baselines against the last synced doc cache: fields that
    // differ from it hold never-synced local work and start dirty; no cached
    // doc at all means a first-ever sync, so everything is dirty and the
    // first write sends the whole doc.
    let baseline = lastFieldValuesRef.current;
    if (baseline === null) {
      const cachedDoc = studentId ? store.getCachedStudentDoc(studentId) : null;
      baseline = cachedDoc
        ? Object.fromEntries(Object.keys(syncedFields).map((field) => [field, JSON.stringify(cachedDoc[field] ?? null)]))
        : {};
    }
    const serialized: Record<string, string> = {};
    const changedFields: string[] = [];
    for (const [field, value] of Object.entries(syncedFields)) {
      serialized[field] = JSON.stringify(value ?? null);
      if (baseline[field] !== serialized[field]) changedFields.push(field);
    }
    lastFieldValuesRef.current = serialized;

    // Listener-applied remote state: persist it locally (above) but never echo
    // it back to Firestore — that write-back loop is how two open devices
    // ping-pong writes at each other. The changed values came from the cloud,
    // so they are not locally dirty and keep the remote's stamps.
    if (suppressed) return;

    // Admin deleted this student's cloud record mid-session: writing would
    // resurrect it, so keep changes local-only until the doc reappears.
    if (studentDocRemovedRef.current) return;

    for (const field of changedFields) {
      dirtyFieldsRef.current.add(field);
      if (field !== "removedPatients") fieldStampsRef.current[field] = nowIso;
    }

    // Auto-sync to Firestore (debounced) — only when something is dirty, so a
    // routine app-open or an applied echo no longer produces a write at all.
    if (store.getRotationCode() && studentId && nameSet && studentName.trim() && dirtyFieldsRef.current.size > 0) {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        syncTimerRef.current = null;
        void writeStudentSnapshot();
        // Our snapshot is the canonical state up to this point — clear pending
        // mutation tracking so future foreign writes merge normally.
        pendingDirtyPatientIdsRef.current.clear();
        pendingRemovedPatientIdsRef.current.clear();
      }, 2000);
    }
  }, [patients, weeklyScores, preScore, postScore, studentName, nameSet, loading, completedItems, bookmarks, srQueue, activityLog, reflections, gamification, studentId, studentEmail, studentSyncIdentity]);

  // Real-time rotation data listener
  useEffect(() => {
    if (!store.getRotationCode()) return;
    const unsub = store.onRotationChanged((data) => {
      if (data.curriculum) setCurriculum(data.curriculum);
      if (data.articles) setArticles(data.articles);
      if (data.studySheets) setStudySheets(normalizeStudySheets(data.studySheets as Partial<StudySheetsData>));
      if (data.announcements) setAnnouncements(data.announcements);
      if (data.settings) setSharedSettings(data.settings);
      if (data.clinicGuides) setClinicGuides(data.clinicGuides);
      if (data.clinicGuideTemplates) setClinicGuideTemplates(normalizeClinicGuideTemplates(data.clinicGuideTemplates as Partial<ClinicGuideTemplates>));
    });
    return () => unsub();
  }, [rotationCode]);

  // Real-time listener: admin changes to this student's data (including resets)
  useEffect(() => {
    if (!store.getRotationCode() || !studentId || !nameSet) return;
    const unsub = store.onStudentDataChanged(studentId, (data) => {
      studentDocRemovedRef.current = false;
      setStudentRemoved(false);
      const incomingUpdatedAt = typeof data.updatedAt === "string" ? data.updatedAt : null;
      if (incomingUpdatedAt) {
        const latestKnownUpdatedAt = latestStudentUpdateRef.current;
        if (latestKnownUpdatedAt && incomingUpdatedAt <= latestKnownUpdatedAt) return;
        latestStudentUpdateRef.current = incomingUpdatedAt;
        advanceSyncBase(incomingUpdatedAt);
      }
      // The setters below re-render with this snapshot applied; flag that
      // render so the auto-save effect doesn't write the echo back.
      suppressNextAutoSyncRef.current = true;
      // A locally-newer scalar must survive the debounce window: skip a field
      // whose local stamp is strictly newer than the snapshot's. Both stamps
      // must exist — old clients and pre-migration docs apply as before.
      const incomingStamps = isPlainObject(data.fieldStamps) ? data.fieldStamps : {};
      const localFieldBeats = (field: string) => {
        const localStamp = fieldStampsRef.current[field];
        const incomingStamp = incomingStamps[field];
        return typeof localStamp === "string" && typeof incomingStamp === "string" && localStamp > incomingStamp;
      };
      if (isPlainObject(data.removedPatients)) {
        removedPatientsRef.current = mergeRemovedPatientMaps(removedPatientsRef.current, data.removedPatients);
      }
      if (data.patients) {
        const incoming = data.patients as Patient[];
        const incomingById = new Map(incoming.map((p: Patient) => [p.id, p]));
        const removedMap = removedPatientsRef.current;
        setPatients(currentLocal => {
          // Per-entry merge, mirroring the store's flush rule: the newer-
          // stamped copy wins an id conflict, and a removal recorded on either
          // device beats an entry unless the entry was edited after it.
          // Unstamped conflicts fall back to the pending dirty/removed refs —
          // keep local for in-flight local mutations, otherwise take incoming.
          const result: Patient[] = [];
          const seen = new Set<string | number>();
          for (const local of currentLocal) {
            seen.add(local.id);
            if (pendingRemovedPatientIdsRef.current.has(local.id)) continue;
            const incomingEntry = incomingById.get(local.id);
            let winner: Patient | null;
            if (incomingEntry === undefined) {
              // Missing remotely with no removal record: deleted by an old
              // client (or before removals existed) — drop unless the local
              // copy holds unflushed work.
              winner = pendingDirtyPatientIdsRef.current.has(local.id) ? local : null;
            } else if (patientEntryStamp(local) !== patientEntryStamp(incomingEntry)) {
              winner = patientEntryStamp(local) > patientEntryStamp(incomingEntry) ? local : incomingEntry;
            } else {
              winner = pendingDirtyPatientIdsRef.current.has(local.id) ? local : incomingEntry;
            }
            if (winner && !patientRemovalWins(removedMap[String(local.id)], winner)) result.push(winner);
          }
          for (const inc of incoming) {
            if (seen.has(inc.id)) continue;
            if (pendingRemovedPatientIdsRef.current.has(inc.id)) continue;
            if (patientRemovalWins(removedMap[String(inc.id)], inc)) continue;
            result.push(inc);
          }
          return result;
        });
      }
      // Merge (union per week by attempt date) instead of replacing wholesale:
      // a snapshot stamped between a just-finished quiz and its 2s debounce
      // flush must not erase the attempt. No admin or student flow deletes an
      // attempt, so the union never resurrects removed data.
      if (data.weeklyScores) {
        setWeeklyScores((local) => mergeWeeklyScores(data.weeklyScores, local) as WeeklyScores);
      }
      // Use hasOwnProperty so admin resets that null-out scores still apply
      if (Object.prototype.hasOwnProperty.call(data, "preScore")) setPreScore(data.preScore);
      if (Object.prototype.hasOwnProperty.call(data, "postScore")) setPostScore(data.postScore);
      if (data.gamification) setGamification(data.gamification);
      // Monotonic merge, mirroring the store's flush-guard rule ("completed
      // never un-completes"): a consult-topic Done mark or article check made
      // in the debounce window survives a remote snapshot that predates it,
      // instead of the card resurrecting on the next echo.
      if (data.completedItems) {
        setCompletedItems((local) => mergeCompletedItems(data.completedItems, local) as CompletedItems);
      }
      if (data.bookmarks) setBookmarks(data.bookmarks);
      if (data.srQueue) setSrQueue(data.srQueue);
      if (data.activityLog) setActivityLog(data.activityLog);
      if (data.reflections) setReflections(data.reflections);
      if (typeof data.name === "string" && data.name.trim() && !localFieldBeats("name")) {
        setStudentName(data.name);
        store.set("neph_name", data.name);
      }
      if (typeof data.year === "string" && data.year.trim() && !localFieldBeats("year")) {
        setStudentYear(data.year);
        store.set(STUDENT_YEAR_KEY, data.year);
      }
      // Adopt the snapshot's newer stamps so future comparisons (and the
      // stamps the next write carries) reflect the latest authorship times.
      for (const [field, stamp] of Object.entries(incomingStamps)) {
        if (typeof stamp !== "string") continue;
        const local = fieldStampsRef.current[field];
        if (!local || stamp > local) fieldStampsRef.current[field] = stamp;
      }
    }, () => {
      // Admin removed (or recovered away) this student's cloud record while
      // the device was live. Stop auto-saving and drop this student's queued
      // writes so the device doesn't silently resurrect the deleted doc.
      studentDocRemovedRef.current = true;
      setStudentRemoved(true);
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      store.discardQueuedStudentSync(studentId);
    });
    return () => unsub();
  }, [studentId, nameSet, rotationCode]);

  // A write path found this student's deletion tombstone (offline-return or
  // cold-start case, where the live listener's onRemoved never fired). Same
  // handling: stop the timers and surface the removed state — the store
  // already dropped the payload and purged the queue.
  useEffect(() => {
    if (typeof window === "undefined" || !studentId) return;
    const onStudentRemoved = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail as { studentId?: string } | undefined : undefined;
      if (detail?.studentId !== studentId) return;
      studentDocRemovedRef.current = true;
      setStudentRemoved(true);
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
    window.addEventListener(STUDENT_REMOVED_EVENT, onStudentRemoved);
    return () => window.removeEventListener(STUDENT_REMOVED_EVENT, onStudentRemoved);
  }, [studentId]);

  const flushStudentSync = async () => {
    if (!store.getRotationCode() || !studentId || !nameSet || !studentName.trim()) return;
    if (studentDocRemovedRef.current) return;

    await writeStudentSnapshot();
    // Same bookkeeping as the debounced path: this snapshot is canonical, so
    // future foreign writes merge normally.
    pendingDirtyPatientIdsRef.current.clear();
    pendingRemovedPatientIdsRef.current.clear();
  };

  // Latest flush closure for the unload-path listeners below (they register
  // once with [] deps, but must always call the current-state flush).
  const flushOnHideRef = useRef<() => void>(() => {});
  useEffect(() => {
    flushOnHideRef.current = () => {
      // Only when a debounced save is pending — the timer is set exactly when
      // local changes haven't been written yet.
      if (!syncTimerRef.current) return;
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
      void flushStudentSync();
    };
  });

  // Flush the pending debounce when the tab hides or closes: without this the
  // last ~2s of work (the debounce window) rides on a race whenever a student
  // closes the tab on a shared hospital workstation. pagehide is the reliable
  // close/navigate-away signal; visibilitychange→hidden fires earlier (tab
  // switch, minimize) while the network is still likely to finish the write.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPageHide = () => flushOnHideRef.current();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushOnHideRef.current();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return {
    loading,
    pendingSyncCount,
    studentRemoved,
    syncTimerRef,
    markPatientDirty,
    markPatientRemoved,
    flushStudentSync,
  };
}
