import "server-only";
import type { createMuseAdminClient } from "@/lib/supabase/admin";
import { open } from "./crypto";
import { revoke } from "./oauth";
import { accessToken, GoogleReconnectError, profileTimeZone } from "./access";
export { GoogleReconnectError } from "./access";
import { toRow, type GoogleApiEvent } from "./events";
import { defaultVisible, syncWindow } from "./calendars";
import { reconcileLinks, retryLinks } from "./write";

/**
 * Google Calendar read-only sync (#35, phase 1). Server only: it runs with the admin client because tokens have no
 * browser grants. Every write is scoped to one connection that the caller has already checked belongs to the user.
 */
type Admin = ReturnType<typeof createMuseAdminClient>;
type Connection = { id: string; user_id: string; status: string; last_synced_at: string | null };
const API = "https://www.googleapis.com/calendar/v3";
// #12: automatic syncs are skipped within ~3 minutes of the last one (manual Refresh now forces a sync).
export const THROTTLE_MS = 3 * 60 * 1000;
const MAX_PAGES = 40, CHUNK = 500;

class SyncTokenExpired extends Error {}

/** A short, person-facing reason. Never includes tokens or Google's raw response. */
const reason = (e: unknown) => e instanceof GoogleReconnectError ? e.message : "Google Calendar couldn’t be reached. Muse will try again.";


