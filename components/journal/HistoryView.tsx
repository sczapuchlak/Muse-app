"use client";
import { useEffect, useMemo, useState } from "react";
import { MuseSearch } from "../design/MuseSearch";
import { MuseSegmented } from "../design/MuseSegmented";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { MuseModal } from "../MuseModal";
import { EntryRow } from "./EntryCard";
import Link from "next/link";
import { PaginationControls } from "../collections/PaginationControls";
import { usePagination } from "../collections/usePagination";
import { QuietEmpty } from "./JournalArt";
import { MuseDatePicker, MuseOptionalDatePicker } from "../MuseDatePicker";
import { MuseIcon } from "../MuseIcon";
import { MUSE_STAR_PATH } from "../MuseStar";
import { useJournal } from "./useJournal";
import { dayNumber, formatMonth, formatShort, weekdayShort } from "./format";
import * as P from "@/lib/journal/persistence";
import { isListed, tagKindLabel, tagKindSingular, tagKinds, tagLabel, type Conversation, type Report, type Tag, type TagKind } from "@/lib/journal/model";
import { addDays, weekDays, weekStart } from "@/lib/journal/stats";

type Show = "entries" | "week" | "bookmarks";

/**
 * History (Journal V1 §13–16): a searchable, filterable archive. Search is full-text over titles, summaries and every
 * message (in the database, no AI); filters by journal, companion, My tags, people, topics, moods, favorites,
 * bookmarks and dates work on the device. Opening an entry loads only that entry.
 */
