/** Registry metadata; all visual tokens live in app/themes.css. */
export const themes = [
  { id: "iridescent", name: "Glitter!", subtitle: "Light, pastel, and a little magical.", mode: "light", preview: "linear-gradient(135deg, #05b8d2, #8138d6, #d93691)" },
  { id: "astral", name: "Midnight Ballerina!", subtitle: "A glowing pastel cloud in a midnight-navy sky.", mode: "dark", preview: "linear-gradient(135deg, #08122e 0%, #08122e 30%, #2fb8d0 52%, #b79cff 70%, #ff6fb5 86%, #e4f7fb 100%)" },
  { id: "nightbloom", name: "Pretty Toxic!", subtitle: "Poisoned pomegranates in a midnight garden.", mode: "dark", preview: "linear-gradient(135deg, #13090c, #4b0b1b, #c42647, #153d2c, #f36b9b)" },
  { id: "solstice", name: "Sunburnt & Sinful!", subtitle: "All-day sunshine. All-day trouble.", mode: "light", preview: "linear-gradient(135deg, #fff5eb, #e79279, #c83480, #0aa5b5)" },
  { id: "prism-noir", name: "Curses!", subtitle: "A little witchcraft. A lot of hexes.", mode: "dark", preview: "linear-gradient(135deg, #07040f, #4712c4, #ffdefd, #2dd4bf, #c6ff34)" },
  { id: "afterglow", name: "Neon Hangover!", subtitle: "Soft pastels for when the neon gets too loud.", mode: "dark", preview: "linear-gradient(135deg, #0d0e11, #29efff, #cd78ff, #ff3eaf)" },
  { id: "issya-bday", name: "ISSYA BDAY!", family:"birthday", variant:"Frosting", subtitle: "Sweet frosting and a little birthday magic.", mode: "light", preview: "radial-gradient(circle at 25% 28%,#ff1599 0 13%,transparent 14%),radial-gradient(circle at 73% 72%,#a2e600 0 14%,transparent 15%),linear-gradient(130deg,#fffefd 30%,#00cfe8 49%,#fffefd 63%,#ff7621)" },
  { id: "issya-bday-xxx", name: "ISSYA BDAY XXX!", family:"birthday", variant:"After Hours", subtitle: "After hours, when the party gets a little wild.", mode: "dark", preview: "radial-gradient(circle at 25% 28%,#ff1599 0 13%,transparent 14%),radial-gradient(circle at 73% 72%,#a2e600 0 14%,transparent 15%),linear-gradient(130deg,#030304 30%,#00cfe8 49%,#030304 63%,#ff7621)" },
  { id: "disco-damage", name: "Disco Damage XXXTRA!", subtitle: "LFG. It's party time!", mode: "dark", preview: "conic-gradient(from 40deg,#050507 0 55%,#00eeff 61%,#c6ff00 66%,#f6f7f8 69%,#9d59ff 73%,#ff159b 79%,#ff711c 84%,#050507 90%)" },
  { id: "bubblegum-baby", name: "Malibu Mugshot!", subtitle: "Glossy Barbie-pink glass with a little cyan trouble.", mode: "light", preview: "linear-gradient(135deg, #ffcfe7, #ff369b, #fe006f, #8cf4f3, #29fe8c)" },
  { id: "hot-summer-nights", name: "Hot Summer Nights!", subtitle: "Rooftop after sunset: navy, plum, coral and gold.", mode: "dark", preview: "linear-gradient(180deg, #0a1260, #5a1458, #f0323c, #ff6e28, #ffb52e)" },
  { id: "booze-pinata", name: "Booze Piñata!", subtitle: "A tropical cocktail party that got slightly out of hand.", mode: "dark", preview: "radial-gradient(circle at 22% 30%,#ff2d8d 0 22%,transparent 23%),radial-gradient(circle at 70% 60%,#7cff00 0 12%,#00e5ff 13% 24%,transparent 25%),radial-gradient(circle at 88% 18%,#ffd600 0 10%,#ff9a00 11% 18%,transparent 19%),#050507" },
  { id: "northern-lights-out", name: "Northern Lights Out!", subtitle: "Electric ribbons of cyan, emerald, violet and pink over a dark forest.", mode: "dark", preview: "linear-gradient(135deg, #2838eb, #3cebaa, #a03cff, #ff64d2, #aae650)" },
] as const;

/**
 * Theme Lab (#111): palettes still under review. They never appear in the regular theme pickers (which list `themes`),
 * only in Appearance → Theme review. `variantOf` marks an alternate direction for an existing theme: if chosen, its
 * tokens move onto the original id and name, and the lab entry is removed. Nothing here renames an existing theme.
 */
export const themeExperiments = [
  { id: "dreamstorm-lab", variantOf: "astral", name: "Midnight Ballerina!", direction: "Dreamstorm (alternate direction)", subtitle: "Midnight indigo with pastel pink, lilac, peach and luminous blue.", mode: "dark", preview: "linear-gradient(135deg, #090e24, #273d76, #75c9f2, #d6a3ec, #f6a6bd, #ffc7a1)" },
] as const;

/** Every theme Muse can render: the official list plus Theme Lab palettes. */
export const allThemes = [...themes, ...themeExperiments] as const;
export type ThemeId = typeof allThemes[number]["id"];
export type OfficialThemeId = typeof themes[number]["id"];
export const defaultTheme = themes[0];
export function isThemeId(value: string | null): value is ThemeId {
  return allThemes.some((theme) => theme.id === value);
}
export const isExperimentalTheme = (id: string | null) => themeExperiments.some((theme) => theme.id === id);
/** The display entry for any theme id (a lab palette shows its eventual name). */
export const themeEntry = (id: string | null) => allThemes.find((theme) => theme.id === id) ?? defaultTheme;
