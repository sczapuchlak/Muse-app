"use client";

import { useRef, useState, type CSSProperties } from "react";
import { projectEvents, projectTasks } from "@/lib/planner-occurrences";
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
import { useGoogleEvents } from "./google/GoogleCalendarStore";
import { GoogleEventDetails } from "./google/GoogleEventDetails";
import { GoogleSourceDot } from "./google/GoogleSourceDot";
import { ListsDailyLine } from "./lists/ListsSurfaces";
import "./ScheduleCard.css";

function EventRow({ event, onGoogle }: { event: DayEvent; onGoogle: (event: DayEvent, anchor: HTMLButtonElement) => void }) {
  // Google Calendar (#35): read-only; the row opens details instead of an editor.
  if (event.source === "google") return <li className="muse-plan-event" data-source="google" data-status={event.status === "confirmed" ? undefined : event.status}>
    <time dateTime={event.allDay ? event.date : event.dateTime}>{event.time}</time>
    <button type="button" className="muse-plan-eventContent muse-plan-google" style={event.color ? { "--google-calendar": event.color } as CSSProperties : undefined} onClick={(e) => onGoogle(event, e.currentTarget)} aria-label={`${event.title}, ${event.time}. From Google Calendar${event.calendarName ? ` · ${event.calendarName}` : ""}. Details`}>
      <h4 title={event.title}><GoogleSourceDot event={event} />{event.title}</h4>{event.status === "tentative" ? <p>Tentative</p> : event.location ? <p title={event.location}>{event.location}</p> : event.calendarName && <p>{event.calendarName}</p>}
    </button>
  </li>;
  return <li className="muse-plan-event" data-status={event.status === "confirmed" ? undefined : event.status}>
    <time dateTime={event.allDay ? event.date : event.dateTime}>{event.time}</time><div className="muse-plan-eventContent"><h4 title={event.title}>{event.title}{event.seriesId && <span className="muse-repeat-mark" aria-label=", repeats" title="Repeating event">↻</span>}</h4>{event.status === "canceled" ? <p>Canceled</p> : event.status === "tentative" ? <p>Tentative</p> : event.detail && <p title={event.detail}>{event.detail}</p>}</div>
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
  // Recurrence 2.0 (#89): the selected day's occurrences of recurring tasks and events.
  // Google Calendar (#35): today's read-only events from visible calendars, from the same synced cache as Agenda.
  const google = useGoogleEvents(selectedDate, selectedDate);
  const items = [...projectTasks(state.tasks, state.occurrences, selectedDate, selectedDate), ...projectEvents(state.events, state.eventExceptions, selectedDate, selectedDate), ...google];
  const [googleEvent, setGoogleEvent] = useState<DayEvent | null>(null);
  const googleAnchor = useRef<HTMLButtonElement>(null);
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
        <ul className="muse-plan-list">{preview.visibleEvents.map((event) => <EventRow key={event.id} event={event} onGoogle={(e, a) => { googleAnchor.current = a; setGoogleEvent(e); }} />)}</ul>
        {!preview.events.length && <p className="small-label">No events.</p>}
        {preview.hiddenEvents > 0 && overflowButton("event", preview.events.length)}
        <ListsDailyLine date={selectedDate} />
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
      <GlassPopover id="plan-google-event" label="Google Calendar event" open={googleEvent !== null} anchorRef={googleAnchor} onClose={() => setGoogleEvent(null)} width={340}>
        {googleEvent && <GoogleEventDetails event={googleEvent} onDone={() => { setGoogleEvent(null); googleAnchor.current?.focus(); }} />}
      </GlassPopover>

    </PlannerCapture></MuseCard>
  );
}
