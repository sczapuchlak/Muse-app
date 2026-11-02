# Whimsy header layout correction

Implemented locally; staging verification after deployment remains pending. No database changes.

## Cause

At `7f7b402`, `.muse-page.muse-whimsy-page` uses `display:grid` without an explicit column template. Weekly Side Quests renders `MuseCard` directly inside that grid when private records and preferences have loaded and the selected week has no draw. The shared dashboard card rule in `app/globals.css` assigns `grid-column:span 6`.

That span creates six implicit page columns. Grid auto-placement then puts the Muse heading, experience navigation, and experience heading alongside each other. An isolated Chrome reproduction using the actual shared React components and stylesheet rules measured all three starting at y=32 at a 1440px viewport. The same fixture with the first-draw card absent stacks correctly. The global mobile card rule below 760px also masks the defect by changing the span to `1/-1`.

The trigger is record state and available width, rather than an environment branch. Existing saved weeks can therefore make local development and local production appear correct while an empty staging week exposes the defect. This does not prove the private staging account's current record state; no private account or database was inspected.

## Build and styling comparison

- Local dependencies and the lockfile agree: Next.js 16.4.3, Tailwind CSS 4.3.3, and `@tailwindcss/turbopack` 4.3.3.
- Local development and production CSS both retain the original shared page grid rule without an explicit column. The defect reproduces using these ordinary CSS rules; no missing Tailwind responsive utility is needed.
- Public CSS retrieved from the staging deployment also contains `.muse-card{grid-column:span 6}`. The protected experience renders the login boundary without an authenticated session, so its private DOM and complete route stylesheet set were not compared directly.
- The repository uses `next build` with the Tailwind Turbopack CSS loader for both local and hosted builds. There is no checked-in Vercel build override or PostCSS config. Vercel dashboard overrides, Node version, and environment variables were not inspected. No configuration or dependency change is required for this reproduced defect.

## Correction and regression

The existing shared stylesheet declares `grid-template-columns:minmax(0,1fr)` and places every direct Whimsy page child at `grid-column:1/-1` with `min-width:0`. Both are necessary: a single explicit column alone still permits a card's six-column span to create implicit columns. Nested experience grids keep their existing layouts. All five existing experiences retain the shared header template, copy, actions, navigation, themes, and responsive behavior.

`npm run test:whimsy-layout` uses an isolated Chrome profile and shared React header/navigation/card components, with loading, error, empty, and populated content fixtures for all five experiences. It checks vertical stacking, full-width page sections, and overflow across nine themes and 1440px, 1000px, and 390px widths. Use `npm run test:whimsy-layout -- --production` after a build to repeat against emitted production CSS. Set `CHROME_BIN` when Chrome is not at the default macOS location or `chromium` on PATH. These fixtures exercise the layout without Supabase access; they do not replace signed-in staging verification.

After a staging-only deployment, verify Weekly Side Quests for a week with no draw and a saved week, then navigate through all five experiences at desktop and mobile widths. Opening pages should be sufficient; creating or changing saved records is not required for this layout check.

Verification completed locally: all 361 existing Node tests, ESLint, the Next.js production build (including TypeScript), and 540 browser layout cases each against source CSS and emitted production CSS passed. The first sandboxed build stalled at compilation without a diagnostic; after stopping that process, the same build succeeded with network access. No build configuration change was made.
