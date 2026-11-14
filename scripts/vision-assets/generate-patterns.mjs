#!/usr/bin/env node
/**
 * Vision Boards 2.0 (#187): Muse's original built-in pattern collection, drawn in code.
 *
 *   node scripts/vision-assets/generate-patterns.mjs   (then: npm run vision:assets)
 *
 * Writes small SVG tiles to assets-src/vision/pattern/<category>/<name>.svg (+ a sidecar with a label and tags).
 * Every motif is placed with wrap-around copies, so each tile repeats seamlessly; paper and velvet textures use
 * stitched turbulence for the same reason; the few full-bleed gradients are marked as covering once. Everything is
 * original, deterministic (seeded), dependency-free and a few KB each. Re-running overwrites only these files.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(root, "assets-src/vision/pattern");

// ---------- Helpers ----------
const f = (n) => +(+n).toFixed(2);
const rng = (seed) => { let s = seed % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const svg = (w, h, bg, body, defs = "") => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs ? `<defs>${defs}</defs>` : ""}${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ""}${body}</svg>`;
/** A motif at (x, y), plus copies across the tile edges so the tile repeats without seams. `r` is its reach. */
function at(w, h, x, y, r, inner, rot = 0, sc = 1) {
  let o = "";
  for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) {
    const X = x + dx, Y = y + dy;
    if (X + r < 0 || X - r > w || Y + r < 0 || Y - r > h) continue;
    o += `<g transform="translate(${f(X)} ${f(Y)})${rot ? ` rotate(${f(rot)})` : ""}${sc !== 1 ? ` scale(${f(sc)})` : ""}">${inner}</g>`;
  }
  return o;
}
/** Evenly spread points (toroidal distance), for ditsy scatters that look hand-placed but never clump at seams. */
function scatter(w, h, n, minD, seed) {
  const r = rng(seed), pts = [];
  for (let t = 0; pts.length < n && t < n * 400; t++) {
    const p = { x: r() * w, y: r() * h, a: r(), b: r(), c: r() };
    if (pts.every((q) => { let dx = Math.abs(q.x - p.x), dy = Math.abs(q.y - p.y); dx = Math.min(dx, w - dx); dy = Math.min(dy, h - dy); return dx * dx + dy * dy >= minD * minD; })) pts.push(p);
  }
  return pts;
}
/** A half-drop grid (every other column shifted half a row), the classic wallpaper repeat. */
const halfDrop = (w, h, cols, rows) => { const o = []; for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) o.push({ x: (i + 0.5) * w / cols, y: ((j + 0.5 + (i % 2) * 0.5) * h / rows) % h, i, j }); return o; };
const ref = (id, extra = "") => `<use href="#${id}"${extra}/>`;
const turbulence = (id, freq, oct, seed, matrix) => `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${oct}" seed="${seed}" stitchTiles="stitch"/><feColorMatrix type="matrix" values="${matrix}"/></filter>`;

// ---------- Motifs (drawn around 0,0 at roughly 20 units) ----------
const heart = (c, s = 1) => `<path transform="scale(${s})" d="M0 7C-11-1-9-10-3.5-10-1.5-10 0-8.5 0-7 0-8.5 1.5-10 3.5-10 9-10 11-1 0 7Z" fill="${c}"/>`;
const sparkle = (c, s = 1) => `<path transform="scale(${s})" d="M0-10Q1.4-1.4 10 0 1.4 1.4 0 10-1.4 1.4-10 0-1.4-1.4 0-10Z" fill="${c}"/>`;
const star5 = (c, r = 10, ri = 0.45) => { let d = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * ri : r; d += `${i ? "L" : "M"}${f(Math.cos(a) * rr)} ${f(Math.sin(a) * rr)}`; } return `<path d="${d}Z" fill="${c}" stroke="${c}" stroke-width="${f(r * 0.12)}" stroke-linejoin="round"/>`; };
const crescent = (c, r = 10) => `<path d="M0 ${-r}A${r} ${r} 0 1 0 0 ${r}A${f(r * 1.25)} ${f(r * 1.25)} 0 0 1 0 ${-r}Z" fill="${c}"/>`;
const dot = (c, r) => `<circle r="${r}" fill="${c}"/>`;
const ring = (c, r, w) => `<circle r="${r}" fill="none" stroke="${c}" stroke-width="${w}"/>`;
const flower = (petal, center, n = 5, R = 6, pr = 4.2) => { let o = ""; for (let i = 0; i < n; i++) { const a = i * 2 * Math.PI / n; o += `<circle cx="${f(Math.cos(a) * R)}" cy="${f(Math.sin(a) * R)}" r="${pr}" fill="${petal}"/>`; } return o + `<circle r="${f(pr * 0.75)}" fill="${center}"/>`; };
const daisy = (petal, center, n = 12, len = 11) => { let o = ""; for (let i = 0; i < n; i++) o += `<ellipse cx="0" cy="${f(-len * 0.55)}" rx="${f(len * 0.2)}" ry="${f(len * 0.5)}" fill="${petal}" transform="rotate(${f(i * 360 / n)})"/>`; return o + `<circle r="${f(len * 0.28)}" fill="${center}"/>`; };
const leaf = (c, len = 12, vein) => `<path d="M0 0Q${f(len * 0.45)} ${f(-len * 0.5)} 0 ${-len}Q${f(-len * 0.45)} ${f(-len * 0.5)} 0 0Z" fill="${c}"/>${vein ? `<path d="M0 0L0 ${f(-len * 0.85)}" stroke="${vein}" stroke-width=".6"/>` : ""}`;
const bow = (c, knot) => `<path d="M0 0C-4-6-13-8-13-1-13 5-5 4 0 0Z" fill="${c}"/><path d="M0 0C4-6 13-8 13-1 13 5 5 4 0 0Z" fill="${c}"/><path d="M-1 1-6 11-3 10-1 12ZM1 1 6 11 3 10 1 12Z" fill="${c}"/><circle r="2.4" fill="${knot}"/>`;
const rosebud = (petal, deep, leafC) => `<g transform="rotate(-30)">${leaf(leafC, 9)}</g><g transform="rotate(40)">${leaf(leafC, 8)}</g><circle r="6.5" fill="${petal}"/><path d="M-3.5 1A3.6 3.6 0 1 1 3 -1.5A2.4 2.4 0 1 1-1 -2.2" fill="none" stroke="${deep}" stroke-width="1.2" stroke-linecap="round"/>`;
const cherry = (red, stem, leafC) => `<path d="M-5 4Q-2-8 4-12M6 3Q4-6 4-12" fill="none" stroke="${stem}" stroke-width="1.2" stroke-linecap="round"/><g transform="translate(4 -12) rotate(-70)">${leaf(leafC, 8)}</g><circle cx="-5" cy="6" r="5" fill="${red}"/><circle cx="6" cy="5" r="5" fill="${red}"/><circle cx="-6.6" cy="4.2" r="1.3" fill="#fff" opacity=".7"/><circle cx="4.4" cy="3.2" r="1.3" fill="#fff" opacity=".7"/>`;
const strawberry = (red, seed, leafC) => `<path d="M0 11C-8 6-10-2-7-5-4-7 4-7 7-5 10-2 8 6 0 11Z" fill="${red}"/>${[[-3, -2], [2, -2], [-4, 2], [1, 2], [4, 1], [-1, 6], [3, 5]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx=".6" ry=".9" fill="${seed}"/>`).join("")}<path d="M-6-5-3-8 0-6 3-8 6-5 2-6 0-9-2-6Z" fill="${leafC}"/>`;
const mushroom = (cap, dots, stem) => `<rect x="-3" y="-1" width="6" height="10" rx="2.5" fill="${stem}"/><path d="M-11 0C-11-9 11-9 11 0Z" fill="${cap}"/><circle cx="-5" cy="-4" r="1.6" fill="${dots}"/><circle cx="2" cy="-6" r="1.3" fill="${dots}"/><circle cx="6" cy="-2.5" r="1.4" fill="${dots}"/>`;
const lemon = (peel, flesh) => `<circle r="10" fill="${peel}"/><circle r="8.4" fill="#fffbe6"/><circle r="7.6" fill="${flesh}"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M0 0L${f(Math.cos(i * Math.PI / 4) * 7.6)} ${f(Math.sin(i * Math.PI / 4) * 7.6)}" stroke="#fffbe6" stroke-width="1"/>`).join("")}`;
const moth = (wing, body, mark) => `<ellipse cx="-6" cy="-3" rx="7" ry="5" fill="${wing}" transform="rotate(-25 -6 -3)"/><ellipse cx="6" cy="-3" rx="7" ry="5" fill="${wing}" transform="rotate(25 6 -3)"/><ellipse cx="-4.5" cy="4" rx="4.5" ry="3.4" fill="${wing}" transform="rotate(30 -4.5 4)"/><ellipse cx="4.5" cy="4" rx="4.5" ry="3.4" fill="${wing}" transform="rotate(-30 4.5 4)"/><circle cx="-6" cy="-3" r="1.7" fill="${mark}"/><circle cx="6" cy="-3" r="1.7" fill="${mark}"/><ellipse rx="1.4" ry="7" fill="${body}"/><path d="M-.5-6-3-10M.5-6 3-10" stroke="${body}" stroke-width=".7" fill="none"/>`;
const feather = (vane, shaft) => `<path d="M0 12C-6 4-6-6 0-13 6-6 6 4 0 12Z" fill="${vane}"/><path d="M0 14V-12" stroke="${shaft}" stroke-width=".9"/>${[-8, -4, 0, 4].map((y) => `<path d="M0 ${y}L-4 ${y - 3}M0 ${y + 1}L4 ${y - 2}" stroke="${shaft}" stroke-width=".5" opacity=".6"/>`).join("")}`;
const cone = (scoop, coneC, sprinkle) => `<path d="M-6 0 0 14 6 0Z" fill="${coneC}"/><path d="M-4 3 2 3M-3 6 3 6" stroke="#c08a4a" stroke-width=".6"/><circle cy="-4" r="7" fill="${scoop}"/><path d="M-7-2Q-5 1-3-1-1 2 1-1 3 2 5-1 7 1 7-2" fill="${scoop}"/>${[[-3, -7], [2, -8], [4, -4], [-1, -3]].map(([x, y], i) => `<rect x="${x}" y="${y}" width="2.2" height=".9" rx=".45" fill="${sprinkle[i % sprinkle.length]}" transform="rotate(${i * 50} ${x} ${y})"/>`).join("")}`;
const cloud = (c) => `<path d="M-12 4A5 5 0 0 1-9-5 7 7 0 0 1 4-7 6 6 0 0 1 12 1 4 4 0 0 1 10 6H-10A3 3 0 0 1-12 4Z" fill="${c}"/>`;
const bee = () => `<ellipse cx="-3" cy="-5" rx="4" ry="2.6" fill="#ffffff" opacity=".85" transform="rotate(-25 -3 -5)"/><ellipse cx="3" cy="-5" rx="4" ry="2.6" fill="#ffffff" opacity=".85" transform="rotate(25 3 -5)"/><ellipse rx="6" ry="4.4" fill="#ffcf4a"/><path d="M-2-4.2V4.2M1.6-4.2V4.2" stroke="#3b2a1a" stroke-width="1.5"/><circle cx="5.6" r="1.6" fill="#3b2a1a"/>`;
const fern = (c) => { let o = `<path d="M0 14Q2 0 0-14" fill="none" stroke="${c}" stroke-width="1"/>`; for (let i = 0; i < 7; i++) { const y = 11 - i * 3.6, l = 7 - i * 0.7; o += `<g transform="translate(0 ${f(y)}) rotate(-62)">${leaf(c, l)}</g><g transform="translate(0 ${f(y)}) rotate(62)">${leaf(c, l)}</g>`; } return o; };
const lavender = (bud, stem) => { let o = `<path d="M0 14Q1 2 0-12" fill="none" stroke="${stem}" stroke-width="1"/>`; for (let i = 0; i < 6; i++) { const y = -10 + i * 3; o += `<ellipse cx="-1.6" cy="${y}" rx="1.5" ry="2.2" fill="${bud}" transform="rotate(-25 -1.6 ${y})"/><ellipse cx="1.6" cy="${y + 1}" rx="1.5" ry="2.2" fill="${bud}" transform="rotate(25 1.6 ${y + 1})"/>`; } return o; };
const pressed = (petal, center, n) => { let o = ""; for (let i = 0; i < n; i++) o += `<path d="M0 0Q-4-6 0-11 4-6 0 0Z" fill="${petal}" opacity=".7" transform="rotate(${f(i * 360 / n)})"/>`; return o + `<circle r="2" fill="${center}" opacity=".8"/>`; };
const smileyStar = (c, face) => `${star5(c, 11, 0.5)}<circle cx="-2.6" cy="-1" r=".9" fill="${face}"/><circle cx="2.6" cy="-1" r=".9" fill="${face}"/><path d="M-2.4 2Q0 4.2 2.4 2" fill="none" stroke="${face}" stroke-width=".9" stroke-linecap="round"/>`;
const eye = (c) => `<path d="M-10 0Q0-8 10 0 0 8-10 0Z" fill="none" stroke="${c}" stroke-width="1.2"/><circle r="3" fill="${c}"/>${[-6, -3, 0, 3, 6].map((x) => `<path d="M${x} ${x === 0 ? -6 : -5} ${f(x * 1.3)} ${x === 0 ? -9.5 : -8}" stroke="${c}" stroke-width=".8"/>`).join("")}`;
const pearl = (id) => `<circle r="4" fill="url(#${id})"/>`;
const rose = (petal, deep) => `<circle r="8" fill="${petal}"/><path d="M-5 2C-6-4 2-7 5-3 7 1 3 5-1 4-4 3-3-2 0-2 2-2 2 1 0 1" fill="none" stroke="${deep}" stroke-width="1.3" stroke-linecap="round"/>`;

