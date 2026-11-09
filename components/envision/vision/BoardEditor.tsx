"use client";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ClipboardEvent as ReactClipboardEvent, type DragEvent, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { uploadBoardImage } from "@/lib/data/constellation-images";
import {
  duplicateElement, emptyHistory, fitImage, fonts, linkStatus, MAX_ELEMENTS, moveLayer, nextPlacement, periodLabel, record, redo, removeElement, undo, updateElement, usedPaths,
  type Asset, type Background, type BoardElement, type ElementLink, type History, type ImageElement, type LayerMove, type Snapshot, type StickerElement, type TextElement, type VisionBoard,
} from "@/lib/vision-boards/model";
import { loadBoard, saveBoard } from "@/lib/vision-boards/persistence";
import { sticker as stickerDef, stickers } from "@/lib/vision-boards/shapes";
import { pinAccent, type CustomGradient } from "@/lib/appearance-values";
import type { Aspiration } from "@/lib/aspirations/models";
import type { BucketEntry } from "@/lib/bucket-list/models";
import { GlassPopover } from "../../GlassPopover";
import { MuseChoiceMenu } from "../../MuseChoiceMenu";
import { MuseColorPicker } from "../../MuseColorPicker";
import { MuseIcon } from "../../MuseIcon";
import { MusePaintPicker } from "../../MusePaintPicker";
import { SaveIndicator } from "../../SaveIndicator";
import { BoardEditorStage, fitView, measureText, type View } from "./BoardCanvas";
import { BoardDetails, backgroundCss } from "./BoardDetails";
import { CropSheet } from "./CropSheet";
import { CutoutHint, CutoutTools, useAppleTouch, useCutoutHint } from "./CutoutHelp";
import { markStickers } from "./icons";
import { draftKey } from "./useVisionBoards";

type Lookups = { aspirations: Aspiration[]; dreams: BucketEntry[] };
type Draft = { revision: number; at: string; elements: BoardElement[]; background: Background };
const uid = () => crypto.randomUUID();
const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
export function elementLabel(e: BoardElement): string {
  if (e.kind === "image") return `Photo${e.image.name ? ` · ${e.image.name}` : ""}`;
  if (e.kind === "text") return `Text “${e.text.trim().slice(0, 32) || "…"}”`;
  return stickerDef(e.sticker)?.label ?? markStickers.find((m) => m.id === e.sticker)?.label ?? "Sticker";
}

/**
 * The collage editor (#118 §4–5). Edits apply to a local copy with undo/redo; it autosaves shortly after each change,
 * saves right away when the app is backgrounded, and keeps a recovery copy on this device until the save is confirmed.
 */
