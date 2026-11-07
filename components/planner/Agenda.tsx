"use client";
import { useEffect, useRef, useState } from "react";
import type { PlannedTask } from "@/lib/models";
import { agendaRange, agendaTitle, agendaViews, dayItems, defaultAgendaPreferences, futureLogMonths, monthGrid, monthItems, parseAgendaPreferences, type AgendaPreferences, type AgendaView } from "@/lib/agenda";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { GlassPopover } from "../GlassPopover";
import { PlanEntryForm } from "../PlanEntryForm";
import { usePlanner } from "../PlannerStore";
import { AgendaTaskCard } from "./AgendaTaskCard";
import { PlanningDropZone } from "./PlanningDropZone";
import { TaskQuickAdd } from "./TaskQuickAdd";
import "./Agenda.css";

const prefsKey = "muse.planner.agenda";
const weekday = (d: string, style: "short" | "long" = "short") => new Intl.DateTimeFormat("en-US", { weekday: style, timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const dayNumber = (d: string) => Number(d.slice(8, 10));
const monthName = (m: string) => new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(`${m}-15T12:00:00Z`));

/**
 * The Agenda tab (#79): Day, Week, Month and Future Log over the same records as Tasks. Hiding completed tasks only
 * changes what is shown; dropping a task on a day reschedules the one canonical task.
 */
export function Agenda({ date, today, onDate, onOpen, sidebar, workspaceId, groupId, tagIds }: { date: string; today: string; onDate: (date: string) => void; onOpen: (task: PlannedTask, anchor: HTMLElement) => void; sidebar: React.ReactNode; workspaceId?: string; groupId?: string; tagIds?: string[] }) {
  const { state, dispatch } = usePlanner();
  const [prefs, setPrefs] = useState<AgendaPreferences>(defaultAgendaPreferences);
  useEffect(() => { const t = window.setTimeout(() => { try { setPrefs(parseAgendaPreferences(JSON.parse(window.localStorage.getItem(prefsKey) ?? "{}"))); } catch { /* defaults */ } }, 0); return () => window.clearTimeout(t); }, []);
  const update = (patch: Partial<AgendaPreferences>) => setPrefs((p) => { const next = { ...p, ...patch }; try { window.localStorage.setItem(prefsKey, JSON.stringify(next)); } catch { /* this device only */ } return next; });
  const [adding, setAdding] = useState<string | null>(null);
  const anchor = useRef<HTMLElement | null>(null), track = useRef<HTMLDivElement>(null);
  // Week: bring the chosen day (today by default) into view inside the track, without scrolling the page.
  useEffect(() => { if (prefs.view !== "week") return; const t = track.current, col = t?.querySelector<HTMLElement>(`[data-day="${date}"]`) ?? t?.querySelector<HTMLElement>(`[data-day="${today}"]`); if (t && col) t.scrollTo({ left: col.offsetLeft - t.offsetLeft - 4, behavior: "auto" }); }, [prefs.view, date, today]);
  const step = (dir: 1 | -1) => { const t = track.current, col = t?.querySelector<HTMLElement>(".muse-agenda-day"); if (t && col) t.scrollBy({ left: dir * (col.offsetWidth + 10), behavior: "smooth" }); };
  const view = prefs.view, range = agendaRange(view, date);
  const tasks = state.tasks.filter((t) => (!workspaceId || t.workspaceId === workspaceId) && (!groupId || t.groupId === groupId) && (!tagIds?.length || tagIds.every((id) => t.tagIds.includes(id))));
  const open = (day: string, view: AgendaView) => { onDate(day); update({ view }); };

  function dayColumn(day: string, wide = false) {
    const items = dayItems(tasks, state.events, day, prefs.showCompleted);
    return <section key={day} data-day={day} className="muse-agenda-day" data-today={day === today || undefined} data-wide={wide || undefined} aria-label={`${weekday(day, "long")} ${day}`}>
      <header><button type="button" className="muse-agenda-day-heading" onClick={() => open(day, "day")} aria-label={`Open ${weekday(day, "long")} in Day view`}><span>{weekday(day)}</span><strong>{dayNumber(day)}</strong></button></header>
      <div className="muse-agenda-section" data-section="events">
        <div className="muse-agenda-section-head"><h3>Events</h3><button type="button" className="muse-agenda-add" aria-label={`Add an event on ${day}`} onClick={(e) => { anchor.current = e.currentTarget; setAdding(day); }}>+</button></div>
        {items.events.length ? <ul>{items.events.map((ev) => <li key={ev.id}><time dateTime={ev.dateTime}>{ev.time}</time><span>{ev.title}</span></li>)}</ul> : <p className="muse-agenda-empty">Open</p>}
      </div>
      <PlanningDropZone date={day} className="muse-agenda-section muse-agenda-drop">
        <div className="muse-agenda-section-head"><h3>Tasks</h3>{items.hiddenComplete > 0 && <span className="small-label">{items.hiddenComplete} done</span>}</div>
        {items.tasks.length ? <ul className="muse-agenda-task-list">{items.tasks.map((t) => <AgendaTaskCard key={t.id} task={t} onOpen={onOpen} />)}</ul> : <p className="muse-agenda-empty">A little breathing room.</p>}
        <TaskQuickAdd date={day} workspaceId={workspaceId} groupId={groupId} tagIds={tagIds} />
      </PlanningDropZone>
    </section>;
  }

  return <section className="muse-agenda" aria-label="Agenda">
    <div className="muse-agenda-toolbar">
      <MuseChoiceMenu label="Agenda view" valueLabel={agendaViews.find((v) => v.id === view)!.label} options={agendaViews.map((v) => ({ id: v.id, label: v.label }))} selectedIds={[view]} onSelect={(id) => update({ view: id as AgendaView })} />
      <div className="muse-agenda-nav" role="group" aria-label="Move through the Agenda">
        <button type="button" className="muse-button" aria-label="Previous" onClick={() => onDate(range.previous)}>‹</button>
        <button type="button" className="muse-button" onClick={() => onDate(today)}>Today</button>
        <button type="button" className="muse-button" aria-label="Next" onClick={() => onDate(range.next)}>›</button>
      </div>
      <h2 className="muse-agenda-title">{agendaTitle(view, date)}</h2>
      <label className="muse-agenda-check"><input type="checkbox" checked={prefs.showCompleted} onChange={(e) => update({ showCompleted: e.target.checked })} /> Show completed</label>
      <button type="button" className="muse-button button-ghost" aria-pressed={prefs.showSidebar} onClick={() => update({ showSidebar: !prefs.showSidebar })}>Task list</button>
    </div>
    <div className="muse-agenda-body" data-sidebar={prefs.showSidebar || undefined}>
      {prefs.showSidebar && <aside className="muse-agenda-sidebar" aria-label="Unscheduled tasks">{sidebar}</aside>}
      <div className="muse-agenda-content">
        {view === "day" && dayColumn(date, true)}
        {view === "week" && <div className="muse-agenda-week-wrap"><button type="button" className="muse-agenda-step" data-dir="back" aria-label="Show earlier days" onClick={() => step(-1)}>‹</button><div className="muse-agenda-week" ref={track} tabIndex={0} aria-label="Week days, scroll sideways for more">{range.days.map((d) => dayColumn(d))}</div><button type="button" className="muse-agenda-step" data-dir="forward" aria-label="Show later days" onClick={() => step(1)}>›</button></div>}
        {view === "month" && <div className="muse-agenda-month" role="grid" aria-label={agendaTitle("month", date)}>
          <div role="row" className="muse-agenda-month-row muse-agenda-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span role="columnheader" key={d}>{d}</span>)}</div>
          {monthGrid(date).map((week, i) => <div role="row" className="muse-agenda-month-row" key={i}>{week.map((d, j) => {
            if (!d) return <span role="gridcell" key={j} className="muse-agenda-cell" data-outside />;
            const items = dayItems(tasks, state.events, d, prefs.showCompleted), all = [...items.events.map((e) => ({ id: e.id, text: `${e.time} ${e.title}`, done: false })), ...items.tasks.map((t) => ({ id: t.id, text: t.title, done: t.complete }))];
            return <div role="gridcell" key={d} className="muse-agenda-cell" data-today={d === today || undefined}>
              <button type="button" className="muse-agenda-cell-date" onClick={() => open(d, "day")} aria-label={`Open ${d} in Day view`}>{dayNumber(d)}</button>
              <ul>{all.slice(0, 3).map((x) => <li key={x.id} data-done={x.done || undefined}>{x.text}</li>)}</ul>
              {all.length > 3 && <button type="button" className="text-button muse-agenda-more" onClick={() => open(d, "day")}>+{all.length - 3} more</button>}
            </div>;
          })}</div>)}
        </div>}
        {view === "year" && <div className="muse-agenda-year">{futureLogMonths(date).map((m) => {
          const items = monthItems(tasks, state.events, m, prefs.showCompleted), all = [...items.events.map((e) => ({ id: e.id, day: dayNumber(e.date), text: e.title, done: false })), ...items.tasks.map((t) => ({ id: t.id, day: dayNumber(t.plannedDate!), text: t.title, done: t.complete }))].sort((a, b) => a.day - b.day);
          return <section key={m} className="muse-agenda-log-month" data-current={m === today.slice(0, 7) || undefined}>
            <h3><button type="button" className="text-button" onClick={() => open(`${m}-01`, "month")}>{monthName(m)}</button></h3>
            {all.length ? <ul>{all.slice(0, 8).map((x) => <li key={x.id} data-done={x.done || undefined}><span>{x.day}</span>{x.text}</li>)}</ul> : <p className="muse-agenda-empty">Nothing planned yet</p>}
            {all.length > 8 && <button type="button" className="text-button muse-agenda-more" onClick={() => open(`${m}-01`, "month")}>+{all.length - 8} more</button>}
          </section>;
        })}</div>}
      </div>
    </div>
    <GlassPopover id="agenda-entry" label="Add event" open={adding !== null} anchorRef={anchor} onClose={() => setAdding(null)} width={340}>
      {adding && <PlanEntryForm key={adding} kind="event" date={adding} onCancel={() => setAdding(null)} onAdd={(item) => { if (item.kind === "event") dispatch({ type: "event/add", event: item }); setAdding(null); }} />}
    </GlassPopover>
  </section>;
}
