import { NextResponse, type NextRequest } from "next/server";
import { trustedOrigin } from "@/lib/auth/http";
import { createMuseAdminClient } from "@/lib/supabase/admin";
import { syncUser } from "@/lib/google/sync";
import { carry, signedInUser } from "@/lib/google/http";

/** On-demand read sync. `{ force: true }` (Refresh) also re-reads the calendar list and ignores the 10-minute pause. */
export async function POST(request: NextRequest) {
  const { base, user } = await signedInUser(request);
  if (!trustedOrigin(request)) return carry(base, NextResponse.json({ error: "Use Muse from its configured origin." }, { status: 403 }));
  if (!user) return carry(base, NextResponse.json({ error: "Sign in to sync Google Calendar." }, { status: 401 }));
  try {
    const raw = await request.text();
    const force = raw.length < 200 && raw ? JSON.parse(raw)?.force === true : false;
    await syncUser(createMuseAdminClient(), user.id, force);
    return carry(base, NextResponse.json({ ok: true }));
  } catch { return carry(base, NextResponse.json({ error: "Google Calendar couldn’t sync right now." }, { status: 503 })); }
}
