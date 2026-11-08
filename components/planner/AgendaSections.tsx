"use client";
import { useId, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { DayEvent, PlannedTask } from "@/lib/models";
import { mealLabels, mealSlots } from "@/lib/models";
import { eventDays, eventWhen, taskState } from "@/lib/agenda";
import { clampHeight, MAX_SECTION_PX, MIN_SECTION_PX, sectionPx, sectionWorkspaces, showCompletedFor, type AgendaSection } from "@/lib/agenda-layout";
import { itemMark, markColors, markIconName, markIcons, type ResolvedMark } from "@/lib/muse-marks";
import { accentCss } from "@/lib/appearance-values";
import { DEFAULT_OPACITY, MAX_ITEMS, MAX_ITEM_TEXT, paintCss, starterItems, stickerGlyph, uncheckAll, type SectionItem } from "@/lib/planner-customization";
import { movementCategory } from "@/lib/progress/movement";
import { defaultWaterSettings, formatWaterAmount, parseWaterAmount } from "@/lib/water";
import { sessionSeconds } from "@/lib/whimsy/reading-stats";
import { weekDates } from "@/lib/dates";
import { sampleMovementTypes } from "@/lib/sample-taxonomies";
import { MAX_QUICK_MOVEMENTS, movementNameError, normalizeMovementName } from "@/lib/selections";
import { MuseIcon, type MuseIconName } from "../MuseIcon";
import { MuseOverflowMenu } from "../MuseOverflowMenu";
import { GlassPopover } from "../GlassPopover";
import { usePlanner } from "../PlannerStore";
import { useWellness } from "../WellnessStore";
import { useWhimsyData } from "../whimsy/WhimsyData";
import { TaskListRow } from "./TaskListRow";
import { PlanningDropZone } from "./PlanningDropZone";
import { TaskQuickAdd } from "./TaskQuickAdd";
import { MarkGlyph } from "./MuseMarks";
import { useAgendaData } from "./AgendaData";

export type DayContext = {
  day: string; today: string; tasks: PlannedTask[]; events: DayEvent[]; showCompleted: boolean; showMarks: boolean;
  marks: ResolvedMark[]; priorityIds: ReadonlySet<string>; fallbackWorkspaceId?: string; flow: "fixed" | "auto";
  onOpenTask: (task: PlannedTask, anchor: HTMLElement) => void;
  onEvent: (anchor: HTMLElement, event?: DayEvent) => void;
  onMark: (anchor: HTMLElement, mark?: ResolvedMark, link?: { kind: "event" | "task"; id: string; title: string }) => void;
};
const weekdayShort = (d: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const starterTypes = sampleMovementTypes.filter((t) => t.source === "starter");
const categoryIcon: Record<string, MuseIconName> = { strength: "dumbbell", cardio: "run", mobility: "yoga", other: "movement" };
const categoryAccent: Record<string, string> = { strength: "pop", cardio: "warm", mobility: "secondary", other: "primary" };

/**
 * One band of the shared weekly template. In the week every day gives the band the same height, so bands line up;
 * the content scrolls inside it and the header always shows how many items there are, so nothing is silently hidden.
 */
function Band({ section, ctx, count, action, children }: { section: AgendaSection; ctx: DayContext; count?: number; action?: ReactNode; children: ReactNode }) {
  const { preview, setPreview, changeLayout } = useAgendaData();
  const px = preview[section.id] ?? sectionPx(section);
  const look = section.style;
  const style = { ...(ctx.flow === "fixed" ? { "--section-h": `${px}px` } : {}), ...(look?.background ? { "--section-paint": paintCss(look.background), "--section-paint-opacity": `${(look.opacity ?? DEFAULT_OPACITY) / 100}` } : {}),
    ...(look?.accent ? { "--section-accent": accentCss(look.accent) } : {}) } as CSSProperties;
  const headingId = `agenda-${section.id}-${ctx.day}`, collapsed = section.size === "collapsed" && !section.height && ctx.flow === "fixed";
  const commit = (next: number) => { setPreview(section.id, null); changeLayout({ type: "update", id: section.id, patch: { height: clampHeight(next) } }); };
  // Drag the bottom edge (or use the arrow keys) to size this band in every day at once.
  function drag(e: ReactPointerEvent<HTMLDivElement>) {
    const start = e.clientY, from = px, el = e.currentTarget; el.setPointerCapture(e.pointerId); let last = from;
    const moveTo = (ev: PointerEvent) => { last = clampHeight(from + ev.clientY - start); setPreview(section.id, last); };
    const end = () => { el.removeEventListener("pointermove", moveTo); el.removeEventListener("pointerup", end); el.removeEventListener("pointercancel", end); commit(last); };
    el.addEventListener("pointermove", moveTo); el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
  }
  return <div className="muse-agenda-section" data-section={section.type} data-size={section.height ? "custom" : section.size} data-flow={ctx.flow}
    data-painted={look?.background ? look.background.kind : undefined} data-header={look?.header} data-divider={look?.divider} style={style} role="group" aria-labelledby={headingId}>
    {look?.sticker && <span className="muse-agenda-sticker" aria-hidden="true">{stickerGlyph(look.sticker)}</span>}
    <div className="muse-agenda-section-head"><h3 id={headingId}><SectionMarkButton section={section} />{section.title}{count ? <span className="muse-agenda-count"> · {count}</span> : null}</h3>{action}</div>
    {collapsed ? null : <div className="muse-agenda-section-body" tabIndex={-1}>{children}</div>}
    {ctx.flow === "fixed" && <div className="muse-agenda-resize" role="separator" aria-orientation="horizontal" tabIndex={0} aria-label={`Resize ${section.title} for every day`} aria-valuenow={px} aria-valuemin={MIN_SECTION_PX} aria-valuemax={MAX_SECTION_PX}
      onPointerDown={drag} onKeyDown={(e) => { if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); commit(px + (e.key === "ArrowDown" ? 16 : -16)); } }} />}
  </div>;
}

