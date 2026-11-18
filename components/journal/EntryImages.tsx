"use client";
import { useEffect, useRef, useState } from "react";
import { useJournal } from "./useJournal";
import { boardImageUrl, removeBoardImages, uploadBoardImage } from "@/lib/data/constellation-images";
import type { Conversation, JournalImage } from "@/lib/journal/model";

/**
 * Photos on an entry (Journal V1 §19), in Muse's private image storage (owner folder, signed links that expire).
 * Entry photos are never sent to an AI model (photos attached to a message are a separate thing: see MessagePhotos). Removing one deletes the file after the entry stops referring to it.
 */
export function EntryImages({ conversation: c }: { conversation: Conversation }) {
  const j = useJournal();
  const input = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [large, setLarge] = useState<JournalImage | null>(null);
  useEffect(() => {
    let live = true;
    for (const img of c.images) if (!urls[img.thumbnailPath]) void boardImageUrl(img.thumbnailPath).then((u) => live && setUrls((x) => ({ ...x, [img.thumbnailPath]: u }))).catch(() => undefined);
    return () => { live = false; };
  }, [c.images, urls]);
  useEffect(() => { if (large && !urls[large.path]) void boardImageUrl(large.path).then((u) => setUrls((x) => ({ ...x, [large.path]: u }))).catch(() => undefined); }, [large, urls]);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    if (c.images.length + files.length > 20) { setError("Up to 20 photos per entry."); return; }
    setBusy(true); setError("");
    try {
      const added: JournalImage[] = [];
      for (const f of Array.from(files)) { const img = await uploadBoardImage(j.userId, c.id, f, { allowJpeg: true }); added.push({ id: img.id, path: img.path, thumbnailPath: img.thumbnailPath, width: img.width, height: img.height, caption: "", alt: "" }); }
      const fresh = (await j.refreshConversation(c.id)) ?? c;
      await j.updateMeta({ ...fresh, images: [...fresh.images, ...added.filter((a) => !fresh.images.some((x) => x.id === a.id))] });
    } catch (e) { setError(e instanceof Error ? e.message : "The photo couldn’t be added."); }
    setBusy(false); if (input.current) input.current.value = "";
  }
  async function remove(img: JournalImage) {
    if (!window.confirm("Remove this photo from the entry?")) return;
    const saved = await j.updateMeta({ ...c, images: c.images.filter((x) => x.id !== img.id) });
    if (saved) { try { await removeBoardImages([{ ...img, name: "", alt: "", mime: "image/webp" } as never]); } catch { setError("Removed from the entry; the file will be cleaned up later."); } }
    setLarge(null);
  }
  async function caption(img: JournalImage, text: string) { await j.updateMeta({ ...c, images: c.images.map((x) => (x.id === img.id ? { ...x, caption: text.slice(0, 300), alt: text.slice(0, 200) } : x)) }); }

  return <div className="mj-images">
    <div className="mj-row-between"><h3 className="mj-section-title">Photos</h3>
      <button type="button" className="muse-button button-ghost" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Adding…" : "Add photos"}</button>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => void add(e.target.files)} /></div>
    {error && <p className="mj-error" role="alert">{error}</p>}
    {c.images.length > 0 && <ul className="mj-image-grid">{c.images.map((img) => <li key={img.id}>
      <button type="button" className="mj-image" onClick={() => setLarge(img)} aria-label={img.caption || "Open photo"}>{urls[img.thumbnailPath] ? <img src={urls[img.thumbnailPath]} alt={img.alt} loading="lazy" width={img.width} height={img.height} /> : <span className="mj-image-wait" />}</button>
      {img.caption && <small>{img.caption}</small>}
    </li>)}</ul>}
    {large && <div className="mj-lightbox" role="dialog" aria-label="Photo" onClick={(e) => { if (e.target === e.currentTarget) setLarge(null); }}>
      <figure>{urls[large.path] ? <img src={urls[large.path]} alt={large.alt} /> : <span className="mj-image-wait" />}
        <figcaption><CaptionField value={large.caption} onSave={(t) => void caption(large, t)} /></figcaption>
        <div className="mj-form-actions"><button type="button" className="muse-button" onClick={() => void remove(large)}>Remove photo</button><button type="button" className="muse-button button-primary" onClick={() => setLarge(null)}>Close</button></div>
      </figure>
    </div>}
  </div>;
}
function CaptionField({ value, onSave }: { value: string; onSave: (t: string) => void }) {
  const [t, setT] = useState(value);
  return <form onSubmit={(e) => { e.preventDefault(); onSave(t.trim()); }} className="mj-tag-add"><input type="text" aria-label="Caption" placeholder="Add a caption" value={t} maxLength={300} onChange={(e) => setT(e.target.value)} /><button type="submit" className="muse-button" disabled={t === value}>Save</button></form>;
}
