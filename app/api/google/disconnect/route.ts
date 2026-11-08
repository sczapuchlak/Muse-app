import { NextResponse, type NextRequest } from "next/server";
import { trustedOrigin } from "@/lib/auth/http";
import { createMuseAdminClient } from "@/lib/supabase/admin";
import { disconnect } from "@/lib/google/sync";
import { carry, signedInUser } from "@/lib/google/http";

const uuid = (v: unknown): v is string => typeof v === "string" && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(v);

/** Revokes Muse's Google access and deletes the connection and its cached calendars and events. Muse's own events are untouched. */
export async function POST(request: NextRequest) {
  const { base, user } = await signedInUser(request);
  if (!trustedOrigin(request)) return carry(base, NextResponse.json({ error: "Use Muse from its configured origin." }, { status: 403 }));
  if (!user) return carry(base, NextResponse.json({ error: "Sign in to disconnect Google Calendar." }, { status: 401 }));
  try {
    const raw = await request.text(), id = raw.length < 200 ? JSON.parse(raw)?.id : null;
    if (!uuid(id)) return carry(base, NextResponse.json({ error: "Choose a connection to disconnect." }, { status: 400 }));
    const ok = await disconnect(createMuseAdminClient(), user.id, id);
    return carry(base, NextResponse.json(ok ? { ok: true } : { error: "That connection was already removed." }, { status: ok ? 200 : 404 }));
  } catch { return carry(base, NextResponse.json({ error: "Google Calendar couldn’t be disconnected. Nothing changed; try again." }, { status: 503 })); }
}
