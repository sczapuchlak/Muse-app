/**
 * Envision → Vision Boards (#118): freeform collages. A board owns its background, its layered elements and the
 * image files it uploaded. Everything else in Muse is referenced, never copied:
 * - An element may point at one Aspiration or Bucket List dream: `{kind, id, label}` where `label` is the name
 *   snapshot taken when it was linked. Renaming or deleting that record never moves, restyles or removes the element.
 * - Boards never create Tasks, goals or Rituals. Intentions may reference a board by id (see lib/intentions/model).
 *
 * Coordinates are board units on a fixed canvas (see `boardSizes`), independent of the screen. Element `x`/`y` is
 * the element's centre, so rotation pivots naturally. Array order is layer order: the last element is on top.
 * Parsing drops what it doesn't understand but never content it does.
 */
import { isHexColor, type CustomGradient } from "../appearance-values";
import { isCropShape, sticker, type CropShape } from "./shapes";
import { isDecorShape, type DecorShape } from "./decor";
import { builtinIdOk, collectPaths, hex, num, optHex, parseAsset, parseGradient, parseFinish, parsePaint, parseShadow, parseStroke, str, type Asset, type Finish, type Hex, type Paint, type PatternPaint, type Shadow, type Stroke } from "./paint";
export type { Asset, Hex } from "./paint";

export const boardSizes = {
  landscape: { w: 1600, h: 1200, label: "Landscape" },
  portrait: { w: 1200, h: 1600, label: "Portrait" },
  square: { w: 1400, h: 1400, label: "Square" },
} as const;
/** A preset, or `custom` with its own `canvas` dimensions (#187: flexible canvas, independent of zoom). */
export type BoardSize = keyof typeof boardSizes | "custom";
export const isBoardSize = (v: unknown): v is BoardSize => typeof v === "string" && (v in boardSizes || v === "custom");
export const CANVAS_LIMITS = { min: 400, max: 8000 } as const;
export type Canvas = { w: number; h: number };
export const parseCanvas = (w: unknown, h: unknown): Canvas | undefined =>
  typeof w === "number" && typeof h === "number" && Number.isFinite(w) && Number.isFinite(h) ? { w: Math.round(num(w, CANVAS_LIMITS.min, CANVAS_LIMITS.max, 1600)), h: Math.round(num(h, CANVAS_LIMITS.min, CANVAS_LIMITS.max, 1200)) } : undefined;

export const boardPeriods = [
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
] as const;
export type BoardPeriod = typeof boardPeriods[number]["id"];
export const isBoardPeriod = (v: unknown): v is BoardPeriod => boardPeriods.some((p) => p.id === v);

export type Background = { kind: "solid"; color: Hex } | { kind: "gradient"; gradient: CustomGradient } | { kind: "pattern"; paint: PatternPaint };
/** Non-destructive crop: the shape, how far the photo is zoomed inside it, and where it sits (-1…1 on each axis). */
export type Crop = { shape: CropShape; zoom: number; x: number; y: number };
export type ElementLink = { kind: "aspiration" | "bucket"; id: string; label: string };
/** A die-cut edge: paint (solid, gradient or pattern) at a thickness in board units, following the visible silhouette. */
export type Outline = { color: Hex; width: number; paint?: Paint };
export const fonts = [
  { id: "editorial", label: "Editorial" },
  { id: "clean", label: "Clean" },
  { id: "label", label: "Label" },
] as const;
export type FontId = typeof fonts[number]["id"];

