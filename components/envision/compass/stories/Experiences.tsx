"use client";
import { useMemo, useState } from "react";
import { MuseModal } from "@/components/MuseModal";
import { MuseChoiceMenu } from "@/components/MuseChoiceMenu";
import { MuseIcon } from "@/components/MuseIcon";
import { MuseSearch } from "@/components/design/MuseSearch";
import { blankCollection, blankExperience, knownTags, matchesText, sortExperiences, type Collection, type Experience } from "@/lib/inner-compass/stories";
import type { VisionBoard } from "@/lib/vision-boards/model";
import type { Compass } from "../useInnerCompass";
import type { Stories } from "./useStories";
import { CoverArt, CoverPicker } from "./Cover";
import { BucketPhoto } from "../../bucket/BucketViews";
import { shortDate } from "./shared";
import { plural } from "../parts";

type Sort = "recent" | "oldest" | "alpha" | "added";
const sorts: { id: Sort; label: string }[] = [{ id: "recent", label: "Most recent" }, { id: "oldest", label: "Oldest first" }, { id: "added", label: "Recently added" }, { id: "alpha", label: "A–Z" }];

/** A keepsake card: a photo or atmosphere, the date, the title. Beautiful with nothing but a title. */
export function ExperienceTile({ e, boards = [], onOpen, extra }: { e: Experience; boards?: VisionBoard[]; onOpen: () => void; extra?: React.ReactNode }) {
  const photo = e.cover.image ?? e.photos[0];
  return <button type="button" className="muse-stories-tile" onClick={onOpen} data-archived={e.archivedAt ? true : undefined}>
    <span className="muse-stories-tile-art">{photo ? <BucketPhoto image={photo} className="muse-stories-tile-photo" /> : <CoverArt cover={e.cover} boards={boards} size="sm" />}
      {e.happenedOn && <span className="muse-stories-tile-date type-numeric">{shortDate(e.happenedOn)}</span>}</span>
    <span className="muse-stories-tile-body">
      <span className="muse-stories-tile-title">{e.title}</span>
      {(e.location || e.theme) && <span className="muse-stories-tile-line">{[e.theme, e.location].filter(Boolean).join(" · ")}</span>}
      {e.tags.length > 0 && <span className="muse-stories-tile-tags">{e.tags.slice(0, 3).map((t) => <span key={t} className="muse-compass-tag">#{t}</span>)}</span>}
      {extra}
    </span>
  </button>;
}

export function Experiences({ stories, compass, boards, today, collectionId, initialArea = null, onOpen, onCollection }: {
  stories: Stories; compass: Compass; boards: VisionBoard[]; today: string; collectionId: string | null; initialArea?: string | null; onOpen: (id: string) => void; onCollection: (id: string | null) => void;
}) {
  const [query, setQuery] = useState(""), [tag, setTag] = useState<string | null>(null), [chapter, setChapter] = useState<string | null>(null), [area, setArea] = useState<string | null>(initialArea);
  const [sort, setSort] = useState<Sort>("recent"), [archived, setArchived] = useState(false), [title, setTitle] = useState(""), [date, setDate] = useState(today), [added, setAdded] = useState<Experience | null>(null);
  const [newCollection, setNewCollection] = useState(false), [opener, setOpener] = useState<HTMLElement | null>(null);
  const collection = collectionId ? stories.collections.find((c) => c.id === collectionId) : undefined;
  const tags = useMemo(() => knownTags(stories.experiences), [stories.experiences]);
  const inCollection = (id: string) => stories.collectionExperiences.filter((j) => j.b === id).map((j) => j.a);
  const list = useMemo(() => {
    let l = stories.experiences.filter((e) => archived ? !!e.archivedAt : !e.archivedAt);
    if (collection) l = l.filter((e) => inCollection(e.id).includes(collection.id));
    if (tag) l = l.filter((e) => e.tags.some((t) => t.toLowerCase() === tag.toLowerCase()));
    if (chapter) l = l.filter((e) => stories.chapterExperiences.some((j) => j.a === chapter && j.b === e.id));
    if (area) l = l.filter((e) => stories.areasOf({ experienceId: e.id }).includes(area));
    if (query.trim()) l = l.filter((e) => matchesText(query, e.title, e.description, e.location, e.people, e.theme, ...e.tags));
    if (collection?.sort === "manual") { const pos = new Map(stories.collectionExperiences.filter((j) => j.a === collection.id).map((j) => [j.b, j.position])); return [...l].sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0)); }
    return sortExperiences(l, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stories.experiences, stories.collectionExperiences, stories.chapterExperiences, stories.areas, collection, tag, chapter, area, query, sort, archived]);
  const filterCount = [tag, chapter, area].filter(Boolean).length;
  async function quickAdd() {
    const t = title.trim(); if (!t) return;
    const e = await stories.createExperience({ ...blankExperience(), title: t, happenedOn: date || null }, collection ? { collectionId: collection.id } : {});
    if (e) { setAdded(e); setTitle(""); }
  }

  return <div className="muse-stories-experiences">
    {collection ? <CollectionHeader c={collection} stories={stories} boards={boards} count={list.length} onBack={() => onCollection(null)} />
      : <section className="muse-stories-exp-hero">
        <div><p className="muse-kicker">My Experiences</p><h2>The moments that shape my story</h2>
          <p>A conversation, a workshop, a gathering, a first time, an ordinary afternoon worth keeping. Each is one record, wherever it appears.</p></div>
      </section>}

    <form className="muse-stories-capture" onSubmit={(e) => { e.preventDefault(); void quickAdd(); }}>
      <label className="sr-only" htmlFor="exp-capture">What happened?</label>
      <input id="exp-capture" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={collection ? `Add to ${collection.name}…` : "What happened? A title is enough."} />
      <label className="sr-only" htmlFor="exp-capture-date">When</label><input id="exp-capture-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <button type="submit" className="muse-button button-primary" disabled={!title.trim() || stories.status.saving}><MuseIcon name="sparkle" size={15} /> Keep it</button>
      {added && <p className="muse-compass-quiet" role="status">Kept “{added.title}”. <button type="button" className="text-button" onClick={() => onOpen(added.id)}>Add photos, words and more</button></p>}
    </form>

    {!collection && <section className="muse-stories-collections" aria-labelledby="exp-collections-title">
      <header><h3 id="exp-collections-title" className="muse-compass-subhead">Collections</h3><button type="button" className="muse-button" onClick={() => { setOpener(document.activeElement as HTMLElement | null); setNewCollection(true); }}><MuseIcon name="plus" size={14} /> New collection</button></header>
      {stories.collections.length ? <ul>{stories.collections.map((c) => { const n = stories.collectionExperiences.filter((j) => j.a === c.id).length; return <li key={c.id}>
        <button type="button" className="muse-stories-collection" onClick={() => onCollection(c.id)}><CoverArt cover={c.cover} boards={boards} size="sm"><span className="muse-stories-collection-name">{c.name}</span></CoverArt><small className="type-numeric">{plural(n, "experience")}</small></button>
      </li>; })}</ul> : <p className="muse-compass-quiet">Group experiences around an interest: Coven Chronicles, Creative Adventures, Meaningful Conversations, My Year of Firsts. A collection is not a chapter; it can run across many.</p>}
    </section>}

    <div className="muse-compass-toolbar">
      <MuseSearch label="Search experiences" value={query} onChange={setQuery} placeholder="Search titles, places, people, tags" count={query ? list.length : undefined} noun={["experience", "experiences"]} />
      <MuseChoiceMenu label="Filter experiences" variant="chip" icon="filter" multiple valueLabel={filterCount ? `Filter · ${filterCount}` : "Filter"} onClear={filterCount ? () => { setTag(null); setChapter(null); setArea(null); } : undefined}
        selectedIds={[...(tag ? [`t:${tag}`] : []), ...(chapter ? [`c:${chapter}`] : []), ...(area ? [`a:${area}`] : [])]}
        options={[...tags.map((t) => ({ id: `t:${t.tag}`, label: `#${t.tag} · ${t.count}` })), ...stories.chapters.filter((c) => !c.archivedAt).map((c) => ({ id: `c:${c.id}`, label: `Chapter · ${c.title}` })), ...compass.areas.map((a) => ({ id: `a:${a.id}`, label: `Life Atlas · ${a.label}` }))]}
        onSelect={(id) => { const [k, v] = [id.slice(0, 1), id.slice(2)]; if (k === "t") setTag((x) => x === v ? null : v); else if (k === "c") setChapter((x) => x === v ? null : v); else setArea((x) => x === v ? null : v); }} />
      {collection?.sort !== "manual" && <MuseChoiceMenu label="Sort" variant="chip" valueLabel={sorts.find((s) => s.id === sort)!.label} selectedIds={[sort]} options={sorts} onSelect={(id) => setSort(id as Sort)} />}
      {(stories.experiences.some((e) => e.archivedAt) || archived) && <button type="button" className="muse-button" aria-pressed={archived} onClick={() => setArchived((a) => !a)}><MuseIcon name="archive" size={14} /> {archived ? "Back to current" : "Archived"}</button>}
    </div>

    {list.length ? <ul className="muse-stories-exp-tiles">{list.map((e, i) => <li key={e.id}><ExperienceTile e={e} boards={boards} onOpen={() => onOpen(e.id)} />
      {collection?.sort === "manual" && <span className="muse-stories-order"><button type="button" aria-label={`Move ${e.title} earlier`} disabled={i === 0} onClick={() => { const ids = list.map((x) => x.id); [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; void stories.orderCollection(collection.id, ids); }}>↑</button>
        <button type="button" aria-label={`Move ${e.title} later`} disabled={i === list.length - 1} onClick={() => { const ids = list.map((x) => x.id); [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]]; void stories.orderCollection(collection.id, ids); }}>↓</button></span>}
    </li>)}</ul>
      : <div className="muse-compass-empty">
        <svg viewBox="0 0 120 80" aria-hidden="true" className="muse-compass-empty-art"><rect x="30" y="14" width="44" height="52" rx="4" /><rect x="46" y="20" width="44" height="52" rx="4" /><path d="M68 34C69 43 70 44 79 45C70 46 69 47 68 56C67 47 66 46 57 45C66 44 67 43 68 34Z" /></svg>
        <h3>{query || filterCount ? "Nothing matches" : collection ? "An empty collection, ready" : "Your first experience can be a single line"}</h3>
        <p>{query || filterCount ? "Try another word, or clear the filters." : "Type above and press Keep it. Add photos, words, materials or a reflection whenever you like."}</p>
      </div>}

    {collection && <AddExisting collection={collection} stories={stories} />}
    {newCollection && <NewCollection stories={stories} returnFocus={opener} onClose={() => setNewCollection(false)} onCreated={(id) => { setNewCollection(false); onCollection(id); }} />}
  </div>;
}

function CollectionHeader({ c, stories, boards, count, onBack }: { c: Collection; stories: Stories; boards: VisionBoard[]; count: number; onBack: () => void }) {
  const [edit, setEdit] = useState<"details" | "cover" | "delete" | null>(null), [opener, setOpener] = useState<HTMLElement | null>(null), [d, setD] = useState(c);
  const open = (x: typeof edit) => { setOpener(document.activeElement as HTMLElement | null); setD(c); setEdit(x); };
  return <section className="muse-stories-collection-head">
    <button type="button" className="muse-stories-back" onClick={onBack}><svg viewBox="0 0 8 12" width="7" height="10" aria-hidden="true"><path d="m6.5 1-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg> All experiences</button>
    <CoverArt cover={c.cover} boards={boards} size="md" className="muse-stories-collection-cover"><p className="muse-stories-current-kicker">Collection · {plural(count, "experience")}</p><h2 className="muse-stories-current-title">{c.name}</h2>{c.description && <p className="muse-stories-current-subtitle">{c.description}</p>}</CoverArt>
    <div className="muse-compass-hero-actions">
      <button type="button" className="muse-button" onClick={() => open("details")}><MuseIcon name="edit" size={14} /> Details</button>
      <button type="button" className="muse-button" onClick={() => open("cover")}><MuseIcon name="appearance" size={14} /> Cover</button>
      <button type="button" className="text-button muse-compass-danger-text" onClick={() => open("delete")}><MuseIcon name="trash" size={13} /> Delete collection…</button>
    </div>
    {edit === "cover" && <CoverPicker cover={c.cover} boards={boards} title={c.name} returnFocus={opener} onClose={() => setEdit(null)} upload={(f) => stories.upload(c.id, f)} onSave={(cover) => stories.saveCollection({ ...c, cover })} />}
    {edit === "details" && <MuseModal id="muse-collection-details" label="Collection details" title="Collection" returnFocus={opener} onClose={() => setEdit(null)}>
      <form className="muse-compass-editor" onSubmit={async (e) => { e.preventDefault(); if (d.name.trim() && await stories.saveCollection(d)) setEdit(null); }}>
        <label className="muse-compass-statement"><span>Name</span><input required maxLength={120} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></label>
        <label><span>Description <small className="small-label">· optional</small></span><textarea rows={3} maxLength={2000} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} /></label>
        <fieldset className="muse-compass-choices"><legend>Order</legend><div className="muse-chip-row"><button type="button" aria-pressed={d.sort === "chronological"} onClick={() => setD({ ...d, sort: "chronological" })}>By date</button><button type="button" aria-pressed={d.sort === "manual"} onClick={() => setD({ ...d, sort: "manual" })}>My own order</button></div></fieldset>
        <div className="muse-compass-form-actions"><button type="button" className="muse-button" onClick={() => setEdit(null)}>Cancel</button><button type="submit" className="muse-button button-primary">Save</button></div>
      </form></MuseModal>}
    {edit === "delete" && <MuseModal id="muse-collection-delete" label="Delete collection" title="Delete this collection?" returnFocus={opener} onClose={() => setEdit(null)}>
      <div className="muse-compass-editor"><p>“{c.name}” will be removed. Its {plural(count, "experience")} stay in My Experiences, untouched.</p>
        <div className="muse-compass-form-actions"><button type="button" className="muse-button" onClick={() => setEdit(null)}>Keep it</button><button type="button" className="muse-button muse-compass-danger" onClick={async () => { if (await stories.removeCollection(c.id)) onBack(); }}>Delete collection</button></div></div></MuseModal>}
  </section>;
}

function AddExisting({ collection, stories }: { collection: Collection; stories: Stories }) {
  const members = new Set(stories.collectionExperiences.filter((j) => j.a === collection.id).map((j) => j.b));
  const options = stories.experiences.filter((e) => !members.has(e.id) && !e.archivedAt);
  return options.length ? <div className="muse-stories-add-existing"><MuseChoiceMenu label={`Add to ${collection.name}`} valueLabel="＋ Add an existing experience" variant="chip" icon="link" searchable selectedIds={[]}
    options={options.map((e) => ({ id: e.id, label: e.happenedOn ? `${e.title} · ${e.happenedOn}` : e.title }))} onSelect={(id) => void stories.linkCollection(collection.id, id)} /></div> : null;
}

function NewCollection({ stories, returnFocus, onClose, onCreated }: { stories: Stories; returnFocus: HTMLElement | null; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState(""), [description, setDescription] = useState("");
  return <MuseModal id="muse-new-collection" label="New collection" title="New collection" returnFocus={returnFocus} onClose={onClose}>
    <form className="muse-compass-editor" onSubmit={async (e) => { e.preventDefault(); if (!name.trim()) return; const c = await stories.saveCollection({ ...blankCollection(), name: name.trim(), description }); if (c) onCreated(c.id); }}>
      <label className="muse-compass-statement"><span>Name</span><input required autoFocus maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Creative Adventures" /></label>
      <label><span>Description <small className="small-label">· optional</small></span><textarea rows={2} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <p className="muse-compass-quiet">A collection groups experiences around an interest or a gathering. It has no dates and never closes.</p>
      <div className="muse-compass-form-actions"><button type="button" className="muse-button" onClick={onClose}>Cancel</button><button type="submit" className="muse-button button-primary" disabled={!name.trim()}>Create</button></div>
    </form>
  </MuseModal>;
}
