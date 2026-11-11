"use client";
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { emotionCatalog } from "@/lib/emotions";
import { customAsEmotion, customId, customUuid, isCustomId, unifiedFeelings, type CustomFeeling } from "@/lib/feelings";
import { createCustomFeeling, deleteCustomFeeling, feelingsUnavailable, readCatalogFavorites, readCustomFeelings, setCatalogFavorite, updateCustomFeeling, type FeelingDraft } from "@/lib/feelings-store";
import type { Emotion } from "@/lib/models";

/** The person's feelings library, shared by every mood surface (Daily Edit, Mood page) so a new feeling appears everywhere at once. */
type Library = { phase: "idle" | "loading" | "ready" | "unavailable"; custom: CustomFeeling[]; catalogFavorites: string[]; error: string };
let library: Library = { phase: "idle", custom: [], catalogFavorites: [], error: "" };
const listeners = new Set<() => void>();
const publish = (next: Partial<Library>) => { library = { ...library, ...next }; for (const l of listeners) l(); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
let client: ReturnType<typeof createMuseBrowserClient> | null = null;
const supabase = () => client ??= createMuseBrowserClient();
/** Sign-out or a different account must not see the previous person's feelings. */
export const resetFeelingLibrary = () => { library = { phase: "idle", custom: [], catalogFavorites: [], error: "" }; for (const l of listeners) l(); };

async function load() {
  publish({ phase: "loading", error: "" });
  try { const [custom, catalogFavorites] = await Promise.all([readCustomFeelings(supabase()), readCatalogFavorites(supabase())]); publish({ phase: "ready", custom, catalogFavorites }); }
  catch (e) { if (feelingsUnavailable(e)) publish({ phase: "unavailable" }); else publish({ phase: "ready", error: "Your own feelings couldn’t load right now. The shared list still works." }); }
}

export function useFeelingLibrary() {
  const state = useSyncExternalStore(subscribe, () => library, () => library);
  useEffect(() => { if (library.phase === "idle") void load(); }, []);
  const catalog = emotionCatalog;
  const all = useMemo(() => unifiedFeelings(catalog, state.custom), [catalog, state.custom]);
  const favoriteIds = useMemo(() => [...state.catalogFavorites, ...state.custom.filter((c) => c.favorite).map((c) => customId(c.id))], [state.catalogFavorites, state.custom]);
  const wrap = useCallback(async <T,>(job: () => Promise<T>): Promise<T> => { publish({ error: "" }); try { return await job(); } catch (e) { publish({ error: e instanceof Error ? e.message : "That didn’t save. Try again." }); throw e; } }, []);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  return {
    phase: state.phase, error: state.error, custom: state.custom, all, favoriteIds, canCreate: state.phase === "ready",
    create: (draft: FeelingDraft): Promise<Emotion> => wrap(async () => { const c = await createCustomFeeling(supabase(), draft); publish({ custom: [...library.custom, c].sort((a, b) => a.name.localeCompare(b.name, "en")) }); return customAsEmotion(c); }),
    update: (id: string, patch: Partial<FeelingDraft>) => wrap(async () => { const c = await updateCustomFeeling(supabase(), id, patch); publish({ custom: library.custom.map((x) => x.id === id ? c : x).sort((a, b) => a.name.localeCompare(b.name, "en")) }); }),
    remove: (id: string) => wrap(async () => { await deleteCustomFeeling(supabase(), id); publish({ custom: library.custom.filter((x) => x.id !== id) }); }),
    toggleFavorite: (emotionId: string) => wrap(async () => {
      const on = favoriteIds.includes(emotionId);
      if (isCustomId(emotionId)) { const uuid = customUuid(emotionId); const c = await updateCustomFeeling(supabase(), uuid, { favorite: !on }); publish({ custom: library.custom.map((x) => x.id === uuid ? c : x) }); }
      else { await setCatalogFavorite(supabase(), emotionId, !on); publish({ catalogFavorites: on ? library.catalogFavorites.filter((x) => x !== emotionId) : [...library.catalogFavorites, emotionId] }); }
    }),
  };
}
export type FeelingLibrary = ReturnType<typeof useFeelingLibrary>;
