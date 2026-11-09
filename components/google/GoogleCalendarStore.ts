"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import type { DayEvent } from "@/lib/models";
import { toDayEvent, type GoogleEventRow } from "@/lib/google/events";
import { writableRole, type GoogleEventFields, type LinkState } from "@/lib/google/write-rules";

/**
 * Google Calendar (#35) in the browser: read-only. The browser can read only its owner's connection status, calendars
 * and cached events (RLS), and change only a calendar's visibility. Tokens never reach it; syncing goes through
 * `/api/google/*`.
 */
export type GoogleConnection = { id: string; email: string; status: string; last_synced_at: string | null; last_error: string | null; scopes: string[]; last_background_sync_at?: string | null };
/** #112 A Muse event's copy in Google ("Also add to Google"). */
export type GoogleLink = { muse_event_id: string; connection_id: string; calendar_id: string; google_event_id: string; etag: string | null; state: LinkState; last_error: string | null };
export const CALENDAR_WRITE = "https://www.googleapis.com/auth/calendar.events";
export const canWrite = (c: Pick<GoogleConnection, "scopes">) => c.scopes.includes(CALENDAR_WRITE);
export type GoogleCalendar = { id: string; connection_id: string; calendar_id: string; name: string; color: string | null; is_primary: boolean; visible: boolean; access_role: string };
type Snap = { loaded: boolean; connections: GoogleConnection[]; calendars: GoogleCalendar[]; links: GoogleLink[]; rows: (GoogleEventRow & { connection_id: string })[]; window: string; syncing: boolean; error: string };

let client: ReturnType<typeof createMuseBrowserClient> | undefined;
const db = () => client ??= createMuseBrowserClient();
let snap: Snap = { loaded: false, connections: [], calendars: [], links: [], rows: [], window: "", syncing: false, error: "" };
const listeners = new Set<() => void>();
const emit = (p: Partial<Snap>) => { snap = { ...snap, ...p }; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
/** #12: automatic sync at most every ~3 minutes (matches the server), never overlapping. */
const AUTO_SYNC_MS = 3 * 60 * 1000;
let lastAuto = 0, accountLoad: Promise<void> | null = null;
/** One account read at a time, shared by every component that mounts together (Agenda, Daily Edit, Settings). */
const reloadAccount = () => accountLoad ??= loadAccount().finally(() => { accountLoad = null; });
/** Sync when Agenda or Daily Edit opens or the page becomes visible again, if the last sync is older than ~3 minutes. */
export function autoSyncGoogle(now = Date.now()) {
  if (!snap.connections.length || snap.syncing) return false;
  const last = Math.max(lastAuto, ...snap.connections.map((c) => (c.last_synced_at ? Date.parse(c.last_synced_at) : 0)));
  if (now - last < AUTO_SYNC_MS) return false;
  lastAuto = now; void syncGoogle(); return true;
}

async function loadAccount() {
  const [c, k, l] = await Promise.all([
    db().from("google_connections").select("*").order("created_at"),
    db().from("google_calendars").select("id,connection_id,calendar_id,name,color,is_primary,visible,access_role").order("is_primary", { ascending: false }).order("name"),
    db().from("google_event_links").select("muse_event_id,connection_id,calendar_id,google_event_id,etag,state,last_error"),
  ]);
  if (c.error || k.error) throw c.error ?? k.error;
  // Links need the phase 3 tables; before that migration they simply aren't there and nothing is mirrored.
  emit({ loaded: true, connections: c.data ?? [], calendars: k.data ?? [], links: l.error ? [] : (l.data ?? []) as GoogleLink[], error: "" });
}

async function loadEvents(from: string, to: string) {
  if (!snap.connections.length) { emit({ rows: [], window: `${from}/${to}` }); return; }
  const { data, error } = await db().from("google_events")
    .select("connection_id,calendar_id,event_id,etag,title,location,start_date,start_time,end_date,end_time,all_day,time_zone,status,html_link,description,recurring_event_id")
    .lte("start_date", to).or(`end_date.gte.${from},and(end_date.is.null,start_date.gte.${from})`).order("start_date").limit(2000);
  if (error) throw error;
  emit({ rows: data ?? [], window: `${from}/${to}` });
}

async function post(path: string, body: unknown) {
  const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "Google Calendar is unavailable right now.");
  return j;
}

export async function syncGoogle(force = false) {
  if (snap.syncing) return;
  emit({ syncing: true });
  try { await post("/api/google/sync", { force }); } catch (e) { emit({ error: e instanceof Error ? e.message : "Google Calendar couldn’t sync." }); }
  try { await loadAccount(); const [f, t] = snap.window.split("/"); if (f && t) await loadEvents(f, t); } catch { /* keep what is shown */ }
  emit({ syncing: false });
}

