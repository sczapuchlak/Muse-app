"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MuseCard } from "@/components/MuseCard";
import { CardHeading } from "@/components/CardHeading";
import { MuseIcon } from "@/components/MuseIcon";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { addDays, streak, weekDays, weekStart } from "@/lib/journal/stats";
import { WeekConstellation } from "./JournalArt";
import { formatDay } from "./format";
import "./JournalDayviewWidget.css";

type Entry = { id: string; title: string; summary: string; status: string; words: number; startedAt: string; companion: string; timeZone: string };
type Tag = { name: string; kind: string };
type View = { today: Entry[]; tags: Tag[]; written: Set<string>; latest: { id: string; title: string; date: string } | null };

/** A different gentle question each day: an invitation, never homework. */
const prompts = [
  "What’s taking up the most room in your head today?", "What would make today feel like a good day?", "What are you carrying that you could set down?",
  "Who was on your mind today, and why?", "What surprised you lately?", "What do you need more of this week?", "What felt easy today? What didn’t?",
  "What are you looking forward to?", "What did you notice about yourself today?", "What’s one thing you want to remember about today?",
  "Where did your energy go today?", "What would you tell a friend in your shoes?", "What’s quietly going well?", "What are you ready to let go of?",
];
const promptFor = (date: string) => prompts[Math.floor(Date.parse(`${date}T12:00:00Z`) / 864e5) % prompts.length];
const clock = (iso: string, timeZone: string) => { try { return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso)); } catch { return ""; } };
const kindOrder: Record<string, number> = { mood: 0, person: 1, topic: 2, custom: 3 };

/**
 * Opt-in (Journal V1 §20): the Journal's door on the Daily Edit. Before you write it is an invitation (a question for
 * the day, your week as a constellation, where you left off); once you have written it is a keepsake of today's entry
 * (title, summary, moods, people and topics). Reads only; the Journal itself never lives here.
 */
export function JournalDayviewWidget({ date }: { date: string }) {
  const [view, setView] = useState<View | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      const client = createMuseBrowserClient();
      const p = await client.from("journal_preferences").select("show_on_daily").maybeSingle();
      if (!live || p.error || !p.data?.show_on_daily) return;
      const [t, d, l] = await Promise.all([
        client.from("journal_conversations").select("id,title,summary,status,user_words,started_at,companion_name,time_zone").eq("local_date", date).gt("user_words", 0).neq("status", "draft").order("last_message_at", { ascending: false }).limit(6),
        client.rpc("journal_days", { p_from: addDays(date, -90) }),
        client.from("journal_conversations").select("id,title,local_date").eq("status", "completed").lt("local_date", date).order("local_date", { ascending: false }).order("completed_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const today: Entry[] = (t.data ?? []).map((r) => ({ id: r.id, title: r.title, summary: r.summary, status: r.status, words: r.user_words, startedAt: r.started_at, companion: r.companion_name, timeZone: r.time_zone }));
      let tags: Tag[] = [];
      const featured = today.find((e) => e.status === "completed" && e.title) ?? today[0];
      if (featured) {
        const links = await client.from("journal_entry_tags").select("tag_id").eq("conversation_id", featured.id);
        const ids = (links.data ?? []).map((x) => x.tag_id);
        if (ids.length) {
          const rows = await client.from("journal_tags").select("name,kind,suppressed").in("id", ids);
          tags = (rows.data ?? []).filter((x) => !x.suppressed).map((x) => ({ name: x.name, kind: x.kind })).sort((a, b) => (kindOrder[a.kind] ?? 9) - (kindOrder[b.kind] ?? 9)).slice(0, 6);
        }
      }
      const written = new Set(((d.data ?? []) as { local_date: string }[]).map((x) => x.local_date));
      if (live) setView({ today, tags, written, latest: l.data ? { id: l.data.id, title: l.data.title, date: l.data.local_date } : null });
    })().catch(() => undefined);
    return () => { live = false; };
  }, [date]);
  if (!view) return null;
  const days = weekDays(weekStart(date)), run = streak(view.written, date);
  const featured = view.today.find((e) => e.status === "completed" && e.title) ?? view.today[0];
  const more = view.today.length - 1;
  const week = <div className="mjw-week"><WeekConstellation days={days} written={view.written} today={date} />
    {run > 0 && <span className="mjw-streak"><span className="mjw-flame" aria-hidden="true" /><b className="type-numeric">{run}</b>{run === 1 ? "day" : "days"} in a row</span>}</div>;

  if (!featured) return <MuseCard id="daily-journal" className="muse-journal-widget mjw-state-invite">
    <CardHeading id="daily-journal" title="Journal" icon="journal" />
    <div className="mjw-invite">
      <p className="mjw-kicker type-meta">A question for {formatDay(date)}</p>
      <p className="mjw-prompt">{promptFor(date)}</p>
      {week}
      <div className="mjw-actions"><Link href="/journal" className="muse-button button-primary"><MuseIcon name="edit" size={15} />Start writing</Link>
        {view.latest && <Link href={`/journal?entry=${view.latest.id}`} className="mjw-last">Last time: <span>{view.latest.title || "Untitled"}</span></Link>}</div>
    </div>
  </MuseCard>;

  const open = featured.status === "active";
  return <MuseCard id="daily-journal" className="muse-journal-widget mjw-state-written">
    <CardHeading id="daily-journal" title="Journal" icon="journal" />
    <article className="mjw-keepsake">
      <p className="mjw-kicker type-meta"><span>{open ? "Writing now" : "Today’s entry"}</span><span>{clock(featured.startedAt, featured.timeZone)}</span>{featured.companion && <span>with {featured.companion}</span>}<span className="type-numeric">{featured.words} {featured.words === 1 ? "word" : "words"}</span></p>
      <h3 className="mjw-title">{featured.title || (open ? "An entry in progress" : "Today’s entry")}</h3>
      {featured.summary && <p className="mjw-summary">{featured.summary}</p>}
      {view.tags.length > 0 && <ul className="mjw-tags" aria-label="Tags">{view.tags.map((t) => <li key={`${t.kind}:${t.name}`} data-kind={t.kind}>{t.kind === "custom" ? `#${t.name}` : t.name}</li>)}</ul>}
      {week}
      <div className="mjw-actions">
        <Link href={`/journal?entry=${featured.id}`} className="muse-button button-primary"><MuseIcon name={open ? "edit" : "journal"} size={15} />{open ? "Keep writing" : "Open entry"}</Link>
        <Link href="/journal" className="muse-button button-ghost"><MuseIcon name="plus" size={14} />New entry</Link>
        {more > 0 && <Link href="/journal?view=history" className="mjw-last">+{more} more today</Link>}
      </div>
    </article>
  </MuseCard>;
}
