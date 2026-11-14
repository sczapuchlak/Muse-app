/**
 * Visions: the five Book covers. A cover is a preset plus a few choices (title, subtitle, caption, palette, title
 * font, an optional image and pattern); its artwork is generated here as ordinary board elements, so the same
 * renderer draws it in the library, the editor, the reader and the PDF. Each preset has its own composition,
 * typographic hierarchy and decorative language (not one layout recoloured).
 */
import { canvasOf, type Background, type BoardElement, type BookCover, type Canvas, type CoverPreset, type ImageElement, type ShapeElement, type TextElement, type VisionBoard } from "./model";
import type { Hex, Paint, PatternPaint } from "./paint";
import type { DecorShape } from "./decor";

type Pal = Record<string, string>;
export const coverPalettes: Record<CoverPreset, { name: string; pal: Pal }[]> = {
  classic: [
    { name: "Forest", pal: { base: "#2f4a3a", accent: "#cfae6e", plate: "#f4ecd8", ink: "#2f4a3a" } },
    { name: "Oxblood", pal: { base: "#5c1f2e", accent: "#d4b47a", plate: "#f6eddc", ink: "#5c1f2e" } },
    { name: "Midnight", pal: { base: "#1f2a44", accent: "#c9a96e", plate: "#f2ecdf", ink: "#1f2a44" } },
    { name: "Linen", pal: { base: "#e4d9c6", accent: "#8a6a3f", plate: "#fbf7ef", ink: "#3b3a36" } },
  ],
  celestial: [
    { name: "Midnight", pal: { top: "#0b0e2e", bottom: "#2a1650", accent: "#e9c46a", soft: "#cbbcff" } },
    { name: "Plum", pal: { top: "#1c0a26", bottom: "#4d1c4f", accent: "#f0c987", soft: "#f3b6d8" } },
    { name: "Deep sea", pal: { top: "#061a24", bottom: "#123f4c", accent: "#e8d39a", soft: "#a8eadf" } },
  ],
  romantic: [
    { name: "Blush", pal: { base: "#f5dde0", panel: "#fffaf4", accent: "#b5677d", ink: "#7a3e52" } },
    { name: "Mauve", pal: { base: "#e4d1de", panel: "#fcf7f9", accent: "#8d5c7b", ink: "#5e3550" } },
    { name: "Sage & cream", pal: { base: "#e3e8d6", panel: "#fffdf6", accent: "#7f8f6a", ink: "#4b5940" } },
  ],
  editorial: [
    { name: "Ink", pal: { base: "#f3efe8", block: "#1d1d1f", ink: "#1d1d1f", accent: "#c8553d", onBlock: "#f3efe8" } },
    { name: "Terracotta", pal: { base: "#f4ece2", block: "#c8553d", ink: "#2a1a14", accent: "#2a1a14", onBlock: "#fbf4ea" } },
    { name: "Cobalt", pal: { base: "#eef0f6", block: "#2747a8", ink: "#0f1a3d", accent: "#2747a8", onBlock: "#f5f7ff" } },
  ],
  whimsical: [
    { name: "Candy", pal: { a: "#ffb3d1", b: "#c9b6ff", c: "#ffd6a5", ink: "#5a2a6b", accent: "#ffcf3f", blob: "#fff8fb" } },
    { name: "Sorbet", pal: { a: "#ffd1a8", b: "#ff9ec4", c: "#fff0a8", ink: "#6b2a3e", accent: "#8f7bff", blob: "#fffaf3" } },
    { name: "Lagoon", pal: { a: "#a8f0e6", b: "#b8c8ff", c: "#f7c6ff", ink: "#24406b", accent: "#ff8fb1", blob: "#f8fdff" } },
  ],
};
export const coverPresetInfo: Record<CoverPreset, { label: string; blurb: string; family: string }> = {
  classic: { label: "The Classic", blurb: "Clothbound, gold-tooled, quietly literary", family: "Cormorant Garamond" },
  celestial: { label: "Celestial", blurb: "Midnight skies, gold orbits, a quiet moon", family: "Cinzel" },
  romantic: { label: "The Romantic", blurb: "Blush keepsake with a satin bow", family: "Pinyon Script" },
  editorial: { label: "The Editorial", blurb: "Art-book type, bold and modern", family: "DM Serif Display" },
  whimsical: { label: "The Whimsical", blurb: "Gradients, stars and a little magic", family: "Fraunces" },
};
export const paletteOf = (c: Pick<BookCover, "preset" | "palette">) => { const list = coverPalettes[c.preset]; return list[Math.min(list.length - 1, Math.max(0, c.palette))]; };

