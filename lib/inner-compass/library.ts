/**
 * Inner Compass editorial library (#210), bundled from content/inner-compass at build time. Kept apart from anything
 * a person writes: responses store each prompt as it was asked, so this library can grow or change freely.
 */
import explorationsJson from "@/content/inner-compass/explorations.json";
import wordsJson from "@/content/inner-compass/words.json";
import { isCategory, type Category } from "./categories";

export type ExplorationTheme = "identity" | Category;
export type Prompt = { key: string; text: string };
export type Exploration = { key: string; category: ExplorationTheme; saveAs: Category; title: string; intro: string; prompts: Prompt[] };
export type Word = { word: string; gloss: string; family: string };

export const themes = explorationsJson.categories as Record<ExplorationTheme, { label: string; line: string }>;
export const themeOrder: ExplorationTheme[] = ["identity", "values", "character", "beliefs", "philosophy", "boundaries", "patterns"];
export const explorations: Exploration[] = explorationsJson.explorations.map((e) => ({
  key: e.key, category: (e.category === "identity" || isCategory(e.category) ? e.category : "identity") as ExplorationTheme,
  saveAs: isCategory(e.saveAs) ? e.saveAs : "patterns", title: e.title, intro: e.intro, prompts: e.prompts,
}));
export const exploration = (key: string) => explorations.find((e) => e.key === key);

const words = (groups: { family: string; words: string[][] }[]): Word[] => groups.flatMap((g) => g.words.map(([word, gloss]) => ({ word, gloss, family: g.family })));
export const wordLibrary: Record<"values" | "character", Word[]> = { values: words(wordsJson.values), character: words(wordsJson.character) };
export const families = (kind: "values" | "character") => [...new Set(wordLibrary[kind].map((w) => w.family))];

/** One exploration to feature today: stable for the day, different tomorrow, never one the person just did. */
export function featured(dayKey: string, recentlyDone: Set<string> = new Set()): Exploration {
  let h = 0;
  for (const c of dayKey) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  for (let i = 0; i < explorations.length; i++) { const e = explorations[(h + i) % explorations.length]; if (!recentlyDone.has(e.key)) return e; }
  return explorations[h % explorations.length];
}
