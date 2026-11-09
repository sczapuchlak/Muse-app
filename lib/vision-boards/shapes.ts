/**
 * Vision Boards (#118): the preset crop shapes and the decorative stickers. Shapes are SVG path data in a unit box
 * (0–1), so the canvas, the crop preview and any CSS clip-path draw exactly the same outline at any size.
 */
import { MUSE_STAR_PATH } from "@/components/MuseStar";

export const cropShapes = [
  { id: "rect", label: "Rectangle", ratio: null },
  { id: "square", label: "Square", ratio: 1 },
  { id: "circle", label: "Circle", ratio: 1 },
  { id: "oval", label: "Oval", ratio: null },
  { id: "arch", label: "Arch", ratio: null },
  { id: "heart", label: "Heart", ratio: null },
  { id: "star", label: "Star", ratio: 1 },
] as const;
export type CropShape = typeof cropShapes[number]["id"];
export const isCropShape = (v: unknown): v is CropShape => cropShapes.some((s) => s.id === v);

const k = 0.5523; // circle-by-Béziers constant
const ellipse = `M0.5 0C${0.5 + k / 2} 0 1 ${0.5 - k / 2} 1 0.5C1 ${0.5 + k / 2} ${0.5 + k / 2} 1 0.5 1C${0.5 - k / 2} 1 0 ${0.5 + k / 2} 0 0.5C0 ${0.5 - k / 2} ${0.5 - k / 2} 0 0.5 0Z`;
/** A five-point star touching the unit box. */
function starPath(points = 5, inner = 0.42): string {
  const out: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner * 0.5 : 0.5, a = -Math.PI / 2 + (i * Math.PI) / points;
    out.push(`${(0.5 + r * Math.cos(a)).toFixed(4)} ${(0.53 + r * Math.sin(a)).toFixed(4)}`);
  }
  return `M${out.join("L")}Z`;
}
/** Unit-box outline for each crop shape. */
export const shapePaths: Record<CropShape, string> = {
  rect: "M0 0H1V1H0Z",
  square: "M0 0H1V1H0Z",
  circle: ellipse,
  oval: ellipse,
  arch: "M0 1V0.5C0 0.22 0.22 0 0.5 0S1 0.22 1 0.5V1Z",
  heart: "M0.5 0.98C0.2 0.76 0 0.56 0 0.31 0 0.13 0.13 0 0.29 0 0.39 0 0.46 0.05 0.5 0.13 0.54 0.05 0.61 0 0.71 0 0.87 0 1 0.13 1 0.31 1 0.56 0.8 0.76 0.5 0.98Z",
  star: starPath(),
};

// ---------- Stickers ----------
/**
 * Decorative stickers. `fill` stickers are solid shapes; `stroke` stickers are drawn lines. Muse Marks (`mark:<icon>`)
 * are drawn from Muse's own icon set at runtime, so they stay the same symbols people already know from the Planner.
 */
export const stickers = [
  { id: "muse-star", label: "Muse star", mode: "fill", box: [24, 40], d: MUSE_STAR_PATH },
  { id: "sparkle", label: "Sparkle", mode: "fill", box: [24, 24], d: "M12 0C12.9 8 16 11.1 24 12 16 12.9 12.9 16 12 24 11.1 16 8 12.9 0 12 8 11.1 11.1 8 12 0Z" },
  { id: "star", label: "Star", mode: "fill", box: [24, 24], d: "m12 1 3.3 6.9 7.5 1-5.5 5.2 1.4 7.5L12 18l-6.7 3.6 1.4-7.5L1.2 8.9l7.5-1Z" },
  { id: "heart", label: "Heart", mode: "fill", box: [24, 24], d: "M12 22C5 17 1.5 13 1.5 8.5 1.5 5.2 4 2.5 7.3 2.5c2 0 3.6 1 4.7 2.7 1.1-1.7 2.7-2.7 4.7-2.7 3.3 0 5.8 2.7 5.8 6 0 4.5-3.5 8.5-10.5 13.5Z" },
  { id: "moon", label: "Moon", mode: "fill", box: [24, 24], d: "M15 1.5a10.5 10.5 0 1 0 7.5 18A9 9 0 0 1 15 1.5Z" },
  { id: "flower", label: "Flower", mode: "fill", box: [24, 24], d: flowerPath() },
  { id: "burst", label: "Burst", mode: "fill", box: [24, 24], d: burstPath() },
  { id: "circle", label: "Circle", mode: "fill", box: [24, 24], d: "M12 1a11 11 0 1 0 0 22 11 11 0 1 0 0-22Z" },
  { id: "square", label: "Square", mode: "fill", box: [24, 24], d: "M5 1h14a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4V5a4 4 0 0 1 4-4Z" },
  { id: "tape", label: "Washi tape", mode: "fill", box: [60, 16], d: "M0 0h60l-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2 2H0l2-2-2-2 2-2-2-2 2-2-2-2 2-2Z", opacity: 0.72 },
  { id: "arrow", label: "Arrow", mode: "stroke", box: [24, 24], d: "M3 19C7 9 13 6 21 7M16 3l5 4-4.5 4.5" },
  { id: "squiggle", label: "Squiggle", mode: "stroke", box: [28, 12], d: "M2 6c3-4 5-4 6 0s3 4 6 0 3-4 6 0 3 4 6 0" },
  { id: "ring", label: "Ring", mode: "stroke", box: [24, 24], d: "M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20Z" },
  { id: "underline", label: "Underline", mode: "stroke", box: [40, 10], d: "M2 7C12 3 26 2 38 5" },
] as const satisfies readonly { id: string; label: string; mode: "fill" | "stroke"; box: readonly [number, number]; d: string; opacity?: number }[];
export type StickerId = typeof stickers[number]["id"];
export type StickerDef = { id: string; label: string; mode: "fill" | "stroke"; box: readonly [number, number]; d: string; opacity?: number };
export const sticker = (id: string): StickerDef | undefined => stickers.find((s) => s.id === id);

function flowerPath(): string {
  const parts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5, cx = 12 + 6 * Math.cos(a), cy = 12 + 6 * Math.sin(a);
    parts.push(`M${(cx + 5.2).toFixed(2)} ${cy.toFixed(2)}a5.2 5.2 0 1 0-10.4 0 5.2 5.2 0 1 0 10.4 0Z`);
  }
  return parts.join("") + "M15 12a3 3 0 1 0-6 0 3 3 0 1 0 6 0Z";
}
function burstPath(points = 12): string {
  const out: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? 8.2 : 12, a = -Math.PI / 2 + (i * Math.PI) / points;
    out.push(`${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${out.join("L")}Z`;
}

/**
 * A unit-box shape path scaled to a w×h frame. Crop shapes use only absolute commands without arcs (M L H V C S Q Z),
 * so each number is an x or a y in turn (H is always x, V always y).
 */
export function scalePath(d: string, w: number, h: number): string {
  const r = (v: number) => Math.round(v * 100) / 100;
  return d.replace(/([MLHVCSQZ])([^MLHVCSQZ]*)/gi, (_, cmd: string, args: string) => {
    const nums = (args.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number), C = cmd.toUpperCase();
    const scaled = nums.map((v, i) => C === "H" ? r(v * w) : C === "V" ? r(v * h) : i % 2 === 0 ? r(v * w) : r(v * h));
    return `${cmd}${scaled.join(" ")}`;
  });
}
