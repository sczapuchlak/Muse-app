"use client";
import Konva from "konva";
import { Group, Image as KImage, Layer, Line, Rect, Shape, Stage, Text, Transformer } from "react-konva";
import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode, type RefObject } from "react";
import { boardBox, cropRect, type Background, type BoardElement, type ImageElement, type PieceElement, type ShapeElement, type StickerElement, type TextElement, type VisionBoard } from "@/lib/vision-boards/model";
import { defaultShadow, solid, type Finish, type Paint, type Shadow } from "@/lib/vision-boards/paint";
import { cropShapes, sticker as stickerDef } from "@/lib/vision-boards/shapes";
import { decorPath, decorShapes, evenOddShapes, seedOf } from "@/lib/vision-boards/decor";
import { libraryItem } from "@/lib/vision-boards/library";
import { catalogFont, ensureFont, familyCss, nearestWeight } from "@/lib/vision-boards/fonts";
import { snapBox, type Box, type Guide } from "@/lib/vision-boards/editing";
import { useBoardImage, usePublicImage } from "./images";
import { iconPathData, markIconFor } from "./icons";
import { dieCut, drawFinish, fillPath, gradientPoints, silhouette, strokePath, type PatternSource } from "./paintCanvas";

export { gradientPoints } from "./paintCanvas";

/**
 * Vision Boards canvas (#118, #187), built on Konva. One renderer for the editor, the library previews, Intentions and
 * exports, so a board looks the same everywhere. Everything is drawn in board units; the stage scale maps them to the
 * screen. Paint (solid, gradient, pattern), die-cut outlines and finishes come from ./paintCanvas.
 */
Konva.hitOnDragEnabled = true; // lets a second finger pinch while the first is dragging

/** How sharp images should be: library thumbnails, chosen by on-screen size, or full resolution (exports). */
type Quality = "thumb" | "auto" | "full";
type Ctx = CanvasRenderingContext2D;
type NodeProps<E extends BoardElement> = { e: E; pixelScale: number; quality: Quality; phase: MutableRefObject<number> };

// ---------- Fonts ----------
let fontCache: Record<string, string> | null = null;
export function fontFamily(font: TextElement["font"]): string {
  if (typeof document === "undefined") return "serif";
  fontCache ??= {};
  const key = font === "editorial" ? "--font-editorial" : "--font-ui";
  return fontCache[key] ??= getComputedStyle(document.documentElement).getPropertyValue(key).trim() || (font === "editorial" ? "Georgia, serif" : "Helvetica, Arial, sans-serif");
}
export const textWeight = (e: TextElement) => e.family ? nearestWeight(catalogFont(e.family), e.weight ?? (e.bold ? 700 : 400)) : e.weight ?? (e.bold || e.font === "label" ? 700 : e.font === "editorial" ? 400 : 500);
const textProps = (e: TextElement) => ({
  text: e.font === "label" && !e.family ? e.text.toUpperCase() : e.text,
  fontFamily: e.family ? familyCss(e.family) : fontFamily(e.font), fontSize: e.size,
  fontStyle: `${e.italic ? "italic " : ""}${textWeight(e)}`,
  letterSpacing: e.letterSpacing !== undefined ? e.letterSpacing * e.size : e.font === "label" && !e.family ? e.size * 0.12 : 0,
  lineHeight: e.lineHeight ?? (e.font === "editorial" && !e.family ? 1.12 : 1.25), align: e.align, width: e.w, padding: e.highlight ? e.size * 0.22 : 0,
});
/** A text box's height for its words, width and type (so its centre stays put while typing). */
export function measureText(e: TextElement): number {
  const t = new Konva.Text(textProps(e)), h = t.height();
  t.destroy();
  return Math.max(e.size * 0.8, Math.round(h));
}
/** Redraws once web fonts finish loading, so text never stays in the fallback face. */
function useFontsReady() {
  const [ready, setReady] = useState(() => typeof document === "undefined" || document.fonts?.status === "loaded");
  useEffect(() => { if (!ready) document.fonts?.ready.then(() => { fontCache = null; setReady(true); }); }, [ready]);
  return ready;
}
/** Loads a catalog family the first time a board shows it, then redraws. */
function useFamily(family: string | undefined, weight: number, italic: boolean) {
  const [, bump] = useState(0);
  useEffect(() => { if (family) void ensureFont(family, weight, italic).then(() => bump((n) => n + 1)); }, [family, weight, italic]);
}

