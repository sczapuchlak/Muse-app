"use client";
import { useEffect, useMemo, useState } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { readLibrary, saveLibrary } from "@/lib/planner-week";
import { changeLibrary, type LibraryChange, type Palette } from "@/lib/planner-customization";
import { pinAccent, type CustomGradient } from "@/lib/appearance-values";
import { categoryLabel, categoriesOf, searchLibrary, type LibraryItem } from "@/lib/vision-boards/library";
import type { Asset, Hex, Paint, PatternPaint } from "@/lib/vision-boards/paint";
import { MusePaintPicker } from "../../MusePaintPicker";
import { MuseSegmented } from "../../design/MuseSegmented";
import { MuseIcon } from "../../MuseIcon";
import { MuseSearch } from "../../design/MuseSearch";
import { favorites, toggleFavorite } from "./libraryPrefs";

/**
 * Saved colors and gradients are the person's Muse-wide palette (the same one Planner marks and sections use), so a
 * color saved here shows up there and vice versa. Loaded lazily, saved with the library's revision check.
 */
export function useSavedPalette(userId: string) {
  const client = useMemo(() => createMuseBrowserClient(), []);
  const [state, setState] = useState<{ palette?: Palette; revision: number; lib?: Awaited<ReturnType<typeof readLibrary>>["library"] }>({ revision: 0 });
  useEffect(() => { let live = true; readLibrary(client, userId).then((r) => { if (live) setState({ palette: r.library.palette, revision: r.revision, lib: r.library }); }).catch(() => undefined); return () => { live = false; }; }, [client, userId]);
  const change = async (c: LibraryChange) => {
    if (!state.lib) return;
    const next = changeLibrary(state.lib, c);
    setState((s) => ({ ...s, palette: next.palette, lib: next }));
    try { const saved = await saveLibrary(client, userId, next, state.revision); setState({ palette: saved.library.palette, revision: saved.revision, lib: saved.library }); } catch { /* kept for this session; saved next time */ }
  };
  return {
    palette: state.palette,
    onSaveColor: (color: Hex) => void change({ type: "palette/color", color }),
    // The palette is shared with Planner, whose gradients use four directions: a saved board gradient keeps its colors
    // and takes the nearest of those directions (the board itself keeps its exact angle).
    onSaveGradient: (gradient: CustomGradient) => void change({ type: "palette/gradient", gradient: { ...gradient, angle: nearestPreset(gradient.angle) } }),
    onForget: (item: { color: Hex } | { gradient: CustomGradient }) => void change("color" in item ? { type: "palette/remove-color", color: item.color } : { type: "palette/remove-gradient", gradient: item.gradient }),
  };
}
export type SavedPalette = ReturnType<typeof useSavedPalette>;
const nearestPreset = (a: number) => ([45, 90, 135, 180] as const).reduce((best, p) => { const d = (x: number) => Math.min(Math.abs(x - a), 360 - Math.abs(x - a)); return d(p) < d(best) ? p : best; }, 135);

/**
 * One editor for any paint: solid, gradient (every color stop and the direction are editable) or pattern (from the
 * library or an upload, with scale, rotation, offset and a base color). `allowPattern` is off where a pattern makes no
 * sense (text). Colors are pinned to hex, so the board keeps them in every theme.
 */
