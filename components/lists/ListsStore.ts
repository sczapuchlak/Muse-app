"use client";
import { useEffect, useSyncExternalStore } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/database.types";
import { copyBundle, itemFromRow, listFromRow, sectionFromRow, starterCard, starters, type ListBundle, type ListItem, type ListPreset, type ListSection, type MuseList, type StarterItem } from "@/lib/lists/model";
import { blockFromRow, imagesOfBlock, presetOf, templateFromRow, type CardTemplate, type BlockData, type BlockKind, type BlockWidth, type CardData, type ListBlock, type SpaceImage } from "@/lib/lists/blocks";
import { areaView, blockOfItem, isVirtualId } from "@/lib/lists/areas";
import { uploadBoardImage, boardImageBucket } from "@/lib/data/constellation-images";
import { anchorFor, periodFor, schedulePresets, type ListEvent, type ListSchedule } from "@/lib/lists/schedule";
import { shiftDate } from "@/lib/dates";

/**
 * Mindspace Lists data (#110). Owner-only tables (RLS); every change is applied locally first, written straight away,
 * and reloaded from the server if a write fails so the screen never drifts from what's saved.
 */
/** `blocksReady` is false only on a database that predates Spaces blocks (lists still work there). */
type Snap = { loaded: boolean; error: string; lists: MuseList[]; sections: ListSection[]; items: ListItem[]; events: ListEvent[]; blocks: ListBlock[]; blocksReady: boolean; /** My card templates (any space). */ cardTemplates: CardTemplate[]; templatesReady: boolean };
let snap: Snap = { loaded: false, error: "", lists: [], sections: [], items: [], events: [], blocks: [], blocksReady: true, cardTemplates: [], templatesReady: true };
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
  aspiration_id: l.aspirationId, position: l.position, ...(l.cover !== undefined ? { cover: l.cover } : {}), ...(l.sectionTiles !== undefined ? { section_tiles: l.sectionTiles } : {}), ...(l.paint !== undefined ? { paint: l.paint as unknown as Json } : {}) });
/** `description` is sent only when set, so a database without the Nov 25 column still saves every other section. */
const sectionRow = (s: ListSection) => ({ id: s.id, list_id: s.listId, title: s.title.trim(), ...(s.description !== undefined ? { description: s.description?.trim() || null } : {}), icon: s.icon, accent: s.accent, position: s.position, collapsed: s.collapsed });
const itemRow = (i: ListItem) => ({ id: i.id, list_id: i.listId, section_id: i.sectionId, title: i.title.trim(), notes: i.notes, position: i.position, priority: i.priority, due_date: i.dueDate,
  completed_at: i.completedAt, completed_on: i.completedOn, schedule: i.schedule, field_values: i.fieldValues, link_kind: i.linkKind, link_id: i.linkId, ...(i.blockId !== undefined ? { block_id: i.blockId } : {}) });
const blockRow = (b: ListBlock) => ({ id: b.id, list_id: b.listId, section_id: b.sectionId, kind: b.kind, position: b.position, width: b.width, data: b.data as unknown as NonNullable<Json> });
const missingTable = (e: { code?: string } | null) => !!e && ["PGRST205", "42P01"].includes(String(e.code));

