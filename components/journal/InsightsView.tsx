"use client";
import { useEffect, useMemo, useState } from "react";
import { MuseStatTile, MuseStatRow } from "../design/MuseHeading";
import { MuseSegmented } from "../design/MuseSegmented";
import { useJournal } from "./useJournal";
import { formatShort, weekdayShort } from "./format";
import * as P from "@/lib/journal/persistence";
import { aiAction, AiError } from "@/lib/journal/ai-client";
import { isListed, tagKindLabel, tagKinds, type Report, type ReportSection } from "@/lib/journal/model";
import { addDays, periodEnd, periodStart, rangeStats, reviewLock, shiftPeriod, sourceSignature, streak, weekStats, type Period } from "@/lib/journal/stats";
import { costUsd, formatUsd, prices } from "@/lib/journal/pricing";
import { WeekConstellation } from "./JournalArt";
import { MUSE_STAR_PATH } from "../MuseStar";

const at = (d: string) => new Date(`${d}T12:00:00Z`);
const monthName = (d: string) => at(d).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const periodTitle = (kind: Period, start: string, end: string) => (kind === "week" ? `${formatShort(start)} – ${formatShort(end)}` : kind === "month" ? monthName(start) : start.slice(0, 4));
const reviewName: Record<Period, string> = { week: "Weekly reflection", month: "Monthly review", year: "Year in review" };
const noun: Record<Period, string> = { week: "week", month: "month", year: "year" };

/**
 * Insights: Week | Month | Year (the same switcher as History). Numbers are counted on the device with no AI. The
 * written review is optional, made only when asked, saved, and shown again without another request: a week opens on
 * its Sunday, a month or year once it's over; earlier periods (imported history included) are always open.
 */
