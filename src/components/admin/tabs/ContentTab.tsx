import React from "react";
import { STUDY_SHEETS, T, WEEKLY } from "../../../data/constants";
import type { NavigateFn, ArticlesData, WeeklyData } from "../types";
import type { ClinicGuideRecord, StudySheet } from "../../../types";
import type { StudySheetsData } from "../../../utils/studySheets";
import { countCustomizations, type ContentCustomizations } from "../../../utils/contentCustomizations";
import { Button } from "../ui/Button";

const SHEET_TITLES = new Map(
  Object.values(STUDY_SHEETS as Record<number, StudySheet[]>).flat().map((sheet) => [sheet.id, sheet.title]),
);

function customizationLabels(customizations: ContentCustomizations): string[] {
  return [
    ...customizations.curriculum.map((week) => `Module ${week} curriculum`),
    ...customizations.articles.map((week) => `Module ${week} articles`),
    ...customizations.studySheets.map((id) => `Study sheet: ${SHEET_TITLES.get(id) || id}`),
    ...customizations.clinicGuideTemplates.map((topic) => `Clinic guide: ${topic}`),
  ];
}

// Shows which content this rotation keeps as its own version. Everything else
// follows the latest built-in content automatically (utils/contentCustomizations).
export function ContentSourceCard({ customizations, onUseBuiltIn }: { customizations: ContentCustomizations; onUseBuiltIn: () => void }) {
  const count = countCustomizations(customizations);
  return (
    <div style={{ background: count ? T.warningBg : T.successBg, border: `1px solid ${count ? T.warning : T.success}55`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
      <div style={{ color: T.ink, fontSize: 15, fontWeight: 800 }}>
        {count === 0 ? "Using the latest built-in content" : `${count} item${count === 1 ? "" : "s"} customized for this rotation`}
      </div>
      <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.5, marginTop: 3 }}>
        {count === 0
          ? "Nothing here has been edited, so every app update reaches students automatically. Anything you edit below stays your version."
          : "These keep your edited version. Everything else updates automatically whenever the app is updated."}
      </div>
      {count > 0 && (
        <>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: T.ink, fontSize: 13, lineHeight: 1.6 }}>
            {customizationLabels(customizations).map((label) => <li key={label}>{label}</li>)}
          </ul>
          <div style={{ marginTop: 10 }}>
            <Button onClick={onUseBuiltIn}>Use built-in for everything</Button>
          </div>
        </>
      )}
    </div>
  );
}

export function ContentTab({ navigate, articles, curriculum, clinicGuides, studySheets, contentCustomizations, onUseBuiltIn }: { navigate: NavigateFn; articles: ArticlesData; curriculum: WeeklyData; clinicGuides: ClinicGuideRecord[]; studySheets: StudySheetsData; contentCustomizations?: ContentCustomizations; onUseBuiltIn?: () => void }) {
  const studySheetCount = Object.values(studySheets).reduce((count, sheets) => count + sheets.length, 0);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.ink, fontSize: 20, margin: "0 0 16px", fontFamily: T.serif, fontWeight: 700 }}>Manage Content</h2>
      {contentCustomizations && onUseBuiltIn && <ContentSourceCard customizations={contentCustomizations} onUseBuiltIn={onUseBuiltIn} />}

      {/* Curriculum */}
      <button onClick={() => navigate("content", { type: "editCurriculum" })}
        style={{ display: "block", width: "100%", background: T.card, borderRadius: 14, padding: 18, marginBottom: 12, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📚</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: T.ink, fontSize: 15 }}>Module Curriculum</div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>Edit module titles, subtitles, and topics</div>
          </div>
          <span style={{ color: T.muted, fontSize: 16 }}>›</span>
        </div>
      </button>

      {/* Articles by week */}
      <h3 style={{ color: T.ink, fontSize: 15, margin: "16px 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Journal Articles</h3>
      {[1,2,3,4].map(w => (
        <button key={w} onClick={() => navigate("content", { type: "editArticles", week: w })}
          style={{ display: "block", width: "100%", background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, color: T.ink, fontSize: 14 }}>Module {w}: {(curriculum[w] || WEEKLY[w]).title}</div>
              <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{(articles[w] || []).length} articles</div>
            </div>
            <span style={{ color: T.muted, fontSize: 14 }}>›</span>
          </div>
        </button>
      ))}

      {/* Study Sheets */}
      <button onClick={() => navigate("content", { type: "editStudySheets" })}
        style={{ display: "block", width: "100%", background: T.card, borderRadius: 14, padding: 18, marginTop: 16, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: T.infoBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📋</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: T.ink, fontSize: 15 }}>Study Sheets</div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>Edit student-facing sheet text, sections, and trial callouts ({studySheetCount} sheets)</div>
          </div>
          <span style={{ color: T.muted, fontSize: 16 }}>›</span>
        </div>
      </button>

      {/* Announcements */}
      <button onClick={() => navigate("content", { type: "announcements" })}
        style={{ display: "block", width: "100%", background: T.card, borderRadius: 14, padding: 18, marginTop: 16, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: T.warningBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📢</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: T.ink, fontSize: 15 }}>Announcements</div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>Post notes or reminders for students</div>
          </div>
          <span style={{ color: T.muted, fontSize: 16 }}>›</span>
        </div>
      </button>

      {/* Clinic Guides */}
      <button onClick={() => navigate("content", { type: "clinicGuides" })}
        style={{ display: "block", width: "100%", background: T.card, borderRadius: 14, padding: 18, marginTop: 12, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: T.successBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🩺</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: T.ink, fontSize: 15 }}>Clinic Guides</div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>Edit CKD, DKD, lupus nephritis, hypertension, and transplant guide content plus dated clinic records ({clinicGuides.length} records)</div>
          </div>
          <span style={{ color: T.muted, fontSize: 16 }}>›</span>
        </div>
      </button>
    </div>
  );
}
