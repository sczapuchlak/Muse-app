"use client";
import { useEffect, useMemo, useState } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { isImage } from "@/lib/inner-compass/modules";
import { parseCover, presetFor, rangeLabel, type Cover } from "@/lib/inner-compass/stories";
import type { BoardImage } from "@/lib/constellation-board";

export type AreaChapter = { id: string; title: string; range: string; cover: Cover; closed: boolean };
export type AreaExperience = { id: string; title: string; date: string | null; cover: Cover; photo: BoardImage | null };
export type AreaStories = { chapters: AreaChapter[]; experiences: AreaExperience[] };

/**
 * The Inner Compass Chapters and Experiences the person associated with each Life Area (#211, #214), read where they
 * live (`inner_area_links` → `inner_chapters` / `inner_experiences`). Read-only and descriptive: an association is
 * never a rating, and nothing here touches Life Atlas scores. Archived records stay out of view; closed Chapters keep
 * their association and show as closed.
 */
export function useAreaStories(): Record<string, AreaStories> {
  const client = useMemo(() => createMuseBrowserClient(), []);
  const [byArea, setByArea] = useState<Record<string, AreaStories>>({});
  useEffect(() => {
    let live = true;
    (async () => {
      const [l, c, e] = await Promise.all([
        client.from("inner_area_links").select("area_id,chapter_id,experience_id").limit(20000),
        client.from("inner_chapters").select("id,title,starts_on,ends_on,cover,closed_at,archived_at").is("archived_at", null).limit(2000),
        client.from("inner_experiences").select("id,title,happened_on,cover,photos,archived_at").is("archived_at", null).limit(5000),
      ]);
      if (!live || l.error || c.error || e.error) return;
      const chapters = new Map((c.data ?? []).map((x) => [x.id, { id: x.id, title: x.title, range: rangeLabel(x.starts_on, x.ends_on), cover: parseCover(x.cover, presetFor(x.id)), closed: !!x.closed_at } satisfies AreaChapter]));
      const experiences = new Map((e.data ?? []).map((x) => {
        const cover = parseCover(x.cover, presetFor(x.id)), photos = Array.isArray(x.photos) ? (x.photos as unknown[]).filter(isImage) as BoardImage[] : [];
        return [x.id, { id: x.id, title: x.title, date: x.happened_on, cover, photo: cover.image ?? photos[0] ?? null } satisfies AreaExperience];
      }));
      const out: Record<string, AreaStories> = {};
      for (const r of l.data ?? []) {
        const s = out[r.area_id] ??= { chapters: [], experiences: [] };
        const ch = r.chapter_id ? chapters.get(r.chapter_id) : undefined, ex = r.experience_id ? experiences.get(r.experience_id) : undefined;
        if (ch) s.chapters.push(ch);
        if (ex) s.experiences.push(ex);
      }
      for (const s of Object.values(out)) { s.experiences.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")); }
      setByArea(out);
    })().catch(() => undefined);
    return () => { live = false; };
  }, [client]);
  return byArea;
}
export const hasStories = (s?: AreaStories) => !!s && (s.chapters.length > 0 || s.experiences.length > 0);
