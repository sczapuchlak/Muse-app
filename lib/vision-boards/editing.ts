/**
 * Vision Boards 2.0 (#187): pure editing operations for many pieces at once. Every function returns new arrays and
 * never mutates. Groups are a shared `groupId`: grouped pieces select, move, align and transform together, and
 * ungrouping only removes the tie (no piece moves).
 */
import { canvasOf, CANVAS_LIMITS, MAX_ELEMENTS, type BoardElement, type Canvas, type VisionBoard } from "./model";

export type Box = { x: number; y: number; w: number; h: number };
const uniq = <T,>(a: T[]) => [...new Set(a)];

// ---------- Selection and groups ----------
/** The ids actually selected when these are picked: grouped pieces always come together. */
export function expandSelection(els: BoardElement[], ids: string[]): string[] {
  const groups = new Set(els.filter((e) => ids.includes(e.id) && e.groupId).map((e) => e.groupId));
  return els.filter((e) => ids.includes(e.id) || (e.groupId && groups.has(e.groupId))).map((e) => e.id);
}
export function groupElements(els: BoardElement[], ids: string[], groupId: string): BoardElement[] {
  if (ids.length < 2) return els;
  return els.map((e) => (ids.includes(e.id) ? { ...e, groupId } : e));
}
export function ungroupElements(els: BoardElement[], ids: string[]): BoardElement[] {
  return els.map((e) => (ids.includes(e.id) && e.groupId ? (() => { const rest = { ...e }; delete rest.groupId; return rest as BoardElement; })() : e));
}
export const isGrouped = (els: BoardElement[], ids: string[]) => ids.length > 1 && uniq(els.filter((e) => ids.includes(e.id)).map((e) => e.groupId)).length === 1 && !!els.find((e) => e.id === ids[0])?.groupId;

// ---------- Geometry ----------
/** The axis-aligned box a (possibly rotated) piece covers. */
export function boundsOf(e: Pick<BoardElement, "x" | "y" | "w" | "h" | "rotation">): Box {
  const a = (e.rotation * Math.PI) / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const w = e.w * c + e.h * s, h = e.w * s + e.h * c;
  return { x: e.x - w / 2, y: e.y - h / 2, w, h };
}
export function unionBox(boxes: Box[]): Box | null {
  if (!boxes.length) return null;
  const x0 = Math.min(...boxes.map((b) => b.x)), y0 = Math.min(...boxes.map((b) => b.y));
  const x1 = Math.max(...boxes.map((b) => b.x + b.w)), y1 = Math.max(...boxes.map((b) => b.y + b.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
export const selectionBox = (els: BoardElement[], ids: string[]) => unionBox(els.filter((e) => ids.includes(e.id)).map(boundsOf));
const moveBy = (els: BoardElement[], ids: string[], dx: number, dy: number) => els.map((e) => (ids.includes(e.id) && !e.locked ? { ...e, x: Math.round(e.x + dx), y: Math.round(e.y + dy) } : e));
export const moveElements = moveBy;

// ---------- Align and distribute ----------
export type Align = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";
/**
 * Aligns pieces (or whole groups, which move as one) to the selection's box, or to the board when only one unit is
 * selected (or when `toBoard`). Locked pieces stay put.
 */
export function alignElements(els: BoardElement[], ids: string[], how: Align, board: Canvas, toBoard = false): BoardElement[] {
  const units = unitsOf(els, ids);
  const target = toBoard || units.length < 2 ? { x: 0, y: 0, w: board.w, h: board.h } : selectionBox(els, ids)!;
  let out = els;
  for (const unit of units) {
    const b = selectionBox(els, unit)!;
    const dx = how === "left" ? target.x - b.x : how === "right" ? target.x + target.w - (b.x + b.w) : how === "hcenter" ? target.x + target.w / 2 - (b.x + b.w / 2) : 0;
    const dy = how === "top" ? target.y - b.y : how === "bottom" ? target.y + target.h - (b.y + b.h) : how === "vcenter" ? target.y + target.h / 2 - (b.y + b.h / 2) : 0;
    out = moveBy(out, unit, dx, dy);
  }
  return out;
}
/** Even gaps between pieces (or groups) along an axis; the first and last stay where they are. Needs three or more. */
export function distributeElements(els: BoardElement[], ids: string[], axis: "h" | "v"): BoardElement[] {
  const units = unitsOf(els, ids).map((u) => ({ ids: u, b: selectionBox(els, u)! }));
  if (units.length < 3) return els;
  const key = axis === "h" ? "x" : "y", size = axis === "h" ? "w" : "h";
  units.sort((a, b) => a.b[key] - b.b[key]);
  const first = units[0].b, last = units[units.length - 1].b;
  const span = last[key] + last[size] - first[key], total = units.reduce((n, u) => n + u.b[size], 0), gap = (span - total) / (units.length - 1);
  let cursor = first[key] + first[size] + gap, out = els;
  for (const u of units.slice(1, -1)) { const d = cursor - u.b[key]; out = moveBy(out, u.ids, axis === "h" ? d : 0, axis === "v" ? d : 0); cursor += u.b[size] + gap; }
  return out;
}
/** Selected pieces as units: each group is one unit, each ungrouped piece is its own. */
function unitsOf(els: BoardElement[], ids: string[]): string[][] {
  const out = new Map<string, string[]>();
  for (const e of els) if (ids.includes(e.id)) { const k = e.groupId ?? `#${e.id}`; out.set(k, [...(out.get(k) ?? []), e.id]); }
  return [...out.values()];
}

// ---------- Snapping ----------
export type Guide = { axis: "x" | "y"; at: number };
/**
 * Snaps a moving box to the board's edges and centre and to other pieces' edges and centres. `threshold` is in board
 * units (the caller converts from screen pixels, so snapping feels the same at any zoom). Returns the nudge and guides.
 */
export function snapBox(moving: Box, others: Box[], board: Canvas, threshold: number): { dx: number; dy: number; guides: Guide[] } {
  const xs = [0, board.w / 2, board.w, ...others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])];
  const ys = [0, board.h / 2, board.h, ...others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])];
  const mine = { x: [moving.x, moving.x + moving.w / 2, moving.x + moving.w], y: [moving.y, moving.y + moving.h / 2, moving.y + moving.h] };
  const best = (targets: number[], own: number[]) => {
    let hit: { d: number; at: number } | null = null;
    for (const t of targets) for (const m of own) { const d = t - m; if (Math.abs(d) <= threshold && (!hit || Math.abs(d) < Math.abs(hit.d))) hit = { d, at: t }; }
    return hit;
  };
  const bx = best(xs, mine.x), by = best(ys, mine.y), guides: Guide[] = [];
  if (bx) guides.push({ axis: "x", at: bx.at });
  if (by) guides.push({ axis: "y", at: by.at });
  return { dx: bx?.d ?? 0, dy: by?.d ?? 0, guides };
}

