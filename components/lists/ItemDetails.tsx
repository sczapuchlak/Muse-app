"use client";
import { useState } from "react";
import { LIMITS, type ListItem, type ListSection, type MuseList } from "@/lib/lists/model";
import { anchorFor, itemHistory, periodFor, scheduleState, schedulePresets, type ListEvent, type ListSchedule, type ScheduleMode } from "@/lib/lists/schedule";
import type { Frequency, RecurrenceRule, Weekday } from "@/lib/recurrence";
import { usePlanner } from "../PlannerStore";
import { MuseModal } from "../MuseModal";
import { deleteItem, moveItem, removeEvent, reschedulePeriod, setSchedule, skipPeriod, updateItem } from "./ListsStore";
import { addLinkedTask, linkedTask, moveViaPlanner, skipViaPlanner } from "./taskLink";
import { FieldCell } from "./ListView";

const short = (d: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const modes: { id: ScheduleMode; label: string }[] = [{ id: "flexible", label: "Any day in the period" }, { id: "preferred", label: "Preferred day (movable)" }, { id: "date", label: "Specific date" }];

export function ItemDetails({ item, list, sections, items, events, today, onClose }: { item: ListItem; list: MuseList; sections: ListSection[]; items: ListItem[]; events: ListEvent[]; today: string; onClose: () => void }) {
  const { state: planner, dispatch, status: plannerStatus } = usePlanner(), task = linkedTask(item, planner), linked = item.linkKind === "task";
  const [title, setTitle] = useState(item.title), [notes, setNotes] = useState(item.notes ?? ""), [confirm, setConfirm] = useState(false), [error, setError] = useState("");
  const st = item.schedule ? scheduleState(item.schedule, events, today) : null, period = item.schedule ? periodFor(item.schedule, today) : null;
  const sibs = items.filter((i) => i.sectionId === item.sectionId).sort((a, b) => a.position - b.position), idx = sibs.findIndex((i) => i.id === item.id);
  const saveText = () => { const t = title.trim(); const patch: Partial<ListItem> = {}; if (t && t !== item.title) patch.title = t.slice(0, LIMITS.itemTitle); if ((notes.trim() || null) !== item.notes) patch.notes = notes.trim().slice(0, LIMITS.notes) || null; if (Object.keys(patch).length) void updateItem(item.id, patch); };

  function sendToPlanner() {
    const ws = planner.workspaces[0]?.id; if (!ws) { setError("Create a Planner workspace first, then send this item."); return; }
    const id = addLinkedTask(item, ws, today, dispatch); void updateItem(item.id, { linkKind: "task", linkId: id });
  }
  /** Unlink keeps history: completions the Planner recorded are already copied into this item's history. */
  function unlink() { void updateItem(item.id, { linkKind: null, linkId: null }); }

  return <div className="muse-list-detail">
    <label className="editor-label" htmlFor="li-title">Item</label>
    <input id="li-title" value={title} maxLength={LIMITS.itemTitle} onChange={(e) => setTitle(e.target.value)} onBlur={saveText} />
    <label className="editor-label" htmlFor="li-notes">Notes</label>
    <textarea id="li-notes" rows={2} value={notes} maxLength={LIMITS.notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveText} placeholder="Optional" />
    <div className="muse-list-detail-grid">
      <label>Section<select value={item.sectionId ?? ""} onChange={(e) => void moveItem(item.id, e.target.value || null, 9999)}><option value="">Unsorted</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
      <label>Priority<select value={item.priority ?? ""} onChange={(e) => void updateItem(item.id, { priority: (e.target.value || null) as ListItem["priority"] })}><option value="">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
      {!item.schedule && <label>Due<input type="date" value={item.dueDate ?? ""} onChange={(e) => void updateItem(item.id, { dueDate: e.target.value || null })} /></label>}
    </div>

    <ScheduleEditor item={item} today={today} locked={linked && !!task} />
    {st && period && <section className="muse-list-period" aria-label="This period">
      <p className="small-label">This period: {short(period.start)} – {short(period.end)} · <strong>{st.status === "completed" ? "done" : st.status === "skipped" ? "skipped" : st.status === "rescheduled" ? `moved to ${short(st.planned!)}` : st.status === "upcoming" ? "starts later" : st.planned ? `planned ${short(st.planned)}` : "any day"}</strong>
        {st.lastCompleted ? ` · last done ${short(st.lastCompleted)}` : ""}{st.missedSinceLast ? ` · ${st.missedSinceLast} period${st.missedSinceLast === 1 ? "" : "s"} missed` : ""}</p>
      <div className="muse-list-period-actions">
        <button type="button" className="muse-button button-ghost" onClick={() => task ? skipViaPlanner(item, dispatch, today, st.status !== "skipped") : void skipPeriod(item, today, st.status !== "skipped")}>{st.status === "skipped" ? "Unskip" : "Skip this period"}</button>
        {item.schedule!.mode !== "flexible" && <label className="muse-list-move">Move to<input type="date" min={period.start} max={period.end} value={st.planned && st.planned !== period.start ? st.planned : ""}
          onChange={(e) => task ? moveViaPlanner(item, dispatch, today, e.target.value || null) : void reschedulePeriod(item, today, e.target.value || null)} /></label>}
      </div>
      <ul className="muse-list-history">{itemHistory(item.schedule!, events, today, 6).map((h, i) => <li key={i} data-kind={h.kind}><span className="muse-list-history-kind">{h.kind === "completed" ? "✓" : h.kind === "skipped" ? "↷" : "·"}</span>
        <span><small>{h.kind === "completed" ? `Done ${short(h.date)}` : h.kind === "skipped" ? `Skipped ${short(h.periodStart)}` : `Missed ${short(h.periodStart)}–${short(h.periodEnd)}`}</small></span>
        {h.kind !== "missed" && !task && <button type="button" className="text-button" onClick={() => void removeEvent(item.id, h.periodStart, h.kind as ListEvent["kind"])}>Undo</button>}</li>)}</ul>
    </section>}

    {list.fields.length > 0 && <div className="muse-list-detail-grid">{list.fields.map((f) => <label key={f.id}>{f.name}<FieldCell field={f} item={item} /></label>)}</div>}

    <section className="muse-list-link" aria-label="Planner link">
      {!linked ? <button type="button" className="muse-button button-ghost" onClick={sendToPlanner}>Send to Planner</button>
        : task ? <p className="small-label">Linked to a Planner task{item.schedule ? " — each period’s completion lives on its Planner occurrence" : ""}. <button type="button" className="text-button" onClick={unlink}>Unlink (keeps history)</button></p>
        : <p className="small-label">The linked Planner task was deleted. History is kept here. <button type="button" className="text-button" onClick={unlink}>Unlink</button></p>}
      {(error || (linked && plannerStatus?.error)) && <p className="small-label" role="alert">{error || plannerStatus?.error}</p>}
    </section>

    <div className="muse-list-detail-foot">
      <span><button type="button" className="muse-lists-mini" aria-label="Move up" disabled={idx <= 0} onClick={() => void moveItem(item.id, item.sectionId, idx - 1)}>↑</button>
        <button type="button" className="muse-lists-mini" aria-label="Move down" disabled={idx < 0 || idx >= sibs.length - 1} onClick={() => void moveItem(item.id, item.sectionId, idx + 1)}>↓</button></span>
      <span><button type="button" className="text-button muse-lists-danger" onClick={() => setConfirm(true)}>Delete</button><button type="button" className="muse-button" onClick={() => { saveText(); onClose(); }}>Done</button></span>
    </div>
    {confirm && <MuseModal id="list-item-delete" label="Delete item?" returnFocus={null} onClose={() => setConfirm(false)}>
      <h2>Delete “{item.title}”?</h2><p>Its history is deleted too.{linked ? " The linked Planner task stays in the Planner." : ""}</p>
      <div className="muse-lists-modal-actions"><button type="button" className="muse-button" onClick={() => { setConfirm(false); onClose(); void deleteItem(item.id); }}>Delete item</button><button type="button" className="muse-button button-ghost" onClick={() => setConfirm(false)}>Keep it</button></div>
    </MuseModal>}
  </div>;
}

/** Repeat + mode in one place. Changing it keeps history (missed periods count from the change). */
function ScheduleEditor({ item, today, locked }: { item: ListItem; today: string; locked: boolean }) {
  const s = item.schedule, [custom, setCustom] = useState(false);
  const presetId = s ? schedulePresets.find((p) => JSON.stringify(p.rule(s.anchor)) === JSON.stringify({ freq: s.rule.freq, interval: s.rule.interval }))?.id ?? "custom" : "none";
  const apply = (rule: RecurrenceRule | null, patch: Partial<ListSchedule> = {}) => {
    if (!rule) return void setSchedule(item, null, today);
    const mode = patch.mode ?? s?.mode ?? "flexible";
    const next: ListSchedule = { rule, anchor: patch.anchor ?? (s && !patch.mode ? s.anchor : anchorFor(rule, mode, today)), mode, since: today };
    void setSchedule(item, next, today);
  };
  if (locked) return <p className="small-label muse-list-sched">↻ {s ? "Repeats on its Planner task." : "Linked to Planner."} Unlink to change the schedule here.</p>;
  return <section className="muse-list-sched" aria-label="Schedule">
    <div className="muse-list-detail-grid">
      <label>Repeats<select value={custom ? "custom" : presetId} onChange={(e) => { const v = e.target.value; if (v === "custom") { setCustom(true); if (!s) apply({ freq: "weekly", interval: 1 }); return; } setCustom(false); apply(v === "none" ? null : schedulePresets.find((p) => p.id === v)!.rule(s?.anchor ?? today)); }}>
        <option value="none">Doesn’t repeat</option>{schedulePresets.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}<option value="custom">Custom…</option></select></label>
      {s && <label>How<select value={s.mode} onChange={(e) => apply(s.rule, { mode: e.target.value as ScheduleMode })}>{modes.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>}
      {s && <label>{s.mode === "flexible" ? "Periods start" : "First date"}<input type="date" value={s.anchor} onChange={(e) => e.target.value && apply(s.rule, { anchor: e.target.value })} /></label>}
    </div>
    {s && (custom || presetId === "custom") && <div className="muse-list-custom">
      <label>Every<input type="number" min={1} max={99} value={s.rule.interval} onChange={(e) => { const n = Math.max(1, Math.min(99, Number(e.target.value) || 1)); apply({ ...s.rule, interval: n }); }} /></label>
      <select aria-label="Unit" value={s.rule.freq} onChange={(e) => apply({ freq: e.target.value as Frequency, interval: s.rule.interval })}><option value="daily">days</option><option value="weekly">weeks</option><option value="monthly">months</option><option value="yearly">years</option></select>
      {s.rule.freq === "weekly" && <div className="muse-chip-row" role="group" aria-label="On days">{days.map((d, i) => { const on = (s.rule.weekdays ?? []).includes(i as Weekday);
        return <button key={d} type="button" aria-pressed={on} onClick={() => { const set = new Set(s.rule.weekdays ?? []); if (on) set.delete(i as Weekday); else set.add(i as Weekday); apply({ ...s.rule, weekdays: set.size ? [...set].sort() as Weekday[] : undefined }); }}>{d}</button>; })}</div>}
    </div>}
    {s && <p className="small-label">Each period starts unchecked; past completions stay in History.</p>}
  </section>;
}
