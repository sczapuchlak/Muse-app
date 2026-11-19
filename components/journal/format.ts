/** Date words for the Journal. Local dates are calendar days (YYYY-MM-DD), formatted without a time-zone shift. */
const at = (d: string) => new Date(`${d}T12:00:00Z`);
export const formatDay = (d: string) => at(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
/** The full day, with the year when it isn’t this year (an entry from an earlier year must say which). */
export const formatDayIn = (d: string, today: string) => (d.slice(0, 4) === today.slice(0, 4) ? formatDay(d) : at(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }));
/**
 * A short preview that never stops mid-word: whole sentences when they fit, otherwise whole words and "…".
 * Line breaks become spaces so the clamp shows real text, not blank lines.
 */
export function preview(text: string, max = 200): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1);
  const sentence = /^.*[.!?…]["”’)]?(?=\s)/.exec(cut)?.[0];
  if (sentence && sentence.length >= max * 0.45) return sentence;
  return `${cut.slice(0, max).replace(/\s+\S*$/, "").replace(/[\s,;:–—-]+$/, "")}…`;
}
export const formatShort = (d: string) => at(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
export const formatMonth = (d: string) => at(d).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
export const weekdayShort = (d: string) => at(d).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
export const dayNumber = (d: string) => at(d).getUTCDate();
export function greeting(hour: number) { return hour < 5 ? "Still up" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 22 ? "Good evening" : "Late tonight"; }
export function relativeDay(d: string, today: string) {
  const diff = Math.round((at(today).getTime() - at(d).getTime()) / 86400000);
  return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : diff < 7 ? at(d).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }) : formatShort(d);
}