export function InsightsView({ open, initialWeek }: { open: (id: string) => void; initialWeek?: string | null }) {
  const j = useJournal();
  const { state, today, ai } = j;
  const [kind, setKind] = useState<Period>("week");
  const [starts, setStarts] = useState<Record<Period, string>>(() => ({
    week: periodStart("week", initialWeek && /^\d{4}-\d{2}-\d{2}$/.test(initialWeek) && initialWeek <= today ? initialWeek : today),
    month: periodStart("month", today), year: periodStart("year", today),
  }));
  const start = starts[kind], end = periodEnd(kind, start), current = periodStart(kind, today);
  const setStart = (s: string) => { setStarts({ ...starts, [kind]: s }); setError(""); };
  const [loaded, setLoaded] = useState<{ key: string; report: Report | null } | null>(null);
  const key = `${kind}:${start}`, report = loaded?.key === key ? loaded.report : null;
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const stats = useMemo(() => (kind === "week" ? weekStats(start, state.conversations, state.entryTags, state.tags) : rangeStats(start, end, state.conversations, state.entryTags, state.tags)), [kind, start, end, state.conversations, state.entryTags, state.tags]);
  const entries = state.conversations.filter((c) => stats.entryIds.includes(c.id));
  const signature = sourceSignature(entries);
  const days = useMemo(() => new Set(state.conversations.filter(isListed).map((c) => c.localDate)), [state.conversations]);
  useEffect(() => { let live = true; void P.loadReport(j.client, j.userId, start, kind).then((r) => { if (live) setLoaded({ key: `${kind}:${start}`, report: r }); }).catch(() => undefined); return () => { live = false; }; }, [kind, start, j.client, j.userId]);
  const max = Math.max(1, ...stats.byDay.map((d) => d.words));
  const isCurrent = start === current;
  const lock = reviewLock(kind, start, today), locked = lock !== "open";
  const writtenToday = state.conversations.some((c) => isListed(c) && c.localDate === today);
  const newer = report ? entries.filter((c) => !report.sourceIds.includes(c.id)).length : 0, changed = Boolean(report && report.sourceSignature !== signature);
  const totalDays = Math.round((at(end).getTime() - at(start).getTime()) / 86400000) + 1;
  // A likely cost before a long review: bounded excerpts per entry, never full transcripts.
  const estimate = useMemo(() => {
    if (kind === "week" || !ai.model) return null;
    const model = prices[ai.model] ? ai.model : "__unknown__", chars = Math.min(kind === "month" ? 120000 : 150000, entries.length * (kind === "month" ? 1700 : 650));
    return costUsd(model, { inputTokens: Math.ceil((chars + 8000) / 3.8), cachedTokens: 0, outputTokens: kind === "month" ? 5000 : 8000 });
  }, [kind, entries.length, ai.model]);

  async function write(regenerate: boolean) {
    if (busy) return;
    setBusy(true); setError("");
    try { await aiAction<{ report: unknown }>({ action: "report", period: kind, weekStart: start, start, regenerate, localDate: today }); }
    catch (e) {
      // Another tap or device is already writing it (or just did): show what's saved instead of an error.
      if (!(e instanceof AiError && (e.code === "in-progress" || e.code === "duplicate"))) setError(e instanceof AiError ? e.message : "The review couldn’t be written.");
    }
    finally { const r = await P.loadReport(j.client, j.userId, start, kind).catch(() => null); setLoaded({ key, report: r }); void j.refreshAi(); setBusy(false); }
  }
  const lockedText = lock === "until-sunday" ? <>Your reflection opens on Sunday.</> : <>Your {kind === "month" ? monthName(start).split(" ")[0] : start.slice(0, 4)} review opens when the {noun[kind]} is over.</>;
  const opensOn = lock === "until-sunday" ? end : addDays(end, 1);

  return <div className="mj-insights mj-reveal">
    <section className="muse-journal-archive" aria-labelledby="mj-period-title">
      <div className="mj-shelf-head"><div><h2 className="type-display mj-view-title">Insights</h2><p className="mj-note">Your {noun[kind]} in writing, counted from your entries.</p></div>
        <div className="mj-history-controls"><MuseSegmented label="Period" value={kind} onChange={(k) => { setKind(k); setError(""); }} options={[{ id: "week", label: "Week" }, { id: "month", label: "Month" }, { id: "year", label: "Year" }]} /></div></div>
      <div className="mj-period-bar">
        <nav className="muse-week-jump" aria-label={noun[kind]}><button className="muse-button" type="button" aria-label={`Previous ${noun[kind]}`} onClick={() => setStart(shiftPeriod(kind, start, -1))}>‹</button><button className="muse-button" type="button" disabled={isCurrent} onClick={() => setStart(current)}>This {noun[kind]}</button><button className="muse-button" type="button" aria-label={`Next ${noun[kind]}`} disabled={isCurrent} onClick={() => setStart(shiftPeriod(kind, start, 1))}>›</button></nav>
        <h3 id="mj-period-title" className="mj-period-title type-editorial" aria-live="polite">{periodTitle(kind, start, end)}</h3>
      </div>
      <MuseStatRow label={`This ${noun[kind]} in numbers`}>
        <MuseStatTile icon="journal" tone={5} value={stats.entries} label="Entries" />
        <MuseStatTile icon="calendar" tone={2} value={`${stats.days}/${totalDays}`} label="Days journaled" />
        <MuseStatTile icon="quill" tone={7} value={stats.words.toLocaleString()} label="Words" />
        <MuseStatTile icon="streak" tone={4} value={streak(days, today)} label="Day streak now" />
      </MuseStatRow>
      {kind === "week" && (stats.entries === 0 ? <div className="mj-week-quiet">
        <WeekConstellation days={stats.byDay.map((d) => d.date)} written={new Set()} today={today} />
        <p className="type-quote">{isCurrent ? "A fresh week. The first entry lights the first star." : "A quiet week: nothing was written."}</p>
      </div> : <div className="mj-week-chart" role="img" aria-label={`Words by day: ${stats.byDay.map((d) => `${weekdayShort(d.date)} ${d.words}`).join(", ")}`} key={start}>
        {stats.byDay.map((d) => <div key={d.date} className="mj-bar" data-empty={!d.entries || undefined} data-today={d.date === today || undefined}>
          <b className="type-numeric">{d.entries ? d.words : ""}</b><span className="mj-bar-fill" style={{ height: `${d.entries ? Math.max(10, (d.words / max) * 100) : 0}%` }} /><small className="type-meta">{weekdayShort(d.date)}</small></div>)}
      </div>)}
      {(stats.journals.length > 0 || tagKinds.some((k) => stats.tags[k].length)) && <div className="mj-week-facets">
        {stats.journals.length > 0 && <div><h3 className="mj-section-title">Journals</h3><ul className="mj-chip-list">{stats.journals.map((x) => <li key={x.id} className="mj-tag"><a href={`/journal?view=history&journal=${x.id}`}>{state.journals.find((k) => k.id === x.id)?.name ?? "Journal"}</a> <span className="type-numeric">{x.entries}</span></li>)}</ul></div>}
        {tagKinds.map((k) => stats.tags[k].length > 0 && <div key={k}><h3 className="mj-section-title">{tagKindLabel[k]}</h3><ul className="mj-chip-list">{stats.tags[k].slice(0, 8).map((t) => <li key={t.id} className="mj-tag" data-kind={k}><a href={`/journal?view=history&tag=${t.id}`}>{k === "custom" ? `#${t.name}` : t.name}</a> <span className="type-numeric">{t.entries}</span></li>)}</ul></div>)}
      </div>}
    </section>

    <section className="muse-journal-archive mj-reflection" aria-labelledby="mj-reflection-title">
      <div className="mj-row-between"><h2 id="mj-reflection-title" className="type-display mj-view-title">{reviewName[kind]}</h2>
        {report && ai.enabled && !locked && <button type="button" className="muse-button button-ghost" disabled={busy} onClick={() => void write(true)}>{busy ? "Writing…" : newer || changed ? `Update ${kind === "week" ? "reflection" : "review"}` : "Write it again"}</button>}</div>
      {!stats.entries ? <p className="mj-note">No entries this {noun[kind]}, so there’s nothing to look back on.</p>
        : report ? <>
          {(newer > 0 || changed) && <p className="mj-note" data-soft role="status">{newer > 0 ? `This was written before ${newer} newer ${newer === 1 ? "entry" : "entries"}.` : `Your entries for this ${noun[kind]} changed after this was written.`}{ai.enabled && <> <button type="button" className="mj-link" disabled={busy} onClick={() => void write(true)}>{busy ? "Writing…" : `Update ${kind === "week" ? "reflection" : "review"}`}</button></>}</p>}
          <ReportBody report={report} kind={kind} />
        </> : locked ? <div className="mj-week-quiet mj-reflection-locked">
          {kind === "week" && <WeekConstellation days={stats.byDay.map((d) => d.date)} written={new Set(stats.byDay.filter((d) => d.entries).map((d) => d.date))} today={today} />}
          <p className="type-quote">{lockedText}</p>
          <p className="mj-note">On {formatShort(opensOn)} you can ask for one detailed look back at the whole {noun[kind]}, read from everything you wrote. Until then, keep writing; the numbers above update as you go.</p>
        </div> : ai.enabled ? <div className="mj-reflection-ready">
          <p className="mj-note">{kind === "week" ? `A detailed look back at this week, read from your ${stats.entries} ${stats.entries === 1 ? "entry" : "entries"}: what happened, the themes running through it, what stood out and your wins.` : `A detailed review of ${kind === "month" ? monthName(start) : start.slice(0, 4)} from your ${stats.entries} ${stats.entries === 1 ? "entry" : "entries"}: what happened, ${kind === "year" ? "its chapters and turning points" : "the moments that mattered"}, the people in it, what changed and your wins.`} It’s one AI request{estimate != null ? `, likely about ${formatUsd(estimate)}` : ""}, written only when you ask and saved, so reopening it costs nothing.</p>
          {kind === "week" && isCurrent && !writtenToday && <p className="mj-note" data-soft>You haven’t written today yet. If you journal tonight first, writing the reflection afterwards includes it.</p>}
          <button type="button" className="muse-button button-primary" disabled={busy} onClick={() => void write(false)}>{busy ? `Reading your ${noun[kind]}…` : kind === "week" ? "Write this week’s reflection" : `Write the ${noun[kind]} in review`}</button>
          {busy && kind !== "week" && <p className="mj-note" role="status">A whole {noun[kind]} takes a minute or two to read and write. You can stay here.</p>}
        </div>
          : <p className="mj-note">Written reviews need AI, which isn’t on for your account. The numbers above are always here.</p>}
      {error && <p className="mj-error" role="alert">{error}</p>}
      {entries.length > 0 && <details className="mj-history"><summary>This {noun[kind]}’s entries ({entries.length})</summary><ul className="mj-bookmarks">{entries.map((c) => <li key={c.id}><button type="button" className="mj-link" onClick={() => open(c.id)}>{kind === "week" ? weekdayShort(c.localDate) : formatShort(c.localDate)} · {c.title || "Untitled"}</button></li>)}</ul></details>}
    </section>
  </div>;
}