export default function BoardEditor({ initial, userId, today, lookups, onSaved, onBack, sweep }: {
  initial: VisionBoard; userId: string; today: string; lookups: Lookups;
  onSaved: (b: VisionBoard) => void; onBack: () => void; sweep: (boardId: string, keep: Set<string>) => void;
}) {
  const client = useMemo(() => createMuseBrowserClient(), []);
  const [board, setBoard] = useState(initial);
  const [history, setHistory] = useState<History>(emptyHistory);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [save, setSave] = useState({ dirty: false, saving: false, error: "", conflict: false });
  const [uploads, setUploads] = useState<{ total: number; done: number; errors: string[] }>({ total: 0, done: 0, errors: [] });
  const [panel, setPanel] = useState<"" | "stickers" | "background" | "layers" | "color" | "border" | "link">("");
  const [sheet, setSheet] = useState<"" | "crop" | "details">("");
  const [recovery, setRecovery] = useState<Draft | null>(null);
  const [announce, setAnnounce] = useState("");
  const boardRef = useRef(board); boardRef.current = board;
  const historyRef = useRef(history); historyRef.current = history;
  const rev = useRef(initial.revision), seq = useRef(0), saving = useRef(false), again = useRef(false);
  const lastKey = useRef<{ key: string; at: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null), wrapRef = useRef<HTMLDivElement>(null);
  const anchors = { stickers: useRef<HTMLButtonElement>(null), background: useRef<HTMLButtonElement>(null), layers: useRef<HTMLButtonElement>(null), color: useRef<HTMLButtonElement>(null), border: useRef<HTMLButtonElement>(null), link: useRef<HTMLButtonElement>(null) };
  const selected = board.elements.find((e) => e.id === selectedId) ?? null;

  // ---------- Viewport ----------
  const [size, setSize] = useState({ width: 0, height: 0 }), [view, setView] = useState<View | null>(null);
  useLayoutEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(([entry]) => { const { width, height } = entry.contentRect; setSize({ width: Math.round(width), height: Math.round(height) }); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // The board stays fitted to the canvas (as the layout settles, or the window or phone rotates) until the person
  // pans or zooms themselves; "Fit" returns to that.
  const autoFit = useRef(true);
  const boardSize = board.size;
  const fit = useCallback(() => { if (!size.width) return; autoFit.current = true; setView(fitView({ size: boardSize }, size.width, size.height)); }, [boardSize, size]);
  useEffect(() => { if (!size.width || !autoFit.current) return; const t = window.setTimeout(fit, 0); return () => window.clearTimeout(t); }, [size, fit]);
  const moveView = (v: View) => { autoFit.current = false; setView(v); };
  const zoomBy = (factor: number) => view && moveView((() => {
    const c = { x: size.width / 2, y: size.height / 2 }, scale = Math.min(4, Math.max(0.08, view.scale * factor)), bx = (c.x - view.x) / view.scale, by = (c.y - view.y) / view.scale;
    return { scale, x: c.x - bx * scale, y: c.y - by * scale };
  })());

  // ---------- Editing with history ----------
  const snapshot = (b: VisionBoard = boardRef.current): Snapshot => ({ elements: b.elements, background: b.background });
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
  const change = (id: string, patch: Partial<BoardElement>, key?: string) => apply((s) => ({ ...s, elements: updateElement(s.elements, id, patch) }), key);
  const restore = (s: Snapshot) => { const b = { ...boardRef.current, ...s }; boardRef.current = b; setBoard(b); seq.current++; setSave((x) => ({ ...x, dirty: true })); lastKey.current = null; if (selectedId && !s.elements.some((e) => e.id === selectedId)) setSelectedId(null); };
  const doUndo = () => { const r = undo(historyRef.current, snapshot()); if (r) { setHistory(r.history); restore(r.snapshot); setAnnounce("Undone"); } };
  const doRedo = () => { const r = redo(historyRef.current, snapshot()); if (r) { setHistory(r.history); restore(r.snapshot); setAnnounce("Redone"); } };

  // ---------- Saving ----------
  const writeDraft = useCallback(() => {
    try { const b = boardRef.current; localStorage.setItem(draftKey(b.id), JSON.stringify({ revision: rev.current, at: new Date().toISOString(), elements: b.elements, background: b.background } satisfies Draft)); } catch { /* storage full or blocked: the autosave still runs */ }
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
      if (JSON.stringify({ e: d.elements, b: d.background }) === JSON.stringify({ e: initial.elements, b: initial.background })) { localStorage.removeItem(draftKey(initial.id)); return; }
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
    rev.current = latest.revision; boardRef.current = latest; setBoard(latest); setHistory(emptyHistory()); setSelectedId(null); clearDraft(); onSaved(latest);
    setSave({ dirty: false, saving: false, error: "", conflict: false });
  }
  async function keepMine() {
    const latest = await loadBoard(client, board.id).catch(() => null);
    if (!latest) return;
    rev.current = latest.revision; seq.current++;
    setSave({ dirty: true, saving: false, error: "", conflict: false });
  }

  // ---------- Adding ----------
  const place = (w: number, h: number) => ({ ...nextPlacement(board, board.elements.length), w, h });
  const add = (e: BoardElement, label: string) => {
    if (boardRef.current.elements.length >= MAX_ELEMENTS) { setAnnounce(`A board holds up to ${MAX_ELEMENTS} pieces.`); return; }
    apply((s) => ({ ...s, elements: [...s.elements, e] }));
    setSelectedId(e.id); setAnnounce(`${label} added`);
  };
  async function addFiles(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    setUploads({ total: images.length, done: 0, errors: [] });
    for (const file of images) {
      try {
        const up = await uploadBoardImage(userId, board.id, file, { allowJpeg: true, keepTransparency: true });
        const asset: Asset = { path: up.path, thumbnailPath: up.thumbnailPath, width: up.width, height: up.height, mime: up.mime, name: up.name, ...(up.alpha ? { alpha: true } : {}) };
        const { w, h } = fitImage(board, asset);
        const e: ImageElement = { id: uid(), kind: "image", ...place(w, h), image: asset, crop: { shape: "rect", zoom: 1, x: 0, y: 0 }, ...(asset.alpha ? {} : { border: { color: "#ffffff", width: 10 }, shadow: true }) };
        add(e, "Photo");
        setUploads((u) => ({ ...u, done: u.done + 1 }));
      } catch (err) {
        setUploads((u) => ({ ...u, done: u.done + 1, errors: [...u.errors, `${file.name}: ${err instanceof Error ? err.message : "couldn’t upload"}`] }));
      }
    }
  }
  function addText() {
    const base: TextElement = { id: uid(), kind: "text", ...place(640, 100), rotation: 0, text: "Dream big", font: "editorial", size: 84, color: "#2a2135", align: "center", italic: true };
    add({ ...base, h: measureText(base) }, "Text");
    window.setTimeout(() => document.getElementById("vision-text-input")?.focus(), 50);
  }
  function addSticker(id: string) {
    const def = stickerDef(id), [bw, bh] = def?.box ?? [24, 24], s = 180, w = bw >= bh ? s : Math.round((s * bw) / bh), h = bw >= bh ? Math.round((s * bh) / bw) : s;
    let color: `#${string}` = "#f4a259";
    try { color = pinAccent(id === "tape" ? "secondary" : "primary"); } catch { /* default */ }
    const e: StickerElement = { id: uid(), kind: "sticker", ...place(w, h), sticker: id, color };
    add(e, elementLabel(e)); setPanel("");
  }

  // ---------- Selection actions ----------
  const layer = (move: LayerMove) => selected && apply((s) => ({ ...s, elements: moveLayer(s.elements, selected.id, move) }));
  const duplicate = () => { if (!selected) return; const id = uid(); apply((s) => ({ ...s, elements: duplicateElement(s.elements, selected.id, id) })); setSelectedId(id); setAnnounce("Duplicated"); };
  const remove = () => { if (!selected) return; apply((s) => ({ ...s, elements: removeElement(s.elements, selected.id) })); setSelectedId(null); setAnnounce(`${elementLabel(selected)} removed. Undo brings it back.`); };
  const nudge = (dx: number, dy: number) => selected && !selected.locked && change(selected.id, { x: selected.x + dx, y: selected.y + dy }, `nudge:${selected.id}`);
  function onKey(ev: KeyboardEvent) {
    if (typing(ev.target)) return;
    const mod = ev.metaKey || ev.ctrlKey;
    if (mod && ev.key.toLowerCase() === "z") { ev.preventDefault(); if (ev.shiftKey) doRedo(); else doUndo(); return; }
    if (mod && ev.key.toLowerCase() === "y") { ev.preventDefault(); doRedo(); return; }
    if (!selected) return;
    const step = ev.shiftKey ? 10 : 2;
    if (mod && ev.key.toLowerCase() === "d") { ev.preventDefault(); duplicate(); }
    else if (ev.key === "Delete" || ev.key === "Backspace") { ev.preventDefault(); remove(); }
    else if (ev.key === "Escape") setSelectedId(null);
    else if (ev.key === "ArrowLeft") { ev.preventDefault(); nudge(-step, 0); }
    else if (ev.key === "ArrowRight") { ev.preventDefault(); nudge(step, 0); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); nudge(0, -step); }
    else if (ev.key === "ArrowDown") { ev.preventDefault(); nudge(0, step); }
    else if (ev.key === "]") layer(ev.shiftKey ? "front" : "forward");
    else if (ev.key === "[") layer(ev.shiftKey ? "back" : "backward");
  }
  function onPaste(ev: ReactClipboardEvent) {
    if (typing(ev.target)) return;
    const files = Array.from(ev.clipboardData.files);
    if (files.length) { ev.preventDefault(); void addFiles(files); }
  }
  const [dropping, setDropping] = useState(false);
  const dropProps = {
    onDragOver: (ev: DragEvent) => { if (ev.dataTransfer.types.includes("Files")) { ev.preventDefault(); setDropping(true); } },
    onDragLeave: () => setDropping(false),
    onDrop: (ev: DragEvent) => { setDropping(false); if (!ev.dataTransfer.files.length) return; ev.preventDefault(); void addFiles(Array.from(ev.dataTransfer.files)); },
  };

  const background = (bg: Background) => apply((s) => ({ ...s, background: bg }), "background");
  const live = (l: ElementLink) => l.kind === "aspiration" ? (() => { const a = lookups.aspirations.find((x) => x.id === l.id); return a && { label: a.title }; })() : (() => { const d = lookups.dreams.find((x) => x.id === l.id); return d && { label: d.title }; })();
  const linkOptions = [...lookups.aspirations.filter((a) => a.status !== "archived").map((a) => ({ id: `aspiration:${a.id}`, label: `🌱 ${a.title}` })), ...lookups.dreams.filter((d) => !d.archivedAt).map((d) => ({ id: `bucket:${d.id}`, label: `🗺️ ${d.title}` }))];
  const togglePanel = (p: typeof panel) => setPanel((x) => x === p ? "" : p);
  // Option A cutouts: guidance for Apple's own "lift subject", only where it exists (iPhone, iPad).
  const apple = useAppleTouch(), cutoutHint = useCutoutHint(apple);
  const uploading = uploads.done < uploads.total;
  const intentionsHref = board.period && board.periodStart ? `/planner?view=intentions&period=${board.period}&date=${board.periodStart}` : null;

  return <section className="muse-vision-editor muse-planner-surface" aria-label={`Vision board: ${board.title}`} onKeyDown={onKey} onPaste={onPaste}>
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
      <button type="button" className="text-button" onClick={() => { apply((s) => ({ ...s, elements: recovery.elements, background: recovery.background })); setRecovery(null); }}>Restore them</button>{" "}
      <button type="button" className="text-button" onClick={() => { clearDraft(); setRecovery(null); }}>Discard</button></p>}
    {save.error && <p className="muse-aspiration-error" role="alert">{save.error}{" "}
      {save.conflict ? <><button type="button" className="text-button" onClick={() => void reloadLatest()}>Load the latest</button> <button type="button" className="text-button" onClick={() => void keepMine()}>Keep my version</button></>
        : <button type="button" className="text-button" onClick={() => void flush()}>Try again</button>}</p>}

    <div className="muse-vision-toolbar muse-scroll-fade" role="toolbar" aria-label="Add to the board">
      <button type="button" className="muse-button button-primary" disabled={uploading} onClick={() => fileRef.current?.click()}><MuseIcon name="plus" size={14} /> Photos</button>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; void addFiles(f); }} />
      {apple && <CutoutTools disabled={uploading} onFiles={(f) => { cutoutHint.dismiss(); void addFiles(f); }} onError={(m) => setUploads({ total: 0, done: 0, errors: [m] })} onOpened={cutoutHint.dismiss} />}
      <button type="button" className="muse-button" onClick={addText}><span className="muse-vision-glyph" aria-hidden="true">Aa</span> Text</button>
      <button ref={anchors.stickers} type="button" className="muse-button" aria-expanded={panel === "stickers"} onClick={() => togglePanel("stickers")}><MuseIcon name="sparkle" size={14} /> Stickers</button>
      <button ref={anchors.background} type="button" className="muse-button" aria-expanded={panel === "background"} onClick={() => togglePanel("background")}><span className="muse-vision-dot" style={{ background: backgroundCss(board.background) }} aria-hidden="true" /> Background</button>
      <span className="muse-vision-toolbar-gap" />
      <button type="button" className="muse-button" aria-label="Undo" title="Undo (⌘Z)" disabled={!history.past.length} onClick={doUndo}><MuseIcon name="undo" size={15} /></button>
      <button type="button" className="muse-button muse-vision-redo" aria-label="Redo" title="Redo (⇧⌘Z)" disabled={!history.future.length} onClick={doRedo}><MuseIcon name="undo" size={15} /></button>
      <button ref={anchors.layers} type="button" className="muse-button" aria-expanded={panel === "layers"} onClick={() => togglePanel("layers")}>Layers</button>
      <div className="muse-vision-zoom" role="group" aria-label="Zoom">
        <button type="button" className="muse-button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)}><MuseIcon name="minus" size={14} /></button>
        <button type="button" className="muse-button" onClick={fit} title="Fit the board to the screen">{view ? `${Math.round(view.scale * 100)}%` : "Fit"}</button>
        <button type="button" className="muse-button" aria-label="Zoom in" onClick={() => zoomBy(1.25)}><MuseIcon name="plus" size={14} /></button>
      </div>
    </div>

    <CutoutHint show={cutoutHint.show} onDismiss={cutoutHint.dismiss} />
    {selected && <SelectionBar>
      <span className="muse-vision-selname">{elementLabel(selected)}</span>
      {selected.kind === "image" && <>
        <button type="button" className="muse-button" onClick={() => setSheet("crop")}>Crop & shape</button>
        {selected.crop.shape === "rect" && selected.image.alpha
          ? <button ref={anchors.border} type="button" className="muse-button" aria-expanded={panel === "border"} onClick={() => togglePanel("border")}>Outline</button>
          : <button ref={anchors.border} type="button" className="muse-button" aria-expanded={panel === "border"} onClick={() => togglePanel("border")}>Border</button>}
        <button type="button" className="muse-button" aria-pressed={!!selected.shadow} onClick={() => change(selected.id, { shadow: !selected.shadow })}>Shadow</button>
      </>}
      {selected.kind === "text" && <TextControls e={selected} onChange={(p, key) => change(selected.id, { ...p, h: measureText({ ...selected, ...p }) } as Partial<TextElement>, key)} colorAnchor={anchors.color} onColor={() => togglePanel("color")} colorOpen={panel === "color"} />}
      {selected.kind === "sticker" && <button ref={anchors.color} type="button" className="muse-button" aria-expanded={panel === "color"} onClick={() => togglePanel("color")}><span className="muse-vision-dot" style={{ background: selected.color }} aria-hidden="true" /> Color</button>}
      <span className="muse-vision-toolbar-gap" />
      <div className="muse-vision-group" role="group" aria-label="Layer order">
        <button type="button" className="muse-button" title="Bring forward (])" onClick={() => layer("forward")}>Forward</button>
        <button type="button" className="muse-button" title="Send backward ([)" onClick={() => layer("backward")}>Backward</button>
        <MuseChoiceMenu label="More layer moves" valueLabel="⋯" variant="chip" options={[{ id: "front", label: "Bring to front" }, { id: "back", label: "Send to back" }]} selectedIds={[]} onSelect={(id) => layer(id as LayerMove)} />
      </div>
      <button ref={anchors.link} type="button" className="muse-button" aria-expanded={panel === "link"} onClick={() => togglePanel("link")}><MuseIcon name="link" size={14} /> {selected.link ? "Linked" : "Link"}</button>
      <button type="button" className="muse-button" aria-pressed={!!selected.locked} onClick={() => change(selected.id, { locked: !selected.locked || undefined })}>{selected.locked ? "Unlock" : "Lock"}</button>
      <button type="button" className="muse-button" title="Duplicate (⌘D)" onClick={duplicate}>Duplicate</button>
      <button type="button" className="muse-button" aria-label="Delete" title="Delete" onClick={remove}><MuseIcon name="trash" size={15} /></button>
    </SelectionBar>}

    {(uploading || uploads.errors.length > 0) && <p className={uploads.errors.length ? "muse-aspiration-error" : "muse-bucket-notice"} role={uploads.errors.length ? "alert" : "status"}>
      {uploading ? `Adding photo ${Math.min(uploads.done + 1, uploads.total)} of ${uploads.total}…` : ""}
      {uploads.errors.map((m) => <span key={m} className="muse-vision-uploaderror">{m}</span>)}
      {!uploading && <button type="button" className="text-button" onClick={() => setUploads({ total: 0, done: 0, errors: [] })}>Dismiss</button>}
    </p>}

    <div ref={wrapRef} className="muse-vision-canvas" data-dropping={dropping || undefined} {...dropProps}
      role="application" aria-roledescription="collage canvas" aria-label={`${board.title}: ${board.elements.length} pieces. ${selected ? `Selected: ${elementLabel(selected)}.` : "Nothing selected."}`} aria-describedby="vision-canvas-help" tabIndex={0}>
      {size.width > 0 && view && <BoardEditorStage board={board} width={size.width} height={size.height} editing={{ selectedId, onSelect: setSelectedId, onChange: (id, patch) => change(id, patch), view, onView: moveView }} />}
      {!board.elements.length && <div className="muse-vision-canvas-empty" aria-hidden="true"><p>Add photos, words and stickers.<br />Drag, resize and turn them anywhere.</p></div>}
    </div>
    <p id="vision-canvas-help" className="sr-only">Use Layers to choose a piece. Arrow keys move it, Shift moves further. Delete removes it, Command Z undoes, square brackets change its layer.</p>
    <p className="sr-only" role="status" aria-live="polite">{announce}</p>
    <p className="small-label muse-vision-hint">Drag empty space to move around · pinch or ⌘-scroll to zoom · paste or drop images to add them.</p>

    <GlassPopover id="vision-stickers" label="Stickers" title="Stickers" open={panel === "stickers"} anchorRef={anchors.stickers} onClose={() => setPanel("")} width={340}>
      <div className="muse-vision-stickers">
        <p className="editor-label">Decorations</p>
        <div className="muse-vision-sticker-grid">{stickers.map((s) => <button key={s.id} type="button" className="muse-vision-sticker" aria-label={`Add ${s.label}`} title={s.label} onClick={() => addSticker(s.id)}>
          <svg viewBox={`0 0 ${s.box[0]} ${s.box[1]}`} aria-hidden="true"><path d={s.d} {...(s.mode === "fill" ? { fill: "currentColor" } : { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const })} /></svg></button>)}</div>
        <p className="editor-label">Muse Marks</p>
        <div className="muse-vision-sticker-grid">{markStickers.map((m) => <button key={m.id} type="button" className="muse-vision-sticker" aria-label={`Add ${m.label} mark`} title={m.label} onClick={() => addSticker(m.id)}><MuseIcon name={m.icon as never} size={22} /></button>)}</div>
      </div>
    </GlassPopover>
    <GlassPopover id="vision-background" label="Background" title="Background" open={panel === "background"} anchorRef={anchors.background} onClose={() => setPanel("")} width={340}>
      <BackgroundPicker value={board.background} onChange={background} />
    </GlassPopover>
    <GlassPopover id="vision-layers" label="Layers" title="Layers" open={panel === "layers"} anchorRef={anchors.layers} onClose={() => setPanel("")} width={300} align="end">
      {board.elements.length ? <ol className="muse-vision-layers" aria-label="Layers, top first">{[...board.elements].reverse().map((e) => <li key={e.id}>
        <button type="button" className="popover-choice" aria-pressed={e.id === selectedId} onClick={() => { setSelectedId(e.id); setPanel(""); }}>{elementLabel(e)}{e.locked ? " · locked" : ""}{e.link ? " · linked" : ""}</button></li>)}</ol>
        : <p className="small-label">Nothing on this board yet.</p>}
    </GlassPopover>
    {selected && (selected.kind === "sticker" || selected.kind === "text") && <GlassPopover id="vision-color" label="Color" title="Color" open={panel === "color"} anchorRef={anchors.color} onClose={() => setPanel("")} width={300}>
      <MuseColorPicker label="Color" value={selected.color} onChange={(c) => change(selected.id, { color: pinAccent(c) }, `color:${selected.id}`)} />
      {selected.kind === "text" && <><p className="editor-label">Label tape behind the words</p>
        <div className="muse-chip-row"><button type="button" className="muse-chip" aria-pressed={!selected.highlight} onClick={() => change(selected.id, { highlight: undefined, h: measureText({ ...selected, highlight: undefined }) } as Partial<TextElement>)}>None</button>
          {["#ffffff", "#fff3b0", "#ffd6e0", "#d7f9f1", "#16141c"].map((c) => <button key={c} type="button" className="muse-color-swatch" style={{ background: c }} aria-label={`Tape ${c}`} aria-pressed={selected.highlight === c} onClick={() => change(selected.id, { highlight: c as `#${string}`, h: measureText({ ...selected, highlight: c as `#${string}` }) } as Partial<TextElement>)} />)}</div></>}
    </GlassPopover>}
    {selected?.kind === "image" && <GlassPopover id="vision-border" label="Border" title={selected.crop.shape === "rect" && selected.image.alpha ? "Sticker outline" : "Border"} open={panel === "border"} anchorRef={anchors.border} onClose={() => setPanel("")} width={300}>
      <BorderControls e={selected} onChange={(p) => change(selected.id, p, `border:${selected.id}`)} />
    </GlassPopover>}
    {selected && <GlassPopover id="vision-link" label="Link" title="Link to Muse" open={panel === "link"} anchorRef={anchors.link} onClose={() => setPanel("")} width={320}>
      <div className="muse-vision-link">
        {selected.link ? (() => { const st = linkStatus(selected.link, live(selected.link)); return <>
          <p><span className="muse-intentions-ref" data-missing={st.missing || undefined}>{st.missing ? st.label : <Link href={selected.link.kind === "aspiration" ? `/envision?open=${selected.link.id}` : "/envision?view=bucket"}>{st.label}</Link>}{st.note && <small> {st.note}</small>}</span></p>
          <button type="button" className="text-button" onClick={() => change(selected.id, { link: undefined })}>Remove link</button></>; })()
          : <p className="small-label">Point this piece at an Aspiration or a Bucket List dream. It’s only a reference: nothing is created or changed there.</p>}
        {linkOptions.length ? <MuseChoiceMenu label="Link to" valueLabel={selected.link ? "Link something else…" : "Choose…"} searchable options={linkOptions} selectedIds={selected.link ? [`${selected.link.kind}:${selected.link.id}`] : []}
          onSelect={(id) => { const [kind, rid] = id.split(/:(.+)/); const o = linkOptions.find((x) => x.id === id); if (o) change(selected.id, { link: { kind: kind as ElementLink["kind"], id: rid, label: o.label.replace(/^\S+ /, "") } }); }} />
          : <p className="small-label">No aspirations or dreams yet. <Link href="/envision">Add one in Envision</Link>.</p>}
      </div>
    </GlassPopover>}

    {sheet === "crop" && selected?.kind === "image" && <CropSheet element={selected} onClose={() => setSheet("")} onApply={(e) => { change(e.id, { w: e.w, h: e.h, crop: e.crop }); setSheet(""); }} />}
    {sheet === "details" && <BoardDetails initial={{ ...board, revision: Math.max(1, rev.current) }} today={today} busy={save.saving} error="" onClose={() => setSheet("")}
      onSave={(b) => { const next = { ...boardRef.current, title: b.title, description: b.description, theme: b.theme, period: b.period, periodStart: b.periodStart }; boardRef.current = next; setBoard(next); seq.current++; setSave((s) => ({ ...s, dirty: true })); setSheet(""); }} />}
  </section>;
}

