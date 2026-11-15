"use client";
import { useState } from "react";
import { MuseIcon } from "@/components/MuseIcon";
import { LIMITS, type Reflection } from "@/lib/inner-compass/model";
import type { Compass } from "./useInnerCompass";
import { shortDate } from "./parts";
import type { BoardImage } from "@/lib/constellation-board";
import { BucketPhoto } from "../bucket/BucketViews";
import { ImagesInput } from "./stories/Fields";

/** A handful of feeling words to tap, never required. The person can type their own instead. */
const feelings = ["calm", "tender", "hopeful", "unsettled", "proud", "curious", "grateful", "heavy", "light", "clear"];

/**
 * "Reflect on this": a light journal note about a discovery or an exploration. It keeps the discovery's name as it
 * was, so deleting the discovery later never erases what was written. Not a second journal app: one textarea, a
 * date and an optional feeling.
 */
type About = { discoveryId?: string | null; discoveryTitle?: string | null; responseId?: string | null; chapterId?: string | null; chapterTitle?: string | null; experienceId?: string | null; experienceTitle?: string | null };
/** Optional photos (#211): Chapter and Experience reflections can carry a few images, uploaded to the person's private storage. */
export type ImageSupport = { upload: (file: File) => Promise<BoardImage | null> };
export function ReflectionComposer({ compass, today, about, existing, onDone, images: imageSupport }: { compass: Compass; today: string; about: About; existing?: Reflection; onDone: () => void; images?: ImageSupport }) {
  const [body, setBody] = useState(existing?.body ?? ""), [feeling, setFeeling] = useState(existing?.feeling ?? ""), [on, setOn] = useState(existing?.writtenOn ?? today), [pics, setPics] = useState<BoardImage[]>(existing?.images ?? []);
  async function save() {
    if (!body.trim()) return;
    const r: Reflection = existing
      ? { ...existing, body, feeling: feeling || null, writtenOn: on, images: pics }
      : { id: crypto.randomUUID(), discoveryId: about.discoveryId ?? null, discoveryTitle: about.discoveryTitle ?? null, responseId: about.responseId ?? null, body, feeling: feeling || null, writtenOn: on, revision: 0, createdAt: "", updatedAt: "",
          chapterId: about.chapterId ?? null, chapterTitle: about.chapterTitle ?? null, experienceId: about.experienceId ?? null, experienceTitle: about.experienceTitle ?? null, images: pics };
    if (await compass.saveReflection(r)) onDone();
  }
  return <form className="muse-compass-reflect" onSubmit={(e) => { e.preventDefault(); void save(); }}>
    <label className="sr-only" htmlFor="compass-reflect-body">Reflection</label>
    <textarea id="compass-reflect-body" rows={5} autoFocus maxLength={LIMITS.body} value={body} placeholder="Whatever comes. It can be a sentence." onChange={(e) => setBody(e.target.value)} />
    <div className="muse-compass-reflect-meta">
      <div className="muse-chip-row" role="group" aria-label="A feeling (optional)" data-scroll>
        {feelings.map((f) => <button key={f} type="button" aria-pressed={feeling === f} onClick={() => setFeeling(feeling === f ? "" : f)}>{f}</button>)}
        <input aria-label="Or your own word" className="muse-compass-feeling" maxLength={LIMITS.feeling} placeholder="or your word" value={feelings.includes(feeling) ? "" : feeling} onChange={(e) => setFeeling(e.target.value)} />
      </div>
      <label className="muse-compass-date"><span className="sr-only">Date</span><input type="date" value={on} max={today} onChange={(e) => setOn(e.target.value || today)} /></label>
    </div>
    {imageSupport && <ImagesInput images={pics} max={6} upload={imageSupport.upload} label="Add photos" onChange={setPics} />}
    <div className="muse-compass-form-actions"><button type="button" className="muse-button" onClick={onDone}>Cancel</button><button type="submit" className="muse-button button-primary" disabled={!body.trim() || compass.status.saving}>Save reflection</button></div>
  </form>;
}

export function ReflectionList({ compass, today, items, images, onSaveDiscovery, order = "newest" }: { compass: Compass; today: string; items: Reflection[]; images?: ImageSupport; onSaveDiscovery?: (text: string) => void; order?: "newest" | "oldest" }) {
  const [editing, setEditing] = useState<string | null>(null), [confirm, setConfirm] = useState<string | null>(null);
  if (!items.length) return null;
  const sorted = [...items].sort((a, b) => { const d = a.writtenOn.localeCompare(b.writtenOn) || a.createdAt.localeCompare(b.createdAt); return order === "oldest" ? d : -d; });
  return <ol className="muse-compass-reflections">{sorted.map((r) => <li key={r.id}>
    {editing === r.id ? <ReflectionComposer compass={compass} today={today} about={{}} existing={r} images={images} onDone={() => setEditing(null)} /> : <>
      <p className="muse-compass-reflection-meta"><span className="type-numeric">{shortDate(r.writtenOn)}</span>{r.feeling && <span className="muse-compass-chip">{r.feeling}</span>}</p>
      <p className="muse-compass-reflection-body">{r.body}</p>
      {!!r.images?.length && <div className="muse-stories-gallery">{r.images.map((i) => <BucketPhoto key={i.id} image={i} className="muse-stories-image" />)}</div>}
      {confirm === r.id
        ? <p className="muse-compass-quiet">Delete this reflection? <button type="button" className="text-button" onClick={() => setConfirm(null)}>Keep</button> <button type="button" className="text-button muse-compass-danger-text" onClick={() => void compass.removeReflection(r.id)}>Delete</button></p>
        : <p className="muse-compass-reflection-tools"><button type="button" className="text-button" onClick={() => setEditing(r.id)}><MuseIcon name="edit" size={13} /> Edit</button><button type="button" className="text-button" onClick={() => setConfirm(r.id)}><MuseIcon name="trash" size={13} /> Delete</button>{onSaveDiscovery && <button type="button" className="text-button" onClick={() => onSaveDiscovery(r.body.split(/\n/)[0].slice(0, 300))}><MuseIcon name="sparkle" size={13} /> Save as discovery</button>}</p>}
    </>}
  </li>)}</ol>;
}
