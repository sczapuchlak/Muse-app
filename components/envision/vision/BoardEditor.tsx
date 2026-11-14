"use client";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ClipboardEvent as ReactClipboardEvent, type DragEvent, type KeyboardEvent } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { uploadBoardImage } from "@/lib/data/constellation-images";
import {
  blankBoard, boardSizes, canvasOf, emptyHistory, fitImage, isBook, linkStatus, MAX_ELEMENTS, MAX_PAGES, nextPlacement, periodLabel, record, redo, undo, usedPaths,
  type Asset, type BookCover, type BookPage, type TextRole, type Background, type BoardElement, type ElementLink, type History, type ImageElement, type PieceElement, type ShapeElement, type Snapshot, type StickerElement, type TextElement, type VisionBoard,
} from "@/lib/vision-boards/model";
import {
  alignElements, copyStyle, distributeElements, duplicateElements, expandCanvas, expandSelection, groupElements, isGrouped, moveElements, moveLayers, pasteElements, pasteStyle,
  removeElements, resizeCanvas, ungroupElements, type Align, type Expand, type StyleClip,
} from "@/lib/vision-boards/editing";
import { decorShapes, type DecorShape } from "@/lib/vision-boards/decor";
import { collectPaths, defaultShadow } from "@/lib/vision-boards/paint";
import { pieceSize, searchLibrary } from "@/lib/vision-boards/library";
import { loadBoard, saveBoard } from "@/lib/vision-boards/persistence";
import { clipboardPasteError, imageFilesFromPaste, readClipboardImages } from "@/lib/vision-boards/clipboard";
import { sticker as stickerDef } from "@/lib/vision-boards/shapes";
import { pinAccent } from "@/lib/appearance-values";
import type { Aspiration } from "@/lib/aspirations/models";
import type { BucketEntry } from "@/lib/bucket-list/models";
import { GlassPopover } from "../../GlassPopover";
import { MuseIcon } from "../../MuseIcon";
import { SaveIndicator } from "../../SaveIndicator";
import { BoardEditorStage, fitView, fontFamily, measureText, prefersReducedMotion, textWeight, type Patch, type View } from "./BoardCanvas";
import { BoardDetails } from "./BoardDetails";
import { CropSheet } from "./CropSheet";
import { CutoutHint, CutoutTools, useAppleTouch, useCutoutHint } from "./CutoutHelp";
import { AssetLibrary, type LibraryPick } from "./AssetLibrary";
import { Inspector, type InspectorActions } from "./Inspector";
import { useSavedPalette } from "./PaintEditor";
import { paintCss } from "./paintCss";
import { exportBoard } from "./exportBoard";
import { markStickers } from "./icons";
import { draftKey } from "./useVisionBoards";
import { libraryItem } from "@/lib/vision-boards/library";
import { addPage, boardToBook, combinePages, duplicatePage, movePage, removePage, renamePage, singlePageToBoard, spreadPartner } from "@/lib/vision-boards/book";
import { displayBoard } from "@/lib/vision-boards/covers";
import { BoardPreview } from "./BoardCanvas";
import { BookReader, CoverInspector, PagesMenu, textPresets } from "./Book";
import { ensureFont, familyCss } from "@/lib/vision-boards/fonts";
import { paintColor } from "@/lib/vision-boards/paint";

type Lookups = { aspirations: Aspiration[]; dreams: BucketEntry[] };
type Draft = { revision: number; at: string; elements: BoardElement[]; background: Background; size?: VisionBoard["size"]; canvas?: VisionBoard["canvas"]; format?: VisionBoard["format"]; pages?: VisionBoard["pages"]; cover?: VisionBoard["cover"] };
const uid = () => crypto.randomUUID();
const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
export function elementLabel(e: BoardElement): string {
  if (e.kind === "image") return `Photo${e.image.name ? ` · ${e.image.name}` : ""}`;
  if (e.kind === "text") return `${e.role === "p" ? "Paragraph" : e.role ? "Heading" : "Text"} “${e.text.trim().slice(0, 32) || "…"}”`;
  if (e.kind === "shape") return `${e.role === "backing" ? "Backing · " : ""}${decorShapes.find((s) => s.id === e.shape)?.label ?? "Shape"}`;
  if (e.kind === "piece") return libraryItem(e.piece)?.name ?? "Library piece";
  return stickerDef(e.sticker)?.label ?? markStickers.find((m) => m.id === e.sticker)?.label ?? "Sticker";
}
/**
 * Pieces copied with ⌘C, kept for this tab (so they paste into another board too). Pieces that use this board's own
 * private images only paste back into the same board: files belong to one board and are tidied up with it.
 */
let elementClip: { boardId: string; elements: BoardElement[]; marker: string } | null = null;
let styleClip: StyleClip | null = null;
const MARKER = "muse-vision-pieces:";

/**
 * The collage studio (#118, #187). Edits apply to a local copy with undo/redo; it autosaves shortly after each change,
 * saves right away when the app is backgrounded, and keeps a recovery copy on this device until the save is confirmed.
 */
