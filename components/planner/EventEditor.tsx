"use client";
import { useState, type FormEvent } from "react";
import { FutureLogToggle } from "./FutureLogLink";
import { RecurrenceEditor, RecurrenceScopeChoice } from "./RecurrenceEditor";
import { splitChange } from "@/lib/planner-occurrences";
import type { EditScope, RecurrenceRule } from "@/lib/recurrence";
import { shiftDate, todayInTimeZone } from "@/lib/dates";
import type { DayEvent, EventStatus } from "@/lib/models";
import { clockLabel } from "@/lib/data/planner";
import { markIconName, markIcons, type MarkIcon } from "@/lib/muse-marks";
import { MuseIcon, type MuseIconName } from "../MuseIcon";
import { usePlanner } from "../PlannerStore";
import { useAgendaData } from "./AgendaData";
import { applyMirror, GoogleMirrorSection, mirrorOff, type MirrorChoice } from "../google/GoogleMirror";
import { googleWrite, GoogleWriteFailure, useGoogleDestinations, useGoogleLink } from "../google/GoogleCalendarStore";
import { GoogleEventEditor } from "../google/GoogleEventEditor";

const statuses: { id: EventStatus; label: string }[] = [{ id: "confirmed", label: "Confirmed" }, { id: "tentative", label: "Tentative" }, { id: "canceled", label: "Canceled" }];

/**
 * Create or edit one native event (#79 §11). All-day events have no time; a date range stays ONE record; status is
 * the event's own (tentative, canceled), never a task-style completion. Changing dates here moves it in every view.
 */
