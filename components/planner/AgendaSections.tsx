"use client";
import { useState, type CSSProperties, type ReactNode } from "react";
import type { DayEvent, PlannedTask } from "@/lib/models";
import { mealLabels, mealSlots } from "@/lib/models";
import { eventDays, eventWhen, taskState } from "@/lib/agenda";
import { sectionRem, sectionWorkspaces, showCompletedFor, type AgendaSection } from "@/lib/agenda-layout";
import { itemMark, type ResolvedMark } from "@/lib/muse-marks";
import { movementCategory } from "@/lib/progress/movement";
import { formatWaterAmount } from "@/lib/water";
import { sessionSeconds } from "@/lib/whimsy/reading-stats";
import { weekDates } from "@/lib/dates";
import { sampleMovementTypes } from "@/lib/sample-taxonomies";
import { MAX_QUICK_MOVEMENTS } from "@/lib/selections";
import { MuseIcon, type MuseIconName } from "../MuseIcon";
import { MuseOverflowMenu } from "../MuseOverflowMenu";
import { usePlanner } from "../PlannerStore";
import { useWellness } from "../WellnessStore";
import { useWhimsyData } from "../whimsy/WhimsyData";
import { AgendaTaskCard } from "./AgendaTaskCard";
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
  const style = ctx.flow === "fixed" ? { "--section-h": `${sectionRem(section.size)}rem` } as CSSProperties : undefined;
  const headingId = `agenda-${section.id}-${ctx.day}`;
  return <div className="muse-agenda-section" data-section={section.type} data-size={section.size} data-flow={ctx.flow} style={style} role="group" aria-labelledby={headingId}>
    <div className="muse-agenda-section-head"><h3 id={headingId}>{section.title}{count ? <span className="muse-agenda-count"> · {count}</span> : null}</h3>{action}</div>
    {section.size === "collapsed" && ctx.flow === "fixed" ? null : <div className="muse-agenda-section-body" tabIndex={-1}>{children}</div>}
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
  }
}