const out = []; // { cat, name, label, tags, svg, cover? }
const add = (cat, name, label, tags, body, cover = false) => out.push({ cat, name, label, tags, svg: body, cover });

// ---------- Girly & Romantic ----------
{
  const w = 120, h = 120, p = halfDrop(w, h, 2, 2);
  add("girly-romantic", "blush-bows", "Blush bows", ["bow", "pink", "coquette"], svg(w, h, "#fde4ec", p.map((q) => at(w, h, q.x, q.y, 16, bow(q.i ? "#f7a8c4" : "#ef8fb3", "#e46f9d"), q.i ? 8 : -8)).join("")));
}
{
  const w = 140, h = 140, pts = scatter(w, h, 16, 26, 7), cs = ["#ff8fb1", "#ffb3c8", "#f45d8f", "#ffc9d9"];
  add("girly-romantic", "tiny-hearts", "Tiny hearts", ["heart", "love", "pink"], svg(w, h, "#fff6f0", pts.map((q) => at(w, h, q.x, q.y, 10, heart(cs[Math.floor(q.a * 4)], 0.55 + q.b * 0.3), (q.c - 0.5) * 40)).join("")));
}
{
  const w = 48, h = 48;
  add("girly-romantic", "heart-gingham", "Strawberry-milk gingham", ["gingham", "check", "pink"], svg(w, h, "#fff7f9", `<rect width="24" height="48" fill="#f9a8c4" opacity=".45"/><rect width="48" height="24" fill="#f9a8c4" opacity=".45"/>${at(w, h, 12, 12, 6, heart("#ffffff", 0.4))}`));
}
{
  const w = 80, h = 56;
  let b = `<path d="M0 30${Array.from({ length: 4 }, (_, i) => `A10 10 0 0 0 ${(i + 1) * 20} 30`).join("")}V56H0Z" fill="#ffffff"/>`;
  for (let i = 0; i < 4; i++) b += `<circle cx="${i * 20 + 10}" cy="40" r="3" fill="#f4c6d6"/><circle cx="${i * 20 + 10}" cy="40" r="5.5" fill="none" stroke="#ffffff" stroke-width="1"/>`;
  for (let i = 0; i < 8; i++) b += `<circle cx="${i * 10 + 5}" cy="50" r="1.4" fill="#f4c6d6"/>`;
  add("girly-romantic", "eyelet-lace", "Eyelet lace", ["lace", "scallop", "vintage"], svg(w, h, "#f4c6d6", b + `<path d="M0 18H80" stroke="#ffffff" stroke-width="1" stroke-dasharray="3 3"/>`));
}
{
  const w = 150, h = 150, pts = scatter(w, h, 9, 44, 21);
  add("girly-romantic", "rosebuds", "Ditsy rosebuds", ["rose", "floral", "ditsy"], svg(w, h, "#fbf1e9", pts.map((q) => at(w, h, q.x, q.y, 16, rosebud(q.a > 0.5 ? "#f28fa8" : "#f6b0bf", "#c9536f", "#8fb996"), q.b * 360)).join("")));
}
{
  const w = 60, h = 60;
  add("girly-romantic", "satin-ribbon-stripes", "Satin ribbon stripes", ["stripe", "ribbon", "pink"], svg(w, h, "#fff1f5", `<rect x="0" width="22" height="60" fill="#f7b7cb"/><rect x="0" width="22" height="60" fill="url(#sh)"/><path d="M3 0V60M19 0V60" stroke="#ffffff" stroke-width="1" stroke-dasharray="3 2.5"/><path d="M40 0V60" stroke="#f7b7cb" stroke-width="2"/>`, `<linearGradient id="sh"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset=".45" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`));
}
{
  const w = 120, h = 80;
  let b = "";
  for (const y of [22, 62]) { b += `<path d="M-10 ${y - 14}Q30 ${y + 10} 60 ${y - 14} 90 ${y + 10} 130 ${y - 14}" fill="none" stroke="#d8c2e8" stroke-width=".6"/>`; for (let i = 0; i <= 14; i++) { const x = -10 + i * 10, t = ((x + 10) % 60) / 60, yy = y - 14 + Math.sin(t * Math.PI) * 12; b += `<circle cx="${f(x)}" cy="${f(yy)}" r="2.8" fill="url(#pl)"/>`; } b += at(w, h, 60, y - 12, 8, bow("#f3b6cf", "#e48fb4"), 0, 0.5); }
  add("girly-romantic", "pearl-swags", "Coquette pearl swags", ["pearl", "coquette", "lilac"], svg(w, h, "#efe4f7", b, `<radialGradient id="pl" cx=".35" cy=".35"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#f3eaf6"/><stop offset="1" stop-color="#cdbbd9"/></radialGradient>`));
}

// ---------- Celestial & Cosmic ----------
{
  const w = 200, h = 60, phases = [0, 0.25, 0.5, 0.75, 1];
  let b = "";
  phases.forEach((p, i) => { const x = 20 + i * 40; b += `<circle cx="${x}" cy="30" r="11" fill="#2b2d5c" stroke="#f6e7b4" stroke-width="1"/>`; if (p > 0 && p < 1) b += `<path d="M${x} 19A11 11 0 0 ${p < 0.5 ? 1 : 0} ${x} 41A${f(Math.abs(1 - p * 2) * 11 + 0.01)} 11 0 0 ${p < 0.5 ? 0 : 1} ${x} 19Z" fill="#f6e7b4"/>`; if (p === 0.5) b += `<circle cx="${x}" cy="30" r="11" fill="#f6e7b4"/>`; });
  add("celestial-cosmic", "moon-phases", "Moon phases", ["moon", "phases", "night"], svg(w, h, "#16183a", b + at(w, h, 0, 5, 3, sparkle("#f6e7b4", 0.25))));
}
{
  const w = 220, h = 220, r = rng(5), groups = [[[30, 40], [55, 30], [80, 52], [62, 80], [40, 70]], [[130, 30], [160, 48], [185, 40], [200, 70]], [[120, 130], [140, 150], [170, 140], [190, 170], [160, 190], [130, 175]], [[30, 150], [50, 185], [80, 170]]];
  let b = "";
  for (const g of groups) { b += `<path d="M${g.map((p) => p.join(" ")).join("L")}" fill="none" stroke="#9fb3ff" stroke-width=".7" opacity=".7"/>`; for (const [x, y] of g) b += at(w, h, x, y, 5, sparkle("#fff7d6", 0.28 + r() * 0.15)); }
  for (let i = 0; i < 60; i++) b += `<circle cx="${f(r() * w)}" cy="${f(r() * h)}" r="${f(0.3 + r() * 0.7)}" fill="#ffffff" opacity="${f(0.3 + r() * 0.6)}"/>`;
  add("celestial-cosmic", "constellations", "Constellation map", ["stars", "constellation", "navy"], svg(w, h, "#121733", b));
}
{
  const w = 800, h = 600;
  add("celestial-cosmic", "dreamy-galaxy", "Dreamy galaxy", ["galaxy", "nebula", "cosmic"], svg(w, h, "#1b1340",
    `<ellipse cx="260" cy="260" rx="320" ry="160" fill="#7b4fd6" opacity=".55" filter="url(#b)" transform="rotate(-20 260 260)"/><ellipse cx="560" cy="360" rx="300" ry="150" fill="#e35fa8" opacity=".45" filter="url(#b)" transform="rotate(-20 560 360)"/><ellipse cx="420" cy="300" rx="220" ry="70" fill="#7fd8ff" opacity=".4" filter="url(#b)" transform="rotate(-20 420 300)"/>` +
    (() => { const r = rng(9); let s = ""; for (let i = 0; i < 160; i++) s += `<circle cx="${f(r() * w)}" cy="${f(r() * h)}" r="${f(0.4 + r() * 1.3)}" fill="#ffffff" opacity="${f(0.35 + r() * 0.65)}"/>`; return s; })(),
    `<filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter>`), true);
}
{
  const w = 240, h = 120, band = (y, a, c, o) => `<path d="M0 ${y}${Array.from({ length: 4 }, (_, i) => `Q${i * 60 + 30} ${y - a} ${(i + 1) * 60} ${y}`).join("")}V${y + 34}${Array.from({ length: 4 }, (_, i) => `Q${(3 - i) * 60 + 30} ${y + 34 + a} ${(3 - i) * 60} ${y + 34}`).join("")}Z" fill="${c}" opacity="${o}"/>`;
  add("celestial-cosmic", "aurora-ribbons", "Aurora ribbons", ["aurora", "northern lights", "teal"], svg(w, h, "#0f1d2e", band(10, 16, "#3ef0c0", 0.45) + band(44, 12, "#8a7bff", 0.4) + band(78, 16, "#ff7ad9", 0.3) + band(-24, 16, "#3ef0c0", 0.25) + `<filter id="g"><feGaussianBlur stdDeviation="2"/></filter>`));
}
{
  const w = 120, h = 120, pts = scatter(w, h, 10, 30, 33);
  add("celestial-cosmic", "golden-sparkles", "Golden sparkles", ["sparkle", "gold", "lavender"], svg(w, h, "#d9cdf7", pts.map((q) => at(w, h, q.x, q.y, 10, sparkle(q.a > 0.3 ? "#f2c14e" : "#ffffff", 0.35 + q.b * 0.55))).join("")));
}
{
  const w = 90, h = 90, p = halfDrop(w, h, 2, 2);
  add("celestial-cosmic", "crescent-dots", "Crescents & dots", ["moon", "crescent", "periwinkle"], svg(w, h, "#a9b6f5", p.map((q) => at(w, h, q.x, q.y, 10, q.i ? dot("#fef6e4", 2.2) : crescent("#fef6e4", 8), -20)).join("")));
}
{
  const w = 120, h = 120, sun = `<circle r="8" fill="#f2c14e"/>${Array.from({ length: 12 }, (_, i) => `<path d="M0-11L1.6-15H-1.6Z" fill="#f2c14e" transform="rotate(${i * 30})"/>`).join("")}`;
  add("celestial-cosmic", "sun-and-moon", "Sun & moon", ["sun", "moon", "midnight"], svg(w, h, "#1d1b45", at(w, h, 30, 30, 16, sun) + at(w, h, 90, 90, 12, crescent("#f6e7b4", 10), -30) + at(w, h, 90, 30, 4, sparkle("#f6e7b4", 0.3)) + at(w, h, 30, 90, 4, sparkle("#f6e7b4", 0.3))));
}

