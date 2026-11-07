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
import { taskState, taskStateLabels } from "@/lib/agenda";
import type { ResolvedMark } from "@/lib/muse-marks";
import { MarkGlyph } from "./MuseMarks";

/**
 * Agenda's compact card for the one canonical task (#79). The title gets the full width; the timer, tags and other
 * details stay one click away (Details) and the quieter actions sit behind the "More" menu. Drag, drop-before and
 * completion use the same task actions as the Tasks board.
 */
export function AgendaTaskCard({ task, onOpen, today, priority = false, mark, onMark }: { task: PlannedTask; onOpen: (task: PlannedTask, anchor: HTMLElement) => void; today: string; priority?: boolean; mark?: ResolvedMark; onMark?: (anchor: HTMLElement, mark?: ResolvedMark) => void }) {
  const { state, dispatch, canEdit } = usePlanner();
  const { spark, trigger } = useMuseSpark();
  const place = useTaskPlacement(trigger);
  const [dragging, setDragging] = useState(false), [dropBefore, setDropBefore] = useState(false), [moving, setMoving] = useState(false);
  const status = taskState(task, today), moreRef = useRef<HTMLDivElement>(null);
  const blocked = useRef(false), titleRef = useRef<HTMLButtonElement>(null);
  const accent = state.workspaces.find((w) => w.id === task.workspaceId)?.accent ?? "primary";
  return <li className="muse-agenda-task" data-complete={task.complete || undefined} data-state={status} data-accent={accent} data-dragging={dragging || undefined} data-drop-before={dropBefore || undefined} draggable={canEdit}
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
    <div className="muse-agenda-task-main">
      <button ref={titleRef} type="button" className="muse-agenda-task-title" onClick={(e) => onOpen(task, e.currentTarget)} aria-describedby={status === "overdue" || priority ? `task-state-${task.id}` : undefined}>
        {mark && <MarkGlyph mark={mark} size={13} />}{task.title}</button>
      {(status === "overdue" || priority) && <span id={`task-state-${task.id}`} className="muse-agenda-task-state">
        {priority && <span title="One of the day’s three priorities"><span aria-hidden="true">★</span> Priority</span>}
        {status === "overdue" && <span title={taskStateLabels.overdue}><span aria-hidden="true">›</span> Overdue</span>}</span>}
      {moving && <form className="muse-agenda-task-move" data-no-drag onSubmit={(e) => { e.preventDefault(); const d = String(new FormData(e.currentTarget).get("date") ?? ""); if (d) place(task.id, d); setMoving(false); }}>
        <label>Move to<input name="date" type="date" required defaultValue={task.plannedDate} autoFocus /></label>
        <button type="submit" className="text-button">Move</button><button type="button" className="text-button" onClick={() => setMoving(false)}>Cancel</button></form>}
    </div>
    <div className="muse-agenda-task-more" data-no-drag ref={moreRef}><MuseOverflowMenu label={task.title} actions={[
      { id: "details", label: "Details, timer & tags", onSelect: () => { if (titleRef.current) onOpen(task, titleRef.current); } },
      ...(onMark ? [{ id: "mark", label: mark ? "Change its Mark" : "Add a Mark", onSelect: () => { if (titleRef.current) onMark(titleRef.current, mark); } }] : []),
      ...(task.plannedDate && canEdit ? [
        ...(status === "overdue" ? [{ id: "migrate", label: "Migrate to today", onSelect: () => { place(task.id, today); } }] : []),
        { id: "tomorrow", label: "Move to the next day", onSelect: () => { place(task.id, shiftDate(task.plannedDate!, 1)); } },
        { id: "date", label: "Move to a date…", onSelect: () => setMoving(true) },
        { id: "unschedule", label: "Back to the task list", onSelect: () => { place(task.id, undefined); } }] : []),
    ]} /></div>
  </li>;
}
