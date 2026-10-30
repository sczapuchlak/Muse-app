"use client";
import { useRef, useState } from "react";
import type { PlannedTask } from "@/lib/models";
import { usePlanner } from "../PlannerStore";
import { GlassPopover } from "../GlassPopover";
import { validDate } from "@/lib/planner";

export function TaskMoveControl({ task }: { task: PlannedTask }) {
  const { state, dispatch } = usePlanner();
  const siblings = state.tasks.filter((entry) => entry.plannedDate === task.plannedDate);
  const position = siblings.findIndex((entry) => entry.id === task.id);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const [date, setDate] = useState(task.plannedDate ?? "");
  function move(value: string | undefined) {
    dispatch({ type: "task/move", id: task.id, date: value });
    setOpen(false); trigger.current?.focus();
  }
  return <>
    <button ref={trigger} type="button" className="text-button" aria-label={`Move ${task.title}`} aria-expanded={open} aria-controls={`move-${task.id}`} onClick={() => { setDate(task.plannedDate ?? ""); setOpen((value) => !value); }}>Move</button>
    <GlassPopover id={`move-${task.id}`} label={`Move ${task.title}`} open={open} anchorRef={trigger} onClose={() => setOpen(false)} width={280}>
      <form onSubmit={(event) => { event.preventDefault(); if (validDate(date)) move(date); }}>
        <label className="editor-label" htmlFor={`move-date-${task.id}`}>Plan for a day</label>
        <input className="date-input" id={`move-date-${task.id}`} type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
        <div className="editor-actions"><button className="muse-button button-primary" type="submit">Move task</button><button className="text-button" type="button" onClick={() => move(undefined)}>To Inbox</button></div>
        <p className="small-label">Your due date stays the same.</p>
        {siblings.length > 1 && <div className="editor-actions" role="group" aria-label="Task order"><button className="muse-button" type="button" disabled={position === 0} onClick={() => dispatch({ type: "task/place", id: task.id, date: task.plannedDate, beforeId: siblings[position - 1]?.id })}>Move earlier</button><button className="muse-button" type="button" disabled={position === siblings.length - 1} onClick={() => dispatch({ type: "task/place", id: task.id, date: task.plannedDate, beforeId: siblings[position + 2]?.id })}>Move later</button></div>}
      </form>
    </GlassPopover>
  </>;
}
