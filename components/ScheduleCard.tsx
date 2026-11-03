"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { DayEvent, PlannedTask } from "@/lib/models";
import { planPreview } from "@/lib/plan-preview";
import { MuseCard } from "./MuseCard";
import { CardHeading } from "./CardHeading";
import { MuseIcon } from "./MuseIcon";
import { GlassPopover } from "./GlassPopover";
import { PlanEntryForm } from "./PlanEntryForm";
import { PlannerCapture,usePlanner } from "./PlannerStore";
import { useMuseSpark } from "./MuseSpark";
import "./ScheduleCard.css";

function EventRow({ event }: { event: DayEvent }) {
  return <li className="muse-plan-event">
    <time dateTime={event.dateTime}>{event.time}</time><div className="muse-plan-eventContent"><h4 title={event.title}>{event.title}</h4>{event.detail && <p title={event.detail}>{event.detail}</p>}</div>
  </li>;
}

function TaskRow({ task, onToggle }: { task: PlannedTask; onToggle: (id: string) => void }) {
  const { trigger, spark } = useMuseSpark();
  return <li><label className="muse-plan-task">
    <input type="checkbox" checked={task.complete} aria-label={`Complete task: ${task.title}`} onChange={(event) => { if (event.target.checked) trigger(); onToggle(task.id); }} />
    <span className="muse-plan-check" aria-hidden="true">{task.complete && <MuseIcon name="check" size={13} />}{spark}</span><span className="muse-plan-title" title={task.title}>{task.title}</span>
  </label></li>;
}

export function ScheduleCard({ selectedDate, priorityTaskIds = [] }: { selectedDate: string; priorityTaskIds?: string[] }) {
  const { state, dispatch } = usePlanner();
  const items = [...state.tasks, ...state.events];
  const [adding, setAdding] = useState<"task" | "event" | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const preview = planPreview(items, selectedDate, undefined, new Set(priorityTaskIds));
  function close() { setAdding(null); anchorRef.current?.focus(); }
  function toggleTask(id: string) {
    dispatch({ type: "task/toggle", id, now: new Date().toISOString() });
  }
  function overflowButton(kind: "task" | "event", total: number) {
    return <Link className="muse-button button-ghost muse-plan-more" href={`/planner?date=${selectedDate}${kind === "event" ? "#planner-events" : ""}`}>
      View all {total} {kind === "task" ? "tasks" : "events"}<MuseIcon name="arrow" size={14} />
    </Link>;
  }
  return (
    <MuseCard id="schedule" className="schedule-card">
      <PlannerCapture><CardHeading id="schedule" title="Today’s plan" icon="calendar"><Link className="muse-button button-ghost" href={`/planner?date=${selectedDate}`}>Open Planner</Link></CardHeading>
      <div className="muse-plan-section" role="group" aria-labelledby="plan-schedule-title">
        <div className="muse-plan-heading"><h3 id="plan-schedule-title">Schedule</h3><button type="button" className="muse-button button-ghost" aria-expanded={adding === "event"} aria-controls="plan-entry" onClick={(event) => { anchorRef.current = event.currentTarget; setAdding("event"); }}>+ Add event</button></div>
        <ul className="muse-plan-list">{preview.visibleEvents.map((event) => <EventRow key={event.id} event={event} />)}</ul>
        {!preview.events.length && <p className="small-label">No timed events.</p>}
        {preview.hiddenEvents > 0 && overflowButton("event", preview.events.length)}
      </div>
      <div className="muse-plan-section" role="group" aria-labelledby="plan-tasks-title">
        <div className="muse-plan-heading"><h3 id="plan-tasks-title">Tasks</h3><button type="button" className="muse-button button-ghost" aria-expanded={adding === "task"} aria-controls="plan-entry" onClick={(event) => { anchorRef.current = event.currentTarget; setAdding("task"); }}>+ Add task</button></div>
        <ul className="muse-plan-list">{preview.visibleTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} />)}</ul>
        {!preview.tasks.length && <p className="small-label">No tasks planned.</p>}
        {preview.hiddenTasks > 0 && overflowButton("task", preview.tasks.length)}
      </div>
      <GlassPopover id="plan-entry" label={adding === "event" ? "Add event" : "Add task"} open={adding !== null} anchorRef={anchorRef} onClose={() => setAdding(null)} width={340}>
        {adding && <PlanEntryForm key={adding} kind={adding} date={selectedDate} onCancel={close} onAdd={(item) => { if (item.kind === "task") dispatch({ type: "task/add", task: item }); else dispatch({ type: "event/add", event: item }); close(); }} />}
      </GlassPopover>

    </PlannerCapture></MuseCard>
  );
}
