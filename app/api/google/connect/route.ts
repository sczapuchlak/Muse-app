import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/lib/auth/config";
import { authUrl, googleConfig } from "@/lib/google/oauth";
import { carry, safeNext, signedInUser, STATE_COOKIE, toSettings } from "@/lib/google/http";

/** Starts Calendar authorization (separate from Google sign-in). Also used to reconnect. `?write=1` asks to add event
 *  editing to what was already granted (#112); `next` returns to the Muse page that asked. */
export async function GET(request: NextRequest) {
  const { base, user } = await signedInUser(request);
  if (!user) return carry(base, NextResponse.redirect(new URL("/login?next=/settings", authConfig().origin), 303));
  if (!googleConfig()) return toSettings(base, "unconfigured");
  const state = randomBytes(24).toString("base64url"), q = request.nextUrl.searchParams, write = q.get("write") === "1", next = safeNext(q.get("next")) ?? "";
  const response = carry(base, NextResponse.redirect(authUrl(state, write), 303));
  // Bound to this browser and this user, for ten minutes; the callback rejects anything else.
  response.cookies.set(STATE_COOKIE, `${state}.${user.id}|${write ? "w" : "r"}|${next}`, { httpOnly: true, sameSite: "lax", secure: authConfig().origin.startsWith("https:"), path: "/api/google", maxAge: 600 });
  return response;
}
