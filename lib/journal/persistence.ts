/**
 * Journal persistence from the browser (owner-only RLS). Edits a person makes are revision-checked so two devices
 * never silently overwrite each other; messages are append-only; drafts save without bumping the revision.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import {
  analysisFromRow, bookmarkFromRow, companionFromRow, companionToRow, conversationFromRow, conversationMetaToRow, journalFromRow, journalToRow, memoryFromRow, messageFromRow, messageImageFromRow, type MessageImage, preferencesFromRow, tagFromRow, versionFromRow,
  cleanTagName, type Analysis, type Bookmark, type HighlightTag, type TagCorrection, type Guide, type GuideSnapshot, type GuideState, guideFromRow, type Companion, type CompanionVersion, type Conversation, type EntryLink, type EntryTag, type Journal, type Memory, type Message, type Mode, type Preferences, type Report, type Tag, type TagKind, reportFromRow, type Correction,
} from "./model";
import { companionPresets, journalPresets } from "./presets";

type Client = SupabaseClient<Database>;
export const STALE = "This changed on another device. Reload to see the latest before saving again.";
/** Database errors become real Errors (message + code), so the UI can show the database's own plain words. */
const fail = (e: unknown): never => { const x = e as { message?: string; code?: string }; throw Object.assign(Error(x?.message ?? "Something went wrong."), { code: x?.code }); };
const must = <T,>(r: { data: T | null; error: unknown }): T => { if (r.error) fail(r.error); return r.data as T; };
const one = <T,>(r: { data: T | null; error: unknown }, stale = STALE): T => { if (r.error) fail(r.error); if (!r.data) throw Error(stale); return r.data as T; };

