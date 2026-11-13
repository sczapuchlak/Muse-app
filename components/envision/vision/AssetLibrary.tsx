"use client";
import { useMemo, useState } from "react";
import { decorShapes, decorPath, type DecorShape } from "@/lib/vision-boards/decor";
import { categoriesOf, categoryLabel, libraryItem, libraryKinds, searchLibrary, type LibraryItem, type LibraryKind } from "@/lib/vision-boards/library";
import { stickers } from "@/lib/vision-boards/shapes";
import { MuseSearch } from "../../design/MuseSearch";
import { MuseIcon } from "../../MuseIcon";
import { markStickers } from "./icons";
import { favorites, noteRecent, recents, toggleFavorite } from "./libraryPrefs";

type Tab = "shapes" | "favorites" | LibraryKind | "doodles";
export type LibraryPick =
  | { kind: "shape"; shape: DecorShape }
  | { kind: "piece"; item: LibraryItem }
  | { kind: "fill"; item: LibraryItem }
  | { kind: "sticker"; id: string };

/**
 * One browser for everything that can go on a board: decorative shapes, Muse's library (patterns, textures, paper,
 * washi, stickers, labels, ribbons, frames, illustrations), and the original line-art stickers and Muse marks.
 * Search, categories, favorites and recently used (on this device). Picking a pattern or texture adds a sheet of
 * patterned paper; it can be used as a fill anywhere from the inspector.
 */
