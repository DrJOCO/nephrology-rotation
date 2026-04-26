import { T } from "../../../data/constants";
import type { AdminStudent, QuizScore, SharedSettings } from "../../../types";

export type RotationTiming = { currentWeek: number | null; totalWeeks: number };

export function getScorePct(score: QuizScore | null | undefined): number | null {
  return score && score.total > 0 ? Math.round((score.correct / score.total) * 100) : null;
}

export function toLocalDateKey(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getRotationTiming(settings?: SharedSettings): RotationTiming {
  const totalWeeks = Math.max(1, parseInt(settings?.duration || "4", 10) || 4);
  if (!settings?.rotationStart) return { currentWeek: null, totalWeeks };

  const start = new Date(`${settings.rotationStart}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { currentWeek: null, totalWeeks };

  const week = Math.floor(diffDays / 7) + 1;
  if (week > totalWeeks) return { currentWeek: null, totalWeeks };

  return { currentWeek: Math.min(week, 4), totalWeeks };
}

export function isWithinHours(timestamp: string | null | undefined, hours: number): boolean {
  if (!timestamp) return false;
  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= hours * 60 * 60 * 1000;
}

export function formatBriefDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export function formatBriefRelative(timestamp: string | null): string | null {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((todayStart - targetStart) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return `Updated today ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  if (diffDays === 1) return `Updated yesterday ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  return `Updated ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export function getMinutesSince(timestamp: string | null | undefined): number | null {
  if (!timestamp) return null;
  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.round((Date.now() - time) / 60000));
}

export function getSyncTone(timestamp: string | null | undefined): {
  label: string;
  bg: string;
  text: string;
  border: string;
} {
  const minutes = getMinutesSince(timestamp);
  if (minutes === null) {
    return { label: "No sync yet", bg: T.warningBg, text: T.warning, border: T.warning };
  }
  if (minutes <= 5) {
    return { label: "Live", bg: T.successBg, text: T.success, border: T.success };
  }
  if (minutes <= 30) {
    return { label: "Recent", bg: T.infoBg, text: T.info, border: T.line };
  }
  return { label: "Stale", bg: T.dangerBg, text: T.danger, border: T.danger };
}

export function averageMetric(values: Array<number | null | undefined>): number | null {
  const filtered = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (filtered.length === 0) return null;
  return Math.round(filtered.reduce((sum, value) => sum + value, 0) / filtered.length);
}

export function getBestWeeklyQuizPct(student: Pick<AdminStudent, "weeklyScores">): number | null {
  const attempts = Object.values(student.weeklyScores || {}).flat();
  if (attempts.length === 0) return null;
  return Math.max(...attempts.map((attempt) => (attempt.total > 0 ? Math.round((attempt.correct / attempt.total) * 100) : 0)));
}

export function formatMetric(value: number | null, suffix = "%"): string {
  return value === null ? "—" : `${value}${suffix}`;
}
