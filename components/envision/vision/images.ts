"use client";
import { useEffect, useState } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { boardImageBucket } from "@/lib/data/constellation-images";

/**
 * Private board images, loaded once per page. Signed URLs are requested in batches (a board can hold dozens of
 * photos) and decoded images are cached by storage path, so the library, the editor and Intentions previews share them.
 * Images load with CORS so the canvas stays exportable.
 */
type Entry = { img?: HTMLImageElement; error?: boolean; promise?: Promise<HTMLImageElement>; listeners: Set<() => void> };
const cache = new Map<string, Entry>();
const urls = new Map<string, { url: string; expires: number }>();
let pending: { paths: Set<string>; timer: number; waiters: Map<string, ((url: string | null) => void)[]> } | null = null;
const TTL = 3600;

function signedUrl(path: string): Promise<string | null> {
  const known = urls.get(path);
  if (known && known.expires > Date.now() + 60_000) return Promise.resolve(known.url);
  return new Promise((resolve) => {
    if (!pending) pending = { paths: new Set(), waiters: new Map(), timer: window.setTimeout(flush, 30) };
    pending.paths.add(path);
    pending.waiters.set(path, [...(pending.waiters.get(path) ?? []), resolve]);
  });
}
async function flush() {
  const batch = pending;
  pending = null;
  if (!batch) return;
  const paths = [...batch.paths];
  try {
    const { data, error } = await createMuseBrowserClient().storage.from(boardImageBucket).createSignedUrls(paths, TTL);
    if (error) throw error;
    for (const row of data ?? []) if (row.path && row.signedUrl) urls.set(row.path, { url: row.signedUrl, expires: Date.now() + TTL * 1000 });
  } catch { /* each waiter gets null and shows the "couldn't load" state */ }
  for (const p of paths) for (const done of batch.waiters.get(p) ?? []) done(urls.get(p)?.url ?? null);
}

export function loadBoardImage(path: string): Promise<HTMLImageElement> {
  let entry = cache.get(path);
  if (entry?.img) return Promise.resolve(entry.img);
  if (entry?.promise) return entry.promise;
  if (!entry) { entry = { listeners: new Set() }; cache.set(path, entry); }
  const e = entry;
  e.error = false;
  e.promise = signedUrl(path).then((url) => new Promise<HTMLImageElement>((resolve, reject) => {
    if (!url) { reject(Error("Image could not load.")); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(Error("Image could not load."));
    img.src = url;
  })).then((img) => { e.img = img; return img; }, (err) => { e.error = true; throw err; })
    .finally(() => { e.promise = undefined; for (const l of e.listeners) l(); });
  return e.promise;
}
/** Seeds the cache with an image the person just uploaded, so it appears without a round trip. */
export function primeBoardImage(path: string, img: HTMLImageElement) { const e = cache.get(path) ?? { listeners: new Set() }; e.img = img; e.error = false; cache.set(path, e); }

/** The decoded image for a path, or `undefined` while loading, or `null` if it couldn't load. */
export function useBoardImage(path: string | undefined): HTMLImageElement | null | undefined {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!path) return;
    const entry = cache.get(path) ?? { listeners: new Set<() => void>() };
    cache.set(path, entry);
    const listener = () => bump((n) => n + 1);
    entry.listeners.add(listener);
    if (!entry.img && !entry.promise && !entry.error) loadBoardImage(path).catch(() => undefined);
    return () => { entry.listeners.delete(listener); };
  }, [path]);
  if (!path) return undefined;
  const e = cache.get(path);
  return e?.img ?? (e?.error ? null : undefined);
}
export function retryBoardImage(path: string) { const e = cache.get(path); if (e) e.error = false; loadBoardImage(path).catch(() => undefined); }