// ---------- Canvas size ----------
export type Expand = { left?: number; right?: number; top?: number; bottom?: number };
/**
 * Adds (or trims) board space on any side. Nothing is scaled or distorted, and nothing moves relative to the existing
 * art: space added on the left or top shifts every piece's coordinates by the same amount, so the composition stays
 * exactly where it was on the page. Returns the new board fields and the shift (for keeping the view steady).
 */
export function expandCanvas(b: Pick<VisionBoard, "size" | "canvas" | "elements">, by: Expand): { size: "custom"; canvas: Canvas; elements: BoardElement[]; shift: { x: number; y: number } } {
  const c = canvasOf(b);
  /** Limits a pair of edge changes so the new length stays within the canvas limits (scaled down proportionally). */
  const fit = (base: number, a = 0, z = 0): [number, number] => {
    const total = base + a + z, limit = total > CANVAS_LIMITS.max ? CANVAS_LIMITS.max : total < CANVAS_LIMITS.min ? CANVAS_LIMITS.min : total;
    if (limit === total || a + z === 0) return [Math.round(a), Math.round(z)];
    const k = (limit - base) / (a + z), ra = Math.round(a * k);
    return [ra, limit - base - ra];
  };
  const [left, right] = fit(c.w, by.left, by.right), [top, bottom] = fit(c.h, by.top, by.bottom);
  const elements = left || top ? b.elements.map((e) => ({ ...e, x: e.x + left, y: e.y + top })) : b.elements;
  return { size: "custom", canvas: { w: c.w + left + right, h: c.h + top + bottom }, elements, shift: { x: left, y: top } };
}
/** Sets exact dimensions, adding or removing space around a fixed anchor (default: the top-left stays put). */
export function resizeCanvas(b: Pick<VisionBoard, "size" | "canvas" | "elements">, w: number, h: number, anchor: { x: 0 | 0.5 | 1; y: 0 | 0.5 | 1 } = { x: 0, y: 0 }) {
  const c = canvasOf(b), dw = Math.round(w) - c.w, dh = Math.round(h) - c.h;
  return expandCanvas(b, { left: Math.round(dw * anchor.x), right: dw - Math.round(dw * anchor.x), top: Math.round(dh * anchor.y), bottom: dh - Math.round(dh * anchor.y) });
}

