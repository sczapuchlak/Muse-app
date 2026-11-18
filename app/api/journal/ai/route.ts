import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { privateResponse, routeAuthClient, trustedOrigin } from "@/lib/auth/http";
import { createMuseAdminClient } from "@/lib/supabase/admin";
import { approxTokens, buildOpening, buildReply, defaultBudget, partOfDay, transcript, type InputMessage } from "@/lib/journal/context";
import { APPLICATION_RULES } from "@/lib/journal/instructions";
import { analysisSchema, ANALYSIS_RULES, REPORT_RULES, reportSchema, type Layers } from "@/lib/journal/instructions";
import { conversationFromRow, journalFromRow, isListed, parseAnalysisData, parseReportData, type Journal } from "@/lib/journal/model";
import { generate, providerConfig, ProviderError, type ProviderConfig } from "@/lib/journal/server/provider";
import { allowance, begin, estimateUsd, finish, setBudget, UsageError } from "@/lib/journal/server/usage";
import { IMAGE_BUCKET } from "@/lib/journal/persistence";
import { basics, loadMemory } from "@/lib/journal/server/retrieve";
import { referenceNote } from "@/lib/journal/server/reference";
import { applyAnalysis } from "@/lib/journal/server/apply";
import { addDays, sourceSignature, weekStats } from "@/lib/journal/stats";
/** A conservative reservation per attached photo (a 1600px image at high detail); the invoice uses real tokens. */
const IMAGE_TOKEN_RESERVE = 3000;

/**
 * Muse Journal AI (Journal V1 §21–22, Companion Playground addendum §6). Same-origin and signed-in only. Every request
 * is checked on the server against the person's entitlement and allowance, logged with token counts and an approximate
 * cost, and keyed so a repeated press can't run twice. Journal content is read with the person's own client (RLS) and
 * never written to logs. Replies stream as newline-delimited JSON: {t:"delta",d} … then {t:"done",…} or {t:"error",…}.
 */
export const maxDuration = 60;
type Client = SupabaseClient<Database>;
const uuid = (v: unknown): v is string => typeof v === "string" && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(v);
const date = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && Math.abs(Date.parse(`${v}T12:00:00Z`) - Date.now()) < 3 * 86400000;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const httpStatus: Record<string, number> = { busy: 409, "not-entitled": 403, "not-configured": 503, "limit-daily": 429, "limit-monthly": 429, "too-fast": 429, duplicate: 409, "in-progress": 409, invalid: 400, gone: 404, finished: 409 };
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
  const msgs = await client.from("journal_messages").select("id,role,body,local_date,reply_to,created_at").eq("conversation_id", conv.id).eq("user_id", userId).order("created_at").limit(2000);
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
      const memory = await loadMemory(client, userId, b, journal, { currentId: conv.id, memoryOff: conv.memory_off, today, latest: latest.body });
      const layers: Layers = { globalInstructions: b.prefs.globalInstructions, companion: layer, journal: journalLayer(journal), mode: conv.mode as Layers["mode"] };
      const req = buildReply(layers, memory, history.map((m) => ({ role: m.role as "user" | "assistant", body: m.body, imageCount: imageCount.get(m.id) })));
      if (reference) req.input.splice(memory.stable ? 1 : 0, 0, { role: "developer", content: reference });
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

