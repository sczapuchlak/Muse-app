"use client";
import { useEffect, useMemo, useState } from "react";
import { MuseChoiceMenu } from "@/components/MuseChoiceMenu";
import { MuseIcon } from "@/components/MuseIcon";
import { SaveIndicator } from "@/components/SaveIndicator";
import { categories, categoryInfo } from "@/lib/inner-compass/categories";
import { hasWords, lineFrom, move, sameContent, suggestedHeadings, type Block, type ManifestoVersion } from "@/lib/inner-compass/manifesto";
import type { Compass } from "./useInnerCompass";
import { ink, shortDate } from "./parts";

const uid = () => crypto.randomUUID();

/**
 * The Personal Manifesto: a beautifully set, living declaration the person writes. Muse offers their own discoveries
 * as starting lines and never writes a word for them. Edits autosave; "Keep this version" stores a dated copy.
 */
export function Manifesto({ compass }: { compass: Compass }) {
  const m = compass.manifesto, [editing, setEditing] = useState(false), [viewing, setViewing] = useState<ManifestoVersion | null>(null);
  const started = m.revision > 0 && hasWords(m.blocks);
  if (editing) return <ManifestoEditor compass={compass} onDone={() => setEditing(false)} />;
  const lines = m.blocks.filter((b) => b.kind === "line" && b.text.trim());
  const fromDiscoveries = lines.filter((b) => b.kind === "line" && b.ref).length;
  return <div className="muse-compass-mani">
    <section className="muse-compass-mani-hero" aria-labelledby="compass-manifesto-title">
      <div className="muse-compass-mani-hero-copy">
        <p className="muse-kicker"><MuseIcon name="sparkle" size={13} /> Personal Manifesto</p>
        <h2 id="compass-manifesto-title">{started ? m.title : "A living declaration"}</h2>
        <p className="muse-compass-mani-lede">{started ? "Your principles and your character, in your own words, set like a page worth keeping. Revise it whenever you change." : "The values you choose, the person you’re becoming, what you believe and how you mean to live. Optional, and entirely yours: begin from your own discoveries or a blank page."}</p>
        {started && <dl className="muse-compass-evo-stats">
          <div><dt>Lines</dt><dd className="type-numeric">{lines.length}</dd></div>
          <div><dt>From my discoveries</dt><dd className="type-numeric">{fromDiscoveries}</dd></div>
          <div><dt>Kept versions</dt><dd className="type-numeric">{compass.manifestoVersions.length}</dd></div>
        </dl>}
        <div className="muse-compass-hero-actions">
          <button type="button" className="muse-button button-primary" onClick={() => setEditing(true)}><MuseIcon name="edit" size={15} /> {started ? "Edit" : "Begin my manifesto"}</button>
          {started && <button type="button" className="muse-button" onClick={() => window.print()}><MuseIcon name="bookmark" size={15} /> Print or save as PDF</button>}
          {started && m.updatedAt && <span className="muse-compass-quiet">Revised {shortDate(m.updatedAt)}</span>}
        </div>
      </div>
      <PagesArt lines={started ? lines.slice(0, 4).map((l) => l.text) : []} title={started ? m.title : "My Manifesto"} />
    </section>

    {started || viewing ? <div className="muse-compass-mani-body" data-versions={compass.manifestoVersions.length > 0 || undefined}>
      <section className="muse-compass-manifesto-view" aria-label={viewing ? "A kept version" : "Your manifesto"}>
        {viewing && <p className="muse-compass-version-note" role="status">A kept version from {shortDate(viewing.savedAt)}{viewing.note ? `: “${viewing.note}”` : ""}. <button type="button" className="text-button" onClick={() => setViewing(null)}>Back to today’s</button></p>}
        <Sheet title={viewing ? viewing.title : m.title} blocks={viewing ? viewing.blocks : m.blocks} compass={compass} />
      </section>
      {compass.manifestoVersions.length > 0 && <Versions compass={compass} viewing={viewing} onView={setViewing} />}
    </div> : compass.manifestoVersions.length > 0 && <Versions compass={compass} viewing={viewing} onView={setViewing} />}
  </div>;
}

/** Two framed pages, tilted like loose leaves: the front one carries the first real lines (or quiet rules before there are any). */
function PagesArt({ lines, title }: { lines: string[]; title: string }) {
  return <div className="muse-compass-mani-pages" aria-hidden="true">
    <div className="muse-compass-mini-sheet" data-i="0"><span className="muse-compass-mini-rules" /></div>
    <div className="muse-compass-mini-sheet" data-i="1">
      <svg viewBox="0 0 40 40" width="16" height="16" className="muse-compass-sheet-star"><path d="M20 0C21.7 15.8 24.2 18.3 40 20C24.2 21.7 21.7 24.2 20 40C18.3 24.2 15.8 21.7 0 20C15.8 18.3 18.3 15.8 20 0Z" /></svg>
      <b>{title}</b>
      {lines.length ? lines.map((l, i) => <span key={i} className="muse-compass-mini-line">{l}</span>) : <span className="muse-compass-mini-rules" />}
    </div>
  </div>;
}

