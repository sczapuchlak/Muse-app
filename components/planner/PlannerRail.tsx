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
    <PlanningDropZone className="muse-inbox-drop"><ul className="muse-planner-task-list">{tasks.map((task) => <PlannerTaskCard key={task.id} task={task} onOpen={onOpen} />)}</ul>
      {!tasks.length && <p className="muse-planner-empty">Nothing waiting here. Add a task when it comes to you.</p>}
    </PlanningDropZone>
    <TaskQuickAdd workspaceId={workspaceId || undefined} groupId={groupId} tagIds={tagIds} />

  </aside>;
}
