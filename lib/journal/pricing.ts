/**
 * Approximate cost of Journal AI requests (Journal V1 §22). Prices are USD per million tokens, standard tier, from
 * OpenAI's pricing page as checked on 2026-11-17. They are estimates for the owner's usage view and the application's
 * own spending limits; the provider's invoice is authoritative. Update this table when prices change.
 */
export type Price = { input: number; cached: number; output: number };
export const prices: Record<string, Price> = {
  "gpt-6.1-terra": { input: 1, cached: 0.05, output: 5 },
  "gpt-6-luna": { input: 0.1, cached: 0.01, output: 0.5 },
  "gpt-6.2-sol": { input: 2, cached: 0.1, output: 10 },
  "gpt-5.6-luna": { input: 0.2, cached: 0.02, output: 1.2 },
  "gpt-5-mini": { input: 0.25, cached: 0.025, output: 2 },
  mock: { input: 0, cached: 0, output: 0 },
};
/** Unknown models are priced like the most expensive listed one, so limits stay conservative. */
const fallback: Price = { input: 10, cached: 1, output: 50 };
export const DEFAULT_MODEL = "gpt-6.1-terra";

export type Usage = { inputTokens: number; cachedTokens: number; outputTokens: number };
export function costUsd(model: string, u: Usage): number {
  const p = prices[model] ?? fallback, cached = Math.min(u.cachedTokens, u.inputTokens);
  return ((u.inputTokens - cached) * p.input + cached * p.cached + u.outputTokens * p.output) / 1_000_000;
}
export const formatUsd = (n: number) => (n < 0.01 && n > 0 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);
