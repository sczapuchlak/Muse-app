import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { privateResponse, routeAuthClient, trustedOrigin } from "@/lib/auth/http";
import { createMuseAdminClient } from "@/lib/supabase/admin";
import { approxTokens, buildOpening, buildReply, defaultBudget, partOfDay, periodInput, transcript, weekInput, type InputMessage, type PeriodEntry, type WeekEntry } from "@/lib/journal/context";
import { APPLICATION_RULES } from "@/lib/journal/instructions";
import { analysisSchema, ANALYSIS_RULES, periodRules, periodSchema, REPORT_RULES, reportSchema, type Layers } from "@/lib/journal/instructions";
import { conversationFromRow, journalFromRow, isListed, parseAnalysisData, parseGuideSnapshot, parseReportData, type Journal } from "@/lib/journal/model";
import { generate, providerConfig, ProviderError, type ProviderConfig } from "@/lib/journal/server/provider";
import { allowance, begin, estimateUsd, finish, setBudget, UsageError } from "@/lib/journal/server/usage";
import { IMAGE_BUCKET } from "@/lib/journal/persistence";
import { basics, loadMemory } from "@/lib/journal/server/retrieve";
import { referenceNote } from "@/lib/journal/server/reference";
import { applyAnalysis } from "@/lib/journal/server/apply";
import { addDays, periodEnd, reflectionLock, reviewLock, sourceSignature, validPeriodStart, weekStats } from "@/lib/journal/stats";
/** A conservative reservation per attached photo (a 1600px image at high detail); the invoice uses real tokens. */
const IMAGE_TOKEN_RESERVE = 3000;
/** Editorial analyses (Nov 19): room for a full narrative Overview, and long conversations read nearly whole. */
const ANALYSIS_MAX_OUTPUT = 7000, ANALYSIS_TRANSCRIPT_MAX = 100000;
/** Weekly Reflection V2: the week's own words (bounded), and room for a full report. */
const REPORT_INPUT_MAX = 140000, REPORT_MAX_OUTPUT = 9000, REPORT_TIMEOUT = 240_000;
/** Monthly and yearly reviews: bounded excerpts (never full transcripts), more room to write. */
const PERIOD_INPUT_MAX = { month: 120000, year: 150000 }, PERIOD_MAX_OUTPUT = { month: 10000, year: 14000 }, EXCERPT_CHARS = { month: 1400, year: 500 };
/** A guided answer carries its question, so the companion and the analysis read it in context. */
const withQuestion = (m: { body: string; guide_question?: string | null }) => (m.guide_question ? `(Answering the guide question “${m.guide_question}”)\n${m.body}` : m.body);
/** For a guided entry: what the guide is, so replies fit it. It shapes this entry only; the companion stays itself. */
function guideNote(raw: unknown): string {
  const g = parseGuideSnapshot(raw); if (!g) return "";
  return [`## This entry follows a guide they chose: “${g.name}”`,
    g.intro ? `Their notes for this guide (follow them for this entry only):\n${g.intro.slice(0, 2000)}` : "",
    g.questions.length ? `Its questions:\n${g.questions.map((q, i) => `${i + 1}. ${q.text}`).join("\n")}` : "",
    "They answer the questions themselves. When they share an answer with you, respond to that answer as yourself, briefly and naturally. Don't ask the next guide question for them, don't add long commentary, and don't turn it into an exercise unless their notes ask for it."].filter(Boolean).join("\n\n");
}

/**
 * Muse Journal AI (Journal V1 §21–22, Companion Playground addendum §6). Same-origin and signed-in only. Every request
 * is checked on the server against the person's entitlement and allowance, logged with token counts and an approximate
 * cost, and keyed so a repeated press can't run twice. Journal content is read with the person's own client (RLS) and
 * never written to logs. Replies stream as newline-delimited JSON: {t:"delta",d} … then {t:"done",…} or {t:"error",…}.
 */
/** Long written reviews can take a few minutes; replies and analyses keep their own 50-second provider timeout. */
export const maxDuration = 300;
type Client = SupabaseClient<Database>;
const uuid = (v: unknown): v is string => typeof v === "string" && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(v);
const date = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && Math.abs(Date.parse(`${v}T12:00:00Z`) - Date.now()) < 3 * 86400000;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const httpStatus: Record<string, number> = { locked: 409, busy: 409, "not-entitled": 403, "not-configured": 503, "limit-daily": 429, "limit-monthly": 429, "too-fast": 429, duplicate: 409, "in-progress": 409, invalid: 400, gone: 404, finished: 409 };
/** Conservative input size for a conversational request: rules, layers and the full memory budget, plus the dialogue. */
const overhead = approxTokens(APPLICATION_RULES.length + 16000 + defaultBudget.memories + defaultBudget.recent + defaultBudget.retrieved);
class Bad extends Error { constructor(public code: string, message: string) { super(message); } }

function carry(from: NextResponse, to: NextResponse) { for (const c of from.cookies.getAll()) to.cookies.set(c); return privateResponse(to); }

