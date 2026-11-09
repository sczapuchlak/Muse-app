import "server-only";
import type { createMuseAdminClient } from "@/lib/supabase/admin";
import { accessToken, GoogleReconnectError, profileTimeZone } from "./access";
import { grantsCalendarWrite } from "./oauth";
import { localParts, toRow, type GoogleApiEvent } from "./events";
import { canMirror, classify, createdGoogleId, fieldsFromGoogle, googleBody, linkedGoogleId, museFields, reconcileLink, retryable, validFields, writableRole,
  type GoogleEventFields, type LinkState, type MuseEventRow, type WriteOutcome } from "./write-rules";

/**
 * Google Calendar writes (#112). Server only, with the admin client, after the caller has checked the signed-in user.
 * - A write needs the connection's `calendar.events` grant and a calendar the person can edit in Google.
 * - Creates use Muse-chosen ids (a retry finds the event instead of duplicating it).
 * - Edits and deletes send If-Match with the etag the person saw; a 412 becomes a conflict with Google's version.
 * - Muse events are never changed here. A failed push only records the copy's state, so the Muse event is never lost.
 */
type Admin = ReturnType<typeof createMuseAdminClient>;
const API = "https://www.googleapis.com/calendar/v3";
export type WriteCode = WriteOutcome | "invalid" | "not-found" | "not-writable";
export class GoogleWriteError extends Error {
  constructor(public code: WriteCode, message: string, public remote?: { fields: GoogleEventFields | null; etag: string | null }) { super(message); }
}
const messages: Record<WriteCode, string> = {
  ok: "", exists: "", invalid: "Check the event details.", "not-found": "That event isn’t available anymore.",
  "not-writable": "Muse can’t edit that calendar. In Google, you need permission to make changes to it.",
  "needs-write": "Allow Muse to edit Google Calendar first.", reconnect: "Reconnect Google Calendar to save changes there.",
  conflict: "This changed in Google since you opened it. Review it before saving.", gone: "It was deleted in Google.",
  failed: "Google Calendar didn’t accept the change. Nothing in Muse was lost; try again.",
};
const fail = (code: WriteCode, remote?: GoogleWriteError["remote"]) => new GoogleWriteError(code, messages[code], remote);

type Conn = { id: string; user_id: string; scopes: string[]; status: string };
async function writableConnection(admin: Admin, userId: string, connectionId: string, calendarId: string) {
  const { data: conn, error } = await admin.from("google_connections").select("id,user_id,scopes,status").eq("id", connectionId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!conn) throw fail("not-found");
  if (conn.status === "needs-reconnect") throw fail("reconnect");
  if (!grantsCalendarWrite(conn.scopes)) throw fail("needs-write");
  const { data: cal } = await admin.from("google_calendars").select("access_role").eq("connection_id", conn.id).eq("calendar_id", calendarId).maybeSingle();
  if (!cal) throw fail("not-found");
  if (!writableRole(cal.access_role)) throw fail("not-writable");
  return conn as Conn;
}
async function token(admin: Admin, conn: Conn) {
  try { return await accessToken(admin, conn.id); }
  catch (e) {
    if (e instanceof GoogleReconnectError) { await admin.from("google_connections").update({ status: "needs-reconnect", last_error: e.message, updated_at: new Date().toISOString() }).eq("id", conn.id); throw fail("reconnect"); }
    throw e;
  }
}
type Reply = { status: number; json: (GoogleApiEvent & { error?: { errors?: { reason?: string }[] } }) | null };
async function call(tokenValue: string, method: "GET" | "POST" | "PATCH" | "DELETE", path: string, opts: { body?: unknown; etag?: string | null } = {}): Promise<Reply> {
  const r = await fetch(`${API}${path}`, { method, cache: "no-store", signal: AbortSignal.timeout(15_000),
    headers: { authorization: `Bearer ${tokenValue}`, ...(opts.body ? { "content-type": "application/json" } : {}), ...(opts.etag ? { "if-match": opts.etag } : {}) },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}) });
  return { status: r.status, json: r.status === 204 ? null : await r.json().catch(() => null) };
}
const eventPath = (calendarId: string, eventId?: string) => `/calendars/${encodeURIComponent(calendarId)}/events${eventId ? `/${encodeURIComponent(eventId)}` : ""}`;
async function remoteVersion(admin: Admin, tokenValue: string, userId: string, calendarId: string, eventId: string) {
  const r = await call(tokenValue, "GET", eventPath(calendarId, eventId));
  if (r.status !== 200 || !r.json || r.json.status === "cancelled") return null;
  const zone = await profileTimeZone(admin, userId);
  return { event: r.json, fields: fieldsFromGoogle(r.json, zone, localParts), etag: r.json.etag ?? null };
}
/** Keeps Muse's cache in step right away, so the Agenda shows the change without waiting for the next sync. */
async function cacheEvent(admin: Admin, conn: Conn, calendarId: string, e: GoogleApiEvent | null, eventId: string) {
  const row = e ? toRow(calendarId, e, await profileTimeZone(admin, conn.user_id)) : null;
  if (!row) { await admin.from("google_events").delete().eq("connection_id", conn.id).eq("calendar_id", calendarId).eq("event_id", eventId); return; }
  await admin.from("google_events").upsert({ ...row, user_id: conn.user_id, connection_id: conn.id, updated_at: new Date().toISOString() }, { onConflict: "connection_id,calendar_id,event_id" });
}
const check = (fields: GoogleEventFields) => { const problem = validFields(fields); if (problem) throw new GoogleWriteError("invalid", problem); };

