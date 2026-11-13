"use client";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ClipboardEvent as ReactClipboardEvent, type DragEvent, type KeyboardEvent } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { uploadBoardImage } from "@/lib/data/constellation-images";
import {
  boardSizes, canvasOf, emptyHistory, fitImage, linkStatus, MAX_ELEMENTS, nextPlacement, periodLabel, record, redo, undo, usedPaths,
  type Asset, type Background, type BoardElement, type ElementLink, type History, type ImageElement, type PieceElement, type ShapeElement, type Snapshot, type StickerElement, type TextElement, type VisionBoard,
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
import { BoardEditorStage, fitView, measureText, prefersReducedMotion, type Patch, type View } from "./BoardCanvas";
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

type Lookups = { aspirations: Aspiration[]; dreams: BucketEntry[] };
type Draft = { revision: number; at: string; elements: BoardElement[]; background: Background; size?: VisionBoard["size"]; canvas?: VisionBoard["canvas"] };
const uid = () => crypto.randomUUID();
const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
export function elementLabel(e: BoardElement): string {
  if (e.kind === "image") return `Photo${e.image.name ? ` · ${e.image.name}` : ""}`;
  if (e.kind === "text") return `Text “${e.text.trim().slice(0, 32) || "…"}”`;
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
export default function BoardEditor({ initial, userId, today, lookups, onSaved, onBack, sweep }: {
  initial: VisionBoard; userId: string; today: string; lookups: Lookups;
  onSaved: (b: VisionBoard) => void; onBack: () => void; sweep: (boardId: string, keep: Set<string>) => void;
}) {
  const client = useMemo(() => createMuseBrowserClient(), []);
  const [board, setBoard] = useState(initial);
  const [history, setHistory] = useState<History>(emptyHistory);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [save, setSave] = useState({ dirty: false, saving: false, error: "", conflict: false });
  const [uploads, setUploads] = useState<{ total: number; done: number; errors: string[] }>({ total: 0, done: 0, errors: [] });
  const [panel, setPanel] = useState<"" | "library" | "layers" | "style">("");
  const [sheet, setSheet] = useState<"" | "crop" | "details">("");
  const [recovery, setRecovery] = useState<Draft | null>(null);
  const [announce, setAnnounce] = useState("");
  const [pasteMenu, setPasteMenu] = useState<{ x: number; y: number } | null>(null);
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
  const anchors = { library: useRef<HTMLButtonElement>(null), layers: useRef<HTMLButtonElement>(null), style: useRef<HTMLButtonElement>(null) };
  const selected = useMemo(() => board.elements.filter((e) => selectedIds.includes(e.id)), [board.elements, selectedIds]);
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
  const fit = useCallback(() => { if (!size.width) return; autoFit.current = true; setView(fitView({ size: "custom", canvas: box }, size.width, size.height, 14)); }, [box.w, box.h, size]); // eslint-disable-line react-hooks/exhaustive-deps -- box is derived from w/h
  /**
   * The editing area takes the board's own proportions at the available width, so a wider or taller board really is
   * a wider or taller canvas (not a fixed box with empty table around it). Phones keep it within the screen so the
   * page can still scroll past it.
   */
  const [coarse] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches);
  const canvasHeight = size.width ? Math.round(Math.max(320, Math.min(size.width * (box.h / box.w) + 28, coarse ? window.innerHeight * 0.78 : size.width * 2.2))) : undefined;
  useEffect(() => { if (!size.width || !autoFit.current) return; const t = window.setTimeout(fit, 0); return () => window.clearTimeout(t); }, [size, fit]);
  const moveView = (v: View) => { autoFit.current = false; setView(v); };
  const zoomBy = (factor: number) => view && moveView((() => {
    const c = { x: size.width / 2, y: size.height / 2 }, scale = Math.min(4, Math.max(0.03, view.scale * factor)), bx = (c.x - view.x) / view.scale, by = (c.y - view.y) / view.scale;
    return { scale, x: c.x - bx * scale, y: c.y - by * scale };
  })());

  // ---------- Editing with history ----------
  const snapshot = (b: VisionBoard = boardRef.current): Snapshot => ({ elements: b.elements, background: b.background, size: b.size, canvas: b.canvas });
  /** Applies a change. Rapid edits with the same `key` (typing, a slider) become one undo step. */
  const apply = useCallback((change: (s: Snapshot) => Snapshot, key?: string) => {
    const before = snapshot(), next = change(before);
    if (next === before) return;
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
    boardRef.current = b; setBoard(b); seq.current++; setSave((x) => ({ ...x, dirty: true })); lastKey.current = null;
    setSelectedIds((ids) => ids.filter((id) => s.elements.some((e) => e.id === id)));
  };
  const doUndo = () => { const r = undo(historyRef.current, snapshot()); if (r) { setHistory(r.history); restore(r.snapshot); setAnnounce("Undone"); } };
  const doRedo = () => { const r = redo(historyRef.current, snapshot()); if (r) { setHistory(r.history); restore(r.snapshot); setAnnounce("Redone"); } };

  // ---------- Saving ----------
  const writeDraft = useCallback(() => {
    try { const b = boardRef.current; localStorage.setItem(draftKey(b.id), JSON.stringify({ revision: rev.current, at: new Date().toISOString(), elements: b.elements, background: b.background, size: b.size, canvas: b.canvas } satisfies Draft)); } catch { /* storage full or blocked: the autosave still runs */ }
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
  function addText() {
    const base: TextElement = { id: uid(), kind: "text", ...place(640, 100), rotation: 0, text: "Dream big", font: "editorial", size: 84, color: "#2a2135", align: "center", italic: true };
    add({ ...base, h: measureText(base) }, "Text");
    openEditor(base.id, true);
  }
  /**
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
  const applyCanvas = (r: ReturnType<typeof expandCanvas>, label: string) => {
    apply((s) => ({ ...s, size: r.size, canvas: r.canvas, elements: r.elements }));
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
    apply((x) => ({ ...x, size: s, canvas: undefined, elements: r.elements }));
    const v = viewRef.current; if (v && (r.shift.x || r.shift.y)) moveView({ ...v, x: v.x - r.shift.x * v.scale, y: v.y - r.shift.y * v.scale });
    setAnnounce(c.w === p.w && c.h === p.h ? `${p.label}` : `The board is now ${p.label} (${p.w} by ${p.h})`);
  };
  const background = (bg: Background) => apply((s) => ({ ...s, background: bg }), "background");
  function makeSticker() {
    const e = selected[0]; if (e?.kind !== "image") return;
    changeElements((els) => els.map((x) => x.id === e.id ? { ...e, border: undefined, outline: e.outline ?? { color: "#ffffff", width: Math.max(6, Math.round(Math.min(e.w, e.h) * 0.045)) }, finish: e.finish ?? { kind: "glossy", intensity: 0.55 }, shadow: true, shadowStyle: e.shadowStyle ?? { ...defaultShadow, blur: 14, y: 6, opacity: 0.28 } } as ImageElement : x));
    setAnnounce("Made into a sticker");
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
      const blob = await exportBoard(boardRef.current, { scale: 2, type });
      const name = `${(board.title || "Vision board").replace(/[\\/:*?"<>|]+/g, " ").trim()}.${type === "image/png" ? "png" : "jpg"}`, file = new File([blob], name, { type });
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
    crop: () => setSheet("crop"), makeSticker, addBacking, expand, resize, preset, background, exportImage: (t) => void exportImage(t), exporting,
  };
  const c = box;

  return <><section className="muse-vision-editor muse-planner-surface" aria-label={`Vision board: ${board.title}`} onKeyDown={onKey} onPaste={onPaste}>
    <header className="muse-vision-editor-head">
      <button type="button" className="muse-button" onClick={() => void leave()}><span aria-hidden="true">‹</span> Boards</button>
      <div className="muse-vision-editor-title">
        <h2>{board.title}</h2>
        <p className="small-label">{[board.theme, periodLabel(board.period, board.periodStart)].filter(Boolean).join(" · ") || "No period"}{intentionsHref && <> · <Link href={intentionsHref}>Intentions for {periodLabel(board.period, board.periodStart)}</Link></>}</p>
      </div>
      <SaveIndicator label="Board" loaded pending={save.dirty} saving={save.saving} error={save.error ? "Not saved yet" : ""} />
      <button type="button" className="muse-button" onClick={() => setSheet("details")}><MuseIcon name="edit" size={14} /> Details</button>
    </header>

    {recovery && <p className="muse-bucket-notice" role="status">Unsaved changes from {new Date(recovery.at).toLocaleString()} are on this device.{" "}
      <button type="button" className="text-button" onClick={() => { apply((s) => ({ ...s, elements: recovery.elements, background: recovery.background, ...(recovery.size ? { size: recovery.size, canvas: recovery.size === "custom" ? recovery.canvas : undefined } : {}) })); setRecovery(null); }}>Restore them</button>{" "}
      <button type="button" className="text-button" onClick={() => { clearDraft(); setRecovery(null); }}>Discard</button></p>}
    {save.error && <p className="muse-aspiration-error" role="alert">{save.error}{" "}
      {save.conflict ? <><button type="button" className="text-button" onClick={() => void reloadLatest()}>Load the latest</button> <button type="button" className="text-button" onClick={() => void keepMine()}>Keep my version</button></>
        : <button type="button" className="text-button" onClick={() => void flush()}>Try again</button>}</p>}

    <div className="muse-vision-toolbar muse-scroll-fade" role="toolbar" aria-label="Add to the board">
      <button type="button" className="muse-button button-primary" disabled={uploading} onClick={() => fileRef.current?.click()}><MuseIcon name="plus" size={14} /> Photos</button>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; void addFiles(f); }} />
      <input ref={patternFileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void uploadPattern(f); }} />
      <CutoutTools disabled={uploading || clipboardBusy} showGuide={apple} onFiles={(f) => { cutoutHint.dismiss(); void addFiles(f); }} onError={(m) => setUploads({ total: 0, done: 0, errors: [m] })} onOpened={cutoutHint.dismiss} />
      <button type="button" className="muse-button" onClick={addText}><span className="muse-vision-glyph" aria-hidden="true">Aa</span> Text</button>
      <button ref={anchors.library} type="button" className="muse-button" aria-expanded={panel === "library"} onClick={() => togglePanel("library")}><MuseIcon name="sparkle" size={14} /> Library</button>
      {!panelOpen && selected.length > 0 && <button ref={anchors.style} type="button" className="muse-button" aria-expanded={panel === "style"} onClick={() => togglePanel("style")} title="Style the selected piece (or double-click it)"><MuseIcon name="edit" size={14} /> Style</button>}
      <button type="button" className="muse-button" aria-pressed={panelOpen} aria-controls="vision-inspector" title={!panelOpen ? "Show the settings panel" : selected.length ? "Board size, background and export" : "Hide the panel (full-width canvas)"}
        onClick={() => { if (!panelOpen) togglePanelOpen(true); else if (selected.length) setSelectedIds([]); else togglePanelOpen(false); }}><span className="muse-vision-dot" style={{ background: board.background.kind === "pattern" ? paintCss(board.background.paint) : paintCss(board.background.kind === "solid" ? { kind: "solid", color: board.background.color } : { kind: "gradient", gradient: board.background.gradient }) }} aria-hidden="true" /> Board</button>
      <span className="muse-vision-toolbar-gap" />
      <button type="button" className="muse-button" aria-label="Undo" title="Undo (⌘Z)" disabled={!history.past.length} onClick={doUndo}><MuseIcon name="undo" size={15} /></button>
      <button type="button" className="muse-button muse-vision-redo" aria-label="Redo" title="Redo (⇧⌘Z)" disabled={!history.future.length} onClick={doRedo}><MuseIcon name="undo" size={15} /></button>
      <button type="button" className="muse-button" aria-pressed={selectMode} title="Drag a box to select several pieces (Shift-drag works any time)" onClick={() => setSelectMode((x) => !x)}>Select</button>
      <button type="button" className="muse-button" aria-pressed={snapping} title="Snap to edges, centers and the board (hold Alt/Option to drag freely)" onClick={() => setSnapping((x) => !x)}>Snap</button>
      <button ref={anchors.layers} type="button" className="muse-button" aria-expanded={panel === "layers"} onClick={() => togglePanel("layers")}>Layers</button>
      <div className="muse-vision-zoom" role="group" aria-label="Zoom (changes only your view, never the board)">
        <button type="button" className="muse-button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)}><MuseIcon name="minus" size={14} /></button>
        <button type="button" className="muse-button" onClick={fit} title="Fit the board to the screen">{view ? `${Math.round(view.scale * 100)}%` : "Fit"}</button>
        <button type="button" className="muse-button" aria-label="Zoom in" onClick={() => zoomBy(1.25)}><MuseIcon name="plus" size={14} /></button>
      </div>
    </div>

    <CutoutHint show={cutoutHint.show} onDismiss={cutoutHint.dismiss} />
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
          setPasteMenu({ x: keyboard ? rect.width / 2 : event.clientX - rect.left, y: keyboard ? rect.height / 2 : event.clientY - rect.top });
        }}
        role="application" aria-roledescription="collage canvas" aria-label={`${board.title}: ${board.elements.length} pieces on a ${c.w} by ${c.h} board. ${selected.length ? `Selected: ${selected.length > 1 ? `${selected.length} pieces` : elementLabel(selected[0])}.` : "Nothing selected."}`} aria-describedby="vision-canvas-help" tabIndex={0}>
        {size.width > 0 && view && <BoardEditorStage board={board} width={size.width} height={size.height} editing={{ selectedIds, onSelect, onChangeMany, view, onView: moveView, snapping, selectMode, reducedMotion, onEdit: (id) => openEditor(id) }} />}
        {!board.elements.length && <div className="muse-vision-canvas-empty" aria-hidden="true"><p>Add photos, words, shapes and library pieces.<br />Drag, resize and turn them anywhere.</p></div>}
        {pasteMenu && <span ref={pasteAnchor} className="muse-vision-paste-anchor" aria-hidden="true" style={{ left: pasteMenu.x, top: pasteMenu.y }} />}
        <span className="muse-vision-size-chip" aria-hidden="true">{c.w} × {c.h}</span>
      </div>
      {panelOpen && <Inspector onClose={() => togglePanelOpen(false)} onDeselect={() => { setSelectedIds([]); wrapRef.current?.focus({ preventScroll: true }); }} board={board} selected={selected} grouped={grouped} units={unitCount} patch={patch} actions={actions} palette={palette} uploads={boardUploads} requestUpload={requestUpload}
        lookups={{ linkOptions, live }} label={elementLabel} />}
    </div>
    <GlassPopover id="vision-canvas-paste" label="Canvas actions" open={!!pasteMenu} anchorRef={pasteAnchor} onClose={() => { setPasteMenu(null); wrapRef.current?.focus({ preventScroll: true }); }} width={220} bare>
      {elementClip && <button type="button" className="popover-choice" onClick={() => { setPasteMenu(null); wrapRef.current?.focus({ preventScroll: true }); pasteCopied(); }}>Paste pieces</button>}
      <button type="button" className="popover-choice" disabled={uploading || clipboardBusy} onClick={() => { setPasteMenu(null); wrapRef.current?.focus({ preventScroll: true }); void pasteClipboard(); }}>Paste image</button>
      {styleClip && selected.length > 0 && <button type="button" className="popover-choice" onClick={() => { setPasteMenu(null); doPasteStyle(); }}>Paste style</button>}
    </GlassPopover>
    <p id="vision-canvas-help" className="sr-only">Use Layers to choose a piece. Arrow keys move the selection, Shift moves further. Command A selects everything, Command C and V copy and paste pieces, Option Command C and V copy and paste a style, Command G groups and Shift Command G ungroups, Command D duplicates, Delete removes, Command Z undoes, square brackets change layers. Paste copied images with Command V or the canvas context menu.</p>
    <p className="sr-only" role="status" aria-live="polite">{announce}</p>

    {!panelOpen && selected.length > 0 && <GlassPopover id="vision-style" label="Style" title={selected.length > 1 ? `${selected.length} pieces` : elementLabel(selected[0])} open={panel === "style"} anchorRef={anchors.style} onClose={() => setPanel("")} width={360}>
      <div className="muse-vision-style-pop">
        <Inspector onDeselect={() => { setPanel(""); setSelectedIds([]); wrapRef.current?.focus({ preventScroll: true }); }} board={board} selected={selected} grouped={grouped} units={unitCount} patch={patch} actions={actions} palette={palette} uploads={boardUploads} requestUpload={requestUpload}
          lookups={{ linkOptions, live }} label={elementLabel} />
      </div>
    </GlassPopover>}
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
