import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Brain,
  ChevronRight,
  ClipboardList,
  Download,
  Megaphone,
  RefreshCw,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { T, WEEKLY, ARTICLES, STUDY_SHEETS } from "../../data/constants";
import { WEEKLY_QUIZZES } from "../../data/quizzes";
import { WEEKLY_CASES } from "../../data/cases";
import { PRO_TIPS } from "./shared";
import { getClinicTopicForDate, getCurrentOrNextFriday } from "../../utils/clinicRotation";
import { useIsMobile } from "../../utils/helpers";
import { buildAssessmentSummary } from "../../utils/assessmentInsights";
import { getLevel } from "../../utils/gamification";
import type {
  Announcement,
  Bookmarks,
  ClinicGuideRecord,
  CompletedItems,
  Gamification,
  Patient,
  QuizScore,
  ReflectionEntry,
  SubView,
  WeeklyScores,
} from "../../types";
import type { CompetencySummary } from "../../utils/competency";

const PEARL_STORAGE_KEY = "neph_todayPearlDismissed";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface HomeTabProps {
  navigate: (tab: string, sv?: SubView) => void;
  preScore: QuizScore | null;
  postScore: QuizScore | null;
  curriculum: typeof WEEKLY;
  articles: typeof ARTICLES;
  announcements: Announcement[];
  currentWeek: number | null;
  totalWeeks?: number;
  rotationEnded?: boolean;
  weeklyScores: WeeklyScores;
  completedItems: CompletedItems;
  bookmarks: Bookmarks;
  srDueCount: number;
  patients: Patient[];
  online?: boolean;
  clinicGuides?: ClinicGuideRecord[];
  competencySummary: CompetencySummary;
  gamification: Gamification;
  reflections: ReflectionEntry[];
  onSubmitReflection: (payload: { saw: string; unclear: string }) => Promise<ReflectionEntry | null>;
  installPromptVariant: "native" | "ios" | null;
  onInstallApp: () => Promise<void>;
  onDismissInstallPrompt: () => void;
}

interface NavAction {
  label: string;
  meta: string;
  tab: string;
  subView?: SubView;
}

interface LearningPlan {
  label: string;
  detail: string;
  remaining: number;
  done: number;
  total: number;
  completionRatio: number;
  nextAction: NavAction;
}

interface HeroCard {
  eyebrow: string;
  title: string;
  body: string;
  tone: "rounds" | "didactic" | "clinic" | "wrap";
  badge: string;
  actions: NavAction[];
}

