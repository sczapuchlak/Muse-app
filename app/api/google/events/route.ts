import { NextResponse, type NextRequest } from "next/server";
import { trustedOrigin } from "@/lib/auth/http";
import { createMuseAdminClient } from "@/lib/supabase/admin";
import { carry, signedInUser } from "@/lib/google/http";
import { createGoogleEvent, deleteGoogleEvent, GoogleWriteError, linkedGoogleVersion, pushMuseEvent, unlinkMuseEvent, updateGoogleEvent } from "@/lib/google/write";
import type { GoogleEventFields } from "@/lib/google/write-rules";

/**
 * #112 Google Calendar writes from Muse. Same-origin, signed-in only; every action is checked against the user on the
 * server. Answers `{ ok }` or `{ error, code, remote? }`, where code is needs-write, reconnect, conflict (with Google's
 * version), gone, not-writable, invalid or failed. Nothing here ever changes a Muse record.
 */
const uuid = (v: unknown): v is string => typeof v === "string" && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(v);
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
const status: Record<string, number> = { "needs-write": 403, "not-writable": 403, reconnect: 401, conflict: 409, gone: 410, invalid: 400, "not-found": 404, failed: 502 };
function fields(v: unknown): GoogleEventFields | null {
  const f = v as Record<string, unknown> | null;
  if (!f || typeof f !== "object") return null;
  const s = (k: string) => (typeof f[k] === "string" ? f[k] as string : null);
  return { title: s("title") ?? "", date: s("date") ?? "", endDate: s("endDate"), allDay: f.allDay === true, time: s("time"), endTime: s("endTime"), location: s("location"), description: s("description"), timeZone: s("timeZone") ?? "UTC", tentative: f.tentative === true };
}

export async function POST(request: NextRequest) {
  const { base, user } = await signedInUser(request);
  const reply = (body: unknown, code = 200) => carry(base, NextResponse.json(body, { status: code }));
  if (!trustedOrigin(request)) return reply({ error: "Use Muse from its configured origin." }, 403);
  if (!user) return reply({ error: "Sign in to change Google Calendar." }, 401);
  let body: Record<string, unknown>;
  try { const raw = await request.text(); if (raw.length > 20_000) return reply({ error: "Too much at once." }, 413); body = JSON.parse(raw); } catch { return reply({ error: "Unreadable request." }, 400); }
  const admin = createMuseAdminClient(), where = { connectionId: body.connectionId, calendarId: body.calendarId };
  const located = uuid(where.connectionId) && text(where.calendarId, 1024);
  try {
    switch (body.action) {
      case "create": { const f = fields(body.fields); if (!located || !uuid(body.key) || !f) return reply({ error: "Choose a calendar and fill in the event.", code: "invalid" }, 400);
        return reply({ ok: true, ...(await createGoogleEvent(admin, user.id, { connectionId: where.connectionId as string, calendarId: where.calendarId as string, key: body.key, fields: f })) }); }
      case "update": { const f = fields(body.fields); if (!located || !text(body.eventId, 1024) || !f) return reply({ error: "Unreadable request.", code: "invalid" }, 400);
        return reply({ ok: true, ...(await updateGoogleEvent(admin, user.id, { connectionId: where.connectionId as string, calendarId: where.calendarId as string, eventId: body.eventId, etag: typeof body.etag === "string" ? body.etag : null, fields: f })) }); }
      case "delete": { if (!located || !text(body.eventId, 1024) || body.confirmed !== true) return reply({ error: "Confirm deleting it from Google first.", code: "invalid" }, 400);
        return reply({ ok: true, ...(await deleteGoogleEvent(admin, user.id, { connectionId: where.connectionId as string, calendarId: where.calendarId as string, eventId: body.eventId, etag: typeof body.etag === "string" ? body.etag : null })) }); }
      case "push": { if (!uuid(body.museEventId) || (body.connectionId !== undefined && !located)) return reply({ error: "Unreadable request.", code: "invalid" }, 400);
        return reply({ ok: true, ...(await pushMuseEvent(admin, user.id, { museEventId: body.museEventId, ...(located ? { connectionId: where.connectionId as string, calendarId: where.calendarId as string } : {}), force: body.force === true })) }); }
      case "google-version": { if (!uuid(body.museEventId)) return reply({ error: "Unreadable request.", code: "invalid" }, 400);
        return reply({ ok: true, ...(await linkedGoogleVersion(admin, user.id, body.museEventId)) }); }
      case "unlink": { if (!uuid(body.museEventId) || (body.deleteInGoogle === true && body.confirmed !== true)) return reply({ error: "Confirm deleting it from Google first.", code: "invalid" }, 400);
        return reply({ ok: true, ...(await unlinkMuseEvent(admin, user.id, { museEventId: body.museEventId, deleteInGoogle: body.deleteInGoogle === true })) }); }
      default: return reply({ error: "Unknown action.", code: "invalid" }, 400);
    }
  } catch (e) {
    if (e instanceof GoogleWriteError) return reply({ error: e.message, code: e.code, ...(e.remote ? { remote: e.remote } : {}) }, status[e.code] ?? 502);
    return reply({ error: "Google Calendar couldn’t be reached. Nothing in Muse was lost; try again.", code: "failed" }, 503);
  }
}
