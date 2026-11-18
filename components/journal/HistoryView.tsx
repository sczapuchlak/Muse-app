"use client";
import { useEffect, useMemo, useState } from "react";
import { MuseSearch } from "../design/MuseSearch";
import { MuseSegmented } from "../design/MuseSegmented";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { MuseModal } from "../MuseModal";
import { EntryCard } from "./EntryCard";
import { QuietEmpty } from "./JournalArt";
import { MuseDatePicker, MuseOptionalDatePicker } from "../MuseDatePicker";
import { MuseIcon } from "../MuseIcon";
import { MUSE_STAR_PATH } from "../MuseStar";
import { useJournal } from "./useJournal";
import { dayNumber, formatMonth, formatShort, weekdayShort } from "./format";
import * as P from "@/lib/journal/persistence";
import { isListed, tagKindLabel, tagKindSingular, tagKinds, type Conversation, type Tag, type TagKind } from "@/lib/journal/model";
import { addDays, weekDays, weekStart } from "@/lib/journal/stats";

type Show = "entries" | "week" | "calendar" | "bookmarks";
const PAGE = 24;

/**
 * History (Journal V1 §13–16): a searchable, filterable archive. Search is full-text over titles, summaries and every
 * message (in the database, no AI); filters by journal, companion, people, places, topics, themes, favorites,
 * bookmarks and dates work on the device. Opening an entry loads only that entry.
 */
