"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { DayEvent, PlannedTask } from "@/lib/models";
import { agendaRange, agendaTitle, agendaViews, dayItems, defaultAgendaPreferences, eventDays, futureLogMonths, monthGrid, monthItems, parseAgendaPreferences, SPREAD_SIZE, taskState, weekSlots, type AgendaPreferences, type AgendaView } from "@/lib/agenda";
import { dayMarks, resolveMark, type ResolvedMark } from "@/lib/muse-marks";

import { WeekPlanningColumn } from "./WeekPlanningColumn";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { GlassPopover } from "../GlassPopover";
import { MuseIcon } from "../MuseIcon";
import { usePlanner } from "../PlannerStore";
import { useWellness } from "../WellnessStore";
import { useWhimsyData } from "../whimsy/WhimsyData";
import { useAspirations } from "../rituals/aspirations/useAspirations";
import { useDailyData, useDailyRange } from "../daily/DailyData";
import { AgendaDataProvider, useAgendaData } from "./AgendaData";
import { AgendaSectionView, EventLine, type DayContext } from "./AgendaSections";
import { TaskListRow } from "./TaskListRow";
import { EventEditor } from "./EventEditor";
import { LayoutEditor } from "./LayoutEditor";
import { AgendaLegend, MarkEditor, MarkGlyph, MarkStrip } from "./MuseMarks";
import "./Agenda.css";
import { usePlannerHeight } from "./usePlannerHeight";
import { PeriodTitle } from "./PeriodTitle";
import { projectEvents, projectTasks } from "@/lib/planner-occurrences";
import { shiftDate } from "@/lib/dates";

