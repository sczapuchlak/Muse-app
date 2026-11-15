"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MuseIcon } from "@/components/MuseIcon";
import { MuseSegmented } from "@/components/design/MuseSegmented";
import { EntryCarousel } from "@/components/design/EntryCarousel";
import { SaveIndicator } from "@/components/SaveIndicator";
import { categories, categoryInfo, isCategory, type Category } from "@/lib/inner-compass/categories";
import { counts, relatedIds, sortDiscoveries, seeded, type Discovery } from "@/lib/inner-compass/model";
import { featured as pickFeatured, themes, type Exploration } from "@/lib/inner-compass/library";
import { hasWords } from "@/lib/inner-compass/manifesto";
import { useInnerCompass, type Compass } from "./useInnerCompass";
import { CompassSky } from "./CompassSky";
import { CategoryMark, DiscoveryCard, QuickAdd, ink, plural, shortDate } from "./parts";
import { Collections } from "./Collections";
import { DiscoveryDetail } from "./DiscoveryDetail";
import { WordGarden } from "./WordGarden";
import { ExplorationSession, Explorations, ThemeMark, themeInk } from "./Explorations";
import { Evolution } from "./Evolution";
import { Manifesto } from "./Manifesto";
import { useStories } from "./stories/useStories";
import { useVisionBoards } from "../vision/useVisionBoards";
import { Chapters } from "./stories/Chapters";
import { ChapterPage } from "./stories/ChapterPage";
import { Experiences } from "./stories/Experiences";
import { ExperiencePage } from "./stories/ExperiencePage";
import "./InnerCompass.css";
import "./stories/Stories.css";

export const compassSpaces = [
  { id: "overview", label: "Overview" }, { id: "collections", label: "Collections" }, { id: "explore", label: "Explorations" },
  { id: "evolution", label: "Evolution" }, { id: "manifesto", label: "Manifesto" },
] as const;
type Space = typeof compassSpaces[number]["id"];
/** #211: three views. My Inner World is who I am, My Chapters the seasons I'm living, My Experiences the moments that shape my story. */
const realms = [{ id: "world", label: "My Inner World" }, { id: "chapters", label: "My Chapters" }, { id: "experiences", label: "My Experiences" }] as const;
type Realm = typeof realms[number]["id"];
const parseSpace = (v: string | null): Space => compassSpaces.find((s) => s.id === v)?.id ?? "overview";

/**
 * Envision → Inner Compass (#210). Phase 1 is My Inner World: an evolving, private portrait of values, character,
 * beliefs, philosophy, boundaries and patterns. My Chapters (Phase 2) will reference these discoveries by id.
 *
 * The URL holds the place (space, collection and an open discovery) so a reference from Intentions or a Vision Board
 * can link straight to a discovery: /envision?view=inner-compass&d=<id>.
 */