export function AgendaSectionView({ section, ctx }: { section: AgendaSection; ctx: DayContext }) {
  switch (section.type) {
    case "events": return <EventsSection section={section} ctx={ctx} />;
    case "tasks": return <TasksSection section={section} ctx={ctx} />;
    case "movement": return <MovementSection section={section} ctx={ctx} />;
    case "reading": return <ReadingSection section={section} ctx={ctx} />;
    case "meals": return <MealsSection section={section} ctx={ctx} />;
    case "water": return <WaterSection section={section} ctx={ctx} />;
    case "notes": return <NotesSection section={section} ctx={ctx} />;
    case "checklist": case "list": return <ItemsSection section={section} ctx={ctx} />;
  }
}

const statusSymbol = (e: DayEvent) => e.status === "canceled" ? "×" : e.status === "tentative" ? "?" : "○";
const statusWords = (e: DayEvent) => e.status === "canceled" ? "Canceled" : e.status === "tentative" ? "Tentative" : "Event";
export function EventLine({ event, day, ctx }: { event: DayEvent; day?: string; ctx: Pick<DayContext, "marks" | "showMarks" | "onEvent" | "onMark"> }) {
  const mark = ctx.showMarks ? itemMark(ctx.marks, "event", event.id) : undefined;
  const span = event.endDate ? ` (${eventDays(event)})` : "";
  return <li className="muse-agenda-event" data-status={event.status === "confirmed" ? undefined : event.status} data-continues={day && day > event.date || undefined}>
    <span className="muse-agenda-symbol" aria-hidden="true">{statusSymbol(event)}</span>
    {event.source === "google" && <GoogleSourceDot event={event} />}
    {mark && <MarkGlyph mark={mark} size={13} onSelect={(a) => ctx.onMark(a, mark, { kind: "event", id: event.id, title: event.title })} />}
    <button type="button" className="muse-agenda-event-button" data-source={event.source} onClick={(e) => ctx.onEvent(e.currentTarget, event)} aria-label={`${statusWords(event)}: ${event.title}, ${eventWhen(event)}${span}.${event.source === "google" ? ` From Google Calendar${event.calendarName ? ` · ${event.calendarName}` : ""}. Details` : " Edit"}`}>
      <time dateTime={event.allDay ? event.date : event.dateTime}>{event.allDay ? "All day" : event.time}</time><span>{event.title}{event.seriesId && <span className="muse-repeat-mark" title="Repeating event" aria-label=", repeats">↻</span>}{span && <small>{span}</small>}</span>
    </button>
  </li>;
}

