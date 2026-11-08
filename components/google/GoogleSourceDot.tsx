"use client";
import type { CSSProperties } from "react";
import type { DayEvent } from "@/lib/models";
import "./GoogleCalendar.css";

/** Google Calendar (#35): a small dot in the calendar's own color marks a read-only Google event. */
export function GoogleSourceDot({ event }: { event: Pick<DayEvent, "color" | "calendarName"> }) {
  return <span className="muse-google-dot" style={event.color ? { "--google-calendar": event.color } as CSSProperties : undefined} title={`Google Calendar${event.calendarName ? ` · ${event.calendarName}` : ""}`} aria-hidden="true" />;
}
