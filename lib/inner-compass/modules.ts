/**
 * Inner Compass modules (#211): one registry of typed, optional, reorderable content blocks shared by Chapters and
 * Experiences. A module's content is JSON validated here (the database checks only its size), so adding a field is a
 * registry change, not a migration. Nothing is created by default: a Chapter or Experience shows only what the person
 * added.
 *
 * References inside modules (discoveries, Visions, exploration responses, Tarot readings, dreams, Planner Intentions)
 * are id + name snapshot, never copies: renaming or deleting the record later shows "now …" or "no longer there".
 */
import type { BoardImage } from "@/lib/constellation-board";
import type { MuseGlyphName } from "@/components/design/MuseGlyph";

export type Owner = "chapter" | "experience";
export type RefKind = "discovery" | "vision" | "exploration" | "tarot" | "dream";
export type Ref = { id: string; label: string; date?: string; category?: string };
export type PlannerRef = { period: "week" | "month" | "quarter" | "year"; start: string; label: string };
export type Field =
  | { key: string; kind: "text"; label: string; max: number; placeholder?: string }
  | { key: string; kind: "textarea"; label: string; max: number; rows?: number; placeholder?: string }
  | { key: string; kind: "choice"; label: string; options: { id: string; label: string }[] }
  | { key: string; kind: "date"; label: string }
  | { key: string; kind: "toggle"; label: string }
  | { key: string; kind: "image"; label: string }
  | { key: string; kind: "images"; label: string; max: number }
  | { key: string; kind: "lines"; label: string; max: number; placeholder?: string }
  | { key: string; kind: "refs"; label: string; ref: RefKind }
  | { key: string; kind: "planner"; label: string }
  | { key: string; kind: "material"; label: string }
  /** Formatted writing (headings, lists, emphasis) stored as a TipTap document; older plain text still reads. `max` counts characters of text. */
  | { key: string; kind: "richtext"; label: string; max: number };
export type RichDoc = { type: "doc"; content?: unknown[] };
export type Value = string | boolean | string[] | BoardImage | BoardImage[] | Ref[] | PlannerRef | RichDoc | undefined;
export type Item = { id: string; [key: string]: Value };
export type Content = { items?: Item[]; embracing?: Item[]; releasing?: Item[]; refs?: Ref[]; [key: string]: Value | Item[] };

type Shape = "items" | "pair" | "fields" | "refs" | "linked";
export type ModuleDef = {
  type: ModuleType; label: string; hint: string; glyph: MuseGlyphName; tone: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; group: Group; owners: Owner[];
  shape: Shape; single?: boolean; fields?: Field[]; ref?: RefKind; maxItems?: number; addLabel?: string;
  /** Items are written one per line (Enter starts the next) and shown as a numbered list; each line is still its own item. */
  lineEntry?: boolean;
};
export type Group = "meaning" | "words" | "artifacts" | "connections";
export const groups: { id: Group; label: string }[] = [
  { id: "meaning", label: "Meaning" }, { id: "words", label: "Words to carry" }, { id: "artifacts", label: "Artifacts" }, { id: "connections", label: "Connections" },
];
export const moduleTypes = ["words", "intentions", "mantras", "embrace", "symbols", "discoveries", "visions", "experiences", "reflections", "notes", "photos", "exploration", "discussion", "rituals", "materials", "tarot", "dreams"] as const;
export type ModuleType = typeof moduleTypes[number];
export const isModuleType = (v: unknown): v is ModuleType => typeof v === "string" && (moduleTypes as readonly string[]).includes(v);

