"use client";
import type { ReactNode } from "react";
import { useMuseSpark } from "../MuseSpark";
import { useMuseDropTarget } from "../useMuseDropTarget";
import { useTaskPlacement } from "./useTaskPlacement";
import { TASK_DRAG_TYPE } from "./PlannerTaskCard";

export function PlanningDropZone({ date, children, className, selected }: { date?: string; children: ReactNode; className: string; selected?: boolean }) {
  const {trigger,spark}=useMuseSpark();
  const place=useTaskPlacement(trigger);
  const {active,dropProps}=useMuseDropTarget(TASK_DRAG_TYPE,(id)=>place(id,date));
  return <div className={`${className} muse-drop-zone`} data-drop-active={active} data-selected={selected} {...dropProps}>{children}<span className="muse-drop-feedback">{spark}</span></div>;
}
