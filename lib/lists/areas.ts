/**
 * Spaces: what one area (a section, or the space's top area when `sectionId` is null) shows, in order. Pure.
 *
 * Items written before blocks existed have no `blockId`; they show in their area's first checklist. When an area has
 * no checklist yet, a virtual one holds them (and is the quick-add for an empty section), so older lists look exactly as
 * they did, and nothing is rewritten just to view it.
 */
import type { ListBlock } from "./blocks";
import type { ListItem } from "./model";

export const virtualId = (sectionId: string | null) => `virtual:${sectionId ?? "root"}`;
export const isVirtualId = (id: string) => id.startsWith("virtual:");

const byPos = <T extends { position: number; createdAt: string }>(a: T, b: T) => a.position - b.position || a.createdAt.localeCompare(b.createdAt);

export type AreaView = { blocks: ListBlock[]; itemsOf: Map<string, ListItem[]> };

/** `items` must already be the area's items. `showEmpty` adds the virtual checklist even when the area is empty. */
export function areaView(listId: string, sectionId: string | null, blocks: ListBlock[], items: ListItem[], showEmpty = true): AreaView {
  const real = blocks.filter((b) => b.listId === listId && b.sectionId === sectionId && !b.virtual).sort(byPos);
  const checklists = real.filter((b) => b.kind === "checklist"), host = checklists[0]?.id;
  const vid = virtualId(sectionId), itemsOf = new Map<string, ListItem[]>();
  for (const it of items) {
    const own = it.blockId && checklists.some((c) => c.id === it.blockId) ? it.blockId : host ?? vid;
    itemsOf.set(own, [...(itemsOf.get(own) ?? []), it]);
  }
  for (const [k, v] of itemsOf) itemsOf.set(k, v.sort(byPos));
  const needVirtual = itemsOf.has(vid) || (!real.length && showEmpty);
  const out = needVirtual ? [{ id: vid, listId, sectionId, kind: "checklist" as const, position: -1, width: "full" as const, data: {}, createdAt: "", updatedAt: "", virtual: true }, ...real] : real;
  return { blocks: out, itemsOf };
}

/** The checklist an item currently shows in (a real block id, or the area's virtual id). */
export function blockOfItem(item: ListItem, blocks: ListBlock[]) {
  const checklists = blocks.filter((b) => b.listId === item.listId && b.sectionId === item.sectionId && b.kind === "checklist" && !b.virtual).sort(byPos);
  return item.blockId && checklists.some((c) => c.id === item.blockId) ? item.blockId : checklists[0]?.id ?? virtualId(item.sectionId);
}