async function analyse(client: Client, admin: Client, config: ProviderConfig, userId: string, body: Record<string, unknown>) {
  const { conv } = await loadConversation(client, userId, body.conversationId);
  if (conv.status !== "completed") throw new Bad("invalid", "Finish the entry first.");
  const existing = await client.from("journal_analyses").select("*").eq("conversation_id", conv.id).eq("user_id", userId).maybeSingle();
  if (existing.data?.status === "ready" && body.regenerate !== true) return { analysis: existing.data, cached: true };
  const msgs = await client.from("journal_messages").select("role,body").eq("conversation_id", conv.id).eq("user_id", userId).order("created_at").limit(2000);
  if (msgs.error) throw msgs.error;
  if (!msgs.data.some((m) => m.role === "user")) throw new Bad("invalid", "There’s nothing of yours to analyse yet.");
  const people = await client.from("journal_tags").select("name").eq("user_id", userId).eq("kind", "person").limit(200);
  const attempt = existing.data ? (existing.data.revision ?? 1) + 1 : 1;
  const usage = await begin(admin, userId, { kind: "analysis", requestKey: `analysis:${conv.id}:${body.regenerate === true ? `r${attempt}` : "1"}`, conversationId: conv.id, model: config.model, estimateUsd: estimateUsd(config.model, approxTokens(ANALYSIS_RULES.length + Math.min(60000, msgs.data.reduce((n, m) => n + m.body.length + 12, 0))), 3500) });
  await client.from("journal_conversations").update({ analysis_status: "pending" }).eq("id", conv.id).eq("user_id", userId);
  try {
    const input: InputMessage[] = [{ role: "user", content: `${conv.continues_title ? `This entry continues an earlier one, “${conv.continues_title}” (${conv.continues_date}).\n\n` : ""}${people.data?.length ? `Existing person names: ${people.data.map((p) => p.name).join(", ")}\n\n` : ""}Conversation:\n\n${transcript(msgs.data as { role: "user" | "assistant"; body: string }[])}` }];
    const out = await generate(config, { instructions: ANALYSIS_RULES, input, maxOutputTokens: 3500, effort: "low", schema: { name: "journal_analysis", schema: analysisSchema } });
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
  if (typeof body.weekStart !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.weekStart) || new Date(`${body.weekStart}T12:00:00Z`).getUTCDay() !== 1) throw new Bad("invalid", "Choose a week.");
  const start = body.weekStart, end = addDays(start, 6);
  const rows = await client.from("journal_conversations").select("*").eq("user_id", userId).gte("local_date", start).lte("local_date", end).neq("status", "draft").order("local_date").limit(300);
  if (rows.error) throw rows.error;
  const list = rows.data.map(conversationFromRow).filter(isListed);
  if (!list.length) throw new Bad("invalid", "There are no entries in this week to reflect on.");
  const signature = sourceSignature(list);
  const cached = await client.from("journal_reports").select("*").eq("user_id", userId).eq("week_start", start).maybeSingle();
  if (cached.data && body.regenerate !== true) return { report: cached.data, cached: true, stale: cached.data.source_signature !== signature };
  const [links, tags, journals, firsts] = await Promise.all([
    client.from("journal_entry_tags").select("conversation_id,tag_id,source").eq("user_id", userId).in("conversation_id", list.map((c) => c.id)),
    client.from("journal_tags").select("*").eq("user_id", userId).limit(5000),
    client.from("journal_journals").select("id,name").eq("user_id", userId),
    client.from("journal_messages").select("conversation_id,body,created_at").eq("user_id", userId).eq("role", "user").in("conversation_id", list.map((c) => c.id)).order("created_at").limit(list.length * 4),
  ]);
  const stats = weekStats(start, list, (links.data ?? []).map((l) => ({ conversationId: l.conversation_id, tagId: l.tag_id, source: l.source as "user" | "ai" })), (tags.data ?? []).map((t) => ({ id: t.id, kind: t.kind as "person", name: t.name, normalized: t.normalized ?? "", aliases: t.aliases, note: t.note, revision: t.revision })));
  const names = new Map((journals.data ?? []).map((j) => [j.id, j.name])), first = new Map<string, string>();
  for (const m of firsts.data ?? []) if (!first.has(m.conversation_id)) first.set(m.conversation_id, m.body.slice(0, 700));
  const entries = list.map((c) => `- ${new Date(`${c.localDate}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })} · ${names.get(c.journalId) ?? "Journal"} · “${c.title || "Untitled"}”\n  ${c.summary ? `Summary: ${c.summary}` : `Their words: ${first.get(c.id) ?? ""}`}`).join("\n");
  const facts = `Week ${start} to ${end}. ${stats.entries} entries on ${stats.days} days, ${stats.words} words. People: ${stats.tags.person.slice(0, 8).map((p) => `${p.name} (${p.entries})`).join(", ") || "none tagged"}. Topics: ${stats.tags.topic.slice(0, 8).map((p) => p.name).join(", ") || "none tagged"}.`;
  const usage = await begin(admin, userId, { kind: "report", requestKey: `report:${start}:${signature.slice(0, 60)}:${body.regenerate === true ? Date.now() : "1"}`, conversationId: null, model: config.model, estimateUsd: estimateUsd(config.model, approxTokens(REPORT_RULES.length + facts.length + entries.length), 1600) });
  try {
    const out = await generate(config, { instructions: REPORT_RULES, input: [{ role: "user", content: `${facts}\n\nEntries:\n${entries}` }], maxOutputTokens: 1600, effort: "low", schema: { name: "journal_report", schema: reportSchema } });
    await finish(admin, usage.id, out.model, { usage: out.usage });
    let parsed: unknown; try { parsed = JSON.parse(out.text); } catch { parsed = null; }
    const data = parseReportData(parsed);
    if (!data.narrative) throw new ProviderError("failed", "The reflection came back unreadable.");
    const saved = await client.from("journal_reports").upsert({ user_id: userId, week_start: start, data, source_ids: list.map((c) => c.id), source_signature: signature, model: out.model }, { onConflict: "user_id,week_start" }).select("*").single();
    if (saved.error) throw saved.error;
    return { report: saved.data, cached: false, stale: false };
  } catch (e) { await finish(admin, usage.id, config.model, { error: e instanceof ProviderError ? e.code : "failed" }); throw e; }
}
