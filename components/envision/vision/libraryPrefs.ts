/**
 * Favorites and recently used library items, kept on this device (like the font picker's). Small conveniences only:
 * nothing about a board depends on them, and an empty or blocked storage simply shows no favorites.
 */
const FAV = "muse.vision.library.favorites", RECENT = "muse.vision.library.recent";
const read = (k: string): string[] => { try { const v = JSON.parse(localStorage.getItem(k) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 80) : []; } catch { return []; } };
const write = (k: string, v: string[]) => { try { localStorage.setItem(k, JSON.stringify(v.slice(0, 80))); } catch { /* this session only */ } };
export const favorites = () => read(FAV);
export function toggleFavorite(id: string): string[] { const l = read(FAV), next = l.includes(id) ? l.filter((x) => x !== id) : [id, ...l]; write(FAV, next); return next; }
export const recents = () => read(RECENT);
export function noteRecent(id: string) { write(RECENT, [id, ...read(RECENT).filter((x) => x !== id)].slice(0, 16)); }
