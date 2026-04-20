import React, { useState, useEffect, useCallback } from "react";
import { T, TOPICS, WEEKLY, ARTICLES, STUDY_SHEETS, FEEDBACK_TAGS, COMMON_PATIENT_TOPICS, ADDITIONAL_PATIENT_TOPICS } from "../data/constants";
import { PRE_QUIZ, POST_QUIZ, WEEKLY_QUIZZES } from "../data/quizzes";
import { WEEKLY_CASES } from "../data/cases";
import { QUICK_REFS } from "../data/guides";
import store, { RotationInfo } from "../utils/store";
import { getCurrentAdminUser, signInAdmin, signOutFirebase } from "../utils/firebase";
import { ensureGoogleFonts, ensureShakeAnimation, ensureLayoutStyles, ensureThemeStyles, SHARED_KEYS, createRotationCode } from "../utils/helpers";
import { calculatePoints, ACHIEVEMENTS } from "../utils/gamification";
import { buildTeamSnapshot } from "../utils/teamSnapshots";
import { validatePatientForm, clampLength, LIMITS, PHI_WARNING } from "../utils/validation";
import { buildCompetencySummary } from "../utils/competency";
import { buildAssessmentSummary } from "../utils/assessmentInsights";
import { HistogramChart, FunnelChart, HeatmapChart } from "./student/charts";
import { CLINIC_GUIDES, CLINIC_GUIDE_TOPICS, type ClinicGuideTopic } from "../data/clinicGuides";
import { getCurrentOrNextFriday, getClinicTopicForDate, ensureCurrentClinicGuide, overrideClinicGuide, regenerateClinicGuide } from "../utils/clinicRotation";
import type { AdminSubView, AdminStudent, Announcement, SharedSettings, SrItem, Patient, QuizScore, WeeklyScores, Gamification, FeedbackTag, ClinicGuideRecord, CompletedItems, Bookmarks, ActivityLogEntry } from "../types";

type NavigateFn = (t: string, sv?: AdminSubView) => void;
type WeeklyData = typeof WEEKLY;
type ArticlesData = typeof ARTICLES;
type AdminSession = { uid: string; email: string };
type RotationTiming = { currentWeek: number | null; totalWeeks: number };
type DailyBriefStudent = {
  student: AdminStudent;
  masteryPercent: number;
  studySignals: string[];
  serviceTopics: string[];
  teachNext: string;
  teachWhy: string;
  askTomorrow: string;
  lastTouched: string | null;
};
type DailyAttendingBrief = {
  todayLabel: string;
  tomorrowLabel: string;
  recommendationTopic: string;
  recommendationReason: string;
  recommendationBridge: string | null;
  studyCoverage: Array<{ label: string; count: number }>;
  serviceCoverage: Array<{ label: string; count: number }>;
  students: DailyBriefStudent[];
};
type AdminAssessmentSignal = {
  mode: "pre" | "post";
  overallPct: number;
  comparisonPct: number | null;
  summary: ReturnType<typeof buildAssessmentSummary> | null;
  hasDetailedAnswers: boolean;
  note: string | null;
};

function getAdminAuthErrorMessage(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";
  const message = error instanceof Error ? error.message : "";
  if (message === "admin/unauthorized") {
    return "This Firebase account is not listed in the Firestore admins collection.";
  }
  if (code === "auth/invalid-email") return "Enter a valid admin email address.";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Email or password incorrect.";
  }
  if (code === "auth/too-many-requests") return "Too many sign-in attempts. Try again later.";
  if (code === "auth/operation-not-allowed") return "Enable Email/Password sign-in in Firebase Authentication.";
  return "Admin sign-in failed. Check Firebase Auth and your admin setup.";
}

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
  };
  if (
    Object.keys(merged.articles).length === 0 &&
    Object.keys(merged.studySheets).length === 0 &&
    Object.keys(merged.cases).length === 0
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

function buildRecoveredStudent(source: AdminStudent, target: AdminStudent): AdminStudent {
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
    loginPin: target.loginPin || source.loginPin,
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

function getScorePct(score: QuizScore | null | undefined): number | null {
  return score && score.total > 0 ? Math.round((score.correct / score.total) * 100) : null;
}

function getRotationTiming(settings?: SharedSettings): RotationTiming {
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

function buildAdminCompetencySnapshot(student: AdminStudent, settings: SharedSettings | undefined, articlesByWeek: ArticlesData) {
  const { currentWeek, totalWeeks } = getRotationTiming(settings);
  return buildCompetencySummary({
    weeklyScores: student.weeklyScores || {},
    preScore: student.preScore || null,
    postScore: student.postScore || null,
    completedItems: student.completedItems,
    srQueue: student.srQueue || {},
    currentWeek,
    totalWeeks,
    articlesByWeek,
  });
}

function buildAdminAssessmentSignal(student: AdminStudent): AdminAssessmentSignal | null {
  const score = student.postScore || student.preScore;
  if (!score) return null;

  const mode = student.postScore ? "post" : "pre";
  const comparisonScore = student.postScore ? student.preScore : null;
  const overallPct = getScorePct(score) || 0;
  const comparisonPct = getScorePct(comparisonScore);
  const hasDetailedAnswers = Boolean(score.answers?.length);

  if (!hasDetailedAnswers) {
    return {
      mode,
      overallPct,
      comparisonPct,
      summary: null,
      hasDetailedAnswers: false,
      note: "Detailed topic insight appears when the assessment is completed in-app.",
    };
  }

  return {
    mode,
    overallPct,
    comparisonPct,
    summary: buildAssessmentSummary({ mode, score, comparisonScore }),
    hasDetailedAnswers: true,
    note: null,
  };
}

function buildCohortTeachingSignals(students: AdminStudent[]) {
  const focusCounts: Record<string, number> = {};
  const strongestCounts: Record<string, number> = {};
  let studentsWithAssessments = 0;
  let detailedAssessments = 0;

  students.forEach((student) => {
    const signal = buildAdminAssessmentSignal(student);
    if (!signal) return;
    studentsWithAssessments += 1;
    if (!signal.summary) return;
    detailedAssessments += 1;
    focusCounts[signal.summary.recommendedArea.shortLabel] = (focusCounts[signal.summary.recommendedArea.shortLabel] || 0) + 1;
    const strongest = signal.summary.strongestAreas[0]?.shortLabel;
    if (strongest) strongestCounts[strongest] = (strongestCounts[strongest] || 0) + 1;
  });

  return {
    studentsWithAssessments,
    detailedAssessments,
    focusAreas: Object.entries(focusCounts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ label, count })),
    strongestAreas: Object.entries(strongestCounts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ label, count })),
  };
}

function buildCohortCompetencyNeeds(students: AdminStudent[], settings: SharedSettings | undefined, articlesByWeek: ArticlesData) {
  const needs: Record<string, number> = {};
  students.forEach((student) => {
    const summary = buildAdminCompetencySnapshot(student, settings, articlesByWeek);
    summary.domains
      .filter((domain) => domain.tier !== "Proficient")
      .forEach((domain) => {
        needs[domain.label] = (needs[domain.label] || 0) + 1;
      });
  });

  return Object.entries(needs)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count }));
}

const CASE_META_BY_ID = new Map<string, { title: string; week: number; topics: string[] }>(
  Object.entries(WEEKLY_CASES).flatMap(([week, cases]) =>
    (cases || []).map((item) => [item.id, { title: item.title, week: Number(week), topics: item.topics || [] }] as const)
  )
);

function isWithinHours(timestamp: string | null | undefined, hours: number): boolean {
  if (!timestamp) return false;
  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= hours * 60 * 60 * 1000;
}

function formatBriefDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function formatBriefRelative(timestamp: string | null): string | null {
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

function countTopicsFromPatients(patients: Patient[]): Array<{ label: string; count: number }> {
  const counts: Record<string, number> = {};
  patients.forEach((patient) => {
    const topics = patient.topics?.length ? patient.topics : patient.topic ? [patient.topic] : [];
    topics.forEach((topic) => {
      counts[topic] = (counts[topic] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count }));
}

function buildStudentStudySignals(student: AdminStudent): string[] {
  const signals: string[] = [];

  [1, 2, 3, 4].forEach((week) => {
    const attempts = (student.weeklyScores || {})[week] || [];
    if (attempts.some((attempt) => isWithinHours(attempt.date, 36))) {
      signals.push(`${WEEKLY[week].title} quiz`);
    }
  });

  if (isWithinHours(student.preScore?.date, 36)) signals.push("Pre-assessment");
  if (isWithinHours(student.postScore?.date, 36)) signals.push("Post-assessment");

  Object.entries(student.completedItems?.cases || {}).forEach(([caseId, result]) => {
    if (!isWithinHours(result.date, 36)) return;
    const meta = CASE_META_BY_ID.get(caseId);
    signals.push(meta ? `${meta.title} case` : "Clinical case");
  });

  const recentActivity = (student.activityLog || []).filter((entry) => isWithinHours(entry.timestamp, 36));
  const articleDetails = recentActivity
    .filter((entry) => entry.type === "article")
    .map((entry) => entry.detail || entry.label)
    .filter(Boolean);
  const studySheetDetails = recentActivity
    .filter((entry) => entry.type === "study_sheet")
    .map((entry) => entry.detail || entry.label)
    .filter(Boolean);
  const srReviews = recentActivity.filter((entry) => entry.type === "sr_review").length;

  articleDetails.slice(0, 2).forEach((detail) => signals.push(`Article: ${detail}`));
  studySheetDetails.slice(0, 2).forEach((detail) => signals.push(`Sheet: ${detail}`));
  if (srReviews > 0) signals.push(`${srReviews} SR review${srReviews !== 1 ? "s" : ""}`);

  return Array.from(new Set(signals)).slice(0, 4);
}

function getStudentServiceTopics(student: AdminStudent): string[] {
  const activePatients = (student.patients || []).filter((patient) => patient.status === "active");
  const candidatePatients = activePatients.length > 0
    ? activePatients
    : (student.patients || []).filter((patient) => isWithinHours(patient.date, 96));
  return countTopicsFromPatients(candidatePatients).slice(0, 3).map((item) => item.label);
}

function getStudentLastTouched(student: AdminStudent): string | null {
  const timestamps = [
    student.lastSyncedAt || null,
    student.preScore?.date || null,
    student.postScore?.date || null,
    ...(student.activityLog || []).map((entry) => entry.timestamp),
    ...(student.patients || []).map((patient) => patient.date),
    ...Object.values(student.weeklyScores || {}).flat().map((score) => score.date),
    ...Object.values(student.completedItems?.cases || {}).map((result) => result.date),
  ].filter(Boolean) as string[];

  if (timestamps.length === 0) return null;
  return timestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

function buildDailyAttendingBrief(students: AdminStudent[], settings: SharedSettings | undefined, articlesByWeek: ArticlesData): DailyAttendingBrief {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const studyCoverageCounts: Record<string, number> = {};
  const serviceCoverage = countTopicsFromPatients(
    students.flatMap((student) => (student.patients || []).filter((patient) => patient.status === "active"))
  );
  const teachingSignals = buildCohortTeachingSignals(students);
  const domainNeeds = buildCohortCompetencyNeeds(students, settings, articlesByWeek);

  const studentBriefs = students.map<DailyBriefStudent>((student) => {
    const competency = buildAdminCompetencySnapshot(student, settings, articlesByWeek);
    const assessment = buildAdminAssessmentSignal(student);
    const serviceTopics = getStudentServiceTopics(student);
    const studySignals = buildStudentStudySignals(student);
    studySignals.forEach((signal) => {
      studyCoverageCounts[signal] = (studyCoverageCounts[signal] || 0) + 1;
    });

    const gapDomain = competency.domains
      .filter((domain) => domain.tier !== "Proficient")
      .sort((a, b) => a.progress - b.progress || a.label.localeCompare(b.label))[0];
    const missedTopic = assessment?.summary?.recommendedArea.missedTopics[0] || null;
    const serviceAnchor = serviceTopics[0] || null;
    const teachNext = assessment?.summary?.recommendedArea.label || gapDomain?.label || serviceAnchor || competency.topDomain.label;
    const teachWhy = assessment?.summary
      ? assessment.summary.detailLine
      : gapDomain
        ? `${gapDomain.label} is still ${gapDomain.tier.toLowerCase()} and ${gapDomain.progressLabel.toLowerCase()}`
        : serviceAnchor
          ? `${serviceAnchor} is active on service and worth reinforcing explicitly`
          : competency.masteryDetail;

    let askTomorrow = `Ask ${student.name.split(" ")[0]} to teach back ${teachNext}.`;
    if (missedTopic && serviceAnchor) {
      askTomorrow = `Ask ${student.name.split(" ")[0]} to apply ${missedTopic} to a ${serviceAnchor} patient.`;
    } else if (missedTopic) {
      askTomorrow = `Ask ${student.name.split(" ")[0]} for a one-minute approach to ${missedTopic}.`;
    } else if (serviceAnchor) {
      askTomorrow = `Ask ${student.name.split(" ")[0]} how they would work up ${serviceAnchor} on rounds.`;
    }

    return {
      student,
      masteryPercent: competency.masteryPercent,
      studySignals,
      serviceTopics,
      teachNext,
      teachWhy,
      askTomorrow,
      lastTouched: getStudentLastTouched(student),
    };
  }).sort((a, b) => {
    if (a.studySignals.length !== b.studySignals.length) return b.studySignals.length - a.studySignals.length;
    return a.student.name.localeCompare(b.student.name);
  });

  const studyCoverage = Object.entries(studyCoverageCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([label, count]) => ({ label, count }));

  const topAssessmentFocus = teachingSignals.focusAreas[0];
  const topDomainNeed = domainNeeds[0];
  const topServiceTopic = serviceCoverage[0];
  const recommendationTopic = topAssessmentFocus?.label || topDomainNeed?.label || topServiceTopic?.label || "Current consult themes";
  const reasonParts = [
    topAssessmentFocus ? `${topAssessmentFocus.count} student${topAssessmentFocus.count !== 1 ? "s" : ""} show this as the top assessment focus` : null,
    topDomainNeed ? `${topDomainNeed.count} student${topDomainNeed.count !== 1 ? "s are" : " is"} not yet proficient in ${topDomainNeed.label}` : null,
    topServiceTopic ? `${topServiceTopic.count} active patient${topServiceTopic.count !== 1 ? "s" : ""} are touching ${topServiceTopic.label}` : null,
  ].filter(Boolean) as string[];

  let recommendationBridge: string | null = null;
  if (topAssessmentFocus && topServiceTopic && topAssessmentFocus.label !== topServiceTopic.label) {
    recommendationBridge = `Bridge the study gap in ${topAssessmentFocus.label} to current service exposure in ${topServiceTopic.label}.`;
  } else if (topServiceTopic) {
    recommendationBridge = `Anchor tomorrow's teaching in ${topServiceTopic.label} so it stays clinically grounded.`;
  }

  return {
    todayLabel: formatBriefDate(today),
    tomorrowLabel: formatBriefDate(tomorrow),
    recommendationTopic,
    recommendationReason: reasonParts.length > 0 ? reasonParts.join(" · ") : "This reflects the strongest current learning need across the rotation.",
    recommendationBridge,
    studyCoverage,
    serviceCoverage: serviceCoverage.slice(0, 6),
    students: studentBriefs,
  };
}

// ═══════════════════════════════════════════════════════════════════════
//  Theme Toggle (Dark Mode)
// ═══════════════════════════════════════════════════════════════════════
function AdminThemeToggle() {
  const [theme, setTheme] = useState(() =>
    document.documentElement.getAttribute("data-theme") || "light"
  );
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("neph_theme", next);
  };
  return (
    <button onClick={toggle} style={{
      background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8,
      padding: "5px 8px", cursor: "pointer", fontSize: 14, lineHeight: 1,
      color: "white", display: "flex", alignItems: "center",
    }} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Admin Panel (main component)
// ═══════════════════════════════════════════════════════════════════════

function AdminPanel({ onExit }: { onExit?: () => void }) {
  const [tab, setTab] = useState("dashboard");
  const [subView, setSubView] = useState<AdminSubView>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseAdmin, setFirebaseAdmin] = useState<AdminSession | null>(null);
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [authEmail, setAuthEmail] = useState(() => localStorage.getItem("neph_adminEmail") || "");
  const [authPassword, setAuthPassword] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");

  // Admin data
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [articles, setArticles] = useState(ARTICLES);
  const [curriculum, setCurriculum] = useState(WEEKLY);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [settings, setSettings] = useState<SharedSettings>({ attendingName: "", rotationStart: "", email: "", phone: "", adminPin: "" });
  const [clinicGuides, setClinicGuides] = useState<ClinicGuideRecord[]>([]);
  const [rotationCode, setRotationCodeState] = useState(store.getRotationCode() || "");

  useEffect(() => {
    if (!firebaseAdmin) return;
    void store.flushPendingSyncQueue();
  }, [firebaseAdmin]);

  const loadLocalAdminData = useCallback(async () => {
    const s = await store.get<AdminStudent[]>("admin_students");
    const a = await store.get<ArticlesData>("admin_articles");
    const c = await store.get<WeeklyData>("admin_curriculum");
    const an = await store.get<Announcement[]>("admin_announcements");
    if (s) setStudents(s);
    if (a) setArticles(a);
    if (c) setCurriculum(c);
    if (an) setAnnouncements(an);
  }, []);

  const hydrateRotationData = useCallback(async (code: string) => {
    const remote = await store.getRotationData(code);
    if (!remote) return false;
    if (remote.curriculum) setCurriculum(remote.curriculum);
    if (remote.articles) setArticles(remote.articles);
    if (remote.announcements) setAnnouncements(remote.announcements);
    if (remote.settings) setSettings(prev => ({ ...prev, ...remote.settings }));
    if (remote.clinicGuides) setClinicGuides(remote.clinicGuides);
    return true;
  }, []);

  // Load — when connected to a rotation, hydrate from Firestore first to avoid
  // overwriting shared state with stale local defaults
  useEffect(() => {
    ensureGoogleFonts();
    ensureShakeAnimation();
    ensureLayoutStyles();
    ensureThemeStyles();
    (async () => {
      // Always load local settings (PIN, name, etc. are local-only)
      const st = await store.get<SharedSettings>("admin_settings");
      if (st) setSettings(st);

      const adminUser = await getCurrentAdminUser();
      const code = store.getRotationCode();
      if (adminUser) {
        if (code) {
          const hydrated = await hydrateRotationData(code);
          if (!hydrated) {
            console.warn("Could not read rotation data for", code, "— disconnecting to prevent stale overwrite");
            store.setRotationCode(null);
            setRotationCodeState("");
          }
        } else {
          await loadLocalAdminData();
        }
        setFirebaseAdmin({ uid: adminUser.uid, email: adminUser.email || "" });
        setLoading(false);
        return;
      }

      await loadLocalAdminData();
      setLoading(false);
    })();
  }, [hydrateRotationData, loadLocalAdminData]);

  // Save local state
  useEffect(() => {
    if (!loading) {
      store.set("admin_students", students);
    }
  }, [students, loading]);

  useEffect(() => {
    if (!loading) {
      store.set("admin_articles", articles);
      store.set("admin_curriculum", curriculum);
      store.set("admin_announcements", announcements);
      store.set("admin_settings", settings);
    }
  }, [articles, curriculum, announcements, settings, loading]);

  // Save shared state (consolidated) — strip adminPin before publishing
  useEffect(() => {
    if (!loading && firebaseAdmin) {
      store.setShared(SHARED_KEYS.curriculum, curriculum);
      store.setShared(SHARED_KEYS.articles, articles);
      store.setShared(SHARED_KEYS.announcements, announcements);
      const { adminPin: _pin, ...publicSettings } = settings;
      store.setShared(SHARED_KEYS.settings, publicSettings);
    }
  }, [curriculum, articles, announcements, settings, loading, firebaseAdmin]);

  // Real-time listener: students auto-appear when connected to a rotation
  useEffect(() => {
    if (!firebaseAdmin || !rotationCode) return;
    const unsub = store.onStudentsChanged((firestoreStudents) => {
      setStudents(firestoreStudents.map(s => ({
        id: s.studentId,
        studentId: s.studentId,
        name: s.name || "Unknown",
        loginPin: s.loginPin,
        year: s.year || "MS3/MS4",
        email: s.email || "",
        status: s.status || "active",
        addedDate: s.joinedAt || new Date().toISOString(),
        patients: s.patients || [],
        weeklyScores: s.weeklyScores || {},
        preScore: s.preScore || null,
        postScore: s.postScore || null,
        gamification: s.gamification || null,
        srQueue: s.srQueue || {},
        activityLog: s.activityLog || [],
        feedbackTags: s.feedbackTags || [],
        completedItems: s.completedItems || undefined,
        bookmarks: s.bookmarks || undefined,
        lastSyncedAt: s.updatedAt || null,
      })));
    });
    return () => unsub();
  }, [rotationCode, firebaseAdmin]);

  // Write student edits back to Firestore
  const writeStudentToFirestore = useCallback((studentId: string, data: Record<string, unknown>) => {
    if (!firebaseAdmin || !rotationCode || !studentId) return;
    const existing = students.find(student => student.studentId === studentId);
    const merged = { ...existing, ...data };
    const updatedAt = new Date().toISOString();
    store.setStudentData(studentId, {
      ...data,
      updatedAt,
    });
    void store.setTeamSnapshot(studentId, buildTeamSnapshot({
      studentId,
      name: typeof merged.name === "string" ? merged.name : "Unknown",
      patients: Array.isArray(merged.patients) ? merged.patients as Patient[] : [],
      points: calculatePoints(merged as Parameters<typeof calculatePoints>[0]),
      updatedAt,
    }));
  }, [rotationCode, firebaseAdmin, students]);

  const recoverStudentToRecord = useCallback(async (sourceStudentId: string, targetStudentId: string) => {
    if (!firebaseAdmin || !rotationCode) throw new Error("Connect to the live rotation before running recovery.");
    if (!sourceStudentId || !targetStudentId || sourceStudentId === targetStudentId) {
      throw new Error("Select a different destination record.");
    }

    const source = students.find(s => s.studentId === sourceStudentId);
    const target = students.find(s => s.studentId === targetStudentId);
    if (!source || !target) throw new Error("Student record not found.");

    const merged = buildRecoveredStudent(source, target);
    await store.setStudentData(target.studentId, {
      name: merged.name,
      loginPin: merged.loginPin,
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
      completedItems: merged.completedItems,
      bookmarks: merged.bookmarks,
      feedbackTags: merged.feedbackTags,
      updatedAt: new Date().toISOString(),
    });
    await store.setTeamSnapshot(target.studentId, buildTeamSnapshot({
      studentId: target.studentId,
      name: merged.name,
      patients: merged.patients,
      points: calculatePoints(merged as Parameters<typeof calculatePoints>[0]),
    }));
    await store.deleteStudentData(source.studentId);

    setStudents(prev =>
      prev
        .filter(s => s.studentId !== source.studentId)
        .map(s => (s.studentId === target.studentId ? merged : s))
    );

    return target.studentId;
  }, [firebaseAdmin, rotationCode, students]);

  const navigate = (t: string, sv: AdminSubView = null) => { setTab(t); setSubView(sv); };
  const activePin = (settings?.adminPin || "1234").trim();

  const handleAdminSignIn = async () => {
    if (!authEmail.trim() || !authPassword) return;
    setAuthSubmitting(true);
    setAuthError("");
    try {
      const user = await signInAdmin(authEmail.trim(), authPassword);
      const code = store.getRotationCode();
      if (code) {
        const hydrated = await hydrateRotationData(code);
        if (!hydrated) {
          store.setRotationCode(null);
          setRotationCodeState("");
        }
      }
      localStorage.setItem("neph_adminEmail", authEmail.trim());
      setFirebaseAdmin({ uid: user.uid, email: user.email || authEmail.trim() });
      setAuthPassword("");
      setAuthed(false);
      setPin("");
    } catch (e) {
      console.error("Admin sign-in failed:", e);
      setAuthError(getAdminAuthErrorMessage(e));
    }
    setAuthSubmitting(false);
  };

  const handleAdminSignOut = async () => {
    await signOutFirebase();
    setFirebaseAdmin(null);
    setAuthed(false);
    setPin("");
    setAuthPassword("");
    setAuthError("");
  };

  const handlePinSubmit = () => {
    if (pin === activePin) {
      setAuthed(true);
      setPinError(false);
    } else if (pin.length > 0) {
      setPinError(true);
      setTimeout(() => setPinError(false), 1500);
    }
  };

  const importStudentUpdates = async () => {
    const keys = await store.listShared(SHARED_KEYS.studentPrefix);
    if (!keys.length) {
      alert("No shared student updates found yet.");
      return;
    }

    const snapshots: (Partial<AdminStudent> & { studentId: string; updatedAt?: string })[] = [];
    for (const key of keys) {
      const snap = await store.getShared<Partial<AdminStudent> & { studentId?: string; updatedAt?: string }>(key);
      if (snap?.studentId) snapshots.push(snap as Partial<AdminStudent> & { studentId: string; updatedAt?: string });
    }

    if (!snapshots.length) {
      alert("No valid student snapshots were found.");
      return;
    }

    let created = 0;
    let updated = 0;

    setStudents(prev => {
      const byStudentId = new Map(prev.map(s => [s.studentId, s]));
      const result = [...prev];

      snapshots.forEach((snap, idx) => {
        const existing = byStudentId.get(snap.studentId);
        if (existing) {
          const merged: AdminStudent = {
            ...existing,
            name: snap.name || existing.name,
            patients: Array.isArray(snap.patients) ? snap.patients as Patient[] : (existing.patients || []),
            weeklyScores: (snap.weeklyScores || existing.weeklyScores || {}) as WeeklyScores,
            preScore: (snap.preScore || existing.preScore || null) as QuizScore | null,
            postScore: (snap.postScore || existing.postScore || null) as QuizScore | null,
            srQueue: (snap.srQueue || existing.srQueue || {}) as AdminStudent["srQueue"],
            activityLog: (snap.activityLog || existing.activityLog || []) as AdminStudent["activityLog"],
            lastSyncedAt: snap.updatedAt || new Date().toISOString(),
          };
          const pos = result.findIndex(s => s.id === existing.id);
          if (pos >= 0) result[pos] = merged;
          updated += 1;
          return;
        }

        result.unshift({
          id: Date.now() + idx,
          studentId: snap.studentId,
          name: snap.name || `Student ${idx + 1}`,
          year: "MS3/MS4",
          email: "",
          status: "active",
          addedDate: new Date().toISOString(),
          patients: Array.isArray(snap.patients) ? snap.patients : [],
          weeklyScores: snap.weeklyScores || {},
          preScore: snap.preScore || null,
          postScore: snap.postScore || null,
          gamification: undefined,
          srQueue: snap.srQueue || {},
          activityLog: snap.activityLog || [],
          lastSyncedAt: snap.updatedAt || new Date().toISOString(),
        } as AdminStudent);
        created += 1;
      });
      return result;
    });

    alert(`Imported ${snapshots.length} update(s): ${updated} updated, ${created} new.`);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.dark, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: T.pale, fontFamily: T.serif, fontSize: 18 }}>Loading...</div>
    </div>
  );

  if (!firebaseAdmin) {
    return (
      <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${T.dark} 0%, ${T.navy} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: T.sans }}>
        <div style={{ background: T.card, borderRadius: 20, padding: 36, maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>🔐</div>
          <h1 style={{ color: T.navy, fontFamily: T.serif, fontSize: 22, margin: "0 0 4px", fontWeight: 700 }}>Admin Sign-In</h1>
          <p style={{ color: T.sub, fontSize: 13, margin: "0 0 20px" }}>Use your Firebase admin account before unlocking the panel PIN.</p>
          <div style={{ textAlign: "left", marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: T.sub, display: "block", marginBottom: 4 }}>Admin Email</label>
            <input
              type="email"
              value={authEmail}
              onChange={e => { setAuthEmail(e.target.value); setAuthError(""); }}
              onKeyDown={e => { if (e.key === "Enter" && authPassword) handleAdminSignIn(); }}
              placeholder="you@example.com"
              style={{ width: "100%", padding: "12px 14px", border: `2px solid ${T.pale}`, borderRadius: 10, outline: "none", boxSizing: "border-box", fontSize: 14 }}
            />
          </div>
          <div style={{ textAlign: "left", marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: T.sub, display: "block", marginBottom: 4 }}>Password</label>
            <input
              type="password"
              value={authPassword}
              onChange={e => { setAuthPassword(e.target.value); setAuthError(""); }}
              onKeyDown={e => { if (e.key === "Enter" && authEmail.trim()) handleAdminSignIn(); }}
              placeholder="Firebase Auth password"
              style={{ width: "100%", padding: "12px 14px", border: `2px solid ${T.pale}`, borderRadius: 10, outline: "none", boxSizing: "border-box", fontSize: 14 }}
            />
          </div>
          {authError && <p style={{ color: T.accent, fontSize: 13, margin: "0 0 14px", fontWeight: 600 }}>{authError}</p>}
          <button
            onClick={handleAdminSignIn}
            disabled={!authEmail.trim() || !authPassword || authSubmitting}
            style={{ width: "100%", padding: "14px 0", background: authEmail.trim() && authPassword && !authSubmitting ? T.med : T.muted, color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: authEmail.trim() && authPassword && !authSubmitting ? "pointer" : "default", opacity: authEmail.trim() && authPassword && !authSubmitting ? 1 : 0.7 }}
          >
            {authSubmitting ? "Signing In..." : "Sign In"}
          </button>
          <p style={{ color: T.muted, fontSize: 13, marginTop: 12 }}>Enable Email/Password auth in Firebase and add your UID to Firestore `admins/{'{uid}'}`.</p>
          {onExit && <button onClick={onExit} style={{ marginTop: 14, background: "none", border: `1px solid ${T.line}`, color: T.sub, padding: "10px 0", width: "100%", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>← Back to Student App</button>}
        </div>
      </div>
    );
  }

  // Simple PIN gate
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${T.dark} 0%, ${T.navy} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: T.sans }}>
        <div style={{ background: T.card, borderRadius: 20, padding: 36, maxWidth: 380, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>🔒</div>
          <h1 style={{ color: T.navy, fontFamily: T.serif, fontSize: 22, margin: "0 0 4px", fontWeight: 700 }}>Admin Panel</h1>
          <p style={{ color: T.sub, fontSize: 13, margin: "0 0 24px" }}>Nephrology Rotation Management</p>
          <div style={{ animation: pinError ? "shake 0.4s ease" : "none" }}>
            <input type="password" placeholder="Enter admin PIN" value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handlePinSubmit(); }}
              style={{ width: "100%", padding: "14px 16px", fontSize: 18, border: `2px solid ${pinError ? T.accent : T.pale}`, borderRadius: 10, outline: "none", boxSizing: "border-box", marginBottom: 16, fontFamily: T.mono, textAlign: "center", letterSpacing: 6 }}
            />
          </div>
          {pinError && <p style={{ color: T.accent, fontSize: 13, margin: "8px 0 0", fontWeight: 600 }}>Incorrect PIN</p>}
          <button onClick={handlePinSubmit}
            style={{ width: "100%", padding: "14px 0", background: T.med, color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            Enter
          </button>
          <p style={{ color: T.muted, fontSize: 13, marginTop: 12 }}>Signed in as {firebaseAdmin.email || "admin user"}. Set or change your PIN in Settings.</p>
          <button onClick={handleAdminSignOut} style={{ marginTop: 12, background: "none", border: `1px solid ${T.line}`, color: T.sub, padding: "10px 0", width: "100%", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Sign Out</button>
          {onExit && <button onClick={onExit} style={{ marginTop: 14, background: "none", border: `1px solid ${T.line}`, color: T.sub, padding: "10px 0", width: "100%", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>← Back to Student App</button>}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "students", icon: "🎓", label: "Students" },
    { id: "analytics", icon: "📈", label: "Analytics" },
    { id: "content", icon: "📝", label: "Content" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.sans }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${T.navyBg} 0%, ${T.deepBg} 100%)`, padding: `calc(14px + env(safe-area-inset-top, 0px)) 20px 14px`, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: "white", fontFamily: T.serif, fontSize: 19, fontWeight: 700 }}>
              Admin Panel <span style={{ fontSize: 13, background: T.orange, color: "white", padding: "2px 8px", borderRadius: 6, marginLeft: 8, fontFamily: T.sans, fontWeight: 600, verticalAlign: "middle" }}>ATTENDING</span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {settings.attendingName || "Nephrology Rotation"}
              {rotationCode && <span style={{ marginLeft: 8, fontSize: 13, background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 6, fontFamily: T.mono, letterSpacing: 1 }}>Code: {rotationCode}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <AdminThemeToggle />
            {onExit && <button onClick={onExit} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>← Student</button>}
            <button onClick={() => { setAuthed(false); }}
              style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>
              Lock 🔒
            </button>
            <button onClick={handleAdminSignOut}
              style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="tab-content-enter" key={tab + (subView ? JSON.stringify(subView) : "")} style={{ padding: `0 0 ${T.navH + T.navPad}px` }}>
        {tab === "dashboard" && !subView && <DashboardTab students={students} setStudents={setStudents} navigate={navigate} rotationCode={rotationCode} settings={settings} articles={articles} />}
        {tab === "dashboard" && subView?.type === "printCohort" && <PrintableReport mode="cohort" students={students} settings={settings} articles={articles} onBack={() => navigate("dashboard")} />}
        {tab === "students" && !subView && <StudentsTab students={students} setStudents={setStudents} navigate={navigate} rotationCode={rotationCode} settings={settings} articles={articles} />}
        {tab === "students" && subView?.type === "studentDetail" && <StudentDetailView student={students.find(s => String(s.id) === subView.id)} students={students} onBack={() => navigate("students")} setStudents={setStudents} writeStudentToFirestore={writeStudentToFirestore} recoverStudentToRecord={recoverStudentToRecord} navigate={navigate} settings={settings} articles={articles} />}
        {tab === "students" && subView?.type === "printStudent" && <PrintableReport mode="individual" student={students.find(s => String(s.id) === subView.id)} students={students} settings={settings} articles={articles} onBack={() => navigate("students", { type: "studentDetail", id: subView.id })} />}
        {tab === "students" && subView?.type === "exportPdf" && <RotationSummaryReport student={students.find(s => String(s.id) === subView.id)} settings={settings} articles={articles} onBack={() => navigate("students", { type: "studentDetail", id: subView.id })} />}
        {tab === "analytics" && <AnalyticsTab students={students} settings={settings} articles={articles} />}
        {tab === "content" && !subView && <ContentTab navigate={navigate} articles={articles} curriculum={curriculum} clinicGuides={clinicGuides} />}
        {tab === "content" && subView?.type === "editArticles" && <ArticleEditor week={subView.week} articles={articles} setArticles={setArticles} onBack={() => navigate("content")} />}
        {tab === "content" && subView?.type === "editCurriculum" && <CurriculumEditor curriculum={curriculum} setCurriculum={setCurriculum} onBack={() => navigate("content")} />}
        {tab === "content" && subView?.type === "announcements" && <AnnouncementsEditor announcements={announcements} setAnnouncements={setAnnouncements} onBack={() => navigate("content")} />}
        {tab === "content" && subView?.type === "clinicGuides" && <ClinicGuidesEditor clinicGuides={clinicGuides} setClinicGuides={setClinicGuides} onBack={() => navigate("content")} />}
        {tab === "settings" && <SettingsTab settings={settings} setSettings={setSettings} onImportStudentUpdates={importStudentUpdates} rotationCode={rotationCode} setRotationCodeState={setRotationCodeState} curriculum={curriculum} articles={articles} announcements={announcements} setCurriculum={setCurriculum} setArticles={setArticles} setAnnouncements={setAnnouncements} />}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: T.dark, borderTop: `1px solid rgba(255,255,255,0.1)`, display: "flex", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => navigate(t.id)}
              style={{ flex: 1, padding: "8px 0 10px", background: "none", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                color: active ? T.orange : T.muted,
                borderTop: active ? `2.5px solid ${T.orange}` : "2.5px solid transparent",
              }}>
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Dashboard Tab
// ═══════════════════════════════════════════════════════════════════════

function DashboardTab({ students, setStudents, navigate, rotationCode, settings, articles }: { students: AdminStudent[]; setStudents: React.Dispatch<React.SetStateAction<AdminStudent[]>>; navigate: NavigateFn; rotationCode: string; settings: SharedSettings; articles: ArticlesData }) {
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const activeStudents = students.filter(s => s.status === "active");
  const totalPatients = students.reduce((sum, s) => sum + (s.patients || []).length, 0);
  const avgPre = activeStudents.filter(s => s.preScore).length > 0
    ? Math.round(activeStudents.filter(s => s.preScore).reduce((sum, s) => sum + (s.preScore!.correct / s.preScore!.total) * 100, 0) / activeStudents.filter(s => s.preScore).length)
    : null;
  const avgPost = activeStudents.filter(s => s.postScore).length > 0
    ? Math.round(activeStudents.filter(s => s.postScore).reduce((sum, s) => sum + (s.postScore!.correct / s.postScore!.total) * 100, 0) / activeStudents.filter(s => s.postScore).length)
    : null;
  const teachingSignals = buildCohortTeachingSignals(activeStudents);
  const domainNeeds = buildCohortCompetencyNeeds(activeStudents, settings, articles);
  const dailyBrief = activeStudents.length > 0 ? buildDailyAttendingBrief(activeStudents, settings, articles) : null;

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 20, margin: "0 0 16px", fontFamily: T.serif, fontWeight: 700 }}>Dashboard</h2>

      {dailyBrief && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ background: `linear-gradient(135deg, ${T.navyBg}, ${T.deepBg})`, borderRadius: 18, padding: 20, color: "white", marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "rgba(255,255,255,0.65)", marginBottom: 6 }}>
                  Daily Attending Brief · {dailyBrief.todayLabel}
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: T.serif, marginBottom: 8 }}>
                  Teach tomorrow: {dailyBrief.recommendationTopic}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.88)", maxWidth: 720 }}>
                  {dailyBrief.recommendationReason}
                </div>
                {dailyBrief.recommendationBridge && (
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.72)", marginTop: 8 }}>
                    {dailyBrief.recommendationBridge}
                  </div>
                )}
              </div>
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 14px", minWidth: 180 }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.58)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 4 }}>Next teaching day</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "white" }}>{dailyBrief.tomorrowLabel}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", marginTop: 6 }}>
                  {dailyBrief.students.length} student{dailyBrief.students.length !== 1 ? "s" : ""} in the brief
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 16 }}>
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "rgba(255,255,255,0.58)", marginBottom: 8 }}>
                  Recent Study
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {dailyBrief.studyCoverage.length > 0 ? dailyBrief.studyCoverage.map((item) => (
                    <span key={item.label} style={{ background: "rgba(255,255,255,0.12)", color: "white", borderRadius: 999, padding: "5px 10px", fontSize: 13, fontWeight: 600 }}>
                      {item.label} ({item.count})
                    </span>
                  )) : (
                    <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 13 }}>No recent study activity logged yet</span>
                  )}
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "rgba(255,255,255,0.58)", marginBottom: 8 }}>
                  On Service Now
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {dailyBrief.serviceCoverage.length > 0 ? dailyBrief.serviceCoverage.map((item) => (
                    <span key={item.label} style={{ background: "rgba(255,255,255,0.12)", color: "white", borderRadius: 999, padding: "5px 10px", fontSize: 13, fontWeight: 600 }}>
                      {item.label} ({item.count})
                    </span>
                  )) : (
                    <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 13 }}>No active patient topics yet</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
            {dailyBrief.students.map((brief) => (
              <button
                key={brief.student.id}
                onClick={() => navigate("students", { type: "studentDetail", id: String(brief.student.id) })}
                style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.line}`, padding: 16, textAlign: "left", cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>{brief.student.name}</div>
                    <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{brief.student.year || "MS3/MS4"}</div>
                  </div>
                  <span style={{ background: T.ice, color: T.navy, borderRadius: 999, padding: "4px 9px", fontSize: 13, fontWeight: 700 }}>
                    {brief.masteryPercent}%
                  </span>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Studied Recently</div>
                  <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>
                    {brief.studySignals.length > 0 ? brief.studySignals.join(" · ") : "No recent study activity logged"}
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Clinical Exposure</div>
                  <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>
                    {brief.serviceTopics.length > 0 ? brief.serviceTopics.join(", ") : "No active patient topics logged"}
                  </div>
                </div>

                <div style={{ background: T.ice, borderRadius: 12, padding: "10px 11px", marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.med, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Teach Next</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{brief.teachNext}</div>
                  <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginTop: 4 }}>{brief.teachWhy}</div>
                </div>

                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, marginBottom: 8 }}>
                  <strong style={{ color: T.navy }}>Ask tomorrow:</strong> {brief.askTomorrow}
                </div>
                {brief.lastTouched && (
                  <div style={{ fontSize: 13, color: T.muted }}>{formatBriefRelative(brief.lastTouched)}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <StatCard value={activeStudents.length} label="Active Students" color={T.med} icon="🎓" />
        <StatCard value={totalPatients} label="Total Patients Logged" color={T.green} icon="🏥" />
        <StatCard value={avgPre !== null ? avgPre + "%" : "—"} label="Avg Pre-Test" color={T.orange} icon="📋" />
        <StatCard value={avgPost !== null ? avgPost + "%" : "—"} label="Avg Post-Test" color={T.greenDk} icon="📊" />
      </div>

      {/* Pre/Post Comparison */}
      {avgPre !== null && avgPost !== null && (
        <div style={{ background: `linear-gradient(135deg, ${T.navyBg}, ${T.deepBg})`, borderRadius: 16, padding: 20, marginBottom: 20, color: "white" }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(255,255,255,0.6)", marginBottom: 12 }}>Cohort Knowledge Growth</div>
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Pre-Test Avg</div>
              <div style={{ fontSize: 30, fontWeight: 700, fontFamily: T.mono }}>{avgPre}%</div>
            </div>
            <div style={{ fontSize: 28, color: T.green }}>→</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, color: T.green }}>Post-Test Avg</div>
              <div style={{ fontSize: 30, fontWeight: 700, fontFamily: T.mono, color: T.green }}>{avgPost}%</div>
            </div>
            <div style={{ textAlign: "center", background: "rgba(26,188,156,0.2)", borderRadius: 10, padding: "10px 16px" }}>
              <div style={{ fontSize: 13, color: T.green }}>Avg Growth</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: T.green, fontFamily: T.mono }}>+{avgPost - avgPre}%</div>
            </div>
          </div>
        </div>
      )}

      {activeStudents.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginBottom: 20 }}>
          <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Teaching Signals</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.navy, fontFamily: T.serif, marginBottom: 6 }}>
              {teachingSignals.focusAreas[0] ? `Teach next: ${teachingSignals.focusAreas[0].label}` : "Assessment detail still building"}
            </div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginBottom: 10 }}>
              {teachingSignals.detailedAssessments > 0
                ? `${teachingSignals.detailedAssessments}/${activeStudents.length} active students have in-app topic-band assessment detail.`
                : "Detailed week-band insight appears when students complete pre/post assessments in-app."}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {teachingSignals.focusAreas.slice(0, 3).map((item) => (
                <span key={item.label} style={{ background: T.redBg, color: T.accent, borderRadius: 999, padding: "5px 10px", fontSize: 13, fontWeight: 700 }}>
                  {item.label} ({item.count})
                </span>
              ))}
              {teachingSignals.focusAreas.length === 0 && (
                <span style={{ background: T.bg, color: T.muted, borderRadius: 999, padding: "5px 10px", fontSize: 13, fontWeight: 600 }}>
                  No topic bands yet
                </span>
              )}
            </div>
          </div>

          <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Competency Needs</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.navy, fontFamily: T.serif, marginBottom: 6 }}>
              {domainNeeds[0] ? `${domainNeeds[0].label} needs the most reinforcement` : "Waiting on student activity"}
            </div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginBottom: 10 }}>
              Domains count whenever a student is not yet proficient there, so this reads as a teaching backlog rather than a leaderboard.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {domainNeeds.slice(0, 3).map((item) => (
                <span key={item.label} style={{ background: T.yellowBg, color: T.goldText, borderRadius: 999, padding: "5px 10px", fontSize: 13, fontWeight: 700 }}>
                  {item.label} ({item.count})
                </span>
              ))}
              {domainNeeds.length === 0 && (
                <span style={{ background: T.bg, color: T.muted, borderRadius: 999, padding: "5px 10px", fontSize: 13, fontWeight: 600 }}>
                  No competency signal yet
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Quick Actions</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Add Student", icon: "➕", action: () => navigate("students") },
          { label: rotationCode ? "Rotation Code" : "New Rotation", icon: "📡", action: () => navigate("settings") },
          { label: "Announcements", icon: "📢", action: () => navigate("content", { type: "announcements" }) },
          { label: "Export Report", icon: "🖨️", action: () => navigate("dashboard", { type: "printCohort" }) },
        ].map((a, i) => (
          <button key={i} onClick={a.action}
            style={{ background: T.card, borderRadius: 12, padding: 16, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>{a.icon}</span>
            <span style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Bulk Actions</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Export CSV", icon: "📥", desc: "Download all student data", action: () => {
            const headers = ["Name","Year","Status","Patients","Pre-Test %","Post-Test %","Growth %","W1 Best","W2 Best","W3 Best","W4 Best","Quizzes","Mastery %","Top Domain","Teaching Focus","Strongest Area","SR Items","SR Mastered","Activities"];
            const rows = students.map(s => {
              const pre = getScorePct(s.preScore) ?? "";
              const post = getScorePct(s.postScore) ?? "";
              const ws = s.weeklyScores || {};
              const wb = (w: number) => { const a = ws[w] || []; return a.length > 0 ? Math.max(...a.map((x: QuizScore) => Math.round((x.correct / x.total) * 100))) : ""; };
              const competency = buildAdminCompetencySnapshot(s, settings, articles);
              const assessment = buildAdminAssessmentSignal(s);
              const teachNext = assessment?.summary?.recommendedArea.shortLabel || (assessment ? "Needs in-app detail" : "");
              const strongest = assessment?.summary?.strongestAreas[0]?.shortLabel || "";
              const sr = s.srQueue || {};
              const srItems = Object.keys(sr).length;
              const srMastered = Object.values(sr).filter((i: SrItem) => i.interval > 21).length;
              return [s.name, s.year||"", s.status||"active", (s.patients||[]).length, pre, post, pre !== "" && post !== "" ? Number(post) - Number(pre) : "", wb(1), wb(2), wb(3), wb(4), Object.values(ws).flat().length, competency.masteryPercent, competency.topDomain.label, teachNext, strongest, srItems, srMastered, (s.activityLog||[]).length];
            });
            const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = `nephrology-rotation-${new Date().toISOString().slice(0,10)}.csv`; a.click();
            URL.revokeObjectURL(url);
          }},
          { label: "Mark All Completed", icon: "✅", desc: "Set all students to completed", action: () => setConfirmAction("complete") },
          { label: "Reset Options", icon: "🔄", desc: "Granular reset tools", action: () => setConfirmAction("resetOptions") },
          { label: "Archive Rotation", icon: "📦", desc: "Mark rotation as archived", action: () => setConfirmAction("archive"), disabled: !rotationCode },
        ].map((a, i) => (
          <button key={i} onClick={a.action} disabled={a.disabled}
            style={{ background: T.card, borderRadius: 12, padding: 14, border: `1px solid ${T.line}`, cursor: a.disabled ? "not-allowed" : "pointer", textAlign: "left", opacity: a.disabled ? 0.5 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              <div>
                <div style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>{a.label}</div>
                <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>{a.desc}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Confirmation Modals */}
      {confirmAction === "complete" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: T.overlay, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.card, borderRadius: 16, maxWidth: 360, width: "100%", padding: "24px 20px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <h3 style={{ color: T.navy, fontFamily: T.serif, fontSize: 18, margin: "0 0 8px", fontWeight: 700 }}>Mark All Completed</h3>
            <p style={{ color: T.sub, fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>This will set all {students.length} students to &ldquo;completed&rdquo; status. They can still access the app.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setConfirmAction(null)} style={{ padding: "10px 20px", background: "none", border: `1px solid ${T.line}`, borderRadius: 10, color: T.sub, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={() => {
                setStudents(prev => prev.map(s => ({ ...s, status: "completed" })));
                students.forEach(s => { if (s.studentId) store.setStudentData(s.studentId, { status: "completed" }); });
                setConfirmAction(null);
              }} style={{ padding: "10px 24px", background: T.med, color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Mark All</button>
            </div>
          </div>
        </div>
      )}
      {confirmAction === "resetOptions" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: T.overlay, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.card, borderRadius: 16, maxWidth: 420, width: "100%", padding: "24px 20px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔄</div>
              <h3 style={{ color: T.navy, fontFamily: T.serif, fontSize: 18, margin: "0 0 4px", fontWeight: 700 }}>Reset Options</h3>
              <p style={{ color: T.sub, fontSize: 13, margin: 0 }}>Choose what to reset for all {students.length} students</p>
            </div>
            {[
              { key: "resetQuizzes", label: "Reset Quizzes Only", desc: "Clears pre/post tests and weekly quiz scores. Keeps patients, SR, and achievements.", icon: "📝", color: T.orange,
                action: () => {
                  const reset = { weeklyScores: {}, preScore: null, postScore: null };
                  setStudents(prev => prev.map(s => ({ ...s, ...reset })));
                  students.forEach(s => { if (s.studentId) store.setStudentData(s.studentId, reset); });
                }},
              { key: "resetSR", label: "Reset Spaced Repetition Only", desc: "Clears the SR queue. Keeps quizzes, patients, and achievements.", icon: "🔁", color: T.purple,
                action: () => {
                  const reset = { srQueue: {} };
                  setStudents(prev => prev.map(s => ({ ...s, ...reset })));
                  students.forEach(s => { if (s.studentId) store.setStudentData(s.studentId, reset); });
                }},
              { key: "resetPatients", label: "Reset Patients Only", desc: "Clears the patient log. Keeps quizzes, SR, and achievements.", icon: "🏥", color: T.med,
                action: () => {
                  const reset = { patients: [] };
                  setStudents(prev => prev.map(s => ({ ...s, ...reset })));
                  students.forEach(s => { if (s.studentId) store.setStudentData(s.studentId, reset); });
                }},
              { key: "resetAll", label: "Reset Everything", desc: "Clears ALL progress: quizzes, patients, SR, achievements, and activity.", icon: "⚠️", color: T.accent,
                action: () => {
                  const reset = { patients: [], weeklyScores: {}, preScore: null, postScore: null, gamification: { points: 0, achievements: [], streaks: { currentDays: 0, longestDays: 0, lastActiveDate: null } }, completedItems: { articles: {}, studySheets: {}, cases: {} }, srQueue: {}, activityLog: [] };
                  setStudents(prev => prev.map(s => ({ ...s, ...reset })));
                  students.forEach(s => { if (s.studentId) store.setStudentData(s.studentId, reset); });
                }},
            ].map(opt => (
              <button key={opt.key} onClick={() => {
                if (confirm(`Are you sure? This will ${opt.desc.toLowerCase()} This cannot be undone.`)) {
                  opt.action();
                  setConfirmAction(null);
                }
              }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: T.bg, border: `1px solid ${T.line}`, borderRadius: 10, cursor: "pointer", textAlign: "left", marginBottom: 8 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{opt.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>{opt.label}</div>
                  <div style={{ fontSize: 13, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>{opt.desc}</div>
                </div>
              </button>
            ))}
            <button onClick={() => setConfirmAction(null)} style={{ width: "100%", padding: "10px 0", background: "none", border: `1px solid ${T.line}`, borderRadius: 10, color: T.sub, fontSize: 13, cursor: "pointer", fontWeight: 600, marginTop: 4 }}>Cancel</button>
          </div>
        </div>
      )}
      {confirmAction === "archive" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: T.overlay, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.card, borderRadius: 16, maxWidth: 360, width: "100%", padding: "24px 20px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
            <h3 style={{ color: T.navy, fontFamily: T.serif, fontSize: 18, margin: "0 0 8px", fontWeight: 700 }}>Archive Rotation</h3>
            <p style={{ color: T.sub, fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>This marks the current rotation as archived. Student data will be preserved but the rotation will be flagged as complete.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setConfirmAction(null)} style={{ padding: "10px 20px", background: "none", border: `1px solid ${T.line}`, borderRadius: 10, color: T.sub, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={async () => {
                if (rotationCode) await store.updateRotation(rotationCode, { archived: true, archivedAt: new Date().toISOString() });
                setConfirmAction(null);
              }} style={{ padding: "10px 24px", background: T.med, color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Archive</button>
            </div>
          </div>
        </div>
      )}

      {/* Cohort Analytics */}
      {(() => {
        const weeklyBest = [1,2,3,4].map(w => {
          const scores = activeStudents.map(s => {
            const ws = (s.weeklyScores || {})[w] || [];
            return ws.length > 0 ? Math.max(...ws.map(a => Math.round((a.correct / a.total) * 100))) : null;
          }).filter(v => v !== null);
          const avg = scores.length > 0 ? Math.round(scores.reduce((s2, v) => s2 + v, 0) / scores.length) : 0;
          return { label: `W${w}`, value: avg, color: avg >= 80 ? T.green : avg >= 60 ? T.gold : avg > 0 ? T.accent : T.line };
        });
        const hasData = weeklyBest.some(w => w.value > 0);
        if (!hasData) return null;
        return (
          <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 20, border: `1px solid ${T.line}` }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, marginBottom: 10, fontFamily: T.serif }}>Cohort Weekly Performance</div>
            <MiniBarChart data={weeklyBest} />
          </div>
        );
      })()}

      {/* Student Summary */}
      {activeStudents.length > 0 && (
        <>
          <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Student Overview</h3>
          {activeStudents.map(s => {
            const prePct = getScorePct(s.preScore);
            const postPct = getScorePct(s.postScore);
            const wkScores = s.weeklyScores || {};
            const quizzesDone = Object.values(wkScores).flat().length;
            const competency = buildAdminCompetencySnapshot(s, settings, articles);
            const assessment = buildAdminAssessmentSignal(s);
            return (
              <button key={s.id} onClick={() => navigate("students", { type: "studentDetail", id: String(s.id) })}
                style={{ display: "block", width: "100%", background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>{s.name}</span>
                      {s.loginPin && <span style={{ fontSize: 13, background: T.yellowBg, color: T.orange, padding: "1px 6px", borderRadius: 6, fontWeight: 700, fontFamily: T.mono, letterSpacing: 1 }}>PIN {s.loginPin}</span>}
                      <span style={{ fontSize: 13, background: T.ice, padding: "1px 8px", borderRadius: 8, fontWeight: 700, color: T.navy }}>{competency.masteryPercent}% mastery</span>
                    </div>
                    <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>
                      {(s.patients || []).length} patients • {quizzesDone} quizzes • {s.year || "MS3/MS4"}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      <span style={{ fontSize: 13, background: T.bg, borderRadius: 999, padding: "4px 9px", color: T.sub, fontWeight: 600 }}>
                        Top domain: {competency.topDomain.label}
                      </span>
                      <span style={{ fontSize: 13, background: competency.developingCount > 0 ? T.yellowBg : T.greenBg, borderRadius: 999, padding: "4px 9px", color: competency.developingCount > 0 ? T.goldText : T.greenDk, fontWeight: 700 }}>
                        {competency.developingCount} developing domain{competency.developingCount !== 1 ? "s" : ""}
                      </span>
                      <span style={{ fontSize: 13, background: assessment?.summary ? T.redBg : T.bg, borderRadius: 999, padding: "4px 9px", color: assessment?.summary ? T.accent : T.muted, fontWeight: 700 }}>
                        {assessment?.summary ? `Teach next: ${assessment.summary.recommendedArea.shortLabel}` : assessment ? "Awaiting topic detail" : "No assessment yet"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {prePct !== null && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 13, color: T.muted, textTransform: "uppercase" }}>Pre</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: T.orange, fontFamily: T.mono }}>{prePct}%</div>
                      </div>
                    )}
                    {postPct !== null && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 13, color: T.green, textTransform: "uppercase" }}>Post</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: T.green, fontFamily: T.mono }}>{postPct}%</div>
                      </div>
                    )}
                    <span style={{ color: T.muted, fontSize: 14 }}>›</span>
                  </div>
                </div>
              </button>
            );
          })}
        </>
      )}

      {/* Topic Insights for Attending */}
      {activeStudents.length > 0 && (() => {
        // Aggregate topics across all students' patients
        const topicCounts: Record<string, number> = {};
        activeStudents.forEach(s => {
          (s.patients || []).forEach(p => {
            const topics = p.topics?.length ? p.topics : p.topic ? [p.topic] : [];
            topics.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
          });
        });
        const seenTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]);
        const allTopicsExceptOther = TOPICS.filter(t => t !== "Other");
        const neverSeen = allTopicsExceptOther.filter(t => !topicCounts[t]);

        // Check PKD and APOL1 specifically
        const pkdSeen = topicCounts["Polycystic Kidney Disease"] || 0;
        const apol1Seen = topicCounts["APOL1-Associated Kidney Disease"] || 0;

        return (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Clinical Topic Insights</h3>
            <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}` }}>
              {/* Most seen topics */}
              {seenTopics.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Most Seen on Service</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {seenTopics.slice(0, 8).map(([topic, count]) => (
                      <span key={topic} style={{ background: T.ice, color: T.navy, fontSize: 13, padding: "4px 10px", borderRadius: 10, fontWeight: 500 }}>
                        {topic} <span style={{ fontWeight: 700, color: T.med, fontFamily: T.mono }}>({count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Never seen */}
              {neverSeen.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Not Yet Encountered</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {neverSeen.slice(0, 10).map(topic => (
                      <span key={topic} style={{ background: T.yellowBg, color: T.goldText, fontSize: 13, padding: "4px 10px", borderRadius: 10, fontWeight: 500 }}>
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* PKD / APOL1 status */}
              <div style={{ background: T.bg, borderRadius: 10, padding: 10, marginTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Key Topic Coverage</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, background: pkdSeen > 0 ? T.greenBg : T.yellowBg, borderRadius: 8, padding: "8px 10px", border: `1px solid ${pkdSeen > 0 ? T.greenAlpha : T.goldAlpha}` }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>PKD</div>
                    <div style={{ fontSize: 13, color: pkdSeen > 0 ? T.greenDk : T.muted }}>{pkdSeen > 0 ? `${pkdSeen} patient${pkdSeen !== 1 ? "s" : ""}` : "Not yet seen"}</div>
                  </div>
                  <div style={{ flex: 1, background: apol1Seen > 0 ? T.greenBg : T.yellowBg, borderRadius: 8, padding: "8px 10px", border: `1px solid ${apol1Seen > 0 ? T.greenAlpha : T.goldAlpha}` }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>APOL1</div>
                    <div style={{ fontSize: 13, color: apol1Seen > 0 ? T.greenDk : T.muted }}>{apol1Seen > 0 ? `${apol1Seen} patient${apol1Seen !== 1 ? "s" : ""}` : "Not yet seen"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Recent Activity Feed */}
      {(() => {
        const allActivity = students.flatMap(s => (s.activityLog || []).map(a => ({ ...a, studentName: s.name })));
        allActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const recent = allActivity.slice(0, 15);
        if (recent.length === 0) return null;

        const typeIcons = { quiz: "📝", assessment: "📋", case: "🏥", sr_review: "🔄", article: "📄", study_sheet: "🗂️" };
        const formatTime = (ts: string) => {
          const d = new Date(ts);
          const month = d.getMonth() + 1;
          const day = d.getDate();
          const h = d.getHours();
          const m = d.getMinutes();
          return `${month}/${day} ${h}:${String(m).padStart(2, "0")}`;
        };

        return (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Recent Activity</h3>
            <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.line}`, overflow: "hidden" }}>
              {recent.map((a, i) => (
                <div key={i} style={{ padding: "10px 14px", borderBottom: i < recent.length - 1 ? `1px solid ${T.line}` : "none", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{typeIcons[a.type] || "📌"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{a.studentName}</div>
                    <div style={{ fontSize: 13, color: T.sub }}>{a.label}{a.detail ? ` — ${a.detail}` : ""}</div>
                  </div>
                  <div style={{ fontSize: 13, color: T.muted, flexShrink: 0, whiteSpace: "nowrap" }}>{formatTime(a.timestamp)}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {activeStudents.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: T.sub }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎓</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>No students yet</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Go to the Students tab to add your first student</div>
        </div>
      )}
    </div>
  );
}

function StatCard({ value, label, color, icon }: { value: string | number; label: string; color: string; icon: string }) {
  return (
    <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 10, right: 12, fontSize: 24, opacity: 0.15 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: T.mono }}>{value}</div>
      <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Mini Bar Chart (SVG) ────────────────────────────────────────────
function MiniBarChart({ data, width = 280, height = 130 }: { data: { label: string; value: number; color?: string }[]; width?: number; height?: number }) {
  if (!data || !data.length) return null;
  const pad = { top: 16, right: 10, bottom: 22, left: 10 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW = Math.min(36, (w / data.length) * 0.6);
  const gap = (w - barW * data.length) / (data.length + 1);
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {data.map((d, i) => {
        const x = pad.left + gap + i * (barW + gap);
        const barH = Math.max((d.value / maxVal) * h, 2);
        return <g key={i}>
          <rect x={x} y={pad.top + h - barH} width={barW} height={barH} rx={4} fill={d.color || T.med} />
          <text x={x + barW / 2} y={pad.top + h - barH - 4} fontSize={10} fill={T.text} textAnchor="middle" fontWeight={600}>{d.value}%</text>
          <text x={x + barW / 2} y={height - 4} fontSize={9} fill={T.muted} textAnchor="middle">{d.label}</text>
        </g>;
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Analytics Tab
// ═══════════════════════════════════════════════════════════════════════

function AnalyticsTab({ students, settings, articles }: { students: AdminStudent[]; settings: SharedSettings; articles: ArticlesData }) {
  const active = students.filter(s => s.status === "active" || s.status === "completed");
  const withPre = active.filter(s => s.preScore);
  const withPost = active.filter(s => s.postScore);
  const teachingSignals = buildCohortTeachingSignals(active);
  const domainNeeds = buildCohortCompetencyNeeds(active, settings, articles);

  // Score Distribution — group pre and post scores into 5 bins
  const binLabels = ["0-20%", "21-40%", "41-60%", "61-80%", "81-100%"];
  const toBin = (pct: number) => pct <= 20 ? 0 : pct <= 40 ? 1 : pct <= 60 ? 2 : pct <= 80 ? 3 : 4;
  const preBins = [0,0,0,0,0];
  const postBins = [0,0,0,0,0];
  withPre.forEach(s => { preBins[toBin(Math.round((s.preScore!.correct / s.preScore!.total) * 100))]++; });
  withPost.forEach(s => { postBins[toBin(Math.round((s.postScore!.correct / s.postScore!.total) * 100))]++; });
  const histData = binLabels.map((label, i) => ({
    label,
    values: [
      { value: preBins[i], color: T.orange },
      { value: postBins[i], color: T.green },
    ],
  }));

  // Completion Funnel
  const withAnyWeekly = active.filter(s => Object.values(s.weeklyScores || {}).flat().length > 0);
  const withAllWeekly = active.filter(s => {
    const ws = s.weeklyScores || {};
    return [1,2,3,4].every(w => (ws[w] || []).length > 0);
  });
  const improved = active.filter(s => s.preScore && s.postScore && s.preScore.total > 0 && s.postScore.total > 0 &&
    (s.postScore.correct / s.postScore.total) > (s.preScore.correct / s.preScore.total));
  const funnelStages = [
    { label: "Enrolled", value: active.length, total: active.length, color: T.med },
    { label: "Pre-Test", value: withPre.length, total: active.length, color: T.sky },
    { label: "1+ Weekly Quiz", value: withAnyWeekly.length, total: active.length, color: T.gold },
    { label: "All 4 Weekly", value: withAllWeekly.length, total: active.length, color: T.orange },
    { label: "Post-Test", value: withPost.length, total: active.length, color: T.green },
    { label: "Improved", value: improved.length, total: active.length, color: T.greenDk },
  ];

  // Topic Mastery Heatmap — students × weeks
  const heatRows = active.slice(0, 12).map(s => s.name?.split(" ")[0] || "Student");
  const heatCols = ["W1", "W2", "W3", "W4"];
  const heatData = active.slice(0, 12).map(s => {
    return [1,2,3,4].map(w => {
      const attempts = (s.weeklyScores || {})[w] || [];
      if (!attempts.length) return null;
      return Math.max(...attempts.map(a => a.total > 0 ? Math.round((a.correct / a.total) * 100) : 0));
    });
  });

  // Engagement: count quizzes taken per student
  const engagementData = active.slice(0, 8).map(s => {
    const totalQ = Object.values(s.weeklyScores || {}).flat().length + (s.preScore ? 1 : 0) + (s.postScore ? 1 : 0);
    return { label: s.name?.split(" ")[0] || "?", value: totalQ, color: totalQ >= 6 ? T.green : totalQ >= 3 ? T.gold : T.accent };
  });

  // SR aggregate
  const srTotal = active.reduce((sum, s) => sum + Object.keys(s.srQueue || {}).length, 0);
  const srMastered = active.reduce((sum, s) => sum + Object.values(s.srQueue || {}).filter((i: SrItem) => i.interval > 21).length, 0);

  const cardStyle = { background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `1px solid ${T.line}` };
  const titleStyle = { fontSize: 14, fontWeight: 700, color: T.navy, fontFamily: T.serif, marginBottom: 4 };
  const subStyle = { fontSize: 13, color: T.sub, marginBottom: 14 };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 20, margin: "0 0 16px", fontFamily: T.serif, fontWeight: 700 }}>Analytics</h2>

      {active.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📈</div>
          <div style={{ color: T.sub, fontSize: 14 }}>No student data yet. Analytics will appear once students join and take quizzes.</div>
        </div>
      ) : (
        <>
          {/* 1. Score Distribution */}
          <div style={cardStyle}>
            <div style={titleStyle}>Quiz Score Distribution</div>
            <div style={subStyle}>Pre-test (orange) vs Post-test (green) across {active.length} students</div>
            {(withPre.length > 0 || withPost.length > 0) ? (
              <HistogramChart bins={histData} width={320} height={160} />
            ) : (
              <div style={{ color: T.muted, fontSize: 13, textAlign: "center", padding: 20 }}>No quiz scores yet</div>
            )}
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
              <span style={{ fontSize: 13, color: T.orange }}>● Pre-Test ({withPre.length})</span>
              <span style={{ fontSize: 13, color: T.green }}>● Post-Test ({withPost.length})</span>
            </div>
          </div>

          {/* 2. Completion Funnel */}
          <div style={cardStyle}>
            <div style={titleStyle}>Completion Funnel</div>
            <div style={subStyle}>Student progression through the rotation</div>
            <FunnelChart stages={funnelStages} width={320} />
          </div>

          {/* 3. Topic Mastery Heatmap */}
          {heatRows.length > 0 && heatData.some(row => row.some(v => v !== null)) && (
            <div style={cardStyle}>
              <div style={titleStyle}>Topic Mastery by Week</div>
              <div style={subStyle}>Best quiz score per week (red → yellow → green)</div>
              <div style={{ overflowX: "auto" }}>
                <HeatmapChart rows={heatRows} columns={heatCols} data={heatData} width={320} />
              </div>
            </div>
          )}

          <div style={cardStyle}>
            <div style={titleStyle}>Assessment Focus Areas</div>
            <div style={subStyle}>
              {teachingSignals.detailedAssessments > 0
                ? `Detailed topic-band insight from ${teachingSignals.detailedAssessments} in-app assessments`
                : "Students need to complete assessments in-app for topic-band teaching guidance"}
            </div>
            {teachingSignals.focusAreas.length > 0 ? (
              <div style={{ display: "grid", gap: 10 }}>
                {teachingSignals.focusAreas.slice(0, 4).map((item) => (
                  <div key={item.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>{item.label}</span>
                      <span style={{ fontSize: 13, color: T.sub }}>{item.count} student{item.count !== 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ height: 8, background: T.grayBg, borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${(item.count / Math.max(teachingSignals.detailedAssessments, 1)) * 100}%`, height: "100%", background: T.accent, borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
                {teachingSignals.strongestAreas[0] && (
                  <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>
                    Cohort strength: {teachingSignals.strongestAreas[0].label}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: T.muted, fontSize: 13, textAlign: "center", padding: 20 }}>No detailed focus-area breakdown yet</div>
            )}
          </div>

          <div style={cardStyle}>
            <div style={titleStyle}>Competency Domains Needing Teaching</div>
            <div style={subStyle}>Counts reflect students who are not yet proficient in each domain</div>
            {domainNeeds.length > 0 ? (
              <div style={{ display: "grid", gap: 10 }}>
                {domainNeeds.slice(0, 4).map((item) => (
                  <div key={item.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>{item.label}</span>
                      <span style={{ fontSize: 13, color: T.sub }}>{item.count}/{active.length}</span>
                    </div>
                    <div style={{ height: 8, background: T.grayBg, borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${(item.count / Math.max(active.length, 1)) * 100}%`, height: "100%", background: T.gold, borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: T.muted, fontSize: 13, textAlign: "center", padding: 20 }}>No competency data yet</div>
            )}
          </div>

          {/* 4. Student Engagement */}
          {engagementData.length > 0 && (
            <div style={cardStyle}>
              <div style={titleStyle}>Student Engagement</div>
              <div style={subStyle}>Total quizzes completed per student</div>
              <MiniBarChart data={engagementData} width={320} height={140} />
            </div>
          )}

          {/* 5. SR Aggregate */}
          <div style={cardStyle}>
            <div style={titleStyle}>Spaced Repetition</div>
            <div style={subStyle}>Aggregate across all students</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div style={{ textAlign: "center", background: T.ice, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>{srTotal}</div>
                <div style={{ fontSize: 13, color: T.sub }}>Items in Queue</div>
              </div>
              <div style={{ textAlign: "center", background: T.greenBg, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.greenDk, fontFamily: T.mono }}>{srMastered}</div>
                <div style={{ fontSize: 13, color: T.sub }}>Mastered</div>
              </div>
              <div style={{ textAlign: "center", background: T.yellowBg, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.goldText, fontFamily: T.mono }}>{srTotal > 0 ? Math.round((srMastered / srTotal) * 100) : 0}%</div>
                <div style={{ fontSize: 13, color: T.sub }}>Mastery Rate</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Students Tab & Student Roster
// ═══════════════════════════════════════════════════════════════════════

function StudentsTab({ students, setStudents, navigate, rotationCode, settings, articles }: { students: AdminStudent[]; setStudents: React.Dispatch<React.SetStateAction<AdminStudent[]>>; navigate: NavigateFn; rotationCode: string; settings: SharedSettings; articles: ArticlesData }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", year: "MS3", startDate: "" });
  const isConnected = !!rotationCode;

  const addStudent = () => {
    if (!form.name.trim()) return;
    const s: AdminStudent = {
      ...form, id: Date.now(), studentId: String(Date.now()), status: "active", addedDate: new Date().toISOString(),
      patients: [], weeklyScores: {}, preScore: null, postScore: null, gamification: undefined, srQueue: {}, activityLog: [],
    };
    setStudents(prev => [...prev, s]);
    setForm({ name: "", email: "", year: "MS3", startDate: "" });
    setShowAdd(false);
  };

  const removeStudent = (id: number | string) => {
    if (!confirm("Remove this student? Their data will be lost.")) return;
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const toggleStatus = (id: number | string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status: s.status === "active" ? "completed" : "active" } : s));
  };

  const active = students.filter(s => s.status === "active");
  const completed = students.filter(s => s.status === "completed");

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ color: T.text, fontSize: 20, margin: 0, fontFamily: T.serif, fontWeight: 700 }}>Students</h2>
        {!isConnected && (
          <button onClick={() => setShowAdd(!showAdd)}
            style={{ padding: "8px 16px", background: showAdd ? T.sub : T.orange, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {showAdd ? "Cancel" : "+ Add Student"}
          </button>
        )}
      </div>

      {isConnected && (
        <div style={{ background: T.blueBg, borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: T.navy, lineHeight: 1.5 }}>
          📡 Connected to rotation <strong>{rotationCode}</strong>. Students appear here automatically when they join with the rotation code.
        </div>
      )}

      {!isConnected && showAdd && (
        <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `2px solid ${T.orange}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={adminLabel}>Student Name *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Glen Merulus" style={adminInput} />
            </div>
            <div>
              <label style={adminLabel}>Year</label>
              <select value={form.year} onChange={e => setForm({...form, year: e.target.value})} style={adminInput}>
                <option value="MS3">MS3</option>
                <option value="MS4">MS4</option>
                <option value="PA Student">PA Student</option>
                <option value="NP Student">NP Student</option>
                <option value="Resident">Resident</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={adminLabel}>Email (optional)</label>
              <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@med.edu" style={adminInput} />
            </div>
            <div>
              <label style={adminLabel}>Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} style={adminInput} />
            </div>
          </div>
          <button onClick={addStudent} style={{ width: "100%", padding: "12px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Add Student
          </button>
        </div>
      )}

      {/* Active students */}
      {active.length === 0 && !showAdd && (
        <div style={{ textAlign: "center", padding: 40, color: T.sub }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎓</div>
          <div style={{ fontSize: 14 }}>No active students</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>{isConnected ? "Students will appear when they join with the rotation code" : "Add your first student above"}</div>
        </div>
      )}

      {active.map(s => (
        <StudentRow key={s.id} student={s} navigate={navigate} onToggle={isConnected ? null : () => toggleStatus(s.id)} onRemove={isConnected ? null : () => removeStudent(s.id)} settings={settings} articles={articles} />
      ))}

      {completed.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, margin: "20px 0 10px", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Completed Rotations ({completed.length})
          </div>
          {completed.map(s => (
            <StudentRow key={s.id} student={s} navigate={navigate} onToggle={isConnected ? null : () => toggleStatus(s.id)} onRemove={isConnected ? null : () => removeStudent(s.id)} dimmed settings={settings} articles={articles} />
          ))}
        </>
      )}
    </div>
  );
}

function StudentRow({ student: s, navigate, onToggle, onRemove, dimmed, settings, articles }: { student: AdminStudent; navigate: (t: string, sv?: AdminSubView) => void; onToggle: (() => void) | null; onRemove: (() => void) | null; dimmed?: boolean; settings: SharedSettings; articles: ArticlesData }) {
  const prePct = getScorePct(s.preScore);
  const postPct = getScorePct(s.postScore);
  const competency = buildAdminCompetencySnapshot(s, settings, articles);
  const assessment = buildAdminAssessmentSignal(s);
  const teachingLine = assessment?.summary
    ? `Teach next: ${assessment.summary.recommendedArea.shortLabel}`
    : assessment
      ? "Assessment detail appears when completed in-app"
      : "No assessment yet";

  return (
    <div style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}`, opacity: dimmed ? 0.6 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <button onClick={() => navigate("students", { type: "studentDetail", id: String(s.id) })}
          style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>{s.name}</span>
            <span style={{ fontSize: 13, color: "white", background: T.med, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{s.year}</span>
            {s.loginPin && <span style={{ fontSize: 13, background: T.yellowBg, color: T.orange, padding: "2px 8px", borderRadius: 10, fontWeight: 700, fontFamily: T.mono, letterSpacing: 1 }}>PIN {s.loginPin}</span>}
          </div>
          <div style={{ fontSize: 13, color: T.sub }}>
            {(s.patients || []).length} patients • Started {(s as AdminStudent & { startDate?: string }).startDate || new Date(s.addedDate).toLocaleDateString()}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <span style={{ fontSize: 13, background: T.ice, color: T.navy, padding: "4px 9px", borderRadius: 999, fontWeight: 700 }}>
              {competency.masteryPercent}% mastery
            </span>
            <span style={{ fontSize: 13, background: T.bg, color: T.sub, padding: "4px 9px", borderRadius: 999, fontWeight: 600 }}>
              {competency.profileLine}
            </span>
            <span style={{ fontSize: 13, background: assessment?.summary ? T.redBg : T.bg, color: assessment?.summary ? T.accent : T.muted, padding: "4px 9px", borderRadius: 999, fontWeight: 700 }}>
              {teachingLine}
            </span>
          </div>
          {/* Score bars */}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            {prePct !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 13, color: T.muted }}>Pre:</span>
                <div style={{ width: 60, height: 6, background: T.grayBg, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${prePct}%`, height: "100%", background: T.orange, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.orange, fontFamily: T.mono }}>{prePct}%</span>
              </div>
            )}
            {postPct !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 13, color: T.muted }}>Post:</span>
                <div style={{ width: 60, height: 6, background: T.grayBg, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${postPct}%`, height: "100%", background: T.green, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.green, fontFamily: T.mono }}>{postPct}%</span>
              </div>
            )}
          </div>
        </button>
        {(onToggle || onRemove) && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {onToggle && (
              <button onClick={onToggle} style={{ background: "none", border: `1px solid ${dimmed ? T.green : T.muted}`, borderRadius: 6, padding: "4px 8px", fontSize: 13, cursor: "pointer", color: dimmed ? T.green : T.sub }}>
                {dimmed ? "↩ Reactivate" : "✓ Complete"}
              </button>
            )}
            {onRemove && (
              <button onClick={onRemove} style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 6, padding: "4px 8px", fontSize: 13, cursor: "pointer", color: T.muted }}>✕</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const adminLabel: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: T.sub, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 };
const adminInput: React.CSSProperties = { width: "100%", padding: "10px 12px", border: `1.5px solid ${T.line}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box", fontFamily: T.sans, outline: "none", background: T.card, color: T.text };

// ═══════════════════════════════════════════════════════════════════════
//  Content Management: Articles, Curriculum, Announcements
// ═══════════════════════════════════════════════════════════════════════

function ContentTab({ navigate, articles, curriculum, clinicGuides }: { navigate: NavigateFn; articles: ArticlesData; curriculum: WeeklyData; clinicGuides: ClinicGuideRecord[] }) {
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 20, margin: "0 0 16px", fontFamily: T.serif, fontWeight: 700 }}>Manage Content</h2>

      {/* Curriculum */}
      <button onClick={() => navigate("content", { type: "editCurriculum" })}
        style={{ display: "block", width: "100%", background: T.card, borderRadius: 14, padding: 18, marginBottom: 12, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📚</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Weekly Curriculum</div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>Edit week titles, subtitles, and topics</div>
          </div>
          <span style={{ color: T.muted, fontSize: 16 }}>›</span>
        </div>
      </button>

      {/* Articles by week */}
      <h3 style={{ color: T.navy, fontSize: 15, margin: "16px 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Journal Articles</h3>
      {[1,2,3,4].map(w => (
        <button key={w} onClick={() => navigate("content", { type: "editArticles", week: w })}
          style={{ display: "block", width: "100%", background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, color: T.text, fontSize: 14 }}>Week {w}: {(curriculum[w] || WEEKLY[w]).title}</div>
              <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{(articles[w] || []).length} articles</div>
            </div>
            <span style={{ color: T.muted, fontSize: 14 }}>›</span>
          </div>
        </button>
      ))}

      {/* Announcements */}
      <button onClick={() => navigate("content", { type: "announcements" })}
        style={{ display: "block", width: "100%", background: T.card, borderRadius: 14, padding: 18, marginTop: 16, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: T.yellowBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📢</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Announcements</div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>Post notes or reminders for students</div>
          </div>
          <span style={{ color: T.muted, fontSize: 16 }}>›</span>
        </div>
      </button>

      {/* Friday Clinic Guides */}
      <button onClick={() => navigate("content", { type: "clinicGuides" })}
        style={{ display: "block", width: "100%", background: T.card, borderRadius: 14, padding: 18, marginTop: 12, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: T.greenBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🩺</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Friday Clinic Guides</div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>Manage weekly outpatient clinic teaching guides ({clinicGuides.length} generated)</div>
          </div>
          <span style={{ color: T.muted, fontSize: 16 }}>›</span>
        </div>
      </button>
    </div>
  );
}

// ─── Article Editor ─────────────────────────────────────────────────
function ArticleEditor({ week, articles, setArticles, onBack }: { week: number; articles: ArticlesData; setArticles: React.Dispatch<React.SetStateAction<ArticlesData>>; onBack: () => void }) {
  const weekArticles = articles[week] || [];
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", journal: "", year: "", url: "", topic: "", type: "Review" });
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const save = () => {
    if (!form.title.trim() || !form.url.trim()) return;
    const entry = { ...form, year: parseInt(form.year) || 2024 };
    setArticles(prev => {
      const copy = { ...prev };
      const arr = [...(copy[week] || [])];
      if (editIdx !== null) { arr[editIdx] = entry; }
      else { arr.push(entry); }
      copy[week] = arr;
      return copy;
    });
    setForm({ title: "", journal: "", year: "", url: "", topic: "", type: "Review" });
    setShowAdd(false);
    setEditIdx(null);
  };

  const remove = (idx: number) => {
    setArticles(prev => {
      const copy = { ...prev };
      copy[week] = (copy[week] || []).filter((_: unknown, i: number) => i !== idx);
      return copy;
    });
  };

  const startEdit = (idx: number) => {
    const a = weekArticles[idx];
    setForm({ title: a.title, journal: a.journal, year: a.year.toString(), url: a.url, topic: a.topic, type: a.type });
    setEditIdx(idx);
    setShowAdd(true);
  };

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtn}>← Back</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: 0, fontWeight: 700 }}>Week {week} Articles</h2>
        <button onClick={() => { setShowAdd(!showAdd); setEditIdx(null); setForm({ title: "", journal: "", year: "", url: "", topic: "", type: "Review" }); }}
          style={{ padding: "8px 14px", background: showAdd ? T.sub : T.orange, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {showAdd ? "Cancel" : "+ Add Article"}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `2px solid ${T.orange}` }}>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Article Title *</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Full article title" style={adminInput} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={adminLabel}>Journal</label>
              <input value={form.journal} onChange={e => setForm({...form, journal: e.target.value})} placeholder="e.g. NEJM" style={adminInput} />
            </div>
            <div>
              <label style={adminLabel}>Year</label>
              <input type="number" value={form.year} onChange={e => setForm({...form, year: e.target.value})} placeholder="2024" style={adminInput} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>URL *</label>
            <input value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://..." style={adminInput} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={adminLabel}>Topic Tag</label>
              <input value={form.topic} onChange={e => setForm({...form, topic: e.target.value})} placeholder="e.g. AKI" style={adminInput} />
            </div>
            <div>
              <label style={adminLabel}>Type</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={adminInput}>
                <option value="Review">Review</option>
                <option value="Guideline">Guideline</option>
                <option value="Landmark">Landmark Study</option>
                <option value="Case Report">Case Report</option>
              </select>
            </div>
          </div>
          <button onClick={save} style={{ width: "100%", padding: "12px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {editIdx !== null ? "Update Article" : "Add Article"}
          </button>
        </div>
      )}

      {weekArticles.length === 0 && !showAdd && (
        <div style={{ textAlign: "center", padding: 30, color: T.muted }}>No articles for this week yet</div>
      )}

      {weekArticles.map((a, i) => (
        <div key={i} style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, lineHeight: 1.3, wordBreak: "break-word" }}>{a.title}</div>
              <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{a.journal} ({a.year})</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.med, background: T.ice, padding: "2px 8px", borderRadius: 6 }}>{a.type}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.muted, background: T.bg, padding: "2px 8px", borderRadius: 6 }}>{a.topic}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button onClick={() => startEdit(i)} style={tinyBtn}>✏️</button>
              <button onClick={() => remove(i)} style={tinyBtn}>🗑</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Curriculum Editor ──────────────────────────────────────────────
function CurriculumEditor({ curriculum, setCurriculum, onBack }: { curriculum: WeeklyData; setCurriculum: React.Dispatch<React.SetStateAction<WeeklyData>>; onBack: () => void }) {
  const [editWeek, setEditWeek] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", sub: "", topicsStr: "" });

  const startEdit = (w: number) => {
    const wk = curriculum[w] || WEEKLY[w];
    setForm({ title: wk.title, sub: wk.sub, topicsStr: wk.topics.join(", ") });
    setEditWeek(w);
  };

  const saveEdit = () => {
    if (!form.title.trim() || editWeek === null) return;
    setCurriculum(prev => ({
      ...prev,
      [editWeek]: { title: form.title, sub: form.sub, topics: form.topicsStr.split(",").map(t => t.trim()).filter(Boolean) }
    }));
    setEditWeek(null);
  };

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtn}>← Back</button>
      <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: "0 0 16px", fontWeight: 700 }}>Edit Curriculum</h2>

      {[1,2,3,4].map(w => {
        const wk = curriculum[w] || WEEKLY[w];
        const isEditing = editWeek === w;

        if (isEditing) {
          return (
            <div key={w} style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 12, border: `2px solid ${T.orange}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.orange, marginBottom: 10 }}>EDITING WEEK {w}</div>
              <div style={{ marginBottom: 10 }}>
                <label style={adminLabel}>Title</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={adminInput} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={adminLabel}>Subtitle</label>
                <input value={form.sub} onChange={e => setForm({...form, sub: e.target.value})} style={adminInput} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={adminLabel}>Topics (comma-separated)</label>
                <textarea value={form.topicsStr} onChange={e => setForm({...form, topicsStr: e.target.value})} rows={2} style={{...adminInput, resize: "vertical"}} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveEdit} style={{ flex: 1, padding: "10px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save</button>
                <button onClick={() => setEditWeek(null)} style={{ flex: 1, padding: "10px 0", background: T.bg, color: T.sub, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          );
        }

        return (
          <div key={w} style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Week {w}: {wk.title}</div>
                <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{wk.sub}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                  {wk.topics.map(t => (
                    <span key={t} style={{ fontSize: 13, background: T.ice, color: T.navy, padding: "2px 8px", borderRadius: 8, fontWeight: 500 }}>{t}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => startEdit(w)} style={{ ...tinyBtn, fontSize: 13 }}>✏️</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Announcements ──────────────────────────────────────────────────
function AnnouncementsEditor({ announcements, setAnnouncements, onBack }: { announcements: Announcement[]; setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>; onBack: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<{ title: string; body: string; priority: Announcement["priority"] }>({ title: "", body: "", priority: "normal" });

  const add = () => {
    if (!form.title.trim()) return;
    setAnnouncements(prev => [{ ...form, id: Date.now(), date: new Date().toISOString() }, ...prev]);
    setForm({ title: "", body: "", priority: "normal" });
    setShowAdd(false);
  };

  const remove = (id: number) => setAnnouncements(prev => prev.filter(a => a.id !== id));

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtn}>← Back</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: 0, fontWeight: 700 }}>Announcements</h2>
        <button onClick={() => setShowAdd(!showAdd)}
          style={{ padding: "8px 14px", background: showAdd ? T.sub : T.orange, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {showAdd ? "Cancel" : "+ New"}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `2px solid ${T.orange}` }}>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Title</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Week 2 quiz due Friday" style={adminInput} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Body</label>
            <textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})} rows={3} placeholder="Details..." style={{...adminInput, resize: "vertical"}} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={adminLabel}>Priority</label>
            <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as Announcement["priority"]})} style={adminInput}>
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <button onClick={add} style={{ width: "100%", padding: "12px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Post Announcement
          </button>
        </div>
      )}

      {announcements.length === 0 && !showAdd && (
        <div style={{ textAlign: "center", padding: 30, color: T.muted }}>No announcements yet</div>
      )}

      {announcements.map(a => {
        const prioColor = a.priority === "urgent" ? T.accent : a.priority === "important" ? T.orange : T.med;
        return (
          <div key={a.id} style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}`, borderLeft: `4px solid ${prioColor}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{a.title}</span>
                  {a.priority !== "normal" && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: prioColor, textTransform: "uppercase", background: prioColor + "15", padding: "1px 6px", borderRadius: 4 }}>{a.priority}</span>
                  )}
                </div>
                {a.body && <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.4, wordBreak: "break-word" }}>{a.body}</div>}
                <div style={{ fontSize: 13, color: T.muted, marginTop: 6 }}>{new Date(a.date).toLocaleString()}</div>
              </div>
              <button onClick={() => remove(a.id)} style={tinyBtn}>🗑</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const backBtn = { background: "none", border: "none", color: T.med, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 12, padding: 0, fontWeight: 600 };
const tinyBtn = { background: "none", border: `1px solid ${T.line}`, borderRadius: 6, padding: "4px 8px", fontSize: 13, cursor: "pointer" };

// ═══════════════════════════════════════════════════════════════════════
//  Clinic Guides Editor
// ═══════════════════════════════════════════════════════════════════════

function ClinicGuidesEditor({ clinicGuides, setClinicGuides, onBack }: { clinicGuides: ClinicGuideRecord[]; setClinicGuides: React.Dispatch<React.SetStateAction<ClinicGuideRecord[]>>; onBack: () => void }) {
  const [overrideTopic, setOverrideTopic] = useState<ClinicGuideTopic>("CKD");

  const friday = getCurrentOrNextFriday(new Date());
  const dateStr = friday.toISOString().split("T")[0];
  const fridayLabel = friday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const rotationTopic = getClinicTopicForDate(friday);
  const currentRecord = clinicGuides.find(g => g.date === dateStr);
  const activeTopic = currentRecord?.topic || rotationTopic;
  const template = CLINIC_GUIDES[activeTopic as ClinicGuideTopic];
  const sorted = [...clinicGuides].sort((a, b) => b.date.localeCompare(a.date));

  const handleEnsure = () => {
    const { guides, newGuide } = ensureCurrentClinicGuide(clinicGuides);
    if (newGuide) {
      setClinicGuides(guides);
      store.setShared(SHARED_KEYS.clinicGuides, guides);
    }
  };

  const handleRegenerate = () => {
    const updated = regenerateClinicGuide(clinicGuides, dateStr);
    setClinicGuides(updated);
    store.setShared(SHARED_KEYS.clinicGuides, updated);
  };

  const handleOverride = () => {
    const updated = overrideClinicGuide(clinicGuides, dateStr, overrideTopic);
    setClinicGuides(updated);
    store.setShared(SHARED_KEYS.clinicGuides, updated);
  };

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.med, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>{"\u2190"} Back</button>

      <h2 style={{ color: T.navy, fontSize: 20, margin: "0 0 4px", fontFamily: T.serif, fontWeight: 700 }}>Friday Clinic Guides</h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px", lineHeight: 1.4 }}>
        Manage weekly outpatient nephrology clinic teaching guides. Rotation: CKD → Transplant → Hypertension.
      </p>

      {/* Current / next Friday status */}
      <div style={{ background: T.greenBg, borderRadius: 14, padding: 16, marginBottom: 16, border: `1px solid ${T.green}40` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.greenDk, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 8 }}>This Friday</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: T.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            {template?.icon || "📋"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>{activeTopic}</div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{fridayLabel}</div>
            {currentRecord?.isOverride && <span style={{ fontSize: 13, fontWeight: 700, color: T.orange, background: T.yellowBg, borderRadius: 6, padding: "2px 6px", marginTop: 4, display: "inline-block" }}>Override</span>}
          </div>
        </div>
        <div style={{ fontSize: 13, color: T.sub, marginTop: 8 }}>Rotation default: {rotationTopic}</div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {!currentRecord && (
          <button onClick={handleEnsure} style={{ padding: "8px 16px", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Generate Guide
          </button>
        )}
        {currentRecord && (
          <button onClick={handleRegenerate} style={{ padding: "8px 16px", background: T.card, color: T.med, border: `1.5px solid ${T.med}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Regenerate (Reset to Rotation)
          </button>
        )}
      </div>

      {/* Override controls */}
      <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, marginBottom: 8 }}>Override Topic</div>
        <div style={{ fontSize: 13, color: T.sub, marginBottom: 10, lineHeight: 1.4 }}>
          Change this Friday's topic without affecting the rotation sequence for future weeks.
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={overrideTopic} onChange={(e) => setOverrideTopic(e.target.value as ClinicGuideTopic)}
            style={{ flex: 1, padding: "8px 12px", border: `1.5px solid ${T.line}`, borderRadius: 8, fontSize: 14, background: T.card, color: T.text }}>
            {CLINIC_GUIDE_TOPICS.map(t => (
              <option key={t} value={t}>{CLINIC_GUIDES[t].icon} {t}</option>
            ))}
          </select>
          <button onClick={handleOverride} style={{ padding: "8px 16px", background: T.orange, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            Apply Override
          </button>
        </div>
      </div>

      {/* History */}
      <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Generated Guides ({sorted.length})</h3>
      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: 20, color: T.muted, fontSize: 13 }}>No guides generated yet.</div>
      ) : (
        sorted.map(g => {
          const t = CLINIC_GUIDES[g.topic as ClinicGuideTopic];
          return (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: T.card, borderRadius: 12, marginBottom: 8, border: `1px solid ${T.line}` }}>
              <span style={{ fontSize: 20 }}>{t?.icon || "📋"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: T.text, fontSize: 14 }}>{g.topic}</div>
                <div style={{ fontSize: 13, color: T.sub }}>{new Date(g.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div>
              </div>
              {g.isOverride && <span style={{ fontSize: 13, fontWeight: 700, color: T.orange, background: T.yellowBg, borderRadius: 6, padding: "2px 6px" }}>Override</span>}
            </div>
          );
        })
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Settings Tab
// ═══════════════════════════════════════════════════════════════════════

function SettingsTab({ settings, setSettings, onImportStudentUpdates, rotationCode, setRotationCodeState, curriculum, articles, announcements, setCurriculum, setArticles, setAnnouncements }: { settings: SharedSettings; setSettings: React.Dispatch<React.SetStateAction<SharedSettings>>; onImportStudentUpdates: () => Promise<void>; rotationCode: string; setRotationCodeState: React.Dispatch<React.SetStateAction<string>>; curriculum: WeeklyData; articles: ArticlesData; announcements: Announcement[]; setCurriculum: React.Dispatch<React.SetStateAction<WeeklyData>>; setArticles: React.Dispatch<React.SetStateAction<ArticlesData>>; setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>> }) {
  const [creating, setCreating] = useState(false);
  const [rejoinCode, setRejoinCode] = useState("");
  const [rejoinError, setRejoinError] = useState("");
  const [rejoining, setRejoining] = useState(false);
  const [rotationHistory, setRotationHistory] = useState<RotationInfo[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [newDates, setNewDates] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newCustomCode, setNewCustomCode] = useState("");
  const update = (key: string, val: string) => setSettings(prev => ({ ...prev, [key]: val }));

  // Load rotation history on mount
  useEffect(() => {
    (async () => {
      const list = await store.listRotations();
      setRotationHistory(list);
      setHistoryLoading(false);
    })();
  }, [rotationCode]);

  const handleCreateRotation = async () => {
    setCreating(true);
    try {
      let code = newCustomCode.trim().toUpperCase() || createRotationCode(newLocation, newDates);
      // Check for collision — append random suffix if code already exists
      const exists = await store.validateRotationCode(code);
      if (exists) {
        const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
        code = `${code}-${suffix}`;
      }
      const updatedSettings = { ...settings, duration: settings.duration || "4" };
      const { adminPin: _pin, ...sharedSettings } = updatedSettings;
      await store.createRotation(code, {
        name: updatedSettings.attendingName || "Nephrology Rotation",
        settings: sharedSettings,
        curriculum,
        articles,
        announcements,
        dates: newDates,
        location: newLocation,
      });
      setRotationCodeState(code);
      setNewDates("");
      setNewLocation("");
      setNewCustomCode("");
      // Refresh history
      const list = await store.listRotations();
      setRotationHistory(list);
    } catch (e) {
      alert("Failed to create rotation. Check your Firebase config and internet connection.");
      console.error("Create rotation error:", e);
    }
    setCreating(false);
  };

  const handleDeleteRotation = async (code: string) => {
    if (!confirm(`Delete rotation ${code}? All student data in this rotation will be permanently lost.`)) return;
    try {
      await store.deleteRotation(code);
      setRotationHistory(prev => prev.filter(r => r.code !== code));
      if (rotationCode === code) setRotationCodeState("");
    } catch {
      alert("Failed to delete rotation. Check your admin access and Firebase rules.");
    }
  };

  const handleConnectRotation = async (code: string) => {
    // Hydrate from Firestore before setting rotation code, so the save
    // effect doesn't overwrite shared state with stale local data
    const remote = await store.getRotationData(code);
    if (!remote) {
      alert("Could not read rotation data. Check your internet connection and try again.");
      return;
    }
    if (remote.curriculum) setCurriculum(remote.curriculum);
    if (remote.articles) setArticles(remote.articles);
    if (remote.announcements) setAnnouncements(remote.announcements);
    if (remote.settings) setSettings(prev => ({ ...prev, ...remote.settings }));
    store.setRotationCode(code);
    setRotationCodeState(code);
  };

  const handleUpdateRotationField = async (code: string, field: string, value: string) => {
    await store.updateRotation(code, { [field]: value });
    setRotationHistory(prev => prev.map(r => r.code === code ? { ...r, [field]: value } : r));
  };

  const handleDisconnect = () => {
    store.setRotationCode(null);
    setRotationCodeState("");
  };

  const handleRejoin = async () => {
    if (rejoinCode.length < 4) return;
    setRejoining(true);
    setRejoinError("");
    try {
      const remote = await store.getRotationData(rejoinCode);
      if (remote) {
        // Hydrate from Firestore before setting code to prevent stale overwrite
        if (remote.curriculum) setCurriculum(remote.curriculum);
        if (remote.articles) setArticles(remote.articles);
        if (remote.announcements) setAnnouncements(remote.announcements);
        if (remote.settings) setSettings(prev => ({ ...prev, ...remote.settings }));
        store.setRotationCode(rejoinCode);
        setRotationCodeState(rejoinCode);
        setRejoinCode("");
      } else {
        setRejoinError("Rotation not found. Check the code.");
      }
    } catch {
      setRejoinError("Connection error. Try again.");
    }
    setRejoining(false);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 20, margin: "0 0 16px", fontFamily: T.serif, fontWeight: 700 }}>Settings</h2>

      {/* Rotation Code */}
      <div style={{ background: `linear-gradient(135deg, ${T.navyBg}, ${T.deepBg})`, borderRadius: 16, padding: 20, marginBottom: 16, color: "white" }}>
        <h3 style={{ fontFamily: T.serif, color: "white", fontSize: 16, margin: "0 0 12px", fontWeight: 700 }}>Rotation Code</h3>
        {rotationCode ? (
          <div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Share this code with students to join:</div>
            <div style={{ fontSize: 32, fontFamily: T.mono, fontWeight: 700, letterSpacing: 4, textAlign: "center", background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "14px 0", marginBottom: 12 }}>
              {rotationCode}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: 12 }}>Students enter this code after setting their name to sync data in real-time.</div>
            <button onClick={handleDisconnect} style={{ width: "100%", padding: "10px 0", background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
              Disconnect from Rotation
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 12, lineHeight: 1.5 }}>
              Create a rotation to sync student data in real-time via Firebase. Students will enter the generated code to join.
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 600, display: "block", marginBottom: 4 }}>Rotation Dates (optional)</label>
              <input value={newDates} onChange={e => setNewDates(e.target.value)} placeholder="e.g. Mar 1–28, 2026"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "white", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 600, display: "block", marginBottom: 4 }}>Location (optional)</label>
                <input value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="e.g. Good Samaritan"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "white", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 600, display: "block", marginBottom: 4 }}>Duration</label>
                <select value={settings.duration || "4"} onChange={e => update("duration", e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "white", fontSize: 13, outline: "none", boxSizing: "border-box", appearance: "none" }}>
                  <option value="1" style={{ color: "#000" }}>1 week</option>
                  <option value="2" style={{ color: "#000" }}>2 weeks</option>
                  <option value="3" style={{ color: "#000" }}>3 weeks</option>
                  <option value="4" style={{ color: "#000" }}>4 weeks</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 600, display: "block", marginBottom: 4 }}>Custom Code (optional)</label>
              <input value={newCustomCode} onChange={e => setNewCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, ""))} placeholder="e.g. TEST or GS-APR26"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "white", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "monospace", letterSpacing: 2 }} />
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>If blank, code is auto-generated from location + dates</div>
            </div>
            <button onClick={handleCreateRotation} disabled={creating}
              style={{ width: "100%", padding: "14px 0", background: T.orange, color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: creating ? "wait" : "pointer", opacity: creating ? 0.7 : 1, marginBottom: 16 }}>
              {creating ? "Creating..." : "Create New Rotation"}
            </button>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 14 }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 8, fontWeight: 600 }}>Or rejoin an existing rotation:</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={rejoinCode}
                  onChange={e => { setRejoinCode(e.target.value.toUpperCase()); setRejoinError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") handleRejoin(); }}
                  placeholder="e.g. CMC-MAR26"
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: `1px solid ${rejoinError ? T.accent : "rgba(255,255,255,0.2)"}`, background: "rgba(255,255,255,0.1)", color: "white", fontSize: 14, fontFamily: T.mono, letterSpacing: 2, textAlign: "center", outline: "none", boxSizing: "border-box" }}
                />
                <button onClick={handleRejoin} disabled={rejoining || rejoinCode.length < 4}
                  style={{ padding: "10px 18px", background: rejoinCode.length >= 4 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)", color: rejoinCode.length >= 4 ? "white" : "rgba(255,255,255,0.35)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: rejoinCode.length >= 4 ? "pointer" : "default" }}>
                  {rejoining ? "..." : "Join"}
                </button>
              </div>
              {rejoinError && <div style={{ color: T.accent, fontSize: 13, marginTop: 6 }}>{rejoinError}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Rotation History */}
      <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 16, margin: "0 0 14px", fontWeight: 700 }}>Rotation History</h3>
        {historyLoading ? (
          <div style={{ textAlign: "center", color: T.muted, fontSize: 13, padding: 16 }}>Loading rotations...</div>
        ) : rotationHistory.length === 0 ? (
          <div style={{ textAlign: "center", color: T.muted, fontSize: 13, padding: 16 }}>No rotations created yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rotationHistory.map(r => (
              <div key={r.code} style={{
                background: rotationCode === r.code ? T.ice : T.bg,
                borderRadius: 12, padding: 14,
                border: rotationCode === r.code ? `2px solid ${T.med}` : `1px solid ${T.line}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 16, color: T.navy, letterSpacing: 2 }}>{r.code}</div>
                  {rotationCode === r.code && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.green, background: "rgba(26,188,156,0.15)", padding: "3px 8px", borderRadius: 6, textTransform: "uppercase" }}>Active</span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, color: T.muted, minWidth: 50 }}>Dates:</span>
                    <input
                      value={r.dates || ""}
                      onChange={e => {
                        const val = e.target.value;
                        setRotationHistory(prev => prev.map(x => x.code === r.code ? { ...x, dates: val } : x));
                      }}
                      onBlur={e => handleUpdateRotationField(r.code, "dates", e.target.value)}
                      placeholder="e.g. Mar 1–28, 2026"
                      style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.line}`, fontSize: 13, color: T.text, background: T.card, outline: "none" }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, color: T.muted, minWidth: 50 }}>Location:</span>
                    <input
                      value={r.location || ""}
                      onChange={e => {
                        const val = e.target.value;
                        setRotationHistory(prev => prev.map(x => x.code === r.code ? { ...x, location: val } : x));
                      }}
                      onBlur={e => handleUpdateRotationField(r.code, "location", e.target.value)}
                      placeholder="e.g. City Medical Center"
                      style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.line}`, fontSize: 13, color: T.text, background: T.card, outline: "none" }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.muted, marginBottom: 10 }}>
                  <span>👥 {r.studentCount} student{r.studentCount !== 1 ? "s" : ""}</span>
                  {r.createdAt && <span>• Created {new Date(r.createdAt).toLocaleDateString()}</span>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {rotationCode !== r.code && (
                    <button onClick={() => handleConnectRotation(r.code)}
                      style={{ flex: 1, padding: "8px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      Connect
                    </button>
                  )}
                  <button onClick={() => handleDeleteRotation(r.code)}
                    style={{ flex: rotationCode === r.code ? 1 : 0, minWidth: rotationCode === r.code ? 0 : 80, padding: "8px 12px", background: T.redBg, color: T.accent, border: `1px solid ${T.accent}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rotation Schedule */}
      <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 16, margin: "0 0 14px", fontWeight: 700 }}>Rotation Schedule</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={adminLabel}>Start Date</label>
            <input type="date" value={settings.rotationStart || ""} onChange={e => update("rotationStart", e.target.value)} style={adminInput} />
          </div>
          <div>
            <label style={adminLabel}>Duration</label>
            <select value={settings.duration || "4"} onChange={e => update("duration", e.target.value)}
              style={{ ...adminInput, appearance: "none" }}>
              <option value="1">1 week</option>
              <option value="2">2 weeks</option>
              <option value="3">3 weeks</option>
              <option value="4">4 weeks</option>
            </select>
          </div>
        </div>
        <div style={{ fontSize: 13, color: T.muted }}>
          Sets the "current week" indicator for students. All content remains accessible regardless of duration.
        </div>
      </div>

      {/* Attending Info */}
      <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 16, margin: "0 0 14px", fontWeight: 700 }}>Attending Information</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={adminLabel}>Your Name</label>
          <input value={settings.attendingName || ""} onChange={e => update("attendingName", e.target.value)} placeholder="Dr. Smith" style={adminInput} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={adminLabel}>Email</label>
            <input value={settings.email || ""} onChange={e => update("email", e.target.value)} placeholder="you@hospital.edu" style={adminInput} />
          </div>
          <div>
            <label style={adminLabel}>Phone</label>
            <input value={settings.phone || ""} onChange={e => update("phone", e.target.value)} placeholder="(555) 123-4567" style={adminInput} />
          </div>
        </div>
      </div>

      {/* Security */}
      <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 16, margin: "0 0 14px", fontWeight: 700 }}>Security</h3>
        <div>
          <label style={adminLabel}>Admin PIN</label>
          <input type="password" value={settings.adminPin || ""} onChange={e => update("adminPin", e.target.value)}
            placeholder="Leave blank to keep fallback PIN" style={adminInput} />
          <div style={{ fontSize: 13, color: T.muted, marginTop: 6 }}>
            Choose a private PIN and avoid sharing it with students.
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div style={{ background: T.ice, borderRadius: 14, padding: 18, marginBottom: 16, borderLeft: `4px solid ${T.med}` }}>
        <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 15, margin: "0 0 10px", fontWeight: 700 }}>How to Use This Admin Panel</h3>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.7 }}>
          <div style={{ marginBottom: 8 }}><strong style={{ color: T.navy }}>Dashboard:</strong> At-a-glance view of all students, cohort pre/post quiz averages, and quick actions.</div>
          <div style={{ marginBottom: 8 }}><strong style={{ color: T.navy }}>Students:</strong> Add students to your roster. For each student you can manually enter their pre-test score, post-test score, weekly quiz results, and patient logs. Tap any student to see their full progress report.</div>
          <div style={{ marginBottom: 8 }}><strong style={{ color: T.navy }}>Content:</strong> Edit the weekly curriculum titles and topics. Add, edit, or remove journal articles for each week. Post announcements.</div>
          <div><strong style={{ color: T.navy }}>Tip:</strong> Students use the student-facing app (separate artifact) to take quizzes and log patients. You can enter their scores here to track progress centrally, or review their app directly.</div>
        </div>
      </div>

      {/* Data Management */}
      <div style={{ background: T.card, borderRadius: 14, padding: 18, border: `1px solid ${T.line}` }}>
        <h3 style={{ fontFamily: T.serif, color: T.navy, fontSize: 16, margin: "0 0 14px", fontWeight: 700 }}>Data</h3>
        <button onClick={onImportStudentUpdates}
          style={{ width: "100%", padding: "12px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>
          Import Shared Student Updates
        </button>
        <button onClick={() => {
          const data = { settings, timestamp: new Date().toISOString() };
          const blob = JSON.stringify(data, null, 2);
          const el = document.createElement("textarea");
          el.value = blob;
          document.body.appendChild(el);
          el.select();
          try { document.execCommand("copy"); } catch (e) { console.warn("Copy failed:", e); }
          document.body.removeChild(el);
          alert("Settings copied to clipboard");
        }} style={{ width: "100%", padding: "12px 0", background: T.bg, color: T.text, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>
          Export Settings to Clipboard
        </button>
        <div style={{ fontSize: 13, color: T.muted, textAlign: "center" }}>
          All data is saved automatically via persistent storage
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Student Detail View (with score entry & patient logging)
// ═══════════════════════════════════════════════════════════════════════

function StudentDetailView({ student: s, students, onBack, setStudents, writeStudentToFirestore, recoverStudentToRecord, navigate, settings, articles }: { student: AdminStudent | undefined; students: AdminStudent[]; onBack: () => void; setStudents: React.Dispatch<React.SetStateAction<AdminStudent[]>>; writeStudentToFirestore: (studentId: string, data: Record<string, unknown>) => void; recoverStudentToRecord: (sourceStudentId: string, targetStudentId: string) => Promise<string>; navigate: NavigateFn; settings: SharedSettings; articles: ArticlesData }) {
  const [showScoreEntry, setShowScoreEntry] = useState(false);
  const [scoreType, setScoreType] = useState("pre"); // pre, post, weekly
  const [scoreWeek, setScoreWeek] = useState(1);
  const [scoreForm, setScoreForm] = useState({ correct: "", total: "" });
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [patForm, setPatForm] = useState({ initials: "", room: "", dx: "", topics: [] as string[], notes: "" });
  const [patErrors, setPatErrors] = useState<Record<string, string | undefined>>({});
  const [showAllPatTopics, setShowAllPatTopics] = useState(false);
  const [showAddFeedback, setShowAddFeedback] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [recoveryTargetId, setRecoveryTargetId] = useState("");
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const togglePatTopic = (t: string) => {
    setPatForm(prev => ({ ...prev, topics: prev.topics.includes(t) ? prev.topics.filter((x: string) => x !== t) : [...prev.topics, t] }));
    setPatErrors(prev => ({ ...prev, topics: undefined }));
  };

  const normalizedName = s?.name.trim().toLowerCase() || "";
  const preferredRecoveryCandidates = s ? students.filter(other =>
    other.studentId !== s.studentId &&
    (other.name.trim().toLowerCase() === normalizedName || (!!s.loginPin && other.loginPin === s.loginPin))
  ) : [];
  const recoveryCandidates = (preferredRecoveryCandidates.length > 0 ? preferredRecoveryCandidates : students.filter(other => other.studentId !== s?.studentId))
    .slice()
    .sort((a, b) => (b.lastSyncedAt || "").localeCompare(a.lastSyncedAt || ""));

  useEffect(() => {
    if (!recoveryCandidates.some(candidate => candidate.studentId === recoveryTargetId)) {
      setRecoveryTargetId(recoveryCandidates[0]?.studentId || "");
    }
  }, [recoveryCandidates, recoveryTargetId]);

  if (!s) return <div style={{ padding: 16 }}>Student not found.</div>;

  const prePct = getScorePct(s.preScore);
  const postPct = getScorePct(s.postScore);
  const wkScores = s.weeklyScores || {};
  const patients = s.patients || [];
  const competency = buildAdminCompetencySnapshot(s, settings, articles);
  const assessment = buildAdminAssessmentSignal(s);
  const streakDays = s.gamification?.streaks?.currentDays || 0;
  const totalQuizAttempts = Object.values(wkScores).flat().length + (s.preScore ? 1 : 0) + (s.postScore ? 1 : 0);

  const updateStudent = (updates: Partial<AdminStudent>) => {
    setStudents(prev => prev.map(st => st.id === s.id ? { ...st, ...updates } : st));
    // Write back to Firestore so student sees admin edits
    if (writeStudentToFirestore && s.studentId) {
      const merged = { ...s, ...updates };
      writeStudentToFirestore(s.studentId, {
        name: merged.name,
        patients: merged.patients,
        weeklyScores: merged.weeklyScores,
        preScore: merged.preScore,
        postScore: merged.postScore,
        srQueue: merged.srQueue || {},
        status: merged.status,
        feedbackTags: merged.feedbackTags || [],
      });
    }
  };

  const saveScore = () => {
    const correct = parseInt(scoreForm.correct);
    const total = parseInt(scoreForm.total);
    if (isNaN(correct) || isNaN(total) || total === 0) return;
    const entry: QuizScore = { correct, total, date: new Date().toISOString(), answers: [] };

    if (scoreType === "pre") {
      updateStudent({ preScore: entry });
    } else if (scoreType === "post") {
      updateStudent({ postScore: entry });
    } else {
      const newWeekly = { ...wkScores };
      newWeekly[scoreWeek] = [...(newWeekly[scoreWeek] || []), entry];
      updateStudent({ weeklyScores: newWeekly });
    }
    setShowScoreEntry(false);
    setScoreForm({ correct: "", total: "" });
  };

  const addPatient = () => {
    const { valid, errors } = validatePatientForm(patForm);
    if (!valid) {
      setPatErrors(errors);
      return;
    }
    const p = { ...patForm, id: Date.now(), date: new Date().toISOString(), status: "active" as const, followUps: [] } as Patient;
    updateStudent({ patients: [...patients, p] });
    setPatForm({ initials: "", room: "", dx: "", topics: [], notes: "" });
    setPatErrors({});
    setShowAllPatTopics(false);
    setShowAddPatient(false);
  };

  const topicCounts: Record<string, number> = {};
  patients.forEach(p => {
    const ts = p.topics || (p.topic ? [p.topic] : []);
    ts.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
  });
  const visibleAdminTopics = showAllPatTopics
    ? TOPICS
    : [...COMMON_PATIENT_TOPICS, ...ADDITIONAL_PATIENT_TOPICS.filter(topic => patForm.topics.includes(topic))];
  const hiddenAdminTopicCount = showAllPatTopics
    ? 0
    : ADDITIONAL_PATIENT_TOPICS.length - ADDITIONAL_PATIENT_TOPICS.filter(topic => patForm.topics.includes(topic)).length;

  const handleRecovery = async () => {
    if (!recoveryTargetId) {
      setRecoveryError("Select the new device record first.");
      return;
    }
    const target = recoveryCandidates.find(candidate => candidate.studentId === recoveryTargetId);
    if (!target) {
      setRecoveryError("Selected recovery record no longer exists.");
      return;
    }
    const confirmed = confirm(
      `Move ${s.name}'s saved progress into ${target.name} (${target.studentId.slice(0, 8)}...) and delete this older device record?`
    );
    if (!confirmed) return;

    setRecoveryBusy(true);
    setRecoveryError("");
    try {
      const nextStudentId = await recoverStudentToRecord(s.studentId, target.studentId);
      navigate("students", { type: "studentDetail", id: nextStudentId });
      alert("Recovery complete. The new device record now owns the student's progress.");
    } catch (error) {
      console.error("Student recovery failed:", error);
      setRecoveryError(error instanceof Error ? error.message : "Recovery failed.");
    }
    setRecoveryBusy(false);
  };

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtn}>← Back</button>

      {/* Header */}
      <div style={{ background: T.card, borderRadius: 16, padding: 20, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 22, margin: "0 0 4px", fontWeight: 700 }}>{s.name}</h2>
            <div style={{ fontSize: 13, color: T.sub }}>{s.year} • {s.email || "No email"}</div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 4, fontFamily: T.mono }}>Record ID: {s.studentId}</div>
            {s.loginPin && (
              <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, background: T.yellowBg, padding: "4px 10px", borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>Login PIN:</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.orange, fontFamily: T.mono, letterSpacing: 2 }}>{s.loginPin}</span>
              </div>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: s.status === "active" ? T.green : T.muted, background: s.status === "active" ? "rgba(26,188,156,0.1)" : T.bg, padding: "4px 10px", borderRadius: 8, textTransform: "uppercase" }}>
            {s.status}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginTop: 12 }}>
          <div style={{ background: T.bg, borderRadius: 12, padding: 14, border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Competency Snapshot</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>{competency.masteryPercent}%</span>
              <span style={{ fontSize: 13, color: T.sub }}>{competency.masteryDetail}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ background: T.ice, color: T.navy, borderRadius: 999, padding: "4px 9px", fontSize: 13, fontWeight: 700 }}>
                Top domain: {competency.topDomain.label}
              </span>
              <span style={{ background: competency.developingCount > 0 ? T.yellowBg : T.greenBg, color: competency.developingCount > 0 ? T.goldText : T.greenDk, borderRadius: 999, padding: "4px 9px", fontSize: 13, fontWeight: 700 }}>
                {competency.developingCount} developing
              </span>
            </div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>{competency.profileLine}</div>
          </div>

          <div style={{ background: T.bg, borderRadius: 12, padding: 14, border: `1px solid ${assessment?.summary ? T.redAlpha : T.line}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Teaching Signal</div>
            {assessment?.summary ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.navy, marginBottom: 8 }}>
                  Teach next: {assessment.summary.recommendedArea.label}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  <span style={{ background: T.redBg, color: T.accent, borderRadius: 999, padding: "4px 9px", fontSize: 13, fontWeight: 700 }}>
                    Focus {assessment.summary.recommendedArea.pct}%
                  </span>
                  {assessment.summary.strongestAreas[0] && (
                    <span style={{ background: T.greenBg, color: T.greenDk, borderRadius: 999, padding: "4px 9px", fontSize: 13, fontWeight: 700 }}>
                      Strongest: {assessment.summary.strongestAreas[0].shortLabel}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>
                  {assessment.summary.detailLine}
                </div>
              </>
            ) : assessment ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.navy, marginBottom: 8 }}>
                  Assessment logged at {assessment.overallPct}%
                </div>
                <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>
                  {assessment.note}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.navy, marginBottom: 8 }}>
                  Awaiting assessment signal
                </div>
                <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>
                  Once the student completes a pre- or post-assessment, this card will call out what to teach next.
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <span style={{ background: T.ice, color: T.navy, borderRadius: 999, padding: "4px 9px", fontSize: 13, fontWeight: 700 }}>
            {patients.length} patient{patients.length !== 1 ? "s" : ""}
          </span>
          <span style={{ background: T.bg, color: T.sub, borderRadius: 999, padding: "4px 9px", fontSize: 13, fontWeight: 600 }}>
            {totalQuizAttempts} quiz signal{totalQuizAttempts !== 1 ? "s" : ""}
          </span>
          {streakDays > 0 && (
            <span style={{ background: T.redBg, color: T.accent, borderRadius: 999, padding: "4px 9px", fontSize: 13, fontWeight: 700 }}>
              🔥 {streakDays} day streak
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <button onClick={() => { setShowScoreEntry(true); setScoreType("pre"); setScoreForm({ correct: "", total: "25" }); }}
            style={{ fontSize: 13, color: T.orange, background: T.yellowBg, border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            + Enter Score
          </button>
          <button onClick={() => setShowAddPatient(!showAddPatient)}
            onClickCapture={() => { if (showAddPatient) setShowAllPatTopics(false); }}
            style={{ fontSize: 13, color: T.green, background: "rgba(26,188,156,0.1)", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            + Log Patient
          </button>
          <button onClick={() => navigate("students", { type: "printStudent", id: String(s.id) })}
            style={{ fontSize: 13, color: T.med, background: T.blueBg, border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            Print Report
          </button>
          <button onClick={() => navigate("students", { type: "exportPdf", id: String(s.id) })}
            style={{ fontSize: 13, color: T.purpleAccent, background: T.purpleBg, border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            Export PDF
          </button>
        </div>
      </div>

      {/* Device Recovery */}
      <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, fontFamily: T.serif, marginBottom: 6 }}>Device Recovery</div>
        <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginBottom: 12 }}>
          If the student had to join on a new phone/browser, have them join once so a new blank record appears here. Then move this saved progress into that new device-owned record.
        </div>
        {recoveryCandidates.length === 0 ? (
          <div style={{ fontSize: 13, color: T.muted, fontStyle: "italic" }}>
            No other student records available yet. Once the new device joins, refresh this page and select the new record here.
          </div>
        ) : (
          <>
            <label style={adminLabel}>New Device Record</label>
            <select value={recoveryTargetId} onChange={e => setRecoveryTargetId(e.target.value)}
              style={{ ...adminInput, marginBottom: 10 }}>
              {recoveryCandidates.map(candidate => {
                const candidateQuizCount = Object.values(candidate.weeklyScores || {}).flat().length;
                const lastSeen = candidate.lastSyncedAt ? new Date(candidate.lastSyncedAt).toLocaleString() : "not synced yet";
                return (
                  <option key={candidate.studentId} value={candidate.studentId}>
                    {candidate.name} • {candidate.studentId.slice(0, 8)}... • {candidate.patients.length} patients • {candidateQuizCount} quizzes • {lastSeen}
                  </option>
                );
              })}
            </select>
            <button onClick={handleRecovery} disabled={recoveryBusy}
              style={{ padding: "10px 14px", background: recoveryBusy ? T.muted : T.med, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: recoveryBusy ? "not-allowed" : "pointer" }}>
              {recoveryBusy ? "Moving Progress..." : "Move Progress To New Device Record"}
            </button>
            {recoveryError && <div style={{ fontSize: 13, color: T.accent, marginTop: 8 }}>{recoveryError}</div>}
          </>
        )}
      </div>

      {/* Feedback Tags */}
      <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 16, border: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, fontFamily: T.serif }}>Attending Feedback</div>
          <button onClick={() => setShowAddFeedback(!showAddFeedback)}
            style={{ fontSize: 13, color: T.purpleAccent, background: T.purpleBg, border: "none", padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            {showAddFeedback ? "Cancel" : "+ Add"}
          </button>
        </div>
        {(s.feedbackTags || []).length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: showAddFeedback ? 12 : 0 }}>
            {(s.feedbackTags || []).map((ft, i) => (
              <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: T.purpleBg, padding: "4px 10px", borderRadius: 8, border: `1px solid ${T.purpleSoft}` }}>
                <span style={{ fontSize: 13, color: T.purpleAccent, fontWeight: 600 }}>{ft.tag}</span>
                {ft.note && <span style={{ fontSize: 13, color: T.muted }}>— {ft.note}</span>}
                <span style={{ fontSize: 13, color: T.muted }}>{new Date(ft.date).toLocaleDateString()}</span>
                <button onClick={() => {
                  const updated = (s.feedbackTags || []).filter((_, idx) => idx !== i);
                  updateStudent({ feedbackTags: updated });
                }} style={{ background: "none", border: "none", color: T.muted, fontSize: 13, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>x</button>
              </div>
            ))}
          </div>
        ) : !showAddFeedback && (
          <div style={{ fontSize: 13, color: T.muted, fontStyle: "italic" }}>No feedback yet</div>
        )}
        {showAddFeedback && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Quick Tags</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {FEEDBACK_TAGS.map(tag => (
                <button key={tag} onClick={() => {
                  const newTag: FeedbackTag = { tag, date: new Date().toISOString(), note: feedbackNote.trim() || undefined };
                  updateStudent({ feedbackTags: [...(s.feedbackTags || []), newTag] });
                  setFeedbackNote("");
                  setShowAddFeedback(false);
                }}
                  style={{ padding: "6px 12px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", background: T.card, color: T.text, border: `1px solid ${T.line}` }}>
                  {tag}
                </button>
              ))}
            </div>
            <input value={feedbackNote} onChange={e => setFeedbackNote(e.target.value)} placeholder="Optional note (e.g. specific topic)"
              style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: `1px solid ${T.line}`, borderRadius: 8, outline: "none", fontFamily: T.sans, boxSizing: "border-box", marginBottom: 8 }} />
            <input
              placeholder="Or type a custom tag and press Enter"
              onKeyDown={e => {
                if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                  const newTag: FeedbackTag = { tag: (e.target as HTMLInputElement).value.trim(), date: new Date().toISOString(), note: feedbackNote.trim() || undefined };
                  updateStudent({ feedbackTags: [...(s.feedbackTags || []), newTag] });
                  (e.target as HTMLInputElement).value = "";
                  setFeedbackNote("");
                  setShowAddFeedback(false);
                }
              }}
              style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: `1px solid ${T.line}`, borderRadius: 8, outline: "none", fontFamily: T.sans, boxSizing: "border-box" }} />
          </div>
        )}
      </div>

      {/* Score Entry */}
      {showScoreEntry && (
        <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 16, border: `2px solid ${T.orange}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.orange, marginBottom: 10 }}>ENTER SCORE</div>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Quiz Type</label>
            <div style={{ display: "flex", gap: 6 }}>
              {["pre", "post", "weekly"].map(t => (
                <button key={t} onClick={() => { setScoreType(t); setScoreForm({ correct: "", total: t === "weekly" ? "10" : "25" }); }}
                  style={{ flex: 1, padding: "8px 0", background: scoreType === t ? T.navy : T.bg, color: scoreType === t ? "white" : T.sub,
                    border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
                  {t === "weekly" ? "Weekly" : t + "-Test"}
                </button>
              ))}
            </div>
          </div>
          {scoreType === "weekly" && (
            <div style={{ marginBottom: 10 }}>
              <label style={adminLabel}>Week #</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[1,2,3,4].map(w => (
                  <button key={w} onClick={() => setScoreWeek(w)}
                    style={{ flex: 1, padding: "8px 0", background: scoreWeek === w ? T.med : T.bg, color: scoreWeek === w ? "white" : T.sub,
                      border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Wk {w}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={adminLabel}>Correct</label>
              <input type="number" value={scoreForm.correct} onChange={e => setScoreForm({...scoreForm, correct: e.target.value})} placeholder="e.g. 18" style={{...adminInput, fontFamily: T.mono}} />
            </div>
            <div>
              <label style={adminLabel}>Total Questions</label>
              <input type="number" value={scoreForm.total} onChange={e => setScoreForm({...scoreForm, total: e.target.value})} placeholder="e.g. 25" style={{...adminInput, fontFamily: T.mono}} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveScore} style={{ flex: 1, padding: "10px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save Score</button>
            <button onClick={() => setShowScoreEntry(false)} style={{ flex: 1, padding: "10px 0", background: T.bg, color: T.sub, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Patient Entry */}
      {showAddPatient && (
        <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 16, border: `2px solid ${T.green}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.green, marginBottom: 10 }}>LOG PATIENT</div>
          <div style={{ background: T.yellowBg, borderRadius: 10, padding: 10, marginBottom: 12, border: `1px solid ${T.goldAlphaMd}`, fontSize: 13, color: T.sub, lineHeight: 1.5 }}>
            <strong style={{ color: T.goldText }}>No PHI:</strong> {PHI_WARNING}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Initials</label>
            <input value={patForm.initials} maxLength={LIMITS.INITIALS_MAX} onChange={e => { setPatForm({...patForm, initials: clampLength(e.target.value, LIMITS.INITIALS_MAX)}); setPatErrors(prev => ({ ...prev, initials: undefined })); }} placeholder="J.S." style={adminInput} />
            {patErrors.initials && <div style={{ fontSize: 13, color: T.orange, marginTop: 4 }}>{patErrors.initials}</div>}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Learning Tags</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {visibleAdminTopics.map(t => {
                const sel = patForm.topics.includes(t);
                return (
                  <button key={t} type="button" onClick={() => togglePatTopic(t)}
                    style={{ padding: "5px 10px", borderRadius: 16, fontSize: 13, fontWeight: sel ? 600 : 400, cursor: "pointer", transition: "all 0.15s",
                      background: sel ? T.orange : T.card, color: sel ? "white" : T.sub,
                      border: sel ? `1.5px solid ${T.orange}` : `1.5px solid ${T.line}` }}>
                    {sel ? "✓ " : ""}{t}
                  </button>
                );
              })}
            </div>
            {(hiddenAdminTopicCount > 0 || showAllPatTopics) && (
              <button
                type="button"
                onClick={() => setShowAllPatTopics(prev => !prev)}
                style={{ background: "none", border: "none", padding: "6px 0 0", color: T.orange, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                {showAllPatTopics ? "Show fewer topics" : `More topics (${hiddenAdminTopicCount})`}
              </button>
            )}
            {(patForm.topics.length === 0 || patErrors.topics) && <div style={{ fontSize: 13, color: T.orange, marginTop: 4 }}>{patErrors.topics || "Select at least one"}</div>}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Diagnosis</label>
            <input value={patForm.dx} maxLength={LIMITS.DIAGNOSIS_MAX} onChange={e => { setPatForm({...patForm, dx: clampLength(e.target.value, LIMITS.DIAGNOSIS_MAX)}); setPatErrors(prev => ({ ...prev, dx: undefined })); }} placeholder="e.g. AKI from sepsis" style={adminInput} />
            {patErrors.dx && <div style={{ fontSize: 13, color: T.orange, marginTop: 4 }}>{patErrors.dx}</div>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addPatient} style={{ flex: 1, padding: "10px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add Patient</button>
            <button onClick={() => { setShowAllPatTopics(false); setShowAddPatient(false); }} style={{ flex: 1, padding: "10px 0", background: T.bg, color: T.sub, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Score cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}`, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>Pre-Test</div>
          {prePct !== null ? <div style={{ fontSize: 30, fontWeight: 700, color: T.orange, fontFamily: T.mono }}>{prePct}%</div> : <div style={{ fontSize: 14, color: T.muted }}>—</div>}
        </div>
        <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.line}`, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.green, textTransform: "uppercase" }}>Post-Test</div>
          {postPct !== null ? <div style={{ fontSize: 30, fontWeight: 700, color: T.green, fontFamily: T.mono }}>{postPct}%</div> : <div style={{ fontSize: 14, color: T.muted }}>—</div>}
        </div>
      </div>

      {prePct !== null && postPct !== null && (
        <div style={{ background: T.ice, borderRadius: 12, padding: 14, marginBottom: 16, textAlign: "center", borderLeft: `4px solid ${T.green}` }}>
          <span style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>Growth: </span>
          <span style={{ fontSize: 20, fontWeight: 700, color: T.green, fontFamily: T.mono }}>+{postPct - prePct}%</span>
        </div>
      )}

      {/* Weekly Scores */}
      <h3 style={{ color: T.navy, fontSize: 15, margin: "0 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Weekly Quizzes</h3>
      {[1,2,3,4].map(w => {
        const ws = wkScores[w] || [];
        const best = ws.length > 0 ? Math.max(...ws.map(x => Math.round((x.correct/x.total)*100))) : null;
        return (
          <div key={w} style={{ background: T.card, borderRadius: 10, padding: 12, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${T.line}` }}>
            <div>
              <div style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>Week {w}</div>
              <div style={{ fontSize: 13, color: T.muted }}>{ws.length} attempt{ws.length !== 1 ? "s" : ""}</div>
            </div>
            {best !== null ? (
              <div style={{ fontSize: 18, fontWeight: 700, color: best >= 80 ? T.green : best >= 60 ? T.gold : T.accent, fontFamily: T.mono }}>{best}%</div>
            ) : <div style={{ fontSize: 13, color: T.muted }}>—</div>}
          </div>
        );
      })}

      {/* Patients */}
      <h3 style={{ color: T.navy, fontSize: 15, margin: "16px 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Patient Log ({patients.length})</h3>
      {patients.length === 0 ? (
        <div style={{ background: T.card, borderRadius: 10, padding: 20, textAlign: "center", color: T.muted, border: `1px solid ${T.line}` }}>No patients logged</div>
      ) : (
        <div style={{ background: T.card, borderRadius: 12, padding: 14, border: `1px solid ${T.line}` }}>
          {patients.map((p, i) => {
            const ts = p.topics || (p.topic ? [p.topic] : []);
            return (
            <div key={i} style={{ padding: "8px 0", borderBottom: i < patients.length - 1 ? `1px solid ${T.line}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600, color: T.navy, fontSize: 13 }}>{p.initials}</span>
                {ts.map(t => <span key={t} style={{ fontSize: 13, color: "white", background: T.med, padding: "1px 6px", borderRadius: 6, fontWeight: 600 }}>{t}</span>)}
                <span style={{ fontSize: 13, color: T.muted, marginLeft: "auto" }}>{new Date(p.date).toLocaleDateString()}</span>
              </div>
              {p.dx && <div style={{ fontSize: 13, color: T.sub, marginTop: 2, wordBreak: "break-word" }}>{p.dx}</div>}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Rotation-End Summary (Enhanced PDF Export)
// ═══════════════════════════════════════════════════════════════════════

function RotationSummaryReport({ student: s, settings, articles, onBack }: { student?: AdminStudent; settings: SharedSettings & { hospitalName?: string }; articles: ArticlesData; onBack: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!s) return <div style={{ padding: 16 }}>Student not found.</div>;

  const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const rotationName = settings?.attendingName || "Nephrology Rotation";
  const pct = (score: QuizScore | null) => score && score.total > 0 ? Math.round((score.correct / score.total) * 100) : null;
  const pre = pct(s.preScore);
  const post = pct(s.postScore);
  const growth = pre !== null && post !== null ? post - pre : null;
  const wkScores = s.weeklyScores || {};
  const patients = s.patients || [];
  const competency = buildAdminCompetencySnapshot(s, settings, articles);
  const assessment = buildAdminAssessmentSignal(s);
  const earned = s.gamification?.achievements || [];
  const earnedBadges = ACHIEVEMENTS.filter(a => earned.includes(a.id));
  const completed = s.completedItems || { articles: {}, studySheets: {}, cases: {} };

  // Topic distribution
  const topicCounts: Record<string, number> = {};
  patients.forEach(p => {
    const ts = p.topics || (p.topic ? [p.topic] : []);
    ts.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
  });

  // Completed items per week
  const weeklyCompletion = [1, 2, 3, 4].map(w => {
    const arts = (articles[w] || []).length;
    const artsDone = (articles[w] || []).filter(a => completed.articles[a.url]).length;
    const sheets = (STUDY_SHEETS[w] || []).length;
    const sheetsDone = (STUDY_SHEETS[w] || []).filter(sh => completed.studySheets[sh.id]).length;
    return { week: w, articles: { done: artsDone, total: arts }, sheets: { done: sheetsDone, total: sheets } };
  });

  // SR stats
  const srQueue = s.srQueue || {};
  const srTotal = Object.keys(srQueue).length;
  const srMastered = Object.values(srQueue).filter(i => i.interval > 21).length;

  const hdr: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: "#0F2B3C", marginBottom: 8, fontFamily: "'Crimson Pro', Georgia, serif" };
  const tblTh: React.CSSProperties = { padding: "8px 10px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "#5D6D7E", textTransform: "uppercase", letterSpacing: 0.3 };
  const tblTd: React.CSSProperties = { padding: "8px 10px" };

  return (
    <div>
      <button onClick={onBack} style={{ ...backBtn, marginBottom: 12 }}>← Back to Student</button>
      <div className="printable-report" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", color: "#2C3E50", lineHeight: 1.5, padding: 20, background: "white" }}>
        {/* Header */}
        <div style={{ borderBottom: "2px solid #0F2B3C", paddingBottom: 12, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#0F2B3C", fontFamily: "'Crimson Pro', Georgia, serif" }}>Rotation Summary Report</div>
              <div style={{ fontSize: 13, color: "#5D6D7E", marginTop: 2 }}>{rotationName}{settings?.dates ? ` — ${settings.dates}` : ""}</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 13, color: "#5D6D7E" }}>
              <div>Generated {reportDate}</div>
              <div style={{ marginTop: 2, fontSize: 13, color: "#ABB2B9" }}>&copy; Jonathan Cheng, MD MPH</div>
            </div>
          </div>
        </div>

        {/* Student Info */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0F2B3C", fontFamily: "'Crimson Pro', Georgia, serif" }}>{s.name}</div>
          <div style={{ fontSize: 13, color: "#5D6D7E" }}>
            {s.year || "MS3/MS4"} {s.email ? `• ${s.email}` : ""} • {competency.masteryPercent}% mastery • Top domain {competency.topDomain.label}
          </div>
        </div>

        {/* Score Summary */}
        <div className="print-no-break" style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1, textAlign: "center", padding: 14, border: "1px solid #D5DBDB", borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#ABB2B9", textTransform: "uppercase" }}>Pre-Test</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#E67E22", fontFamily: "'JetBrains Mono', monospace" }}>{pre !== null ? pre + "%" : "—"}</div>
          </div>
          <div style={{ flex: 1, textAlign: "center", padding: 14, border: "1px solid #D5DBDB", borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1ABC9C", textTransform: "uppercase" }}>Post-Test</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1ABC9C", fontFamily: "'JetBrains Mono', monospace" }}>{post !== null ? post + "%" : "—"}</div>
          </div>
          {growth !== null && (
            <div style={{ flex: 1, textAlign: "center", padding: 14, border: "1px solid #D5DBDB", borderRadius: 8, background: "#E8F8F5" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1ABC9C", textTransform: "uppercase" }}>Growth</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#1ABC9C", fontFamily: "'JetBrains Mono', monospace" }}>+{growth}%</div>
            </div>
          )}
        </div>

        <div className="print-no-break" style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1, padding: 14, border: "1px solid #D5DBDB", borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#5D6D7E", textTransform: "uppercase", marginBottom: 6 }}>Competency Snapshot</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#0F2B3C", fontFamily: "'JetBrains Mono', monospace" }}>{competency.masteryPercent}%</div>
            <div style={{ fontSize: 13, color: "#5D6D7E", marginTop: 6 }}>{competency.masteryDetail}</div>
            <div style={{ fontSize: 13, color: "#5D6D7E", marginTop: 6 }}>
              {competency.developingCount} developing domain{competency.developingCount !== 1 ? "s" : ""} • {competency.profileLine}
            </div>
          </div>
          <div style={{ flex: 1, padding: 14, border: "1px solid #D5DBDB", borderRadius: 8, background: assessment?.summary ? "#FEF5F5" : "#F8F9FA" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#5D6D7E", textTransform: "uppercase", marginBottom: 6 }}>Teaching Signal</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0F2B3C" }}>
              {assessment?.summary ? `Teach next: ${assessment.summary.recommendedArea.label}` : assessment ? `Assessment logged: ${assessment.overallPct}%` : "Awaiting assessment"}
            </div>
            <div style={{ fontSize: 13, color: "#5D6D7E", marginTop: 6 }}>
              {assessment?.summary
                ? assessment.summary.detailLine
                : assessment?.note || "Once a pre/post assessment is completed in-app, this section highlights weak and strong topic bands."}
            </div>
            {assessment?.summary?.strongestAreas[0] && (
              <div style={{ fontSize: 13, color: "#5D6D7E", marginTop: 6 }}>
                Strongest area: {assessment.summary.strongestAreas[0].label}
              </div>
            )}
          </div>
        </div>

        {/* Weekly Quiz Breakdown */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={hdr}>Weekly Quiz Scores</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ borderBottom: "2px solid #0F2B3C" }}>
              <th style={tblTh}>Week</th>
              <th style={{ ...tblTh, textAlign: "center" }}>Attempts</th>
              <th style={{ ...tblTh, textAlign: "center" }}>Best Score</th>
              <th style={{ ...tblTh, textAlign: "center" }}>Last Score</th>
            </tr></thead>
            <tbody>{[1, 2, 3, 4].map(w => {
              const ws = wkScores[w] || [];
              const best = ws.length > 0 ? Math.max(...ws.map(x => Math.round((x.correct / x.total) * 100))) : null;
              const last = ws.length > 0 ? Math.round((ws[ws.length - 1].correct / ws[ws.length - 1].total) * 100) : null;
              return (
                <tr key={w} style={{ borderBottom: "1px solid #D5DBDB" }}>
                  <td style={tblTd}>Week {w}</td>
                  <td style={{ ...tblTd, textAlign: "center" }}>{ws.length}</td>
                  <td style={{ ...tblTd, textAlign: "center", fontWeight: 600, color: best !== null && best >= 80 ? "#1ABC9C" : best !== null ? "#E67E22" : "#ABB2B9" }}>{best !== null ? best + "%" : "—"}</td>
                  <td style={{ ...tblTd, textAlign: "center" }}>{last !== null ? last + "%" : "—"}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>

        {/* Curriculum Completion */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={hdr}>Curriculum Completion</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ borderBottom: "2px solid #0F2B3C" }}>
              <th style={tblTh}>Week</th>
              <th style={{ ...tblTh, textAlign: "center" }}>Articles</th>
              <th style={{ ...tblTh, textAlign: "center" }}>Study Sheets</th>
              <th style={{ ...tblTh, textAlign: "center" }}>Quiz Taken</th>
            </tr></thead>
            <tbody>{weeklyCompletion.map(wc => (
              <tr key={wc.week} style={{ borderBottom: "1px solid #D5DBDB" }}>
                <td style={tblTd}>Week {wc.week}</td>
                <td style={{ ...tblTd, textAlign: "center" }}>{wc.articles.done}/{wc.articles.total}</td>
                <td style={{ ...tblTd, textAlign: "center" }}>{wc.sheets.done}/{wc.sheets.total}</td>
                <td style={{ ...tblTd, textAlign: "center" }}>{(wkScores[wc.week] || []).length > 0 ? "Yes" : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        {/* Patient Log */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={hdr}>Patient Log ({patients.length} patient{patients.length !== 1 ? "s" : ""})</div>
          {patients.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ borderBottom: "2px solid #0F2B3C" }}>
                <th style={tblTh}>Patient</th><th style={tblTh}>Diagnosis</th><th style={tblTh}>Topics</th><th style={tblTh}>Date</th><th style={tblTh}>Status</th>
              </tr></thead>
              <tbody>{patients.map((p, i) => {
                const ts = p.topics || (p.topic ? [p.topic] : []);
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #D5DBDB" }}>
                    <td style={tblTd}>{p.initials}</td>
                    <td style={tblTd}>{p.dx || "—"}</td>
                    <td style={tblTd}>{ts.join(", ")}</td>
                    <td style={tblTd}>{new Date(p.date).toLocaleDateString()}</td>
                    <td style={tblTd}>{p.status}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          ) : <div style={{ fontSize: 13, color: "#ABB2B9", fontStyle: "italic" }}>No patients logged</div>}
        </div>

        {/* Topic Distribution */}
        {Object.keys(topicCounts).length > 0 && (
          <div className="print-no-break" style={{ marginBottom: 20 }}>
            <div style={hdr}>Topic Distribution</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).map(([topic, count]) => (
                <span key={topic} style={{ fontSize: 13, padding: "3px 10px", borderRadius: 12, border: "1px solid #D5DBDB", color: "#2C3E50" }}>{topic} ({count})</span>
              ))}
            </div>
          </div>
        )}

        {/* SR Progress */}
        {srTotal > 0 && (
          <div className="print-no-break" style={{ marginBottom: 20 }}>
            <div style={hdr}>Spaced Repetition Progress</div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ textAlign: "center", padding: 10, border: "1px solid #D5DBDB", borderRadius: 8, flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#2980B9" }}>{srTotal}</div>
                <div style={{ fontSize: 13, color: "#5D6D7E" }}>Total in Queue</div>
              </div>
              <div style={{ textAlign: "center", padding: 10, border: "1px solid #D5DBDB", borderRadius: 8, flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#1ABC9C" }}>{srMastered}</div>
                <div style={{ fontSize: 13, color: "#5D6D7E" }}>Mastered (&gt;21d)</div>
              </div>
            </div>
          </div>
        )}

        {/* Achievements */}
        {earnedBadges.length > 0 && (
          <div className="print-no-break" style={{ marginBottom: 20 }}>
            <div style={hdr}>Achievements ({earnedBadges.length}/{ACHIEVEMENTS.length})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {earnedBadges.map(a => (
                <span key={a.id} style={{ fontSize: 13, padding: "4px 10px", borderRadius: 8, border: "1px solid #D5DBDB", background: "#F8F9FA" }}>{a.icon} {a.title}</span>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Tags */}
        {(s.feedbackTags || []).length > 0 && (
          <div className="print-no-break" style={{ marginBottom: 20 }}>
            <div style={hdr}>Attending Feedback</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {s.feedbackTags!.map((ft, i) => (
                <span key={i} style={{ fontSize: 13, padding: "4px 10px", borderRadius: 8, border: "1px solid #D5DBDB", background: "#F8F9FA" }}>
                  {ft.tag}{ft.note ? ` — ${ft.note}` : ""} <span style={{ color: "#ABB2B9", fontSize: 13 }}>({new Date(ft.date).toLocaleDateString()})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Milestones */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={hdr}>Milestones</div>
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            {s.addedDate && <div>Joined rotation: {new Date(s.addedDate).toLocaleDateString()}</div>}
            {s.preScore?.date && <div>Pre-test completed: {new Date(s.preScore.date).toLocaleDateString()} ({pre}%)</div>}
            {patients.length > 0 && <div>First patient logged: {new Date(patients[patients.length - 1].date).toLocaleDateString()}</div>}
            {Object.keys(wkScores).length > 0 && <div>Quizzes taken: {Object.values(wkScores).flat().length} across {Object.keys(wkScores).length} week(s)</div>}
            {s.postScore?.date && <div>Post-test completed: {new Date(s.postScore.date).toLocaleDateString()} ({post}%){growth !== null && growth > 0 ? ` — +${growth}% improvement` : ""}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Printable Report (Cohort & Individual)
// ═══════════════════════════════════════════════════════════════════════

function PrintableReport({ mode, students, student, settings, articles, onBack }: { mode: string; students: AdminStudent[]; student?: AdminStudent; settings: SharedSettings & { hospitalName?: string }; articles: ArticlesData; onBack: () => void }) {
  const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const rotationName = settings?.attendingName || "Nephrology Rotation";
  const hospitalName = settings?.hospitalName || "";

  useEffect(() => {
    // Auto-trigger print dialog after a brief delay to allow render
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, []);

  const reportHeader = (
    <div style={{ borderBottom: "2px solid #0F2B3C", paddingBottom: 12, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#0F2B3C", fontFamily: "'Crimson Pro', Georgia, serif" }}>
            {mode === "cohort" ? "Cohort Progress Report" : "Student Progress Report"}
          </div>
          <div style={{ fontSize: 13, color: "#5D6D7E", marginTop: 2 }}>
            {rotationName}{hospitalName ? ` — ${hospitalName}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 13, color: "#5D6D7E" }}>
          <div>Generated {reportDate}</div>
          <div style={{ marginTop: 2, fontSize: 13, color: "#ABB2B9" }}>&copy; Jonathan Cheng, MD MPH</div>
        </div>
      </div>
    </div>
  );

  const pct = (score: QuizScore | null) => score && score.total > 0 ? Math.round((score.correct / score.total) * 100) : null;

  if (mode === "cohort") {
    const activeStudents = students.filter(s => s.status === "active");
    const avgPre = activeStudents.filter(s => s.preScore).length > 0
      ? Math.round(activeStudents.filter(s => s.preScore).reduce((sum, s) => sum + pct(s.preScore)!, 0) / activeStudents.filter(s => s.preScore).length)
      : null;
    const avgPost = activeStudents.filter(s => s.postScore).length > 0
      ? Math.round(activeStudents.filter(s => s.postScore).reduce((sum, s) => sum + pct(s.postScore)!, 0) / activeStudents.filter(s => s.postScore).length)
      : null;

    return (
      <div>
        <button onClick={onBack} style={{ ...backBtn, marginBottom: 12 }}>← Back to Dashboard</button>
        <div className="printable-report" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", color: "#2C3E50", lineHeight: 1.5, padding: 20, background: "white" }}>
          {reportHeader}

          {/* Summary Stats */}
          <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
            <div style={{ flex: 1, textAlign: "center", padding: 12, border: "1px solid #D5DBDB", borderRadius: 8 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#2980B9" }}>{activeStudents.length}</div>
              <div style={{ fontSize: 13, color: "#5D6D7E" }}>Active Students</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", padding: 12, border: "1px solid #D5DBDB", borderRadius: 8 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#1ABC9C" }}>{students.reduce((sum, s) => sum + (s.patients || []).length, 0)}</div>
              <div style={{ fontSize: 13, color: "#5D6D7E" }}>Total Patients</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", padding: 12, border: "1px solid #D5DBDB", borderRadius: 8 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#E67E22" }}>{avgPre !== null ? avgPre + "%" : "—"}</div>
              <div style={{ fontSize: 13, color: "#5D6D7E" }}>Avg Pre-Test</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", padding: 12, border: "1px solid #D5DBDB", borderRadius: 8 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#16A085" }}>{avgPost !== null ? avgPost + "%" : "—"}</div>
              <div style={{ fontSize: 13, color: "#5D6D7E" }}>Avg Post-Test</div>
            </div>
            {avgPre !== null && avgPost !== null && (
              <div style={{ flex: 1, textAlign: "center", padding: 12, border: "1px solid #D5DBDB", borderRadius: 8, background: "#E8F8F5" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#1ABC9C" }}>+{avgPost - avgPre}%</div>
                <div style={{ fontSize: 13, color: "#5D6D7E" }}>Avg Growth</div>
              </div>
            )}
          </div>

          {/* Student Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #0F2B3C" }}>
                <th style={thStyle}>Student</th>
                <th style={thStyle}>Year</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Patients</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Quizzes</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Pre-Test</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Post-Test</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Growth</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Mastery</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Teach Next</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const pre = pct(s.preScore);
                const post = pct(s.postScore);
                const growth = pre !== null && post !== null ? post - pre : null;
                const wkScores = s.weeklyScores || {};
                const quizCount = Object.values(wkScores).flat().length;
                const competency = buildAdminCompetencySnapshot(s, settings, articles);
                const assessment = buildAdminAssessmentSignal(s);
                return (
                  <tr key={s.id || i} style={{ borderBottom: "1px solid #D5DBDB", background: i % 2 === 0 ? "white" : "#F8F9FA" }}>
                    <td style={tdStyle}><strong>{s.name}</strong></td>
                    <td style={tdStyle}>{s.year || "—"}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{(s.patients || []).length}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{quizCount}</td>
                    <td style={{ ...tdStyle, textAlign: "center", color: "#E67E22" }}>{pre !== null ? pre + "%" : "—"}</td>
                    <td style={{ ...tdStyle, textAlign: "center", color: "#16A085" }}>{post !== null ? post + "%" : "—"}</td>
                    <td style={{ ...tdStyle, textAlign: "center", color: growth !== null && growth > 0 ? "#1ABC9C" : "#5D6D7E", fontWeight: 600 }}>
                      {growth !== null ? (growth > 0 ? "+" : "") + growth + "%" : "—"}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{competency.masteryPercent}% · {competency.topDomain.label}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{assessment?.summary?.recommendedArea.shortLabel || (assessment ? "Needs detail" : "—")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Individual Student Report
  const s = student;
  if (!s) return <div style={{ padding: 16 }}>Student not found.</div>;

  const pre = pct(s.preScore);
  const post = pct(s.postScore);
  const growth = pre !== null && post !== null ? post - pre : null;
  const wkScores = s.weeklyScores || {};
  const patients = s.patients || [];
  const competency = buildAdminCompetencySnapshot(s, settings, articles);
  const assessment = buildAdminAssessmentSignal(s);
  const earned = s.gamification?.achievements || [];
  const earnedBadges = ACHIEVEMENTS.filter(a => earned.includes(a.id));

  // Topic distribution
  const topicCounts: Record<string, number> = {};
  patients.forEach(p => {
    const ts = p.topics || (p.topic ? [p.topic] : []);
    ts.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
  });

  return (
    <div>
      <button onClick={onBack} style={{ ...backBtn, marginBottom: 12 }}>← Back to Student</button>
      <div className="printable-report" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", color: "#2C3E50", lineHeight: 1.5, padding: 20, background: "white" }}>
        {reportHeader}

        {/* Student Header */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0F2B3C", fontFamily: "'Crimson Pro', Georgia, serif" }}>{s.name}</div>
          <div style={{ fontSize: 13, color: "#5D6D7E" }}>{s.year || "MS3/MS4"} {s.email ? `• ${s.email}` : ""} • {competency.masteryPercent}% mastery • Top domain {competency.topDomain.label}</div>
        </div>

        {/* Scores Summary */}
        <div className="print-no-break" style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1, textAlign: "center", padding: 14, border: "1px solid #D5DBDB", borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#ABB2B9", textTransform: "uppercase" }}>Pre-Test</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#E67E22", fontFamily: "'JetBrains Mono', monospace" }}>{pre !== null ? pre + "%" : "—"}</div>
            {s.preScore && <div style={{ fontSize: 13, color: "#ABB2B9" }}>{s.preScore.correct}/{s.preScore.total}</div>}
          </div>
          <div style={{ flex: 1, textAlign: "center", padding: 14, border: "1px solid #D5DBDB", borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1ABC9C", textTransform: "uppercase" }}>Post-Test</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#1ABC9C", fontFamily: "'JetBrains Mono', monospace" }}>{post !== null ? post + "%" : "—"}</div>
            {s.postScore && <div style={{ fontSize: 13, color: "#ABB2B9" }}>{s.postScore.correct}/{s.postScore.total}</div>}
          </div>
          {growth !== null && (
            <div style={{ flex: 1, textAlign: "center", padding: 14, border: "1px solid #D5DBDB", borderRadius: 8, background: "#E8F8F5" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1ABC9C", textTransform: "uppercase" }}>Growth</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: "#1ABC9C", fontFamily: "'JetBrains Mono', monospace" }}>+{growth}%</div>
            </div>
          )}
        </div>

        <div className="print-no-break" style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1, padding: 14, border: "1px solid #D5DBDB", borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#5D6D7E", textTransform: "uppercase", marginBottom: 6 }}>Competency Snapshot</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#0F2B3C", fontFamily: "'JetBrains Mono', monospace" }}>{competency.masteryPercent}%</div>
            <div style={{ fontSize: 13, color: "#5D6D7E", marginTop: 6 }}>{competency.masteryDetail}</div>
            <div style={{ fontSize: 13, color: "#5D6D7E", marginTop: 6 }}>
              {competency.profileLine} • {competency.developingCount} developing domain{competency.developingCount !== 1 ? "s" : ""}
            </div>
          </div>
          <div style={{ flex: 1, padding: 14, border: "1px solid #D5DBDB", borderRadius: 8, background: assessment?.summary ? "#FEF5F5" : "#F8F9FA" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#5D6D7E", textTransform: "uppercase", marginBottom: 6 }}>Teaching Signal</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0F2B3C" }}>
              {assessment?.summary ? `Teach next: ${assessment.summary.recommendedArea.label}` : assessment ? `Assessment logged: ${assessment.overallPct}%` : "Awaiting assessment"}
            </div>
            <div style={{ fontSize: 13, color: "#5D6D7E", marginTop: 6 }}>
              {assessment?.summary
                ? assessment.summary.detailLine
                : assessment?.note || "Detailed topic-band insight appears after an in-app assessment run."}
            </div>
            {assessment?.summary?.strongestAreas[0] && (
              <div style={{ fontSize: 13, color: "#5D6D7E", marginTop: 6 }}>
                Strongest area: {assessment.summary.strongestAreas[0].label}
              </div>
            )}
          </div>
        </div>

        {/* Weekly Quiz Breakdown */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0F2B3C", marginBottom: 8, fontFamily: "'Crimson Pro', Georgia, serif" }}>Weekly Quiz Scores</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #0F2B3C" }}>
                <th style={thStyle}>Week</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Attempts</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Best Score</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Last Score</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map(w => {
                const ws = wkScores[w] || [];
                const best = ws.length > 0 ? Math.max(...ws.map(x => Math.round((x.correct / x.total) * 100))) : null;
                const last = ws.length > 0 ? Math.round((ws[ws.length - 1].correct / ws[ws.length - 1].total) * 100) : null;
                return (
                  <tr key={w} style={{ borderBottom: "1px solid #D5DBDB" }}>
                    <td style={tdStyle}>Week {w}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{ws.length}</td>
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 600, color: best !== null && best >= 80 ? "#1ABC9C" : best !== null && best >= 60 ? "#F1C40F" : best !== null ? "#E74C3C" : "#ABB2B9" }}>
                      {best !== null ? best + "%" : "—"}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{last !== null ? last + "%" : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Patient Log */}
        <div className="print-no-break" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0F2B3C", marginBottom: 8, fontFamily: "'Crimson Pro', Georgia, serif" }}>
            Patient Log ({patients.length} patient{patients.length !== 1 ? "s" : ""})
          </div>
          {patients.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #0F2B3C" }}>
                  <th style={thStyle}>Patient</th>
                  <th style={thStyle}>Diagnosis</th>
                  <th style={thStyle}>Topics</th>
                  <th style={thStyle}>Date</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p, i) => {
                  const ts = p.topics || (p.topic ? [p.topic] : []);
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #D5DBDB" }}>
                      <td style={tdStyle}>{p.initials}</td>
                      <td style={tdStyle}>{p.dx || "—"}</td>
                      <td style={tdStyle}>{ts.join(", ")}</td>
                      <td style={tdStyle}>{new Date(p.date).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ fontSize: 13, color: "#ABB2B9", fontStyle: "italic" }}>No patients logged</div>
          )}
        </div>

        {/* Topic Distribution */}
        {Object.keys(topicCounts).length > 0 && (
          <div className="print-no-break" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F2B3C", marginBottom: 8, fontFamily: "'Crimson Pro', Georgia, serif" }}>Topic Distribution</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).map(([topic, count]) => (
                <span key={topic} style={{ fontSize: 13, padding: "3px 10px", borderRadius: 12, border: "1px solid #D5DBDB", color: "#2C3E50" }}>
                  {topic} ({count})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <div className="print-no-break" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F2B3C", marginBottom: 8, fontFamily: "'Crimson Pro', Georgia, serif" }}>Achievements Earned ({earnedBadges.length}/{ACHIEVEMENTS.length})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {earnedBadges.map(a => (
                <span key={a.id} style={{ fontSize: 13, padding: "4px 10px", borderRadius: 8, border: "1px solid #D5DBDB", background: "#F8F9FA" }}>
                  {a.icon} {a.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Attending Feedback */}
        {(s.feedbackTags || []).length > 0 && (
          <div className="print-no-break" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F2B3C", marginBottom: 8, fontFamily: "'Crimson Pro', Georgia, serif" }}>Attending Feedback ({s.feedbackTags!.length})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {s.feedbackTags!.map((ft, i) => (
                <span key={i} style={{ fontSize: 13, padding: "4px 10px", borderRadius: 8, border: "1px solid #D5DBDB", background: "#F8F9FA" }}>
                  {ft.tag}{ft.note ? ` — ${ft.note}` : ""} <span style={{ color: "#ABB2B9", fontSize: 13 }}>({new Date(ft.date).toLocaleDateString()})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "8px 10px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "#5D6D7E", textTransform: "uppercase", letterSpacing: 0.3 };
const tdStyle = { padding: "8px 10px" };

export default AdminPanel;
