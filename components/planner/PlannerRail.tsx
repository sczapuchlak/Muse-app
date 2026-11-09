"use client";
import { useEffect, useId, useState } from "react";
import type { PlannedTask } from "@/lib/models";
import type { PlannerFilters as Filters } from "@/lib/planner";
import { parseTaskListScope, taskListCount, taskListGroups, taskListScopes, type TaskListScope } from "@/lib/task-list";
import { MuseIcon } from "../MuseIcon";
import { PlannerWorkspaceMenu } from "./PlannerWorkspaceMenu";
import { PlannerFilters } from "./PlannerFilters";
import { PlanningDropZone } from "./PlanningDropZone";
import { TaskListRow } from "./TaskListRow";
import { TaskQuickAdd } from "./TaskQuickAdd";

const scopeKey = "muse.planner.taskList";

/**
 * The Scheduled Board's Task List (#79 §12): a pinned source beside the dated days. It has its own header, search,
 * filters and grouping, dense rows with a Schedule action, and capture anchored at the bottom. Drop a task here to
 * unschedule it. It never copies tasks: rows are the same records the days, Agenda and Dayview show.
 */
export function PlannerRail({ workspaceId, onWorkspaceChange, tasks, onOpen, groupId, tagIds, today, boardDays, priorityIds, search, onSearch, filters, onFilter, onAnnounce }: {
  workspaceId: string; groupId?: string; tagIds?: string[]; onWorkspaceChange: (id: string) => void; tasks: PlannedTask[]; onOpen: (task: PlannedTask, anchor: HTMLElement) => void;
  today: string; boardDays: string[]; priorityIds: ReadonlySet<string>; search: string; onSearch: (value: string) => void; filters: Filters; onFilter: (value: Filters) => void; onAnnounce: (message: string) => void;
}) {
  const [scope, setScope] = useState<TaskListScope>("plan"), uid = useId();
  useEffect(() => { const t = window.setTimeout(() => { try { setScope(parseTaskListScope(window.localStorage.getItem(scopeKey))); } catch { /* default */ } }, 0); return () => window.clearTimeout(t); }, []);
  const choose = (next: TaskListScope) => { setScope(next); try { window.localStorage.setItem(scopeKey, next); } catch { /* this device only */ } };
  const groups = taskListGroups(tasks, scope, today), count = taskListCount(groups);
  const empty = search || filters.groupId || filters.tagIds.length || filters.priorityOnly || filters.status !== "all" || filters.timeboxedOnly
    ? "Nothing matches your search and filters." : scope === "plan" ? "Nothing waiting to be planned. Add a task when it comes to you." : "Nothing here right now.";
  return <aside className="muse-planning-rail muse-task-list" aria-labelledby={`${uid}-title`}>
    <header className="muse-task-list-head">
      <div className="muse-task-list-title"><h2 id={`${uid}-title`}>Task List</h2><span className="muse-task-list-count" aria-label={`${count} shown`}>{count}<span className="muse-task-list-count-word" aria-hidden="true"> shown</span></span></div>
      <PlannerWorkspaceMenu workspaceId={workspaceId} onChange={onWorkspaceChange} />
      <div className="muse-task-list-tools">
        <label className="muse-planner-search"><MuseIcon name="search" size={15} /><input aria-label="Search tasks (list and days)" type="search" value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search…" /></label>
        <PlannerFilters value={filters} onChange={onFilter} workspaceId={workspaceId} />
      </div>
      <div className="muse-task-list-scopes muse-chip-row" role="group" aria-label="Show in the Task List">
        {taskListScopes.map((s) => <button key={s.id} type="button" aria-pressed={scope === s.id} title={s.hint} onClick={() => choose(s.id)}>{s.label}</button>)}
      </div>
    </header>
    <PlanningDropZone className="muse-inbox-drop muse-task-list-body">
      <p className="muse-drop-hint" aria-hidden="true">Drop here to unschedule</p>
      {groups.map((g) => <section key={g.id} className="muse-task-list-group" data-group={g.id} aria-labelledby={`${uid}-${g.id}`}>
        {(groups.length > 1 || g.id !== "unscheduled") && <h3 id={`${uid}-${g.id}`}>{g.label}<span> · {g.tasks.length}</span></h3>}
        <ul className="muse-task-list-rows" aria-label={g.label}>{g.tasks.map((t) => <TaskListRow key={t.id} task={t} today={today} boardDays={boardDays} priority={priorityIds.has(t.id)} showWorkspace={!workspaceId} onOpen={onOpen} onPlaced={onAnnounce} />)}</ul>
      </section>)}
      {!count && <p className="muse-planner-empty">{empty}</p>}
    </PlanningDropZone>
    <TaskQuickAdd workspaceId={workspaceId || undefined} groupId={groupId} tagIds={tagIds} />
  </aside>;
}