export async function loadLists(force = false) {
  if (loading && !force) return loading;
  loading = (async () => {
    const since = shiftDate(new Date().toISOString().slice(0, 10), -800);
    const [l, s, i, e, b, t] = await Promise.all([
      db().from("lists").select("*").order("position"), db().from("list_sections").select("*").order("position"),
      db().from("list_items").select("*").order("position"), db().from("list_item_events").select("*").gte("period_end", since).order("period_start", { ascending: false }).limit(5000),
      db().from("list_blocks").select("*").order("position"), db().from("list_card_templates").select("*").order("position")]);
    const err = l.error ?? s.error ?? i.error ?? e.error ?? (missingTable(b.error) ? null : b.error) ?? (missingTable(t.error) ? null : t.error);
    if (err) { emit({ loaded: true, error: "Your spaces couldn’t load. Check your connection and try again." }); return; }
    emit({ loaded: true, error: "", lists: (l.data ?? []).map(listFromRow), sections: (s.data ?? []).map(sectionFromRow), items: (i.data ?? []).map(itemFromRow), events: (e.data ?? []).map(eventFromRow),
      blocks: (b.data ?? []).map(blockFromRow), blocksReady: !b.error, cardTemplates: (t.data ?? []).map(templateFromRow), templatesReady: !t.error });
  })().finally(() => { loading = null; });
  return loading;
}

async function write(run: () => PromiseLike<{ error: unknown }>, message = "That change didn’t save. Your spaces were refreshed from what’s saved.") {
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
  return list ? { list, sections: s.sections.filter((x) => x.listId === listId).sort((a, b) => a.position - b.position), items: s.items.filter((x) => x.listId === listId).sort((a, b) => a.position - b.position),
    blocks: s.blocks.filter((x) => x.listId === listId).sort((a, b) => a.position - b.position) } : null;
};

async function insertBundle(b: ListBundle) {
  const blocks = snap.blocksReady ? b.blocks : [];
  emit({ lists: [...snap.lists, b.list], sections: [...snap.sections, ...b.sections], items: [...snap.items, ...b.items], blocks: [...snap.blocks, ...blocks] });
  // Read the new row back, so the space knows which settings this database supports (e.g. section tiles).
  const created = await db().from("lists").insert(listRow(b.list)).select().single();
  if (created.error) { emit({ error: "That change didn’t save. Your spaces were refreshed from what’s saved." }); await loadLists(true); throw created.error; }
  if (created.data) { const fresh = listFromRow(created.data); emit({ lists: snap.lists.map((l) => l.id === fresh.id ? fresh : l) }); }
  if (b.sections.length) await write(() => db().from("list_sections").insert(b.sections.map(sectionRow)));
  if (blocks.length) await write(() => db().from("list_blocks").insert(blocks.map(blockRow)));
  if (b.items.length) await write(() => db().from("list_items").insert(b.items.map(itemRow)));
  return b.list.id;
}

