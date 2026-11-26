"use client";
/* eslint-disable @next/next/no-img-element -- private photos load through short-lived signed URLs; next/image would proxy them. */
import { useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { useBoardImage } from "../envision/vision/images";
import { MuseIcon } from "../MuseIcon";
import { MuseModal } from "../MuseModal";
import { BLOCK_LIMITS, safeHref, siteName, type ImagesData, type LinkData, type SpaceImage } from "@/lib/lists/blocks";
import { uploadSpaceImage } from "./ListsStore";

/** A private photo; `thumb` uses the small copy. Shows a soft placeholder while it loads. */
export function SpaceImg({ image, thumb, alt, className }: { image: SpaceImage; thumb?: boolean; alt: string; className?: string }) {
  const img = useBoardImage(thumb ? image.thumbnailPath : image.path);
  return img ? <img className={className} src={img.src} alt={alt} width={image.width} height={image.height} loading="lazy" draggable={false} />
    : <span className={`muse-space-img-wait ${className ?? ""}`} data-failed={img === null || undefined} role="img" aria-label={img === null ? "Photo couldn’t load" : "Loading photo"} />;
}

/** Choose, drop or paste photos; uploads one by one and reports plainly when one can't be used. */
export function usePhotoUpload(folderId: string, onAdded: (imgs: SpaceImage[]) => void) {
  const [busy, setBusy] = useState(0), [error, setError] = useState(""), input = useRef<HTMLInputElement>(null);
  async function add(files: FileList | File[]) {
    const list = [...files].filter((f) => f.type.startsWith("image/")); if (!list.length) return;
    setError(""); setBusy(list.length); const done: SpaceImage[] = [];
    for (const f of list) { try { done.push(await uploadSpaceImage(folderId, f)); } catch (e) { setError(e instanceof Error ? e.message : "That photo couldn’t upload."); } setBusy((n) => n - 1); }
    if (done.length) onAdded(done);
  }
  const picker = <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={(e) => { if (e.target.files) void add(e.target.files); e.target.value = ""; }} />;
  const dropProps = {
    onDragOver: (e: DragEvent) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); e.stopPropagation(); } },
    onDrop: (e: DragEvent) => { if (e.dataTransfer.files.length) { e.preventDefault(); e.stopPropagation(); void add(e.dataTransfer.files); } },
    onPaste: (e: ClipboardEvent) => { if (e.clipboardData.files.length) { e.preventDefault(); void add(e.clipboardData.files); } },
  };
  return { add, busy, error, picker, choose: () => input.current?.click(), dropProps };
}

/** Photos: a mosaic that reads like a mood board; captions on hover and in the larger view. */
export function ImagesBlock({ blockId, data, editing, onSave, onEditing }: { blockId: string; data: ImagesData; editing: boolean; onSave: (d: ImagesData) => unknown; onEditing: (v: boolean) => void }) {
  const [view, setView] = useState<number | null>(null);
  const up = usePhotoUpload(blockId, (imgs) => void onSave({ ...data, images: [...data.images, ...imgs].slice(0, BLOCK_LIMITS.images) }));
  const set = (images: SpaceImage[]) => onSave({ ...data, images });
  const shown = data.images, n = shown.length;
  return <div className="muse-space-images" {...up.dropProps} tabIndex={-1}>
    {up.picker}
    {data.title && <p className="muse-space-block-title">{data.title}</p>}
    {n === 0 ? <button type="button" className="muse-space-drop" onClick={up.choose}>
      <span className="muse-space-drop-art" aria-hidden="true"><i /><i /><i /></span>
      <strong>{up.busy ? `Adding ${up.busy} photo${up.busy === 1 ? "" : "s"}…` : "Add photos"}</strong><small>Choose, drop or paste images. Screenshots of pins and posts work too.</small>
    </button>
      : !editing ? <div className="muse-space-mosaic" data-count={Math.min(n, 5)}>
        {shown.slice(0, 5).map((im, i) => <button key={im.id + i} type="button" className="muse-space-tile" onClick={() => setView(i)} aria-label={`Open photo ${i + 1}${im.caption ? `: ${im.caption}` : ""}`}>
          <SpaceImg image={im} thumb={n > 2 && i > 0} alt={im.caption ?? ""} />
          {im.caption && <span className="muse-space-caption">{im.caption}</span>}
          {i === 4 && n > 5 && <span className="muse-space-more">+{n - 5}</span>}
        </button>)}
      </div>
        : <ul className="muse-space-image-edit">{shown.map((im, i) => <li key={im.id + i}>
          <SpaceImg image={im} thumb alt="" />
          <input value={im.caption ?? ""} maxLength={BLOCK_LIMITS.caption} placeholder="Caption" aria-label={`Caption for photo ${i + 1}`} onChange={(e) => set(shown.map((x, k) => k === i ? { ...x, caption: e.target.value || undefined } : x))} />
          <span>
            <button type="button" className="muse-lists-mini" aria-label="Move earlier" disabled={i === 0} onClick={() => { const c = [...shown]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; set(c); }}><span className="muse-list-icon-up"><MuseIcon name="arrow" size={13} /></span></button>
            <button type="button" className="muse-lists-mini" aria-label="Move later" disabled={i === n - 1} onClick={() => { const c = [...shown]; [c[i + 1], c[i]] = [c[i], c[i + 1]]; set(c); }}><span className="muse-list-icon-down"><MuseIcon name="arrow" size={13} /></span></button>
            <button type="button" className="muse-lists-mini" aria-label={`Remove photo ${i + 1}`} onClick={() => set(shown.filter((_, k) => k !== i))}><MuseIcon name="trash" size={13} /></button>
          </span>
        </li>)}</ul>}
    {(editing || (n > 0 && up.busy > 0)) && <div className="muse-space-edit-foot">
      {editing && n < BLOCK_LIMITS.images && <button type="button" className="muse-button button-ghost" onClick={up.choose}><MuseIcon name="photo" size={14} /> {up.busy ? `Adding ${up.busy}…` : "Add photos"}</button>}
      {!editing && up.busy > 0 && <small className="small-label">Adding {up.busy} photo{up.busy === 1 ? "" : "s"}…</small>}
      {editing && <button type="button" className="muse-button muse-space-done" onClick={() => onEditing(false)}>Done</button>}
    </div>}
    {up.error && <p className="field-error" role="alert">{up.error}</p>}
    {view !== null && shown[view] && <Lightbox images={shown} index={view} onIndex={setView} onClose={() => setView(null)} />}
  </div>;
}

