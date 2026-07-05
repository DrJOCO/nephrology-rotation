import { lazy, Suspense } from "react";
import { T, WEEKLY, ARTICLES, CURRICULUM_DECKS } from "../../data/constants";
import type { ClinicGuideTemplates } from "../../data/clinicGuides";
import { PRE_QUIZ, POST_QUIZ, TOPIC_REINFORCEMENT_BANK, WEEKLY_QUIZZES, getQuestionByKey, resolveReinforcementTopic, topicToSlug } from "../../data/quizzes";
import { processQuizResults, processReviewResults, getDueItems, seedTopicReinforcementSr } from "../../utils/spacedRepetition";
import { getArticleKey } from "../../utils/articleKeys";
import type { CompetencySummary } from "../../utils/competency";
import type { StudySheetsData } from "../../utils/studySheets";
import type { Patient, QuizScore, WeeklyScores, SubView, Announcement, Gamification, SrQueue, CompletedItems, Bookmarks, ClinicGuideRecord, ReflectionEntry } from "../../types";

// Critical-path components (eager)
import HomeTab from "./HomeTab";
import LibraryHub from "./LibraryHub";
import { BackButton } from "./shared";

// Lazy-loaded sub-views
const BookmarksView = lazy(() => import("./BookmarksView"));
const AssessmentResultsView = lazy(() => import("./AssessmentResultsView"));
const ArticlesView = lazy(() => import("./ArticlesView"));
const LandmarkTrialsView = lazy(() => import("./LandmarkTrialsView"));
const TrialLibraryView = lazy(() => import("./TrialLibraryView"));
const StudySheetsView = lazy(() => import("./StudySheetsView"));
const CasesView = lazy(() => import("./CasesView"));
const ResourcesView = lazy(() => import("./ResourcesView"));
const AbbreviationsView = lazy(() => import("./AbbreviationsView"));
const FaqView = lazy(() => import("./FaqView"));
const QuizEngine = lazy(() => import("./QuizEngine"));
const RefDetailView = lazy(() => import("./RefDetailView"));
const GuideTab = lazy(() => import("./GuideTab"));
const PatientTab = lazy(() => import("./PatientTab"));
const TeamTab = lazy(() => import("./TeamTab"));
const ProgressTab = lazy(() => import("./ProgressTab"));
const TopicBrowseView = lazy(() => import("./TopicBrowseView"));
const AkiToolView = lazy(() => import("./AkiToolView"));
const HyponatremiaToolView = lazy(() => import("./HyponatremiaToolView"));
const GnToolView = lazy(() => import("./GnToolView"));
const ClinicGuideView = lazy(() => import("./ClinicGuideView"));
const ClinicGuideHistoryView = lazy(() => import("./ClinicGuideHistoryView"));
const InpatientGuideView = lazy(() => import("./InpatientGuideView"));
const RotationGuideView = lazy(() => import("./RotationGuideView"));

const LazyFallback = () => (
  <div style={{ padding: 40, textAlign: "center" }}>
    <div style={{ color: T.sub, fontFamily: T.serif, fontSize: 14 }}>Loading...</div>
  </div>
);

function extractMissedTopics(
  answers: Array<{ qIdx: number; correct: boolean }>,

  questions: any[],
): string[] {
  const topics = new Set<string>();
  for (const a of answers) {
    if (a.correct) continue;
    const q = questions[a.qIdx];
    const topic = resolveReinforcementTopic(q);
    if (topic) topics.add(topic);
  }
  return Array.from(topics);
}

