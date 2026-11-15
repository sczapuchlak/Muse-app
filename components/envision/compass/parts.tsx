"use client";
import { useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { MuseMark } from "@/components/design/MuseHeading";
import { MuseIcon } from "@/components/MuseIcon";
import { categories, categoryInfo, choiceLabel, type Category } from "@/lib/inner-compass/categories";
import { blankDiscovery, cleanTags, LIMITS, type Discovery, type Details } from "@/lib/inner-compass/model";
import type { LifeAreaLite } from "./useInnerCompass";

export const ink = (c: Category) => ({ "--compass-ink": `var(--chart-${categoryInfo[c].tone})`, "--compass-ink-b": `var(--chart-${categoryInfo[c].tone % 8 + 1})` }) as CSSProperties;
/** A calendar date (YYYY-MM-DD) reads as written; a timestamp reads in this device’s time zone. */
export const shortDate = (iso: string) => iso.length === 10
  ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`))
  : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function CategoryMark({ category, size = "sm" }: { category: Category; size?: "sm" | "md" | "lg" }) {
  const info = categoryInfo[category];
  return <MuseMark icon={info.glyph} tone={info.tone} size={size} />;
}

/** The one-word label for how the person relates to a discovery, if they said. */
export function stanceLabel(d: Discovery) {
  return choiceLabel(d.category, "stance", d.details.stance) ?? choiceLabel(d.category, "kind", d.details.kind) ?? choiceLabel(d.category, "area", d.details.area);
}

/** A compact entry: short statements stay small; longer ones show two lines and open into the detail view. */
export function DiscoveryCard({ d, onOpen, onFavorite, connections = 0, showCategory = false, variant = "card" }: { d: Discovery; onOpen: () => void; onFavorite?: () => void; connections?: number; showCategory?: boolean; variant?: "card" | "quote" }) {
  const stance = stanceLabel(d), quote = variant === "quote" || d.details.kind === "quote";
  return <article className="muse-compass-card" data-category={d.category} data-archived={d.archivedAt ? true : undefined} data-quote={quote || undefined} style={ink(d.category)}>
    <button type="button" className="muse-compass-card-open" onClick={onOpen} aria-label={`Open ${d.title}`}>
      <span className="muse-compass-card-top">
        {showCategory && <CategoryMark category={d.category} />}
        {showCategory && <span className="muse-compass-card-kind">{categoryInfo[d.category].noun}</span>}
        {stance && <span className="muse-compass-chip">{stance}</span>}
        {d.evolvedAt && <span className="muse-compass-evolved" title="Recorded an evolution"><EvolvedRing /> Evolved</span>}
      </span>
      <span className="muse-compass-card-title">{quote ? <q>{d.title}</q> : d.title}</span>
      {quote && d.details.attribution && <span className="muse-compass-card-credit">— {d.details.attribution}</span>}
      {d.meaning.trim() && <span className="muse-compass-card-meaning">{d.meaning}</span>}
      {(d.tags.length > 0 || connections > 0 || d.archivedAt) && <span className="muse-compass-card-foot">
        {d.archivedAt && <span className="muse-compass-chip" data-quiet>Archived</span>}
        {d.tags.slice(0, 3).map((t) => <span key={t} className="muse-compass-tag">#{t}</span>)}
        {connections > 0 && <span className="muse-compass-links" title={plural(connections, "connection")}><MuseIcon name="link" size={12} /> {connections}</span>}
      </span>}
    </button>
    {onFavorite && <button type="button" className="muse-compass-fav" aria-pressed={d.favorite} aria-label={d.favorite ? `Unmark ${d.title} as significant` : `Mark ${d.title} as significant`} onClick={onFavorite}>
      <Heart filled={d.favorite} />
    </button>}
  </article>;
}
export function Heart({ filled }: { filled: boolean }) {
  return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 20.3 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9a4.6 4.6 0 0 1 6.5 6.5Z" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
}
export function EvolvedRing() {
  return <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeDasharray="3 2" /><path d="M8 4.2C8.4 7.3 8.7 7.6 11.8 8C8.7 8.4 8.4 8.7 8 11.8C7.6 8.7 7.3 8.4 4.2 8C7.3 7.6 7.6 7.3 8 4.2Z" fill="currentColor" /></svg>;
}

/** Chips for picking one collection. */
export function CategoryChips({ value, onChange, label = "Collection" }: { value: Category; onChange: (c: Category) => void; label?: string }) {
  return <div className="muse-chip-row muse-compass-cats" role="group" aria-label={label} data-scroll>
    {categories.map((c) => <button key={c} type="button" aria-pressed={value === c} style={ink(c)} onClick={() => onChange(c)}><CategoryMark category={c} /> {categoryInfo[c].title.replace("My ", "")}</button>)}
  </div>;
}

export function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [draft, setDraft] = useState(""), id = useId();
  const commit = () => { if (draft.trim()) { onChange(cleanTags([...tags, ...draft.split(",")])); setDraft(""); } };
  return <div className="muse-compass-tags-field">
    <label htmlFor={id}>Tags <small className="small-label">· optional</small></label>
    <div className="muse-compass-tags-box">
      {tags.map((t) => <span key={t} className="muse-compass-tag" data-removable>#{t}<button type="button" aria-label={`Remove tag ${t}`} onClick={() => onChange(tags.filter((x) => x !== t))}>×</button></span>)}
      <input id={id} value={draft} maxLength={LIMITS.tag * 3} placeholder={tags.length ? "" : "growth, family, work…"} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } else if (e.key === "Backspace" && !draft && tags.length) onChange(tags.slice(0, -1)); }} />
    </div>
  </div>;
}

/** Pick none, one or several of the person's Life Areas. Optional, and never a score. */
export function AreaPicker({ areas, value, onChange, legend = true }: { areas: LifeAreaLite[]; value: string[]; onChange: (ids: string[]) => void; legend?: boolean }) {
  if (!areas.length) return <p className="muse-compass-quiet">Life Areas come from your <a href="/envision">Life Atlas</a>. Once you have some, you can connect discoveries to them here.</p>;
  return <fieldset className="muse-compass-areas"><legend className={legend ? undefined : "sr-only"}>Life Atlas areas <small className="small-label">· optional</small></legend>
    <div className="muse-chip-row" data-scroll>{areas.map((a) => <button key={a.id} type="button" aria-pressed={value.includes(a.id)} onClick={() => onChange(value.includes(a.id) ? value.filter((x) => x !== a.id) : [...value, a.id])}>
      <span className="muse-compass-area-dot" style={{ background: a.color }} aria-hidden="true" />{a.label}</button>)}</div>
  </fieldset>;
}

function Choices({ label, options, value, onChange }: { label: string; options: { id: string; label: string; line?: string }[]; value?: string; onChange: (v: string | undefined) => void }) {
  return <fieldset className="muse-compass-choices"><legend>{label} <small className="small-label">· optional</small></legend>
    <div className="muse-chip-row" data-scroll>{options.map((o) => <button key={o.id} type="button" aria-pressed={value === o.id} title={o.line} onClick={() => onChange(value === o.id ? undefined : o.id)}>{o.label}</button>)}</div>
  </fieldset>;
}

/**
 * Everything a discovery can hold. Only the statement is required; the rest sits behind "Add more" for new entries
 * and is open when editing. Used by the composer (expanded), the editor and saved answers from explorations.
 */
export function DiscoveryFields({ draft, set, areas, areaIds, setAreaIds, lockCategory = false, expanded: startExpanded = false, autoFocus = false, statementRef }: {
  draft: Discovery; set: (patch: Partial<Discovery>) => void; areas: LifeAreaLite[]; areaIds: string[]; setAreaIds: (ids: string[]) => void;
  lockCategory?: boolean; expanded?: boolean; autoFocus?: boolean; statementRef?: React.Ref<HTMLTextAreaElement>;
}) {
  const info = categoryInfo[draft.category], [expanded, setExpanded] = useState(startExpanded), id = useId();
  const setDetail = (k: keyof Details, v: string | undefined) => set({ details: { ...draft.details, [k]: v } });
  return <div className="muse-compass-fields">
    {!lockCategory && <CategoryChips value={draft.category} onChange={(category) => set({ category })} />}
    <label className="muse-compass-statement" htmlFor={`${id}-s`}><span>{info.statement}</span>
      <textarea id={`${id}-s`} ref={statementRef} rows={2} maxLength={LIMITS.title} required autoFocus={autoFocus} value={draft.title} placeholder={info.statementPlaceholder} onChange={(e) => set({ title: e.target.value })} />
    </label>
    {!expanded && <button type="button" className="text-button muse-compass-more" onClick={() => setExpanded(true)}><MuseIcon name="plus" size={14} /> Add meaning, details, tags</button>}
    {expanded && <>
      <label htmlFor={`${id}-m`}><span>{info.meaning} <small className="small-label">· optional</small></span>
        <textarea id={`${id}-m`} rows={3} maxLength={LIMITS.meaning} value={draft.meaning} onChange={(e) => set({ meaning: e.target.value })} /></label>
      {info.stances && <Choices label="Where it sits for me" options={info.stances} value={draft.details.stance} onChange={(v) => setDetail("stance", v)} />}
      {info.kinds && <Choices label={info.kinds.label} options={info.kinds.options} value={draft.details[info.kinds.key]} onChange={(v) => setDetail(info.kinds!.key, v)} />}
      {info.fields.map((f) => <label key={f.key} htmlFor={`${id}-${f.key}`}><span>{f.label} <small className="small-label">· optional</small></span>
        {f.key === "attribution" || f.key === "theme"
          ? <input id={`${id}-${f.key}`} maxLength={120} value={draft.details[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => setDetail(f.key, e.target.value)} />
          : <textarea id={`${id}-${f.key}`} rows={f.rows ?? 2} maxLength={LIMITS.detail} value={draft.details[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => setDetail(f.key, e.target.value)} />}
      </label>)}
      <TagInput tags={draft.tags} onChange={(tags) => set({ tags })} />
      <div className="muse-compass-row2">
        <label htmlFor={`${id}-date`}><span>A date that matters <small className="small-label">· optional</small></span>
          <input id={`${id}-date`} type="date" value={draft.significanceDate ?? ""} onChange={(e) => set({ significanceDate: e.target.value || null })} /></label>
        <label className="muse-compass-check"><input type="checkbox" checked={draft.favorite} onChange={(e) => set({ favorite: e.target.checked })} /><span>Especially significant to me</span></label>
      </div>
      <AreaPicker areas={areas} value={areaIds} onChange={setAreaIds} />
      <label htmlFor={`${id}-r`}><span>A longer reflection <small className="small-label">· optional</small></span>
        <textarea id={`${id}-r`} rows={5} maxLength={LIMITS.reflection} value={draft.reflection} onChange={(e) => set({ reflection: e.target.value })} /></label>
    </>}
  </div>;
}

/**
 * Add Discovery in seconds: a collection and a few words, then Enter. "Add more" opens the full form in place.
 * After saving, the composer stays on the same collection, ready for the next one.
 */
export function QuickAdd({ initial = "values", areas, onSave, saving, compact = false, lockCategory = false, heading }: {
  initial?: Category; areas: LifeAreaLite[]; onSave: (d: Discovery, areaIds: string[]) => Promise<boolean>; saving: boolean; compact?: boolean; lockCategory?: boolean; heading?: ReactNode;
}) {
  const [draft, setDraft] = useState(() => blankDiscovery(initial)), [areaIds, setAreaIds] = useState<string[]>([]), [key, setKey] = useState(0), [saved, setSaved] = useState("");
  const statement = useRef<HTMLTextAreaElement>(null);
  const set = (patch: Partial<Discovery>) => setDraft((d) => ({ ...d, ...patch }));
  async function submit() {
    if (!draft.title.trim() || saving) return;
    const ok = await onSave({ ...draft, title: draft.title.trim() }, areaIds);
    if (ok) { setSaved(draft.title.trim()); setDraft(blankDiscovery(draft.category)); setAreaIds([]); setKey((k) => k + 1); statement.current?.focus(); }
  }
  return <form className="muse-compass-quickadd" data-compact={compact || undefined} style={ink(draft.category)} onSubmit={(e) => { e.preventDefault(); void submit(); }}
    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && (e.target as HTMLElement).tagName === "TEXTAREA" && (e.target as HTMLElement).closest(".muse-compass-statement")) { e.preventDefault(); void submit(); } }}>
    {heading}
    <DiscoveryFields key={key} draft={draft} set={set} areas={areas} areaIds={areaIds} setAreaIds={setAreaIds} lockCategory={lockCategory} statementRef={statement} />
    <div className="muse-compass-quickadd-actions">
      <p className="muse-compass-quiet" role="status" aria-live="polite">{saved ? <>Added <b>{saved}</b> to {categoryInfo[draft.category].title}.</> : "Press Enter to add. Everything but the words is optional."}</p>
      <button type="submit" className="muse-button button-primary" disabled={!draft.title.trim() || saving}><MuseIcon name="sparkle" size={15} /> Add discovery</button>
    </div>
  </form>;
}
