"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { MuseSegmented } from "../design/MuseSegmented";
import { useJournal } from "./useJournal";
import { blankJournal } from "./JournalsView";
import { formatShort } from "./format";
import { ACCEPT, readImport } from "@/lib/journal/import/adapters";
import { enrichmentEstimate, entryProblem, fingerprint, importKey, normalizeEntry, previewOf, sourceLabel, type ImportEntry, type ParsedImport } from "@/lib/journal/import/model";
import { enrichmentCandidates, finishBatch, importer, knownImports, listBatches, runImport, startBatch, undoBatch, type Batch, type ImportReport } from "@/lib/journal/import/run";
import { aiAction, AiError } from "@/lib/journal/ai-client";
import { formatUsd } from "@/lib/journal/pricing";

type Prepared = { parsed: ParsedImport; ready: ImportEntry[]; duplicates: number; known: number; problems: { index: number; date?: string; reason: string }[] };
const NEW = "new:";
/** `n` entries spread evenly across the list (oldest to newest), for a first look. */
const spread = <T,>(list: readonly T[], n: number) => (list.length <= n ? [...list] : Array.from({ length: n }, (_, i) => list[Math.round((i * (list.length - 1)) / (n - 1))]));

/**
 * Journal settings → Import journal history. Files are read in the browser (nothing is uploaded whole); the preview
 * says what was found and what can be kept before anything is written; each entry is then imported on its own, so a
 * large export can't time out and a failure costs one entry. Imported entries are ordinary entries. No AI runs here:
 * optional enrichment is separate, estimated first, and needs an explicit yes.
 */
