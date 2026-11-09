"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import "./GoogleCalendar.css";
import { GlassPopover } from "../GlassPopover";
import { MuseIcon } from "../MuseIcon";
import { connectionStatus } from "@/lib/google/calendars";
import { allowEditingHref, canWrite, disconnectGoogle, googleWrite, setCalendarVisible, syncGoogle, useGoogleCalendar, type GoogleCalendar } from "./GoogleCalendarStore";

const outcomes: Record<string, string> = {
  connected: "Google Calendar is connected.",
  declined: "Google Calendar wasn’t connected. Nothing changed.",
  "no-calendar": "Muse needs permission to see your calendars. Connect again and leave the Calendar box ticked.",
  expired: "That connection attempt expired. Please try again.",
  unconfigured: "Google Calendar isn’t set up on this Muse server yet.",
  "signed-out": "Sign in to Muse, then connect Google Calendar.",
  failed: "Google Calendar couldn’t be connected. Nothing changed; please try again.",
  editing: "Muse can now add and edit events in your Google Calendar.",
  "no-write": "Muse still can’t edit Google Calendar: the permission to change events was left unticked. It still shows your events.",
};
/** “12 minutes ago”, “2 hours ago”, or a date. */
export function ago(iso: string, now = Date.now()) {
  const m = Math.round((now - Date.parse(iso)) / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  return when(iso);
}
const when = (iso: string) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** Settings → Google Calendar. Separate from "Sign in with Google". Read-only until you allow editing (#112). */
export function GoogleCalendarSettings() {
  const [now] = useState(() => Date.now());
  const s = useGoogleCalendar(), [outcome, setOutcome] = useState(""), [confirming, setConfirming] = useState<string | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    const url = new URL(window.location.href), o = url.searchParams.get("google");
    if (!o) return;
    // "failed:<step>:<reason>" carries a short, safe diagnosis from the callback (no codes, tokens or personal data).
    const [kind, step, reason] = o.split(":");
    const text = outcomes[kind] ?? "";
    const t = window.setTimeout(() => setOutcome(kind === "failed" && step ? `${text} (Details for support: ${step.replace(/-/g, " ")}${reason ? ` · ${reason}` : ""})` : text), 0);
    url.searchParams.delete("google"); window.history.replaceState(null, "", url);
    return () => window.clearTimeout(t);
  }, []);
  async function remove(id: string) {
    setBusy(true); setError("");
    try { await disconnectGoogle(id); setConfirming(null); setOutcome("Google Calendar is disconnected. Your Muse events are unchanged."); } catch (e) { setError(e instanceof Error ? e.message : "That didn’t work."); } finally { setBusy(false); }
  }
  return <div className="muse-settings-fields muse-google-settings">
    <p className="card-description">See events from your Google calendars in Planner Day, Week and Month. Google events stay separate from your Muse events and tasks. If you allow it, Muse can also add and edit Google events, and add chosen Muse events to Google. Muse never deletes anything in Google without asking.</p>
    {outcome && <p className="small-label" role="status">{outcome}</p>}
    {!s.loaded ? <p className="small-label">Loading…</p> : !s.connections.length ? <section>
      <a className="muse-button" href="/api/google/connect">Connect Google Calendar</a>
      <p className="small-label">This is separate from signing in with Google. You choose which calendars to show, and you can disconnect at any time.</p>
    </section> : s.connections.map((c) => {
      const st = connectionStatus(c), cals = s.calendars.filter((k) => k.connection_id === c.id), editing = canWrite(c);
      const stuck = s.links.filter((l) => l.connection_id === c.id && (l.state === "error" || l.state === "pending")), conflicts = s.links.filter((l) => l.connection_id === c.id && (l.state === "conflict" || l.state === "missing"));
      return <section key={c.id} aria-label={`Google Calendar ${c.email}`}>
        <div className="muse-google-account">
          <div><h3>{c.email || "Google account"}</h3>
            <p className="small-label" role={st.tone === "warning" ? "alert" : undefined} data-tone={st.tone}>{st.text}{st.tone === "ok" && c.last_synced_at ? ` ${ago(c.last_synced_at, now)}` : ""}</p></div>
          {c.status === "needs-reconnect" ? <a className="muse-button" href="/api/google/connect">Reconnect Google Calendar</a>
            : <button type="button" className="muse-button muse-google-refresh" disabled={s.syncing} onClick={() => void syncGoogle(true)}>{s.syncing ? "Syncing…" : "Refresh now"}</button>}
        </div>
        <dl className="muse-google-facts">
          <div><dt>Access</dt><dd className="muse-google-access">
            <span className="muse-tone-pill muse-google-access-status" data-access={editing ? "edit" : "view"}>{editing ? "View & edit enabled" : "View only"}</span>
            {!editing && c.status !== "needs-reconnect" && <a className="muse-button muse-google-allow" href={allowEditingHref("/settings")}>Allow editing</a>}
          </dd></div>
          <div><dt>Stays up to date</dt><dd>{c.last_background_sync_at && now - Date.parse(c.last_background_sync_at) < 3 * 3600_000 ? `In the background about every 30 minutes, even when Muse is closed (last ${ago(c.last_background_sync_at, now)}).` : "When you open Planner or Daily Edit. Background checks aren’t running on this Muse server yet."} Refresh now checks right away.</dd></div>
          {c.status === "needs-reconnect" && <div><dt>Needs you</dt><dd>Google stopped accepting Muse’s access (it was removed, your password changed, or a test connection reached Google’s 7-day limit). Reconnect to pick up where it left off; nothing in Muse is lost.</dd></div>}
        </dl>
        {stuck.length > 0 && <p className="small-label muse-google-attention" role="status">{stuck.length} Muse {stuck.length === 1 ? "event hasn’t" : "events haven’t"} reached Google yet. Muse retries in the background.
          <button type="button" className="text-button" disabled={busy} onClick={() => { setBusy(true); void Promise.allSettled(stuck.map((l) => googleWrite({ action: "push", museEventId: l.muse_event_id }))).finally(() => setBusy(false)); }}>Retry now</button></p>}
        {conflicts.length > 0 && <p className="small-label muse-google-attention" role="status">{conflicts.length} Muse {conflicts.length === 1 ? "event was" : "events were"} changed or deleted in Google. Open {conflicts.length === 1 ? "it" : "them"} in Planner to choose which version to keep.</p>}
        {cals.length > 0 && <CalendarPicker id={c.id} calendars={cals} />}
        {confirming === c.id ? <div className="muse-google-confirm" role="group" aria-label="Confirm disconnect">
          <p className="small-label">Disconnect removes Muse’s access and its copy of these calendars. Your Google Calendar and your Muse events are not changed.</p>
          <button type="button" className="muse-button" disabled={busy} onClick={() => void remove(c.id)}>{busy ? "Disconnecting…" : "Disconnect"}</button>
          <button type="button" className="muse-button button-ghost" disabled={busy} onClick={() => setConfirming(null)}>Keep connected</button>
        </div> : <button type="button" className="text-button" onClick={() => setConfirming(c.id)}>Disconnect Google Calendar</button>}
      </section>;
    })}
    {(error || s.error) && <p className="small-label" role="alert">{error || s.error}</p>}
  </div>;
}

