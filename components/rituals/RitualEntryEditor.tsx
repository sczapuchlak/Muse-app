"use client";
import { useState } from "react";
import { entryFor, type RitualDefinition } from "@/lib/rituals";
import { dateLabel } from "@/lib/dates";
import {useRituals} from "./RitualStore";
import { useRitualView } from "./ConnectedRituals";
import { MuseDrawer } from "../MuseDrawer";

export function RitualEntryEditor({ ritual, date, current, returnFocus, onApply, onClose }: { ritual: RitualDefinition; date: string; current: number | null; returnFocus: HTMLElement; onApply: (value: number | null) => void; onClose: () => void }) {
  const {status,state,dispatch}=useRituals(),{today}=useRitualView();
  const [amount, setAmount] = useState(current === null ? "" : String(current));
  const checkbox = ritual.type === "checkbox";
  function apply(value: number | null) { if(!status.loaded||status.error)return;onApply(value); onClose(); }
  if (ritual.type === "category") {
    // Categorical: pick one of the legend's categories (#85). Missed and Clear keep their usual meanings.
    const chosen = entryFor(state, ritual.id, date)?.category ?? null;
    const pick = (category: string | null) => { if (!status.loaded || status.error) return; dispatch({ type: "entry/category", ritualId: ritual.id, date, category, today, now: new Date().toISOString() }); onClose(); };
    return <MuseDrawer title={ritual.name} onClose={onClose} returnFocus={returnFocus}>
      <div className="muse-ritual-form">
        <p className="small-label">{dateLabel(date)} · what was it?</p>
        <div className="muse-ritual-category-choices" role="group" aria-label="Category">{(ritual.categories ?? []).map((c, i) => <button key={c.id} type="button" className="choice-button" data-drawer-autofocus={i === 0 || undefined} aria-pressed={chosen === c.id} style={{ "--category": c.color } as React.CSSProperties} onClick={() => pick(c.id)}><i aria-hidden="true" />{c.label}</button>)}</div>
        <div className="editor-actions"><button className="muse-button" type="button" onClick={() => apply(0)}>Mark missed</button>
          {current !== null && <button className="text-button" type="button" onClick={() => pick(null)}>Clear log</button>}
          <button className="text-button" type="button" onClick={onClose}>Cancel</button></div>
      </div>
    </MuseDrawer>;
  }
  return <MuseDrawer title={ritual.name} onClose={onClose} returnFocus={returnFocus}>
    <form className="muse-ritual-form" onSubmit={(event) => { event.preventDefault(); if (amount === "" || !Number.isFinite(Number(amount)) || Number(amount) < 0 || (ritual.type === "weekly-target" && !Number.isInteger(Number(amount)))) return; apply(Number(amount)); }}>
      <p className="small-label">{dateLabel(date)}</p>
      {!checkbox && <label className="editor-label">{ritual.type === "duration" ? "Minutes" : ritual.type === "weekly-target" ? "Sessions on this day" : `Quantity (${ritual.unit})`}<input data-drawer-autofocus type="number" required min={0} step={ritual.type === "weekly-target" ? 1 : "any"} value={amount} placeholder={String(ritual.goal)} onChange={(event) => setAmount(event.target.value)} /></label>}
      <p className="small-label">{checkbox ? "Choose what happened. Leaving this unlogged keeps it unknown." : `${ritual.goal} ${ritual.unit} ${ritual.type === "weekly-target" ? "for the week" : "goal"}. Values below the goal stay partial. Saving zero explicitly records not done.`}</p>
      <div className="editor-actions">{checkbox ? <button data-drawer-autofocus className="muse-button button-primary" type="button" onClick={() => apply(1)}>Complete</button> : <button className="muse-button button-primary" type="submit" disabled={!status.loaded||!!status.error}>Save progress</button>}
        <button className="muse-button" type="button" onClick={() => apply(0)}>{ritual.type === "weekly-target" ? "No session on this day" : "Mark missed"}</button>
        {current !== null && <button className="text-button" type="button" onClick={() => apply(null)}>Clear log</button>}
        <button className="text-button" type="button" onClick={onClose}>Cancel</button>
      </div>
      {ritual.type === "weekly-target" && <p className="small-label">The success condition belongs to the week. A day without a session does not fail the weekly goal.</p>}
    </form>
  </MuseDrawer>;
}