export interface StudentViewRouterProps {
  tab: string;
  subView: SubView;
  navigate: (t: string, sv?: SubView) => void;
  goBack: () => void;
  patients: Patient[];
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  weeklyScores: WeeklyScores;
  setWeeklyScores: React.Dispatch<React.SetStateAction<WeeklyScores>>;
  preScore: QuizScore | null;
  setPreScore: React.Dispatch<React.SetStateAction<QuizScore | null>>;
  postScore: QuizScore | null;
  setPostScore: React.Dispatch<React.SetStateAction<QuizScore | null>>;
  gamification: Gamification;
  completedItems: CompletedItems;
  setCompletedItems: React.Dispatch<React.SetStateAction<CompletedItems>>;
  bookmarks: Bookmarks;
  srQueue: SrQueue;
  setSrQueue: React.Dispatch<React.SetStateAction<SrQueue>>;
  reflections: ReflectionEntry[];
  curriculum: typeof WEEKLY;
  articles: typeof ARTICLES;
  studySheets: StudySheetsData;
  announcements: Announcement[];
  clinicGuides: ClinicGuideRecord[];
  clinicGuideTemplates: ClinicGuideTemplates;
  currentWeek: number | null;
  totalWeeks: number;
  rotationEnded: boolean;
  competencySummary: CompetencySummary;
  online: boolean;
  studentId: string;
  installPromptVariant: "native" | "ios" | null;
  onInstallApp: () => Promise<void>;
  onDismissInstallPrompt: () => void;
  onSubmitReflection: (payload: { saw: string; unclear: string }) => Promise<ReflectionEntry>;
  onCompleteConsultTopic: (payload: { topic: string; sheetIds: string[]; trialNames: string[] }) => void;
  logActivity: (type: string, label: string, detail?: string) => void;
  toggleBookmark: (type: keyof Bookmarks, itemId: string) => void;
  markPatientDirty: (id: string | number) => void;
  markPatientRemoved: (id: string | number) => void;
}

