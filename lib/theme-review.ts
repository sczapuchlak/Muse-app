import { allThemes, type ThemeId } from "./themes";
import { readThemePreference, selectTheme } from "./theme-preference";

/**
 * Theme review (#111): a temporary, per-tab session for comparing the renovated and new themes on real Muse screens.
 * It only switches the normal theme preference; ending the review restores the theme you had before.
 */
export const REVIEW_THEME_IDS = ["prism-noir", "nightbloom", "astral", "dreamstorm-lab", "bubblegum-baby", "hot-summer-nights", "booze-pinata", "northern-lights-out"] as const satisfies readonly ThemeId[];
export const reviewScreens = [
  { id: "future-log", label: "Future Log", href: "/planner?view=agenda", agendaView: "year" },
  { id: "daily", label: "Daily Edit", href: "/" },
  { id: "tasks", label: "Tasks", href: "/planner?view=tasks" },
  { id: "week", label: "Week", href: "/planner?view=agenda", agendaView: "week" },
  { id: "mindspace", label: "Mindspace", href: "/notes" },
  { id: "collections", label: "Collections", href: "/collections" },
  { id: "settings", label: "Settings", href: "/settings" },
] as const;

const KEY = "muse.theme-review", EVENT = "muse-theme-review";
type Session = { returnTo: ThemeId };
let cachedRaw: string | null | undefined, cached: Session | null = null;

export function readReview(): Session | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw !== cachedRaw) { cachedRaw = raw; const parsed = raw ? JSON.parse(raw) : null; cached = parsed && allThemes.some((t) => t.id === parsed.returnTo) ? parsed : null; }
    return cached;
  } catch { return null; }
}
export const serverReview = () => null;
export function subscribeReview(update: () => void) { window.addEventListener(EVENT, update); return () => window.removeEventListener(EVENT, update); }
const emit = () => window.dispatchEvent(new Event(EVENT));

export function startReview(first: ThemeId = REVIEW_THEME_IDS[0]) {
  try { if (!readReview()) window.sessionStorage.setItem(KEY, JSON.stringify({ returnTo: readThemePreference() })); } catch { /* review still works for this page */ }
  selectTheme(first); emit();
}
export function endReview() {
  const session = readReview();
  try { window.sessionStorage.removeItem(KEY); } catch { /* nothing to clear */ }
  if (session) selectTheme(session.returnTo);
  emit();
}
/** Keep the theme you're looking at: the review ends without restoring the earlier one. */
export function keepReviewedTheme() { try { window.sessionStorage.removeItem(KEY); } catch { /* nothing to clear */ } emit(); }
export function stepReview(current: string, by: 1 | -1): ThemeId {
  const i = REVIEW_THEME_IDS.indexOf(current as typeof REVIEW_THEME_IDS[number]);
  return REVIEW_THEME_IDS[(i < 0 ? 0 : i + by + REVIEW_THEME_IDS.length) % REVIEW_THEME_IDS.length];
}
/** Opens the Agenda on the requested view (the Agenda keeps its view per browser). */
export function prepareScreen(agendaView?: string) {
  if (!agendaView) return;
  try { const key = "muse.planner.agenda", prefs = JSON.parse(window.localStorage.getItem(key) ?? "{}"); window.localStorage.setItem(key, JSON.stringify({ ...prefs, view: agendaView })); } catch { /* the Agenda opens on its last view */ }
}
