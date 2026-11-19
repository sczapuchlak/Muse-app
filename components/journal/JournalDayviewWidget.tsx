"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MuseCard } from "@/components/MuseCard";
import { CardHeading } from "@/components/CardHeading";
import { MuseIcon } from "@/components/MuseIcon";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { addDays, streak, weekDays, weekStart } from "@/lib/journal/stats";
import { WeekConstellation } from "./JournalArt";
import "./JournalDayviewWidget.css";

type Entry = { id: string; status: string };
type View = { today: Entry[]; written: Set<string> };

/**
 * Opt-in (Journal V1 §20): the Journal's door on the Daily Edit. Small on purpose (Stephanie, Nov 18): it answers
 * "have I written today?", shows the streak and the week as a colourful constellation, and opens the Journal. What
 * you wrote never appears on the dashboard. Reads only.
 */
export function JournalDayviewWidget({ date }: { date: string }) {
  const [view, setView] = useState<View | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      const client = createMuseBrowserClient();
      const p = await client.from("journal_preferences").select("show_on_daily").maybeSingle();
      if (!live || p.error || !p.data?.show_on_daily) return;
      const [t, d] = await Promise.all([
        client.from("journal_conversations").select("id,status").eq("local_date", date).gt("user_words", 0).neq("status", "draft").order("last_message_at", { ascending: false }).limit(6),
        client.rpc("journal_days", { p_from: addDays(date, -90) }),
      ]);
      const written = new Set(((d.data ?? []) as { local_date: string }[]).map((x) => x.local_date));
      if (live) setView({ today: (t.data ?? []).map((r) => ({ id: r.id, status: r.status })), written });
    })().catch(() => undefined);
    return () => { live = false; };
  }, [date]);
  if (!view) return null;
  const days = weekDays(weekStart(date)), run = streak(view.written, date);
  const done = view.today.length > 0, open = view.today.find((e) => e.status === "active"), latest = open ?? view.today[0];
  return <MuseCard id="daily-journal" className={`muse-journal-widget ${done ? "mjw-state-written" : "mjw-state-invite"}`}>
    <CardHeading id="daily-journal" title="Journal" icon="journal" />
    <div className="mjw-status">
      <span className="mjw-done" data-done={done || undefined}>{done ? <><MuseIcon name="check" size={14} />Written today</> : <><span className="mjw-dot" aria-hidden="true" />Not yet today</>}</span>
      {run > 0 && <span className="mjw-streak"><span className="mjw-flame" aria-hidden="true" /><b className="type-numeric">{run}</b> {run === 1 ? "day" : "days"} in a row</span>}
    </div>
    <div className="mjw-week"><WeekConstellation days={days} written={view.written} today={date} /></div>
    <div className="mjw-actions">
      {done && latest ? <>
        <Link href={`/journal?entry=${latest.id}`} className="muse-button button-primary"><MuseIcon name={open ? "edit" : "journal"} size={15} />{open ? "Keep writing" : "Open entry"}</Link>
        <Link href="/journal" className="muse-button button-ghost"><MuseIcon name="plus" size={14} />New entry</Link>
      </> : <Link href="/journal" className="muse-button button-primary"><MuseIcon name="edit" size={15} />Start writing</Link>}
    </div>
  </MuseCard>;
}
