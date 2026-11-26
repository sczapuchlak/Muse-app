/**
 * Mindspace Lists (#110): one flexible list system. A list has optional sections, items and (optionally) fields.
 * Presets are only starting configurations; any list can later gain scheduling or fields.
 */
import type { ListEvent, ListSchedule } from "./schedule";
import { scheduleState, validSchedule } from "./schedule";
import type { JSONContent } from "@tiptap/react";
import { newCard, type BlockWidth, type CardPreset, type ListBlock, type SpaceCover } from "./blocks";

export const listAccents = ["primary", "secondary", "pop", "warm", "info"] as const;
export type ListAccent = typeof listAccents[number];
export type ListPreset = "checklist" | "scheduled" | "project";
export type FieldType = "text" | "number" | "date" | "select" | "url" | "checkbox";
export type ListField = { id: string; name: string; type: FieldType; options?: string[] };
export type ItemLinkKind = "task" | "aspiration" | "bucket" | "media";

export type MuseList = {
  id: string; title: string; description: string | null; icon: string | null; accent: ListAccent; preset: ListPreset;
  isTemplate: boolean; pinned: boolean; archivedAt: string | null; startDate: string | null; endDate: string | null;
  fields: ListField[]; tableView: boolean; /** Section layout: 0 = auto, else 1–3 columns. */ columns: 0 | 1 | 2 | 3; itemGroup: import("./order").ItemGroup; itemSort: import("./order").ItemSort; showInDaily: boolean; showInAgenda: boolean; aspirationId: string | null;
  /** Optional cover photo (Spaces). Undefined when the database predates covers. */ cover?: SpaceCover | null;
  position: number; createdAt: string; updatedAt: string;
};
export type ListSection = { id: string; listId: string; title: string; /** A short line under the name (Nov 25). */ description?: string | null; icon: string | null; accent: ListAccent | null; position: number; collapsed: boolean };
export type ListItem = {
  id: string; listId: string; sectionId: string | null; /** The checklist block it belongs to; null for items written before blocks (they join their section's first checklist). Undefined when the database predates blocks. */ blockId?: string | null; title: string; notes: string | null; position: number;
  priority: "low" | "medium" | "high" | null; dueDate: string | null; completedAt: string | null; completedOn: string | null;
  schedule: ListSchedule | null; fieldValues: Record<string, string | number | boolean | null>;
  linkKind: ItemLinkKind | null; linkId: string | null; createdAt: string; updatedAt: string;
};

export const LIMITS = { title: 120, description: 500, sectionTitle: 80, sectionDescription: 200, itemTitle: 300, notes: 4000, fields: 8 } as const;
export const presetLabels: Record<ListPreset, { label: string; detail: string }> = {
  checklist: { label: "Checklist", detail: "Packing, shopping, ideas, supplies" },
  scheduled: { label: "Scheduled", detail: "Cleaning, maintenance, routines that repeat" },
  project: { label: "Project", detail: "Builds, trips, events with stages" },
};

/** Done/total for a list or section. Scheduled items count as done when this period is completed or skipped. */
export function progress(items: ListItem[], events: ListEvent[], today: string) {
  let done = 0;
  for (const item of items) if (isDone(item, events, today)) done++;
  return { done, total: items.length, pct: items.length ? Math.round((done / items.length) * 100) : 0 };
}

/** The actionable checkbox: one-off items use their own completion; scheduled items reset each new period. */
export function isDone(item: ListItem, events: ListEvent[], today: string) {
  if (!item.schedule) return !!item.completedAt;
  const st = scheduleState(item.schedule, events.filter((e) => e.itemId === item.id), today).status;
  return st === "completed" || st === "skipped";
}

export function validListTitle(title: string) { const t = title.trim(); return t.length > 0 && t.length <= LIMITS.title; }

