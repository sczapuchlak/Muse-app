/**
 * Vision Boards 2.0 (#187): the typography studio's font catalog and lazy loader.
 *
 * The catalog is a curated, static list of Google Fonts families (no API key, no network to browse). Nothing loads
 * up front: a family's CSS is requested only when text on a board uses it, and previews in the picker load a tiny
 * subset (just the letters of the family's name) under a separate alias, so previews never interfere with real text.
 * Exports wait for every family a board uses (`ensureBoardFonts`) so the image matches the editor.
 */
export type FontCategory = "serif" | "sans" | "display" | "script" | "handwriting" | "mono";
export type CatalogFont = { family: string; category: FontCategory; weights: number[]; italic: boolean; variable: boolean };
export const fontCategories: { id: FontCategory; label: string }[] = [
  { id: "serif", label: "Serif" }, { id: "sans", label: "Sans" }, { id: "display", label: "Display" },
  { id: "script", label: "Script" }, { id: "handwriting", label: "Handwriting" }, { id: "mono", label: "Mono" },
];

export const fontCatalog: CatalogFont[] = [
  { family: "Playfair Display", category: "serif", weights: [400,500,600,700,800,900], italic: true, variable: true },
  { family: "Lora", category: "serif", weights: [400,500,600,700], italic: true, variable: true },
  { family: "Merriweather", category: "serif", weights: [300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Cormorant Garamond", category: "serif", weights: [300,400,500,600,700], italic: true, variable: true },
  { family: "EB Garamond", category: "serif", weights: [400,500,600,700,800], italic: true, variable: true },
  { family: "DM Serif Display", category: "serif", weights: [400], italic: true, variable: false },
  { family: "Libre Baskerville", category: "serif", weights: [400,700], italic: true, variable: false },
  { family: "Fraunces", category: "serif", weights: [100,200,300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Bodoni Moda", category: "serif", weights: [400,500,600,700,800,900], italic: true, variable: true },
  { family: "Cinzel", category: "serif", weights: [400,500,600,700,800,900], italic: false, variable: true },
  { family: "Spectral", category: "serif", weights: [200,300,400,500,600,700,800], italic: true, variable: true },
  { family: "Crimson Pro", category: "serif", weights: [200,300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Source Serif 4", category: "serif", weights: [200,300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Noto Serif", category: "serif", weights: [100,200,300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Old Standard TT", category: "serif", weights: [400,700], italic: true, variable: false },
  { family: "Yeseva One", category: "serif", weights: [400], italic: false, variable: false },
  { family: "Gloock", category: "serif", weights: [400], italic: false, variable: false },
  { family: "Young Serif", category: "serif", weights: [400], italic: false, variable: false },
  { family: "Instrument Serif", category: "serif", weights: [400], italic: true, variable: false },
  { family: "Italiana", category: "serif", weights: [400], italic: false, variable: false },
  { family: "Marcellus", category: "serif", weights: [400], italic: false, variable: false },
  { family: "Forum", category: "serif", weights: [400], italic: false, variable: false },
  { family: "Philosopher", category: "serif", weights: [400,700], italic: true, variable: false },
  { family: "Prata", category: "serif", weights: [400], italic: false, variable: false },
  { family: "Cormorant", category: "serif", weights: [300,400,500,600,700], italic: true, variable: true },
  { family: "Abhaya Libre", category: "serif", weights: [400,500,600,700,800], italic: false, variable: true },
  { family: "Libre Caslon Text", category: "serif", weights: [400,700], italic: true, variable: false },
  { family: "Rozha One", category: "serif", weights: [400], italic: false, variable: false },
  { family: "Playfair Display SC", category: "serif", weights: [400,700,900], italic: true, variable: false },
  { family: "Alfa Slab One", category: "serif", weights: [400], italic: false, variable: false },
  { family: "Inter", category: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Roboto", category: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Montserrat", category: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Raleway", category: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Poppins", category: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Nunito", category: "sans", weights: [200,300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Quicksand", category: "sans", weights: [300,400,500,600,700], italic: false, variable: true },
  { family: "Josefin Sans", category: "sans", weights: [100,200,300,400,500,600,700], italic: true, variable: true },
  { family: "DM Sans", category: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Outfit", category: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: false, variable: true },
  { family: "Manrope", category: "sans", weights: [200,300,400,500,600,700,800], italic: false, variable: true },
  { family: "Plus Jakarta Sans", category: "sans", weights: [200,300,400,500,600,700,800], italic: true, variable: true },
  { family: "Work Sans", category: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Karla", category: "sans", weights: [200,300,400,500,600,700,800], italic: true, variable: true },
  { family: "Rubik", category: "sans", weights: [300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Lexend", category: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: false, variable: true },
  { family: "Urbanist", category: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Figtree", category: "sans", weights: [300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Mulish", category: "sans", weights: [200,300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Cabin", category: "sans", weights: [400,500,600,700], italic: true, variable: true },
  { family: "Barlow", category: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Libre Franklin", category: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Space Grotesk", category: "sans", weights: [300,400,500,600,700], italic: false, variable: true },
  { family: "Sora", category: "sans", weights: [100,200,300,400,500,600,700,800], italic: false, variable: true },
  { family: "Syne", category: "sans", weights: [400,500,600,700,800], italic: false, variable: true },
  { family: "Unbounded", category: "sans", weights: [200,300,400,500,600,700,800,900], italic: false, variable: true },
  { family: "Fredoka", category: "sans", weights: [300,400,500,600,700], italic: false, variable: true },
  { family: "Comfortaa", category: "sans", weights: [300,400,500,600,700], italic: false, variable: true },
  { family: "Baloo 2", category: "sans", weights: [400,500,600,700,800], italic: false, variable: true },
  { family: "Varela Round", category: "sans", weights: [400], italic: false, variable: false },
  { family: "Oswald", category: "sans", weights: [200,300,400,500,600,700], italic: false, variable: true },
  { family: "Archivo", category: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Lato", category: "sans", weights: [100,300,400,700,900], italic: true, variable: false },
  { family: "Open Sans", category: "sans", weights: [300,400,500,600,700,800], italic: true, variable: true },
  { family: "Jost", category: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Abril Fatface", category: "display", weights: [400], italic: false, variable: false },
  { family: "Lobster", category: "display", weights: [400], italic: false, variable: false },
  { family: "Righteous", category: "display", weights: [400], italic: false, variable: false },
  { family: "Bebas Neue", category: "display", weights: [400], italic: false, variable: false },
  { family: "Anton", category: "display", weights: [400], italic: false, variable: false },
  { family: "Archivo Black", category: "display", weights: [400], italic: false, variable: false },
  { family: "Bungee", category: "display", weights: [400], italic: false, variable: false },
  { family: "Monoton", category: "display", weights: [400], italic: false, variable: false },
  { family: "Shrikhand", category: "display", weights: [400], italic: false, variable: false },
  { family: "Rubik Mono One", category: "display", weights: [400], italic: false, variable: false },
  { family: "Chewy", category: "display", weights: [400], italic: false, variable: false },
  { family: "Bangers", category: "display", weights: [400], italic: false, variable: false },
  { family: "Ultra", category: "display", weights: [400], italic: false, variable: false },
  { family: "Sniglet", category: "display", weights: [400,800], italic: false, variable: false },
  { family: "Grandstander", category: "display", weights: [100,200,300,400,500,600,700,800,900], italic: true, variable: true },
  { family: "Chango", category: "display", weights: [400], italic: false, variable: false },
  { family: "Titan One", category: "display", weights: [400], italic: false, variable: false },
  { family: "Luckiest Guy", category: "display", weights: [400], italic: false, variable: false },
  { family: "Fascinate", category: "display", weights: [400], italic: false, variable: false },
  { family: "Limelight", category: "display", weights: [400], italic: false, variable: false },
  { family: "Poiret One", category: "display", weights: [400], italic: false, variable: false },
  { family: "Megrim", category: "display", weights: [400], italic: false, variable: false },
  { family: "Cherry Bomb One", category: "display", weights: [400], italic: false, variable: false },
  { family: "Rampart One", category: "display", weights: [400], italic: false, variable: false },
  { family: "Gravitas One", category: "display", weights: [400], italic: false, variable: false },
  { family: "Pacifico", category: "script", weights: [400], italic: false, variable: false },
  { family: "Dancing Script", category: "script", weights: [400,500,600,700], italic: false, variable: true },
  { family: "Great Vibes", category: "script", weights: [400], italic: false, variable: false },
  { family: "Satisfy", category: "script", weights: [400], italic: false, variable: false },
  { family: "Sacramento", category: "script", weights: [400], italic: false, variable: false },
  { family: "Parisienne", category: "script", weights: [400], italic: false, variable: false },
  { family: "Allura", category: "script", weights: [400], italic: false, variable: false },
  { family: "Alex Brush", category: "script", weights: [400], italic: false, variable: false },
  { family: "Yellowtail", category: "script", weights: [400], italic: false, variable: false },
  { family: "Kaushan Script", category: "script", weights: [400], italic: false, variable: false },
  { family: "Courgette", category: "script", weights: [400], italic: false, variable: false },
  { family: "Cookie", category: "script", weights: [400], italic: false, variable: false },
  { family: "Playball", category: "script", weights: [400], italic: false, variable: false },
  { family: "Tangerine", category: "script", weights: [400,700], italic: false, variable: false },
  { family: "Pinyon Script", category: "script", weights: [400], italic: false, variable: false },
  { family: "Petit Formal Script", category: "script", weights: [400], italic: false, variable: false },
  { family: "Mrs Saint Delafield", category: "script", weights: [400], italic: false, variable: false },
  { family: "Monsieur La Doulaise", category: "script", weights: [400], italic: false, variable: false },
  { family: "Herr Von Muellerhoff", category: "script", weights: [400], italic: false, variable: false },
  { family: "Mea Culpa", category: "script", weights: [400], italic: false, variable: false },
  { family: "Corinthia", category: "script", weights: [400,700], italic: false, variable: false },
  { family: "Birthstone", category: "script", weights: [400], italic: false, variable: false },
  { family: "Beau Rivage", category: "script", weights: [400], italic: false, variable: false },
  { family: "Imperial Script", category: "script", weights: [400], italic: false, variable: false },
  { family: "Water Brush", category: "script", weights: [400], italic: false, variable: false },
  { family: "Comforter Brush", category: "script", weights: [400], italic: false, variable: false },
  { family: "Ephesis", category: "script", weights: [400], italic: false, variable: false },
  { family: "Lobster Two", category: "script", weights: [400,700], italic: true, variable: false },
  { family: "Clicker Script", category: "script", weights: [400], italic: false, variable: false },
  { family: "Italianno", category: "script", weights: [400], italic: false, variable: false },
  { family: "Caveat", category: "handwriting", weights: [400,500,600,700], italic: false, variable: true },
  { family: "Indie Flower", category: "handwriting", weights: [400], italic: false, variable: false },
  { family: "Shadows Into Light", category: "handwriting", weights: [400], italic: false, variable: false },
  { family: "Amatic SC", category: "handwriting", weights: [400,700], italic: false, variable: false },
  { family: "Kalam", category: "handwriting", weights: [300,400,700], italic: false, variable: false },
  { family: "Patrick Hand", category: "handwriting", weights: [400], italic: false, variable: false },
  { family: "Permanent Marker", category: "handwriting", weights: [400], italic: false, variable: false },
  { family: "Homemade Apple", category: "handwriting", weights: [400], italic: false, variable: false },
  { family: "Gochi Hand", category: "handwriting", weights: [400], italic: false, variable: false },
  { family: "Reenie Beanie", category: "handwriting", weights: [400], italic: false, variable: false },
  { family: "Nanum Pen Script", category: "handwriting", weights: [400], italic: false, variable: false },
  { family: "Gaegu", category: "handwriting", weights: [300,400,700], italic: false, variable: false },
  { family: "Delius", category: "handwriting", weights: [400], italic: false, variable: false },
  { family: "Short Stack", category: "handwriting", weights: [400], italic: false, variable: false },
  { family: "Pangolin", category: "handwriting", weights: [400], italic: false, variable: false },
  { family: "Mali", category: "handwriting", weights: [200,300,400,500,600,700], italic: true, variable: true },
  { family: "Itim", category: "handwriting", weights: [400], italic: false, variable: false },
  { family: "Architects Daughter", category: "handwriting", weights: [400], italic: false, variable: false },
  { family: "Coming Soon", category: "handwriting", weights: [400], italic: false, variable: false },
  { family: "Covered By Your Grace", category: "handwriting", weights: [400], italic: false, variable: false },
  { family: "Just Another Hand", category: "handwriting", weights: [400], italic: false, variable: false },
  { family: "Rock Salt", category: "handwriting", weights: [400], italic: false, variable: false },
  { family: "Schoolbell", category: "handwriting", weights: [400], italic: false, variable: false },
  { family: "Sue Ellen Francisco", category: "handwriting", weights: [400], italic: false, variable: false },
  { family: "Nothing You Could Do", category: "handwriting", weights: [400], italic: false, variable: false },
  { family: "Space Mono", category: "mono", weights: [400,700], italic: true, variable: false },
  { family: "JetBrains Mono", category: "mono", weights: [100,200,300,400,500,600,700,800], italic: true, variable: true },
  { family: "IBM Plex Mono", category: "mono", weights: [100,200,300,400,500,600,700], italic: true, variable: true },
  { family: "Courier Prime", category: "mono", weights: [400,700], italic: true, variable: false },
  { family: "DM Mono", category: "mono", weights: [300,400,500], italic: true, variable: false },
  { family: "Fira Code", category: "mono", weights: [300,400,500,600,700], italic: false, variable: true },
];
const byFamily = new Map(fontCatalog.map((f) => [f.family, f]));
export const catalogFont = (family: string | undefined) => (family ? byFamily.get(family) : undefined);
export function searchFonts(q: string, category: FontCategory | "" = "", only?: string[]): CatalogFont[] {
  const needle = q.trim().toLowerCase();
  return fontCatalog.filter((f) => (!category || f.category === category) && (!needle || f.family.toLowerCase().includes(needle)) && (!only || only.includes(f.family)));
}
/** The closest weight a family actually has (so a request never asks Google for a weight that doesn't exist). */
export function nearestWeight(f: CatalogFont | undefined, weight = 400): number {
  if (!f) return weight;
  return f.weights.reduce((best, w) => (Math.abs(w - weight) < Math.abs(best - weight) ? w : best), f.weights[0]);
}
const fallbackFor: Record<FontCategory, string> = { serif: "Georgia, serif", sans: "Helvetica, Arial, sans-serif", display: "Helvetica, Arial, sans-serif", script: "cursive", handwriting: "cursive", mono: "ui-monospace, monospace" };
/** A CSS font-family value with a sensible fallback for the family's category. */
export const familyCss = (family: string) => `"${family}", ${fallbackFor[catalogFont(family)?.category ?? "sans"]}`;

/** The Google Fonts CSS2 URL for a family: every weight it has (upright, and italic when it has italics). */
export function fontCssUrl(f: CatalogFont, text?: string): string {
  const name = f.family.replace(/ /g, "+"), ws = f.weights;
  const axes = f.italic ? `ital,wght@${[...ws.map((w) => `0,${w}`), ...ws.map((w) => `1,${w}`)].join(";")}` : ws.length > 1 || ws[0] !== 400 ? `wght@${ws.join(";")}` : "";
  return `https://fonts.googleapis.com/css2?family=${name}${axes ? `:${axes}` : ""}&display=swap${text ? `&text=${encodeURIComponent(text)}` : ""}`;
}

// ---------- Loading (browser only) ----------
const loading = new Map<string, Promise<boolean>>();
function addStylesheet(href: string): Promise<boolean> {
  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = href; link.dataset.museFont = "1";
    link.onload = () => resolve(true); link.onerror = () => { link.remove(); resolve(false); };
    document.head.appendChild(link);
  });
}
/** Loads a family's stylesheet once (falling back to its regular face if the full request fails). */
export function loadFamily(family: string): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  const f = catalogFont(family);
  if (!f) return Promise.resolve(false);
  let p = loading.get(family);
  if (!p) {
    p = addStylesheet(fontCssUrl(f)).then((ok) => ok || addStylesheet(`https://fonts.googleapis.com/css2?family=${f.family.replace(/ /g, "+")}&display=swap`));
    loading.set(family, p);
    p.then((ok) => { if (!ok) loading.delete(family); });
  }
  return p;
}
/** Resolves once the face is ready to draw (or after a timeout, so a slow network never blocks the editor). */
export async function ensureFont(family: string, weight = 400, italic = false, timeoutMs = 6000): Promise<boolean> {
  if (typeof document === "undefined" || !catalogFont(family)) return false;
  const ok = await loadFamily(family);
  if (!ok) return false;
  const spec = `${italic ? "italic " : ""}${nearestWeight(catalogFont(family), weight)} 40px "${family}"`;
  try {
    const faces = await Promise.race([document.fonts.load(spec), new Promise<FontFace[]>((r) => setTimeout(() => r([]), timeoutMs))]);
    return faces.length > 0 || document.fonts.check(spec);
  } catch { return false; }
}
/** Every family a set of elements uses, all loaded (for export and for reopening a board). */
export async function ensureBoardFonts(elements: { kind: string; family?: string; weight?: number; italic?: boolean; bold?: boolean }[]): Promise<void> {
  const wanted = new Map<string, { family: string; weight: number; italic: boolean }>();
  for (const e of elements) if (e.kind === "text" && e.family) { const weight = e.weight ?? (e.bold ? 700 : 400), italic = !!e.italic; wanted.set(`${e.family}|${weight}|${italic}`, { family: e.family, weight, italic }); }
  await Promise.all([...wanted.values()].map((w) => ensureFont(w.family, w.weight, w.italic)));
}

const previewed = new Set<string>();
export const previewFamily = (family: string) => `Muse Preview ${family}`;
/** Loads just the letters of a family's own name, under a private alias, for the picker's live preview. */
export async function loadPreview(family: string): Promise<void> {
  const f = catalogFont(family);
  if (!f || previewed.has(family) || typeof document === "undefined") return;
  previewed.add(family);
  try {
    const css = await (await fetch(fontCssUrl({ ...f, weights: [nearestWeight(f, 400)], italic: false }, f.family))).text();
    const style = document.createElement("style");
    style.textContent = css.replace(/font-family:\s*'[^']+'/g, `font-family: '${previewFamily(family)}'`);
    document.head.appendChild(style);
  } catch { previewed.delete(family); }
}

// ---------- Favorites and recents (this device) ----------
const FAV = "muse.vision.fonts.favorites", RECENT = "muse.vision.fonts.recent";
const readList = (key: string): string[] => { try { const v = JSON.parse(localStorage.getItem(key) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string" && byFamily.has(x)).slice(0, 40) : []; } catch { return []; } };
const writeList = (key: string, list: string[]) => { try { localStorage.setItem(key, JSON.stringify(list.slice(0, 40))); } catch { /* storage blocked: lists stay for this session only */ } };
export const favoriteFonts = () => readList(FAV);
export const recentFonts = () => readList(RECENT);
export function toggleFavoriteFont(family: string): string[] { const list = readList(FAV), next = list.includes(family) ? list.filter((f) => f !== family) : [family, ...list]; writeList(FAV, next); return next; }
export function noteRecentFont(family: string) { writeList(RECENT, [family, ...readList(RECENT).filter((f) => f !== family)].slice(0, 12)); }
