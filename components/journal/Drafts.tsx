"use client";
import { QuietEmpty } from "./JournalArt";
import { useState } from "react";
import Link from "next/link";
import { MuseIcon } from "../MuseIcon";
import { useJournal } from "./useJournal";
import { formatDay } from "./format";
import { EntryDateDialog, displayClock, entryInstant, localClock } from "./EntryDate";
import { isUnfinished, type Conversation } from "@/lib/journal/model";

const edited = (c: Conversation) => c.lastMessageAt ?? c.draftUpdatedAt ?? c.startedAt;
const firstWords = (text: string) => { const t = text.replace(/\s+/g, " ").trim(); return t.length > 140 ? `${t.slice(0, 140).replace(/\s+\S*$/, "")}…` : t; };

/** Every entry you started and haven't finished, newest first: pick one up, give it its day, or let it go. */
export function useDrafts() {
  const { state } = useJournal();
  return state.conversations.filter(isUnfinished).sort((a, b) => edited(b).localeCompare(edited(a)));
}

export function Drafts() {
  const j = useJournal(), drafts = useDrafts();
  const [dating, setDating] = useState<Conversation | null>(null);
  if (!drafts.length) return <QuietEmpty kicker="All caught up" title="No drafts waiting." line="Start something and walk away mid-thought, and it waits here for you, exactly where you left it. Nothing is ever lost."><Link className="muse-button button-primary" href="/journal">Start writing</Link></QuietEmpty>;
  return <>
    <p className="mj-note mj-drafts-intro">Unfinished entries wait here until you finish or discard them. Each keeps the day it belongs to; change it if it ran past midnight or you’re catching up.</p>
    <ul className="mj-drafts" aria-label="Drafts">{drafts.map((c) => {
      const journal = j.state.journals.find((x) => x.id === c.journalId);
      const preview = c.title || firstWords(c.draft) || (c.userWords ? `An entry in progress · ${c.userWords} ${c.userWords === 1 ? "word" : "words"}` : "A guided entry in progress");
      return <li key={c.id} className="mj-draft">
        <div className="mj-draft-copy">
          <p className="mj-draft-meta type-meta"><span>{formatDay(c.localDate)}</span>{journal && <span>{journal.name}</span>}{c.companionName && <span>with {c.companionName}</span>}</p>
          <p className="mj-draft-preview">{preview}</p>
          <p className="mj-draft-edited type-meta">Last touched {new Date(edited(c)).toLocaleDateString("en-US", { month: "short", day: "numeric" })}, {displayClock(edited(c), c.timeZone)}</p>
        </div>
        <div className="mj-draft-actions">
          <Link className="muse-button button-primary" href={`/journal?entry=${c.id}`}><MuseIcon name="edit" size={14} />Continue</Link>
          <button type="button" className="muse-button button-ghost" onClick={() => setDating(c)}><MuseIcon name="calendar" size={14} />Change date</button>
          <button type="button" className="muse-button button-ghost mj-draft-discard" onClick={() => { if (window.confirm(c.userWords ? "Discard this unfinished entry? Its words will be deleted. This can’t be undone." : "Discard this draft?")) void j.deleteConversation(c.id); }}>Discard</button>
        </div>
      </li>;
    })}</ul>
    {dating && <EntryDateDialog title="Change date & time" date={dating.localDate} time={localClock(dating.startedAt, dating.timeZone)} today={j.today} onClose={() => setDating(null)} onSave={async (d, t) => Boolean(await j.redate(dating, d, entryInstant(d, t, dating.timeZone)))} />}
  </>;
}
