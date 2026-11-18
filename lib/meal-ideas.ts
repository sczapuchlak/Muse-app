import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { weekDates } from "./dates";
import { mealSlots, type MealSlot } from "./models";

/**
 * Meal ideas (Wellness → Meals): loose ideas for one week's breakfasts, lunches, dinners and snacks, kept to shop from.
 * They are not planned meals; nothing here is placed on a day. One row per idea in `meal_ideas`, owned by the person.
 */
export type MealIdea = { id: string; weekStart: string; slot: MealSlot; text: string; position: number };
export const MEAL_IDEA_MAX = 300;
export const weekStartOf = (date: string) => weekDates(date)[0];
export const ideasIn = (ideas: MealIdea[], slot: MealSlot) => ideas.filter((i) => i.slot === slot).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
export const nextPosition = (ideas: MealIdea[], slot: MealSlot) => Math.max(-1, ...ideasIn(ideas, slot).map((i) => i.position)) + 1;
export const cleanIdea = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, MEAL_IDEA_MAX);

type Client = SupabaseClient<Database>;
type Row = Database["public"]["Tables"]["meal_ideas"]["Row"];
const fromRow = (r: Row): MealIdea | null => (mealSlots as readonly string[]).includes(r.slot) ? { id: r.id, weekStart: r.week_start, slot: r.slot as MealSlot, text: r.text, position: r.position } : null;

export async function readMealIdeas(client: Client, weekStart: string): Promise<MealIdea[]> {
  const { data, error } = await client.from("meal_ideas").select("*").eq("week_start", weekStart).order("position");
  if (error) throw error;
  return (data ?? []).map(fromRow).filter((i): i is MealIdea => !!i);
}
export async function insertMealIdeas(client: Client, ideas: MealIdea[]) {
  if (!ideas.length) return;
  const { error } = await client.from("meal_ideas").insert(ideas.map((i) => ({ id: i.id, week_start: i.weekStart, slot: i.slot, text: i.text, position: i.position })));
  if (error) throw error;
}
export async function updateMealIdea(client: Client, id: string, text: string) {
  const { error } = await client.from("meal_ideas").update({ text }).eq("id", id);
  if (error) throw error;
}
export async function deleteMealIdea(client: Client, id: string) {
  const { error } = await client.from("meal_ideas").delete().eq("id", id);
  if (error) throw error;
}
