"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { canvasOf, coverPresets, MAX_PAGES, type BookCover, type BookPage, type TextElement, type TextRole, type VisionBoard } from "@/lib/vision-boards/model";
import { coverBoard, coverPalettes, coverPresetInfo } from "@/lib/vision-boards/covers";
import { pageBoard } from "@/lib/vision-boards/book";
import type { Asset, PatternPaint } from "@/lib/vision-boards/paint";
import { MuseIcon } from "../../MuseIcon";
import { MuseCloseButton } from "../../MuseIconButton";
import { BoardPreview } from "./BoardCanvas";
import { FontPicker } from "./FontPicker";
import { PatternPicker } from "./PaintEditor";
import { Section, Toggle } from "./Inspector";

// ---------- Writing presets ----------
/** Heading, subheading, section title and paragraph: beautiful defaults, still ordinary text with every control. */
export const textPresets: { role: TextRole | "plain"; label: string; hint: string; make: (boardW: number) => Partial<TextElement> }[] = [
  { role: "h1", label: "Heading", hint: "H1", make: (W) => ({ text: "A beautiful heading", family: "Playfair Display", weight: 700, size: 112, lineHeight: 1.05, align: "center", w: Math.round(Math.min(1500, W * 0.7)), role: "h1", italic: undefined }) },
  { role: "h2", label: "Subheading", hint: "H2", make: (W) => ({ text: "A softer subheading", family: "Playfair Display", weight: 400, italic: true, size: 72, lineHeight: 1.1, align: "center", w: Math.round(Math.min(1300, W * 0.6)), role: "h2" }) },
  { role: "h3", label: "Section title", hint: "H3", make: (W) => ({ text: "SECTION TITLE", family: "Montserrat", weight: 600, size: 34, letterSpacing: 0.22, lineHeight: 1.2, align: "center", w: Math.round(Math.min(1000, W * 0.45)), role: "h3", italic: undefined }) },
  { role: "p", label: "Paragraph", hint: "¶", make: (W) => ({ text: "Write about it here. Paragraphs wrap inside their box, so you can write as much as you like.\n\nDrag a side handle to make the column wider or narrower; the words reflow and the type size stays the same.", family: "Lora", weight: 400, size: 32, lineHeight: 1.6, align: "left", w: Math.round(Math.min(900, W * 0.5)), role: "p", italic: undefined }) },
  { role: "plain", label: "Words", hint: "Aa", make: (W) => ({ text: "Dream big", font: "editorial", size: 84, align: "center", italic: true, w: Math.round(Math.min(640, W * 0.4)) }) },
];

// ---------- Pages menu ----------
type PageActions = { go: (i: number) => void; add: (after: number) => void; duplicate: (i: number) => void; remove: (i: number) => void; move: (from: number, to: number) => void; rename: (i: number, title: string) => void };
/**
 * The compact Pages popover: the cover and every page in order (number, thumbnail, editable title), with move up and
 * down, drag to reorder, duplicate and delete. Picking a page opens it and closes the menu.
 */
