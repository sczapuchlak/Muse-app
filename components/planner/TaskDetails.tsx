"use client";
import { useEffect, useState } from "react";
import type { PlannedTask } from "@/lib/models";
import { runningMinutes } from "@/lib/planner";
import { usePlanner } from "../PlannerStore";
import { MuseDrawer } from "../MuseDrawer";
import { useMuseSpark } from "../MuseSpark";

type Subtask = PlannedTask["subtasks"][number];
function SubtaskRow({ item, onChange, onDelete }: { item: Subtask; onChange: (item: Subtask) => void; onDelete: () => void }) {
  const { trigger, spark } = useMuseSpark();
  return <li><label className="muse-subtask-check"><input type="checkbox" checked={item.complete} aria-label={`Complete subtask: ${item.title}`} onChange={(event) => { if (event.target.checked) trigger(); onChange({ ...item, complete: event.target.checked }); }} />{spark}</label>
    <input type="text" aria-label="Subtask title" maxLength={160} value={item.title} onChange={(event) => onChange({ ...item, title: event.target.value })} />
    <button className="text-button" type="button" aria-label={`Delete subtask: ${item.title}`} onClick={onDelete}>×</button></li>;
}

export function TaskDetails({ taskId, onClose, returnFocus }: { taskId: string; onClose: () => void; returnFocus: HTMLElement | null }) {
  const { state, dispatch } = usePlanner();
  const task = state.tasks.find((entry) => entry.id === taskId);
  const [title, setTitle] = useState(task?.title ?? "");
  const [subtask, setSubtask] = useState("");
  const [now, setNow] = useState(() => new Date().toISOString());
  const { trigger, spark } = useMuseSpark();
  const running = state.activeTimer?.taskId === taskId;
  useEffect(() => { if (!running) return; const timer = setInterval(() => setNow(new Date().toISOString()), 1000); return () => clearInterval(timer); }, [running]);
  if (!task) return null;
  const currentTask = task;
  function update(patch: Partial<Omit<PlannedTask, "id" | "kind" | "createdAt">>) { dispatch({ type: "task/update", id: taskId, patch }); }
  return <MuseDrawer title="Task details" onClose={() => { update({ title }); onClose(); }} returnFocus={returnFocus}>
    <div className="muse-task-details">
      <label className="editor-label">Title<input type="text" required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} onBlur={() => { update({ title }); if (!title.trim()) setTitle(currentTask.title); }} /></label>
      <label className="muse-detail-complete"><input type="checkbox" checked={task.complete} onChange={(event) => { if (event.target.checked) trigger(); dispatch({ type: "task/toggle", id: taskId, now: new Date().toISOString() }); }} />Completed{spark}</label>
      <div className="muse-detail-fields">
        <label>Workspace<select value={task.workspaceId} onChange={(event) => update({ workspaceId: event.target.value })}>{state.workspaces.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
        <label>Group<select value={task.groupId ?? ""} onChange={(event) => update({ groupId: event.target.value || undefined })}><option value="">No group</option>{state.groups.filter((entry) => entry.workspaceId === task.workspaceId).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
        <label>Planned date<input type="date" value={task.plannedDate ?? ""} onChange={(event) => dispatch({ type: "task/move", id: taskId, date: event.target.value || undefined })} /></label>
        <label>Due date<input type="date" value={task.dueDate ?? ""} onChange={(event) => update({ dueDate: event.target.value || undefined })} /></label>
        <label>Time slot<input type="time" value={task.timeSlot ?? ""} onChange={(event) => update({ timeSlot: event.target.value || undefined })} /></label>
        <label>Estimate (minutes)<input type="number" min={0} step={1} value={task.estimatedMinutes ?? ""} onChange={(event) => update({ estimatedMinutes: event.target.value === "" ? undefined : Math.max(0, Number(event.target.value)) })} /></label>
      </div>
      <p className="small-label">Planned is when you’ll do it. Due is when it’s needed. Clear the planned date to return it to Inbox.</p>
      <fieldset className="muse-detail-tags"><legend>Tags</legend>{state.tags.map((tag) => <button key={tag.id} type="button" className="choice-button" data-accent={tag.accent} aria-pressed={task.tagIds.includes(tag.id)} onClick={() => update({ tagIds: task.tagIds.includes(tag.id) ? task.tagIds.filter((id) => id !== tag.id) : [...task.tagIds, tag.id] })}>#{tag.name}</button>)}<p className="small-label">Create reusable tags with Organize.</p></fieldset>
      <label className="editor-label">Notes<textarea rows={3} value={task.notes ?? ""} onChange={(event) => update({ notes: event.target.value })} placeholder="A little context…" /></label>
      <section className="muse-detail-section" aria-labelledby="task-subtasks"><h3 id="task-subtasks">Subtasks <span className="small-label">{task.subtasks.filter((item) => item.complete).length}/{task.subtasks.length}</span></h3>
        <ul className="muse-subtask-list">{task.subtasks.map((item) => <SubtaskRow key={item.id} item={item} onChange={(next) => update({ subtasks: task.subtasks.map((entry) => entry.id === item.id ? next : entry) })} onDelete={() => update({ subtasks: task.subtasks.filter((entry) => entry.id !== item.id) })} />)}</ul>
        <form className="muse-task-quick-add" onSubmit={(event) => { event.preventDefault(); if (!subtask.trim()) return; update({ subtasks: [...task.subtasks, { id: crypto.randomUUID(), title: subtask.trim(), complete: false }] }); setSubtask(""); }}><input type="text" maxLength={160} aria-label="New subtask title" placeholder="Add a subtask…" value={subtask} onChange={(event) => setSubtask(event.target.value)} /><button type="submit" disabled={!subtask.trim()} aria-label="Add subtask">+</button></form>
      </section>
      <section className="muse-detail-section" aria-labelledby="task-time"><h3 id="task-time">Time spent</h3><div className="muse-task-timer"><output aria-label="Actual time spent">{Math.floor(task.actualMinutes + runningMinutes(state, taskId, now))}m actual</output><button type="button" className="muse-button" disabled={task.complete} onClick={() => dispatch(running ? { type: "timer/pause", now: new Date().toISOString() } : { type: "timer/start", id: taskId, now: new Date().toISOString() })}>{running ? "Pause timer" : "Start timer"}</button></div><p className="small-label">One task timer at a time. Keeps running across app pages; resets on refresh. Estimates stay separate.</p></section>
      <p className="small-label">{task.recurrence ? "Recurring task metadata retained. Recurrence editing is planned." : "Recurrence is planned for a later Planner iteration."}</p>
      <button className="text-button muse-delete-task" type="button" onClick={() => { dispatch({ type: "task/delete", id: taskId, now: new Date().toISOString() }); onClose(); }}>Delete task</button>
    </div>
  </MuseDrawer>;
}
