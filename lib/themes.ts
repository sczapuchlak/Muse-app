/** Registry metadata; all visual tokens live in app/themes.css. */
export const themes = [
  { id: "iridescent", name: "Glitter!", subtitle: "Light, pastel, and a little magical.", mode: "light", preview: "linear-gradient(135deg, #05b8d2, #8138d6, #d93691)" },
  { id: "astral", name: "Midnight Ballerina!", subtitle: "Midnight aurora: petrol teal, sea glass, cyan and mint.", mode: "dark", preview: "linear-gradient(135deg, #080d20, #183c50, #287b94, #8ce8e8, #9ef5c8)" },
  { id: "nightbloom", name: "Pretty Toxic!", subtitle: "Poisoned pomegranates in a midnight garden.", mode: "dark", preview: "linear-gradient(135deg, #13090c, #4b0b1b, #c42647, #153d2c, #f36b9b)" },
  { id: "solstice", name: "Sunburnt & Sinful!", subtitle: "All-day sunshine. All-day trouble.", mode: "light", preview: "linear-gradient(135deg, #fff5eb, #e79279, #c83480, #0aa5b5)" },
  { id: "prism-noir", name: "Curses!", subtitle: "A little witchcraft. A lot of hexes.", mode: "dark", preview: "linear-gradient(135deg, #100d1d, #482d59, #b08dbd, #f05fb8, #6f7dff)" },
  { id: "afterglow", name: "Neon Hangover!", subtitle: "Soft pastels for when the neon gets too loud.", mode: "dark", preview: "linear-gradient(135deg, #0d0e11, #29efff, #cd78ff, #ff3eaf)" },
  { id: "issya-bday", name: "ISSYA BDAY!", family:"birthday", variant:"Frosting", subtitle: "Sweet frosting and a little birthday magic.", mode: "light", preview: "radial-gradient(circle at 25% 28%,#ff1599 0 13%,transparent 14%),radial-gradient(circle at 73% 72%,#a2e600 0 14%,transparent 15%),linear-gradient(130deg,#fffefd 30%,#00cfe8 49%,#fffefd 63%,#ff7621)" },
  { id: "issya-bday-xxx", name: "ISSYA BDAY XXX!", family:"birthday", variant:"After Hours", subtitle: "After hours, when the party gets a little wild.", mode: "dark", preview: "radial-gradient(circle at 25% 28%,#ff1599 0 13%,transparent 14%),radial-gradient(circle at 73% 72%,#a2e600 0 14%,transparent 15%),linear-gradient(130deg,#030304 30%,#00cfe8 49%,#030304 63%,#ff7621)" },
  { id: "disco-damage", name: "Disco Damage XXXTRA!", subtitle: "LFG. It's party time!", mode: "dark", preview: "conic-gradient(from 40deg,#050507 0 55%,#00eeff 61%,#c6ff00 66%,#f6f7f8 69%,#9d59ff 73%,#ff159b 79%,#ff711c 84%,#050507 90%)" },
  { id: "bubblegum-baby", name: "Bubblegum Baby!", subtitle: "Glossy pink pearl with lilac, aqua and ice-blue shine.", mode: "light", preview: "linear-gradient(135deg, #f5b4d2, #ff3cad, #c77cff, #8ec5ff, #7ffff3)" },
  { id: "hot-summer-nights", name: "Hot Summer Nights!", subtitle: "Rooftop after sunset: navy, plum, coral and gold.", mode: "dark", preview: "linear-gradient(135deg, #142b4f, #2c2a5e, #743b50, #ff703b, #ffb74b)" },
  { id: "booze-pinata", name: "Booze Piñata!", subtitle: "A tropical cocktail party that got slightly out of hand.", mode: "light", preview: "linear-gradient(135deg, #ff2d8d, #ff9a00, #ffd600, #7cff00, #00e5ff, #00b6e6)" },
  { id: "northern-lights-out", name: "Northern Lights Out!", subtitle: "Electric ribbons of cyan, emerald, violet and pink over a dark forest.", mode: "dark", preview: "linear-gradient(135deg, #050a18, #00e6c3, #2fe37a, #7a5cff, #ff4fb8)" },
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