// ---------- Parisian & Vintage ----------
{
  const w = 180, h = 180, spray = (c) => `<path d="M0 18Q-2 4 4-12" fill="none" stroke="${c}" stroke-width="1"/><path d="M1 6Q8 2 12-4M0 0Q-8-3-12-10" fill="none" stroke="${c}" stroke-width=".8"/>${[[4, -14], [12, -6], [-12, -12]].map(([x, y]) => `<g transform="translate(${x} ${y})"><circle r="4" fill="none" stroke="${c}" stroke-width=".8"/><circle r="1.6" fill="none" stroke="${c}" stroke-width=".7"/>${[0, 72, 144, 216, 288].map((a) => `<path d="M0-4Q2-7 0-8.5-2-7 0-4" fill="none" stroke="${c}" stroke-width=".6" transform="rotate(${a})"/>`).join("")}</g>`).join("")}${[[6, 4, 40], [-6, 2, -30], [2, 12, 20]].map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 0Q3-3 0-7-3-3 0 0Z" fill="none" stroke="${c}" stroke-width=".7"/></g>`).join("")}`;
  add("parisian-vintage", "toile-florals", "Toile florals", ["toile", "french", "blue"], svg(w, h, "#f6f1e7", halfDrop(w, h, 2, 2).map((q) => at(w, h, q.x, q.y, 26, spray("#3d5a8a"), q.i ? 15 : -10, 1.6)).join("")));
}
{
  const w = 40, h = 40;
  add("parisian-vintage", "french-ticking", "French ticking", ["stripe", "ticking", "linen"], svg(w, h, "#f4efe4", `<rect x="4" width="10" height="40" fill="#5872a8" opacity=".85"/><rect x="18" width="2" height="40" fill="#5872a8" opacity=".85"/><rect x="24" width="2" height="40" fill="#5872a8" opacity=".5"/>`));
}
{
  const w = 120, h = 160, half = `<path d="M0-30C10-24 14-12 6-4 14-2 20 8 12 16 6 22 2 20 0 28" fill="none" stroke="#c9a96e" stroke-width="2"/><path d="M0-14C6-12 8-6 3-2" fill="none" stroke="#c9a96e" stroke-width="1.4"/><circle cx="12" cy="-18" r="2" fill="#c9a96e"/><path d="M8 4Q18 0 22 8" fill="none" stroke="#c9a96e" stroke-width="1.2"/>`;
  const motif = `${half}<g transform="scale(-1 1)">${half}</g><path d="M0-36 3-31 0-26-3-31Z" fill="#c9a96e"/>`;
  add("parisian-vintage", "gilded-damask", "Gilded damask", ["damask", "gold", "wallpaper"], svg(w, h, "#5c1f2e", halfDrop(w, h, 2, 2).map((q) => at(w, h, q.x, q.y, 40, motif, 0, 0.9)).join("")));
}
{
  const w = 80, h = 60;
  let b = "";
  for (let i = 0; i < 4; i++) b += `<rect x="${i * 20}" width="10" height="40" fill="#d65a6a"/>`;
  b += `<path d="M0 40${Array.from({ length: 8 }, (_, i) => `A5 5 0 0 0 ${(i + 1) * 10} 40`).join("")}" fill="none" stroke="#d65a6a" stroke-width="2"/>`;
  for (let i = 0; i < 8; i++) b += `<path d="M${i * 10} 40A5 5 0 0 0 ${i * 10 + 10} 40Z" fill="${i % 2 ? "#fbf3ea" : "#d65a6a"}"/>`;
  add("parisian-vintage", "cafe-awning", "Café awning", ["stripe", "awning", "paris"], svg(w, h, "#fbf3ea", b));
}
{
  const w = 160, h = 160, pts = scatter(w, h, 7, 52, 61), cs = [["#c98a8a", "#9b5b5b"], ["#d8b07a", "#a67c47"], ["#a7a9c9", "#6f7299"]];
  add("parisian-vintage", "antique-roses", "Antique roses", ["rose", "vintage", "muted"], svg(w, h, "#efe6d8", pts.map((q) => { const [p, d] = cs[Math.floor(q.a * 3)]; return at(w, h, q.x, q.y, 24, `<g transform="rotate(-40)">${leaf("#8d9b78", 13)}</g><g transform="rotate(50)">${leaf("#a2ad8c", 11)}</g>${rose(p, d)}`, q.b * 360, 1.2); }).join("")));
}
{
  const w = 60, h = 60;
  add("parisian-vintage", "garden-trellis", "Garden trellis", ["trellis", "lattice", "green"], svg(w, h, "#f3efe2", `<path d="M0 30 30 0 60 30 30 60Z" fill="none" stroke="#6f8f6a" stroke-width="2"/>${at(w, h, 30, 0, 6, flower("#e8a0b4", "#f2d16b", 5, 2.6, 2), 0)}${at(w, h, 0, 30, 6, flower("#f5f0f6", "#f2d16b", 5, 2.6, 2))}`));
}
{
  const w = 160, h = 120, stamp = (c) => `<circle r="16" fill="none" stroke="${c}" stroke-width="1.4"/><circle r="12" fill="none" stroke="${c}" stroke-width=".7"/><path d="M-9-2H9M-9 2H9" stroke="${c}" stroke-width=".8"/><circle cy="-7" r="1" fill="${c}"/><circle cy="7" r="1" fill="${c}"/>`;
  const waves = (y) => `<path d="M0 ${y}${Array.from({ length: 8 }, () => "q10 -5 20 0").join("")}" fill="none" stroke="#8a6a52" stroke-width="1" opacity=".55"/>`;
  add("parisian-vintage", "postmarks", "Vintage postmarks", ["stamp", "postal", "sepia"], svg(w, h, "#f2e6d3", at(w, h, 40, 36, 18, stamp("#8a6a52"), -12) + at(w, h, 120, 96, 18, stamp("#a45a52"), 18) + waves(30) + waves(36) + waves(42) + waves(90) + waves(96) + waves(102)));
}

// ---------- Scrapbook & Paper ----------
{
  const w = 240, h = 240;
  add("scrapbook-paper", "kraft-paper", "Kraft paper", ["kraft", "brown", "texture"], svg(w, h, "#c39a6b", `<rect width="${w}" height="${h}" filter="url(#n)" opacity=".55"/><rect width="${w}" height="${h}" filter="url(#fib)" opacity=".35"/>`, turbulence("n", "0.9", 3, 4, "0 0 0 0 .35  0 0 0 0 .24  0 0 0 0 .14  0 0 0 1.1 -.25") + turbulence("fib", "0.02 0.4", 2, 8, "0 0 0 0 1  0 0 0 0 .95  0 0 0 0 .85  0 0 0 .9 -.4")));
}
{
  const w = 240, h = 240;
  add("scrapbook-paper", "vellum", "Frosted vellum", ["vellum", "translucent", "soft"], svg(w, h, "#efe9f6", `<rect width="${w}" height="${h}" filter="url(#n)"/><rect width="${w}" height="${h}" filter="url(#fib)" opacity=".6"/>`, turbulence("n", "0.012", 3, 11, "0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -.45") + turbulence("fib", "0.03 0.6", 2, 5, "0 0 0 0 .78  0 0 0 0 .74  0 0 0 0 .86  0 0 0 1 -.55")));
}
{
  const w = 120, h = 120;
  let b = "";
  for (let y = 8; y < h; y += 16) b += `<path d="M0 ${y}H${w}" stroke="#7fa7c9" stroke-width=".8" opacity=".7"/>`;
  b += `<path d="M30 0V120M90 0V120" stroke="#9cc49a" stroke-width=".6" opacity=".6"/>`;
  add("scrapbook-paper", "ledger", "Ledger paper", ["ruled", "ledger", "journal"], svg(w, h, "#fbfaf3", b));
}
{
  const w = 240, h = 240, r = rng(17);
  let spots = "";
  for (let i = 0; i < 14; i++) { const x = r() * w, y = r() * h, s = 2 + r() * 8; spots += at(w, h, x, y, s * 2, `<circle r="${f(s)}" fill="#a87a45" opacity="${f(0.08 + r() * 0.12)}"/>`); }
  add("scrapbook-paper", "old-book-page", "Old book page", ["aged", "vintage", "book"], svg(w, h, "#efe0bf", `<rect width="${w}" height="${h}" filter="url(#n)" opacity=".5"/>` + spots, turbulence("n", "0.035", 4, 21, "0 0 0 0 .62  0 0 0 0 .48  0 0 0 0 .28  0 0 0 .9 -.3")));
}
{
  const w = 200, h = 200, r = rng(41);
  let b = `<rect width="${w}" height="${h}" filter="url(#n)" opacity=".4"/>`;
  for (let i = 0; i < 60; i++) { const x = r() * w, y = r() * h, a = r() * 360, l = 2 + r() * 6; const c = ["#d9a7b0", "#b7c9a6", "#e9c97a", "#a9b8d6"][Math.floor(r() * 4)]; b += at(w, h, x, y, l, `<path d="M${-l / 2} 0Q0 ${f(r() * 2 - 1)} ${l / 2} 0" stroke="${c}" stroke-width="${f(0.6 + r() * 0.8)}" fill="none" stroke-linecap="round"/>`, a); }
  add("scrapbook-paper", "handmade-paper", "Handmade petal paper", ["handmade", "speckled", "petals"], svg(w, h, "#f8f2e7", b, turbulence("n", "0.6", 2, 3, "0 0 0 0 .7  0 0 0 0 .66  0 0 0 0 .6  0 0 0 1 -.55")));
}
{
  const w = 180, h = 120, r = rng(77);
  let b = "";
  for (let col = 0; col < 3; col++) { let y = 10; while (y < h - 6) { const len = 40 + r() * 12; b += `<rect x="${col * 60 + 8}" y="${f(y)}" width="${f(Math.min(len, 46))}" height="2.2" rx="1" fill="#4a4a4a" opacity=".5"/>`; y += r() > 0.85 ? 9 : 5; } }
  add("scrapbook-paper", "newsprint", "Newsprint columns", ["newspaper", "text", "editorial"], svg(w, h, "#efece4", b));
}
{
  const w = 220, h = 220, r = rng(13), cs = ["#f6d6de", "#d9ecf2", "#fdf0c4", "#e2d9f3", "#dcefd8"];
  let b = "";
  for (let i = 0; i < 9; i++) { const x = r() * w, y = r() * h, rw = 50 + r() * 50, rh = 34 + r() * 30; let d = `M${f(-rw / 2)} ${f(-rh / 2)}`; for (let k = 1; k <= 10; k++) d += `L${f(-rw / 2 + rw * k / 10)} ${f(-rh / 2 + (r() - 0.5) * 4)}`; d += `L${f(rw / 2)} ${f(rh / 2)}`; for (let k = 9; k >= 0; k--) d += `L${f(-rw / 2 + rw * k / 10)} ${f(rh / 2 + (r() - 0.5) * 5)}`; b += at(w, h, x, y, Math.max(rw, rh), `<path d="${d}Z" fill="${cs[i % cs.length]}" stroke="#ffffff" stroke-width="1.2" opacity=".95"/>`, (r() - 0.5) * 40); }
  add("scrapbook-paper", "torn-collage", "Torn paper collage", ["torn", "collage", "pastel"], svg(w, h, "#fbf7f0", b));
}

