"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { MuseModal } from "../../MuseModal";
import { MuseChoiceMenu } from "../../MuseChoiceMenu";
import { MuseSegmented } from "../../design/MuseSegmented";
import { customGradientCss } from "@/lib/appearance-values";
import { paintCss } from "./paintCss";
import { backgroundPresets, boardFieldsValid, boardPeriods, boardSizes, canvasOf, coverPresets, LIMITS, periodLabel, periodStartFor, type Background, type BoardPeriod, type BoardSize, type CoverPreset, type VisionBoard } from "@/lib/vision-boards/model";
import { coverBoard, coverPresetInfo } from "@/lib/vision-boards/covers";
import { newPage } from "@/lib/vision-boards/book";
import { LazyPreview } from "./BoardThumb";

const months = Array.from({ length: 12 }, (_, i) => ({ id: String(i + 1).padStart(2, "0"), label: new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, i, 15))) }));
export const backgroundCss = (b: Background) => b.kind === "solid" ? b.color : b.kind === "gradient" ? customGradientCss(b.gradient) : paintCss(b.paint);

/** Create a board, or change its name, description, theme and period. Size and starting background are chosen once. */
export function BoardDetails({ initial, today, busy, error, onSave, onClose }: { initial: VisionBoard; today: string; busy: boolean; error: string; onSave: (b: VisionBoard) => void; onClose: () => void }) {
  const [b, setB] = useState(initial);
  const formRef = useRef<HTMLFormElement>(null);
  // iOS keyboards resize/pan the visual viewport without necessarily changing dvh.
  // Scope these measurements to this dialog; no page or other modal geometry is changed.
  useLayoutEffect(() => {
    const viewport = window.visualViewport, dialog = formRef.current?.closest('dialog');
    if (!viewport || !dialog) return;
    const sync = () => {
      dialog.style.setProperty('--vision-visible-height', `${viewport.height}px`);
      dialog.style.setProperty('--vision-viewport-top', `${viewport.offsetTop}px`);
    };
    sync(); viewport.addEventListener('resize', sync); viewport.addEventListener('scroll', sync);
    return () => { viewport.removeEventListener('resize', sync); viewport.removeEventListener('scroll', sync); dialog.style.removeProperty('--vision-visible-height'); dialog.style.removeProperty('--vision-viewport-top'); };
  }, []);
  const isNew = initial.revision === 0;
  // New Visions: a Vision Board (one canvas) or a Book (a cover and pages). The choice can be changed later.
  const [format, setFormat] = useState<"board" | "book">(initial.format === "book" ? "book" : "board"), [preset, setPreset] = useState<CoverPreset>("classic");
  const submit = () => {
    const base = { ...b, title: b.title.trim() };
    if (!isNew || format === "board") return onSave(base);
    onSave({ ...base, format: "book", pages: [newPage(crypto.randomUUID(), 1, base.background)], cover: { preset, title: base.title, palette: 0 } });
  };
  const set = (patch: Partial<VisionBoard>) => setB((x) => ({ ...x, ...patch }));
  const anchor = b.periodStart ?? today ?? new Date().toISOString().slice(0, 10);
  const year = Number(anchor.slice(0, 4)), thisYear = Number((today || anchor).slice(0, 4));
  const years = Array.from({ length: 13 }, (_, i) => thisYear - 2 + i).concat(year < thisYear - 2 || year > thisYear + 10 ? [year] : []).sort().map((y) => ({ id: String(y), label: String(y) }));
  const setPeriod = (p: BoardPeriod | "none") => p === "none" ? set({ period: null, periodStart: null }) : set({ period: p, periodStart: periodStartFor(p, anchor) });
  const setStart = (y: string, m: string) => b.period && set({ periodStart: periodStartFor(b.period, `${y}-${m}-01`) });
  const problem = boardFieldsValid(b);
  const thing = format === "book" ? "book" : "board";
  return <MuseModal id="vision-board-details" label={isNew ? "New Vision" : `${thing === "book" ? "Book" : "Board"} details`} title={isNew ? "A new Vision" : `${thing === "book" ? "Book" : "Board"} details`} returnFocus={null} onClose={onClose} size="tall">
    <form ref={formRef} className="muse-aspiration-form muse-vision-details" onSubmit={(e) => { e.preventDefault(); if (!problem) submit(); }}>
      <div className="muse-vision-details-body">
      {isNew && <div className="muse-vision-formats" role="radiogroup" aria-label="What would you like to make?">
        <button type="button" role="radio" aria-checked={format === "board"} className="muse-vision-format-card" onClick={() => setFormat("board")}>
          <span className="muse-vision-format-art" data-art="board" aria-hidden="true"><i /><i /><i /><i /></span>
          <strong>Vision Board</strong><span>One expansive canvas for ideas, inspiration and everything you imagine.</span></button>
        <button type="button" role="radio" aria-checked={format === "book"} className="muse-vision-format-card" onClick={() => setFormat("book")}>
          <span className="muse-vision-format-art" data-art="book" aria-hidden="true"><i /><i /></span>
          <strong>Book</strong><span>A collection of beautiful pages for stories, plans, memories and creative exploration.</span></button>
      </div>}
      <label>Name<input required maxLength={LIMITS.title} value={b.title} placeholder={format === "book" ? "Paris in the Spring" : "My 2027 Vision"} autoFocus onChange={(e) => set({ title: e.target.value })} /></label>
      <label><span>Theme or chapter <small className="small-label">· optional</small></span><input maxLength={LIMITS.theme} value={b.theme} placeholder="Becoming Her" onChange={(e) => set({ theme: e.target.value })} /></label>
      <label><span>Description <small className="small-label">· optional</small></span><textarea rows={2} maxLength={LIMITS.description} value={b.description} placeholder={`What this ${thing} is about…`} onChange={(e) => set({ description: e.target.value })} /></label>
      <fieldset><legend>For a period <small className="small-label">· optional</small></legend>
        <MuseSegmented label="Period" value={b.period ?? "none"} options={[{ id: "none", label: "No period" }, ...boardPeriods]} onChange={setPeriod} />
        {b.period && b.periodStart && <div className="muse-aspiration-row muse-vision-period">
          {b.period === "month" && <MuseChoiceMenu label="Month" valueLabel={months[Number(b.periodStart.slice(5, 7)) - 1].label} options={months} selectedIds={[b.periodStart.slice(5, 7)]} onSelect={(m) => setStart(b.periodStart!.slice(0, 4), m)} />}
          {b.period === "quarter" && <MuseChoiceMenu label="Quarter" valueLabel={`Q${Math.floor((Number(b.periodStart.slice(5, 7)) - 1) / 3) + 1}`} options={["01", "04", "07", "10"].map((m, i) => ({ id: m, label: `Q${i + 1}` }))} selectedIds={[b.periodStart.slice(5, 7)]} onSelect={(m) => setStart(b.periodStart!.slice(0, 4), m)} />}
          <MuseChoiceMenu label="Year" valueLabel={b.periodStart.slice(0, 4)} options={years} selectedIds={[b.periodStart.slice(0, 4)]} onSelect={(y) => setStart(y, b.periodStart!.slice(5, 7))} />
          <span className="small-label">{periodLabel(b.period, b.periodStart)}</span>
        </div>}
      </fieldset>
      {isNew && <>
        {format === "book" && <fieldset><legend>Cover</legend>
          <ul className="muse-cover-presets muse-cover-presets-new" aria-label="Cover styles">{coverPresets.map((p) => <li key={p}><button type="button" aria-pressed={preset === p} onClick={() => setPreset(p)}>
            <span className="muse-cover-mini"><LazyPreview board={{ size: b.size, canvas: b.canvas, ...coverBoard({ preset: p, title: b.title.trim() || "Your Title", palette: 0 }, canvasOf(b)) }} /></span>
            <span className="muse-cover-name">{coverPresetInfo[p].label}</span></button></li>)}</ul>
          <p className="small-label">{coverPresetInfo[preset].blurb}. Change the cover, its colors, words and image any time.</p>
        </fieldset>}
        <fieldset><legend>{format === "book" ? "Page shape" : "Shape"}</legend>
          <MuseSegmented label={format === "book" ? "Page shape" : "Board shape"} value={b.size === "custom" ? "landscape" : b.size} options={(Object.keys(boardSizes) as Exclude<BoardSize, "custom">[]).map((s) => ({ id: s, label: boardSizes[s].label }))} onChange={(size) => set({ size, canvas: undefined })} />
          <p className="small-label">{format === "book" ? "Every page in a book shares this shape, like a real book. Pages can be larger than your screen; zoom and pan around them." : "Portrait suits a phone wallpaper. The shape stays the same on every screen, and you can add space on any side later."}</p>
        </fieldset>
        <fieldset><legend>{format === "book" ? "First page background" : "Background"}</legend>
          <div className="muse-vision-swatches" role="group" aria-label="Starting background">{backgroundPresets.map((p) => <button key={p.id} type="button" className="muse-vision-swatch" style={{ background: backgroundCss(p.background) }} aria-pressed={JSON.stringify(b.background) === JSON.stringify(p.background)} aria-label={p.label} title={p.label} onClick={() => set({ background: p.background })} />)}</div>
          <p className="small-label">You can change it any time, with any color or gradient.</p>
        </fieldset>
      </>}
      {(problem && b.title) || error ? <p role="alert" className="muse-aspiration-error">{error || problem}</p> : null}
      </div>
      <div className="muse-aspiration-actions"><button type="submit" className="muse-button button-primary" disabled={busy || !!problem}>{isNew ? `Create ${thing}` : "Save"}</button><button type="button" className="text-button" onClick={onClose}>Cancel</button></div>
    </form>
  </MuseModal>;
}
