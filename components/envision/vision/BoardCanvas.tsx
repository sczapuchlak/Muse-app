"use client";
import Konva from "konva";
import { Group, Image as KImage, Layer, Path, Rect, Stage, Text, Transformer } from "react-konva";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { boardBox, cropRect, type Background, type BoardElement, type ImageElement, type StickerElement, type TextElement, type VisionBoard } from "@/lib/vision-boards/model";
import { cropShapes, scalePath, shapePaths, sticker as stickerDef, type CropShape } from "@/lib/vision-boards/shapes";
import { useBoardImage } from "./images";
import { iconPathData, markIconFor } from "./icons";

/**
 * Vision Boards canvas (#118), built on Konva. One renderer for the editor, the library previews and Intentions,
 * so a board looks the same everywhere. Everything is drawn in board units; the stage scale maps them to the screen.
 */
Konva.hitOnDragEnabled = true; // lets a second finger pinch while the first is dragging

// ---------- Fonts ----------
let fontCache: Record<string, string> | null = null;
export function fontFamily(font: TextElement["font"]): string {
  if (typeof document === "undefined") return "serif";
  fontCache ??= {};
  const key = font === "editorial" ? "--font-editorial" : "--font-ui";
  return fontCache[key] ??= getComputedStyle(document.documentElement).getPropertyValue(key).trim() || (font === "editorial" ? "Georgia, serif" : "Helvetica, Arial, sans-serif");
}
const textProps = (e: TextElement) => ({
  text: e.font === "label" ? e.text.toUpperCase() : e.text,
  fontFamily: fontFamily(e.font), fontSize: e.size,
  fontStyle: [e.italic ? "italic" : "", e.bold || e.font === "label" ? "bold" : e.font === "editorial" ? "normal" : "500"].filter(Boolean).join(" ") || "normal",
  letterSpacing: e.font === "label" ? e.size * 0.12 : 0, lineHeight: e.font === "editorial" ? 1.12 : 1.25, align: e.align, width: e.w, padding: e.highlight ? e.size * 0.22 : 0,
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

// ---------- Paint ----------
export function gradientPoints(angle: number, w: number, h: number) {
  const a = (angle * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a), len = Math.abs(w * dx) + Math.abs(h * dy);
  return { start: { x: w / 2 - (dx * len) / 2, y: h / 2 - (dy * len) / 2 }, end: { x: w / 2 + (dx * len) / 2, y: h / 2 + (dy * len) / 2 } };
}
function backgroundFill(bg: Background, w: number, h: number) {
  if (bg.kind === "solid") return { fill: bg.color };
  const colors = bg.gradient.colors.filter(Boolean) as string[], p = gradientPoints(bg.gradient.angle, w, h);
  return { fillLinearGradientStartPoint: p.start, fillLinearGradientEndPoint: p.end, fillLinearGradientColorStops: colors.flatMap((c, i) => [i / (colors.length - 1), c]) };
}
function shapePath(shape: CropShape, w: number, h: number): Path2D {
  const p = new Path2D();
  p.addPath(new Path2D(shapePaths[shape]), new DOMMatrix([w, 0, 0, h, 0, 0]));
  return p;
}

// ---------- Sticker outline for transparent images ----------
const outlineCache = new Map<string, HTMLCanvasElement>();
/** Draws the image fattened by `px` in a solid color behind itself: the classic die-cut sticker edge. */
function outlined(img: HTMLImageElement, key: string, color: string, px: number): HTMLCanvasElement {
  const id = `${key}|${color}|${Math.round(px)}`, hit = outlineCache.get(id);
  if (hit) return hit;
  const pad = Math.ceil(px), canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth + pad * 2; canvas.height = img.naturalHeight + pad * 2;
  const ctx = canvas.getContext("2d")!;
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; ctx.drawImage(img, pad + Math.cos(a) * px, pad + Math.sin(a) * px); }
  ctx.globalCompositeOperation = "source-in"; ctx.fillStyle = color; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over"; ctx.drawImage(img, pad, pad);
  if (outlineCache.size > 40) outlineCache.delete(outlineCache.keys().next().value!);
  outlineCache.set(id, canvas);
  return canvas;
}

// ---------- Elements ----------
type NodeProps<E extends BoardElement> = { e: E; pixelScale: number; preview: boolean };

function ImageNode({ e, pixelScale, preview }: NodeProps<ImageElement>) {
  const asset = e.useCutout && e.cutout ? e.cutout : e.image;
  // Full-size only when it will be shown large; small or zoomed-out elements use the 400px copy (memory on phones).
  const wantFull = !preview && Math.max(e.w, e.h) * pixelScale > 440;
  const thumb = useBoardImage(asset.thumbnailPath), full = useBoardImage(wantFull ? asset.path : undefined);
  const img = (wantFull && full) || thumb || full;
  const frame = { w: e.w, h: e.h }, shape = e.crop.shape;
  const free = shape === "rect" && !!asset.alpha; // transparent art isn't framed: it keeps its own edge
  const r = img ? cropRect(frame, { width: img.naturalWidth, height: img.naturalHeight }, e.crop) : null;
  if (img === null) return <Group><Rect width={e.w} height={e.h} fill="#f3eef7" stroke="#9b8fb0" dash={[10, 8]} strokeWidth={3} /><Text width={e.w} height={e.h} align="center" verticalAlign="middle" text="Image unavailable" fontSize={Math.max(14, e.w / 14)} fill="#6b5f80" /></Group>;
  if (!img || !r) return <Rect width={e.w} height={e.h} fill="#ffffff" opacity={0.35} />;
  const shadow = e.shadow ? { shadowColor: "#1b1027", shadowBlur: Math.max(8, e.w * 0.04), shadowOpacity: 0.35, shadowOffset: { x: 0, y: Math.max(4, e.w * 0.015) } } : {};
  if (free) {
    if (e.outline) {
      const px = e.outline.width * (img.naturalWidth / r.w), src = outlined(img, asset.path + (img === thumb ? ":t" : ""), e.outline.color, px), k = r.w / img.naturalWidth;
      return <KImage image={src} x={r.x - px * k} y={r.y - px * k} width={src.width * k} height={src.height * k} {...shadow} perfectDrawEnabled={false} />;
    }
    return <KImage image={img} x={r.x} y={r.y} width={r.w} height={r.h} {...shadow} perfectDrawEnabled={false} />;
  }
  const outline = scalePath(shapePaths[shape], e.w, e.h);
  return <>
    {e.shadow && <Path data={outline} fill="#ffffff" {...shadow} listening={false} perfectDrawEnabled={false} />}
    <Group clipFunc={() => [shapePath(shape, e.w, e.h)] as unknown as void}>
      <KImage image={img} x={r.x} y={r.y} width={r.w} height={r.h} perfectDrawEnabled={false} />
      {/* The border sits inside the edge (stroke is centred, so twice the width, half of it clipped away). */}
      {e.border && <Path data={outline} stroke={e.border.color} strokeWidth={e.border.width * 2} lineJoin="round" listening={false} perfectDrawEnabled={false} />}
    </Group>
  </>;
}
function TextNode({ e }: NodeProps<TextElement>) {
  return <>
    {e.highlight && <Rect width={e.w} height={e.h} fill={e.highlight} cornerRadius={e.size * 0.12} listening={false} />}
    <Text {...textProps(e)} height={e.h} verticalAlign="middle" fill={e.color} perfectDrawEnabled={false} />
  </>;
}
function StickerNode({ e }: NodeProps<StickerElement>) {
  const def = stickerDef(e.sticker), mark = markIconFor(e.sticker), d = def?.d ?? (mark ? iconPathData(mark) : null);
  if (!d) return <Rect width={e.w} height={e.h} />;
  const [bw, bh] = def?.box ?? [24, 24], mode = def?.mode ?? "stroke";
  return <>
    <Rect width={e.w} height={e.h} fill="transparent" />{/* an easy target for thin line stickers */}
    <Path data={d} scaleX={e.w / bw} scaleY={e.h / bh} opacity={def?.opacity ?? 1} perfectDrawEnabled={false}
      {...(mode === "fill" ? { fill: e.color } : { stroke: e.color, strokeWidth: mark ? 1.8 : 2.2, lineCap: "round", lineJoin: "round", strokeScaleEnabled: true })} />
  </>;
}
function ElementBody(props: NodeProps<BoardElement>) {
  const { e } = props;
  if (e.kind === "image") return <ImageNode {...props} e={e} />;
  if (e.kind === "text") return <TextNode {...props} e={e} />;
  return <StickerNode {...props} e={e} />;
}

// ---------- Stage ----------
export type View = { scale: number; x: number; y: number };
export function fitView(board: Pick<VisionBoard, "size">, width: number, height: number, margin = 24): View {
  const box = boardBox(board), scale = Math.max(0.05, Math.min((width - margin * 2) / box.w, (height - margin * 2) / box.h));
  return { scale, x: (width - box.w * scale) / 2, y: (height - box.h * scale) / 2 };
}
type Editing = {
  selectedId: string | null; onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<BoardElement>) => void;
  view: View; onView: (v: View) => void;
};

