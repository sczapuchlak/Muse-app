import type { CSSProperties } from "react";

/**
 * Muse Magic motion tokens (#34). One scale for every interaction so durations are never scattered:
 * press/hover (instant), settle (small state changes), success/orbital (routine completions), celebration
 * (meaningful moments), milestone and scene (rare, always dismissible). Ambient shimmer/drift stay slow.
 */
export const motion = { press: 120, hover: 180, settle: 260, success: 560, orbital: 580, celebration: 950, milestone: 2600, scene: 3600, shimmer: 14000, drift: 32000 } as const;
export const easing = {
  out: "cubic-bezier(.22, 1, .36, 1)",
  spring: "cubic-bezier(.3, 1.45, .5, 1)",
  inOut: "cubic-bezier(.65, 0, .35, 1)",
} as const;
export const motionTokens = {
  ...Object.fromEntries(Object.entries(motion).map(([name, value]) => [`--motion-${name}`, `${value}ms`])),
  ...Object.fromEntries(Object.entries(easing).map(([name, value]) => [`--ease-${name}`, value])),
} as CSSProperties;
