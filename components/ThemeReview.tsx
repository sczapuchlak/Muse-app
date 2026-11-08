"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { themeEntry } from "@/lib/themes";
import { readThemePreference, serverThemePreference, subscribeThemePreference } from "@/lib/theme-preference";
import { REVIEW_THEME_IDS, prepareScreen, readReview, reviewScreens, serverReview, startReview, subscribeReview } from "@/lib/theme-review";
import { MusePageHeader } from "./MusePageHeader";
import "./ThemeReviewBar.css";

/** Appearance → Theme review (#111). Experiments live here, never in the regular theme pickers. */
export function ThemeReview() {
  const review = useSyncExternalStore(subscribeReview, readReview, serverReview);
  const theme = useSyncExternalStore(subscribeThemePreference, readThemePreference, serverThemePreference);
  return <main className="muse-page muse-theme-review">
    <MusePageHeader title="Theme review" description="The renovated and new themes, on your real screens." />
    <p className="card-description">Choose a theme to start. A small bar stays at the bottom of every page so you can step through themes, switch Crystal and Frosted, and jump between screens. Done puts your earlier theme back; Keep this ends the review on the theme you’re looking at.</p>
    <ul className="muse-review-grid">{REVIEW_THEME_IDS.map((id) => { const t = themeEntry(id), lab = "direction" in t; return <li key={id} className="muse-review-card" data-active={review && theme === id || undefined}>
      <span className="muse-review-preview" style={{ background: t.preview }} aria-hidden="true" />
      <strong>{t.name}</strong>{lab && <small className="muse-review-lab">Lab · {t.direction}</small>}<small>{t.subtitle}</small>
      <button type="button" className="muse-button" onClick={() => startReview(id)} aria-pressed={!!review && theme === id}>{review && theme === id ? "Showing now" : "Review this theme"}</button>
    </li>; })}</ul>
    {review && <section aria-labelledby="review-screens"><h2 id="review-screens" className="editor-label">Jump to a screen</h2><div className="muse-review-links">{reviewScreens.map((s) => <Link key={s.id} className="muse-button button-ghost" href={s.href} onClick={() => prepareScreen("agendaView" in s ? s.agendaView : undefined)}>{s.label}</Link>)}</div></section>}
  </main>;
}