// ---------- Element builders ----------
const hex = (c: string) => c as Hex;
const solid = (c: string): Paint => ({ kind: "solid", color: hex(c) });
const grad = (colors: string[], angle: number): Paint => ({ kind: "gradient", gradient: { colors: colors as never, angle } });
const pattern = (id: string, scale = 1, base?: string): PatternPaint => ({ kind: "pattern", pattern: { source: "builtin", id }, scale, rotation: 0, x: 0, y: 0, ...(base ? { base: hex(base) } : {}) });
let n = 0;
const sid = (k: string) => `cover-${k}-${n++}`;
function shape(shape: DecorShape, x: number, y: number, w: number, h: number, more: Partial<ShapeElement> = {}): ShapeElement {
  return { id: sid(shape), kind: "shape", shape, x, y, w, h, rotation: 0, locked: true, ...more };
}
/** Text, sized for its words (an estimate: covers are laid out before any canvas exists; the box centres its lines). */
function text(t: string, x: number, y: number, w: number, size: number, family: string, more: Partial<TextElement> = {}): TextElement {
  // Generous on purpose (capitals, display and script faces run wide): spare height is invisible, since lines centre.
  const lineH = more.lineHeight ?? 1.15, lines = t.split("\n").reduce((nl, line) => { const caps = !/[a-z]/.test(line), em = (caps ? 0.78 : 0.6) + (more.letterSpacing ?? 0); return nl + Math.max(1, Math.ceil((line.length * size * em) / w)); }, 0);
  return { id: sid("text"), kind: "text", text: t, font: "editorial", family, size, color: hex("#ffffff"), align: "center", x, y, w, h: Math.round(lines * size * lineH + size * 0.2), rotation: 0, locked: true, ...more };
}
function photo(c: BookCover, x: number, y: number, w: number, h: number, shape: ImageElement["crop"]["shape"], border?: string): ImageElement | null {
  if (!c.image) return null;
  return { id: sid("image"), kind: "image", image: c.image, crop: { shape, zoom: 1, x: 0, y: 0 }, x, y, w, h, rotation: 0, locked: true, ...(border ? { border: { color: hex(border), width: Math.max(4, w * 0.02) } } : {}), shadowStyle: { color: hex("#1b1027"), blur: w * 0.06, x: 0, y: w * 0.02, opacity: 0.28 } };
}
const mix = (a: string, b: string, t: number) => { const p = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16); return `#${[0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16).padStart(2, "0")).join("")}`; };

