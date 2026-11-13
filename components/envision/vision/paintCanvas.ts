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
/**
 * Sticker finishes (#187), each a stack of layers confined to the silhouette (the path, or a die-cut's alpha), so
 * they follow hearts, scallops and irregular cutouts rather than the bounding box:
 *  - Matte paper: paper grain and fibres, diffuse top-left light, soft inner shading at the edges.
 *  - Glossy vinyl: a broad directional sheen, a specular hotspot, a bright rim along the lit edges, a deeper shade
 *    opposite.
 *  - Holographic foil: spectral colour (pink, lavender, cyan, mint, peach) that keeps the art's own light and shade,
 *    fine diffraction lines, a luminous moving sheen and a foil rim.
 * The expensive layers are cached per silhouette and size, so dragging and redrawing stay cheap on phones; only the
 * holographic sheen depends on `phase` (editors animate it when asked, exports always use 0).
 */
type Layer = { c: HTMLCanvasElement; op: GlobalCompositeOperation; alpha: number };
const mk = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
let grainTile: HTMLCanvasElement | null = null;
/** Deterministic paper grain with a few fibres (so exports match the editor). */
function grain(): HTMLCanvasElement {
  if (grainTile) return grainTile;
  const c = mk(128, 128), x = c.getContext("2d")!, d = x.createImageData(128, 128);
  let s = 1234567;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < d.data.length; i += 4) { const v = 196 + Math.round(rnd() * 59); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0);
  x.lineCap = "round";
  for (let i = 0; i < 26; i++) {
    const px = rnd() * 128, py = rnd() * 128, a = rnd() * Math.PI, len = 4 + rnd() * 10;
    x.strokeStyle = rnd() > 0.5 ? "rgba(255,255,255,.55)" : "rgba(150,140,130,.35)"; x.lineWidth = 0.6 + rnd() * 0.6;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * len * 0.5 + rnd() * 2, py + Math.sin(a) * len * 0.5 + rnd() * 2, px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke();
  }
  return (grainTile = c);
}
let foilTile: HTMLCanvasElement | null = null;
/** Fine diagonal diffraction lines for foil. */
function foilLines(): HTMLCanvasElement {
  if (foilTile) return foilTile;
  const c = mk(24, 24), x = c.getContext("2d")!;
  x.strokeStyle = "rgba(255,255,255,.9)"; x.lineWidth = 1;
  for (let i = -24; i <= 48; i += 4) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i - 24, 24); x.stroke(); }
  return (foilTile = c);
}
/** The silhouette as a white mask at the working size. */
function maskOf(clip: Path2D | HTMLCanvasElement, w: number, h: number, k: number, tw: number, th: number): HTMLCanvasElement {
  const m = mk(tw, th), x = m.getContext("2d")!;
  if (clip instanceof HTMLCanvasElement) x.drawImage(clip, 0, 0, tw, th);
  else { x.scale(k, k); x.fillStyle = "#fff"; x.fill(clip); }
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#fff"; x.fillRect(0, 0, tw, th);
  return m;
}
/** Light or shade along the inside of the silhouette's edges, falling from the direction (dx, dy). */
function edgeGlow(mask: HTMLCanvasElement, color: string, blur: number, dx: number, dy: number): HTMLCanvasElement {
  const tw = mask.width, th = mask.height, pad = Math.ceil(blur * 2 + Math.abs(dx) + Math.abs(dy) + 2);
  const inv = mk(tw + pad * 2, th + pad * 2), ix = inv.getContext("2d")!;
  ix.fillStyle = "#000"; ix.fillRect(0, 0, inv.width, inv.height); ix.globalCompositeOperation = "destination-out"; ix.drawImage(mask, pad, pad);
  const out = mk(tw, th), x = out.getContext("2d")!;
  x.shadowColor = color; x.shadowBlur = blur; x.shadowOffsetX = dx + inv.width * 4; x.shadowOffsetY = dy;
  // Draw the inverse far off-canvas so only its shadow lands here.
  x.drawImage(inv, -pad - inv.width * 4, -pad);
  x.shadowColor = "transparent"; x.globalCompositeOperation = "destination-in"; x.drawImage(mask, 0, 0);
  return out;
}
function within(mask: HTMLCanvasElement, paint: (x: CanvasRenderingContext2D, tw: number, th: number) => void): HTMLCanvasElement {
  const c = mk(mask.width, mask.height), x = c.getContext("2d")!;
  paint(x, c.width, c.height);
  x.globalAlpha = 1; x.globalCompositeOperation = "destination-in"; x.drawImage(mask, 0, 0);
  return c;
}
/** Pink, lavender, cyan, mint, peach, repeated so several bands cross even a small sticker. */
const spectrum = ["#ff4fb8", "#a970ff", "#33d6ff", "#3dffb0", "#ffc25c", "#ff4fb8", "#8f7bff", "#2fe3ff", "#7dff8a", "#ff6fd0", "#b07cff", "#40d9ff", "#ff4fb8"];
function holoBand(mask: HTMLCanvasElement, phase: number): HTMLCanvasElement {
  return within(mask, (x, tw, th) => {
    const shift = phase * (tw + th), g = x.createLinearGradient(-tw * 0.5 + shift, -th * 0.2, tw * 1.1 + shift, th * 1.2);
    spectrum.forEach((c, i) => g.addColorStop(i / (spectrum.length - 1), c));
    x.fillStyle = g; x.fillRect(0, 0, tw, th);
  });
}
function holoSheen(mask: HTMLCanvasElement, phase: number): HTMLCanvasElement {
  return within(mask, (x, tw, th) => {
    const p = ((phase % 1) + 1) % 1, cx = -0.3 + p * 1.6, g = x.createLinearGradient(0, 0, tw, th);
    const at = (v: number) => Math.min(1, Math.max(0, v));
    g.addColorStop(at(cx - 0.12), "rgba(255,255,255,0)"); g.addColorStop(at(cx), "rgba(255,255,255,.95)"); g.addColorStop(at(cx + 0.12), "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, tw, th);
  });
}
type Built = { mask: HTMLCanvasElement; layers: Layer[] };
const finishCache = new WeakMap<object, Map<string, Built>>();
function buildFinish(finish: Finish, clip: Path2D | HTMLCanvasElement, w: number, h: number): Built {
  const k = Math.min(1, 1200 / Math.max(w, h)), tw = Math.max(1, Math.ceil(w * k)), th = Math.max(1, Math.ceil(h * k));
  const mask = maskOf(clip, w, h, k, tw, th), i = finish.intensity, unit = Math.max(2, Math.min(tw, th) * 0.035), layers: Layer[] = [];
  if (finish.kind === "matte") {
    layers.push({ c: within(mask, (x, a, b) => { const p = x.createPattern(grain(), "repeat")!; p.setTransform(new DOMMatrix().scale(Math.max(0.6, Math.min(a, b) / 420))); x.fillStyle = p; x.fillRect(0, 0, a, b); }), op: "multiply", alpha: 0.55 * i });
    layers.push({ c: within(mask, (x, a, b) => { const g = x.createLinearGradient(0, 0, a, b); g.addColorStop(0, "rgba(255,250,240,.9)"); g.addColorStop(0.55, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(60,40,70,.7)"); x.fillStyle = g; x.fillRect(0, 0, a, b); }), op: "soft-light", alpha: 0.8 * i });
    layers.push({ c: edgeGlow(mask, "rgba(40,25,50,.85)", unit * 1.6, -unit * 0.5, -unit * 0.5), op: "multiply", alpha: 0.5 * i });
    layers.push({ c: edgeGlow(mask, "rgba(255,255,255,.9)", unit, unit * 0.35, unit * 0.35), op: "screen", alpha: 0.3 * i });
  } else if (finish.kind === "glossy") {
    // Depth first (lit top, deeper bottom), then a crisp diagonal sheen, a specular hotspot and a bright rim.
    layers.push({ c: within(mask, (x, a, b) => { const g = x.createLinearGradient(0, 0, 0, b); g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(0.5, "rgba(128,128,128,.0)"); g.addColorStop(1, "rgba(0,0,0,.85)"); x.fillStyle = g; x.fillRect(0, 0, a, b); }), op: "soft-light", alpha: 0.8 * i });
    layers.push({ c: within(mask, (x, a, b) => { const g = x.createLinearGradient(0, 0, a, b); g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(0.26, "rgba(255,255,255,.55)"); g.addColorStop(0.3, "rgba(255,255,255,0)"); g.addColorStop(0.58, "rgba(255,255,255,0)"); g.addColorStop(0.61, "rgba(255,255,255,.6)"); g.addColorStop(0.66, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, a, b); }), op: "screen", alpha: 0.85 * i });
    layers.push({ c: within(mask, (x, a, b) => { const r = Math.max(a, b) * 0.22, g = x.createRadialGradient(a * 0.3, b * 0.22, 0, a * 0.3, b * 0.22, r); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,255,255,.6)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, a, b); }), op: "screen", alpha: 0.9 * i });
    layers.push({ c: edgeGlow(mask, "rgba(255,255,255,1)", unit * 0.5, unit * 0.35, unit * 0.35), op: "screen", alpha: 1 * i });
    layers.push({ c: edgeGlow(mask, "rgba(20,10,40,1)", unit * 1.2, -unit * 0.55, -unit * 0.55), op: "multiply", alpha: 0.5 * i });
  } else {
    layers.push({ c: within(mask, (x, a, b) => { const p = x.createPattern(foilLines(), "repeat")!; p.setTransform(new DOMMatrix().scale(Math.max(0.5, Math.min(a, b) / 360))); x.fillStyle = p; x.fillRect(0, 0, a, b); }), op: "overlay", alpha: 0.35 * i });
    layers.push({ c: edgeGlow(mask, "rgba(255,255,255,1)", unit * 0.8, unit * 0.4, unit * 0.4), op: "screen", alpha: 0.8 * i });
    layers.push({ c: edgeGlow(mask, "rgba(120,80,200,.9)", unit * 1.2, -unit * 0.5, -unit * 0.5), op: "multiply", alpha: 0.3 * i });
  }
  return { mask, layers };
}
const draw = (ctx: Ctx, l: Layer, w: number, h: number) => { if (l.alpha <= 0) return; ctx.globalCompositeOperation = l.op; ctx.globalAlpha = Math.min(1, l.alpha); ctx.drawImage(l.c, 0, 0, w, h); };
/**
 * Paints a finish over whatever is already drawn in a w×h box, confined to `clip` (the silhouette). `phase` (0–1)
 * slides the holographic colour and sheen.
 */
export function drawFinish(ctx: Ctx, finish: Finish, w: number, h: number, clip: Path2D | HTMLCanvasElement, phase = 0) {
  const key = `${finish.kind}|${finish.intensity.toFixed(2)}|${Math.round(w)}|${Math.round(h)}`;
  let byClip = finishCache.get(clip);
  if (!byClip) { byClip = new Map(); finishCache.set(clip, byClip); }
  let built = byClip.get(key);
  if (!built) { built = buildFinish(finish, clip, w, h); if (byClip.size > 6) byClip.delete(byClip.keys().next().value!); byClip.set(key, built); }
  ctx.save();
  if (finish.kind === "holo") {
    const band = holoBand(built.mask, phase), i = finish.intensity;
    // Hue from the spectrum with the art's own light and shade (so it stays readable), then overlay for foil depth.
    draw(ctx, { c: band, op: "color", alpha: 0.55 * i }, w, h);
    draw(ctx, { c: band, op: "overlay", alpha: 0.55 * i }, w, h);
    // White edges and pale art can't take a hue on their own: a light multiply tints them like real foil.
    draw(ctx, { c: band, op: "multiply", alpha: 0.35 * i }, w, h);
  }
  for (const l of built.layers) draw(ctx, l, w, h);
  if (finish.kind === "holo") draw(ctx, { c: holoSheen(built.mask, phase + 0.15), op: "screen", alpha: 0.5 * finish.intensity }, w, h);
  ctx.restore();
}
/** The soft lift a finished sticker casts when it has no shadow of its own (part of the finish; `lift: false` turns it off). */
export function liftOf(finish: Finish | undefined, w: number, h: number) {
  if (!finish || finish.lift === false) return undefined;
  const s = Math.min(w, h);
  return finish.kind === "matte" ? { color: "#2a1d33" as const, blur: Math.max(6, s * 0.05), x: 0, y: Math.max(2, s * 0.018), opacity: 0.24 }
    : finish.kind === "glossy" ? { color: "#1b1027" as const, blur: Math.max(4, s * 0.03), x: 0, y: Math.max(2, s * 0.022), opacity: 0.32 }
    : { color: "#4b2f7a" as const, blur: Math.max(6, s * 0.045), x: 0, y: Math.max(2, s * 0.02), opacity: 0.3 };
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
