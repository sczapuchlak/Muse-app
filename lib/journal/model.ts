/**
 * Muse Journal V1 records as the app uses them, and the row mappers for journal_* tables. Pure: no I/O.
 * Ownership and invariants are documented in supabase/migrations/20261228000100_journal.sql.
 */
import type { Database, Json } from "@/lib/database.types";
import type { MuseTone } from "@/components/design/MuseHeading";

type Tables = Database["public"]["Tables"];
export type MemoryScope = "shared" | "journal" | "off";
export type Mode = "open" | "morning" | "evening";
export type Status = "draft" | "active" | "completed";
/** `custom` is "My tags": made by you, never by AI analysis. The others are found by analysis (and editable). */
export type TagKind = "person" | "place" | "topic" | "theme" | "mood" | "custom";
export type Source = "user" | "ai";

export type Companion = { id: string; name: string; description: string; icon: string; tone: MuseTone; instructions: string; conversationPrefs: string; openingStyle: string; presetKey: string | null; preferredJournalId: string | null; version: number; position: number; archivedAt: string | null; revision: number; createdAt: string; updatedAt: string };
export type CompanionVersion = { id: string; companionId: string; version: number; name: string; description: string; instructions: string; conversationPrefs: string; openingStyle: string; savedAt: string };
export type Journal = { id: string; name: string; description: string; icon: string; tone: MuseTone; cover: string; defaultCompanionId: string | null; defaultGuideId: string | null; instructions: string; morningInstructions: string; eveningInstructions: string; memoryScope: MemoryScope; presetKey: string | null; position: number; archivedAt: string | null; revision: number; createdAt: string };
export type Preferences = { globalInstructions: string; memoryEnabled: boolean; analysisAuto: boolean; onThisDay: boolean; showOnDaily: boolean; greetOnNew: boolean; defaultJournalId: string | null; revision: number };
export type JournalImage = { id: string; path: string; thumbnailPath: string; width: number; height: number; caption: string; alt: string };
export type Conversation = {
  id: string; journalId: string; companionId: string | null; companionVersionId: string | null; companionName: string; origin: "journal" | "playground"; mode: Mode; status: Status;
  localDate: string; timeZone: string; startedAt: string; completedAt: string | null; title: string; titleSource: Source | null; summary: string; summarySource: Source | null;
  favorite: boolean; excludeFromMemory: boolean; memoryOff: boolean; analysisStatus: "pending" | "ready" | "failed" | "skipped" | null; images: JournalImage[];
  draft: string; draftUpdatedAt: string | null; userWords: number; messageCount: number; lastMessageAt: string | null; revision: number; updatedAt: string;
  /** "Continue from here": the earlier entry this one continues (null if none, or if that entry was deleted), with a
   *  snapshot of its title and date so the link stays readable. */
  continuesId: string | null; continuesTitle: string; continuesDate: string | null;
  /** Guided entry: the guide as it was when the entry began (never rewritten), and answers in progress. */
  guideId: string | null; guideSnapshot: GuideSnapshot | null; guideState: GuideState;
};
/** A guided experience: optional, reusable questions. Not a companion, not a journal. */
export type GuideQuestion = { id: string; text: string; optional: boolean };
export type Guide = { id: string; name: string; description: string; icon: string; intro: string; mode: "steps" | "all"; companion: boolean; questions: GuideQuestion[]; version: number; archivedAt: string | null; revision: number; createdAt: string };
export type GuideSnapshot = Pick<Guide, "name" | "icon" | "intro" | "mode" | "companion" | "questions" | "version">;
/** Answers not yet sent as messages, keyed by question id, plus where you are. */
export type GuideState = { answers?: Record<string, string>; step?: number; sent?: string[] };
export const snapshotOf = (g: Guide): GuideSnapshot => ({ name: g.name, icon: g.icon, intro: g.intro, mode: g.mode, companion: g.companion, questions: g.questions.map((q) => ({ ...q })), version: g.version });
export type Message = { id: string; conversationId: string; role: "user" | "assistant"; body: string; localDate: string; replyTo: string | null; companionVersionId: string | null; model: string | null; correctedAt: string | null; createdAt: string; images?: MessageImage[]; guideQuestionId?: string | null; guideQuestion?: string | null };
/** A photo attached to one of your messages (up to 7). Sent to the AI only with the request answering that message. */
export type MessageImage = { id: string; messageId: string; position: number; path: string; thumbnailPath: string; width: number; height: number; mime: string };
export const MAX_MESSAGE_IMAGES = 7;
export type Correction = { id: string; messageId: string; previousBody: string; correctedAt: string };
export type Tag = { id: string; kind: TagKind; name: string; normalized: string; aliases: string[]; note: string; revision: number;
  /** Removed everywhere and never suggested by AI again; hidden from every tag view, restorable in Manage Tags. */ suppressed: boolean };
