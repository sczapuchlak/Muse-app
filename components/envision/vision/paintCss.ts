import { customGradientCss } from "@/lib/appearance-values";
import { libraryItem } from "@/lib/vision-boards/library";
import type { Paint } from "@/lib/vision-boards/paint";

/** A paint as a CSS background, for swatches and previews in the editor's controls. */
export function paintCss(p: Paint | undefined): string {
  if (!p) return "transparent";
  if (p.kind === "solid") return p.color;
  if (p.kind === "gradient") return customGradientCss(p.gradient);
  const item = p.pattern.source === "builtin" ? libraryItem(p.pattern.id) : undefined;
  return item ? `${p.base ?? "transparent"} url("${item.thumb}") center/${item.tileable ? "40px" : "cover"} ${item.tileable ? "repeat" : "no-repeat"}` : p.base ?? "#e9e2f2";
}
