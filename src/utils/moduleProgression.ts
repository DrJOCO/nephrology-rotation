import { CURRICULUM_DECKS, STUDY_SHEETS } from "../data/constants";
import { WEEKLY_CASES } from "../data/cases";
import { WEEKLY_QUIZZES } from "../data/quizzes";
import type { CompletedItems, WeeklyScores } from "../types";

interface StudentModuleProgressionInput {
  rotationStart?: string | null;
  totalWeeks?: number;
  completedItems?: CompletedItems;
  weeklyScores?: WeeklyScores;
  today?: Date;
}

function normalizeRotationWeeks(totalWeeks?: number): number {
  if (!Number.isFinite(totalWeeks) || !totalWeeks || totalWeeks < 1) return 4;
  return Math.max(Math.floor(totalWeeks), 1);
}

function getMaxCurriculumWeek(totalWeeks?: number): number {
  return Math.min(normalizeRotationWeeks(totalWeeks), 4);
}

function normalizeDate(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function isCoreModuleComplete(
  week: number,
  completedItems: CompletedItems = { articles: {}, studySheets: {}, cases: {}, decks: {} },
  weeklyScores: WeeklyScores = {},
): boolean {
  const studySheets = STUDY_SHEETS[week] || [];
  const allStudySheetsDone = studySheets.every((sheet) => completedItems.studySheets?.[sheet.id]);

  const decks = CURRICULUM_DECKS.filter((deck) => deck.week === week);
  const allDecksDone = decks.every((deck) => completedItems.decks?.[deck.id]);

  const cases = WEEKLY_CASES[week] || [];
  const allCasesDone = cases.every((item) => completedItems.cases?.[item.id]);

  const quizAvailable = (WEEKLY_QUIZZES[week] || []).length > 0;
  const quizDone = !quizAvailable || (weeklyScores[week] || []).length > 0;

  return allStudySheetsDone && allDecksDone && allCasesDone && quizDone;
}

export function getCompletionDrivenModule(
  totalWeeks = 4,
  completedItems: CompletedItems = { articles: {}, studySheets: {}, cases: {}, decks: {} },
  weeklyScores: WeeklyScores = {},
): number {
  const maxWeek = getMaxCurriculumWeek(totalWeeks);
  for (let week = 1; week <= maxWeek; week += 1) {
    if (!isCoreModuleComplete(week, completedItems, weeklyScores)) return week;
  }
  return maxWeek;
}

export function getCalendarWeek(rotationStart?: string | null, totalWeeks = 4, today: Date = new Date()): number | null {
  if (!rotationStart) return null;
  const start = new Date(`${rotationStart}T00:00:00`);
  const normalizedToday = normalizeDate(today);
  const diffDays = Math.floor((normalizedToday.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return null;

  const week = Math.floor(diffDays / 7) + 1;
  if (week > normalizeRotationWeeks(totalWeeks)) return null;
  return Math.min(week, getMaxCurriculumWeek(totalWeeks));
}

export function hasRotationEnded(rotationStart?: string | null, totalWeeks = 4, today: Date = new Date()): boolean {
  if (!rotationStart) return false;
  const start = new Date(`${rotationStart}T00:00:00`);
  const normalizedToday = normalizeDate(today);
  const diffDays = Math.floor((normalizedToday.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1 > normalizeRotationWeeks(totalWeeks);
}

export function getStudentCurrentModule({
  rotationStart,
  totalWeeks = 4,
  completedItems,
  weeklyScores,
  today = new Date(),
}: StudentModuleProgressionInput): number | null {
  const calendarWeek = getCalendarWeek(rotationStart, totalWeeks, today);
  if (calendarWeek === null) return null;

  const completionWeek = getCompletionDrivenModule(totalWeeks, completedItems, weeklyScores);
  return Math.max(calendarWeek, completionWeek);
}
