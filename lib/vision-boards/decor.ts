/**
 * Vision Boards 2.0 (#187): the editable shape library. Every shape is generated at the element's real size (not a
 * stretched unit box), so scallops stay round, ticket notches stay circular and borders follow the true outline.
 * The same path fills, strokes, clips pattern fills and outlines die-cut stickers.
 */
import { shapePaths, scalePath, type CropShape } from "./shapes";

export const decorShapes = [
  { id: "rect", label: "Rectangle", group: "Basic", ratio: null },
  { id: "rounded", label: "Rounded", group: "Basic", ratio: null },
  { id: "square", label: "Square", group: "Basic", ratio: 1 },
  { id: "circle", label: "Circle", group: "Basic", ratio: 1 },
  { id: "oval", label: "Oval", group: "Basic", ratio: null },
  { id: "arch", label: "Arch", group: "Basic", ratio: null },
  { id: "heart", label: "Heart", group: "Basic", ratio: null },
  { id: "star", label: "Star", group: "Basic", ratio: 1 },
  { id: "scallop-rect", label: "Scalloped card", group: "Scrapbook", ratio: null },
  { id: "scallop-circle", label: "Scalloped circle", group: "Scrapbook", ratio: 1 },
  { id: "wavy", label: "Wavy", group: "Scrapbook", ratio: null },
  { id: "blob", label: "Organic", group: "Scrapbook", ratio: null },
  { id: "torn", label: "Torn paper", group: "Scrapbook", ratio: null },
  { id: "ticket", label: "Ticket", group: "Labels", ratio: null },
  { id: "tag", label: "Tag", group: "Labels", ratio: null },
  { id: "label", label: "Label", group: "Labels", ratio: null },
  { id: "banner", label: "Ribbon banner", group: "Labels", ratio: null },
  { id: "bubble", label: "Speech bubble", group: "Labels", ratio: null },
] as const;
export type DecorShape = typeof decorShapes[number]["id"];
export const isDecorShape = (v: unknown): v is DecorShape => decorShapes.some((s) => s.id === v);
/** Shapes whose corner radius can be adjusted. */
export const radiusShapes: DecorShape[] = ["rounded", "rect", "square", "label", "bubble", "ticket"];
/** Shapes that need the even-odd rule (a hole punched through: the tag's eyelet). */
export const evenOddShapes: DecorShape[] = ["tag"];

