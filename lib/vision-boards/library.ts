/**
 * Vision Boards 2.0 (#187): Muse's built-in creative library. Items come from the generated registry
 * (`npm run vision:assets`), so new collections need no editor changes: drop files into assets-src/vision and rebuild.
 * The person's own uploads are separate (private storage, per board) and appear beside these in the browser.
 */
import { libraryItems } from "./library.generated";

export type LibraryKind = "pattern" | "texture" | "paper" | "sticker" | "washi" | "label" | "ribbon" | "frame" | "illustration";
/** `window` (frames): the photo window as [x, y, w, h], fractions of the frame. */
export type LibraryItem = { id: string; kind: LibraryKind; category: string; name: string; src: string; thumb: string; w: number; h: number; alpha: boolean; tileable: boolean; tags: string[]; window?: number[] };

/** The browser's sections, in order. Patterns and textures are fills; everything else is placed as a piece. */
export const libraryKinds: { id: LibraryKind; label: string; fill: boolean }[] = [
  { id: "pattern", label: "Patterns", fill: true },
  { id: "texture", label: "Textures", fill: true },
  { id: "paper", label: "Paper", fill: false },
  { id: "washi", label: "Washi tape", fill: false },
  { id: "sticker", label: "Stickers", fill: false },
  { id: "label", label: "Labels", fill: false },
  { id: "ribbon", label: "Ribbons", fill: false },
  { id: "frame", label: "Frames", fill: false },
  { id: "illustration", label: "Illustrations", fill: false },
];
export const isFillKind = (k: LibraryKind) => libraryKinds.find((x) => x.id === k)?.fill ?? false;

const byId = new Map(libraryItems.map((i) => [i.id, i]));
export const libraryItem = (id: string): LibraryItem | undefined => byId.get(id);
export const allLibraryItems = (): LibraryItem[] => libraryItems;
export const categoriesOf = (kind: LibraryKind) => [...new Set(libraryItems.filter((i) => i.kind === kind).map((i) => i.category))];
/** The pattern collection's curated categories, in browsing order (#187). Others fall back to a title-cased slug. */
export const fillCategories: { id: string; label: string }[] = [
  { id: "girly-romantic", label: "Girly & Romantic" }, { id: "celestial-cosmic", label: "Celestial & Cosmic" },
  { id: "parisian-vintage", label: "Parisian & Vintage" }, { id: "scrapbook-paper", label: "Scrapbook & Paper" },
  { id: "retro-groovy", label: "Retro & Groovy" }, { id: "botanical-cottagecore", label: "Botanical & Cottagecore" },
  { id: "glam-iridescent", label: "Glam & Iridescent" }, { id: "dark-moody", label: "Dark & Moody" },
  { id: "playful-whimsical", label: "Playful & Whimsical" }, { id: "minimal-editorial", label: "Minimal & Editorial" },
  { id: "journal-stationery", label: "Journal & Stationery" },
];
export const categoryLabel = (c: string) => fillCategories.find((x) => x.id === c)?.label ?? c.replace(/-/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());
/** Categories that hold fills (patterns and textures), curated order first. */
export function fillCategoryList(): string[] {
  const present = new Set(libraryItems.filter((i) => isFillKind(i.kind)).map((i) => i.category));
  return [...fillCategories.map((c) => c.id).filter((c) => present.has(c)), ...[...present].filter((c) => !fillCategories.some((x) => x.id === c)).sort()];
}

/** Library items for a kind, narrowed by category and a search over name, category and tags. */
export function searchLibrary(kind: LibraryKind | "fills", q = "", category = ""): LibraryItem[] {
  const needle = q.trim().toLowerCase();
  return libraryItems.filter((i) => (kind === "fills" ? isFillKind(i.kind) : i.kind === kind)
    && (!category || i.category === category)
    && (!needle || [i.name, i.category, i.kind, ...i.tags].some((s) => s.toLowerCase().includes(needle))));
}
/** A placed piece's starting size: its own proportions, about a quarter of the board's shorter side. */
export function pieceSize(item: Pick<LibraryItem, "w" | "h" | "kind">, board: { w: number; h: number }): { w: number; h: number } {
  const share = item.kind === "washi" ? 0.32 : item.kind === "paper" || item.kind === "frame" ? 0.34 : 0.22;
  const long = Math.min(board.w, board.h) * share * (item.kind === "washi" ? 1.6 : 1.3), ratio = item.w / item.h;
  return ratio >= 1 ? { w: Math.round(long), h: Math.round(long / ratio) } : { w: Math.round(long * ratio), h: Math.round(long) };
}
