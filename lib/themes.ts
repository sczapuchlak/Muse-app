/** Registry metadata; all visual tokens live in app/themes.css. */
export const themes = [
  { id: "iridescent", name: "Iridescent", mode: "light", preview: "linear-gradient(135deg, #05b8d2, #8138d6, #d93691)" },
  { id: "astral", name: "Astral", mode: "dark", preview: "linear-gradient(135deg, #080d20, #327dff, #17eaff, #9c64ff)" },
  { id: "nightbloom", name: "Nightbloom", mode: "dark", preview: "linear-gradient(135deg, #071c22, #00d5a0, #05d2d5, #ff408f)" },
  { id: "solstice", name: "Solstice", mode: "light", preview: "linear-gradient(135deg, #fff5eb, #e79279, #c83480, #0aa5b5)" },
  { id: "prism-noir", name: "Prism Noir", mode: "dark", preview: "linear-gradient(135deg, #08070f, #745df4, #ed5ab9, #508dff)" },
  { id: "afterglow", name: "Afterglow", mode: "dark", preview: "linear-gradient(135deg, #0d0e11, #29efff, #cd78ff, #ff3eaf)" },
] as const;

export type ThemeId = typeof themes[number]["id"];
export const defaultTheme = themes[0];
export function isThemeId(value: string | null): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}
