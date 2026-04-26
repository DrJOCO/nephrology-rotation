import React, { useState } from "react";
import { T, WEEKLY } from "../../../data/constants";
import { adminInput, adminLabel } from "../shared";
import type { WeeklyData } from "../types";
import { backBtn, tinyBtn } from "../lib/styles";

export function CurriculumEditor({ curriculum, setCurriculum, onBack }: { curriculum: WeeklyData; setCurriculum: React.Dispatch<React.SetStateAction<WeeklyData>>; onBack: () => void }) {
  const [editWeek, setEditWeek] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", sub: "", topicsStr: "" });

  const startEdit = (w: number) => {
    const wk = curriculum[w] || WEEKLY[w];
    setForm({ title: wk.title, sub: wk.sub, topicsStr: wk.topics.join(", ") });
    setEditWeek(w);
  };

  const saveEdit = () => {
    if (!form.title.trim() || editWeek === null) return;
    setCurriculum(prev => ({
      ...prev,
      [editWeek]: { title: form.title, sub: form.sub, topics: form.topicsStr.split(",").map(t => t.trim()).filter(Boolean) }
    }));
    setEditWeek(null);
  };

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtn}>← Back</button>
      <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: "0 0 16px", fontWeight: 700 }}>Edit Curriculum</h2>

      {[1,2,3,4].map(w => {
        const wk = curriculum[w] || WEEKLY[w];
        const isEditing = editWeek === w;

        if (isEditing) {
          return (
            <div key={w} style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 12, border: `2px solid ${T.warning}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.warning, marginBottom: 10 }}>EDITING WEEK {w}</div>
              <div style={{ marginBottom: 10 }}>
                <label style={adminLabel}>Title</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={adminInput} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={adminLabel}>Subtitle</label>
                <input value={form.sub} onChange={e => setForm({...form, sub: e.target.value})} style={adminInput} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={adminLabel}>Topics (comma-separated)</label>
                <textarea value={form.topicsStr} onChange={e => setForm({...form, topicsStr: e.target.value})} rows={2} style={{...adminInput, resize: "vertical"}} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveEdit} style={{ flex: 1, padding: "10px 0", background: T.brand, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save</button>
                <button onClick={() => setEditWeek(null)} style={{ flex: 1, padding: "10px 0", background: T.bg, color: T.sub, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          );
        }

        return (
          <div key={w} style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>Week {w}: {wk.title}</div>
                <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{wk.sub}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                  {wk.topics.map(t => (
                    <span key={t} style={{ fontSize: 13, background: T.ice, color: T.navy, padding: "2px 8px", borderRadius: 8, fontWeight: 500 }}>{t}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => startEdit(w)} style={{ ...tinyBtn, fontSize: 13 }}>✏️</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