/** #12: a compact calendar chooser — one button with the shown calendars as small chips, and a scrollable checklist
 * in a popover — so the Settings card stays short however many calendars an account has. */
function CalendarPicker({ id, calendars }: { id: string; calendars: GoogleCalendar[] }) {
  const [open, setOpen] = useState(false), anchor = useRef<HTMLButtonElement>(null), shown = calendars.filter((k) => k.visible);
  const dot = (k: GoogleCalendar) => <span className="muse-google-dot" style={k.color ? { "--google-calendar": k.color } as CSSProperties : undefined} aria-hidden="true" />;
  return <div className="muse-google-picker">
    <span className="editor-label" id={`google-cals-${id}`}>Show in Planner</span>
    <button ref={anchor} type="button" className="muse-button button-ghost muse-google-picker-trigger" aria-haspopup="dialog" aria-expanded={open} aria-describedby={`google-cals-${id}`} onClick={() => setOpen((v) => !v)}>
      <span className="muse-google-dots" aria-hidden="true">{shown.slice(0, 5).map((k) => <span key={k.id}>{dot(k)}</span>)}</span>
      Calendars · {shown.length} of {calendars.length} shown<MuseIcon name="chevron" size={14} />
    </button>
    {shown.length > 0 && <ul className="muse-google-chips" aria-label="Calendars shown in Planner">{shown.map((k) => <li key={k.id}>{dot(k)}<span>{k.name}</span></li>)}</ul>}
    <GlassPopover id={`google-cals-pop-${id}`} label="Choose calendars to show" title="Calendars" open={open} anchorRef={anchor} onClose={() => setOpen(false)} width={320}>
      <div className="muse-google-checklist" role="group" aria-label="Calendars to show in Planner">
        {calendars.map((k) => <label key={k.id} className="muse-check-row"><input type="checkbox" checked={k.visible} onChange={(e) => void setCalendarVisible(k, e.target.checked)} />
          {dot(k)}<span>{k.name}{k.is_primary && <span className="small-label"> · primary</span>}</span></label>)}
      </div>
      <p className="small-label">Hiding a calendar only hides it in Muse. Nothing is deleted in Google.</p>
    </GlassPopover>
  </div>;
}