/* ---------- Google events, edited directly ---------- */

export async function createGoogleEvent(admin: Admin, userId: string, a: { connectionId: string; calendarId: string; key: string; fields: GoogleEventFields }) {
  check(a.fields);
  const conn = await writableConnection(admin, userId, a.connectionId, a.calendarId), t = await token(admin, conn), id = createdGoogleId(a.key);
  let r = await call(t, "POST", eventPath(a.calendarId), { body: { ...googleBody(a.fields), id } });
  const outcome = classify(r.status, "create", r.json ?? undefined);
  if (outcome === "exists") r = await call(t, "GET", eventPath(a.calendarId, id)); // the same request already went through
  else if (outcome !== "ok") throw fail(outcome);
  if (!r.json) throw fail("failed");
  await cacheEvent(admin, conn, a.calendarId, r.json, id);
  return { eventId: id, etag: r.json.etag ?? null };
}

export async function updateGoogleEvent(admin: Admin, userId: string, a: { connectionId: string; calendarId: string; eventId: string; etag: string | null; fields: GoogleEventFields }) {
  check(a.fields);
  const conn = await writableConnection(admin, userId, a.connectionId, a.calendarId), t = await token(admin, conn);
  if (!a.etag) throw fail("invalid");
  const r = await call(t, "PATCH", eventPath(a.calendarId, a.eventId), { body: googleBody(a.fields), etag: a.etag });
  const outcome = classify(r.status, "update", r.json ?? undefined);
  if (outcome === "conflict") { const remote = await remoteVersion(admin, t, userId, a.calendarId, a.eventId); await cacheEvent(admin, conn, a.calendarId, remote?.event ?? null, a.eventId); throw fail(remote ? "conflict" : "gone", remote ? { fields: remote.fields, etag: remote.etag } : undefined); }
  if (outcome === "gone") { await cacheEvent(admin, conn, a.calendarId, null, a.eventId); throw fail("gone"); }
  if (outcome !== "ok" || !r.json) throw fail(outcome === "ok" ? "failed" : outcome);
  await cacheEvent(admin, conn, a.calendarId, r.json, a.eventId);
  return { eventId: a.eventId, etag: r.json.etag ?? null };
}

/** Deleting in Google is only ever called after the person confirmed it in Muse. */
export async function deleteGoogleEvent(admin: Admin, userId: string, a: { connectionId: string; calendarId: string; eventId: string; etag: string | null }) {
  const conn = await writableConnection(admin, userId, a.connectionId, a.calendarId), t = await token(admin, conn);
  const r = await call(t, "DELETE", eventPath(a.calendarId, a.eventId), { etag: a.etag });
  const outcome = classify(r.status, "delete", r.json ?? undefined);
  if (outcome === "conflict") { const remote = await remoteVersion(admin, t, userId, a.calendarId, a.eventId); await cacheEvent(admin, conn, a.calendarId, remote?.event ?? null, a.eventId); throw fail("conflict", remote ? { fields: remote.fields, etag: remote.etag } : undefined); }
  if (outcome !== "ok" && outcome !== "gone") throw fail(outcome);
  await cacheEvent(admin, conn, a.calendarId, null, a.eventId);
  return { deleted: true };
}