/** Google Calendar (#35): a small dot in the calendar's own color marks a read-only Google event. */
export function GoogleSourceDot({ event }: { event: DayEvent }) {
  return <span className="muse-google-dot" style={event.color ? { "--google-calendar": event.color } as CSSProperties : undefined} title={`Google Calendar${event.calendarName ? ` · ${event.calendarName}` : ""}`} aria-hidden="true" />;
}

function EventsSection({ section, ctx }: { section: AgendaSection; ctx: DayContext }) {
  return <Band section={section} ctx={ctx} count={ctx.events.length}
    action={<button type="button" className="muse-agenda-add" aria-label={`Add an event on ${ctx.day}`} onClick={(e) => ctx.onEvent(e.currentTarget)}><MuseIcon name="plus" size={13} /></button>}>
    {ctx.events.length ? <ul>{ctx.events.map((ev) => <EventLine key={ev.id} event={ev} day={ctx.day} ctx={ctx} />)}</ul>
      : <button type="button" className="muse-agenda-empty muse-agenda-empty-action" onClick={(e) => ctx.onEvent(e.currentTarget)}>Nothing booked · add an event</button>}
  </Band>;
}

function TasksSection({ section, ctx }: { section: AgendaSection; ctx: DayContext }) {
  const { state } = usePlanner();
  const scope = sectionWorkspaces(section, state.workspaces.map((w) => w.id));
  const show = showCompletedFor(section, ctx.showCompleted);
  const inScope = ctx.tasks.filter((t) => t.plannedDate === ctx.day && scope.ids.includes(t.workspaceId));
  const visible = inScope.filter((t) => show || !t.complete), hidden = inScope.length - visible.length;
  const quickWorkspace = scope.all ? ctx.fallbackWorkspaceId : scope.ids[0];
  return <PlanningDropZone date={ctx.day} className="muse-agenda-drop-wrap">
    <Band section={section} ctx={ctx} count={visible.length} action={hidden > 0 ? <span className="small-label">{hidden} done hidden</span> : undefined}>
      {scope.missing.length > 0 && <p className="muse-agenda-warning" role="note">A workspace this section showed was removed. Choose its workspaces again in Customize layout.</p>}
      {visible.length ? <ul className="muse-task-list-rows muse-agenda-rows">{visible.map((t) => <TaskListRow key={t.id} task={t} today={ctx.today} boardDays={[ctx.day]} priority={ctx.priorityIds.has(t.id)} showWorkspace onOpen={ctx.onOpenTask} onPlaced={() => {}} reorderWithinDate />)}</ul>
        : <p className="muse-agenda-empty">{taskState({ complete: false, plannedDate: ctx.day }, ctx.today) === "overdue" ? "Nothing left open." : "A little breathing room."}</p>}
      {(scope.all || scope.ids.length > 0) && <TaskQuickAdd date={ctx.day} workspaceId={quickWorkspace} />}
    </Band>
  </PlanningDropZone>;
}

/**
 * Planned movement is Dayview's movement selection for that date ("Selection is an intention"); what was actually
 * done comes only from logged activity. Planning here never logs or completes a workout.
 */
