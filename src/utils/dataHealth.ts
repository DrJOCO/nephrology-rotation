// Detection-only data-health check for the admin panel.
//
// A since-fixed bug caused a completed module quiz, when reopened, to record a
// DUPLICATE attempt in weeklyScores: same week, usually identical correct/total,
// a fresh date each reopen, and often an identical answers array. Data written
// by the buggy build may still contain these near-duplicates. They inflate
// attempt counts and skew averages in the admin analytics, so the attending
// needs to SEE whether his cohort is affected before trusting those numbers.
//
// This module ONLY detects and describes. It never mutates or deletes student
// data — the attending decides what to do with a flagged record.
//
// Why "near-duplicate" and not "exact-duplicate": progressMerge.mergeWeeklyScores
// unions a week's attempts by attempt date across devices, so two byte-identical
// attempt objects (same date) were already collapsed to one on sync. What
// survives is the reopen pattern — same score, same answers, but a DIFFERENT
// (later) date each time the quiz was reopened.

import type { WeeklyScores, QuizScore, QuizAnswer } from "../types";

/** One cluster of attempts within a week that look like reopen-duplicates. */
export interface DuplicateAttemptGroup {
  /** The week key exactly as it appears in weeklyScores (e.g. "1"). */
  week: string;
  /** correct/total shared by every attempt in the group (the repeated score). */
  correct: number;
  total: number;
  /** ISO date strings of every attempt in the group, in ascending order. */
  dates: string[];
  /** Number of attempts in the group (always >= 2). */
  count: number;
  /** count - 1: how many attempts are surplus (the extras a reopen created). */
  surplus: number;
}

