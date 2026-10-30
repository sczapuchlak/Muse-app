"use client";
import { useEffect, useState } from "react";
import type { PlannedTask } from "@/lib/models";
import { usePlanner } from "../PlannerStore";
import { MuseIcon } from "../MuseIcon";
import { useMuseSpark } from "../MuseSpark";
import { useTaskPlacement } from "./useTaskPlacement";
import { TaskMoveControl } from "./TaskMoveControl";

export const TASK_DRAG_TYPE = "application/x-muse-task";
export function PlannerTaskCard({ task, onOpen }: { task: PlannedTask; onOpen: (task: PlannedTask, anchor: HTMLElement) => void }) {
  const { state, dispatch } = usePlanner();
  const workspace = state.workspaces.find((entry) => entry.id === task.workspaceId);
  const group = state.groups.find((entry) => entry.id === task.groupId);
  const { spark, trigger } = useMuseSpark();
  const place = useTaskPlacement(trigger);
  const [dragging, setDragging] = useState(false);
  const [dropBefore, setDropBefore] = useState(false);
  useEffect(() => { const reset = () => setDropBefore(false); document.addEventListener("dragend", reset); return () => document.removeEventListener("dragend", reset); }, []);
  const due = task.dueDate && !task.complete;
  return <li className="muse-planner-task" data-complete={task.complete} data-accent={workspace?.accent ?? "primary"} data-drop-before={dropBefore} data-dragging={dragging}
    onDragOver={(event) => { if (event.dataTransfer.types.includes(TASK_DRAG_TYPE)) { event.preventDefault(); event.stopPropagation(); setDropBefore(true); } }}
    onDragLeave={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDropBefore(false); }}
    onDrop={(event) => { setDropBefore(false); if (!event.dataTransfer.types.includes(TASK_DRAG_TYPE)) return; event.preventDefault(); event.stopPropagation(); place(event.dataTransfer.getData(TASK_DRAG_TYPE), task.plannedDate, task.id); }}>
    <div className="muse-task-title-row">
      <label className="muse-task-completion">
        <input className="check-input" type="checkbox" checked={task.complete} aria-label={`Complete task: ${task.title}`} onChange={(event) => { if (event.target.checked) trigger(); dispatch({ type: "task/toggle", id: task.id, now: new Date().toISOString() }); }} />
        <span className="priority-check" aria-hidden="true">{task.complete && <MuseIcon name="check" size={13} />}{spark}</span>
      </label>
      <button className="muse-task-title muse-edge" type="button" onClick={(event) => onOpen(task, event.currentTarget)}>{task.title}</button>
    </div>
    <div className="muse-task-context"><span className="muse-workspace-dot" aria-hidden="true" />{workspace?.name}{group && <span> / {group.name}</span>}</div>
    {(task.timeSlot || task.estimatedMinutes || task.subtasks.length > 0 || due) && <div className="muse-task-facts">
      {task.timeSlot && <span>{task.timeSlot}</span>}{task.estimatedMinutes !== undefined && <span>{task.estimatedMinutes}m est.</span>}
      {task.subtasks.length > 0 && <span>{task.subtasks.filter((item) => item.complete).length}/{task.subtasks.length} subtasks</span>}
      {due && <span className="muse-task-due" data-before-plan={!!task.plannedDate && task.dueDate! < task.plannedDate} title={task.plannedDate && task.dueDate! < task.plannedDate ? "Due before its planned date" : undefined}>Due {task.dueDate!.slice(5).replace("-", "/")}</span>}
    </div>}
    {task.tagIds.length > 0 && <div className="muse-task-tags">{task.tagIds.map((id) => { const tag = state.tags.find((entry) => entry.id === id); return tag ? <span className="muse-task-tag" data-accent={tag.accent} key={id}>#{tag.name}</span> : null; })}</div>}
    <div className="muse-task-actions"><button className="muse-task-drag text-button" type="button" draggable aria-label={`Drag ${task.title}; use Move for keyboard rescheduling`} title="Drag to another day, or use Move" onDragEnd={() => setDragging(false)} onDragStart={(event) => { setDragging(true); event.dataTransfer.setData(TASK_DRAG_TYPE, task.id); event.dataTransfer.effectAllowed = "move"; }}>⠿</button><TaskMoveControl task={task} /></div>
  </li>;
}