const discoveries: Field = { key: "discoveries", kind: "refs", label: "Related discoveries", ref: "discovery" };
const reflection: Field = { key: "reflection", kind: "textarea", label: "Reflection", max: 10000, rows: 3 };
export const mantraKinds = [{ id: "mantra", label: "Mantra" }, { id: "affirmation", label: "Affirmation" }, { id: "declaration", label: "Declaration" }, { id: "quote", label: "Quotation" }, { id: "passage", label: "Passage" }];
export const materialCategories = [{ id: "stone", label: "Stone or crystal" }, { id: "botanical", label: "Herb, flower or plant" }, { id: "candle", label: "Candle or flame" }, { id: "paper", label: "Paper or ink" }, { id: "keepsake", label: "Keepsake" }, { id: "found", label: "Found object" }, { id: "art", label: "Art supply" }, { id: "other", label: "Other" }];
/** Each material category keeps its own colour (a chart tone, so every theme supplies eight distinct ones). */
export const materialCategoryTone: Record<string, number> = { stone: 5, botanical: 3, candle: 4, paper: 2, keepsake: 1, found: 6, art: 7, other: 8 };
const pairItem: Field[] = [{ key: "text", kind: "text", label: "Words", max: 300 }, { key: "description", kind: "textarea", label: "A little more", max: 4000, rows: 2 }, discoveries];