export function ImportHistory({ onBack }: { onBack: () => void }) {
  const j = useJournal();
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [prep, setPrep] = useState<Prepared | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null), [sample, setSample] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const stop = useRef<AbortController | null>(null);
  const loadBatches = useCallback(async () => { if (j.userId) setBatches(await listBatches(j.client, j.userId)); }, [j.client, j.userId]);
  useEffect(() => { let live = true; if (j.userId) void listBatches(j.client, j.userId).then((b) => { if (live) setBatches(b); }); return () => { live = false; }; }, [j.client, j.userId]);
  const journals = j.state.journals.filter((x) => !x.archivedAt);
  const fallback = journals.find((x) => x.id === j.state.prefs.defaultJournalId) ?? journals[0];

  async function choose(files: FileList | null) {
    setError(""); setPrep(null); setReport(null); setSample(false);
    if (!files?.length) return;
    setBusy(true);
    try {
      const r = await readImport([...files], { timeZone: j.timeZone });
      if (!r.ok) { setError(r.reason); return; }
      const problems = [...r.parsed.problems], ready: ImportEntry[] = [];
      const known = await knownImports(j.client, j.userId, r.parsed.source);
      const here = new Set(j.state.conversations.map((c) => c.id));
      const seen = new Set<string>();
      let duplicates = 0, inMuse = 0;
      for (const raw of r.parsed.entries) {
        const e = normalizeEntry(raw), why = entryProblem(e, j.today);
        if (why) { problems.push({ index: e.index, date: e.localDate, reason: why }); continue; }
        const fp = await fingerprint(e), key = importKey(e, fp);
        if (r.parsed.source === "muse" && e.sourceKey && here.has(e.sourceKey)) { inMuse++; continue; }
        if (known.keys.has(key) || known.fps.has(fp) || seen.has(fp)) { duplicates++; continue; }
        seen.add(fp); ready.push(e);
      }
      setPrep({ parsed: r.parsed, ready, duplicates, known: inMuse, problems });
      const names = [...new Set(ready.map((e) => e.journalName))];
      setMapping(Object.fromEntries(names.map((n) => { const same = journals.find((x) => x.name.trim().toLowerCase() === n.trim().toLowerCase()); return [n, same ? same.id : fallback?.id ?? `${NEW}${n || "Imported"}`]; })));
    } catch { setError("That file couldn’t be read. Nothing was imported."); }
    finally { setBusy(false); }
  }

  /** Imports everything ready, or a few spread across the dates first (the rest can follow; they're never doubled). */
  async function start(first?: number) {
    if (!prep?.ready.length) return;
    setBusy(true); setError(""); setReport(null);
    try {
      // New journals first, exactly as mapped; nothing else about existing journals changes.
      const ids: Record<string, string> = {};
      for (const [name, target] of Object.entries(mapping)) {
        if (target.startsWith(NEW)) { const made = await j.saveJournal({ ...blankJournal(j.state.journals.length), name: target.slice(NEW.length).slice(0, 80) || "Imported journal" }); if (!made) throw Error("The new journal couldn’t be made."); ids[name] = made.id; }
        else ids[name] = target || fallback?.id || "";
      }
      // A journal made for the first run is the one the rest go into.
      setMapping(ids);
      const list = first ? spread(prep.ready, first) : prep.ready;
      if (Object.values(ids).some((v) => !v)) throw Error("Choose a journal for every group of entries.");
      const batch = await startBatch(j.client, j.userId, prep.parsed.source, prep.parsed.label, prep.parsed.entries.length);
      stop.current = new AbortController();
      setProgress({ done: 0, total: list.length });
      const r = await runImport(list, importer(j.client, batch.id, prep.parsed.source, (e) => ids[e.journalName]), { signal: stop.current.signal, onProgress: (done, total) => setProgress({ done, total }) });
      await finishBatch(j.client, j.userId, batch.id, r, { skipped_before: prep.duplicates, already_in_muse: prep.known, problems: prep.problems.slice(0, 300), unavailable: prep.parsed.unavailable });
      setReport(r); setSample(Boolean(first)); if (!first) setPrep(null);
      await Promise.all([j.refresh(), loadBatches()]);
    } catch (e) { setError(e instanceof Error ? e.message : "The import stopped. Anything already imported is kept; importing again skips it."); }
    finally { setBusy(false); setProgress(null); stop.current = null; }
  }

  const preview = useMemo(() => (prep ? previewOf(prep.parsed, prep.ready) : null), [prep]);
  return <div className="mj-form mj-import">
    <div className="mj-row-between"><h3 className="mj-section-title">Import journal history</h3><button type="button" className="mj-link" onClick={onBack} disabled={Boolean(progress)}>Back</button></div>

    {!prep && !progress && !report && <>
      <p className="mj-note">Bring earlier journal conversations into Muse with their original dates, words and order. They become ordinary entries: in History and search, with tags, highlights and Continue from here, and your companion can recall them when they’re relevant. Nothing is rewritten, and no AI runs during an import.</p>
      <label className="muse-button button-primary mj-file-pick">{busy ? "Reading…" : "Choose files…"}<input type="file" accept={ACCEPT} multiple disabled={busy} onChange={(e) => { void choose(e.target.files); e.target.value = ""; }} /></label>
      <p className="mj-note">A Rosebud export (the .md file) or a Muse Journal export (JSON). Files are read on this device first; you’ll see what was found before anything is saved.</p>
    </>}
    {error && <p className="mj-error" role="alert">{error}</p>}

    {prep && preview && !progress && !report && <section className="mj-import-preview" aria-label="What was found">
      <p className="mj-note">From <b>{sourceLabel[prep.parsed.source]}</b> · {prep.parsed.label}</p>
      <dl className="mj-usage">
        <div><dt>Ready to import</dt><dd className="type-numeric">{prep.ready.length}</dd></div>
        <div><dt>Entries found</dt><dd className="type-numeric">{preview.total + prep.parsed.problems.length}</dd></div>
        <div><dt>Already imported</dt><dd className="type-numeric">{prep.duplicates}</dd></div>
        {prep.known > 0 && <div><dt>Already in Muse</dt><dd className="type-numeric">{prep.known}</dd></div>}
        <div><dt>Can’t import</dt><dd className="type-numeric">{prep.problems.length}</dd></div>
        {preview.first && <div><dt>Dates</dt><dd>{formatShort(preview.first)}{preview.last !== preview.first ? ` – ${formatShort(preview.last!)}` : ""}</dd></div>}
        <div><dt>Your messages · replies</dt><dd className="type-numeric">{preview.messages.user} · {preview.messages.assistant}</dd></div>
      </dl>
      <h4 className="type-meta">What each entry keeps</h4>
      <ul className="mj-import-fields">{preview.fields.map((f) => <li key={f.key}><span>{f.label}</span><span className="type-meta">{f.note && !f.count ? f.note : `${f.count} of ${f.total}`}</span></li>)}</ul>
      {preview.needsAnalysis > 0 && <p className="mj-note">{preview.needsAnalysis} {preview.needsAnalysis === 1 ? "entry has" : "entries have"} no summary or analysis of {preview.needsAnalysis === 1 ? "its" : "their"} own. They’re fully searchable as they are; you can optionally have Muse analyse them later (it costs AI budget, and you’ll see an estimate first).</p>}
      {Object.keys(mapping).length > 0 && <><h4 className="type-meta">Where they go</h4>
        <ul className="mj-import-fields">{Object.keys(mapping).map((name) => { const target = mapping[name]; const count = prep.ready.filter((e) => e.journalName === name).length;
          return <li key={name}><span>{name || "Entries without a journal name"} <span className="type-meta">({count})</span></span>
            <MuseChoiceMenu label="Journal" valueLabel={target.startsWith(NEW) ? `New journal “${target.slice(NEW.length)}”` : journals.find((x) => x.id === target)?.name ?? "Choose"} selectedIds={[target]}
              options={[...journals.map((x) => ({ id: x.id, label: x.name })), ...(name ? [{ id: `${NEW}${name}`, label: `New journal “${name}”` }] : [])]} onSelect={(id) => setMapping({ ...mapping, [name]: id })} /></li>; })}</ul></>}
      {prep.parsed.notImported?.length ? <p className="mj-note">Also in this file, but not journal entries, so not imported: {prep.parsed.notImported.join(", ")}.</p> : null}
      {prep.problems.length > 0 && <details className="mj-mem-how"><summary>{prep.problems.length} {prep.problems.length === 1 ? "entry" : "entries"} can’t be imported</summary>
        <ul>{prep.problems.slice(0, 60).map((p, i) => <li key={i}>Entry {p.index + 1}{p.date && /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? ` · ${formatShort(p.date)}` : ""}: {p.reason}</li>)}</ul></details>}
      <div className="mj-form-actions"><button type="button" className="muse-button" onClick={() => setPrep(null)}>Cancel</button>
        {prep.ready.length > 20 && <button type="button" className="muse-button" disabled={busy} onClick={() => void start(10)}>Import 10 first</button>}
        <button type="button" className="muse-button button-primary" disabled={busy || !prep.ready.length} onClick={() => void start()}>{prep.ready.length ? `Import ${prep.ready.length} ${prep.ready.length === 1 ? "entry" : "entries"}` : "Nothing new to import"}</button></div>
    </section>}

    {progress && <div className="mj-budget" role="status">
      <div className="mj-row-between"><b>Importing {progress.done} of {progress.total}</b><button type="button" className="mj-link" onClick={() => stop.current?.abort()}>Stop</button></div>
      <div className="mj-budget-bar" role="meter" aria-label="Import progress" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}><span style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} /></div>
      <p className="mj-note">Each entry saves on its own. If this stops, everything already imported is kept, and importing the same file again skips it.</p>
    </div>}

    {report && <section aria-label="Import report" className="mj-import-preview">
      <p className="mj-note" role="status"><b>{report.stopped ? "Import stopped." : "Import finished."}</b> {report.imported} imported{report.duplicates ? ` · ${report.duplicates} already there` : ""}{report.deleted ? ` · ${report.deleted} you’d deleted (not brought back)` : ""}{report.failed ? ` · ${report.failed} couldn’t be saved` : ""}.</p>
      {report.failed > 0 && <details className="mj-mem-how" open><summary>What couldn’t be saved</summary><ul>{report.outcomes.filter((o) => o.status === "failed").slice(0, 60).map((o) => <li key={o.index}>Entry {o.index + 1} · {formatShort(o.date)}: {o.reason}</li>)}</ul></details>}
      {sample && prep && <p className="mj-note">These {report.imported} are spread across your dates. Look them over in History; when they look right, import the rest. The ones already in won’t be added twice.</p>}
      <div className="mj-form-actions">{sample && prep ? <button type="button" className="muse-button button-primary" disabled={busy} onClick={() => void start()}>Import the other {Math.max(0, prep.ready.length - report.imported)}</button> : <button type="button" className="muse-button" onClick={() => { setReport(null); setPrep(null); }}>Import more</button>}<Link className="muse-button" href="/journal?view=history">Open History</Link></div>
    </section>}

    {!prep && !progress && <EnrichHistory />}
    {!prep && !progress && batches.length > 0 && <PastImports batches={batches} onChange={async () => { await Promise.all([j.refresh(), loadBatches()]); }} />}
  </div>;
}

