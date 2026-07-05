// Pure slug helper for consult-topic completion keys. Split out of
// patientRecommendations.ts (which statically imports the heavy cases/trials/
// inpatientGuides datasets) so the always-loaded student shell can key consult
// completions without dragging that content into the boot chunk.
export function getConsultTopicCompletionKey(topic: string): string {
  return topic
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "topic";
}
