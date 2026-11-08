"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { connectionStatus } from "@/lib/google/calendars";
import { disconnectGoogle, setCalendarVisible, syncGoogle, useGoogleCalendar } from "./GoogleCalendarStore";

const outcomes: Record<string, string> = {
  connected: "Google Calendar is connected.",
  declined: "Google Calendar wasn’t connected. Nothing changed.",
  "no-calendar": "Muse needs permission to see your calendars. Connect again and leave the Calendar box ticked.",
  expired: "That connection attempt expired. Please try again.",
  unconfigured: "Google Calendar isn’t set up on this Muse server yet.",
  "signed-out": "Sign in to Muse, then connect Google Calendar.",
  failed: "Google Calendar couldn’t be connected. Nothing changed; please try again.",
};
const when = (iso: string) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** Settings → Google Calendar (#35, phase 1, read-only). Separate from "Sign in with Google". */
export function GoogleCalendarSettings() {
  const s = useGoogleCalendar(), [outcome, setOutcome] = useState(""), [confirming, setConfirming] = useState<string | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    const url = new URL(window.location.href), o = url.searchParams.get("google");
    if (!o) return;
    const t = window.setTimeout(() => setOutcome(outcomes[o] ?? ""), 0);
    url.searchParams.delete("google"); window.history.replaceState(null, "", url);
    return () => window.clearTimeout(t);
  }, []);
  async function remove(id: string) {
    setBusy(true); setError("");
    try { await disconnectGoogle(id); setConfirming(null); setOutcome("Google Calendar is disconnected. Your Muse events are unchanged."); } catch (e) { setError(e instanceof Error ? e.message : "That didn’t work."); } finally { setBusy(false); }
  }
  return <div className="muse-settings-fields muse-google-settings">
    <p className="card-description">See events from your Google calendars in Planner Day, Week and Month. Muse only reads them: it never changes your Google Calendar, and Google events stay separate from your Muse events and tasks.</p>
    {outcome && <p className="small-label" role="status">{outcome}</p>}
    {!s.loaded ? <p className="small-label">Loading…</p> : !s.connections.length ? <section>
      <a className="muse-button" href="/api/google/connect">Connect Google Calendar</a>
      <p className="small-label">This is separate from signing in with Google. You choose which calendars to show, and you can disconnect at any time.</p>
    </section> : s.connections.map((c) => {
      const st = connectionStatus(c), cals = s.calendars.filter((k) => k.connection_id === c.id);
      return <section key={c.id} aria-label={`Google Calendar ${c.email}`}>
        <h3>{c.email || "Google account"}</h3>
        <p className="small-label" role={st.tone === "warning" ? "alert" : undefined} data-tone={st.tone}>{st.text}{st.tone === "ok" && c.last_synced_at ? ` · ${when(c.last_synced_at)}` : ""}</p>
        {c.status === "needs-reconnect" ? <a className="muse-button" href="/api/google/connect">Reconnect Google Calendar</a>
          : <button type="button" className="muse-button button-ghost" disabled={s.syncing} onClick={() => void syncGoogle(true)}>{s.syncing ? "Syncing…" : "Refresh now"}</button>}
        {cals.length > 0 && <fieldset className="muse-google-calendars"><legend className="editor-label">Show in Planner</legend>
          {cals.map((k) => <label key={k.id} className="muse-check-row"><input type="checkbox" checked={k.visible} onChange={(e) => void setCalendarVisible(k, e.target.checked)} />
            <span className="muse-google-dot" style={k.color ? { "--google-calendar": k.color } as CSSProperties : undefined} aria-hidden="true" />{k.name}{k.is_primary && <span className="small-label"> · primary</span>}</label>)}
          <p className="small-label">Hiding a calendar only hides it in Muse. Nothing is deleted in Google.</p></fieldset>}
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
