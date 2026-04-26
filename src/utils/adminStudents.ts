import { ARTICLES, CURRICULUM_DECKS, STUDY_SHEETS } from "../data/constants";
import { WEEKLY_CASES } from "../data/cases";
import { WEEKLY_QUIZZES } from "../data/quizzes";
import type { AdminStudent, Bookmarks, CompletedItems, Gamification } from "../types";

type AdminStudentSource = Omit<Partial<AdminStudent>, "completedItems" | "bookmarks" | "gamification"> & {
  studentId: string;
  updatedAt?: string | null;
  joinedAt?: string | null;
  completedItems?: Partial<CompletedItems> | null;
  bookmarks?: Partial<Bookmarks> | null;
  gamification?: Partial<Gamification> | null;
};

interface NormalizeAdminStudentOptions {
  fallbackId?: AdminStudent["id"];
  fallbackName?: string;
  fallbackYear?: string;
  fallbackAddedDate?: string;
}

export interface StudentProgressSummary {
  completedArticles: number;
  totalArticles: number;
  completedStudySheets: number;
  totalStudySheets: number;
  completedDecks: number;
  totalDecks: number;
  completedCases: number;
  totalCases: number;
  completedCoreItems: number;
  totalCoreItems: number;
  coreCompletionPercent: number;
  quizWeeksStarted: number;
  totalQuizWeeks: number;
  totalQuizAttempts: number;
  assessmentsDone: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeCompletedItems(value?: Partial<CompletedItems> | null): CompletedItems {
  return {
    articles: isRecord(value?.articles) ? (value.articles as CompletedItems["articles"]) : {},
    studySheets: isRecord(value?.studySheets) ? (value.studySheets as CompletedItems["studySheets"]) : {},
    cases: isRecord(value?.cases) ? (value.cases as CompletedItems["cases"]) : {},
    decks: isRecord(value?.decks) ? (value.decks as NonNullable<CompletedItems["decks"]>) : {},
  };
}

function normalizeBookmarks(value?: Partial<Bookmarks> | null): Bookmarks {
  return {
    trials: Array.isArray(value?.trials) ? value.trials.filter((item): item is string => typeof item === "string") : [],
    articles: Array.isArray(value?.articles) ? value.articles.filter((item): item is string => typeof item === "string") : [],
    cases: Array.isArray(value?.cases) ? value.cases.filter((item): item is string => typeof item === "string") : [],
    studySheets: Array.isArray(value?.studySheets) ? value.studySheets.filter((item): item is string => typeof item === "string") : [],
  };
}

function normalizeGamification(value?: Partial<Gamification> | null): Gamification | undefined {
  if (!value) return undefined;
  return {
    points: typeof value.points === "number" ? value.points : 0,
    achievements: Array.isArray(value.achievements) ? value.achievements.filter((item): item is string => typeof item === "string") : [],
    streaks: {
      currentDays: typeof value.streaks?.currentDays === "number" ? value.streaks.currentDays : 0,
      longestDays: typeof value.streaks?.longestDays === "number" ? value.streaks.longestDays : 0,
      lastActiveDate: typeof value.streaks?.lastActiveDate === "string" ? value.streaks.lastActiveDate : null,
      ...(Array.isArray(value.streaks?.activityLog)
        ? { activityLog: value.streaks.activityLog.filter((item): item is string => typeof item === "string") }
        : {}),
    },
  };
}

export function normalizeAdminStudentRecord(
  source: AdminStudentSource,
  existing?: AdminStudent,
  options: NormalizeAdminStudentOptions = {},
): AdminStudent {
  const merged = { ...existing, ...source };
  const addedDate = typeof source.joinedAt === "string" && source.joinedAt
    ? source.joinedAt
    : typeof merged.addedDate === "string" && merged.addedDate
      ? merged.addedDate
      : options.fallbackAddedDate || new Date().toISOString();

  return {
    id: (merged.id ?? options.fallbackId ?? source.studentId) as AdminStudent["id"],
    studentId: source.studentId,
    name: typeof merged.name === "string" && merged.name.trim()
      ? merged.name
      : options.fallbackName || "Unknown",
    year: typeof merged.year === "string" && merged.year.trim()
      ? merged.year
      : options.fallbackYear || "MS3/MS4",
    email: typeof merged.email === "string" ? merged.email : "",
    status: merged.status === "completed" ? "completed" : "active",
    addedDate,
    patients: Array.isArray(merged.patients) ? merged.patients : [],
    weeklyScores: isRecord(merged.weeklyScores) ? (merged.weeklyScores as AdminStudent["weeklyScores"]) : {},
    preScore: merged.preScore ?? null,
    postScore: merged.postScore ?? null,
    gamification: normalizeGamification(merged.gamification),
    srQueue: isRecord(merged.srQueue) ? (merged.srQueue as AdminStudent["srQueue"]) : {},
    activityLog: Array.isArray(merged.activityLog) ? merged.activityLog : [],
    reflections: Array.isArray(merged.reflections) ? merged.reflections : [],
    completedItems: normalizeCompletedItems(merged.completedItems),
    bookmarks: normalizeBookmarks(merged.bookmarks),
    feedbackTags: Array.isArray(merged.feedbackTags) ? merged.feedbackTags : [],
    lastSyncedAt: typeof source.updatedAt === "string"
      ? source.updatedAt
      : typeof merged.lastSyncedAt === "string"
        ? merged.lastSyncedAt
        : null,
  };
}

export function buildStudentProgressSummary(
  student: Pick<AdminStudent, "completedItems" | "weeklyScores" | "preScore" | "postScore">,
  articlesByWeek: typeof ARTICLES = ARTICLES,
): StudentProgressSummary {
  const completed = normalizeCompletedItems(student.completedItems);
  const weeks = [1, 2, 3, 4];

  const totalArticles = weeks.reduce((sum, week) => sum + (articlesByWeek[week] || []).length, 0);
  const completedArticles = weeks.reduce((sum, week) => {
    return sum + (articlesByWeek[week] || []).filter((article) => completed.articles[article.url]).length;
  }, 0);

  const totalStudySheets = weeks.reduce((sum, week) => sum + (STUDY_SHEETS[week] || []).length, 0);
  const completedStudySheets = weeks.reduce((sum, week) => {
    return sum + (STUDY_SHEETS[week] || []).filter((sheet) => completed.studySheets[sheet.id]).length;
  }, 0);

  const totalDecks = CURRICULUM_DECKS.length;
  const completedDecks = CURRICULUM_DECKS.filter((deck) => completed.decks?.[deck.id]).length;

  const totalCases = weeks.reduce((sum, week) => sum + (WEEKLY_CASES[week] || []).length, 0);
  const completedCases = weeks.reduce((sum, week) => {
    return sum + (WEEKLY_CASES[week] || []).filter((item) => completed.cases[item.id]).length;
  }, 0);

  const weeklyScores = student.weeklyScores || {};
  const totalQuizWeeks = weeks.filter((week) => (WEEKLY_QUIZZES[week] || []).length > 0).length;
  const quizWeeksStarted = weeks.filter((week) => (weeklyScores[week] || []).length > 0).length;
  const totalCoreItems = totalStudySheets + totalDecks + totalCases + totalQuizWeeks;
  const completedCoreItems = completedStudySheets + completedDecks + completedCases + quizWeeksStarted;
  const totalQuizAttempts = Object.values(weeklyScores).flat().length;
  const assessmentsDone = Number(Boolean(student.preScore)) + Number(Boolean(student.postScore));

  return {
    completedArticles,
    totalArticles,
    completedStudySheets,
    totalStudySheets,
    completedDecks,
    totalDecks,
    completedCases,
    totalCases,
    completedCoreItems,
    totalCoreItems,
    coreCompletionPercent: totalCoreItems > 0 ? Math.round((completedCoreItems / totalCoreItems) * 100) : 0,
    quizWeeksStarted,
    totalQuizWeeks,
    totalQuizAttempts,
    assessmentsDone,
  };
}