// ---------- Many pieces at once ----------
export function removeElements(els: BoardElement[], ids: string[]): BoardElement[] { return els.filter((e) => !ids.includes(e.id)); }
/** Copies pieces (keeping their layer order and grouping, with fresh group ids) offset slightly, above the originals. */
export function duplicateElements(els: BoardElement[], ids: string[], newId: () => string, offset = 32): { elements: BoardElement[]; ids: string[] } {
  const picked = els.filter((e) => ids.includes(e.id));
  if (!picked.length || els.length + picked.length > MAX_ELEMENTS) return { elements: els, ids: [] };
  const groups = new Map<string, string>(), copies = picked.map((e) => {
    const c = JSON.parse(JSON.stringify(e)) as BoardElement;
    c.id = newId(); c.x += offset; c.y += offset; delete c.locked;
    if (c.groupId) { if (!groups.has(c.groupId)) groups.set(c.groupId, newId()); c.groupId = groups.get(c.groupId); }
    return c;
  });
  const top = Math.max(...picked.map((e) => els.indexOf(e)));
  return { elements: [...els.slice(0, top + 1), ...copies, ...els.slice(top + 1)], ids: copies.map((c) => c.id) };
}
/** Pastes pieces from the clipboard with fresh ids, centred on `at` (or offset from where they were). */
export function pasteElements(els: BoardElement[], clip: BoardElement[], newId: () => string, at?: { x: number; y: number }): { elements: BoardElement[]; ids: string[] } {
  if (!clip.length || els.length + clip.length > MAX_ELEMENTS) return { elements: els, ids: [] };
  const box = unionBox(clip.map(boundsOf))!, dx = at ? at.x - (box.x + box.w / 2) : 32, dy = at ? at.y - (box.y + box.h / 2) : 32;
  const groups = new Map<string, string>(), copies = clip.map((e) => {
    const c = JSON.parse(JSON.stringify(e)) as BoardElement;
    c.id = newId(); c.x = Math.round(c.x + dx); c.y = Math.round(c.y + dy); delete c.locked;
    if (c.groupId) { if (!groups.has(c.groupId)) groups.set(c.groupId, newId()); c.groupId = groups.get(c.groupId); }
    return c;
  });
  return { elements: [...els, ...copies], ids: copies.map((c) => c.id) };
}
export type LayerMoveMany = "forward" | "backward" | "front" | "back";
/** Moves several pieces through the layers together, keeping their order relative to each other. */
export function moveLayers(els: BoardElement[], ids: string[], move: LayerMoveMany): BoardElement[] {
  const picked = els.filter((e) => ids.includes(e.id)), rest = els.filter((e) => !ids.includes(e.id));
  if (!picked.length || !rest.length) return els;
  if (move === "front") return [...rest, ...picked];
  if (move === "back") return [...picked, ...rest];
  const first = els.indexOf(picked[0]), last = els.indexOf(picked[picked.length - 1]);
  if (move === "forward") { const above = els.slice(last + 1).find((e) => !ids.includes(e.id)); if (!above) return els; const at = rest.indexOf(above) + 1; return [...rest.slice(0, at), ...picked, ...rest.slice(at)]; }
  const below = els.slice(0, first).reverse().find((e) => !ids.includes(e.id)); if (!below) return els;
  const at = rest.indexOf(below); return [...rest.slice(0, at), ...picked, ...rest.slice(at)];
}

// ---------- Style copy and paste ----------
const STYLE_KEYS = ["opacity", "shadow", "shadowStyle", "finish", "border", "outline", "radius", "fill", "stroke", "paint", "color", "font", "family", "weight", "bold", "italic", "letterSpacing", "lineHeight", "glow", "highlight", "align", "size"] as const;
export type StyleClip = { from: BoardElement["kind"]; style: Record<string, unknown> };
export function copyStyle(e: BoardElement): StyleClip {
  const style: Record<string, unknown> = {};
  for (const k of STYLE_KEYS) if (k in e && (e as Record<string, unknown>)[k] !== undefined) style[k] = JSON.parse(JSON.stringify((e as Record<string, unknown>)[k]));
  return { from: e.kind, style };
}
/** Which style fields a kind of piece understands (pasting never adds fields that make no sense for it). */
const accepts: Record<BoardElement["kind"], readonly string[]> = {
  image: ["opacity", "shadow", "shadowStyle", "finish", "border", "outline", "radius"],
  shape: ["opacity", "shadowStyle", "finish", "fill", "stroke", "radius"],
  piece: ["opacity", "shadowStyle", "finish", "outline"],
  sticker: ["opacity", "shadowStyle", "finish", "color", "paint"],
  text: ["opacity", "shadowStyle", "color", "paint", "font", "family", "weight", "bold", "italic", "letterSpacing", "lineHeight", "glow", "highlight", "align", "stroke", "size"],
};
export function pasteStyle(e: BoardElement, clip: StyleClip): BoardElement {
  const next = { ...e } as Record<string, unknown>;
  for (const [k, v] of Object.entries(clip.style)) {
    if (!accepts[e.kind].includes(k)) continue;
    // A shape's paint `stroke` and text's color `stroke` differ in form: only paste between like kinds.
    if (k === "stroke" && clip.from !== e.kind) continue;
    if (k === "fill" && e.kind !== "shape") continue;
    next[k] = JSON.parse(JSON.stringify(v));
  }
  return next as BoardElement;
}
