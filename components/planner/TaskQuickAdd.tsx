"use client";
import { useState, type FormEvent } from "react";
import { createTask } from "@/lib/planner";
import { usePlanner } from "../PlannerStore";
import { MuseIcon } from "../MuseIcon";

export function TaskQuickAdd({ date, workspaceId, groupId, tagIds = [] }: { date?: string; workspaceId?: string; groupId?: string; tagIds?: string[] }) {
  const { state, dispatch,canEdit } = usePlanner();
  const [title, setTitle] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()||!canEdit||!state.workspaces.length) return;
    dispatch({ type: "task/add", task: { ...createTask(title, workspaceId ?? state.groups.find((group) => group.id === groupId)?.workspaceId ?? state.workspaces[0]?.id??"", crypto.randomUUID(), new Date().toISOString(), date), groupId, tagIds } });
    setTitle("");
  }
  return <form className="muse-task-quick-add" onSubmit={submit}>
    <input type="text" aria-label={date ? `New task for ${date}` : "New Inbox task"} maxLength={160} placeholder={state.workspaces.length?"Add a task…":"Create a workspace first"} disabled={!canEdit||!state.workspaces.length} value={title} onChange={(event) => setTitle(event.target.value)} />
    <button className="muse-edge" type="submit" disabled={!title.trim()||!canEdit||!state.workspaces.length} aria-label="Add task"><MuseIcon name="plus" size={16} /></button>
  </form>;
}
