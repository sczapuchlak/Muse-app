import { dailyEditSample } from "./daily-edit-data";

export function shiftDate(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function dateLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
}

/** Monday-first dates, using UTC arithmetic so DST cannot shift a day. */
export function weekDates(selectedDate: string): string[] {
  const weekday = new Date(`${selectedDate}T12:00:00Z`).getUTCDay();
  const monday = shiftDate(selectedDate, -((weekday + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => shiftDate(monday, index));
}

export function todayInTimeZone(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function mockDay(iso: string) {
  if (iso === dailyEditSample.date.iso) return dailyEditSample;
  return {
    ...dailyEditSample,
    date: { iso, label: dateLabel(iso) },
    intention: "",
    priorities: [],
    movement: { date: iso, typeIds: [] },
    water: { ...dailyEditSample.water, date: iso, total: 0 },
    schedule: [],
    meals: dailyEditSample.meals.map((meal) => ({ ...meal, id: `meal-${iso}-${meal.slot}`, date: iso, title: "", recipeId: null })),
    mood: { id: `mood-${iso}`, occurredAt: `${iso}T12:00:00`, emotionIds: [], causeTagIds: [] },
  };
}

export function validDate(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

/** Configuration errors must be shown explicitly, never replaced with a mock/device zone. */
export function validTimeZone(value:string|null|undefined):value is string{if(!value?.trim())return false;try{new Intl.DateTimeFormat('en-US',{timeZone:value}).format(0);return true;}catch{return false;}}