const f = (v: number) => Math.round(v * 100) / 100;
/** A small deterministic random sequence, so a torn or organic edge never changes between renders or devices. */
function rng(seed: number) { let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function roundedRect(w: number, h: number, r: number): string {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  if (!k) return `M0 0H${f(w)}V${f(h)}H0Z`;
  return `M${f(k)} 0H${f(w - k)}Q${f(w)} 0 ${f(w)} ${f(k)}V${f(h - k)}Q${f(w)} ${f(h)} ${f(w - k)} ${f(h)}H${f(k)}Q0 ${f(h)} 0 ${f(h - k)}V${f(k)}Q0 0 ${f(k)} 0Z`;
}
/** Bumps of roughly equal size along each side of a rectangle (a scalloped card). */
function scallopRect(w: number, h: number): string {
  const target = Math.max(18, Math.min(w, h) / 9), nx = Math.max(3, Math.round(w / target)), ny = Math.max(3, Math.round(h / target));
  const sx = w / nx, sy = h / ny, d = Math.min(sx, sy) * 0.45;
  let p = `M0 0`;
  for (let i = 0; i < nx; i++) p += `Q${f(sx * i + sx / 2)} ${f(-d)} ${f(sx * (i + 1))} 0`;
  for (let i = 0; i < ny; i++) p += `Q${f(w + d)} ${f(sy * i + sy / 2)} ${f(w)} ${f(sy * (i + 1))}`;
  for (let i = nx; i > 0; i--) p += `Q${f(sx * i - sx / 2)} ${f(h + d)} ${f(sx * (i - 1))} ${f(h)}`;
  for (let i = ny; i > 0; i--) p += `Q${f(-d)} ${f(sy * i - sy / 2)} 0 ${f(sy * (i - 1))}`;
  return p + "Z";
}
function scallopCircle(w: number, h: number): string {
  const n = 18, cx = w / 2, cy = h / 2, rx = w / 2 * 0.9, ry = h / 2 * 0.9, bx = w / 2, by = h / 2;
  let p = "";
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2, x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
    if (i === 0) { p = `M${f(x)} ${f(y)}`; continue; }
    const m = a - Math.PI / n, qx = cx + bx * Math.cos(m), qy = cy + by * Math.sin(m);
    p += `Q${f(qx)} ${f(qy)} ${f(x)} ${f(y)}`;
  }
  return p + "Z";
}
/** A rectangle whose top and bottom edges ripple gently. */
function wavy(w: number, h: number): string {
  const n = Math.max(3, Math.round(w / Math.max(40, h / 3))), s = w / n, a = Math.min(h * 0.06, s * 0.35);
  let p = `M0 ${f(a)}`;
  for (let i = 0; i < n; i++) p += `Q${f(s * i + s / 4)} ${f(i % 2 ? 2 * a : 0)} ${f(s * i + s / 2)} ${f(a)}T${f(s * (i + 1))} ${f(a)}`;
  p += `V${f(h - a)}`;
  for (let i = n; i > 0; i--) p += `Q${f(s * i - s / 4)} ${f(i % 2 ? h : h - 2 * a)} ${f(s * i - s / 2)} ${f(h - a)}T${f(s * (i - 1))} ${f(h - a)}`;
  return p + "Z";
}
/** A soft pebble: a closed loop through gently varied radii (deterministic from the size). */
function blob(w: number, h: number, seed: number): string {
  const n = 8, r = rng(seed), cx = w / 2, cy = h / 2, pts: [number, number][] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = 0.82 + r() * 0.18; pts.push([cx + (w / 2) * k * Math.cos(a), cy + (h / 2) * k * Math.sin(a)]); }
  // Catmull-Rom through the points, as cubic Béziers.
  let p = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    p += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return p + "Z";
}
/** Paper torn along every edge: short irregular steps, deterministic from the size. */
function torn(w: number, h: number, seed: number): string {
  const r = rng(seed), j = Math.max(2, Math.min(w, h) * 0.025), step = Math.max(8, Math.min(w, h) / 22);
  const edge = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / step));
    let s = "";
    for (let i = 1; i <= n; i++) { const t = i / n, o = i === n ? 0 : (r() - 0.35) * j; s += `L${f(x0 + (x1 - x0) * t + nx * o)} ${f(y0 + (y1 - y0) * t + ny * o)}`; }
    return s;
  };
  return `M0 0${edge(0, 0, w, 0, 0, 1)}${edge(w, 0, w, h, -1, 0)}${edge(w, h, 0, h, 0, -1)}${edge(0, h, 0, 0, 1, 0)}Z`;
}
/** An admit-one ticket: rounded corners and a half-circle notch on each short side. */
function ticket(w: number, h: number, r: number): string {
  const k = Math.min(r || h * 0.08, w / 4, h / 4), n = Math.min(h * 0.16, w * 0.08), c = h / 2;
  return `M${f(k)} 0H${f(w - k)}Q${f(w)} 0 ${f(w)} ${f(k)}V${f(c - n)}A${f(n)} ${f(n)} 0 0 0 ${f(w)} ${f(c + n)}V${f(h - k)}Q${f(w)} ${f(h)} ${f(w - k)} ${f(h)}H${f(k)}Q0 ${f(h)} 0 ${f(h - k)}V${f(c + n)}A${f(n)} ${f(n)} 0 0 0 0 ${f(c - n)}V${f(k)}Q0 0 ${f(k)} 0Z`;
}
/** A gift tag: a pointed left end with a punched eyelet (even-odd hole). */
function tag(w: number, h: number): string {
  const p = Math.min(w * 0.22, h * 0.6), r = Math.min(h, p) * 0.13, ex = p * 0.55, k = Math.min(h * 0.12, 16);
  return `M${f(p)} 0H${f(w - k)}Q${f(w)} 0 ${f(w)} ${f(k)}V${f(h - k)}Q${f(w)} ${f(h)} ${f(w - k)} ${f(h)}H${f(p)}L0 ${f(h / 2)}Z`
    + `M${f(ex + r)} ${f(h / 2)}A${f(r)} ${f(r)} 0 1 0 ${f(ex - r)} ${f(h / 2)}A${f(r)} ${f(r)} 0 1 0 ${f(ex + r)} ${f(h / 2)}Z`;
}
/** A label with inward-curved corners (an apothecary label). */
function label(w: number, h: number, r: number): string {
  const k = Math.min(r || Math.min(w, h) * 0.18, w / 3, h / 3);
  return `M${f(k)} 0H${f(w - k)}A${f(k)} ${f(k)} 0 0 0 ${f(w)} ${f(k)}V${f(h - k)}A${f(k)} ${f(k)} 0 0 0 ${f(w - k)} ${f(h)}H${f(k)}A${f(k)} ${f(k)} 0 0 0 0 ${f(h - k)}V${f(k)}A${f(k)} ${f(k)} 0 0 0 ${f(k)} 0Z`;
}
/** A ribbon banner with swallow-tail ends. */
function banner(w: number, h: number): string {
  const t = Math.min(w * 0.12, h * 0.9), n = t * 0.55;
  return `M0 0H${f(w)}L${f(w - n)} ${f(h / 2)}L${f(w)} ${f(h)}H0L${f(n)} ${f(h / 2)}Z`;
}
/** A rounded speech bubble with a tail at the lower left. */
function bubble(w: number, h: number, r: number): string {
  const bh = h * 0.8, k = Math.min(r || Math.min(w, bh) * 0.22, w / 2, bh / 2), tx = w * 0.22;
  return `M${f(k)} 0H${f(w - k)}Q${f(w)} 0 ${f(w)} ${f(k)}V${f(bh - k)}Q${f(w)} ${f(bh)} ${f(w - k)} ${f(bh)}H${f(tx + w * 0.12)}L${f(tx - w * 0.04)} ${f(h)}L${f(tx)} ${f(bh)}H${f(k)}Q0 ${f(bh)} 0 ${f(bh - k)}V${f(k)}Q0 0 ${f(k)} 0Z`;
}

/** SVG path data (in w×h units) for any shape. `radius` applies where it means something; `seed` keeps edges stable. */
export function decorPath(shape: DecorShape | CropShape, w: number, h: number, radius = 0, seed = 0): string {
  switch (shape) {
    case "rounded": return roundedRect(w, h, radius || Math.min(w, h) * 0.12);
    case "rect": case "square": return radius ? roundedRect(w, h, radius) : `M0 0H${f(w)}V${f(h)}H0Z`;
    case "scallop-rect": return scallopRect(w, h);
    case "scallop-circle": return scallopCircle(w, h);
    case "wavy": return wavy(w, h);
    case "blob": return blob(w, h, seed || w * 7 + h * 13);
    case "torn": return torn(w, h, seed || w * 11 + h * 3);
    case "ticket": return ticket(w, h, radius);
    case "tag": return tag(w, h);
    case "label": return label(w, h, radius);
    case "banner": return banner(w, h);
    case "bubble": return bubble(w, h, radius);
    default: return scalePath(shapePaths[shape as CropShape] ?? shapePaths.rect, w, h);
  }
}
/** A stable per-element seed (from its id), so a torn edge looks the same everywhere it's drawn. */
export const seedOf = (id: string) => [...id].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 100000, 7);
