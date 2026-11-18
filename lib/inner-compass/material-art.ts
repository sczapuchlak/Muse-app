/**
 * Small illustrations for Materials (Inner Compass Experiences): one drawn look per reference-library material, and a
 * look per category for materials the person names themselves. Drawn in code (components/.../MaterialArt.tsx), so they
 * stay crisp at any size, need no image files and carry no licensing questions. Colours describe the material itself
 * (garnet is deep red in every theme), which is why they are fixed hex values rather than theme tokens.
 */
export type ArtShape =
  | "tumbled" | "banded" | "flecked" | "point" | "clear" | "sphere" | "chunk"
  | "leaf" | "sprig" | "spike" | "flower" | "cluster" | "stick" | "star" | "bud" | "root" | "peel" | "grass"
  | "grains" | "candle" | "feather" | "shell" | "scroll" | "heart" | "brush" | "sparkle";
export type ArtLook = { shape: ArtShape; light: string; dark: string; accent?: string };

const L = (shape: ArtShape, light: string, dark: string, accent?: string): ArtLook => ({ shape, light, dark, accent });

export const materialLooks: Record<string, ArtLook> = {
  // Stones and crystals
  amethyst: L("point", "#d2b2f5", "#6b3fa0"), citrine: L("point", "#ffe08a", "#d98b1c"), "rose-quartz": L("tumbled", "#ffdbe3", "#e293a9"),
  "clear-quartz": L("clear", "#ffffff", "#b9cad8"), "smoky-quartz": L("point", "#cdbcaa", "#5b4636"), "tigers-eye": L("banded", "#efbd55", "#7a4a12", "#3d2408"),
  carnelian: L("tumbled", "#ffa066", "#b4380f"), agate: L("banded", "#ecdac8", "#9a6b4f", "#fff6ea"), "moss-agate": L("flecked", "#e6efe2", "#5b8a55", "#2f5a2c"),
  onyx: L("sphere", "#5a5a60", "#0d0d10"), jasper: L("tumbled", "#de7f60", "#7d2b1a"), bloodstone: L("flecked", "#357656", "#123826", "#d02a31"),
  aventurine: L("flecked", "#8fd6a0", "#2e7d4a", "#eaffd8"), jade: L("tumbled", "#a2e3b9", "#2f8a5a"), malachite: L("banded", "#5fd39a", "#0f6b3e", "#0a4a2a"),
  "lapis-lazuli": L("flecked", "#4f6fd6", "#14216b", "#ffd34d"), sodalite: L("banded", "#6f87d6", "#1c2a6b", "#e6ecff"), turquoise: L("flecked", "#86e6d9", "#1f9a8e", "#4a4632"),
  aquamarine: L("point", "#d2f6f8", "#5fbfd0"), moonstone: L("tumbled", "#f6f8ff", "#aab4d6", "#a8d8ff"), labradorite: L("flecked", "#7a8894", "#2b333b", "#53e3ff"),
  sunstone: L("flecked", "#ffc48a", "#d4672a", "#fff2c0"), obsidian: L("tumbled", "#43434f", "#050507"), "black-tourmaline": L("point", "#4a4a4a", "#0b0b0b"),
  hematite: L("sphere", "#d0d3d9", "#3b3e45"), pyrite: L("chunk", "#f3dd8f", "#8a7426"), fluorite: L("point", "#bfa6f3", "#2fae92"),
  selenite: L("clear", "#ffffff", "#d9dee8"), calcite: L("chunk", "#fff3c4", "#e2b03f"), garnet: L("chunk", "#e04866", "#5a0d1c"),
  peridot: L("chunk", "#ddf27a", "#6b9a1c"), opal: L("flecked", "#f6f9ff", "#c8dcff", "#ff9ad6"), amber: L("tumbled", "#ffcb62", "#b4620f"),
  pearl: L("sphere", "#ffffff", "#ddd2c2"), shungite: L("chunk", "#555", "#111"), howlite: L("banded", "#ffffff", "#d0d0d0", "#6b6b6b"),
  // Herbs, flowers and plants
  rosemary: L("sprig", "#86ab80", "#3f6b45", "#a8b8ff"), lavender: L("spike", "#bca6f0", "#6b4fb0"), "bay-leaf": L("leaf", "#93b870", "#3f6b2a"),
  sage: L("leaf", "#bccbad", "#6f8a62"), rose: L("flower", "#ff8fa8", "#c0284f"), cinnamon: L("stick", "#c97f40", "#7a3f14"),
  mint: L("leaf", "#86e391", "#2f9a4a"), chamomile: L("flower", "#ffffff", "#f2c230"), basil: L("leaf", "#86d670", "#2f8a2a"),
  eucalyptus: L("leaf", "#b0cec6", "#5f8a80"), alfalfa: L("sprig", "#80c172", "#3f7a35", "#9a6fd6"), yarrow: L("cluster", "#ffffff", "#e6d2e4"),
  comfrey: L("leaf", "#74a565", "#2f5a2a", "#b48ad6"), mugwort: L("leaf", "#c6d2c2", "#7f927a"), calendula: L("flower", "#ffb347", "#e8701a"),
  jasmine: L("flower", "#ffffff", "#ece6c6"), hibiscus: L("flower", "#ff5a6e", "#a0102e"), "st-johns-wort": L("flower", "#ffe14d", "#e0a10f"),
  thyme: L("sprig", "#a2b892", "#4f6b45", "#e3b6e6"), dandelion: L("flower", "#ffe14d", "#f0a81c"), nettle: L("leaf", "#62a553", "#24572a"),
  "lemon-balm": L("leaf", "#ade57d", "#4f8a2a"), juniper: L("sprig", "#729e7e", "#2f5a45", "#5a6fb0"), patchouli: L("leaf", "#86a660", "#3f5a2a"),
  "star-anise": L("star", "#b8723f", "#5a2a12"), clove: L("bud", "#a3623f", "#4a2414"), ginger: L("root", "#ecc98f", "#b4813f"),
  "orange-peel": L("peel", "#ffa443", "#e0601a"), sunflower: L("flower", "#ffd23f", "#5a3410"), cedar: L("sprig", "#729e6e", "#2f5a35"),
  lemongrass: L("grass", "#d3e391", "#7aa040"), elderflower: L("cluster", "#fffbea", "#e3dab0"), vervain: L("spike", "#c9b3f2", "#7a5ab0"),
  hyssop: L("spike", "#9090f2", "#3f3fb0"), lilac: L("cluster", "#dab5f2", "#9a5ac8"), peony: L("flower", "#ffb3ca", "#e0507a"),
  // Everything else in the library
  salt: L("grains", "#ffffff", "#cdd3db"), "beeswax-candle": L("candle", "#ffd77a", "#d9a23a"), feather: L("feather", "#f3f3f3", "#9aa0aa"), seashell: L("shell", "#ffe8d6", "#e0a08a"),
};

/** A look for a material the person named themselves, from its category. */
export const categoryLooks: Record<string, ArtLook> = {
  stone: L("tumbled", "#d6d1e6", "#6f6890"), botanical: L("leaf", "#9fd38a", "#3f7a35"), candle: L("candle", "#fff1c9", "#d9b25a"),
  paper: L("scroll", "#f6ead2", "#c9a873"), keepsake: L("heart", "#ffb3c6", "#d0476e"), found: L("shell", "#f0e2d2", "#b49478"),
  art: L("brush", "#ffd38a", "#8a5a2a", "#7a5ad6"), other: L("sparkle", "#e6dcff", "#8a6fd6"),
};

export function materialLook(refKey: string | undefined, category: string | undefined): ArtLook {
  return (refKey && materialLooks[refKey]) || categoryLooks[category ?? ""] || categoryLooks.other;
}