/** `groupId` ties pieces together (they select, move and transform as one); `opacity` is 0.05–1. */
type Base = { id: string; x: number; y: number; w: number; h: number; rotation: number; locked?: boolean; link?: ElementLink; opacity?: number; groupId?: string };
export type ImageElement = Base & {
  kind: "image"; image: Asset; crop: Crop;
  border?: { color: Hex; width: number; paint?: Paint }; shadow?: boolean;
  /** A die-cut sticker outline that follows the transparent edge of a cutout (or the crop shape). */
  outline?: Outline;
  /** Corner radius for rectangle crops, in board units. */
  radius?: number;
  /** Sticker finish over the image and its outline. */
  finish?: Finish;
  /** A custom shadow (when absent, `shadow: true` uses the classic soft drop shadow). */
  shadowStyle?: Shadow;
  /** Reserved for background removal (pending approval): the cutout beside the untouched original, and which one shows. */
  cutout?: Asset; useCutout?: boolean;
};
export type TextElement = Base & {
  kind: "text"; text: string; font: FontId; size: number; color: Hex; bold?: boolean; italic?: boolean; align: "left" | "center" | "right"; highlight?: Hex;
  /** #187 typography: a font family from the catalog (overrides `font`), weight, spacing (em) and line height. */
  family?: string; weight?: number; letterSpacing?: number; lineHeight?: number;
  /** Solid or gradient letters (overrides `color`), an outline, a drop shadow and a glow. */
  paint?: Paint; stroke?: { color: Hex; width: number }; shadowStyle?: Shadow; glow?: { color: Hex; blur: number };
  /** Writing elements: a heading level or a paragraph (wraps to its width; resizing changes the width, not the type size). */
  role?: TextRole;
};
export type TextRole = "h1" | "h2" | "h3" | "p";
export type StickerElement = Base & { kind: "sticker"; sticker: string; color: Hex; paint?: Paint; shadowStyle?: Shadow; finish?: Finish };
/** A decorative shape: scrapbook paper, a photo backing, a frame, a label. Fill and border can each be any paint. */
export type ShapeElement = Base & { kind: "shape"; shape: DecorShape; fill?: Paint; stroke?: Stroke; radius?: number; shadowStyle?: Shadow; finish?: Finish; role?: "backing" | "paper" | "frame" };
/** A piece from Muse's built-in creative library (paper scraps, washi tape, stickers, labels, frames, illustrations). */
export type PieceElement = Base & { kind: "piece"; piece: string; outline?: Outline; finish?: Finish; shadowStyle?: Shadow };
export type BoardElement = ImageElement | TextElement | StickerElement | ShapeElement | PieceElement;

/**
 * Visions (#187 follow-up): a Vision is a freeform board or a Book. A Book is a cover (preset + customization) and up
 * to eight content pages, each an ordinary board canvas (its own background and elements) at the book's page size.
 * While a Book is open, `elements`/`background` mirror the page being edited; `pages` is the saved truth.
 */
export type BoardFormat = "board" | "book";
export const MAX_PAGES = 8;
export type BookPage = { id: string; title: string; background: Background; elements: BoardElement[] };
export const coverPresets = ["classic", "celestial", "romantic", "editorial", "whimsical"] as const;
export type CoverPreset = typeof coverPresets[number];
export type BookCover = { preset: CoverPreset; title: string; subtitle?: string; caption?: string; palette: number; family?: string; image?: Asset; pattern?: PatternPaint };

export type VisionBoard = {
  id: string; title: string; description: string; theme: string;
  period: BoardPeriod | null; periodStart: string | null; size: BoardSize; canvas?: Canvas;
  background: Background; elements: BoardElement[];
  format?: BoardFormat; pages?: BookPage[]; cover?: BookCover;
  revision: number; createdAt: string; updatedAt: string;
};
export const isBook = (b: Pick<VisionBoard, "format">) => b.format === "book";

export const MAX_ELEMENTS = 300;
/** `text` allows a few paragraphs of writing (Paragraph elements). */
export const LIMITS = { title: 120, description: 2000, theme: 60, text: 4000, pageTitle: 80 } as const;
export const defaultBackground: Background = { kind: "gradient", gradient: { colors: ["#fde2e4", "#e2ece9", "#fff1e6"], angle: 135 } };
export const backgroundPresets: { id: string; label: string; background: Background }[] = [
  { id: "petal", label: "Petal", background: defaultBackground },
  { id: "paper", label: "Paper", background: { kind: "solid", color: "#fbf7f0" } },
  { id: "sunset", label: "Sunset", background: { kind: "gradient", gradient: { colors: ["#ffcf99", "#ff8fab"], angle: 135 } } },
  { id: "lagoon", label: "Lagoon", background: { kind: "gradient", gradient: { colors: ["#a0e7e5", "#b4f8c8", "#fbe7c6"], angle: 135 } } },
  { id: "dusk", label: "Dusk", background: { kind: "gradient", gradient: { colors: ["#2b1055", "#7597de"], angle: 180 } } },
  { id: "noir", label: "Noir", background: { kind: "solid", color: "#16141c" } },
];