/** Section order and names per period. Weeks: themes, insights, wins. Months and years add chapters, people and change. */
const sectionsFor: Record<Period, { key: "chapters" | "themes" | "people" | "shifts" | "insights" | "wins"; label: string; style: "blocks" | "cards" | "list" }[]> = {
  week: [{ key: "themes", label: "Major themes", style: "blocks" }, { key: "insights", label: "Insights & patterns", style: "cards" }, { key: "wins", label: "Weekly wins", style: "list" }],
  month: [{ key: "chapters", label: "Moments that mattered", style: "blocks" }, { key: "themes", label: "Major themes", style: "blocks" }, { key: "people", label: "People & relationships", style: "blocks" }, { key: "shifts", label: "What changed", style: "blocks" }, { key: "insights", label: "Insights & patterns", style: "cards" }, { key: "wins", label: "Wins & memorable moments", style: "list" }],
  year: [{ key: "chapters", label: "Chapters & turning points", style: "blocks" }, { key: "themes", label: "Themes that ran through it", style: "blocks" }, { key: "people", label: "People & relationships", style: "blocks" }, { key: "shifts", label: "What changed, what stayed", style: "blocks" }, { key: "insights", label: "Insights & patterns", style: "cards" }, { key: "wins", label: "Wins, milestones & memories", style: "list" }],
};
const paragraphs = (t: string) => t.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);

