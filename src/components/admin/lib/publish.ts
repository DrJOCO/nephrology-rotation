import type { ClinicGuideTemplates } from "../../../data/clinicGuides";
import { normalizeClinicGuideTemplates } from "../../../utils/clinicGuideTemplates";
import { normalizeStudySheets, type StudySheetsData } from "../../../utils/studySheets";
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
}: PublishableSharedState): PublishableSharedState {
  return {
    curriculum,
    articles,
    studySheets: normalizeStudySheets(studySheets),
    announcements,
    settings: getPublicSettings(settings),
    clinicGuides,
    clinicGuideTemplates: normalizeClinicGuideTemplates(clinicGuideTemplates),
  };
}

export function serializePublishSnapshot(snapshot: PublishableSharedState): string {
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