export async function GET(request: NextRequest) {
  const base = privateResponse(NextResponse.json({}));
  const client = routeAuthClient(request, base), { data } = await client.auth.getUser();
  if (!data.user) return carry(base, NextResponse.json({ error: "Sign in first." }, { status: 401 }));
  const config = providerConfig();
  try {
    const a = await allowance(createMuseAdminClient(), data.user.id);
    return carry(base, NextResponse.json({ enabled: a.enabled && Boolean(config), entitled: a.enabled, configured: Boolean(config), provider: config?.provider ?? null, model: config?.model ?? null, allowance: a }));
  } catch {
    return carry(base, NextResponse.json({ enabled: false, entitled: false, configured: Boolean(config), provider: null, model: null, allowance: null }));
  }
}

export async function POST(request: NextRequest) {
  const base = privateResponse(NextResponse.json({}));
  const reply = (body: unknown, status = 200) => carry(base, NextResponse.json(body, { status }));
  if (!trustedOrigin(request)) return reply({ error: "Use Muse from its configured origin." }, 403);
  const client = routeAuthClient(request, base) as Client, auth = await client.auth.getUser();
  const user = auth.data.user;
  if (!user) return reply({ error: "Sign in to use the journal.", code: "signed-out" }, 401);
  let body: Record<string, unknown>;
  try { const raw = await request.text(); if (raw.length > 400_000) return reply({ error: "That’s too much at once.", code: "invalid" }, 413); body = JSON.parse(raw); } catch { return reply({ error: "Unreadable request.", code: "invalid" }, 400); }
  const config = providerConfig(), admin = createMuseAdminClient();
  // Recall check: which memories and entries a message would bring into context. Reads only (with the person's own
  // client), never calls AI and never costs anything; the result is ids, dates, names and reasons, not entry text.
  if (body.action === "recall") { try { return reply(await recall(client, user.id, body)); } catch (e) { return failure(base, e); } }
  if (body.action === "budget") { try { await setBudget(admin, user.id, { monthly: Number(body.monthly), warnAt: Number(body.warnAt), daily: Number(body.daily) }); return reply({ ok: true, allowance: await allowance(admin, user.id) }); } catch (e) { return failure(base, e); } }
  if (!config) return reply({ error: "Journal AI isn’t set up yet. Everything you write still saves.", code: "not-configured" }, 503);
  try {
    switch (body.action) {
      case "reply": return await streamReply(request, base, client, admin, config, user.id, body);
      case "opening": return await streamOpening(request, base, client, admin, config, user.id, body);
      case "test": return await streamTest(request, base, client, admin, config, user.id, body);
      case "analysis": return reply(await analyse(client, admin, config, user.id, body));
      case "report": return reply(await report(client, admin, config, user.id, body));
      default: return reply({ error: "Unknown action.", code: "invalid" }, 400);
    }
  } catch (e) { return failure(base, e); }
}

function failure(base: NextResponse, e: unknown) {
  if (e instanceof UsageError || e instanceof Bad) return carry(base, NextResponse.json({ error: e.message, code: e.code }, { status: httpStatus[e.code] ?? 400 }));
  if (e instanceof ProviderError) return carry(base, NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "not-configured" ? 503 : 502 }));
  return carry(base, NextResponse.json({ error: "Something went wrong. Nothing you wrote was lost.", code: "failed" }, { status: 500 }));
}

/** Streams a generation and runs `save` with the final text before the closing event. Errors never lose saved words. */
function stream(base: NextResponse, run: (onDelta: (d: string) => void) => Promise<Record<string, unknown>>) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      let open = true;
      const send = (o: unknown) => { if (!open) return; try { controller.enqueue(encoder.encode(`${JSON.stringify(o)}\n`)); } catch { open = false; } };
      try { send({ t: "done", ...(await run((d) => send({ t: "delta", d }))) }); }
      catch (e) {
        const code = e instanceof UsageError || e instanceof Bad || e instanceof ProviderError ? e.code : "failed";
        send({ t: "error", code, error: e instanceof Error && code !== "failed" ? e.message : "The reply couldn’t be finished. Your message is saved; try again." });
      }
      if (open) try { controller.close(); } catch { /* client went away */ }
    },
  });
  // The generation keeps going if the person navigates away, so the reply is still saved.
  const res = new NextResponse(body, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "X-Content-Type-Options": "nosniff" } });
  return carry(base, res);
}

async function companionLayer(client: Client, userId: string, conv: { companion_version_id: string | null; companion_id: string | null }) {
  if (conv.companion_version_id) {
    const v = await client.from("journal_companion_versions").select("*").eq("id", conv.companion_version_id).eq("user_id", userId).maybeSingle();
    if (v.data) return { versionId: v.data.id, layer: { name: v.data.name, instructions: v.data.instructions, conversationPrefs: v.data.conversation_prefs, openingStyle: v.data.opening_style } };
  }
  if (conv.companion_id) {
    const c = await client.from("journal_companions").select("*").eq("id", conv.companion_id).eq("user_id", userId).maybeSingle();
    if (c.data) {
      const v = await client.from("journal_companion_versions").select("id").eq("user_id", userId).eq("companion_id", c.data.id).eq("version", c.data.version).maybeSingle();
      return { versionId: v.data?.id ?? null, layer: { name: c.data.name, instructions: c.data.instructions, conversationPrefs: c.data.conversation_prefs, openingStyle: c.data.opening_style } };
    }
  }
  return { versionId: null, layer: null };
}
const journalLayer = (j: Journal) => ({ name: j.name, description: j.description, instructions: j.instructions, morningInstructions: j.morningInstructions, eveningInstructions: j.eveningInstructions });

