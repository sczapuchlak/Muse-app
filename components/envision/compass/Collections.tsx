"use client";
import { useMemo, useState } from "react";
import { MuseChoiceMenu } from "@/components/MuseChoiceMenu";
import { MuseIcon } from "@/components/MuseIcon";
import { MuseSearch } from "@/components/design/MuseSearch";
import { categories, categoryInfo, type Category } from "@/lib/inner-compass/categories";
import { allTags, matches, relatedIds, sortDiscoveries, sorts, type Discovery, type Sort } from "@/lib/inner-compass/model";
import type { Compass } from "./useInnerCompass";
import { CategoryMark, DiscoveryCard, QuickAdd, ink, plural } from "./parts";

const PAGE = 36;

/**
 * Browse one collection (or all six): search, tags, stance, significance, sorting and the archive. Philosophy reads as
 * a commonplace book (one editorial column, grouped by the person's own themes) rather than a grid of notes.
 */
export function Collections({ compass, category, onCategory, onOpen, onGarden, addSaved }: {
  compass: Compass; category: Category | "all"; onCategory: (c: Category | "all") => void; onOpen: (id: string) => void; onGarden: (k: "values" | "character") => void;
  addSaved: (d: Discovery, areaIds: string[]) => Promise<boolean>;
}) {
  const [query, setQuery] = useState(""), [tag, setTag] = useState<string | null>(null), [stance, setStance] = useState<string | null>(null), [favorites, setFavorites] = useState(false);
  const [archived, setArchived] = useState<"hide" | "only">("hide"), [sort, setSort] = useState<Sort>("recent"), [shown, setShown] = useState(PAGE), [adding, setAdding] = useState(false);
  const info = category === "all" ? null : categoryInfo[category];
  const pool = useMemo(() => compass.discoveries.filter((d) => category === "all" || d.category === category), [compass.discoveries, category]);
  const list = useMemo(() => sortDiscoveries(pool.filter((d) => matches(d, { query, tag, favorites, stance, archived })), sort), [pool, query, tag, favorites, stance, archived, sort]);
  const tags = useMemo(() => allTags(pool), [pool]);
  const stances = info ? [...(info.stances ?? []), ...(info.kinds?.options ?? [])] : [];
  const archivedCount = pool.filter((d) => d.archivedAt).length;
  const filterCount = [tag, stance, favorites || null].filter(Boolean).length;
  const reset = () => { setTag(null); setStance(null); setFavorites(false); setShown(PAGE); };
  const pick = (c: Category | "all") => { reset(); setArchived("hide"); onCategory(c); };
  const philosophy = category === "philosophy" && sort !== "alpha";

  return <section className="muse-compass-collections" aria-labelledby="compass-collection-title" style={info ? ink(info.id) : undefined}>
    <div className="muse-chip-row muse-compass-cats" role="group" aria-label="Collections" data-scroll>
      <button type="button" aria-pressed={category === "all"} onClick={() => pick("all")}>Everything <small className="type-numeric">{compass.discoveries.filter((d) => !d.archivedAt).length}</small></button>
      {categories.map((c) => <button key={c} type="button" style={ink(c)} aria-pressed={category === c} onClick={() => pick(c)}><CategoryMark category={c} /> {categoryInfo[c].title.replace("My ", "")} <small className="type-numeric">{compass.discoveries.filter((d) => d.category === c && !d.archivedAt).length}</small></button>)}
    </div>

    <header className="muse-compass-collection-head">
      <div>
        <p className="muse-kicker">{info ? <><CategoryMark category={info.id} /> Collection</> : "All six collections"}</p>
        <h2 id="compass-collection-title" className="muse-compass-collection-title">{info ? info.title : "Everything I’ve discovered"}</h2>
        <p className="muse-compass-collection-line">{info ? info.line : "Values, character, beliefs, philosophy, boundaries and patterns, together."}</p>
      </div>
      <div className="muse-compass-collection-actions">
        {(category === "values" || category === "character") && <button type="button" className="muse-button" onClick={() => onGarden(category)}><MuseIcon name="sparkle" size={15} /> {category === "values" ? "Discover values" : "Explore qualities"}</button>}
        <button type="button" className="muse-button button-primary" aria-expanded={adding} onClick={() => setAdding((a) => !a)}><MuseIcon name={adding ? "close" : "plus"} size={15} /> {adding ? "Close" : info ? `Add a ${info.noun}` : "Add a discovery"}</button>
      </div>
    </header>

    {adding && <QuickAdd key={category} initial={category === "all" ? "values" : category} lockCategory={category !== "all"} areas={compass.areas} saving={compass.status.saving} onSave={addSaved} />}

    <div className="muse-compass-toolbar" role="group" aria-label="Find discoveries">
      <MuseSearch label={`Search ${info ? info.title.replace("My ", "").toLowerCase() : "discoveries"}`} value={query} onChange={(v) => { setQuery(v); setShown(PAGE); }} placeholder="Search words, meanings, tags" count={query ? list.length : undefined} noun={["discovery", "discoveries"]} />
      <MuseChoiceMenu label="Filter" variant="chip" icon="filter" multiple valueLabel={filterCount ? `Filter · ${filterCount}` : "Filter"} onClear={filterCount ? reset : undefined}
        selectedIds={[...(favorites ? ["fav"] : []), ...(tag ? [`t:${tag}`] : []), ...(stance ? [`s:${stance}`] : [])]}
        options={[{ id: "fav", label: "♥ Especially significant" }, ...stances.map((s) => ({ id: `s:${s.id}`, label: s.label })), ...tags.slice(0, 40).map((t) => ({ id: `t:${t.tag}`, label: `#${t.tag} · ${t.count}` }))]}
        onSelect={(id) => { setShown(PAGE); if (id === "fav") setFavorites((f) => !f); else if (id.startsWith("t:")) setTag((t) => t === id.slice(2) ? null : id.slice(2)); else setStance((s) => s === id.slice(2) ? null : id.slice(2)); }} />
      <MuseChoiceMenu label="Sort" variant="chip" valueLabel={sorts.find((s) => s.id === sort)!.label} selectedIds={[sort]} options={sorts} onSelect={(id) => setSort(id as Sort)} />
      {(archivedCount > 0 || archived === "only") && <button type="button" className="muse-button muse-compass-archive-toggle" aria-pressed={archived === "only"} onClick={() => { setArchived((a) => a === "only" ? "hide" : "only"); setShown(PAGE); }}><MuseIcon name="archive" size={14} /> {archived === "only" ? "Back to current" : `Archived · ${archivedCount}`}</button>}
    </div>

    {list.length === 0
      ? <Empty info={info} filtered={!!(query || filterCount || archived === "only")} onAdd={() => setAdding(true)} onGarden={category === "values" || category === "character" ? () => onGarden(category) : undefined} />
      : philosophy ? <Commonplace list={list.slice(0, shown)} onOpen={onOpen} />
      : <ul className="muse-compass-grid">{list.slice(0, shown).map((d) => <li key={d.id}><DiscoveryCard d={d} showCategory={category === "all"} connections={relatedIds(compass.links, d.id).length} onOpen={() => onOpen(d.id)} onFavorite={() => void compass.save({ ...d, favorite: !d.favorite })} /></li>)}</ul>}
    {list.length > shown && <div className="muse-compass-more-row"><button type="button" className="muse-button" onClick={() => setShown((n) => n + PAGE)}>Show more · {list.length - shown} left</button></div>}
    {list.length > 0 && <p className="muse-compass-quiet muse-compass-count" aria-live="polite">{plural(list.length, archived === "only" ? "archived discovery" : "discovery", archived === "only" ? "archived discoveries" : "discoveries")}</p>}
  </section>;
}

