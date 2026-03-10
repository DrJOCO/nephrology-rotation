// Shared type definitions for the Nephrology Rotation Education App

export interface FollowUp {
  id: number;
  date: string;
  note: string;
}

export interface Patient {
  id: number;
  initials: string;
  room: string;
  dx: string;
  topics: string[];
  topic?: string; // backwards compat: old patients had single topic
  notes: string;
  date: string;
  status: "active" | "discharged";
  followUps: FollowUp[];
}

export interface QuizAnswer {
  qIdx: number;
  chosen: number;
  correct: boolean;
}

export interface QuizScore {
  correct: number;
  total: number;
  date: string;
  answers: QuizAnswer[];
}

export type WeeklyScores = Record<string, QuizScore[]>;

export type SubView =
  | { type: "weeklyQuiz"; week: number }
  | { type: "reviewMissed"; week: number }
  | { type: "preQuiz" }
  | { type: "postQuiz" }
  | { type: "preResults" }
  | { type: "articles"; week: number }
  | { type: "trials"; week: number }
  | { type: "studySheets"; week: number }
  | { type: "cases"; week: number }
  | { type: "resources" }
  | { type: "abbreviations" }
  | { type: "faq" }
  | { type: "bookmarks" }
  | { type: "extraPractice" }
  | { type: "srReview" }
  | { type: "practiceQuiz" }
  | { type: "refDetail"; id: string }
  | { type: "trialLibrary" }
  | { type: "browseByTopic" }
  | { type: "topicDetail"; topic: string }
  | { type: "clinicGuide"; date: string }
  | { type: "clinicGuideHistory" }
  | null;

export type AdminSubView =
  | { type: "printCohort" }
  | { type: "studentDetail"; id: string }
  | { type: "printStudent"; id: string }
  | { type: "exportPdf"; id: string }
  | { type: "editArticles"; week: number }
  | { type: "editCurriculum" }
  | { type: "announcements" }
  | { type: "clinicGuides" }
  | null;

export interface Announcement {
  id: number;
  title: string;
  body: string;
  priority: "normal" | "important" | "urgent";
  date: string;
}

export interface SharedSettings {
  attendingName?: string;
  rotationStart?: string;
  email?: string;
  phone?: string;
  adminPin?: string;
  duration?: string;
  dates?: string;
  location?: string;
  archived?: boolean;
  archivedAt?: string;
}

export interface Gamification {
  points: number;
  achievements: string[];
  streaks: {
    currentDays: number;
    longestDays: number;
    lastActiveDate: string | null;
    activityLog?: string[];
  };
}

export interface ActivityLogEntry {
  type: string;
  label: string;
  detail: string;
  timestamp: string;
}

export interface SrItem {
  questionKey: string;
  easeFactor: number;
  interval: number;
  nextReviewDate: string;
  repetitions: number;
  lastReviewed: string;
  addedDate: string;
}

export type SrQueue = Record<string, SrItem>;

export interface CaseCompletion {
  score: number;
  total: number;
  date: string;
}

export interface CompletedItems {
  articles: Record<string, boolean>;
  studySheets: Record<string, boolean>;
  cases: Record<string, CaseCompletion>;
}

export interface Bookmarks {
  trials: string[];
  articles: string[];
  cases: string[];
  studySheets: string[];
}

export interface ClinicGuideRecord {
  id: string;
  date: string;
  topic: string;
  generatedAt: string;
  isOverride: boolean;
}

export interface FeedbackTag {
  tag: string;
  date: string;
  note?: string;
}

export interface AdminStudent {
  id: number;
  studentId: string;
  name: string;
  loginPin?: string;
  year?: string;
  email?: string;
  status: "active" | "completed";
  addedDate: string;
  patients: Patient[];
  weeklyScores: WeeklyScores;
  preScore: QuizScore | null;
  postScore: QuizScore | null;
  gamification?: Gamification;
  srQueue: SrQueue;
  activityLog: ActivityLogEntry[];
  completedItems?: CompletedItems;
  bookmarks?: Bookmarks;
  feedbackTags?: FeedbackTag[];
  lastSyncedAt?: string | null;
}

export interface Trial {
  name: string;
  category: string;
  full_title: string;
  journal: string;
  year: number;
  url: string;
  takeaway: string;
  details: string;
  significance: string;
  topics?: string[];
}

// Chart data shapes
export interface LineChartPoint {
  label: string;
  value: number;
}

export interface HistogramBin {
  label: string;
  values: { value: number; color: string }[];
}

export interface FunnelStage {
  label: string;
  value: number;
  total: number;
  color?: string;
}

export interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

export interface QuizQuestion {
  q: string;
  choices: string[];
  answer: number;
  explanation: string;
  topic?: string;
  _srKey?: string;
  _key?: string;
}

// ─── Data source types (for search, QUICK_REFS, etc.) ─────────────

export interface Article {
  title: string;
  journal: string;
  year: number;
  url: string;
  topic: string;
  type: string;
}

export interface ClinicalCase {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  scenario: string;
  questions: QuizQuestion[];
  topics?: string[];
}

export interface StudySheetSection {
  heading: string;
  items: string[];
}

export interface StudySheet {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  sections: StudySheetSection[];
  trialCallouts?: { trial: string; pearl: string }[];
  topics?: string[];
}

export interface Abbreviation {
  abbr: string;
  full: string;
}

// ─── QUICK_REFS discriminated union ───────────────────────────────

export interface CalcInput {
  key: string;
  label: string;
  placeholder: string;
}

export interface CalcResult {
  value: string;
  interpretation: string;
  caveat?: string;
}

interface QuickRefBase {
  id: string;
  icon: string;
  title: string;
  desc: string;
}

export interface QuickRefCalculator extends QuickRefBase {
  type: "calculator";
  inputs: CalcInput[];
  calculate: (v: Record<string, number>) => CalcResult | null;
}

export interface QuickRefReference extends QuickRefBase {
  type: "reference";
  content: { sections: { heading: string; items: string[] }[] };
}

export interface AtlasFinding {
  finding: string;
  appearance: string;
  significance: string;
  associations: string;
  clinicalPearl: string;
}

export interface QuickRefAtlas extends QuickRefBase {
  type: "atlas";
  imageLinks: { name: string; url: string }[];
  content: { sections: { heading: string; items: AtlasFinding[] }[] };
}

export type QuickRef = QuickRefCalculator | QuickRefReference | QuickRefAtlas;

// ─── Topic-based models ─────────────────────────────────────────

/** Result from the topic-based recommendation engine */
export interface TopicRecommendation {
  topic: string;
  studySheets: string[];
  articles: string[];
  cases: string[];
  quizWeeks: number[];
  reason: string;
  priority: number;
}

/** Topic exposure summary for a student (clinical + learning) */
export interface TopicExposure {
  topic: string;
  patientCount: number;
  lastSeen: string | null;
  contentCompleted: number;
  contentTotal: number;
}

/** Mapping from a topic to all associated content across weeks */
export interface TopicContentIndex {
  studySheets: { week: number; id: string }[];
  articles: { week: number; url: string }[];
  cases: { week: number; id: string }[];
  quizWeeks: number[];
}

// ─── Search data sources ──────────────────────────────────────────

export interface SearchDataSources {
  trials: Trial[];
  articlesByWeek: Record<number, Article[]>;
  cases: Record<number, ClinicalCase[]>;
  studySheets: Record<number, StudySheet[]>;
  abbreviations: Abbreviation[];
  quickRefs: QuickRef[];
}
