"use client";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { deleteMemory, readMemories, saveMemory, type DailyMemory } from "@/lib/memories";

/**
 * One shared, in-memory view of Daily Memories, so Day Pulse, Mood and Insights show the same saved record and an
 * edit in one place appears everywhere. Dates are loaded by range; nothing here copies memories elsewhere.
 */
type Snapshot = { byDate: Record<string, DailyMemory | null>; loaded: Set<string>; error: string; version: number };
let snapshot: Snapshot = { byDate: {}, loaded: new Set(), error: "", version: 0 };
const listeners = new Set<() => void>();
let client: ReturnType<typeof createMuseBrowserClient> | null = null;
const getClient = () => client ??= createMuseBrowserClient();
const emit = (patch: Partial<Snapshot>) => { snapshot = { ...snapshot, ...patch, version: snapshot.version + 1 }; for (const l of listeners) l(); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const pending = new Map<string, Promise<void>>();

async function loadRange(start: string, end: string, force = false) {
  const key = `${start}/${end}`;
  if (!force && snapshot.loaded.has(key)) return;
  if (pending.has(key)) return pending.get(key);
  const run = (async () => {
    try {
      const list = await readMemories(getClient(), start, end), byDate = { ...snapshot.byDate };
      for (let d = start; d <= end; d = nextDay(d)) byDate[d] = null;
      for (const m of list) byDate[m.date] = m;
      emit({ byDate, loaded: new Set([...snapshot.loaded, key]), error: "" });
    } catch (e) { emit({ error: e instanceof Error ? e.message : "Little moments couldn’t load." }); }
    finally { pending.delete(key); }
  })();
  pending.set(key, run); return run;
}
const nextDay = (d: string) => { const t = new Date(`${d}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10); };

export function useMemoryRange(start: string, end: string) {
  const snap = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  useEffect(() => { if (start && end) void loadRange(start, end); }, [start, end]);
  const list = Object.values(snap.byDate).filter((m): m is DailyMemory => !!m && m.date >= start && m.date <= end).sort((a, b) => a.date.localeCompare(b.date));
  return { memories: list, loaded: snap.loaded.has(`${start}/${end}`), error: snap.error, retry: () => loadRange(start, end, true) };
}

export function useMemory(date: string) {
  const snap = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  useEffect(() => { if (date) void loadRange(date, date); }, [date]);
  const memory = snap.byDate[date] ?? null, loaded = date in snap.byDate;
  const save = useCallback(async (body: string, emoji: string | null) => {
    const saved = await saveMemory(getClient(), date, body, emoji, snapshot.byDate[date] ?? null);
    emit({ byDate: { ...snapshot.byDate, [date]: saved } }); return saved;
  }, [date]);
  const remove = useCallback(async () => {
    const cur = snapshot.byDate[date]; if (!cur) return;
    await deleteMemory(getClient(), cur.id); emit({ byDate: { ...snapshot.byDate, [date]: null } });
  }, [date]);
  return { memory, loaded, save, remove };
}
