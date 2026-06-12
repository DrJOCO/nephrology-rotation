import { lazy } from "react";
import { Bookmark } from "lucide-react";
import { T, WEEKLY, ARTICLES, CURRICULUM_DECKS } from "../../data/constants";
import { WEEKLY_CASES } from "../../data/cases";
import { WEEKLY_QUIZZES } from "../../data/quizzes";
import type { ClinicGuideTemplates } from "../../data/clinicGuides";
import type { StudySheetsData } from "../../utils/studySheets";
import type { Bookmarks, ClinicGuideRecord, CompletedItems, SubView, WeeklyScores } from "../../types";

// Lazy like the parent shell so these stay in their own chunks; LibraryHub
// renders inside StudentApp's <Suspense> boundary.
const GuideTab = lazy(() => import("./GuideTab"));
const RefsTab = lazy(() => import("./RefsTab"));

// ─────────────────────────────────────────────────────────────────────────
// LibraryHub — Phase 3a shell (spec §03). Landing page for the Library tab.
// For now it simply stacks the existing Guide and Refs sections behind a common
// heading. Phase 3b+ restructures to the spec's week-filterable Library layout.
// ─────────────────────────────────────────────────────────────────────────
export default function LibraryHub({
  navigate, clinicGuides, clinicGuideTemplates, currentWeek, totalWeeks, studySheets, completedItems, weeklyScores, bookmarks,
}: {
  navigate: (tab: string, sv?: SubView) => void;
  clinicGuides: ClinicGuideRecord[];
  clinicGuideTemplates: ClinicGuideTemplates;
  currentWeek: number | null;
  totalWeeks: number;
  studySheets: StudySheetsData;
  completedItems: CompletedItems;
  weeklyScores: WeeklyScores;
  bookmarks: Bookmarks;
}) {
  // Cohort feedback (June 2026): a student couldn't find modules outside the
  // current one and gave up. Every module is ALWAYS rendered — short rotations
  // label out-of-window modules "Stretch" instead of hiding them.
  const weeks = Object.keys(WEEKLY).map(Number).sort((a, b) => a - b);
  const windowWeeks = Math.min(Math.max(Math.floor(totalWeeks) || 4, 1), 4);
  const moduleStatus = (week: number): { label: string; color: string; bg: string } | null => {
    if (currentWeek === week) return { label: "Current", color: T.brand, bg: T.brandBg };
    if (week > windowWeeks) return { label: "Stretch · optional", color: T.info, bg: T.infoBg };
    if (currentWeek && week < currentWeek) return { label: "Review", color: T.success, bg: T.successBg };
    return null; // upcoming within the rotation window — no chip needed
  };
  const savedCount = (bookmarks?.trials?.length || 0) + (bookmarks?.articles?.length || 0) + (bookmarks?.cases?.length || 0) + (bookmarks?.studySheets?.length || 0);

  return (
    <div>
      <div style={{ padding: "20px 16px 8px", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>Library</div>
        <h1 style={{ margin: 0, fontFamily: T.serif, fontSize: 28, fontWeight: 600, color: T.ink, letterSpacing: -0.4 }}>Guides &amp; references</h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: T.ink2, lineHeight: 1.5 }}>
          Clinical guides, rotation playbooks, landmark trials, and quick-reference material.
        </p>
        <button
          onClick={() => navigate("today", { type: "bookmarks" })}
          style={{
            marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8,
            background: T.card, border: `1px solid ${T.line}`, borderRadius: 999,
            padding: "8px 14px", minHeight: 40, cursor: "pointer", color: T.ink, fontSize: 13, fontWeight: 700,
          }}
        >
          <Bookmark size={15} strokeWidth={1.75} aria-hidden="true" />
          Saved items
          {savedCount > 0 && (
            <span style={{ background: T.brand, color: T.brandInk, borderRadius: 999, padding: "1px 8px", fontSize: 12, fontWeight: 800 }}>{savedCount}</span>
          )}
        </button>
      </div>
      <section style={{ padding: "16px 16px 4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, color: T.ink, fontFamily: T.serif, fontSize: 20, fontWeight: 700 }}>All modules</h2>
            <p style={{ margin: "5px 0 0", color: T.sub, fontSize: 13, lineHeight: 1.5 }}>
              Study sheets, decks, cases, quizzes, and references by week. Every module stays available all rotation — revisit earlier ones or work ahead anytime.
            </p>
          </div>
          {currentWeek && (
            <div style={{ background: T.infoBg, color: T.info, border: `1px solid ${T.info}`, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 700 }}>
              Current: Module {currentWeek}
            </div>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
          {weeks.map((week) => {
            const wk = WEEKLY[week];
            const status = moduleStatus(week);
            const sheets = studySheets[week] || [];
            const decks = CURRICULUM_DECKS.filter(deck => deck.week === week);
            const cases = WEEKLY_CASES[week] || [];
            const quizTaken = (weeklyScores[week] || []).length > 0;
            const sheetDone = sheets.filter(sheet => completedItems.studySheets?.[sheet.id]).length;
            const deckDone = decks.filter(deck => completedItems.decks?.[deck.id]).length;
            const caseDone = cases.filter(item => completedItems.cases?.[item.id]).length;
            const quizDone = quizTaken ? 1 : 0;
            const quizTotal = WEEKLY_QUIZZES[week]?.length ? 1 : 0;
            const done = sheetDone + deckDone + caseDone + quizDone;
            const total = sheets.length + decks.length + cases.length + quizTotal;
            const referencesTotal = (ARTICLES[week] || []).length;
            const moduleActions: Array<{ label: string; meta: string; onClick: () => void; disabled?: boolean }> = [
              { label: "Study sheets", meta: `${sheetDone}/${sheets.length} complete`, onClick: () => navigate("today", { type: "studySheets", week }), disabled: sheets.length === 0 },
              { label: "Decks", meta: `${deckDone}/${decks.length} reviewed`, onClick: () => navigate("today", { type: "resources", tab: "decks", week }), disabled: decks.length === 0 },
              { label: "Cases", meta: `${caseDone}/${cases.length} done`, onClick: () => navigate("today", { type: "cases", week }), disabled: cases.length === 0 },
              { label: "Quiz", meta: quizTotal ? (quizTaken ? "Attempt saved" : `${WEEKLY_QUIZZES[week].length} questions`) : "None", onClick: () => navigate("today", { type: "weeklyQuiz", week }), disabled: quizTotal === 0 },
              { label: "References", meta: `${referencesTotal} article${referencesTotal !== 1 ? "s" : ""} and trials`, onClick: () => navigate("today", { type: "articles", week }), disabled: referencesTotal === 0 },
            ];

            return (
              <div key={week} style={{ background: T.card, border: `1px solid ${currentWeek === week ? T.brand : T.line}`, borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: currentWeek === week ? T.brand : T.muted, textTransform: "uppercase", letterSpacing: 0.6 }}>
                        Module {week}
                      </span>
                      {status && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: status.color, background: status.bg, borderRadius: 999, padding: "2px 8px" }}>
                          {status.label}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 3, color: T.ink, fontFamily: T.serif, fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{wk.title}</div>
                    <div style={{ marginTop: 4, color: T.sub, fontSize: 13, lineHeight: 1.45 }}>{wk.sub}</div>
                  </div>
                  <div style={{ background: done === total && total > 0 ? T.successBg : T.surface2, color: done === total && total > 0 ? T.success : T.brand, borderRadius: 999, padding: "5px 9px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
                    {done}/{total}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                  {moduleActions.map(action => (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      style={{
                        background: action.disabled ? T.grayBg : T.bg,
                        color: action.disabled ? T.muted : T.ink,
                        border: `1px solid ${T.line}`,
                        borderRadius: 8,
                        padding: "9px 10px",
                        cursor: action.disabled ? "not-allowed" : "pointer",
                        textAlign: "left",
                        minHeight: 58,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}>{action.label}</div>
                      <div style={{ fontSize: 12, color: T.sub, marginTop: 3, lineHeight: 1.3 }}>{action.meta}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <GuideTab
        navigate={navigate as (tab: string, sv?: Record<string, unknown> | null) => void}
        subView={null}
        clinicGuides={clinicGuides}
        clinicGuideTemplates={clinicGuideTemplates}
      />
      <div style={{ padding: "8px 16px", borderTop: `1px solid ${T.line}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: 1.2, margin: "8px 0 4px" }}>Quick references</div>
      </div>
      <RefsTab navigate={navigate} />
    </div>
  );
}
