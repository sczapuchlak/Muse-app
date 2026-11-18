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

// ---------- Materials reference (#211) ----------
import materialsJson from "@/content/inner-compass/materials.json";
export type MaterialRef = { key: string; name: string; alt: string[]; category: string; description: string; traits?: string; associations: string[]; history?: string; sources: string[] };
export const materialsDisclaimer = materialsJson.disclaimer;
export const materials: MaterialRef[] = materialsJson.materials;
export const material = (key: string | undefined) => key ? materials.find((m) => m.key === key) : undefined;
/** Suggestions while typing a material; matching is optional and a custom name is always allowed. */
/** The library material with exactly this name or alternate name (for materials typed in before the library had them). */
export function materialByName(name: string | undefined): MaterialRef | undefined {
  const n = (name ?? "").trim().toLowerCase().replace(/[’']/g, "");
  return n ? materials.find((m) => [m.name, ...m.alt].some((x) => x.toLowerCase().replace(/[’']/g, "") === n)) : undefined;
}
export function searchMaterials(q: string, limit = 8): MaterialRef[] {
  const s = q.trim().toLowerCase().replace(/[’']/g, "");
  if (!s) return [];
  const name = (m: MaterialRef) => [m.name, ...m.alt].map((x) => x.toLowerCase().replace(/[’']/g, ""));
  return materials.filter((m) => name(m).some((n) => n.includes(s))).sort((a, b) => Number(!name(a).some((n) => n.startsWith(s))) - Number(!name(b).some((n) => n.startsWith(s)))).slice(0, limit);
}
