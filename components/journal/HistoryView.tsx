"use client";
import { useEffect, useMemo, useState } from "react";
import { MuseSearch } from "../design/MuseSearch";
import { MuseSegmented } from "../design/MuseSegmented";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { MuseModal } from "../MuseModal";
import { EntryCard } from "./EntryCard";
import { EmptyPageArt } from "./JournalArt";
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
export function HistoryView({ open, initialTag, initialJournal }: { open: (id: string) => void; initialTag?: string | null; initialJournal?: string | null }) {
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
  }, [state.conversations, state.entryTags, hits, journalIds, companions, tagIds, favorites, from, to, sort, bookmarked]);
  const filterKey = JSON.stringify([query, journalIds, companions, tagIds, favorites, from, to, sort]);
  const [prevFilters, setPrevFilters] = useState(filterKey);
  if (prevFilters !== filterKey) { setPrevFilters(filterKey); setLimit(PAGE); }

  const tagOptions = (kind: TagKind) => state.tags.filter((t) => t.kind === kind).map((t) => ({ id: t.id, label: `${t.name}${t.aliases.length ? ` (${t.aliases.join(", ")})` : ""}` }));
  const companionNames = [...new Set(state.conversations.map((c) => c.companionName).filter(Boolean))];
  const activeTags = tagIds.map((id) => state.tags.find((t) => t.id === id)).filter((t): t is Tag => Boolean(t));
  const filtered = Boolean(query || journalIds.length || companions.length || tagIds.length || favorites || from || to);
  const months = groupByMonth(list.slice(0, limit));
  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  return <section className="muse-journal-archive mj-history-view" aria-labelledby="mj-history-title">
    <div className="mj-row-between"><h2 id="mj-history-title" className="mj-view-title">History</h2>
      <MuseSegmented label="Show" value={show} onChange={setShow} options={[{ id: "entries", label: "All" }, { id: "week", label: "Week" }, { id: "calendar", label: "Calendar" }, { id: "bookmarks", label: "Bookmarks" }]} /></div>
    {show !== "bookmarks" && <>
      <MuseSearch label="Search your journal" value={query} onChange={setQuery} placeholder="Search words, names, places…" count={list.length} noun={["entry", "entries"]} />
      <div className="mj-filters" role="group" aria-label="Filters">
        <MuseChoiceMenu label="Journals" icon="notes" multiple valueLabel={journalIds.length ? `${journalIds.length} journal${journalIds.length > 1 ? "s" : ""}` : "All journals"} selectedIds={journalIds} options={state.journals.map((x) => ({ id: x.id, label: x.name }))} onSelect={(id) => toggle(journalIds, setJournalIds, id)} onClear={() => setJournalIds([])} />
        {companionNames.length > 0 && <MuseChoiceMenu label="Companions" icon="sparkle" multiple valueLabel={companions.length ? companions.join(", ") : "Any companion"} selectedIds={companions} options={companionNames.map((n) => ({ id: n, label: n }))} onSelect={(id) => toggle(companions, setCompanions, id)} onClear={() => setCompanions([])} />}
        {tagKinds.map((k) => tagOptions(k).length > 0 && <MuseChoiceMenu key={k} label={tagKindLabel[k]} icon="tag" multiple searchable valueLabel={tagKindLabel[k]} selectedIds={tagIds.filter((id) => state.tags.find((t) => t.id === id)?.kind === k)} options={tagOptions(k)} onSelect={(id) => toggle(tagIds, setTagIds, id)} />)}
        <button type="button" className="muse-button" aria-pressed={favorites} onClick={() => setFavorites(!favorites)}>★ Favorites & bookmarked</button>
        <label className="mj-date">From<input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="mj-date">To<input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label>
        <MuseChoiceMenu label="Sort" valueLabel={sort === "newest" ? "Newest first" : sort === "oldest" ? "Oldest first" : "Best match"} selectedIds={[sort]} options={[{ id: "newest", label: "Newest first" }, { id: "oldest", label: "Oldest first" }, ...(hits ? [{ id: "relevance", label: "Best match" }] : [])]} onSelect={(id) => setSort(id as typeof sort)} />
        {filtered && <button type="button" className="muse-button button-ghost" onClick={() => { setQuery(""); setJournalIds([]); setCompanions([]); setTagIds([]); setFavorites(false); setFrom(""); setTo(""); setSort("newest"); }}>Clear all</button>}
      </div>
      {activeTags.map((t) => <TagBanner key={t.id} tag={t} count={state.entryTags.filter((x) => x.tagId === t.id).length} onManage={() => setManaging(t)} onClear={() => setTagIds(tagIds.filter((x) => x !== t.id))} />)}
    </>}

    {show === "entries" && (list.length ? <>
      {months.map(([m, items]) => <div key={m} className="mj-month"><h3 className="mj-month-title">{formatMonth(`${m}-01`)}</h3><div className="mj-cards">{items.map((c) => <EntryCard key={c.id} c={c} snippet={hits?.get(c.id)} onOpen={() => open(c.id)} />)}</div></div>)}
      {list.length > limit && <div className="mj-more"><button type="button" className="muse-button" onClick={() => setLimit(limit + PAGE)}>Show more ({list.length - limit} more)</button></div>}
    </> : <div className="muse-journal-empty-row"><span className="muse-journal-empty-art"><EmptyPageArt /></span><div><h4>{filtered ? "Nothing matches" : "No entries yet"}</h4><p>{filtered ? "Try fewer filters or other words." : "Your conversations will gather here, searchable by day, person, place and topic."}</p></div></div>)}

    {show === "week" && <Week focus={focus} setFocus={setFocus} today={j.today} list={list} snippets={hits} open={open} />}
    {show === "calendar" && <Calendar month={month} setMonth={setMonth} list={list} onDay={(d) => { setFocus(d); setShow("week"); }} />}
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