export const modules: Record<ModuleType, ModuleDef> = {
  words: { type: "words", label: "Guiding words", hint: "A word or phrase at the heart of it.", glyph: "sparkle", tone: 2, group: "meaning", owners: ["chapter", "experience"], shape: "items", maxItems: 6, addLabel: "Add a word",
    fields: [{ key: "word", kind: "text", label: "Word or phrase", max: 60, placeholder: "Prosperity" }, { key: "definition", kind: "textarea", label: "What it means to me", max: 6000 },
      { key: "why", kind: "textarea", label: "Why it matters", max: 6000 }, { key: "feel", kind: "textarea", label: "How I want it to feel", max: 6000 },
      { key: "symbolism", kind: "textarea", label: "Symbolism", max: 2000, rows: 1 }, discoveries, reflection, { key: "primary", kind: "toggle", label: "My primary word" }] },
  intentions: { type: "intentions", label: "Intentions", hint: "How you want to meet this season. Not tasks.", glyph: "seedling", tone: 3, group: "meaning", owners: ["chapter", "experience"], shape: "items", maxItems: 12, addLabel: "Add intentions", lineEntry: true,
    fields: [{ key: "text", kind: "textarea", label: "I want to…", max: 500, rows: 2, placeholder: "I want to approach uncertainty with curiosity." }, { key: "meaning", kind: "textarea", label: "What it means to me", max: 6000 },
      discoveries, { key: "planner", kind: "planner", label: "Planner Intentions page" }, reflection] },
  mantras: { type: "mantras", label: "Mantras & affirmations", hint: "Words to carry with you.", glyph: "quote", tone: 7, group: "words", owners: ["chapter", "experience"], shape: "items", maxItems: 20, addLabel: "Add words",
    fields: [{ key: "text", kind: "textarea", label: "Words", max: 4000, rows: 2, placeholder: "I am allowed to take up room." }, { key: "kind", kind: "choice", label: "Kind", options: mantraKinds },
      { key: "attribution", kind: "text", label: "Who said it", max: 120 }, { key: "featured", kind: "toggle", label: "Feature on the Daily Edit" }] },
  embrace: { type: "embrace", label: "Embracing & releasing", hint: "What to welcome, and what to loosen.", glyph: "leaf", tone: 4, group: "meaning", owners: ["chapter", "experience"], shape: "pair", maxItems: 12,
    fields: [reflection] },
  symbols: { type: "symbols", label: "Symbols & sigils", hint: "Emblems, drawings and marks that mean something.", glyph: "constellation", tone: 6, group: "artifacts", owners: ["chapter", "experience"], shape: "items", maxItems: 12, addLabel: "Add a symbol",
    fields: [{ key: "title", kind: "text", label: "Title", max: 120 }, { key: "image", kind: "image", label: "Image or photo" }, { key: "meaning", kind: "textarea", label: "Personal meaning", max: 6000 },
      { key: "createdOn", kind: "date", label: "Created" }, { key: "method", kind: "textarea", label: "How it was made", max: 10000, rows: 4 }, { key: "word", kind: "text", label: "Associated word", max: 120 }, reflection] },
  rituals: { type: "rituals", label: "Rituals & ceremonies", hint: "A practice or ceremony, kept as it happened.", glyph: "crescent", tone: 8, group: "artifacts", owners: ["experience"], shape: "items", maxItems: 12, addLabel: "Add a ritual or ceremony",
    fields: [{ key: "title", kind: "text", label: "Title", max: 160 }, { key: "date", kind: "date", label: "Date" }, { key: "purpose", kind: "textarea", label: "Purpose or intention", max: 6000 },
      { key: "happened", kind: "textarea", label: "What happened", max: 10000, rows: 4 }, { key: "steps", kind: "lines", label: "Steps", max: 30, placeholder: "A step" },
      { key: "objects", kind: "textarea", label: "Meaningful objects and what they stood for", max: 6000 }, { key: "photos", kind: "images", label: "Photos", max: 8 },
      { key: "participants", kind: "text", label: "With", max: 300 }, { key: "feelings", kind: "textarea", label: "Feelings or impressions", max: 6000 },
      { key: "word", kind: "text", label: "Related guiding word", max: 60 }, { key: "symbol", kind: "text", label: "Related symbol", max: 120 }, reflection] },
  materials: { type: "materials", label: "Materials & meaningful objects", hint: "Stones, plants, paper, keepsakes, supplies.", glyph: "gem", tone: 1, group: "artifacts", owners: ["experience"], shape: "items", maxItems: 40, addLabel: "Add a material",
    fields: [{ key: "name", kind: "material", label: "Material" }, { key: "category", kind: "choice", label: "Category", options: materialCategories }, { key: "quantity", kind: "text", label: "Quantity", max: 60 },
      { key: "notes", kind: "textarea", label: "Notes", max: 4000 }, { key: "meaning", kind: "textarea", label: "What it means to me", max: 6000 }, { key: "image", kind: "image", label: "Photo" }] },
  photos: { type: "photos", label: "Photos & memories", hint: "Pictures worth keeping, with a caption.", glyph: "palette", tone: 5, group: "artifacts", owners: ["chapter", "experience"], shape: "fields",
    fields: [{ key: "images", kind: "images", label: "Photos", max: 12 }, { key: "caption", kind: "textarea", label: "Caption or memory", max: 6000 }] },
  notes: { type: "notes", label: "Notes", hint: "Anything, in your own words.", glyph: "quill", tone: 7, group: "words", owners: ["chapter", "experience"], shape: "fields",
    fields: [{ key: "text", kind: "richtext", label: "Notes", max: 40000 }] },
  discussion: { type: "discussion", label: "Discussion notes", hint: "What was talked about, and by whom.", glyph: "letter", tone: 3, group: "words", owners: ["experience"], shape: "fields",
    fields: [{ key: "topic", kind: "text", label: "Topic", max: 200 }, { key: "people", kind: "text", label: "Who was there", max: 300 }, { key: "text", kind: "richtext", label: "Notes", max: 40000 }] },
  discoveries: { type: "discoveries", label: "Inner World discoveries", hint: "Values, qualities and beliefs that belong here.", glyph: "compass", tone: 6, group: "connections", owners: ["chapter", "experience"], shape: "refs", ref: "discovery", single: true },
  visions: { type: "visions", label: "Linked Visions", hint: "Vision Boards and Books from Envision.", glyph: "palette", tone: 4, group: "connections", owners: ["chapter", "experience"], shape: "refs", ref: "vision", single: true },
  exploration: { type: "exploration", label: "Guided exploration", hint: "An exploration you answered, or a new one.", glyph: "telescope", tone: 2, group: "connections", owners: ["experience"], shape: "refs", ref: "exploration", single: true },
  tarot: { type: "tarot", label: "Tarot readings", hint: "Saved readings from Tarot.", glyph: "card", tone: 8, group: "connections", owners: ["chapter", "experience"], shape: "refs", ref: "tarot", single: true },
  dreams: { type: "dreams", label: "Dreams", hint: "Saved dreams from Dreamscapes.", glyph: "crescent", tone: 5, group: "connections", owners: ["chapter", "experience"], shape: "refs", ref: "dream", single: true },
  experiences: { type: "experiences", label: "Experiences", hint: "Moments from this season, each its own record.", glyph: "map", tone: 3, group: "connections", owners: ["chapter"], shape: "linked", single: true },
  reflections: { type: "reflections", label: "Reflections", hint: "Dated notes on how this season feels.", glyph: "journal", tone: 7, group: "words", owners: ["chapter"], shape: "linked", single: true },
};
export const modulesFor = (owner: Owner) => moduleTypes.map((t) => modules[t]).filter((m) => m.owners.includes(owner));

