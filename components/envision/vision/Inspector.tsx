"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { boardSizes, canvasOf, CANVAS_LIMITS, linkStatus, type Background, type BoardElement, type ElementLink, type ImageElement, type PieceElement, type ShapeElement, type StickerElement, type TextElement, type VisionBoard } from "@/lib/vision-boards/model";
import { decorShapes, radiusShapes, type DecorShape } from "@/lib/vision-boards/decor";
import { catalogFont, ensureFont, nearestWeight, noteRecentFont } from "@/lib/vision-boards/fonts";
import { defaultShadow, paintColor, type Asset, type Finish, type Hex, type Paint, type Shadow } from "@/lib/vision-boards/paint";
import { pinAccent } from "@/lib/appearance-values";
import type { Align, Expand } from "@/lib/vision-boards/editing";
import { MuseChoiceMenu } from "../../MuseChoiceMenu";
import { MuseColorPicker } from "../../MuseColorPicker";
import { MuseIcon } from "../../MuseIcon";
import { MuseCloseButton } from "../../MuseIconButton";
import { MuseSegmented } from "../../design/MuseSegmented";
import { FontPicker } from "./FontPicker";
import { PaintEditor, Slider, type SavedPalette } from "./PaintEditor";
import { measureText } from "./BoardCanvas";

export type InspectorActions = {
  align: (how: Align) => void; distribute: (axis: "h" | "v") => void;
  layer: (move: "forward" | "backward" | "front" | "back") => void;
  group: () => void; ungroup: () => void; lock: () => void; duplicate: () => void; remove: () => void;
  copyStyle: () => void; pasteStyle: () => void; canPasteStyle: boolean;
  crop: () => void; makeSticker: () => void; addBacking: () => void;
  expand: (by: Expand) => void; resize: (w: number, h: number, anchor: { x: 0 | 0.5 | 1; y: 0 | 0.5 | 1 }) => void; preset: (size: keyof typeof boardSizes) => void;
  background: (b: Background) => void; exportImage: (type: "image/png" | "image/jpeg") => void; exporting: boolean;
};
type Props = {
  onClose?: () => void;
  /** Closes a piece's settings (deselects it), back to the board's. */
  onDeselect?: () => void;
  board: VisionBoard; selected: BoardElement[]; grouped: boolean; units: number;
  /** Patches every selected piece of the representative's kind (so a multi-selection of shapes edits together). */
  patch: (fn: (e: BoardElement) => Partial<BoardElement> | null, key?: string, scope?: "kind" | "all") => void;
  actions: InspectorActions; palette: SavedPalette; uploads: Asset[]; requestUpload: (then: (a: Asset) => void) => void;
  lookups: { linkOptions: { id: string; label: string }[]; live: (l: ElementLink) => { label: string } | undefined };
  label: (e: BoardElement) => string;
};

/**
 * The contextual workspace (#187): only the controls that make sense for what's selected. Nothing selected shows the
 * board itself (size, added space, background, export). Every style control is a real editor, never only presets.
 */
