
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/lib/auth/config";
import {
  privateResponse,
  routeAuthClient,
} from "@/lib/auth/http";
import { returnCookie, safeReturnPath } from "@/lib/auth/paths";

export async function GET(request: NextRequest) {
  const { origin } = authConfig();
  const code = request.nextUrl.searchParams.get("code");

  const destination = safeReturnPath(
    request.cookies.get(returnCookie)?.value
  );

  const response = NextResponse.redirect(
    new URL(destination, origin)
  );

  if (!code || request.nextUrl.searchParams.has("error")) {
    return privateResponse(
      NextResponse.redirect(
        new URL("/login?notice=oauth-error", origin)
      )
    );
  }

  const client = routeAuthClient(request, response);

  const { data, error } =
    await client.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    response.headers.set(
      "Location",
      new URL("/login?notice=oauth-error", origin).toString()
    );
    return privateResponse(response);
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    await client.auth.signOut();
    response.headers.set(
      "Location",
      new URL("/login?notice=oauth-error", origin).toString()
    );
    return privateResponse(response);
  }

  response.cookies.set(returnCookie, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
  });

  return privateResponse(response);
}
