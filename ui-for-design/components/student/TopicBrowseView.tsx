import { useEffect, useState } from "react";
import { T, TOPICS, ARTICLES, STUDY_SHEETS, ALL_LANDMARK_TRIALS } from "../../data/constants";
import { WEEKLY_CASES } from "../../data/cases";
import { getTopicContent, topicHasContent } from "../../utils/topicMapping";
import { useIsMobile } from "../../utils/helpers";
import { backBtnStyle } from "./shared";

interface TopicBrowseViewProps {
  onBack: () => void;
  navigate: (tab: string, sv?: Record<string, unknown> | null) => void;
  initialTopic?: string | null;
  completedItems?: {
    articles?: Record<string, boolean>;
    studySheets?: Record<string, boolean>;
    cases?: Record<string, unknown>;
  };
}

const resourceGroupLabels = {
  podcasts: "Podcast",
  websites: "Website",
  guidelines: "Guideline",
  tools: "Tool",
} as const;

export default function TopicBrowseView({ onBack, navigate, completedItems, initialTopic = null }: TopicBrowseViewProps) {
  const isMobile = useIsMobile();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(initialTopic);
  const completed = completedItems || {};

  useEffect(() => {
    setSelectedTopic(initialTopic);
  }, [initialTopic]);

  if (selectedTopic) {
    const content = getTopicContent(selectedTopic);
    const hasCoreContent = content.studySheets.length > 0 || content.cases.length > 0 || content.quizWeeks.length > 0;
    const hasOptionalDepth = content.articles.length > 0 || content.trials.length > 0 || content.resources.length > 0;
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <button onClick={() => (initialTopic ? onBack() : setSelectedTopic(null))} style={backBtnStyle}>
            {"\u2190"} {initialTopic ? "Back" : "All Topics"}
          </button>
          {initialTopic && (
            <button onClick={() => setSelectedTopic(null)} style={{ ...backBtnStyle, color: T.navy, borderColor: T.line }}>
              Browse All Topics
            </button>
          )}
        </div>
        <h2 style={{ color: T.navy, fontFamily: T.serif, fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>{selectedTopic}</h2>
        <p style={{ color: T.sub, fontSize: 13, margin: "0 0 6px" }}>All available resources for this topic</p>
        <p style={{ color: T.muted, fontSize: 13, margin: "0 0 16px", lineHeight: 1.6 }}>
          Start with study sheets, cases, and quizzes. Optional references and external resources are here when you want extra depth.
        </p>

        {hasCoreContent && (
          <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.line}`, padding: "14px 14px 10px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ background: T.greenBg, color: T.greenDk, borderRadius: 999, padding: "4px 9px", fontSize: 13, fontWeight: 700 }}>
                Core for this topic
              </span>
              <span style={{ fontSize: 13, color: T.muted }}>
                Finish these first to keep progress moving.
              </span>
            </div>

            {content.studySheets.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Study Sheets</div>
                {content.studySheets.map(s => {
                  const sheet = (STUDY_SHEETS[s.week] || []).find(sh => sh.id === s.id);
                  if (!sheet) return null;
                  const done = !!completed.studySheets?.[s.id];
                  return (
                    <button key={s.id} onClick={() => navigate("today", { type: "studySheets", week: s.week })}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: done ? T.greenBg : T.card, border: `1px solid ${done ? T.greenAlpha : T.line}`, borderRadius: 8, marginBottom: 6, cursor: "pointer", textAlign: "left" }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{sheet.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{sheet.title}</div>
                        <div style={{ fontSize: 13, color: T.muted }}>Week {s.week} {done ? " \u2022 Completed" : ""}</div>
                      </div>
                      <span style={{ color: T.muted, fontSize: 14, flexShrink: 0 }}>{"\u203A"}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {content.cases.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Clinical Cases</div>
                {content.cases.map(c => {
                  const cs = (WEEKLY_CASES[c.week] || []).find(ca => ca.id === c.id);
                  if (!cs) return null;
                  const done = !!completed.cases?.[c.id];
                  return (
                    <button key={c.id} onClick={() => navigate("today", { type: "cases", week: c.week })}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: done ? T.greenBg : T.card, border: `1px solid ${done ? T.greenAlpha : T.line}`, borderRadius: 8, marginBottom: 6, cursor: "pointer", textAlign: "left" }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{"\uD83C\uDFE5"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{cs.title}</div>
                        <div style={{ fontSize: 13, color: T.muted }}>Week {c.week} {"\u2022"} {cs.difficulty} {done ? " \u2022 Done" : ""}</div>
                      </div>
                      <span style={{ color: T.muted, fontSize: 14, flexShrink: 0 }}>{"\u203A"}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {content.quizWeeks.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Quiz Checks</div>
                {content.quizWeeks.map(w => (
                  <button key={w} onClick={() => navigate("today", { type: "weeklyQuiz", week: w })}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: T.card, border: `1px solid ${T.line}`, borderRadius: 8, marginBottom: 6, cursor: "pointer", textAlign: "left" }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{"\uD83D\uDCDD"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Week {w} Quiz</div>
                    </div>
                    <span style={{ color: T.muted, fontSize: 14, flexShrink: 0 }}>{"\u203A"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {hasOptionalDepth && (
          <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.line}`, padding: "14px 14px 10px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ background: T.blueBg, color: T.med, borderRadius: 999, padding: "4px 9px", fontSize: 13, fontWeight: 700 }}>
                Optional depth
              </span>
              <span style={{ fontSize: 13, color: T.muted }}>
                Use these for extra reading, landmark context, and reference support.
              </span>
            </div>

            {content.articles.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>References</div>
                {content.articles.map(a => {
                  const article = (ARTICLES[a.week] || []).find(art => art.url === a.url);
                  if (!article) return null;
                  const done = !!completed.articles?.[a.url];
                  return (
                    <button key={a.url} onClick={() => navigate("today", { type: "articles", week: a.week })}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: done ? T.greenBg : T.card, border: `1px solid ${done ? T.greenAlpha : T.line}`, borderRadius: 8, marginBottom: 6, cursor: "pointer", textAlign: "left" }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{"\uD83D\uDCC4"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{article.title}</div>
                        <div style={{ fontSize: 13, color: T.muted }}>{article.journal} ({article.year}) {done ? " \u2022 Reviewed" : ""}</div>
                      </div>
                      <span style={{ color: T.muted, fontSize: 14, flexShrink: 0 }}>{"\u203A"}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {content.trials.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Landmark Trials</div>
                {content.trials.map(trialName => {
                  const trial = ALL_LANDMARK_TRIALS.find(item => item.name === trialName);
                  if (!trial) return null;
                  return (
                    <button key={trial.name} onClick={() => navigate("library", { type: "trialLibrary", searchTrial: trial.name })}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: T.yellowBg, border: `1px solid ${T.goldAlpha}`, borderRadius: 8, marginBottom: 6, cursor: "pointer", textAlign: "left" }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{"\u2B50"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{trial.name}</div>
                        <div style={{ fontSize: 13, color: T.muted }}>{trial.journal} ({trial.year})</div>
                      </div>
                      <span style={{ color: T.muted, fontSize: 14, flexShrink: 0 }}>{"\u203A"}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {content.resources.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Reference Library</div>
                {content.resources.map(resource => (
                  <a key={resource.url} href={resource.url} target="_blank" rel="noopener noreferrer"
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: T.card, border: `1px solid ${T.line}`, borderRadius: 8, marginBottom: 6, textAlign: "left", textDecoration: "none" }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{resource.group === "podcasts" ? "\uD83C\uDFA7" : resource.group === "guidelines" ? "\uD83D\uDCCB" : resource.group === "tools" ? "\uD83D\uDEE0" : "\uD83C\uDF10"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{resource.name}</div>
                      <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.45 }}>
                        {resourceGroupLabels[resource.group]} • {resource.tag}
                      </div>
                    </div>
                    <span style={{ color: T.muted, fontSize: 14, flexShrink: 0 }}>{"\u2197"}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No content fallback */}
        {content.studySheets.length === 0 && content.articles.length === 0 && content.cases.length === 0 && content.quizWeeks.length === 0 && content.trials.length === 0 && content.resources.length === 0 && (
          <div style={{ background: T.card, borderRadius: 12, padding: 20, border: `1px dashed ${T.line}`, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: T.muted }}>No dedicated content yet for this topic. Content is being expanded.</div>
          </div>
        )}
      </div>
    );
  }

  // Topic grid view
  const topicsWithContent = TOPICS.filter(t => t !== "Other");
  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>{"\u2190"} Back</button>
      <h2 style={{ color: T.navy, fontFamily: T.serif, fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Browse by Topic</h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px" }}>Explore resources by nephrology topic, independent of weekly schedule</p>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
        {topicsWithContent.map(topic => {
          const hasContent = topicHasContent(topic);
          const content = getTopicContent(topic);
          const coreItems = content.studySheets.length + content.cases.length + content.quizWeeks.length;
          const optionalItems = content.articles.length + content.trials.length + content.resources.length;
          const totalItems = coreItems + optionalItems;
          return (
            <button key={topic} onClick={() => setSelectedTopic(topic)}
              style={{ background: T.card, borderRadius: 10, padding: "12px 10px", border: `1px solid ${hasContent ? T.line : T.line}`, cursor: "pointer", textAlign: "left", opacity: hasContent ? 1 : 0.6 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, lineHeight: 1.3 }}>{topic}</div>
              <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>
                {totalItems > 0
                  ? `${coreItems} core${optionalItems > 0 ? ` • ${optionalItems} optional` : ""}`
                  : "Coming soon"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
