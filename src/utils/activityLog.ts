import { ARTICLES as DEFAULT_ARTICLES, ALL_LANDMARK_TRIALS, STUDY_SHEETS } from "../data/constants";
import { WEEKLY_CASES } from "../data/cases";
import { GUIDE_SECTIONS } from "../data/guides";
import { PRE_QUIZ, POST_QUIZ, WEEKLY_QUIZZES } from "../data/quizzes";
import { ROTATION_GUIDES } from "../data/rotationGuides";
import type { Bookmarks, ClinicGuideRecord, SubView } from "../types";

type ActivityDescriptor = {
  type: string;
  label: string;
  detail: string;
};

function formatCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function buildBookmarkActivityDetail(
  type: keyof Bookmarks,
  itemId: string,
  articlesByWeek: typeof DEFAULT_ARTICLES = DEFAULT_ARTICLES,
): string {
  if (type === "trials") {
    const trial = ALL_LANDMARK_TRIALS.find((item) => item.name === itemId);
    return `Trial: ${trial?.name || itemId}`;
  }

  if (type === "articles") {
    const article = Object.values(articlesByWeek).flat().find((item) => item.url === itemId);
    return `Article: ${article?.title || itemId}`;
  }

  if (type === "cases") {
    const caseItem = Object.values(WEEKLY_CASES).flat().find((item) => item.id === itemId);
    return `Case: ${caseItem?.title || itemId}`;
  }

  const sheet = Object.values(STUDY_SHEETS).flat().find((item) => item.id === itemId);
  return `Study sheet: ${sheet?.title || itemId}`;
}

export function describeStudentNavigation(
  subView: SubView,
  context: {
    articlesByWeek?: typeof DEFAULT_ARTICLES;
    clinicGuides?: ClinicGuideRecord[];
  } = {},
): ActivityDescriptor | null {
  if (!subView) return null;

  const articlesByWeek = context.articlesByWeek || DEFAULT_ARTICLES;

  switch (subView.type) {
    case "weeklyQuiz":
      return {
        type: "quiz_start",
        label: `Started Week ${subView.week} Quiz`,
        detail: formatCount((WEEKLY_QUIZZES[subView.week] || []).length, "question"),
      };
    case "reviewMissed":
      return {
        type: "review_missed",
        label: `Started Week ${subView.week} Review`,
        detail: "Missed questions",
      };
    case "preQuiz":
      return {
        type: "quiz_start",
        label: "Started Pre-Rotation Assessment",
        detail: formatCount(PRE_QUIZ.length, "question"),
      };
    case "postQuiz":
      return {
        type: "quiz_start",
        label: "Started Post-Rotation Assessment",
        detail: formatCount(POST_QUIZ.length, "question"),
      };
    case "articles":
      return {
        type: "resource_open",
        label: `Opened Week ${subView.week} Articles`,
        detail: formatCount((articlesByWeek[subView.week] || []).length, "article"),
      };
    case "studySheets":
      return {
        type: "resource_open",
        label: `Opened Week ${subView.week} Study Sheets`,
        detail: formatCount((STUDY_SHEETS[subView.week] || []).length, "sheet"),
      };
    case "cases":
      return {
        type: "resource_open",
        label: `Opened Week ${subView.week} Cases`,
        detail: formatCount((WEEKLY_CASES[subView.week] || []).length, "case"),
      };
    case "resources":
      return { type: "resource_open", label: "Opened Resources", detail: "Reference tools" };
    case "abbreviations":
      return { type: "resource_open", label: "Opened Abbreviations", detail: "Quick reference list" };
    case "faq":
      return { type: "guide_open", label: "Opened Rotation FAQ", detail: "Common questions" };
    case "bookmarks":
      return { type: "resource_open", label: "Opened Saved Items", detail: "Bookmarks" };
    case "extraPractice":
      return { type: "practice_quiz", label: "Opened Extra Practice", detail: "Practice and spaced repetition" };
    case "srReview":
      return { type: "quiz_start", label: "Started Spaced Repetition Review", detail: "Due cards" };
    case "practiceQuiz":
      return { type: "practice_quiz", label: "Started Practice Questions", detail: "15 random questions" };
    case "refDetail":
      return { type: "resource_open", label: "Opened Quick Reference", detail: subView.id };
    case "trialLibrary":
      return {
        type: "guide_open",
        label: "Opened Trial Library",
        detail: subView.searchTrial ? `Search: ${subView.searchTrial}` : formatCount(ALL_LANDMARK_TRIALS.length, "landmark trial"),
      };
    case "browseByTopic":
      return { type: "resource_open", label: "Opened Topic Browser", detail: "Browse by topic" };
    case "topicDetail":
      return { type: "resource_open", label: "Opened Topic", detail: subView.topic };
    case "clinicGuide": {
      const clinicGuide = context.clinicGuides?.find((item) => item.date === subView.date);
      return {
        type: "guide_open",
        label: "Opened Clinic Guide",
        detail: clinicGuide?.topic || subView.date,
      };
    }
    case "clinicGuideHistory":
      return { type: "guide_open", label: "Opened Clinic Guide History", detail: "Past clinic guides" };
    case "inpatientGuide":
      return { type: "guide_open", label: "Opened Inpatient Guide", detail: subView.topic };
    case "rotationGuide":
      return {
        type: "guide_open",
        label: "Opened Rotation Guide",
        detail: ROTATION_GUIDES[subView.guideId]?.title || subView.guideId,
      };
    case "guideDetail":
      return {
        type: "guide_open",
        label: "Opened Guide",
        detail: GUIDE_SECTIONS.find((section) => section.id === subView.id)?.title || subView.id,
      };
    default:
      return null;
  }
}