/** Read-only board scaled to `width` (library cards, Intentions). */
export function BoardPreview({ board, width }: { board: Pick<VisionBoard, "size" | "background" | "elements">; width: number }) {
  const box = boardBox(board), scale = width / box.w;
  useFontsReady();
  return <Stage width={width} height={Math.round(box.h * scale)} scaleX={scale} scaleY={scale} listening={false}>
    <Layer listening={false}>
      <Rect width={box.w} height={box.h} {...backgroundFill(board.background, box.w, box.h)} />
      {board.elements.map((e) => <Group key={e.id} x={e.x} y={e.y} offsetX={e.w / 2} offsetY={e.h / 2} rotation={e.rotation}><ElementBody e={e} pixelScale={scale} preview /></Group>)}
    </Layer>
  </Stage>;
}

/** The editing canvas: select, drag, resize, rotate; pan with a drag on empty board, a wheel or two fingers. */
export function BoardEditorStage({ board, width, height, editing, stageRef }: { board: VisionBoard; width: number; height: number; editing: Editing; stageRef?: RefObject<Konva.Stage | null> }) {
  const { selectedId, onSelect, onChange, view, onView } = editing;
  const box = boardBox(board);
  useFontsReady();
  const nodes = useRef(new Map<string, Konva.Group>()), tr = useRef<Konva.Transformer>(null), localStage = useRef<Konva.Stage>(null);
  const stage = stageRef ?? localStage;
  const selected = board.elements.find((e) => e.id === selectedId);
  const coarse = useMemo(() => typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches, []);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  useEffect(() => {
    const t = tr.current; if (!t) return;
    const node = selected && !selected.locked ? nodes.current.get(selected.id) : undefined;
    t.nodes(node ? [node] : []);
    t.getLayer()?.batchDraw();
  }, [selected, board.elements]);

  const pinch = useRef<{ dist: number; center: { x: number; y: number } } | null>(null);
  const zoomAt = (point: { x: number; y: number }, nextScale: number, base: View = view): View => {
    const scale = Math.min(4, Math.max(0.08, nextScale)), bx = (point.x - base.x) / base.scale, by = (point.y - base.y) / base.scale;
    return { scale, x: point.x - bx * scale, y: point.y - by * scale };
  };
  const keepRatio = !selected || selected.kind !== "image" || cropShapes.find((s) => s.id === selected.crop.shape)?.ratio != null || !!selected.image.alpha;

  return <Stage ref={stage} width={width} height={height} x={view.x} y={view.y} scaleX={view.scale} scaleY={view.scale}
    draggable onDragEnd={(ev) => { if (ev.target === ev.target.getStage()) onView({ ...view, x: ev.target.x(), y: ev.target.y() }); }}
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
    onMouseDown={(ev) => { if (ev.target === ev.target.getStage() || ev.target.name() === "board-bg") onSelect(null); }}
    onTouchStart={(ev) => { if (ev.evt.touches.length === 1 && (ev.target === ev.target.getStage() || ev.target.name() === "board-bg")) onSelect(null); }}>
    <Layer>
      <Rect name="board-bg" width={box.w} height={box.h} {...backgroundFill(board.background, box.w, box.h)} shadowColor="#000" shadowBlur={30 / view.scale} shadowOpacity={0.18} shadowOffset={{ x: 0, y: 6 / view.scale }} />
      {board.elements.map((e) => <Group key={e.id} ref={(n) => { if (n) nodes.current.set(e.id, n); else nodes.current.delete(e.id); }}
        x={e.x} y={e.y} offsetX={e.w / 2} offsetY={e.h / 2} rotation={e.rotation} draggable={!e.locked}
        onMouseDown={() => onSelect(e.id)} onTap={() => onSelect(e.id)} onDragStart={() => onSelect(e.id)}
        onDragEnd={(ev) => onChange(e.id, { x: Math.round(ev.target.x()), y: Math.round(ev.target.y()) })}
        onTransformEnd={(ev) => {
          const n = ev.target, sx = Math.abs(n.scaleX()), sy = Math.abs(n.scaleY());
          n.scaleX(1); n.scaleY(1);
          const base = { x: Math.round(n.x()), y: Math.round(n.y()), rotation: Math.round(n.rotation() * 10) / 10 };
          if (e.kind === "text") { const size = Math.min(400, Math.max(8, Math.round(e.size * sy * 10) / 10)), w = Math.max(40, Math.round(e.w * sx)); onChange(e.id, { ...base, size, w, h: measureText({ ...e, size, w }) } as Partial<TextElement>); }
          else onChange(e.id, { ...base, w: Math.max(12, Math.round(e.w * sx)), h: Math.max(12, Math.round(e.h * sy)) });
        }}>
        <ElementBody e={e} pixelScale={view.scale * dpr} preview={false} />
      </Group>)}
      <Transformer ref={tr} rotateEnabled keepRatio={keepRatio} flipEnabled={false} ignoreStroke
        enabledAnchors={keepRatio ? ["top-left", "top-right", "bottom-left", "bottom-right"] : ["top-left", "top-center", "top-right", "middle-right", "middle-left", "bottom-left", "bottom-center", "bottom-right"]}
        rotationSnaps={[0, 90, 180, 270]} rotationSnapTolerance={4} anchorSize={coarse ? 22 : 11} anchorCornerRadius={coarse ? 11 : 6} rotateAnchorOffset={coarse ? 36 : 26}
        borderStroke="#8050cf" anchorStroke="#8050cf" anchorFill="#ffffff" borderStrokeWidth={1.5}
        boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 16 || Math.abs(newBox.height) < 16 ? oldBox : newBox)} />
    </Layer>
  </Stage>;
}
