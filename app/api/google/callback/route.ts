import { timingSafeEqual } from "node:crypto";
import { type NextRequest } from "next/server";
import { createMuseAdminClient } from "@/lib/supabase/admin";
import { seal } from "@/lib/google/crypto";
import { exchangeCode, googleConfig, grantsCalendarRead, grantsCalendarWrite, identity, revoke } from "@/lib/google/oauth";
import { syncConnection } from "@/lib/google/sync";
import { signedInUser, STATE_COOKIE, toSettings } from "@/lib/google/http";

const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

export async function GET(request: NextRequest) {
  const { base, user } = await signedInUser(request);
  const [bound = "", mode = "r", next = ""] = (request.cookies.get(STATE_COOKIE)?.value ?? "").split("|"), wantsWrite = mode === "w";
  const done = (outcome: string) => { const r = toSettings(base, outcome, next); r.cookies.set(STATE_COOKIE, "", { path: "/api/google", maxAge: 0 }); return r; };
  if (!user) return done("signed-out");
  if (!googleConfig()) return done("unconfigured");
  const q = request.nextUrl.searchParams, state = q.get("state") ?? "";
  if (!state || !same(bound, `${state}.${user.id}`)) return done("expired");
  if (q.get("error")) return done("declined");
  const code = q.get("code");
  if (!code) return done("failed");
  // Diagnostics: the step reached and a short error code (Google's or the database's) are logged and shown in Settings.
  // Never the authorization code, tokens, secrets, email or calendar data.
  let step = "token-exchange";
  const failed = (reason: string) => {
    console.error(JSON.stringify({ event: "google_callback_failed", step, reason }));
    return done(`failed:${step}:${reason}`.replace(/[^a-z0-9:_-]/gi, "").slice(0, 80));
  };
  try {
    const t = await exchangeCode(code);
    step = "scope-check";
    if (!grantsCalendarRead(t.scope)) { await revoke(t.refresh_token ?? t.access_token); return done("no-calendar"); }
    step = "identity";
    const who = identity(t.id_token);
    if (!who.sub) { await revoke(t.access_token); return failed("no_id_token_sub"); }
    if (!t.refresh_token) { await revoke(t.access_token); return failed("no_refresh_token"); }
    step = "admin-client";
    const admin = createMuseAdminClient(), now = new Date().toISOString();
    step = "save-connection";
    const { data: conn, error } = await admin.from("google_connections").upsert({ user_id: user.id, google_sub: who.sub, email: who.email.slice(0, 320), scopes: (t.scope ?? "").split(" ").filter(Boolean),
      status: "active", last_error: null, updated_at: now }, { onConflict: "user_id,google_sub" }).select("id,user_id,status,last_synced_at").single();
    if (error) throw error;
    step = "encrypt-tokens";
    const sealed = { refresh_ciphertext: seal(t.refresh_token), access_ciphertext: seal(t.access_token) };
    step = "save-tokens";
    const saved = await admin.from("google_tokens").upsert({ connection_id: conn.id, ...sealed,
      access_expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(), updated_at: now });
    if (saved.error) throw saved.error;
    step = "first-sync";
    await syncConnection(admin, conn, { calendars: true }); // records its own status; a slow first sync never blocks connecting
    // Asked for editing but unticked it on Google's screen: still connected, still read-only. Nothing is revoked.
    if (wantsWrite) return done(grantsCalendarWrite(t.scope) ? "editing" : "no-write");
    return done("connected");
  } catch (e) {
    const x = e as { googleError?: string; code?: string; name?: string };
    return failed(x.googleError ?? (x.code ? `db_${x.code}` : x.name ?? "error"));
  }
}