function MovementSection({ section, ctx }: { section: AgendaSection; ctx: DayContext }) {
  const { state, store, dispatch, status } = useWellness();
  const [open, setOpen] = useState(false), [name, setName] = useState(""), [error, setError] = useState("");
  const anchor = useRef<HTMLButtonElement>(null), id = useId();
  const planned = state.movement.find((d) => d.date === ctx.day)?.typeIds ?? [];
  const done = new Set(state.activities.filter((a) => a.date === ctx.day).map((a) => a.typeId));
  // Same fallback as Dayview's Movement card: before anything is saved, the starter types are the vocabulary.
  const types = state.types.length ? state.types : starterTypes;
  const ids = [...new Set([...planned, ...done])], ready = status.loaded && !status.error;
  function save(date: string, change: (ids: string[]) => string[], nextTypes?: typeof types) {
    const s = store.getSnapshot().state, current = s.movement.find((d) => d.date === date)?.typeIds ?? [];
    const saved = s.types.length > 0, base = saved ? s.types : starterTypes;
    dispatch({ kind: "movement", types: nextTypes ?? base, quickIds: saved ? s.quickIds : starterTypes.slice(0, MAX_QUICK_MOVEMENTS).map((t) => t.id), recentIds: s.recentIds, day: { date, typeIds: change(current) } });
  }
  function move(typeId: string, to: string) { save(ctx.day, (l) => l.filter((x) => x !== typeId)); save(to, (l) => l.includes(typeId) ? l : [...l, typeId]); }
  /** A new type joins the shared Wellness vocabulary, so Dayview's movement list has it too. */
  function create(e: FormEvent) {
    e.preventDefault(); const problem = movementNameError(name, types); if (problem) { setError(problem); return; }
    const t = { id: crypto.randomUUID(), name: normalizeMovementName(name), source: "custom" as const, archived: false };
    save(ctx.day, (l) => [...l, t.id], [...types, t]); setName(""); setError("");
  }
  const week = weekDates(ctx.day).filter((d) => d !== ctx.day);
  return <Band section={section} ctx={ctx} count={ids.length} action={ready ? <button ref={anchor} type="button" className="muse-agenda-add" aria-haspopup="dialog" aria-expanded={open} aria-controls={id} aria-label={`Plan movement on ${ctx.day}`} onClick={() => setOpen(!open)}><MuseIcon name="plus" size={13} /></button> : undefined}>
    <GlassPopover id={id} label={`Plan movement · ${weekdayShort(ctx.day)} ${Number(ctx.day.slice(8))}`} open={open} anchorRef={anchor} onClose={() => setOpen(false)} width={300} scrollMode="content">
      <p className="small-label">Planning is an intention, the same as choosing it on Dayview. Mark what you actually did there.</p>
      <div className="popover-choice-list" role="group" aria-label="Movement types">{types.filter((t) => !t.archived).map((t) =>
        <button key={t.id} type="button" className="popover-choice" aria-pressed={planned.includes(t.id)} onClick={() => save(ctx.day, (l) => l.includes(t.id) ? l.filter((x) => x !== t.id) : [...l, t.id])}>
          <span className="muse-agenda-choice"><MuseIcon name={categoryIcon[movementCategory(t)]} size={14} />{t.name}</span>{planned.includes(t.id) && <MuseIcon name="check" size={14} />}</button>)}</div>
      <form className="muse-agenda-create" onSubmit={create}><label className="editor-label" htmlFor={`${id}-new`}>New movement type</label>
        <div><input id={`${id}-new`} value={name} maxLength={40} placeholder="Pilates, Hike…" onChange={(e) => { setName(e.target.value); setError(""); }} /><button type="submit" className="muse-button" disabled={!name.trim()}>Add</button></div>
        {error && <p className="small-label" role="alert">{error}</p>}</form>
    </GlassPopover>
    {ids.length ? <ul className="muse-agenda-badges">{ids.map((typeId) => {
      const type = types.find((t) => t.id === typeId), cat = type ? movementCategory(type) : "other", isPlanned = planned.includes(typeId), isDone = done.has(typeId);
      return <li key={typeId} className="muse-agenda-badge" data-accent={categoryAccent[cat]} data-done={isDone || undefined}>
        <MuseIcon name={categoryIcon[cat]} size={12} /><span>{type?.name ?? "Movement"}</span>
        <span className="muse-agenda-badge-state">{isDone ? "✓ done" : "planned"}</span>
        {isPlanned && ready && <span data-no-drag><MuseOverflowMenu label={`${type?.name ?? "Movement"} on ${ctx.day}`} actions={[
          ...week.map((d) => ({ id: `move-${d}`, label: `Move plan to ${weekdayShort(d)} ${Number(d.slice(8))}`, onSelect: () => move(typeId, d) })),
          { id: "remove", label: isDone ? "Remove from plan (keeps what you did)" : "Remove from plan", onSelect: () => save(ctx.day, (l) => l.filter((x) => x !== typeId)) },
        ]} /></span>}
      </li>;
    })}</ul> : <p className="muse-agenda-empty">{ready ? "Rest, or plan something" : status.error ? "Movement couldn’t load." : "Loading…"}</p>}
  </Band>;
}

