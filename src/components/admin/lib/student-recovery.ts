import type { AdminStudent, QuizScore, WeeklyScores, CompletedItems, Bookmarks, ActivityLogEntry, ReflectionEntry } from "../../../types";

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

function mergeCompletedItems(source?: CompletedItems, target?: CompletedItems): CompletedItems | undefined {
  const merged: CompletedItems = {
    articles: { ...(source?.articles || {}), ...(target?.articles || {}) },
    studySheets: { ...(source?.studySheets || {}), ...(target?.studySheets || {}) },
    cases: { ...(source?.cases || {}), ...(target?.cases || {}) },
    decks: { ...(source?.decks || {}), ...(target?.decks || {}) },
    consultTopics: { ...(source?.consultTopics || {}), ...(target?.consultTopics || {}) },
  };
  if (
    Object.keys(merged.articles).length === 0 &&
    Object.keys(merged.studySheets).length === 0 &&
    Object.keys(merged.cases).length === 0 &&
    Object.keys(merged.decks || {}).length === 0 &&
    Object.keys(merged.consultTopics || {}).length === 0
  ) {
    return undefined;
  }
  return merged;
}

function mergeBookmarks(source?: Bookmarks, target?: Bookmarks): Bookmarks | undefined {
  const merged: Bookmarks = {
    trials: Array.from(new Set([...(source?.trials || []), ...(target?.trials || [])])),
    articles: Array.from(new Set([...(source?.articles || []), ...(target?.articles || [])])),
    cases: Array.from(new Set([...(source?.cases || []), ...(target?.cases || [])])),
    studySheets: Array.from(new Set([...(source?.studySheets || []), ...(target?.studySheets || [])])),
  };
  if (
    merged.trials.length === 0 &&
    merged.articles.length === 0 &&
    merged.cases.length === 0 &&
    merged.studySheets.length === 0
  ) {
    return undefined;
  }
  return merged;
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
