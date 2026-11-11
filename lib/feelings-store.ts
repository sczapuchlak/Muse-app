/**
 * Persistence for a person's feelings library (#130): custom feelings and favorites. Owner-only rows; recorded entries
 * never depend on these rows (they keep their own snapshot), so editing or deleting here cannot change history.
 */
import type { createMuseBrowserClient } from "@/lib/supabase/client";
import { cleanFeelingName, findFeelingByName, isQuadrant, MAX_CUSTOM_FEELINGS, quadrantEmoji, type CustomFeeling } from "./feelings";
import type { Emotion, EmotionQuadrant } from "./models";

type Client = ReturnType<typeof createMuseBrowserClient>;
const columns = "id,name,quadrant,emoji,favorite";
type Row = { id: string; name: string; quadrant: string; emoji: string | null; favorite: boolean };
const fromRow = (r: Row): CustomFeeling => ({ id: r.id, name: r.name, quadrant: isQuadrant(r.quadrant) ? r.quadrant : "blue", emoji: r.emoji, favorite: r.favorite });
/** Postgres "table missing" codes: this server hasn't had the custom-feelings migration yet. */
export const feelingsUnavailable = (e: unknown) => ["PGRST205", "42P01"].includes((e as { code?: string })?.code ?? "");

export async function readCustomFeelings(client: Client): Promise<CustomFeeling[]> {
  const { data, error } = await client.from("custom_feelings").select(columns).order("name").limit(MAX_CUSTOM_FEELINGS + 10);
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}
export async function readCatalogFavorites(client: Client): Promise<string[]> {
  const { data, error } = await client.from("emotion_favorites").select("emotion_id");
  if (error) throw error;
  return data.map((r) => r.emotion_id);
}

export type FeelingDraft = { name: string; quadrant: EmotionQuadrant };
/** Why a draft can't be saved, in the person's terms. `existing` is the word it collides with. */
export function draftProblem(draft: FeelingDraft, catalog: readonly Emotion[], custom: readonly CustomFeeling[], editingId?: string): { kind: "empty" | "duplicate-shared" | "duplicate-custom" | "limit"; existing?: Emotion | CustomFeeling } | null {
  const name = cleanFeelingName(draft.name);
  if (!name) return { kind: "empty" };
  const mine = findFeelingByName(name, custom, (c) => c.id === editingId);
  if (mine) return { kind: "duplicate-custom", existing: mine };
  const shared = findFeelingByName(name, catalog);
  if (shared) return { kind: "duplicate-shared", existing: shared };
  if (!editingId && custom.length >= MAX_CUSTOM_FEELINGS) return { kind: "limit" };
  return null;
}
export async function createCustomFeeling(client: Client, draft: FeelingDraft): Promise<CustomFeeling> {
  const name = cleanFeelingName(draft.name);
  if (!name || !isQuadrant(draft.quadrant)) throw Error("Give the feeling a name and choose how it feels.");
  const { data, error } = await client.from("custom_feelings").insert({ name, quadrant: draft.quadrant, emoji: quadrantEmoji[draft.quadrant] }).select(columns).single();
  if (error) { if (error.code === "23505") throw Error(`You already have “${name}”.`); throw error; }
  return fromRow(data as Row);
}
export async function updateCustomFeeling(client: Client, id: string, patch: Partial<FeelingDraft & { favorite: boolean }>): Promise<CustomFeeling> {
  const row: { name?: string; quadrant?: string; emoji?: string; favorite?: boolean } = {};
  if (patch.name !== undefined) { const name = cleanFeelingName(patch.name); if (!name) throw Error("A feeling needs a name."); row.name = name; }
  if (patch.quadrant !== undefined) { if (!isQuadrant(patch.quadrant)) throw Error("Choose how it feels."); row.quadrant = patch.quadrant; row.emoji = quadrantEmoji[patch.quadrant]; }
  if (patch.favorite !== undefined) row.favorite = patch.favorite;
  const { data, error } = await client.from("custom_feelings").update(row).eq("id", id).select(columns).single();
  if (error) { if (error.code === "23505") throw Error("You already have a feeling with that name."); throw error; }
  return fromRow(data as Row);
}
export async function deleteCustomFeeling(client: Client, id: string) {
  const { error } = await client.from("custom_feelings").delete().eq("id", id);
  if (error) throw error;
}
export async function setCatalogFavorite(client: Client, emotionId: string, favorite: boolean) {
  const res = favorite ? await client.from("emotion_favorites").insert({ emotion_id: emotionId }) : await client.from("emotion_favorites").delete().eq("emotion_id", emotionId);
  if (res.error && res.error.code !== "23505") throw res.error;
}
