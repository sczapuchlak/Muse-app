"use client";
import { MuseIcon } from "../MuseIcon";
import {accentStyle} from "@/lib/appearance-values";
import { useEffect, useState } from "react";
import type { PlannedTask } from "@/lib/models";
import { runningMinutes } from "@/lib/planner";
import { PlannerPersistenceStatus,PlannerCapture,usePlannerDraft,usePlanner } from "../PlannerStore";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { TaskMoveControl } from "./TaskMoveControl";
import { MuseDrawer } from "../MuseDrawer";
import { useMuseSpark } from "../MuseSpark";
import { RecurrenceEditor, RecurrenceScopeChoice } from "./RecurrenceEditor";
import { resolveTask, splitChange, taskRule } from "@/lib/planner-occurrences";
import { ruleLabel, type EditScope, type RecurrenceRule } from "@/lib/recurrence";
import { dateLabel, todayInTimeZone } from "@/lib/dates";

type Subtask = PlannedTask["subtasks"][number];
function SubtaskRow({ item, onChange, onDelete }: { item: Subtask; onChange: (item: Subtask) => void; onDelete: () => void }) {
  const { trigger, spark } = useMuseSpark();
  const draft=usePlannerDraft(`subtask-title/${item.id}`,item.title),{canEdit}=usePlanner();
  function save(){if(!canEdit)return;if(draft.dirty&&draft.value.trim())onChange({...item,title:draft.value.trim()});draft.clear();}
  return <li><label className="muse-subtask-check"><input type="checkbox" checked={item.complete} aria-label={`Complete subtask: ${item.title}`} onChange={(event) => { if (event.target.checked) trigger(); onChange({ ...item, complete: event.target.checked }); }} />{spark}</label>
    <input type="text" aria-label="Subtask title" maxLength={160} value={draft.value} onChange={(event) => draft.set(event.target.value)} onBlur={save} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();save();}if(event.key==='Escape'){event.preventDefault();event.stopPropagation();draft.clear();}}} />
    <button className="text-button" type="button" aria-label={`Delete subtask: ${item.title}`} onClick={onDelete}>×</button></li>;
}

