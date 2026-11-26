"use client";
import type { CSSProperties } from "react";
import { accentCss, customGradientCss, isHexColor, pinAccent, type AccentColor } from "@/lib/appearance-values";
import { luminance } from "@/lib/atelier/contrast";
import type { Paint } from "@/lib/planner-customization";
import type { CardData, CardLook } from "@/lib/lists/blocks";

/** CSS for a paint from the shared picker. A left stripe always runs top to bottom so every stop shows. */
export function paintCss(p: Paint, vertical = false) {
  return p.kind === "solid" ? accentCss(p.color) : customGradientCss(vertical ? { ...p.gradient, angle: 180 } : p.gradient);
}
const rgb = (c: AccentColor) => {
  let h: string = c;
  if (!isHexColor(h)) { try { h = pinAccent(c); } catch { return null; } }
  const n = parseInt(h.slice(1), 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
};
/** Average luminance of a paint (gradient stops averaged). */
function paintLuminance(p: Paint) {
  const stops = p.kind === "solid" ? [p.color] : p.gradient.colors.filter(Boolean) as AccentColor[];
  const ls = stops.map(rgb).filter((x): x is NonNullable<ReturnType<typeof rgb>> => !!x).map(luminance);
  return ls.length ? ls.reduce((a, b) => a + b, 0) / ls.length : null;
}

/**
 * Data attributes and CSS variables for a card's look. Text switches to dark or light ink when a strong custom
 * background needs it (contrast from the colour's real luminance); soft tints keep the theme's own text colours.
 */
export function lookAttrs(card: CardData): { [k: `data-${string}`]: string | undefined; style?: CSSProperties } {
  const l: CardLook | undefined = card.look;
  if (!l) return {};
  const strength = l.strength ?? 100, placement = l.border ? l.placement ?? "left" : "none";
  const lum = l.bg && strength >= 55 ? paintLuminance(l.bg) : null;
  const style = {
    ...(l.bg ? { "--card-bg": paintCss(l.bg), "--card-bg-alpha": String(strength / 100) } : {}),
    ...(l.border && placement !== "none" ? { "--card-border": paintCss(l.border, placement === "left") } : {}),
    ...(l.iconBg ? { "--card-icon-bg": paintCss(l.iconBg) } : {}),
  } as CSSProperties;
  return {
    "data-painted": l.bg ? "" : undefined,
    "data-border": placement !== "none" ? placement : undefined,
    "data-ink": lum === null ? undefined : lum > .42 ? "dark" : "light",
    "data-titlestyle": l.title === "editorial" ? "editorial" : undefined,
    style,
  };
}

/**
 * A space's colour as CSS variables: `--list-accent` (a single colour for checkboxes, rings and tints: a gradient's
 * first stop) and `--list-gradient` (the progress bar, the header glow), from its custom paint or its theme accent.
 */
export function spaceVars(list: { accent: AccentColor; paint?: Paint | null }): CSSProperties {
  const p = list.paint;
  if (!p) return { "--list-accent": accentCss(list.accent) } as CSSProperties;
  if (p.kind === "solid") return { "--list-accent": accentCss(p.color), "--list-gradient": `linear-gradient(90deg, ${accentCss(p.color)}, ${accentCss(p.color)})` } as CSSProperties;
  return { "--list-accent": p.gradient.colors[0], "--list-accent-2": p.gradient.colors[1], "--list-gradient": customGradientCss({ ...p.gradient, angle: 90 }) } as CSSProperties;
}