/** A correction you made on one entry ("Maya" was really Nia here), kept only as guidance for future analysis. */
export type TagCorrection = { id: string; kind: TagKind; fromName: string; toTagId: string; times: number };
export type EntryTag = { conversationId: string; tagId: string; source: Source };
/** A highlight: a passage you kept from one message (stored in journal_bookmarks). `start`/`end` locate it in the
 *  message while the message still reads exactly that way; the quote itself is always kept as captured. */
export type Bookmark = { id: string; conversationId: string; messageId: string | null; excerpt: string; note: string; createdAt: string; start: number | null; end: number | null; updatedAt: string };
export type HighlightTag = { highlightId: string; tagId: string };
/** Where a highlight sits in a message's current text, or null when it can't be placed for certain (the message was
 *  corrected and the words now appear zero or several times). Never guesses. */
export function anchorHighlight(body: string, h: Pick<Bookmark, "excerpt" | "start" | "end">): { start: number; end: number } | null {
  if (!h.excerpt) return null;
  if (h.start != null && h.end != null && body.slice(h.start, h.end) === h.excerpt) return { start: h.start, end: h.end };
  const i = body.indexOf(h.excerpt);
  if (i < 0 || body.indexOf(h.excerpt, i + 1) >= 0) return null;
  return { start: i, end: i + h.excerpt.length };
}
/** Overlapping or touching highlights paint as one continuous mark; each stays its own saved highlight. */
export function mergeRanges(ranges: { start: number; end: number; id: string }[]): { start: number; end: number; ids: string[] }[] {
  const out: { start: number; end: number; ids: string[] }[] = [];
  for (const r of [...ranges].sort((a, b) => a.start - b.start || a.end - b.end)) {
    const last = out[out.length - 1];
    if (last && r.start <= last.end) { last.end = Math.max(last.end, r.end); last.ids.push(r.id); } else out.push({ start: r.start, end: r.end, ids: [r.id] });
  }
  return out;
}
export type Memory = { id: string; body: string; kind: "fact" | "person" | "situation" | "preference" | "other"; status: "confirmed" | "suggested"; source: Source; journalId: string | null; sourceConversationId: string | null; revision: number; createdAt: string; updatedAt: string };
export type LinkKind = "chapter" | "experience" | "area";
export type EntryLink = { conversationId: string; kind: LinkKind; targetId: string; label: string };

/** The structured result of one post-conversation analysis (validated in ./analysis before it is stored). */
export type AnalysisData = {
  title: string; recap: string; themes: string[]; observations: string[]; threads: string[]; emotions: string[];
  /** A closer look: a few grounded paragraphs (older analyses have none). */ reflection: string;
  /** A deeper perspective on the situation (the dynamic, a reframe, or usable advice), 1–3 sentences. */ insight: string;
  people: string[]; places: string[]; topics: string[]; memories: string[];
};
export type Analysis = { id: string; conversationId: string; status: "ready" | "failed"; data: AnalysisData | null; dismissed: string[]; model: string | null; error: string | null; revision: number; createdAt: string; updatedAt: string };
export type ReportData = { narrative: string; threads: string[]; moments: string[]; observations: string[] };
export type Report = { id: string; weekStart: string; data: ReportData; sourceIds: string[]; sourceSignature: string; model: string | null; updatedAt: string };

const tone = (n: number): MuseTone => (n >= 1 && n <= 8 ? n : 1) as MuseTone;

