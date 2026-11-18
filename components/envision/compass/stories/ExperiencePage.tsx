"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MuseModal } from "@/components/MuseModal";
import { MuseChoiceMenu } from "@/components/MuseChoiceMenu";
import { MuseIcon } from "@/components/MuseIcon";
import { MuseOverflowMenu } from "@/components/MuseOverflowMenu";
import { MuseSegmented } from "@/components/design/MuseSegmented";
import { usePlanner } from "@/components/PlannerStore";
import { projectEvents } from "@/lib/planner-occurrences";
import { canonicalTag, cleanTags, knownTags, type Experience, type EventRef, myMaterials } from "@/lib/inner-compass/stories";
import type { VisionBoard } from "@/lib/vision-boards/model";
import type { Compass } from "../useInnerCompass";
import type { Stories } from "./useStories";
import { CoverArt, CoverPicker } from "./Cover";
import { ImagesInput, PhotoFigure } from "./Fields";
import { ModuleBoard } from "./ModuleBoard";
import { withUpload, useRefSources, SaveAsDiscovery, AreasField, shortDate } from "./shared";
import { ReflectionComposer, ReflectionList } from "../Reflections";
import { BucketPhoto } from "../../bucket/BucketViews";

const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/** One Experience: the single authoritative record, wherever it appears. Simple by default, rich when you want it. */
export function ExperiencePage({ e, stories, compass, boards, today, onBack, onOpenChapter, onOpenCollection }: {
  e: Experience; stories: Stories; compass: Compass; boards: VisionBoard[]; today: string; onBack: () => void; onOpenChapter: (id: string) => void; onOpenCollection: (id: string) => void;
}) {
  const [dialog, setDialog] = useState<"details" | "cover" | "delete" | null>(null), [opener, setOpener] = useState<HTMLElement | null>(null);
  const [reflecting, setReflecting] = useState(false), [order, setOrder] = useState<"newest" | "oldest">("oldest"), [saving, setSaving] = useState<string | null>(null);
  const open = (d: typeof dialog) => { setOpener(document.activeElement as HTMLElement | null); setDialog(d); };
  const refs = useRefSources(compass, boards), upload = (f: File) => stories.upload(e.id, f), sources = { ...withUpload(refs, today, upload), mine: myMaterials(stories.modules) };
  const chapters = stories.chapterExperiences.filter((j) => j.b === e.id).map((j) => stories.chapters.find((c) => c.id === j.a)).filter((c): c is NonNullable<typeof c> => !!c);
  const collections = stories.collectionExperiences.filter((j) => j.b === e.id).map((j) => stories.collections.find((c) => c.id === j.a)).filter((c): c is NonNullable<typeof c> => !!c);
  const areas = compass.areas.filter((a) => stories.areasOf({ experienceId: e.id }).includes(a.id));
  const reflections = compass.reflections.filter((r) => r.experienceId === e.id);
  const discoveries = compass.discoveries.filter((d) => d.source?.kind === "experience" && d.source.id === e.id);
  const saveDiscovery = (text: string) => { setOpener(document.activeElement as HTMLElement | null); setSaving(text); };
  const hero = e.cover.image ?? e.photos[0];

  return <article className="muse-stories-page" aria-labelledby="experience-title">
    <button type="button" className="muse-stories-back" onClick={onBack}><svg viewBox="0 0 8 12" width="7" height="10" aria-hidden="true"><path d="m6.5 1-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg> All experiences</button>
    <header className="muse-stories-exp-head">
      <div className="muse-stories-exp-art">{hero ? <BucketPhoto image={hero} full className="muse-stories-exp-photo" /> : <CoverArt cover={e.cover} boards={boards} size="lg" />}</div>
      <div className="muse-stories-exp-copy">
        <p className="muse-kicker">Experience{e.happenedOn ? ` · ${shortDate(e.happenedOn)}` : ""}</p>
        <h2 id="experience-title" className="muse-stories-exp-title">{e.title}</h2>
        {(e.location || e.people || e.theme) && <dl className="muse-stories-facts">
          {e.theme && <div><dt>Theme</dt><dd>{e.theme}</dd></div>}{e.location && <div><dt>Where</dt><dd>{e.location}</dd></div>}{e.people && <div><dt>With</dt><dd>{e.people}</dd></div>}
        </dl>}
        {e.description && <p className="muse-stories-meaning">{e.description}</p>}
        {e.tags.length > 0 && <p className="muse-compass-detail-tags">{e.tags.map((t) => <span key={t} className="muse-compass-tag">#{t}</span>)}</p>}
        <div className="muse-compass-hero-actions">
          <button type="button" className="muse-button button-primary" onClick={() => open("details")}><MuseIcon name="edit" size={15} /> Details</button>
          {e.photos.length === 0 && <AddPhotos upload={upload} onAdd={(photos) => void stories.saveExperience({ ...e, photos })} />}
          <button type="button" className="muse-button" onClick={() => open("cover")}><MuseIcon name="appearance" size={15} /> Cover</button>
          <MuseOverflowMenu label="Experience options" actions={[
            { id: "archive", label: e.archivedAt ? "Restore from the archive" : "Archive", onSelect: () => void stories.saveExperience({ ...e, archivedAt: e.archivedAt ? null : new Date().toISOString() }) },
            { id: "delete", label: "Delete…", destructive: true, onSelect: () => open("delete") },
          ]} />
        </div>
      </div>
    </header>

    <section className="muse-stories-belongs" aria-label="Where this experience appears">
      {chapters.map((c) => <button key={c.id} type="button" className="muse-stories-belong" data-kind="chapter" onClick={() => onOpenChapter(c.id)}><small>Chapter</small>{c.title}</button>)}
      {collections.map((c) => <button key={c.id} type="button" className="muse-stories-belong" data-kind="collection" onClick={() => onOpenCollection(c.id)}><small>Collection</small>{c.name}</button>)}
      {areas.map((a) => <Link key={a.id} className="muse-stories-belong" data-kind="area" href={`/envision#atlas-area-${a.id}`}><small>Life Atlas</small><span className="muse-compass-area-dot" style={{ background: a.color }} aria-hidden="true" />{a.label}</Link>)}
      {e.event && <Link className="muse-stories-belong" data-kind="event" href={`/planner?view=agenda&date=${e.event.date}`}><small>Agenda</small>{e.event.title} · {shortDate(e.event.date)}</Link>}
      {discoveries.map((d) => <Link key={d.id} className="muse-stories-belong" data-kind="discovery" href={`/envision?view=inner-compass&d=${d.id}`}><small>Discovery</small>{d.title}</Link>)}
      {!chapters.length && !collections.length && !areas.length && !e.event && <p className="muse-compass-quiet">Standing on its own. <button type="button" className="text-button" onClick={() => open("details")}>Add it to a chapter or collection</button></p>}
    </section>

    {e.photos.length > 0 && <ExperiencePhotos e={e} stories={stories} upload={upload} />}

    <ModuleBoard owner="experience" ownerId={e.id} ownerLabel={e.title} stories={stories} sources={sources} addLabel="Add to experience" onSaveDiscovery={saveDiscovery} linked={() => null} />

    <section className="muse-stories-revisit" aria-labelledby="exp-reflections-title">
      <header><h3 id="exp-reflections-title" className="muse-compass-subhead">Reflections over time</h3>
        {reflections.length > 1 && <MuseSegmented label="Order" value={order} onChange={setOrder} options={[{ id: "oldest", label: "Oldest first" }, { id: "newest", label: "Newest first" }]} />}</header>
      <p className="muse-compass-quiet">Come back whenever it means something new. Earlier reflections stay exactly as written.</p>
      {reflecting ? <ReflectionComposer compass={compass} today={today} about={{ experienceId: e.id, experienceTitle: e.title }} images={{ upload }} onDone={() => setReflecting(false)} />
        : <button type="button" className="muse-button" onClick={() => setReflecting(true)}><MuseIcon name="notes" size={15} /> {reflections.length ? "Add a later reflection" : "Reflect on this"}</button>}
      <ReflectionList compass={compass} today={today} items={reflections} order={order} images={{ upload }} onSaveDiscovery={saveDiscovery} />
    </section>

    {dialog === "details" && <ExperienceDetails e={e} stories={stories} compass={compass} today={today} returnFocus={opener} onClose={() => setDialog(null)} />}
    {dialog === "cover" && <CoverPicker cover={e.cover} boards={boards} title={e.title} returnFocus={opener} onClose={() => setDialog(null)} upload={upload} onSave={(cover) => stories.saveExperience({ ...e, cover })} />}
    {dialog === "delete" && <MuseModal id="muse-delete-experience" label="Delete experience" title="Delete this experience?" returnFocus={opener} onClose={() => setDialog(null)}>
      <div className="muse-compass-editor"><p>“{e.title}” and its modules and photos will be deleted, and it will leave {chapters.length + collections.length ? "the chapters and collections it belongs to" : "My Experiences"}. Those chapters and collections stay. Reflections keep their words.</p>
        <div className="muse-compass-form-actions"><button type="button" className="muse-button" onClick={() => setDialog(null)}>Keep it</button><button type="button" className="muse-button muse-compass-danger" onClick={async () => { if (await stories.removeExperience(e)) onBack(); }}>Delete experience</button></div></div>
    </MuseModal>}
    {saving !== null && <SaveAsDiscovery text={saving} origin={{ kind: "experience", id: e.id, label: e.title }} compass={compass} returnFocus={opener} onClose={() => setSaving(null)} />}
  </article>;
}

/** The Experience's photos: a gallery to look at (open any photo large, captions beneath); Manage photos adds, removes and
 *  captions them. Caption typing saves a moment after it stops, not on every key. */
function ExperiencePhotos({ e, stories, upload }: { e: Experience; stories: Stories; upload: (f: File) => Promise<import("@/lib/constellation-board").BoardImage | null> }) {
  const [managing, setManaging] = useState(false), [draft, setDraft] = useState(e.photos);
  const changed = JSON.stringify(draft) !== JSON.stringify(e.photos);
  useEffect(() => { if (!managing || !changed) return; const t = window.setTimeout(() => void stories.saveExperience({ ...e, photos: draft }), 700); return () => window.clearTimeout(t); }, [managing, changed, draft, e, stories]);
  return <section className="muse-stories-photos" aria-labelledby="exp-photos-title">
    <header className="muse-stories-photos-head"><h3 id="exp-photos-title" className="muse-compass-subhead">Photos</h3>
      <button type="button" className="text-button" aria-expanded={managing} onClick={() => { if (managing && changed) void stories.saveExperience({ ...e, photos: draft }); else setDraft(e.photos); setManaging(!managing); }}>{managing ? "Done" : "Manage photos"}</button></header>
    {managing ? <ImagesInput images={draft} max={24} upload={upload} label="Add photos" captions onChange={setDraft} />
      : <div className="muse-stories-photo-strip">{e.photos.map((p) => <PhotoFigure key={p.id} image={p} className="muse-stories-photo-tile" />)}</div>}
  </section>;
}

/** The first photos: a quiet button in the header until there are some, then a gallery of its own. */
function AddPhotos({ upload, onAdd }: { upload: (f: File) => Promise<import("@/lib/constellation-board").BoardImage | null>; onAdd: (p: import("@/lib/constellation-board").BoardImage[]) => void }) {
  const [busy, setBusy] = useState(false);
  return <label className="muse-button" aria-busy={busy || undefined}><MuseIcon name="plus" size={15} /> {busy ? "Adding…" : "Photos"}
    <input type="file" multiple className="sr-only" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy} onChange={async (ev) => { const files = Array.from(ev.target.files ?? []).slice(0, 24); ev.target.value = ""; if (!files.length) return; setBusy(true); const out = []; for (const f of files) { const i = await upload(f); if (i) out.push(i); } setBusy(false); if (out.length) onAdd(out); }} /></label>;
}

function ExperienceDetails({ e, stories, compass, today, returnFocus, onClose }: { e: Experience; stories: Stories; compass: Compass; today: string; returnFocus: HTMLElement | null; onClose: () => void }) {
  const [d, setD] = useState(e), [areas, setAreas] = useState(stories.areasOf({ experienceId: e.id })), [tagDraft, setTagDraft] = useState("");
  const chaptersBefore = stories.chapterExperiences.filter((j) => j.b === e.id).map((j) => j.a), collectionsBefore = stories.collectionExperiences.filter((j) => j.b === e.id).map((j) => j.a);
  const [chapters, setChapters] = useState(chaptersBefore), [collections, setCollections] = useState(collectionsBefore);
  const known = knownTags(stories.experiences).map((t) => t.tag), suggestions = known.filter((t) => !d.tags.some((x) => x.toLowerCase() === t.toLowerCase()) && (!tagDraft || t.toLowerCase().includes(tagDraft.toLowerCase()))).slice(0, 10);
  const addTag = (t: string) => { if (t.trim()) setD({ ...d, tags: cleanTags([...d.tags, canonicalTag(t, known)]) }); setTagDraft(""); };
  const { state } = usePlanner();
  const events = useMemo(() => projectEvents(state.events, state.eventExceptions, addDays(today, -180), addDays(today, 60)).filter((x) => x.status !== "canceled").sort((a, b) => (b.occurrenceDate ?? b.date).localeCompare(a.occurrenceDate ?? a.date)).slice(0, 300), [state.events, state.eventExceptions, today]);
  async function save() {
    if (!d.title.trim()) return;
    const s = await stories.saveExperience(d); if (!s) return;
    await stories.setAreasFor({ experienceId: e.id }, areas);
    for (const c of chapters.filter((x) => !chaptersBefore.includes(x))) await stories.linkChapter(c, e.id);
    for (const c of chaptersBefore.filter((x) => !chapters.includes(x))) await stories.unlinkChapter(c, e.id);
    for (const c of collections.filter((x) => !collectionsBefore.includes(x))) await stories.linkCollection(c, e.id);
    for (const c of collectionsBefore.filter((x) => !collections.includes(x))) await stories.unlinkCollection(c, e.id);
    onClose();
  }
  const toggle = (list: string[], id: string) => list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  return <MuseModal id="muse-experience-details" label="Experience details" title="Experience details" returnFocus={returnFocus} onClose={onClose} size="tall">
    <form className="muse-compass-editor" onSubmit={(ev) => { ev.preventDefault(); void save(); }}>
      <div className="muse-compass-fields">
        <label className="muse-compass-statement"><span>Title</span><input required maxLength={200} value={d.title} onChange={(x) => setD({ ...d, title: x.target.value })} /></label>
        <div className="muse-compass-row2"><label><span>Date <small className="small-label">· optional</small></span><input type="date" value={d.happenedOn ?? ""} onChange={(x) => setD({ ...d, happenedOn: x.target.value || null })} /></label>
          <label><span>Theme <small className="small-label">· optional</small></span><input maxLength={80} value={d.theme} onChange={(x) => setD({ ...d, theme: x.target.value })} placeholder="Prosperity" /></label></div>
        <label><span>What happened, or what it meant <small className="small-label">· optional</small></span><textarea rows={4} maxLength={8000} value={d.description} onChange={(x) => setD({ ...d, description: x.target.value })} /></label>
        <div className="muse-compass-row2"><label><span>Where <small className="small-label">· optional</small></span><input maxLength={200} value={d.location} onChange={(x) => setD({ ...d, location: x.target.value })} /></label>
          <label><span>With <small className="small-label">· optional</small></span><input maxLength={500} value={d.people} onChange={(x) => setD({ ...d, people: x.target.value })} /></label></div>
        <div className="muse-compass-tags-field"><span>Tags <small className="small-label">· optional</small></span>
          <div className="muse-compass-tags-box">{d.tags.map((t) => <span key={t} className="muse-compass-tag" data-removable>#{t}<button type="button" aria-label={`Remove tag ${t}`} onClick={() => setD({ ...d, tags: d.tags.filter((x) => x !== t) })}>×</button></span>)}
            <input aria-label="Add a tag" maxLength={40} value={tagDraft} placeholder={d.tags.length ? "" : "hiking, first time, friends…"} onChange={(x) => setTagDraft(x.target.value)} onBlur={() => addTag(tagDraft)} onKeyDown={(x) => { if (x.key === "Enter" || x.key === ",") { x.preventDefault(); addTag(tagDraft); } }} /></div>
          {suggestions.length > 0 && <div className="muse-chip-row" aria-label="Tags you’ve used" data-scroll>{suggestions.map((t) => <button key={t} type="button" onClick={() => addTag(t)}>#{t}</button>)}</div>}</div>
        <div className="muse-stories-field"><span>From your Agenda <small className="small-label">· optional</small></span>
          {d.event ? <p className="muse-stories-planner">{d.event.title} · {shortDate(d.event.date)}<button type="button" className="muse-compass-x" aria-label="Remove the Agenda link" onClick={() => setD({ ...d, event: null })}>×</button></p>
            : events.length ? <MuseChoiceMenu label="Link an Agenda event" valueLabel="Link an event…" variant="chip" icon="calendar" searchable selectedIds={[]} options={events.map((x) => ({ id: `${x.seriesId ?? x.id}|${x.occurrenceDate ?? x.date}`, label: `${shortDate(x.occurrenceDate ?? x.date)} · ${x.title}` }))}
              onSelect={(id) => { const [sid, date] = id.split("|"), ev = events.find((x) => (x.seriesId ?? x.id) === sid && (x.occurrenceDate ?? x.date) === date); if (ev) setD({ ...d, event: { id: sid, date, title: ev.title } as EventRef, happenedOn: d.happenedOn ?? date }); }} />
            : <p className="muse-compass-quiet">No Agenda events nearby. A recurring gathering’s occurrences appear here; nothing is created for future dates.</p>}</div>
        {stories.chapters.length > 0 && <fieldset className="muse-compass-areas"><legend>Chapters <small className="small-label">· optional</small></legend><div className="muse-chip-row" data-scroll>{stories.chapters.filter((c) => !c.archivedAt || chapters.includes(c.id)).map((c) => <button key={c.id} type="button" aria-pressed={chapters.includes(c.id)} onClick={() => setChapters(toggle(chapters, c.id))}>{c.title}</button>)}</div></fieldset>}
        {stories.collections.length > 0 && <fieldset className="muse-compass-areas"><legend>Collections <small className="small-label">· optional</small></legend><div className="muse-chip-row" data-scroll>{stories.collections.map((c) => <button key={c.id} type="button" aria-pressed={collections.includes(c.id)} onClick={() => setCollections(toggle(collections, c.id))}>{c.name}</button>)}</div></fieldset>}
        <AreasField compass={compass} value={areas} onChange={setAreas} />
      </div>
      <div className="muse-compass-form-actions"><button type="button" className="muse-button" onClick={onClose}>Cancel</button><button type="submit" className="muse-button button-primary" disabled={!d.title.trim() || stories.status.saving}>Save</button></div>
    </form>
  </MuseModal>;
}