/** New space from a starter (or blank), already independent. */
export async function createList(opts: { starterId: string; title?: string; preset?: ListPreset; today: string }) {
  const st = starters.find((x) => x.id === opts.starterId) ?? starters[0], listId = uuid(), stamp = now();
  const list: MuseList = { id: listId, title: (opts.title?.trim() || st.title).slice(0, 120), description: st.id === "blank" ? null : st.description, icon: st.icon, accent: st.accent,
    preset: opts.preset ?? st.preset, isTemplate: false, pinned: false, archivedAt: null, startDate: null, endDate: null, fields: st.fields ?? [], tableView: false, columns: st.columns ?? 0, itemGroup: "section", itemSort: "manual",
    showInDaily: false, showInAgenda: false, aspirationId: null, position: snap.lists.length, createdAt: stamp, updatedAt: stamp };
  const sections: ListSection[] = [], items: ListItem[] = [], blocks: ListBlock[] = [];
  const block = (sectionId: string | null, kind: BlockKind, data: BlockData, position: number, width: BlockWidth = "full"): string => {
    const id = uuid(); blocks.push({ id, listId, sectionId, kind, position, width, data, createdAt: stamp, updatedAt: stamp }); return id; };
  const addItems = (raw: StarterItem[], sectionId: string | null, blockId: string) => raw.forEach((r, ii) => {
    const it = typeof r === "string" ? { title: r } : r, preset = schedulePresets.find((p) => p.id === it.repeat);
    const mode = it.mode ?? "flexible", rule = preset?.rule(opts.today);
    const dayAnchor = "day" in it && typeof it.day === "number" ? shiftDate(anchorFor({ freq: "weekly", interval: 1 }, "flexible", opts.today), (it.day + 6) % 7) : null;
    const schedule: ListSchedule | null = rule ? { rule, anchor: dayAnchor ?? anchorFor(rule, mode, opts.today), mode, since: opts.today } : null;
    items.push({ id: uuid(), listId, sectionId, blockId, title: it.title, notes: null, position: ii, priority: null, dueDate: null, completedAt: null, completedOn: null, schedule,
      fieldValues: it.fields ?? {}, linkKind: null, linkId: null, createdAt: stamp, updatedAt: stamp });
  });
  if (st.rootItems) addItems(st.rootItems, null, block(null, "checklist", {}, 0));
  st.sections.forEach((sec, si) => {
    const sid = uuid(); sections.push({ id: sid, listId, title: sec.title, ...(sec.description ? { description: sec.description } : {}), icon: sec.icon ?? null, accent: null, position: si, collapsed: false });
    let pos = 0;
    if (sec.items) addItems(sec.items, sid, block(sid, "checklist", {}, pos++));
    for (const b of sec.blocks ?? []) {
      if (b.kind === "checklist") addItems(b.items, sid, block(sid, "checklist", { title: b.title }, pos++));
      else if (b.kind === "note") block(sid, "note", { title: b.title, doc: b.doc, text: "" }, pos++, b.width);
      else if (b.kind === "card") block(sid, "card", starterCard(b), pos++, b.width ?? presetOf(b.preset).width);
      else if (b.kind === "images") block(sid, "images", { title: b.title, images: [] }, pos++, b.width);
      else if (b.kind === "link") block(sid, "link", { url: "" }, pos++, b.width ?? "half");
      else block(sid, "heading", { text: b.text, style: b.style ?? "title" }, pos++);
    }
  });
  // On a database without blocks, items stay plain list items (the original Lists shape).
  if (!snap.blocksReady) for (const it of items) it.blockId = undefined;
  return insertBundle({ list, sections, items, blocks });
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
  const files = [...snap.blocks.filter((b) => b.listId === id).flatMap(imagesOfBlock), ...(snap.lists.find((l) => l.id === id)?.cover ? [snap.lists.find((l) => l.id === id)!.cover!.image] : [])];
  emit({ blocks: snap.blocks.filter((b) => b.listId !== id),  lists: snap.lists.filter((l) => l.id !== id), sections: snap.sections.filter((s) => s.listId !== id), items: snap.items.filter((i) => i.listId !== id), events: snap.events.filter((e) => e.listId !== id) });
  await write(() => db().from("lists").delete().eq("id", id));
  await releaseImages(files);
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
  emit({ sections: snap.sections.filter((s) => s.id !== id), items: snap.items.map((i) => i.sectionId === id ? { ...i, sectionId: null } : i), blocks: snap.blocks.map((b) => b.sectionId === id ? { ...b, sectionId: null } : b) });
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
/** Drag and drop: the list's sections take the given order. */
export async function reorderSections(listId: string, ids: string[]) {
  const sibs = snap.sections.filter((x) => x.listId === listId).sort((a, b) => a.position - b.position);
  const ordered = [...ids.map((id) => sibs.find((s) => s.id === id)).filter((s): s is ListSection => !!s), ...sibs.filter((s) => !ids.includes(s.id))];
  const re = ordered.map((x, k) => ({ ...x, position: k })), changed = re.filter((x) => sibs.find((s) => s.id === x.id)?.position !== x.position);
  if (!changed.length) return;
  emit({ sections: snap.sections.map((x) => re.find((r) => r.id === x.id) ?? x) });
  await write(() => db().from("list_sections").upsert(changed.map(sectionRow)));
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
/**
 * Move an item to a section (or the top area) at an index, inside a given checklist (`blockId`; omitted = that
 * section's first checklist). Renumbers only the two affected checklists.
 */
export async function moveItem(id: string, sectionId: string | null, index: number, blockId?: string) {
  const it = snap.items.find((i) => i.id === id); if (!it) return;
  const listBlocks = snap.blocks.filter((b) => b.listId === it.listId);
  const target = blockId && !isVirtualId(blockId) ? blockId : blockId ? null : areaView(it.listId, sectionId, listBlocks, [], false).blocks.find((b) => b.kind === "checklist")?.id ?? null;
  const from = blockOfItem(it, listBlocks);
  const moved: ListItem = { ...it, sectionId, ...(it.blockId !== undefined || target ? { blockId: target } : {}) };
  const shownIn = (x: ListItem) => blockOfItem(x, listBlocks);
  const to = shownIn(moved);
  const group = (key: string, sid: string | null) => snap.items.filter((i) => i.listId === it.listId && i.id !== id && i.sectionId === sid && shownIn(i) === key).sort((a, b) => a.position - b.position);
  const dest = group(to, sectionId); dest.splice(Math.max(0, Math.min(index, dest.length)), 0, moved);
  const changed = [...dest.map((x, k) => ({ ...x, position: k })), ...(from !== to || it.sectionId !== sectionId ? group(from, it.sectionId).map((x, k) => ({ ...x, position: k })) : [])];
  emit({ items: snap.items.map((x) => changed.find((c) => c.id === x.id) ?? x) });
  await write(() => db().from("list_items").upsert(changed.map(itemRow)));
}

/* ---------- Spaces: content blocks ---------- */

const areaBlocks = (listId: string, sectionId: string | null) => snap.blocks.filter((b) => b.listId === listId && b.sectionId === sectionId).sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
async function saveBlocks(changed: ListBlock[]) { if (changed.length) await write(() => db().from("list_blocks").upsert(changed.map(blockRow))); }
const renumber = (xs: ListBlock[]) => xs.map((x, k) => ({ ...x, position: k }));

/** Add a block to an area at `index` (end by default). Older loose items get a real checklist first, so order holds. */
export async function addBlock(listId: string, sectionId: string | null, kind: BlockKind, data: BlockData, opts: { width?: BlockWidth; index?: number } = {}) {
  if (!snap.blocksReady) { emit({ error: "Spaces need a quick update before this can save. Refresh in a minute." }); throw Error("blocks unavailable"); }
  if (kind !== "checklist") await ensureChecklist(listId, sectionId, false);
  const stamp = now(), b: ListBlock = { id: uuid(), listId, sectionId, kind, position: 0, width: opts.width ?? "full", data, createdAt: stamp, updatedAt: stamp };
  const area = areaBlocks(listId, sectionId), before = new Map(area.map((x) => [x.id, x.position]));
  area.splice(Math.max(0, Math.min(opts.index ?? area.length, area.length)), 0, b);
  const re = renumber(area), mine = re.find((x) => x.id === b.id)!;
  emit({ blocks: [...snap.blocks.map((x) => re.find((r) => r.id === x.id) ?? x), mine] });
  await write(() => db().from("list_blocks").insert(blockRow(mine)));
  await saveBlocks(re.filter((x) => x.id !== b.id && before.get(x.id) !== x.position));
  return b.id;
}

/**
 * The area's real checklist (creating one at the top when older loose items, or a virtual checklist, need a home).
 * `always` creates one even when nothing needs it.
 */
export async function ensureChecklist(listId: string, sectionId: string | null, always = true) {
  const area = areaBlocks(listId, sectionId), existing = area.find((b) => b.kind === "checklist");
  if (existing) return existing.id;
  const loose = snap.items.filter((i) => i.listId === listId && i.sectionId === sectionId);
  if (!loose.length && !always) return null;
  const stamp = now(), b: ListBlock = { id: uuid(), listId, sectionId, kind: "checklist", position: 0, width: "full", data: {}, createdAt: stamp, updatedAt: stamp };
  const re = renumber([b, ...area]);
  emit({ blocks: [...snap.blocks.map((x) => re.find((r) => r.id === x.id) ?? x), b], items: snap.items.map((i) => loose.some((l) => l.id === i.id) ? { ...i, blockId: b.id } : i) });
  await write(() => db().from("list_blocks").insert(blockRow(b)));
  await saveBlocks(re.filter((x) => x.id !== b.id));
  if (loose.length) await write(() => db().from("list_items").update({ block_id: b.id }).in("id", loose.map((i) => i.id)));
  return b.id;
}
/** A real block id for something on screen (a virtual checklist becomes real first). */
export async function realBlockId(id: string, listId: string, sectionId: string | null) { return isVirtualId(id) ? (await ensureChecklist(listId, sectionId))! : id; }

export async function updateBlock(id: string, patch: { data?: BlockData; width?: BlockWidth }) {
  const cur = snap.blocks.find((b) => b.id === id); if (!cur) return;
  const next = { ...cur, ...patch, updatedAt: now() };
  emit({ blocks: snap.blocks.map((b) => b.id === id ? next : b) });
  await write(() => db().from("list_blocks").update({ data: next.data as unknown as NonNullable<Json>, width: next.width }).eq("id", id));
}

/** Delete a block. A checklist takes the items it shows with it (the confirmation says how many). Photos no longer used anywhere are removed. */
export async function deleteBlock(id: string, itemIds: string[] = []) {
  const cur = snap.blocks.find((b) => b.id === id); if (!cur) return;
  emit({ blocks: snap.blocks.filter((b) => b.id !== id), items: snap.items.filter((i) => !itemIds.includes(i.id)), events: snap.events.filter((e) => !itemIds.includes(e.itemId)) });
  if (itemIds.length) await write(() => db().from("list_items").delete().in("id", itemIds));
  await write(() => db().from("list_blocks").delete().eq("id", id));
  await releaseImages(imagesOfBlock(cur));
}

export async function duplicateBlock(id: string) {
  const cur = snap.blocks.find((b) => b.id === id); if (!cur || cur.kind === "checklist") return null;
  const index = areaBlocks(cur.listId, cur.sectionId).findIndex((b) => b.id === id) + 1;
  return addBlock(cur.listId, cur.sectionId, cur.kind, structuredClone(cur.data), { width: cur.width, index });
}

/** Move a block to an area at an index (its checklist items travel with it). */
export async function moveBlock(id: string, sectionId: string | null, index: number) {
  const cur = snap.blocks.find((b) => b.id === id); if (!cur) return;
  if (cur.sectionId !== sectionId) await ensureChecklist(cur.listId, sectionId, false);
  const fromArea = areaBlocks(cur.listId, cur.sectionId).filter((b) => b.id !== id);
  const toArea = cur.sectionId === sectionId ? fromArea : areaBlocks(cur.listId, sectionId);
  toArea.splice(Math.max(0, Math.min(index, toArea.length)), 0, { ...cur, sectionId });
  const changed = [...renumber(toArea), ...(cur.sectionId !== sectionId ? renumber(fromArea) : [])];
  const carried = cur.kind === "checklist" && cur.sectionId !== sectionId ? snap.items.filter((i) => i.listId === cur.listId && blockOfItem(i, snap.blocks.filter((b) => b.listId === cur.listId)) === id) : [];
  emit({ blocks: snap.blocks.map((x) => changed.find((c) => c.id === x.id) ?? x), items: snap.items.map((i) => carried.some((c) => c.id === i.id) ? { ...i, sectionId, blockId: id } : i) });
  await saveBlocks(changed);
  if (carried.length) await write(() => db().from("list_items").update({ section_id: sectionId, block_id: id }).in("id", carried.map((i) => i.id)));
}

/** Move up or down within its own area. */
export async function moveBlockBy(id: string, by: -1 | 1) {
  const cur = snap.blocks.find((b) => b.id === id); if (!cur) return;
  const i = areaBlocks(cur.listId, cur.sectionId).findIndex((b) => b.id === id);
  return moveBlock(id, cur.sectionId, Math.max(0, i + by));
}
/** Deleting a virtual checklist (older loose items) deletes those items. */
export async function deleteItems(ids: string[]) {
  if (!ids.length) return;
  emit({ items: snap.items.filter((i) => !ids.includes(i.id)), events: snap.events.filter((e) => !ids.includes(e.itemId)) });
  await write(() => db().from("list_items").delete().in("id", ids));
}

/* ---------- Spaces: card templates (My templates, usable in any space) ---------- */

type TemplateStructure = Pick<CardTemplate, "preset" | "icon" | "fields" | "display" | "preview" | "aside" | "look">;
const templateRow = (t: CardTemplate) => ({ id: t.id, name: t.name.trim().slice(0, 80) || "Card", preset: t.preset, icon: t.icon, fields: t.fields as unknown as NonNullable<Json>, display: { mode: t.display, preview: t.preview, ...(t.aside ? { aside: t.aside } : {}), ...(t.look ? { look: t.look } : {}) } as unknown as NonNullable<Json>, position: t.position, updated_at: t.updatedAt });
export async function createCardTemplate(name: string, structure: TemplateStructure) {
  if (!snap.templatesReady) { emit({ error: "Card templates need a quick update before they can save. Refresh in a minute." }); throw Error("templates unavailable"); }
  const stamp = now(), t: CardTemplate = { id: uuid(), name: name.trim().slice(0, 80) || "Card", ...structure, position: snap.cardTemplates.length, createdAt: stamp, updatedAt: stamp };
  emit({ cardTemplates: [...snap.cardTemplates, t] });
  await write(() => db().from("list_card_templates").insert(templateRow(t)));
  return t.id;
}
/** Editing a template changes future cards only; cards already made keep their own fields. */
export async function updateCardTemplate(id: string, patch: Partial<Omit<CardTemplate, "id">>) {
  const cur = snap.cardTemplates.find((t) => t.id === id); if (!cur) return;
  const next = { ...cur, ...patch, updatedAt: now() };
  emit({ cardTemplates: snap.cardTemplates.map((t) => t.id === id ? next : t) });
  await write(() => db().from("list_card_templates").update(templateRow(next)).eq("id", id));
}
export async function duplicateCardTemplate(id: string) {
  const cur = snap.cardTemplates.find((t) => t.id === id); if (!cur) return null;
  return createCardTemplate(`${cur.name} copy`, structuredClone({ preset: cur.preset, icon: cur.icon, fields: cur.fields, display: cur.display, preview: cur.preview, aside: cur.aside, look: cur.look }));
}
/** Deleting a template never touches the cards made from it. */
export async function deleteCardTemplate(id: string) {
  emit({ cardTemplates: snap.cardTemplates.filter((t) => t.id !== id) });
  await write(() => db().from("list_card_templates").delete().eq("id", id));
}

/* ---------- Spaces: duplicate a section ---------- */

/**
 * Duplicate a section right after itself.
 * - Structure: the same blocks, layout and card field definitions, with nothing personal: cards keep their fields
 *   but no values, title or photo; notes, links and photo galleries start empty; checklists keep their names but no items.
 * - With content: independent copies of everything written (photos are shared by reference). Checklist items come
 *   unticked, with no history and no Planner link; repeating items restart from today, like any Spaces copy.
 */
export async function duplicateSection(sectionId: string, withContent: boolean, today: string) {
  const src = snap.sections.find((x) => x.id === sectionId); if (!src) return null;
  const sibs = snap.sections.filter((x) => x.listId === src.listId).sort((a, b) => a.position - b.position), at = sibs.findIndex((x) => x.id === sectionId) + 1;
  const stamp = now(), copy: ListSection = { ...src, id: uuid(), title: `${src.title} copy`.slice(0, 80), collapsed: false, position: at };
  const shifted = sibs.slice(at).map((x, k) => ({ ...x, position: at + 1 + k }));
  const srcBlocks = areaBlocks(src.listId, sectionId), ids = new Map(srcBlocks.map((b) => [b.id, uuid()]));
  const blank = (b: ListBlock): BlockData => {
    const d = structuredClone(b.data) as BlockData & Record<string, unknown>;
    if (withContent) return d;
    if (b.kind === "card") { const c = d as CardData; return { ...c, title: "", image: undefined, fields: c.fields.map((f) => ({ ...f, value: "" })) }; }
    if (b.kind === "note") return { title: (d as { title?: string }).title, text: "" };
    if (b.kind === "images") return { title: (d as { title?: string }).title, images: [] };
    if (b.kind === "link") return { url: "" };
    return d;
  };
  const blocks: ListBlock[] = srcBlocks.map((b) => ({ ...b, id: ids.get(b.id)!, sectionId: copy.id, data: blank(b), createdAt: stamp, updatedAt: stamp }));
  const listBlocks = snap.blocks.filter((b) => b.listId === src.listId);
  const items: ListItem[] = !withContent ? [] : snap.items.filter((i) => i.listId === src.listId && i.sectionId === sectionId).map((i) => {
    const shown = blockOfItem(i, listBlocks);
    return { ...i, id: uuid(), sectionId: copy.id, ...(i.blockId !== undefined || ids.has(shown) ? { blockId: ids.get(shown) ?? null } : {}), completedAt: null, completedOn: null, linkKind: null, linkId: null,
      schedule: i.schedule ? { ...i.schedule, anchor: today, since: today } : null, createdAt: stamp, updatedAt: stamp };
  });
  emit({ sections: [...snap.sections.map((x) => shifted.find((y) => y.id === x.id) ?? x), copy], blocks: [...snap.blocks, ...blocks], items: [...snap.items, ...items] });
  if (shifted.length) await write(() => db().from("list_sections").upsert(shifted.map(sectionRow)));
  await write(() => db().from("list_sections").insert(sectionRow(copy)));
  if (blocks.length) await write(() => db().from("list_blocks").insert(blocks.map(blockRow)));
  if (items.length) await write(() => db().from("list_items").insert(items.map(itemRow)));
  return copy.id;
}

/* ---------- Spaces: photos ---------- */

let owner: string | null = null;
async function ownerId() { if (owner) return owner; const { data } = await db().auth.getUser(); owner = data.user?.id ?? null; if (!owner) throw Error("Sign in again to add photos."); return owner; }
/** Upload a private photo for a block or a cover (same private bucket and preparation as Vision Boards). */
export async function uploadSpaceImage(folderId: string, file: File): Promise<SpaceImage> {
  const img = await uploadBoardImage(await ownerId(), folderId, file, { allowJpeg: true, keepTransparency: true });
  return { id: img.id, path: img.path, thumbnailPath: img.thumbnailPath, width: img.width, height: img.height, mime: img.mime, ...(img.alpha ? { alpha: true } : {}) };
}
/** Remove files only when no block or cover still refers to them (copies and templates share files). */
export async function releaseImages(images: SpaceImage[]) {
  if (!images.length) return;
  const used = new Set<string>();
  for (const b of snap.blocks) for (const i of imagesOfBlock(b)) used.add(i.path);
  for (const l of snap.lists) if (l.cover) used.add(l.cover.image.path);
  const gone = images.filter((i) => !used.has(i.path)).flatMap((i) => [i.path, i.thumbnailPath]);
  if (gone.length) await db().storage.from(boardImageBucket).remove(gone).catch(() => undefined);
}
export const cardOf = (b: ListBlock) => b.data as CardData;

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