// ---------- Small validators ----------
const idOk = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9-]{1,64}$/.test(v);
const recordIdOk = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_.:/-]{1,100}$/.test(v);
const dateOk = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function parseBackground(v: unknown): Background {
  const o = v && typeof v === "object" ? v as Record<string, unknown> : {};
  if (o.kind === "solid" && typeof o.color === "string" && isHexColor(o.color)) return { kind: "solid", color: o.color.toLowerCase() as Hex };
  if (o.kind === "gradient") { const gradient = parseGradient(o.gradient); if (gradient) return { kind: "gradient", gradient }; }
  if (o.kind === "pattern") { const paint = parsePaint(o.paint); if (paint?.kind === "pattern") return { kind: "pattern", paint }; }
  return defaultBackground;
}
function parseLink(v: unknown): ElementLink | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  if ((o.kind !== "aspiration" && o.kind !== "bucket") || !recordIdOk(o.id)) return undefined;
  return { kind: o.kind, id: o.id, label: str(o.label, 200) || "Untitled" };
}
export function parseCrop(v: unknown): Crop {
  const o = v && typeof v === "object" ? v as Record<string, unknown> : {};
  return { shape: isCropShape(o.shape) ? o.shape : "rect", zoom: num(o.zoom, 1, 4, 1), x: num(o.x, -1, 1, 0), y: num(o.y, -1, 1, 0) };
}
const SPAN = 20000; // generous room off-canvas so a half-visible element is never clamped back

