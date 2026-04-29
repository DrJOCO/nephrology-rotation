import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Download,
  Megaphone,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { T, WEEKLY, ARTICLES, STUDY_SHEETS, CURRICULUM_DECKS } from "../../data/constants";
import { WEEKLY_QUIZZES } from "../../data/quizzes";
import { WEEKLY_CASES } from "../../data/cases";
import { PRO_TIPS } from "./shared";
import { getCurrentOrNextFriday } from "../../utils/clinicRotation";
import { useIsMobile } from "../../utils/helpers";
import { getLevel } from "../../utils/gamification";
import { getPatientSuggestedTopicGroups } from "../../utils/patientRecommendations";
import type {
  Announcement,
  Bookmarks,
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
  competencySummary: CompetencySummary;
  gamification: Gamification;
  reflections: ReflectionEntry[];
  onSubmitReflection: (payload: { saw: string; unclear: string }) => Promise<ReflectionEntry | null>;
  installPromptVariant: "native" | "ios" | null;
  onInstallApp: () => Promise<void>;
  onDismissInstallPrompt: () => void;
  onCompleteConsultTopic: (payload: { topic: string; sheetIds: string[]; trialNames: string[] }) => void;
}

interface NavAction {
  label: string;
  meta: string;
  tab: string;
  subView?: SubView;
  /** Optional override — when set, the hero button calls this instead of navigating. */
  onClick?: () => void;
}

interface LearningPlan {
  label: string;
  detail: string;
  detailParts: string[];
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

interface StartChecklistItem {
  label: string;
  meta: string;
  done: boolean;
  action?: NavAction;
  scrollTargetId?: string;
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

function PearlToast({ tip, onDismiss }: { tip: string; onDismiss: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <section style={{ background: T.ice, borderRadius: 12, border: `1px solid ${T.pale}`, padding: "8px 12px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
      <Sparkles size={14} strokeWidth={1.75} color={T.brand} aria-hidden="true" style={{ flexShrink: 0 }} />
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: T.text, fontSize: 13, fontFamily: "inherit", display: "flex", flexDirection: "column", gap: 2 }}
      >
        <span style={{ fontWeight: 700, color: T.brand, textTransform: "uppercase", letterSpacing: 0.7, fontSize: 11 }}>
          Pearl {open ? "▾" : "▸"}
        </span>
        {open
          ? <span style={{ lineHeight: 1.55 }}>{tip}</span>
          : <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: T.sub }}>{tip}</span>}
      </button>
      <button
        onClick={onDismiss}
        aria-label="Dismiss pearl"
        style={{ background: "none", border: "none", color: T.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "4px 6px", flexShrink: 0 }}
      >
        Dismiss
      </button>
    </section>
  );
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
  let decksTotal = 0;
  let decksDone = 0;
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
    const weekDecks = CURRICULUM_DECKS.filter((deck) => deck.week === week);
    const weekArticles = articles[week] || [];
    const weekCases = WEEKLY_CASES[week] || [];
    const quizAvailable = (WEEKLY_QUIZZES[week] || []).length > 0;

    const weekSheetsDone = weekSheets.filter((sheet) => completedItems.studySheets?.[sheet.id]).length;
    const weekDecksDone = weekDecks.filter((deck) => completedItems.decks?.[deck.id]).length;
    const weekArticlesDone = weekArticles.filter((article) => completedItems.articles?.[article.url]).length;
    const weekCasesDone = weekCases.filter((item) => completedItems.cases?.[item.id]).length;
    const weekQuizTaken = (weeklyScores[week] || []).length > 0;

    sheetsTotal += weekSheets.length;
    sheetsDone += weekSheetsDone;
    decksTotal += weekDecks.length;
    decksDone += weekDecksDone;
    casesTotal += weekCases.length;
    casesDone += weekCasesDone;
    optionalReferencesTotal += weekArticles.length;
    optionalReferencesDone += weekArticlesDone;
    if (quizAvailable) quizzesTotal += 1;
    if (weekQuizTaken) quizzesDone += 1;

