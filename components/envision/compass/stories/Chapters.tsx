"use client";
import { useMemo, useState } from "react";
import { MuseModal } from "@/components/MuseModal";
import { MuseChoiceMenu } from "@/components/MuseChoiceMenu";
import { MuseIcon } from "@/components/MuseIcon";
import { MuseSearch } from "@/components/design/MuseSearch";
import { MuseSegmented } from "@/components/design/MuseSegmented";
import { blankChapter, chapterStatus, matchesText, rangeLabel, sortChapters, statusLabels, type Chapter, type ChapterStatus } from "@/lib/inner-compass/stories";
import type { VisionBoard } from "@/lib/vision-boards/model";
import type { Stories } from "./useStories";
import { CoverArt } from "./Cover";
import { BucketPhoto } from "../../bucket/BucketViews";
import { plural } from "../parts";

const filters: (ChapterStatus | "all")[] = ["all", "current", "upcoming", "completed", "undated", "archived"];

/** My Chapters: the seasons of a life, as volumes on a shelf and spans on a timeline. Nothing here is measured. */
export function Chapters({ stories, boards, today, onOpen }: { stories: Stories; boards: VisionBoard[]; today: string; onOpen: (id: string) => void }) {
  const [query, setQuery] = useState(""), [filter, setFilter] = useState<ChapterStatus | "all">("all"), [sort, setSort] = useState<"recent" | "oldest" | "alpha">("recent");
  const [creating, setCreating] = useState<"name" | "word" | null>(null), [opener, setOpener] = useState<HTMLElement | null>(null);
  const withStatus = useMemo(() => stories.chapters.map((c) => ({ c, s: chapterStatus(c, today) })), [stories.chapters, today]);
  const current = withStatus.filter((x) => x.s === "current").map((x) => x.c);
  const featured = current.find((c) => c.isPrimary) ?? stories.chapters.find((c) => c.isPrimary && !c.archivedAt) ?? current[0];
  const shelf = sortChapters(withStatus.filter((x) => (filter === "all" ? x.s !== "archived" : x.s === filter) && (!query.trim() || matchesText(query, x.c.title, x.c.subtitle, x.c.word, x.c.meaning))).map((x) => x.c), sort);
  const begin = (how: "name" | "word") => { setOpener(document.activeElement as HTMLElement | null); setCreating(how); };

  return <div className="muse-stories-chapters">
    {featured ? <FeaturedChapter c={featured} stories={stories} boards={boards} today={today} onOpen={onOpen} onNew={() => begin("name")} />
      : <section className="muse-stories-welcome" aria-labelledby="chapters-welcome-title">
        <div className="muse-stories-welcome-copy">
          <p className="muse-kicker">My Chapters</p><h2 id="chapters-welcome-title">The seasons you’re living</h2>
          <p>A Chapter is a meaningful period of life with a name, an atmosphere and the moments that belong to it. Begin it at the start of a season, or name one you’ve already lived.</p>
          <BeginChapter stories={stories} onOpen={onOpen} onMore={begin} />
        </div>
        <VolumesArt />
      </section>}

    {stories.chapters.length > 0 && <Timeline chapters={stories.chapters.filter((c) => !c.archivedAt)} today={today} onOpen={onOpen} />}

    {stories.chapters.length > 0 && <section className="muse-stories-shelf" aria-labelledby="chapters-shelf-title">
      <header className="muse-stories-shelf-head">
        <h3 id="chapters-shelf-title" className="muse-compass-subhead">Every chapter</h3>
        <div className="muse-compass-hero-actions"><button type="button" className="muse-button" onClick={() => begin("word")}>Start with a word</button><button type="button" className="muse-button button-primary" onClick={() => begin("name")}><MuseIcon name="plus" size={15} /> New chapter</button></div>
      </header>
      <div className="muse-compass-toolbar">
        <MuseSearch label="Search chapters" value={query} onChange={setQuery} placeholder="Search names, words, meanings" />
        <MuseChoiceMenu label="Sort chapters" variant="chip" valueLabel={sort === "recent" ? "Most recent" : sort === "oldest" ? "Oldest first" : "A–Z"} selectedIds={[sort]} options={[{ id: "recent", label: "Most recent" }, { id: "oldest", label: "Oldest first" }, { id: "alpha", label: "A–Z" }]} onSelect={(id) => setSort(id as typeof sort)} />
      </div>
      <div className="muse-chip-row" role="group" aria-label="Show" data-scroll>{filters.map((f) => { const n = f === "all" ? withStatus.filter((x) => x.s !== "archived").length : withStatus.filter((x) => x.s === f).length;
        return (f === "all" || n > 0 || filter === f) ? <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === "all" ? "All" : statusLabels[f]} <small className="type-numeric">{n}</small></button> : null; })}</div>
      {shelf.length ? <ul className="muse-stories-volumes">{shelf.map((c) => { const s = chapterStatus(c, today); return <li key={c.id}>
        <button type="button" className="muse-stories-volume" onClick={() => onOpen(c.id)} aria-label={`${c.title}, ${statusLabels[s]}`}>
          <CoverArt cover={c.cover} boards={boards} size="sm">
            <span className="muse-stories-volume-status" data-status={s}>{c.isPrimary ? "Primary · " : ""}{statusLabels[s]}</span>
            <span className="muse-stories-volume-title">{c.title}</span>
            {c.word && c.word !== c.title && <span className="muse-stories-volume-word">{c.word}</span>}
          </CoverArt>
          <span className="muse-stories-volume-meta type-numeric">{rangeLabel(c.startsOn, c.endsOn)}</span>
        </button>
      </li>; })}</ul> : <p className="muse-compass-empty-quiet">No chapters match.</p>}
    </section>}

    {creating && <NewChapter how={creating} stories={stories} returnFocus={opener} onClose={() => setCreating(null)} onCreated={(id) => { setCreating(null); onOpen(id); }} />}
  </div>;
}