const statusSymbol = (e: DayEvent) => e.status === "canceled" ? "×" : e.status === "tentative" ? "?" : "○";
const statusWords = (e: DayEvent) => e.status === "canceled" ? "Canceled" : e.status === "tentative" ? "Tentative" : "Event";
export function EventLine({ event, day, ctx }: { event: DayEvent; day?: string; ctx: Pick<DayContext, "marks" | "showMarks" | "onEvent" | "onMark"> }) {
  const mark = ctx.showMarks ? itemMark(ctx.marks, "event", event.id) : undefined;
  const span = event.endDate ? ` (${eventDays(event)})` : "";
  return <li className="muse-agenda-event" data-status={event.status === "confirmed" ? undefined : event.status} data-continues={day && day > event.date || undefined}>
    <span className="muse-agenda-symbol" aria-hidden="true">{statusSymbol(event)}</span>
    {mark && <MarkGlyph mark={mark} size={13} onSelect={(a) => ctx.onMark(a, mark, { kind: "event", id: event.id, title: event.title })} />}
    <button type="button" className="muse-agenda-event-button" onClick={(e) => ctx.onEvent(e.currentTarget, event)} aria-label={`${statusWords(event)}: ${event.title}, ${eventWhen(event)}${span}. Edit`}>
      <time dateTime={event.allDay ? event.date : event.dateTime}>{event.allDay ? "All day" : event.time}</time><span>{event.title}{span && <small>{span}</small>}</span>
    </button>
  </li>;
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
      {visible.length ? <ul className="muse-agenda-task-list">{visible.map((t) => <AgendaTaskCard key={t.id} task={t} onOpen={ctx.onOpenTask} today={ctx.today} priority={ctx.priorityIds.has(t.id)}
        mark={ctx.showMarks ? itemMark(ctx.marks, "task", t.id) : undefined} onMark={(a, mark) => ctx.onMark(a, mark, { kind: "task", id: t.id, title: t.title })} />)}</ul>
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
  const [picking, setPicking] = useState(false);
  const planned = state.movement.find((d) => d.date === ctx.day)?.typeIds ?? [];
  const done = new Set(state.activities.filter((a) => a.date === ctx.day).map((a) => a.typeId));
  // Same fallback as Dayview's Movement card: before anything is saved, the starter types are the vocabulary.
  const types = state.types.length ? state.types : starterTypes;
  const ids = [...new Set([...planned, ...done])], ready = status.loaded && !status.error;
  function plan(date: string, change: (ids: string[]) => string[]) {
    const s = store.getSnapshot().state, current = s.movement.find((d) => d.date === date)?.typeIds ?? [];
    const saved = s.types.length > 0;
    dispatch({ kind: "movement", types: saved ? s.types : starterTypes, quickIds: saved ? s.quickIds : starterTypes.slice(0, MAX_QUICK_MOVEMENTS).map((t) => t.id), recentIds: s.recentIds, day: { date, typeIds: change(current) } });
  }
  function move(id: string, to: string) { plan(ctx.day, (l) => l.filter((x) => x !== id)); plan(to, (l) => l.includes(id) ? l : [...l, id]); }
  const week = weekDates(ctx.day).filter((d) => d !== ctx.day);
  return <Band section={section} ctx={ctx} count={ids.length} action={ready ? <button type="button" className="muse-agenda-add" aria-expanded={picking} aria-label={`Plan movement on ${ctx.day}`} onClick={() => setPicking(!picking)}><MuseIcon name="plus" size={13} /></button> : undefined}>
    {picking && <div className="muse-agenda-picker muse-chip-row" role="group" aria-label="Movement to plan">{types.filter((t) => !t.archived).map((t) =>
      <button key={t.id} type="button" aria-pressed={planned.includes(t.id)} onClick={() => plan(ctx.day, (l) => l.includes(t.id) ? l.filter((x) => x !== t.id) : [...l, t.id])}>{t.name}</button>)}
      <button type="button" className="text-button" onClick={() => setPicking(false)}>Done</button></div>}
    {ids.length ? <ul className="muse-agenda-badges">{ids.map((id) => {
      const type = types.find((t) => t.id === id), cat = type ? movementCategory(type) : "other", isPlanned = planned.includes(id), isDone = done.has(id);
      return <li key={id} className="muse-agenda-badge" data-accent={categoryAccent[cat]} data-done={isDone || undefined}>
        <MuseIcon name={categoryIcon[cat]} size={13} /><span>{type?.name ?? "Movement"}</span>
        <span className="muse-agenda-badge-state">{isDone ? "✓ done" : "planned"}</span>
        {isPlanned && ready && <span data-no-drag><MuseOverflowMenu label={`${type?.name ?? "Movement"} on ${ctx.day}`} actions={[
          ...week.map((d) => ({ id: `move-${d}`, label: `Move plan to ${weekdayShort(d)} ${Number(d.slice(8))}`, onSelect: () => move(id, d) })),
          { id: "remove", label: isDone ? "Remove from plan (keeps what you did)" : "Remove from plan", onSelect: () => plan(ctx.day, (l) => l.filter((x) => x !== id)) },
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

function WaterSection({ section, ctx }: { section: AgendaSection; ctx: DayContext }) {
  const { state } = useWellness();
  const day = state.water.find((w) => w.date === ctx.day), unit = day?.unit ?? state.waterSettings?.unit ?? "oz", goal = day?.goal ?? state.waterSettings?.goal;
  const text = day?.total ? `${formatWaterAmount(day.total)}${goal ? ` / ${formatWaterAmount(goal)}` : ""} ${unit}` : "";
  return <Band section={section} ctx={ctx} action={text ? <span className="small-label">{text}</span> : undefined}>
    {text ? <div className="muse-agenda-meter" role="img" aria-label={`Water: ${text}`}><span style={{ width: `${Math.min(100, goal ? (day!.total / goal) * 100 : 100)}%` }} /></div> : <p className="muse-agenda-empty">Nothing logged</p>}
  </Band>;
}

function NotesSection({ section, ctx }: { section: AgendaSection; ctx: DayContext }) {
  const { note, setNote, userId } = useAgendaData();
  const n = note(section.id, ctx.day);
  return <Band section={section} ctx={ctx}>
    <textarea className="muse-agenda-note" aria-label={`${section.title} for ${ctx.day}`} maxLength={500} disabled={!userId} value={n.body} placeholder="…" onChange={(e) => setNote({ ...n, body: e.target.value })} />
  </Band>;
}
