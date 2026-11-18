"use client";
import { MuseMark, type MuseMarkIcon } from "../design/MuseHeading";
import { MuseIcon } from "../MuseIcon";
import { tagsFor, useJournal } from "./useJournal";
import { dayNumber, formatDay, formatShort, weekdayShort } from "./format";
import { entryTitle, type Conversation } from "@/lib/journal/model";

/**
 * An archive card: the journal's mark and day, the title, a short summary or excerpt, a few tags. Favorites and
 * bookmarks use Muse's own icons. `compact` is the slimmer card for Today's Continue strip.
 */
export function EntryCard({ c, onOpen, snippet, showYear, compact }: { c: Conversation; onOpen: () => void; snippet?: string; showYear?: boolean; compact?: boolean }) {
  const { state } = useJournal();
  const journal = state.journals.find((j) => j.id === c.journalId);
  const tags = tagsFor(state, c.id).slice(0, compact ? 0 : 4);
  const bookmarked = state.bookmarks.some((b) => b.conversationId === c.id);
  const text = snippet || c.summary || c.draft;
  return <button type="button" className="mj-card" onClick={onOpen} data-status={c.status} data-compact={compact || undefined} style={{ "--card-ink": `var(--chart-${journal?.tone ?? 5})` } as React.CSSProperties}>
    <span className="mj-card-kicker type-meta">
      {journal && <MuseMark icon={journal.icon as MuseMarkIcon} tone={journal.tone} size="sm" />}
      <span>{showYear ? formatShort(c.localDate) : formatDay(c.localDate)}</span>
      {c.status === "active" && <em className="mj-pill">In progress</em>}
      <span className="mj-card-flags">
        {c.favorite && <span className="mj-flag" title="Favorite"><MuseIcon name="favorite" size={14} /><span className="sr-only">Favorite</span></span>}
        {bookmarked && <span className="mj-flag" title="Has bookmarked passages"><MuseIcon name="bookmark" size={14} /><span className="sr-only">Bookmarked</span></span>}
      </span>
    </span>
    <span className="mj-card-title type-title">{entryTitle(c)}</span>
    {text && <span className="mj-card-excerpt">{snippet ? highlight(snippet) : text.slice(0, 220)}</span>}
    {!compact && <span className="mj-card-foot type-meta">
      <span>{journal?.name ?? "Journal"}{c.companionName ? ` · ${c.companionName}` : ""}</span>
      <span className="type-numeric">{c.userWords} words</span>
    </span>}
    {tags.length > 0 && <span className="mj-card-tags">{tags.map((t) => <span key={t.id} className="mj-tag" data-kind={t.kind}>{t.name}</span>)}</span>}
  </button>;
}

/**
 * A History row: the day on the left (only on a day's first entry), the title in the editorial face with one line of
 * summary and a few tags, and the journal's mark with word count on the right. Slim enough that a month of daily
 * entries reads as a list, not a wall of cards.
 */
export function EntryRow({ c, onOpen, snippet, showDay = true }: { c: Conversation; onOpen: () => void; snippet?: string; showDay?: boolean }) {
  const { state } = useJournal();
  const journal = state.journals.find((j) => j.id === c.journalId);
  const tags = tagsFor(state, c.id).slice(0, 3);
  const bookmarked = state.bookmarks.some((b) => b.conversationId === c.id);
  const text = snippet || c.summary || c.draft;
  return <button type="button" className="mj-row" onClick={onOpen} data-status={c.status} style={{ "--card-ink": `var(--chart-${journal?.tone ?? 5})` } as React.CSSProperties}>
    <span className="mj-row-day" aria-hidden={!showDay || undefined}>{showDay && <><b className="type-meta">{weekdayShort(c.localDate)}</b><span className="type-numeric">{dayNumber(c.localDate)}</span></>}</span>
    <span className="mj-row-main">
      <span className="mj-row-title type-title">{entryTitle(c)}{c.status === "active" && <em className="mj-pill">In progress</em>}</span>
      {text && <span className="mj-row-excerpt">{snippet ? highlight(snippet) : text.slice(0, 200)}</span>}
      {tags.length > 0 && <span className="mj-card-tags">{tags.map((t) => <span key={t.id} className="mj-tag" data-kind={t.kind}>{t.name}</span>)}</span>}
    </span>
    <span className="mj-row-meta type-meta">
      {journal && <MuseMark icon={journal.icon as MuseMarkIcon} tone={journal.tone} size="sm" />}
      <span className="type-numeric">{c.userWords} words</span>
      {(c.favorite || bookmarked) && <span className="mj-card-flags">{c.favorite && <span className="mj-flag" title="Favorite"><MuseIcon name="favorite" size={13} /><span className="sr-only">Favorite</span></span>}{bookmarked && <span className="mj-flag" title="Has bookmarked passages"><MuseIcon name="bookmark" size={13} /><span className="sr-only">Bookmarked</span></span>}</span>}
    </span>
    <span className="sr-only">{formatDay(c.localDate)}</span>
  </button>;
}

/** Search snippets mark matches with « »; render them as <mark>. */
function highlight(s: string) {
  return s.split(/(«[^»]*»)/).map((part, i) => (part.startsWith("«") ? <mark key={i}>{part.slice(1, -1)}</mark> : <span key={i}>{part}</span>));
}
