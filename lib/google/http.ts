import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/lib/auth/config";
import { privateResponse, routeAuthClient } from "@/lib/auth/http";

export const STATE_COOKIE = "muse-google-state";
/** Copies any refreshed Supabase session cookies from the auth check onto the real response. */
export function carry<T extends NextResponse>(from: NextResponse, to: T): T {
  for (const c of from.cookies.getAll()) to.cookies.set(c);
  return privateResponse(to);
}
export async function signedInUser(request: NextRequest) {
  const base = privateResponse(NextResponse.json({}));
  const { data, error } = await routeAuthClient(request, base).auth.getUser();
  return { base, user: error ? null : data.user };
}
/** Back to Settings (or, after "Allow editing", the Muse page it started from) with a short outcome code. */
export function toSettings(base: NextResponse, outcome: string, next?: string | null) {
  const url = new URL(safeNext(next) ?? "/settings", authConfig().origin);
  url.searchParams.set("google", outcome); if (!safeNext(next)) url.hash = "google-calendar";
  return carry(base, NextResponse.redirect(url, 303));
}
/** Only Muse's own Planner and Settings pages are valid return paths (never another site). */
export function safeNext(next?: string | null) { return next && /^\/(planner|settings)(\?[\w=&%.-]*)?$/.test(next) ? next : null; }
