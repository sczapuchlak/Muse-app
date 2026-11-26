"use client";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { frequencyGroups, itemGroups, itemSorts, sortItems, type ItemGroup, type ItemSort } from "@/lib/lists/order";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type FormEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { accentCss } from "@/lib/appearance-values";
import { isDone, listAccents, progress, LIMITS, type ListField, type ListItem, type ListSection, type MuseList } from "@/lib/lists/model";
import { itemHistory, periodFor, plannedOn, scheduleState, type ListEvent } from "@/lib/lists/schedule";
import { shiftDate } from "@/lib/dates";
import { usePlanner } from "../PlannerStore";
import { useMuseSpark } from "../MuseSpark";
import { MuseIcon } from "../MuseIcon";
import { GlassPopover } from "../GlassPopover";
import { MuseModal } from "../MuseModal";
import { EmojiButton, EmojiGlyph, EmojiPicker } from "../EmojiPicker";
import { ListHeroArt } from "./ListHeroArt";
import { useAspirations } from "../envision/aspirations/useAspirations";
import { addItem, addSection, bundleOf, copyList, deleteList, deleteSection, moveItem, moveSection, removeEvent, reorderSections, resetChecklist, syncTaskCopies, toggleItem, updateItem, updateList, updateSection, useLists } from "./ListsStore";
import { effectiveEvents, linkedTask, plannerEvents, toggleViaPlanner } from "./taskLink";
import { ItemDetails } from "./ItemDetails";
import { areaView, isVirtualId } from "@/lib/lists/areas";
import { cardCosts, money, placeBlocks, type CardData, type HeadingData, type ImagesData, type LinkData, type ListBlock, type NoteData } from "@/lib/lists/blocks";
import { addBlock, deleteBlock, deleteItems, duplicateBlock, moveBlock, moveBlockBy, realBlockId, updateBlock } from "./ListsStore";
import { AddBlock, BlockShell, HeadingBlock, type AddChoice, type BlockDrag } from "./SpaceBlocks";
import { SpaceNote } from "./SpaceNote";
import { SpaceCard } from "./SpaceCards";
import { ImagesBlock, LinkBlock, SpaceImg } from "./SpaceMedia";
import { CoverSettings, JourneyRibbon, SpaceNav, blockAnchor, countdown, sectionAnchor } from "./SpaceHero";
import "./Spaces.css";

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
  const [editing, setEditing] = useState<string | null>(null);
  // Blocks move by dragging their handle onto another block (or onto a section), on any section of the page.
  const blockEls = useRef(new Map<string, HTMLElement>()), blockOrigin = useRef({ x: 0, y: 0 });
  const [bdrag, setBdrag] = useState<{ id: string; x: number; y: number; over: string | null } | null>(null), bdragId = bdrag?.id ?? null;
  useEffect(() => { if (!bdragId) return; const stop = (e: Event) => e.preventDefault(); document.addEventListener("touchmove", stop, { passive: false }); return () => document.removeEventListener("touchmove", stop); }, [bdragId]);
  const blockAt = (x: number, y: number, self: string) => {
    for (const [id, el] of blockEls.current) { if (id === self) continue; const r = el.getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id; }
    for (const [id, el] of cards.current) { const r = el.getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return `section:${id}`; }
    return null;
  };
  const blockDrag = (blk: ListBlock): BlockDrag => ({
    active: bdragId === blk.id, over: bdrag?.over === blk.id, offset: bdragId === blk.id ? { x: bdrag!.x, y: bdrag!.y } : undefined,
    register: (el) => { if (el) blockEls.current.set(blk.id, el); else blockEls.current.delete(blk.id); },
    down: (e) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); blockOrigin.current = { x: e.clientX, y: e.clientY }; setBdrag({ id: blk.id, x: 0, y: 0, over: null }); },
    move: (e) => { if (bdragId !== blk.id) return; setBdrag({ id: blk.id, x: e.clientX - blockOrigin.current.x, y: e.clientY - blockOrigin.current.y, over: blockAt(e.clientX, e.clientY, blk.id) }); },
    up: (e) => {
      if (bdragId !== blk.id) return; const over = blockAt(e.clientX, e.clientY, blk.id); setBdrag(null); if (!over) return;
      void (async () => {
        const id = await realBlockId(blk.id, list.id, blk.sectionId);
        if (over.startsWith("section:")) { const sid = over.slice(8); if (sid !== blk.sectionId) await moveBlock(id, sid, 9999); return; }
        const target = b.blocks.find((x) => x.id === over), sid = target ? target.sectionId : over.startsWith("virtual:") ? (over === "virtual:root" ? null : over.slice(8)) : blk.sectionId;
        const area = b.blocks.filter((x) => x.sectionId === sid && x.id !== id).sort((p, q) => p.position - q.position);
        const idx = target ? area.findIndex((x) => x.id === target.id) : 0;
        await moveBlock(id, sid, Math.max(0, idx));
      })();
    },
  });
  const ctx: RowCtx = { list, today, eventsOf, sections: b.sections, toggle, openDetail, order, manual, blocks: b.blocks, blocksReady: s.blocksReady, editing, setEditing, blockDrag };
  const unsorted = b.items.filter((i) => !i.sectionId || !b.sections.some((x) => x.id === i.sectionId));
  const style = { "--list-accent": accentCss(list.accent) } as CSSProperties;
  // Sections reorder by dragging their handle (mouse or touch); the ⋯ menu keeps Move up / Move down as well (Nov 25).
  const cards = useRef(new Map<string, HTMLElement>()), origin = useRef({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; over: string | null } | null>(null), dragId = drag?.id ?? null;
  useEffect(() => { if (!dragId) return; const stop = (e: Event) => e.preventDefault(); document.addEventListener("touchmove", stop, { passive: false }); return () => document.removeEventListener("touchmove", stop); }, [dragId]);
  const overAt = (x: number, y: number, self: string) => { for (const [id, el] of cards.current) { if (id === self) continue; const r = el.getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id; } return null; };
  const dragDown = (id: string) => (e: ReactPointerEvent) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); origin.current = { x: e.clientX, y: e.clientY }; setDrag({ id, x: 0, y: 0, over: null }); };
  const dragMove = (id: string) => (e: ReactPointerEvent) => { if (dragId !== id) return; setDrag({ id, x: e.clientX - origin.current.x, y: e.clientY - origin.current.y, over: overAt(e.clientX, e.clientY, id) }); };
  const dragUp = (id: string) => (e: ReactPointerEvent) => {
    if (dragId !== id) return; const over = overAt(e.clientX, e.clientY, id); setDrag(null); if (!over) return;
    const ids = b.sections.map((x) => x.id), from = ids.indexOf(id), to = ids.indexOf(over); ids.splice(from, 1); ids.splice(to, 0, id); void reorderSections(list.id, ids);
  };

  const costs = cardCosts(b.blocks), when = countdown(list, today), rootBlocks = b.blocks.filter((x) => !x.sectionId);
  const kinds = { cards: b.blocks.filter((x) => x.kind === "card").length, notes: b.blocks.filter((x) => x.kind === "note").length, photos: b.blocks.reduce((n, x) => n + (x.kind === "images" ? (x.data as ImagesData).images.length : 0), 0), links: b.blocks.filter((x) => x.kind === "link").length };
  const pageView = view === "all" && list.itemGroup === "section" && !(list.tableView && list.fields.length > 0);
  return <section className="muse-list muse-space" style={style} aria-label={list.title}>
    <button type="button" className="text-button muse-list-back" onClick={onBack}>← All spaces</button>
    <div className="muse-list-hero" data-cover={list.cover ? true : undefined}>
    {list.cover && <div className="muse-space-cover" style={{ "--focus": `${list.cover.focus}%` } as CSSProperties} aria-hidden="true"><SpaceImg image={list.cover.image} alt="" /></div>}
    <header className="muse-list-head">
      {/* The icon fills its tile; clearing it is a small corner badge, so it never pushes the icon off centre (Nov 25). */}
      <div className="muse-list-icon" data-empty={!list.icon || undefined}><EmojiButton value={list.icon} onChange={(icon) => void updateList(list.id, { icon })} label="Space icon" /></div>
      <div className="muse-list-titles">
        <InlineText className="muse-list-title" value={list.title} max={LIMITS.title} label="Space title" onSave={(title) => updateList(list.id, { title })} />
        <InlineText className="muse-list-desc" value={list.description ?? ""} max={LIMITS.description} label="Description" placeholder="Add a description" onSave={(d) => updateList(list.id, { description: d || null })} />
        <p className="small-label muse-list-meta">{list.isTemplate ? "Template · " : ""}{b.sections.length > 0 && `${b.sections.length} section${b.sections.length === 1 ? "" : "s"} · `}{prog.total > 0 ? `${prog.done} of ${prog.total} done · ${Math.round(prog.pct)}%` : "Nothing to tick off yet"}</p>
        {(list.startDate || costs.count > 0 || kinds.cards + kinds.notes + kinds.photos + kinds.links > 0) && <p className="muse-space-chips">
          {list.startDate && <span data-tone="date"><MuseIcon name="calendar" size={12} />{shortDate(list.startDate)}{list.endDate && list.endDate !== list.startDate ? ` – ${shortDate(list.endDate)}` : ""}{when && <b>{when}</b>}</span>}
          {costs.count > 0 && <span title="The amounts written on this space’s cards"><MuseIcon name="money" size={12} />{money(String(costs.total))} noted</span>}
          {kinds.cards > 0 && <span>{kinds.cards} card{kinds.cards === 1 ? "" : "s"}</span>}{kinds.notes > 0 && <span>{kinds.notes} note{kinds.notes === 1 ? "" : "s"}</span>}
          {kinds.photos > 0 && <span>{kinds.photos} photo{kinds.photos === 1 ? "" : "s"}</span>}{kinds.links > 0 && <span>{kinds.links} link{kinds.links === 1 ? "" : "s"}</span>}
        </p>}
      </div>
      <button ref={settingsAnchor} type="button" className="muse-button muse-lists-icon" aria-label="Space settings" aria-expanded={settings} onClick={() => setSettings(true)}><MuseIcon name="settings" size={16} /></button>
    </header>
    {prog.total > 0 && <div className="muse-list-progress" role="progressbar" aria-valuenow={prog.pct} aria-valuemin={0} aria-valuemax={100} aria-label="List progress"><span style={{ width: `${prog.pct}%` }} /></div>}
    {!list.cover && <div className="muse-list-artwrap"><ListHeroArt seed={list.id} stars={b.sections.length ? b.sections.map((sec) => { const its = b.items.filter((i) => i.sectionId === sec.id), p = progress(its, its.flatMap((i) => eventsOf.get(i.id) ?? []), today); return { label: sec.title, done: p.done, total: p.total }; })
      : (b.items.length ? b.items.slice(0, 10) : Array.from({ length: 5 }, () => null)).map((it, i) => it ? { label: it.title, done: isDone(it, eventsOf.get(it.id) ?? [], today) ? 1 : 0, total: 1 } : { label: `Star ${i + 1}`, done: 0, total: 0 })} /></div>}
    </div>
    {pageView && b.sections.length > 0 && (list.sectionTiles ?? b.sections.length >= 3) && <SpaceNav sections={b.sections} blocks={b.blocks} items={b.items} onHide={list.sectionTiles !== undefined ? () => void updateList(list.id, { sectionTiles: false }) : undefined} />}
    {pageView && <JourneyRibbon list={list} blocks={b.blocks} />}
    <div className="muse-list-viewbar">
      {scheduled ? <div className="muse-chip-row muse-list-views" role="group" aria-label="List view">
        {(["all", "week", "due", "history"] as View[]).map((v) => <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{v === "all" ? "Page" : v === "week" ? "This week" : v === "due" ? "Due" : "History"}</button>)}
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
        <div className="muse-list-sections" data-columns={list.columns} data-dragging={drag ? true : undefined}>
        {list.itemGroup === "section" ? <>
          {(unsorted.length > 0 || rootBlocks.length > 0 || b.sections.length === 0) && <SectionBlock ctx={ctx} section={null} items={unsorted} />}
          {b.sections.map((sec, i) => <SectionBlock key={sec.id} ctx={ctx} section={sec} items={b.items.filter((it) => it.sectionId === sec.id)} first={i === 0} last={i === b.sections.length - 1}
            drag={{ active: drag?.id === sec.id, over: drag?.over === sec.id, offset: drag?.id === sec.id ? { x: drag.x, y: drag.y } : undefined, register: (el) => { if (el) cards.current.set(sec.id, el); else cards.current.delete(sec.id); }, down: dragDown(sec.id), move: dragMove(sec.id), up: dragUp(sec.id) }} />)}
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
    <GlassPopover id="list-settings" label="Space settings" open={settings} anchorRef={settingsAnchor} onClose={() => setSettings(false)} width={380}>
      {settings && <ListSettings list={list} today={today} onBack={onBack} onOpen={onOpen} onClose={() => setSettings(false)} />}
    </GlassPopover>
  </section>;
}

type RowCtx = { list: MuseList; today: string; eventsOf: Map<string, ListEvent[]>; sections: ListSection[]; toggle: (i: ListItem) => void; openDetail: (id: string, a: HTMLElement) => void; order: (items: ListItem[]) => ListItem[]; manual: boolean;
  /** Spaces: this space's blocks, which one is open for editing, and how blocks drag. */ blocks: ListBlock[]; blocksReady: boolean; editing: string | null; setEditing: (id: string | null) => void; blockDrag: (b: ListBlock) => BlockDrag };

type SectionDrag = { active: boolean; over: boolean; offset?: { x: number; y: number }; register: (el: HTMLElement | null) => void; down: (e: ReactPointerEvent) => void; move: (e: ReactPointerEvent) => void; up: (e: ReactPointerEvent) => void };

/**
 * One section (Nov 25): drag handle, collapse, its icon and name, a short optional description, the count, and one ⋯
 * menu (icon, description, colour, move up/down, delete) instead of tools on every card.
 */
function SectionBlock({ ctx, section, items, first, last, title, drag }: { ctx: RowCtx; section: ListSection | null; items: ListItem[]; first?: boolean; last?: boolean; /** A display group (frequency / all items) instead of a section. */ title?: string; drag?: SectionDrag }) {
  const [over, setOver] = useState(false), [confirm, setConfirm] = useState<HTMLElement | null>(null);
  const [menu, setMenu] = useState(false), [picker, setPicker] = useState(false), [editDesc, setEditDesc] = useState(false), more = useRef<HTMLButtonElement>(null);
  const sorted = ctx.order(items), prog = progress(sorted, sorted.flatMap((i) => ctx.eventsOf.get(i.id) ?? []), ctx.today);
  const collapsed = !!section?.collapsed;
  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData("text/muse-list-item"); if (id) void moveItem(id, section?.id ?? null, sorted.length); };
  const style = { ...(section?.accent ? { "--section-accent": accentCss(section.accent) } : {}), ...(drag?.offset ? { transform: `translate(${drag.offset.x}px, ${drag.offset.y}px)` } : {}) } as CSSProperties;
  const done = prog.total > 0 && prog.done === prog.total;
  const rootAlone = !section && !title && !ctx.sections.length, pageMode = !title && ctx.list.itemGroup === "section";
  return <section ref={drag?.register} id={title ? undefined : sectionAnchor(section?.id ?? null)} className="muse-list-section" data-root={rootAlone || undefined} data-over={over || drag?.over || undefined} data-dragging={drag?.active || undefined} data-done={done || undefined} style={style}
    onDragOver={(e) => { if (ctx.manual && !title && e.dataTransfer.types.includes("text/muse-list-item")) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
    <header className="muse-list-section-head">
      {section ? <>
        {drag && <button type="button" className="muse-list-section-grip" aria-label={`Drag to reorder ${section.title}. Or use Move up and Move down in its menu.`} title="Drag to reorder"
          onPointerDown={drag.down} onPointerMove={drag.move} onPointerUp={drag.up} onPointerCancel={drag.up}
          onKeyDown={(e) => { if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); if (!first) void moveSection(section.id, -1); } else if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); if (!last) void moveSection(section.id, 1); } }}><MuseIcon name="grip" size={14} /></button>}
        {section.icon && <button type="button" className="muse-list-section-icon" aria-label={`Change icon for ${section.title}`} onClick={() => { setPicker(true); }}><EmojiGlyph value={section.icon} /></button>}
        <div className="muse-list-section-names">
          <InlineText className="muse-list-section-title" value={section.title} max={LIMITS.sectionTitle} label="Section name" onSave={(t) => updateSection(section.id, { title: t })} />
          {(section.description || editDesc) && <InlineText className="muse-list-section-desc" value={section.description ?? ""} max={LIMITS.sectionDescription} label={`Description for ${section.title}`} placeholder="A short note" editing={editDesc}
            onSave={(d) => updateSection(section.id, { description: d || null })} onDone={() => setEditDesc(false)} />}
        </div>
      </> : <h3 className="muse-list-section-title">{title ?? (ctx.sections.length ? "Unsorted" : ctx.blocks.some((x) => x.kind !== "checklist") ? "On this page" : "Items")}</h3>}
      {collapsed && <small className="muse-list-collapsed-note">Collapsed</small>}
      {prog.total > 0 ? <small className="muse-list-count" data-done={done || undefined}>{prog.done}/{prog.total}</small> : <span className="muse-list-section-spacer" />}
      {section && <button ref={more} type="button" className="muse-lists-mini muse-list-section-more" aria-label={`Options for ${section.title}`} aria-haspopup="dialog" aria-expanded={menu} onClick={() => setMenu((v) => !v)}><MuseIcon name="more" size={16} /></button>}
    </header>
    {!collapsed && (pageMode ? <AreaBlocks ctx={ctx} sectionId={section?.id ?? null} items={items} showEmpty={!!section || !ctx.sections.length} /> : <>
      <ul className="muse-list-items">{sorted.map((it, i) => <ItemRow key={it.id} ctx={ctx} item={it} index={i} />)}</ul>
      <QuickAdd listId={ctx.list.id} sectionId={section?.id ?? null} />
    </>)}
    {section && <GlassPopover id={`section-menu-${section.id}`} label={`Options for ${section.title}`} open={menu} anchorRef={more} onClose={() => setMenu(false)} width={250} align="end" bare>
      <div className="popover-choice-list muse-list-section-menu">
        <button type="button" className="popover-choice" aria-expanded={!collapsed} onClick={() => { setMenu(false); void updateSection(section.id, { collapsed: !collapsed }); }}><span><MuseIcon name={collapsed ? "eye" : "eye-off"} size={15} />{collapsed ? "Expand section" : "Collapse section"}</span></button>
        <button type="button" className="popover-choice" onClick={() => { setMenu(false); setPicker(true); }}><span><MuseIcon name="sparkle" size={15} />{section.icon ? "Change icon" : "Add an icon"}</span></button>
        {section.icon && <button type="button" className="popover-choice" onClick={() => { setMenu(false); void updateSection(section.id, { icon: null }); }}><span><MuseIcon name="close" size={15} />Remove icon</span></button>}
        <button type="button" className="popover-choice" onClick={() => { setMenu(false); setEditDesc(true); }}><span><MuseIcon name="edit" size={15} />{section.description ? "Edit description" : "Add a description"}</span></button>
        <div className="muse-list-section-swatches" role="group" aria-label={`Colour for ${section.title}`}>
          <button type="button" aria-pressed={!section.accent} aria-label="List colour" title="List colour" onClick={() => void updateSection(section.id, { accent: null })} />
          {listAccents.map((a) => <button key={a} type="button" aria-pressed={section.accent === a} aria-label={a} title={a} style={{ background: accentCss(a) }} onClick={() => void updateSection(section.id, { accent: a })} />)}
        </div>
        {!first && <button type="button" className="popover-choice" onClick={() => { setMenu(false); void moveSection(section.id, -1); }}><span><span className="muse-list-icon-up" aria-hidden="true"><MuseIcon name="arrow" size={15} /></span>Move up</span></button>}
        {!last && <button type="button" className="popover-choice" onClick={() => { setMenu(false); void moveSection(section.id, 1); }}><span><span className="muse-list-icon-down" aria-hidden="true"><MuseIcon name="arrow" size={15} /></span>Move down</span></button>}
        <button type="button" className="popover-choice" data-destructive onClick={() => { setMenu(false); setConfirm(more.current); }}><span><MuseIcon name="trash" size={15} />Delete section…</span></button>
      </div>
    </GlassPopover>}
    {section && <EmojiPicker open={picker} anchorRef={more} onClose={() => setPicker(false)} onSelect={(icon) => { setPicker(false); void updateSection(section.id, { icon }); }} label={`Icon for ${section.title}`} />}
    {confirm && section && <MuseModal id={`section-delete-${section.id}`} label="Delete section?" returnFocus={confirm} onClose={() => setConfirm(null)}>
      <h2>Delete “{section.title}”?</h2><p>{(() => { const nb = ctx.blocks.filter((x) => x.sectionId === section.id && x.kind !== "checklist").length; return `Its ${items.length} item${items.length === 1 ? "" : "s"}${nb ? ` and ${nb} block${nb === 1 ? "" : "s"}` : ""} move to the top of the page. Nothing else is deleted.`; })()}</p>
      <div className="muse-lists-modal-actions"><button type="button" className="muse-button" onClick={() => { setConfirm(null); void deleteSection(section.id); }}>Delete section</button><button type="button" className="muse-button button-ghost" onClick={() => setConfirm(null)}>Keep it</button></div>
    </MuseModal>}
  </section>;
}

