/**
 * Planner → Intentions (#117): the forward-looking counterpart to Reflections. One page per person, period type and
 * period start, holding an ordered list of sections with the person's own words.
 *
 * One life, one system:
 * - Linked records (Aspirations, Rituals, Bucket List dreams, Tasks, Agenda events) are referenced by id, never
 *   copied. Each reference keeps a small snapshot of the name (and date) as it was chosen, so renaming or deleting
 *   the record later never rewrites an older page.
 * - Nothing here writes to another module. Turning a priority into a Task is a separate, explicit action in the
 *   Planner; the page only remembers which task it made, so it can't be made twice.
 * - Parsing drops what it doesn't understand but never content it does. Hiding a section keeps its content.
 */
import type { IntentionPeriod } from "./periods";

// ---------- References to records other modules own ----------
export type RefKind = "aspiration" | "ritual" | "bucket" | "task" | "event";
export type Ref = { kind: RefKind; id: string; label: string; date?: string };
const refKinds: RefKind[] = ["aspiration", "ritual", "bucket", "task", "event"];

const str = (v: unknown, max: number) => typeof v === "string" ? v.slice(0, max) : "";
const idOk = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9-]{1,64}$/.test(v);
const recordIdOk = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_.:/-]{1,100}$/.test(v);
const dateOk = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
function ref(v: unknown, allowed: RefKind[] = refKinds): Ref | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>, kind = allowed.find((k) => k === o.kind);
  if (!kind || !recordIdOk(o.id)) return undefined;
  return { kind, id: o.id, label: str(o.label, 200) || "Untitled", ...(dateOk(o.date) ? { date: o.date } : {}) };
}

// ---------- Sections ----------
export const writingPrompts = {
  intention: "What do I want this chapter of my life to feel like?",
  promise: "A mantra, a reminder or a promise worth keeping.",
  vision: "Picture this year going beautifully. What does it look like?",
  custom: "",
} as const;
export type WritingPrompt = keyof typeof writingPrompts;
export const listPrompts = {
  matters: "The few things that matter most.",
  try: "Experiments, experiences, things to learn, little challenges.",
  milestones: "The steps that would tell you it's working.",
  growth: "Who you're growing into, and how.",
  simplify: "What to let go of, pause or make easier.",
  areas: "The parts of life you want to tend to.",
  custom: "",
} as const;
export type ListPrompt = keyof typeof listPrompts;

export type TextItem = { id: string; text: string };
export type PriorityItem = { id: string; text: string; ref?: Ref; taskId?: string };
export type ForwardItem = { id: string; text: string; event?: Ref };
export type LinkItem = { id: string; ref: Ref; note: string };
export type SectionContent = {
  theme: { word: string; text: string };
  writing: { prompt: WritingPrompt; text: string };
  list: { prompt: ListPrompt; items: TextItem[] };
  priorities: { items: PriorityItem[] };
  forward: { items: ForwardItem[] };
  aspirations: { items: LinkItem[] };
  rituals: { items: LinkItem[] };
  bucket: { items: LinkItem[] };
};
export type SectionType = keyof SectionContent;
export type IntentionSection<T extends SectionType = SectionType> = { id: string; type: T; title: string; hidden?: boolean; collapsed?: boolean; content: SectionContent[T] };

/** How many entries a section holds. Priorities stay three to five, like a paper planner page. */
export const MAX_ITEMS: Record<Exclude<SectionType, "theme" | "writing">, number> = { list: 12, priorities: 5, forward: 12, aspirations: 12, rituals: 12, bucket: 12 };
export const MAX_SECTIONS = 30;

