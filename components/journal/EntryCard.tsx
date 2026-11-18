"use client";
import { MuseMark, type MuseMarkIcon } from "../design/MuseHeading";
import { tagsFor, useJournal } from "./useJournal";
import { formatDay, formatShort } from "./format";
import { entryTitle, type Conversation } from "@/lib/journal/model";

/** A compact archive card: date, title, journal, a short summary or excerpt, a few tags, favorite and status. */
export function EntryCard({ c, onOpen, snippet, showYear }: { c: Conversation; onOpen: () => void; snippet?: string; showYear?: boolean }) {
  const { state } = useJournal();
  const journal = state.journals.find((j) => j.id === c.journalId);
  const tags = tagsFor(state, c.id).slice(0, 4);
  const bookmarked = state.bookmarks.some((b) => b.conversationId === c.id);
  const text = snippet || c.summary || c.draft;
  return <button type="button" className="mj-card" onClick={onOpen} style={{ "--card-ink": `var(--chart-${journal?.tone ?? 5})` } as React.CSSProperties} data-status={c.status}>
    <span className="mj-card-kicker">
      {journal && <MuseMark icon={journal.icon as MuseMarkIcon} tone={journal.tone} size="sm" />}
      <span>{showYear ? formatShort(c.localDate) : formatDay(c.localDate)}</span>
      {c.status === "active" && <em className="mj-pill">In progress</em>}
      {c.favorite && <span className="mj-fav" aria-label="Favorite">★</span>}
      {bookmarked && <span className="mj-fav" aria-label="Has bookmarks">❦</span>}
    </span>
    <b className="mj-card-title">{entryTitle(c)}</b>
    {text && <span className="mj-card-excerpt">{snippet ? highlight(snippet) : text.slice(0, 220)}</span>}
    <span className="mj-card-foot">
      <span>{journal?.name ?? "Journal"}{c.companionName ? ` · ${c.companionName}` : ""}</span>
      <span>{c.userWords} words</span>
    </span>
    {tags.length > 0 && <span className="mj-card-tags">{tags.map((t) => <span key={t.id} className="mj-tag" data-kind={t.kind}>{t.name}</span>)}</span>}
  </button>;
}

/** Search snippets mark matches with « »; render them as <mark>. */
function highlight(s: string) {
  return s.split(/(«[^»]*»)/).map((part, i) => (part.startsWith("«") ? <mark key={i}>{part.slice(1, -1)}</mark> : <span key={i}>{part}</span>));
}