export function Inspector(props: Props) {
  const { selected } = props;
  const first = selected[0], mixed = new Set(selected.map((e) => e.kind)).size > 1;
  return <aside id="vision-inspector" className="muse-vision-inspector" aria-label={first ? "Selected piece settings" : "Board settings"}>
    {/* X closes what the panel is showing: a piece's settings (deselects it), or the board's (hides the panel). */}
    {first && props.onDeselect ? <div className="muse-vision-inspector-close"><MuseCloseButton label={selected.length > 1 ? "Close these pieces’ settings" : "Close this piece’s settings"} onClose={props.onDeselect} /></div>
      : props.onClose && <div className="muse-vision-inspector-close"><MuseCloseButton label="Hide the panel" onClose={props.onClose} /></div>}
    {!first ? <BoardSection {...props} /> : <>
      <header className="muse-vision-inspector-head">
        <p className="editor-label">{selected.length > 1 ? `${selected.length} pieces${props.grouped ? " · grouped" : ""}` : props.label(first)}</p>
      </header>
      {mixed ? <p className="small-label muse-vision-mixed">Different kinds of pieces are selected: opacity, shadow and finish change them all. Select one kind to style it further.</p> : <KindSection {...props} e={first} />}
      {(mixed || first.kind !== "text") && <Section title="Sticker finish">
        <FinishEditor value={(first as ShapeElement).finish} onChange={(f) => props.patch((e) => e.kind === "text" ? null : ({ finish: f }) as Partial<ShapeElement>, "finish", "all")} />
      </Section>}
      <Section title="Look" open={mixed}>
        <Slider label="Opacity" min={0.05} max={1} step={0.01} value={first.opacity ?? 1} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => props.patch(() => ({ opacity: v >= 0.999 ? undefined : v }), "opacity", "all")} />
        <ShadowEditor value={first.kind === "image" ? first.shadowStyle ?? (first.shadow ? { ...defaultShadow, blur: 26, y: 12, opacity: 0.32 } : undefined) : (first as ShapeElement).shadowStyle}
          onChange={(s) => props.patch((e) => e.kind === "text" ? ({ shadowStyle: s, h: measureText({ ...e, shadowStyle: s }) } as Partial<TextElement>) : e.kind === "image" ? { shadowStyle: s, shadow: s ? true : undefined } as Partial<ImageElement> : { shadowStyle: s } as Partial<ShapeElement>, "shadow", "all")} hidden={!mixed && first.kind === "text"} />
      </Section>
      <ArrangeSection {...props} />
      {selected.length === 1 && <LinkSection {...props} e={first} />}
    </>}
  </aside>;
}

export function Section({ title, children, open = true }: { title: string; children: ReactNode; open?: boolean }) {
  return <details className="muse-vision-section" open={open}><summary>{title}</summary><div className="muse-vision-section-body">{children}</div></details>;
}

// ---------- Kind-specific ----------
function KindSection(p: Props & { e: BoardElement }) {
  const { e } = p;
  if (e.kind === "image") return <ImageSection {...p} e={e} />;
  if (e.kind === "text") return <TextSection {...p} e={e} />;
  if (e.kind === "shape") return <ShapeSection {...p} e={e} />;
  if (e.kind === "piece") return <PieceSection {...p} e={e} />;
  return <StickerSection {...p} e={e} />;
}
const paintProps = (p: Props) => ({ palette: p.palette, uploads: p.uploads });

function ImageSection(p: Props & { e: ImageElement }) {
  const { e, patch } = p;
  const rectish = e.crop.shape === "rect" || e.crop.shape === "square", free = e.crop.shape === "rect" && !!e.image.alpha;
  const border = e.border, outline = e.outline;
  return <>
    <Section title="Photo">
      <div className="muse-vision-actions">
        <button type="button" className="muse-button" onClick={p.actions.crop}>Crop & shape</button>
        <button type="button" className="muse-button" onClick={p.actions.makeSticker}><MuseIcon name="sparkle" size={14} /> Make it a sticker</button>
        <button type="button" className="muse-button" onClick={p.actions.addBacking}>Add a backing</button>
      </div>
      {rectish && !free && <Slider label="Corner radius" min={0} max={Math.round(Math.min(e.w, e.h) / 2)} step={1} value={Math.min(e.radius ?? 0, Math.round(Math.min(e.w, e.h) / 2))} format={(v) => `${v}`} onChange={(v) => patch(() => ({ radius: v || undefined }), "radius")} />}
    </Section>
    {!free && <Section title="Border">
      <Toggle label="Border" on={!!border} onChange={(on) => patch(() => ({ border: on ? { color: "#ffffff" as Hex, width: 12 } : undefined }))} />
      {border && <>
        <Slider label="Thickness" min={1} max={60} step={1} value={border.width} onChange={(v) => patch((x) => ({ border: { ...(x as ImageElement).border ?? border, width: v } }), "border-width")} />
        <PaintEditor label="Border" value={border.paint ?? { kind: "solid", color: border.color }} {...paintProps(p)} onUploadPattern={() => p.requestUpload((a) => patch((x) => ({ border: { ...(x as ImageElement).border ?? border, paint: pat(a) } })))}
          onChange={(paint) => paint && patch((x) => ({ border: { ...(x as ImageElement).border ?? border, color: paintColor(paint), paint: paint.kind === "solid" ? undefined : paint } }), "border-paint")} />
      </>}
    </Section>}
    <Section title={free ? "Die-cut edge" : "Sticker edge"} open={!!outline || free}>
      <Toggle label={free ? "Outline that follows the cutout" : "Outline around the shape"} on={!!outline} onChange={(on) => patch(() => ({ outline: on ? { color: "#ffffff" as Hex, width: Math.max(6, Math.round(Math.min(e.w, e.h) * 0.04)) } : undefined }))} />
      {outline && <OutlineEditor p={p} value={outline} onChange={(o) => patch(() => ({ outline: o }), "outline")} />}
    </Section>
  </>;
}
function OutlineEditor({ p, value, onChange }: { p: Props; value: NonNullable<ImageElement["outline"]>; onChange: (o: NonNullable<ImageElement["outline"]>) => void }) {
  return <>
    <Slider label="Thickness" min={2} max={60} step={1} value={value.width} onChange={(v) => onChange({ ...value, width: v })} />
    <PaintEditor label="Edge" value={value.paint ?? { kind: "solid", color: value.color }} {...paintProps(p)} onUploadPattern={() => p.requestUpload((a) => onChange({ ...value, paint: pat(a) }))}
      onChange={(paint) => paint && onChange({ ...value, color: paintColor(paint), paint: paint.kind === "solid" ? undefined : paint })} />
  </>;
}
const pat = (a: Asset): Paint => ({ kind: "pattern", pattern: { source: "asset", asset: a }, scale: 1, rotation: 0, x: 0, y: 0 });