function FeaturedChapter({ c, stories, boards, today, onOpen, onNew }: { c: Chapter; stories: Stories; boards: VisionBoard[]; today: string; onOpen: (id: string) => void; onNew: () => void }) {
  const exps = stories.chapterExperiences.filter((j) => j.a === c.id).map((j) => stories.experiences.find((e) => e.id === j.b)).filter((e): e is NonNullable<typeof e> => !!e);
  const mods = stories.modulesOf("chapter", c.id);
  const mantra = mods.flatMap((m) => m.type === "mantras" ? m.content.items ?? [] : []).find((i) => typeof i.text === "string" && i.text.trim());
  const status = chapterStatus(c, today);
  return <section className="muse-stories-current" aria-labelledby="current-chapter-title">
    <CoverArt cover={c.cover} boards={boards} size="lg" className="muse-stories-current-cover">
      <p className="muse-stories-current-kicker">{status === "current" ? (c.isPrimary ? "My current chapter" : "A current chapter") : statusLabels[status]}</p>
      <h2 id="current-chapter-title" className="muse-stories-current-title">{c.title}</h2>
      {c.subtitle && <p className="muse-stories-current-subtitle">{c.subtitle}</p>}
      {c.word && c.word !== c.title && <p className="muse-stories-word" aria-label={`Guiding word: ${c.word}`}>{c.word}</p>}
      <p className="muse-stories-current-range type-numeric">{rangeLabel(c.startsOn, c.endsOn)}</p>
    </CoverArt>
    <div className="muse-stories-current-body">
      {c.meaning ? <p className="muse-stories-current-meaning">{c.meaning}</p> : <p className="muse-compass-quiet">A season, named. Add what belongs to it whenever you like.</p>}
      {mantra && <blockquote className="muse-stories-current-mantra"><q>{mantra.text as string}</q></blockquote>}
      {exps.length > 0 && <div className="muse-stories-current-exps" aria-label={`${plural(exps.length, "experience")} in this chapter`}>
        {exps.slice(0, 4).map((e) => <span key={e.id} className="muse-stories-current-exp">{e.photos[0] ? <BucketPhoto image={e.photos[0]} className="muse-stories-current-exp-photo" /> : <CoverArt cover={e.cover} size="sm" />}<small>{e.title}</small></span>)}
        {exps.length > 4 && <span className="muse-compass-quiet">+{exps.length - 4} more</span>}
      </div>}
      <p className="muse-compass-quiet type-numeric">{[exps.length ? plural(exps.length, "experience") : "", mods.length ? plural(mods.length, "piece") : ""].filter(Boolean).join(" · ") || "Just begun"}</p>
      <div className="muse-compass-hero-actions"><button type="button" className="muse-button button-primary" onClick={() => onOpen(c.id)}>Open this chapter</button><button type="button" className="muse-button" onClick={onNew}><MuseIcon name="plus" size={15} /> New chapter</button></div>
    </div>
  </section>;
}

