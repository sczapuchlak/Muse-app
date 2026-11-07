"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import type { PlannedTask } from "@/lib/models";
import type { PlannerFilters as Filters } from "@/lib/planner";
import { createTask } from "@/lib/planner";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { readRunningOrder, saveRunningOrder } from "@/lib/planner-week";
import { applyRunningOrder, completionDays, markSpan, moveInOrder, parseRunningSort, parseScheduleScope, runningSections, runningSorts, scheduleScopes, stepInOrder, weekStrip, weekSummary, type RunningSort, type ScheduleScope, type StripCell } from "@/lib/running-list";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { MuseIcon } from "../MuseIcon";
import { MuseOverflowMenu } from "../MuseOverflowMenu";
import { useMuseSpark } from "../MuseSpark";
import { usePlanner } from "../PlannerStore";
import { PlannerFilters } from "./PlannerFilters";
import { PlannerWorkspaceMenu } from "./PlannerWorkspaceMenu";
import { ScheduleMenu } from "./ScheduleMenu";
import { taskFacts } from "./TaskListRow";
import { useTaskPlacement } from "./useTaskPlacement";

const prefKey = "muse.planner.runningList", DRAG = "application/x-muse-running";
const letter = (d: string) => new Intl.DateTimeFormat("en-US", { weekday: "narrow", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const longDay = (d: string) => new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

/**
 * Planner → Tasks → Running List (#81): a bullet-journal running list. Seven narrow weekday columns on the left, a
 * thin line from the marks to each task, the task on the right. × is the day it was actually completed (from the
 * shared completion history, so completing anywhere in Muse places it); ○ is its planned day. Only today's cell
 * acts. The list has its own manual order, kept apart from the board's day order, so moving a row changes no date.
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

  // The saved manual order (ids only). Optimistic; a failed save restores the last saved order.
  const client = useMemo(() => createMuseBrowserClient(), []);
  const [order, setOrder] = useState<string[]>([]), [orderStatus, setOrderStatus] = useState("");
  const saved = useRef({ ids: [] as string[], revision: 0, user: "" }), queue = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => { let live = true; void (async () => { try { const { data } = await client.auth.getUser(); if (!data.user || !live) return; const o = await readRunningOrder(client, data.user.id); if (!live) return; saved.current = { ...o, user: data.user.id }; setOrder(o.ids); } catch { if (live) setOrderStatus("Your list order couldn’t load; showing the default order."); } })(); return () => { live = false; }; }, [client]);
  const reorder = (next: string[], message: string) => {
    setOrder(next); onAnnounce(message);
    queue.current = queue.current.then(async () => { try { saved.current.revision = await saveRunningOrder(client, saved.current.user, next, saved.current.revision); saved.current.ids = next; setOrderStatus(""); } catch (e) { setOrder(saved.current.ids); setOrderStatus(e instanceof Error ? e.message : "Your list order didn’t save."); } });
  };

  const done = useMemo(() => completionDays(state.tasks, state.completionHistory, timeZone), [state.tasks, state.completionHistory, timeZone]);
  const ordered = useMemo(() => sort === "manual" ? applyRunningOrder(tasks, order) : tasks, [tasks, order, sort]);
  const { week, active, completed } = runningSections(ordered, done, weekOf, { scope, sort });
  const summary = weekSummary(new Map([...done].filter(([id]) => tasks.some((t) => t.id === id))), week, today);
  const showCompleted = filters.status !== "open", showActive = filters.status !== "complete";
  const fullOrder = applyRunningOrder(state.tasks, order).map((t) => t.id), activeIds = active.map((t) => t.id);
  const move = (id: string, beforeId: string | undefined) => { const title = state.tasks.find((t) => t.id === id)?.title ?? "Task"; reorder(moveInOrder(fullOrder, id, beforeId), `${title} moved.`); };
  const step = (id: string, d: -1 | 1) => { const i = activeIds.indexOf(id); if (i + d < 0 || i + d >= activeIds.length) return; reorder(stepInOrder(activeIds, fullOrder, id, d), `${state.tasks.find((t) => t.id === id)?.title ?? "Task"} moved ${d < 0 ? "up" : "down"} to position ${i + d + 1} of ${activeIds.length}.`); };
  const addRef = useRef<HTMLInputElement>(null);
  const todayIndex = week.indexOf(today);

  return <section className="muse-running-list muse-planner-surface" aria-labelledby="running-list-title" style={{ "--today-col": todayIndex >= 0 ? todayIndex + 2 : 0 } as CSSProperties}>
    <header className="muse-running-head">
      <div className="muse-running-titlebar"><h2 id="running-list-title">Running List</h2>
        <p className="muse-running-summary" aria-live="polite">{summary.week} completed this week{todayIndex >= 0 ? ` · ${summary.today} today` : ""}</p></div>
      <div className="muse-running-tools">
        <label className="muse-planner-search muse-running-search"><MuseIcon name="search" size={16} /><input aria-label="Search tasks" type="search" value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search tasks…" /></label>
        <button type="button" className="muse-button" onClick={() => addRef.current?.focus()}><MuseIcon name="plus" size={14} /> Add task</button>
        <PlannerWorkspaceMenu workspaceId={workspaceId} onChange={onWorkspaceChange} />
        <div className="muse-running-filters">
          <PlannerFilters value={filters} onChange={onFilter} workspaceId={workspaceId} />
          <MuseChoiceMenu label="Show" valueLabel={scope === "both" ? "All tasks" : scheduleScopes.find((s) => s.id === scope)!.label} options={scheduleScopes.map((s) => ({ id: s.id, label: s.id === "both" ? "All tasks" : s.label }))} selectedIds={[scope]} onSelect={(id) => save({ scope: id as ScheduleScope, sort })} />
          <MuseChoiceMenu label="Order" valueLabel={runningSorts.find((s) => s.id === sort)!.label} options={runningSorts.map((s) => ({ id: s.id, label: s.label }))} selectedIds={[sort]} onSelect={(id) => save({ scope, sort: id as RunningSort })} />
        </div>
      </div>
    </header>
    {orderStatus && <p className="small-label muse-running-status" role="status">{orderStatus}</p>}
    <div className="muse-running-page" aria-label={`Running list, week of ${longDay(week[0])}`}>
      <div className="muse-running-colhead" aria-hidden="true"><span />{week.map((d) => <span key={d} data-today={d === today || undefined}><b>{letter(d)}</b><small>{Number(d.slice(8))}</small></span>)}<span className="muse-running-todo">To do</span></div>
      {showActive && <>
        <h3 className="muse-running-section" data-section="active"><span>Active</span><b>{active.length}</b></h3>
        {active.map((t) => <RunningRow key={t.id} task={t} week={week} done={done} today={today} priority={priorityIds.has(t.id)} showWorkspace={!workspaceId} onOpen={onOpen} onAnnounce={onAnnounce}
          reorder={sort === "manual" ? { onDrop: move, onStep: step, first: t.id === activeIds[0], last: t.id === activeIds[activeIds.length - 1] } : undefined} />)}
        {!active.length && (search || filters.groupId || filters.tagIds.length || filters.priorityOnly
          ? <p className="muse-running-empty">Nothing matches your search and filters.</p>
          : <div className="muse-running-clear" role="status"><span className="muse-running-clear-star" aria-hidden="true"><MuseIcon name="sparkle" size={22} /></span>
              <div><p className="muse-running-clear-title">All clear{completed.length ? ` · ${completed.length} done this week` : ""}</p><p className="muse-running-clear-sub">Nothing open right now. Jot the next thing below; it doesn’t need a date.</p></div></div>)}
        <RunningQuickAdd inputRef={addRef} workspaceId={workspaceId} onAnnounce={onAnnounce} onDropEnd={sort === "manual" ? (id) => move(id, undefined) : undefined} />
      </>}
      {showCompleted && <>
        <h3 className="muse-running-section" data-section="completed"><span>Completed this week</span><b>{completed.length}</b></h3>
        {completed.map((t) => <RunningRow key={t.id} task={t} week={week} done={done} today={today} priority={priorityIds.has(t.id)} showWorkspace={!workspaceId} onOpen={onOpen} onAnnounce={onAnnounce} />)}
        {!completed.length && <p className="muse-running-empty">Nothing completed this week yet.</p>}
      </>}
    </div>
  </section>;
}

function stripSummary(cells: StripCell[]) {
  const parts = cells.flatMap((c) => [c.completed ? `completed ${longDay(c.date)}` : "", c.planned ? `planned ${longDay(c.date)}` : ""]).filter(Boolean);
  return parts.length ? parts.join("; ") : "nothing marked this week";
}

function RunningRow({ task, week, done, today, priority, showWorkspace, onOpen, onAnnounce, reorder }: {
  task: PlannedTask; week: string[]; done: Map<string, string>; today: string; priority: boolean; showWorkspace: boolean;
  onOpen: (task: PlannedTask, anchor: HTMLElement) => void; onAnnounce: (m: string) => void;
  reorder?: { onDrop: (id: string, beforeId: string) => void; onStep: (id: string, d: -1 | 1) => void; first: boolean; last: boolean };
}) {
  const { state, dispatch, canEdit } = usePlanner();
  const { spark, trigger } = useMuseSpark();
  const place = useTaskPlacement(trigger);
  const [over, setOver] = useState(false), [dragging, setDragging] = useState(false), grab = useRef(false), titleRef = useRef<HTMLButtonElement>(null);
  const cells = weekStrip(task, week, done.get(task.id), today), span = markSpan(cells);
  const facts = taskFacts({ task, today, priority, showWorkspace, state, hidePlanned: !!task.plannedDate && week.includes(task.plannedDate) });
  // One task/toggle on the canonical record: the board, Agenda and Dayview update from the same change.
  const toggle = () => { if (!task.complete) trigger(); dispatch({ type: "task/toggle", id: task.id, now: new Date().toISOString() }); onAnnounce(task.complete ? `${task.title} reopened.` : `${task.title} completed today.`); };
  // A blank day marks it done that day (today is an ordinary completion); its × reopens it.
  const cellAction = (c: StripCell) => {
    if (c.action === "reopen" || (c.action === "complete" && c.today && !task.complete)) { toggle(); return; }
    trigger(); dispatch({ type: "task/completeOn", id: task.id, date: c.date, now: new Date().toISOString() }); onAnnounce(`${task.title} marked done on ${longDay(c.date)}.`);
  };
  const lineStyle = { gridColumn: span ? `${span.first + 2} / 9` : "2 / 9" } as CSSProperties;
  return <div className="muse-running-row" data-complete={task.complete || undefined} data-unmarked={!span || undefined} data-over={over || undefined} data-dragging={dragging || undefined}
    draggable={!!reorder && canEdit}
    onPointerDownCapture={(e) => { grab.current = !!(e.target as Element).closest(".muse-running-handle"); }}
    onDragStart={(e) => { if (!reorder || !grab.current) { e.preventDefault(); return; } setDragging(true); e.dataTransfer.setData(DRAG, task.id); e.dataTransfer.effectAllowed = "move"; }}
    onDragEnd={() => { setDragging(false); grab.current = false; }}
    onDragOver={(e) => { if (reorder && e.dataTransfer.types.includes(DRAG)) { e.preventDefault(); setOver(true); } }}
    onDragLeave={(e) => { if (!(e.relatedTarget instanceof Node) || !e.currentTarget.contains(e.relatedTarget)) setOver(false); }}
    onDrop={(e) => { setOver(false); if (!reorder || !e.dataTransfer.types.includes(DRAG)) return; e.preventDefault(); const id = e.dataTransfer.getData(DRAG); if (id && id !== task.id) reorder.onDrop(id, task.id); }}>
    {reorder ? <button type="button" className="muse-running-handle" aria-label={`Reorder ${task.title}. Use the up and down arrow keys`} title="Drag, or use ↑ ↓"
      onKeyDown={(e) => { if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); reorder.onStep(task.id, e.key === "ArrowUp" ? -1 : 1); requestAnimationFrame(() => (e.target as HTMLElement).focus()); } }}><MuseIcon name="grip" size={12} /></button> : <span />}
    <span className="muse-running-line" style={lineStyle} aria-hidden="true" />
    {cells.map((c, i) => c.actionable
      ? <button key={c.date} type="button" className="muse-running-cell" style={{ gridColumn: i + 2 }} data-today={c.today || undefined} data-completed={c.completed || undefined} data-planned={c.planned || undefined} disabled={!canEdit} aria-label={`${c.label} — ${task.title}`} title={c.label} onClick={() => cellAction(c)}><Mark c={c} />{c.today && spark}</button>
      : <span key={c.date} className="muse-running-cell" style={{ gridColumn: i + 2 }} data-today={c.today || undefined} data-completed={c.completed || undefined} data-planned={c.planned || undefined} aria-hidden="true"><Mark c={c} /></span>)}
    <div className="muse-running-task">
      <label className="muse-task-completion muse-running-done"><input className="check-input" type="checkbox" checked={task.complete} disabled={!canEdit} aria-label={`Complete task: ${task.title}`} onChange={toggle} /><span className="priority-check" aria-hidden="true">{task.complete && <MuseIcon name="check" size={13} />}</span></label>
      <button ref={titleRef} type="button" className="muse-running-title" onClick={(e) => onOpen(task, e.currentTarget)}><span className="sr-only">{task.complete ? "Completed: " : ""}</span>{task.title}<span className="sr-only">. This week: {stripSummary(cells)}.</span></button>
      {facts.length > 0 && <div className="muse-running-facts">{facts}</div>}
    </div>
    <div className="muse-running-actions">
      <ScheduleMenu task={task} today={today} boardDays={week.filter((d) => d >= today)} place={place} onPlaced={onAnnounce} />
      <MuseOverflowMenu label={task.title} actions={[
        { id: "details", label: "Details, timer & tags", onSelect: () => { if (titleRef.current) onOpen(task, titleRef.current); } },
        ...(reorder && !reorder.first ? [{ id: "up", label: "Move up", onSelect: () => reorder.onStep(task.id, -1) }] : []),
        ...(reorder && !reorder.last ? [{ id: "down", label: "Move down", onSelect: () => reorder.onStep(task.id, 1) }] : []),
      ]} />
    </div>
  </div>;
}
/** × = completed that day (wins when it is also the planned day, drawn inside the planned ring); ○ = planned. */
const Mark = ({ c }: { c: StripCell }) => c.completed ? <i className="muse-mark-x" data-planned={c.planned || undefined}><MuseIcon name="close" size={13} /></i> : c.planned ? <i className="muse-mark-o" /> : c.actionable ? <i className="muse-mark-hint" /> : null;

/** Quick add never sets a date. With All workspaces selected, it asks where the task goes instead of guessing. */
function RunningQuickAdd({ workspaceId, onAnnounce, inputRef, onDropEnd }: { workspaceId: string; onAnnounce: (m: string) => void; inputRef: React.RefObject<HTMLInputElement | null>; onDropEnd?: (id: string) => void }) {
  const { state, dispatch, canEdit } = usePlanner();
  const [title, setTitle] = useState(""), [target, setTarget] = useState("");
  const destination = workspaceId || target || (state.workspaces.length === 1 ? state.workspaces[0].id : "");
  function submit(e: FormEvent) {
    e.preventDefault(); if (!title.trim() || !canEdit || !destination) return;
    dispatch({ type: "task/add", task: createTask(title, destination, crypto.randomUUID(), new Date().toISOString(), undefined) });
    onAnnounce(`${title.trim()} added to ${state.workspaces.find((w) => w.id === destination)?.name ?? "your list"}, with no date.`); setTitle("");
  }
  return <form className="muse-running-row muse-running-add" onSubmit={submit}
    onDragOver={(e) => { if (onDropEnd && e.dataTransfer.types.includes(DRAG)) e.preventDefault(); }} onDrop={(e) => { if (!onDropEnd) return; const id = e.dataTransfer.getData(DRAG); if (id) { e.preventDefault(); onDropEnd(id); } }}>
    <span /><span className="muse-running-line" style={{ gridColumn: "2 / 9" }} aria-hidden="true" />
    <div className="muse-running-task muse-running-addfield">
      {!workspaceId && state.workspaces.length > 1 && <MuseChoiceMenu label="Add to workspace" valueLabel={state.workspaces.find((w) => w.id === target)?.name ?? "Workspace"} options={state.workspaces.map((w) => ({ id: w.id, label: w.name, accent: w.accent }))} selectedIds={target ? [target] : []} onSelect={setTarget} />}
      <input ref={inputRef} type="text" aria-label="New task, no date" maxLength={160} placeholder={destination ? "Add a task… (no date needed)" : "Choose a workspace, then add a task…"} disabled={!canEdit || !state.workspaces.length} value={title} onChange={(e) => setTitle(e.target.value)} />
    </div>
    <div className="muse-running-actions" data-visible>
      <button type="submit" className="muse-running-addsubmit" disabled={!title.trim() || !canEdit || !destination} aria-label="Add task"><MuseIcon name="plus" size={14} /></button>
    </div>
  </form>;
}
