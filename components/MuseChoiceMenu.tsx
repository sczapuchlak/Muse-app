"use client";
import { useId, useRef, useState } from "react";
import { GlassPopover } from "./GlassPopover";
import { ColorLabel } from "./ColorLabel";
import type { AccentColor } from "@/lib/appearance-values";
import { MuseIcon, type MuseIconName } from "./MuseIcon";
import "./MuseChoiceMenu.css";

export type MuseChoice = { id: string; label: string; accent?: AccentColor };
export function MuseChoiceMenu({ label, valueLabel, options, selectedIds, multiple = false, onSelect, onClear, searchable, emptyLabel="No matching options.", variant="default", icon="sort" }: {icon?: MuseIconName; label: string; valueLabel: string; options: MuseChoice[]; selectedIds: string[]; multiple?: boolean; onSelect: (id: string) => void; onClear?: () => void;searchable?:boolean;emptyLabel?:string; variant?:"default"|"chip"|"icon" }) {
  const id = useId();
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = options.filter((option) => option.label.toLowerCase().includes(search.toLowerCase()));
  function close() { setOpen(false); anchor.current?.focus(); }
  return <div className="muse-choice-menu" data-variant={variant}>
    <button ref={anchor} className="muse-choice-trigger muse-button" data-accent={options.find((option)=>selectedIds.includes(option.id))?.accent} type="button" aria-label={`${label}: ${valueLabel}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => { setSearch(""); setOpen((value) => !value); }} onKeyDown={(event) => { if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); setOpen(true); } }}>{variant==="icon"?<MuseIcon name={icon} size={18}/>:<span className="muse-choice-value"><ColorLabel color={options.find((option)=>selectedIds.includes(option.id))?.accent}>{valueLabel}</ColorLabel></span>}{variant!=="icon"&&<MuseIcon name="chevron" size={14} />}</button>
    <GlassPopover id={id} label={label} open={open} anchorRef={anchor} onClose={() => setOpen(false)} width={300} scrollMode="content" bare={!multiple}>
      {(searchable??options.length > 6) && <input type="search" aria-label={`Search ${label.toLowerCase()}`} placeholder="Find…" value={search} onChange={(event) => setSearch(event.target.value)} />}
      <div className="popover-choice-list muse-choice-options" role="group" aria-label={label} onKeyDown={(event) => {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }}>{filtered.map((option) => <button key={option.id} className="popover-choice" type="button" aria-pressed={selectedIds.includes(option.id)} data-accent={option.accent} onClick={() => { onSelect(option.id); if (!multiple) close(); }}><ColorLabel color={option.accent}>{option.label}</ColorLabel>{selectedIds.includes(option.id) && <MuseIcon name="check" size={15} />}</button>)}</div>
      {!filtered.length && <p className="small-label">{emptyLabel}</p>}
      {multiple && <div className="popover-footer">{onClear && <button className="text-button" type="button" onClick={onClear}>Clear filters</button>}<button className="text-button" type="button" onClick={close}>Done</button></div>}
    </GlassPopover>
  </div>;
}
