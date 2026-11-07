"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { changeLayout, defaultLayout, type AgendaLayout, type LayoutChange } from "@/lib/agenda-layout";
import type { MuseMark } from "@/lib/muse-marks";
import { deleteMark, readAgendaLayout, readDayNotes, readMarks, saveAgendaLayout, saveDayNote, saveMark, type DayNote } from "@/lib/planner-week";

type AgendaData = {
  userId: string; loaded: boolean; status: string;
  layout: AgendaLayout; changeLayout: (change: LayoutChange) => void;
  marks: MuseMark[]; saveMark: (mark: Omit<MuseMark, "revision"> & { revision?: number }) => Promise<boolean>; removeMark: (id: string) => Promise<boolean>;
  note: (sectionId: string, date: string) => DayNote; setNote: (note: DayNote) => void;
};
const Context = createContext<AgendaData | null>(null);
const message = (e: unknown, fallback: string) => e instanceof Error && e.message ? e.message : fallback;

/**
 * The Agenda's own planning records (#79): the shared weekly template, Muse Marks and day notes for the visible
 * window. Tasks and events stay in the Planner store; nothing here copies them.
 */
export function AgendaDataProvider({ start, end, children }: { start: string; end: string; children: ReactNode }) {
  const client = useMemo(() => createMuseBrowserClient(), []);
  const [userId, setUserId] = useState(""), [loaded, setLoaded] = useState(false), [status, setStatus] = useState("");
  const [layout, setLayout] = useState<AgendaLayout>(defaultLayout), [marks, setMarks] = useState<MuseMark[]>([]), [notes, setNotes] = useState<DayNote[]>([]);
  const layoutRef = useRef({ layout: defaultLayout(), revision: 0 }), layoutQueue = useRef<Promise<void>>(Promise.resolve());
  const noteTimers = useRef(new Map<string, number>()), noteRevisions = useRef(new Map<string, number>());

  useEffect(() => { let live = true; void (async () => { try {
    const { data } = await client.auth.getUser(); if (!data.user || !live) return; setUserId(data.user.id);
    const saved = await readAgendaLayout(client, data.user.id); if (!live) return;
    layoutRef.current = saved; setLayout(saved.layout); setLoaded(true);
  } catch (e) { if (live) { setLoaded(true); setStatus(message(e, "Your layout couldn’t load, so the default is shown.")); } } })(); return () => { live = false; }; }, [client]);

  useEffect(() => { if (!userId || !start || !end) return; let live = true; void (async () => { try {
    const [m, n] = await Promise.all([readMarks(client, userId, start, end), readDayNotes(client, userId, start, end)]);
    if (!live) return; setMarks(m); setNotes((cur) => [...cur.filter((x) => x.date < start || x.date > end), ...n]); for (const x of n) noteRevisions.current.set(`${x.sectionId}/${x.date}`, x.revision);
  } catch (e) { if (live) setStatus(message(e, "Marks and notes couldn’t load.")); } })(); return () => { live = false; }; }, [client, userId, start, end]);

  // Layout edits apply at once and save in order; a failed save restores the last saved template.
  const change = useCallback((c: LayoutChange) => {
    setLayout((current) => {
      const next = changeLayout(current, c); if (next === current || !userId) return next;
      layoutQueue.current = layoutQueue.current.then(async () => {
        setStatus("Saving layout…");
        try { layoutRef.current = await saveAgendaLayout(client, userId, next, layoutRef.current.revision); setStatus(""); }
        catch (e) { setLayout(layoutRef.current.layout); setStatus(message(e, "Your layout didn’t save.")); }
      });
      return next;
    });
  }, [client, userId]);

  const save = useCallback(async (mark: Omit<MuseMark, "revision"> & { revision?: number }) => {
    const before = marks; setMarks((list) => [...list.filter((m) => m.id !== mark.id), { ...mark, revision: mark.revision ?? 0 }]); setStatus("Saving Mark…");
    try { const saved = await saveMark(client, userId, mark); setMarks((list) => [...list.filter((m) => m.id !== saved.id), saved]); setStatus(""); return true; }
    catch (e) { setMarks(before); setStatus(message(e, "That Mark didn’t save.")); return false; }
  }, [client, userId, marks]);
  const remove = useCallback(async (id: string) => {
    const before = marks; setMarks((list) => list.filter((m) => m.id !== id));
    try { await deleteMark(client, userId, id); return true; } catch (e) { setMarks(before); setStatus(message(e, "That Mark wasn’t removed.")); return false; }
  }, [client, userId, marks]);

  const note = useCallback((sectionId: string, date: string) => notes.find((n) => n.sectionId === sectionId && n.date === date) ?? { sectionId, date, body: "", revision: 0 }, [notes]);
  const setNote = useCallback((n: DayNote) => {
    const key = `${n.sectionId}/${n.date}`;
    setNotes((list) => [...list.filter((x) => `${x.sectionId}/${x.date}` !== key), n]);
    const timers = noteTimers.current; window.clearTimeout(timers.get(key));
    timers.set(key, window.setTimeout(async () => {
      setStatus("Saving note…");
      try { const saved = await saveDayNote(client, userId, { ...n, revision: noteRevisions.current.get(key) ?? 0 }); noteRevisions.current.set(key, saved.revision); setStatus(""); }
      catch (e) { setStatus(message(e, "That note didn’t save.")); }
    }, 700));
  }, [client, userId]);

  const value = useMemo<AgendaData>(() => ({ userId, loaded, status, layout, changeLayout: change, marks, saveMark: save, removeMark: remove, note, setNote }), [userId, loaded, status, layout, change, marks, save, remove, note, setNote]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAgendaData() { const v = useContext(Context); if (!v) throw Error("Agenda data needs its provider"); return v; }