export function HistoryView({ open, initialTag, initialJournal, onThisDay }: { open: (id: string) => void; initialTag?: string | null; initialJournal?: string | null; onThisDay?: boolean }) {
  const j = useJournal();
  const { state } = j;
  const [show, setShow] = useState<Show>("entries");
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ query: string; hits: Map<string, string> } | null>(null);
  const hits = query.trim() && found?.query === query ? found.hits : null;
  const [journalIds, setJournalIds] = useState<string[]>(initialJournal ? [initialJournal] : []);
  const [companions, setCompanions] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>(initialTag ? [initialTag] : []);
  const [favorites, setFavorites] = useState(false);
  const [from, setFrom] = useState(""), [to, setTo] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "relevance">("newest");
  const [limit, setLimit] = useState(PAGE);
  const [managing, setManaging] = useState<Tag | null>(null);
  const [month, setMonth] = useState(() => j.today.slice(0, 7));
  const [focus, setFocus] = useState(j.today);
  const [moreOpen, setMoreOpen] = useState(false);
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
  const [prevFilters, setPrevFilters] = useState(filterKey);
  if (prevFilters !== filterKey) { setPrevFilters(filterKey); setLimit(PAGE); }

  const tagOptions = (kind: TagKind) => state.tags.filter((t) => t.kind === kind).map((t) => ({ id: t.id, label: `${t.name}${t.aliases.length ? ` (${t.aliases.join(", ")})` : ""}` }));
  const companionNames = [...new Set(state.conversations.map((c) => c.companionName).filter(Boolean))];
  const activeTags = tagIds.map((id) => state.tags.find((t) => t.id === id)).filter((t): t is Tag => Boolean(t));
  const filtered = Boolean(sameDay || query || journalIds.length || companions.length || tagIds.length || favorites || from || to);
  const months = groupByMonth(list.slice(0, limit));
  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const primaryKinds: TagKind[] = ["person", "topic"], moreKinds = tagKinds.filter((k) => !primaryKinds.includes(k));
  const moreActive = companions.length + tagIds.filter((id) => moreKinds.includes(state.tags.find((t) => t.id === id)?.kind as TagKind)).length + (sort !== "newest" && sort !== "relevance" ? 1 : 0);
  const kindMenu = (k: TagKind) => tagOptions(k).length > 0 && <MuseChoiceMenu key={k} label={tagKindLabel[k]} icon="tag" multiple searchable valueLabel={(() => { const n = tagIds.filter((id) => state.tags.find((t) => t.id === id)?.kind === k).length; return n ? `${tagKindLabel[k]} · ${n}` : tagKindLabel[k]; })()} selectedIds={tagIds.filter((id) => state.tags.find((t) => t.id === id)?.kind === k)} options={tagOptions(k)} onSelect={(id) => toggle(tagIds, setTagIds, id)} />;

  return <section className="muse-journal-archive mj-history-view mj-reveal" aria-labelledby="mj-history-title">
    <div className="mj-shelf-head"><div><h2 id="mj-history-title" className="type-display mj-view-title">History</h2><p className="mj-note">Everything you’ve written, by day, person and theme.</p></div>
      <MuseSegmented label="Show" value={show} onChange={setShow} options={[{ id: "entries", label: "All" }, { id: "week", label: "Week" }, { id: "calendar", label: "Calendar" }, { id: "bookmarks", label: "Bookmarks" }]} /></div>
    {show !== "bookmarks" && <div className="mj-finder">
      <MuseSearch label="Search your journal" value={query} onChange={setQuery} placeholder="Search words, names, places…" count={list.length} noun={["entry", "entries"]} />
      <div className="mj-filters" role="group" aria-label="Filters">
        <MuseChoiceMenu label="Journals" icon="notes" multiple valueLabel={journalIds.length ? `${journalIds.length} journal${journalIds.length > 1 ? "s" : ""}` : "All journals"} selectedIds={journalIds} options={state.journals.map((x) => ({ id: x.id, label: x.name }))} onSelect={(id) => toggle(journalIds, setJournalIds, id)} onClear={() => setJournalIds([])} />
        {primaryKinds.map(kindMenu)}
        <span className="mj-range" role="group" aria-label="Dates"><MuseOptionalDatePicker label="From" date={from} today={j.today} onChange={setFrom} /><span aria-hidden="true">–</span><MuseOptionalDatePicker label="To" date={to} today={j.today} onChange={setTo} /></span>
        <button type="button" className="muse-button mj-toggle-button" aria-pressed={favorites} onClick={() => setFavorites(!favorites)}><MuseIcon name="favorite" size={15} />Kept</button>
        <button type="button" className="muse-button button-ghost" aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}><MuseIcon name="filter" size={15} />More filters{moreActive ? ` · ${moreActive}` : ""}</button>
        {filtered && <button type="button" className="mj-link type-meta" onClick={() => { setQuery(""); setJournalIds([]); setCompanions([]); setTagIds([]); setFavorites(false); setFrom(""); setTo(""); setSort("newest"); setSameDay(false); }}>Clear all</button>}
      </div>
      {moreOpen && <div className="mj-filters" data-more role="group" aria-label="More filters">
        {companionNames.length > 0 && <MuseChoiceMenu label="Companions" icon="sparkle" multiple valueLabel={companions.length ? companions.join(", ") : "Any companion"} selectedIds={companions} options={companionNames.map((n) => ({ id: n, label: n }))} onSelect={(id) => toggle(companions, setCompanions, id)} onClear={() => setCompanions([])} />}
        {moreKinds.map(kindMenu)}
        <MuseChoiceMenu label="Sort" valueLabel={sort === "newest" ? "Newest first" : sort === "oldest" ? "Oldest first" : "Best match"} selectedIds={[sort]} options={[{ id: "newest", label: "Newest first" }, { id: "oldest", label: "Oldest first" }, ...(hits ? [{ id: "relevance", label: "Best match" }] : [])]} onSelect={(id) => setSort(id as typeof sort)} />
      </div>}
      {sameDay && <div className="mj-tag-banner"><span className="mj-tag">On this day</span><span>Entries written on this date in earlier years</span><button type="button" className="mj-x" aria-label="Show all entries" onClick={() => setSameDay(false)}>×</button></div>}
      {activeTags.map((t) => <TagBanner key={t.id} tag={t} count={state.entryTags.filter((x) => x.tagId === t.id).length} onManage={() => setManaging(t)} onClear={() => setTagIds(tagIds.filter((x) => x !== t.id))} />)}
    </div>}

    {show === "entries" && (list.length ? <div className="mj-stagger">
      {months.map(([m, items]) => <div key={m} className="mj-month"><h3 className="mj-month-title type-editorial">{formatMonth(`${m}-01`)}</h3><div className="mj-cards">{items.map((c) => <EntryCard key={c.id} c={c} snippet={hits?.get(c.id)} onOpen={() => open(c.id)} />)}</div></div>)}
      {list.length > limit && <div className="mj-more"><button type="button" className="muse-button" onClick={() => setLimit(limit + PAGE)}>Show more ({list.length - limit} more)</button></div>}
    </div> : filtered ? <QuietEmpty title="Nothing matches" line="Try fewer filters or other words." /> : <QuietEmpty title="Your archive begins with one entry" line="Conversations gather here, findable by day, person, place and theme."><a className="muse-button" href="/journal">Write today</a></QuietEmpty>)}

    {show === "week" && <Week focus={focus} setFocus={setFocus} today={j.today} list={list} snippets={hits} open={open} />}
    {show === "calendar" && <Calendar month={month} setMonth={setMonth} today={j.today} list={list} onDay={(d) => { setFocus(d); setShow("week"); }} />}
    {show === "bookmarks" && <Bookmarks open={open} />}
    {managing && <ManageTag tag={managing} onClose={() => setManaging(null)} onMerged={(into) => { setTagIds((ids) => ids.map((x) => (x === managing.id ? into : x))); setManaging(null); }} />}
  </section>;
}