/** Bookshelf sessions on this date. Daily numbers come from that day's sessions; position from the page recorded that day. */
function ReadingSection({ section, ctx }: { section: AgendaSection; ctx: DayContext }) {
  const whimsy = useWhimsyData();
  const sessions = (whimsy.records?.sessions ?? []).filter((s) => s.date === ctx.day), books = whimsy.records?.books ?? [];
  const byBook = [...new Set(sessions.map((s) => s.bookId))].map((id) => {
    const list = sessions.filter((s) => s.bookId === id), book = books.find((b) => b.id === id);
    const last = [...list].sort((a, b) => (a.activeSegments.at(-1)?.end ?? "").localeCompare(b.activeSegments.at(-1)?.end ?? "")).at(-1);
    const minutes = Math.round(list.reduce((n, s) => n + sessionSeconds(s), 0) / 60), pages = list.reduce((n, s) => n + (s.pages || 0), 0);
    const value = section.metric === "pages" ? (pages ? `+${pages} pages` : "—") : section.metric === "position" ? (last?.endingPage ? `p. ${last.endingPage}${book?.totalPages ? ` / ${book.totalPages}` : ""}` : "—") : (minutes ? `${minutes} min` : "—");
    return { id, title: book?.title ?? "A book", value };
  });
  return <Band section={section} ctx={ctx} count={byBook.length}>
    {byBook.length ? <ul className="muse-agenda-badges">{byBook.map((b) => <li key={b.id} className="muse-agenda-badge" data-accent="secondary"><MuseIcon name="book" size={13} /><span>{b.title}</span><span className="muse-agenda-badge-state">{b.value}</span></li>)}</ul>
      : <p className="muse-agenda-empty">{!whimsy.status.loaded ? "Loading…" : "No reading logged"}</p>}
  </Band>;
}

function MealsSection({ section, ctx }: { section: AgendaSection; ctx: DayContext }) {
  const { state } = useWellness();
  const meals = state.assignments.filter((m) => m.date === ctx.day).sort((a, b) => mealSlots.indexOf(a.slot) - mealSlots.indexOf(b.slot) || (a.order ?? 0) - (b.order ?? 0));
  return <Band section={section} ctx={ctx} count={meals.length}>
    {meals.length ? <ul className="muse-agenda-lines">{meals.map((m) => <li key={m.id}><span className="small-label">{mealLabels[m.slot]}</span>{m.title}</li>)}</ul> : <p className="muse-agenda-empty">No meals planned</p>}
  </Band>;
}

