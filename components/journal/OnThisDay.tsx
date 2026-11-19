"use client";
import { useEffect, useId, useRef, useState } from "react";
import { GlassPopover } from "../GlassPopover";
import Link from "next/link";
import { MuseIcon } from "../MuseIcon";
import { useJournal } from "./useJournal";
import { formatShort, preview } from "./format";
import { entryTitle, type Conversation } from "@/lib/journal/model";

const yearsAgo = (date: string, today: string) => { const n = Number(today.slice(0, 4)) - Number(date.slice(0, 4)); return n === 1 ? "1 year ago" : `${n} years ago`; };

/**
 * On This Day: a small memory on the blank page, separate from the composer. It's one quiet line (the year and the
 * title); tapping it opens a glass popover over the page (nothing below moves) with that entry's preview, a way to
 * step through other years, open the entry, or see them all in History. The preview is the entry's saved summary or,
 * failing that, its first words; nothing is generated, nothing is sent anywhere, and it never appears in a conversation.
 */
export function OnThisDay({ memories }: { memories: readonly Conversation[] }) {
  const j = useJournal();
  const [open, setOpen] = useState(false), [at, setAt] = useState(0), [words, setWords] = useState<Record<string, string>>({});
  const anchor = useRef<HTMLButtonElement>(null), id = useId();
  const c = memories[Math.min(at, memories.length - 1)];
  useEffect(() => {
    if (!open || !c || c.summary.trim() || words[c.id] !== undefined) return;
    let live = true;
    void j.client.from("journal_messages").select("body").eq("user_id", j.userId).eq("conversation_id", c.id).eq("role", "user").order("created_at").limit(1).maybeSingle()
      .then((r) => { if (live) setWords((w) => ({ ...w, [c.id]: r.data?.body ?? "" })); });
    return () => { live = false; };
  }, [open, c, words, j.client, j.userId]);
  if (!c) return null;
  const text = c.summary.trim() || words[c.id] || "";
  const more = memories.length - 1;
  return <div className="mj-otd" data-open={open || undefined}>
    <button ref={anchor} type="button" className="mj-otd-line" aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
      <span className="mj-otd-spark" aria-hidden="true">✦</span>
      <span className="mj-otd-label type-meta">On this day</span>
      <span className="mj-otd-year type-numeric">{c.localDate.slice(0, 4)}</span>
      <span className="mj-otd-title">{entryTitle(c)}</span>
      {more > 0 && !open && <span className="mj-otd-more type-meta">+{more}</span>}
      <MuseIcon name="chevron" size={13} />
    </button>
    <GlassPopover id={id} label="On this day" title="On this day" open={open} anchorRef={anchor} onClose={() => setOpen(false)} width={400}>
    <div className="mj-otd-card" role="group" aria-label={`From ${formatShort(c.localDate)}`}>
      <p className="mj-otd-when type-meta"><span className="mj-otd-chip type-numeric">{c.localDate.slice(0, 4)}</span>{yearsAgo(c.localDate, j.today)} · {formatShort(c.localDate)}</p>
      <Link className="mj-otd-name type-title" href={`/journal?entry=${c.id}`}>{entryTitle(c)}</Link>
      {text ? <p className="mj-otd-preview type-reading">{preview(text, 220)}</p> : words[c.id] === undefined && !c.summary.trim() ? <p className="mj-otd-preview mj-note" role="status">…</p> : null}
      <div className="mj-otd-actions">
        {memories.length > 1 && <span className="mj-otd-nav">
          <button type="button" className="mj-x" aria-label="Previous memory" disabled={at === 0} onClick={() => setAt(at - 1)}>‹</button>
          <span className="type-meta type-numeric">{at + 1} of {memories.length}</span>
          <button type="button" className="mj-x" aria-label="Next memory" disabled={at >= memories.length - 1} onClick={() => setAt(at + 1)}>›</button>
        </span>}
        <Link className="mj-link type-meta" href="/journal?view=history&onthisday=1">See all in History</Link>
        <Link className="muse-button" href={`/journal?entry=${c.id}`}>Open entry</Link>
      </div>
    </div>
    </GlassPopover>
  </div>;
}
