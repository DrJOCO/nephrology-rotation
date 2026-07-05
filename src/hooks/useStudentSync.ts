import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { WEEKLY, ARTICLES } from "../data/constants";
import type { ClinicGuideTemplates } from "../data/clinicGuides";
import store from "../utils/store";
import { getCurrentStudentUser, normalizeStudentPinInput, signOutFirebase } from "../utils/firebase";
import { ensureGoogleFonts, ensureLayoutStyles, ensureThemeStyles, SHARED_KEYS } from "../utils/helpers";
import { calculatePoints } from "../utils/gamification";
import { ensureCurrentClinicGuide } from "../utils/clinicRotation";
import { normalizeClinicGuideTemplates } from "../utils/clinicGuideTemplates";
import { normalizeStudySheets, type StudySheetsData } from "../utils/studySheets";
import { buildTeamSnapshot } from "../utils/teamSnapshots";
import { mergeCompletedItems, mergeWeeklyScores } from "../utils/progressMerge";
import {
  JOINED_AT_KEY,
  STUDENT_DEFERRED_SIGNOUT_KEY,
  STUDENT_EMAIL_KEY,
  STUDENT_PENDING_JOIN_CODE_KEY,
  STUDENT_YEAR_KEY,
  normalizeEmail,
} from "./useStudentAuth";
import type { Patient, QuizScore, WeeklyScores, Announcement, SharedSettings, Gamification, ActivityLogEntry, SrQueue, CompletedItems, Bookmarks, ClinicGuideRecord, ReflectionEntry } from "../types";

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
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks locally-mutated patients that haven't been flushed to Firestore yet.
  // Protects against multi-device "last writer wins": when another device's
  // stale auto-save echoes back via the listener, we keep the local version
  // for any ID still in `dirty` (adds/edits/discharges/follow-ups) and drop
  // any ID still in `removed`. Both sets are cleared once our 2s debounce
  // flushes — at that point our state is canonical until the next mutation.
  const pendingDirtyPatientIdsRef = useRef<Set<string | number>>(new Set());
  const pendingRemovedPatientIdsRef = useRef<Set<string | number>>(new Set());
  const markPatientDirty = (id: string | number) => {
    pendingRemovedPatientIdsRef.current.delete(id);
    pendingDirtyPatientIdsRef.current.add(id);
  };
  const markPatientRemoved = (id: string | number) => {
    pendingDirtyPatientIdsRef.current.delete(id);
    pendingRemovedPatientIdsRef.current.add(id);
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
          const cachedDoc = store.getCachedStudentDoc(guardStudentId);
          const cachedPatients = Array.isArray(cachedDoc?.patients) ? cachedDoc.patients as Patient[] : [];
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

  // Save on changes (consolidated)
  useEffect(() => {
    if (loading) return;
    store.set("neph_patients", patients);
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

    // Listener-applied remote state: persist it locally (above) but never echo
    // it back to Firestore — that write-back loop is how two open devices
    // ping-pong full-doc writes at each other.
    if (suppressNextAutoSyncRef.current) {
      suppressNextAutoSyncRef.current = false;
      return;
    }

    // Admin deleted this student's cloud record mid-session: writing would
    // resurrect it, so keep changes local-only until the doc reappears.
    if (studentDocRemovedRef.current) return;

    // Auto-sync to Firestore (debounced)
    if (store.getRotationCode() && studentId && nameSet && studentName.trim()) {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        const baseUpdatedAt = syncBaseRef.current;
        const updatedAt = new Date().toISOString();
        const points = calculatePoints({ patients, weeklyScores, preScore, postScore, gamification, completedItems, srQueue });
        noteStudentUpdatedAt(updatedAt);
        void store.setStudentData(studentId, {
          name: studentName,
          ...studentSyncIdentity,
          patients,
          weeklyScores,
          preScore,
          postScore,
          gamification,
          completedItems,
          bookmarks,
          srQueue,
          activityLog,
          reflections,
          updatedAt,
        }, { baseUpdatedAt }).then((result) => advanceSyncBase(result.updatedAt));
        store.setTeamSnapshot(studentId, buildTeamSnapshot({
          studentId,
          name: studentName,
          patients,
          points,
          updatedAt,
        }));
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
      if (data.patients) {
        const incoming = data.patients;
        const incomingById = new Map(incoming.map((p: Patient) => [p.id, p]));
        setPatients(currentLocal => {
          // ID-based merge: keep local for any ID with pending dirty state,
          // drop any ID still in pendingRemoved, and append incoming-only
          // entries (additions made on the other device).
          const result: Patient[] = [];
          const seen = new Set<string | number>();
          for (const local of currentLocal) {
            if (pendingRemovedPatientIdsRef.current.has(local.id)) continue;
            seen.add(local.id);
            if (pendingDirtyPatientIdsRef.current.has(local.id)) {
              result.push(local);
            } else if (incomingById.has(local.id)) {
              result.push(incomingById.get(local.id) as Patient);
            }
          }
          for (const inc of incoming) {
            if (!seen.has(inc.id)) result.push(inc);
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
      if (typeof data.name === "string" && data.name.trim()) {
        setStudentName(data.name);
        store.set("neph_name", data.name);
      }
      if (typeof data.year === "string" && data.year.trim()) {
        setStudentYear(data.year);
        store.set(STUDENT_YEAR_KEY, data.year);
      }
    }, () => {
      // Admin removed (or recovered away) this student's cloud record while
      // the device was live. Stop auto-saving and drop this student's queued
      // writes so the device doesn't silently resurrect the deleted doc.
      studentDocRemovedRef.current = true;
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      store.discardQueuedStudentSync(studentId);
    });
    return () => unsub();
  }, [studentId, nameSet, rotationCode]);

  const flushStudentSync = async () => {
    if (!store.getRotationCode() || !studentId || !nameSet || !studentName.trim()) return;
    if (studentDocRemovedRef.current) return;

    const baseUpdatedAt = syncBaseRef.current;
    const updatedAt = new Date().toISOString();
    const points = calculatePoints({ patients, weeklyScores, preScore, postScore, gamification, completedItems, srQueue });
    noteStudentUpdatedAt(updatedAt);

    await Promise.all([
      store.setStudentData(studentId, {
        name: studentName,
        ...studentSyncIdentity,
        patients,
        weeklyScores,
        preScore,
        postScore,
        gamification,
        completedItems,
        bookmarks,
        srQueue,
        activityLog,
        reflections,
        updatedAt,
      }, { baseUpdatedAt }).then((result) => advanceSyncBase(result.updatedAt)),
      store.setTeamSnapshot(studentId, buildTeamSnapshot({
        studentId,
        name: studentName,
        patients,
        points,
        updatedAt,
      })),
    ]);
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
    syncTimerRef,
    markPatientDirty,
    markPatientRemoved,
    flushStudentSync,
  };
}
