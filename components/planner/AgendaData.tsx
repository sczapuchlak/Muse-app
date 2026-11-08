"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { changeLayout, defaultLayout, type AgendaLayout, type LayoutChange } from "@/lib/agenda-layout";
import type { MuseMark } from "@/lib/muse-marks";
import { deleteMark, deleteSectionContent, readAgendaLayout, readDayNotes, readLibrary, readMarks, saveAgendaLayout, saveDayNote, saveLibrary, saveMark, type DayNote } from "@/lib/planner-week";
import { changeLibrary, emptyLibrary, type Library, type LibraryChange } from "@/lib/planner-customization";

type AgendaData = {
  userId: string; loaded: boolean; status: string;
  layout: AgendaLayout; changeLayout: (change: LayoutChange) => void;
  marks: MuseMark[]; saveMark: (mark: Omit<MuseMark, "revision"> & { revision?: number }) => Promise<boolean>; removeMark: (id: string) => Promise<boolean>;
  note: (sectionId: string, date: string) => DayNote; setNote: (note: DayNote, delay?: number) => void;
  /** #87: permanently delete everything written in a custom section (after the person confirms). */
  deleteContent: (sectionId: string) => Promise<boolean>;
  /** #87: saved Marks, palette and Saved Sections. */
  library: Library; changeLibrary: (change: LibraryChange) => void;
  /** Live height while a section is being dragged (not saved until release). */
  preview: Record<string, number>; setPreview: (id: string, px: number | null) => void;
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
  const [preview, setPreviewState] = useState<Record<string, number>>({});
  const setPreview = useCallback((id: string, px: number | null) => setPreviewState((p) => { const n = { ...p }; if (px === null) delete n[id]; else n[id] = px; return n; }), []);
  const [layout, setLayout] = useState<AgendaLayout>(defaultLayout), [marks, setMarks] = useState<MuseMark[]>([]), [notes, setNotes] = useState<DayNote[]>([]);
  const layoutRef = useRef({ layout: defaultLayout(), revision: 0 }), layoutQueue = useRef<Promise<void>>(Promise.resolve());
  const noteTimers = useRef(new Map<string, number>()), noteRevisions = useRef(new Map<string, number>());
  const [library, setLibrary] = useState<Library>(emptyLibrary), libraryRef = useRef({ library: emptyLibrary(), revision: 0 }), libraryQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => { let live = true; void (async () => { try {
    const { data } = await client.auth.getUser(); if (!data.user || !live) return; setUserId(data.user.id);
    const saved = await readAgendaLayout(client, data.user.id); if (!live) return;
    layoutRef.current = saved; setLayout(saved.layout); setLoaded(true);
    try { const lib = await readLibrary(client, data.user.id); if (live) { libraryRef.current = lib; setLibrary(lib.library); } } catch (e) { if (live) setStatus(message(e, "Your saved styles couldn’t load.")); }
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

  // Library edits apply at once and save in order; a failed save restores the last saved library.
  const changeLib = useCallback((c: LibraryChange) => {
    setLibrary((current) => {
      const next = changeLibrary(current, c); if (!userId) return next;
      libraryQueue.current = libraryQueue.current.then(async () => {
        try { libraryRef.current = await saveLibrary(client, userId, next, libraryRef.current.revision); }
        catch (e) { setLibrary(libraryRef.current.library); setStatus(message(e, "That didn’t save to your library.")); }
      });
      return next;
    });
  }, [client, userId]);
  const deleteContent = useCallback(async (sectionId: string) => {
    try { await deleteSectionContent(client, userId, sectionId); setNotes((list) => list.filter((n) => n.sectionId !== sectionId)); for (const k of [...noteRevisions.current.keys()]) if (k.startsWith(`${sectionId}/`)) noteRevisions.current.delete(k); return true; }
    catch (e) { setStatus(message(e, "That section’s content wasn’t deleted.")); return false; }
  }, [client, userId]);

  const note = useCallback((sectionId: string, date: string) => notes.find((n) => n.sectionId === sectionId && n.date === date) ?? { sectionId, date, body: "", items: [], revision: 0 }, [notes]);
  const setNote = useCallback((n: DayNote, delay = 700) => {
    const key = `${n.sectionId}/${n.date}`;
    setNotes((list) => [...list.filter((x) => `${x.sectionId}/${x.date}` !== key), n]);
    const timers = noteTimers.current; window.clearTimeout(timers.get(key));
    timers.set(key, window.setTimeout(async () => {
      setStatus("Saving…");
      try { const saved = await saveDayNote(client, userId, { ...n, revision: noteRevisions.current.get(key) ?? 0 }); noteRevisions.current.set(key, saved.revision); setStatus(""); }
      catch (e) { setStatus(message(e, "That note didn’t save.")); }
    }, delay));
  }, [client, userId]);

  const value = useMemo<AgendaData>(() => ({ userId, loaded, status, layout, changeLayout: change, marks, saveMark: save, removeMark: remove, note, setNote, deleteContent, library, changeLibrary: changeLib, preview, setPreview }), [userId, loaded, status, layout, change, marks, save, remove, note, setNote, deleteContent, library, changeLib, preview, setPreview]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAgendaData() { const v = useContext(Context); if (!v) throw Error("Agenda data needs its provider"); return v; }