function makeAction(label: string, meta: string, tab: string, subView?: SubView): NavAction {
  return { label, meta, tab, subView };
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatRelativeTime(dateStr?: string, now: Date = new Date()): string {
  if (!dateStr) return "";
  const diff = now.getTime() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

function getPearlIndex(date: Date): number {
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return dayNumber % PRO_TIPS.length;
}

function countBookmarks(bookmarks: Bookmarks): number {
  return Object.values(bookmarks || {}).reduce((sum, items) => sum + items.length, 0);
}

function buildLearningPlan({
  currentWeek,
  totalWeeks,
  rotationEnded,
  articles,
  completedItems,
  weeklyScores,
}: {
  currentWeek: number | null;
  totalWeeks: number;
  rotationEnded: boolean;
  articles: typeof ARTICLES;
  completedItems: CompletedItems;
  weeklyScores: WeeklyScores;
}): LearningPlan {
  const activeWeeks = currentWeek
    ? [currentWeek]
    : rotationEnded
      ? Array.from({ length: Math.min(totalWeeks, 4) }, (_, index) => index + 1)
      : [1];

  let sheetsTotal = 0;
  let sheetsDone = 0;
  let casesTotal = 0;
  let casesDone = 0;
  let quizzesTotal = 0;
  let quizzesDone = 0;
  let nextAction: NavAction | null = null;
  let optionalReferencesTotal = 0;
  let optionalReferencesDone = 0;
  let optionalReferenceAction: NavAction | null = null;

  for (const week of activeWeeks) {
    const weekSheets = STUDY_SHEETS[week] || [];
    const weekArticles = articles[week] || [];
    const weekCases = WEEKLY_CASES[week] || [];
    const quizAvailable = (WEEKLY_QUIZZES[week] || []).length > 0;

    const weekSheetsDone = weekSheets.filter((sheet) => completedItems.studySheets?.[sheet.id]).length;
    const weekArticlesDone = weekArticles.filter((article) => completedItems.articles?.[article.url]).length;
    const weekCasesDone = weekCases.filter((item) => completedItems.cases?.[item.id]).length;
    const weekQuizTaken = (weeklyScores[week] || []).length > 0;

    sheetsTotal += weekSheets.length;
    sheetsDone += weekSheetsDone;
    casesTotal += weekCases.length;
    casesDone += weekCasesDone;
    optionalReferencesTotal += weekArticles.length;
    optionalReferencesDone += weekArticlesDone;
    if (quizAvailable) quizzesTotal += 1;
    if (weekQuizTaken) quizzesDone += 1;

    if (!nextAction && weekSheetsDone < weekSheets.length) {
      nextAction = {
        label: `Open Week ${week} study sheets`,
        meta: `${weekSheets.length - weekSheetsDone} still to review`,
        tab: "today",
        subView: { type: "studySheets", week },
      };
      continue;
    }
    if (!nextAction && weekCasesDone < weekCases.length) {
      nextAction = {
        label: `Work Week ${week} cases`,
        meta: `${weekCases.length - weekCasesDone} case${weekCases.length - weekCasesDone !== 1 ? "s" : ""} pending`,
        tab: "today",
        subView: { type: "cases", week },
      };
      continue;
    }
    if (!nextAction && quizAvailable && !weekQuizTaken) {
      nextAction = {
        label: `Take Week ${week} quiz`,
        meta: `${(WEEKLY_QUIZZES[week] || []).length} questions`,
        tab: "today",
        subView: { type: "weeklyQuiz", week },
      };
    }

    if (!optionalReferenceAction && weekArticlesDone < weekArticles.length) {
      optionalReferenceAction = {
        label: `Browse Week ${week} references`,
        meta: `${weekArticles.length - weekArticlesDone} optional reference${weekArticles.length - weekArticlesDone !== 1 ? "s" : ""} available`,
        tab: "today",
        subView: { type: "articles", week },
      };
    }
  }

  const total = sheetsTotal + casesTotal + quizzesTotal;
  const done = sheetsDone + casesDone + quizzesDone;
  const remaining = Math.max(total - done, 0);
  const optionalRemaining = Math.max(optionalReferencesTotal - optionalReferencesDone, 0);
  const detailParts: string[] = [];
  if (sheetsTotal - sheetsDone > 0) detailParts.push(`${sheetsTotal - sheetsDone} sheet${sheetsTotal - sheetsDone !== 1 ? "s" : ""}`);
  if (casesTotal - casesDone > 0) detailParts.push(`${casesTotal - casesDone} case${casesTotal - casesDone !== 1 ? "s" : ""}`);
  if (quizzesTotal - quizzesDone > 0) detailParts.push(`${quizzesTotal - quizzesDone} quiz`);

  return {
    label: currentWeek ? `Week ${currentWeek} core plan` : rotationEnded ? "Rotation wrap-up" : "Getting started",
    detail: remaining > 0
      ? detailParts.join(" · ")
      : optionalRemaining > 0
        ? `Core work complete · ${optionalRemaining} optional reference${optionalRemaining !== 1 ? "s" : ""} available`
        : "All core work complete",
    remaining,
    done,
    total,
    completionRatio: total > 0 ? done / total : 0,
    nextAction: nextAction || optionalReferenceAction || {
      label: rotationEnded ? "Open Me" : "Browse by topic",
      meta: rotationEnded ? "Review your progress and wrap up" : "Explore the full rotation map",
      tab: rotationEnded ? "me" : "today",
      subView: rotationEnded ? undefined : { type: "browseByTopic" },
    },
  };
}

function buildHeroCard({
  now,
  currentWeek,
  rotationEnded,
  learningPlan,
  activePatientCount,
  clinicGuides,
  postScore,
}: {
  now: Date;
  currentWeek: number | null;
  rotationEnded: boolean;
  learningPlan: LearningPlan;
  activePatientCount: number;
  clinicGuides: ClinicGuideRecord[];
  postScore: QuizScore | null;
}): HeroCard {
  const friday = getCurrentOrNextFriday(now);
  const fridayDate = toDateKey(friday);
  const fridayTopic = clinicGuides.find((guide) => guide.date === fridayDate)?.topic || getClinicTopicForDate(friday);
  const weekday = now.getDay();
  const clinicAction: NavAction = {
    label: "Open Friday clinic guide",
    meta: `${fridayTopic} · ${friday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    tab: "library",
    subView: { type: "clinicGuide", date: fridayDate },
  };
  const patientsAction: NavAction = {
    label: activePatientCount > 0 ? "Open inpatient list" : "Add your first inpatient",
    meta: activePatientCount > 0
      ? `${activePatientCount} active consult${activePatientCount !== 1 ? "s" : ""}`
      : "Start your rounding list",
    tab: "patients",
  };

  if (rotationEnded) {
    return {
      eyebrow: "Next up",
      title: postScore ? "Close out the rotation" : "Optional post-rotation check-in",
      body: postScore
        ? "Use Me to review what you covered, then finish any remaining core work or browse extra references."
        : "Your wrap-up is ready. The final assessment is optional, but it helps show what stuck and what to keep reinforcing.",
      tone: "wrap",
      badge: postScore ? "Wrap-up" : "Assessment",
      actions: [
        postScore
          ? { label: "Open Me", meta: "Review progress, activity, and milestones", tab: "me" }
          : { label: "Take post-rotation quiz", meta: "Optional wrap-up to compare against your baseline", tab: "today", subView: { type: "postQuiz" } },
        learningPlan.nextAction,
      ],
    };
  }

  if (weekday === 4 || weekday === 5) {
    return {
      eyebrow: "Next up",
      title: weekday === 5 ? "Friday clinic" : "Friday clinic prep",
      body: `Review the ${fridayTopic} teaching guide, then tighten one more week-${currentWeek || 1} learning item before clinic.`,
      tone: "clinic",
      badge: friday.toLocaleDateString("en-US", { weekday: "short" }),
      actions: [clinicAction, learningPlan.nextAction],
    };
  }

  if (weekday === 3) {
    return {
      eyebrow: "Next up",
      title: "Midweek teaching",
      body: "Use today to sharpen the highest-yield ideas before conference, rounds, and afternoon check-ins.",
      tone: "didactic",
      badge: "Didactic",
      actions: [learningPlan.nextAction, patientsAction],
    };
  }

  return {
    eyebrow: "Next up",
    title: activePatientCount > 0 ? "Morning rounds" : "Build your rounding list",
    body: activePatientCount > 0
      ? "Start with your active consults, then knock out one high-yield prep task before the day gets noisy."
      : "No inpatients logged yet. Add your hospital consults first so Today can start tailoring the right prep.",
    tone: "rounds",
    badge: "Rounds",
    actions: [patientsAction, learningPlan.nextAction],
  };
}

function ProgressRing({ value }: { value: number }) {
  const size = 92;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(value, 100)) / 100);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={T.line}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={T.med}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.navy, fontFamily: T.mono }}>{value}%</div>
        <div style={{ fontSize: 13, color: T.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>Ready</div>
      </div>
    </div>
  );
}

interface AssessmentSectionProps {
  navigate: (tab: string, sv?: SubView) => void;
  preScore: QuizScore | null;
  postScore: QuizScore | null;
  rotationEnded: boolean;
  srDueCount: number;
}

function AssessmentSection({
  navigate,
  preScore,
  postScore,
  rotationEnded,
  srDueCount,
}: AssessmentSectionProps) {
  const preSummary = useMemo(
    () => (preScore ? buildAssessmentSummary({ mode: "pre", score: preScore }) : null),
    [preScore],
  );
  const postSummary = useMemo(
    () => (postScore ? buildAssessmentSummary({ mode: "post", score: postScore, comparisonScore: preScore }) : null),
    [postScore, preScore],
  );

  const summary = rotationEnded ? postSummary : preSummary;
  const pendingAction = rotationEnded
    ? makeAction("Take post-rotation assessment", "Optional wrap-up to compare against your baseline", "today", { type: "postQuiz" })
    : makeAction("Take pre-rotation assessment", "Optional baseline that personalizes teaching and review", "today", { type: "preQuiz" });
  const bridgeAction = rotationEnded
    ? makeAction("Open Me", "Review your competency snapshot and wrap-up items", "me")
    : makeAction("Browse topics", "Skip it for now and jump straight into the curriculum", "today", { type: "browseByTopic" });
  const followUpAction = summary
    ? srDueCount > 0
      ? makeAction(
          "Start spaced repetition",
          `${srDueCount} review card${srDueCount !== 1 ? "s" : ""} due now from missed assessment items`,
          "today",
          { type: "srReview" },
        )
      : summary.recommendedArea.practiceAction
    : null;

  if (!summary) {
    return (
      <section style={{ marginBottom: 14 }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${T.warmBg} 0%, ${T.card} 100%)`,
            borderRadius: 18,
            padding: 18,
            border: `1px solid ${T.line}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.9, marginBottom: 6 }}>
                Assessment
              </div>
              <h2 style={{ margin: 0, color: T.navy, fontFamily: T.serif, fontSize: 22, fontWeight: 700 }}>
                {rotationEnded ? "Optional post-rotation check-in" : "Optional baseline check-in"}
              </h2>
              <p style={{ margin: "8px 0 0", color: T.text, fontSize: 14, lineHeight: 1.6, maxWidth: 580 }}>
                {rotationEnded
                  ? "Not required, but it gives you a cleaner wrap-up: where you grew, what still needs teaching, and what should keep repeating."
                  : "Not required, but it helps Today highlight the topics you already own and the ones that need more teaching and reinforcement."}
              </p>
            </div>
            <div style={{ background: T.card, color: T.warn, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 700, border: `1px solid ${T.line}` }}>
              Optional
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <span style={{ background: T.yellowBg, color: T.warn, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 700 }}>
              25 questions
            </span>
            <span style={{ background: T.ice, color: T.med, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 700 }}>
              Topic strengths + gaps
            </span>
            <span style={{ background: T.greenBg, color: T.greenDk, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 700 }}>
              Feeds teaching + review
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {[pendingAction, bridgeAction].map((action, index) => (
              <button
                key={action.label}
                onClick={() => navigate(action.tab, action.subView)}
                style={{
                  background: index === 0 ? T.accent : T.card,
                  color: index === 0 ? "white" : T.navy,
                  border: index === 0 ? "none" : `1px solid ${T.line}`,
                  borderRadius: 14,
                  padding: "14px 14px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{action.label}</div>
                  <div style={{ fontSize: 13, color: index === 0 ? "rgba(255,255,255,0.82)" : T.sub, marginTop: 4 }}>
                    {action.meta}
                  </div>
                </div>
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ marginBottom: 14 }}>
      <div style={{ background: T.card, borderRadius: 18, padding: 18, border: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <BadgeCheck size={16} strokeWidth={2} color={T.greenDk} aria-hidden="true" />
              <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.9 }}>
                Assessment insight
              </div>
            </div>
            <h2 style={{ margin: 0, color: T.navy, fontFamily: T.serif, fontSize: 20, fontWeight: 700 }}>
              {rotationEnded ? "Post-rotation snapshot" : "Baseline snapshot"}
            </h2>
            <p style={{ margin: "8px 0 0", color: T.text, fontSize: 14, lineHeight: 1.6, maxWidth: 580 }}>
              {summary.summaryLine}. {summary.detailLine}
            </p>
          </div>
          <div style={{ background: T.ice, color: T.navy, borderRadius: 16, padding: "10px 12px", minWidth: 90, textAlign: "right" }}>
            <div style={{ fontSize: 13, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Score</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: T.mono }}>{summary.overallPct}%</div>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          <span style={{ background: T.yellowBg, color: T.warn, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 700 }}>
            Focus: {summary.recommendedArea.shortLabel}
          </span>
          {summary.strongestAreas[0] && (
            <span style={{ background: T.greenBg, color: T.greenDk, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 700 }}>
              Strongest: {summary.strongestAreas[0].shortLabel}
            </span>
          )}
          {summary.growthPct !== null && (
            <span style={{ background: summary.growthPct >= 0 ? T.greenBg : T.redBg, color: summary.growthPct >= 0 ? T.greenDk : T.accent, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 700 }}>
              {summary.growthPct >= 0 ? "+" : ""}
              {summary.growthPct} pts vs baseline
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 12 }}>
          {summary.focusAreas.slice(0, 2).map((area) => (
            <div key={area.week} style={{ background: T.warmBg, borderRadius: 14, padding: "12px 14px", border: `1px solid ${T.line}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Brain size={15} strokeWidth={1.9} color={T.warn} aria-hidden="true" />
                <div style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>
                  Week {area.week}: {area.shortLabel}
                </div>
              </div>
              <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>
                {area.correct}/{area.total} correct
                {area.missedTopics.length > 0 ? ` · Missed ${area.missedTopics.join(", ")}` : " · Ready for a quick polish pass"}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {[summary.recommendedArea.action, followUpAction, summary.reviewAction].filter(Boolean).map((action, index) => (
            <button
              key={action!.label}
              onClick={() => navigate(action!.tab, action!.subView)}
              style={{
                background: index === 0 ? T.accent : T.card,
                color: index === 0 ? "white" : T.navy,
                border: index === 0 ? "none" : `1px solid ${T.line}`,
                borderRadius: 14,
                padding: "14px 14px",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{action!.label}</div>
                <div style={{ fontSize: 13, color: index === 0 ? "rgba(255,255,255,0.82)" : T.sub, marginTop: 4 }}>
                  {action!.meta}
                </div>
              </div>
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomeTab({
  navigate,
  preScore,
  postScore,
  curriculum,
  articles,
  announcements,
  currentWeek,
  totalWeeks = 4,
  rotationEnded = false,
  weeklyScores,
  completedItems,
  bookmarks,
  srDueCount,
  patients,
  online = true,
  clinicGuides = [],
  competencySummary,
  gamification,
  reflections,
  onSubmitReflection,
  installPromptVariant,
  onInstallApp,
  onDismissInstallPrompt,
}: HomeTabProps) {
  const isMobile = useIsMobile();
  const level = getLevel(gamification?.points || 0);
  const now = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(now), [now]);
  const [pearlDismissed, setPearlDismissed] = useState(false);
  const [reflectionSaw, setReflectionSaw] = useState("");
  const [reflectionUnclear, setReflectionUnclear] = useState("");
  const [reflectionError, setReflectionError] = useState("");
  const [savingReflection, setSavingReflection] = useState(false);

  useEffect(() => {
    setPearlDismissed(localStorage.getItem(PEARL_STORAGE_KEY) === todayKey);
  }, [todayKey]);

  const todayReflection = useMemo(
    () => (reflections || [])
      .filter((entry) => entry.dayKey === todayKey)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0] || null,
    [reflections, todayKey],
  );

  const activePatients = useMemo(
    () => (patients || [])
      .filter((patient) => patient.status === "active")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, isMobile ? 3 : 4),
    [isMobile, patients],
  );

  const activeAnnouncements = useMemo(
    () => (announcements || [])
      .filter((item) => !item.date || now.getTime() - new Date(item.date).getTime() < SEVEN_DAYS_MS)
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()),
    [announcements, now],
  );
  const latestAnnouncement = activeAnnouncements[0] || null;
  const learningPlan = useMemo(
    () => buildLearningPlan({ currentWeek, totalWeeks, rotationEnded, articles, completedItems, weeklyScores }),
    [articles, completedItems, currentWeek, rotationEnded, totalWeeks, weeklyScores],
  );
  const heroCard = useMemo(
    () => buildHeroCard({
      now,
      currentWeek,
      rotationEnded,
      learningPlan,
      activePatientCount: activePatients.length,
      clinicGuides,
      postScore,
    }),
    [activePatients.length, clinicGuides, currentWeek, learningPlan, now, postScore, rotationEnded],
  );

  const pearlIndex = useMemo(() => getPearlIndex(now), [now]);
  const totalBookmarks = useMemo(() => countBookmarks(bookmarks), [bookmarks]);
  const displayWeek = currentWeek || 1;
  const headerKicker = currentWeek ? `Wk ${currentWeek} · ${now.toLocaleDateString("en-US", { weekday: "short" })}` : rotationEnded ? `Rotation complete · ${now.toLocaleDateString("en-US", { weekday: "short" })}` : `Getting started · ${now.toLocaleDateString("en-US", { weekday: "short" })}`;
  const headerSub = rotationEnded
    ? "Everything you need to finish strong and close the loop."
    : curriculum[displayWeek]?.sub || "One focused screen for what matters next.";
  const srAction: NavAction = srDueCount > 0
    ? {
      label: "Review spaced repetition",
      meta: `${srDueCount} question${srDueCount !== 1 ? "s" : ""} due now`,
      tab: "today",
      subView: { type: "srReview" },
    }
    : {
      label: "Open extra practice",
      meta: "No SR due right now — use a fresh practice set instead",
      tab: "today",
      subView: { type: "extraPractice" },
    };

  const quickLinks: NavAction[] = [
    makeAction("Browse topics", "See all content by nephrology concept", "today", { type: "browseByTopic" }),
    makeAction(
      "Saved items",
      totalBookmarks > 0
        ? `${totalBookmarks} bookmark${totalBookmarks !== 1 ? "s" : ""}`
        : "Tap ☆ on any sheet, case, article, or trial to save it here",
      "today",
      { type: "bookmarks" },
    ),
    makeAction("Resources", "Podcasts, guidelines, and websites", "today", { type: "resources" }),
  ];

  const heroToneStyles: Record<HeroCard["tone"], { background: string; border: string; badge: string }> = {
    rounds: { background: `linear-gradient(135deg, ${T.ice} 0%, ${T.card} 100%)`, border: T.med, badge: T.med },
    didactic: { background: `linear-gradient(135deg, ${T.purpleBg} 0%, ${T.card} 100%)`, border: T.purple, badge: T.purpleAccent },
    clinic: { background: `linear-gradient(135deg, ${T.greenBg} 0%, ${T.blueBg} 100%)`, border: T.green, badge: T.greenDk },
    wrap: { background: `linear-gradient(135deg, ${T.yellowBg} 0%, ${T.card} 100%)`, border: T.gold, badge: T.goldText },
  };
  const heroStyle = heroToneStyles[heroCard.tone];

  const handleReflectionSubmit = async () => {
    if (!reflectionSaw.trim() && !reflectionUnclear.trim()) {
      setReflectionError("Add what you saw or what still feels unclear before saving.");
      return;
    }

    setSavingReflection(true);
    setReflectionError("");
    try {
      await onSubmitReflection({ saw: reflectionSaw, unclear: reflectionUnclear });
      setReflectionSaw("");
      setReflectionUnclear("");
    } catch (error) {
      console.warn("Reflection save failed:", error);
      setReflectionError("Couldn't save the reflection right now. Try again in a moment.");
    } finally {
      setSavingReflection(false);
    }
  };

  return (
    <div style={{ padding: "18px 16px 24px" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 6 }}>
          {headerKicker}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, color: T.navy, fontFamily: T.serif, fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>Today</h1>
            <p style={{ margin: "6px 0 0", color: T.sub, fontSize: 13, lineHeight: 1.5, maxWidth: 520 }}>
              {headerSub}
            </p>
          </div>
          {!online && (
            <div style={{ background: T.goldAlpha, color: T.warn, border: `1px solid ${T.gold}`, borderRadius: 999, padding: "7px 12px", fontSize: 13, fontWeight: 700 }}>
              Offline
            </div>
          )}
        </div>
      </div>

      <div style={{ background: heroStyle.background, borderRadius: 20, padding: 18, border: `1.5px solid ${heroStyle.border}`, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.9, marginBottom: 6 }}>
              {heroCard.eyebrow}
            </div>
            <h2 style={{ margin: 0, color: T.navy, fontFamily: T.serif, fontSize: 24, fontWeight: 700, lineHeight: 1.15 }}>
              {heroCard.title}
            </h2>
            <p style={{ margin: "8px 0 0", color: T.text, fontSize: 14, lineHeight: 1.55, maxWidth: 560 }}>
              {heroCard.body}
            </p>
          </div>
          <div style={{ background: T.card, color: heroStyle.badge, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 700, border: `1px solid ${T.line}`, whiteSpace: "nowrap" }}>
            {heroCard.badge}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          {heroCard.actions.map((action, index) => (
            <button
              key={`${action.label}-${index}`}
              onClick={() => navigate(action.tab, action.subView)}
              style={{
                width: "100%",
                background: index === 0 ? T.accent : T.card,
                color: index === 0 ? "white" : T.navy,
                border: index === 0 ? "none" : `1px solid ${T.line}`,
                borderRadius: 14,
                padding: "14px 14px",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{action.label}</div>
                <div style={{ fontSize: 13, color: index === 0 ? "rgba(255,255,255,0.8)" : T.sub, marginTop: 3 }}>
                  {action.meta}
                </div>
              </div>
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>

      <AssessmentSection
        navigate={navigate}
        preScore={preScore}
        postScore={postScore}
        rotationEnded={rotationEnded}
        srDueCount={srDueCount}
      />

      {latestAnnouncement && (
        <div style={{ background: T.card, borderRadius: 16, padding: "12px 14px", border: `1px solid ${T.line}`, display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: T.redBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Megaphone size={18} strokeWidth={1.75} color={T.accent} aria-hidden="true" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>
                {latestAnnouncement.title}
                {activeAnnouncements.length > 1 ? ` · +${activeAnnouncements.length - 1} more` : ""}
              </div>
              <div style={{ fontSize: 13, color: T.muted }}>
                {formatRelativeTime(latestAnnouncement.date, now)}
              </div>
            </div>
            {latestAnnouncement.body && (
              <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginTop: 4 }}>
                {latestAnnouncement.body}
              </div>
            )}
          </div>
        </div>
      )}

      {installPromptVariant && (
        <section style={{ marginBottom: 14 }}>
          <div style={{ background: `linear-gradient(135deg, ${T.blueBg} 0%, ${T.card} 100%)`, borderRadius: 18, padding: 16, border: `1px solid ${T.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: T.card, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Download size={18} strokeWidth={1.75} color={T.med} aria-hidden="true" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
                    Install
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.navy, fontFamily: T.serif, marginBottom: 6 }}>
                    Keep this on the home screen
                  </div>
                  <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.55, maxWidth: 560 }}>
                    {installPromptVariant === "native"
                      ? "It loads faster, feels more like an app, and students are much more likely to keep opening it between rounds."
                      : "On iPhone or iPad, open Safari's Share menu and choose Add to Home Screen so this stays one tap away."}
                  </div>
                </div>
              </div>
              <button
                onClick={onDismissInstallPrompt}
                style={{ background: "none", border: "none", color: T.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0 }}
              >
                Dismiss
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {installPromptVariant === "native" ? (
                <button
                  onClick={() => { void onInstallApp(); }}
                  style={{ background: T.accent, color: "white", border: "none", borderRadius: 12, padding: "10px 14px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}
                >
                  Install app
                </button>
              ) : (
                <div style={{ background: T.card, color: T.navy, borderRadius: 12, padding: "10px 12px", fontSize: 13, fontWeight: 600, border: `1px solid ${T.line}` }}>
                  Safari → Share → Add to Home Screen
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
          <h2 style={{ margin: 0, color: T.text, fontFamily: T.serif, fontSize: 18, fontWeight: 700 }}>Due today</h2>
          <div style={{ fontSize: 13, color: T.muted }}>Two fast wins before the day gets away</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <button
            onClick={() => navigate(srAction.tab, srAction.subView)}
            style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.line}`, padding: "14px 14px", cursor: "pointer", textAlign: "left", display: "flex", gap: 12, alignItems: "flex-start" }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 12, background: T.yellowBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <RefreshCw size={18} strokeWidth={1.75} color={T.warn} aria-hidden="true" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Spaced repetition</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{srAction.label}</div>
              <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginTop: 3 }}>{srAction.meta}</div>
            </div>
          </button>

          <button
            onClick={() => navigate(learningPlan.nextAction.tab, learningPlan.nextAction.subView)}
            style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.line}`, padding: "14px 14px", cursor: "pointer", textAlign: "left", display: "flex", gap: 12, alignItems: "flex-start" }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 12, background: T.blueBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ClipboardList size={18} strokeWidth={1.75} color={T.med} aria-hidden="true" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>{learningPlan.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>
                {learningPlan.remaining > 0 ? `${learningPlan.remaining} core item${learningPlan.remaining !== 1 ? "s" : ""} still open` : "Core work for this block is covered"}
              </div>
              <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginTop: 3 }}>
                {learningPlan.total > 0 ? `${learningPlan.done}/${learningPlan.total} complete · ` : ""}
                {learningPlan.detail}
              </div>
            </div>
          </button>
        </div>
      </section>

      <section style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div>
            <h2 style={{ margin: 0, color: T.text, fontFamily: T.serif, fontSize: 18, fontWeight: 700 }}>Inpatient rounding list</h2>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 3 }}>
              {activePatients.length > 0
                ? `${activePatients.length} active inpatient${activePatients.length !== 1 ? "s" : ""} surfaced here`
                : "Log your consults to make Today feel personal."}
            </div>
          </div>
          <button
            onClick={() => navigate("patients")}
            style={{ background: "none", border: "none", color: T.med, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0 }}
          >
            Open inpatients
            <ChevronRight size={15} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {activePatients.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            {activePatients.map((patient) => {
              const topics = patient.topics?.length ? patient.topics : patient.topic ? [patient.topic] : [];
              return (
                <button
                  key={patient.id}
                  onClick={() => navigate("patients")}
                  style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.line}`, padding: "14px 14px", cursor: "pointer", textAlign: "left" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>
                        {patient.initials || "New inpatient"}
                      </div>
                      <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>
                        {patient.room ? `Rm ${patient.room}` : "Room pending"} · Added {new Date(patient.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ width: 34, height: 34, borderRadius: 12, background: T.greenBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Stethoscope size={16} strokeWidth={1.75} color={T.greenDk} aria-hidden="true" />
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, marginBottom: 8 }}>
                    {patient.dx || "Diagnosis not entered yet"}
                  </div>
                  {topics.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: patient.notes ? 8 : 0 }}>
                      {topics.slice(0, 3).map((topic) => (
                        <span key={topic} style={{ background: T.ice, color: T.med, borderRadius: 999, padding: "4px 8px", fontSize: 13, fontWeight: 700 }}>
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                  {patient.notes && (
                    <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>
                      {patient.notes}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <button
            onClick={() => navigate("patients")}
            style={{ width: "100%", background: T.card, borderRadius: 16, border: `1px dashed ${T.line}`, padding: "18px 16px", cursor: "pointer", textAlign: "left" }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Start your list in Inpatients</div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>
              Add hospital consults, tag the learning issues, and Today will start surfacing the right prep automatically.
            </div>
          </button>
        )}
      </section>

      <section style={{ background: T.card, borderRadius: 18, border: `1px solid ${T.line}`, padding: "16px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, color: T.text, fontFamily: T.serif, fontSize: 18, fontWeight: 700 }}>Competency preview</h2>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 3 }}>The same bounded mastery model now powers both Today and Me.</div>
          </div>
          <button
            onClick={() => navigate("me")}
            style={{ background: "none", border: "none", color: T.med, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0 }}
          >
            See all
            <ChevronRight size={15} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 16, alignItems: isMobile ? "flex-start" : "center" }}>
          <ProgressRing value={competencySummary.masteryPercent} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Brain size={16} strokeWidth={1.75} color={T.med} aria-hidden="true" />
              <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>
                {competencySummary.profileLine}
              </div>
            </div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.6, marginBottom: 10 }}>
              {competencySummary.masteryDetail}. The strongest domain right now is {competencySummary.topDomain.label.toLowerCase()}, and Me now shows exactly which signals are lagging.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span style={{ background: T.yellowBg, color: T.goldText, borderRadius: 999, padding: "5px 9px", fontSize: 13, fontWeight: 700 }}>
                {level.icon} {level.name}
              </span>
              <span style={{ background: T.card, color: T.navy, borderRadius: 999, padding: "5px 9px", fontSize: 13, fontWeight: 700, border: `1px solid ${T.line}` }}>
                {gamification.points} pts
              </span>
              <span style={{ background: T.ice, color: T.navy, borderRadius: 999, padding: "5px 9px", fontSize: 13, fontWeight: 700 }}>
                Mastery {competencySummary.masteryPercent}%
              </span>
              <span style={{ background: T.greenBg, color: T.greenDk, borderRadius: 999, padding: "5px 9px", fontSize: 13, fontWeight: 700 }}>
                Proficient {competencySummary.proficientCount}
              </span>
              <span style={{ background: competencySummary.developingCount > 0 ? T.yellowBg : T.blueBg, color: competencySummary.developingCount > 0 ? T.warn : T.med, borderRadius: 999, padding: "5px 9px", fontSize: 13, fontWeight: 700 }}>
                Developing {competencySummary.developingCount}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: todayReflection ? T.greenBg : T.card, borderRadius: 18, border: `1px solid ${todayReflection ? T.greenAlpha : T.line}`, padding: "16px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <ClipboardList size={16} strokeWidth={1.75} color={todayReflection ? T.greenDk : T.med} aria-hidden="true" />
              <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>
                End-of-day reflection
              </div>
            </div>
            <h2 style={{ margin: 0, color: T.navy, fontFamily: T.serif, fontSize: 20, fontWeight: 700 }}>
              {todayReflection ? "Today's reflection is saved" : "Close the loop in 30 seconds"}
            </h2>
            <p style={{ margin: "6px 0 0", color: T.sub, fontSize: 13, lineHeight: 1.55, maxWidth: 560 }}>
              {todayReflection
                ? "Your attending can already see this in the dashboard, and tomorrow's review queue will pull from it."
                : "A quick reflection helps surface tomorrow's teaching targets and seeds the right spaced-repetition cards."}
            </p>
          </div>
          {todayReflection && (
            <div style={{ background: T.card, color: T.greenDk, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 700, border: `1px solid ${T.greenAlpha}` }}>
              Submitted
            </div>
          )}
        </div>

        {todayReflection ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: todayReflection.topics.length > 0 || todayReflection.seededQuestionKeys.length > 0 ? 12 : 0 }}>
              <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.line}`, padding: "12px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
                  What you saw
                </div>
                <div style={{ fontSize: 14, color: T.text, lineHeight: 1.6 }}>
                  {todayReflection.saw || "Not entered today."}
                </div>
              </div>
              <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.line}`, padding: "12px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
                  What still feels unclear
                </div>
                <div style={{ fontSize: 14, color: T.text, lineHeight: 1.6 }}>
                  {todayReflection.unclear || "Nothing specific flagged today."}
                </div>
              </div>
            </div>

            {(todayReflection.topics.length > 0 || todayReflection.seededQuestionKeys.length > 0) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {todayReflection.topics.map((topic) => (
                  <span key={topic} style={{ background: T.card, color: T.navy, borderRadius: 999, padding: "5px 9px", fontSize: 13, fontWeight: 700, border: `1px solid ${T.line}` }}>
                    {topic}
                  </span>
                ))}
                {todayReflection.seededQuestionKeys.length > 0 && (
                  <span style={{ background: T.card, color: T.med, borderRadius: 999, padding: "5px 9px", fontSize: 13, fontWeight: 700, border: `1px solid ${T.line}` }}>
                    {todayReflection.seededQuestionKeys.length} review card{todayReflection.seededQuestionKeys.length !== 1 ? "s" : ""} added for tomorrow
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
                  What did you see today?
                </label>
                <textarea
                  value={reflectionSaw}
                  onChange={(event) => { setReflectionSaw(event.target.value); setReflectionError(""); }}
                  placeholder="One or two patients, topics, or decisions that stood out."
                  rows={3}
                  style={{ width: "100%", boxSizing: "border-box", resize: "vertical", borderRadius: 14, border: `1px solid ${T.line}`, background: T.card, padding: "12px 14px", fontSize: 14, fontFamily: T.sans, color: T.text, outline: "none", lineHeight: 1.5 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
                  What didn't click yet?
                </label>
                <textarea
                  value={reflectionUnclear}
                  onChange={(event) => { setReflectionUnclear(event.target.value); setReflectionError(""); }}
                  placeholder="What still feels fuzzy, easy to mix up, or worth revisiting tomorrow?"
                  rows={3}
                  style={{ width: "100%", boxSizing: "border-box", resize: "vertical", borderRadius: 14, border: `1px solid ${T.line}`, background: T.card, padding: "12px 14px", fontSize: 14, fontFamily: T.sans, color: T.text, outline: "none", lineHeight: 1.5 }}
                />
              </div>
            </div>
            {reflectionError && (
              <div style={{ fontSize: 13, color: T.accent, marginBottom: 10 }}>
                {reflectionError}
              </div>
            )}
            <button
              onClick={() => { void handleReflectionSubmit(); }}
              disabled={savingReflection}
              style={{ background: savingReflection ? T.muted : T.accent, color: "white", border: "none", borderRadius: 12, padding: "11px 16px", cursor: savingReflection ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700 }}
            >
              {savingReflection ? "Saving..." : "Save reflection"}
            </button>
          </>
        )}
      </section>

      {!pearlDismissed && (
        <section style={{ background: T.ice, borderRadius: 18, border: `1px solid ${T.pale}`, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={16} strokeWidth={1.75} color={T.med} aria-hidden="true" />
              <div style={{ fontSize: 13, fontWeight: 700, color: T.med, textTransform: "uppercase", letterSpacing: 0.9 }}>Pearl of the day</div>
            </div>
            <button
              onClick={() => {
                localStorage.setItem(PEARL_STORAGE_KEY, todayKey);
                setPearlDismissed(true);
              }}
              style={{ background: "none", border: "none", color: T.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0 }}
            >
              Dismiss
            </button>
          </div>
          <div style={{ fontSize: 14, color: T.text, lineHeight: 1.65 }}>
            {PRO_TIPS[pearlIndex]}
          </div>
        </section>
      )}

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
          <h2 style={{ margin: 0, color: T.text, fontFamily: T.serif, fontSize: 18, fontWeight: 700 }}>Quick links</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          {quickLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => navigate(link.tab, link.subView)}
              style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.line}`, padding: "12px 14px", cursor: "pointer", textAlign: "left", display: "flex", gap: 10, alignItems: "center" }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 10, background: T.warmBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <BookOpen size={15} strokeWidth={1.75} color={T.warn} aria-hidden="true" />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{link.label}</div>
                <div style={{ fontSize: 13, color: T.sub, marginTop: 3 }}>{link.meta}</div>
              </div>
              <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: T.muted, flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