// ---------- Paint sources ----------
/** The image behind a pattern paint (built-in library art, or an upload), and whether it repeats. */
function usePatternSource(paint: Paint | undefined, quality: Quality): PatternSource | undefined {
  const builtin = paint?.kind === "pattern" && paint.pattern.source === "builtin" ? libraryItem(paint.pattern.id) : undefined;
  const asset = paint?.kind === "pattern" && paint.pattern.source === "asset" ? paint.pattern : undefined;
  const pub = usePublicImage(builtin?.src);
  const priv = useBoardImage(asset ? (quality === "full" ? asset.asset.path : asset.asset.thumbnailPath) : undefined);
  if (paint?.kind !== "pattern") return undefined;
  if (builtin) return { img: pub, tileable: builtin.tileable };
  if (asset) return { img: priv, tileable: asset.tile !== false };
  return { img: null, tileable: false };
}
/** Shadows are set on the raw canvas, so they're converted to device pixels here (Konva would do this for its own). */
function applyShadow(ctx: Ctx, s: Shadow) {
  const t = ctx.getTransform(), k = Math.hypot(t.a, t.b), hex = s.color.replace("#", ""), n = parseInt(hex.length === 3 ? hex.replace(/./g, "$&$&") : hex, 16);
  ctx.shadowColor = `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${s.opacity})`;
  ctx.shadowBlur = s.blur * k; ctx.shadowOffsetX = s.x * k; ctx.shadowOffsetY = s.y * k;
}
const clearShadow = (ctx: Ctx) => { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; };
const konvaShadow = (s: Shadow | undefined) => s ? { shadowColor: s.color, shadowBlur: s.blur, shadowOpacity: s.opacity, shadowOffset: { x: s.x, y: s.y } } : {};
/** The classic soft photo shadow, sized to the piece. */
const photoShadow = (w: number): Shadow => ({ color: "#1b1027", blur: Math.max(8, w * 0.04), x: 0, y: Math.max(4, w * 0.015), opacity: 0.35 });

/**
 * A path filled and/or stroked with any paint, with an optional shadow and finish. The border follows the real
 * geometry (rounded corners, scallops, hearts), because it strokes the very same path.
 */
function PaintedPath({ path, w, h, fill, stroke, shadow, finish, evenOdd, quality, phase, name, listening = true }: {
  path: Path2D; w: number; h: number; fill?: Paint; stroke?: { paint: Paint; width: number }; shadow?: Shadow; finish?: Finish; evenOdd?: boolean;
  quality: Quality; phase?: MutableRefObject<number>; name?: string; listening?: boolean;
}) {
  const fillSrc = usePatternSource(fill, quality), strokeSrc = usePatternSource(stroke?.paint, quality), rule: CanvasFillRule = evenOdd ? "evenodd" : "nonzero";
  return <Shape name={name} width={w} height={h} listening={listening} perfectDrawEnabled={false}
    sceneFunc={(con) => {
      const ctx = con._context as Ctx;
      ctx.save();
      if (shadow) applyShadow(ctx, shadow);
      if (fill) { fillPath(ctx, path, fill, w, h, fillSrc, rule); clearShadow(ctx); }
      if (stroke) strokePath(ctx, path, stroke.paint, stroke.width, w, h, strokeSrc);
      clearShadow(ctx);
      if (finish) drawFinish(ctx, finish, w, h, path, phase?.current ?? 0);
      ctx.restore();
    }}
    hitFunc={(con, node) => {
      const ctx = con._context as Ctx, key = (node as unknown as { colorKey: string }).colorKey;
      ctx.fillStyle = key; ctx.fill(path, rule);
      if (stroke) { ctx.lineWidth = Math.max(stroke.width, 12); ctx.strokeStyle = key; ctx.stroke(path); }
    }} />;
}
const usePath = (d: string) => useMemo(() => new Path2D(d), [d]);

