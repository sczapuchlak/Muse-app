"use client";
import { useEffect, useRef, useState } from "react";
import { GlassPopover } from "../../GlassPopover";
import { MuseStar } from "../../MuseStar";

/**
 * Cutouts (#118, Option A): guidance for Apple's own "lift subject" feature. Muse doesn't remove backgrounds; it keeps
 * the transparency of a cutout copied from Photos and can add a die-cut outline. Shown only on iPhone and iPad, where
 * the feature lives, so the desktop editor stays uncluttered.
 */
const hintKey = "muse.vision.cutoutHint";

/** iPhone, iPod or iPad (iPadOS reports itself as a Mac, so touch points tell them apart). */
export function useAppleTouch(): boolean {
  const [apple, setApple] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent, ipad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    const t = window.setTimeout(() => setApple(/iPhone|iPad|iPod/.test(ua) || ipad), 0);
    return () => window.clearTimeout(t);
  }, []);
  return apple;
}

/**
 * Safari only offers its Paste menu in text fields, so a long-press on the canvas can't paste. This button reads the
 * copied image from the clipboard instead (Safari asks once to allow it).
 */
async function readClipboardImages(): Promise<File[]> {
  if (!navigator.clipboard?.read) throw Error("This browser can’t paste images here. Save the cutout to Photos or Files and add it with Photos instead.");
  const items = await navigator.clipboard.read();
  const files: File[] = [];
  for (const item of items) {
    const type = item.types.find((t) => t === "image/png") ?? item.types.find((t) => t.startsWith("image/"));
    if (type) { const blob = await item.getType(type); files.push(new File([blob], `cutout.${type === "image/png" ? "png" : type.split("/")[1]}`, { type })); }
  }
  if (!files.length) throw Error("There’s no picture on the clipboard yet. In Photos, press and hold the subject, then tap Copy.");
  return files;
}

export function CutoutTools({ disabled, onFiles, onError, onOpened }: { disabled: boolean; onFiles: (files: File[]) => void; onError: (message: string) => void; onOpened?: () => void }) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const paste = async () => {
    try { onFiles(await readClipboardImages()); setOpen(false); }
    catch (e) { onError(e instanceof DOMException && e.name === "NotAllowedError" ? "Muse needs your OK to paste. Tap Paste again and choose Paste in the bubble." : e instanceof Error ? e.message : "That didn’t paste. Try again."); }
  };
  return <>
    <button type="button" className="muse-button" disabled={disabled} onClick={() => void paste()}>Paste</button>
    <button ref={anchor} type="button" className="text-button muse-vision-cutout-trigger" aria-expanded={open} aria-controls="vision-cutout-help" onClick={() => { setOpen((o) => !o); onOpened?.(); }}>Make a cutout</button>
    <GlassPopover id="vision-cutout-help" label="Make a cutout with iPhone Photos" title="Make a cutout" open={open} anchorRef={anchor} onClose={() => setOpen(false)} width={320}>
      <div className="muse-vision-cutout">
        <p className="muse-vision-cutout-lede">Your iPhone can lift a person, pet or thing out of a photo. Muse keeps it see-through, like a magazine cutout.</p>
        <ol className="muse-vision-cutout-steps">
          <li><span>Open a photo in <strong>Photos</strong>.</span></li>
          <li><span><strong>Press and hold</strong> the subject until it lifts.</span></li>
          <li><span>Tap <strong>Copy</strong>.</span></li>
          <li><span>Come back here and tap <strong>Paste</strong>.</span></li>
          <li><span><span className="muse-vision-cutout-optional">Optional</span> Select it, then <strong>Outline</strong> for a white sticker edge.</span></li>
        </ol>
        <button type="button" className="muse-button button-primary" disabled={disabled} onClick={() => void paste()}>Paste from Photos</button>
        <p className="small-label">Apple’s Photos makes the cutout; Muse doesn’t remove backgrounds itself.</p>
      </div>
    </GlassPopover>
  </>;
}

/** A one-time, dismissible nudge for people who haven't met the cutout trick yet (remembered on this device). */
export function CutoutHint({ show, onDismiss }: { show: boolean; onDismiss: () => void }) {
  if (!show) return null;
  return <p className="muse-vision-cutout-hint" role="note">
    <MuseStar size={14} prismatic />
    <span><strong>A little magic trick:</strong> press and hold a subject in Photos, tap Copy, then Paste it here as a cutout.</span>
    <button type="button" className="muse-vision-cutout-dismiss" aria-label="Dismiss the cutout tip" onClick={onDismiss}>×</button>
  </p>;
}
export function useCutoutHint(enabled: boolean) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let seen = false;
    try { seen = localStorage.getItem(hintKey) === "seen"; } catch { /* show it; dismissing still works for this visit */ }
    const t = window.setTimeout(() => setShow(!seen), 0);
    return () => window.clearTimeout(t);
  }, [enabled]);
  const dismiss = () => { setShow(false); try { localStorage.setItem(hintKey, "seen"); } catch { /* this visit only */ } };
  return { show: enabled && show, dismiss };
}
