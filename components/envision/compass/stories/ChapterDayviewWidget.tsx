"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MuseCard } from "@/components/MuseCard";
import { CardHeading } from "@/components/CardHeading";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { featuredMantras, parseContent } from "@/lib/inner-compass/modules";
import { rangeLabel } from "@/lib/inner-compass/stories";

type View = { id: string; title: string; word: string; startsOn: string | null; endsOn: string | null; mantras: string[] } | null;

/**
 * Opt-in only (#211): appears on the Daily Edit when the person has a primary Chapter and chose "Show on the Daily
 * Edit". It shows the Chapter's name, guiding word and the mantras the person featured. Reads; never writes.
 */
export function ChapterDayviewWidget() {
  const [view, setView] = useState<View>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      const client = createMuseBrowserClient();
      const c = await client.from("inner_chapters").select("id,title,word,starts_on,ends_on").eq("is_primary", true).eq("show_on_daily", true).is("archived_at", null).is("closed_at", null).limit(1).maybeSingle();
      if (!live || c.error || !c.data) return;
      const m = await client.from("inner_modules").select("type,content").eq("chapter_id", c.data.id).eq("type", "mantras");
      const mantras = m.error ? [] : featuredMantras((m.data ?? []).map((x) => parseContent("mantras", x.content))).map((i) => i.text as string);
      if (live) setView({ id: c.data.id, title: c.data.title, word: c.data.word, startsOn: c.data.starts_on, endsOn: c.data.ends_on, mantras });
    })().catch(() => undefined);
    return () => { live = false; };
  }, []);
  if (!view) return null;
  const mantra = view.mantras.length ? view.mantras[new Date().getDate() % view.mantras.length] : "";
  return <MuseCard id="daily-chapter" className="muse-chapter-widget">
    <CardHeading id="daily-chapter" title="My chapter" icon="envision" />
    <p className="muse-chapter-widget-title">{view.title}</p>
    {view.word && view.word !== view.title && <p className="muse-chapter-widget-word">{view.word}</p>}
    {mantra && <blockquote className="muse-chapter-widget-mantra"><q>{mantra}</q></blockquote>}
    <p className="card-description">{rangeLabel(view.startsOn, view.endsOn)}</p>
    <Link href={`/envision?view=inner-compass&realm=chapters&chapter=${view.id}`} className="muse-button button-ghost">Open the chapter →</Link>
  </MuseCard>;
}
