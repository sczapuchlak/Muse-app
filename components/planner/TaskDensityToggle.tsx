"use client";
import { selectTaskDensity, taskDensities, useTaskDensity } from "@/lib/task-density-preference";

/** Compact / Spacious for every planner task card (#104 §8). One shared preference; nothing about a task changes. */
export function TaskDensityToggle() {
  const density = useTaskDensity();
  return <div className="muse-density-toggle" role="group" aria-label="Task card size">
    <p className="editor-label">Task cards</p>
    <div className="muse-chip-row">{taskDensities.map((d) => <button key={d} type="button" className="choice-button" data-chip-size="compact" aria-pressed={density === d} onClick={() => selectTaskDensity(d)}>{d === "compact" ? "Compact" : "Spacious"}</button>)}</div>
  </div>;
}
