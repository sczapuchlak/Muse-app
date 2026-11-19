"use client";
import { useEffect, useMemo, useState } from "react";
import { MuseStatTile, MuseStatRow } from "../design/MuseHeading";
import { useJournal } from "./useJournal";
import { formatShort, weekdayShort } from "./format";
import * as P from "@/lib/journal/persistence";
import { aiAction, AiError } from "@/lib/journal/ai-client";
import { isListed, tagKindLabel, tagKinds, type Report } from "@/lib/journal/model";
import { addDays, reflectionLock, sourceSignature, streak, weekStart, weekStats } from "@/lib/journal/stats";
import { WeekConstellation } from "./JournalArt";
import { MUSE_STAR_PATH } from "../MuseStar";

/**
 * Weekly report (Journal V1 §17): statistics are counted on the device from your entries, with no AI. The written
 * reflection is optional, made only when you ask, saved, and shown again without another request. Days without
 * entries stay empty.
 */
export function InsightsView({ open, initialWeek }: { open: (id: string) => void; initialWeek?: string | null }) {
  const j = useJournal();
  const { state, today, ai } = j;
  const [start, setStart] = useState(() => weekStart(initialWeek && /^\d{4}-\d{2}-\d{2}$/.test(initialWeek) && initialWeek <= today ? initialWeek : today));
  const [loadedReport, setLoadedReport] = useState<{ start: string; report: Report | null } | null>(null);
  const report = loadedReport?.start === start ? loadedReport.report : null;
  const setReport = (r: Report | null) => setLoadedReport({ start, report: r });
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const stats = useMemo(() => weekStats(start, state.conversations, state.entryTags, state.tags), [start, state.conversations, state.entryTags, state.tags]);
  const entries = state.conversations.filter((c) => stats.entryIds.includes(c.id));
  const signature = sourceSignature(entries);
  const days = useMemo(() => new Set(state.conversations.filter(isListed).map((c) => c.localDate)), [state.conversations]);
  useEffect(() => { let live = true; void P.loadReport(j.client, j.userId, start).then((r) => { if (live) setLoadedReport({ start, report: r }); }).catch(() => undefined); return () => { live = false; }; }, [start, j.client, j.userId]);
  const max = Math.max(1, ...stats.byDay.map((d) => d.words));
  const thisWeek = weekStart(today) === start;

  // Sunday unlock: this week's reflection opens on its Sunday (their own day); earlier weeks are always open.
  const sunday = stats.end, locked = reflectionLock(start, today) !== "open", writtenToday = state.conversations.some((c) => isListed(c) && c.localDate === today);
  const newer = report ? entries.filter((c) => !report.sourceIds.includes(c.id)).length : 0, changed = Boolean(report && report.sourceSignature !== signature);
  async function write(regenerate: boolean) {
    if (busy) return;
    setBusy(true); setError("");
    try { await aiAction<{ report: unknown }>({ action: "report", weekStart: start, regenerate, localDate: today }); }
    catch (e) {
      // Another tap or device is already writing it (or just did): show what's saved instead of an error.
      if (!(e instanceof AiError && (e.code === "in-progress" || e.code === "duplicate"))) setError(e instanceof AiError ? e.message : "The reflection couldn’t be written.");
    }
    finally { setReport(await P.loadReport(j.client, j.userId, start).catch(() => null)); void j.refreshAi(); setBusy(false); }
  }
  return <div className="mj-insights mj-reveal">
    <section className="muse-journal-archive" aria-labelledby="mj-week-title">
      <div className="mj-shelf-head"><div><h2 className="type-display mj-view-title">Insights</h2><p className="mj-note">Your week in writing, counted from your entries.</p></div></div>
      <div className="mj-period-bar">
        <nav className="muse-week-jump" aria-label="Week"><button className="muse-button" type="button" aria-label="Previous week" onClick={() => { setStart(addDays(start, -7)); setError(""); }}>‹</button><button className="muse-button" type="button" disabled={thisWeek} onClick={() => { setStart(weekStart(today)); setError(""); }}>This week</button><button className="muse-button" type="button" aria-label="Next week" disabled={thisWeek} onClick={() => { setStart(addDays(start, 7)); setError(""); }}>›</button></nav>
        <h3 id="mj-week-title" className="mj-period-title type-editorial" aria-live="polite">{formatShort(stats.start)} – {formatShort(stats.end)}</h3>
      </div>
      <MuseStatRow label="This week in numbers">
        <MuseStatTile icon="journal" tone={5} value={stats.entries} label="Entries" />
        <MuseStatTile icon="calendar" tone={2} value={`${stats.days}/7`} label="Days journaled" />
        <MuseStatTile icon="quill" tone={7} value={stats.words.toLocaleString()} label="Words" />
        <MuseStatTile icon="streak" tone={4} value={streak(days, today)} label="Day streak now" />
      </MuseStatRow>
      {stats.entries === 0 ? <div className="mj-week-quiet">
        <WeekConstellation days={stats.byDay.map((d) => d.date)} written={new Set()} today={today} />
        <p className="type-quote">{thisWeek ? "A fresh week. The first entry lights the first star." : "A quiet week: nothing was written."}</p>
      </div> : <div className="mj-week-chart" role="img" aria-label={`Words by day: ${stats.byDay.map((d) => `${weekdayShort(d.date)} ${d.words}`).join(", ")}`} key={start}>
        {stats.byDay.map((d) => <div key={d.date} className="mj-bar" data-empty={!d.entries || undefined} data-today={d.date === today || undefined}>
          <b className="type-numeric">{d.entries ? d.words : ""}</b><span className="mj-bar-fill" style={{ height: `${d.entries ? Math.max(10, (d.words / max) * 100) : 0}%` }} /><small className="type-meta">{weekdayShort(d.date)}</small></div>)}
      </div>}
      {(stats.journals.length > 0 || tagKinds.some((k) => stats.tags[k].length)) && <div className="mj-week-facets">
        {stats.journals.length > 0 && <div><h3 className="mj-section-title">Journals</h3><ul className="mj-chip-list">{stats.journals.map((x) => <li key={x.id} className="mj-tag"><a href={`/journal?view=history&journal=${x.id}`}>{state.journals.find((k) => k.id === x.id)?.name ?? "Journal"}</a> <span className="type-numeric">{x.entries}</span></li>)}</ul></div>}
        {tagKinds.map((k) => stats.tags[k].length > 0 && <div key={k}><h3 className="mj-section-title">{tagKindLabel[k]}</h3><ul className="mj-chip-list">{stats.tags[k].slice(0, 8).map((t) => <li key={t.id} className="mj-tag" data-kind={k}><a href={`/journal?view=history&tag=${t.id}`}>{k === "custom" ? `#${t.name}` : t.name}</a> <span className="type-numeric">{t.entries}</span></li>)}</ul></div>)}
      </div>}
    </section>

    <section className="muse-journal-archive mj-reflection" aria-labelledby="mj-reflection-title">
      <div className="mj-row-between"><h2 id="mj-reflection-title" className="type-display mj-view-title">Weekly reflection</h2>
        {report && ai.enabled && !locked && <button type="button" className="muse-button button-ghost" disabled={busy} onClick={() => void write(true)}>{busy ? "Writing…" : newer || changed ? "Update reflection" : "Write it again"}</button>}</div>
      {!stats.entries ? <p className="mj-note">No entries this week, so there’s nothing to reflect on.</p>
        : report ? <>
          {(newer > 0 || changed) && <p className="mj-note" data-soft role="status">{newer > 0 ? `This reflection was written before ${newer} newer ${newer === 1 ? "entry" : "entries"}.` : "Your entries for this week changed after this was written."}{ai.enabled && <> <button type="button" className="mj-link" disabled={busy} onClick={() => void write(true)}>{busy ? "Writing…" : "Update reflection"}</button></>}</p>}
          <ReportBody report={report} />
        </> : locked ? <div className="mj-week-quiet mj-reflection-locked">
          <WeekConstellation days={stats.byDay.map((d) => d.date)} written={new Set(stats.byDay.filter((d) => d.entries).map((d) => d.date))} today={today} />
          <p className="type-quote">Your reflection opens on Sunday.</p>
          <p className="mj-note">On {formatShort(sunday)} you can ask for one detailed look back at the whole week, read from everything you wrote. Until then, keep writing; the numbers above update as you go.</p>
        </div> : ai.enabled ? <div className="mj-reflection-ready">
          <p className="mj-note">A detailed look back at this week, read from your {stats.entries} {stats.entries === 1 ? "entry" : "entries"}: what happened, the themes running through it, what stood out and your wins. It’s one AI request, written only when you ask and saved, so reopening it costs nothing.</p>
          {thisWeek && !writtenToday && <p className="mj-note" data-soft>You haven’t written today yet. If you journal tonight first, writing the reflection afterwards includes it.</p>}
          <button type="button" className="muse-button button-primary" disabled={busy} onClick={() => void write(false)}>{busy ? "Reading your week…" : "Write this week’s reflection"}</button>
        </div>
          : <p className="mj-note">Written reflections need AI, which isn’t on for your account. The numbers above are always here.</p>}
      {error && <p className="mj-error" role="alert">{error}</p>}
      {entries.length > 0 && <details className="mj-history"><summary>This week’s entries ({entries.length})</summary><ul className="mj-bookmarks">{entries.map((c) => <li key={c.id}><button type="button" className="mj-link" onClick={() => open(c.id)}>{weekdayShort(c.localDate)} · {c.title || "Untitled"}</button></li>)}</ul></details>}
    </section>
  </div>;
}

