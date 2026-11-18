import "server-only";
/**
 * AI entitlement, budget and usage (Journal V1 §21–22; budget brief: $10/month, warning at $7.50). Entitlements and
 * usage rows are written only here, with the service role, so a browser can't grant itself access or erase usage.
 *
 * Every request (replies, openings, analyses, weekly reflections, Studio tests) shares one budget:
 *  - before it starts, a conservative cost estimate is reserved on its usage row (`estimated_usd`), so requests in
 *    flight count against the allowance;
 *  - a request is refused if the month's (or day's) spend plus reservations plus its own estimate would pass the limit;
 *  - at most two requests run at once per person (a reply and an analysis can overlap), plus a per-minute cap;
 *  - when it finishes, the estimate is replaced by the cost computed from the provider's reported token counts.
 * These are Muse's own application-side limits (UTC day and month). They are not a provider billing cap.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { costUsd, prices, type Usage } from "../pricing";

type Admin = SupabaseClient<Database>;
export type Kind = "reply" | "opening" | "analysis" | "report" | "test";
export type Allowance = {
  enabled: boolean; dailyLimit: number; monthlyLimit: number; warnAt: number; perMinute: number; ceiling: number;
  spentToday: number; spentMonth: number; reserved: number; inFlight: number; requestsToday: number; requestsMonth: number; warning: boolean; exhausted: boolean;
  byKind: Record<Kind, { requests: number; cost: number; inputTokens: number; outputTokens: number }>;
};
export class UsageError extends Error { constructor(public code: "not-entitled" | "limit-daily" | "limit-monthly" | "too-fast" | "duplicate" | "in-progress" | "busy" | "invalid", message: string) { super(message); } }

const STALE_MS = 120_000, MAX_IN_FLIGHT = 2;
const startOfUtcDay = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
const startOfUtcMonth = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
/** The most an owner may set their own monthly budget to without changing the server's configuration. */
export const budgetCeiling = () => { const n = Number(process.env.JOURNAL_AI_BUDGET_CEILING_USD); return Number.isFinite(n) && n > 0 ? n : 25; };

/** A deliberately high estimate: every input token uncached, every allowed output token used. */
export function estimateUsd(model: string, inputTokens: number, maxOutputTokens: number) {
  return costUsd(prices[model] ? model : "__unknown__", { inputTokens: Math.ceil(inputTokens * 1.15), cachedTokens: 0, outputTokens: maxOutputTokens });
}

export async function allowance(admin: Admin, userId: string): Promise<Allowance> {
  const [e, u] = await Promise.all([
    admin.from("journal_ai_entitlements").select("*").eq("user_id", userId).maybeSingle(),
    admin.from("journal_ai_usage").select("kind,cost_usd,estimated_usd,created_at,status,input_tokens,output_tokens").eq("user_id", userId).gte("created_at", startOfUtcMonth()).limit(20000),
  ]);
  if (e.error) throw e.error; if (u.error) throw u.error;
  const day = startOfUtcDay(), rows = u.data ?? [], now = Date.now();
  const byKind = Object.fromEntries((["reply", "opening", "analysis", "report", "test"] as Kind[]).map((k) => [k, { requests: 0, cost: 0, inputTokens: 0, outputTokens: 0 }])) as Allowance["byKind"];
  let spentToday = 0, spentMonth = 0, reserved = 0, requestsToday = 0, inFlight = 0;
  for (const r of rows) {
    const live = r.status === "pending" && now - Date.parse(r.created_at) < STALE_MS;
    const cost = live ? Number(r.estimated_usd) || 0 : Number(r.cost_usd) || 0;
    if (live) { reserved += cost; inFlight++; } else spentMonth += cost;
    const k = byKind[r.kind as Kind]; if (k) { k.requests++; k.cost += live ? 0 : cost; k.inputTokens += r.input_tokens; k.outputTokens += r.output_tokens; }
    if (r.created_at >= day) { if (!live) spentToday += cost; requestsToday++; }
  }
  const monthlyLimit = Number(e.data?.monthly_limit_usd ?? 10), dailyLimit = Number(e.data?.daily_limit_usd ?? 2), warnAt = Number(e.data?.warn_at_usd ?? 7.5);
  return {
    enabled: Boolean(e.data?.enabled), dailyLimit, monthlyLimit, warnAt, perMinute: e.data?.per_minute ?? 8, ceiling: budgetCeiling(),
    spentToday, spentMonth, reserved, inFlight, requestsToday, requestsMonth: rows.length, warning: spentMonth >= warnAt, exhausted: spentMonth >= monthlyLimit || spentToday >= dailyLimit, byKind,
  };
}