export const companionFromRow = (r: Tables["journal_companions"]["Row"]): Companion => ({
  id: r.id, name: r.name, description: r.description, icon: r.icon, tone: tone(r.tone), instructions: r.instructions, conversationPrefs: r.conversation_prefs, openingStyle: r.opening_style,
  presetKey: r.preset_key, preferredJournalId: r.preferred_journal_id, version: r.version, position: r.position, archivedAt: r.archived_at, revision: r.revision, createdAt: r.created_at, updatedAt: r.updated_at,
});
export const companionToRow = (c: Companion) => ({
  name: c.name.trim().slice(0, 80) || "Companion", description: c.description.slice(0, 600), icon: c.icon, tone: c.tone, instructions: c.instructions.slice(0, 40000),
  conversation_prefs: c.conversationPrefs.slice(0, 8000), opening_style: c.openingStyle.slice(0, 4000), preset_key: c.presetKey, preferred_journal_id: c.preferredJournalId, position: c.position, archived_at: c.archivedAt,
});
export const versionFromRow = (r: Tables["journal_companion_versions"]["Row"]): CompanionVersion => ({
  id: r.id, companionId: r.companion_id, version: r.version, name: r.name, description: r.description, instructions: r.instructions, conversationPrefs: r.conversation_prefs, openingStyle: r.opening_style, savedAt: r.saved_at,
});
export const journalFromRow = (r: Tables["journal_journals"]["Row"]): Journal => ({
  id: r.id, name: r.name, description: r.description, icon: r.icon, tone: tone(r.tone), cover: r.cover, defaultCompanionId: r.default_companion_id, instructions: r.instructions,
  morningInstructions: r.morning_instructions, eveningInstructions: r.evening_instructions, memoryScope: r.memory_scope as MemoryScope, presetKey: r.preset_key, position: r.position, archivedAt: r.archived_at, revision: r.revision, createdAt: r.created_at,
  defaultGuideId: r.default_guide_id ?? null,
});
export const journalToRow = (j: Journal) => ({
  name: j.name.trim().slice(0, 80) || "Journal", description: j.description.slice(0, 600), icon: j.icon, tone: j.tone, cover: j.cover, default_companion_id: j.defaultCompanionId,
  instructions: j.instructions.slice(0, 20000), morning_instructions: j.morningInstructions.slice(0, 8000), evening_instructions: j.eveningInstructions.slice(0, 8000), memory_scope: j.memoryScope,
  preset_key: j.presetKey, position: j.position, archived_at: j.archivedAt, default_guide_id: j.defaultGuideId,
});
export const defaultPreferences: Preferences = { globalInstructions: "", memoryEnabled: true, analysisAuto: true, onThisDay: true, showOnDaily: false, greetOnNew: true, defaultJournalId: null, revision: 0 };
export const preferencesFromRow = (r: Tables["journal_preferences"]["Row"] | null): Preferences => r ? ({
  globalInstructions: r.global_instructions, memoryEnabled: r.memory_enabled, analysisAuto: r.analysis_auto, onThisDay: r.on_this_day, showOnDaily: r.show_on_daily, greetOnNew: r.greet_on_new, defaultJournalId: r.default_journal_id, revision: r.revision,
}) : defaultPreferences;