// ─────────────────────────────────────────────────────────────────────────
// StudentViewRouter — renders the active tab/subView. Pure move of the
// routing switch that previously lived inline in StudentApp's <main>.
// Back navigation goes through `goBack` (browser history) so the in-app
// and hardware Back gestures stay in sync.
// ─────────────────────────────────────────────────────────────────────────
function StudentViewRouter({
  tab, subView, navigate, goBack,
  patients, setPatients,
  weeklyScores, setWeeklyScores,
  preScore, setPreScore,
  postScore, setPostScore,
  gamification,
  completedItems, setCompletedItems,
  bookmarks,
  srQueue, setSrQueue,
  reflections,
  curriculum, articles, studySheets, announcements,
  clinicGuides, clinicGuideTemplates,
  currentWeek, totalWeeks, rotationEnded,
  competencySummary,
  online, studentId,
  installPromptVariant, onInstallApp, onDismissInstallPrompt,
  onSubmitReflection, onCompleteConsultTopic,
  logActivity, toggleBookmark,
  markPatientDirty, markPatientRemoved,
}: StudentViewRouterProps) {
  return (
    <>
        {tab === "today" && !subView && <HomeTab navigate={navigate} preScore={preScore} postScore={postScore} curriculum={curriculum} articles={articles} studySheets={studySheets} announcements={announcements} currentWeek={currentWeek} totalWeeks={totalWeeks} rotationEnded={rotationEnded} weeklyScores={weeklyScores} completedItems={completedItems} bookmarks={bookmarks} srDueCount={getDueItems(srQueue).length} patients={patients} setPatients={setPatients} onMarkPatientDirty={markPatientDirty} onMarkPatientRemoved={markPatientRemoved} onLogActivity={logActivity} online={online} competencySummary={competencySummary} gamification={gamification} reflections={reflections} onSubmitReflection={onSubmitReflection} installPromptVariant={installPromptVariant} onInstallApp={onInstallApp} onDismissInstallPrompt={onDismissInstallPrompt} onCompleteConsultTopic={onCompleteConsultTopic} />}
        <Suspense fallback={<LazyFallback />}>
        {tab === "today" && subView?.type === "weeklyQuiz" && (
          <QuizEngine questions={WEEKLY_QUIZZES[subView.week]} title={`Module ${subView.week} Quiz`}
            onBack={goBack}
            onFinish={(score) => {
              // Record the attempt and seed spaced repetition, but do NOT navigate
              // away — QuizEngine renders its own results screen on finish (score +
              // missed-question review). Its Done button calls onBack (goBack) to
              // return, matching the app's back convention.
              setWeeklyScores(prev => ({...prev, [subView.week]: [...(prev[subView.week]||[]), score]}));
              setSrQueue(prev => {
                const afterQuiz = processQuizResults(score.answers || [], "weekly", subView.week, prev);
                const weakTopics = extractMissedTopics(score.answers || [], WEEKLY_QUIZZES[subView.week] || []);
                return weakTopics.length
                  ? seedTopicReinforcementSr(weakTopics, TOPIC_REINFORCEMENT_BANK, topicToSlug, afterQuiz)
                  : afterQuiz;
              });
              logActivity("quiz", `Module ${subView.week} Quiz`, `${score.correct}/${score.total}`);
            }} />
        )}
        {tab === "today" && subView?.type === "reviewMissed" && (() => {
          const ws = weeklyScores[subView.week] || [];
          const latest = ws[ws.length - 1];
          const missed = (latest?.answers || []).filter(a => !a.correct);
          const missedQuestions = missed.map(a => WEEKLY_QUIZZES[subView.week][a.qIdx]);
          return missedQuestions.length > 0 ? (
            <QuizEngine questions={missedQuestions} title={`Module ${subView.week} — Review Missed`}
              onBack={goBack}
              onFinish={(score) => {
                logActivity("review_missed", `Module ${subView.week} Review`, `${score.correct}/${score.total}`);
                navigate("today");
              }} />
          ) : (
            <div style={{ padding: 16 }}>
              <BackButton onClick={goBack} />
              <div style={{ textAlign: "center", padding: "40px 16px" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 4 }}>Nothing to review</div>
                <div style={{ fontSize: 14, color: T.sub }}>You didn't miss any questions on this quiz.</div>
              </div>
            </div>
          );
        })()}
        {tab === "today" && subView?.type === "preQuiz" && (
          <QuizEngine questions={PRE_QUIZ} title="Pre-Rotation Assessment"
            onBack={goBack}
            onFinish={(score) => {
              setPreScore(score);
              setSrQueue(prev => {
                const afterQuiz = processQuizResults(score.answers || [], "pre", 0, prev);
                const weakTopics = extractMissedTopics(score.answers || [], PRE_QUIZ);
                return weakTopics.length
                  ? seedTopicReinforcementSr(weakTopics, TOPIC_REINFORCEMENT_BANK, topicToSlug, afterQuiz)
                  : afterQuiz;
              });
              logActivity("assessment", "Pre-Rotation Assessment", `${score.correct}/${score.total}`);
              navigate("today", { type: "preResults" });
            }} />
        )}
        {tab === "today" && subView?.type === "preResults" && (
          <AssessmentResultsView mode="pre" score={preScore} navigate={navigate} comparisonScore={null} srDueCount={getDueItems(srQueue).length} />
        )}
        {tab === "today" && subView?.type === "postQuiz" && (
          <QuizEngine questions={POST_QUIZ} title="Post-Rotation Assessment"
            onBack={goBack}
            onFinish={(score) => {
              setPostScore(score);
              setSrQueue(prev => {
                const afterQuiz = processQuizResults(score.answers || [], "post", 0, prev);
                const weakTopics = extractMissedTopics(score.answers || [], POST_QUIZ);
                return weakTopics.length
                  ? seedTopicReinforcementSr(weakTopics, TOPIC_REINFORCEMENT_BANK, topicToSlug, afterQuiz)
                  : afterQuiz;
              });
              logActivity("assessment", "Post-Rotation Assessment", `${score.correct}/${score.total}`);
              navigate("today", { type: "postResults" });
            }} />
        )}
        {tab === "today" && subView?.type === "postResults" && (
          <AssessmentResultsView mode="post" score={postScore} comparisonScore={preScore} navigate={navigate} srDueCount={getDueItems(srQueue).length} />
        )}
        {tab === "today" && subView?.type === "articles" && (
          <ArticlesView week={subView.week} onBack={goBack} navigate={navigate} curriculum={curriculum} articles={articles} completedItems={completedItems} bookmarks={bookmarks} onToggleBookmark={(key) => toggleBookmark("articles", key)} onToggleComplete={(key) => {
            const article = (articles[subView.week] || []).find((item) => getArticleKey(item) === key);
            const wasCompleted = Boolean(completedItems.articles[key] || (article && completedItems.articles[article.url]));
            setCompletedItems(prev => {
              const next = { ...prev, articles: { ...prev.articles } };
              if (wasCompleted) {
                // Clear the legacy url key too — an old client's sync may have
                // reintroduced it, and either key alone reads as completed.
                delete next.articles[key];
                if (article) delete next.articles[article.url];
              } else {
                next.articles[key] = true;
              }
              return next;
            });
            if (!wasCompleted) {
              logActivity("article", `Module ${subView.week} Article`, article?.topic || article?.title || "Article completed");
            }
          }} />
        )}
        {tab === "today" && subView?.type === "trials" && (
          <LandmarkTrialsView week={subView.week} onBack={goBack} bookmarks={bookmarks} onToggleBookmark={(name) => toggleBookmark("trials", name)} />
        )}
        {tab === "today" && subView?.type === "studySheets" && (
          <StudySheetsView week={subView.week} initialSheetId={subView.sheetId} studySheets={studySheets} onBack={goBack} navigate={navigate} completedItems={completedItems} bookmarks={bookmarks} onToggleBookmark={(id) => toggleBookmark("studySheets", id)} onToggleComplete={(sheetId) => {
            const sheet = (studySheets[subView.week] || []).find((item) => item.id === sheetId);
            const wasCompleted = Boolean(completedItems.studySheets[sheetId]);
            setCompletedItems(prev => {
              const next = { ...prev, studySheets: { ...prev.studySheets } };
              if (next.studySheets[sheetId]) delete next.studySheets[sheetId];
              else next.studySheets[sheetId] = true;
              return next;
            });
            if (!wasCompleted) {
              logActivity("study_sheet", `Module ${subView.week} Study Sheet`, sheet?.title || "Study sheet completed");
            }
          }} />
        )}
        {tab === "today" && subView?.type === "cases" && (
          <CasesView week={subView.week} onBack={goBack} completedItems={completedItems} bookmarks={bookmarks} onToggleBookmark={(id) => toggleBookmark("cases", id)} onCaseComplete={(caseId, result) => {
            setCompletedItems(prev => ({
              ...prev,
              cases: { ...prev.cases, [caseId]: { score: result.score, total: result.total, date: new Date().toISOString() } }
            }));
            logActivity("case", `Clinical Case: ${caseId}`, `${result.score}/${result.total}`);
          }} />
        )}
        {tab === "today" && subView?.type === "resources" && (
          <ResourcesView
            onBack={goBack}
            initialTab={subView.tab}
            focusWeek={subView.week}
            completedItems={completedItems}
            onToggleDeckComplete={(deckId) => {
              const deck = CURRICULUM_DECKS.find((item) => item.id === deckId);
              const wasCompleted = Boolean(completedItems.decks?.[deckId]);
              setCompletedItems(prev => {
                const next = { ...prev, decks: { ...(prev.decks || {}) } };
                if (next.decks?.[deckId]) delete next.decks[deckId];
                else next.decks![deckId] = true;
                return next;
              });
              if (!wasCompleted) {
                logActivity("deck", deck ? `Module ${deck.week} Teaching Deck` : "Teaching Deck", deck?.name || "Teaching deck reviewed");
              }
            }}
          />
        )}
        {tab === "today" && subView?.type === "abbreviations" && (
          <AbbreviationsView onBack={goBack} />
        )}
        {tab === "today" && subView?.type === "faq" && (
          <FaqView onBack={goBack} />
        )}
        {tab === "today" && subView?.type === "bookmarks" && (
          <BookmarksView bookmarks={bookmarks} onBack={goBack} onNavigate={navigate} onToggleBookmark={toggleBookmark} articles={articles} studySheets={studySheets} />
        )}
        {tab === "today" && subView?.type === "browseByTopic" && (
          <TopicBrowseView onBack={goBack} navigate={navigate as (tab: string, sv?: Record<string, unknown> | null) => void} completedItems={completedItems} studySheets={studySheets} />
        )}
        {tab === "today" && subView?.type === "topicDetail" && (
          <TopicBrowseView
            onBack={goBack}
            navigate={navigate as (tab: string, sv?: Record<string, unknown> | null) => void}
            completedItems={completedItems}
            studySheets={studySheets}
            initialTopic={subView.topic}
          />
        )}
        {tab === "today" && subView?.type === "extraPractice" && (() => {
          const dueKeys = getDueItems(srQueue);
          const allWeeklyQs = [1,2,3,4].flatMap(w => (WEEKLY_QUIZZES[w] || []).map((q, i) => ({ ...q, _key: `weekly_${w}_${i}` })));
          return (
            <div style={{ padding: 16 }}>
              <button onClick={goBack} style={{ background: "none", border: "none", color: T.brand, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>{"←"} Back</button>
              <h2 style={{ color: T.ink, fontFamily: T.serif, fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>Extra Practice</h2>
              <p style={{ color: T.sub, fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>Review missed questions or practice from the full question bank.</p>
              {dueKeys.length > 0 && (
                <button onClick={() => navigate("today", { type: "srReview" })}
                  style={{ width: "100%", background: `linear-gradient(135deg, ${T.warning}, ${T.warning})`, borderRadius: 12, padding: 16, border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                  <span style={{ fontSize: 26, flexShrink: 0 }}>{"🔄"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: T.warningInk, fontSize: 15 }}>Spaced Repetition Review</div>
                    <div style={{ fontSize: 13, color: T.warningInk, opacity: 0.85, marginTop: 2 }}>{dueKeys.length} question{dueKeys.length !== 1 ? "s" : ""} due — missed questions resurface at increasing intervals</div>
                  </div>
                  <span style={{ background: T.surface, color: T.brand, fontSize: 13, fontWeight: 700, padding: "4px 10px", borderRadius: 12, flexShrink: 0 }}>{dueKeys.length}</span>
                </button>
              )}
              <button onClick={() => navigate("today", { type: "practiceQuiz" })}
                style={{ width: "100%", background: T.card, borderRadius: 12, padding: 16, border: `1.5px solid ${T.brand}`, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <span style={{ fontSize: 26, flexShrink: 0 }}>{"📝"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: T.ink, fontSize: 15 }}>Practice Questions</div>
                  <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>15 random questions from the full bank of {allWeeklyQs.length}</div>
                </div>
              </button>
              {Object.keys(srQueue).length > 0 && (
                <div style={{ background: T.surface2, borderRadius: 10, padding: 14, marginTop: 8, borderLeft: `3px solid ${T.brand}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 6 }}>SR Queue Stats</div>
                  <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.6 }}>
                    <div>Total in queue: {Object.keys(srQueue).length}</div>
                    <div>Due now: {dueKeys.length}</div>
                    <div>Mastered (interval &gt; 21 days): {Object.values(srQueue).filter(i => i.interval > 21).length}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        {tab === "today" && subView?.type === "srReview" && (() => {
          const dueKeys = getDueItems(srQueue);
          const dueQuestions = dueKeys.map(key => {
            const q = getQuestionByKey(key);
            return q ? { ...q, _srKey: key } : null;
          }).filter(Boolean);
          return dueQuestions.length > 0 ? (
            <QuizEngine questions={dueQuestions} title="Spaced Repetition Review"
              onBack={goBack}
              onFinish={(score) => {
                const reviewAnswers = (score.answers || []).map(a => ({
                  questionKey: dueQuestions[a.qIdx]?._srKey,
                  correct: a.correct,
                })).filter(a => a.questionKey);
                setSrQueue(prev => processReviewResults(reviewAnswers, prev));
                logActivity("sr_review", "Spaced Repetition Review", `${score.correct}/${score.total}`);
                navigate("today", { type: "extraPractice" });
              }} />
          ) : (
            <div style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{"✅"}</div>
              <div style={{ color: T.ink, fontFamily: T.serif, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>All caught up!</div>
              <div style={{ color: T.sub, fontSize: 13, marginBottom: 20 }}>No questions due for review right now.</div>
              <button onClick={goBack} style={{ padding: "10px 24px", background: T.brand, color: T.brandInk, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Back</button>
            </div>
          );
        })()}
        {tab === "today" && subView?.type === "practiceQuiz" && (() => {
          const allWeeklyQs = [1,2,3,4].flatMap(w => WEEKLY_QUIZZES[w] || []);
          return (
            <QuizEngine questions={allWeeklyQs} title="Practice Questions" questionCount={15}
              onBack={goBack}
              onFinish={(score) => {
                logActivity("practice_quiz", "Practice Questions", `${score.correct}/${score.total}`);
                navigate("today", { type: "extraPractice" });
              }} />
          );
        })()}
        {/* Library hub (Phase 3a shell): lands on a simple stacked view of Guide + Refs sections.
            Phase 3b+ will restructure to the spec §03 Library (filterable by week). */}
        {tab === "library" && !subView && (
          <LibraryHub
            navigate={navigate}
            goBack={goBack}
            clinicGuides={clinicGuides}
            clinicGuideTemplates={clinicGuideTemplates}
            currentWeek={currentWeek}
            totalWeeks={totalWeeks}
            studySheets={studySheets}
            completedItems={completedItems}
            weeklyScores={weeklyScores}
            bookmarks={bookmarks}
          />
        )}
        {tab === "library" && subView?.type === "refDetail" && (
          <RefDetailView refId={subView.id} onBack={goBack} />
        )}
        {tab === "library" && subView?.type === "abbreviations" && (
          <AbbreviationsView onBack={goBack} />
        )}
        {tab === "library" && subView?.type === "trialLibrary" && (
          <TrialLibraryView onBack={goBack} bookmarks={bookmarks} onToggleBookmark={(name) => toggleBookmark("trials", name)} initialSearch={subView?.searchTrial as string | undefined} />
        )}
        {tab === "library" && subView?.type === "clinicGuide" && (
          <ClinicGuideView
            date={subView.date}
            topic={subView.topic || clinicGuides.find(g => g.date === subView.date)?.topic || "CKD"}
            isOverride={clinicGuides.find(g => g.date === subView.date && g.topic === (subView.topic || "CKD"))?.isOverride}
            clinicGuideTemplates={clinicGuideTemplates}
            onBack={goBack}
          />
        )}
        {tab === "library" && subView?.type === "clinicGuideHistory" && (
          <ClinicGuideHistoryView guides={clinicGuides} clinicGuideTemplates={clinicGuideTemplates} onSelect={(date, topic) => navigate("library", { type: "clinicGuide", date, topic })} onBack={goBack} />
        )}
        {tab === "library" && subView?.type === "inpatientGuide" && (
          <InpatientGuideView topic={subView.topic as import("../../data/inpatientGuides").InpatientGuideTopic} onBack={goBack} />
        )}
        {tab === "library" && subView?.type === "akiTool" && (
          <AkiToolView onBack={goBack} onOpenCalculator={(id) => navigate("library", { type: "refDetail", id })} />
        )}
        {tab === "library" && subView?.type === "hyponatremiaTool" && (
          <HyponatremiaToolView onBack={goBack} />
        )}
        {tab === "library" && subView?.type === "gnTool" && (
          <GnToolView onBack={goBack} />
        )}
        {tab === "library" && subView?.type === "rotationGuide" && (
          <RotationGuideView guideId={subView.guideId as import("../../data/rotationGuides").RotationGuideId} onBack={goBack} />
        )}
        {tab === "library" && subView?.type === "faq" && (
          <FaqView onBack={goBack} />
        )}
        {tab === "library" && subView && !subView?.type?.toString().startsWith("clinic") && subView?.type !== "trialLibrary" && subView?.type !== "inpatientGuide" && subView?.type !== "akiTool" && subView?.type !== "hyponatremiaTool" && subView?.type !== "gnTool" && subView?.type !== "rotationGuide" && subView?.type !== "faq" && subView?.type !== "refDetail" && subView?.type !== "abbreviations" && <GuideTab navigate={navigate as (tab: string, sv?: Record<string, unknown> | null) => void} subView={subView as Record<string, unknown> | null} clinicGuides={clinicGuides} clinicGuideTemplates={clinicGuideTemplates} goBack={goBack} />}
        {tab === "patients" && <PatientTab patients={patients} setPatients={setPatients} navigate={navigate} completedItems={completedItems} onLogActivity={logActivity} onMarkPatientDirty={markPatientDirty} onMarkPatientRemoved={markPatientRemoved} onCompleteConsultTopic={onCompleteConsultTopic} />}
        {tab === "team" && <TeamTab currentStudentId={studentId} />}
        {tab === "me" && <ProgressTab navigate={navigate} patients={patients} weeklyScores={weeklyScores} preScore={preScore} postScore={postScore} gamification={gamification} currentWeek={currentWeek} competencySummary={competencySummary} />}
        </Suspense>
    </>
  );
}

export default StudentViewRouter;