function ItemRow({ ctx, item, index, blockId }: { ctx: RowCtx; item: ListItem; index: number; /** The checklist it's shown in (Spaces). */ blockId?: string }) {
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
    onDrop={(e) => { const id = e.dataTransfer.getData("text/muse-list-item"); if (id && id !== item.id) { e.preventDefault(); e.stopPropagation(); void moveItem(id, item.sectionId, index, blockId); } }}>
    <label className="muse-list-check"><input type="checkbox" checked={done} onChange={() => { if (!done) trigger(); ctx.toggle(item); }} aria-label={`${done ? "Mark not done" : "Mark done"}: ${item.title}`} /><span aria-hidden="true">{done && <MuseIcon name="check" size={12} />}{spark}</span></label>
    <button type="button" className="muse-list-item-title" onClick={(e) => ctx.openDetail(item.id, e.currentTarget)} aria-label={`${item.title}. Details`}>
      <span>{item.title}</span>
      {chips.length > 0 && <span className="muse-list-chips">{chips.map((c, i) => <small key={i} data-tone={c.tone}>{c.text}</small>)}</span>}
    </button>
  </li>;
}

function QuickAdd({ listId, sectionId, blockId }: { listId: string; sectionId: string | null; blockId?: string }) {
  const [text, setText] = useState("");
  const submit = (e: FormEvent) => { e.preventDefault(); const t = text.trim(); if (!t) return; setText(""); void addItem(listId, sectionId, t, blockId && !isVirtualId(blockId) ? { blockId } : {}); };
  return <form className="muse-list-quickadd" onSubmit={submit}><span aria-hidden="true">+</span><input value={text} maxLength={LIMITS.itemTitle} onChange={(e) => setText(e.target.value)} placeholder="Add an item" aria-label="Add an item" /></form>;
}

