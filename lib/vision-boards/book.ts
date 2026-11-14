/**
 * Visions: pure operations for Books (ordered pages of ordinary board canvases) and safe conversions between a Book
 * and a Vision Board. Nothing here mutates; every element keeps its kind, styling and position within its page.
 */
import { canvasOf, CANVAS_LIMITS, defaultBackground, MAX_ELEMENTS, MAX_PAGES, type Background, type BoardElement, type BookCover, type BookPage, type Canvas, type VisionBoard } from "./model";
import type { Paint } from "./paint";

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
/** Copies elements with fresh ids (and fresh group ids, kept together), so pages never share element identities. */
export function freshElements(els: BoardElement[], newId: () => string): BoardElement[] {
  const groups = new Map<string, string>();
  return els.map((e) => {
    const c = clone(e); c.id = newId();
    if (c.groupId) { if (!groups.has(c.groupId)) groups.set(c.groupId, newId()); c.groupId = groups.get(c.groupId); }
    return c;
  });
}

export const newPage = (id: string, n: number, background: Background = defaultBackground): BookPage => ({ id, title: `Page ${n}`, background: clone(background), elements: [] });
export const canAddPage = (pages: BookPage[]) => pages.length < MAX_PAGES;
/** A blank page after `after` (its background follows the page it comes after, for a consistent book). */
export function addPage(pages: BookPage[], after: number, id: string): BookPage[] {
  if (!canAddPage(pages)) return pages;
  const at = Math.min(pages.length, Math.max(0, after + 1)), bg = pages[Math.max(0, at - 1)]?.background ?? defaultBackground;
  return [...pages.slice(0, at), newPage(id, pages.length + 1, bg), ...pages.slice(at)];
}
export function duplicatePage(pages: BookPage[], i: number, pageId: string, newId: () => string): BookPage[] {
  const src = pages[i];
  if (!src || !canAddPage(pages)) return pages;
  const copy: BookPage = { id: pageId, title: `${src.title} (copy)`.slice(0, 80), background: clone(src.background), elements: freshElements(src.elements, newId) };
  return [...pages.slice(0, i + 1), copy, ...pages.slice(i + 1)];
}
/** A book always keeps at least one content page. */
export const removePage = (pages: BookPage[], i: number): BookPage[] => pages.length <= 1 ? pages : pages.filter((_, k) => k !== i);
/** Moves a whole page (its contents untouched) to a new position. */
export function movePage(pages: BookPage[], from: number, to: number): BookPage[] {
  if (from === to || from < 0 || from >= pages.length) return pages;
  const out = [...pages], [p] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(out.length, to)), 0, p);
  return out;
}
export const renamePage = (pages: BookPage[], i: number, title: string): BookPage[] => pages.map((p, k) => (k === i ? { ...p, title: title.slice(0, 80) } : p));
/** In a spread, pages pair up (1–2, 3–4, …): the page beside page `i`, if there is one. */
export const spreadPartner = (i: number, n: number): number | undefined => { const j = i % 2 === 0 ? i + 1 : i - 1; return j >= 0 && j < n ? j : undefined; };
/** One page as a drawable board (for previews, the viewer and exports). */
export const pageBoard = (b: Pick<VisionBoard, "size" | "canvas">, p: BookPage) => ({ size: b.size, canvas: b.canvas, background: p.background, elements: p.elements });

export const defaultCover = (title: string, preset: BookCover["preset"] = "classic"): BookCover => ({ preset, title, palette: 0 });

/** Vision Board → Book: the board becomes page 1, exactly as it was (same size, background and pieces). Reversible. */
export function boardToBook(b: Pick<VisionBoard, "title" | "elements" | "background">, pageId: string, preset: BookCover["preset"] = "classic"): Pick<VisionBoard, "format" | "pages" | "cover"> {
  return { format: "book", pages: [{ id: pageId, title: "Page 1", background: clone(b.background), elements: clone(b.elements) }], cover: defaultCover(b.title, preset) };
}
/** Book → Vision Board for a one-page book: that page becomes the board. */
export function singlePageToBoard(b: Pick<VisionBoard, "pages">): Pick<VisionBoard, "format" | "elements" | "background" | "pages" | "cover"> | null {
  const p = b.pages?.length === 1 ? b.pages[0] : null;
  return p ? { format: "board", elements: clone(p.elements), background: clone(p.background), pages: undefined, cover: undefined } : null;
}
const paintOfBackground = (bg: Background): Paint => bg.kind === "solid" ? { kind: "solid", color: bg.color } : bg.kind === "gradient" ? { kind: "gradient", gradient: bg.gradient } : bg.paint;

/**
 * Book → one board with every page laid out side by side (wrapping into rows to stay within the largest board).
 * Each page's background becomes an editable "paper" shape behind its pieces; every piece keeps its position within
 * its page, its styling and its layer order. Never flattens anything into an image. Returns a reason instead when the
 * combined board can't hold everything (size or piece limits), so nothing is silently dropped.
 */
export function combinePages(b: Pick<VisionBoard, "size" | "canvas" | "pages">, newId: () => string, gap = 80): { ok: true; canvas: Canvas; elements: BoardElement[]; background: Background } | { ok: false; reason: string } {
  const pages = b.pages ?? [], page = canvasOf(b);
  if (!pages.length) return { ok: false, reason: "This book has no pages to combine." };
  const total = pages.reduce((n, p) => n + p.elements.length + 1, 0);
  if (total > MAX_ELEMENTS) return { ok: false, reason: `Together these pages hold ${total} pieces (with their page backgrounds), more than the ${MAX_ELEMENTS} a board can hold. Export the book, or combine a copy with fewer pieces.` };
  const cols = Math.max(1, Math.min(pages.length, Math.floor((CANVAS_LIMITS.max + gap) / (page.w + gap)))), rows = Math.ceil(pages.length / cols);
  const canvas = { w: cols * page.w + (cols - 1) * gap, h: rows * page.h + (rows - 1) * gap };
  if (canvas.w > CANVAS_LIMITS.max || canvas.h > CANVAS_LIMITS.max) return { ok: false, reason: `These pages laid out together would be ${canvas.w}×${canvas.h}, larger than the biggest board (${CANVAS_LIMITS.max}×${CANVAS_LIMITS.max}). Export the book as a PDF instead, or convert a copy with fewer pages.` };
  const elements: BoardElement[] = [];
  pages.forEach((p, k) => {
    const ox = (k % cols) * (page.w + gap), oy = Math.floor(k / cols) * (page.h + gap);
    elements.push({ id: newId(), kind: "shape", shape: "rect", role: "paper", x: ox + page.w / 2, y: oy + page.h / 2, w: page.w, h: page.h, rotation: 0, fill: paintOfBackground(p.background), locked: true });
    for (const e of freshElements(p.elements, newId)) elements.push({ ...e, x: e.x + ox, y: e.y + oy });
  });
  return { ok: true, canvas, elements, background: { kind: "solid", color: "#f4f1ec" } };
}
