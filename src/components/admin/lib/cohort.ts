import { STUDY_SHEETS, CURRICULUM_DECKS } from "../../../data/constants";
import { WEEKLY_CASES } from "../../../data/cases";
import type { AdminStudent, SharedSettings } from "../../../types";
import type { ArticlesData } from "../types";
import { formatBriefDate } from "./format";
import { findTeachingTopicMeta, topicMatchesAny } from "./exposure";
import {
  buildAdminCompetencySnapshot,
  buildAdminAssessmentSignal,
  countTopicsFromPatients,
  buildStudentStudySignals,
  getStudentServiceTopics,
  getStudentLastTouched,
} from "./student-analytics";

export type DailyBriefStudent = {
  student: AdminStudent;
  masteryPercent: number;
  studySignals: string[];
  serviceTopics: string[];
  teachNext: string;
  teachWhy: string;
  askTomorrow: string;
  lastTouched: string | null;
};

export type DailyAttendingBrief = {
  todayLabel: string;
  tomorrowLabel: string;
  recommendationTopic: string;
  recommendationReason: string;
  recommendationBridge: string | null;
  studyCoverage: Array<{ label: string; count: number }>;
  serviceCoverage: Array<{ label: string; count: number }>;
  students: DailyBriefStudent[];
};

export type TeachingPlanResource = {
  kind: "Article" | "Study sheet" | "Deck" | "Case" | "Quiz";
  title: string;
  detail: string;
};

export type TeachingPlanOption = {
  topic: string;
  rationale: string;
  targetStudents: DailyBriefStudent[];
  openingPrompt: string;
  steps: string[];
  resources: TeachingPlanResource[];
  copyText: string;
};

