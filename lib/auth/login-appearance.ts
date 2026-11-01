import {isThemeId,type ThemeId} from '../themes';
import {THEME_STORAGE_KEY} from '../theme-preference';

/** Entry-only fallback. Never saves a choice or changes the application's default. */
export const serverLoginTheme=():ThemeId=>'disco-damage';
export function readLoginTheme():ThemeId {
  try {
    const saved=window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(saved)?saved:serverLoginTheme();
  } catch { return serverLoginTheme(); }
}
