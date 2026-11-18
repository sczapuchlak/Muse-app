import type { MuseIconName } from "@/components/MuseIcon";
import { hiddenNavIds } from "@/lib/module-visibility";

export type NavGroup = "Everyday" | "Life" | "Whimsy" | "Tools";
/** `matches` lists other routes owned by the same destination (for example, Fortune & Fun's fortunes view). */
export type NavItem = { id: string; label: string; href: string; icon: MuseIconName; group: NavGroup; description: string; matches?: string[] };
/** Every destination, including ones hidden for now (lib/module-visibility.ts). */
export const allDestinations: NavItem[] = [
  { id: "daily", label: "Daily Edit", href: "/", icon: "home", group: "Everyday", description: "Your day, thoughtfully together." },
  { id: "planner", label: "Planner", href: "/planner", icon: "calendar", group: "Everyday", description: "A home for your plans, tasks, and events." },
  { id: "rituals", label: "Rituals", href: "/rituals", icon: "flame", group: "Everyday", description: "Small rhythms that make a day your own." },
  { id: "journal", label: "Journal", href: "/journal", icon: "journal", group: "Everyday", description: "A place to think out loud: conversations that remember, and an archive you can search." },
  { id: "nourish", label: "Wellness", href: "/nourish", icon: "heart-pulse", group: "Everyday", description: "Take care of yourself. You've got places to be." },
  { id: "insights", label: "Insights", href: "/insights", icon: "chart", group: "Everyday", description: "A place to explore your patterns over time." },
  { id: "envision", label: "Envision", href: "/envision", icon: "envision", group: "Life", description: "A home for the life you're imagining: aspirations, Visions (boards and books) and your bucket list." },
  { id: "money", label: "Money", href: "/money", icon: "money", group: "Life", description: "A calmer view of your everyday finances." },
  { id: "notes", label: "Mindspace", href: "/notes", icon: "brain", group: "Life", description: "Somewhere for the thoughts you want to keep." },
  { id: "collections", label: "Books", href: "/collections", icon: "bookshelf", group: "Life", description: "Your reading life: what you're reading, your library and your Atlas." },
  { id: "astrology", label: "Astrology", href: "/whimsy/observatory", icon: "orbit", group: "Whimsy", description: "Your little corner of the cosmos." },
  { id: "tarot", label: "Tarot", href: "/whimsy/tarot", icon: "tarot", group: "Whimsy", description: "Cards, questions, and your own meanings." },
  { id: "dreams", label: "Dreams", href: "/whimsy/dreamscapes", icon: "dreams", group: "Whimsy", description: "Remember the worlds you visited in your sleep." },
  { id: "fortune-fun", label: "Fortune & Fun", href: "/whimsy/side-quests", matches: ["/whimsy/fortunes"], icon: "wand", group: "Whimsy", description: "Small adventures, curiosities, and a little delightful nonsense." },
  { id: "stream", label: "Stream", href: "/stream", icon: "sparkle", group: "Tools", description: "Little moments from your friends, in order. Optional and private first." },
  { id: "profile", label: "My Profile", href: "/profile", matches: ["/friends", "/people"], icon: "people", group: "Tools", description: "Your little museum: profile, Showcases and friends." },
  { id: "appearance", label: "Appearance", href: "/appearance", icon: "appearance", group: "Tools", description: "Make Muse feel like you. Use the global theme control for quick theme and glass choices." },
  { id: "settings", label: "Settings", href: "/settings", icon: "gear", group: "Tools", description: "Your preferences will live here." },
];

/** The destinations shown in navigation: hidden modules keep their routes but aren't offered. */
export const navigation: NavItem[] = allDestinations.filter((item) => !hiddenNavIds.has(item.id));
export const desktopGroups = ["Everyday", "Life", "Whimsy"] as const;
export const mobilePrimaryIds = ["daily", "planner", "journal"];
export const mobileMoreIds = (["rituals", "nourish", "insights", "envision", "money", "notes", "collections", "astrology", "tarot", "dreams", "fortune-fun", "stream", "profile", "appearance", "settings"] as string[]).filter((id) => !hiddenNavIds.has(id));
export function navItems(ids: string[]): NavItem[] { return ids.map((id) => navigation.find((item) => item.id === id)).filter((item): item is NavItem => Boolean(item)); }
export function isActiveDestination(path: string, href: string): boolean { return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`); }
export function isActiveItem(path: string, item: Pick<NavItem, "href" | "matches">): boolean { return [item.href, ...(item.matches ?? [])].some((href) => isActiveDestination(path, href)); }
