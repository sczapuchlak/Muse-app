import type { MovementType } from "./models";

export const MAX_CONTEXT_TAGS = 3;
export const MAX_QUICK_MOVEMENTS = 5;

export function toggleSelection(ids: string[], id: string, limit = Infinity): string[] {
  if (ids.includes(id)) return ids.filter((value) => value !== id);
  return ids.length < limit ? [...ids, id] : ids;
}

export function normalizeMovementName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function movementNameError(name: string, types: MovementType[], editingId?: string): string | null {
  const normalized = normalizeMovementName(name);
  if (!normalized) return "Enter a movement name.";
  if (normalized.length > 40) return "Use 40 characters or fewer.";
  if (types.some((type) => !type.archived && type.id !== editingId && type.name.toLocaleLowerCase("en-US") === normalized.toLocaleLowerCase("en-US"))) {
    return "That movement type already exists.";
  }
  return null;
}

/** Most-recent use first; preferred/pinned slots can be protected by future profile settings. */
export function promoteMovement(quickIds: string[], id: string, recentIds: string[], selectedIds: string[], pinnedIds: string[] = []): string[] {
  if (quickIds.includes(id)) return quickIds;
  const capacity = Math.max(1, Math.min(MAX_QUICK_MOVEMENTS, quickIds.length));
  if (quickIds.length < capacity) return [...quickIds, id];
  const candidates = quickIds.filter((value) => !pinnedIds.includes(value));
  const rank = (value: string) => recentIds.includes(value) ? recentIds.indexOf(value) : Number.MAX_SAFE_INTEGER;
  const evicted = candidates.reduce<string | undefined>((oldest, value) => {
    if (!oldest) return value;
    const oldSelected = selectedIds.includes(oldest), nextSelected = selectedIds.includes(value);
    if (oldSelected !== nextSelected) return oldSelected ? value : oldest;
    return rank(value) >= rank(oldest) ? value : oldest;
  }, undefined);
  return evicted ? quickIds.map((value) => value === evicted ? id : value) : quickIds;
}
