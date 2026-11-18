import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { ExportRows } from "../export";

/** Reads every Journal record of one person (their own client, RLS) for export. */
export async function readJournalExport(client: SupabaseClient<Database>, userId: string): Promise<ExportRows> {
  const q = <T,>(r: { data: T | null; error: unknown }): T => { if (r.error) throw r.error; return (r.data ?? []) as T; };
  const [journals, companions, companionVersions, preferences, conversations, messages, corrections, tags, entryTags, analyses, bookmarks, memories, reports, links] = await Promise.all([
    client.from("journal_journals").select("*").eq("user_id", userId),
    client.from("journal_companions").select("*").eq("user_id", userId),
    client.from("journal_companion_versions").select("*").eq("user_id", userId),
    client.from("journal_preferences").select("*").eq("user_id", userId).maybeSingle(),
    client.from("journal_conversations").select("*").eq("user_id", userId).limit(20000),
    client.from("journal_messages").select("id,conversation_id,role,body,local_date,reply_to,model,created_at,corrected_at").eq("user_id", userId).order("created_at").limit(200000),
    client.from("journal_message_corrections").select("*").eq("user_id", userId),
    client.from("journal_tags").select("*").eq("user_id", userId),
    client.from("journal_entry_tags").select("*").eq("user_id", userId),
    client.from("journal_analyses").select("*").eq("user_id", userId),
    client.from("journal_bookmarks").select("*").eq("user_id", userId),
    client.from("journal_memories").select("*").eq("user_id", userId),
    client.from("journal_reports").select("*").eq("user_id", userId),
    client.from("journal_links").select("*").eq("user_id", userId),
  ]);
  return {
    journals: q(journals), companions: q(companions), companionVersions: q(companionVersions), preferences: preferences.error ? null : preferences.data as Record<string, unknown> | null,
    conversations: q(conversations).map((c) => ({ ...c, search: undefined, draft: undefined })) as ExportRows["conversations"], messages: q(messages), corrections: q(corrections), tags: q(tags), entryTags: q(entryTags),
    analyses: q(analyses), bookmarks: q(bookmarks), memories: q(memories), reports: q(reports), links: q(links),
  } as ExportRows;
}