export function HistoryView({ open, initialTag, initialJournal, onThisDay }: { open: (id: string) => void; initialTag?: string | null; initialJournal?: string | null; onThisDay?: boolean }) {
  const j = useJournal();
  const { state } = j;
  const [show, setShow] = useState<Show>(initialTag || onThisDay ? "entries" : "week");
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ query: string; hits: Map<string, string> } | null>(null);
  const hits = query.trim() && found?.query === query ? found.hits : null;
  const [journalIds, setJournalIds] = useState<string[]>(initialJournal ? [initialJournal] : []);
  const [companions, setCompanions] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>(initialTag ? [initialTag] : []);
  const [favorites, setFavorites] = useState(false);
  const [from, setFrom] = useState(""), [to, setTo] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "relevance">("newest");
  const [managing, setManaging] = useState<Tag | null>(null);
  const [focus, setFocus] = useState(j.today);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sameDay, setSameDay] = useState(Boolean(onThisDay));

  const [prevTag, setPrevTag] = useState(initialTag);
  if (prevTag !== initialTag) { setPrevTag(initialTag); if (initialTag) setTagIds([initialTag]); }
  useEffect(() => {
    if (!query.trim()) return;
    const t = window.setTimeout(() => { void P.searchJournal(j.client, query).then((r) => { setFound({ query, hits: new Map(r.map((x) => [x.conversationId, x.snippet])) }); setSort((s) => (s === "newest" ? "relevance" : s)); }).catch(() => setFound({ query, hits: new Map() })); }, 280);
    return () => window.clearTimeout(t);
  }, [query, j.client]);

  const bookmarked = useMemo(() => new Set(state.bookmarks.map((b) => b.conversationId)), [state.bookmarks]);
  const list = useMemo(() => {
    let out = state.conversations.filter(isListed);
    if (sameDay) out = out.filter((c) => c.localDate.slice(5) === j.today.slice(5) && c.localDate < j.today);
    if (hits) out = out.filter((c) => hits.has(c.id));
    if (journalIds.length) out = out.filter((c) => journalIds.includes(c.journalId));
    if (companions.length) out = out.filter((c) => companions.includes(c.companionName));
    for (const id of tagIds) { const has = new Set(state.entryTags.filter((t) => t.tagId === id).map((t) => t.conversationId)); out = out.filter((c) => has.has(c.id)); }
    if (favorites) out = out.filter((c) => c.favorite || bookmarked.has(c.id));
    if (from) out = out.filter((c) => c.localDate >= from);
    if (to) out = out.filter((c) => c.localDate <= to);
    if (sort === "oldest") out = [...out].sort((a, b) => a.localDate.localeCompare(b.localDate) || a.startedAt.localeCompare(b.startedAt));
    else if (sort === "relevance" && hits) { const order = [...hits.keys()]; out = [...out].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)); }
    return out;
  }, [state.conversations, state.entryTags, hits, journalIds, companions, tagIds, favorites, from, to, sort, bookmarked, sameDay, j.today]);
  const filterKey = JSON.stringify([query, journalIds, companions, tagIds, favorites, from, to, sort]);
  const pages = usePagination({ total: list.length, resetKey: filterKey, sizeStorageKey: "muse.journal.history.size" });
  const written = useMemo(() => new Set(state.conversations.filter(isListed).map((c) => c.localDate)), [state.conversations]);

  const companionNames = [...new Set(state.conversations.map((c) => c.companionName).filter(Boolean))];
  const activeTags = tagIds.map((id) => state.tags.find((t) => t.id === id)).filter((t): t is Tag => Boolean(t));
  const filtered = Boolean(sameDay || query || journalIds.length || companions.length || tagIds.length || favorites || from || to);
  const months = groupByMonth(list.slice(pages.window.start, pages.window.end));
  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const clearAll = () => { setQuery(""); setJournalIds([]); setCompanions([]); setTagIds([]); setFavorites(false); setFrom(""); setTo(""); setSort("newest"); setSameDay(false); };
  const activeCount = journalIds.length + companions.length + tagIds.length + (favorites ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0) + (sameDay ? 1 : 0);
  // A search or any filter looks across the whole journal, whatever week is on screen.
  const searching = filtered;

  return <section className="muse-journal-archive mj-history-view mj-reveal" aria-labelledby="mj-history-title">
    <div className="mj-shelf-head"><div><h2 id="mj-history-title" className="type-display mj-view-title">History</h2><p className="mj-note">Everything you’ve written, by day, person and theme.</p></div>
      <div className="mj-history-controls">
        <MuseSegmented label="Show" value={show} onChange={setShow} options={[{ id: "week", label: "Week" }, { id: "entries", label: "All" }, { id: "bookmarks", label: "Bookmarks" }]} />
        <MuseDatePicker label="Jump to a date" triggerText="Jump to a date" date={focus} today={j.today} marked={written} onChange={(d) => { if (!d) return; setFocus(d > j.today ? j.today : d); setShow("week"); }} />
      </div></div>
    {show !== "bookmarks" && <div className="mj-finder" data-open={filtersOpen || undefined}>
      <div className="mj-finder-top">
        <MuseSearch label="Search your whole journal" value={query} onChange={setQuery} placeholder="Search names, #tags, words…" count={searching ? list.length : undefined} noun={["entry", "entries"]} />
        <button type="button" className="muse-button mj-filters-toggle" aria-expanded={filtersOpen} aria-controls="mj-filter-panel" onClick={() => setFiltersOpen(!filtersOpen)}><MuseIcon name="filter" size={15} />Filters{activeCount ? <b className="mj-filter-count type-numeric">{activeCount}</b> : null}</button>
      </div>
      {filtersOpen && <FilterPanel tagIds={tagIds} onTag={(id) => toggle(tagIds, setTagIds, id)} onClose={() => setFiltersOpen(false)}>
        <MuseChoiceMenu label="Journals" icon="notes" multiple valueLabel={journalIds.length ? `${journalIds.length} journal${journalIds.length > 1 ? "s" : ""}` : "All journals"} selectedIds={journalIds} options={state.journals.map((x) => ({ id: x.id, label: x.name }))} onSelect={(id) => toggle(journalIds, setJournalIds, id)} onClear={() => setJournalIds([])} />
        {companionNames.length > 0 && <MuseChoiceMenu label="Companions" icon="sparkle" multiple valueLabel={companions.length ? companions.join(", ") : "Any companion"} selectedIds={companions} options={companionNames.map((n) => ({ id: n, label: n }))} onSelect={(id) => toggle(companions, setCompanions, id)} onClear={() => setCompanions([])} />}
        <span className="mj-range" role="group" aria-label="Dates"><MuseOptionalDatePicker label="From" date={from} today={j.today} onChange={setFrom} /><span aria-hidden="true">–</span><MuseOptionalDatePicker label="To" date={to} today={j.today} onChange={setTo} /></span>
        <button type="button" className="muse-button mj-toggle-button" aria-pressed={favorites} onClick={() => setFavorites(!favorites)}><MuseIcon name="favorite" size={15} />Kept</button>
        <MuseChoiceMenu label="Sort" valueLabel={sort === "newest" ? "Newest first" : sort === "oldest" ? "Oldest first" : "Best match"} selectedIds={[sort]} options={[{ id: "newest", label: "Newest first" }, { id: "oldest", label: "Oldest first" }, ...(hits ? [{ id: "relevance", label: "Best match" }] : [])]} onSelect={(id) => setSort(id as typeof sort)} />
      </FilterPanel>}
      {activeCount > 0 && <ul className="mj-active-filters" aria-label="Active filters">
        {sameDay && <li><span className="mj-chip">On this day</span><button type="button" className="mj-x" aria-label="Stop showing on this day" onClick={() => setSameDay(false)}>×</button></li>}
        {activeTags.map((t) => <li key={t.id} data-kind={t.kind}><span className="mj-tag" data-kind={t.kind}>{tagLabel(t)}</span>
          <button type="button" className="mj-x mj-x-edit" aria-label={`Rename, aliases or merge ${t.name}`} title="Rename, aliases or merge" onClick={() => setManaging(t)}><MuseIcon name="edit" size={12} /></button>
          <button type="button" className="mj-x" aria-label={`Stop filtering by ${t.name}`} onClick={() => setTagIds(tagIds.filter((x) => x !== t.id))}>×</button></li>)}
        {journalIds.map((id) => <li key={id}><span className="mj-chip">{state.journals.find((x) => x.id === id)?.name ?? "Journal"}</span><button type="button" className="mj-x" aria-label="Remove journal filter" onClick={() => setJournalIds(journalIds.filter((x) => x !== id))}>×</button></li>)}
        {companions.map((n) => <li key={n}><span className="mj-chip">{n}</span><button type="button" className="mj-x" aria-label={`Remove ${n}`} onClick={() => setCompanions(companions.filter((x) => x !== n))}>×</button></li>)}
        {from && <li><span className="mj-chip">From {formatShort(from)}</span><button type="button" className="mj-x" aria-label="Remove start date" onClick={() => setFrom("")}>×</button></li>}
        {to && <li><span className="mj-chip">To {formatShort(to)}</span><button type="button" className="mj-x" aria-label="Remove end date" onClick={() => setTo("")}>×</button></li>}
        {favorites && <li><span className="mj-chip">Kept</span><button type="button" className="mj-x" aria-label="Remove kept filter" onClick={() => setFavorites(false)}>×</button></li>}
        <li><button type="button" className="mj-link type-meta" onClick={clearAll}>Clear all</button></li>
      </ul>}
    </div>}

    {show !== "bookmarks" && searching && (list.length ? <div className="mj-stagger mj-all mj-results">
      <p className="mj-results-line type-meta" role="status">{list.length} {list.length === 1 ? "entry" : "entries"} across your whole journal{tagIds.length > 1 ? " · with all selected tags" : ""}</p>
      {months.map(([m, items]) => <section key={m} className="mj-month" aria-label={formatMonth(`${m}-01`)}>
        <h3 className="mj-month-title type-editorial">{formatMonth(`${m}-01`)}<span className="type-meta">{items.length} {items.length === 1 ? "entry" : "entries"}</span></h3>
        <div className="mj-rows">{items.map((c, i) => <EntryRow key={c.id} c={c} snippet={hits?.get(c.id)} showDay={i === 0 || items[i - 1].localDate !== c.localDate} onOpen={() => open(c.id)} />)}</div>
      </section>)}
      {list.length > 12 && <PaginationControls window={pages.window} noun="entries" position="bottom" label="Results" onPage={(n) => { pages.setPage(n); document.getElementById("mj-history-title")?.scrollIntoView({ block: "start", behavior: "smooth" }); }} onSize={pages.setSize} />}
    </div> : <QuietEmpty title="No entry matches that" line={query.trim() ? `Nothing in your journal mentions “${query.trim()}”${activeCount ? " with these filters" : ""}. Try part of the name, another word, or fewer filters.` : "Try fewer filters."}><button type="button" className="muse-button" onClick={clearAll}>Clear search and filters</button></QuietEmpty>)}

    {show === "entries" && !searching && (list.length ? <div className="mj-stagger mj-all">
      {months.map(([m, items]) => <section key={m} className="mj-month" aria-label={formatMonth(`${m}-01`)}>
        <h3 className="mj-month-title type-editorial">{formatMonth(`${m}-01`)}<span className="type-meta">{items.length} {items.length === 1 ? "entry" : "entries"}</span></h3>
        <div className="mj-rows">{items.map((c, i) => <EntryRow key={c.id} c={c} snippet={hits?.get(c.id)} showDay={i === 0 || items[i - 1].localDate !== c.localDate} onOpen={() => open(c.id)} />)}</div>
      </section>)}
      {list.length > 12 && <PaginationControls window={pages.window} noun="entries" position="bottom" label="History" onPage={(n) => { pages.setPage(n); document.getElementById("mj-history-title")?.scrollIntoView({ block: "start", behavior: "smooth" }); }} onSize={pages.setSize} />}
    </div> : <QuietEmpty title="Your archive begins with one entry" line="Conversations gather here, findable by day, person, place and theme."><a className="muse-button" href="/journal">Write today</a></QuietEmpty>)}

    {show === "week" && !searching && <Week focus={focus} setFocus={setFocus} today={j.today} list={list} snippets={hits} open={open} />}
    {show === "bookmarks" && <Bookmarks open={open} />}
    {managing && <ManageTag tag={managing} onClose={() => setManaging(null)} onMerged={(into) => { setTagIds((ids) => ids.map((x) => (x === managing.id ? into : x))); setManaging(null); }} />}
  </section>;
}

