"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { MuseIcon } from "../MuseIcon";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { defaultPlanningConfig, type PlanningConfig, type PlanningKind } from "@/lib/agenda";
import { readPlanningConfig, readWeekSection, saveWeekSection, savePlanningConfig, type WeekSection } from "@/lib/planner-week";

/**
 * The Weekly Agenda's fourth column on the second spread (#79): notes or a short checklist for the whole week (for
 * example weekly priorities). Its type and title are saved on the account; its content per week.
 */
export function WeekPlanningColumn({ weekStart }: { weekStart: string }) {
  const client = useMemo(() => createMuseBrowserClient(), []);
  const [userId, setUserId] = useState(""), [config, setConfig] = useState<PlanningConfig>(defaultPlanningConfig);
  const [section, setSection] = useState<WeekSection | null>(null), [status, setStatus] = useState(""), [editing, setEditing] = useState(false), [draft, setDraft] = useState("");
  const latest = useRef<WeekSection | null>(null), timer = useRef<number | null>(null);
  useEffect(() => { let live = true; void (async () => { try { const { data } = await client.auth.getUser(); if (!data.user || !live) return; setUserId(data.user.id); setConfig(await readPlanningConfig(client)); const s = await readWeekSection(client, data.user.id, weekStart); if (live) { latest.current = s; setSection(s); } } catch { if (live) setStatus("Couldn’t load this week’s notes."); } })(); return () => { live = false; }; }, [client, weekStart]);
  async function persist(next: WeekSection) { setStatus("Saving…"); try { const saved = await saveWeekSection(client, userId, next); latest.current = saved; setSection((cur) => cur && cur.weekStart === saved.weekStart ? { ...cur, revision: saved.revision } : cur); setStatus("Saved"); } catch (e) { setStatus(e instanceof Error ? e.message : "Couldn’t save."); } }
  function change(patch: Partial<WeekSection>, delay = 0) { if (!section) return; const next = { ...section, ...patch, revision: latest.current?.revision ?? section.revision }; setSection(next); if (timer.current) window.clearTimeout(timer.current); timer.current = window.setTimeout(() => void persist(next), delay); }
  async function saveConfig(next: PlanningConfig) { setConfig(next); setEditing(false); try { setConfig(await savePlanningConfig(client, next)); } catch { setStatus("Couldn’t save the column settings."); } }
  return <section className="muse-agenda-day muse-agenda-planning" aria-label={config.title}>
    <header className="muse-agenda-planning-head"><h3>{config.title}</h3>
      <button type="button" className="muse-agenda-add" aria-expanded={editing} aria-label="Customize this column" onClick={() => setEditing(!editing)}><MuseIcon name="settings" size={13} /></button></header>
    {editing && <form className="muse-agenda-planning-settings" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void saveConfig({ kind: f.get("kind") as PlanningKind, title: String(f.get("title") ?? "") }); }}>
      <label>Title<input name="title" id="agenda-planning-title" maxLength={40} defaultValue={config.title} /></label>
      <fieldset><legend>Type</legend>
        <label><input type="radio" name="kind" value="checklist" defaultChecked={config.kind === "checklist"} /> Checklist</label>
        <label><input type="radio" name="kind" value="notes" defaultChecked={config.kind === "notes"} /> Notes</label></fieldset>
      <div className="muse-agenda-planning-actions"><button type="submit" className="muse-button">Save</button><button type="button" className="text-button" onClick={() => setEditing(false)}>Cancel</button></div>
    </form>}
    {!section ? <p className="muse-agenda-empty">{status || "Loading…"}</p> : config.kind === "notes"
      ? <textarea className="muse-agenda-planning-notes" aria-label={`${config.title} for the week of ${weekStart}`} maxLength={5000} value={section.notes} placeholder="Anything for this week…" onChange={(e) => change({ notes: e.target.value }, 800)} />
      : <div className="muse-agenda-planning-list">
        <ul>{section.items.map((item) => <li key={item.id} data-done={item.done || undefined}>
          <label><input type="checkbox" checked={item.done} onChange={() => change({ items: section.items.map((i) => i.id === item.id ? { ...i, done: !i.done } : i) })} /><span>{item.text}</span></label>
          <button type="button" className="text-button" aria-label={`Remove ${item.text}`} onClick={() => change({ items: section.items.filter((i) => i.id !== item.id) })}>×</button></li>)}</ul>
        {section.items.length < 40 && <form onSubmit={(e) => { e.preventDefault(); if (!draft.trim()) return; change({ items: [...section.items, { id: crypto.randomUUID(), text: draft.trim().slice(0, 200), done: false }] }); setDraft(""); }}>
          <input id={`agenda-planning-new-${weekStart}`} aria-label={`Add to ${config.title}`} maxLength={200} value={draft} placeholder="Add an item…" onChange={(e) => setDraft(e.target.value)} /></form>}
      </div>}
    <p className="small-label" role="status">{status === "Saved" ? "" : status}</p>
  </section>;
}
