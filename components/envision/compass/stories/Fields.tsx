"use client";
import { useId, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { MuseChoiceMenu } from "@/components/MuseChoiceMenu";
import { MuseIcon } from "@/components/MuseIcon";
import { BucketPhoto } from "../../bucket/BucketViews";
import { intentionRange, intentionTitle } from "@/lib/intentions/periods";
import { material, materialsDisclaimer, searchMaterials } from "@/lib/inner-compass/library";
import type { Field, PlannerRef, Ref, RefKind, Value } from "@/lib/inner-compass/modules";
import type { BoardImage } from "@/lib/constellation-board";

/** Where each kind of reference comes from, and how to open it. Supplied by the page so nothing is loaded twice. */
export type RefSource = { options: Ref[]; live: (id: string) => Ref | undefined; href: (r: Ref) => string; noun: string; empty: ReactNode };
export type Sources = Record<RefKind, RefSource> & { today: string; upload: (file: File) => Promise<BoardImage | null> };

const str = (v: Value) => typeof v === "string" ? v : "";

export function ImagesInput({ images, max, onChange, upload, label }: { images: BoardImage[]; max: number; onChange: (i: BoardImage[]) => void; upload: Sources["upload"]; label: string }) {
  const [busy, setBusy] = useState(false);
  return <div className="muse-stories-images">
    {images.map((img) => <figure key={img.id}><BucketPhoto image={img} className="muse-stories-thumb" /><button type="button" className="muse-compass-x" aria-label={`Remove ${img.name || "photo"}`} onClick={() => onChange(images.filter((x) => x.id !== img.id))}>×</button></figure>)}
    {images.length < max && <label className="muse-stories-addphoto" aria-busy={busy || undefined}><MuseIcon name="plus" size={16} /><span>{busy ? "Adding…" : label}</span>
      <input type="file" multiple={max > 1} className="sr-only" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy}
        onChange={async (ev) => { const files = Array.from(ev.target.files ?? []).slice(0, max - images.length); ev.target.value = ""; if (!files.length) return; setBusy(true); const added: BoardImage[] = []; for (const f of files) { const img = await upload(f); if (img) added.push(img); } setBusy(false); if (added.length) onChange([...images, ...added]); }} /></label>}
  </div>;
}

/** Live name with what changed since it was chosen: "now …" or "no longer there". */
export function RefChip({ r, source, onRemove }: { r: Ref; source: RefSource; onRemove?: () => void }) {
  const live = source.live(r.id), missing = !live, renamed = live && live.label !== r.label;
  return <span className="muse-stories-ref" data-missing={missing || undefined}>
    {missing ? <span>{r.label}</span> : <Link href={source.href(live!)}>{r.label}</Link>}
    {r.date && <small className="type-numeric">{r.date}</small>}
    {renamed && <small>now “{live!.label}”</small>}{missing && <small>no longer there</small>}
    {onRemove && <button type="button" className="muse-compass-x" aria-label={`Remove ${r.label}`} onClick={onRemove}>×</button>}
  </span>;
}
export function RefsInput({ value, source, onChange, label }: { value: Ref[]; source: RefSource; onChange: (r: Ref[]) => void; label: string }) {
  const taken = new Set(value.map((r) => r.id)), options = source.options.filter((o) => !taken.has(o.id));
  return <div className="muse-stories-refs">
    {value.length > 0 && <div className="muse-stories-ref-list">{value.map((r) => <RefChip key={r.id} r={r} source={source} onRemove={() => onChange(value.filter((x) => x.id !== r.id))} />)}</div>}
    {options.length ? <MuseChoiceMenu label={label} valueLabel={`＋ ${source.noun}`} variant="chip" icon="link" searchable selectedIds={[]} options={options.map((o) => ({ id: o.id, label: o.date ? `${o.label} · ${o.date}` : o.label }))}
      onSelect={(id) => { const o = options.find((x) => x.id === id); if (o) onChange([...value, o]); }} />
      : !value.length && <p className="muse-compass-quiet">{source.empty}</p>}
  </div>;
}