function ShapeSection(p: Props & { e: ShapeElement }) {
  const { e, patch } = p, maxR = Math.round(Math.min(e.w, e.h) / 2);
  return <>
    <Section title="Shape">
      <MuseChoiceMenu label="Shape" valueLabel={decorShapes.find((s) => s.id === e.shape)?.label ?? "Shape"} searchable options={decorShapes.map((s) => ({ id: s.id, label: `${s.label} · ${s.group}` }))} selectedIds={[e.shape]} onSelect={(id) => patch(() => ({ shape: id as DecorShape }))} />
      {radiusShapes.includes(e.shape) && <Slider label="Corner radius" min={0} max={maxR} step={1} value={Math.min(e.radius ?? (e.shape === "rounded" ? Math.round(Math.min(e.w, e.h) * 0.12) : 0), maxR)} onChange={(v) => patch(() => ({ radius: v || undefined }), "radius")} />}
    </Section>
    <Section title="Fill">
      <PaintEditor label="Fill" allowNone value={e.fill} {...paintProps(p)} onUploadPattern={() => p.requestUpload((a) => patch(() => ({ fill: pat(a) })))} onChange={(fill) => patch(() => ({ fill }), "fill")} />
    </Section>
    <Section title="Border">
      <Toggle label="Border" on={!!e.stroke} onChange={(on) => patch(() => ({ stroke: on ? { paint: { kind: "gradient", gradient: { colors: ["#ff8fab", "#ffd166"], angle: 135 } }, width: 10 } : undefined }))} />
      {e.stroke && <>
        <Slider label="Thickness" min={0.5} max={120} step={0.5} value={e.stroke.width} onChange={(v) => patch((x) => ({ stroke: { ...((x as ShapeElement).stroke ?? e.stroke!), width: v } }), "stroke-width")} />
        <PaintEditor label="Border" value={e.stroke.paint} {...paintProps(p)} onUploadPattern={() => p.requestUpload((a) => patch((x) => ({ stroke: { ...((x as ShapeElement).stroke ?? e.stroke!), paint: pat(a) } })))}
          onChange={(paint) => paint && patch((x) => ({ stroke: { ...((x as ShapeElement).stroke ?? e.stroke!), paint } }), "stroke-paint")} />
        <p className="small-label">The border follows the shape’s real edge, rounded corners and curves included.</p>
      </>}
    </Section>
  </>;
}
function PieceSection(p: Props & { e: PieceElement }) {
  const { e, patch } = p;
  return <Section title="Die-cut edge" open={!!e.outline}>
    <Toggle label="Outline that follows the art" on={!!e.outline} onChange={(on) => patch(() => ({ outline: on ? { color: "#ffffff" as Hex, width: Math.max(6, Math.round(Math.min(e.w, e.h) * 0.04)) } : undefined }))} />
    {e.outline && <OutlineEditor p={p} value={e.outline} onChange={(o) => patch(() => ({ outline: o }), "outline")} />}
  </Section>;
}
function StickerSection(p: Props & { e: StickerElement }) {
  const { e, patch } = p;
  return <Section title="Color">
    <PaintEditor label="Doodle" value={e.paint ?? { kind: "solid", color: e.color }} {...paintProps(p)} onUploadPattern={() => p.requestUpload((a) => patch(() => ({ paint: pat(a) })))}
      onChange={(paint) => paint && patch(() => ({ color: paintColor(paint), paint: paint.kind === "solid" ? undefined : paint }), "paint")} />
  </Section>;
}