/* ---------- Muse events with "Also add to Google" ---------- */

type Link = { id: string; user_id: string; muse_event_id: string; connection_id: string; calendar_id: string; google_event_id: string; etag: string | null; state: LinkState };
const linkColumns = "id,user_id,muse_event_id,connection_id,calendar_id,google_event_id,etag,state";
async function setLink(admin: Admin, id: string, patch: Partial<{ etag: string | null; state: LinkState; last_error: string | null; pushed_at: string }>) {
  await admin.from("google_event_links").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
}

/**
 * Creates or updates the Google copy of one saved Muse event. The link row is written before Google is called, so an
 * interrupted push stays visible ("pending") and is retried; the same Muse event always maps to the same Google id.
 * `force` (after "Keep Muse's version") writes over Google's current version, which the person has just seen.
 */
export async function pushMuseEvent(admin: Admin, userId: string, a: { museEventId: string; connectionId?: string; calendarId?: string; force?: boolean }) {
  const { data: row, error } = await admin.from("planner_events").select("id,title,local_date,local_time,all_day,end_date,end_time,location,detail,status,time_zone,recurrence_rule").eq("id", a.museEventId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!row) throw fail("not-found");
  if (!canMirror(row)) throw new GoogleWriteError("invalid", "Repeating events can’t be added to Google yet. Add them in Google Calendar instead.");
  let { data: link } = await admin.from("google_event_links").select(linkColumns).eq("muse_event_id", row.id).eq("user_id", userId).maybeSingle() as { data: Link | null };
  if (!link) {
    if (!a.connectionId || !a.calendarId) throw new GoogleWriteError("invalid", "Choose a Google calendar.");
    await writableConnection(admin, userId, a.connectionId, a.calendarId);
    const created = await admin.from("google_event_links").insert({ user_id: userId, muse_event_id: row.id, connection_id: a.connectionId, calendar_id: a.calendarId, google_event_id: linkedGoogleId(row.id), state: "pending" }).select(linkColumns).single();
    if (created.error) throw created.error;
    link = created.data as Link;
  }
  try {
    const conn = await writableConnection(admin, userId, link.connection_id, link.calendar_id), t = await token(admin, conn);
    const fields = museFields(row as MuseEventRow, await profileTimeZone(admin, userId));
    check(fields);
    let r: Reply;
    // Never created, or deleted in Google: (re)create under the same id. Google keeps a deleted event's id, so this
    // finds it (409) and restores it with a PATCH instead of making a second copy.
    if (!link.etag || link.state === "missing") {
      r = await call(t, "POST", eventPath(link.calendar_id), { body: { ...googleBody(fields), id: link.google_event_id } });
      if (classify(r.status, "create") === "exists") {
        // An earlier attempt reached Google: bring that copy up to date instead of making another.
        const existing = await call(t, "GET", eventPath(link.calendar_id, link.google_event_id));
        r = await call(t, "PATCH", eventPath(link.calendar_id, link.google_event_id), { body: googleBody(fields), etag: existing.json?.etag ?? null });
      }
    } else {
      const etag = a.force ? (await remoteVersion(admin, t, userId, link.calendar_id, link.google_event_id))?.etag ?? null : link.etag;
      if (!etag) { await setLink(admin, link.id, { state: "missing", last_error: messages.gone }); throw fail("gone"); }
      r = await call(t, "PATCH", eventPath(link.calendar_id, link.google_event_id), { body: googleBody(fields), etag });
    }
    const outcome = classify(r.status, link.etag && link.state !== "missing" ? "update" : "create", r.json ?? undefined);
    if (outcome === "conflict") {
      const remote = await remoteVersion(admin, t, userId, link.calendar_id, link.google_event_id);
      await setLink(admin, link.id, { state: remote ? "conflict" : "missing", last_error: remote ? messages.conflict : messages.gone });
      throw fail(remote ? "conflict" : "gone", remote ? { fields: remote.fields, etag: remote.etag } : undefined);
    }
    if (outcome === "gone") { await setLink(admin, link.id, { state: "missing", last_error: messages.gone }); throw fail("gone"); }
    if (outcome !== "ok" || !r.json) throw fail(outcome === "ok" ? "failed" : outcome);
    await setLink(admin, link.id, { etag: r.json.etag ?? null, state: "synced", last_error: null, pushed_at: new Date().toISOString() });
    await cacheEvent(admin, conn, link.calendar_id, r.json, link.google_event_id);
    return { state: "synced" as LinkState, etag: r.json.etag ?? null };
  } catch (e) {
    const code = e instanceof GoogleWriteError ? e.code : "failed";
    if (code !== "conflict" && code !== "gone") await setLink(admin, link.id, { state: "error", last_error: e instanceof GoogleWriteError ? e.message : messages.failed });
    throw e instanceof GoogleWriteError ? e : fail("failed");
  }
}

