"use client";
import type { DayEvent } from "@/lib/models";
import { eventDays, eventWhen } from "@/lib/agenda";
import { GoogleSourceDot } from "../planner/AgendaSections";

/** A Google Calendar event in Muse is read-only in phase 1 (#35): details plus a link to change it in Google. */
export function GoogleEventDetails({ event, onDone }: { event: DayEvent; onDone: () => void }) {
  return <div className="muse-google-event">
    <p className="editor-label"><GoogleSourceDot event={event} /> Google Calendar{event.calendarName ? ` · ${event.calendarName}` : ""}</p>
    <h3>{event.title}</h3>
    <p>{eventWhen(event)}{event.endDate ? ` (${eventDays(event)})` : ""}{event.status === "tentative" ? " · tentative" : ""}</p>
    {event.location && <p className="small-label">{event.location}</p>}
    <p className="small-label">Read-only in Muse. Changes made in Google Calendar appear here after the next sync.</p>
    <div className="muse-google-event-actions">
      {event.link?.startsWith("https://") && <a className="muse-button" href={event.link} target="_blank" rel="noopener noreferrer">Open in Google Calendar</a>}
      <button type="button" className="muse-button button-ghost" onClick={onDone}>Done</button>
    </div>
  </div>;
}