export function itemFromRow(r: Record<string, unknown>): ListItem {
  return { id: String(r.id), listId: String(r.list_id), sectionId: (r.section_id as string) ?? null, ...("block_id" in r ? { blockId: (r.block_id as string) ?? null } : {}), title: String(r.title), notes: (r.notes as string) ?? null,
    position: Number(r.position ?? 0), priority: (r.priority as ListItem["priority"]) ?? null, dueDate: (r.due_date as string) ?? null,
    completedAt: (r.completed_at as string) ?? null, completedOn: (r.completed_on as string) ?? null,
    schedule: validSchedule(r.schedule) ? (r.schedule as ListSchedule) : null, fieldValues: (r.field_values as ListItem["fieldValues"]) ?? {},
    linkKind: (r.link_kind as ItemLinkKind) ?? null, linkId: (r.link_id as string) ?? null, createdAt: String(r.created_at ?? ""), updatedAt: String(r.updated_at ?? "") };
}
export function listFromRow(r: Record<string, unknown>): MuseList {
  return { id: String(r.id), title: String(r.title), description: (r.description as string) ?? null, icon: (r.icon as string) ?? null,
    accent: (listAccents as readonly string[]).includes(String(r.accent)) ? r.accent as ListAccent : "primary", preset: (r.preset as ListPreset) ?? "checklist",
    isTemplate: !!r.is_template, pinned: !!r.pinned, archivedAt: (r.archived_at as string) ?? null, startDate: (r.start_date as string) ?? null, endDate: (r.end_date as string) ?? null,
    fields: Array.isArray(r.fields) ? r.fields as ListField[] : [], tableView: !!r.table_view, columns: ([0, 1, 2, 3].includes(Number(r.section_columns)) ? Number(r.section_columns) : 0) as MuseList["columns"], itemGroup: (["section", "frequency", "none"].includes(String(r.item_group)) ? r.item_group : "section") as MuseList["itemGroup"], itemSort: (["manual", "frequency", "due", "name"].includes(String(r.item_sort)) ? r.item_sort : "manual") as MuseList["itemSort"], showInDaily: !!r.show_in_daily, showInAgenda: !!r.show_in_agenda,
    aspirationId: (r.aspiration_id as string) ?? null, ...("cover" in r ? { cover: validCover(r.cover) } : {}), position: Number(r.position ?? 0), createdAt: String(r.created_at ?? ""), updatedAt: String(r.updated_at ?? "") };
}
export function sectionFromRow(r: Record<string, unknown>): ListSection {
  return { id: String(r.id), listId: String(r.list_id), title: String(r.title), ...("description" in r ? { description: (r.description as string) ?? null } : {}), icon: (r.icon as string) ?? null, accent: (r.accent as ListAccent) ?? null, position: Number(r.position ?? 0), collapsed: !!r.collapsed };
}

const validCover = (v: unknown): SpaceCover | null => { const c = v as SpaceCover; return c && typeof c === "object" && c.image && typeof c.image.path === "string" ? { image: c.image, focus: Number.isFinite(c.focus) ? Math.max(0, Math.min(100, c.focus)) : 50 } : null; };

export type ListBundle = { list: MuseList; sections: ListSection[]; items: ListItem[]; blocks: ListBlock[] };

/**
 * An independent copy (template → list, list → template, duplicate). Structure, sections, items, fields and schedules
 * come along; completion state, history and cross-module links do not. Schedules restart from `today`.
 */
export function copyBundle(src: ListBundle, opts: { title: string; isTemplate: boolean; today: string; id?: () => string }): ListBundle {
  const id = opts.id ?? (() => crypto.randomUUID());
  const listId = id(), sectionIds = new Map(src.sections.map((s) => [s.id, id()])), srcBlocks = (src.blocks ?? []).filter((b) => !b.virtual), blockIds = new Map(srcBlocks.map((b) => [b.id, id()]));
  const now = new Date().toISOString();
  return {
    list: { ...src.list, id: listId, title: opts.title, isTemplate: opts.isTemplate, pinned: false, archivedAt: null, aspirationId: null, showInDaily: false, showInAgenda: false, createdAt: now, updatedAt: now },
    sections: src.sections.map((s) => ({ ...s, id: sectionIds.get(s.id)!, listId })),
    // Blocks come along with their writing, cards and photo references (files are shared, never duplicated, and only
    // removed once nothing refers to them any more).
    blocks: srcBlocks.map((b) => ({ ...b, id: blockIds.get(b.id)!, listId, sectionId: b.sectionId ? sectionIds.get(b.sectionId) ?? null : null, data: structuredClone(b.data), createdAt: now, updatedAt: now })),
    items: src.items.map((i) => ({ ...i, id: id(), listId, sectionId: i.sectionId ? sectionIds.get(i.sectionId) ?? null : null, blockId: i.blockId === undefined ? undefined : i.blockId ? blockIds.get(i.blockId) ?? null : null, completedAt: null, completedOn: null,
      linkKind: null, linkId: null, schedule: i.schedule ? { ...i.schedule, anchor: opts.today, since: opts.today } : null, createdAt: now, updatedAt: now })),
  };
}