/** The first page of the memoir: a name or a single word, then Begin. Dates and a subtitle are one tap away. */
function BeginChapter({ stories, onOpen, onMore }: { stories: Stories; onOpen: (id: string) => void; onMore: (how: "name" | "word") => void }) {
  const [how, setHow] = useState<"name" | "word">("name"), [text, setText] = useState("");
  async function begin() {
    const t = text.trim(); if (!t) return;
    const c = await stories.saveChapter({ ...blankChapter(), title: t, word: how === "word" ? t : "" });
    if (c) onOpen(c.id);
  }
  return <form className="muse-stories-begin-form" onSubmit={(e) => { e.preventDefault(); void begin(); }}>
    <MuseSegmented label="Begin with" value={how} onChange={setHow} options={[{ id: "name", label: "A name" }, { id: "word", label: "A guiding word" }]} />
    <div className="muse-stories-begin-row">
      <label className="sr-only" htmlFor="chapters-begin">{how === "name" ? "Chapter name" : "Guiding word"}</label>
      <input id="chapters-begin" maxLength={how === "word" ? 60 : 160} value={text} onChange={(e) => setText(e.target.value)} placeholder={how === "name" ? "The Summer of Saying Yes" : "Courage"} data-how={how} />
      <button type="submit" className="muse-button button-primary" disabled={!text.trim() || stories.status.saving}><MuseIcon name="sparkle" size={15} /> Begin</button>
    </div>
    <p className="muse-compass-quiet">{how === "word" ? "One word can be the whole beginning; it stands as the name until you choose another." : "Title the season. Everything else can come later."} <button type="button" className="text-button" onClick={() => onMore(how)}>Add dates and a subtitle</button></p>
  </form>;
}

/** Three unwritten volumes, fanned like the start of a memoir. Decorative: the real covers are on the shelf. */
function VolumesArt() {
  const vols: { preset: "nocturne" | "aurora" | "dawn"; numeral: string }[] = [{ preset: "dawn", numeral: "I" }, { preset: "aurora", numeral: "II" }, { preset: "nocturne", numeral: "III" }];
  return <div className="muse-stories-volumes-art" aria-hidden="true">
    <svg className="muse-stories-volumes-orbit" viewBox="0 0 300 220"><path d="M20 170 C 90 40, 210 40, 280 150" /><circle cx="20" cy="170" r="2.2" /><circle cx="150" cy="72" r="1.6" /><circle cx="280" cy="150" r="2.4" /></svg>
    {vols.map((v, i) => <div key={v.preset} className="muse-stories-volume-art" data-i={i}>
      <CoverArt cover={{ preset: v.preset }} size="sm"><span className="muse-stories-volume-numeral">Chapter {v.numeral}</span>{i === 2 && <span className="muse-stories-volume-title">Yet to be written</span>}</CoverArt>
    </div>)}
  </div>;
}

/**
 * The life narrative: dated Chapters as spans across the years, stacked into lanes so overlapping seasons sit one
 * above the other. Undated Chapters live on the shelf only. Decorative layout over real dates, never a measure.
 */
function Timeline({ chapters, today, onOpen }: { chapters: Chapter[]; today: string; onOpen: (id: string) => void }) {
  const dated = chapters.filter((c) => c.startsOn || c.endsOn).map((c) => ({ c, start: c.startsOn ?? c.endsOn!, end: c.endsOn ?? (c.closedAt ? c.closedAt.slice(0, 10) : today > (c.startsOn ?? today) ? today : c.startsOn!) }))
    .sort((a, b) => a.start.localeCompare(b.start));
  if (dated.length < 1) return null;
  const t = (d: string) => Date.parse(`${d}T12:00:00Z`);
  const min = Math.min(...dated.map((x) => t(x.start))), max = Math.max(...dated.map((x) => t(x.end)), t(today)), span = Math.max(max - min, 86400000 * 60);
  const lanes: string[] = [], placed = dated.map((x) => { let lane = lanes.findIndex((end) => end < x.start); if (lane < 0) { lane = lanes.length; lanes.push(x.end); } else lanes[lane] = x.end; return { ...x, lane }; });
  const years: number[] = []; for (let y = new Date(min).getUTCFullYear(); y <= new Date(max).getUTCFullYear(); y++) years.push(y);
  const pct = (d: string) => ((t(d) - min) / span) * 100;
  return <section className="muse-stories-timeline" aria-labelledby="chapters-timeline-title">
    <h3 id="chapters-timeline-title" className="muse-compass-subhead">A life in chapters</h3>
    <div className="muse-stories-timeline-track" style={{ height: `${Math.max(1, lanes.length) * 34 + 26}px` }}>
      {years.map((y) => { const p = ((Date.UTC(y, 0, 1) - min) / span) * 100; return p >= 0 && p <= 100 ? <span key={y} className="muse-stories-timeline-year" style={{ left: `${p}%` }}>{y}</span> : null; })}
      <span className="muse-stories-timeline-now" style={{ left: `${pct(today)}%` }} aria-hidden="true" title="Today" />
      {placed.map(({ c, start, end, lane }) => <button key={c.id} type="button" className="muse-stories-timeline-span" data-primary={c.isPrimary || undefined}
        style={{ ...(pct(start) > 72 ? { right: `${Math.max(0, 100 - pct(end))}%` } : { left: `${pct(start)}%` }), width: `max(120px, ${pct(end) - pct(start)}%)`, maxWidth: "100%", top: `${lane * 34 + 22}px`, ["--span-ink" as string]: c.cover.accent ?? `var(--chart-${(c.id.charCodeAt(0) % 8) + 1})` }}
        onClick={() => onOpen(c.id)} aria-label={`${c.title}, ${rangeLabel(c.startsOn, c.endsOn)}`}><span>{c.title}</span></button>)}
    </div>
  </section>;
}