function AddSection({ listId }: { listId: string }) {
  const [text, setText] = useState("");
  const submit = (e: FormEvent) => { e.preventDefault(); const t = text.trim(); if (!t) return; setText(""); void addSection(listId, t); };
  return <form className="muse-list-addsection" onSubmit={submit}><input value={text} maxLength={LIMITS.sectionTitle} onChange={(e) => setText(e.target.value)} placeholder="Add a section (Kitchen, Clothing, Sewing…)" aria-label="Add a section" /></form>;
}

/** Click to edit; Enter or blur saves; Escape cancels. */
function InlineText({ value, onSave, label, max, className, placeholder, editing, onDone }: { value: string; onSave: (v: string) => unknown; label: string; max: number; className?: string; placeholder?: string; /** Open straight into editing (e.g. "Add a description" from a menu). */ editing?: boolean; onDone?: () => void }) {
  const [draft, setDraft] = useState<string | null>(editing ? value : null);
  const [wasEditing, setWasEditing] = useState(editing);
  if (editing !== wasEditing) { setWasEditing(editing); if (editing && draft === null) setDraft(value); }
  const commit = () => { if (draft === null) return; const v = draft.trim(); setDraft(null); onDone?.(); if (v !== value && (v || placeholder)) void onSave(v); };
  if (draft === null) return <button type="button" className={`muse-inline-text ${className ?? ""}`} data-empty={!value || undefined} onClick={() => setDraft(value)} aria-label={`${label}: ${value || "empty"}. Edit`}>{value || placeholder}</button>;
  return <input className={`muse-inline-input ${className ?? ""}`} autoFocus value={draft} maxLength={max} aria-label={label} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(null); onDone?.(); } }} />;
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
    <CoverSettings list={list} />
    {list.sectionTiles !== undefined && <><p className="editor-label">Section tiles at the top</p>
      <div className="muse-segmented muse-space-tiles-choice" role="group" aria-label="Section tiles at the top">
        {([[null, "Automatic"], [true, "Always"], [false, "Hidden"]] as const).map(([v, label]) => <button key={label} type="button" aria-pressed={list.sectionTiles === v} title={v === null ? "Shown once there are three or more sections" : undefined} onClick={() => void updateList(list.id, { sectionTiles: v })}>{label}</button>)}
      </div></>}
    <p className="editor-label">Colour</p>
    <div className="muse-list-swatches" role="group" aria-label="Space colour">{listAccents.map((a) => <button key={a} type="button" aria-pressed={list.accent === a} aria-label={a} style={{ background: accentCss(a) }} onClick={() => void updateList(list.id, { accent: a })} />)}</div>
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
      <button type="button" className="muse-lists-danger" onClick={() => setConfirm(true)}>Delete space…</button>
    </div>
    {confirm && <MuseModal id="list-delete-confirm" label="Delete space?" returnFocus={null} onClose={() => setConfirm(false)}>
      <h2>Delete “{list.title}”?</h2><p>This permanently deletes the space: its sections, notes, cards, photos, items and history. Linked Planner tasks stay in the Planner.</p>
      <div className="muse-lists-modal-actions"><button type="button" className="muse-button" onClick={() => { setConfirm(false); onClose(); onBack(); void deleteList(list.id); }}>Delete space</button><button type="button" className="muse-button button-ghost" onClick={() => setConfirm(false)}>Keep it</button></div>
    </MuseModal>}
  </div>;
}

