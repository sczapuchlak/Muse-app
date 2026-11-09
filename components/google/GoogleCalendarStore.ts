"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import type { DayEvent } from "@/lib/models";
import { toDayEvent, type GoogleEventRow } from "@/lib/google/events";

/**
 * Google Calendar (#35) in the browser: read-only. The browser can read only its owner's connection status, calendars
 * and cached events (RLS), and change only a calendar's visibility. Tokens never reach it; syncing goes through
 * `/api/google/*`.
 */
export type GoogleConnection = { id: string; email: string; status: string; last_synced_at: string | null; last_error: string | null };
export type GoogleCalendar = { id: string; connection_id: string; calendar_id: string; name: string; color: string | null; is_primary: boolean; visible: boolean; access_role: string };
type Snap = { loaded: boolean; connections: GoogleConnection[]; calendars: GoogleCalendar[]; rows: (GoogleEventRow & { connection_id: string })[]; window: string; syncing: boolean; error: string };

let client: ReturnType<typeof createMuseBrowserClient> | undefined;
const db = () => client ??= createMuseBrowserClient();
let snap: Snap = { loaded: false, connections: [], calendars: [], rows: [], window: "", syncing: false, error: "" };
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
  const [c, k] = await Promise.all([
    db().from("google_connections").select("id,email,status,last_synced_at,last_error").order("created_at"),
    db().from("google_calendars").select("id,connection_id,calendar_id,name,color,is_primary,visible,access_role").order("is_primary", { ascending: false }).order("name"),
  ]);
  if (c.error || k.error) throw c.error ?? k.error;
  emit({ loaded: true, connections: c.data ?? [], calendars: k.data ?? [], error: "" });
}

async function loadEvents(from: string, to: string) {
  if (!snap.connections.length) { emit({ rows: [], window: `${from}/${to}` }); return; }
  const { data, error } = await db().from("google_events")
    .select("connection_id,calendar_id,event_id,etag,title,location,start_date,start_time,end_date,end_time,all_day,time_zone,status,html_link")
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
    return s.rows.flatMap((r) => { const c = cals.get(`${r.connection_id}|${r.calendar_id}`); return c ? [toDayEvent(r, c)] : []; });
  }, [s.rows, s.calendars]);
}
