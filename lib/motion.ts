import type { CSSProperties } from "react";

export const motion = { press: 120, hover: 180, success: 560, orbital: 580, celebration: 950, shimmer: 14000, drift: 32000 } as const;
export const motionTokens = Object.fromEntries(Object.entries(motion).map(([name, value]) => [`--motion-${name}`, `${value}ms`])) as CSSProperties;
