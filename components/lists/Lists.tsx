"use client";
import { useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { todayInTimeZone } from "@/lib/dates";
import { presetLabels, progress, starters, type ListPreset, type MuseList } from "@/lib/lists/model";
import { scheduleState } from "@/lib/lists/schedule";
import { accentCss } from "@/lib/appearance-values";
import { useDailyData } from "../daily/DailyData";
import { usePlanner } from "../PlannerStore";
import { GlassPopover } from "../GlassPopover";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { MuseMark } from "@/components/design/MuseHeading";
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

/** Mindspace → Lists (#110): the library, or one list when `?list=` is set. */
export function Lists() {
  const s = useLists(), { profile } = useDailyData(), today = todayInTimeZone(profile.timeZone);
  const params = useSearchParams(), router = useRouter(), openId = params.get("list");
  const open = (id: string | null) => router.push(id ? `/notes?view=lists&list=${id}` : "/notes?view=lists", { scroll: false });
  const list = openId ? s.lists.find((l) => l.id === openId) : null;
  if (openId && list) return <ListView listId={list.id} today={today} onBack={() => open(null)} onOpen={open} />;
  return <ListsLibrary today={today} onOpen={open} />;
}

export function ListsSaveStatus() {
  const s = useLists();
  return <div className="muse-daily-save-state" role="status" aria-live="polite"><SaveIndicator label="Lists" loaded={s.loaded} pending={false} saving={false} error={s.error} refreshing={false} /></div>;
}

function ListsLibrary({ today, onOpen }: { today: string; onOpen: (id: string) => void }) {
  const s = useLists(), { state: planner } = usePlanner();
  const [query, setQuery] = useState(""), [scope, setScope] = useState<Scope>("active"), [sort, setSort] = useState<Sort>("updated");
  const [creating, setCreating] = useState(false), newAnchor = useRef<HTMLButtonElement>(null);
  const stats = useMemo(() => new Map(s.lists.map((l) => {
    const items = s.items.filter((i) => i.listId === l.id), events = items.flatMap((i) => effectiveEvents(i, s.events, planner));
    const due = items.filter((i) => i.schedule ? scheduleState(i.schedule, events.filter((e) => e.itemId === i.id), today).due : !i.completedAt && !!i.dueDate && i.dueDate <= today).length;
    const next = items.filter((i) => !i.completedAt).sort((x, y) => x.position - y.position).slice(0, 3).map((i) => i.title);
    return [l.id, { ...progress(items, events, today), due, sections: s.sections.filter((x) => x.listId === l.id).length, next, repeats: items.some((i) => !!i.schedule) }];
  })), [s, planner, today]);
  const shown = s.lists
    .filter((l) => scope === "templates" ? l.isTemplate && !l.archivedAt : scope === "archived" ? !!l.archivedAt : !l.isTemplate && !l.archivedAt)
    .filter((l) => !query.trim() || `${l.title} ${l.description ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (sort === "name" ? a.title.localeCompare(b.title) : sort === "due" ? (stats.get(b.id)?.due ?? 0) - (stats.get(a.id)?.due ?? 0) : b.updatedAt.localeCompare(a.updatedAt)));
  const counts = { active: s.lists.filter((l) => !l.isTemplate && !l.archivedAt).length, templates: s.lists.filter((l) => l.isTemplate && !l.archivedAt).length, archived: s.lists.filter((l) => l.archivedAt).length };

  return <section className="muse-lists" aria-label="Lists">
    <div className="muse-lists-toolbar">
      <label className="muse-search muse-edge muse-lists-search"><MuseIcon name="search" size={15} /><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search lists…" aria-label="Search lists" /></label>
      <MuseChoiceMenu label="Sort lists" valueLabel={sorts.find((x) => x.id === sort)!.label} options={sorts} selectedIds={[sort]} onSelect={(id) => setSort(id as Sort)} />
      <button ref={newAnchor} type="button" className="muse-button muse-lists-new" aria-expanded={creating} onClick={() => setCreating(true)}><MuseIcon name="plus" size={14} /> New list</button>
    </div>
    <div className="muse-chip-row muse-lists-scopes" role="group" aria-label="Show">
      {(["active", "templates", "archived"] as Scope[]).map((x) => <button key={x} type="button" aria-pressed={scope === x} onClick={() => setScope(x)}>{x === "active" ? "Lists" : x === "templates" ? "Templates" : "Archived"} <small>{counts[x]}</small></button>)}
    </div>
    {!s.loaded ? <p className="small-label">Loading your lists…</p> : s.error && !s.lists.length ? <p className="small-label" role="alert">{s.error}</p>
      : shown.length ? <ul className="muse-lists-grid">{shown.map((l) => <ListCard key={l.id} list={l} stat={stats.get(l.id)!} today={today} onOpen={() => onOpen(l.id)} />)}</ul>
      : <div className="muse-empty-state muse-lists-empty" data-variant="editorial"><span className="muse-lists-empty-art" aria-hidden="true"><MuseMark icon="suitcase" tone={2} size="lg" /><MuseMark icon="checklist" tone={1} size="lg" /><MuseMark icon="basket" tone={4} size="lg" /></span><h3>{query ? "Nothing by that name" : scope === "active" ? "A list for everything, and everything on a list." : scope === "templates" ? "No templates yet" : "Nothing archived"}</h3><p>{query ? "No lists match that search." : scope === "templates" ? "No templates yet. Open a list and choose Save as template." : scope === "archived" ? "Nothing archived." : "No lists yet. Start one for packing, cleaning, a project — anything."}</p>{scope === "active" && !query && <button type="button" className="muse-button" onClick={() => setCreating(true)}>Create a list</button>}</div>}
    <GlassPopover id="lists-new" label="New list" open={creating} anchorRef={newAnchor} onClose={() => setCreating(false)} width={420}>
      {creating && <NewList today={today} onDone={(id) => { setCreating(false); if (id) onOpen(id); }} />}
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

function ListCard({ list, stat, today, onOpen }: { list: MuseList; stat: { done: number; total: number; pct: number; due: number; sections: number; next: string[]; repeats: boolean }; today: string; onOpen: () => void }) {
  const [menu, setMenu] = useState(false), [confirm, setConfirm] = useState<HTMLElement | null>(null), anchor = useRef<HTMLButtonElement>(null);
  const style = { "--list-accent": accentCss(list.accent) } as CSSProperties;
  const act = async (fn: () => Promise<unknown>) => { setMenu(false); await fn(); };
  return <li className="muse-lists-card" style={style}>
    <button type="button" className="muse-lists-card-open" onClick={onOpen} aria-label={`Open ${list.title}`}>
      <span className="muse-lists-cover" data-preset={list.preset} aria-hidden="true"><ListCover preset={list.preset} /><span className="muse-lists-card-icon">{list.icon ?? "✦"}</span>{list.pinned && <span className="muse-lists-pinned"><MuseIcon name="pin" size={11} />Pinned</span>}</span>
      <span className="muse-lists-card-text"><span className="muse-lists-kind">{list.isTemplate ? "Template" : list.preset === "scheduled" ? "Routine" : list.preset === "project" ? "Project" : "Checklist"}</span><strong>{list.title}</strong>
        {list.description && <span className="muse-lists-desc">{list.description}</span>}</span>
      {stat.next.length > 0 ? <span className="muse-lists-next">{stat.next.map((title, i) => <span key={i}><i />{title}</span>)}{stat.total - stat.done > stat.next.length && <small>+{stat.total - stat.done - stat.next.length} more</small>}</span>
        : <span className="muse-lists-next" data-empty>{stat.total ? "Everything here is done." : "Nothing on this list yet."}</span>}
      <span className="muse-lists-meta">
        {!list.isTemplate && stat.total > 0 && <span className="muse-lists-progress-row" role="img" aria-label={`${stat.done} of ${stat.total} done`}><span className="muse-list-progress"><span style={{ width: `${stat.pct}%` }} /></span><b>{stat.done}/{stat.total}</b></span>}
        <span className="muse-lists-chips">{stat.due > 0 && <span data-tone="due">{stat.due} due</span>}{stat.sections > 0 && <span>{stat.sections} section{stat.sections === 1 ? "" : "s"}</span>}{stat.repeats && <span>↻ repeats</span>}{list.isTemplate && <span>{stat.total} item{stat.total === 1 ? "" : "s"}</span>}</span>
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
    {confirm && <MuseModal id={`list-delete-${list.id}`} label="Delete list?" returnFocus={confirm} onClose={() => setConfirm(null)}>
      <h2>Delete “{list.title}”?</h2><p>This permanently deletes the list, its sections, items and history. Linked Planner tasks stay in the Planner.</p>
      <div className="muse-lists-modal-actions"><button type="button" className="muse-button" onClick={() => { setConfirm(null); void deleteList(list.id); }}>Delete list</button><button type="button" className="muse-button button-ghost" onClick={() => setConfirm(null)}>Keep it</button></div>
    </MuseModal>}
  </li>;
}

/** Title + a starting point. Presets are only starting configurations; templates make independent copies. */
function NewList({ today, onDone }: { today: string; onDone: (id: string | null) => void }) {
  const s = useLists(), [title, setTitle] = useState(""), [pick, setPick] = useState<string>("blank:checklist"), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const userTemplates = s.lists.filter((l) => l.isTemplate && !l.archivedAt);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const [kind, id] = pick.split(":");
      if (kind === "template") { const src = userTemplates.find((t) => t.id === id)!; onDone(await copyList(id, { title: title.trim() || src.title, isTemplate: false, today })); }
      else if (kind === "blank") onDone(await createList({ starterId: "blank", title: title.trim() || "Untitled list", preset: id as ListPreset, today }));
      else onDone(await createList({ starterId: id, title: title.trim() || undefined, today }));
    } catch { setError("That list didn’t save. Please try again."); } finally { setBusy(false); }
  }
  const option = (value: string, label: string, detail: string, icon: string) => <label key={value} className="muse-lists-start" data-selected={pick === value || undefined}>
    <input type="radio" name="list-start" value={value} checked={pick === value} onChange={() => setPick(value)} /><span aria-hidden="true">{icon}</span><span><strong>{label}</strong><small>{detail}</small></span></label>;
  return <form className="muse-lists-new-form" onSubmit={submit}>
    <label className="editor-label" htmlFor="list-new-title">Title</label>
    <input id="list-new-title" autoFocus maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="London 2027, Home reset, Gift ideas…" />
    <p className="editor-label">Start from</p>
    <div className="muse-lists-starts">
      {(Object.keys(presetLabels) as ListPreset[]).map((p) => option(`blank:${p}`, p === "checklist" ? "Blank list" : `Blank ${presetLabels[p].label.toLowerCase()}`, presetLabels[p].detail, p === "checklist" ? "✦" : p === "scheduled" ? "🔁" : "🧩"))}
      {starters.filter((x) => x.id !== "blank").map((st) => option(`starter:${st.id}`, st.title, st.description, st.icon))}
      {userTemplates.map((t) => option(`template:${t.id}`, t.title, "Your template", t.icon ?? "✦"))}
    </div>
    <p className="small-label">Templates make an independent copy. You can add schedules, sections or fields to any list later.</p>
    {error && <p className="small-label" role="alert">{error}</p>}
    <div className="muse-lists-modal-actions"><button type="submit" className="muse-button" disabled={busy}>{busy ? "Creating…" : "Create list"}</button><button type="button" className="muse-button button-ghost" onClick={() => onDone(null)}>Cancel</button></div>
  </form>;
}