export type StarterItem = string | { title: string; repeat?: string; mode?: ListSchedule["mode"]; /** Preferred weekday, 0 = Sunday. */ day?: number; fields?: Record<string, string> };
export type StarterBlock =
  | { kind: "checklist"; title?: string; items: StarterItem[] }
  | { kind: "note"; title?: string; doc?: JSONContent; width?: BlockWidth }
  | { kind: "card"; preset: CardPreset; title?: string; labels?: string[]; width?: BlockWidth }
  | { kind: "images"; title?: string; width?: BlockWidth }
  | { kind: "link"; width?: BlockWidth }
  | { kind: "heading"; text: string; style?: "title" | "text" | "divider" };
/** `items` is the section's own checklist (the original Lists shape); `blocks` adds anything else, in order. */
type StarterSection = { title: string; icon?: string; description?: string; items?: StarterItem[]; blocks?: StarterBlock[] };
export type Starter = {
  id: string; title: string; /** The space's own icon. */ icon: string; /** Gallery tile glyph (one icon style). */ mark: string; tone: number; accent: ListAccent; preset: ListPreset; description: string;
  fields?: ListField[]; columns?: MuseList["columns"]; sections: StarterSection[]; /** A checklist above the sections (simple lists have no sections). */ rootItems?: StarterItem[];
};

const h = (level: 2 | 3, text: string): JSONContent => ({ type: "heading", attrs: { level }, content: [{ type: "text", text }] });
const p = (text?: string): JSONContent => text ? { type: "paragraph", content: [{ type: "text", text }] } : { type: "paragraph" };
const doc = (...content: JSONContent[]): JSONContent => ({ type: "doc", content });

/**
 * Starting configurations offered in "New space", never created automatically and never permanent types: everything
 * can be added, renamed, rearranged or removed afterwards. Ids `blank`, `travel`, `home` and `project` are the original
 * Lists starters (kept so nothing that refers to them breaks).
 */
