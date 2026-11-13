"use client";
import { useEffect, useRef, useState } from "react";
import { favoriteFonts, fontCategories, loadPreview, previewFamily, recentFonts, searchFonts, toggleFavoriteFont, type CatalogFont, type FontCategory } from "@/lib/vision-boards/fonts";
import { MuseSearch } from "../../design/MuseSearch";

type Tab = "" | FontCategory | "favorites" | "recent";

/**
 * The typography studio's family list: search, categories, favorites and recents. Each row previews in its own face,
 * fetched lazily (only the letters of its name) as it scrolls into view, so the full catalogue never loads at once.
 */
export function FontPicker({ value, onPick }: { value?: string; onPick: (family: string) => void }) {
  const [q, setQ] = useState(""), [tab, setTab] = useState<Tab>(""), [favs, setFavs] = useState<string[]>(() => favoriteFonts());
  const recents = recentFonts();
  const only = tab === "favorites" ? favs : tab === "recent" ? recents : undefined;
  const list = searchFonts(q, tab === "favorites" || tab === "recent" ? "" : tab, only);
  const ordered = only ? only.map((f) => list.find((x) => x.family === f)).filter((x): x is CatalogFont => !!x) : list;
  return <div className="muse-font-picker">
    <MuseSearch label="Search fonts" value={q} onChange={setQ} placeholder="Search fonts" count={ordered.length} noun={["font", "fonts"]} className="muse-vision-search" />
    <div className="muse-chip-row muse-vision-cats" role="group" aria-label="Font categories">
      {([["", "All"], ["favorites", "★ Favorites"], ["recent", "Recent"], ...fontCategories.map((c) => [c.id, c.label])] as [Tab, string][]).map(([id, label]) =>
        <button key={id || "all"} type="button" className="muse-chip" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}
    </div>
    <ul className="muse-font-list" role="listbox" aria-label="Fonts">
      {ordered.map((f) => <FontRow key={f.family} font={f} selected={f.family === value} favorite={favs.includes(f.family)} onPick={() => onPick(f.family)} onFavorite={() => setFavs(toggleFavoriteFont(f.family))} />)}
      {!ordered.length && <li className="small-label">{tab === "favorites" ? "Star a font to keep it here." : tab === "recent" ? "Fonts you use show up here." : "No fonts match."}</li>}
    </ul>
  </div>;
}

function FontRow({ font, selected, favorite, onPick, onFavorite }: { font: CatalogFont; selected: boolean; favorite: boolean; onPick: () => void; onFavorite: () => void }) {
  const ref = useRef<HTMLLIElement>(null), [ready, setReady] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { io.disconnect(); void loadPreview(font.family).then(() => setReady(true)); } }, { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, [font.family]);
  return <li ref={ref} role="option" aria-selected={selected} className="muse-font-row">
    <button type="button" className="muse-font-name" onClick={onPick} style={ready ? { fontFamily: `"${previewFamily(font.family)}", system-ui` } : undefined}>{font.family}</button>
    <button type="button" className="muse-pattern-fav" aria-pressed={favorite} aria-label={`${favorite ? "Unfavorite" : "Favorite"} ${font.family}`} onClick={onFavorite}>★</button>
  </li>;
}