/** One week at a time, Muse-style arrows plus a date picker that jumps anywhere; entries grouped by day. Filters apply. */
function Week({ focus, setFocus, today, list, snippets, open }: { focus: string; setFocus: (d: string) => void; today: string; list: Conversation[]; snippets: Map<string, string> | null; open: (id: string) => void }) {
  const start = weekStart(focus), days = weekDays(start);
  return <div className="mj-week">
    <div className="mj-row-between mj-week-nav">
      <button type="button" className="muse-button button-ghost" aria-label="Previous week" onClick={() => setFocus(addDays(start, -7))}>←</button>
      <h3 className="mj-month-title">{formatShort(days[0])} – {formatShort(days[6])}</h3>
      <span className="mj-week-jump"><label className="mj-date">Go to<input type="date" value={focus} max={today} onChange={(e) => e.target.value && setFocus(e.target.value)} /></label>
        {start !== weekStart(today) && <button type="button" className="muse-button button-ghost" onClick={() => setFocus(today)}>This week</button>}
        <button type="button" className="muse-button button-ghost" aria-label="Next week" disabled={addDays(start, 7) > today} onClick={() => setFocus(addDays(start, 7))}>→</button></span>
    </div>
    <ol className="mj-days">{days.map((d) => { const items = list.filter((c) => c.localDate === d); return <li key={d} className="mj-day" data-empty={!items.length || undefined} data-focus={d === focus || undefined} data-today={d === today || undefined}>
      <div className="mj-day-label"><b>{weekdayShort(d)}</b><span>{dayNumber(d)}</span></div>
      {items.length ? <div className="mj-cards">{items.map((c) => <EntryCard key={c.id} c={c} snippet={snippets?.get(c.id)} onOpen={() => open(c.id)} />)}</div> : <span className="mj-note">No entry</span>}
    </li>; })}</ol>
  </div>;
}

function Calendar({ month, setMonth, list, onDay }: { month: string; setMonth: (m: string) => void; list: { localDate: string; userWords: number }[]; onDay: (d: string) => void }) {
  const first = `${month}-01`, start = addDays(first, -((new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const byDay = new Map<string, number>(); for (const c of list) byDay.set(c.localDate, (byDay.get(c.localDate) ?? 0) + c.userWords);
  const shift = (n: number) => { const d = new Date(`${first}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); setMonth(d.toISOString().slice(0, 7)); };
  const max = Math.max(1, ...byDay.values());
  return <div className="mj-calendar">
    <div className="mj-row-between"><button type="button" className="muse-button button-ghost" onClick={() => shift(-1)} aria-label="Previous month">←</button><h3 className="mj-month-title">{formatMonth(first)}</h3>
      <span className="mj-week-jump"><label className="mj-date">Go to<input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></label><button type="button" className="muse-button button-ghost" onClick={() => shift(1)} aria-label="Next month">→</button></span></div>
    <div className="mj-cal-grid" role="grid">{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="mj-cal-head" role="columnheader">{d}</span>)}
      {days.map((d) => { const w = byDay.get(d); return <button key={d} type="button" role="gridcell" className="mj-cal-day" data-out={d.slice(0, 7) !== month || undefined} data-has={w !== undefined || undefined} disabled={w === undefined} style={w !== undefined ? { "--glow": String(0.35 + 0.65 * (w / max)) } as React.CSSProperties : undefined} onClick={() => onDay(d)} aria-label={`${formatShort(d)}${w !== undefined ? `, ${w} words` : ", no entries"}`}><span>{Number(d.slice(8))}</span></button>; })}
    </div>
  </div>;
}

function Bookmarks({ open }: { open: (id: string) => void }) {
  const j = useJournal();
  const [editing, setEditing] = useState<string | null>(null), [note, setNote] = useState("");
  if (!j.state.bookmarks.length) return <div className="muse-journal-empty-row"><span className="muse-journal-empty-art"><EmptyPageArt /></span><div><h4>No bookmarks yet</h4><p>In any entry, choose “Bookmark this” on a message to keep a passage, with a note on why it matters.</p></div></div>;
  return <ul className="mj-bookmarks">{j.state.bookmarks.map((b) => { const c = j.state.conversations.find((x) => x.id === b.conversationId); return <li key={b.id} className="mj-mark">
    <blockquote>{b.excerpt}</blockquote>
    {editing === b.id ? <form className="mj-tag-add" onSubmit={(e) => { e.preventDefault(); void j.saveBookmarkNote(b.id, note).then(() => setEditing(null)); }}><input type="text" aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} autoFocus /><button type="submit" className="muse-button">Save</button></form>
      : <p className="mj-note">{b.note || "No note."} <button type="button" className="mj-link" onClick={() => { setEditing(b.id); setNote(b.note); }}>Edit note</button></p>}
    {c && <button type="button" className="mj-link" onClick={() => open(c.id)}>{c.title || "Untitled"} · {formatShort(c.localDate)} →</button>}
  </li>; })}</ul>;
}
