"use client";
import { useId, useRef, useState } from "react";
import { GlassPopover } from "../GlassPopover";
import "./PeriodTitle.css";

/**
 * The Planner toolbar's date title (Tasks and Agenda share it): reads as the period ("Nov 6 – Nov 8, 2026") and
 * opens a day picker, so jumping to any date stays one click away in both views. `compactTitle` is the shorter
 * reading shown in the narrow two-row toolbar (#101).
 */
export function PeriodTitle({ title, compactTitle, date, onChange }: { title: string; compactTitle?: string; date: string; onChange: (date: string) => void }) {
  const [open, setOpen] = useState(false), anchor = useRef<HTMLButtonElement>(null), id = useId();
  return <h2 className="muse-agenda-title">
    <button ref={anchor} type="button" className="muse-period-title" aria-haspopup="dialog" aria-expanded={open} aria-controls={id} aria-label={`${title}. Choose a day`} onClick={() => setOpen((v) => !v)}>{compactTitle ? <><span className="muse-period-title-full">{title}</span><span className="muse-period-title-compact" aria-hidden="true">{compactTitle}</span></> : title}</button>
    <GlassPopover id={id} label="Choose a day" open={open} anchorRef={anchor} onClose={() => setOpen(false)} width={280}>
      <input className="date-input" type="date" aria-label="Day" value={date} onChange={(e) => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) { onChange(e.target.value); setOpen(false); anchor.current?.focus(); } }} />
    </GlassPopover>
  </h2>;
}