/** Google's current version of a linked copy, for "Use Google's version". */
export async function linkedGoogleVersion(admin: Admin, userId: string, museEventId: string) {
  const { data: link } = await admin.from("google_event_links").select(linkColumns).eq("muse_event_id", museEventId).eq("user_id", userId).maybeSingle() as { data: Link | null };
  if (!link) throw fail("not-found");
  const conn = await writableConnection(admin, userId, link.connection_id, link.calendar_id), t = await token(admin, conn);
  const remote = await remoteVersion(admin, t, userId, link.calendar_id, link.google_event_id);
  if (!remote) { await setLink(admin, link.id, { state: "missing", last_error: messages.gone }); throw fail("gone"); }
  return { fields: remote.fields, etag: remote.etag };
}

/** Stops mirroring. The Google copy stays unless the person confirmed deleting it there too. */
export async function unlinkMuseEvent(admin: Admin, userId: string, a: { museEventId: string; deleteInGoogle: boolean }) {
  const { data: link } = await admin.from("google_event_links").select(linkColumns).eq("muse_event_id", a.museEventId).eq("user_id", userId).maybeSingle() as { data: Link | null };
  if (!link) return { unlinked: true };
  if (a.deleteInGoogle && link.etag) await deleteGoogleEvent(admin, userId, { connectionId: link.connection_id, calendarId: link.calendar_id, eventId: link.google_event_id, etag: link.etag });
  const r = await admin.from("google_event_links").delete().eq("id", link.id).eq("user_id", userId);
  if (r.error) throw r.error;
  return { unlinked: true };
}

/** After a sync: each synced copy that was edited or deleted in Google becomes a conflict or missing — never overwritten. */
export async function reconcileLinks(admin: Admin, conn: { id: string; user_id: string }, tokenValue: string) {
  const { data: links } = await admin.from("google_event_links").select(linkColumns).eq("connection_id", conn.id).in("state", ["synced", "conflict"]);
  for (const link of (links ?? []) as Link[]) {
    const { data: cached } = await admin.from("google_events").select("etag").eq("connection_id", conn.id).eq("calendar_id", link.calendar_id).eq("event_id", link.google_event_id).maybeSingle();
    let gone = false;
    if (!cached) { const r = await call(tokenValue, "GET", eventPath(link.calendar_id, link.google_event_id)); gone = r.status === 404 || r.status === 410 || r.json?.status === "cancelled"; }
    const next = reconcileLink(link, cached ?? null, gone);
    if (next !== link.state) await setLink(admin, link.id, { state: next, last_error: next === "missing" ? messages.gone : next === "conflict" ? "Changed in Google. Choose which version to keep." : null });
  }
}

/** Background retries of failed or unfinished pushes (never conflicts or missing copies; those wait for the person). */
export async function retryLinks(admin: Admin, opts: { limit: number }) {
  const { data } = await admin.from("google_event_links").select("muse_event_id,user_id,state").in("state", ["pending", "error"]).order("updated_at").limit(opts.limit);
  let ok = 0;
  for (const l of data ?? []) {
    if (!retryable(l.state as LinkState)) continue;
    try { await pushMuseEvent(admin, l.user_id, { museEventId: l.muse_event_id }); ok++; } catch { /* state recorded on the link */ }
  }
  return ok;
}
