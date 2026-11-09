/**
 * Mindspace Lists (#110): one flexible list system. A list has optional sections, items and (optionally) fields.
 * Presets are only starting configurations; any list can later gain scheduling or fields.
 */
import type { ListEvent, ListSchedule } from "./schedule";
import { scheduleState, validSchedule } from "./schedule";

export const listAccents = ["primary", "secondary", "pop", "warm", "info"] as const;
export type ListAccent = typeof listAccents[number];
export type ListPreset = "checklist" | "scheduled" | "project";
export type FieldType = "text" | "number" | "date" | "select" | "url" | "checkbox";
export type ListField = { id: string; name: string; type: FieldType; options?: string[] };
export type ItemLinkKind = "task" | "aspiration" | "bucket" | "media";

export type MuseList = {
  id: string; title: string; description: string | null; icon: string | null; accent: ListAccent; preset: ListPreset;
  isTemplate: boolean; pinned: boolean; archivedAt: string | null; startDate: string | null; endDate: string | null;
  fields: ListField[]; tableView: boolean; /** Section layout: 0 = auto, else 1–3 columns. */ columns: 0 | 1 | 2 | 3; showInDaily: boolean; showInAgenda: boolean; aspirationId: string | null;
  position: number; createdAt: string; updatedAt: string;
};
export type ListSection = { id: string; listId: string; title: string; icon: string | null; accent: ListAccent | null; position: number; collapsed: boolean };
export type ListItem = {
  id: string; listId: string; sectionId: string | null; title: string; notes: string | null; position: number;
  priority: "low" | "medium" | "high" | null; dueDate: string | null; completedAt: string | null; completedOn: string | null;
  schedule: ListSchedule | null; fieldValues: Record<string, string | number | boolean | null>;
  linkKind: ItemLinkKind | null; linkId: string | null; createdAt: string; updatedAt: string;
};

export const LIMITS = { title: 120, description: 500, sectionTitle: 80, itemTitle: 300, notes: 4000, fields: 8 } as const;
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
  return { id: String(r.id), listId: String(r.list_id), sectionId: (r.section_id as string) ?? null, title: String(r.title), notes: (r.notes as string) ?? null,
    position: Number(r.position ?? 0), priority: (r.priority as ListItem["priority"]) ?? null, dueDate: (r.due_date as string) ?? null,
    completedAt: (r.completed_at as string) ?? null, completedOn: (r.completed_on as string) ?? null,
    schedule: validSchedule(r.schedule) ? (r.schedule as ListSchedule) : null, fieldValues: (r.field_values as ListItem["fieldValues"]) ?? {},
    linkKind: (r.link_kind as ItemLinkKind) ?? null, linkId: (r.link_id as string) ?? null, createdAt: String(r.created_at ?? ""), updatedAt: String(r.updated_at ?? "") };
}
export function listFromRow(r: Record<string, unknown>): MuseList {
  return { id: String(r.id), title: String(r.title), description: (r.description as string) ?? null, icon: (r.icon as string) ?? null,
    accent: (listAccents as readonly string[]).includes(String(r.accent)) ? r.accent as ListAccent : "primary", preset: (r.preset as ListPreset) ?? "checklist",
    isTemplate: !!r.is_template, pinned: !!r.pinned, archivedAt: (r.archived_at as string) ?? null, startDate: (r.start_date as string) ?? null, endDate: (r.end_date as string) ?? null,
    fields: Array.isArray(r.fields) ? r.fields as ListField[] : [], tableView: !!r.table_view, columns: ([0, 1, 2, 3].includes(Number(r.section_columns)) ? Number(r.section_columns) : 0) as MuseList["columns"], showInDaily: !!r.show_in_daily, showInAgenda: !!r.show_in_agenda,
    aspirationId: (r.aspiration_id as string) ?? null, position: Number(r.position ?? 0), createdAt: String(r.created_at ?? ""), updatedAt: String(r.updated_at ?? "") };
}
export function sectionFromRow(r: Record<string, unknown>): ListSection {
  return { id: String(r.id), listId: String(r.list_id), title: String(r.title), icon: (r.icon as string) ?? null, accent: (r.accent as ListAccent) ?? null, position: Number(r.position ?? 0), collapsed: !!r.collapsed };
}

export type ListBundle = { list: MuseList; sections: ListSection[]; items: ListItem[] };

