"use client";
import { MindspaceArt } from "../notes/MindspaceArt";
import { useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { todayInTimeZone } from "@/lib/dates";
import { progress, starters, type MuseList } from "@/lib/lists/model";
import { dayLabel, docText, fieldValue, presetOf, siteName, type CardData, type ImagesData, type LinkData, type ListBlock, type NoteData } from "@/lib/lists/blocks";
import { countdown } from "./SpaceHero";
import { spaceVars } from "./cardLook";
import { SpaceImg } from "./SpaceMedia";
import type { MuseMarkIcon } from "@/components/design/MuseHeading";
import { scheduleState } from "@/lib/lists/schedule";
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
  const [creating, setCreating] = useState(false), [returnTo, setReturnTo] = useState<HTMLElement | null>(null), newAnchor = useRef<HTMLButtonElement>(null);
  // Remember what opened the dialog (in the click, not during render) so focus returns there.
  const openNew = () => { setReturnTo(newAnchor.current); setCreating(true); };
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
    // Its look in the library follows what it holds: a home makeover (measurements, shopping) or gifts.
    const has = (...ps: string[]) => blocks.some((b) => b.kind === "card" && ps.includes((b.data as CardData).preset));
    const home = has("measurement", "shopping"), gifts = has("gift");
    return [l.id, { ...progress(items, events, today), due, sections: s.sections.filter((x) => x.listId === l.id).length, next, more: dated.length >= 2 ? -1 : open.length ? 0 : Math.max(0, lines.length - 3), repeats: items.some((i) => !!i.schedule), words, trip, home, gifts, asLines: dated.length >= 2 || !open.length,
      blocks: { cards: blocks.filter((b) => b.kind === "card").length, notes: blocks.filter((b) => b.kind === "note").length, photos: blocks.reduce((n, b) => n + (b.kind === "images" ? (b.data as ImagesData).images.length : 0), 0) } }];
  })), [s, planner, today]);
  const shown = s.lists
    .filter((l) => scope === "templates" ? l.isTemplate && !l.archivedAt : scope === "archived" ? !!l.archivedAt : !l.isTemplate && !l.archivedAt)
    .filter((l) => !query.trim() || `${l.title} ${l.description ?? ""} ${stats.get(l.id)?.words ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (sort === "name" ? a.title.localeCompare(b.title) : sort === "due" ? (stats.get(b.id)?.due ?? 0) - (stats.get(a.id)?.due ?? 0) : b.updatedAt.localeCompare(a.updatedAt)));
  const counts = { active: s.lists.filter((l) => !l.isTemplate && !l.archivedAt).length, templates: s.lists.filter((l) => l.isTemplate && !l.archivedAt).length, archived: s.lists.filter((l) => l.archivedAt).length };

  return <section className="muse-lists" aria-label="Spaces">
    <div className="muse-journal-archive muse-lists-archive">
    <div className="muse-journal-hero muse-lists-hero" data-compact="">
      <div className="muse-journal-hero-copy">
        <p className="muse-kicker">Spaces</p>
        <h2 className="muse-journal-title">A space for everything you’re planning</h2>
        <p>A trip with its flights, stays and plans. A room makeover. A cleaning rhythm. Or just the groceries. Everything for one thing, on one page.</p>
      </div>
      <div className="muse-journal-art muse-lists-hero-art" aria-hidden="true"><MindspaceArt kind="lists" /></div>
    </div>
    <div className="muse-lists-toolbar">
      <label className="muse-search muse-edge muse-lists-search"><MuseIcon name="search" size={15} /><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search spaces…" aria-label="Search spaces" /></label>
      <MuseChoiceMenu label="Sort spaces" valueLabel={sorts.find((x) => x.id === sort)!.label} options={sorts} selectedIds={[sort]} onSelect={(id) => setSort(id as Sort)} />
    </div>
    {/* Scopes on the left, New space across from them on the right (Nov 26: out of the header). */}
    <div className="muse-lists-scope-row">
      <div className="muse-chip-row muse-lists-scopes" role="group" aria-label="Show">
        {(["active", "templates", "archived"] as Scope[]).map((x) => <button key={x} type="button" aria-pressed={scope === x} onClick={() => setScope(x)}>{x === "active" ? "Spaces" : x === "templates" ? "Templates" : "Archived"} <small>{counts[x]}</small></button>)}
      </div>
      <button ref={newAnchor} type="button" className="muse-button button-primary muse-lists-new" aria-haspopup="dialog" aria-expanded={creating} onClick={() => openNew()}><MuseIcon name="plus" size={14} /> New space</button>
    </div>
    {!s.loaded ? <p className="small-label">Loading your spaces…</p> : s.error && !s.lists.length ? <p className="small-label" role="alert">{s.error}</p>
      : shown.length ? <ul className="muse-lists-grid">{shown.map((l) => <ListCard key={l.id} list={l} stat={stats.get(l.id)!} today={today} onOpen={() => onOpen(l.id)} />)}{scope === "active" && !query.trim() && shown.length % 3 !== 0 && <li className="muse-lists-invite-slot" style={{ "--ghost-3": 3 - shown.length % 3, "--ghost-2": 2 - shown.length % 2 } as CSSProperties}><MuseInviteCard count={shown.length} title="Start another space" note="A trip, a room, a routine, or just the next ten things." cta="New space" art={<DailyArt kind="priorities" />} onClick={() => openNew()} /></li>}</ul>
      : <div className="muse-empty-state muse-lists-empty" data-variant="editorial"><span className="muse-lists-empty-art" aria-hidden="true"><MuseMark icon="suitcase" tone={2} size="lg" /><MuseMark icon="checklist" tone={1} size="lg" /><MuseMark icon="basket" tone={4} size="lg" /></span><h3>{query ? "Nothing by that name" : scope === "active" ? "A space for everything you’re planning." : scope === "templates" ? "No templates yet" : "Nothing archived"}</h3><p>{query ? "No spaces match that search." : scope === "templates" ? "No templates yet. Open a space and choose Save as template." : scope === "archived" ? "Nothing archived." : "Start one for a trip, a room, a routine, groceries — anything."}</p>{scope === "active" && !query && <button type="button" className="muse-button" onClick={() => openNew()}>Create a space</button>}</div>}
    </div>
    {/* A centred dialog, so the gallery never runs off the bottom of the screen. */}
    {creating && <MuseModal id="lists-new" label="New space" title="New space" returnFocus={returnTo} onClose={() => setCreating(false)}>
      <NewList today={today} onDone={(id, focusAdd) => { setCreating(false); if (id) onOpen(id, focusAdd); }} />
    </MuseModal>}
  </section>;
}

/**
 * A space's card cover when it has no photo (Nov 26: "beautiful backgrounds, no graphics"): a layered gradient in the
 * theme's own inks, a palette per kind (trip, routine, checklist, space, template), arranged differently per space
 * (seeded by its id) so no two look the same. Pure CSS; no drawings.
 */
function skyStyle(id: string): CSSProperties {
  let h = 7; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const r = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
  const pct = (lo: number, hi: number) => `${Math.round(lo + r() * (hi - lo))}%`;
  return { "--sky-x1": pct(0, 40), "--sky-y1": pct(0, 100), "--sky-x2": pct(55, 100), "--sky-y2": pct(0, 70), "--sky-x3": pct(30, 75), "--sky-y3": pct(60, 120), "--sky-angle": `${Math.round(100 + r() * 70)}deg` } as CSSProperties;
}
function SpaceSky({ id, kind }: { id: string; kind: string }) {
  return <span className="muse-space-sky" data-kind={kind} style={skyStyle(id)}><i /><SkyArt kind={kind} /></span>;
}

/**
 * Each kind of space has its own little scene on its sky, so spaces are told apart at a glance (Nov 26: "cute and
 * shnazzy"). Glassy white shapes with accents in the card's own palette; they drift gently unless motion is reduced.
 */
function SkyArt({ kind }: { kind: string }) {
  const art: Record<string, React.ReactNode> = {
    trip: <><path className="trail" d="M18 86C52 50 84 96 124 58" /><g className="cloud"><ellipse cx="62" cy="30" rx="16" ry="7" /><ellipse cx="74" cy="25" rx="11" ry="9" /><ellipse cx="86" cy="30" rx="13" ry="6" /></g>
      <g className="cloud small"><ellipse cx="176" cy="78" rx="12" ry="5" /><ellipse cx="185" cy="74" rx="8" ry="6" /></g>
      <g className="float"><g transform="translate(132 30) rotate(-14)"><path className="w" d="M0 16 38 0 25 34 18 21Z" /><path className="a" d="M18 21 38 0 14 18Z" /><path className="s" d="M18 21 21 31 25 34Z" /></g></g></>,
    home: <><g className="float"><path className="w" d="M128 92V44a26 26 0 0 1 52 0v48Z" /><path className="glow" d="M134 88V45a20 20 0 0 1 40 0v43Z" /><path className="frame" d="M154 25v63M134 58h40" /></g>
      <g className="float slow"><path className="a" d="M98 92h20l-3 -14h-14Z" /><path className="leaf" d="M108 78c-10-6-12-16-8-24 6 4 9 13 8 24Zm0 0c6-9 14-11 20-8-3 7-11 10-20 8Zm0 0c-1-12 3-22 10-26 3 8 0 18-10 26Z" /></g></>,
    gifts: <><g className="float"><rect className="w" x="126" y="44" width="50" height="40" rx="6" /><rect className="a" x="122" y="36" width="58" height="12" rx="4" /><path className="ribbon" d="M151 36v48" /><path className="bow" d="M151 36c-8-14-24-10-16-2 4 4 12 3 16 2Zm0 0c8-14 24-10 16-2-4 4-12 3-16 2Z" /></g>
      <g className="confetti"><rect x="104" y="30" width="5" height="9" rx="2" transform="rotate(24 106 34)" /><rect x="190" y="24" width="5" height="9" rx="2" transform="rotate(-30 192 28)" /><circle cx="114" cy="74" r="3" /><circle cx="194" cy="66" r="2.5" /><rect x="96" y="56" width="4" height="8" rx="2" transform="rotate(-50 98 60)" /></g></>,
    routine: <><g className="float"><circle className="bubble" cx="150" cy="54" r="24" /><path className="shine" d="M136 44a16 16 0 0 1 12-10" /></g><g className="float slow"><circle className="bubble" cx="186" cy="30" r="12" /><path className="shine" d="M180 25a7 7 0 0 1 5-5" /></g>
      <g className="float"><circle className="bubble" cx="112" cy="78" r="9" /><circle className="bubble" cx="190" cy="82" r="6" /></g></>,
    checklist: <><g className="float"><g transform="rotate(-8 154 52)"><rect className="w" x="122" y="18" width="64" height="72" rx="10" />
      {[0, 1, 2].map((i) => <g key={i}><rect className={i < 2 ? "a" : "box"} x="132" y={32 + i * 18} width="11" height="11" rx="3.5" />{i < 2 && <path className="tick" d={`M134.5 ${37.5 + i * 18}l2.5 2.5 4-5`} />}<rect className="line" x="149" y={34.5 + i * 18} width={i === 2 ? 22 : 28} height="5" rx="2.5" /></g>)}</g></g></>,
    space: <><g className="float slow"><rect className="w" x="120" y="30" width="38" height="44" rx="5" transform="rotate(-12 139 52)" /><rect className="a" x="125" y="35" width="28" height="26" rx="3" transform="rotate(-12 139 52)" /></g>
      <g className="float"><rect className="w" x="152" y="22" width="38" height="44" rx="5" transform="rotate(9 171 44)" /><rect className="b" x="157" y="27" width="28" height="26" rx="3" transform="rotate(9 171 44)" /></g>
      <g className="float slow"><rect className="w" x="140" y="58" width="34" height="38" rx="5" transform="rotate(-3 157 77)" /><rect className="c" x="145" y="62" width="24" height="22" rx="3" transform="rotate(-3 157 77)" /></g></>,
    template: <><g className="float"><path className="w" d="M136 14h40v76l-20-14-20 14Z" /><path className="a" d="M136 14h40v12h-40Z" /><path className="star" d="M156 40l3.5 7 7.5 1-5.5 5 1.5 7.5-7-3.5-7 3.5 1.5-7.5-5.5-5 7.5-1Z" /></g>
      <path className="trail" d="M114 34h10M108 52h14M114 70h10" /></>,
  };
  return <svg className="muse-sky-art" data-kind={kind} viewBox="0 0 210 104" preserveAspectRatio="xMaxYMid meet" aria-hidden="true" focusable="false">
    {art[kind] ?? art.space}
    <path className="spark" d="M98 20l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" /><path className="spark small" d="M196 50l1.4 3.6 3.6 1.4-3.6 1.4-1.4 3.6-1.4-3.6-3.6-1.4 3.6-1.4Z" />
  </svg>;
}

type CardStat = { done: number; total: number; pct: number; due: number; sections: number; next: string[]; more: number; repeats: boolean; trip: boolean; home: boolean; gifts: boolean; asLines: boolean; blocks: { cards: number; notes: number; photos: number } };
function ListCard({ list, stat, today, onOpen }: { list: MuseList; stat: CardStat; today: string; onOpen: () => void }) {
  const when = countdown(list, today);
  const [menu, setMenu] = useState(false), [confirm, setConfirm] = useState<HTMLElement | null>(null), anchor = useRef<HTMLButtonElement>(null);
  const style = spaceVars(list);
  const act = async (fn: () => Promise<unknown>) => { setMenu(false); await fn(); };
  return <li className="muse-lists-card" style={style}>
    <button type="button" className="muse-lists-card-open" onClick={onOpen} aria-label={`Open ${list.title}`}>
      <span className="muse-lists-cover" data-preset={list.preset} data-photo={list.cover ? true : undefined} aria-hidden="true">{list.cover ? <span className="muse-space-card-cover" style={{ "--focus": `${list.cover.focus}%` } as CSSProperties}><SpaceImg image={list.cover.image} thumb alt="" /></span> : <SpaceSky id={list.id} kind={list.isTemplate ? "template" : stat.trip ? "trip" : stat.home ? "home" : stat.gifts ? "gifts" : list.preset === "scheduled" ? "routine" : list.preset === "checklist" ? "checklist" : "space"} />}{when && <span className="muse-space-countdown">{when}</span>}<span className="muse-lists-card-icon">{list.icon ?? "✦"}</span>{list.pinned && <span className="muse-lists-pinned"><MuseIcon name="pin" size={11} />Pinned</span>}</span>
      <span className="muse-lists-card-text"><span className="muse-lists-kind">{list.isTemplate ? "Template" : stat.trip ? "Trip" : list.preset === "scheduled" ? "Routine" : list.preset === "project" ? "Space" : "Checklist"}</span><strong>{list.title}</strong>
        {list.description && <span className="muse-lists-desc">{list.description}</span>}</span>
      {stat.next.length > 0 ? <span className="muse-lists-next" data-lines={stat.asLines || undefined}>{stat.next.map((title, i) => <span key={i}><i />{title}</span>)}{stat.more > 0 ? <small>+{stat.more} more</small> : stat.more === 0 && stat.total - stat.done > stat.next.length && <small>+{stat.total - stat.done - stat.next.length} more</small>}</span>
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