function PlannerInput({ value, onChange, today }: { value?: PlannerRef; onChange: (v?: PlannerRef) => void; today: string }) {
  const [period, setPeriod] = useState<PlannerRef["period"]>(value?.period ?? "month"), [date, setDate] = useState(value?.start ?? today);
  if (value) return <p className="muse-stories-planner"><Link href={`/planner?view=intentions&period=${value.period}&date=${value.start}`}>{value.label}</Link><button type="button" className="muse-compass-x" aria-label="Remove the Planner link" onClick={() => onChange(undefined)}>×</button></p>;
  return <div className="muse-stories-planner-pick">
    <select aria-label="Period" value={period} onChange={(e) => setPeriod(e.target.value as PlannerRef["period"])}>{["week", "month", "quarter", "year"].map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}</select>
    <input type="date" aria-label="Any day in it" value={date} onChange={(e) => setDate(e.target.value || today)} />
    <button type="button" className="muse-button" onClick={() => { const r = intentionRange(period, date); onChange({ period, start: r.start, label: `Intentions · ${intentionTitle(r)}` }); }}>Link</button>
  </div>;
}

/** Name a material freely; suggestions from the reference library are optional, and a custom name always works. */
function MaterialInput({ value, refKey, onChange }: { value: string; refKey?: string; onChange: (name: string, refKey?: string, category?: string) => void }) {
  const [open, setOpen] = useState(false), id = useId();
  const hits = useMemo(() => open ? searchMaterials(value) : [], [open, value]);
  return <div className="muse-stories-material-input">
    <input id={id} role="combobox" aria-expanded={hits.length > 0} aria-controls={`${id}-list`} aria-autocomplete="list" maxLength={120} value={value} placeholder="Tiger’s eye, rosemary, a ribbon…"
      onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)} onChange={(e) => { setOpen(true); onChange(e.target.value, material(refKey)?.name === e.target.value ? refKey : undefined); }} />
    {hits.length > 0 && <ul id={`${id}-list`} role="listbox" className="muse-stories-suggest">{hits.map((m) => <li key={m.key} role="option" aria-selected={m.key === refKey}>
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(m.name, m.key, m.category === "stone" ? "stone" : m.category === "botanical" ? "botanical" : m.category === "candle" ? "candle" : m.category === "found" ? "found" : "other"); setOpen(false); }}>
        <b>{m.name}</b><small>{m.description.split(". ")[0]}.</small></button></li>)}</ul>}
    {refKey && <small className="muse-stories-matched"><MuseIcon name="check" size={12} /> In the reference library</small>}
  </div>;
}

/** The reference entry for a material: facts and associations, clearly labelled, beside the person's own meaning. */
export function MaterialReference({ refKey }: { refKey: string }) {
  const m = material(refKey); if (!m) return null;
  return <aside className="muse-stories-reference" aria-label={`About ${m.name}`}>
    <p className="muse-stories-reference-facts">{m.description}{m.traits ? ` ${m.traits}` : ""}</p>
    {m.history && <p><span className="muse-stories-label">History</span> {m.history}</p>}
    {m.associations.length > 0 && <p><span className="muse-stories-label">Symbolic associations</span> {m.associations.join(", ")}</p>}
    <p className="muse-compass-quiet">{materialsDisclaimer} {m.sources.map((s, i) => <a key={s} href={s} target="_blank" rel="noreferrer">{i ? ` · Source ${i + 1}` : "Source"}</a>)}</p>
  </aside>;
}

