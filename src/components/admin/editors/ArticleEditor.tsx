import React, { useState } from "react";
import { T } from "../../../data/constants";
import { adminInput, adminLabel } from "../shared";
import type { ArticlesData } from "../types";
import { backBtn, tinyBtn } from "../lib/styles";

export function ArticleEditor({ week, articles, setArticles, onBack }: { week: number; articles: ArticlesData; setArticles: React.Dispatch<React.SetStateAction<ArticlesData>>; onBack: () => void }) {
  const weekArticles = articles[week] || [];
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", journal: "", year: "", url: "", topic: "", type: "Review" });
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const save = () => {
    if (!form.title.trim() || !form.url.trim()) return;
    const entry = { ...form, year: parseInt(form.year) || 2024 };
    setArticles(prev => {
      const copy = { ...prev };
      const arr = [...(copy[week] || [])];
      if (editIdx !== null) { arr[editIdx] = entry; }
      else { arr.push(entry); }
      copy[week] = arr;
      return copy;
    });
    setForm({ title: "", journal: "", year: "", url: "", topic: "", type: "Review" });
    setShowAdd(false);
    setEditIdx(null);
  };

  const remove = (idx: number) => {
    setArticles(prev => {
      const copy = { ...prev };
      copy[week] = (copy[week] || []).filter((_: unknown, i: number) => i !== idx);
      return copy;
    });
  };

  const startEdit = (idx: number) => {
    const a = weekArticles[idx];
    setForm({ title: a.title, journal: a.journal, year: a.year.toString(), url: a.url, topic: a.topic, type: a.type });
    setEditIdx(idx);
    setShowAdd(true);
  };

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtn}>← Back</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: 0, fontWeight: 700 }}>Module {week} Articles</h2>
        <button onClick={() => { setShowAdd(!showAdd); setEditIdx(null); setForm({ title: "", journal: "", year: "", url: "", topic: "", type: "Review" }); }}
          style={{ padding: "8px 14px", background: showAdd ? T.sub : T.warning, color: showAdd ? "white" : T.warningInk, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {showAdd ? "Cancel" : "+ Add Article"}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `2px solid ${T.warning}` }}>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Article Title *</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Full article title" style={adminInput} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={adminLabel}>Journal</label>
              <input value={form.journal} onChange={e => setForm({...form, journal: e.target.value})} placeholder="e.g. NEJM" style={adminInput} />
            </div>
            <div>
              <label style={adminLabel}>Year</label>
              <input type="number" value={form.year} onChange={e => setForm({...form, year: e.target.value})} placeholder="2024" style={adminInput} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>URL *</label>
            <input value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://..." style={adminInput} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={adminLabel}>Topic Tag</label>
              <input value={form.topic} onChange={e => setForm({...form, topic: e.target.value})} placeholder="e.g. AKI" style={adminInput} />
            </div>
            <div>
              <label style={adminLabel}>Type</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={adminInput}>
                <option value="Review">Review</option>
                <option value="Guideline">Guideline</option>
                <option value="Landmark">Landmark Study</option>
                <option value="Case Report">Case Report</option>
              </select>
            </div>
          </div>
          <button onClick={save} style={{ width: "100%", padding: "12px 0", background: T.brand, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {editIdx !== null ? "Update Article" : "Add Article"}
          </button>
        </div>
      )}

      {weekArticles.length === 0 && !showAdd && (
        <div style={{ textAlign: "center", padding: 30, color: T.muted }}>No articles for this week yet</div>
      )}

      {weekArticles.map((a, i) => (
        <div key={i} style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: T.navy, fontSize: 14, lineHeight: 1.3, wordBreak: "break-word" }}>{a.title}</div>
              <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{a.journal} ({a.year})</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.brand, background: T.ice, padding: "2px 8px", borderRadius: 6 }}>{a.type}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.muted, background: T.bg, padding: "2px 8px", borderRadius: 6 }}>{a.topic}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button onClick={() => startEdit(i)} style={tinyBtn}>✏️</button>
              <button onClick={() => remove(i)} style={tinyBtn}>🗑</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