export function buildCohortTeachingSignals(students: AdminStudent[]) {
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

export function buildCohortCompetencyNeeds(students: AdminStudent[], settings: SharedSettings | undefined, articlesByWeek: ArticlesData) {
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

export function buildDailyAttendingBrief(students: AdminStudent[], settings: SharedSettings | undefined, articlesByWeek: ArticlesData): DailyAttendingBrief {
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

export function pickTeachingPlanResources(topic: string, targetStudents: DailyBriefStudent[], articlesByWeek: ArticlesData): TeachingPlanResource[] {
  const meta = findTeachingTopicMeta(topic);
  const weeks = meta?.weeks || [1];
  const aliases = meta?.aliases || [topic];

  const articleCandidates = weeks.flatMap((week) =>
    (articlesByWeek[week] || [])
      .filter((article) => topicMatchesAny(article.topic, aliases) || week === weeks[0])
      .map((article) => {
        const completed = targetStudents.filter((student) => student.student.completedItems?.articles?.[article.url]).length;
        return { week, title: article.title, topic: article.topic, completed, total: targetStudents.length };
      })
  );
  articleCandidates.sort((a, b) => a.completed - b.completed || a.week - b.week || a.title.localeCompare(b.title));

  const sheetCandidates = weeks.flatMap((week) =>
    (STUDY_SHEETS[week] || [])
      .filter((sheet) => (sheet.topics || []).some((sheetTopic: string) => topicMatchesAny(sheetTopic, aliases)) || week === weeks[0])
      .map((sheet) => {
        const completed = targetStudents.filter((student) => student.student.completedItems?.studySheets?.[sheet.id]).length;
        return { week, id: sheet.id, title: sheet.title, completed, total: targetStudents.length };
      })
  );
  sheetCandidates.sort((a, b) => a.completed - b.completed || a.week - b.week || a.title.localeCompare(b.title));

  const deckCandidates = CURRICULUM_DECKS
    .filter((deck) => weeks.includes(deck.week))
    .filter((deck) => (deck.topics || []).some((deckTopic: string) => topicMatchesAny(deckTopic, aliases)) || deck.week === weeks[0])
    .map((deck) => {
      const completed = targetStudents.filter((student) => student.student.completedItems?.decks?.[deck.id]).length;
      return { week: deck.week, id: deck.id, title: deck.name, completed, total: targetStudents.length };
    });
  deckCandidates.sort((a, b) => a.completed - b.completed || a.week - b.week || a.title.localeCompare(b.title));

  const caseCandidates = weeks.flatMap((week) =>
    (WEEKLY_CASES[week] || [])
      .filter((item) => (item.topics || []).some((caseTopic) => topicMatchesAny(caseTopic, aliases)) || week === weeks[0])
      .map((item) => {
        const completed = targetStudents.filter((student) => student.student.completedItems?.cases?.[item.id]).length;
        return { week, id: item.id, title: item.title, completed, total: targetStudents.length };
      })
  );
  caseCandidates.sort((a, b) => a.completed - b.completed || a.week - b.week || a.title.localeCompare(b.title));

  const quizWeek = weeks[0];
  const quizDone = targetStudents.filter((student) => ((student.student.weeklyScores || {})[quizWeek] || []).length > 0).length;

  const resources: TeachingPlanResource[] = [];
  if (articleCandidates[0]) {
    resources.push({
      kind: "Article",
      title: articleCandidates[0].title,
      detail: `Module ${articleCandidates[0].week} · ${articleCandidates[0].topic} · ${articleCandidates[0].completed}/${articleCandidates[0].total} target learners already read it`,
    });
  }
  if (sheetCandidates[0]) {
    resources.push({
      kind: "Study sheet",
      title: sheetCandidates[0].title,
      detail: `Module ${sheetCandidates[0].week} · ${sheetCandidates[0].completed}/${sheetCandidates[0].total} target learners already completed it`,
    });
  }
  if (deckCandidates[0]) {
    resources.push({
      kind: "Deck",
      title: deckCandidates[0].title,
      detail: `Module ${deckCandidates[0].week} · ${deckCandidates[0].completed}/${deckCandidates[0].total} target learners already reviewed it`,
    });
  }
  if (caseCandidates[0]) {
    resources.push({
      kind: "Case",
      title: caseCandidates[0].title,
      detail: `Module ${caseCandidates[0].week} · ${caseCandidates[0].completed}/${caseCandidates[0].total} target learners already finished it`,
    });
  }
  resources.push({
    kind: "Quiz",
    title: `Module ${quizWeek} quiz`,
    detail: `${quizDone}/${targetStudents.length} target learners have attempted this quiz`,
  });

  return resources;
}

export function buildTeachingPlanOptions(dailyBrief: DailyAttendingBrief, settings: SharedSettings | undefined, articlesByWeek: ArticlesData): TeachingPlanOption[] {
  const candidateTopics = Array.from(new Set([
    dailyBrief.recommendationTopic,
    dailyBrief.serviceCoverage[0]?.label,
    dailyBrief.students[0]?.teachNext,
    dailyBrief.students.find((student) => student.serviceTopics[0])?.serviceTopics[0],
  ].filter(Boolean) as string[]));

  return candidateTopics.map((topic) => {
    const meta = findTeachingTopicMeta(topic);
    const aliases = meta?.aliases || [topic];
    const targetStudents = dailyBrief.students
      .filter((student) =>
        topicMatchesAny(student.teachNext, aliases)
        || student.serviceTopics.some((item) => topicMatchesAny(item, aliases))
        || student.studySignals.some((item) => topicMatchesAny(item, aliases))
      )
      .sort((a, b) => a.masteryPercent - b.masteryPercent || a.student.name.localeCompare(b.student.name))
      .slice(0, 4);

    const impacted = targetStudents.length > 0 ? targetStudents : dailyBrief.students.slice(0, 3);
    const resources = pickTeachingPlanResources(topic, impacted, articlesByWeek);
    const serviceAnchor = dailyBrief.serviceCoverage.find((item) => topicMatchesAny(item.label, aliases)) || dailyBrief.serviceCoverage[0] || null;
    const openingPrompt = impacted[0]?.askTomorrow || `Open with a quick case discussion on ${topic}.`;
    const rationaleParts = [
      `${impacted.length} learner${impacted.length !== 1 ? "s" : ""} are strong targets for this topic`,
      serviceAnchor ? `${serviceAnchor.count} active patient${serviceAnchor.count !== 1 ? "s are" : " is"} touching ${serviceAnchor.label}` : null,
      settings?.attendingName ? `Built for ${settings.attendingName}'s next teaching touchpoint` : null,
    ].filter(Boolean) as string[];
    const steps = [
      `Open: ${openingPrompt}`,
      ...(meta?.steps || [
        "Teach the core framework, the next best step, and the common pitfall.",
        "Anchor the concept to one current patient before closing.",
        "Assign one short follow-up resource so the loop continues after rounds.",
      ]),
    ].slice(0, 3);
    const resourceLine = resources.map((resource) => `${resource.kind}: ${resource.title}`).join(" | ");
    const copyText = [
      `Tomorrow teaching plan: ${topic}`,
      `Why this topic: ${rationaleParts.join(" · ")}`,
      `Target learners: ${impacted.map((student) => student.student.name).join(", ")}`,
      "5-minute flow:",
      ...steps.map((step, index) => `${index + 1}. ${step}`),
      "Follow-up:",
      ...resources.map((resource) => `- ${resource.kind}: ${resource.title} (${resource.detail})`),
      `Suggested assignment line: Review ${resourceLine}.`,
    ].join("\n");

    return {
      topic,
      rationale: rationaleParts.join(" · "),
      targetStudents: impacted,
      openingPrompt,
      steps,
      resources,
      copyText,
    };
  });
}