/**
 * A saved review: editorial title, the period in review, then its sections. V1 weekly reports (a short narrative with
 * threads, moments and observations) render as written.
 */
function ReportBody({ report, kind }: { report: Report; kind: Period }) {
  const d = report.data;
  const when = new Date(report.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const n = d.covered?.entries ?? report.sourceIds.length;
  const meta = <p className="type-meta"><span className="mj-ai-badge">Written by AI</span> {when} · {d.covered ? `${formatShort(d.covered.start)} – ${formatShort(d.covered.end)} · ` : ""}from {n} {n === 1 ? "entry" : "entries"} · may be imperfect</p>;
  if (!d.title && !d.review) return <>
    <article className="mj-reflection-page">{meta}{paragraphs(d.narrative).map((p, i) => <p key={i} className={i === 0 ? "type-quote mj-lead" : "type-reading"}>{p}</p>)}</article>
    <div className="mj-week-facets">
      {d.threads.length > 0 && <div><h3 className="mj-section-title">Recurring threads</h3><ul className="mj-note-list">{d.threads.map((x) => <li key={x}>{x}</li>)}</ul></div>}
      {d.moments.length > 0 && <div><h3 className="mj-section-title">Meaningful moments</h3><ul className="mj-note-list">{d.moments.map((x) => <li key={x}>{x}</li>)}</ul></div>}
      {d.observations.length > 0 && <div><h3 className="mj-section-title">Observations</h3><ul className="mj-note-list">{d.observations.map((x) => <li key={x}>{x}</li>)}</ul></div>}
    </div>
  </>;
  const blocks = (items: ReportSection[]) => items.map((t, i) => <div key={i} className="mj-report-theme">{t.heading && <h5 className="type-title">{t.heading}</h5>}{paragraphs(t.body).map((p, k) => <p key={k} className="type-reading">{p}</p>)}</div>);
  return <article className="mj-reflection-page mj-report-v2">
    {meta}
    <h3 className="type-display mj-report-title">{d.title}</h3>
    <section aria-label={`The ${noun[kind]} in review`}><h4 className="mj-section-title">The {noun[kind]} in review</h4>
      {paragraphs(d.review).map((p, i) => <p key={i} className={i === 0 ? "type-quote mj-lead" : "type-reading"}>{p}</p>)}</section>
    {sectionsFor[kind].map(({ key, label, style }) => d[key].length > 0 && <section key={key} aria-label={label}><h4 className="mj-section-title">{label}</h4>
      {style === "blocks" ? blocks(d[key])
        : style === "cards" ? <div className="mj-insights-list">{d[key].map((x, i) => <figure key={i} className="mj-insight"><figcaption className="type-meta"><svg viewBox="0 0 24 40" aria-hidden="true"><path d={MUSE_STAR_PATH} /></svg>{x.heading || "Insight"}</figcaption>{paragraphs(x.body).map((p, k) => <p key={k} className="type-reading">{p}</p>)}</figure>)}</div>
        : <ul className="mj-report-wins">{d[key].map((w, i) => <li key={i}>{w.heading && <b>{w.heading}</b>}<span className="type-reading">{w.body}</span></li>)}</ul>}
    </section>)}
    {d.closing && <p className="type-quote mj-report-closing">{d.closing}</p>}
  </article>;
}
