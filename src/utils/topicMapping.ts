// ═══════════════════════════════════════════════════════════════════════
//  Topic-to-Content Mapping Layer
//
//  Builds an index from nephrology topics to all associated content
//  across weeks, enabling topic-based lookup independent of week.
// ═══════════════════════════════════════════════════════════════════════

import { ARTICLES, STUDY_SHEETS, TOPIC_RESOURCE_MAP } from "../data/constants";
import { WEEKLY_CASES } from "../data/cases";
import type { TopicContentIndex } from "../types";

/** Build a full content index for a single topic, scanning all weeks. */
export function getTopicContent(topic: string): TopicContentIndex {
  const result: TopicContentIndex = {
    studySheets: [],
    articles: [],
    cases: [],
    quizWeeks: [],
  };

  for (const weekStr of Object.keys(STUDY_SHEETS)) {
    const week = Number(weekStr);
    for (const sheet of STUDY_SHEETS[week] || []) {
      if (sheet.topics?.includes(topic)) {
        result.studySheets.push({ week, id: sheet.id });
      }
    }
  }

  for (const weekStr of Object.keys(ARTICLES)) {
    const week = Number(weekStr);
    for (const article of ARTICLES[week] || []) {
      if (article.topic === topic) {
        result.articles.push({ week, url: article.url });
      }
    }
  }

  for (const weekStr of Object.keys(WEEKLY_CASES)) {
    const week = Number(weekStr);
    for (const c of WEEKLY_CASES[week] || []) {
      if (c.topics?.includes(topic)) {
        result.cases.push({ week, id: c.id });
      }
    }
  }

  // Quiz weeks from the static resource map (covers topics without explicit content tags)
  const resourceEntry = TOPIC_RESOURCE_MAP[topic];
  if (resourceEntry) {
    result.quizWeeks = [...resourceEntry.quizWeeks];
  }

  return result;
}

/** Build content indices for multiple topics at once. */
export function getTopicContentBatch(topics: string[]): Record<string, TopicContentIndex> {
  const result: Record<string, TopicContentIndex> = {};
  for (const topic of topics) {
    result[topic] = getTopicContent(topic);
  }
  return result;
}

/** Check whether a topic has any associated content. */
export function topicHasContent(topic: string): boolean {
  const content = getTopicContent(topic);
  return (
    content.studySheets.length > 0 ||
    content.articles.length > 0 ||
    content.cases.length > 0 ||
    content.quizWeeks.length > 0
  );
}
