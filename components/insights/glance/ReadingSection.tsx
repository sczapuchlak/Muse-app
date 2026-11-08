"use client";
import Link from "next/link";
import { BookCover } from "../../whimsy/Bookshelf";
import { MuseIcon } from "../../MuseIcon";
import { readingDuration, readingProgressModes, type currentlyReading, type GlancePeriod, type readingGlance, type ReadingProgressMode } from "@/lib/insights/glance";

const shortDay = (d: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const periodWords: Record<GlancePeriod, string> = { day: "that day", week: "this week", month: "this month", year: "this year" };

/**
 * Bookshelf in Insights (#97). Two clearly separate things:
 * - Now reading: today's nightstand, a current snapshot that does not change with the selected period.
 * - Reading in the period: time, pages, reading days and finished books dated inside the period.
 * Progress shows as percent, pages or time (the account preference). Time is reading time, never completion.
 */
export function ReadingSection({ period, reading, nightstand, status, onRetry, mode, saving, onMode }: {
  period: GlancePeriod; reading: ReturnType<typeof readingGlance>; nightstand: ReturnType<typeof currentlyReading>;
  status: { loaded: boolean; error?: string }; onRetry: () => void; mode: ReadingProgressMode; saving: boolean; onMode: (mode: ReadingProgressMode) => void;
}) {
  return <section className="muse-card muse-glance-card muse-glance-reading" data-wide aria-labelledby="glance-reading-title">
    <div className="muse-glance-reading-head">
      <h2 id="glance-reading-title" className="muse-glance-card-title"><MuseIcon name="book" size={18} treatment="prismatic" />Bookshelf</h2>
      <div className="muse-segmented" role="group" aria-label="Show reading progress as" aria-busy={saving}>
        {readingProgressModes.map((m) => <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => onMode(m.id)}>{m.label}</button>)}</div>
    </div>
    {status.error ? <p role="alert">Bookshelf couldn’t load. <button type="button" className="muse-button" onClick={onRetry}>Retry</button></p>
      : !status.loaded ? <p className="muse-glance-empty">Loading your books…</p> : <>
      <div className="muse-glance-subhead"><h3>Now reading</h3><span className="small-label">As of today, whatever period you’re viewing</span></div>
      {!nightstand.length ? <p className="muse-glance-empty">Nothing marked as reading. <Link href="/whimsy/bookshelf">Open Bookshelf</Link></p>
        : <ul className="muse-glance-books">{nightstand.map((x) => <li key={x.book.id} className="muse-glance-book">
          <BookCover book={x.book} />
          <div className="muse-glance-book-body">
            <strong>{x.book.title}</strong>{x.book.author && <span className="small-label">{x.book.author}</span>}
            <Progress mode={mode} item={x} />
          </div>
        </li>)}</ul>}
      <div className="muse-glance-subhead"><h3>Reading {periodWords[period]}</h3><span className="small-label">From saved reading sessions</span></div>
      {!reading.sessions && !reading.completed.length ? <p className="muse-glance-empty">No reading recorded {periodWords[period]}.</p> : <>
        <dl className="muse-glance-stats">
          <div><dt>Time</dt><dd>{reading.seconds ? readingDuration(reading.seconds) : "—"}</dd></div>
          <div><dt>Pages</dt><dd>{reading.pages ? reading.pages.toLocaleString("en-US") : "—"}</dd></div>
          {period !== "day" && <div><dt>Reading days</dt><dd>{reading.readingDays}</dd></div>}
          <div><dt>Finished</dt><dd>{reading.completed.length}</dd></div>
        </dl>
        {reading.books.length > 0 && <ul className="muse-glance-tags" aria-label={`Books read ${periodWords[period]}`}>{reading.books.slice(0, 6).map((b) => <li key={b.book.id}>{b.book.title} <span className="small-label">{[b.seconds ? readingDuration(b.seconds) : "", b.pages ? `${b.pages} pp` : ""].filter(Boolean).join(" · ")}</span></li>)}</ul>}
        {reading.completed.length > 0 && <ul className="muse-glance-finished" aria-label={`Finished ${periodWords[period]}`}>{reading.completed.map((c) => <li key={`${c.book.id}-${c.finishedOn}`}>
          <BookCover book={c.book} /><span><strong>{c.book.title}</strong><span className="small-label">Finished {shortDay(c.finishedOn)}{c.reread ? " · reread" : ""}</span></span></li>)}</ul>}
      </>}
    </>}
  </section>;
}

function Progress({ mode, item }: { mode: ReadingProgressMode; item: ReturnType<typeof currentlyReading>[number] }) {
  if (mode === "time") return <p className="muse-glance-book-progress"><MuseIcon name="timer" size={14} /> {item.seconds ? `${readingDuration(item.seconds)} read` : "No timed sessions yet"}<span className="small-label"> · reading time, not progress</span></p>;
  if (mode === "pages" || item.percent === null) {
    return <div className="muse-glance-book-progress">
      {item.total ? <Bar value={item.position} max={item.total} label={`Page ${item.position} of ${item.total}`} /> : null}
      <span>{item.total ? `p. ${item.position} of ${item.total}` : `p. ${item.position}`}</span>
      {mode === "percent" && !item.total && <span className="small-label"> · add total pages in Bookshelf to see a percent</span>}
    </div>;
  }
  return <div className="muse-glance-book-progress"><Bar value={item.position} max={item.total!} label={`${item.percent}% read`} /><span>{item.percent}%</span></div>;
}
function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  return <span className="muse-glance-meter" role="img" aria-label={label} title={label}><span style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></span>;
}