/** Water uses Wellness's own records and the same bar colors as the Daily dashboard; adding here adds there. */
function WaterSection({ section, ctx }: { section: AgendaSection; ctx: DayContext }) {
  const { state, dispatch, status } = useWellness();
  const [open, setOpen] = useState(false), [custom, setCustom] = useState("");
  const anchor = useRef<HTMLButtonElement>(null), id = useId();
  // #104 §9A: one rule everywhere — a logged day keeps the goal it was logged with; any other day uses the current
  // shared goal, falling back to the same default Daily Edit uses (it used to fall back to a different 64 oz).
  const settings = state.waterSettings ?? defaultWaterSettings;
  const day = state.water.find((w) => w.date === ctx.day), unit = day?.unit ?? settings.unit, goal = day?.goal ?? settings.goal, total = day?.total ?? 0;
  const historical = !!day?.goal && !!state.waterSettings && day.goal !== state.waterSettings.goal;
  const add = (amount: number) => { if (amount > 0) dispatch({ kind: "water", date: ctx.day, mode: "add", amount, settings }); };
  const text = `${formatWaterAmount(total)}${goal ? ` / ${formatWaterAmount(goal)}` : ""} ${unit}`;
  return <Band section={section} ctx={ctx} action={<span className="muse-agenda-water-head"><span className="small-label" title={historical ? "The goal you had when this day was logged" : undefined}>{text}{historical && <span className="sr-only"> (goal that day)</span>}</span>
      {status.loaded && !status.error && <button ref={anchor} type="button" className="muse-agenda-add" aria-haspopup="dialog" aria-expanded={open} aria-controls={id} aria-label={`Add water on ${ctx.day}`} onClick={() => setOpen(!open)}><MuseIcon name="plus" size={13} /></button>}</span>}>
    <GlassPopover id={id} label={`Add water · ${weekdayShort(ctx.day)} ${Number(ctx.day.slice(8))}`} open={open} anchorRef={anchor} onClose={() => setOpen(false)} width={260}>
      <div className="muse-chip-row" role="group" aria-label="Quick amounts">{settings.quickAdds.map((n) => <button key={n} type="button" onClick={() => add(n)}>+{formatWaterAmount(n)} {unit}</button>)}</div>
      <form className="muse-agenda-create" onSubmit={(e) => { e.preventDefault(); const n = parseWaterAmount(custom); if (n) { add(n); setCustom(""); } }}>
        <label className="editor-label" htmlFor={`${id}-amt`}>Another amount ({unit})</label>
        <div><input id={`${id}-amt`} inputMode="decimal" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="20" /><button type="submit" className="muse-button" disabled={!parseWaterAmount(custom)}>Add</button></div></form>
    </GlassPopover>
    <div className="water-progress muse-agenda-water" role="img" aria-label={`Water: ${text}`} style={{ "--water-progress": `${Math.min(100, goal ? (total / goal) * 100 : 0)}%` } as CSSProperties}><span /></div>
  </Band>;
}

function NotesSection({ section, ctx }: { section: AgendaSection; ctx: DayContext }) {
  const { note, setNote, userId } = useAgendaData();
  const n = note(section.id, ctx.day);
  // A Notes starter is a prompt (placeholder) until the person writes; it is never saved on their behalf.
  return <Band section={section} ctx={ctx}>
    <textarea className="muse-agenda-note" aria-label={`${section.title} for ${ctx.day}`} maxLength={5000} disabled={!userId} value={n.body} placeholder={section.starterBody ?? "…"} onChange={(e) => setNote({ ...n, body: e.target.value })} />
  </Band>;
}

/**
 * Checklist and Simple List sections (#87): Planner-only items for one day. They are never Muse tasks: checking one
 * off completes nothing elsewhere. A day with nothing saved yet shows the section's starter items; the first edit saves
 * that day's own copy, so other days and the template are never changed.
 */
