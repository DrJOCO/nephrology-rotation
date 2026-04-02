import { getLevel } from "./gamification";
import type { Patient, TeamSnapshot } from "../types";

interface BuildTeamSnapshotInput {
  studentId: string;
  name: string;
  patients?: Patient[];
  points: number;
  updatedAt?: string;
}

export function buildTeamSnapshot({
  studentId,
  name,
  patients = [],
  points,
  updatedAt = new Date().toISOString(),
}: BuildTeamSnapshotInput): TeamSnapshot {
  const topicCounts: Record<string, number> = {};
  let activePatientCount = 0;
  let dischargedPatientCount = 0;

  for (const patient of patients) {
    if (patient.status === "active") activePatientCount += 1;
    else dischargedPatientCount += 1;

    const topics = patient.topics?.length ? patient.topics : patient.topic ? [patient.topic] : [];
    for (const topic of topics) {
      if (!topic || topic === "Other") continue;
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }
  }

  const level = getLevel(points);

  return {
    studentId,
    name: name.trim() || "Unknown",
    points,
    levelName: level.name,
    levelIcon: level.icon,
    patientCount: patients.length,
    activePatientCount,
    dischargedPatientCount,
    topicCounts,
    updatedAt,
  };
}

export function sortTopicCounts(topicCounts: Record<string, number>, limit?: number): Array<{ topic: string; count: number }> {
  const sorted = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([topic, count]) => ({ topic, count }));

  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}
