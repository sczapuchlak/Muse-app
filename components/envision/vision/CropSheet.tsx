"use client";
import { useId, useRef, useState, type PointerEvent } from "react";
import { MuseModal } from "../../MuseModal";
import { cropRect, withCropShape, type Crop, type ImageElement } from "@/lib/vision-boards/model";
import { cropShapes, scalePath, shapePaths, type CropShape } from "@/lib/vision-boards/shapes";
import { useBoardImage } from "./images";

/**
 * Shape cropping (#118 §7): choose a preset shape, zoom, and drag the photo inside it. Nothing is cut: the crop is
 * stored on the element and can be changed or reset at any time; the original image stays untouched.
 */
export function CropSheet({ element, onApply, onClose }: { element: ImageElement; onApply: (e: ImageElement) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<ImageElement>(element);
  const img = useBoardImage(element.image.path) ?? null;
  const clipId = useId().replace(/:/g, "");
  const ratio = (shape: CropShape) => cropShapes.find((s) => s.id === shape)!.ratio;
  const frame = { w: draft.w, h: draft.h }, view = 320, k = view / Math.max(frame.w, frame.h), fw = frame.w * k, fh = frame.h * k;
  const r = img ? cropRect({ w: fw, h: fh }, { width: img.naturalWidth, height: img.naturalHeight }, draft.crop) : null;
  const setCrop = (patch: Partial<Crop>) => setDraft((d) => ({ ...d, crop: { ...d.crop, ...patch } }));
  const drag = useRef<{ x: number; y: number; crop: Crop } | null>(null);
  // How far one pixel of pointer movement moves the photo, in the crop's -1…1 range.
  const span = r ? { x: (r.w - fw) / 2, y: (r.h - fh) / 2 } : { x: 0, y: 0 };
  function move(ev: PointerEvent<SVGSVGElement>) {
    const d = drag.current; if (!d) return;
    const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
    setCrop({ x: span.x ? Math.max(-1, Math.min(1, d.crop.x + dx / span.x)) : 0, y: span.y ? Math.max(-1, Math.min(1, d.crop.y + dy / span.y)) : 0 });
  }
  const nudge = (dx: number, dy: number) => setCrop({ x: Math.max(-1, Math.min(1, draft.crop.x + dx)), y: Math.max(-1, Math.min(1, draft.crop.y + dy)) });
  return <MuseModal id="vision-crop" label="Crop and shape" title="Crop & shape" returnFocus={null} onClose={onClose}>
    <div className="muse-vision-crop">
      <div className="muse-chip-row muse-vision-shapes" role="group" aria-label="Shape">
        {cropShapes.map((s) => <button key={s.id} type="button" className="muse-chip" aria-pressed={draft.crop.shape === s.id} onClick={() => setDraft((d) => withCropShape(d, s.id, ratio(s.id)))}>
          <svg viewBox="0 0 1 1" width="16" height="16" aria-hidden="true"><path d={shapePaths[s.id]} fill="currentColor" /></svg>{s.label}</button>)}
      </div>
      <div className="muse-vision-crop-stage">
        {img === null ? <p className="small-label">This image couldn’t load. Try again in a moment.</p> : !r ? <p className="small-label" role="status">Loading…</p> :
          <svg width={fw} height={fh} viewBox={`0 0 ${fw} ${fh}`} role="img" aria-label="Drag to move the photo inside the shape" style={{ touchAction: "none", cursor: "grab", overflow: "visible" }}
            onPointerDown={(ev) => { ev.currentTarget.setPointerCapture(ev.pointerId); drag.current = { x: ev.clientX, y: ev.clientY, crop: draft.crop }; }}
            onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
            <defs><clipPath id={clipId}><path d={scalePath(shapePaths[draft.crop.shape], fw, fh)} /></clipPath></defs>
            <image href={img.src} x={r.x} y={r.y} width={r.w} height={r.h} opacity={0.28} preserveAspectRatio="none" />
            <image href={img.src} x={r.x} y={r.y} width={r.w} height={r.h} clipPath={`url(#${clipId})`} preserveAspectRatio="none" />
            <path d={scalePath(shapePaths[draft.crop.shape], fw, fh)} fill="none" stroke="#8050cf" strokeWidth={1.5} strokeDasharray="6 4" />
          </svg>}
      </div>
      <label className="muse-vision-range">Zoom<input type="range" min={1} max={4} step={0.01} value={draft.crop.zoom} onChange={(e) => setCrop({ zoom: Number(e.target.value) })} /></label>
      <div className="muse-vision-nudge" role="group" aria-label="Move the photo">
        <button type="button" className="muse-button" aria-label="Move photo left" onClick={() => nudge(-0.1, 0)}>←</button>
        <button type="button" className="muse-button" aria-label="Move photo up" onClick={() => nudge(0, -0.1)}>↑</button>
        <button type="button" className="muse-button" aria-label="Move photo down" onClick={() => nudge(0, 0.1)}>↓</button>
        <button type="button" className="muse-button" aria-label="Move photo right" onClick={() => nudge(0.1, 0)}>→</button>
        <button type="button" className="text-button" onClick={() => setCrop({ zoom: 1, x: 0, y: 0 })}>Reset</button>
      </div>
      <p className="small-label">Drag the photo to choose what shows. The original is kept, so you can change this later.</p>
      <div className="muse-aspiration-actions"><button type="button" className="muse-button button-primary" onClick={() => onApply(draft)}>Apply</button><button type="button" className="text-button" onClick={onClose}>Cancel</button></div>
    </div>
  </MuseModal>;
}