function parseElement(v: unknown): BoardElement | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  if (!idOk(o.id)) return undefined;
  const link = parseLink(o.link);
  const opacity = typeof o.opacity === "number" && o.opacity < 1 ? num(o.opacity, 0.05, 1, 1) : undefined;
  const base: Base = { id: o.id, x: num(o.x, -SPAN, SPAN, 0), y: num(o.y, -SPAN, SPAN, 0), w: num(o.w, 4, SPAN, 200), h: num(o.h, 4, SPAN, 200), rotation: num(o.rotation, -360, 360, 0), ...(o.locked === true ? { locked: true } : {}), ...(link ? { link } : {}), ...(opacity !== undefined ? { opacity } : {}), ...(idOk(o.groupId) ? { groupId: o.groupId } : {}) };
  const shadowStyle = parseShadow(o.shadowStyle), finish = parseFinish(o.finish);
  const extras = { ...(shadowStyle ? { shadowStyle } : {}), ...(finish ? { finish } : {}) };
  if (o.kind === "image") {
    const image = parseAsset(o.image);
    if (!image) return undefined;
    const cutout = parseAsset(o.cutout), b = o.border as Record<string, unknown> | undefined, ol = o.outline as Record<string, unknown> | undefined;
    return {
      ...base, kind: "image", image, crop: parseCrop(o.crop),
      ...(b && typeof b === "object" ? { border: { color: hex(b.color, "#ffffff"), width: num(b.width, 1, 60, 12), ...paintOf(b.paint) } } : {}),
      ...(o.shadow === true ? { shadow: true } : {}),
      ...(parseOutline(ol) ? { outline: parseOutline(ol)! } : {}),
      ...(typeof o.radius === "number" && o.radius > 0 ? { radius: num(o.radius, 0, 2000, 0) } : {}),
      ...extras,
      ...(cutout ? { cutout, ...(o.useCutout === true ? { useCutout: true } : {}) } : {}),
    };
  }
  if (o.kind === "text") {
    const font = fonts.find((f) => f.id === o.font)?.id ?? "editorial", align = (["left", "center", "right"] as const).find((a) => a === o.align) ?? "center";
    const highlight = typeof o.highlight === "string" && isHexColor(o.highlight) ? o.highlight.toLowerCase() as Hex : undefined;
    const family = typeof o.family === "string" && /^[A-Za-z0-9 ]{2,48}$/.test(o.family) ? o.family : undefined;
    const paint = parsePaint(o.paint, false), st = o.stroke as Record<string, unknown> | undefined, glow = o.glow as Record<string, unknown> | undefined;
    return {
      ...base, kind: "text", text: str(o.text, LIMITS.text), font, size: num(o.size, 8, 400, 64), color: hex(o.color, "#2a2135"), align, ...(o.bold === true ? { bold: true } : {}), ...(o.italic === true ? { italic: true } : {}), ...(highlight ? { highlight } : {}),
      ...(family ? { family } : {}), ...(typeof o.weight === "number" ? { weight: Math.round(num(o.weight, 100, 900, 400) / 100) * 100 } : {}),
      ...(typeof o.letterSpacing === "number" ? { letterSpacing: num(o.letterSpacing, -0.2, 1, 0) } : {}), ...(typeof o.lineHeight === "number" ? { lineHeight: num(o.lineHeight, 0.7, 3, 1.2) } : {}),
      ...(paint ? { paint } : {}), ...(st && typeof st === "object" && optHex(st.color) ? { stroke: { color: optHex(st.color)!, width: num(st.width, 0.5, 40, 2) } } : {}),
      ...(shadowStyle ? { shadowStyle } : {}), ...(glow && typeof glow === "object" && optHex(glow.color) ? { glow: { color: optHex(glow.color)!, blur: num(glow.blur, 1, 120, 24) } } : {}),
      ...((["h1", "h2", "h3", "p"] as const).find((r) => r === o.role) ? { role: o.role as TextRole } : {}),
    };
  }
  if (o.kind === "sticker") {
    const id = typeof o.sticker === "string" ? o.sticker : "";
    if (!sticker(id) && !/^mark:[a-z-]{2,30}$/.test(id)) return undefined;
    return { ...base, kind: "sticker", sticker: id, color: hex(o.color, "#f4a259"), ...paintOf(o.paint), ...extras };
  }
  if (o.kind === "shape") {
    if (!isDecorShape(o.shape)) return undefined;
    const fill = parsePaint(o.fill), stroke = parseStroke(o.stroke), role = (["backing", "paper", "frame"] as const).find((r) => r === o.role);
    return { ...base, kind: "shape", shape: o.shape, ...(fill ? { fill } : {}), ...(stroke ? { stroke } : {}), ...(typeof o.radius === "number" && o.radius > 0 ? { radius: num(o.radius, 0, 2000, 0) } : {}), ...(role ? { role } : {}), ...extras };
  }
  if (o.kind === "piece") {
    if (!builtinIdOk(o.piece)) return undefined;
    const outline = parseOutline(o.outline);
    return { ...base, kind: "piece", piece: o.piece, ...(outline ? { outline } : {}), ...extras };
  }
  return undefined;
}
const paintOf = (v: unknown): { paint?: Paint } => { const paint = parsePaint(v); return paint ? { paint } : {}; };
function parseOutline(v: unknown): Outline | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>, paint = parsePaint(o.paint);
  return { color: hex(o.color, "#ffffff"), width: num(o.width, 2, 60, 10), ...(paint ? { paint } : {}) };
}
/** Book pages: up to eight, each with a title, background and elements (unknown entries are dropped). */
export function parsePages(v: unknown): BookPage[] {
  const out: BookPage[] = [], seen = new Set<string>();
  for (const raw of Array.isArray(v) ? v : []) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    if (!idOk(o.id) || seen.has(o.id)) continue;
    seen.add(o.id);
    out.push({ id: o.id, title: str(o.title, LIMITS.pageTitle).trim() || `Page ${out.length + 1}`, background: parseBackground(o.background), elements: parseElements(o.elements) });
    if (out.length >= MAX_PAGES) break;
  }
  return out;
}
export function parseCover(v: unknown, fallbackTitle = ""): BookCover {
  const o = v && typeof v === "object" ? v as Record<string, unknown> : {};
  const preset = coverPresets.find((p) => p === o.preset) ?? "classic", family = typeof o.family === "string" && /^[A-Za-z0-9 ]{2,48}$/.test(o.family) ? o.family : undefined;
  const image = parseAsset(o.image), pattern = parsePaint(o.pattern);
  return {
    preset, title: str(o.title, LIMITS.title) || fallbackTitle, palette: Math.round(num(o.palette, 0, 9, 0)),
    ...(str(o.subtitle, 120) ? { subtitle: str(o.subtitle, 120) } : {}), ...(str(o.caption, 60) ? { caption: str(o.caption, 60) } : {}),
    ...(family ? { family } : {}), ...(image ? { image } : {}), ...(pattern?.kind === "pattern" ? { pattern } : {}),
  };
}
export function parseElements(v: unknown): BoardElement[] {
  const seen = new Set<string>(), out: BoardElement[] = [];
  for (const raw of Array.isArray(v) ? v : []) {
    const e = parseElement(raw);
    if (!e || seen.has(e.id)) continue;
    seen.add(e.id); out.push(e);
    if (out.length >= MAX_ELEMENTS) break;
  }
  return out;
}