/** The sections a person can add. `key` names a section kind (a type plus its prompt). */
export const sectionKinds = [
  { key: "intention", type: "writing", prompt: "intention", title: "My intention", emoji: "🌙", hint: "What this chapter should feel like." },
  { key: "theme", type: "theme", title: "Theme", emoji: "✨", hint: "A word or theme to carry with you." },
  { key: "priorities", type: "priorities", title: "Top priorities", emoji: "🎯", hint: "Three to five areas of focus." },
  { key: "forward", type: "forward", title: "Things I'm looking forward to", emoji: "🎟️", hint: "Plans, events and little excitements." },
  { key: "aspirations", type: "aspirations", title: "Aspirations I'm nurturing", emoji: "🌱", hint: "Choose from your Aspirations in Envision." },
  { key: "rituals", type: "rituals", title: "Habits & rituals to focus on", emoji: "🔁", hint: "Choose rituals to give extra care." },
  { key: "bucket", type: "bucket", title: "Bucket List experiences", emoji: "🗺️", hint: "Dreams from your Bucket List to chase." },
  { key: "try", type: "list", prompt: "try", title: "Things I want to try", emoji: "🧪", hint: "Experiments and new experiences." },
  { key: "promise", type: "writing", prompt: "promise", title: "A promise to myself", emoji: "🤞", hint: "A mantra or a commitment." },
  { key: "matters", type: "list", prompt: "matters", title: "What matters most", emoji: "💗", hint: "The few things that count." },
  { key: "milestones", type: "list", prompt: "milestones", title: "Milestones", emoji: "🪜", hint: "Steps that show it's working." },
  { key: "growth", type: "list", prompt: "growth", title: "Personal growth", emoji: "🌿", hint: "Who you're growing into." },
  { key: "simplify", type: "list", prompt: "simplify", title: "What to simplify", emoji: "🍃", hint: "What to let go of or pause." },
  { key: "areas", type: "list", prompt: "areas", title: "Life areas to nurture", emoji: "🌈", hint: "Health, love, home, work, play…" },
  { key: "vision", type: "writing", prompt: "vision", title: "Personal vision", emoji: "🔭", hint: "The big picture, in your words." },
  { key: "custom-list", type: "list", prompt: "custom", title: "My own list", emoji: "📝", hint: "A list with your own title." },
  { key: "custom-writing", type: "writing", prompt: "custom", title: "Notes to self", emoji: "✍️", hint: "Write anything." },
] as const satisfies readonly { key: string; type: SectionType; prompt?: string; title: string; emoji: string; hint: string }[];
export type SectionKindKey = typeof sectionKinds[number]["key"];
export const sectionKind = (key: SectionKindKey) => sectionKinds.find((k) => k.key === key)!;
/** The kind a saved section belongs to (for its emoji and hint). */
export function kindOf(s: IntentionSection) {
  const prompt = s.type === "writing" || s.type === "list" ? (s.content as { prompt: string }).prompt : undefined;
  return sectionKinds.find((k) => k.type === s.type && (!("prompt" in k) || k.prompt === prompt)) ?? sectionKinds[0];
}

export function emptyContent(key: SectionKindKey): SectionContent[SectionType] {
  const k = sectionKind(key);
  switch (k.type) {
    case "theme": return { word: "", text: "" };
    case "writing": return { prompt: k.prompt, text: "" };
    case "list": return { prompt: k.prompt, items: [] };
    default: return { items: [] };
  }
}
export function newSection(key: SectionKindKey, id: string, title?: string): IntentionSection {
  const k = sectionKind(key);
  return { id, type: k.type, title: (title ?? k.title).slice(0, 60), content: emptyContent(key) };
}

// ---------- One default template per period (#117 §8) ----------
type Seed = { key: SectionKindKey; title?: string };
export const templates: Record<IntentionPeriod, { name: string; tagline: string; seeds: Seed[] }> = {
  week: { name: "The Week Ahead", tagline: "Short and practical: what matters, what's first, what's fun.", seeds: [
    { key: "intention", title: "A little intention" }, { key: "priorities", title: "This week's priorities" },
    { key: "matters", title: "What matters most" }, { key: "forward", title: "Looking forward to" },
  ] },
  month: { name: "A New Chapter", tagline: "The classic opening page: a theme, priorities and the life around them.", seeds: [
    { key: "theme", title: "This month's theme" }, { key: "intention", title: "My intention" }, { key: "priorities", title: "Top priorities" },
    { key: "aspirations" }, { key: "forward" }, { key: "rituals", title: "Rituals to focus on" }, { key: "try" }, { key: "promise" },
  ] },
  quarter: { name: "The Season Ahead", tagline: "Strategic and growth-minded: where you're headed and what to drop.", seeds: [
    { key: "theme", title: "The season ahead" }, { key: "aspirations", title: "Key aspirations" }, { key: "milestones" },
    { key: "growth" }, { key: "priorities", title: "What to prioritize" }, { key: "simplify" },
  ] },
  year: { name: "The Year I'm Imagining", tagline: "Big-picture: a word, a vision and the dreams worth chasing.", seeds: [
    { key: "theme", title: "Word of the year" }, { key: "vision" }, { key: "aspirations", title: "Major aspirations" },
    { key: "bucket", title: "Bucket List experiences" }, { key: "areas" }, { key: "promise" },
  ] },
};
export function seedSections(period: IntentionPeriod, makeId: () => string = () => crypto.randomUUID()): IntentionSection[] {
  return templates[period].seeds.map((s) => newSection(s.key, makeId(), s.title));
}

