import "server-only";
/**
 * The one Journal AI provider adapter (Journal V1 §22): OpenAI's Responses API, called from the server only, with
 * `store: false` so OpenAI doesn't keep the response as application state (it may still keep abuse-monitoring logs for
 * up to 30 days; see docs/JOURNAL.md). A local `mock` provider lets the whole flow be built and tested without a key
 * or any paid request; it is refused in production.
 */
import type { InputMessage } from "../context";
import { DEFAULT_MODEL, type Usage } from "../pricing";

export type ProviderConfig = { provider: "openai" | "mock"; model: string; key: string | null };
export class ProviderError extends Error { constructor(public code: "not-configured" | "timeout" | "rate-limited" | "refused" | "incomplete" | "failed", message: string) { super(message); } }

export function providerConfig(): ProviderConfig | null {
  if (process.env.JOURNAL_AI_PROVIDER === "mock" && process.env.VERCEL_ENV !== "production") return { provider: "mock", model: "mock", key: null };
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return { provider: "openai", model: process.env.JOURNAL_AI_MODEL?.trim() || DEFAULT_MODEL, key };
}

export type Call = {
  instructions: string; input: InputMessage[]; maxOutputTokens: number; effort?: "none" | "low" | "medium";
  schema?: { name: string; schema: object }; onDelta?: (text: string) => void; signal?: AbortSignal;
};
export type Result = { text: string; usage: Usage; model: string };

const TIMEOUT = 50_000;

export async function generate(config: ProviderConfig, call: Call): Promise<Result> {
  if (config.provider === "mock") return mock(call);
  let attempt = 0;
  for (;;) {
    try { return await openai(config, call); }
    catch (e) {
      // One retry for transient trouble, only if nothing was streamed yet (so text is never duplicated).
      const transient = e instanceof ProviderError && (e.code === "rate-limited" || e.code === "failed" || e.code === "timeout") && !(e as ProviderError & { streamed?: boolean }).streamed;
      if (!transient || attempt++ >= 1 || call.signal?.aborted) throw e;
      await new Promise((r) => setTimeout(r, 900));
    }
  }
}

async function openai(config: ProviderConfig, call: Call): Promise<Result> {
  const stream = Boolean(call.onDelta);
  const body: Record<string, unknown> = {
    model: config.model, instructions: call.instructions, input: call.input.map((m) => (m.images?.length
      ? { role: m.role, content: [{ type: "input_text", text: m.content }, ...m.images.map((url) => ({ type: "input_image", image_url: url, detail: "high" }))] }
      : { role: m.role, content: m.content })),
    max_output_tokens: call.maxOutputTokens, store: false, stream,
    ...(call.effort ? { reasoning: { effort: process.env.JOURNAL_AI_REASONING?.trim() || call.effort } } : {}),
    ...(call.schema ? { text: { format: { type: "json_schema", name: call.schema.name, strict: true, schema: call.schema.schema } } } : {}),
  };
  const timeout = AbortSignal.timeout(TIMEOUT), signal = call.signal ? AbortSignal.any([call.signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  } catch {
    throw new ProviderError(timeout.aborted ? "timeout" : "failed", timeout.aborted ? "The AI took too long to answer." : "The AI service couldn’t be reached.");
  }
  if (!response.ok) {
    // Never log or return the provider's body: it can echo request content.
    if (response.status === 429) throw new ProviderError("rate-limited", "The AI service is busy. Try again in a moment.");
    if (response.status === 401 || response.status === 403) throw new ProviderError("not-configured", "The AI service rejected Muse’s credentials.");
    throw new ProviderError("failed", "The AI service returned an error.");
  }
  if (!stream) return parseFinal(await response.json(), config.model);

  const reader = response.body!.getReader(), decoder = new TextDecoder();
  let buffer = "", text = "", final: unknown = null, streamed = false;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let cut: number;
      while ((cut = buffer.indexOf("\n\n")) >= 0) {
        const chunk = buffer.slice(0, cut); buffer = buffer.slice(cut + 2);
        const data = chunk.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("");
        if (!data || data === "[DONE]") continue;
        let event: { type?: string; delta?: string; response?: unknown; message?: string };
        try { event = JSON.parse(data); } catch { continue; }
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") { text += event.delta; streamed = true; call.onDelta?.(event.delta); }
        else if (event.type === "response.completed" || event.type === "response.incomplete") final = event.response;
        else if (event.type === "response.failed" || event.type === "error") throw Object.assign(new ProviderError("failed", "The AI couldn’t finish that reply."), { streamed });
      }
    }
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    throw Object.assign(new ProviderError(timeout.aborted ? "timeout" : "failed", "The reply was interrupted."), { streamed });
  }
  const parsed = final ? parseFinal(final, config.model, text) : null;
  if (!parsed) throw Object.assign(new ProviderError("incomplete", "The reply was interrupted."), { streamed });
  return parsed;
}

