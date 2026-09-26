import type { ClinicGuideTemplates } from "../../../data/clinicGuides";
import { normalizeClinicGuideTemplates } from "../../../utils/clinicGuideTemplates";
import { normalizeStudySheets, type StudySheetsData } from "../../../utils/studySheets";
import { computeContentCustomizations, type ContentCustomizations } from "../../../utils/contentCustomizations";
import type { WeeklyData, ArticlesData } from "../types";
import type { Announcement, SharedSettings, ClinicGuideRecord } from "../../../types";

export type PublishableSharedState = {
  curriculum: WeeklyData;
  articles: ArticlesData;
  studySheets: StudySheetsData;
  announcements: Announcement[];
  settings: SharedSettings;
  clinicGuides: ClinicGuideRecord[];
  clinicGuideTemplates: ClinicGuideTemplates;
};

// What publish writes: the content plus which items the admin customized, so
// every other item keeps following the latest built-in version.
export type PublishSnapshot = PublishableSharedState & { contentCustomizations: ContentCustomizations };

function getPublicSettings(settings: SharedSettings): SharedSettings {
  const { adminPin: _adminPin, ...publicSettings } = settings;
  return publicSettings;
}

export function buildPublishSnapshot({
  curriculum,
  articles,
  studySheets,
  announcements,
  settings,
  clinicGuides,
  clinicGuideTemplates,
}: PublishableSharedState): PublishSnapshot {
  const normalizedSheets = normalizeStudySheets(studySheets);
  const normalizedTemplates = normalizeClinicGuideTemplates(clinicGuideTemplates);
  return {
    curriculum,
    articles,
    studySheets: normalizedSheets,
    announcements,
    settings: getPublicSettings(settings),
    clinicGuides,
    clinicGuideTemplates: normalizedTemplates,
    contentCustomizations: computeContentCustomizations({
      curriculum,
      articles,
      studySheets: normalizedSheets,
      clinicGuideTemplates: normalizedTemplates,
    }),
  };
}

export function serializePublishSnapshot(snapshot: PublishSnapshot): string {
  return JSON.stringify(snapshot);
}

// The Firestore field names publish writes to. Used to fingerprint the remote
// rotation doc so a second device's edits can be detected before we overwrite.
const REMOTE_SHARED_FIELDS = [
  "curriculum",
  "articles",
  "studySheets",
  "announcements",
  "settings",
  "clinicGuides",
  "clinicGuideTemplates",
  "contentCustomizations",
] as const;

// Fingerprint the shared-content fields of a remote rotation doc. Comparing two
// fingerprints tells us whether another device published changes since we last
// hydrated — without needing a full field-by-field merge. Field order is fixed
// so the string is stable regardless of Firestore's key ordering.
export function fingerprintRemoteSharedDoc(remote: Record<string, unknown> | null | undefined): string {
  if (!remote) return "";
  const projected: Record<string, unknown> = {};
  for (const field of REMOTE_SHARED_FIELDS) {
    projected[field] = remote[field] ?? null;
  }
  return JSON.stringify(projected);
}