/**
 * A saved weekly reflection. V2: editorial title, the week in review, major themes, insights and patterns, wins and an
 * optional closing thought. V1 reports (a short narrative with threads, moments and observations) render as written.
 */
function ReportBody({ report }: { report: Report }) {
  const d = report.data, paragraphs = (t: string) => t.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
  const when = new Date(report.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const meta = <p className="type-meta"><span className="mj-ai-badge">Written by AI</span> {when} · {d.covered ? `${formatShort(d.covered.start)} – ${formatShort(d.covered.end)} · ` : ""}from {d.covered?.entries ?? report.sourceIds.length} {(d.covered?.entries ?? report.sourceIds.length) === 1 ? "entry" : "entries"} · may be imperfect</p>;
  if (!d.title && !d.review) return <>
    <article className="mj-reflection-page">{meta}{paragraphs(d.narrative).map((p, i) => <p key={i} className={i === 0 ? "type-quote mj-lead" : "type-reading"}>{p}</p>)}</article>
    <div className="mj-week-facets">
      {d.threads.length > 0 && <div><h3 className="mj-section-title">Recurring threads</h3><ul className="mj-note-list">{d.threads.map((x) => <li key={x}>{x}</li>)}</ul></div>}
      {d.moments.length > 0 && <div><h3 className="mj-section-title">Meaningful moments</h3><ul className="mj-note-list">{d.moments.map((x) => <li key={x}>{x}</li>)}</ul></div>}
      {d.observations.length > 0 && <div><h3 className="mj-section-title">Observations</h3><ul className="mj-note-list">{d.observations.map((x) => <li key={x}>{x}</li>)}</ul></div>}
    </div>
  </>;
  return <article className="mj-reflection-page mj-report-v2">
    {meta}
    <h3 className="type-display mj-report-title">{d.title}</h3>
    <section aria-label="The week in review"><h4 className="mj-section-title">The week in review</h4>
      {paragraphs(d.review).map((p, i) => <p key={i} className={i === 0 ? "type-quote mj-lead" : "type-reading"}>{p}</p>)}</section>
    {d.themes.length > 0 && <section aria-label="Major themes"><h4 className="mj-section-title">Major themes</h4>
      {d.themes.map((t, i) => <div key={i} className="mj-report-theme"><h5 className="type-title">{t.heading}</h5>{paragraphs(t.body).map((p, k) => <p key={k} className="type-reading">{p}</p>)}</div>)}</section>}
    {d.insights.length > 0 && <section aria-label="Insights and patterns"><h4 className="mj-section-title">Insights & patterns</h4>
      <div className="mj-insights-list">{d.insights.map((x, i) => <figure key={i} className="mj-insight"><figcaption className="type-meta"><svg viewBox="0 0 24 40" aria-hidden="true"><path d={MUSE_STAR_PATH} /></svg>{x.heading || "Insight"}</figcaption>{paragraphs(x.body).map((p, k) => <p key={k} className="type-reading">{p}</p>)}</figure>)}</div></section>}
    {d.wins.length > 0 && <section aria-label="Weekly wins"><h4 className="mj-section-title">Weekly wins</h4>
      <ul className="mj-report-wins">{d.wins.map((w, i) => <li key={i}>{w.heading && <b>{w.heading}</b>}<span className="type-reading">{w.body}</span></li>)}</ul></section>}
    {d.closing && <p className="type-quote mj-report-closing">{d.closing}</p>}
  </article>;
}
