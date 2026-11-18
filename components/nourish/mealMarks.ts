import type { MuseMarkIcon, MuseTone } from "../design/MuseHeading";
import type { MealSlot } from "@/lib/models";

/** Each meal's gradient tile: its glyph, on the same chart tone as the meal palette (`--b/--l/--d/--s` in Nourish.css). */
export const mealMarks: Record<MealSlot, { icon: MuseMarkIcon; tone: MuseTone }> = {
  breakfast: { icon: "sun", tone: 4 }, lunch: { icon: "leaf", tone: 1 }, dinner: { icon: "crescent", tone: 6 }, snacks: { icon: "cookie", tone: 2 },
};