const prefsKey = "muse.planner.agenda";
const weekday = (d: string, style: "short" | "long" = "short") => new Intl.DateTimeFormat("en-US", { weekday: style, timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const dayNumber = (d: string) => Number(d.slice(8, 10));
const monthName = (m: string) => new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(`${m}-15T12:00:00Z`));
const longDate = (d: string) => new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

type Props = { date: string; today: string; onDate: (date: string) => void; onOpen: (task: PlannedTask, anchor: HTMLElement) => void; workspaceId?: string };

/** The dates whose Marks, notes and priorities the current view needs. */
function windowFor(view: AgendaView, date: string) {
  if (view === "year") return { start: `${date.slice(0, 4)}-01-01`, end: `${date.slice(0, 4)}-12-31` };
  const days = view === "month" ? monthGrid(date).flat().filter((d): d is string => !!d) : agendaRange(view, date).days;
  return { start: days[0], end: days[days.length - 1] };
}

/**
 * The Agenda tab (#79): Day, Week, Month and Future Log over the same records as Tasks and Dayview. Every day column
 * follows one shared section template; hiding things only changes what is shown; moving a task or event updates the
 * one canonical record everywhere.
 */
export function Agenda(props: Props) {
  const [prefs, setPrefs] = useState<AgendaPreferences>(defaultAgendaPreferences);
  useEffect(() => { const t = window.setTimeout(() => { try { setPrefs(parseAgendaPreferences(JSON.parse(window.localStorage.getItem(prefsKey) ?? "{}"))); } catch { /* defaults */ } }, 0); return () => window.clearTimeout(t); }, []);
  const update = (patch: Partial<AgendaPreferences>) => setPrefs((p) => { const next = { ...p, ...patch }; try { window.localStorage.setItem(prefsKey, JSON.stringify(next)); } catch { /* this device only */ } return next; });
  const { start, end } = windowFor(prefs.view, props.date);
  return <AgendaDataProvider start={start} end={end}><AgendaBody {...props} prefs={prefs} update={update} start={start} end={end} /></AgendaDataProvider>;
}

type Editor = { kind: "event"; date: string; event?: DayEvent; status?: "confirmed" | "tentative" } | { kind: "mark"; date: string; mark?: ResolvedMark; link?: { kind: "event" | "task"; id: string; title: string } } | { kind: "settings" };

function AgendaBody({ date, today, onDate, onOpen, workspaceId, prefs, update, start, end }: Props & { prefs: AgendaPreferences; update: (p: Partial<AgendaPreferences>) => void; start: string; end: string }) {
  const { state } = usePlanner();
  const agenda = useAgendaData(), wellness = useWellness(), whimsy = useWhimsyData(), aspirations = useAspirations();
  const daily = useDailyData(); useDailyRange(prefs.view === "year" ? today : start, prefs.view === "year" ? today : end);
  const [editor, setEditor] = useState<Editor | null>(null), [customizing, setCustomizing] = useState(false), [selected, setSelected] = useState<string | null>(null);
  const track = useRef<HTMLDivElement>(null), [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const anchor = useMemo(() => ({ current: anchorEl }), [anchorEl]);
  const openEditor = (a: HTMLElement, e: Editor) => { setAnchorEl(a); setEditor(e); };
  const closeEditor = () => { setEditor(null); anchorEl?.focus(); };

  // Week: two spreads (Mon–Thu, Fri–Sun + planning). Open on the spread holding the chosen day; never scroll the page.
  const [spread, setSpread] = useState(0);
  usePlannerHeight(track, prefs.view); // the week fills the window down to the bottom padding
  const goSpread = (n: number) => { const t = track.current, col = t?.children[n * SPREAD_SIZE] as HTMLElement | undefined; if (t && col) t.scrollTo({ left: col.offsetLeft - t.offsetLeft, behavior: "smooth" }); };
  useEffect(() => { if (prefs.view !== "week") return; const t = track.current; const target = t?.querySelector<HTMLElement>(`[data-day="${date}"]`) ?? t?.querySelector<HTMLElement>(`[data-day="${today}"]`); if (t && target) t.scrollTo({ left: target.offsetLeft - t.offsetLeft, behavior: "auto" }); }, [prefs.view, date, today]);
  const onTrackScroll = () => { const t = track.current, second = t?.children[SPREAD_SIZE] as HTMLElement | undefined; if (t && second) setSpread(t.scrollLeft + 8 >= second.offsetLeft - t.offsetLeft ? 1 : 0); };
  const view = prefs.view, range = agendaRange(view, date), visibility = { showCompleted: prefs.showCompleted, showCanceled: prefs.showCanceled };
  // Recurrence 2.0 (#89): recurring tasks and events as dated occurrences, over everything this view can show.
  const windowFrom = shiftDate(date, -45), windowTo = shiftDate(date, view === "year" ? 400 : 45);
  const tasksShown = useMemo(() => projectTasks(state.tasks, state.occurrences, windowFrom, windowTo), [state.tasks, state.occurrences, windowFrom, windowTo]);
  const eventsShown = useMemo(() => projectEvents(state.events, state.eventExceptions, windowFrom, windowTo), [state.events, state.eventExceptions, windowFrom, windowTo]);
  const open = (day: string, v: AgendaView) => { onDate(day); update({ view: v }); setSelected(null); };

  const marks = useMemo(() => agenda.marks.map((m) => resolveMark(m, { events: state.events, tasks: state.tasks, movementTypes: wellness.state.types, books: whimsy.records?.books ?? [], aspirations: aspirations.aspirations })),
    [agenda.marks, state.events, state.tasks, wellness.state.types, whimsy.records?.books, aspirations.aspirations]);
  const priorityIds = (day: string) => new Set((daily.snapshot.days[day]?.priorities ?? []).map((p) => p.task_id).filter((x): x is string => !!x));
  const context = (day: string, flow: DayContext["flow"]): DayContext => {
    const items = dayItems(tasksShown, eventsShown, day, { showCompleted: true, showCanceled: prefs.showCanceled });
    return { day, today, tasks: items.tasks, events: items.events, showCompleted: prefs.showCompleted, showMarks: prefs.showMarks, marks, priorityIds: priorityIds(day), fallbackWorkspaceId: workspaceId, flow, onOpenTask: onOpen,
      onEvent: (a, event) => openEditor(a, { kind: "event", date: day, event }), onMark: (a, mark, link) => openEditor(a, { kind: "mark", date: day, mark, link }) };
  };
  const hiding = [!prefs.showCompleted && "completed tasks", !prefs.showCanceled && "canceled events", !prefs.showMarks && "Marks"].filter(Boolean) as string[];

  function dayHeader(day: string, ctx: DayContext) {
    const own = prefs.showMarks ? dayMarks(marks, day) : [];
    return <header className="muse-agenda-day-head">
      <button type="button" className="muse-agenda-day-heading" onClick={() => open(day, "day")} aria-label={`Open ${weekday(day, "long")} ${day} in Day view`}><span>{weekday(day)}</span><strong>{dayNumber(day)}</strong>{day === today && <em className="muse-agenda-today-word">Today</em>}</button>
      <MarkStrip marks={own} labels={false} onEdit={(m, a) => ctx.onMark(a, m)} />
      <button type="button" className="muse-agenda-add muse-agenda-mark-add" aria-label={`Add a Mark on ${day}`} title="Add a Mark" onClick={(e) => ctx.onMark(e.currentTarget)}><MuseIcon name="favorite" size={12} /></button>
    </header>;
  }
  function dayColumn(day: string) {
    const ctx = context(day, "fixed");
    return <section key={day} data-day={day} className={`muse-agenda-day muse-planner-surface${day === today ? " muse-today-ring" : ""}`} data-today={day === today || undefined} aria-label={`${weekday(day, "long")} ${day}${day === today ? ", today" : ""}`}>
      {dayHeader(day, ctx)}
      <div className="muse-agenda-day-body">{agenda.layout.sections.map((s) => <AgendaSectionView key={s.id} section={s} ctx={ctx} />)}</div>
    </section>;
  }
  function dailyPlanner() {
    const ctx = context(date, "auto"), record = daily.snapshot.days[date]?.record, priorities = daily.snapshot.days[date]?.priorities ?? [];
    const own = prefs.showMarks ? dayMarks(marks, date) : [];
    return <div className="muse-agenda-daily">
      <section className="muse-agenda-focus" aria-label="Focus for the day">
        <div className="muse-agenda-focus-head"><h3>{longDate(date)}</h3><Link className="muse-button button-ghost" href={`/?date=${date}`}>Open in Dayview</Link></div>
        {record?.intention_text ? <p className="muse-agenda-intention">{record.intention_emoji ? `${record.intention_emoji} ` : ""}{record.intention_text}</p> : <p className="muse-agenda-empty">No intention set for this day.</p>}
        {priorities.length > 0 && <ol className="muse-agenda-priorities" aria-label="Three priorities">{priorities.map((p) => {
          const task = p.task_id ? state.tasks.find((t) => t.id === p.task_id) : undefined, done = task ? task.complete : !!p.standalone_complete;
          return <li key={p.id} data-done={done || undefined}><span aria-hidden="true">★</span>{task?.title ?? p.text}{done && <span className="sr-only"> (done)</span>}</li>;
        })}</ol>}
        <div className="muse-agenda-focus-marks"><MarkStrip marks={own} onEdit={(m, a) => ctx.onMark(a, m)} /><button type="button" className="muse-button button-ghost" onClick={(e) => ctx.onMark(e.currentTarget)}>+ Mark</button></div>
      </section>
      <div className="muse-agenda-daily-sections">{agenda.layout.sections.map((s) => <AgendaSectionView key={s.id} section={s} ctx={ctx} />)}</div>
    </div>;
  }

  function monthView() {
    const sel = selected && selected.slice(0, 7) === date.slice(0, 7) ? selected : null;
    return <div className="muse-agenda-month-wrap">
      <div className="muse-agenda-month" role="grid" aria-label={agendaTitle("month", date)}>
        <div role="row" className="muse-agenda-month-row muse-agenda-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span role="columnheader" key={d}>{d}</span>)}</div>
        {monthGrid(date).map((week, i) => <div role="row" className="muse-agenda-month-row" key={i}>{week.map((d, j) => {
          if (!d) return <span role="gridcell" key={j} className="muse-agenda-cell" data-outside />;
          const items = dayItems(tasksShown, eventsShown, d, visibility), own = prefs.showMarks ? dayMarks(marks, d) : [];
          const open = items.tasks.filter((t) => !t.complete).length, overdue = items.tasks.some((t) => taskState(t, today) === "overdue"), star = items.tasks.some((t) => priorityIds(d).has(t.id));
          const summary = [items.events.length && `${items.events.length} event${items.events.length > 1 ? "s" : ""}`, items.tasks.length && `${open} of ${items.tasks.length} tasks open`, own.length && `${own.length} Mark${own.length > 1 ? "s" : ""}`].filter(Boolean).join(", ") || "Nothing planned";
          return <div role="gridcell" key={d} className="muse-agenda-cell" data-today={d === today || undefined} data-selected={sel === d || undefined}>
            <button type="button" className="muse-agenda-cell-select" aria-pressed={sel === d} aria-label={`${longDate(d)}: ${summary}. Show details`} onClick={() => setSelected(sel === d ? null : d)}>
              <span className="muse-agenda-cell-date">{dayNumber(d)}</span>
              {own.length > 0 && <span className="muse-agenda-cell-marks">{own.slice(0, 3).map((m) => <MarkGlyph key={m.id} mark={m} size={12} />)}</span>}
            </button>
            <ul aria-hidden="true">{items.events.slice(0, 2).map((e) => <li key={e.id} data-status={e.status === "confirmed" ? undefined : e.status}>{e.allDay ? "" : `${e.time.replace(":00", "").replace(" ", "").toLowerCase()} `}{e.title}</li>)}</ul>
            <span className="muse-agenda-cell-meta" aria-hidden="true">{items.events.length > 2 && <span>+{items.events.length - 2}</span>}{items.tasks.length > 0 && <span data-overdue={overdue || undefined}>{open ? `${overdue ? "›" : "•"} ${open} open` : "✓ done"}</span>}{star && <span>★</span>}</span>
          </div>;
        })}</div>)}
      </div>
      {sel && <section className="muse-agenda-day-detail" aria-label={`Details for ${longDate(sel)}`}>{(() => {
        const ctx = context(sel, "auto"), own = prefs.showMarks ? dayMarks(marks, sel) : [], tasks = ctx.tasks.filter((t) => prefs.showCompleted || !t.complete);
        return <>
          <header><h3>{longDate(sel)}</h3><div className="muse-agenda-detail-actions">
            <button type="button" className="muse-button button-ghost" onClick={() => open(sel, "day")}>Open day</button>
            <button type="button" className="muse-button button-ghost" onClick={() => open(sel, "week")}>Open week</button>
            <button type="button" className="muse-button button-ghost" onClick={(e) => ctx.onEvent(e.currentTarget)}>+ Event</button>
            <button type="button" className="muse-button button-ghost" onClick={(e) => ctx.onMark(e.currentTarget)}>+ Mark</button>
            <button type="button" className="muse-agenda-add" aria-label="Close details" onClick={() => setSelected(null)}><MuseIcon name="close" size={12} /></button></div></header>
          <MarkStrip marks={own} onEdit={(m, a) => ctx.onMark(a, m)} />
          {ctx.events.length > 0 && <ul className="muse-agenda-detail-events">{ctx.events.map((e) => <EventLine key={e.id} event={e} day={sel} ctx={ctx} />)}</ul>}
          {tasks.length > 0 ? <ul className="muse-task-list-rows muse-agenda-rows">{tasks.map((t) => <TaskListRow key={t.id} task={t} onOpen={onOpen} today={today} boardDays={[sel]} priority={ctx.priorityIds.has(t.id)} showWorkspace onPlaced={() => {}} reorderWithinDate />)}</ul> : !ctx.events.length && <p className="muse-agenda-empty">Nothing planned yet.</p>}
        </>;
      })()}</section>}
    </div>;
  }

  function futureLog() {
    return <div className="muse-agenda-year">{futureLogMonths(date).map((m) => {
      const items = monthItems(tasksShown, eventsShown, m, visibility), first = `${m}-01`, last = `${m}-31`;
      const own = prefs.showMarks ? marks.filter((x) => x.linkKind !== "event" && x.linkKind !== "task" && x.start <= last && x.end >= first) : [];
      const entries = [
        ...items.events.map((e) => ({ key: `e${e.id}`, sort: e.date < first ? first : e.date, node: <FutureEvent event={e} month={m} marks={marks} showMarks={prefs.showMarks} onEdit={(a) => openEditor(a, { kind: "event", date: e.date, event: e })} onDay={() => open(e.date < first ? first : e.date, "day")} /> })),
        ...own.map((x) => ({ key: `m${x.id}`, sort: x.start < first ? first : x.start, node: <><button type="button" className="muse-agenda-log-day" onClick={() => open(x.start < first ? first : x.start, "day")}>{eventDays({ date: x.start, endDate: x.end }, m)}</button><MarkGlyph mark={x} onSelect={(a) => openEditor(a, { kind: "mark", date: x.start, mark: x })} /><span>{x.title || "Marked"}</span></> })),
        ...items.tasks.map((t) => ({ key: `t${t.id}`, sort: t.plannedDate!, node: <><button type="button" className="muse-agenda-log-day" onClick={() => open(t.plannedDate!, "day")}>{dayNumber(t.plannedDate!)}</button><span className="muse-agenda-symbol" aria-hidden="true">{t.complete ? "✓" : taskState(t, today) === "overdue" ? "›" : "•"}</span><span data-done={t.complete || undefined}>{t.title}<span className="sr-only">{t.complete ? " (completed task)" : " (task)"}</span></span></> })),
      ].sort((a, b) => a.sort.localeCompare(b.sort));
      return <section key={m} className="muse-agenda-log-month" data-current={m === today.slice(0, 7) || undefined} aria-labelledby={`log-${m}`}>
        <header><h3 id={`log-${m}`}><button type="button" className="text-button" onClick={() => open(first, "month")} aria-label={`Open ${monthName(m)} in Month view`}>{monthName(m)}</button></h3>
          <span className="muse-agenda-log-add">
            <button type="button" className="muse-agenda-add" aria-label={`Add a plan in ${monthName(m)}`} title="Add an event or plan" onClick={(e) => openEditor(e.currentTarget, { kind: "event", date: m === today.slice(0, 7) ? today : first })}><MuseIcon name="plus" size={13} /></button>
            <button type="button" className="muse-agenda-add" aria-label={`Add a Mark in ${monthName(m)}`} title="Add a Mark" onClick={(e) => openEditor(e.currentTarget, { kind: "mark", date: m === today.slice(0, 7) ? today : first })}><MuseIcon name="favorite" size={12} /></button></span></header>
        {entries.length ? <ul>{entries.map((x) => <li key={x.key}>{x.node}</li>)}</ul> : <p className="muse-agenda-empty">Nothing planned yet</p>}
      </section>;
    })}</div>;
  }

  return <section className="muse-agenda" aria-label="Agenda">
    <div className="muse-agenda-toolbar">
      <PeriodTitle title={agendaTitle(view, date)} date={date} onChange={onDate} />
      <div className="muse-agenda-tools">
        <div className="muse-agenda-nav" role="group" aria-label="Move through the Agenda">
          <button type="button" className="muse-button" aria-label="Previous" onClick={() => onDate(range.previous)}>‹</button>
          <button type="button" className="muse-button" onClick={() => onDate(today)}>Today</button>
          <button type="button" className="muse-button" aria-label="Next" onClick={() => onDate(range.next)}>›</button>
        </div>
        <MuseChoiceMenu label="Agenda view" valueLabel={agendaViews.find((v) => v.id === view)!.label} options={agendaViews.map((v) => ({ id: v.id, label: v.label }))} selectedIds={[view]} onSelect={(id) => { update({ view: id as AgendaView }); setSelected(null); }} />
        <button type="button" className="muse-button" onClick={(e) => openEditor(e.currentTarget, { kind: "event", date: view === "year" || view === "month" ? (date.slice(0, 7) === today.slice(0, 7) ? today : date) : date })}>+ Event</button>
        {(view === "week" || view === "day") && <button type="button" className="muse-button" aria-pressed={customizing} onClick={() => setCustomizing(!customizing)}>Customize layout</button>}
        <button type="button" className="muse-button muse-agenda-icon" aria-label="View settings and key" aria-expanded={editor?.kind === "settings"} onClick={(e) => openEditor(e.currentTarget, { kind: "settings" })}><MuseIcon name="settings" size={16} /></button>
        {view === "week" && <div className="muse-agenda-spread-nav" role="group" aria-label="Week spreads">
          <button type="button" className="muse-button muse-agenda-icon" aria-label="Monday to Thursday" disabled={spread === 0} onClick={() => goSpread(0)}>‹</button>
          <span className="small-label" aria-live="polite">{spread === 0 ? "Mon – Thu" : "Fri – Sun"}</span>
          <button type="button" className="muse-button muse-agenda-icon" aria-label="Friday to Sunday and planning" disabled={spread === 1} onClick={() => goSpread(1)}>›</button>
        </div>}
      </div>
    </div>
    {hiding.length > 0 && <p className="muse-agenda-hiding small-label" role="status">Hiding {hiding.join(", ")}. <button type="button" className="text-button" onClick={() => update({ showCompleted: true, showCanceled: true, showMarks: true })}>Show everything</button></p>}
    {agenda.status && <p className="small-label" role="status">{agenda.status}</p>}
    {customizing && (view === "week" || view === "day") && <LayoutEditor onClose={() => setCustomizing(false)} />}
    <div className="muse-agenda-content">
      {view === "day" && dailyPlanner()}
      {view === "week" && <div className="muse-agenda-week" ref={track} tabIndex={0} onScroll={onTrackScroll} aria-label="Week, two spreads; scroll sideways">
          {weekSlots(date).map((slot) => slot.kind === "day" ? dayColumn(slot.date) : <WeekPlanningColumn key={`planning-${range.days[0]}`} weekStart={range.days[0]} />)}
        </div>}
      {view === "month" && monthView()}
      {view === "year" && futureLog()}
    </div>
    <GlassPopover id="agenda-editor" label={editor?.kind === "settings" ? "Agenda settings" : editor?.kind === "mark" ? (editor.mark ? "Edit Mark" : "New Mark") : editor?.kind === "event" && editor.event ? "Edit event" : "New event"} open={editor !== null} anchorRef={anchor} onClose={() => setEditor(null)} width={editor?.kind === "settings" ? 320 : 380}>
      {editor?.kind === "event" && <EventEditor key={editor.event?.id ?? `new-${editor.date}`} event={editor.event} date={editor.date} onDone={closeEditor} />}
      {editor?.kind === "mark" && <MarkEditor key={editor.mark?.id ?? `new-${editor.date}-${editor.link?.id ?? ""}`} mark={editor.mark} date={editor.date} link={editor.link} onDone={closeEditor} />}
      {editor?.kind === "settings" && <div className="muse-agenda-settings">
        <p className="editor-label">Show</p>
        <label className="muse-agenda-check"><input type="checkbox" checked={prefs.showCompleted} onChange={(e) => update({ showCompleted: e.target.checked })} /> Completed tasks</label>
        <label className="muse-agenda-check"><input type="checkbox" checked={prefs.showCanceled} onChange={(e) => update({ showCanceled: e.target.checked })} /> Canceled events</label>
        <label className="muse-agenda-check"><input type="checkbox" checked={prefs.showMarks} onChange={(e) => update({ showMarks: e.target.checked })} /> Muse Marks</label>
        <p className="small-label">Hiding never changes a task, event or Mark. A Tasks section can also show or hide completed tasks on its own (Customize layout).</p>
        <AgendaLegend />
      </div>}
    </GlassPopover>
  </section>;
}

function FutureEvent({ event, month, marks, showMarks, onEdit, onDay }: { event: DayEvent; month: string; marks: ResolvedMark[]; showMarks: boolean; onEdit: (a: HTMLElement) => void; onDay: () => void }) {
  const mark = showMarks ? marks.find((m) => m.linkKind === "event" && m.linkId === event.id) : undefined;
  return <>
    <button type="button" className="muse-agenda-log-day" onClick={onDay} aria-label={`Open ${event.date} in Day view`}>{eventDays(event, month)}</button>
    <span className="muse-agenda-symbol" aria-hidden="true">{event.status === "canceled" ? "×" : event.status === "tentative" ? "?" : "○"}</span>
    {mark && <MarkGlyph mark={mark} size={13} />}
    <button type="button" className="muse-agenda-log-entry" data-status={event.status === "confirmed" ? undefined : event.status} onClick={(e) => onEdit(e.currentTarget)}>
      {event.title}{event.status !== "confirmed" && <span className="small-label"> · {event.status}</span>}</button>
  </>;
}