/** Checks access, budget and pace, then records a pending request with its reserved estimate under a unique key. */
export async function begin(admin: Admin, userId: string, r: { kind: Kind; requestKey: string; conversationId: string | null; model: string; estimateUsd: number }): Promise<{ id: string; allowance: Allowance }> {
  const a = await allowance(admin, userId);
  if (!a.enabled) throw new UsageError("not-entitled", "AI isn’t turned on for your account. Your journal works fully without it.");
  if (a.spentMonth >= a.monthlyLimit || a.spentMonth + a.reserved + r.estimateUsd > a.monthlyLimit) throw new UsageError("limit-monthly", `This month’s AI budget (${money(a.monthlyLimit)}) is used up. Writing, History, search, tags and saved analyses all keep working; AI returns next month, or raise the budget in Journal settings.`);
  if (a.spentToday >= a.dailyLimit || a.spentToday + a.reserved + r.estimateUsd > a.dailyLimit) throw new UsageError("limit-daily", `Today’s AI allowance (${money(a.dailyLimit)}) is used up. Everything you write still saves; AI returns tomorrow (UTC).`);
  if (a.inFlight >= MAX_IN_FLIGHT) throw new UsageError("busy", "Other AI requests are still running. Try again in a moment.");
  const recent = await admin.from("journal_ai_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", new Date(Date.now() - 60_000).toISOString());
  if (recent.error) throw recent.error;
  if ((recent.count ?? 0) >= a.perMinute) throw new UsageError("too-fast", "That’s a lot of AI requests in a minute. Take a breath and try again shortly.");

  const existing = await admin.from("journal_ai_usage").select("id,status,created_at").eq("user_id", userId).eq("request_key", r.requestKey).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    if (existing.data.status === "ok") throw new UsageError("duplicate", "That request already finished.");
    const stale = existing.data.status === "pending" && Date.now() - Date.parse(existing.data.created_at) > STALE_MS;
    if (existing.data.status === "pending" && !stale) throw new UsageError("in-progress", "Already working on that.");
    // A failed (or abandoned) attempt may be retried: keep its row as history under a retired key.
    const retire = await admin.from("journal_ai_usage").update({ request_key: `${r.requestKey}#${existing.data.id.slice(0, 8)}`.slice(0, 120), status: "failed", ...(existing.data.status === "pending" ? { error_code: "abandoned" } : {}) }).eq("id", existing.data.id);
    if (retire.error) throw retire.error;
  }
  const row = await admin.from("journal_ai_usage").insert({ user_id: userId, kind: r.kind, request_key: r.requestKey, conversation_id: r.conversationId, model: r.model, status: "pending", estimated_usd: Number(r.estimateUsd.toFixed(6)) }).select("id").single();
  if (row.error) { if (row.error.code === "23505") throw new UsageError("in-progress", "Already working on that."); throw row.error; }
  return { id: row.data.id, allowance: a };
}

/** Replaces the reservation with the cost from the provider's token counts (or the tokens it reported before failing). */
export async function finish(admin: Admin, id: string, model: string, outcome: { usage?: Usage; error?: string }) {
  const usage = outcome.usage ?? { inputTokens: 0, cachedTokens: 0, outputTokens: 0 };
  await admin.from("journal_ai_usage").update({
    status: outcome.error ? "failed" : "ok", model, input_tokens: usage.inputTokens, cached_tokens: usage.cachedTokens, output_tokens: usage.outputTokens,
    cost_usd: Number(costUsd(model, usage).toFixed(6)), error_code: outcome.error?.slice(0, 60) ?? null, finished_at: new Date().toISOString(),
  }).eq("id", id);
}

/** The owner changes their own budget within the server's ceiling. Access itself (enabled) is never self-granted. */
export async function setBudget(admin: Admin, userId: string, b: { monthly: number; warnAt: number; daily: number }) {
  const ceiling = budgetCeiling(), ok = (n: number) => Number.isFinite(n) && n >= 0;
  if (![b.monthly, b.warnAt, b.daily].every(ok) || b.monthly > ceiling || b.warnAt > b.monthly || b.daily > b.monthly) throw new UsageError("invalid", `Choose a monthly budget up to ${money(ceiling)}, with the warning and daily guard at or below it.`);
  const row = await admin.from("journal_ai_entitlements").update({ monthly_limit_usd: b.monthly, warn_at_usd: b.warnAt, daily_limit_usd: b.daily, updated_at: new Date().toISOString() }).eq("user_id", userId).eq("enabled", true).select("user_id").maybeSingle();
  if (row.error) throw row.error;
  if (!row.data) throw new UsageError("not-entitled", "AI isn’t turned on for your account.");
}
const money = (n: number) => `$${n.toFixed(2)}`;