export default function BoardEditor({ initial, userId, today, lookups, onSaved, onBack, sweep, createVision }: {
  initial: VisionBoard; userId: string; today: string; lookups: Lookups;
  onSaved: (b: VisionBoard) => void; onBack: () => void; sweep: (boardId: string, keep: Set<string>) => void;
  /** Saves a new Vision (used by "Combine pages into one board", which always makes a copy). */
  createVision?: (b: VisionBoard) => Promise<VisionBoard | null>;
}) {
  const client = useMemo(() => createMuseBrowserClient(), []);
  const [board, setBoard] = useState(initial);
  const [history, setHistory] = useState<History>(emptyHistory);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [save, setSave] = useState({ dirty: false, saving: false, error: "", conflict: false });
  const [uploads, setUploads] = useState<{ total: number; done: number; errors: string[] }>({ total: 0, done: 0, errors: [] });
  const [panel, setPanel] = useState<"" | "library" | "layers" | "style" | "text" | "pages">("");
  const [sheet, setSheet] = useState<"" | "crop" | "details">("");
  const [recovery, setRecovery] = useState<Draft | null>(null);
  const [announce, setAnnounce] = useState("");
  // Right-click: a context menu at the pointer (piece actions on a piece, board actions on empty space), and Style
  // can open right there, so styling never needs a trip to the toolbar.
  const [cursorAt, setCursorAt] = useState<{ x: number; y: number } | null>(null), [menuOpen, setMenuOpen] = useState(false), [styleAtCursor, setStyleAtCursor] = useState(false);
  const ctxTarget = useRef<string | null>(null);
  const [safari] = useState(() => typeof navigator !== "undefined" && /Safari/.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS/.test(navigator.userAgent));
  const [clipboardBusy, setClipboardBusy] = useState(false);
  const [selectMode, setSelectMode] = useState(false), [snapping, setSnapping] = useState(true), [exporting, setExporting] = useState(false);
  const [sessionUploads, setSessionUploads] = useState<Asset[]>([]);
  const [reducedMotion] = useState(() => prefersReducedMotion());
  // The settings panel can be hidden for a full-width canvas (remembered on this device). The Board button and the
  // panel's close button toggle it; the view refits to the new space.
  const [panelOpen, setPanelOpen] = useState(() => { try { return localStorage.getItem("muse.vision.panel") !== "closed"; } catch { return true; } });
  const togglePanelOpen = (open: boolean) => {
    setPanelOpen(open); autoFit.current = true;
    try { localStorage.setItem("muse.vision.panel", open ? "open" : "closed"); } catch { /* this session only */ }
  };
  const clipboardReading = useRef(false), pasteAnchor = useRef<HTMLSpanElement>(null);
  const boardRef = useRef(board); boardRef.current = board;
  const historyRef = useRef(history); historyRef.current = history;
  const selRef = useRef(selectedIds); selRef.current = selectedIds;
  const rev = useRef(initial.revision), seq = useRef(0), saving = useRef(false), again = useRef(false);
  const lastKey = useRef<{ key: string; at: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null), patternFileRef = useRef<HTMLInputElement>(null), patternThen = useRef<((a: Asset) => void) | null>(null), wrapRef = useRef<HTMLDivElement>(null);
  const anchors = { library: useRef<HTMLButtonElement>(null), layers: useRef<HTMLButtonElement>(null), style: useRef<HTMLButtonElement>(null), text: useRef<HTMLButtonElement>(null), pages: useRef<HTMLButtonElement>(null) };
  const selected = useMemo(() => board.elements.filter((e) => selectedIds.includes(e.id)), [board.elements, selectedIds]);
  // ---------- Books: the page being edited (-1 = the cover). `board.elements`/`background` mirror that page. ----------
  const book = isBook(board) && !!board.pages?.length;
  const [page, setPageState] = useState(0);
  const pageRef = useRef(page); pageRef.current = page;
  const [spread, setSpread] = useState(true), [reading, setReading] = useState(false);
  const palette = useSavedPalette(userId);

  // ---------- Viewport (zoom and pan never change the board's own size) ----------
  const [size, setSize] = useState({ width: 0, height: 0 }), [view, setView] = useState<View | null>(null);
  const viewRef = useRef(view); viewRef.current = view;
  useLayoutEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(([entry]) => { const { width, height } = entry.contentRect; setSize({ width: Math.round(width), height: Math.round(height) }); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // The board stays fitted to the canvas (as the layout settles, or the window or phone rotates) until the person
  // pans or zooms themselves; "Fit" returns to that.
  const autoFit = useRef(true);
  const box = canvasOf(board);
  // A Book on a wide screen shows the facing page beside the one being edited (a spread); only one page is editable.
  const partner = book && spread && page >= 0 && size.width >= 900 ? spreadPartner(page, board.pages!.length) : undefined;
  const fit = useCallback(() => {
    if (!size.width) return;
    autoFit.current = true;
    if (partner === undefined) { setView(fitView({ size: "custom", canvas: box }, size.width, size.height, 30)); return; }
    const v = fitView({ size: "custom", canvas: { w: box.w * 2, h: box.h } }, size.width, size.height, 30);
    setView(partner < page ? { ...v, x: v.x + box.w * v.scale } : v);
  }, [box.w, box.h, size, partner, page]); // eslint-disable-line react-hooks/exhaustive-deps -- box is derived from w/h
  /**
   * The editing area takes the board's own proportions at the available width, so a wider or taller board really is
   * a wider or taller canvas (not a fixed box with empty table around it). Phones keep it within the screen so the
   * page can still scroll past it.
   */
  const [coarse] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches);
  const canvasHeight = size.width ? Math.round(Math.max(320, Math.min(size.width * (box.h / (box.w * (partner !== undefined ? 2 : 1))) + 28, coarse ? window.innerHeight * 0.78 : Math.max(560, window.innerHeight - 96)))) : undefined;
  useEffect(() => { if (!size.width || !autoFit.current) return; const t = window.setTimeout(fit, 0); return () => window.clearTimeout(t); }, [size, fit]);
  const moveView = (v: View) => { autoFit.current = false; setView(v); };
  const zoomBy = (factor: number) => view && moveView((() => {
    const c = { x: size.width / 2, y: size.height / 2 }, scale = Math.min(4, Math.max(0.03, view.scale * factor)), bx = (c.x - view.x) / view.scale, by = (c.y - view.y) / view.scale;
    return { scale, x: c.x - bx * scale, y: c.y - by * scale };
  })());

  // ---------- Editing with history ----------
  const snapshot = (b: VisionBoard = boardRef.current): Snapshot => ({ elements: b.elements, background: b.background, size: b.size, canvas: b.canvas, ...(isBook(b) ? { pages: b.pages, page: pageRef.current, cover: b.cover } : {}) });
  /** Writes the edited page back into the book (the page in `next.page`, or the current one). */
  const syncPage = (s: Snapshot): Snapshot => {
    const at = s.page ?? pageRef.current;
    if (!s.pages || at < 0 || !s.pages[at]) return s;
    const p = s.pages[at];
    return p.elements === s.elements && p.background === s.background ? s : { ...s, pages: s.pages.map((x, k) => (k === at ? { ...x, elements: s.elements, background: s.background } : x)) };
  };
  const setPage = (i: number) => { pageRef.current = i; setPageState(i); };
  /** Applies a change. Rapid edits with the same `key` (typing, a slider) become one undo step. */
  const apply = useCallback((change: (s: Snapshot) => Snapshot, key?: string) => {
    const before = snapshot(), changed = change(before);
    if (changed === before) return;
    const next = syncPage(changed);
    if (next.page !== undefined && next.page !== pageRef.current) setPage(next.page);
    const now = Date.now(), merge = key && lastKey.current?.key === key && now - lastKey.current.at < 1500;
    lastKey.current = key ? { key, at: now } : null;
    if (!merge) setHistory((h) => record(h, before));
    const b = { ...boardRef.current, ...next };
    boardRef.current = b; setBoard(b);
    seq.current++; setSave((s) => ({ ...s, dirty: true }));
  }, []);
  const changeElements = (fn: (els: BoardElement[]) => BoardElement[], key?: string) => apply((s) => { const elements = fn(s.elements); return elements === s.elements ? s : { ...s, elements }; }, key);
  const onChangeMany = (patches: Patch[], key?: string) => {
    const by = new Map(patches.map((p) => [p.id, p.patch]));
    changeElements((els) => els.map((e) => (by.has(e.id) ? { ...e, ...by.get(e.id) } as BoardElement : e)), key);
  };
  const select = (ids: string[]) => setSelectedIds(expandSelection(boardRef.current.elements, ids));
  /** "only" picks exactly these pieces, even inside a group (double-click, or the Layers list), to style one member. */
  const onSelect = (ids: string[], mode: "replace" | "toggle" | "only" = "replace") => {
    if (mode === "only") return setSelectedIds(ids);
    const els = boardRef.current.elements, picked = expandSelection(els, ids);
    if (mode === "replace") return setSelectedIds(picked);
    const cur = selRef.current, allIn = picked.every((id) => cur.includes(id));
    setSelectedIds(allIn ? cur.filter((id) => !picked.includes(id)) : [...new Set([...cur, ...picked])]);
  };
  const restore = (s: Snapshot) => {
    const b = { ...boardRef.current, ...s, size: s.size ?? boardRef.current.size, canvas: s.size ? s.canvas : boardRef.current.canvas };
    if (s.page !== undefined && s.page !== pageRef.current) setPage(s.page);
    boardRef.current = b; setBoard(b); seq.current++; setSave((x) => ({ ...x, dirty: true })); lastKey.current = null;
    setSelectedIds((ids) => ids.filter((id) => s.elements.some((e) => e.id === id)));
  };
  const doUndo = () => { const r = undo(historyRef.current, snapshot()); if (r) { setHistory(r.history); restore(r.snapshot); setAnnounce("Undone"); } };
  const doRedo = () => { const r = redo(historyRef.current, snapshot()); if (r) { setHistory(r.history); restore(r.snapshot); setAnnounce("Redone"); } };

  // ---------- Book pages ----------
  const lastPage = useRef(0);
  /** Opens a page (or the cover, -1) for editing. Navigation, not an edit: it isn't an undo step. */
  const goToPage = (i: number) => {
    const b = boardRef.current;
    if (!isBook(b) || !b.pages?.length) return;
    const s = syncPage(snapshot(b)), pages = s.pages ?? b.pages, at = i < 0 ? -1 : Math.min(pages.length - 1, i);
    const src = pages[at < 0 ? Math.min(lastPage.current, pages.length - 1) : at];
    if (at >= 0) lastPage.current = at;
    const nb = { ...b, pages, elements: src.elements, background: src.background };
    boardRef.current = nb; setBoard(nb); setPage(at); setSelectedIds([]); lastKey.current = null; autoFit.current = true;
    setAnnounce(at < 0 ? "Cover" : `Page ${at + 1} of ${pages.length}: ${pages[at].title}`);
  };
  /** A page operation: new page order and which page to open, as one undo step. */
  const pageOp = (fn: (pages: BookPage[]) => { pages: BookPage[]; at: number }, label: string) => {
    apply((s) => {
      if (!s.pages) return s;
      const r = fn(s.pages);
      if (r.pages === s.pages) return s;
      const p = r.pages[r.at];
      return { ...s, pages: r.pages, page: r.at, elements: p.elements, background: p.background };
    });
    setSelectedIds([]); autoFit.current = true; setAnnounce(label);
  };
  const pageActions = {
    go: (i: number) => goToPage(i),
    add: (after: number) => (board.pages?.length ?? 0) >= MAX_PAGES ? setAnnounce(`A book holds up to ${MAX_PAGES} pages.`) : pageOp((ps) => ({ pages: addPage(ps, after, uid()), at: Math.min(after + 1, ps.length) }), "Page added"),
    duplicate: (i: number) => pageOp((ps) => ({ pages: duplicatePage(ps, i, uid(), uid), at: i + 1 }), "Page duplicated"),
    remove: (i: number) => pageOp((ps) => { const next = removePage(ps, i); return { pages: next, at: Math.min(Math.max(0, pageRef.current > i ? pageRef.current - 1 : pageRef.current === i ? i : pageRef.current), next.length - 1) }; }, "Page deleted. Undo brings it back."),
    move: (from: number, to: number) => pageOp((ps) => { const id = ps[Math.max(0, pageRef.current)]?.id, next = movePage(ps, from, to); return { pages: next, at: Math.max(0, next.findIndex((p) => p.id === id)) }; }, `Page moved to position ${to + 1}`),
    rename: (i: number, title: string) => apply((s) => (s.pages ? { ...s, pages: renamePage(s.pages, i, title) } : s), `rename:${i}`),
  };
  const setCover = (patch: Partial<BookCover>, key?: string) => apply((s) => (s.cover ? { ...s, cover: { ...s.cover, ...patch } } : s), key);
  /** Format changes are saved at once and start a fresh undo history (the two formats keep different undo state). */
  const replaceBoard = (patch: Partial<VisionBoard>, label: string, at = 0) => {
    const nb = { ...boardRef.current, ...patch };
    boardRef.current = nb; setBoard(nb); setHistory(emptyHistory()); setPage(at); lastPage.current = Math.max(0, at); setSelectedIds([]);
    seq.current++; setSave((x) => ({ ...x, dirty: true })); autoFit.current = true; setAnnounce(label);
  };
  const convertToBook = () => { const b = boardRef.current; const conv = boardToBook(b, uid()); replaceBoard({ ...conv, elements: conv.pages![0].elements, background: conv.pages![0].background }, "Now a Book: your board is page 1. Pick a cover, then add pages."); };
  const convertToBoard = () => { const s = syncPage(snapshot()), single = singlePageToBoard({ pages: s.pages }); if (single) replaceBoard(single, "Now a Vision Board."); };
  const [combining, setCombining] = useState(false);
  async function combineToBoard() {
    const s = syncPage(snapshot()), src = { ...boardRef.current, pages: s.pages }, r = combinePages(src, uid);
    if (!r.ok) { setUploads({ total: 0, done: 0, errors: [r.reason] }); return; }
    setCombining(true);
    try {
      const now = new Date().toISOString(), copy = { ...blankBoard(uid(), now), title: `${src.title} (combined)`.slice(0, 120), theme: src.theme, description: src.description, period: src.period, periodStart: src.periodStart, size: "custom" as const, canvas: r.canvas, background: r.background, elements: r.elements };
      const saved = await createVision?.(copy);
      if (!saved) throw Error("The combined board didn’t save. Your book is unchanged.");
      setNotice(`Saved “${saved.title}”, a new Vision Board with every page side by side. Your book is unchanged.`);
    } catch (err) { setUploads({ total: 0, done: 0, errors: [err instanceof Error ? err.message : "The combined board didn’t save. Your book is unchanged."] }); }
    finally { setCombining(false); }
  }
  const [notice, setNotice] = useState("");
  const [pdfProgress, setPdfProgress] = useState<string>("");
  async function exportPdf() {
    setExporting(true); setPdfProgress("Preparing…");
    try {
      const { exportBookPdf } = await import("./exportBoard");
      const s = syncPage(snapshot()), blob = await exportBookPdf({ ...boardRef.current, pages: s.pages }, (d, t) => setPdfProgress(d < t ? `Page ${d + 1} of ${t}…` : "Finishing…"));
      const name = `${(board.title || "Book").replace(/[\\/:*?"<>|]+/g, " ").trim()}.pdf`, file = new File([blob], name, { type: "application/pdf" });
      if (coarse && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: board.title }).catch(() => undefined);
      else { const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 4000); }
      setAnnounce("Book exported as a PDF");
    } catch (err) { setUploads({ total: 0, done: 0, errors: [err instanceof Error ? err.message : "The book couldn’t be exported."] }); }
    finally { setExporting(false); setPdfProgress(""); }
  }

  // ---------- Saving ----------
  const writeDraft = useCallback(() => {
    try { const b = boardRef.current; localStorage.setItem(draftKey(b.id), JSON.stringify({ revision: rev.current, at: new Date().toISOString(), elements: b.elements, background: b.background, size: b.size, canvas: b.canvas, ...(isBook(b) ? { format: b.format, pages: b.pages, cover: b.cover } : {}) } satisfies Draft)); } catch { /* storage full or blocked: the autosave still runs */ }
  }, []);
  const clearDraft = useCallback(() => { try { localStorage.removeItem(draftKey(boardRef.current.id)); } catch { /* this device only */ } }, []);
  const flush = useCallback(async (): Promise<boolean> => {
    if (saving.current) { again.current = true; return false; }
    saving.current = true;
    setSave((s) => ({ ...s, saving: true }));
    const at = seq.current, b = boardRef.current;
    let ok = false;
    try {
      const saved = await saveBoard(client, { ...b, revision: rev.current });
      rev.current = saved.revision;
      onSaved({ ...b, revision: saved.revision, updatedAt: saved.updatedAt, createdAt: saved.createdAt });
      const clean = seq.current === at;
      if (clean) clearDraft();
      setSave({ dirty: !clean, saving: false, error: "", conflict: false });
      ok = clean;
    } catch (e) {
      const message = e instanceof Error ? e.message : "This board didn’t save. Your changes are kept on this device; try again.";
      setSave((s) => ({ ...s, saving: false, error: message, conflict: message.includes("another device") }));
    } finally {
      saving.current = false;
      if (again.current) { again.current = false; void flush(); }
    }
    return ok;
  }, [client, onSaved, clearDraft]);
  useEffect(() => {
    if (!save.dirty || save.conflict) return;
    const t = window.setTimeout(() => { writeDraft(); void flush(); }, 1200);
    return () => window.clearTimeout(t);
  }, [board, save.dirty, save.conflict, flush, writeDraft]);
  // Backgrounding (iPhone app switch), closing or refreshing: keep a local copy and save immediately.
  useEffect(() => {
    const hidden = () => { if (document.visibilityState === "hidden" && seq.current > 0 && (saving.current || save.dirty)) { writeDraft(); void flush(); } };
    const unload = (ev: BeforeUnloadEvent) => { if (save.dirty || saving.current) { writeDraft(); ev.preventDefault(); } };
    document.addEventListener("visibilitychange", hidden); window.addEventListener("beforeunload", unload); window.addEventListener("pagehide", hidden);
    return () => { document.removeEventListener("visibilitychange", hidden); window.removeEventListener("beforeunload", unload); window.removeEventListener("pagehide", hidden); };
  }, [save.dirty, flush, writeDraft]);
  // A recovery copy from an interrupted session on this device.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey(initial.id));
      if (!raw) return;
      const d = JSON.parse(raw) as Draft;
      const same = (x: Pick<Draft, "elements" | "background" | "size" | "canvas">) => JSON.stringify({ e: x.elements, b: x.background, s: x.size ?? initial.size, c: x.size === "custom" ? x.canvas : undefined });
      if (same(d) === same(initial)) { localStorage.removeItem(draftKey(initial.id)); return; }
      const t = window.setTimeout(() => setRecovery(d), 0);
      return () => window.clearTimeout(t);
    } catch { /* unreadable: ignore */ }
  }, [initial]);
  // Leaving: save what's pending, then remove files nothing uses (never ones the undo history could bring back).
  const sweepRef = useRef(sweep); sweepRef.current = sweep;
  useEffect(() => () => {
    if (seq.current === 0) return;
    const keep = usedPaths([boardRef.current, ...historyRef.current.past, ...historyRef.current.future]);
    if (!saving.current) sweepRef.current(boardRef.current.id, keep);
  }, []);
  async function leave() {
    if (save.dirty || saving.current) {
      const ok = await flush();
      if (!ok && !window.confirm("This board hasn’t saved yet. Leave anyway? A copy stays on this device and is offered next time you open it.")) return;
      if (!ok) writeDraft();
    }
    onBack();
  }
  async function reloadLatest() {
    const latest = await loadBoard(client, board.id).catch(() => null);
    if (!latest) { setSave((s) => ({ ...s, error: "This board couldn’t be found. It may have been deleted on another device." })); return; }
    rev.current = latest.revision; boardRef.current = latest; setBoard(latest); setHistory(emptyHistory()); setSelectedIds([]); clearDraft(); onSaved(latest);
    setSave({ dirty: false, saving: false, error: "", conflict: false });
  }
  async function keepMine() {
    const latest = await loadBoard(client, board.id).catch(() => null);
    if (!latest) return;
    rev.current = latest.revision; seq.current++;
    setSave({ dirty: true, saving: false, error: "", conflict: false });
  }

  // ---------- Adding ----------
  /** New pieces land in the middle of what's on screen (not off in a corner of a big board). */
  const place = (w: number, h: number) => {
    const b = boardRef.current, v = viewRef.current, base = nextPlacement(b, b.elements.length), c = canvasOf(b);
    if (!v || !size.width) return { ...base, w, h };
    const cx = (size.width / 2 - v.x) / v.scale, cy = (size.height / 2 - v.y) / v.scale;
    const inside = cx > 0 && cy > 0 && cx < c.w && cy < c.h;
    return inside ? { x: Math.round(cx + (base.x - c.w / 2) * 0.55), y: Math.round(cy + (base.y - c.h / 2) * 0.55), rotation: base.rotation, w, h } : { ...base, w, h };
  };
  const add = (e: BoardElement | BoardElement[], label: string, at?: number) => {
    const list = Array.isArray(e) ? e : [e];
    if (book && pageRef.current < 0) goToPage(lastPage.current);
    if (boardRef.current.elements.length + list.length > MAX_ELEMENTS) { setAnnounce(`A board holds up to ${MAX_ELEMENTS} pieces.`); return; }
    changeElements((els) => at === undefined ? [...els, ...list] : [...els.slice(0, at), ...list, ...els.slice(at)]);
    setSelectedIds(list.map((x) => x.id)); setAnnounce(`${label} added`);
  };
  async function uploadOne(file: File): Promise<Asset> {
    const up = await uploadBoardImage(userId, board.id, file, { allowJpeg: true, keepTransparency: true });
    return { path: up.path, thumbnailPath: up.thumbnailPath, width: up.width, height: up.height, mime: up.mime, name: up.name, ...(up.alpha ? { alpha: true } : {}) };
  }
  async function addFiles(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    setUploads({ total: images.length, done: 0, errors: [] });
    for (const file of images) {
      try {
        const asset = await uploadOne(file);
        const { w, h } = fitImage(boardRef.current, asset);
        const e: ImageElement = { id: uid(), kind: "image", ...place(w, h), image: asset, crop: { shape: "rect", zoom: 1, x: 0, y: 0 }, ...(asset.alpha ? {} : { border: { color: "#ffffff", width: 10 }, shadow: true }) };
        add(e, "Photo");
        setUploads((u) => ({ ...u, done: u.done + 1 }));
      } catch (err) {
        setUploads((u) => ({ ...u, done: u.done + 1, errors: [...u.errors, `${file.name}: ${err instanceof Error ? err.message : "couldn’t upload"}`] }));
      }
    }
  }
  /** An image uploaded to use as a pattern (kept with the board's files; it appears under "Your uploads"). */
  const requestUpload = (then: (a: Asset) => void) => { patternThen.current = then; patternFileRef.current?.click(); };
  async function uploadPattern(file: File | undefined) {
    const then = patternThen.current; patternThen.current = null;
    if (!file || !then) return;
    setUploads({ total: 1, done: 0, errors: [] });
    try { const a = await uploadOne(file); setSessionUploads((l) => [a, ...l]); then(a); setUploads({ total: 1, done: 1, errors: [] }); }
    catch (err) { setUploads({ total: 1, done: 1, errors: [`${file.name}: ${err instanceof Error ? err.message : "couldn’t upload"}`] }); }
  }
  /** Adds writing (a heading level, a paragraph, or simple words) and starts typing into it right on the canvas. */
  function addText(role: TextRole | "plain" = "plain") {
    const preset = textPresets.find((t) => t.role === role) ?? textPresets[textPresets.length - 1], made = preset.make(canvasOf(boardRef.current).w);
    const base: TextElement = { id: uid(), kind: "text", ...place(made.w ?? 640, 100), rotation: 0, text: "", font: "editorial", size: 84, color: "#2a2135", align: "center", ...made } as TextElement;
    add({ ...base, h: measureText(base) }, preset.label);
    window.setTimeout(() => setEditingText(base.id), 60);
  }
  const [editingText, setEditingText] = useState<string | null>(null);
  // Selecting anything else (or nothing) finishes writing in place.
  if (editingText && !selectedIds.includes(editingText) && selectedIds.length) setEditingText(null);  /**
   * Opens a piece's controls: in the side panel when it's showing, otherwise in the Style dropdown under the toolbar
   * (so a hidden panel never leaves new text with nowhere to type). Text goes straight to its words, selected.
   */
  function openEditor(id: string, isText = boardRef.current.elements.find((e) => e.id === id)?.kind === "text") {
    setSelectedIds((ids) => (ids.length === 1 && ids[0] === id ? ids : [id]));
    if (!panelOpen) setPanel("style");
    if (isText) window.setTimeout(() => { const t = document.getElementById("vision-text-input") as HTMLTextAreaElement | null; t?.focus(); t?.select(); }, 120);
  }
  function addSticker(id: string) {
    const def = stickerDef(id), [bw, bh] = def?.box ?? [24, 24], s = 180, w = bw >= bh ? s : Math.round((s * bw) / bh), h = bw >= bh ? Math.round((s * bh) / bw) : s;
    let color: `#${string}` = "#f4a259";
    try { color = pinAccent(id === "tape" ? "secondary" : "primary"); } catch { /* default */ }
    const e: StickerElement = { id: uid(), kind: "sticker", ...place(w, h), sticker: id, color };
    add(e, elementLabel(e));
  }
  function addShape(shape: DecorShape) {
    const c = canvasOf(boardRef.current), unit = Math.round(Math.min(c.w, c.h) * 0.24), def = decorShapes.find((s) => s.id === shape)!;
    const wide = ["banner", "ticket", "label", "tag", "torn", "wavy"].includes(shape), w = def.ratio === 1 ? unit : Math.round(unit * (wide ? 1.7 : 1.3)), h = def.ratio === 1 ? unit : Math.round(unit * (wide ? 0.62 : 1));
    const fill = shape === "torn" ? "#fffaf0" : shape === "bubble" ? "#ffffff" : "#ffd6e0";
    const e: ShapeElement = { id: uid(), kind: "shape", ...place(w, h), rotation: 0, shape, fill: { kind: "solid", color: fill }, shadowStyle: { ...defaultShadow, blur: 18, y: 6, opacity: 0.22 }, ...(shape === "rounded" ? { radius: Math.round(Math.min(w, h) * 0.12) } : {}) };
    add(e, def.label);
  }
  function onLibrary(p: LibraryPick) {
    if (p.kind === "shape") addShape(p.shape);
    else if (p.kind === "sticker") addSticker(p.id);
    else if (p.kind === "fill") {
      const paint = { kind: "pattern" as const, pattern: { source: "builtin" as const, id: p.item.id }, scale: 1, rotation: 0, x: 0, y: 0 };
      const shapes = selected.filter((e) => e.kind === "shape");
      if (shapes.length) { onChangeMany(shapes.map((e) => ({ id: e.id, patch: { fill: paint } })), undefined); setAnnounce(`${p.item.name} fill applied`); }
      else { const c = canvasOf(boardRef.current), w = Math.round(c.w * 0.34), h = Math.round(w * 0.75); add({ id: uid(), kind: "shape", ...place(w, h), rotation: 0, shape: "rect", fill: paint, role: "paper", shadowStyle: { ...defaultShadow, blur: 14, y: 5, opacity: 0.2 } } satisfies ShapeElement, `${p.item.name} paper`); }
    } else {
      const { w, h } = pieceSize(p.item, canvasOf(boardRef.current)), pl = place(w, h);
      const e: PieceElement = { id: uid(), kind: "piece", ...pl, rotation: p.item.kind === "washi" ? (pl.rotation > 0 ? -8 : 8) : pl.rotation, piece: p.item.id, ...(p.item.kind === "sticker" ? { shadowStyle: { ...defaultShadow, blur: 10, y: 4, opacity: 0.25 } } : {}) };
      add(e, p.item.name);
    }
    setPanel("");
  }

  // ---------- Selection actions ----------
  const ids = selectedIds;
  const unitCount = useMemo(() => { const g = new Set<string>(); let n = 0; for (const e of selected) { if (e.groupId) { if (!g.has(e.groupId)) { g.add(e.groupId); n++; } } else n++; } return n; }, [selected]);
  const grouped = isGrouped(board.elements, ids);
  const layer = (move: "forward" | "backward" | "front" | "back") => ids.length && changeElements((els) => moveLayers(els, ids, move));
  const duplicate = () => { if (!ids.length) return; const r = duplicateElements(boardRef.current.elements, ids, uid); if (!r.ids.length) { setAnnounce(`A board holds up to ${MAX_ELEMENTS} pieces.`); return; } changeElements(() => r.elements); setSelectedIds(r.ids); setAnnounce("Duplicated"); };
  const remove = () => { if (!ids.length) return; const label = ids.length > 1 ? `${ids.length} pieces` : elementLabel(selected[0]); changeElements((els) => removeElements(els, ids)); setSelectedIds([]); setAnnounce(`${label} removed. Undo brings it back.`); };
  const nudge = (dx: number, dy: number) => ids.length && changeElements((els) => moveElements(els, ids, dx, dy), `nudge:${ids.join()}`);
  const copy = () => {
    if (!ids.length) return;
    const marker = `${MARKER}${uid()}`;
    elementClip = { boardId: board.id, elements: JSON.parse(JSON.stringify(selected)), marker };
    void navigator.clipboard?.writeText(marker).catch(() => undefined);
    setAnnounce(ids.length > 1 ? `${ids.length} pieces copied` : "Copied");
  };
  const pasteCopied = () => {
    if (!elementClip) return false;
    const sameBoard = elementClip.boardId === board.id;
    const usable = sameBoard ? elementClip.elements : elementClip.elements.filter((e) => collectPaths(e).size === 0);
    if (!usable.length) { setAnnounce("Pieces with your photos paste only into the board they came from."); return true; }
    const v = viewRef.current, at = !sameBoard && v ? { x: (size.width / 2 - v.x) / v.scale, y: (size.height / 2 - v.y) / v.scale } : undefined;
    const r = pasteElements(boardRef.current.elements, usable, uid, at);
    if (!r.ids.length) { setAnnounce(`A board holds up to ${MAX_ELEMENTS} pieces.`); return true; }
    changeElements(() => r.elements); setSelectedIds(r.ids);
    setAnnounce(usable.length < elementClip.elements.length ? "Pasted (pieces with photos from another board were left out)" : "Pasted");
    return true;
  };
  const doCopyStyle = () => { if (selected[0]) { styleClip = copyStyle(selected[0]); setAnnounce("Style copied"); } };
  const doPasteStyle = () => { const clip = styleClip; if (!clip || !ids.length) return; changeElements((els) => els.map((e) => { if (!ids.includes(e.id)) return e; const n = pasteStyle(e, clip); return n.kind === "text" ? { ...n, h: measureText(n) } : n; })); setAnnounce("Style pasted"); };
  const group = () => { if (unitCount < 2) return; changeElements((els) => groupElements(els, ids, uid())); setAnnounce("Grouped"); };
  const ungroup = () => { changeElements((els) => ungroupElements(els, ids)); setAnnounce("Ungrouped"); };
  const lock = () => { const on = !selected.every((e) => e.locked); changeElements((els) => els.map((e) => (ids.includes(e.id) ? { ...e, locked: on || undefined } : e))); };
  const align = (how: Align) => changeElements((els) => alignElements(els, ids, how, canvasOf(boardRef.current)));
  const distribute = (axis: "h" | "v") => changeElements((els) => distributeElements(els, ids, axis));
  /** Board space added on the left/top shifts every piece's coordinates; the view shifts back so nothing appears to move. */
  /** Book pages share one size: added space shifts every page's pieces the same way (nothing moves on its page). */
  const shiftPages = (pages: BookPage[] | undefined, at: number, elements: BoardElement[], shift: { x: number; y: number }) => pages?.map((p, k) => k === at ? { ...p, elements } : shift.x || shift.y ? { ...p, elements: p.elements.map((e) => ({ ...e, x: e.x + shift.x, y: e.y + shift.y })) } : p);
  const applyCanvas = (r: ReturnType<typeof expandCanvas>, label: string) => {
    apply((s) => ({ ...s, size: r.size, canvas: r.canvas, elements: r.elements, ...(s.pages ? { pages: shiftPages(s.pages, pageRef.current, r.elements, r.shift) } : {}) }));
    const v = viewRef.current;
    if (v && (r.shift.x || r.shift.y)) moveView({ ...v, x: v.x - r.shift.x * v.scale, y: v.y - r.shift.y * v.scale });
    else if (v) autoFit.current = false;
    setAnnounce(`${label}: the board is now ${r.canvas.w} by ${r.canvas.h}`);
  };
  const expand = (by: Expand) => applyCanvas(expandCanvas(boardRef.current, by), "Space added");
  const resize = (w: number, h: number, anchor: { x: 0 | 0.5 | 1; y: 0 | 0.5 | 1 }) => applyCanvas(resizeCanvas(boardRef.current, w, h, anchor), "Resized");
  const preset = (s: keyof typeof boardSizes) => {
    const c = canvasOf(boardRef.current), p = boardSizes[s];
    const r = resizeCanvas(boardRef.current, p.w, p.h, { x: 0.5, y: 0.5 });
    apply((x) => ({ ...x, size: s, canvas: undefined, elements: r.elements, ...(x.pages ? { pages: shiftPages(x.pages, pageRef.current, r.elements, r.shift) } : {}) }));
    const v = viewRef.current; if (v && (r.shift.x || r.shift.y)) moveView({ ...v, x: v.x - r.shift.x * v.scale, y: v.y - r.shift.y * v.scale });
    setAnnounce(c.w === p.w && c.h === p.h ? `${p.label}` : `The board is now ${p.label} (${p.w} by ${p.h})`);
  };
  const background = (bg: Background) => apply((s) => ({ ...s, background: bg }), "background");
  function makeSticker() {
    const e = selected[0]; if (e?.kind !== "image") return;
    changeElements((els) => els.map((x) => x.id === e.id ? { ...e, border: undefined, outline: e.outline ?? { color: "#ffffff", width: Math.max(6, Math.round(Math.min(e.w, e.h) * 0.045)) }, finish: e.finish ?? { kind: "glossy", intensity: 0.55 }, shadow: true, shadowStyle: e.shadowStyle ?? { ...defaultShadow, blur: 14, y: 6, opacity: 0.28 } } as ImageElement : x));
    setAnnounce("Made into a sticker");
  }
  /**
   * "Add a photo inside" a frame: the photo is fitted to the frame's window (cover-cropped, so it fills it), tucked
   * just behind the frame, turned with it and grouped with it. Frames without window data use their centre.
   */
  function photoIntoFrame() {
    const f = selected[0]; if (f?.kind !== "piece") return;
    if (boardRef.current.elements.length >= MAX_ELEMENTS) { setAnnounce(`A board holds up to ${MAX_ELEMENTS} pieces.`); return; }
    const win = libraryItem(f.piece)?.window ?? [0.1, 0.1, 0.8, 0.8], [wx, wy, ww, wh] = win;
    const ox = (wx + ww / 2 - 0.5) * f.w, oy = (wy + wh / 2 - 0.5) * f.h, a = (f.rotation * Math.PI) / 180;
    requestUpload((asset) => {
      const gid = f.groupId ?? uid(), w = Math.round(ww * f.w * 1.01), h = Math.round(wh * f.h * 1.01);
      const photo: ImageElement = { id: uid(), kind: "image", image: asset, crop: { shape: "rect", zoom: 1, x: 0, y: 0 }, x: Math.round(f.x + ox * Math.cos(a) - oy * Math.sin(a)), y: Math.round(f.y + ox * Math.sin(a) + oy * Math.cos(a)), w, h, rotation: f.rotation, groupId: gid };
      changeElements((els) => { const at = els.findIndex((x) => x.id === f.id); const withGroup = els.map((x) => (x.id === f.id ? { ...x, groupId: gid } : x)); return at < 0 ? els : [...withGroup.slice(0, at), photo, ...withGroup.slice(at)]; });
      setSelectedIds([photo.id]); setAnnounce("Photo added inside the frame (grouped with it)");
    });
  }
  /** A patterned scrapbook backing behind a photo: a little larger, a little turned, grouped with the photo. */
  function addBacking() {
    const e = selected[0]; if (e?.kind !== "image") return;
    const first = searchLibrary("pattern", "gingham")[0] ?? searchLibrary("pattern")[0], pad = Math.round(Math.min(e.w, e.h) * 0.07), gid = e.groupId ?? uid();
    const shape: DecorShape = e.crop.shape === "circle" ? "scallop-circle" : e.crop.shape === "heart" ? "heart" : e.crop.shape === "arch" ? "arch" : "rect";
    const backing: ShapeElement = { id: uid(), kind: "shape", x: e.x, y: e.y, w: e.w + pad * 2, h: e.h + pad * 2, rotation: e.rotation + (e.rotation >= 0 ? -3 : 3), shape, role: "backing", groupId: gid,
      fill: first ? { kind: "pattern", pattern: { source: "builtin", id: first.id }, scale: 0.6, rotation: 0, x: 0, y: 0, base: "#ffffff" } : { kind: "solid", color: "#ffd6e0" }, shadowStyle: { ...defaultShadow, blur: 16, y: 6, opacity: 0.25 } };
    const at = boardRef.current.elements.findIndex((x) => x.id === e.id);
    if (boardRef.current.elements.length >= MAX_ELEMENTS) { setAnnounce(`A board holds up to ${MAX_ELEMENTS} pieces.`); return; }
    changeElements((els) => { const withGroup = els.map((x) => x.id === e.id ? { ...x, groupId: gid } : x); return [...withGroup.slice(0, at), backing, ...withGroup.slice(at)]; });
    setSelectedIds([backing.id]); setAnnounce("Backing added behind the photo (grouped with it). Pick a pattern for it here.");
  }
  async function exportImage(type: "image/png" | "image/jpeg") {
    setExporting(true);
    try {
      const blob = await exportBoard(book && pageRef.current < 0 ? displayBoard(boardRef.current) : boardRef.current, { scale: 2, type });
      const part = book ? ` - ${pageRef.current < 0 ? "Cover" : board.pages![pageRef.current]?.title ?? `Page ${pageRef.current + 1}`}` : "";
      const name = `${(board.title || "Vision").replace(/[\\/:*?"<>|]+/g, " ").trim()}${part.replace(/[\\/:*?"<>|]+/g, " ")}.${type === "image/png" ? "png" : "jpg"}`, file = new File([blob], name, { type });
      const coarse = window.matchMedia?.("(pointer: coarse)").matches;
      if (coarse && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: board.title }).catch(() => undefined); }
      else { const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 4000); }
      setAnnounce("Board exported");
    } catch (err) { setUploads({ total: 0, done: 0, errors: [err instanceof Error ? err.message : "The board couldn’t be exported."] }); }
    finally { setExporting(false); }
  }

  function onKey(ev: KeyboardEvent) {
    if (typing(ev.target)) return;
    const mod = ev.metaKey || ev.ctrlKey, k = ev.key.toLowerCase();
    if (mod && k === "z") { ev.preventDefault(); if (ev.shiftKey) doRedo(); else doUndo(); return; }
    if (mod && k === "y") { ev.preventDefault(); doRedo(); return; }
    if (mod && k === "a") { ev.preventDefault(); select(boardRef.current.elements.filter((e) => !e.locked).map((e) => e.id)); return; }
    if (mod && ev.altKey && k === "v" || mod && ev.altKey && ev.code === "KeyV") { ev.preventDefault(); doPasteStyle(); return; }
    if (ev.key === "Escape") { setSelectedIds([]); return; }
    if (!ids.length) return;
    const step = ev.shiftKey ? 10 : 2;
    if (mod && (k === "c" || ev.code === "KeyC")) { if (ev.altKey) { ev.preventDefault(); doCopyStyle(); } else copy(); /* the native copy also runs: it puts the marker on the clipboard */ }
    else if (mod && k === "x") { ev.preventDefault(); copy(); remove(); }
    else if (mod && k === "d") { ev.preventDefault(); duplicate(); }
    else if (mod && k === "g") { ev.preventDefault(); if (ev.shiftKey) ungroup(); else group(); }
    else if (ev.key === "Delete" || ev.key === "Backspace") { ev.preventDefault(); remove(); }
    else if (ev.key === "ArrowLeft") { ev.preventDefault(); nudge(-step, 0); }
    else if (ev.key === "ArrowRight") { ev.preventDefault(); nudge(step, 0); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); nudge(0, -step); }
    else if (ev.key === "ArrowDown") { ev.preventDefault(); nudge(0, step); }
    else if (ev.key === "]" || ev.code === "BracketRight") layer(ev.shiftKey ? "front" : "forward");
    else if (ev.key === "[" || ev.code === "BracketLeft") layer(ev.shiftKey ? "back" : "backward");
  }
  async function pasteClipboard() {
    if (clipboardReading.current || uploading) return;
    clipboardReading.current = true; setClipboardBusy(true);
    try { await addFiles(await readClipboardImages()); }
    catch (error) { setUploads({ total: 0, done: 0, errors: [clipboardPasteError(error)] }); }
    finally { clipboardReading.current = false; setClipboardBusy(false); }
  }
  function onPaste(ev: ReactClipboardEvent) {
    if (typing(ev.target)) return;
    ev.preventDefault();
    const files = imageFilesFromPaste(ev.clipboardData), text = ev.clipboardData.getData("text/plain");
    // Pieces copied from a board come back as pieces (the clipboard holds a marker for them); images become photos.
    if (!files.length && text.startsWith(MARKER) && elementClip?.marker === text) { pasteCopied(); return; }
    if (files.length) { void addFiles(files); return; }
    if (!text && elementClip && pasteCopied()) return;
    // Some browser/website clipboard combinations expose image bytes only via the async API. Never silently ignore
    // these, or fetch the copied HTML/URL.
    void pasteClipboard();
  }
  const [dropping, setDropping] = useState(false);
  const dropProps = {
    onDragOver: (ev: DragEvent) => { if (ev.dataTransfer.types.includes("Files")) { ev.preventDefault(); setDropping(true); } },
    onDragLeave: () => setDropping(false),
    onDrop: (ev: DragEvent) => { setDropping(false); if (!ev.dataTransfer.files.length) return; ev.preventDefault(); void addFiles(Array.from(ev.dataTransfer.files)); },
  };

  const live = (l: ElementLink) => l.kind === "aspiration" ? (() => { const a = lookups.aspirations.find((x) => x.id === l.id); return a && { label: a.title }; })() : (() => { const d = lookups.dreams.find((x) => x.id === l.id); return d && { label: d.title }; })();
  const linkOptions = [...lookups.aspirations.filter((a) => a.status !== "archived").map((a) => ({ id: `aspiration:${a.id}`, label: `🌱 ${a.title}` })), ...lookups.dreams.filter((d) => !d.archivedAt).map((d) => ({ id: `bucket:${d.id}`, label: `🗺️ ${d.title}` }))];
  const togglePanel = (p: typeof panel) => setPanel((x) => x === p ? "" : p);
  // Option A cutouts: guidance for Apple's own "lift subject", only where it exists (iPhone, iPad).
  const apple = useAppleTouch(), cutoutHint = useCutoutHint(apple);
  const uploading = uploads.done < uploads.total;
  const intentionsHref = board.period && board.periodStart ? `/planner?view=intentions&period=${board.period}&date=${board.periodStart}` : null;
  /** The person's images for pattern fills: every photo on this board and anything uploaded as a pattern. */
  const boardUploads = useMemo(() => {
    const seen = new Map<string, Asset>();
    for (const a of sessionUploads) seen.set(a.path, a);
    const visit = (v: unknown) => { if (Array.isArray(v)) return v.forEach(visit); if (!v || typeof v !== "object") return; const o = v as Record<string, unknown>; if (typeof o.path === "string" && typeof o.thumbnailPath === "string" && typeof o.width === "number") { if (!seen.has(o.path)) seen.set(o.path, o as unknown as Asset); return; } Object.values(o).forEach(visit); };
    visit(board.elements); visit(board.background);
    return [...seen.values()].slice(0, 40);
  }, [board.elements, board.background, sessionUploads]);
  // Selection patches: every selected piece of the representative's kind changes together.
  const patch = (fn: (e: BoardElement) => Partial<BoardElement> | null, key?: string, scope: "kind" | "all" = "kind") => {
    const kind = selected[0]?.kind; if (!kind) return;
    const patches = selected.filter((e) => scope === "all" || e.kind === kind).map((e) => ({ id: e.id, patch: fn(e) })).filter((p): p is Patch => !!p.patch);
    onChangeMany(patches, key ? `${key}:${ids.join()}` : undefined);
  };
  const actions: InspectorActions = {
    align, distribute, layer, group, ungroup, lock, duplicate, remove, copyStyle: doCopyStyle, pasteStyle: doPasteStyle, canPasteStyle: !!styleClip,
    crop: () => setSheet("crop"), makeSticker, addBacking, photoIntoFrame, expand, resize, preset, background, exportImage: (t) => void exportImage(t), exporting,
    vision: { isBook: book, pageCount: board.pages?.length ?? 0, pageLabel: page < 0 ? "The cover" : `This page (“${board.pages?.[page]?.title ?? ""}”)`, toBook: convertToBook, toBoard: convertToBoard, combine: () => void combineToBoard(), combining, exportPdf: () => void exportPdf(), pdfProgress, read: () => setReading(true) },
  };
  const c = box;

  return <><section className="muse-vision-editor muse-vision-studio" data-format={book ? "book" : "board"} aria-label={`${book ? "Book" : "Vision board"}: ${board.title}`} onKeyDown={onKey} onPaste={onPaste}>
    <header className="muse-vision-editor-head">
      <button type="button" className="muse-button" onClick={() => void leave()}><span aria-hidden="true">‹</span> Visions</button>
      <div className="muse-vision-editor-title">
        <h2>{board.title}</h2>
        <p className="small-label">{[board.theme, periodLabel(board.period, board.periodStart)].filter(Boolean).join(" · ") || "No period"}{intentionsHref && <> · <Link href={intentionsHref}>Intentions for {periodLabel(board.period, board.periodStart)}</Link></>}</p>
      </div>
      <SaveIndicator label={book ? "Book" : "Board"} loaded pending={save.dirty} saving={save.saving} error={save.error ? "Not saved yet" : ""} />
      {book && <button type="button" className="muse-button" onClick={() => setReading(true)}><MuseIcon name="bookmark" size={14} /> Read</button>}
      <button type="button" className="muse-button" onClick={() => setSheet("details")}><MuseIcon name="edit" size={14} /> Details</button>
    </header>

    <div className="muse-vision-toolbar muse-vision-dock muse-scroll-fade" role="toolbar" aria-label="Studio tools">
      <button type="button" className="muse-button button-primary" disabled={uploading} onClick={() => fileRef.current?.click()}><MuseIcon name="plus" size={14} /> Photos</button>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; void addFiles(f); }} />
      <input ref={patternFileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void uploadPattern(f); }} />
      <CutoutTools disabled={uploading || clipboardBusy} showGuide={apple} showPaste={coarse} onFiles={(f) => { cutoutHint.dismiss(); void addFiles(f); }} onError={(m) => setUploads({ total: 0, done: 0, errors: [m] })} onOpened={cutoutHint.dismiss} />
      <button ref={anchors.text} type="button" className="muse-button" aria-expanded={panel === "text"} onClick={() => togglePanel("text")}><span className="muse-vision-glyph" aria-hidden="true">Aa</span> Text</button>
      <button ref={anchors.library} type="button" className="muse-button" aria-expanded={panel === "library"} onClick={() => togglePanel("library")}><MuseIcon name="sparkle" size={14} /> Library</button>
      {book && <button ref={anchors.pages} type="button" className="muse-button muse-vision-pages-btn" aria-expanded={panel === "pages"} onClick={() => togglePanel("pages")} title="Pages: open, rename, reorder, add">
        <MuseIcon name="bookmark" size={14} /> {page < 0 ? "Cover" : `Page ${page + 1}`}<small>{board.pages!.length}/{MAX_PAGES}</small></button>}
      {!panelOpen && selected.length > 0 && <button ref={anchors.style} type="button" className="muse-button" aria-expanded={panel === "style"} onClick={() => togglePanel("style")} title="Style the selected piece (or double-click it)"><MuseIcon name="edit" size={14} /> Style</button>}
      <button type="button" className="muse-button" aria-pressed={panelOpen} aria-controls="vision-inspector" title={!panelOpen ? "Show the settings panel" : selected.length ? "Board size, background and export" : "Hide the panel (full-width canvas)"}
        onClick={() => { if (!panelOpen) togglePanelOpen(true); else if (selected.length) setSelectedIds([]); else togglePanelOpen(false); }}><span className="muse-vision-dot" style={{ background: board.background.kind === "pattern" ? paintCss(board.background.paint) : paintCss(board.background.kind === "solid" ? { kind: "solid", color: board.background.color } : { kind: "gradient", gradient: board.background.gradient }) }} aria-hidden="true" /> Board</button>
      <span className="muse-vision-toolbar-gap" />
      <button type="button" className="muse-button" aria-label="Undo" title="Undo (⌘Z)" disabled={!history.past.length} onClick={doUndo}><MuseIcon name="undo" size={15} /></button>
      <button type="button" className="muse-button muse-vision-redo" aria-label="Redo" title="Redo (⇧⌘Z)" disabled={!history.future.length} onClick={doRedo}><MuseIcon name="undo" size={15} /></button>
      {book && size.width >= 900 && <button type="button" className="muse-button" aria-pressed={spread} title="Show the facing page beside this one" onClick={() => { setSpread((x) => !x); autoFit.current = true; }}>Spread</button>}
      <button type="button" className="muse-button" aria-pressed={selectMode} title="Drag a box to select several pieces (Shift-drag works any time)" onClick={() => setSelectMode((x) => !x)}>Select</button>
      <button type="button" className="muse-button" aria-pressed={snapping} title="Snap to edges, centers and the board (hold Alt/Option to drag freely)" onClick={() => setSnapping((x) => !x)}>Snap</button>
      <button ref={anchors.layers} type="button" className="muse-button" aria-expanded={panel === "layers"} onClick={() => togglePanel("layers")}>Layers</button>
      <div className="muse-vision-zoom" role="group" aria-label="Zoom (changes only your view, never the board)">
        <button type="button" className="muse-button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)}><MuseIcon name="minus" size={14} /></button>
        <button type="button" className="muse-button" onClick={fit} title="Fit the board to the screen">{view ? `${Math.round(view.scale * 100)}%` : "Fit"}</button>
        <button type="button" className="muse-button" aria-label="Zoom in" onClick={() => zoomBy(1.25)}><MuseIcon name="plus" size={14} /></button>
      </div>
    </div>
    {recovery && <p className="muse-bucket-notice" role="status">Unsaved changes from {new Date(recovery.at).toLocaleString()} are on this device.{" "}
      <button type="button" className="text-button" onClick={() => { apply((s) => ({ ...s, elements: recovery.elements, background: recovery.background, ...(recovery.size ? { size: recovery.size, canvas: recovery.size === "custom" ? recovery.canvas : undefined } : {}) })); setRecovery(null); }}>Restore them</button>{" "}
      <button type="button" className="text-button" onClick={() => { clearDraft(); setRecovery(null); }}>Discard</button></p>}
    {save.error && <p className="muse-aspiration-error" role="alert">{save.error}{" "}
      {save.conflict ? <><button type="button" className="text-button" onClick={() => void reloadLatest()}>Load the latest</button> <button type="button" className="text-button" onClick={() => void keepMine()}>Keep my version</button></>
        : <button type="button" className="text-button" onClick={() => void flush()}>Try again</button>}</p>}

    <CutoutHint show={cutoutHint.show} onDismiss={cutoutHint.dismiss} />
    {notice && <p className="muse-bucket-notice" role="status">{notice} <button type="button" className="text-button" onClick={() => setNotice("")}>Dismiss</button></p>}
    {(uploading || uploads.errors.length > 0) && <p className={uploads.errors.length ? "muse-aspiration-error" : "muse-bucket-notice"} role={uploads.errors.length ? "alert" : "status"}>
      {uploading ? `Adding image ${Math.min(uploads.done + 1, uploads.total)} of ${uploads.total}…` : ""}
      {uploads.errors.map((m) => <span key={m} className="muse-vision-uploaderror">{m}</span>)}
      {!uploading && <button type="button" className="text-button" onClick={() => setUploads({ total: 0, done: 0, errors: [] })}>Dismiss</button>}
    </p>}

    <div className="muse-vision-workspace" data-panel={panelOpen ? undefined : "closed"} style={canvasHeight ? { ["--vision-canvas-h" as string]: `${canvasHeight}px` } : undefined}>
      <div ref={wrapRef} className="muse-vision-canvas" style={canvasHeight ? { height: canvasHeight } : undefined} data-dropping={dropping || undefined} data-select={selectMode || undefined} {...dropProps}
        onPointerDownCapture={(event) => { if (event.pointerType !== "touch") event.currentTarget.focus({ preventScroll: true }); }}
        onContextMenu={(event) => {
          event.preventDefault(); event.currentTarget.focus({ preventScroll: true });
          const rect = event.currentTarget.getBoundingClientRect(), keyboard = event.clientX === 0 && event.clientY === 0;
          const target = ctxTarget.current; ctxTarget.current = null;
          if (target && !selRef.current.includes(target)) onSelect([target]);
          if (!target && !keyboard) setSelectedIds([]);
          setStyleAtCursor(false); setPanel("");
          setCursorAt({ x: keyboard ? rect.width / 2 : event.clientX - rect.left, y: keyboard ? rect.height / 2 : event.clientY - rect.top }); setMenuOpen(true);
        }}
        role="application" aria-roledescription="collage canvas" aria-label={`${board.title}: ${board.elements.length} pieces on a ${c.w} by ${c.h} board. ${selected.length ? `Selected: ${selected.length > 1 ? `${selected.length} pieces` : elementLabel(selected[0])}.` : "Nothing selected."}`} aria-describedby="vision-canvas-help" tabIndex={0}>
        {book && page < 0 && view && <div className="muse-vision-cover-view" style={{ left: view.x, top: view.y }} aria-label="The cover (choose and customize it in the panel)"><BoardPreview board={displayBoard(board)} width={Math.round(c.w * view.scale)} quality="auto" /></div>}
        {partner !== undefined && view && c.w * view.scale <= 3200 && <>
          <button type="button" className="muse-vision-partner" style={{ left: view.x + (partner > page ? c.w : -c.w) * view.scale, top: view.y, width: c.w * view.scale, height: c.h * view.scale }}
            aria-label={`Open page ${partner + 1}, ${board.pages![partner].title}`} title={`Page ${partner + 1}: ${board.pages![partner].title} (click to edit)`} onClick={() => goToPage(partner)}>
            <BoardPreview board={{ size: board.size, canvas: board.canvas, background: board.pages![partner].background, elements: board.pages![partner].elements }} width={Math.round(c.w * view.scale)} />
          </button>
          <span className="muse-vision-spine" aria-hidden="true" style={{ left: view.x + (partner > page ? c.w : 0) * view.scale, top: view.y, height: c.h * view.scale }} />
        </>}
        {size.width > 0 && view && !(book && page < 0) && <BoardEditorStage board={board} width={size.width} height={size.height} editing={{ selectedIds, onSelect, onChangeMany, view, onView: moveView, snapping, selectMode, reducedMotion, onEdit: (id) => { const e = boardRef.current.elements.find((x) => x.id === id); if (e?.kind === "text" && !e.locked) { setSelectedIds([id]); setEditingText(id); } else openEditor(id); }, onContextTarget: (id) => { ctxTarget.current = id; }, hiddenId: editingText ?? undefined }} />}
        {editingText && view && <InlineText e={board.elements.find((x) => x.id === editingText) as TextElement | undefined} view={view} onChange={(text) => { const t = boardRef.current.elements.find((x) => x.id === editingText) as TextElement | undefined; if (t) onChangeMany([{ id: t.id, patch: { text, h: measureText({ ...t, text }) } as Partial<TextElement> }], `text:${t.id}`); }} onDone={() => { setEditingText(null); wrapRef.current?.focus({ preventScroll: true }); }} />}
        {!board.elements.length && <div className="muse-vision-canvas-empty" aria-hidden="true"><p>Add photos, words, shapes and library pieces.<br />Drag, resize and turn them anywhere.</p></div>}
        {cursorAt && <span ref={pasteAnchor} className="muse-vision-paste-anchor" aria-hidden="true" style={{ left: cursorAt.x, top: cursorAt.y }} />}
        <span className="muse-vision-size-chip" aria-hidden="true">{c.w} × {c.h}</span>
      </div>
      {panelOpen && book && page < 0 && <CoverInspector board={board} cover={board.cover!} setCover={setCover} uploads={boardUploads} requestUpload={requestUpload} onClose={() => togglePanelOpen(false)} />}
      {panelOpen && !(book && page < 0) && <Inspector onClose={() => togglePanelOpen(false)} onDeselect={() => { setSelectedIds([]); wrapRef.current?.focus({ preventScroll: true }); }} board={board} selected={selected} grouped={grouped} units={unitCount} patch={patch} actions={actions} palette={palette} uploads={boardUploads} requestUpload={requestUpload}
        lookups={{ linkOptions, live }} label={elementLabel} />}
    </div>
    <GlassPopover id="vision-canvas-menu" label={selected.length ? "Piece actions" : "Canvas actions"} open={menuOpen} anchorRef={pasteAnchor} onClose={() => { setMenuOpen(false); wrapRef.current?.focus({ preventScroll: true }); }} width={232} bare>
      <CanvasMenu items={selected.length ? [
        { label: "Style…", hint: "", run: () => setStyleAtCursor(true) },
        ...(selected.length === 1 && selected[0].kind === "text" ? [{ label: "Edit words", hint: "double-click", run: () => openEditor(selected[0].id, true) }] : []),
        "-",
        { label: "Copy", hint: "⌘C", run: copy }, { label: "Cut", hint: "⌘X", run: () => { copy(); remove(); } },
        ...(elementClip ? [{ label: "Paste", hint: "⌘V", run: () => { pasteCopied(); } }] : []),
        { label: "Duplicate", hint: "⌘D", run: duplicate },
        "-",
        { label: "Copy style", hint: "⌥⌘C", run: doCopyStyle }, ...(styleClip ? [{ label: "Paste style", hint: "⌥⌘V", run: doPasteStyle }] : []),
        "-",
        { label: "Bring to front", hint: "⇧]", run: () => layer("front") }, { label: "Send to back", hint: "⇧[", run: () => layer("back") },
        ...(grouped ? [{ label: "Ungroup", hint: "⇧⌘G", run: ungroup }] : unitCount > 1 ? [{ label: "Group", hint: "⌘G", run: group }] : []),
        { label: selected.every((e) => e.locked) ? "Unlock" : "Lock", hint: "", run: lock },
        "-",
        { label: "Delete", hint: "⌫", run: remove, danger: true },
      ] : [
        ...(elementClip ? [{ label: "Paste pieces", hint: "⌘V", run: () => { pasteCopied(); } }] : []),
        // Safari confirms every script clipboard read with its own Paste bubble; ⌘V pastes in one step there.
        safari ? { label: "Paste an image with ⌘V", hint: "", run: () => undefined, disabled: true } : { label: "Paste image", hint: "⌘V", run: () => void pasteClipboard(), disabled: uploading || clipboardBusy },
        { label: "Select all", hint: "⌘A", run: () => select(boardRef.current.elements.filter((e) => !e.locked).map((e) => e.id)), disabled: !board.elements.length },
        "-",
        { label: "Board size & background…", hint: "", run: () => togglePanelOpen(true) },
      ]} onDone={() => { setMenuOpen(false); }} />
    </GlassPopover>
    <p id="vision-canvas-help" className="sr-only">Use Layers to choose a piece. Arrow keys move the selection, Shift moves further. Command A selects everything, Command C and V copy and paste pieces, Option Command C and V copy and paste a style, Command G groups and Shift Command G ungroups, Command D duplicates, Delete removes, Command Z undoes, square brackets change layers. Paste copied images with Command V or the canvas context menu.</p>
    <p className="sr-only" role="status" aria-live="polite">{announce}</p>

    {(!panelOpen || styleAtCursor) && selected.length > 0 && <GlassPopover id="vision-style" label="Style" title={selected.length > 1 ? `${selected.length} pieces` : elementLabel(selected[0])} open={panel === "style" || styleAtCursor} anchorRef={styleAtCursor ? pasteAnchor : anchors.style} onClose={() => { setPanel(""); setStyleAtCursor(false); }} width={360}>
      <div className="muse-vision-style-pop">
        <Inspector onDeselect={() => { setPanel(""); setStyleAtCursor(false); setSelectedIds([]); wrapRef.current?.focus({ preventScroll: true }); }} board={board} selected={selected} grouped={grouped} units={unitCount} patch={patch} actions={actions} palette={palette} uploads={boardUploads} requestUpload={requestUpload}
          lookups={{ linkOptions, live }} label={elementLabel} />
      </div>
    </GlassPopover>}
    <GlassPopover id="vision-text" label="Add writing" title="Add writing" open={panel === "text"} anchorRef={anchors.text} onClose={() => setPanel("")} width={300}>
      <ul className="muse-writing-menu">{textPresets.map((t) => { const sample = t.make(c.w); return <li key={t.role}><button type="button" className="popover-choice" onClick={() => { setPanel(""); addText(t.role); }}>
        <span className="muse-writing-hint">{t.hint}</span><span style={{ fontFamily: sample.family ? `"${sample.family}", serif` : "var(--font-editorial)", fontWeight: sample.weight, fontStyle: sample.italic ? "italic" : undefined, letterSpacing: sample.letterSpacing ? `${sample.letterSpacing}em` : undefined, fontSize: t.role === "h1" ? "1.35rem" : t.role === "h2" ? "1.15rem" : t.role === "h3" ? ".78rem" : "1rem" }}>{t.label}</span></button></li>; })}</ul>
      <p className="small-label">Double-click any words on the canvas to write right there.</p>
    </GlassPopover>
    {book && <GlassPopover id="vision-pages" label="Pages" title="Pages" open={panel === "pages"} anchorRef={anchors.pages} onClose={() => setPanel("")} width={420}>
      <PagesMenu board={board} page={page} actions={pageActions} onPicked={() => setPanel("")} />
    </GlassPopover>}
    {reading && book && <BookReader board={{ ...board, pages: syncPage(snapshot()).pages }} startAt={-1} onClose={() => setReading(false)} />}
    <GlassPopover id="vision-library" label="Library" title="Library" open={panel === "library"} anchorRef={anchors.library} onClose={() => setPanel("")} width={400}>
      <AssetLibrary onPick={onLibrary} />
    </GlassPopover>
    <GlassPopover id="vision-layers" label="Layers" title="Layers" open={panel === "layers"} anchorRef={anchors.layers} onClose={() => setPanel("")} width={300} align="end">
      {board.elements.length ? <ol className="muse-vision-layers" aria-label="Layers, top first">{[...board.elements].reverse().map((e) => <li key={e.id}>
        <button type="button" className="popover-choice" aria-pressed={selectedIds.includes(e.id)} onClick={(ev) => { if (ev.shiftKey || ev.metaKey) onSelect([e.id], "toggle"); else { onSelect([e.id], "only"); setPanel(""); } }}>
          {elementLabel(e)}{e.groupId ? " · grouped" : ""}{e.locked ? " · locked" : ""}{e.link ? ` · ${linkStatus(e.link, live(e.link)).missing ? "link missing" : "linked"}` : ""}</button></li>)}</ol>
        : <p className="small-label">Nothing on this board yet.</p>}
    </GlassPopover>

    {sheet === "crop" && selected[0]?.kind === "image" && <CropSheet element={selected[0]} onClose={() => setSheet("")} onApply={(e) => { onChangeMany([{ id: e.id, patch: { w: e.w, h: e.h, crop: e.crop } }]); setSheet(""); }} />}
    {sheet === "details" && <BoardDetails initial={{ ...board, revision: Math.max(1, rev.current) }} today={today} busy={save.saving} error="" onClose={() => setSheet("")}
      onSave={(b) => { const next = { ...boardRef.current, title: b.title, description: b.description, theme: b.theme, period: b.period, periodStart: b.periodStart }; boardRef.current = next; setBoard(next); seq.current++; setSave((s) => ({ ...s, dirty: true })); setSheet(""); }} />}
  </section>
  <p className="small-label muse-vision-hint">Drag empty space to move around · pinch or ⌘-scroll to zoom · Shift-click or Select to pick several · double-click to pick one piece in a group · Alt-drag to skip snapping · paste or drop images to add them.</p>
  </>;
}
export type { Expand };

