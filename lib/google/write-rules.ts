/**
 * Google Calendar writes (#112, phase 3) — pure rules shared by the server, the browser and tests. No network here.
 *
 * - Event ids are chosen by Muse, so a retried create can never make a second event (Google answers 409 instead).
 * - Edits and deletes carry the etag the person saw; a 412 from Google is a conflict, never an overwrite.
 * - A Muse event linked to Google stays the authoritative record; the Google copy is a reference with its own state.
 */

export const GOOGLE_ID = /^[a-v0-9]{5,1024}$/;
const hex = (uuid: string) => uuid.toLowerCase().replace(/-/g, "");
const uuidOk = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
/** The Google id for a Muse event's copy: the same Muse event always maps to the same Google event. */
export function linkedGoogleId(museEventId: string) { if (!uuidOk(museEventId)) throw new Error("Invalid event."); return `muse${hex(museEventId)}`; }
/** The Google id for an event created directly in a Google calendar from Muse; the key is fixed when the form opens. */
export function createdGoogleId(idempotencyKey: string) { if (!uuidOk(idempotencyKey)) throw new Error("Invalid request."); return `musec${hex(idempotencyKey)}`; }

/** What Muse can change on a Google event. Times are the person's wall clock in `timeZone`. */
export type GoogleEventFields = { title: string; date: string; endDate: string | null; allDay: boolean; time: string | null; endTime: string | null;
  location: string | null; description: string | null; timeZone: string; tentative?: boolean };