const statusLabel: Record<string, string> = { importing: "Didn’t finish", complete: "Complete", partial: "Partly imported", failed: "Failed", undone: "Removed" };
function PastImports({ batches, onChange }: { batches: Batch[]; onChange: () => Promise<void> }) {
  const j = useJournal();
  const [confirm, setConfirm] = useState(""), [error, setError] = useState("");
  return <section aria-labelledby="mj-import-past"><h4 id="mj-import-past" className="type-meta">Earlier imports</h4>
    <ul className="mj-import-fields">{batches.map((b) => <li key={b.id}>
      <span>{formatShort(b.created_at.slice(0, 10))} · {sourceLabel[b.source as "rosebud"] ?? b.source} <span className="type-meta">· {statusLabel[b.status] ?? b.status}{b.status === "undone" ? ` · its ${b.imported} ${b.imported === 1 ? "entry was" : "entries were"} removed` : ` · ${b.imported} imported${b.duplicates ? `, ${b.duplicates} skipped` : ""}${b.failed ? `, ${b.failed} failed` : ""}`}</span></span>
      {b.status !== "undone" && b.imported > 0 && (confirm === b.id
        ? <span className="mj-mem-confirm">Remove the {b.imported} entries from this import (and anything you added to them)? Entries written in Muse are never touched. <button type="button" className="mj-link" onClick={async () => { setError(""); try { await undoBatch(j.client, b.id); setConfirm(""); await onChange(); } catch (e) { setError(e instanceof Error ? e.message : "Not removed."); } }}>Remove</button><button type="button" className="mj-link" onClick={() => setConfirm("")}>Keep</button></span>
        : <button type="button" className="mj-link" onClick={() => setConfirm(b.id)}>Remove this import</button>)}
    </li>)}</ul>
    {error && <p className="mj-error" role="alert">{error}</p>}
  </section>;
}