function SelectionBar({ children }: { children: ReactNode }) {
  return <div className="muse-vision-toolbar muse-vision-selection muse-scroll-fade" role="toolbar" aria-label="Selected piece">{children}</div>;
}
function TextControls({ e, onChange, colorAnchor, onColor, colorOpen }: { e: TextElement; onChange: (p: Partial<TextElement>, key?: string) => void; colorAnchor: RefObject<HTMLButtonElement | null>; onColor: () => void; colorOpen: boolean }) {
  return <>
    <textarea id="vision-text-input" className="muse-vision-textinput" aria-label="Words" rows={1} maxLength={1000} value={e.text} onChange={(ev) => onChange({ text: ev.target.value }, `text:${e.id}`)} />
    <MuseChoiceMenu label="Font" valueLabel={fonts.find((f) => f.id === e.font)!.label} options={fonts.map((f) => ({ id: f.id, label: f.label }))} selectedIds={[e.font]} onSelect={(id) => onChange({ font: id as TextElement["font"] })} />
    <label className="muse-vision-size"><span className="sr-only">Size</span><input type="number" min={8} max={400} value={Math.round(e.size)} onChange={(ev) => { const v = Number(ev.target.value); if (v >= 8 && v <= 400) onChange({ size: v }, `size:${e.id}`); }} /></label>
    <button type="button" className="muse-button" aria-pressed={!!e.bold} aria-label="Bold" onClick={() => onChange({ bold: !e.bold || undefined })}><strong>B</strong></button>
    <button type="button" className="muse-button" aria-pressed={!!e.italic} aria-label="Italic" onClick={() => onChange({ italic: !e.italic || undefined })}><em>I</em></button>
    <MuseChoiceMenu label="Align" valueLabel={e.align === "left" ? "Left" : e.align === "right" ? "Right" : "Center"} options={[{ id: "left", label: "Left" }, { id: "center", label: "Center" }, { id: "right", label: "Right" }]} selectedIds={[e.align]} onSelect={(id) => onChange({ align: id as TextElement["align"] })} />
    <button ref={colorAnchor} type="button" className="muse-button" aria-expanded={colorOpen} onClick={onColor}><span className="muse-vision-dot" style={{ background: e.color }} aria-hidden="true" /> Color</button>
  </>;
}
function BorderControls({ e, onChange }: { e: ImageElement; onChange: (p: Partial<ImageElement>) => void }) {
  const outline = e.crop.shape === "rect" && !!e.image.alpha, value = outline ? e.outline : e.border, field = outline ? "outline" : "border";
  const set = (v: { color: `#${string}`; width: number } | undefined) => onChange({ [field]: v } as Partial<ImageElement>);
  return <div className="muse-vision-border">
    <div className="muse-chip-row"><button type="button" className="muse-chip" aria-pressed={!value} onClick={() => set(undefined)}>None</button>
      {["#ffffff", "#fff8e7", "#16141c", "#f7b2e6", "#ffd166"].map((c) => <button key={c} type="button" className="muse-color-swatch" style={{ background: c }} aria-label={`${outline ? "Outline" : "Border"} ${c}`} aria-pressed={value?.color === c} onClick={() => set({ color: c as `#${string}`, width: value?.width ?? (outline ? 10 : 12) })} />)}</div>
    {value && <>
      <MuseColorPicker label="Any color" value={value.color} onChange={(c) => set({ ...value, color: pinAccent(c) })} />
      <label className="muse-vision-range">Thickness<input type="range" min={outline ? 2 : 1} max={outline ? 40 : 60} value={value.width} onChange={(ev) => set({ ...value, width: Number(ev.target.value) })} /></label>
    </>}
    {outline && <p className="small-label">Follows the edge of the cutout, like a die-cut sticker.</p>}
  </div>;
}
/** Any color or gradient. Theme colors are pinned to their current values so the board never changes with the app theme. */
function BackgroundPicker({ value, onChange }: { value: Background; onChange: (b: Background) => void }) {
  return <div className="muse-vision-bg">
    <MusePaintPicker label="Board background" value={value.kind === "solid" ? { kind: "solid", color: value.color } : { kind: "gradient", gradient: value.gradient }}
      onChange={(p) => { if (!p) return; if (p.kind === "solid") onChange({ kind: "solid", color: pinAccent(p.color) }); else onChange({ kind: "gradient", gradient: { ...p.gradient, colors: p.gradient.colors.map((c) => c && pinAccent(c)) as CustomGradient["colors"] } }); }} />
    <p className="small-label">The board keeps its own colors in every Muse theme.</p>
  </div>;
}
