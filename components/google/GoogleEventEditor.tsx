"use client";
import { useState, type FormEvent } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { DayEvent } from "@/lib/models";
import type { GoogleEventFields } from "@/lib/google/write-rules";
import { allowEditingHref, googleWrite, GoogleWriteFailure, useGoogleDestinations } from "./GoogleCalendarStore";

/**
 * #112 Create or edit a Google Calendar event from Muse. The event lives only in Google (Muse keeps a cache), so:
 * - a create carries an id fixed when the form opened, so double-submits and retries can't make two events;
 * - an edit sends the version you opened; if it changed in Google you choose — nothing is silently overwritten;
 * - delete asks first, every time;
 * - a recurring event's occurrence is edited on its own (the whole series stays a Google Calendar job).
 */
export type GoogleTarget = { connectionId: string; calendarId: string };
type Props = { event?: DayEvent; target?: GoogleTarget; date: string; initialTitle?: string; timeZone: string; onDone: () => void; onSaveInMuse?: (fields: GoogleEventFields) => void };

const toFields = (e: DayEvent | undefined, date: string, title: string, timeZone: string): GoogleEventFields => ({
  title: e?.title ?? title, date: e?.date ?? date, endDate: e?.endDate ?? null, allDay: e?.allDay ?? false, time: e && !e.allDay ? e.dateTime.slice(11, 16) : "09:00",
  endTime: e?.endTime ?? null, location: e?.location ?? null, description: e?.detail ?? null, timeZone, tentative: e?.status === "tentative" });

export function GoogleEventEditor({ event, target, date, initialTitle = "", timeZone, onDone, onSaveInMuse }: Props) {
  const where = event?.google ? { connectionId: event.google.connectionId, calendarId: event.google.calendarId } : target;
  const destinations = useGoogleDestinations(), cal = destinations.find((d) => d.connection_id === where?.connectionId && d.calendar_id === where?.calendarId);
  const path = usePathname() ?? "/planner", query = useSearchParams()?.toString();
  const [f, setF] = useState<GoogleEventFields>(() => toFields(event, date, initialTitle, timeZone));
  const [etag, setEtag] = useState(event?.google?.etag ?? null), [key] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [code, setCode] = useState("");
  const [remote, setRemote] = useState<GoogleWriteFailure["remote"] | null>(null), [confirmDelete, setConfirmDelete] = useState(false);
  const set = (p: Partial<GoogleEventFields>) => setF((x) => ({ ...x, ...p }));
  const occurrence = !!event?.google?.recurringEventId;
  async function run(work: () => Promise<unknown>) {
    setBusy(true); setError(""); setCode("");
    try { await work(); onDone(); }
    catch (e) {
      const x = e instanceof GoogleWriteFailure ? e : new GoogleWriteFailure("That didn’t save. Try again.", "failed");
      setError(x.message); setCode(x.code); if (x.code === "conflict") setRemote(x.remote ?? null);
    } finally { setBusy(false); }
  }
  function submit(e: FormEvent, etagOverride?: string | null) {
    e.preventDefault(); if (!where) return;
    if (event?.google) void run(() => googleWrite({ action: "update", ...where, eventId: event.google!.eventId, etag: etagOverride ?? etag, fields: f }));
    else void run(() => googleWrite({ action: "create", ...where, key, fields: f }));
  }
  const allow = allowEditingHref(`${path}${query ? `?${query}` : ""}`);
  return <form className="muse-event-editor muse-google-editor" onSubmit={submit}>
    <p className="editor-label">Google Calendar{cal ? ` · ${cal.name}` : ""}</p>
    <input aria-label="Event title" type="text" required maxLength={300} value={f.title} placeholder="Dentist, London trip…" onChange={(e) => set({ title: e.target.value })} />
    <label className="muse-event-inline"><input type="checkbox" checked={f.allDay} onChange={(e) => set({ allDay: e.target.checked, time: e.target.checked ? null : f.time ?? "09:00" })} /> All day</label>
    <div className="muse-event-row">
      <label><span>Starts</span><input type="date" required value={f.date} onChange={(e) => set({ date: e.target.value, endDate: f.endDate && f.endDate < e.target.value ? null : f.endDate })} /></label>
      <label><span>Ends <small>optional</small></span><input type="date" min={f.date} value={f.endDate ?? ""} onChange={(e) => set({ endDate: e.target.value || null })} /></label>
    </div>
    {!f.allDay && <div className="muse-event-row">
      <label><span>From</span><input type="time" required value={f.time ?? ""} onChange={(e) => set({ time: e.target.value })} /></label>
      <label><span>Until <small>optional</small></span><input type="time" value={f.endTime ?? ""} onChange={(e) => set({ endTime: e.target.value || null })} /></label>
    </div>}
    <label><span>Where <small>optional</small></span><input type="text" maxLength={300} value={f.location ?? ""} onChange={(e) => set({ location: e.target.value || null })} /></label>
    <label><span>Notes <small>optional</small></span><textarea rows={2} maxLength={8000} value={f.description ?? ""} onChange={(e) => set({ description: e.target.value || null })} /></label>
    {occurrence && <p className="small-label">This is one date of a repeating event. Changes here apply to this date only; edit the whole series in Google Calendar.</p>}
    {error && <div className="muse-google-problem" role="alert">
      <p>{error}</p>
      {code === "needs-write" && <a className="muse-button" href={allow}>Allow Muse to edit Google Calendar</a>}
      {code === "reconnect" && <a className="muse-button" href={allow}>Reconnect Google Calendar</a>}
      {code === "conflict" && remote?.fields && <div className="muse-google-conflict">
        <p className="small-label">In Google now: <strong>{remote.fields.title}</strong> · {remote.fields.date}{remote.fields.time ? ` ${remote.fields.time}` : ""}{remote.fields.location ? ` · ${remote.fields.location}` : ""}</p>
        <div className="editor-actions">
          <button type="button" className="muse-button" onClick={() => { setF({ ...remote.fields!, timeZone }); setEtag(remote.etag); setError(""); setCode(""); setRemote(null); }}>Use Google’s version</button>
          <button type="button" className="muse-button button-ghost" disabled={busy} onClick={(e) => { setEtag(remote.etag); submit(e as unknown as FormEvent, remote.etag); }}>Save mine anyway</button>
        </div>
      </div>}
      {!event && onSaveInMuse && code !== "conflict" && <button type="button" className="text-button" onClick={() => onSaveInMuse(f)}>Save it in Muse instead</button>}
    </div>}
    <div className="editor-actions">
      <button type="submit" className="muse-button button-primary" disabled={busy || !where}>{busy ? "Saving…" : event ? "Save in Google" : "Add to Google"}</button>
      <button type="button" className="muse-button button-ghost" onClick={onDone}>Cancel</button>
      {event?.google && (confirmDelete
        ? <span className="muse-mark-confirm" role="group" aria-label="Confirm deleting from Google Calendar">Delete it from Google Calendar{occurrence ? " (this date only)" : ""}?
            <button type="button" className="text-button" disabled={busy} onClick={() => void run(() => googleWrite({ action: "delete", ...where, eventId: event.google!.eventId, etag, confirmed: true }))}>Delete in Google</button>
            <button type="button" className="text-button" onClick={() => setConfirmDelete(false)}>Keep it</button></span>
        : <button type="button" className="text-button" onClick={() => setConfirmDelete(true)}>Delete</button>)}
      {event?.link?.startsWith("https://") && <a className="text-button" href={event.link} target="_blank" rel="noopener noreferrer">Open in Google Calendar</a>}
    </div>
  </form>;
}
