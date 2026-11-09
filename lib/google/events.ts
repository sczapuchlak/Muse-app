/**
 * Google Calendar (#35) — pure mapping, shared by the server sync and the Planner. Google events become the same
 * DayEvent shape Muse already shows, marked `source: "google"` and read-only.
 */
import type { DayEvent } from "@/lib/models";
import { clockLabel } from "@/lib/data/planner";
export type GoogleApiEvent = { id: string; etag?: string; status?: string; summary?: string; location?: string; description?: string; htmlLink?: string; recurringEventId?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string }; end?: { date?: string; dateTime?: string; timeZone?: string } };
export type GoogleEventRow = { calendar_id: string; event_id: string; etag: string | null; title: string; location: string | null; start_date: string; start_time: string | null;
  end_date: string | null; end_time: string | null; all_day: boolean; time_zone: string | null; status: string; html_link: string | null;
  /** #112: shown and edited in Muse; a repeating event's occurrence knows its series. Optional for older caches. */
  description?: string | null; recurring_event_id?: string | null };
const shift = (d: string, n: number) => { const t = new Date(`${d}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
/** Local date and HH:MM of an RFC 3339 instant in the person's time zone. */
export function localParts(iso: string, timeZone: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}
/** null for cancelled or unusable events (the sync deletes those from the cache). */
export function toRow(calendarId: string, e: GoogleApiEvent, timeZone: string): GoogleEventRow | null {
  if (e.status === "cancelled" || !e.start) return null;
  const base = { calendar_id: calendarId, event_id: e.id, etag: e.etag ?? null, title: (e.summary ?? "(No title)").slice(0, 300), location: e.location?.slice(0, 300) ?? null, status: e.status === "tentative" ? "tentative" : "confirmed", html_link: e.htmlLink ?? null, time_zone: e.start.timeZone ?? null,
    description: e.description?.slice(0, 8000) ?? null, recurring_event_id: e.recurringEventId ?? null };
  if (e.start.date) { // all-day: Google's end date is exclusive
    const end = e.end?.date ? shift(e.end.date, -1) : e.start.date;
    return { ...base, start_date: e.start.date, start_time: null, end_date: end > e.start.date ? end : null, end_time: null, all_day: true };
  }
  if (!e.start.dateTime) return null;
  const s = localParts(e.start.dateTime, timeZone), en = e.end?.dateTime ? localParts(e.end.dateTime, timeZone) : null;
  return { ...base, start_date: s.date, start_time: s.time, end_date: en && en.date !== s.date ? en.date : null, end_time: en?.time ?? null, all_day: false };
}
export function toDayEvent(r: GoogleEventRow & { id?: string; connection_id?: string }, cal?: { name: string; color: string | null; writable?: boolean }): DayEvent {
  return { id: `google:${r.calendar_id}:${r.event_id}`, kind: "event", title: r.title, date: r.start_date, dateTime: `${r.start_date}T${r.all_day ? "00:00" : (r.start_time ?? "00:00").slice(0, 5)}`,
    time: r.all_day ? "All day" : clockLabel((r.start_time ?? "00:00").slice(0, 5)), allDay: r.all_day || undefined, endDate: r.end_date ?? undefined, endTime: r.end_time?.slice(0, 5) ?? undefined,
    location: r.location ?? undefined, detail: r.description ?? undefined, status: r.status === "tentative" ? "tentative" : "confirmed", source: "google", color: cal?.color ?? undefined, calendarName: cal?.name, link: r.html_link ?? undefined,
    ...(r.connection_id ? { google: { connectionId: r.connection_id, calendarId: r.calendar_id, eventId: r.event_id, etag: r.etag, recurringEventId: r.recurring_event_id ?? null, writable: !!cal?.writable } } : {}) };
}
export const isGoogleEvent = (e: { id: string; source?: string }) => e.source === "google" || e.id.startsWith("google:");