/** Validates a board's own fields; the period start snaps to the start of its period. */
export function periodStartFor(period: BoardPeriod, date: string): string {
  const y = date.slice(0, 4), m = Number(date.slice(5, 7));
  if (period === "year") return `${y}-01-01`;
  if (period === "quarter") return `${y}-${String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, "0")}-01`;
  return `${y}-${String(m).padStart(2, "0")}-01`;
}
export function periodLabel(period: BoardPeriod | null, start: string | null): string {
  if (!period || !start) return "";
  const y = start.slice(0, 4), m = Number(start.slice(5, 7));
  if (period === "year") return y;
  if (period === "quarter") return `Q${Math.floor((m - 1) / 3) + 1} ${y}`;
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${start}T12:00:00Z`));
}

/** The board's canvas in board units: a preset size or its own custom dimensions. */
export function canvasOf(b: Pick<VisionBoard, "size" | "canvas">): Canvas {
  if (b.size === "custom" && b.canvas) return b.canvas;
  const preset = boardSizes[b.size === "custom" ? "landscape" : b.size];
  return { w: preset.w, h: preset.h };
}
export function blankBoard(id: string, now: string, init: Partial<Pick<VisionBoard, "title" | "description" | "theme" | "period" | "periodStart" | "size" | "background">> = {}): VisionBoard {
  return { id, title: "", description: "", theme: "", period: null, periodStart: null, size: "landscape", background: defaultBackground, elements: [], revision: 0, createdAt: now, updatedAt: now, ...init };
}
export function boardFieldsValid(b: Pick<VisionBoard, "title" | "period" | "periodStart">): string | null {
  if (!b.title.trim()) return "Give the board a name.";
  if (b.title.trim().length > LIMITS.title) return "Keep the name under 120 characters.";
  if (b.period && (!b.periodStart || !dateOk(b.periodStart))) return "Choose when this board is for.";
  return null;
}

// ---------- Element operations (pure; every one returns a new array) ----------
export const boardBox = (b: Pick<VisionBoard, "size" | "canvas">) => canvasOf(b);
export const indexOf = (els: BoardElement[], id: string) => els.findIndex((e) => e.id === id);
export function updateElement(els: BoardElement[], id: string, patch: Partial<BoardElement>): BoardElement[] {
  return els.map((e) => e.id === id ? { ...e, ...patch } as BoardElement : e);
}
export function removeElement(els: BoardElement[], id: string): BoardElement[] { return els.filter((e) => e.id !== id); }
/** Copies an element (keeping its link, which is just a reference) slightly offset, directly above the original. */
export function duplicateElement(els: BoardElement[], id: string, newId: string): BoardElement[] {
  const i = indexOf(els, id);
  if (i < 0 || els.length >= MAX_ELEMENTS) return els;
  const copy = { ...structuredCloneSafe(els[i]), id: newId, x: els[i].x + 32, y: els[i].y + 32 } as BoardElement;
  delete copy.locked;
  return [...els.slice(0, i + 1), copy, ...els.slice(i + 1)];
}
export type LayerMove = "forward" | "backward" | "front" | "back";
export function moveLayer(els: BoardElement[], id: string, move: LayerMove): BoardElement[] {
  const i = indexOf(els, id);
  if (i < 0) return els;
  const j = move === "front" ? els.length - 1 : move === "back" ? 0 : move === "forward" ? Math.min(els.length - 1, i + 1) : Math.max(0, i - 1);
  if (i === j) return els;
  const next = [...els], [e] = next.splice(i, 1);
  next.splice(j, 0, e);
  return next;
}
function structuredCloneSafe<T>(v: T): T { return JSON.parse(JSON.stringify(v)) as T; }

/** A new element's size: fits within a third of the board, keeps the photo's proportions. */
export function fitImage(board: Pick<VisionBoard, "size" | "canvas">, asset: Pick<Asset, "width" | "height">, maxShare = 0.38): { w: number; h: number } {
  const box = boardBox(board), max = Math.min(box.w, box.h) * maxShare * 1.4, ratio = asset.width / asset.height;
  return ratio >= 1 ? { w: Math.round(max), h: Math.round(max / ratio) } : { w: Math.round(max * ratio), h: Math.round(max) };
}
/** Where the next element lands: around the middle, nudged so a stack of new things doesn't hide itself. */
export function nextPlacement(board: Pick<VisionBoard, "size" | "canvas">, count: number): { x: number; y: number; rotation: number } {
  const box = boardBox(board), step = (count % 7) - 3;
  return { x: Math.round(box.w / 2 + step * 36), y: Math.round(box.h / 2 + step * 24), rotation: [-4, 3, -2, 5, -3, 2, 0][count % 7] };
}
/** Applying a crop shape with a fixed ratio (square, circle, star) squares the frame around its centre. */
export function withCropShape(e: ImageElement, shape: CropShape, ratio: number | null): ImageElement {
  if (!ratio) return { ...e, crop: { ...e.crop, shape } };
  const side = Math.round(Math.sqrt(e.w * e.h));
  return { ...e, w: side, h: side, crop: { ...e.crop, shape } };
}
/**
 * How the photo sits in its frame: cover-fit, then zoomed, then shifted. Returns the drawn rectangle in frame units
 * (0,0 is the frame's top-left). `x`/`y` of -1…1 move across the overflow, so the frame is always filled.
 */
export function cropRect(frame: { w: number; h: number }, image: { width: number; height: number }, crop: Pick<Crop, "zoom" | "x" | "y">) {
  const scale = Math.max(frame.w / image.width, frame.h / image.height) * crop.zoom, w = image.width * scale, h = image.height * scale;
  const ox = (w - frame.w) / 2, oy = (h - frame.h) / 2;
  return { x: -ox + crop.x * ox, y: -oy + crop.y * oy, w, h };
}

/** Image paths a set of boards still use (for deciding which files are safe to remove). */
export function usedPaths(boards: (Pick<VisionBoard, "elements"> & { background?: Background; pages?: BookPage[]; cover?: BookCover })[]): Set<string> {
  const out = new Set<string>();
  for (const b of boards) { collectPaths(b.elements, out); if (b.background) collectPaths(b.background, out); if (b.pages) collectPaths(b.pages, out); if (b.cover) collectPaths(b.cover, out); }
  return out;
}

// ---------- Undo / redo ----------
/** One undo step. `size`/`canvas` are recorded too, so adding board space undoes like any other edit. */
export type Snapshot = { elements: BoardElement[]; background: Background; size?: BoardSize; canvas?: Canvas; pages?: BookPage[]; page?: number; cover?: BookCover };
export type History = { past: Snapshot[]; future: Snapshot[] };
export const HISTORY_LIMIT = 80;
export const emptyHistory = (): History => ({ past: [], future: [] });
/** Records `before` as an undo step (a new edit clears redo). */
export function record(h: History, before: Snapshot): History { return { past: [...h.past, before].slice(-HISTORY_LIMIT), future: [] }; }
export function undo(h: History, current: Snapshot): { history: History; snapshot: Snapshot } | null {
  const prev = h.past.at(-1);
  return prev ? { history: { past: h.past.slice(0, -1), future: [current, ...h.future] }, snapshot: prev } : null;
}
export function redo(h: History, current: Snapshot): { history: History; snapshot: Snapshot } | null {
  const [next, ...rest] = h.future;
  return next ? { history: { past: [...h.past, current].slice(-HISTORY_LIMIT), future: rest }, snapshot: next } : null;
}

/** Display for a link: the name as it was linked, plus whether the record was renamed or is gone. */
export function linkStatus(l: ElementLink, live: { label: string } | undefined): { label: string; note?: string; missing: boolean } {
  if (!live) return { label: l.label, note: "no longer there", missing: true };
  return live.label.trim() && live.label !== l.label ? { label: l.label, note: `now “${live.label}”`, missing: false } : { label: l.label, missing: false };
}

// ---------- Library ----------
export const boardSorts = [
  { id: "updated", label: "Recently edited" },
  { id: "created", label: "Newest" },
  { id: "title", label: "A–Z" },
] as const;
export type BoardSort = typeof boardSorts[number]["id"];
export type PeriodFilter = "all" | BoardPeriod | "none";
export function libraryView(boards: VisionBoard[], q: string, period: PeriodFilter, sort: BoardSort): VisionBoard[] {
  const needle = q.trim().toLowerCase();
  const out = boards.filter((b) => (period === "all" || (period === "none" ? !b.period : b.period === period))
    && (!needle || [b.title, b.description, b.theme, periodLabel(b.period, b.periodStart)].some((s) => s.toLowerCase().includes(needle))));
  return out.sort((a, b) => sort === "title" ? a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) : sort === "created" ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt));
}
