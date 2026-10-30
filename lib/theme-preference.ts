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

export function selectTheme(id: ThemeId) {
  sessionTheme = id;
  try { window.localStorage.setItem(THEME_STORAGE_KEY, id); } catch { /* Still usable when storage is unavailable. */ }
  window.dispatchEvent(new Event(themeEvent));
}
