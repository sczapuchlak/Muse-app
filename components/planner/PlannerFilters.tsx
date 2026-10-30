"use client";
import { useId, useRef, useState } from "react";
import type { PlannerFilters as Filters } from "@/lib/planner";
import { emptyPlannerFilters } from "@/lib/planner";
import { GlassPopover } from "../GlassPopover";
import { MuseIcon } from "../MuseIcon";
import { usePlanner } from "../PlannerStore";

export function PlannerFilters({ value, onChange, workspaceId }: { value: Filters; onChange: (value: Filters) => void; workspaceId: string }) {
  const { state } = usePlanner();
  const id=useId();
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const count = Number(!!value.groupId) + value.tagIds.length + Number(value.status !== "all");
  return <>
    <button ref={anchor} className="muse-button" type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((current) => !current)}><MuseIcon name="filter" size={16} />Filters{count ? ` · ${count}` : ""}</button>
    <GlassPopover id={id} label="Planner filters" open={open} anchorRef={anchor} onClose={() => setOpen(false)} width={350}>
      <fieldset className="muse-filter-section"><legend>Group / collection</legend><div className="muse-filter-options"><button className="choice-button" type="button" aria-pressed={!value.groupId} onClick={() => onChange({ ...value, groupId: "" })}>All groups</button>{state.groups.filter((group) => !workspaceId || group.workspaceId === workspaceId).map((group) => <button key={group.id} className="choice-button" type="button" aria-pressed={group.id === value.groupId} onClick={() => onChange({ ...value, groupId: group.id })}>{group.name}</button>)}</div></fieldset>
      <fieldset className="muse-filter-section"><legend>Tags · match all selected</legend><div className="muse-filter-options">{state.tags.map((tag) => <button key={tag.id} className="choice-button" type="button" data-accent={tag.accent} aria-pressed={value.tagIds.includes(tag.id)} onClick={() => onChange({ ...value, tagIds: value.tagIds.includes(tag.id) ? value.tagIds.filter((id) => id !== tag.id) : [...value.tagIds, tag.id] })}>#{tag.name}</button>)}</div></fieldset>
      <fieldset className="muse-filter-section"><legend>Status</legend><div className="muse-filter-options">{(["all", "open", "complete"] as const).map((status) => <button key={status} className="choice-button" type="button" aria-pressed={value.status === status} onClick={() => onChange({ ...value, status })}>{status === "all" ? "All tasks" : status === "open" ? "Open" : "Completed"}</button>)}</div></fieldset>
      <div className="popover-footer"><button className="text-button" type="button" onClick={() => onChange(emptyPlannerFilters)}>Clear filters</button><button className="text-button" type="button" onClick={() => { setOpen(false); anchor.current?.focus(); }}>Done</button></div>
    </GlassPopover>
  </>;
}
