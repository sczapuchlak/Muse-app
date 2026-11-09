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
import { isHexColor, validGradient, type CustomGradient } from "../appearance-values";
import { isCropShape, sticker, type CropShape } from "./shapes";

export type Hex = `#${string}`;
export const boardSizes = {
  landscape: { w: 1600, h: 1200, label: "Landscape" },
  portrait: { w: 1200, h: 1600, label: "Portrait" },
  square: { w: 1400, h: 1400, label: "Square" },
} as const;
export type BoardSize = keyof typeof boardSizes;
export const isBoardSize = (v: unknown): v is BoardSize => typeof v === "string" && v in boardSizes;

export const boardPeriods = [
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
] as const;
export type BoardPeriod = typeof boardPeriods[number]["id"];
export const isBoardPeriod = (v: unknown): v is BoardPeriod => boardPeriods.some((p) => p.id === v);

export type Background = { kind: "solid"; color: Hex } | { kind: "gradient"; gradient: CustomGradient };
/** A private image in storage. `alpha` marks images with transparency (cutouts, stickers, PNG art). */
export type Asset = { path: string; thumbnailPath: string; width: number; height: number; mime: string; alpha?: boolean; name?: string };
/** Non-destructive crop: the shape, how far the photo is zoomed inside it, and where it sits (-1…1 on each axis). */
export type Crop = { shape: CropShape; zoom: number; x: number; y: number };
export type ElementLink = { kind: "aspiration" | "bucket"; id: string; label: string };
export const fonts = [
  { id: "editorial", label: "Editorial" },
  { id: "clean", label: "Clean" },
  { id: "label", label: "Label" },
] as const;
export type FontId = typeof fonts[number]["id"];

type Base = { id: string; x: number; y: number; w: number; h: number; rotation: number; locked?: boolean; link?: ElementLink };
export type ImageElement = Base & {
  kind: "image"; image: Asset; crop: Crop;
  border?: { color: Hex; width: number }; shadow?: boolean;
  /** A sticker-style outline that follows the transparent edge of a cutout. */
  outline?: { color: Hex; width: number };
  /** Reserved for background removal (pending approval): the cutout beside the untouched original, and which one shows. */
  cutout?: Asset; useCutout?: boolean;
};
export type TextElement = Base & { kind: "text"; text: string; font: FontId; size: number; color: Hex; bold?: boolean; italic?: boolean; align: "left" | "center" | "right"; highlight?: Hex };
export type StickerElement = Base & { kind: "sticker"; sticker: string; color: Hex };
export type BoardElement = ImageElement | TextElement | StickerElement;

export type VisionBoard = {
  id: string; title: string; description: string; theme: string;
  period: BoardPeriod | null; periodStart: string | null; size: BoardSize;
  background: Background; elements: BoardElement[];
  revision: number; createdAt: string; updatedAt: string;
};

export const MAX_ELEMENTS = 300;
export const LIMITS = { title: 120, description: 2000, theme: 60, text: 1000 } as const;
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
const str = (v: unknown, max: number) => typeof v === "string" ? v.slice(0, max) : "";
const num = (v: unknown, min: number, max: number, fallback: number) => typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const idOk = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9-]{1,64}$/.test(v);
const recordIdOk = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_.:/-]{1,100}$/.test(v);
const hex = (v: unknown, fallback: Hex): Hex => typeof v === "string" && isHexColor(v) ? v.toLowerCase() as Hex : fallback;
const dateOk = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const pathOk = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}(\.thumb)?\.(webp|jpg|png)$/.test(v);

