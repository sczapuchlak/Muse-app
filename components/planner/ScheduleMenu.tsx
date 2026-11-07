"use client";
import { useId, useRef, useState } from "react";
import type { PlannedTask } from "@/lib/models";
import { scheduleChoices, shortDay } from "@/lib/task-list";
import { GlassPopover } from "../GlassPopover";
import { MuseIcon } from "../MuseIcon";
import { usePlanner } from "../PlannerStore";

/**
 * Schedule a task without dragging (#79 §12): the keyboard and touch path to the same placement drag uses. It only
 * changes the task's planned date; ID, completion, history and everything else stay as they are.
 */
export function ScheduleMenu({ task, today, boardDays, place, onPlaced }: { task: PlannedTask; today: string; boardDays: string[]; place: (id: string, date?: string) => boolean | void; onPlaced?: (message: string) => void }) {
  const { canEdit } = usePlanner();
  const [open, setOpen] = useState(false), [custom, setCustom] = useState(task.plannedDate ?? today);
  const anchor = useRef<HTMLButtonElement>(null), id = useId();
  const overdue = !task.complete && !!task.plannedDate && task.plannedDate < today;
  const choose = (date?: string) => { place(task.id, date); setOpen(false); onPlaced?.(date ? `${task.title} planned for ${shortDay(date)}.` : `${task.title} is back in the Task List.`); };
  const label = task.plannedDate ? `Reschedule ${task.title} (planned ${shortDay(task.plannedDate)})` : `Schedule ${task.title}`;
  return <>
    <button ref={anchor} type="button" className="muse-schedule-trigger" data-no-drag disabled={!canEdit} aria-label={label} title={task.plannedDate ? "Reschedule" : "Schedule"} aria-haspopup="dialog" aria-expanded={open} aria-controls={id}
      onClick={() => { setCustom(task.plannedDate && task.plannedDate >= today ? task.plannedDate : today); setOpen((v) => !v); }}><MuseIcon name="calendar" size={15} /></button>
    <GlassPopover id={id} label={label} open={open} anchorRef={anchor} onClose={() => setOpen(false)} width={260}>
      <div className="muse-schedule-menu" data-no-drag>
        <p className="editor-label">{overdue ? `Was planned for ${shortDay(task.plannedDate!)}` : task.plannedDate ? `Planned for ${shortDay(task.plannedDate)}` : "Plan it for…"}</p>
        <div className="popover-choice-list" role="group" aria-label="Quick days">
          {scheduleChoices(today, boardDays, task.plannedDate).map((c, i) => <button key={c.date} type="button" className="popover-choice" data-popover-autofocus={i === 0 || undefined} onClick={() => choose(c.date)}>
            <span>{overdue && c.label === "Today" ? "Migrate to today" : c.label || shortDay(c.date).split(",")[0]}</span><small className="small-label">{shortDay(c.date)}</small></button>)}
        </div>
        <form className="muse-schedule-custom" onSubmit={(e) => { e.preventDefault(); if (custom) choose(custom); }}>
          <label>Another day<input type="date" required value={custom} onChange={(e) => setCustom(e.target.value)} /></label>
          <button type="submit" className="muse-button">Plan</button>
        </form>
        {task.plannedDate && <button type="button" className="text-button" onClick={() => choose(undefined)}>Back to the Task List</button>}
      </div>
    </GlassPopover>
  </>;
}