export function InnerCompass({ today }: { today: string }) {
  const compass = useInnerCompass();
  const params = useSearchParams(), router = useRouter(), path = usePathname();
  const space = parseSpace(params?.get("space") ?? null), catParam = params?.get("cat") ?? null, category: Category | "all" = isCategory(catParam) ? catParam : "all";
  const openId = params?.get("d") ?? null, open = openId ? compass.discoveries.find((d) => d.id === openId) : undefined;
  const [garden, setGarden] = useState<"values" | "character" | null>(null), [session, setSession] = useState<{ key?: string; id?: string } | null>(null);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const stories = useStories(), vision = useVisionBoards();
  const realmParam = params?.get("realm"), realm: Realm = realmParam === "chapters" || realmParam === "experiences" ? realmParam : "world";
  const chapterId = params?.get("chapter") ?? null, experienceId = params?.get("experience") ?? null, collectionId = params?.get("collection") ?? null;
  const chapter = chapterId ? stories.chapters.find((c) => c.id === chapterId) : undefined, experience = experienceId ? stories.experiences.find((e) => e.id === experienceId) : undefined;
  const toRealm = (r: Realm) => go({ realm: r === "world" ? null : r, chapter: null, experience: null, collection: null, space: null, cat: null, d: null });
  const openChapter = (id: string) => go({ realm: "chapters", chapter: id, experience: null, collection: null, d: null });
  const openExperience = (id: string) => go({ realm: "experiences", experience: id, chapter: null, collection: null, d: null });
  const openCollection = (id: string | null) => go({ realm: "experiences", collection: id, experience: null, chapter: null, d: null });
  const remember = () => setOpener(document.activeElement as HTMLElement | null);
  const href = (patch: Record<string, string | null>) => {
    const q = new URLSearchParams(params?.toString() ?? ""); q.set("view", "inner-compass");
    for (const [k, v] of Object.entries(patch)) { if (v === null) q.delete(k); else q.set(k, v); }
    if (q.get("space") === "overview") q.delete("space");
    return `${path}?${q.toString()}`;
  };
  const go = (patch: Record<string, string | null>) => router.replace(href(patch), { scroll: false });
  const openDiscovery = (id: string) => { remember(); setSession(null); go({ d: id }); };
  const toCollection = (c: Category | "all") => go({ space: "collections", cat: c === "all" ? null : c, d: null });
  const recentlyDone = useMemo(() => new Set(compass.responses.filter((r) => r.completedOn >= addDays(today, -14)).map((r) => r.explorationKey)), [compass.responses, today]);
  const featured = useMemo(() => pickFeatured(today, recentlyDone), [today, recentlyDone]);
  async function addDiscovery(d: Discovery, areaIds: string[]) { const saved = await compass.save(d); if (saved && areaIds.length) await compass.setDiscoveryAreas(saved.id, areaIds); return !!saved; }

  return <div className="muse-compass" data-space={space}>
    <nav className="muse-compass-spaces" aria-label="Inner Compass">
      <MuseSegmented label="Inner Compass" value={realm} onChange={toRealm} options={realms.map((r) => ({ id: r.id, label: r.label }))} className="muse-compass-spaces-track muse-compass-realms" />
      {realm === "world" && <MuseSegmented label="My Inner World sections" value={space} onChange={(s) => go({ space: s, cat: null, d: null })} options={compassSpaces.map((s) => ({ id: s.id, label: s.label }))} className="muse-compass-spaces-track muse-compass-sections" />}
      <SaveIndicator label="Inner Compass" loaded={compass.status.loaded && stories.status.loaded} saving={compass.status.saving || stories.status.saving} error={compass.status.error || stories.status.error} />
    </nav>

    {realm !== "world" ? (!stories.status.loaded || !compass.status.loaded ? <p className="small-label" role="status">Opening your story…</p>
      : stories.status.error && !stories.chapters.length && !stories.experiences.length ? <p className="muse-compass-empty-quiet" role="alert">{stories.status.error}</p>
      : realm === "chapters" ? (chapterId ? (chapter ? <ChapterPage key={chapter.id} c={chapter} stories={stories} compass={compass} boards={vision.boards} today={today} onBack={() => toRealm("chapters")} onOpenChapter={openChapter} onOpenExperience={openExperience} />
          : <p className="muse-compass-version-note" role="status">That chapter is no longer here. <button type="button" className="text-button" onClick={() => toRealm("chapters")}>All chapters</button></p>)
        : <Chapters stories={stories} boards={vision.boards} today={today} onOpen={openChapter} />)
      : experienceId ? (experience ? <ExperiencePage key={experience.id} e={experience} stories={stories} compass={compass} boards={vision.boards} today={today} onBack={() => toRealm("experiences")} onOpenChapter={openChapter} onOpenCollection={openCollection} />
          : <p className="muse-compass-version-note" role="status">That experience is no longer here. <button type="button" className="text-button" onClick={() => toRealm("experiences")}>All experiences</button></p>)
        : <Experiences stories={stories} compass={compass} boards={vision.boards} today={today} collectionId={collectionId} initialArea={params?.get("area") ?? null} onOpen={openExperience} onCollection={openCollection} />)
    : !compass.status.loaded ? <p className="small-label" role="status">Opening your Inner World…</p>
      : compass.status.error && !compass.discoveries.length && !compass.responses.length ? <p className="muse-compass-empty-quiet" role="alert">{compass.status.error}</p>
      : <>
        {space === "overview" && <Overview compass={compass} today={today} invite={featured} onOpen={openDiscovery} onCollection={toCollection} onSpace={(s) => go({ space: s, cat: null, d: null })} onBegin={(key) => { remember(); setSession({ key }); }} add={addDiscovery} collectionHref={(c) => href({ space: "collections", cat: c, d: null })} />}
        {space === "collections" && <Collections compass={compass} category={category} onCategory={toCollection} onOpen={openDiscovery} onGarden={(k) => { remember(); setGarden(k); }} addSaved={addDiscovery} />}
        {space === "explore" && <Explorations compass={compass} featured={featured} onBegin={(key) => { remember(); setSession({ key }); }} onRevisit={(id) => { remember(); setSession({ id }); }} />}
        {space === "evolution" && <Evolution compass={compass} onOpen={openDiscovery} />}
        {space === "manifesto" && <Manifesto compass={compass} />}
      </>}

    {open && <DiscoveryDetail key={open.id} d={open} compass={compass} today={today} onClose={() => go({ d: null })} onOpen={openDiscovery} returnFocus={opener} />}
    {openId && compass.status.loaded && !open && <MissingNotice onClose={() => go({ d: null })} />}
    {garden && <WordGarden kind={garden} compass={compass} onClose={() => setGarden(null)} returnFocus={opener} />}
    {session && <ExplorationSession explorationKey={session.key} responseId={session.id} compass={compass} today={today} onClose={() => setSession(null)} onOpen={openDiscovery} returnFocus={opener} />}
  </div>;
}
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