/** The typeset page. Lines that came from a discovery quietly say so (and whether it has changed since). */
function Sheet({ title, blocks, compass, sample = false }: { title: string; blocks: Block[]; compass: Compass; sample?: boolean }) {
  const sections = useMemo(() => {
    const out: { heading?: Block; lines: Block[] }[] = [];
    for (const b of blocks.filter((x) => x.text.trim())) { if (b.kind === "heading") out.push({ heading: b, lines: [] }); else { if (!out.length) out.push({ lines: [] }); out[out.length - 1].lines.push(b); } }
    return out;
  }, [blocks]);
  return <article className="muse-compass-sheet" data-sample={sample || undefined}>
    <span className="muse-compass-sheet-corner" data-c="tl" aria-hidden="true" /><span className="muse-compass-sheet-corner" data-c="tr" aria-hidden="true" /><span className="muse-compass-sheet-corner" data-c="bl" aria-hidden="true" /><span className="muse-compass-sheet-corner" data-c="br" aria-hidden="true" />
    <header><svg viewBox="0 0 40 40" width="28" height="28" aria-hidden="true" className="muse-compass-sheet-star"><path d="M20 0C21.7 15.8 24.2 18.3 40 20C24.2 21.7 21.7 24.2 20 40C18.3 24.2 15.8 21.7 0 20C15.8 18.3 18.3 15.8 20 0Z" /></svg><h2>{title}</h2></header>
    {sections.map((s, i) => <section key={s.heading?.id ?? `s${i}`}>
      {s.heading && <h3><span>{s.heading.text}</span></h3>}
      {s.lines.map((l) => { const live = l.kind === "line" && l.ref ? compass.discoveries.find((d) => d.id === l.ref!.id) : undefined;
        return <p key={l.id} className="muse-compass-sheet-line">{l.text}{!sample && l.kind === "line" && l.ref && <span className="muse-compass-sheet-src" style={ink(l.ref.category)} title={live ? (live.title !== l.ref.label ? `From ${categoryInfo[l.ref.category].title}; now “${live.title}”` : `From ${categoryInfo[l.ref.category].title}`) : "The discovery is no longer there"} aria-hidden="true" data-missing={!live || undefined} />}</p>; })}
    </section>)}
  </article>;
}

function Versions({ compass, viewing, onView }: { compass: Compass; viewing: ManifestoVersion | null; onView: (v: ManifestoVersion | null) => void }) {
  const [restoring, setRestoring] = useState<string | null>(null);
  return <section className="muse-compass-versions" aria-labelledby="compass-versions-title">
    <h3 id="compass-versions-title" className="muse-compass-subhead">Kept versions</h3>
    <p className="muse-compass-quiet">Dated copies you chose to keep. Read one, bring it back, or let it go.</p>
    <ol>{compass.manifestoVersions.map((v) => <li key={v.id} aria-current={viewing?.id === v.id || undefined}>
      <span className="type-numeric">{shortDate(v.savedAt)}</span><span className="muse-compass-version-label">{v.note || v.title}</span>
      {restoring === v.id
        ? <span className="muse-compass-quiet">Make this today’s version? Today’s words stay in history only if you’ve kept them. <button type="button" className="text-button" onClick={() => setRestoring(null)}>Cancel</button> <button type="button" className="text-button" onClick={async () => { if (await compass.saveManifesto({ title: v.title, blocks: v.blocks })) { setRestoring(null); onView(null); } }}>Restore</button></span>
        : <span className="muse-compass-version-tools"><button type="button" className="text-button" onClick={() => onView(viewing?.id === v.id ? null : v)}>{viewing?.id === v.id ? "Close" : "Read"}</button><button type="button" className="text-button" onClick={() => setRestoring(v.id)}>Restore…</button><button type="button" className="text-button muse-compass-danger-text" aria-label={`Delete the version from ${shortDate(v.savedAt)}`} onClick={() => void compass.removeManifestoVersion(v.id)}>Delete</button></span>}
    </li>)}</ol>
  </section>;
}