    if (!nextAction && weekSheetsDone < weekSheets.length) {
      nextAction = {
        label: `Open Module ${week} study sheets`,
        meta: `${weekSheets.length - weekSheetsDone} still to review`,
        tab: "today",
        subView: { type: "studySheets", week },
      };
      continue;
    }
    if (!nextAction && weekDecksDone < weekDecks.length) {
      nextAction = {
        label: `Review Module ${week} teaching decks`,
        meta: `${weekDecks.length - weekDecksDone} deck${weekDecks.length - weekDecksDone !== 1 ? "s" : ""} to review`,
        tab: "today",
        subView: { type: "resources", tab: "decks", week },
      };
      continue;
    }
    if (!nextAction && weekCasesDone < weekCases.length) {
      nextAction = {
        label: `Work Module ${week} cases`,
        meta: `${weekCases.length - weekCasesDone} case${weekCases.length - weekCasesDone !== 1 ? "s" : ""} pending`,
        tab: "today",
        subView: { type: "cases", week },
      };
      continue;
    }
    if (!nextAction && quizAvailable && !weekQuizTaken) {
      nextAction = {
        label: `Take Module ${week} quiz`,
        meta: `${(WEEKLY_QUIZZES[week] || []).length} questions`,
        tab: "today",
        subView: { type: "weeklyQuiz", week },
      };
    }

