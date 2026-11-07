"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PlannedTask } from "@/lib/models";
import { accentStyle } from "@/lib/appearance-values";
import { formatPlannedMinutes } from "@/lib/planner";
import { taskState, taskStateLabels } from "@/lib/agenda";
import { shortDay } from "@/lib/task-list";
import { usePlanner } from "../PlannerStore";
import { MuseIcon } from "../MuseIcon";
import { useMuseSpark } from "../MuseSpark";
import { useTaskPlacement } from "./useTaskPlacement";
import { TASK_DRAG_TYPE } from "./PlannerTaskCard";
import { TaskTimer } from "./TaskTimer";
import { ScheduleMenu } from "./ScheduleMenu";

/**
 * One row in the Task List (#79 §12). Denser than a day's task card so the list reads as a source, not another day:
 * completion, the title (opens Details), Schedule, and one quiet line of facts. Drag it onto a day to plan it.
 */
export function TaskListRow({ task, today, boardDays, priority, showWorkspace, onOpen, onPlaced }: { task: PlannedTask; today: string; boardDays: string[]; priority: boolean; showWorkspace: boolean; onOpen: (task: PlannedTask, anchor: HTMLElement) => void; onPlaced: (message: string) => void }) {
  const { state, dispatch, canEdit } = usePlanner();
  const { spark, trigger } = useMuseSpark();
  const place = useTaskPlacement(trigger);
  const [dragging, setDragging] = useState(false), [dropBefore, setDropBefore] = useState(false);
  const blocked = useRef(false);
  useEffect(() => { const reset = () => setDropBefore(false); document.addEventListener("dragend", reset); return () => document.removeEventListener("dragend", reset); }, []);
  const status = taskState(task, today), workspace = state.workspaces.find((w) => w.id === task.workspaceId);
  const running = state.activeTimer?.taskId === task.id;
  const facts = taskFacts({ task, today, priority, showWorkspace, state });

  return <li className="muse-list-row" data-state={status} data-complete={task.complete || undefined} data-dragging={dragging || undefined} data-drop-before={dropBefore || undefined} style={accentStyle(workspace?.accent)} draggable={canEdit}
    onPointerDownCapture={(e) => { blocked.current = !!(e.target as Element).closest("button,input,label,a,textarea,select,[data-no-drag]"); }}
    onDragStart={(e) => { if (blocked.current) { e.preventDefault(); return; } setDragging(true); e.dataTransfer.setData(TASK_DRAG_TYPE, task.id); e.dataTransfer.effectAllowed = "move"; }}
    onDragEnd={() => { setDragging(false); blocked.current = false; }}
    onDragOver={(e) => { if (e.dataTransfer.types.includes(TASK_DRAG_TYPE) && !task.plannedDate) { e.preventDefault(); e.stopPropagation(); setDropBefore(true); } }}
    onDragLeave={(e) => { if (!(e.relatedTarget instanceof Node) || !e.currentTarget.contains(e.relatedTarget)) setDropBefore(false); }}
    onDrop={(e) => { setDropBefore(false); if (!e.dataTransfer.types.includes(TASK_DRAG_TYPE) || task.plannedDate) return; e.preventDefault(); e.stopPropagation(); place(e.dataTransfer.getData(TASK_DRAG_TYPE), undefined, task.id); }}>
    <label className="muse-list-check">
      <input type="checkbox" checked={task.complete} disabled={!canEdit} aria-label={`Complete task: ${task.title}`} onChange={(e) => { if (e.target.checked) trigger(); dispatch({ type: "task/toggle", id: task.id, now: new Date().toISOString() }); }} />
      <span aria-hidden="true">{task.complete && <MuseIcon name="check" size={11} />}{spark}</span>
    </label>
    <div className="muse-list-main">
      <button type="button" className="muse-list-title" onClick={(e) => onOpen(task, e.currentTarget)}>{task.title}</button>
      {facts.length > 0 && <p className="muse-list-facts">{facts}</p>}
    </div>
    {(running || task.actualMinutes > 0) && <TaskTimer task={task} />}
    <ScheduleMenu task={task} today={today} boardDays={boardDays} place={place} onPlaced={onPlaced} />
  </li>;
}

/** One quiet line of facts for a list row (Task List and Running List share it): ★, overdue or planned date, due,
 * workspace, group, tags, subtasks, repeat and estimate. Read-only; editing stays in Details. */
export function taskFacts({ task, today, priority, showWorkspace, state, hidePlanned = false }: { task: PlannedTask; today: string; priority: boolean; showWorkspace: boolean; state: ReturnType<typeof usePlanner>["state"]; hidePlanned?: boolean }): ReactNode[] {
  const status = taskState(task, today), workspace = state.workspaces.find((w) => w.id === task.workspaceId);
  const group = state.groups.find((g) => g.id === task.groupId), tags = task.tagIds.flatMap((id) => state.tags.find((t) => t.id === id) ?? []);
  const doneSubtasks = task.subtasks.filter((s) => s.complete).length;
  const facts: ReactNode[] = [];
  if (priority) facts.push(<span key="p" className="muse-list-flag" data-kind="priority" title="One of the day’s three priorities"><span aria-hidden="true">★</span> Priority</span>);
  if (status === "overdue") facts.push(<span key="o" className="muse-list-flag" data-kind="overdue" title={taskStateLabels.overdue}><span aria-hidden="true">›</span> Overdue · {shortDay(task.plannedDate!)}</span>);
  else if (task.plannedDate && !hidePlanned) facts.push(<span key="d" className="muse-list-flag" data-kind="date"><MuseIcon name="calendar" size={11} /> {shortDay(task.plannedDate)}</span>);
  if (task.dueDate && !task.complete) facts.push(<span key="due">Due {shortDay(task.dueDate)}</span>);
  if (showWorkspace && workspace) facts.push(<span key="w" className="muse-list-workspace" style={accentStyle(workspace.accent)}><i aria-hidden="true" />{workspace.name}</span>);
  if (group) facts.push(<span key="g">{group.name}</span>);
  for (const t of tags.slice(0, 2)) facts.push(<span key={`t${t.id}`} className="muse-list-tag" style={accentStyle(t.accent)}>#{t.name}</span>);
  if (tags.length > 2) facts.push(<span key="tm">+{tags.length - 2}</span>);
  if (task.subtasks.length) facts.push(<span key="s" title="Subtasks done">{doneSubtasks}/{task.subtasks.length}</span>);
  if (task.recurrence) facts.push(<span key="r" title={`Repeats ${task.recurrence.frequency}. Muse keeps one task and its latest completion, not separate occurrences.`}>↻ {task.recurrence.frequency}</span>);
  if (task.estimatedMinutes) facts.push(<span key="e" title="Estimate">{formatPlannedMinutes(task.estimatedMinutes)}</span>);
  return facts;
}
