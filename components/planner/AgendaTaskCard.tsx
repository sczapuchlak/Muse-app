"use client";
import { useRef, useState } from "react";
import type { PlannedTask } from "@/lib/models";
import { shiftDate } from "@/lib/dates";
import { usePlanner } from "../PlannerStore";
import { MuseIcon } from "../MuseIcon";
import { MuseOverflowMenu } from "../MuseOverflowMenu";
import { useMuseSpark } from "../MuseSpark";
import { TASK_DRAG_TYPE } from "./PlannerTaskCard";
import { useTaskPlacement } from "./useTaskPlacement";

/**
 * Agenda's compact card for the one canonical task (#79). The title gets the full width; the timer, tags and other
 * details stay one click away (Details) and the quieter actions sit behind the "More" menu. Drag, drop-before and
 * completion use the same task actions as the Tasks board.
 */
export function AgendaTaskCard({ task, onOpen }: { task: PlannedTask; onOpen: (task: PlannedTask, anchor: HTMLElement) => void }) {
  const { state, dispatch, canEdit } = usePlanner();
  const { spark, trigger } = useMuseSpark();
  const place = useTaskPlacement(trigger);
  const [dragging, setDragging] = useState(false), [dropBefore, setDropBefore] = useState(false);
  const blocked = useRef(false), titleRef = useRef<HTMLButtonElement>(null);
  const accent = state.workspaces.find((w) => w.id === task.workspaceId)?.accent ?? "primary";
  return <li className="muse-agenda-task" data-complete={task.complete || undefined} data-accent={accent} data-dragging={dragging || undefined} data-drop-before={dropBefore || undefined} draggable={canEdit}
    onPointerDownCapture={(e) => { blocked.current = !!(e.target as Element).closest("button,input,label,[data-no-drag]"); }}
    onDragStart={(e) => { if (blocked.current) { e.preventDefault(); return; } setDragging(true); e.dataTransfer.setData(TASK_DRAG_TYPE, task.id); e.dataTransfer.effectAllowed = "move"; }}
    onDragEnd={() => { setDragging(false); blocked.current = false; }}
    onDragOver={(e) => { if (e.dataTransfer.types.includes(TASK_DRAG_TYPE)) { e.preventDefault(); e.stopPropagation(); setDropBefore(true); } }}
    onDragLeave={(e) => { if (!(e.relatedTarget instanceof Node) || !e.currentTarget.contains(e.relatedTarget)) setDropBefore(false); }}
    onDrop={(e) => { setDropBefore(false); if (!e.dataTransfer.types.includes(TASK_DRAG_TYPE)) return; e.preventDefault(); e.stopPropagation(); place(e.dataTransfer.getData(TASK_DRAG_TYPE), task.plannedDate, task.id); }}>
    <label className="muse-agenda-task-check">
      <input type="checkbox" checked={task.complete} disabled={!canEdit} aria-label={`Complete task: ${task.title}`} onChange={(e) => { if (e.target.checked) trigger(); dispatch({ type: "task/toggle", id: task.id, now: new Date().toISOString() }); }} />
      <span aria-hidden="true">{task.complete && <MuseIcon name="check" size={12} />}{spark}</span>
    </label>
    <button ref={titleRef} type="button" className="muse-agenda-task-title" onClick={(e) => onOpen(task, e.currentTarget)}>{task.title}</button>
    <div className="muse-agenda-task-more" data-no-drag><MuseOverflowMenu label={task.title} actions={[
      { id: "details", label: "Details, timer & tags", onSelect: () => { if (titleRef.current) onOpen(task, titleRef.current); } },
      ...(task.plannedDate && canEdit ? [{ id: "tomorrow", label: "Move to tomorrow", onSelect: () => { place(task.id, shiftDate(task.plannedDate!, 1)); } },
        { id: "unschedule", label: "Back to the task list", onSelect: () => { place(task.id, undefined); } }] : []),
    ]} /></div>
  </li>;
}
