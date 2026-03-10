// ═══════════════════════════════════════════════════════════════════════
//  Topic Exposure Tracker
//
//  Combines patient clinical exposure with learning activity to build
//  a per-topic view of what the student has actually encountered.
// ═══════════════════════════════════════════════════════════════════════

import { TOPICS } from "../data/constants";
import { getTopicContent } from "./topicMapping";
import type { TopicExposure } from "../types";

interface PatientInput {
  topics?: string[];
  topic?: string;
  date: string;
  status: "active" | "discharged";
}

interface CompletedItemsInput {
  articles?: Record<string, boolean>;
  studySheets?: Record<string, boolean>;
  cases?: Record<string, unknown>;
}

/**
 * Build a topic exposure summary for all topics.
 * Combines patient clinical encounters with content completion.
 */
export function getTopicExposures(
  patients: PatientInput[],
  completedItems?: CompletedItemsInput,
): TopicExposure[] {
  const completed = completedItems || {};
  const exposures: TopicExposure[] = [];

  for (const topic of TOPICS) {
    if (topic === "Other") continue;

    // Count patients with this topic
    let patientCount = 0;
    let lastSeen: string | null = null;
    for (const p of patients || []) {
      const pTopics = p.topics?.length ? p.topics : p.topic ? [p.topic] : [];
      if (pTopics.includes(topic)) {
        patientCount++;
        if (!lastSeen || p.date > lastSeen) lastSeen = p.date;
      }
    }

    // Count content completion for this topic
    const content = getTopicContent(topic);
    const totalContent = content.studySheets.length + content.articles.length + content.cases.length;
    let completedCount = 0;
    for (const s of content.studySheets) {
      if (completed.studySheets?.[s.id]) completedCount++;
    }
    for (const a of content.articles) {
      if (completed.articles?.[a.url]) completedCount++;
    }
    for (const c of content.cases) {
      if (completed.cases?.[c.id]) completedCount++;
    }

    exposures.push({
      topic,
      patientCount,
      lastSeen,
      contentCompleted: completedCount,
      contentTotal: totalContent,
    });
  }

  return exposures;
}

/**
 * Get topics that have been seen clinically but not studied,
 * or topics with available content that hasn't been completed.
 */
export function getUnstudiedTopics(exposures: TopicExposure[]): TopicExposure[] {
  return exposures.filter(
    e => e.patientCount > 0 && e.contentTotal > 0 && e.contentCompleted < e.contentTotal
  );
}

/**
 * Get topics never encountered clinically.
 */
export function getUnseenTopics(exposures: TopicExposure[]): string[] {
  return exposures.filter(e => e.patientCount === 0).map(e => e.topic);
}
