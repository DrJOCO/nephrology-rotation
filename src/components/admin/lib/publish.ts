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
