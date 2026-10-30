# Muse refinement and Nourish — review report

This is an implementation snapshot following the earlier FOUNDATION_PASS and PLANNER_RITUALS_PASS reports. PRODUCT_RULES, DESIGN_SYSTEM and FEATURE_SPEC are the current source of truth; earlier four-day/header-placement descriptions have been superseded by the approved rolling-three-day and corrected celestial composition.

## Work preserved from before this continuation

The existing shell/navigation organization, six-theme registry, Daily Edit, canonical Planner provider/task model, first Planner rail and Rituals page, recurrence-aware history, shared popovers/drawers, MuseStar and completion feedback were retained. The working tree contained substantial uncommitted implementation; no reset, commit, push, dependency addition or Git configuration change was made.

## Refinements completed

- Movement overflow selection promotes into the fixed quick shelf, preferring an unselected least-recent option. Demotion never deselects another movement; a compact named summary retains visibility beyond capacity. Selected/unselected labels keep a stable centered layout.
- Crystal/Frosted is an independent functional material preference in the shared theme picker. All six themes supply the same optical token contract for cards, controls, popovers, drawers and planning surfaces. Frosted increases fill/diffusion without changing geometry.
- Shared atmosphere, sparse module-header celestial motifs and common motion timings extend the established system. Afterglow uses neutral near-black graphite with vivid mint/cyan/lilac/pink accents. Prism Noir's atmospheric palette is preserved.
- Planner uses a three-day rolling window, Today and one-day previous/next, compact Search and one Filters popover for groups/tags/status. Workspace/new-workspace remain in the source rail. Filtering scopes the relevant workspace task pool. Unscheduled/day creation and drag/Move/reorder retain the same canonical task model and completion semantics.
- Rituals distinguishes Complete, Partial, explicit Missed, past Unknown, Not Scheduled and Upcoming. Historical entry sheets can log quantity/duration, mark missed or clear back to missing. Group-gradient progress rings, editable banner presets and This week are implemented. Weekly sessions remain distinct from daily goal completion. Completion effects wait for real goal/threshold crossings and respect reduced motion.
- Corrected Daily Edit hero: greeting left, visible profile constellation in central negative space, three signature stars immediately left of Theme Picker, date/week controls below. Decoration hides before narrow layouts crowd; no extra decoration stack/hero height requirement.
- Sidebar organization/widths are preserved; a quiet top-edge collapse toggle replaces the bottom text row, with restrained expanded-only logo-region stars.
- Daily Edit Plan and Meals use informational Planner/Nourish badges and date-specific Manage links. Plan's redundant header count is removed; bounded overflow totals remain accurate. Movement keeps Manage only; Water Manage configures goal/four quick amounts while Edit changes today's total. No invented Mood/Day Pulse actions.

## Nourish Phase 1 completed

A real `/nourish` page now plans Monday–Sunday breakfast/lunch/dinner/snacks. Multiple entries per slot, quick free text, optional notes, saved/recent choices, lightweight saved-meal library and optional HTTP(S) reference links are functional. Move preserves assignment ID; Copy creates new IDs for one/multiple days, including weekdays. Desktop drag uses shared drop feedback; explicit sheets support keyboard/touch. Mobile shows the focused day's slots.

`NourishProvider` is mounted above routes. Daily Edit reads/edits the same dated assignment records, with a bounded preview. Saved meals and assignments are separate: assigned names/notes are snapshots, and removing a saved meal preserves existing plan text while detaching the reference. No recipe/nutrition engine or backend was introduced.

## Route correction

Removed obsolete `app/[module]/page.tsx`. All navigation destinations have fixed pages; `/planner`, `/rituals` and `/nourish` render their real modules, while six future destinations share `ModulePlaceholder`. No fixed route awaits URL params. This follows the installed Next 16.4.3 Cache Components routing model without suppressing prerender checks. An additional development-only undefined-component render cleared after recompiling the shared placeholder; the subsequent full live-route sweep succeeded without error markup.

## New files in this refinement/sprint