/** Philosophy as a commonplace book: themes as running heads, principles numbered in the margin, quotations credited. */
function Commonplace({ list, onOpen }: { list: Discovery[]; onOpen: (id: string) => void }) {
  const groups = useMemo(() => {
    const m = new Map<string, Discovery[]>();
    for (const d of list) { const k = d.details.theme?.trim() || ""; m.set(k, [...(m.get(k) ?? []), d]); }
    return [...m.entries()].sort(([a], [b]) => (a ? 0 : 1) - (b ? 0 : 1) || a.localeCompare(b));
  }, [list]);
  let n = 0;
  return <div className="muse-compass-commonplace">{groups.map(([theme, items]) => <section key={theme || "_"}>
    {(theme || groups.length > 1) && <h3 className="muse-compass-commonplace-theme">{theme || "Unthemed"}</h3>}
    <ol>{items.map((d) => { n++; const quote = d.details.kind === "quote"; return <li key={d.id} data-kind={d.details.kind}>
      <span className="muse-compass-commonplace-n type-numeric" aria-hidden="true">{String(n).padStart(2, "0")}</span>
      <button type="button" onClick={() => onOpen(d.id)}>
        <span className="muse-compass-commonplace-words">{quote ? <q>{d.title}</q> : d.title}</span>
        {d.details.attribution && <span className="muse-compass-card-credit">— {d.details.attribution}</span>}
        {d.meaning.trim() && <span className="muse-compass-commonplace-gloss">{d.meaning}</span>}
      </button>
      {d.favorite && <span className="muse-compass-commonplace-fav" aria-label="Especially significant">♥</span>}
    </li>; })}</ol>
  </section>)}</div>;
}

function Empty({ info, filtered, onAdd, onGarden }: { info: (typeof categoryInfo)[Category] | null; filtered: boolean; onAdd: () => void; onGarden?: () => void }) {
  if (filtered) return <p className="muse-compass-empty-quiet">Nothing matches. Try another word or clear the filters.</p>;
  return <div className="muse-compass-empty">
    <svg viewBox="0 0 120 80" aria-hidden="true" className="muse-compass-empty-art"><circle cx="60" cy="40" r="30" /><circle cx="60" cy="40" r="18" /><path d="M60 14C61.4 36 62 38.6 84 40C62 41.4 61.4 44 60 66C58.6 44 58 41.4 36 40C58 38.6 58.6 36 60 14Z" /></svg>
    <h3>{info ? `${info.title} begins with one ${info.noun}` : "Your Inner World begins with one discovery"}</h3>
    <p>{info ? <>For example: <i>{info.statementPlaceholder}</i></> : "A value, a quality, a belief, a principle, a boundary or a pattern you’ve noticed. One sentence is plenty."}</p>
    <div><button type="button" className="muse-button button-primary" onClick={onAdd}><MuseIcon name="plus" size={15} /> Add {info ? `a ${info.noun}` : "a discovery"}</button>{onGarden && <button type="button" className="muse-button" onClick={onGarden}><MuseIcon name="sparkle" size={15} /> Browse a library of words</button>}</div>
  </div>;
}
