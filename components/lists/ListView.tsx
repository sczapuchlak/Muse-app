"use client";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { frequencyGroups, itemGroups, itemSorts, sortItems, type ItemGroup, type ItemSort } from "@/lib/lists/order";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type FormEvent, type KeyboardEvent } from "react";
import { accentCss } from "@/lib/appearance-values";
import { listAccents, progress, LIMITS, type ListField, type ListItem, type ListSection, type MuseList } from "@/lib/lists/model";
import { itemHistory, periodFor, plannedOn, scheduleState, type ListEvent } from "@/lib/lists/schedule";
import { shiftDate } from "@/lib/dates";
import { usePlanner } from "../PlannerStore";
import { useMuseSpark } from "../MuseSpark";
import { MuseIcon } from "../MuseIcon";
import { GlassPopover } from "../GlassPopover";
import { MuseModal } from "../MuseModal";
import { EmojiButton } from "../EmojiPicker";
import { useAspirations } from "../rituals/aspirations/useAspirations";
import { addItem, addSection, bundleOf, copyList, deleteList, deleteSection, moveItem, moveSection, removeEvent, resetChecklist, syncTaskCopies, toggleItem, updateItem, updateList, updateSection, useLists } from "./ListsStore";
import { effectiveEvents, linkedTask, plannerEvents, toggleViaPlanner } from "./taskLink";
import { ItemDetails } from "./ItemDetails";