function TextSection(p: Props & { e: TextElement }) {
  const { e } = p;
  /** Text changes re-measure the box height (and again once a new face has loaded). */
  const set = (patch: Partial<TextElement>, key?: string) => p.patch((x) => { const t = { ...(x as TextElement), ...patch }; return { ...patch, h: measureText(t) }; }, key);
  const font = catalogFont(e.family);
  const pickFamily = (family: string) => {
    noteRecentFont(family);
    const weight = nearestWeight(catalogFont(family), e.weight ?? (e.bold ? 700 : 400));
    set({ family, weight, bold: undefined }, "family");
    void ensureFont(family, weight, !!e.italic).then(() => set({}, "family"));
  };
  return <>
    <Section title="Words">
      <textarea id="vision-text-input" className="muse-vision-textinput" aria-label="Words" rows={3} maxLength={1000} value={e.text} onChange={(ev) => set({ text: ev.target.value }, `text:${e.id}`)} />
    </Section>
    <Section title="Typography">
      <FontDisclosure family={e.family} classic={e.font} onPick={pickFamily} onClassic={(font) => set({ font, family: undefined, weight: undefined })} />
      <div className="muse-vision-row">
        <label className="muse-vision-field">Size<input type="number" min={8} max={400} value={Math.round(e.size)} onChange={(ev) => { const v = Number(ev.target.value); if (v >= 8 && v <= 400) set({ size: v }, `size:${e.id}`); }} /></label>
        <button type="button" className="muse-button" aria-pressed={!!e.italic} aria-label="Italic" onClick={() => { set({ italic: !e.italic || undefined }); if (e.family) void ensureFont(e.family, e.weight ?? 400, !e.italic).then(() => set({}, "family")); }}><em>I</em></button>
        <MuseSegmented label="Align" value={e.align} options={[{ id: "left", label: "Left" }, { id: "center", label: "Center" }, { id: "right", label: "Right" }]} onChange={(align) => set({ align })} />
      </div>
      {font ? font.weights.length > 1 && <Slider label="Weight" min={font.weights[0]} max={font.weights[font.weights.length - 1]} step={100} value={e.weight ?? 400} onChange={(v) => { const w = nearestWeight(font, v); set({ weight: w }, "weight"); void ensureFont(font.family, w, !!e.italic).then(() => set({}, "weight")); }} />
        : <Toggle label="Bold" on={!!e.bold} onChange={(on) => set({ bold: on || undefined })} />}
      <Slider label="Letter spacing" min={-0.1} max={0.6} step={0.01} value={e.letterSpacing ?? 0} format={(v) => `${Math.round(v * 100)}`} onChange={(v) => set({ letterSpacing: Math.abs(v) < 0.005 ? undefined : v }, "spacing")} />
      <Slider label="Line height" min={0.7} max={2.4} step={0.05} value={e.lineHeight ?? 1.2} format={(v) => v.toFixed(2)} onChange={(v) => set({ lineHeight: v }, "leading")} />
    </Section>
    <Section title="Fill">
      <PaintEditor label="Letters" allowPattern={false} value={e.paint ?? { kind: "solid", color: e.color }} palette={p.palette}
        onChange={(paint) => paint && set({ color: paintColor(paint), paint: paint.kind === "solid" ? undefined : paint }, "text-paint")} />
    </Section>
    <Section title="Effects" open={!!(e.stroke || e.shadowStyle || e.glow || e.highlight)}>
      <Toggle label="Outline" on={!!e.stroke} onChange={(on) => set({ stroke: on ? { color: "#ffffff", width: Math.max(1, Math.round(e.size / 18)) } : undefined })} />
      {e.stroke && <><Slider label="Outline thickness" min={0.5} max={40} step={0.5} value={e.stroke.width} onChange={(v) => set({ stroke: { ...e.stroke!, width: v } }, "text-stroke")} />
        <MuseColorPicker label="Outline color" value={e.stroke.color} onChange={(c) => set({ stroke: { ...e.stroke!, color: pinAccent(c) } }, "text-stroke")} /></>}
      <ShadowEditor value={e.shadowStyle} onChange={(s) => set({ shadowStyle: s }, "shadow")} />
      <Toggle label="Glow" on={!!e.glow} onChange={(on) => set({ glow: on ? { color: "#fff3b0", blur: Math.round(e.size * 0.4) } : undefined })} />
      {e.glow && <><Slider label="Glow size" min={1} max={120} step={1} value={e.glow.blur} onChange={(v) => set({ glow: { ...e.glow!, blur: v } }, "glow")} />
        <MuseColorPicker label="Glow color" value={e.glow.color} onChange={(c) => set({ glow: { ...e.glow!, color: pinAccent(c) } }, "glow")} /></>}
      <p className="editor-label">Label tape behind the words</p>
      <div className="muse-chip-row"><button type="button" className="muse-chip" aria-pressed={!e.highlight} onClick={() => set({ highlight: undefined })}>None</button>
        {(["#ffffff", "#fff3b0", "#ffd6e0", "#d7f9f1", "#16141c"] as Hex[]).map((c) => <button key={c} type="button" className="muse-color-swatch" style={{ background: c }} aria-label={`Tape ${c}`} aria-pressed={e.highlight === c} onClick={() => set({ highlight: c })} />)}</div>
    </Section>
  </>;
}
function FontDisclosure({ family, classic, onPick, onClassic }: { family?: string; classic: TextElement["font"]; onPick: (f: string) => void; onClassic: (f: TextElement["font"]) => void }) {
  const [open, setOpen] = useState(false);
  return <div className="muse-vision-font">
    <button type="button" className="muse-button muse-vision-font-current" aria-expanded={open} onClick={() => setOpen(!open)}>
      <span>{family ?? `Muse ${classic === "editorial" ? "Editorial" : classic === "clean" ? "Clean" : "Label"}`}</span><MuseIcon name="chevron" size={14} /></button>
    {open && <>
      <div className="muse-chip-row" role="group" aria-label="Muse fonts">{(["editorial", "clean", "label"] as const).map((f) => <button key={f} type="button" className="muse-chip" aria-pressed={!family && classic === f} onClick={() => onClassic(f)}>{f === "editorial" ? "Editorial" : f === "clean" ? "Clean" : "Label"}</button>)}</div>
      <FontPicker value={family} onPick={(f) => { onPick(f); }} />
    </>}
  </div>;
}

