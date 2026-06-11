import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { WEEKLY, ARTICLES } from "../data/constants";
import type { ClinicGuideTemplates } from "../data/clinicGuides";
import store from "../utils/store";
import { normalizeStudentPinInput } from "../utils/firebase";
import { ensureGoogleFonts, ensureLayoutStyles, ensureThemeStyles, SHARED_KEYS } from "../utils/helpers";
import { calculatePoints } from "../utils/gamification";
import { ensureCurrentClinicGuide } from "../utils/clinicRotation";
import { normalizeClinicGuideTemplates } from "../utils/clinicGuideTemplates";
import { normalizeStudySheets, type StudySheetsData } from "../utils/studySheets";
import { buildTeamSnapshot } from "../utils/teamSnapshots";
import {
  JOINED_AT_KEY,
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
      if (pts) setPatients(pts);
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

    // Auto-sync to Firestore (debounced)
    if (store.getRotationCode() && studentId && nameSet && studentName.trim()) {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        const updatedAt = new Date().toISOString();
        const points = calculatePoints({ patients, weeklyScores, preScore, postScore, gamification, completedItems, srQueue });
        noteStudentUpdatedAt(updatedAt);
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
        });
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
      const incomingUpdatedAt = typeof data.updatedAt === "string" ? data.updatedAt : null;
      if (incomingUpdatedAt) {
        const latestKnownUpdatedAt = latestStudentUpdateRef.current;
        if (latestKnownUpdatedAt && incomingUpdatedAt <= latestKnownUpdatedAt) return;
        latestStudentUpdateRef.current = incomingUpdatedAt;
      }
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
      if (data.weeklyScores) setWeeklyScores(data.weeklyScores);
      // Use hasOwnProperty so admin resets that null-out scores still apply
      if (Object.prototype.hasOwnProperty.call(data, "preScore")) setPreScore(data.preScore);
      if (Object.prototype.hasOwnProperty.call(data, "postScore")) setPostScore(data.postScore);
      if (data.gamification) setGamification(data.gamification);
      if (data.completedItems) setCompletedItems(data.completedItems);
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
    });
    return () => unsub();
  }, [studentId, nameSet, rotationCode]);

  const flushStudentSync = async () => {
    if (!store.getRotationCode() || !studentId || !nameSet || !studentName.trim()) return;

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
      }),
      store.setTeamSnapshot(studentId, buildTeamSnapshot({
        studentId,
        name: studentName,
        patients,
        points,
        updatedAt,
      })),
    ]);
  };

  return {
    loading,
    pendingSyncCount,
    syncTimerRef,
    markPatientDirty,
    markPatientRemoved,
    flushStudentSync,
  };
}