export function Lightbox({ images, index, onIndex, onClose }: { images: SpaceImage[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const im = images[index];
  return <MuseModal id="space-photo" label={im.caption || `Photo ${index + 1} of ${images.length}`} returnFocus={null} onClose={onClose}>
    <figure className="muse-space-lightbox" onKeyDown={(e) => { if (e.key === "ArrowRight" && index < images.length - 1) onIndex(index + 1); if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1); }}>
      <SpaceImg image={im} alt={im.caption ?? ""} />
      <figcaption>{im.caption && <span>{im.caption}</span>}{images.length > 1 && <span className="muse-space-lightbox-nav">
        <button type="button" className="muse-lists-mini" aria-label="Previous photo" disabled={index === 0} onClick={() => onIndex(index - 1)}>‹</button>
        <small>{index + 1} / {images.length}</small>
        <button type="button" className="muse-lists-mini" aria-label="Next photo" disabled={index === images.length - 1} onClick={() => onIndex(index + 1)}>›</button></span>}</figcaption>
    </figure>
  </MuseModal>;
}

/** A saved link: a clean card that opens the page. No previews are fetched; the title, note and photo are yours. */
export function LinkBlock({ blockId, data, editing, onSave, onEditing }: { blockId: string; data: LinkData; editing: boolean; onSave: (d: LinkData) => unknown; onEditing: (v: boolean) => void }) {
  const href = safeHref(data.url);
  const [draft, setDraft] = useState(data), [error, setError] = useState("");
  const up = usePhotoUpload(blockId, ([img]) => { const next = { ...draft, image: img }; setDraft(next); void onSave(next); });
  if (editing || !href) {
    const save = (close: boolean) => {
      const url = safeHref(draft.url); if (draft.url.trim() && !url) { setError("Use a web address, like https://…"); return; }
      setError(""); void onSave({ ...draft, url: url ?? "", title: draft.title?.trim() || undefined, note: draft.note?.trim() || undefined }); if (close && url) onEditing(false);
    };
    return <form className="muse-space-link-edit" onSubmit={(e) => { e.preventDefault(); save(true); }} {...up.dropProps}>
      {up.picker}
      <label className="muse-space-link-url"><MuseIcon name="link" size={15} /><input autoFocus={!href} type="text" inputMode="url" value={draft.url} maxLength={BLOCK_LIMITS.url} placeholder="Paste a link: Instagram, Pinterest, a hotel, a product…" aria-label="Link address" onChange={(e) => setDraft({ ...draft, url: e.target.value })} /></label>
      {(href || draft.url.trim()) && <>
        <input value={draft.title ?? ""} maxLength={BLOCK_LIMITS.title} placeholder="Title (optional)" aria-label="Link title" onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <textarea value={draft.note ?? ""} maxLength={BLOCK_LIMITS.longValue} rows={2} placeholder="Why you saved it (optional)" aria-label="Link note" onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        <div className="muse-space-edit-foot">
          {draft.image ? <button type="button" className="muse-button button-ghost" onClick={() => { const next = { ...draft, image: undefined }; setDraft(next); void onSave(next); }}><MuseIcon name="close" size={13} /> Remove photo</button>
            : <button type="button" className="muse-button button-ghost" onClick={up.choose}><MuseIcon name="photo" size={14} /> {up.busy ? "Adding…" : "Add a photo"}</button>}
          <button type="submit" className="muse-button muse-space-done">{href ? "Done" : "Save link"}</button>
        </div></>}
      {(error || up.error) && <p className="field-error" role="alert">{error || up.error}</p>}
    </form>;
  }
  const site = siteName(href);
  return <a className="muse-space-link" href={href} target="_blank" rel="noopener noreferrer" data-photo={!!data.image || undefined}>
    {data.image ? <SpaceImg image={data.image} thumb alt="" className="muse-space-link-photo" /> : <span className="muse-space-site" aria-hidden="true">{site.slice(0, 1).toUpperCase()}</span>}
    <span className="muse-space-link-text">
      <strong>{data.title || site}</strong>
      {data.note && <span className="muse-space-link-note">{data.note}</span>}
      <small>{site} <MuseIcon name="arrow" size={11} /></small>
    </span>
  </a>;
}
