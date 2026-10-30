"use client";

import { useRef, useState } from "react";
import { dateLabel, shiftDate } from "@/lib/dates";
import { MuseIcon } from "./MuseIcon";
import { GlassPopover } from "./GlassPopover";

export function DateNavigator({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="date-navigation" aria-label="Date navigation">
      <button type="button" className="date-step muse-edge" aria-label="Previous day" onClick={() => onChange(shiftDate(date, -1))}><span className="chevron-left"><MuseIcon name="chevron" size={16} /></span></button>
      <button ref={triggerRef} type="button" className="date-current muse-edge" aria-expanded={open} aria-controls="date-picker" onClick={() => setOpen((value) => !value)}>
        <time dateTime={date}>{dateLabel(date)}</time>
      </button>
      <button type="button" className="date-step muse-edge" aria-label="Next day" onClick={() => onChange(shiftDate(date, 1))}><span className="chevron-right"><MuseIcon name="chevron" size={16} /></span></button>
      <GlassPopover id="date-picker" label="Choose a day" open={open} anchorRef={triggerRef} onClose={() => setOpen(false)} width={280} align="end">
        <label className="editor-label" htmlFor="selected-date">Choose a day</label>
        <input id="selected-date" className="date-input" type="date" value={date} onChange={(event) => {
          if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) { onChange(event.target.value); setOpen(false); triggerRef.current?.focus(); }
        }} />
      </GlassPopover>
    </div>
  );
}