function images(v: Json): JournalImage[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((x) => {
    const o = x as Record<string, unknown> | null;
    if (!o || typeof o.path !== "string" || typeof o.thumbnailPath !== "string") return [];
    return [{ id: String(o.id ?? o.path), path: o.path, thumbnailPath: o.thumbnailPath, width: Number(o.width) || 0, height: Number(o.height) || 0, caption: typeof o.caption === "string" ? o.caption : "", alt: typeof o.alt === "string" ? o.alt : "" }];
  });
}
export const conversationFromRow = (r: Tables["journal_conversations"]["Row"]): Conversation => ({
  id: r.id, journalId: r.journal_id, companionId: r.companion_id, companionVersionId: r.companion_version_id, companionName: r.companion_name, origin: r.origin as Conversation["origin"], mode: r.mode as Mode, status: r.status as Status,
  localDate: r.local_date, timeZone: r.time_zone, startedAt: r.started_at, completedAt: r.completed_at, title: r.title, titleSource: r.title_source as Source | null, summary: r.summary, summarySource: r.summary_source as Source | null,
  favorite: r.favorite, excludeFromMemory: r.exclude_from_memory, memoryOff: r.memory_off, analysisStatus: r.analysis_status as Conversation["analysisStatus"], images: images(r.images),
  draft: r.draft, draftUpdatedAt: r.draft_updated_at, userWords: r.user_words, messageCount: r.message_count, lastMessageAt: r.last_message_at, revision: r.revision, updatedAt: r.updated_at,
  continuesId: r.continues_id ?? null, continuesTitle: r.continues_title ?? "", continuesDate: r.continues_date ?? null,
  guideId: r.guide_id ?? null, guideSnapshot: parseGuideSnapshot(r.guide_snapshot), guideState: (r.guide_state && typeof r.guide_state === "object" && !Array.isArray(r.guide_state) ? r.guide_state : {}) as GuideState,
});
const parseQuestions = (v: unknown): GuideQuestion[] => (Array.isArray(v) ? v : []).flatMap((q) => { const o = q as Record<string, unknown>; return o && typeof o.text === "string" && typeof o.id === "string" ? [{ id: o.id.slice(0, 64), text: o.text.slice(0, 500), optional: o.optional === true }] : []; }).slice(0, 30);
export function parseGuideSnapshot(v: unknown): GuideSnapshot | null {
  const o = v as Record<string, unknown> | null; if (!o || typeof o !== "object" || Array.isArray(o) || typeof o.name !== "string") return null;
  return { name: o.name, icon: typeof o.icon === "string" ? o.icon : "", intro: typeof o.intro === "string" ? o.intro : "", mode: o.mode === "all" ? "all" : "steps", companion: o.companion === true, questions: parseQuestions(o.questions), version: typeof o.version === "number" ? o.version : 1 };
}
export const guideFromRow = (r: Tables["journal_guides"]["Row"]): Guide => ({ id: r.id, name: r.name, description: r.description, icon: r.icon, intro: r.intro, mode: r.mode === "all" ? "all" : "steps", companion: r.companion, questions: parseQuestions(r.questions), version: r.version, archivedAt: r.archived_at, revision: r.revision, createdAt: r.created_at });
/** The columns a person edits on an entry (status, counters and drafts move separately). */
export const conversationMetaToRow = (c: Conversation) => ({
  journal_id: c.journalId, title: c.title.slice(0, 200), title_source: c.title ? c.titleSource : null, summary: c.summary.slice(0, 4000), summary_source: c.summary ? c.summarySource : null,
  favorite: c.favorite, exclude_from_memory: c.excludeFromMemory, memory_off: c.memoryOff, images: c.images as unknown as NonNullable<Json>,
  continues_id: c.continuesId, continues_title: c.continuesTitle.slice(0, 200), continues_date: c.continuesDate,
});
export const messageFromRow = (r: Tables["journal_messages"]["Row"]): Message => ({
  id: r.id, conversationId: r.conversation_id, role: r.role as Message["role"], body: r.body, localDate: r.local_date, replyTo: r.reply_to, companionVersionId: r.companion_version_id, model: r.model, correctedAt: r.corrected_at, createdAt: r.created_at, guideQuestionId: r.guide_question_id ?? null, guideQuestion: r.guide_question ?? null,
});
export const messageImageFromRow = (r: Tables["journal_message_images"]["Row"]): MessageImage => ({ id: r.id, messageId: r.message_id, position: r.position, path: r.path, thumbnailPath: r.thumbnail_path, width: r.width, height: r.height, mime: r.mime });
export const tagFromRow = (r: Tables["journal_tags"]["Row"]): Tag => ({ id: r.id, kind: r.kind as TagKind, name: r.name, normalized: r.normalized ?? r.name.trim().toLowerCase(), aliases: r.aliases, note: r.note, revision: r.revision, suppressed: r.suppressed ?? false });
export const memoryFromRow = (r: Tables["journal_memories"]["Row"]): Memory => ({
  id: r.id, body: r.body, kind: r.kind as Memory["kind"], status: r.status as Memory["status"], source: r.source as Source, journalId: r.journal_id, sourceConversationId: r.source_conversation_id, revision: r.revision, createdAt: r.created_at, updatedAt: r.updated_at,
});
export const bookmarkFromRow = (r: Tables["journal_bookmarks"]["Row"]): Bookmark => ({ id: r.id, conversationId: r.conversation_id, messageId: r.message_id, excerpt: r.excerpt, note: r.note, createdAt: r.created_at, start: r.start_offset ?? null, end: r.end_offset ?? null, updatedAt: r.updated_at ?? r.created_at });

