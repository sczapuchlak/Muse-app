"use client";
/**
 * Vision Boards 2.0 (#187): the 2D-canvas paint engine shared by the editor, previews and exports, so all three draw
 * identically. Everything here works in "local units" (the element's own w×h box) and lets the canvas transform map
 * those to pixels, so a pattern keeps its scale whatever the zoom.
 */
import type { Finish, Paint, PatternPaint } from "@/lib/vision-boards/paint";

type Ctx = CanvasRenderingContext2D;

export function gradientPoints(angle: number, w: number, h: number) {
  const a = (angle * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a), len = Math.abs(w * dx) + Math.abs(h * dy);
  return { start: { x: w / 2 - (dx * len) / 2, y: h / 2 - (dy * len) / 2 }, end: { x: w / 2 + (dx * len) / 2, y: h / 2 + (dy * len) / 2 } };
}

/**
 * A pattern as a canvas style. Tileable art repeats at its natural size × `scale` (board units), rotated and offset;
 * art that doesn't tile covers the box once (× `scale`), positioned by the offset. `tileable` comes from the library.
 */
function patternStyle(ctx: Ctx, p: PatternPaint, img: CanvasImageSource & { width: number; height: number }, w: number, h: number, tileable: boolean): CanvasPattern | null {
  const iw = (img as HTMLImageElement).naturalWidth || img.width, ih = (img as HTMLImageElement).naturalHeight || img.height;
  if (!iw || !ih) return null;
  const pat = ctx.createPattern(img, tileable ? "repeat" : "no-repeat");
  if (!pat) return null;
  let m = new DOMMatrix();
  if (tileable) {
    m = m.translate(w / 2 + p.x * iw * p.scale, h / 2 + p.y * ih * p.scale).rotate(p.rotation).scale(p.scale).translate(-iw / 2, -ih / 2);
  } else {
    const cover = Math.max(w / iw, h / ih) * p.scale, ox = (iw * cover - w) / 2, oy = (ih * cover - h) / 2;
    m = m.translate(w / 2, h / 2).rotate(p.rotation).translate(-w / 2, -h / 2).translate(-ox + p.x * Math.max(ox, w * 0.25), -oy + p.y * Math.max(oy, h * 0.25)).scale(cover);
  }
  pat.setTransform(m);
  return pat;
}
export type PatternSource = { img: HTMLImageElement | HTMLCanvasElement | null | undefined; tileable: boolean };
/** A paint as fill/stroke style for a w×h box. Returns null while a pattern image is still loading. */
export function canvasStyle(ctx: Ctx, paint: Paint, w: number, h: number, pattern?: PatternSource): string | CanvasGradient | CanvasPattern | null {
  if (paint.kind === "solid") return paint.color;
  if (paint.kind === "gradient") {
    const colors = paint.gradient.colors.filter(Boolean) as string[], pt = gradientPoints(paint.gradient.angle, w, h), g = ctx.createLinearGradient(pt.start.x, pt.start.y, pt.end.x, pt.end.y);
    colors.forEach((c, i) => g.addColorStop(colors.length === 1 ? 0 : i / (colors.length - 1), c));
    return g;
  }
  return pattern?.img ? patternStyle(ctx, paint, pattern.img as HTMLImageElement, w, h, pattern.tileable) : null;
}
/** Fills a path with a paint (a pattern's base color goes underneath, and stands in while the pattern loads). */
export function fillPath(ctx: Ctx, path: Path2D, paint: Paint, w: number, h: number, pattern?: PatternSource, rule: CanvasFillRule = "nonzero") {
  if (paint.kind === "pattern") {
    ctx.fillStyle = paint.base ?? (pattern?.img ? "transparent" : "#efe7f6");
    if (paint.base || !pattern?.img) ctx.fill(path, rule);
  }
  const style = canvasStyle(ctx, paint, w, h, pattern);
  if (!style) return;
  ctx.fillStyle = style; ctx.fill(path, rule);
}
export function strokePath(ctx: Ctx, path: Path2D, paint: Paint, width: number, w: number, h: number, pattern?: PatternSource) {
  const style = canvasStyle(ctx, paint, w, h, pattern) ?? (paint.kind === "pattern" ? paint.base ?? "#d9cfe8" : null);
  if (!style) return;
  ctx.lineWidth = width; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = style; ctx.stroke(path);
}

// ---------- Finishes ----------
let noise: HTMLCanvasElement | null = null;
/** A small cached grain tile for matte paper (deterministic, so exports match). */
function grain(): HTMLCanvasElement {
  if (noise) return noise;
  const c = document.createElement("canvas"); c.width = c.height = 96;
  const x = c.getContext("2d")!, d = x.createImageData(96, 96);
  let s = 1234567;
  for (let i = 0; i < d.data.length; i += 4) { s = (s * 16807) % 2147483647; const v = 110 + (s % 120); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0);
  return (noise = c);
}
/**
 * Paints a finish over whatever is already drawn in a w×h box, confined to `clip` (the silhouette). `phase` (0–1)
 * slides the holographic sheen; editors animate it, exports always use 0.
 */
