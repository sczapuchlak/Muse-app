"use client";

import { createTask } from "@/lib/planner";
import { usePlanner } from "./PlannerStore";
import { useState, type FormEvent } from "react";
import type { ScheduleItem } from "@/lib/daily-edit-data";

type Props = { kind: "task" | "event"; date: string; onAdd: (item: ScheduleItem) => void; onCancel: () => void };
export function PlanEntryForm({ kind, date, onAdd, onCancel }: Props) {
  const { state } = usePlanner();
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("09:00");
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    const id = crypto.randomUUID();
    if (kind === "task") onAdd(createTask(title, state.workspaces[0].id, id, new Date().toISOString(), date));
    else {
      const [hour, minute] = time.split(":");
      const displayTime = `${Number(hour) % 12 || 12}:${minute} ${Number(hour) >= 12 ? "PM" : "AM"}`;
      onAdd({ id, kind, title: title.trim(), date, dateTime: `${date}T${time}`, time: displayTime });
    }
  }
  return <form className="plan-entry-form" onSubmit={submit}>
    <label className="editor-label" htmlFor="plan-entry-title">{kind === "event" ? "New event" : "New task"}</label>
    <input id="plan-entry-title" type="text" required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kind === "event" ? "Event title" : "Task title"} />
    {kind === "event" && <label className="plan-time-label">Time<input type="time" required value={time} onChange={(event) => setTime(event.target.value)} /></label>}
    <div className="editor-actions"><button type="submit" className="muse-button button-primary">{kind === "event" ? "Add event" : "Add task"}</button><button type="button" className="text-button" onClick={onCancel}>Cancel</button></div>
  </form>;
}