// ---------- Shared editors ----------
export function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return <label className="muse-vision-check"><input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} /> {label}</label>;
}
function ShadowEditor({ value, onChange, hidden }: { value: Shadow | undefined; onChange: (s: Shadow | undefined) => void; hidden?: boolean }) {
  if (hidden) return null;
  return <div className="muse-vision-subgroup">
    <Toggle label="Shadow" on={!!value} onChange={(on) => onChange(on ? defaultShadow : undefined)} />
    {value && <>
      <Slider label="Softness" min={0} max={120} step={1} value={value.blur} onChange={(blur) => onChange({ ...value, blur })} />
      <Slider label="Strength" min={0} max={1} step={0.01} value={value.opacity} format={(v) => `${Math.round(v * 100)}%`} onChange={(opacity) => onChange({ ...value, opacity })} />
      <Slider label="Across" min={-80} max={80} step={1} value={value.x} onChange={(x) => onChange({ ...value, x })} />
      <Slider label="Down" min={-80} max={80} step={1} value={value.y} onChange={(y) => onChange({ ...value, y })} />
      <MuseColorPicker label="Shadow color" value={value.color} onChange={(c) => onChange({ ...value, color: pinAccent(c) })} />
    </>}
  </div>;
}
/**
 * Three compact finishes that apply instantly (the canvas is the preview). Switching keeps the intensity, and the
 * choice is ordinary element data, so it undoes, saves, reopens and exports like everything else.
 */
