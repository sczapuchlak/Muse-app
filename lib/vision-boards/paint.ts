/**
 * Vision Boards 2.0 (#187): paint for every creative object. One `Paint` fills shapes, backings, sticker outlines,
 * borders, text and backgrounds, so a pattern chosen once works everywhere without per-shape assets.
 *
 * Colors are always pinned hex (never theme tokens), so a board looks the same in every Muse theme. Pattern fills keep
 * their own scale, rotation and offset, independent of canvas zoom and of the object's own size and rotation.
 */
import { isHexColor, type CustomGradient } from "../appearance-values";

export type Hex = `#${string}`;
/** A private image in storage. `alpha` marks images with transparency (cutouts, stickers, PNG art). */
export type Asset = { path: string; thumbnailPath: string; width: number; height: number; mime: string; alpha?: boolean; name?: string };

/** Where a pattern comes from: Muse's built-in library (by stable id) or an image the person uploaded to this board. */
/** `tile` (uploads only): repeat the image (default) or cover the shape once. */
export type PatternRef = { source: "builtin"; id: string } | { source: "asset"; asset: Asset; tile?: boolean };
export type PatternPaint = { kind: "pattern"; pattern: PatternRef; scale: number; rotation: number; x: number; y: number; base?: Hex };
export type Paint = { kind: "solid"; color: Hex } | { kind: "gradient"; gradient: CustomGradient } | PatternPaint;
export type Stroke = { paint: Paint; width: number };
export type Shadow = { color: Hex; blur: number; x: number; y: number; opacity: number };
/** Sticker finishes. `shimmer` animates the holographic sheen in the editor only (never in exports; off with reduced motion). */
export type Finish = { kind: "matte" | "glossy" | "holo"; intensity: number; shimmer?: boolean };

// ---------- Validators shared by the model ----------
export const num = (v: unknown, min: number, max: number, fallback: number) => typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
export const str = (v: unknown, max: number) => typeof v === "string" ? v.slice(0, max) : "";
export const hex = (v: unknown, fallback: Hex): Hex => typeof v === "string" && isHexColor(v) ? v.toLowerCase() as Hex : fallback;
export const optHex = (v: unknown): Hex | undefined => typeof v === "string" && isHexColor(v) ? v.toLowerCase() as Hex : undefined;
export const pathOk = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}(\.thumb)?\.(webp|jpg|png)$/.test(v);
/** Built-in library ids: `kind/category/name`, lowercase. */
export const builtinIdOk = (v: unknown): v is string => typeof v === "string" && /^[a-z]+\/[a-z0-9-]{1,40}\/[a-z0-9-]{1,60}$/.test(v);

export function parseAsset(v: unknown): Asset | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  if (!pathOk(o.path) || !pathOk(o.thumbnailPath)) return undefined;
  const mime = ["image/webp", "image/jpeg", "image/png"].find((m) => m === o.mime) ?? "image/webp";
  return { path: o.path, thumbnailPath: o.thumbnailPath, width: num(o.width, 1, 10000, 1), height: num(o.height, 1, 10000, 1), mime, ...(o.alpha === true ? { alpha: true } : {}), ...(str(o.name, 200) ? { name: str(o.name, 200) } : {}) };
}
/**
 * A board gradient: 2–3 hex stops at any whole-degree direction (0–359). Boards allow every angle, unlike app chrome
 * gradients (which keep to four), because direction is a creative control here (#187).
 */
export function parseGradient(v: unknown): CustomGradient | undefined {
  if (!v || typeof v !== "object") return undefined;
  const g = v as Record<string, unknown>, colors = (Array.isArray(g.colors) ? g.colors : []).filter((c): c is Hex => typeof c === "string" && isHexColor(c)).map((c) => c.toLowerCase() as Hex).slice(0, 3);
  const gradient = { colors: colors as CustomGradient["colors"], angle: typeof g.angle === "number" && Number.isFinite(g.angle) ? Math.round(((g.angle % 360) + 360) % 360) : 135 };
  return colors.length >= 2 ? gradient : undefined;
}
function parsePatternRef(v: unknown): PatternRef | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  if (o.source === "builtin" && builtinIdOk(o.id)) return { source: "builtin", id: o.id };
  if (o.source === "asset") { const asset = parseAsset(o.asset); if (asset) return { source: "asset", asset, ...(o.tile === false ? { tile: false } : {}) }; }
  return undefined;
}
/** Any paint, or `undefined` when it can't be understood (callers choose their own fallback). */
export function parsePaint(v: unknown, allowPattern = true): Paint | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  if (o.kind === "solid") { const color = optHex(o.color); return color ? { kind: "solid", color } : undefined; }
  if (o.kind === "gradient") { const gradient = parseGradient(o.gradient); return gradient ? { kind: "gradient", gradient } : undefined; }
  if (o.kind === "pattern" && allowPattern) {
    const pattern = parsePatternRef(o.pattern);
    if (!pattern) return undefined;
    const base = optHex(o.base);
    return { kind: "pattern", pattern, scale: num(o.scale, 0.05, 8, 1), rotation: num(o.rotation, -360, 360, 0), x: num(o.x, -1, 1, 0), y: num(o.y, -1, 1, 0), ...(base ? { base } : {}) };
  }
  return undefined;
}
export function parseStroke(v: unknown, maxWidth = 120): Stroke | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>, paint = parsePaint(o.paint);
  return paint ? { paint, width: num(o.width, 0.5, maxWidth, 8) } : undefined;
}
export function parseShadow(v: unknown): Shadow | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  return { color: hex(o.color, "#1b1027"), blur: num(o.blur, 0, 200, 24), x: num(o.x, -200, 200, 0), y: num(o.y, -200, 200, 10), opacity: num(o.opacity, 0, 1, 0.35) };
}
export function parseFinish(v: unknown): Finish | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>, kind = (["matte", "glossy", "holo"] as const).find((k) => k === o.kind);
  return kind ? { kind, intensity: num(o.intensity, 0, 1, 0.6), ...(o.shimmer === true ? { shimmer: true } : {}) } : undefined;
}

// ---------- Helpers ----------
export const solid = (color: Hex): Paint => ({ kind: "solid", color });
export const defaultShadow: Shadow = { color: "#1b1027", blur: 24, x: 0, y: 10, opacity: 0.35 };
/** A paint's single "main" color, for places that need one (accessibility labels, legacy fields, swatches). */
export function paintColor(p: Paint | undefined, fallback: Hex = "#ffffff"): Hex {
  if (!p) return fallback;
  if (p.kind === "solid") return p.color;
  if (p.kind === "gradient") return (p.gradient.colors[0] ?? fallback) as Hex;
  return p.base ?? fallback;
}
/** Every storage path a value references, found anywhere inside it (patterns, cutouts, stickers, backgrounds). */
export function collectPaths(v: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(v)) { for (const x of v) collectPaths(x, out); return out; }
  if (!v || typeof v !== "object") return out;
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    if ((k === "path" || k === "thumbnailPath") && pathOk(x)) out.add(x);
    else if (x && typeof x === "object") collectPaths(x, out);
  }
  return out;
}