export function PagesMenu({ board, page, actions, onPicked }: { board: VisionBoard; page: number; actions: PageActions; onPicked: () => void }) {
  const pages = board.pages ?? [], full = pages.length >= MAX_PAGES, [confirm, setConfirm] = useState<number | null>(null), [drag, setDrag] = useState<number | null>(null), [over, setOver] = useState<number | null>(null);
  const cover = useMemo(() => coverBoard(board.cover ?? { preset: "classic", title: board.title, palette: 0 }, canvasOf(board)), [board]);
  const go = (i: number) => { actions.go(i); onPicked(); };
  return <div className="muse-pages">
    <p className="muse-pages-count" aria-live="polite"><strong>{pages.length}</strong> / {MAX_PAGES} pages</p>
    <ol className="muse-pages-list">
      <li className="muse-pages-row" data-active={page === -1 || undefined}>
        <button type="button" className="muse-pages-go" aria-current={page === -1 ? "page" : undefined} onClick={() => go(-1)}>
          <span className="muse-pages-num">◆</span><Thumb board={{ ...board, ...cover }} /><span className="muse-pages-title">Cover</span></button>
      </li>
      {pages.map((p, i) => <li key={p.id} className="muse-pages-row" data-active={page === i || undefined} data-over={over === i || undefined}
        draggable onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => { setDrag(null); setOver(null); }}
        onDragOver={(e) => { if (drag === null) return; e.preventDefault(); setOver(i); }} onDrop={(e) => { e.preventDefault(); if (drag !== null && drag !== i) actions.move(drag, i); setDrag(null); setOver(null); }}>
        <button type="button" className="muse-pages-go" aria-current={page === i ? "page" : undefined} aria-label={`Open page ${i + 1}, ${p.title}`} onClick={() => go(i)}>
          <span className="muse-pages-num">{i + 1}</span><Thumb board={pageBoard(board, p)} /></button>
        <input className="muse-pages-name" value={p.title} maxLength={80} aria-label={`Page ${i + 1} title`} onChange={(e) => actions.rename(i, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
        <span className="muse-pages-tools">
          <button type="button" aria-label={`Move ${p.title} up`} title="Move up" disabled={i === 0} onClick={() => actions.move(i, i - 1)}>↑</button>
          <button type="button" aria-label={`Move ${p.title} down`} title="Move down" disabled={i === pages.length - 1} onClick={() => actions.move(i, i + 1)}>↓</button>
          <button type="button" aria-label={`Duplicate ${p.title}`} title={full ? `A book holds up to ${MAX_PAGES} pages` : "Duplicate"} disabled={full} onClick={() => actions.duplicate(i)}>⧉</button>
          <button type="button" aria-label={`Delete ${p.title}`} title={pages.length <= 1 ? "A book keeps at least one page" : "Delete"} disabled={pages.length <= 1} onClick={() => setConfirm(i)}><MuseIcon name="trash" size={13} /></button>
        </span>
        {confirm === i && <span className="muse-pages-confirm" role="alert">Delete “{p.title}” and everything on it? <button type="button" className="text-button" onClick={() => { actions.remove(i); setConfirm(null); }}>Delete</button> <button type="button" className="text-button" onClick={() => setConfirm(null)}>Keep</button></span>}
      </li>)}
    </ol>
    <button type="button" className="muse-button muse-pages-add" disabled={full} onClick={() => actions.add(Math.max(0, page))}><MuseIcon name="plus" size={13} /> Add page</button>
    {full && <p className="small-label">A book holds up to {MAX_PAGES} pages, so each one gets room to shine. Duplicate or delete to make space.</p>}
  </div>;
}
function Thumb({ board }: { board: Parameters<typeof BoardPreview>[0]["board"] }) {
  const c = canvasOf(board), w = c.w >= c.h ? 46 : Math.round((46 * c.w) / c.h);
  return <span className="muse-pages-thumb" style={{ width: 46, height: Math.round((w * c.h) / c.w) }}><BoardPreview board={board} width={w} /></span>;
}

// ---------- Cover controls ----------
export function CoverInspector({ board, cover, setCover, uploads, requestUpload, onClose }: {
  board: VisionBoard; cover: BookCover; setCover: (p: Partial<BookCover>, key?: string) => void; uploads: Asset[]; requestUpload: (then: (a: Asset) => void) => void; onClose?: () => void;
}) {
  const page = canvasOf(board), [fontOpen, setFontOpen] = useState(false);
  return <aside id="vision-inspector" className="muse-vision-inspector" aria-label="Cover settings">
    {onClose && <div className="muse-vision-inspector-close"><MuseCloseButton label="Hide the panel" onClose={onClose} /></div>}
    <header className="muse-vision-inspector-head"><p className="editor-label">The cover</p><p className="small-label">Choose a cover and make it yours. Your pages are a tap away in Pages.</p></header>
    <Section title="Cover style">
      <ul className="muse-cover-presets" aria-label="Cover styles">
        {coverPresets.map((p) => { const c = { ...cover, preset: p, palette: p === cover.preset ? cover.palette : 0 }, art = coverBoard(c, page); return <li key={p}>
          <button type="button" aria-pressed={cover.preset === p} onClick={() => setCover({ preset: p, palette: p === cover.preset ? cover.palette : 0, pattern: undefined })}>
            <span className="muse-cover-mini"><BoardPreview board={{ size: board.size, canvas: board.canvas, ...art }} width={page.w >= page.h ? 92 : Math.round((92 * page.w) / page.h)} /></span>
            <span className="muse-cover-name">{coverPresetInfo[p].label}</span></button></li>; })}
      </ul>
      <p className="small-label">{coverPresetInfo[cover.preset].blurb}.</p>
      <div className="muse-chip-row" role="group" aria-label="Palette">{coverPalettes[cover.preset].map((p, i) => <button key={p.name} type="button" className="muse-chip" aria-pressed={cover.palette === i} onClick={() => setCover({ palette: i })}>{p.name}</button>)}</div>
    </Section>
    <Section title="Words">
      <label className="muse-vision-field muse-vision-wide">Title<input value={cover.title} maxLength={120} onChange={(e) => setCover({ title: e.target.value }, "cover-title")} /></label>
      <label className="muse-vision-field muse-vision-wide">Subtitle<input value={cover.subtitle ?? ""} maxLength={120} placeholder="Optional" onChange={(e) => setCover({ subtitle: e.target.value || undefined }, "cover-subtitle")} /></label>
      <label className="muse-vision-field muse-vision-wide">Date or caption<input value={cover.caption ?? ""} maxLength={60} placeholder="Optional, e.g. Spring 2027" onChange={(e) => setCover({ caption: e.target.value || undefined }, "cover-caption")} /></label>
      <button type="button" className="muse-button muse-vision-font-current" aria-expanded={fontOpen} onClick={() => setFontOpen(!fontOpen)}><span>Title font: {cover.family ?? coverPresetInfo[cover.preset].family}</span><MuseIcon name="chevron" size={14} /></button>
      {fontOpen && <><button type="button" className="text-button" onClick={() => setCover({ family: undefined })}>Use the cover’s own font</button><FontPicker value={cover.family} onPick={(family) => setCover({ family })} /></>}
    </Section>
    <Section title="Image" open={!!cover.image}>
      <p className="small-label">{cover.preset === "editorial" ? "Fills the whole cover, magazine style." : "Set into the cover’s design."}</p>
      <div className="muse-vision-actions">
        <button type="button" className="muse-button" onClick={() => requestUpload((image) => setCover({ image }))}><MuseIcon name="plus" size={13} /> {cover.image ? "Replace image" : "Add an image"}</button>
        {cover.image && <button type="button" className="muse-button" onClick={() => setCover({ image: undefined })}>Remove</button>}
      </div>
      {uploads.length > 0 && <ul className="muse-pattern-grid" aria-label="Use one of this book’s images">{uploads.slice(0, 12).map((a) => <li key={a.path}><button type="button" className="muse-pattern-tile" aria-pressed={cover.image?.path === a.path} aria-label={a.name ?? "Your image"} onClick={() => setCover({ image: a })}><UploadThumb asset={a} /></button></li>)}</ul>}
    </Section>
    <Section title="Pattern" open={false}>
      <Toggle label="Use the cover’s own pattern" on={!cover.pattern} onChange={(on) => setCover({ pattern: on ? undefined : { kind: "pattern", pattern: { source: "builtin", id: "pattern/celestial-cosmic/golden-sparkles" }, scale: 1.5, rotation: 0, x: 0, y: 0 } })} />
      {cover.pattern && <PatternPicker selected={cover.pattern} uploads={uploads} onUpload={() => requestUpload((asset) => setCover({ pattern: { ...(cover.pattern as PatternPaint), pattern: { source: "asset", asset } } }))} onPick={(pattern) => setCover({ pattern: { ...(cover.pattern as PatternPaint), pattern } })} />}
    </Section>
    <p className="small-label muse-cover-note">The cover is designed for you; your pages hold everything else.</p>
  </aside>;
}
function UploadThumb({ asset }: { asset: Asset }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => { let live = true; import("./images").then(({ loadBoardImage }) => loadBoardImage(asset.thumbnailPath)).then((img) => { if (live) setSrc(img.src); }).catch(() => undefined); return () => { live = false; }; }, [asset.thumbnailPath]);
  // eslint-disable-next-line @next/next/no-img-element -- a signed private URL
  return src ? <img src={src} alt="" /> : <span className="muse-pattern-loading" aria-hidden="true" />;
}