export const starters: Starter[] = [
  { id: "blank", title: "Untitled space", icon: "✦", mark: "sparkle", tone: 1, accent: "primary", preset: "project", description: "An empty page. Add sections, notes, cards and checklists as you go.", columns: 1, sections: [] },
  { id: "checklist", title: "Checklist", icon: "☑️", mark: "checklist", tone: 2, accent: "info", preset: "checklist", description: "Just boxes to tick. Type and press Enter.", sections: [], rootItems: [] },
  { id: "grocery", title: "Groceries", icon: "🧺", mark: "basket", tone: 4, accent: "warm", preset: "checklist", description: "Aisles you can skip or rename, with quantities.",
    fields: [{ id: "qty", name: "Qty", type: "number" }], columns: 0,
    sections: ["Produce", "Meat & Protein", "Dairy & Eggs", "Pantry", "Bakery", "Household"].map((title) => ({ title, items: [] })) },
  { id: "travel", title: "Packing list", icon: "🧳", mark: "suitcase", tone: 3, accent: "secondary", preset: "checklist", description: "Reusable for every trip: copies start unticked.",
    fields: [{ id: "qty", name: "Qty", type: "number" }], columns: 0,
    sections: [
      { title: "Clothing", items: ["Outfits", "Pajamas", "Underwear & socks", "Comfy shoes", "Jacket"] },
      { title: "Toiletries", items: ["Toothbrush & paste", "Shampoo & conditioner", "Deodorant"] },
      { title: "Skincare & makeup", items: ["Cleanser", "Moisturizer", "SPF", "Makeup bag"] },
      { title: "Electronics", items: ["Phone charger", "Headphones", "Adapter"] },
      { title: "Documents", items: ["Passport / ID", "Tickets", "Insurance"] },
    ] },
  { id: "home", title: "Cleaning routine", icon: "🫧", mark: "broom", tone: 5, accent: "info", preset: "scheduled", description: "Room by room, each task on its own rhythm, with history.", columns: 0,
    sections: [
      { title: "Kitchen", items: [{ title: "Wipe counters", repeat: "daily", mode: "flexible" }, { title: "Clean out the fridge", repeat: "monthly", mode: "flexible" }] },
      { title: "Bathroom", items: [{ title: "Clean bathroom", repeat: "weekly", mode: "flexible" }] },
      { title: "Bedroom", items: [{ title: "Wash bedsheets", repeat: "biweekly", mode: "preferred", day: 6 }] },
      { title: "Living room", items: [{ title: "Vacuum", repeat: "weekly", mode: "preferred", day: 3 }] },
      { title: "Whole home", items: [{ title: "Replace air filters", repeat: "quarterly", mode: "date" }, { title: "Clean windows", repeat: "semiannual", mode: "flexible" }] },
    ] },
  { id: "project", title: "Project plan", icon: "✂️", mark: "briefcase", tone: 6, accent: "pop", preset: "project", description: "Stages, tasks, statuses, dates and notes.", columns: 1,
    fields: [{ id: "status", name: "Status", type: "select", options: ["To buy", "To do", "In progress", "Done"] }],
    sections: [
      { title: "Overview", icon: "🧭", blocks: [{ kind: "note", doc: doc(h(3, "The goal"), p(), h(3, "Budget & deadline"), p()) }] },
      { title: "Plan", items: [{ title: "Gather references", fields: { status: "To do" } }, { title: "Make a budget", fields: { status: "To do" } }] },
      { title: "Supplies", items: [{ title: "Materials list", fields: { status: "To buy" } }] },
      { title: "Build", items: [{ title: "First draft", fields: { status: "To do" } }] },
      { title: "Finishing touches", items: [{ title: "Final details", fields: { status: "To do" } }] },
    ] },
  { id: "trip", title: "Trip", icon: "✈️", mark: "plane", tone: 2, accent: "secondary", preset: "project", description: "Flights, stays, getting around, the plan for each day, places, packing and inspiration.", columns: 1,
    sections: [
      { title: "Trip details", icon: "🗺️", blocks: [{ kind: "note", width: "half", doc: doc(h(3, "The big picture"), p()) }, { kind: "card", preset: "info", title: "Good to know", labels: ["Currency", "Power plugs", "Emergency number"], width: "half" }] },
      { title: "Flights", icon: "✈️", blocks: [{ kind: "card", preset: "flight" }] },
      { title: "Stays", icon: "🛏️", blocks: [{ kind: "card", preset: "stay" }] },
      { title: "Getting around", icon: "🚆", blocks: [{ kind: "card", preset: "transit" }] },
      { title: "Itinerary", icon: "🗓️", blocks: [{ kind: "note", doc: doc(h(3, "Day 1"), p(), h(3, "Day 2"), p()) }] },
      { title: "Places & ideas", icon: "📍", blocks: [{ kind: "card", preset: "place" }, { kind: "link" }] },
      { title: "Packing", icon: "🧳", items: ["Passport / ID", "Chargers & adapter", "Outfits", "Toiletries", "Medication"] },
      { title: "Inspiration", icon: "✨", blocks: [{ kind: "images" }] },
    ] },
  { id: "makeover", title: "Home makeover", icon: "🛋️", mark: "home", tone: 7, accent: "warm", preset: "project", description: "Room by room: tasks, shopping, measurements and inspiration.", columns: 1,
    sections: [
      { title: "Living room", icon: "🛋️", items: ["Declutter", "Choose a paint colour"], blocks: [{ kind: "card", preset: "measurement" }, { kind: "card", preset: "shopping" }, { kind: "images", title: "Inspiration" }] },
      { title: "Bedroom", icon: "🛏️", items: ["New bedding"], blocks: [{ kind: "images", title: "Inspiration" }] },
      { title: "Wish list", icon: "🛍️", blocks: [{ kind: "card", preset: "shopping" }, { kind: "link" }] },
    ] },
  { id: "gifts", title: "Gift planner", icon: "🎁", mark: "gift", tone: 1, accent: "pop", preset: "project", description: "Ideas by person, with links, prices and where each gift stands.", columns: 1,
    fields: [{ id: "status", name: "Status", type: "select", options: ["Idea", "Bought", "Wrapped", "Given"] }, { id: "price", name: "Price", type: "number" }],
    sections: [
      { title: "Family", icon: "💐", items: [], blocks: [{ kind: "card", preset: "gift" }] },
      { title: "Friends", icon: "🥂", items: [] },
      { title: "Wrapping & cards", icon: "🎀", items: ["Wrapping paper", "Tags & ribbon", "Cards"] },
    ] },
];
/** Card data for a starter card, with optional field labels replacing the preset's (e.g. "Good to know"). */
export function starterCard(b: Extract<StarterBlock, { kind: "card" }>) {
  const card = newCard(b.preset, b.title ?? "");
  if (b.labels) card.fields = [...b.labels.map((label, i) => ({ id: `f${i + 1}`, label, type: "text" as const, value: "" })), ...card.fields.filter((f) => f.type === "longtext")];
  return card;
}
