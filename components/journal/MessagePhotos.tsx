"use client";
import { useEffect, useState } from "react";
import { boardImageUrl } from "@/lib/data/constellation-images";
import type { MessageImage } from "@/lib/journal/model";

/**
 * The photos sent with one message, under its words. Private signed links that expire; a tap opens the photo large.
 * In an open conversation, "Ask about this again" attaches it to your next message, since the companion only sees a
 * photo with the message it came with.
 */
export function MessagePhotos({ images = [], previews = [], onReattach }: { images?: MessageImage[]; previews?: string[]; onReattach?: (img: MessageImage) => void }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [large, setLarge] = useState<MessageImage | null>(null);
  useEffect(() => {
    let live = true;
    for (const p of [...images.map((i) => i.thumbnailPath), ...(large ? [large.path] : [])]) if (!urls[p]) void boardImageUrl(p).then((u) => live && setUrls((x) => ({ ...x, [p]: u }))).catch(() => undefined);
    return () => { live = false; };
  }, [images, large, urls]);
  if (!images.length && !previews.length) return null;
  return <>
    <ul className="mj-photos" data-count={Math.max(images.length, previews.length)} aria-label={`${images.length || previews.length} photo${(images.length || previews.length) === 1 ? "" : "s"}`}>
      {images.length ? images.map((img) => <li key={img.id}><button type="button" className="mj-photo" onClick={() => setLarge(img)} aria-label="Open photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {urls[img.thumbnailPath] ? <img src={urls[img.thumbnailPath]} alt="" width={img.width} height={img.height} loading="lazy" /> : <span className="mj-image-wait" />}
      </button></li>)
        : previews.map((p, i) => <li key={i}><span className="mj-photo" data-pending>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p} alt="" />
        </span></li>)}
    </ul>
    {large && <div className="mj-lightbox" role="dialog" aria-label="Photo" onClick={(e) => { if (e.target === e.currentTarget) setLarge(null); }}>
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {urls[large.path] ? <img src={urls[large.path]} alt="" /> : <span className="mj-image-wait" />}
        <div className="mj-form-actions">
          {onReattach && <button type="button" className="muse-button" onClick={() => { onReattach(large); setLarge(null); }}>Ask about this again</button>}
          <button type="button" className="muse-button button-primary" onClick={() => setLarge(null)}>Close</button>
        </div>
      </figure>
    </div>}
  </>;
}