type View = "all" | "week" | "due" | "history";
const weekdayShort = (d: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const shortDate = (d: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const mondayOf = (d: string) => { const wd = new Date(`${d}T12:00:00Z`).getUTCDay(); return shiftDate(d, -((wd + 6) % 7)); };

export function ListView({ listId, today, onBack, onOpen }: { listId: string; today: string; onBack: () => void; onOpen: (id: string) => void }) {
  const s = useLists(), { state: planner, dispatch } = usePlanner();
  const b = useMemo(() => bundleOf(s, listId)!, [s, listId]), list = b.list;
  const [view, setView] = useState<View>("all"), [settings, setSettings] = useState(false), settingsAnchor = useRef<HTMLButtonElement>(null);
  const [detail, setDetail] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const detailAnchor = useMemo(() => ({ current: detail?.anchor ?? null }), [detail]);
  const eventsOf = useMemo(() => { const m = new Map<string, ListEvent[]>(); for (const i of b.items) m.set(i.id, effectiveEvents(i, s.events, planner)); return m; }, [b, s.events, planner]);
  const allEvents = useMemo(() => [...eventsOf.values()].flat(), [eventsOf]);
  const scheduled = b.items.some((i) => i.schedule), prog = progress(b.items, allEvents, today);

  // Linked tasks: keep the history copy in step with the Planner (the Planner stays the source of truth while linked).
  const plannerKey = `${planner.tasks.length}|${(planner.occurrences ?? []).length}|${planner.tasks.filter((t) => t.complete).length}`;
  useEffect(() => {
    for (const item of b.items) {
      const task = linkedTask(item, planner); if (!task) continue;
      if (item.schedule) void syncTaskCopies(item.id, plannerEvents(item, planner)).catch(() => {});
      else if (task.complete !== !!item.completedAt) void updateItem(item.id, { completedAt: task.complete ? task.completedAt ?? new Date().toISOString() : null, completedOn: task.complete ? today : null }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plannerKey, b.items.length]);

  const toggle = (item: ListItem) => linkedTask(item, planner) ? toggleViaPlanner(item, dispatch, today) : void toggleItem(item, today);
  const openDetail = (id: string, anchor: HTMLElement) => setDetail({ id, anchor });
  // #12: display-only grouping and sorting; "My order" by section is the saved manual order (and the only drag mode).
  const manual = list.itemGroup === "section" && list.itemSort === "manual";
  const order = (xs: ListItem[]) => sortItems(xs, list.itemSort, (id) => eventsOf.get(id) ?? [], today);
  const ctx: RowCtx = { list, today, eventsOf, sections: b.sections, toggle, openDetail, order, manual };
  const unsorted = b.items.filter((i) => !i.sectionId || !b.sections.some((x) => x.id === i.sectionId));
  const style = { "--list-accent": accentCss(list.accent) } as CSSProperties;

  return <section className="muse-list" style={style} aria-label={list.title}>
    <button type="button" className="text-button muse-list-back" onClick={onBack}>← All lists</button>
    <header className="muse-list-head">
      <EmojiButton value={list.icon} onChange={(icon) => void updateList(list.id, { icon })} label="List icon" />
      <div className="muse-list-titles">
        <InlineText className="muse-list-title" value={list.title} max={LIMITS.title} label="List title" onSave={(title) => updateList(list.id, { title })} />
        <InlineText className="muse-list-desc" value={list.description ?? ""} max={LIMITS.description} label="Description" placeholder="Add a description" onSave={(d) => updateList(list.id, { description: d || null })} />
        <p className="small-label">{list.isTemplate ? "Template · " : ""}{prog.done} of {prog.total} done{list.startDate ? ` · ${shortDate(list.startDate)}${list.endDate ? ` – ${shortDate(list.endDate)}` : ""}` : ""}</p>
      </div>
      <button ref={settingsAnchor} type="button" className="muse-button muse-lists-icon" aria-label="List settings" aria-expanded={settings} onClick={() => setSettings(true)}><MuseIcon name="settings" size={16} /></button>
    </header>
    {prog.total > 0 && <div className="muse-list-progress" role="progressbar" aria-valuenow={prog.pct} aria-valuemin={0} aria-valuemax={100} aria-label="List progress"><span style={{ width: `${prog.pct}%` }} /></div>}
    <div className="muse-list-viewbar">
      {scheduled ? <div className="muse-chip-row muse-list-views" role="group" aria-label="List view">
        {(["all", "week", "due", "history"] as View[]).map((v) => <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{v === "all" ? "All items" : v === "week" ? "This week" : v === "due" ? "Due" : "History"}</button>)}
      </div> : <span />}
      {view === "all" && !(list.tableView && list.fields.length > 0) && <div className="muse-list-arrange">
        <MuseChoiceMenu label="Group by" valueLabel={`Group: ${itemGroups.find((g) => g.id === list.itemGroup)!.label}`} options={itemGroups} selectedIds={[list.itemGroup]} onSelect={(id) => void updateList(list.id, { itemGroup: id as ItemGroup })} />
        <MuseChoiceMenu label="Sort by" valueLabel={`Sort: ${itemSorts.find((g) => g.id === list.itemSort)!.label}`} options={itemSorts} selectedIds={[list.itemSort]} onSelect={(id) => void updateList(list.id, { itemSort: id as ItemSort })} />
      </div>}
      {view === "all" && !(list.tableView && list.fields.length > 0) && <div className="muse-segmented muse-list-columns" role="group" aria-label="Section columns">
        {([0, 1, 2, 3] as const).map((n) => <button key={n} type="button" aria-pressed={list.columns === n} title={n ? `${n} column${n > 1 ? "s" : ""}` : "As many as fit"} onClick={() => void updateList(list.id, { columns: n })}>{n ? n : "Auto"}</button>)}
      </div>}
    </div>

    {view === "all" && <>
      {list.tableView && list.fields.length > 0 ? <TableView ctx={ctx} items={b.items} /> : <>
        <div className="muse-list-sections" data-columns={list.columns}>
        {list.itemGroup === "section" ? <>
          {(unsorted.length > 0 || b.sections.length === 0) && <SectionBlock ctx={ctx} section={null} items={unsorted} />}
          {b.sections.map((sec, i) => <SectionBlock key={sec.id} ctx={ctx} section={sec} items={b.items.filter((it) => it.sectionId === sec.id)} first={i === 0} last={i === b.sections.length - 1} />)}
        </> : list.itemGroup === "frequency" ? frequencyGroups(b.items).map((g) => <SectionBlock key={g.label} ctx={ctx} section={null} title={g.label} items={g.items} />)
          : <SectionBlock ctx={ctx} section={null} title="All items" items={b.items} />}
        </div>
      </>}
      <AddSection listId={list.id} />
    </>}
    {view === "week" && <WeekView ctx={ctx} items={b.items} />}
    {view === "due" && <DueView ctx={ctx} items={b.items} />}
    {view === "history" && <HistoryView ctx={ctx} items={b.items} />}

    <GlassPopover id={`list-item-detail`} label="Item details" open={!!detail} anchorRef={detailAnchor} onClose={() => setDetail(null)} width={400}>
      {detail && b.items.some((i) => i.id === detail.id) && <ItemDetails key={detail.id} item={b.items.find((i) => i.id === detail.id)!} list={list} sections={b.sections} items={b.items} events={eventsOf.get(detail.id) ?? []} today={today} onClose={() => setDetail(null)} />}
    </GlassPopover>
    <GlassPopover id="list-settings" label="List settings" open={settings} anchorRef={settingsAnchor} onClose={() => setSettings(false)} width={380}>
      {settings && <ListSettings list={list} today={today} onBack={onBack} onOpen={onOpen} onClose={() => setSettings(false)} />}
    </GlassPopover>
  </section>;
}

type RowCtx = { list: MuseList; today: string; eventsOf: Map<string, ListEvent[]>; sections: ListSection[]; toggle: (i: ListItem) => void; openDetail: (id: string, a: HTMLElement) => void; order: (items: ListItem[]) => ListItem[]; manual: boolean };

function SectionBlock({ ctx, section, items, first, last, title }: { ctx: RowCtx; section: ListSection | null; items: ListItem[]; first?: boolean; last?: boolean; /** A display group (frequency / all items) instead of a section. */ title?: string }) {
  const [over, setOver] = useState(false), [confirm, setConfirm] = useState<HTMLElement | null>(null);
  const sorted = ctx.order(items), prog = progress(sorted, sorted.flatMap((i) => ctx.eventsOf.get(i.id) ?? []), ctx.today);
  const collapsed = !!section?.collapsed;
  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData("text/muse-list-item"); if (id) void moveItem(id, section?.id ?? null, sorted.length); };
  return <section className="muse-list-section" data-over={over || undefined} style={section?.accent ? { "--section-accent": accentCss(section.accent) } as CSSProperties : undefined}
    onDragOver={(e) => { if (ctx.manual && !title && e.dataTransfer.types.includes("text/muse-list-item")) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
    <header className="muse-list-section-head">
      {section ? <>
        <button type="button" className="muse-lists-mini" aria-expanded={!collapsed} aria-label={`${collapsed ? "Expand" : "Collapse"} ${section.title}`} onClick={() => void updateSection(section.id, { collapsed: !collapsed })}><span aria-hidden="true" className="muse-list-chevron" data-open={!collapsed || undefined}>›</span></button>
        <InlineText className="muse-list-section-title" value={section.title} max={LIMITS.sectionTitle} label="Section name" onSave={(title) => updateSection(section.id, { title })} />
      </> : <h3 className="muse-list-section-title">{title ?? (ctx.sections.length ? "Unsorted" : "Items")}</h3>}
      <small className="muse-list-count">{prog.done}/{prog.total}</small>
      {section && <span className="muse-list-section-tools">
        <button type="button" className="muse-lists-mini" aria-label={`Move ${section.title} up`} disabled={first} onClick={() => void moveSection(section.id, -1)}>↑</button>
        <button type="button" className="muse-lists-mini" aria-label={`Move ${section.title} down`} disabled={last} onClick={() => void moveSection(section.id, 1)}>↓</button>
        <button type="button" className="muse-lists-mini" aria-label={`Delete ${section.title}`} onClick={(e) => setConfirm(e.currentTarget)}><MuseIcon name="trash" size={13} /></button>
      </span>}
    </header>
    {!collapsed && <>
      <ul className="muse-list-items">{sorted.map((it, i) => <ItemRow key={it.id} ctx={ctx} item={it} index={i} />)}</ul>
      <QuickAdd listId={ctx.list.id} sectionId={section?.id ?? null} />
    </>}
    {confirm && section && <MuseModal id={`section-delete-${section.id}`} label="Delete section?" returnFocus={confirm} onClose={() => setConfirm(null)}>
      <h2>Delete “{section.title}”?</h2><p>Its {items.length} item{items.length === 1 ? "" : "s"} move to Unsorted. Nothing else is deleted.</p>
      <div className="muse-lists-modal-actions"><button type="button" className="muse-button" onClick={() => { setConfirm(null); void deleteSection(section.id); }}>Delete section</button><button type="button" className="muse-button button-ghost" onClick={() => setConfirm(null)}>Keep it</button></div>
    </MuseModal>}
  </section>;
}

function ItemRow({ ctx, item, index }: { ctx: RowCtx; item: ListItem; index: number }) {
  const { trigger, spark } = useMuseSpark();
  const events = ctx.eventsOf.get(item.id) ?? [], st = item.schedule ? scheduleState(item.schedule, events, ctx.today) : null;
  const done = st ? st.status === "completed" || st.status === "skipped" : !!item.completedAt;
  const chips: { text: string; tone?: string }[] = [];
  if (st) chips.push({ text: st.status === "skipped" ? "Skipped" : st.status === "completed" ? "Done this period" : st.overdue ? `Missed ${st.missedSinceLast}` : st.planned && st.planned !== ctx.today ? `${weekdayShort(st.planned)}` : st.due ? "Due" : "Upcoming", tone: st.overdue && !done ? "warn" : st.due && !done ? "due" : undefined }, { text: `↻ ${st.label.split(" · ")[0]}` });
  if (!st && item.dueDate) chips.push({ text: shortDate(item.dueDate), tone: !done && item.dueDate < ctx.today ? "warn" : undefined });
  if (item.priority === "high") chips.push({ text: "High", tone: "due" });
  for (const f of ctx.list.fields) { const v = item.fieldValues[f.id]; if (v !== undefined && v !== null && v !== "" && v !== false) chips.push({ text: f.type === "checkbox" ? f.name : f.type === "number" ? `${f.name} ${v}` : String(v) }); }
  if (item.linkKind === "task") chips.push({ text: "Planner" });
  return <li className="muse-list-item" data-done={done || undefined} draggable={ctx.manual} onDragStart={(e) => { e.dataTransfer.setData("text/muse-list-item", item.id); e.dataTransfer.effectAllowed = "move"; }}
    onDragOver={(e) => { if (e.dataTransfer.types.includes("text/muse-list-item")) e.preventDefault(); }}
    onDrop={(e) => { const id = e.dataTransfer.getData("text/muse-list-item"); if (id && id !== item.id) { e.preventDefault(); e.stopPropagation(); void moveItem(id, item.sectionId, index); } }}>
    <label className="muse-list-check"><input type="checkbox" checked={done} onChange={() => { if (!done) trigger(); ctx.toggle(item); }} aria-label={`${done ? "Mark not done" : "Mark done"}: ${item.title}`} /><span aria-hidden="true">{done && <MuseIcon name="check" size={12} />}{spark}</span></label>
    <button type="button" className="muse-list-item-title" onClick={(e) => ctx.openDetail(item.id, e.currentTarget)} aria-label={`${item.title}. Details`}>
      <span>{item.title}</span>
      {chips.length > 0 && <span className="muse-list-chips">{chips.map((c, i) => <small key={i} data-tone={c.tone}>{c.text}</small>)}</span>}
    </button>
  </li>;
}

function QuickAdd({ listId, sectionId }: { listId: string; sectionId: string | null }) {
  const [text, setText] = useState("");
  const submit = (e: FormEvent) => { e.preventDefault(); const t = text.trim(); if (!t) return; setText(""); void addItem(listId, sectionId, t); };
  return <form className="muse-list-quickadd" onSubmit={submit}><span aria-hidden="true">+</span><input value={text} maxLength={LIMITS.itemTitle} onChange={(e) => setText(e.target.value)} placeholder="Add an item" aria-label="Add an item" /></form>;
}

function AddSection({ listId }: { listId: string }) {
  const [text, setText] = useState("");
  const submit = (e: FormEvent) => { e.preventDefault(); const t = text.trim(); if (!t) return; setText(""); void addSection(listId, t); };
  return <form className="muse-list-addsection" onSubmit={submit}><input value={text} maxLength={LIMITS.sectionTitle} onChange={(e) => setText(e.target.value)} placeholder="+ Add a section (Kitchen, Clothing, Sewing…)" aria-label="Add a section" /></form>;
}

/** Click to edit; Enter or blur saves; Escape cancels. */
function InlineText({ value, onSave, label, max, className, placeholder }: { value: string; onSave: (v: string) => unknown; label: string; max: number; className?: string; placeholder?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => { if (draft === null) return; const v = draft.trim(); setDraft(null); if (v !== value && (v || placeholder)) void onSave(v); };
  if (draft === null) return <button type="button" className={`muse-inline-text ${className ?? ""}`} data-empty={!value || undefined} onClick={() => setDraft(value)} aria-label={`${label}: ${value || "empty"}. Edit`}>{value || placeholder}</button>;
  return <input className={`muse-inline-input ${className ?? ""}`} autoFocus value={draft} maxLength={max} aria-label={label} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setDraft(null); }} />;
}

function TableView({ ctx, items }: { ctx: RowCtx; items: ListItem[] }) {
  const sectionName = (id: string | null) => ctx.sections.find((s) => s.id === id)?.title ?? "—";
  const rows = [...items].sort((a, b) => (ctx.sections.findIndex((s) => s.id === a.sectionId) - ctx.sections.findIndex((s) => s.id === b.sectionId)) || a.position - b.position);
  return <div className="muse-list-table-wrap"><table className="muse-list-table">
    <thead><tr><th scope="col"><span className="sr-only">Done</span></th><th scope="col">Item</th>{ctx.sections.length > 0 && <th scope="col">Section</th>}{ctx.list.fields.map((f) => <th key={f.id} scope="col">{f.name}</th>)}</tr></thead>
    <tbody>{rows.map((it) => {
      const ev = ctx.eventsOf.get(it.id) ?? [], st = it.schedule ? scheduleState(it.schedule, ev, ctx.today) : null, done = st ? st.status === "completed" || st.status === "skipped" : !!it.completedAt;
      return <tr key={it.id} data-done={done || undefined}>
        <td><label className="muse-list-check"><input type="checkbox" checked={done} onChange={() => ctx.toggle(it)} aria-label={`${done ? "Mark not done" : "Mark done"}: ${it.title}`} /><span aria-hidden="true">{done && <MuseIcon name="check" size={12} />}</span></label></td>
        <td><button type="button" className="muse-list-item-title" onClick={(e) => ctx.openDetail(it.id, e.currentTarget)}>{it.title}</button></td>
        {ctx.sections.length > 0 && <td>{sectionName(it.sectionId)}</td>}
        {ctx.list.fields.map((f) => <td key={f.id}><FieldCell field={f} item={it} /></td>)}
      </tr>;
    })}</tbody></table>
    <QuickAdd listId={ctx.list.id} sectionId={null} /></div>;
}

export function FieldCell({ field, item }: { field: ListField; item: ListItem }) {
  const v = item.fieldValues[field.id], set = (val: string | number | boolean | null) => void updateItem(item.id, { fieldValues: { ...item.fieldValues, [field.id]: val } });
  const label = `${field.name} for ${item.title}`;
  if (field.type === "checkbox") return <input type="checkbox" checked={v === true} onChange={(e) => set(e.target.checked)} aria-label={label} />;
  if (field.type === "select") return <select value={typeof v === "string" ? v : ""} onChange={(e) => set(e.target.value || null)} aria-label={label}><option value="">—</option>{(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}</select>;
  return <input className="muse-list-cell" type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "url" ? "url" : "text"} defaultValue={v === null || v === undefined ? "" : String(v)} aria-label={label}
    onBlur={(e) => { const raw = e.target.value.trim(); const next = raw === "" ? null : field.type === "number" ? Number(raw) : raw.slice(0, 300); if (next !== (v ?? null)) set(next); }} />;
}

function WeekView({ ctx, items }: { ctx: RowCtx; items: ListItem[] }) {
  const start = mondayOf(ctx.today), days = Array.from({ length: 7 }, (_, i) => shiftDate(start, i)), end = days[6];
  const anytime = items.filter((i) => i.schedule?.mode === "flexible" && (() => { const p = periodFor(i.schedule!, ctx.today); return !!p && p.start <= end && p.end >= start; })());
  const on = (d: string) => items.filter((i) => i.schedule ? plannedOn(i.schedule, ctx.eventsOf.get(i.id) ?? [], d) : i.dueDate === d);
  return <div className="muse-list-week">
    {days.map((d) => <section key={d} className="muse-list-day" data-today={d === ctx.today || undefined} aria-label={d}>
      <h4><span>{weekdayShort(d)}</span> {Number(d.slice(8))}</h4>
      <ul className="muse-list-items">{on(d).map((it, i) => <ItemRow key={it.id} ctx={ctx} item={it} index={i} />)}</ul>
    </section>)}
    <section className="muse-list-day muse-list-anytime"><h4>Any day this week</h4>
      {anytime.length ? <ul className="muse-list-items">{anytime.map((it, i) => <ItemRow key={it.id} ctx={ctx} item={it} index={i} />)}</ul> : <p className="small-label">Nothing flexible this week.</p>}</section>
  </div>;
}

function DueView({ ctx, items }: { ctx: RowCtx; items: ListItem[] }) {
  const soon = shiftDate(ctx.today, 7), groups: Record<string, ListItem[]> = { "Missed or overdue": [], "Due now": [], "Coming up": [] };
  for (const it of items) {
    if (it.schedule) { const st = scheduleState(it.schedule, ctx.eventsOf.get(it.id) ?? [], ctx.today); if (st.status === "completed" || st.status === "skipped") continue;
      if (st.overdue) groups["Missed or overdue"].push(it); else if (st.due) groups["Due now"].push(it); else if (st.planned && st.planned <= soon) groups["Coming up"].push(it); }
    else if (!it.completedAt && it.dueDate) { if (it.dueDate < ctx.today) groups["Missed or overdue"].push(it); else if (it.dueDate === ctx.today) groups["Due now"].push(it); else if (it.dueDate <= soon) groups["Coming up"].push(it); }
  }
  const any = Object.values(groups).some((g) => g.length);
  return <div className="muse-list-due">{any ? Object.entries(groups).filter(([, g]) => g.length).map(([name, g]) => <section key={name} className="muse-list-section"><header className="muse-list-section-head"><h3 className="muse-list-section-title">{name}</h3><small className="muse-list-count">{g.length}</small></header>
    <ul className="muse-list-items">{g.map((it, i) => <ItemRow key={it.id} ctx={ctx} item={it} index={i} />)}</ul></section>) : <p className="muse-empty-state">Nothing due. Enjoy it.</p>}</div>;
}

function HistoryView({ ctx, items }: { ctx: RowCtx; items: ListItem[] }) {
  const rows = items.filter((i) => i.schedule).flatMap((it) => itemHistory(it.schedule!, ctx.eventsOf.get(it.id) ?? [], ctx.today, 20).map((h) => ({ ...h, item: it })))
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60);
  return <ul className="muse-list-history">{rows.length ? rows.map((r, i) => <li key={i} data-kind={r.kind}>
    <span className="muse-list-history-kind">{r.kind === "completed" ? "✓" : r.kind === "skipped" ? "↷" : "·"}</span>
    <span><strong>{r.item.title}</strong><small>{r.kind === "completed" ? `Done ${shortDate(r.date)}` : r.kind === "skipped" ? `Skipped · ${shortDate(r.periodStart)}–${shortDate(r.periodEnd)}` : `Missed · ${shortDate(r.periodStart)}–${shortDate(r.periodEnd)}`}</small></span>
    {r.kind !== "missed" && r.item.linkKind !== "task" && <button type="button" className="text-button" onClick={() => void removeEvent(r.item.id, r.periodStart, r.kind as ListEvent["kind"])}>Undo</button>}
  </li>) : <li className="small-label muse-list-history-empty">No history yet. Completed, skipped and missed periods show up here.</li>}</ul>;
}

function ListSettings({ list, today, onBack, onOpen, onClose }: { list: MuseList; today: string; onBack: () => void; onOpen: (id: string) => void; onClose: () => void }) {
  const { aspirations } = useAspirations(), [confirm, setConfirm] = useState(false), [field, setField] = useState({ name: "", type: "text" as ListField["type"], options: "" });
  const addField = () => {
    const name = field.name.trim(); if (!name || list.fields.length >= LIMITS.fields) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "field";
    const unique = list.fields.some((f) => f.id === id) ? `${id}-${list.fields.length + 1}` : id;
    const def: ListField = { id: unique, name: name.slice(0, 40), type: field.type, ...(field.type === "select" ? { options: field.options.split(",").map((o) => o.trim()).filter(Boolean).slice(0, 20) } : {}) };
    void updateList(list.id, { fields: [...list.fields, def] }); setField({ name: "", type: "text", options: "" });
  };
  return <div className="muse-list-settings">
    <p className="editor-label">Colour</p>
    <div className="muse-list-swatches" role="group" aria-label="List colour">{listAccents.map((a) => <button key={a} type="button" aria-pressed={list.accent === a} aria-label={a} style={{ background: accentCss(a) }} onClick={() => void updateList(list.id, { accent: a })} />)}</div>
    <div className="muse-list-dates"><label>Starts<input type="date" value={list.startDate ?? ""} onChange={(e) => void updateList(list.id, { startDate: e.target.value || null })} /></label>
      <label>Ends<input type="date" value={list.endDate ?? ""} min={list.startDate ?? undefined} onChange={(e) => void updateList(list.id, { endDate: e.target.value || null })} /></label></div>
    <p className="editor-label">Fields</p>
    {list.fields.length > 0 && <ul className="muse-list-fields">{list.fields.map((f) => <li key={f.id}><span>{f.name} <small>{f.type}{f.options?.length ? ` · ${f.options.join(", ")}` : ""}</small></span><button type="button" className="text-button" onClick={() => void updateList(list.id, { fields: list.fields.filter((x) => x.id !== f.id) })}>Remove</button></li>)}</ul>}
    {list.fields.length < LIMITS.fields && <div className="muse-list-addfield">
      <input value={field.name} maxLength={40} placeholder="Field name (Qty, Status…)" aria-label="Field name" onChange={(e) => setField({ ...field, name: e.target.value })} />
      <select value={field.type} aria-label="Field type" onChange={(e) => setField({ ...field, type: e.target.value as ListField["type"] })}>{["text", "number", "date", "select", "url", "checkbox"].map((t) => <option key={t} value={t}>{t}</option>)}</select>
      {field.type === "select" && <input value={field.options} placeholder="Options, comma separated" aria-label="Options" onChange={(e) => setField({ ...field, options: e.target.value })} />}
      <button type="button" className="muse-button button-ghost" onClick={addField}>Add field</button></div>}
    <label className="muse-check-row"><input type="checkbox" checked={list.tableView} disabled={!list.fields.length} onChange={(e) => void updateList(list.id, { tableView: e.target.checked })} />Table view (desktop)</label>
    <p className="editor-label">Show elsewhere</p>
    <label className="muse-check-row"><input type="checkbox" checked={list.showInDaily} onChange={(e) => void updateList(list.id, { showInDaily: e.target.checked })} />Daily Edit: a short summary when items are due</label>
    <label className="muse-check-row"><input type="checkbox" checked={list.showInAgenda} onChange={(e) => void updateList(list.id, { showInAgenda: e.target.checked })} />Agenda: items planned for a day</label>
    <label className="muse-list-select">Supports an aspiration<select value={list.aspirationId ?? ""} onChange={(e) => void updateList(list.id, { aspirationId: e.target.value || null })}>
      <option value="">None</option>{aspirations.filter((a) => a.status !== "archived").map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</select></label>
    <div className="muse-lists-menu">
      <button type="button" onClick={() => void resetChecklist(list.id)}>Reset one-off checkboxes</button>
      <button type="button" onClick={() => void copyList(list.id, { title: list.isTemplate ? list.title : `${list.title} (copy)`, isTemplate: false, today }).then((id) => { onClose(); if (id) onOpen(id); })}>{list.isTemplate ? "Use template" : "Duplicate"}</button>
      {!list.isTemplate && <button type="button" onClick={() => void copyList(list.id, { title: list.title, isTemplate: true, today }).then(() => onClose())}>Save as template</button>}
      <button type="button" onClick={() => { void updateList(list.id, { archivedAt: list.archivedAt ? null : new Date().toISOString() }); onClose(); if (!list.archivedAt) onBack(); }}>{list.archivedAt ? "Restore" : "Archive"}</button>
      <button type="button" className="muse-lists-danger" onClick={() => setConfirm(true)}>Delete list…</button>
    </div>
    {confirm && <MuseModal id="list-delete-confirm" label="Delete list?" returnFocus={null} onClose={() => setConfirm(false)}>
      <h2>Delete “{list.title}”?</h2><p>This permanently deletes the list, its sections, items and history. Linked Planner tasks stay in the Planner.</p>
      <div className="muse-lists-modal-actions"><button type="button" className="muse-button" onClick={() => { setConfirm(false); onClose(); onBack(); void deleteList(list.id); }}>Delete list</button><button type="button" className="muse-button button-ghost" onClick={() => setConfirm(false)}>Keep it</button></div>
    </MuseModal>}
  </div>;
}