// ---------- Parsing (drops what it doesn't understand, never content it does) ----------
const idOk = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9-]{1,64}$/.test(v);
const recordIdOk = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_.:/-]{1,100}$/.test(v);
const dateOk = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const obj = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
export const isImage = (v: unknown): v is BoardImage => { const o = obj(v); return typeof o.id === "string" && typeof o.path === "string" && typeof o.thumbnailPath === "string"; };
/** A TipTap document small enough to keep (the module row allows 200 KB in all). */
export const isRichDoc = (v: unknown): v is RichDoc => { const o = obj(v); return o.type === "doc" && (o.content === undefined || Array.isArray(o.content)) && JSON.stringify(v).length <= 150000; };
/** The words in a rich-text value (or plain text as-is), for emptiness checks, previews and search. */
export function richText(v: unknown): string {
  if (typeof v === "string") return v;
  const walk = (n: unknown): string => { const o = obj(n); return typeof o.text === "string" ? o.text : Array.isArray(o.content) ? o.content.map(walk).join(o.type === "doc" || o.type === "bulletList" || o.type === "orderedList" ? "\n" : "") : ""; };
  return walk(v);
}
function parseRef(v: unknown): Ref | undefined {
  const o = obj(v);
  if (!recordIdOk(o.id)) return undefined;
  return { id: o.id, label: typeof o.label === "string" && o.label.trim() ? o.label.slice(0, 300) : "Untitled", ...(dateOk(o.date) ? { date: o.date } : {}), ...(typeof o.category === "string" ? { category: o.category.slice(0, 40) } : {}) };
}
const parseRefs = (v: unknown) => (Array.isArray(v) ? v : []).map(parseRef).filter((r): r is Ref => !!r).filter((r, i, all) => all.findIndex((x) => x.id === r.id) === i).slice(0, 60);
function parsePlanner(v: unknown): PlannerRef | undefined {
  const o = obj(v), period = ["week", "month", "quarter", "year"].find((p) => p === o.period) as PlannerRef["period"] | undefined;
  return period && dateOk(o.start) ? { period, start: o.start, label: typeof o.label === "string" ? o.label.slice(0, 120) : "" } : undefined;
}
export function parseValue(f: Field, v: unknown): Value {
  switch (f.kind) {
    case "text": case "textarea": return typeof v === "string" && v.length ? v.slice(0, f.max) : undefined;
    case "material": return typeof v === "string" && v.length ? v.slice(0, 120) : undefined;
    case "choice": return f.options.find((o) => o.id === v)?.id;
    case "date": return dateOk(v) ? v : undefined;
    case "toggle": return v === true ? true : undefined;
    case "image": return isImage(v) ? v : undefined;
    case "images": return Array.isArray(v) && v.some(isImage) ? v.filter(isImage).slice(0, f.max) : undefined;
    case "lines": return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 500)).slice(0, f.max) : undefined;
    case "refs": { const r = parseRefs(v); return r.length ? r : undefined; }
    case "planner": return parsePlanner(v);
    case "richtext": return typeof v === "string" ? (v.length ? v.slice(0, f.max) : undefined) : isRichDoc(v) && richText(v).trim() ? v : undefined;
  }
}
function parseItem(fields: Field[], v: unknown, extra: Field[] = []): Item | undefined {
  const o = obj(v);
  if (!idOk(o.id)) return undefined;
  const item: Item = { id: o.id };
  for (const f of [...fields, ...extra]) { const value = parseValue(f, o[f.key]); if (value !== undefined) item[f.key] = value; }
  if (o.refKey && typeof o.refKey === "string" && /^[a-z0-9-]{1,60}$/.test(o.refKey)) item.refKey = o.refKey;
  const from = parseRefs(o.from).slice(0, 1); if (from.length) item.from = from;
  return item;
}
const parseItems = (fields: Field[], v: unknown, max: number) => {
  const seen = new Set<string>();
  return (Array.isArray(v) ? v : []).map((x) => parseItem(fields, x)).filter((x): x is Item => !!x && !seen.has(x.id) && !!seen.add(x.id)).slice(0, max);
};
export function parseContent(type: ModuleType, v: unknown): Content {
  const def = modules[type], o = obj(v);
  switch (def.shape) {
    case "items": return { items: parseItems(def.fields!, o.items, def.maxItems ?? 20) };
    case "pair": { const out: Content = { embracing: parseItems(pairItem, o.embracing, def.maxItems ?? 12), releasing: parseItems(pairItem, o.releasing, def.maxItems ?? 12) }; const r = parseValue(reflection, o.reflection); if (r) out.reflection = r; return out; }
    case "fields": { const out: Content = {}; for (const f of def.fields!) { const x = parseValue(f, o[f.key]); if (x !== undefined) out[f.key] = x; } return out; }
    case "refs": return { refs: parseRefs(o.refs) };
    case "linked": return {};
  }
}
export const pairFields = pairItem;

