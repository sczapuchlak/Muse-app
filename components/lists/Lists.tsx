"use client";
import { MindspaceArt } from "../notes/MindspaceArt";
import { useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { todayInTimeZone } from "@/lib/dates";
import { progress, starters, type MuseList } from "@/lib/lists/model";
import { dayLabel, docText, fieldValue, presetOf, siteName, type CardData, type ImagesData, type LinkData, type ListBlock, type NoteData } from "@/lib/lists/blocks";
import { countdown } from "./SpaceHero";
import { SpaceImg } from "./SpaceMedia";
import type { MuseMarkIcon } from "@/components/design/MuseHeading";
import { scheduleState } from "@/lib/lists/schedule";
import { accentCss } from "@/lib/appearance-values";
import { useDailyData } from "../daily/DailyData";
import { usePlanner } from "../PlannerStore";
import { GlassPopover } from "../GlassPopover";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { MuseMark } from "@/components/design/MuseHeading";
import { MuseInviteCard } from "@/components/design/MuseJournal";
import { DailyArt } from "../daily/DailyArt";
import { MuseIcon } from "../MuseIcon";
import { MuseModal } from "../MuseModal";
import { SaveIndicator } from "../SaveIndicator";
import { copyList, createList, deleteList, updateList, useLists } from "./ListsStore";
import { effectiveEvents } from "./taskLink";
import { ListView } from "./ListView";
import "./Lists.css";

type Scope = "active" | "templates" | "archived";
type Sort = "updated" | "name" | "due";
const sorts: { id: Sort; label: string }[] = [{ id: "updated", label: "Recently updated" }, { id: "name", label: "Name" }, { id: "due", label: "Most due" }];
const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 1 ? "just now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

/** What a block says in one line, for library previews and search. */
function blockLine(b: ListBlock) {
  if (b.kind === "card") { const c = b.data as CardData, p = presetOf(c.preset); return p.shape === "route" && fieldValue(c, "from") ? `${fieldValue(c, "from")} → ${fieldValue(c, "to")}${c.title ? ` · ${c.title}` : ""}` : c.title; }
  if (b.kind === "note") return docText((b.data as NoteData).doc).split("\n").find((l) => l.trim()) ?? "";
  if (b.kind === "link") { const l = b.data as LinkData; return l.title || (l.url ? siteName(l.url) : ""); }
  if (b.kind === "images") { const n = (b.data as ImagesData).images.length; return n ? `${n} photo${n === 1 ? "" : "s"}` : ""; }
  return "";
}

/** Mindspace → Spaces (Lists evolved; same records and routes): the library, or one space when `?list=` is set. */
export function Lists() {
  const s = useLists(), { profile } = useDailyData(), today = todayInTimeZone(profile.timeZone);
  const params = useSearchParams(), router = useRouter(), openId = params.get("list");
  const open = (id: string | null, focusAdd = false) => {
    router.push(id ? `/notes?view=lists&list=${id}` : "/notes?view=lists", { scroll: false });
    // A new checklist opens ready to type into.
    // (Retries briefly: the closing "New space" popover hands focus back to its button first.)
    if (id && focusAdd) { const until = Date.now() + 2500; const go = () => {
      const el = document.querySelector<HTMLInputElement>(".muse-list .muse-list-quickadd input"), at = document.activeElement;
      // Only take focus from nowhere (the page) or the closing popover's button, never from something you chose.
      if (el && (!at || at === document.body || at.classList.contains("muse-lists-new"))) el.focus();
      if (Date.now() < until) window.setTimeout(go, 80);
    }; window.setTimeout(go, 60); }
  };
  const list = openId ? s.lists.find((l) => l.id === openId) : null;
  if (openId && list) return <ListView listId={list.id} today={today} onBack={() => open(null)} onOpen={open} />;
  return <ListsLibrary today={today} onOpen={open} />;
}

export function ListsSaveStatus() {
  const s = useLists();
  return <div className="muse-daily-save-state" role="status" aria-live="polite"><SaveIndicator label="Spaces" loaded={s.loaded} pending={false} saving={false} error={s.error} refreshing={false} /></div>;
}

function ListsLibrary({ today, onOpen }: { today: string; onOpen: (id: string, focusAdd?: boolean) => void }) {
  const s = useLists(), { state: planner } = usePlanner();
  const [query, setQuery] = useState(""), [scope, setScope] = useState<Scope>("active"), [sort, setSort] = useState<Sort>("updated");
  const [creating, setCreating] = useState(false), newAnchor = useRef<HTMLButtonElement>(null);
  const stats = useMemo(() => new Map(s.lists.map((l) => {
    const items = s.items.filter((i) => i.listId === l.id), events = items.flatMap((i) => effectiveEvents(i, s.events, planner));
    const due = items.filter((i) => i.schedule ? scheduleState(i.schedule, events.filter((e) => e.itemId === i.id), today).due : !i.completedAt && !!i.dueDate && i.dueDate <= today).length;
    const blocks = s.blocks.filter((b) => b.listId === l.id).sort((x, y) => x.position - y.position);
    const open = items.filter((i) => !i.completedAt).sort((x, y) => x.position - y.position).slice(0, 3).map((i) => i.title);
    const lines = blocks.filter((b) => b.kind !== "checklist" && b.kind !== "heading").map(blockLine).filter(Boolean);
    // A trip previews what's coming next by date (rides, stays, reservations); other spaces show what's left to tick.
    const dated = blocks.filter((b) => b.kind === "card").map((b) => { const c = b.data as CardData; return { line: blockLine(b), day: fieldValue(c, "date") || fieldValue(c, "checkin") || fieldValue(c, "when") }; })
      .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.day) && x.day >= today && x.line).sort((x, y) => x.day.localeCompare(y.day));
    const next = dated.length >= 2 ? dated.slice(0, 3).map((x) => `${dayLabel(x.day, { month: "short", day: "numeric" })} · ${x.line}`) : open.length ? open : lines.slice(0, 3);
    const words = [...blocks.map(blockLine), ...blocks.filter((b) => b.kind === "note").map((b) => (b.data as NoteData).text ?? ""), ...items.map((i) => i.title)].join(" ").toLowerCase();
    const trip = blocks.some((b) => b.kind === "card" && ["route", "stay"].includes(presetOf((b.data as CardData).preset).shape));
    return [l.id, { ...progress(items, events, today), due, sections: s.sections.filter((x) => x.listId === l.id).length, next, more: dated.length >= 2 ? -1 : open.length ? 0 : Math.max(0, lines.length - 3), repeats: items.some((i) => !!i.schedule), words, trip,
      blocks: { cards: blocks.filter((b) => b.kind === "card").length, notes: blocks.filter((b) => b.kind === "note").length, photos: blocks.reduce((n, b) => n + (b.kind === "images" ? (b.data as ImagesData).images.length : 0), 0) } }];
  })), [s, planner, today]);
  const shown = s.lists
    .filter((l) => scope === "templates" ? l.isTemplate && !l.archivedAt : scope === "archived" ? !!l.archivedAt : !l.isTemplate && !l.archivedAt)
    .filter((l) => !query.trim() || `${l.title} ${l.description ?? ""} ${stats.get(l.id)?.words ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (sort === "name" ? a.title.localeCompare(b.title) : sort === "due" ? (stats.get(b.id)?.due ?? 0) - (stats.get(a.id)?.due ?? 0) : b.updatedAt.localeCompare(a.updatedAt)));
  const counts = { active: s.lists.filter((l) => !l.isTemplate && !l.archivedAt).length, templates: s.lists.filter((l) => l.isTemplate && !l.archivedAt).length, archived: s.lists.filter((l) => l.archivedAt).length };

  const activeLists = s.lists.filter((l) => !l.isTemplate && !l.archivedAt), totals = activeLists.reduce((t, l) => { const x = stats.get(l.id); return x ? { done: t.done + x.done, total: t.total + x.total, due: t.due + x.due } : t; }, { done: 0, total: 0, due: 0 });
  return <section className="muse-lists" aria-label="Spaces">
    <div className="muse-journal-archive muse-lists-archive">
    <div className="muse-journal-hero muse-lists-hero" data-compact="">
      <div className="muse-journal-hero-copy">
        <p className="muse-kicker">Spaces</p>
        <h2 className="muse-journal-title">A space for everything you’re planning</h2>
        <p>A trip with its flights, stays and plans. A room makeover. A cleaning rhythm. Or just the groceries. Everything for one thing, on one page.</p>
        {activeLists.length > 0 && <dl className="muse-journal-stats"><div><dt>Spaces</dt><dd className="type-numeric">{activeLists.length}</dd></div><div><dt>Checked off</dt><dd className="type-numeric">{totals.done}<small> of {totals.total}</small></dd></div><div><dt>Due now</dt><dd className="type-numeric">{totals.due}</dd></div></dl>}
        <div className="muse-journal-actions"><button ref={newAnchor} type="button" className="muse-button button-primary muse-lists-new" aria-expanded={creating} onClick={() => setCreating(true)}><MuseIcon name="plus" size={14} /> New space</button></div>
      </div>
      <div className="muse-journal-art muse-lists-hero-art" aria-hidden="true"><MindspaceArt kind="lists" /></div>
    </div>
    <div className="muse-lists-toolbar">
      <label className="muse-search muse-edge muse-lists-search"><MuseIcon name="search" size={15} /><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search spaces…" aria-label="Search spaces" /></label>
      <MuseChoiceMenu label="Sort spaces" valueLabel={sorts.find((x) => x.id === sort)!.label} options={sorts} selectedIds={[sort]} onSelect={(id) => setSort(id as Sort)} />
    </div>
    <div className="muse-chip-row muse-lists-scopes" role="group" aria-label="Show">
      {(["active", "templates", "archived"] as Scope[]).map((x) => <button key={x} type="button" aria-pressed={scope === x} onClick={() => setScope(x)}>{x === "active" ? "Spaces" : x === "templates" ? "Templates" : "Archived"} <small>{counts[x]}</small></button>)}
    </div>
    {!s.loaded ? <p className="small-label">Loading your spaces…</p> : s.error && !s.lists.length ? <p className="small-label" role="alert">{s.error}</p>
      : shown.length ? <ul className="muse-lists-grid">{shown.map((l) => <ListCard key={l.id} list={l} stat={stats.get(l.id)!} today={today} onOpen={() => onOpen(l.id)} />)}{scope === "active" && !query.trim() && shown.length % 3 !== 0 && <li className="muse-lists-invite-slot" style={{ "--ghost-3": 3 - shown.length % 3, "--ghost-2": 2 - shown.length % 2 } as CSSProperties}><MuseInviteCard count={shown.length} title="Start another space" note="A trip, a room, a routine, or just the next ten things." cta="New space" art={<DailyArt kind="priorities" />} onClick={() => setCreating(true)} /></li>}</ul>
      : <div className="muse-empty-state muse-lists-empty" data-variant="editorial"><span className="muse-lists-empty-art" aria-hidden="true"><MuseMark icon="suitcase" tone={2} size="lg" /><MuseMark icon="checklist" tone={1} size="lg" /><MuseMark icon="basket" tone={4} size="lg" /></span><h3>{query ? "Nothing by that name" : scope === "active" ? "A space for everything you’re planning." : scope === "templates" ? "No templates yet" : "Nothing archived"}</h3><p>{query ? "No spaces match that search." : scope === "templates" ? "No templates yet. Open a space and choose Save as template." : scope === "archived" ? "Nothing archived." : "Start one for a trip, a room, a routine, groceries — anything."}</p>{scope === "active" && !query && <button type="button" className="muse-button" onClick={() => setCreating(true)}>Create a space</button>}</div>}
    </div>
    <GlassPopover id="lists-new" label="New space" open={creating} anchorRef={newAnchor} onClose={() => setCreating(false)} width={600}>
      {creating && <NewList today={today} onDone={(id, focusAdd) => { setCreating(false); if (id) onOpen(id, focusAdd); }} />}
    </GlassPopover>
  </section>;
}

/** Cover art tied to what the list IS: ticked rows for a checklist, a repeating week for a routine, stepping stones for a project. */
function ListCover({ preset }: { preset: string }) {
  return <svg viewBox="0 0 240 84" preserveAspectRatio="xMaxYMid meet" focusable="false">
    {preset === "scheduled" ? <>{[0, 1, 2, 3, 4, 5, 6].map((i) => <g key={i}><rect x={96 + i * 20} y={22} width="15" height="40" rx="5" fill="currentColor" opacity={i % 3 === 0 ? .38 : .14} />{i % 3 === 0 && <path d={`M${100 + i * 20} 43l2.500 2.500 5-6`} fill="none" stroke="#fff" strokeWidth="1.800" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />}</g>)}<path d="M112 12c40-12 78-8 112 6m0 0-9-7m9 7-11 3" fill="none" stroke="currentColor" strokeWidth="1.600" strokeLinecap="round" opacity=".45" /></>
      : preset === "project" ? <><path d="M92 66c22 0 22-16 44-16s22-16 44-16 22-14 44-14" fill="none" stroke="currentColor" strokeWidth="1.600" strokeDasharray="2 6" strokeLinecap="round" opacity=".5" />{[[92, 66], [136, 50], [180, 34]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7" fill="currentColor" opacity={.22 + i * .12} />)}<path d="M222 22V4m0 0h-13l4 5-4 5h13" fill="currentColor" fillOpacity=".4" stroke="currentColor" strokeWidth="1.600" strokeLinejoin="round" opacity=".8" /></>
      : <>{[0, 1, 2].map((i) => <g key={i} opacity={1 - i * .28}><rect x={150 - i * 10} y={14 + i * 21} width="15" height="15" rx="5" fill="currentColor" opacity={i === 0 ? .42 : .18} />{i === 0 && <path d="M153.500 21.500l3 3 5.500-6.500" fill="none" stroke="#fff" strokeWidth="1.800" strokeLinecap="round" strokeLinejoin="round" />}<rect x={172 - i * 10} y={18 + i * 21} width={58 - i * 8} height="7" rx="3.500" fill="currentColor" opacity=".2" /></g>)}</>}
  </svg>;
}

type CardStat = { done: number; total: number; pct: number; due: number; sections: number; next: string[]; more: number; repeats: boolean; trip: boolean; blocks: { cards: number; notes: number; photos: number } };
function ListCard({ list, stat, today, onOpen }: { list: MuseList; stat: CardStat; today: string; onOpen: () => void }) {
  const when = countdown(list, today);
  const [menu, setMenu] = useState(false), [confirm, setConfirm] = useState<HTMLElement | null>(null), anchor = useRef<HTMLButtonElement>(null);
  const style = { "--list-accent": accentCss(list.accent) } as CSSProperties;
  const act = async (fn: () => Promise<unknown>) => { setMenu(false); await fn(); };
  return <li className="muse-lists-card" style={style}>
    <button type="button" className="muse-lists-card-open" onClick={onOpen} aria-label={`Open ${list.title}`}>
      <span className="muse-lists-cover" data-preset={list.preset} data-photo={list.cover ? true : undefined} aria-hidden="true">{list.cover ? <span className="muse-space-card-cover" style={{ "--focus": `${list.cover.focus}%` } as CSSProperties}><SpaceImg image={list.cover.image} thumb alt="" /></span> : <ListCover preset={list.preset} />}{when && <span className="muse-space-countdown">{when}</span>}<span className="muse-lists-card-icon">{list.icon ?? "✦"}</span>{list.pinned && <span className="muse-lists-pinned"><MuseIcon name="pin" size={11} />Pinned</span>}</span>
      <span className="muse-lists-card-text"><span className="muse-lists-kind">{list.isTemplate ? "Template" : stat.trip ? "Trip" : list.preset === "scheduled" ? "Routine" : list.preset === "project" ? "Space" : "Checklist"}</span><strong>{list.title}</strong>
        {list.description && <span className="muse-lists-desc">{list.description}</span>}</span>
      {stat.next.length > 0 ? <span className="muse-lists-next">{stat.next.map((title, i) => <span key={i}><i />{title}</span>)}{stat.more > 0 ? <small>+{stat.more} more</small> : stat.more === 0 && stat.total - stat.done > stat.next.length && <small>+{stat.total - stat.done - stat.next.length} more</small>}</span>
        : <span className="muse-lists-next" data-empty>{stat.total ? "Everything here is done." : "Nothing here yet."}</span>}
      <span className="muse-lists-meta">
        {!list.isTemplate && stat.total > 0 && <span className="muse-lists-progress-row" role="img" aria-label={`${stat.done} of ${stat.total} done`}><span className="muse-list-progress"><span style={{ width: `${stat.pct}%` }} /></span><b>{stat.done}/{stat.total}</b></span>}
        <span className="muse-lists-chips">{stat.due > 0 && <span data-tone="due">{stat.due} due</span>}{stat.sections > 0 && <span>{stat.sections} section{stat.sections === 1 ? "" : "s"}</span>}{stat.repeats && <span>↻ repeats</span>}{stat.blocks.cards > 0 && <span>{stat.blocks.cards} card{stat.blocks.cards === 1 ? "" : "s"}</span>}{stat.blocks.notes > 0 && <span>{stat.blocks.notes} note{stat.blocks.notes === 1 ? "" : "s"}</span>}{stat.blocks.photos > 0 && <span>{stat.blocks.photos} photo{stat.blocks.photos === 1 ? "" : "s"}</span>}{list.isTemplate && <span>{stat.total} item{stat.total === 1 ? "" : "s"}</span>}</span>
      </span>
    </button>
    <div className="muse-lists-card-foot"><small>Updated {ago(list.updatedAt)}</small>
      <span>
        <button type="button" className="muse-lists-mini" aria-pressed={list.pinned} aria-label={list.pinned ? `Unpin ${list.title}` : `Pin ${list.title}`} onClick={() => void updateList(list.id, { pinned: !list.pinned })}><MuseIcon name={list.pinned ? "pin" : "pin"} size={13} /></button>
        <button ref={anchor} type="button" className="muse-lists-mini" aria-label={`More for ${list.title}`} aria-expanded={menu} onClick={() => setMenu(true)}><MuseIcon name="more" size={14} /></button>
      </span></div>
    <GlassPopover id={`list-menu-${list.id}`} label={`${list.title} options`} open={menu} anchorRef={anchor} onClose={() => setMenu(false)} width={220}>
      <div className="muse-lists-menu">
        <button type="button" onClick={() => { setMenu(false); onOpen(); }}>Open</button>
        {list.isTemplate ? <button type="button" onClick={() => void act(async () => { await copyList(list.id, { title: list.title, isTemplate: false, today }); })}>Use template</button>
          : <button type="button" onClick={() => void act(() => copyList(list.id, { title: `${list.title} (copy)`, isTemplate: false, today }))}>Duplicate</button>}
        {!list.isTemplate && <button type="button" onClick={() => void act(() => copyList(list.id, { title: list.title, isTemplate: true, today }))}>Save as template</button>}
        <button type="button" onClick={() => void act(() => updateList(list.id, { archivedAt: list.archivedAt ? null : new Date().toISOString() }))}>{list.archivedAt ? "Restore" : "Archive"}</button>
        <button type="button" className="muse-lists-danger" onClick={() => { setMenu(false); setConfirm(anchor.current); }}>Delete…</button>
      </div>
    </GlassPopover>
    {confirm && <MuseModal id={`list-delete-${list.id}`} label="Delete space?" returnFocus={confirm} onClose={() => setConfirm(null)}>
      <h2>Delete “{list.title}”?</h2><p>This permanently deletes the space: its sections, notes, cards, photos, items and history. Linked Planner tasks stay in the Planner.</p>
      <div className="muse-lists-modal-actions"><button type="button" className="muse-button" onClick={() => { setConfirm(null); void deleteList(list.id); }}>Delete space</button><button type="button" className="muse-button button-ghost" onClick={() => setConfirm(null)}>Keep it</button></div>
    </MuseModal>}
  </li>;
}

/**
 * Title + a starting point. Templates are starting configurations (sections, blocks, fields, schedules, layout), never
 * permanent types; your own templates make independent copies without old ticks or history.
 */
function NewList({ today, onDone }: { today: string; onDone: (id: string | null, focusAdd?: boolean) => void }) {
  const s = useLists(), [title, setTitle] = useState(""), [pick, setPick] = useState<string>("starter:checklist"), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const userTemplates = s.lists.filter((l) => l.isTemplate && !l.archivedAt);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const [kind, id] = pick.split(":");
      if (kind === "template") { const src = userTemplates.find((t) => t.id === id)!; onDone(await copyList(id, { title: title.trim() || src.title, isTemplate: false, today }), true); }
      else { const st = starters.find((x) => x.id === id)!; onDone(await createList({ starterId: id, title: title.trim() || undefined, today }), st.preset === "checklist"); }
    } catch { setError("That space didn’t save. Please try again."); } finally { setBusy(false); }
  }
  const option = (value: string, label: string, detail: string, mark: MuseMarkIcon, tone: number, peek?: string) => <label key={value} className="muse-lists-start muse-space-start" data-selected={pick === value || undefined} onDoubleClick={(e) => e.currentTarget.closest("form")?.requestSubmit()}>
    <input type="radio" name="list-start" value={value} checked={pick === value} onChange={() => setPick(value)} />
    <MuseMark icon={mark} tone={tone as 1} size="md" /><span><strong>{label}</strong><small>{detail}</small>{peek && <em>{peek}</em>}</span></label>;
  return <form className="muse-lists-new-form" onSubmit={submit}>
    <label className="editor-label" htmlFor="list-new-title">Name</label>
    <input id="list-new-title" autoFocus maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Japan 2027, Apartment glow-up, Groceries…" />
    <p className="editor-label">Start from</p>
    <div className="muse-lists-starts muse-space-starts">
      {starters.map((st) => option(`starter:${st.id}`, st.id === "blank" ? "Blank space" : st.title, st.description, st.mark as MuseMarkIcon, st.tone, st.sections.length ? st.sections.map((x) => x.title).slice(0, 5).join(" · ") + (st.sections.length > 5 ? " …" : "") : undefined))}
      {userTemplates.map((t) => option(`template:${t.id}`, t.title, "Your template", "bookmark", 3))}
    </div>
    <p className="small-label">Everything can be added, renamed, rearranged or removed afterwards.</p>
    {error && <p className="small-label" role="alert">{error}</p>}
    <div className="muse-lists-modal-actions"><button type="submit" className="muse-button" disabled={busy}>{busy ? "Creating…" : "Create space"}</button><button type="button" className="muse-button button-ghost" onClick={() => onDone(null)}>Cancel</button></div>
  </form>;
}