// ---------- Retro & Groovy ----------
{
  const w = 160, h = 160, cs = ["#e8613c", "#f39a3d", "#f6c453", "#f08bb0", "#8c4a2f"];
  let rings = "";
  for (let k = 9; k >= 1; k--) { let d = ""; for (let a = 0; a < 360; a += 7.5) { const t = a * Math.PI / 180, rr = k * 9 + Math.sin(t * 6) * 2.5; d += `${a ? "L" : "M"}${f(Math.cos(t) * rr)} ${f(Math.sin(t) * rr)}`; } rings += `<path d="${d}Z" fill="${cs[k % cs.length]}"/>`; }
  add("retro-groovy", "psychedelic-swirl", "Psychedelic swirl", ["70s", "groovy", "orange"], svg(w, h, "#f6c453", at(w, h, 80, 80, 90, ref("sw")) + at(w, h, 0, 0, 90, ref("sw")), `<g id="sw">${rings}</g>`));
}
{
  const w = 80, h = 80;
  let b = "";
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) b += `<rect x="${i * 20 + 2}" y="${j * 20 + 2}" width="16" height="16" rx="5" fill="#f2a1c8"/>`;
  add("retro-groovy", "soft-checker", "Soft checkerboard", ["checker", "y2k", "pink"], svg(w, h, "#c9e7a6", b));
}
{
  const w = 140, h = 140, p = halfDrop(w, h, 2, 2);
  add("retro-groovy", "flower-power", "Flower power daisies", ["daisy", "70s", "orange"], svg(w, h, "#f08a4b", p.map((q) => at(w, h, q.x, q.y, 22, daisy("#fff4e0", "#f6c453", 10, 18), q.i * 15)).join("") + at(w, h, 35, 35, 10, daisy("#f9c6d9", "#f6c453", 8, 9)) + at(w, h, 105, 105, 10, daisy("#f9c6d9", "#f6c453", 8, 9))));
}
{
  const w = 120, h = 96, cs = ["#e85d75", "#f49b45", "#f7cf5b", "#7cc6a4", "#6d8fd8", "#b07cd8"];
  add("retro-groovy", "wavy-stripes", "Wavy rainbow stripes", ["wave", "stripe", "rainbow"], svg(w, h, "#fff7ea", cs.map((c, i) => `<path d="M0 ${i * 16 + 8}Q30 ${i * 16} 60 ${i * 16 + 8}T120 ${i * 16 + 8}" fill="none" stroke="${c}" stroke-width="8"/>`).join("")));
}
{
  const w = 100, h = 60, cs = ["#e8613c", "#f39a3d", "#f6c453", "#fff2dc"];
  const arch = cs.map((c, i) => `<path d="M${-22 + i * 5} 0A${22 - i * 5} ${22 - i * 5} 0 0 1 ${22 - i * 5} 0Z" fill="${c}"/>`).join("");
  add("retro-groovy", "rainbow-arches", "Rainbow arches", ["rainbow", "70s", "boho"], svg(w, h, "#fff2dc", at(w, h, 25, 30, 24, arch) + at(w, h, 75, 60, 24, arch) + at(w, h, 75, 0, 24, arch)));
}
{
  const w = 80, h = 80;
  let b = "";
  for (let k = 7; k >= 1; k--) b += `<circle cx="40" cy="40" r="${k * 5.5}" fill="${k % 2 ? "#2a2342" : "#f2e8d5"}"/>`;
  add("retro-groovy", "op-art-rings", "Op-art rings", ["op art", "mod", "rings"], svg(w, h, "#f2e8d5", b + at(w, h, 0, 0, 14, `<circle r="12" fill="#e9a23b"/>`)));
}
{
  const w = 150, h = 150, pts = scatter(w, h, 8, 46, 91);
  add("retro-groovy", "groovy-mushrooms", "Groovy mushrooms", ["mushroom", "70s", "whimsy"], svg(w, h, "#f3e3c3", pts.map((q) => at(w, h, q.x, q.y, 16, mushroom(q.a > 0.5 ? "#e8613c" : "#d98a3d", "#fff4e0", "#f7ead2"), (q.b - 0.5) * 30, 1.3)).join("")));
}

// ---------- Botanical & Cottagecore ----------
{
  const w = 160, h = 160, pts = scatter(w, h, 22, 26, 3), kinds = [() => flower("#f6b6c8", "#f2c14e", 5, 3.6, 2.6), () => flower("#ffffff", "#f2c14e", 6, 3.6, 2.3), () => flower("#b9a5e6", "#fff2b3", 5, 3.2, 2.4), () => `<g transform="rotate(-20)">${leaf("#8fb48a", 9)}</g>`];
  add("botanical-cottagecore", "wildflower-meadow", "Wildflower meadow", ["wildflower", "ditsy", "meadow"], svg(w, h, "#eef3e3", pts.map((q) => at(w, h, q.x, q.y, 10, kinds[Math.floor(q.a * 4)](), q.b * 360)).join("")));
}
{
  const w = 120, h = 120;
  let b = `<path d="M60 0C30 30 90 30 60 60S30 90 60 120" fill="none" stroke="#6c9a62" stroke-width="2"/>`;
  for (let i = 0; i < 6; i++) { const y = 10 + i * 20, x = 60 + Math.sin(i * 1.6) * 14; b += `<g transform="translate(${f(x)} ${y}) rotate(${i % 2 ? 60 : -60})">${leaf(i % 3 ? "#8cbf7e" : "#6c9a62", 14, "#4f7a48")}</g>`; }
  b += at(w, h, 20, 60, 8, flower("#f7c6d4", "#f2c14e", 5, 3, 2.3)) + at(w, h, 100, 20, 8, flower("#ffffff", "#f2c14e", 5, 3, 2.3)) + at(w, h, 100, 100, 8, flower("#f7c6d4", "#f2c14e", 5, 3, 2.3));
  add("botanical-cottagecore", "climbing-vines", "Climbing vines", ["vine", "leaves", "garden"], svg(w, h, "#f5f1e6", b));
}
{
  const w = 180, h = 180, pts = scatter(w, h, 8, 54, 55), cs = [["#e7a7b6", "#c97a8c"], ["#f2c48d", "#c98d4a"], ["#b5a8dc", "#8574bd"], ["#a8c8a0", "#6f9a66"]];
  add("botanical-cottagecore", "pressed-flowers", "Pressed flowers", ["pressed", "botanical", "soft"], svg(w, h, "#f6f0e4", pts.map((q) => { const [p, c] = cs[Math.floor(q.a * 4)]; return at(w, h, q.x, q.y, 20, `<path d="M0 2Q${f(q.c * 6 - 3)} 14 0 22" fill="none" stroke="#8f9f78" stroke-width=".8"/>${pressed(p, c, 5 + Math.floor(q.c * 3))}`, q.b * 360, 1.4); }).join("")));
}
{
  const w = 140, h = 140, p = halfDrop(w, h, 3, 2);
  add("botanical-cottagecore", "fern-fronds", "Fern fronds", ["fern", "green", "forest"], svg(w, h, "#e9efe1", p.map((q) => at(w, h, q.x, q.y, 22, fern(q.i % 2 ? "#5f8a5a" : "#7ea86f"), q.i % 2 ? 25 : -25, 1.4)).join("")));
}
{
  const w = 130, h = 130, pts = scatter(w, h, 9, 38, 67);
  add("botanical-cottagecore", "strawberry-patch", "Strawberry patch", ["strawberry", "fruit", "cottage"], svg(w, h, "#fbf2e8", pts.map((q) => at(w, h, q.x, q.y, 14, q.a > 0.25 ? strawberry("#e8505b", "#ffe59a", "#6fae64") : flower("#ffffff", "#f6c453", 5, 3, 2.4), (q.b - 0.5) * 50)).join("")));
}
{
  const w = 120, h = 120, p = halfDrop(w, h, 3, 2);
  add("botanical-cottagecore", "lavender-sprigs", "Lavender sprigs", ["lavender", "purple", "herbs"], svg(w, h, "#f4f0f8", p.map((q) => at(w, h, q.x, q.y, 18, lavender("#9b7fd4", "#7d9a6a"), q.i % 2 ? 18 : -14, 1.25)).join("")));
}
{
  const w = 150, h = 150, pts = scatter(w, h, 12, 34, 101);
  add("botanical-cottagecore", "bee-garden", "Bee garden", ["bee", "honey", "flowers"], svg(w, h, "#fff8e1", pts.map((q) => at(w, h, q.x, q.y, 12, q.a > 0.6 ? bee() : flower(q.b > 0.5 ? "#f7b9c9" : "#ffffff", "#f2b630", 6, 3.6, 2.5), (q.c - 0.5) * 60, 1.1)).join("")));
}

// ---------- Glam & Iridescent ----------
{
  const w = 800, h = 600;
  add("glam-iridescent", "holographic-gradient", "Holographic gradient", ["holographic", "iridescent", "rainbow"], svg(w, h, "#ffd6f2", `<rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h}" fill="url(#s)"/>`, `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc6ec"/><stop offset=".25" stop-color="#c9b8ff"/><stop offset=".5" stop-color="#a8f0ff"/><stop offset=".72" stop-color="#c8ffe4"/><stop offset="1" stop-color="#ffe2c4"/></linearGradient><linearGradient id="s" x1="0" y1="1" x2="1" y2="0"><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset=".65" stop-color="#fff" stop-opacity="0"/></linearGradient>`), true);
}
{
  const w = 120, h = 120, pts = scatter(w, h, 14, 26, 23);
  add("glam-iridescent", "pearl-scatter", "Pearl scatter", ["pearl", "luxe", "blush"], svg(w, h, "#f6e6ea", pts.map((q) => at(w, h, q.x, q.y, 8, pearl("p"), 0, 0.8 + q.a * 1.2)).join(""), `<radialGradient id="p" cx=".35" cy=".3"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#f7eef4"/><stop offset=".8" stop-color="#e3d2e6"/><stop offset="1" stop-color="#c8b3cf"/></radialGradient>`));
}
{
  const w = 100, h = 100, r = rng(31), cs = ["#ffd1f2", "#d8c6ff", "#bff1ff", "#ffe8b3", "#ffffff"];
  let b = "";
  for (let i = 0; i < 140; i++) b += `<circle cx="${f(r() * w)}" cy="${f(r() * h)}" r="${f(0.4 + r() * 0.9)}" fill="${cs[Math.floor(r() * cs.length)]}" opacity="${f(0.5 + r() * 0.5)}"/>`;
  for (let i = 0; i < 6; i++) b += at(w, h, r() * w, r() * h, 5, sparkle("#ffffff", 0.25 + r() * 0.2));
  add("glam-iridescent", "soft-glitter", "Soft glitter", ["glitter", "sparkle", "lilac"], svg(w, h, "#b9a2e3", b));
}
{
  const w = 80, h = 40, fan = `<path d="M-20 0A20 20 0 0 1 20 0Z" fill="url(#gold)"/>${[-60, -30, 0, 30, 60].map((a) => `<path d="M0 0L${f(Math.sin(a * Math.PI / 180) * 20)} ${f(-Math.cos(a * Math.PI / 180) * 20)}" stroke="#1f1a2e" stroke-width=".8"/>`).join("")}<path d="M-14 0A14 14 0 0 1 14 0" fill="none" stroke="#1f1a2e" stroke-width=".8"/>`;
  add("glam-iridescent", "deco-fans", "Art deco fans", ["art deco", "gold", "gatsby"], svg(w, h, "#1f1a2e", at(w, h, 20, 20, 22, fan) + at(w, h, 60, 40, 22, fan) + at(w, h, 60, 0, 22, fan), `<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7e3a3"/><stop offset=".5" stop-color="#d4a94c"/><stop offset="1" stop-color="#9c7629"/></linearGradient>`));
}
{
  const w = 40, h = 40, scale = `<path d="M-10 0A10 10 0 0 0 10 0V-4A10 10 0 0 1-10-4Z" fill="url(#op)" stroke="#ffffff" stroke-width=".6" opacity=".95"/>`;
  add("glam-iridescent", "mermaid-scales", "Opal mermaid scales", ["mermaid", "scales", "opal"], svg(w, h, "#bfe9f2", at(w, h, 10, 10, 12, scale) + at(w, h, 30, 10, 12, scale) + at(w, h, 0, 30, 12, scale) + at(w, h, 20, 30, 12, scale) + at(w, h, 40, 30, 12, scale), `<linearGradient id="op" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd3f0"/><stop offset=".5" stop-color="#b9e3ff"/><stop offset="1" stop-color="#c9ffe6"/></linearGradient>`));
}
{
  const w = 60, h = 60, r = rng(8), tones = ["#e8e8ef", "#c9c9d6", "#f7f7fb", "#b3b3c4", "#dcd3ef", "#f1d9ea"];
  let b = "";
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) b += `<rect x="${i * 10 + 0.6}" y="${j * 10 + 0.6}" width="8.8" height="8.8" rx="1" fill="${tones[Math.floor(r() * tones.length)]}"/>${r() > 0.75 ? `<path d="M${i * 10 + 2} ${j * 10 + 3}l2-1" stroke="#ffffff" stroke-width="1" stroke-linecap="round"/>` : ""}`;
  add("glam-iridescent", "disco-mosaic", "Disco mosaic", ["disco", "mirror", "silver"], svg(w, h, "#7a7690", b));
}
{
  const w = 120, h = 120, pts = scatter(w, h, 16, 22, 47);
  add("glam-iridescent", "champagne-bubbles", "Champagne bubbles", ["bubbles", "champagne", "blush"], svg(w, h, "#f8e1d6", pts.map((q) => { const s = 2 + q.a * 7; return at(w, h, q.x, q.y, s + 2, `${ring("#d9a95f", s, 0.9)}<circle cx="${f(-s * 0.35)}" cy="${f(-s * 0.35)}" r="${f(s * 0.22)}" fill="#ffffff" opacity=".8"/>`); }).join("")));
}