function groupByMonth<T extends { localDate: string }>(list: T[]): [string, T[]][] {
  const out = new Map<string, T[]>(); for (const c of list) { const k = c.localDate.slice(0, 7); out.set(k, [...(out.get(k) ?? []), c]); }
  return [...out.entries()];
}

function TagBanner({ tag, count, onManage, onClear }: { tag: Tag; count: number; onManage: () => void; onClear: () => void }) {
  return <div className="mj-tag-banner" data-kind={tag.kind}><span className="mj-tag" data-kind={tag.kind}>{tag.name}</span>
    <span>{tagKindSingular[tag.kind]} · {count} {count === 1 ? "entry" : "entries"}{tag.aliases.length ? ` · also “${tag.aliases.join("”, “")}”` : ""}</span>
    <button type="button" className="muse-button button-ghost" onClick={onManage}>Rename, aliases or merge</button><button type="button" className="mj-x" aria-label={`Stop filtering by ${tag.name}`} onClick={onClear}>×</button></div>;
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
 * One week at a time, with Muse's shared ‹ This week › control and a date picker that jumps anywhere. Entries are
 * grouped under their day; runs of days without entries fold into one slim line instead of empty cards.
 */
function Week({ focus, setFocus, today, list, snippets, open }: { focus: string; setFocus: (d: string) => void; today: string; list: Conversation[]; snippets: Map<string, string> | null; open: (id: string) => void }) {
  const start = weekStart(focus), days = weekDays(start), current = start === weekStart(today);
  const groups: ({ kind: "day"; date: string; items: Conversation[] } | { kind: "gap"; dates: string[] })[] = [];
  for (const d of days) {
    const items = list.filter((c) => c.localDate === d);
    const last = groups[groups.length - 1];
    if (items.length || d === focus || d === today) groups.push({ kind: "day", date: d, items });
    else if (last?.kind === "gap") last.dates.push(d); else groups.push({ kind: "gap", dates: [d] });
  }
  return <div className="mj-week">
    <div className="mj-period-bar">
      <nav className="muse-week-jump" aria-label="Week"><button className="muse-button" type="button" aria-label="Previous week" onClick={() => setFocus(addDays(start, -7))}>‹</button><button className="muse-button" type="button" disabled={current} onClick={() => setFocus(today)}>This week</button><button className="muse-button" type="button" aria-label="Next week" disabled={addDays(start, 7) > today} onClick={() => setFocus(addDays(start, 7))}>›</button></nav>
      <h3 className="mj-period-title type-editorial" aria-live="polite">{formatShort(days[0])} – {formatShort(days[6])}</h3>
      <MuseDatePicker label="Go to a date" date={focus} today={today} onChange={(d) => d && setFocus(d > today ? today : d)} />
    </div>
    <ol className="mj-days" key={start}>{groups.map((g) => g.kind === "gap"
      ? <li key={g.dates[0]} className="mj-day" data-gap><span className="mj-day-gap type-meta">{g.dates.length === 1 ? `${weekdayShort(g.dates[0])} ${dayNumber(g.dates[0])}` : `${weekdayShort(g.dates[0])} ${dayNumber(g.dates[0])} – ${weekdayShort(g.dates[g.dates.length - 1])} ${dayNumber(g.dates[g.dates.length - 1])}`}</span><span className="mj-note">Nothing written</span></li>
      : <li key={g.date} className="mj-day" data-focus={g.date === focus || undefined} data-today={g.date === today || undefined} data-empty={!g.items.length || undefined}>
        <div className="mj-day-label"><b className="type-meta">{weekdayShort(g.date)}</b><span className="type-numeric">{dayNumber(g.date)}</span></div>
        {g.items.length ? <div className="mj-cards">{g.items.map((c) => <EntryCard key={c.id} c={c} snippet={snippets?.get(c.id)} onOpen={() => open(c.id)} />)}</div> : <span className="mj-note">{g.date === today ? "Nothing yet today." : "Nothing written."}</span>}
      </li>)}</ol>
  </div>;
}

/** A month at a glance: lit days have entries (brighter for more words); any day opens its week. */
function Calendar({ month, setMonth, today, list, onDay }: { month: string; setMonth: (m: string) => void; today: string; list: { localDate: string; userWords: number }[]; onDay: (d: string) => void }) {
  const first = `${month}-01`, start = addDays(first, -((new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const byDay = new Map<string, number>(); for (const c of list) byDay.set(c.localDate, (byDay.get(c.localDate) ?? 0) + c.userWords);
  const shift = (n: number) => { const d = new Date(`${first}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); setMonth(d.toISOString().slice(0, 7)); };
  const max = Math.max(1, ...byDay.values()), current = month === today.slice(0, 7);
  const count = days.filter((d) => d.slice(0, 7) === month && byDay.has(d)).length;
  return <div className="mj-calendar">
    <div className="mj-period-bar">
      <nav className="muse-week-jump" aria-label="Month"><button className="muse-button" type="button" aria-label="Previous month" onClick={() => shift(-1)}>‹</button><button className="muse-button" type="button" disabled={current} onClick={() => setMonth(today.slice(0, 7))}>This month</button><button className="muse-button" type="button" aria-label="Next month" disabled={current} onClick={() => shift(1)}>›</button></nav>
      <h3 className="mj-period-title type-editorial" aria-live="polite">{formatMonth(first)} <span className="type-meta">{count} {count === 1 ? "day" : "days"} written</span></h3>
      <MuseDatePicker label="Go to a date" date={first} today={today} onChange={(d) => { if (d) { setMonth(d.slice(0, 7)); if (byDay.has(d)) onDay(d); } }} />
    </div>
    <div className="mj-cal-grid" role="grid" key={month}>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d} className="mj-cal-head type-meta" role="columnheader">{d}</span>)}
      {days.map((d) => { const w = byDay.get(d); return <button key={d} type="button" role="gridcell" className="mj-cal-day type-numeric" data-out={d.slice(0, 7) !== month || undefined} data-has={w !== undefined || undefined} data-today={d === today || undefined} disabled={d > today} style={w !== undefined ? { "--glow": String(0.35 + 0.65 * (w / max)) } as React.CSSProperties : undefined} onClick={() => onDay(d)} aria-label={`${formatShort(d)}${w !== undefined ? `, ${w} words` : ", no entries"}`}><span>{Number(d.slice(8))}</span>{w !== undefined && <svg viewBox="0 0 24 40" aria-hidden="true"><path d={MUSE_STAR_PATH} /></svg>}</button>; })}
    </div>
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
