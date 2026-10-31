/** Registry metadata; all visual tokens live in app/themes.css. */
export const themes = [
  { id: "iridescent", name: "Glitter!", subtitle: "Light, pastel, and a little magical.", mode: "light", preview: "linear-gradient(135deg, #05b8d2, #8138d6, #d93691)" },
  { id: "astral", name: "Midnight Ballerina!", subtitle: "Midnight blues and ocean dreams.", mode: "dark", preview: "linear-gradient(135deg, #080d20, #327dff, #17eaff, #9c64ff)" },
  { id: "nightbloom", name: "Pretty Toxic!", subtitle: "Forest berries with a poisonous little twist.", mode: "dark", preview: "linear-gradient(135deg, #071c22, #00d5a0, #05d2d5, #ff408f)" },
  { id: "solstice", name: "Sunburnt & Sinful!", subtitle: "All-day sunshine. All-day trouble.", mode: "light", preview: "linear-gradient(135deg, #fff5eb, #e79279, #c83480, #0aa5b5)" },
  { id: "prism-noir", name: "Curses!", subtitle: "A little witchcraft. A lot of hexes.", mode: "dark", preview: "linear-gradient(135deg, #08070f, #745df4, #ed5ab9, #508dff)" },
  { id: "afterglow", name: "Neon Hangover!", subtitle: "Soft pastels for when the neon gets too loud.", mode: "dark", preview: "linear-gradient(135deg, #0d0e11, #29efff, #cd78ff, #ff3eaf)" },
  { id: "issya-bday", name: "ISSYA BDAY!", family:"birthday", variant:"Frosting", subtitle: "Sweet frosting and a little birthday magic.", mode: "light", preview: "radial-gradient(circle at 25% 28%,#ff1599 0 13%,transparent 14%),radial-gradient(circle at 73% 72%,#a2e600 0 14%,transparent 15%),linear-gradient(130deg,#fffefd 30%,#00cfe8 49%,#fffefd 63%,#ff7621)" },
  { id: "issya-bday-xxx", name: "ISSYA BDAY XXX!", family:"birthday", variant:"After Hours", subtitle: "After hours, when the party gets a little wild.", mode: "dark", preview: "radial-gradient(circle at 25% 28%,#ff1599 0 13%,transparent 14%),radial-gradient(circle at 73% 72%,#a2e600 0 14%,transparent 15%),linear-gradient(130deg,#030304 30%,#00cfe8 49%,#030304 63%,#ff7621)" },
  { id: "disco-damage", name: "Disco Damage XXXTRA!", subtitle: "LFG. It's party time!", mode: "dark", preview: "conic-gradient(from 40deg,#050507 0 55%,#00eeff 61%,#c6ff00 66%,#f6f7f8 69%,#9d59ff 73%,#ff159b 79%,#ff711c 84%,#050507 90%)" },
] as const;

export type ThemeId = typeof themes[number]["id"];
export const defaultTheme = themes[0];
export function isThemeId(value: string | null): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}