// ---------- Dark & Moody ----------
{
  const w = 160, h = 160, pts = scatter(w, h, 7, 56, 19);
  add("dark-moody", "gothic-roses", "Gothic roses", ["rose", "gothic", "black"], svg(w, h, "#140c12", pts.map((q) => at(w, h, q.x, q.y, 26, `<g transform="rotate(-50)">${leaf("#2f4a35", 15)}</g><g transform="rotate(40)">${leaf("#3a5a40", 13)}</g>${rose(q.a > 0.5 ? "#7a1530" : "#5a0f26", "#c43a5a")}`, q.b * 360, 1.3)).join("")));
}
{
  const w = 140, h = 140, p = halfDrop(w, h, 2, 2);
  add("dark-moody", "midnight-moths", "Midnight moths", ["moth", "witchy", "plum"], svg(w, h, "#2a1733", p.map((q) => at(w, h, q.x, q.y, 18, moth("#c7a6d9", "#3c2448", "#f2d38b"), q.i ? 20 : -15, 1.4)).join("") + at(w, h, 35, 105, 4, sparkle("#f2d38b", 0.3)) + at(w, h, 105, 35, 4, sparkle("#f2d38b", 0.3))));
}
{
  const w = 200, h = 200, half = `<path d="M0-26C8-20 12-10 5-3 12-1 16 8 9 14 4 18 1 17 0 24" fill="none" stroke="#8a3a5e" stroke-width="2.4"/>`;
  add("dark-moody", "velvet-damask", "Velvet damask", ["velvet", "damask", "burgundy"], svg(w, h, "#3a0d22", `<rect width="${w}" height="${h}" filter="url(#n)" opacity=".5"/>` + halfDrop(w, h, 2, 2).map((q) => at(w, h, q.x, q.y, 32, `${half}<g transform="scale(-1 1)">${half}</g>`, 0, 1.2)).join(""), turbulence("n", "0.02", 3, 6, "0 0 0 0 .5  0 0 0 0 .1  0 0 0 0 .25  0 0 0 1 -.4")));
}
{
  const w = 150, h = 150, pts = scatter(w, h, 10, 40, 29), kinds = [() => eye("#d9b45a"), () => crescent("#d9b45a", 9), () => star5("#d9b45a", 7), () => sparkle("#d9b45a", 0.5)];
  add("dark-moody", "witchy-sigils", "Witchy sigils", ["witchy", "tarot", "gold"], svg(w, h, "#121018", pts.map((q) => at(w, h, q.x, q.y, 13, kinds[Math.floor(q.a * 4)](), (q.b - 0.5) * 40)).join("")));
}
{
  const w = 140, h = 140, p = halfDrop(w, h, 2, 2);
  add("dark-moody", "raven-feathers", "Raven feathers", ["feather", "raven", "dark"], svg(w, h, "#2b2d36", p.map((q) => at(w, h, q.x, q.y, 22, feather(q.i ? "#14161c" : "#3d4152", "#8b8fa3"), q.i ? 35 : -30, 1.6)).join("")));
}
{
  const w = 80, h = 80;
  let b = "";
  for (let k = 1; k <= 3; k++) b += `<circle cx="40" cy="40" r="${k * 12}" fill="none" stroke="#e8e0f0" stroke-width=".7" opacity=".55"/>`;
  for (let a = 0; a < 360; a += 30) b += `<path d="M40 40L${f(40 + Math.cos(a * Math.PI / 180) * 40)} ${f(40 + Math.sin(a * Math.PI / 180) * 40)}" stroke="#e8e0f0" stroke-width=".6" opacity=".55"/>`;
  b += at(w, h, 0, 0, 10, flower("none", "#e8e0f0", 6, 5, 3).replace(/fill="none"/g, 'fill="none" stroke="#e8e0f0" stroke-width=".7"'));
  add("dark-moody", "black-lace", "Black lace", ["lace", "web", "gothic"], svg(w, h, "#100d14", b));
}
{
  const w = 200, h = 140, pts = scatter(w, h, 6, 62, 37);
  add("dark-moody", "storm-clouds", "Storm clouds", ["cloud", "storm", "moody"], svg(w, h, "#2f3447", pts.map((q) => at(w, h, q.x, q.y, 30, cloud(q.a > 0.5 ? "#4a5068" : "#596080"), 0, 2 + q.b)).join("") + at(w, h, 150, 40, 10, `<path d="M0-8-4 1H0L-2 9 5-2H1L3-8Z" fill="#f2d38b"/>`)));
}

// ---------- Playful & Whimsical ----------
{
  const w = 120, h = 120, pts = scatter(w, h, 40, 13, 83), cs = ["#ff6b9a", "#ffc94d", "#5ad1c7", "#8f7bff", "#ff9a5c", "#7ad06b"];
  add("playful-whimsical", "confetti-sprinkles", "Confetti sprinkles", ["confetti", "sprinkles", "party"], svg(w, h, "#fffaf2", pts.map((q) => at(w, h, q.x, q.y, 5, `<rect x="-3.2" y="-1" width="6.4" height="2" rx="1" fill="${cs[Math.floor(q.a * cs.length)]}"/>`, q.b * 180)).join("")));
}
{
  const w = 120, h = 120, p = halfDrop(w, h, 2, 2);
  add("playful-whimsical", "cherry-bomb", "Cherry bomb", ["cherry", "fruit", "red"], svg(w, h, "#fde6ea", p.map((q) => at(w, h, q.x, q.y, 16, cherry("#e0313f", "#6b8e3d", "#7cb259"), q.i ? 15 : -10, 1.2)).join("")));
}
{
  const w = 100, h = 100, pts = scatter(w, h, 14, 22, 59), cs = ["#ff8fb1", "#ffd36b", "#7fd8d2", "#a990ff", "#ffa96b"];
  add("playful-whimsical", "rainbow-polka", "Rainbow polka dots", ["polka", "dots", "rainbow"], svg(w, h, "#ffffff", pts.map((q) => at(w, h, q.x, q.y, 8, dot(cs[Math.floor(q.a * cs.length)], 3.5 + q.b * 3))).join("")));
}
{
  const w = 110, h = 110, pts = scatter(w, h, 8, 36, 71);
  add("playful-whimsical", "lemon-squeeze", "Lemon squeeze", ["lemon", "citrus", "summer"], svg(w, h, "#dff1f7", pts.map((q) => at(w, h, q.x, q.y, 12, q.a > 0.3 ? lemon("#f7d23e", "#fbe57a") : `<g transform="rotate(30)">${leaf("#7cc06b", 11)}</g>`, q.b * 360, 1.1)).join("")));
}
{
  const w = 160, h = 160, pts = scatter(w, h, 14, 34, 19), shapes = [(c) => `<path d="M-9 0Q-6-6-3 0T3 0 9 0" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`, (c) => `<path d="M0-7 7 6H-7Z" fill="${c}"/>`, (c) => ring(c, 5, 2.2), (c) => `<rect x="-5" y="-5" width="10" height="10" fill="${c}"/>`], cs = ["#ff5f8f", "#2fbfb3", "#ffc93c", "#6b5cff", "#1f1f2e"];
  add("playful-whimsical", "memphis-squiggles", "Memphis squiggles", ["memphis", "90s", "shapes"], svg(w, h, "#fff5ec", pts.map((q) => at(w, h, q.x, q.y, 10, shapes[Math.floor(q.a * 4)](cs[Math.floor(q.c * cs.length)]), q.b * 360)).join("")));
}
{
  const w = 120, h = 120, p = halfDrop(w, h, 2, 2);
  add("playful-whimsical", "smiley-stars", "Smiley stars", ["star", "smiley", "cute"], svg(w, h, "#cfe6ff", p.map((q) => at(w, h, q.x, q.y, 14, smileyStar(q.i ? "#ffd84d" : "#ff9ec4", "#3a2a40"), q.i ? 12 : -12, 1.3)).join("") + at(w, h, 30, 90, 5, sparkle("#ffffff", 0.35)) + at(w, h, 90, 30, 5, sparkle("#ffffff", 0.35))));
}
{
  const w = 130, h = 130, pts = scatter(w, h, 8, 42, 43), scoops = ["#ffb3c8", "#c8f0d8", "#fff0b3", "#d9c8ff"];
  add("playful-whimsical", "ice-cream-social", "Ice cream social", ["ice cream", "dessert", "pastel"], svg(w, h, "#fff4f8", pts.map((q) => at(w, h, q.x, q.y, 16, cone(scoops[Math.floor(q.a * 4)], "#f2c48d", ["#ff6b9a", "#5ad1c7", "#ffc94d", "#8f7bff"]), (q.b - 0.5) * 40, 1.2)).join("")));
}