/** The cover's artwork as a drawable board (background + locked elements) at the book's page size. */
export function coverBoard(c: BookCover, page: Canvas): { background: Background; elements: BoardElement[] } {
  n = 0;
  const { w, h } = page, { pal } = paletteOf(c), info = coverPresetInfo[c.preset], titleFamily = c.family ?? info.family, u = Math.min(w, h * 0.75);
  const els: (BoardElement | null)[] = [];
  const title = c.title || "Untitled";
  if (c.preset === "classic") {
    els.push(shape("rect", w / 2, h / 2, w, h, { fill: c.pattern ?? pattern("texture/paper/linen", 1.6), opacity: c.pattern ? 0.6 : 0.32 }));
    const m = u * 0.06, m2 = u * 0.085;
    els.push(shape("rect", w / 2, h / 2, w - m * 2, h - m * 2, { stroke: { paint: solid(pal.accent), width: u * 0.006 } }));
    els.push(shape("rect", w / 2, h / 2, w - m2 * 2, h - m2 * 2, { stroke: { paint: solid(pal.accent), width: u * 0.0022 } }));
    for (const [x, y] of [[m2, m2], [w - m2, m2], [m2, h - m2], [w - m2, h - m2]]) els.push(shape("star", x, y, u * 0.04, u * 0.04, { fill: solid(pal.accent) }));
    const img = photo(c, w / 2, h * 0.68, u * 0.34, u * 0.34, "oval", pal.plate);
    const plateY = img ? h * 0.36 : h * 0.42;
    els.push(shape("label", w / 2, plateY, u * 0.68, u * 0.24, { fill: solid(pal.plate), stroke: { paint: solid(pal.accent), width: u * 0.005 }, radius: u * 0.02, shadowStyle: { color: hex("#000000"), blur: u * 0.02, x: 0, y: u * 0.006, opacity: 0.25 } }));
    els.push(text(title, w / 2, plateY - u * 0.005, u * 0.58, u * 0.072, titleFamily, { color: hex(pal.ink), weight: 600, lineHeight: 1.05 }));
    if (c.subtitle) els.push(text(c.subtitle.toUpperCase(), w / 2, plateY + u * 0.17, u * 0.7, u * 0.026, "Cinzel", { color: hex(pal.accent), letterSpacing: 0.22, weight: 500 }));
    els.push(shape("rect", w / 2, plateY + (c.subtitle ? u * 0.22 : u * 0.17), u * 0.14, Math.max(2, u * 0.003), { fill: solid(pal.accent) }));
    els.push(img);
    if (c.caption) els.push(text(c.caption.toUpperCase(), w / 2, h - m2 - u * 0.07, u * 0.6, u * 0.02, "Cinzel", { color: hex(pal.accent), letterSpacing: 0.35 }));
    return { background: { kind: "solid", color: hex(pal.base) }, elements: els.filter(Boolean) as BoardElement[] };
  }
  if (c.preset === "celestial") {
    els.push(shape("rect", w / 2, h / 2, w, h, { fill: c.pattern ?? pattern("pattern/celestial-cosmic/constellations", 2.2), opacity: c.pattern ? 0.55 : 0.42 }));
    const cy = h * 0.4, R = u * 0.36;
    els.push(shape("circle", w / 2, cy, R * 2, R * 2, { stroke: { paint: solid(pal.accent), width: u * 0.004 } }));
    els.push(shape("circle", w / 2, cy, R * 1.62, R * 1.62, { stroke: { paint: solid(pal.soft), width: u * 0.0016 }, opacity: 0.6 }));
    const img = photo(c, w / 2, cy, R * 1.4, R * 1.4, "circle", pal.accent);
    if (img) els.push(img);
    else {
      const moon = R * 0.62, sky = mix(pal.top, pal.bottom, 0.4);
      els.push(shape("circle", w / 2, cy, moon, moon, { fill: grad(["#fff7dc", pal.accent], 135), finish: { kind: "glossy", intensity: 0.35, lift: false }, shadowStyle: { color: hex(pal.accent), blur: u * 0.06, x: 0, y: 0, opacity: 0.55 } }));
      els.push(shape("circle", w / 2 + moon * 0.26, cy - moon * 0.12, moon * 0.86, moon * 0.86, { fill: solid(sky) }));
    }
    for (const [a, s] of [[-140, 0.035], [-25, 0.05], [60, 0.03], [150, 0.042], [205, 0.026]]) { const t = (a * Math.PI) / 180; els.push(shape("star", w / 2 + Math.cos(t) * R, cy + Math.sin(t) * R, u * s, u * s, { fill: solid(pal.accent), rotation: a, finish: { kind: "glossy", intensity: 0.5, lift: false } })); }
    els.push(text(title.toUpperCase(), w / 2, h * 0.72, u * 0.86, u * 0.07, titleFamily, { paint: grad(["#fff4cf", pal.accent], 90), color: hex(pal.accent), letterSpacing: 0.14, weight: 500, lineHeight: 1.1, glow: { color: hex(pal.accent), blur: u * 0.02 } }));
    if (c.subtitle) els.push(text(c.subtitle, w / 2, h * 0.8, u * 0.8, u * 0.036, "Cormorant Garamond", { color: hex(pal.soft), italic: true }));
    if (c.caption) els.push(text(c.caption.toUpperCase(), w / 2, h * 0.93, u * 0.7, u * 0.018, "Cinzel", { color: hex(pal.accent), letterSpacing: 0.45 }));
    return { background: { kind: "gradient", gradient: { colors: [hex(pal.top), hex(pal.bottom)] as never, angle: 180 } }, elements: els.filter(Boolean) as BoardElement[] };
  }
  if (c.preset === "romantic") {
    els.push(shape("rect", w / 2, h / 2, w, h, { fill: c.pattern ?? pattern("pattern/girly-romantic/rosebuds", 1.4), opacity: c.pattern ? 0.55 : 0.4 }));
    const aw = u * 0.74, ah = h * 0.72, ay = h * 0.54;
    els.push(shape("arch", w / 2, ay, aw, ah, { fill: solid(pal.panel), stroke: { paint: solid(pal.accent), width: u * 0.005 }, shadowStyle: { color: hex(pal.ink), blur: u * 0.04, x: 0, y: u * 0.012, opacity: 0.18 } }));
    els.push(shape("arch", w / 2, ay + u * 0.004, aw - u * 0.05, ah - u * 0.05, { stroke: { paint: solid(pal.accent), width: u * 0.0016 } }));
    els.push({ id: sid("bow"), kind: "piece", piece: "ribbon/bow/satin-bow", x: w / 2, y: ay - ah / 2 + u * 0.01, w: u * 0.2, h: u * 0.14, rotation: 0, locked: true, shadowStyle: { color: hex(pal.ink), blur: u * 0.015, x: 0, y: u * 0.006, opacity: 0.25 } });
    const img = photo(c, w / 2, ay - ah * 0.18, aw * 0.56, ah * 0.36, "arch", pal.panel);
    if (img) els.push(img);
    const ty = img ? ay + ah * 0.12 : ay - ah * 0.06;
    els.push(text(title, w / 2, ty, aw * 0.86, u * (img ? 0.085 : 0.11), titleFamily, { color: hex(pal.ink), lineHeight: 1.05 }));
    els.push(shape("heart", w / 2, ty + u * (img ? 0.09 : 0.12), u * 0.035, u * 0.03, { fill: solid(pal.accent) }));
    if (c.subtitle) els.push(text(c.subtitle, w / 2, ty + u * (img ? 0.15 : 0.19), aw * 0.8, u * 0.036, "Cormorant Garamond", { color: hex(pal.accent), italic: true }));
    if (c.caption) els.push(text(c.caption.toUpperCase(), w / 2, ay + ah / 2 - u * 0.07, aw * 0.7, u * 0.019, "Cormorant Garamond", { color: hex(pal.accent), letterSpacing: 0.4, weight: 600 }));
    return { background: { kind: "solid", color: hex(pal.base) }, elements: els.filter(Boolean) as BoardElement[] };
  }
  if (c.preset === "editorial") {
    const img = photo(c, w / 2, h / 2, w, h, "rect");
    if (img) { img.shadowStyle = undefined; els.push(img); els.push(shape("rect", w / 2, h * 0.2, w, h * 0.4, { fill: grad(["#0b0b10", "#3a3a44"], 180), opacity: 0.3 })); }
    else els.push(shape("rect", w / 2, h * 0.79, w, h * 0.42, { fill: c.pattern ?? solid(pal.block) }));
    const onImg = !!img, ink = onImg ? "#ffffff" : pal.ink, m = u * 0.08;
    els.push(text((c.caption || "Vol. 01").toUpperCase(), w - m - u * 0.15, h * 0.055, u * 0.3, u * 0.02, "Montserrat", { color: hex(onImg ? "#ffffff" : pal.accent), align: "right", weight: 600, letterSpacing: 0.25 }));
    const tw = w - m * 2, tsize = Math.min(u * 0.17, (tw / Math.max(4, Math.min(title.length, 12))) * 1.7);
    const t = text(title, w / 2, 0, tw, tsize, titleFamily, { color: hex(ink), align: "left", lineHeight: 0.95, ...(onImg ? { shadowStyle: { color: hex("#000000"), blur: u * 0.03, x: 0, y: u * 0.006, opacity: 0.4 } } : {}) });
    t.y = h * 0.1 + t.h / 2;
    els.push(t);
    els.push(shape("rect", w / 2, t.y + t.h / 2 + u * 0.03, tw, Math.max(2, u * 0.004), { fill: solid(ink) }));
    if (c.subtitle) els.push(text(c.subtitle.toUpperCase(), w / 2, t.y + t.h / 2 + u * 0.08, tw, u * 0.024, "Montserrat", { color: hex(ink), align: "left", weight: 500, letterSpacing: 0.22 }));
    if (!onImg) els.push(text("A VISION", w / 2, h * 0.93, tw, u * 0.02, "Montserrat", { color: hex(pal.onBlock), align: "left", weight: 600, letterSpacing: 0.4 }));
    return { background: { kind: "solid", color: hex(pal.base) }, elements: els.filter(Boolean) as BoardElement[] };
  }
  // whimsical
  els.push(shape("rect", w / 2, h / 2, w, h, { fill: c.pattern ?? pattern("pattern/playful-whimsical/confetti-sprinkles", 2), opacity: c.pattern ? 0.5 : 0.3 }));
  const by = h * 0.47;
  els.push(shape("blob", w / 2, by, u * 0.82, h * 0.5, { fill: solid(pal.blob), finish: { kind: "holo", intensity: 0.35, lift: false }, shadowStyle: { color: hex(pal.ink), blur: u * 0.05, x: 0, y: u * 0.015, opacity: 0.2 } }));
  for (const [x, y, s, r] of [[0.18, 0.16, 0.09, -12], [0.84, 0.3, 0.06, 18], [0.14, 0.78, 0.055, 24], [0.86, 0.84, 0.08, -20], [0.5, 0.12, 0.04, 8]]) els.push(shape("star", w * x, h * y, u * s, u * s, { fill: solid(pal.accent), rotation: r, finish: { kind: "glossy", intensity: 0.6, lift: false }, shadowStyle: { color: hex(pal.ink), blur: u * 0.012, x: 0, y: u * 0.005, opacity: 0.25 } }));
  const img = photo(c, w / 2, by - h * 0.1, u * 0.34, u * 0.34, "circle", "#ffffff");
  if (img) els.push(img);
  const ty = img ? by + h * 0.1 : by - h * 0.02;
  els.push(text(title, w / 2, ty, u * 0.66, u * (img ? 0.08 : 0.105), titleFamily, { color: hex(pal.ink), weight: 800, italic: true, lineHeight: 1.0 }));
  if (c.subtitle) els.push(text(c.subtitle, w / 2, ty + u * (img ? 0.09 : 0.13), u * 0.6, u * 0.034, "Fredoka", { color: hex(pal.ink), weight: 500 }));
  if (c.caption) { els.push(shape("scallop-circle", w * 0.8, h * 0.66, u * 0.17, u * 0.17, { fill: solid(pal.accent), rotation: -10, shadowStyle: { color: hex(pal.ink), blur: u * 0.012, x: 0, y: u * 0.005, opacity: 0.25 } })); els.push(text(c.caption, w * 0.8, h * 0.66, u * 0.13, u * 0.026, "Fredoka", { color: hex("#ffffff"), weight: 600, rotation: -10 })); }
  return { background: { kind: "gradient", gradient: { colors: [hex(pal.a), hex(pal.b), hex(pal.c)] as never, angle: 135 } }, elements: els.filter(Boolean) as BoardElement[] };
}

/** What to draw for a Vision in previews: a board as itself, a book as its cover. */
export function displayBoard<T extends Pick<VisionBoard, "size" | "canvas" | "background" | "elements"> & Partial<Pick<VisionBoard, "format" | "cover" | "title">>>(b: T): T {
  if (b.format !== "book") return b;
  const cover = coverBoard(b.cover ?? { preset: "classic", title: b.title ?? "", palette: 0 }, canvasOf(b));
  return { ...b, background: cover.background, elements: cover.elements };
}