function ManifestoEditor({ compass, onDone }: { compass: Compass; onDone: () => void }) {
  const [title, setTitle] = useState(compass.manifesto.title), [blocks, setBlocks] = useState<Block[]>(compass.manifesto.blocks);
  const [note, setNote] = useState(""), [kept, setKept] = useState(false);
  const saved = sameContent({ title, blocks }, compass.manifesto);
  // Nothing is created until there are words; after that, edits autosave a moment after typing stops.
  const dirty = !saved && (compass.manifesto.revision > 0 || hasWords(blocks));
  useEffect(() => {
    if (!dirty) return;
    const t = window.setTimeout(() => void compass.saveManifesto({ title, blocks }), 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, blocks, dirty]);
  const put = (id: string, text: string) => setBlocks((list) => list.map((b) => b.id === id ? { ...b, text } : b));
  const usedRefs = new Set(blocks.flatMap((b) => b.kind === "line" && b.ref ? [b.ref.id] : []));
  const pool = categories.flatMap((c) => compass.discoveries.filter((d) => d.category === c && !d.archivedAt && !usedRefs.has(d.id)));
  const headings = suggestedHeadings.filter((h) => !blocks.some((b) => b.kind === "heading" && b.text === h));
  async function finish() { if (dirty) await compass.saveManifesto({ title, blocks }); onDone(); }

  return <section className="muse-compass-manifesto-edit" aria-label="Edit your manifesto">
    <div className="muse-compass-manifesto-bar">
      <SaveIndicator label="Manifesto" loaded pending={dirty} saving={compass.status.saving} error={compass.status.error} />
      <div className="muse-compass-hero-actions">
        <form className="muse-compass-keep-version" onSubmit={async (e) => { e.preventDefault(); if (!saved) await compass.saveManifesto({ title, blocks }); if (await compass.keepVersion(note)) { setNote(""); setKept(true); window.setTimeout(() => setKept(false), 2400); } }}>
          <label className="sr-only" htmlFor="compass-version-note">A note for this version</label>
          <input id="compass-version-note" maxLength={300} value={note} placeholder="A note for this version (optional)" onChange={(e) => setNote(e.target.value)} />
          <button type="submit" className="muse-button" disabled={!hasWords(blocks) || compass.status.saving}>{kept ? "Kept ✓" : "Keep this version"}</button>
        </form>
        <button type="button" className="muse-button button-primary" onClick={() => void finish()}>Done</button>
      </div>
    </div>
    <div className="muse-compass-manifesto-desk">
      <label className="muse-compass-manifesto-title"><span className="sr-only">Title</span><input maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      {blocks.length === 0 && <p className="muse-compass-quiet">Start with a heading, a line of your own, or one of your discoveries. You can rearrange everything later.</p>}
      <ol className="muse-compass-blocks">{blocks.map((b, i) => <li key={b.id} data-kind={b.kind} style={b.kind === "line" && b.ref ? ink(b.ref.category) : undefined}>
        {b.kind === "heading"
          ? <input className="muse-compass-block-heading" aria-label="Section heading" maxLength={120} value={b.text} onChange={(e) => put(b.id, e.target.value)} placeholder="Section heading" />
          : <div className="muse-compass-block-line">
              <textarea aria-label="Manifesto line" rows={2} maxLength={1200} value={b.text} onChange={(e) => put(b.id, e.target.value)} placeholder="I…" />
              {b.ref && <RefNote ref_={b.ref} compass={compass} />}
            </div>}
        <span className="muse-compass-block-tools">
          <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => setBlocks((l) => move(l, b.id, -1))}>↑</button>
          <button type="button" aria-label="Move down" disabled={i === blocks.length - 1} onClick={() => setBlocks((l) => move(l, b.id, 1))}>↓</button>
          <button type="button" aria-label={b.kind === "heading" ? "Remove heading" : "Remove line"} onClick={() => setBlocks((l) => l.filter((x) => x.id !== b.id))}>×</button>
        </span>
      </li>)}</ol>
      <div className="muse-compass-manifesto-add">
        <button type="button" className="muse-button" onClick={() => setBlocks((l) => [...l, { id: uid(), kind: "line", text: "" }])}><MuseIcon name="plus" size={14} /> A line of my own</button>
        {pool.length > 0 && <MuseChoiceMenu label="Add from my discoveries" valueLabel="＋ From my discoveries" variant="chip" icon="sparkle" searchable selectedIds={[]}
          options={pool.map((d) => ({ id: d.id, label: `${categoryInfo[d.category].title.replace("My ", "")} · ${d.title}` }))}
          onSelect={(id) => { const d = compass.discoveries.find((x) => x.id === id); if (d) setBlocks((l) => [...l, lineFrom(d, uid())]); }} />}
        <MuseChoiceMenu label="Add a heading" valueLabel="＋ Heading" variant="chip" icon="notes" selectedIds={[]} options={[...headings.map((h) => ({ id: h, label: h })), { id: "__blank", label: "A heading of my own" }]}
          onSelect={(id) => setBlocks((l) => [...l, { id: uid(), kind: "heading", text: id === "__blank" ? "" : id }])} />
      </div>
    </div>
  </section>;
}
function RefNote({ ref_, compass }: { ref_: NonNullable<Extract<Block, { kind: "line" }>["ref"]>; compass: Compass }) {
  const live = compass.discoveries.find((d) => d.id === ref_.id);
  return <small className="muse-compass-block-ref">From {categoryInfo[ref_.category].title}: “{ref_.label}”{!live ? " · no longer there" : live.title !== ref_.label ? ` · now “${live.title}”` : ""}</small>;
}
