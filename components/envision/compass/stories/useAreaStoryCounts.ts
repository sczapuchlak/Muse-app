"use client";
import { useEffect, useMemo, useState } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";

/**
 * How many Experiences and Chapters the person has associated with each Life Area (#211), for a quiet link in the
 * Life Atlas. Descriptive only: a count of associations is never a measure of anything, and nothing is written.
 */
export function useAreaStoryCounts() {
  const client = useMemo(() => createMuseBrowserClient(), []);
  const [counts, setCounts] = useState<Record<string, { experiences: number; chapters: number }>>({});
  useEffect(() => {
    let live = true;
    client.from("inner_area_links").select("area_id,chapter_id,experience_id").limit(20000).then(({ data, error }) => {
      if (!live || error || !data) return;
      const out: Record<string, { experiences: number; chapters: number }> = {};
      for (const r of data) { const c = out[r.area_id] ??= { experiences: 0, chapters: 0 }; if (r.experience_id) c.experiences++; else if (r.chapter_id) c.chapters++; }
      setCounts(out);
    });
    return () => { live = false; };
  }, [client]);
  return counts;
}
