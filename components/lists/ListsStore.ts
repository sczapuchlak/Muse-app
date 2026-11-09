"use client";
import { useEffect, useSyncExternalStore } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { copyBundle, itemFromRow, listFromRow, sectionFromRow, starters, type ListBundle, type ListItem, type ListPreset, type ListSection, type MuseList } from "@/lib/lists/model";
import { anchorFor, periodFor, schedulePresets, type ListEvent, type ListSchedule } from "@/lib/lists/schedule";
import { shiftDate } from "@/lib/dates";

/**
 * Mindspace Lists data (#110). Owner-only tables (RLS); every change is applied locally first, written straight away,
 * and reloaded from the server if a write fails so the screen never drifts from what's saved.
 */
type Snap = { loaded: boolean; error: string; lists: MuseList[]; sections: ListSection[]; items: ListItem[]; events: ListEvent[] };
let snap: Snap = { loaded: false, error: "", lists: [], sections: [], items: [], events: [] };
let client: ReturnType<typeof createMuseBrowserClient> | undefined, loading: Promise<void> | null = null;
const db = () => client ??= createMuseBrowserClient();
const listeners = new Set<() => void>();
const emit = (p: Partial<Snap>) => { snap = { ...snap, ...p }; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const eventFromRow = (r: Record<string, unknown>): ListEvent => ({ id: String(r.id), itemId: String(r.item_id), listId: String(r.list_id), kind: r.kind as ListEvent["kind"],
  periodStart: String(r.period_start), periodEnd: String(r.period_end), movedTo: (r.moved_to as string) ?? undefined, occurredOn: (r.occurred_on as string) ?? undefined,
  recordedAt: String(r.recorded_at), source: (r.source as ListEvent["source"]) ?? "list" });
const listRow = (l: MuseList) => ({ id: l.id, title: l.title.trim(), description: l.description, icon: l.icon, accent: l.accent, preset: l.preset, is_template: l.isTemplate, pinned: l.pinned,
  archived_at: l.archivedAt, start_date: l.startDate, end_date: l.endDate, fields: l.fields, table_view: l.tableView, section_columns: l.columns, item_group: l.itemGroup, item_sort: l.itemSort, show_in_daily: l.showInDaily, show_in_agenda: l.showInAgenda,
  aspiration_id: l.aspirationId, position: l.position });
const sectionRow = (s: ListSection) => ({ id: s.id, list_id: s.listId, title: s.title.trim(), icon: s.icon, accent: s.accent, position: s.position, collapsed: s.collapsed });
const itemRow = (i: ListItem) => ({ id: i.id, list_id: i.listId, section_id: i.sectionId, title: i.title.trim(), notes: i.notes, position: i.position, priority: i.priority, due_date: i.dueDate,
  completed_at: i.completedAt, completed_on: i.completedOn, schedule: i.schedule, field_values: i.fieldValues, link_kind: i.linkKind, link_id: i.linkId });

export async function loadLists(force = false) {
  if (loading && !force) return loading;
  loading = (async () => {
    const since = shiftDate(new Date().toISOString().slice(0, 10), -800);
    const [l, s, i, e] = await Promise.all([
      db().from("lists").select("*").order("position"), db().from("list_sections").select("*").order("position"),
      db().from("list_items").select("*").order("position"), db().from("list_item_events").select("*").gte("period_end", since).order("period_start", { ascending: false }).limit(5000)]);
    const err = l.error ?? s.error ?? i.error ?? e.error;
    if (err) { emit({ loaded: true, error: "Your lists couldn’t load. Check your connection and try again." }); return; }
    emit({ loaded: true, error: "", lists: (l.data ?? []).map(listFromRow), sections: (s.data ?? []).map(sectionFromRow), items: (i.data ?? []).map(itemFromRow), events: (e.data ?? []).map(eventFromRow) });
  })().finally(() => { loading = null; });
  return loading;
}

async function write(run: () => PromiseLike<{ error: unknown }>, message = "That change didn’t save. Your lists were refreshed from what’s saved.") {
  const { error } = await run();
  if (error) { emit({ error: message }); await loadLists(true); throw error; }
}

export function useLists() {
  const s = useSyncExternalStore(subscribe, () => snap, () => snap);
  useEffect(() => { if (!snap.loaded) void loadLists(); }, []);
  return s;
}
export const bundleOf = (s: Snap, listId: string): ListBundle | null => {
  const list = s.lists.find((l) => l.id === listId);
  return list ? { list, sections: s.sections.filter((x) => x.listId === listId).sort((a, b) => a.position - b.position), items: s.items.filter((x) => x.listId === listId).sort((a, b) => a.position - b.position) } : null;
};

async function insertBundle(b: ListBundle) {
  emit({ lists: [...snap.lists, b.list], sections: [...snap.sections, ...b.sections], items: [...snap.items, ...b.items] });
  await write(() => db().from("lists").insert(listRow(b.list)));
  if (b.sections.length) await write(() => db().from("list_sections").insert(b.sections.map(sectionRow)));
  if (b.items.length) await write(() => db().from("list_items").insert(b.items.map(itemRow)));
  return b.list.id;
}

/** New list from a starter (or blank), already independent. */
export async function createList(opts: { starterId: string; title?: string; preset?: ListPreset; today: string }) {
  const st = starters.find((x) => x.id === opts.starterId) ?? starters[0], listId = uuid(), stamp = now();
  const list: MuseList = { id: listId, title: (opts.title?.trim() || st.title).slice(0, 120), description: st.id === "blank" ? null : st.description, icon: st.icon, accent: st.accent,
    preset: opts.preset ?? st.preset, isTemplate: false, pinned: false, archivedAt: null, startDate: null, endDate: null, fields: st.fields ?? [], tableView: false, columns: 0, itemGroup: "section", itemSort: "manual",
    showInDaily: false, showInAgenda: false, aspirationId: null, position: snap.lists.length, createdAt: stamp, updatedAt: stamp };
  const sections: ListSection[] = [], items: ListItem[] = [];
  st.sections.forEach((sec, si) => {
    const sid = uuid(); sections.push({ id: sid, listId, title: sec.title, icon: sec.icon ?? null, accent: null, position: si, collapsed: false });
    sec.items.forEach((raw, ii) => {
      const it = typeof raw === "string" ? { title: raw } : raw, preset = schedulePresets.find((p) => p.id === it.repeat);
      const mode = it.mode ?? "flexible", rule = preset?.rule(opts.today);
      const dayAnchor = "day" in it && typeof it.day === "number" ? shiftDate(anchorFor({ freq: "weekly", interval: 1 }, "flexible", opts.today), (it.day + 6) % 7) : null;
      const schedule: ListSchedule | null = rule ? { rule, anchor: dayAnchor ?? anchorFor(rule, mode, opts.today), mode, since: opts.today } : null;
      items.push({ id: uuid(), listId, sectionId: sid, title: it.title, notes: null, position: ii, priority: null, dueDate: null, completedAt: null, completedOn: null, schedule,
        fieldValues: it.fields ?? {}, linkKind: null, linkId: null, createdAt: stamp, updatedAt: stamp });
    });
  });
  return insertBundle({ list, sections, items });
}

export async function copyList(listId: string, opts: { title: string; isTemplate: boolean; today: string }) {
  const b = bundleOf(snap, listId); if (!b) return null;
  const copy = copyBundle(b, opts); copy.list.position = snap.lists.length;
  return insertBundle(copy);
}

export async function updateList(id: string, patch: Partial<MuseList>) {
  const next = snap.lists.map((l) => l.id === id ? { ...l, ...patch, updatedAt: now() } : l); emit({ lists: next });
  const row = listRow(next.find((l) => l.id === id)!);
  await write(() => db().from("lists").update(row).eq("id", id));
}
export async function deleteList(id: string) {
  emit({ lists: snap.lists.filter((l) => l.id !== id), sections: snap.sections.filter((s) => s.listId !== id), items: snap.items.filter((i) => i.listId !== id), events: snap.events.filter((e) => e.listId !== id) });
  await write(() => db().from("lists").delete().eq("id", id));
}

export async function addSection(listId: string, title: string) {
  const s: ListSection = { id: uuid(), listId, title: title.trim().slice(0, 80), icon: null, accent: null, position: snap.sections.filter((x) => x.listId === listId).length, collapsed: false };
  emit({ sections: [...snap.sections, s] }); await write(() => db().from("list_sections").insert(sectionRow(s))); return s.id;
}
export async function updateSection(id: string, patch: Partial<ListSection>) {
  emit({ sections: snap.sections.map((s) => s.id === id ? { ...s, ...patch } : s) });
  await write(() => db().from("list_sections").update(sectionRow(snap.sections.find((s) => s.id === id)!)).eq("id", id));
}
/** Deleting a section keeps its items: they move to "Unsorted". */
export async function deleteSection(id: string) {
  emit({ sections: snap.sections.filter((s) => s.id !== id), items: snap.items.map((i) => i.sectionId === id ? { ...i, sectionId: null } : i) });
  await write(() => db().from("list_sections").delete().eq("id", id));
}
export async function moveSection(id: string, by: -1 | 1) {
  const s = snap.sections.find((x) => x.id === id); if (!s) return;
  const sibs = snap.sections.filter((x) => x.listId === s.listId).sort((a, b) => a.position - b.position), i = sibs.findIndex((x) => x.id === id), j = i + by;
  if (j < 0 || j >= sibs.length) return;
  [sibs[i], sibs[j]] = [sibs[j], sibs[i]];
  const re = sibs.map((x, k) => ({ ...x, position: k }));
  emit({ sections: snap.sections.map((x) => re.find((r) => r.id === x.id) ?? x) });
  await write(() => db().from("list_sections").upsert(re.map(sectionRow)));
}

export async function addItem(listId: string, sectionId: string | null, title: string, extra: Partial<ListItem> = {}) {
  const sibs = snap.items.filter((i) => i.listId === listId && i.sectionId === sectionId), stamp = now();
  const it: ListItem = { id: uuid(), listId, sectionId, title: title.trim().slice(0, 300), notes: null, position: sibs.length, priority: null, dueDate: null, completedAt: null, completedOn: null,
    schedule: null, fieldValues: {}, linkKind: null, linkId: null, createdAt: stamp, updatedAt: stamp, ...extra };
  emit({ items: [...snap.items, it] }); await write(() => db().from("list_items").insert(itemRow(it))); return it.id;
}
export async function updateItem(id: string, patch: Partial<ListItem>) {
  emit({ items: snap.items.map((i) => i.id === id ? { ...i, ...patch, updatedAt: now() } : i) });
  await write(() => db().from("list_items").update(itemRow(snap.items.find((i) => i.id === id)!)).eq("id", id));
}
export async function deleteItem(id: string) {
  emit({ items: snap.items.filter((i) => i.id !== id), events: snap.events.filter((e) => e.itemId !== id) });
  await write(() => db().from("list_items").delete().eq("id", id));
}
/** Move an item to a section (or Unsorted) at an index; renumbers only the two affected groups. */
export async function moveItem(id: string, sectionId: string | null, index: number) {
  const it = snap.items.find((i) => i.id === id); if (!it) return;
  const group = (sid: string | null) => snap.items.filter((i) => i.listId === it.listId && i.sectionId === sid && i.id !== id).sort((a, b) => a.position - b.position);
  const target = group(sectionId); target.splice(Math.max(0, Math.min(index, target.length)), 0, { ...it, sectionId });
  const changed = [...target.map((x, k) => ({ ...x, position: k })), ...(it.sectionId !== sectionId ? group(it.sectionId).map((x, k) => ({ ...x, position: k })) : [])];
  emit({ items: snap.items.map((x) => changed.find((c) => c.id === x.id) ?? x) });
  await write(() => db().from("list_items").upsert(changed.map(itemRow)));
}
export async function resetChecklist(listId: string) {
  const ids = snap.items.filter((i) => i.listId === listId && !i.schedule && i.completedAt).map((i) => i.id);
  if (!ids.length) return;
  emit({ items: snap.items.map((i) => ids.includes(i.id) ? { ...i, completedAt: null, completedOn: null } : i) });
  await write(() => db().from("list_items").update({ completed_at: null, completed_on: null }).in("id", ids));
}

/* ---------- completion, skipping, rescheduling ---------- */

const eventsOf = (itemId: string) => snap.events.filter((e) => e.itemId === itemId);
async function putEvent(e: Omit<ListEvent, "id" | "recordedAt">) {
  const full: ListEvent = { ...e, id: uuid(), recordedAt: now() };
  emit({ events: [full, ...snap.events.filter((x) => !(x.itemId === e.itemId && x.periodStart === e.periodStart && x.kind === e.kind))] });
  await write(() => db().from("list_item_events").upsert({ id: full.id, list_id: full.listId, item_id: full.itemId, kind: full.kind, period_start: full.periodStart, period_end: full.periodEnd,
    moved_to: full.movedTo ?? null, occurred_on: full.occurredOn ?? null, source: full.source }, { onConflict: "item_id,period_start,kind" }));
}
async function dropEvent(itemId: string, periodStart: string, kind: ListEvent["kind"]) {
  emit({ events: snap.events.filter((x) => !(x.itemId === itemId && x.periodStart === periodStart && x.kind === kind)) });
  await write(() => db().from("list_item_events").delete().eq("item_id", itemId).eq("period_start", periodStart).eq("kind", kind));
}

/**
 * Check/uncheck. One-off items store completion on the item. Scheduled items record (or undo) a completion for the
 * CURRENT period only — the series and its history stay; next period starts unchecked.
 */
export async function toggleItem(item: ListItem, today: string) {
  if (!item.schedule) {
    const done = !item.completedAt;
    return updateItem(item.id, { completedAt: done ? now() : null, completedOn: done ? today : null });
  }
  const p = periodFor(item.schedule, today); if (!p) return;
  const own = eventsOf(item.id).filter((e) => e.periodStart === p.start);
  if (own.some((e) => e.kind === "completed")) return dropEvent(item.id, p.start, "completed");
  if (own.some((e) => e.kind === "skipped")) await dropEvent(item.id, p.start, "skipped");
  return putEvent({ itemId: item.id, listId: item.listId, kind: "completed", periodStart: p.start, periodEnd: p.end, occurredOn: today, source: "list" });
}
export async function skipPeriod(item: ListItem, today: string, skip: boolean) {
  if (!item.schedule) return; const p = periodFor(item.schedule, today); if (!p) return;
  if (!skip) return dropEvent(item.id, p.start, "skipped");
  if (eventsOf(item.id).some((e) => e.periodStart === p.start && e.kind === "completed")) await dropEvent(item.id, p.start, "completed");
  return putEvent({ itemId: item.id, listId: item.listId, kind: "skipped", periodStart: p.start, periodEnd: p.end, source: "list" });
}
/** Move this period's planned day (the series is untouched). `to=null` puts it back. */
export async function reschedulePeriod(item: ListItem, today: string, to: string | null) {
  if (!item.schedule) return; const p = periodFor(item.schedule, today); if (!p) return;
  if (!to || to === p.start) return dropEvent(item.id, p.start, "rescheduled");
  return putEvent({ itemId: item.id, listId: item.listId, kind: "rescheduled", periodStart: p.start, periodEnd: p.end, movedTo: to, source: "list" });
}
/** Undo a single recorded history entry (e.g. an accidental completion in a past period). */
export async function removeEvent(itemId: string, periodStart: string, kind: ListEvent["kind"]) { return dropEvent(itemId, periodStart, kind); }
/** Changing a schedule keeps all history; missed periods are counted from the change onward. */
export async function setSchedule(item: ListItem, schedule: ListSchedule | null, today: string) {
  return updateItem(item.id, { schedule: schedule ? { ...schedule, since: today } : null, completedAt: null, completedOn: null });
}
export async function importEvents(rows: Omit<ListEvent, "id" | "recordedAt">[]) { for (const r of rows) await putEvent(r); }
export const listsSnapshot = () => snap;

/**
 * Keep the history copy of a linked task in step with the Planner (only writes what changed). The Planner stays the
 * source of truth while linked; these copies are what remain if the item is unlinked or the task is deleted.
 */
export async function syncTaskCopies(itemId: string, desired: Omit<ListEvent, "id" | "recordedAt">[]) {
  const key = (e: { periodStart: string; kind: string }) => `${e.periodStart}|${e.kind}`;
  const copies = snap.events.filter((e) => e.itemId === itemId && e.source === "task"), want = new Map(desired.map((d) => [key(d), d]));
  for (const d of desired) {
    const c = copies.find((x) => key(x) === key(d));
    if (!c || c.occurredOn !== d.occurredOn || c.movedTo !== d.movedTo) await putEvent(d);
  }
  for (const c of copies) if (!want.has(key(c))) await dropEvent(itemId, c.periodStart, c.kind);
}
