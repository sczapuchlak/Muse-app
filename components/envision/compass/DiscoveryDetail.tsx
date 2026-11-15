"use client";
import { useMemo, useState } from "react";
import { MuseModal } from "@/components/MuseModal";
import { MuseChoiceMenu } from "@/components/MuseChoiceMenu";
import { MuseIcon } from "@/components/MuseIcon";
import { categoryInfo } from "@/lib/inner-compass/categories";
import { relatedIds, wordsChanged, LIMITS, type Discovery, type Reflection } from "@/lib/inner-compass/model";
import type { Compass } from "./useInnerCompass";
import { AreaPicker, CategoryMark, DiscoveryFields, EvolvedRing, Heart, ink, plural, shortDate, stanceLabel } from "./parts";
import { ReflectionComposer, ReflectionList } from "./Reflections";

type Mode = "view" | "edit" | "evolve" | "delete";

/**
 * One discovery, read like a page: the statement, its meaning, the fields the person filled in, how it connects, the
 * reflections written about it and its evolution. Editing is ordinary and leaves no trace; "Record evolution" is the
 * separate, explicit way to keep the earlier words. Neither version is ever framed as the better one.
 */
export function DiscoveryDetail({ d, compass, today, onClose, onOpen, returnFocus }: { d: Discovery; compass: Compass; today: string; onClose: () => void; onOpen: (id: string) => void; returnFocus: HTMLElement | null }) {
  const [mode, setMode] = useState<Mode>("view"), [reflecting, setReflecting] = useState(false);
  const info = categoryInfo[d.category], stance = stanceLabel(d);
  const history = useMemo(() => compass.versions.filter((v) => v.discoveryId === d.id).sort((a, b) => b.evolvedOn.localeCompare(a.evolvedOn) || b.createdAt.localeCompare(a.createdAt)), [compass.versions, d.id]);
  const related = relatedIds(compass.links, d.id).map((id) => compass.discoveries.find((x) => x.id === id)).filter((x): x is Discovery => !!x);
  const areaIds = compass.areasOf(d.id), areas = compass.areas.filter((a) => areaIds.includes(a.id));
  const reflections = compass.reflections.filter((r) => r.discoveryId === d.id);
  const connectable = compass.discoveries.filter((x) => x.id !== d.id && !x.archivedAt && !related.some((r) => r.id === x.id));
  const filled = info.fields.filter((f) => d.details[f.key]);

  return <MuseModal id="muse-compass-detail" label={d.title} returnFocus={returnFocus} onClose={onClose} size="tall">
    <div className="muse-compass-detail" style={ink(d.category)} data-mode={mode}>
      {mode === "edit" && <EditForm d={d} compass={compass} onDone={() => setMode("view")} onEvolve={() => setMode("evolve")} />}
      {mode === "evolve" && <EvolveForm d={d} compass={compass} today={today} onDone={() => setMode("view")} />}
      {(mode === "view" || mode === "delete") && <>
        <header className="muse-compass-detail-hero">
          <p className="muse-kicker"><CategoryMark category={d.category} /> {info.title}{stance ? ` · ${stance}` : ""}</p>
          <h2 className="muse-compass-detail-title" data-quote={d.details.kind === "quote" || undefined}>{d.details.kind === "quote" ? <q>{d.title}</q> : d.title}</h2>
          {d.details.attribution && <p className="muse-compass-detail-credit">— {d.details.attribution}</p>}
          {d.meaning.trim() && <p className="muse-compass-detail-meaning">{d.meaning}</p>}
          <p className="muse-compass-detail-facts">
            <span>Added {shortDate(d.createdAt)}</span>
            {d.significanceDate && <span>Significant {shortDate(d.significanceDate)}</span>}
            {d.evolvedAt && <span className="muse-compass-evolved"><EvolvedRing /> {plural(history.length, "evolution")}</span>}
            {d.details.theme && <span>Theme · {d.details.theme}</span>}
            {d.archivedAt && <span>Archived {shortDate(d.archivedAt)}</span>}
          </p>
          <div className="muse-compass-detail-actions">
            <button type="button" className="muse-button" onClick={() => setMode("edit")}><MuseIcon name="edit" size={15} /> Edit</button>
            <button type="button" className="muse-button" onClick={() => setMode("evolve")}><EvolvedRing /> Record evolution</button>
            <button type="button" className="muse-button" onClick={() => setReflecting(true)}><MuseIcon name="notes" size={15} /> Reflect on this</button>
            <button type="button" className="muse-button muse-compass-fav-button" aria-pressed={d.favorite} onClick={() => void compass.save({ ...d, favorite: !d.favorite })}><Heart filled={d.favorite} /> {d.favorite ? "Significant" : "Mark significant"}</button>
          </div>
        </header>

        {filled.length > 0 && <div className="muse-compass-detail-panels">{filled.map((f) => <section key={f.key} className="muse-compass-panel"><h3>{f.label}</h3><p>{d.details[f.key]}</p></section>)}</div>}
        {d.reflection.trim() && <section className="muse-compass-panel muse-compass-longform"><h3>Reflection</h3><p>{d.reflection}</p></section>}
        {d.tags.length > 0 && <p className="muse-compass-detail-tags">{d.tags.map((t) => <span key={t} className="muse-compass-tag">#{t}</span>)}</p>}
        {d.source && <p className="muse-compass-quiet">{d.source.kind === "exploration" ? <>From the exploration <b>{d.source.label}</b>.</> : d.source.kind === "garden" ? <>Chosen in the {d.source.label}.</> : <>From {d.source.label}.</>}</p>}

        <section className="muse-compass-detail-section" aria-labelledby="compass-connections">
          <h3 id="compass-connections">Connected discoveries</h3>
          {related.length > 0 ? <ul className="muse-compass-refs">{related.map((r) => <li key={r.id} style={ink(r.category)}>
            <button type="button" className="muse-compass-ref" onClick={() => onOpen(r.id)}><CategoryMark category={r.category} /> {r.title}</button>
            <button type="button" className="muse-compass-x" aria-label={`Disconnect ${r.title}`} onClick={() => void compass.disconnect(d.id, r.id)}>×</button>
          </li>)}</ul> : <p className="muse-compass-quiet">Connect this to a value, a belief or an experience that belongs with it. Only you make connections.</p>}
          {connectable.length > 0 && <MuseChoiceMenu label="Connect a discovery" valueLabel="＋ Connect" variant="chip" icon="link" searchable selectedIds={[]}
            options={connectable.map((x) => ({ id: x.id, label: `${categoryInfo[x.category].title.replace("My ", "")} · ${x.title}` }))} onSelect={(id) => void compass.connect(d.id, id)} />}
        </section>

        <section className="muse-compass-detail-section" aria-labelledby="compass-areas">
          <h3 id="compass-areas">Life Atlas areas</h3>
          <AreaPicker legend={false} areas={compass.areas} value={areaIds} onChange={(ids) => void compass.setDiscoveryAreas(d.id, ids)} />
          {areas.length === 0 && compass.areas.length > 0 && <p className="muse-compass-quiet">An association is only a link, never a rating.</p>}
        </section>

        <section className="muse-compass-detail-section" aria-labelledby="compass-reflections">
          <h3 id="compass-reflections">Reflections</h3>
          {reflecting && <ReflectionComposer compass={compass} today={today} about={{ discoveryId: d.id, discoveryTitle: d.title }} onDone={() => setReflecting(false)} />}
          <ReflectionList compass={compass} today={today} items={reflections} />
          {!reflecting && !reflections.length && <p className="muse-compass-quiet">Nothing written yet. <button type="button" className="text-button" onClick={() => setReflecting(true)}>Reflect on this</button></p>}
        </section>

        {history.length > 0 && <section className="muse-compass-detail-section" aria-labelledby="compass-history">
          <h3 id="compass-history">How this has evolved</h3>
          <ol className="muse-compass-history">
            <li data-now><span className="muse-compass-history-date">Now</span><p className="muse-compass-history-words">{d.title}</p></li>
            {history.map((v) => <li key={v.id}>
              <span className="muse-compass-history-date type-numeric">{shortDate(v.evolvedOn)}</span>
              <p className="muse-compass-history-label">Before</p>
              <p className="muse-compass-history-words" data-earlier>{v.title}</p>
              {v.meaning.trim() && <p className="muse-compass-history-meaning">{v.meaning}</p>}
              {v.reason && <p className="muse-compass-history-reason"><span>What changed</span> {v.reason}</p>}
              {v.reflection && <p className="muse-compass-history-reason"><span>Reflection</span> {v.reflection}</p>}
              <VersionRemove onRemove={() => void compass.removeVersion(v.id)} />
            </li>)}
            <li data-origin><span className="muse-compass-history-date type-numeric">{shortDate(d.createdAt)}</span><p className="muse-compass-history-label">First written down</p></li>
          </ol>
        </section>}

        <footer className="muse-compass-detail-foot">
          {mode === "delete"
            ? <div className="muse-compass-confirm" role="alertdialog" aria-label="Delete this discovery?">
                <p><b>Delete “{d.title}”?</b> Its evolution history and connections go with it. Reflections keep their words. Archiving keeps everything instead.</p>
                <div><button type="button" className="muse-button" onClick={() => setMode("view")}>Keep it</button>
                  <button type="button" className="muse-button muse-compass-danger" onClick={async () => { if (await compass.remove(d)) onClose(); }}>Delete forever</button></div>
              </div>
            : <>
                <button type="button" className="text-button" onClick={() => void compass.save({ ...d, archivedAt: d.archivedAt ? null : new Date().toISOString() })}><MuseIcon name="archive" size={14} /> {d.archivedAt ? "Restore to my collection" : "Archive (keeps its history)"}</button>
                <button type="button" className="text-button muse-compass-danger-text" onClick={() => setMode("delete")}><MuseIcon name="trash" size={14} /> Delete…</button>
              </>}
        </footer>
      </>}
    </div>
  </MuseModal>;
}

function VersionRemove({ onRemove }: { onRemove: () => void }) {
  const [asking, setAsking] = useState(false);
  return asking
    ? <p className="muse-compass-history-remove">Remove this earlier version from the history? <button type="button" className="text-button" onClick={() => setAsking(false)}>Keep</button> <button type="button" className="text-button muse-compass-danger-text" onClick={onRemove}>Remove</button></p>
    : <button type="button" className="text-button muse-compass-history-remove" onClick={() => setAsking(true)}>Remove from history…</button>;
}

/** An ordinary edit: spelling, clarity, details. Nothing is versioned, and the hint offers evolution instead. */
function EditForm({ d, compass, onDone, onEvolve }: { d: Discovery; compass: Compass; onDone: () => void; onEvolve: () => void }) {
  const [draft, setDraft] = useState(d), [areaIds, setAreaIds] = useState(compass.areasOf(d.id));
  const changed = wordsChanged(d, draft);
  async function save() {
    if (!draft.title.trim()) return;
    const saved = await compass.save({ ...draft, title: draft.title.trim() });
    if (!saved) return;
    const before = compass.areasOf(d.id);
    if (before.length !== areaIds.length || before.some((x) => !areaIds.includes(x))) await compass.setDiscoveryAreas(d.id, areaIds);
    onDone();
  }
  return <form className="muse-compass-editor" onSubmit={(e) => { e.preventDefault(); void save(); }}>
    <p className="muse-kicker">Edit</p>
    <DiscoveryFields draft={draft} set={(p) => setDraft((x) => ({ ...x, ...p }))} areas={compass.areas} areaIds={areaIds} setAreaIds={setAreaIds} expanded />
    {changed && <p className="muse-compass-hint"><EvolvedRing /> Has your understanding changed, rather than the wording? <button type="button" className="text-button" onClick={onEvolve}>Record an evolution</button> keeps the earlier words too.</p>}
    <div className="muse-compass-form-actions"><button type="button" className="muse-button" onClick={onDone}>Cancel</button><button type="submit" className="muse-button button-primary" disabled={!draft.title.trim() || compass.status.saving}>Save</button></div>
  </form>;
}

/** Meaningful evolution: the earlier words are kept by the database, with the date and (optionally) why. */
function EvolveForm({ d, compass, today, onDone }: { d: Discovery; compass: Compass; today: string; onDone: () => void }) {
  const info = categoryInfo[d.category];
  const [title, setTitle] = useState(d.title), [meaning, setMeaning] = useState(d.meaning), [reason, setReason] = useState(""), [reflection, setReflection] = useState(""), [on, setOn] = useState(today);
  const same = title.trim() === d.title.trim() && meaning.trim() === d.meaning.trim();
  return <form className="muse-compass-editor" onSubmit={async (e) => { e.preventDefault(); if (!title.trim() || same) return; if (await compass.evolve(d, { title, meaning, details: d.details, reason, reflection, evolvedOn: on })) onDone(); }}>
    <p className="muse-kicker"><EvolvedRing /> Record an evolution</p>
    <p className="muse-compass-quiet">Your earlier words stay in this discovery’s history. Neither version is a mistake; both were true when you wrote them.</p>
    <section className="muse-compass-before"><h3>Until now</h3><p className="muse-compass-history-words" data-earlier>{d.title}</p>{d.meaning.trim() && <p className="muse-compass-history-meaning">{d.meaning}</p>}</section>
    <div className="muse-compass-fields">
      <label className="muse-compass-statement"><span>{info.statement}, now</span><textarea rows={2} required maxLength={LIMITS.title} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></label>
      <label><span>{info.meaning}, now <small className="small-label">· optional</small></span><textarea rows={3} maxLength={LIMITS.meaning} value={meaning} onChange={(e) => setMeaning(e.target.value)} /></label>
      <label><span>What changed? <small className="small-label">· optional</small></span><textarea rows={2} maxLength={2000} value={reason} placeholder="A conversation, a hard year, a book, time…" onChange={(e) => setReason(e.target.value)} /></label>
      <label><span>A reflection on the change <small className="small-label">· optional</small></span><textarea rows={3} maxLength={8000} value={reflection} onChange={(e) => setReflection(e.target.value)} /></label>
      <label className="muse-compass-date"><span>When</span><input type="date" required value={on} max={today} onChange={(e) => setOn(e.target.value || today)} /></label>
    </div>
    <div className="muse-compass-form-actions"><button type="button" className="muse-button" onClick={onDone}>Cancel</button><button type="submit" className="muse-button button-primary" disabled={!title.trim() || same || compass.status.saving}>Record evolution</button></div>
    {same && <p className="muse-compass-quiet" role="status">Change the words to record how they’ve evolved.</p>}
  </form>;
}
export type { Reflection };