// ---------- Die-cut bitmaps ----------
const rasters = new Map<string, HTMLCanvasElement>();
/** SVG library art drawn at a working resolution, so silhouettes and finishes stay crisp at large sizes. */
function raster(img: HTMLImageElement, key: string, long = 1200): HTMLImageElement | HTMLCanvasElement {
  if (!/\.svg($|\?)/i.test(img.src)) return img;
  const hit = rasters.get(key); if (hit) return hit;
  const k = long / Math.max(img.naturalWidth || 1, img.naturalHeight || 1), c = document.createElement("canvas");
  c.width = Math.round((img.naturalWidth || 1) * k); c.height = Math.round((img.naturalHeight || 1) * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  rasters.set(key, c);
  return c;
}
const bases = new Map<string, HTMLCanvasElement>();
/**
 * A die-cut sticker: the art with its outline in any paint, as one bitmap (cached), then the finish drawn live on top
 * (so a holographic shimmer can move without rebuilding the outline). Drawn at x,y,w,h in the element's units.
 */
function StickerBitmap({ img, keyId, x, y, w, h, outlinePx, outlinePaint, finish, shadow, phase, quality }: {
  img: HTMLImageElement | HTMLCanvasElement; keyId: string; x: number; y: number; w: number; h: number; outlinePx: number; outlinePaint: Paint | null;
  finish?: Finish; shadow?: Shadow; phase: MutableRefObject<number>; quality: Quality;
}) {
  const src = usePatternSource(outlinePaint ?? undefined, quality);
  const ready = outlinePaint?.kind !== "pattern" || !!src?.img;
  const id = `${keyId}|${Math.round(outlinePx)}|${JSON.stringify(outlinePaint)}|${ready}`;
  let base = bases.get(id);
  if (!base) { base = dieCut(img, keyId, outlinePx, outlinePaint, src, undefined); if (bases.size > 40) bases.delete(bases.keys().next().value!); bases.set(id, base); }
  const sil = silhouette(img, keyId, outlinePaint ? outlinePx : 0), b = base;
  return <Shape x={x} y={y} width={w} height={h} perfectDrawEnabled={false}
    sceneFunc={(con) => {
      const ctx = con._context as Ctx;
      ctx.save();
      if (shadow) applyShadow(ctx, shadow);
      ctx.drawImage(b, 0, 0, w, h);
      clearShadow(ctx);
      if (finish) { ctx.scale(w / b.width, h / b.height); drawFinish(ctx, finish, b.width, b.height, sil, phase.current); }
      ctx.restore();
    }}
    hitFunc={(con, node) => { const ctx = con._context as Ctx; ctx.fillStyle = (node as unknown as { colorKey: string }).colorKey; ctx.fillRect(0, 0, w, h); }} />;
}

// ---------- Elements ----------
function Placeholder({ w, h, label }: { w: number; h: number; label: string }) {
  return <Group><Rect width={w} height={h} fill="#f3eef7" stroke="#9b8fb0" dash={[10, 8]} strokeWidth={3} /><Text width={w} height={h} align="center" verticalAlign="middle" text={label} fontSize={Math.max(14, w / 14)} fill="#6b5f80" /></Group>;
}
function ImageNode({ e, pixelScale, quality, phase }: NodeProps<ImageElement>) {
  const asset = e.useCutout && e.cutout ? e.cutout : e.image;
  // Full size only when it will be shown large (or exported); otherwise the 400px copy (memory on phones).
  const wantFull = quality === "full" || (quality === "auto" && Math.max(e.w, e.h) * pixelScale > 440);
  const thumb = useBoardImage(quality === "full" ? undefined : asset.thumbnailPath), full = useBoardImage(wantFull ? asset.path : undefined);
  const img = (wantFull && full) || thumb || full;
  const shape = e.crop.shape, radius = shape === "rect" || shape === "square" ? e.radius ?? 0 : 0;
  const free = shape === "rect" && !!asset.alpha && !radius; // transparent art isn't framed: it keeps its own edge
  const d = useMemo(() => decorPath(shape, e.w, e.h, radius), [shape, e.w, e.h, radius]), path = usePath(d);
  const ringD = useMemo(() => e.outline && !free ? decorPath(shape, e.w, e.h, radius) : "", [e.outline, free, shape, e.w, e.h, radius]), ring = usePath(ringD || "M0 0");
  const shadow = e.shadowStyle ?? (e.shadow ? photoShadow(e.w) : undefined);
  const r = img ? cropRect({ w: e.w, h: e.h }, { width: img.naturalWidth, height: img.naturalHeight }, e.crop) : null;
  if (img === null) return <Placeholder w={e.w} h={e.h} label="Image unavailable" />;
  if (!img || !r) return <Rect width={e.w} height={e.h} fill="#ffffff" opacity={0.35} />;
  const outlinePaint = e.outline ? e.outline.paint ?? solid(e.outline.color) : null;
  if (free) {
    if (e.outline || e.finish) {
      const k = r.w / img.naturalWidth, px = e.outline ? e.outline.width / k : 0;
      return <StickerBitmap img={img} keyId={asset.path + (img === thumb ? ":t" : "")} x={r.x - px * k} y={r.y - px * k} w={(img.naturalWidth + px * 2) * k} h={(img.naturalHeight + px * 2) * k}
        outlinePx={px} outlinePaint={outlinePaint} finish={e.finish} shadow={shadow} phase={phase} quality={quality} />;
    }
    return <KImage image={img} x={r.x} y={r.y} width={r.w} height={r.h} {...konvaShadow(shadow)} perfectDrawEnabled={false} />;
  }
  return <>
    {/* A die-cut edge around a shaped crop: the same path, stroked outward in any paint. */}
    {outlinePaint && e.outline && <PaintedPath path={ring} w={e.w} h={e.h} fill={outlinePaint} stroke={{ paint: outlinePaint, width: e.outline.width * 2 }} shadow={shadow} quality={quality} listening={false} />}
    {!outlinePaint && shadow && <PaintedPath path={path} w={e.w} h={e.h} fill={solid("#ffffff")} shadow={shadow} quality={quality} listening={false} />}
    {/* Konva applies `context.clip(...returned)` itself: return the path (clipping here as well would clip to nothing). */}
    <Group clipFunc={() => [path] as unknown as void}>
      <KImage image={img} x={r.x} y={r.y} width={r.w} height={r.h} perfectDrawEnabled={false} />
      {/* The border sits inside the edge (stroke is centred, so twice the width, half of it clipped away). */}
      {e.border && <PaintedPath path={path} w={e.w} h={e.h} stroke={{ paint: e.border.paint ?? solid(e.border.color), width: e.border.width * 2 }} quality={quality} listening={false} />}
      {e.finish && <PaintedPath path={path} w={e.w} h={e.h} finish={e.finish} phase={phase} quality={quality} listening={false} />}
    </Group>
  </>;
}
function TextNode({ e }: NodeProps<TextElement>) {
  useFamily(e.family, textWeight(e), !!e.italic);
  const props = textProps(e), paint = e.paint;
  const fill = paint?.kind === "gradient"
    ? (() => { const colors = paint.gradient.colors.filter(Boolean) as string[], p = gradientPoints(paint.gradient.angle, e.w, e.h); return { fillLinearGradientStartPoint: p.start, fillLinearGradientEndPoint: p.end, fillLinearGradientColorStops: colors.flatMap((c, i) => [i / (colors.length - 1), c]) }; })()
    : { fill: paint?.kind === "solid" ? paint.color : e.color };
  const stroke = e.stroke ? { stroke: e.stroke.color, strokeWidth: e.stroke.width * 2, fillAfterStrokeEnabled: true, lineJoin: "round" as const } : {};
  return <>
    {e.highlight && <Rect width={e.w} height={e.h} fill={e.highlight} cornerRadius={e.size * 0.12} listening={false} />}
    {e.glow && [0, 1].map((i) => <Text key={i} {...props} height={e.h} verticalAlign="middle" {...fill} shadowColor={e.glow!.color} shadowBlur={e.glow!.blur * (i ? 0.45 : 1)} shadowOpacity={1} listening={false} perfectDrawEnabled={false} />)}
    <Text {...props} height={e.h} verticalAlign="middle" {...fill} {...stroke} {...konvaShadow(e.shadowStyle)} perfectDrawEnabled={false} />
  </>;
}
function StickerNode({ e, quality, phase }: NodeProps<StickerElement>) {
  const def = stickerDef(e.sticker), mark = markIconFor(e.sticker), d = def?.d ?? (mark ? iconPathData(mark) : null);
  const [bw, bh] = def?.box ?? [24, 24], mode = def?.mode ?? "stroke";
  const path = useMemo(() => { const p = new Path2D(); if (d) p.addPath(new Path2D(d), new DOMMatrix().scale(e.w / bw, e.h / bh)); return p; }, [d, e.w, e.h, bw, bh]);
  if (!d) return <Rect width={e.w} height={e.h} />;
  const paint = e.paint ?? solid(e.color), lw = (mark ? 1.8 : 2.2) * Math.min(e.w / bw, e.h / bh);
  return <Group opacity={def?.opacity ?? 1}>
    <Rect width={e.w} height={e.h} fill="transparent" />{/* an easy target for thin line stickers */}
    {mode === "fill" ? <PaintedPath path={path} w={e.w} h={e.h} fill={paint} shadow={e.shadowStyle} finish={e.finish} phase={phase} quality={quality} />
      : <PaintedPath path={path} w={e.w} h={e.h} stroke={{ paint, width: lw }} shadow={e.shadowStyle} quality={quality} />}
  </Group>;
}
function ShapeNode({ e, quality, phase }: NodeProps<ShapeElement>) {
  const d = useMemo(() => decorPath(e.shape, e.w, e.h, e.radius ?? 0, seedOf(e.id)), [e.shape, e.w, e.h, e.radius, e.id]), path = usePath(d);
  return <PaintedPath path={path} w={e.w} h={e.h} fill={e.fill} stroke={e.stroke} shadow={e.shadowStyle} finish={e.finish} evenOdd={evenOddShapes.includes(e.shape)} phase={phase} quality={quality} />;
}
function PieceNode({ e, quality, phase }: NodeProps<PieceElement>) {
  const item = libraryItem(e.piece), img = usePublicImage(item?.src);
  if (!item || img === null) return <Placeholder w={e.w} h={e.h} label="Piece unavailable" />;
  if (!img) return <Rect width={e.w} height={e.h} fill="#ffffff" opacity={0.25} />;
  if (e.outline || e.finish) {
    const src = raster(img, item.id), sw = (src as HTMLImageElement).naturalWidth || src.width, k = e.w / sw, px = e.outline ? e.outline.width / k : 0;
    return <StickerBitmap img={src} keyId={item.id} x={-px * k} y={-px * k} w={e.w + px * 2 * k} h={e.h + px * 2 * k}
      outlinePx={px} outlinePaint={e.outline ? e.outline.paint ?? solid(e.outline.color) : null} finish={e.finish} shadow={e.shadowStyle} phase={phase} quality={quality} />;
  }
  return <KImage image={img} width={e.w} height={e.h} {...konvaShadow(e.shadowStyle)} perfectDrawEnabled={false} />;
}
function ElementBody(props: NodeProps<BoardElement>) {
  const { e } = props;
  if (e.kind === "image") return <ImageNode {...props} e={e} />;
  if (e.kind === "text") return <TextNode {...props} e={e} />;
  if (e.kind === "shape") return <ShapeNode {...props} e={e} />;
  if (e.kind === "piece") return <PieceNode {...props} e={e} />;
  return <StickerNode {...props} e={e} />;
}
/** The board itself: a solid, gradient or pattern background, as one paintable rectangle. */
function BoardBackground({ bg, w, h, quality, editing }: { bg: Background; w: number; h: number; quality: Quality; editing?: boolean }) {
  const path = usePath(`M0 0H${w}V${h}H0Z`);
  const fill: Paint = bg.kind === "solid" ? solid(bg.color) : bg.kind === "gradient" ? { kind: "gradient", gradient: bg.gradient } : bg.paint;
  return <>
    {editing && <Rect width={w} height={h} fill="#ffffff" shadowColor="#000" shadowBlur={30} shadowOpacity={0.18} shadowOffset={{ x: 0, y: 6 }} listening={false} />}
    <PaintedPath name="board-bg" path={path} w={w} h={h} fill={fill} quality={quality} />
  </>;
}

// ---------- Stage ----------
export type View = { scale: number; x: number; y: number };
export function fitView(board: Pick<VisionBoard, "size" | "canvas">, width: number, height: number, margin = 24): View {
  const box = boardBox(board), scale = Math.max(0.03, Math.min((width - margin * 2) / box.w, (height - margin * 2) / box.h));
  return { scale, x: (width - box.w * scale) / 2, y: (height - box.h * scale) / 2 };
}
export type Patch = { id: string; patch: Partial<BoardElement> };
type Editing = {
  selectedIds: string[]; onSelect: (ids: string[], mode?: "replace" | "toggle" | "only") => void;
  onChangeMany: (patches: Patch[], key?: string) => void;
  view: View; onView: (v: View) => void;
  snapping: boolean; selectMode: boolean; reducedMotion: boolean;
};
const reduced = () => typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.magic === "quiet");

