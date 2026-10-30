"use client";
import type { PlannedTask } from "@/lib/models";
import { PlannerWorkspaceMenu } from "./PlannerWorkspaceMenu";
import { PlanningDropZone } from "./PlanningDropZone";
import { PlannerTaskCard } from "./PlannerTaskCard";
import { TaskQuickAdd } from "./TaskQuickAdd";

export function PlannerRail({ workspaceId, onWorkspaceChange, tasks, onOpen, groupId, tagIds }: { workspaceId: string; groupId?: string; tagIds?: string[]; onWorkspaceChange: (id: string) => void; tasks: PlannedTask[]; onOpen: (task: PlannedTask, anchor: HTMLElement) => void }) {
  return <aside className="muse-planning-rail" aria-label="Task List">
    <p className="muse-section-eyebrow">Task List</p>
    <PlannerWorkspaceMenu workspaceId={workspaceId} onChange={onWorkspaceChange}/>
    <div className="muse-planning-pool-heading"><h2>Unscheduled</h2><span className="small-label">{tasks.length} tasks</span></div>
    <p className="small-label">Ideas waiting for their day.</p>
    <TaskQuickAdd workspaceId={workspaceId || undefined} groupId={groupId} tagIds={tagIds} />
    <PlanningDropZone className="muse-inbox-drop"><ul className="muse-planner-task-list">{tasks.map((task) => <PlannerTaskCard key={task.id} task={task} onOpen={onOpen} />)}</ul>
      {!tasks.length && <p className="muse-planner-empty">Nothing waiting here. Add a task when it comes to you.</p>}
    </PlanningDropZone>
    <p className="muse-planning-rail-hint small-label">Drag a task into a day, or choose Move. Returning here simply makes room.</p>
  </aside>;
}