// ---------- Minimal & Editorial ----------
{
  const w = 40, h = 40;
  add("minimal-editorial", "fine-grid", "Fine grid", ["grid", "graph", "neutral"], svg(w, h, "#fbfaf7", `<path d="M0 .5H40M.5 0V40" stroke="#cfcac0" stroke-width="1"/><path d="M0 20.5H40M20.5 0V40" stroke="#e4e0d8" stroke-width=".6"/>`));
}
{
  const w = 16, h = 16;
  add("minimal-editorial", "pinstripes", "Navy pinstripes", ["pinstripe", "tailored", "navy"], svg(w, h, "#1f2a44", `<path d="M8 0V16" stroke="#e8e2d4" stroke-width=".7" opacity=".7"/>`));
}
{
  const w = 24, h = 24;
  add("minimal-editorial", "dot-grid", "Dot grid", ["dot grid", "bullet journal", "minimal"], svg(w, h, "#faf8f3", `<circle cx="12" cy="12" r="1.1" fill="#b8b2a6"/>`));
}
{
  const w = 40, h = 40;
  add("minimal-editorial", "herringbone", "Herringbone", ["herringbone", "tweed", "neutral"], svg(w, h, "#efe9df", `<g opacity=".8">${Array.from({ length: 4 }, (_, i) => `<path d="M${i * 10} 0L${i * 10 + 10} 10M${i * 10} 10L${i * 10 + 10} 0M${i * 10} 20L${i * 10 + 10} 30M${i * 10} 30L${i * 10 + 10} 20M${i * 10} 10L${i * 10 + 10} 20M${i * 10} 30L${i * 10 + 10} 40" stroke="#b6ab99" stroke-width="2"/>`).join("")}</g>`));
}
{
  const w = 160, h = 160, r = rng(53), cs = ["#d8b4a0", "#9fb1a0", "#e9d8c4", "#b7a99a", "#c97c6a", "#7c8a9c"];
  let b = "";
  for (let i = 0; i < 46; i++) { const s = 2 + r() * 6; let d = ""; const n = 5 + Math.floor(r() * 3); for (let k = 0; k < n; k++) { const a = k * 2 * Math.PI / n + r() * 0.6, rr = s * (0.6 + r() * 0.5); d += `${k ? "L" : "M"}${f(Math.cos(a) * rr)} ${f(Math.sin(a) * rr)}`; } b += at(w, h, r() * w, r() * h, s + 2, `<path d="${d}Z" fill="${cs[Math.floor(r() * cs.length)]}"/>`); }
  add("minimal-editorial", "terrazzo", "Terrazzo", ["terrazzo", "stone", "speckle"], svg(w, h, "#f3eee7", b));
}
{
  const w = 32, h = 32, tooth = `<path d="M0 0H8L16 8V16L8 8V16H0Z" fill="#2a2a2e"/>`;
  add("minimal-editorial", "houndstooth", "Houndstooth", ["houndstooth", "check", "classic"], svg(w, h, "#f3efe8", at(w, h, 0, 0, 18, tooth) + at(w, h, 16, 16, 18, tooth)));
}
{
  const w = 60, h = 60;
  add("minimal-editorial", "arches", "Editorial arches", ["arch", "geometric", "terracotta"], svg(w, h, "#f4ece2", `<path d="M8 60V30A22 22 0 0 1 52 30V60" fill="none" stroke="#c8795d" stroke-width="3"/><path d="M18 60V32A12 12 0 0 1 42 32V60" fill="none" stroke="#e3b9a4" stroke-width="2"/>`));
}

// ---------- Journal & Stationery (fills you can lay under writing, or across a whole page) ----------
{
  const w = 240, h = 240;
  add("journal-stationery", "blank-paper", "Blank paper", ["blank", "paper", "plain"], svg(w, h, "#fdfbf6", `<rect width="${w}" height="${h}" filter="url(#n)" opacity=".35"/>`, turbulence("n", "0.8", 2, 12, "0 0 0 0 .78  0 0 0 0 .74  0 0 0 0 .68  0 0 0 1 -.62")));
}
{
  const w = 120, h = 54;
  add("journal-stationery", "wide-ruled", "Wide-ruled", ["ruled", "lined", "notebook"], svg(w, h, "#fefdf9", `<path d="M0 53.5H120" stroke="#9cb9d8" stroke-width="1.2"/>`));
}
{
  const w = 120, h = 38;
  add("journal-stationery", "college-ruled", "College-ruled", ["ruled", "lined", "notebook"], svg(w, h, "#fefdf9", `<path d="M0 37.5H120" stroke="#a9c3df" stroke-width="1"/>`));
}
{
  const w = 30, h = 30;
  add("journal-stationery", "journal-dots", "Dot grid journal", ["dot grid", "bullet journal", "dots"], svg(w, h, "#fbf9f4", `<circle cx="15" cy="15" r="1.3" fill="#a7a093"/>`));
}
{
  const w = 32, h = 32;
  add("journal-stationery", "square-grid", "Square grid", ["grid", "squares", "math"], svg(w, h, "#fbfcfe", `<path d="M0 .5H32M.5 0V32" stroke="#bfd0e6" stroke-width="1"/>`));
}
{
  const w = 100, h = 100;
  let b = "";
  for (let i = 0; i < 10; i++) b += `<path d="M0 ${i * 10 + 0.5}H100M${i * 10 + 0.5} 0V100" stroke="#b9dcc4" stroke-width="${i === 0 ? 1.4 : 0.6}"/>`;
  add("journal-stationery", "graph-paper", "Graph paper", ["graph", "engineering", "green"], svg(w, h, "#f7fbf6", b));
}
{
  const w = 1600, h = 40;
  add("journal-stationery", "notebook-paper", "Notebook paper", ["notebook", "margin", "school"], svg(w, h, "#fffefb", `<path d="M0 39.5H1600" stroke="#a9c3df" stroke-width="1"/><path d="M120 0V40" stroke="#e8a3a8" stroke-width="1.6"/><path d="M126 0V40" stroke="#e8a3a8" stroke-width=".6"/>`));
}
{
  const w = 260, h = 260;
  add("journal-stationery", "vintage-parchment", "Vintage parchment", ["parchment", "aged", "antique"], svg(w, h, "#f1e2c2", `<rect width="${w}" height="${h}" filter="url(#n)" opacity=".7"/><rect width="${w}" height="${h}" filter="url(#m)" opacity=".35"/>`, turbulence("n", "0.012", 4, 31, "0 0 0 0 .63  0 0 0 0 .48  0 0 0 0 .26  0 0 0 1.1 -.35") + turbulence("m", "0.6", 2, 4, "0 0 0 0 .55  0 0 0 0 .42  0 0 0 0 .25  0 0 0 1 -.6")));
}
{
  const w = 240, h = 240;
  add("journal-stationery", "soft-stationery", "Soft stationery", ["stationery", "pastel", "texture"], svg(w, h, "#f9f1f4", `<rect width="${w}" height="${h}" filter="url(#n)" opacity=".5"/><rect width="${w}" height="${h}" filter="url(#f)" opacity=".4"/>`, turbulence("n", "0.02", 3, 17, "0 0 0 0 .96  0 0 0 0 .86  0 0 0 0 .9  0 0 0 1 -.4") + turbulence("f", "0.03 0.7", 2, 7, "0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 -.55")));
}
{
  const w = 160, h = 44;
  add("journal-stationery", "decorative-writing", "Decorative writing paper", ["writing paper", "letter", "floral"], svg(w, h, "#fffaf6", `<path d="M0 43.5H160" stroke="#e3b8c6" stroke-width="1" stroke-dasharray="1 3" stroke-linecap="round"/>` + at(w, h, 80, 22, 5, sparkle("#f0c9d6", 0.32))));
}

// ---------- Washi tape (strips with torn ends, a little translucent, a satin sheen) ----------
const tapes = [];
/** A washi strip: `fill` is the tape colour, `tile` (w, h, markup) repeats along it. */
function washi(cat, name, label, tags, base, tile, opts = {}) {
  const W = 640, H = 104, r = rng(name.length * 977 + W), edge = (x0, dir) => { let d = ""; for (let y = 0; y <= H; y += 8) d += `L${f(x0 + dir * (r() * 7))} ${y}`; return d; };
  const outline = `M10 0${edge(W - 10, 1).replace(/^L[^L]*/, `L${W - 10} 0`)}L${W - 10} ${H}${edge(10, -1).split("L").reverse().filter(Boolean).map((p) => `L${p}`).join("")}Z`;
  const defs = `<clipPath id="t"><path d="${outline}"/></clipPath><pattern id="m" width="${tile.w}" height="${tile.h}" patternUnits="userSpaceOnUse" y="${f((H - tile.h * Math.round(H / tile.h)) / 2)}">${tile.body}</pattern><linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".06"/></linearGradient>`;
  const body = `<g clip-path="url(#t)" opacity="${opts.opacity ?? 0.9}"><rect width="${W}" height="${H}" fill="${base}"/><rect width="${W}" height="${H}" fill="url(#m)"/><rect width="${W}" height="${H}" fill="url(#sh)"/></g>`;
  tapes.push({ cat, name, label, tags, svg: svg(W, H, "", body, defs) });
}
const T = (w, h, body) => ({ w, h, body });
// Girly
washi("girly", "heart-ribbon-tape", "Heart ribbon", ["hearts", "pink"], "#ffd3e2", T(52, 52, at(52, 52, 13, 13, 8, heart("#ff7aa8", 0.5)) + at(52, 52, 39, 39, 8, heart("#ffffff", 0.45))));
washi("girly", "bow-tape", "Little bows", ["bow", "coquette"], "#fbe3ec", T(64, 104, at(64, 104, 32, 52, 16, bow("#e98bb0", "#d86c98"), 0, 0.9)));
washi("girly", "rosebud-tape", "Rosebuds", ["rose", "floral"], "#fff2ea", T(70, 70, at(70, 70, 20, 20, 12, rosebud("#f28fa8", "#c9536f", "#8fb996"), 20, 0.85) + at(70, 70, 55, 55, 12, rosebud("#f6b0bf", "#c9536f", "#8fb996"), -30, 0.75)));
washi("girly", "lace-scallop-tape", "Lace scallop", ["lace", "white"], "#f7c9d8", T(26, 104, `<path d="M0 22A13 13 0 0 0 26 22V0H0Z" fill="#ffffff" opacity=".9"/><path d="M0 82A13 13 0 0 1 26 82V104H0Z" fill="#ffffff" opacity=".9"/><circle cx="13" cy="52" r="3" fill="#ffffff"/><circle cx="13" cy="36" r="1.4" fill="#ffffff"/><circle cx="13" cy="68" r="1.4" fill="#ffffff"/>`));
// Celestial
washi("celestial", "starry-night-tape", "Starry night", ["stars", "navy"], "#1d2350", T(80, 104, at(80, 104, 20, 26, 8, sparkle("#f6e7b4", 0.6)) + at(80, 104, 60, 74, 8, sparkle("#f6e7b4", 0.45)) + `<circle cx="48" cy="20" r="1.2" fill="#fff"/><circle cx="12" cy="80" r="1" fill="#fff"/><circle cx="70" cy="44" r=".9" fill="#fff"/>`), { opacity: 0.95 });
washi("celestial", "moon-phase-tape", "Moon phases", ["moon", "lavender"], "#cbbdf2", T(60, 104, at(60, 104, 30, 52, 12, crescent("#fdf6e3", 13), -20) + `<circle cx="8" cy="20" r="1.6" fill="#fdf6e3"/><circle cx="52" cy="84" r="1.6" fill="#fdf6e3"/>`));
washi("celestial", "gold-constellation-tape", "Gold constellations", ["constellation", "gold"], "#2a2547", T(150, 104, `<path d="M14 30 40 18 66 40 92 26M100 70 124 58 140 82" fill="none" stroke="#d9b45a" stroke-width="1" opacity=".8"/>${[[14, 30], [40, 18], [66, 40], [92, 26], [100, 70], [124, 58], [140, 82]].map(([x, y]) => at(150, 104, x, y, 5, sparkle("#f2d38b", 0.3))).join("")}`), { opacity: 0.95 });
washi("celestial", "holographic-tape", "Holographic foil", ["holographic", "iridescent"], "url(#holo)", T(40, 104, `<path d="M0 0 40 104M-20 0 20 104M20 0 60 104" stroke="#ffffff" stroke-width="1" opacity=".35"/>`), { opacity: 0.88 });
// Whimsical
washi("whimsical", "rainbow-stripe-tape", "Rainbow stripes", ["rainbow", "stripe"], "#ffffff", T(84, 104, ["#ff8fb1", "#ffc56b", "#ffe680", "#9be3b4", "#8fc8ff", "#c3a6ff"].map((c, i) => `<rect x="${i * 14}" width="14" height="104" fill="${c}"/>`).join("")));
washi("whimsical", "daisy-tape", "Happy daisies", ["daisy", "flowers"], "#bfe3f5", T(72, 104, at(72, 104, 22, 34, 14, daisy("#ffffff", "#f6c453", 10, 13)) + at(72, 104, 56, 76, 12, daisy("#ffe0ec", "#f6c453", 9, 10))));
washi("whimsical", "cherry-tape", "Cherries", ["cherry", "fruit"], "#fff0f3", T(64, 104, at(64, 104, 32, 52, 16, cherry("#e0313f", "#6b8e3d", "#7cb259"), 10, 1.1)));
washi("whimsical", "confetti-tape", "Confetti", ["confetti", "party"], "#fff8e8", T(60, 104, scatter(60, 104, 12, 14, 5).map((q, i) => at(60, 104, q.x, q.y, 5, `<rect x="-3.5" y="-1.1" width="7" height="2.2" rx="1.1" fill="${["#ff6b9a", "#ffc94d", "#5ad1c7", "#8f7bff"][i % 4]}"/>`, q.a * 180)).join("")));
washi("celestial", "aurora-tape", "Aurora", ["aurora", "dreamy"], "url(#aur)", T(60, 104, at(60, 104, 30, 52, 8, sparkle("#ffffff", 0.45))), { opacity: 0.9 });
washi("girly", "lavender-gingham-tape", "Lavender gingham", ["gingham", "lavender"], "#efe6fb", T(28, 28, `<rect width="14" height="28" fill="#b9a0ea" opacity=".45"/><rect width="28" height="14" fill="#b9a0ea" opacity=".45"/>`));
washi("whimsical", "glitter-tape", "Gold glitter", ["glitter", "gold", "sparkle"], "#fbe3e9", T(60, 104, scatter(60, 104, 22, 8, 9).map((q) => `<circle cx="${f(q.x)}" cy="${f(q.y)}" r="${f(0.8 + q.a * 1.6)}" fill="${q.b > 0.4 ? "#e2b04a" : "#fff6d6"}"/>`).join("") + at(60, 104, 30, 52, 7, sparkle("#e2b04a", 0.35))));
for (const t of tapes) t.svg = t.svg.replace("<defs>", `<defs><linearGradient id="aur" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8ef0d0"/><stop offset=".4" stop-color="#9fb8ff"/><stop offset=".75" stop-color="#e3a6ff"/><stop offset="1" stop-color="#ffb3d1"/></linearGradient><linearGradient id="holo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffc6ec"/><stop offset=".3" stop-color="#c9b8ff"/><stop offset=".55" stop-color="#a8f0ff"/><stop offset=".8" stop-color="#c8ffe4"/><stop offset="1" stop-color="#ffe2c4"/></linearGradient>`);