/**
 * One area of the page (a section, or the top): its blocks on a two-column grid (full blocks take the row; side-by-side
 * blocks pair up; a lone one fills its row), then "+ Add".
 */
function AreaBlocks({ ctx, sectionId, items, showEmpty }: { ctx: RowCtx; sectionId: string | null; items: ListItem[]; showEmpty: boolean }) {
  const view = areaView(ctx.list.id, sectionId, ctx.blocks, items, showEmpty), placed = placeBlocks(view.blocks);
  let place = 0; const numbers = new Map(view.blocks.filter((x) => x.kind === "card" && (x.data as CardData).preset === "place").map((x) => [x.id, ++place]));
  const add = async (c: AddChoice) => { const id = await addBlock(ctx.list.id, sectionId, c.kind, c.data, { width: c.width }).catch(() => null); if (id && c.kind !== "checklist" && c.kind !== "images") ctx.setEditing(id); };
  return <div className="muse-space-area">
    {placed.length > 0 && <div className="muse-space-grid">{placed.map((blk, i) => <BlockItem key={blk.id} ctx={ctx} block={blk} span={blk.span} items={view.itemsOf.get(blk.id) ?? []} first={i === 0} last={i === placed.length - 1} number={numbers.get(blk.id)} />)}</div>}
    {ctx.blocksReady && <AddBlock blocks={view.blocks} onAdd={(c) => void add(c)} />}
  </div>;
}