async function loadConversation(client: Client, userId: string, id: unknown) {
  if (!uuid(id)) throw new Bad("invalid", "Unreadable request.");
  const c = await client.from("journal_conversations").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (c.error) throw c.error;
  if (!c.data) throw new Bad("gone", "That conversation isn’t available.");
  const j = await client.from("journal_journals").select("*").eq("id", c.data.journal_id).eq("user_id", userId).single();
  if (j.error) throw j.error;
  return { conv: c.data, journal: journalFromRow(j.data) };
}

async function streamReply(request: NextRequest, base: NextResponse, client: Client, admin: Client, config: ProviderConfig, userId: string, body: Record<string, unknown>) {
  const { conv, journal } = await loadConversation(client, userId, body.conversationId);
  if (conv.status === "completed") throw new Bad("finished", "This entry is finished. Start a new conversation to keep talking.");
  if (!uuid(body.messageId)) throw new Bad("invalid", "Unreadable request.");
  const msgs = await client.from("journal_messages").select("id,role,body,local_date,reply_to,created_at,guide_question").eq("conversation_id", conv.id).eq("user_id", userId).order("created_at").limit(2000);
  if (msgs.error) throw msgs.error;
  const at = msgs.data.findIndex((m) => m.id === body.messageId);
  if (at < 0 || msgs.data[at].role !== "user") throw new Bad("gone", "That message isn’t saved yet.");
  if (msgs.data.some((m) => m.reply_to === body.messageId)) throw new Bad("duplicate", "That message already has a reply.");
  const history = msgs.data.slice(0, at + 1), latest = history[at];
  const today = date(body.localDate) ? body.localDate : latest.local_date;
  // Photos: only the message being answered sends its photos; earlier ones are named in the text as no longer visible.
  const imgs = await client.from("journal_message_images").select("message_id,path,mime,position").eq("conversation_id", conv.id).eq("user_id", userId).order("position");
  const imageRows = imgs.error ? [] : imgs.data, latestImages = imageRows.filter((r) => r.message_id === latest.id);
  const imageCount = new Map<string, number>(); for (const r of imageRows) imageCount.set(r.message_id, (imageCount.get(r.message_id) ?? 0) + 1);
  // Continue from here: the original in full (bounded) with the first message only; afterwards just its summary.
  const reference = await referenceNote(client, userId, conv, history.filter((m) => m.role === "user").length === 1);
  const usage = await begin(admin, userId, { kind: "reply", requestKey: `reply:${latest.id}`, conversationId: conv.id, model: config.model, estimateUsd: estimateUsd(config.model, overhead + approxTokens(Math.min(defaultBudget.conversation, history.reduce((n, m) => n + m.body.length, 0)) + reference.length) + latestImages.length * IMAGE_TOKEN_RESERVE, 900) });
  return stream(base, async (onDelta) => {
    try {
      const b = await basics(client, userId);
      const { versionId, layer } = await companionLayer(client, userId, conv);
      // Their previous few messages keep people they named in play for a follow-up ("what do you think he wants?").
      const earlier = history.slice(0, -1).filter((m) => m.role === "user").slice(-3).map((m) => m.body.slice(0, 4000));
      const memory = await loadMemory(client, userId, b, journal, { currentId: conv.id, memoryOff: conv.memory_off, today, latest: latest.body, earlier });
      const layers: Layers = { globalInstructions: b.prefs.globalInstructions, companion: layer, journal: journalLayer(journal), mode: conv.mode as Layers["mode"] };
      const req = buildReply(layers, memory, history.map((m) => ({ role: m.role as "user" | "assistant", body: withQuestion(m), imageCount: imageCount.get(m.id) })));
      if (reference) req.input.splice(memory.stable ? 1 : 0, 0, { role: "developer", content: reference });
      const guide = guideNote(conv.guide_snapshot);
      if (guide) req.input.splice(memory.stable ? 1 : 0, 0, { role: "developer", content: guide });
      if (latestImages.length) {
        const urls = await Promise.all(latestImages.map(async (r) => {
          const d = await client.storage.from(IMAGE_BUCKET).download(r.path);
          if (d.error || !d.data) throw new ProviderError("failed", "A photo couldn’t be read. Try sending it again.");
          return `data:${r.mime};base64,${Buffer.from(await d.data.arrayBuffer()).toString("base64")}`;
        }));
        const target = [...req.input].reverse().find((m) => m.role === "user");
        if (target) target.images = urls;
      }
      const out = await generate(config, { instructions: req.instructions, input: req.input, maxOutputTokens: 900, effort: "none", onDelta });
      await finish(admin, usage.id, out.model, { usage: out.usage });
      const saved = await client.from("journal_messages").insert({ user_id: userId, conversation_id: conv.id, role: "assistant", body: out.text, local_date: latest.local_date, reply_to: latest.id, companion_version_id: versionId, model: out.model }).select("*").single();
      if (saved.error) throw saved.error;
      return { message: saved.data, memory: { memories: memory.used.memories.length, recent: memory.used.recent.length, retrieved: memory.used.retrieved.length } };
    } catch (e) { await finish(admin, usage.id, config.model, { usage: (e as { usage?: never }).usage, error: e instanceof ProviderError ? e.code : "failed" }); throw e; }
  });
}

