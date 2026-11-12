"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { MuseModal } from "../../MuseModal";
import { MuseChoiceMenu } from "../../MuseChoiceMenu";
import { MuseSegmented } from "../../design/MuseSegmented";
import { customGradientCss } from "@/lib/appearance-values";
import { backgroundPresets, boardFieldsValid, boardPeriods, boardSizes, LIMITS, periodLabel, periodStartFor, type Background, type BoardPeriod, type BoardSize, type VisionBoard } from "@/lib/vision-boards/model";

const months = Array.from({ length: 12 }, (_, i) => ({ id: String(i + 1).padStart(2, "0"), label: new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, i, 15))) }));
export const backgroundCss = (b: Background) => b.kind === "solid" ? b.color : customGradientCss(b.gradient);

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
  const set = (patch: Partial<VisionBoard>) => setB((x) => ({ ...x, ...patch }));
  const anchor = b.periodStart ?? today ?? new Date().toISOString().slice(0, 10);
  const year = Number(anchor.slice(0, 4)), thisYear = Number((today || anchor).slice(0, 4));
  const years = Array.from({ length: 13 }, (_, i) => thisYear - 2 + i).concat(year < thisYear - 2 || year > thisYear + 10 ? [year] : []).sort().map((y) => ({ id: String(y), label: String(y) }));
  const setPeriod = (p: BoardPeriod | "none") => p === "none" ? set({ period: null, periodStart: null }) : set({ period: p, periodStart: periodStartFor(p, anchor) });
  const setStart = (y: string, m: string) => b.period && set({ periodStart: periodStartFor(b.period, `${y}-${m}-01`) });
  const problem = boardFieldsValid(b);
  return <MuseModal id="vision-board-details" label={isNew ? "New vision board" : "Board details"} title={isNew ? "A new vision board" : "Board details"} returnFocus={null} onClose={onClose} size="tall">
    <form ref={formRef} className="muse-aspiration-form muse-vision-details" onSubmit={(e) => { e.preventDefault(); if (!problem) onSave({ ...b, title: b.title.trim() }); }}>
      <div className="muse-vision-details-body">
      <label>Name<input required maxLength={LIMITS.title} value={b.title} placeholder="My 2027 Vision" autoFocus onChange={(e) => set({ title: e.target.value })} /></label>
      <label><span>Theme or chapter <small className="small-label">· optional</small></span><input maxLength={LIMITS.theme} value={b.theme} placeholder="Becoming Her" onChange={(e) => set({ theme: e.target.value })} /></label>
      <label><span>Description <small className="small-label">· optional</small></span><textarea rows={2} maxLength={LIMITS.description} value={b.description} placeholder="What this board is about…" onChange={(e) => set({ description: e.target.value })} /></label>
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
        <fieldset><legend>Shape</legend>
          <MuseSegmented label="Board shape" value={b.size} options={(Object.keys(boardSizes) as BoardSize[]).map((s) => ({ id: s, label: boardSizes[s].label }))} onChange={(size) => set({ size })} />
          <p className="small-label">Portrait suits a phone wallpaper. The shape stays the same on every screen.</p>
        </fieldset>
        <fieldset><legend>Background</legend>
          <div className="muse-vision-swatches" role="group" aria-label="Starting background">{backgroundPresets.map((p) => <button key={p.id} type="button" className="muse-vision-swatch" style={{ background: backgroundCss(p.background) }} aria-pressed={JSON.stringify(b.background) === JSON.stringify(p.background)} aria-label={p.label} title={p.label} onClick={() => set({ background: p.background })} />)}</div>
          <p className="small-label">You can change it any time, with any color or gradient.</p>
        </fieldset>
      </>}
      {(problem && b.title) || error ? <p role="alert" className="muse-aspiration-error">{error || problem}</p> : null}
      </div>
      <div className="muse-aspiration-actions"><button type="submit" className="muse-button button-primary" disabled={busy || !!problem}>{isNew ? "Create board" : "Save"}</button><button type="button" className="text-button" onClick={onClose}>Cancel</button></div>
    </form>
  </MuseModal>;
}
