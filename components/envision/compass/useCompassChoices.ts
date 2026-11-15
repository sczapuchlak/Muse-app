"use client";
import { useEffect, useMemo, useState } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { categoryInfo, choiceLabel, isCategory, type Category } from "@/lib/inner-compass/categories";
import { parseDetails } from "@/lib/inner-compass/model";

export type CompassChoice = { id: string; title: string; category: Category; stance?: string; archived: boolean };

/**
 * A read-only list of the person's Inner Compass discoveries, for other modules that reference them (Intentions,
 * Vision Boards). It never writes. Missing tables (a server without #210 yet) simply mean no choices.
 */
export function useCompassChoices(only?: Category[]) {
  const client = useMemo(() => createMuseBrowserClient(), []);
  const [all, setAll] = useState<CompassChoice[]>([]), [loaded, setLoaded] = useState(false);
  const key = only?.join(",") ?? "";
  useEffect(() => {
    let live = true;
    (async () => {
      let q = client.from("inner_discoveries").select("id,title,category,details,archived_at").order("created_at", { ascending: false }).limit(2000);
      if (key) q = q.in("category", key.split(","));
      const { data } = await q;
      if (!live) return;
      setAll((data ?? []).flatMap((r) => isCategory(r.category) ? [{ id: r.id, title: r.title, category: r.category, stance: choiceLabel(r.category, "stance", parseDetails(r.details).stance), archived: !!r.archived_at }] : []));
      setLoaded(true);
    })().catch(() => { if (live) setLoaded(true); });
    return () => { live = false; };
  }, [client, key]);
  return { choices: all.filter((c) => !c.archived), all, loaded, find: (id: string) => all.find((c) => c.id === id) };
}
export const choiceNoun = (c: Category) => categoryInfo[c].title.replace("My ", "");
export const discoveryHref = (id: string) => `/envision?view=inner-compass&d=${id}`;