async function google<T>(token: string, path: string, params: Record<string, string>): Promise<T> {
  const r = await fetch(`${API}${path}?${new URLSearchParams(params)}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (r.status === 410) throw new SyncTokenExpired();
  if (r.status === 401 || r.status === 403) throw new GoogleReconnectError("Google Calendar access was declined. Reconnect to continue.");
  if (!r.ok) throw new Error(`Google Calendar ${r.status}`);
  return r.json() as Promise<T>;
}

type CalendarListEntry = { id: string; summary?: string; summaryOverride?: string; backgroundColor?: string; accessRole?: string; primary?: boolean; deleted?: boolean; hidden?: boolean };

/** Mirrors Google's calendar list. New calendars get a default visibility; your later choices are never overwritten. */
export async function refreshCalendars(admin: Admin, conn: Connection, token?: string) {
  token ??= await accessToken(admin, conn.id);
  const items: CalendarListEntry[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < 10; i++) {
    const page = await google<{ items?: CalendarListEntry[]; nextPageToken?: string }>(token, "/users/me/calendarList", { minAccessRole: "reader", maxResults: "250", ...(pageToken ? { pageToken } : {}) });
    items.push(...(page.items ?? []).filter((c) => !c.deleted));
    if (!(pageToken = page.nextPageToken)) break;
  }
  const { data: existing, error } = await admin.from("google_calendars").select("calendar_id").eq("connection_id", conn.id);
  if (error) throw error;
  const known = new Set((existing ?? []).map((c) => c.calendar_id)), now = new Date().toISOString();
  const row = (c: CalendarListEntry) => ({ user_id: conn.user_id, connection_id: conn.id, calendar_id: c.id, name: (c.summaryOverride ?? c.summary ?? "Calendar").slice(0, 200),
    color: /^#[0-9a-fA-F]{6}$/.test(c.backgroundColor ?? "") ? c.backgroundColor! : null, access_role: c.accessRole ?? "reader", is_primary: !!c.primary, updated_at: now });
  const fresh = items.filter((c) => !known.has(c.id)), kept = items.filter((c) => known.has(c.id));
  if (fresh.length) { const r = await admin.from("google_calendars").insert(fresh.map((c) => ({ ...row(c), visible: defaultVisible(c) }))); if (r.error) throw r.error; }
  if (kept.length) { const r = await admin.from("google_calendars").upsert(kept.map(row), { onConflict: "connection_id,calendar_id" }); if (r.error) throw r.error; }
  // A calendar removed in Google leaves Muse too, with its cached events. Nothing of Muse's own is touched.
  const gone = [...known].filter((id) => !items.some((c) => c.id === id));
  for (const id of gone) {
    const e = await admin.from("google_events").delete().eq("connection_id", conn.id).eq("calendar_id", id); if (e.error) throw e.error;
    const c = await admin.from("google_calendars").delete().eq("connection_id", conn.id).eq("calendar_id", id); if (c.error) throw c.error;
  }
  return token;
}

async function syncCalendar(admin: Admin, conn: Connection, token: string, cal: { calendar_id: string; sync_token: string | null }, timeZone: string, retried = false): Promise<void> {
  const full = !cal.sync_token, upserts = new Map<string, ReturnType<typeof toRow> & object>(), removed = new Set<string>();
  let pageToken: string | undefined, nextSyncToken: string | undefined;
  try {
    for (let i = 0; i < MAX_PAGES; i++) {
      const params: Record<string, string> = { singleEvents: "true", maxResults: "250", ...(pageToken ? { pageToken } : {}),
        ...(full ? syncWindow(new Date()) : { syncToken: cal.sync_token! }) };
      const page = await google<{ items?: GoogleApiEvent[]; nextPageToken?: string; nextSyncToken?: string }>(token, `/calendars/${encodeURIComponent(cal.calendar_id)}/events`, params);
      for (const e of page.items ?? []) {
        const r = toRow(cal.calendar_id, e, timeZone);
        if (r) { upserts.set(e.id, r); removed.delete(e.id); } else { removed.add(e.id); upserts.delete(e.id); }
      }
      nextSyncToken = page.nextSyncToken;
      if (!(pageToken = page.nextPageToken)) break;
    }
  } catch (e) {
    if (!(e instanceof SyncTokenExpired) || retried) throw e;
    // Google forgot our place (410 Gone): start this calendar over from a clean cache.
    return syncCalendar(admin, conn, token, { calendar_id: cal.calendar_id, sync_token: null }, timeZone, true);
  }
  const scope = () => admin.from("google_events").delete().eq("connection_id", conn.id).eq("calendar_id", cal.calendar_id);
  if (full) { const r = await scope(); if (r.error) throw r.error; }
  const rows = [...upserts.values()].map((r) => ({ ...r, user_id: conn.user_id, connection_id: conn.id, updated_at: new Date().toISOString() }));
  for (let i = 0; i < rows.length; i += CHUNK) { const r = await admin.from("google_events").upsert(rows.slice(i, i + CHUNK), { onConflict: "connection_id,calendar_id,event_id" }); if (r.error) throw r.error; }
  const ids = [...removed];
  for (let i = 0; i < ids.length; i += CHUNK) { const r = await scope().in("event_id", ids.slice(i, i + CHUNK)); if (r.error) throw r.error; }
  // Only save the new place once every page is stored, so an interrupted sync simply repeats.
  if (nextSyncToken) { const r = await admin.from("google_calendars").update({ sync_token: nextSyncToken }).eq("connection_id", conn.id).eq("calendar_id", cal.calendar_id); if (r.error) throw r.error; }
}


/** Syncs one connection's visible calendars and records the outcome on the connection. Never throws. */
export async function syncConnection(admin: Admin, conn: Connection, opts: { calendars?: boolean; background?: boolean } = {}) {
  try {
    const timeZone = await profileTimeZone(admin, conn.user_id);
    let token = await accessToken(admin, conn.id);
    if (opts.calendars) token = await refreshCalendars(admin, conn, token);
    const { data: cals, error } = await admin.from("google_calendars").select("calendar_id,sync_token").eq("connection_id", conn.id).eq("visible", true);
    if (error) throw error;
    for (const cal of cals ?? []) await syncCalendar(admin, conn, token, cal, timeZone);
    // #112: compare each Muse→Google copy with what Google now has (edited or deleted in Google).
    await reconcileLinks(admin, conn, token);
    const now = new Date().toISOString();
    await admin.from("google_connections").update({ status: "active", last_error: null, last_synced_at: now, updated_at: now, ...(opts.background ? { last_background_sync_at: now } : {}) }).eq("id", conn.id);
    return true;
  } catch (e) {
    await admin.from("google_connections").update({ status: e instanceof GoogleReconnectError ? "needs-reconnect" : "error", last_error: reason(e), updated_at: new Date().toISOString() }).eq("id", conn.id);
    return false;
  }
}

/** On-demand sync for everything a person has connected. Skips recent syncs unless forced; skips connections awaiting reconnect. */
export async function syncUser(admin: Admin, userId: string, force = false) {
  const { data, error } = await admin.from("google_connections").select("id,user_id,status,last_synced_at").eq("user_id", userId);
  if (error) throw error;
  for (const conn of data ?? []) {
    if (conn.status === "needs-reconnect") continue;
    if (!force && conn.last_synced_at && Date.now() - Date.parse(conn.last_synced_at) < THROTTLE_MS) continue;
    await syncConnection(admin, conn, { calendars: force });
  }
}

/** Revokes Muse's access with Google (best effort) and deletes the connection; cascades remove tokens, calendars and cached events. */
export async function disconnect(admin: Admin, userId: string, connectionId: string) {
  const { data: conn } = await admin.from("google_connections").select("id").eq("id", connectionId).eq("user_id", userId).maybeSingle();
  if (!conn) return false;
  const { data: tok } = await admin.from("google_tokens").select("refresh_ciphertext").eq("connection_id", conn.id).maybeSingle();
  if (tok) { try { await revoke(open(tok.refresh_ciphertext)); } catch { /* still delete locally */ } }
  const r = await admin.from("google_connections").delete().eq("id", conn.id).eq("user_id", userId);
  if (r.error) throw r.error;
  return true;
}

/**
 * #112 Background sync, called by pg_cron (through /api/google/cron) every 30 minutes, also while Muse is closed.
 * It syncs the connections that are due (oldest first, within a time budget so one run never overlaps the next),
 * skips ones waiting for a reconnect, then retries Muse→Google copies that failed earlier.
 */
export const BACKGROUND_DUE_MS = 25 * 60 * 1000;
export async function syncDue(admin: Admin, opts: { limit?: number; budgetMs?: number; now?: number } = {}) {
  const started = opts.now ?? Date.now(), budget = opts.budgetMs ?? 45_000, due = new Date(started - BACKGROUND_DUE_MS).toISOString();
  const { data, error } = await admin.from("google_connections").select("id,user_id,status,last_synced_at").neq("status", "needs-reconnect")
    .or(`last_synced_at.is.null,last_synced_at.lt.${due}`).order("last_synced_at", { ascending: true, nullsFirst: true }).limit(opts.limit ?? 25);
  if (error) throw error;
  let synced = 0, failed = 0;
  for (const conn of data ?? []) {
    if (Date.now() - started > budget) break;
    if (await syncConnection(admin, conn, { background: true })) synced++; else failed++;
  }
  const retried = Date.now() - started > budget ? 0 : await retryLinks(admin, { limit: 50 });
  return { due: data?.length ?? 0, synced, failed, retried };
}
