import { useState } from "react";
import { T, TOPICS } from "../../data/constants";
import { inputLabel, inputStyle } from "./shared";

function PatientCard({ p, topicColor, onToggle, onRemove, dimmed, isEditing, editForm, onStartEdit, onCancelEdit, onSaveEdit, onEditChange, onEditToggleTopic, onAddFollowUp, onRemoveFollowUp }) {
  const [followUpText, setFollowUpText] = useState("");
  const [showFollowUps, setShowFollowUps] = useState(false);

  // Backwards compat: old patients have p.topic (string), new have p.topics (array)
  const topics = p.topics || (p.topic ? [p.topic] : []);
  const followUps = p.followUps || [];
  const primaryColor = topicColor(topics[0] || "Other");

  const handleAddFollowUp = () => {
    if (!followUpText.trim()) return;
    onAddFollowUp(p.id, followUpText);
    setFollowUpText("");
  };

  if (isEditing) {
    return (
      <div style={{ background: T.card, borderRadius: 10, padding: 12, marginBottom: 10, border: `2px solid ${T.med}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.med, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Editing Patient</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={inputLabel}>Initials</label>
            <input value={editForm.initials} onChange={e => onEditChange({...editForm, initials: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label style={inputLabel}>Room #</label>
            <input value={editForm.room} onChange={e => onEditChange({...editForm, room: e.target.value})} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={inputLabel}>Diagnosis</label>
          <input value={editForm.dx} onChange={e => onEditChange({...editForm, dx: e.target.value})} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={inputLabel}>Topics</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {TOPICS.map(t => {
              const sel = editForm.topics.includes(t);
              return (
                <button key={t} type="button" onClick={() => onEditToggleTopic(t)}
                  style={{ padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: sel ? 600 : 400, cursor: "pointer",
                    background: sel ? T.med : T.card, color: sel ? "white" : T.sub,
                    border: sel ? `1.5px solid ${T.med}` : `1.5px solid ${T.line}` }}>
                  {sel ? "✓ " : ""}{t}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={inputLabel}>Notes</label>
          <textarea value={editForm.notes} onChange={e => onEditChange({...editForm, notes: e.target.value})} rows={2} style={{...inputStyle, resize: "vertical"}} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onSaveEdit} style={{ flex: 1, padding: "10px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save</button>
          <button onClick={onCancelEdit} style={{ flex: 1, padding: "10px 0", background: T.bg, color: T.sub, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: T.card, borderRadius: 10, marginBottom: 10, overflow: "hidden",
      opacity: dimmed ? 0.55 : 1, border: `1px solid ${T.line}`, borderLeftWidth: 4, borderLeftColor: primaryColor }}>
      <div style={{ padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{p.initials}</span>
              {p.room && <span style={{ fontSize: 11, color: T.sub, background: T.bg, padding: "2px 8px", borderRadius: 4 }}>Rm {p.room}</span>}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
              {topics.map(t => (
                <span key={t} style={{ fontSize: 10, color: "white", background: topicColor(t), padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{t}</span>
              ))}
            </div>
            {p.dx && <div style={{ fontSize: 13, color: T.text, marginBottom: 2, wordBreak: "break-word" }}>{p.dx}</div>}
            {p.notes && <div style={{ fontSize: 11, color: T.sub, fontStyle: "italic", marginTop: 4, wordBreak: "break-word" }}>💡 {p.notes}</div>}
            <div style={{ fontSize: 10, color: T.muted, marginTop: 6 }}>Added {new Date(p.date).toLocaleDateString()}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {!dimmed && (
              <button onClick={onStartEdit} style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 6, padding: "4px 8px", fontSize: 10, cursor: "pointer", color: T.med, fontWeight: 600 }}>✎ Edit</button>
            )}
            <button onClick={onToggle} style={{ background: "none", border: `1px solid ${dimmed ? T.green : T.muted}`, borderRadius: 6, padding: "4px 8px", fontSize: 10, cursor: "pointer", color: dimmed ? T.green : T.sub }}>
              {dimmed ? "↩ Reactivate" : "✓ D/C"}
            </button>
            <button onClick={onRemove} style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 6, padding: "4px 8px", fontSize: 10, cursor: "pointer", color: T.muted }}>✕</button>
          </div>
        </div>
      </div>

      {/* Follow-ups section */}
      <div style={{ borderTop: `1px solid ${T.line}`, padding: "8px 12px" }}>
        {followUps.length > 0 && (
          <button onClick={() => setShowFollowUps(!showFollowUps)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: T.med, fontWeight: 600, padding: "2px 0", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ transform: showFollowUps ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s", display: "inline-block" }}>▸</span>
            Follow-ups ({followUps.length})
          </button>
        )}
        {showFollowUps && followUps.map(f => (
          <div key={f.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "4px 0", marginLeft: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: T.muted }}>{new Date(f.date).toLocaleDateString()} {new Date(f.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              <div style={{ fontSize: 12, color: T.text, wordBreak: "break-word" }}>{f.note}</div>
            </div>
            <button onClick={() => onRemoveFollowUp(p.id, f.id)} style={{ background: "none", border: "none", color: T.muted, fontSize: 12, cursor: "pointer", padding: "0 4px", flexShrink: 0 }}>✕</button>
          </div>
        ))}
        {!dimmed && (
          <div style={{ display: "flex", gap: 6, marginTop: followUps.length > 0 ? 6 : 0 }}>
            <input value={followUpText} onChange={e => setFollowUpText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddFollowUp(); }}
              placeholder="Add follow-up note..."
              style={{ flex: 1, padding: "6px 10px", fontSize: 12, border: `1px solid ${T.line}`, borderRadius: 6, outline: "none", fontFamily: T.sans }} />
            <button onClick={handleAddFollowUp}
              style={{ padding: "6px 12px", background: followUpText.trim() ? T.med : T.pale, color: followUpText.trim() ? "white" : T.muted, border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: followUpText.trim() ? "pointer" : "default" }}>+</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PatientTab({ patients, setPatients }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ initials: "", room: "", dx: "", topics: [], notes: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ initials: "", room: "", dx: "", topics: [], notes: "" });

  const toggleTopic = (t) => {
    setForm(prev => ({
      ...prev,
      topics: prev.topics.includes(t) ? prev.topics.filter(x => x !== t) : [...prev.topics, t],
    }));
  };

  const editToggleTopic = (t) => {
    setEditForm(prev => ({
      ...prev,
      topics: prev.topics.includes(t) ? prev.topics.filter(x => x !== t) : [...prev.topics, t],
    }));
  };

  const addPatient = () => {
    if (!form.initials.trim() || form.topics.length === 0) return;
    setPatients(prev => [{ ...form, id: Date.now(), date: new Date().toISOString(), status: "active", followUps: [] }, ...prev]);
    setForm({ initials: "", room: "", dx: "", topics: [], notes: "" });
    setShowAdd(false);
  };

  const toggle = (id) => setPatients(prev => prev.map(p => p.id === id ? { ...p, status: p.status === "active" ? "discharged" : "active" } : p));
  const remove = (id) => setPatients(prev => prev.filter(p => p.id !== id));

  const startEdit = (patient) => {
    setEditingId(patient.id);
    setEditForm({
      initials: patient.initials || "",
      room: patient.room || "",
      dx: patient.dx || "",
      topics: patient.topics || (patient.topic ? [patient.topic] : []),
      notes: patient.notes || "",
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({ initials: "", room: "", dx: "", topics: [], notes: "" }); };

  const saveEdit = () => {
    if (!editForm.initials.trim() || editForm.topics.length === 0) return;
    setPatients(prev => prev.map(p => p.id === editingId ? { ...p, ...editForm } : p));
    cancelEdit();
  };

  const addFollowUp = (patientId, noteText) => {
    if (!noteText.trim()) return;
    setPatients(prev => prev.map(p => p.id === patientId ? {
      ...p,
      followUps: [...(p.followUps || []), { id: Date.now(), date: new Date().toISOString(), note: noteText.trim() }]
    } : p));
  };

  const removeFollowUp = (patientId, followUpId) => {
    setPatients(prev => prev.map(p => p.id === patientId ? {
      ...p,
      followUps: (p.followUps || []).filter(f => f.id !== followUpId)
    } : p));
  };

  const active = patients.filter(p => p.status === "active");
  const discharged = patients.filter(p => p.status === "discharged");

  const topicColor = (topic) => {
    const map = { AKI: T.accent, CKD: T.purple, Hyponatremia: T.med, Hyperkalemia: T.orange,
      "Acid-Base": T.greenDk, Glomerulonephritis: T.redDeep, "Nephrotic Syndrome": T.orange,
      Dialysis: T.dark, Transplant: T.green, Hypertension: T.purpleAccent };
    return map[topic] || T.med;
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ color: T.text, fontSize: 16, margin: 0, fontFamily: T.serif, fontWeight: 700 }}>Rounding List</h2>
        <button onClick={() => setShowAdd(!showAdd)}
          style={{ padding: "8px 16px", background: showAdd ? T.sub : T.med, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {showAdd ? "Cancel" : "+ Add Patient"}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 16, border: `2px solid ${T.med}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={inputLabel}>Patient Initials</label>
              <input value={form.initials} onChange={e => setForm({...form, initials: e.target.value})} placeholder="e.g. J.S." style={inputStyle} />
            </div>
            <div>
              <label style={inputLabel}>Room #</label>
              <input value={form.room} onChange={e => setForm({...form, room: e.target.value})} placeholder="e.g. 4B-12" style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={inputLabel}>Consult Reason / Diagnosis</label>
            <input value={form.dx} onChange={e => setForm({...form, dx: e.target.value})} placeholder="e.g. AKI in setting of sepsis" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={inputLabel}>Nephrology Topics (select all that apply)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {TOPICS.map(t => {
                const sel = form.topics.includes(t);
                return (
                  <button key={t} type="button" onClick={() => toggleTopic(t)}
                    style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: sel ? 600 : 400, cursor: "pointer", transition: "all 0.15s",
                      background: sel ? T.med : T.card, color: sel ? "white" : T.sub,
                      border: sel ? `1.5px solid ${T.med}` : `1.5px solid ${T.line}` }}>
                    {sel ? "✓ " : ""}{t}
                  </button>
                );
              })}
            </div>
            {form.topics.length === 0 && <div style={{ fontSize: 11, color: T.orange, marginTop: 4 }}>Select at least one topic</div>}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={inputLabel}>Teaching Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Key learning point..."
              rows={2} style={{...inputStyle, resize: "vertical"}} />
          </div>
          <button onClick={addPatient} style={{ width: "100%", padding: "12px 0", background: T.med, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Add to List
          </button>
        </div>
      )}

      {active.length === 0 && !showAdd && (
        <div style={{ textAlign: "center", padding: 40, color: T.sub }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏥</div>
          <div style={{ fontSize: 14 }}>No active patients</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>Tap "+ Add Patient" to track consults</div>
        </div>
      )}

      {active.map(p => <PatientCard key={p.id} p={p} topicColor={topicColor} onToggle={() => toggle(p.id)} onRemove={() => remove(p.id)}
        isEditing={editingId === p.id} editForm={editForm} onStartEdit={() => startEdit(p)} onCancelEdit={cancelEdit} onSaveEdit={saveEdit}
        onEditChange={setEditForm} onEditToggleTopic={editToggleTopic} onAddFollowUp={addFollowUp} onRemoveFollowUp={removeFollowUp} />)}

      {discharged.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, margin: "20px 0 10px", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Completed / Discharged ({discharged.length})
          </div>
          {discharged.map(p => <PatientCard key={p.id} p={p} topicColor={topicColor} onToggle={() => toggle(p.id)} onRemove={() => remove(p.id)} dimmed
            isEditing={editingId === p.id} editForm={editForm} onStartEdit={() => startEdit(p)} onCancelEdit={cancelEdit} onSaveEdit={saveEdit}
            onEditChange={setEditForm} onEditToggleTopic={editToggleTopic} onAddFollowUp={addFollowUp} onRemoveFollowUp={removeFollowUp} />)}
        </>
      )}
    </div>
  );
}
