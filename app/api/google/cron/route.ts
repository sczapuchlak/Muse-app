import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createMuseAdminClient } from "@/lib/supabase/admin";
import { syncDue } from "@/lib/google/sync";

/**
 * #112 Background sync, called by Supabase pg_cron (via pg_net) every 30 minutes with `Authorization: Bearer
 * <GOOGLE_SYNC_SECRET>`. Not reachable from a browser session: without the secret it answers 404, so its existence
 * isn't advertised. Returns counts only — never names, events or errors from Google.
 */
export const maxDuration = 60;
const matches = (given: string, expected: string) => { const a = Buffer.from(given), b = Buffer.from(expected); return a.length === b.length && timingSafeEqual(a, b); };

export async function POST(request: NextRequest) {
  const secret = process.env.GOOGLE_SYNC_SECRET, auth = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 32 || !auth.startsWith("Bearer ") || !matches(auth.slice(7), secret)) return new NextResponse(null, { status: 404 });
  try { return NextResponse.json({ ok: true, ...(await syncDue(createMuseAdminClient())) }, { headers: { "cache-control": "no-store" } }); }
  catch { return NextResponse.json({ ok: false }, { status: 503, headers: { "cache-control": "no-store" } }); }
}
