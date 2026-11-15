"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import * as S from "@/lib/inner-compass/stories-persistence";
import type { Chapter, Collection, Experience, Module } from "@/lib/inner-compass/stories";
import { uploadBoardImage, removeBoardImages } from "@/lib/data/constellation-images";
import type { BoardImage } from "@/lib/constellation-board";

type Status = { loaded: boolean; error: string; saving: boolean };
const missing = (e: unknown) => { const c = (e as { code?: string })?.code; return c === "PGRST205" || c === "42P01"; };

/**
 * Chapters, Experiences and Collections for the signed-in person (#211). Everything loads once; each write goes
 * through ./stories-persistence with a revision check. Links are join rows, so "remove from" never deletes a record.
 * Module saves for the same module are queued so quick autosaves build on each other instead of colliding.
 */
export function useStories() {
  const client = useMemo(() => createMuseBrowserClient(), []);
  const [userId, setUserId] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [chapterExperiences, setChapterExperiences] = useState<S.Join[]>([]);
  const [collectionExperiences, setCollectionExperiences] = useState<S.Join[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [areas, setAreas] = useState<S.AreaLink[]>([]);
  const [status, setStatus] = useState<Status>({ loaded: false, error: "", saving: false });
  const modulesRef = useRef(modules); modulesRef.current = modules;
  const queues = useRef(new Map<string, Promise<unknown>>());

  const reload = useCallback(async () => {
    try {
      const { data, error } = await client.auth.getUser();
      if (error || !data.user) throw error ?? Error("Sign in to see your Chapters and Experiences.");
      setUserId(data.user.id);
      const w = await S.loadStories(client, data.user.id);
      setChapters(w.chapters); setExperiences(w.experiences); setCollections(w.collections); setChapterExperiences(w.chapterExperiences);
      setCollectionExperiences(w.collectionExperiences); setModules(w.modules); setAreas(w.areas);
      setStatus((s) => ({ ...s, loaded: true, error: "" }));
    } catch (e) {
      setStatus((s) => ({ ...s, loaded: true, error: missing(e) ? "Chapters and Experiences aren’t available on this server yet. My Inner World is unaffected." : e instanceof Error ? e.message : "Your Chapters couldn’t load." }));
    }
  }, [client]);
  useEffect(() => { const t = window.setTimeout(() => void reload(), 0); return () => window.clearTimeout(t); }, [reload]);

  async function run<T>(work: () => Promise<T>): Promise<T | null> {
    setStatus((s) => ({ ...s, saving: true, error: "" }));
    try { const out = await work(); setStatus((s) => ({ ...s, saving: false })); return out; }
    catch (e) { setStatus((s) => ({ ...s, saving: false, error: e instanceof Error ? e.message : "That didn’t save. Try again." })); return null; }
  }
  const put = <T extends { id: string }>(set: (fn: (l: T[]) => T[]) => void, x: T) => set((l) => l.some((y) => y.id === x.id) ? l.map((y) => y.id === x.id ? x : y) : [x, ...l]);

  // ---------- Chapters ----------
  const saveChapter = (c: Chapter) => run(async () => { const s = await S.saveChapter(client, userId, c); put(setChapters, s); return s; });
  const makePrimary = (c: Chapter | null) => run(async () => { const changed = await S.setPrimary(client, userId, c, chapters); for (const x of changed) put(setChapters, x); return true; });
  const removeChapter = (c: Chapter) => run(async () => {
    await S.deleteChapter(client, userId, c);
    setChapters((l) => l.filter((x) => x.id !== c.id)); setChapterExperiences((l) => l.filter((j) => j.a !== c.id));
    setModules((l) => l.filter((m) => !(m.owner.kind === "chapter" && m.owner.id === c.id))); setAreas((l) => l.filter((a) => a.chapterId !== c.id));
    return true;
  });

  // ---------- Experiences ----------
  const saveExperience = (e: Experience) => run(async () => {
    const before = experiences.find((x) => x.id === e.id), s = await S.saveExperience(client, userId, e); put(setExperiences, s);
    if (before) { const kept = new Set(s.photos.map((p) => p.path)), gone = before.photos.filter((p) => !kept.has(p.path)); if (gone.length) try { await removeBoardImages(gone); } catch { /* stays private */ } }
    return s;
  });
  const removeExperience = (e: Experience) => run(async () => {
    await S.deleteExperience(client, userId, e);
    setExperiences((l) => l.filter((x) => x.id !== e.id)); setChapterExperiences((l) => l.filter((j) => j.b !== e.id)); setCollectionExperiences((l) => l.filter((j) => j.b !== e.id));
    setModules((l) => l.filter((m) => !(m.owner.kind === "experience" && m.owner.id === e.id))); setAreas((l) => l.filter((a) => a.experienceId !== e.id));
    try { await removeBoardImages(e.photos); } catch { /* stays private; account deletion removes it */ }
    return true;
  });
  /** Creates a new Experience already linked to a Chapter and/or Collection (the Experience stays its own record). */
  const createExperience = (e: Experience, links: { chapterId?: string; collectionId?: string } = {}) => run(async () => {
    const s = await S.saveExperience(client, userId, e); put(setExperiences, s);
    if (links.chapterId) { const pos = chapterExperiences.filter((j) => j.a === links.chapterId).length; await S.linkChapterExperience(client, userId, links.chapterId, s.id, pos); setChapterExperiences((l) => [...l, { a: links.chapterId!, b: s.id, position: pos }]); }
    if (links.collectionId) { const pos = collectionExperiences.filter((j) => j.a === links.collectionId).length; await S.linkCollectionExperience(client, userId, links.collectionId, s.id, pos); setCollectionExperiences((l) => [...l, { a: links.collectionId!, b: s.id, position: pos }]); }
    return s;
  });

  // ---------- Collections ----------
  const saveCollection = (c: Collection) => run(async () => { const s = await S.saveCollection(client, userId, c); put(setCollections, s); return s; });
  const removeCollection = (id: string) => run(async () => { await S.deleteCollection(client, userId, id); setCollections((l) => l.filter((x) => x.id !== id)); setCollectionExperiences((l) => l.filter((j) => j.a !== id)); return true; });

  // ---------- Links ----------
  const linkChapter = (chapterId: string, experienceId: string) => run(async () => { const pos = chapterExperiences.filter((j) => j.a === chapterId).length; await S.linkChapterExperience(client, userId, chapterId, experienceId, pos); setChapterExperiences((l) => [...l.filter((j) => !(j.a === chapterId && j.b === experienceId)), { a: chapterId, b: experienceId, position: pos }]); return true; });
  const unlinkChapter = (chapterId: string, experienceId: string) => run(async () => { await S.unlinkChapterExperience(client, userId, chapterId, experienceId); setChapterExperiences((l) => l.filter((j) => !(j.a === chapterId && j.b === experienceId))); return true; });
  const linkCollection = (collectionId: string, experienceId: string) => run(async () => { const pos = collectionExperiences.filter((j) => j.a === collectionId).length; await S.linkCollectionExperience(client, userId, collectionId, experienceId, pos); setCollectionExperiences((l) => [...l.filter((j) => !(j.a === collectionId && j.b === experienceId)), { a: collectionId, b: experienceId, position: pos }]); return true; });
  const unlinkCollection = (collectionId: string, experienceId: string) => run(async () => { await S.unlinkCollectionExperience(client, userId, collectionId, experienceId); setCollectionExperiences((l) => l.filter((j) => !(j.a === collectionId && j.b === experienceId))); return true; });
  /** Manual order inside a Collection: rewrites positions for that Collection only. */
  const orderCollection = (collectionId: string, ids: string[]) => run(async () => { for (const [i, id] of ids.entries()) await S.linkCollectionExperience(client, userId, collectionId, id, i); setCollectionExperiences((l) => [...l.filter((j) => j.a !== collectionId), ...ids.map((b, i) => ({ a: collectionId, b, position: i }))]); return true; });
  const areasOf = useCallback((o: { chapterId?: string; experienceId?: string }) => areas.filter((a) => o.chapterId ? a.chapterId === o.chapterId : a.experienceId === o.experienceId).map((a) => a.areaId), [areas]);
  const setAreasFor = (o: { chapterId?: string; experienceId?: string }, next: string[]) => run(async () => {
    await S.setAreaLinks(client, userId, o, next, areasOf(o));
    setAreas((l) => [...l.filter((a) => o.chapterId ? a.chapterId !== o.chapterId : a.experienceId !== o.experienceId), ...next.map((areaId) => ({ areaId, chapterId: o.chapterId ?? null, experienceId: o.experienceId ?? null }))]);
    return true;
  });

  // ---------- Modules ----------
  const modulesOf = useCallback((kind: "chapter" | "experience", id: string) => modules.filter((m) => m.owner.kind === kind && m.owner.id === id).sort((a, b) => a.position - b.position), [modules]);
  /** Saves one module; saves to the same module run in order, each on the latest revision. */
  const saveModule = (m: Module) => {
    const prev = queues.current.get(m.id) ?? Promise.resolve();
    const next = prev.then(() => run(async () => {
      const latest = modulesRef.current.find((x) => x.id === m.id);
      const s = await S.saveModule(client, userId, { ...m, revision: latest ? latest.revision : 0 });
      setModules((l) => l.some((x) => x.id === s.id) ? l.map((x) => x.id === s.id ? s : x) : [...l, s]); modulesRef.current = [...modulesRef.current.filter((x) => x.id !== s.id), s];
      return s;
    }));
    queues.current.set(m.id, next);
    return next;
  };
  const removeModule = (m: Module) => run(async () => {
    await S.deleteModule(client, userId, m.id); setModules((l) => l.filter((x) => x.id !== m.id));
    return true;
  });
  /** New order for one owner's modules; only modules whose position changed are saved. */
  const orderModules = async (list: Module[]) => { for (const [i, m] of list.entries()) if (m.position !== i) await saveModule({ ...m, position: i }); };

  const upload = (ownerId: string, file: File) => run(async () => uploadBoardImage(userId, ownerId, file, { allowJpeg: true }));
  const forgetImages = async (images: BoardImage[]) => { try { await removeBoardImages(images); } catch { /* stays private */ } };

  return {
    status, reload, userId, chapters, experiences, collections, chapterExperiences, collectionExperiences, modules, areas,
    saveChapter, makePrimary, removeChapter, saveExperience, removeExperience, createExperience, saveCollection, removeCollection,
    linkChapter, unlinkChapter, linkCollection, unlinkCollection, orderCollection, areasOf, setAreasFor, modulesOf, saveModule, removeModule, orderModules, upload, forgetImages,
  };
}
export type Stories = ReturnType<typeof useStories>;