/** Per-student summary of suspected reopen-duplicate quiz attempts. */
export interface DuplicateAttemptReport {
  /** True when at least one duplicate group was found. */
  hasDuplicates: boolean;
  /** Every duplicate group found, across all weeks. */
  groups: DuplicateAttemptGroup[];
  /**
   * Total surplus attempts across all groups — i.e. how many attempts are
   * likely bug artifacts (sum of each group's count - 1).
   */
  totalSurplus: number;
  /**
   * The exact ISO date strings that are flagged as duplicates, for subtle
   * per-attempt marking in a score list. Contains every date in every group
   * EXCEPT the earliest date of each group (the original attempt is kept
   * unmarked; only the reopen copies are flagged).
   */
  flaggedDates: Set<string>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// A valid attempt for our purposes has numeric correct/total and a parseable
// date. Malformed entries are skipped rather than throwing, so partial or
// legacy data can't crash the admin panel.
function isUsableAttempt(value: unknown): value is QuizScore {
  return (
    isPlainObject(value) &&
    typeof value.correct === "number" &&
    typeof value.total === "number" &&
    typeof value.date === "string" &&
    !Number.isNaN(Date.parse(value.date))
  );
}

// Canonical signature of an answers array, order-sensitive (attempt order is
// meaningful). Returns null when there is no usable answers array so that
// "answers present on both sides" can be distinguished from "answers absent".
function answersSignature(answers: unknown): string | null {
  if (!Array.isArray(answers) || answers.length === 0) return null;
  const parts: string[] = [];
  for (const a of answers) {
    if (!isPlainObject(a)) return null;
    const ans = a as Partial<QuizAnswer>;
    if (typeof ans.qIdx !== "number" || typeof ans.chosen !== "number") return null;
    parts.push(`${ans.qIdx}:${ans.chosen}`);
  }
  return parts.join("|");
}

// Two attempts are reopen-duplicates when they share correct AND total, their
// dates are within 24h of each other, AND — when both carry a usable answers
// array — those answers match. Rationale for the answers rule:
//   - identical score + identical answers + near-in-time  => reopen duplicate  (FLAG)
//   - identical score + DIFFERENT answers                  => genuine retake     (keep)
//   - identical score, answers missing on one/both sides   => fall back to score+time
// The last case matters because admin-entered scores store answers: [] (empty),
// and an empty array is treated as "absent" so it never wrongly separates a
// pair that is otherwise a clear time-clustered score duplicate.
function areReopenDuplicates(a: QuizScore, b: QuizScore): boolean {
  if (a.correct !== b.correct || a.total !== b.total) return false;
  if (Math.abs(Date.parse(a.date) - Date.parse(b.date)) > DAY_MS) return false;
  const sigA = answersSignature(a.answers);
  const sigB = answersSignature(b.answers);
  if (sigA !== null && sigB !== null && sigA !== sigB) return false;
  return true;
}

// Cluster a single week's attempts into groups of mutually-compatible reopen
// duplicates. A greedy single-linkage pass keyed on (correct,total,answers) with
// a 24h window: we sort by date, then extend a run while each next attempt is a
// reopen-duplicate of the run's ANCHOR (its earliest member). Anchoring on the
// first member — not the previous — keeps the 24h window measured from the
// original attempt, so a slow drift of same-score reopens spread over more than
// a day is correctly split rather than chained into one oversized group.
function clusterWeek(week: string, attempts: QuizScore[]): DuplicateAttemptGroup[] {
  const sorted = attempts
    .slice()
    .sort((x, y) => Date.parse(x.date) - Date.parse(y.date));

  const groups: DuplicateAttemptGroup[] = [];
  const used = new Array<boolean>(sorted.length).fill(false);

  for (let i = 0; i < sorted.length; i++) {
    if (used[i]) continue;
    const anchor = sorted[i];
    const members = [anchor];
    const memberIdx = [i];
    for (let j = i + 1; j < sorted.length; j++) {
      if (used[j]) continue;
      if (areReopenDuplicates(anchor, sorted[j])) {
        members.push(sorted[j]);
        memberIdx.push(j);
      }
    }
    if (members.length > 1) {
      memberIdx.forEach((idx) => { used[idx] = true; });
      groups.push({
        week,
        correct: anchor.correct,
        total: anchor.total,
        dates: members.map((m) => m.date),
        count: members.length,
        surplus: members.length - 1,
      });
    }
  }

  return groups;
}

/**
 * Scan a student's weeklyScores for groups of attempts that look like
 * reopen-duplicates from the since-fixed quiz-reopen bug.
 *
 * Detection only — never mutates the input. Safe on empty, missing, or
 * malformed data (returns an empty, no-duplicates report).
 *
 * A group is flagged only when 2+ attempts in the same week share correct AND
 * total AND (identical answers when both attempts carry an answers array) with
 * dates within 24 hours of each other. Genuine retakes with different
 * answers/scores are NOT flagged; same-score retakes with different answers are
 * NOT flagged; same-score duplicates more than 24h apart are NOT flagged.
 */
export function findSuspiciousDuplicateAttempts(
  weeklyScores: WeeklyScores | null | undefined,
): DuplicateAttemptReport {
  const empty: DuplicateAttemptReport = {
    hasDuplicates: false,
    groups: [],
    totalSurplus: 0,
    flaggedDates: new Set<string>(),
  };

  if (!isPlainObject(weeklyScores)) return empty;

  const groups: DuplicateAttemptGroup[] = [];
  // Stable week ordering: numeric weeks ascending, then any non-numeric keys.
  const weekKeys = Object.keys(weeklyScores).sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isNaN(na) && Number.isNaN(nb)) return a.localeCompare(b);
    if (Number.isNaN(na)) return 1;
    if (Number.isNaN(nb)) return -1;
    return na - nb;
  });

  for (const week of weekKeys) {
    const raw = (weeklyScores as Record<string, unknown>)[week];
    if (!Array.isArray(raw)) continue;
    const attempts = raw.filter(isUsableAttempt);
    if (attempts.length < 2) continue;
    groups.push(...clusterWeek(week, attempts));
  }

  const flaggedDates = new Set<string>();
  let totalSurplus = 0;
  for (const group of groups) {
    totalSurplus += group.surplus;
    // Keep the earliest (dates are ascending) unmarked; flag the reopen copies.
    group.dates.slice(1).forEach((date) => flaggedDates.add(date));
  }

  return {
    hasDuplicates: groups.length > 0,
    groups,
    totalSurplus,
    flaggedDates,
  };
}

/**
 * Count how many students in a roster have at least one suspected duplicate
 * group. Convenience wrapper for the cohort-level banner.
 */
export function countStudentsWithDuplicates(
  students: { weeklyScores?: WeeklyScores | null }[],
): number {
  return students.reduce(
    (n, student) => (findSuspiciousDuplicateAttempts(student.weeklyScores).hasDuplicates ? n + 1 : n),
    0,
  );
}