export function PaintEditor({ label, value, onChange, palette, uploads = [], onUploadPattern, allowPattern = true, allowNone = false }: {
  label: string; value: Paint | undefined; onChange: (p: Paint | undefined) => void; palette?: SavedPalette;
  uploads?: Asset[]; onUploadPattern?: () => void; allowPattern?: boolean; allowNone?: boolean;
}) {
  const mode = !value ? "none" : value.kind;
  const options = [...(allowNone ? [{ id: "none", label: "None" }] : []), { id: "solid", label: "Color" }, { id: "gradient", label: "Gradient" }, ...(allowPattern ? [{ id: "pattern", label: "Pattern" }] : [])] as { id: "none" | Paint["kind"]; label: string }[];
  const switchTo = (k: "none" | Paint["kind"]) => {
    if (k === "none") return onChange(undefined);
    const base = value?.kind === "solid" ? value.color : value?.kind === "gradient" ? value.gradient.colors[0] as Hex : value?.kind === "pattern" ? value.base ?? "#ffffff" : "#ffffff";
    if (k === "solid") onChange({ kind: "solid", color: base });
    else if (k === "gradient") onChange({ kind: "gradient", gradient: value?.kind === "gradient" ? value.gradient : { colors: [base, "#ff8fab"], angle: 135 } });
    else { const first = searchLibrary("fills")[0]; if (first) onChange({ kind: "pattern", pattern: { source: "builtin", id: first.id }, scale: 1, rotation: 0, x: 0, y: 0 }); }
  };
  return <div className="muse-paint-editor">
    <MuseSegmented label={`${label}: kind`} value={mode} options={options} onChange={switchTo} />
    {value && value.kind !== "pattern" && <MusePaintPicker label={label} showKind={false} value={value.kind === "solid" ? { kind: "solid", color: value.color } : { kind: "gradient", gradient: value.gradient }}
      palette={palette?.palette} onSaveColor={palette?.onSaveColor} onSaveGradient={palette?.onSaveGradient} onForget={palette?.onForget}
      onChange={(p) => { if (!p) return; if (p.kind === "solid") onChange({ kind: "solid", color: pinAccent(p.color) }); else onChange({ kind: "gradient", gradient: { ...p.gradient, colors: p.gradient.colors.map((c) => c && pinAccent(c)) as CustomGradient["colors"] } }); }} />}
    {value?.kind === "gradient" && <GradientControls value={value.gradient} onChange={(gradient) => onChange({ kind: "gradient", gradient })} />}
    {value?.kind === "pattern" && <PatternControls value={value} onChange={onChange} uploads={uploads} onUpload={onUploadPattern} palette={palette} />}
  </div>;
}

/** Every stop's color and the exact direction, always visible (presets and saved gradients sit above, in the picker). */
function GradientControls({ value, onChange }: { value: CustomGradient; onChange: (g: CustomGradient) => void }) {
  const colors = value.colors.filter(Boolean) as Hex[];
  const setStop = (i: number, c: string) => { const next = [...colors]; next[i] = c.toLowerCase() as Hex; onChange({ ...value, colors: next as CustomGradient["colors"] }); };
  return <div className="muse-gradient-controls">
    <div className="muse-gradient-stops-row" role="group" aria-label="Gradient colors">
      <span className="muse-gradient-bar" style={{ background: `linear-gradient(90deg,${colors.join(",")})` }} aria-hidden="true" />
      {colors.map((c, i) => <label key={i} className="muse-custom-color muse-gradient-stop" title={`Color ${i + 1}: ${c}`}><span className="sr-only">Gradient color {i + 1}</span><input type="color" value={c} onChange={(e) => setStop(i, e.target.value)} /></label>)}
      {colors.length < 3 ? <button type="button" className="muse-button" onClick={() => onChange({ ...value, colors: [colors[0], colors[1], "#f45cad"] as CustomGradient["colors"] })}>+ Color</button>
        : <button type="button" className="muse-button" onClick={() => onChange({ ...value, colors: [colors[0], colors[2]] as CustomGradient["colors"] })}>− Color</button>}
      <button type="button" className="muse-button" aria-label="Reverse the gradient" title="Reverse" onClick={() => onChange({ ...value, colors: [...colors].reverse() as CustomGradient["colors"] })}>⇄</button>
    </div>
    <div className="muse-gradient-direction">
      <span className="muse-gradient-dial" style={{ rotate: `${value.angle}deg` }} aria-hidden="true" />
      <Slider label="Direction" min={0} max={359} step={1} value={value.angle} format={(v) => `${Math.round(v)}°`} onChange={(angle) => onChange({ ...value, angle: Math.round(angle) })} />
    </div>
  </div>;
}

function PatternControls({ value, onChange, uploads, onUpload, palette }: { value: PatternPaint; onChange: (p: Paint) => void; uploads: Asset[]; onUpload?: () => void; palette?: SavedPalette }) {
  const set = (patch: Partial<PatternPaint>) => onChange({ ...value, ...patch });
  return <div className="muse-pattern-controls">
    <PatternPicker selected={value} onPick={(pattern) => set({ pattern })} uploads={uploads} onUpload={onUpload} />
    <div className="muse-vision-sliders">
      <Slider label="Scale" min={0.1} max={4} step={0.05} value={value.scale} format={(v) => `${Math.round(v * 100)}%`} onChange={(scale) => set({ scale })} />
      <Slider label="Rotation" min={-180} max={180} step={1} value={value.rotation} format={(v) => `${Math.round(v)}°`} onChange={(rotation) => set({ rotation })} />
      <Slider label="Shift across" min={-1} max={1} step={0.01} value={value.x} format={(v) => `${Math.round(v * 100)}`} onChange={(x) => set({ x })} />
      <Slider label="Shift down" min={-1} max={1} step={0.01} value={value.y} format={(v) => `${Math.round(v * 100)}`} onChange={(y) => set({ y })} />
    </div>
    {value.pattern.source === "asset" && <label className="muse-vision-check"><input type="checkbox" checked={value.pattern.tile !== false} onChange={(e) => set({ pattern: { ...value.pattern, tile: e.target.checked } as PatternPaint["pattern"] })} /> Repeat the image (off: fill the shape once)</label>}
    <details className="muse-vision-more"><summary>Base color under the pattern</summary>
      <MusePaintPicker label="Base color" value={value.base ? { kind: "solid", color: value.base } : undefined} allowDefault defaultLabel="None (see-through)" palette={palette?.palette} onSaveColor={palette?.onSaveColor}
        onChange={(p) => set({ base: p?.kind === "solid" ? pinAccent(p.color) : undefined })} />
    </details>
  </div>;
}

