"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MuseCard } from "@/components/MuseCard";
import { CardHeading } from "@/components/CardHeading";
import { createMuseBrowserClient } from "@/lib/supabase/client";

type View = { active: { id: string; title: string } | null; today: number; latest: { id: string; title: string; date: string } | null };

/**
 * Opt-in only (Journal V1 §20): a Journal door on the Daily Edit when "Show a Journal card on the Daily Edit" is on.
 * It reads two small facts (an open conversation today, the latest finished entry) and links into the Journal; the
 * Journal itself never lives here. Reads only; never writes.
 */
export function JournalDayviewWidget({ date }: { date: string }) {
  const [view, setView] = useState<View | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      const client = createMuseBrowserClient();
      const p = await client.from("journal_preferences").select("show_on_daily").maybeSingle();
      if (!live || p.error || !p.data?.show_on_daily) return;
      const [a, t, l] = await Promise.all([
        client.from("journal_conversations").select("id,title").eq("status", "active").eq("local_date", date).gt("user_words", 0).order("last_message_at", { ascending: false }).limit(1).maybeSingle(),
        client.from("journal_conversations").select("id", { count: "exact", head: true }).eq("local_date", date).gt("user_words", 0),
        client.from("journal_conversations").select("id,title,local_date").eq("status", "completed").lte("local_date", date).order("local_date", { ascending: false }).order("completed_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (live) setView({ active: a.data ? { id: a.data.id, title: a.data.title } : null, today: t.count ?? 0, latest: l.data ? { id: l.data.id, title: l.data.title, date: l.data.local_date } : null });
    })().catch(() => undefined);
    return () => { live = false; };
  }, [date]);
  if (!view) return null;
  return <MuseCard id="daily-journal" className="muse-journal-widget">
    <CardHeading id="daily-journal" title="Journal" icon="journal" />
    <p className="card-description">{view.today ? `${view.today} ${view.today === 1 ? "entry" : "entries"} today.` : "Nothing written yet today. A few words count."}</p>
    {view.latest && <p className="card-description">Last entry: <Link href={`/journal?entry=${view.latest.id}`}>{view.latest.title || "Untitled"}</Link></p>}
    {view.active ? <Link href={`/journal?entry=${view.active.id}`} className="muse-button button-ghost">Continue today’s conversation →</Link> : <Link href="/journal" className="muse-button button-ghost">Open the Journal →</Link>}
  </MuseCard>;
}