/**
 * An independent copy (template → list, list → template, duplicate). Structure, sections, items, fields and schedules
 * come along; completion state, history and cross-module links do not. Schedules restart from `today`.
 */
export function copyBundle(src: ListBundle, opts: { title: string; isTemplate: boolean; today: string; id?: () => string }): ListBundle {
  const id = opts.id ?? (() => crypto.randomUUID());
  const listId = id(), sectionIds = new Map(src.sections.map((s) => [s.id, id()]));
  const now = new Date().toISOString();
  return {
    list: { ...src.list, id: listId, title: opts.title, isTemplate: opts.isTemplate, pinned: false, archivedAt: null, aspirationId: null, showInDaily: false, showInAgenda: false, createdAt: now, updatedAt: now },
    sections: src.sections.map((s) => ({ ...s, id: sectionIds.get(s.id)!, listId })),
    items: src.items.map((i) => ({ ...i, id: id(), listId, sectionId: i.sectionId ? sectionIds.get(i.sectionId) ?? null : null, completedAt: null, completedOn: null,
      linkKind: null, linkId: null, schedule: i.schedule ? { ...i.schedule, anchor: opts.today, since: opts.today } : null, createdAt: now, updatedAt: now })),
  };
}

type StarterSection = { title: string; icon?: string; items: (string | { title: string; repeat?: string; mode?: ListSchedule["mode"]; /** Preferred weekday, 0 = Sunday. */ day?: number; fields?: Record<string, string> })[] };
export type Starter = { id: string; title: string; icon: string; accent: ListAccent; preset: ListPreset; description: string; fields?: ListField[]; sections: StarterSection[] };

/** Starter templates offered in "New list" — never created automatically. `blank` is the empty start. */
export const starters: Starter[] = [
  { id: "blank", title: "Untitled list", icon: "✦", accent: "primary", preset: "checklist", description: "Start from nothing.", sections: [] },
  { id: "travel", title: "Travel Essentials", icon: "🧳", accent: "secondary", preset: "checklist", description: "A packing list to reuse for every trip.",
    fields: [{ id: "qty", name: "Qty", type: "number" }],
    sections: [
      { title: "Clothing", items: ["Outfits", "Pajamas", "Underwear & socks", "Comfy shoes", "Jacket"] },
      { title: "Toiletries", items: ["Toothbrush & paste", "Shampoo & conditioner", "Deodorant"] },
      { title: "Skincare & makeup", items: ["Cleanser", "Moisturizer", "SPF", "Makeup bag"] },
      { title: "Electronics", items: ["Phone charger", "Headphones", "Adapter"] },
      { title: "Documents", items: ["Passport / ID", "Tickets", "Insurance"] },
    ] },
  { id: "home", title: "Home Reset", icon: "🫧", accent: "info", preset: "scheduled", description: "Cleaning by room, each task on its own rhythm.",
    sections: [
      { title: "Kitchen", items: [{ title: "Wipe counters", repeat: "daily", mode: "flexible" }, { title: "Clean out the fridge", repeat: "monthly", mode: "flexible" }] },
      { title: "Bathroom", items: [{ title: "Clean bathroom", repeat: "weekly", mode: "flexible" }] },
      { title: "Bedroom", items: [{ title: "Wash bedsheets", repeat: "biweekly", mode: "preferred", day: 6 }] },
      { title: "Living room", items: [{ title: "Vacuum", repeat: "weekly", mode: "preferred", day: 3 }] },
      { title: "Whole home", items: [{ title: "Replace air filters", repeat: "quarterly", mode: "date" }, { title: "Clean windows", repeat: "semiannual", mode: "flexible" }] },
    ] },
  { id: "project", title: "Project Plan", icon: "✂️", accent: "pop", preset: "project", description: "Stages, status and notes for a bigger build.",
    fields: [{ id: "status", name: "Status", type: "select", options: ["To buy", "To do", "In progress", "Done"] }],
    sections: [
      { title: "Plan", items: [{ title: "Gather references", fields: { status: "To do" } }, { title: "Make a budget", fields: { status: "To do" } }] },
      { title: "Supplies", items: [{ title: "Materials list", fields: { status: "To buy" } }] },
      { title: "Build", items: [{ title: "First draft", fields: { status: "To do" } }] },
      { title: "Finishing touches", items: [{ title: "Final details", fields: { status: "To do" } }] },
    ] },
];