type MenuItem = { label: string; hint: string; run: () => void; disabled?: boolean; danger?: boolean } | "-";
/** A compact context menu: actions with their shortcuts, separated into small groups. */
function CanvasMenu({ items, onDone }: { items: MenuItem[]; onDone: () => void }) {
  const list = items.filter((x, i, a) => x !== "-" || (i > 0 && i < a.length - 1 && a[i - 1] !== "-"));
  return <div className="muse-vision-menu" role="menu">
    {list.map((x, i) => x === "-" ? <hr key={i} /> : <button key={x.label} type="button" role="menuitem" className="popover-choice" data-danger={x.danger || undefined} disabled={x.disabled} onClick={() => { onDone(); x.run(); }}>
      <span>{x.label}</span>{x.hint && <kbd>{x.hint}</kbd>}</button>)}
  </div>;
}

/**
 * Writing right on the canvas: a text box laid exactly over the words (same font, size, spacing, rotation and zoom),
 * growing as you type. The canvas doesn't pan or drag while you write; Escape or clicking away finishes.
 */
function InlineText({ e, view, onChange, onDone }: { e: TextElement | undefined; view: View; onChange: (text: string) => void; onDone: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const t = ref.current; if (!t) return; t.focus({ preventScroll: true }); t.select(); }, []);
  // Any press outside the box finishes writing (even if the box never had focus, e.g. the window was in the background).
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; });
  useEffect(() => { const away = (ev: PointerEvent) => { if (ev.target !== ref.current) done.current(); }; document.addEventListener("pointerdown", away, true); return () => document.removeEventListener("pointerdown", away, true); }, []);
  useEffect(() => { if (e?.family) void ensureFont(e.family, textWeight(e), !!e.italic); }, [e?.family, e?.weight, e?.italic]); // eslint-disable-line react-hooks/exhaustive-deps -- font identity only
  useLayoutEffect(() => { const t = ref.current; if (t) { t.style.height = "auto"; t.style.height = `${t.scrollHeight}px`; } });
  if (!e) return null;
  const s = view.scale, size = e.size * s;
  return <textarea ref={ref} className="muse-vision-inline-text" aria-label="Words" value={e.text} maxLength={4000} spellCheck
    style={{ left: view.x + e.x * s, top: view.y + e.y * s, width: e.w * s, minHeight: e.h * s, transform: `translate(-50%, -50%) rotate(${e.rotation}deg)`, fontFamily: e.family ? familyCss(e.family) : fontFamily(e.font), fontSize: size, fontWeight: textWeight(e), fontStyle: e.italic ? "italic" : undefined, lineHeight: e.lineHeight ?? (e.font === "editorial" && !e.family ? 1.12 : 1.25), letterSpacing: e.letterSpacing ? `${e.letterSpacing * size}px` : undefined, textAlign: e.align, color: paintColor(e.paint, e.color), padding: e.highlight ? e.size * 0.22 * s : 0 }}
    onChange={(ev) => onChange(ev.target.value)} onBlur={onDone} onPointerDown={(ev) => ev.stopPropagation()}
    onKeyDown={(ev) => { ev.stopPropagation(); if (ev.key === "Escape") { ev.preventDefault(); onDone(); } }} />;
}