/** One editor for every field kind in the module registry. */
export function FieldInput({ field: f, value, onChange, sources, item }: { field: Field; value: Value; onChange: (v: Value, extra?: Record<string, Value>) => void; sources: Sources; item?: Record<string, Value> }) {
  const id = useId(), opt = <small className="small-label"> · optional</small>;
  switch (f.kind) {
    case "text": return <label htmlFor={id}><span>{f.label}{opt}</span><input id={id} maxLength={f.max} value={str(value)} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value || undefined)} /></label>;
    case "textarea": return <label htmlFor={id}><span>{f.label}{opt}</span><textarea id={id} rows={f.rows ?? 2} maxLength={f.max} value={str(value)} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value || undefined)} /></label>;
    case "date": return <label htmlFor={id} className="muse-stories-short"><span>{f.label}{opt}</span><input id={id} type="date" value={str(value)} onChange={(e) => onChange(e.target.value || undefined)} /></label>;
    case "toggle": return <label className="muse-compass-check"><input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked || undefined)} /><span>{f.label}</span></label>;
    case "choice": return <fieldset className="muse-compass-choices"><legend>{f.label}{opt}</legend><div className="muse-chip-row" data-scroll>{f.options.map((o) => <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(value === o.id ? undefined : o.id)}>{o.label}</button>)}</div></fieldset>;
    case "image": { const img = value as BoardImage | undefined; return <div className="muse-stories-field"><span>{f.label}{opt}</span><ImagesInput images={img ? [img] : []} max={1} upload={sources.upload} label="Add an image" onChange={(i) => onChange(i[0])} /></div>; }
    case "images": return <div className="muse-stories-field"><span>{f.label}{opt}</span><ImagesInput images={(value as BoardImage[] | undefined) ?? []} max={f.max} upload={sources.upload} label="Add photos" onChange={(i) => onChange(i.length ? i : undefined)} /></div>;
    case "lines": { const lines = (value as string[] | undefined) ?? []; return <div className="muse-stories-field"><span>{f.label}{opt}</span>
      <ol className="muse-stories-lines">{lines.map((l, i) => <li key={i}><input aria-label={`${f.label} ${i + 1}`} maxLength={500} value={l} onChange={(e) => onChange(lines.map((x, j) => j === i ? e.target.value : x))} /><button type="button" className="muse-compass-x" aria-label={`Remove step ${i + 1}`} onClick={() => onChange(lines.filter((_, j) => j !== i))}>×</button></li>)}</ol>
      {lines.length < f.max && <button type="button" className="text-button" onClick={() => onChange([...lines, ""])}><MuseIcon name="plus" size={13} /> {f.placeholder ?? "Add"}</button>}</div>; }
    case "refs": return <div className="muse-stories-field"><span>{f.label}{opt}</span><RefsInput value={(value as Ref[] | undefined) ?? []} source={sources[f.ref]} label={f.label} onChange={(r) => onChange(r.length ? r : undefined)} /></div>;
    case "planner": return <div className="muse-stories-field"><span>{f.label}{opt}</span><PlannerInput value={value as PlannerRef | undefined} today={sources.today} onChange={(v) => onChange(v)} /></div>;
    case "material": return <label htmlFor={id}><span>{f.label}</span><MaterialInput value={str(value)} refKey={typeof item?.refKey === "string" ? item.refKey : undefined} onChange={(name, refKey, category) => onChange(name || undefined, { refKey, ...(category && !item?.category ? { category } : {}) })} /></label>;
  }
}

/** Read-only display of one field value, for compact module cards. */
export function FieldView({ field: f, value, sources }: { field: Field; value: Value; sources: Sources }) {
  if (value === undefined || value === "" || (Array.isArray(value) && !value.length)) return null;
  switch (f.kind) {
    case "text": case "textarea": case "material": return <p className="muse-stories-fv" data-kind={f.kind}><span className="muse-stories-label">{f.label}</span> {str(value)}</p>;
    case "date": return <p className="muse-stories-fv"><span className="muse-stories-label">{f.label}</span> <span className="type-numeric">{str(value)}</span></p>;
    case "choice": return <span className="muse-compass-chip">{f.options.find((o) => o.id === value)?.label}</span>;
    case "toggle": return <span className="muse-compass-chip" data-on>{f.label}</span>;
    case "image": return <BucketPhoto image={value as BoardImage} className="muse-stories-image" />;
    case "images": return <div className="muse-stories-gallery">{(value as BoardImage[]).map((i) => <BucketPhoto key={i.id} image={i} className="muse-stories-image" />)}</div>;
    case "lines": return <div className="muse-stories-fv"><span className="muse-stories-label">{f.label}</span><ol className="muse-stories-steps">{(value as string[]).filter((x) => x.trim()).map((x, i) => <li key={i}>{x}</li>)}</ol></div>;
    case "refs": return <div className="muse-stories-ref-list">{(value as Ref[]).map((r) => <RefChip key={r.id} r={r} source={sources[f.ref]} />)}</div>;
    case "planner": { const p = value as PlannerRef; return <p className="muse-stories-fv"><span className="muse-stories-label">{f.label}</span> <Link href={`/planner?view=intentions&period=${p.period}&date=${p.start}`}>{p.label}</Link></p>; }
  }
}
