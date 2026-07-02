import { useEffect, useMemo, useState } from "react";
import { T, WEEKLY, ARTICLES } from "../../data/constants";
import { PRO_TIPS } from "./shared";
import { useIsMobile } from "../../utils/helpers";
import { getLevel } from "../../utils/gamification";
import { getPatientSuggestedTopicGroups } from "../../utils/patientRecommendations";
import type {
  Announcement,
  Bookmarks,
  CompletedItems,
  Gamification,
  Patient,
  QuizScore,
  ReflectionEntry,
  SubView,
  WeeklyScores,
} from "../../types";
import type { CompetencySummary } from "../../utils/competency";
import type { StudySheetsData } from "../../utils/studySheets";
import { buildHeroCard, buildLearningPlan, buildStartChecklist } from "./home/builders";
import HomeHeader from "./home/HomeHeader";
import HeroSection from "./home/HeroSection";
import ConsultLinkedLearning from "./home/ConsultLinkedLearning";
import CorePathChecklist from "./home/CorePathChecklist";
import AnnouncementBanner from "./home/AnnouncementBanner";
import InstallPromptCard from "./home/InstallPromptCard";
import QuickReviewSection from "./home/QuickReviewSection";
import PearlToast, { PEARL_STORAGE_KEY, getPearlIndex, toDateKey } from "./home/PearlToast";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface HomeTabProps {
  navigate: (tab: string, sv?: SubView) => void;
  preScore: QuizScore | null;
  postScore: QuizScore | null;
  curriculum: typeof WEEKLY;
  articles: typeof ARTICLES;
  studySheets: StudySheetsData;
  announcements: Announcement[];
  currentWeek: number | null;
  totalWeeks?: number;
  rotationEnded?: boolean;
  weeklyScores: WeeklyScores;
  completedItems: CompletedItems;
  bookmarks: Bookmarks;
  srDueCount: number;
  patients: Patient[];
  online?: boolean;
  competencySummary: CompetencySummary;
  gamification: Gamification;
  reflections: ReflectionEntry[];
  onSubmitReflection: (payload: { saw: string; unclear: string }) => Promise<ReflectionEntry | null>;
  installPromptVariant: "native" | "ios" | null;
  onInstallApp: () => Promise<void>;
  onDismissInstallPrompt: () => void;
  onCompleteConsultTopic: (payload: { topic: string; sheetIds: string[]; trialNames: string[] }) => void;
}