/** Two equal ways in: a name, or a single word that stands as the name until another is chosen. */
export function NewChapter({ how: initial, stories, returnFocus, onClose, onCreated, seed }: { how: "name" | "word"; stories: Stories; returnFocus: HTMLElement | null; onClose: () => void; onCreated: (id: string) => void; seed?: Partial<Chapter> }) {
  const [how, setHow] = useState(initial), [text, setText] = useState(""), [more, setMore] = useState(false);
  const [subtitle, setSubtitle] = useState(""), [starts, setStarts] = useState(""), [ends, setEnds] = useState(""), [meaning, setMeaning] = useState("");
  async function create() {
    const t = text.trim(); if (!t) return;
    const c = await stories.saveChapter({ ...blankChapter(), ...seed, title: t, word: how === "word" ? t : seed?.word ?? "", subtitle, meaning, startsOn: starts || null, endsOn: ends || null });
    if (c) onCreated(c.id);
  }
  return <MuseModal id="muse-new-chapter" label="New chapter" title="Begin a chapter" returnFocus={returnFocus} onClose={onClose}>
    <form className="muse-compass-editor" onSubmit={(e) => { e.preventDefault(); void create(); }}>
      <MuseSegmented label="Start with" value={how} onChange={setHow} options={[{ id: "name", label: "A name" }, { id: "word", label: "A guiding word" }]} />
      <label className="muse-compass-statement"><span>{how === "name" ? "Chapter name" : "Guiding word"}</span>
        <input autoFocus required maxLength={how === "word" ? 60 : 160} value={text} onChange={(e) => setText(e.target.value)} placeholder={how === "name" ? "The Season of Becoming" : "Wonder"} /></label>
      {how === "word" && <p className="muse-compass-quiet">The word becomes the chapter’s name until you choose another.</p>}
      {!more ? <button type="button" className="text-button muse-compass-more" onClick={() => setMore(true)}><MuseIcon name="plus" size={14} /> Subtitle, dates, meaning</button> : <>
        <label><span>Subtitle <small className="small-label">· optional</small></span><input maxLength={200} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></label>
        <div className="muse-compass-row2"><label><span>Begins <small className="small-label">· optional</small></span><input type="date" value={starts} onChange={(e) => setStarts(e.target.value)} /></label>
          <label><span>Ends <small className="small-label">· leave open</small></span><input type="date" value={ends} min={starts || undefined} onChange={(e) => setEnds(e.target.value)} /></label></div>
        <label><span>What this chapter means to me <small className="small-label">· optional</small></span><textarea rows={3} maxLength={4000} value={meaning} onChange={(e) => setMeaning(e.target.value)} /></label>
      </>}
      <div className="muse-compass-form-actions"><button type="button" className="muse-button" onClick={onClose}>Cancel</button><button type="submit" className="muse-button button-primary" disabled={!text.trim() || stories.status.saving}>Begin chapter</button></div>
      <p className="muse-compass-quiet">A chapter can be undated, open-ended, or one you’re remembering from long ago.</p>
    </form>
  </MuseModal>;
}
