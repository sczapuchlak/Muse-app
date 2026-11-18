import { NextResponse, type NextRequest } from "next/server";
import { privateResponse, routeAuthClient } from "@/lib/auth/http";
import { exportJson, exportMarkdown } from "@/lib/journal/export";
import { readJournalExport } from "@/lib/journal/server/export-read";

/** Everything in the signed-in person's Journal, as JSON (?format=json) or readable Markdown (?format=md). */
export async function GET(request: NextRequest) {
  const base = privateResponse(NextResponse.json({}));
  const client = routeAuthClient(request, base), { data } = await client.auth.getUser();
  if (!data.user) return privateResponse(NextResponse.json({ error: "Sign in to export your journal." }, { status: 401 }));
  try {
    const rows = await readJournalExport(client, data.user.id);
    const md = request.nextUrl.searchParams.get("format") === "md";
    const res = md ? new NextResponse(exportMarkdown(rows), { headers: { "Content-Type": "text/markdown; charset=utf-8" } }) : NextResponse.json(exportJson(rows));
    res.headers.set("Content-Disposition", `attachment; filename="muse-journal.${md ? "md" : "json"}"`);
    res.headers.set("X-Content-Type-Options", "nosniff");
    for (const c of base.cookies.getAll()) res.cookies.set(c);
    return privateResponse(res);
  } catch { return privateResponse(NextResponse.json({ error: "Your journal export couldn’t be prepared. Please try again." }, { status: 503 })); }
}