type Candidate = { conversation_id: string; local_date: string; chars: number; analysed: boolean };
const stopCodes = new Set(["limit-daily", "limit-monthly", "not-entitled", "not-configured", "signed-out", "offline"]);
const sleep = (ms: number, signal: AbortSignal) => new Promise<void>((done) => { const t = setTimeout(done, ms); signal.addEventListener("abort", () => { clearTimeout(t); done(); }, { once: true }); });

/**
 * Optional historical enrichment: Muse's own analysis for imported entries that have none. Never automatic: it shows
 * how many entries and an estimate (typical, and the most the spending guard would reserve) against what's left of the
 * budget, and runs only the batch you choose after you confirm. One request at a time, paced under the per-minute
 * limit; it stops at any budget limit; already-analysed entries are skipped, so it can be resumed any time.
 */
function EnrichHistory() {
  const j = useJournal();
  const [list, setList] = useState<Candidate[] | null>(null), [size, setSize] = useState<"10" | "25" | "all">("10");
  const [agree, setAgree] = useState(false), [run, setRun] = useState<{ done: number; total: number; failed: number; note: string; running: boolean } | null>(null);
  const stop = useRef<AbortController | null>(null);
  const fetchList = useCallback(async () => { try { return ((await enrichmentCandidates(j.client)) as Candidate[]).filter((c) => !c.analysed); } catch { return []; } }, [j.client]);
  useEffect(() => { let live = true; void fetchList().then((l) => { if (live) setList(l); }); return () => { live = false; }; }, [fetchList]);
  if (!list?.length && !run) return null;
  const chosen = (list ?? []).slice(0, size === "all" ? undefined : Number(size));
  const est = enrichmentEstimate(chosen, j.ai.model ?? "");
  const a = j.ai.allowance, left = a ? Math.max(0, a.monthlyLimit - a.spentMonth - a.reserved) : 0, today = a ? Math.max(0, a.dailyLimit - a.spentToday) : 0;
  async function go() {
    const ctl = new AbortController(); stop.current = ctl;
    let done = 0, failed = 0, note = "";
    setRun({ done, total: chosen.length, failed, note, running: true });
    for (const c of chosen) {
      if (ctl.signal.aborted) { note = "Stopped. Everything analysed so far is kept."; break; }
      try { await aiAction({ action: "analysis", conversationId: c.conversation_id }); done++; }
      catch (e) {
        const code = e instanceof AiError ? e.code : "failed";
        if (code === "too-fast") { await sleep(65000, ctl.signal); try { await aiAction({ action: "analysis", conversationId: c.conversation_id }); done++; } catch { failed++; } }
        else if (stopCodes.has(code)) { note = e instanceof Error ? e.message : "Stopped."; break; }
        else failed++;
      }
      setRun({ done, total: chosen.length, failed, note, running: true });
      await sleep(8000, ctl.signal); // under the 8-a-minute guard
    }
    setRun({ done, total: chosen.length, failed, note: note || "Done.", running: false }); setAgree(false); stop.current = null;
    const [, , fresh] = await Promise.all([j.refresh(), j.refreshAi(), fetchList()]); setList(fresh);
  }
  return <section className="mj-budget" aria-labelledby="mj-enrich">
    <h4 id="mj-enrich" className="type-meta">Optional: analyse imported entries</h4>
    {run ? <>
      <div className="mj-row-between" role="status"><b>{run.done} of {run.total} analysed{run.failed ? ` · ${run.failed} didn’t work` : ""}</b>{run.running && <button type="button" className="mj-link" onClick={() => stop.current?.abort()}>Stop</button>}</div>
      {run.note && <p className="mj-note">{run.note}</p>}
      {!run.running && <div className="mj-form-actions"><button type="button" className="muse-button" onClick={() => setRun(null)}>OK</button></div>}
    </> : !j.ai.enabled ? <p className="mj-note">{list!.length} imported {list!.length === 1 ? "entry has" : "entries have"} no Muse analysis. AI is off for your account, so this isn’t available; imported entries are fully searchable without it.</p> : <>
      <p className="mj-note">{list!.length} imported {list!.length === 1 ? "entry has" : "entries have"} no Muse analysis yet. Analysis adds a title (if it has none), a recap, people, topics and moods as tags, and memory suggestions you approve or dismiss. The original conversation and anything the source wrote are never changed. Newest entries go first.</p>
      <MuseSegmented label="How many" value={size} onChange={(v) => { setSize(v); setAgree(false); }} options={[{ id: "10", label: "Next 10" }, { id: "25", label: "Next 25" }, { id: "all", label: `All ${list!.length}` }]} />
      <dl className="mj-usage">
        <div><dt>Requests</dt><dd className="type-numeric">{est.count}</dd></div>
        <div><dt>Likely cost</dt><dd>about {formatUsd(est.typical)}</dd></div>
        <div><dt>At most</dt><dd>{formatUsd(est.reserved)}</dd></div>
        {a && <div><dt>Left this month · today</dt><dd>{formatUsd(left)} · {formatUsd(today)}</dd></div>}
      </dl>
      {a && est.reserved > today && <p className="mj-note">That’s more than today’s {formatUsd(a.dailyLimit)} guard allows, so it will pause when the guard is reached. Run the rest another day.</p>}
      {!est.knownPrice && <p className="mj-note">Muse doesn’t have a price for this model, so the estimate is deliberately high.</p>}
      <label className="mj-toggle muse-check-row"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I understand this makes {est.count} paid AI {est.count === 1 ? "request" : "requests"} (likely about {formatUsd(est.typical)}), counted in my Journal AI budget.</label>
      <div className="mj-form-actions"><button type="button" className="muse-button button-primary" disabled={!agree || !est.count} onClick={() => void go()}>Analyse {est.count} {est.count === 1 ? "entry" : "entries"}</button></div>
    </>}
  </section>;
}