function FinishEditor({ value, onChange }: { value: Finish | undefined; onChange: (f: Finish | undefined) => void }) {
  const amount = value?.kind === "matte" ? "Texture" : value?.kind === "glossy" ? "Gloss" : "Foil";
  return <div className="muse-vision-subgroup">
    <MuseSegmented label="Finish" className="muse-vision-finishes" value={value?.kind ?? "none"} options={[{ id: "none", label: "None" }, { id: "matte", label: "Matte" }, { id: "glossy", label: "Glossy" }, { id: "holo", label: "Holographic" }] as const}
      onChange={(k) => onChange(k === "none" ? undefined : { kind: k, intensity: value?.intensity ?? (k === "holo" ? 0.7 : 0.65), ...(k === "holo" && value?.shimmer ? { shimmer: true } : {}), ...(value?.lift === false ? { lift: false as const } : {}) })} />
    {value && <Slider label={amount} min={0.1} max={1} step={0.05} value={value.intensity} format={(v) => `${Math.round(v * 100)}%`} onChange={(intensity) => onChange({ ...value, intensity })} />}
    {value?.kind === "holo" && <Toggle label="Shimmer while editing (exports stay still; off with reduced motion)" on={!!value.shimmer} onChange={(on) => onChange({ ...value, shimmer: on || undefined })} />}
    {value && <Toggle label="Lift off the page (soft shadow, when the piece has none of its own)" on={value.lift !== false} onChange={(on) => { const { lift: _l, ...rest } = value; void _l; onChange(on ? rest : { ...rest, lift: false }); }} />}
  </div>;
}

// ---------- Arrange ----------
function ArrangeSection({ actions: a, selected, grouped, units }: Props) {
  const locked = selected.every((e) => e.locked);
  return <Section title="Arrange">
    <p className="small-label">{units > 1 ? "Align to each other" : "Align on the board"}</p>
    <div className="muse-vision-iconrow" role="group" aria-label="Align">
      {([["left", "Left edges"], ["hcenter", "Centers across"], ["right", "Right edges"], ["top", "Top edges"], ["vcenter", "Centers down"], ["bottom", "Bottom edges"]] as [Align, string][]).map(([id, label]) =>
        <button key={id} type="button" className="muse-button" aria-label={`Align ${label.toLowerCase()}`} title={label} onClick={() => a.align(id)}><AlignGlyph how={id} /></button>)}
    </div>
    {units > 2 && <div className="muse-vision-actions"><button type="button" className="muse-button" onClick={() => a.distribute("h")}>Space evenly across</button><button type="button" className="muse-button" onClick={() => a.distribute("v")}>Space evenly down</button></div>}
    <div className="muse-vision-iconrow" role="group" aria-label="Layer order">
      <button type="button" className="muse-button" title="Bring to front (⇧])" onClick={() => a.layer("front")}>Front</button>
      <button type="button" className="muse-button" title="Bring forward (])" onClick={() => a.layer("forward")}>Forward</button>
      <button type="button" className="muse-button" title="Send backward ([)" onClick={() => a.layer("backward")}>Back</button>
      <button type="button" className="muse-button" title="Send to back (⇧[)" onClick={() => a.layer("back")}>Bottom</button>
    </div>
    <div className="muse-vision-actions">
      {grouped ? <button type="button" className="muse-button" title="Ungroup (⇧⌘G)" onClick={a.ungroup}>Ungroup</button> : selected.length > 1 && <button type="button" className="muse-button" title="Group (⌘G)" onClick={a.group}>Group</button>}
      <button type="button" className="muse-button" aria-pressed={locked} onClick={a.lock}>{locked ? "Unlock" : "Lock"}</button>
      <button type="button" className="muse-button" title="Duplicate (⌘D)" onClick={a.duplicate}>Duplicate</button>
      <button type="button" className="muse-button" title="Copy style (⌥⌘C)" onClick={a.copyStyle}>Copy style</button>
      <button type="button" className="muse-button" title="Paste style (⌥⌘V)" disabled={!a.canPasteStyle} onClick={a.pasteStyle}>Paste style</button>
      <button type="button" className="muse-button" aria-label="Delete" title="Delete" onClick={a.remove}><MuseIcon name="trash" size={15} /></button>
    </div>
  </Section>;
}
function AlignGlyph({ how }: { how: Align }) {
  const v = how === "left" || how === "hcenter" || how === "right";
  const line = how === "left" ? "M3 2v16" : how === "hcenter" ? "M10 2v16" : how === "right" ? "M17 2v16" : how === "top" ? "M2 3h16" : how === "vcenter" ? "M2 10h16" : "M2 17h16";
  const bars = v ? (how === "left" ? ["M5 5h9", "M5 13h6"] : how === "hcenter" ? ["M5 5h10", "M7 13h6"] : ["M6 5h9", "M9 13h6"]) : (how === "top" ? ["M5 5v9", "M13 5v6"] : how === "vcenter" ? ["M5 5v10", "M13 7v6"] : ["M5 6v9", "M13 9v6"]);
  return <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round"><path d={line} strokeWidth="1.4" />{bars.map((d) => <path key={d} d={d} strokeWidth="3.2" />)}</svg>;
}