export async function setCalendarVisible(cal: GoogleCalendar, visible: boolean) {
  emit({ calendars: snap.calendars.map((c) => c.id === cal.id ? { ...c, visible } : c) });
  const { error } = await db().from("google_calendars").update({ visible }).eq("id", cal.id);
  if (error) { emit({ calendars: snap.calendars.map((c) => c.id === cal.id ? { ...c, visible: !visible } : c), error: "That calendar setting didn’t save. Try again." }); return; }
  if (visible) void syncGoogle(); // a calendar shown again catches up from where it left off
}

export async function disconnectGoogle(id: string) {
  await post("/api/google/disconnect", { id });
  emit({ connections: snap.connections.filter((c) => c.id !== id), calendars: snap.calendars.filter((c) => c.connection_id !== id), rows: snap.rows.filter((r) => r.connection_id !== id) });
}

/** Connection status and calendars. Reloads on mount and syncs in the background when the last sync is ~3+ minutes old. */
export function useGoogleCalendar() {
  const s = useSyncExternalStore(subscribe, () => snap, () => snap);
  useEffect(() => {
    reloadAccount().then(() => { autoSyncGoogle(); }, () => emit({ loaded: true, error: "Google Calendar settings couldn’t load." }));
  }, []);
  return s;
}

/** Google events from visible calendars as read-only DayEvents for a date window (Agenda Day, Week and Month). */
export function useGoogleEvents(from: string, to: string): DayEvent[] {
  const s = useGoogleCalendar();
  const ready = s.loaded && s.connections.length > 0;
  useEffect(() => { if (ready) loadEvents(from, to).catch(() => { /* Google events are optional; Muse's own still show */ }); }, [ready, from, to]);
  useEffect(() => {
    if (!ready) return;
    const back = () => { if (document.visibilityState === "visible") autoSyncGoogle(); };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, [ready]);
  return useMemo(() => {
    const cals = new Map(s.calendars.filter((c) => c.visible).map((c) => [`${c.connection_id}|${c.calendar_id}`, c]));
    const editing = new Set(s.connections.filter(canWrite).map((c) => c.id));
    // #112 A Muse event's Google copy shows once — as the Muse event — never twice.
    const mirrored = new Set(s.links.map((l) => `${l.connection_id}|${l.calendar_id}|${l.google_event_id}`));
    return s.rows.flatMap((r) => {
      const key = `${r.connection_id}|${r.calendar_id}`, c = cals.get(key);
      if (!c || mirrored.has(`${key}|${r.event_id}`)) return [];
      return [toDayEvent(r, { ...c, writable: editing.has(r.connection_id) && writableRole(c.access_role) })];
    });
  }, [s.rows, s.calendars, s.connections, s.links]);
}

/* ---------- #112 Writes. Every change goes through the server; the browser never holds a Google token. ---------- */
export class GoogleWriteFailure extends Error {
  constructor(message: string, public code: string, public remote?: { fields: GoogleEventFields | null; etag: string | null }) { super(message); }
}
/** Sends one write, then reloads what Muse shows. Throws GoogleWriteFailure with a plain message and a code. */
export async function googleWrite(body: Record<string, unknown>) {
  const r = await fetch("/api/google/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" }).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  try { await loadAccount(); const [f, t] = snap.window.split("/"); if (f && t) await loadEvents(f, t); } catch { /* keep what is shown */ }
  if (!r || !r.ok) throw new GoogleWriteFailure(j.error ?? "Google Calendar couldn’t be reached. Nothing in Muse was lost; try again.", j.code ?? "failed", j.remote);
  return j;
}
/** "Allow editing": adds calendar.events to what was granted, then comes back to `next`. */
export const allowEditingHref = (next: string) => `/api/google/connect?write=1&next=${encodeURIComponent(next)}`;
/** Calendars Muse could write to, with whether editing is already allowed on their connection. */
export function useGoogleDestinations() {
  const s = useGoogleCalendar();
  return useMemo(() => s.calendars.filter((c) => writableRole(c.access_role)).map((c) => {
    const conn = s.connections.find((x) => x.id === c.connection_id);
    return { ...c, email: conn?.email ?? "", editing: !!conn && canWrite(conn), reconnect: conn?.status === "needs-reconnect" };
  }), [s.calendars, s.connections]);
}
export function useGoogleLink(museEventId: string | undefined) {
  const s = useGoogleCalendar();
  return museEventId ? s.links.find((l) => l.muse_event_id === museEventId) ?? null : null;
}
