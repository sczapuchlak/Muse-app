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
/** Back to Settings with a short outcome code the page explains. */
export function toSettings(base: NextResponse, outcome: string) {
  const url = new URL("/settings", authConfig().origin);
  url.searchParams.set("google", outcome); url.hash = "google-calendar";
  return carry(base, NextResponse.redirect(url, 303));
}
