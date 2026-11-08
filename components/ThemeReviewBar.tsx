"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { themeEntry } from "@/lib/themes";
import { readThemePreference, selectTheme, serverThemePreference, subscribeThemePreference } from "@/lib/theme-preference";
import { materials, readMaterial, selectMaterial, serverMaterial, subscribeMaterial } from "@/lib/material-preference";
import { endReview, keepReviewedTheme, prepareScreen, readReview, reviewScreens, serverReview, stepReview, subscribeReview } from "@/lib/theme-review";
import "./ThemeReviewBar.css";

/** Floats over real Muse screens while a theme review is running (#111). Nothing shows otherwise. */
export function ThemeReviewBar() {
  const review = useSyncExternalStore(subscribeReview, readReview, serverReview);
  const theme = useSyncExternalStore(subscribeThemePreference, readThemePreference, serverThemePreference);
  const material = useSyncExternalStore(subscribeMaterial, readMaterial, serverMaterial);
  if (!review) return null;
  const entry = themeEntry(theme), direction = "direction" in entry ? entry.direction : null;
  return <aside className="muse-review-bar" aria-label="Theme review">
    <div className="muse-review-theme">
      <button type="button" className="muse-review-step" aria-label="Previous theme" onClick={() => selectTheme(stepReview(theme, -1))}>‹</button>
      <span className="muse-review-swatch" style={{ background: entry.preview }} aria-hidden="true" />
      <span className="muse-review-name"><strong>{entry.name}</strong>{direction && <small>Lab · {direction}</small>}</span>
      <button type="button" className="muse-review-step" aria-label="Next theme" onClick={() => selectTheme(stepReview(theme, 1))}>›</button>
    </div>
    <div className="muse-review-materials" role="group" aria-label="Glass material">{materials.map((m) => <button key={m} type="button" aria-pressed={material === m} onClick={() => selectMaterial(m)}>{m === "crystal" ? "Crystal" : "Frosted"}</button>)}</div>
    <nav className="muse-review-screens" aria-label="Review screens">{reviewScreens.map((s) => <Link key={s.id} href={s.href} onClick={() => prepareScreen("agendaView" in s ? s.agendaView : undefined)}>{s.label}</Link>)}</nav>
    <div className="muse-review-end"><button type="button" onClick={keepReviewedTheme} title="End the review and keep this theme">Keep this</button><button type="button" onClick={endReview} title="End the review and go back to your earlier theme">Done</button></div>
  </aside>;
}
