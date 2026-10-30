"use client";
import { useState, type FormEvent } from "react";
import { createTask } from "@/lib/planner";
import { usePlanner } from "../PlannerStore";

export function TaskQuickAdd({ date, workspaceId, groupId, tagIds = [] }: { date?: string; workspaceId?: string; groupId?: string; tagIds?: string[] }) {
  const { state, dispatch } = usePlanner();
  const [title, setTitle] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    dispatch({ type: "task/add", task: { ...createTask(title, workspaceId ?? state.groups.find((group) => group.id === groupId)?.workspaceId ?? state.workspaces[0].id, crypto.randomUUID(), new Date().toISOString(), date), groupId, tagIds } });
    setTitle("");
  }
  return <form className="muse-task-quick-add" onSubmit={submit}>
    <input type="text" aria-label={date ? `New task for ${date}` : "New Inbox task"} maxLength={160} placeholder="Add a task…" value={title} onChange={(event) => setTitle(event.target.value)} />
    <button className="muse-edge" type="submit" disabled={!title.trim()} aria-label="Add task">+</button>
  </form>;
}