    if (!optionalReferenceAction && weekArticlesDone < weekArticles.length) {
      optionalReferenceAction = {
        label: `Browse Module ${week} references`,
        meta: `${weekArticles.length - weekArticlesDone} optional reference${weekArticles.length - weekArticlesDone !== 1 ? "s" : ""} available`,
        tab: "today",
        subView: { type: "articles", week },
      };
    }
  }

  const total = sheetsTotal + decksTotal + casesTotal + quizzesTotal;
  const done = sheetsDone + decksDone + casesDone + quizzesDone;
  const remaining = Math.max(total - done, 0);
  const optionalRemaining = Math.max(optionalReferencesTotal - optionalReferencesDone, 0);
  const detailParts: string[] = [];
  if (sheetsTotal - sheetsDone > 0) detailParts.push(`${sheetsTotal - sheetsDone} sheet${sheetsTotal - sheetsDone !== 1 ? "s" : ""}`);
  if (decksTotal - decksDone > 0) detailParts.push(`${decksTotal - decksDone} deck${decksTotal - decksDone !== 1 ? "s" : ""}`);
  if (casesTotal - casesDone > 0) detailParts.push(`${casesTotal - casesDone} case${casesTotal - casesDone !== 1 ? "s" : ""}`);
  if (quizzesTotal - quizzesDone > 0) detailParts.push(`${quizzesTotal - quizzesDone} quiz`);

  return {
    label: currentWeek ? `Core module ${currentWeek}` : rotationEnded ? "Rotation wrap-up" : "Getting started",
    detail: remaining > 0
      ? detailParts.join(" · ")
      : optionalRemaining > 0
        ? `Core work complete · ${optionalRemaining} optional reference${optionalRemaining !== 1 ? "s" : ""} available`
        : "All core work complete",
    detailParts: remaining > 0
      ? detailParts
      : optionalRemaining > 0
        ? [`${optionalRemaining} optional reference${optionalRemaining !== 1 ? "s" : ""}`]
        : [],
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

function buildStartChecklist({
  displayWeek,
  completedItems,
  weeklyScores,
}: {
  displayWeek: number;
  completedItems: CompletedItems;
  weeklyScores: WeeklyScores;
}): StartChecklistItem[] {
  const weekSheets = STUDY_SHEETS[displayWeek] || [];
  const sheetsDone = weekSheets.filter((sheet) => completedItems.studySheets?.[sheet.id]).length;
  const weekDecks = CURRICULUM_DECKS.filter((deck) => deck.week === displayWeek);
  const decksDone = weekDecks.filter((deck) => completedItems.decks?.[deck.id]).length;
  const weekCases = WEEKLY_CASES[displayWeek] || [];
  const casesDone = weekCases.filter((item) => completedItems.cases?.[item.id]).length;
  const weekQuizAvailable = (WEEKLY_QUIZZES[displayWeek] || []).length > 0;
  const weekQuizDone = (weeklyScores[displayWeek] || []).length > 0;

  return [
    {
      label: `Read Module ${displayWeek} study sheets`,
      meta: weekSheets.length > 0 ? `${sheetsDone}/${weekSheets.length} complete` : "No study sheets assigned for this module",
      done: weekSheets.length === 0 || sheetsDone === weekSheets.length,
      action: { label: "Open study sheets", meta: "Core summary guides", tab: "today", subView: { type: "studySheets", week: displayWeek } },
    },
    {
      label: `Review Module ${displayWeek} teaching decks`,
      meta: weekDecks.length > 0 ? `${decksDone}/${weekDecks.length} reviewed` : "No decks assigned for this module",
      done: weekDecks.length === 0 || decksDone === weekDecks.length,
      action: { label: "Open teaching decks", meta: "Core attending slides", tab: "today", subView: { type: "resources", tab: "decks", week: displayWeek } },
    },
    {
      label: `Work Module ${displayWeek} cases`,
      meta: weekCases.length > 0 ? `${casesDone}/${weekCases.length} complete` : "No cases assigned for this module",
      done: weekCases.length === 0 || casesDone === weekCases.length,
      action: { label: "Open cases", meta: "Clinical reasoning practice", tab: "today", subView: { type: "cases", week: displayWeek } },
    },
    {
      label: `Take the Module ${displayWeek} quiz`,
      meta: weekQuizAvailable ? (weekQuizDone ? "Quiz attempt saved" : `${(WEEKLY_QUIZZES[displayWeek] || []).length} questions`) : "No quiz assigned for this module",
      done: !weekQuizAvailable || weekQuizDone,
      action: { label: "Open quiz", meta: "Module knowledge check", tab: "today", subView: { type: "weeklyQuiz", week: displayWeek } },
    },
  ];
}

function buildHeroCard({
  now,
  currentWeek,
  rotationEnded,
  learningPlan,
  activePatientCount,
  postScore,
  suggestedTopicCount,
  onOpenSuggested,
  suggestedExpanded,
}: {
  now: Date;
  currentWeek: number | null;
  rotationEnded: boolean;
  learningPlan: LearningPlan;
  activePatientCount: number;
  postScore: QuizScore | null;
  suggestedTopicCount: number;
  onOpenSuggested: () => void;
  suggestedExpanded: boolean;
}): HeroCard {
  const friday = getCurrentOrNextFriday(now);
  const weekday = now.getDay();
  const clinicAction: NavAction = {
    label: "Open clinic guides",
    meta: `CKD, HTN, Transplant · ${friday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    tab: "library",
  };
  const patientsAction: NavAction = {
    label: activePatientCount > 0 ? "Open consult list" : "Add your first consult",
    meta: activePatientCount > 0
      ? `${activePatientCount} active consult${activePatientCount !== 1 ? "s" : ""}`
      : "Start your rounding list",
    tab: "patients",
  };
  const hasConsultSuggestions = activePatientCount > 0 && suggestedTopicCount > 0;
  const suggestedAction: NavAction = {
    label: suggestedExpanded ? "Hide suggestions" : "Suggested from your consults",
    meta: suggestedTopicCount > 0
      ? `${suggestedTopicCount} topic${suggestedTopicCount !== 1 ? "s" : ""} from your active consults`
      : "Sheets and trials matched to your consults",
    tab: "today",
    onClick: onOpenSuggested,
  };
  const suggestedOrLearningAction = hasConsultSuggestions ? suggestedAction : learningPlan.nextAction;

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
      title: weekday === 5 ? "Clinic day" : "Clinic prep",
      body: "Use the CKD, hypertension, and transplant clinic guides as separate outpatient teaching tracks, then tighten one more core module item before clinic.",
      tone: "clinic",
      badge: friday.toLocaleDateString("en-US", { weekday: "short" }),
      actions: [clinicAction, suggestedOrLearningAction],
    };
  }

  if (weekday === 3) {
    return {
      eyebrow: "Next up",
      title: "Rounds",
      body: "Use today to sharpen one high-yield idea before rounds.",
      tone: "rounds",
      badge: "Rounds",
      actions: [learningPlan.nextAction, hasConsultSuggestions ? suggestedAction : patientsAction],
    };
  }

  // Default Morning rounds: pair the consult list with the consult-driven
  // "Suggested" entry point. Falls back to the learning plan's next action
  // when there are no consults yet (so the second slot stays useful).
  return {
    eyebrow: "Next up",
    title: activePatientCount > 0 ? "Morning rounds" : "Build your rounding list",
    body: activePatientCount > 0
      ? "Start with your active consults, then dig into the topics they raise."
      : "No consults logged yet. Add some first so Today can start tailoring the right prep.",
    tone: "rounds",
    badge: "Rounds",
    actions: [
      patientsAction,
      suggestedOrLearningAction,
    ],
  };
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
  competencySummary,
  gamification,
  reflections,
  onSubmitReflection,
  installPromptVariant,
  onInstallApp,
  onDismissInstallPrompt,
  onCompleteConsultTopic,
}: HomeTabProps) {
  const isMobile = useIsMobile();
  const level = getLevel(gamification?.points || 0);
  const now = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(now), [now]);
  const [pearlDismissed, setPearlDismissed] = useState(false);

  useEffect(() => {
    setPearlDismissed(localStorage.getItem(PEARL_STORAGE_KEY) === todayKey);
  }, [todayKey]);

  const activePatients = useMemo(
    () => (patients || [])
      .filter((patient) => patient.status === "active")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, isMobile ? 3 : 4),
    [isMobile, patients],
  );
  const patientSuggestedGroups = useMemo(
    () => getPatientSuggestedTopicGroups(patients || [], completedItems),
    [completedItems, patients],
  );
  const [suggestedExpanded, setSuggestedExpanded] = useState(false);
  const [selectedTopicIdx, setSelectedTopicIdx] = useState(0);
  // Reset the active topic if the underlying group set changes (new consult, etc.).
  useEffect(() => { setSelectedTopicIdx(0); }, [patientSuggestedGroups.length]);
  const toggleSuggested = () => setSuggestedExpanded(v => !v);

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
      postScore,
      suggestedTopicCount: patientSuggestedGroups.length,
      onOpenSuggested: toggleSuggested,
      suggestedExpanded,
    }),
    [activePatients.length, currentWeek, learningPlan, now, postScore, rotationEnded, patientSuggestedGroups.length, suggestedExpanded],
  );

  const pearlIndex = useMemo(() => getPearlIndex(now), [now]);
  const displayWeek = currentWeek || 1;
  const startChecklist = useMemo(
    () => buildStartChecklist({ displayWeek, completedItems, weeklyScores }),
    [completedItems, displayWeek, weeklyScores],
  );
  const headerKicker = currentWeek ? `Module ${currentWeek} · ${now.toLocaleDateString("en-US", { weekday: "short" })}` : rotationEnded ? `Rotation complete · ${now.toLocaleDateString("en-US", { weekday: "short" })}` : `Getting started · ${now.toLocaleDateString("en-US", { weekday: "short" })}`;
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

  // Hero tones reduced from 4 to 2 (PR 2, option B): rounds-day vs clinic-day.
  // didactic/wrap fold into the rounds-day style; clinic gets the only distinct tone.
  const heroToneStyles: Record<HeroCard["tone"], { background: string; border: string; badge: string }> = {
    rounds:   { background: T.card, border: T.brand,   badge: T.brand },
    didactic: { background: T.card, border: T.brand,   badge: T.brand },
    clinic:   { background: T.card, border: T.success, badge: T.success },
    wrap:     { background: T.card, border: T.brand,   badge: T.brand },
  };
  const heroStyle = heroToneStyles[heroCard.tone];
  const startChecklistDone = startChecklist.filter((item) => item.done).length;

  const handleStartChecklistClick = (item: StartChecklistItem) => {
    if (item.scrollTargetId) {
      document.getElementById(item.scrollTargetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (item.action) {
      navigate(item.action.tab, item.action.subView);
    }
  };

  const handleCompleteSuggestedTopic = (group: (typeof patientSuggestedGroups)[number]) => {
    onCompleteConsultTopic({
      topic: group.topic,
      sheetIds: group.sheets.map(sheet => sheet.id),
      trialNames: group.trials.map(trial => trial.name),
    });
    setSelectedTopicIdx(0);
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
            <div style={{ background: T.warningBg, color: T.warning, border: `1px solid ${T.warning}`, borderRadius: 999, padding: "7px 12px", fontSize: 13, fontWeight: 700 }}>
              Offline
            </div>
          )}
        </div>
      </div>

      <div style={{ background: heroStyle.background, borderRadius: 20, padding: 18, border: `1.5px solid ${heroStyle.border}`, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
          <div>
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
              onClick={() => action.onClick ? action.onClick() : navigate(action.tab, action.subView)}
              style={{
                width: "100%",
                background: index === 0 ? T.brand : T.card,
                color: index === 0 ? T.brandInk : T.navy,
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

        {suggestedExpanded && patientSuggestedGroups.length > 0 && (() => {
          const safeIdx = Math.min(selectedTopicIdx, patientSuggestedGroups.length - 1);
          const active = patientSuggestedGroups[safeIdx];
          return (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
              {/* Topic tabs */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }} aria-label="Consult topics">
                {patientSuggestedGroups.map((group, idx) => {
                  const sel = idx === safeIdx;
                  return (
                    <button
                      key={group.topic}
                      aria-pressed={sel}
                      onClick={() => setSelectedTopicIdx(idx)}
                      style={{
                        background: sel ? T.brand : "transparent",
                        color: sel ? T.brandInk : T.text,
                        border: `1px solid ${sel ? T.brand : T.line}`,
                        borderRadius: 999,
                        padding: "6px 12px",
                        fontSize: 13,
                        fontWeight: sel ? 700 : 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {group.topic}
                    </button>
                  );
                })}
              </div>

              {/* Active topic content */}
              <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12, color: T.muted }}>{active.reason}</div>
                  <button
                    onClick={() => handleCompleteSuggestedTopic(active)}
                    title="Dismiss this consult topic"
                    style={{
                      background: T.successBg,
                      color: T.success,
                      border: `1px solid ${T.success}`,
                      borderRadius: 999,
                      padding: "6px 10px",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Check size={13} strokeWidth={2.4} aria-hidden="true" /> Done
                  </button>
                </div>
                {active.sheets.length > 0 && (
                  <div style={{ marginBottom: active.trials.length > 0 ? 12 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Study sheets</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {active.sheets.map(s => (
                        <button
                          key={s.id}
                          onClick={() => navigate("today", { type: "studySheets", week: s.week })}
                          style={{ background: "none", border: "none", padding: "6px 0", cursor: "pointer", textAlign: "left", color: T.brand, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
                        >
                          <ArrowRight size={13} strokeWidth={2} aria-hidden="true" /> {s.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {active.trials.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Landmark trials</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {active.trials.map(t => (
                        <button
                          key={t.name}
                          onClick={() => navigate("today", { type: "trials", week: t.week })}
                          style={{ background: "none", border: "none", padding: "6px 0", cursor: "pointer", textAlign: "left", color: T.brand, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "flex-start", gap: 6 }}
                        >
                          <ArrowRight size={13} strokeWidth={2} aria-hidden="true" style={{ marginTop: 4, flexShrink: 0 }} />
                          <span><span style={{ fontWeight: 700 }}>{t.name}</span> <span style={{ color: T.sub, fontWeight: 400 }}>— {t.takeaway}</span></span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {(() => {
        const remaining = startChecklist.length - startChecklistDone;
        const allDone = remaining === 0;
        // Slim mode kicks in when "mostly done" — at most 1 item left. Renders a
        // single line + Continue CTA instead of the full 4-card grid, which gets
        // visually heavy once most boxes are checked.
        const slim = startChecklist.length > 0 && remaining <= 1;
        const nextItem = startChecklist.find(item => !item.done);
        const moduleLabel = currentWeek ? `Module ${currentWeek}` : "Core path";

        if (slim) {
          return (
            <section style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.line}`, padding: "14px 14px", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 999, background: allDone ? T.success : T.brandBg, color: allDone ? T.successInk : T.brand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                  {allDone ? "✓" : remaining}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.navy, lineHeight: 1.3 }}>
                    {allDone ? `${moduleLabel} · all done` : `${moduleLabel} · 1 left`}
                  </div>
                  {nextItem && (
                    <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.4, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nextItem.label}</div>
                  )}
                </div>
              </div>
              {nextItem && (
                <button
                  onClick={() => handleStartChecklistClick(nextItem)}
                  style={{ marginTop: 10, width: "100%", background: T.brand, color: T.brandInk, border: "none", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  Continue <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                </button>
              )}
            </section>
          );
        }

        return (
          <section style={{ background: T.card, borderRadius: 18, border: `1px solid ${T.line}`, padding: "16px 16px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, color: T.navy, fontFamily: T.serif, fontSize: 20, fontWeight: 700 }}>
                  Core path for this module
                </h2>
                <p style={{ margin: "6px 0 0", color: T.sub, fontSize: 13, lineHeight: 1.55, maxWidth: 600 }}>
                  Study sheets, decks, cases, and quiz. Follow your consults first if they point you elsewhere today.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <div style={{ background: T.brandBg, color: T.brand, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 700 }}>
                  {startChecklistDone}/{startChecklist.length} done
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {startChecklist.map((item, index) => (
                <button
                  key={item.label}
                  onClick={() => handleStartChecklistClick(item)}
                  style={{
                    background: item.done ? T.successBg : T.warmBg,
                    border: `1px solid ${item.done ? T.success : T.line}`,
                    borderRadius: 14,
                    padding: "12px 12px",
                    cursor: "pointer",
                    textAlign: "left",
                    minHeight: 118,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 999, background: item.done ? T.success : T.card, color: item.done ? T.successInk : T.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, border: `1px solid ${item.done ? T.success : T.line}` }}>
                      {item.done ? "✓" : index + 1}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: item.done ? T.success : T.brand, textTransform: "uppercase", letterSpacing: 0.6 }}>
                      {item.done ? "Done" : "Start"}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.navy, lineHeight: 1.25, marginBottom: 6 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.45 }}>
                    {item.meta}
                  </div>
                </button>
              ))}
            </div>
          </section>
        );
      })()}

      {latestAnnouncement && (
        <div style={{ background: T.card, borderRadius: 16, padding: "12px 14px", border: `1px solid ${T.line}`, display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: T.brandBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Megaphone size={18} strokeWidth={1.75} color={T.brand} aria-hidden="true" />
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
          <div style={{ background: T.card, borderRadius: 18, padding: 16, border: `1px solid ${T.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: T.card, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Download size={18} strokeWidth={1.75} color={T.brand} aria-hidden="true" />
                </div>
                <div>
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
                  style={{ background: T.brand, color: T.brandInk, border: "none", borderRadius: 12, padding: "10px 14px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}
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
        <h2 style={{ margin: "0 0 10px", color: T.text, fontFamily: T.serif, fontSize: 18, fontWeight: 700 }}>Quick review</h2>
        <button
          onClick={() => navigate(srAction.tab, srAction.subView)}
          style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.line}`, padding: "14px 14px", cursor: "pointer", textAlign: "left", display: "flex", gap: 12, alignItems: "flex-start", width: "100%" }}
        >
          <div style={{ width: 38, height: 38, borderRadius: 12, background: T.warningBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <RefreshCw size={18} strokeWidth={1.75} color={T.warning} aria-hidden="true" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{srAction.label}</div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginTop: 3 }}>{srAction.meta}</div>
          </div>
        </button>
      </section>

      {!pearlDismissed && (
        <PearlToast
          tip={PRO_TIPS[pearlIndex]}
          onDismiss={() => {
            localStorage.setItem(PEARL_STORAGE_KEY, todayKey);
            setPearlDismissed(true);
          }}
        />
      )}

    </div>
  );
}