export function TaskDetails({ taskId, onClose, returnFocus }: { taskId: string; onClose: () => void; returnFocus: HTMLElement | null }) {
  const { state, dispatch,canEdit } = usePlanner();
  // Recurrence 2.0 (#89): an occurrence id resolves to its series, shown with that date's state.
  const resolved = resolveTask(state, taskId), task = resolved?.task;
  const titleDraft=usePlannerDraft(`task-title/${taskId}`,task?.title??''),title=titleDraft.value;
  const [subtask, setSubtask] = useState("");
  const [now, setNow] = useState(() => new Date().toISOString());
  const { trigger, spark } = useMuseSpark();
  const running = state.activeTimer?.taskId === taskId;
  useEffect(() => { if (!running) return; const timer = setInterval(() => setNow(new Date().toISOString()), 1000); return () => clearInterval(timer); }, [running]);
  if (!task) return null;
  function update(patch: Partial<Omit<PlannedTask, "id" | "kind" | "createdAt">>) { dispatch({ type: "task/update", id: taskId, patch }); }
  function saveTitle(){if(!canEdit&&titleDraft.dirty)return false;if(titleDraft.dirty&&title.trim()&&title.trim()!==task?.title)update({title:title.trim()});titleDraft.clear();return true;}
  return <MuseDrawer title="Task details" onClose={() => { if(saveTitle())onClose(); }} returnFocus={returnFocus}>
    <PlannerPersistenceStatus activityOnly/><PlannerCapture><div className="muse-task-details">
      <label className="editor-label">Title<input type="text" required maxLength={160} value={title} onChange={(event) => {titleDraft.set(event.target.value);}} onBlur={saveTitle} /></label>
      {resolved?.series && !resolved.occurrenceDate ? <p className="small-label muse-detail-complete">↻ Repeats. Each date is checked off on its own day.</p> : <label className="muse-detail-complete"><input type="checkbox" checked={task.complete} onChange={(event) => { if (event.target.checked) trigger(); dispatch({ type: "task/toggle", id: taskId, now: new Date().toISOString() }); }} />{resolved?.occurrenceDate ? "Done for this date" : "Completed"}{spark}</label>}
      <RepeatSection key={taskId} taskId={taskId} />
      <div className="muse-detail-fields">
        <div><p className="editor-label">Workspace</p><MuseChoiceMenu label="Task workspace" valueLabel={state.workspaces.find((item)=>item.id===task.workspaceId)?.name??"Workspace"} options={state.workspaces.map((item)=>({id:item.id,label:item.name,accent:item.accent}))} selectedIds={[task.workspaceId]} onSelect={(workspaceId)=>update({workspaceId})}/></div>
        <div><p className="editor-label">Legacy workspace tag</p><MuseChoiceMenu label="Legacy workspace tag" valueLabel={state.groups.find((item)=>item.id===task.groupId)?.name??"No legacy tag"} options={[{id:"",label:"No legacy tag"},...state.groups.filter((item)=>item.workspaceId===task.workspaceId).map((item)=>({id:item.id,label:item.name}))]} selectedIds={[task.groupId??""]} onSelect={(groupId)=>update({groupId:groupId||undefined})}/></div>
        <div className="muse-planned-field"><div><label htmlFor="task-planned-date">Planned date</label><TaskMoveControl task={task}/></div><input id="task-planned-date" type="date" value={task.plannedDate ?? ""} onChange={(event) => dispatch({ type: "task/move", id: taskId, date: event.target.value || undefined })} /></div>
        <label><span>Due date</span><input type="date" value={task.dueDate ?? ""} onChange={(event) => update({ dueDate: event.target.value || undefined })} /></label>
        <label><span>Time slot</span><input type="time" value={task.timeSlot ?? ""} onChange={(event) => update({ timeSlot: event.target.value || undefined })} /></label>
        <label><span>Estimate (minutes)</span><input type="number" min={0} step={1} value={task.estimatedMinutes ?? ""} onChange={(event) => update({ estimatedMinutes: event.target.value === "" ? undefined : Math.max(0, Number(event.target.value)) })} /></label>
      </div>
      <fieldset className="muse-detail-tags"><legend>Tags</legend>{state.tags.map((tag) => <button key={tag.id} type="button" className="choice-button" data-accent={tag.accent} style={accentStyle(tag.accent)} aria-pressed={task.tagIds.includes(tag.id)} onClick={() => update({ tagIds: task.tagIds.includes(tag.id) ? task.tagIds.filter((id) => id !== tag.id) : [...task.tagIds, tag.id] })}>#{tag.name}</button>)}</fieldset>
      <label className="editor-label">Notes<textarea rows={3} value={task.notes ?? ""} onChange={(event) => update({ notes: event.target.value })} placeholder="A little context…" /></label>
      <section className="muse-detail-section" aria-labelledby="task-subtasks"><h3 id="task-subtasks">Subtasks <span className="small-label">{task.subtasks.filter((item) => item.complete).length}/{task.subtasks.length}</span></h3>
        <ul className="muse-subtask-list">{task.subtasks.map((item) => <SubtaskRow key={item.id} item={item} onChange={(next) => update({ subtasks: task.subtasks.map((entry) => entry.id === item.id ? next : entry) })} onDelete={() => update({ subtasks: task.subtasks.filter((entry) => entry.id !== item.id) })} />)}</ul>
        <form className="muse-task-quick-add" onSubmit={(event) => { event.preventDefault(); if (!subtask.trim()) return; update({ subtasks: [...task.subtasks, { id: crypto.randomUUID(), title: subtask.trim(), complete: false }] }); setSubtask(""); }}><input type="text" maxLength={160} aria-label="New subtask title" placeholder="Add a subtask…" value={subtask} onChange={(event) => setSubtask(event.target.value)} /><button type="submit" disabled={!subtask.trim()} aria-label="Add subtask"><MuseIcon name="plus" size={16} /></button></form>
      </section>
      <section className="muse-detail-section" aria-labelledby="task-time"><h3 id="task-time">Time spent</h3><div className="muse-task-timer"><output aria-label="Actual time spent">{Math.floor(task.actualMinutes + runningMinutes(state, taskId, now))}m actual</output><button type="button" className="muse-button" disabled={task.complete} onClick={() => dispatch(running ? { type: "timer/pause", now: new Date().toISOString() } : { type: "timer/start", id: taskId, now: new Date().toISOString() })}>{running ? "Pause timer" : "Start timer"}</button></div></section>
      <button className="text-button muse-delete-task" type="button" onClick={() => { dispatch({ type: "task/delete", id: taskId, now: new Date().toISOString() }); onClose(); }}>Delete task</button>
    </div></PlannerCapture>
  </MuseDrawer>;
}

/**
 * Repeat (#89): the shared recurrence editor for a task. From a later occurrence, the change applies to "this and
 * future" (the series is split there) or the entire series; the first date always edits the series. Changes are
 * applied with an explicit button, so typing an interval never fires a change per keystroke.
 */
function RepeatSection({ taskId }: { taskId: string }) {
  const { state, dispatch, canEdit, timeZone } = usePlanner();
  const resolved = resolveTask(state, taskId);
  const base = resolved?.series ?? resolved?.task ?? null, rule = base ? taskRule(base) : null, start = base?.plannedDate;
  const fromDate = resolved?.occurrenceDate ?? null, later = !!fromDate && !!start && fromDate > start;
  const [draft, setDraft] = useState<RecurrenceRule | null>(rule), [scope, setScope] = useState<EditScope>(later ? "future" : "series");
  const today = timeZone ? todayInTimeZone(timeZone) : new Date().toISOString().slice(0, 10);
  if (!base) return null;
  if (!start) return <p className="small-label muse-task-repeat">Give it a planned date to make it repeat.</p>;
  const changed = JSON.stringify(draft) !== JSON.stringify(rule), now = () => new Date().toISOString();
  function apply() {
    if (!base || !start) return;
    if (later && scope === "future" && rule) dispatch({ type: "recurrence", now: now(), change: splitChange("task", base.id, start, rule, fromDate!, draft, crypto.randomUUID()) });
    else dispatch({ type: "recurrence", now: now(), change: { op: "task/rule", taskId: base.id, rule: draft } });
  }
  return <section className="muse-task-repeat" aria-label="Repeat">
    <RecurrenceEditor value={draft} start={start} today={today} onChange={setDraft} />
    {later && rule && changed && <RecurrenceScopeChoice value={scope} onChange={setScope} allowed={["future", "series"]} />}
    {changed && <div className="editor-actions"><button type="button" className="muse-button button-primary" disabled={!canEdit} onClick={apply}>{draft ? "Apply repeat" : "Stop repeating"}</button><button type="button" className="text-button" onClick={() => setDraft(rule)}>Cancel</button></div>}
    {fromDate && <div className="muse-occurrence-actions"><p className="small-label">The {dateLabel(fromDate)} date of “{base.title}”{rule ? ` · ${ruleLabel(rule, start)}` : ""}.</p>
      <button type="button" className="muse-button" disabled={!canEdit} onClick={() => dispatch({ type: "task/delete", id: taskId, now: now() })}>Skip this date</button></div>}
  </section>;
}
