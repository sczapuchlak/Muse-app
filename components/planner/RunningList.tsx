"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { PlannedTask } from "@/lib/models";
import type { PlannerFilters as Filters } from "@/lib/planner";
import { createTask } from "@/lib/planner";
import { completionDays, parseRunningSort, parseScheduleScope, runningSections, runningSorts, scheduleScopes, weekStrip, weekSummary, type RunningSort, type ScheduleScope } from "@/lib/running-list";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { MuseIcon } from "../MuseIcon";
import { useMuseSpark } from "../MuseSpark";
import { usePlanner } from "../PlannerStore";
import { PlannerFilters } from "./PlannerFilters";
import { PlannerWorkspaceMenu } from "./PlannerWorkspaceMenu";
import { ScheduleMenu } from "./ScheduleMenu";
import { taskFacts } from "./TaskListRow";
import { useTaskPlacement } from "./useTaskPlacement";
import { usePlannerHeight } from "./usePlannerHeight";

const prefKey = "muse.planner.runningList";
const short = (d: string) => new Intl.DateTimeFormat("en-US", { weekday: "narrow", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

/**
 * Planner → Tasks → Running List (#81). One continuous list of the same tasks the Scheduled Board, Agenda and Dayview
 * use. Active holds every open task, dated or not; Completed this week holds what was finished in the chosen week.
 * Each row's Mon–Sun strip shows the day it was actually completed (✓) and the day it is planned for (○); only
 * today's cell can complete it.
 */
export function RunningList({ tasks, weekOf, today, timeZone, workspaceId, onWorkspaceChange, search, onSearch, filters, onFilter, priorityIds, onOpen, onAnnounce }: {
  tasks: PlannedTask[]; weekOf: string; today: string; timeZone: string; workspaceId: string; onWorkspaceChange: (id: string) => void;
  search: string; onSearch: (v: string) => void; filters: Filters; onFilter: (v: Filters) => void; priorityIds: ReadonlySet<string>;
  onOpen: (task: PlannedTask, anchor: HTMLElement) => void; onAnnounce: (m: string) => void;
}) {
  const { state } = usePlanner();
  const [scope, setScope] = useState<ScheduleScope>("both"), [sort, setSort] = useState<RunningSort>("manual");
  useEffect(() => { const t = window.setTimeout(() => { try { const v = JSON.parse(window.localStorage.getItem(prefKey) ?? "{}"); setScope(parseScheduleScope(v.scope)); setSort(parseRunningSort(v.sort)); } catch { /* defaults */ } }, 0); return () => window.clearTimeout(t); }, []);
  const save = (next: { scope: ScheduleScope; sort: RunningSort }) => { setScope(next.scope); setSort(next.sort); try { window.localStorage.setItem(prefKey, JSON.stringify(next)); } catch { /* this device only */ } };
  const done = useMemo(() => completionDays(state.tasks, state.completionHistory, timeZone), [state.tasks, state.completionHistory, timeZone]);
  const { week, active, completed } = runningSections(tasks, done, weekOf, { scope, sort });
  const summary = weekSummary(new Map([...done].filter(([id]) => tasks.some((t) => t.id === id))), week, today);
  const showCompleted = filters.status !== "open", showActive = filters.status !== "complete";
  const box = useRef<HTMLDivElement>(null); usePlannerHeight(box);
  return <section className="muse-running-list" aria-labelledby="running-list-title">
    <header className="muse-running-head">
      <div className="muse-task-list-title"><h2 id="running-list-title">Running List</h2>
        <p className="muse-running-summary" aria-live="polite">{summary.week} completed this week{week.includes(today) ? ` · ${summary.today} today` : ""}</p></div>
      <div className="muse-running-tools">
        <PlannerWorkspaceMenu workspaceId={workspaceId} onChange={onWorkspaceChange} />
        <label className="muse-planner-search"><MuseIcon name="search" size={15} /><input aria-label="Search tasks" type="search" value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search…" /></label>
        <PlannerFilters value={filters} onChange={onFilter} workspaceId={workspaceId} />
        <div className="muse-task-list-scopes muse-chip-row" role="group" aria-label="Scheduled or not">
          {scheduleScopes.map((s) => <button key={s.id} type="button" aria-pressed={scope === s.id} onClick={() => save({ scope: s.id, sort })}>{s.label}</button>)}</div>
        <MuseChoiceMenu label="Order" valueLabel={runningSorts.find((s) => s.id === sort)!.label} options={runningSorts.map((s) => ({ id: s.id, label: s.label }))} selectedIds={[sort]} onSelect={(id) => save({ scope, sort: id as RunningSort })} />
      </div>
    </header>
    <div className="muse-running-body" ref={box}>
      <div className="muse-running-scroll">
        <div className="muse-running-weekhead" aria-hidden="true"><span /><span />{week.map((d) => <span key={d} data-today={d === today || undefined}>{short(d)}<small>{Number(d.slice(8))}</small></span>)}<span /></div>
        {showActive && <RunningGroup id="active" title="Active" tasks={active} week={week} done={done} today={today} priorityIds={priorityIds} showWorkspace={!workspaceId} onOpen={onOpen} onAnnounce={onAnnounce}
          empty={search || filters.groupId || filters.tagIds.length || filters.priorityOnly ? "Nothing matches your search and filters." : "Nothing open. Add a task below — it doesn’t need a date."} />}
        {showCompleted && <RunningGroup id="completed" title="Completed this week" tasks={completed} week={week} done={done} today={today} priorityIds={priorityIds} showWorkspace={!workspaceId} onOpen={onOpen} onAnnounce={onAnnounce} empty="Nothing completed this week yet." />}
      </div>
      <RunningQuickAdd workspaceId={workspaceId} onAnnounce={onAnnounce} />
    </div>
  </section>;
}

function RunningGroup({ id, title, tasks, empty, ...row }: { id: string; title: string; tasks: PlannedTask[]; empty: string } & Omit<Parameters<typeof RunningRow>[0], "task">) {
  return <section className="muse-running-group" data-group={id} aria-labelledby={`running-${id}`}>
    <h3 id={`running-${id}`}>{title}<span> · {tasks.length}</span></h3>
    {tasks.length ? <ul className="muse-running-rows">{tasks.map((t) => <RunningRow key={t.id} task={t} {...row} />)}</ul> : <p className="muse-planner-empty">{empty}</p>}
  </section>;
}

function RunningRow({ task, week, done, today, priorityIds, showWorkspace, onOpen, onAnnounce }: { task: PlannedTask; week: string[]; done: Map<string, string>; today: string; priorityIds: ReadonlySet<string>; showWorkspace: boolean; onOpen: (task: PlannedTask, anchor: HTMLElement) => void; onAnnounce: (m: string) => void }) {
  const { state, dispatch, canEdit } = usePlanner();
  const { spark, trigger } = useMuseSpark();
  const place = useTaskPlacement(trigger);
  const facts = taskFacts({ task, today, priority: priorityIds.has(task.id), showWorkspace, state, hidePlanned: !!task.plannedDate && week.includes(task.plannedDate) });
  const toggle = () => { if (!task.complete) trigger(); dispatch({ type: "task/toggle", id: task.id, now: new Date().toISOString() }); onAnnounce(task.complete ? `${task.title} reopened.` : `${task.title} completed today.`); };
  return <li className="muse-running-row" data-complete={task.complete || undefined}>
    <label className="muse-list-check">
      <input type="checkbox" checked={task.complete} disabled={!canEdit} aria-label={`Complete task: ${task.title}`} onChange={toggle} />
      <span aria-hidden="true">{task.complete && <MuseIcon name="check" size={11} />}{spark}</span>
    </label>
    <div className="muse-list-main">
      <button type="button" className="muse-list-title" onClick={(e) => onOpen(task, e.currentTarget)}>{task.title}</button>
      {facts.length > 0 && <p className="muse-list-facts">{facts}</p>}
    </div>
    <div className="muse-running-strip" role="group" aria-label={`This week for ${task.title}`}>
      {weekStrip(task, week, done.get(task.id), today).map((c) => c.actionable
        ? <button key={c.date} type="button" className="muse-strip-cell" data-today data-completed={c.completed || undefined} data-planned={c.planned || undefined} disabled={!canEdit} aria-label={c.label} title={c.label} onClick={toggle}><Mark c={c} /></button>
        : <span key={c.date} className="muse-strip-cell" data-today={c.today || undefined} data-completed={c.completed || undefined} data-planned={c.planned || undefined} role="img" aria-label={c.label} title={c.label}><Mark c={c} /></span>)}
    </div>
    <ScheduleMenu task={task} today={today} boardDays={week.filter((d) => d >= today)} place={place} onPlaced={onAnnounce} />
  </li>;
}
const Mark = ({ c }: { c: { completed: boolean; planned: boolean } }) => c.completed ? <MuseIcon name="check" size={13} /> : c.planned ? <i className="muse-strip-planned" /> : <i className="muse-strip-dot" />;

/** Quick add never sets a date. With All workspaces selected, it asks where the task goes instead of guessing. */
function RunningQuickAdd({ workspaceId, onAnnounce }: { workspaceId: string; onAnnounce: (m: string) => void }) {
  const { state, dispatch, canEdit } = usePlanner();
  const [title, setTitle] = useState(""), [target, setTarget] = useState("");
  const destination = workspaceId || target || (state.workspaces.length === 1 ? state.workspaces[0].id : "");
  function submit(e: FormEvent) {
    e.preventDefault(); if (!title.trim() || !canEdit || !destination) return;
    dispatch({ type: "task/add", task: createTask(title, destination, crypto.randomUUID(), new Date().toISOString(), undefined) });
    onAnnounce(`${title.trim()} added to ${state.workspaces.find((w) => w.id === destination)?.name ?? "your list"}, with no date.`); setTitle("");
  }
  return <form className="muse-task-quick-add muse-running-add" onSubmit={submit}>
    {!workspaceId && state.workspaces.length > 1 && <MuseChoiceMenu label="Add to workspace" valueLabel={state.workspaces.find((w) => w.id === target)?.name ?? "Choose workspace"} options={state.workspaces.map((w) => ({ id: w.id, label: w.name, accent: w.accent }))} selectedIds={target ? [target] : []} onSelect={setTarget} />}
    <input type="text" aria-label="New task, no date" maxLength={160} placeholder={destination ? "Add a task… (no date needed)" : "Choose a workspace first"} disabled={!canEdit || !state.workspaces.length} value={title} onChange={(e) => setTitle(e.target.value)} />
    <button className="muse-edge" type="submit" disabled={!title.trim() || !canEdit || !destination} aria-label="Add task"><MuseIcon name="plus" size={16} /></button>
  </form>;
}