async function streamOpening(_request: NextRequest, base: NextResponse, client: Client, admin: Client, config: ProviderConfig, userId: string, body: Record<string, unknown>) {
  const { conv, journal } = await loadConversation(client, userId, body.conversationId);
  if (conv.status === "completed") throw new Bad("finished", "This entry is finished.");
  if (conv.message_count > 0) throw new Bad("duplicate", "This conversation has already started.");
  const hour = typeof body.hour === "number" && body.hour >= 0 && body.hour < 24 ? Math.floor(body.hour) : 12;
  const today = date(body.localDate) ? body.localDate : conv.local_date;
  const reference = await referenceNote(client, userId, conv, true);
  const usage = await begin(admin, userId, { kind: "opening", requestKey: `opening:${conv.id}`, conversationId: conv.id, model: config.model, estimateUsd: estimateUsd(config.model, overhead + approxTokens(reference.length), 300) });
  return stream(base, async (onDelta) => {
    try {
      const b = await basics(client, userId);
      const { versionId, layer } = await companionLayer(client, userId, conv);
      const memory = await loadMemory(client, userId, b, journal, { currentId: conv.id, memoryOff: conv.memory_off, today, latest: "" });
      const layers: Layers = { globalInstructions: b.prefs.globalInstructions, companion: layer, journal: journalLayer(journal), mode: conv.mode as Layers["mode"] };
      const when = { date: new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" }), weekday: new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }), partOfDay: partOfDay(hour) };
      const req = buildOpening(layers, memory, when);
      if (reference) req.input.splice(memory.stable ? 1 : 0, 0, { role: "developer", content: reference });
      const out = await generate(config, { instructions: req.instructions, input: req.input, maxOutputTokens: 300, effort: "none", onDelta });
      await finish(admin, usage.id, out.model, { usage: out.usage });
      const saved = await client.from("journal_messages").insert({ user_id: userId, conversation_id: conv.id, role: "assistant", body: out.text, local_date: conv.local_date, reply_to: null, companion_version_id: versionId, model: out.model }).select("*").single();
      if (saved.error) { if (saved.error.code === "23505") throw new Bad("duplicate", "This conversation has already started."); throw saved.error; }
      return { message: saved.data, memory: { memories: memory.used.memories.length, recent: memory.used.recent.length, retrieved: memory.used.retrieved.length } };
    } catch (e) { await finish(admin, usage.id, config.model, { error: e instanceof ProviderError ? e.code : "failed" }); throw e; }
  });
}

/**
 * Companion Playground: the same model, application rules and instruction layers as real journaling, with the
 * person's *unsaved* companion draft. Nothing is stored except the usage row (kind "test"). Journal context is off
 * unless the person explicitly turns on "Test with my journal context".
 */
async function streamTest(_request: NextRequest, base: NextResponse, client: Client, admin: Client, config: ProviderConfig, userId: string, body: Record<string, unknown>) {
  const draft = (body.companion ?? {}) as Record<string, unknown>;
  const raw = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
  const messages = raw.flatMap((m) => { const o = m as Record<string, unknown>; return (o.role === "user" || o.role === "assistant") && typeof o.body === "string" && o.body.trim() ? [{ role: o.role as "user" | "assistant", body: o.body.slice(0, 20000) }] : []; });
  if (!messages.length || messages[messages.length - 1].role !== "user") throw new Bad("invalid", "Write a test message first.");
  if (typeof body.requestKey !== "string" || !/^[\w:-]{8,100}$/.test(body.requestKey)) throw new Bad("invalid", "Unreadable request.");
  let journal: Journal | null = null;
  if (body.journalId !== null && body.journalId !== undefined) {
    if (!uuid(body.journalId)) throw new Bad("invalid", "Unreadable request.");
    const j = await client.from("journal_journals").select("*").eq("id", body.journalId).eq("user_id", userId).maybeSingle();
    if (j.error) throw j.error; journal = j.data ? journalFromRow(j.data) : null;
  }
  const today = date(body.localDate) ? body.localDate : new Date().toISOString().slice(0, 10);
  const usage = await begin(admin, userId, { kind: "test", requestKey: `test:${body.requestKey}`, conversationId: null, model: config.model, estimateUsd: estimateUsd(config.model, overhead + approxTokens(messages.reduce((n, m) => n + m.body.length, 0) + str(draft.instructions, 40000).length), 900) });
  return stream(base, async (onDelta) => {
    try {
      const b = await basics(client, userId);
      const useContext = body.useContext === true && journal !== null;
      const memory = useContext ? await loadMemory(client, userId, b, journal!, { currentId: null, memoryOff: false, today, latest: messages[messages.length - 1].body }) : { stable: "", retrieved: "" };
      const layers: Layers = {
        globalInstructions: b.prefs.globalInstructions, journal: journal ? journalLayer(journal) : null, mode: "open", test: true,
        companion: { name: str(draft.name, 80) || "Companion", instructions: str(draft.instructions, 40000), conversationPrefs: str(draft.conversationPrefs, 8000), openingStyle: str(draft.openingStyle, 4000) },
      };
      const req = buildReply(layers, memory, messages);
      const out = await generate(config, { instructions: req.instructions, input: req.input, maxOutputTokens: 900, effort: "none", onDelta });
      await finish(admin, usage.id, out.model, { usage: out.usage });
      return { text: out.text, model: out.model };
    } catch (e) { await finish(admin, usage.id, config.model, { error: e instanceof ProviderError ? e.code : "failed" }); throw e; }
  });
}

async function recall(client: Client, userId: string, body: Record<string, unknown>) {
  const text = str(body.text, 4000).trim();
  if (!text) throw new Bad("invalid", "Write something to check.");
  const j = uuid(body.journalId) ? await client.from("journal_journals").select("*").eq("id", body.journalId).eq("user_id", userId).maybeSingle() : null;
  const b = await basics(client, userId);
  const journal = j?.data ? journalFromRow(j.data) : b.journals.find((x) => x.id === b.prefs.defaultJournalId) ?? b.journals[0];
  if (!journal) throw new Bad("gone", "Make a journal first.");
  const today = date(body.localDate) ? body.localDate : new Date().toISOString().slice(0, 10);
  const memory = await loadMemory(client, userId, b, journal, { currentId: null, memoryOff: false, today, latest: text });
  return {
    journalId: journal.id, allowed: b.prefs.memoryEnabled && journal.memoryScope !== "off",
    memories: memory.used.memories, recent: memory.used.recent, retrieved: memory.used.retrieved.map((id) => ({ id, why: memory.used.why?.[id] ?? [] })), entities: memory.used.entities ?? [],
    chars: { stable: memory.stable.length, retrieved: memory.retrieved.length }, approxTokens: approxTokens(memory.stable.length + memory.retrieved.length),
  };
}

async function analyse(client: Client, admin: Client, config: ProviderConfig, userId: string, body: Record<string, unknown>) {
  const { conv } = await loadConversation(client, userId, body.conversationId);
  if (conv.status !== "completed") throw new Bad("invalid", "Finish the entry first.");
  const existing = await client.from("journal_analyses").select("*").eq("conversation_id", conv.id).eq("user_id", userId).maybeSingle();
  if (existing.data?.status === "ready" && body.regenerate !== true) return { analysis: existing.data, cached: true };
  const msgs = await client.from("journal_messages").select("role,body,guide_question").eq("conversation_id", conv.id).eq("user_id", userId).order("created_at").limit(2000);
  if (msgs.error) throw msgs.error;
  if (!msgs.data.some((m) => m.role === "user")) throw new Bad("invalid", "There’s nothing of yours to analyse yet.");
  // Known people with confirmed aliases, and corrections the person made before: guidance for names, never rules.
  const people = await client.from("journal_tags").select("id,name,aliases").eq("user_id", userId).eq("kind", "person").eq("suppressed", false).limit(200);
  const fixes = await client.from("journal_tag_corrections").select("from_name,to_tag_id,times").eq("user_id", userId).eq("kind", "person").order("times", { ascending: false }).limit(40);
  const attempt = existing.data ? (existing.data.revision ?? 1) + 1 : 1;
  // Earlier journal context (secondary, bounded, permission-checked like a reply): people and situations from this
  // conversation that appear in older entries, plus the week around it. The conversation stays the primary evidence.
  const own = msgs.data.filter((m) => m.role === "user").map((m) => m.body).join("\n").slice(0, 6000);
  let history = "";
  try {
    const jr = await client.from("journal_journals").select("*").eq("id", conv.journal_id).eq("user_id", userId).single();
    if (jr.data) { const mem = await loadMemory(client, userId, await basics(client, userId), journalFromRow(jr.data), { currentId: conv.id, memoryOff: conv.memory_off, today: conv.local_date, latest: own }); history = [mem.stable, mem.retrieved].filter(Boolean).join("\n\n"); }
  } catch { history = ""; }
  const conversationText = transcript(msgs.data.map((m) => ({ role: m.role as "user" | "assistant", body: withQuestion(m) })), ANALYSIS_TRANSCRIPT_MAX);
  const usage = await begin(admin, userId, { kind: "analysis", requestKey: `analysis:${conv.id}:${body.regenerate === true ? `r${attempt}` : "1"}`, conversationId: conv.id, model: config.model, estimateUsd: estimateUsd(config.model, approxTokens(ANALYSIS_RULES.length + conversationText.length + history.length + 2000), ANALYSIS_MAX_OUTPUT) });
  await client.from("journal_conversations").update({ analysis_status: "pending" }).eq("id", conv.id).eq("user_id", userId);
  try {
    // A historical (imported) entry: its date matters, its replies came from another app, and anything worth
    // remembering must say when it was true, so an old situation is never stored as a current fact.
    const historical = conv.origin === "import" ? `This is a historical entry from ${conv.local_date}, imported from another journal app; the "Companion" replies came from that app's AI. Analyse it as a record of that time. Any memory you propose must say when it was true (for example "As of ${new Date(`${conv.local_date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}, …") and must be something they clearly stated, never a guess, worry or impression about someone else.\n\n` : "";
    const input: InputMessage[] = [{ role: "user", content: `${historical}${conv.continues_title ? `This entry continues an earlier one, “${conv.continues_title}” (${conv.continues_date}).\n\n` : ""}${people.data?.length ? `Existing person names (confirmed aliases in brackets): ${people.data.map((p) => p.aliases.length ? `${p.name} [${p.aliases.join(", ")}]` : p.name).join(", ")}\n\n` : ""}${history ? `Earlier in their journal (secondary context: dated, not facts about now; use only if it clearly bears on this conversation):\n${history}\n\n` : ""}${fixes.data?.length ? `Corrections they made on earlier entries (use only when the context clearly means the same person; otherwise keep the name they used): ${fixes.data.map((f) => { const to = people.data?.find((p) => p.id === f.to_tag_id); return to ? `“${f.from_name}” was ${to.name}${f.times > 1 ? ` (${f.times}×)` : ""}` : ""; }).filter(Boolean).join("; ")}\n\n` : ""}This entry was written on ${conv.local_date}.\n\nConversation:\n\n${conversationText}` }];
    const out = await generate(config, { instructions: ANALYSIS_RULES, input, maxOutputTokens: ANALYSIS_MAX_OUTPUT, effort: "low", schema: { name: "journal_analysis", schema: analysisSchema } });
    await finish(admin, usage.id, out.model, { usage: out.usage });
    let parsed: unknown; try { parsed = JSON.parse(out.text); } catch { parsed = null; }
    const data = parseAnalysisData(parsed);
    if (!data) throw new ProviderError("failed", "The analysis came back unreadable.");
    const saved = await applyAnalysis(client, userId, conv, data, out.model);
    return { analysis: saved, cached: false };
  } catch (e) {
    await finish(admin, usage.id, config.model, { error: e instanceof ProviderError ? e.code : "failed" });
    await client.from("journal_analyses").upsert({ user_id: userId, conversation_id: conv.id, status: existing.data?.status === "ready" ? "ready" : "failed", error: "The analysis couldn’t be finished. Your entry is saved.", data: existing.data?.data ?? {} }, { onConflict: "user_id,conversation_id" });
    await client.from("journal_conversations").update({ analysis_status: existing.data?.status === "ready" ? "ready" : "failed" }).eq("id", conv.id).eq("user_id", userId);
    throw e;
  }
}

async function report(client: Client, admin: Client, config: ProviderConfig, userId: string, body: Record<string, unknown>) {
  if (body.period === "month" || body.period === "year") return periodReport(client, admin, config, userId, body, body.period);
  if (typeof body.weekStart !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.weekStart) || new Date(`${body.weekStart}T12:00:00Z`).getUTCDay() !== 1) throw new Bad("invalid", "Choose a week.");
  const start = body.weekStart, end = addDays(start, 6);
  // Sunday unlock: the current week opens at midnight on Sunday in their own day (localDate, checked against the
  // server clock); a later week never. Completed weeks are always open.
  const today = date(body.localDate) ? body.localDate : new Date().toISOString().slice(0, 10);
  const lock = reflectionLock(start, today);
  if (lock !== "open") throw new Bad("locked", lock === "future" ? "That week hasn’t happened yet." : "This week’s reflection opens on Sunday.");
  const rows = await client.from("journal_conversations").select("*").eq("user_id", userId).gte("local_date", start).lte("local_date", end).neq("status", "draft").order("local_date").order("started_at").limit(300);
  if (rows.error) throw rows.error;
  const list = rows.data.map(conversationFromRow).filter(isListed);
  if (!list.length) throw new Bad("invalid", "There are no entries in this week to reflect on.");
  const signature = sourceSignature(list);
  const cached = await client.from("journal_reports").select("*").eq("user_id", userId).eq("period", "week").eq("week_start", start).maybeSingle();
  if (cached.data && body.regenerate !== true) return { report: cached.data, cached: true, stale: cached.data.source_signature !== signature };
  const [links, tags, journals] = await Promise.all([
    client.from("journal_entry_tags").select("conversation_id,tag_id,source").eq("user_id", userId).in("conversation_id", list.map((c) => c.id)),
    client.from("journal_tags").select("*").eq("user_id", userId).limit(5000),
    client.from("journal_journals").select("id,name,memory_scope").eq("user_id", userId),
  ]);
  // Privacy: entries kept out of AI context, and journals with memory off, are never sent.
  const off = new Set((journals.data ?? []).filter((x) => x.memory_scope === "off").map((x) => x.id));
  const eligible = list.filter((c) => !c.excludeFromMemory && !off.has(c.journalId));
  if (!eligible.length) throw new Bad("invalid", "Every entry this week is kept out of AI, so there’s nothing to reflect on.");
  const msgs = await client.from("journal_messages").select("conversation_id,role,body,guide_question,created_at").eq("user_id", userId).in("conversation_id", eligible.map((c) => c.id)).order("created_at").limit(20000);
  if (msgs.error) throw msgs.error;
  const stats = weekStats(start, list, (links.data ?? []).map((l) => ({ conversationId: l.conversation_id, tagId: l.tag_id, source: l.source as "user" | "ai" })), (tags.data ?? []).map((t) => ({ id: t.id, kind: t.kind as "person", name: t.name, normalized: t.normalized ?? "", aliases: t.aliases, suppressed: false, note: t.note, revision: t.revision })));
  const names = new Map((journals.data ?? []).map((j) => [j.id, j.name])), tagName = new Map((tags.data ?? []).filter((t) => !t.suppressed && t.kind !== "theme").map((t) => [t.id, t.kind === "custom" ? `#${t.name}` : t.name]));
  const week: WeekEntry[] = eligible.map((c) => ({
    date: c.localDate, journal: names.get(c.journalId) ?? "Journal", title: c.title, summary: c.summary, summarySource: c.summarySource,
    tags: (links.data ?? []).filter((l) => l.conversation_id === c.id).map((l) => tagName.get(l.tag_id)).filter((x): x is string => Boolean(x)).slice(0, 14),
    messages: msgs.data.filter((m) => m.conversation_id === c.id).map((m) => ({ role: m.role as "user" | "assistant", body: m.body, question: m.guide_question })),
  }));
  const { text, shortened } = weekInput(week, REPORT_INPUT_MAX);
  const facts = `Week: Monday ${start} to Sunday ${end}. ${eligible.length} ${eligible.length === 1 ? "entry" : "entries"} on ${new Set(eligible.map((c) => c.localDate)).size} of 7 days, about ${stats.words} words of theirs.${list.length > eligible.length ? ` (${list.length - eligible.length} more ${list.length - eligible.length === 1 ? "entry is" : "entries are"} kept out of AI and not included; don't refer to them.)` : ""}${shortened ? " Some long passages were shortened for length (marked); don't treat what's missing as absent." : ""}`;
  // One request per week and version: a repeated tap or a second device waits for the first instead of paying twice.
  const usage = await begin(admin, userId, { kind: "report", requestKey: `report:${start}:${signature.slice(0, 40)}:${body.regenerate === true && cached.data ? `r${cached.data.revision}` : "1"}`, conversationId: null, model: config.model, estimateUsd: estimateUsd(config.model, approxTokens(REPORT_RULES.length + facts.length + text.length), REPORT_MAX_OUTPUT) });
  try {
    const out = await generate(config, { instructions: REPORT_RULES, input: [{ role: "user", content: `${facts}\n\nThe week's entries, in order:\n\n${text}` }], maxOutputTokens: REPORT_MAX_OUTPUT, effort: "low", timeoutMs: REPORT_TIMEOUT, schema: { name: "journal_weekly_reflection", schema: reportSchema } });
    await finish(admin, usage.id, out.model, { usage: out.usage });
    let parsed: unknown; try { parsed = JSON.parse(out.text); } catch { parsed = null; }
    const data = parseReportData(parsed);
    if (!data.title || !data.review) throw new ProviderError("failed", "The reflection came back unreadable. Nothing was saved; try again.");
    const stored = { title: data.title, review: data.review, themes: data.themes, insights: data.insights, wins: data.wins, closing: data.closing, covered: { start, end, entries: eligible.length, generatedAt: new Date().toISOString() } };
    const saved = await client.from("journal_reports").upsert({ user_id: userId, period: "week", week_start: start, data: stored, source_ids: list.map((c) => c.id), source_signature: signature, model: out.model }, { onConflict: "user_id,period,week_start" }).select("*").single();
    if (saved.error) throw saved.error;
    return { report: saved.data, cached: false, stale: false };
  } catch (e) { await finish(admin, usage.id, config.model, { error: e instanceof ProviderError ? e.code : "failed" }); throw e; }
}

/**
 * Monthly and yearly Life Reviews: on demand for a finished month or year (their own day), cached, one request key
 * per period and version. Reads bounded excerpts and saved summaries, plus saved reflections for parts of the period,
 * in one request; never a year of full transcripts. Entries kept out of AI and memory-off journals are never sent.
 */
async function periodReport(client: Client, admin: Client, config: ProviderConfig, userId: string, body: Record<string, unknown>, kind: "month" | "year") {
  const start = typeof body.start === "string" ? body.start : "";
  if (!validPeriodStart(kind, start)) throw new Bad("invalid", `Choose a ${kind}.`);
  const end = periodEnd(kind, start), today = date(body.localDate) ? body.localDate : new Date().toISOString().slice(0, 10);
  const lock = reviewLock(kind, start, today);
  if (lock !== "open") throw new Bad("locked", lock === "future" ? `That ${kind} hasn’t happened yet.` : `This ${kind}’s review opens when the ${kind} is over.`);
  const rows = await client.from("journal_conversations").select("*").eq("user_id", userId).gte("local_date", start).lte("local_date", end).neq("status", "draft").order("local_date").order("started_at").limit(3000);
  if (rows.error) throw rows.error;
  const list = rows.data.map(conversationFromRow).filter(isListed);
  if (!list.length) throw new Bad("invalid", `There are no entries in this ${kind} to look back on.`);
  const signature = sourceSignature(list);
  const cached = await client.from("journal_reports").select("*").eq("user_id", userId).eq("period", kind).eq("week_start", start).maybeSingle();
  if (cached.data && body.regenerate !== true) return { report: cached.data, cached: true, stale: cached.data.source_signature !== signature };
  const [tags, journals, reports] = await Promise.all([
    client.from("journal_tags").select("id,kind,name,suppressed").eq("user_id", userId).limit(5000),
    client.from("journal_journals").select("id,name,memory_scope").eq("user_id", userId),
    client.from("journal_reports").select("period,week_start,data").eq("user_id", userId).eq("period", kind === "year" ? "month" : "week").gte("week_start", kind === "month" ? addDays(start, -6) : start).lte("week_start", end).order("week_start"),
  ]);
  const off = new Set((journals.data ?? []).filter((x) => x.memory_scope === "off").map((x) => x.id));
  const eligible = list.filter((c) => !c.excludeFromMemory && !off.has(c.journalId));
  if (!eligible.length) throw new Bad("invalid", `Every entry this ${kind} is kept out of AI, so there’s nothing to look back on.`);
  const ids = eligible.map((c) => c.id), tagName = new Map((tags.data ?? []).filter((t) => !t.suppressed && t.kind !== "theme").map((t) => [t.id, t.kind === "custom" ? `#${t.name}` : t.name]));
  const linkRows: { conversation_id: string; tag_id: string }[] = [], excerpts = new Map<string, { excerpt: string; chars: number }>();
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150);
    const [l, x] = await Promise.all([
      client.from("journal_entry_tags").select("conversation_id,tag_id").eq("user_id", userId).in("conversation_id", chunk),
      client.rpc("journal_entry_excerpts", { p_ids: chunk, p_chars: EXCERPT_CHARS[kind] }),
    ]);
    if (l.error) throw l.error; if (x.error) throw x.error;
    linkRows.push(...l.data); for (const r of x.data) excerpts.set(r.conversation_id, { excerpt: r.excerpt, chars: r.chars });
  }
  const names = new Map((journals.data ?? []).map((j) => [j.id, j.name]));
  const entries: PeriodEntry[] = eligible.map((c) => ({ date: c.localDate, journal: names.get(c.journalId) ?? "Journal", title: c.title, summary: c.summary, summarySource: c.summarySource,
    tags: linkRows.filter((l) => l.conversation_id === c.id).map((l) => tagName.get(l.tag_id)).filter((x): x is string => Boolean(x)), excerpt: excerpts.get(c.id)?.excerpt ?? "", ownChars: excerpts.get(c.id)?.chars ?? 0 }));
  const notes = (reports.data ?? []).map((r) => { const d = parseReportData(r.data); return { label: `${r.period === "month" ? "Month of" : "Week of"} ${r.week_start}`, title: d.title, text: d.review || d.narrative }; }).filter((n) => n.text);
  const { text, shortened } = periodInput(entries, notes, PERIOD_INPUT_MAX[kind]);
  const words = eligible.reduce((n, c) => n + c.userWords, 0);
  const facts = `${kind === "month" ? "Month" : "Year"}: ${start} to ${end}. ${eligible.length} ${eligible.length === 1 ? "entry" : "entries"} on ${new Set(eligible.map((c) => c.localDate)).size} days, about ${words.toLocaleString("en-US")} words of theirs.${list.length > eligible.length ? ` (${list.length - eligible.length} more kept out of AI and not included; don't refer to them.)` : ""}${shortened ? " Summaries and excerpts are shortened to fit (marked); don't treat what's missing as absent." : ""}`;
  const usage = await begin(admin, userId, { kind: "report", requestKey: `report:${kind}:${start}:${signature.slice(0, 40)}:${body.regenerate === true && cached.data ? `r${cached.data.revision}` : "1"}`, conversationId: null, model: config.model, estimateUsd: estimateUsd(config.model, approxTokens(facts.length + text.length + 6000), PERIOD_MAX_OUTPUT[kind]) });
  try {
    const out = await generate(config, { instructions: periodRules(kind), input: [{ role: "user", content: `${facts}\n\n${text}` }], maxOutputTokens: PERIOD_MAX_OUTPUT[kind], effort: "low", timeoutMs: REPORT_TIMEOUT, schema: { name: `journal_${kind}_review`, schema: periodSchema } });
    await finish(admin, usage.id, out.model, { usage: out.usage });
    let parsed: unknown; try { parsed = JSON.parse(out.text); } catch { parsed = null; }
    const d = parseReportData(parsed);
    if (!d.title || !d.review) throw new ProviderError("failed", "The review came back unreadable. Nothing was saved; try again.");
    const stored = { title: d.title, review: d.review, chapters: d.chapters, themes: d.themes, people: d.people, shifts: d.shifts, insights: d.insights, wins: d.wins, closing: d.closing, covered: { start, end, entries: eligible.length, generatedAt: new Date().toISOString() } };
    const saved = await client.from("journal_reports").upsert({ user_id: userId, period: kind, week_start: start, data: stored, source_ids: list.map((c) => c.id), source_signature: signature, model: out.model }, { onConflict: "user_id,period,week_start" }).select("*").single();
    if (saved.error) throw saved.error;
    return { report: saved.data, cached: false, stale: false };
  } catch (e) { await finish(admin, usage.id, config.model, { error: e instanceof ProviderError ? e.code : "failed" }); throw e; }
}