function BlockItem({ ctx, block, span, items, first, last, number }: { ctx: RowCtx; block: ListBlock; span: 1 | 2; items: ListItem[]; first: boolean; last: boolean; number?: number }) {
  const editing = ctx.editing === block.id, setEditing = (v: boolean) => ctx.setEditing(v ? block.id : null);
  const real = () => realBlockId(block.id, ctx.list.id, block.sectionId);
  const save = (data: unknown) => updateBlock(block.id, { data: data as ListBlock["data"] });
  const [over, setOver] = useState(false);
  const label = block.kind === "card" ? `${(block.data as CardData).title || "Card"}` : block.kind === "checklist" ? ((block.data as { title?: string }).title || "Checklist") : block.kind[0].toUpperCase() + block.kind.slice(1);
  const actions = {
    edit: block.kind === "checklist" ? undefined : () => setEditing(true),
    width: (w: "full" | "half") => void real().then((id) => updateBlock(id, { width: w })),
    move: (by: -1 | 1) => void real().then((id) => moveBlockBy(id, by)),
    moveTo: (sid: string | null) => void real().then((id) => moveBlock(id, sid, 9999)),
    duplicate: block.kind === "checklist" ? undefined : () => void duplicateBlock(block.id),
    rename: block.kind === "checklist" ? (t: string) => void real().then((id) => updateBlock(id, { data: { title: t || undefined } })) : undefined,
    remove: () => void (block.virtual ? deleteItems(items.map((i) => i.id)) : deleteBlock(block.id, block.kind === "checklist" ? items.map((i) => i.id) : [])),
  };
  let body: ReactNode = null;
  if (block.kind === "checklist") {
    const sorted = ctx.order(items);
    body = <div className="muse-space-checklist" data-over={over || undefined}
      onDragOver={(e) => { if (ctx.manual && e.dataTransfer.types.includes("text/muse-list-item")) { e.preventDefault(); e.stopPropagation(); setOver(true); } }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { setOver(false); const id = e.dataTransfer.getData("text/muse-list-item"); if (id) { e.preventDefault(); e.stopPropagation(); void moveItem(id, block.sectionId, sorted.length, block.virtual ? undefined : block.id); } }}>
      {sorted.length > 0 && <ul className="muse-list-items">{sorted.map((it, i) => <ItemRow key={it.id} ctx={ctx} item={it} index={i} blockId={block.virtual ? undefined : block.id} />)}</ul>}
      <QuickAdd listId={ctx.list.id} sectionId={block.sectionId} blockId={block.id} />
    </div>;
  } else if (block.kind === "note") body = <SpaceNote data={block.data as NoteData} editing={editing} label={`Note in ${ctx.list.title}`} onEditing={setEditing} onSave={save} />;
  else if (block.kind === "card") body = <SpaceCard blockId={block.id} data={block.data as CardData} editing={editing} number={number} onEditing={setEditing} onSave={save} />;
  else if (block.kind === "images") body = <ImagesBlock blockId={block.id} data={block.data as ImagesData} editing={editing} onEditing={setEditing} onSave={save} />;
  else if (block.kind === "link") body = <LinkBlock key={editing ? "e" : "r"} blockId={block.id} data={block.data as LinkData} editing={editing} onEditing={setEditing} onSave={save} />;
  else if (block.kind === "heading") body = <HeadingBlock key={editing ? "e" : "r"} data={block.data as HeadingData} editing={editing} onEditing={setEditing} onSave={save} />;
  return <div id={blockAnchor(block.id)} className="muse-space-cell" data-span={span}>
    <BlockShell block={block} span={span} label={label} first={first} last={last} sections={ctx.sections} itemCount={items.length} editing={editing} actions={actions} drag={ctx.manual ? ctx.blockDrag(block) : undefined}>{body}</BlockShell>
  </div>;
}