function ItemsSection({ section, ctx }: { section: AgendaSection; ctx: DayContext }) {
  const { note, setNote, userId } = useAgendaData();
  const saved = note(section.id, ctx.day), [draft, setDraft] = useState("");
  const starterKey = (section.starter ?? []).join("\n");
  const fallback = useMemo(() => starterItems(starterKey ? starterKey.split("\n") : []), [starterKey]);
  const fresh = saved.revision === 0 && !saved.items.length && !saved.body;
  const items: SectionItem[] = fresh ? fallback : saved.items;
  const checklist = section.type === "checklist", done = items.filter((i) => i.done).length;
  const save = (next: SectionItem[], delay = 400) => setNote({ ...saved, items: next.slice(0, MAX_ITEMS) }, delay);
  const add = (e: FormEvent) => { e.preventDefault(); const text = draft.trim().slice(0, MAX_ITEM_TEXT); if (!text) return; save([...items, { id: crypto.randomUUID(), text, done: false }], 0); setDraft(""); };
  const label = `${section.title} for ${ctx.day}`;
  return <Band section={section} ctx={ctx} count={checklist ? undefined : items.length}
    action={<span className="muse-agenda-items-head">{checklist && items.length > 0 && <span className="small-label">{done}/{items.length}</span>}
      {checklist && done > 0 && <MuseOverflowMenu label={`${section.title} options`} actions={[{ id: "reset", label: "Uncheck all", onSelect: () => save(uncheckAll(items), 0) }]} />}</span>}>
    {items.length > 0 && <ul className="muse-agenda-items" data-kind={section.type} aria-label={label}>{items.map((item) => <li key={item.id} data-done={checklist && item.done || undefined}>
      {checklist ? <label className="priority-completion muse-agenda-item-check"><input type="checkbox" className="check-input" checked={item.done} disabled={!userId} aria-label={item.text} onChange={() => save(items.map((i) => i.id === item.id ? { ...i, done: !i.done } : i), 0)} />
        <span className="priority-check" aria-hidden="true">{item.done && <MuseIcon name="check" size={12} />}</span></label>
        : <span className="muse-agenda-bullet" aria-hidden="true">–</span>}
      <input className="muse-agenda-item-text" value={item.text} maxLength={MAX_ITEM_TEXT} disabled={!userId} aria-label={`Edit “${item.text}”`}
        onChange={(e) => save(items.map((i) => i.id === item.id ? { ...i, text: e.target.value } : i), 700)}
        onBlur={(e) => { if (!e.target.value.trim()) save(items.filter((i) => i.id !== item.id), 0); }} />
      <button type="button" className="muse-agenda-item-remove" disabled={!userId} aria-label={`Remove “${item.text}” from this day`} onClick={() => save(items.filter((i) => i.id !== item.id), 0)}><MuseIcon name="close" size={11} /></button>
    </li>)}</ul>}
    {items.length < MAX_ITEMS && <form className="muse-agenda-item-add" onSubmit={add}>
      <input value={draft} maxLength={MAX_ITEM_TEXT} disabled={!userId} placeholder={checklist ? "Add an item…" : "Add to the list…"} aria-label={`Add to ${label}`} onChange={(e) => setDraft(e.target.value)} /></form>}
  </Band>;
}

/**
 * #104 §9C: the section's Muse Mark is chosen right on its title. It changes the shared weekly template (every day
 * shows the same section the same way), exactly like Customize layout does — no separate setting.
 */
function SectionMarkButton({ section }: { section: AgendaSection }) {
  const { changeLayout } = useAgendaData();
  const anchor = useRef<HTMLButtonElement>(null), [open, setOpen] = useState(false), id = useId();
  const look = section.style;
  const update = (patch: Partial<Omit<AgendaSection, "id" | "type">>) => changeLayout({ type: "update", id: section.id, patch });
  return <>
    <button ref={anchor} type="button" className="muse-agenda-section-icon muse-agenda-section-mark" data-empty={!section.icon || undefined} aria-label={section.icon ? `Change the Mark for ${section.title}` : `Add a Mark to ${section.title}`} title="Choose a Mark for this section" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
      <MuseIcon name={section.icon ? markIconName(section.icon) as MuseIconName : "sparkle"} size={13} /></button>
    <GlassPopover id={id} label={`Mark for ${section.title}`} open={open} anchorRef={anchor} onClose={() => setOpen(false)} width={300}>
      <fieldset className="muse-mark-icons"><legend className="sr-only">Symbol</legend>
        <label title="None"><input type="radio" name={`${id}-icon`} checked={!section.icon} onChange={() => update({ icon: undefined })} aria-label="No Mark" /><span>–</span></label>
        {markIcons.map((i) => <label key={i.id} title={i.label}><input type="radio" name={`${id}-icon`} checked={section.icon === i.id} onChange={() => update({ icon: i.id })} aria-label={i.label} /><span><MuseIcon name={markIconName(i.id) as MuseIconName} size={15} /></span></label>)}
      </fieldset>
      <div className="muse-chip-row" role="group" aria-label="Section color">{[undefined, ...markColors].map((c) => <button key={c ?? "theme"} type="button" className="muse-section-color" aria-pressed={look?.accent === c} aria-label={c ? `${c} color` : "Theme color"} style={c ? { background: accentCss(c) } : undefined} onClick={() => update({ style: { ...(look ?? {}), accent: c } })} />)}</div>
      <p className="small-label">Applies to this section on every day.</p>
    </GlassPopover>
  </>;
}