/** Whether a module holds anything the person wrote or chose (removing it then needs a confirmation). */
export function moduleHasContent(type: ModuleType, c: Content): boolean {
  const def = modules[type];
  if (def.shape === "linked") return false;
  const filled = (v: unknown) => Array.isArray(v) ? v.length > 0 : typeof v === "string" ? !!v.trim() : isRichDoc(v) ? !!richText(v).trim() : !!v;
  if (def.shape === "items") return (c.items ?? []).some((i) => Object.entries(i).some(([k, v]) => k !== "id" && filled(v)));
  if (def.shape === "pair") return !!(c.embracing?.length || c.releasing?.length || filled(c.reflection));
  if (def.shape === "refs") return !!c.refs?.length;
  return Object.values(c).some(filled);
}
/** The words an item leads with (its first text field), for previews, carry-forward and "Save as discovery". */
export function itemHeadline(type: ModuleType, item: Item): string {
  const f = modules[type].fields?.find((x) => x.kind === "text" || x.kind === "textarea" || x.kind === "material");
  const v = f ? item[f.key] : item.text;
  return typeof v === "string" ? v.trim() : "";
}
export function blankItem(id: string = crypto.randomUUID()): Item { return { id }; }
export function emptyContent(type: ModuleType): Content {
  const s = modules[type].shape;
  return s === "items" ? { items: [] } : s === "pair" ? { embracing: [], releasing: [] } : s === "refs" ? { refs: [] } : {};
}
/** A copy for Duplicate or Carry Forward: new item ids, provenance kept on items when a source is given. */
export function copyContent(type: ModuleType, c: Content, from?: { id: string; label: string }): Content {
  const re = (items?: Item[]) => items?.map((i) => ({ ...i, id: crypto.randomUUID(), ...(from ? { from: [{ id: from.id, label: from.label }] as Ref[] } : {}) }));
  const out: Content = JSON.parse(JSON.stringify(c));
  if (out.items) out.items = re(out.items);
  if (out.embracing) out.embracing = re(out.embracing);
  if (out.releasing) out.releasing = re(out.releasing);
  void type;
  return out;
}
/** Featured mantras across modules, for the Daily Edit widget (only those the person featured). */
export const featuredMantras = (contents: Content[]) => contents.flatMap((c) => (c.items ?? []).filter((i) => i.featured === true && typeof i.text === "string" && i.text.trim()));