function parseFinal(raw: unknown, model: string, streamedText?: string): Result {
  const r = raw as { status?: string; model?: string; output?: { type?: string; content?: { type?: string; text?: string; refusal?: string }[] }[]; usage?: { input_tokens?: number; output_tokens?: number; input_tokens_details?: { cached_tokens?: number } }; incomplete_details?: { reason?: string } };
  const parts = (r.output ?? []).filter((o) => o.type === "message").flatMap((o) => o.content ?? []);
  if (parts.some((p) => p.type === "refusal")) throw new ProviderError("refused", "The AI declined to answer that.");
  const text = streamedText ?? parts.filter((p) => p.type === "output_text").map((p) => p.text ?? "").join("");
  const usage: Usage = { inputTokens: r.usage?.input_tokens ?? 0, cachedTokens: r.usage?.input_tokens_details?.cached_tokens ?? 0, outputTokens: r.usage?.output_tokens ?? 0 };
  if (!text.trim()) throw Object.assign(new ProviderError(r.status === "incomplete" ? "incomplete" : "failed", r.status === "incomplete" ? "The reply ran out of room." : "The AI returned an empty reply."), { usage });
  return { text: text.trim(), usage, model: r.model ?? model };
}

/**
 * Deterministic stand-in for local development and tests. It reports what it was given (companion, memory lines,
 * retrieved entries) so context assembly can be checked end to end. Never available in production.
 */
async function mock(call: Call): Promise<Result> {
  const all = call.input.map((m) => m.content).join("\n");
  const companion = /## Companion: (.+)/.exec(call.instructions)?.[1] ?? "no companion";
  const titles = [...all.matchAll(/“([^”]+)”/g)].map((m) => m[1]);
  const lastUser = [...call.input].reverse().find((m) => m.role === "user"), last = lastUser?.content ?? "";
  const refTitle = /continue from their journal entry “([^”]+)”/.exec(all)?.[1];
  const continuing = refTitle ? ` Continuing “${refTitle}” (${/The conversation from that entry/.test(all) ? "full" : /no longer in their journal/.test(all) ? "missing" : "summary"}).` : "";
  const guided = /## This entry follows a guide they chose: “([^”]+)”/.exec(all)?.[1];
  const seen = (guided ? ` Guided by “${guided}”.` : "") + continuing + (lastUser?.images?.length ? ` I can see ${lastUser.images.length} photo${lastUser.images.length === 1 ? "" : "s"}.` : "") + (/(?:photo was|photos were) attached here\. You can't see/.test(all) ? " Earlier photos aren't visible to me now." : "");
  const remembered = /Things they've confirmed about themselves:\n((?:- .+\n?)+)/.exec(all)?.[1].trim().split("\n").map((l) => l.slice(2)) ?? [];
  let text: string;
  if (call.schema?.name === "journal_analysis") {
    const mine = all.split("\n").filter((l) => l.startsWith("Me:")).join(" ");
    const names = [...new Set([...mine.matchAll(/(?<=[a-z,] )(\p{Lu}[\p{Ll}]{2,})/gu)].map((m) => m[1]))].slice(0, 5);
    text = JSON.stringify({ title: mine.replace(/^Me:\s*/, "").split(/\s+/).slice(0, 5).join(" ") || "A conversation", recap: `You talked about ${mine.split(/\s+/).length} words' worth of your day.`, reflection: "A closer look (mock): what you wrote, read back.\n\nA second paragraph.", insight: "Mock insight: one thing worth keeping.", people: names, places: [], topics: ["Everyday"], themes: [], emotions: ["excited", "tired", "anxious", "grateful", "happy"].filter((w) => mine.toLowerCase().includes(w)).map((w) => w[0].toUpperCase() + w.slice(1)), observations: [], threads: [], memories: [] });
  } else if (call.schema?.name === "journal_report") {
    text = JSON.stringify({ narrative: `Mock weekly reflection across ${titles.length} entries: ${titles.join("; ") || "none"}.`, threads: [], moments: [], observations: [] });
  } else {
    const testing = /## Test conversation/.test(call.instructions) ? " (test)" : "";
    text = last
      ? `[mock ${companion}${testing}] I heard ${last.trim().split(/\s+/).length} words.${seen}${titles.length ? ` Context: ${titles.join(" | ")}.` : " No journal context."}${remembered.length ? ` Remembered: ${remembered.join(" / ")}.` : ""} What feels most alive in that for you?`
      : `[mock ${companion}] Opening.${titles.length ? ` Context: ${titles.join(" | ")}.` : ""} What's on your mind?`;
  }
  if (call.onDelta) for (const piece of text.match(/[\s\S]{1,12}/g) ?? []) { call.onDelta(piece); await new Promise((r) => setTimeout(r, 4)); }
  return { text, usage: { inputTokens: Math.ceil((call.instructions.length + all.length) / 3.8), cachedTokens: 0, outputTokens: Math.ceil(text.length / 3.8) }, model: "mock" };
}
