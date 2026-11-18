/**
 * Modules hidden for now (Stephanie, 2026-11-18: "hide the entire Fortunes & Nonsense feature, including Side Quests,
 * for now"). Hiding only removes the invitations into a module: navigation, Daily Edit widgets, Showcase and Stream
 * sources, Whimsy links and Insights tiles. Nothing is deleted. Code, routes, editorial content, saved records and
 * history all stay; anything already shared to a Showcase or the Stream still shows, and direct links still open.
 *
 * This is deliberately one small, app-wide list. It is the seam a later per-person "module visibility" setting will
 * replace; until then, unhiding a module is removing its id here.
 */
export type HideableModule = "fortune-fun";
export const hiddenModules: ReadonlySet<HideableModule> = new Set<HideableModule>(["fortune-fun"]);
export const isHidden = (id: string) => hiddenModules.has(id as HideableModule);

/** What belongs to each hideable module, so every surface can ask one question. */
const parts: Record<HideableModule, { nav: string[]; whimsy: string[]; showcase: string[]; stream: string[]; streamShortcuts: string[] }> = {
  "fortune-fun": { nav: ["fortune-fun"], whimsy: ["fortunes", "side-quests"], showcase: ["side-quest"], stream: ["fortune", "side-quest"], streamShortcuts: ["fortunes", "side-quests"] },
};
const hiddenParts = (key: keyof (typeof parts)[HideableModule]) => new Set([...hiddenModules].flatMap((m) => parts[m][key]));
export const hiddenNavIds = hiddenParts("nav");
/** Whimsy experiences (Daily Edit widgets, the Whimsy overview links). */
export const hiddenWhimsyExperiences = hiddenParts("whimsy");
/** Showcase source kinds that can't be newly added (existing Showcase items still display). */
export const hiddenShowcaseKinds = hiddenParts("showcase");
/** Stream source kinds and composer shortcuts that can't be newly shared (existing posts still display). */
export const hiddenStreamKinds = hiddenParts("stream");
export const hiddenStreamShortcuts = hiddenParts("streamShortcuts");