// ---------- Link ----------
function LinkSection({ e, patch, lookups }: Props & { e: BoardElement }) {
  return <Section title={e.link ? "Linked" : "Link to Muse"} open={!!e.link}>
    {e.link ? (() => { const st = linkStatus(e.link, lookups.live(e.link)); return <>
      <p><span className="muse-intentions-ref" data-missing={st.missing || undefined}>{st.missing ? st.label : <Link href={e.link.kind === "aspiration" ? `/envision?open=${e.link.id}` : "/envision?view=bucket"}>{st.label}</Link>}{st.note && <small> {st.note}</small>}</span></p>
      <button type="button" className="text-button" onClick={() => patch(() => ({ link: undefined }))}>Remove link</button></>; })()
      : <p className="small-label">Point this piece at an Aspiration or a Bucket List dream. It’s only a reference: nothing is created or changed there.</p>}
    {lookups.linkOptions.length ? <MuseChoiceMenu label="Link to" valueLabel={e.link ? "Link something else…" : "Choose…"} searchable options={lookups.linkOptions} selectedIds={e.link ? [`${e.link.kind}:${e.link.id}`] : []}
      onSelect={(id) => { const [kind, rid] = id.split(/:(.+)/); const o = lookups.linkOptions.find((x) => x.id === id); if (o) patch(() => ({ link: { kind: kind as ElementLink["kind"], id: rid, label: o.label.replace(/^\S+ /, "") } })); }} />
      : <p className="small-label">No aspirations or dreams yet. <Link href="/envision">Add one in Envision</Link>.</p>}
  </Section>;
}

