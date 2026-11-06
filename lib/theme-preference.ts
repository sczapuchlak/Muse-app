import { defaultTheme, isThemeId, type ThemeId } from "./themes";

export const THEME_STORAGE_KEY = "muse.theme";
const themeEvent = "muse-theme-change";
let sessionTheme: ThemeId | null = null;

export function readThemePreference(): ThemeId {
  if (sessionTheme) return sessionTheme;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : defaultTheme.id;
  } catch {
    return defaultTheme.id;
  }
}

export const serverThemePreference = () => defaultTheme.id;

export function subscribeThemePreference(update: () => void) {
  function storageChanged(event: StorageEvent) {
    if (event.key === THEME_STORAGE_KEY || event.key === null) { sessionTheme = null; update(); }
  }
  window.addEventListener("storage", storageChanged);
  window.addEventListener(themeEvent, update);
  return () => { window.removeEventListener("storage", storageChanged); window.removeEventListener(themeEvent, update); };
}

/** The applied Theme Atelier remix (if any) lives beside the base theme id; see lib/atelier/applied.ts. */
export const ATELIER_STORAGE_KEY = "muse.theme.atelier";
export const ATELIER_EVENT = "muse-atelier-change";

/** Choosing an official theme also leaves any applied Theme Atelier remix. */
export function selectTheme(id: ThemeId, {keepAtelier = false}: {keepAtelier?: boolean} = {}) {
  sessionTheme = id;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, id);
    if (!keepAtelier && window.localStorage.getItem(ATELIER_STORAGE_KEY) !== null) { window.localStorage.removeItem(ATELIER_STORAGE_KEY); window.dispatchEvent(new Event(ATELIER_EVENT)); }
  } catch { /* Still usable when storage is unavailable. */ }
  window.dispatchEvent(new Event(themeEvent));
}
