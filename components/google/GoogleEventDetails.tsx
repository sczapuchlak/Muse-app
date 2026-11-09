"use client";
import { usePathname, useSearchParams } from "next/navigation";
import type { DayEvent } from "@/lib/models";
import { eventDays, eventWhen } from "@/lib/agenda";
import { useDailyData } from "../daily/DailyData";
import { GoogleSourceDot } from "./GoogleSourceDot";
import { GoogleEventEditor } from "./GoogleEventEditor";
import { allowEditingHref, useGoogleDestinations } from "./GoogleCalendarStore";

/**
 * A Google Calendar event in Muse. Editable (#112) when Muse may edit Google Calendar and you can edit this calendar in
 * Google; otherwise read-only details, with "Allow editing" when only the permission is missing.
 */
export function GoogleEventDetails({ event, onDone }: { event: DayEvent; onDone: () => void }) {
  const { profile } = useDailyData(), destinations = useGoogleDestinations(), path = usePathname() ?? "/planner", query = useSearchParams()?.toString();
  if (event.google?.writable) return <GoogleEventEditor event={event} date={event.date} timeZone={profile.timeZone} onDone={onDone} />;
  const couldEdit = !!event.google && destinations.some((d) => d.connection_id === event.google!.connectionId && d.calendar_id === event.google!.calendarId);
  return <div className="muse-google-event">
    <p className="editor-label"><GoogleSourceDot event={event} /> Google Calendar{event.calendarName ? ` · ${event.calendarName}` : ""}</p>
    <h3>{event.title}</h3>
    <p>{eventWhen(event)}{event.endDate ? ` (${eventDays(event)})` : ""}{event.status === "tentative" ? " · tentative" : ""}</p>
    {event.location && <p className="small-label">{event.location}</p>}
    {event.detail && <p className="small-label muse-google-notes">{event.detail}</p>}
    <p className="small-label">{couldEdit ? "Muse can show this event but not change it yet." : "Read-only in Muse: this calendar can’t be edited from your Google account."} Changes made in Google Calendar appear here after the next sync.</p>
    <div className="muse-google-event-actions">
      {couldEdit && <a className="muse-button" href={allowEditingHref(`${path}${query ? `?${query}` : ""}`)}>Allow Muse to edit Google Calendar</a>}
      {event.link?.startsWith("https://") && <a className="muse-button" href={event.link} target="_blank" rel="noopener noreferrer">Open in Google Calendar</a>}
      <button type="button" className="muse-button button-ghost" onClick={onDone}>Done</button>
    </div>
  </div>;
}
