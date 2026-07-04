import type { AdminStudent, QuizScore, WeeklyScores, CompletedItems, Bookmarks, ActivityLogEntry, ReflectionEntry } from "../../../types";
import type { StudentWriteResult, StudentWriteStatus } from "../../../utils/store";

export type { StudentWriteResult, StudentWriteStatus };

function pickLatestScore(a: QuizScore | null | undefined, b: QuizScore | null | undefined): QuizScore | null {
  if (!a) return b || null;
  if (!b) return a;
  return new Date(a.date).getTime() >= new Date(b.date).getTime() ? a : b;
}

function mergeWeeklyScores(source: WeeklyScores = {}, target: WeeklyScores = {}): WeeklyScores {
  const merged: WeeklyScores = {};
  const weeks = new Set([...Object.keys(source), ...Object.keys(target)]);
  weeks.forEach(week => {
    const seen = new Map<string, QuizScore>();
    [...(source[week] || []), ...(target[week] || [])].forEach(score => {
      seen.set(`${score.date}|${score.correct}|${score.total}`, score);
    });
    merged[week] = Array.from(seen.values()).sort((a, b) => a.date.localeCompare(b.date));
  });
  return merged;
}

// Always return concrete (possibly empty) structures: an undefined field in
// the merged record makes Firestore reject the whole recovery write.
function mergeCompletedItems(source?: CompletedItems, target?: CompletedItems): CompletedItems {
  return {
    articles: { ...(source?.articles || {}), ...(target?.articles || {}) },
    studySheets: { ...(source?.studySheets || {}), ...(target?.studySheets || {}) },
    cases: { ...(source?.cases || {}), ...(target?.cases || {}) },
    decks: { ...(source?.decks || {}), ...(target?.decks || {}) },
    consultTopics: { ...(source?.consultTopics || {}), ...(target?.consultTopics || {}) },
  };
}

function mergeBookmarks(source?: Bookmarks, target?: Bookmarks): Bookmarks {
  return {
    trials: Array.from(new Set([...(source?.trials || []), ...(target?.trials || [])])),
    articles: Array.from(new Set([...(source?.articles || []), ...(target?.articles || [])])),
    cases: Array.from(new Set([...(source?.cases || []), ...(target?.cases || [])])),
    studySheets: Array.from(new Set([...(source?.studySheets || []), ...(target?.studySheets || [])])),
  };
}

function mergeActivityLog(source: ActivityLogEntry[] = [], target: ActivityLogEntry[] = []): ActivityLogEntry[] {
  const deduped = new Map<string, ActivityLogEntry>();
  [...source, ...target].forEach(entry => {
    deduped.set(`${entry.timestamp}|${entry.type}|${entry.label}|${entry.detail}`, entry);
  });
  return Array.from(deduped.values())
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-50);
}

function mergeReflections(source: ReflectionEntry[] = [], target: ReflectionEntry[] = []): ReflectionEntry[] {
  const deduped = new Map<string, ReflectionEntry>();
  [...source, ...target].forEach((entry) => {
    deduped.set(entry.id || `${entry.dayKey}|${entry.submittedAt}`, entry);
  });
  return Array.from(deduped.values())
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
    .slice(-30);
}

export function buildRecoveredStudent(source: AdminStudent, target: AdminStudent): AdminStudent {
  const sourcePatients = source.patients || [];
  const targetPatients = target.patients || [];
  const mergedPatients = [
    ...sourcePatients,
    ...targetPatients.filter(tp => !sourcePatients.some(sp => String(sp.id) === String(tp.id))),
  ];
  const mergedAchievements = Array.from(new Set([
    ...(source.gamification?.achievements || []),
    ...(target.gamification?.achievements || []),
  ]));
  const mergedActivityLog = mergeActivityLog(source.activityLog || [], target.activityLog || []);

  return {
    ...target,
    name: target.name || source.name,
    year: target.year || source.year,
    email: target.email || source.email,
    status: target.status === "active" || source.status === "active" ? "active" : "completed",
    addedDate: [source.addedDate, target.addedDate].filter(Boolean).sort()[0] || new Date().toISOString(),
    patients: mergedPatients,
    weeklyScores: mergeWeeklyScores(source.weeklyScores || {}, target.weeklyScores || {}),
    preScore: pickLatestScore(source.preScore, target.preScore),
    postScore: pickLatestScore(source.postScore, target.postScore),
    gamification: {
      points: Math.max(source.gamification?.points || 0, target.gamification?.points || 0),
      achievements: mergedAchievements,
      streaks:
        (target.gamification?.streaks?.lastActiveDate || "") >= (source.gamification?.streaks?.lastActiveDate || "")
          ? (target.gamification?.streaks || source.gamification?.streaks || { currentDays: 0, longestDays: 0, lastActiveDate: null })
          : (source.gamification?.streaks || target.gamification?.streaks || { currentDays: 0, longestDays: 0, lastActiveDate: null }),
    },
    srQueue: { ...(source.srQueue || {}), ...(target.srQueue || {}) },
    activityLog: mergedActivityLog,
    reflections: mergeReflections(source.reflections, target.reflections),
    completedItems: mergeCompletedItems(source.completedItems, target.completedItems),
    bookmarks: mergeBookmarks(source.bookmarks, target.bookmarks),
    feedbackTags: [
      ...(source.feedbackTags || []),
      ...(target.feedbackTags || []).filter(tag =>
        !(source.feedbackTags || []).some(existing =>
          existing.tag === tag.tag && existing.date === tag.date && existing.note === tag.note
        )
      ),
    ],
    lastSyncedAt: new Date().toISOString(),
  };
}

export interface RecoverySyncStore {
  setStudentData(studentId: string, data: Record<string, unknown>): Promise<StudentWriteResult>;
  setTeamSnapshot(studentId: string, data: object): Promise<unknown>;
  deleteStudentData(studentId: string): Promise<unknown>;
}

// Merge source → target, write the merged record, and delete the source only
// after Firestore confirms the target write. A queued or failed write must
// leave the source untouched — it may hold the student's only progress copy.
export async function performStudentRecovery(
  syncStore: RecoverySyncStore,
  source: AdminStudent,
  target: AdminStudent,
  buildSnapshot: (merged: AdminStudent) => object,
): Promise<AdminStudent> {
  const merged = buildRecoveredStudent(source, target);
  const writeResult = await syncStore.setStudentData(target.studentId, {
    name: merged.name,
    year: merged.year,
    email: merged.email,
    status: merged.status,
    joinedAt: merged.addedDate,
    patients: merged.patients,
    weeklyScores: merged.weeklyScores,
    preScore: merged.preScore,
    postScore: merged.postScore,
    gamification: merged.gamification,
    srQueue: merged.srQueue,
    activityLog: merged.activityLog,
    reflections: merged.reflections,
    completedItems: merged.completedItems,
    bookmarks: merged.bookmarks,
    feedbackTags: merged.feedbackTags,
    updatedAt: new Date().toISOString(),
  });
  if (writeResult.status !== "applied") {
    throw new Error("The merged progress could not be confirmed as saved (offline or sync error). Nothing was deleted — try again once the connection is back.");
  }
  await syncStore.setTeamSnapshot(target.studentId, buildSnapshot(merged));
  await syncStore.deleteStudentData(source.studentId);
  return merged;
}