const strings = (v: unknown, max: number, each = 300) => Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, each)).filter(Boolean).slice(0, max) : [];
/** Validates analysis JSON from a model or the database. Anything malformed becomes empty, never invented. */
export function parseAnalysisData(v: unknown): AnalysisData | null {
  const o = v as Record<string, unknown> | null;
  if (!o || typeof o !== "object" || Array.isArray(o)) return null;
  const text = (x: unknown, max: number) => (typeof x === "string" ? x.trim().slice(0, max) : "");
  return {
    title: text(o.title, 120), recap: text(o.recap, 1600), reflection: text(o.reflection, 5000), insight: text(o.insight, 500), themes: strings(o.themes, 8, 80), observations: strings(o.observations, 6, 400), threads: strings(o.threads, 5, 240),
    emotions: strings(o.emotions, 8, 40), people: strings(o.people, 20, 80), places: strings(o.places, 12, 80), topics: strings(o.topics, 10, 80), memories: strings(o.memories, 6, 300),
  };
}
export const analysisFromRow = (r: Tables["journal_analyses"]["Row"]): Analysis => ({
  id: r.id, conversationId: r.conversation_id, status: r.status as Analysis["status"], data: parseAnalysisData(r.data), dismissed: r.dismissed, model: r.model, error: r.error, revision: r.revision, createdAt: r.created_at, updatedAt: r.updated_at,
});
export function parseReportData(v: unknown): ReportData {
  const o = (v ?? {}) as Record<string, unknown>;
  return { narrative: typeof o.narrative === "string" ? o.narrative.slice(0, 4000) : "", threads: strings(o.threads, 6, 300), moments: strings(o.moments, 6, 300), observations: strings(o.observations, 5, 400) };
}
export const reportFromRow = (r: Tables["journal_reports"]["Row"]): Report => ({ id: r.id, weekStart: r.week_start, data: parseReportData(r.data), sourceIds: r.source_ids, sourceSignature: r.source_signature, model: r.model, updatedAt: r.updated_at });

/** Tag names compare case-insensitively with collapsed spaces; "alex" and "Alex " are one tag, "Alex" and "Alexa" are not. */
export const normalizeTag = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();
export const cleanTagName = (name: string) => name.trim().replace(/\s+/g, " ").slice(0, 80);
/** Finds the existing tag a name refers to: exact name or a configured alias, never a fuzzy match. */
export function findTag(tags: readonly Tag[], kind: TagKind, name: string): Tag | null {
  const n = normalizeTag(name);
  return tags.find((t) => t.kind === kind && t.normalized === n) ?? tags.find((t) => t.kind === kind && t.aliases.some((a) => normalizeTag(a) === n)) ?? null;
}

export const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);
export const entryTitle = (c: Pick<Conversation, "title" | "mode" | "localDate">, fallback?: string) => c.title.trim() || fallback || (c.mode === "morning" ? "Morning intention" : c.mode === "evening" ? "Evening reflection" : "Untitled conversation");
/** History lists finished and active conversations that contain at least one of your own messages. */
export const isListed = (c: Pick<Conversation, "status" | "userWords">) => c.status !== "draft" && c.userWords > 0;
export const tagKindLabel: Record<TagKind, string> = { custom: "My tags", person: "People", place: "Places", topic: "Topics", theme: "Themes", mood: "Moods" };
/** The kinds shown and created: My tags, People, Topics, Moods. Places and themes from older analyses stay stored (and searchable) but aren't shown. */
export const tagKinds: TagKind[] = ["custom", "person", "topic", "mood"];
/** How a tag reads: My tags carry a leading #. */
export const tagLabel = (t: { kind: TagKind; name: string }) => (t.kind === "custom" ? `#${t.name}` : t.name);
export const tagKindSingular: Record<TagKind, string> = { custom: "Tag", person: "Person", place: "Place", topic: "Topic", theme: "Theme", mood: "Mood" };