export function AssetLibrary({ onPick }: { onPick: (p: LibraryPick) => void }) {
  const [tab, setTab] = useState<Tab>("shapes"), [q, setQ] = useState(""), [cat, setCat] = useState(""), [favs, setFavs] = useState<string[]>(() => favorites());
  const recent = useMemo(() => recents().map(libraryItem).filter((i): i is LibraryItem => !!i).slice(0, 8), [tab]); // eslint-disable-line react-hooks/exhaustive-deps -- refreshed when the tab changes
  const isKind = tab !== "shapes" && tab !== "favorites" && tab !== "doodles";
  const items = tab === "favorites" ? favs.map(libraryItem).filter((i): i is LibraryItem => !!i).filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()))
    : isKind ? searchLibrary(tab, q, cat) : [];
  const pickItem = (item: LibraryItem) => { noteRecent(item.id); onPick(item.kind === "pattern" || item.kind === "texture" ? { kind: "fill", item } : { kind: "piece", item }); };
  const tabs: [Tab, string][] = [["shapes", "Shapes"], ["favorites", "★ Saved"], ...libraryKinds.map((k) => [k.id, k.label] as [Tab, string]), ["doodles", "Doodles"]];
  const shapeMatch = (label: string) => !q || label.toLowerCase().includes(q.toLowerCase());
  return <div className="muse-asset-library">
    <div className="muse-asset-head">
    <div className="muse-chip-row muse-asset-tabs muse-scroll-fade" role="tablist" aria-label="Library sections">
      {tabs.map(([id, label]) => <button key={id} type="button" role="tab" className="muse-chip" aria-selected={tab === id} onClick={() => { setTab(id); setCat(""); }}>{label}</button>)}
    </div>
    <MuseSearch label="Search the library" value={q} onChange={setQ} placeholder={tab === "shapes" ? "Search shapes" : "Search"} className="muse-vision-search" />
    {isKind && categoriesOf(tab).length > 1 && <div className="muse-chip-row muse-vision-cats" role="group" aria-label="Categories">
      <button type="button" className="muse-chip" aria-pressed={!cat} onClick={() => setCat("")}>All</button>
      {categoriesOf(tab).map((c) => <button key={c} type="button" className="muse-chip" aria-pressed={cat === c} onClick={() => setCat(cat === c ? "" : c)}>{categoryLabel(c)}</button>)}
    </div>}
    </div>
    <div className="muse-asset-body">
    {tab === "shapes" && <>
      {["Basic", "Scrapbook", "Labels"].map((g) => {
        const list = decorShapes.filter((s) => s.group === g && shapeMatch(s.label));
        return list.length ? <section key={g} className="muse-asset-section"><p className="editor-label">{g}</p>
          <ul className="muse-asset-grid" aria-label={`${g} shapes`}>{list.map((s) => <li key={s.id}><button type="button" className="muse-asset-tile" aria-label={`Add ${s.label}`} title={s.label} onClick={() => onPick({ kind: "shape", shape: s.id })}>
            <svg viewBox="-4 -4 72 56" aria-hidden="true"><path d={decorPath(s.id, s.ratio === 1 ? 48 : 64, 48, 10, 3)} transform={s.ratio === 1 ? "translate(8 0)" : undefined} fillRule={s.id === "tag" ? "evenodd" : undefined} /></svg>
            <span>{s.label}</span></button></li>)}</ul></section> : null;
      })}
      {recent.length > 0 && !q && <section className="muse-asset-section"><p className="editor-label">Recently used</p><ItemGrid items={recent} favs={favs} onPick={pickItem} onFav={(id) => setFavs(toggleFavorite(id))} /></section>}
    </>}

    {(isKind || tab === "favorites") && (items.length
      ? <ItemGrid items={items} favs={favs} onPick={pickItem} onFav={(id) => setFavs(toggleFavorite(id))} />
      : <p className="small-label muse-asset-empty">{tab === "favorites" ? "Tap ★ on anything in the library to save it here." : "Nothing matches."}</p>)}

    {tab === "doodles" && <>
      <section className="muse-asset-section"><p className="editor-label">Doodles</p>
        <ul className="muse-asset-grid muse-asset-grid-small" aria-label="Doodles">{stickers.filter((s) => shapeMatch(s.label)).map((s) => <li key={s.id}><button type="button" className="muse-asset-tile" aria-label={`Add ${s.label}`} title={s.label} onClick={() => onPick({ kind: "sticker", id: s.id })}>
          <svg viewBox={`0 0 ${s.box[0]} ${s.box[1]}`} aria-hidden="true"><path d={s.d} {...(s.mode === "fill" ? { fill: "currentColor" } : { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const })} /></svg></button></li>)}</ul></section>
      <section className="muse-asset-section"><p className="editor-label">Muse Marks</p>
        <ul className="muse-asset-grid muse-asset-grid-small" aria-label="Muse Marks">{markStickers.filter((m) => shapeMatch(m.label)).map((m) => <li key={m.id}><button type="button" className="muse-asset-tile" aria-label={`Add ${m.label} mark`} title={m.label} onClick={() => onPick({ kind: "sticker", id: m.id })}><MuseIcon name={m.icon as never} size={22} /></button></li>)}</ul></section>
    </>}
    </div>
  </div>;
}

function ItemGrid({ items, favs, onPick, onFav }: { items: LibraryItem[]; favs: string[]; onPick: (i: LibraryItem) => void; onFav: (id: string) => void }) {
  return <ul className="muse-asset-grid" aria-label="Library items">
    {items.map((i) => <li key={i.id} className="muse-asset-item">
      <button type="button" className="muse-asset-tile" data-fill={i.kind === "pattern" || i.kind === "texture" || undefined} aria-label={`Add ${i.name}`} title={i.name} onClick={() => onPick(i)}
        style={i.kind === "pattern" || i.kind === "texture" ? { background: `url("${i.thumb}") center/${i.tileable ? "40px" : "cover"} ${i.tileable ? "repeat" : "no-repeat"}` } : undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static library thumbnails */}
        {!(i.kind === "pattern" || i.kind === "texture") && <img src={i.thumb} alt="" loading="lazy" decoding="async" />}
        <span>{i.name}</span>
      </button>
      <button type="button" className="muse-pattern-fav" aria-pressed={favs.includes(i.id)} aria-label={`${favs.includes(i.id) ? "Unsave" : "Save"} ${i.name}`} onClick={() => onFav(i.id)}>★</button>
    </li>)}
  </ul>;
}