/** Read-only board scaled to `width` (library cards, Intentions, exports at full quality). */
export function BoardPreview({ board, width, quality = "thumb", stageRef }: { board: Pick<VisionBoard, "size" | "canvas" | "background" | "elements">; width: number; quality?: Quality; stageRef?: RefObject<Konva.Stage | null> }) {
  const box = boardBox(board), scale = width / box.w, phase = useRef(0);
  useFontsReady();
  return <Stage ref={stageRef} width={width} height={Math.round(box.h * scale)} scaleX={scale} scaleY={scale} listening={false}>
    <Layer listening={false}>
      <BoardBackground bg={board.background} w={box.w} h={box.h} quality={quality} />
      {board.elements.map((e) => <Group key={e.id} x={e.x} y={e.y} offsetX={e.w / 2} offsetY={e.h / 2} rotation={e.rotation} opacity={e.opacity ?? 1}><ElementBody e={e} pixelScale={scale} quality={quality} phase={phase} /></Group>)}
    </Layer>
  </Stage>;
}

/**
 * The editing canvas: select (tap, Shift/⌘-click, or drag a box in Select mode), drag, resize and rotate one or many
 * pieces with snapping guides; pan with a drag on empty space, a wheel or two fingers; pinch or ⌘-scroll to zoom.
 * The area outside the board is a pasteboard: pieces can rest there, dimmed, and exports leave them out.
 */