// ---------- Parsing (the database holds JSON; the app is the validator) ----------
const items = (v: unknown, max: number) => (Array.isArray(v) ? v : []).filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && idOk((x as Record<string, unknown>).id)).slice(0, max);
function parseContent(type: SectionType, v: unknown): SectionContent[SectionType] {
  const o = v && typeof v === "object" ? v as Record<string, unknown> : {};
  switch (type) {
    case "theme": return { word: str(o.word, 60), text: str(o.text, 2000) };
    case "writing": return { prompt: (Object.keys(writingPrompts) as WritingPrompt[]).find((p) => p === o.prompt) ?? "custom", text: str(o.text, 8000) };
    case "list": return { prompt: (Object.keys(listPrompts) as ListPrompt[]).find((p) => p === o.prompt) ?? "custom", items: items(o.items, MAX_ITEMS.list).map((x) => ({ id: x.id as string, text: str(x.text, 300) })) };
    case "priorities": return { items: items(o.items, MAX_ITEMS.priorities).map((x) => { const r = ref(x.ref, ["aspiration", "task"]); return { id: x.id as string, text: str(x.text, 200), ...(r ? { ref: r } : {}), ...(recordIdOk(x.taskId) ? { taskId: x.taskId } : {}) }; }) };
    case "forward": return { items: items(o.items, MAX_ITEMS.forward).map((x) => { const e = ref(x.event, ["event"]); return { id: x.id as string, text: str(x.text, 200), ...(e ? { event: e } : {}) }; }) };
    case "aspirations": case "rituals": case "bucket": {
      const kind: RefKind = type === "aspirations" ? "aspiration" : type === "rituals" ? "ritual" : "bucket";
      return { items: items(o.items, MAX_ITEMS[type]).flatMap((x) => { const r = ref(x.ref, [kind]); return r ? [{ id: x.id as string, ref: r, note: str(x.note, 300) }] : []; }) };
    }
  }
}
const sectionTypes: SectionType[] = ["theme", "writing", "list", "priorities", "forward", "aspirations", "rituals", "bucket"];
export function parseSections(v: unknown): IntentionSection[] {
  const seen = new Set<string>(), out: IntentionSection[] = [];
  for (const raw of Array.isArray(v) ? v : []) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>, type = sectionTypes.find((t) => t === o.type);
    if (!type || !idOk(o.id) || seen.has(o.id)) continue;
    seen.add(o.id);
    const section: IntentionSection = { id: o.id, type, title: str(o.title, 60), content: parseContent(type, o.content) };
    if (!section.title) section.title = kindOf(section).title;
    if (o.hidden === true) section.hidden = true;
    if (o.collapsed === true) section.collapsed = true;
    out.push(section);
    if (out.length >= MAX_SECTIONS) break;
  }
  return out;
}

/** Whether a section holds anything the person wrote or chose. */
export function hasContent(s: IntentionSection): boolean {
  const c = s.content as Record<string, unknown>;
  if (s.type === "theme") return !!(c.word as string).trim() || !!(c.text as string).trim();
  if (s.type === "writing") return !!(c.text as string).trim();
  const list = c.items as Record<string, unknown>[];
  return list.some((it) => !!it.ref || !!it.event || !!it.taskId || (typeof it.text === "string" && !!it.text.trim()) || (typeof it.note === "string" && !!it.note.trim()));
}
export const pageHasContent = (sections: IntentionSection[]) => sections.some(hasContent);

// ---------- Layout changes (pure; never lose content) ----------
export function moveSection(list: IntentionSection[], id: string, by: -1 | 1): IntentionSection[] {
  const i = list.findIndex((s) => s.id === id), j = i + by;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = [...list];[next[i], next[j]] = [next[j], next[i]];
  return next;
}
/** Removing a section with content needs explicit confirmation; hiding is always safe. */
export function removeSection(list: IntentionSection[], id: string, confirmed = false): { sections: IntentionSection[]; needsConfirmation: boolean } {
  const s = list.find((x) => x.id === id);
  if (!s) return { sections: list, needsConfirmation: false };
  if (hasContent(s) && !confirmed) return { sections: list, needsConfirmation: true };
  return { sections: list.filter((x) => x.id !== id), needsConfirmation: false };
}
export const canAddItem = (type: SectionType, count: number) => type === "theme" || type === "writing" ? false : count < MAX_ITEMS[type];
/** Ids already chosen in a linking section, so a record isn't added twice. */
export const chosenIds = (s: IntentionSection<"aspirations" | "rituals" | "bucket">) => new Set(s.content.items.map((i) => i.ref.id));

/** Display for a reference: the name as it was chosen, plus what changed since (renamed or no longer there). */
export function refStatus(r: Ref, live: { label: string } | undefined): { label: string; note?: string; missing: boolean } {
  if (!live) return { label: r.label, note: "no longer there", missing: true };
  return live.label.trim() && live.label !== r.label ? { label: r.label, note: `now “${live.label}”`, missing: false } : { label: r.label, missing: false };
}