export type JournalState = {
  prefs: Preferences; journals: Journal[]; companions: Companion[]; conversations: Conversation[]; tags: Tag[]; entryTags: EntryTag[];
  bookmarks: Bookmark[]; memories: Memory[]; links: EntryLink[]; highlightTags: HighlightTag[]; corrections: TagCorrection[]; guides: Guide[];
};
/** Metadata only; messages load per entry. Personal archives stay small enough to filter on the device. */
export async function loadJournal(client: Client, userId: string): Promise<JournalState> {
  const [p, j, c, v, t, et, b, m, l, ht, tc, gd] = await Promise.all([
    client.from("journal_preferences").select("*").eq("user_id", userId).maybeSingle(),
    client.from("journal_journals").select("*").eq("user_id", userId).order("position").order("created_at").limit(500),
    client.from("journal_companions").select("*").eq("user_id", userId).order("position").order("created_at").limit(500),
    client.from("journal_conversations").select("*").eq("user_id", userId).order("local_date", { ascending: false }).order("started_at", { ascending: false }).limit(5000),
    client.from("journal_tags").select("*").eq("user_id", userId).order("name").limit(5000),
    client.from("journal_entry_tags").select("conversation_id,tag_id,source").eq("user_id", userId).limit(50000),
    client.from("journal_bookmarks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5000),
    client.from("journal_memories").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(2000),
    client.from("journal_links").select("conversation_id,kind,target_id,label").eq("user_id", userId).limit(10000),
    client.from("journal_highlight_tags").select("highlight_id,tag_id").eq("user_id", userId).limit(20000),
    client.from("journal_tag_corrections").select("id,kind,from_name,to_tag_id,times").eq("user_id", userId).order("updated_at", { ascending: false }).limit(2000),
    client.from("journal_guides").select("*").eq("user_id", userId).order("created_at").limit(500),
  ]);
  return {
    prefs: preferencesFromRow(must(p)), journals: must(j).map(journalFromRow), companions: must(c).map(companionFromRow), conversations: must(v).map(conversationFromRow),
    tags: must(t).map(tagFromRow), entryTags: must(et).map((x) => ({ conversationId: x.conversation_id, tagId: x.tag_id, source: x.source as EntryTag["source"] })),
    bookmarks: must(b).map(bookmarkFromRow), memories: must(m).map(memoryFromRow), links: must(l).map((x) => ({ conversationId: x.conversation_id, kind: x.kind as EntryLink["kind"], targetId: x.target_id, label: x.label })),
    // An environment without the highlight tags table yet still loads.
    highlightTags: (ht.error ? [] : ht.data ?? []).map((x) => ({ highlightId: x.highlight_id, tagId: x.tag_id })),
    corrections: (tc.error ? [] : tc.data ?? []).map((x) => ({ id: x.id, kind: x.kind as TagKind, fromName: x.from_name, toTagId: x.to_tag_id, times: x.times })),
    guides: (gd.error ? [] : gd.data ?? []).map(guideFromRow),
  };
}

/** Adds the chosen starter journals and companions (and links each journal to its companion). Nothing is added unless chosen. */
export async function addStarters(client: Client, userId: string, journalKeys: string[], companionKeys: string[], existing: { journals: Journal[]; companions: Companion[] }) {
  const needCompanions = new Set([...companionKeys, ...journalPresets.filter((j) => journalKeys.includes(j.key)).map((j) => j.companion)]);
  const have = new Map(existing.companions.filter((c) => c.presetKey).map((c) => [c.presetKey!, c]));
  const toMake = companionPresets.filter((p) => needCompanions.has(p.key) && !have.has(p.key));
  const made = toMake.length ? must(await client.from("journal_companions").insert(toMake.map((p, i) => ({ user_id: userId, name: p.name, description: p.description, icon: p.icon, tone: p.tone, instructions: p.instructions, conversation_prefs: p.conversationPrefs, opening_style: p.openingStyle, preset_key: p.key, position: existing.companions.length + i }))).select("*")).map(companionFromRow) : [];
  for (const c of made) have.set(c.presetKey!, c);
  const haveJ = new Set(existing.journals.map((j) => j.presetKey).filter(Boolean));
  const jMake = journalPresets.filter((p) => journalKeys.includes(p.key) && !haveJ.has(p.key));
  const journals = jMake.length ? must(await client.from("journal_journals").insert(jMake.map((p, i) => ({ user_id: userId, name: p.name, description: p.description, icon: p.icon, tone: p.tone, cover: p.cover, instructions: p.instructions, morning_instructions: p.morning, evening_instructions: p.evening, memory_scope: p.memoryScope, preset_key: p.key, default_companion_id: have.get(p.companion)?.id ?? null, position: existing.journals.length + i }))).select("*")).map(journalFromRow) : [];
  return { companions: made, journals };
}

export async function saveCompanion(client: Client, userId: string, c: Companion): Promise<Companion> {
  const row = companionToRow(c);
  return companionFromRow(one(c.revision === 0
    ? await client.from("journal_companions").insert({ ...row, id: c.id, user_id: userId }).select("*").single()
    : await client.from("journal_companions").update(row).eq("id", c.id).eq("user_id", userId).eq("revision", c.revision).select("*").maybeSingle()));
}
export async function deleteCompanion(client: Client, userId: string, id: string) { must(await client.from("journal_companions").delete().eq("id", id).eq("user_id", userId).select("id")); }
export async function companionVersions(client: Client, userId: string, companionId: string): Promise<CompanionVersion[]> {
  return must(await client.from("journal_companion_versions").select("*").eq("user_id", userId).eq("companion_id", companionId).order("version", { ascending: false }).limit(100)).map(versionFromRow);
}
export async function companionVersion(client: Client, userId: string, id: string): Promise<CompanionVersion | null> {
  const r = must(await client.from("journal_companion_versions").select("*").eq("user_id", userId).eq("id", id).maybeSingle());
  return r ? versionFromRow(r) : null;
}

export async function saveJournal(client: Client, userId: string, j: Journal): Promise<Journal> {
  const row = journalToRow(j);
  return journalFromRow(one(j.revision === 0
    ? await client.from("journal_journals").insert({ ...row, id: j.id, user_id: userId }).select("*").single()
    : await client.from("journal_journals").update(row).eq("id", j.id).eq("user_id", userId).eq("revision", j.revision).select("*").maybeSingle()));
}
export async function deleteJournal(client: Client, id: string, moveTo: string | null, deleteEntries: boolean) {
  return must(await client.rpc("delete_journal", { p_id: id, p_move_to: moveTo as string, p_delete_entries: deleteEntries }));
}

export async function savePreferences(client: Client, userId: string, p: Preferences): Promise<Preferences> {
  const row = { global_instructions: p.globalInstructions.slice(0, 20000), memory_enabled: p.memoryEnabled, analysis_auto: p.analysisAuto, on_this_day: p.onThisDay, show_on_daily: p.showOnDaily, greet_on_new: p.greetOnNew, default_journal_id: p.defaultJournalId };
  const r = p.revision === 0
    ? await client.from("journal_preferences").insert({ ...row, user_id: userId }).select("*").single()
    : await client.from("journal_preferences").update(row).eq("user_id", userId).eq("revision", p.revision).select("*").maybeSingle();
  if (r.error?.code === "23505") throw Error(STALE);
  return preferencesFromRow(one(r));
}

/** Starts a conversation, pinning the Companion's current saved version. */
export async function createConversation(client: Client, userId: string, o: { id: string; journalId: string; companion: Companion | null; mode: Mode; localDate: string; timeZone: string; status: "draft" | "active"; draft?: string; continues?: { id: string; title: string; date: string } | null; guide?: { id: string; snapshot: GuideSnapshot; state?: GuideState } | null }): Promise<Conversation> {
  let versionId: string | null = null;
  if (o.companion) { const v = await client.from("journal_companion_versions").select("id").eq("user_id", userId).eq("companion_id", o.companion.id).eq("version", o.companion.version).maybeSingle(); if (v.error) fail(v.error); versionId = v.data?.id ?? null; }
  return conversationFromRow(must(await client.from("journal_conversations").insert({
    id: o.id, user_id: userId, journal_id: o.journalId, companion_id: o.companion?.id ?? null, companion_version_id: versionId, companion_name: o.companion?.name ?? "", mode: o.mode,
    local_date: o.localDate, time_zone: o.timeZone, status: o.status, draft: o.draft ?? "", draft_updated_at: o.draft ? new Date().toISOString() : null,
    ...(o.continues ? { continues_id: o.continues.id, continues_title: o.continues.title.slice(0, 200), continues_date: o.continues.date } : {}),
    ...(o.guide ? { guide_id: o.guide.id, guide_snapshot: o.guide.snapshot as unknown as Json, guide_state: (o.guide.state ?? {}) as unknown as Json } : {}),
  }).select("*").single()));
}
/** Drafts save often and never conflict with metadata edits (they don't bump the revision). */
export async function saveDraft(client: Client, userId: string, id: string, text: string) {
  must(await client.from("journal_conversations").update({ draft: text.slice(0, 100000), draft_updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId).neq("status", "completed").select("id"));
}
export async function deleteConversation(client: Client, userId: string, id: string) {
  must(await client.from("journal_conversations").delete().eq("id", id).eq("user_id", userId).select("id"));
  // Its photos (entry photos and message photos) live in the entry's own private folder; clear it too. Best effort:
  // the entry is already gone, and a leftover file is unreachable without its row.
  try {
    const bucket = client.storage.from(IMAGE_BUCKET), folder = `${userId}/${id}`;
    const listed = await bucket.list(folder, { limit: 1000 });
    const names = (listed.data ?? []).map((f) => `${folder}/${f.name}`);
    if (names.length) await bucket.remove(names);
  } catch { /* storage unavailable: files stay private and unreferenced */ }
}
export const IMAGE_BUCKET = "constellation-images";
/** Links uploaded photos to the message they were sent with (after the message is saved). */
export async function addMessageImages(client: Client, userId: string, conversationId: string, messageId: string, images: Omit<MessageImage, "id" | "messageId">[]): Promise<MessageImage[]> {
  if (!images.length) return [];
  const rows = images.map((i) => ({ user_id: userId, conversation_id: conversationId, message_id: messageId, position: i.position, path: i.path, thumbnail_path: i.thumbnailPath, width: i.width, height: i.height, mime: i.mime }));
  // Rows are never updated (no update permission at all), so this is a plain insert; a message's photos are linked once.
  return must(await client.from("journal_message_images").insert(rows).select("*")).map(messageImageFromRow);
}
export async function updateMeta(client: Client, userId: string, c: Conversation): Promise<Conversation> {
  return conversationFromRow(one(await client.from("journal_conversations").update(conversationMetaToRow(c)).eq("id", c.id).eq("user_id", userId).eq("revision", c.revision).select("*").maybeSingle()));
}
export async function completeConversation(client: Client, userId: string, c: Conversation, analysisPending: boolean): Promise<Conversation> {
  return conversationFromRow(one(await client.from("journal_conversations").update({ status: "completed", completed_at: new Date().toISOString(), draft: "", analysis_status: analysisPending ? "pending" : "skipped" })
    .eq("id", c.id).eq("user_id", userId).neq("status", "completed").select("*").maybeSingle(), "This entry was already finished on another device."));
}
export async function refreshConversation(client: Client, userId: string, id: string): Promise<Conversation | null> {
  const r = must(await client.from("journal_conversations").select("*").eq("id", id).eq("user_id", userId).maybeSingle());
  return r ? conversationFromRow(r) : null;
}

export async function loadMessages(client: Client, userId: string, conversationId: string): Promise<{ messages: Message[]; corrections: Correction[] }> {
  const [m, c, im] = await Promise.all([
    client.from("journal_messages").select("*").eq("user_id", userId).eq("conversation_id", conversationId).order("created_at").limit(5000),
    client.from("journal_message_corrections").select("id,message_id,previous_body,corrected_at,journal_messages!inner(conversation_id)").eq("user_id", userId).eq("journal_messages.conversation_id", conversationId).order("corrected_at"),
    client.from("journal_message_images").select("*").eq("user_id", userId).eq("conversation_id", conversationId).order("position"),
  ]);
  // A database without the photos table yet (an older environment) still loads the conversation.
  const images = (im.error ? [] : im.data ?? []).map(messageImageFromRow);
  return { messages: must(m).map(messageFromRow).map((x) => { const mine = images.filter((i) => i.messageId === x.id); return mine.length ? { ...x, images: mine } : x; }), corrections: must(c).map((x) => ({ id: x.id, messageId: x.message_id, previousBody: x.previous_body, correctedAt: x.corrected_at })) };
}
/** Saves one of your messages. The id comes from the device, so a retried save never makes a second copy. */
export async function addMessage(client: Client, userId: string, o: { id: string; conversationId: string; body: string; localDate: string; guideQuestionId?: string | null; guideQuestion?: string | null }): Promise<Message> {
  const r = await client.from("journal_messages").insert({ id: o.id, user_id: userId, conversation_id: o.conversationId, role: "user", body: o.body, local_date: o.localDate, ...(o.guideQuestionId ? { guide_question_id: o.guideQuestionId.slice(0, 64), guide_question: (o.guideQuestion ?? "").slice(0, 500) } : {}) }).select("*").single();
  if (r.error?.code === "23505") return messageFromRow(must(await client.from("journal_messages").select("*").eq("id", o.id).eq("user_id", userId).single()));
  return messageFromRow(must(r));
}
export async function deleteMessage(client: Client, userId: string, id: string) { must(await client.from("journal_messages").delete().eq("id", id).eq("user_id", userId).select("id")); }
export async function correctMessage(client: Client, id: string, body: string): Promise<Message> {
  const r = must(await client.rpc("correct_journal_message", { p_id: id, p_body: body })) as Database["public"]["Tables"]["journal_messages"]["Row"][];
  if (!r[0]) throw Error("That message isn’t available.");
  return messageFromRow(r[0]);
}

export async function createTag(client: Client, userId: string, kind: TagKind, name: string): Promise<Tag> {
  const clean = cleanTagName(name);
  const r = await client.from("journal_tags").insert({ user_id: userId, kind, name: clean }).select("*").single();
  if (r.error?.code === "23505") return tagFromRow(must(await client.from("journal_tags").select("*").eq("user_id", userId).eq("kind", kind).eq("normalized", clean.toLowerCase()).single()));
  return tagFromRow(must(r));
}
export async function saveTag(client: Client, userId: string, t: Tag): Promise<Tag> {
  const r = await client.from("journal_tags").update({ name: cleanTagName(t.name), aliases: t.aliases.map(cleanTagName).filter(Boolean).slice(0, 20), note: t.note.slice(0, 600) }).eq("id", t.id).eq("user_id", userId).eq("revision", t.revision).select("*").maybeSingle();
  if (r.error?.code === "23505") throw Error(`There’s already a ${t.kind} called “${t.name}”. Merge them instead.`);
  return tagFromRow(one(r));
}
/** Moves a tag to another category (a "person" that was really a topic). Refuses when that category already has the
 *  name, so two tags are never silently fused: merge them instead. */
export async function setTagKind(client: Client, userId: string, t: Tag, kind: TagKind): Promise<Tag> {
  const r = await client.from("journal_tags").update({ kind }).eq("id", t.id).eq("user_id", userId).select("*").maybeSingle();
  if (r.error?.code === "23505") throw Error(`There’s already a ${kind === "custom" ? "tag" : kind} called “${t.name}”. Merge them instead.`);
  return tagFromRow(one(r));
}
/** Removes a tag from every entry and highlight, and keeps its name so AI never suggests it again. Entries untouched. */
export async function suppressTag(client: Client, userId: string, id: string): Promise<Tag> {
  must(await client.from("journal_entry_tags").delete().eq("user_id", userId).eq("tag_id", id).select("tag_id"));
  must(await client.from("journal_highlight_tags").delete().eq("user_id", userId).eq("tag_id", id).select("tag_id"));
  return tagFromRow(one(await client.from("journal_tags").update({ suppressed: true }).eq("id", id).eq("user_id", userId).select("*").maybeSingle()));
}
export async function restoreTag(client: Client, userId: string, id: string): Promise<Tag> {
  return tagFromRow(one(await client.from("journal_tags").update({ suppressed: false }).eq("id", id).eq("user_id", userId).select("*").maybeSingle()));
}
/** Remembers a correction ("Maya" was Nia here) as guidance for future analysis; counts repeats. */
export async function recordCorrection(client: Client, userId: string, kind: TagKind, fromName: string, toTagId: string): Promise<TagCorrection> {
  const from = cleanTagName(fromName);
  const found = await client.from("journal_tag_corrections").select("*").eq("user_id", userId).eq("kind", kind).eq("from_normalized", from.toLowerCase()).eq("to_tag_id", toTagId).maybeSingle();
  const row = found.data
    ? one(await client.from("journal_tag_corrections").update({ times: found.data.times + 1, updated_at: new Date().toISOString() }).eq("id", found.data.id).eq("user_id", userId).select("*").maybeSingle())
    : must(await client.from("journal_tag_corrections").insert({ user_id: userId, kind, from_name: from, to_tag_id: toTagId }).select("*").single());
  const r = row as unknown as Database["public"]["Tables"]["journal_tag_corrections"]["Row"];
  return { id: r.id, kind: r.kind as TagKind, fromName: r.from_name, toTagId: r.to_tag_id, times: r.times };
}
export async function deleteCorrection(client: Client, userId: string, id: string) { must(await client.from("journal_tag_corrections").delete().eq("id", id).eq("user_id", userId).select("id")); }
/** Guides: plain records, no AI. A change to the questions, intro, mode or companion setting is a new version; past
 *  entries keep the copy they began with. */
export async function saveGuide(client: Client, userId: string, g: Guide, isNew: boolean, newVersion: boolean): Promise<Guide> {
  const row = { name: g.name.trim().slice(0, 80) || "Guide", description: g.description.slice(0, 400), icon: g.icon.slice(0, 16), intro: g.intro.slice(0, 2000), mode: g.mode, companion: g.companion, questions: g.questions.filter((q) => q.text.trim()).slice(0, 30).map((q) => ({ id: q.id, text: q.text.trim().slice(0, 500), optional: q.optional })) as unknown as Json, archived_at: g.archivedAt };
  if (isNew) return guideFromRow(must(await client.from("journal_guides").insert({ id: g.id, user_id: userId, ...row }).select("*").single()));
  return guideFromRow(one(await client.from("journal_guides").update({ ...row, ...(newVersion ? { version: g.version + 1 } : {}) }).eq("id", g.id).eq("user_id", userId).eq("revision", g.revision).select("*").maybeSingle()));
}
export async function deleteGuide(client: Client, userId: string, id: string) { must(await client.from("journal_guides").delete().eq("id", id).eq("user_id", userId).select("id")); }
/** Answers in progress, saved like a draft (no revision bump). */
export async function saveGuideState(client: Client, userId: string, conversationId: string, state: GuideState) {
  must(await client.from("journal_conversations").update({ guide_state: state as unknown as Json }).eq("id", conversationId).eq("user_id", userId).neq("status", "completed").select("id"));
}
export async function deleteTag(client: Client, userId: string, id: string) { must(await client.from("journal_tags").delete().eq("id", id).eq("user_id", userId).select("id")); }
export async function mergeTags(client: Client, from: string, into: string): Promise<Tag> {
  const r = must(await client.rpc("merge_journal_tags", { p_from: from, p_into: into })) as Database["public"]["Tables"]["journal_tags"]["Row"][];
  return tagFromRow(r[0]);
}
export async function tagEntry(client: Client, userId: string, conversationId: string, tagId: string) {
  must(await client.from("journal_entry_tags").upsert({ user_id: userId, conversation_id: conversationId, tag_id: tagId, source: "user" }, { onConflict: "user_id,conversation_id,tag_id" }).select("tag_id"));
}
export async function untagEntry(client: Client, userId: string, conversationId: string, tagId: string) {
  must(await client.from("journal_entry_tags").delete().eq("user_id", userId).eq("conversation_id", conversationId).eq("tag_id", tagId).select("tag_id"));
}

export async function addBookmark(client: Client, userId: string, b: Omit<Bookmark, "id" | "createdAt" | "updatedAt" | "start" | "end"> & { start?: number | null; end?: number | null }): Promise<Bookmark> {
  const excerpt = b.excerpt.slice(0, 4000), located = b.start != null && b.end != null && b.end - b.start === excerpt.length;
  return bookmarkFromRow(must(await client.from("journal_bookmarks").insert({ user_id: userId, conversation_id: b.conversationId, message_id: b.messageId, excerpt, note: b.note.slice(0, 2000), start_offset: located ? b.start : null, end_offset: located ? b.end : null }).select("*").single()));
}
export async function tagHighlight(client: Client, userId: string, highlightId: string, tagId: string) { must(await client.from("journal_highlight_tags").insert({ user_id: userId, highlight_id: highlightId, tag_id: tagId }).select("highlight_id")); }
export async function untagHighlight(client: Client, userId: string, highlightId: string, tagId: string) { must(await client.from("journal_highlight_tags").delete().eq("user_id", userId).eq("highlight_id", highlightId).eq("tag_id", tagId).select("highlight_id")); }
export async function saveBookmarkNote(client: Client, userId: string, id: string, note: string) { must(await client.from("journal_bookmarks").update({ note: note.slice(0, 2000) }).eq("id", id).eq("user_id", userId).select("id")); }
export async function deleteBookmark(client: Client, userId: string, id: string) { must(await client.from("journal_bookmarks").delete().eq("id", id).eq("user_id", userId).select("id")); }

export async function saveMemory(client: Client, userId: string, m: Memory): Promise<Memory> {
  const row = { body: m.body.trim().slice(0, 1000), kind: m.kind, status: m.status, source: m.source, journal_id: m.journalId, source_conversation_id: m.sourceConversationId, pinned: m.pinned ?? false };
  return memoryFromRow(one(m.revision === 0
    ? await client.from("journal_memories").insert({ ...row, id: m.id, user_id: userId }).select("*").single()
    : await client.from("journal_memories").update(row).eq("id", m.id).eq("user_id", userId).eq("revision", m.revision).select("*").maybeSingle()));
}
export async function deleteMemory(client: Client, userId: string, id: string) { must(await client.from("journal_memories").delete().eq("id", id).eq("user_id", userId).select("id")); }

export async function addLink(client: Client, userId: string, l: EntryLink) {
  must(await client.from("journal_links").upsert({ user_id: userId, conversation_id: l.conversationId, kind: l.kind, target_id: l.targetId, label: l.label.slice(0, 200) }, { onConflict: "user_id,conversation_id,kind,target_id" }).select("target_id"));
}
export async function removeLink(client: Client, userId: string, l: Pick<EntryLink, "conversationId" | "kind" | "targetId">) {
  must(await client.from("journal_links").delete().eq("user_id", userId).eq("conversation_id", l.conversationId).eq("kind", l.kind).eq("target_id", l.targetId).select("target_id"));
}

export async function loadAnalysis(client: Client, userId: string, conversationId: string): Promise<Analysis | null> {
  const r = must(await client.from("journal_analyses").select("*").eq("user_id", userId).eq("conversation_id", conversationId).maybeSingle());
  return r ? analysisFromRow(r) : null;
}
export async function dismissInAnalysis(client: Client, userId: string, a: Analysis, key: string): Promise<Analysis> {
  return analysisFromRow(one(await client.from("journal_analyses").update({ dismissed: [...new Set([...a.dismissed, key])].slice(-200) }).eq("id", a.id).eq("user_id", userId).eq("revision", a.revision).select("*").maybeSingle()));
}
export async function loadReport(client: Client, userId: string, weekStart: string): Promise<Report | null> {
  const r = must(await client.from("journal_reports").select("*").eq("user_id", userId).eq("week_start", weekStart).maybeSingle());
  return r ? reportFromRow(r) : null;
}

export async function searchJournal(client: Client, query: string): Promise<{ conversationId: string; rank: number; snippet: string }[]> {
  if (!query.trim()) return [];
  return (must(await client.rpc("search_journal", { p_query: query, p_limit: 120 })) as { conversation_id: string; rank: number; snippet: string }[]).map((r) => ({ conversationId: r.conversation_id, rank: r.rank, snippet: r.snippet ?? "" }));
}
export async function journalDays(client: Client, from: string): Promise<{ date: string; messages: number }[]> {
  return (must(await client.rpc("journal_days", { p_from: from })) as { local_date: string; messages: number }[]).map((d) => ({ date: d.local_date, messages: d.messages }));
}
export async function keepTest(client: Client, o: { key: string; journalId: string; companionId: string | null; companionName: string; messages: { role: "user" | "assistant"; body: string }[]; localDate: string; timeZone: string }): Promise<Conversation> {
  const r = must(await client.rpc("keep_journal_test", { p_key: o.key, p_journal_id: o.journalId, p_companion_id: o.companionId as string, p_companion_name: o.companionName, p_messages: o.messages as unknown as Json, p_local_date: o.localDate, p_time_zone: o.timeZone })) as Database["public"]["Tables"]["journal_conversations"]["Row"][];
  return conversationFromRow(r[0]);
}

/**
 * First-run setup (daily-experience brief): one personal journal and one companion, which becomes that journal's
 * default. The companion starts from a starter's words, optionally rewritten. Existing journals are never touched.
 */
export async function setupJournal(client: Client, userId: string, o: { journalName: string; presetKey: string; instructions?: string; prefs: Preferences }): Promise<{ journal: Journal; companion: Companion }> {
  const p = companionPresets.find((x) => x.key === o.presetKey) ?? companionPresets[0];
  const existing = must(await client.from("journal_companions").select("*").eq("user_id", userId).eq("preset_key", p.key).limit(1).maybeSingle());
  let companion = existing ? companionFromRow(existing) : companionFromRow(must(await client.from("journal_companions").insert({ user_id: userId, name: p.name, description: p.description, icon: p.icon, tone: p.tone, instructions: p.instructions, conversation_prefs: p.conversationPrefs, opening_style: p.openingStyle, preset_key: p.key, position: 0 }).select("*").single()));
  if (o.instructions !== undefined && o.instructions.trim() && o.instructions !== companion.instructions) companion = await saveCompanion(client, userId, { ...companion, instructions: o.instructions });
  const everyday = journalPresets[0];
  const journal = journalFromRow(must(await client.from("journal_journals").insert({ user_id: userId, name: o.journalName.trim().slice(0, 80) || "My Journal", description: everyday.description, icon: everyday.icon, tone: everyday.tone, cover: everyday.cover, memory_scope: "shared", preset_key: everyday.key, default_companion_id: companion.id, position: 0 }).select("*").single()));
  await savePreferences(client, userId, { ...o.prefs, defaultJournalId: journal.id });
  return { journal, companion };
}

/**
 * Switch the companion of an unfinished conversation. Earlier replies keep the version that wrote them (each assistant
 * message stores its own companion_version_id); the next reply uses this companion's current saved version.
 */
export async function switchCompanion(client: Client, userId: string, c: Conversation, companion: Companion): Promise<Conversation> {
  const v = await client.from("journal_companion_versions").select("id").eq("user_id", userId).eq("companion_id", companion.id).eq("version", companion.version).maybeSingle();
  if (v.error) fail(v.error);
  return conversationFromRow(one(await client.from("journal_conversations").update({ companion_id: companion.id, companion_version_id: v.data?.id ?? null, companion_name: companion.name.slice(0, 80) })
    .eq("id", c.id).eq("user_id", userId).neq("status", "completed").select("*").maybeSingle(), "This entry was finished on another device."));
}

/** Names of the companion versions that wrote a set of replies (so a switched conversation labels each reply truly). */
export async function versionsByIds(client: Client, userId: string, ids: string[]): Promise<Map<string, { companionId: string; name: string; version: number }>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const rows = must(await client.from("journal_companion_versions").select("id,companion_id,name,version").eq("user_id", userId).in("id", unique));
  return new Map(rows.map((r) => [r.id, { companionId: r.companion_id, name: r.name, version: r.version }]));
}
