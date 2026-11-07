"use client";
import { useState, type FormEvent } from "react";
import type { DayEvent, EventStatus } from "@/lib/models";
import { clockLabel } from "@/lib/data/planner";
import { markIcons, type MarkIcon } from "@/lib/muse-marks";
import { usePlanner } from "../PlannerStore";
import { useAgendaData } from "./AgendaData";

const statuses: { id: EventStatus; label: string }[] = [{ id: "confirmed", label: "Confirmed" }, { id: "tentative", label: "Tentative" }, { id: "canceled", label: "Canceled" }];

/**
 * Create or edit one native event (#79 §11). All-day events have no time; a date range stays ONE record; status is
 * the event's own (tentative, canceled), never a task-style completion. Changing dates here moves it in every view.
 */
export function EventEditor({ event, date, defaultStatus = "confirmed", onDone }: { event?: DayEvent; date: string; defaultStatus?: EventStatus; onDone: () => void }) {
  const { dispatch, canEdit } = usePlanner();
  const { marks, saveMark, removeMark } = useAgendaData();
  const existingMark = event ? marks.find((m) => m.linkKind === "event" && m.linkId === event.id) : undefined;
  const [title, setTitle] = useState(event?.title ?? ""), [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [start, setStart] = useState(event?.date ?? date), [end, setEnd] = useState(event?.endDate ?? "");
  const [time, setTime] = useState(event && !event.allDay ? event.dateTime.slice(11, 16) : "09:00"), [endTime, setEndTime] = useState(event?.endTime ?? "");
  const [location, setLocation] = useState(event?.location ?? ""), [detail, setDetail] = useState(event?.detail ?? ""), [status, setStatus] = useState<EventStatus>(event?.status ?? defaultStatus);
  const [markIcon, setMarkIcon] = useState<MarkIcon | "">(existingMark?.icon ?? ""), [confirming, setConfirming] = useState(false);
  const id = event?.id ?? "new";

  function submit(e: FormEvent) {
    e.preventDefault(); if (!title.trim() || !canEdit) return;
    const next: DayEvent = { id: event?.id ?? crypto.randomUUID(), kind: "event", title: title.trim(), date: start, dateTime: `${start}T${allDay ? "00:00" : time}`, time: allDay ? "All day" : clockLabel(time),
      ...(allDay ? { allDay: true } : {}), ...(end && end > start ? { endDate: end } : {}), ...(!allDay && endTime ? { endTime } : {}),
      ...(location.trim() ? { location: location.trim() } : {}), ...(detail.trim() ? { detail: detail.trim() } : {}), status };
    dispatch({ type: "event/save", event: next });
    if (markIcon) void saveMark({ ...(existingMark ?? { id: crypto.randomUUID(), color: "primary", label: "" }), date: start, icon: markIcon, linkKind: "event", linkId: next.id });
    else if (existingMark) void removeMark(existingMark.id);
    onDone();
  }
  return <form className="muse-event-editor" onSubmit={submit}>
    <label className="editor-label" htmlFor={`event-title-${id}`}>{event ? "Edit event" : "New event"}</label>
    <input id={`event-title-${id}`} type="text" required maxLength={160} value={title} placeholder="Dentist, London trip…" onChange={(e) => setTitle(e.target.value)} />
    <label className="muse-event-inline"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All day</label>
    <div className="muse-event-row">
      <label>Starts<input type="date" required value={start} onChange={(e) => { setStart(e.target.value); if (end && end < e.target.value) setEnd(""); }} /></label>
      <label>Ends <span className="small-label">(optional)</span><input type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} /></label>
    </div>
    {!allDay && <div className="muse-event-row">
      <label>From<input type="time" required value={time} onChange={(e) => setTime(e.target.value)} /></label>
      <label>Until <span className="small-label">(optional)</span><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></label>
    </div>}
    <label>Where <span className="small-label">(optional)</span><input type="text" maxLength={200} value={location} onChange={(e) => setLocation(e.target.value)} /></label>
    <label>Notes <span className="small-label">(optional)</span><textarea rows={2} maxLength={5000} value={detail} onChange={(e) => setDetail(e.target.value)} /></label>
    <fieldset className="muse-event-status"><legend>Status</legend>
      {statuses.map((s) => <label key={s.id}><input type="radio" name={`event-status-${id}`} value={s.id} checked={status === s.id} onChange={() => setStatus(s.id)} /> {s.label}</label>)}</fieldset>
    <label>Mark <span className="small-label">(optional symbol)</span>
      <select value={markIcon} onChange={(e) => setMarkIcon(e.target.value as MarkIcon | "")}><option value="">None</option>{markIcons.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}</select></label>
    <div className="editor-actions">
      <button type="submit" className="muse-button button-primary" disabled={!canEdit}>{event ? "Save event" : "Add event"}</button>
      <button type="button" className="muse-button button-ghost" onClick={onDone}>Cancel</button>
      {event && (confirming
        ? <span className="muse-mark-confirm" role="group" aria-label="Confirm deleting this event">Delete for good?<button type="button" className="text-button" onClick={() => { dispatch({ type: "event/delete", id: event.id }); if (existingMark) void removeMark(existingMark.id); onDone(); }}>Delete</button><button type="button" className="text-button" onClick={() => setConfirming(false)}>Keep</button></span>
        : <button type="button" className="text-button" disabled={!canEdit} onClick={() => setConfirming(true)}>Delete</button>)}
    </div>
    {event && status !== "canceled" && <p className="small-label">Not happening? Choose Canceled to keep it on record without deleting it.</p>}
  </form>;
}