export function drawFinish(ctx: Ctx, finish: Finish, w: number, h: number, clip: Path2D | HTMLCanvasElement, phase = 0) {
  const k = finish.intensity;
  // Work on a temp layer: the effect, cut to the silhouette, then blended onto the art.
  const scale = Math.min(1, 1600 / Math.max(w, h)), tw = Math.max(1, Math.ceil(w * scale)), th = Math.max(1, Math.ceil(h * scale));
  const t = document.createElement("canvas"); t.width = tw; t.height = th;
  const x = t.getContext("2d")!;
  x.scale(scale, scale);
  if (finish.kind === "matte") {
    const pat = x.createPattern(grain(), "repeat"); if (pat) { x.globalAlpha = 0.22 * k; x.fillStyle = pat; x.fillRect(0, 0, w, h); }
    x.globalAlpha = 0.18 * k; const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#000000"); x.fillStyle = g; x.fillRect(0, 0, w, h);
  } else if (finish.kind === "glossy") {
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, `rgba(255,255,255,${0.75 * k})`); g.addColorStop(0.32, `rgba(255,255,255,${0.12 * k})`); g.addColorStop(0.36, "rgba(255,255,255,0)"); g.addColorStop(0.62, "rgba(255,255,255,0)"); g.addColorStop(0.66, `rgba(255,255,255,${0.35 * k})`); g.addColorStop(0.7, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  } else {
    const shift = phase * w * 1.2, g = x.createLinearGradient(-w * 0.6 + shift, 0, w * 0.6 + shift, h);
    ["#ff9ad5", "#ffe58a", "#9bf6ff", "#bdb2ff", "#ff9ad5", "#caffbf", "#9bf6ff", "#ffc6ff", "#ffe58a", "#bdb2ff"].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
    x.globalAlpha = 0.55 * k; x.fillStyle = g; x.fillRect(0, 0, w, h);
    const sheen = x.createLinearGradient(0, 0, w, h); sheen.addColorStop(0.42, "rgba(255,255,255,0)"); sheen.addColorStop(0.5, `rgba(255,255,255,${0.6 * k})`); sheen.addColorStop(0.58, "rgba(255,255,255,0)");
    x.globalAlpha = 1; x.fillStyle = sheen; x.fillRect(0, 0, w, h);
  }
  x.globalAlpha = 1; x.globalCompositeOperation = "destination-in";
  if (clip instanceof HTMLCanvasElement) x.drawImage(clip, 0, 0, w, h); else { x.fillStyle = "#000"; x.fill(clip); }
  ctx.save();
  ctx.globalCompositeOperation = finish.kind === "holo" ? "overlay" : finish.kind === "matte" ? "soft-light" : "screen";
  ctx.drawImage(t, 0, 0, w, h);
  // Holo: overlay alone vanishes on pale art (white and cream stay white), so a "color" pass tints by hue while keeping
  // the art's own light and shade, and a light screen pass adds the shine.
  if (finish.kind === "holo") {
    ctx.globalCompositeOperation = "color"; ctx.globalAlpha = Math.min(1, 0.75 * k); ctx.drawImage(t, 0, 0, w, h);
    ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = 0.25 * k; ctx.drawImage(t, 0, 0, w, h);
  }
  ctx.restore();
}

// ---------- Die-cut silhouettes ----------
const silhouettes = new Map<string, HTMLCanvasElement>();
/**
 * The die-cut silhouette of a transparent image: its alpha, grown by `px` image pixels with a round brush (rings of
 * stamps sized to the radius, so thick outlines stay smooth and even without jagged corners). Cached per image+width.
 * The returned canvas is padded by `px` on every side.
 */
export function silhouette(img: HTMLImageElement | HTMLCanvasElement, key: string, px: number): HTMLCanvasElement {
  const r = Math.max(0, Math.round(px)), id = `${key}|${r}`, hit = silhouettes.get(id);
  if (hit) return hit;
  const iw = (img as HTMLImageElement).naturalWidth || img.width, ih = (img as HTMLImageElement).naturalHeight || img.height;
  const c = document.createElement("canvas"); c.width = iw + r * 2; c.height = ih + r * 2;
  const x = c.getContext("2d")!;
  if (r === 0) x.drawImage(img, 0, 0);
  else {
    // Stamps on concentric rings (outer ring dense enough that neighbours overlap by at least a pixel).
    for (let ring = r; ring > 0; ring -= Math.max(1, r / 3)) {
      const steps = Math.max(16, Math.ceil((2 * Math.PI * ring) / 1.2));
      for (let i = 0; i < steps; i++) { const a = (i / steps) * Math.PI * 2; x.drawImage(img, r + Math.cos(a) * ring, r + Math.sin(a) * ring); }
    }
    x.drawImage(img, r, r);
  }
  // Solidify: every partially covered pixel becomes the silhouette (keeps a crisp, even edge).
  x.globalCompositeOperation = "source-in"; x.fillStyle = "#000"; x.fillRect(0, 0, c.width, c.height);
  if (silhouettes.size > 48) silhouettes.delete(silhouettes.keys().next().value!);
  silhouettes.set(id, c);
  return c;
}
/**
 * A finished die-cut sticker as one bitmap: the outline (any paint) in the silhouette's shape, the art on top, then
 * the finish across both. `outlinePx` and the result are in image pixels; the caller scales it to board units.
 */
export function dieCut(img: HTMLImageElement | HTMLCanvasElement, key: string, outlinePx: number, paint: Paint | null, pattern: PatternSource | undefined, finish: Finish | undefined, phase = 0): HTMLCanvasElement {
  const r = Math.max(0, Math.round(outlinePx)), sil = silhouette(img, key, r), out = document.createElement("canvas");
  out.width = sil.width; out.height = sil.height;
  const x = out.getContext("2d")!;
  if (paint && r > 0) {
    x.drawImage(sil, 0, 0);
    x.globalCompositeOperation = "source-in";
    const style = canvasStyle(x, paint, out.width, out.height, pattern) ?? (paint.kind === "pattern" ? paint.base ?? "#ffffff" : "#ffffff");
    x.fillStyle = style; x.fillRect(0, 0, out.width, out.height);
    x.globalCompositeOperation = "source-over";
  }
  x.drawImage(img, r, r);
  if (finish) drawFinish(x, finish, out.width, out.height, r > 0 && paint ? sil : silhouette(img, key, 0), phase);
  return out;
}
