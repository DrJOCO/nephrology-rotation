import React from "react";
import { T, WEEKLY } from "../../../data/constants";
import type { NavigateFn, ArticlesData, WeeklyData } from "../types";
import type { ClinicGuideRecord } from "../../../types";

export function ContentTab({ navigate, articles, curriculum, clinicGuides }: { navigate: NavigateFn; articles: ArticlesData; curriculum: WeeklyData; clinicGuides: ClinicGuideRecord[] }) {
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: T.text, fontSize: 20, margin: "0 0 16px", fontFamily: T.serif, fontWeight: 700 }}>Manage Content</h2>

      {/* Curriculum */}
      <button onClick={() => navigate("content", { type: "editCurriculum" })}
        style={{ display: "block", width: "100%", background: T.card, borderRadius: 14, padding: 18, marginBottom: 12, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: T.ice, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📚</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Weekly Curriculum</div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>Edit week titles, subtitles, and topics</div>
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
              <div style={{ fontWeight: 600, color: T.text, fontSize: 14 }}>Week {w}: {(curriculum[w] || WEEKLY[w]).title}</div>
              <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{(articles[w] || []).length} articles</div>
            </div>
            <span style={{ color: T.muted, fontSize: 14 }}>›</span>
          </div>
        </button>
      ))}

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

      {/* Friday Clinic Guides */}
      <button onClick={() => navigate("content", { type: "clinicGuides" })}
        style={{ display: "block", width: "100%", background: T.card, borderRadius: 14, padding: 18, marginTop: 12, border: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: T.successBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🩺</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Friday Clinic Guides</div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>Manage weekly CKD, hypertension, and transplant clinic teaching guides ({clinicGuides.length} generated)</div>
          </div>
          <span style={{ color: T.muted, fontSize: 16 }}>›</span>
        </div>
      </button>
    </div>
  );
}