// ---------- The reader ----------
/** A fixed little starfield for the reading room (deterministic, so it never jumps between renders). */
const STARS: [number, number, number, number][] = Array.from({ length: 46 }, (_, i) => { const r = (n: number) => ((Math.sin(i * 127.1 + n * 311.7) * 43758.5453) % 1 + 1) % 1; return [r(1) * 100, r(2) * 100, 1 + r(3) * 2.4, r(4) * 6]; });
/**
 * Reading a finished Book: the cover first, then two-page spreads on wide screens (single pages on narrow ones), with
 * a gentle page-turn (none with reduced motion), Contents to jump anywhere, and arrow keys. Nothing here edits.
 */
export function BookReader({ board, startAt = -1, onClose }: { board: VisionBoard; startAt?: number; onClose: () => void }) {
  const pages = useMemo(() => board.pages ?? [], [board.pages]), page = canvasOf(board), cover = useMemo(() => coverBoard(board.cover ?? { preset: "classic", title: board.title, palette: 0 }, page), [board, page]);
  const [vw, setVw] = useState(() => (typeof window === "undefined" ? 1200 : window.innerWidth)), [vh, setVh] = useState(() => (typeof window === "undefined" ? 800 : window.innerHeight));
  useEffect(() => { const on = () => { setVw(window.innerWidth); setVh(window.innerHeight); }; window.addEventListener("resize", on); return () => window.removeEventListener("resize", on); }, []);
  const wide = vw >= 860 && vw / Math.max(1, vh - 140) > (page.w / page.h) * 1.35;
  /** Sheets in reading order: the cover alone, then pages (paired on wide screens). -1 is the cover. */
  const sheets: number[][] = useMemo(() => wide ? [[-1], ...Array.from({ length: Math.ceil(pages.length / 2) }, (_, i) => pages.slice(i * 2, i * 2 + 2).map((_, k) => i * 2 + k))] : [[-1], ...pages.map((_, i) => [i])], [wide, pages]);
  const sheetOf = (p: number) => Math.max(0, sheets.findIndex((s) => s.includes(p)));
  const [at, setAt] = useState(() => sheetOf(startAt)), [dir, setDir] = useState<1 | -1>(1), [contents, setContents] = useState(false);
  const close = useRef<HTMLButtonElement>(null), swipe = useRef<number | null>(null);
  const turn = (d: 1 | -1) => setAt((x) => { const n = Math.max(0, Math.min(sheets.length - 1, x + d)); if (n !== x) setDir(d); return n; });
  const jump = (p: number) => { const n = sheetOf(p); setDir(n >= at ? 1 : -1); setAt(n); setContents(false); };
  useEffect(() => { close.current?.focus(); const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); if (contents) setContents(false); else onClose(); } else if (e.key === "ArrowRight") turn(1); else if (e.key === "ArrowLeft") turn(-1); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); });
  const sheet = sheets[Math.min(at, sheets.length - 1)] ?? [-1], two = sheet.length === 2 || (wide && sheet[0] !== -1);
  const maxW = (vw - (wide ? 140 : 116)) / (wide ? 2 : 1), maxH = vh - 150, scale = Math.min(maxW / page.w, maxH / page.h), pw = Math.floor(page.w * scale);
  const draw = (p: number) => p < 0 ? { size: board.size, canvas: board.canvas, ...cover } : pageBoard(board, pages[p]);
  const label = (p: number) => (p < 0 ? "Cover" : pages[p]?.title ?? `Page ${p + 1}`);
  return createPortal(<div className="muse-reader" role="dialog" aria-modal="true" aria-label={`Reading ${board.title}`}>
    <div className="muse-reader-sky" aria-hidden="true">{STARS.map(([x, y, r, d], i) => <i key={i} style={{ left: `${x}%`, top: `${y}%`, width: r, height: r, animationDelay: `${d}s` }} />)}</div>
    <header className="muse-reader-head">
      <button ref={close} type="button" className="muse-button" onClick={onClose}><span aria-hidden="true">‹</span> Back to editing</button>
      <h2>{board.title}</h2>
      <span className="muse-reader-where" aria-live="polite">{sheet.map(label).join(" · ")}</span>
      <div className="muse-reader-contents">
        <button type="button" className="muse-button" aria-expanded={contents} onClick={() => setContents(!contents)}><MuseIcon name="bookmark" size={14} /> Contents</button>
        {contents && <ol className="muse-reader-index">
          <li><button type="button" aria-current={sheet.includes(-1) ? "page" : undefined} onClick={() => jump(-1)}><span>—</span>Cover</button></li>
          {pages.map((p, i) => <li key={p.id}><button type="button" aria-current={sheet.includes(i) ? "page" : undefined} onClick={() => jump(i)}><span>{i + 1}</span>{p.title}</button></li>)}
        </ol>}
      </div>
    </header>
    <div className="muse-reader-stage" onTouchStart={(e) => { swipe.current = e.touches[0]?.clientX ?? null; }}
      onTouchEnd={(e) => { const x0 = swipe.current, x1 = e.changedTouches[0]?.clientX; swipe.current = null; if (x0 !== null && x1 !== undefined && Math.abs(x1 - x0) > 40) turn(x1 < x0 ? 1 : -1); }}>
      <button type="button" className="muse-reader-turn" aria-label="Previous page" disabled={at === 0} onClick={() => turn(-1)}>‹</button>
      <div key={at} className="muse-reader-spread" data-dir={dir > 0 ? "next" : "prev"} data-two={two || undefined} style={{ "--page-w": `${pw}px` } as CSSProperties}>
        {wide && sheet[0] === -1 && <div className="muse-reader-page muse-reader-blank" aria-hidden="true" style={{ width: pw, height: Math.floor(page.h * scale) }} />}
        {sheet.map((p, k) => <figure key={p} className="muse-reader-page" data-side={wide ? (sheet[0] === -1 ? "right" : k === 0 ? "left" : "right") : undefined} data-cover={p < 0 || undefined}>
          <BoardPreview board={draw(p)} width={pw} quality="auto" /><figcaption className="sr-only">{label(p)}</figcaption>
          {p >= 0 && <span className="muse-reader-folio" aria-hidden="true">{(wide ? (k === 0 && sheet.length === 2) : false) ? <em>{board.title}</em> : <em>{pages[p]?.title}</em>}<b>{p + 1}</b></span>}</figure>)}
      </div>
      <button type="button" className="muse-reader-turn" aria-label="Next page" disabled={at >= sheets.length - 1} onClick={() => turn(1)}>›</button>
    </div>
    <p className="muse-reader-foot small-label">{at + 1} of {sheets.length} · {wide ? "arrow keys turn pages" : "swipe to turn pages"}</p>
  </div>, document.body);
}
export type { BookPage };