/** The pattern browser: library patterns and textures (search, categories, favorites) and the person's own uploads. */
export function PatternPicker({ selected, onPick, uploads, onUpload }: { selected?: PatternPaint; onPick: (p: PatternPaint["pattern"]) => void; uploads: Asset[]; onUpload?: () => void }) {
  const [q, setQ] = useState(""), [cat, setCat] = useState(""), [favs, setFavs] = useState<string[]>(() => favorites());
  const cats = useMemo(() => [...new Set([...categoriesOf("pattern"), ...categoriesOf("texture")])], []);
  const items = searchLibrary("fills", q, cat).sort((a, b) => Number(favs.includes(b.id)) - Number(favs.includes(a.id)));
  const isSel = (i: LibraryItem) => selected?.pattern.source === "builtin" && selected.pattern.id === i.id;
  return <div className="muse-pattern-picker">
    <MuseSearch label="Search patterns" value={q} onChange={setQ} placeholder="Search patterns" className="muse-vision-search" />
    <div className="muse-chip-row muse-vision-cats" role="group" aria-label="Pattern categories">
      <button type="button" className="muse-chip" aria-pressed={!cat} onClick={() => setCat("")}>All</button>
      {cats.map((c) => <button key={c} type="button" className="muse-chip" aria-pressed={cat === c} onClick={() => setCat(cat === c ? "" : c)}>{categoryLabel(c)}</button>)}
    </div>
    <ul className="muse-pattern-grid" aria-label="Patterns">
      {items.map((i) => <li key={i.id}>
        <button type="button" className="muse-pattern-tile" aria-pressed={isSel(i)} aria-label={i.name} title={`${i.name} · ${i.tileable ? "repeats" : "fills once"}`} onClick={() => onPick({ source: "builtin", id: i.id })}
          style={{ background: `url("${i.thumb}") center/${i.tileable ? "34px" : "cover"} ${i.tileable ? "repeat" : "no-repeat"}` }} />
        <button type="button" className="muse-pattern-fav" aria-pressed={favs.includes(i.id)} aria-label={`${favs.includes(i.id) ? "Unfavorite" : "Favorite"} ${i.name}`} onClick={() => setFavs(toggleFavorite(i.id))}>★</button>
      </li>)}
      {!items.length && <li className="small-label">No patterns match.</li>}
    </ul>
    {(uploads.length > 0 || onUpload) && <>
      <p className="editor-label">Your uploads</p>
      <ul className="muse-pattern-grid" aria-label="Your images">
        {uploads.map((a) => <li key={a.path}><button type="button" className="muse-pattern-tile" aria-pressed={selected?.pattern.source === "asset" && selected.pattern.asset.path === a.path} aria-label={a.name ?? "Your image"} onClick={() => onPick({ source: "asset", asset: a })}><UploadThumb asset={a} /></button></li>)}
        {onUpload && <li><button type="button" className="muse-pattern-tile muse-pattern-upload" aria-label="Upload an image to use as a pattern" onClick={onUpload}><MuseIcon name="plus" size={18} /></button></li>}
      </ul>
    </>}
  </div>;
}
function UploadThumb({ asset }: { asset: Asset }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => { let live = true; import("./images").then(({ loadBoardImage }) => loadBoardImage(asset.thumbnailPath)).then((img) => { if (live) setSrc(img.src); }).catch(() => undefined); return () => { live = false; }; }, [asset.thumbnailPath]);
  // eslint-disable-next-line @next/next/no-img-element -- a signed private URL, already decoded for the canvas
  return src ? <img src={src} alt="" /> : <span className="muse-pattern-loading" aria-hidden="true" />;
}

export function Slider({ label, min, max, step, value, onChange, format }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return <label className="muse-vision-range"><span>{label}<output>{format ? format(value) : value}</output></span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}
