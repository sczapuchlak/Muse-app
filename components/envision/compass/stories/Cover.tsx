"use client";
import { useState, type CSSProperties, type ReactNode } from "react";
import { MuseModal } from "@/components/MuseModal";
import { MuseChoiceMenu } from "@/components/MuseChoiceMenu";
import { MuseIcon } from "@/components/MuseIcon";
import { BucketPhoto } from "../../bucket/BucketViews";
import { LazyPreview } from "../../vision/BoardThumb";
import { coverPresets, type Cover } from "@/lib/inner-compass/stories";
import type { VisionBoard } from "@/lib/vision-boards/model";

/** Accents are stored as hex so a Chapter keeps its colour in every theme (like Vision Boards). */
export const accents = ["#c9a227", "#e85d75", "#8a5cf6", "#2bb5c9", "#3fa66b", "#f08a4b", "#5b7fe0", "#d4a5c9"];

/**
 * A Chapter, Experience or Collection cover. Six curated presets drawn entirely in CSS (no stock art), an optional
 * accent, and optionally the person's own photo or one of their Visions shown as the artwork. Decorative: the title
 * is always real text set over it by the caller.
 */
export function CoverArt({ cover, boards = [], className = "", children, size = "md" }: { cover: Cover; boards?: VisionBoard[]; className?: string; children?: ReactNode; size?: "sm" | "md" | "lg" }) {
  const board = cover.board ? boards.find((b) => b.id === cover.board!.id) : undefined;
  const style = (cover.accent ? { "--cover-accent": cover.accent } : {}) as CSSProperties;
  return <div className={`muse-cover ${className}`.trim()} data-preset={cover.preset} data-size={size} data-art={cover.image ? "photo" : board ? "vision" : undefined} style={style}>
    <div className="muse-cover-art" aria-hidden="true">
      {cover.image ? <BucketPhoto image={cover.image} full={size === "lg"} className="muse-cover-photo" />
        : board ? <div className="muse-cover-vision"><LazyPreview board={board} /></div>
        : <><span className="muse-cover-layer" data-l="1" /><span className="muse-cover-layer" data-l="2" /><span className="muse-cover-layer" data-l="3" />
          <svg className="muse-cover-stars" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M18 22 30 30 44 18 58 34 72 26" /><circle cx="18" cy="22" r=".9" /><circle cx="30" cy="30" r=".7" /><circle cx="44" cy="18" r="1.1" /><circle cx="58" cy="34" r=".8" /><circle cx="72" cy="26" r=".9" /><circle cx="84" cy="60" r=".6" /><circle cx="12" cy="70" r=".6" /><circle cx="66" cy="78" r=".5" /></svg></>}
    </div>
    {children && <div className="muse-cover-text">{children}</div>}
  </div>;
}

/** The focused cover customiser: presets, accent, a photo or a Vision. Not the Visions editor. */
export function CoverPicker({ cover, onSave, upload, boards, title, returnFocus, onClose }: {
  cover: Cover; onSave: (c: Cover) => Promise<unknown>; upload: (file: File) => Promise<Cover["image"] | null>; boards: VisionBoard[]; title: string; returnFocus: HTMLElement | null; onClose: () => void;
}) {
  const [draft, setDraft] = useState<Cover>(cover), [busy, setBusy] = useState(false);
  return <MuseModal id="muse-cover-picker" label="Cover" title="Cover & atmosphere" returnFocus={returnFocus} onClose={onClose} size="tall">
    <div className="muse-cover-picker">
      <CoverArt cover={draft} boards={boards} size="lg" className="muse-cover-preview"><p className="muse-cover-title">{title || "Untitled"}</p></CoverArt>
      <fieldset><legend>Atmosphere</legend>
        <div className="muse-cover-presets">{coverPresets.map((p) => <button key={p.id} type="button" aria-pressed={!draft.image && !draft.board && draft.preset === p.id} onClick={() => setDraft({ ...draft, preset: p.id, image: undefined, board: undefined })}>
          <CoverArt cover={{ preset: p.id, accent: draft.accent }} size="sm" /><b>{p.label}</b><small>{p.line}</small></button>)}</div>
      </fieldset>
      <fieldset><legend>Accent <small className="small-label">· optional</small></legend>
        <div className="muse-cover-accents">
          <button type="button" aria-pressed={!draft.accent} onClick={() => setDraft({ ...draft, accent: undefined })} aria-label="The preset’s own colours">Auto</button>
          {accents.map((a) => <button key={a} type="button" aria-pressed={draft.accent === a} style={{ background: a }} aria-label={`Accent ${a}`} onClick={() => setDraft({ ...draft, accent: a })} />)}
        </div>
      </fieldset>
      <fieldset><legend>Artwork <small className="small-label">· optional</small></legend>
        <div className="muse-cover-art-actions">
          <label className="muse-button" aria-busy={busy || undefined}><MuseIcon name="plus" size={14} /> {busy ? "Adding…" : draft.image ? "Replace photo" : "Use my photo"}
            <input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy} onChange={async (ev) => { const f = ev.target.files?.[0]; ev.target.value = ""; if (!f) return; setBusy(true); const img = await upload(f); setBusy(false); if (img) setDraft({ ...draft, image: img, board: undefined }); }} /></label>
          {boards.length > 0 && <MuseChoiceMenu label="Use a Vision" valueLabel={draft.board ? draft.board.label || "A Vision" : "Use a Vision…"} variant="chip" icon="envision" searchable selectedIds={draft.board ? [draft.board.id] : []}
            options={boards.map((b) => ({ id: b.id, label: b.title || "Untitled Vision" }))} onSelect={(id) => { const b = boards.find((x) => x.id === id); if (b) setDraft({ ...draft, board: { id: b.id, label: b.title }, image: undefined }); }} />}
          {(draft.image || draft.board) && <button type="button" className="text-button" onClick={() => setDraft({ ...draft, image: undefined, board: undefined })}>Back to the atmosphere</button>}
        </div>
        <p className="muse-compass-quiet">A Vision is shown here as a link, never copied; editing it in Visions updates this cover.</p>
      </fieldset>
      <div className="muse-compass-form-actions"><button type="button" className="muse-button" onClick={onClose}>Cancel</button>
        <button type="button" className="muse-button button-primary" disabled={busy} onClick={async () => { if (await onSave(draft)) onClose(); }}>Save cover</button></div>
    </div>
  </MuseModal>;
}