function MissingNotice({ onClose }: { onClose: () => void }) {
  return <p className="muse-compass-version-note" role="status">That discovery is no longer in your Inner World. <button type="button" className="text-button" onClick={onClose}>Dismiss</button></p>;
}

type Lately = "recent" | "significant" | "evolved";
/** The landing: a personal atlas. A star chart of the six collections, a way to add in seconds, and gentle doors in. */
function Overview({ compass, today, invite, onOpen, onCollection, onSpace, onBegin, add, collectionHref }: {
  compass: Compass; today: string; invite: Exploration; onOpen: (id: string) => void; onCollection: (c: Category) => void; onSpace: (s: Space) => void; onBegin: (key: string) => void;
  add: (d: Discovery, areaIds: string[]) => Promise<boolean>; collectionHref: (c: Category) => string;
}) {
  const current = compass.discoveries.filter((d) => !d.archivedAt), n = counts(compass.discoveries);
  const [lately, setLately] = useState<Lately>("recent");
  const latelyList = useMemo(() => lately === "significant" ? sortDiscoveries(current.filter((d) => d.favorite), "recent") : lately === "evolved" ? sortDiscoveries(current.filter((d) => d.evolvedAt), "evolved") : sortDiscoveries(current, "recent").slice(0, 24), [current, lately]);
  // A line to hold today: a significant principle or value if there is one, chosen by the day (stable, not random).
  const line = useMemo(() => {
    const pool = current.filter((d) => d.favorite && (d.category === "philosophy" || d.category === "values" || d.category === "beliefs"));
    const from = pool.length ? pool : current.filter((d) => d.category === "philosophy");
    return from.length ? from[Math.floor(seeded(today) * from.length)] : undefined;
  }, [current, today]);
  const empty = current.length === 0;
  const manifesto = compass.manifesto, started = manifesto.revision > 0 && hasWords(manifesto.blocks);

  return <div className="muse-compass-overview">
    <section className="muse-compass-hero" aria-labelledby="compass-hero-title">
      <div className="muse-compass-hero-copy">
        <p className="muse-kicker">Inner Compass</p>
        <h2 id="compass-hero-title" className="muse-compass-hero-title">My Inner World</h2>
        <p className="muse-compass-hero-lede">{empty ? "What you value, who you are, what you believe and how you mean to live: a living portrait, written by you, one discovery at a time." : <>A living portrait in {plural(current.length, "discovery", "discoveries")}{compass.versions.length ? <>, {plural(compass.versions.length, "change")} of heart kept along the way</> : null}.</>}</p>
        {line && <figure className="muse-compass-hero-line" style={ink(line.category)}><blockquote><button type="button" onClick={() => onOpen(line.id)}>{line.title}</button></blockquote>{line.details.attribution && <figcaption>— {line.details.attribution}</figcaption>}</figure>}
        <QuickAdd compact initial="values" areas={compass.areas} saving={compass.status.saving} onSave={add} heading={<p className="muse-compass-quickadd-title">Add a discovery</p>} />
      </div>
      <div className="muse-compass-hero-sky"><CompassSky discoveries={compass.discoveries} links={compass.links} onPick={onCollection} /></div>
    </section>

    <section className="muse-compass-facets" aria-label="Six collections">
      <ul>{categories.map((c) => { const info = categoryInfo[c], latest = sortDiscoveries(current.filter((d) => d.category === c), "recent").slice(0, 2);
        return <li key={c} style={ink(c)}>
          <Link href={collectionHref(c)} scroll={false} className="muse-compass-facet">
            <span className="muse-compass-facet-top"><CategoryMark category={c} size="md" /><span className="muse-compass-facet-count type-numeric">{n[c]}</span></span>
            <span className="muse-compass-facet-title">{info.title}</span>
            <span className="muse-compass-facet-line">{info.line}</span>
            <span className="muse-compass-facet-latest">{latest.length ? latest.map((d) => <span key={d.id}>{d.title}</span>) : <span data-empty>{info.statementPlaceholder}</span>}</span>
          </Link>
        </li>; })}</ul>
    </section>

    <section className="muse-compass-lately" aria-labelledby="compass-lately-title">
      <header><h3 id="compass-lately-title" className="muse-compass-subhead">Lately in my Inner World</h3>
        <MuseSegmented label="Show" value={lately} onChange={setLately} options={[{ id: "recent", label: "Recent" }, { id: "significant", label: "Significant" }, { id: "evolved", label: "Evolved" }]} /></header>
      {latelyList.length ? <EntryCarousel items={latelyList} label={lately === "recent" ? "Recent discoveries" : lately === "significant" ? "Significant discoveries" : "Recently evolved"} minWidth={230} itemKey={(d) => d.id} describe={(d) => d.title}
        render={(d) => <DiscoveryCard d={d} showCategory connections={relatedIds(compass.links, d.id).length} onOpen={() => onOpen(d.id)} onFavorite={() => void compass.save({ ...d, favorite: !d.favorite })} />} />
        : <p className="muse-compass-empty-quiet">{lately === "significant" ? "Tap the heart on any discovery that feels especially significant, and it gathers here." : lately === "evolved" ? "When your understanding of something changes, Record evolution keeps the earlier words, and the change shows here." : "Your first discoveries will gather here."}</p>}
    </section>

    <div className="muse-compass-doors">
      <article className="muse-compass-door" style={themeInk(invite.category)}>
        <p className="muse-kicker"><ThemeMark theme={invite.category} /> Today’s exploration · {themes[invite.category].label}</p>
        <h3>{invite.title}</h3>
        <p className="muse-compass-door-quote">{invite.prompts[0].text}</p>
        <div className="muse-compass-hero-actions"><button type="button" className="muse-button button-primary" onClick={() => onBegin(invite.key)}>Begin</button><button type="button" className="muse-button" onClick={() => onSpace("explore")}>All explorations</button></div>
      </article>
      <article className="muse-compass-door" data-door="manifesto">
        <p className="muse-kicker"><MuseIcon name="sparkle" size={13} /> Personal Manifesto{started && manifesto.updatedAt ? ` · revised ${shortDate(manifesto.updatedAt)}` : ""}</p>
        <h3>{started ? manifesto.title : "A living declaration"}</h3>
        {started ? <p className="muse-compass-door-quote">{manifesto.blocks.find((b) => b.kind === "line" && b.text.trim())?.text ?? "Your words, set beautifully."}</p> : <p className="muse-compass-door-quote">Optional, and entirely yours: your values, character and principles, set like a page worth keeping.</p>}
        <div className="muse-compass-hero-actions"><button type="button" className="muse-button" onClick={() => onSpace("manifesto")}>{started ? "Read my manifesto" : "Begin"}</button></div>
      </article>
    </div>
  </div>;
}