// ---------- Nothing selected: the board ----------
function BoardSection({ board, actions: a, palette, uploads, requestUpload }: Props) {
  const c = canvasOf(board), [step, setStep] = useState(400);
  const bgPaint: Paint = board.background.kind === "solid" ? { kind: "solid", color: board.background.color } : board.background.kind === "gradient" ? { kind: "gradient", gradient: board.background.gradient } : board.background.paint;
  return <>
    <header className="muse-vision-inspector-head"><p className="editor-label">The board</p><p className="small-label">Select a piece to style it. Shift-click or drag a box (Select) to pick several.</p></header>
    <Section title="Board size">
      <p className="small-label">Board size is the artwork itself; zoom only changes your view. Adding space never moves, scales or stretches anything already on the board.</p>
      <div className="muse-vision-actions" role="group" aria-label="Add space">
        <label className="muse-vision-field">Add<select value={step} onChange={(e) => setStep(Number(e.target.value))}>{[100, 200, 400, 800, 1200].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        <button type="button" className="muse-button" onClick={() => a.expand({ left: step })}>← Left</button>
        <button type="button" className="muse-button" onClick={() => a.expand({ right: step })}>Right →</button>
        <button type="button" className="muse-button" onClick={() => a.expand({ top: step })}>↑ Top</button>
        <button type="button" className="muse-button" onClick={() => a.expand({ bottom: step })}>Bottom ↓</button>
        <button type="button" className="muse-button" onClick={() => a.expand({ left: step / 2, right: step / 2, top: step / 2, bottom: step / 2 })}>All sides</button>
      </div>
      <SizeForm key={`${c.w}x${c.h}`} current={c} onResize={a.resize} />
      <div className="muse-chip-row" role="group" aria-label="Preset sizes">{(Object.keys(boardSizes) as (keyof typeof boardSizes)[]).map((s) => <button key={s} type="button" className="muse-chip" aria-pressed={board.size === s} onClick={() => a.preset(s)}>{boardSizes[s].label} {boardSizes[s].w}×{boardSizes[s].h}</button>)}</div>
    </Section>
    <Section title="Background">
      <PaintEditor label="Board background" value={bgPaint} palette={palette} uploads={uploads}
        onUploadPattern={() => requestUpload((asset) => a.background({ kind: "pattern", paint: { kind: "pattern", pattern: { source: "asset", asset }, scale: 1, rotation: 0, x: 0, y: 0 } }))}
        onChange={(p) => { if (!p) return; a.background(p.kind === "solid" ? { kind: "solid", color: p.color } : p.kind === "gradient" ? { kind: "gradient", gradient: p.gradient } : { kind: "pattern", paint: p }); }} />
      <p className="small-label">The board keeps its own colors in every Muse theme.</p>
    </Section>
    <Section title="Export">
      <p className="small-label">A full-quality image of the board (pieces resting off the board are left out).</p>
      <div className="muse-vision-actions">
        <button type="button" className="muse-button button-primary" disabled={a.exporting} onClick={() => a.exportImage("image/png")}>{a.exporting ? "Preparing…" : "PNG"}</button>
        <button type="button" className="muse-button" disabled={a.exporting} onClick={() => a.exportImage("image/jpeg")}>JPEG</button>
      </div>
    </Section>
  </>;
}

/** Exact dimensions, with a 3×3 anchor for which edge stays put (remounted when the size changes elsewhere). */
function SizeForm({ current: c, onResize }: { current: { w: number; h: number }; onResize: InspectorActions["resize"] }) {
  const [w, setW] = useState(String(c.w)), [h, setH] = useState(String(c.h)), [anchor, setAnchor] = useState<{ x: 0 | 0.5 | 1; y: 0 | 0.5 | 1 }>({ x: 0.5, y: 0.5 });
  const nw = Number(w), nh = Number(h), valid = [nw, nh].every((n) => Number.isInteger(n) && n >= CANVAS_LIMITS.min && n <= CANVAS_LIMITS.max), changed = nw !== c.w || nh !== c.h;
  const a = { resize: onResize };
  return <>
      <form className="muse-vision-size-form" onSubmit={(e) => { e.preventDefault(); if (valid && changed) a.resize(nw, nh, anchor); }}>
        <label className="muse-vision-field">Width<input type="number" inputMode="numeric" min={CANVAS_LIMITS.min} max={CANVAS_LIMITS.max} value={w} onChange={(e) => setW(e.target.value)} /></label>
        <span aria-hidden="true">×</span>
        <label className="muse-vision-field">Height<input type="number" inputMode="numeric" min={CANVAS_LIMITS.min} max={CANVAS_LIMITS.max} value={h} onChange={(e) => setH(e.target.value)} /></label>
        <div className="muse-vision-anchor" role="group" aria-label="Keep this edge fixed">
          {([0, 0.5, 1] as const).flatMap((y) => ([0, 0.5, 1] as const).map((x) => <button key={`${x}${y}`} type="button" aria-pressed={anchor.x === x && anchor.y === y} aria-label={`Anchor ${y === 0 ? "top" : y === 1 ? "bottom" : "middle"} ${x === 0 ? "left" : x === 1 ? "right" : "center"}`} onClick={() => setAnchor({ x, y })} />))}
        </div>
        <button type="submit" className="muse-button button-primary" disabled={!valid || !changed}>Set size</button>
      </form>
      {!valid && <p className="small-label" role="alert">Width and height can be {CANVAS_LIMITS.min}–{CANVAS_LIMITS.max}.</p>}
  </>;
}
