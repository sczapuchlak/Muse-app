// Shared domain shapes. Daily Edit and future feature modules should reference
// taxonomy IDs, never infer identity from editable display names.
export type MovementType = {
  id: string;
  name: string;
  source: "starter" | "custom";
  archived: boolean;
  /** Strength/cardio/mobility/other. Absent means the starter default (or Other for custom types). */
  category?: "strength" | "cardio" | "mobility" | "other";
};

export type DailyMovement = { date: string; typeIds: string[] };
export type PlannedTask = {
  id: string; kind: "task"; title: string; complete: boolean; completedAt?: string;
  workspaceId: string; groupId?: string; tagIds: string[];
  plannedDate?: string; dueDate?: string; timeSlot?: string;
  notes?: string; detail?: string; estimatedMinutes?: number; actualMinutes: number;
  subtasks: { id: string; title: string; complete: boolean }[];
  recurrence?: { frequency: "daily" | "weekly" | "monthly"; interval: number; until?: string };
  createdAt: string;
};
export type DayEvent = {
  id: string; kind: "event"; title: string; date: string; dateTime: string; time: string; detail?: string;
};
export type ContextTag = { id: string; name: string; archived?:boolean };
export type EmotionQuadrant = "red" | "blue" | "green" | "yellow";

export const moodQuadrants: Record<EmotionQuadrant, {
  label: string; energy: "high" | "low"; pleasantness: "pleasant" | "unpleasant";
}> = {
  red: { label: "Red", energy: "high", pleasantness: "unpleasant" },
  blue: { label: "Blue", energy: "low", pleasantness: "unpleasant" },
  green: { label: "Green", energy: "low", pleasantness: "pleasant" },
  yellow: { label: "Yellow", energy: "high", pleasantness: "pleasant" },
};

export type Emotion = {
  id: string;
  name: string;
  emoji: string;
  quadrant: EmotionQuadrant;
  definition?: string;
};

// Favorites belong to a person's preferences, not the shared vocabulary.
export type MoodPreferences = { favoriteEmotionIds: string[] };

export type MoodCheckIn = {
  id: string;
  occurredAt: string; // ISO timestamp; can also describe a future backdated entry.
  emotionIds: string[];
  causeTagIds: string[];
};

export type PulseSignal = "energy" | "stress" | "overallDay";
export type DayPulseCheckIn = {
  id: string;
  date: string;
  updatedAt: string | null;
  energy: number | null;
  stress: number | null;
  overallDay: number | null;
};

export const mealSlots = ["breakfast", "lunch", "dinner", "snacks"] as const;
export type MealSlot = typeof mealSlots[number];
export const mealLabels: Record<MealSlot, string> = {
  breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks",
};

/** Optional occurrence values; absent is unknown, while an entered zero is known. */
export type MealNutrition = { calories?: number; protein?: number; carbs?: number; fat?: number };

export type DailyMealAssignment = {
  id: string;
  date: string;
  slot: MealSlot;
  title: string;
  recipeId: string | null; // Compatibility only; Nourish is not a recipe manager.
  savedMealId?: string;
  nutrition?: MealNutrition;
  note?: string;
  order?: number;
  createdAt?: string;
};
