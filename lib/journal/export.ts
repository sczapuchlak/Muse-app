/**
 * Journal export (Journal V1 §23): a complete structured JSON record and a human-readable Markdown book, so nothing
 * written here is ever trapped in Muse. Pure functions over rows read with the person's own client.
 */
export type ExportRows = {
  journals: { id: string; name: string; description: string; memory_scope: string; archived_at: string | null }[];
  companions: Record<string, unknown>[]; companionVersions: Record<string, unknown>[]; preferences: Record<string, unknown> | null;
  conversations: { id: string; journal_id: string; companion_name: string; companion_version_id: string | null; mode: string; status: string; local_date: string; time_zone: string; started_at: string; completed_at: string | null; title: string; title_source: string | null; summary: string; summary_source: string | null; favorite: boolean; exclude_from_memory: boolean; images: unknown; origin: string }[];
  messages: { id: string; conversation_id: string; role: string; body: string; created_at: string; corrected_at: string | null }[];
  corrections: { message_id: string; previous_body: string; corrected_at: string }[];
  tags: { id: string; kind: string; name: string; aliases: string[] }[]; entryTags: { conversation_id: string; tag_id: string; source: string }[];
  analyses: Record<string, unknown>[]; bookmarks: { conversation_id: string; message_id: string | null; excerpt: string; note: string; created_at: string }[];
  memories: Record<string, unknown>[]; reports: Record<string, unknown>[]; links: Record<string, unknown>[];
};

export function exportJson(rows: ExportRows) {
  return {
    format: "Muse Journal", version: 1, exported_at: new Date().toISOString(),
    notes: "Messages are your original words in order; `corrections` keeps wording you later corrected. Titles and summaries say whether you or the AI wrote them (title_source, summary_source; `import` means the journal it was imported from wrote it). Photos are referenced by private storage path; download them from each entry.",
    ...rows,
  };
}

export function exportMarkdown(rows: ExportRows): string {
  const journals = new Map(rows.journals.map((j) => [j.id, j.name]));
  const tags = new Map(rows.tags.map((t) => [t.id, t]));
  const byConv = new Map<string, ExportRows["messages"]>();
  for (const m of rows.messages) byConv.set(m.conversation_id, [...(byConv.get(m.conversation_id) ?? []), m]);
  const out: string[] = ["# My Muse Journal", "", `Exported ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}.`, ""];
  const list = [...rows.conversations].filter((c) => byConv.get(c.id)?.some((m) => m.role === "user")).sort((a, b) => a.local_date.localeCompare(b.local_date) || a.started_at.localeCompare(b.started_at));
  let month = "";
  for (const c of list) {
    const m = c.local_date.slice(0, 7);
    if (m !== month) { month = m; out.push(`## ${new Date(`${c.local_date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}`, ""); }
    const date = new Date(`${c.local_date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
    out.push(`### ${c.title || "Untitled"}${c.favorite ? " ★" : ""}`, "", `*${date} · ${journals.get(c.journal_id) ?? "Journal"}${c.companion_name ? ` · with ${c.companion_name}` : ""}${c.mode !== "open" ? ` · ${c.mode === "morning" ? "Morning intention" : "Evening reflection"}` : ""}*`, "");
    const t = rows.entryTags.filter((x) => x.conversation_id === c.id).map((x) => tags.get(x.tag_id)).filter(Boolean) as ExportRows["tags"];
    if (t.length) out.push(`Tags: ${t.map((x) => `${x.name} (${x.kind})`).join(", ")}`, "");
    if (c.summary) out.push(`> ${c.summary.replace(/\n/g, "\n> ")}`, `> — ${c.summary_source === "ai" ? "AI summary" : c.summary_source === "import" ? "summary from the journal it was imported from" : "my summary"}`, "");
    for (const msg of byConv.get(c.id) ?? []) {
      const time = new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: c.time_zone || "UTC" });
      out.push(`**${msg.role === "user" ? "Me" : c.companion_name || "Companion"}** · ${time}${msg.corrected_at ? " · corrected" : ""}`, "", msg.body, "");
    }
    for (const b of rows.bookmarks.filter((x) => x.conversation_id === c.id)) out.push(`❦ Bookmarked: “${b.excerpt}”${b.note ? ` — ${b.note}` : ""}`, "");
    out.push("---", "");
  }
  return out.join("\n");
}
