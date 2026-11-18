"use client";
import { useEffect, useMemo, useState } from "react";
import { MuseStatTile, MuseStatRow } from "../design/MuseHeading";
import { useJournal } from "./useJournal";
import { formatShort, weekdayShort } from "./format";
import * as P from "@/lib/journal/persistence";
import { aiAction, AiError } from "@/lib/journal/ai-client";
import { isListed, tagKindLabel, tagKinds, type Report } from "@/lib/journal/model";
import { addDays, sourceSignature, streak, weekStart, weekStats } from "@/lib/journal/stats";
import { WeekConstellation } from "./JournalArt";

/**
 * Weekly report (Journal V1 §17): statistics are counted on the device from your entries, with no AI. The written
 * reflection is optional, made only when you ask, saved, and shown again without another request. Days without
 * entries stay empty.
 */
export function InsightsView({ open }: { open: (id: string) => void }) {
  const j = useJournal();
  const { state, today, ai } = j;
  const [start, setStart] = useState(() => weekStart(today));
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

  async function write(regenerate: boolean) {
    setBusy(true); setError("");
    try { const r = await aiAction<{ report: unknown }>({ action: "report", weekStart: start, regenerate }); void r; setReport(await P.loadReport(j.client, j.userId, start)); void j.refreshAi(); }
    catch (e) { setError(e instanceof AiError ? e.message : "The reflection couldn’t be written."); }
    finally { setBusy(false); }
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
        {tagKinds.map((k) => stats.tags[k].length > 0 && <div key={k}><h3 className="mj-section-title">{tagKindLabel[k]}</h3><ul className="mj-chip-list">{stats.tags[k].slice(0, 8).map((t) => <li key={t.id} className="mj-tag" data-kind={k}><a href={`/journal?view=history&tag=${t.id}`}>{t.name}</a> <span className="type-numeric">{t.entries}</span></li>)}</ul></div>)}
      </div>}
    </section>

    <section className="muse-journal-archive mj-reflection" aria-labelledby="mj-reflection-title">
      <div className="mj-row-between"><h2 id="mj-reflection-title" className="type-display mj-view-title">Weekly reflection</h2>
        {report && ai.enabled && <button type="button" className="muse-button button-ghost" disabled={busy} onClick={() => void write(true)}>{busy ? "Writing…" : "Write it again"}</button>}</div>
      {!stats.entries ? <p className="mj-note">No entries this week, so there’s nothing to reflect on.</p>
        : report ? <>
          {report.sourceSignature !== signature && <p className="mj-note" data-soft>Your entries for this week changed after this was written.</p>}
          <article className="mj-reflection-page"><p className="type-meta"><span className="mj-ai-badge">Written by AI</span> {new Date(report.updatedAt).toLocaleDateString()} · from {report.sourceIds.length} {report.sourceIds.length === 1 ? "entry" : "entries"} · may be imperfect</p>{report.data.narrative.split(/\n{2,}/).map((p, i) => <p key={i} className={i === 0 ? "type-quote mj-lead" : "type-reading"}>{p}</p>)}</article>
          <div className="mj-week-facets">
            {report.data.threads.length > 0 && <div><h3 className="mj-section-title">Recurring threads</h3><ul className="mj-note-list">{report.data.threads.map((x) => <li key={x}>{x}</li>)}</ul></div>}
            {report.data.moments.length > 0 && <div><h3 className="mj-section-title">Meaningful moments</h3><ul className="mj-note-list">{report.data.moments.map((x) => <li key={x}>{x}</li>)}</ul></div>}
            {report.data.observations.length > 0 && <div><h3 className="mj-section-title">Observations</h3><p className="mj-note">Tentative, grounded in this week’s entries.</p><ul className="mj-note-list">{report.data.observations.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          </div>
        </> : ai.enabled ? <div className="mj-row-between"><p className="mj-note">A short written look back at this week, made from your {stats.entries} {stats.entries === 1 ? "entry" : "entries"} when you ask. It’s saved, so reopening it costs nothing.</p><button type="button" className="muse-button button-primary" disabled={busy} onClick={() => void write(false)}>{busy ? "Writing…" : "Write this week’s reflection"}</button></div>
          : <p className="mj-note">Written reflections need AI, which isn’t on for your account. The numbers above are always here.</p>}
      {error && <p className="mj-error" role="alert">{error}</p>}
      {entries.length > 0 && <details className="mj-history"><summary>This week’s entries ({entries.length})</summary><ul className="mj-bookmarks">{entries.map((c) => <li key={c.id}><button type="button" className="mj-link" onClick={() => open(c.id)}>{weekdayShort(c.localDate)} · {c.title || "Untitled"}</button></li>)}</ul></details>}
    </section>
  </div>;
}