export function BoardEditorStage({ board, width, height, editing, stageRef }: { board: VisionBoard; width: number; height: number; editing: Editing; stageRef?: RefObject<Konva.Stage | null> }) {
  const { selectedIds, onSelect, onChangeMany, view, onView, snapping, selectMode } = editing;
  const box = boardBox(board);
  useFontsReady();
  const nodes = useRef(new Map<string, Konva.Group>()), tr = useRef<Konva.Transformer>(null), localStage = useRef<Konva.Stage>(null), layerRef = useRef<Konva.Layer>(null);
  const stage = stageRef ?? localStage, phase = useRef(0);
  const selected = board.elements.filter((e) => selectedIds.includes(e.id));
  const coarse = useMemo(() => typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches, []);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const [guides, setGuides] = useState<Guide[]>([]);
  const [marquee, setMarquee] = useState<Box | null>(null), marqueeStart = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const t = tr.current; if (!t) return;
    t.nodes(selected.filter((e) => !e.locked).map((e) => nodes.current.get(e.id)).filter((n): n is Konva.Group => !!n));
    t.getLayer()?.batchDraw();
  }, [selected, board.elements]);
  // Holographic shimmer: a slow sheen in the editor only, off for reduced motion (exports are always still).
  const shimmering = !editing.reducedMotion && board.elements.some((e) => "finish" in e && e.finish?.kind === "holo" && e.finish.shimmer);
  useEffect(() => {
    if (!shimmering || !layerRef.current) return;
    let last = 0;
    const anim = new Konva.Animation((f) => { if (!f || f.time - last < 50) return false; last = f.time; phase.current = (f.time / 4000) % 1; return true; }, layerRef.current);
    anim.start();
    return () => { anim.stop(); phase.current = 0; };
  }, [shimmering]);

  // ---------- Snapping (shared by every dragged piece, so a multi-selection never drifts apart) ----------
  const drag = useRef<{ start: Map<string, { x: number; y: number }>; union: Box; others: Box[]; scale: number } | null>(null);
  const alt = useRef(false);
  useEffect(() => {
    const k = (ev: KeyboardEvent) => { alt.current = ev.altKey; };
    window.addEventListener("keydown", k); window.addEventListener("keyup", k);
    return () => { window.removeEventListener("keydown", k); window.removeEventListener("keyup", k); };
  }, []);
  const rectOf = (n: Konva.Node) => { const r = n.getClientRect({ relativeTo: layerRef.current ?? undefined, skipShadow: true, skipStroke: true }); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const beginDrag = (lead: string) => {
    const ids = selectedIds.includes(lead) ? selectedIds : [lead], start = new Map<string, { x: number; y: number }>(), boxes: Box[] = [];
    for (const id of ids) { const n = nodes.current.get(id); if (n) { start.set(id, n.getAbsolutePosition()); boxes.push(rectOf(n)); } }
    const others = board.elements.filter((e) => !ids.includes(e.id)).map((e) => nodes.current.get(e.id)).filter((n): n is Konva.Group => !!n).map(rectOf);
    const x0 = Math.min(...boxes.map((b) => b.x)), y0 = Math.min(...boxes.map((b) => b.y));
    drag.current = { start, others, scale: view.scale, union: { x: x0, y: y0, w: Math.max(...boxes.map((b) => b.x + b.w)) - x0, h: Math.max(...boxes.map((b) => b.y + b.h)) - y0 } };
  };
  const guideFrame = useRef(0);
  const bound = (id: string) => (pos: Konva.Vector2d) => {
    const s = drag.current, st = s?.start.get(id);
    if (!s || !st || !snapping || alt.current) return pos;
    const d = { x: (pos.x - st.x) / s.scale, y: (pos.y - st.y) / s.scale };
    const snap = snapBox({ ...s.union, x: s.union.x + d.x, y: s.union.y + d.y }, s.others, box, 7 / s.scale);
    cancelAnimationFrame(guideFrame.current); guideFrame.current = requestAnimationFrame(() => setGuides(snap.guides));
    return { x: pos.x + snap.dx * s.scale, y: pos.y + snap.dy * s.scale };
  };
  // Every dragged piece reports its end; one commit records the whole move as a single undo step.
  const commit = useRef(false);
  const endDrag = () => {
    if (commit.current) return;
    commit.current = true;
    queueMicrotask(() => {
      commit.current = false;
      const s = drag.current, ids = s ? [...s.start.keys()] : selectedIds;
      const patches: Patch[] = []; for (const id of ids) { const n = nodes.current.get(id); if (n) patches.push({ id, patch: { x: Math.round(n.x()), y: Math.round(n.y()) } }); }
      drag.current = null; setGuides([]);
      onChangeMany(patches, `drag:${Date.now()}`);
    });
  };
  const endTransform = () => {
    const t = tr.current; if (!t) return;
    const patches: Patch[] = [];
    for (const n of t.nodes()) {
      const e = board.elements.find((x) => nodes.current.get(x.id) === n); if (!e) continue;
      const sx = Math.abs(n.scaleX()), sy = Math.abs(n.scaleY());
      n.scaleX(1); n.scaleY(1);
      const base = { x: Math.round(n.x()), y: Math.round(n.y()), rotation: Math.round(n.rotation() * 10) / 10 };
      if (e.kind === "text") { const size = Math.min(400, Math.max(8, Math.round(e.size * sy * 10) / 10)), w = Math.max(40, Math.round(e.w * sx)); patches.push({ id: e.id, patch: { ...base, size, w, h: measureText({ ...e, size, w }) } as Partial<TextElement> }); }
      else patches.push({ id: e.id, patch: { ...base, w: Math.max(12, Math.round(e.w * sx)), h: Math.max(12, Math.round(e.h * sy)) } });
    }
    onChangeMany(patches, `transform:${Date.now()}`);
  };

  const pinch = useRef<{ dist: number; center: { x: number; y: number } } | null>(null);
  const zoomAt = (point: { x: number; y: number }, nextScale: number, base: View = view): View => {
    const scale = Math.min(4, Math.max(0.03, nextScale)), bx = (point.x - base.x) / base.scale, by = (point.y - base.y) / base.scale;
    return { scale, x: point.x - bx * scale, y: point.y - by * scale };
  };
  const one = selected.length === 1 ? selected[0] : null;
  const freeShape = one?.kind === "image" ? cropShapes.find((s) => s.id === one.crop.shape)?.ratio == null && !one.image.alpha
    : one?.kind === "shape" ? decorShapes.find((s) => s.id === one.shape)?.ratio == null
    : one?.kind === "piece" ? ["washi", "paper", "label", "ribbon"].includes(libraryItem(one.piece)?.kind ?? "")
    : one?.kind === "text";
  const keepRatio = !one || !freeShape;
  const toBoard = (p: { x: number; y: number }) => ({ x: (p.x - view.x) / view.scale, y: (p.y - view.y) / view.scale });
  const emptyTarget = (t: Konva.Node) => t === t.getStage() || t.name() === "board-bg";
  const pick = (id: string, additive: boolean) => onSelect([id], additive ? "toggle" : "replace");

  return <Stage ref={stage} width={width} height={height} x={view.x} y={view.y} scaleX={view.scale} scaleY={view.scale}
    draggable={!selectMode && !marquee} onDragEnd={(ev) => { if (ev.target === ev.target.getStage()) onView({ ...view, x: ev.target.x(), y: ev.target.y() }); }}
    onWheel={(ev) => {
      ev.evt.preventDefault();
      const st = ev.target.getStage()!, p = st.getPointerPosition() ?? { x: width / 2, y: height / 2 };
      if (ev.evt.ctrlKey || ev.evt.metaKey) onView(zoomAt(p, view.scale * Math.exp(-ev.evt.deltaY * 0.01)));
      else onView({ ...view, x: view.x - ev.evt.deltaX, y: view.y - ev.evt.deltaY });
    }}
    onTouchMove={(ev) => {
      const t = ev.evt.touches;
      if (t.length !== 2) { pinch.current = null; return; }
      ev.evt.preventDefault();
      const st = ev.target.getStage()!, rect = st.container().getBoundingClientRect();
      const a = { x: t[0].clientX - rect.left, y: t[0].clientY - rect.top }, b = { x: t[1].clientX - rect.left, y: t[1].clientY - rect.top };
      const dist = Math.hypot(a.x - b.x, a.y - b.y), center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (st.isDragging()) st.stopDrag();
      const last = pinch.current;
      if (last) { const zoomed = zoomAt(center, view.scale * (dist / last.dist)); onView({ ...zoomed, x: zoomed.x + center.x - last.center.x, y: zoomed.y + center.y - last.center.y }); }
      pinch.current = { dist, center };
    }}
    onTouchEnd={() => { pinch.current = null; }}
    onPointerDown={(ev) => {
      if (!emptyTarget(ev.target)) return;
      const additive = ev.evt.shiftKey || ev.evt.metaKey;
      if (selectMode || ev.evt.shiftKey) { const p = toBoard(ev.target.getStage()!.getPointerPosition()!); marqueeStart.current = p; setMarquee({ ...p, w: 0, h: 0 }); }
      if (!additive) onSelect([]);
    }}
    onPointerMove={(ev) => {
      const s = marqueeStart.current; if (!s) return;
      const p = toBoard(ev.target.getStage()!.getPointerPosition()!);
      setMarquee({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
    }}
    onPointerUp={() => {
      const m = marquee; marqueeStart.current = null; setMarquee(null);
      if (!m || (m.w < 4 && m.h < 4)) return;
      const hit = board.elements.filter((e) => { const n = nodes.current.get(e.id); if (!n) return false; const r = rectOf(n); return r.x < m.x + m.w && r.x + r.w > m.x && r.y < m.y + m.h && r.y + r.h > m.y; }).map((e) => e.id);
      if (hit.length) onSelect(hit, "toggle");
    }}>
    <Layer ref={layerRef}>
      <BoardBackground bg={board.background} w={box.w} h={box.h} quality="auto" editing />
      {board.elements.map((e) => <Group key={e.id} ref={(n) => { if (n) nodes.current.set(e.id, n); else nodes.current.delete(e.id); }}
        x={e.x} y={e.y} offsetX={e.w / 2} offsetY={e.h / 2} rotation={e.rotation} opacity={e.opacity ?? 1} draggable={!e.locked && !selectMode} dragBoundFunc={bound(e.id)}
        onMouseDown={(ev) => { if (!selectedIds.includes(e.id) || ev.evt.shiftKey || ev.evt.metaKey) pick(e.id, ev.evt.shiftKey || ev.evt.metaKey); }}
        onTap={() => { if (selectMode) pick(e.id, true); else if (!selectedIds.includes(e.id)) pick(e.id, false); }}
        onDblClick={() => { if (e.groupId) onSelect([e.id], "only"); }} onDblTap={() => { if (e.groupId) onSelect([e.id], "only"); }}
        onDragStart={() => { if (!selectedIds.includes(e.id)) pick(e.id, false); beginDrag(e.id); }}
        onDragEnd={endDrag}>
        <ElementBody e={e} pixelScale={view.scale * dpr} quality="auto" phase={phase} />
      </Group>)}
      <Transformer ref={tr} rotateEnabled keepRatio={keepRatio} flipEnabled={false} ignoreStroke shouldOverdrawWholeArea={selected.length > 1}
        enabledAnchors={keepRatio ? ["top-left", "top-right", "bottom-left", "bottom-right"] : ["top-left", "top-center", "top-right", "middle-right", "middle-left", "bottom-left", "bottom-center", "bottom-right"]}
        rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]} rotationSnapTolerance={4} anchorSize={coarse ? 22 : 11} anchorCornerRadius={coarse ? 11 : 6} rotateAnchorOffset={coarse ? 36 : 26}
        borderStroke="#8050cf" anchorStroke="#8050cf" anchorFill="#ffffff" borderStrokeWidth={1.5} onTransformEnd={endTransform}
        boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 16 || Math.abs(newBox.height) < 16 ? oldBox : newBox)} />
    </Layer>
    <Layer listening={false}>
      {/* The pasteboard: everything outside the board is dimmed (pieces can rest there; exports leave it out). */}
      <Pasteboard w={box.w} h={box.h} scale={view.scale} />
      {guides.map((g, i) => g.axis === "x"
        ? <Line key={i} points={[g.at, -20000, g.at, 20000]} stroke="#ff4fa3" strokeWidth={1 / view.scale} dash={[6 / view.scale, 4 / view.scale]} />
        : <Line key={i} points={[-20000, g.at, 20000, g.at]} stroke="#ff4fa3" strokeWidth={1 / view.scale} dash={[6 / view.scale, 4 / view.scale]} />)}
      {marquee && <Rect {...marquee} width={marquee.w} height={marquee.h} fill="rgba(128,80,207,0.12)" stroke="#8050cf" strokeWidth={1 / view.scale} dash={[5 / view.scale, 4 / view.scale]} />}
    </Layer>
  </Stage>;
}
function Pasteboard({ w, h, scale }: { w: number; h: number; scale: number }): ReactNode {
  const F = 40000, fill = "rgba(18,12,30,0.45)";
  return <>
    <Rect x={-F} y={-F} width={F * 2 + w} height={F} fill={fill} />
    <Rect x={-F} y={h} width={F * 2 + w} height={F} fill={fill} />
    <Rect x={-F} y={0} width={F} height={h} fill={fill} />
    <Rect x={w} y={0} width={F} height={h} fill={fill} />
    <Rect x={0} y={0} width={w} height={h} stroke="rgba(255,255,255,0.6)" strokeWidth={1 / scale} />
  </>;
}

// ---------- Export ----------
export { reduced as prefersReducedMotion, defaultShadow };