/**
 * The one Filters panel: every tag, grouped into My tags, People, Places, Topics, Moods and Themes, with a search
 * so a long list never needs scrolling, then the narrower controls (journal, companion, dates, kept, sort).
 * Selected tags combine with AND, and with the search text.
 */
function FilterPanel({ tagIds, onTag, onClose, children }: { tagIds: string[]; onTag: (id: string) => void; onClose: () => void; children: React.ReactNode }) {
  const { state } = useJournal();
  const [find, setFind] = useState(""), [expanded, setExpanded] = useState<TagKind[]>([]);
  const uses = useMemo(() => { const m = new Map<string, number>(); for (const t of state.entryTags) m.set(t.tagId, (m.get(t.tagId) ?? 0) + 1); return m; }, [state.entryTags]);
  const needle = find.trim().replace(/^#/, "").toLowerCase();
  const groups = tagKinds.map((k) => {
    const all = state.tags.filter((t) => t.kind === k && (uses.get(t.id) ?? 0) > 0)
      .filter((t) => !needle || t.name.toLowerCase().includes(needle) || t.aliases.some((a) => a.toLowerCase().includes(needle)))
      .sort((a, b) => (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0) || a.name.localeCompare(b.name));
    return { k, all, shown: needle || expanded.includes(k) ? all : all.slice(0, 12) };
  }).filter((g) => g.all.length);
  return <div className="mj-filter-panel" id="mj-filter-panel" role="group" aria-label="Filters">
    <div className="mj-filter-find"><MuseIcon name="search" size={15} /><input type="search" aria-label="Find a tag" placeholder="Find a tag, person, place…" value={find} onChange={(e) => setFind(e.target.value)} /></div>
    {groups.length ? groups.map(({ k, all, shown }) => <section key={k} className="mj-filter-group" data-kind={k}>
      <h4 className="type-meta">{tagKindLabel[k]} <span className="type-numeric">{all.length}</span></h4>
      <ul className="mj-chip-list">{shown.map((t) => <li key={t.id}><button type="button" className="mj-filter-chip" data-kind={k} aria-pressed={tagIds.includes(t.id)} onClick={() => onTag(t.id)}>{tagLabel(t)} <span className="type-numeric">{uses.get(t.id)}</span></button></li>)}
        {shown.length < all.length && <li><button type="button" className="mj-link type-meta" onClick={() => setExpanded([...expanded, k])}>Show all {all.length}</button></li>}</ul>
    </section>) : <p className="mj-note">{needle ? `No tag matches “${find.trim()}”.` : "Tags appear here once entries have them. Add your own from any saved entry."}</p>}
    <div className="mj-filter-more">{children}</div>
    <div className="mj-filter-done"><button type="button" className="muse-button button-primary" onClick={onClose}>Done</button></div>
  </div>;
}

function groupByMonth<T extends { localDate: string }>(list: T[]): [string, T[]][] {
  const out = new Map<string, T[]>(); for (const c of list) { const k = c.localDate.slice(0, 7); out.set(k, [...(out.get(k) ?? []), c]); }
  return [...out.entries()];
}

function ManageTag({ tag, onClose, onMerged }: { tag: Tag; onClose: () => void; onMerged: (into: string) => void }) {
  const j = useJournal();
  const [name, setName] = useState(tag.name), [aliases, setAliases] = useState(tag.aliases.join(", ")), [into, setInto] = useState<string | null>(null);
  const same = j.state.tags.filter((t) => t.kind === tag.kind && t.id !== tag.id);
  return <MuseModal id="mj-tag" label="Tag" title={`${tagKindSingular[tag.kind]}: ${tag.name}`} returnFocus={null} onClose={onClose}>
    <form className="mj-form" onSubmit={async (e) => { e.preventDefault(); if (await j.saveTag({ ...tag, name, aliases: aliases.split(",").map((a) => a.trim()).filter(Boolean) })) onClose(); }}>
      <label className="editor-label">Name<input type="text" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></label>
      {tag.kind === "person" || tag.kind === "place" ? <label className="editor-label">Also known as (comma-separated)<input type="text" value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="Al, Alexandra" /></label> : null}
      <p className="mj-note">Muse never assumes two similar names are the same {tagKindSingular[tag.kind].toLowerCase()}. Add a nickname here, or merge two tags yourself.</p>
      {j.status.error && <p className="mj-error" role="alert">{j.status.error}</p>}
      <div className="mj-form-actions"><button type="button" className="muse-button button-ghost" onClick={async () => { if (window.confirm(`Delete “${tag.name}”? Entries stay; only the tag goes.`) && await j.deleteTag(tag.id)) onClose(); }}>Delete tag</button><button type="submit" className="muse-button button-primary">Save</button></div>
      {same.length > 0 && <div className="mj-finish" role="group" aria-label="Merge"><p>Merge “{tag.name}” into another {tagKindSingular[tag.kind].toLowerCase()}: its entries move there and “{tag.name}” becomes an alias.</p>
        <MuseChoiceMenu label="Merge into" searchable valueLabel={same.find((t) => t.id === into)?.name ?? "Choose…"} selectedIds={into ? [into] : []} options={same.map((t) => ({ id: t.id, label: t.name }))} onSelect={setInto} />
        <div><button type="button" className="muse-button button-primary" disabled={!into} onClick={async () => { if (into && await j.mergeTags(tag.id, into)) onMerged(into); }}>Merge</button></div></div>}
    </form>
  </MuseModal>;
}

/**
 * One week at a time. A slim strip of the seven days (a lit star where you wrote) sits over that week's entries as
 * compact rows, and the week's reflection lives with them, so a week reads as one chapter.
 */
function Week({ focus, setFocus, today, list, snippets, open }: { focus: string; setFocus: (d: string) => void; today: string; list: Conversation[]; snippets: Map<string, string> | null; open: (id: string) => void }) {
  const j = useJournal();
  const start = weekStart(focus), days = weekDays(start), current = start === weekStart(today);
  const items = list.filter((c) => c.localDate >= days[0] && c.localDate <= days[6]).sort((a, b) => a.localDate.localeCompare(b.localDate) || a.startedAt.localeCompare(b.startedAt));
  const on = new Set(items.map((c) => c.localDate));
  const [loaded, setLoaded] = useState<{ start: string; report: Report | null } | null>(null);
  useEffect(() => { let live = true; void P.loadReport(j.client, j.userId, start).then((r) => { if (live) setLoaded({ start, report: r }); }).catch(() => undefined); return () => { live = false; }; }, [start, j.client, j.userId]);
  const report = loaded?.start === start ? loaded.report : null;
  const jump = (d: string) => document.getElementById(`mj-day-${d}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  return <div className="mj-week">
    <div className="mj-period-bar">
      <nav className="muse-week-jump" aria-label="Week"><button className="muse-button" type="button" aria-label="Previous week" onClick={() => setFocus(addDays(start, -7))}>‹</button><button className="muse-button" type="button" disabled={current} onClick={() => setFocus(today)}>This week</button><button className="muse-button" type="button" aria-label="Next week" disabled={current} onClick={() => setFocus(addDays(start, 7) > today ? today : addDays(start, 7))}>›</button></nav>
      <h3 className="mj-period-title type-editorial" aria-live="polite">{formatShort(days[0])} – {formatShort(days[6])}</h3>
      <span className="mj-period-count type-meta">{on.size} of 7 days · {items.length} {items.length === 1 ? "entry" : "entries"}</span>
    </div>
    <ol className="mj-strip" key={start} aria-label="Days this week">{days.map((d, i) => <li key={d}>
      <button type="button" className="mj-strip-day" data-on={on.has(d) || undefined} data-today={d === today || undefined} disabled={!on.has(d)} onClick={() => jump(d)} style={{ "--i": i } as React.CSSProperties} aria-label={`${weekdayShort(d)} ${dayNumber(d)}${on.has(d) ? ", written" : ", nothing written"}`}>
        <b className="type-meta">{weekdayShort(d)}</b><span className="type-numeric">{dayNumber(d)}</span>
        <svg viewBox="0 0 24 40" aria-hidden="true"><path d={MUSE_STAR_PATH} /></svg>
      </button></li>)}</ol>
    {items.length ? <div className="mj-rows" key={`rows-${start}`}>{items.map((c, i) => <div key={c.id} id={i === 0 || items[i - 1].localDate !== c.localDate ? `mj-day-${c.localDate}` : undefined}><EntryRow c={c} snippet={snippets?.get(c.id)} showDay={i === 0 || items[i - 1].localDate !== c.localDate} onOpen={() => open(c.id)} /></div>)}</div>
      : <QuietEmpty title={current ? "This week is still blank" : "Nothing written this week"} line={current ? "Whatever you write lands here, day by day." : "Use ‹ › or Jump to a date to find another week."} />}
    {items.length > 0 && <aside className="mj-week-reflection" aria-label="This week’s reflection">
      <div className="mj-week-reflection-head"><svg viewBox="0 0 24 40" aria-hidden="true"><path d={MUSE_STAR_PATH} /></svg><h4 className="type-title">The week’s reflection</h4></div>
      {report ? <><p className="mj-week-reflection-text type-reading">{report.data.narrative}</p>
        <Link className="mj-link" href={`/journal?view=insights&week=${start}`}>Read the whole reflection →</Link></>
        : <p className="mj-note">No reflection for this week yet. <Link className="mj-link" href={`/journal?view=insights&week=${start}`}>See the week in Insights{j.ai.enabled ? " and write one" : ""} →</Link></p>}
    </aside>}
  </div>;
}

function Bookmarks({ open }: { open: (id: string) => void }) {
  const j = useJournal();
  const [editing, setEditing] = useState<string | null>(null), [note, setNote] = useState("");
  if (!j.state.bookmarks.length) return <QuietEmpty title="No passages kept yet" line="In any entry, choose “Bookmark this” on a message to keep a passage, with a note on why it matters." />;
  return <ul className="mj-bookmarks">{j.state.bookmarks.map((b) => { const c = j.state.conversations.find((x) => x.id === b.conversationId); return <li key={b.id} className="mj-mark">
    <blockquote className="type-quote">{b.excerpt}</blockquote>
    {editing === b.id ? <form className="mj-tag-add" onSubmit={(e) => { e.preventDefault(); void j.saveBookmarkNote(b.id, note).then(() => setEditing(null)); }}><input type="text" aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} autoFocus /><button type="submit" className="muse-button">Save</button></form>
      : <p className="mj-note">{b.note || "No note."} <button type="button" className="mj-link" onClick={() => { setEditing(b.id); setNote(b.note); }}>Edit note</button></p>}
    {c && <button type="button" className="mj-link" onClick={() => open(c.id)}>{c.title || "Untitled"} · {formatShort(c.localDate)} →</button>}
  </li>; })}</ul>;
}