const DATE = /^\d{4}-\d{2}-\d{2}$/, TIME = /^\d{2}:\d{2}$/;
const addDays = (d: string, n: number) => { const t = new Date(`${d}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
function plusHour(date: string, time: string) { const [h, m] = time.split(":").map(Number); return h >= 23 ? { date: addDays(date, 1), time: `${String(h - 23).padStart(2, "0")}:${String(m).padStart(2, "0")}` } : { date, time: `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}` }; }

export function validFields(f: GoogleEventFields): string {
  if (!f.title.trim()) return "Give the event a title.";
  if (f.title.length > 300) return "Keep the title under 300 characters.";
  if (!DATE.test(f.date) || (f.endDate && (!DATE.test(f.endDate) || f.endDate < f.date))) return "Check the dates.";
  if (!f.allDay && (!f.time || !TIME.test(f.time) || (f.endTime && !TIME.test(f.endTime)))) return "Check the times.";
  if ((f.location?.length ?? 0) > 300 || (f.description?.length ?? 0) > 8000) return "Location or notes are too long.";
  try { new Intl.DateTimeFormat("en-US", { timeZone: f.timeZone }); } catch { return "Unknown time zone."; }
  return "";
}

/** Google's event body. All-day ends are exclusive in Google; Muse's are inclusive. Timed events without an end get an hour. */
export function googleBody(f: GoogleEventFields) {
  const base = { summary: f.title.trim(), location: f.location?.trim() || "", description: f.description?.trim() || "", status: f.tentative ? "tentative" : "confirmed" };
  if (f.allDay) return { ...base, start: { date: f.date }, end: { date: addDays(f.endDate ?? f.date, 1) } };
  const start = { date: f.date, time: f.time! };
  let end = { date: f.endDate ?? f.date, time: f.endTime ?? "" };
  if (!end.time || `${end.date}T${end.time}` <= `${start.date}T${start.time}`) end = plusHour(start.date, start.time);
  return { ...base, start: { dateTime: `${start.date}T${start.time}:00`, timeZone: f.timeZone }, end: { dateTime: `${end.date}T${end.time}:00`, timeZone: f.timeZone } };
}

/** A Muse event (planner_events row) as Google fields. Canceled stays an event in Google, marked in its title, because
 *  a Google "cancelled" status deletes it there — and deleting in Google always needs the person's confirmation. */
export type MuseEventRow = { title: string; local_date: string; local_time: string | null; all_day: boolean | null; end_date: string | null; end_time: string | null;
  location: string | null; detail: string | null; status: string | null; time_zone: string | null; recurrence_rule?: unknown };
export function museFields(r: MuseEventRow, fallbackZone: string): GoogleEventFields {
  const canceled = r.status === "canceled";
  return { title: `${canceled ? "Canceled · " : ""}${r.title}`.slice(0, 300), date: r.local_date, endDate: r.end_date && r.end_date > r.local_date ? r.end_date : null, allDay: !!r.all_day || !r.local_time,
    time: r.local_time?.slice(0, 5) ?? null, endTime: r.end_time?.slice(0, 5) ?? null, location: r.location, description: r.detail, timeZone: r.time_zone || fallbackZone, tentative: r.status === "tentative" };
}
/** Recurring Muse events aren't mirrored to Google yet (their exceptions don't map one-to-one onto Google's). */
export const canMirror = (r: Pick<MuseEventRow, "recurrence_rule">) => !r.recurrence_rule;

/** Fields shown for "Use Google's version": the Google event in Muse's shape. */
export function fieldsFromGoogle(e: { summary?: string; location?: string; description?: string; status?: string; start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string } }, timeZone: string, local: (iso: string, tz: string) => { date: string; time: string }): GoogleEventFields | null {
  if (!e.start) return null;
  if (e.start.date) { const end = e.end?.date ? addDays(e.end.date, -1) : e.start.date; return { title: e.summary ?? "", date: e.start.date, endDate: end > e.start.date ? end : null, allDay: true, time: null, endTime: null, location: e.location ?? null, description: e.description ?? null, timeZone, tentative: e.status === "tentative" }; }
  if (!e.start.dateTime) return null;
  const s = local(e.start.dateTime, timeZone), en = e.end?.dateTime ? local(e.end.dateTime, timeZone) : null;
  return { title: e.summary ?? "", date: s.date, endDate: en && en.date !== s.date ? en.date : null, allDay: false, time: s.time, endTime: en?.time ?? null, location: e.location ?? null, description: e.description ?? null, timeZone, tentative: e.status === "tentative" };
}

/** How a Google write answered. 409 on create = already made (a retry); 412 = changed in Google; 404/410 on delete = already gone. */
export type WriteOutcome = "ok" | "exists" | "conflict" | "gone" | "reconnect" | "needs-write" | "failed";
export function classify(status: number, op: "create" | "update" | "delete", body?: { error?: { errors?: { reason?: string }[] } }): WriteOutcome {
  if (status >= 200 && status < 300) return "ok";
  if (op === "create" && status === 409) return "exists";
  if (status === 412) return "conflict";
  if ((status === 404 || status === 410) && op !== "create") return "gone";
  if (status === 401) return "reconnect";
  if (status === 403) { const reasons = body?.error?.errors?.map((e) => e.reason) ?? []; return reasons.some((r) => r === "insufficientPermissions" || r === "forbidden" || r === "requiredAccessLevel") ? "needs-write" : "failed"; }
  return "failed";
}

/** A link's state. `changed-in-google` and `missing` are only ever set by sync; Muse never overwrites them silently. */
export type LinkState = "pending" | "synced" | "error" | "conflict" | "missing";
/** After a sync: compare each synced link with the cached Google copy. A different etag means it was edited in Google. */
export function reconcileLink(link: { state: LinkState; etag: string | null }, cached: { etag: string | null } | null, goneInGoogle: boolean): LinkState {
  if (goneInGoogle) return "missing";
  if (link.state !== "synced" || !cached) return link.state;
  return cached.etag && link.etag && cached.etag !== link.etag ? "conflict" : "synced";
}
/** Background retries: only failed or unfinished pushes. Conflicts and missing copies wait for the person. */
export const retryable = (s: LinkState) => s === "pending" || s === "error";

/** Calendars Muse may write to (Google's own access role). */
export const writableRole = (role: string) => role === "owner" || role === "writer";