// ---------- Sparkle stickers (transparent, so die-cut edges follow them) ----------
const sparkles = [];
const stk = (cat, name, label, tags, W, H, body, defs = "") => sparkles.push({ cat, name, label, tags, svg: svg(W, H, "", body, defs) });
const GOLD = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".45" stop-color="#e8b84e"/><stop offset=".7" stop-color="#ffe7a0"/><stop offset="1" stop-color="#c8902c"/></linearGradient>`;
const HOLO = `<linearGradient id="h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc6ec"/><stop offset=".3" stop-color="#c9b8ff"/><stop offset=".55" stop-color="#a8f0ff"/><stop offset=".8" stop-color="#c8ffe4"/><stop offset="1" stop-color="#ffe2c4"/></linearGradient>`;
stk("sparkles", "gold-sparkle-cluster", "Gold sparkle cluster", ["sparkle", "gold", "magic"], 400, 400, `<g transform="translate(180 210) scale(14)">${sparkle("url(#g)")}</g><g transform="translate(310 110) scale(6)">${sparkle("url(#g)")}</g><g transform="translate(320 300) scale(4.2)">${sparkle("url(#g)")}</g><circle cx="90" cy="90" r="9" fill="url(#g)"/>`, GOLD);
stk("sparkles", "twinkle-trio", "Twinkle trio", ["twinkle", "stars", "pastel"], 420, 300, `<g transform="translate(110 170) scale(9)">${sparkle("#ffd6ec")}</g><g transform="translate(250 110) scale(7)">${sparkle("#c9b8ff")}</g><g transform="translate(340 210) scale(5.5)">${sparkle("#a8f0ff")}</g>`);
stk("sparkles", "holo-heart", "Holographic heart", ["heart", "holographic", "love"], 400, 380, `<g transform="translate(200 220) scale(17)">${heart("url(#h)")}</g><path d="M120 120Q150 90 190 100" stroke="#ffffff" stroke-width="16" stroke-linecap="round" fill="none" opacity=".8"/><g transform="translate(320 90) scale(4)">${sparkle("#ffffff")}</g>`, HOLO);
stk("sparkles", "shooting-star", "Shooting star", ["shooting star", "wish", "gold"], 520, 300, `<path d="M40 250Q200 150 330 120" stroke="url(#h)" stroke-width="26" stroke-linecap="round" fill="none" opacity=".85"/><path d="M90 250Q220 170 330 135" stroke="#ffffff" stroke-width="6" stroke-linecap="round" fill="none" opacity=".7"/><g transform="translate(390 110)">${star5("url(#g)", 70, 0.48)}</g>`, GOLD + HOLO);
stk("sparkles", "glitter-moon", "Glitter moon", ["moon", "crescent", "night"], 380, 400, `<g transform="translate(170 200)">${crescent("url(#g)", 150)}</g>${[[300, 90, 5], [320, 260, 3.5], [250, 340, 2.8]].map(([x, y, sc]) => `<g transform="translate(${x} ${y}) scale(${sc})">${sparkle("#fff3c4")}</g>`).join("")}`, GOLD);
stk("sparkles", "starburst-badge", "Starburst badge", ["badge", "starburst", "retro"], 400, 400, `<g transform="translate(200 200)">${Array.from({ length: 24 }, (_, i) => `<path d="M0 -190 22 -150H-22Z" fill="#ff8fb1" transform="rotate(${i * 15})"/>`).join("")}<circle r="152" fill="#ff8fb1"/><circle r="132" fill="none" stroke="#ffffff" stroke-width="5" stroke-dasharray="2 12" stroke-linecap="round"/><g transform="scale(9)">${sparkle("#ffffff")}</g></g>`);
stk("sparkles", "sparkle-bow", "Sparkle bow", ["bow", "coquette", "sparkle"], 420, 360, `<g transform="translate(210 170) scale(13)">${bow("url(#h)", "#f6a8c8")}</g><g transform="translate(70 70) scale(4)">${sparkle("#ffffff")}</g><g transform="translate(360 280) scale(3.4)">${sparkle("#ffffff")}</g>`, HOLO);
stk("sparkles", "dreamy-cloud", "Dreamy cloud", ["cloud", "dreamy", "sky"], 480, 320, `<g transform="translate(240 190) scale(17)">${cloud("#ffffff")}</g><g transform="translate(240 190) scale(16)">${cloud("url(#h)")}</g><g transform="translate(120 70) scale(4.5)">${sparkle("#c9b8ff")}</g><g transform="translate(400 80) scale(3.5)">${sparkle("#ffc6ec")}</g>`, HOLO);
for (const t of sparkles) {
  const dir = join(root, "assets-src/vision/sticker", t.cat); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${t.name}.svg`), t.svg);
  writeFileSync(join(dir, `${t.name}.json`), JSON.stringify({ label: t.label, tags: t.tags }) + "\n");
}
console.log(`Wrote ${sparkles.length} sparkle stickers.`);

// ---------- Frames (each has a see-through window: put a photo behind it) ----------
const frames = [];
const rr = (x, y, w, h, r) => `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
const FONT = `font-family="Helvetica, Arial, sans-serif"`;
/** `win` is the photo window [x, y, w, h] in the frame's pixels (stored normalised, so "Add a photo inside" can fit a photo exactly). */
function frame(cat, name, label, tags, W, H, body, defs = "", win) { frames.push({ cat, name, label, tags, svg: svg(W, H, "", body, defs), window: win && win.map((v, i) => +(v / (i % 2 ? H : W)).toFixed(4)) }); }
// Now playing: a dreamy music card (album-art window, your song goes on top as text).
frame("music", "now-playing", "Now playing", ["music", "song", "player"], 600, 840,
  `<path fill-rule="evenodd" d="${rr(0, 0, 600, 840, 44)}${rr(60, 60, 480, 480, 22)}" fill="url(#np)"/>` +
  `<rect x="60" y="590" width="300" height="26" rx="13" fill="#ffffff" opacity=".9"/><rect x="60" y="632" width="200" height="18" rx="9" fill="#ffffff" opacity=".55"/>` +
  `<path d="M512 590c-10-16-38-8-28 14l28 24 28-24c10-22-18-30-28-14z" fill="#ffffff" opacity=".9"/>` +
  `<rect x="60" y="682" width="480" height="8" rx="4" fill="#ffffff" opacity=".35"/><rect x="60" y="682" width="190" height="8" rx="4" fill="#ffffff"/><circle cx="250" cy="686" r="11" fill="#ffffff"/>` +
  `<text x="60" y="718" ${FONT} font-size="18" fill="#ffffff" opacity=".7">1:24</text><text x="540" y="718" ${FONT} font-size="18" fill="#ffffff" opacity=".7" text-anchor="end">3:47</text>` +
  `<path d="M200 752v40l-26-20zM196 752h-8v40h8z" fill="#ffffff" transform="translate(-14 0)"/><circle cx="300" cy="772" r="38" fill="#ffffff"/><path d="M290 754v36l30-18z" fill="#c7a4ff"/><path d="M400 752v40l26-20zM404 752h8v40h-8z" fill="#ffffff" transform="translate(14 0)"/>`,
  `<linearGradient id="np" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c7a4ff"/><stop offset=".55" stop-color="#f49ac2"/><stop offset="1" stop-color="#ffc6a5"/></linearGradient>`, [60, 60, 480, 480]);
// Vinyl sleeve: your photo is the album cover; the record peeks out.
frame("music", "vinyl-sleeve", "Vinyl sleeve", ["vinyl", "record", "album"], 860, 600,
  `<g clip-path="url(#peek)"><circle cx="560" cy="300" r="280" fill="#141218"/>${[250, 220, 190, 160, 130].map((r) => `<circle cx="560" cy="300" r="${r}" fill="none" stroke="#2c2833" stroke-width="2"/>`).join("")}<circle cx="560" cy="300" r="78" fill="#f49ac2"/><circle cx="560" cy="300" r="8" fill="#141218"/><path d="M420 120A240 240 0 0 1 700 130" fill="none" stroke="#ffffff" stroke-width="6" opacity=".12"/></g>` +
  `<path fill-rule="evenodd" d="M0 0H600V600H0Z M24 24V576H576V24Z" fill="#f5efe6"/><path d="M0 0H600V600H0Z" fill="none" stroke="#e2d6c4" stroke-width="2"/>`, `<clipPath id="peek"><rect x="600" y="0" width="260" height="600"/></clipPath>`, [24, 24, 552, 552]);
