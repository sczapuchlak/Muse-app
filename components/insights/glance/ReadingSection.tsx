"use client";
import Link from "next/link";
import { BookCover } from "../../whimsy/Bookshelf";
import { MuseIcon } from "../../MuseIcon";
import { GlanceCard, Empty } from "./GlanceSections";
import { readingDuration, readingProgressModes, type currentlyReading, type GlancePeriod, type readingGlance, type ReadingProgressMode } from "@/lib/insights/glance";

const shortDay = (d: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const periodWords: Record<GlancePeriod, string> = { day: "that day", week: "this week", month: "this month", year: "this year" };

/**
 * Bookshelf in Insights (#97), compact in every period. Two clearly separate things:
 * - Now reading: today's nightstand, a current snapshot that does not change with the selected period.
 * - Reading in the period: time, pages, reading days and finished books dated inside the period.
 * Progress shows as percent, pages or time (the account preference). Time is reading time, never completion.
 */
export function ReadingSection({ period, reading, nightstand, status, onRetry, mode, saving, onMode, area }: {
  period: GlancePeriod; reading: ReturnType<typeof readingGlance>; nightstand: ReturnType<typeof currentlyReading>;
  status: { loaded: boolean; error?: string }; onRetry: () => void; mode: ReadingProgressMode; saving: boolean; onMode: (mode: ReadingProgressMode) => void; area?: string;
}) {
  return <GlanceCard id="glance-reading" title="Bookshelf" icon="book" area={area} tone="cool"
    action={<div className="muse-segmented muse-glance-mode" role="group" aria-label="Show reading progress as" aria-busy={saving}>
      {readingProgressModes.map((m) => <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => onMode(m.id)}>{m.label}</button>)}</div>}>
    {status.error ? <p role="alert">Bookshelf couldn’t load. <button type="button" className="muse-glance-pill" onClick={onRetry}>Retry</button></p>
      : !status.loaded ? <Empty>Loading your books…</Empty> : <div className="muse-glance-reading">
      <div className="muse-glance-subhead"><h3>Now reading</h3><span>as of today</span></div>
      {!nightstand.length ? <p className="muse-glance-empty"><span aria-hidden="true">📚</span>Nothing marked as reading. <Link className="muse-glance-pill" data-size="sm" href="/collections?kind=book">Open Bookshelf</Link></p>
        : <ul className="muse-glance-books">{nightstand.map((x) => <li key={x.book.id} className="muse-glance-book">
          <BookCover book={x.book} />
          <div className="muse-glance-book-body">
            <strong>{x.book.title}</strong>{x.book.author && <span className="muse-glance-sub">{x.book.author}</span>}
            <Progress mode={mode} item={x} />
          </div>
        </li>)}</ul>}
      <div className="muse-glance-subhead"><h3>Reading {periodWords[period]}</h3><span>from saved sessions</span></div>
      {!reading.sessions && !reading.completed.length ? <p className="muse-glance-empty"><span aria-hidden="true">🔖</span>No reading recorded {periodWords[period]}.</p> : <>
        <dl className="muse-glance-statrow" data-cols="2">
          <div><dt>⏱ Time</dt><dd>{reading.seconds ? readingDuration(reading.seconds) : "—"}</dd></div>
          <div><dt>📄 Pages</dt><dd>{reading.pages ? reading.pages.toLocaleString("en-US") : "—"}</dd></div>
          {period !== "day" && <div><dt>📅 Reading days</dt><dd>{reading.readingDays}</dd></div>}
          <div><dt>🏁 Finished</dt><dd>{reading.completed.length}</dd></div>
        </dl>
        {reading.books.length > 0 && <ul className="muse-glance-chips" aria-label={`Books read ${periodWords[period]}`}>{reading.books.slice(0, 6).map((b) => <li key={b.book.id}>{b.book.title} <b>{[b.seconds ? readingDuration(b.seconds) : "", b.pages ? `${b.pages} pp` : ""].filter(Boolean).join(" · ")}</b></li>)}</ul>}
        {reading.completed.length > 0 && <ul className="muse-glance-finished" aria-label={`Finished ${periodWords[period]}`}>{reading.completed.map((c) => <li key={`${c.book.id}-${c.finishedOn}`}>
          <BookCover book={c.book} /><span><strong>{c.book.title}</strong><span className="muse-glance-sub">🏁 {shortDay(c.finishedOn)}{c.reread ? " · reread" : ""}</span></span></li>)}</ul>}
      </>}
    </div>}
  </GlanceCard>;
}

function Progress({ mode, item }: { mode: ReadingProgressMode; item: ReturnType<typeof currentlyReading>[number] }) {
  if (mode === "time") return <p className="muse-glance-book-progress" data-mode="time"><MuseIcon name="timer" size={14} /> <b>{item.seconds ? readingDuration(item.seconds) : "No timed sessions yet"}</b><span className="muse-glance-sub">reading time, not progress</span></p>;
  if (mode === "pages" || item.percent === null) {
    return <div className="muse-glance-book-progress">
      {item.total ? <Bar value={item.position} max={item.total} label={`Page ${item.position} of ${item.total}`} /> : null}
      <b>{item.total ? `p. ${item.position} / ${item.total}` : `p. ${item.position}`}</b>
      {mode === "percent" && !item.total && <span className="muse-glance-sub">add total pages in Bookshelf to see a percent</span>}
    </div>;
  }
  return <div className="muse-glance-book-progress"><Bar value={item.position} max={item.total!} label={`${item.percent}% read`} /><b>{item.percent}%</b></div>;
}
function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  return <span className="muse-glance-meter" role="img" aria-label={label} title={label}><span style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></span>;
}
