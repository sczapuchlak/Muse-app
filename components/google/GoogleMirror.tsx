"use client";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { PlannerStore } from "@/lib/data/planner-store";
import type { GoogleEventFields } from "@/lib/google/write-rules";
import { allowEditingHref, googleWrite, GoogleWriteFailure, useGoogleDestinations, useGoogleLink, type GoogleLink } from "./GoogleCalendarStore";

/**
 * #112 "Also add to Google" for a Muse event. Off by default. The Muse event is saved first and stays the record;
 * its Google copy is pushed only after Muse confirms the save, so a failed Google write can never lose the event —
 * the copy just shows its state here (and in Settings) with Retry. Edits made in Google surface as a choice.
 */
export type MirrorChoice = { enabled: boolean; target: string; removeFromGoogle: boolean; /** after "Use Google's version": write over Google's current copy */ force?: boolean };
export const mirrorOff: MirrorChoice = { enabled: false, target: "", removeFromGoogle: false };

/** Runs `fn` once the Planner store has saved everything queued so far (never if the save fails). */
export function afterPlannerSaved(store: PlannerStore | undefined, fn: () => void, timeoutMs = 30_000) {
  if (!store) { fn(); return; }
  const started = Date.now(); let done = false;
  const check = () => {
    if (done) return; const v = store.getSnapshot();
    if (v.error || Date.now() - started > timeoutMs) { done = true; unsubscribe(); return; }
    if (!v.pending && !v.saving) { done = true; unsubscribe(); fn(); }
  };
  const unsubscribe = store.subscribe(check); setTimeout(check, 0);
}

/** After the Muse event is saved: create/update the Google copy, or stop mirroring (deleting in Google only if confirmed). */
export function applyMirror(store: PlannerStore | undefined, museEventId: string, choice: MirrorChoice, link: GoogleLink | null) {
  if (choice.enabled) {
    const [connectionId, calendarId] = choice.target.split("|");
    afterPlannerSaved(store, () => void googleWrite({ action: "push", museEventId, ...(choice.force ? { force: true } : {}), ...(!link && connectionId && calendarId ? { connectionId, calendarId } : {}) }).catch(() => undefined));
  } else if (link) {
    void googleWrite({ action: "unlink", museEventId, deleteInGoogle: choice.removeFromGoogle, confirmed: choice.removeFromGoogle }).catch(() => undefined);
  }
}

const stateText: Record<GoogleLink["state"], string> = {
  pending: "Sending to Google…", synced: "In Google Calendar", error: "Didn’t reach Google yet",
  conflict: "Changed in Google since Muse last saved it", missing: "Deleted in Google",
};

export function GoogleMirrorSection({ museEventId, recurring, value, onChange, onUseGoogle }: {
  museEventId?: string; recurring: boolean; value: MirrorChoice; onChange: (v: MirrorChoice) => void;
  /** "Use Google's version": the editor applies Google's fields to the Muse event, then re-saves the copy over it. */
  onUseGoogle: (fields: GoogleEventFields, etag: string | null) => void;
}) {
  const destinations = useGoogleDestinations(), link = useGoogleLink(museEventId), path = usePathname() ?? "/planner", query = useSearchParams()?.toString();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  if (!destinations.length) return null;
  const editable = destinations.filter((d) => d.editing && !d.reconnect), linkedCal = link && destinations.find((d) => d.connection_id === link.connection_id && d.calendar_id === link.calendar_id);
  const allow = allowEditingHref(`${path}${query ? `?${query}` : ""}`);
  async function act(body: Record<string, unknown>, then?: (j: { fields?: GoogleEventFields; etag?: string | null }) => void) {
    setBusy(true); setMessage("");
    try { const j = await googleWrite(body); then?.(j); } catch (e) { setMessage(e instanceof GoogleWriteFailure ? e.message : "That didn’t work. Try again."); } finally { setBusy(false); }
  }
  if (recurring) return <p className="small-label muse-google-mirror">Repeating events can’t be added to Google yet. Add them in Google Calendar instead.</p>;
  return <fieldset className="muse-google-mirror">
    <legend>Google Calendar</legend>
    <label className="muse-event-inline"><input type="checkbox" checked={value.enabled} disabled={!link && !editable.length}
      onChange={(e) => onChange({ ...value, enabled: e.target.checked, target: value.target || (editable[0] ? `${editable[0].connection_id}|${editable[0].calendar_id}` : "") })} /> Also add to Google</label>
    {!link && !editable.length && <p className="small-label">{destinations.some((d) => d.editing && d.reconnect) ? <>To add Muse events to Google, <a href={allow}>reconnect Google Calendar</a>.</> : <>To add Muse events to Google, <a href={allow}>allow Muse to edit Google Calendar</a>.</>}</p>}
    {value.enabled && !link && editable.length > 0 && <label><span>Calendar</span>
      <select value={value.target} onChange={(e) => onChange({ ...value, target: e.target.value })}>
        {editable.map((d) => <option key={d.id} value={`${d.connection_id}|${d.calendar_id}`}>{d.name}{editable.some((x) => x.email !== d.email) ? ` · ${d.email}` : ""}</option>)}
      </select></label>}
    {link && value.enabled && <div className="muse-google-link" data-state={link.state}>
      <p className="small-label"><strong>{stateText[link.state]}</strong>{linkedCal ? ` · ${linkedCal.name}` : ""}{link.state === "error" && link.last_error ? ` · ${link.last_error}` : ""}</p>
      {link.state === "error" && <button type="button" className="text-button" disabled={busy} onClick={() => void act({ action: "push", museEventId })}>Retry now</button>}
      {link.state === "conflict" && <div className="editor-actions">
        <button type="button" className="muse-button" disabled={busy} onClick={() => void act({ action: "push", museEventId, force: true })}>Keep Muse’s version</button>
        <button type="button" className="muse-button button-ghost" disabled={busy} onClick={() => void act({ action: "google-version", museEventId }, (j) => { if (j.fields) onUseGoogle(j.fields, j.etag ?? null); })}>Use Google’s version</button>
      </div>}
      {link.state === "missing" && <p className="small-label">Saving adds it to Google again; untick the box to stop mirroring it.</p>}
    </div>}
    {link && !value.enabled && <fieldset className="muse-google-unlink"><legend className="small-label">The copy in Google Calendar</legend>
      <label className="muse-event-inline"><input type="radio" name={`unlink-${museEventId}`} checked={!value.removeFromGoogle} onChange={() => onChange({ ...value, removeFromGoogle: false })} /> Keep it in Google</label>
      <label className="muse-event-inline"><input type="radio" name={`unlink-${museEventId}`} checked={value.removeFromGoogle} onChange={() => onChange({ ...value, removeFromGoogle: true })} /> Delete it from Google too</label>
    </fieldset>}
    {message && <p className="small-label muse-google-problem" role="alert">{message}</p>}
  </fieldset>;
}
