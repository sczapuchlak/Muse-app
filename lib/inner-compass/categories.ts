/**
 * Inner Compass → My Inner World (#210): the six collections. Each one is a facet of the same identity, so they share
 * one record type (a discovery) and differ only in which optional fields they offer and the words around them.
 *
 * Nothing here is a score. "Stances" describe how a person relates to a discovery (one they recognize, one they're
 * cultivating…), never how good they are at it, and nothing is ever counted against them.
 */
import type { MuseGlyphName } from "@/components/design/MuseGlyph";

export type Category = "values" | "character" | "beliefs" | "philosophy" | "boundaries" | "patterns";
export const categories: Category[] = ["values", "character", "beliefs", "philosophy", "boundaries", "patterns"];
export const isCategory = (v: unknown): v is Category => typeof v === "string" && (categories as string[]).includes(v);

/** Optional fields, beyond the statement and its meaning, that a collection offers. */
export type DetailKey = "why" | "practice" | "examples" | "shaped" | "learned" | "attribution" | "theme" | "area" | "kind" | "stance";
export type Field = { key: Exclude<DetailKey, "area" | "kind" | "stance">; label: string; placeholder: string; rows?: number };
export type Choice = { id: string; label: string; line?: string };

export type CategoryInfo = {
  id: Category;
  /** "My Values" */
  title: string;
  /** "Value" */
  noun: string;
  glyph: MuseGlyphName;
  tone: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  /** One editorial line for the collection. */
  line: string;
  /** What the statement field asks for. */
  statement: string;
  statementPlaceholder: string;
  meaning: string;
  fields: Field[];
  /** How the person relates to it (optional). */
  stances?: Choice[];
  /** A further optional classifier (a kind of principle, a boundary's area, a kind of pattern). */
  kinds?: { key: "kind" | "area"; label: string; options: Choice[] };
};

export const categoryInfo: Record<Category, CategoryInfo> = {
  values: {
    id: "values", title: "My Values", noun: "value", glyph: "gem", tone: 1,
    line: "The principles and qualities you consider important. Not goals, and never a to-do list.",
    statement: "Value", statementPlaceholder: "Curiosity", meaning: "What it means to me",
    fields: [
      { key: "why", label: "Why it matters", placeholder: "Because a life without questions feels small…" },
      { key: "practice", label: "What honoring it looks like", placeholder: "Asking the second question. Reading outside my lane." },
      { key: "examples", label: "Moments from my life", placeholder: "The summer I…", rows: 3 },
    ],
    stances: [
      { id: "core", label: "Core to me", line: "A value you already live by" },
      { id: "exploring", label: "Exploring", line: "A value you're getting to know" },
      { id: "cultivating", label: "Cultivating", line: "A value you're giving more room" },
    ],
  },
  character: {
    id: "character", title: "My Character", noun: "quality", glyph: "heart", tone: 4,
    line: "Qualities of character you recognize in yourself or are growing into. Descriptions, not grades.",
    statement: "Quality", statementPlaceholder: "Generosity, even when life is difficult", meaning: "What it means to me",
    fields: [
      { key: "why", label: "Why it matters", placeholder: "" },
      { key: "practice", label: "What it looks like in practice", placeholder: "Giving the benefit of the doubt first." },
      { key: "examples", label: "Examples and memories", placeholder: "", rows: 3 },
    ],
    stances: [
      { id: "recognize", label: "I recognize it", line: "Already yours" },
      { id: "cultivating", label: "Cultivating", line: "Growing it, slowly" },
      { id: "exploring", label: "Exploring", line: "Curious about it" },
      { id: "rediscovered", label: "Rediscovered", line: "Back after a while away" },
    ],
  },
  beliefs: {
    id: "beliefs", title: "My Beliefs", noun: "belief", glyph: "sun", tone: 6,
    line: "Convictions about life, love, people and meaning. Allowed to be questioned, revised or retired.",
    statement: "Belief", statementPlaceholder: "Meaningful relationships require mutual curiosity.", meaning: "What I mean by it",
    fields: [
      { key: "why", label: "Why I hold it", placeholder: "" },
      { key: "shaped", label: "Experiences that shaped it", placeholder: "", rows: 3 },
    ],
    stances: [
      { id: "held", label: "Held", line: "True for me now" },
      { id: "questioning", label: "Questioning", line: "Holding it up to the light" },
      { id: "retired", label: "Retired", line: "Once true for me; kept with care" },
    ],
  },
  philosophy: {
    id: "philosophy", title: "My Philosophy", noun: "principle", glyph: "scroll", tone: 7,
    line: "Guiding principles, lessons learned and words to live by, including other people's, with credit.",
    statement: "Principle", statementPlaceholder: "An interesting life is worth more to me than a perfectly predictable one.", meaning: "The longer version",
    fields: [
      { key: "attribution", label: "Who said it", placeholder: "Mary Oliver, my grandmother, me" },
      { key: "theme", label: "Theme", placeholder: "Work, love, courage…" },
    ],
    kinds: { key: "kind", label: "Kind", options: [
      { id: "principle", label: "Principle" }, { id: "lesson", label: "Lesson learned" }, { id: "quote", label: "Quotation" },
      { id: "saying", label: "My own saying" }, { id: "philosophy", label: "Philosophy" },
    ] },
  },
  boundaries: {
    id: "boundaries", title: "My Boundaries", noun: "boundary", glyph: "key", tone: 3,
    line: "What you protect and why: standards and non-negotiables, written as promises to yourself.",
    statement: "What I protect", statementPlaceholder: "I protect time for myself without needing to justify it.", meaning: "What it means to me",
    fields: [
      { key: "why", label: "Why it matters", placeholder: "" },
      { key: "practice", label: "What honoring it looks like", placeholder: "" },
      { key: "learned", label: "What I've learned", placeholder: "" },
    ],
    kinds: { key: "area", label: "Area", options: [
      { id: "emotional", label: "Emotional" }, { id: "relationships", label: "Relationships" }, { id: "time", label: "Time" }, { id: "energy", label: "Energy" },
      { id: "work", label: "Work" }, { id: "space", label: "Personal space" }, { id: "communication", label: "Communication" }, { id: "lifestyle", label: "Lifestyle" },
    ] },
  },
  patterns: {
    id: "patterns", title: "My Patterns", noun: "pattern", glyph: "orbit", tone: 5,
    line: "Recurring tendencies you've noticed in yourself. Your own observations, interpreted your own way.",
    statement: "Observation", statementPlaceholder: "I feel most like myself when I'm exploring something unfamiliar.", meaning: "Context",
    fields: [
      { key: "examples", label: "Related experiences", placeholder: "", rows: 3 },
      { key: "learned", label: "What I'm learning", placeholder: "" },
    ],
    kinds: { key: "kind", label: "Kind", options: [
      { id: "thrive", label: "Where I thrive" }, { id: "energizes", label: "Energizes me" }, { id: "drains", label: "Drains me" },
      { id: "reaction", label: "A reaction I recognize" }, { id: "environment", label: "Where I feel like myself" },
      { id: "strength", label: "A strength I rediscover" }, { id: "navigating", label: "Learning to navigate" },
    ] },
  },
};

export const choiceLabel = (c: Category, key: "stance" | "kind" | "area", id: string | undefined) => {
  if (!id) return undefined;
  const info = categoryInfo[c], list = key === "stance" ? info.stances : info.kinds?.key === key ? info.kinds.options : undefined;
  return list?.find((o) => o.id === id)?.label;
};
