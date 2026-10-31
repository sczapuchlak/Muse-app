import type { MuseIconName } from "@/components/MuseIcon";

export type NavItem = { id: string; label: string; href: string; icon: MuseIconName; group: "Everyday" | "Reflect" | "Life" | "Tools"; description: string };
export const navigation: NavItem[] = [
  { id: "daily", label: "Daily Edit", href: "/", icon: "home", group: "Everyday", description: "Your day, thoughtfully together." },
  { id: "planner", label: "Planner", href: "/planner", icon: "calendar", group: "Everyday", description: "A home for your plans, tasks, and events." },
  { id: "rituals", label: "Rituals", href: "/rituals", icon: "rituals", group: "Everyday", description: "Small rhythms that make a day your own." },
  { id: "nourish", label: "Nourish", href: "/nourish", icon: "meals", group: "Everyday", description: "Meal planning with room for what you love." },
  { id: "mood", label: "Mood", href: "/mood", icon: "mood", group: "Reflect", description: "A little more room to understand what you feel." },
  { id: "insights", label: "Insights", href: "/insights", icon: "insights", group: "Reflect", description: "A place to explore your patterns over time." },
  { id: "money", label: "Money", href: "/money", icon: "money", group: "Life", description: "A calmer view of your everyday finances." },
  { id: "notes", label: "Notes", href: "/notes", icon: "notes", group: "Life", description: "Somewhere for the thoughts you want to keep." },
  { id: "whimsy", label: "Whimsy", href: "/whimsy", icon: "sparkle", group: "Life", description: "A little wonder belongs here." },
  { id: "appearance", label: "Appearance", href: "/appearance", icon: "appearance", group: "Tools", description: "Make Muse feel like you. Use the global theme control for quick theme and glass choices." },
  { id: "settings", label: "Settings", href: "/settings", icon: "settings", group: "Tools", description: "Your preferences will live here." },
];

export const desktopGroups = ["Everyday", "Reflect", "Life"] as const;
export const mobilePrimaryIds = ["daily", "planner", "rituals"];
export const mobileMoreIds = ["mood", "nourish", "insights", "money", "notes", "whimsy", "appearance", "settings"];
export function navItems(ids: string[]): NavItem[] { return ids.map((id) => navigation.find((item) => item.id === id)).filter((item): item is NavItem => Boolean(item)); }
export function isActiveDestination(path: string, href: string): boolean { return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`); }
