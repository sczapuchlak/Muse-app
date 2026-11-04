
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/lib/auth/config";
import {
  privateResponse,
  routeAuthClient,
  trustedOrigin,
} from "@/lib/auth/http";
import { returnCookie, safeReturnPath } from "@/lib/auth/paths";

export async function POST(request: NextRequest) {
  const { origin } = authConfig();

  if (!trustedOrigin(request)) {
    return privateResponse(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );
  }

  const form = await request.formData();
  const next = safeReturnPath(form.get("next"));

  const response = NextResponse.redirect(
    new URL("/login?notice=oauth-error", origin),
    303
  );

  const client = routeAuthClient(request, response);

  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/oauth/callback`,
    },
  });

  if (error || !data.url) {
    return privateResponse(response);
  }

  response.cookies.set(returnCookie, next, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https:"),
    maxAge: 600,
  });

  response.headers.set("Location", data.url);

  return privateResponse(response);
}
