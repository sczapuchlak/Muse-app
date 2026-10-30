"use client";
import { useState } from "react";
import type { RitualDefinition } from "@/lib/rituals";
import { dateLabel } from "@/lib/dates";
import { MuseDrawer } from "../MuseDrawer";

export function RitualEntryEditor({ ritual, date, current, returnFocus, onApply, onClose }: { ritual: RitualDefinition; date: string; current: number | null; returnFocus: HTMLElement; onApply: (value: number | null) => void; onClose: () => void }) {
  const [amount, setAmount] = useState(current === null ? "" : String(current));
  const checkbox = ritual.type === "checkbox";
  function apply(value: number | null) { onApply(value); onClose(); }
  return <MuseDrawer title={ritual.name} onClose={onClose} returnFocus={returnFocus}>
    <form className="muse-ritual-form" onSubmit={(event) => { event.preventDefault(); if (amount === "" || !Number.isFinite(Number(amount)) || Number(amount) < 0 || (ritual.type === "weekly-target" && !Number.isInteger(Number(amount)))) return; apply(Number(amount)); }}>
      <p className="small-label">{dateLabel(date)}</p>
      {!checkbox && <label className="editor-label">{ritual.type === "duration" ? "Minutes" : ritual.type === "weekly-target" ? "Sessions on this day" : `Quantity (${ritual.unit})`}<input data-drawer-autofocus type="number" required min={0} step={ritual.type === "weekly-target" ? 1 : "any"} value={amount} placeholder={String(ritual.goal)} onChange={(event) => setAmount(event.target.value)} /></label>}
      <p className="small-label">{checkbox ? "Choose what happened. Leaving this unlogged keeps it unknown." : `${ritual.goal} ${ritual.unit} ${ritual.type === "weekly-target" ? "for the week" : "goal"}. Values below the goal stay partial. Saving zero explicitly records not done.`}</p>
      <div className="editor-actions">{checkbox ? <button data-drawer-autofocus className="muse-button button-primary" type="button" onClick={() => apply(1)}>Complete</button> : <button className="muse-button button-primary" type="submit">Save progress</button>}
        <button className="muse-button" type="button" onClick={() => apply(0)}>{ritual.type === "weekly-target" ? "No session on this day" : "Mark missed"}</button>
        {current !== null && <button className="text-button" type="button" onClick={() => apply(null)}>Clear log</button>}
        <button className="text-button" type="button" onClick={onClose}>Cancel</button>
      </div>
      {ritual.type === "weekly-target" && <p className="small-label">The success condition belongs to the week. A day without a session does not fail the weekly goal.</p>}
    </form>
  </MuseDrawer>;
}
