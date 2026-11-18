/** Browser side of /api/journal/ai: status, streamed replies (NDJSON) and plain JSON actions. */
export type AiStatus = {
  enabled: boolean; entitled: boolean; configured: boolean; provider: "openai" | "mock" | null; model: string | null;
  allowance: { dailyLimit: number; monthlyLimit: number; warnAt: number; ceiling: number; spentToday: number; spentMonth: number; reserved: number; requestsToday: number; requestsMonth: number; warning: boolean; exhausted: boolean; byKind: Record<string, { requests: number; cost: number; inputTokens: number; outputTokens: number }> } | null;
};
export class AiError extends Error { constructor(public code: string, message: string) { super(message); } }

export async function aiStatus(): Promise<AiStatus> {
  try { const r = await fetch("/api/journal/ai", { cache: "no-store" }); if (!r.ok) throw Error(); return await r.json(); }
  catch { return { enabled: false, entitled: false, configured: false, provider: null, model: null, allowance: null }; }
}

/** Streams one generation; `onDelta` receives text as it arrives. Resolves with the closing event. */
export async function aiStream<T = Record<string, unknown>>(body: Record<string, unknown>, onDelta: (text: string) => void, signal?: AbortSignal): Promise<T> {
  let r: Response;
  try { r = await fetch("/api/journal/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal }); }
  catch { throw new AiError("offline", "Muse couldn’t reach the journal AI. Your words are saved; try again."); }
  if (!r.ok || !r.body) { const e = await r.json().catch(() => ({})); throw new AiError(e.code ?? "failed", e.error ?? "The reply couldn’t start."); }
  const reader = r.body.getReader(), decoder = new TextDecoder();
  let buffer = "", done: T | null = null;
  for (;;) {
    const { value, done: end } = await reader.read();
    if (end) break;
    buffer += decoder.decode(value, { stream: true });
    let cut: number;
    while ((cut = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, cut).trim(); buffer = buffer.slice(cut + 1);
      if (!line) continue;
      const event = JSON.parse(line) as { t: string; d?: string; code?: string; error?: string };
      if (event.t === "delta" && event.d) onDelta(event.d);
      else if (event.t === "error") throw new AiError(event.code ?? "failed", event.error ?? "The reply couldn’t be finished.");
      else if (event.t === "done") done = event as unknown as T;
    }
  }
  if (!done) throw new AiError("interrupted", "The reply was interrupted. Your message is saved; try again.");
  return done;
}

export async function aiAction<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  let r: Response;
  try { r = await fetch("/api/journal/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
  catch { throw new AiError("offline", "Muse couldn’t reach the journal AI."); }
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new AiError(json.code ?? "failed", json.error ?? "That didn’t work.");
  return json as T;
}
