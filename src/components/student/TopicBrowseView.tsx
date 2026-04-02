import { useState } from "react";
import { T, TOPICS, ARTICLES, STUDY_SHEETS } from "../../data/constants";
import { WEEKLY_CASES } from "../../data/cases";
import { getTopicContent, topicHasContent } from "../../utils/topicMapping";
import { useIsMobile } from "../../utils/helpers";
import { backBtnStyle } from "./shared";

interface TopicBrowseViewProps {
  onBack: () => void;
  navigate: (tab: string, sv?: Record<string, unknown> | null) => void;
  completedItems?: {
    articles?: Record<string, boolean>;
    studySheets?: Record<string, boolean>;
    cases?: Record<string, unknown>;
  };
}

export default function TopicBrowseView({ onBack, navigate, completedItems }: TopicBrowseViewProps) {
  const isMobile = useIsMobile();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const completed = completedItems || {};

  if (selectedTopic) {
    const content = getTopicContent(selectedTopic);
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => setSelectedTopic(null)} style={backBtnStyle}>{"\u2190"} All Topics</button>
        <h2 style={{ color: T.navy, fontFamily: T.serif, fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>{selectedTopic}</h2>
        <p style={{ color: T.sub, fontSize: 12, margin: "0 0 16px" }}>All available resources for this topic</p>

        {/* Study Sheets */}
        {content.studySheets.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Study Sheets</div>
            {content.studySheets.map(s => {
              const sheet = (STUDY_SHEETS[s.week] || []).find(sh => sh.id === s.id);
              if (!sheet) return null;
              const done = !!completed.studySheets?.[s.id];
              return (
                <button key={s.id} onClick={() => navigate("home", { type: "studySheets", week: s.week })}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: done ? T.greenBg : T.card, border: `1px solid ${done ? T.greenAlpha : T.line}`, borderRadius: 8, marginBottom: 6, cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{sheet.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{sheet.title}</div>
                    <div style={{ fontSize: 10, color: T.muted }}>Week {s.week} {done ? " \u2022 Completed" : ""}</div>
                  </div>
                  <span style={{ color: T.muted, fontSize: 14, flexShrink: 0 }}>{"\u203A"}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Articles */}
        {content.articles.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Journal Articles</div>
            {content.articles.map(a => {
              const article = (ARTICLES[a.week] || []).find(art => art.url === a.url);
              if (!article) return null;
              const done = !!completed.articles?.[a.url];
              return (
                <button key={a.url} onClick={() => navigate("home", { type: "articles", week: a.week })}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: done ? T.greenBg : T.card, border: `1px solid ${done ? T.greenAlpha : T.line}`, borderRadius: 8, marginBottom: 6, cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{"\uD83D\uDCC4"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{article.title}</div>
                    <div style={{ fontSize: 10, color: T.muted }}>{article.journal} ({article.year}) {done ? " \u2022 Read" : ""}</div>
                  </div>
                  <span style={{ color: T.muted, fontSize: 14, flexShrink: 0 }}>{"\u203A"}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Cases */}
        {content.cases.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Clinical Cases</div>
            {content.cases.map(c => {
              const cs = (WEEKLY_CASES[c.week] || []).find(ca => ca.id === c.id);
              if (!cs) return null;
              const done = !!completed.cases?.[c.id];
              return (
                <button key={c.id} onClick={() => navigate("home", { type: "cases", week: c.week })}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: done ? T.greenBg : T.card, border: `1px solid ${done ? T.greenAlpha : T.line}`, borderRadius: 8, marginBottom: 6, cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{"\uD83C\uDFE5"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{cs.title}</div>
                    <div style={{ fontSize: 10, color: T.muted }}>Week {c.week} \u2022 {cs.difficulty} {done ? " \u2022 Done" : ""}</div>
                  </div>
                  <span style={{ color: T.muted, fontSize: 14, flexShrink: 0 }}>{"\u203A"}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Quiz link */}
        {content.quizWeeks.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Related Quizzes</div>
            {content.quizWeeks.map(w => (
              <button key={w} onClick={() => navigate("home", { type: "weeklyQuiz", week: w })}
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

        {/* No content fallback */}
        {content.studySheets.length === 0 && content.articles.length === 0 && content.cases.length === 0 && content.quizWeeks.length === 0 && (
          <div style={{ background: T.card, borderRadius: 12, padding: 20, border: `1px dashed ${T.line}`, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: T.muted }}>No dedicated content yet for this topic. Content is being expanded.</div>
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
      <p style={{ color: T.sub, fontSize: 12, margin: "0 0 16px" }}>Explore resources by nephrology topic, independent of weekly schedule</p>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
        {topicsWithContent.map(topic => {
          const hasContent = topicHasContent(topic);
          const content = getTopicContent(topic);
          const totalItems = content.studySheets.length + content.articles.length + content.cases.length;
          return (
            <button key={topic} onClick={() => setSelectedTopic(topic)}
              style={{ background: T.card, borderRadius: 10, padding: "12px 10px", border: `1px solid ${hasContent ? T.line : T.line}`, cursor: "pointer", textAlign: "left", opacity: hasContent ? 1 : 0.6 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, lineHeight: 1.3 }}>{topic}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>
                {totalItems > 0 ? `${totalItems} resource${totalItems !== 1 ? "s" : ""}` : "Coming soon"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
