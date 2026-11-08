/** Pure Google Calendar rules (#35), shared by the server sync and tests. */

/** New calendars: your primary and calendars you own start visible; shared and subscribed ones (holidays, others' calendars) start hidden. */
export const defaultVisible = (c: { primary?: boolean; accessRole?: string; hidden?: boolean }) => !c.hidden && (!!c.primary || c.accessRole === "owner");

/** The first (full) sync reads 60 days back and a year ahead; later syncs use Google's sync token and only fetch changes. */
export function syncWindow(now: Date) {
  const day = 86_400_000;
  return { timeMin: new Date(now.getTime() - 60 * day).toISOString(), timeMax: new Date(now.getTime() + 365 * day).toISOString() };
}

/** Status shown in Settings for one connection. */
export function connectionStatus(c: { status: string; last_synced_at: string | null; last_error: string | null }) {
  if (c.status === "needs-reconnect") return { tone: "warning" as const, text: c.last_error || "Reconnect Google Calendar to keep seeing your calendars." };
  if (c.status === "error") return { tone: "warning" as const, text: c.last_error || "The last sync didn’t finish. Muse will try again." };
  return { tone: "ok" as const, text: c.last_synced_at ? "Synced" : "Waiting for the first sync" };
}
