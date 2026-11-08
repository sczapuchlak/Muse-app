import { timingSafeEqual } from "node:crypto";
import { type NextRequest } from "next/server";
import { createMuseAdminClient } from "@/lib/supabase/admin";
import { seal } from "@/lib/google/crypto";
import { exchangeCode, googleConfig, grantsCalendarRead, identity, revoke } from "@/lib/google/oauth";
import { syncConnection } from "@/lib/google/sync";
import { signedInUser, STATE_COOKIE, toSettings } from "@/lib/google/http";

const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

export async function GET(request: NextRequest) {
  const { base, user } = await signedInUser(request);
  const done = (outcome: string) => { const r = toSettings(base, outcome); r.cookies.set(STATE_COOKIE, "", { path: "/api/google", maxAge: 0 }); return r; };
  if (!user) return done("signed-out");
  if (!googleConfig()) return done("unconfigured");
  const q = request.nextUrl.searchParams, cookie = request.cookies.get(STATE_COOKIE)?.value ?? "", state = q.get("state") ?? "";
  if (!state || !same(cookie, `${state}.${user.id}`)) return done("expired");
  if (q.get("error")) return done("declined");
  const code = q.get("code");
  if (!code) return done("failed");
  try {
    const t = await exchangeCode(code);
    if (!grantsCalendarRead(t.scope)) { await revoke(t.refresh_token ?? t.access_token); return done("no-calendar"); }
    const who = identity(t.id_token);
    if (!who.sub || !t.refresh_token) { await revoke(t.access_token); return done("failed"); }
    const admin = createMuseAdminClient(), now = new Date().toISOString();
    const { data: conn, error } = await admin.from("google_connections").upsert({ user_id: user.id, google_sub: who.sub, email: who.email.slice(0, 320), scopes: (t.scope ?? "").split(" ").filter(Boolean),
      status: "active", last_error: null, updated_at: now }, { onConflict: "user_id,google_sub" }).select("id,user_id,status,last_synced_at").single();
    if (error) throw error;
    const saved = await admin.from("google_tokens").upsert({ connection_id: conn.id, refresh_ciphertext: seal(t.refresh_token), access_ciphertext: seal(t.access_token),
      access_expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(), updated_at: now });
    if (saved.error) throw saved.error;
    await syncConnection(admin, conn, { calendars: true }); // records its own status; a slow first sync never blocks connecting
    return done("connected");
  } catch { return done("failed"); }
}