- `app/materials.css`, `app/atmosphere.css`; `lib/material-preference.ts`, `lib/motion.ts`.
- `components/PageCelestial.tsx`, `PageCelestial.css`; `MuseProgressRing.tsx`, `MuseProgressRing.css`; `useMuseDropTarget.ts`; `ModuleBadge.tsx`; `WaterManager.tsx`.
- `components/planner/PlannerFilters.tsx`.
- `app/nourish/page.tsx`; `components/NourishStore.tsx`; `lib/nourish.ts`, `lib/nourish-sample.ts`.
- `components/nourish/Nourish.tsx`, `Nourish.css`, `MealSlot.tsx`, `MealEditor.tsx`, `MealPlacementEditor.tsx`, `SavedMealLibrary.tsx`.
- Dedicated `app/{mood,insights,money,notes,appearance,settings}/page.tsx`.
- `tests/refinement.test.mjs`, `tests/nourish.test.mjs`; this report.

## Materially changed files

- `app/layout.tsx`, `app/globals.css`, `app/themes.css`, `app/interactions.css`; `lib/themes.ts`, `lib/models.ts`, `lib/daily-edit-data.ts`, `lib/selections.ts`, `lib/planner.ts`, `lib/rituals.ts`.
- Shared components: AppShell, MuseHeader, ProfileConstellation, MusePageHeader, ThemeSwitcher, MuseChoiceMenu, MuseSpark, MuseRitualFeedback, MuseIcon, CardHeading, DailyEdit, MealsCard, ScheduleCard, WaterCard and their relevant prefixed CSS.
- Planner: Planner/Planner.css, PlannerRail, PlannerOrganization, PlannerTaskCard, PlanningDropZone, useTaskPlacement.
- Rituals: Rituals/Rituals.css, RitualGroup, RitualGroupManager, RitualWeekCell, RitualEntryEditor, RitualStore.
- ModulePlaceholder shared presentation; existing daily-edit/ritual test files.
- `docs/PRODUCT_RULES.md`, `docs/DESIGN_SYSTEM.md`, `docs/FEATURE_SPEC.md`.

## Verification

- `npm run lint`: passed.
- `npm test`: 56 passed, 0 failed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed; all fixed navigation pages statically prerendered.
- Live `http://localhost:3000` route checks: `/`, `/planner`, `/rituals`, `/nourish`, `/mood`, `/insights`, `/money`, `/notes`, `/appearance`, `/settings` returned 200 with content, one theme trigger and no Next error template. An unknown module URL returned 404.
- Served HTML/CSS/client code includes the new shelf/material/three-day/state implementation. All six themes have matching token sets and numeric foreground/material contrast checks. These are structural checks, not visual approval.
- No in-app browser is connected. Desktop/mobile rendering, pointer gestures, keyboard/focus behavior, final color balance and perceived animation remain browser-review items. No visual verification is claimed.

## Local state and deferred work

Domain records, shelf recency, task timers, ritual history/groups and meals/library survive client navigation only and reset on refresh. Only theme and material preferences use localStorage. Supabase/auth/RLS, durable ordering/history, time-zone persistence rules and write-conflict handling are later work. Ritual schedule/measurement versions are required before editing historical configurations; current editors retain their protective locks. Full analytics, complete Appearance settings, meal recurrence/recipes/groceries/nutrition and horoscope APIs are not implemented.

Approved direction conflicts were resolved in favor of the latest request: three days replaces the earlier four-day board; stars LEFT of Theme Picker replaces the earlier under-theme placement. No other product conflict was found. Stop after Nourish for review.

## Browser review focus

Hard-refresh the existing localhost:3000 tab if it still holds a client from the interrupted compile. Inspect Movement More promotion, the theme menu's Glass material controls, Planner Filters/Today/arrows and source rail, Ritual partial/missed/clear states and rings, Daily Edit's center constellation/stars-theme row, and Nourish move/copy plus shared Daily Edit meal edits. Check each theme/material combination and a mobile viewport, especially dark planning material separation and touch/focus behavior.