export function parseBackground(v: unknown): Background {
  const o = v && typeof v === "object" ? v as Record<string, unknown> : {};
  if (o.kind === "solid" && typeof o.color === "string" && isHexColor(o.color)) return { kind: "solid", color: o.color.toLowerCase() as Hex };
  if (o.kind === "gradient" && o.gradient && typeof o.gradient === "object") {
    const g = o.gradient as Record<string, unknown>, colors = (Array.isArray(g.colors) ? g.colors : []).filter((c): c is Hex => typeof c === "string" && isHexColor(c)).slice(0, 3);
    const gradient = { colors: colors as CustomGradient["colors"], angle: typeof g.angle === "number" ? g.angle : 135 };
    if (colors.length >= 2 && validGradient(gradient)) return { kind: "gradient", gradient };
  }
  return defaultBackground;
}
function parseAsset(v: unknown): Asset | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  if (!pathOk(o.path) || !pathOk(o.thumbnailPath)) return undefined;
  const mime = ["image/webp", "image/jpeg", "image/png"].find((m) => m === o.mime) ?? "image/webp";
  return { path: o.path, thumbnailPath: o.thumbnailPath, width: num(o.width, 1, 10000, 1), height: num(o.height, 1, 10000, 1), mime, ...(o.alpha === true ? { alpha: true } : {}), ...(str(o.name, 200) ? { name: str(o.name, 200) } : {}) };
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
  const base: Base = { id: o.id, x: num(o.x, -SPAN, SPAN, 0), y: num(o.y, -SPAN, SPAN, 0), w: num(o.w, 4, SPAN, 200), h: num(o.h, 4, SPAN, 200), rotation: num(o.rotation, -360, 360, 0), ...(o.locked === true ? { locked: true } : {}), ...(link ? { link } : {}) };
  if (o.kind === "image") {
    const image = parseAsset(o.image);
    if (!image) return undefined;
    const cutout = parseAsset(o.cutout), b = o.border as Record<string, unknown> | undefined, ol = o.outline as Record<string, unknown> | undefined;
    return {
      ...base, kind: "image", image, crop: parseCrop(o.crop),
      ...(b && typeof b === "object" ? { border: { color: hex(b.color, "#ffffff"), width: num(b.width, 1, 60, 12) } } : {}),
      ...(o.shadow === true ? { shadow: true } : {}),
      ...(ol && typeof ol === "object" ? { outline: { color: hex(ol.color, "#ffffff"), width: num(ol.width, 2, 40, 10) } } : {}),
      ...(cutout ? { cutout, ...(o.useCutout === true ? { useCutout: true } : {}) } : {}),
    };
  }
  if (o.kind === "text") {
    const font = fonts.find((f) => f.id === o.font)?.id ?? "editorial", align = (["left", "center", "right"] as const).find((a) => a === o.align) ?? "center";
    const highlight = typeof o.highlight === "string" && isHexColor(o.highlight) ? o.highlight.toLowerCase() as Hex : undefined;
    return { ...base, kind: "text", text: str(o.text, LIMITS.text), font, size: num(o.size, 8, 400, 64), color: hex(o.color, "#2a2135"), align, ...(o.bold === true ? { bold: true } : {}), ...(o.italic === true ? { italic: true } : {}), ...(highlight ? { highlight } : {}) };
  }
  if (o.kind === "sticker") {
    const id = typeof o.sticker === "string" ? o.sticker : "";
    if (!sticker(id) && !/^mark:[a-z-]{2,30}$/.test(id)) return undefined;
    return { ...base, kind: "sticker", sticker: id, color: hex(o.color, "#f4a259") };
  }
  return undefined;
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
export const boardBox = (b: Pick<VisionBoard, "size">) => boardSizes[b.size];
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
export function fitImage(board: Pick<VisionBoard, "size">, asset: Pick<Asset, "width" | "height">, maxShare = 0.38): { w: number; h: number } {
  const box = boardBox(board), max = Math.min(box.w, box.h) * maxShare * 1.4, ratio = asset.width / asset.height;
  return ratio >= 1 ? { w: Math.round(max), h: Math.round(max / ratio) } : { w: Math.round(max * ratio), h: Math.round(max) };
}
/** Where the next element lands: around the middle, nudged so a stack of new things doesn't hide itself. */
export function nextPlacement(board: Pick<VisionBoard, "size">, count: number): { x: number; y: number; rotation: number } {
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
export function usedPaths(boards: Pick<VisionBoard, "elements">[]): Set<string> {
  const out = new Set<string>();
  for (const b of boards) for (const e of b.elements) if (e.kind === "image") {
    out.add(e.image.path); out.add(e.image.thumbnailPath);
    if (e.cutout) { out.add(e.cutout.path); out.add(e.cutout.thumbnailPath); }
  }
  return out;
}

// ---------- Undo / redo ----------
export type Snapshot = { elements: BoardElement[]; background: Background };
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
