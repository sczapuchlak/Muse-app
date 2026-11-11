/**
 * Intentions prompt persistence (#130): favorites (a marker on a library prompt) and the person's own prompts.
 * Owner-only rows in `intention_prompts`. Adding a prompt to a page copies its title and question into that page's
 * section, so editing or deleting a saved prompt never changes a page that already used it.
 */
import type { createMuseBrowserClient } from "@/lib/supabase/client";
import { isPromptCategory, type PromptCategory, type PromptKind } from "./prompts";
import { intentionPeriods, type IntentionPeriod } from "./periods";

type Client = ReturnType<typeof createMuseBrowserClient>;
export type CustomPrompt = { id: string; title: string; question: string; kind: PromptKind; category: PromptCategory | null; periods: IntentionPeriod[]; favorite: boolean };
export type PromptState = { favorites: Map<string, string>; custom: CustomPrompt[] };
export const MAX_CUSTOM_PROMPTS = 100;
export const MAX_FAVORITES = 200;

const columns = "id,kind,prompt_key,title,question,response,category,periods,favorite";
type Row = { id: string; kind: string; prompt_key: string | null; title: string | null; question: string | null; response: string | null; category: string | null; periods: string[] | null; favorite: boolean };
const periodIds = intentionPeriods.map((p) => p.id);
const toCustom = (r: Row): CustomPrompt => ({
  id: r.id, title: r.title ?? "", question: r.question ?? "", kind: r.response === "list" ? "list" : "writing",
  category: isPromptCategory(r.category) ? r.category : null,
  periods: (r.periods ?? []).filter((p): p is IntentionPeriod => periodIds.includes(p as IntentionPeriod)), favorite: r.favorite,
});
export const emptyPromptState = (): PromptState => ({ favorites: new Map(), custom: [] });

export async function readPromptState(client: Client): Promise<PromptState> {
  const { data, error } = await client.from("intention_prompts").select(columns).order("created_at", { ascending: false }).limit(MAX_CUSTOM_PROMPTS + MAX_FAVORITES);
  if (error) throw error;
  const state = emptyPromptState();
  for (const r of (data ?? []) as Row[]) {
    if (r.kind === "favorite" && r.prompt_key) state.favorites.set(r.prompt_key, r.id);
    else if (r.kind === "custom") state.custom.push(toCustom(r));
  }
  return state;
}

export async function addFavorite(client: Client, promptKey: string): Promise<string> {
  const { data, error } = await client.from("intention_prompts").insert({ kind: "favorite", prompt_key: promptKey }).select("id").single();
  if (error) {
    // Already a favorite (another tab or device): treat as success and find its id.
    if (error.code === "23505") { const found = await client.from("intention_prompts").select("id").eq("kind", "favorite").eq("prompt_key", promptKey).maybeSingle(); if (found.data) return found.data.id; }
    throw error;
  }
  return data.id;
}
export async function removeRow(client: Client, id: string) {
  const { error } = await client.from("intention_prompts").delete().eq("id", id);
  if (error) throw error;
}

export type CustomInput = { title: string; question: string; kind: PromptKind; category: PromptCategory | null; periods: IntentionPeriod[] };
const clean = (i: CustomInput) => ({ title: i.title.trim().slice(0, 60), question: i.question.trim().slice(0, 280), response: i.kind, category: i.category, periods: i.periods });
export const validCustom = (i: CustomInput) => !!i.title.trim() && !!i.question.trim();
export async function saveCustom(client: Client, input: CustomInput): Promise<CustomPrompt> {
  if (!validCustom(input)) throw Error("A prompt needs a short title and a question.");
  const { data, error } = await client.from("intention_prompts").insert({ kind: "custom", ...clean(input) }).select(columns).single();
  if (error) throw error;
  return toCustom(data as Row);
}
export async function updateCustom(client: Client, id: string, input: CustomInput & { favorite?: boolean }): Promise<CustomPrompt> {
  if (!validCustom(input)) throw Error("A prompt needs a short title and a question.");
  const { data, error } = await client.from("intention_prompts").update({ ...clean(input), ...(input.favorite === undefined ? {} : { favorite: input.favorite }) }).eq("id", id).eq("kind", "custom").select(columns).single();
  if (error) throw error;
  return toCustom(data as Row);
}
export async function setCustomFavorite(client: Client, id: string, favorite: boolean) {
  const { error } = await client.from("intention_prompts").update({ favorite }).eq("id", id).eq("kind", "custom");
  if (error) throw error;
}
