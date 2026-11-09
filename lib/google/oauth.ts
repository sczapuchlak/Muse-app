import "server-only";
import { authConfig } from "@/lib/auth/config";
/** Google OAuth 2.0 for Calendar. Read-only by default (#35); event editing (#112) is asked for only when someone first
 *  creates, edits or deletes a Google event from Muse, and adds to what was already granted (incremental authorization). */
export const CALENDAR_READ = "https://www.googleapis.com/auth/calendar.readonly";
export const CALENDAR_WRITE = "https://www.googleapis.com/auth/calendar.events";
export const READ_SCOPES = ["openid", "email", CALENDAR_READ];
export const WRITE_SCOPES = [...READ_SCOPES, CALENDAR_WRITE];
/** The redirect uses Muse's one canonical origin (SITE_URL, or a Vercel preview's branch address), like sign-in does. */
export function googleConfig() {
  const id = process.env.GOOGLE_CLIENT_ID, secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret || !process.env.GOOGLE_TOKEN_KEY) return null;
  return { id, secret, redirect: `${authConfig().origin}/api/google/callback` };
}
/** Google lets people untick the Calendar box on the consent screen; without it there is nothing to read. */
export const grantsCalendarRead = (scope?: string) => (scope ?? "").split(" ").includes(CALENDAR_READ);
/** Editing needs calendar.events. Scopes are stored per connection, so this also answers "can Muse edit?" later. */
export const grantsCalendarWrite = (scopes?: string | string[]) => (Array.isArray(scopes) ? scopes : (scopes ?? "").split(" ")).includes(CALENDAR_WRITE);
export function authUrl(state: string, write = false) {
  const c = googleConfig(); if (!c) throw new Error("Google Calendar is not configured.");
  const q = new URLSearchParams({ client_id: c.id, redirect_uri: c.redirect, response_type: "code", scope: (write ? WRITE_SCOPES : READ_SCOPES).join(" "), access_type: "offline", prompt: "consent", include_granted_scopes: "true", state });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}
type TokenResponse = { access_token: string; expires_in: number; refresh_token?: string; scope?: string; id_token?: string };
async function token(body: Record<string, string>): Promise<TokenResponse> {
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(j.error === "invalid_grant" ? "Google access was revoked or expired. Reconnect to continue." : "Google sign-in failed.");
    // Google's short error code (e.g. invalid_client, invalid_grant) — safe to log; never the request body.
    Object.assign(e, { revoked: j.error === "invalid_grant", googleError: typeof j.error === "string" ? j.error.slice(0, 40) : `http_${r.status}` });
    throw e;
  }
  return j as TokenResponse;
}
export function exchangeCode(code: string) { const c = googleConfig()!; return token({ code, client_id: c.id, client_secret: c.secret, redirect_uri: c.redirect, grant_type: "authorization_code" }); }
export function refreshAccess(refreshToken: string) { const c = googleConfig()!; return token({ refresh_token: refreshToken, client_id: c.id, client_secret: c.secret, grant_type: "refresh_token" }); }
export async function revoke(tokenValue: string) { await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenValue)}`, { method: "POST" }).catch(() => {}); }
/** The id_token's sub and email (it came straight from Google's token endpoint over TLS, so its payload is trusted here). */
export function identity(idToken?: string) {
  try { const p = JSON.parse(Buffer.from((idToken ?? "").split(".")[1], "base64url").toString("utf8")); return { sub: String(p.sub ?? ""), email: String(p.email ?? "") }; } catch { return { sub: "", email: "" }; }
}
