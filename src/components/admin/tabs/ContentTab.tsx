import React from "react";
import { T, WEEKLY } from "../../../data/constants";
import type { NavigateFn, ArticlesData, WeeklyData } from "../types";
import type { ClinicGuideRecord } from "../../../types";
import type { StudySheetsData } from "../../../utils/studySheets";

export function ContentTab({ navigate, articles, curriculum, clinicGuides, studySheets }: { navigate: NavigateFn; articles: ArticlesData; curriculum: WeeklyData; clinicGuides: ClinicGuideRecord[]; studySheets: StudySheetsData }) {
  const studySheetCount = Object.values(studySheets).reduce((count, sheets) => count + sheets.length, 0);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 20, margin: "0 0 16px", fontFamily: T.serif, fontWeight: 700 }}>Manage Content</h2>

      {/* Curriculum */}
      <button onClick={() => navigate("content", { type: "editCurriculum" })}
        style={{ display: "block", width: "100%", background: T.card, borderRadius: 14, padding: 18, marginBottom: 12, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📚</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Module Curriculum</div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>Edit module titles, subtitles, and topics</div>
          </div>
          <span style={{ color: T.muted, fontSize: 16 }}>›</span>
        </div>
      </button>

      {/* Articles by week */}
      <h3 style={{ color: T.navy, fontSize: 15, margin: "16px 0 10px", fontFamily: T.serif, fontWeight: 700 }}>Journal Articles</h3>
      {[1,2,3,4].map(w => (
        <button key={w} onClick={() => navigate("content", { type: "editArticles", week: w })}
          style={{ display: "block", width: "100%", background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, color: T.text, fontSize: 14 }}>Module {w}: {(curriculum[w] || WEEKLY[w]).title}</div>
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
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Study Sheets</div>
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
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Announcements</div>
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
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Clinic Guides</div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>Edit CKD, hypertension, and transplant guide content plus dated clinic records ({clinicGuides.length} records)</div>
          </div>
          <span style={{ color: T.muted, fontSize: 16 }}>›</span>
        </div>
      </button>
    </div>
  );
}
