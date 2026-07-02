import { ARTICLES, CURRICULUM_DECKS } from "../../../data/constants";
import { WEEKLY_QUIZZES } from "../../../data/quizzes";
import { WEEKLY_CASES } from "../../../data/cases";
import { getCurrentOrNextFriday } from "../../../utils/clinicRotation";
import type { CompletedItems, QuizScore, SubView, WeeklyScores } from "../../../types";
import type { StudySheetsData } from "../../../utils/studySheets";
import type { HeroCard, LearningPlan, NavAction, StartChecklistItem } from "./types";

export function makeAction(label: string, meta: string, tab: string, subView?: SubView): NavAction {
  return { label, meta, tab, subView };
}

export function buildLearningPlan({
  currentWeek,
  totalWeeks,
  rotationEnded,
  articles,
  studySheets,
  completedItems,
  weeklyScores,
}: {
  currentWeek: number | null;
  totalWeeks: number;
  rotationEnded: boolean;
  articles: typeof ARTICLES;
  studySheets: StudySheetsData;
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
    const weekSheets = studySheets[week] || [];
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

export function buildStartChecklist({
  displayWeek,
  studySheets,
  completedItems,
  weeklyScores,
}: {
  displayWeek: number;
  studySheets: StudySheetsData;
  completedItems: CompletedItems;
  weeklyScores: WeeklyScores;
}): StartChecklistItem[] {
  const weekSheets = studySheets[displayWeek] || [];
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

export function buildHeroCard({
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
    meta: `CKD, DKD, LN, HTN, Transplant · ${friday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
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
  const learningActionIsModuleQuiz = learningPlan.nextAction.subView?.type === "weeklyQuiz";
  const roundsSecondaryAction = hasConsultSuggestions
    ? suggestedAction
    : learningActionIsModuleQuiz
      ? null
      : learningPlan.nextAction;

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
      body: "Use the CKD, DKD, lupus nephritis, hypertension, and transplant clinic guides as separate outpatient teaching tracks, then tighten one more core module item before clinic.",
      tone: "clinic",
      badge: friday.toLocaleDateString("en-US", { weekday: "short" }),
      actions: roundsSecondaryAction ? [clinicAction, roundsSecondaryAction] : [clinicAction],
    };
  }

  if (weekday === 3) {
    return {
      eyebrow: "Next up",
      title: "Rounds",
      body: "Use today to start with your consult list and the topics your patients are raising.",
      tone: "rounds",
      badge: "Rounds",
      actions: roundsSecondaryAction ? [patientsAction, roundsSecondaryAction] : [patientsAction],
    };
  }

  // Default Morning rounds: pair the consult list with the consult-driven
  // "Suggested" entry point. If the next core item is the module quiz, skip it
  // here because the core-path card immediately below already owns that CTA.
  return {
    eyebrow: "Next up",
    title: activePatientCount > 0 ? "Morning rounds" : "Build your rounding list",
    body: activePatientCount > 0
      ? "Start with your active consults, then dig into the topics they raise."
      : "No consults logged yet. Add some first so Today can start tailoring the right prep.",
    tone: "rounds",
    badge: "Rounds",
    actions: roundsSecondaryAction ? [patientsAction, roundsSecondaryAction] : [patientsAction],
  };
}