// Cassette: your photo sits on the label.
frame("music", "cassette", "Mixtape cassette", ["cassette", "mixtape", "retro"], 800, 520,
  `<path fill-rule="evenodd" d="${rr(0, 0, 800, 520, 34)}M70 60H730V250H70Z" fill="#2d2a38"/>` +
  `<rect x="200" y="290" width="400" height="120" rx="60" fill="#1b1922"/><circle cx="300" cy="350" r="44" fill="#f2efe9"/><circle cx="500" cy="350" r="44" fill="#f2efe9"/>${[300, 500].map((cx) => [0, 60, 120, 180, 240, 300].map((a) => `<path d="M${cx} 350v-34" stroke="#2d2a38" stroke-width="7" stroke-linecap="round" transform="rotate(${a} ${cx} 350)"/>`).join("")).join("")}<circle cx="300" cy="350" r="12" fill="#2d2a38"/><circle cx="500" cy="350" r="12" fill="#2d2a38"/>` +
  `<path d="M160 520 200 450H600L640 520Z" fill="#3b3748"/>${[230, 330, 470, 570].map((x) => `<circle cx="${x}" cy="490" r="9" fill="#1b1922"/>`).join("")}<rect x="70" y="250" width="660" height="22" fill="#f49ac2"/><text x="90" y="267" ${FONT} font-size="16" font-weight="700" fill="#2d2a38">SIDE A</text>`, "", [70, 60, 660, 190]);
// Film strip with three frames.
frame("film", "film-strip", "Film strip", ["film", "35mm", "cinema"], 1000, 380,
  `<path fill-rule="evenodd" d="M0 0H1000V380H0Z ${[0, 1, 2].map((i) => `M${40 + i * 320} 70H${280 + i * 320}V310H${40 + i * 320}Z`).join(" ")} ${Array.from({ length: 20 }, (_, i) => `${rr(14 + i * 50, 18, 26, 30, 5)}${rr(14 + i * 50, 332, 26, 30, 5)}`).join("")}" fill="#17151d"/><text x="40" y="60" ${FONT} font-size="15" fill="#f2b54a" letter-spacing="3">MUSE 400  ▸ 12A</text><text x="960" y="352" ${FONT} font-size="15" fill="#f2b54a" text-anchor="end" letter-spacing="3">13 ▸ 14A</text>`, "", [40, 70, 240, 240]);
// Photo-booth strip.
frame("film", "photo-booth", "Photo-booth strip", ["photo booth", "strip", "four"], 400, 1240,
  `<path fill-rule="evenodd" d="M0 0H400V1240H0Z ${[0, 1, 2, 3].map((i) => `M34 ${34 + i * 280}H366V${284 + i * 280}H34Z`).join(" ")}" fill="#fffdf8"/><text x="200" y="1210" ${FONT} font-size="22" fill="#b58ba0" text-anchor="middle" letter-spacing="6">♥ FOREVER ♥</text>`, "", [34, 34, 332, 250]);
// Phone lockscreen.
frame("trendy", "phone-lockscreen", "Phone lockscreen", ["phone", "lockscreen", "wallpaper"], 620, 1240,
  `<path fill-rule="evenodd" d="${rr(0, 0, 620, 1240, 96)}${rr(26, 26, 568, 1188, 74)}" fill="#1c1a22"/><rect x="230" y="50" width="160" height="40" rx="20" fill="#1c1a22"/>` +
  `<text x="310" y="168" ${FONT} font-size="30" fill="#ffffff" text-anchor="middle" opacity=".9">Friday, June 12</text><text x="310" y="320" ${FONT} font-size="150" font-weight="300" fill="#ffffff" text-anchor="middle" opacity=".95">9:27</text>` +
  `<rect x="220" y="1170" width="180" height="10" rx="5" fill="#ffffff" opacity=".85"/><circle cx="110" cy="1080" r="40" fill="#ffffff" opacity=".2"/><circle cx="510" cy="1080" r="40" fill="#ffffff" opacity=".2"/>`, "", [26, 26, 568, 1188]);
// Concert ticket stub.
frame("trendy", "ticket-stub", "Concert ticket", ["ticket", "concert", "admit one"], 1000, 420,
  `<path fill-rule="evenodd" d="M0 0H1000V170A40 40 0 0 0 1000 250V420H0V250A40 40 0 0 0 0 170Z M40 40H600V380H40Z" fill="#fbe8ef"/><path d="M700 30V390" stroke="#d98aa8" stroke-width="3" stroke-dasharray="10 10"/>` +
  `<text x="850" y="120" ${FONT} font-size="30" font-weight="800" fill="#c2537d" text-anchor="middle" letter-spacing="4">ADMIT</text><text x="850" y="170" ${FONT} font-size="30" font-weight="800" fill="#c2537d" text-anchor="middle" letter-spacing="4">ONE</text>` +
  `<text x="850" y="250" ${FONT} font-size="20" fill="#c2537d" text-anchor="middle">ROW  B · SEAT 7</text>${Array.from({ length: 22 }, (_, i) => `<rect x="${742 + i * 9}" y="300" width="${i % 3 ? 3 : 6}" height="60" fill="#c2537d"/>`).join("")}`, "", [40, 40, 560, 340]);
// Magazine cover.
frame("trendy", "magazine-cover", "Magazine cover", ["magazine", "cover", "editorial"], 820, 1080,
  `<path fill-rule="evenodd" d="M0 0H820V1080H0Z M18 18V1062H802V18Z" fill="#ffffff"/><text x="410" y="190" font-family="Georgia, 'Times New Roman', serif" font-size="200" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="12" stroke="#1d1d1f" stroke-width="2">MUSE</text>` +
  `<text x="52" y="880" font-family="Georgia, serif" font-size="56" font-style="italic" fill="#ffffff">the dream issue</text><text x="52" y="930" ${FONT} font-size="22" fill="#ffffff" letter-spacing="5">BECOMING HER · 2027</text>` +
  `<rect x="660" y="940" width="120" height="90" fill="#ffffff"/>${Array.from({ length: 24 }, (_, i) => `<rect x="${668 + i * 4.6}" y="948" width="${i % 3 ? 2 : 3.4}" height="62" fill="#1d1d1f"/>`).join("")}`, "", [18, 18, 784, 1044]);
// CD jewel case.
frame("music", "cd-case", "CD case", ["cd", "y2k", "album"], 720, 640,
  `<path fill-rule="evenodd" d="${rr(0, 0, 720, 640, 14)}M84 34H686V606H84Z" fill="#dfe4ee" opacity=".92"/><rect x="0" y="0" width="70" height="640" rx="14" fill="#c4cad8"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `<rect x="18" y="${40 + i * 58}" width="34" height="34" rx="4" fill="#aeb5c6"/>`).join("")}<path d="M84 34 686 34 400 240Z" fill="#ffffff" opacity=".2"/>`, "", [84, 34, 602, 572]);
// Postage stamp.
frame("trendy", "postage-stamp", "Postage stamp", ["stamp", "postal", "travel"], 600, 720,
  `<path fill-rule="evenodd" d="M0 0H600V720H0Z ${Array.from({ length: 15 }, (_, i) => `M${20 + i * 40} 0a20 20 0 0 0 40 0M${20 + i * 40} 720a20 20 0 0 1 40 0`).join(" ")} ${Array.from({ length: 18 }, (_, i) => `M0 ${20 + i * 40}a20 20 0 0 1 0 40M600 ${20 + i * 40}a20 20 0 0 0 0 40`).join(" ")} M60 60H540V580H60Z" fill="#fffaf2"/><text x="300" y="650" font-family="Georgia, serif" font-size="40" font-style="italic" fill="#b0566f" text-anchor="middle">Paris · 2€</text>`, "", [60, 60, 480, 520]);
// Gilded gallery frame.
frame("gallery", "gilded-frame", "Gilded gallery frame", ["gold", "gallery", "ornate"], 700, 860,
  `<path fill-rule="evenodd" d="M0 0H700V860H0Z M90 90V770H610V90Z" fill="url(#gold)"/><path d="M20 20H680V840H20Z M70 70H630V790H70Z" fill="none" stroke="#8a6a24" stroke-width="3"/>${[[45, 45], [655, 45], [45, 815], [655, 815]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="14" fill="#f7e3a3" stroke="#8a6a24" stroke-width="2"/>`).join("")}<path d="M90 90H610V770H90Z" fill="none" stroke="#5c4514" stroke-width="6"/>`,
  `<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7e3a3"/><stop offset=".35" stop-color="#d4a94c"/><stop offset=".55" stop-color="#f3d98c"/><stop offset=".8" stop-color="#b08530"/><stop offset="1" stop-color="#e8c873"/></linearGradient>`, [90, 90, 520, 680]);
// Heart frame.
frame("gallery", "heart-frame", "Heart frame", ["heart", "love", "romantic"], 700, 640,
  `<path fill-rule="evenodd" d="${rr(0, 0, 700, 640, 40)} M350 560C150 430 70 330 70 230 70 140 140 80 220 80 280 80 330 115 350 160 370 115 420 80 480 80 560 80 630 140 630 230 630 330 550 430 350 560Z" fill="#f7c6d6"/>${Array.from({ length: 16 }, (_, i) => `<circle cx="${40 + i * 41}" cy="22" r="6" fill="#ffffff" opacity=".8"/><circle cx="${40 + i * 41}" cy="618" r="6" fill="#ffffff" opacity=".8"/>`).join("")}`, "", [70, 80, 560, 480]);
// Social-style photo post (generic, no app branding).
frame("trendy", "photo-post", "Photo post", ["post", "social", "likes"], 640, 820,
  `<path fill-rule="evenodd" d="${rr(0, 0, 640, 820, 30)}M0 90H640V730H0Z" fill="#ffffff"/><circle cx="50" cy="45" r="24" fill="url(#ring)"/><circle cx="50" cy="45" r="19" fill="#f3e6ff"/><rect x="90" y="32" width="150" height="14" rx="7" fill="#2a2135"/><rect x="90" y="54" width="90" height="10" rx="5" fill="#b9aec7"/>` +
  `<path d="M60 760c-8-13-30-6-22 11l22 19 22-19c8-17-14-24-22-11z" fill="#ff4f8b"/><path d="M110 752h40a8 8 0 0 1 8 8v20a8 8 0 0 1-8 8h-22l-14 12v-12h-4a8 8 0 0 1-8-8v-20a8 8 0 0 1 8-8z" fill="none" stroke="#2a2135" stroke-width="4"/><path d="M590 752v40l-16-12-16 12v-40z" fill="none" stroke="#2a2135" stroke-width="4"/><text x="40" y="812" ${FONT} font-size="18" font-weight="700" fill="#2a2135">2,027 likes</text>`,
  `<linearGradient id="ring" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#ffb36b"/><stop offset=".5" stop-color="#ff4f8b"/><stop offset="1" stop-color="#a15cff"/></linearGradient>`, [0, 90, 640, 640]);
for (const fr of frames) {
  const dir = join(root, "assets-src/vision/frame", fr.cat); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${fr.name}.svg`), fr.svg);
  writeFileSync(join(dir, `${fr.name}.json`), JSON.stringify({ label: fr.label, tags: fr.tags, ...(fr.window ? { window: fr.window } : {}) }) + "\n");
}
console.log(`Wrote ${frames.length} frames.`);

// ---------- Write ----------
for (const p of out) {
  const dir = join(OUT, p.cat); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${p.name}.svg`), p.svg);
  writeFileSync(join(dir, `${p.name}.json`), JSON.stringify({ label: p.label, tags: p.tags, ...(p.cover ? { tileable: false } : {}) }) + "\n");
}
for (const t of tapes) {
  const dir = join(root, "assets-src/vision/washi", t.cat); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${t.name}.svg`), t.svg);
  writeFileSync(join(dir, `${t.name}.json`), JSON.stringify({ label: t.label, tags: t.tags }) + "\n");
}
console.log(`Wrote ${tapes.length} washi tapes.`);
const counts = {}; for (const p of out) counts[p.cat] = (counts[p.cat] ?? 0) + 1;
console.log(`Wrote ${out.length} patterns:`, counts);
