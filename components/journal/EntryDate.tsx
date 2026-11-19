"use client";
import { useState } from "react";
import { MuseModal } from "../MuseModal";
import { MuseDatePicker } from "../MuseDatePicker";
import { MuseIcon } from "../MuseIcon";
import { localReadingInstant } from "@/lib/whimsy/books";
import { formatDay } from "./format";

/** "23:45" for an instant in a time zone. */
export function localClock(iso: string, timeZone: string) {
  try { return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso)); } catch { return ""; }
}
/** "11:45 PM" for an instant in a time zone. */
export function displayClock(iso: string, timeZone: string) {
  try { return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso)); } catch { return ""; }
}
/** The instant for a local day and "HH:MM" in a time zone, or null when the time is left blank. */
export function entryInstant(date: string, time: string, timeZone: string): string | null {
  return time ? localReadingInstant(date, time, timeZone) : null;
}

/**
 * Choose the day (and time) an entry belongs to. Used for an entry that ran past midnight, one finished later, or a
 * new entry written for a day you missed. The entry and its words move together; each message keeps when it was
 * actually written. Today or earlier only.
 */
export function EntryDateDialog({ title, date, time, today, onSave, onClose, note }: { title: string; date: string; time: string; today: string; note?: string; onSave: (date: string, time: string) => Promise<boolean>; onClose: () => void }) {
  const [d, setD] = useState(date), [t, setT] = useState(time), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const save = async () => {
    if (d > today) { setError("Choose today or a day that has already happened."); return; }
    setBusy(true); setError("");
    try { if (await onSave(d, t)) onClose(); else setError("That didn’t save. Try again."); }
    catch (e) { setError(e instanceof Error ? e.message : "That didn’t save. Try again."); }
    finally { setBusy(false); }
  };
  return <MuseModal id="mj-entry-date" label={title} title={title} returnFocus={null} onClose={onClose}>
    <div className="mj-form mj-entry-date">
      <div className="mj-entry-date-row">
        <div className="mj-entry-date-field"><span className="type-meta">Day</span>
          <MuseDatePicker date={d} today={today} onChange={(x) => { setD(x); setError(""); }} label="Entry day" triggerText={formatDay(d)} /></div>
        <label className="mj-entry-date-field"><span className="type-meta">Time <small>optional</small></span>
          <input type="time" value={t} onChange={(e) => setT(e.target.value)} aria-label="Entry time" /></label>
      </div>
      <p className="mj-note"><MuseIcon name="info" size={14} /> {note ?? "The entry, its streak day and its place in History move to this day. Your words keep the time you actually wrote them."}</p>
      {error && <p className="mj-error" role="alert">{error}</p>}
      <div className="mj-form-actions"><button type="button" className="muse-button button-ghost" onClick={onClose}>Cancel</button><button type="button" className="muse-button button-primary" disabled={busy || !d} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</button></div>
    </div>
  </MuseModal>;
}
