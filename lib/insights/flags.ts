/**
 * Insights 2.0 (#97) is a presentation-layer simplification. The detailed Insights experience (Overview, Plans &
 * Rituals, Mood & Energy, Money, Wellness, Astrology and Collections tabs, with Customize, Inspect a date and period
 * comparison) is hidden, not deleted: `components/insights/Insights.tsx` and everything it uses are unchanged and
 * still tested.
 *
 * To restore it as the Insights page, set CLASSIC_INSIGHTS to true. Its old `?view=` links then work again.
 */
export const CLASSIC_INSIGHTS=false;
