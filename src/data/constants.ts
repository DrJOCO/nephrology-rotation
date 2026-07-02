// Barrel file: the former grab-bag constants module is now split into focused
// modules under src/data/. Everything is re-exported here so existing imports
// from "./constants" keep working unchanged.
//
//   theme.ts         → T (styling tokens), labelChip
//   topics.ts        → TOPICS, patient-topic lists/keywords, TOPIC_RESOURCE_MAP,
//                      STALE_FOLLOWUP_DAYS
//   curriculum.ts    → WEEKLY
//   articles.ts      → ARTICLES
//   resources.ts     → RESOURCES, CURRICULUM_DECKS
//   abbreviations.ts → ABBREVIATIONS
//   studySheets.ts   → STUDY_SHEETS
//   feedbackTags.ts  → FEEDBACK_TAGS
//
// New code may import from the focused modules directly.

export { T, labelChip } from "./theme";
export {
  TOPICS,
  COMMON_PATIENT_TOPICS,
  TOPIC_KEYWORDS,
  ADDITIONAL_PATIENT_TOPICS,
  TOPIC_RESOURCE_MAP,
  STALE_FOLLOWUP_DAYS,
} from "./topics";
export { WEEKLY } from "./curriculum";
export { ARTICLES } from "./articles";
export { RESOURCES, CURRICULUM_DECKS } from "./resources";
export { ABBREVIATIONS } from "./abbreviations";
export { STUDY_SHEETS } from "./studySheets";
export { FEEDBACK_TAGS } from "./feedbackTags";

// Landmark trials moved to trials.js — re-exported here for backward compatibility
export { LANDMARK_TRIALS, ALL_LANDMARK_TRIALS, TRIAL_CATEGORY_ORDER } from "./trials.js";