export default function HomeTab({
  navigate,
  preScore,
  postScore,
  curriculum,
  articles,
  studySheets,
  announcements,
  currentWeek,
  totalWeeks = 4,
  rotationEnded = false,
  weeklyScores,
  completedItems,
  bookmarks,
  srDueCount,
  patients,
  online = true,
  competencySummary,
  gamification,
  reflections,
  onSubmitReflection,
  installPromptVariant,
  onInstallApp,
  onDismissInstallPrompt,
  onCompleteConsultTopic,
}: HomeTabProps) {
  const isMobile = useIsMobile();
  const level = getLevel(gamification?.points || 0);
  const now = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(now), [now]);
  const [pearlDismissed, setPearlDismissed] = useState(false);

  useEffect(() => {
    setPearlDismissed(localStorage.getItem(PEARL_STORAGE_KEY) === todayKey);
  }, [todayKey]);

  const activePatientList = useMemo(
    () => (patients || [])
      .filter((patient) => patient.status === "active")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [patients],
  );
  const activePatients = useMemo(
    () => activePatientList.slice(0, isMobile ? 3 : 4),
    [activePatientList, isMobile],
  );
  const activeConsultTopics = useMemo(
    () => {
      const topics = new Set<string>();
      for (const patient of activePatientList) {
        for (const topic of patient.topics || (patient.topic ? [patient.topic] : [])) {
          if (topic && topic !== "Other") topics.add(topic);
        }
      }
      return Array.from(topics);
    },
    [activePatientList],
  );
  const patientSuggestedGroups = useMemo(
    () => getPatientSuggestedTopicGroups(patients || [], completedItems),
    [completedItems, patients],
  );
  const [suggestedExpanded, setSuggestedExpanded] = useState(false);
  const [selectedTopicIdx, setSelectedTopicIdx] = useState(0);
  // Reset the active topic if the underlying group set changes (new consult, etc.).
  useEffect(() => { setSelectedTopicIdx(0); }, [patientSuggestedGroups.length]);
  const toggleSuggested = () => setSuggestedExpanded(v => !v);

  // Module-unlock nudge (cohort feedback: students didn't realize earlier
  // modules stay available). Shows once per newly-unlocked module; the very
  // first visit just records the baseline without nudging.
  const [moduleNudge, setModuleNudge] = useState<number | null>(() => {
    if (typeof currentWeek !== "number") return null;
    const stored = parseInt(localStorage.getItem("neph_lastSeenModule") || "", 10);
    if (Number.isNaN(stored)) {
      localStorage.setItem("neph_lastSeenModule", String(currentWeek));
      return null;
    }
    return currentWeek > stored ? currentWeek : null;
  });
  const dismissModuleNudge = () => {
    if (typeof currentWeek === "number") localStorage.setItem("neph_lastSeenModule", String(currentWeek));
    setModuleNudge(null);
  };

  const activeAnnouncements = useMemo(
    () => (announcements || [])
      .filter((item) => !item.date || now.getTime() - new Date(item.date).getTime() < SEVEN_DAYS_MS)
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()),
    [announcements, now],
  );
  const latestAnnouncement = activeAnnouncements[0] || null;
  const learningPlan = useMemo(
    () => buildLearningPlan({ currentWeek, totalWeeks, rotationEnded, articles, studySheets, completedItems, weeklyScores }),
    [articles, studySheets, completedItems, currentWeek, rotationEnded, totalWeeks, weeklyScores],
  );
  const heroCard = useMemo(
    () => buildHeroCard({
      now,
      currentWeek,
      rotationEnded,
      learningPlan,
      activePatientCount: activePatientList.length,
      postScore,
      suggestedTopicCount: patientSuggestedGroups.length,
      onOpenSuggested: toggleSuggested,
      suggestedExpanded,
    }),
    [activePatientList.length, currentWeek, learningPlan, now, postScore, rotationEnded, patientSuggestedGroups.length, suggestedExpanded],
  );

  const pearlIndex = useMemo(() => getPearlIndex(now), [now]);
  const displayWeek = currentWeek || 1;
  const startChecklist = useMemo(
    () => buildStartChecklist({ displayWeek, studySheets, completedItems, weeklyScores }),
    [completedItems, displayWeek, studySheets, weeklyScores],
  );
  const headerKicker = currentWeek ? `Module ${currentWeek} · ${now.toLocaleDateString("en-US", { weekday: "short" })}` : rotationEnded ? `Rotation complete · ${now.toLocaleDateString("en-US", { weekday: "short" })}` : `Getting started · ${now.toLocaleDateString("en-US", { weekday: "short" })}`;
  const headerSub = rotationEnded
    ? "Everything you need to finish strong and close the loop."
    : curriculum[displayWeek]?.sub || "One focused screen for what matters next.";

  const handleCompleteSuggestedTopic = (group: (typeof patientSuggestedGroups)[number]) => {
    onCompleteConsultTopic({
      topic: group.topic,
      sheetIds: group.sheets.map(sheet => sheet.id),
      trialNames: group.trials.map(trial => trial.name),
    });
    setSelectedTopicIdx(0);
  };

  return (
    <div style={{ padding: "18px 16px 24px" }}>
      <HomeHeader headerKicker={headerKicker} headerSub={headerSub} online={online} />

      {moduleNudge !== null && (
        <div role="status" style={{ background: T.infoBg, border: `1px solid ${T.info}`, borderRadius: 12, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: T.info, fontWeight: 600, lineHeight: 1.45 }}>
            Module {moduleNudge} is live. Earlier modules stay available — find them all in the Library.
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={() => { dismissModuleNudge(); navigate("library"); }}
              style={{ padding: "6px 12px", minHeight: 36, background: T.info, color: T.infoInk, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Open Library
            </button>
            <button onClick={dismissModuleNudge} aria-label="Dismiss module notice"
              style={{ background: "none", border: "none", color: T.info, cursor: "pointer", fontSize: 16, minWidth: 36, minHeight: 36 }}>
              ×
            </button>
          </div>
        </div>
      )}

      <HeroSection
        heroCard={heroCard}
        isMobile={isMobile}
        navigate={navigate}
        suggestedExpanded={suggestedExpanded}
        patientSuggestedGroups={patientSuggestedGroups}
        selectedTopicIdx={selectedTopicIdx}
        onSelectTopic={setSelectedTopicIdx}
        onCompleteTopic={handleCompleteSuggestedTopic}
      />

      {activePatientList.length > 0 && (
        <ConsultLinkedLearning
          activePatientList={activePatientList}
          activePatients={activePatients}
          activeConsultTopics={activeConsultTopics}
          patientSuggestedGroups={patientSuggestedGroups}
          isMobile={isMobile}
          navigate={navigate}
        />
      )}

      <CorePathChecklist
        startChecklist={startChecklist}
        currentWeek={currentWeek}
        isMobile={isMobile}
        navigate={navigate}
      />

      {latestAnnouncement && (
        <AnnouncementBanner
          announcement={latestAnnouncement}
          totalCount={activeAnnouncements.length}
          now={now}
        />
      )}

      {installPromptVariant && (
        <InstallPromptCard
          variant={installPromptVariant}
          onInstallApp={onInstallApp}
          onDismiss={onDismissInstallPrompt}
        />
      )}

      <QuickReviewSection srDueCount={srDueCount} navigate={navigate} />

      {!pearlDismissed && (
        <PearlToast
          tip={PRO_TIPS[pearlIndex]}
          onDismiss={() => {
            localStorage.setItem(PEARL_STORAGE_KEY, todayKey);
            setPearlDismissed(true);
          }}
        />
      )}

    </div>
  );
}
