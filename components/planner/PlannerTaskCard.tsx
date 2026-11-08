"use client";
import { useEffect, useRef, useState } from "react";
import type { PlannedTask } from "@/lib/models";
import { usePlanner } from "../PlannerStore";
import { MuseIcon } from "../MuseIcon";
import { useMuseSpark } from "../MuseSpark";
import { useTaskPlacement } from "./useTaskPlacement";
import { TaskTimer } from "./TaskTimer";
import { TaskClassification } from "./TaskClassification";
import { taskState, taskStateLabels } from "@/lib/agenda";

export const TASK_DRAG_TYPE = "application/x-muse-task";
export function PlannerTaskCard({ task, onOpen, showDueDate=false, today, priority=false }: { showDueDate?:boolean; task: PlannedTask; onOpen: (task: PlannedTask, anchor: HTMLElement) => void; today?: string; priority?: boolean }) {
  const { state, dispatch,status } = usePlanner();
  const workspace = state.workspaces.find((entry) => entry.id === task.workspaceId);
  const blockedDrag=useRef(false);
  const { spark, trigger } = useMuseSpark();
  const place = useTaskPlacement(trigger);
  const [dragging, setDragging] = useState(false);
  const [dropBefore, setDropBefore] = useState(false);
  useEffect(() => { const reset = () => setDropBefore(false); document.addEventListener("dragend", reset); return () => document.removeEventListener("dragend", reset); }, []);
  const due = task.dueDate && !task.complete;
  const overdue = !!today && taskState(task, today) === "overdue";
  return <li className="muse-planner-task" data-state={overdue ? "overdue" : undefined} data-complete={task.complete} data-accent={workspace?.accent ?? "primary"} data-drop-before={dropBefore} data-dragging={dragging} draggable
    onPointerDownCapture={(event)=>{blockedDrag.current=!!(event.target as Element).closest("button,input,label,a,textarea,select,[role=checkbox],[data-no-drag]");}}
    onDragStart={(event)=>{if(blockedDrag.current){event.preventDefault();return;}setDragging(true);event.dataTransfer.setData(TASK_DRAG_TYPE,task.id);event.dataTransfer.effectAllowed="move";}} onDragEnd={()=>{setDragging(false);blockedDrag.current=false;}}
    onDragOver={(event) => { if (event.dataTransfer.types.includes(TASK_DRAG_TYPE)) { event.preventDefault(); event.stopPropagation(); setDropBefore(true); } }}
    onDragLeave={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDropBefore(false); }}
    onDrop={(event) => { setDropBefore(false); if (!event.dataTransfer.types.includes(TASK_DRAG_TYPE)) return; event.preventDefault(); event.stopPropagation(); place(event.dataTransfer.getData(TASK_DRAG_TYPE), task.plannedDate, task.id); }}>
    <div className="muse-task-title-row">
      <label className="muse-task-completion">
        <input className="check-input" type="checkbox" checked={task.complete} aria-label={`Complete task: ${task.title}`} onChange={(event) => { if (event.target.checked) trigger(); dispatch({ type: "task/toggle", id: task.id, now: new Date().toISOString() }); }} />
        <span className="priority-check" aria-hidden="true">{task.complete && <MuseIcon name="check" size={13} />}{spark}</span>
      </label>
      <button className="muse-task-title muse-edge" type="button" onClick={(event) => onOpen(task, event.currentTarget)}>{task.title}{task.seriesId && <span className="muse-repeat-mark" title="Repeats · this is one date of the series" aria-label=", repeats">↻</span>}</button>
    <TaskTimer task={task}/></div>
    {(priority || overdue) && <p className="muse-list-facts muse-task-flags">{priority && <span className="muse-list-flag" data-kind="priority" title="One of the day’s three priorities"><span aria-hidden="true">★</span> Priority</span>}{overdue && <span className="muse-list-flag" data-kind="overdue" title={taskStateLabels.overdue}><span aria-hidden="true">›</span> Overdue</span>}</p>}
    <div className="muse-task-secondary-row"><TaskClassification key={status?.discarded??0} task={task}/></div>
    {showDueDate&&due&&<p className="muse-task-due-preview">Due {task.dueDate}</p>}

  </li>;
}
