"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { shiftDate } from "@/lib/dates";
import type { MealSlot } from "@/lib/models";
import { cleanIdea, deleteMealIdea, insertMealIdeas, nextPosition, readMealIdeas, updateMealIdea, type MealIdea } from "@/lib/meal-ideas";

type Status = { saving: number; error: string | null };

/**
 * One week's meal ideas, saved as you type: adding and removing save at once, edits a moment after typing stops. A change
 * that fails is put back and the error shown, so what you see is what is saved.
 */
export function useMealIdeas(weekStart: string) {
  const client = useMemo(() => createMuseBrowserClient(), []);
  const [ideas, setIdeas] = useState<MealIdea[]>([]), [state, setStatus] = useState<Status>({ saving: 0, error: null });
  const [previous, setPrevious] = useState<MealIdea[]>([]), [loaded, setLoaded] = useState<{ week: string; error?: string } | null>(null);
  const loading = loaded?.week !== weekStart, status = { loading, saving: state.saving, error: loading ? null : loaded?.error ?? state.error };
  const timers = useRef(new Map<string, number>()), saved = useRef(new Map<string, string>()), pending = useRef(new Map<string, string>());

  useEffect(() => {
    let live = true;
    Promise.all([readMealIdeas(client, weekStart), readMealIdeas(client, shiftDate(weekStart, -7))]).then(([now, before]) => {
      if (!live) return;
      saved.current = new Map(now.map((i) => [i.id, i.text]));
      setIdeas(now); setPrevious(before); setStatus({ saving: 0, error: null }); setLoaded({ week: weekStart });
    }).catch(() => { if (live) { setIdeas([]); setPrevious([]); setLoaded({ week: weekStart, error: "Meal ideas couldn’t load. Try again in a moment." }); } });
    return () => { live = false; };
  }, [client, weekStart]);
  // Edits still waiting on their pause are written right away when the week changes or the page closes.
  useEffect(() => {
    const flush = () => {
      for (const [id, text] of pending.current) { window.clearTimeout(timers.current.get(id)); const clean = cleanIdea(text); if (clean && clean !== saved.current.get(id)) { saved.current.set(id, clean); void updateMealIdea(client, id, clean).catch(() => undefined); } }
      pending.current.clear(); timers.current.clear();
    };
    window.addEventListener("pagehide", flush);
    return () => { window.removeEventListener("pagehide", flush); flush(); };
  }, [client, weekStart]);

  const run = useCallback(async (work: () => Promise<void>, undo: () => void, message: string) => {
    setStatus((s) => ({ ...s, saving: s.saving + 1, error: null }));
    try { await work(); setStatus((s) => ({ ...s, saving: s.saving - 1 })); }
    catch { undo(); setStatus((s) => ({ ...s, saving: s.saving - 1, error: message })); }
  }, []);

  /** Adds one idea, or several in order (a pasted list). */
  const add = useCallback((slot: MealSlot, raw: string | string[]) => {
    const texts = (Array.isArray(raw) ? raw : [raw]).map(cleanIdea).filter(Boolean); if (!texts.length) return;
    const start = nextPosition(ideas, slot), added: MealIdea[] = texts.map((text, n) => ({ id: crypto.randomUUID(), weekStart, slot, text, position: start + n }));
    added.forEach((i) => saved.current.set(i.id, i.text));
    setIdeas((l) => [...l, ...added]);
    const ids = new Set(added.map((i) => i.id));
    void run(() => insertMealIdeas(client, added), () => setIdeas((l) => l.filter((i) => !ids.has(i.id))), added.length > 1 ? "Those ideas didn’t save. Add them again when you’re back online." : "That idea didn’t save. Add it again when you’re back online.");
  }, [client, ideas, run, weekStart]);

  const remove = useCallback((id: string) => {
    const gone = ideas.find((i) => i.id === id); if (!gone) return;
    window.clearTimeout(timers.current.get(id)); timers.current.delete(id); pending.current.delete(id);
    setIdeas((l) => l.filter((i) => i.id !== id));
    void run(() => deleteMealIdea(client, id), () => setIdeas((l) => [...l, gone]), "That idea couldn’t be removed. Try again.");
  }, [client, ideas, run]);

  const edit = useCallback((id: string, raw: string) => {
    const text = raw.slice(0, 300);
    setIdeas((l) => l.map((i) => i.id === id ? { ...i, text } : i));
    window.clearTimeout(timers.current.get(id)); pending.current.set(id, text);
    timers.current.set(id, window.setTimeout(() => {
      timers.current.delete(id); pending.current.delete(id);
      const clean = cleanIdea(text), before = saved.current.get(id) ?? "";
      if (!clean || clean === before) return; // an emptied line is removed on blur, not here
      saved.current.set(id, clean);
      void run(() => updateMealIdea(client, id, clean), () => { saved.current.set(id, before); setIdeas((l) => l.map((i) => i.id === id ? { ...i, text: before } : i)); }, "That change didn’t save. Try again.");
    }, 600));
  }, [client, run]);

  /** Start this week from last week's ideas (new copies; last week stays as it was). */
  const bringForward = useCallback(() => {
    if (ideas.length || !previous.length) return;
    const copies = previous.map((p) => ({ ...p, id: crypto.randomUUID(), weekStart }));
    copies.forEach((c) => saved.current.set(c.id, c.text));
    setIdeas(copies);
    void run(() => insertMealIdeas(client, copies), () => setIdeas([]), "Last week’s ideas didn’t copy. Try again.");
  }, [client, ideas.length, previous, run, weekStart]);

  return { ideas: loading ? [] : ideas, status, previousCount: previous.length, add, edit, remove, bringForward };
}
