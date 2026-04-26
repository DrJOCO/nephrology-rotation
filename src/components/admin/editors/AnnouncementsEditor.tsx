import React, { useState } from "react";
import { T } from "../../../data/constants";
import { adminInput, adminLabel } from "../shared";
import type { Announcement } from "../../../types";
import { backBtn, tinyBtn } from "../lib/styles";

export function AnnouncementsEditor({ announcements, setAnnouncements, onBack }: { announcements: Announcement[]; setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>; onBack: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<{ title: string; body: string; priority: Announcement["priority"] }>({ title: "", body: "", priority: "normal" });

  const add = () => {
    if (!form.title.trim()) return;
    setAnnouncements(prev => [{ ...form, id: Date.now(), date: new Date().toISOString() }, ...prev]);
    setForm({ title: "", body: "", priority: "normal" });
    setShowAdd(false);
  };

  const remove = (id: number) => setAnnouncements(prev => prev.filter(a => a.id !== id));

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtn}>← Back</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: 0, fontWeight: 700 }}>Announcements</h2>
        <button onClick={() => setShowAdd(!showAdd)}
          style={{ padding: "8px 14px", background: showAdd ? T.sub : T.warning, color: showAdd ? "white" : T.warningInk, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {showAdd ? "Cancel" : "+ New"}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 16, border: `2px solid ${T.warning}` }}>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Title</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Week 2 quiz due Friday" style={adminInput} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={adminLabel}>Body</label>
            <textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})} rows={3} placeholder="Details..." style={{...adminInput, resize: "vertical"}} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={adminLabel}>Priority</label>
            <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as Announcement["priority"]})} style={adminInput}>
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <button onClick={add} style={{ width: "100%", padding: "12px 0", background: T.brand, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Post Announcement
          </button>
        </div>
      )}

      {announcements.length === 0 && !showAdd && (
        <div style={{ textAlign: "center", padding: 30, color: T.muted }}>No announcements yet</div>
      )}

      {announcements.map(a => {
        const prioColor = a.priority === "urgent" ? T.danger : a.priority === "important" ? T.warning : T.brand;
        return (
          <div key={a.id} style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${T.line}`, borderLeft: `4px solid ${prioColor}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{a.title}</span>
                  {a.priority !== "normal" && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: prioColor, textTransform: "uppercase", background: prioColor + "15", padding: "1px 6px", borderRadius: 4 }}>{a.priority}</span>
                  )}
                </div>
                {a.body && <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.4, wordBreak: "break-word" }}>{a.body}</div>}
                <div style={{ fontSize: 13, color: T.muted, marginTop: 6 }}>{new Date(a.date).toLocaleString()}</div>
              </div>
              <button onClick={() => remove(a.id)} style={tinyBtn}>🗑</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