export function EventEditor({ event, date, defaultStatus = "confirmed", initialTitle = "", onDone }: { event?: DayEvent; date: string; defaultStatus?: EventStatus; initialTitle?: string; onDone: () => void }) {
  const { dispatch, canEdit, state, timeZone, store } = usePlanner();
  // #112 Google: a new event can be saved straight to a Google calendar; a Muse event can also be added to Google.
  const destinations = useGoogleDestinations(), [saveTo, setSaveTo] = useState("muse");
  const link = useGoogleLink(event && !event.seriesId && !event.rule ? event.id : undefined);
  const [mirrorEdit, setMirrorEdit] = useState<MirrorChoice | null>(null), mirror = mirrorEdit ?? (link ? { ...mirrorOff, enabled: true } : mirrorOff);
  const [deleteInGoogle, setDeleteInGoogle] = useState(false), [googleProblem, setGoogleProblem] = useState("");
  // Recurrence 2.0 (#89): editing a date of a recurring event asks how far the change reaches.
  const series = event?.seriesId ? state.events.find((e) => e.id === event.seriesId) ?? null : event?.rule ? event : null;
  const occDate = event?.seriesId ? event.occurrenceDate ?? null : null, seriesStart = series?.date ?? null;
  const [rule, setRule] = useState<RecurrenceRule | null>(series?.rule ?? null), [scope, setScope] = useState<EditScope>(occDate ? "occurrence" : "series");
  const today = timeZone ? todayInTimeZone(timeZone) : date;
  const { marks, saveMark, removeMark } = useAgendaData();
  const existingMark = event ? marks.find((m) => m.linkKind === "event" && m.linkId === event.id) : undefined;
  const [title, setTitle] = useState(event?.title ?? initialTitle), [allDay, setAllDay] = useState(event?.allDay ?? false);
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
    const now = new Date().toISOString(), seriesRule = series?.rule ?? null, ruleChanged = JSON.stringify(rule) !== JSON.stringify(seriesRule);
    let linkId = next.id;
    if (occDate && series && scope === "occurrence") {
      // One date: an exception on the series (moved, edited or canceled). The series itself is untouched.
      dispatch({ type: "recurrence", now, change: { op: "event/occurrence", eventId: series.id, date: occDate, canceled: status === "canceled", movedTo: start !== occDate ? start : null,
        overrides: { title: next.title, time: next.time, ...(allDay ? {} : { clock: time }), ...(next.endTime ? { endTime: next.endTime } : {}), ...(next.location ? { location: next.location } : {}), ...(next.detail ? { detail: next.detail } : {}), status: status === "canceled" ? series.status ?? "confirmed" : status, allDay: !!next.allDay } } });
      linkId = series.id;
    } else if (occDate && series && seriesRule && scope === "future" && occDate > series.date) {
      // This and future: the series ends before this date; a new series starts here with these details.
      const newId = crypto.randomUUID();
      dispatch({ type: "recurrence", now, change: splitChange("event", series.id, series.date, seriesRule, occDate, rule, newId, next.title) });
      dispatch({ type: "event/save", event: { ...next, id: newId } });
      linkId = newId;
    } else if (series) {
      // Entire series: details apply to every date; the anchor date stays unless it was edited from the first date.
      const anchor = occDate ? series.date : start;
      dispatch({ type: "event/save", event: { ...next, id: series.id, date: anchor, dateTime: `${anchor}${next.dateTime.slice(10)}`, ...(next.endDate ? { endDate: shiftDate(anchor, Math.round((Date.parse(`${next.endDate}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86400000)) } : {}) } });
      if (ruleChanged) dispatch({ type: "recurrence", now, change: { op: "event/rule", eventId: series.id, rule } });
      linkId = series.id;
    } else {
      dispatch({ type: "event/save", event: next });
      if (rule) dispatch({ type: "recurrence", now, change: { op: "event/rule", eventId: next.id, rule } });
      // The Muse event is saved first; its Google copy follows once Muse confirms the save.
      else if (mirror.enabled || link) applyMirror(store, next.id, mirror, link);
    }
    if (markIcon) void saveMark({ ...(existingMark ?? { id: crypto.randomUUID(), color: "primary", label: "" }), date: start, icon: markIcon, linkKind: "event", linkId });
    else if (existingMark) void removeMark(existingMark.id);
    onDone();
  }
  const editable = destinations.filter((d) => d.editing && !d.reconnect);
  const saveToChoice = !event && editable.length > 0 && <label className="muse-event-save-to"><span>Save to</span>
    <select value={saveTo} onChange={(e) => setSaveTo(e.target.value)}>
      <option value="muse">Muse</option>
      {editable.map((d) => <option key={d.id} value={`${d.connection_id}|${d.calendar_id}`}>Google · {d.name}</option>)}
    </select></label>;
  if (!event && saveTo !== "muse") {
    const [connectionId, calendarId] = saveTo.split("|");
    return <div className="muse-event-editor">{saveToChoice}
      <GoogleEventEditor key={saveTo} target={{ connectionId, calendarId }} date={start} initialTitle={title} timeZone={timeZone ?? "UTC"} onDone={onDone}
        onSaveInMuse={(f) => { setTitle(f.title); setStart(f.date); setEnd(f.endDate ?? ""); setAllDay(f.allDay); if (f.time) setTime(f.time); setEndTime(f.endTime ?? ""); setLocation(f.location ?? ""); setDetail(f.description ?? ""); setSaveTo("muse"); }} /></div>;
  }
  /** Deleting a Muse event that has a Google copy: delete the copy only when asked, and keep the Muse event if that fails. */
  async function removeGoogleCopyThen(deleteMuse: () => void) {
    if (!link || !deleteInGoogle) { deleteMuse(); return; }
    try { await googleWrite({ action: "unlink", museEventId: link.muse_event_id, deleteInGoogle: true, confirmed: true }); deleteMuse(); }
    catch (x) { setGoogleProblem(`${x instanceof GoogleWriteFailure ? x.message : "Google Calendar couldn’t be reached."} Your Muse event wasn’t deleted.`); }
  }
  return <form className="muse-event-editor" onSubmit={submit}>
    {saveToChoice}
    <input id={`event-title-${id}`} aria-label="Event title" type="text" required maxLength={160} value={title} placeholder="Dentist, London trip…" onChange={(e) => setTitle(e.target.value)} />
    <label className="muse-event-inline"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All day</label>
    <div className="muse-event-row">
      <label><span>Starts</span><input type="date" required value={start} onChange={(e) => { setStart(e.target.value); if (end && end < e.target.value) setEnd(""); }} /></label>
      <label><span>Ends <small>optional</small></span><input type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} /></label>
    </div>
    {!allDay && <div className="muse-event-row">
      <label><span>From</span><input type="time" required value={time} onChange={(e) => setTime(e.target.value)} /></label>
      <label><span>Until <small>optional</small></span><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></label>
    </div>}
    {(!occDate || scope !== "occurrence") && <RecurrenceEditor value={rule} start={occDate && scope === "future" ? occDate : seriesStart ?? start} today={today} onChange={setRule} />}
    {occDate && series && <RecurrenceScopeChoice value={scope} onChange={setScope} allowed={occDate > series.date ? ["occurrence", "future", "series"] : ["occurrence", "series"]} />}
    <label><span>Where <small>optional</small></span><input type="text" maxLength={200} value={location} onChange={(e) => setLocation(e.target.value)} /></label>
    <label><span>Notes <small>optional</small></span><textarea rows={2} maxLength={5000} value={detail} onChange={(e) => setDetail(e.target.value)} /></label>
    <fieldset className="muse-event-status"><legend>Status</legend>
      {statuses.map((s) => <label key={s.id}><input type="radio" name={`event-status-${id}`} value={s.id} checked={status === s.id} onChange={() => setStatus(s.id)} /> {s.label}</label>)}</fieldset>
    <fieldset className="muse-mark-icons"><legend>Mark <small>optional symbol</small></legend>
      <label title="No Mark"><input type="radio" name={`event-mark-${id}`} value="" checked={markIcon === ""} onChange={() => setMarkIcon("")} aria-label="No Mark" /><span><MuseIcon name="close" size={13} /></span></label>
      {markIcons.map((i) => <label key={i.id} title={i.label}><input type="radio" name={`event-mark-${id}`} value={i.id} checked={markIcon === i.id} onChange={() => setMarkIcon(i.id)} aria-label={i.label} /><span><MuseIcon name={markIconName(i.id) as MuseIconName} size={15} /></span></label>)}
    </fieldset>
    <GoogleMirrorSection museEventId={event && !event.seriesId ? event.id : undefined} recurring={!!rule || !!series} value={mirror} onChange={setMirrorEdit}
      onUseGoogle={(f) => { setTitle(f.title.replace(/^Canceled · /, "")); setStart(f.date); setEnd(f.endDate ?? ""); setAllDay(f.allDay); if (f.time) setTime(f.time); setEndTime(f.endTime ?? ""); setLocation(f.location ?? ""); setDetail(f.description ?? ""); setStatus(f.tentative ? "tentative" : "confirmed"); setMirrorEdit({ ...mirror, enabled: true, force: true }); }} />
    {googleProblem && <p className="muse-agenda-warning" role="alert">{googleProblem}</p>}
    <div className="editor-actions">
      <button type="submit" className="muse-button button-primary" disabled={!canEdit}>{event ? "Save event" : "Add event"}</button>
      <button type="button" className="muse-button button-ghost" onClick={onDone}>Cancel</button>
      {event && <FutureLogToggle source={{ kind: "event", id: event.id.split("::")[0] }} title={event.title} date={event.date} endDate={event.endDate ?? null} />}
      {event && (confirming
        ? <span className="muse-mark-confirm" role="group" aria-label="Confirm deleting this event">Delete for good?{link && <label className="muse-event-inline muse-google-also-delete"><input type="checkbox" checked={deleteInGoogle} onChange={(e) => setDeleteInGoogle(e.target.checked)} /> Also delete it from Google Calendar</label>}<button type="button" className="text-button" onClick={() => void removeGoogleCopyThen(() => { if (occDate && series && scope === "occurrence") dispatch({ type: "recurrence", now: new Date().toISOString(), change: { op: "event/occurrence", eventId: series.id, date: occDate, overrides: { deleted: true } } }); else { dispatch({ type: "event/delete", id: series?.id ?? event.id }); if (existingMark) void removeMark(existingMark.id); } onDone(); })}>{occDate && scope === "occurrence" ? "Delete this date" : series ? "Delete series" : "Delete"}</button><button type="button" className="text-button" onClick={() => setConfirming(false)}>Keep</button></span>
        : <button type="button" className="text-button" disabled={!canEdit} onClick={() => setConfirming(true)}>Delete</button>)}
    </div>
    {event && status !== "canceled" && <p className="small-label">Not happening? Choose Canceled to keep it on record without deleting it.</p>}
  </form>;
}
